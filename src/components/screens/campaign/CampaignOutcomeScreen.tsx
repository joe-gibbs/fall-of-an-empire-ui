import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameButton from '../../common/buttons/GameButton';
import Portrait from '../../common/portraits/Portrait';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import {
  resolveCampaignOutcomeSummary,
  type CampaignOutcomeHistoryPoint,
  type CampaignOutcomeKind,
  type CampaignOutcomeRuler,
  type CampaignOutcomeSummary,
} from './CampaignOutcomeData';
import { WebkilnAssetPath } from '../../../utils/assets';
import { UI_MOTION } from '../../../config/motion';
import './CampaignOutcomeScreen.css';

import { webUIText } from '../../../localization/WebUITextContext';
interface CampaignOutcomeScreenProps {
  kind: CampaignOutcomeKind;
  summary: CampaignOutcomeSummary;
  onClose: () => void;
  onContinuePlaying?: () => void;
  onMainMenu?: () => void;
  onLoadSave?: () => void;
  onPurchaseFullGame?: () => void;
}

const MAX_HISTORY_TICKS = 5;

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function formatPopulation(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}m`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return formatNumber(value);
}

function formatDelta(value: number, formatter: (value: number) => string): string {
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatter(Math.abs(value))}`;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="outcome-stat">
      <span className="outcome-stat-value">{value}</span>
      <span className="outcome-stat-label">{label}</span>
    </div>
  );
}

function CampaignLedger({ history }: { history: CampaignOutcomeHistoryPoint[] }) {
  if (history.length === 0) return null;
  const first = history[0];
  const current = history[history.length - 1];
  const peakSettlements = history.reduce((best, point) => point.settlements > best.settlements ? point : best, first);
  const peakPopulation = history.reduce((best, point) => point.population > best.population ? point : best, first);
  const hasEarlierPeak = peakSettlements.settlements > current.settlements || peakPopulation.population > current.population;

  return (
    <table className="outcome-ledger">
      <caption>{webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.80.1')}</caption>
      <thead>
        <tr>
          <th scope="col" />
          <th scope="col">{webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.252.7')}</th>
          <th scope="col">{webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.253.8')}</th>
        </tr>
      </thead>
      <tbody>
        <tr className="outcome-ledger-current">
          <th scope="row">{webUIText('CampaignOutcome.Current')}</th>
          <td>{formatNumber(current.settlements)}</td>
          <td>{formatPopulation(current.population)}</td>
        </tr>
        {hasEarlierPeak && (
          <tr>
            <th scope="row">{webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.85.2')}</th>
            <td>{formatNumber(peakSettlements.settlements)}<small>{peakSettlements.label}</small></td>
            <td>{formatPopulation(peakPopulation.population)}<small>{peakPopulation.label}</small></td>
          </tr>
        )}
        {history.length > 1 && (
          <tr className="outcome-ledger-change">
            <th scope="row">{webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.90.3', { Value1: first.label })}</th>
            <td>{formatDelta(current.settlements - first.settlements, formatNumber)}</td>
            <td>{formatDelta(current.population - first.population, formatPopulation)}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function RulerPanel({ ruler, current }: { ruler: CampaignOutcomeRuler; current?: boolean }) {
  return (
    <div className={current ? 'outcome-ruler outcome-ruler--current' : 'outcome-ruler'}>
      <Portrait
        personId={ruler.id}
        src={ruler.portrait}
        layers={ruler.portraitLayers}
        isImprisoned={ruler.isImprisoned}
        name={ruler.name}
        size={current ? 'lg' : 'md'}
        shape="rect"
        showBorder
        borderTier={current ? 'gold' : 'bronze'}
      />
      <div className="outcome-ruler-copy">
        <div className="outcome-ruler-name">{ruler.name}</div>
        <div className="outcome-ruler-title">{ruler.title}</div>
        <div className="outcome-ruler-reign">{ruler.reign}</div>
        {ruler.fate && <div className="outcome-ruler-fate">{ruler.fate}</div>}
      </div>
    </div>
  );
}

function HistoryChart({
  title,
  points,
  metric,
}: {
  title: string;
  points: CampaignOutcomeHistoryPoint[];
  metric: 'settlements' | 'population';
}) {
  const maxValue = Math.max(...points.map(point => point[metric]), 1);
  const tickCount = Math.min(points.length, MAX_HISTORY_TICKS);
  const tickPoints = tickCount <= 1
    ? points.slice(0, 1)
    : Array.from({ length: tickCount }, (_, index) => {
        const pointIndex = Math.round(index * (points.length - 1) / (tickCount - 1));
        return points[pointIndex];
      });

  return (
    <div className="outcome-chart">
      <div className="outcome-chart-head">
        <span>{title}</span>
      </div>
      <div className="outcome-chart-plot">
        <div className="outcome-chart-series">
          {points.map((point, index) => {
            const height = (point[metric] / maxValue) * 100;
            return (
              <div className="outcome-chart-col" key={`${title}:${point.label}:${index}`}>
                <div
                  className="outcome-chart-bar"
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="outcome-chart-axis" aria-hidden="true">
          {tickPoints.map((point, index) => {
            const position = tickCount <= 1 ? 0 : index * 100 / (tickCount - 1);
            const edgeClass = index === 0
              ? ' outcome-chart-label--first'
              : index === tickCount - 1
                ? ' outcome-chart-label--last'
                : '';
            return (
              <span
                className={`outcome-chart-label${edgeClass}`}
                key={`${title}:tick:${point.label}:${index}`}
                style={{ left: `${position}%` }}
              >
                {point.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CampaignOutcomeScreen({
  kind,
  summary,
  onClose,
  onContinuePlaying,
  onMainMenu,
  onLoadSave,
  onPurchaseFullGame,
}: CampaignOutcomeScreenProps) {
  const resolved = useMemo(() => resolveCampaignOutcomeSummary(kind, summary), [kind, summary]);
  const displayedPreviousRulers = useMemo(() => [...resolved.previousRulers].reverse(), [resolved.previousRulers]);
  const headerImage = WebkilnAssetPath(resolved.headerImage) ?? resolved.headerImage;
  const crestIcon = WebkilnAssetPath(resolved.crestIcon) ?? resolved.crestIcon;
  // A close request belongs to the outcome it was made on; a new outcome starts open.
  const [closeRequest, setCloseRequest] = useState<{ kind: CampaignOutcomeKind; afterClose?: () => void } | null>(null);
  const activeCloseRequest = closeRequest?.kind === kind ? closeRequest : null;
  const closing = activeCloseRequest !== null;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!activeCloseRequest) return undefined;
    const timer = window.setTimeout(() => {
      onCloseRef.current();
      activeCloseRequest.afterClose?.();
    }, UI_MOTION.campaignOutcomeCloseMs);
    return () => window.clearTimeout(timer);
  }, [activeCloseRequest]);

  const handlePrimaryAction = useCallback(() => {
    if (closing) return;
    if (kind === 'victory') {
      setCloseRequest({ kind, afterClose: onContinuePlaying });
      return;
    }

    onLoadSave?.();
  }, [closing, kind, onContinuePlaying, onLoadSave]);

  const handleSecondaryAction = useCallback(() => {
    if (closing) return;
    onMainMenu?.();
  }, [closing, onMainMenu]);

  useEscapeStackEntry({
    id: `screen.campaign-outcome.${kind}`,
    active: true,
    onClose: () => {},
  });

  return (
    <div className={`modal-overlay outcome-screen outcome-screen--${kind}${closing ? ' is-closing' : ''}`}>
      <ScreenShell
        className="outcome-shell"
        contentClassName="outcome-content"
        title={resolved.title}
        onClose={handlePrimaryAction}
        titleExtra={<>
          <div className="outcome-header-bg" style={{ backgroundImage: `url(${headerImage})` }} />
          <img className="outcome-seal" src={crestIcon} alt="" draggable={false} />
        </>}
      >
        <StyledScrollArea className="outcome-scroll" viewportClassName="outcome-scroll-viewport">
          <div className="outcome-body">
            <section className="outcome-record">
              <div className="outcome-faction">{resolved.factionName}</div>
              {kind === 'defeat' && resolved.subtitle && <p className="outcome-subtitle">{resolved.subtitle}</p>}
              <p className="outcome-description">{resolved.description}</p>
              {kind === 'victory' && resolved.tierConditions.length > 0 && (
                <div className="outcome-tier-conditions">
                  {resolved.tierConditions.map((condition, index) => (
                    <div className="outcome-tier-condition" key={`${condition.label}:${index}`}>
                      {condition.label !== resolved.title && <span className="outcome-tier-condition-label">{condition.label}</span>}
                      {condition.detail && <span className="outcome-tier-condition-detail">{condition.detail}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="outcome-stats">
                <StatBlock label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.217.4')} value={resolved.totalTimeRuled} />
                <StatBlock label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.218.5')} value={formatNumber(resolved.totalBattlesWon)} />
                <StatBlock label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.219.6')} value={formatNumber(resolved.totalBattlesLost)} />
              </div>
              <CampaignLedger history={resolved.history} />
              {resolved.milestones.length > 0 && (
                <div className="outcome-milestones">
                  {resolved.milestones.map((milestone, index) => (
                    <div className={`outcome-milestone outcome-milestone--${milestone.tone ?? 'neutral'}`} key={`${milestone.label}:${index}`}>
                      <span>{milestone.label}</span>
                      <p>{milestone.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="outcome-lineage">
              <h2 className="outcome-section-title">{webUIText('Auto.ComponentsScreensCampaignOutcomeScreen.238.4')}</h2>
              <RulerPanel ruler={resolved.currentRuler} current />
              {displayedPreviousRulers.map((ruler, index) => (
                <RulerPanel ruler={ruler} key={`${ruler.id ?? ruler.name}:${index}`} />
              ))}
            </section>
            {resolved.history.length > 1 && (
              <section className="outcome-history">
                <h2 className="outcome-section-title">{webUIText('Auto.ComponentsScreensCampaignOutcomeScreen.250.5')}</h2>
                <div className="outcome-charts">
                  <HistoryChart title={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.252.7')} points={resolved.history} metric="settlements" />
                  <HistoryChart title={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.253.8')} points={resolved.history} metric="population" />
                </div>
              </section>
            )}
          </div>
        </StyledScrollArea>
        <div className="outcome-actions">
          {onPurchaseFullGame && <GameButton variant="burgundy" onClick={onPurchaseFullGame}>{webUIText('Demo.BuyFullGame')}</GameButton>}
          <GameButton variant={onPurchaseFullGame ? 'outline' : 'burgundy'} onClick={handlePrimaryAction}>{resolved.primaryAction}</GameButton>
          <GameButton variant="outline" onClick={handleSecondaryAction}>{resolved.secondaryAction}</GameButton>
        </div>
      </ScreenShell>
    </div>
  );
}

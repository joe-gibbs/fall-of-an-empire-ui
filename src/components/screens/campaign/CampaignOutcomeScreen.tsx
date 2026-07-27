import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameButton from '../../common/buttons/GameButton';
import Portrait from '../../common/portraits/Portrait';
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

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
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

function formatSettlementDelta(value: number): string {
  if (value === 0) return webUIText('CampaignOutcome.NoSettlementChange');
  return `${value > 0 ? '+' : '-'}${formatNumber(Math.abs(value))}`;
}

function formatPopulationDelta(value: number): string {
  if (value === 0) return webUIText('CampaignOutcome.NoPopulationChange');
  return `${value > 0 ? '+' : '-'}${formatPopulation(Math.abs(value))}`;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="outcome-stat">
      <span className="outcome-stat-value">{value}</span>
      <span className="outcome-stat-label">{label}</span>
    </div>
  );
}

function LedgerRow({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'gain' | 'loss';
}) {
  return (
    <div className={`outcome-ledger-row${tone ? ` outcome-ledger-row--${tone}` : ''}`}>
      <span className="outcome-ledger-label">{label}</span>
      <span className="outcome-ledger-value">{value}</span>
      <span className="outcome-ledger-detail">{detail}</span>
    </div>
  );
}

function CampaignLedger({ history }: { history: CampaignOutcomeHistoryPoint[] }) {
  const first = history[0];
  const final = history[history.length - 1] ?? first;
  const peakSettlements = history.reduce((best, point) => (point.settlements > best.settlements ? point : best), first);
  const peakPopulation = history.reduce((best, point) => (point.population > best.population ? point : best), first);
  const settlementDelta = final.settlements - first.settlements;
  const populationDelta = final.population - first.population;
  const deltaTone = settlementDelta < 0 || populationDelta < 0 ? 'loss' : settlementDelta > 0 || populationDelta > 0 ? 'gain' : undefined;

  return (
    <div className="outcome-ledger">
      <div className="outcome-section-title"><WebUIText textKey="Auto.ComponentsScreensCampaignOutcomeScreen.77.1" /></div>
      <LedgerRow
        label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.80.1')}
        value={webUIText("Auto.Fix.Expr.componentsscreensCampaignOutcomeScreen.81.1", { Value1: formatNumber(final.settlements) })}
        detail={webUIText("Auto.Attr.componentsscreensCampaignOutcomeScreen.82.1", { Value1: formatPopulation(final.population), Value2: final.label })}
      />
      <LedgerRow
        label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.85.2')}
        value={webUIText("Auto.Fix.Expr.componentsscreensCampaignOutcomeScreen.86.1", { Value1: formatNumber(peakSettlements.settlements) })}
        detail={webUIText("Auto.Attr.componentsscreensCampaignOutcomeScreen.87.1", { Value1: formatPopulation(peakPopulation.population), Value2: peakPopulation.label })}
      />
      <LedgerRow
        label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.90.3')}
        value={formatSettlementDelta(settlementDelta)}
        detail={formatPopulationDelta(populationDelta)}
        tone={deltaTone}
      />
    </div>
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
        size={current ? 'xl' : 'lg'}
        shape="rect"
        showBorder
        borderTier={current ? 'gold' : 'bronze'}
      />
      <div className="outcome-ruler-copy">
        <div className="outcome-ruler-name">{ruler.name}</div>
        <div className="outcome-ruler-title">{ruler.title}</div>
        <div className="outcome-ruler-reign">{ruler.reign}</div>
        <div className="outcome-ruler-record">
          <span>{formatNumber(ruler.battlesWon)} <WebUIText textKey="Auto.ComponentsScreensCampaignOutcomeScreen.117.2" /></span>
          <span>{formatNumber(ruler.battlesLost)} <WebUIText textKey="Auto.ComponentsScreensCampaignOutcomeScreen.118.3" /></span>
        </div>
        {ruler.fate && <div className="outcome-ruler-fate">{ruler.fate}</div>}
      </div>
    </div>
  );
}

function HistoryChart({
  title,
  points,
  metric,
  formatter,
}: {
  title: string;
  points: CampaignOutcomeHistoryPoint[];
  metric: 'settlements' | 'population';
  formatter: (value: number) => string;
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
        <span>{formatter(points[points.length - 1]?.[metric] ?? 0)}</span>
      </div>
      <div className="outcome-chart-plot">
        <div className="outcome-chart-series">
          {points.map((point, index) => {
            const height = Math.max(8, (point[metric] / maxValue) * 100);
            const animationOffset = points.length <= 1 ? 0 : index * 900 / (points.length - 1);
            return (
              <div className="outcome-chart-col" key={`${title}:${point.label}:${index}`}>
                <div
                  className="outcome-chart-bar"
                  style={{ height: `${height}%`, animationDelay: `${6540 + animationOffset}ms` }}
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
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  const requestClose = useCallback((afterClose?: () => void) => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
      afterClose?.();
    }, UI_MOTION.campaignOutcomeCloseMs);
  }, [closing, onClose]);

  const handlePrimaryAction = useCallback(() => {
    if (kind === 'victory') {
      requestClose(onContinuePlaying);
      return;
    }

    onLoadSave?.();
  }, [kind, onContinuePlaying, onLoadSave, requestClose]);

  const handleSecondaryAction = useCallback(() => {
    onMainMenu?.();
  }, [onMainMenu]);

  useEscapeStackEntry({
    id: `screen.campaign-outcome.${kind}`,
    active: true,
    onClose: () => {},
  });

  return (
    <div className={`modal-overlay outcome-screen outcome-screen--${kind}${closing ? ' is-closing' : ''}`}>
      {resolved.kicker && (
        <div className="outcome-impact" aria-hidden="true">
          <div className="outcome-impact-rule outcome-impact-rule--top" />
          <div className="outcome-impact-word">{resolved.kicker}</div>
          <div className="outcome-impact-rule outcome-impact-rule--bottom" />
        </div>
      )}
      <div className="outcome-shell">
        <div className="outcome-hero">
          <div className="outcome-header-bg" style={{ backgroundImage: `url(${headerImage})` }} />
          <div className="outcome-header-scrim" />
          <div className="outcome-seal">
            <img src={crestIcon} alt="" draggable={false} />
          </div>
          <div className="outcome-heading">
            <h1>{resolved.title}</h1>
            {resolved.subtitle && <div className="outcome-subtitle">{resolved.subtitle}</div>}
          </div>
          <div className="outcome-date">
            <span>{resolved.factionName}</span>
            <span>{resolved.endDate}</span>
          </div>
        </div>

        <div className="outcome-body">
          <section className="outcome-record">
            <p className="outcome-description">{resolved.description}</p>
            <div className="outcome-stats">
              <StatBlock label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.217.4')} value={resolved.totalTimeRuled} />
              <StatBlock label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.218.5')} value={formatNumber(resolved.totalBattlesWon)} />
              <StatBlock label={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.219.6')} value={formatNumber(resolved.totalBattlesLost)} />
            </div>
            <CampaignLedger history={resolved.history} />
            {resolved.milestones.length > 0 && (
              <div className="outcome-milestones">
                {resolved.milestones.map((milestone, index) => (
                  <div
                    className={`outcome-milestone outcome-milestone--${milestone.tone ?? 'neutral'}`}
                    key={`${milestone.label}:${index}`}
                    style={{ animationDelay: `${4660 + index * 70}ms` }}
                  >
                    <span>{milestone.label}</span>
                    <p>{milestone.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="outcome-lineage">
            <div className="outcome-section-title"><WebUIText textKey="Auto.ComponentsScreensCampaignOutcomeScreen.238.4" /></div>
            <RulerPanel ruler={resolved.currentRuler} current />
            <StyledScrollArea className="outcome-previous-rulers" viewportClassName="outcome-previous-rulers__viewport">
              {displayedPreviousRulers.map((ruler, index) => (
                <div className="outcome-previous-ruler" key={`${ruler.name}:${index}`} style={{ animationDelay: `${5520 + index * 80}ms` }}>
                  <RulerPanel ruler={ruler} />
                </div>
              ))}
            </StyledScrollArea>
          </section>

          <section className="outcome-history">
            <div className="outcome-section-title"><WebUIText textKey="Auto.ComponentsScreensCampaignOutcomeScreen.250.5" /></div>
            <HistoryChart title={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.252.7')} points={resolved.history} metric="settlements" formatter={formatNumber} />
            <HistoryChart title={webUIText('Auto.Attr.ComponentsScreensCampaignOutcomeScreen.253.8')} points={resolved.history} metric="population" formatter={formatPopulation} />
          </section>
        </div>

        <div className="outcome-actions">
          {onPurchaseFullGame && (
            <GameButton variant="burgundy" onClick={onPurchaseFullGame}>
              {webUIText('Demo.BuyFullGame')}
            </GameButton>
          )}
          <GameButton variant={onPurchaseFullGame ? 'outline' : 'burgundy'} onClick={handlePrimaryAction}>
            {resolved.primaryAction}
          </GameButton>
          <GameButton variant="outline" onClick={handleSecondaryAction}>
            {resolved.secondaryAction}
          </GameButton>
        </div>
      </div>
    </div>
  );
}

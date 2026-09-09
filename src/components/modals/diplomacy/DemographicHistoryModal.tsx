import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { bridgeCall, type FactionDemographicHistoryYear, type GetFactionDemographicHistoryResponse } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import CloseButton from '../../common/buttons/CloseButton';
import { cultureIconPath } from '../../../utils/cultureIcons';
import { religionIconPath } from '../../../utils/religionIcons';
import './DemographicHistoryModal.css';

type MakeupKind = 'culture' | 'religion';

interface Series {
  id: string;
  name: string;
  colour: string;
  iconId: string;
  values: number[];
}

const MAX_SERIES = 8;

interface Props {
  open: boolean;
  factionId: string;
  factionName: string;
  kind: MakeupKind;
  onClose: () => void;
}

function shareList(year: FactionDemographicHistoryYear, kind: MakeupKind) {
  return kind === 'culture' ? year.cultures : year.religions;
}

function yearPercent(year: FactionDemographicHistoryYear, kind: MakeupKind, id: string): number {
  const total = year.population > 0 ? year.population : shareList(year, kind).reduce((sum, share) => sum + share.population, 0);
  if (total <= 0) return 0;
  const share = shareList(year, kind).find(entry => entry.id === id);
  return ((share?.population ?? 0) / total) * 100;
}

function buildSeries(years: FactionDemographicHistoryYear[], kind: MakeupKind): Series[] {
  const latest = years[years.length - 1];
  if (!latest) return [];
  const ranked = [...shareList(latest, kind)].sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));
  const leading = ranked.slice(0, MAX_SERIES);
  const overflow = ranked.slice(MAX_SERIES);
  const series: Series[] = leading.map(share => ({
    id: share.id,
    name: share.name,
    colour: share.colour,
    iconId: share.iconId || share.id,
    values: years.map(year => yearPercent(year, kind, share.id)),
  }));
  if (overflow.length > 0) {
    const overflowIds = new Set(overflow.map(share => share.id));
    series.push({
      id: 'others',
      name: webUIText('DiplomacySidebar.DemographicHistoryOthers'),
      colour: '#6d6458',
      iconId: '',
      values: years.map(year => {
        const total = year.population > 0 ? year.population : shareList(year, kind).reduce((sum, share) => sum + share.population, 0);
        if (total <= 0) return 0;
        const people = shareList(year, kind).reduce((sum, share) => overflowIds.has(share.id) ? sum + share.population : sum, 0);
        return (people / total) * 100;
      }),
    });
  }
  return series;
}

function MakeupHistoryChart({ years, series }: { years: FactionDemographicHistoryYear[]; series: Series[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pointCount = years.length;
  const xForIndex = (index: number) => pointCount <= 1 ? 50 : index / (pointCount - 1) * 100;
  const yForValue = (value: number) => 8 + (100 - Math.max(0, Math.min(100, value))) / 100 * 78;
  const pointsFor = (values: number[]) => {
    if (values.length === 1) {
      const y = yForValue(values[0]).toFixed(2);
      return `0,${y} 100,${y}`;
    }
    return values.map((value, index) => `${xForIndex(index).toFixed(2)},${yForValue(value).toFixed(2)}`).join(' ');
  };

  const updateHoveredPoint = (clientX: number, bounds: DOMRect) => {
    if (pointCount === 0 || bounds.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    setHoveredIndex(Math.round(ratio * Math.max(0, pointCount - 1)));
  };

  const hoverX = hoveredIndex === null ? 0 : xForIndex(hoveredIndex);
  const tickCount = Math.min(years.length, 6);
  const tickYears = tickCount <= 1
    ? years.slice(0, 1)
    : Array.from({ length: tickCount }, (_, index) => years[Math.round(index * (years.length - 1) / (tickCount - 1))]);

  return (
    <div className="demo-history-chart">
      <div className="demo-history-plot">
        <svg className="demo-history-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line className="demo-history-grid" x1="0" y1="8" x2="100" y2="8" />
          <line className="demo-history-grid" x1="0" y1="47" x2="100" y2="47" />
          <line className="demo-history-grid" x1="0" y1="86" x2="100" y2="86" />
          {series.map(item => (
            <polyline
              key={item.id}
              className="demo-history-line"
              points={pointsFor(item.values)}
              stroke={item.colour}
            />
          ))}
          {hoveredIndex !== null && (
            <line className="demo-history-hover-line" x1={hoverX} y1="8" x2={hoverX} y2="86" />
          )}
        </svg>
        <div
          className="demo-history-hit"
          onMouseMove={event => updateHoveredPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setHoveredIndex(null)}
        />
        {hoveredIndex !== null && (
          <div className={`demo-history-card${hoverX > 50 ? ' demo-history-card--left' : ''}`} style={{ left: `${hoverX}%` }}>
            <strong>{formatNumber(years[hoveredIndex].year)}</strong>
            {series.map(item => (
              <span key={item.id}>
                <i style={{ backgroundColor: item.colour }} />
                <em>{item.name}</em>
                <b>{formatPercent(item.values[hoveredIndex], 1)}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="demo-history-axis" aria-hidden="true">
        {tickYears.map((year, index) => {
          const position = tickCount <= 1 ? 0 : index * 100 / (tickCount - 1);
          return (
            <span
              key={`${year.year}:${index}`}
              className={`demo-history-tick${index === 0 ? ' demo-history-tick--first' : index === tickCount - 1 ? ' demo-history-tick--last' : ''}`}
              style={{ left: `${position}%` }}
            >
              {formatNumber(year.year)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function DemographicHistoryModal({ open, factionId, factionName, kind, onClose }: Props) {
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.demographic-history',
    closeStrategy: 'request',
  });
  const [history, setHistory] = useState<GetFactionDemographicHistoryResponse | null>(null);
  const title = kind === 'culture'
    ? webUIText('DiplomacySidebar.CultureMakeup')
    : webUIText('DiplomacySidebar.ReligionMakeup');

  useEffect(() => {
    if (!open || !factionId) return undefined;
    let cancelled = false;
    bridgeCall('game.get_faction_demographic_history', { factionId })
      .then(response => {
        if (!cancelled) setHistory(response);
      })
      .catch(acknowledgeBridgeFailure);
    return () => {
      cancelled = true;
    };
  }, [factionId, open]);

  const matchingHistory = history && history.factionId === factionId ? history : null;
  const years = useMemo(() => matchingHistory?.years ?? [], [matchingHistory]);
  const series = useMemo(() => buildSeries(years, kind), [kind, years]);

  if (!mounted) return null;

  return createPortal(
    <div className={`demo-history-overlay${closing ? ' demo-history-overlay--closing' : ''}`} onClick={close}>
      <article
        className={`modal demo-history-modal${closing ? ' demo-history-modal--closing' : ''}`}
        aria-modal="true"
        role="dialog"
        aria-label={title}
        onClick={stopPropagation}
      >
        <header className="demo-history-header">
          <div>
            <h1>{title}</h1>
            <span>{factionName}</span>
          </div>
          <CloseButton onClick={close} />
        </header>
        <div className="demo-history-body">
          {matchingHistory && years.length === 0 && (
            <div className="demo-history-empty"><WebUIText textKey="DiplomacySidebar.NoDemographicHistory" /></div>
          )}
          {years.length > 0 && (
            <>
              <MakeupHistoryChart years={years} series={series} />
              <div className="demo-history-legend">
                {series.map(item => (
                  <div key={item.id} className="demo-history-legend-item">
                    {item.iconId ? (
                      <img
                        src={kind === 'culture' ? cultureIconPath(item.iconId) : religionIconPath(item.id)}
                        alt=""
                        className="demo-history-legend-icon"
                      />
                    ) : (
                      <span className="demo-history-legend-dot" style={{ backgroundColor: item.colour }} />
                    )}
                    <span>{item.name}</span>
                    <strong>{formatPercent(item.values[item.values.length - 1], 1)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </article>
    </div>,
    document.body,
  );
}

import { useEffect, useState, type MouseEvent } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import {
  rushBureaucraticAction,
  useBureaucraticThroughputBridge,
  type BureaucraticThroughputSource,
} from '../../bridge/settlements-economy/useBureaucraticThroughputBridge';
import { formatNumber, formatSignedNumber } from '../../utils/numberFormat';
import { webUIText } from '../../localization/WebUITextContext';
import './BureaucraticThroughput.css';

type Tone = 'good' | 'bad' | 'neutral';
type InlineKind = 'load' | 'capacity';
type RushActionKind = 'policy' | 'edict' | 'interaction' | 'spy' | 'person' | 'settlement' | 'bloc';

interface ThroughputModel {
  capacity: number;
  currentLoad: number;
  overload: number;
  overloadPenaltyPercent: number;
  policyChanges: number;
  activeEdicts: number;
  activeInteractions: number;
  directAdministration: number;
  provincePressure: number;
  rushPressure: number;
  sources: BureaucraticThroughputSource[];
}

const EMPTY_MODEL: ThroughputModel = {
  capacity: 0,
  currentLoad: 0,
  overload: 0,
  overloadPenaltyPercent: 0,
  policyChanges: 0,
  activeEdicts: 0,
  activeInteractions: 0,
  directAdministration: 0,
  provincePressure: 0,
  rushPressure: 0,
  sources: [],
};

const RUNNING_ACTION_CATEGORIES = new Set(['interaction', 'spy', 'person', 'settlement', 'bloc']);
const DIRECT_ADMINISTRATION_SOURCE_IDS = new Set(['load:direct-settlements', 'load:governed-regions']);

const rushedActionIds = new Set<string>();
const rushStoreListeners = new Set<() => void>();

function notifyRushStoreChanged() {
  rushStoreListeners.forEach(listener => listener());
}

function useRushStoreVersion() {
  const [, setRevision] = useState(0);
  useEffect(() => {
    const listener = () => setRevision(value => value + 1);
    rushStoreListeners.add(listener);
    return () => {
      rushStoreListeners.delete(listener);
    };
  }, []);
}

function markActionRushed(actionId: string) {
  rushedActionIds.add(actionId);
  notifyRushStoreChanged();
}

function dayWord(days: number): string {
  return webUIText(days === 1 ? 'Common.Day' : 'Common.Days');
}

function inlineTone(value: number, kind: InlineKind): Tone {
  if (value === 0) return 'neutral';
  if (kind === 'capacity') return value > 0 ? 'good' : 'bad';
  return value > 0 ? 'bad' : 'good';
}

function inlineText(value: number, kind: InlineKind): string {
  if (kind === 'capacity') {
    return webUIText('BureaucracyMock.Inline.CapacityValue', { Value: formatSignedNumber(value) });
  }
  if (value === 0) {
    return webUIText('BureaucracyMock.Inline.NoLoad');
  }
  return webUIText('BureaucracyMock.Inline.LoadValue', { Load: formatSignedNumber(value) });
}

function parseActionId(actionId: string): { actionKind: RushActionKind; actionId: string } {
  const separator = actionId.indexOf(':');
  if (separator <= 0) return { actionKind: 'interaction', actionId };

  const kind = actionId.slice(0, separator);
  const id = actionId.slice(separator + 1);
  if (kind === 'policy' || kind === 'edict' || kind === 'interaction' || kind === 'spy' || kind === 'person' || kind === 'settlement' || kind === 'bloc') {
    return { actionKind: kind, actionId: id };
  }
  return { actionKind: 'interaction', actionId };
}

function sourceValue(source: BureaucraticThroughputSource): string {
  return source.kind === 'capacity'
    ? formatSignedNumber(source.value)
    : `+${formatNumber(source.value)}`;
}

function sourceValueColor(source: BureaucraticThroughputSource): string {
  if (source.kind === 'capacity') {
    return source.value >= 0 ? 'var(--green)' : 'var(--red)';
  }
  return 'var(--orange)';
}

function loadValue(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function loadValueColor(value: number): string {
  return value > 0 ? 'var(--orange)' : 'var(--text-muted)';
}

function overloadPenaltyText(model: ThroughputModel): string {
  return `${formatSignedNumber(-model.overloadPenaltyPercent)}%`;
}

function projectedOverloadPenaltyPercent(currentLoad: number, capacity: number, addedLoad: number): number {
  const overload = Math.max(0, currentLoad + addedLoad - capacity);
  if (overload <= 0) return 0;
  if (capacity <= 0) return 65;
  return Math.min(65, Math.ceil((overload / capacity) * 35));
}

function overloadEffectLines(model: ThroughputModel): TooltipLine[] {
  const penalty = model.overloadPenaltyPercent;
  if (penalty <= 0) return [];

  const value = overloadPenaltyText(model);
  const lines: TooltipLine[] = [
    {
      label: webUIText('BureaucracyMock.Effect.TaxIncomeMultiplier'),
      value,
      valueColor: 'var(--red)',
    },
    {
      label: webUIText('BureaucracyMock.Effect.ResourceThroughputMultiplier'),
      value,
      valueColor: 'var(--red)',
    },
  ];

  const overloaded = model.capacity > 0 && model.currentLoad / model.capacity >= 1.1;
  if (overloaded) {
    lines.push(
      {
        label: webUIText('BureaucracyMock.Effect.ArmyEffectiveness'),
        value,
        valueColor: 'var(--red)',
      },
      {
        label: webUIText('BureaucracyMock.Effect.NavyEffectiveness'),
        value,
        valueColor: 'var(--red)',
      },
    );
  }

  return lines;
}

function sourceTotal(
  sources: BureaucraticThroughputSource[],
  predicate: (source: BureaucraticThroughputSource) => boolean,
): number {
  return sources
    .filter(predicate)
    .reduce((sum, source) => sum + source.value, 0);
}

function sourceExplanationKey(source: BureaucraticThroughputSource): string {
  if (source.id === 'load:direct-settlements') return 'BureaucracyMock.Explain.Source.DirectSettlements';
  if (source.id === 'load:governed-regions') return 'BureaucracyMock.Explain.Source.GovernedRegions';
  if (source.id === 'load:provinces') return 'BureaucracyMock.Explain.Source.Provinces';
  if (source.id === 'load:governor-corruption') return 'BureaucracyMock.Explain.Source.GovernorCorruption';
  if (source.id === 'capacity:baseline') return 'BureaucracyMock.Explain.Source.Baseline';
  if (source.id === 'capacity:ruler') return 'BureaucracyMock.Explain.Source.Ruler';
  if (source.id === 'capacity:policy-framework') return 'BureaucracyMock.Explain.Source.PolicyFramework';
  if (source.id === 'capacity:regional-governors') return 'BureaucracyMock.Explain.Source.RegionalGovernors';
  if (source.id === 'capacity:fiscal-health') return 'BureaucracyMock.Explain.Source.FiscalHealth';
  if (source.id === 'capacity:minimal-state') return 'BureaucracyMock.Explain.Source.MinimalState';
  if (source.id.indexOf('capacity:court:') === 0) return 'BureaucracyMock.Explain.Source.Court';
  if (source.category === 'policy') return 'BureaucracyMock.Explain.Source.PolicyAction';
  if (source.category === 'edict') return 'BureaucracyMock.Explain.Source.Edict';
  if (source.category === 'spy') return 'BureaucracyMock.Explain.Source.Spy';
  if (source.category === 'person') return 'BureaucracyMock.Explain.Source.Person';
  if (source.category === 'settlement') return 'BureaucracyMock.Explain.Source.Settlement';
  if (source.category === 'bloc') return 'BureaucracyMock.Explain.Source.Bloc';
  if (source.category === 'rush') return 'BureaucracyMock.Explain.Source.Rush';
  if (source.category === 'interaction') return 'BureaucracyMock.Explain.Source.Interaction';
  return source.kind === 'capacity' ? 'BureaucracyMock.Explain.Source.Capacity' : 'BureaucracyMock.Explain.Source.Load';
}

function sourceSubTooltip(source: BureaucraticThroughputSource): TooltipContent {
  const lines: TooltipLine[] = [
    {
      label: webUIText('BureaucracyMock.Explain.Type'),
      value: webUIText(source.kind === 'capacity' ? 'BureaucracyMock.Explain.TypeCapacity' : 'BureaucracyMock.Explain.TypeLoad'),
      valueColor: source.kind === 'capacity' ? 'var(--green)' : 'var(--orange)',
    },
    {
      label: webUIText('BureaucracyMock.Explain.Value'),
      value: sourceValue(source),
      valueColor: sourceValueColor(source),
    },
  ];

  if (source.expiresInDays > 0) {
    lines.push({
      label: webUIText('BureaucracyMock.Explain.Remaining'),
      value: webUIText('BureaucracyMock.Explain.DaysRemaining', {
        Days: formatNumber(source.expiresInDays),
        DayWord: dayWord(source.expiresInDays),
      }),
    });
  }

  if (source.details.length > 0) {
    lines.push(
      headerLine('BureaucracyMock.Explain.CountedItems'),
      ...source.details.map(detail => ({
        label: detail.label,
        labelColor: detail.kind === 'capacity' ? 'var(--green)' : 'var(--orange)',
        value: detail.kind === 'capacity' ? formatSignedNumber(detail.value) : loadValue(detail.value),
        valueColor: detail.kind === 'capacity' ? 'var(--green)' : loadValueColor(detail.value),
      })),
    );
  }

  return {
    title: source.label,
    body: webUIText(sourceExplanationKey(source)),
    lines,
  };
}

function sourceLine(source: BureaucraticThroughputSource): TooltipLine {
  return {
    label: source.label,
    labelColor: source.kind === 'capacity'
      ? source.value >= 0 ? 'var(--green)' : 'var(--red)'
      : 'var(--orange)',
    value: sourceValue(source),
    valueColor: sourceValueColor(source),
    subTooltip: sourceSubTooltip(source),
  };
}

function sortSources(a: BureaucraticThroughputSource, b: BureaucraticThroughputSource): number {
  return Math.abs(b.value) - Math.abs(a.value);
}

function sourceLines(
  sources: BureaucraticThroughputSource[],
  predicate: (source: BureaucraticThroughputSource) => boolean,
): TooltipLine[] {
  return sources
    .filter(predicate)
    .sort(sortSources)
    .map(sourceLine);
}

function aggregateSubTooltip(
  title: string,
  bodyKey: string,
  sources: BureaucraticThroughputSource[],
  predicate: (source: BureaucraticThroughputSource) => boolean,
): TooltipContent {
  const lines = sourceLines(sources, predicate);
  return {
    title,
    body: webUIText(bodyKey),
    lines: lines.length > 0 ? lines : undefined,
  };
}

function loadAggregateLine(
  labelKey: string,
  bodyKey: string,
  sources: BureaucraticThroughputSource[],
  predicate: (source: BureaucraticThroughputSource) => boolean,
): TooltipLine {
  const label = webUIText(labelKey);
  const total = sourceTotal(sources, predicate);
  return {
    label,
    labelColor: 'var(--orange)',
    value: loadValue(total),
    valueColor: loadValueColor(total),
    subTooltip: aggregateSubTooltip(label, bodyKey, sources, predicate),
  };
}

function headerLine(labelKey: string): TooltipLine {
  return {
    label: webUIText(labelKey),
    isHeader: true,
  };
}

export function BureaucraticInlineValue({
  value,
  kind = 'load',
  label = webUIText('BureaucracyMock.Inline.Label'),
  tone,
  compact = false,
}: {
  value: number;
  kind?: InlineKind;
  label?: string;
  tone?: Tone;
  compact?: boolean;
}) {
  const resolvedTone = tone ?? inlineTone(value, kind);
  return (
    <span className={`btm-inline btm-inline--${resolvedTone}${compact ? ' btm-inline--compact' : ''}`}>
      <img className="btm-inline-icon" src="/assets/power-blocs/BureaucracyBloc.png" alt="" draggable={false} />
      {!compact && <span className="btm-inline-label">{label}</span>}
      <span className="btm-inline-value">{inlineText(value, kind)}</span>
    </span>
  );
}

export function BureaucraticRushTooltipAction({
  actionId,
  targetFactionId,
  targetId,
  daysSaved,
  overloadLoad,
}: {
  actionId: string;
  targetFactionId?: string;
  targetId?: string;
  daysSaved: number;
  overloadLoad: number;
}) {
  useRushStoreVersion();
  const throughput = useBureaucraticThroughputBridge();
  const [pending, setPending] = useState(false);

  const rushStoreKey = `${targetId ?? ''}:${targetFactionId ?? ''}:${actionId}`;
  const rushed = rushedActionIds.has(rushStoreKey);
  const addedLoadDurationDays = Math.max(7, daysSaved * 4);
  const projectedLoad = (throughput?.currentLoad ?? 0) + overloadLoad;
  const capacity = throughput?.capacity ?? 0;
  const projectedPenaltyPercent = throughput
    ? projectedOverloadPenaltyPercent(throughput.currentLoad, throughput.capacity, overloadLoad)
    : 0;
  const projectedCombatPenalty = capacity > 0 && projectedLoad / capacity >= 1.1;

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || rushed || pending) return;
    event.preventDefault();
    event.stopPropagation();

    const parsed = parseActionId(actionId);
    setPending(true);
    void rushBureaucraticAction({
      targetFactionId,
      targetId,
      actionKind: parsed.actionKind,
      actionId: parsed.actionId,
    }).then(response => {
      if (response?.rushed) {
        markActionRushed(rushStoreKey);
      }
    }).finally(() => {
      setPending(false);
    });
  };

  return (
    <div className={`btm-rush${rushed ? ' btm-rush--applied' : ''}`}>
      <div className="btm-rush-copy">
        <span className="btm-rush-title">{webUIText('BureaucracyMock.Rush.Title')}</span>
        <span className="btm-rush-body">
          {webUIText('BureaucracyMock.Rush.TimeSaved', {
            Days: formatNumber(daysSaved),
            DayWord: dayWord(daysSaved),
          })}
        </span>
        <span className="btm-rush-detail">
          {webUIText('BureaucracyMock.Rush.TemporaryLoad', {
            Load: formatNumber(overloadLoad),
            Days: formatNumber(addedLoadDurationDays),
            DayWord: dayWord(addedLoadDurationDays),
          })}
        </span>
        {throughput && (
          <span className={`btm-rush-detail${projectedPenaltyPercent > 0 ? ' btm-rush-detail--bad' : ' btm-rush-detail--good'}`}>
            {webUIText('BureaucracyMock.Rush.ProjectedCapacity', {
              Used: formatNumber(projectedLoad),
              Total: formatNumber(capacity),
            })}
          </span>
        )}
        {throughput && projectedPenaltyPercent === 0 && (
          <span className="btm-rush-detail btm-rush-detail--good">
            {webUIText('BureaucracyMock.Rush.NoPenalty')}
          </span>
        )}
        {throughput && projectedPenaltyPercent > 0 && (
          <>
            <span className="btm-rush-detail btm-rush-detail--bad">
              {webUIText('BureaucracyMock.Rush.EconomicPenalty', {
                Penalty: formatNumber(projectedPenaltyPercent),
              })}
            </span>
            {projectedCombatPenalty && (
              <span className="btm-rush-detail btm-rush-detail--bad">
                {webUIText('BureaucracyMock.Rush.CombatPenalty', {
                  Penalty: formatNumber(projectedPenaltyPercent),
                })}
              </span>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        className="btm-rush-button"
        disabled={rushed || pending}
        onClick={handleMouseDown}
      >
        {rushed ? webUIText('BureaucracyMock.Rush.Applied') : webUIText('BureaucracyMock.Rush.Button')}
      </button>
    </div>
  );
}

export function BureaucraticThroughputHudValue({ onOpen }: { onOpen?: () => void }) {
  const throughput = useBureaucraticThroughputBridge();
  const model = throughput ?? EMPTY_MODEL;
  const capacitySourceLines = sourceLines(model.sources, source => source.kind === 'capacity');
  const effectLines = overloadEffectLines(model);

  const tooltip: TooltipContent = {
    title: webUIText('BureaucracyMock.HudTitle'),
    lines: [
      headerLine('BureaucracyMock.HudLoadSection'),
      loadAggregateLine(
        'BureaucracyMock.HudPolicies',
        'BureaucracyMock.Explain.PolicyChanges',
        model.sources,
        source => source.kind === 'load' && source.category === 'policy',
      ),
      loadAggregateLine(
        'BureaucracyMock.HudEdicts',
        'BureaucracyMock.Explain.ActiveEdicts',
        model.sources,
        source => source.kind === 'load' && source.category === 'edict',
      ),
      loadAggregateLine(
        'BureaucracyMock.HudInteractions',
        'BureaucracyMock.Explain.RunningActions',
        model.sources,
        source => source.kind === 'load' && RUNNING_ACTION_CATEGORIES.has(source.category),
      ),
      loadAggregateLine(
        'BureaucracyMock.HudDirectAdministration',
        'BureaucracyMock.Explain.DirectAdministration',
        model.sources,
        source => source.kind === 'load' && DIRECT_ADMINISTRATION_SOURCE_IDS.has(source.id),
      ),
      loadAggregateLine(
        'BureaucracyMock.HudProvinceTerritory',
        'BureaucracyMock.Explain.ProvinceTerritory',
        model.sources,
        source => source.id === 'load:provinces',
      ),
      loadAggregateLine(
        'BureaucracyMock.HudProvinces',
        'BureaucracyMock.Explain.ProvincePressure',
        model.sources,
        source => source.kind === 'load' && source.category === 'province',
      ),
      ...(model.rushPressure > 0 ? [
        loadAggregateLine(
          'BureaucracyMock.HudRushPressure',
          'BureaucracyMock.Explain.RushPressure',
          model.sources,
          source => source.kind === 'load' && source.category === 'rush',
        ),
      ] : []),
      headerLine('BureaucracyMock.HudCapacitySection'),
      ...capacitySourceLines,
      headerLine('BureaucracyMock.HudSummary'),
      {
        label: webUIText('BureaucracyMock.HudCapacity'),
        value: `${formatNumber(model.currentLoad)}/${formatNumber(model.capacity)}`,
        valueColor: model.overload > 0 ? 'var(--red)' : 'var(--green)',
      },
      ...(effectLines.length > 0 ? [
        headerLine('BureaucracyMock.HudOverloadEffects'),
        ...effectLines,
      ] : []),
    ],
  };

  return (
    <Tooltip content={tooltip} position="bottom" delay={150} variant="sidebar" bubbleClassName="tt-bubble--bureaucracy">
      <button
        type="button"
        className={`btm-hud resource-main${model.overload > 0 ? ' btm-hud--overload' : ''}`}
        onClick={(event) => {
          event.preventDefault();
          onOpen?.();
        }}
        aria-label={webUIText('BureaucracyMock.HudTitle')}
      >
        <img className="btm-hud-icon" src="/assets/power-blocs/BureaucracyBloc.png" alt="" draggable={false} />
        <span className="btm-hud-value resource-pop-value">
          <span className="btm-hud-value-part">{formatNumber(model.currentLoad)}</span>
          <span className="btm-hud-value-part btm-hud-value-separator">/</span>
          <span className="btm-hud-value-part">{formatNumber(model.capacity)}</span>
        </span>
      </button>
    </Tooltip>
  );
}

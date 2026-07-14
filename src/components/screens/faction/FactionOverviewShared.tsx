import { useCallback, useState } from 'react';
import Portrait from '../../common/portraits/Portrait';
import Tooltip, { type TooltipContent } from '../../common/tooltips/Tooltip';
import StructuredDisplayText from '../../common/layout/content/StructuredDisplayText';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import CourtAppointmentModal from '../../modals/characters/CourtAppointmentModal';
import { BureaucraticInlineValue, BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import { bureaucraticTooltipLine } from '../../bureaucracy/BureaucraticThroughputModel';
import { cancelFactionCurrentInteraction, startFactionPolicyAdjustment } from '../../../bridge/diplomacy/useFactionBridge';
import { setAutoAssignCourt, useCourtPositionsBridgeState, type CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import type { FactionModifier, FactionPolicy, FactionPolicyLevel } from '../../../data/types';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { webUIText, useWebUIText, type WebUITextFormatter } from '../../../localization/WebUITextContext';
import './FactionOverviewScreen.css';

function fmtFull(value: number | undefined): string {
  return formatNumber(value);
}

const STAT_ICON_LABELS: Record<string, string> = {
  tactics: 'Tactics',
  authority: 'Authority',
  cunning: 'Cunning',
  governance: 'Governance',
  loyalty: 'Loyalty',
  constitution: 'Constitution',
};

function statLabel(stat: string, t: WebUITextFormatter): string {
  const labels: Record<string, string> = {
    tactics: t('Common.Tactics'),
    authority: t('Common.Authority'),
    cunning: t('Common.Cunning'),
    governance: t('Common.Governance'),
    loyalty: t('Common.Loyalty'),
    constitution: t('Common.Constitution'),
  };
  return labels[stat] ?? stat;
}

function statIcon(stat: string): string {
  const label = STAT_ICON_LABELS[stat] ?? webUIText("Auto.Fix.VarExprFallback.componentsscreensFactionOverviewScreen.1021.1");
  return `/assets/icons/StatIcons/I_${label}.png`;
}

function formatCourtDayCount(days: number, t: WebUITextFormatter): string {
  const safeDays = Math.max(0, Math.round(days));
  return t('Common.DayCount', {
    Days: formatNumber(safeDays),
    Unit: safeDays === 1 ? t('Common.Day') : t('Common.Days'),
  });
}

function formatCourtTermValue(daysRemaining: number | undefined, termComplete: boolean | undefined, t: WebUITextFormatter): string {
  if (termComplete === true) return t('CourtAppointment.TermComplete');
  if (typeof daysRemaining !== 'number') return t('Common.None');
  if (daysRemaining <= 0) return t('CourtAppointment.TermComplete');
  return formatCourtDayCount(daysRemaining, t);
}

function courtPositionHasPlayer(position: CourtPositionView): boolean {
  return position.holder?.isPlayerCharacter === true
    || position.subordinates.some(subordinate => subordinate.isPlayerCharacter);
}

function CourtSlot({
  position,
  maxSubordinates,
  readOnly,
  highlighted,
  showBureaucraticPower,
  onOpen,
  onOpenCharacter,
}: {
  position: CourtPositionView;
  maxSubordinates: number;
  readOnly: boolean;
  highlighted: boolean;
  showBureaucraticPower: boolean;
  onOpen: (position: CourtPositionView) => void;
  onOpenCharacter?: (id: string) => void;
}) {
  const t = useWebUIText();
  const statTotal = position.statTotal;
  const bonus = position.bonusText;
  const vacant = !position.holder;
  const emptySlots = Math.max(0, maxSubordinates - position.subordinates.length);
  const primaryLabel = statLabel(position.primaryStat, t);
  const capacityValue = position.bureaucraticCapacity;
  const capacityLine = showBureaucraticPower ? bureaucraticTooltipLine(capacityValue, 'capacity') : null;
  const holderTermValue = formatCourtTermValue(position.holderDaysRemaining, position.holderTermComplete, t);
  const rootClassName = [
    'fov-court-slot',
    vacant ? 'fov-court-slot--vacant' : '',
    readOnly ? 'fov-court-slot--readonly' : '',
    highlighted ? 'fov-court-slot--player' : '',
  ].filter(Boolean).join(' ');

  const tooltip: TooltipContent = {
    title: position.name,
    body: position.description,
    lines: vacant ? [
      { label: t('Common.Status'), value: t('FactionOverview.Vacant'), valueColor: 'var(--text-dark)' },
      { label: t('Common.Bonus'), value: t('Common.None'), valueColor: 'var(--text-dark)' },
      ...(capacityLine ? [capacityLine] : []),
    ] : [
      { label: t('Common.Appointee'), value: position.holder?.name },
      { label: t('CourtAppointment.TermRemaining'), value: holderTermValue, valueColor: position.holderTermComplete ? 'var(--green)' : undefined },
      ...(position.holderEndDateText ? [{ label: t('CourtAppointment.TermEnds'), value: position.holderEndDateText }] : []),
      { label: primaryLabel, get value() { return webUIText("Auto.Prop.componentsscreensFactionOverviewScreen.1050.1", { Value1: position.holder?.statValue ?? 0 }); }, valueColor: 'var(--green)' },
      { label: t('Common.Bonus'), value: bonus, valueColor: position.bonusIsNegative ? 'var(--red)' : 'var(--green)' },
      ...(capacityLine ? [capacityLine] : []),
      ...(position.subordinates.length > 0 ? [{ label: t('Common.Subordinates'), isHeader: true }] : []),
      ...position.subordinates.map(sub => ({ label: sub.name, get value() { return webUIText("Auto.Prop.componentsscreensFactionOverviewScreen.1053.1", { Value1: formatSignedNumber(sub.statContribution) }); } })),
    ],
    footer: readOnly
      ? undefined
      : t(vacant ? 'FactionOverview.ClickToAppointCharacter' : 'FactionOverview.ClickToReplaceCharacter'),
  };

  return (
    <Tooltip content={tooltip} delay={200} variant="sidebar">
      <div className={rootClassName} onMouseDown={() => { if (!readOnly) onOpen(position); }}>
        <div className="fov-court-portrait-col">
          {position.holder ? (
            <>
              <div
                className={`fov-court-portrait-action${onOpenCharacter ? ' fov-court-portrait-action--clickable' : ''}`}
                onMouseDown={(event) => {
                  if (!onOpenCharacter) return;
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  if (!onOpenCharacter) return;
                  event.stopPropagation();
                  onOpenCharacter(position.holder!.id);
                }}
              >
                <Portrait
                  personId={position.holder.id}
                  name={position.holder.name}
                  size="lg"
                  isPlayerCharacter={position.holder.isPlayerCharacter}
                />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="fov-court-replace-btn"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onOpen(position);
                  }}
                >
                  {t('FactionOverview.ReplaceAppointment')}
                </button>
              )}
            </>
          ) : (
            <div className="fov-court-vacant-portrait">
              <img src="/assets/icons/I_Characters.png" alt="" className="fov-court-vacant-icon" draggable={false} />
            </div>
          )}
        </div>
        <div className="fov-court-center">
          <div className="fov-court-pos-row">
            <img className="fov-court-pos-icon" src={statIcon(position.primaryStat)} alt="" draggable={false} />
            <span className="fov-court-pos-name">{position.name}</span>
          </div>
          {position.holder ? (
            <>
              <div className={`fov-court-appointee-name${position.holder.isPlayerCharacter ? ' fov-court-appointee-name--player' : ''}`}>{position.holder.name}</div>
              <div className="fov-court-term-row">
                <span>{t('CourtAppointment.TermRemaining')}</span>
                <strong>{holderTermValue}</strong>
              </div>
              <div className="fov-court-bonus-row">
                <span className="fov-court-bonus-label">{position.bonusLabel}</span>
                <span className="fov-court-bonus-val">{bonus}</span>
              </div>
              {showBureaucraticPower && <BureaucraticInlineValue value={capacityValue} kind="capacity" compact />}
            </>
          ) : (
            <>
              <div className="fov-court-vacant-label">{t('FactionOverview.Vacant')}</div>
              {!readOnly && <div className="fov-court-vacant-cta">{t('FactionOverview.ClickToAppoint')}</div>}
              {showBureaucraticPower && <BureaucraticInlineValue value={capacityValue} kind="capacity" compact />}
            </>
          )}
        </div>
        <div className="fov-court-right">
          {!vacant && (
            <div className="fov-court-stat-badge">
              <img className="fov-court-stat-icon" src={statIcon(position.primaryStat)} alt="" draggable={false} />
              <span className="fov-court-stat-val">{fmtFull(statTotal)}</span>
              <span className="fov-court-stat-name">{primaryLabel}</span>
            </div>
          )}
          <div className="fov-court-subs-col">
            <span className="fov-court-subs-label">{t('FactionOverview.SubordinatesCount', { Current: fmtFull(position.subordinates.length), Max: fmtFull(maxSubordinates) })}</span>
            <div className="fov-court-subs-row">
              {position.subordinates.map(sub => {
                const subordinateTermValue = formatCourtTermValue(sub.daysRemaining, sub.termComplete, t);
                const subordinateTooltip: TooltipContent = {
                  title: sub.name,
                  lines: [
                    { label: primaryLabel, get value() { return webUIText("Auto.Prop.componentsscreensFactionOverviewScreen.1102.1", { StatValue: sub.statValue }); } },
                    { label: t('CourtAppointment.TermRemaining'), value: subordinateTermValue, valueColor: sub.termComplete ? 'var(--green)' : undefined },
                    ...(sub.endDateText ? [{ label: t('CourtAppointment.TermEnds'), value: sub.endDateText }] : []),
                    ...(sub.appointmentContestOpen
                      ? [{ label: t('ProvinceMode.Appointment.DecisionIn'), value: formatCourtDayCount(sub.daysRemaining ?? 0, t) }]
                      : []),
                  ],
                };
                return (
                  <Tooltip key={sub.id} content={subordinateTooltip} delay={150}>
                    <div
                      className={`fov-court-sub${sub.isPlayerCharacter ? ' fov-court-sub--player' : ''}${onOpenCharacter ? ' fov-court-sub--clickable' : ''}`}
                      onMouseDown={(event) => {
                        if (!onOpenCharacter) return;
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        if (!onOpenCharacter) return;
                        event.stopPropagation();
                        onOpenCharacter(sub.id);
                      }}
                    >
                      <Portrait
                        personId={sub.id}
                        name={sub.name}
                        size="sm"
                        isPlayerCharacter={sub.isPlayerCharacter}
                      />
                    </div>
                  </Tooltip>
                );
              })}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <div key={i} className="fov-court-sub fov-court-sub--empty">
                  <div className="fov-court-sub-empty-circle" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

export function CourtPositionsPanel({
  enabled,
  readOnly = false,
  showAutoAssign = !readOnly,
  titleKey = 'FactionOverview.CourtPositions',
  highlightPlayerOffice = false,
  showBureaucraticPower = true,
  onOpenCharacter,
}: {
  enabled: boolean;
  readOnly?: boolean;
  showAutoAssign?: boolean;
  titleKey?: string;
  highlightPlayerOffice?: boolean;
  showBureaucraticPower?: boolean;
  onOpenCharacter?: (id: string) => void;
}) {
  const t = useWebUIText();
  const courtState = useCourtPositionsBridgeState(enabled);
  const court = courtState.result;
  const [position, setPosition] = useState<CourtPositionView | null>(null);
  const maxSubordinates = court?.maxSubordinates ?? 5;
  const positions = court?.positions ?? [];
  const courtCapacity = positions.reduce((sum, pos) => sum + pos.bureaucraticCapacity, 0);
  const autoAssignCourtEnabled = court?.autoAssignCourtEnabled ?? false;

  return (
    <div className="fov-wrap">
      <div className="fov-court-summary">
        <div className="fov-court-summary-left">
          <SectionHeading variant="ornate" title={t(titleKey)} />
          {showBureaucraticPower && <BureaucraticInlineValue value={courtCapacity} kind="capacity" />}
        </div>
        {showAutoAssign && (
          <GameCheckButton
            checked={autoAssignCourtEnabled}
            label={t('FactionOverview.AutoAssignCourt')}
            onToggle={() => { void setAutoAssignCourt(!autoAssignCourtEnabled).catch(() => undefined); }}
            tooltip={{ title: t('FactionOverview.AutoAssignCourt'), body: t('FactionOverview.AutoAssignCourtTooltip') }}
          />
        )}
      </div>
      <div className="fov-court-grid">
        {courtState.pending ? null : positions.length === 0 ? (
          <div className="fov-empty-state">{t('FactionOverview.NoCourtPositions')}</div>
        ) : positions.map(pos => (
          <CourtSlot
            key={pos.key}
            position={pos}
            maxSubordinates={maxSubordinates}
            readOnly={readOnly}
            highlighted={highlightPlayerOffice && courtPositionHasPlayer(pos)}
            showBureaucraticPower={showBureaucraticPower}
            onOpen={setPosition}
            onOpenCharacter={onOpenCharacter}
          />
        ))}
      </div>
      {!readOnly && (
        <CourtAppointmentModal
          open={!!position}
          position={position}
          onClose={() => setPosition(null)}
        />
      )}
    </div>
  );
}

function policyStep(policy: FactionPolicy) {
  const range = policy.maxValue - policy.minValue;
  const stepCount = Math.max(Math.round(range + 1), 1);
  if (range <= 0) return { stepCount, progressValue: 0, displayPercent: 0, fillPercent: 0 };

  const normalised = (policy.value - policy.minValue) / range;
  const progressValue = Math.max(0, Math.min(stepCount, Math.round(normalised * stepCount)));
  const displayPercent = Math.round((progressValue / stepCount) * 100);
  return { stepCount, progressValue, displayPercent, fillPercent: displayPercent };
}

function policyPercentForValue(policy: FactionPolicy, value: number): number {
  const range = policy.maxValue - policy.minValue;
  const stepCount = Math.max(Math.round(range + 1), 1);
  if (range <= 0) return 0;

  const normalised = (value - policy.minValue) / range;
  const progressValue = Math.max(0, Math.min(stepCount, Math.round(normalised * stepCount)));
  return Math.round((progressValue / stepCount) * 100);
}

function policyIcon(policy: FactionPolicy): string {
  const key = policy.key || policy.id;
  return FoaeCefUIAssetPath(`/assets/policies/${key}.png`) ?? '/assets/icons/I_Chart.png';
}

function TooltipEffectLines({ lines }: { lines?: FactionPolicyLevel['effectLines'] }) {
  if ((lines?.length ?? 0) === 0) return null;

  return (
    <div className="fov-tooltip-effects">
      <StructuredDisplayText lines={lines} lineClassName="fov-tooltip-effect-line" />
    </div>
  );
}

function directionLabel(direction: 'increase' | 'decrease', t: WebUITextFormatter): string {
  return direction === 'increase' ? t('FactionOverview.Increase') : t('FactionOverview.Decrease');
}

function policyAdjustmentTooltip(policy: FactionPolicy, direction: 'increase' | 'decrease', t: WebUITextFormatter): TooltipContent {
  const cost = direction === 'increase' ? policy.increaseCost : policy.decreaseCost;
  const duration = direction === 'increase' ? policy.increaseDuration : policy.decreaseDuration;
  const unrest = direction === 'increase' ? policy.increaseCausesUnrest : policy.decreaseCausesUnrest;
  const previewLines = direction === 'increase' ? policy.increaseEffectLines : policy.decreaseEffectLines;
  const throughputLine = bureaucraticTooltipLine(
    direction === 'increase' ? policy.bureaucraticIncreaseLoad : policy.bureaucraticDecreaseLoad,
  );

  return {
    get title() { return webUIText("Auto.Prop.componentsscreensFactionOverviewScreen.192.1", { Value1: directionLabel(direction, t), Value2: policy.name }); },
    body: <StructuredDisplayText lines={(previewLines?.length ?? 0) > 0 ? previewLines : policy.effectLines} />,
    lines: [
      { label: t('Common.Cost'), value: cost > 0 ? fmtFull(cost) : t('Common.Free'), valueIcon: cost > 0 ? '/assets/icons/I_Coins.png' : undefined },
      { label: t('Common.Duration'), value: `${duration} ${t(duration === 1 ? 'Common.Day' : 'Common.Days')}` },
      ...(throughputLine ? [throughputLine] : []),
      ...(unrest ? [
        { label: t('FactionOverview.Unrest'), value: t('FactionOverview.UnrestValue'), valueColor: 'var(--red)' },
        { label: t('FactionOverview.Governors'), value: t('FactionOverview.GovernorsOpinionValue'), valueColor: 'var(--red)' },
      ] : []),
    ],
  };
}

function policyLevels(policy: FactionPolicy): FactionPolicyLevel[] {
  return policy.levelEffects;
}

function policyLevelTooltip(policy: FactionPolicy, level: FactionPolicyLevel, index: number, total: number, t: WebUITextFormatter): TooltipContent {
  const percent = policyPercentForValue(policy, level.value);
  const title = t('FactionOverview.PolicyLevelTitle', { PolicyName: policy.name, Level: index + 1, Total: total });

  return {
    title,
    lines: [{
      label: level.isCurrent ? t('FactionOverview.CurrentLevel') : t('FactionOverview.Level'),
      value: `${fmtFull(percent)}%`,
      valueColor: level.isCurrent ? 'var(--gold)' : undefined,
    }],
    afterLines: <TooltipEffectLines lines={level.effectLines} />,
  };
}

export function PolicyEntry({
  factionId,
  policy,
  blockedByInteraction,
  readOnly = false,
}: {
  factionId: string;
  policy: FactionPolicy;
  blockedByInteraction: boolean;
  readOnly?: boolean;
}) {
  const t = useWebUIText();
  const { displayPercent, fillPercent } = policyStep(policy);
  const displayPercentLabel = formatPercent(displayPercent);
  const levels = policyLevels(policy);
  const canIncrease = !readOnly && policy.canIncrease && !blockedByInteraction;
  const canDecrease = !readOnly && policy.canDecrease && !blockedByInteraction;
  const activeProgress = Math.max(0, Math.min(1, policy.progress || 0));
  const policyBureaucraticLoad = policy.bureaucraticCurrentLoad;
  const startAdjustment = useCallback((direction: 'increase' | 'decrease') => {
    if (readOnly || (direction === 'increase' && !canIncrease) || (direction === 'decrease' && !canDecrease)) return;
    void startFactionPolicyAdjustment(factionId, policy.id, direction);
  }, [canDecrease, canIncrease, factionId, policy.id, readOnly]);

  const cancelAdjustment = useCallback(() => {
    if (readOnly || !policy.inProgress) return;
    void cancelFactionCurrentInteraction(factionId);
  }, [factionId, policy.inProgress, readOnly]);

  const policyTooltipLines = [
    ...(policy.isFromLiege ? [{
      label: t('FactionOverview.SetBy'),
      value: policy.displayFactionName,
    }] : []),
    {
      label: t('FactionOverview.CurrentLevel'),
      value: displayPercentLabel,
      valueColor: 'var(--gold)',
    },
  ];

  const policyTooltip: TooltipContent = {
    title: policy.name,
    body: policy.description || undefined,
    lines: policyTooltipLines,
    afterLines: (
      <>
        <TooltipEffectLines lines={policy.effectLines} />
        {policy.inProgress && !readOnly && (
          <BureaucraticRushTooltipAction
            actionId={`policy:${policy.id}`}
            targetFactionId={factionId}
            daysSaved={policy.bureaucraticRushDaysSaved}
            overloadLoad={policy.bureaucraticRushLoad}
          />
        )}
      </>
    ),
  };

  return (
    <div className={`fov-policy${policy.inProgress ? ' fov-policy--active' : ''}`} data-tutorial-target={`Policy:${policy.id}`}>
      {policy.inProgress && (
        <div className={`fov-policy-progress${policy.activeDirection === 'decrease' ? ' fov-policy-progress--decrease' : ''}`}>
          <div className="fov-policy-progress-fill" style={{ transform: `scaleX(${activeProgress.toFixed(4)})` }} />
        </div>
      )}
      <div className="fov-policy-icon-wrap">
        <Tooltip content={policyTooltip} delay={200} bubbleClassName="fov-tooltip-bubble" inline>
          <img className="fov-policy-icon" src={policyIcon(policy)} alt="" draggable={false} />
        </Tooltip>
      </div>
      <div className="fov-policy-info">
        <Tooltip content={policyTooltip} delay={200} bubbleClassName="fov-tooltip-bubble">
          <div className="fov-policy-copy">
            <div className="fov-policy-title-row">
              <div className="fov-policy-name">{policy.name}</div>
              <span className="fov-policy-val">{displayPercentLabel}</span>
            </div>
            {policy.description && <div className="fov-policy-desc">{policy.description}</div>}
          </div>
        </Tooltip>
        <div className="fov-policy-bar-row">
          <div className="fov-policy-bar-wrap">
            <div className="fov-policy-bar-track">
              <div className="fov-policy-bar-segment fov-policy-bar-filled" style={{ width: `${fillPercent}%` }} />
            </div>
            <div className="fov-policy-bar-levels">
              {levels.map((level, i) => (
                <Tooltip
                  key={`${level.level}:${i}`}
                  content={policyLevelTooltip(policy, level, i, levels.length, t)}
                  position="bottom"
                  delay={150}
                  bubbleClassName="fov-tooltip-bubble"
                  inline
                >
                  <span
                    className={`fov-policy-bar-level${level.isCurrent ? ' fov-policy-bar-level--current' : ''}${i === levels.length - 1 ? ' fov-policy-bar-level--last' : ''}`}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
        {policy.inProgress && !readOnly && (
          <div className="fov-policy-adjustment">
            <span className="fov-policy-adjustment-label">
              {t('FactionOverview.PolicyAdjustmentStatus', {
                Direction: policy.activeDirection === 'decrease' ? t('FactionOverview.Decreasing') : t('FactionOverview.Increasing'),
                Days: fmtFull(policy.remainingDays),
                DayWord: t(policy.remainingDays === 1 ? 'Common.Day' : 'Common.Days'),
              })}
            </span>
            <BureaucraticInlineValue value={policyBureaucraticLoad} compact />
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="fov-policy-controls">
          {policy.inProgress ? (
            <Tooltip content={t('Common.Cancel')} delay={150}>
              <button
                type="button"
                className="fov-policy-btn fov-policy-btn--cancel"
                aria-label={t('Common.Cancel')}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  cancelAdjustment();
                }}
              >
                <img src="/assets/icons/I_Close.png" alt="" className="fov-policy-btn-icon" draggable={false} />
              </button>
            </Tooltip>
          ) : (
            <>
              <Tooltip content={policyAdjustmentTooltip(policy, 'increase', t)} delay={150}>
                <button
                  type="button"
                  className={`fov-policy-btn${canIncrease ? '' : ' fov-policy-btn--disabled'}`}
                  disabled={!canIncrease}
                  data-tutorial-target={policy.id === 'taxrate' ? 'TaxRateIncreaseButton' : undefined}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startAdjustment('increase');
                  }}
                >+</button>
              </Tooltip>
              <Tooltip content={policyAdjustmentTooltip(policy, 'decrease', t)} delay={150}>
                <button
                  type="button"
                  className={`fov-policy-btn${canDecrease ? '' : ' fov-policy-btn--disabled'}`}
                  disabled={!canDecrease}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startAdjustment('decrease');
                  }}
                >-</button>
              </Tooltip>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function modifierDisplayValue(modifier: FactionModifier): string {
  if (modifier.isMultiplier) {
    return `x${formatNumber(modifier.value, { maximumFractionDigits: modifier.decimals > 0 ? modifier.decimals : 2, minimumFractionDigits: modifier.decimals })}`;
  }

  const display = modifier.isPercent ? modifier.value * 100 : modifier.value;
  const formatted = formatNumber(display, {
    maximumFractionDigits: modifier.decimals,
    minimumFractionDigits: modifier.decimals,
  });
  const prefix = display > 0 ? '+' : '';
  return `${prefix}${formatted}${modifier.isPercent ? '%' : ''}`;
}

function modifierSourceValue(modifier: FactionModifier, value: number): string {
  const asPercent = modifier.isPercent || modifier.isMultiplier;
  const display = asPercent ? value * 100 : value;
  const decimals = modifier.decimals > 0 ? modifier.decimals : asPercent ? 0 : 1;
  const formatted = formatNumber(display, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
  const prefix = display > 0 ? '+' : '';
  return `${prefix}${formatted}${asPercent ? '%' : ''}`;
}

function modifierTone(modifier: FactionModifier): 'positive' | 'negative' | 'neutral' {
  let effective = modifier.isMultiplier ? modifier.value - 1 : modifier.value;
  if (modifier.invertColouring) effective = -effective;
  if (effective > 0.01) return 'positive';
  if (effective < -0.01) return 'negative';
  return 'neutral';
}

export function FactionModifierCard({ modifier }: { modifier: FactionModifier }) {
  const t = useWebUIText();
  const tone = modifierTone(modifier);
  const iconPath = FoaeCefUIAssetPath(modifier.icon || '/assets/icons/I_Multiplier.png');
  const tooltip: TooltipContent = {
    title: modifier.label,
    body: modifier.description,
    lines: [
      { label: t('FactionOverview.ModifierTotal'), value: modifierDisplayValue(modifier), valueColor: tone === 'positive' ? 'var(--green)' : tone === 'negative' ? 'var(--red)' : 'var(--text)' },
      ...(modifier.sources.length > 0 ? [{ label: t('FactionOverview.ModifierSources'), isHeader: true }] : []),
      ...modifier.sources.map(source => ({
        label: source.label,
        value: modifierSourceValue(modifier, source.value),
        valueColor: source.value >= 0 ? 'var(--green)' : 'var(--red)',
      })),
    ],
  };

  return (
    <Tooltip content={tooltip} delay={150} bubbleClassName="fov-tooltip-bubble">
      <div className={`fov-modifier-card fov-modifier-card--${tone}`}>
        <img className="fov-modifier-card-icon" src={iconPath} alt="" draggable={false} />
        <div className="fov-modifier-card-copy">
          <div className="fov-modifier-card-label">{modifier.label}</div>
        </div>
        <span className="fov-modifier-card-value">{modifierDisplayValue(modifier)}</span>
      </div>
    </Tooltip>
  );
}

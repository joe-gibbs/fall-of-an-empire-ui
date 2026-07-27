import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import ReligionTooltip from '../../common/tooltips/ReligionTooltip';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import {
  advanceReligionConversion,
  cancelReligionConversion,
  startReligionConversion,
  type ReligionConversionResult,
  type ReligionConversionStageView,
} from '../../../bridge/provinces/useReligionConversionBridge';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import { UI_MOTION } from '../../../config/motion';
import './ReligionConversionModal.css';

interface Props {
  open: boolean;
  conversion: ReligionConversionResult | null;
  onClose: () => void;
  onChanged?: () => void;
}

const RELIGION_FALLBACK_ICON = '/assets/icons/I_Religions.png';

function formatDuration(days: number): string {
  const totalDays = Math.max(0, Math.round(days));
  return webUIText('Common.CountWithUnit', {
    Count: formatNumber(totalDays),
    Unit: totalDays === 1 ? webUIText('Common.Day') : webUIText('Common.Days'),
  });
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function stageStateLabel(stage: ReligionConversionStageView): string {
  if (stage.state === 'ready') return webUIText('ReligionConversion.Ready');
  if (stage.state === 'active') return webUIText('ReligionConversion.Active');
  if (stage.state === 'complete') return webUIText('ReligionConversion.Complete');
  return webUIText('ReligionConversion.Locked');
}

function stageEffectLines(stage: ReligionConversionStageView) {
  const lines = [];
  if (stage.unrestPercent > 0) {
    lines.push({ label: webUIText('ReligionConversion.EventUnrest'), value: formatPercent(stage.unrestPercent * 100), valueColor: 'var(--red)' });
  }
  if (stage.targetShareBoostPerYear > 0) {
    lines.push({ label: webUIText('ReligionConversion.TargetSharePerYear'), value: formatPercent(stage.targetShareBoostPerYear * 100), valueColor: 'var(--green)' });
  }
  if (stage.taxEfficiencyPenalty > 0) {
    lines.push({ label: webUIText('ReligionConversion.TaxEfficiency'), value: `-${formatPercent(stage.taxEfficiencyPenalty * 100)}`, valueColor: 'var(--red)' });
  }
  if (stage.courtierLoyaltyPenalty > 0) {
    lines.push({ label: webUIText('ReligionConversion.CourtierLoyalty'), value: `-${formatNumber(stage.courtierLoyaltyPenalty)}`, valueColor: 'var(--red)' });
  }
  if (stage.changesReligion) {
    lines.push({ label: webUIText('ReligionConversion.StateReligionChanges'), value: webUIText('Common.Yes'), valueColor: 'var(--gold)' });
  }
  return lines;
}

function stageTooltip(stage: ReligionConversionStageView, includeActiveProgress = true) {
  const lines = [
    { label: webUIText('Common.Status'), value: stageStateLabel(stage) },
    { label: webUIText('Common.Duration'), value: formatDuration(stage.durationDays) },
    { label: webUIText('Common.Cost'), value: webUIText('ReligionConversion.GoldCost', { Value: formatNumber(stage.goldCost) }), valueColor: 'var(--gold)' },
  ];

  if (includeActiveProgress && stage.state === 'active') {
    lines.push({ label: webUIText('Auto.Attr.ComponentsModalsReligionConversionModal.83.2'), value: formatPercent(stage.progress * 100), valueColor: 'var(--gold)' });
    lines.push({ label: webUIText('ReligionConversion.Remaining'), value: formatDuration(stage.remainingDays), valueColor: 'var(--gold)' });
  }
  lines.push(...stageEffectLines(stage));

  return {
    title: stage.name,
    body: stage.description,
    lines,
    footer: stage.reason || undefined,
  };
}

function defaultStageIndex(conversion: ReligionConversionResult | null): number {
  if (!conversion || conversion.stages.length === 0) return 0;

  const active = conversion.stages.find(stage => stage.state === 'active');
  if (active) return active.index;

  const ready = conversion.stages.find(stage => stage.state === 'ready');
  if (ready) return ready.index;

  return Math.max(0, conversion.state.currentStageIndex);
}

export default function ReligionConversionModal({ open, conversion, onClose, onChanged }: Props) {
  const [closing, setClosing] = useState(false);
  const [selectedKeyState, setSelectedKeyState] = useState({ open, value: '' });
  const [submittingState, setSubmittingState] = useState({ open, value: false });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedKey = selectedKeyState.open === open ? selectedKeyState.value : '';
  const submitting = submittingState.open === open ? submittingState.value : false;
  const setSelectedKey = useCallback((value: string) => {
    setSelectedKeyState({ open, value });
  }, [open]);
  const setSubmitting = useCallback((value: boolean) => {
    setSubmittingState({ open, value });
  }, [open]);

  const close = useCallback(() => {
    if (closing || closeTimerRef.current) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setClosing(false);
      onClose();
    }, UI_MOTION.modalCloseMs);
  }, [closing, onClose]);

  useEscapeStackEntry({
    id: 'modal.religion-conversion',
    active: open,
    onClose: close,
    allowFromInput: true,
  });

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const selectedOption = useMemo(
    () => conversion?.options.find(option => option.key === selectedKey) ?? null,
    [conversion, selectedKey],
  );

  const targetName = conversion?.state.active
    ? conversion.state.targetReligionName
    : selectedOption?.name ?? '';
  const targetIcon = conversion?.state.active
    ? conversion.state.targetReligionIconPath
    : selectedOption?.iconPath ?? RELIGION_FALLBACK_ICON;
  const targetInfo = conversion?.state.active
    ? conversion.state.targetReligionInfo
    : selectedOption?.info;

  const canStart = Boolean(conversion && selectedKey && !conversion.state.active && conversion.stages.some(stage => stage.index === 0 && stage.canActivate));
  const showFooter = Boolean(conversion && (conversion.state.active || conversion.options.length > 0));
  const highlightedStageIndex = defaultStageIndex(conversion);
  const expandedStage = conversion?.state.active
    ? conversion.stages.find(stage => stage.state === 'active') ?? null
    : null;
  const expandedStageEffects = expandedStage ? stageEffectLines(expandedStage) : [];

  const handleStart = useCallback(() => {
    if (!selectedKey || submitting) return;
    setSubmitting(true);
    void startReligionConversion(selectedKey).then(success => {
      setSubmitting(false);
      if (success) {
        setSelectedKey('');
        onChanged?.();
      }
    });
  }, [onChanged, selectedKey, setSelectedKey, setSubmitting, submitting]);

  const handleAdvance = useCallback(() => {
    if (submitting) return;
    setSubmitting(true);
    void advanceReligionConversion().then(success => {
      setSubmitting(false);
      if (success) {
        onChanged?.();
      }
    });
  }, [onChanged, setSubmitting, submitting]);

  const handleCancel = useCallback(() => {
    if (submitting) return;
    setSubmitting(true);
    void cancelReligionConversion().then(success => {
      setSubmitting(false);
      if (success) {
        onChanged?.();
        close();
      }
    });
  }, [close, onChanged, setSubmitting, submitting]);

  if (!open) return null;

  return (
    <div
      className={`modal-overlay${closing ? ' modal-overlay--closing' : ''}`}
      onMouseDown={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className={`modal rcm-modal${closing ? ' modal--closing' : ''}`}
        onMouseDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
      >
        <div className="rcm-header">
          <div className="rcm-header-main">
            <img src={targetIcon} alt="" className="rcm-header-icon" draggable={false} />
            <div className="rcm-header-copy">
              <h2 className="rcm-title"><WebUIText textKey="Auto.ComponentsModalsReligionConversionModal.65.1" /></h2>
            </div>
          </div>
          <CloseButton size="sm" onClick={close} />
        </div>

        <StyledScrollArea className="rcm-scroll" viewportClassName="rcm-body">
          {conversion && (
            <div className="rcm-current">
              <ReligionTooltip info={conversion.state.currentReligionInfo} position="bottom" wrapperClassName="rcm-current-religion-tooltip">
                <div className="rcm-current-faith">
                  <img src={conversion.state.currentReligionIconPath} alt="" className="rcm-religion-icon" draggable={false} />
                  <div>
                    <span className="text-label"><WebUIText textKey="Auto.ComponentsModalsReligionConversionModal.75.2" /></span>
                    <span className="rcm-current-name">{conversion.state.currentReligionName || webUIText('Common.None')}</span>
                  </div>
                </div>
              </ReligionTooltip>
              <div className="rcm-current-arrow" />
              <ReligionTooltip info={targetInfo} fallbackName={targetName} position="bottom" wrapperClassName="rcm-current-religion-tooltip" disabled={!targetName}>
                <div className="rcm-current-faith">
                  <img src={targetIcon} alt="" className="rcm-religion-icon" draggable={false} />
                  <div>
                    <span className="text-label"><WebUIText textKey="ReligionConversion.TargetReligion" /></span>
                    <span className="rcm-current-name">{targetName || webUIText('ReligionConversion.SelectTarget')}</span>
                  </div>
                </div>
              </ReligionTooltip>
            </div>
          )}

          {conversion && conversion.stages.length > 0 && (
            <div className={`rcm-section rcm-stage-section${expandedStage ? ' rcm-stage-section--expanded' : ''}`}>
              <div className="rcm-options-title"><WebUIText textKey="ReligionConversion.Stages" /></div>
              <div className="rcm-stage-track">
                {conversion.stages.map(stage => (
                  <Tooltip key={stage.index} content={stageTooltip(stage, false)} delay={200}>
                    <div className={`rcm-stage-step rcm-stage-step--${stage.state}${stage.index === highlightedStageIndex ? ' rcm-stage-step--selected' : ''}`}>
                      <span className="rcm-stage-step-index">{formatNumber(stage.index + 1)}</span>
                      <span className="rcm-stage-step-copy">
                        <span className="rcm-stage-step-name">{stage.name}</span>
                        <span className="rcm-stage-step-state">{stageStateLabel(stage)}</span>
                      </span>
                    </div>
                  </Tooltip>
                ))}
              </div>
              {expandedStage && (
                <div className="rcm-active-stage">
                  <div className="rcm-active-stage-main">
                    <div className="rcm-active-stage-heading">
                      <span className="rcm-active-stage-index">{formatNumber(expandedStage.index + 1)}</span>
                      <span className="rcm-active-stage-title-copy">
                        <span className="rcm-active-stage-state">{stageStateLabel(expandedStage)}</span>
                        <span className="rcm-active-stage-title">{expandedStage.name}</span>
                      </span>
                    </div>
                    <div className="rcm-active-stage-description">{expandedStage.description}</div>
                    <div className="rcm-active-stage-progress-row">
                      <span><WebUIText textKey="Auto.Attr.ComponentsModalsReligionConversionModal.83.2" /></span>
                      <span>{formatPercent(expandedStage.progress * 100)}</span>
                    </div>
                    <div className="rcm-active-stage-progress">
                      <span style={{ transform: `scaleX(${clampUnit(expandedStage.progress)})` }} />
                    </div>
                    <div className="rcm-active-stage-remaining">
                      <span><WebUIText textKey="ReligionConversion.Remaining" /></span>
                      <span>{formatDuration(expandedStage.remainingDays)}</span>
                    </div>
                  </div>
                  <div className="rcm-active-stage-stats">
                    <div className="rcm-active-stage-stats-title"><WebUIText textKey="ReligionConversion.CurrentEffects" /></div>
                    {expandedStageEffects.map((line, index) => (
                      <div key={`${line.label}-${index}`} className="rcm-active-stage-stat">
                        <span className="rcm-active-stage-stat-label">{line.label}</span>
                        <span className="rcm-active-stage-stat-value" style={{ color: line.valueColor }}>{line.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {conversion && !conversion.state.active && (
            <div className="rcm-section">
              <div className="rcm-options-title"><WebUIText textKey="Auto.ComponentsModalsReligionConversionModal.87.4" /></div>
              <div className="rcm-options">
                {conversion.options.length === 0 ? (
                  <div className="rcm-empty"><WebUIText textKey="ReligionConversion.NoTargets" /></div>
                ) : conversion.options.map(option => (
                  <ReligionTooltip
                    key={option.key}
                    info={option.info}
                    position="left"
                    delay={200}
                    extraLines={[{
                      label: webUIText('Auto.ComponentsScreensReligionScreen.179.3'),
                      value: formatPercent(option.realmShare * 100),
                      valueColor: 'var(--gold)',
                    }]}
                  >
                    <button
                      type="button"
                      className={`rcm-option${option.key === selectedKey ? ' rcm-option--selected' : ''}`}
                      onMouseDown={() => setSelectedKey(option.key)}
                    >
                      <img src={option.iconPath} alt="" className="rcm-option-icon" draggable={false} />
                      <span className="rcm-option-copy">
                        <span className="rcm-option-name">{option.name}</span>
                        <span className="rcm-option-desc">{option.description}</span>
                      </span>
                      <span className="rcm-option-followers">{webUIText('Auto.Fix.Expr.componentsmodalsReligionConversionModal.94.1', { Value1: formatPercent(option.realmShare * 100) })}</span>
                    </button>
                  </ReligionTooltip>
                ))}
              </div>
            </div>
          )}
        </StyledScrollArea>

        {conversion && showFooter && (
          <div className="rcm-footer">
            {!conversion.state.active && (
              <GameButton variant="burgundy" onClick={handleStart} disabled={!canStart || submitting}>
                <WebUIText textKey="Auto.ComponentsModalsReligionConversionModal.100.5" />
              </GameButton>
            )}
            {conversion.state.active && (
              <button type="button" className="btn--outline rcm-cancel-button" onClick={handleCancel} disabled={submitting}>
                <WebUIText textKey="ReligionConversion.CancelConversion" />
              </button>
            )}
            {conversion.state.active && (conversion.state.canAdvance || conversion.state.canComplete) && (
              <GameButton variant="burgundy" onClick={handleAdvance} disabled={submitting}>
                {conversion.state.canComplete
                  ? <WebUIText textKey="ReligionConversion.CompleteConversion" />
                  : <WebUIText textKey="ReligionConversion.BeginStage" />}
              </GameButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

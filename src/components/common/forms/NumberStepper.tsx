import { memo, type KeyboardEvent, type MouseEvent } from 'react';
import { useWebUIText } from '../../../localization/WebUITextContext';
import {
  noteModifierKeysFromEvent,
  stepAmountFromEvent,
  stepAmountFromMultiplier,
  stepButtonLabel,
  useStepMultiplier,
} from '../../../utils/stepModifiers';
import { useSettingsBridge } from '../../../bridge/app/useSettingsBridge';
import { useActiveInputDevice } from '../../../hooks/useActiveInputDevice';
import { findActionBinding, formatActionBinding, stepModifiersHelpText } from '../../../utils/actionBindings';
import { ActionKeyGlyph } from '../ActionKeyGlyph';
import Tooltip from '../tooltips/Tooltip';
import './NumberStepper.css';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Fired for button clicks, Enter, and blur. Use this for committed quantities. */
  onCommit?: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  buttonDisabledClassName?: string;
  formatValue?: (value: number) => string;
  parseValue?: (value: string) => number;
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

function defaultParseValue(value: string): number {
  const parsed = Number(value.replace(/[^0-9-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function bounded(value: number, min: number | undefined, max: number | undefined): number {
  let next = Math.round(value);
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

const NumberStepper = memo(function NumberStepper({
  value,
  onChange,
  onCommit,
  step = 1,
  min = 0,
  max,
  disabled = false,
  className,
  inputClassName,
  buttonClassName,
  buttonDisabledClassName,
  formatValue = value => String(value),
  parseValue = defaultParseValue,
}: NumberStepperProps) {
  const t = useWebUIText();
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );
  const multiplier = useStepMultiplier();
  const effectiveStep = stepAmountFromMultiplier(multiplier, step);
  const decrementDisabled = disabled || (min !== undefined && value <= min);
  const incrementDisabled = disabled || (max !== undefined && value >= max);
  const batchBinding = findActionBinding(settings?.controls, 'IncreaseUnitProduction', activeInputDevice);
  const batchKey = formatActionBinding(settings?.controls, 'IncreaseUnitProduction', activeInputDevice);
  const modifierHintBody = stepModifiersHelpText(t, batchBinding ? '' : batchKey);
  const modifierHint = batchBinding
    ? (
        <>
          <div>{modifierHintBody}</div>
          <div className="tt-footer-shortcut-row">
            <span>{t('Common.StepModifiersBatchLabel')}</span>
            <ActionKeyGlyph binding={batchBinding} />
          </div>
        </>
      )
    : modifierHintBody;
  const decrementLabel = stepButtonLabel(-1, effectiveStep);
  const incrementLabel = stepButtonLabel(1, effectiveStep);

  const apply = (next: number, committed = false) => {
    if (disabled) return;
    const resolved = bounded(next, min, max);
    onChange(resolved);
    if (committed) onCommit?.(resolved);
  };

  const nudge = (event: MouseEvent<HTMLButtonElement>, direction: 1 | -1) => {
    event.preventDefault();
    apply(value + direction * stepAmountFromEvent(event, step), true);
  };

  const commitFromInput = (raw: string) => {
    apply(parseValue(raw), true);
  };

  return (
    <span
      className={classNames('number-stepper', className)}
      onPointerEnter={noteModifierKeysFromEvent}
      onPointerMove={noteModifierKeysFromEvent}
    >
      <Tooltip content={{ title: decrementLabel, body: modifierHint }} position="top" delay={200} wrapperClassName="number-stepper__tooltip">
        <button
          type="button"
          className={classNames('number-stepper__button', buttonClassName, decrementDisabled && 'number-stepper__button--disabled', decrementDisabled && buttonDisabledClassName)}
          disabled={decrementDisabled}
          onClick={(event) => {
            if (decrementDisabled) return;
            noteModifierKeysFromEvent(event);
            nudge(event, -1);
          }}
        >
          {decrementLabel}
        </button>
      </Tooltip>
      <input
        type="text"
        inputMode="numeric"
        className={classNames('number-stepper__input', inputClassName)}
        value={formatValue(value)}
        disabled={disabled}
        onChange={event => apply(parseValue(event.currentTarget.value))}
        onBlur={event => commitFromInput(event.currentTarget.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          commitFromInput(event.currentTarget.value);
          event.currentTarget.blur();
        }}
      />
      <Tooltip content={{ title: incrementLabel, body: modifierHint }} position="top" delay={200} wrapperClassName="number-stepper__tooltip">
        <button
          type="button"
          className={classNames('number-stepper__button', buttonClassName, incrementDisabled && 'number-stepper__button--disabled', incrementDisabled && buttonDisabledClassName)}
          disabled={incrementDisabled}
          onClick={(event) => {
            if (incrementDisabled) return;
            noteModifierKeysFromEvent(event);
            nudge(event, 1);
          }}
        >
          {incrementLabel}
        </button>
      </Tooltip>
    </span>
  );
});

export default NumberStepper;

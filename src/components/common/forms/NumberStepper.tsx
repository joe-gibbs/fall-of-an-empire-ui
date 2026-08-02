import { memo, type MouseEvent } from 'react';
import { useWebUIText } from '../../../localization/WebUITextContext';
import {
  noteModifierKeysFromEvent,
  stepAmountFromEvent,
  stepAmountFromMultiplier,
  stepButtonLabel,
  useStepMultiplier,
} from '../../../utils/stepModifiers';
import Tooltip from '../tooltips/Tooltip';
import './NumberStepper.css';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
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
  const multiplier = useStepMultiplier();
  const effectiveStep = stepAmountFromMultiplier(multiplier, step);
  const decrementDisabled = disabled || (min !== undefined && value <= min);
  const incrementDisabled = disabled || (max !== undefined && value >= max);
  const modifierHint = t('Common.StepModifiersBody');
  const decrementLabel = stepButtonLabel(-1, effectiveStep);
  const incrementLabel = stepButtonLabel(1, effectiveStep);

  const apply = (next: number) => {
    if (disabled) return;
    onChange(bounded(next, min, max));
  };

  const nudge = (event: MouseEvent<HTMLButtonElement>, direction: 1 | -1) => {
    event.preventDefault();
    apply(value + direction * stepAmountFromEvent(event, step));
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
          onMouseDown={(event) => {
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
        className={classNames('number-stepper__input', inputClassName)}
        value={formatValue(value)}
        disabled={disabled}
        onChange={event => apply(parseValue(event.currentTarget.value))}
      />
      <Tooltip content={{ title: incrementLabel, body: modifierHint }} position="top" delay={200} wrapperClassName="number-stepper__tooltip">
        <button
          type="button"
          className={classNames('number-stepper__button', buttonClassName, incrementDisabled && 'number-stepper__button--disabled', incrementDisabled && buttonDisabledClassName)}
          disabled={incrementDisabled}
          onMouseDown={(event) => {
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

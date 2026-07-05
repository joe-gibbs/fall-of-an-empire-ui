import { memo } from 'react';
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
  const decrementDisabled = disabled || (min !== undefined && value <= min);
  const incrementDisabled = disabled || (max !== undefined && value >= max);

  const apply = (next: number) => {
    if (disabled) return;
    onChange(bounded(next, min, max));
  };

  return (
    <span className={classNames('number-stepper', className)}>
      <button
        type="button"
        className={classNames('number-stepper__button', buttonClassName, decrementDisabled && 'number-stepper__button--disabled', decrementDisabled && buttonDisabledClassName)}
        disabled={decrementDisabled}
        onMouseDown={(event) => {
          event.preventDefault();
          apply(value - step);
        }}
      >
        -
      </button>
      <input
        type="text"
        className={classNames('number-stepper__input', inputClassName)}
        value={formatValue(value)}
        disabled={disabled}
        onChange={event => apply(parseValue(event.currentTarget.value))}
      />
      <button
        type="button"
        className={classNames('number-stepper__button', buttonClassName, incrementDisabled && 'number-stepper__button--disabled', incrementDisabled && buttonDisabledClassName)}
        disabled={incrementDisabled}
        onMouseDown={(event) => {
          event.preventDefault();
          apply(value + step);
        }}
      >
        +
      </button>
    </span>
  );
});

export default NumberStepper;

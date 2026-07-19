import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import './GameSlider.css';

interface GameSliderProps {
  ariaLabel: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  onChange: (value: number) => void;
}

const decimalPlaces = (value: number): number => {
  const text = value.toString();
  return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0;
};

export default function GameSlider({
  ariaLabel,
  value,
  minimum,
  maximum,
  step,
  onChange,
}: GameSliderProps) {
  const draggingPointer = useRef<number | null>(null);
  const percentage = ((value - minimum) / (maximum - minimum)) * 100;
  const thumbTransform = percentage <= 0
    ? 'translateX(0)'
    : percentage >= 100
      ? 'translateX(-100%)'
      : 'translateX(-50%)';

  const applyValue = (rawValue: number) => {
    const snapped = minimum + Math.round((rawValue - minimum) / step) * step;
    const precision = Math.max(decimalPlaces(step), decimalPlaces(minimum), decimalPlaces(maximum));
    onChange(Number(Math.min(maximum, Math.max(minimum, snapped)).toFixed(precision)));
  };

  const applyPointer = (clientX: number, track: HTMLDivElement) => {
    const bounds = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    applyValue(minimum + (maximum - minimum) * ratio);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    applyPointer(event.clientX, event.currentTarget);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingPointer.current !== event.pointerId) return;
    applyPointer(event.clientX, event.currentTarget);
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingPointer.current !== event.pointerId) return;
    draggingPointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      applyValue(value - step);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      applyValue(value + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      applyValue(minimum);
    } else if (event.key === 'End') {
      event.preventDefault();
      applyValue(maximum);
    }
  };

  return (
    <div
      className="game-slider"
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onKeyDown={onKeyDown}
    >
      <span className="game-slider__fill" style={{ width: `${percentage}%` }} />
      <span
        className="game-slider__thumb"
        style={{ left: `${percentage}%`, transform: thumbTransform }}
      />
    </div>
  );
}

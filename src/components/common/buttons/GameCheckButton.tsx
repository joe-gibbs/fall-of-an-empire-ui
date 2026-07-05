import type { ReactNode } from 'react';
import Tooltip, { type TooltipContent } from '../tooltips/Tooltip';
import './GameCheckButton.css';

interface GameCheckButtonProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
  tooltip?: ReactNode | TooltipContent;
  className?: string;
  disabled?: boolean;
}

export default function GameCheckButton({
  checked,
  label,
  onToggle,
  tooltip,
  className,
  disabled = false,
}: GameCheckButtonProps) {
  const button = (
    <button
      type="button"
      className={`game-check-button${checked ? ' game-check-button--active' : ''}${disabled ? ' game-check-button--disabled' : ''}${className ? ` ${className}` : ''}`}
      onMouseDown={() => { if (!disabled) onToggle(); }}
      aria-pressed={checked}
      disabled={disabled}
    >
      <span className="game-check-button__box" />
      <span className="game-check-button__label">{label}</span>
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip content={tooltip}>
      {button}
    </Tooltip>
  );
}

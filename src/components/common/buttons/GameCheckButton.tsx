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
  const control = (
    <label
      className={`game-check-button${checked ? ' game-check-button--active' : ''}${disabled ? ' game-check-button--disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <input
        className="game-check-button__input"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span className="game-check-button__label">{label}</span>
    </label>
  );

  if (!tooltip) return control;

  return (
    <Tooltip content={tooltip}>
      {control}
    </Tooltip>
  );
}

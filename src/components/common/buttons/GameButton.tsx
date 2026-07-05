import React, { type ReactNode } from 'react';
import { playSound } from '../../../hooks/useSound';

interface GameButtonProps {
  variant: 'burgundy' | 'outline' | 'ghost';
  fullWidth?: boolean;
  icon?: string;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  tutorialTarget?: string;
  ariaLabel?: string;
}

const GameButton: React.FC<GameButtonProps> = ({
  variant,
  fullWidth,
  icon,
  children,
  onClick,
  className,
  disabled,
  tutorialTarget,
  ariaLabel,
}) => {
  const hasContent = React.Children.count(children) > 0;

  return (
    <button
      className={`btn--${variant}${fullWidth ? ' btn--full' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      aria-label={ariaLabel}
      data-tutorial-target={tutorialTarget}
      onMouseDown={() => {
        if (disabled) return;
        playSound('click');
        onClick?.();
      }}
    >
      {icon && <img src={icon} className={`btn-icon${hasContent ? ' btn-icon--with-content' : ''}`} alt="" draggable={false} />}
      {hasContent && <span className="btn-content">{children}</span>}
    </button>
  );
};

export default React.memo(GameButton);

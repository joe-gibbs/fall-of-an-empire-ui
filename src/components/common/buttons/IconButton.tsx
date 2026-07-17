import React from 'react';
import { playSound } from '../../../hooks/useSound';
import { WebkilnAssetPath } from '../../../utils/assets';
import './IconButton.css';

interface IconButtonProps {
  icon?: string;
  label?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  tutorialTarget?: string;
  /** Numeric badge drawn on the top-right of the button. Falsy values hide it. */
  badge?: number;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  onClick,
  active = false,
  className = '',
  tutorialTarget,
  badge,
}) => {
  const resolvedIcon = icon ? WebkilnAssetPath(icon) : '';

  return (
    <button
      className={`icon-button ${active ? 'icon-button--active' : ''} ${className}`}
      data-tutorial-target={tutorialTarget}
      onMouseDown={() => { playSound('click'); onClick?.(); }}
    >
      {resolvedIcon ? (
        <img src={resolvedIcon} alt={label || ''} className="icon-button-icon" />
      ) : (
        <span className="icon-button-marker" />
      )}
      {badge ? (
        <span className="icon-button-badge">{badge > 99 ? '99+' : badge}</span>
      ) : null}
    </button>
  );
};

export default React.memo(IconButton);

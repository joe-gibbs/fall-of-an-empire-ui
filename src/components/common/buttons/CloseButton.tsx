import React from 'react';
import { playSound } from '../../../hooks/useSound';

import { webUIText } from '../../../localization/WebUITextContext';
interface CloseButtonProps {
  size?: 'sm' | 'md';
  onClick: () => void;
  className?: string;
}

const CloseButton: React.FC<CloseButtonProps> = ({ size = 'md', onClick, className }) => (
  <button
    className={`close-btn close-btn--${size}${className ? ` ${className}` : ''}`}
    onClick={() => { playSound('close'); onClick(); }}
    aria-label={webUIText('Auto.Attr.ComponentsCommonCloseButton.14.1')}
  >
    <img src="/assets/icons/I_Close.png" alt="" className="close-btn-icon" draggable={false} />
  </button>
);

export default React.memo(CloseButton);

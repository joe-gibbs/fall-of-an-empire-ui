import React, { useState, useCallback, useRef } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import SettingsPanel from '../../settings/SettingsPanel';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import './SettingsModal.css';

import { WebUIText } from '../../../localization/WebUITextContext';
interface SettingsModalProps {
  visible: boolean;
  onClosed: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClosed,
}) => {
  const [mounted, setMounted] = useState(visible);
  const [closeRequested, setCloseRequested] = useState(false);
  const overlayPointerDown = useRef(false);
  const closing = mounted && (!visible || closeRequested);

  if (visible && !mounted) {
    setMounted(true);
  }

  const animatedClose = useCallback(() => {
    if (closing) return;
    setCloseRequested(true);
  }, [closing]);
  useEscapeStackEntry({
    id: 'modal.settings',
    active: mounted,
    onClose: animatedClose,
    allowFromInput: true,
  });

  const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLDivElement>) => {
    if (!closing || e.animationName !== 'settings-modal-overlay-out') return;
    setMounted(false);
    setCloseRequested(false);
    onClosed();
  }, [closing, onClosed]);

  const handleOverlayMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    overlayPointerDown.current = e.target === e.currentTarget;
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !overlayPointerDown.current) return;
    overlayPointerDown.current = false;
    animatedClose();
  }, [animatedClose]);

  if (!mounted) return null;

  const overlayCls = closing
    ? 'settings-modal-overlay settings-modal-overlay--closing'
    : 'settings-modal-overlay';
  const modalCls = closing
    ? 'modal settings-modal settings-modal--closing'
    : 'modal settings-modal';

  return (
    <>

      <div
        className={overlayCls}
        onMouseDown={handleOverlayMouseDown}
        onClick={handleOverlayClick}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className={modalCls} onClick={e => e.stopPropagation()}>
          <div className="settings-modal__header">
            <span className="settings-modal__title"><WebUIText textKey="Auto.ComponentsScreensSettingsModal.145.1" /></span>
            <CloseButton size="sm" onClick={animatedClose} />
          </div>
          <div className="settings-modal__body">
            <SettingsPanel />
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsModal;

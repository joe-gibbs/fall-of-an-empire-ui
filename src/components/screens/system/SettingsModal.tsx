import React, { useCallback, useRef } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import SettingsPanel from '../../settings/SettingsPanel';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { UI_MOTION } from '../../../config/motion';
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
  const overlayPointerDown = useRef(false);
  // The close finishes on a timer matching the 220ms exit animation in SettingsModal.css.
  const {
    mounted,
    closing,
    close: animatedClose,
    stopPropagation,
  } = useModalPresence({
    open: visible,
    onClose: onClosed,
    escapeId: 'modal.settings',
    durationMs: UI_MOTION.panelCloseMs,
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const handleOverlayMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    overlayPointerDown.current = e.target === e.currentTarget;
    if (!overlayPointerDown.current) return;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    e.stopPropagation();
    if (!overlayPointerDown.current) return;
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
      >
        <div className={modalCls} onClick={stopPropagation}>
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

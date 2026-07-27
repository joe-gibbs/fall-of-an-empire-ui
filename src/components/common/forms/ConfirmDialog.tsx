import React, { useCallback, useState } from 'react';
import { playSound } from '../../../hooks/useSound';
import { useAnimatedPresence } from '../../../hooks/useAnimatedPresence';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import CloseButton from '../buttons/CloseButton';
import GameButton from '../buttons/GameButton';
import { webUIText } from '../../../localization/WebUITextContext';
import { UI_MOTION } from '../../../config/motion';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClosed: () => void;
  variant?: 'default' | 'danger';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = webUIText("Auto.Fix.Default.componentscommonConfirmDialog.25.1"),
  cancelText = webUIText("Auto.Fix.Default.componentscommonConfirmDialog.26.1"),
  onConfirm,
  onClosed,
  variant = 'default',
}) => {
  const [pressed, setPressed] = useState<'confirm' | 'cancel' | null>(null);
  const handleClosed = useCallback(() => {
    setPressed(null);
    onClosed();
  }, [onClosed]);
  const { mounted, closing, requestClose } = useAnimatedPresence(visible, {
    durationMs: UI_MOTION.panelCloseMs,
    onClosed: handleClosed,
  });

  const animatedClose = useCallback(
    (which: 'confirm' | 'cancel') => {
      if (closing) return;
      setPressed(which);
      requestClose(() => {
        setPressed(null);
        if (which === 'confirm') onConfirm();
        onClosed();
      });
    },
    [closing, onConfirm, onClosed, requestClose]
  );
  useEscapeStackEntry({
    id: 'modal.confirm-dialog',
    active: mounted,
    onClose: () => animatedClose('cancel'),
    allowFromInput: true,
  });

  if (!mounted) return null;

  const overlayCls = closing
    ? 'modal-overlay confirm-dialog-overlay confirm-dialog-overlay--closing'
    : 'modal-overlay confirm-dialog-overlay';
  const modalCls = closing
    ? 'modal confirm-dialog confirm-dialog--closing'
    : 'modal confirm-dialog';

  return (
    <div
      className={overlayCls}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        e.stopPropagation();
        animatedClose('cancel');
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >

      <div
        className={modalCls}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-title">{title}</span>
          <CloseButton size="sm" onClick={() => animatedClose('cancel')} />
        </div>

        <div className="confirm-dialog-body">{message}</div>

        <div className="confirm-dialog-actions">
          <div className={pressed === 'cancel' ? 'pressed' : undefined}>
            <GameButton variant="outline" onClick={() => animatedClose('cancel')}>
              {cancelText}
            </GameButton>
          </div>
          {variant === 'danger' ? (
            <button
              className={`btn--danger${pressed === 'confirm' ? ' pressed' : ''}`}
              onMouseDown={() => { playSound('error'); animatedClose('confirm'); }}
            >
              {confirmText}
            </button>
          ) : (
            <div className={pressed === 'confirm' ? 'pressed' : undefined}>
              <GameButton variant="burgundy" onClick={() => animatedClose('confirm')}>
                {confirmText}
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

import React, { useCallback, useId, useState } from 'react';
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
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  onClosed: () => void;
  variant?: 'default' | 'danger';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = webUIText("Common.Confirm"),
  cancelText = webUIText("Common.Cancel"),
  onConfirm,
  confirmDisabled = false,
  onClosed,
  variant = 'default',
}) => {
  const dialogId = useId();
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
      if (closing || (which === 'confirm' && confirmDisabled)) return;
      setPressed(which);
      requestClose(() => {
        setPressed(null);
        if (which === 'confirm') onConfirm();
        onClosed();
      });
    },
    [closing, confirmDisabled, onConfirm, onClosed, requestClose]
  );
  useEscapeStackEntry({
    id: `modal.confirm-dialog:${dialogId}`,
    orderKey: `${dialogId}:${title}`,
    active: mounted,
    onClose: () => animatedClose('cancel'),
    onConfirm: () => { if (variant === 'danger') playSound('error'); animatedClose('confirm'); },
    canConfirm: visible && !closing && !confirmDisabled,
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
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        e.stopPropagation();
        animatedClose('cancel');
      }}
    >

      <div
        className={modalCls}
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
              disabled={closing || confirmDisabled}
              className={`btn--danger${pressed === 'confirm' ? ' pressed' : ''}`}
              onClick={() => { playSound('error'); animatedClose('confirm'); }}
            >
              {confirmText}
            </button>
          ) : (
            <div className={pressed === 'confirm' ? 'pressed' : undefined}>
              <GameButton variant="burgundy" disabled={closing || confirmDisabled} onClick={() => animatedClose('confirm')}>
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

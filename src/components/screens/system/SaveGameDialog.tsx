import React, { useState, useRef, useEffect, useCallback } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import { useModalPresence } from '../../../hooks/useModalPresence';
import './SaveGameDialog.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface SaveGameDialogProps {
  visible: boolean;
  mode: 'save' | 'rename' | 'saveAndQuit';
  suggestedName: string;
  onConfirm: (name: string) => void;
  onClosed: () => void;
}

const CLOSE_MS = 200;

const SaveGameDialog: React.FC<SaveGameDialogProps> = ({
  visible,
  mode,
  suggestedName,
  onConfirm,
  onClosed,
}) => {
  const [name, setName] = useState(suggestedName);
  const [nameSource, setNameSource] = useState({ visible, suggestedName });
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    mounted,
    closing,
    close: animatedClose,
    requestClose,
    stopPropagation,
  } = useModalPresence({
    open: visible,
    onClose: onClosed,
    escapeId: 'modal.save-game',
    durationMs: CLOSE_MS,
    allowFromInput: true,
    closeStrategy: 'request',
  });

  if (visible !== nameSource.visible || (visible && suggestedName !== nameSource.suggestedName)) {
    setNameSource({ visible, suggestedName });
    if (visible) setName(suggestedName);
  }

  // Focus input on mount
  useEffect(() => {
    if (mounted && !closing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [mounted, closing]);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || closing) return;
    requestClose(() => onConfirm(trimmed));
  }, [closing, name, onConfirm, requestClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') animatedClose();
  };

  if (!mounted) return null;

  const title = mode === 'saveAndQuit'
    ? webUIText("Auto.ComponentsScreensPauseMenu.309.7")
    : mode === 'save'
      ? webUIText("Auto.Fix.VarExprTrue.componentsscreensSaveGameDialog.70.1")
      : webUIText("Auto.Fix.VarExprFalse.componentsscreensSaveGameDialog.70.1");
  const confirmLabel = mode === 'saveAndQuit'
    ? webUIText("Auto.ComponentsScreensPauseMenu.309.7")
    : mode === 'save'
      ? webUIText("Auto.Fix.VarExprTrue.componentsscreensSaveGameDialog.71.1")
      : webUIText("Auto.Fix.VarExprFalse.componentsscreensSaveGameDialog.71.1");

  const overlayCls = closing
    ? 'save-dialog-overlay save-dialog-overlay--closing'
    : 'save-dialog-overlay';
  const modalCls = closing
    ? 'modal save-dialog save-dialog--closing'
    : 'modal save-dialog';

  return (
    <>

      <div
        className={overlayCls}
        onMouseDown={event => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          event.stopPropagation();
          animatedClose();
        }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div className={modalCls} onMouseDown={stopPropagation} onClick={stopPropagation}>
          <div className="save-dialog__header">
            <span className="save-dialog__title">{title}</span>
            <CloseButton size="sm" onClick={animatedClose} />
          </div>

          <div className="save-dialog__body">
            <div className="save-dialog__label"><WebUIText textKey="Auto.ComponentsScreensSaveGameDialog.197.1" /></div>
            <input
              ref={inputRef}
              className="save-dialog__input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={120}
            />
          </div>

          <div className="save-dialog__actions">
            <GameButton variant="outline" onClick={animatedClose}><WebUIText textKey="Auto.ComponentsScreensSaveGameDialog.210.2" /></GameButton>
            <GameButton variant="burgundy" onClick={handleSubmit}>{confirmLabel}</GameButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default SaveGameDialog;

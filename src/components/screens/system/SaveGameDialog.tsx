import React, { useState, useRef, useEffect, useCallback } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { UI_MOTION } from '../../../config/motion';
import './SaveGameDialog.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface SaveGameDialogProps {
  visible: boolean;
  mode: 'save' | 'rename' | 'renameGroup' | 'saveAndQuit';
  suggestedName: string;
  onConfirm: (name: string) => void;
  onClosed: () => void;
}

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
    durationMs: UI_MOTION.subviewCloseMs,
    allowFromInput: true,
    closeStrategy: 'request',
  });

  if (visible !== nameSource.visible || (visible && suggestedName !== nameSource.suggestedName)) {
    setNameSource({ visible, suggestedName });
    if (visible) setName(suggestedName);
  }

  // Focus input on mount. If the previous save name ends in a number, select
  // just that number so the next save is a single keystroke.
  useEffect(() => {
    if (mounted && !closing) {
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        const match = /(\d+)\s*$/.exec(suggestedName);
        if (mode === 'save' && match && match.index != null) {
          input.setSelectionRange(match.index, suggestedName.length);
        } else {
          input.select();
        }
      });
    }
  }, [mounted, closing, mode, suggestedName]);

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
      ? webUIText("SaveGame.SaveGame")
      : mode === 'renameGroup'
        ? webUIText("LoadGame.RenameGroupTitle")
        : webUIText("SaveGame.RenameSave");
  const confirmLabel = mode === 'saveAndQuit'
    ? webUIText("Auto.ComponentsScreensPauseMenu.309.7")
    : mode === 'save'
      ? webUIText("SaveGame.Save")
      : webUIText("SaveGame.Rename");
  const nameLabel = mode === 'renameGroup'
    ? webUIText("SaveGame.GroupName")
    : webUIText("Auto.ComponentsScreensSaveGameDialog.197.1");

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
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          event.stopPropagation();
          animatedClose();
        }}
      >
        <div className={modalCls} onClick={stopPropagation}>
          <div className="save-dialog__header">
            <span className="save-dialog__title">{title}</span>
            <CloseButton size="sm" onClick={animatedClose} />
          </div>

          <div className="save-dialog__body">
            <div className="save-dialog__label">{nameLabel}</div>
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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { playSound } from '../../../hooks/useSound';
import SaveGameDialog from './SaveGameDialog';
import LoadGameModal from './LoadGameModal';
import SettingsModal from './SettingsModal';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import { useGameActions } from '../../../context/GameContext';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { UI_MOTION } from '../../../config/motion';
import './PauseMenu.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface PauseMenuProps {
  visible: boolean;
  onClosed: () => void;
}

type SaveDialogMode = 'save' | 'saveAndQuit';
interface OverwriteTarget {
  name: string;
  slotName: string;
}
type SaveResult =
  | { saved: true }
  | { saved: false; failureReason: string };

const PauseMenu: React.FC<PauseMenuProps> = ({ visible, onClosed }) => {
  const { resetAdvisorHints } = useGameActions();
  const [showSave, setShowSave] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<SaveDialogMode>('save');
  const [showLoad, setShowLoad] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetHintsConfirm, setShowResetHintsConfirm] = useState(false);
  const [overwriteTarget, setOverwriteTarget] = useState<OverwriteTarget | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [suggestedName, setSuggestedName] = useState('');
  const [gameOver, setGameOver] = useState(true);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const closeChildModals = useCallback(() => {
    setShowSave(false);
    setShowLoad(false);
    setShowSettings(false);
    setOverwriteTarget(null);
  }, []);

  const handleAfterClosed = useCallback(() => {
    closeChildModals();
    setShowResetHintsConfirm(false);
    setGameOver(true);
    onClosed();
  }, [closeChildModals, onClosed]);

  const {
    mounted,
    closing,
    close: handleClose,
    stopPropagation,
  } = useModalPresence({
    open: visible,
    onClose: handleAfterClosed,
    escapeId: 'ui.pause-menu',
    durationMs: UI_MOTION.pauseMenuCloseMs,
    closeStrategy: 'request',
    onBeforeClose: closeChildModals,
  });

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const state = await bridgeCall('game.get_game_state');
        const date = `${state.day}/${state.month}/${state.year}`;
        if (cancelled) return;
        setGameOver(state.gameOver);
        setSuggestedName(date);

        const faction = await bridgeCall('game.get_player_faction');
        if (!cancelled && faction.name) setSuggestedName(`${faction.name} - ${date}`);
      } catch {
        if (!cancelled) setSuggestedName('');
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const showStatus = useCallback((msg: string, isError = false) => {
    setStatusMsg(msg);
    setStatusIsError(isError);
    clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMsg(null), isError ? 8000 : 2800);
  }, []);

  const saveGame = useCallback(async (displayName: string, existingSlotName = ''): Promise<SaveResult> => {
    try {
      const res = await bridgeCall('game.save_game', { displayName, existingSlotName });
      return res.saved
        ? { saved: true }
        : { saved: false, failureReason: res.failureReason };
    } catch (err) {
      console.error('[PauseMenu] save failed', err);
      return {
        saved: false,
        failureReason: err instanceof Error ? err.message : String(err),
      };
    }
  }, []);

  const showSaveFailure = useCallback((failureReason: string) => {
    showStatus(webUIText('PauseMenu.SaveFailedReason', { Reason: failureReason }), true);
  }, [showStatus]);

  const openSaveDialog = useCallback((mode: SaveDialogMode) => {
    setSaveDialogMode(mode);
    setShowSave(true);
  }, []);

  const handleSaveConfirm = useCallback(async (name: string, existingSlotName = '') => {
    setShowSave(false);
    const result = await saveGame(name, existingSlotName);
    if (result.saved) {
      showStatus(webUIText('PauseMenu.GameSaved'));
    } else {
      showSaveFailure(result.failureReason);
    }
  }, [saveGame, showSaveFailure, showStatus]);

  const handleSaveAndQuitConfirm = useCallback(async (name: string, existingSlotName = '') => {
    setShowSave(false);
    const result = await saveGame(name, existingSlotName);
    if (!result.saved) {
      showSaveFailure(result.failureReason);
      return;
    }
    try {
      await bridgeCall('game.return_to_main_menu');
    } catch (err) {
      console.error('[PauseMenu] return to main menu failed', err);
    }
  }, [saveGame, showSaveFailure]);

  const completeSave = useCallback((name: string, existingSlotName = '') => {
    if (saveDialogMode === 'saveAndQuit') {
      void handleSaveAndQuitConfirm(name, existingSlotName);
      return;
    }
    void handleSaveConfirm(name, existingSlotName);
  }, [handleSaveAndQuitConfirm, handleSaveConfirm, saveDialogMode]);

  const handleSaveDialogConfirm = useCallback(async (name: string) => {
    setShowSave(false);
    try {
      const { saves } = await bridgeCall('game.list_saves');
      const normalisedName = name.toLocaleLowerCase();
      const existing = saves
        .filter(save => (
          !save.isAutosave
          && save.displayName.trim().toLocaleLowerCase() === normalisedName
        ))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      if (existing) {
        setOverwriteTarget({ name, slotName: existing.slotName });
        return;
      }
      completeSave(name);
    } catch (err) {
      console.error('[PauseMenu] failed to check existing saves', err);
      showSaveFailure(err instanceof Error ? err.message : String(err));
    }
  }, [completeSave, showSaveFailure]);

  const confirmOverwrite = useCallback(() => {
    if (!overwriteTarget) return;
    completeSave(overwriteTarget.name, overwriteTarget.slotName);
  }, [completeSave, overwriteTarget]);

  const handleExitToDesktop = useCallback(async () => {
    try {
      await bridgeCall('game.quit');
    } catch (err) {
      console.error('[PauseMenu] quit failed', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(statusTimerRef.current);
    };
  }, []);

  if (!mounted) return null;

  const cls = closing ? 'pause-overlay pause-overlay--closing' : 'pause-overlay';

  return (
    <>

      <div className={cls} onClick={handleClose}>
        <h2 className="pause-overlay__title"><WebUIText textKey="Auto.ComponentsScreensPauseMenu.298.1" /></h2>

        <nav className="pause-overlay__items" onClick={stopPropagation}>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); handleClose(); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.301.2" /></button>
          <button className="pause-overlay__item" disabled={gameOver} onClick={() => { playSound('click'); openSaveDialog('save'); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.302.3" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); setShowLoad(true); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.303.4" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); setShowResetHintsConfirm(true); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.304.5" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); setShowSettings(true); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.305.6" /></button>

          <div className="pause-overlay__separator" />

          <button className="pause-overlay__item" disabled={gameOver} onClick={() => { playSound('click'); openSaveDialog('saveAndQuit'); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.309.7" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); void handleExitToDesktop(); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.310.8" /></button>
        </nav>

        {statusMsg && (
          <div
            className={statusIsError ? 'pause-overlay__status pause-overlay__status--error' : 'pause-overlay__status'}
            key={statusMsg}
          >
            <span className="pause-overlay__status-rule" />
            <span>{statusMsg}</span>
            <span className="pause-overlay__status-rule" />
          </div>
        )}
      </div>

      <SaveGameDialog
        visible={showSave && !gameOver}
        mode={saveDialogMode}
        suggestedName={suggestedName}
        onConfirm={handleSaveDialogConfirm}
        onClosed={() => setShowSave(false)}
      />

      <LoadGameModal
        visible={showLoad}
        onClosed={() => setShowLoad(false)}
        warnBeforeLoad
      />

      <SettingsModal
        visible={showSettings}
        onClosed={() => setShowSettings(false)}
      />

      <ConfirmDialog
        visible={overwriteTarget !== null && !gameOver}
        title={webUIText('PauseMenu.OverwriteSaveTitle')}
        message={overwriteTarget ? webUIText('PauseMenu.OverwriteSaveMessage', { SaveName: overwriteTarget.name }) : ''}
        confirmText={webUIText('PauseMenu.OverwriteSaveConfirm')}
        cancelText={webUIText('Common.Cancel')}
        onConfirm={confirmOverwrite}
        onClosed={() => setOverwriteTarget(null)}
      />

      <ConfirmDialog
        visible={showResetHintsConfirm}
        title={webUIText('Auto.Attr.ComponentsScreensPauseMenu.343.1')}
        message={webUIText('Auto.ExtraAttr.ComponentsScreensPauseMenu.344.1')}
        confirmText={webUIText('Auto.ExtraAttr.ComponentsScreensPauseMenu.345.2')}
        cancelText={webUIText('Auto.ExtraAttr.ComponentsScreensPauseMenu.346.3')}
        onConfirm={resetAdvisorHints}
        onClosed={() => setShowResetHintsConfirm(false)}
      />
    </>
  );
};

export default PauseMenu;

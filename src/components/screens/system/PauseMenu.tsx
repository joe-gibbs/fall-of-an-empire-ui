import React, { useState, useCallback, useEffect, useRef } from 'react';
import { playSound } from '../../../hooks/useSound';
import SaveGameDialog from './SaveGameDialog';
import LoadGameModal from './LoadGameModal';
import SettingsModal from './SettingsModal';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import { useGameActions } from '../../../context/GameContext';
import { bridgeCall, onBridgeEvent, type SaveGameResponse } from '../../../bridge-types.generated.ts';
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
type ChildDialog =
  | { kind: 'save'; mode: SaveDialogMode }
  | { kind: 'overwrite'; mode: SaveDialogMode; target: OverwriteTarget }
  | { kind: 'load' }
  | { kind: 'settings' }
  | { kind: 'resetHints' }
  | { kind: 'returnToMenu' };
type ChildDialogKind = ChildDialog['kind'];

let nextSaveRequestId = 1;

const PauseMenu: React.FC<PauseMenuProps> = ({ visible, onClosed }) => {
  const { resetAdvisorHints } = useGameActions();
  const [childDialog, setChildDialog] = useState<ChildDialog | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [suggestedName, setSuggestedName] = useState('');
  const [gameOver, setGameOver] = useState(true);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const closeChildModals = useCallback(() => {
    setChildDialog(null);
  }, []);

  // A child dialog reports its close after its exit animation, by which time another dialog may be open.
  const closeChildDialog = useCallback((kind: ChildDialogKind) => {
    setChildDialog(current => (current?.kind === kind ? null : current));
  }, []);

  const handleAfterClosed = useCallback(() => {
    closeChildModals();
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
        let nextName = date;

        const faction = await bridgeCall('game.get_player_faction');
        if (cancelled) return;
        if (faction.name) nextName = `${faction.name} - ${date}`;

        const { saves } = await bridgeCall('game.list_saves');
        if (cancelled) return;
        const latestManual = saves
          .filter(save => (
            !save.isAutosave
            && !!save.displayName
            && (!state.playthroughId || save.playthroughId === state.playthroughId)
          ))
          .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))[0];
        if (latestManual?.displayName) nextName = latestManual.displayName;
        setSuggestedName(nextName);
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
    let unsubscribe: (() => void) | undefined;
    const requestId = nextSaveRequestId++;
    try {
      // The game writes the save on a worker thread and pushes the result when it is on disk.
      const written = new Promise<SaveGameResponse>(resolve => {
        unsubscribe = onBridgeEvent('game.save_game', result => {
          if (result.requestId === requestId) resolve(result);
        });
      });
      const accepted = await bridgeCall('game.save_game', { displayName, existingSlotName, requestId });
      const res = accepted.pending ? await written : accepted;
      return res.saved
        ? { saved: true }
        : { saved: false, failureReason: res.failureReason };
    } catch (err) {
      console.error('[PauseMenu] save failed', err);
      return {
        saved: false,
        failureReason: err instanceof Error ? err.message : String(err),
      };
    } finally {
      unsubscribe?.();
    }
  }, []);

  const showSaveFailure = useCallback((failureReason: string) => {
    showStatus(webUIText('PauseMenu.SaveFailedReason', { Reason: failureReason }), true);
  }, [showStatus]);

  const openSaveDialog = useCallback((mode: SaveDialogMode) => {
    setChildDialog({ kind: 'save', mode });
  }, []);

  const handleSaveConfirm = useCallback(async (name: string, existingSlotName = '') => {
    const result = await saveGame(name, existingSlotName);
    if (result.saved) {
      setSuggestedName(name);
      showStatus(webUIText('PauseMenu.GameSaved'));
    } else {
      showSaveFailure(result.failureReason);
    }
  }, [saveGame, showSaveFailure, showStatus]);

  const handleReturnToMainMenu = useCallback(async () => {
    try {
      await bridgeCall('game.return_to_main_menu');
    } catch (err) {
      console.error('[PauseMenu] return to main menu failed', err);
    }
  }, []);

  const handleSaveAndQuitConfirm = useCallback(async (name: string, existingSlotName = '') => {
    const result = await saveGame(name, existingSlotName);
    if (!result.saved) {
      showSaveFailure(result.failureReason);
      return;
    }
    await handleReturnToMainMenu();
  }, [handleReturnToMainMenu, saveGame, showSaveFailure]);

  const completeSave = useCallback((mode: SaveDialogMode, name: string, existingSlotName = '') => {
    setChildDialog(null);
    if (mode === 'saveAndQuit') {
      void handleSaveAndQuitConfirm(name, existingSlotName);
      return;
    }
    void handleSaveConfirm(name, existingSlotName);
  }, [handleSaveAndQuitConfirm, handleSaveConfirm]);

  const handleSaveDialogConfirm = useCallback(async (mode: SaveDialogMode, name: string) => {
    setChildDialog(null);
    try {
      const [{ saves }, state] = await Promise.all([
        bridgeCall('game.list_saves'),
        bridgeCall('game.get_game_state'),
      ]);
      const normalisedName = name.toLocaleLowerCase();
      const existing = saves
        .filter(save => (
          !save.isAutosave
          && save.displayName.trim().toLocaleLowerCase() === normalisedName
          && (!state.playthroughId || save.playthroughId === state.playthroughId)
        ))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      if (existing) {
        setChildDialog({ kind: 'overwrite', mode, target: { name, slotName: existing.slotName } });
        return;
      }
      completeSave(mode, name);
    } catch (err) {
      console.error('[PauseMenu] failed to check existing saves', err);
      showSaveFailure(err instanceof Error ? err.message : String(err));
    }
  }, [completeSave, showSaveFailure]);

  const overwriteDialog = childDialog?.kind === 'overwrite' ? childDialog : null;
  const confirmOverwrite = useCallback(() => {
    if (!overwriteDialog) return;
    completeSave(overwriteDialog.mode, overwriteDialog.target.name, overwriteDialog.target.slotName);
  }, [completeSave, overwriteDialog]);

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

  const saveDialogMode: SaveDialogMode = childDialog?.kind === 'save' || childDialog?.kind === 'overwrite' ? childDialog.mode : 'save';

  const cls = closing ? 'pause-overlay pause-overlay--closing' : 'pause-overlay';

  return (
    <>

      <div className={cls} onClick={handleClose}>
        <h2 className="pause-overlay__title"><WebUIText textKey="Auto.ComponentsScreensPauseMenu.298.1" /></h2>

        <nav className="pause-overlay__items" onClick={stopPropagation}>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); handleClose(); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.301.2" /></button>
          <button className="pause-overlay__item" disabled={gameOver} onClick={() => { playSound('click'); openSaveDialog('save'); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.302.3" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); setChildDialog({ kind: 'load' }); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.303.4" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); setChildDialog({ kind: 'resetHints' }); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.304.5" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); setChildDialog({ kind: 'settings' }); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.305.6" /></button>

          <div className="pause-overlay__separator" />

          <button className="pause-overlay__item" disabled={gameOver} onClick={() => { playSound('click'); openSaveDialog('saveAndQuit'); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.309.7" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); setChildDialog({ kind: 'returnToMenu' }); }}><WebUIText textKey="PauseMenu.ReturnToMenuWithoutSaving" /></button>
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
        visible={childDialog?.kind === 'save' && !gameOver}
        mode={saveDialogMode}
        suggestedName={suggestedName}
        onConfirm={name => { void handleSaveDialogConfirm(saveDialogMode, name); }}
        onClosed={() => closeChildDialog('save')}
      />

      <LoadGameModal
        visible={childDialog?.kind === 'load'}
        onClosed={() => closeChildDialog('load')}
        warnBeforeLoad
      />

      <SettingsModal
        visible={childDialog?.kind === 'settings'}
        onClosed={() => closeChildDialog('settings')}
      />

      <ConfirmDialog
        visible={overwriteDialog !== null && !gameOver}
        title={webUIText('PauseMenu.OverwriteSaveTitle')}
        message={overwriteDialog ? webUIText('PauseMenu.OverwriteSaveMessage', { SaveName: overwriteDialog.target.name }) : ''}
        confirmText={webUIText('PauseMenu.OverwriteSaveConfirm')}
        cancelText={webUIText('Common.Cancel')}
        onConfirm={confirmOverwrite}
        onClosed={() => closeChildDialog('overwrite')}
      />

      <ConfirmDialog
        visible={childDialog?.kind === 'resetHints'}
        title={webUIText('Auto.Attr.ComponentsScreensPauseMenu.343.1')}
        message={webUIText('Auto.ExtraAttr.ComponentsScreensPauseMenu.344.1')}
        confirmText={webUIText('Auto.ExtraAttr.ComponentsScreensPauseMenu.345.2')}
        cancelText={webUIText('Auto.ExtraAttr.ComponentsScreensPauseMenu.346.3')}
        onConfirm={resetAdvisorHints}
        onClosed={() => closeChildDialog('resetHints')}
      />

      <ConfirmDialog
        visible={childDialog?.kind === 'returnToMenu'}
        title={webUIText('PauseMenu.ReturnToMenuTitle')}
        message={webUIText('PauseMenu.ReturnToMenuMessage')}
        confirmText={webUIText('PauseMenu.ReturnToMenuConfirm')}
        cancelText={webUIText('Common.Cancel')}
        onConfirm={() => { void handleReturnToMainMenu(); }}
        onClosed={() => closeChildDialog('returnToMenu')}
      />
    </>
  );
};

export default PauseMenu;

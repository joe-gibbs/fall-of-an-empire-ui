import React, { useState, useCallback, useEffect, useRef } from 'react';
import { playSound } from '../../../hooks/useSound';
import SaveGameDialog from './SaveGameDialog';
import LoadGameModal from './LoadGameModal';
import SettingsModal from './SettingsModal';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import { useGameActions } from '../../../context/GameContext';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { useModalPresence } from '../../../hooks/useModalPresence';
import './PauseMenu.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface PauseMenuProps {
  visible: boolean;
  onClosed: () => void;
}

const CLOSE_DURATION = 280;
type SaveDialogMode = 'save' | 'saveAndQuit';
interface OverwriteTarget {
  name: string;
  slotName: string;
}

const PauseMenu: React.FC<PauseMenuProps> = ({ visible, onClosed }) => {
  const { resetAdvisorHints } = useGameActions();
  const [showSave, setShowSave] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<SaveDialogMode>('save');
  const [showLoad, setShowLoad] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetHintsConfirm, setShowResetHintsConfirm] = useState(false);
  const [overwriteTarget, setOverwriteTarget] = useState<OverwriteTarget | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState('');
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
    durationMs: CLOSE_DURATION,
    closeStrategy: 'request',
    onBeforeClose: closeChildModals,
  });

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const faction = await bridgeCall('game.get_player_faction');
        const state = await bridgeCall('game.get_game_state');
        const date = `${state.day}/${state.month}/${state.year}`;
        if (!cancelled) setSuggestedName(faction.name ? `${faction.name} - ${date}` : date);
      } catch {
        if (!cancelled) setSuggestedName('');
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const showStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMsg(null), 2800);
  }, []);

  const saveGame = useCallback(async (displayName: string, existingSlotName = ''): Promise<boolean> => {
    try {
      const res = await bridgeCall('game.save_game', { displayName, existingSlotName });
      return res.saved;
    } catch (err) {
      console.error('[PauseMenu] save failed', err);
      return false;
    }
  }, []);

  const openSaveDialog = useCallback((mode: SaveDialogMode) => {
    setSaveDialogMode(mode);
    setShowSave(true);
  }, []);

  const handleSaveConfirm = useCallback(async (name: string, existingSlotName = '') => {
    setShowSave(false);
    const saved = await saveGame(name, existingSlotName);
    showStatus(webUIText(saved ? 'PauseMenu.GameSaved' : 'PauseMenu.SaveFailed'));
  }, [saveGame, showStatus]);

  const handleSaveAndQuitConfirm = useCallback(async (name: string, existingSlotName = '') => {
    setShowSave(false);
    const saved = await saveGame(name, existingSlotName);
    if (!saved) {
      showStatus(webUIText('PauseMenu.SaveFailed'));
      return;
    }
    try {
      await bridgeCall('game.return_to_main_menu');
    } catch (err) {
      console.error('[PauseMenu] return to main menu failed', err);
    }
  }, [saveGame, showStatus]);

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
      showStatus(webUIText('PauseMenu.SaveFailed'));
    }
  }, [completeSave, showStatus]);

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
          <button className="pause-overlay__item" onMouseDown={() => { playSound('click'); handleClose(); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.301.2" /></button>
          <button className="pause-overlay__item" onMouseDown={() => { playSound('click'); openSaveDialog('save'); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.302.3" /></button>
          <button className="pause-overlay__item" onMouseDown={() => { playSound('click'); setShowLoad(true); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.303.4" /></button>
          <button className="pause-overlay__item" onMouseDown={() => { playSound('click'); setShowResetHintsConfirm(true); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.304.5" /></button>
          <button className="pause-overlay__item" onMouseDown={() => { playSound('click'); setShowSettings(true); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.305.6" /></button>

          <div className="pause-overlay__separator" />

          <button className="pause-overlay__item" onMouseDown={() => { playSound('click'); openSaveDialog('saveAndQuit'); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.309.7" /></button>
          <button className="pause-overlay__item" onClick={() => { playSound('click'); void handleExitToDesktop(); }}><WebUIText textKey="Auto.ComponentsScreensPauseMenu.310.8" /></button>
        </nav>

        {statusMsg && (
          <div className="pause-overlay__status" key={statusMsg}>
            <span className="pause-overlay__status-rule" />
            <span>{statusMsg}</span>
            <span className="pause-overlay__status-rule" />
          </div>
        )}
      </div>

      <SaveGameDialog
        visible={showSave}
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
        visible={overwriteTarget !== null}
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

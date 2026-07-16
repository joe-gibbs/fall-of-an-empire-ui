import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import FactionRoundel from '../../common/entities/FactionRoundel';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import VirtualList from '../../common/layout/scrolling/VirtualList';
import { useSavesBridge, type SaveEntry } from '../../../bridge/app/useSavesBridge';
import { toRootRem } from '../../../utils/cssUnits';
import { useModalPresence } from '../../../hooks/useModalPresence';
import './LoadGameModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
const CLOSE_MS = 220;
const FADE_MS = 160;
const SLIDE_MS = 220;
const LOAD_DEPARTURE_MS = 220;

function cleanName(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  if (value === 'None') return undefined;
  return value;
}

function displayNameFor(save: SaveEntry): string {
  if (save.displayName) return save.displayName;
  if (save.isAutosave) return webUIText('MainMenu.Autosave');
  if (save.playerCharacterName && save.playerFactionName) {
    return webUIText('MainMenu.SaveNameOf', { Character: save.playerCharacterName, Faction: save.playerFactionName });
  }
  return save.slotName;
}

function formatSaveTimestamp(isoTimestamp: string): string {
  if (!isoTimestamp) return '';
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return isoTimestamp;
  const y = String(parsed.getFullYear());
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

interface SaveEntryProps {
  save: SaveEntry;
  index: number;
  removing: boolean;
  loading: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onLoad: () => void;
  onDelete: () => void;
}

const SaveEntryRow: React.FC<SaveEntryProps> = ({ save, index, removing, loading, registerRef, onLoad, onDelete }) => {
  const emblem = cleanName(save.factionEmblem);
  const culture = cleanName(save.cultureGroup);
  const primary = save.factionColour || '#4a1530';
  const secondary = save.factionSecondaryColour || '#c9a84c';
  const character = save.playerCharacterName;
  const faction = save.playerFactionName;
  const metadata = character && faction ? `${character} - ${faction}` : '';

  return (
    <div
      ref={registerRef}
      className={`save-entry${removing ? ' save-entry--removing' : ''}`}
      style={removing ? undefined : { animationDelay: `${0.05 + index * 0.04}s` }}
      onDoubleClick={removing || loading ? undefined : onLoad}
    >
      <div className="save-entry__roundel">
        <FactionRoundel
          colour={primary}
          secondaryColour={secondary}
          emblem={emblem}
          cultureGroup={culture}
          name={faction}
          size="md"
          showRing
        />
      </div>
      <div className="save-entry__info">
        <div className="save-entry__display-name">{displayNameFor(save)}</div>
        {metadata && <div className="save-entry__meta">{metadata}</div>}
        <div className="save-entry__dates">
          {save.gameDateString && <span className="save-entry__game-date">{save.gameDateString}</span>}
          {save.isAutosave && <span className="save-entry__autosave"><WebUIText textKey="Auto.ComponentsScreensLoadGameModal.92.1" /></span>}
        </div>
        <div className="save-entry__save-date">{formatSaveTimestamp(save.timestamp)}</div>
      </div>
      <div className="save-entry__actions">
        <GameButton variant="burgundy" onClick={onLoad} disabled={loading}><WebUIText textKey="Auto.ComponentsScreensLoadGameModal.97.2" /></GameButton>
        <GameButton variant="ghost" onClick={onDelete} disabled={loading}><WebUIText textKey="Auto.ComponentsScreensLoadGameModal.98.3" /></GameButton>
      </div>
    </div>
  );
};

interface LoadGameModalProps {
  visible: boolean;
  onClosed: () => void;
  warnBeforeLoad?: boolean;
}

const LoadGameModal: React.FC<LoadGameModalProps> = ({ visible, onClosed, warnBeforeLoad = false }) => {
  const [deleteTarget, setDeleteTarget] = useState<SaveEntry | null>(null);
  const [loadTarget, setLoadTarget] = useState<SaveEntry | null>(null);
  const [removingSlot, setRemovingSlot] = useState<string | null>(null);
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  const [departingForLoad, setDepartingForLoad] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const handleClosed = useCallback(() => {
    clearTimeout(loadTimerRef.current);
    setLoadTarget(null);
    setLoadingSlot(null);
    setDepartingForLoad(false);
    setLoadError(null);
    setDeleteError(null);
    onClosed();
  }, [onClosed]);
  const {
    mounted,
    closing,
    close: animatedClose,
    stopPropagation,
  } = useModalPresence({
    open: visible,
    onClose: handleClosed,
    escapeId: 'modal.load-game',
    durationMs: CLOSE_MS,
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const { saves, load: loadSave, remove: removeSave } = useSavesBridge(visible);

  const sortedSaves = useMemo(() => {
    if (!saves) return null;
    return [...saves].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  }, [saves]);

  const registerRow = useCallback((slot: string) => (el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(slot, el);
    else rowRefs.current.delete(slot);
  }, []);

  useEffect(() => () => {
    clearTimeout(removeTimerRef.current);
    clearTimeout(loadTimerRef.current);
  }, []);

  const beginLoad = useCallback((slotName: string) => {
    setLoadError(null);
    setLoadingSlot(slotName);
    setDepartingForLoad(true);
    clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => {
      void loadSave(slotName)
        .then(() => {
          animatedClose();
        })
        .catch((error) => {
          setDepartingForLoad(false);
          setLoadingSlot(null);
          setLoadError(error instanceof Error ? error.message : webUIText('MainMenu.LoadSaveFailed'));
        });
    }, LOAD_DEPARTURE_MS);
  }, [loadSave, animatedClose]);

  const handleLoad = useCallback((save: SaveEntry) => {
    if (warnBeforeLoad) {
      setLoadTarget(save);
      return;
    }
    beginLoad(save.slotName);
  }, [beginLoad, warnBeforeLoad]);

  const confirmLoad = useCallback(() => {
    if (!loadTarget) return;
    beginLoad(loadTarget.slotName);
  }, [beginLoad, loadTarget]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const targetSlot = deleteTarget.slotName;
    setDeleteError(null);
    setRemovingSlot(targetSlot);

    removeTimerRef.current = setTimeout(() => {
      const positions = new Map<string, number>();
      rowRefs.current.forEach((el, slot) => {
        positions.set(slot, el.getBoundingClientRect().top);
      });

      void removeSave(targetSlot).then((result) => {
        setRemovingSlot(null);
        if (!result.deleted) {
          setDeleteError(result.failureReason);
          return;
        }

        rowRefs.current.forEach((el, slot) => {
          const oldTop = positions.get(slot);
          if (oldTop === undefined) return;
          const newTop = el.getBoundingClientRect().top;
          const delta = oldTop - newTop;
          if (delta === 0) return;
          el.style.transition = 'none';
          el.style.transform = `translateY(${toRootRem(delta)})`;
        });

        requestAnimationFrame(() => {
          rowRefs.current.forEach((el) => {
            if (!el.style.transform) return;
            el.style.transitionProperty = 'transform';
            el.style.transitionDuration = `${SLIDE_MS}ms`;
            el.style.transitionTimingFunction = 'var(--ease-snap)';
            el.style.transform = '';
          });
          setTimeout(() => {
            rowRefs.current.forEach((el) => {
              el.style.transitionProperty = '';
              el.style.transitionDuration = '';
              el.style.transitionTimingFunction = '';
              el.style.transform = '';
            });
          }, SLIDE_MS + 20);
        });
      });
    }, FADE_MS);
  };

  if (!mounted) return null;

  const overlayCls = closing || departingForLoad
    ? 'load-game-overlay load-game-overlay--closing'
    : 'load-game-overlay';
  const modalCls = closing || departingForLoad
    ? 'modal load-game-modal load-game-modal--closing'
    : 'modal load-game-modal';

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
          <div className="load-game__header">
            <span className="load-game__title"><WebUIText textKey="Auto.ComponentsScreensLoadGameModal.384.4" /></span>
            <div className="load-game__header-actions">
              <CloseButton size="sm" onClick={animatedClose} />
            </div>
          </div>

          {loadError && (
            <div className="game-notice game-notice--warning load-game__error">
              <span className="load-game__error-title">{webUIText('MainMenu.LoadSaveFailed')}</span>
              <span className="load-game__error-message">{loadError}</span>
            </div>
          )}

          {deleteError && (
            <div className="game-notice game-notice--warning load-game__error">
              <span className="load-game__error-title">{webUIText('Auto.Attr.ComponentsScreensLoadGameModal.415.1')}</span>
              <span className="load-game__error-message">{deleteError}</span>
            </div>
          )}

          <VirtualList
            items={sortedSaves ?? []}
            getKey={save => save.slotName}
            renderItem={(save, i) => (
              <SaveEntryRow
                save={save}
                index={i}
                removing={removingSlot === save.slotName}
                loading={loadingSlot !== null}
                registerRef={registerRow(save.slotName)}
                onLoad={() => handleLoad(save)}
                onDelete={() => setDeleteTarget(save)}
              />
            )}
            empty={(
              <div className="load-game__empty">
                {sortedSaves === null ? <WebUIText textKey="Auto.ComponentsScreensLoadGameModal.392.5" /> : <WebUIText textKey="Auto.ComponentsScreensLoadGameModal.395.6" />}
              </div>
            )}
            className="load-game__list-frame"
            viewportClassName="load-game__list"
            itemClassName="load-game__row-frame"
            rowHeightRem={5.1}
            virtualizeThreshold={18}
            overscan={6}
            resetSignal={sortedSaves?.length ?? 0}
          />
        </div>
      </div>

      <ConfirmDialog
        visible={deleteTarget !== null}
        title={webUIText('Auto.Attr.ComponentsScreensLoadGameModal.415.1')}
        message={
          deleteTarget ? webUIText("Auto.Fix.ExprTrue.componentsscreensLoadGameModal.418.1", { Value1: displayNameFor(deleteTarget) }) : ''
        }
        confirmText={webUIText('Auto.ExtraAttr.ComponentsScreensLoadGameModal.421.1')}
        cancelText={webUIText('Auto.ExtraAttr.ComponentsScreensLoadGameModal.422.2')}
        variant="danger"
        onConfirm={confirmDelete}
        onClosed={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        visible={loadTarget !== null}
        title={webUIText('LoadGame.ConfirmTitle')}
        message={
          loadTarget ? webUIText('LoadGame.ConfirmMessage', { SaveName: displayNameFor(loadTarget) }) : ''
        }
        confirmText={webUIText('LoadGame.ConfirmLoad')}
        cancelText={webUIText('Common.Cancel')}
        onConfirm={confirmLoad}
        onClosed={() => setLoadTarget(null)}
      />
    </>
  );
};

export default LoadGameModal;

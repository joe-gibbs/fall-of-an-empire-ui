import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import FactionRoundel from '../../common/entities/FactionRoundel';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import VirtualList from '../../common/layout/scrolling/VirtualList';
import { useSavesBridge, type SaveEntry } from '../../../bridge/app/useSavesBridge';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { toRootRem } from '../../../utils/cssUnits';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { UI_MOTION } from '../../../config/motion';
import SaveGameDialog from './SaveGameDialog';
import './LoadGameModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
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

interface SaveGroup {
  playthroughId: string;
  displayName: string;
  saves: SaveEntry[];
  latest: SaveEntry;
}

type LoadRow =
  | { kind: 'group'; group: SaveGroup }
  | { kind: 'save'; group: SaveGroup; save: SaveEntry };

function groupKeyFor(save: SaveEntry): string {
  return save.playthroughId || save.slotName;
}

function groupDisplayName(save: SaveEntry): string {
  if (save.playthroughDisplayName) return save.playthroughDisplayName;
  if (save.playerFactionName) return save.playerFactionName;
  return displayNameFor(save);
}

function groupSaves(saves: SaveEntry[]): SaveGroup[] {
  const groups = new Map<string, SaveGroup>();
  const order: string[] = [];
  for (const save of saves) {
    const id = groupKeyFor(save);
    let group = groups.get(id);
    if (!group) {
      group = {
        playthroughId: id,
        displayName: groupDisplayName(save),
        saves: [],
        latest: save,
      };
      groups.set(id, group);
      order.push(id);
    }
    group.saves.push(save);
    if ((save.timestamp ?? '') > (group.latest.timestamp ?? '')) {
      group.latest = save;
    }
    if (!group.displayName && groupDisplayName(save)) {
      group.displayName = groupDisplayName(save);
    }
  }
  return order.map(id => {
    const group = groups.get(id)!;
    group.saves.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
    return group;
  });
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
      className={`save-entry save-entry--nested${removing ? ' save-entry--removing' : ''}`}
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

interface SaveGroupHeaderProps {
  group: SaveGroup;
  expanded: boolean;
  removing: boolean;
  loading: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const SaveGroupHeader: React.FC<SaveGroupHeaderProps> = ({
  group,
  expanded,
  removing,
  loading,
  onToggle,
  onRename,
  onDelete,
}) => {
  const save = group.latest;
  const emblem = cleanName(save.factionEmblem);
  const culture = cleanName(save.cultureGroup);
  const primary = save.factionColour || '#4a1530';
  const secondary = save.factionSecondaryColour || '#c9a84c';
  const faction = save.playerFactionName;
  return (
    <div
      className={`save-group${removing ? ' save-group--removing' : ''}${expanded ? ' save-group--expanded' : ''}`}
      onClick={removing || loading ? undefined : onToggle}
    >
      <span className={`save-group__chevron${expanded ? ' save-group__chevron--open' : ''}`} aria-hidden />
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
        <div className="save-entry__display-name">{group.displayName}</div>
        <div className="save-entry__dates">
          {save.gameDateString && <span className="save-entry__game-date">{save.gameDateString}</span>}
        </div>
        <div className="save-entry__save-date">{formatSaveTimestamp(save.timestamp)}</div>
      </div>
      <div className="save-entry__actions" onClick={event => event.stopPropagation()}>
        <GameButton variant="outline" onClick={onRename} disabled={loading}>
          <WebUIText textKey="LoadGame.RenameGroup" />
        </GameButton>
        <GameButton variant="ghost" onClick={onDelete} disabled={loading}>
          <WebUIText textKey="LoadGame.DeleteAll" />
        </GameButton>
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
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<SaveGroup | null>(null);
  const [renameGroupTarget, setRenameGroupTarget] = useState<SaveGroup | null>(null);
  const [loadTarget, setLoadTarget] = useState<SaveEntry | null>(null);
  const [compatibilityWarning, setCompatibilityWarning] = useState<{ slotName: string; warnings: string[] } | null>(null);
  const [removingSlot, setRemovingSlot] = useState<string | null>(null);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  const [departingForLoad, setDepartingForLoad] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [userExpandedIds, setUserExpandedIds] = useState<Set<string> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const handleClosed = useCallback(() => {
    clearTimeout(loadTimerRef.current);
    setLoadTarget(null);
    setCompatibilityWarning(null);
    setLoadingSlot(null);
    setDepartingForLoad(false);
    setLoadError(null);
    setDeleteError(null);
    setDeleteGroupTarget(null);
    setRenameGroupTarget(null);
    setUserExpandedIds(null);
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
    durationMs: UI_MOTION.panelCloseMs,
    allowFromInput: true,
    closeStrategy: 'request',
  });

  const {
    saves,
    load: loadSave,
    remove: removeSave,
    renamePlaythrough,
    removePlaythrough,
  } = useSavesBridge(visible);

  const handleOpenFolder = useCallback(() => {
    void bridgeCall('game.open_save_games_folder').catch((error) => {
      console.error('[LoadGameModal] open folder failed', error);
    });
  }, []);

  const sortedSaves = useMemo(() => {
    if (!saves) return null;
    return [...saves].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  }, [saves]);

  const groups = useMemo(() => (sortedSaves ? groupSaves(sortedSaves) : []), [sortedSaves]);

  const expandedIds = useMemo(
    () => userExpandedIds ?? (groups[0] ? new Set([groups[0].playthroughId]) : new Set<string>()),
    [groups, userExpandedIds],
  );

  const rows = useMemo<LoadRow[]>(() => {
    const next: LoadRow[] = [];
    for (const group of groups) {
      next.push({ kind: 'group', group });
      if (expandedIds.has(group.playthroughId)) {
        for (const save of group.saves) {
          next.push({ kind: 'save', group, save });
        }
      }
    }
    return next;
  }, [expandedIds, groups]);

  const registerRow = useCallback((slot: string) => (el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(slot, el);
    else rowRefs.current.delete(slot);
  }, []);

  useEffect(() => () => {
    clearTimeout(removeTimerRef.current);
    clearTimeout(loadTimerRef.current);
  }, []);

  const beginLoad = useCallback((slotName: string, acknowledgeWarnings = false) => {
    setLoadError(null);
    setLoadingSlot(slotName);
    setDepartingForLoad(true);
    clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => {
      void loadSave(slotName, acknowledgeWarnings)
        .then((result) => {
          if (result.started) {
            animatedClose();
          } else {
            setDepartingForLoad(false);
            setLoadingSlot(null);
            setCompatibilityWarning({ slotName, warnings: result.warnings });
          }
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

  const toggleGroup = useCallback((playthroughId: string) => {
    setUserExpandedIds(prev => {
      const next = new Set(prev ?? (groups[0] ? [groups[0].playthroughId] : []));
      if (next.has(playthroughId)) next.delete(playthroughId);
      else next.add(playthroughId);
      return next;
    });
  }, [groups]);

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

  const confirmDeleteGroup = () => {
    if (!deleteGroupTarget) return;
    const targetId = deleteGroupTarget.playthroughId;
    setDeleteError(null);
    setRemovingGroupId(targetId);
    removeTimerRef.current = setTimeout(() => {
      void removePlaythrough(targetId).then((result) => {
        setRemovingGroupId(null);
        if (!result.deleted) {
          setDeleteError(result.failureReason);
        }
      });
    }, FADE_MS);
  };

  const confirmRenameGroup = useCallback((name: string) => {
    if (!renameGroupTarget) return;
    const targetId = renameGroupTarget.playthroughId;
    setRenameGroupTarget(null);
    void renamePlaythrough(targetId, name).then((result) => {
      if (!result.renamed) {
        setDeleteError(result.failureReason);
      }
    });
  }, [renameGroupTarget, renamePlaythrough]);

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
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          event.stopPropagation();
          animatedClose();
        }}
      >
        <div className={modalCls} onClick={stopPropagation}>
          <div className="load-game__header">
            <span className="load-game__title"><WebUIText textKey="Auto.ComponentsScreensLoadGameModal.384.4" /></span>
            <div className="load-game__header-actions">
              <GameButton variant="outline" className="load-game__open-folder" onClick={handleOpenFolder}>
                <WebUIText textKey="LoadGame.OpenFolder" />
              </GameButton>
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
            items={rows}
            getKey={row => row.kind === 'group' ? `group:${row.group.playthroughId}` : row.save.slotName}
            renderItem={(row, i) => (
              row.kind === 'group' ? (
                <SaveGroupHeader
                  group={row.group}
                  expanded={expandedIds.has(row.group.playthroughId)}
                  removing={removingGroupId === row.group.playthroughId}
                  loading={loadingSlot !== null}
                  onToggle={() => toggleGroup(row.group.playthroughId)}
                  onRename={() => setRenameGroupTarget(row.group)}
                  onDelete={() => setDeleteGroupTarget(row.group)}
                />
              ) : (
                <SaveEntryRow
                  save={row.save}
                  index={i}
                  removing={removingSlot === row.save.slotName || removingGroupId === row.group.playthroughId}
                  loading={loadingSlot !== null}
                  registerRef={registerRow(row.save.slotName)}
                  onLoad={() => handleLoad(row.save)}
                  onDelete={() => setDeleteTarget(row.save)}
                />
              )
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
            resetSignal={`${rows.length}:${expandedIds.size}`}
          />
        </div>
      </div>

      <ConfirmDialog
        visible={deleteTarget !== null}
        title={webUIText('Auto.Attr.ComponentsScreensLoadGameModal.415.1')}
        message={
          deleteTarget ? webUIText("LoadGame.DeleteConfirmBody", { Value1: displayNameFor(deleteTarget) }) : ''
        }
        confirmText={webUIText('Auto.ExtraAttr.ComponentsScreensLoadGameModal.421.1')}
        cancelText={webUIText('Auto.ExtraAttr.ComponentsScreensLoadGameModal.422.2')}
        variant="danger"
        onConfirm={confirmDelete}
        onClosed={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        visible={deleteGroupTarget !== null}
        title={webUIText('LoadGame.DeleteAllTitle', { Name: deleteGroupTarget?.displayName ?? '' })}
        message={
          deleteGroupTarget ? webUIText('LoadGame.DeleteAllMessage', { Name: deleteGroupTarget.displayName }) : ''
        }
        confirmText={webUIText('LoadGame.DeleteAll')}
        cancelText={webUIText('Auto.ExtraAttr.ComponentsScreensLoadGameModal.422.2')}
        variant="danger"
        onConfirm={confirmDeleteGroup}
        onClosed={() => setDeleteGroupTarget(null)}
      />

      <SaveGameDialog
        visible={renameGroupTarget !== null}
        mode="renameGroup"
        suggestedName={renameGroupTarget?.displayName ?? ''}
        onConfirm={confirmRenameGroup}
        onClosed={() => setRenameGroupTarget(null)}
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
      <ConfirmDialog
        visible={compatibilityWarning !== null}
        title={webUIText('LoadGame.CompatibilityTitle')}
        message={webUIText('LoadGame.CompatibilityMessage', { Warnings: compatibilityWarning?.warnings.join(' ') ?? '' })}
        confirmText={webUIText('LoadGame.LoadAnyway')}
        onConfirm={() => {
          if (compatibilityWarning) beginLoad(compatibilityWarning.slotName, true);
        }}
        onClosed={() => setCompatibilityWarning(null)}
      />
    </>
  );
};

export default LoadGameModal;

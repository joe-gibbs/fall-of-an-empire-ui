import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Portrait from '../../common/portraits/Portrait';
import FactionRoundel from '../../common/entities/FactionRoundel';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import { bridgeCall, onBridgeEvent } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { useGameActions } from '../../../context/GameContext';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import { useAnimatedPresence } from '../../../hooks/useAnimatedPresence';
import { WebkilnAssetPath } from '../../../utils/assets';
import { webUIText } from '../../../localization/WebUITextContext';
import './WorldSearchBar.css';

type WorldSearchItemType = 'faction' | 'settlement' | 'military' | 'character';

/** Results for the most recent query the game has answered. */
interface WorldSearchAnswer {
  query: string;
  results: WorldSearchResult[];
}

interface WorldSearchResult {
  itemType: WorldSearchItemType;
  itemId: string;
  name: string;
  detail: string;
  factionId: string;
  kind: string;
  score: number;
}

const DEBOUNCE_MS = 160;
const FOCUS_RETRY_DELAYS_MS = [0, 16, 32, 64, 120, 200, 350, 500];
const MAX_RESULTS = 24;
const EXIT_DURATION_MS = 120;

const TYPE_ICONS: Record<WorldSearchItemType, string> = {
  settlement: '/assets/icons/I_Capital.png',
  character: '/assets/icons/I_Characters.png',
  military: '/assets/icons/I_ArmiesQuickButton.png',
  faction: '/assets/icons/I_Diplomacy.png',
};

function typeLabel(type: WorldSearchItemType, kind: string): string {
  if (type === 'military') {
    return kind === 'navy'
      ? webUIText('WorldSearch.Type.Navy')
      : webUIText('WorldSearch.Type.Army');
  }
  if (type === 'settlement') return webUIText('WorldSearch.Type.Settlement');
  if (type === 'character') return webUIText('WorldSearch.Type.Character');
  return webUIText('WorldSearch.Type.Faction');
}

function normaliseType(raw: string): WorldSearchItemType {
  if (raw === 'settlement' || raw === 'military' || raw === 'faction') return raw;
  return 'character';
}

export default function WorldSearchBar() {
  const { openSidebar } = useGameActions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<WorldSearchAnswer>({ query: '', results: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const results = answer.results;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const searchTimerRef = useRef<number | null>(null);
  const focusTimersRef = useRef<number[]>([]);
  const presence = useAnimatedPresence(open, { durationMs: EXIT_DURATION_MS });

  const clearFocusRetries = useCallback(() => {
    focusTimersRef.current.forEach(timer => window.clearTimeout(timer));
    focusTimersRef.current = [];
  }, []);

  // Drops the debounced request and any response still in flight.
  const cancelSearch = useCallback(() => {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    requestIdRef.current += 1;
  }, []);

  const close = useCallback(() => {
    cancelSearch();
    clearFocusRetries();
    setOpen(false);
    setQuery('');
    setAnswer({ query: '', results: [] });
    setActiveIndex(0);
  }, [cancelSearch, clearFocusRetries]);

  useEffect(() => () => {
    cancelSearch();
    clearFocusRetries();
  }, [cancelSearch, clearFocusRetries]);

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) return false;
    // preventScroll avoids CEF jumping the page when focusing a fixed overlay.
    input.focus({ preventScroll: true });
    if (typeof input.select === 'function') {
      input.select();
    }
    return document.activeElement === input;
  }, []);

  const scheduleFocusRetries = useCallback(() => {
    clearFocusRetries();
    focusTimersRef.current = FOCUS_RETRY_DELAYS_MS.map(delay => window.setTimeout(() => {
      if (!inputRef.current) return;
      if (document.activeElement === inputRef.current) return;
      focusInput();
    }, delay));
  }, [clearFocusRetries, focusInput]);

  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (node) {
      // Focus as soon as the input is attached to the DOM.
      node.focus({ preventScroll: true });
      if (typeof node.select === 'function') {
        node.select();
      }
      scheduleFocusRetries();
    }
  }, [scheduleFocusRetries]);

  const openSearch = useCallback(() => {
    setOpen(true);
  }, []);

  useEscapeStackEntry({
    id: 'ui.world-search',
    active: open,
    onClose: close,
    allowFromInput: true,
  });

  useEffect(() => {
    bridgeCall('ui.open_world_search').catch(acknowledgeBridgeFailure);
  }, []);

  useEffect(() => {
    const unsub = onBridgeEvent('ui.open_world_search', () => {
      openSearch();
      // If already open, re-run focus retries (e.g. pressing Ctrl+F again).
      scheduleFocusRetries();
    });
    return unsub;
  }, [openSearch, scheduleFocusRetries]);

  // Focus after presence finishes mounting (callback ref may run first).
  useEffect(() => {
    if (!open || !presence.mounted || presence.closing) return;
    scheduleFocusRetries();
  }, [open, presence.mounted, presence.closing, scheduleFocusRetries]);

  const changeQuery = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
    cancelSearch();

    const trimmed = nextQuery.trim();
    if (!trimmed) {
      setAnswer({ query: '', results: [] });
      setActiveIndex(0);
      return;
    }

    const requestId = requestIdRef.current;
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      bridgeCall('game.world_search', { query: trimmed, maxResults: MAX_RESULTS })
        .then((response) => {
          if (requestId !== requestIdRef.current) return;
          setAnswer({
            query: trimmed,
            results: (response.results ?? []).map((entry) => ({
              itemType: normaliseType(entry.itemType),
              itemId: entry.itemId,
              name: entry.name,
              detail: entry.detail ?? '',
              factionId: entry.factionId ?? '',
              kind: entry.kind ?? '',
              score: entry.score ?? 0,
            })),
          });
          setActiveIndex(0);
        })
        .catch((error) => {
          if (requestId !== requestIdRef.current) return;
          acknowledgeBridgeFailure(error);
        });
    }, DEBOUNCE_MS);
  }, [cancelSearch]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>('.world-search-row--active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  const selectResult = useCallback((result: WorldSearchResult) => {
    if (!result.itemId) return;

    if (result.itemType === 'settlement') {
      openSidebar('settlement', result.itemId);
      zoomToBridge('settlement', result.itemId);
    } else if (result.itemType === 'character') {
      openSidebar('character', result.itemId);
      zoomToBridge('character', result.itemId);
    } else if (result.itemType === 'faction') {
      openSidebar('diplomacy', result.itemId);
      zoomToBridge('faction', result.itemId);
    } else if (result.itemType === 'military') {
      bridgeCall('game.select_military', { militaryId: result.itemId }).catch(acknowledgeBridgeFailure);
      openSidebar('military', result.itemId);
      zoomToBridge('military', result.itemId);
    }

    close();
  }, [close, openSidebar]);

  const openFaction = useCallback((factionId: string) => {
    if (!factionId) return;
    openSidebar('diplomacy', factionId);
    zoomToBridge('faction', factionId);
    close();
  }, [close, openSidebar]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) selectResult(selected);
    }
  }, [activeIndex, close, results, selectResult]);

  const emptyLabel = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || answer.query !== trimmed) return '';
    return webUIText('WorldSearch.NoResults');
  }, [answer.query, query]);

  if (!presence.mounted) return null;

  return (
    <div
      className={`world-search${presence.closing ? ' world-search--exiting' : ''}`}
      role="dialog"
      aria-label={webUIText('WorldSearch.Title')}
    >
      <div className="world-search-panel">
        <div className="world-search-bar">
          <div className="search-field world-search-field is-focused">
            <img
              src={WebkilnAssetPath('/assets/icons/I_Search.png')}
              alt=""
              className="search-field__icon world-search-field-icon"
              draggable={false}
            />
            <input
              ref={setInputRef}
              type="text"
              className="search-field__input world-search-input"
              value={query}
              placeholder={webUIText('WorldSearch.Placeholder')}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
          <button type="button" className="world-search-close" onClick={close} aria-label={webUIText('WorldSearch.Close')}>
            ×
          </button>
        </div>

        <StyledScrollArea
          className="world-search-body"
          viewportClassName="world-search-body-viewport"
          variant="inline"
        >
          <div ref={listRef}>
            {results.length === 0 ? (
              emptyLabel ? <div className="world-search-empty">{emptyLabel}</div> : null
            ) : (
              results.map((result, index) => {
                const icon = TYPE_ICONS[result.itemType];
                const isActive = index === activeIndex;
                const factionId = result.itemType === 'faction' ? result.itemId : result.factionId;
                const showFactionLink = !!result.detail && !!factionId && result.itemType !== 'faction';
                return (
                  <button
                    key={`${result.itemType}:${result.itemId}`}
                    type="button"
                    className={`world-search-row${isActive ? ' world-search-row--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={(event) => {
                      event.preventDefault();
                      selectResult(result);
                    }}
                  >
                    <span className="world-search-row-media">
                      {result.itemType === 'character' ? (
                        <Portrait
                          personId={result.itemId}
                          name={result.name}
                          size="sm"
                          shape="circle"
                          showBorder
                        />
                      ) : result.itemType === 'faction' ? (
                        <FactionRoundel factionId={result.itemId} name={result.name} size="sm" />
                      ) : (
                        <img src={WebkilnAssetPath(icon)} alt="" className="world-search-row-icon" draggable={false} />
                      )}
                    </span>
                    <div className="world-search-row-info">
                      <span className="world-search-row-name">{result.name}</span>
                      {result.detail && (
                        showFactionLink ? (
                          <span
                            className="world-search-row-detail world-search-row-detail--link"
                            role="link"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openFaction(factionId);
                            }}
                          >
                            {result.detail}
                          </span>
                        ) : (
                          <span className="world-search-row-detail">{result.detail}</span>
                        )
                      )}
                    </div>
                    <span className="world-search-row-type">{typeLabel(result.itemType, result.kind)}</span>
                  </button>
                );
              })
            )}
          </div>
        </StyledScrollArea>
      </div>
    </div>
  );
}

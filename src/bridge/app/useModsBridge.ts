import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type {
  BrowseSteamWorkshopResponse,
  ModEntryDto,
  SteamWorkshopItemDto,
  SteamWorkshopItemOperationResponse,
  UploadModToWorkshopResponse,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type ModEntry = ModEntryDto;
export type SteamWorkshopItem = SteamWorkshopItemDto;
export type ModUploadState = 'preparing' | 'uploading' | 'succeeded' | 'failed';
export type SteamWorkshopOperationState = 'subscribing' | 'unsubscribing' | 'downloading' | 'installed' | 'unsubscribed' | 'failed';

export interface ModUploadStatus {
  state: ModUploadState;
  error: string;
  publishedFileId: string;
  needsLegalAgreement: boolean;
  url: string;
}

export interface UseModsBridge {
  mods: ModEntry[] | null;
  setEnabled: (modId: string, enabled: boolean) => Promise<boolean>;
  uploadMod: (modId: string) => Promise<boolean>;
  uploadStatuses: Record<string, ModUploadStatus>;
  workshopItems: SteamWorkshopItem[];
  subscribedWorkshopItems: SteamWorkshopItem[];
  workshopOperations: Record<string, SteamWorkshopOperationStatus>;
  steamWorkshopAvailable: boolean;
  workshopCategories: string[];
  workshopCategory: string;
  setWorkshopCategory: (category: string) => void;
  workshopSearchText: string;
  workshopPage: number;
  workshopTotalResults: number;
  workshopError: string;
  subscribedWorkshopError: string;
  workshopQueryInProgress: boolean;
  subscribedWorkshopQueryInProgress: boolean;
  modChangesRequireRestart: boolean;
  workshopChangesRequireRestart: boolean;
  browseWorkshop: (searchText: string, page?: number, category?: string) => Promise<void>;
  refreshSubscribedWorkshop: () => Promise<void>;
  subscribeWorkshopItem: (publishedFileId: string) => Promise<void>;
  unsubscribeWorkshopItem: (publishedFileId: string) => Promise<void>;
  downloadWorkshopItem: (publishedFileId: string) => Promise<void>;
}

export interface SteamWorkshopOperationStatus {
  state: SteamWorkshopOperationState;
  error: string;
}

function hasWorkshopDisplayMetadata(item: SteamWorkshopItem): boolean {
  return Boolean(
    item.title
    || item.description
    || item.previewUrl
    || item.ownerSteamId
    || item.installedModId
    || (item.categories?.length ?? 0) > 0
    || item.createdTimestamp
    || item.updatedTimestamp
    || item.votesUp
    || item.votesDown
    || item.score,
  );
}

function mergeWorkshopOperationItem(items: SteamWorkshopItem[], next: SteamWorkshopItem): SteamWorkshopItem[] {
  if (!next?.publishedFileId) return items;
  const index = items.findIndex(item => item.publishedFileId === next.publishedFileId);
  if (index < 0) return hasWorkshopDisplayMetadata(next) ? [next, ...items] : items;

  const existing = items[index];
  const copy = items.slice();
  copy[index] = {
    ...existing,
    ...next,
    title: next.title || existing.title,
    description: next.description || existing.description,
    previewUrl: next.previewUrl || existing.previewUrl,
    categories: (next.categories?.length ?? 0) > 0 ? next.categories : existing.categories,
    ownerSteamId: next.ownerSteamId || existing.ownerSteamId,
    createdTimestamp: next.createdTimestamp || existing.createdTimestamp,
    updatedTimestamp: next.updatedTimestamp || existing.updatedTimestamp,
    votesUp: next.votesUp || existing.votesUp,
    votesDown: next.votesDown || existing.votesDown,
    score: next.score || existing.score,
  };
  return copy;
}

/**
 * One Workshop query. The game runs a single Steam query at a time and rejects
 * a second one, so the hook keeps one active query and the latest wanted query
 * of each kind. Completion pushes are matched against the active query, and
 * later preview refresh pushes against the query currently on display.
 */
type WorkshopQuery =
  | { kind: 'all'; searchText: string; page: number; category: string }
  | { kind: 'subscribed' };

function workshopQueryMatches(query: WorkshopQuery | null, event: BrowseSteamWorkshopResponse): boolean {
  if (!query) return false;
  if (query.kind === 'subscribed') return Boolean(event.subscribedOnly);
  return !event.subscribedOnly
    && (event.searchText ?? '') === query.searchText
    && (event.page || 1) === query.page;
}

function enabledModSetKey(mods: ModEntry[]): string {
  return mods
    .filter(mod => mod.enabled)
    .map(mod => mod.id)
    .sort()
    .join('\n');
}

export function useModsBridge(enabled: boolean): UseModsBridge {
  const [mods, setMods] = useState<ModEntry[] | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, ModUploadStatus>>({});
  const [workshopItems, setWorkshopItems] = useState<SteamWorkshopItem[]>([]);
  const [subscribedWorkshopItems, setSubscribedWorkshopItems] = useState<SteamWorkshopItem[]>([]);
  const [workshopOperations, setWorkshopOperations] = useState<Record<string, SteamWorkshopOperationStatus>>({});
  const [steamWorkshopAvailable, setSteamWorkshopAvailable] = useState(false);
  const [workshopCategories, setWorkshopCategories] = useState<string[]>([]);
  const [workshopCategory, setWorkshopCategory] = useState('');
  const [workshopSearchText, setWorkshopSearchText] = useState('');
  const [workshopPage, setWorkshopPage] = useState(1);
  const [workshopTotalResults, setWorkshopTotalResults] = useState(0);
  const [workshopError, setWorkshopError] = useState('');
  const [subscribedWorkshopError, setSubscribedWorkshopError] = useState('');
  const [workshopQueryInProgress, setWorkshopQueryInProgress] = useState(false);
  const [subscribedWorkshopQueryInProgress, setSubscribedWorkshopQueryInProgress] = useState(false);
  const [workshopChangesRequireRestart, setWorkshopChangesRequireRestart] = useState(false);
  const initialWorkshopFetchRef = useRef(false);
  const activeWorkshopQueryRef = useRef<WorkshopQuery | null>(null);
  const queuedAllWorkshopQueryRef = useRef<Extract<WorkshopQuery, { kind: 'all' }> | null>(null);
  const queuedSubscribedWorkshopQueryRef = useRef(false);
  const shownAllWorkshopQueryRef = useRef<WorkshopQuery | null>(null);
  const initialEnabledModsKeyRef = useRef<string | null>(null);

  const refreshMods = useCallback(async () => {
    const res = await bridgeCall('game.list_mods');
    const nextMods = res.mods ?? [];
    if (initialEnabledModsKeyRef.current === null) {
      initialEnabledModsKeyRef.current = enabledModSetKey(nextMods);
    }
    setMods(nextMods);
    setSteamWorkshopAvailable(Boolean(res.steamWorkshopAvailable));
    setWorkshopCategories(res.workshopCategories ?? []);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await bridgeCall('game.list_mods');
        if (cancelled) return;
        const nextMods = res.mods ?? [];
        if (initialEnabledModsKeyRef.current === null) {
          initialEnabledModsKeyRef.current = enabledModSetKey(nextMods);
        }
        setMods(nextMods);
        setSteamWorkshopAvailable(Boolean(res.steamWorkshopAvailable));
        setWorkshopCategories(res.workshopCategories ?? []);
      } catch (error) {
        acknowledgeBridgeFailure(error);
        if (!cancelled) {
          setMods([]);
          setSteamWorkshopAvailable(false);
          setWorkshopCategories([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const applyUploadEvent = (event: UploadModToWorkshopResponse) => {
      if (!event.modId || !event.state) return;
      setUploadStatuses(prev => ({
        ...prev,
        [event.modId]: {
          state: event.state as ModUploadState,
          error: event.error ?? '',
          publishedFileId: event.publishedFileId ?? '',
          needsLegalAgreement: Boolean(event.needsLegalAgreement),
          url: event.url ?? '',
        },
      }));
    };

    return onBridgeEvent('game.upload_mod_to_workshop', applyUploadEvent);
  }, [enabled]);

  const syncWorkshopQueryProgress = useCallback(() => {
    const active = activeWorkshopQueryRef.current;
    setWorkshopQueryInProgress(active?.kind === 'all' || queuedAllWorkshopQueryRef.current !== null);
    setSubscribedWorkshopQueryInProgress(active?.kind === 'subscribed' || queuedSubscribedWorkshopQueryRef.current);
  }, []);

  const applyWorkshopResult = useCallback((event: BrowseSteamWorkshopResponse) => {
    const items = event.items ?? [];
    if (event.subscribedOnly) {
      setSubscribedWorkshopItems(items);
      setSubscribedWorkshopError(event.error ?? '');
      return;
    }

    setWorkshopItems(items);
    setWorkshopError(event.error ?? '');
    setWorkshopSearchText(event.searchText ?? '');
    setWorkshopCategory(event.category ?? '');
    setWorkshopCategories(event.categories ?? []);
    setWorkshopPage(event.page || 1);
    setWorkshopTotalResults(event.totalResults || 0);
  }, []);

  // Assigned below; lets a finished query start the next queued one.
  const runNextWorkshopQueryRef = useRef<() => void>(() => undefined);

  const finishWorkshopQuery = useCallback((query: WorkshopQuery, event: BrowseSteamWorkshopResponse | null) => {
    activeWorkshopQueryRef.current = null;
    // A newer query of the same kind is waiting, so this result is already out of date.
    const superseded = query.kind === 'all'
      ? queuedAllWorkshopQueryRef.current !== null
      : queuedSubscribedWorkshopQueryRef.current;
    if (event && !superseded) {
      applyWorkshopResult(event);
      if (query.kind === 'all') shownAllWorkshopQueryRef.current = query;
    }
    syncWorkshopQueryProgress();
    runNextWorkshopQueryRef.current();
  }, [applyWorkshopResult, syncWorkshopQueryProgress]);

  const startWorkshopQuery = useCallback((query: WorkshopQuery) => {
    activeWorkshopQueryRef.current = query;
    syncWorkshopQueryProgress();
    const request = query.kind === 'all'
      ? { searchText: query.searchText, page: query.page, category: query.category, subscribedOnly: false }
      : { searchText: '', page: 1, category: '', subscribedOnly: true };
    bridgeCall('game.browse_steam_workshop', request)
      .then(res => {
        if (activeWorkshopQueryRef.current !== query) return;
        // A started Steam query finishes with a push. Anything else finished here.
        if (res.queryInProgress) return;
        finishWorkshopQuery(query, res);
      })
      .catch(error => {
        acknowledgeBridgeFailure(error);
        if (activeWorkshopQueryRef.current !== query) return;
        const message = error instanceof Error ? error.message : '';
        if (query.kind === 'all') setWorkshopError(message);
        else setSubscribedWorkshopError(message);
        finishWorkshopQuery(query, null);
      });
  }, [finishWorkshopQuery, syncWorkshopQueryProgress]);

  useEffect(() => {
    runNextWorkshopQueryRef.current = () => {
      if (activeWorkshopQueryRef.current) return;
      const queuedAll = queuedAllWorkshopQueryRef.current;
      if (queuedAll) {
        queuedAllWorkshopQueryRef.current = null;
        startWorkshopQuery(queuedAll);
        return;
      }
      if (queuedSubscribedWorkshopQueryRef.current) {
        queuedSubscribedWorkshopQueryRef.current = false;
        startWorkshopQuery({ kind: 'subscribed' });
      }
    };
  }, [startWorkshopQuery]);

  const applyWorkshopQuery = useCallback((event: BrowseSteamWorkshopResponse) => {
    if (event.queryInProgress) return;
    const active = activeWorkshopQueryRef.current;
    if (active && workshopQueryMatches(active, event)) {
      finishWorkshopQuery(active, event);
      return;
    }
    // Preview images arrive later as a refresh of the last finished query.
    if (event.subscribedOnly) {
      if (active?.kind !== 'subscribed' && !queuedSubscribedWorkshopQueryRef.current) applyWorkshopResult(event);
      return;
    }
    if (workshopQueryMatches(shownAllWorkshopQueryRef.current, event)
      && active?.kind !== 'all'
      && queuedAllWorkshopQueryRef.current === null) {
      applyWorkshopResult(event);
    }
  }, [applyWorkshopResult, finishWorkshopQuery]);

  const applyWorkshopOperation = useCallback((event: SteamWorkshopItemOperationResponse) => {
    const publishedFileId = event.publishedFileId || event.item?.publishedFileId;
    if (!publishedFileId) return;

    setWorkshopOperations(prev => ({
      ...prev,
      [publishedFileId]: {
        state: (event.state || 'failed') as SteamWorkshopOperationState,
        error: event.error ?? '',
      },
    }));

    if (event.item?.publishedFileId) {
      setWorkshopItems(prev => mergeWorkshopOperationItem(prev, event.item));
      setSubscribedWorkshopItems(prev => {
        if (event.state === 'unsubscribed') {
          return prev.filter(item => item.publishedFileId !== event.item.publishedFileId);
        }
        return mergeWorkshopOperationItem(prev, event.item);
      });
    }

    if (event.state === 'installed') {
      setWorkshopChangesRequireRestart(true);
      void refreshMods().catch(acknowledgeBridgeFailure);
    } else if (event.state === 'unsubscribed') {
      void refreshMods().catch(acknowledgeBridgeFailure);
    }
  }, [refreshMods]);

  // Stays subscribed while the mods view is hidden so a running query still finishes here.
  useEffect(() => onBridgeEvent('game.browse_steam_workshop', applyWorkshopQuery), [applyWorkshopQuery]);

  useEffect(() => {
    if (!enabled) return;
    const unsubSubscribe = onBridgeEvent('game.subscribe_steam_workshop_item', applyWorkshopOperation);
    const unsubUnsubscribe = onBridgeEvent('game.unsubscribe_steam_workshop_item', applyWorkshopOperation);
    const unsubDownload = onBridgeEvent('game.download_steam_workshop_item', applyWorkshopOperation);
    return () => {
      unsubSubscribe();
      unsubUnsubscribe();
      unsubDownload();
    };
  }, [applyWorkshopOperation, enabled]);

  const browseWorkshop = useCallback(async (searchText: string, page = 1, category = workshopCategory) => {
    if (!steamWorkshopAvailable) return;
    setWorkshopSearchText(searchText);
    setWorkshopCategory(category);
    setWorkshopPage(page);
    setWorkshopError('');
    queuedAllWorkshopQueryRef.current = { kind: 'all', searchText, page, category };
    syncWorkshopQueryProgress();
    runNextWorkshopQueryRef.current();
  }, [steamWorkshopAvailable, syncWorkshopQueryProgress, workshopCategory]);

  const refreshSubscribedWorkshop = useCallback(async () => {
    if (!steamWorkshopAvailable) return;
    setSubscribedWorkshopError('');
    queuedSubscribedWorkshopQueryRef.current = true;
    syncWorkshopQueryProgress();
    runNextWorkshopQueryRef.current();
  }, [steamWorkshopAvailable, syncWorkshopQueryProgress]);

  useEffect(() => {
    if (!enabled) {
      initialWorkshopFetchRef.current = false;
      return;
    }
    if (!steamWorkshopAvailable || initialWorkshopFetchRef.current) return;
    initialWorkshopFetchRef.current = true;
    void browseWorkshop('', 1, '');
    void refreshSubscribedWorkshop();
  }, [browseWorkshop, enabled, refreshSubscribedWorkshop, steamWorkshopAvailable]);

  const modChangesRequireRestart = useMemo(() => {
    if (mods === null || initialEnabledModsKeyRef.current === null) return false;
    return enabledModSetKey(mods) !== initialEnabledModsKeyRef.current;
  }, [mods]);

  const setEnabled = useCallback(async (modId: string, nextEnabled: boolean) => {
    setMods(prev => prev
      ? prev.map(m => m.id === modId ? { ...m, enabled: nextEnabled } : m)
      : prev);
    try {
      await bridgeCall('game.set_mod_enabled', { modId, enabled: nextEnabled });
      return true;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setMods(prev => prev
        ? prev.map(m => m.id === modId ? { ...m, enabled: !nextEnabled } : m)
        : prev);
      return false;
    }
  }, []);

  const uploadMod = useCallback(async (modId: string) => {
    setUploadStatuses(prev => ({
      ...prev,
      [modId]: {
        state: 'preparing',
        error: '',
        publishedFileId: prev[modId]?.publishedFileId ?? '',
        needsLegalAgreement: false,
        url: prev[modId]?.url ?? '',
      },
    }));
    try {
      await bridgeCall('game.upload_mod_to_workshop', { modId });
      return true;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setUploadStatuses(prev => ({
        ...prev,
        [modId]: {
          state: 'failed',
          error: error instanceof Error ? error.message : '',
          publishedFileId: prev[modId]?.publishedFileId ?? '',
          needsLegalAgreement: false,
          url: prev[modId]?.url ?? '',
        },
      }));
      return false;
    }
  }, []);

  const subscribeWorkshopItem = useCallback(async (publishedFileId: string) => {
    setWorkshopOperations(prev => ({ ...prev, [publishedFileId]: { state: 'subscribing', error: '' } }));
    try {
      const res = await bridgeCall('game.subscribe_steam_workshop_item', { publishedFileId });
      applyWorkshopOperation(res);
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setWorkshopOperations(prev => ({ ...prev, [publishedFileId]: { state: 'failed', error: error instanceof Error ? error.message : '' } }));
    }
  }, [applyWorkshopOperation]);

  const unsubscribeWorkshopItem = useCallback(async (publishedFileId: string) => {
    setWorkshopOperations(prev => ({ ...prev, [publishedFileId]: { state: 'unsubscribing', error: '' } }));
    try {
      const res = await bridgeCall('game.unsubscribe_steam_workshop_item', { publishedFileId });
      applyWorkshopOperation(res);
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setWorkshopOperations(prev => ({ ...prev, [publishedFileId]: { state: 'failed', error: error instanceof Error ? error.message : '' } }));
    }
  }, [applyWorkshopOperation]);

  const downloadWorkshopItem = useCallback(async (publishedFileId: string) => {
    setWorkshopOperations(prev => ({ ...prev, [publishedFileId]: { state: 'downloading', error: '' } }));
    try {
      const res = await bridgeCall('game.download_steam_workshop_item', { publishedFileId });
      applyWorkshopOperation(res);
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setWorkshopOperations(prev => ({ ...prev, [publishedFileId]: { state: 'failed', error: error instanceof Error ? error.message : '' } }));
    }
  }, [applyWorkshopOperation]);

  return {
    mods,
    setEnabled,
    uploadMod,
    uploadStatuses,
    workshopItems,
    subscribedWorkshopItems,
    workshopOperations,
    steamWorkshopAvailable,
    workshopCategories,
    workshopCategory,
    setWorkshopCategory,
    workshopSearchText,
    workshopPage,
    workshopTotalResults,
    workshopError,
    subscribedWorkshopError,
    workshopQueryInProgress,
    subscribedWorkshopQueryInProgress,
    modChangesRequireRestart,
    workshopChangesRequireRestart,
    browseWorkshop,
    refreshSubscribedWorkshop,
    subscribeWorkshopItem,
    unsubscribeWorkshopItem,
    downloadWorkshopItem,
  };
}

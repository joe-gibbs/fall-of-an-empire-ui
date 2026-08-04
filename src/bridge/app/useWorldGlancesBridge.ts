import { useSyncExternalStore } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetWorldGlancesResponse } from '../../bridge-types.generated.ts';
import { getCachedBridgeEvent, getCachedBridgeEventByName } from '../core/bridgeEventCache';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { NATIVE_BRIDGE_PROTOCOL } from '../../native-bridge-protocol.generated';

const PACKED_WORLD_GLANCES_FRAME = 'worldGlancesFrame';
const WORLD_GLANCE_FRAME_NUMBER_STRIDE = NATIVE_BRIDGE_PROTOCOL.strides.worldGlanceEntryNumbers;
const WORLD_GLANCE_FRAME_SELECTED_FLAG = NATIVE_BRIDGE_PROTOCOL.flags.worldGlance.selected;
const WORLD_GLANCE_FRAME_TARGETED_FLAG = NATIVE_BRIDGE_PROTOCOL.flags.worldGlance.targeted;
const WORLD_GLANCE_FRAME_BESIEGED_FLAG = NATIVE_BRIDGE_PROTOCOL.flags.worldGlance.besieged;
const WORLD_GLANCE_FRAME_HAS_BUILD_ITEM_FLAG = NATIVE_BRIDGE_PROTOCOL.flags.worldGlance.hasBuildItem;
const WORLD_GLANCE_FRAME_SOURCE_INDEX_SHIFT = NATIVE_BRIDGE_PROTOCOL.flags.worldGlance.sourceIndexShift;

export type WorldGlanceFrameSection = 'settlement' | 'port' | 'convoy' | 'army' | 'navy' | 'battle';

const WORLD_GLANCE_FRAME_SECTION_INDEX: Record<WorldGlanceFrameSection, number> = {
  settlement: 0,
  port: 1,
  convoy: 2,
  army: 3,
  navy: 4,
  battle: 5,
};

function frameEntries(entries: unknown): WorldGlanceFrameEntry[] {
  return Array.isArray(entries) ? entries as WorldGlanceFrameEntry[] : [];
}

function frameNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normaliseWorldGlancesFrame(frame: unknown): WorldGlancesFrameResponse {
  if (isPackedWorldGlancesFrame(frame)) {
    return frame;
  }

  const source: Partial<ObjectWorldGlancesFrameResponse> = frame && typeof frame === 'object'
    ? frame as Partial<ObjectWorldGlancesFrameResponse>
    : {};

  return {
    viewportWidth: frameNumber(source.viewportWidth),
    viewportHeight: frameNumber(source.viewportHeight),
    snapshotRevision: frameNumber(source.snapshotRevision),
    dragSelectionActive: source.dragSelectionActive === true,
    dragSelectionStartX: frameNumber(source.dragSelectionStartX),
    dragSelectionStartY: frameNumber(source.dragSelectionStartY),
    dragSelectionEndX: frameNumber(source.dragSelectionEndX),
    dragSelectionEndY: frameNumber(source.dragSelectionEndY),
    settlements: frameEntries(source.settlements),
    ports: frameEntries(source.ports),
    convoys: frameEntries(source.convoys),
    armies: frameEntries(source.armies),
    navies: frameEntries(source.navies),
    battles: frameEntries(source.battles),
  };
}

function snapshotEntries<T>(entries: unknown): T[] {
  return Array.isArray(entries) ? entries as T[] : [];
}

function normaliseWorldGlancesSnapshot(snapshot: unknown): GetWorldGlancesResponse | null {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }
  if ((snapshot as { nativePushed?: unknown }).nativePushed === true) {
    return null;
  }

  const source = snapshot as Partial<GetWorldGlancesResponse>;
  return {
    ...source,
    viewportWidth: frameNumber(source.viewportWidth),
    viewportHeight: frameNumber(source.viewportHeight),
    settlements: snapshotEntries<GetWorldGlancesResponse['settlements'][number]>(source.settlements),
    ports: snapshotEntries<GetWorldGlancesResponse['ports'][number]>(source.ports),
    convoys: snapshotEntries<GetWorldGlancesResponse['convoys'][number]>(source.convoys),
    armies: snapshotEntries<GetWorldGlancesResponse['armies'][number]>(source.armies),
    navies: snapshotEntries<GetWorldGlancesResponse['navies'][number]>(source.navies),
    battles: snapshotEntries<GetWorldGlancesResponse['battles'][number]>(source.battles),
  } as GetWorldGlancesResponse;
}

function mergeCatalogueEntries<T extends { id: string }>(
  current: T[],
  upserts: T[],
  removedIds: Set<string>,
): T[] {
  if (upserts.length === 0 && removedIds.size === 0) {
    return current;
  }

  const upsertById = new Map(upserts.map(entry => [entry.id, entry]));
  const merged = current
    .filter(entry => !removedIds.has(entry.id))
    .map(entry => upsertById.get(entry.id) ?? entry);
  const existingIds = new Set(merged.map(entry => entry.id));
  for (const entry of upserts) {
    if (!existingIds.has(entry.id)) {
      merged.push(entry);
      existingIds.add(entry.id);
    }
  }

  // Keep the previous array when every retained entry is the same reference and no ids were
  // added/removed. Empty or no-op deltas must not allocate a new catalogue snapshot.
  if (
    merged.length === current.length
    && merged.every((entry, index) => entry === current[index])
  ) {
    return current;
  }

  return merged;
}

function catalogueDeltaHasChanges(delta: {
  upsertedSettlements?: unknown;
  upsertedPorts?: unknown;
  upsertedArmies?: unknown;
  upsertedNavies?: unknown;
  upsertedBattles?: unknown;
  upsertedConvoys?: unknown;
  removedSettlementIds?: unknown;
  removedPortIds?: unknown;
  removedArmyIds?: unknown;
  removedNavyIds?: unknown;
  removedBattleIds?: unknown;
  removedConvoyIds?: unknown;
}): boolean {
  const hasEntries = (value: unknown) => Array.isArray(value) && value.length > 0;
  return hasEntries(delta.upsertedSettlements)
    || hasEntries(delta.upsertedPorts)
    || hasEntries(delta.upsertedArmies)
    || hasEntries(delta.upsertedNavies)
    || hasEntries(delta.upsertedBattles)
    || hasEntries(delta.upsertedConvoys)
    || hasEntries(delta.removedSettlementIds)
    || hasEntries(delta.removedPortIds)
    || hasEntries(delta.removedArmyIds)
    || hasEntries(delta.removedNavyIds)
    || hasEntries(delta.removedBattleIds)
    || hasEntries(delta.removedConvoyIds);
}

function snapshotSectionEntries(data: GetWorldGlancesResponse | null, section: WorldGlanceFrameSection): { id: string }[] {
  if (!data) {
    return [];
  }
  if (section === 'settlement') return data.settlements;
  if (section === 'port') return data.ports;
  if (section === 'convoy') return data.convoys;
  if (section === 'army') return data.armies;
  if (section === 'navy') return data.navies;
  return data.battles;
}

function frameHasEntries(frame: WorldGlancesFrameResponse): boolean {
  return WORLD_GLANCE_FRAME_SECTIONS.some(section => worldGlanceFrameEntryCount(frame, section) > 0);
}

const WORLD_GLANCE_FRAME_HEADER_NUMBER_COUNT = NATIVE_BRIDGE_PROTOCOL.strides.worldGlanceFrameHeaderNumbers;
const WORLD_GLANCE_FRAME_BATTLE_NUMBER_STRIDE = NATIVE_BRIDGE_PROTOCOL.strides.worldGlanceBattleNumbers;

function cachedWorldGlancesSnapshot(): GetWorldGlancesResponse | null {
  return normaliseWorldGlancesSnapshot(getCachedBridgeEvent('game.get_world_glances'));
}

function cachedWorldGlancesFrame(): WorldGlancesFrameResponse | null {
  const cached = getCachedBridgeEventByName('game.world_glances_frame');
  return cached ? normaliseFrameEventDetail(cached) : null;
}

type WorldGlancesStoreListener = () => void;

let worldGlancesStoreData = cachedWorldGlancesSnapshot();
let worldGlancesStoreStop: (() => void) | null = null;
let worldGlancesStoreGeneration = 0;
let worldGlancesRefreshInFlight = false;
let worldGlancesRefreshTimer: number | null = null;
let worldGlancesStoreNotifyScheduled = false;
const worldGlancesStoreListeners = new Set<WorldGlancesStoreListener>();

function getWorldGlancesStoreSnapshot(): GetWorldGlancesResponse | null {
  return worldGlancesStoreData;
}

function flushWorldGlancesStoreListeners() {
  worldGlancesStoreNotifyScheduled = false;
  // Re-read listeners at flush time so unsubscribes between schedule and run are honoured.
  const listeners = Array.from(worldGlancesStoreListeners);
  for (const listener of listeners) {
    listener();
  }
}

function publishWorldGlancesStoreData(next: GetWorldGlancesResponse | null) {
  if (next === worldGlancesStoreData) {
    return;
  }

  // Keep the latest snapshot immediately so getSnapshot() is correct for any render already in
  // flight. Defer listener notify so a burst of catalogue deltas in one native turn coalesces to
  // a single React update wave. Notifying useSyncExternalStore synchronously per delta nests
  // SyncLane re-renders until React error #185.
  //
  // Live siege/battle progress must not publish through this store: those values change every
  // camera/simulation frame. Consumers apply frame overlays locally instead.
  worldGlancesStoreData = next;

  if (worldGlancesStoreNotifyScheduled) {
    return;
  }

  worldGlancesStoreNotifyScheduled = true;
  queueMicrotask(flushWorldGlancesStoreListeners);
}

function shouldApplySnapshot(
  current: GetWorldGlancesResponse | null,
  next: GetWorldGlancesResponse | null,
): boolean {
  if (next === current) {
    return false;
  }
  if (!next) {
    return current !== null;
  }
  // Engine catalogue pushes always bump snapshotRevision when content changes. A same-revision
  // payload is a redundant refresh/normalise and must not force React subscribers to re-render.
  if (
    current
    && next.snapshotRevision > 0
    && next.snapshotRevision === current.snapshotRevision
  ) {
    return false;
  }
  return true;
}

function startWorldGlancesStore() {
  if (worldGlancesStoreStop) {
    return;
  }

  const generation = ++worldGlancesStoreGeneration;
  const isActive = () => generation === worldGlancesStoreGeneration;

  const applySnapshot = (next: GetWorldGlancesResponse | null) => {
    if (!isActive() || !shouldApplySnapshot(worldGlancesStoreData, next)) {
      return;
    }
    publishWorldGlancesStoreData(next);
  };

  const refreshSnapshot = () => {
    if (!isActive() || worldGlancesRefreshInFlight) {
      return;
    }

    worldGlancesRefreshInFlight = true;
    bridgeCall('game.get_world_glances')
      .then((next) => {
        const snapshot = normaliseWorldGlancesSnapshot(next);
        if (snapshot) {
          applySnapshot(snapshot);
        }
      })
      .catch((error) => {
        acknowledgeBridgeFailure(error);
        const cached = cachedWorldGlancesSnapshot();
        if (cached) {
          applySnapshot(cached);
        }
      })
      .finally(() => {
        if (isActive()) {
          worldGlancesRefreshInFlight = false;
        }
      });
  };

  const queueRefresh = () => {
    if (!isActive() || worldGlancesRefreshTimer !== null || worldGlancesRefreshInFlight) {
      return;
    }

    worldGlancesRefreshTimer = window.setTimeout(() => {
      worldGlancesRefreshTimer = null;
      refreshSnapshot();
    }, 0);
  };

  const unsubscribeSnapshot = onBridgeEvent('game.get_world_glances', (next) => {
    applySnapshot(normaliseWorldGlancesSnapshot(next));
  });

  const catalogueDeltaHandler = (event: Event) => {
    if (!isActive()) {
      return;
    }

    const rawDelta = (event as CustomEvent<unknown>).detail;
    const delta = rawDelta && typeof rawDelta === 'object'
      ? rawDelta as {
        snapshotRevision?: unknown;
        upsertedSettlements?: unknown;
        upsertedPorts?: unknown;
        upsertedArmies?: unknown;
        upsertedNavies?: unknown;
        upsertedBattles?: unknown;
        upsertedConvoys?: unknown;
        removedSettlementIds?: unknown;
        removedPortIds?: unknown;
        removedArmyIds?: unknown;
        removedNavyIds?: unknown;
        removedBattleIds?: unknown;
        removedConvoyIds?: unknown;
      }
      : {};
    const current = worldGlancesStoreData;
    if (!current) {
      return;
    }

    const nextRevision = typeof delta.snapshotRevision === 'number' && delta.snapshotRevision > 0
      ? delta.snapshotRevision
      : current.snapshotRevision;
    const hasCatalogueChanges = catalogueDeltaHasChanges(delta);
    if (!hasCatalogueChanges && nextRevision === current.snapshotRevision) {
      return;
    }

    const removedIds = (value: unknown) => new Set(
      Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [],
    );
    const settlements = mergeCatalogueEntries(
      current.settlements,
      snapshotEntries<GetWorldGlancesResponse['settlements'][number]>(delta.upsertedSettlements),
      removedIds(delta.removedSettlementIds),
    );
    const ports = mergeCatalogueEntries(
      current.ports,
      snapshotEntries<GetWorldGlancesResponse['ports'][number]>(delta.upsertedPorts),
      removedIds(delta.removedPortIds),
    );
    const armies = mergeCatalogueEntries(
      current.armies,
      snapshotEntries<GetWorldGlancesResponse['armies'][number]>(delta.upsertedArmies),
      removedIds(delta.removedArmyIds),
    );
    const navies = mergeCatalogueEntries(
      current.navies,
      snapshotEntries<GetWorldGlancesResponse['navies'][number]>(delta.upsertedNavies),
      removedIds(delta.removedNavyIds),
    );
    const battles = mergeCatalogueEntries(
      current.battles,
      snapshotEntries<GetWorldGlancesResponse['battles'][number]>(delta.upsertedBattles),
      removedIds(delta.removedBattleIds),
    );
    const convoys = mergeCatalogueEntries(
      current.convoys,
      snapshotEntries<GetWorldGlancesResponse['convoys'][number]>(delta.upsertedConvoys),
      removedIds(delta.removedConvoyIds),
    );

    if (
      nextRevision === current.snapshotRevision
      && settlements === current.settlements
      && ports === current.ports
      && armies === current.armies
      && navies === current.navies
      && battles === current.battles
      && convoys === current.convoys
    ) {
      return;
    }

    publishWorldGlancesStoreData({
      ...current,
      snapshotRevision: nextRevision,
      settlements,
      ports,
      armies,
      navies,
      battles,
      convoys,
    });
  };
  bridgeEvents.addEventListener('game.world_glances_catalogue_delta', catalogueDeltaHandler);

  const unsubscribeFrame = onWorldGlancesFrame((frame) => {
    // Frames only drive placement/progress overlays in the atlas layer. The catalogue store stays
    // on full snapshots and catalogue deltas so high-frequency frames cannot flood React.
    if (!worldGlancesStoreData && frameHasEntries(frame)) {
      queueRefresh();
    }
  });

  worldGlancesStoreStop = () => {
    if (!isActive()) {
      return;
    }
    ++worldGlancesStoreGeneration;
    if (worldGlancesRefreshTimer !== null) {
      window.clearTimeout(worldGlancesRefreshTimer);
      worldGlancesRefreshTimer = null;
    }
    worldGlancesRefreshInFlight = false;
    unsubscribeSnapshot();
    unsubscribeFrame();
    bridgeEvents.removeEventListener('game.world_glances_catalogue_delta', catalogueDeltaHandler);
    worldGlancesStoreStop = null;
  };

  // Catalogue deltas keep a live snapshot current. Only pull a full catalogue when empty so
  // re-subscribes cannot flood game.get_world_glances every render.
  if (!worldGlancesStoreData) {
    refreshSnapshot();
  }
}

function subscribeWorldGlancesStore(listener: WorldGlancesStoreListener) {
  worldGlancesStoreListeners.add(listener);
  startWorldGlancesStore();
  return () => {
    worldGlancesStoreListeners.delete(listener);
    // Keep the store alive for the page lifetime. Stopping on last unsubscribe made any
    // unstable useSyncExternalStore subscribe identity restart the store and re-request full
    // catalogues in a tight loop (max update depth + multi-request-per-frame stalls).
  };
}

function subscribeDisabledWorldGlancesStore() {
  return () => {};
}

export function useWorldGlancesBridge(enabled = true) {
  return useSyncExternalStore(
    enabled ? subscribeWorldGlancesStore : subscribeDisabledWorldGlancesStore,
    getWorldGlancesStoreSnapshot,
    getWorldGlancesStoreSnapshot,
  );
}

export interface WorldGlanceFrameEntry {
  id: string;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: 'flag' | 'name' | 'detailed' | 0 | 1 | 2 | 3;
  selected?: boolean;
  targeted?: boolean;
  besieged?: boolean;
  siegeProgress?: number;
  hasBuildItem?: boolean;
  buildItemProgress?: number;
  attackerStrength?: number;
  attackerMorale?: number;
  attackerLastLosses?: number;
  defenderStrength?: number;
  defenderMorale?: number;
  defenderLastLosses?: number;
}

export interface ObjectWorldGlancesFrameResponse {
  viewportWidth: number;
  viewportHeight: number;
  snapshotRevision: number;
  dragSelectionActive?: boolean;
  dragSelectionStartX: number;
  dragSelectionStartY: number;
  dragSelectionEndX: number;
  dragSelectionEndY: number;
  settlements: WorldGlanceFrameEntry[];
  ports: WorldGlanceFrameEntry[];
  convoys: WorldGlanceFrameEntry[];
  armies: WorldGlanceFrameEntry[];
  navies: WorldGlanceFrameEntry[];
  battles: WorldGlanceFrameEntry[];
}

export interface PackedWorldGlancesFrameResponse {
  packed: typeof PACKED_WORLD_GLANCES_FRAME;
  frameNumbers: number[];
  frameFlags: number[];
  counts: number[];
  entryStrings: string[];
  entryNumbers: number[];
  entryFlags: number[];
}

export type WorldGlancesFrameResponse = ObjectWorldGlancesFrameResponse | PackedWorldGlancesFrameResponse;

export const WORLD_GLANCE_FRAME_SECTIONS: WorldGlanceFrameSection[] = [
  'settlement',
  'port',
  'convoy',
  'army',
  'navy',
  'battle',
];

export function makeWorldGlanceFrameEntryScratch(): WorldGlanceFrameEntry {
  return {
    id: '',
    screenX: 0,
    screenY: 0,
    scale: 1,
    opacity: 0,
    zOrder: 0,
    detailLevel: 0,
  };
}

export function isPackedWorldGlancesFrame(value: unknown): value is PackedWorldGlancesFrameResponse {
  return !!value
    && typeof value === 'object'
    && (value as { packed?: unknown }).packed === PACKED_WORLD_GLANCES_FRAME
    && Array.isArray((value as Partial<PackedWorldGlancesFrameResponse>).frameNumbers)
    && Array.isArray((value as Partial<PackedWorldGlancesFrameResponse>).counts)
    && Array.isArray((value as Partial<PackedWorldGlancesFrameResponse>).entryStrings)
    && Array.isArray((value as Partial<PackedWorldGlancesFrameResponse>).entryNumbers)
    && Array.isArray((value as Partial<PackedWorldGlancesFrameResponse>).entryFlags);
}

export function worldGlanceFrameViewportWidth(frame: WorldGlancesFrameResponse): number {
  return isPackedWorldGlancesFrame(frame) ? frame.frameNumbers[0] ?? 0 : frame.viewportWidth;
}

export function worldGlanceFrameViewportHeight(frame: WorldGlancesFrameResponse): number {
  return isPackedWorldGlancesFrame(frame) ? frame.frameNumbers[1] ?? 0 : frame.viewportHeight;
}

export function worldGlanceFrameSnapshotRevision(frame: WorldGlancesFrameResponse): number {
  return isPackedWorldGlancesFrame(frame) ? frame.frameNumbers[6] ?? 0 : frame.snapshotRevision;
}

export function worldGlanceFrameDragSelectionActive(frame: WorldGlancesFrameResponse): boolean {
  return isPackedWorldGlancesFrame(frame) ? (frame.frameFlags[0] ?? 0) !== 0 : frame.dragSelectionActive === true;
}

export function worldGlanceFrameDragStartX(frame: WorldGlancesFrameResponse): number {
  return isPackedWorldGlancesFrame(frame) ? frame.frameNumbers[2] ?? 0 : frame.dragSelectionStartX;
}

export function worldGlanceFrameDragStartY(frame: WorldGlancesFrameResponse): number {
  return isPackedWorldGlancesFrame(frame) ? frame.frameNumbers[3] ?? 0 : frame.dragSelectionStartY;
}

export function worldGlanceFrameDragEndX(frame: WorldGlancesFrameResponse): number {
  return isPackedWorldGlancesFrame(frame) ? frame.frameNumbers[4] ?? 0 : frame.dragSelectionEndX;
}

export function worldGlanceFrameDragEndY(frame: WorldGlancesFrameResponse): number {
  return isPackedWorldGlancesFrame(frame) ? frame.frameNumbers[5] ?? 0 : frame.dragSelectionEndY;
}

export function worldGlanceFrameEntryCount(frame: WorldGlancesFrameResponse, section: WorldGlanceFrameSection): number {
  if (!isPackedWorldGlancesFrame(frame)) {
    if (section === 'settlement') return frame.settlements.length;
    if (section === 'port') return frame.ports.length;
    if (section === 'convoy') return frame.convoys.length;
    if (section === 'army') return frame.armies.length;
    if (section === 'navy') return frame.navies.length;
    return frame.battles.length;
  }

  return Math.max(frame.counts[WORLD_GLANCE_FRAME_SECTION_INDEX[section]] ?? 0, 0);
}

export function worldGlanceFrameSectionOffset(frame: PackedWorldGlancesFrameResponse, section: WorldGlanceFrameSection): number {
  const sectionIndex = WORLD_GLANCE_FRAME_SECTION_INDEX[section];
  let offset = 0;
  for (let index = 0; index < sectionIndex; index += 1) {
    offset += Math.max(frame.counts[index] ?? 0, 0);
  }
  return offset;
}

function objectFrameSectionEntries(frame: ObjectWorldGlancesFrameResponse, section: WorldGlanceFrameSection): WorldGlanceFrameEntry[] {
  if (section === 'settlement') return frame.settlements;
  if (section === 'port') return frame.ports;
  if (section === 'convoy') return frame.convoys;
  if (section === 'army') return frame.armies;
  if (section === 'navy') return frame.navies;
  return frame.battles;
}

export function worldGlanceFrameEntryId(frame: WorldGlancesFrameResponse, section: WorldGlanceFrameSection, localIndex: number): string {
  if (!isPackedWorldGlancesFrame(frame)) {
    return objectFrameSectionEntries(frame, section)[localIndex]?.id ?? '';
  }

  return frame.entryStrings[worldGlanceFrameSectionOffset(frame, section) + localIndex] ?? '';
}

export function worldGlanceFrameEntrySourceIndex(
  frame: WorldGlancesFrameResponse,
  section: WorldGlanceFrameSection,
  localIndex: number,
): number {
  if (!isPackedWorldGlancesFrame(frame)) {
    return localIndex;
  }

  const entryIndex = worldGlanceFrameSectionOffset(frame, section) + localIndex;
  const flags = frame.entryFlags[entryIndex] ?? 0;
  return flags >> WORLD_GLANCE_FRAME_SOURCE_INDEX_SHIFT;
}

export function worldGlanceFrameEntryIdFromSnapshot(
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
  section: WorldGlanceFrameSection,
  localIndex: number,
): string {
  const id = worldGlanceFrameEntryId(frame, section, localIndex);
  if (id) {
    return id;
  }

  const sourceIndex = worldGlanceFrameEntrySourceIndex(frame, section, localIndex);
  if (sourceIndex < 0) {
    return '';
  }

  return snapshotSectionEntries(data, section)[sourceIndex]?.id ?? '';
}

export function readWorldGlanceFrameEntry(
  frame: WorldGlancesFrameResponse,
  section: WorldGlanceFrameSection,
  localIndex: number,
  out: WorldGlanceFrameEntry,
): WorldGlanceFrameEntry | null {
  if (!isPackedWorldGlancesFrame(frame)) {
    return objectFrameSectionEntries(frame, section)[localIndex] ?? null;
  }

  const entryIndex = worldGlanceFrameSectionOffset(frame, section) + localIndex;
  const numberOffset = entryIndex * WORLD_GLANCE_FRAME_NUMBER_STRIDE;
  const flags = frame.entryFlags[entryIndex] ?? 0;
  out.id = frame.entryStrings[entryIndex] ?? '';
  out.screenX = frame.entryNumbers[numberOffset] ?? 0;
  out.screenY = frame.entryNumbers[numberOffset + 1] ?? 0;
  out.scale = frame.entryNumbers[numberOffset + 2] ?? 1;
  out.opacity = frame.entryNumbers[numberOffset + 3] ?? 1;
  out.zOrder = frame.entryNumbers[numberOffset + 4] ?? 0;
  out.detailLevel = (frame.entryNumbers[numberOffset + 5] ?? 0) as WorldGlanceFrameEntry['detailLevel'];
  out.selected = (flags & WORLD_GLANCE_FRAME_SELECTED_FLAG) !== 0;
  out.targeted = (flags & WORLD_GLANCE_FRAME_TARGETED_FLAG) !== 0;
  out.besieged = (flags & WORLD_GLANCE_FRAME_BESIEGED_FLAG) !== 0;
  out.hasBuildItem = (flags & WORLD_GLANCE_FRAME_HAS_BUILD_ITEM_FLAG) !== 0;
  out.siegeProgress = frame.entryNumbers[numberOffset + 6] ?? 0;
  out.buildItemProgress = frame.entryNumbers[numberOffset + 7];
  out.attackerStrength = undefined;
  out.attackerMorale = undefined;
  out.attackerLastLosses = undefined;
  out.defenderStrength = undefined;
  out.defenderMorale = undefined;
  out.defenderLastLosses = undefined;
  if (section === 'battle') {
    const battleNumberOffset = WORLD_GLANCE_FRAME_HEADER_NUMBER_COUNT
      + localIndex * WORLD_GLANCE_FRAME_BATTLE_NUMBER_STRIDE;
    out.attackerStrength = frame.frameNumbers[battleNumberOffset] ?? 0;
    out.attackerMorale = frame.frameNumbers[battleNumberOffset + 1] ?? 0;
    out.attackerLastLosses = frame.frameNumbers[battleNumberOffset + 2] ?? 0;
    out.defenderStrength = frame.frameNumbers[battleNumberOffset + 3] ?? 0;
    out.defenderMorale = frame.frameNumbers[battleNumberOffset + 4] ?? 0;
    out.defenderLastLosses = frame.frameNumbers[battleNumberOffset + 5] ?? 0;
  }
  return out;
}

type WorldGlancesFrameCallback = (data: WorldGlancesFrameResponse) => void;

const worldGlancesFrameCallbacks = new Set<WorldGlancesFrameCallback>();
let worldGlancesFrameHandlerBound = false;

function isFrameEntryArray(value: unknown): value is WorldGlanceFrameEntry[] {
  return Array.isArray(value);
}

function isNormalisedWorldGlancesFrame(value: unknown): value is WorldGlancesFrameResponse {
  if (isPackedWorldGlancesFrame(value)) {
    return true;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const frame = value as Partial<ObjectWorldGlancesFrameResponse>;
  return typeof frame.viewportWidth === 'number'
    && typeof frame.viewportHeight === 'number'
    && isFrameEntryArray(frame.settlements)
    && isFrameEntryArray(frame.ports)
    && isFrameEntryArray(frame.convoys)
    && isFrameEntryArray(frame.armies)
    && isFrameEntryArray(frame.navies)
    && isFrameEntryArray(frame.battles);
}

function normaliseFrameEventDetail(detail: unknown): WorldGlancesFrameResponse {
  return isNormalisedWorldGlancesFrame(detail)
    ? detail
    : normaliseWorldGlancesFrame(detail);
}

function dispatchWorldGlancesFrame(event: Event) {
  const frame = normaliseFrameEventDetail((event as CustomEvent<unknown>).detail);
  const callbacks = Array.from(worldGlancesFrameCallbacks);
  for (const callback of callbacks) {
    callback(frame);
  }
}

function ensureWorldGlancesFrameHandler() {
  if (worldGlancesFrameHandlerBound) {
    return;
  }

  bridgeEvents.addEventListener('game.world_glances_frame', dispatchWorldGlancesFrame as EventListener);
  worldGlancesFrameHandlerBound = true;
}

function releaseWorldGlancesFrameHandler() {
  if (!worldGlancesFrameHandlerBound || worldGlancesFrameCallbacks.size > 0) {
    return;
  }

  bridgeEvents.removeEventListener('game.world_glances_frame', dispatchWorldGlancesFrame as EventListener);
  worldGlancesFrameHandlerBound = false;
}

export function onWorldGlancesFrame(callback: (data: WorldGlancesFrameResponse) => void): () => void {
  worldGlancesFrameCallbacks.add(callback);
  ensureWorldGlancesFrameHandler();
  const cached = cachedWorldGlancesFrame();
  if (cached) {
    callback(cached);
  }
  return () => {
    worldGlancesFrameCallbacks.delete(callback);
    releaseWorldGlancesFrameHandler();
  };
}

export function handleWorldGlanceInput(kind: string, id: string, mouseButton: 'left' | 'right', shiftKey = false) {
  bridgeCall('game.handle_world_glance_input', {
    kind,
    id,
    mouseButton,
    shiftKey,
  }).catch(acknowledgeBridgeFailure);
}

export function handleWorldGlanceHover(kind: string, id: string, hovered: boolean) {
  bridgeCall('game.handle_world_glance_hover', {
    kind,
    id,
    hovered,
  }).catch(acknowledgeBridgeFailure);
}

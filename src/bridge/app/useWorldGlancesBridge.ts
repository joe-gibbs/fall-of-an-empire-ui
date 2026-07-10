import { useEffect, useMemo, useRef, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetWorldGlancesResponse } from '../../bridge-types.generated.ts';
import { getCachedBridgeEvent, getCachedBridgeEventByName } from '../core/bridgeEventCache';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

function makeGlanceKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

const PACKED_WORLD_GLANCES_FRAME = 'worldGlancesFrame';
const WORLD_GLANCE_FRAME_NUMBER_STRIDE = 8;
const WORLD_GLANCE_FRAME_SELECTED_FLAG = 1 << 0;
const WORLD_GLANCE_FRAME_TARGETED_FLAG = 1 << 1;
const WORLD_GLANCE_FRAME_BESIEGED_FLAG = 1 << 2;
const WORLD_GLANCE_FRAME_HAS_BUILDING_FLAG = 1 << 3;
const WORLD_GLANCE_FRAME_SOURCE_INDEX_SHIFT = 4;

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

function collectKnownGlanceKeys(data: GetWorldGlancesResponse | null): Set<string> {
  const keys = new Set<string>();

  if (!data) {
    return keys;
  }

  for (const entry of data.settlements) keys.add(makeGlanceKey('settlement', entry.id));
  for (const entry of data.ports) keys.add(makeGlanceKey('port', entry.id));
  for (const entry of data.convoys) keys.add(makeGlanceKey('convoy', entry.id));
  for (const entry of data.armies) keys.add(makeGlanceKey('army', entry.id));
  for (const entry of data.navies) keys.add(makeGlanceKey('navy', entry.id));
  for (const entry of data.battles) keys.add(makeGlanceKey('battle', entry.id));

  return keys;
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

function frameHasUnknownEntries(
  frame: WorldGlancesFrameResponse,
  data: GetWorldGlancesResponse | null,
  knownKeys: Set<string>,
): boolean {
  for (const section of WORLD_GLANCE_FRAME_SECTIONS) {
    const count = worldGlanceFrameEntryCount(frame, section);
    for (let index = 0; index < count; index += 1) {
      const id = worldGlanceFrameEntryIdFromSnapshot(data, frame, section, index);
      if (!knownKeys.has(makeGlanceKey(section, id))) {
        return true;
      }
    }
  }

  return false;
}

function frameHasEntries(frame: WorldGlancesFrameResponse): boolean {
  return WORLD_GLANCE_FRAME_SECTIONS.some(section => worldGlanceFrameEntryCount(frame, section) > 0);
}

const FRAME_SETTLEMENT_PROGRESS_EPSILON = 0.0001;
const FRAME_BATTLE_MORALE_EPSILON = 0.001;
const WORLD_GLANCE_FRAME_HEADER_NUMBER_COUNT = 7;
const WORLD_GLANCE_FRAME_BATTLE_NUMBER_STRIDE = 6;

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function mergeFrameSettlementProgress(
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
): GetWorldGlancesResponse | null {
  const settlementCount = worldGlanceFrameEntryCount(frame, 'settlement');
  if (!data || settlementCount === 0) {
    return data;
  }

  const frameSettlementById = new Map<string, { besieged?: boolean; siegeProgress?: number }>();
  const scratch = makeWorldGlanceFrameEntryScratch();
  for (let index = 0; index < settlementCount; index += 1) {
    const entry = readWorldGlanceFrameEntry(frame, 'settlement', index, scratch);
    if (!entry) {
      continue;
    }
    const id = worldGlanceFrameEntryIdFromSnapshot(data, frame, 'settlement', index);
    if (!id) {
      continue;
    }
    if (typeof entry.besieged === 'boolean' || typeof entry.siegeProgress === 'number') {
      frameSettlementById.set(id, {
        besieged: entry.besieged,
        siegeProgress: entry.siegeProgress,
      });
    }
  }

  if (frameSettlementById.size === 0) {
    return data;
  }

  let changed = false;
  const settlements = data.settlements.map((settlement) => {
    const frameEntry = frameSettlementById.get(settlement.id);
    if (!frameEntry) {
      return settlement;
    }

    const besieged = typeof frameEntry.besieged === 'boolean' ? frameEntry.besieged : settlement.besieged;
    const siegeProgress = typeof frameEntry.siegeProgress === 'number'
      ? clampUnit(frameEntry.siegeProgress)
      : settlement.siegeProgress;
    const health = besieged ? 1 - siegeProgress : 1;

    if (
      settlement.besieged === besieged
      && Math.abs(settlement.siegeProgress - siegeProgress) <= FRAME_SETTLEMENT_PROGRESS_EPSILON
      && Math.abs(settlement.health - health) <= FRAME_SETTLEMENT_PROGRESS_EPSILON
    ) {
      return settlement;
    }

    changed = true;
    return {
      ...settlement,
      besieged,
      siegeProgress,
      health,
    };
  });

  return changed ? { ...data, settlements } : data;
}

function mergeFrameBattleValues(
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
): GetWorldGlancesResponse | null {
  const battleCount = worldGlanceFrameEntryCount(frame, 'battle');
  if (!data || battleCount === 0) {
    return data;
  }

  const frameBattleById = new Map<string, Required<Pick<WorldGlanceFrameEntry,
    | 'attackerStrength'
    | 'attackerMorale'
    | 'attackerLastLosses'
    | 'defenderStrength'
    | 'defenderMorale'
    | 'defenderLastLosses'
  >>>();
  const scratch = makeWorldGlanceFrameEntryScratch();
  for (let index = 0; index < battleCount; index += 1) {
    const entry = readWorldGlanceFrameEntry(frame, 'battle', index, scratch);
    const id = worldGlanceFrameEntryIdFromSnapshot(data, frame, 'battle', index);
    if (
      !entry
      || !id
      || entry.attackerStrength === undefined
      || entry.attackerMorale === undefined
      || entry.attackerLastLosses === undefined
      || entry.defenderStrength === undefined
      || entry.defenderMorale === undefined
      || entry.defenderLastLosses === undefined
    ) {
      continue;
    }

    frameBattleById.set(id, {
      attackerStrength: entry.attackerStrength,
      attackerMorale: entry.attackerMorale,
      attackerLastLosses: entry.attackerLastLosses,
      defenderStrength: entry.defenderStrength,
      defenderMorale: entry.defenderMorale,
      defenderLastLosses: entry.defenderLastLosses,
    });
  }

  let changed = false;
  const battles = data.battles.map((battle) => {
    const values = frameBattleById.get(battle.id);
    if (!values) {
      return battle;
    }

    if (
      battle.attacker.totalStrength === values.attackerStrength
      && Math.abs(battle.attacker.morale - values.attackerMorale) <= FRAME_BATTLE_MORALE_EPSILON
      && battle.attacker.lastLosses === values.attackerLastLosses
      && battle.defender.totalStrength === values.defenderStrength
      && Math.abs(battle.defender.morale - values.defenderMorale) <= FRAME_BATTLE_MORALE_EPSILON
      && battle.defender.lastLosses === values.defenderLastLosses
    ) {
      return battle;
    }

    changed = true;
    return {
      ...battle,
      attacker: {
        ...battle.attacker,
        totalStrength: values.attackerStrength,
        morale: values.attackerMorale,
        lastLosses: values.attackerLastLosses,
      },
      defender: {
        ...battle.defender,
        totalStrength: values.defenderStrength,
        morale: values.defenderMorale,
        lastLosses: values.defenderLastLosses,
      },
    };
  });

  return changed ? { ...data, battles } : data;
}

function cachedWorldGlancesSnapshot(): GetWorldGlancesResponse | null {
  return normaliseWorldGlancesSnapshot(getCachedBridgeEvent('game.get_world_glances'));
}

function cachedWorldGlancesFrame(): WorldGlancesFrameResponse | null {
  const cached = getCachedBridgeEventByName('game.world_glances_frame');
  return cached ? normaliseFrameEventDetail(cached) : null;
}

export function useWorldGlancesBridge(enabled = true) {
  const initialData = useMemo(() => cachedWorldGlancesSnapshot(), []);
  const [data, setData] = useState<GetWorldGlancesResponse | null>(() => initialData);
  const dataRef = useRef<GetWorldGlancesResponse | null>(initialData);
  const knownKeysRef = useRef<Set<string>>(collectKnownGlanceKeys(initialData));
  const refreshInFlightRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    const applySnapshot = (next: GetWorldGlancesResponse | null) => {
      if (cancelled) {
        return;
      }

      dataRef.current = next;
      knownKeysRef.current = collectKnownGlanceKeys(next);
      setData(next);
    };

    const refreshSnapshot = () => {
      if (cancelled || refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;
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
          if (!cancelled && cached) {
            applySnapshot(cached);
          }
        })
        .finally(() => {
          refreshInFlightRef.current = false;
        });
    };

    const queueRefresh = () => {
      if (refreshTimerRef.current !== null || refreshInFlightRef.current) {
        return;
      }

      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        refreshSnapshot();
      }, 0);
    };

    const unsub = onBridgeEvent('game.get_world_glances', (next) => {
      applySnapshot(normaliseWorldGlancesSnapshot(next));
    });

    const unsubFrame = onWorldGlancesFrame((frame) => {
      const settlementData = mergeFrameSettlementProgress(dataRef.current, frame);
      const nextData = mergeFrameBattleValues(settlementData, frame);
      if (nextData !== dataRef.current) {
        applySnapshot(nextData);
      }

      if ((!dataRef.current && frameHasEntries(frame)) || frameHasUnknownEntries(frame, dataRef.current, knownKeysRef.current)) {
        queueRefresh();
      }
    });

    refreshSnapshot();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      unsub();
      unsubFrame();
    };
  }, [enabled]);

  return data;
}

export interface WorldGlanceFrameEntry {
  id: string;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: 'flag' | 'name' | 'detailed' | 0 | 1 | 2;
  selected?: boolean;
  targeted?: boolean;
  besieged?: boolean;
  siegeProgress?: number;
  hasBuilding?: boolean;
  buildProgress?: number;
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
  out.hasBuilding = (flags & WORLD_GLANCE_FRAME_HAS_BUILDING_FLAG) !== 0;
  out.siegeProgress = frame.entryNumbers[numberOffset + 6] ?? 0;
  out.buildProgress = frame.entryNumbers[numberOffset + 7] ?? 0;
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

  window.addEventListener('bridge:game.world_glances_frame', dispatchWorldGlancesFrame as EventListener);
  worldGlancesFrameHandlerBound = true;
}

function releaseWorldGlancesFrameHandler() {
  if (!worldGlancesFrameHandlerBound || worldGlancesFrameCallbacks.size > 0) {
    return;
  }

  window.removeEventListener('bridge:game.world_glances_frame', dispatchWorldGlancesFrame as EventListener);
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

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { GetWorldGlancesResponse } from '../../../bridge-types.generated.ts';
import {
  handleWorldGlanceHover,
  handleWorldGlanceInput,
  makeWorldGlanceFrameEntryScratch,
  onWorldGlancesFrame,
  readWorldGlanceFrameEntry,
  useWorldGlancesBridge,
  worldGlanceFrameEntryIdFromSnapshot,
  worldGlanceFrameEntryCount,
  worldGlanceFrameSnapshotRevision,
  worldGlanceFrameViewportHeight,
  worldGlanceFrameViewportWidth,
  type WorldGlanceFrameEntry,
  type WorldGlanceFrameSection,
  type WorldGlancesFrameResponse,
} from '../../../bridge/app/useWorldGlancesBridge';
import ArmyGlance from '../../world-glances/ArmyGlance';
import NavyGlance from '../../world-glances/NavyGlance';
import BattleGlance from '../../world-glances/BattleGlance';
import SettlementGlance from '../../world-glances/SettlementGlance';
import ConvoyGlance from '../../world-glances/ConvoyGlance';
import PortGlance from '../../world-glances/PortGlance';
import type {
  ArmyGlanceData,
  BattleGlanceData,
  ConvoyGlanceData,
  FactionRelation,
  GlanceFactionStub,
  NavyGlanceData,
  PortGlanceData,
  SettlementGlanceData,
  WorldGlanceDetailClass,
} from '../../world-glances/WorldGlanceTypes';
import '../../world-glances/WorldGlances.css';
import './WorldGlanceOverlay.css';

function clampTier(tier: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(tier))) as 1 | 2 | 3 | 4 | 5;
}

function mapFaction(faction: GetWorldGlancesResponse['armies'][number]['faction']): GlanceFactionStub {
  return {
    id: faction.id,
    debugShortId: faction.debugShortId || undefined,
    name: faction.name ?? '',
    colour: faction.colour ?? '#ffffff',
    secondaryColour: faction.secondaryColour ?? faction.colour ?? '#ffffff',
    cultureGroup: faction.cultureGroup ?? '',
    emblem: faction.emblem,
    relation: (faction.relation ?? 'neutral') as FactionRelation,
    isRebel: faction.isRebel ?? false,
  };
}

function mapSettlement(entry: GetWorldGlancesResponse['settlements'][number]): SettlementGlanceData {
  const resources = entry.resources ?? [];
  const culture = entry.culture ?? { label: '', colour: '' };
  const religion = entry.religion ?? { label: '', colour: '' };
  return {
    debugShortId: entry.debugShortId || undefined,
    name: entry.name,
    faction: mapFaction(entry.faction),
    occupier: entry.hasOccupier ? mapFaction(entry.occupier) : undefined,
    isCapital: entry.isCapital ?? false,
    isProvincialCapital: entry.isProvincialCapital ?? false,
    settlementType: entry.settlementType as SettlementGlanceData['settlementType'],
    health: entry.health,
    selected: false,
    targeted: false,
    besieged: entry.besieged,
    siegeProgress: entry.siegeProgress ?? 0,
    fortification: entry.fortification ?? 0,
    fortificationProgress: entry.fortificationProgress ?? 0,
    starving: entry.starving ?? false,
    diseased: entry.diseased ?? false,
    mode: entry.mode as SettlementGlanceData['mode'],
    mapModeId: entry.mapModeId ?? '',
    mapModeLabel: entry.mapModeLabel ?? '',
    monthlyIncome: entry.monthlyIncome ?? 0,
    tradeValue: entry.tradeValue ?? 0,
    corruption: entry.corruption ?? 0,
    population: entry.population ?? 0,
    unrest: entry.unrest ?? 0,
    loyalty: entry.loyalty ?? 0,
    garrison: entry.garrison ?? 0,
    resources: resources.map((resource) => ({
      icon: resource.icon,
      label: resource.label,
      stock: resource.stock,
    })),
    culture: {
      label: culture.label,
      colour: culture.colour,
    },
    religion: {
      label: religion.label,
      colour: religion.colour,
    },
    governorName: entry.governorName ?? '',
    governorDebugShortId: entry.governorDebugShortId || undefined,
    complianceTargetLabel: entry.complianceTargetLabel ?? '',
    complianceTargetName: entry.complianceTargetName ?? '',
    complianceTargetIsRuler: entry.complianceTargetIsRuler ?? false,
    complianceLuxuryLabel: entry.complianceLuxuryLabel ?? '',
    complianceLuxuryStatus: entry.complianceLuxuryStatus ?? '',
    regionName: entry.regionName ?? '',
    landName: entry.landName ?? '',
    domainName: entry.domainName ?? '',
    independent: entry.independent ?? false,
    overlordName: entry.overlordName ?? '',
    bishopName: entry.bishopName ?? '',
    building: entry.hasBuilding ? {
      label: entry.building?.label ?? '',
      progress: entry.building?.progress ?? 0,
    } : undefined,
    warWithPlayer: entry.warWithPlayer ?? false,
  };
}

function mapPort(entry: GetWorldGlancesResponse['ports'][number]): PortGlanceData {
  return {
    debugShortId: entry.debugShortId || undefined,
    name: entry.name,
    settlementName: entry.settlementName,
    faction: mapFaction(entry.faction),
    level: entry.level ?? 0,
    selected: false,
    targeted: false,
    blockaded: entry.blockaded ?? false,
    blockadingNavies: entry.blockadingNavies ?? 0,
    blockadingStrength: entry.blockadingStrength ?? 0,
    dockedNavyName: entry.dockedNavyName || undefined,
    dockedNavyStrength: entry.dockedNavyStrength ?? 0,
    tradeValue: entry.tradeValue ?? 0,
    warWithPlayer: entry.warWithPlayer ?? false,
  };
}

function mapMilitary(entry: GetWorldGlancesResponse['armies'][number]): ArmyGlanceData {
  return {
    debugShortId: entry.debugShortId || undefined,
    name: entry.name,
    commander: entry.commander ?? '',
    currentAction: entry.currentAction ?? '',
    commanderDebugShortId: entry.commanderDebugShortId || undefined,
    faction: mapFaction(entry.faction),
    strength: entry.strength ?? 0,
    maxStrength: entry.maxStrength ?? 0,
    morale: entry.morale ?? 0,
    tier: clampTier(entry.tier),
    raiding: entry.raiding ?? false,
    attrition: entry.attrition ?? false,
    attritionIcon: entry.attritionIcon,
    atWarWithPlayer: entry.atWarWithPlayer ?? false,
    selected: false,
    targeted: false,
  };
}

function mapNavy(entry: GetWorldGlancesResponse['navies'][number]): NavyGlanceData {
  return {
    ...mapMilitary(entry),
    blockading: entry.blockading,
  };
}

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function mapBattle(entry: GetWorldGlancesResponse['battles'][number]): BattleGlanceData {
  return {
    targeted: false,
    attacker: {
      participants: arrayOrEmpty(entry.attacker?.participants).map((participant) => ({
        faction: mapFaction(participant.faction),
        debugShortId: participant.debugShortId || undefined,
        tier: clampTier(participant.tier),
        name: participant.name,
        commander: participant.commander,
        commanderDebugShortId: participant.commanderDebugShortId || undefined,
        strength: participant.strength,
        isNavy: participant.isNavy,
      })),
      totalStrength: entry.attacker.totalStrength,
      morale: entry.attacker.morale,
      lastLosses: entry.attacker.lastLosses,
    },
    defender: {
      participants: arrayOrEmpty(entry.defender?.participants).map((participant) => ({
        faction: mapFaction(participant.faction),
        debugShortId: participant.debugShortId || undefined,
        tier: clampTier(participant.tier),
        name: participant.name,
        commander: participant.commander,
        commanderDebugShortId: participant.commanderDebugShortId || undefined,
        strength: participant.strength,
        isNavy: participant.isNavy,
      })),
      totalStrength: entry.defender.totalStrength,
      morale: entry.defender.morale,
      lastLosses: entry.defender.lastLosses,
    },
  };
}

function mapConvoy(entry: GetWorldGlancesResponse['convoys'][number]): ConvoyGlanceData {
  return {
    debugHandle: entry.debugHandle || undefined,
    faction: mapFaction(entry.faction),
    originName: entry.originName,
    destinationName: entry.destinationName,
    purpose: entry.purpose,
    purposeDetails: entry.purposeDetails,
    progress: entry.progress,
    etaDays: entry.etaDays,
    cargoLoad: entry.cargoLoad,
    routeType: entry.routeType === 'sea' ? 'sea' : 'road',
    clusterCount: entry.clusterCount,
    cargo: entry.cargo.map((item) => ({
      icon: item.icon,
      label: item.label,
      amount: item.amount,
    })),
  };
}

type WorldGlanceDetailLevel = 'flag' | 'name' | 'detailed' | 0 | 1 | 2;

function detailClass(detailLevel: WorldGlanceDetailLevel | string | number): WorldGlanceDetailClass {
  switch (detailLevel) {
    case 'flag':
    case 0:
      return 'detail-flag';
    case 'name':
    case 1:
      return 'detail-name';
    case 'detailed':
    case 2:
    default: return 'detail-detailed';
  }
}

interface OverlaySize {
  width: number;
  height: number;
}

interface ScreenPosition {
  x: number;
  y: number;
}

interface GlanceWidgetVisibilityEvent {
  visible?: boolean;
}

type WorldGlanceNodeEntry = {
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: WorldGlanceDetailLevel | string | number;
  selected?: boolean;
  targeted?: boolean;
};

type WorldGlanceNodeState = {
  node: HTMLDivElement;
  transform: string;
  opacity: string;
  zIndex: string;
  attached: boolean;
  detailClass?: WorldGlanceDetailClass;
  pendingDetailClass?: WorldGlanceDetailClass;
  selected?: boolean;
  targeted?: boolean;
  hasMilitarySelection?: boolean;
  canCommandTarget?: boolean;
  visible: boolean;
  mounted: boolean;
  prewarmed: boolean;
  seenFrame: number;
  visibilityPopQueued: boolean;
  visibilityPopTimer: number | null;
};

type WorldGlanceNodeStateMap = Record<string, WorldGlanceNodeState | undefined>;
const SETTLEMENT_VISIBILITY_POP_CLASS = 'is-visible-pop';
const SETTLEMENT_VISIBLE_OPACITY_THRESHOLD = 0.05;
const VISIBILITY_POP_DURATION_MS = 180;
const SETTLEMENT_GLANCE_OFFSET_X = '-1.9091rem';
const SETTLEMENT_GLANCE_OFFSET_Y = '-2.1364rem';
const INITIAL_NODE_STYLE = {
  display: 'none',
  opacity: '0',
  visibility: 'hidden',
  pointerEvents: 'none',
} satisfies CSSProperties;
const WORLD_GLANCE_Z_INDEX_DIVISOR = 1000;
const WORLD_GLANCE_MAX_Z_INDEX = 36;
const MASS_DETAIL_CHANGE_LIMIT = Number.MAX_SAFE_INTEGER;
const DETAIL_FLUSH_DELAY_MS = 180;
const DETAIL_FLUSH_BATCH_SIZE = 4;
const DETAIL_FLUSH_BATCH_INTERVAL_MS = 32;
const GLANCE_CONTENT_HYDRATION_BATCH_SIZE = 8;

type HydrationCallback = () => void;

const glanceContentHydrationQueue = new Set<HydrationCallback>();
let glanceContentHydrationFrame: number | null = null;
let glanceContentHydrationPaused = false;

function scheduleGlanceContentHydration() {
  if (glanceContentHydrationPaused || glanceContentHydrationFrame !== null || glanceContentHydrationQueue.size === 0) {
    return;
  }

  glanceContentHydrationFrame = window.requestAnimationFrame(() => {
    glanceContentHydrationFrame = null;
    const callbacks = Array.from(glanceContentHydrationQueue).slice(0, GLANCE_CONTENT_HYDRATION_BATCH_SIZE);
    for (const callback of callbacks) {
      glanceContentHydrationQueue.delete(callback);
      callback();
    }
    scheduleGlanceContentHydration();
  });
}

function enqueueGlanceContentHydration(callback: HydrationCallback) {
  glanceContentHydrationQueue.add(callback);
  scheduleGlanceContentHydration();
}

function cancelGlanceContentHydration(callback: HydrationCallback) {
  glanceContentHydrationQueue.delete(callback);
}

function setGlanceContentHydrationPaused(paused: boolean) {
  if (glanceContentHydrationPaused === paused) {
    return;
  }

  glanceContentHydrationPaused = paused;
  if (paused) {
    if (glanceContentHydrationFrame !== null) {
      window.cancelAnimationFrame(glanceContentHydrationFrame);
      glanceContentHydrationFrame = null;
    }
    return;
  }

  scheduleGlanceContentHydration();
}

function formatPx(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const quantized = Math.round(value * 2) / 2;
  if (Math.abs(quantized) < 0.0001) return '0';
  return `${quantized.toFixed(1).replace(/\.0$/, '')}px`;
}

function formatOpacity(value: number): string {
  return Number.isFinite(value) && value <= SETTLEMENT_VISIBLE_OPACITY_THRESHOLD ? '0' : '1';
}

function frameEntryInteractive(entry: WorldGlanceNodeEntry): boolean {
  return Number.isFinite(entry.opacity) && entry.opacity > SETTLEMENT_VISIBLE_OPACITY_THRESHOLD;
}

function parseOpacity(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 1;
}

function formatScale(value: number): string {
  if (!Number.isFinite(value)) return '1';
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function formatFrameProgressWidth(value: number | undefined): string {
  if (!Number.isFinite(value)) return '0%';
  const clamped = Math.max(0, Math.min(1, value as number));
  return `${(clamped * 100).toFixed(2)}%`;
}

function localGlanceZIndex(kind: string, zOrder: number): number {
  const zIndex = Math.round(zOrder / WORLD_GLANCE_Z_INDEX_DIVISOR);
  if (!Number.isFinite(zIndex)) {
    return 1;
  }

  const kindBoost = kind === 'army' || kind === 'navy' ? 10 : 0;
  return Math.max(1, Math.min(WORLD_GLANCE_MAX_Z_INDEX, zIndex + kindBoost));
}

function nodeTransform(
  kind: string,
  entry: WorldGlanceNodeEntry,
  overlaySize: OverlaySize,
  viewportWidth: number,
  viewportHeight: number,
): string {
  const positionScaleX = viewportWidth > 0 && overlaySize.width > 0 ? overlaySize.width / viewportWidth : 1;
  const positionScaleY = viewportHeight > 0 && overlaySize.height > 0 ? overlaySize.height / viewportHeight : 1;
  const translateX = entry.screenX * positionScaleX;
  const translateY = entry.screenY * positionScaleY;
  const position = `${formatPx(translateX)}, ${formatPx(translateY)}`;
  const scale = formatScale(entry.scale);

  return kind === 'settlement'
    ? `translate3d(${position}, 0) scale(${scale}) translate3d(${SETTLEMENT_GLANCE_OFFSET_X}, ${SETTLEMENT_GLANCE_OFFSET_Y}, 0)`
    : `translate3d(${position}, 0) translate3d(-50%, -50%, 0) scale(${scale})`;
}

function frameScreenPosition(
  entry: WorldGlanceNodeEntry,
  overlaySize: OverlaySize,
  viewportWidth: number,
  viewportHeight: number,
): ScreenPosition {
  const positionScaleX = viewportWidth > 0 && overlaySize.width > 0 ? overlaySize.width / viewportWidth : 1;
  const positionScaleY = viewportHeight > 0 && overlaySize.height > 0 ? overlaySize.height / viewportHeight : 1;

  return {
    x: entry.screenX * positionScaleX,
    y: entry.screenY * positionScaleY,
  };
}

function findFrameEntry(
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
  section: WorldGlanceFrameSection,
  id: string,
  out: WorldGlanceFrameEntry,
): WorldGlanceFrameEntry | null {
  const count = worldGlanceFrameEntryCount(frame, section);
  for (let index = 0; index < count; index += 1) {
    const entry = readWorldGlanceFrameEntry(frame, section, index, out);
    if (entry && worldGlanceFrameEntryIdFromSnapshot(data, frame, section, index) === id) {
      return entry;
    }
  }

  return null;
}

function hidePortSettlementLine(line: HTMLDivElement | null) {
  if (!line) {
    return;
  }

  if (line.style.display !== 'none') {
    line.style.display = 'none';
  }
  line.style.visibility = 'hidden';
}

function updatePortSettlementLineElement(
  line: HTMLDivElement | null,
  portId: string | null,
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse | null,
  overlaySize: OverlaySize,
) {
  if (!line || !portId || !data || !frame) {
    hidePortSettlementLine(line);
    return;
  }

  const portScratch = makeWorldGlanceFrameEntryScratch();
  const settlementScratch = makeWorldGlanceFrameEntryScratch();
  const portEntry = findFrameEntry(data, frame, 'port', portId, portScratch);
  const settlementEntry = findFrameEntry(data, frame, 'settlement', portId, settlementScratch);
  if (!portEntry || !settlementEntry || !frameEntryInteractive(portEntry) || !frameEntryInteractive(settlementEntry)) {
    hidePortSettlementLine(line);
    return;
  }

  const viewportWidth = worldGlanceFrameViewportWidth(frame);
  const viewportHeight = worldGlanceFrameViewportHeight(frame);
  const portPosition = frameScreenPosition(portEntry, overlaySize, viewportWidth, viewportHeight);
  const settlementPosition = frameScreenPosition(settlementEntry, overlaySize, viewportWidth, viewportHeight);
  const deltaX = settlementPosition.x - portPosition.x;
  const deltaY = settlementPosition.y - portPosition.y;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (!Number.isFinite(length) || length <= 0.5) {
    hidePortSettlementLine(line);
    return;
  }

  const angleDeg = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
  line.style.display = 'block';
  line.style.visibility = 'visible';
  line.style.width = formatPx(length);
  line.style.transform = `translate3d(${formatPx(portPosition.x)}, ${formatPx(portPosition.y)}, 0) rotate(${angleDeg.toFixed(2)}deg)`;
}

function handleMouseDown(kind: string, id: string, event: MouseEvent<HTMLDivElement>) {
  if (event.button !== 0 && event.button !== 2) return;
  event.preventDefault();
  event.stopPropagation();
  handleWorldGlanceInput(kind, id, event.button === 2 ? 'right' : 'left', event.shiftKey);
}

function nodeKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

function makeNodeState(node: HTMLDivElement, attached = false): WorldGlanceNodeState {
  const nodeOpacity = parseOpacity(node.style.opacity);
  const existingDetailClass = node.classList.contains('detail-flag')
    ? 'detail-flag'
    : node.classList.contains('detail-name')
      ? 'detail-name'
      : node.classList.contains('detail-detailed')
        ? 'detail-detailed'
        : undefined;

  return {
    node,
    transform: node.style.transform,
    opacity: node.style.opacity,
    zIndex: node.style.zIndex,
    attached,
    detailClass: existingDetailClass,
    selected: node.classList.contains('is-selected'),
    targeted: node.classList.contains('is-targeted'),
    hasMilitarySelection: node.classList.contains('has-command-selection'),
    canCommandTarget: node.classList.contains('can-command-target'),
    visible: node.style.display !== 'none' && node.style.visibility !== 'hidden',
    mounted: true,
    prewarmed: nodeOpacity <= SETTLEMENT_VISIBLE_OPACITY_THRESHOLD,
    seenFrame: 0,
    visibilityPopQueued: false,
    visibilityPopTimer: null,
  };
}

function clearVisibilityPop(state: WorldGlanceNodeState) {
  if (state.visibilityPopTimer !== null) {
    window.clearTimeout(state.visibilityPopTimer);
    state.visibilityPopTimer = null;
  }

  state.visibilityPopQueued = false;
  state.node.classList.remove(SETTLEMENT_VISIBILITY_POP_CLASS);
}

function canPlayVisibilityPop(kind: string): boolean {
  return kind === 'settlement' || kind === 'port' || kind === 'battle';
}

function detailClassForNode(state: WorldGlanceNodeState, detailLevel: WorldGlanceDetailLevel | string | number): WorldGlanceDetailClass {
  return state.attached ? 'detail-flag' : detailClass(detailLevel);
}

function applyDetailClass(state: WorldGlanceNodeState, nextClass: WorldGlanceDetailClass) {
  const node = state.node;
  if (state.detailClass === nextClass) {
    state.pendingDetailClass = undefined;
    return;
  }

  if (state.detailClass) {
    node.classList.remove(state.detailClass);
  } else {
    node.classList.remove('detail-flag', 'detail-name', 'detail-detailed');
  }
  node.classList.add(nextClass);
  state.detailClass = nextClass;
  state.pendingDetailClass = undefined;
}

function queueDetailClass(state: WorldGlanceNodeState, nextClass: WorldGlanceDetailClass, applyImmediately: boolean) {
  if (applyImmediately) {
    applyDetailClass(state, nextClass);
  } else if (state.detailClass !== nextClass) {
    state.pendingDetailClass = nextClass;
  } else {
    state.pendingDetailClass = undefined;
  }
}

function flushPendingDetailClasses(nodeStates: WorldGlanceNodeStateMap, limit: number): boolean {
  let applied = 0;
  let hasRemaining = false;

  for (const key in nodeStates) {
    const state = nodeStates[key];
    if (!state?.pendingDetailClass) {
      continue;
    }

    if (!state.visible) {
      state.pendingDetailClass = undefined;
      continue;
    }

    if (applied >= limit) {
      hasRemaining = true;
      continue;
    }

    if (state.pendingDetailClass) {
      applyDetailClass(state, state.pendingDetailClass);
      applied += 1;
    }
  }

  return hasRemaining;
}

function applyClassToggle(node: HTMLDivElement, className: string, current: boolean | undefined, next: boolean): boolean {
  if (current !== next) {
    node.classList.toggle(className, next);
  }
  return next;
}

function applySettlementProgressFrame(node: HTMLDivElement, entry: WorldGlanceFrameEntry) {
  const siegeFill = node.querySelector<HTMLElement>('.gset-siege-progress-fill');
  if (siegeFill) {
    siegeFill.style.width = formatFrameProgressWidth(entry.siegeProgress);
  }

  const buildBar = node.querySelector<HTMLElement>('.gset-build-bar');
  const buildFill = node.querySelector<HTMLElement>('.gset-build-bar-fill');
  if (!buildBar || !buildFill || typeof entry.hasBuilding !== 'boolean') {
    return;
  }

  const showBuildBar = entry.hasBuilding && entry.besieged !== true;
  buildBar.style.display = showBuildBar ? '' : 'none';
  buildFill.style.width = formatFrameProgressWidth(entry.buildProgress);
}

function applyNodeFrame(
  kind: string,
  state: WorldGlanceNodeState,
  entry: WorldGlanceFrameEntry,
  overlaySize: OverlaySize,
  viewportWidth: number,
  viewportHeight: number,
  hasMilitarySelection: boolean,
  applyDetailImmediately: boolean,
  queueVisibilityPop: (kind: string, state: WorldGlanceNodeState) => void,
): boolean {
  const node = state.node;
  const localZIndex = localGlanceZIndex(kind, entry.zOrder);
  const zIndex = String(localZIndex);
  const opacity = formatOpacity(entry.opacity);
  const transform = nodeTransform(kind, entry, overlaySize, viewportWidth, viewportHeight);
  const wasHidden = !state.visible;
  const wasPrewarmed = state.prewarmed;
  const previousOpacity = parseOpacity(state.opacity);
  const nextOpacity = parseOpacity(opacity);
  const interactive = nextOpacity > SETTLEMENT_VISIBLE_OPACITY_THRESHOLD;
  const canCommandTarget = hasMilitarySelection && (
    kind === 'settlement'
    || kind === 'port'
    || kind === 'battle'
    || ((kind === 'army' || kind === 'navy') && !entry.selected)
  );

  if (!state.attached && state.transform !== transform) {
    node.style.transform = transform;
    state.transform = transform;
  }

  if (!interactive) {
    hideNode(state);
    return false;
  }

  if (node.style.display !== 'block') {
    node.style.display = 'block';
  }

  if (state.opacity !== opacity) {
    node.style.opacity = opacity;
    state.opacity = opacity;
  }

  if (!state.attached && state.zIndex !== zIndex) {
    node.style.zIndex = zIndex;
    state.zIndex = zIndex;
  }

  if (!state.visible) {
    node.style.visibility = 'visible';
    state.visible = true;
  }

  const pointerEvents = interactive ? 'auto' : 'none';
  if (node.style.pointerEvents !== pointerEvents) {
    node.style.pointerEvents = pointerEvents;
  }
  state.prewarmed = !interactive;

  if (
    (wasHidden && interactive)
    || (
      kind === 'settlement'
      && previousOpacity <= SETTLEMENT_VISIBLE_OPACITY_THRESHOLD
      && nextOpacity > SETTLEMENT_VISIBLE_OPACITY_THRESHOLD
      && !wasPrewarmed
    )
  ) {
    queueVisibilityPop(kind, state);
  }

  queueDetailClass(state, detailClassForNode(state, entry.detailLevel), applyDetailImmediately);
  state.selected = applyClassToggle(node, 'is-selected', state.selected, Boolean(entry.selected));
  state.targeted = applyClassToggle(node, 'is-targeted', state.targeted, Boolean(entry.targeted));
  state.hasMilitarySelection = applyClassToggle(node, 'has-command-selection', state.hasMilitarySelection, hasMilitarySelection);
  state.canCommandTarget = applyClassToggle(node, 'can-command-target', state.canCommandTarget, canCommandTarget);
  if (kind === 'settlement') {
    applySettlementProgressFrame(node, entry);
  }
  return true;
}

function hideNode(state: WorldGlanceNodeState) {
  const node = state.node;
  clearVisibilityPop(state);
  state.pendingDetailClass = undefined;

  if (node.style.display !== 'none') {
    node.style.display = 'none';
  }

  if (state.opacity !== '0') {
    node.style.opacity = '0';
    state.opacity = '0';
  }

  if (state.visible) {
    node.style.visibility = 'hidden';
    node.style.pointerEvents = 'none';
    state.visible = false;
    state.prewarmed = false;
  }
}

function applyFrameEntries(
  kind: WorldGlanceFrameSection,
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
  nodeStates: WorldGlanceNodeStateMap,
  overlaySize: OverlaySize,
  viewportWidth: number,
  viewportHeight: number,
  hasMilitarySelection: boolean,
  seenFrame: number,
  applyDetailImmediately: boolean,
  queueVisibilityPop: (kind: string, state: WorldGlanceNodeState) => void,
  currentFrameKeys: Set<string>,
  visibleNodeKeys: Set<string>,
) {
  const count = worldGlanceFrameEntryCount(frame, kind);
  const scratch = makeWorldGlanceFrameEntryScratch();
  for (let index = 0; index < count; index += 1) {
    const entry = readWorldGlanceFrameEntry(frame, kind, index, scratch);
    if (!entry) {
      continue;
    }

    const id = worldGlanceFrameEntryIdFromSnapshot(data, frame, kind, index);
    if (!id) {
      continue;
    }

    const key = nodeKey(kind, id);
    const state = nodeStates[key];
    if (!state) {
      continue;
    }

    state.seenFrame = seenFrame;
    currentFrameKeys.add(key);
    if (applyNodeFrame(kind, state, entry, overlaySize, viewportWidth, viewportHeight, hasMilitarySelection, applyDetailImmediately, queueVisibilityPop)) {
      visibleNodeKeys.add(key);
    } else {
      visibleNodeKeys.delete(key);
    }
  }
}

function countDetailChangesForEntries(
  kind: WorldGlanceFrameSection,
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
  nodeStates: WorldGlanceNodeStateMap,
): number {
  let count = 0;

  const entryCount = worldGlanceFrameEntryCount(frame, kind);
  const scratch = makeWorldGlanceFrameEntryScratch();
  for (let index = 0; index < entryCount; index += 1) {
    const entry = readWorldGlanceFrameEntry(frame, kind, index, scratch);
    if (!entry) {
      continue;
    }

    if (!frameEntryInteractive(entry)) {
      continue;
    }

    const id = worldGlanceFrameEntryIdFromSnapshot(data, frame, kind, index);
    if (!id) {
      continue;
    }

    const state = nodeStates[nodeKey(kind, id)];
    if (state && state.detailClass !== detailClassForNode(state, entry.detailLevel)) {
      count += 1;
    }
  }

  return count;
}

function countDetailChangesForFrame(
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
  nodeStates: WorldGlanceNodeStateMap,
): number {
  return countDetailChangesForEntries('settlement', data, frame, nodeStates)
    + countDetailChangesForEntries('port', data, frame, nodeStates)
    + countDetailChangesForEntries('convoy', data, frame, nodeStates)
    + countDetailChangesForEntries('army', data, frame, nodeStates)
    + countDetailChangesForEntries('navy', data, frame, nodeStates)
    + countDetailChangesForEntries('battle', data, frame, nodeStates);
}

function frameHasGlanceEntries(frame: WorldGlancesFrameResponse): boolean {
  return worldGlanceFrameEntryCount(frame, 'settlement') > 0
    || worldGlanceFrameEntryCount(frame, 'port') > 0
    || worldGlanceFrameEntryCount(frame, 'convoy') > 0
    || worldGlanceFrameEntryCount(frame, 'army') > 0
    || worldGlanceFrameEntryCount(frame, 'navy') > 0
    || worldGlanceFrameEntryCount(frame, 'battle') > 0;
}

function snapshotHasGlanceEntries(data: GetWorldGlancesResponse | null): boolean {
  return !!data && (
    data.settlements.length > 0
    || data.ports.length > 0
    || data.convoys.length > 0
    || data.armies.length > 0
    || data.navies.length > 0
    || data.battles.length > 0
  );
}

function frameEntriesHaveMountedNode(
  kind: WorldGlanceFrameSection,
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
  nodeStates: WorldGlanceNodeStateMap,
): boolean {
  const count = worldGlanceFrameEntryCount(frame, kind);
  const scratch = makeWorldGlanceFrameEntryScratch();
  for (let index = 0; index < count; index += 1) {
    const entry = readWorldGlanceFrameEntry(frame, kind, index, scratch);
    if (!entry) {
      continue;
    }
    const id = worldGlanceFrameEntryIdFromSnapshot(data, frame, kind, index);
    if (id && nodeStates[nodeKey(kind, id)]) {
      return true;
    }
  }

  return false;
}

function frameHasMountedNode(
  data: GetWorldGlancesResponse | null,
  frame: WorldGlancesFrameResponse,
  nodeStates: WorldGlanceNodeStateMap,
): boolean {
  return frameEntriesHaveMountedNode('settlement', data, frame, nodeStates)
    || frameEntriesHaveMountedNode('port', data, frame, nodeStates)
    || frameEntriesHaveMountedNode('convoy', data, frame, nodeStates)
    || frameEntriesHaveMountedNode('army', data, frame, nodeStates)
    || frameEntriesHaveMountedNode('navy', data, frame, nodeStates)
    || frameEntriesHaveMountedNode('battle', data, frame, nodeStates);
}

function GlanceNode({
  kind,
  id,
  attached = false,
  nodeRef,
  onHoverChange,
  renderContent,
  deferContent = true,
  hydrationEnabled = true,
}: {
  kind: string;
  id: string;
  attached?: boolean;
  nodeRef?: (kind: string, id: string, node: HTMLDivElement | null, attached?: boolean) => void;
  onHoverChange?: (kind: string, id: string, hovered: boolean) => void;
  renderContent: () => ReactNode;
  deferContent?: boolean;
  hydrationEnabled?: boolean;
}) {
  const lastRightMouseDownRef = useRef(0);
  const isHoveredTargetRef = useRef(false);
  const contentKey = `${kind}:${id}`;
  const [hydratedContentKey, setHydratedContentKey] = useState<string | null>(null);
  const contentReady = !deferContent || hydratedContentKey === contentKey;
  const hydrateContent = useCallback(() => {
    setHydratedContentKey(contentKey);
  }, [contentKey]);
  const setRootNode = useCallback((node: HTMLDivElement | null) => {
    nodeRef?.(kind, id, node, attached);
  }, [attached, id, kind, nodeRef]);

  useEffect(() => {
    if (!deferContent || contentReady || !hydrationEnabled) {
      return undefined;
    }

    enqueueGlanceContentHydration(hydrateContent);
    return () => cancelGlanceContentHydration(hydrateContent);
  }, [contentReady, deferContent, hydrateContent, hydrationEnabled]);

  const setHovered = (hovered: boolean) => {
    if (isHoveredTargetRef.current === hovered) {
      return;
    }

    isHoveredTargetRef.current = hovered;
    if (hovered && deferContent) {
      cancelGlanceContentHydration(hydrateContent);
      hydrateContent();
    }
    handleWorldGlanceHover(kind, id, hovered);
    onHoverChange?.(kind, id, hovered);
  };

  const onMouseOver = (event: MouseEvent<HTMLDivElement>) => {
    const relatedNode = event.relatedTarget as Node | null;
    if (relatedNode && event.currentTarget.contains(relatedNode)) {
      return;
    }
    setHovered(true);
  };

  const onMouseOut = (event: MouseEvent<HTMLDivElement>) => {
    const relatedNode = event.relatedTarget as Node | null;
    if (relatedNode && event.currentTarget.contains(relatedNode)) {
      return;
    }
    setHovered(false);
  };

  useEffect(() => () => {
    if (isHoveredTargetRef.current) {
      handleWorldGlanceHover(kind, id, false);
      onHoverChange?.(kind, id, false);
    }
  }, [id, kind, onHoverChange]);

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button === 2) {
      lastRightMouseDownRef.current = Date.now();
    }
    handleMouseDown(kind, id, event);
  };

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - lastRightMouseDownRef.current > 250) {
      handleWorldGlanceInput(kind, id, 'right', event.shiftKey);
    }
  };

  return (
    <div
      ref={setRootNode}
      className={`world-glance world-glance-node world-glance-node--${kind}${attached ? ' world-glance-node--attached' : ''} detail-flag`}
      style={INITIAL_NODE_STYLE}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      <div className="glance-tip world-glance-tip">
        {contentReady ? renderContent() : <GlanceContentPlaceholder kind={kind} />}
      </div>
    </div>
  );
}

function GlanceContentPlaceholder({ kind }: { kind: string }) {
  return <div className={`glance glance-placeholder glance-placeholder--${kind}`} aria-hidden="true" />;
}

interface WorldGlanceOverlayProps {
  visible?: boolean;
}

export default function WorldGlanceOverlay({ visible = true }: WorldGlanceOverlayProps) {
  const data = useWorldGlancesBridge(true);
  const hasData = data !== null;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const nodeStates = useRef<WorldGlanceNodeStateMap>({});
  const frameSerialRef = useRef(0);
  const latestFrameRef = useRef<WorldGlancesFrameResponse | null>(null);
  const applyFrameSnapshotRef = useRef<(frame: WorldGlancesFrameResponse | null) => void>(() => {});
  const dataRef = useRef<GetWorldGlancesResponse | null>(data);
  const visibleNodeKeysRef = useRef<Set<string>>(new Set());
  const portSettlementLineRef = useRef<HTMLDivElement | null>(null);
  const hoveredPortIdRef = useRef<string | null>(null);
  const hasAppliedNonEmptyFrameSinceDataRef = useRef(false);
  const [overlaySize, setOverlaySize] = useState<OverlaySize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));
  const [glanceWidgetsVisible, setGlanceWidgetsVisible] = useState(true);
  const overlaySizeRef = useRef(overlaySize);
  const detailFlushTimerRef = useRef<number | null>(null);
  const frameReplayRequestRef = useRef<number | null>(null);

  const scheduleDetailFlush = (delayMs: number) => {
    if (detailFlushTimerRef.current !== null) {
      window.clearTimeout(detailFlushTimerRef.current);
    }

    detailFlushTimerRef.current = window.setTimeout(() => {
      detailFlushTimerRef.current = null;
      const hasRemaining = flushPendingDetailClasses(nodeStates.current, DETAIL_FLUSH_BATCH_SIZE);
      if (hasRemaining) {
        scheduleDetailFlush(DETAIL_FLUSH_BATCH_INTERVAL_MS);
      }
    }, delayMs);
  };

  const queueVisibilityPop = (kind: string, state: WorldGlanceNodeState) => {
    if (!canPlayVisibilityPop(kind)) {
      return;
    }

    clearVisibilityPop(state);
    state.visibilityPopQueued = true;
    state.node.classList.add(SETTLEMENT_VISIBILITY_POP_CLASS);
    state.visibilityPopTimer = window.setTimeout(() => {
      state.visibilityPopTimer = null;
      state.visibilityPopQueued = false;
      state.node.classList.remove(SETTLEMENT_VISIBILITY_POP_CLASS);
    }, VISIBILITY_POP_DURATION_MS);
  };

  const updatePortSettlementHoverLine = useCallback(() => {
    updatePortSettlementLineElement(
      portSettlementLineRef.current,
      hoveredPortIdRef.current,
      dataRef.current,
      latestFrameRef.current,
      overlaySizeRef.current,
    );
  }, []);

  const handleGlanceHoverChange = useCallback((kind: string, id: string, hovered: boolean) => {
    if (kind !== 'port') {
      return;
    }

    if (hovered) {
      hoveredPortIdRef.current = id;
    } else if (hoveredPortIdRef.current === id) {
      hoveredPortIdRef.current = null;
    }

    updatePortSettlementHoverLine();
  }, [updatePortSettlementHoverLine]);

  const scheduleFrameReplay = useCallback(() => {
    if (frameReplayRequestRef.current !== null || latestFrameRef.current === null) {
      return;
    }

    frameReplayRequestRef.current = window.requestAnimationFrame(() => {
      frameReplayRequestRef.current = null;
      applyFrameSnapshotRef.current(latestFrameRef.current);
    });
  }, []);

  const applyFrameSnapshot = (frame: WorldGlancesFrameResponse | null) => {
    if (!frame) {
      return;
    }

    const currentNodeStates = nodeStates.current;
    const currentData = dataRef.current;
    if (currentData && worldGlanceFrameSnapshotRevision(frame) !== currentData.snapshotRevision) {
      return;
    }

    const hasFrameEntries = frameHasGlanceEntries(frame);
    const hasSnapshotEntries = snapshotHasGlanceEntries(currentData);
    if (hasSnapshotEntries) {
      if (!hasFrameEntries && !hasAppliedNonEmptyFrameSinceDataRef.current) {
        return;
      }

      if (hasFrameEntries && !frameHasMountedNode(currentData, frame, currentNodeStates)) {
        return;
      }
    }

    const seenFrame = frameSerialRef.current + 1;
    frameSerialRef.current = seenFrame;
    const currentOverlaySize = overlaySizeRef.current;
    const armyScratch = makeWorldGlanceFrameEntryScratch();
    const navyScratch = makeWorldGlanceFrameEntryScratch();
    let hasMilitarySelection = false;
    for (let index = 0; index < worldGlanceFrameEntryCount(frame, 'army'); index += 1) {
      if (readWorldGlanceFrameEntry(frame, 'army', index, armyScratch)?.selected) {
        hasMilitarySelection = true;
        break;
      }
    }
    if (!hasMilitarySelection) {
      for (let index = 0; index < worldGlanceFrameEntryCount(frame, 'navy'); index += 1) {
        if (readWorldGlanceFrameEntry(frame, 'navy', index, navyScratch)?.selected) {
          hasMilitarySelection = true;
          break;
        }
      }
    }
    const detailChangeCount = countDetailChangesForFrame(currentData, frame, currentNodeStates);
    const applyDetailImmediately = detailChangeCount <= MASS_DETAIL_CHANGE_LIMIT;
    const currentFrameKeys = new Set<string>();
    const visibleNodeKeys = visibleNodeKeysRef.current;
    const viewportWidth = worldGlanceFrameViewportWidth(frame);
    const viewportHeight = worldGlanceFrameViewportHeight(frame);

    if (!applyDetailImmediately) {
      scheduleDetailFlush(DETAIL_FLUSH_DELAY_MS);
    }

    applyFrameEntries('settlement', currentData, frame, currentNodeStates, currentOverlaySize, viewportWidth, viewportHeight, hasMilitarySelection, seenFrame, applyDetailImmediately, queueVisibilityPop, currentFrameKeys, visibleNodeKeys);
    applyFrameEntries('port', currentData, frame, currentNodeStates, currentOverlaySize, viewportWidth, viewportHeight, hasMilitarySelection, seenFrame, applyDetailImmediately, queueVisibilityPop, currentFrameKeys, visibleNodeKeys);
    applyFrameEntries('convoy', currentData, frame, currentNodeStates, currentOverlaySize, viewportWidth, viewportHeight, hasMilitarySelection, seenFrame, applyDetailImmediately, queueVisibilityPop, currentFrameKeys, visibleNodeKeys);
    applyFrameEntries('army', currentData, frame, currentNodeStates, currentOverlaySize, viewportWidth, viewportHeight, hasMilitarySelection, seenFrame, applyDetailImmediately, queueVisibilityPop, currentFrameKeys, visibleNodeKeys);
    applyFrameEntries('navy', currentData, frame, currentNodeStates, currentOverlaySize, viewportWidth, viewportHeight, hasMilitarySelection, seenFrame, applyDetailImmediately, queueVisibilityPop, currentFrameKeys, visibleNodeKeys);
    applyFrameEntries('battle', currentData, frame, currentNodeStates, currentOverlaySize, viewportWidth, viewportHeight, hasMilitarySelection, seenFrame, applyDetailImmediately, queueVisibilityPop, currentFrameKeys, visibleNodeKeys);

    const previouslyVisibleKeys = Array.from(visibleNodeKeys);
    for (const key of previouslyVisibleKeys) {
      if (currentFrameKeys.has(key)) {
        continue;
      }

      const state = currentNodeStates[key];
      if (state) {
        hideNode(state);
      }
      visibleNodeKeys.delete(key);
    }

    if (hasFrameEntries) {
      hasAppliedNonEmptyFrameSinceDataRef.current = true;
    }

    updatePortSettlementHoverLine();
  };

  const setNodeRef = useCallback((kind: string, id: string, node: HTMLDivElement | null, attached = false) => {
    const key = nodeKey(kind, id);
    if (node) {
      const state = makeNodeState(node, attached);
      nodeStates.current[key] = state;
      scheduleFrameReplay();
    } else {
      const existing = nodeStates.current[key];
      if (existing) {
        existing.mounted = false;
        clearVisibilityPop(existing);
      }
      delete nodeStates.current[key];
      visibleNodeKeysRef.current.delete(key);
      if (kind === 'port' && hoveredPortIdRef.current === id) {
        hoveredPortIdRef.current = null;
        updatePortSettlementHoverLine();
      }
    }
  }, [scheduleFrameReplay, updatePortSettlementHoverLine]);

  useEffect(() => {
    dataRef.current = data;
    hasAppliedNonEmptyFrameSinceDataRef.current = false;
    updatePortSettlementHoverLine();
  }, [data, updatePortSettlementHoverLine]);

  useEffect(() => {
    if (!data || !glanceWidgetsVisible) {
      hoveredPortIdRef.current = null;
      hidePortSettlementLine(portSettlementLineRef.current);
    }
  }, [data, glanceWidgetsVisible]);

  useEffect(() => {
    overlaySizeRef.current = overlaySize;
  }, [overlaySize]);

  useEffect(() => {
    setGlanceContentHydrationPaused(!visible);
    if (!visible) {
      hoveredPortIdRef.current = null;
      hidePortSettlementLine(portSettlementLineRef.current);
      return;
    }

    applyFrameSnapshotRef.current(latestFrameRef.current);
  }, [visible]);

  useEffect(() => {
    applyFrameSnapshotRef.current = applyFrameSnapshot;
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<GlanceWidgetVisibilityEvent>).detail;
      if (!detail || typeof detail.visible !== 'boolean') {
        return;
      }

      setGlanceWidgetsVisible(detail.visible);
    };

    window.addEventListener('bridge:ui.glance_widgets_visibility', handler as EventListener);
    return () => window.removeEventListener('bridge:ui.glance_widgets_visibility', handler as EventListener);
  }, []);

  useEffect(() => {
    const element = overlayRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const bounds = element.getBoundingClientRect();
      const nextSize = {
        width: bounds.width,
        height: bounds.height,
      };
      overlaySizeRef.current = nextSize;

      setOverlaySize((current) => {
        if (Math.abs(current.width - bounds.width) < 0.5 && Math.abs(current.height - bounds.height) < 0.5) {
          return current;
        }
        return nextSize;
      });

      if (latestFrameRef.current) {
        applyFrameSnapshotRef.current(latestFrameRef.current);
      }
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [hasData, glanceWidgetsVisible]);

  useEffect(() => {
    return onWorldGlancesFrame((frame) => {
      latestFrameRef.current = frame;
      applyFrameSnapshotRef.current(frame);
    });
  }, []);

  useEffect(() => () => {
    setGlanceContentHydrationPaused(false);

    if (detailFlushTimerRef.current !== null) {
      window.clearTimeout(detailFlushTimerRef.current);
      detailFlushTimerRef.current = null;
    }

    if (frameReplayRequestRef.current !== null) {
      window.cancelAnimationFrame(frameReplayRequestRef.current);
      frameReplayRequestRef.current = null;
    }

    for (const key in nodeStates.current) {
      const state = nodeStates.current[key];
      if (state) {
        clearVisibilityPop(state);
      }
    }
  }, []);

  useEffect(() => {
    applyFrameSnapshotRef.current(latestFrameRef.current);
  }, [data, overlaySize, glanceWidgetsVisible]);

  if (!data || !glanceWidgetsVisible) {
    return null;
  }

  const fieldArmies = data.armies;
  const fieldNavies = data.navies;

  return (
    <div
      ref={overlayRef}
      className="world-glance-overlay"
      aria-hidden="true"
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    >
      <div ref={portSettlementLineRef} className="port-settlement-hover-line" />

      {data.settlements.map((entry) => {
        return (
          <GlanceNode
            key={`settlement:${entry.id}`}
            kind="settlement"
            id={entry.id}
            nodeRef={setNodeRef}
            onHoverChange={handleGlanceHoverChange}
            renderContent={() => <SettlementGlance data={mapSettlement(entry)} />}
            hydrationEnabled={visible}
          />
        );
      })}

      {data.ports.map((entry) => {
        return (
          <GlanceNode
            key={`port:${entry.id}`}
            kind="port"
            id={entry.id}
            nodeRef={setNodeRef}
            onHoverChange={handleGlanceHoverChange}
            renderContent={() => <PortGlance data={mapPort(entry)} />}
            hydrationEnabled={visible}
          />
        );
      })}

      {data.convoys.map((entry) => {
        return (
          <GlanceNode
            key={`convoy:${entry.id}`}
            kind="convoy"
            id={entry.id}
            nodeRef={setNodeRef}
            onHoverChange={handleGlanceHoverChange}
            renderContent={() => <ConvoyGlance data={mapConvoy(entry)} />}
            hydrationEnabled={visible}
          />
        );
      })}

      {fieldArmies.map((entry) => {
        return (
          <GlanceNode
            key={`army:${entry.id}`}
            kind="army"
            id={entry.id}
            nodeRef={setNodeRef}
            onHoverChange={handleGlanceHoverChange}
            renderContent={() => <ArmyGlance data={mapMilitary(entry)} />}
            hydrationEnabled={visible}
          />
        );
      })}

      {fieldNavies.map((entry) => {
        return (
          <GlanceNode
            key={`navy:${entry.id}`}
            kind="navy"
            id={entry.id}
            nodeRef={setNodeRef}
            onHoverChange={handleGlanceHoverChange}
            renderContent={() => <NavyGlance data={mapNavy(entry)} />}
            hydrationEnabled={visible}
          />
        );
      })}

      {data.battles.map((entry) => {
        return (
          <GlanceNode
            key={`battle:${entry.id}`}
            kind="battle"
            id={entry.id}
            nodeRef={setNodeRef}
            onHoverChange={handleGlanceHoverChange}
            renderContent={() => <BattleGlance data={mapBattle(entry)} />}
            hydrationEnabled={visible}
          />
        );
      })}
    </div>
  );
}

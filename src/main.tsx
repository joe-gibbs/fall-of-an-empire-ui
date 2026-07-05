import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/game-ui.css'

// Publish the mod SDK on window.FOAE. Must run before builtins (so the
// registry functions exist on the global) and before any mod is loaded.
import './registry/sdk'

// Register all base-game screens, sidebars, and topbar buttons.
import './registry/builtins'

// Installs browser API guards before runtime mod scripts are loaded.
import './mods/sandbox'

// Starts the optional WebUI mod loader. It uses XMLHttpRequest internally so
// the FoaeCefUI runtime does not need browser fetch support.
import { modsReady } from './mods/index'

import App from './App.tsx'
import { acknowledgeBridgeFailure, getRuntimeEngine, setGameplayBridgeRequestsBlocked } from './bridge/core/runtimeEngine'
import { cacheBridgeEvent, clearGameplayBridgeEventCache } from './bridge/core/bridgeEventCache'
import { clearGameplayDataCaches, dispatchGameplayContextReset } from './bridge/core/gameplayCacheReset'
import { bindUIPerfCommands, recordUIPerfBridgeEvent } from './perf/uiPerfProfiler'
import { installImageAutosize } from './utils/imageAutosize'

interface RuntimeViewportState {
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  width?: number;
  height?: number;
  renderWidth?: number;
  renderHeight?: number;
}

const ROOT_FONT_SIZE = 13.2;

declare global {
  interface Window {
    __foaeRuntimeViewport?: RuntimeViewportState;
  }
}

type BridgeRecord = Record<string, unknown>;
type BridgeEventNormaliser = (payload: unknown) => unknown;

const BRIDGE_ARRAY_LENGTH_KEYS = ['length', 'Length', 'num', 'Num', 'count', 'Count'];
const BRIDGE_ARRAY_INDEX_METHODS = ['at', 'At', 'get', 'Get', 'getAt', 'GetAt'];
const BRIDGE_ARRAY_COPY_METHODS = ['toArray', 'ToArray'];
const WORLD_GLANCES_FRAME_ARRAY_KEYS = ['settlements', 'ports', 'convoys', 'armies', 'navies', 'battles'];

function isBridgeRecord(value: unknown): value is BridgeRecord {
  return value !== null && typeof value === 'object';
}

function bridgeProperty(source: unknown, key: string): unknown {
  if (!isBridgeRecord(source)) {
    return undefined;
  }

  const direct = source[key];
  if (direct !== undefined) {
    return direct;
  }

  const pascalKey = `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const pascal = source[pascalKey];
  if (pascal !== undefined) {
    return pascal;
  }

  return source[key.toLowerCase()];
}

function bridgeNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function bridgeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    return normalised === 'true' || normalised === '1';
  }
  return false;
}

function bridgeString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  return typeof value === 'string' ? value : String(value);
}

function bridgeStringOrNumber(value: unknown, fallback: string | number): string | number {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return fallback;
}

function callBridgeArrayCopy(source: BridgeRecord, methodName: string): unknown[] | null {
  const method = source[methodName];
  if (typeof method !== 'function') {
    return null;
  }

  try {
    const result = method.call(source);
    return Array.isArray(result) ? result : null;
  } catch {
    return null;
  }
}

function bridgeArrayLength(source: BridgeRecord): number | null {
  for (const key of BRIDGE_ARRAY_LENGTH_KEYS) {
    const value = source[key];
    let rawLength: unknown;
    try {
      rawLength = typeof value === 'function' ? value.call(source) : value;
    } catch {
      rawLength = undefined;
    }

    const length = bridgeNumber(rawLength, Number.NaN);
    if (Number.isFinite(length) && length >= 0) {
      return Math.floor(length);
    }
  }

  return null;
}

function bridgeArrayIndex(source: BridgeRecord, index: number): unknown {
  const numeric = source[String(index)];
  if (numeric !== undefined) {
    return numeric;
  }

  for (const methodName of BRIDGE_ARRAY_INDEX_METHODS) {
    const method = source[methodName];
    if (typeof method === 'function') {
      let value: unknown;
      try {
        value = method.call(source, index);
      } catch {
        value = undefined;
      }

      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

function bridgeArrayElements(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (!isBridgeRecord(value)) {
    return [];
  }

  for (const methodName of BRIDGE_ARRAY_COPY_METHODS) {
    const copied = callBridgeArrayCopy(value, methodName);
    if (copied) {
      return copied;
    }
  }

  const length = bridgeArrayLength(value);
  if (length !== null) {
    const entries: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const entry = bridgeArrayIndex(value, index);
      if (entry !== undefined) {
        entries.push(entry);
      }
    }
    return entries;
  }

  const numericKeys = Object.keys(value)
    .filter(key => /^\d+$/.test(key))
    .sort((left, right) => Number(left) - Number(right));
  return numericKeys.map(key => value[key]);
}

function normaliseWorldGlanceFrameEntry(payload: unknown) {
  return {
    id: bridgeString(bridgeProperty(payload, 'id')),
    screenX: bridgeNumber(bridgeProperty(payload, 'screenX')),
    screenY: bridgeNumber(bridgeProperty(payload, 'screenY')),
    scale: bridgeNumber(bridgeProperty(payload, 'scale'), 1),
    opacity: bridgeNumber(bridgeProperty(payload, 'opacity'), 1),
    zOrder: bridgeNumber(bridgeProperty(payload, 'zOrder')),
    detailLevel: bridgeStringOrNumber(bridgeProperty(payload, 'detailLevel'), 0),
    selected: bridgeBoolean(bridgeProperty(payload, 'selected')),
    targeted: bridgeBoolean(bridgeProperty(payload, 'targeted')),
    besieged: bridgeBoolean(bridgeProperty(payload, 'besieged')),
    siegeProgress: bridgeNumber(bridgeProperty(payload, 'siegeProgress')),
  };
}

function isPlainWorldGlancesFrame(payload: unknown): payload is BridgeRecord {
  if (!isBridgeRecord(payload)) {
    return false;
  }

  if (typeof payload.viewportWidth !== 'number' || typeof payload.viewportHeight !== 'number') {
    return false;
  }

  for (const key of WORLD_GLANCES_FRAME_ARRAY_KEYS) {
    if (!Array.isArray(payload[key])) {
      return false;
    }
  }

  return true;
}

function normaliseWorldGlancesFrame(payload: unknown) {
  if (isPlainWorldGlancesFrame(payload)) {
    return payload;
  }

  return {
    viewportWidth: bridgeNumber(bridgeProperty(payload, 'viewportWidth')),
    viewportHeight: bridgeNumber(bridgeProperty(payload, 'viewportHeight')),
    snapshotRevision: bridgeNumber(bridgeProperty(payload, 'snapshotRevision')),
    dragSelectionActive: bridgeBoolean(bridgeProperty(payload, 'dragSelectionActive')),
    dragSelectionStartX: bridgeNumber(bridgeProperty(payload, 'dragSelectionStartX')),
    dragSelectionStartY: bridgeNumber(bridgeProperty(payload, 'dragSelectionStartY')),
    dragSelectionEndX: bridgeNumber(bridgeProperty(payload, 'dragSelectionEndX')),
    dragSelectionEndY: bridgeNumber(bridgeProperty(payload, 'dragSelectionEndY')),
    settlements: bridgeArrayElements(bridgeProperty(payload, 'settlements')).map(normaliseWorldGlanceFrameEntry),
    ports: bridgeArrayElements(bridgeProperty(payload, 'ports')).map(normaliseWorldGlanceFrameEntry),
    convoys: bridgeArrayElements(bridgeProperty(payload, 'convoys')).map(normaliseWorldGlanceFrameEntry),
    armies: bridgeArrayElements(bridgeProperty(payload, 'armies')).map(normaliseWorldGlanceFrameEntry),
    navies: bridgeArrayElements(bridgeProperty(payload, 'navies')).map(normaliseWorldGlanceFrameEntry),
    battles: bridgeArrayElements(bridgeProperty(payload, 'battles')).map(normaliseWorldGlanceFrameEntry),
  };
}

function normaliseNotificationAnchorFrameEntry(payload: unknown) {
  return {
    id: bridgeString(bridgeProperty(payload, 'id')),
    screenX: bridgeNumber(bridgeProperty(payload, 'screenX')),
    screenY: bridgeNumber(bridgeProperty(payload, 'screenY')),
    viewportWidth: bridgeNumber(bridgeProperty(payload, 'viewportWidth')),
    viewportHeight: bridgeNumber(bridgeProperty(payload, 'viewportHeight')),
    zOrder: bridgeNumber(bridgeProperty(payload, 'zOrder')),
  };
}

function normaliseNotificationAnchorsFrame(payload: unknown) {
  return {
    settlements: bridgeArrayElements(bridgeProperty(payload, 'settlements')).map(normaliseNotificationAnchorFrameEntry),
  };
}

function normaliseBattlePoint(payload: unknown) {
  return {
    x: bridgeNumber(bridgeProperty(payload, 'x')),
    y: bridgeNumber(bridgeProperty(payload, 'y')),
  };
}

function normaliseBattleFormationAgentFrame(payload: unknown) {
  return {
    x: bridgeNumber(bridgeProperty(payload, 'x')),
    y: bridgeNumber(bridgeProperty(payload, 'y')),
    velocityX: bridgeNumber(bridgeProperty(payload, 'velocityX')),
    velocityY: bridgeNumber(bridgeProperty(payload, 'velocityY')),
    inMelee: bridgeBoolean(bridgeProperty(payload, 'inMelee')),
    detached: bridgeBoolean(bridgeProperty(payload, 'detached')),
    targetFormationId: bridgeString(bridgeProperty(payload, 'targetFormationId')),
  };
}

function normaliseBattleFormationFrame(payload: unknown) {
  return {
    id: bridgeString(bridgeProperty(payload, 'id')),
    strength: bridgeNumber(bridgeProperty(payload, 'strength')),
    maxStrength: bridgeNumber(bridgeProperty(payload, 'maxStrength')),
    losses: bridgeNumber(bridgeProperty(payload, 'losses')),
    healthPercent: bridgeNumber(bridgeProperty(payload, 'healthPercent')),
    morale: bridgeNumber(bridgeProperty(payload, 'morale')),
    positionX: bridgeNumber(bridgeProperty(payload, 'positionX')),
    positionY: bridgeNumber(bridgeProperty(payload, 'positionY')),
    rotation: bridgeNumber(bridgeProperty(payload, 'rotation')),
    zIndex: bridgeNumber(bridgeProperty(payload, 'zIndex')),
    attackChargePercent: bridgeNumber(bridgeProperty(payload, 'attackChargePercent')),
    hasManualTarget: bridgeBoolean(bridgeProperty(payload, 'hasManualTarget')),
    isRouting: bridgeBoolean(bridgeProperty(payload, 'isRouting')),
    isWithdrawing: bridgeBoolean(bridgeProperty(payload, 'isWithdrawing')),
    agents: bridgeArrayElements(bridgeProperty(payload, 'agents')).map(normaliseBattleFormationAgentFrame),
    targetFormationId: bridgeString(bridgeProperty(payload, 'targetFormationId')),
    targetFormationName: bridgeString(bridgeProperty(payload, 'targetFormationName')),
    waypoints: bridgeArrayElements(bridgeProperty(payload, 'waypoints')).map(normaliseBattlePoint),
  };
}

function normaliseBattleFrame(payload: unknown) {
  return {
    found: bridgeBoolean(bridgeProperty(payload, 'found')),
    id: bridgeString(bridgeProperty(payload, 'id')),
    formations: bridgeArrayElements(bridgeProperty(payload, 'formations')).map(normaliseBattleFormationFrame),
  };
}

const NATIVE_BATTLE_PARTICIPANT_STRING_STRIDE = 11;
const NATIVE_BATTLE_PARTICIPANT_NUMBER_STRIDE = 6;
const NATIVE_BATTLE_SIDE_NUMBER_STRIDE = 6;
const NATIVE_BATTLE_FORMATION_STRING_STRIDE = 19;
const NATIVE_BATTLE_FORMATION_DETAIL_NUMBER_STRIDE = 15;
const NATIVE_BATTLE_ACTION_STRING_STRIDE = 5;
const NATIVE_BATTLE_ACTION_NUMBER_STRIDE = 7;
const NATIVE_BATTLE_OBSTACLE_STRING_STRIDE = 2;
const NATIVE_BATTLE_OBSTACLE_NUMBER_STRIDE = 10;
const NATIVE_BATTLE_FORMATION_MANUAL_TARGET_FLAG = 1 << 0;
const NATIVE_BATTLE_FORMATION_ROUTING_FLAG = 1 << 1;
const NATIVE_BATTLE_FORMATION_WITHDRAWING_FLAG = 1 << 2;
const NATIVE_BATTLE_FORMATION_PLAYER_CONTROLLED_FLAG = 1 << 3;
const NATIVE_BATTLE_FORMATION_COMMANDABLE_FLAG = 1 << 4;
const NATIVE_NOTIFICATION_ANCHOR_FRAME_NUMBER_STRIDE = 5;
const NATIVE_BRIDGE_JSON_NULL = 0;
const NATIVE_BRIDGE_JSON_FALSE = 1;
const NATIVE_BRIDGE_JSON_TRUE = 2;
const NATIVE_BRIDGE_JSON_INT32 = 3;
const NATIVE_BRIDGE_JSON_FLOAT = 4;
const NATIVE_BRIDGE_JSON_STRING = 5;
const NATIVE_BRIDGE_JSON_ARRAY = 6;
const NATIVE_BRIDGE_JSON_OBJECT = 7;

function nativeStringArray(value: unknown): string[] {
  return bridgeArrayElements(value).map(entry => bridgeString(entry));
}

function nativeNumberArray(value: unknown): number[] {
  return bridgeArrayElements(value).map(entry => bridgeNumber(entry));
}

function nativeIntegerArray(value: unknown): number[] {
  return bridgeArrayElements(value).map(entry => Math.trunc(bridgeNumber(entry, -1)));
}

function nativeBattleFramePayload(
  battleId: unknown,
  formationIdsValue: unknown,
  formationNumbersValue: unknown,
  formationFlagsValue: unknown,
  formationTargetIndicesValue: unknown,
  waypointCountsValue: unknown,
  waypointNumbersValue: unknown,
  agentCountsValue: unknown,
  agentNumbersValue: unknown,
  agentFlagsValue: unknown,
  agentTargetIndicesValue: unknown,
) {
  const formationIds = nativeStringArray(formationIdsValue);
  const formationNumbers = nativeNumberArray(formationNumbersValue);
  const formationFlags = nativeIntegerArray(formationFlagsValue);
  const formationTargetIndices = nativeIntegerArray(formationTargetIndicesValue);
  const waypointCounts = nativeIntegerArray(waypointCountsValue);
  const waypointNumbers = nativeNumberArray(waypointNumbersValue);
  const agentCounts = nativeIntegerArray(agentCountsValue);
  const agentNumbers = nativeNumberArray(agentNumbersValue);
  const agentFlags = nativeIntegerArray(agentFlagsValue);
  const agentTargetIndices = nativeIntegerArray(agentTargetIndicesValue);

  return {
    packed: 'battleFrame',
    found: true,
    id: bridgeString(battleId),
    formationIds,
    formationNumbers,
    formationFlags,
    formationTargetIndices,
    waypointCounts,
    waypointNumbers,
    agentCounts,
    agentNumbers,
    agentFlags,
    agentTargetIndices,
  };
}

function nativeBattleFaction(strings: string[], offset: number) {
  return {
    id: strings[offset] ?? '',
    name: strings[offset + 1] ?? '',
    colour: strings[offset + 2] ?? '',
    secondaryColour: strings[offset + 3] ?? '',
    cultureGroup: strings[offset + 4] ?? '',
    relation: strings[offset + 5] ?? 'neutral',
  };
}

function nativeBattleDataPayload(
  battleStringsValue: unknown,
  battleNumbersValue: unknown,
  battleFlagsValue: unknown,
  sideParticipantCountsValue: unknown,
  sideNumbersValue: unknown,
  participantStringsValue: unknown,
  participantNumbersValue: unknown,
  participantFlagsValue: unknown,
  formationStringsValue: unknown,
  formationNumbersValue: unknown,
  formationFlagsValue: unknown,
  waypointCountsValue: unknown,
  waypointNumbersValue: unknown,
  actionCountsValue: unknown,
  actionStringsValue: unknown,
  actionNumbersValue: unknown,
  actionFlagsValue: unknown,
  obstacleStringsValue: unknown,
  obstacleNumbersValue: unknown,
  obstacleFlagsValue: unknown,
  heightMapShapeValue: unknown,
  heightMapNumbersValue: unknown,
) {
  const battleStrings = nativeStringArray(battleStringsValue);
  const battleNumbers = nativeNumberArray(battleNumbersValue);
  const battleFlags = nativeIntegerArray(battleFlagsValue)[0] ?? 0;
  const sideParticipantCounts = nativeIntegerArray(sideParticipantCountsValue);
  const sideNumbers = nativeNumberArray(sideNumbersValue);
  const participantStrings = nativeStringArray(participantStringsValue);
  const participantNumbers = nativeNumberArray(participantNumbersValue);
  const participantFlags = nativeIntegerArray(participantFlagsValue);
  const formationStrings = nativeStringArray(formationStringsValue);
  const formationNumbers = nativeNumberArray(formationNumbersValue);
  const formationFlags = nativeIntegerArray(formationFlagsValue);
  const waypointCounts = nativeIntegerArray(waypointCountsValue);
  const waypointNumbers = nativeNumberArray(waypointNumbersValue);
  const actionCounts = nativeIntegerArray(actionCountsValue);
  const actionStrings = nativeStringArray(actionStringsValue);
  const actionNumbers = nativeNumberArray(actionNumbersValue);
  const actionFlags = nativeIntegerArray(actionFlagsValue);
  const obstacleStrings = nativeStringArray(obstacleStringsValue);
  const obstacleNumbers = nativeNumberArray(obstacleNumbersValue);
  const obstacleFlags = nativeIntegerArray(obstacleFlagsValue);
  const heightMapShape = nativeIntegerArray(heightMapShapeValue);
  const heightMapNumbers = nativeNumberArray(heightMapNumbersValue);

  let participantIndex = 0;
  const buildParticipant = () => {
    const stringOffset = participantIndex * NATIVE_BATTLE_PARTICIPANT_STRING_STRIDE;
    const numberOffset = participantIndex * NATIVE_BATTLE_PARTICIPANT_NUMBER_STRIDE;
    const flags = participantFlags[participantIndex] ?? 0;
    participantIndex += 1;
    return {
      id: participantStrings[stringOffset] ?? '',
      name: participantStrings[stringOffset + 1] ?? '',
      commander: participantStrings[stringOffset + 2] ?? '',
      commanderId: participantStrings[stringOffset + 3] ?? '',
      faction: nativeBattleFaction(participantStrings, stringOffset + 4),
      strength: participantNumbers[numberOffset] ?? 0,
      maxStrength: participantNumbers[numberOffset + 1] ?? 0,
      manpower: participantNumbers[numberOffset + 2] ?? 0,
      losses: participantNumbers[numberOffset + 3] ?? 0,
      morale: participantNumbers[numberOffset + 4] ?? 0,
      tier: participantNumbers[numberOffset + 5] ?? 1,
      isNavy: (flags & (1 << 0)) !== 0,
      isPlayerControlled: (flags & (1 << 1)) !== 0,
      canRetreat: (flags & (1 << 2)) !== 0,
      currentOrder: participantStrings[stringOffset + 10] ?? '',
    };
  };

  const buildSide = (sideIndex: number, participantCount: number) => {
    const numberOffset = sideIndex * NATIVE_BATTLE_SIDE_NUMBER_STRIDE;
    const participants = [];
    for (let index = 0; index < participantCount; index += 1) {
      participants.push(buildParticipant());
    }
    return {
      participants,
      totalStrength: sideNumbers[numberOffset] ?? 0,
      totalMaxStrength: sideNumbers[numberOffset + 1] ?? 0,
      currentManpower: sideNumbers[numberOffset + 2] ?? 0,
      initialManpower: sideNumbers[numberOffset + 3] ?? 0,
      losses: sideNumbers[numberOffset + 4] ?? 0,
      morale: sideNumbers[numberOffset + 5] ?? 0,
    };
  };

  let waypointOffset = 0;
  let actionIndex = 0;
  const formationCount = Math.floor(formationStrings.length / NATIVE_BATTLE_FORMATION_STRING_STRIDE);
  const formations = [];
  for (let formationIndex = 0; formationIndex < formationCount; formationIndex += 1) {
    const stringOffset = formationIndex * NATIVE_BATTLE_FORMATION_STRING_STRIDE;
    const numberOffset = formationIndex * NATIVE_BATTLE_FORMATION_DETAIL_NUMBER_STRIDE;
    const flags = formationFlags[formationIndex] ?? 0;
    const waypointCount = Math.max(waypointCounts[formationIndex] ?? 0, 0);
    const actionCount = Math.max(actionCounts[formationIndex] ?? 0, 0);
    const waypoints = [];
    for (let index = 0; index < waypointCount; index += 1) {
      waypoints.push({
        x: waypointNumbers[waypointOffset] ?? 0,
        y: waypointNumbers[waypointOffset + 1] ?? 0,
      });
      waypointOffset += 2;
    }

    const actions = [];
    for (let index = 0; index < actionCount; index += 1) {
      const actionStringOffset = actionIndex * NATIVE_BATTLE_ACTION_STRING_STRIDE;
      const actionNumberOffset = actionIndex * NATIVE_BATTLE_ACTION_NUMBER_STRIDE;
      const actionStateFlags = actionFlags[actionIndex] ?? 0;
      actionIndex += 1;
      actions.push({
        id: actionStrings[actionStringOffset] ?? '',
        name: actionStrings[actionStringOffset + 1] ?? '',
        description: actionStrings[actionStringOffset + 2] ?? '',
        iconId: actionStrings[actionStringOffset + 3] ?? '',
        requiredTactics: actionNumbers[actionNumberOffset] ?? 0,
        requiredAuthority: actionNumbers[actionNumberOffset + 1] ?? 0,
        damageMultiplier: actionNumbers[actionNumberOffset + 2] ?? 1,
        damageTakenMultiplier: actionNumbers[actionNumberOffset + 3] ?? 1,
        armourMultiplier: actionNumbers[actionNumberOffset + 4] ?? 1,
        moraleModifier: actionNumbers[actionNumberOffset + 5] ?? 0,
        speedMultiplier: actionNumbers[actionNumberOffset + 6] ?? 1,
        canActivate: (actionStateFlags & (1 << 0)) !== 0,
        isActive: (actionStateFlags & (1 << 1)) !== 0,
        disabledReason: actionStrings[actionStringOffset + 4] ?? '',
      });
    }

    formations.push({
      id: formationStrings[stringOffset] ?? '',
      name: formationStrings[stringOffset + 1] ?? '',
      side: formationStrings[stringOffset + 2] ?? '',
      militaryId: formationStrings[stringOffset + 3] ?? '',
      militaryName: formationStrings[stringOffset + 4] ?? '',
      faction: nativeBattleFaction(formationStrings, stringOffset + 5),
      unitType: formationStrings[stringOffset + 11] ?? '',
      unitTypeLabel: formationStrings[stringOffset + 12] ?? '',
      strength: formationNumbers[numberOffset] ?? 0,
      maxStrength: formationNumbers[numberOffset + 1] ?? 0,
      losses: formationNumbers[numberOffset + 2] ?? 0,
      healthPercent: formationNumbers[numberOffset + 3] ?? 0,
      morale: formationNumbers[numberOffset + 4] ?? 0,
      stance: formationStrings[stringOffset + 13] ?? '',
      stanceLabel: formationStrings[stringOffset + 14] ?? '',
      positionX: formationNumbers[numberOffset + 5] ?? 0,
      positionY: formationNumbers[numberOffset + 6] ?? 0,
      rotation: formationNumbers[numberOffset + 7] ?? 0,
      zIndex: formationNumbers[numberOffset + 8] ?? 0,
      speed: formationNumbers[numberOffset + 9] ?? 0,
      attackRange: formationNumbers[numberOffset + 10] ?? 0,
      minimumAttackRange: formationNumbers[numberOffset + 11] ?? 0,
      collisionRadius: formationNumbers[numberOffset + 12] ?? 0,
      attackChargePercent: formationNumbers[numberOffset + 13] ?? 0,
      hasManualTarget: (flags & NATIVE_BATTLE_FORMATION_MANUAL_TARGET_FLAG) !== 0,
      isRouting: (flags & NATIVE_BATTLE_FORMATION_ROUTING_FLAG) !== 0,
      isWithdrawing: (flags & NATIVE_BATTLE_FORMATION_WITHDRAWING_FLAG) !== 0,
      agentCount: formationNumbers[numberOffset + 14] ?? 0,
      targetFormationId: formationStrings[stringOffset + 15] ?? '',
      targetFormationName: formationStrings[stringOffset + 16] ?? '',
      activeActionId: formationStrings[stringOffset + 17] ?? '',
      activeActionName: formationStrings[stringOffset + 18] ?? '',
      isPlayerControlled: (flags & NATIVE_BATTLE_FORMATION_PLAYER_CONTROLLED_FLAG) !== 0,
      isCommandable: (flags & NATIVE_BATTLE_FORMATION_COMMANDABLE_FLAG) !== 0,
      waypoints,
      actions,
    });
  }

  const obstacleCount = Math.floor(obstacleStrings.length / NATIVE_BATTLE_OBSTACLE_STRING_STRIDE);
  const obstacles = [];
  for (let index = 0; index < obstacleCount; index += 1) {
    const stringOffset = index * NATIVE_BATTLE_OBSTACLE_STRING_STRIDE;
    const numberOffset = index * NATIVE_BATTLE_OBSTACLE_NUMBER_STRIDE;
    obstacles.push({
      id: obstacleStrings[stringOffset] ?? '',
      type: obstacleStrings[stringOffset + 1] ?? '',
      centreX: obstacleNumbers[numberOffset] ?? 0,
      centreY: obstacleNumbers[numberOffset + 1] ?? 0,
      width: obstacleNumbers[numberOffset + 2] ?? 0,
      height: obstacleNumbers[numberOffset + 3] ?? 0,
      rotation: obstacleNumbers[numberOffset + 4] ?? 0,
      blocksMovement: (obstacleFlags[index] ?? 0) !== 0,
      movementSpeedMultiplier: obstacleNumbers[numberOffset + 5] ?? 1,
      cavalryMovementSpeedMultiplier: obstacleNumbers[numberOffset + 6] ?? 1,
      damageDealtMultiplier: obstacleNumbers[numberOffset + 7] ?? 1,
      damageTakenMultiplier: obstacleNumbers[numberOffset + 8] ?? 1,
      rangedIncomingDamageMultiplier: obstacleNumbers[numberOffset + 9] ?? 1,
    });
  }

  const heightMap = [];
  for (let index = 0; index < heightMapNumbers.length; index += 2) {
    heightMap.push({
      height: heightMapNumbers[index] ?? 0,
      slope: heightMapNumbers[index + 1] ?? 0,
    });
  }

  return {
    found: (battleFlags & (1 << 0)) !== 0,
    id: battleStrings[0] ?? '',
    title: battleStrings[1] ?? '',
    battleType: battleStrings[2] ?? '',
    location: battleStrings[3] ?? '',
    terrain: battleStrings[4] ?? '',
    hasSnowAttrition: (battleFlags & (1 << 1)) !== 0,
    hasDesertAttrition: (battleFlags & (1 << 2)) !== 0,
    battlefieldWidth: battleNumbers[0] ?? 0,
    battlefieldHeight: battleNumbers[1] ?? 0,
    attacker: buildSide(0, Math.max(sideParticipantCounts[0] ?? 0, 0)),
    defender: buildSide(1, Math.max(sideParticipantCounts[1] ?? 0, 0)),
    formations,
    obstacles,
    heightMapColumns: heightMapShape[0] ?? 0,
    heightMapRows: heightMapShape[1] ?? 0,
    heightMap,
    playerIsAttacker: (battleFlags & (1 << 3)) !== 0,
    playerIsDefender: (battleFlags & (1 << 4)) !== 0,
    canIssueCommands: (battleFlags & (1 << 5)) !== 0,
  };
}

function nativeWorldGlancesFramePayload(
  frameNumbersValue: unknown,
  frameFlagsValue: unknown,
  countsValue: unknown,
  entryStringsValue: unknown,
  entryNumbersValue: unknown,
  entryFlagsValue: unknown,
) {
  const frameNumbers = nativeNumberArray(frameNumbersValue);
  const frameFlags = nativeIntegerArray(frameFlagsValue)[0] ?? 0;
  const counts = nativeIntegerArray(countsValue);
  const entryStrings = nativeStringArray(entryStringsValue);
  const entryNumbers = nativeNumberArray(entryNumbersValue);
  const entryFlags = nativeIntegerArray(entryFlagsValue);

  return {
    packed: 'worldGlancesFrame',
    frameNumbers,
    frameFlags: [frameFlags],
    counts,
    entryStrings,
    entryNumbers,
    entryFlags,
  };
}

function nativeNotificationAnchorsFramePayload(
  entryStringsValue: unknown,
  entryNumbersValue: unknown,
) {
  const entryStrings = nativeStringArray(entryStringsValue);
  const entryNumbers = nativeNumberArray(entryNumbersValue);

  return {
    settlements: entryStrings.map((id, index) => {
      const numberOffset = index * NATIVE_NOTIFICATION_ANCHOR_FRAME_NUMBER_STRIDE;
      return {
        id,
        screenX: entryNumbers[numberOffset] ?? 0,
        screenY: entryNumbers[numberOffset + 1] ?? 0,
        viewportWidth: entryNumbers[numberOffset + 2] ?? 0,
        viewportHeight: entryNumbers[numberOffset + 3] ?? 0,
        zOrder: entryNumbers[numberOffset + 4] ?? 0,
      };
    }),
  };
}

function nativeBridgeJsonPayload(
  typesValue: unknown,
  countsValue: unknown,
  integersValue: unknown,
  _floatsValue: unknown,
  stringsValue: unknown,
): unknown {
  const types = nativeIntegerArray(typesValue);
  const counts = nativeIntegerArray(countsValue);
  const integers = nativeIntegerArray(integersValue);
  const strings = nativeStringArray(stringsValue);
  let typeIndex = 0;
  let countIndex = 0;
  let integerIndex = 0;
  let stringIndex = 0;

  const readValue = (): unknown => {
    const type = types[typeIndex] ?? NATIVE_BRIDGE_JSON_NULL;
    typeIndex += 1;

    if (type === NATIVE_BRIDGE_JSON_FALSE) return false;
    if (type === NATIVE_BRIDGE_JSON_TRUE) return true;
    if (type === NATIVE_BRIDGE_JSON_INT32) {
      const value = integers[integerIndex] ?? 0;
      integerIndex += 1;
      return value;
    }
    if (type === NATIVE_BRIDGE_JSON_FLOAT) {
      const value = Number(strings[stringIndex] ?? '0');
      stringIndex += 1;
      return Number.isFinite(value) ? value : 0;
    }
    if (type === NATIVE_BRIDGE_JSON_STRING) {
      const value = strings[stringIndex] ?? '';
      stringIndex += 1;
      return value;
    }
    if (type === NATIVE_BRIDGE_JSON_ARRAY) {
      const count = Math.max(counts[countIndex] ?? 0, 0);
      countIndex += 1;
      const entries = [];
      for (let index = 0; index < count; index += 1) {
        entries.push(readValue());
      }
      return entries;
    }
    if (type === NATIVE_BRIDGE_JSON_OBJECT) {
      const count = Math.max(counts[countIndex] ?? 0, 0);
      countIndex += 1;
      const record: BridgeRecord = {};
      for (let index = 0; index < count; index += 1) {
        const key = strings[stringIndex] ?? '';
        stringIndex += 1;
        record[key] = readValue();
      }
      return record;
    }

    return null;
  };

  return readValue();
}

const BRIDGE_EVENT_NORMALISERS: Record<string, BridgeEventNormaliser | undefined> = {
  'game.world_glances_frame': normaliseWorldGlancesFrame,
  'game.notification_anchors_frame': normaliseNotificationAnchorsFrame,
  'game.get_battle_frame': normaliseBattleFrame,
};

function bridgeEventPayload(eventName: string, payload: unknown): unknown {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const normalise = BRIDGE_EVENT_NORMALISERS[eventName];
  return normalise ? normalise(parsed) : parsed;
}

function applyRuntimeViewportScale(detail: RuntimeViewportState | undefined) {
  const scale = detail?.scale ?? detail?.scaleX ?? 1;
  const safeScale = scale > 0 ? scale : 1;

  document.documentElement.style.setProperty('--runtime-root-font-size', `${ROOT_FONT_SIZE * safeScale}px`);
  document.documentElement.style.setProperty('--runtime-viewport-scale', String(safeScale));
}

function setRuntimeClass(isFoaeCefUI: boolean) {
  const root = document.documentElement;
  if (isFoaeCefUI) {
    root.classList.add('webui-runtime');
    root.classList.remove('webui-standalone');
    applyRuntimeViewportScale(window.__foaeRuntimeViewport);
  } else {
    root.classList.add('webui-standalone');
    root.classList.remove('webui-runtime');
    applyRuntimeViewportScale({ scale: 1 });
  }
}

const WORLD_INPUT_BLOCKING_CLASSES = [
  'sidebar',
  'sidebar-left',
  'sidebar-right',
  'sidebar-content',
  'topbar-left',
  'topbar-center',
  'topbar-actions',
  'topbar-right',
  'topbar-portrait-slot',
  'bottombar-tray',
  'screen-overlay',
  'modal-overlay',
  'settings-modal-overlay',
  'event-overlay',
  'pinned-dropdown',
  'vc-dropdown',
  'warning-icon-strip',
  'warning-icon-btn',
  'notification-banner',
  'advisor-card',
  'candidate-list-scroll-frame',
  'chart-unit-picker',
  'tpl-picker',
  'mm-root',
  'tt-bubble',
  'world-glance',
];

type NativeCursorKind =
  | 'default'
  | 'pointer'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'blocked'
  | 'crosshair'
  | 'help'
  | 'gameplay';

const GRABBING_TARGET_SELECTOR = [
  '.zoom-pan-canvas--panning',
  '.zoom-pan-canvas--right-dragging',
  '.is-node-dragging',
].join(',');

const GRAB_TARGET_SELECTOR = [
  '.zoom-pan-canvas',
  '.ft-viewport',
  '.chart-viewport',
  '.battle-canvas-frame',
].join(',');

const CROSSHAIR_TARGET_SELECTOR = [
  '.zoom-pan-canvas--left-selecting',
].join(',');

const BLOCKED_TARGET_SELECTOR = [
  '.event-option--locked',
  '.pig-footer__button--disabled',
  '.cpm-promote-btn--disabled',
  'button[disabled]',
  '[aria-disabled="true"]',
].join(',');

const HELP_TARGET_SELECTOR = [
  '.diplo-agent-network',
].join(',');

const POINTER_TARGET_SELECTOR = [
  'button',
  'a',
  '[role="button"]',
  'label',
  'summary',
  '.clickable',
  '.icon-button',
  '.event-option',
  '.interaction-card--clickable',
  '.warning-icon-btn',
  '.pinned-item-row',
  '.screen-button-faction',
  '.speed-btn',
].join(',');

let lastMouseBlocksWorldInput: boolean | null = null;
let lastMouseCursorKind: NativeCursorKind | null = null;
let nativeCursorMouseDown = false;

function hasClassInAncestry(element: Element | null, classNames: string[]): boolean {
  let current = element;
  while (current) {
    for (const className of classNames) {
      if (current.classList.contains(className)) return true;
    }
    current = current.parentElement;
  }
  return false;
}

function isDisabled(element: Element): boolean {
  if (element.getAttribute('aria-disabled') === 'true') return true;
  if ('disabled' in element && Boolean((element as HTMLButtonElement).disabled)) return true;
  return false;
}

function hasDisabledCursorTarget(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (isDisabled(current)) return true;
    current = current.parentElement;
  }
  return false;
}

function webUICursorKind(element: Element | null): NativeCursorKind {
  if (!element) return 'default';
  if (element.closest('.world-glance')) return 'gameplay';
  if (element.closest(BLOCKED_TARGET_SELECTOR) || hasDisabledCursorTarget(element)) return 'blocked';
  if (element.closest(HELP_TARGET_SELECTOR)) return 'help';
  if (element.closest(CROSSHAIR_TARGET_SELECTOR)) return 'crosshair';
  if (element.closest(GRABBING_TARGET_SELECTOR)) return 'grabbing';
  if (element.closest(GRAB_TARGET_SELECTOR)) return nativeCursorMouseDown ? 'grabbing' : 'grab';

  let current: Element | null = element;
  while (current) {
    const tagName = current.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
      return 'text';
    }
    current = current.parentElement;
  }

  if (element.closest(POINTER_TARGET_SELECTOR)) return 'pointer';
  return 'default';
}

function syncWebUIMouseState(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  const blocksWorldInput = hasClassInAncestry(element, WORLD_INPUT_BLOCKING_CLASSES);
  const cursorKind = webUICursorKind(element);

  if (
    blocksWorldInput === lastMouseBlocksWorldInput
    && cursorKind === lastMouseCursorKind
  ) {
    return;
  }

  lastMouseBlocksWorldInput = blocksWorldInput;
  lastMouseCursorKind = cursorKind;

  const engine = getRuntimeEngine();
  if (!engine) return;
  void Promise.resolve(engine.call('StrategySetWebUIMouseState', blocksWorldInput, cursorKind))
    .catch(error => acknowledgeBridgeFailure(error, 'StrategySetWebUIMouseState'));
}

function bindMouseStateBridge() {
  document.addEventListener('mouseover', (event) => syncWebUIMouseState(event.target), true);
  document.addEventListener('mousemove', (event) => syncWebUIMouseState(event.target), true);
  document.addEventListener('mousedown', (event) => {
    nativeCursorMouseDown = true;
    syncWebUIMouseState(event.target);
  }, true);
  document.addEventListener('mouseup', (event) => {
    nativeCursorMouseDown = false;
    syncWebUIMouseState(event.target);
  }, true);
  document.addEventListener('mouseleave', () => {
    nativeCursorMouseDown = false;
    syncWebUIMouseState(null);
  }, true);
  window.addEventListener('blur', () => {
    nativeCursorMouseDown = false;
    syncWebUIMouseState(null);
  });
}

function dispatchBridgeEvent(eventName: string, data: unknown) {
  const appMode = eventName === 'game.get_app_mode' ? (data as { mode?: unknown }).mode : undefined;
  if (appMode === 'ingame') {
    setGameplayBridgeRequestsBlocked(false);
  }
  if (appMode === 'mainmenu' || appMode === 'loading') {
    setGameplayBridgeRequestsBlocked(true);
    clearGameplayBridgeEventCache();
    clearGameplayDataCaches();
    dispatchGameplayContextReset();
  }

  cacheBridgeEvent(eventName, data);
  window.dispatchEvent(new CustomEvent(`bridge:${eventName}`, { detail: data }));
}

interface PendingNativeFrameDispatch {
  eventName: string;
  bridgeEventName: string;
  sequence: number;
  startedAtMs: number;
  dispatch: () => void;
}

const pendingNativeFrameDispatches = new Map<string, PendingNativeFrameDispatch>();
let pendingNativeFrameRequestId = 0;

function acknowledgeNativeFrameApplied(eventName: string, sequence: number) {
  const engine = getRuntimeEngine();
  if (!engine?.callBridge) return;

  void Promise.resolve(engine.callBridge({
    action: 'foae.internal.ui_frame_applied',
    payload: { eventName, sequence },
  })).catch(error => acknowledgeBridgeFailure(error, 'foae.internal.ui_frame_applied'));
}

function flushPendingNativeFrameDispatches() {
  pendingNativeFrameRequestId = 0;
  const dispatches = Array.from(pendingNativeFrameDispatches.values());
  pendingNativeFrameDispatches.clear();

  dispatches.forEach((pending) => {
    pending.dispatch();
    acknowledgeNativeFrameApplied(pending.eventName, pending.sequence);
    recordUIPerfBridgeEvent(pending.bridgeEventName, pending.startedAtMs, Date.now());
  });
}

function scheduleNativeFrameDispatch(pending: PendingNativeFrameDispatch) {
  pendingNativeFrameDispatches.set(pending.eventName, pending);
  if (pendingNativeFrameRequestId !== 0) {
    return;
  }

  if (typeof window.requestAnimationFrame === 'function') {
    pendingNativeFrameRequestId = window.requestAnimationFrame(flushPendingNativeFrameDispatches);
    return;
  }

  pendingNativeFrameRequestId = window.setTimeout(flushPendingNativeFrameDispatches, 0);
}

function bindBridgeEvents(): boolean {
  const engine = getRuntimeEngine();
  if (!engine) {
    setRuntimeClass(false);
    return false;
  }

  setRuntimeClass(true);

  // Receive push events from the native web UI host and re-dispatch as
  // CustomEvents that onBridgeEvent() listeners can subscribe to.
  engine.on('StrategyBridgeEvent', (eventName, payload) => {
    if (typeof eventName !== 'string') return;
    const data = bridgeEventPayload(eventName, payload);
    const startedAtMs = Date.now();
    dispatchBridgeEvent(eventName, data);
    recordUIPerfBridgeEvent(eventName, startedAtMs, Date.now());
  });

  engine.on('StrategyBridgeEventNative', (
    eventName,
    types,
    counts,
    integers,
    floats,
    strings,
  ) => {
    if (typeof eventName !== 'string') return;
    const startedAtMs = Date.now();
    const payload = nativeBridgeJsonPayload(types, counts, integers, floats, strings);
    const normalise = BRIDGE_EVENT_NORMALISERS[eventName];
    const data = normalise ? normalise(payload) : payload;
    dispatchBridgeEvent(eventName, data);
    recordUIPerfBridgeEvent(eventName, startedAtMs, Date.now());
  });

  engine.on('StrategyBattleData', (
    battleStrings,
    battleNumbers,
    battleFlags,
    sideParticipantCounts,
    sideNumbers,
    participantStrings,
    participantNumbers,
    participantFlags,
    formationStrings,
    formationNumbers,
    formationFlags,
    waypointCounts,
    waypointNumbers,
    actionCounts,
    actionStrings,
    actionNumbers,
    actionFlags,
    obstacleStrings,
    obstacleNumbers,
    obstacleFlags,
    heightMapShape,
    heightMapNumbers,
  ) => {
    const startedAtMs = Date.now();
    const data = nativeBattleDataPayload(
      battleStrings,
      battleNumbers,
      battleFlags,
      sideParticipantCounts,
      sideNumbers,
      participantStrings,
      participantNumbers,
      participantFlags,
      formationStrings,
      formationNumbers,
      formationFlags,
      waypointCounts,
      waypointNumbers,
      actionCounts,
      actionStrings,
      actionNumbers,
      actionFlags,
      obstacleStrings,
      obstacleNumbers,
      obstacleFlags,
      heightMapShape,
      heightMapNumbers,
    );
    dispatchBridgeEvent('game.get_battle_data', data);
    recordUIPerfBridgeEvent('game.get_battle_data', startedAtMs, Date.now());
  });

  engine.on('StrategyBattleFrame', (
    sequence,
    battleId,
    formationIds,
    formationNumbers,
    formationFlags,
    formationTargetIndices,
    waypointCounts,
    waypointNumbers,
    agentCounts,
    agentNumbers,
    agentFlags,
    agentTargetIndices,
  ) => {
    const startedAtMs = Date.now();
    scheduleNativeFrameDispatch({
      eventName: 'StrategyBattleFrame',
      bridgeEventName: 'game.get_battle_frame',
      sequence: bridgeNumber(sequence),
      startedAtMs,
      dispatch: () => {
        const data = nativeBattleFramePayload(
          battleId,
          formationIds,
          formationNumbers,
          formationFlags,
          formationTargetIndices,
          waypointCounts,
          waypointNumbers,
          agentCounts,
          agentNumbers,
          agentFlags,
          agentTargetIndices,
        );
        dispatchBridgeEvent('game.get_battle_frame', data);
      },
    });
  });

  engine.on('StrategyWorldGlancesFrame', (
    sequence,
    frameNumbers,
    frameFlags,
    counts,
    entryStrings,
    entryNumbers,
    entryFlags,
  ) => {
    const startedAtMs = Date.now();
    scheduleNativeFrameDispatch({
      eventName: 'StrategyWorldGlancesFrame',
      bridgeEventName: 'game.world_glances_frame',
      sequence: bridgeNumber(sequence),
      startedAtMs,
      dispatch: () => {
        const data = nativeWorldGlancesFramePayload(
          frameNumbers,
          frameFlags,
          counts,
          entryStrings,
          entryNumbers,
          entryFlags,
        );
        dispatchBridgeEvent('game.world_glances_frame', data);
      },
    });
  });

  engine.on('StrategyNotificationAnchorsFrame', (
    sequence,
    entryStrings,
    entryNumbers,
  ) => {
    const startedAtMs = Date.now();
    scheduleNativeFrameDispatch({
      eventName: 'StrategyNotificationAnchorsFrame',
      bridgeEventName: 'game.notification_anchors_frame',
      sequence: bridgeNumber(sequence),
      startedAtMs,
      dispatch: () => {
        const data = nativeNotificationAnchorsFramePayload(entryStrings, entryNumbers);
        dispatchBridgeEvent('game.notification_anchors_frame', data);
      },
    });
  });

  void Promise.resolve(engine.call('ScriptingReady'))
    .catch(error => acknowledgeBridgeFailure(error, 'ScriptingReady'));
  return true;
}

function shouldInstallMockRuntime(): boolean {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.MODE === 'mock') return true;
  if (import.meta.env.VITE_FOAE_MOCK_UI === '1') return true;
  return new URLSearchParams(window.location.search).has('mock');
}

function installMockRuntimeScript(): Promise<void> {
  if (!shouldInstallMockRuntime()) return Promise.resolve();
  if (window.__foaeMockBridge) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/src/dev/mockRuntimeBootstrap.ts';

    const cleanup = () => {
      window.removeEventListener('foae:mock-runtime-ready', onReady);
      window.removeEventListener('foae:mock-runtime-error', onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to install mock runtime bridge'));
    };

    window.addEventListener('foae:mock-runtime-ready', onReady, { once: true });
    window.addEventListener('foae:mock-runtime-error', onError, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
  });
}

async function bootstrap() {
  await installMockRuntimeScript();

  window.addEventListener('foae:runtime-viewport', (event) => {
    applyRuntimeViewportScale((event as CustomEvent<RuntimeViewportState>).detail);
  });

  bindUIPerfCommands();

  if (!bindBridgeEvents()) {
    const retryId = window.setInterval(() => {
      if (bindBridgeEvents()) window.clearInterval(retryId);
    }, 50);
  }
  bindMouseStateBridge();
  installImageAutosize();
  await modsReady;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();

// Bridge payload helpers live outside main.tsx so boot order is readable.

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

export function bridgeNumber(value: unknown, fallback = 0): number {
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

export function nativeBattleFramePayload(
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

export function nativeBattleDataPayload(
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

export function nativeWorldGlancesFramePayload(
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

export function nativeNotificationAnchorsFramePayload(
  entryStringsValue: unknown,
  entryNumbersValue: unknown,
  entryPayloadsValue: unknown,
) {
  const entryStrings = nativeStringArray(entryStringsValue);
  const entryNumbers = nativeNumberArray(entryNumbersValue);
  const entryPayloads = nativeStringArray(entryPayloadsValue);

  return {
    settlements: entryStrings.map((id, index) => {
      const numberOffset = index * NATIVE_NOTIFICATION_ANCHOR_FRAME_NUMBER_STRIDE;
      const payloadJson = entryPayloads[index];
      return {
        id,
        screenX: entryNumbers[numberOffset] ?? 0,
        screenY: entryNumbers[numberOffset + 1] ?? 0,
        viewportWidth: entryNumbers[numberOffset + 2] ?? 0,
        viewportHeight: entryNumbers[numberOffset + 3] ?? 0,
        zOrder: entryNumbers[numberOffset + 4] ?? 0,
        payloadJson,
        payload: JSON.parse(payloadJson),
      };
    }),
  };
}

export function nativeBridgeJsonPayload(
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

export function bridgeEventPayload(eventName: string, payload: unknown): unknown {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const normalise = BRIDGE_EVENT_NORMALISERS[eventName];
  return normalise ? normalise(parsed) : parsed;
}


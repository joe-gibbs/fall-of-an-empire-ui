import type { BattlefieldHeightPointDetail, BattlefieldObstacleDetail, BattleFormationAgentState, BattleFormationDetail, BridgeActions, CultureInfo, PersonActivitySegmentEntry, PersonStatModifierEntry, PortraitLayerData, ReligionInfo, ScenarioMapStatDto, ScenarioMapTraitDto, ScenarioMapTreatyDto, WebUIDisplayLine, WebUIRoleTierData } from '../bridge-types.generated.ts';
import {
  GOVERNOR_MISSION_ICON,
  GOVERNOR_MISSION_SUPPRESS_UNREST_ICON,
} from '../utils/iconMaps';

type BridgeActionName = keyof BridgeActions;
type BridgeResponse<A extends BridgeActionName> = BridgeActions[A]['response'];

interface MockHintSeed {
  hintKey: string;
  title: string;
  paragraphs: string[];
}

export type MockAppMode = 'mainmenu' | 'ingame' | 'loading';
export type MockOutcome = 'victory' | 'defeat';
export type MockDefeatCause = 'extinction' | 'conquest' | 'subjugation' | 'rebellion' | 'governorship' | 'demo_expired';
type MockEventKind = 'court' | 'recall' | 'important';

export interface MockBridgeEventEmitter {
  (eventName: string, payload: unknown): void;
}

export interface MockLaunchRequest {
  appMode?: MockAppMode;
  screen?: string;
  screenId?: string;
  sidebar?: string;
  sidebarId?: string;
  sidebarTabIndex?: number;
  notification?: boolean;
  regularNotification?: boolean;
  actionResultNotification?: boolean;
  battleAarNotification?: boolean;
  battleAarOutcome?: MockOutcome;
  event?: boolean;
  importantEvent?: boolean;
  recallEvent?: boolean;
  tutorialSpotlight?: boolean;
  governorSelection?: boolean;
  courtier?: boolean;
  allyCall?: boolean;
  outcome?: MockOutcome;
  defeatCause?: MockDefeatCause;
}

function mockDisplayLine(text: string, tone: string = ''): WebUIDisplayLine {
  return {
    kind: 'body',
    tone,
    conceptId: '',
    segments: [
      {
        text,
        tone,
        conceptId: '',
        linkType: '',
        linkId: '',
        isStrong: false,
      },
    ],
  };
}

function mockDisplayLines(text: string, tone: string = ''): WebUIDisplayLine[] {
  return text ? [mockDisplayLine(text, tone)] : [];
}

function mockRoleTier(xp: number): WebUIRoleTierData {
  if (xp >= 1000) return { stars: 5, label: 'Master', base: 85 };
  if (xp >= 600) return { stars: 4, label: 'Expert', base: 70 };
  if (xp >= 300) return { stars: 3, label: 'Veteran', base: 55 };
  if (xp >= 100) return { stars: 2, label: 'Experienced', base: 40 };
  if (xp > 0) return { stars: 1, label: 'Novice', base: 25 };
  return { stars: 0, label: 'Untrained', base: 10 };
}

function mockActivitySegments(profile: { id: string; activityText: string }): PersonActivitySegmentEntry[] {
  if (profile.id === MOCK_IDS.governor) {
    return [
      { text: 'Governing ', linkType: '', linkId: '' },
      { text: 'Aurelion', linkType: 'settlement', linkId: MOCK_IDS.settlement },
    ];
  }

  return profile.activityText ? [{ text: profile.activityText, linkType: '', linkId: '' }] : [];
}

function mockPersonHistory(profile: { activity: string }, isRuler: boolean, isGovernor: boolean, isImprisoned: boolean): BridgeResponse<'game.get_person_data'>['history'] {
  const base = [
    {
      type: 'InCourt',
      label: 'Courtier',
      targetId: MOCK_IDS.playerFaction,
      targetType: 'faction',
      targetName: 'Rephsian Empire',
      secondaryTargetId: '',
      secondaryTargetType: '',
      secondaryTargetName: '',
      startDate: '1/1/771',
      endDate: '12/4/777',
      startDay: 258720,
      endDay: 260864,
      isActive: false,
      detail: '',
    },
  ];

  if (isRuler) {
    return [
      {
        type: 'RulingFaction',
        label: 'Ruler',
        targetId: MOCK_IDS.playerFaction,
        targetType: 'faction',
        targetName: 'Rephsian Empire',
        secondaryTargetId: '',
        secondaryTargetType: '',
        secondaryTargetName: '',
        startDate: '13/4/777',
        endDate: '',
        startDay: 260865,
        endDay: 0,
        isActive: true,
        detail: '',
      },
      ...base,
    ];
  }

  if (isGovernor) {
    return [
      {
        type: 'Governorship',
        label: 'Governor',
        targetId: '',
        targetType: 'region',
        targetName: 'Aurelion',
        secondaryTargetId: MOCK_IDS.playerFaction,
        secondaryTargetType: 'faction',
        secondaryTargetName: 'Rephsian Empire',
        startDate: '3/8/781',
        endDate: '',
        startDay: 262320,
        endDay: 0,
        isActive: true,
        detail: '',
      },
      ...base,
    ];
  }

  if (profile.activity === 'CommandingArmy') {
    return [
      {
        type: 'MilitaryCommand',
        label: 'Commander',
        targetId: MOCK_IDS.military,
        targetType: 'military',
        targetName: 'Field Army of Aurelion',
        secondaryTargetId: MOCK_IDS.playerFaction,
        secondaryTargetType: 'faction',
        secondaryTargetName: 'Rephsian Empire',
        startDate: '7/2/783',
        endDate: '',
        startDay: 262824,
        endDay: 0,
        isActive: true,
        detail: '',
      },
      ...base,
    ];
  }

  if (isImprisoned) {
    return [
      {
        type: 'Imprisoned',
        label: 'Prisoner',
        targetId: MOCK_IDS.rivalFaction,
        targetType: 'faction',
        targetName: 'Aurestian League',
        secondaryTargetId: MOCK_IDS.settlement,
        secondaryTargetType: 'settlement',
        secondaryTargetName: 'Velath Keep',
        startDate: '19/6/783',
        endDate: '',
        startDay: 262956,
        endDay: 0,
        isActive: true,
        detail: '',
      },
      ...base,
    ];
  }

  return base;
}

function mockHintResponse(seed: MockHintSeed): BridgeResponse<'game.hint_events'> {
  return {
    ...seed,
    paragraphPages: seed.paragraphs.map(text => ({ text })),
  };
}

const SCENARIO_STAT_META: Record<string, { label: string; description: string }> = {
  tactics: {
    label: 'Tactics',
    description: 'Determines battlefield command and formation manoeuvres.',
  },
  authority: {
    label: 'Authority',
    description: 'Affects loyalty, command, and the force of rulership.',
  },
  cunning: {
    label: 'Cunning',
    description: 'Governs intrigue, spycraft, and counter-schemes.',
  },
  governance: {
    label: 'Governance',
    description: 'Shapes administration, tax collection, and provincial order.',
  },
  loyalty: {
    label: 'Loyalty',
    description: 'Measures faithfulness to the ruling order.',
  },
  constitution: {
    label: 'Constitution',
    description: 'Represents health, resilience, and stamina.',
  },
  militaryStrength: {
    label: 'Military Strength',
    description: 'The total strength of armies and fleets controlled by this faction.',
  },
  gold: {
    label: 'Treasury',
    description: 'Gold available to this faction at the start of the campaign.',
  },
  population: {
    label: 'Population',
    description: "People living in this faction's settlements.",
  },
  settlements: {
    label: 'Settlements',
    description: 'Settlements directly controlled by this faction.',
  },
};

interface MockScenarioModifier {
  label: string;
  value: number;
}

function mockScenarioTrait(
  id: string,
  name: string = id.replace(/([a-z])([A-Z])/g, '$1 $2'),
  description = 'A personal trait that changes the ruler stats shown here.',
  effects: ScenarioMapTraitDto['effects'] = [],
): ScenarioMapTraitDto {
  return {
    id,
    icon: id,
    name,
    description,
    isPositive: effects.every(effect => effect.isPositive),
    effects,
  };
}

function mockScenarioEffect(stat: string, value: number): ScenarioMapTraitDto['effects'][number] {
  return {
    stat,
    label: SCENARIO_STAT_META[stat]?.label ?? stat,
    value: value > 0 ? `+${value}` : `${value}`,
    isPositive: value >= 0,
  };
}

function mockScenarioStat(id: string, baseValue: number, modifiers: MockScenarioModifier[] = []): ScenarioMapStatDto {
  const meta = SCENARIO_STAT_META[id] ?? { label: id, description: '' };
  const value = baseValue + modifiers.reduce((total, modifier) => total + modifier.value, 0);
  return {
    id,
    label: meta.label,
    description: meta.description,
    baseValue,
    value,
    breakdown: [{ label: 'Base', value: baseValue }, ...modifiers],
  };
}

function mockScenarioTreaty(
  withFactionBaseName: string,
  withFactionDisplayName: string,
  type: string,
  displayName: string = type.replace(/([a-z])([A-Z])/g, '$1 $2'),
  description = 'A standing diplomatic pact with this faction.',
): ScenarioMapTreatyDto {
  return {
    withFactionBaseName,
    withFactionDisplayName,
    type,
    displayName,
    description,
  };
}

function mockScenarioFactionStats(
  militaryStrength: number,
  gold: number,
  population: number,
  settlements: number,
): ScenarioMapStatDto[] {
  return [
    mockScenarioStat('militaryStrength', militaryStrength),
    mockScenarioStat('gold', gold),
    mockScenarioStat('population', population),
    mockScenarioStat('settlements', settlements),
  ];
}

export const MOCK_IDS = {
  playerFaction: 'mock-faction-player',
  rivalFaction: 'mock-faction-rival',
  subjectFaction: 'mock-faction-subject',
  settlement: 'mock-settlement-capital',
  portSettlement: 'mock-settlement-port',
  character: 'mock-person-ruler',
  heir: 'mock-person-heir',
  governor: 'mock-person-governor',
  courtier: 'mock-person-bishop',
  military: 'mock-military-field-army',
  navy: 'mock-military-navy',
  powerBloc: 'mock-bloc-court',
  battle: 'mock-battle-border',
} as const;

const GRAND_CAMPAIGN_MENU_DESCRIPTION = 'Pick a faction in the fractured Rephsian Empire.';
const GRAND_CAMPAIGN_FACTION_SELECTION_DESCRIPTION = 'Rephsia still commands a vast chain of provinces, border marches and foederati allies, but the realm is already cracking. The Western Rebellion has broken into open war, the Hervati have risen against imperial authority, and frontier conflicts are draining attention from the capital.\n\nEvery playable faction begins inside that crisis. Loyalists can try to hold the old order together through governors, armies and uneasy subjects. Rebels and frontier powers can turn imperial weakness into land, legitimacy and a new balance of power. Your choice decides whether the campaign is a defence of the old realm, a civil war for its heart, or the start of something that replaces it.';
const TUTORIAL_MENU_DESCRIPTION = 'A guided campaign for learning armies, settlements, diplomacy and war.';

interface MockPersonalGuardState {
  unitIds: string[];
  hasGuard: boolean;
  isForming: boolean;
  formStartDay: number;
  militaryId: string;
  commanderId: string;
}

interface MockBridgeState {
  appMode: MockAppMode;
  provinceMode: boolean;
  isPaused: boolean;
  pauseMenuOpen: boolean;
  speedLevel: number;
  personalGuard: MockPersonalGuardState;
  debugMode: boolean;
  gameDay: number;
  climateTrend: number;
  climateDescription: string;
  saveSerial: number;
  activeMapMode: string;
  mapModeFilterActive: boolean;
  activeMapModeFilterIds: string[];
  selectedBishopricFilterId: string;
  eventVisible: boolean;
  eventKind: MockEventKind;
  tutorialSpotlightVisible: boolean;
  autoAssignGovernorsEnabled: boolean;
  autoAssignCourtEnabled: boolean;
  enteredCourtContestKeys: string[];
  autoAssignClergyEnabled: boolean;
  bureaucraticRushPressure: number;
  playerGold: number;
  playerReligionKey: string;
  religionConversionActive: boolean;
  religionConversionTargetKey: string;
  religionConversionStageIndex: number;
  religionConversionStageStartDay: number;
  showSettlementGlances: boolean;
  showMilitaryGlances: boolean;
  showConvoyGlances: boolean;
  convoyFactionFilterActive: boolean;
  activeConvoyFactionIds: string[];
  pinnedItems: BridgeResponse<'game.get_pinned_items'>['items'];
  governorAssignmentActive: boolean;
  selectedGovernorId: string;
  provinceTakeoverActive: boolean;
  selectedProvinceTakeoverId: string;
  buildingPlacementActive: boolean;
  buildingPlacementId: string;
  buildingPlacementQueuedCount: number;
  buildingPlacementTotalCost: number;
  formationSelectionActive: boolean;
  formationSelectionTemplateId: string;
  militaryCustomNames: Record<string, string>;
}

interface MockFactionReference {
  id: string;
  debugShortId: number;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  isRebel: boolean;
}

const PLAYER_COLOUR = '#7E2636';
const PLAYER_SECONDARY = '#C9A85A';
const RIVAL_COLOUR = '#315D70';
const RIVAL_SECONDARY = '#D3C0A0';
const SUBJECT_COLOUR = '#586A3D';
const SUBJECT_SECONDARY = '#C2A55A';

const MOCK_DEBUG_SHORT_IDS: Record<string, number> = {
  [MOCK_IDS.playerFaction]: 101,
  [MOCK_IDS.rivalFaction]: 201,
  [MOCK_IDS.subjectFaction]: 301,
  [MOCK_IDS.settlement]: 401,
  [MOCK_IDS.portSettlement]: 402,
  [MOCK_IDS.character]: 501,
  [MOCK_IDS.heir]: 502,
  [MOCK_IDS.governor]: 503,
  [MOCK_IDS.courtier]: 504,
  [MOCK_IDS.military]: 601,
  [MOCK_IDS.navy]: 701,
  [MOCK_IDS.powerBloc]: 801,
  [MOCK_IDS.battle]: 901,
};

function mockDebugShortId(id: string): number {
  const known = MOCK_DEBUG_SHORT_IDS[id];
  if (known !== undefined) return known;

  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 9000;
  }
  return 1000 + hash;
}

const MALE_PORTRAIT_1 = '/assets/portraits/male_001.png';
const MALE_PORTRAIT_2 = '/assets/portraits/male_002.png';
const FEMALE_PORTRAIT_1 = '/assets/portraits/female_001.png';
const PORTRAIT_BACKGROUND_ROOT = '/assets/portraits/backgrounds';
const IMPRISONED_BACKGROUND = `${PORTRAIT_BACKGROUND_ROOT}/RephsianBackground4.png`;

const MOCK_LAYERED_PORTRAITS: Record<string, PortraitLayerData> = {
  [MALE_PORTRAIT_1]: {
    background: `${PORTRAIT_BACKGROUND_ROOT}/T_RephsianFactionLeaderBackground.png`,
    backHeadgear: '',
    portrait: MALE_PORTRAIT_1,
    normalMap: '',
    faceMask: '',
    frontHeadgear: '',
  },
  [MALE_PORTRAIT_2]: {
    background: `${PORTRAIT_BACKGROUND_ROOT}/RephsianArmyBackground1.png`,
    backHeadgear: '',
    portrait: MALE_PORTRAIT_2,
    normalMap: '',
    faceMask: '',
    frontHeadgear: '',
  },
  [FEMALE_PORTRAIT_1]: {
    background: `${PORTRAIT_BACKGROUND_ROOT}/RephsianBackground3.png`,
    backHeadgear: '',
    portrait: FEMALE_PORTRAIT_1,
    normalMap: '',
    faceMask: '',
    frontHeadgear: '',
  },
};

function mockPortraitLayers(portrait: string, isImprisoned = false): PortraitLayerData {
  const layers = MOCK_LAYERED_PORTRAITS[portrait] ?? {
    background: `${PORTRAIT_BACKGROUND_ROOT}/RephsianBackground1.png`,
    backHeadgear: '',
    portrait,
    normalMap: '',
    faceMask: '',
    frontHeadgear: '',
  };

  if (!isImprisoned) {
    return layers;
  }

  return {
    ...layers,
    background: IMPRISONED_BACKGROUND,
  };
}

const rephsianCulture: CultureInfo = {
  id: 'rephsian',
  name: 'Rephsian',
  adjective: 'Rephsian',
  plural: 'Rephsians',
  description: 'A courtly imperial culture with a strong written tradition and disciplined public life.',
  colour: '#C9A85A',
  group: 'rephsian',
  groupDisplayName: 'Rephsian',
  canRecruitAsAuxiliaries: true,
};

const aurestianCulture: CultureInfo = {
  id: 'aurestian',
  name: 'Aurestian',
  adjective: 'Aurestian',
  plural: 'Aurestians',
  description: 'A frontier culture shaped by hill towns, local assemblies, and veteran households.',
  colour: '#74A0AA',
  group: 'rephsian',
  groupDisplayName: 'Rephsian',
  canRecruitAsAuxiliaries: true,
};

const rephsianReligion: ReligionInfo = {
  id: 'rephsianpantheon',
  name: 'Rephsian Pantheon',
  adjective: 'Rephsian',
  adherentPlural: 'Pantheonists',
  description: 'An organised temple tradition that binds legitimacy to public rites and civic patronage.',
  colour: '#C9A85A',
  isOrganised: true,
  tacticsBonus: 0,
  authorityBonus: 1,
  cunningBonus: 0,
  governanceBonus: 1,
  taxEfficiencyModifier: 0.05,
  developmentSpeedModifier: 0.04,
  armyMoraleBonus: 0,
  recruitmentSpeedModifier: 0,
  settlementGrowthModifier: 0.02,
  unrestModifier: -0.03,
};

const rivalReligion: ReligionInfo = {
  id: 'aurelianism',
  name: 'Aurelianism',
  adjective: 'Aurelian',
  adherentPlural: 'Aurelians',
  description: 'A solar reform faith favoured by officers, magistrates, and ambitious frontier patrons.',
  colour: '#D8B35A',
  isOrganised: true,
  tacticsBonus: 1,
  authorityBonus: 0,
  cunningBonus: 0,
  governanceBonus: 0,
  taxEfficiencyModifier: 0,
  developmentSpeedModifier: 0,
  armyMoraleBonus: 0.04,
  recruitmentSpeedModifier: 0.02,
  settlementGrowthModifier: 0,
  unrestModifier: 0,
};

const MOCK_CONVERSION_STAGES = [
  {
    name: 'Toleration Edict',
    description: 'Issue a decree of toleration for the target faith, allowing its open practice within your realm.',
    durationDays: 1008,
    goldCost: 5000,
    unrestPercent: 0.15,
    targetShareBoostPerYear: 0,
    taxEfficiencyPenalty: 0,
    courtierLoyaltyPenalty: 0,
    changesReligion: false,
  },
  {
    name: 'Missionary Campaign',
    description: 'Fund missionaries to spread the target faith across your settlements.',
    durationDays: 2352,
    goldCost: 10000,
    unrestPercent: 0.45,
    targetShareBoostPerYear: 0.03,
    taxEfficiencyPenalty: 0.1,
    courtierLoyaltyPenalty: 0,
    changesReligion: false,
  },
  {
    name: 'Official Adoption',
    description: 'Formally adopt the new faith as the state religion.',
    durationDays: 1344,
    goldCost: 15000,
    unrestPercent: 0.75,
    targetShareBoostPerYear: 0,
    taxEfficiencyPenalty: 0,
    courtierLoyaltyPenalty: 25,
    changesReligion: true,
  },
  {
    name: 'Consolidation',
    description: "Consolidate the new faith's position across the realm.",
    durationDays: 2016,
    goldCost: 5000,
    unrestPercent: 0.3,
    targetShareBoostPerYear: 0.015,
    taxEfficiencyPenalty: 0,
    courtierLoyaltyPenalty: 0,
    changesReligion: false,
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function payloadValue(payload: unknown, key: string): unknown {
  if (!payload || typeof payload !== 'object') return undefined;
  return (payload as Record<string, unknown>)[key];
}

function payloadString(payload: unknown, key: string, fallback = ''): string {
  const value = payloadValue(payload, key);
  return typeof value === 'string' && value ? value : fallback;
}

function payloadBoolean(payload: unknown, key: string, fallback = false): boolean {
  const value = payloadValue(payload, key);
  return typeof value === 'boolean' ? value : fallback;
}

function payloadStringArray(payload: unknown, key: string): string[] {
  const value = payloadValue(payload, key);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function payloadNumber(payload: unknown, key: string, fallback = 0): number {
  const value = payloadValue(payload, key);
  return typeof value === 'number' ? value : fallback;
}

function ok<T>(result: T): { ok: true; result: T } {
  return { ok: true, result };
}

function playerFactionReference() {
  return {
    id: MOCK_IDS.playerFaction,
    debugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
    name: 'Rephsian Empire',
    colour: PLAYER_COLOUR,
    secondaryColour: PLAYER_SECONDARY,
    cultureGroup: 'Rephsian',
    emblem: 'Rephsian_1',
    isRebel: false,
  };
}

function rivalFactionReference() {
  return {
    id: MOCK_IDS.rivalFaction,
    debugShortId: mockDebugShortId(MOCK_IDS.rivalFaction),
    name: 'Aurestian League',
    colour: RIVAL_COLOUR,
    secondaryColour: RIVAL_SECONDARY,
    cultureGroup: 'Aurestian',
    emblem: 'Aurestian_1',
    isRebel: false,
  };
}

function subjectFactionReference() {
  return {
    id: MOCK_IDS.subjectFaction,
    debugShortId: mockDebugShortId(MOCK_IDS.subjectFaction),
    name: 'Meridian Prefecture',
    colour: SUBJECT_COLOUR,
    secondaryColour: SUBJECT_SECONDARY,
    cultureGroup: 'Rephsian',
    emblem: 'Rephsian_2',
    isRebel: false,
  };
}

function customFactionReference(id: string, name: string, colour: string, secondaryColour: string, cultureGroup: string, emblem: string, isRebel = false): MockFactionReference {
  return {
    id,
    debugShortId: mockDebugShortId(id),
    name,
    colour,
    secondaryColour,
    cultureGroup,
    emblem,
    isRebel,
  };
}

function worldBattleParticipant(
  faction: MockFactionReference & { relation: string },
  ...detail: [number, string, string, string, number, boolean?]
) {
  void detail;
  return { faction };
}

function worldGlanceVisibility(state: MockBridgeState): BridgeResponse<'game.get_world_glance_visibility'> {
  return {
    showSettlements: state.showSettlementGlances,
    showMilitary: state.showMilitaryGlances,
    showConvoys: state.showConvoyGlances,
  };
}

function convoyFactionFilters(state: MockBridgeState): BridgeResponse<'game.get_convoy_glance_filters'> {
  const factionRows = [
    { ...playerFactionReference(), relation: 'own', convoyCount: 2 },
    { ...subjectFactionReference(), relation: 'ally', convoyCount: 1 },
    { ...rivalFactionReference(), relation: 'enemy', convoyCount: 1 },
  ];

  return {
    showConvoys: state.showConvoyGlances,
    factionFilterActive: state.convoyFactionFilterActive,
    factions: factionRows.map(faction => ({
      id: faction.id,
      name: faction.name,
      colour: faction.colour,
      secondaryColour: faction.secondaryColour,
      relation: faction.relation,
      convoyCount: faction.convoyCount,
      active: !state.convoyFactionFilterActive || state.activeConvoyFactionIds.indexOf(faction.id) >= 0,
    })),
  } satisfies BridgeResponse<'game.get_convoy_glance_filters'>;
}

function mapModeFilterEntry(
  state: MockBridgeState,
  id: string,
  name: string,
  colour: string,
  iconPath: string,
  amount = 0,
): BridgeResponse<'game.get_map_mode_filters'>['entries'][number] {
  return {
    id,
    name,
    colour,
    iconPath,
    amount,
    active: !state.mapModeFilterActive || state.activeMapModeFilterIds.indexOf(id) >= 0,
  };
}

function clearMapModeFilters(state: MockBridgeState) {
  state.mapModeFilterActive = false;
  state.activeMapModeFilterIds = [];
}

function mapModeFilters(state: MockBridgeState): BridgeResponse<'game.get_map_mode_filters'> {
  const modeId = state.activeMapMode;
  const response = {
    modeId,
    modeLabel: modeId,
    supported: true,
    radioMode: false,
    filterActive: state.mapModeFilterActive,
    entries: [] as BridgeResponse<'game.get_map_mode_filters'>['entries'],
  };

  if (modeId === 'resources' || modeId === 'stockpiles') {
    response.modeLabel = modeId === 'stockpiles' ? 'Stockpiles' : 'Resources';
    response.entries = [
      mapModeFilterEntry(state, 'grain', 'Grain', '#CDB76A', '/assets/icons/Resources/I_Grain.png', 420),
      mapModeFilterEntry(state, 'iron', 'Iron', '#8A98A6', '/assets/icons/Resources/I_Iron.png', 82),
      mapModeFilterEntry(state, 'wood', 'Wood', '#7A5B3D', '/assets/icons/Resources/I_Wood.png', 146),
      mapModeFilterEntry(state, 'weapons', 'Weapons', '#A96348', '/assets/icons/Resources/I_Weapons.png', 34),
      mapModeFilterEntry(state, 'oil', 'Oil', '#6D8160', '/assets/icons/Resources/I_Oil.png', 18),
    ];
  } else if (modeId === 'religion') {
    response.modeLabel = 'Religion';
    response.entries = [
      mapModeFilterEntry(state, rephsianReligion.id, rephsianReligion.name, rephsianReligion.colour, `/assets/religions/${rephsianReligion.id}.png`),
      mapModeFilterEntry(state, rivalReligion.id, rivalReligion.name, rivalReligion.colour, `/assets/religions/${rivalReligion.id}.png`),
      mapModeFilterEntry(state, 'tanaism', 'Tanaism', '#6EA9B2', '/assets/religions/Tanaism.png'),
    ];
  } else if (modeId === 'culture') {
    response.modeLabel = 'Culture';
    response.entries = [
      mapModeFilterEntry(state, rephsianCulture.id, rephsianCulture.name, rephsianCulture.colour, `/assets/cultures/${rephsianCulture.id}.png`),
      mapModeFilterEntry(state, aurestianCulture.id, aurestianCulture.name, aurestianCulture.colour, `/assets/cultures/${aurestianCulture.id}.png`),
      mapModeFilterEntry(state, 'hervati', 'Hervati', '#A07655', '/assets/cultures/Hervati.png'),
    ];
  } else if (modeId === 'disease') {
    response.modeLabel = 'Disease Outbreaks';
    response.entries = [
      mapModeFilterEntry(state, 'languor', 'The Languor', '#769A68', '/assets/icons/I_Skull.png'),
      mapModeFilterEntry(state, 'ague', 'The Ague', '#8E9E4B', '/assets/icons/I_Skull.png'),
      mapModeFilterEntry(state, 'flux', 'The Flux', '#A66F45', '/assets/icons/I_Skull.png'),
    ];
  } else if (modeId === 'militaries') {
    response.modeLabel = 'Military Recruitment';
    response.entries = [
      mapModeFilterEntry(state, 'army:infantry', 'Infantry', '#787878', '/assets/icons/UnitTypes/I_ArmyInfantry.png'),
      mapModeFilterEntry(state, 'army:ranged', 'Ranged', '#5F8C5F', '/assets/icons/UnitTypes/I_ArmyRanged.png'),
      mapModeFilterEntry(state, 'army:cavalry', 'Cavalry', '#8C6D42', '/assets/icons/UnitTypes/I_ArmyCavalry.png'),
      mapModeFilterEntry(state, 'army:siege', 'Siege', '#9A7A49', '/assets/icons/UnitTypes/I_ArmySiege.png'),
      mapModeFilterEntry(state, 'currentlyBuilding', 'Currently Building', '#E4C85F', '/assets/icons/I_BuildingsQuickButton.png'),
    ];
  } else if (modeId === 'bishopric') {
    response.modeLabel = 'Bishoprics';
    response.radioMode = true;
    response.filterActive = false;
    response.entries = [
      mapModeFilterEntry(state, rephsianReligion.id, rephsianReligion.name, rephsianReligion.colour, `/assets/religions/${rephsianReligion.id}.png`),
      mapModeFilterEntry(state, rivalReligion.id, rivalReligion.name, rivalReligion.colour, `/assets/religions/${rivalReligion.id}.png`),
    ].map(entry => ({
      ...entry,
      active: entry.id === state.selectedBishopricFilterId,
    }));
  } else {
    response.supported = false;
    response.filterActive = false;
  }

  return response satisfies BridgeResponse<'game.get_map_mode_filters'>;
}

function convoyFactionVisible(state: MockBridgeState, factionId: string): boolean {
  return !state.convoyFactionFilterActive || state.activeConvoyFactionIds.indexOf(factionId) >= 0;
}

function mockWorldConvoys(state: MockBridgeState): BridgeResponse<'game.get_world_glances'>['convoys'] {
  if (!state.showConvoyGlances || state.activeMapMode !== 'resources') {
    return [];
  }

  const convoys: BridgeResponse<'game.get_world_glances'>['convoys'] = [
    {
      id: 'mock-convoy-grain',
      screenX: 980,
      screenY: 585,
      scale: 1,
      opacity: 1,
      zOrder: 10,
      detailLevel: 'full',
      faction: { ...playerFactionReference(), relation: 'own' },
      routeType: 'road',
      cargo: [
        { icon: '/assets/icons/Resources/I_Grain.png', amount: 420 },
        { icon: '/assets/icons/Resources/I_Weapons.png', amount: 160 },
        { icon: '/assets/icons/Resources/I_Leather.png', amount: 160 },
      ],
    },
    {
      id: 'mock-convoy-naval',
      screenX: 1110,
      screenY: 705,
      scale: 0.95,
      opacity: 1,
      zOrder: 10,
      detailLevel: 'full',
      faction: { ...subjectFactionReference(), relation: 'ally' },
      routeType: 'sea',
      cargo: [
        { icon: '/assets/icons/Resources/I_Oil.png', amount: 190 },
        { icon: '/assets/icons/Resources/I_Sails.png', amount: 85 },
        { icon: '/assets/icons/Resources/I_Wood.png', amount: 235 },
      ],
    },
    {
      id: 'mock-convoy-rival',
      screenX: 735,
      screenY: 625,
      scale: 0.98,
      opacity: 1,
      zOrder: 10,
      detailLevel: 'full',
      faction: { ...rivalFactionReference(), relation: 'enemy' },
      routeType: 'road',
      cargo: [
        { icon: '/assets/icons/Resources/I_Iron.png', amount: 520 },
        { icon: '/assets/icons/Resources/I_Armour.png', amount: 240 },
        { icon: '/assets/icons/Resources/I_Grain.png', amount: 420 },
      ],
    },
  ];

  return convoys.filter(convoy => convoyFactionVisible(state, convoy.faction.id));
}

function mockPolicy(id: string, name: string, value: number) {
  const inProgress = id === 'taxrate';
  const currentLoad = inProgress ? 24 : 0;
  const effectDescription = value >= 0 ? '+5% stability' : '-5% unrest control';
  const increaseEffectDescription = 'Higher investment improves local compliance.';
  const decreaseEffectDescription = 'Lower investment frees funds but weakens local services.';
  return {
    id,
    key: id,
    iconId: '',
    name,
    description: `Current ${name.toLowerCase()} posture for the realm.`,
    effectDescription,
    effectLines: mockDisplayLines(effectDescription, value >= 0 ? 'positive' : 'negative'),
    increaseEffectDescription,
    increaseEffectLines: mockDisplayLines(increaseEffectDescription, 'positive'),
    decreaseEffectDescription,
    decreaseEffectLines: mockDisplayLines(decreaseEffectDescription, 'negative'),
    levelEffects: Array.from({ length: 5 }).map((_, index) => {
      const level = index - 2;
      const levelEffectDescription = level >= 0 ? `+${(level + 1) * 5}% stability` : `${level * 5}% unrest control`;
      return {
        level,
        value: level,
        effectDescription: levelEffectDescription,
        effectLines: mockDisplayLines(levelEffectDescription, level >= 0 ? 'positive' : 'negative'),
        isCurrent: level === value,
      };
    }),
    displayFactionName: 'Rephsian Empire',
    isFromLiege: false,
    value,
    minValue: -2,
    maxValue: 2,
    increaseCost: 150,
    decreaseCost: 80,
    increaseDuration: 45,
    decreaseDuration: 30,
    increaseCausesUnrest: false,
    decreaseCausesUnrest: true,
    canModify: true,
    canIncrease: value < 2,
    canDecrease: value > -2,
    inProgress,
    activeDirection: inProgress ? 'increase' : '',
    progress: inProgress ? 0.42 : 0,
    remainingDays: inProgress ? 18 : 0,
    durationDays: inProgress ? 45 : 0,
    bureaucraticIncreaseLoad: 27,
    bureaucraticDecreaseLoad: 22,
    bureaucraticCurrentLoad: currentLoad,
    bureaucraticRushDaysSaved: inProgress ? 6 : 0,
    bureaucraticRushLoad: inProgress ? currentLoad : 0,
  };
}

function mockFactionModifier(
  key: string,
  label: string,
  description: string,
  icon: string,
  value: number,
  options: Partial<Pick<BridgeResponse<'game.get_faction_data'>['modifiers'][number], 'isPercent' | 'isMultiplier' | 'invertColouring' | 'decimals' | 'sources'>> = {},
) {
  return {
    key,
    label,
    description,
    icon,
    value,
    isPercent: options.isPercent ?? false,
    isMultiplier: options.isMultiplier ?? false,
    invertColouring: options.invertColouring ?? false,
    decimals: options.decimals ?? 0,
    sources: options.sources ?? [],
  };
}

const playerFaction: BridgeResponse<'game.get_faction_data'> = {
  id: MOCK_IDS.playerFaction,
  debugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
  name: 'Rephsian Empire',
  colour: PLAYER_COLOUR,
  secondaryColour: PLAYER_SECONDARY,
  cultureId: rephsianCulture.id,
  culture: rephsianCulture.name,
  cultureGroup: 'Rephsian',
  emblem: 'Rephsian_1',
  religionId: rephsianReligion.id,
  religion: rephsianReligion.name,
  government: 'Empire',
  governmentDisplayName: 'Empire',
  governmentDescription: 'A centralised imperial state ruled through court offices, appointed heirs, standing forces and subordinate provincial commands.',
  governmentCapabilities: [
    'Maintains standing armies instead of temporary levies.',
    'Can appoint its own heir and approve province heirs.',
    'Can create province and foederati subjects.',
    'Can manage the imperial court.',
  ],
  generatesLeaderOnSuccession: false,
  cultureInfo: rephsianCulture,
  religionInfo: rephsianReligion,
  capital: 'Aurelion',
  rulerName: 'Valen Arcastus',
  rulerId: MOCK_IDS.character,
  rulerDebugShortId: mockDebugShortId(MOCK_IDS.character),
  rulerPortrait: MALE_PORTRAIT_1,
  rulerPortraitLayers: mockPortraitLayers(MALE_PORTRAIT_1),
  population: 1596000,
  directPopulation: 1284000,
  subjectPopulation: 312000,
  populationMonthlyChange: 1840,
  populationGrowthBreakdown: [
    { name: 'Food Surplus', value: 2460 },
    { name: 'Buildings', value: 320 },
    { name: 'Starvation', value: -640 },
    { name: 'Unrest', value: -180 },
    { name: 'High Population', value: -120 },
  ],
  settlements: 14,
  subjectSettlements: 4,
  armies: 3,
  usesLevies: false,
  levyStrength: 0,
  gold: 4280,
  income: 186,
  strength: 18400,
  playerStrength: 18400,
  compliance: 100,
  isPlayer: true,
  isRebel: false,
  rebelTypeName: '',
  rebelGoalName: '',
  rebelGoalDescription: '',
  diplomaticStatus: 'neutral',
  subjectType: '',
  subjectSubtype: '',
  buildFocusKey: '',
  buildFocus: '',
  canSetBuildFocus: false,
  buildFocusBlockedReason: '',
  peaceNegotiationTargetFactionId: '',
  opinion: 100,
  vassalCount: 2,
  treaties: [
    {
      id: 'mock-treaty-defensive-pact-subject',
      type: 'Defensive Pact',
      displayName: 'Defensive Pact',
      description: 'Both factions will answer defensive calls to war.',
      withFactionId: MOCK_IDS.subjectFaction,
      withFactionDebugShortId: mockDebugShortId(MOCK_IDS.subjectFaction),
      withFaction: 'Meridian Prefecture',
      withFactionColour: SUBJECT_COLOUR,
      withFactionSecondaryColour: SUBJECT_SECONDARY,
      withFactionCulture: 'Rephsian',
      withFactionCultureGroup: 'Rephsian',
      withFactionEmblem: 'Rephsian_2',
      daysRemaining: 0,
      isPerpetual: true,
      canBreak: true,
      breakingPenalty: 25,
      isWithPlayer: false,
    },
    {
      id: 'mock-treaty-trade-rights-rival',
      type: 'Trade Rights',
      displayName: 'Trade Rights',
      description: 'Merchants may cross borders and use protected markets.',
      withFactionId: MOCK_IDS.rivalFaction,
      withFactionDebugShortId: mockDebugShortId(MOCK_IDS.rivalFaction),
      withFaction: 'Aurestian League',
      withFactionColour: RIVAL_COLOUR,
      withFactionSecondaryColour: RIVAL_SECONDARY,
      withFactionCulture: 'Aurestian',
      withFactionCultureGroup: 'Aurestian',
      withFactionEmblem: 'Aurestian_1',
      daysRemaining: 720,
      isPerpetual: false,
      canBreak: true,
      breakingPenalty: 10,
      isWithPlayer: false,
    },
  ],
  wars: [
    {
      id: MOCK_IDS.rivalFaction,
      debugShortId: mockDebugShortId(MOCK_IDS.rivalFaction),
      name: 'Aurestian League',
      colour: RIVAL_COLOUR,
      secondaryColour: RIVAL_SECONDARY,
      cultureGroup: 'Aurestian',
      emblem: 'Aurestian_1',
    },
    {
      id: 'mock-faction-raiders',
      debugShortId: mockDebugShortId('mock-faction-raiders'),
      name: 'Salt Road Raiders',
      colour: '#604040',
      secondaryColour: '#B8A070',
      cultureGroup: 'Aurestian',
      emblem: 'Aurestian_3',
    },
  ],
  policies: [
    mockPolicy('taxrate', 'Grain Doles', 1),
    mockPolicy('armyfunding', 'Frontier Levies', 0),
    mockPolicy('publicgames', 'Court Patronage', -1),
  ],
  modifiers: [
    mockFactionModifier('TaxIncomeMultiplier', 'Tax Income Multiplier', 'Changes gold collected from settlements.', '/assets/icons/I_ModTax.png', 1.18, {
      isMultiplier: true,
      decimals: 2,
      sources: [
        { label: 'Grain Doles', value: 0.12 },
        { label: 'Court Treasurer', value: 0.06 },
      ],
    }),
    mockFactionModifier('ArmyUpkeepMultiplier', 'Army Upkeep', 'Changes upkeep paid for land armies.', '/assets/icons/I_ArmiesQuickButton.png', 0.88, {
      isMultiplier: true,
      invertColouring: true,
      decimals: 2,
      sources: [
        { label: 'Frontier Levies', value: -0.08 },
        { label: 'Veteran Settlements', value: -0.04 },
      ],
    }),
    mockFactionModifier('TaxUnrest', 'Tax Unrest', 'Changes unrest caused by tax policy.', '/assets/icons/I_Unrest.png', 0.06, {
      isPercent: true,
      invertColouring: true,
      sources: [
        { label: 'Strained grain stores', value: 0.04 },
        { label: 'Emergency levies', value: 0.02 },
      ],
    }),
    mockFactionModifier('ResourceThroughputMultiplier', 'Resource Throughput', 'Changes resource production across the realm.', '/assets/icons/I_Resources.png', 1.1, {
      isMultiplier: true,
      decimals: 2,
      sources: [{ label: 'Workshop privileges', value: 0.1 }],
    }),
    mockFactionModifier('GoldIncomeBonus', 'Gold Income Bonus', 'Adds or removes monthly gold income.', '/assets/icons/I_Coins.png', 36, {
      decimals: 1,
      sources: [{ label: 'Emergency assessment', value: 36 }],
    }),
    mockFactionModifier('VassalTaxBaseRate', 'Subject Tax Rate', 'Sets the base tribute rate paid by subject factions.', '/assets/icons/I_Vassal.png', 0.18, {
      isPercent: true,
      sources: [{ label: 'Court decree', value: 0.18 }],
    }),
    mockFactionModifier('ArmyEffectivenessBonus', 'Army Effectiveness', 'Changes the combat effectiveness of land armies.', '/assets/icons/I_Swords.png', 0.08, {
      isPercent: true,
      sources: [{ label: 'Frontier Levies', value: 0.08 }],
    }),
    mockFactionModifier('NavyEffectivenessBonus', 'Navy Effectiveness', 'Changes the combat effectiveness of fleets.', '/assets/icons/I_NaviesQuickButton.png', -0.04, {
      isPercent: true,
      sources: [{ label: 'Neglected dockyards', value: -0.04 }],
    }),
    mockFactionModifier('NavyUpkeepMultiplier', 'Navy Upkeep', 'Changes upkeep paid for fleets.', '/assets/icons/I_NaviesQuickButton.png', 1.07, {
      isMultiplier: true,
      invertColouring: true,
      decimals: 2,
      sources: [{ label: 'Coastal patrols', value: 0.07 }],
    }),
    mockFactionModifier('ReligiousUnrestMultiplier', 'Religious Unrest', 'Changes unrest from religious differences.', '/assets/icons/I_Religions.png', 0.92, {
      isMultiplier: true,
      invertColouring: true,
      decimals: 2,
      sources: [{ label: 'Temple patronage', value: -0.08 }],
    }),
    mockFactionModifier('HeresySpawnChance', 'Heresy Spawn Chance', 'Changes the chance that heresies appear.', '/assets/icons/I_Bishop.png', -0.03, {
      isPercent: true,
      invertColouring: true,
      sources: [{ label: 'Bishopric oversight', value: -0.03 }],
    }),
    mockFactionModifier('ReligionPropagationChance', 'Religion Propagation', 'Changes natural spread of the state religion.', '/assets/icons/I_ReligiousConversion.png', 0.05, {
      isPercent: true,
      sources: [{ label: 'Public rites', value: 0.05 }],
    }),
    mockFactionModifier('CultureSpreadMultiplier', 'Culture Spread', 'Changes cultural spread across settlements.', '/assets/icons/I_Cultures.png', 1.12, {
      isMultiplier: true,
      decimals: 2,
      sources: [{ label: 'Court patronage', value: 0.12 }],
    }),
    mockFactionModifier('CultureUnrestMultiplier', 'Culture Unrest', 'Changes unrest from cultural differences.', '/assets/icons/I_Compliance.png', 1.06, {
      isMultiplier: true,
      invertColouring: true,
      decimals: 2,
      sources: [{ label: 'Provincial strain', value: 0.06 }],
    }),
    mockFactionModifier('OccupationCulturePressure', 'Occupation culture spread', "Changes how quickly an occupier's culture grows.", '/assets/icons/I_Domain.png', 0.9, {
      isMultiplier: true,
      decimals: 2,
      sources: [{ label: 'Local autonomy', value: -0.1 }],
    }),
    mockFactionModifier('EntertainmentBuildingEfficiency', 'Entertainment Efficiency', 'Changes unrest reduction from entertainment buildings.', '/assets/icons/I_PowerBlocUnrest.png', 0.11, {
      isPercent: true,
      sources: [{ label: 'Public games', value: 0.11 }],
    }),
  ],
  opinionBreakdown: [],
  complianceBreakdown: [
    { label: 'Imperial legitimacy', value: 25 },
    { label: 'Recent victories', value: 12 },
  ],
  assignedDiplomatId: MOCK_IDS.governor,
  assignedDiplomatName: 'Marcia Vennor',
  assignedSpyId: MOCK_IDS.heir,
  assignedSpyName: 'Cassian Arcastus',
  spyNetworkStrength: 32,
  spyHeat: 6,
  spyNetworkGrowthPerMonth: 4,
  spyCunning: 7,
  canSetDesignatedHeir: false,
  designatedHeirId: MOCK_IDS.heir,
  designatedHeirName: 'Cassian Arcastus',
  effectiveHeirId: MOCK_IDS.heir,
  effectiveHeirName: 'Cassian Arcastus',
};

const rivalFaction: BridgeResponse<'game.get_faction_data'> = {
  ...playerFaction,
  id: MOCK_IDS.rivalFaction,
  debugShortId: mockDebugShortId(MOCK_IDS.rivalFaction),
  name: 'Aurestian League',
  colour: RIVAL_COLOUR,
  secondaryColour: RIVAL_SECONDARY,
  cultureId: aurestianCulture.id,
  culture: aurestianCulture.name,
  cultureGroup: 'Aurestian',
  emblem: 'Aurestian_1',
  religionId: rivalReligion.id,
  religion: rivalReligion.name,
  government: 'Kingdom',
  governmentDisplayName: 'Kingdom',
  governmentDescription: 'A hereditary realm built around dynastic right, personal oaths and landed followers.',
  governmentCapabilities: [
    'Raises levy armies from royal lands and sworn followers.',
    'Succession follows the ruling house.',
    'Can create hereditary subjects.',
  ],
  generatesLeaderOnSuccession: false,
  cultureInfo: aurestianCulture,
  religionInfo: rivalReligion,
  capital: 'Velath Keep',
  rulerName: 'Soran Velk',
  rulerId: 'mock-person-rival',
  rulerDebugShortId: mockDebugShortId('mock-person-rival'),
  rulerPortrait: MALE_PORTRAIT_2,
  rulerPortraitLayers: mockPortraitLayers(MALE_PORTRAIT_2),
  population: 642000,
  directPopulation: 642000,
  subjectPopulation: 0,
  populationMonthlyChange: 420,
  populationGrowthBreakdown: [
    { name: 'Food Surplus', value: 610 },
    { name: 'Unrest', value: -190 },
  ],
  settlements: 7,
  subjectSettlements: 0,
  armies: 2,
  usesLevies: true,
  levyStrength: 12600,
  gold: 1130,
  income: 58,
  strength: 9100,
  compliance: 0,
  isPlayer: false,
  diplomaticStatus: 'war',
  peaceNegotiationTargetFactionId: MOCK_IDS.rivalFaction,
  opinion: 18,
  vassalCount: 0,
  treaties: [],
  wars: [{
    id: MOCK_IDS.playerFaction,
    debugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
    name: 'Rephsian Empire',
    colour: PLAYER_COLOUR,
    secondaryColour: PLAYER_SECONDARY,
    cultureGroup: 'Rephsian',
    emblem: 'Rephsian_1',
  }, {
    id: MOCK_IDS.subjectFaction,
    debugShortId: mockDebugShortId(MOCK_IDS.subjectFaction),
    name: 'Meridian Prefecture',
    colour: SUBJECT_COLOUR,
    secondaryColour: SUBJECT_SECONDARY,
    cultureGroup: 'Rephsian',
    emblem: 'Rephsian_2',
  }],
  policies: [],
  modifiers: [],
  opinionBreakdown: [
    { label: 'Border war', value: -45 },
    { label: 'Shared merchants', value: 8 },
  ],
  complianceBreakdown: [],
  assignedDiplomatId: '',
  assignedDiplomatName: '',
  assignedSpyId: MOCK_IDS.heir,
  assignedSpyName: 'Cassian Arcastus',
  spyNetworkStrength: 54,
  spyHeat: 18,
  spyNetworkGrowthPerMonth: 6,
  spyCunning: 8,
};

const subjectFaction: BridgeResponse<'game.get_faction_data'> = {
  ...playerFaction,
  id: MOCK_IDS.subjectFaction,
  debugShortId: mockDebugShortId(MOCK_IDS.subjectFaction),
  name: 'Meridian Prefecture',
  colour: SUBJECT_COLOUR,
  secondaryColour: SUBJECT_SECONDARY,
  capital: 'Namaris',
  rulerName: 'Iulia Seran',
  rulerId: 'mock-person-subject',
  rulerDebugShortId: mockDebugShortId('mock-person-subject'),
  rulerPortrait: FEMALE_PORTRAIT_1,
  rulerPortraitLayers: mockPortraitLayers(FEMALE_PORTRAIT_1),
  population: 312000,
  directPopulation: 312000,
  subjectPopulation: 0,
  populationMonthlyChange: 560,
  populationGrowthBreakdown: [
    { name: 'Food Surplus', value: 720 },
    { name: 'Buildings', value: 40 },
    { name: 'Starvation', value: -200 },
  ],
  settlements: 4,
  subjectSettlements: 0,
  armies: 1,
  usesLevies: false,
  levyStrength: 0,
  gold: 690,
  income: 32,
  strength: 3600,
  compliance: 72,
  isPlayer: false,
  diplomaticStatus: 'subject',
  subjectType: 'Prefecture',
  subjectSubtype: 'province',
  government: 'Province',
  governmentDisplayName: 'Province',
  governmentDescription: 'A subject administration governed as part of a larger imperial order.',
  governmentCapabilities: [
    'Raises levies through provincial offices and local obligations.',
    'Succession requires recognition from the liege.',
    'Can use province institutions and appointment contests.',
  ],
  generatesLeaderOnSuccession: false,
  opinion: 68,
  vassalCount: 0,
  treaties: [],
  wars: [],
  policies: [],
  modifiers: [],
  assignedDiplomatId: '',
  assignedDiplomatName: '',
  assignedSpyId: '',
  assignedSpyName: '',
  spyNetworkStrength: 0,
  spyHeat: 0,
  spyNetworkGrowthPerMonth: 0,
  spyCunning: 0,
  canSetDesignatedHeir: true,
  designatedHeirId: MOCK_IDS.heir,
  designatedHeirName: 'Cassian Arcastus',
  effectiveHeirId: MOCK_IDS.heir,
  effectiveHeirName: 'Cassian Arcastus',
};

function readOnlyLiegePolicy(policy: ReturnType<typeof mockPolicy>) {
  return {
    ...policy,
    displayFactionName: playerFaction.name,
    isFromLiege: true,
    canModify: false,
    canIncrease: false,
    canDecrease: false,
    inProgress: false,
    activeDirection: '',
    progress: 0,
    remainingDays: 0,
    durationDays: 0,
    bureaucraticCurrentLoad: 0,
    bureaucraticRushDaysSaved: 0,
    bureaucraticRushLoad: 0,
  };
}

const provincePlayerFaction: BridgeResponse<'game.get_faction_data'> = {
  ...subjectFaction,
  isPlayer: true,
  diplomaticStatus: 'subject',
  subjectType: 'Province',
  subjectSubtype: 'province',
  opinion: 42,
  compliance: 72,
  playerStrength: subjectFaction.strength,
  treaties: [
    {
      id: 'mock-treaty-province-overlord',
      type: 'Subject',
      displayName: 'Province',
      description: 'This province is governed under the authority of the Rephsian Empire.',
      withFactionId: MOCK_IDS.playerFaction,
      withFactionDebugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
      withFaction: playerFaction.name,
      withFactionColour: PLAYER_COLOUR,
      withFactionSecondaryColour: PLAYER_SECONDARY,
      withFactionCulture: playerFaction.culture,
      withFactionCultureGroup: playerFaction.cultureGroup,
      withFactionEmblem: playerFaction.emblem,
      daysRemaining: 0,
      isPerpetual: true,
      canBreak: false,
      breakingPenalty: 0,
      isWithPlayer: true,
    },
  ],
  wars: [],
  policies: playerFaction.policies.map(readOnlyLiegePolicy),
  modifiers: [
    mockFactionModifier('ImperialStanding', 'Imperial Standing', 'Changes how secure the governor is at court.', '/assets/icons/I_DependentFactions.png', 42, {
      sources: [
        { label: 'Extra tribute', value: 8 },
        { label: 'Stable province', value: 6 },
        { label: 'Suspected ambition', value: -12 },
      ],
    }),
    mockFactionModifier('RecallPressure', 'Recall risk', 'Shows the current risk of being removed by the emperor.', '/assets/icons/I_Caution.png', 18, {
      invertColouring: true,
      sources: [
        { label: 'Court scrutiny', value: 12 },
        { label: 'Patron at court', value: -6 },
      ],
    }),
  ],
  canSetDesignatedHeir: false,
  designatedHeirId: '',
  designatedHeirName: '',
  effectiveHeirId: '',
  effectiveHeirName: '',
};

const provinceModeOverlordFaction: BridgeResponse<'game.get_faction_data'> = {
  ...playerFaction,
  isPlayer: false,
  diplomaticStatus: 'neutral',
  opinion: 42,
};

function currentPlayerFactionData(provinceMode: boolean): BridgeResponse<'game.get_faction_data'> {
  return provinceMode ? provincePlayerFaction : playerFaction;
}

function factionById(id: string, provinceMode = false): BridgeResponse<'game.get_faction_data'> {
  if (provinceMode) {
    if (id === MOCK_IDS.subjectFaction) return provincePlayerFaction;
    if (id === MOCK_IDS.playerFaction) return provinceModeOverlordFaction;
  }
  if (id === MOCK_IDS.rivalFaction) return rivalFaction;
  if (id === MOCK_IDS.subjectFaction) return subjectFaction;
  return playerFaction;
}

function mockProvinceModeFactionSummary(
  faction: BridgeResponse<'game.get_faction_data'>,
): BridgeResponse<'game.get_province_mode_overview'>['province'] {
  const expenses = Math.max(0, faction.income - 210);
  return {
    id: faction.id,
    name: faction.name,
    colour: faction.colour,
    secondaryColour: faction.secondaryColour ?? '',
    culture: faction.culture,
    cultureGroup: faction.cultureGroup ?? '',
    religion: faction.religion,
    emblem: faction.emblem ?? '',
    capital: faction.capital,
    gold: faction.gold,
    income: faction.income,
    expenses,
    netIncome: faction.income - expenses,
    population: faction.population,
    settlements: faction.settlements,
    strength: faction.strength,
  };
}

function mockProvinceModePerson(id: string): BridgeResponse<'game.get_province_mode_overview'>['governor'] {
  const profile = personProfile(id);
  return {
    id: profile.id,
    debugShortId: mockDebugShortId(profile.id),
    name: profile.name,
    title: profile.shortTitle,
    portrait: profile.portrait,
    portraitLayers: mockPortraitLayers(profile.portrait),
    tactics: profile.stats.tactics,
    authority: profile.stats.authority,
    cunning: profile.stats.cunning,
    governance: profile.stats.governance,
    loyalty: profile.stats.loyalty,
    fame: profile.fame,
    clients: profile.id === MOCK_IDS.governor ? 4 : 2,
    patrons: profile.id === MOCK_IDS.governor ? 1 : 0,
    hasCommand: profile.activity === 'CommandingArmy',
    commandName: profile.activity === 'CommandingArmy' ? 'I Field Army' : '',
  };
}

function mockProvinceModeOverview(state: MockBridgeState): BridgeResponse<'game.get_province_mode_overview'> {
  const active = state.provinceMode;
  return {
    active,
    province: mockProvinceModeFactionSummary(provincePlayerFaction),
    imperialFaction: mockProvinceModeFactionSummary(provinceModeOverlordFaction),
    governor: mockProvinceModePerson(MOCK_IDS.governor),
    emperor: mockProvinceModePerson(MOCK_IDS.character),
    successor: mockProvinceModePerson(MOCK_IDS.heir),
    standingScore: active ? 72 : 0,
    standingTrend: active ? 2 : 0,
    threatScore: active ? 38 : 0,
    recallStage: active ? 1 : 0,
    nextReviewDays: 27,
    reviewIntervalDays: 168,
    threatRows: active ? [
      { id: 'fame', icon: '/assets/icons/I_Fame.png', label: 'Fame', description: 'Governor fame and authority make recall politically harder: +14 from 112 fame.', value: 14, remainingDays: 0, tone: 'high' },
      { id: 'clients', icon: '/assets/icons/I_Characters.png', label: 'Clients', description: 'Clients and patrons +16; emperor as client 0.', value: 16, remainingDays: 0, tone: 'high' },
      { id: 'bloc', icon: '/assets/icons/I_PowerBlocs.png', label: 'Power bloc', description: 'The governor belongs to a power bloc, giving them allies at court.', value: 6, remainingDays: 0, tone: 'medium' },
      { id: 'military', icon: '/assets/icons/I_ArmiesQuickButton.png', label: 'Military command', description: 'The governor does not command an army or navy.', value: 0, remainingDays: 0, tone: 'low' },
      { id: 'wealth', icon: '/assets/icons/I_Coins.png', label: 'Treasury', description: 'Provincial treasury contributes +2 from 2400 gold.', value: 2, remainingDays: 0, tone: 'low' },
    ] : [],
    standingRows: active ? [
      { id: 'loyalty', icon: '/assets/icons/StatIcons/I_Loyalty.png', label: 'Loyalty', description: "Part of the governor's personal compliance with the emperor.", value: 31, remainingDays: 0, tone: 'positive' },
      { id: 'patronage', icon: '/assets/icons/Relations/I_Patron.png', label: 'Patronage', description: 'Patrons +2; emperor as patron 0; emperor as client 0.', value: 10, remainingDays: 0, tone: 'positive' },
      { id: 'governor-office', icon: '/assets/icons/I_VacantCourt.png', label: 'Court office', description: 'Subordinate in Magister Militum: +4.', value: 6, remainingDays: 0, tone: 'positive' },
      { id: 'threat', icon: '/assets/icons/I_Dread.png', label: 'Political danger', description: 'Threat reduces standing by 1 for each 10 threat, up to 10.', value: -3, remainingDays: 0, tone: 'negative' },
    ] : [],
    courtOfficeActions: [],
    missions: active ? [
      {
        id: 'unrest',
        missionTypeId: 'suppress_unrest',
        icon: GOVERNOR_MISSION_SUPPRESS_UNREST_ICON,
        title: 'Suppress Unrest',
        body: 'Bring unrest in Arx Varena below 8% before time runs out.',
        reward: '+12 standing, -16 if failed',
        status: 'active',
        deadlineDays: 335,
        deadlinePercent: 99,
        targetName: 'Arx Varena',
        primaryAction: '',
        primaryActionLabel: '',
        canRunPrimaryAction: false,
      },
      {
        id: 'corruption',
        missionTypeId: 'reduce_corruption',
        icon: GOVERNOR_MISSION_ICON,
        title: 'Root Out Corruption',
        body: 'The emperor has seen tax losses from Iuvanum. Cut corruption below 18% before time runs out.',
        reward: '+10 standing, -12 if failed',
        status: 'active',
        deadlineDays: 335,
        deadlinePercent: 99,
        targetName: 'Iuvanum',
        primaryAction: '',
        primaryActionLabel: '',
        canRunPrimaryAction: false,
      },
    ] : [],
  };
}

function mockProvinceEmperorTakeover(state: MockBridgeState): BridgeResponse<'game.province_emperor_takeover'> {
  const candidateIds = [MOCK_IDS.governor, MOCK_IDS.courtier, MOCK_IDS.heir, 'mock-person-steward'];
  const candidates = candidateIds.map((id) => {
    const profile = personProfile(id);
    const governance = profile.stats.governance;
    const loyalty = profile.stats.loyalty;
    const fame = Math.round(profile.fame / 20);
    return {
      id: profile.id,
      name: profile.name,
      title: profile.shortTitle,
      sourceFactionName: profile.id === MOCK_IDS.heir ? provinceModeOverlordFaction.name : provincePlayerFaction.name,
      portrait: profile.portrait,
      portraitLayers: mockPortraitLayers(profile.portrait),
      age: profile.age,
      governance,
      loyalty,
      fame,
      support: (governance * 4) + (loyalty * 3) + fame,
      threat: Math.max(0, fame + (profile.id === MOCK_IDS.governor ? 16 : 4)),
      isSelected: state.selectedProvinceTakeoverId === profile.id,
    };
  });

  return {
    active: state.provinceTakeoverActive,
    provinceFactionId: provincePlayerFaction.id,
    provinceFactionName: provincePlayerFaction.name,
    imperialFactionId: provinceModeOverlordFaction.id,
    imperialFactionName: provinceModeOverlordFaction.name,
    selectedPersonId: state.selectedProvinceTakeoverId,
    message: '',
    candidates: state.provinceTakeoverActive ? candidates : [],
  };
}

function personStats(
  tactics: number,
  authority: number,
  cunning: number,
  governance: number,
  loyalty: number,
  constitution: number,
  temporaryModifiers: PersonStatModifierEntry[] = [],
) {
  return {
    tactics,
    authority,
    cunning,
    governance,
    loyalty,
    constitution,
    baseTactics: Math.max(0, tactics - 1),
    baseAuthority: Math.max(0, authority - 1),
    baseCunning: Math.max(0, cunning - 1),
    baseGovernance: Math.max(0, governance - 1),
    baseLoyalty: Math.max(0, loyalty - 1),
    baseConstitution: Math.max(0, constitution - 1),
    temporaryModifiers,
  };
}

function mockTrait(id: string, name: string, description: string, isPositive = true) {
  return {
    id,
    name,
    description,
    isPositive,
    effects: [
      { stat: 'authority', label: 'Authority', value: isPositive ? '+1' : '-1', isPositive },
      { stat: 'loyalty', label: 'Loyalty', value: isPositive ? '+4' : '-4', isPositive },
    ],
    isTemporary: false,
    remainingDays: 0,
    totalDurationDays: 0,
  };
}

function personProfile(id: string) {
  const profiles = {
    [MOCK_IDS.character]: { id: MOCK_IDS.character, name: 'Valen Arcastus', portrait: MALE_PORTRAIT_1, title: 'Dominus of the Rephsian Empire', shortTitle: 'Dominus', age: 51, alive: true, activity: 'RulingFaction', activityText: 'Ruling the Dominion', stats: personStats(7, 9, 6, 8, 100, 6, [
      { stat: 'authority', label: 'Emergency powers', value: 2.4, remainingDays: 84, totalDurationDays: 120 },
      { stat: 'loyalty', label: 'Blamed for defeat', value: -3.8, remainingDays: 221, totalDurationDays: 365 },
    ]), fame: 620, honourDread: 0.42, relation: '', compliance: 100, military: 520, administrative: 420, diplomatic: 260, intrigue: 120 },
    [MOCK_IDS.heir]: { id: MOCK_IDS.heir, name: 'Cassian Arcastus', portrait: MALE_PORTRAIT_2, title: 'Heir of the Dominion', shortTitle: 'Heir', age: 24, alive: true, activity: 'InCourt', activityText: 'Waiting in court', stats: personStats(5, 6, 8, 4, 58, 6), fame: 180, honourDread: -0.12, relation: 'Son', compliance: 58, military: 260, administrative: 300, diplomatic: 130, intrigue: 410 },
    [MOCK_IDS.governor]: { id: MOCK_IDS.governor, name: 'Marcia Vennor', portrait: FEMALE_PORTRAIT_1, title: 'Governor of Aurelion', shortTitle: 'Governor', age: 42, alive: true, activity: 'LeadingSettlement', activityText: `Governing <link type="settlement" id="${MOCK_IDS.settlement}">Aurelion</>`, stats: personStats(4, 7, 5, 9, 71, 5, [
      { stat: 'loyalty', label: 'Suspected corruption', value: -4.6, remainingDays: 143, totalDurationDays: 240 },
      { stat: 'governance', label: 'Emergency mandate', value: 1.7, remainingDays: 61, totalDurationDays: 90 },
    ]), fame: 260, honourDread: 0.24, relation: 'Subject', compliance: 74, military: 90, administrative: 620, diplomatic: 240, intrigue: 110 },
    [MOCK_IDS.courtier]: { id: MOCK_IDS.courtier, name: 'Caldus Veran', portrait: MALE_PORTRAIT_2, title: 'Bishop of Aurelion Basin', shortTitle: 'Bishop', age: 56, alive: true, activity: 'InCourt', activityText: 'Serving the Aurelion Basin clergy', stats: personStats(2, 6, 5, 7, 63, 5), fame: 120, honourDread: 0.06, relation: '', compliance: 63, military: 30, administrative: 380, diplomatic: 240, intrigue: 160 },
    'mock-person-spouse': { id: 'mock-person-spouse', name: 'Elena Arcastus', portrait: FEMALE_PORTRAIT_1, title: 'Consort of the Dominion', shortTitle: 'Consort', age: 47, alive: true, activity: 'InCourt', activityText: 'Maintaining the court household', stats: personStats(3, 7, 6, 8, 82, 5), fame: 340, honourDread: 0.28, relation: 'Spouse', compliance: 82, military: 60, administrative: 450, diplomatic: 380, intrigue: 210 },
    'mock-person-daughter': { id: 'mock-person-daughter', name: 'Livia Arcasta', portrait: FEMALE_PORTRAIT_1, title: 'Court Patron', shortTitle: 'Patron', age: 29, alive: true, activity: 'InCourt', activityText: 'Building a court faction', stats: personStats(3, 6, 7, 6, 64, 5), fame: 210, honourDread: 0.08, relation: 'Daughter', compliance: 64, military: 80, administrative: 360, diplomatic: 420, intrigue: 350 },
    'mock-person-brother': { id: 'mock-person-brother', name: 'Titus Arcastus', portrait: MALE_PORTRAIT_2, title: 'Frontier Commander', shortTitle: 'Commander', age: 48, alive: true, activity: 'CommandingArmy', activityText: 'Commanding the western detachments', stats: personStats(8, 7, 4, 4, 55, 7), fame: 410, honourDread: -0.05, relation: 'Brother', compliance: 55, military: 690, administrative: 160, diplomatic: 120, intrigue: 90 },
    'mock-person-grandchild': { id: 'mock-person-grandchild', name: 'Marius Arcastus', portrait: MALE_PORTRAIT_1, title: 'Young Noble', shortTitle: 'Noble', age: 8, alive: true, activity: 'InCourt', activityText: 'Raised in the palace household', stats: personStats(1, 2, 3, 2, 50, 4), fame: 40, honourDread: 0, relation: 'Grandson', compliance: 50, military: 0, administrative: 0, diplomatic: 0, intrigue: 0 },
    'mock-person-previous-ruler': { id: 'mock-person-previous-ruler', name: 'Aurelian Arcastus', portrait: MALE_PORTRAIT_2, title: 'Former Dominus', shortTitle: 'Former Ruler', age: 69, alive: false, activity: 'Deceased', activityText: 'Deceased', stats: personStats(6, 8, 5, 7, 0, 4), fame: 530, honourDread: 0.2, relation: 'Father', compliance: 0, military: 480, administrative: 520, diplomatic: 260, intrigue: 120 },
    'mock-person-tribune': { id: 'mock-person-tribune', name: 'Severus Laco', portrait: MALE_PORTRAIT_1, title: 'Tribune of the Field Army', shortTitle: 'Tribune', age: 37, alive: true, activity: 'CommandingArmy', activityText: 'Commanding a loyal cohort', stats: personStats(7, 6, 4, 3, 62, 6), fame: 190, honourDread: -0.02, relation: '', compliance: 62, military: 510, administrative: 120, diplomatic: 90, intrigue: 80 },
    'mock-person-steward': { id: 'mock-person-steward', name: 'Claudia Varra', portrait: FEMALE_PORTRAIT_1, title: 'Steward of Lacertum', shortTitle: 'Steward', age: 45, alive: true, activity: 'LeadingSettlement', activityText: 'Overseeing Lacertum grain stores', stats: personStats(2, 6, 5, 8, 69, 5), fame: 160, honourDread: 0.16, relation: '', compliance: 69, military: 40, administrative: 540, diplomatic: 160, intrigue: 140 },
    'mock-person-envoy': { id: 'mock-person-envoy', name: 'Decima Nerva', portrait: FEMALE_PORTRAIT_1, title: 'Envoy to the Border Courts', shortTitle: 'Envoy', age: 33, alive: true, activity: 'Diplomat', activityText: 'Serving as envoy abroad', stats: personStats(2, 5, 7, 6, 66, 5), fame: 145, honourDread: 0.05, relation: '', compliance: 66, military: 30, administrative: 210, diplomatic: 520, intrigue: 260 },
    'mock-person-spy': { id: 'mock-person-spy', name: 'Vibius Celer', portrait: MALE_PORTRAIT_1, title: 'Whisper Agent', shortTitle: 'Agent', age: 41, alive: true, activity: 'Spy', activityText: 'Running informants in hostile courts', stats: personStats(2, 4, 8, 5, 57, 5), fame: 125, honourDread: -0.22, relation: '', compliance: 57, military: 60, administrative: 160, diplomatic: 220, intrigue: 560 },
    'mock-person-notary': { id: 'mock-person-notary', name: 'Gaius Pelor', portrait: MALE_PORTRAIT_2, title: 'Household Notary', shortTitle: 'Notary', age: 31, alive: true, activity: 'InCourt', activityText: 'Recording court petitions', stats: personStats(1, 4, 6, 7, 61, 5), fame: 90, honourDread: 0, relation: '', compliance: 61, military: 20, administrative: 340, diplomatic: 210, intrigue: 220 },
    'mock-person-advocate': { id: 'mock-person-advocate', name: 'Flavia Merula', portrait: FEMALE_PORTRAIT_1, title: 'Court Advocate', shortTitle: 'Advocate', age: 28, alive: true, activity: 'InCourt', activityText: 'Arguing petitions in court', stats: personStats(1, 5, 7, 6, 59, 5), fame: 110, honourDread: 0.04, relation: '', compliance: 59, military: 10, administrative: 260, diplomatic: 330, intrigue: 310 },
    'mock-person-rival': { id: 'mock-person-rival', name: 'Soran Velk', portrait: MALE_PORTRAIT_2, title: 'First Speaker of the Aurestian League', shortTitle: 'First Speaker', age: 44, alive: true, activity: 'RulingFaction', activityText: 'Ruling the Aurestian League', stats: personStats(7, 8, 6, 5, 72, 6), fame: 390, honourDread: -0.18, relation: 'Rival', compliance: 0, military: 520, administrative: 260, diplomatic: 360, intrigue: 240 },
    'mock-person-subject': { id: 'mock-person-subject', name: 'Iulia Seran', portrait: FEMALE_PORTRAIT_1, title: 'Prefect of Meridian', shortTitle: 'Prefect', age: 39, alive: true, activity: 'RulingFaction', activityText: 'Ruling the Meridian Prefecture', stats: personStats(4, 6, 6, 8, 68, 5), fame: 230, honourDread: 0.18, relation: 'Subject ruler', compliance: 72, military: 120, administrative: 520, diplomatic: 310, intrigue: 190 },
    'mock-person-salt-leader': { id: 'mock-person-salt-leader', name: 'Nera Solun', portrait: FEMALE_PORTRAIT_1, title: 'Speaker of the Salt League', shortTitle: 'Speaker', age: 36, alive: true, activity: 'RulingFaction', activityText: 'Ruling the Salt League', stats: personStats(4, 6, 8, 6, 62, 5), fame: 260, honourDread: -0.04, relation: 'Foreign ruler', compliance: 0, military: 160, administrative: 280, diplomatic: 430, intrigue: 390 },
  };
  return profiles[id as keyof typeof profiles] ?? profiles[MOCK_IDS.character];
}

function personById(id: string): BridgeResponse<'game.get_person_data'> {
  const profile = personProfile(id);
  const isHeir = profile.id === MOCK_IDS.heir;
  const isGovernor = profile.id === MOCK_IDS.governor;
  const isRuler = profile.id === MOCK_IDS.character;
  const isImprisoned = profile.id === 'mock-person-steward';
  const isFamilyOfPlayer = ['Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Spouse', 'Consort', 'Grandson', 'Granddaughter', 'Kinsman', 'Kinswoman'].includes(profile.relation);
  const birthYear = 784 - profile.age;
  const birthDate = `1/1/${birthYear}`;
  const deathDate = profile.alive ? '' : '12/8/784';
  return {
    id: profile.id,
    name: profile.name,
    portrait: profile.portrait,
    portraitLayers: mockPortraitLayers(profile.portrait, isImprisoned),
    title: profile.title,
    shortTitle: profile.shortTitle,
    age: profile.age,
    birthDate,
    deathDate,
    lifespan: profile.alive ? '' : `${birthDate} - ${deathDate}`,
    deathCause: profile.alive ? '' : 'Old Age',
    debugShortId: mockDebugShortId(profile.id),
    debugAgeDays: profile.age * 365,
    vigor: 1,
    isImmortal: false,
    powerBlocName: isGovernor ? 'Palace Council' : '',
    powerBlocDebugShortId: isGovernor ? mockDebugShortId(MOCK_IDS.powerBloc) : 0,
    commanderKind: profile.activity === 'CommandingArmy' ? 'Land' : '',
    isAlive: profile.alive,
    faction: 'Rephsian Empire',
    factionId: MOCK_IDS.playerFaction,
    rulerFactionName: isRuler ? 'the Rephsian Empire' : '',
    factionColour: PLAYER_COLOUR,
    factionSecondaryColour: PLAYER_SECONDARY,
    factionEmblem: 'Rephsian_1',
    factionCultureGroup: 'Rephsian',
    cultureId: rephsianCulture.id,
    culture: rephsianCulture.name,
    religionId: rephsianReligion.id,
    religion: rephsianReligion.name,
    cultureInfo: rephsianCulture,
    religionInfo: rephsianReligion,
    activity: profile.activity,
    activitySegments: mockActivitySegments(profile),
    history: mockPersonHistory(profile, isRuler, isGovernor, isImprisoned),
    stats: profile.stats,
    fame: profile.fame,
    honourDread: profile.honourDread,
    traits: [
      mockTrait('Austere', 'Austere', 'Keeps subordinates disciplined through precise expectations.'),
      mockTrait('Ambitious', 'Ambitious', 'Seeks offices and honours with little prompting.', !isHeir),
    ],
    isPlayerCharacter: isRuler,
    isRuler,
    isHeir,
    isDesignatedHeir: isHeir,
    isFamilyOfPlayer,
    relationToPlayer: profile.relation,
    isSubordinateOfPlayer: !isRuler,
    complianceTowardPlayer: profile.compliance,
    complianceBreakdown: [
      { label: 'Personal loyalty', value: isHeir ? 12 : 22 },
      { label: 'Court expectation', value: 8 },
    ],
    opinionTowardPlayer: isHeir ? 34 : isGovernor ? 46 : 0,
    opinionBreakdown: [
      { label: 'Recent appointment', value: 16 },
      { label: 'Shared ceremonies', value: 9 },
    ],
    honourDreadBreakdown: [
      { label: 'Public justice', value: 12 },
      { label: 'Merciful verdicts', value: -4 },
    ],
    isImprisoned,
    imprisonedBy: isImprisoned ? 'Aurestian League' : '',
    imprisonmentReason: isImprisoned ? 'Hostage' : '',
    imprisonmentSettlement: isImprisoned ? 'Velath Keep' : '',
    roleExperience: {
      military: profile.military,
      administrative: profile.administrative,
      diplomatic: profile.diplomatic,
      intrigue: profile.intrigue,
    },
    roleTiers: {
      military: mockRoleTier(profile.military),
      administrative: mockRoleTier(profile.administrative),
      diplomatic: mockRoleTier(profile.diplomatic),
      intrigue: mockRoleTier(profile.intrigue),
    },
    governedRegions: isGovernor ? [
      { id: 'aurelion-heartland', name: 'Aurelion Heartland', focusSettlementId: MOCK_IDS.settlement },
      { id: 'naramis-coast', name: 'Namaris Coast', focusSettlementId: MOCK_IDS.portSettlement },
    ] : [],
    courtPosition: profile.id === MOCK_IDS.courtier ? {
      key: 'MasterOfReligion',
      name: 'Pontifex Maximus',
      courtFactionId: MOCK_IDS.playerFaction,
      courtFactionName: 'Rephsian Empire',
      isSubordinate: false,
    } : {
      key: '',
      name: '',
      courtFactionId: '',
      courtFactionName: '',
      isSubordinate: false,
    },
    commandedMilitary: profile.activity === 'CommandingArmy' ? {
      id: MOCK_IDS.military,
      name: 'Western Field Army',
      isNavy: false,
      rank: 'Dux',
    } : {
      id: '',
      name: '',
      isNavy: false,
      rank: '',
    },
    relationships: [
      { id: MOCK_IDS.character, name: 'Valen Arcastus', portrait: MALE_PORTRAIT_1, portraitLayers: mockPortraitLayers(MALE_PORTRAIT_1), type: isHeir ? 'Father' : 'Ruler', age: 51, isAlive: true },
      { id: MOCK_IDS.heir, name: 'Cassian Arcastus', portrait: MALE_PORTRAIT_2, portraitLayers: mockPortraitLayers(MALE_PORTRAIT_2), type: 'Heir', age: 24, isAlive: true },
      { id: 'mock-person-spouse', name: 'Elena Arcastus', portrait: FEMALE_PORTRAIT_1, portraitLayers: mockPortraitLayers(FEMALE_PORTRAIT_1), type: 'Consort', age: 47, isAlive: true },
      { id: 'mock-person-brother', name: 'Titus Arcastus', portrait: MALE_PORTRAIT_2, portraitLayers: mockPortraitLayers(MALE_PORTRAIT_2), type: 'Kinsman', age: 48, isAlive: true },
    ].filter(r => r.id !== id),
  };
}

function settlementBuilding(assetKey: string, name: string, level: number, category: string) {
  return {
    id: `mock-building-${assetKey}`,
    assetKey,
    name,
    level,
    maxLevel: 4,
    category,
    chainName: name,
    description: `A ${name.toLowerCase()} serving the settlement.`,
    effectsHtml: '<bullet><colour green>Improves local output</></>',
    condition: 92,
    monthlyConditionChange: -0.05,
    maintenanceGovernanceThreshold: 5,
    nextLevelPrice: 520,
    nextLevelBuildTime: 80,
    upkeep: 12,
    resourceCost: [{ name: 'Stone', displayName: 'Stone', amount: 40 }, { name: 'Wood', displayName: 'Wood', amount: 25 }],
    dismantleSpoils: [{ name: 'Gold', displayName: 'Gold', amount: 130 }, { name: 'Stone', displayName: 'Stone', amount: 16 }, { name: 'Wood', displayName: 'Wood', amount: 10 }],
    nextBuildState: { state: 'visible', reason: '' },
    developedFrom: '',
    canBeDevelopedInto: [],
    requiredBuildings: [],
    replacesParent: true,
    blocksConstruction: false,
    canDemolish: level > 0,
    demolishReason: level > 0 ? '' : 'This building has not been constructed.',
    canDowngrade: level > 1,
    downgradeReason: level > 1 ? '' : 'This building has no lower step.',
    downgradeTargetName: level > 1 ? name : '',
    downgradeTargetLevel: level > 1 ? level - 1 : 0,
  };
}

function settlementBase(id: string): BridgeResponse<'game.get_settlement_data'> {
  const isPort = id === MOCK_IDS.portSettlement;
  const isSiegeMock = !isPort;
  const rival = rivalFactionReference();
  return {
    id: isPort ? MOCK_IDS.portSettlement : MOCK_IDS.settlement,
    name: isPort ? 'Namaris' : 'Aurelion',
    debugShortId: mockDebugShortId(isPort ? MOCK_IDS.portSettlement : MOCK_IDS.settlement),
    faction: 'Rephsian Empire',
    factionColour: PLAYER_COLOUR,
    factionSecondaryColour: PLAYER_SECONDARY,
    factionEmblem: 'Rephsian_1',
    factionCultureGroup: 'Rephsian',
    factionId: MOCK_IDS.playerFaction,
    factionDebugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
    isCapital: !isPort,
    isFactionIndependent: true,
    type: isPort ? 'port' : 'metropolis',
    hasPort: isPort,
    population: isPort ? 142000 : 384000,
    populationGrowth: isPort ? 960 : 1820,
    income: isPort ? 46 : 122,
    foodProduction: isPort ? 540 : 980,
    foodConsumption: isPort ? 610 : 1210,
    fortificationLevel: isPort ? 2 : 4,
    unrest: isPort ? 0.18 : 0.08,
    unrestLabel: isPort ? 'Restless' : 'Calm',
    region: isPort ? 'Meridian Coast' : 'Heartland',
    land: isPort ? 'Namaris Shore' : 'Aurelion Basin',
    domain: 'Inner Dominion',
    regionKey: isPort ? 'MeridianCoast' : 'Heartland',
    landKey: isPort ? 'NamarisShore' : 'AurelionBasin',
    domainKey: 'InnerDominion',
    cultureId: rephsianCulture.id,
    culture: rephsianCulture.name,
    culturePercent: isPort ? 64 : 81,
    religionId: rephsianReligion.id,
    religion: rephsianReligion.name,
    religionPercent: isPort ? 59 : 76,
    hasGovernor: true,
    governor: { name: 'Marcia Vennor', title: 'Governor', personId: MOCK_IDS.governor, debugShortId: mockDebugShortId(MOCK_IDS.governor) },
    disease: {
      hasDisease: isPort,
      name: isPort ? 'The Languor' : '',
      description: isPort ? 'A wasting sickness is moving through the crowded streets.' : '',
      severity: isPort ? 0.42 : 0,
      severityLabel: isPort ? 'Moderate' : '',
      daysRemaining: isPort ? 43 : 0,
      deaths: isPort ? 1280 : 0,
      effects: isPort ? [{ name: 'Food', value: -4 }, { name: 'Resources', value: -4 }, { name: 'Tax', value: -2 }] : [],
    },
    bishoprics: [
      {
        religion: rephsianReligion,
        religionKey: rephsianReligion.id,
        religionName: rephsianReligion.name,
        religionIconPath: `/assets/religions/${rephsianReligion.id}.png`,
        clergyTitle: 'Bishop',
        canManage: true,
        bishopId: MOCK_IDS.courtier,
        bishopDebugShortId: mockDebugShortId(MOCK_IDS.courtier),
        bishopName: 'Bishop Caldus',
        authority: 13,
        landReligionShare: isPort ? 0.59 : 0.76,
        landFollowers: isPort ? 83780 : 291840,
        landPopulation: isPort ? 142000 : 384000,
      },
      {
        religion: rivalReligion,
        religionKey: rivalReligion.id,
        religionName: rivalReligion.name,
        religionIconPath: `/assets/religions/${rivalReligion.id}.png`,
        clergyTitle: 'Bishop',
        canManage: false,
        bishopId: '',
        bishopDebugShortId: 0,
        bishopName: '',
        authority: 0,
        landReligionShare: isPort ? 0.26 : 0.15,
        landFollowers: isPort ? 36920 : 57600,
        landPopulation: isPort ? 142000 : 384000,
      },
    ],
    canRename: true,
    canManageGovernor: true,
    governorCouldRebel: false,
    showSetCapital: isPort,
    canSetCapital: isPort,
    capitalMoveCost: isPort ? 1250 : 0,
    capitalMoveBlockedReason: isPort ? '' : 'This is already the capital.',
    canNavigateSettlements: true,
    cultures: [
      {
        info: rephsianCulture,
        percent: isPort ? 64 : 81,
        monthlyChangePercent: isPort ? 0.18 : 0.06,
        pressureSources: [{ name: 'Governor policy', value: 0.11 }, { name: 'Markets', value: 0.07 }],
      },
      {
        info: aurestianCulture,
        percent: isPort ? 24 : 12,
        monthlyChangePercent: isPort ? -0.18 : -0.06,
        pressureSources: [{ name: 'Assimilation', value: -0.18 }],
      },
    ],
    religions: [
      {
        info: rephsianReligion,
        percent: isPort ? 59 : 76,
        monthlyChangePercent: isPort ? 0.21 : 0.04,
        pressureSources: [{ name: 'Clergy', value: 0.15 }, { name: 'Temple schools', value: 0.06 }],
        conversionResistancePercent: 10,
        zealousMinority: false,
        naturallyGrowing: true,
        naturallyDeclining: false,
        persecutionResilience: false,
      },
      {
        info: rivalReligion,
        percent: isPort ? 26 : 15,
        monthlyChangePercent: isPort ? -0.21 : -0.04,
        pressureSources: [{ name: 'State faith', value: -0.21 }],
        conversionResistancePercent: 25,
        zealousMinority: false,
        naturallyGrowing: false,
        naturallyDeclining: true,
        persecutionResilience: isPort,
      },
    ],
    pops: [
      {
        cultureId: rephsianCulture.id,
        culture: rephsianCulture.name,
        cultureAdjective: rephsianCulture.adjective,
        religionId: rephsianReligion.id,
        religion: rephsianReligion.name,
        religionAdherentPlural: rephsianReligion.adherentPlural,
        count: isPort ? 91000 : 310000,
        unrest: isPort ? 10 : 4,
        unrestBreakdown: [{ name: 'Taxes', value: 6 }, { name: 'Governor', value: -4 }],
        monthlyGrowth: isPort ? 420 : 1320,
        growthBreakdown: [{ name: 'Food supply', value: isPort ? 360 : 1180 }, { name: 'Disease', value: isPort ? -80 : 0 }],
        monthlyConversion: 120,
        conversionTargetReligionId: rephsianReligion.id,
        conversionTargetReligion: rephsianReligion.name,
        monthlyAssimilation: 180,
        assimilationTargetCultureId: rephsianCulture.id,
        assimilationTargetCulture: rephsianCulture.name,
      },
      {
        cultureId: aurestianCulture.id,
        culture: aurestianCulture.name,
        cultureAdjective: aurestianCulture.adjective,
        religionId: rivalReligion.id,
        religion: rivalReligion.name,
        religionAdherentPlural: rivalReligion.adherentPlural,
        count: isPort ? 51000 : 74000,
        unrest: isPort ? 18 : 12,
        unrestBreakdown: [{ name: 'Taxes', value: 9 }, { name: 'Local elders', value: -3 }],
        monthlyGrowth: isPort ? 80 : 500,
        growthBreakdown: [{ name: 'Food supply', value: isPort ? 120 : 520 }, { name: 'Crowding', value: -20 }],
        monthlyConversion: 70,
        conversionTargetReligionId: rephsianReligion.id,
        conversionTargetReligion: rephsianReligion.name,
        monthlyAssimilation: 95,
        assimilationTargetCultureId: rephsianCulture.id,
        assimilationTargetCulture: rephsianCulture.name,
      },
    ],
    modifiers: [
      {
        key: 'governor',
        id: 'Tax',
        label: 'Capable Governor',
        description: 'The governor is keeping records and tax rolls in order.',
        iconPath: '/assets/modifiers/Tax.png',
        hasTotal: true,
        total: 8,
        isPercent: true,
        sources: [{ name: 'Governance', value: 8 }, { name: 'Records office', value: 3 }],
      },
      {
        key: 'festival',
        id: 'Tax',
        label: 'Market Festival',
        description: 'Merchants are bringing extra custom dues this month.',
        iconPath: '/assets/modifiers/Tax.png',
        hasTotal: true,
        total: 4,
        isPercent: true,
        sources: [{ name: 'Forum stalls', value: 3 }, { name: 'Port dues', value: 1 }],
      },
    ],
    incomeBreakdown: [{ name: 'Taxes', value: isPort ? 31 : 88 }, { name: 'Markets', value: isPort ? 15 : 34 }],
    unrestBreakdown: [{ name: 'Recent levies', value: 11 }, { name: 'Temples', value: -6 }],
    growthBreakdown: [{ name: 'Food supply', value: isPort ? 720 : 2140 }, { name: 'Urban crowding', value: isPort ? -120 : -320 }],
    foodBreakdown: [{ name: 'Farms', value: isPort ? 320 : 740 }, { name: 'Population', value: isPort ? -610 : -1210 }],
    fortificationBreakdown: [{ name: 'Walls', value: isPort ? 2 : 4 }, { name: 'Watch posts', value: 1 }],
    buildings: [
      { name: 'Forum', level: 3 },
      { name: 'Granary', level: 2 },
      { name: isPort ? 'Docks' : 'Barracks', level: 2 },
    ],
    garrisonedArmies: [
      {
        id: MOCK_IDS.military,
        debugShortId: mockDebugShortId(MOCK_IDS.military),
        name: 'I Field Army',
        commanderName: 'Valen Arcastus',
        commanderTitle: 'Legatus',
        commanderId: MOCK_IDS.character,
        commanderDebugShortId: mockDebugShortId(MOCK_IDS.character),
        strength: 6800,
        maxStrength: 7600,
        morale: 84,
        unitCount: 8,
      },
      {
        id: 'mock-military-detachment',
        debugShortId: mockDebugShortId('mock-military-detachment'),
        name: 'Aurelion Detachment',
        commanderName: 'Cassian Arcastus',
        commanderTitle: 'Legatus',
        commanderId: MOCK_IDS.heir,
        commanderDebugShortId: mockDebugShortId(MOCK_IDS.heir),
        strength: 1600,
        maxStrength: 1800,
        morale: 71,
        unitCount: 3,
      },
    ],
    garrison: [
      {
        name: 'Limitanei',
        description: 'Local infantry trained for walls and roads.',
        unitType: 'infantry',
        portrait: '/assets/units/Rephsian/I_Rephsian_Limitanei.png',
        tier: 2,
        strength: 720,
        maxStrength: 900,
        upkeep: 18,
        foodConsumption: 12,
        pierceDamage: 8,
        crushDamage: 5,
        slashDamage: 9,
        pierceArmour: 6,
        crushArmour: 4,
        slashArmour: 7,
        speed: 4,
        attackSpeed: 0.5,
        culture: rephsianCulture.name,
      },
      {
        name: 'Civic Archers',
        description: 'Militia archers raised from the city districts.',
        unitType: 'ranged',
        portrait: '/assets/units/Rephsian/I_Rephsian_Sagittarii.png',
        tier: 1,
        strength: 420,
        maxStrength: 560,
        upkeep: 9,
        foodConsumption: 7,
        pierceDamage: 11,
        crushDamage: 2,
        slashDamage: 3,
        pierceArmour: 2,
        crushArmour: 1,
        slashArmour: 2,
        speed: 4,
        attackSpeed: 0.5,
        culture: rephsianCulture.name,
      },
    ],
    canViewGarrison: true,
    garrisonHiddenReason: '',
    resourceCategories: [
      {
        id: 'food',
        name: 'Food',
        stockpile: isPort ? 430 : 1200,
        stockpileCap: isPort ? 1200 : 3000,
        production: isPort ? 540 : 980,
        potentialProduction: isPort ? 720 : 980,
        consumption: isPort ? 610 : 1210,
        hasShortage: isPort,
        isCapitalStockpile: !isPort,
      },
      {
        id: 'rawMaterials',
        name: 'Raw Materials',
        stockpile: isPort ? 90 : 260,
        stockpileCap: isPort ? 900 : 1600,
        production: isPort ? 8 : 22,
        potentialProduction: isPort ? 16 : 22,
        consumption: 4,
        hasShortage: false,
        isCapitalStockpile: !isPort,
      },
      {
        id: 'strategic',
        name: 'Strategic',
        stockpile: 0,
        stockpileCap: isPort ? 500 : 1200,
        production: 0,
        potentialProduction: 0,
        consumption: 0,
        hasShortage: false,
        isCapitalStockpile: !isPort,
      },
      {
        id: 'luxury',
        name: 'Luxury',
        stockpile: 0,
        stockpileCap: isPort ? 500 : 1200,
        production: 0,
        potentialProduction: 0,
        consumption: 0,
        hasShortage: false,
        isCapitalStockpile: !isPort,
      },
    ],
    resources: [
      {
        id: 'food',
        name: 'Food',
        category: 'food',
        categoryName: 'Food',
        amount: isPort ? 430 : 1200,
        stockpile: isPort ? 430 : 1200,
        reserved: 0,
        demand: isPort ? 90 : 0,
        production: isPort ? 540 : 980,
        potentialProduction: isPort ? 720 : 980,
        consumption: isPort ? 610 : 1210,
        shortage: isPort ? 70 : 0,
        shortagePercent: isPort ? 11 : 0,
        status: isPort ? 'Minor Shortage' : 'Sufficient',
        depleting: true,
        monthsUntilDepletion: isPort ? 6.1 : 5.2,
        isNatural: true,
        siegeHalted: false,
        productionSources: [{ name: 'Farms', value: isPort ? 420 : 740 }, { name: 'Fishing', value: isPort ? 120 : 240 }],
        consumptionSources: [{ name: 'Population', value: isPort ? 610 : 1210 }, { name: 'Garrison stores', value: isPort ? 42 : 78 }],
        bottlenecks: isPort ? [{ name: 'Granary', details: 'Grain 12.0/24.0' }] : [],
      },
      {
        id: 'stone',
        name: 'Stone',
        category: 'rawMaterials',
        categoryName: 'Raw Materials',
        amount: isPort ? 90 : 260,
        stockpile: isPort ? 90 : 260,
        reserved: isPort ? 12 : 40,
        demand: 0,
        production: isPort ? 8 : 22,
        potentialProduction: isPort ? 16 : 22,
        consumption: 4,
        shortage: 0,
        shortagePercent: 0,
        status: 'Sufficient',
        depleting: false,
        monthsUntilDepletion: 0,
        isNatural: !isPort,
        siegeHalted: false,
        productionSources: [{ name: 'Quarries', value: isPort ? 8 : 22 }, { name: 'Subject carts', value: 8 }],
        consumptionSources: [{ name: 'Works', value: 4 }, { name: 'Repairs', value: 2 }],
        bottlenecks: isPort ? [{ name: 'Stonecutters', details: 'Tools 1.0/2.0' }] : [],
      },
    ],
    siegeStateKind: isSiegeMock ? 'siege' : '',
    alsoBlockaded: isSiegeMock,
    canAssault: isSiegeMock,
    canSallyOut: isSiegeMock,
    canPillage: false,
    canSack: false,
    siegeProgress: isSiegeMock ? 64 : 0,
    estimatedSiegeDays: isSiegeMock ? 16 : 0,
    totalSiegePower: isSiegeMock ? 96 : 0,
    totalDefenderStrength: isSiegeMock ? 8840 : 0,
    pillageGold: 0,
    sackGold: 0,
    siegeProgressPerDay: isSiegeMock ? 2.4 : 0,
    siegeProgressFactors: isSiegeMock ? [
      { name: 'Siege power advantage', value: 58, kind: 'power', helpsProgress: true },
      { name: 'Fortifications', value: 38, kind: 'defence', helpsProgress: false },
      { name: 'Food stores', value: 7.5, kind: 'defence', helpsProgress: false },
      { name: 'Garrisoned armies', value: 14.2, kind: 'defence', helpsProgress: false },
      { name: 'Naval blockade', value: 1.5, kind: 'multiplier', helpsProgress: true },
    ] : [],
    hostileFaction: isSiegeMock ? rival.name : '',
    hostileFactionId: isSiegeMock ? rival.id : '',
    hostileFactionDebugShortId: isSiegeMock ? rival.debugShortId : 0,
    hostileFactionColour: isSiegeMock ? rival.colour : '',
    hostileFactionSecondaryColour: isSiegeMock ? rival.secondaryColour : '',
    hostileFactionEmblem: isSiegeMock ? rival.emblem : '',
    hostileFactionCultureGroup: isSiegeMock ? rival.cultureGroup : '',
    besiegingArmies: isSiegeMock ? [
      {
        kind: 'army',
        name: 'Iron Ladder Host',
        commanderName: 'Soran Velk',
        commanderId: 'mock-person-rival',
        debugShortId: mockDebugShortId('mock-siege-army-1'),
        commanderDebugShortId: mockDebugShortId('mock-person-rival'),
        strength: 3420,
        maxStrength: 4100,
        siegePower: 62,
        morale: 72,
        unitCount: 12,
        isLead: true,
      },
      {
        kind: 'army',
        name: 'Dusk Camp Auxilia',
        commanderName: 'Teren Askor',
        commanderId: 'mock-person-rival-marshal',
        debugShortId: mockDebugShortId('mock-siege-army-2'),
        commanderDebugShortId: mockDebugShortId('mock-person-rival-marshal'),
        strength: 1680,
        maxStrength: 2100,
        siegePower: 34,
        morale: 64,
        unitCount: 7,
        isLead: false,
      },
    ] : [],
    defendingMilitaries: isSiegeMock ? [
      {
        kind: 'army',
        name: 'Aurelion Field Army',
        commanderName: 'Decimus Corvinus',
        commanderId: 'mock-person-player',
        debugShortId: mockDebugShortId('mock-siege-defender-1'),
        commanderDebugShortId: mockDebugShortId('mock-person-player'),
        strength: 4120,
        maxStrength: 5000,
        siegePower: 0,
        morale: 81,
        unitCount: 14,
        isLead: false,
      },
    ] : [],
    canBuild: !isSiegeMock,
    cannotBuildReason: isSiegeMock ? 'Under siege' : '',
    hasCapitalOccupationDeadline: false,
    capitalOccupationDaysRemaining: 0,
  };
}

function settlementBuildings(id: string): BridgeResponse<'game.get_settlement_buildings'> {
  return {
    settlementId: id || MOCK_IDS.settlement,
    snapshotDay: 249409,
    conditionOnly: false,
    buildings: [
      settlementBuilding('Forum', 'Forum', 3, 'administrative'),
      settlementBuilding('Granary', 'Granary', 2, 'economic'),
      settlementBuilding(id === MOCK_IDS.portSettlement ? 'Docks' : 'Barracks', id === MOCK_IDS.portSettlement ? 'Docks' : 'Barracks', 2, id === MOCK_IDS.portSettlement ? 'naval' : 'military'),
    ],
    availableBuildings: [
      {
        ...settlementBuilding('Aqueduct', 'Aqueduct', 0, 'infrastructure'),
        level: undefined,
        price: 720,
        buildTime: 120,
        buildState: { state: 'visible', reason: '' },
      },
      {
        ...settlementBuilding('GreatStoneWall', 'Great Stone Wall', 0, 'defensive'),
        level: undefined,
        price: 1120,
        buildTime: 180,
        buildState: { state: 'greyed', reason: 'Requires Stone stockpile of 400.' },
      },
    ].map(entry => ({
      id: entry.id,
      assetKey: entry.assetKey,
      name: entry.name,
      maxLevel: entry.maxLevel,
      category: entry.category,
      chainName: entry.chainName,
      description: entry.description,
      effectsHtml: entry.effectsHtml,
      price: entry.price,
      buildTime: entry.buildTime,
      upkeep: entry.upkeep,
      resourceCost: entry.resourceCost,
      developedFrom: entry.developedFrom,
      canBeDevelopedInto: entry.canBeDevelopedInto,
      requiredBuildings: entry.requiredBuildings,
      buildState: entry.buildState,
    })),
    hasPort: id === MOCK_IDS.portSettlement,
    construction: {
      queue: [
        {
          id: 'mock-queue-aqueduct',
          queueIndex: 0,
          assetKey: 'Aqueduct',
          name: 'Aqueduct',
          kind: 'new',
          toLevel: 1,
          goldCost: 720,
          resourceCost: [{ name: 'Stone', displayName: 'Stone', amount: 80 }, { name: 'Wood', displayName: 'Wood', amount: 30 }],
          durationDays: 120,
          remainingDays: 63,
          state: 'building',
          statusLabel: 'Building',
          statusReason: '',
          missingResources: [],
        },
        {
          id: 'mock-queue-forum-upgrade',
          queueIndex: 1,
          assetKey: 'Forum',
          name: 'Forum',
          kind: 'upgrade',
          toLevel: 4,
          goldCost: 540,
          resourceCost: [{ name: 'Stone', displayName: 'Stone', amount: 45 }, { name: 'Tools', displayName: 'Tools', amount: 15 }],
          durationDays: 90,
          remainingDays: 90,
          state: 'queued',
          statusLabel: 'Queued',
          statusReason: 'Waiting for the aqueduct crew.',
          missingResources: [{ name: 'Tools', displayName: 'Tools', amount: 8 }, { name: 'Stone', displayName: 'Stone', amount: 12 }],
        },
      ],
      constructionBlocked: false,
      constructionBlockerName: '',
    },
    canBuild: true,
    cannotBuildReason: '',
  };
}

function militaryData(id: string): BridgeResponse<'game.get_military_data'> {
  const isDetachment = id === 'mock-military-detachment';
  const isScouts = id === 'mock-military-scouts';
  const isRiverwatch = id === 'mock-navy-riverwatch';
  const isNavy = id === MOCK_IDS.navy || isRiverwatch;
  const isEmbarked = id === MOCK_IDS.military || isDetachment;
  const profile = isRiverwatch
    ? {
      id: 'mock-navy-riverwatch',
      name: 'Riverwatch Flotilla',
      commanderName: 'Severus Laco',
      commanderId: 'mock-person-tribune',
      commanderTitle: 'Naval Legatus',
      strength: 900,
      maxStrength: 1100,
      morale: 69,
      commandRank: 'Legatus',
      currentOrder: 'Watching the ford crossings',
      formationTemplate: 'River Patrol',
      garrisonedAt: 'Tavarii Ford',
      parentCommand: 'Classis Meridian',
      parentCommandId: MOCK_IDS.navy,
      supplyDays: 61,
    }
    : isDetachment
      ? {
        id: 'mock-military-detachment',
        name: 'Aurelion Detachment',
        commanderName: 'Cassian Arcastus',
        commanderId: MOCK_IDS.heir,
        commanderTitle: 'Legatus',
        strength: 1600,
        maxStrength: 1800,
        morale: 71,
        commandRank: 'Legatus',
        currentOrder: 'Holding the capital approaches',
        formationTemplate: 'Balanced Field Army',
        garrisonedAt: 'Aurelion',
        parentCommand: 'I Field Army',
        parentCommandId: MOCK_IDS.military,
        supplyDays: 43,
      }
      : isScouts
        ? {
          id: 'mock-military-scouts',
          name: 'Western Scouts',
          commanderName: 'Marcia Vennor',
          commanderId: MOCK_IDS.governor,
          commanderTitle: 'Legatus',
          strength: 420,
          maxStrength: 520,
          morale: 68,
          commandRank: 'Legatus',
          currentOrder: 'Screening the western road',
          formationTemplate: 'Light Border Screen',
          garrisonedAt: 'Berginian March',
          parentCommand: 'I Field Army',
          parentCommandId: MOCK_IDS.military,
          supplyDays: 32,
        }
        : {
          id: isNavy ? MOCK_IDS.navy : MOCK_IDS.military,
          name: isNavy ? 'Classis Meridian' : 'I Field Army',
          commanderName: isNavy ? 'Marcia Vennor' : 'Valen Arcastus',
          commanderId: isNavy ? MOCK_IDS.governor : MOCK_IDS.character,
          commanderTitle: isNavy ? 'Admiral' : 'Dominus',
          strength: isNavy ? 1800 : 6800,
          maxStrength: isNavy ? 2200 : 7600,
          morale: isNavy ? 76 : 84,
          commandRank: isNavy ? 'Praefectus' : 'Dux',
          currentOrder: isNavy ? 'Patrolling the coast' : 'Guarding the capital road',
          formationTemplate: isNavy ? 'Coastal Patrol' : 'Balanced Field Army',
          garrisonedAt: isNavy ? 'Namaris' : 'Aurelion',
          parentCommand: '',
          parentCommandId: '',
          supplyDays: isNavy ? 88 : 54,
        };
  const baseUnits = [
    {
      name: isNavy ? 'Dromons' : 'Limitanei',
      type: isNavy ? 'navy' : 'infantry',
      count: isNavy ? 18 : 6,
      strength: isNavy ? 1200 : 3600,
      maxStrength: isNavy ? 1500 : 4200,
      culture: rephsianCulture.name,
      cultureId: rephsianCulture.id,
      description: isNavy ? 'Fast coastal warships.' : 'Reliable line infantry.',
      portrait: isNavy ? '/assets/events/naval-battle.png' : '/assets/units/Rephsian/I_Rephsian_Limitanei.png',
      tier: 2,
      upkeep: isNavy ? 90 : 84,
      foodConsumption: isNavy ? 24 : 54,
      speed: isNavy ? 8 : 4,
      attackSpeed: 0.5,
      siegePower: isNavy ? 0 : 4,
      pierceDamage: 8,
      crushDamage: 5,
      slashDamage: 9,
      pierceArmour: 6,
      crushArmour: 4,
      slashArmour: 7,
      immuneToWinterAttrition: false,
      immuneToDesertAttrition: false,
      canAttackWhileMoving: false,
    },
    {
      name: isNavy ? 'Supply Galleys' : 'Clibanarii',
      type: isNavy ? 'navy' : 'cavalry',
      count: isNavy ? 8 : 3,
      strength: isNavy ? 600 : 1700,
      maxStrength: isNavy ? 700 : 1900,
      culture: rephsianCulture.name,
      cultureId: rephsianCulture.id,
      description: isNavy ? 'Storeships assigned to the coastal squadron.' : 'Armoured cavalry held for decisive counter-attacks.',
      portrait: isNavy ? '/assets/events/naval-battle.png' : '/assets/units/Rephsian/I_Equites_Clibanarii.png',
      tier: 3,
      upkeep: isNavy ? 34 : 62,
      foodConsumption: isNavy ? 10 : 28,
      speed: isNavy ? 6 : 7,
      attackSpeed: 0.6,
      siegePower: 0,
      pierceDamage: 7,
      crushDamage: 10,
      slashDamage: 8,
      pierceArmour: 8,
      crushArmour: 6,
      slashArmour: 8,
      immuneToWinterAttrition: false,
      immuneToDesertAttrition: false,
      canAttackWhileMoving: false,
    },
  ];
  const units = baseUnits.map((unit, index) => ({
    id: `${profile.id}:unit:${index}`,
    unitId: `${unit.name.replace(/\s+/g, '')}_C`,
    rowType: 'existing',
    existingCount: 1,
    pendingCount: 0,
    targetCount: index === 0 ? 7 : 4,
    progress: 0,
    statusLabel: '',
    selectable: true,
    sources: [],
    ...unit,
  }));
  const unitRows = [
    ...units,
    {
      ...units[0],
      id: `${profile.id}:unit:${units[0].unitId}:beingBuilt`,
      rowType: 'beingBuilt',
      count: 1,
      existingCount: 0,
      pendingCount: 1,
      strength: units[0].maxStrength,
      maxStrength: units[0].maxStrength,
      progress: 0.46,
      statusLabel: '46% built',
      selectable: false,
      sources: [{
        id: isNavy ? MOCK_IDS.portSettlement : MOCK_IDS.settlement,
        name: profile.garrisonedAt,
        count: 1,
        daysRemaining: 0,
        startsOnDate: 0,
        expiresOnDate: 0,
        progressAtSnapshot: 0,
        dailyProgress: 0,
        snapshotDate: 0,
      }],
    },
    {
      ...units[1],
      id: `${profile.id}:unit:${units[1].unitId}:inTransit`,
      rowType: 'inTransit',
      count: 1,
      existingCount: 0,
      pendingCount: 1,
      strength: units[1].maxStrength,
      maxStrength: units[1].maxStrength,
      progress: 0.72,
      statusLabel: '72% arrived',
      selectable: false,
      sources: [{
        id: isNavy ? MOCK_IDS.portSettlement : MOCK_IDS.settlement,
        name: isNavy ? 'Namaris' : 'Aurelion',
        count: 1,
        daysRemaining: 5,
        startsOnDate: 249391,
        expiresOnDate: 249409,
        progressAtSnapshot: 0.72,
        dailyProgress: 1 / 18,
        snapshotDate: 249404,
      }],
    },
  ];
  return {
    found: true,
    id: profile.id,
    updateKind: '',
    debugShortId: mockDebugShortId(profile.id),
    name: profile.name,
    faction: 'Rephsian Empire',
    factionId: MOCK_IDS.playerFaction,
    factionDebugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
    commanderName: profile.commanderName,
    commanderId: profile.commanderId,
    commanderDebugShortId: mockDebugShortId(profile.commanderId),
    commanderTitle: profile.commanderTitle,
    strength: profile.strength,
    maxStrength: profile.maxStrength,
    morale: profile.morale,
    units,
    unitRows,
    battleGroups: [
      {
        id: 'battle_group_0',
        role: 'melee',
        name: isNavy ? 'Battle Squadron' : 'Balanced Cohort',
        unitIds: units.map(unit => unit.id),
      },
    ],
    commandRank: profile.commandRank,
    isNavy,
    isPersonalGuard: false,
    currentOrder: isEmbarked ? 'Embarked in Classis Meridian' : profile.currentOrder,
    formationTemplate: profile.formationTemplate,
    garrisonedAt: isEmbarked ? '' : profile.garrisonedAt,
    embarkedNavyId: isEmbarked ? MOCK_IDS.navy : '',
    embarkedNavyName: isEmbarked ? 'Classis Meridian' : '',
    commandDoctrine: 'concentrate',
    delegated: false,
    autoSquashRebels: true,
    subordinates: isNavy || profile.parentCommandId ? [] : [
      { id: 'mock-military-detachment', debugShortId: mockDebugShortId('mock-military-detachment'), depth: 0, name: 'Aurelion Detachment', commanderName: 'Cassian Arcastus', commanderId: MOCK_IDS.heir, commanderDebugShortId: mockDebugShortId(MOCK_IDS.heir), strength: 1600, maxStrength: 1800, unitTypes: [{ type: 'Infantry', count: 7 }, { type: 'Cavalry', count: 2 }], withinCommandRange: true, distanceToSuperior: 42, superiorCommandRadius: 100, hierarchyTacticsBonus: 0.08, hierarchyMoraleBonus: 0.06, hierarchySpeedBonus: 0.04 },
      { id: 'mock-military-scouts', debugShortId: mockDebugShortId('mock-military-scouts'), depth: 1, name: 'Western Scouts', commanderName: 'Marcia Vennor', commanderId: MOCK_IDS.governor, commanderDebugShortId: mockDebugShortId(MOCK_IDS.governor), strength: 420, maxStrength: 520, unitTypes: [{ type: 'Ranged', count: 2 }, { type: 'Cavalry', count: 1 }], withinCommandRange: false, distanceToSuperior: 126, superiorCommandRadius: 80, hierarchyTacticsBonus: 0, hierarchyMoraleBonus: 0, hierarchySpeedBonus: 0 },
    ],
    commandSubordinateCount: isNavy || profile.parentCommandId ? 0 : 2,
    commandSubordinateCapacity: isNavy ? 0 : 4,
    commandMaintenance: isNavy ? 0 : 36,
    commandBuffRadius: isNavy ? 0 : 100,
    hierarchyTacticsBonus: profile.parentCommandId ? 0.08 : 0,
    hierarchyMoraleBonus: profile.parentCommandId ? 0.06 : 0,
    hierarchySpeedBonus: profile.parentCommandId ? 0.04 : 0,
    parentCommand: profile.parentCommand,
    parentCommandId: profile.parentCommandId,
    parentCommandDebugShortId: profile.parentCommandId ? mockDebugShortId(profile.parentCommandId) : 0,
    capacity: isNavy && !isRiverwatch ? 3000 : 0,
    usedCapacity: isNavy && !isRiverwatch ? 1200 : 0,
    embarkedArmies: isNavy && !isRiverwatch ? [
      { id: MOCK_IDS.military, debugShortId: mockDebugShortId(MOCK_IDS.military), name: 'I Field Army', strength: 1200 },
      { id: 'mock-military-detachment', debugShortId: mockDebugShortId('mock-military-detachment'), name: 'Aurelion Detachment', strength: 520 },
    ] : [],
    resources: isNavy ? [
      { id: 'food', name: 'Food', amount: isRiverwatch ? 72 : 214, capacity: isRiverwatch ? 96 : 260, monthlyUsage: isRiverwatch ? 36 : 73, daysRemaining: profile.supplyDays },
      { id: 'pitch', name: 'Pitch', amount: isRiverwatch ? 16 : 48, capacity: isRiverwatch ? 24 : 64, monthlyUsage: isRiverwatch ? 3 : 8, daysRemaining: isRiverwatch ? 160 : 180 },
      { id: 'sails', name: 'Sails', amount: isRiverwatch ? 8 : 24, capacity: isRiverwatch ? 12 : 32, monthlyUsage: isRiverwatch ? 1 : 2, daysRemaining: isRiverwatch ? 240 : 360 },
    ] : [
      { id: 'food', name: 'Food', amount: isScouts ? 34 : isDetachment ? 118 : 148, capacity: isScouts ? 48 : isDetachment ? 150 : 180, monthlyUsage: isScouts ? 32 : isDetachment ? 82 : 82, daysRemaining: profile.supplyDays },
      { id: 'weapons', name: 'Weapons', amount: isScouts ? 9 : isDetachment ? 22 : 46, capacity: isScouts ? 12 : isDetachment ? 32 : 60, monthlyUsage: isScouts ? 1.2 : isDetachment ? 3.4 : 5.5, daysRemaining: isScouts ? 225 : isDetachment ? 194 : 251 },
      { id: 'horses', name: 'Horses', amount: isScouts ? 18 : isDetachment ? 36 : 64, capacity: isScouts ? 24 : isDetachment ? 48 : 80, monthlyUsage: isScouts ? 1.5 : isDetachment ? 2.5 : 3, daysRemaining: isScouts ? 360 : isDetachment ? 432 : 640 },
    ],
    attritionSources: [],
    supplyDays: profile.supplyDays,
    isForcedMarching: false,
    canForcedMarch: !isNavy,
    canMerge: !isEmbarked,
    canSplit: !isEmbarked && units.length > 1,
    isRaiding: false,
    isReplenishing: false,
    replenishCost: isNavy ? 640 : isDetachment ? 320 : isScouts ? 180 : 820,
    canReplenish: true,
    isFoederatiAuxiliary: false,
    foederatiOriginFactionId: '',
    isPlayerControlled: true,
  };
}

function militaryCommanderCandidates(militaryId: string): BridgeResponse<'game.get_military_commander_candidates'> {
  const candidateIds = [MOCK_IDS.character, 'mock-person-brother', 'mock-person-tribune', MOCK_IDS.heir, MOCK_IDS.governor];
  const military = militaryData(militaryId);

  return {
    found: true,
    militaryId,
    militaryName: military.name,
    currentCommanderId: MOCK_IDS.character,
    message: '',
    candidates: candidateIds.map((id) => {
      const person = personById(id);
      return {
        id: person.id,
        name: person.name,
        title: person.title,
        portrait: person.portrait,
        portraitLayers: person.portraitLayers,
        age: person.age,
        tactics: person.stats.tactics,
        authority: person.stats.authority,
        cunning: person.stats.cunning,
        governance: person.stats.governance,
        loyalty: person.stats.loyalty,
        constitution: person.stats.constitution,
        fame: person.fame,
        isCurrentCommander: person.id === MOCK_IDS.character,
        currentCommandName: person.id === MOCK_IDS.character ? military.name : person.id === 'mock-person-brother' ? 'Western Detachments' : '',
        traits: person.traits.map(trait => ({
          id: trait.id,
          name: trait.name,
          description: trait.description,
          isPositive: trait.isPositive,
        })),
      };
    }),
  };
}

const pinnedItems: BridgeResponse<'game.get_pinned_items'>['items'] = [
  { itemType: 'settlement', itemId: MOCK_IDS.settlement, name: 'Aurelion', detail: 'Capital' },
  { itemType: 'character', itemId: MOCK_IDS.character, name: 'Valen Arcastus', detail: 'Dominus' },
  { itemType: 'military', itemId: MOCK_IDS.military, name: 'I Field Army', detail: '6,800 strength' },
  { itemType: 'faction', itemId: MOCK_IDS.rivalFaction, name: 'Aurestian League', detail: 'At war' },
];

const mockHintSeeds: Record<string, MockHintSeed> = {
  SettlementHint: {
    hintKey: 'SettlementHint',
    title: 'Settlements',
    paragraphs: [
      'Select a settlement to check its owner, governor, food, unrest, population, walls, and tax income before deciding what needs attention.',
      'Use the General, Buildings, Military, and Garrison tabs to inspect local society, construction, stationed forces, and the stationary defensive force.',
    ],
  },
  CharactersHint: {
    hintKey: 'CharactersHint',
    title: 'Characters',
    paragraphs: [
      'Use Characters to find people in your faction and related courts. Search, sort, or switch categories to find rulers, courtiers, prisoners, governors, agents, and commanders.',
      'Rows show status, location, role, fame, compliance, and stats. Open a row when you need the full character sidebar.',
    ],
  },
  DiplomacyHint: {
    hintKey: 'DiplomacyHint',
    title: 'Faction Sidebar',
    paragraphs: [
      'Open a faction to compare diplomatic status, opinion, relative strength, ruler details, court characters, treaties, active wars, actions, and espionage.',
      'Assign diplomats or spies from the agent selector, then read action cards and tooltips before committing gold, time, or risk.',
    ],
  },
  MilitaryHint: {
    hintKey: 'MilitaryHint',
    title: 'Military Sidebar',
    paragraphs: [
      'Select a force to check its commander, readiness, resources, current orders, field actions, and formation details.',
      'Use Overview, Command, and Units to switch between force state, command hierarchy, and composition.',
    ],
  },
  PowerBlocDetailHint: {
    hintKey: 'PowerBlocDetailHint',
    title: 'Power Bloc Details',
    paragraphs: [
      'Open a power bloc to check its leader, happiness, strength, goals, available actions, members, and active demand.',
      'Resolve demands before the bloc moves towards rebellion.',
    ],
  },
  PeaceHint: {
    hintKey: 'PeaceHint',
    title: 'Peace Negotiation',
    paragraphs: [
      'Use peace negotiations to compare both sides, war score, acceptance, draft terms, available demands, and any counter-offers.',
      'Add terms until the offer is acceptable, then check costs and consequences before sending it.',
    ],
  },
  EconomyHint: {
    hintKey: 'EconomyHint',
    title: 'Economy',
    paragraphs: [
      'Use Economy to move between overview totals, resources, food, settlements, military, provinces, and the full income breakdown.',
      'Use Overview for the biggest gains and losses, Resources and Food for shortages, and Breakdown for income, upkeep, subject contributions, and tax losses.',
    ],
  },
  FactionHint: {
    hintKey: 'FactionHint',
    title: 'Faction Overview',
    paragraphs: [
      'Use Faction Overview to manage policies and edicts, check succession, review key characters, and judge your diplomatic position.',
      'Use it to inspect policies, edicts, succession, court positions, subjects, and the ruler history.',
    ],
  },
  ReligionHint: {
    hintKey: 'ReligionHint',
    title: 'Religion',
    paragraphs: [
      'Use Religion to compare organised faiths, population share, leading factions, and clergy assignments by land.',
      'Use it to appoint clergy where your faith has influence and compare which religions are growing across the realm.',
    ],
  },
  InternalAffairsHint: {
    hintKey: 'InternalAffairsHint',
    title: 'Internal Politics',
    paragraphs: [
      'Use Internal Politics to judge dependent factions, foederati, province candidates, regional governors, and important commanders.',
      'Use it to judge which internal rulers have poor compliance, who leads their forces, and which provinces need direct attention.',
    ],
  },
  FamilyTreeHint: {
    hintKey: 'FamilyTreeHint',
    title: 'Family Tree',
    paragraphs: [
      'Use the family tree to trace the ruling family across generations. Lines mark parentage and spouses, while portraits open characters.',
      'Use it to read succession risks, marriages, heirs, dead relatives, and useful branches of the dynasty.',
    ],
  },
  EncyclopediaHint: {
    hintKey: 'EncyclopediaHint',
    title: 'Encyclopaedia',
    paragraphs: [
      'Use the encyclopaedia to compare articles, buildings, and units before committing gold, resources, or troops.',
      'Use search, categories, culture tabs, and reference cards to compare requirements, effects, costs, and combat roles.',
    ],
  },
  EventsHint: {
    hintKey: 'EventsHint',
    title: 'Events',
    paragraphs: [
      'Events appear as modal decisions over the game. The image and body describe the situation, and linked names can open related game objects.',
      'Each option is a commitment. Check option text, locks, tooltips, and effect lists before choosing.',
    ],
  },
  BattleHint: {
    hintKey: 'BattleHint',
    title: 'Battle',
    paragraphs: [
      'When a battle opens, check the terrain, losses, command options, and each formation on both sides before committing reserves or pressing an attack.',
      'Formation cards show strength, manpower, losses, morale, stance, orders, and target. Eligible formations expose tactical actions.',
    ],
  },
  PowerBlocsHint: {
    hintKey: 'PowerBlocsHint',
    title: 'Power Blocs',
    paragraphs: [
      'Use Power Blocs to track the organised political groups inside your realm.',
      'Use Overview for happiness, strength, escalation, leader, goals, and demands, or Active Demands to focus on blocs pressing for concessions.',
    ],
  },
  LedgerHint: {
    hintKey: 'LedgerHint',
    title: 'Ledger',
    paragraphs: [
      'The Ledger is a sortable record of settlements, forces, factions, resources, and buildings.',
      'Use search and column sorting to find high income, weak garrisons, unrest, and missing resources.',
    ],
  },
  MilitaryOverviewHint: {
    hintKey: 'MilitaryOverviewHint',
    title: 'Military',
    paragraphs: [
      'Use Military to read land forces and fleets as a hierarchy.',
      'Use the Land, Sea, and Foederati tabs to inspect commands, compare strength and upkeep, and mobilise allied call-ups when available.',
    ],
  },
};

const mockHints: Record<string, BridgeResponse<'game.hint_events'>> = {};

Object.keys(mockHintSeeds).forEach(key => {
  mockHints[key] = mockHintResponse(mockHintSeeds[key]);
});

function mockHintForKey(hintKey: string): BridgeResponse<'game.hint_events'> {
  return mockHints[hintKey] ?? mockHintResponse({
    hintKey,
    title: 'Hint',
    paragraphs: [
      'No mock hint content is registered for this key.',
      'The fallback still uses multiple paragraphs so advisor pagination and spacing stay exercised.',
    ],
  });
}

function mapModes(activeMode: string): BridgeResponse<'game.get_map_modes'> {
  return {
    activeMode,
    modes: [
      { id: 'landscape', label: 'Terrain', description: 'Raw terrain.', tooltip: '<header>Terrain</><bullet>Shows raw terrain.</>', shortcut: '' },
      { id: 'overlord', label: 'Overlords', description: 'Overlord control.', tooltip: '<header>Overlords</><bullet>Shows overlord influence.</>', shortcut: '' },
      { id: 'political', label: 'Political', description: 'Faction ownership.', tooltip: '<header>Political</><bullet>Shows faction borders.</>', shortcut: '1' },
      { id: 'religion', label: 'Religion', description: 'Religious makeup.', tooltip: '<header>Religion</><bullet>Shows religious majorities.</>', shortcut: '' },
      { id: 'culture', label: 'Culture', description: 'Dominant culture.', tooltip: '<header>Culture</><bullet>Shows cultural majorities.</>', shortcut: '2' },
      { id: 'resources', label: 'Resources', description: 'Resource output.', tooltip: '<header>Resources</><bullet>Shows resource production.</>', shortcut: '' },
      { id: 'militaries', label: 'Military Recruitment', description: 'Recruitment activity.', tooltip: '<header>Military Recruitment</><bullet>Shows recruitment activity.</>', shortcut: '' },
      { id: 'unrest', label: 'Unrest', description: 'Local instability.', tooltip: '<header>Unrest</><bullet>Highlights risky settlements.</>', shortcut: '4' },
      { id: 'loyalty', label: 'Compliance', description: 'Ruler compliance.', tooltip: '<header>Compliance</><bullet>Shows compliance.</>', shortcut: '' },
      { id: 'economicProsperity', label: 'Economy & Construction', description: 'Income and building queues.', tooltip: '<header>Economy & Construction</><bullet>Shows income and construction.</>', shortcut: '3' },
      { id: 'adminRegion', label: 'Administrative Regions', description: 'Administrative regions.', tooltip: '<header>Administrative Regions</><bullet>Shows regions.</>', shortcut: '' },
      { id: 'adminLand', label: 'Administrative Lands', description: 'Administrative lands.', tooltip: '<header>Administrative Lands</><bullet>Shows lands.</>', shortcut: '' },
      { id: 'adminDomain', label: 'Administrative Domains', description: 'Administrative domains.', tooltip: '<header>Administrative Domains</><bullet>Shows domains.</>', shortcut: '' },
      { id: 'disease', label: 'Disease Outbreaks', description: 'Disease severity.', tooltip: '<header>Disease Outbreaks</><bullet>Shows outbreaks.</>', shortcut: '' },
      { id: 'population', label: 'Population', description: 'Population size.', tooltip: '<header>Population</><bullet>Shows population.</>', shortcut: '' },
      { id: 'regionGovernor', label: 'Region Governors', description: 'Governor assignments.', tooltip: '<header>Region Governors</><bullet>Shows governor assignments.</>', shortcut: '' },
      { id: 'trade', label: 'Trade', description: 'Trade income.', tooltip: '<header>Trade</><bullet>Shows trade income.</>', shortcut: '' },
      { id: 'corruption', label: 'Corruption', description: 'Corruption risk.', tooltip: '<header>Corruption</><bullet>Shows corruption risk.</>', shortcut: '' },
      { id: 'stockpiles', label: 'Stockpiles', description: 'Stored resources.', tooltip: '<header>Stockpiles</><bullet>Shows stored resources.</>', shortcut: '' },
      { id: 'garrisons', label: 'Garrisons', description: 'Garrison strength.', tooltip: '<header>Garrisons</><bullet>Shows garrison strength.</>', shortcut: '' },
      { id: 'bishopric', label: 'Bishoprics', description: 'Bishop assignments.', tooltip: '<header>Bishoprics</><bullet>Shows bishop assignments.</>', shortcut: '' },
      { id: 'diplomaticRelation', label: 'Diplomatic Status', description: 'Diplomatic relationships.', tooltip: '<header>Diplomatic Status</><bullet>Shows diplomatic relationships.</>', shortcut: '' },
    ],
  };
}

function mockMapModeLabel(modeId: string): string {
  const modes = mapModes(modeId).modes;
  for (const mode of modes) {
    if (mode.id === modeId) {
      return mode.label;
    }
  }
  return modeId;
}

function currentEvent(visible: boolean, kind: MockEventKind): BridgeResponse<'game.get_current_event'> {
  const recall = kind === 'recall';
  const important = kind === 'important';
  const id = important ? 'mock-event-crisis-major' : recall ? 'mock-event-recall-ordered' : 'mock-event-court-pressure';
  const title = important ? 'The Crisis Breaks' : recall ? 'Recall Ordered' : 'A Court Divided';
  const body = important
    ? `Messengers arrive from every road into Aurelion. The granaries are empty, the river barges have stopped, and the crowds outside the governor's palace have begun chanting for bread.\n\nThis is no longer a local shortage. It is the first open fracture in the empire's food system. If the capital cannot feed the frontier, every province will start counting its own stores and watching its neighbours.`
    : recall
      ? 'The imperial courier reads the order before your assembled household. You are to surrender Aurelion and return to the capital for judgement. Officers travelling under the imperial seal wait at the gate to take charge.'
      : `A faction of courtiers asks you to remove <link type="character" id="${MOCK_IDS.governor}">Marcia Vennor</> from Aurelion before her reforms weaken their patronage.`;
  const imageId = important ? 'famine-relief' : recall ? 'imperial-summons' : 'court-intrigue';
  return {
    hasEvent: visible,
    id: visible ? id : '',
    title: visible ? title : '',
    body: visible ? body : '',
    imageId: visible ? imageId : '',
    presentationStyle: important || recall ? 'important' : 'standard',
    chosenOptionIndex: -1,
    regnalNameInput: {
      isRequired: false,
      label: '',
      value: '',
      randomButtonText: '',
      randomOptions: [],
      targetPersonId: '',
      targetFactionId: '',
      previousNameCounts: [],
    },
    personNameInput: {
      isRequired: false,
      label: '',
      value: '',
      randomButtonText: '',
      randomOptions: [],
      targetPersonId: '',
      targetFactionId: '',
    },
    previousEvents: visible && important
      ? [
        {
          id: 'mock-event-grain-warning',
          title: 'The Empty Granaries',
          body: 'The provincial granaries stand barred while hungry families gather in the market square. The governor asks whether imperial stores should be opened before the shortage spreads.',
          imageId: 'granary-shortage',
          presentationStyle: 'standard',
          chosenOptionText: 'Open the provincial stores before the roads close.',
        },
      ]
      : [],
    options: visible
      ? important
        ? [
          {
            text: 'Open the imperial reserves',
            tooltip: 'Spend deep from the treasury to keep the frontier alive.',
            objective: 'Buy time before order collapses',
            isLocked: false,
            effects: [
              { kind: 'money', parameter: MOCK_IDS.playerFaction, amount: -3000, description: 'Emergency grain purchases empty the treasury.', icon: '' },
              { kind: 'unrest', parameter: MOCK_IDS.settlement, amount: -20, description: 'Aurelion calms for now.', icon: '' },
            ],
          },
          {
            text: 'Seize grain from the estates',
            tooltip: 'Feed the cities by force and accept the political cost.',
            objective: 'Break private hoarding',
            isLocked: false,
            effects: [
              { kind: 'unrest', parameter: MOCK_IDS.settlement, amount: -10, description: 'The hungry are fed.', icon: '' },
              { kind: 'opinion', parameter: 'court', amount: -25, description: 'The great families turn hostile.', icon: '' },
            ],
          },
        ]
        : recall
        ? [
          {
            text: 'Submit to recall',
            tooltip: 'Return to the capital and surrender the province.',
            objective: 'Submit to imperial judgement',
            isLocked: false,
            effects: [
              { kind: 'stability', parameter: MOCK_IDS.playerFaction, amount: -100, description: 'The province is handed over.', icon: '' },
            ],
          },
          {
            text: 'Refuse and rebel',
            tooltip: 'Break from imperial rule and keep Aurelion by force.',
            objective: 'Hold the province',
            isLocked: false,
            effects: [
              { kind: 'war', parameter: MOCK_IDS.playerFaction, amount: 1, description: 'A rebellion begins.', icon: '' },
            ],
          },
        ]
        : [
          {
            text: 'Back the governor',
            tooltip: 'The court loses influence, but Aurelion keeps its reforms.',
            objective: 'Protect the reform programme',
            isLocked: false,
            effects: [
              { kind: 'opinion', parameter: 'court', amount: -10, description: 'Court bloc happiness falls.', icon: '' },
              { kind: 'stability', parameter: MOCK_IDS.settlement, amount: 4, description: 'Aurelion reform progress holds.', icon: '' },
            ],
          },
          {
            text: 'Appease the courtiers',
            tooltip: 'Aurelion slows its reforms to calm the palace.',
            objective: 'Preserve court support',
            isLocked: false,
            effects: [
              { kind: 'unrest', parameter: MOCK_IDS.settlement, amount: 5, description: 'Local unrest rises.', icon: '' },
              { kind: 'gold', parameter: MOCK_IDS.playerFaction, amount: -90, description: 'Patronage payments leave the treasury.', icon: '' },
            ],
          },
        ]
      : [],
  };
}

function currentTutorialProgress(): BridgeResponse<'game.get_tutorial_progress'> {
  return {
    isVisible: true,
    hasLiveObjectives: true,
    steps: [
      {
        text: 'Build a Training Camp in Aurelion',
        isComplete: true,
      },
      {
        text: 'Create a formation in the Military screen',
        isComplete: false,
      },
      {
        text: `Raise an army and wait for it to finish mustering`,
        isComplete: false,
      },
    ],
  };
}

function characterListEntry(
  id: string,
  factionId: string = MOCK_IDS.playerFaction,
  factionName: string = 'Rephsian Empire',
  heirId: string = MOCK_IDS.heir,
) {
  const person = personById(id);
  const isPlayerFaction = factionId === MOCK_IDS.playerFaction;
  const category = person.isImprisoned
    ? 'prisoners'
    : person.id === MOCK_IDS.governor || person.activity === 'LeadingSettlement'
    ? 'governance'
    : person.activity === 'CommandingArmy'
      ? 'command'
      : person.activity === 'Diplomat' || person.activity === 'Spy'
        ? 'agents'
        : isPlayerFaction && (person.isPlayerCharacter || person.id === heirId || person.relationToPlayer)
        ? 'family'
        : 'court';
  const status = person.isImprisoned
    ? 'Imprisoned'
    : person.isPlayerCharacter
    ? 'Ruler'
    : person.id === MOCK_IDS.governor
      ? 'Governor'
      : person.id === MOCK_IDS.heir
        ? 'InCourt'
        : person.activity;
  return {
    id: person.id,
    name: person.name,
    portrait: person.portrait,
    portraitLayers: person.portraitLayers,
    title: person.title,
    shortTitle: person.shortTitle,
    age: person.age,
    isAlive: person.isAlive,
    isImprisoned: person.isImprisoned,
    status,
    factionId,
    factionName,
    cultureId: person.cultureId,
    culture: person.culture,
    religionId: person.religionId,
    religion: person.religion,
    activity: person.activity,
    activitySegments: person.activitySegments,
    role: person.shortTitle,
    roleDetail: person.title,
    category,
    isPlayerCharacter: person.isPlayerCharacter,
    isHeir: person.id === heirId,
    canLeadProvince: person.isAlive
      && !person.isImprisoned
      && person.age >= 16
      && !person.isPlayerCharacter
      && person.portrait !== FEMALE_PORTRAIT_1
      && person.id !== MOCK_IDS.courtier,
    hasCompliance: person.isSubordinateOfPlayer,
    complianceTowardPlayer: person.complianceTowardPlayer,
    fame: person.fame,
    stats: {
      tactics: person.stats.tactics,
      authority: person.stats.authority,
      cunning: person.stats.cunning,
      governance: person.stats.governance,
      loyalty: person.stats.loyalty,
      constitution: person.stats.constitution,
    },
    traitIds: person.traits.map(trait => trait.id),
  };
}

function characterListTraits(personIds: string[]): BridgeResponse<'game.get_character_list'>['traits'] {
  const traits = new Map<string, { id: string; name: string }>();
  personIds.forEach(id => {
    personById(id).traits.forEach(trait => {
      if (!traits.has(trait.id)) {
        traits.set(trait.id, { id: trait.id, name: trait.name });
      }
    });
  });
  return Array.from(traits.values());
}

const MOCK_FAMILY_PERSON_IDS = [
  'mock-person-previous-ruler',
  MOCK_IDS.character,
  'mock-person-spouse',
  'mock-person-brother',
  MOCK_IDS.governor,
  MOCK_IDS.heir,
  'mock-person-daughter',
  'mock-person-grandchild',
];

const MOCK_CHARACTER_LIST_PERSON_IDS = [
  ...MOCK_FAMILY_PERSON_IDS,
  'mock-person-tribune',
  MOCK_IDS.courtier,
  'mock-person-steward',
  'mock-person-envoy',
  'mock-person-spy',
  'mock-person-notary',
  'mock-person-advocate',
];

function characterListForFaction(factionId: string, scope: string = 'faction'): BridgeResponse<'game.get_character_list'> {
  if (factionId === MOCK_IDS.rivalFaction) {
    const rulerId = 'mock-person-rival';
    const personIds = [
      rulerId,
      'mock-person-salt-leader',
    ].filter(id => personById(id).isAlive);
    return {
      factionId: MOCK_IDS.rivalFaction,
      factionName: 'Aurestian League',
      rulerId,
      heirId: '',
      scope: 'faction',
      characters: personIds.map(id => characterListEntry(id, MOCK_IDS.rivalFaction, 'Aurestian League', '')),
      traits: characterListTraits(personIds),
    };
  }

  if (factionId === MOCK_IDS.subjectFaction) {
    const rulerId = 'mock-person-subject';
    const personIds = [rulerId].filter(id => personById(id).isAlive);
    return {
      factionId: MOCK_IDS.subjectFaction,
      factionName: 'Meridian Prefecture',
      rulerId,
      heirId: '',
      scope: 'faction',
      characters: personIds.map(id => characterListEntry(id, MOCK_IDS.subjectFaction, 'Meridian Prefecture', '')),
      traits: characterListTraits(personIds),
    };
  }

  const realm = scope === 'realm';
  const subjectPersonIds = realm ? ['mock-person-subject'].filter(id => personById(id).isAlive) : [];
  const personIds = [
    ...MOCK_CHARACTER_LIST_PERSON_IDS,
    ...subjectPersonIds,
  ].filter(id => personById(id).isAlive);
  return {
    factionId: MOCK_IDS.playerFaction,
    factionName: 'Rephsian Empire',
    rulerId: MOCK_IDS.character,
    heirId: MOCK_IDS.heir,
    scope: realm ? 'realm' : 'faction',
    characters: personIds.map(id => subjectPersonIds.includes(id)
      ? characterListEntry(id, MOCK_IDS.subjectFaction, 'Meridian Prefecture', '')
      : characterListEntry(id)),
    traits: characterListTraits(personIds),
  };
}

function familyTreePerson(id: string, focusPersonId: string = MOCK_IDS.character) {
  const person = personById(id);
  return {
    id: person.id,
    name: person.name,
    portrait: person.portrait,
    portraitLayers: person.portraitLayers,
    title: person.title,
    shortTitle: person.shortTitle,
    age: person.age,
    isAlive: person.isAlive,
    isImprisoned: person.isImprisoned,
    gender: person.portrait === FEMALE_PORTRAIT_1 ? 'Female' : 'Male',
    culture: person.culture,
    religion: person.religion,
    activity: person.activity,
    role: person.shortTitle,
    relationToRuler: person.id === focusPersonId ? 'Self' : person.relationToPlayer || (person.id === MOCK_IDS.character ? 'Ruler' : 'Kinsman'),
    isFocus: person.id === focusPersonId,
    isRuler: person.id === MOCK_IDS.character,
    isHeir: person.id === MOCK_IDS.heir,
    isDesignatedHeir: person.id === MOCK_IDS.heir,
    isPreviousRuler: person.id === 'mock-person-previous-ruler',
    fame: person.fame,
  };
}

function heirCandidates(): BridgeResponse<'game.get_heir_candidates'> {
  const candidateIds = [MOCK_IDS.heir, 'mock-person-brother', 'mock-person-daughter', MOCK_IDS.governor];
  return {
    factionId: MOCK_IDS.playerFaction,
    candidates: candidateIds.map(id => {
      const person = personById(id);
      return {
        id: person.id,
        name: person.name,
        title: person.title,
        shortTitle: person.shortTitle,
        portrait: person.portrait,
        portraitLayers: person.portraitLayers,
        age: person.age,
        factionId: MOCK_IDS.playerFaction,
        factionName: 'Rephsian Empire',
        relationToRuler: person.relationToPlayer || 'Court',
        tactics: person.stats.tactics,
        fame: person.fame,
        authority: person.stats.authority,
        cunning: person.stats.cunning,
        governance: person.stats.governance,
        loyalty: person.stats.loyalty,
        constitution: person.stats.constitution,
        appointerOpinionOfHeirChange: id === MOCK_IDS.heir ? 40 : 50,
        heirOpinionOfAppointerChange: id === MOCK_IDS.heir ? 40 : 50,
        consequenceDurationDays: 1800,
        passedOverConsequences: id === MOCK_IDS.heir ? [] : [{
          personId: MOCK_IDS.heir,
          name: 'Cassian Arcastus',
          isPreviousHeir: true,
          opinionOfAppointerChange: -40,
          opinionOfHeirChange: -25,
        }],
        traits: person.traits.map(trait => ({
          id: trait.id,
          name: trait.name,
          description: trait.description,
          isPositive: trait.isPositive,
        })),
      };
    }),
  };
}

function economyOverview(): BridgeResponse<'game.get_economy_overview'> {
  const historyMonths = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 12, 11];

  return {
    gold: 22748,
    netIncome: 7670,
    incomeTotal: 10820,
    expenseTotal: 3150,
    settlementIncome: 7060,
    tradeIncome: 2680,
    resourceSalesIncome: 380,
    vassalTributeIncome: 700,
    treatyTributeIncome: 0,
    eventIncome: 0,
    lootingIncome: 0,
    otherIncome: 0,
    armyExpense: 2060,
    commandMaintenanceExpense: 340,
    treasuryDampeningExpense: 0,
    replenishmentExpense: 120,
    buildingExpense: 480,
    tributePaidToLiege: 0,
    treatyTributePaid: 0,
    eventExpense: 0,
    powerBlocExpense: 150,
    landownerInterestExpense: 0,
    landownerDebt: 0,
    landownerMonthlyInterestRate: 0.05,
    autoAssignCommanderExpense: 0,
    otherExpense: 0,
    treasuryAdjustment: 0,
    tradeTransactionAmount: 100,
    autoSellThresholdStep: 500,
    totalFood: 1285,
    foodProduction: 148,
    foodSubjectContribution: 104,
    foodTreatyIncome: 0,
    settlementFoodConsumption: 180,
    militaryFoodConsumption: 54,
    foodQueuedConsumption: 0,
    foodDecayLoss: 0,
    foodIncomeTotal: 252,
    foodExpenseTotal: 234,
    foodNet: 18,
    autoBuyEnabled: true,
    resources: [
      {
        id: 'Grain',
        name: 'Grain',
        category: 'food',
        amount: 842,
        production: 96,
        vassalContribution: 0,
        treatyIncome: 0,
        militaryUsage: 0,
        queuedUsage: 0,
        settlementConsumption: 122,
        decayLoss: 0,
        netPerMonth: -26,
        marketMultiplier: 0.85,
        buyPrice: 0.17,
        sellPrice: 0.085,
        autoSellEnabled: false,
        autoSellThreshold: 576,
        autoSellSliderMax: 1152,
        producers: [
          { name: 'Rephsia', amount: 24, linkType: 'settlement', linkId: MOCK_IDS.settlement },
          { name: 'Cortalium', amount: 16, linkType: 'settlement', linkId: 'mock-settlement-cortalium' },
          { name: 'Vallis Regio', amount: 14, linkType: 'settlement', linkId: 'mock-settlement-vallis-regio' },
          { name: 'Berginium', amount: 12, linkType: 'settlement', linkId: 'mock-settlement-berginium' },
          { name: 'Lacertum', amount: 8, linkType: 'settlement', linkId: 'mock-settlement-lacertum' },
          { name: 'Ara Salimba', amount: 6, linkType: 'settlement', linkId: MOCK_IDS.portSettlement },
        ],
      },
      {
        id: 'Wood',
        name: 'Timber',
        category: 'rawMaterials',
        amount: 524,
        production: 48,
        vassalContribution: 0,
        treatyIncome: 0,
        militaryUsage: 0,
        queuedUsage: 0,
        settlementConsumption: 36,
        decayLoss: 0,
        netPerMonth: 7,
        marketMultiplier: 1.05,
        buyPrice: 0.315,
        sellPrice: 0.1575,
        autoSellEnabled: true,
        autoSellThreshold: 500,
        autoSellSliderMax: 1000,
        producers: [
          { name: 'Lacertum', amount: 18, linkType: 'settlement', linkId: 'mock-settlement-lacertum' },
          { name: 'Berginium', amount: 12, linkType: 'settlement', linkId: 'mock-settlement-berginium' },
          { name: 'Cortalium', amount: 10, linkType: 'settlement', linkId: 'mock-settlement-cortalium' },
          { name: 'Tavarli', amount: 8, linkType: 'faction', linkId: 'mock-faction-tavarli' },
        ],
      },
      {
        id: 'Stone',
        name: 'Stone',
        category: 'rawMaterials',
        amount: 380,
        production: 28,
        vassalContribution: 0,
        treatyIncome: 0,
        militaryUsage: 0,
        queuedUsage: 0,
        settlementConsumption: 18,
        decayLoss: 0,
        netPerMonth: 10,
        marketMultiplier: 1.2,
        buyPrice: 0.36,
        sellPrice: 0.18,
        autoSellEnabled: false,
        autoSellThreshold: 500,
        autoSellSliderMax: 1000,
        producers: [
          { name: 'Vallis Regio', amount: 14, linkType: 'settlement', linkId: 'mock-settlement-vallis-regio' },
          { name: 'Ara Salimba', amount: 8, linkType: 'settlement', linkId: MOCK_IDS.portSettlement },
          { name: 'Ingalia', amount: 4, linkType: 'faction', linkId: 'mock-faction-ingalia' },
          { name: 'Berginium', amount: 2, linkType: 'settlement', linkId: 'mock-settlement-berginium' },
        ],
      },
      {
        id: 'Meat',
        name: 'Livestock',
        category: 'food',
        amount: 315,
        production: 34,
        vassalContribution: 0,
        treatyIncome: 0,
        militaryUsage: 0,
        queuedUsage: 0,
        settlementConsumption: 55,
        decayLoss: 0,
        netPerMonth: -21,
        marketMultiplier: 1.15,
        buyPrice: 0.23,
        sellPrice: 0.115,
        autoSellEnabled: false,
        autoSellThreshold: 500,
        autoSellSliderMax: 1000,
        producers: [
          { name: 'Ara Salimba', amount: 10, linkType: 'settlement', linkId: MOCK_IDS.portSettlement },
          { name: 'Ingalia', amount: 8, linkType: 'faction', linkId: 'mock-faction-ingalia' },
          { name: 'Tavarli', amount: 7, linkType: 'faction', linkId: 'mock-faction-tavarli' },
          { name: 'Cortalium', amount: 5, linkType: 'settlement', linkId: 'mock-settlement-cortalium' },
        ],
      },
      {
        id: 'Iron',
        name: 'Iron',
        category: 'strategic',
        amount: 156,
        production: 22,
        vassalContribution: 0,
        treatyIncome: 0,
        militaryUsage: 0,
        queuedUsage: 0,
        settlementConsumption: 14,
        decayLoss: 0,
        netPerMonth: 8,
        marketMultiplier: 1.45,
        buyPrice: 0.87,
        sellPrice: 0.435,
        autoSellEnabled: false,
        autoSellThreshold: 500,
        autoSellSliderMax: 1000,
        producers: [
          { name: 'Lacertum', amount: 9, linkType: 'settlement', linkId: 'mock-settlement-lacertum' },
          { name: 'Vallis Regio', amount: 6, linkType: 'settlement', linkId: 'mock-settlement-vallis-regio' },
          { name: 'Ingalia', amount: 5, linkType: 'faction', linkId: 'mock-faction-ingalia' },
          { name: 'Cortalium', amount: 2, linkType: 'settlement', linkId: 'mock-settlement-cortalium' },
        ],
      },
      {
        id: 'Fish',
        name: 'Fish',
        category: 'food',
        amount: 128,
        production: 18,
        vassalContribution: 0,
        treatyIncome: 0,
        militaryUsage: 0,
        queuedUsage: 0,
        settlementConsumption: 35,
        decayLoss: 0,
        netPerMonth: -17,
        marketMultiplier: 0.92,
        buyPrice: 0.184,
        sellPrice: 0.092,
        autoSellEnabled: false,
        autoSellThreshold: 500,
        autoSellSliderMax: 1000,
        producers: [
          { name: 'Ara Salimba', amount: 8, linkType: 'settlement', linkId: MOCK_IDS.portSettlement },
          { name: 'Rephsia', amount: 5, linkType: 'settlement', linkId: MOCK_IDS.settlement },
          { name: 'Tavarli', amount: 3, linkType: 'faction', linkId: 'mock-faction-tavarli' },
          { name: 'Berginium', amount: 2, linkType: 'settlement', linkId: 'mock-settlement-berginium' },
        ],
      },
    ],
    foodRows: [
      { settlementId: MOCK_IDS.settlement, settlementName: 'Rephsia', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', stockpile: 520, production: 42, consumption: 40, netPerMonth: 2, shortage: 0, isCapital: true },
      { settlementId: MOCK_IDS.portSettlement, settlementName: 'Ara Salimba', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', stockpile: 180, production: 26, consumption: 24, netPerMonth: 2, shortage: 0, isCapital: false },
      { settlementId: 'mock-settlement-vallis-regio', settlementName: 'Vallis Regio', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', stockpile: 210, production: 18, consumption: 22, netPerMonth: -4, shortage: 0, isCapital: false },
      { settlementId: 'mock-settlement-lacertum', settlementName: 'Lacertum', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', stockpile: 160, production: 22, consumption: 18, netPerMonth: 4, shortage: 0, isCapital: false },
      { settlementId: 'mock-settlement-berginium', settlementName: 'Berginium', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', stockpile: 125, production: 16, consumption: 19, netPerMonth: -3, shortage: 0, isCapital: false },
      { settlementId: 'mock-settlement-cortalium', settlementName: 'Cortalium', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', stockpile: 90, production: 12, consumption: 11, netPerMonth: 1, shortage: 0, isCapital: false },
    ],
    history: historyMonths.map((month, index) => ({
      month,
      year: 784,
      dateText: `${month}/784`,
      settlementIncome: 6400 + index * 60,
      tradeIncome: 2180 + index * 45,
      resourceSalesIncome: 280 + index * 9,
      vassalTributeIncome: 560 + Math.floor(index / 3) * 40,
      treatyTributeIncome: 0,
      eventIncome: index === 4 ? 120 : 0,
      lootingIncome: index === 8 ? 160 : 0,
      otherIncome: 0,
      armyExpense: 1880 + Math.floor(index / 4) * 60,
      commandMaintenanceExpense: 300 + Math.floor(index / 6) * 20,
      treasuryDampeningExpense: 0,
      replenishmentExpense: 80 + (index % 3) * 20,
      buildingExpense: 420 + (index > 6 ? 60 : 0),
      tributePaidToLiege: 0,
      treatyTributePaid: 0,
      eventExpense: 0,
      powerBlocExpense: 120 + (index > 5 ? 30 : 0),
      landownerInterestExpense: 0,
      autoAssignCommanderExpense: 0,
      otherExpense: 0,
      netIncome: (
        6400 + index * 60
        + 2180 + index * 45
        + 280 + index * 9
        + 560 + Math.floor(index / 3) * 40
        + (index === 4 ? 120 : 0)
        + (index === 8 ? 160 : 0)
      ) - (
        1880 + Math.floor(index / 4) * 60
        + 300 + Math.floor(index / 6) * 20
        + 80 + (index % 3) * 20
        + 420 + (index > 6 ? 60 : 0)
        + 120 + (index > 5 ? 30 : 0)
      ),
    })),
    taxRows: [
      { factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', isPlayerFaction: true, isVassal: false, isFoederati: false, effectiveRate: 0.2, baseRate: 0.22, adjustment: -0.02, currentTax: 7060, potentialTax: 7480, leakage: 420, blockadeLoss: 0, culturalLoss: 120, corruptionLoss: 180, ungovernedLoss: 40, complianceLoss: 80, tributeBaseIncome: 0 },
      { factionId: 'mock-faction-ingalia', factionName: 'Ingalia', isPlayerFaction: false, isVassal: true, isFoederati: false, effectiveRate: 0.35, baseRate: 0.35, adjustment: 0, currentTax: 420, potentialTax: 580, leakage: 160, blockadeLoss: 0, culturalLoss: 0, corruptionLoss: 70, ungovernedLoss: 30, complianceLoss: 60, tributeBaseIncome: 420 },
      { factionId: 'mock-faction-heartland-prefecture', factionName: 'Heartland Prefecture', isPlayerFaction: false, isVassal: true, isFoederati: false, effectiveRate: 0.22, baseRate: 0.22, adjustment: 0, currentTax: 510, potentialTax: 620, leakage: 110, blockadeLoss: 0, culturalLoss: 0, corruptionLoss: 45, ungovernedLoss: 20, complianceLoss: 45, tributeBaseIncome: 510 },
      { factionId: 'mock-faction-tavarli', factionName: 'Tavarli', isPlayerFaction: false, isVassal: true, isFoederati: false, effectiveRate: 0.2, baseRate: 0.2, adjustment: 0, currentTax: 280, potentialTax: 410, leakage: 130, blockadeLoss: 0, culturalLoss: 0, corruptionLoss: 50, ungovernedLoss: 20, complianceLoss: 60, tributeBaseIncome: 280 },
    ],
    settlements: [
      {
        id: MOCK_IDS.settlement,
        name: 'Rephsia',
        population: 264520,
        income: 6470,
        taxIncome: 4850,
        tradeIncome: 1620,
        foodProduction: 42,
        foodConsumption: 40,
        foodStockpile: 520,
        priority: 'Normal',
        buildingCount: 18,
        governorId: MOCK_IDS.governor,
        governorName: 'Marcia Vennor',
        productionResources: [{ id: 'Grain', name: 'Grain', amount: 24 }, { id: 'Fish', name: 'Fish', amount: 5 }],
        consumptionResources: [{ id: 'Food', name: 'Food', amount: 40 }, { id: 'Stone', name: 'Stone', amount: 8 }],
        stockpileResources: [{ id: 'Grain', name: 'Grain', amount: 520 }, { id: 'Stone', name: 'Stone', amount: 260 }, { id: 'Wood', name: 'Timber', amount: 180 }],
      },
      {
        id: 'mock-settlement-vallis-regio',
        name: 'Vallis Regio',
        population: 2340,
        income: 1000,
        taxIncome: 760,
        tradeIncome: 240,
        foodProduction: 18,
        foodConsumption: 22,
        foodStockpile: 210,
        priority: 'Normal',
        buildingCount: 7,
        governorId: '',
        governorName: '',
        productionResources: [{ id: 'Stone', name: 'Stone', amount: 14 }, { id: 'Iron', name: 'Iron', amount: 6 }],
        consumptionResources: [{ id: 'Food', name: 'Food', amount: 22 }, { id: 'Wood', name: 'Timber', amount: 5 }],
        stockpileResources: [{ id: 'Grain', name: 'Grain', amount: 210 }, { id: 'Stone', name: 'Stone', amount: 90 }, { id: 'Iron', name: 'Iron', amount: 58 }],
      },
      {
        id: 'mock-settlement-lacertum',
        name: 'Lacertum',
        population: 1948,
        income: 820,
        taxIncome: 610,
        tradeIncome: 210,
        foodProduction: 22,
        foodConsumption: 18,
        foodStockpile: 160,
        priority: 'Normal',
        buildingCount: 6,
        governorId: '',
        governorName: '',
        productionResources: [{ id: 'Wood', name: 'Timber', amount: 18 }, { id: 'Iron', name: 'Iron', amount: 9 }],
        consumptionResources: [{ id: 'Food', name: 'Food', amount: 18 }],
        stockpileResources: [{ id: 'Grain', name: 'Grain', amount: 160 }, { id: 'Wood', name: 'Timber', amount: 142 }, { id: 'Iron', name: 'Iron', amount: 44 }],
      },
      {
        id: MOCK_IDS.portSettlement,
        name: 'Ara Salimba',
        population: 1200,
        income: 690,
        taxIncome: 420,
        tradeIncome: 270,
        foodProduction: 26,
        foodConsumption: 24,
        foodStockpile: 180,
        priority: 'Normal',
        buildingCount: 5,
        governorId: MOCK_IDS.heir,
        governorName: 'Cassian Arcastus',
        productionResources: [{ id: 'Fish', name: 'Fish', amount: 8 }, { id: 'Stone', name: 'Stone', amount: 8 }],
        consumptionResources: [{ id: 'Food', name: 'Food', amount: 24 }, { id: 'Wood', name: 'Timber', amount: 4 }],
        stockpileResources: [{ id: 'Fish', name: 'Fish', amount: 128 }, { id: 'Grain', name: 'Grain', amount: 180 }, { id: 'Stone', name: 'Stone', amount: 72 }],
      },
      {
        id: 'mock-settlement-berginium',
        name: 'Berginium',
        population: 1562,
        income: 605,
        taxIncome: 480,
        tradeIncome: 125,
        foodProduction: 16,
        foodConsumption: 19,
        foodStockpile: 125,
        priority: 'Normal',
        buildingCount: 4,
        governorId: '',
        governorName: '',
        productionResources: [{ id: 'Wood', name: 'Timber', amount: 12 }, { id: 'Stone', name: 'Stone', amount: 2 }],
        consumptionResources: [{ id: 'Food', name: 'Food', amount: 19 }],
        stockpileResources: [{ id: 'Grain', name: 'Grain', amount: 125 }, { id: 'Wood', name: 'Timber', amount: 78 }],
      },
      {
        id: 'mock-settlement-cortalium',
        name: 'Cortalium',
        population: 820,
        income: 155,
        taxIncome: 120,
        tradeIncome: 35,
        foodProduction: 12,
        foodConsumption: 11,
        foodStockpile: 90,
        priority: 'Normal',
        buildingCount: 3,
        governorId: '',
        governorName: '',
        productionResources: [{ id: 'Grain', name: 'Grain', amount: 16 }, { id: 'Wood', name: 'Timber', amount: 10 }],
        consumptionResources: [{ id: 'Food', name: 'Food', amount: 11 }],
        stockpileResources: [{ id: 'Grain', name: 'Grain', amount: 90 }, { id: 'Wood', name: 'Timber', amount: 54 }],
      },
    ],
    militaries: [
      {
        id: MOCK_IDS.military,
        name: 'Legio II Ferrata',
        kind: 'Army',
        upkeep: 840,
        strength: 2000,
        maxStrength: 3000,
        foodConsumption: 28,
        foodStockpile: 360,
        location: 'Rephsia',
        priority: 'Normal',
        resourceUsage: [{ id: 'Food', name: 'Food', amount: 28 }, { id: 'Iron', name: 'Iron', amount: 4 }],
        resourceStockpile: [{ id: 'Grain', name: 'Grain', amount: 360 }, { id: 'Iron', name: 'Iron', amount: 22 }],
      },
      {
        id: 'mock-military-fidelis',
        name: 'Legio III Fidelis',
        kind: 'Army',
        upkeep: 620,
        strength: 1650,
        maxStrength: 2200,
        foodConsumption: 22,
        foodStockpile: 220,
        location: 'Lacertum',
        priority: 'Normal',
        resourceUsage: [{ id: 'Food', name: 'Food', amount: 22 }, { id: 'Iron', name: 'Iron', amount: 3 }],
        resourceStockpile: [{ id: 'Grain', name: 'Grain', amount: 220 }, { id: 'Iron', name: 'Iron', amount: 18 }],
      },
      {
        id: MOCK_IDS.navy,
        name: 'Classis Meridiana',
        kind: 'Navy',
        upkeep: 420,
        strength: 800,
        maxStrength: 1200,
        foodConsumption: 12,
        foodStockpile: 160,
        location: 'Ara Salimba',
        priority: 'Normal',
        resourceUsage: [{ id: 'Food', name: 'Food', amount: 12 }, { id: 'Wood', name: 'Timber', amount: 6 }],
        resourceStockpile: [{ id: 'Fish', name: 'Fish', amount: 160 }, { id: 'Wood', name: 'Timber', amount: 45 }],
      },
      {
        id: 'mock-military-auxilia-tamashek',
        name: 'Auxilia Tamashek',
        kind: 'Army',
        upkeep: 180,
        strength: 450,
        maxStrength: 600,
        foodConsumption: 6,
        foodStockpile: 80,
        location: 'Ara Salimba',
        priority: 'Low',
        resourceUsage: [{ id: 'Food', name: 'Food', amount: 6 }],
        resourceStockpile: [{ id: 'Grain', name: 'Grain', amount: 80 }],
      },
    ],
    vassals: [
      {
        id: MOCK_IDS.subjectFaction,
        name: 'Meridian Prefecture',
        taxRate: 35,
        goldTribute: 420,
        resourceContribution: 10,
        requirement: 580,
        priority: 'normal',
        isFoederati: false,
        type: 'Province',
        potential: 580,
        contributions: [{ id: 'Wood', name: 'Timber', amount: 6 }, { id: 'Stone', name: 'Stone', amount: 4 }],
        requirements: [{ id: 'Food', name: 'Food', amount: 420 }, { id: 'Wood', name: 'Timber', amount: 160 }],
      },
      {
        id: 'mock-faction-heartland-prefecture',
        name: 'Heartland Prefecture',
        taxRate: 22,
        goldTribute: 510,
        resourceContribution: 16,
        requirement: 620,
        priority: 'normal',
        isFoederati: false,
        type: 'Province',
        potential: 620,
        contributions: [{ id: 'Grain', name: 'Grain', amount: 10 }, { id: 'Iron', name: 'Iron', amount: 6 }],
        requirements: [{ id: 'Food', name: 'Food', amount: 500 }, { id: 'Stone', name: 'Stone', amount: 120 }],
      },
      {
        id: 'mock-faction-river-marches',
        name: 'River Marches',
        taxRate: 0,
        goldTribute: 0,
        resourceContribution: 0,
        requirement: 410,
        priority: 'low',
        isFoederati: true,
        type: 'Foederati',
        potential: 410,
        contributions: [],
        requirements: [{ id: 'Food', name: 'Food', amount: 280 }, { id: 'Iron', name: 'Iron', amount: 130 }],
      },
    ],
  };
}

function economyResourceDetails(resourceId: string): BridgeResponse<'game.get_economy_resource_details'> {
  const resource = economyOverview().resources.find(row => row.id === resourceId) ?? economyOverview().resources[0]!;
  const consumption = resource.militaryUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss;
  return {
    resourceId: resource.id,
    name: resource.name,
    description: `${resource.name} is stored and traded across your realm.`,
    effects: resource.category === 'food' ? 'Contributes to the shared food supply.' : 'Used by settlements and military forces.',
    category: resource.category,
    tier: 'primary',
    decayRate: resource.decayLoss > 0 && resource.amount > 0 ? resource.decayLoss / resource.amount : 0,
    foodValue: resource.category === 'food' ? 1 : 0,
    sharedFoodDemand: resource.category === 'food' ? 180 : 0,
    producers: resource.producers.filter(producer => producer.linkType === 'settlement').map((producer, index) => ({
      settlementId: producer.linkId,
      settlementName: producer.name,
      amount: producer.amount,
      naturalAmount: index === 0 ? producer.amount * 0.65 : producer.amount,
      processedAmount: index === 0 ? producer.amount * 0.35 : 0,
      buildings: index === 0 ? [{ name: 'Granaries', value: producer.amount * 0.35 }] : [],
      modifiers: index === 0 ? [{ name: 'Fertile land', value: 15 }] : [],
    })),
    externalSources: resource.vassalContribution > 0 ? [{
      id: 'mock-subject-source',
      name: 'Rephsian Province',
      kind: 'subject',
      linkType: 'faction',
      linkId: 'mock-subject-source',
      amount: resource.vassalContribution,
    }] : [],
    consumers: [
      ...(resource.settlementConsumption > 0 ? [{ id: 'settlement-use', name: 'Settlements', kind: 'settlement', linkType: '', linkId: '', amount: resource.settlementConsumption }] : []),
      ...(resource.militaryUsage > 0 ? [{ id: 'military-use', name: 'Field Army', kind: 'army', linkType: 'military', linkId: MOCK_IDS.military, amount: resource.militaryUsage }] : []),
      ...(resource.queuedUsage > 0 ? [{ id: 'queued-use', name: 'Recruitment queues', kind: 'queued', linkType: '', linkId: '', amount: resource.queuedUsage }] : []),
      ...(resource.decayLoss > 0 ? [{ id: 'decay-use', name: 'Spoilage and decay', kind: 'decay', linkType: '', linkId: '', amount: resource.decayLoss }] : []),
    ],
    history: Array.from({ length: 24 }, (_, index) => {
      const age = 23 - index;
      const wave = Math.sin(index * 0.65) * Math.max(2, Math.abs(resource.netPerMonth) * 0.35);
      const production = Math.max(0, resource.production + wave);
      const use = Math.max(0, consumption - wave * 0.3);
      const marketMultiplier = Math.max(0.2, resource.marketMultiplier + Math.sin(index * 0.4) * 0.12);
      return {
        dateText: `${(index % 12) + 1}/784`,
        stockpile: Math.max(0, resource.amount - resource.netPerMonth * age),
        production,
        consumption: use,
        net: production - use,
        marketPrice: Math.ceil(100 * resource.buyPrice / resource.marketMultiplier * marketMultiplier),
      };
    }),
  };
}

function diplomacyOverview(autoAssignGovernorsEnabled = true): BridgeResponse<'game.get_diplomacy_overview'> {
  const player = playerFactionReference();
  const rival = rivalFactionReference();
  return {
    playerFactionId: MOCK_IDS.playerFaction,
    playerFactionName: 'Rephsian Empire',
    autoAssignGovernorsEnabled,
    canCreateProvinces: true,
    provinceEmptyReason: '',
    governorEmptyReason: '',
    internalFactions: [
      { ...subjectFactionReference(), rulerId: 'mock-person-subject', rulerName: 'Iulia Seran', capital: 'Namaris', diplomaticStatus: 'subject', diplomaticStatusLabel: 'Subject', subjectType: 'Prefecture', subjectSubtype: 'province', buildFocusKey: 'economic', buildFocus: 'Economic', taxRate: 0.22, goldTribute: 510, opinion: 68, compliance: 72, hasCompliance: true, population: 312000, settlements: 4, strength: 3600, treaties: 1, isRebel: false, isAtWar: false, canSetBuildFocus: true, buildFocusBlockedReason: '' },
      { id: 'mock-faction-heartland-prefecture', name: 'Heartland Prefecture', colour: '#8A5F3C', secondaryColour: '#D8C27A', cultureGroup: 'Rephsian', emblem: 'Rephsian_2', rulerId: MOCK_IDS.governor, rulerName: 'Marcia Vennor', capital: 'Rephsia', diplomaticStatus: 'subject', diplomaticStatusLabel: 'Subject', subjectType: 'Prefecture', subjectSubtype: 'province', buildFocusKey: 'administrative', buildFocus: 'Administrative', taxRate: 0.18, goldTribute: 430, opinion: 54, compliance: 81, hasCompliance: true, population: 438000, settlements: 5, strength: 4200, treaties: 1, isRebel: false, isAtWar: false, canSetBuildFocus: true, buildFocusBlockedReason: '' },
      { id: 'mock-faction-western-revolt', name: 'Western Revolt', colour: '#6D252B', secondaryColour: '#D8C27A', cultureGroup: 'Rephsian', emblem: 'Rephsian_5', rulerId: 'mock-person-rebel-leader', rulerName: 'Titus Varro', capital: 'Valemor', diplomaticStatus: 'war', diplomaticStatusLabel: 'At War', subjectType: 'Rebellion', subjectSubtype: 'rebel', buildFocusKey: '', buildFocus: '', taxRate: 0, goldTribute: 0, opinion: -86, compliance: 0, hasCompliance: false, population: 226000, settlements: 3, strength: 5100, treaties: 0, isRebel: true, isAtWar: true, canSetBuildFocus: false, buildFocusBlockedReason: '' },
      { id: 'mock-faction-river-marches', name: 'River Marches', colour: '#6E4B76', secondaryColour: '#D8C27A', cultureGroup: 'Rephsian', emblem: 'Rephsian_3', rulerId: 'mock-person-march-lord', rulerName: 'Oren Tullus', capital: 'Varenton', diplomaticStatus: 'subject', diplomaticStatusLabel: 'Foederati', subjectType: 'March', subjectSubtype: 'foederati', buildFocusKey: '', buildFocus: '', taxRate: 0, goldTribute: 0, opinion: 42, compliance: 55, hasCompliance: true, population: 188000, settlements: 3, strength: 2800, treaties: 0, isRebel: false, isAtWar: false, canSetBuildFocus: false, buildFocusBlockedReason: '' },
    ],
    foreignPowers: [
      { ...rival, rulerId: 'mock-person-rival', rulerName: 'Soran Velk', capital: 'Velath Keep', diplomaticStatus: 'war', diplomaticStatusLabel: 'At War', subjectType: '', subjectSubtype: '', buildFocusKey: '', buildFocus: '', taxRate: 0, goldTribute: 0, opinion: 18, compliance: 0, hasCompliance: false, population: 642000, settlements: 7, strength: 9100, treaties: 0, isRebel: false, isAtWar: true, canSetBuildFocus: false, buildFocusBlockedReason: '' },
      { id: 'mock-faction-salt-league', name: 'Salt League', colour: '#8A6930', secondaryColour: '#CFC4AA', cultureGroup: 'Aurestian', emblem: 'Aurestian_2', rulerId: 'mock-person-salt-leader', rulerName: 'Nera Solun', capital: 'Salinar', diplomaticStatus: 'neutral', diplomaticStatusLabel: 'Neutral', subjectType: '', subjectSubtype: '', buildFocusKey: '', buildFocus: '', taxRate: 0, goldTribute: 0, opinion: 36, compliance: 0, hasCompliance: false, population: 284000, settlements: 5, strength: 4200, treaties: 1, isRebel: false, isAtWar: false, canSetBuildFocus: false, buildFocusBlockedReason: '' },
    ],
    provinceCandidates: [
      { landId: 'AurelionBasin', landName: 'Aurelion Basin', settlementCount: 3, controlPercent: 100, cost: 250, bureaucraticLoadChange: -8, canCreate: true, blockedReason: '' },
      { landId: 'NamarisShore', landName: 'Namaris Shore', settlementCount: 2, controlPercent: 75, cost: 180, bureaucraticLoadChange: -6, canCreate: false, blockedReason: 'Requires full control.' },
    ],
    regionalGovernors: [
      { regionId: 'Heartland', regionName: 'Heartland', settlementId: 'mock-settlement-capital', settlementName: 'Rephsia', governorId: MOCK_IDS.governor, governorName: 'Marcia Vennor', settlementCount: 5, corruptionPercent: 8, taxBonusPercent: 12, unrestReductionPercent: 6, militaryBonusPercent: 2, bureaucraticGovernorLoad: 0, isLocked: false, canManageGovernor: true },
      { regionId: 'MeridianCoast', regionName: 'Meridian Coast', settlementId: 'mock-settlement-port', settlementName: 'Namaris', governorId: MOCK_IDS.heir, governorName: 'Cassian Arcastus', settlementCount: 4, corruptionPercent: 14, taxBonusPercent: 6, unrestReductionPercent: 3, militaryBonusPercent: 5, bureaucraticGovernorLoad: 0, isLocked: false, canManageGovernor: true },
    ],
    activeWars: [
      {
        id: 'mock-war-rival',
        name: 'War for the Western Passes',
        ourLeader: player,
        theirLeader: rival,
        ourParticipants: [player, subjectFactionReference()],
        theirParticipants: [rival, { id: 'mock-faction-salt-league', name: 'Salt League', colour: '#8A6930', secondaryColour: '#CFC4AA', cultureGroup: 'Aurestian', emblem: 'Aurestian_2' }],
        warScore: 18,
        warScoreBreakdown: [
          { label: 'Battles', score: 12, eventCount: 3, isOurs: true, depth: 0 },
          { label: 'Battle of the Western Pass', score: 12, eventCount: 1, isOurs: true, depth: 1 },
          { label: 'Occupied settlements', score: 6, eventCount: 1, isOurs: true, depth: 0 },
        ],
        durationDays: 142,
        battlesFought: 3,
        settlementsCaptured: 1,
        isRebellionWar: false,
        canNegotiate: true,
      },
      {
        id: 'mock-war-raiders',
        name: 'Raiders of the Salt Road',
        ourLeader: player,
        theirLeader: { id: 'mock-faction-raiders', name: 'Salt Road Raiders', colour: '#604040', secondaryColour: '#B8A070', cultureGroup: 'Aurestian', emblem: 'Aurestian_3' },
        ourParticipants: [player, subjectFactionReference()],
        theirParticipants: [
          { id: 'mock-faction-raiders', name: 'Salt Road Raiders', colour: '#604040', secondaryColour: '#B8A070', cultureGroup: 'Aurestian', emblem: 'Aurestian_3' },
          rival,
        ],
        warScore: -6,
        warScoreBreakdown: [
          { label: 'Battles', score: -6, eventCount: 1, isOurs: false, depth: 0 },
        ],
        durationDays: 51,
        battlesFought: 1,
        settlementsCaptured: 0,
        isRebellionWar: false,
        canNegotiate: false,
      },
    ],
    ourTreaties: [
      {
        id: 'mock-diplomacy-treaty-defensive-pact-subject',
        type: 'Defensive Pact',
        displayName: 'Defensive Pact',
        description: 'Both factions will answer defensive calls to war.',
        withFactionId: MOCK_IDS.subjectFaction,
        withFaction: 'Meridian Prefecture',
        withFactionColour: SUBJECT_COLOUR,
        withFactionSecondaryColour: SUBJECT_SECONDARY,
        withFactionCultureGroup: 'Rephsian',
        withFactionEmblem: 'Rephsian_2',
        daysRemaining: 0,
        isPerpetual: true,
        canBreak: true,
        breakingPenalty: 25,
        isWithPlayer: false,
      },
      {
        id: 'mock-diplomacy-treaty-trade-rights-salt-league',
        type: 'Trade Rights',
        displayName: 'Trade Rights',
        description: 'Merchants may cross borders and use protected markets.',
        withFactionId: 'mock-faction-salt-league',
        withFaction: 'Salt League',
        withFactionColour: '#8A6930',
        withFactionSecondaryColour: '#CFC4AA',
        withFactionCultureGroup: 'Aurestian',
        withFactionEmblem: 'Aurestian_2',
        daysRemaining: 720,
        isPerpetual: false,
        canBreak: true,
        breakingPenalty: 10,
        isWithPlayer: false,
      },
    ],
  };
}

function ledgerOverview(): BridgeResponse<'game.get_ledger_overview'> {
  const playerVisual = { colour: PLAYER_COLOUR, secondaryColour: PLAYER_SECONDARY, cultureGroup: 'Rephsian', emblem: 'Rephsian_1' };
  const rivalVisual = { colour: RIVAL_COLOUR, secondaryColour: RIVAL_SECONDARY, cultureGroup: 'Aurestian', emblem: 'Aurestian_1' };
  const emptyBattleReport = {
    available: false,
    battleName: '',
    outcome: '',
    location: '',
    summary: '',
    headerImage: '',
    spoils: '',
    spoilsList: [],
    unitDamage: [],
    ourSide: {
      label: '', names: '', commanders: '', commanderDetails: [], unitLabel: '',
      factionId: '', factionName: '', factionColour: '', factionSecondaryColour: '', factionCultureGroup: '', factionEmblem: '',
      initialStrength: 0, remainingStrength: 0, losses: 0, lossPercent: 0, won: false,
    },
    enemySide: {
      label: '', names: '', commanders: '', commanderDetails: [], unitLabel: '',
      factionId: '', factionName: '', factionColour: '', factionSecondaryColour: '', factionCultureGroup: '', factionEmblem: '',
      initialStrength: 0, remainingStrength: 0, losses: 0, lossPercent: 0, won: false,
    },
  };
  const ledgerBattleReport = {
    ...emptyBattleReport,
    available: true,
    battleName: 'Battle of Berginium',
    outcome: 'Victory',
    location: 'Berginium',
    summary: 'I Field Army broke the rebel line and held the field.',
    headerImage: '/assets/events/military-victory.png',
    ourSide: {
      ...emptyBattleReport.ourSide,
      label: 'Our forces',
      names: 'I Field Army',
      commanders: 'Valen Arcastus',
      unitLabel: 'Manpower',
      factionId: MOCK_IDS.playerFaction,
      factionName: 'Rephsian Empire',
      factionColour: PLAYER_COLOUR,
      factionSecondaryColour: PLAYER_SECONDARY,
      factionCultureGroup: 'Rephsian',
      factionEmblem: 'Rephsian_1',
      initialStrength: 6800,
      remainingStrength: 6040,
      losses: 760,
      lossPercent: 11.2,
      won: true,
    },
    enemySide: {
      ...emptyBattleReport.enemySide,
      label: 'Enemy forces',
      names: 'Berginian Rebellion',
      unitLabel: 'Manpower',
      factionId: MOCK_IDS.rivalFaction,
      factionName: 'Berginian Rebellion',
      factionColour: RIVAL_COLOUR,
      factionSecondaryColour: RIVAL_SECONDARY,
      factionCultureGroup: 'Aurestian',
      factionEmblem: 'Aurestian_1',
      initialStrength: 5100,
      remainingStrength: 2670,
      losses: 2430,
      lossPercent: 47.6,
      won: false,
    },
  };
  return {
    settlementCount: 2,
    militaryCount: 4,
    factionCount: 2,
    resourceCount: 2,
    buildingCount: 2,
    notificationCount: 3,
    filteredSettlementCount: 2,
    filteredBuildingCount: 2,
    rowOffset: 0,
    rowLimit: 0,
    settlements: [
      { id: MOCK_IDS.settlement, name: 'Aurelion', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, type: 'metropolis', region: 'Heartland', population: 384000, income: 122, foodProduction: 980, foodConsumption: 1210, unrest: 8, buildingCount: 18, resourceCount: 6, isCapital: true, isUnderSiege: false },
      { id: MOCK_IDS.portSettlement, name: 'Namaris', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, type: 'port', region: 'Meridian Coast', population: 142000, income: 46, foodProduction: 540, foodConsumption: 610, unrest: 18, buildingCount: 9, resourceCount: 5, isCapital: false, isUnderSiege: false },
    ],
    militaries: [
      { id: MOCK_IDS.military, name: 'I Field Army', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, kind: 'Army', commanderId: MOCK_IDS.character, commanderName: 'Valen Arcastus', strength: 6800, maxStrength: 7600, morale: 84, upkeep: 116, supplyDays: 54, location: 'Aurelion', unitCount: 8 },
      { id: 'mock-military-detachment', name: 'Aurelion Detachment', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, kind: 'Army', commanderId: MOCK_IDS.heir, commanderName: 'Cassian Arcastus', strength: 1600, maxStrength: 1800, morale: 71, upkeep: 42, supplyDays: 43, location: 'Aurelion', unitCount: 3 },
      { id: MOCK_IDS.navy, name: 'Classis Meridian', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, kind: 'Navy', commanderId: MOCK_IDS.governor, commanderName: 'Marcia Vennor', strength: 1800, maxStrength: 2200, morale: 76, upkeep: 90, supplyDays: 88, location: 'Namaris', unitCount: 18 },
      { id: 'mock-navy-riverwatch', name: 'Riverwatch Flotilla', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, kind: 'Navy', commanderId: 'mock-person-tribune', commanderName: 'Severus Laco', strength: 900, maxStrength: 1100, morale: 69, upkeep: 38, supplyDays: 61, location: 'Tavarii Ford', unitCount: 8 },
    ],
    factions: [
      { id: MOCK_IDS.playerFaction, name: 'Rephsian Empire', visual: playerVisual, rulerId: MOCK_IDS.character, rulerName: 'Valen Arcastus', diplomaticStatus: 'Player', settlementCount: 14, population: 1284000, gold: 4280, income: 186, strength: 18400, armyCount: 3, navyCount: 2, vassalCount: 2, isPlayer: true, isRebel: false },
      { id: MOCK_IDS.rivalFaction, name: 'Aurestian League', visual: rivalVisual, rulerId: 'mock-person-rival', rulerName: 'Soran Velk', diplomaticStatus: 'War', settlementCount: 7, population: 642000, gold: 1130, income: 58, strength: 9100, armyCount: 2, navyCount: 0, vassalCount: 0, isPlayer: false, isRebel: false },
    ],
    resources: [
      { id: 'food', name: 'Food', category: 'Food', stockpile: 1630, production: 1520, consumption: 1898, netPerMonth: -378, settlementCount: 14, isFood: true },
      { id: 'stone', name: 'Stone', category: 'Construction', stockpile: 260, production: 30, consumption: 16, netPerMonth: 14, settlementCount: 5, isFood: false },
    ],
    buildings: [
      { id: 'mock-building-forum', name: 'Forum', category: 'Administrative', level: 3, maxLevel: 4, settlementId: MOCK_IDS.settlement, settlementName: 'Aurelion', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, upkeep: 12, condition: 92 },
      { id: 'mock-building-docks', name: 'Docks', category: 'Naval', level: 2, maxLevel: 4, settlementId: MOCK_IDS.portSettlement, settlementName: 'Namaris', factionId: MOCK_IDS.playerFaction, factionName: 'Rephsian Empire', factionVisual: playerVisual, upkeep: 18, condition: 88 },
    ],
    notifications: [
      { id: 'mock-ledger-food-shortage', gameDate: 286212, date: '18 Harvest 784', category: 'settlement', categoryLabel: 'Settlement', icon: '/assets/icons/I_Food.png', titleHtml: 'Stores run low in Namaris', bodyHtml: 'Food consumption has overtaken local production. The settlement will draw from realm stores unless supply improves.', decision: '', hasDecision: false, isAccepted: false, battleAfterActionReport: emptyBattleReport },
      { id: 'mock-ledger-frontier-battle', gameDate: 286204, date: '10 Harvest 784', category: 'military', categoryLabel: 'Military', icon: '/assets/icons/I_Swords.png', titleHtml: 'Victory at Berginium', bodyHtml: 'I Field Army broke the rebel line and held the field.', decision: '', hasDecision: false, isAccepted: false, battleAfterActionReport: ledgerBattleReport },
      { id: 'mock-ledger-court-demand', gameDate: 286188, date: '24 Highsun 784', category: 'political', categoryLabel: 'Political', icon: '/assets/icons/I_PowerBlocs.png', titleHtml: 'Court faction presses for concessions', bodyHtml: 'Marcia Vennor backed a demand for lower extraordinary taxes.', decision: 'Refused', hasDecision: true, isAccepted: false, battleAfterActionReport: emptyBattleReport },
    ],
  };
}

function personalGuardEligibleUnits() {
  const withAvailability = (
    unit: ReturnType<typeof formationUnit>,
    settlements: { id: string; name: string; available: boolean }[],
  ) => ({
    ...unit,
    availableSettlementCount: settlements.filter(entry => entry.available).length,
    availableSettlements: settlements,
  });

  return [
    withAvailability(formationUnit('palace-guard', 'Palace Guard', 'infantry', 'land', 0, 20), [
      { id: 'mock-settlement-rephsia', name: 'Rephsia', available: true },
    ]),
    withAvailability(formationUnit('palace-archers', 'Palace Archers', 'ranged', 'land', 0, 20), [
      { id: 'mock-settlement-rephsia', name: 'Rephsia', available: true },
    ]),
    withAvailability(formationUnit('governors-horse', "Governor's Horse", 'cavalry', 'land', 0, 20), [
      { id: 'mock-settlement-aurelion', name: 'Aurelion', available: true },
      { id: 'mock-settlement-rephsia', name: 'Rephsia', available: true },
    ]),
    // Foederati companies with no current recruitment base - hidden until "Show unavailable".
    withAvailability(
      formationUnit('assembly-vanguard', 'Assembly Vanguard', 'infantry', 'land', 0, 105, false, aurestianCulture),
      [],
    ),
    withAvailability(
      formationUnit('lions-red-wood', 'Lions of the Red Wood', 'cavalry', 'land', 0, 120, false, aurestianCulture),
      [],
    ),
  ];
}

function personalGuardUnitMeta(unitId: string) {
  return personalGuardEligibleUnits().find(unit => unit.id === unitId)
    ?? formationUnit(unitId, unitId, 'infantry', 'land', 0, 20);
}

function personalGuardStatus(state: MockBridgeState): BridgeResponse<'game.get_personal_guard'> {
  const eligibleUnits = personalGuardEligibleUnits();
  const unitById = new Map(eligibleUnits.map(unit => [unit.id, unit]));
  const rulerName = state.provinceMode ? 'Marcia Vennor' : 'Valen Arcastus';
  const companyCapacity = state.provinceMode ? 10 : 20;
  const isForming = state.personalGuard.isForming;
  const hasGuard = state.personalGuard.hasGuard || isForming;
  const daysSinceForm = isForming
    ? Math.max(0, state.gameDay - state.personalGuard.formStartDay)
    : 0;
  const companies = state.personalGuard.unitIds.map((unitId, index) => {
    const unit = unitById.get(unitId) ?? personalGuardUnitMeta(unitId);
    const isReady = hasGuard && (!isForming || index === 0 || daysSinceForm >= (index * 12));
    const isRecruiting = hasGuard && !isReady;
    const remainingDays = isRecruiting ? Math.max(1, (index * 12) - daysSinceForm) : 0;
    const progress = isRecruiting
      ? Math.min(0.95, daysSinceForm / Math.max(1, index * 12))
      : isReady ? 1 : 0;
    return {
      slotNumber: index + 1,
      unitId,
      name: unit.name,
      description: unit.description,
      portrait: unit.portrait,
      type: unit.type,
      typeLabel: unit.unitTypeLabel,
      cultureName: unit.cultureName,
      isHousehold: !unit.cultureId || unit.cultureId === rephsianCulture.id,
      isBarbarian: Boolean(unit.cultureId && unit.cultureId !== rephsianCulture.id),
      strength: isReady ? unit.maxStrength : 0,
      maxStrength: unit.maxStrength,
      upkeep: unit.upkeep,
      status: isReady ? 'Ready' : isRecruiting ? 'Joining the guard' : 'Selected',
      progress,
      remainingDays,
      isRecruiting,
    };
  });
  const strength = companies.reduce((sum, company) => sum + company.strength, 0);
  const maxStrength = companies.reduce((sum, company) => sum + company.maxStrength, 0);
  const upkeep = companies.reduce((sum, company) => sum + (company.strength > 0 ? company.upkeep : 0), 0);
  const formGoldCost = companies.length > 0
    ? (unitById.get(companies[0].unitId)?.price ?? 340) * 2
    : 680;
  const formGoldSpent = hasGuard
    ? companies.reduce((sum, company, index) => {
      const unit = unitById.get(company.unitId);
      if (!unit) return sum;
      if (index === 0) return sum + unit.price * 2;
      return company.strength > 0 || company.isRecruiting ? sum + unit.price : sum;
    }, 0)
    : 0;
  const canEditComposition = !hasGuard && !isForming;
  const canForm = canEditComposition && companies.length > 0 && state.playerGold >= formGoldCost;
  return {
    eligible: true,
    hasGuard,
    canForm,
    isForming,
    formBlockReason: canForm
      ? ''
      : companies.length === 0
        ? 'Choose companies for the Personal Guard first.'
        : state.playerGold < formGoldCost
          ? `Needs ${formGoldCost - state.playerGold} more gold`
          : '',
    militaryId: hasGuard ? state.personalGuard.militaryId : '',
    name: `${rulerName}'s Guard`,
    provinceName: state.provinceMode ? provincePlayerFaction.name : playerFaction.name,
    commanderId: state.personalGuard.commanderId,
    commanderName: state.personalGuard.commanderId ? personProfile(state.personalGuard.commanderId).name : '',
    commanderTitle: 'Captain of the Guard',
    commanderPortrait: state.personalGuard.commanderId ? personProfile(state.personalGuard.commanderId).portrait : '',
    commanderPortraitLayers: state.personalGuard.commanderId
      ? mockPortraitLayers(personProfile(state.personalGuard.commanderId).portrait)
      : mockPortraitLayers(''),
    location: hasGuard ? 'Aurelion' : '',
    isAbroad: false,
    strength,
    maxStrength,
    companyCapacity,
    upkeep,
    formGoldCost,
    formGoldSpent,
    formDurationDays: isForming ? Math.max(12, companies.length * 12) : Math.max(0, (companies.length - 1) * 12),
    formRemainingDays: isForming
      ? Math.max(0, ...companies.filter(company => company.isRecruiting).map(company => company.remainingDays), 0)
      : 0,
    barbarianPopulation: 4200,
    barbarianCultureCount: 2,
    status: isForming ? 'Forming the standing guard' : hasGuard ? 'Standing' : '',
    companies,
    eligibleUnits,
    canEditComposition,
    formationRequirements: canEditComposition
      ? [{
        id: 'gold',
        name: 'Gold',
        context: '',
        iconPath: '/assets/icons/I_Coins.png',
        available: state.playerGold,
        required: formGoldCost,
        met: state.playerGold >= formGoldCost,
        description: 'Paid when the Personal Guard is established.',
      }]
      : [],
    companyEquipmentRequirements: [],
  };
}

function militaryOverview(): BridgeResponse<'game.get_military_overview'> {
  return {
    forces: [
      { id: MOCK_IDS.military, debugShortId: mockDebugShortId(MOCK_IDS.military), name: 'I Field Army', factionId: MOCK_IDS.playerFaction, parentId: '', rank: 'Dux', commanderName: 'Valen Arcastus', commanderId: MOCK_IDS.character, commanderDebugShortId: mockDebugShortId(MOCK_IDS.character), strength: 6800, maxStrength: 7600, morale: 84, supplyDays: 54, attrition: false, isNavy: false, isPersonalGuard: false, doctrine: 'concentrate', template: 'Balanced Field Army', location: 'Aurelion', currentOrder: 'Holding Aurelion', delegated: false, autoSquashRebels: true, isPlayerControlled: true, subordinateCount: 2, subordinateCapacity: 5 },
      { id: 'mock-military-detachment', debugShortId: mockDebugShortId('mock-military-detachment'), name: 'Aurelion Detachment', factionId: MOCK_IDS.playerFaction, parentId: MOCK_IDS.military, rank: 'Legatus', commanderName: 'Cassian Arcastus', commanderId: MOCK_IDS.heir, commanderDebugShortId: mockDebugShortId(MOCK_IDS.heir), strength: 1600, maxStrength: 1800, morale: 71, supplyDays: 43, attrition: false, isNavy: false, isPersonalGuard: false, doctrine: 'garrison', template: 'Balanced Field Army', location: 'Aurelion', currentOrder: 'Garrisoning Aurelion', delegated: true, autoSquashRebels: false, isPlayerControlled: true, subordinateCount: 0, subordinateCapacity: 0 },
      { id: 'mock-military-scouts', debugShortId: mockDebugShortId('mock-military-scouts'), name: 'Western Scouts', factionId: MOCK_IDS.playerFaction, parentId: MOCK_IDS.military, rank: 'Legatus', commanderName: 'Marcia Vennor', commanderId: MOCK_IDS.governor, commanderDebugShortId: mockDebugShortId(MOCK_IDS.governor), strength: 420, maxStrength: 520, morale: 68, supplyDays: 0, attrition: true, isNavy: false, isPersonalGuard: false, doctrine: 'screen', template: 'Light Border Screen', location: 'Berginian March', currentOrder: 'Screening the western road', delegated: true, autoSquashRebels: false, isPlayerControlled: true, subordinateCount: 0, subordinateCapacity: 0 },
      { id: MOCK_IDS.navy, debugShortId: mockDebugShortId(MOCK_IDS.navy), name: 'Classis Meridian', factionId: MOCK_IDS.playerFaction, parentId: '', rank: 'Praefectus', commanderName: 'Marcia Vennor', commanderId: MOCK_IDS.governor, commanderDebugShortId: mockDebugShortId(MOCK_IDS.governor), strength: 1800, maxStrength: 2200, morale: 76, supplyDays: 88, attrition: false, isNavy: true, isPersonalGuard: false, doctrine: 'screen', template: 'Coastal Patrol', location: 'Namaris', currentOrder: 'Patrolling Namaris', delegated: false, autoSquashRebels: false, isPlayerControlled: true, subordinateCount: 1, subordinateCapacity: 3 },
      { id: 'mock-navy-riverwatch', debugShortId: mockDebugShortId('mock-navy-riverwatch'), name: 'Riverwatch Flotilla', factionId: MOCK_IDS.playerFaction, parentId: MOCK_IDS.navy, rank: 'Legatus', commanderName: 'Severus Laco', commanderId: 'mock-person-tribune', commanderDebugShortId: mockDebugShortId('mock-person-tribune'), strength: 900, maxStrength: 1100, morale: 69, supplyDays: 61, attrition: false, isNavy: true, isPersonalGuard: false, doctrine: 'screen', template: 'River Patrol', location: 'Tavarii Ford', currentOrder: 'Watching the ford crossings', delegated: true, autoSquashRebels: false, isPlayerControlled: true, subordinateCount: 0, subordinateCapacity: 0 },
    ],
    foederati: [
      { id: 'mock-foederati-subject', factionId: MOCK_IDS.subjectFaction, factionName: 'Meridian Prefecture', factionColour: SUBJECT_COLOUR, factionSecondaryColour: SUBJECT_SECONDARY, factionEmblem: 'Rephsian_2', factionCultureGroup: 'Rephsian', rulerName: 'Iulia Seran', rulerId: 'mock-person-subject', rulerPortrait: FEMALE_PORTRAIT_1, rulerPortraitLayers: mockPortraitLayers(FEMALE_PORTRAIT_1), strength: 2400, availableStrength: 1800, activeStrength: 600, isCalledUp: true, compliance: 72, canCall: true },
      { id: 'mock-foederati-river', factionId: 'mock-faction-river-marches', factionName: 'River Marches', factionColour: '#6E4B76', factionSecondaryColour: '#D8C27A', factionEmblem: 'Rephsian_3', factionCultureGroup: 'Rephsian', rulerName: 'Oren Tullus', rulerId: 'mock-person-march-lord', rulerPortrait: MALE_PORTRAIT_2, rulerPortraitLayers: mockPortraitLayers(MALE_PORTRAIT_2), strength: 1800, availableStrength: 1400, activeStrength: 0, isCalledUp: false, compliance: 55, canCall: true },
    ],
    totalArmyStrength: 8820,
    totalArmyMaxStrength: 9920,
    totalNavyStrength: 2700,
    totalNavyMaxStrength: 3300,
    totalShips: 26,
    totalMaxShips: 30,
    commandMaintenance: 44,
    autoAssignCommandsEnabled: true,
    autoReplenishFormationsEnabled: true,
  };
}

function selectedMilitaries(): BridgeResponse<'game.get_selected_militaries'> {
  return {
    militaries: militaryOverview().forces.slice(0, 3),
  };
}

function powerBlocs(gameDay: number): BridgeResponse<'game.get_power_blocs'> {
  return {
    canFormPersonalBloc: true,
    formPersonalBlocReason: '',
    blocs: [
      {
        id: MOCK_IDS.powerBloc,
        debugShortId: mockDebugShortId(MOCK_IDS.powerBloc),
        name: 'Palace Council',
        type: 'Court',
        subtype: 'Institutional',
        iconKey: 'SenatorialAristocracyBloc',
        description: 'Senior families and office holders who expect patronage, appointments, and public deference.',
        leaderId: MOCK_IDS.governor,
        leaderDebugShortId: mockDebugShortId(MOCK_IDS.governor),
        leaderName: 'Marcia Vennor',
        memberCount: 9,
        happiness: 46,
        strength: 62,
        imperialStrength: 42,
        escalationStage: 2,
        unhappyDays: 38,
        failedDemandCount: 1,
        canPlayerJoin: true,
        canPlayerJoinReason: '',
        playerIsMember: false,
        goals: [
          { name: 'Protect offices', description: 'Keep senior posts in established hands.', breakdown: 'Only two of five senior offices are held by established families.', weight: 0.5, satisfaction: 42 },
          { name: 'Fund ceremonies', description: 'Spend gold on legitimacy and public rites.', breakdown: 'Recent public ceremonies offset some anger over reduced court spending.', weight: 0.3, satisfaction: 58 },
          { name: 'Court patronage', description: 'Reserve offices and favours for recognised households.', breakdown: 'The current court policy gives more posts to outsiders than the bloc wants.', weight: 0.45, satisfaction: 32 },
          { name: 'Governor seats', description: 'Keep provincial appointments friendly to the palace.', breakdown: 'Most current governors are acceptable to the council.', weight: 0.25, satisfaction: 65 },
        ],
        members: [
          { id: MOCK_IDS.governor, debugShortId: mockDebugShortId(MOCK_IDS.governor), name: 'Marcia Vennor', role: 'Governor', affiliation: 'Lyrion', influence: 81, loyalty: 62, isLeader: true },
          { id: 'mock-person-subject', debugShortId: mockDebugShortId('mock-person-subject'), name: 'Iulia Seran', role: 'Prefect', affiliation: 'Meridian Prefecture', influence: 72, loyalty: 55, isLeader: false },
          { id: MOCK_IDS.heir, debugShortId: mockDebugShortId(MOCK_IDS.heir), name: 'Cassian Arcastus', role: 'Heir', affiliation: 'Imperial Court', influence: 69, loyalty: 60, isLeader: false },
          { id: 'mock-person-steward', debugShortId: mockDebugShortId('mock-person-steward'), name: 'Claudia Varra', role: 'Steward', affiliation: 'Imperial Court', influence: 58, loyalty: 69, isLeader: false },
          { id: 'mock-person-envoy', debugShortId: mockDebugShortId('mock-person-envoy'), name: 'Decima Nerva', role: 'Envoy', affiliation: 'Aurestian League', influence: 54, loyalty: 66, isLeader: false },
          { id: 'mock-person-notary', debugShortId: mockDebugShortId('mock-person-notary'), name: 'Gaius Pelor', role: 'Notary', affiliation: 'Imperial Court', influence: 47, loyalty: 61, isLeader: false },
          { id: 'mock-person-advocate', debugShortId: mockDebugShortId('mock-person-advocate'), name: 'Flavia Merula', role: 'Advocate', affiliation: 'Rephsian', influence: 46, loyalty: 59, isLeader: false },
          { id: 'mock-person-spy', debugShortId: mockDebugShortId('mock-person-spy'), name: 'Vibius Celer', role: 'Agent', affiliation: 'River Marches', influence: 42, loyalty: 57, isLeader: false },
          { id: 'mock-person-tribune', debugShortId: mockDebugShortId('mock-person-tribune'), name: 'Severus Laco', role: 'Tribune', affiliation: 'Palace Guard', influence: 39, loyalty: 62, isLeader: false },
        ],
        contentModifiers: [],
        unhappyModifiers: [
          { label: 'Tax Income', value: '-1%', isPositive: false },
        ],
        hasActiveDemand: true,
        activeDemand: {
          title: 'Restore Court Patronage',
          description: 'Increase court patronage policy before the council turns openly hostile.',
          issuedDate: gameDay - 43,
          deadlineDate: gameDay + 47,
          daysRemaining: 47,
          totalDays: 90,
          progress: 42,
          progressLabel: 'Policy adjustment underway',
        },
      },
      {
        id: 'mock-bloc-frontier',
        debugShortId: mockDebugShortId('mock-bloc-frontier'),
        name: 'Frontier Officers',
        type: 'Military',
        subtype: 'Command',
        iconKey: 'MilitaryEstablishmentBloc',
        description: 'Commanders and veteran households pressing for pay, supplies, and decisive campaigns.',
        leaderId: MOCK_IDS.character,
        leaderDebugShortId: mockDebugShortId(MOCK_IDS.character),
        leaderName: 'Valen Arcastus',
        memberCount: 14,
        happiness: 63,
        strength: 54,
        imperialStrength: 38,
        escalationStage: 1,
        unhappyDays: 12,
        failedDemandCount: 0,
        canPlayerJoin: false,
        canPlayerJoinReason: 'Your ruler has no military command, battle record, or martial reputation tying them to the Legions.',
        playerIsMember: false,
        goals: [
          { name: 'Fund armies', description: 'Keep field forces paid and supplied.', breakdown: 'Army funding is adequate, but frontier supply remains uneven.', weight: 0.6, satisfaction: 64 },
          { name: 'Win the pass', description: 'End the western war on favourable terms.', breakdown: 'The war is still unresolved, so commanders are only partly satisfied.', weight: 0.4, satisfaction: 48 },
        ],
        members: [
          { id: MOCK_IDS.character, debugShortId: mockDebugShortId(MOCK_IDS.character), name: 'Valen Arcastus', role: 'Commander', affiliation: 'Western Field Army', influence: 86, loyalty: 74, isLeader: true },
          { id: 'mock-person-march-lord', debugShortId: mockDebugShortId('mock-person-march-lord'), name: 'Oren Tullus', role: 'March Lord', affiliation: 'River Marches', influence: 61, loyalty: 55, isLeader: false },
          { id: MOCK_IDS.heir, debugShortId: mockDebugShortId(MOCK_IDS.heir), name: 'Cassian Arcastus', role: 'Tribune', affiliation: 'Imperial Court', influence: 53, loyalty: 60, isLeader: false },
        ],
        contentModifiers: [
          { label: 'Army Effectiveness', value: '+5%', isPositive: true },
        ],
        unhappyModifiers: [],
        hasActiveDemand: false,
        activeDemand: {
          title: '',
          description: '',
          issuedDate: 0,
          deadlineDate: 0,
          daysRemaining: 0,
          totalDays: 0,
          progress: 0,
          progressLabel: '',
        },
      },
    ],
  };
}

function settingsResponse(): BridgeResponse<'game.get_settings'> {
  return {
    video: { resolutionX: 1920, resolutionY: 1080, windowMode: 'Windowed', vsync: true, frameRateLimit: 120, resolutionScale: 100, dlssMode: 'Off', antiAliasing: 'High', gamma: 1, brightness: 1 },
    audio: { master: 80, music: 65, effects: 75, ui: 75, ambience: 70 },
    gameplay: { cameraPanSpeed: 1, cameraZoomSpeed: 1, cameraRotationSpeed: 1, edgeScrolling: true, invertZoom: false, pauseOnNotifications: 'Important', autoResumeOnDismiss: false, advisorFrequency: 2, llmProvider: 'Scripted', localLlmModel: '', eventFrequency: 2, includeSaveInCrashReport: false, cursorScale: 1, uiScale: 1, glanceScale: 1.2, uiScrollSpeed: 1, tooltipDelaySeconds: 0.45, notificationDurationMultiplier: 1, reduceMotion: false, consoleEnabled: true, saveFrequency: 'Monthly', autosaveSlotCount: 3, difficulty: 'Normal', mutedNotificationTypes: [] },
    graphics: { textureQuality: 3, shadowQuality: 3, effectsQuality: 3, foliageQuality: 3, shadingQuality: 3, viewDistanceQuality: 3, showProvinceBorders: true, showFpsCounter: false, showSettlementGlances: true, showMilitaryGlances: true, showConvoyGlances: true, glanceDensity: 'Normal' },
    notifications: [
      { id: 'settlement', label: 'Settlement', description: 'Settlement warnings and events.', category: 'settlement', muted: false },
      { id: 'military', label: 'Military', description: 'Army and battle updates.', category: 'military', muted: false },
    ],
    controls: [
      { index: 0, isAxis: false, scale: 0, actionName: 'Pause', label: 'Pause', category: 'gameSpeed', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'SpaceBar', keyDisplay: 'Space', glyphId: '', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 1, isAxis: false, scale: 0, actionName: 'Pause', label: 'Pause', category: 'gameSpeed', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_Special_Right', keyDisplay: 'Menu Button', glyphId: 'gamepad_menu', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 2, isAxis: false, scale: 0, actionName: 'Select', label: 'Select', category: 'selection', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_FaceButton_Bottom', keyDisplay: 'A Button', glyphId: 'gamepad_a', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 3, isAxis: false, scale: 0, actionName: 'Command', label: 'Command', category: 'selection', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_FaceButton_Left', keyDisplay: 'X Button', glyphId: 'gamepad_x', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 4, isAxis: false, scale: 0, actionName: 'SelectAllMilitaries', label: 'Select All Military', category: 'selection', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'A', keyDisplay: 'A', glyphId: '', shift: false, ctrl: true, alt: false, cmd: false },
      { index: 5, isAxis: false, scale: 0, actionName: 'WorldSearch', label: 'World Search', category: 'system', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'F', keyDisplay: 'F', glyphId: '', shift: false, ctrl: true, alt: false, cmd: false },
      { index: 6, isAxis: false, scale: 0, actionName: 'WorldSearch', label: 'World Search', category: 'system', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_LeftThumbstick', keyDisplay: 'Left Stick Click', glyphId: 'gamepad_ls', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 7, isAxis: false, scale: 0, actionName: 'OpenScreensMenu', label: 'Open Screens', category: 'screens', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_DPad_Up', keyDisplay: 'D-Pad Up', glyphId: 'gamepad_dpad_up', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 8, isAxis: false, scale: 0, actionName: 'OpenMapModes', label: 'Open Map Modes', category: 'mapModes', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_DPad_Down', keyDisplay: 'D-Pad Down', glyphId: 'gamepad_dpad_down', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 12, isAxis: false, scale: 0, actionName: 'OpenEscapeMenu', label: 'Open Menu', category: 'system', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_FaceButton_Right', keyDisplay: 'B Button', glyphId: 'gamepad_b', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 13, isAxis: false, scale: 0, actionName: 'ReduceSpeed', label: 'Decrease Speed', category: 'gameSpeed', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_DPad_Left', keyDisplay: 'D-Pad Left', glyphId: 'gamepad_dpad_left', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 14, isAxis: false, scale: 0, actionName: 'IncreaseSpeed', label: 'Increase Speed', category: 'gameSpeed', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_DPad_Right', keyDisplay: 'D-Pad Right', glyphId: 'gamepad_dpad_right', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 9, isAxis: false, scale: 0, actionName: 'MapMode_AdminDomain', label: 'Map: Administrative Domains', category: 'mapModes', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Three', keyDisplay: '3', glyphId: '', shift: false, ctrl: true, alt: false, cmd: false },
      { index: 10, isAxis: false, scale: 0, actionName: 'MapMode_Factions', label: 'Map: Factions', category: 'mapModes', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'F', keyDisplay: 'F', glyphId: '', shift: true, ctrl: true, alt: false, cmd: false },
      { index: 11, isAxis: false, scale: 0, actionName: 'MapMode_Factions', label: 'Map: Factions', category: 'mapModes', groupName: '', groupLabel: '', groupItemLabel: '', keyName: 'Gamepad_DPad_Left', keyDisplay: 'D-Pad Left', glyphId: 'gamepad_dpad_left', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 0, isAxis: true, scale: 1, actionName: 'MoveForward', label: 'Move Forward', category: 'camera', groupName: 'CameraMovement', groupLabel: 'Movement', groupItemLabel: 'Forward', keyName: 'W', keyDisplay: 'W', glyphId: '', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 1, isAxis: true, scale: -1, actionName: 'MoveForward', label: 'Move Backward', category: 'camera', groupName: 'CameraMovement', groupLabel: 'Movement', groupItemLabel: 'Back', keyName: 'S', keyDisplay: 'S', glyphId: '', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 2, isAxis: true, scale: 1, actionName: 'MoveForward', label: 'Move Forward', category: 'camera', groupName: 'CameraMovement', groupLabel: 'Movement', groupItemLabel: 'Forward', keyName: 'Gamepad_LeftY', keyDisplay: 'Left Stick', glyphId: 'gamepad_lstick', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 3, isAxis: true, scale: 1, actionName: 'MoveRight', label: 'Move Right', category: 'camera', groupName: 'CameraMovement', groupLabel: 'Movement', groupItemLabel: 'Right', keyName: 'D', keyDisplay: 'D', glyphId: '', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 4, isAxis: true, scale: -1, actionName: 'MoveRight', label: 'Move Left', category: 'camera', groupName: 'CameraMovement', groupLabel: 'Movement', groupItemLabel: 'Left', keyName: 'A', keyDisplay: 'A', glyphId: '', shift: false, ctrl: false, alt: false, cmd: false },
      { index: 5, isAxis: true, scale: 1, actionName: 'MoveRight', label: 'Move Right', category: 'camera', groupName: 'CameraMovement', groupLabel: 'Movement', groupItemLabel: 'Right', keyName: 'Gamepad_LeftX', keyDisplay: 'Left Stick', glyphId: 'gamepad_lstick', shift: false, ctrl: false, alt: false, cmd: false },
    ],
    availableLlmModels: [
      { filename: 'Small.gguf', title: 'Small', description: 'A 4B-parameter model with heavy quantisation. Faster and lighter, suitable for systems with less VRAM.', vramRequirement: '3 GB', vramRequirementMB: 3000, ramRequirementMB: 6000, iconPath: '/assets/icons/Models/T_Events_Small.png', hasMetadata: true, installed: true, downloadUrl: '' },
      { filename: 'Medium.gguf', title: 'Medium', description: 'A 4B-parameter model with medium quantisation. Generates varied and contextual events with good quality.', vramRequirement: '4 GB', vramRequirementMB: 4000, ramRequirementMB: 8000, iconPath: '/assets/icons/Models/T_Events_Medium.png', hasMetadata: true, installed: true, downloadUrl: '' },
      { filename: 'Large.gguf', title: 'Large', description: 'A 9B-parameter model with medium quantisation. Highest quality events with the most varied and nuanced writing.', vramRequirement: '11 GB', vramRequirementMB: 11000, ramRequirementMB: 16000, iconPath: '/assets/icons/Models/T_Events_Large.png', hasMetadata: true, installed: false, downloadUrl: 'https://store.steampowered.com/app/4453450' },
    ],
    hardware: { videoMemoryMB: 8192, systemMemoryMB: 32768 },
    supportedResolutions: ['1280x720', '1920x1080', '2560x1440'],
    dlssSupported: false,
    upscalingTechnology: 'TSR',
    activeInputDevice: new URLSearchParams(window.location.search).get('input') === 'gamepad' ? 'gamepad' : 'keyboard',
  };
}

function courtCandidates() {
  return {
    candidates: [MOCK_IDS.heir, MOCK_IDS.governor].map(id => {
      const person = personById(id);
      return {
        id: person.id,
        name: person.name,
        title: person.title,
        portrait: person.portrait,
        portraitLayers: person.portraitLayers,
        age: person.age,
        activity: person.activity,
        tactics: person.stats.tactics,
        authority: person.stats.authority,
        cunning: person.stats.cunning,
        governance: person.stats.governance,
        loyalty: person.stats.loyalty,
        constitution: person.stats.constitution,
        fame: person.fame,
        currentPositionKey: '',
        currentBishopricLandName: '',
        traits: person.traits.map(t => ({ id: t.id, name: t.name, description: t.description, isPositive: t.isPositive })),
      };
    }),
  };
}

const NO_PEACE_SETTLEMENT_TARGET = {
  targetSettlementIds: [] as string[],
  settlementSummary: '',
  settlementCount: 0,
  replacementRulerId: '',
  replacementCandidates: [] as BridgeResponse<'game.get_peace_negotiation_state'>['availableTerms'][number]['replacementCandidates'],
};

function peaceReplacementCandidate(id: string): BridgeResponse<'game.get_peace_negotiation_state'>['availableTerms'][number]['replacementCandidates'][number] {
  const person = personById(id);
  return {
    id: person.id,
    name: person.name,
    title: person.title || person.shortTitle,
    portrait: person.portrait,
    portraitLayers: person.portraitLayers,
    age: person.age,
    authority: person.stats.authority,
    governance: person.stats.governance,
    fame: person.fame,
  };
}

function peaceState(): BridgeResponse<'game.get_peace_negotiation_state'> {
  const player = { ...playerFactionReference(), rulerId: MOCK_IDS.character, rulerName: 'Valen Arcastus', strength: 18400, gold: 4280, settlements: 14 };
  const rival = { ...rivalFactionReference(), rulerId: 'mock-person-rival', rulerName: 'Soran Velk', strength: 9100, gold: 1130, settlements: 7 };
  const subject = { ...subjectFactionReference(), rulerId: 'mock-person-subject', rulerName: 'Iulia Seran', strength: 3600, gold: 690, settlements: 4 };
  const saltLeague = { id: 'mock-faction-salt-league', name: 'Salt League', colour: '#8A6930', secondaryColour: '#CFC4AA', cultureGroup: 'Aurestian', emblem: 'Aurestian_2', rulerId: 'mock-person-salt-leader', rulerName: 'Nera Solun', strength: 4200, gold: 820, settlements: 5 };
  const rivalReplacementCandidates = [peaceReplacementCandidate('mock-person-salt-leader'), peaceReplacementCandidate('mock-person-subject')];
  return {
    found: true,
    targetFactionId: MOCK_IDS.rivalFaction,
    warId: 'mock-war-rival',
    warName: 'War for the Western Passes',
    warDurationDays: 142,
    battlesFought: 3,
    settlementsCaptured: 1,
    isWarLeader: true,
    isRebellionWar: false,
    amountStep: 50,
    durationOptionsDays: [336, 672, 1680, 3360],
    playerFaction: player,
    targetFaction: rival,
    ourParticipants: [
      { faction: player, isLeader: true, isEnemySide: false },
      { faction: subject, isLeader: false, isEnemySide: false },
    ],
    theirParticipants: [
      { faction: rival, isLeader: true, isEnemySide: true },
      { faction: saltLeague, isLeader: false, isEnemySide: true },
    ],
    terms: [],
    availableTerms: [
      { optionId: 'demand:onetime_tribute:mock-faction-rival:', type: 'onetime_tribute', direction: 'demand', label: 'Demand indemnity', description: 'Demand gold for ending the war.', targetFactionId: MOCK_IDS.rivalFaction, targetFactionName: 'Aurestian League', vassalFactionId: '', vassalFactionName: '', defaultTributeAmount: 400, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
      { optionId: 'demand:ongoing_tribute:mock-faction-rival:', type: 'ongoing_tribute', direction: 'demand', label: 'Demand tribute', description: 'Demand regular tribute after the peace.', targetFactionId: MOCK_IDS.rivalFaction, targetFactionName: 'Aurestian League', vassalFactionId: '', vassalFactionName: '', defaultTributeAmount: 120, defaultTributeDurationDays: 3650, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
      { optionId: 'demand:release_vassal:mock-faction-rival:mock-faction-salt-league', type: 'release_vassal', direction: 'demand', label: 'Release: Salt League', description: 'Force the target to release this subject.', targetFactionId: MOCK_IDS.rivalFaction, targetFactionName: 'Aurestian League', vassalFactionId: 'mock-faction-salt-league', vassalFactionName: 'Salt League', defaultTributeAmount: 0, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
      { optionId: 'demand:release_vassal:mock-faction-rival:mock-faction-pass-wardens', type: 'release_vassal', direction: 'demand', label: 'Release: Pass Wardens', description: 'Force the target to release this subject.', targetFactionId: MOCK_IDS.rivalFaction, targetFactionName: 'Aurestian League', vassalFactionId: 'mock-faction-pass-wardens', vassalFactionName: 'Pass Wardens', defaultTributeAmount: 0, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
      { optionId: 'demand:demand_vassalization:mock-faction-rival:', type: 'demand_vassalization', direction: 'demand', label: 'Demand subjugation', description: 'Force the target to become your subject.', targetFactionId: MOCK_IDS.rivalFaction, targetFactionName: 'Aurestian League', vassalFactionId: '', vassalFactionName: '', defaultTributeAmount: 0, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
      { optionId: 'demand:replace_ruler:mock-faction-rival:', type: 'replace_ruler', direction: 'demand', label: 'Replace Ruler', description: 'Force the target ruler from power.', targetFactionId: MOCK_IDS.rivalFaction, targetFactionName: 'Aurestian League', vassalFactionId: '', vassalFactionName: '', defaultTributeAmount: 0, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET, replacementRulerId: rivalReplacementCandidates[0].id, replacementCandidates: rivalReplacementCandidates },
      { optionId: 'concession:onetime_tribute:mock-faction-player:', type: 'onetime_tribute', direction: 'concession', label: 'Offer gold', description: 'Offer gold to make peace more acceptable.', targetFactionId: MOCK_IDS.playerFaction, targetFactionName: 'Rephsian Empire', vassalFactionId: '', vassalFactionName: '', defaultTributeAmount: 300, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
      { optionId: 'concession:release_vassal:mock-faction-player:mock-faction-subject', type: 'release_vassal', direction: 'concession', label: 'Release: Meridian Prefecture', description: 'Release one of your subjects as part of the treaty.', targetFactionId: MOCK_IDS.playerFaction, targetFactionName: 'Rephsian Empire', vassalFactionId: MOCK_IDS.subjectFaction, vassalFactionName: 'Meridian Prefecture', defaultTributeAmount: 0, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
      { optionId: 'white-peace', type: 'white_peace', direction: 'neutral', label: 'White peace', description: 'End the war without concessions.', targetFactionId: MOCK_IDS.rivalFaction, targetFactionName: 'Aurestian League', vassalFactionId: '', vassalFactionName: '', defaultTributeAmount: 0, defaultTributeDurationDays: 0, isSelected: false, ...NO_PEACE_SETTLEMENT_TARGET },
    ],
    preview: { currentWarScore: 18, demandCost: 0, concessionCost: 0, netCostForPlayer: 0, acceptanceScore: 12, verdict: 'possible', verdictLabel: 'Possible', canSubmit: true, blockedReason: '', breakdown: 'War score and limited funds make a modest settlement possible.', warScoreBreakdown: [
      { label: 'Battles', score: 12, eventCount: 3, isOurs: true, depth: 0 },
      { label: 'Occupied settlements', score: 6, eventCount: 1, isOurs: true, depth: 0 },
    ] },
    emptyReason: '',
  };
}

const MOCK_FORMATION_UNIT_PORTRAITS: Record<string, string> = {
  limitanei: '/assets/units/Rephsian/I_Rephsian_Limitanei.png',
  clibanarii: '/assets/units/Rephsian/I_Equites_Clibanarii.png',
};

const MOCK_FORMATION_UNIT_TYPE_LABELS: Record<string, string> = {
  infantry: 'Infantry',
  cavalry: 'Cavalry',
  ranged: 'Ranged',
  siege: 'Siege',
  special: 'Special',
  scout: 'Scout',
  transport: 'Transport',
  galley: 'Galley',
  trireme: 'Trireme',
  quinquereme: 'Quinquereme',
  navy: 'Navy',
  naval: 'Navy',
  other: 'Other',
};

function formationResourceCost(name: string, amount: number) {
  return {
    name,
    displayName: name,
    description: `${name} fixture resource description.`,
    effects: `${name} fixture resource effect.`,
    amount,
  };
}

let mockInitialSetupCompleted = false;

function formationUnit(id: string, name: string, type: string, category: string, count: number, maxStrength: number, includesCore = false, culture = rephsianCulture) {
  return {
    id,
    name,
    description: `${name} fixture entry for formation template lists.`,
    portrait: MOCK_FORMATION_UNIT_PORTRAITS[id] ?? (category === 'naval' ? '/assets/events/naval-battle.png' : '/assets/units/Rephsian/I_Rephsian_Limitanei.png'),
    includesCore,
    type,
    unitTypeLabel: MOCK_FORMATION_UNIT_TYPE_LABELS[type] ?? MOCK_FORMATION_UNIT_TYPE_LABELS.other,
    category,
    battleRole: type === 'siege' ? 'siege' : (type === 'ranged' || id === 'dromons' ? 'ranged' : 'melee'),
    cultureId: culture.id,
    cultureName: culture.name,
    cultureColour: culture.colour,
    tier: category === 'naval' ? 2 : 3,
    count,
    maxStrength,
    price: category === 'naval' ? 260 : 340,
    buildTimeDays: category === 'naval' ? 70 : 80,
    upkeep: category === 'naval' ? 34 : 42,
    foodConsumption: category === 'naval' ? 10 : 18,
    resourceCost: [formationResourceCost('Iron', 12), formationResourceCost('Wood', 20)],
    monthlyConsumption: [formationResourceCost('Grain', category === 'naval' ? 2 : 4)],
    speed: category === 'naval' ? 180 : 170,
    attackSpeed: type === 'cavalry' ? 0.6 : type === 'siege' ? 0.25 : 0.5,
    range: type === 'ranged' || type === 'siege' || id === 'dromons' ? 220 : 0,
    siegePower: type === 'siege' ? 12 : 0,
    pierceDamage: type === 'ranged' ? 16 : 12,
    crushDamage: type === 'siege' ? 30 : 8,
    slashDamage: type === 'cavalry' ? 18 : 10,
    pierceArmour: type === 'cavalry' ? 8 : 6,
    crushArmour: type === 'siege' ? 10 : 5,
    slashArmour: type === 'infantry' ? 9 : 6,
    immuneToWinterAttrition: false,
    immuneToDesertAttrition: false,
    canAttackWhileMoving: type === 'ranged' && id.includes('horse'),
    availableSettlementCount: 2,
    availableSettlements: category === 'naval'
      ? [{ id: 'mock-settlement-namaris', name: 'Namaris', available: true }, { id: 'mock-settlement-harbour-watch', name: 'Harbour Watch', available: true }]
      : [{ id: 'mock-settlement-aurelion', name: 'Aurelion', available: true }, { id: 'mock-settlement-rephsia', name: 'Rephsia', available: true }],
    availableManpower: Math.max(maxStrength * 8, 400),
    upgradeUnitId: '',
    downgradeUnitId: '',
  };
}

function battleAction(id: string, name: string, isActive = false) {
  return {
    id,
    name,
    description: `${name} order for the mock battle.`,
    iconId: id === 'shield-wall' ? 'BattleActions/I_NorthernShieldWall' : id === 'press' ? 'BattleActions/I_InfantryCharge' : 'BattleActions/I_Rally',
    requiredTactics: 4,
    requiredAuthority: 4,
    damageMultiplier: isActive ? 1.15 : 1,
    damageTakenMultiplier: 1,
    armourMultiplier: 1,
    moraleModifier: isActive ? 0.08 : 0,
    speedMultiplier: 1,
    canActivate: !isActive,
    isActive,
    disabledReason: '',
  };
}

function battleParticipant(id: string, name: string, commander: string, commanderId: string, faction: MockFactionReference & { relation: string }, strength: number, maxStrength: number, morale: number, isPlayerControlled: boolean) {
  return {
    id,
    name,
    commander,
    commanderId,
    faction,
    strength,
    maxStrength,
    manpower: strength,
    losses: maxStrength - strength,
    morale,
    tier: 2,
    isNavy: false,
    isPlayerControlled,
    canRetreat: true,
    currentOrder: isPlayerControlled ? 'Holding line' : 'Pressing attack',
  };
}

function battleFormationAgents(
  unitType: string,
  side: string,
  strength: number,
  positionX: number,
  positionY: number,
  targetFormationId: string,
): BattleFormationAgentState[] {
  const columns = unitType === 'siege' ? 2 : unitType === 'cavalry' ? 3 : 4;
  const spacing = unitType === 'siege' ? 30 : unitType === 'cavalry' ? 22 : 18;
  const count = Math.max(4, Math.min(24, Math.round(strength / (unitType === 'siege' ? 55 : 80))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const advance = side === 'attacker' ? 1 : -1;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const lateralOffset = (column - (columns - 1) / 2) * spacing;
    const depthOffset = (row - (rows - 1) / 2) * spacing;

    return {
      x: positionX + lateralOffset,
      y: positionY + depthOffset,
      velocityX: 0,
      velocityY: advance * 10,
      inMelee: false,
      detached: false,
      targetFormationId,
    };
  });
}

function battleFormationDetail(
  id: string,
  name: string,
  side: string,
  faction: MockFactionReference & { relation: string },
  unitType: string,
  unitTypeLabel: string,
  strength: number,
  maxStrength: number,
  x: number,
  y: number,
  isPlayerControlled: boolean,
  stance: string,
  stanceLabel: string,
  targetFormationId = '',
  targetFormationName = '',
): BattleFormationDetail {
  const healthPercent = maxStrength > 0 ? strength / maxStrength : 0;
  const moraleBase = side === 'attacker' ? 52 : 68;
  const morale = Math.round(Math.max(12, Math.min(95, moraleBase + (healthPercent - 0.75) * 40)));
  const isRouting = morale < 18 || healthPercent < 0.2;
  const positionX = 2000 * x / 100;
  const positionY = 2000 * y / 100;
  const agents = battleFormationAgents(unitType, side, strength, positionX, positionY, targetFormationId);
  const unitCount = Math.max(1, Math.min(10, Math.round(maxStrength / 100)));
  const baseUnitStrength = Math.floor(strength / unitCount);
  const strengthRemainder = strength % unitCount;
  const baseUnitMaxStrength = Math.floor(maxStrength / unitCount);
  const maxStrengthRemainder = maxStrength % unitCount;
  const units = Array.from({ length: unitCount }, (_, index) => ({
    id: `${id}:unit:${index}`,
    name,
    description: '',
    portrait: '',
    strength: baseUnitStrength + (index < strengthRemainder ? 1 : 0),
    maxStrength: baseUnitMaxStrength + (index < maxStrengthRemainder ? 1 : 0),
  }));
  const attackRange = unitType === 'ranged' ? 280 : unitType === 'siege' ? 360 : 70;
  const minimumAttackRange = unitType === 'ranged' ? 70 : unitType === 'siege' ? 144 : 0;
  return {
    id,
    name,
    side,
    militaryId: side === 'attacker' ? 'mock-military-rebel-host' : MOCK_IDS.military,
    militaryName: side === 'attacker' ? 'Berginian Rebellion' : 'Imperial Rephsia',
    faction,
    unitType,
    unitTypeLabel,
    strength,
    maxStrength,
    losses: maxStrength - strength,
    healthPercent,
    morale,
    recentCasualtyPressure: side === 'attacker' ? 0.084 : 0.032,
    stance,
    stanceLabel,
    positionX,
    positionY,
    rotation: side === 'attacker' ? 180 : 0,
    zIndex: side === 'attacker' ? 10 : 12,
    speed: unitType === 'cavalry' ? 7 : unitType === 'siege' ? 2 : 4,
    attackSpeed: unitType === 'cavalry' ? 0.6 : unitType === 'siege' ? 0.25 : 0.5,
    attackRange,
    minimumAttackRange,
    collisionRadius: Math.min(25, Math.max(4, 1 + Math.sqrt(maxStrength / 100))),
    attackChargePercent: unitType === 'cavalry' ? 0.78 : 0.32,
    attackSequence: 0,
    hasManualTarget: false,
    isRouting,
    isWithdrawing: false,
    agentCount: agents.length,
    shipCount: unitType === 'naval' ? units.length : 0,
    targetFormationId,
    targetFormationName,
    activeActionId: isPlayerControlled && unitType === 'infantry' ? 'shield-wall' : '',
    activeActionName: isPlayerControlled && unitType === 'infantry' ? 'Shield Wall' : '',
    isPlayerControlled,
    isCommandable: isPlayerControlled,
    units,
    waypoints: side === 'attacker' && unitType === 'cavalry' ? [{ x: 2000 * (x + (x < 50 ? 8 : -8)) / 100, y: 2000 * (y + 14) / 100 }] : [],
    actions: isPlayerControlled ? [battleAction('shield-wall', 'Shield Wall', unitType === 'infantry'), battleAction('press', 'Press Forward'), battleAction('rally', 'Rally Troops')] : [],
  };
}

function battlefieldObstacleDetail(
  id: string,
  type: string,
  centreX: number,
  centreY: number,
  width: number,
  height: number,
  rotation: number,
  blocksMovement: boolean,
  movementSpeedMultiplier: number,
  cavalryMovementSpeedMultiplier: number,
  damageDealtMultiplier: number,
  damageTakenMultiplier: number,
  rangedIncomingDamageMultiplier: number,
): BattlefieldObstacleDetail {
  return {
    id,
    type,
    centreX,
    centreY,
    width,
    height,
    rotation,
    blocksMovement,
    movementSpeedMultiplier,
    cavalryMovementSpeedMultiplier,
    damageDealtMultiplier,
    damageTakenMultiplier,
    rangedIncomingDamageMultiplier,
  };
}

function mockBattlefieldHeightMap(columns: number, rows: number): BattlefieldHeightPointDetail[] {
  const heights: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = columns > 1 ? column / (columns - 1) : 0;
      const y = rows > 1 ? row / (rows - 1) : 0;
      const ridge = Math.sin((x * 2.8 + y * 1.1) * Math.PI) * 0.18;
      const hollow = Math.cos((y * 3.4 - x * 1.6) * Math.PI) * 0.12;
      const flank = (x - 0.5) * 0.1;
      heights.push(Math.max(0.04, Math.min(0.96, 0.48 + ridge + hollow + flank)));
    }
  }

  return heights.map((height, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = Math.max(0, column - 1);
    const right = Math.min(columns - 1, column + 1);
    const top = Math.max(0, row - 1);
    const bottom = Math.min(rows - 1, row + 1);
    const dx = (heights[row * columns + right] - heights[row * columns + left]) * 0.5;
    const dy = (heights[bottom * columns + column] - heights[top * columns + column]) * 0.5;
    return {
      height,
      slope: Math.max(0, Math.min(1, Math.sqrt(dx * dx + dy * dy) * 3)),
    };
  });
}

function mockOutcomeHistory(defeat = false) {
  const base = [
    { label: '742', settlements: 14, population: 1284000 },
    { label: '746', settlements: 12, population: 1160000 },
    { label: '751', settlements: 16, population: 1390000 },
    { label: '758', settlements: 21, population: 1740000 },
    { label: '764', settlements: 26, population: 2100000 },
    { label: '771', settlements: 30, population: 2420000 },
    { label: '778', settlements: 34, population: 2680000 },
    { label: '784', settlements: 38, population: 3010000 },
  ];

  if (!defeat) return base;

  return [
    { label: '742', settlements: 14, population: 1284000 },
    { label: '746', settlements: 12, population: 1160000 },
    { label: '751', settlements: 16, population: 1390000 },
    { label: '758', settlements: 21, population: 1740000 },
    { label: '764', settlements: 26, population: 2100000 },
    { label: '771', settlements: 17, population: 1320000 },
    { label: '778', settlements: 8, population: 690000 },
    { label: '784', settlements: 2, population: 240000 },
  ];
}

function mockOutcomeRulers(defeat = false) {
  return {
    currentRuler: {
      id: MOCK_IDS.character,
      name: 'Valen Arcastus',
      title: 'Dominus of the Rephsian Empire',
      reign: '711 - 784',
      battlesWon: defeat ? 11 : 18,
      battlesLost: defeat ? 8 : 2,
      fate: defeat ? 'Final ruler of the campaign.' : 'Brought the restoration wars to an end.',
      portrait: MALE_PORTRAIT_1,
      portraitLayers: mockPortraitLayers(MALE_PORTRAIT_1, defeat),
      isImprisoned: defeat,
    },
    previousRulers: [
      {
        id: 'mock-person-previous-ruler',
        name: 'Aurelian Arcastus',
        title: 'Former Dominus',
        reign: '681 - 711',
        battlesWon: 12,
        battlesLost: 3,
        fate: 'Held the capital through the first succession crisis.',
        portrait: MALE_PORTRAIT_2,
        portraitLayers: mockPortraitLayers(MALE_PORTRAIT_2),
      },
      {
        name: 'Helena Arcasta',
        title: 'Restorer of the Court',
        reign: '650 - 681',
        battlesWon: 7,
        battlesLost: 1,
        fate: 'Rebuilt the treasury and restored provincial tribute.',
        portrait: FEMALE_PORTRAIT_1,
        portraitLayers: mockPortraitLayers(FEMALE_PORTRAIT_1),
      },
      {
        name: 'Marcellus Arcastus',
        title: 'Shield of Aurelion',
        reign: '623 - 650',
        battlesWon: 9,
        battlesLost: 4,
        fate: 'Broke the eastern rebellion and secured the grain road.',
        portrait: MALE_PORTRAIT_1,
        portraitLayers: mockPortraitLayers(MALE_PORTRAIT_1),
      },
    ],
  };
}

function mockVictoryOutcomeSummary() {
  const rulers = mockOutcomeRulers(false);
  return {
    kicker: 'Victory',
    title: 'Victory',
    subtitle: 'The campaign goals are complete',
    description: 'The Rephsian Empire has fulfilled its campaign goals by 17 Summer 784.',
    factionName: 'Rephsian Empire',
    endDate: '17 Summer 784',
    totalTimeRuled: '87y 4m',
    totalBattlesWon: 46,
    totalBattlesLost: 10,
    crestIcon: '/assets/icons/Victory/I_Victory_Gold.png',
    headerImage: '/assets/events/triumphal-return.png',
    history: mockOutcomeHistory(false),
    primaryAction: 'Continue Playing',
    secondaryAction: 'Main Menu',
    ...rulers,
  };
}

function mockDefeatOutcomeSummary(cause: MockDefeatCause) {
  const rulers = mockOutcomeRulers(true);
  const causes = {
    extinction: {
      title: 'No Heir Remains',
      subtitle: 'Your dynasty has ended',
      description: 'After Valen Arcastus died without an heir on 17 Summer 784, rivals tore the Rephsian Empire apart in their struggle for power.',
      crestIcon: '/assets/icons/I_Dread.png',
    },
    conquest: {
      title: 'Total Defeat',
      subtitle: 'Your last territory has fallen',
      description: 'On 17 Summer 784, the Rephsian Empire lost its last territory and was wiped from the map.',
      crestIcon: '/assets/icons/I_War.png',
    },
    subjugation: {
      title: 'Subjugated',
      subtitle: 'You have lost your independence',
      description: 'On 17 Summer 784, the Rephsian Empire was forced to submit to another power and lost its independence.',
      crestIcon: '/assets/icons/Diplomacy/I_ForceVassalisation.png',
    },
    rebellion: {
      title: 'Overthrown',
      subtitle: 'You have lost power',
      description: 'On 17 Summer 784, rebels seized control of the Rephsian Empire. Valen Arcastus was deposed and imprisoned, ending the dynasty\'s rule.',
      crestIcon: '/assets/icons/I_Mutiny.png',
    },
    governorship: {
      title: 'Governorship Lost',
      subtitle: 'You have been removed from office',
      description: 'On 17 Summer 784, Valen Arcastus was removed as governor of the Rephsian Empire. The province passed into another governor\'s hands.',
      crestIcon: '/assets/icons/AssignGovernor.png',
    },
    demo_expired: {
      title: 'Twenty Years Have Passed',
      subtitle: 'Your demo campaign has ended',
      description: 'Twenty years have passed. Your demo campaign ended on 4 Vindemis 804. Continue your reign in the full game.',
      crestIcon: '/assets/icons/I_Fame.png',
    },
  };

  return {
    kicker: cause === 'demo_expired' ? 'Demo Complete' : 'Defeat',
    cause,
    factionName: 'Rephsian Empire',
    endDate: '17 Summer 784',
    totalTimeRuled: '87y 4m',
    totalBattlesWon: 31,
    totalBattlesLost: 18,
    history: mockOutcomeHistory(true),
    headerImage: cause === 'rebellion'
      ? '/assets/events/usurper-crowned.png'
      : cause === 'demo_expired'
        ? '/assets/events/throne-room.png'
        : '/assets/events/sacked-city.png',
    primaryAction: 'Load Save',
    secondaryAction: 'Main Menu',
    ...causes[cause],
    ...rulers,
  };
}

export function createMockBridgeRuntime(searchParams: URLSearchParams) {
  mockInitialSetupCompleted = searchParams.get('setup') === 'complete';
  const hintsEnabled = searchParams.has('hints');
  const initialProvinceMode = searchParams.has('provinceMode')
    || searchParams.get('playerMode') === 'province'
    || searchParams.get('factionMode') === 'subject';
  const state: MockBridgeState = {
    appMode: searchParams.get('mode') === 'mainmenu' ? 'mainmenu' : 'ingame',
    provinceMode: initialProvinceMode,
    isPaused: true,
    pauseMenuOpen: false,
    speedLevel: 1,
    personalGuard: {
      unitIds: [],
      hasGuard: false,
      isForming: false,
      formStartDay: 0,
      militaryId: 'mock-military-personal-guard',
      commanderId: '',
    },
    debugMode: searchParams.has('debug'),
    gameDay: 249409,
    climateTrend: 0.006,
    climateDescription: 'Warm Period',
    saveSerial: 0,
    activeMapMode: 'political',
    mapModeFilterActive: false,
    activeMapModeFilterIds: [],
    selectedBishopricFilterId: rephsianReligion.id,
    eventVisible: searchParams.has('event'),
    eventKind: searchParams.has('importantEvent') || searchParams.has('important')
      ? 'important'
      : searchParams.has('recall') ? 'recall' : 'court',
    tutorialSpotlightVisible: searchParams.has('tutorialSpotlight'),
    autoAssignGovernorsEnabled: true,
    autoAssignCourtEnabled: true,
    enteredCourtContestKeys: ['masterofeconomy'],
    autoAssignClergyEnabled: true,
    bureaucraticRushPressure: 0,
    playerGold: initialProvinceMode ? provincePlayerFaction.gold : 22748,
    playerReligionKey: rephsianReligion.id,
    religionConversionActive: false,
    religionConversionTargetKey: '',
    religionConversionStageIndex: 0,
    religionConversionStageStartDay: 249409,
    showSettlementGlances: true,
    showMilitaryGlances: true,
    showConvoyGlances: true,
    convoyFactionFilterActive: false,
    activeConvoyFactionIds: [],
    pinnedItems: clone(pinnedItems),
    governorAssignmentActive: false,
    selectedGovernorId: MOCK_IDS.governor,
    provinceTakeoverActive: searchParams.has('provinceTakeover'),
    selectedProvinceTakeoverId: MOCK_IDS.governor,
    buildingPlacementActive: false,
    buildingPlacementId: '',
    buildingPlacementQueuedCount: 0,
    buildingPlacementTotalCost: 0,
    formationSelectionActive: false,
    formationSelectionTemplateId: '',
    militaryCustomNames: {},
  };

  function emitGameState(emit: MockBridgeEventEmitter) {
    emit('game.get_game_state', responseFor('game.get_game_state', undefined, emit));
  }

  function pauseForEventPresentation(emit: MockBridgeEventEmitter) {
    if (state.isPaused) return;
    state.isPaused = true;
    emitGameState(emit);
  }

  function emitResources(emit: MockBridgeEventEmitter) {
    emit('game.get_resources', responseFor('game.get_resources', undefined, emit));
  }

  function emitPlayerFaction(emit: MockBridgeEventEmitter) {
    emit('game.get_player_faction', responseFor('game.get_player_faction', undefined, emit));
    emit('game.get_faction_data', currentPlayerFactionData(state.provinceMode));
  }

  function emitAppMode(emit: MockBridgeEventEmitter) {
    emit('game.get_app_mode', responseFor('game.get_app_mode', undefined, emit));
  }

  function emitPinned(emit: MockBridgeEventEmitter) {
    emit('game.get_pinned_items', responseFor('game.get_pinned_items', undefined, emit));
  }

  function mockCourtTerm(daysRemaining: number) {
    const appointmentTermDays = 1680;
    const appointmentContestWindowDays = 180;
    const holderEndDate = state.gameDay + daysRemaining;
    const holderDaysRemaining = Math.max(0, daysRemaining);
    const holderTermComplete = daysRemaining <= 0;
    return {
      appointmentTermDays,
      appointmentTermYears: 5,
      appointmentContestWindowDays,
      holderStartDate: holderEndDate - appointmentTermDays,
      holderStartDateText: '',
      holderEndDate,
      holderEndDateText: '',
      holderDaysRemaining,
      holderTermComplete,
      appointmentContestOpen: daysRemaining <= appointmentContestWindowDays,
      earlyReplacementPenaltyActive: !holderTermComplete,
      earlyReplacementTermDaysRemaining: holderDaysRemaining,
      earlyReplacementHolderOpinionPenalty: -30,
      earlyReplacementFriendOpinionPenalty: -10,
      earlyReplacementFriendCount: 2,
      earlyReplacementPowerBlocHappinessPenalty: -12,
      earlyReplacementPowerBlocName: 'Court Families',
      earlyReplacementPenaltyDurationDays: 365,
    };
  }

  function mockCourtSubordinate(
    id: string,
    name: string,
    daysRemaining: number,
    statValue: number,
    statContribution: number,
    isPlayerCharacter: boolean,
  ) {
    const term = mockCourtTerm(daysRemaining);
    return {
      id,
      name,
      statValue,
      statContribution,
      isPlayerCharacter,
      startDate: term.holderStartDate,
      startDateText: term.holderStartDateText,
      endDate: term.holderEndDate,
      endDateText: term.holderEndDateText,
      daysRemaining: term.holderDaysRemaining,
      termComplete: term.holderTermComplete,
      appointmentContestOpen: term.appointmentContestOpen,
    };
  }

  function emitReligionConversion(emit: MockBridgeEventEmitter) {
    emit('game.get_religion_conversion', responseFor('game.get_religion_conversion', undefined, emit));
  }

  function bureaucraticThroughput(): BridgeResponse<'game.get_bureaucratic_throughput'> {
    const rushPressure = state.bureaucraticRushPressure;
    const currentLoad = 69 + rushPressure;
    const capacity = 91;
    const overload = Math.max(0, currentLoad - capacity);
    const overloadPenaltyPercent = overload <= 0 ? 0 : Math.min(65, Math.ceil((overload / capacity) * 35));
    return {
      capacity,
      currentLoad,
      overload,
      overloadPenaltyPercent,
      state: currentLoad >= 101 ? 'overloaded' : currentLoad >= 73 ? 'strained' : 'stable',
      policyChanges: 1,
      activeEdicts: 0,
      activeInteractions: 1,
      directAdministration: 24,
      provincePressure: 8,
      vacantOffices: 0,
      rushPressure,
      sources: [
        { sourceId: 'capacity:baseline', label: 'Central administration', kind: 'capacity', category: 'baseline', value: 40, expiresInDays: 0, expiresOnDate: 0, details: [] },
        { sourceId: 'capacity:court:MasterOfEconomy', label: 'Master of Economy', kind: 'capacity', category: 'court', value: 15, expiresInDays: 0, expiresOnDate: 0, details: [] },
        { sourceId: 'capacity:court:MasterOfDiplomacy', label: 'Master of Diplomacy', kind: 'capacity', category: 'court', value: 15, expiresInDays: 0, expiresOnDate: 0, details: [] },
        { sourceId: 'capacity:governors', label: 'Regional governors', kind: 'capacity', category: 'governance', value: 12, expiresInDays: 0, expiresOnDate: 0, details: [] },
        { sourceId: 'capacity:fiscal-health', label: 'Treasury balance', kind: 'capacity', category: 'economy', value: 9, expiresInDays: 0, expiresOnDate: 0, details: [] },
        {
          sourceId: 'load:direct-settlements',
          label: 'Directly controlled settlements',
          kind: 'load',
          category: 'administration',
          value: 18,
          expiresInDays: 0,
          expiresOnDate: 0,
          details: [
            { sourceId: 'aurelion', label: 'Aurelion', kind: 'load', value: 3 },
            { sourceId: 'vellum', label: 'Vellum', kind: 'load', value: 3 },
            { sourceId: 'Kharon', label: 'Kharon', kind: 'load', value: 3 },
            { sourceId: 'Ostrava', label: 'Ostrava', kind: 'load', value: 3 },
            { sourceId: 'Sunspire', label: 'Sunspire', kind: 'load', value: 3 },
            { sourceId: 'Tarkhen', label: 'Tarkhen', kind: 'load', value: 3 },
          ],
        },
        { sourceId: 'load:governed-regions', label: 'Governor-led regions', kind: 'load', category: 'administration', value: 6, expiresInDays: 0, expiresOnDate: 0, details: [] },
        {
          sourceId: 'load:provinces',
          label: 'Subject provinces',
          kind: 'load',
          category: 'administration',
          value: 2,
          expiresInDays: 0,
          expiresOnDate: 0,
          details: [
            { sourceId: 'narovan', label: 'Narovan March', kind: 'load', value: 1 },
            { sourceId: 'durath', label: 'Durath Province', kind: 'load', value: 1 },
          ],
        },
        { sourceId: 'load:policy', label: 'Tax policy change', kind: 'load', category: 'policy', value: 21, expiresInDays: 12, expiresOnDate: state.gameDay + 12, details: [] },
        { sourceId: 'load:interaction', label: 'Provincial requisition', kind: 'load', category: 'interaction', value: 14, expiresInDays: 18, expiresOnDate: state.gameDay + 18, details: [] },
        { sourceId: 'load:province-pressure', label: 'Governor corruption', kind: 'load', category: 'province', value: 8, expiresInDays: 0, expiresOnDate: 0, details: [] },
        ...(rushPressure > 0 ? [
          { sourceId: 'load:rush:mock', label: 'Rushed action', kind: 'load', category: 'rush', value: rushPressure, expiresInDays: 7, expiresOnDate: state.gameDay + 7, details: [] },
        ] : []),
      ],
    };
  }

  function mockReligionByKey(key: string): ReligionInfo {
    return key === rivalReligion.id ? rivalReligion : rephsianReligion;
  }

  function mockReligionIcon(religion: ReligionInfo): string {
    return `/assets/religions/${religion.id}.png`;
  }

  function mockReligionConversion(): BridgeResponse<'game.get_religion_conversion'> {
    const currentReligion = mockReligionByKey(state.playerReligionKey);
    const targetReligion = mockReligionByKey(state.religionConversionTargetKey || rivalReligion.id);
    const currentStage = MOCK_CONVERSION_STAGES[state.religionConversionStageIndex] ?? MOCK_CONVERSION_STAGES[0];
    const activeElapsedDays = state.religionConversionActive ? Math.max(0, state.gameDay - state.religionConversionStageStartDay) : 0;
    const activeRemainingDays = state.religionConversionActive ? Math.max(0, currentStage.durationDays - activeElapsedDays) : 0;
    const activeProgress = state.religionConversionActive && currentStage.durationDays > 0
      ? Math.min(1, activeElapsedDays / currentStage.durationDays)
      : state.religionConversionActive ? 1 : 0;
    const activeStageReady = state.religionConversionActive && activeProgress >= 1;
    const canAdvance = activeStageReady && state.religionConversionStageIndex < MOCK_CONVERSION_STAGES.length - 1;
    const canComplete = activeStageReady && state.religionConversionStageIndex >= MOCK_CONVERSION_STAGES.length - 1;

    return {
      state: {
        active: state.religionConversionActive,
        currentReligionKey: currentReligion.id,
        currentReligionName: currentReligion.name,
        currentReligionIconPath: mockReligionIcon(currentReligion),
        currentReligionColour: currentReligion.colour,
        currentReligionInfo: currentReligion,
        targetReligionKey: state.religionConversionActive ? targetReligion.id : '',
        targetReligionName: state.religionConversionActive ? targetReligion.name : '',
        targetReligionIconPath: state.religionConversionActive ? mockReligionIcon(targetReligion) : '',
        targetReligionColour: state.religionConversionActive ? targetReligion.colour : '',
        targetReligionInfo: targetReligion,
        currentStageIndex: state.religionConversionActive ? state.religionConversionStageIndex : -1,
        currentStageName: state.religionConversionActive ? currentStage.name : '',
        currentStageProgress: activeProgress,
        currentStageRemainingDays: activeRemainingDays,
        canAdvance,
        canComplete,
        playerGold: state.playerGold,
      },
      options: [
        {
          info: rivalReligion,
          key: rivalReligion.id,
          name: rivalReligion.name,
          description: rivalReligion.description,
          iconPath: mockReligionIcon(rivalReligion),
          colour: rivalReligion.colour,
          realmShare: 0.18,
        },
      ],
      stages: MOCK_CONVERSION_STAGES.map((stage, index) => {
        let stageState = 'locked';
        let progress = 0;
        let canActivate = false;
        if (!state.religionConversionActive) {
          const canAfford = index === 0 && state.playerGold >= stage.goldCost;
          stageState = canAfford ? 'ready' : 'locked';
          canActivate = canAfford;
        } else if (index < state.religionConversionStageIndex) {
          stageState = 'complete';
          progress = 1;
        } else if (index === state.religionConversionStageIndex) {
          stageState = 'active';
          progress = activeProgress;
        } else if (index === state.religionConversionStageIndex + 1 && activeStageReady) {
          const canAfford = state.playerGold >= stage.goldCost;
          stageState = canAfford ? 'ready' : 'locked';
          canActivate = canAfford;
        }

        return {
          index,
          ...stage,
          state: stageState,
          progress,
          remainingDays: state.religionConversionActive && index === state.religionConversionStageIndex ? activeRemainingDays : stage.durationDays,
          canActivate,
          reason: canActivate || stageState !== 'locked' ? '' : 'Not enough gold',
        };
      }),
    } satisfies BridgeResponse<'game.get_religion_conversion'>;
  }

  function mockGovernorAssignment(): BridgeResponse<'game.governor_assignment'> {
    const candidateIds = [MOCK_IDS.governor, MOCK_IDS.heir, 'mock-person-steward'];
    return {
      active: state.governorAssignmentActive,
      selectedPersonId: state.selectedGovernorId,
      message: '',
      candidates: candidateIds.map((id) => {
        const person = personById(id);
        const currentRegionCount = id === MOCK_IDS.governor ? 1 : 0;
        const maxRegionCount = id === 'mock-person-steward' ? 2 : 3;
        return {
          id: person.id,
          name: person.name,
          portrait: person.portrait,
          portraitLayers: person.portraitLayers,
          age: person.age,
          governance: person.stats.governance,
          loyalty: person.stats.loyalty,
          currentRegionCount,
          maxRegionCount,
          atCapacity: false,
          isSelected: state.selectedGovernorId === id,
        };
      }),
    } satisfies BridgeResponse<'game.governor_assignment'>;
  }

  function mockBuildingPlacement(): BridgeResponse<'game.building_placement'> {
    const buildingId = state.buildingPlacementId || 'Aqueduct';
    const names: Record<string, string> = {
      Aqueduct: 'Aqueduct',
      GreatStoneWall: 'Great Stone Wall',
      Forum: 'Forum',
      Granary: 'Granary',
      Barracks: 'Barracks',
      Docks: 'Docks',
    };
    return {
      active: state.buildingPlacementActive,
      buildingId,
      buildingName: names[buildingId] ?? buildingId,
      assetKey: buildingId,
      queuedCount: state.buildingPlacementQueuedCount,
      totalCost: state.buildingPlacementTotalCost,
      availableGold: state.playerGold - state.buildingPlacementTotalCost,
      canConfirm: state.buildingPlacementQueuedCount > 0,
      canUndo: state.buildingPlacementQueuedCount > 0,
      message: '',
    } satisfies BridgeResponse<'game.building_placement'>;
  }

  function mockFormationSelection(): BridgeResponse<'game.apply_formation_template'> {
    const templateId = state.formationSelectionTemplateId || 'balanced-field-army';
    const naval = templateId === 'coastal-patrol';
    return {
      applied: state.formationSelectionActive,
      selectionStarted: state.formationSelectionActive,
      selectionActive: state.formationSelectionActive,
      templateId,
      templateName: naval ? 'Coastal Patrol' : 'Balanced Field Army',
      templateType: naval ? 'naval' : 'land',
      creationCost: naval ? 420 : 500,
      selectedSettlementId: '',
      selectedSettlementName: '',
      canConfirm: false,
      message: state.formationSelectionActive ? 'Select a settlement to raise this formation.' : '',
    } satisfies BridgeResponse<'game.apply_formation_template'>;
  }

  function mockAllyCallDialog(open: boolean): BridgeResponse<'ui.ally_call_dialog'> {
    const rival = rivalFactionReference();
    const subject = subjectFactionReference();
    const harbourLeague = customFactionReference(
      'mock-faction-harbour-league',
      'Namaris Harbour League',
      '#6E5B38',
      '#CFC4AA',
      'Rephsian',
      'Rephsian_3',
    );
    const hillCompact = customFactionReference(
      'mock-faction-hill-compact',
      'Vallis Hill Compact',
      '#3F5C58',
      '#C2A55A',
      'Aurestian',
      'Aurestian_2',
    );

    const reason = (
      finalPercent: number,
      allyOpinion: number,
      enemyOpinion: number,
      opinionImpactPercent: number,
      enemyOpinionImpactPercent: number,
      strengthImpactPercent: number,
      warImpactPercent: number,
      strengthBalancePercent: number,
      activeWarCount: number,
      acceptanceCapPercent = 100,
      limitReason = '',
    ) => ({
      finalPercent,
      basePercent: 65,
      allyOpinion,
      enemyOpinion,
      opinionImpactPercent,
      enemyOpinionImpactPercent,
      strengthImpactPercent,
      warImpactPercent,
      strengthBalancePercent,
      activeWarCount,
      acceptanceCapPercent,
      limitReason,
    });

    const ally = (
      ref: MockFactionReference,
      strength: number,
      strengthRatio: number,
      callLikelihoodReason: ReturnType<typeof reason>,
    ) => ({
      id: ref.id,
      name: ref.name,
      colour: ref.colour,
      secondaryColour: ref.secondaryColour,
      cultureGroup: ref.cultureGroup,
      emblem: ref.emblem,
      strength,
      strengthRatio,
      callLikelihoodPercent: callLikelihoodReason.finalPercent,
      callLikelihoodReason,
    });

    return {
      open,
      requestId: open ? 'mock-ally-call-1' : '',
      enemyId: open ? rival.id : '',
      enemyName: open ? rival.name : '',
      isDefensive: false,
      allies: open ? [
        ally(subject, 4200, 0.72, reason(84, 74, -35, 22, 9, -2, -10, 92, 2)),
        ally(harbourLeague, 2500, 0.43, reason(46, 27, 32, 6, -8, -17, 0, 31, 1)),
        ally(hillCompact, 7600, 1.28, reason(18, -15, 64, -9, -16, 13, -35, 152, 2, 25, 'allyCold')),
      ] : [],
    } satisfies BridgeResponse<'ui.ally_call_dialog'>;
  }

  function namedMilitaryData(id: string): BridgeResponse<'game.get_military_data'> {
    const data = militaryData(id);
    const customName = state.militaryCustomNames[id];
    if (customName) data.name = customName;
    return data;
  }

  function namedMilitaryOverview(): BridgeResponse<'game.get_military_overview'> {
    const overview = militaryOverview();
    overview.forces = overview.forces.map((force) => {
      const customName = state.militaryCustomNames[force.id];
      return customName ? { ...force, name: customName } : force;
    });
    return overview;
  }

  function responseFor(action: string, payload: unknown, emit: MockBridgeEventEmitter): unknown {
    switch (action as BridgeActionName) {
      case 'game.get_app_mode':
        return { mode: state.appMode } satisfies BridgeResponse<'game.get_app_mode'>;
      case 'game.get_game_state':
        return { day: 17, month: 6, year: 742, gameDay: state.gameDay, dateText: '17/6/742', season: 'Summer', calendarKey: 'fantasy', daysInYear: 336, daysInMonth: 28, isPaused: state.isPaused, speedLevel: state.speedLevel, debugMode: state.debugMode, climateTrend: state.climateTrend, climateDescription: state.climateDescription, saveSerial: state.saveSerial, gameOver: false, hasDemoTimeLimit: false, demoDaysRemaining: 0, demoEndDateText: '' } satisfies BridgeResponse<'game.get_game_state'>;
      case 'game.get_game_version':
        return { version: 'Mock UI Dev', isDemo: false } satisfies BridgeResponse<'game.get_game_version'>;
      case 'game.get_resources':
        return { gold: state.playerGold, goldDelta: state.provinceMode ? 32 : 7670, population: state.provinceMode ? provincePlayerFaction.population : 272390, populationDelta: state.provinceMode ? 24 : 180 } satisfies BridgeResponse<'game.get_resources'>;
      case 'game.get_bureaucratic_throughput':
        return bureaucraticThroughput();
      case 'game.rush_bureaucratic_action': {
        state.bureaucraticRushPressure = Math.max(state.bureaucraticRushPressure, 16);
        const response = { rushed: true, daysSaved: 4, addedLoad: state.bureaucraticRushPressure, remainingDays: 8, message: '' } satisfies BridgeResponse<'game.rush_bureaucratic_action'>;
        emit('game.get_bureaucratic_throughput', bureaucraticThroughput());
        return response;
      }
      case 'game.toggle_pause': {
        const pausePayload = payload as { absolute?: boolean; isPaused?: boolean } | undefined;
        if (state.pauseMenuOpen) {
          state.isPaused = true;
        } else if (pausePayload?.absolute) {
          state.isPaused = Boolean(pausePayload.isPaused);
        } else {
          state.isPaused = !state.isPaused;
        }
        emitGameState(emit);
        return { isPaused: state.isPaused } satisfies BridgeResponse<'game.toggle_pause'>;
      }
      case 'game.set_pause_menu_open': {
        const open = Boolean((payload as { open?: boolean } | undefined)?.open);
        state.pauseMenuOpen = open;
        if (open) state.isPaused = true;
        emitGameState(emit);
        return undefined;
      }
      case 'game.set_speed': {
        state.speedLevel = payloadNumber(payload, 'speedLevel', 1);
        state.isPaused = state.pauseMenuOpen ? true : false;
        emitGameState(emit);
        return { isPaused: state.isPaused, speedLevel: state.speedLevel } satisfies BridgeResponse<'game.set_speed'>;
      }
      case 'game.get_player_faction':
        {
          const faction = currentPlayerFactionData(state.provinceMode);
          const ruler = personById(faction.rulerId || MOCK_IDS.character);
          return {
            id: faction.id,
            name: faction.name,
            colour: faction.colour,
            secondaryColour: faction.secondaryColour || '',
            cultureGroup: faction.cultureGroup || '',
            emblem: faction.emblem || '',
            religionId: faction.religionId || '',
            diplomaticStatus: faction.diplomaticStatus,
            subjectSubtype: faction.subjectSubtype || '',
            rulerId: faction.rulerId || '',
            rulerName: faction.rulerName || '',
            rulerPortrait: ruler.portrait,
            rulerPortraitLayers: ruler.portraitLayers,
            rulerIsAlive: ruler.isAlive,
            rulerIsImprisoned: ruler.isImprisoned,
          } satisfies BridgeResponse<'game.get_player_faction'>;
        }
      case 'game.get_faction_data':
        return clone(factionById(payloadString(payload, 'factionId', currentPlayerFactionData(state.provinceMode).id), state.provinceMode));
      case 'game.get_person_data':
        return clone(personById(payloadString(payload, 'personId', MOCK_IDS.character)));
      case 'game.get_settlement_data':
        return clone(settlementBase(payloadString(payload, 'settlementId', MOCK_IDS.settlement)));
      case 'game.perform_siege_command':
        return {
          performed: true,
          settlementId: payloadString(payload, 'settlementId', MOCK_IDS.settlement),
          openedBattle: false,
          battleId: '',
        } satisfies BridgeResponse<'game.perform_siege_command'>;
      case 'game.get_settlement_buildings':
        return clone(settlementBuildings(payloadString(payload, 'settlementId', MOCK_IDS.settlement)));
      case 'game.get_military_data':
        return clone(namedMilitaryData(payloadString(payload, 'militaryId', MOCK_IDS.military)));
      case 'game.get_military_commander_candidates':
        return clone(militaryCommanderCandidates(payloadString(payload, 'militaryId', MOCK_IDS.military)));
      case 'game.get_military_overview':
        return clone(namedMilitaryOverview());
      case 'game.get_personal_guard':
        return clone(personalGuardStatus(state));
      case 'game.set_personal_guard_composition': {
        if (state.personalGuard.hasGuard || state.personalGuard.isForming) {
          return { success: false, message: 'The Personal Guard is already established.' } satisfies BridgeResponse<'game.set_personal_guard_composition'>;
        }
        const unitIds = payloadStringArray(payload, 'unitIds').slice(0, state.provinceMode ? 10 : 20);
        state.personalGuard.unitIds = unitIds;
        const response = personalGuardStatus(state);
        emit('game.get_personal_guard', response);
        return { success: true, message: '' } satisfies BridgeResponse<'game.set_personal_guard_composition'>;
      }
      case 'game.form_personal_guard': {
        if (state.personalGuard.hasGuard || state.personalGuard.isForming) {
          return { success: false, message: 'The Personal Guard is already established.' } satisfies BridgeResponse<'game.form_personal_guard'>;
        }
        const unitIds = payloadStringArray(payload, 'unitIds');
        if (unitIds.length > 0) {
          state.personalGuard.unitIds = unitIds.slice(0, state.provinceMode ? 10 : 20);
        }
        if (state.personalGuard.unitIds.length === 0) {
          return { success: false, message: 'Choose companies for the Personal Guard first.' } satisfies BridgeResponse<'game.form_personal_guard'>;
        }
        const cost = personalGuardStatus(state).formGoldCost;
        if (state.playerGold < cost) {
          return { success: false, message: `Needs ${cost - state.playerGold} more gold` } satisfies BridgeResponse<'game.form_personal_guard'>;
        }
        state.playerGold -= cost;
        state.personalGuard.hasGuard = true;
        state.personalGuard.isForming = true;
        state.personalGuard.formStartDay = state.gameDay;
        const response = personalGuardStatus(state);
        emit('game.get_personal_guard', response);
        emit('game.get_resources', responseFor('game.get_resources', undefined, emit));
        emit('game.get_military_overview', responseFor('game.get_military_overview', undefined, emit));
        return { success: true, message: 'The Personal Guard has been established.' } satisfies BridgeResponse<'game.form_personal_guard'>;
      }
      case 'game.replace_personal_guard_company': {
        const capacity = state.provinceMode ? 10 : 20;
        const slotNumber = Math.max(1, Math.round(payloadNumber(payload, 'slotNumber', 1)));
        const unitId = payloadString(payload, 'unitId', '');
        if (!unitId || !personalGuardUnitMeta(unitId)) {
          return { success: false, message: 'That company cannot join the Personal Guard.' } satisfies BridgeResponse<'game.replace_personal_guard_company'>;
        }
        const index = slotNumber - 1;
        if (index < 0 || index >= capacity) {
          return { success: false, message: 'Could not replace that company.' } satisfies BridgeResponse<'game.replace_personal_guard_company'>;
        }
        if (index < state.personalGuard.unitIds.length) {
          state.personalGuard.unitIds[index] = unitId;
        } else if (state.personalGuard.unitIds.length < capacity) {
          state.personalGuard.unitIds.push(unitId);
        } else {
          return { success: false, message: 'The Personal Guard has no free company slots.' } satisfies BridgeResponse<'game.replace_personal_guard_company'>;
        }
        const response = personalGuardStatus(state);
        emit('game.get_personal_guard', response);
        return { success: true, message: '' } satisfies BridgeResponse<'game.replace_personal_guard_company'>;
      }
      case 'game.remove_personal_guard_company': {
        const slotNumber = Math.max(1, Math.round(payloadNumber(payload, 'slotNumber', 1)));
        const index = slotNumber - 1;
        if (index < 0 || index >= state.personalGuard.unitIds.length) {
          return { success: false, message: 'Could not remove that company.' } satisfies BridgeResponse<'game.remove_personal_guard_company'>;
        }
        state.personalGuard.unitIds.splice(index, 1);
        if (state.personalGuard.unitIds.length === 0) {
          state.personalGuard.hasGuard = false;
          state.personalGuard.isForming = false;
        }
        const response = personalGuardStatus(state);
        emit('game.get_personal_guard', response);
        return { success: true, message: '' } satisfies BridgeResponse<'game.remove_personal_guard_company'>;
      }
      case 'game.get_selected_militaries': {
        const selected = selectedMilitaries();
        selected.militaries = selected.militaries.map((force) => {
          const customName = state.militaryCustomNames[force.id];
          return customName ? { ...force, name: customName } : force;
        });
        return clone(selected);
      }
      case 'game.get_map_modes':
        return clone(mapModes(state.activeMapMode));
      case 'game.get_map_mode_filters':
        return clone(mapModeFilters(state));
      case 'game.set_map_mode':
        state.activeMapMode = payloadString(payload, 'modeId', 'political');
        clearMapModeFilters(state);
        emit('game.get_map_modes', responseFor('game.get_map_modes', undefined, emit));
        emit('game.get_map_mode_filters', responseFor('game.get_map_mode_filters', undefined, emit));
        emit('game.get_world_glances', responseFor('game.get_world_glances', undefined, emit));
        return undefined;
      case 'game.set_map_mode_filters':
        if (state.activeMapMode === 'bishopric') {
          state.selectedBishopricFilterId = payloadString(payload, 'selectedEntryId', state.selectedBishopricFilterId);
          clearMapModeFilters(state);
        } else {
          state.mapModeFilterActive = payloadBoolean(payload, 'filterActive', false);
          state.activeMapModeFilterIds = payloadStringArray(payload, 'activeIds');
        }
        emit('game.get_map_mode_filters', responseFor('game.get_map_mode_filters', undefined, emit));
        emit('game.get_world_glances', responseFor('game.get_world_glances', undefined, emit));
        return undefined;
      case 'game.governor_assignment': {
        const command = payloadString(payload, 'command', 'state');
        if (command === 'start') {
          state.governorAssignmentActive = true;
          state.selectedGovernorId = state.selectedGovernorId || MOCK_IDS.governor;
          state.activeMapMode = 'regionGovernor';
          clearMapModeFilters(state);
        } else if (command === 'select') {
          state.selectedGovernorId = payloadString(payload, 'personId', state.selectedGovernorId);
        } else if (command === 'done' || command === 'cancel') {
          state.governorAssignmentActive = false;
          state.activeMapMode = 'political';
          clearMapModeFilters(state);
        }
        emit('game.get_map_modes', responseFor('game.get_map_modes', undefined, emit));
        emit('game.get_map_mode_filters', responseFor('game.get_map_mode_filters', undefined, emit));
        return mockGovernorAssignment();
      }
      case 'game.building_placement': {
        const command = payloadString(payload, 'command', 'state');
        if (command === 'start') {
          state.buildingPlacementActive = true;
          state.buildingPlacementId = payloadString(payload, 'buildingId', 'Aqueduct');
          state.buildingPlacementQueuedCount = 0;
          state.buildingPlacementTotalCost = 0;
          state.activeMapMode = 'landscape';
          clearMapModeFilters(state);
        } else if (command === 'undo') {
          state.buildingPlacementQueuedCount = Math.max(0, state.buildingPlacementQueuedCount - 1);
          state.buildingPlacementTotalCost = Math.max(0, state.buildingPlacementTotalCost - 720);
        } else if (command === 'confirm') {
          state.playerGold = Math.max(0, state.playerGold - state.buildingPlacementTotalCost);
          state.buildingPlacementActive = false;
          state.buildingPlacementQueuedCount = 0;
          state.buildingPlacementTotalCost = 0;
          state.activeMapMode = 'political';
          clearMapModeFilters(state);
        } else if (command === 'cancel') {
          state.buildingPlacementActive = false;
          state.buildingPlacementQueuedCount = 0;
          state.buildingPlacementTotalCost = 0;
          state.activeMapMode = 'political';
          clearMapModeFilters(state);
        }
        emit('game.get_map_modes', responseFor('game.get_map_modes', undefined, emit));
        emit('game.get_map_mode_filters', responseFor('game.get_map_mode_filters', undefined, emit));
        emitResources(emit);
        return mockBuildingPlacement();
      }
      case 'game.get_world_glance_visibility':
        return clone(worldGlanceVisibility(state));
      case 'game.set_world_glance_visibility':
        state.showSettlementGlances = payloadBoolean(payload, 'showSettlements', true);
        state.showMilitaryGlances = payloadBoolean(payload, 'showMilitary', true);
        state.showConvoyGlances = payloadBoolean(payload, 'showConvoys', true);
        emit('game.get_world_glance_visibility', responseFor('game.get_world_glance_visibility', undefined, emit));
        emit('game.get_convoy_glance_filters', responseFor('game.get_convoy_glance_filters', undefined, emit));
        emit('game.get_world_glances', responseFor('game.get_world_glances', undefined, emit));
        return undefined;
      case 'game.get_convoy_glance_filters':
        return clone(convoyFactionFilters(state));
      case 'game.set_convoy_glance_filters':
        state.showConvoyGlances = payloadBoolean(payload, 'showConvoys', true);
        state.convoyFactionFilterActive = payloadBoolean(payload, 'factionFilterActive', false);
        state.activeConvoyFactionIds = payloadStringArray(payload, 'activeFactionIds');
        emit('game.get_world_glance_visibility', responseFor('game.get_world_glance_visibility', undefined, emit));
        emit('game.get_convoy_glance_filters', responseFor('game.get_convoy_glance_filters', undefined, emit));
        emit('game.get_world_glances', responseFor('game.get_world_glances', undefined, emit));
        return undefined;
      case 'game.get_pinned_items':
        return { items: clone(state.pinnedItems) } satisfies BridgeResponse<'game.get_pinned_items'>;
      case 'game.toggle_pin': {
        const itemType = payloadString(payload, 'itemType');
        const itemId = payloadString(payload, 'itemId');
        const existing = state.pinnedItems.findIndex(i => i.itemType === itemType && i.itemId === itemId);
        if (existing >= 0) {
          state.pinnedItems.splice(existing, 1);
        } else {
          state.pinnedItems.push({ itemType, itemId, name: itemId || itemType, detail: 'Pinned in mock mode' });
        }
        emitPinned(emit);
        return { pinned: existing < 0 } satisfies BridgeResponse<'game.toggle_pin'>;
      }
      case 'game.get_current_event':
        if (state.eventVisible) pauseForEventPresentation(emit);
        return clone(currentEvent(state.eventVisible, state.eventKind));
      case 'game.get_tutorial_progress':
        return clone(currentTutorialProgress());
      case 'game.tutorial_spotlight':
        if (payloadString(payload, 'command') === 'dismiss' || payloadString(payload, 'command') === 'resolve') {
          state.tutorialSpotlightVisible = false;
        }
        return {
          isVisible: state.tutorialSpotlightVisible,
          eventId: state.tutorialSpotlightVisible ? 'mock-tutorial-spotlight' : '',
          target: state.tutorialSpotlightVisible ? 'GoldDisplay' : '',
          targetDetail: '',
          title: state.tutorialSpotlightVisible ? 'Your Treasury' : '',
          body: state.tutorialSpotlightVisible ? 'This is your gold reserve. The monthly income text uses <colour green>green</> when you are earning more than you spend and <colour red>red</> when you are losing money.\n\nKeep a close eye on this.' : '',
          currentPage: 0,
          totalPages: state.tutorialSpotlightVisible ? 9 : 0,
          canGoBack: false,
          canGoForward: state.tutorialSpotlightVisible,
          isBuildingTarget: false,
          isUnitTarget: false,
          requiredUnitCount: 1,
        } satisfies BridgeResponse<'game.tutorial_spotlight'>;
      case 'game.choose_event_option':
        state.eventVisible = false;
        emit('game.get_current_event', responseFor('game.get_current_event', undefined, emit));
        return { success: true } satisfies BridgeResponse<'game.choose_event_option'>;
      case 'game.hint_events': {
        const command = payloadString(payload, 'command', 'bind');
        const hintKey = payloadString(payload, 'hintKey', 'mock-hint');
        const response = command === 'show'
          ? mockHintForKey(hintKey)
          : { hintKey: '', title: '', paragraphs: [], paragraphPages: [] };
        if (command === 'show' && (hintsEnabled || Boolean(payloadValue(payload, 'force')))) emit('game.hint_events', response);
        return response satisfies BridgeResponse<'game.hint_events'>;
      }
      case 'game.get_warnings':
        return { warnings: [
          { id: 'mock-warning-food', title: 'Food stores falling', description: 'Several settlements are consuming more food than they produce.', severity: 'warning', iconKey: 'I_Caution', targetCount: 2, screenToOpen: 'economy', screenTab: '', powerBlocId: '', targetLabels: ['Namaris', 'West Gate'] },
          { id: 'mock-warning-unrest', title: 'Unrest rising', description: 'Namaris is close to open resistance.', severity: 'danger', iconKey: 'I_Caution', targetCount: 1, screenToOpen: 'ledger', screenTab: '', powerBlocId: '', targetLabels: [] },
          { id: 'unassignedgovernor', title: 'Region needs a governor', description: 'One of your regions has no governor assigned.', severity: 'caution', iconKey: 'unassignedgovernor', targetCount: 1, screenToOpen: '', screenTab: '', powerBlocId: '', targetLabels: [] },
        ] } satisfies BridgeResponse<'game.get_warnings'>;
      case 'game.get_power_blocs':
        return clone(powerBlocs(state.gameDay));
      case 'game.get_power_bloc_detail': {
        const blocId = payloadString(payload, 'blocId', MOCK_IDS.powerBloc);
        const blocs = powerBlocs(state.gameDay).blocs;
        return {
          bloc: clone(blocs.find(bloc => bloc.id === blocId) ?? blocs[0]!),
        } satisfies BridgeResponse<'game.get_power_bloc_detail'>;
      }
      case 'game.form_personal_power_bloc':
        return {
          success: true,
          message: 'Your clients have formed a faction around you.',
          blocId: MOCK_IDS.powerBloc,
        } satisfies BridgeResponse<'game.form_personal_power_bloc'>;
      case 'game.get_economy_overview':
        return clone(economyOverview());
      case 'game.get_economy_resource_details':
        return clone(economyResourceDetails(payloadString(payload, 'resourceId', 'Grain')));
      case 'game.get_diplomacy_overview':
        return clone(diplomacyOverview(state.autoAssignGovernorsEnabled));
      case 'game.get_ledger_overview':
        return clone(ledgerOverview());
      case 'game.get_character_list':
        return clone(characterListForFaction(
          payloadString(payload, 'factionId', MOCK_IDS.playerFaction),
          payloadString(payload, 'scope', 'faction'),
        ));
      case 'game.get_family_tree': {
        const focusPersonId = payloadString(payload, 'personId', MOCK_IDS.character) || MOCK_IDS.character;
        const requestedScope = payloadString(payload, 'scope', 'lineage');
        const scope = requestedScope === 'patronage' || requestedScope === 'succession' || requestedScope === 'history'
          ? requestedScope
          : 'lineage';
        const familyNodeIds = MOCK_FAMILY_PERSON_IDS.filter(id => id !== MOCK_IDS.governor);
        if (!familyNodeIds.includes(focusPersonId)) familyNodeIds.push(focusPersonId);
        const responseNodeIds = scope === 'lineage'
          ? familyNodeIds
          : scope === 'succession'
            ? [MOCK_IDS.character, MOCK_IDS.heir]
            : scope === 'history'
              ? [MOCK_IDS.character, 'mock-person-previous-ruler']
              : [];
        const patronageNodeIds = [
          MOCK_IDS.character,
          MOCK_IDS.governor,
          'mock-person-daughter',
          'mock-person-tribune',
          'mock-person-steward',
          'mock-person-envoy',
          'mock-person-spy',
          'mock-person-notary',
          'mock-person-advocate',
        ];
        if (!patronageNodeIds.includes(focusPersonId)) patronageNodeIds.push(focusPersonId);
        return {
          scope,
          focusPersonId,
          factionId: MOCK_IDS.playerFaction,
          factionName: 'Rephsian Empire',
          rulerId: MOCK_IDS.character,
          heirId: MOCK_IDS.heir,
          designatedHeirId: MOCK_IDS.heir,
          patronageRootId: MOCK_IDS.character,
          nodes: responseNodeIds.map(id => familyTreePerson(id, focusPersonId)),
          edges: scope === 'lineage' ? [
            { fromId: 'mock-person-previous-ruler', toId: MOCK_IDS.character, type: 'parent' },
            { fromId: 'mock-person-previous-ruler', toId: 'mock-person-brother', type: 'parent' },
            { fromId: MOCK_IDS.character, toId: 'mock-person-spouse', type: 'spouse' },
            { fromId: MOCK_IDS.character, toId: MOCK_IDS.heir, type: 'parent' },
            { fromId: 'mock-person-spouse', toId: MOCK_IDS.heir, type: 'parent' },
            { fromId: MOCK_IDS.character, toId: 'mock-person-daughter', type: 'parent' },
            { fromId: 'mock-person-spouse', toId: 'mock-person-daughter', type: 'parent' },
            { fromId: MOCK_IDS.heir, toId: 'mock-person-grandchild', type: 'parent' },
          ] : [],
          patronageNodes: scope === 'patronage' ? patronageNodeIds.map(id => familyTreePerson(id, focusPersonId)) : [],
          patronageLinks: scope === 'patronage' ? [
            { patronId: MOCK_IDS.character, clientId: MOCK_IDS.governor, linkHealth: 0.82, favourBalance: 18, daysSinceLastInteraction: 16, isInherited: false },
            { patronId: MOCK_IDS.character, clientId: 'mock-person-daughter', linkHealth: 0.64, favourBalance: -12, daysSinceLastInteraction: 42, isInherited: false },
            { patronId: MOCK_IDS.character, clientId: 'mock-person-tribune', linkHealth: 0.46, favourBalance: 31, daysSinceLastInteraction: 78, isInherited: false },
            { patronId: MOCK_IDS.governor, clientId: 'mock-person-steward', linkHealth: 0.72, favourBalance: 8, daysSinceLastInteraction: 24, isInherited: false },
            { patronId: MOCK_IDS.governor, clientId: 'mock-person-notary', linkHealth: 0.22, favourBalance: -37, daysSinceLastInteraction: 118, isInherited: true },
            { patronId: 'mock-person-daughter', clientId: 'mock-person-envoy', linkHealth: 0.58, favourBalance: 11, daysSinceLastInteraction: 51, isInherited: false },
            { patronId: 'mock-person-daughter', clientId: 'mock-person-spy', linkHealth: 0.36, favourBalance: 25, daysSinceLastInteraction: 93, isInherited: false },
            { patronId: 'mock-person-tribune', clientId: 'mock-person-advocate', linkHealth: 0.69, favourBalance: 0, daysSinceLastInteraction: 32, isInherited: false },
          ] : [],
          groups: {
            parents: scope === 'lineage' ? ['mock-person-previous-ruler'] : [],
            spouses: scope === 'lineage' ? ['mock-person-spouse'] : [],
            children: scope === 'lineage' ? [MOCK_IDS.heir, 'mock-person-daughter'] : [],
            siblings: scope === 'lineage' ? ['mock-person-brother'] : [],
            grandchildren: scope === 'lineage' ? ['mock-person-grandchild'] : [],
            succession: scope === 'lineage' || scope === 'succession' ? [MOCK_IDS.heir] : [],
            previousRulers: scope === 'lineage' || scope === 'history' ? ['mock-person-previous-ruler'] : [],
            otherRelatives: [],
          },
        } satisfies BridgeResponse<'game.get_family_tree'>;
      }
      case 'game.get_heir_candidates':
        return clone(heirCandidates());
      case 'game.set_designated_heir': {
        const personId = payloadString(payload, 'personId');
        const profile = personId ? personProfile(personId) : null;
        return {
          success: true,
          factionId: payloadString(payload, 'factionId') || MOCK_IDS.playerFaction,
          heirId: personId,
          heirName: profile?.name ?? '',
          message: personId ? 'Heir designated.' : 'Heir designation cleared.',
        } satisfies BridgeResponse<'game.set_designated_heir'>;
      }
      case 'game.get_encyclopedia_entries':
        return {
          categories: ['Realm', 'Military'],
          entries: [
            { id: 'realm-stability', title: 'Realm Stability', category: 'Realm', order: 1, content: '<header>Realm Stability</><bullet>Food, compliance, and power blocs shape stability.' },
            { id: 'field-armies', title: 'Field Armies', category: 'Military', order: 1, content: '<header>Field Armies</><bullet>Field armies combine formations under a commander.' },
          ],
          buildingCultures: [
            { id: rephsianCulture.id, label: rephsianCulture.name, icon: '' },
            { id: aurestianCulture.id, label: aurestianCulture.name, icon: '' },
          ],
          buildings: [
            {
              id: 'mock-building-forum',
              assetKey: '',
              name: 'Forum',
              category: 'administrative',
              categoryLabel: 'Administrative',
              cultureId: rephsianCulture.id,
              description: 'A civic centre where magistrates manage records, levies, and petitions.',
              effectsHtml: '',
              maxLevel: 3,
              price: 420,
              buildTimeDays: 120,
              upkeep: 18,
              chainName: 'Civic Centre',
              developedFrom: '',
              canBeDevelopedInto: ['mock-building-basilica'],
              requiredBuildings: [],
            },
            {
              id: 'mock-building-basilica',
              assetKey: '',
              name: 'Basilica',
              category: 'administrative',
              categoryLabel: 'Administrative',
              cultureId: rephsianCulture.id,
              description: 'A larger hall for law, contracts, and provincial administration.',
              effectsHtml: '',
              maxLevel: 3,
              price: 780,
              buildTimeDays: 180,
              upkeep: 28,
              chainName: 'Civic Centre',
              developedFrom: 'mock-building-forum',
              canBeDevelopedInto: [],
              requiredBuildings: ['mock-building-forum'],
            },
            {
              id: 'mock-building-hill-fort',
              assetKey: '',
              name: 'Hill Fort',
              category: 'defensive',
              categoryLabel: 'Defensive',
              cultureId: aurestianCulture.id,
              description: 'A fortified hilltop enclosure for frontier musters and local refuge.',
              effectsHtml: '',
              maxLevel: 2,
              price: 360,
              buildTimeDays: 110,
              upkeep: 14,
              chainName: 'Frontier Defences',
              developedFrom: '',
              canBeDevelopedInto: [],
              requiredBuildings: [],
            },
          ],
          unitCultures: [
            { id: rephsianCulture.id, label: rephsianCulture.name, icon: '' },
            { id: aurestianCulture.id, label: aurestianCulture.name, icon: '' },
          ],
          units: [
            {
              id: 'mock-unit-limitanei',
              name: 'Limitanei',
              unitType: 'infantry',
              unitTypeLabel: 'Infantry',
              isNaval: false,
              cultureId: rephsianCulture.id,
              cultureName: rephsianCulture.name,
              cultureIcon: '',
              portrait: '',
              tier: 2,
              maxStrength: 900,
              price: 180,
              buildTimeDays: 45,
              upkeep: 18,
              foodConsumption: 12,
              resourceCost: [{ name: 'Weapons', displayName: 'Weapons', amount: 24 }, { name: 'Armour', displayName: 'Armour', amount: 8 }],
              monthlyConsumption: [{ name: 'Grain', displayName: 'Grain', amount: 2 }],
              speed: 4,
              attackSpeed: 0.5,
              pierceDamage: 8,
              crushDamage: 5,
              slashDamage: 9,
              pierceArmour: 6,
              crushArmour: 4,
              slashArmour: 7,
              attack: 22,
              armour: 17,
              siegePower: 4,
              carryCapacity: 0,
              maxShips: 0,
              immuneToWinterAttrition: false,
              immuneToDesertAttrition: false,
              canAttackWhileMoving: false,
              description: 'Reliable border infantry trained for walls, roads, and steady defensive work.',
            },
            {
              id: 'mock-unit-clibanarii',
              name: 'Clibanarii',
              unitType: 'cavalry',
              unitTypeLabel: 'Cavalry',
              isNaval: false,
              cultureId: rephsianCulture.id,
              cultureName: rephsianCulture.name,
              cultureIcon: '',
              portrait: '',
              tier: 3,
              maxStrength: 700,
              price: 360,
              buildTimeDays: 75,
              upkeep: 42,
              foodConsumption: 20,
              resourceCost: [{ name: 'Horses', displayName: 'Horses', amount: 18 }, { name: 'Armour', displayName: 'Armour', amount: 16 }],
              monthlyConsumption: [{ name: 'Grain', displayName: 'Grain', amount: 4 }],
              speed: 7,
              attackSpeed: 0.6,
              pierceDamage: 12,
              crushDamage: 10,
              slashDamage: 8,
              pierceArmour: 9,
              crushArmour: 7,
              slashArmour: 9,
              attack: 30,
              armour: 25,
              siegePower: 0,
              carryCapacity: 0,
              maxShips: 0,
              immuneToWinterAttrition: false,
              immuneToDesertAttrition: false,
              canAttackWhileMoving: false,
              description: 'Armoured cavalry held for decisive charges and counter-attacks.',
            },
            {
              id: 'mock-unit-oathsworn',
              name: 'Oathsworn',
              unitType: 'infantry',
              unitTypeLabel: 'Infantry',
              isNaval: false,
              cultureId: aurestianCulture.id,
              cultureName: aurestianCulture.name,
              cultureIcon: '',
              portrait: '',
              tier: 3,
              maxStrength: 800,
              price: 300,
              buildTimeDays: 65,
              upkeep: 34,
              foodConsumption: 16,
              resourceCost: [{ name: 'Weapons', displayName: 'Weapons', amount: 28 }, { name: 'Leather', displayName: 'Leather', amount: 12 }],
              monthlyConsumption: [{ name: 'Grain', displayName: 'Grain', amount: 3 }],
              speed: 5,
              attackSpeed: 0.55,
              pierceDamage: 8,
              crushDamage: 7,
              slashDamage: 13,
              pierceArmour: 5,
              crushArmour: 5,
              slashArmour: 8,
              attack: 28,
              armour: 18,
              siegePower: 3,
              carryCapacity: 0,
              maxShips: 0,
              immuneToWinterAttrition: false,
              immuneToDesertAttrition: false,
              canAttackWhileMoving: false,
              description: 'Elite household warriors bound to their leader by public oath.',
            },
          ],
        } satisfies BridgeResponse<'game.get_encyclopedia_entries'>;
      case 'game.get_income_breakdown':
        return {
          ...economyOverview(),
          leakageCorruptOfficials: [] as Array<{ name: string; amount: number; id: string; linkType: string }>,
          leakageRetainedPercent: 100,
          settlements: [
            { name: 'Rephsia', amount: 6470, id: MOCK_IDS.settlement, linkType: 'settlement' },
            { name: 'Vallis Regio', amount: 1000, id: 'mock-settlement-vallis-regio', linkType: 'settlement' },
            { name: 'Lacertum', amount: 820, id: 'mock-settlement-lacertum', linkType: 'settlement' },
            { name: 'Ara Salimba', amount: 690, id: MOCK_IDS.portSettlement, linkType: 'settlement' },
            { name: 'Berginium', amount: 605, id: 'mock-settlement-berginium', linkType: 'settlement' },
            { name: 'Cortalium', amount: 155, id: 'mock-settlement-cortalium', linkType: 'settlement' },
          ],
          settlementTaxes: [
            { name: 'Rephsia', amount: 4700, id: MOCK_IDS.settlement, linkType: 'settlement' },
            { name: 'Vallis Regio', amount: 900, id: 'mock-settlement-vallis-regio', linkType: 'settlement' },
            { name: 'Lacertum', amount: 600, id: 'mock-settlement-lacertum', linkType: 'settlement' },
            { name: 'Ara Salimba', amount: 400, id: MOCK_IDS.portSettlement, linkType: 'settlement' },
            { name: 'Berginium', amount: 300, id: 'mock-settlement-berginium', linkType: 'settlement' },
            { name: 'Cortalium', amount: 160, id: 'mock-settlement-cortalium', linkType: 'settlement' },
          ],
          settlementTrades: [
            { name: 'Rephsia', amount: 1770, id: MOCK_IDS.settlement, linkType: 'settlement' },
            { name: 'Vallis Regio', amount: 300, id: 'mock-settlement-vallis-regio', linkType: 'settlement' },
            { name: 'Lacertum', amount: 250, id: 'mock-settlement-lacertum', linkType: 'settlement' },
            { name: 'Ara Salimba', amount: 160, id: MOCK_IDS.portSettlement, linkType: 'settlement' },
            { name: 'Berginium', amount: 120, id: 'mock-settlement-berginium', linkType: 'settlement' },
            { name: 'Cortalium', amount: 80, id: 'mock-settlement-cortalium', linkType: 'settlement' },
          ],
          armies: [
            { id: MOCK_IDS.military, parentId: '', name: 'Legio II Ferrata', commandName: 'Eastern Field Command', militaryId: MOCK_IDS.military, upkeep: 1640, maintenance: 500 },
            { id: 'mock-military-fidelis', parentId: MOCK_IDS.military, name: 'Legio III Fidelis', commandName: 'Western Field Command', militaryId: 'mock-military-fidelis', upkeep: 800, maintenance: 500 },
            { id: MOCK_IDS.navy, parentId: '', name: 'Classis Meridiana', commandName: 'Southern Fleet Command', militaryId: MOCK_IDS.navy, upkeep: 420, maintenance: 300 },
            { id: 'mock-military-auxilia-tamashek', parentId: 'mock-military-fidelis', name: 'Auxilia Tamashek', commandName: 'Frontier Command', militaryId: 'mock-military-auxilia-tamashek', upkeep: 180, maintenance: 200 },
          ],
          vassals: [
            { name: 'Ingalia', amount: 420, id: 'mock-faction-ingalia', linkType: 'faction' },
            { name: 'Tavarli', amount: 280, id: 'mock-faction-tavarli', linkType: 'faction' },
          ],
        } satisfies BridgeResponse<'game.get_income_breakdown'>;
      case 'game.get_geographic_summary': {
        const tier = payloadString(payload, 'tier', 'region');
        const key = payloadString(payload, 'key', 'Heartland');
        return {
          key,
          name: key === 'NamarisShore' ? 'Namaris Shore' : key === 'InnerDominion' ? 'Inner Dominion' : 'Aurelion Basin',
          tier,
          childTier: tier === 'domain' ? 'land' : 'settlement',
          totalPopulation: key === 'NamarisShore' ? 142000 : 384000,
          children: [
            { key: MOCK_IDS.settlement, name: 'Aurelion', population: 384000 },
            { key: MOCK_IDS.portSettlement, name: 'Namaris', population: 142000 },
          ],
        } satisfies BridgeResponse<'game.get_geographic_summary'>;
      }
      case 'game.get_world_glances': {
        const response = {
          viewportWidth: window.innerWidth || 1920,
          viewportHeight: window.innerHeight || 1080,
          snapshotRevision: 0,
          settlements: [
            { id: MOCK_IDS.settlement, debugShortId: mockDebugShortId(MOCK_IDS.settlement), screenX: 760, screenY: 410, scale: 1, opacity: 1, zOrder: 10, detailLevel: 'full', selected: false, targeted: false, name: 'Aurelion', faction: { ...playerFactionReference(), relation: 'own' }, hasOccupier: false, occupier: { ...playerFactionReference(), relation: 'own' }, isCapital: true, isProvincialCapital: true, settlementType: 'metropolis', badgeScale: 1.1475, health: 0.92, besieged: false, siegeProgress: 0, fortification: 78, fortificationProgress: 0.78, starving: false, diseased: false, mode: state.activeMapMode, mapModeId: state.activeMapMode, mapModeLabel: mockMapModeLabel(state.activeMapMode), monthlyIncome: 122, tradeValue: 31.5, corruption: 0.14, population: 384000, unrest: 0.08, loyalty: 76, garrison: 720, resources: [{ icon: '/assets/resources/Food.png', label: 'Food', stock: 1200 }, { icon: '/assets/resources/Stone.png', label: 'Stone', stock: 260 }], culture: { label: 'Rephsian', colour: rephsianCulture.colour }, religion: { label: 'Rephsian Pantheon', colour: rephsianReligion.colour }, governorName: 'Marcia Vennor', governorDebugShortId: mockDebugShortId(MOCK_IDS.governor), complianceTargetLabel: 'Governor:', complianceTargetName: 'Marcia Vennor', complianceTargetIsRuler: false, complianceLuxuryLabel: 'Luxuries:', complianceLuxuryStatus: '', regionName: 'Aurelion Basin', landName: 'Inner Dominion', domainName: 'Heartland', independent: true, overlordName: '', bishopName: 'Bishop Caldus', hasBuildItem: true, buildItem: { label: 'Aqueduct', icon: '/assets/icons/I_BuildingsQuickButton.png', progress: 0.48 }, warWithPlayer: false },
            { id: MOCK_IDS.portSettlement, debugShortId: mockDebugShortId(MOCK_IDS.portSettlement), screenX: 1120, screenY: 620, scale: 0.94, opacity: 1, zOrder: 9, detailLevel: 'name', selected: false, targeted: false, name: 'Namaris', faction: { ...playerFactionReference(), relation: 'own' }, hasOccupier: false, occupier: { ...playerFactionReference(), relation: 'own' }, isCapital: false, isProvincialCapital: false, settlementType: 'port', badgeScale: 1.35, health: 0.84, besieged: false, siegeProgress: 0, fortification: 36, fortificationProgress: 0.36, starving: true, diseased: false, mode: state.activeMapMode, mapModeId: state.activeMapMode, mapModeLabel: mockMapModeLabel(state.activeMapMode), monthlyIncome: 46, tradeValue: 18.4, corruption: 0.28, population: 142000, unrest: 0.18, loyalty: 58, garrison: 360, resources: [{ icon: '/assets/resources/Food.png', label: 'Food', stock: 430 }, { icon: '/assets/resources/Stone.png', label: 'Stone', stock: 90 }], culture: { label: 'Rephsian', colour: rephsianCulture.colour }, religion: { label: 'Rephsian Pantheon', colour: rephsianReligion.colour }, governorName: '', governorDebugShortId: 0, complianceTargetLabel: 'Governor:', complianceTargetName: '', complianceTargetIsRuler: false, complianceLuxuryLabel: 'Luxuries:', complianceLuxuryStatus: '', regionName: 'Namaris Shore', landName: 'Inner Dominion', domainName: 'Heartland', independent: true, overlordName: '', bishopName: '', hasBuildItem: true, buildItem: { label: 'Dromons', icon: '/assets/icons/I_NaviesQuickButton.png', progress: 0.22 }, warWithPlayer: false },
          ],
          ports: [
            { id: MOCK_IDS.portSettlement, screenX: 1088, screenY: 650, scale: 0.94, opacity: 1, zOrder: 10, detailLevel: 'name', selected: false, targeted: false, faction: { ...playerFactionReference(), relation: 'own' }, level: 3, blockaded: true },
          ],
          armies: [
            { id: MOCK_IDS.military, debugShortId: mockDebugShortId(MOCK_IDS.military), screenX: 900, screenY: 520, scale: 1, opacity: 1, zOrder: 12, detailLevel: 'full', faction: { ...playerFactionReference(), relation: 'own' }, strength: 6800, morale: 84, retreating: false, tier: 3, raiding: false, selected: false, targeted: false, blockading: false, embarkedArmyCount: 0, attrition: false, attritionIcon: '', garrisoned: false, garrisonIndex: 0 },
            { id: 'mock-military-detachment', debugShortId: mockDebugShortId('mock-military-detachment'), screenX: 820, screenY: 570, scale: 0.9, opacity: 1, zOrder: 11, detailLevel: 'full', faction: { ...playerFactionReference(), relation: 'own' }, strength: 1600, morale: 71, retreating: false, tier: 2, raiding: false, selected: false, targeted: false, blockading: false, embarkedArmyCount: 0, attrition: false, attritionIcon: '', garrisoned: false, garrisonIndex: 0 },
          ],
          navies: [
            { id: MOCK_IDS.navy, debugShortId: mockDebugShortId(MOCK_IDS.navy), screenX: 1060, screenY: 610, scale: 1, opacity: 1, zOrder: 12, detailLevel: 'full', faction: { ...playerFactionReference(), relation: 'own' }, strength: 1800, morale: 76, retreating: false, tier: 2, raiding: false, selected: false, targeted: false, blockading: false, embarkedArmyCount: 2, attrition: false, attritionIcon: '', garrisoned: false, garrisonIndex: 0 },
            { id: 'mock-navy-rival', debugShortId: mockDebugShortId('mock-navy-rival'), screenX: 1200, screenY: 540, scale: 0.9, opacity: 1, zOrder: 11, detailLevel: 'full', faction: { ...rivalFactionReference(), relation: 'enemy' }, strength: 1200, morale: 68, retreating: false, tier: 2, raiding: false, selected: false, targeted: false, blockading: true, embarkedArmyCount: 0, attrition: false, attritionIcon: '', garrisoned: false, garrisonIndex: 0 },
          ],
          convoys: mockWorldConvoys(state),
          battles: [
            {
              id: MOCK_IDS.battle,
              screenX: 980,
              screenY: 450,
              scale: 1,
              opacity: 1,
              zOrder: 14,
              detailLevel: 'full',
              targeted: false,
              attacker: {
                participants: [
                  worldBattleParticipant({ ...customFactionReference('mock-faction-berginian-rebel', 'Berginian Rebellion', '#8B3A1F', '#C9A85A', 'Rephsian', 'Rephsian_4'), relation: 'enemy' }, 3, 'Berginian Rebellion', 'Dux Marcus Vendian', 'mock-person-marcus-vendian', 3600),
                  worldBattleParticipant({ ...customFactionReference('mock-faction-vendian-clients', 'Vendian Clients', '#68402A', '#C9A85A', 'Rephsian', 'Rephsian_5'), relation: 'enemy' }, 2, 'Vendian Outriders', 'Tribunus Aetius', 'mock-person-aetius', 680),
                ],
                totalStrength: 4280,
                morale: 62,
                lastLosses: 320,
              },
              defender: {
                participants: [
                  worldBattleParticipant({ ...playerFactionReference(), name: 'Imperial Rephsia', colour: '#5B2C5B', relation: 'own' }, 4, 'Imperial Field Army', 'Comes Flavius Lucius', 'mock-person-flavius-lucius', 2420),
                  worldBattleParticipant({ ...subjectFactionReference(), relation: 'ally' }, 2, 'Berginian Reserve', 'Legatus Cassius', 'mock-person-cassius', 1220),
                ],
                totalStrength: 3640,
                morale: 74,
                lastLosses: 260,
              },
            },
            {
              id: 'mock-battle-ford',
              screenX: 720,
              screenY: 650,
              scale: 0.88,
              opacity: 1,
              zOrder: 13,
              detailLevel: 'full',
              targeted: false,
              attacker: {
                participants: [
                  worldBattleParticipant({ ...rivalFactionReference(), relation: 'enemy' }, 2, 'Ford Raiders', 'Teren Askor', 'mock-person-rival-marshal', 1400),
                  worldBattleParticipant({ ...customFactionReference('mock-faction-raiders', 'Salt Road Raiders', '#604040', '#B8A070', 'Aurestian', 'Aurestian_3'), relation: 'enemy' }, 1, 'Road Band', 'Varo Kel', 'mock-person-varo-kel', 800),
                ],
                totalStrength: 2200,
                morale: 61,
                lastLosses: 80,
              },
              defender: {
                participants: [
                  worldBattleParticipant({ ...playerFactionReference(), relation: 'own' }, 2, 'Aurelion Detachment', 'Cassian Arcastus', MOCK_IDS.heir, 1600),
                  worldBattleParticipant({ ...subjectFactionReference(), relation: 'ally' }, 1, 'Meridian Watch', 'Iulia Seran', 'mock-person-subject', 900),
                ],
                totalStrength: 2500,
                morale: 72,
                lastLosses: 40,
              },
            },
          ],
        } satisfies BridgeResponse<'game.get_world_glances'>;
        if (!state.showSettlementGlances) {
          response.settlements = [];
          response.ports = [];
        }
        if (!state.showMilitaryGlances) {
          response.armies = [];
          response.navies = [];
          response.battles = [];
        }
        return response;
      }
      case 'game.get_world_glance_tooltip': {
        const kind = payloadString(payload, 'kind');
        const id = payloadString(payload, 'id');
        if (kind === 'port') {
          return {
            found: true,
            kind,
            id,
            name: 'Namaris Port',
            settlementName: 'Namaris',
            factionName: playerFactionReference().name,
            debugShortId: mockDebugShortId(MOCK_IDS.portSettlement),
            factionDebugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
            tradeValue: 18.4,
            warWithPlayer: false,
            blockaded: true,
            blockadingNavies: 1,
            blockadingStrength: 1200,
            dockedNavyName: 'Classis Meridian',
            dockedNavyStrength: 1800,
            originName: '',
            destinationName: '',
            purpose: '',
            purposeDetails: '',
            progress: 0,
            etaDays: 0,
            routeType: '',
            clusterCount: 0,
            attackerName: '',
            defenderName: '',
            attackerCount: 0,
            defenderCount: 0,
            cargo: [],
          } satisfies BridgeResponse<'game.get_world_glance_tooltip'>;
        }
        return {
          found: true,
          kind,
          id,
          name: '',
          settlementName: '',
          factionName: playerFactionReference().name,
          debugShortId: 0,
          factionDebugShortId: mockDebugShortId(MOCK_IDS.playerFaction),
          tradeValue: 0,
          warWithPlayer: false,
          blockaded: false,
          blockadingNavies: 0,
          blockadingStrength: 0,
          dockedNavyName: '',
          dockedNavyStrength: 0,
          originName: 'Aurelion',
          destinationName: 'I Field Army',
          purpose: 'Army Resupply',
          purposeDetails: 'I Field Army',
          progress: 0.58,
          etaDays: 5.2,
          routeType: 'road',
          clusterCount: 1,
          attackerName: kind === 'battle' ? 'Berginian Rebellion' : '',
          defenderName: kind === 'battle' ? 'Imperial Field Army' : '',
          attackerCount: kind === 'battle' ? 2 : 0,
          defenderCount: kind === 'battle' ? 2 : 0,
          cargo: [
            { icon: '/assets/icons/Resources/I_Grain.png', label: 'Grain', amount: 420 },
            { icon: '/assets/icons/Resources/I_Weapons.png', label: 'Weapons', amount: 160 },
          ],
        } satisfies BridgeResponse<'game.get_world_glance_tooltip'>;
      }
      case 'game.get_province_tooltip':
        return {
          visible: false,
          kind: '',
          screenX: 0,
          screenY: 0,
          viewportWidth: window.innerWidth || 1920,
          viewportHeight: window.innerHeight || 1080,
          altHeld: false,
          expanded: false,
          autoExpanded: false,
          mapModeId: '',
          mapModeLabel: '',
          mapModeEntries: [],
          terrainType: '',
          terrainName: '',
          terrainIcon: '',
          hasSnowAttrition: false,
          hasDesertAttrition: false,
          attritionIcon: '',
          settlementId: '',
          settlementName: '',
          settlementType: '',
          health: 0,
          besieged: false,
          siegeProgress: 0,
          fortification: 0,
          fortificationProgress: 0,
          starving: false,
          diseased: false,
          factionLabel: '',
          hasFaction: false,
          faction: { ...playerFactionReference() },
          occupierLabel: '',
          hasOccupier: false,
          occupier: { ...playerFactionReference() },
          populationLabel: '',
          populationValue: '',
          typeLabel: '',
          typeValue: '',
          locationLabel: '',
          locationValue: '',
          portStatus: '',
          religionLabel: '',
          religionShares: [],
          cultureLabel: '',
          cultureShares: [],
          monthlyIncome: 0,
          tradeValue: 0,
          corruption: 0,
          population: 0,
          unrest: 0,
          loyalty: 0,
          garrison: 0,
          resources: [],
          resourceProduction: [],
          stockpiles: [],
          diseaseInfo: {
            active: false,
            name: '',
            severityLabel: '',
            severity: 0,
            daysRemaining: 0,
            durationLabel: '',
            totalDeaths: 0,
            foodPenalty: 0,
            resourcePenalty: 0,
            taxPenalty: 0,
            mortalityRate: 0,
            severityReduction: 0,
            foodShortage: 0,
          },
          cultureInfo: { label: '', colour: '' },
          religionInfo: { label: '', colour: '' },
          governorName: '',
          governorDebugShortId: 0,
          complianceTargetLabel: 'Governor:',
          complianceTargetName: '',
          complianceTargetIsRuler: false,
          complianceLuxuryLabel: 'Luxuries:',
          complianceLuxuryStatus: '',
          regionName: '',
          landName: '',
          domainName: '',
          independent: false,
          overlordName: '',
          bishopName: '',
          hasBuilding: false,
          building: { label: '', progress: 0 },
          warWithPlayer: false,
          actionHint: '',
          landingTitle: '',
          landingInstruction: '',
          convoyTitle: '',
          convoyFactionLabel: '',
          convoyPurposeLabel: '',
          convoyPurpose: '',
          convoyRouteLabel: '',
          convoyRoute: '',
          convoyOriginLabel: '',
          convoyOrigin: '',
          convoyDestinationLabel: '',
          convoyDestination: '',
          convoyProgressLabel: '',
          convoyProgress: '',
          convoyEtaLabel: '',
          convoyEta: '',
          convoyCargoLabel: '',
          convoyPurposeDetails: '',
          convoyCargo: [],
        } satisfies BridgeResponse<'game.get_province_tooltip'>;
      case 'game.get_victory_conditions':
        if (state.provinceMode) {
          return { enabled: false, completedConditions: 0, totalConditions: 0, tiers: [] } satisfies BridgeResponse<'game.get_victory_conditions'>;
        }
        return { enabled: true, completedConditions: 4, totalConditions: 7, tiers: [
          { id: 'default', name: 'Survival', iconPath: '/assets/icons/Victory/I_Victory_Bronze.png', isAchieved: true, conditions: [{ id: 'default-year', kind: 'deadline', label: 'Survive the Collapse', description: '<p>Keep the realm alive until the survival target year.</p>', domains: [], progress: 100, detailText: 'Survival secured.', isMet: true }] },
          { id: 'extended', name: 'Restoration', iconPath: '/assets/icons/Victory/I_Victory_Silver.png', isAchieved: true, conditions: [{ id: 'extended-domains', kind: 'domains', label: 'Restore Required Domains', description: '<p>Control every domain required for restoration.</p>', domains: [], progress: 100, detailText: 'Required domains controlled.', isMet: true }, { id: 'extended-year', kind: 'deadline', label: 'Meet Restoration Deadline', description: '<p>Complete restoration before the target year.</p>', domains: [], progress: 100, detailText: 'Deadline met.', isMet: true }] },
          { id: 'ultimate', name: 'Total Victory', iconPath: '/assets/icons/Victory/I_Victory_Gold.png', isAchieved: false, conditions: [{ id: 'ultimate-domains', kind: 'domains', label: 'Rule Every Required Domain', description: '<p>Control every domain required for total victory.</p>', domains: [], progress: 64, detailText: '5 of 8 domains controlled.', isMet: false }, { id: 'ultimate-conversion', kind: 'conversion', label: 'Convert the Realm', description: '<p>Bring every settlement to the required state religion threshold.</p>', domains: [], progress: 72, detailText: '72% realm conversion.', isMet: false }, { id: 'ultimate-year', kind: 'deadline', label: 'Meet Ultimate Deadline', description: '<p>Complete total victory before the target year.</p>', domains: [], progress: 100, detailText: 'Still within the deadline.', isMet: true }] },
        ] } satisfies BridgeResponse<'game.get_victory_conditions'>;
      case 'game.get_achievements':
        return {
          totalAchievements: 5,
          unlockedAchievements: 2,
          completionPercent: 0.4,
          steamAvailable: true,
          achievementsEnabled: false,
          disabledReason: 'A mod is enabled.',
          disabledReasons: ['A mod is enabled.'],
          achievements: [
            { id: 'SURVIVE_COLLAPSE', displayName: 'Weather the Collapse', description: 'Survive the first year.', effectiveDescription: 'Survive the first year.', category: 'challenge', rarity: 'common', hidden: false, unlocked: true, currentProgress: 1, targetProgress: 1, progressPercent: 1, progressText: '1/1', canBeEarned: true, iconUrl: '/assets/icons/Victory/I_Victory_Bronze.png' },
            { id: 'MASTER_OF_ALL', displayName: 'Master of All', description: 'Have a ruler with all four stats above 40.', effectiveDescription: 'Have a ruler with all four stats above 40.', category: 'characters', rarity: 'legendary', hidden: false, unlocked: false, currentProgress: 0, targetProgress: 1, progressPercent: 0, progressText: '0/1', canBeEarned: false, iconUrl: '/assets/icons/Victory/I_Victory_Gold.png' },
            { id: 'BATTLE_HARDENED', displayName: 'Battle Hardened', description: 'Win ten battles.', effectiveDescription: 'Win ten battles.', category: 'military', rarity: 'uncommon', hidden: false, unlocked: false, currentProgress: 4, targetProgress: 10, progressPercent: 0.4, progressText: '4/10', canBeEarned: false, iconUrl: '/assets/icons/Victory/I_Victory_Silver.png' },
            { id: 'OLD_GODS_ENDURE', displayName: 'Old Gods Endure', description: 'Restore five old shrines.', effectiveDescription: 'Restore five old shrines.', category: 'religion', rarity: 'rare', hidden: false, unlocked: true, currentProgress: 5, targetProgress: 5, progressPercent: 1, progressText: '5/5', canBeEarned: true, iconUrl: '/assets/icons/Victory/I_Victory_Gold.png' },
            { id: 'HIDDEN_TEST', displayName: 'Hidden Achievement', description: 'Find the hidden condition.', effectiveDescription: 'Hidden achievement', category: 'hidden', rarity: 'epic', hidden: true, unlocked: false, currentProgress: 0, targetProgress: 1, progressPercent: 0, progressText: '0/1', canBeEarned: false, iconUrl: '/assets/icons/Victory/I_Victory_Bronze.png' },
          ],
        } satisfies BridgeResponse<'game.get_achievements'>;
      case 'game.loading_screen':
        return { visible: false, progress: 0, background: '', tip: '' } satisfies BridgeResponse<'game.loading_screen'>;
      case 'game.get_settings':
      case 'game.reset_settings':
        return settingsResponse();
      case 'game.apply_settings':
        return { applied: true } satisfies BridgeResponse<'game.apply_settings'>;
      case 'game.get_initial_setup':
        return { completed: mockInitialSetupCompleted, forceOpen: false } satisfies BridgeResponse<'game.get_initial_setup'>;
      case 'game.complete_initial_setup':
        mockInitialSetupCompleted = true;
        return { completed: true } satisfies BridgeResponse<'game.complete_initial_setup'>;
      case 'game.get_languages':
        return { currentLocale: 'en', languages: [{ code: 'en', name: 'English' }, { code: 'de', name: 'Deutsch' }] } satisfies BridgeResponse<'game.get_languages'>;
      case 'game.list_mods':
        return { mods: [
          { id: 'mock-mod', name: 'Mock Dev Content', version: '1.0', gameVersion: '2.05.4', author: 'Local', description: 'Fixture mod entry for browser UI testing.', loadOrder: 0, enabled: true, pakMounted: false, hasScripts: false, compatible: true, compatibilityError: '', canUploadToWorkshop: true },
          { id: 'mock-balance-mod', name: 'Mock Balance Pack', version: '0.2', gameVersion: '2.05.4', author: 'Local', description: 'Second fixture entry for mod list spacing.', loadOrder: 1, enabled: false, pakMounted: false, hasScripts: true, compatible: true, compatibilityError: '', canUploadToWorkshop: true },
        ], steamWorkshopAvailable: true, workshopCategories: ['Campaign', 'Map', 'Gameplay', 'Faction', 'Units', 'Buildings', 'UI', 'Total Conversion', 'Translation'] } satisfies BridgeResponse<'game.list_mods'>;
      case 'game.list_saves':
        return { loadError: '', saves: [
          { slotName: 'mock-autosave', displayName: 'Mock Autosave', playerCharacterName: 'Valen Arcastus', playerFactionName: 'Rephsian Empire', gameDateString: '17 Summer 742', timestamp: '2026-05-01T00:00:00Z', isAutosave: true, factionId: MOCK_IDS.playerFaction, factionColour: PLAYER_COLOUR, factionSecondaryColour: PLAYER_SECONDARY, factionEmblem: 'Rephsian_1', cultureGroup: 'Rephsian', characterGender: 'male' },
          { slotName: 'mock-manual-save', displayName: 'Before the Western Pass', playerCharacterName: 'Cassian Arcastus', playerFactionName: 'Rephsian Empire', gameDateString: '3 Autumn 742', timestamp: '2026-04-28T18:30:00Z', isAutosave: false, factionId: MOCK_IDS.playerFaction, factionColour: PLAYER_COLOUR, factionSecondaryColour: PLAYER_SECONDARY, factionEmblem: 'Rephsian_1', cultureGroup: 'Rephsian', characterGender: 'male' },
        ] } satisfies BridgeResponse<'game.list_saves'>;
      case 'game.list_new_game_maps':
        return { maps: [
          { id: 'Campaign', displayName: 'Grand Campaign', menuKicker: 'Year 784 - Fractured Dominion', menuDescription: GRAND_CAMPAIGN_MENU_DESCRIPTION, menuImageUrl: '/assets/events/foreign-invasion.png', menuOrder: 0, requiresFactionSelection: true, isLocked: false },
          { id: 'Tutorial', displayName: 'Tutorial', menuKicker: 'Guided Start', menuDescription: TUTORIAL_MENU_DESCRIPTION, menuImageUrl: '/assets/events/military-chain-of-command.png', menuOrder: 10, requiresFactionSelection: false, isLocked: false },
        ] } satisfies BridgeResponse<'game.list_new_game_maps'>;
      case 'game.get_new_game_map_faction_selection':
        return {
          mapId: payloadString(payload, 'mapId', 'Campaign'),
          displayName: 'Grand Campaign',
          factionSelectionDescription: GRAND_CAMPAIGN_FACTION_SELECTION_DESCRIPTION,
          defaultPlayerFactionBaseName: 'RephsianDominion',
          startingDateLabel: '5/10/784',
          paperMapUrl: '/assets/world-map-painted.jpg',
          politicalMapUrl: '',
          mapWidth: 1200,
          mapHeight: 720,
          factions: [
            {
              id: 1,
              baseName: 'RephsianDominion',
              displayName: 'Rephsian Empire',
              realm: 'Dominion',
              culture: rephsianCulture.id,
              cultureDisplayName: rephsianCulture.name,
              cultureGroup: 'Rephsian',
              cultureInfo: rephsianCulture,
              playable: true,
              fullGamePlayable: true,
              isRebel: false,
              religion: rephsianReligion.id,
              religionDisplayName: rephsianReligion.name,
              religionInfo: rephsianReligion,
              capitalSettlementName: 'Aurelion',
              hasCapitalPosition: true,
              capitalPosX: 0.36,
              capitalPosY: 0.46,
              government: 'Imperial Court',
              governmentDisplayName: 'Imperial Court',
              governmentDescription: 'A centralised imperial state ruled through court offices, appointed heirs, standing forces and subordinate provincial commands.',
              governmentCapabilities: [
                'Maintains standing armies instead of temporary levies.',
                'Can manage the imperial court.',
              ],
              gold: 4280,
              primaryColour: [126, 38, 54],
              secondaryColour: [201, 168, 90],
              emblemRowName: 'Rephsian_1',
              emblemAssetPath: '',
              cultureIconPath: '',
              religionIconPath: '',
              lands: ['Aurelion Basin', 'Namaris Shore'],
              regionCount: 2,
              settlementCount: 14,
              population: 1284000,
              militaryStrength: 18400,
              stats: mockScenarioFactionStats(18400, 4280, 1284000, 14),
              overlordBaseName: '',
              subjectSubtype: '',
              treaties: [
                mockScenarioTreaty('MeridianPrefecture', 'Meridian Prefecture', 'Subject', 'Province', 'This faction rules a province under the dominion.'),
                mockScenarioTreaty('SaltLeague', 'Salt League', 'TradeAgreement', 'Trade Agreement', 'Both factions exchange goods through an open trade pact.'),
              ],
              leader: {
                hasLeader: true,
                displayName: 'Valen Arcastus',
                dynasty: 'Arcastus',
                gender: 'male',
                born: '691',
                portraitLayers: mockPortraitLayers(MALE_PORTRAIT_1),
                fame: 620,
                traits: [
                  mockScenarioTrait('Austere', 'Austere', 'Keeps the court disciplined through precise expectations.', [mockScenarioEffect('governance', 1)]),
                  mockScenarioTrait('Ambitious', 'Ambitious', 'Seeks honours and offices with little prompting.', [mockScenarioEffect('authority', 1), mockScenarioEffect('loyalty', -1)]),
                ],
                stats: [
                  mockScenarioStat('authority', 9, [{ label: 'Ambitious', value: 1 }]),
                  mockScenarioStat('governance', 8, [{ label: 'Austere', value: 1 }]),
                ],
              },
              geometry: { fillPath: 'M160 140 L560 120 L620 420 L180 450 Z', borderPath: 'M160 140 L560 120 L620 420 L180 450 Z' },
            },
            {
              id: 2,
              baseName: 'AurestianLeague',
              displayName: 'Aurestian League',
              realm: 'League',
              culture: aurestianCulture.id,
              cultureDisplayName: aurestianCulture.name,
              cultureGroup: 'Aurestian',
              cultureInfo: aurestianCulture,
              playable: true,
              fullGamePlayable: true,
              isRebel: false,
              religion: rivalReligion.id,
              religionDisplayName: rivalReligion.name,
              religionInfo: rivalReligion,
              capitalSettlementName: 'Velath Keep',
              hasCapitalPosition: true,
              capitalPosX: 0.73,
              capitalPosY: 0.42,
              government: 'League Council',
              governmentDisplayName: 'League Council',
              governmentDescription: 'A city-led compact where local notables, harbour wealth and militia captains bargain over policy.',
              governmentCapabilities: [
                'Raises levies through city militias and civic obligations.',
                'Leadership is appointed through city institutions.',
              ],
              gold: 1130,
              primaryColour: [49, 93, 112],
              secondaryColour: [211, 192, 160],
              emblemRowName: 'Aurestian_1',
              emblemAssetPath: '',
              cultureIconPath: '',
              religionIconPath: '',
              lands: ['Western Pass', 'Velath March'],
              regionCount: 2,
              settlementCount: 7,
              population: 642000,
              militaryStrength: 9100,
              stats: mockScenarioFactionStats(9100, 1130, 642000, 7),
              overlordBaseName: '',
              subjectSubtype: '',
              treaties: [
                mockScenarioTreaty('SaltLeague', 'Salt League', 'DefensiveAlliance', 'Defensive Alliance', 'Both factions answer defensive calls to war.'),
                mockScenarioTreaty('RephsianDominion', 'Rephsian Empire', 'NonAggression', 'Non-Aggression Pact', 'Both factions agree not to start a war against each other.'),
              ],
              leader: {
                hasLeader: true,
                displayName: 'Soran Velk',
                dynasty: 'Velk',
                gender: 'male',
                born: '704',
                portraitLayers: mockPortraitLayers(MALE_PORTRAIT_2),
                fame: 410,
                traits: [
                  mockScenarioTrait('LegendaryGeneral', 'Legendary General', 'Commands with a reputation earned over decades of campaigning.', [mockScenarioEffect('tactics', 2)]),
                  mockScenarioTrait('Patient', 'Patient', 'Waits for the right moment before committing to a course.', [mockScenarioEffect('cunning', 1)]),
                ],
                stats: [
                  mockScenarioStat('tactics', 8, [{ label: 'Legendary General', value: 2 }]),
                  mockScenarioStat('cunning', 6, [{ label: 'Patient', value: 1 }]),
                ],
              },
              geometry: { fillPath: 'M610 150 L1010 120 L1060 440 L620 420 Z', borderPath: 'M610 150 L1010 120 L1060 440 L620 420 Z' },
            },
          ],
          wars: [
            { id: 'mock-war-rival', name: 'War for the Western Passes', startedDay: '17 Spring 742', attacker: { leaderFactionBaseName: 'RephsianDominion', leaderFactionDisplayName: 'Rephsian Empire', memberFactionBaseNames: ['RephsianDominion', 'MeridianPrefecture'], militaryStrength: 18400 }, defender: { leaderFactionBaseName: 'AurestianLeague', leaderFactionDisplayName: 'Aurestian League', memberFactionBaseNames: ['AurestianLeague', 'SaltLeague'], militaryStrength: 9100 } },
            { id: 'mock-war-road', name: 'Salt Road Raids', startedDay: '2 Summer 742', attacker: { leaderFactionBaseName: 'AurestianLeague', leaderFactionDisplayName: 'Aurestian League', memberFactionBaseNames: ['AurestianLeague', 'SaltLeague'], militaryStrength: 9100 }, defender: { leaderFactionBaseName: 'RephsianDominion', leaderFactionDisplayName: 'Rephsian Empire', memberFactionBaseNames: ['RephsianDominion', 'MeridianPrefecture'], militaryStrength: 18400 } },
          ],
        } satisfies BridgeResponse<'game.get_new_game_map_faction_selection'>;
      case 'game.pick_new_game_map_faction':
        return { baseName: 'RephsianDominion' } satisfies BridgeResponse<'game.pick_new_game_map_faction'>;
      case 'game.faction_selection_tabletop':
        return {
          baseName: payloadString(payload, 'command') === 'pick' ? 'RephsianDominion' : '',
        } satisfies BridgeResponse<'game.faction_selection_tabletop'>;
      case 'game.continue':
        state.appMode = 'ingame';
        emitAppMode(emit);
        emitGameState(emit);
        emitResources(emit);
        return { started: true, slotName: 'mock-autosave' } satisfies BridgeResponse<'game.continue'>;
      case 'game.start_scenario_map':
      case 'game.load_save':
        state.appMode = 'ingame';
        emitAppMode(emit);
        return action === 'game.load_save' ? ({ started: true } satisfies BridgeResponse<'game.load_save'>) : undefined;
      case 'game.quit':
      case 'game.restart':
        state.appMode = 'mainmenu';
        emitAppMode(emit);
        return undefined;
      case 'game.get_faction_interactions':
        return { targetFactionId: payloadString(payload, 'targetFactionId', MOCK_IDS.rivalFaction), interactions: [
          { id: 'send-envoy', name: 'Send Envoy', description: 'Attempt to improve relations through a formal mission.', descriptionLines: mockDisplayLines('Attempt to improve relations through a formal mission.'), effectLines: mockDisplayLines('Cost: 120 gold. Time: 45 days. Success chance: 68%.'), iconId: 'CallToWarInteraction', backgroundId: 'CallToWarInteraction', showInQuickInteractionMenu: true, isEdict: false, goldCost: 120, durationDays: 45, cooldownDays: 180, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 14, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 68, needsSettlementSelection: false, canStartSettlementSelection: false, settlementSelectionPrompt: '', needsInputSelection: false, canStartInputSelection: false, reasons: [], successFactors: [{ name: 'Assigned diplomat', percent: 18 }, { name: 'Recent trade', percent: 8 }] },
          { id: 'pressure-council', name: 'Isolate Rival Court', description: 'Lean on friendly merchants to isolate the rival court.', descriptionLines: mockDisplayLines('Lean on friendly merchants to isolate the rival court.'), effectLines: mockDisplayLines('Cost: 180 gold. Time: 60 days. Success chance: 46%.'), iconId: 'CallToWarInteraction', backgroundId: 'CallToWarInteraction', showInQuickInteractionMenu: false, isEdict: false, goldCost: 180, durationDays: 60, cooldownDays: 210, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 18, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 46, needsSettlementSelection: false, canStartSettlementSelection: false, settlementSelectionPrompt: '', needsInputSelection: false, canStartInputSelection: false, reasons: [], successFactors: [{ name: 'Border leverage', percent: 12 }, { name: 'War exhaustion', percent: 10 }] },
        ], lastCompletedInteractionId: '', lastInteractionSucceeded: false, lastInteractionCompletedDate: 0, lastInteractionOutcomeText: '' } satisfies BridgeResponse<'game.get_faction_interactions'>;
      case 'game.get_spy_interactions':
        return { targetFactionId: payloadString(payload, 'targetFactionId', MOCK_IDS.rivalFaction), interactions: [
          { id: 'steal-correspondence', name: 'Steal Correspondence', description: 'Search for useful letters and private obligations.', effectLines: mockDisplayLines('Cost: 160 gold. Time: 60 days. Success chance: 54%.'), iconId: 'SpreadDisinformationInteraction', backgroundId: 'SpreadDisinformationInteraction', goldCost: 160, durationDays: 60, cooldownDays: 120, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 18, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 54, needsInputSelection: false, canStartInputSelection: false, reasons: [], successFactors: [{ name: 'Spy network', percent: 24 }, { name: 'Court informant', percent: 10 }] },
          { id: 'spread-rumours', name: 'Spread Rumours', description: 'Turn uncertain captains against the enemy leadership.', effectLines: mockDisplayLines('Cost: 210 gold. Time: 75 days. Success chance: 42%.'), iconId: 'SpreadDisinformationInteraction', backgroundId: 'SpreadDisinformationInteraction', goldCost: 210, durationDays: 75, cooldownDays: 160, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 22, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 42, needsInputSelection: false, canStartInputSelection: false, reasons: [], successFactors: [{ name: 'Intrigue skill', percent: 16 }, { name: 'Trade contacts', percent: 7 }] },
        ], lastCompletedInteractionId: '', lastInteractionSucceeded: false, lastInteractionCompletedDate: 0, lastInteractionOutcomeText: '' } satisfies BridgeResponse<'game.get_spy_interactions'>;
      case 'game.get_person_quick_interactions':
        return { personId: payloadString(payload, 'personId', MOCK_IDS.governor), playerGold: 4280, interactions: [
          { id: 'OfferGiftMinor', name: 'Host Supper', description: 'Invite the character to a private supper with trusted friends.', effectLines: mockDisplayLines('Cost: 90 gold. Time: 10 days. Success chance: 72%.'), iconId: 'OfferGift', backgroundId: 'OfferGift', showInQuickInteractionMenu: true, category: 'Court', difficulty: 'Medium', goldCost: 90, durationDays: 10, cooldownDays: 60, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 8, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 72, needsInitiatorSelection: false, needsGiftSelection: false, initiatorRequirementDescription: '', reasons: [], successFactors: [{ name: 'Shared allies', percent: 9 }, { name: 'Court mood', percent: 6 }], initiatorCandidates: [], giftOptions: [] },
        ], lastCompletedInteractionId: '', lastInteractionSucceeded: false, lastInteractionCompletedDate: 0, lastInteractionOutcomeText: '' } satisfies BridgeResponse<'game.get_person_quick_interactions'>;
      case 'game.get_person_interaction_options':
        return { playerGold: 4280, interaction:
          { id: payloadString(payload, 'interactionId', 'OfferGift'), name: 'Send Gift', description: 'Offer a carefully chosen gift.', effectLines: mockDisplayLines('Cost depends on gift. Instant. Success chance: 100%.'), iconId: 'OfferGift', backgroundId: 'OfferGift', showInQuickInteractionMenu: false, category: 'Court', difficulty: 'Easy', goldCost: 120, durationDays: 0, cooldownDays: 90, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 0, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 100, needsInitiatorSelection: false, needsGiftSelection: true, initiatorRequirementDescription: '', reasons: [], successFactors: [{ name: 'Personal taste', percent: 12 }, { name: 'Public ceremony', percent: 8 }], initiatorCandidates: [], giftOptions: [{ index: 0, name: 'Silver Cup', description: 'A formal gift for a senior office holder.', cost: 120, relationshipBonus: 8, iconPath: '/assets/icons/Gifts/GoldChestMedium.png' }, { index: 1, name: 'Gilded Charter', description: 'A legal privilege wrapped as a personal favour.', cost: 220, relationshipBonus: 13, iconPath: '/assets/icons/Gifts/GoldChestMedium.png' }] },
        } satisfies BridgeResponse<'game.get_person_interaction_options'>;
      case 'game.get_person_interactions':
        return { personId: payloadString(payload, 'personId', MOCK_IDS.governor), playerGold: 4280, interactions: [
          { id: 'OfferGift', name: 'Send Gift', description: 'Offer a carefully chosen gift.', effectLines: mockDisplayLines('Cost depends on gift. Instant. Success chance: 100%.'), iconId: 'OfferGift', backgroundId: 'OfferGift', showInQuickInteractionMenu: false, category: 'Court', difficulty: 'Easy', goldCost: 120, durationDays: 0, cooldownDays: 90, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 0, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 100, needsInitiatorSelection: false, needsGiftSelection: true, initiatorRequirementDescription: '', reasons: [], successFactors: [{ name: 'Personal taste', percent: 12 }, { name: 'Public ceremony', percent: 8 }], initiatorCandidates: [], giftOptions: [] },
          { id: 'OfferGiftMinor', name: 'Host Supper', description: 'Invite the character to a private supper with trusted friends.', effectLines: mockDisplayLines('Cost: 90 gold. Time: 10 days. Success chance: 72%.'), iconId: 'OfferGift', backgroundId: 'OfferGift', showInQuickInteractionMenu: true, category: 'Court', difficulty: 'Medium', goldCost: 90, durationDays: 10, cooldownDays: 60, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 8, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 72, needsInitiatorSelection: false, needsGiftSelection: false, initiatorRequirementDescription: '', reasons: [], successFactors: [{ name: 'Shared allies', percent: 9 }, { name: 'Court mood', percent: 6 }], initiatorCandidates: [], giftOptions: [] },
        ], lastCompletedInteractionId: '', lastInteractionSucceeded: false, lastInteractionCompletedDate: 0, lastInteractionOutcomeText: '' } satisfies BridgeResponse<'game.get_person_interactions'>;
      case 'game.get_settlement_interactions':
        return { settlementId: payloadString(payload, 'settlementId', MOCK_IDS.settlement), interactions: [
          { id: 'hold-games', name: 'Hold Games', description: 'Spend gold to reduce unrest and raise prestige.', effectLines: mockDisplayLines('Cost: 180 gold. Time: 30 days. Success chance: 100%.'), iconId: 'PromoteCommerceInteraction', backgroundId: 'PromoteCommerceInteraction', scope: 'settlement', goldCost: 180, durationDays: 30, cooldownDays: 180, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 12, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 100, reasons: [], successFactors: [{ name: 'Forum access', percent: 10 }, { name: 'Temple support', percent: 8 }], needsDestinationSelection: false },
          { id: 'market-charter', name: 'Grant Market Charter', description: 'Encourage merchants with a temporary civic privilege.', effectLines: mockDisplayLines('Cost: 140 gold. Time: 45 days. Success chance: 100%.'), iconId: 'PromoteCommerceInteraction', backgroundId: 'PromoteCommerceInteraction', scope: 'settlement', goldCost: 140, durationDays: 45, cooldownDays: 120, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 16, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 100, reasons: [], successFactors: [{ name: 'Trade roads', percent: 12 }, { name: 'Governor skill', percent: 7 }], needsDestinationSelection: false },
        ], lastCompletedInteractionId: '', lastInteractionSucceeded: false, lastInteractionCompletedDate: 0, lastInteractionOutcomeText: '' } satisfies BridgeResponse<'game.get_settlement_interactions'>;
      case 'game.get_bloc_interactions':
        return { blocId: payloadString(payload, 'blocId', MOCK_IDS.powerBloc), interactions: [
          { id: 'convene-council', name: 'Convene Council', description: 'Bring the council into session and hear its grievances directly.', effectLines: mockDisplayLines('Cost: 80 gold. Time: 7 days. Success chance: 74%.'), iconId: 'ConveneSenateInteraction', backgroundId: 'ConveneSenateInteraction', goldCost: 80, durationDays: 7, cooldownDays: 90, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 8, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 74, reasons: [], successFactors: [{ name: 'Leader respect', percent: 11 }, { name: 'Recent offices', percent: 5 }] },
          { id: 'make-promise', name: 'Make Promise', description: 'Promise offices or patronage before the current demand expires.', effectLines: mockDisplayLines('Free. Instant. Success chance: 68%.'), iconId: 'MakePromiseInteraction', backgroundId: 'MakePromiseInteraction', goldCost: 0, durationDays: 0, cooldownDays: 120, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 0, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 68, reasons: [], successFactors: [{ name: 'Court custom', percent: 9 }, { name: 'Current demand', percent: -6 }] },
          { id: 'offer-sinecure', name: 'Offer Sinecure', description: 'Spend gold on a comfortable post for a useful ally.', effectLines: mockDisplayLines('Cost: 220 gold. Time: 15 days. Success chance: 86%.'), iconId: 'OfferASinecureInteraction', backgroundId: 'OfferASinecureInteraction', goldCost: 220, durationDays: 15, cooldownDays: 180, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 10, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 86, reasons: [], successFactors: [{ name: 'Treasury', percent: 12 }, { name: 'Court custom', percent: 9 }] },
          { id: 'intimidate', name: 'Intimidate', description: 'Frighten council members into lowering their expectations.', effectLines: mockDisplayLines('Cost: 40 gold. Time: 10 days. Success chance: 52%.'), iconId: 'IntimidateInteraction', backgroundId: 'IntimidateInteraction', goldCost: 40, durationDays: 10, cooldownDays: 160, cooldownRemainingDays: 0, availability: 'available', inProgress: false, remainingDays: 0, bureaucraticLoad: 10, bureaucraticRushDaysSaved: 0, bureaucraticRushLoad: 0, successChancePercent: 52, reasons: [], successFactors: [{ name: 'Authority', percent: 14 }, { name: 'Public hostility', percent: -10 }] },
        ].map(interaction => ({
          needsLoanSelection: false,
          grossRevenue: 0,
          currentLandownerDebt: 0,
          currentLandownerMonthlyInterest: 0,
          loanOptions: [],
          ...interaction,
        })), lastCompletedInteractionId: '', lastInteractionSucceeded: false, lastInteractionCompletedDate: 0, lastInteractionOutcomeText: '' } satisfies BridgeResponse<'game.get_bloc_interactions'>;
      case 'game.get_agent_candidates': {
        const role = payloadString(payload, 'role', 'diplomat');
        const targetFactionId = payloadString(payload, 'targetFactionId', MOCK_IDS.rivalFaction);
        const foreignFactions: BridgeResponse<'game.get_agent_candidates'>['foreignFactions'] = [
          { id: MOCK_IDS.rivalFaction, name: 'Aurestian League', colour: RIVAL_COLOUR, secondaryColour: RIVAL_SECONDARY, emblem: 'Aurestian_1', cultureGroup: 'Aurestian', opinion: 18, diplomaticStatus: 'war' },
          { id: 'mock-faction-salt-league', name: 'Salt League', colour: '#8A6930', secondaryColour: '#CFC4AA', emblem: 'Aurestian_2', cultureGroup: 'Aurestian', opinion: 36, diplomaticStatus: 'neutral' },
        ];
        const selectedTarget = foreignFactions.find(target => target.id === targetFactionId) ?? foreignFactions[0];
        return {
          role,
          targetFactionId: selectedTarget.id,
          candidates: courtCandidates().candidates.map(c => {
            const diplomaticXp = 240;
            const intrigueXp = 160;
            return {
              id: c.id,
              name: c.name,
              title: c.title,
              portrait: c.portrait,
              portraitLayers: c.portraitLayers,
              age: c.age,
              activity: c.activity,
              authority: c.authority,
              cunning: c.cunning,
              governance: c.governance,
              loyalty: c.loyalty,
              fame: c.fame,
              diplomaticXp,
              intrigueXp,
              traits: c.traits,
              suitability: [selectedTarget].map(target => {
                const isSpy = role === 'spy';
                const xp = isSpy ? intrigueXp : diplomaticXp;
                const tier = mockRoleTier(xp);
                const statContribs = isSpy
                  ? [
                    { key: 'cunning', stat: c.cunning, weight: 0.5, value: Math.round(0.5 * (c.cunning - 10) * 2) },
                    { key: 'governance', stat: c.governance, weight: 0.2, value: Math.round(0.2 * (c.governance - 10) * 2) },
                    { key: 'loyalty', stat: c.loyalty, weight: 0.15, value: Math.round(0.15 * (c.loyalty - 10) * 2) },
                    { key: 'authority', stat: c.authority, weight: 0.15, value: Math.round(0.15 * (c.authority - 10) * 2) },
                  ]
                  : [
                    { key: 'authority', stat: c.authority, weight: 0.3, value: Math.round(0.3 * (c.authority - 10) * 2) },
                    { key: 'cunning', stat: c.cunning, weight: 0.3, value: Math.round(0.3 * (c.cunning - 10) * 2) },
                    { key: 'governance', stat: c.governance, weight: 0.2, value: Math.round(0.2 * (c.governance - 10) * 2) },
                    { key: 'fame', stat: c.fame, weight: 0.2, value: Math.round(0.2 * (c.fame - 50) / 5) },
                  ];
                const statTotal = statContribs.reduce((total, entry) => total + entry.value, 0);
                const opinion = isSpy
                  ? target.diplomaticStatus === 'war' ? -15 : 0
                  : Math.round((target.opinion - 50) * 0.15);
                const total = Math.max(5, Math.min(95, tier.base + statTotal + opinion));
                return {
                  targetFactionId: target.id,
                  base: tier.base,
                  statContribs,
                  statTotal,
                  opinion,
                  traitSum: 0,
                  traits: [],
                  total,
                  primaryStat: isSpy ? c.cunning : c.authority,
                  xp,
                  tier,
                };
              }),
            };
          }),
          foreignFactions,
        } satisfies BridgeResponse<'game.get_agent_candidates'>;
      }
      case 'game.recruit_character_for_role': {
        const role = payloadString(payload, 'role', 'governor');
        const goldCost = 500;
        if (state.playerGold < goldCost) {
          return { recruited: false, goldCost, playerGold: state.playerGold, personId: '', personName: '', message: 'Not enough gold to recruit a candidate.' } satisfies BridgeResponse<'game.recruit_character_for_role'>;
        }

        state.playerGold -= goldCost;
        emitResources(emit);
        const personId = role === 'commander' ? 'mock-person-tribune' : MOCK_IDS.governor;
        return { recruited: true, goldCost, playerGold: state.playerGold, personId, personName: personById(personId).name, message: '' } satisfies BridgeResponse<'game.recruit_character_for_role'>;
      }
      case 'game.get_court_candidates':
      case 'game.get_bishop_candidates':
        return courtCandidates();
      case 'game.get_province_mode_overview':
        return mockProvinceModeOverview(state);
      case 'game.run_governor_mission_action':
        return { success: true, message: '' } satisfies BridgeResponse<'game.run_governor_mission_action'>;
      case 'game.province_emperor_takeover': {
        const command = payloadString(payload, 'command', 'state');
        if (command === 'select') {
          state.selectedProvinceTakeoverId = payloadString(payload, 'personId', state.selectedProvinceTakeoverId);
        } else if (command === 'confirm') {
          state.selectedProvinceTakeoverId = payloadString(payload, 'personId', state.selectedProvinceTakeoverId);
          state.provinceTakeoverActive = false;
          state.provinceMode = false;
          emitPlayerFaction(emit);
        }
        return mockProvinceEmperorTakeover(state);
      }
      case 'game.get_court_positions':
        return { autoAssignCourtEnabled: state.autoAssignCourtEnabled, courtFactionId: MOCK_IDS.playerFaction, courtFactionName: 'Rephsian Empire', positions: [
          { key: 'masterofeconomy', name: 'Master of Economy', description: 'Coordinates decrees and provincial records.', primaryStat: 'governance', bonusLabel: 'Resource Throughput', bonusMultiplier: 1, bonusDecimals: 0, bonusSuffix: '%', bonusIsNegative: false, holderId: MOCK_IDS.governor, holderName: 'Marcia Vennor', holderStatValue: 9, holderIsPlayerCharacter: state.provinceMode, statTotal: 15, bonusValue: 15, bonusText: '+15%', bureaucraticCapacity: 15, ...mockCourtTerm(88), canPlayerEnterContest: state.provinceMode && !state.enteredCourtContestKeys.includes('masterofeconomy'), playerEnteredContest: state.enteredCourtContestKeys.includes('masterofeconomy'), playerContestScore: 68, playerContestRank: 2, contestCandidateCount: 3, leadingContestCandidateName: 'Caelia Moren', leadingContestCandidateScore: 82, subordinates: [mockCourtSubordinate(MOCK_IDS.heir, 'Cassian Arcastus', 214, 4, 2, false), mockCourtSubordinate(MOCK_IDS.character, 'Valen Arcastus', 61, 8, 4, !state.provinceMode)] },
          { key: 'magistermilitum', name: 'Magister Militum', description: 'Keeps field commands supplied and disciplined.', primaryStat: 'tactics', bonusLabel: 'Army morale', bonusMultiplier: 1, bonusDecimals: 0, bonusSuffix: '%', bonusIsNegative: false, holderId: MOCK_IDS.character, holderName: 'Valen Arcastus', holderStatValue: 9, holderIsPlayerCharacter: !state.provinceMode, statTotal: 15, bonusValue: 15, bonusText: '+15%', bureaucraticCapacity: 0, ...mockCourtTerm(142), canPlayerEnterContest: state.provinceMode && !state.enteredCourtContestKeys.includes('magistermilitum'), playerEnteredContest: state.enteredCourtContestKeys.includes('magistermilitum'), playerContestScore: 71, playerContestRank: state.enteredCourtContestKeys.includes('magistermilitum') ? 2 : 0, contestCandidateCount: state.enteredCourtContestKeys.includes('magistermilitum') ? 3 : 2, leadingContestCandidateName: 'Doran Althar', leadingContestCandidateScore: 77, subordinates: [mockCourtSubordinate(MOCK_IDS.heir, 'Cassian Arcastus', 310, 6, 3, false), mockCourtSubordinate(MOCK_IDS.governor, 'Marcia Vennor', 38, 7, 3, state.provinceMode)] },
        ], maxSubordinates: 2 } satisfies BridgeResponse<'game.get_court_positions'>;
      case 'game.get_court_appointment_contests': {
        const frontierEntered = state.enteredCourtContestKeys.includes('magistermilitum');
        const economyEntered = state.enteredCourtContestKeys.includes('masterofeconomy');
        return { courtFactionId: MOCK_IDS.playerFaction, courtFactionName: 'Rephsian Empire', candidateDetailsIncluded: true, contests: [
          {
            positionKey: 'magistermilitum',
            title: 'Magister Militum',
            description: 'High command of the land armies. The emperor weighs tactics, loyalty, patronage, and political danger.',
            category: 'Army',
            primaryStat: 'tactics',
            icon: '/assets/icons/I_ArmiesQuickButton.png',
            currentHolderId: MOCK_IDS.character,
            currentHolderName: 'Valen Arcastus',
            daysRemaining: 142,
            availableInDays: 0,
            contestWindowDays: 180,
            termYears: 5,
            isOpen: true,
            canPlayerEnter: state.provinceMode && !frontierEntered,
            playerEntryBlockReason: state.provinceMode ? '' : 'Only province governors can enter imperial appointment contests.',
            playerEntered: frontierEntered,
            playerRank: frontierEntered ? 2 : 0,
            candidates: [
              { id: 'althar', name: 'Doran Althar', provinceName: 'Dawnwall', portrait: MALE_PORTRAIT_2, portraitLayers: mockPortraitLayers(MALE_PORTRAIT_2), rank: 1, totalScore: 77, opinionScore: 24, primaryStatScore: 28, patronageScore: 18, threatScore: -3, multiContestMalus: 0, isPlayerCharacter: false },
              ...(frontierEntered ? [{ id: MOCK_IDS.governor, name: 'Marcia Vennor', provinceName: 'Aurelion', portrait: FEMALE_PORTRAIT_1, portraitLayers: mockPortraitLayers(FEMALE_PORTRAIT_1), rank: 2, totalScore: 71, opinionScore: 18, primaryStatScore: 34, patronageScore: 12, threatScore: -8, multiContestMalus: 0, isPlayerCharacter: true }] : []),
              { id: 'venn', name: 'Gnaeus Venn', provinceName: 'Namaris', portrait: MALE_PORTRAIT_1, portraitLayers: mockPortraitLayers(MALE_PORTRAIT_1), rank: frontierEntered ? 3 : 2, totalScore: 62, opinionScore: 12, primaryStatScore: 30, patronageScore: 9, threatScore: -2, multiContestMalus: 0, isPlayerCharacter: false },
            ],
          },
          {
            positionKey: 'masterofeconomy',
            title: 'Master of Economy',
            description: 'Control of finance, tribute collection, and treasury access.',
            category: 'Court',
            primaryStat: 'governance',
            icon: '/assets/icons/I_Coins.png',
            currentHolderId: MOCK_IDS.governor,
            currentHolderName: 'Marcia Vennor',
            daysRemaining: 88,
            availableInDays: 0,
            contestWindowDays: 180,
            termYears: 5,
            isOpen: true,
            canPlayerEnter: state.provinceMode && !economyEntered,
            playerEntryBlockReason: state.provinceMode ? '' : 'Only province governors can enter imperial appointment contests.',
            playerEntered: economyEntered,
            playerRank: economyEntered ? 2 : 0,
            candidates: [
              { id: 'moren', name: 'Caelia Moren', provinceName: 'Valewatch', portrait: FEMALE_PORTRAIT_1, portraitLayers: mockPortraitLayers(FEMALE_PORTRAIT_1), rank: 1, totalScore: 82, opinionScore: 28, primaryStatScore: 36, patronageScore: 14, threatScore: -5, multiContestMalus: 0, isPlayerCharacter: false },
              ...(economyEntered ? [{ id: MOCK_IDS.governor, name: 'Marcia Vennor', provinceName: 'Aurelion', portrait: FEMALE_PORTRAIT_1, portraitLayers: mockPortraitLayers(FEMALE_PORTRAIT_1), rank: 2, totalScore: 68, opinionScore: 18, primaryStatScore: 32, patronageScore: 12, threatScore: -8, multiContestMalus: frontierEntered ? -30 : 0, isPlayerCharacter: true }] : []),
              { id: 'serus', name: 'Helius Serus', provinceName: 'Greywatch', portrait: MALE_PORTRAIT_1, portraitLayers: mockPortraitLayers(MALE_PORTRAIT_1), rank: economyEntered ? 3 : 2, totalScore: 61, opinionScore: 8, primaryStatScore: 26, patronageScore: 19, threatScore: -1, multiContestMalus: 0, isPlayerCharacter: false },
            ],
          },
        ] } satisfies BridgeResponse<'game.get_court_appointment_contests'>;
      }
      case 'game.enter_court_appointment_contest': {
        const positionKey = payloadString(payload, 'positionKey', '');
        if (positionKey && !state.enteredCourtContestKeys.includes(positionKey)) {
          state.enteredCourtContestKeys = [...state.enteredCourtContestKeys, positionKey];
        }
        return { entered: true, message: 'Entered' } satisfies BridgeResponse<'game.enter_court_appointment_contest'>;
      }
      case 'game.get_courtier_types':
        return { promotionCost: 500, types: [
          { id: 'administrator', title: 'Administrator', description: 'A courtier trained for records, taxes, and settlement management.', backgroundImage: '/assets/portraits/backgrounds/RephsianBackground1.png', foregroundImage: MALE_PORTRAIT_1, ageMin: 24, ageMax: 48, minTraits: 1, maxTraits: 2, stats: [{ statistic: 'governance', min: 5, max: 9, mean: 7 }, { statistic: 'authority', min: 3, max: 7, mean: 5 }] },
          { id: 'captain', title: 'Captain', description: 'A courtier drawn from veteran households and frontier commands.', backgroundImage: '/assets/portraits/backgrounds/RephsianBackground1.png', foregroundImage: MALE_PORTRAIT_2, ageMin: 22, ageMax: 44, minTraits: 1, maxTraits: 3, stats: [{ statistic: 'tactics', min: 5, max: 9, mean: 7 }, { statistic: 'loyalty', min: 4, max: 8, mean: 6 }] },
          { id: 'envoy', title: 'Envoy', description: 'A courtier used to tense negotiations and provincial bargains.', backgroundImage: '/assets/portraits/backgrounds/RephsianBackground1.png', foregroundImage: FEMALE_PORTRAIT_1, ageMin: 28, ageMax: 52, minTraits: 1, maxTraits: 3, stats: [{ statistic: 'cunning', min: 4, max: 8, mean: 6 }, { statistic: 'authority', min: 2, max: 6, mean: 4 }] },
          { id: 'steward', title: 'Steward', description: 'A practical household officer suited to storehouses and construction yards.', backgroundImage: '/assets/portraits/backgrounds/RephsianBackground1.png', foregroundImage: MALE_PORTRAIT_1, ageMin: 30, ageMax: 56, minTraits: 1, maxTraits: 2, stats: [{ statistic: 'governance', min: 4, max: 8, mean: 6 }, { statistic: 'constitution', min: 3, max: 7, mean: 5 }] },
        ] } satisfies BridgeResponse<'game.get_courtier_types'>;
      case 'game.get_dioceses': {
        const canManageReligion = !state.provinceMode;
        return { religionInfo: mockReligionByKey(state.playerReligionKey), religionKey: state.playerReligionKey, religionName: mockReligionByKey(state.playerReligionKey).name, description: mockReligionByKey(state.playerReligionKey).description, clergyTitle: 'High Priest', iconPath: mockReligionIcon(mockReligionByKey(state.playerReligionKey)), colour: mockReligionByKey(state.playerReligionKey).colour, canManage: canManageReligion, leadingFactionName: 'Rephsian Empire', autoAssignClergyEnabled: canManageReligion && state.autoAssignClergyEnabled, dioceses: [
          { landKey: 'AurelionBasin', landName: 'Aurelion Basin', bishopId: MOCK_IDS.governor, bishopName: 'Marcia Vennor', authority: 72, religionShare: 0.76, followers: 292000, landPopulation: 384000 },
          { landKey: 'NamarisShore', landName: 'Namaris Shore', bishopId: MOCK_IDS.heir, bishopName: 'Cassian Arcastus', authority: 48, religionShare: 0.59, followers: 84000, landPopulation: 142000 },
        ], organisedReligions: [
          { info: rephsianReligion, key: rephsianReligion.id, name: rephsianReligion.name, clergyTitle: 'High Priest', iconPath: mockReligionIcon(rephsianReligion), colour: rephsianReligion.colour, isPlayerReligion: state.playerReligionKey === rephsianReligion.id, canManage: canManageReligion && state.playerReligionKey === rephsianReligion.id, leadingFactionName: state.playerReligionKey === rephsianReligion.id ? 'Rephsian Empire' : 'Aurelian Synod' },
          { info: rivalReligion, key: rivalReligion.id, name: rivalReligion.name, clergyTitle: 'Sun Reader', iconPath: mockReligionIcon(rivalReligion), colour: rivalReligion.colour, isPlayerReligion: state.playerReligionKey === rivalReligion.id, canManage: canManageReligion && state.playerReligionKey === rivalReligion.id, leadingFactionName: state.playerReligionKey === rivalReligion.id ? 'Rephsian Empire' : 'Aurestian League' },
        ], religionDistribution: [
          { key: rephsianReligion.id, name: rephsianReligion.name, colour: rephsianReligion.colour, share: 0.76 },
          { key: rivalReligion.id, name: rivalReligion.name, colour: rivalReligion.colour, share: 0.18 },
        ], totalRealmPopulation: 1284000 } satisfies BridgeResponse<'game.get_dioceses'>;
      }
      case 'game.get_religion_conversion':
        return mockReligionConversion();
      case 'game.get_formation_templates':
        return {
          templates: [
            { id: 'balanced-field-army', name: 'Balanced Field Army', iconId: 'balanced', type: 'land', description: 'A mixed infantry core with mobile support.', totalStrength: 4200, creationCost: 500, initialUnitCost: 1400, creationTimeDays: 90, monthlyUpkeep: 84, averageTier: 2, battleGroups: [{ id: 'mock-bg-1', role: 'melee', unitCount: 6, units: [{ unitId: 'limitanei', count: 4 }, { unitId: 'clibanarii', count: 2 }] }, { id: 'mock-bg-2', role: 'melee', unitCount: 3, units: [{ unitId: 'limitanei', count: 2 }, { unitId: 'clibanarii', count: 1 }] }], canApply: true, canEdit: true, canDelete: true, applyReason: '', isActiveBuildTemplate: true, units: [formationUnit('limitanei', 'Limitanei', 'infantry', 'land', 6, 4200, true), formationUnit('clibanarii', 'Clibanarii', 'cavalry', 'land', 3, 1900)], assignedForces: [{ id: MOCK_IDS.military, name: 'I Field Army', rank: 'Dux', commanderName: 'Valen Arcastus', strength: 6800, maxStrength: 7600, isNavy: false, location: 'Aurelion' }, { id: 'mock-military-detachment', name: 'Aurelion Detachment', rank: 'Tribune', commanderName: 'Cassian Arcastus', strength: 1600, maxStrength: 1800, isNavy: false, location: 'Aurelion' }] },
            { id: 'coastal-patrol', name: 'Coastal Patrol', iconId: 'naval', type: 'naval', description: 'A compact squadron for blockades and troop movement.', totalStrength: 2200, creationCost: 420, initialUnitCost: 860, creationTimeDays: 75, monthlyUpkeep: 58, averageTier: 2, battleGroups: [{ id: 'mock-bg-navy-1', role: 'ranged', unitCount: 10, units: [{ unitId: 'dromons', count: 10 }] }, { id: 'mock-bg-navy-2', role: 'melee', unitCount: 6, units: [{ unitId: 'supply-galleys', count: 6 }] }], canApply: true, canEdit: true, canDelete: true, applyReason: '', isActiveBuildTemplate: false, units: [formationUnit('dromons', 'Dromons', 'navy', 'naval', 10, 1200, true), formationUnit('supply-galleys', 'Supply Galleys', 'navy', 'naval', 6, 700)], assignedForces: [{ id: MOCK_IDS.navy, name: 'Classis Meridian', rank: 'Praefectus', commanderName: 'Marcia Vennor', strength: 1800, maxStrength: 2200, isNavy: true, location: 'Namaris' }, { id: 'mock-navy-rival', name: 'Salt Squadron', rank: 'Praefectus', commanderName: 'Nera Solun', strength: 1200, maxStrength: 1500, isNavy: true, location: 'Namaris' }] },
          ],
          pendingFormations: [],
          activeBuildTemplateId: 'balanced-field-army',
          playerGold: 4280,
          maximumBattleGroupUnits: 10,
          maximumFormationTemplates: 30,
        } satisfies BridgeResponse<'game.get_formation_templates'>;
      case 'game.get_formation_template_catalogue':
        return {
          landUnitCatalogue: [formationUnit('limitanei', 'Limitanei', 'infantry', 'land', 6, 4200), formationUnit('clibanarii', 'Clibanarii', 'cavalry', 'land', 3, 1900, false, aurestianCulture)],
          navalUnitCatalogue: [formationUnit('dromons', 'Dromons', 'navy', 'naval', 10, 1200), formationUnit('supply-galleys', 'Supply Galleys', 'navy', 'naval', 6, 700)],
        } satisfies BridgeResponse<'game.get_formation_template_catalogue'>;
      case 'game.generate_formation_template_name':
        return {
          name: payloadString(payload, 'type') === 'naval' ? 'Fleet' : 'Legion',
        } satisfies BridgeResponse<'game.generate_formation_template_name'>;
      case 'game.get_peace_negotiation_state':
        return peaceState();
      case 'game.start_peace_settlement_selection': {
        const terms = payloadValue(payload, 'terms');
        const cancelSelection = payloadValue(payload, 'cancelSelection') === true;
        return {
          targetFactionId: payloadString(payload, 'targetFactionId', MOCK_IDS.rivalFaction),
          selectionActive: !cancelSelection,
          terms: cancelSelection
            ? []
            : Array.isArray(terms) ? terms as BridgeResponse<'game.start_peace_settlement_selection'>['terms'] : [],
        } satisfies BridgeResponse<'game.start_peace_settlement_selection'>;
      }
      case 'game.submit_peace_negotiation':
        return { submitted: true, result: 'accepted', message: 'Mock peace offer submitted.', state: peaceState() } satisfies BridgeResponse<'game.submit_peace_negotiation'>;
      case 'game.get_battle_data': {
        const loyalFaction = { ...playerFactionReference(), name: 'Imperial Rephsia', colour: '#5B2C5B', secondaryColour: '#C9A85A', relation: 'own' };
        const rebelFaction = { ...customFactionReference('mock-faction-berginian-rebellion', 'Berginian Rebellion', '#8B3A1F', '#D3C0A0', 'Rephsian', 'Rephsian_8', true), relation: 'enemy' };
        const attackers = [
          battleParticipant('mock-rebel-host', 'Berginian Host', 'Dux Marcus Vendian', 'mock-person-rival', rebelFaction, 4280, 4600, 62, false),
          battleParticipant('mock-rebel-vanguard', 'Vendian Vanguard', 'Tribunus Aetius', 'mock-person-rival-marshal', rebelFaction, 1180, 1300, 58, false),
        ];
        const defenders = [
          battleParticipant(MOCK_IDS.military, 'Imperial Field Army', 'Comes Flavius Lucius', MOCK_IDS.character, loyalFaction, 3640, 3900, 74, true),
          battleParticipant('mock-loyal-reserve', 'Berginian Reserve', 'Legatus Cassius', MOCK_IDS.heir, loyalFaction, 1220, 1300, 78, true),
        ];
        const heightMapColumns = 18;
        const heightMapRows = 18;
        const heightMap = mockBattlefieldHeightMap(heightMapColumns, heightMapRows);
        return {
          found: true,
          id: MOCK_IDS.battle,
          title: 'Battle of Berginium',
          battleType: 'Land',
          location: 'Plain of Berginium, Berginian March',
          terrain: 'grassland',
          hasSnowAttrition: false,
          hasDesertAttrition: false,
          battlefieldWidth: 2000,
          battlefieldHeight: 2000,
          attacker: {
            participants: attackers,
            totalStrength: 5460,
            totalMaxStrength: 5900,
            currentManpower: 5460,
            initialManpower: 5900,
            losses: 440,
            morale: 61,
          },
          defender: {
            participants: defenders,
            totalStrength: 4860,
            totalMaxStrength: 5200,
            currentManpower: 4860,
            initialManpower: 5200,
            losses: 340,
            morale: 75,
          },
          formations: [
            battleFormationDetail('a-cav-left', 'Vendian Outriders', 'attacker', rebelFaction, 'cavalry', 'Cavalry', 760, 900, 12, 32, false, 'wedge', 'Wedge', 'd-rng-left', 'Imperial Sagittarii'),
            battleFormationDetail('a-inf-left', 'Berginian Vexillation', 'attacker', rebelFaction, 'infantry', 'Infantry', 980, 1120, 35, 30, false, 'line', 'Line', 'd-inf-left', 'Legio II Pia Fidelis'),
            battleFormationDetail('a-inf-centre', "Marcus' Loyal Cohort", 'attacker', rebelFaction, 'infantry', 'Infantry', 1320, 1500, 55, 30, false, 'staggered', 'Staggered', 'd-inf-centre', 'First Palatine Legion'),
            battleFormationDetail('a-rng-back', 'Berginian Sagittarii', 'attacker', rebelFaction, 'ranged', 'Ranged', 520, 650, 70, 16, false, 'spread', 'Open Order', 'd-inf-centre', 'First Palatine Legion'),
            battleFormationDetail('a-cav-right', 'Cataphract Wing', 'attacker', rebelFaction, 'cavalry', 'Cavalry', 700, 820, 88, 32, false, 'wedge', 'Wedge', 'd-cav-right', 'Shield Cavalry'),
            battleFormationDetail('d-rng-left', 'Imperial Sagittarii', 'defender', loyalFaction, 'ranged', 'Ranged', 420, 520, 12, 70, true, 'line', 'Line', 'a-cav-left', 'Vendian Outriders'),
            battleFormationDetail('d-inf-left', 'Legio II Pia Fidelis', 'defender', loyalFaction, 'infantry', 'Infantry', 970, 1040, 35, 70, true, 'staggered', 'Staggered', 'a-inf-left', 'Berginian Vexillation'),
            battleFormationDetail('d-inf-centre', 'First Palatine Legion', 'defender', loyalFaction, 'infantry', 'Infantry', 1250, 1320, 55, 70, true, 'staggered', 'Staggered', 'a-inf-centre', "Marcus' Loyal Cohort"),
            battleFormationDetail('d-art-back', 'Imperial Artillery', 'defender', loyalFaction, 'siege', 'Siege', 180, 220, 70, 86, true, 'column', 'Column', 'a-inf-centre', "Marcus' Loyal Cohort"),
            battleFormationDetail('d-cav-right', 'Shield Cavalry', 'defender', loyalFaction, 'cavalry', 'Cavalry', 820, 900, 88, 70, true, 'column', 'Column', 'a-cav-right', 'Cataphract Wing'),
          ],
          obstacles: [
            battlefieldObstacleDetail('mock-obstacle-woods-west', 'woods', 420, 900, 420, 300, -18, false, 0.78, 0.62, 0.96, 0.92, 0.78),
            battlefieldObstacleDetail('mock-obstacle-ridge-centre', 'ridge', 1160, 960, 650, 150, 12, false, 0.86, 0.76, 1.04, 0.94, 0.94),
            battlefieldObstacleDetail('mock-obstacle-rocks-east', 'rocky', 1560, 1180, 260, 210, 24, true, 0.65, 0.52, 1, 0.9, 0.86),
            battlefieldObstacleDetail('mock-obstacle-marsh-south', 'marsh', 980, 1540, 500, 260, -8, false, 0.58, 0.42, 0.92, 1.1, 1),
          ],
          heightMapColumns,
          heightMapRows,
          heightMap,
          playerIsAttacker: false,
          playerIsDefender: true,
          canIssueCommands: true,
        } satisfies BridgeResponse<'game.get_battle_data'>;
      }
      case 'ui.show_screen': {
        const result = { screen: payloadString(payload, 'screen'), id: payloadString(payload, 'id') } satisfies BridgeResponse<'ui.show_screen'>;
        emit('ui.show_screen', result);
        return result;
      }
      case 'ui.hide_current_screen':
        emit('ui.show_screen', { screen: '', id: '' });
        return undefined;
      case 'ui.hide_sidebars':
        emit('ui.sidebar_event', { type: 'close', id: '' });
        return undefined;
      case 'ui.hide_left_sidebar':
        emit('ui.sidebar_event', { type: 'close_left', id: '' });
        return undefined;
      case 'ui.hide_right_sidebar':
        emit('ui.sidebar_event', { type: 'close_right', id: '' });
        return undefined;
      case 'game.show_military_sidebar':
        emit('ui.sidebar_event', { type: 'military', id: payloadString(payload, 'militaryId') });
        return undefined;
      case 'game.zoom_to':
        return { zoomed: true } satisfies BridgeResponse<'game.zoom_to'>;
      case 'game.world_search': {
        const query = payloadString(payload, 'query').trim().toLowerCase();
        if (!query) {
          return { results: [] } satisfies BridgeResponse<'game.world_search'>;
        }
        const maxResults = Math.max(1, payloadNumber(payload, 'maxResults', 24));
        const catalogue: Array<{ itemType: string; itemId: string; name: string; detail: string; factionId: string; kind: string }> = [
          { itemType: 'faction', itemId: MOCK_IDS.playerFaction, name: 'Rephsian Empire', detail: 'Emperor Valerius', factionId: MOCK_IDS.playerFaction, kind: 'faction' },
          { itemType: 'faction', itemId: MOCK_IDS.rivalFaction, name: 'Aurestian League', detail: 'Archon Helia', factionId: MOCK_IDS.rivalFaction, kind: 'faction' },
          { itemType: 'settlement', itemId: MOCK_IDS.settlement, name: 'Rephsia', detail: 'Rephsian Empire', factionId: MOCK_IDS.playerFaction, kind: 'settlement' },
          { itemType: 'settlement', itemId: MOCK_IDS.portSettlement, name: 'Ara Salimba', detail: 'Rephsian Empire', factionId: MOCK_IDS.playerFaction, kind: 'settlement' },
          { itemType: 'military', itemId: MOCK_IDS.military, name: 'I Legio Rephsia', detail: 'Rephsian Empire', factionId: MOCK_IDS.playerFaction, kind: 'army' },
          { itemType: 'military', itemId: MOCK_IDS.navy, name: 'Classis Orientalis', detail: 'Rephsian Empire', factionId: MOCK_IDS.playerFaction, kind: 'navy' },
          { itemType: 'character', itemId: MOCK_IDS.character, name: 'Emperor Valerius', detail: 'Rephsian Empire', factionId: MOCK_IDS.playerFaction, kind: 'character' },
          { itemType: 'character', itemId: MOCK_IDS.heir, name: 'Prince Marcus', detail: 'Rephsian Empire', factionId: MOCK_IDS.playerFaction, kind: 'character' },
        ];
        const results = catalogue
          .filter((entry) => entry.name.toLowerCase().includes(query) || entry.detail.toLowerCase().includes(query))
          .slice(0, maxResults)
          .map((entry, index) => ({
            ...entry,
            score: 1000 - index,
          }));
        return { results } satisfies BridgeResponse<'game.world_search'>;
      }
      case 'game.save_game':
        state.saveSerial += 1;
        emitGameState(emit);
        return { saved: true, failureReason: '' } satisfies BridgeResponse<'game.save_game'>;
      case 'game.delete_save':
        return { deleted: true, failureReason: '' } satisfies BridgeResponse<'game.delete_save'>;
      case 'game.set_mod_enabled':
        return { ok: true } satisfies BridgeResponse<'game.set_mod_enabled'>;
      case 'game.rebind_action_key':
        return { clearedActions: [] } satisfies BridgeResponse<'game.rebind_action_key'>;
      case 'game.promote_courtier':
        return { success: true, message: 'Courtier promoted in mock mode.' } satisfies BridgeResponse<'game.promote_courtier'>;
      case 'game.appoint_agent':
        return { appointed: true, recalled: false, message: 'Agent appointed in mock mode.' } satisfies BridgeResponse<'game.appoint_agent'>;
      case 'game.appoint_bishop':
        return { appointed: true, message: 'Bishop appointed in mock mode.' } satisfies BridgeResponse<'game.appoint_bishop'>;
      case 'game.start_religion_conversion': {
        const religionKey = payloadString(payload, 'religionKey', rivalReligion.id);
        const firstStage = MOCK_CONVERSION_STAGES[0];
        if (state.religionConversionActive || state.playerGold < firstStage.goldCost || religionKey === state.playerReligionKey) {
          return { success: false, completed: false, message: 'Conversion cannot begin in mock mode.' } satisfies BridgeResponse<'game.start_religion_conversion'>;
        }

        state.religionConversionActive = true;
        state.religionConversionTargetKey = religionKey;
        state.religionConversionStageIndex = 0;
        state.religionConversionStageStartDay = state.gameDay;
        state.playerGold -= firstStage.goldCost;
        emitReligionConversion(emit);
        emitResources(emit);
        return { success: true, completed: false, message: '' } satisfies BridgeResponse<'game.start_religion_conversion'>;
      }
      case 'game.advance_religion_conversion': {
        if (!state.religionConversionActive) {
          return { success: false, completed: false, message: 'No conversion is active in mock mode.' } satisfies BridgeResponse<'game.advance_religion_conversion'>;
        }
        const currentStage = MOCK_CONVERSION_STAGES[state.religionConversionStageIndex] ?? MOCK_CONVERSION_STAGES[0];
        const elapsedDays = Math.max(0, state.gameDay - state.religionConversionStageStartDay);
        if (elapsedDays < currentStage.durationDays) {
          return { success: false, completed: false, message: 'The current conversion stage is not ready in mock mode.' } satisfies BridgeResponse<'game.advance_religion_conversion'>;
        }

        if (state.religionConversionStageIndex >= MOCK_CONVERSION_STAGES.length - 1) {
          state.religionConversionActive = false;
          state.religionConversionStageIndex = 0;
          state.religionConversionTargetKey = '';
          state.religionConversionStageStartDay = state.gameDay;
          emitReligionConversion(emit);
          return { success: true, completed: true, message: '' } satisfies BridgeResponse<'game.advance_religion_conversion'>;
        }

        const nextStageIndex = state.religionConversionStageIndex + 1;
        const nextStage = MOCK_CONVERSION_STAGES[nextStageIndex];
        if (state.playerGold < nextStage.goldCost) {
          return { success: false, completed: false, message: 'Not enough gold in mock mode.' } satisfies BridgeResponse<'game.advance_religion_conversion'>;
        }

        state.playerGold -= nextStage.goldCost;
        state.religionConversionStageIndex = nextStageIndex;
        state.religionConversionStageStartDay = state.gameDay;
        if (nextStage.changesReligion) {
          state.playerReligionKey = state.religionConversionTargetKey;
        }
        emitReligionConversion(emit);
        emitResources(emit);
        return { success: true, completed: false, message: '' } satisfies BridgeResponse<'game.advance_religion_conversion'>;
      }
      case 'game.cancel_religion_conversion':
        state.religionConversionActive = false;
        state.religionConversionTargetKey = '';
        state.religionConversionStageIndex = 0;
        state.religionConversionStageStartDay = state.gameDay;
        emitReligionConversion(emit);
        return { success: true, completed: false, message: '' } satisfies BridgeResponse<'game.cancel_religion_conversion'>;
      case 'game.set_auto_assign_governors': {
        state.autoAssignGovernorsEnabled = payloadValue(payload, 'enabled') === true;
        return undefined satisfies BridgeResponse<'game.set_auto_assign_governors'>;
      }
      case 'game.set_auto_assign_court': {
        state.autoAssignCourtEnabled = payloadValue(payload, 'enabled') === true;
        return undefined satisfies BridgeResponse<'game.set_auto_assign_court'>;
      }
      case 'game.set_auto_assign_clergy': {
        state.autoAssignClergyEnabled = payloadValue(payload, 'enabled') === true;
        return undefined satisfies BridgeResponse<'game.set_auto_assign_clergy'>;
      }
      case 'game.appoint_to_court_position':
        return { appointed: true, message: 'Court position updated in mock mode.' } satisfies BridgeResponse<'game.appoint_to_court_position'>;
      case 'game.start_battle_action':
      case 'game.set_battle_formation_stance':
      case 'game.request_battle_retreat':
        return 'formationId' in (payload && typeof payload === 'object' ? payload : {}) ? { started: true, message: 'Mock battle order accepted.' } : { requested: true, message: 'Mock retreat requested.' };
      case 'game.start_bloc_interaction':
        return { started: true, succeeded: true, message: 'Mock bloc interaction started.' } satisfies BridgeResponse<'game.start_bloc_interaction'>;
      case 'game.start_faction_interaction':
        return { targetFactionId: payloadString(payload, 'targetFactionId', MOCK_IDS.rivalFaction), interactionId: payloadString(payload, 'interactionId', 'mock-interaction'), started: true, completed: true, succeeded: true, selectionStarted: false, selectionActive: false, personSelectionRequired: false, inputSelectionRequired: false, selectedSettlementCount: 0, playerGold: state.playerGold, hasSuccessChance: false, successChancePercent: 0, selectionImpactText: '', selectionSuccessEffect: '', selectionFailureEffect: '', selectionRiskText: '', interactionName: '', selectionPrompt: '', personSelectionPrompt: '', personCandidates: [], inputSelectionPrompt: '', inputRequirements: [], factionCandidates: [], message: 'Mock interaction succeeded.' } satisfies BridgeResponse<'game.start_faction_interaction'>;
      case 'game.start_person_interaction':
        return { started: true, completed: true, succeeded: true, message: 'Mock interaction succeeded.' };
      case 'game.start_spy_interaction':
        return { targetFactionId: payloadString(payload, 'targetFactionId', MOCK_IDS.rivalFaction), interactionId: payloadString(payload, 'interactionId', 'mock-spy-interaction'), started: true, inputSelectionRequired: false, playerGold: state.playerGold, interactionName: '', inputSelectionPrompt: '', inputRequirements: [], factionCandidates: [], message: 'Mock interaction started.' } satisfies BridgeResponse<'game.start_spy_interaction'>;
      case 'game.start_policy_adjustment':
        return { started: true, message: 'Mock policy adjustment started.' } satisfies BridgeResponse<'game.start_policy_adjustment'>;
      case 'game.start_settlement_interaction':
        return { started: true, needsDestinationSelection: false, message: 'Mock settlement interaction started.' } satisfies BridgeResponse<'game.start_settlement_interaction'>;
      case 'game.cancel_bloc_interaction':
      case 'game.cancel_faction_interaction':
      case 'game.cancel_person_interaction':
      case 'game.cancel_settlement_interaction':
      case 'game.cancel_spy_interaction':
        return { cancelled: true };
      case 'game.apply_formation_template': {
        if (payloadBoolean(payload, 'cancelSelection')) {
          state.formationSelectionActive = false;
          state.formationSelectionTemplateId = '';
          state.activeMapMode = 'political';
          clearMapModeFilters(state);
          emit('game.get_map_modes', responseFor('game.get_map_modes', undefined, emit));
          emit('game.get_map_mode_filters', responseFor('game.get_map_mode_filters', undefined, emit));
          return mockFormationSelection();
        }

        const templateId = payloadString(payload, 'templateId', 'balanced-field-army');
        if (payloadBoolean(payload, 'confirmSelection') || payloadString(payload, 'settlementId')) {
          state.formationSelectionActive = false;
          state.formationSelectionTemplateId = '';
          return {
            applied: true,
            selectionStarted: false,
            selectionActive: false,
            templateId,
            templateName: templateId === 'coastal-patrol' ? 'Coastal Patrol' : 'Balanced Field Army',
            templateType: templateId === 'coastal-patrol' ? 'naval' : 'land',
            creationCost: templateId === 'coastal-patrol' ? 420 : 500,
            selectedSettlementId: '',
            selectedSettlementName: '',
            canConfirm: false,
            message: 'Mock formation template applied.',
          } satisfies BridgeResponse<'game.apply_formation_template'>;
        }

        state.formationSelectionActive = true;
        state.formationSelectionTemplateId = templateId;
        state.activeMapMode = 'militaries';
        clearMapModeFilters(state);
        emit('game.get_map_modes', responseFor('game.get_map_modes', undefined, emit));
        emit('game.get_map_mode_filters', responseFor('game.get_map_mode_filters', undefined, emit));
        return mockFormationSelection();
      }
      case 'game.save_formation_template':
        return {
          saved: true,
          templateId: payloadString(payload, 'templateId', 'mock-template'),
          templateName: payloadString(payload, 'name', 'Mock Template'),
          message: 'Mock formation template saved.',
        } satisfies BridgeResponse<'game.save_formation_template'>;
      case 'game.delete_formation_template':
        return { deleted: true, message: 'Mock formation template deleted.' } satisfies BridgeResponse<'game.delete_formation_template'>;
      case 'game.duplicate_military_formation_template':
        return { duplicated: true, templateId: 'balanced-field-army-copy', message: 'Mock formation duplicated.' } satisfies BridgeResponse<'game.duplicate_military_formation_template'>;
      case 'game.replace_military_commander': {
        const militaryId = payloadString(payload, 'militaryId', MOCK_IDS.military);
        emit('game.get_military_data', namedMilitaryData(militaryId));
        emit('game.get_military_overview', namedMilitaryOverview());
        return undefined;
      }
      case 'game.rename_military': {
        const militaryId = payloadString(payload, 'militaryId', MOCK_IDS.military);
        const name = payloadString(payload, 'name');
        if (name) state.militaryCustomNames[militaryId] = name;
        const renamedName = state.militaryCustomNames[militaryId] ?? namedMilitaryData(militaryId).name;
        emit('game.get_military_data', namedMilitaryData(militaryId));
        emit('game.get_military_overview', namedMilitaryOverview());
        emit('game.get_selected_militaries', {
          militaries: namedMilitaryOverview().forces.slice(0, 3),
        } satisfies BridgeResponse<'game.get_selected_militaries'>);
        return {
          renamed: true,
          name: renamedName,
          message: 'Renamed',
        } satisfies BridgeResponse<'game.rename_military'>;
      }
      case 'game.split_military':
        return {
          newMilitaryId: 'mock-military-detachment',
          newMilitaryName: 'Aurelion Detachment',
        } satisfies BridgeResponse<'game.split_military'>;
      case 'game.set_language':
      case 'game.set_notification_muted':
      case 'game.reset_notification_mutes':
      case 'game.queue_settlement_building':
      case 'game.reorder_settlement_building':
      case 'game.unqueue_settlement_building':
      case 'game.demolish_settlement_building':
      case 'game.downgrade_settlement_building':
      case 'game.set_auto_assign_commands':
      case 'game.set_auto_replenish_formations':
      case 'game.clear_military_selection':
      case 'game.select_military':
      case 'game.set_military_parent':
      case 'game.set_military_delegation':
      case 'game.set_military_doctrine':
      case 'game.set_military_auto_squash_rebels':
      case 'game.set_military_forced_march':
      case 'game.start_military_embark_targeting':
      case 'game.disembark_military':
        return undefined;
      case 'game.start_military_merge_targeting': {
        const sourceId = payloadString(payload, 'militaryId', MOCK_IDS.military);
        const forces = militaryOverview().forces;
        const source = forces.find(force => force.id === sourceId) ?? forces[0];
        const target = forces.find(force => force.id !== source.id && force.isNavy === source.isNavy)
          ?? forces.find(force => force.id !== source.id)
          ?? source;
        const prompt = {
          open: true,
          targetMilitaryId: target.id,
          targetName: target.name,
          sourceMilitaryIds: [source.id],
          sourceNames: [source.name],
          isNavy: source.isNavy,
          queue: false,
          createNewTemplate: false,
        };
        emit('game.confirm_military_merge', prompt);
        return undefined;
      }
      case 'game.confirm_military_merge': {
        const closed = {
          open: false,
          targetMilitaryId: '',
          targetName: '',
          sourceMilitaryIds: [],
          sourceNames: [],
          isNavy: false,
          queue: false,
          createNewTemplate: false,
        };
        emit('game.confirm_military_merge', closed);
        return closed;
      }
      case 'game.replenish_military':
      case 'game.disband_military':
      case 'game.set_military_formation_template':
      case 'game.demote_military_command':
      case 'game.promote_military_command':
      case 'game.ungarrison_military':
      case 'game.toggle_foederati_callup':
      case 'game.set_province_build_focus':
      case 'game.adjust_subject_tax_rate':
      case 'game.handle_world_glance_input':
      case 'game.notification_events':
      case 'game.diplomatic_notification_events':
      case 'game.warning_events':
      case 'game.set_faction_border_highlight':
      case 'ui.open_external_url':
      case 'ui.open_external_link':
      case 'ui.escape_pressed':
      case 'ui.open_world_search':
        return undefined;
      case 'game.create_province_from_candidate':
        if (payloadBoolean(payload, 'playAsProvince') && !state.provinceMode) {
          state.provinceMode = true;
          state.playerGold = provincePlayerFaction.gold;
          emitPlayerFaction(emit);
          emitResources(emit);
        }
        return undefined;
      case 'ui.ally_call_dialog': {
        const closeEvent = mockAllyCallDialog(false);
        emit('ui.ally_call_dialog', closeEvent);
        return closeEvent;
      }
      case 'ui.courtier_promotion_event':
      case 'ui.sidebar_event':
        return undefined;
      default:
        console.warn(`[MockBridge] Unhandled action: ${action}`);
        return {};
    }
  }

  return {
    state,
    handle(action: string, payload: unknown, emit: MockBridgeEventEmitter) {
      return ok(responseFor(action, payload, emit));
    },
    setAppMode(mode: MockAppMode, emit: MockBridgeEventEmitter) {
      state.appMode = mode;
      emitAppMode(emit);
    },
    setProvinceMode(enabled: boolean, emit: MockBridgeEventEmitter) {
      if (state.provinceMode === enabled) return;
      state.provinceMode = enabled;
      state.playerGold = enabled ? provincePlayerFaction.gold : 22748;
      emitPlayerFaction(emit);
      emitResources(emit);
      emit('game.get_victory_conditions', responseFor('game.get_victory_conditions', undefined, emit));
      emit('game.get_bureaucratic_throughput', responseFor('game.get_bureaucratic_throughput', undefined, emit));
      emit('game.get_power_blocs', responseFor('game.get_power_blocs', undefined, emit));
      emit('game.get_dioceses', responseFor('game.get_dioceses', undefined, emit));
      emitReligionConversion(emit);
      emit('game.get_world_glances', responseFor('game.get_world_glances', undefined, emit));
      emit('ui.show_screen', {
        screen: enabled ? 'governor-faction-overview' : 'faction',
        id: currentPlayerFactionData(enabled).id,
      });
    },
    advanceDay(emit: MockBridgeEventEmitter) {
      if (state.isPaused) return;
      state.gameDay += 1;
      emitGameState(emit);
      if (state.religionConversionActive) {
        emitReligionConversion(emit);
      }
    },
    showEvent(emit: MockBridgeEventEmitter) {
      state.eventVisible = true;
      state.eventKind = 'court';
      pauseForEventPresentation(emit);
      emit('game.get_current_event', responseFor('game.get_current_event', undefined, emit));
    },
    showRecallEvent(emit: MockBridgeEventEmitter) {
      state.eventVisible = true;
      state.eventKind = 'recall';
      pauseForEventPresentation(emit);
      emit('game.get_current_event', responseFor('game.get_current_event', undefined, emit));
    },
    showImportantEvent(emit: MockBridgeEventEmitter) {
      state.eventVisible = true;
      state.eventKind = 'important';
      pauseForEventPresentation(emit);
      emit('game.get_current_event', responseFor('game.get_current_event', undefined, emit));
    },
    showTutorialSpotlight(emit: MockBridgeEventEmitter) {
      state.tutorialSpotlightVisible = true;
      emit('game.tutorial_spotlight', responseFor('game.tutorial_spotlight', { command: 'bind' }, emit));
    },
    showGovernorSelection(emit: MockBridgeEventEmitter) {
      state.governorAssignmentActive = true;
      state.selectedGovernorId = state.selectedGovernorId || MOCK_IDS.governor;
      state.activeMapMode = 'regionGovernor';
      clearMapModeFilters(state);
      emit('game.governor_assignment', mockGovernorAssignment());
      emit('ui.open_governor_assignment_picker', {});
      emit('game.get_map_modes', responseFor('game.get_map_modes', undefined, emit));
      emit('game.get_map_mode_filters', responseFor('game.get_map_mode_filters', undefined, emit));
    },
    showCourtierPromotion(emit: MockBridgeEventEmitter) {
      emit('ui.courtier_promotion_event', {
        settlementId: MOCK_IDS.settlement,
        settlementName: 'Aurelion',
        playerGold: 4280,
        promotionCost: 500,
      });
    },
    showAllyCallDialog(emit: MockBridgeEventEmitter) {
      emit('ui.ally_call_dialog', mockAllyCallDialog(true));
    },
    showNotification(emit: MockBridgeEventEmitter) {
      const person = personById(MOCK_IDS.character);
      const createdOnDay = state.gameDay;
      emit('game.notification_shown', {
        id: `mock-notification-${createdOnDay}-${Date.now()}`,
        title: 'A New Reign Begins',
        description: `${person.name} has taken control of the dominion. The court waits to see which name the new ruler will take.`,
        type: 'character',
        notificationTypeId: 'CourtAppointment',
        notificationTypeLabel: 'Court Appointments',
        timestamp: '742-06-17',
        style: 'cinematic',
        createdOnDay,
        expiresOnDay: createdOnDay + 4,
        durationDays: 4,
        hasPortrait: true,
        characterName: person.name,
        portraitLayers: person.portraitLayers,
      });
    },
    showRegularNotification(emit: MockBridgeEventEmitter) {
      const createdOnDay = state.gameDay;
      emit('game.notification_shown', {
        id: `mock-regular-notification-${createdOnDay}-${Date.now()}`,
        title: 'Building Complete',
        description: 'Aurelion has finished work on the western granary.',
        type: 'settlement',
        notificationTypeId: 'SettlementEvent',
        notificationTypeLabel: 'Settlement Events',
        timestamp: '742-06-17',
        style: 'regular',
        createdOnDay,
        expiresOnDay: createdOnDay + 4,
        durationDays: 4,
        hasPortrait: false,
      });
    },
    showActionResultNotification(emit: MockBridgeEventEmitter, succeeded = true) {
      const createdOnDay = state.gameDay;
      const person = personById(MOCK_IDS.governor);
      emit('game.notification_shown', {
        id: `mock-action-result-${createdOnDay}-${Date.now()}`,
        title: succeeded ? 'Support Secured' : 'Contact Exposed',
        description: succeeded
          ? `${person.name} joins the rebellion.`
          : `${person.name} refuses and word reaches court.`,
        type: 'character',
        notificationTypeId: 'PersonInteraction',
        notificationTypeLabel: 'Interactions',
        timestamp: '742-06-17',
        style: 'regular',
        createdOnDay,
        expiresOnDay: 0,
        durationDays: 0,
        hasPortrait: true,
        characterName: person.name,
        personId: person.id,
        portraitLayers: person.portraitLayers,
        persistUntilDismissed: true,
        actionSucceeded: succeeded,
      });
    },
    showBattleAfterActionNotification(emit: MockBridgeEventEmitter, outcome: MockOutcome = 'victory') {
      const createdOnDay = state.gameDay;
      const victory = outcome === 'victory';
      const playerFaction = playerFactionReference();
      const rivalFaction = rivalFactionReference();
      const battleName = 'Battle of Aurelion';
      const outcomeLabel = victory ? 'Victory' : 'Defeat';
      const title = battleName;
      const summary = victory
        ? 'Victory at Aurelion against The Vordic Host. Our line held the ridge while the enemy centre broke. Attacker losses: 2,430. Defender losses: 812. Spoils: 180 grain, 64 weapons.'
        : 'Defeat at Aurelion against The Vordic Host. Our attack lost momentum below the ridge and the enemy held the field. Attacker losses: 2,430. Defender losses: 812.';
      emit('game.notification_shown', {
        id: `mock-battle-aar-notification-${createdOnDay}-${Date.now()}`,
        title,
        description: summary,
        type: 'military',
        notificationTypeId: 'BattleResult',
        notificationTypeLabel: 'Battle Results',
        iconPath: '/assets/icons/I_Swords.png',
        timestamp: '742-06-17',
        style: 'regular',
        createdOnDay,
        expiresOnDay: createdOnDay + 4,
        durationDays: 4,
        hasPortrait: false,
        battleAfterActionReport: {
          available: true,
          battleName,
          outcome: outcomeLabel,
          location: 'Aurelion',
          summary,
          headerImage: victory ? '/assets/events/military-victory.png' : '/assets/events/mass-grave.png',
          spoils: victory ? '180 grain, 64 weapons' : '',
          spoilsList: victory ? [
            { resourceId: 'Grain', name: 'Grain', amount: 180, iconPath: '/assets/resources/Grain.png' },
            { resourceId: 'Weapons', name: 'Weapons', amount: 64, iconPath: '/assets/resources/Weapons.png' },
          ] : [],
          unitDamage: victory ? [
            {
              side: 'our',
              unitName: 'Limitanei Spearmen',
              unitId: 'mock-limitanei',
              militaryName: 'I Aurelian Field Army',
              militaryId: MOCK_IDS.military,
              iconPath: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
              portraitPath: '/assets/units/Rephsian/I_Cohors_Ferrata.png',
              factionId: playerFaction.id,
              factionName: playerFaction.name,
              factionColour: playerFaction.colour,
              factionSecondaryColour: playerFaction.secondaryColour,
              factionCultureGroup: playerFaction.cultureGroup,
              factionEmblem: playerFaction.emblem,
              initialStrength: 960,
              remainingStrength: 672,
              losses: 288,
              kills: 840,
              damageDealt: 913.4,
              lossPercent: 30,
              destroyed: false,
            },
            {
              side: 'our',
              unitName: 'Equites Lancers',
              unitId: 'mock-equites',
              militaryName: 'Western Garrison',
              militaryId: `${MOCK_IDS.military}-reserve`,
              iconPath: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
              portraitPath: '/assets/units/Rephsian/I_Equites_Promoti.png',
              factionId: playerFaction.id,
              factionName: playerFaction.name,
              factionColour: playerFaction.colour,
              factionSecondaryColour: playerFaction.secondaryColour,
              factionCultureGroup: playerFaction.cultureGroup,
              factionEmblem: playerFaction.emblem,
              initialStrength: 420,
              remainingStrength: 218,
              losses: 202,
              kills: 1120,
              damageDealt: 1268.7,
              lossPercent: 48.1,
              destroyed: false,
            },
            {
              side: 'enemy',
              unitName: 'Vordic Warband',
              unitId: 'mock-vordic',
              militaryName: 'The Vordic Host',
              militaryId: MOCK_IDS.rivalFaction,
              iconPath: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
              portraitPath: '/assets/units/Rephsian/I_Rephsian_Carroballista.png',
              factionId: rivalFaction.id,
              factionName: rivalFaction.name,
              factionColour: rivalFaction.colour,
              factionSecondaryColour: rivalFaction.secondaryColour,
              factionCultureGroup: rivalFaction.cultureGroup,
              factionEmblem: rivalFaction.emblem,
              initialStrength: 1200,
              remainingStrength: 0,
              losses: 1200,
              kills: 288,
              damageDealt: 341.2,
              lossPercent: 100,
              destroyed: true,
            },
          ] : [
            {
              side: 'our',
              unitName: 'Limitanei Spearmen',
              unitId: 'mock-limitanei',
              militaryName: 'I Aurelian Field Army',
              militaryId: MOCK_IDS.military,
              iconPath: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
              portraitPath: '/assets/units/Rephsian/I_Cohors_Ferrata.png',
              factionId: playerFaction.id,
              factionName: playerFaction.name,
              factionColour: playerFaction.colour,
              factionSecondaryColour: playerFaction.secondaryColour,
              factionCultureGroup: playerFaction.cultureGroup,
              factionEmblem: playerFaction.emblem,
              initialStrength: 960,
              remainingStrength: 0,
              losses: 960,
              kills: 242,
              damageDealt: 281.6,
              lossPercent: 100,
              destroyed: true,
            },
            {
              side: 'our',
              unitName: 'Equites Lancers',
              unitId: 'mock-equites',
              militaryName: 'I Aurelian Field Army',
              militaryId: MOCK_IDS.military,
              iconPath: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
              portraitPath: '/assets/units/Rephsian/I_Equites_Promoti.png',
              factionId: playerFaction.id,
              factionName: playerFaction.name,
              factionColour: playerFaction.colour,
              factionSecondaryColour: playerFaction.secondaryColour,
              factionCultureGroup: playerFaction.cultureGroup,
              factionEmblem: playerFaction.emblem,
              initialStrength: 420,
              remainingStrength: 42,
              losses: 378,
              kills: 152,
              damageDealt: 177.3,
              lossPercent: 90,
              destroyed: false,
            },
            {
              side: 'enemy',
              unitName: 'Vordic Warband',
              unitId: 'mock-vordic',
              militaryName: 'The Vordic Host',
              militaryId: MOCK_IDS.rivalFaction,
              iconPath: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
              portraitPath: '/assets/units/Rephsian/I_Rephsian_Funditores.png',
              factionId: rivalFaction.id,
              factionName: rivalFaction.name,
              factionColour: rivalFaction.colour,
              factionSecondaryColour: rivalFaction.secondaryColour,
              factionCultureGroup: rivalFaction.cultureGroup,
              factionEmblem: rivalFaction.emblem,
              initialStrength: 1200,
              remainingStrength: 806,
              losses: 394,
              kills: 1338,
              damageDealt: 1517.8,
              lossPercent: 32.83,
              destroyed: false,
            },
          ],
          ourSide: {
            label: victory ? 'Defender' : 'Attacker',
            names: 'I Aurelian Field Army and Western Garrison',
            commanders: 'Flavius Marcellus',
            commanderDetails: [{
              id: MOCK_IDS.character,
              name: 'Flavius Marcellus',
              portraitLayers: mockPortraitLayers(MALE_PORTRAIT_1),
              isAlive: true,
              isImprisoned: false,
            }],
            unitLabel: 'Manpower',
            factionId: playerFaction.id,
            factionName: playerFaction.name,
            factionColour: playerFaction.colour,
            factionSecondaryColour: playerFaction.secondaryColour,
            factionCultureGroup: playerFaction.cultureGroup,
            factionEmblem: playerFaction.emblem,
            initialStrength: 5280,
            remainingStrength: victory ? 4468 : 1490,
            losses: victory ? 812 : 3790,
            lossPercent: victory ? 15.38 : 71.78,
            won: victory,
          },
          enemySide: {
            label: victory ? 'Attacker' : 'Defender',
            names: 'The Vordic Host',
            commanders: 'Aldric Vorn',
            commanderDetails: [{
              id: MOCK_IDS.heir,
              name: 'Aldric Vorn',
              portraitLayers: mockPortraitLayers(MALE_PORTRAIT_2),
              isAlive: true,
              isImprisoned: false,
            }],
            unitLabel: 'Manpower',
            factionId: rivalFaction.id,
            factionName: rivalFaction.name,
            factionColour: rivalFaction.colour,
            factionSecondaryColour: rivalFaction.secondaryColour,
            factionCultureGroup: rivalFaction.cultureGroup,
            factionEmblem: rivalFaction.emblem,
            initialStrength: 3920,
            remainingStrength: victory ? 1490 : 3108,
            losses: victory ? 2430 : 812,
            lossPercent: victory ? 61.99 : 20.71,
            won: !victory,
          },
        },
      });
    },
    showVictory(emit: MockBridgeEventEmitter) {
      emit('ui.show_victory_screen', mockVictoryOutcomeSummary());
    },
    showDefeat(emit: MockBridgeEventEmitter, cause: MockDefeatCause = 'rebellion') {
      emit('ui.show_game_over_screen', mockDefeatOutcomeSummary(cause));
    },
    launch(request: MockLaunchRequest, emit: MockBridgeEventEmitter) {
      if (request.appMode) this.setAppMode(request.appMode, emit);
      if (request.screen) emit('ui.show_screen', { screen: request.screen, id: request.screenId ?? defaultIdForScreen(request.screen) });
      if (request.sidebar) emit('ui.sidebar_event', { type: request.sidebar, id: request.sidebarId ?? defaultIdForSidebar(request.sidebar), tabIndex: request.sidebarTabIndex });
      if (request.notification) this.showNotification(emit);
      if (request.regularNotification) this.showRegularNotification(emit);
      if (request.actionResultNotification) this.showActionResultNotification(emit);
      if (request.battleAarNotification) this.showBattleAfterActionNotification(emit, request.battleAarOutcome);
      if (request.event) this.showEvent(emit);
      if (request.importantEvent) this.showImportantEvent(emit);
      if (request.recallEvent) this.showRecallEvent(emit);
      if (request.tutorialSpotlight) this.showTutorialSpotlight(emit);
      if (request.governorSelection) this.showGovernorSelection(emit);
      if (request.courtier) this.showCourtierPromotion(emit);
      if (request.allyCall) this.showAllyCallDialog(emit);
      if (request.outcome === 'victory') this.showVictory(emit);
      if (request.outcome === 'defeat') this.showDefeat(emit, request.defeatCause);
    },
  };
}

export function defaultIdForSidebar(sidebar: string): string {
  switch (sidebar) {
    case 'settlement':
      return MOCK_IDS.settlement;
    case 'military':
      return MOCK_IDS.military;
    case 'diplomacy':
    case 'faction':
      return MOCK_IDS.rivalFaction;
    case 'character':
      return MOCK_IDS.character;
    case 'powerbloc':
      return MOCK_IDS.powerBloc;
    case 'formation-template':
      return 'balanced-field-army';
    default:
      return MOCK_IDS.settlement;
  }
}

export function defaultIdForScreen(screen: string): string {
  const lower = screen.toLowerCase();
  if (lower.includes('battle')) return MOCK_IDS.battle;
  if (lower.includes('peace')) return MOCK_IDS.rivalFaction;
  if (lower.includes('faction')) return MOCK_IDS.playerFaction;
  if (lower.includes('family')) return MOCK_IDS.playerFaction;
  if (lower.includes('personalguard') || lower === 'guard') return 'personalguard';
  return '';
}

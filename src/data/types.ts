import type { BattleAfterActionReportPayload, CultureInfo, ReligionInfo, PortraitLayerData, WebUIRoleTierData } from '../bridge-types.generated.ts';

export type { BattleAfterActionReportPayload, CultureInfo, ReligionInfo, PortraitLayerData, WebUIRoleTierData };

export type StatKey = 'tactics' | 'authority' | 'cunning' | 'governance' | 'loyalty' | 'constitution';

export interface TraitEffect {
  /** Machine key for the affected stat, e.g. "tactics". Empty for non-stat effects. */
  stat: string;
  label: string;
  value: string;
  isPositive: boolean;
}

export interface CharacterTrait {
  id: string;
  name: string;
  icon: string;
  description: string;
  isPositive: boolean;
  effects?: TraitEffect[];
  /** True if the trait is time-limited and will expire. */
  isTemporary?: boolean;
  /** Days remaining until expiry (only meaningful when isTemporary). */
  remainingDays?: number;
  /** Total duration the trait was granted for (only meaningful when isTemporary). */
  totalDurationDays?: number;
}

export interface CharacterStatModifier {
  stat: StatKey;
  label: string;
  value: number;
  /** Days remaining until the modifier fully decays. Undefined means no decay. */
  remainingDays?: number;
  /** Original duration in days, when the modifier decays over time. */
  totalDurationDays?: number;
}

export interface CharacterRelationship {
  type: string;
  characterId: string;
  characterName: string;
  age?: number;
  isAlive?: boolean;
  /** Portrait path for relationship display */
  portrait?: string;
  portraitLayers?: PortraitLayerData;
}

/** A single luxury slot requirement */
export interface LuxurySlot {
  name: string;
  icon: string;
  required: number;
  provided: number;
}

/** Structured activity with optional clickable link segments */
export interface ActivitySegment {
  text: string;
  linkType?: 'faction' | 'settlement' | 'army' | 'military' | 'character';
  linkId?: string;
}

export interface CharacterHistoryEntry {
  type: 'RulingFaction' | 'InCourt' | 'MilitaryCommand' | 'Diplomat' | 'Spy' | 'Imprisoned' | 'Governorship' | string;
  label: string;
  targetId?: string;
  targetType?: string;
  targetName: string;
  secondaryTargetId?: string;
  secondaryTargetType?: string;
  secondaryTargetName?: string;
  startDate?: string;
  endDate?: string;
  startDay: number;
  endDay?: number;
  isActive: boolean;
  detail?: string;
}

export type SettlementTier = 'city' | 'town' | 'village' | 'metropolis' | 'fortress' | 'monastery' | 'port' | 'mining';

export interface CharacterGovernedRegion {
  id: string;
  name: string;
  focusSettlementId: string;
}

export interface CharacterCourtPosition {
  key: string;
  name: string;
  courtFactionId?: string;
  courtFactionName?: string;
  isSubordinate?: boolean;
}

export interface CharacterCommandedMilitary {
  id: string;
  name: string;
  isNavy: boolean;
  rank: string;
}

export interface DisplayTextSegment {
  text: string;
  tone?: string;
  conceptId?: string;
  linkType?: string;
  linkId?: string;
  isStrong?: boolean;
}

export interface DisplayTextLine {
  kind?: string;
  tone?: string;
  conceptId?: string;
  segments?: DisplayTextSegment[];
}

export interface CharacterStats {
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
  /** Unmodified base stats before trait and role modifiers. */
  base?: {
    tactics: number;
    authority: number;
    cunning: number;
    governance: number;
    loyalty: number;
    constitution: number;
  };
  /** Event- and interaction-granted stat modifiers that decay over time. */
  temporaryModifiers?: CharacterStatModifier[];
}

/** What the character is currently doing (mirrors EPersonActivity) */
export type PersonActivity = 'RulingFaction' | 'LeadingSettlement' | 'CommandingArmy' | 'InCourt' | 'Diplomat' | 'Spy' | 'Deceased' | 'None';

/** Role experience per specialisation (mirrors ERoleType). XP 0-1000 each. */
export interface RoleExperience {
  military: number;
  administrative: number;
  diplomatic: number;
  intrigue: number;
}

export interface RoleTiers {
  military: WebUIRoleTierData;
  administrative: WebUIRoleTierData;
  diplomatic: WebUIRoleTierData;
  intrigue: WebUIRoleTierData;
}

export interface Character {
  id: string;
  name: string;
  /** Full title as the game emits it, e.g. "Imperator of the Rephsian Empire". */
  title: string;
  /** Role-only form of the title (e.g. "Imperator"). Emitted by
   *  `UPersonIdentity::GetShortTitle()` in C++ and consumed by UI chrome
   *  where the faction/location already appears elsewhere. */
  shortTitle: string;
  age: number;
  /** Formatted date this character was born. */
  birthDate?: string;
  /** Formatted date this character died, when deceased. */
  deathDate?: string;
  /** Formatted birth-death span, when deceased. */
  lifespan?: string;
  debugShortId?: number;
  debugAgeDays?: number;
  vigor?: number;
  isImmortal?: boolean;
  powerBlocName?: string;
  powerBlocDebugShortId?: number;
  commanderKind?: string;
  portrait: string;
  portraitLayers?: PortraitLayerData;
  faction: string;
  factionId?: string;
  factionColour?: string;
  factionSecondaryColour?: string;
  factionEmblem?: string;
  factionCultureGroup?: string;
  factionDiplomaticStatus?: string;
  factionSubjectSubtype?: string;
  factionIsPlayer?: boolean;
  factionIsRebel?: boolean;
  culture: string;
  religion: string;
  /** Full culture data for tooltip (description + flags). */
  cultureInfo?: CultureInfo;
  /** Full religion data for tooltip (description + numeric effects). */
  religionInfo?: ReligionInfo;
  stats: CharacterStats;
  traits: CharacterTrait[];
  /** Honour/Dread: -1.0 (Dreaded) to +1.0 (Virtuous). 0 = neutral. */
  honourDread: number;
  fame: number;
  /** What the character is currently doing */
  activity: PersonActivity;
  /** Structured activity segments with optional clickable links */
  activitySegments?: ActivitySegment[];
  /** Chronological record of court, command, prison, and governorship roles */
  history?: CharacterHistoryEntry[];
  /** Per-role experience points (0-1000 each) */
  roleExperience: RoleExperience;
  /** Per-role tier labels and stars from the game rules. */
  roleTiers?: RoleTiers;
  /** Compliance toward the player character (0-100). Only meaningful when isSubordinateOfPlayer. */
  compliance: number;
  /** True when this character is the player's leader. */
  isPlayerCharacter?: boolean;
  /** True when this character leads their faction. */
  isRuler?: boolean;
  /** Faction name with article for ruler title suffixes, e.g. "the Rephsian Empire". */
  rulerFactionName?: string;
  /** True when this character is their faction's current heir. */
  isHeir?: boolean;
  /** True when this character has been manually marked as heir. */
  isDesignatedHeir?: boolean;
  /** True when this character is family to the player character. */
  isFamilyOfPlayer?: boolean;
  /** True when this character is in the player's faction and the player leads that faction. */
  isSubordinateOfPlayer?: boolean;
  /** Player's relation to this character ("Spouse", "Son", "Patron", etc.) or empty. */
  relationToPlayer?: string;
  /** Sorted modifier breakdown of compliance toward the player. */
  complianceBreakdown?: { key?: string; label: string; value: number }[];
  /** Net opinion this character has towards the player (sum of modifiers). */
  opinionTowardPlayer?: number;
  /** Sorted modifier breakdown of this character's opinion towards the player. */
  opinionBreakdown?: { key?: string; label: string; value: number }[];
  /** Sorted modifier breakdown for honour/dread. */
  honourDreadBreakdown?: { label: string; value: number }[];
  /** Regions this character governs */
  governedRegions: CharacterGovernedRegion[];
  /** Imperial court office currently held by this character, if any. */
  courtPosition?: CharacterCourtPosition;
  /** Army or navy currently commanded by this character, if any. */
  commandedMilitary?: CharacterCommandedMilitary;
  relationships: CharacterRelationship[];
  /** Whether the character is alive */
  isAlive?: boolean;
  /** Whether the character is imprisoned */
  isImprisoned?: boolean;
  /** Who imprisoned this character (faction name) */
  imprisonedBy?: string;
  /** Where the character is imprisoned (settlement name) */
  imprisonedAt?: string;
  /** Imprisonment reason from EImprisonmentReason ("EnemyCombatant", "Hostage", etc.). */
  imprisonmentReason?: string;
  /** Cause of death if deceased */
  deathCause?: string;
  /** Luxury slot requirements */
  luxuryNeeds?: LuxurySlot[];
}

export interface FactionTreaty {
  id?: string;
  type: string;
  displayName?: string;
  description?: string;
  withFaction: string;
  withFactionId?: string;
  withFactionDebugShortId?: number;
  withFactionColour?: string;
  withFactionSecondaryColour?: string;
  withFactionCulture?: string;
  withFactionCultureGroup?: string;
  withFactionEmblem?: string;
  withFactionDiplomaticStatus?: string;
  withFactionSubjectSubtype?: string;
  withFactionIsPlayer?: boolean;
  withFactionIsRebel?: boolean;
  turnsRemaining?: number;
  daysRemaining?: number;
  isPerpetual?: boolean;
  canBreak?: boolean;
  breakingPenalty?: number;
  isWithPlayer?: boolean;
}

export interface FactionOpinionModifier {
  key?: string;
  label: string;
  value: number;
}

export interface FactionPolicyLevel {
  level: number;
  value: number;
  effectDescription: string;
  effectLines?: DisplayTextLine[];
  isCurrent: boolean;
}

export interface FactionWarPartner {
  id: string;
  debugShortId?: number;
  name: string;
  colour: string;
  secondaryColour?: string;
  cultureGroup?: string;
  emblem?: string;
  diplomaticStatus?: string;
  subjectSubtype?: string;
  isPlayer?: boolean;
  isRebel?: boolean;
}

export interface FactionPolicy {
  id: string;
  key: string;
  iconId: string;
  name: string;
  description: string;
  effectDescription: string;
  effectLines?: DisplayTextLine[];
  increaseEffectDescription: string;
  increaseEffectLines?: DisplayTextLine[];
  decreaseEffectDescription: string;
  decreaseEffectLines?: DisplayTextLine[];
  levelEffects: FactionPolicyLevel[];
  displayFactionName: string;
  isFromLiege: boolean;
  value: number;
  minValue: number;
  maxValue: number;
  increaseCost: number;
  decreaseCost: number;
  increaseDuration: number;
  decreaseDuration: number;
  increaseCausesUnrest: boolean;
  decreaseCausesUnrest: boolean;
  canModify: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  inProgress: boolean;
  activeDirection: 'increase' | 'decrease' | '';
  progress: number;
  remainingDays: number;
  durationDays: number;
  bureaucraticIncreaseLoad: number;
  bureaucraticDecreaseLoad: number;
  bureaucraticCurrentLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
}

export interface FactionModifierSource {
  label: string;
  value: number;
}

export interface FactionModifier {
  key: string;
  label: string;
  description: string;
  icon: string;
  value: number;
  isPercent: boolean;
  isMultiplier: boolean;
  invertColouring: boolean;
  decimals: number;
  sources: FactionModifierSource[];
}

export interface FactionHeir {
  id: string;
  name: string;
}

export interface Faction {
  id: string;
  debugShortId?: number;
  name: string;
  colour: string;
  /** Secondary colour (hex) — used to tint the emblem. */
  secondaryColour?: string;
  rulerName: string;
  rulerId: string;
  rulerDebugShortId?: number;
  rulerPortrait?: string;
  rulerPortraitLayers?: PortraitLayerData;
  strength: number;
  isPlayer: boolean;
  isRebel: boolean;
  rebelTypeName?: string;
  rebelGoalName?: string;
  rebelGoalDescription?: string;
  diplomaticStatus: "ally" | "rival" | "neutral" | "war" | "subject";
  /** Subject subtype, such as province, foederati, protectorate, or subject. */
  subjectSubtype?: string;
  /** Display label for the subject subtype. */
  subjectType?: string;
  /** Immediate overlord for a subject faction. */
  overlordName?: string;
  culture: string;
  /** Culture family name (e.g. "Svaranic", "Rephsian"). */
  cultureGroup?: string;
  /** Faction emblem key (e.g. "Gwendic_1"). Encodes both group and per-faction variant. */
  emblem?: string;
  /** Culture row name (e.g. "Gwendic"), used to build icon asset paths. */
  cultureId?: string;
  religion: string;
  /** Religion row name (e.g. "Aurelianism"), used to build icon asset paths. */
  religionId?: string;
  /** Government mode id, such as Tribe, Empire, Kingdom, or Province. */
  government?: string;
  /** Player-facing government mode name. */
  governmentDisplayName?: string;
  /** Player-facing government mode description. */
  governmentDescription?: string;
  /** Player-facing government capability summary lines. */
  governmentCapabilities?: string[];
  /** This government dispatches a generated replacement ruler instead of tracking an heir. */
  generatesLeaderOnSuccession?: boolean;
  /** Full culture data for tooltip (description + flags). */
  cultureInfo?: CultureInfo;
  /** Full religion data for tooltip (description + numeric effects). */
  religionInfo?: ReligionInfo;
  /** Opinion of the player faction (0-100) */
  opinion: number;
  description: string;
  treaties: FactionTreaty[];
  /** Factions this faction is currently at war with. */
  wars?: FactionWarPartner[];
  /** Enemy war leader to use when opening peace negotiations from this faction. */
  peaceNegotiationTargetFactionId?: string;
  /** Faction-wide policies and current adjustment state. */
  policies: FactionPolicy[];
  /** Active faction-wide modifiers from policies, edicts, court positions, and similar sources. */
  modifiers: FactionModifier[];
  /** Modifiers that compose this faction's opinion of the player. */
  opinionBreakdown?: FactionOpinionModifier[];
  /** Subjects only: breakdown of factors composing the ruler's compliance. */
  complianceBreakdown?: FactionOpinionModifier[];
  /** Subjects only: ruler's compliance toward the player. */
  compliance?: number;
  /** Player's own military strength, for the comparison bar. */
  playerStrength?: number;
  /** Province subjects only: current settlement build preference. */
  buildFocusKey?: string;
  buildFocus?: string;
  canSetBuildFocus?: boolean;
  buildFocusBlockedReason?: string;
  /** Gold in treasury */
  gold: number;
  /** Monthly gold income */
  income: number;
  /** Total population across direct holdings and subject territories */
  population: number;
  /** Population in settlements this faction controls directly */
  directPopulation?: number;
  /** Population across direct subject territories */
  subjectPopulation?: number;
  /** Projected net monthly population change (people per month) */
  populationMonthlyChange?: number;
  /** Absolute people/month sources composing the monthly change */
  populationGrowthBreakdown?: ModifierSource[];
  /** Number of controlled settlements */
  settlements: number;
  /** Settlements owned by direct subject factions */
  subjectSettlements?: number;
  /** Number of vassal factions */
  vassalCount: number;
  /** Number of active armies */
  armyCount: number;
  /** True when this faction raises temporary levies instead of standing armies. */
  usesLevies?: boolean;
  /** Current levy strength that could be called up, or active levy strength when raised. */
  levyStrength?: number;
  /** True when this foederati subject currently has its levies in the field. */
  isFoederatiCalledUp?: boolean;
  /** True when the player can call up this foederati subject's levies. */
  canCallFoederati?: boolean;
  /** Capital settlement name */
  capital: string;
  /** Player's diplomat assigned to this faction, if any. */
  assignedDiplomat?: { id: string; name: string };
  /** Player's spy assigned to this faction, if any. */
  assignedSpy?: { id: string; name: string };
  /** Spy network built up on this faction. Strength 0-100, growth in points per month. */
  spyNetwork?: {
    strength: number;
    heat: number;
    growthPerMonth: number;
    spyCunning: number;
  };
  /** Province subjects only: true when the player can choose the successor. */
  canSetDesignatedHeir?: boolean;
  /** Manually chosen successor for a province subject, if any. */
  designatedHeir?: FactionHeir;
  /** Current effective successor for this faction, if any. */
  effectiveHeir?: FactionHeir;
}

/** Matches EBuildingCategory in Source/Strategy/Public/Locations/Building.h. */
export type BuildingCategory =
  | 'economic'
  | 'military'
  | 'defensive'
  | 'infrastructure'
  | 'cultural'
  | 'administrative'
  | 'naval'
  | 'other';

/** One entry of a building's ResourceCost TMap. Matches the upfront cost paid
 *  from settlement Stockpile (or Faction.StoredResources if capital). */
export interface BuildingResourceCost {
  /** Raw FName like "Stone", "Wood", "Iron", "PreciousMetals". */
  name: string;
  displayName?: string;
  description?: string;
  effects?: string;
  /** /assets/resources/<name>.png */
  icon: string;
  amount: number;
}

/** Mirrors FBuildButtonInfo + Reason from GetEffectiveBuildButtonInfo. */
export interface BuildingBuildState {
  /** 'visible' = buildable now, 'greyed' = visible but locked, 'hidden' = not shown. */
  state: 'visible' | 'greyed' | 'hidden';
  /** Displayed when greyed (e.g. "Requires Palisades at maximum level (2/3)."). */
  reason?: string;
  /** True when the lock comes from Common_RequiresPopulation. */
  blockedByPopulation?: boolean;
}

export interface Building {
  id: string;
  /** UBuilding.AssetKey (e.g. "Forum", "Barracks", "GreatStoneWall"). Optional
   *  because some bridge responses omit it. */
  assetKey?: string;
  name: string;
  level: number;
  /** UBuilding.MaxLevel. Defaulted when the bridge omits it. */
  maxLevel?: number;
  /** UBuilding.Category. */
  category?: BuildingCategory;
  /** UBuilding.ChainName - the chain label shown in the browser. */
  chainName?: string;
  /** /assets/buildings/<asset-key>.png (kebab-case). Fallback handled in UI. */
  icon?: string;
  /** Authored, localised building effect rich text from UBuilding.DefaultEffects. */
  effectsText?: string;
  /** Long description shown in tooltip. */
  description?: string;
  /** Current structural condition 0-100. <=0 is a Ruin. */
  condition?: number;
  /** Condition gained or lost during the next ordinary monthly maintenance tick. */
  monthlyConditionChange?: number;
  /** Governor Governance required to prevent ordinary condition decay. */
  maintenanceGovernanceThreshold?: number;
  /** Gold price to upgrade to the next level (0 when at MaxLevel). */
  nextLevelPrice?: number;
  /** Days to upgrade to the next level. */
  nextLevelBuildTime?: number;
  /** UBuilding.Upkeep (gold per month). */
  upkeep?: number;
  /** Resource cost to upgrade to the next level. Empty when at max. */
  resourceCost?: BuildingResourceCost[];
  /** Resources and gold returned by dismantling this building. */
  dismantleSpoils?: BuildingResourceCost[];
  /** Whether queueing the next level is currently possible. */
  nextBuildState?: BuildingBuildState;
  /** Parent in the chain (UBuilding.DevelopedFrom). */
  developedFrom?: string;
  /** Children in the chain (UBuilding.CanBeDevelopedInto). */
  canBeDevelopedInto?: string[];
  /** Cross-chain prerequisites (UBuilding.RequiredBuildings) that must exist
   *  separately from DevelopedFrom. Rendered as an inline "requires" row on
   *  the card alongside tick/cross indicators of what the settlement has. */
  requiredBuildings?: BuildingRequirement[];
  /** If true, building DevelopedInto removes this one (default behaviour). */
  replacesParent?: boolean;
  /** If true, blocks any further construction while present. */
  blocksConstruction?: boolean;
  canDemolish?: boolean;
  demolishReason?: string;
  canDowngrade?: boolean;
  downgradeReason?: string;
  downgradeTargetName?: string;
  downgradeTargetLevel?: number;
  canRepair?: boolean;
  repairReason?: string;
  repairGoldCost?: number;
  repairResourceCost?: BuildingResourceCost[];
}

/** One cross-chain prerequisite entry. */
export interface BuildingRequirement {
  assetKey: string;
  name: string;
  icon?: string;
  /** True when this prerequisite is already satisfied at the settlement. */
  met: boolean;
}

/** A building that can appear in the browser tree but is not built at this settlement. */
export interface AvailableBuilding {
  id: string;
  assetKey: string;
  name: string;
  maxLevel: number;
  category: BuildingCategory;
  chainName?: string;
  icon?: string;
  description?: string;
  effectsText?: string;
  price: number;
  buildTime: number;
  upkeep: number;
  resourceCost: BuildingResourceCost[];
  developedFrom?: string;
  canBeDevelopedInto?: string[];
  requiredBuildings?: BuildingRequirement[];
  /** If true, building this removes the predecessor (default behaviour). */
  replacesParent?: boolean;
  /** Result of GetEffectiveBuildButtonInfo for this settlement. */
  buildState: BuildingBuildState;
}

export type ConstructionQueueState = 'queued' | 'awaiting_resources' | 'starting' | 'building';

export interface ConstructionQueueItem {
  id: string;
  /** Real APopulationCentre.BuildList index for this building queue item. */
  queueIndex?: number;
  assetKey: string;
  name: string;
  icon?: string;
  /** Long description shown in the queue-card tooltip. */
  description?: string;
  /** Authored building effect rich text for the queued level. */
  effectsText?: string;
  /** 'new' = fresh build; 'upgrade' = level+1; 'rebuild' = restore a ruin at its current level. */
  kind: 'new' | 'upgrade' | 'rebuild';
  toLevel: number;
  /** Full cost paid upfront when queued (for display). */
  goldCost: number;
  resourceCost: BuildingResourceCost[];
  /** Total build time in game-days. */
  durationDays: number;
  /** Only set for the head-of-queue item that is actively building. */
  remainingDays?: number;
  /** Queue processing state from the settlement build queue. */
  state?: ConstructionQueueState;
  /** Localised queue status label ("Queued", "Awaiting Resources", ...). */
  statusLabel?: string;
  /** Extra detail such as "Waiting for items ahead in queue". */
  statusReason?: string;
  /** Missing resources for items that cannot start yet. */
  missingResources?: BuildingResourceCost[];
}

export interface SettlementConstruction {
  queue: ConstructionQueueItem[];
  /** True when a bBlocksConstruction building (Fortress/Hermitage) is active
   *  or under construction, freezing the queue. */
  constructionBlocked?: boolean;
  constructionBlockerName?: string;
}

// ---------------------------------------------------------------------------
// Military recruitment - mirrors UArmyUnit / UMilitaryFormationTemplate and
// APopulationCentre.Modifiers.ArmyUnitTypeMaxTierRecruitment. Settlements
// share one BuildQueue for construction + unit training, but the Military
// tab filters to unit items only for clarity.
// ---------------------------------------------------------------------------

/** Matches EArmyUnitType. */
export type ArmyUnitType = 'infantry' | 'cavalry' | 'ranged' | 'siege' | 'navy';

/** Matches EMilitaryUnitTier (Tier1..Tier4). */
export type UnitTier = 1 | 2 | 3 | 4;

/** Three-axis damage or armour (pierce/crush/slash). */
export interface UnitStatTriplet {
  pierce: number;
  crush: number;
  slash: number;
}

export interface RecruitableUnit {
  id: string;
  /** Class name (e.g. "RephsianLimitanei"). */
  assetKey: string;
  name: string;
  description: string;
  /** Path to the portrait PNG (e.g. /assets/units/Rephsian/I_Rephsian_Sagittarii.png). */
  portrait: string;
  type: ArmyUnitType;
  tier: UnitTier;
  price: number;
  /** Days to train one unit. */
  buildTime: number;
  /** Monthly gold upkeep at full strength. */
  upkeep: number;
  foodConsumption: number;
  maxStrength: number;
  speed: number;
  /** Attacks per second. */
  attackSpeed: number;
  damage: UnitStatTriplet;
  armour: UnitStatTriplet;
  /** Strategic resources consumed per recruit (Weapons, Armour, Horses...).
   *  Matches UArmyUnit.ResourceUsage. */
  resourceCost: BuildingResourceCost[];
  /** Strategic resources consumed each month at full strength.
   *  Matches UArmyUnit.GetFullStrengthMonthlyConsumption. */
  monthlyConsumption?: BuildingResourceCost[];
  /** True if the unit ignores winter attrition (UArmyUnit.bImmuneToSnowAttrition). */
  immuneToWinterAttrition?: boolean;
  /** True if the unit ignores desert attrition (UArmyUnit.bImmuneToDesertAttrition). */
  immuneToDesertAttrition?: boolean;
  /** True if this unit may complete attacks while its formation is moving. */
  canAttackWhileMoving?: boolean;
  /** Asset key of the building that gates this unit (e.g. "Barracks"). */
  sourceBuilding?: string;
  /** Asset key of the class this unit upgrades into, if any. */
  upgradesTo?: string;
  /** Asset key of the class this downgrades into, if any. */
  downgradesTo?: string;
}

export interface UnitRecruitmentEntry {
  unit: RecruitableUnit;
  /** True = visible and recruitable; false = visible but greyed out. */
  available: boolean;
  /** Shown in tooltip and under the card when unavailable. */
  lockReason?: string;
}

export interface FormationUnitSlot {
  unitAssetKey: string;
  unitName: string;
  portrait: string;
  type: ArmyUnitType;
  tier: UnitTier;
  count: number;
}

/** Faction-level military formation template. Shared across all settlements
 *  of the faction; each settlement may or may not be able to raise it based
 *  on which unit classes its buildings unlock. */
export interface FormationTemplate {
  id: string;
  name: string;
  type: 'land' | 'naval';
  composition: FormationUnitSlot[];
  totalPrice: number;
  totalBuildTime: number;
  monthlyUpkeep: number;
  totalStrength: number;
  /** True if this settlement can raise the whole composition unassisted. */
  raisableHere: boolean;
  /** Per-slot issues when not raisable (e.g. "Cannot train Palatine Cataphracts
   *  - requires Stable at Lv 4 (currently 2)"). */
  lockReasons?: string[];
}

export interface UnitTrainingQueueItem {
  id: string;
  assetKey: string;
  name: string;
  portrait: string;
  type: ArmyUnitType;
  tier: UnitTier;
  /** If part of a formation being raised: the formation id + name + progress. */
  formationId?: string;
  formationName?: string;
  formationProgress?: { completed: number; total: number };
  /** Only set for the head-of-queue item being actively trained. */
  progressPercent?: number;
  remainingDays?: number;
  durationDays: number;
}

export interface SettlementRecruitment {
  /** Highest tier of each unit type the settlement can currently train,
   *  driven by building ArmyUnitTypeMaxTierRecruitment modifiers. 0 = locked. */
  maxTier: Record<ArmyUnitType, 0 | UnitTier>;
  /** All culture-available units with availability flags. */
  recruits: UnitRecruitmentEntry[];
  /** Faction formation templates the player has defined. */
  formations: FormationTemplate[];
  /** Active + queued unit training (shared with the construction BuildQueue). */
  trainingQueue: UnitTrainingQueueItem[];
}

export interface GarrisonUnit {
  name: string;
  description: string;
  type: string;
  typeIcon: string;
  portrait: string;
  tier: number;
  sourceBuilding: string;
  strength: number;
  maxStrength: number;
  upkeep: number;
  foodConsumption: number;
  speed: number;
  /** Attacks per second. */
  attackSpeed: number;
  pierceDmg: number;
  crushDmg: number;
  slashDmg: number;
  pierceArm: number;
  crushArm: number;
  slashArm: number;
  veterancy: number;
  culture: string;
}

export interface GarrisonedArmy {
  id?: string;
  debugShortId?: number;
  name: string;
  commanderName: string;
  commanderId?: string;
  commanderDebugShortId?: number;
  commanderPortrait: string;
  commanderTitle: string;
  strength: number;
  maxStrength: number;
  morale: number;
  unitCount: number;
}

export interface CultureShare {
  id?: string;
  name: string;
  percent: number;
  color: string;
  icon?: string;
  description?: string;
  info?: CultureInfo;
  /** Settlement-specific monthly share change, in percentage points. */
  monthlyChangePercent?: number;
  /** Settlement-specific causes of change, in percentage points per month. */
  pressureSources?: ModifierSource[];
}

export interface ReligionShare {
  id?: string;
  name: string;
  percent: number;
  color: string;
  icon?: string;
  description?: string;
  info?: ReligionInfo;
  monthlyChangePercent?: number;
  pressureSources?: ModifierSource[];
  conversionResistancePercent?: number;
  zealousMinority?: boolean;
  naturallyGrowing?: boolean;
  naturallyDeclining?: boolean;
  persecutionResilience?: boolean;
}

export interface PopGroup {
  cultureId?: string;
  culture: string;
  cultureAdjective: string;
  cultureIcon?: string;
  religion: string;
  religionAdherentPlural: string;
  religionIcon?: string;
  count: number;
  unrest: number;
  monthlyGrowth?: number;
  growthBreakdown?: { name: string; value: number }[];
  /** Per-pop unrest breakdown sources (percentages) */
  unrestBreakdown?: { name: string; value: number }[];
  /** People from this pop changing religion per month (negative = losing); target religion name. */
  monthlyConversion?: number;
  conversionTargetReligion?: string;
  /** People from this pop changing culture per month (negative = losing); target culture name. */
  monthlyAssimilation?: number;
  assimilationTargetCulture?: string;
}

export interface ModifierSource {
  name: string;
  value: number;
  key?: string;
}

export interface SettlementModifier {
  key: string;
  label: string;
  icon: string;
  /** Optional numeric value; qualitative modifiers (Pillaged, Disease) omit this */
  total?: number;
  isPercent?: boolean;
  sources?: ModifierSource[];
  /** Localised description shown in the tooltip */
  description?: string;
}

export interface SettlementDisease {
  hasDisease: boolean;
  name: string;
  description: string;
  severity: number;
  severityLabel: string;
  daysRemaining: number;
  deaths: number;
  effects: ModifierSource[];
}

export interface SettlementBishopric {
  religion: ReligionInfo;
  religionKey: string;
  religionName: string;
  religionIcon: string;
  clergyTitle: string;
  canManage: boolean;
  bishop: Character | null;
  authority: number;
  landReligionShare: number;
  landFollowers: number;
  landPopulation: number;
}

export interface Settlement {
  id: string;
  debugShortId?: number;
  name: string;
  faction: string;
  /** Stable faction GUID. Prefer this over the name string for lookups and sidebar navigation. */
  factionId?: string;
  factionDebugShortId?: number;
  factionColour: string;
  /** Secondary faction colour (hex) — used to tint the emblem. */
  factionSecondaryColour?: string;
  /** Emblem asset key (matches bridge emblem id, e.g. "eagle"). */
  factionEmblem?: string;
  /** Culture group of the owning faction — used by FactionRoundel for fallback styling. */
  factionCultureGroup?: string;
  factionDiplomaticStatus?: string;
  factionSubjectSubtype?: string;
  factionIsPlayer?: boolean;
  factionIsRebel?: boolean;
  /** True if this settlement is its faction's capital. */
  isCapital?: boolean;
  /** True if the owning faction is independent (i.e. not a subject of another). */
  isFactionIndependent?: boolean;
  canRename?: boolean;
  canManageGovernor?: boolean;
  governorCouldRebel?: boolean;
  showSetCapital?: boolean;
  canSetCapital?: boolean;
  capitalMoveCost?: number;
  capitalMoveBlockedReason?: string;
  canNavigateSettlements?: boolean;
  type: "village" | "town" | "city" | "metropolis" | "fortress" | "monastery" | "port" | "mining";
  population: number;
  /** Absolute monthly population change in people. */
  populationGrowth: number;
  /** Comfortable population before overcrowding tapers growth. */
  populationCapacity: number;
  /** Base limit plus each source that raises or lowers it. */
  populationCapacityBreakdown?: ModifierSource[];
  income: number;
  food: number;
  foodProduction: number;
  foodConsumption: number;
  /** Administrative corruption (0-1). */
  corruption: number;
  fortificationLevel: number;
  governor: Character | null;
  culture: string;
  culturePercent: number;
  religion: string;
  religionPercent: number;
  unrest: number;
  /** Bridge-supplied descriptor (Peaceful/Calm/Restless/Unruly/Revolting). */
  unrestLabel?: string;
  buildings: Building[];
  /** Browser-visible buildings that can be queued (or are locked with a reason).
   *  Mirrors GatherBuildingClasses filtered by culture + port + category. */
  availableBuildings?: AvailableBuilding[];
  /** True when the settlement has port access (HasPort()), unlocks Naval. */
  hasPort?: boolean;
  /** Active + queued construction. */
  construction?: SettlementConstruction;
  /** Recruitable units, formation templates, and the training queue. */
  recruitment?: SettlementRecruitment;
  garrison: GarrisonUnit[];
  garrisonedArmies: GarrisonedArmy[];
  canViewGarrison?: boolean;
  garrisonHiddenReason?: string;
  resourceCategories?: ResourceCategory[];
  resources: Resource[];
  region: string;
  land: string;
  domain: string;
  /** Stable class-name keys for the geographic hierarchy (used by RegionTooltip). */
  regionKey?: string;
  landKey?: string;
  domainKey?: string;
  cultures: CultureShare[];
  religions: ReligionShare[];
  pops: PopGroup[];
  modifiers: SettlementModifier[];
  disease?: SettlementDisease;
  bishoprics?: SettlementBishopric[];
  /** Breakdown sources for stat tooltips */
  incomeBreakdown?: ModifierSource[];
  unrestBreakdown?: ModifierSource[];
  growthBreakdown?: ModifierSource[];
  foodBreakdown?: ModifierSource[];
  fortificationBreakdown?: ModifierSource[];
  corruptionBreakdown?: ModifierSource[];
  bishop?: Character | null;
  bishopReligion?: string;
  /** Active hostile state on the settlement. Undefined when None. */
  siege?: SiegeInfo;
  /** False when the player cannot queue construction or recruit units in this
   *  settlement (e.g. besieged, occupied, not owned/vassalised). */
  canBuild?: boolean;
  /** Optional human-readable reason for `canBuild === false` (e.g. "Under siege"). */
  cannotBuildReason?: string;
}

export interface BesiegingArmyInfo {
  kind: 'army' | 'navy';
  debugShortId?: number;
  name: string;
  commanderName: string;
  /** PersonID for portrait + tooltip lookup. May be empty if commander unknown. */
  commanderId?: string;
  commanderDebugShortId?: number;
  strength: number;
  maxStrength: number;
  siegePower: number;
  morale: number;
  unitCount: number;
  isLead: boolean;
}

export interface SiegeProgressFactor {
  name: string;
  value: number;
  kind: 'power' | 'defence' | 'multiplier' | 'percent';
  helpsProgress: boolean;
}

/** The headline state of a settlement under attack or hostile control.
 *  - `siege`: actively besieged - progress, defenders, besieging armies.
 *  - `blockade`: naval blockade only, no land siege.
 *  - `occupation`: captured and held by another faction. */
export type SiegeStateKind = 'siege' | 'blockade' | 'occupation';

export interface SiegeInfo {
  state: SiegeStateKind;
  /** True for a Siege state with an additional naval blockade in effect. */
  alsoBlockaded: boolean;
  canAssault: boolean;
  canSallyOut: boolean;
  canPillage: boolean;
  canSack: boolean;
  /** Siege completion 0-100. Only meaningful when state === 'siege'. */
  progress: number;
  /** Days until the siege concludes. 0 if unknown / not applicable. */
  estimatedDays: number;
  /** Days until rebel victory while this capital remains occupied. */
  capitalOccupationDaysRemaining?: number;
  totalSiegePower: number;
  totalDefenderStrength: number;
  pillageGold: number;
  sackGold: number;
  /** Current daily progress in percentage points. */
  progressPerDay: number;
  progressFactors: SiegeProgressFactor[];
  /** The hostile faction (besieger / blockader / occupier). */
  hostileFaction: string;
  hostileFactionId?: string;
  hostileFactionDebugShortId?: number;
  hostileFactionColour?: string;
  hostileFactionSecondaryColour?: string;
  hostileFactionEmblem?: string;
  hostileFactionCultureGroup?: string;
  hostileFactionDiplomaticStatus?: string;
  hostileFactionSubjectSubtype?: string;
  hostileFactionIsPlayer?: boolean;
  hostileFactionIsRebel?: boolean;
  besiegingArmies: BesiegingArmyInfo[];
  defendingMilitaries: BesiegingArmyInfo[];
}

export interface ArmyUnit {
  id?: string;
  unitId?: string;
  name: string;
  type: string;
  count: number;
  strength: number;
  maxStrength: number;
  culture: string;
  /** Culture row name (e.g. "Rephsian") for icon lookup and fallback tooltip. */
  cultureId?: string;
  /** Full culture data for the nested culture tooltip. */
  cultureInfo?: CultureInfo;
  description: string;
  portrait: string;
  tier: number;
  upkeep: number;
  foodConsumption: number;
  speed: number;
  /** Attacks per second. */
  attackSpeed: number;
  siegePower: number;
  pierceDmg: number;
  crushDmg: number;
  slashDmg: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  immuneToWinterAttrition?: boolean;
  immuneToDesertAttrition?: boolean;
  /** True if this unit may complete attacks while its formation is moving. */
  canAttackWhileMoving?: boolean;
}

export type ArmyUnitRowType = 'existing' | 'beingBuilt' | 'inTransit' | 'pending' | 'unbuildable' | 'replenishDisabled';

export interface ArmyUnitSource {
  id: string;
  name: string;
  count: number;
  daysRemaining: number;
  startsOnDate: number;
  expiresOnDate: number;
  progressAtSnapshot: number;
  dailyProgress: number;
  snapshotDate: number;
}

export interface ArmyUnitRow extends ArmyUnit {
  id: string;
  unitId: string;
  rowType: ArmyUnitRowType;
  existingCount: number;
  pendingCount: number;
  targetCount: number;
  progress: number;
  statusLabel: string;
  selectable: boolean;
  sources: ArmyUnitSource[];
}

export interface ArmyUnitTypeStrength {
  type: string;
  count: number;
}

export interface ArmyBattleGroup {
  id: string;
  role: 'melee' | 'ranged' | 'siege';
  name: string;
  unitIds: string[];
}

export interface ArmySubordinate {
  id?: string;
  debugShortId?: number;
  depth: number;
  name: string;
  commanderName: string;
  commanderId?: string;
  commanderDebugShortId?: number;
  strength: number;
  maxStrength: number;
  unitTypes: ArmyUnitTypeStrength[];
  withinCommandRange: boolean;
  receivesCommandBenefits: boolean;
  distanceToSuperior: number;
  superiorCommandRadius: number;
  hierarchyTacticsBonus: number;
  hierarchyMoraleBonus: number;
  hierarchySpeedBonus: number;
}

export interface EmbarkedArmy {
  id?: string;
  debugShortId?: number;
  name: string;
  strength: number;
}

export interface MilitaryResource {
  id: string;
  name: string;
  amount: number;
  capacity: number;
  monthlyUsage: number;
  daysRemaining: number;
}

export interface MilitaryAttritionSource {
  id: string;
  name: string;
  strengthLossRate: number;
  moraleLossRate: number;
  severity: number;
  progress: number;
  nearbyStrength: number;
  strengthThreshold: number;
}

export type MilitaryRank = 'Dux' | 'Praefectus' | 'Legatus';

export type MilitaryDoctrine = 'concentrate' | 'screen' | 'garrison' | 'independent';

export interface Army {
  id: string;
  canViewFullDetails: boolean;
  debugShortId?: number;
  name: string;
  faction: string;
  factionId?: string;
  factionDebugShortId?: number;
  commanderName: string;
  commanderId?: string;
  commanderDebugShortId?: number;
  commanderTitle: string;
  strength: number;
  maxStrength: number;
  morale: number;
  units: ArmyUnit[];
  unitRows: ArmyUnitRow[];
  battleGroups: ArmyBattleGroup[];
  commandRank: string;
  isNavy: boolean;
  isPersonalGuard?: boolean;
  doctrine: string;
  currentOrder?: string;
  /** Formation template name */
  formationTemplate?: string;
  /** Settlement this army is garrisoned in */
  garrisonedAt?: string;
  garrisonedAtId?: string;
  currentOrderTargetId?: string;
  currentOrderTargetName?: string;
  currentOrderTargetType?: string;
  /** Navy carrying this army while embarked. */
  embarkedNavyId?: string;
  embarkedNavyName?: string;
  /** Command doctrine for subordinates: 'concentrate' | 'screen' | 'garrison' | 'independent'. Only applies when delegated. */
  commandDoctrine?: string;
  /** Whether this command is delegated (subordinates act on their own under
   *  the chosen doctrine). False/undefined means direct control. */
  delegated?: boolean;
  /** Whether the 'Quell rebellions' standing order is enabled (Dux only).
   *  When on, idle subordinates march to engage nearby rebellions. */
  autoSquashRebels?: boolean;
  /** Subordinate formations under this command */
  subordinates?: ArmySubordinate[];
  commandSubordinateCount?: number;
  commandSubordinateCapacity?: number;
  receivesCommandBenefits?: boolean;
  commandMaintenance?: number;
  commandBuffRadius?: number;
  hierarchyTacticsBonus?: number;
  hierarchyMoraleBonus?: number;
  hierarchySpeedBonus?: number;
  /** Parent command name (if subordinate) */
  parentCommand?: string;
  /** Parent command ID (if subordinate) */
  parentCommandId?: string;
  parentCommandDebugShortId?: number;
  /** Naval capacity (navy only) */
  capacity?: number;
  /** Used naval capacity (navy only) */
  usedCapacity?: number;
  /** Embarked armies (navy only) */
  embarkedArmies?: EmbarkedArmy[];
  /** Resource stockpiles carried by the force, with monthly consumption. */
  resources?: MilitaryResource[];
  attritionSources?: MilitaryAttritionSource[];
  supplyDays?: number;
  isForcedMarching?: boolean;
  canForcedMarch: boolean;
  canMerge: boolean;
  canSplit: boolean;
  isRaiding?: boolean;
  isReplenishing?: boolean;
  replenishCost?: number;
  canReplenish?: boolean;
  isFoederatiAuxiliary?: boolean;
  foederatiOriginFactionId?: string;
  isPlayerControlled: boolean;
}

export interface MilitaryForce {
  id: string;
  debugShortId?: number;
  name: string;
  factionId: string;
  parentId: string | null;
  rank: MilitaryRank;
  commanderName: string;
  commanderId?: string;
  commanderDebugShortId?: number;
  strength: number;
  maxStrength: number;
  morale: number;
  supplyDays: number;
  attrition: boolean;
  isNavy: boolean;
  isPersonalGuard: boolean;
  doctrine: MilitaryDoctrine;
  template: string;
  location: string;
  currentOrder?: string;
  delegated: boolean;
  autoSquashRebels: boolean;
  isPlayerControlled: boolean;
  subordinateCount: number;
  subordinateCapacity: number;
  parentSlotIndex?: number;
  receivesCommandBenefits?: boolean;
}

export interface MilitaryFoederatiEntry {
  id: string;
  factionId: string;
  factionName: string;
  factionColour: string;
  factionSecondaryColour?: string;
  factionEmblem?: string;
  factionCultureGroup?: string;
  factionDiplomaticStatus?: string;
  factionSubjectSubtype?: string;
  factionIsPlayer?: boolean;
  factionIsRebel?: boolean;
  rulerId?: string;
  rulerName: string;
  rulerPortrait?: string;
  rulerPortraitLayers?: PortraitLayerData;
  strength: number;
  availableStrength: number;
  activeStrength: number;
  isCalledUp: boolean;
  compliance: number;
  canCall: boolean;
}

export interface MilitaryOverview {
  forces: MilitaryForce[];
  foederati: MilitaryFoederatiEntry[];
  totalArmyStrength: number;
  totalArmyMaxStrength: number;
  totalNavyStrength: number;
  totalNavyMaxStrength: number;
  totalShips: number;
  totalMaxShips: number;
  commandMaintenance: number;
  autoAssignCommandsEnabled: boolean;
  autoReplenishFormationsEnabled: boolean;
}

export interface EventEffect {
  kind: string;
  parameter?: string;
  amount?: number;
  description?: string;
  icon?: string;
}

export interface EventOption {
  text: string;
  tooltip: string;
  objective?: string;
  isLocked?: boolean;
  effects?: EventEffect[];
}

export interface EventRegnalNameInput {
  label: string;
  value: string;
  randomButtonText: string;
  randomOptions: string[];
  targetPersonId?: string;
  targetFactionId?: string;
  previousNameCounts: { name: string; count: number }[];
}

export interface EventPersonNameInput {
  label: string;
  value: string;
  randomButtonText: string;
  randomOptions: string[];
  targetPersonId?: string;
  targetFactionId?: string;
}

export interface EventChoiceInputs {
  regnalName?: string;
  personName?: string;
}

export interface EventSender {
  name: string;
  title?: string;
  personId?: string;
  portrait?: string;
  portraitLayers?: PortraitLayerData;
}

export interface EventHistoryEntry {
  id: string;
  title: string;
  body: string;
  image: string | null;
  presentationStyle: 'standard' | 'important';
  chosenOptionText: string;
}

export interface Event {
  id: string;
  title: string;
  body: string;
  image: string | null;
  presentationStyle: 'standard' | 'important';
  sender?: EventSender;
  regnalNameInput?: EventRegnalNameInput;
  personNameInput?: EventPersonNameInput;
  options: EventOption[];
  previousEvents: EventHistoryEntry[];
}

export interface DiplomaticRequestNotification {
  notificationId: string;
  notificationType: string;
  requiresDecision: boolean;
  acceptLabel: string;
  declineLabel: string;
  initiatingFactionId?: string;
  initiatingFactionName?: string;
  targetFactionId?: string;
  thirdPartyFactionId?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  style?: 'regular' | 'cinematic';
  type:
    | "general"
    | "military"
    | "diplomatic"
    | "character"
    | "political"
    | "settlement";
  notificationTypeId?: string;
  notificationTypeLabel?: string;
  iconPath?: string;
  timestamp: string;
  createdOnDay?: number;
  expiresOnDay?: number;
  durationDays?: number;
  portraitLayers?: PortraitLayerData;
  characterName?: string;
	personId?: string;
  canAnchorAtSettlement?: boolean;
  settlementId?: string;
  settlementScreenX?: number;
  settlementScreenY?: number;
  settlementViewportWidth?: number;
  settlementViewportHeight?: number;
  battleAfterActionReport?: BattleAfterActionReportPayload;
  diplomaticRequest?: DiplomaticRequestNotification;
  isPlayerActionResult?: boolean;
  actionSucceeded?: boolean;
}

export type WarningSeverity = "caution" | "warning" | "critical";

export interface Warning {
  id: string;
  title: string;
  description: string;
  severity: WarningSeverity;
  iconKey: string;
  /** 1 when a single target, >1 when clicking cycles through targets. */
  targetCount: number;
  /** When non-empty, a click opens this screen instead of navigating to a payload. */
  screenToOpen: string;
  /** Optional tab id passed through from the warning payload. */
  screenTab?: string;
  /** Optional power bloc target id for warning-specific navigation. */
  powerBlocId?: string;
  /** Display labels for each cycle target, in primary + additional payload order. */
  targetLabels: string[];
}

export interface PowerBlocGoal {
  name: string;
  description: string;
  /** Localised explanation of the current satisfaction score. */
  breakdown?: string;
  /** Goal importance to the bloc (0-1). Higher weights affect happiness more. */
  weight?: number;
  /** How well the goal is being satisfied (0-100). 100 = fully met. */
  satisfaction?: number;
}

export interface PowerBlocMember {
  id: string;
  debugShortId?: number;
  name: string;
  /** Why this person is in the bloc (e.g. "Senator", "Magister Militum", "Patron"). */
  role: string;
  /** Public weight inside the bloc, derived from personal fame and authority. */
  influence?: number;
  /** Compliance toward the player's ruler, 0-100. */
  loyalty?: number;
  /** Optional portrait override; otherwise looked up from the portrait registry. */
  portrait?: string;
  /** Sub-faction or clergy affiliation, when relevant. */
  affiliation?: string;
  /** True for the bloc leader. */
  isLeader?: boolean;
}

export interface PowerBlocDemand {
  /** Short label that goes in headings, e.g. "Restore Senatorial Authority". */
  title: string;
  /** Longer single-sentence description shown to the player. */
  description: string;
  /** Game-date when the demand was issued. */
  issuedDate: number;
  /** Game-date when the demand expires. */
  deadlineDate: number;
  /** Days until the demand expires. */
  daysRemaining: number;
  /** Total length of the demand window in days. */
  totalDays: number;
  /** 0-100 — how close the demand is to being met. */
  progress: number;
  /** Optional human-readable progress hint, e.g. "1 of 2 edicts passed". */
  progressLabel?: string;
}

export interface PowerBlocModifier {
  label: string;
  /** Signed numeric impact on faction stats (e.g. +5 unrest, -10% income). */
  value: string;
  isPositive: boolean;
}

export interface PowerBloc {
  id: string;
  debugShortId?: number;
  name: string;
  type: string;
  /** Stable authored key used to identify the bloc definition. */
  definitionKey?: string;
  leaderName: string;
  /** Optional title for the leader (e.g. "Magister Militum"). */
  leaderTitle?: string;
  /** Optional PersonID for the leader so portraits resolve via the lookup. */
  leaderId?: string;
  leaderDebugShortId?: number;
  memberCount: number;
  happiness: number;
  strength: number;
  imperialStrength: number;
  description: string;
  goals: PowerBlocGoal[];
  /** 0 = Content, 1 = Grumbling, 2 = Displeased, 3 = Hostile, 4 = Revolt. */
  escalationStage: number;
  /** Icon path for the bloc's type / archetype. */
  iconKey?: string;
  /** Wide event-style image for the bloc detail header. */
  headerImage?: string;
  /** More specific subtype shown beside the badge ("Institutional", "State religion", etc.). */
  subtype?: string;
  /** Active formal demand — when present, the bloc is pressuring the player. */
  activeDemand?: PowerBlocDemand;
  /** Days the bloc has been unhappy in a row. */
  unhappyDays?: number;
  /** Count of demands the player has failed to meet. */
  failedDemandCount?: number;
  /** Recent positive modifiers the bloc grants the faction (when content). */
  contentModifiers?: PowerBlocModifier[];
  /** Recent negative modifiers the bloc imposes on the faction (when unhappy). */
  unhappyModifiers?: PowerBlocModifier[];
  /** Sample of the bloc's named members for the screen view. */
  members?: PowerBlocMember[];
  /** True when the current province ruler is a member of this bloc. */
  playerIsMember?: boolean;
  /** True when the province ruler has a valid reason to join this bloc. */
  canPlayerJoin?: boolean;
  /** Localised reason shown when the province ruler cannot join this bloc. */
  canPlayerJoinReason?: string;
}

export interface Resource {
  id?: string;
  name: string;
  category?: string;
  categoryName?: string;
  amount: number;
  stockpile?: number;
  reserved?: number;
  demand?: number;
  production: number;
  potentialProduction?: number;
  consumption: number;
  shortage?: number;
  shortagePercent?: number;
  status?: string;
  depleting?: boolean;
  monthsUntilDepletion?: number;
  icon?: string;
  /** True if the settlement's region naturally yields this resource. */
  isNatural?: boolean;
  /** True if production is zero because the settlement is under siege. */
  siegeHalted?: boolean;
  /** Per-source production split (natural + processing buildings). */
  productionSources?: ModifierSource[];
  /** Per-source consumption split (population, garrison, buildings). */
  consumptionSources?: ModifierSource[];
  bottlenecks?: ResourceIssue[];
}

export interface ResourceIssue {
  name: string;
  details: string;
}

export interface ResourceCategory {
  id: string;
  name: string;
  stockpile: number;
  stockpileCap: number;
  production: number;
  potentialProduction: number;
  consumption: number;
  hasShortage: boolean;
  isCapitalStockpile: boolean;
}

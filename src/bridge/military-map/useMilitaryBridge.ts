import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetMilitaryDataResponse,
  GetMilitaryOverviewResponse,
  GetMilitaryCommanderCandidatesResponse,
  MilitaryCommanderCandidate,
  MilitaryOverviewForce,
  FoederatiOverviewEntry,
} from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { mapPortraitLayers, mapPortraitPath } from '../characters/portraitMapping';
import type {
  Army,
  ArmyUnit,
  ArmyUnitRow,
  ArmyUnitRowType,
  CharacterStats,
  CharacterTrait,
  MilitaryDoctrine,
  MilitaryForce,
  MilitaryFoederatiEntry,
  MilitaryOverview,
  MilitaryResource,
  PortraitLayerData,
} from '../../data/types';

const militaryCache = new Map<string, Army>();
let militaryOverviewCache: MilitaryOverview | null = null;
let selectedMilitariesCache: MilitaryForce[] | null = null;

export interface MilitaryCommanderCandidateView {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitLayers?: PortraitLayerData;
  age: number;
  fame: number;
  stats: CharacterStats;
  traits: CharacterTrait[];
  isCurrentCommander: boolean;
  currentCommandName?: string;
}

export interface MilitaryCommanderCandidatesResult {
  found: boolean;
  militaryId: string;
  militaryName: string;
  currentCommanderId?: string;
  message?: string;
  candidates: MilitaryCommanderCandidateView[];
}

export function clearMilitaryCache(militaryId: string | undefined): void {
  if (!militaryId) return;
  militaryCache.delete(militaryId);
  if (selectedMilitariesCache) {
    selectedMilitariesCache = selectedMilitariesCache.filter((force) => force.id !== militaryId);
  }
}

export function clearMilitaryCaches(): void {
  militaryCache.clear();
  militaryOverviewCache = null;
  selectedMilitariesCache = null;
}

function parseDoctrine(raw: string): MilitaryDoctrine {
  if (raw === 'screen' || raw === 'garrison' || raw === 'independent') return raw;
  return 'concentrate';
}

function mapForce(data: MilitaryOverviewForce): MilitaryForce {
  return {
    id: data.id,
    debugShortId: data.debugShortId,
    name: data.name,
    parentId: data.parentId || null,
    rank: data.rank as MilitaryForce['rank'],
    commanderName: data.commanderName,
    commanderId: data.commanderId || undefined,
    commanderDebugShortId: data.commanderDebugShortId || undefined,
    strength: data.strength,
    maxStrength: data.maxStrength,
    morale: data.morale,
    supplyDays: data.supplyDays,
    isNavy: data.isNavy,
    doctrine: parseDoctrine(data.doctrine),
    template: data.template,
    location: data.location,
    currentOrder: data.currentOrder || undefined,
    delegated: data.delegated,
    autoSquashRebels: data.autoSquashRebels,
    isPlayerControlled: data.isPlayerControlled,
  };
}

function mapFoederati(data: FoederatiOverviewEntry): MilitaryFoederatiEntry {
  return {
    id: data.id,
    factionId: data.factionId,
    factionName: data.factionName,
    factionColour: data.factionColour,
    factionSecondaryColour: data.factionSecondaryColour || undefined,
    factionEmblem: data.factionEmblem || undefined,
    factionCultureGroup: data.factionCultureGroup || undefined,
    rulerId: data.rulerId || undefined,
    rulerName: data.rulerName,
    rulerPortrait: mapPortraitPath(data.rulerPortrait),
    rulerPortraitLayers: mapPortraitLayers(data.rulerPortraitLayers),
    strength: data.strength,
    availableStrength: data.availableStrength,
    activeStrength: data.activeStrength,
    isCalledUp: data.isCalledUp,
    compliance: data.compliance,
    canCall: data.canCall,
  };
}

function mapUnit(unit: GetMilitaryDataResponse['units'][number]): ArmyUnit {
  return {
    id: unit.id || undefined,
    unitId: unit.unitId || undefined,
    name: unit.name,
    type: unit.type,
    count: unit.count,
    strength: unit.strength,
    maxStrength: unit.maxStrength,
    culture: unit.culture,
    cultureId: unit.cultureId || undefined,
    description: unit.description,
    portrait: mapPortraitPath(unit.portrait),
    tier: unit.tier,
    upkeep: unit.upkeep,
    foodConsumption: unit.foodConsumption,
    speed: unit.speed,
    siegePower: unit.siegePower,
    pierceDmg: unit.pierceDamage,
    crushDmg: unit.crushDamage,
    slashDmg: unit.slashDamage,
    pierceArmour: unit.pierceArmour,
    crushArmour: unit.crushArmour,
    slashArmour: unit.slashArmour,
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
  };
}

function mapUnitRowType(raw: string): ArmyUnitRowType {
  if (raw === 'beingBuilt' || raw === 'inTransit' || raw === 'pending' || raw === 'unbuildable' || raw === 'replenishDisabled') {
    return raw;
  }
  return 'existing';
}

function mapUnitRow(unit: GetMilitaryDataResponse['unitRows'][number]): ArmyUnitRow {
  return {
    ...mapUnit(unit),
    id: unit.id,
    unitId: unit.unitId,
    rowType: mapUnitRowType(unit.rowType),
    existingCount: unit.existingCount,
    pendingCount: unit.pendingCount,
    targetCount: unit.targetCount,
    progress: unit.progress,
    statusLabel: unit.statusLabel,
    selectable: unit.selectable,
    sources: unit.sources.map(source => ({
      name: source.name,
      count: source.count,
      daysRemaining: source.daysRemaining,
    })),
  };
}

function mapResource(resource: GetMilitaryDataResponse['resources'][number]): MilitaryResource {
  return {
    id: resource.id,
    name: resource.name,
    amount: resource.amount,
    capacity: resource.capacity,
    monthlyUsage: resource.monthlyUsage,
    daysRemaining: resource.daysRemaining,
  };
}

function mapCommanderCandidate(candidate: MilitaryCommanderCandidate): MilitaryCommanderCandidateView {
  return {
    id: candidate.id,
    name: candidate.name,
    title: candidate.title,
    portrait: mapPortraitPath(candidate.portrait),
    portraitLayers: mapPortraitLayers(candidate.portraitLayers),
    age: candidate.age,
    fame: candidate.fame,
    stats: {
      tactics: candidate.tactics,
      authority: candidate.authority,
      cunning: candidate.cunning,
      governance: candidate.governance,
      loyalty: candidate.loyalty,
      constitution: candidate.constitution,
    },
    traits: candidate.traits.map(trait => ({
      id: trait.id,
      name: trait.name,
      icon: trait.id,
      description: trait.description,
      isPositive: trait.isPositive,
    })),
    isCurrentCommander: candidate.isCurrentCommander,
    currentCommandName: candidate.currentCommandName || undefined,
  };
}

function mapCommanderCandidates(data: GetMilitaryCommanderCandidatesResponse): MilitaryCommanderCandidatesResult {
  return {
    found: data.found,
    militaryId: data.militaryId,
    militaryName: data.militaryName,
    currentCommanderId: data.currentCommanderId || undefined,
    message: data.message || undefined,
    candidates: data.candidates.map(mapCommanderCandidate),
  };
}

function mapMilitary(data: GetMilitaryDataResponse): Army | null {
  if (!data.found) {
    clearMilitaryCache(data.id);
    return null;
  }

  const unitRows = data.unitRows.map(mapUnitRow);
  const units = data.units.length > 0
    ? data.units.map(mapUnit)
    : unitRows.filter(row => row.rowType === 'existing');

  return {
    id: data.id,
    debugShortId: data.debugShortId,
    name: data.name,
    faction: data.faction,
    factionId: data.factionId || undefined,
    factionDebugShortId: data.factionDebugShortId || undefined,
    commanderName: data.commanderName,
    commanderId: data.commanderId || undefined,
    commanderDebugShortId: data.commanderDebugShortId || undefined,
    commanderTitle: data.commanderTitle,
    strength: data.strength,
    maxStrength: data.maxStrength,
    morale: data.morale,
    units,
    unitRows,
    commandRank: data.commandRank,
    isNavy: data.isNavy,
    doctrine: data.formationTemplate || data.currentOrder || data.commandRank,
    currentOrder: data.currentOrder || undefined,
    formationTemplate: data.formationTemplate || undefined,
    garrisonedAt: data.garrisonedAt || undefined,
    commandDoctrine: parseDoctrine(data.commandDoctrine),
    delegated: data.delegated,
    autoSquashRebels: data.autoSquashRebels,
    subordinates: data.subordinates.map((sub) => ({
      id: sub.id || undefined,
      debugShortId: sub.debugShortId || undefined,
      depth: sub.depth,
      name: sub.name,
      commanderName: sub.commanderName,
      commanderId: sub.commanderId || undefined,
      commanderDebugShortId: sub.commanderDebugShortId || undefined,
      strength: sub.strength,
      maxStrength: sub.maxStrength,
      unitTypes: sub.unitTypes.map((entry) => ({
        type: entry.type,
        count: entry.count,
      })),
    })),
    parentCommand: data.parentCommand || undefined,
    parentCommandId: data.parentCommandId || undefined,
    parentCommandDebugShortId: data.parentCommandDebugShortId || undefined,
    capacity: data.capacity > 0 ? data.capacity : undefined,
    usedCapacity: data.usedCapacity > 0 ? data.usedCapacity : data.capacity > 0 ? 0 : undefined,
    embarkedArmies: data.embarkedArmies.map((army) => ({
      id: army.id || undefined,
      debugShortId: army.debugShortId || undefined,
      name: army.name,
      strength: army.strength,
    })),
    resources: data.resources.map(mapResource),
    supplyDays: data.supplyDays,
    isForcedMarching: data.isForcedMarching,
    isRaiding: data.isRaiding,
    isReplenishing: data.isReplenishing,
    replenishCost: data.replenishCost > 0 ? data.replenishCost : undefined,
    canReplenish: data.canReplenish,
    isFoederatiAuxiliary: data.isFoederatiAuxiliary,
    foederatiOriginFactionId: data.foederatiOriginFactionId || undefined,
    isPlayerControlled: data.isPlayerControlled,
  };
}

function mapOverview(data: GetMilitaryOverviewResponse): MilitaryOverview {
  return {
    forces: data.forces.map(mapForce),
    foederati: data.foederati.map(mapFoederati),
    totalArmyStrength: data.totalArmyStrength,
    totalArmyMaxStrength: data.totalArmyMaxStrength,
    totalNavyStrength: data.totalNavyStrength,
    totalNavyMaxStrength: data.totalNavyMaxStrength,
    totalShips: data.totalShips,
    totalMaxShips: data.totalMaxShips,
    commandMaintenance: data.commandMaintenance,
    autoAssignCommandsEnabled: data.autoAssignCommandsEnabled,
    autoReplenishFormationsEnabled: data.autoReplenishFormationsEnabled,
  };
}

export function useMilitaryBridge(militaryId: string | null | undefined): Army | null {
  const live = useBridgeQuery({
    action: 'game.get_military_data',
    payload: militaryId ? { militaryId } : null,
    map: (data) => {
      const mapped = mapMilitary(data);
      if (mapped) militaryCache.set(mapped.id, mapped);
      return mapped;
    },
    matchPush: (data) => data.id === militaryId,
  });

  if (live) return live;
  if (militaryId) return militaryCache.get(militaryId) ?? null;
  return null;
}

export function useMilitaryOverviewBridge(fetch = true): MilitaryOverview | null {
  const live = useBridgeQuery({
    action: 'game.get_military_overview',
    payload: fetch ? undefined : null,
    map: (data) => {
      militaryOverviewCache = mapOverview(data);
      return militaryOverviewCache;
    },
  });

  return live ?? militaryOverviewCache;
}

export function useSelectedMilitariesBridge(): MilitaryForce[] | null {
  const live = useBridgeQuery({
    action: 'game.get_selected_militaries',
    map: (data) => {
      selectedMilitariesCache = data.militaries.map(mapForce);
      return selectedMilitariesCache;
    },
  });

  return live ?? selectedMilitariesCache;
}

export function useMilitaryCommanderCandidatesBridge(militaryId: string | null | undefined): MilitaryCommanderCandidatesResult | null {
  return useBridgeQuery({
    action: 'game.get_military_commander_candidates',
    payload: militaryId ? { militaryId } : null,
    map: mapCommanderCandidates,
  });
}

export function setMilitaryParentBridge(militaryId: string, parentMilitaryId: string | null): Promise<void> {
  return bridgeCall('game.set_military_parent', {
    militaryId,
    parentMilitaryId: parentMilitaryId ?? '',
  }).then(() => undefined);
}

export function selectMilitaryBridge(militaryId: string): Promise<void> {
  return bridgeCall('game.select_military', { militaryId }).then(() => undefined);
}

export function setMilitaryDelegationBridge(militaryId: string, delegated: boolean): Promise<void> {
  return bridgeCall('game.set_military_delegation', { militaryId, delegated }).then(() => undefined);
}

export function setMilitaryDoctrineBridge(militaryId: string, doctrine: MilitaryDoctrine): Promise<void> {
  return bridgeCall('game.set_military_doctrine', { militaryId, doctrine }).then(() => undefined);
}

export function setMilitaryAutoSquashRebelsBridge(militaryId: string, enabled: boolean): Promise<void> {
  return bridgeCall('game.set_military_auto_squash_rebels', { militaryId, enabled }).then(() => undefined);
}

export function promoteMilitaryCommandBridge(militaryId: string): Promise<void> {
  return bridgeCall('game.promote_military_command', { militaryId }).then(() => undefined);
}

export function replaceMilitaryCommanderBridge(militaryId: string, personId: string): Promise<void> {
  return bridgeCall('game.replace_military_commander', { militaryId, personId }).then(() => undefined);
}

export function ungarrisonMilitaryBridge(militaryId: string): Promise<void> {
  return bridgeCall('game.ungarrison_military', { militaryId }).then(() => undefined);
}

export function setMilitaryForcedMarchBridge(militaryId: string, enabled: boolean): Promise<void> {
  return bridgeCall('game.set_military_forced_march', { militaryId, enabled }).then(() => undefined);
}

export function startMilitaryEmbarkTargetingBridge(militaryId: string): Promise<void> {
  return bridgeCall('game.start_military_embark_targeting', { militaryId }).then(() => undefined);
}

export function startMilitaryMergeTargetingBridge(militaryId: string): Promise<void> {
  return bridgeCall('game.start_military_merge_targeting', { militaryId }).then(() => undefined);
}

export function replenishMilitaryBridge(militaryId: string): Promise<void> {
  return bridgeCall('game.replenish_military', { militaryId }).then(() => undefined);
}

export function disbandMilitaryBridge(militaryId: string): Promise<void> {
  return bridgeCall('game.disband_military', { militaryId }).then(() => undefined);
}

export function setMilitaryFormationTemplateBridge(militaryId: string, templateId: string): Promise<void> {
  return bridgeCall('game.set_military_formation_template', { militaryId, templateId }).then(() => undefined);
}

export function duplicateMilitaryFormationTemplateBridge(militaryId: string): Promise<{ duplicated: boolean; templateId: string; message: string }> {
  return bridgeCall('game.duplicate_military_formation_template', { militaryId });
}

export function toggleFoederatiCallupBridge(factionId: string, calledUp: boolean): Promise<void> {
  return bridgeCall('game.toggle_foederati_callup', { factionId, calledUp }).then(() => undefined);
}

export function setAutoAssignCommandsBridge(enabled: boolean): Promise<void> {
  return bridgeCall('game.set_auto_assign_commands', { enabled }).then(() => undefined);
}

export function setAutoReplenishFormationsBridge(enabled: boolean): Promise<void> {
  return bridgeCall('game.set_auto_replenish_formations', { enabled }).then(() => undefined);
}

import type { UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import type {
  FormationTemplateBattleGroupEntry,
  FormationTemplateEntry,
  FormationTemplateResourceCost,
  FormationTemplateUnitEntry,
  SaveFormationTemplateBattleGroupRequest,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import { webUIText } from '../../../localization/WebUITextContext';

export type TemplateType = 'land' | 'naval';
export type TemplateTab = 'composition' | 'combat';
export type BattleFormationRole = 'melee' | 'ranged';

export interface DraftTemplate {
  templateId: string;
  name: string;
  iconId: string;
  type: TemplateType;
  counts: Record<string, number>;
  order: string[];
  battleGroups: DraftBattleGroup[];
}

export interface DraftBattleGroup {
  id: string;
  role: BattleFormationRole;
  counts: Record<string, number>;
  order: string[];
}

export interface ResourceTotal {
  name: string;
  displayName: string;
  amount: number;
}

export interface DerivedTotals {
  strength: number;
  upkeep: number;
  price: number;
  days: number;
  speed: number;
  food: number;
  siegePower: number;
  avgPierce: number;
  avgCrush: number;
  avgSlash: number;
  avgPierceArmour: number;
  avgCrushArmour: number;
  avgSlashArmour: number;
  entries: number;
  resources: ResourceTotal[];
  monthlyResources: ResourceTotal[];
}

const UNIT_TYPE_LABELS: Record<string, string> = {
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
  other: 'Unit',
};

const UNIT_TYPE_ICONS: Record<string, string> = {
  infantry: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  cavalry: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  ranged: '/assets/icons/UnitTypes/I_ArmyRanged.png',
  siege: '/assets/icons/UnitTypes/I_ArmySiege.png',
  special: '/assets/icons/UnitTypes/I_ArmySpecial.png',
  scout: '/assets/icons/UnitTypes/I_NavyScout.png',
  transport: '/assets/icons/UnitTypes/I_NavyTransport.png',
  galley: '/assets/icons/UnitTypes/I_NavyGalley.png',
  trireme: '/assets/icons/UnitTypes/I_NavyTrireme.png',
  quinquereme: '/assets/icons/UnitTypes/I_NavyQuinquereme.png',
  navy: '/assets/icons/I_NaviesQuickButton.png',
  naval: '/assets/icons/I_NaviesQuickButton.png',
  other: '/assets/icons/UnitTypes/I_ArmySpecial.png',
};

const UNIT_PORTRAITS: Record<string, string> = {
  ala_equestris_fideles: '/assets/units/Rephsian/I_Ala_Equestris_Fideles.png',
  auxilia_palatina: '/assets/units/Rephsian/I_Auxilia_Palatina.png',
  cohors_ferrata: '/assets/units/Rephsian/I_Cohors_Ferrata.png',
  equites_clibanarii: '/assets/units/Rephsian/I_Equites_Clibanarii.png',
  equites_promoti: '/assets/units/Rephsian/I_Equites_Promoti.png',
  legio_comitatenses: '/assets/units/Rephsian/I_Legio_Comitatenses.png',
  legio_invicta_victrix: '/assets/units/Rephsian/I_Legio_Invicta_Victrix.png',
  rephsian_accensi: '/assets/units/Rephsian/I_Rephsian_Accensi.png',
  rephsian_carroballista: '/assets/units/Rephsian/I_Rephsian_Carroballista.png',
  rephsian_funditores: '/assets/units/Rephsian/I_Rephsian_Funditores.png',
  rephsian_limitanei: '/assets/units/Rephsian/I_Rephsian_Limitanei.png',
  rephsian_onager: '/assets/units/Rephsian/I_Rephsian_Onager.png',
  rephsian_sagittarii: '/assets/units/Rephsian/I_Rephsian_Sagittarii.png',
  vexillatio_salvatoria: '/assets/units/Rephsian/I_Vexillatio_Salvatoria.png',
};

export const EMPTY_TOTALS: DerivedTotals = {
  strength: 0,
  upkeep: 0,
  price: 0,
  days: 0,
  speed: 0,
  food: 0,
  siegePower: 0,
  avgPierce: 0,
  avgCrush: 0,
  avgSlash: 0,
  avgPierceArmour: 0,
  avgCrushArmour: 0,
  avgSlashArmour: 0,
  entries: 0,
  resources: [],
  monthlyResources: [],
};

export const EMPTY_UNIT_CATALOGUE: FormationTemplateUnitEntry[] = [];
export const MAX_BATTLE_FORMATION_SIZE = 10;
let nextBattleGroupId = 1;

export function fmt(value: number, maximumFractionDigits = 0): string {
  return formatNumber(value, { maximumFractionDigits });
}

export function normaliseTemplateType(type: string): TemplateType {
  return type === 'naval' || type === 'navy' ? 'naval' : 'land';
}

export function newTemplateTypeFromSidebarId(sidebarId: string | null): TemplateType | null {
  if (!sidebarId || (sidebarId !== 'new' && !sidebarId.startsWith('new:'))) return null;
  if (sidebarId === 'new') return 'land';
  const rawType = decodeSidebarToken(sidebarId.slice('new:'.length).split(':')[0]);
  return normaliseTemplateType(rawType);
}

export function decodeSidebarToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function templateKind(type: TemplateType): string {
  return type === 'naval' ? 'Fleet Template' : 'Legion Template';
}

export function templateTypeName(type: TemplateType): string {
  return type === 'naval' ? 'Fleet' : 'Legion';
}

export function unitTypeLabel(type: string): string {
  if (UNIT_TYPE_LABELS[type]) return UNIT_TYPE_LABELS[type];
  return type.replace(/(^|-|_)([a-z])/g, (_match, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`);
}

export function unitTypeIcon(type: string): string {
  return UNIT_TYPE_ICONS[type] ?? UNIT_TYPE_ICONS.other;
}

export function resourceIcon(name: string): string {
  return FoaeCefUIAssetPath(`/assets/resources/${name}.png`);
}

export function resourceAmount(value: number): string {
  if (value >= 1) return fmt(value);
  return formatNumber(value, { maximumFractionDigits: value >= 0.1 ? 1 : 2 });
}

export function toUnitKey(raw: string): string {
  return raw
    .replace(/^U/, '')
    .replace(/_C$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function unitPortrait(unit: FormationTemplateUnitEntry): string {
  const raw = unit.portrait || UNIT_PORTRAITS[toUnitKey(unit.id)] || UNIT_PORTRAITS[toUnitKey(unit.name)] || '';
  return FoaeCefUIAssetPath(raw) ?? raw;
}

export function resourceCosts(costs: FormationTemplateResourceCost[]) {
  return costs.map(cost => ({
    name: cost.name,
    displayName: cost.displayName,
    description: cost.description,
    effects: cost.effects,
    amount: cost.amount,
    icon: resourceIcon(cost.name),
  }));
}

function availableSettlementEntries(unit: FormationTemplateUnitEntry): { id: string; name: string }[] {
  return unit.availableSettlements
    .filter(settlement => settlement.available)
    .map(settlement => ({ id: settlement.id, name: settlement.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function unitTooltipData(unit: FormationTemplateUnitEntry, count: number): UnitTooltipData {
  const buildabilitySettlements = availableSettlementEntries(unit);
  const availableSettlementCount = unit.availableSettlementCount || buildabilitySettlements.length;
  return {
    name: unit.name,
    description: unit.description,
    portrait: unitPortrait(unit),
    typeLabel: unit.unitTypeLabel,
    typeIcon: unitTypeIcon(unit.type),
    tier: unit.tier,
    maxStrength: unit.maxStrength,
    price: unit.price,
    buildTime: unit.buildTimeDays,
    upkeep: unit.upkeep,
    foodConsumption: unit.foodConsumption,
    speed: unit.speed,
    damage: {
      pierce: unit.pierceDamage,
      crush: unit.crushDamage,
      slash: unit.slashDamage,
    },
    armour: {
      pierce: unit.pierceArmour,
      crush: unit.crushArmour,
      slash: unit.slashArmour,
    },
    resourceCost: resourceCosts(unit.resourceCost),
    monthlyConsumption: resourceCosts(unit.monthlyConsumption),
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
    count,
    buildability: {
      count: availableSettlementCount,
      total: Math.max(unit.availableSettlements.length, availableSettlementCount),
      settlements: buildabilitySettlements,
    },
  };
}

export function defaultTemplateName(type: TemplateType): string {
  return webUIText(type === 'naval' ? 'MilitaryScreen.NewFleetTemplate' : 'MilitaryScreen.NewArmyTemplate');
}

export function emptyDraft(type: TemplateType): DraftTemplate {
  return {
    templateId: '',
    name: defaultTemplateName(type),
    iconId: '',
    type,
    counts: {},
    order: [],
    battleGroups: [],
  };
}

export function createBattleGroupId(): string {
  const id = `group-${nextBattleGroupId}`;
  nextBattleGroupId += 1;
  return id;
}

export function normaliseBattleRole(role: string): BattleFormationRole {
  return role === 'ranged' ? 'ranged' : 'melee';
}

export function buildBattleGroups(groups: FormationTemplateBattleGroupEntry[]): DraftBattleGroup[] {
  return groups.map(group => {
    const counts: Record<string, number> = {};
    const order: string[] = [];
    group.units.forEach(unit => {
      if (unit.count <= 0) return;
      counts[unit.unitId] = unit.count;
      order.push(unit.unitId);
    });

    return {
      id: group.id || createBattleGroupId(),
      role: normaliseBattleRole(group.role),
      counts,
      order,
    };
  }).filter(group => battleGroupUnitCount(group) > 0);
}

export function buildDraft(template: FormationTemplateEntry): DraftTemplate {
  const units = [...template.units];
  const coreIndex = units.findIndex(unit => unit.includesCore);
  if (coreIndex > 0) {
    const core = units.splice(coreIndex, 1)[0];
    units.unshift(core);
  }

  const counts: Record<string, number> = {};
  const order: string[] = [];
  units.forEach(unit => {
    counts[unit.id] = unit.count;
    order.push(unit.id);
  });

  return {
    templateId: template.id,
    name: template.name,
    iconId: template.iconId,
    type: normaliseTemplateType(template.type),
    counts,
    order,
    battleGroups: buildBattleGroups(template.battleGroups),
  };
}

export function orderedUnitIds(draft: DraftTemplate): string[] {
  const ids = [...draft.order];
  Object.keys(draft.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids;
}

export function compositionRequests(draft: DraftTemplate): SaveFormationTemplateUnitRequest[] {
  return orderedUnitIds(draft)
    .map(unitId => ({ unitId, count: draft.counts[unitId] ?? 0 }))
    .filter(unit => unit.count > 0);
}

export function orderedBattleGroupUnitIds(group: DraftBattleGroup): string[] {
  const ids = [...group.order];
  Object.keys(group.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids;
}

export function battleGroupUnitCount(group: DraftBattleGroup): number {
  return orderedBattleGroupUnitIds(group).reduce((sum, unitId) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

export function battleGroupRequests(draft: DraftTemplate): SaveFormationTemplateBattleGroupRequest[] {
  return draft.battleGroups
    .map(group => ({
      role: group.role,
      units: orderedBattleGroupUnitIds(group)
        .map(unitId => ({ unitId, count: group.counts[unitId] ?? 0 }))
        .filter(unit => unit.count > 0),
    }))
    .filter(group => group.units.length > 0);
}

export function draftUnitCount(draft: DraftTemplate): number {
  return compositionRequests(draft).reduce((sum, unit) => sum + unit.count, 0);
}

export function draftsEqual(a: DraftTemplate | null, b: DraftTemplate | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.name !== b.name || a.iconId !== b.iconId || a.type !== b.type) return false;

  const aUnits = compositionRequests(a);
  const bUnits = compositionRequests(b);
  if (aUnits.length !== bUnits.length) return false;
  if (!aUnits.every((unit, index) => unit.unitId === bUnits[index].unitId && unit.count === bUnits[index].count)) return false;

  const aGroups = battleGroupRequests(a);
  const bGroups = battleGroupRequests(b);
  if (aGroups.length !== bGroups.length) return false;
  return aGroups.every((group, groupIndex) => {
    const other = bGroups[groupIndex];
    if (group.role !== other.role || group.units.length !== other.units.length) return false;
    return group.units.every((unit, unitIndex) => unit.unitId === other.units[unitIndex].unitId && unit.count === other.units[unitIndex].count);
  });
}

export function addResourceTotals(target: Map<string, ResourceTotal>, costs: FormationTemplateResourceCost[], count: number) {
  costs.forEach(cost => {
    const current = target.get(cost.name);
    target.set(cost.name, {
      name: cost.name,
      displayName: cost.displayName || cost.name,
      amount: (current?.amount ?? 0) + cost.amount * count,
    });
  });
}

export function sortedResources(resources: Map<string, ResourceTotal>): ResourceTotal[] {
  return Array.from(resources.values())
    .sort((a, b) => b.amount - a.amount);
}

export function computeDerived(draft: DraftTemplate, unitById: Map<string, FormationTemplateUnitEntry>): DerivedTotals {
  const requests = compositionRequests(draft);
  if (requests.length === 0) return EMPTY_TOTALS;

  let strength = 0;
  let upkeep = 0;
  let price = 0;
  let days = 0;
  let speed = Infinity;
  let food = 0;
  let siegePower = 0;
  let pierce = 0;
  let crush = 0;
  let slash = 0;
  let pierceArmour = 0;
  let crushArmour = 0;
  let slashArmour = 0;
  let entries = 0;
  const resources = new Map<string, ResourceTotal>();
  const monthlyResources = new Map<string, ResourceTotal>();

  requests.forEach((request, index) => {
    const unit = unitById.get(request.unitId);
    if (!unit) return;

    const count = request.count;
    entries += count;
    strength += unit.maxStrength * count;
    upkeep += unit.upkeep * count;
    price += unit.price * count;
    if (index === 0) price += unit.price;
    days += unit.buildTimeDays * count;
    speed = Math.min(speed, unit.speed);
    food += unit.foodConsumption * count;
    siegePower += unit.siegePower * count;
    pierce += unit.pierceDamage * count;
    crush += unit.crushDamage * count;
    slash += unit.slashDamage * count;
    pierceArmour += unit.pierceArmour * count;
    crushArmour += unit.crushArmour * count;
    slashArmour += unit.slashArmour * count;
    addResourceTotals(resources, unit.resourceCost, count);
    addResourceTotals(monthlyResources, unit.monthlyConsumption, count);
  });

  const divisor = entries || 1;
  return {
    strength: Math.round(strength),
    upkeep: Math.round(upkeep),
    price: Math.round(price),
    days: Math.round(days),
    speed: speed === Infinity ? 0 : Math.round(speed),
    food: Math.round(food * 10) / 10,
    siegePower: Math.round(siegePower * 10) / 10,
    avgPierce: Math.round(pierce / divisor),
    avgCrush: Math.round(crush / divisor),
    avgSlash: Math.round(slash / divisor),
    avgPierceArmour: Math.round(pierceArmour / divisor),
    avgCrushArmour: Math.round(crushArmour / divisor),
    avgSlashArmour: Math.round(slashArmour / divisor),
    entries,
    resources: sortedResources(resources),
    monthlyResources: sortedResources(monthlyResources),
  };
}

export function battleFormationRole(unit: FormationTemplateUnitEntry): BattleFormationRole {
  return unit.range > 0 ? 'ranged' : 'melee';
}

export function assignedBattleGroupCount(draft: DraftTemplate, unitId: string): number {
  return draft.battleGroups.reduce((sum, group) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

export function groupAssignedCountExcluding(draft: DraftTemplate, unitId: string, groupId: string): number {
  return draft.battleGroups.reduce((sum, group) => (
    group.id === groupId ? sum : sum + Math.max(0, group.counts[unitId] ?? 0)
  ), 0);
}

export function unassignedUnitCount(draft: DraftTemplate, unitId: string): number {
  return Math.max(0, (draft.counts[unitId] ?? 0) - assignedBattleGroupCount(draft, unitId));
}

export function allUnitsAssigned(draft: DraftTemplate): boolean {
  const requests = compositionRequests(draft);
  if (requests.length === 0) return false;
  return requests.every(request => assignedBattleGroupCount(draft, request.unitId) === request.count);
}

export function battleGroupsValid(draft: DraftTemplate, unitById: Map<string, FormationTemplateUnitEntry>): boolean {
  if (!allUnitsAssigned(draft)) return false;

  return draft.battleGroups.every(group => {
    const total = battleGroupUnitCount(group);
    if (total <= 0 || total > MAX_BATTLE_FORMATION_SIZE) return false;
    return orderedBattleGroupUnitIds(group)
      .filter(unitId => (group.counts[unitId] ?? 0) > 0)
      .every(unitId => {
        const unit = unitById.get(unitId);
        return unit ? battleFormationRole(unit) === group.role : false;
      });
  });
}

export function pruneEmptyGroups(groups: DraftBattleGroup[]): DraftBattleGroup[] {
  return groups.filter(group => battleGroupUnitCount(group) > 0);
}

export function removeUnitsFromBattleGroups(
  groups: DraftBattleGroup[],
  unitId: string,
  count: number,
): DraftBattleGroup[] {
  let remaining = count;
  const nextGroups = groups.map(group => ({
    ...group,
    counts: { ...group.counts },
    order: [...group.order],
  }));

  for (let index = nextGroups.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const group = nextGroups[index];
    const current = group.counts[unitId] ?? 0;
    if (current <= 0) continue;

    const toRemove = Math.min(current, remaining);
    const nextCount = current - toRemove;
    if (nextCount > 0) {
      group.counts[unitId] = nextCount;
    } else {
      delete group.counts[unitId];
      group.order = group.order.filter(id => id !== unitId);
    }
    remaining -= toRemove;
  }

  return pruneEmptyGroups(nextGroups);
}


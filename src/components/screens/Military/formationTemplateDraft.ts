import type {
  FormationTemplateBattleGroupEntry,
  FormationTemplateEntry,
  FormationTemplateUnitEntry,
  SaveFormationTemplateBattleGroupRequest,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import type { TemplateCreateType } from './screenTokens';

let nextBattleGroupId = 1;

export type BattleFormationRole = 'melee' | 'ranged' | 'siege';

export interface TemplateDraft {
  templateId: string;
  name: string;
  iconId: string;
  type: TemplateCreateType;
  battleGroups: DraftBattleGroup[];
}

export interface DraftBattleGroup {
  id: string;
  role: BattleFormationRole;
  counts: Record<string, number>;
  order: string[];
}

export interface TemplateDraftTotals {
  units: number;
  strength: number;
  cost: number;
  upkeep: number;
  days: number;
  food: number;
  speed: number;
}

const EMPTY_TEMPLATE_TOTALS: TemplateDraftTotals = {
  units: 0,
  strength: 0,
  cost: 0,
  upkeep: 0,
  days: 0,
  food: 0,
  speed: 0,
};

export function normaliseTemplateType(type: string): TemplateCreateType {
  return type === 'naval' ? 'naval' : 'land';
}

export function createBattleGroupId(): string {
  const id = `group-${nextBattleGroupId}`;
  nextBattleGroupId += 1;
  return id;
}

export function normaliseBattleRole(role: string): BattleFormationRole {
  if (role === 'ranged' || role === 'siege') return role;
  return 'melee';
}

export function orderedBattleGroupUnitIds(group: DraftBattleGroup): string[] {
  const ids = [...group.order];
  Object.keys(group.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids.filter(id => (group.counts[id] ?? 0) > 0);
}

export function battleGroupUnitCount(group: DraftBattleGroup): number {
  return orderedBattleGroupUnitIds(group).reduce((sum, unitId) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

export function buildDraftBattleGroups(groups: FormationTemplateBattleGroupEntry[]): DraftBattleGroup[] {
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

export function buildTemplateDraft(template: FormationTemplateEntry | null, type: TemplateCreateType): TemplateDraft {
  if (!template) {
    return {
      templateId: '',
      name: '',
      iconId: '',
      type,
      battleGroups: [],
    };
  }

  return {
    templateId: template.id,
    name: template.name,
    iconId: template.iconId || '',
    type: normaliseTemplateType(template.type),
    battleGroups: buildDraftBattleGroups(template.battleGroups),
  };
}

export function draftCompositionRequests(draft: TemplateDraft): SaveFormationTemplateUnitRequest[] {
  const counts = new Map<string, number>();
  draft.battleGroups.forEach(group => {
    orderedBattleGroupUnitIds(group).forEach(unitId => {
      counts.set(unitId, (counts.get(unitId) ?? 0) + (group.counts[unitId] ?? 0));
    });
  });
  return Array.from(counts, ([unitId, count]) => ({ unitId, count }));
}

export function draftBattleGroupRequests(draft: TemplateDraft): SaveFormationTemplateBattleGroupRequest[] {
  return draft.battleGroups
    .map(group => ({
      role: group.role,
      units: orderedBattleGroupUnitIds(group).map(unitId => ({
        unitId,
        count: group.counts[unitId] ?? 0,
      })),
    }));
}

export function draftUnitCount(draft: TemplateDraft): number {
  return draftCompositionRequests(draft).reduce((sum, unit) => sum + unit.count, 0);
}

export function draftRoleCounts(draft: TemplateDraft): Record<BattleFormationRole, number> {
  const counts: Record<BattleFormationRole, number> = { melee: 0, ranged: 0, siege: 0 };
  draft.battleGroups.forEach(group => {
    counts[group.role] += battleGroupUnitCount(group);
  });
  return counts;
}

export function templateDraftsEqual(left: TemplateDraft, right: TemplateDraft): boolean {
  if (left.templateId !== right.templateId || left.name !== right.name || left.iconId !== right.iconId || left.type !== right.type) return false;
  const leftGroups = draftBattleGroupRequests(left);
  const rightGroups = draftBattleGroupRequests(right);
  if (leftGroups.length !== rightGroups.length) return false;
  return leftGroups.every((group, groupIndex) => {
    const rightGroup = rightGroups[groupIndex];
    if (group.role !== rightGroup.role || group.units.length !== rightGroup.units.length) return false;
    return group.units.every((unit, unitIndex) => (
      unit.unitId === rightGroup.units[unitIndex].unitId
      && unit.count === rightGroup.units[unitIndex].count
    ));
  });
}

export function draftTotals(draft: TemplateDraft, unitById: Map<string, FormationTemplateUnitEntry>): TemplateDraftTotals {
  const units = draftCompositionRequests(draft);
  if (units.length === 0) return EMPTY_TEMPLATE_TOTALS;

  const totals = units.reduce((currentTotals, request, index) => {
    const unit = unitById.get(request.unitId);
    if (!unit) return currentTotals;
    return {
      units: currentTotals.units + request.count,
      strength: currentTotals.strength + unit.maxStrength * request.count,
      cost: currentTotals.cost + unit.price * request.count + (index === 0 ? unit.price : 0),
      upkeep: currentTotals.upkeep + unit.upkeep * request.count,
      days: currentTotals.days + unit.buildTimeDays * request.count,
      food: currentTotals.food + unit.foodConsumption * request.count,
      speed: currentTotals.speed === 0 ? unit.speed : Math.min(currentTotals.speed, unit.speed),
    };
  }, EMPTY_TEMPLATE_TOTALS);

  return {
    ...totals,
    food: Math.round(totals.food * 10) / 10,
  };
}

export function romanTier(tier: number): string {
  return ['-', 'I', 'II', 'III', 'IV', 'V', 'VI'][tier] ?? formatNumber(tier);
}

export function battleRoleForUnit(unit: FormationTemplateUnitEntry | undefined): BattleFormationRole {
  return unit ? normaliseBattleRole(unit.battleRole) : 'melee';
}

export function battleGroupsValid(
  draft: TemplateDraft,
  unitById: Map<string, FormationTemplateUnitEntry>,
  maximumBattleGroupUnits: number,
): boolean {
  const requests = draftCompositionRequests(draft);
  if (requests.length === 0) return false;

  return draft.battleGroups.every(group => {
    const total = battleGroupUnitCount(group);
    if (total <= 0 || total > maximumBattleGroupUnits) return false;
    return orderedBattleGroupUnitIds(group).every(unitId => {
      const unit = unitById.get(unitId);
      return unit ? battleRoleForUnit(unit) === group.role : false;
    });
  });
}

/** Culture key used when summing recruitment manpower for a unit class. */
export function unitCultureKey(unit: FormationTemplateUnitEntry): string {
  return unit.cultureId || unit.cultureName || unit.id;
}

/** Strength already committed to each culture across the whole draft. */
export function draftUsedManpowerByCulture(
  draft: TemplateDraft,
  unitById: Map<string, FormationTemplateUnitEntry>,
): Record<string, number> {
  const used: Record<string, number> = {};
  for (const request of draftCompositionRequests(draft)) {
    const unit = unitById.get(request.unitId);
    if (!unit || request.count <= 0) continue;
    const key = unitCultureKey(unit);
    used[key] = (used[key] ?? 0) + Math.max(0, unit.maxStrength || 0) * request.count;
  }
  return used;
}

/**
 * How many more companies of this unit culture manpower can still support.
 * availableManpower 0 means the host has not reported a culture pool yet, so leave the soft cap off.
 */
export function manpowerRoomForUnit(
  unit: FormationTemplateUnitEntry,
  usedManpowerByCulture: Record<string, number>,
): number {
  const available = Math.max(0, unit.availableManpower ?? 0);
  if (available <= 0) return Number.MAX_SAFE_INTEGER;
  const strength = Math.max(0, unit.maxStrength || 0);
  if (strength <= 0) return Number.MAX_SAFE_INTEGER;
  const used = usedManpowerByCulture[unitCultureKey(unit)] ?? 0;
  return Math.floor(Math.max(0, available - used) / strength);
}

export function canAddUnitForManpower(
  unit: FormationTemplateUnitEntry,
  usedManpowerByCulture: Record<string, number>,
  amount = 1,
): boolean {
  if (amount <= 0) return true;
  return manpowerRoomForUnit(unit, usedManpowerByCulture) >= amount;
}



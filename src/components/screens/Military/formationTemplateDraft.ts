import type {
  FormationTemplateBattleGroupEntry,
  FormationTemplateEntry,
  FormationTemplateUnitEntry,
  SaveFormationTemplateBattleGroupRequest,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import type { TemplateCreateType } from './screenTokens';

export const MAX_BATTLE_FORMATION_SIZE = 10;

let nextBattleGroupId = 1;

export type BattleFormationRole = 'melee' | 'ranged';

export interface TemplateDraft {
  templateId: string;
  name: string;
  iconId: string;
  type: TemplateCreateType;
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
  return role === 'ranged' ? 'ranged' : 'melee';
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
      counts: {},
      order: [],
      battleGroups: [],
    };
  }

  const counts: Record<string, number> = {};
  const order: string[] = [];
  template.units.forEach(unit => {
    if (unit.count <= 0) return;
    counts[unit.id] = unit.count;
    order.push(unit.id);
  });

  return {
    templateId: template.id,
    name: template.name,
    iconId: template.iconId || '',
    type: normaliseTemplateType(template.type),
    counts,
    order,
    battleGroups: buildDraftBattleGroups(template.battleGroups),
  };
}

export function orderedDraftUnitIds(draft: TemplateDraft): string[] {
  const ids = [...draft.order];
  Object.keys(draft.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids.filter(id => (draft.counts[id] ?? 0) > 0);
}

export function draftCompositionRequests(draft: TemplateDraft): SaveFormationTemplateUnitRequest[] {
  return orderedDraftUnitIds(draft).map(unitId => ({
    unitId,
    count: draft.counts[unitId] ?? 0,
  }));
}

export function draftBattleGroupRequests(draft: TemplateDraft): SaveFormationTemplateBattleGroupRequest[] {
  return draft.battleGroups
    .map(group => ({
      role: group.role,
      units: orderedBattleGroupUnitIds(group).map(unitId => ({
        unitId,
        count: group.counts[unitId] ?? 0,
      })),
    }))
    .filter(group => group.units.length > 0);
}

export function draftUnitCount(draft: TemplateDraft): number {
  return draftCompositionRequests(draft).reduce((sum, unit) => sum + unit.count, 0);
}

export function templateDraftsEqual(left: TemplateDraft, right: TemplateDraft): boolean {
  if (left.templateId !== right.templateId || left.name !== right.name || left.iconId !== right.iconId || left.type !== right.type) return false;
  const leftUnits = draftCompositionRequests(left);
  const rightUnits = draftCompositionRequests(right);
  if (leftUnits.length !== rightUnits.length) return false;
  if (!leftUnits.every((unit, index) => unit.unitId === rightUnits[index].unitId && unit.count === rightUnits[index].count)) return false;

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

export function battleRoleForUnit(unit: FormationTemplateUnitEntry | undefined): 'melee' | 'ranged' {
  return unit && unit.range > 0 ? 'ranged' : 'melee';
}

export function assignedBattleGroupCount(draft: TemplateDraft, unitId: string): number {
  return draft.battleGroups.reduce((sum, group) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

export function groupAssignedCountExcluding(draft: TemplateDraft, unitId: string, groupId: string): number {
  return draft.battleGroups.reduce((sum, group) => (
    group.id === groupId ? sum : sum + Math.max(0, group.counts[unitId] ?? 0)
  ), 0);
}

export function unassignedUnitCount(draft: TemplateDraft, unitId: string): number {
  return Math.max(0, (draft.counts[unitId] ?? 0) - assignedBattleGroupCount(draft, unitId));
}

export function battleGroupsValid(draft: TemplateDraft, unitById: Map<string, FormationTemplateUnitEntry>): boolean {
  const requests = draftCompositionRequests(draft);
  if (requests.length === 0) return false;
  if (!requests.every(request => assignedBattleGroupCount(draft, request.unitId) === request.count)) return false;

  return draft.battleGroups.every(group => {
    const total = battleGroupUnitCount(group);
    if (total <= 0 || total > MAX_BATTLE_FORMATION_SIZE) return false;
    return orderedBattleGroupUnitIds(group).every(unitId => {
      const unit = unitById.get(unitId);
      return unit ? battleRoleForUnit(unit) === group.role : false;
    });
  });
}

export function removeUnitsFromBattleGroups(groups: DraftBattleGroup[], unitId: string, count: number): DraftBattleGroup[] {
  let remaining = count;
  const nextGroups = groups.map(group => {
    if (remaining <= 0 || !group.counts[unitId]) return group;
    const currentCount = group.counts[unitId] ?? 0;
    const removeCount = Math.min(currentCount, remaining);
    remaining -= removeCount;

    const counts = { ...group.counts };
    const nextCount = currentCount - removeCount;
    if (nextCount > 0) counts[unitId] = nextCount;
    else delete counts[unitId];

    return {
      ...group,
      counts,
      order: group.order.filter(id => id !== unitId || nextCount > 0),
    };
  });

  return nextGroups.filter(group => battleGroupUnitCount(group) > 0);
}

export function addUnitToBattleGroups(
  groups: DraftBattleGroup[],
  unitId: string,
  role: BattleFormationRole,
): DraftBattleGroup[] {
  const targetIndex = groups.findIndex(group => group.role === role && battleGroupUnitCount(group) < MAX_BATTLE_FORMATION_SIZE);
  if (targetIndex >= 0) {
    return groups.map((group, index) => {
      if (index !== targetIndex) return group;
      const count = (group.counts[unitId] ?? 0) + 1;
      return {
        ...group,
        counts: { ...group.counts, [unitId]: count },
        order: group.order.includes(unitId) ? group.order : [...group.order, unitId],
      };
    });
  }

  return [
    ...groups,
    {
      id: createBattleGroupId(),
      role,
      counts: { [unitId]: 1 },
      order: [unitId],
    },
  ];
}



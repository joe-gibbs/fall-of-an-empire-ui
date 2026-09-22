import type { TooltipContent } from '../../common/tooltips/Tooltip';
import type { UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import type { Army, ArmyUnit, ArmyUnitRow, Character, CharacterStatModifier, MilitaryDoctrine, MilitaryResource, StatKey } from '../../../data/types';
import { STAT_ICONS } from '../../../utils/iconMaps';
import { formatNumber, formatResourceNumber } from '../../../utils/numberFormat';
import { buildCharacterStatTooltip } from '../../../utils/characterTooltipContent';
import { WebkilnAssetPath } from '../../../utils/assets';
import { webUIText } from '../../../localization/WebUITextContext';
import { unitTypeLabel } from '../../../utils/displayLabels';

const unitTypeIcons: Record<string, string> = {
  'Heavy Infantry': '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  'Medium Infantry': '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  'Light Infantry': '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  'Infantry': '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  'Ranged': '/assets/icons/UnitTypes/I_ArmyRanged.png',
  'Cavalry': '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  'Heavy Cavalry': '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  'Siege': '/assets/icons/UnitTypes/I_ArmySiege.png',
  'Special': '/assets/icons/UnitTypes/I_ArmySpecial.png',
  'Warship': '/assets/icons/UnitTypes/I_NavyGalley.png',
  'Light Warship': '/assets/icons/UnitTypes/I_NavyScout.png',
  'Transport': '/assets/icons/UnitTypes/I_NavyTransport.png',
  'Naval Infantry': '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  'Scout Ships': '/assets/icons/UnitTypes/I_NavyScout.png',
  'Galleys': '/assets/icons/UnitTypes/I_NavyGalley.png',
  'Triremes': '/assets/icons/UnitTypes/I_NavyTrireme.png',
  'Quinqueremes': '/assets/icons/UnitTypes/I_NavyQuinquereme.png',
  'Siege Ships': '/assets/icons/UnitTypes/I_NavySiege.png',
  'Transports': '/assets/icons/UnitTypes/I_NavyTransport.png',
};

export const DELEGATION_ICON_OFF = '/assets/icons/Command/I_Command_Direct.png';
export const QUELL_ICON = '/assets/icons/I_Mutiny.png';

export type CommandMode = 'direct' | MilitaryDoctrine;
export type ReadinessBarColor = 'green' | 'red' | 'gold';

export interface ReadinessCard {
  id: string;
  label: string;
  icon: string;
  value: string;
  percent: number;
  color: ReadinessBarColor;
  valueColor: string;
  tooltip: TooltipContent;
}

export const doctrineIcons: Record<string, string> = {
  concentrate: '/assets/icons/Doctrines/I_Doctrine_Concentrate.png',
  screen: '/assets/icons/Doctrines/I_Doctrine_Screen.png',
  garrison: '/assets/icons/Doctrines/I_Doctrine_Garrison.png',
  independent: '/assets/icons/Doctrines/I_Doctrine_Independent.png',
};

export const commandModeOptions: { id: CommandMode; label: string; icon: string }[] = [
  { id: 'direct', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.88.1'); }, icon: DELEGATION_ICON_OFF },
  { id: 'concentrate', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.89.2'); }, icon: doctrineIcons.concentrate },
  { id: 'screen', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.90.3'); }, icon: doctrineIcons.screen },
  { id: 'garrison', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.91.4'); }, icon: doctrineIcons.garrison },
  { id: 'independent', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.92.5'); }, icon: doctrineIcons.independent },
];

export const commandModeTooltips: Record<CommandMode, TooltipContent> = {
  direct: { get title() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.96.6'); }, get body() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.96.7'); } },
  concentrate: { get title() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.97.8'); }, get body() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.97.9'); } },
  screen: { get title() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.98.10'); }, get body() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.98.11'); } },
  garrison: { get title() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.99.12'); }, get body() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.99.13'); } },
  independent: { get title() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.100.14'); }, get body() { return webUIText('Auto.TopProp.ComponentsSidebarsMilitarySidebar.100.15'); } },
};

export const commanderStatDefs = [
  { key: 'tactics' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.28.1'); }, icon: STAT_ICONS.tactics },
  { key: 'authority' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.29.2'); }, icon: STAT_ICONS.authority },
  { key: 'loyalty' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.32.5'); }, icon: STAT_ICONS.loyalty },
];

export interface UnitStats {
  description: string;
  tier: number;
  upkeep: number;
  foodConsumption: number;
  speed: number;
  attackSpeed: number;
  siegePower: number;
  pierceDmg: number;
  crushDmg: number;
  slashDmg: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  attritionImmunity?: string;
  canAttackWhileMoving?: boolean;
}

export function resolveUnitStats(unit: ArmyUnit): UnitStats {
  const attritionImmunity = unit.immuneToWinterAttrition && unit.immuneToDesertAttrition
    ? webUIText('Auto.ComponentsCommonUnitTooltip.305.1')
    : unit.immuneToWinterAttrition
      ? webUIText('Auto.ComponentsCommonUnitTooltip.308.2')
      : unit.immuneToDesertAttrition
        ? webUIText('Auto.ComponentsCommonUnitTooltip.311.3')
        : undefined;

  return {
    description: unit.description,
    tier: unit.tier,
    upkeep: unit.upkeep,
    foodConsumption: unit.foodConsumption,
    speed: unit.speed,
    attackSpeed: unit.attackSpeed,
    siegePower: unit.siegePower,
    pierceDmg: unit.pierceDmg,
    crushDmg: unit.crushDmg,
    slashDmg: unit.slashDmg,
    pierceArmour: unit.pierceArmour,
    crushArmour: unit.crushArmour,
    slashArmour: unit.slashArmour,
    attritionImmunity,
    canAttackWhileMoving: unit.canAttackWhileMoving,
  };
}



export interface MilitaryAction {
  label: string;
  icon: string;
  description: string;
  tutorialTarget?: string;
  tooltip?: TooltipContent;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  stateLabel?: string;
}

export interface CompositionSummaryRow {
  type: string;
  count: number;
  strength: number;
  maxStrength: number;
  formations: number;
}

export interface UnitSelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UnitSelectionDragState {
  rowId: string;
  startX: number;
  startY: number;
  additive: boolean;
  range: boolean;
  baseSelectedIds: string[];
  moved: boolean;
  cleanup?: () => void;
}

export function getStrengthColor(ratio: number): string {
  if (ratio >= 0.8) return 'var(--green)';
  if (ratio >= 0.5) return 'var(--yellow)';
  return 'var(--red)';
}

export function getStrengthBarColor(ratio: number): 'green' | 'red' {
  return ratio > 0.5 ? 'green' : 'red';
}

export function getMoraleColor(morale: number): string {
  if (morale >= 75) return 'var(--green)';
  if (morale >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

export function formatLargeNumber(n: number): string {
  return formatNumber(n);
}

export function formatStrength(value: number, max: number): string {
  return `${formatLargeNumber(value)}/${formatLargeNumber(max)}`;
}

function getTemporaryStatModifiers(character: Character, stat: StatKey): CharacterStatModifier[] {
  return character.stats.temporaryModifiers?.filter(modifier => modifier.stat === stat) ?? [];
}

function getTemporaryStatModifierTotal(modifiers: CharacterStatModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
}

export function modifierValueColor(value: number): string {
  if (value > 0) return 'var(--green)';
  if (value < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

export function buildCommanderStatEntry(character: Character, statDef: typeof commanderStatDefs[number]) {
  const value = character.stats[statDef.key];
  const temporaryModifiers = getTemporaryStatModifiers(character, statDef.key);
  const temporaryTotal = getTemporaryStatModifierTotal(temporaryModifiers);

  return {
    id: statDef.key,
    label: statDef.label,
    value,
    icon: statDef.icon,
    temporaryTotal,
    tooltip: buildCharacterStatTooltip(statDef.key, value, character),
  };
}

export function computeArmyStats(units: ArmyUnit[]) {
  let totalUpkeep = 0;
  let totalFood = 0;
  let totalSiege = 0;
  let totalPierceDmg = 0;
  let totalCrushDmg = 0;
  let totalSlashDmg = 0;
  let totalPierceArmour = 0;
  let totalCrushArmour = 0;
  let totalSlashArmour = 0;
  let minSpeed = Infinity;
  let formationCount = 0;
  for (const unit of units) {
    const stats = resolveUnitStats(unit);
    totalUpkeep += stats.upkeep;
    totalFood += stats.foodConsumption;
    totalSiege += stats.siegePower;
    totalPierceDmg += stats.pierceDmg;
    totalCrushDmg += stats.crushDmg;
    totalSlashDmg += stats.slashDmg;
    totalPierceArmour += stats.pierceArmour;
    totalCrushArmour += stats.crushArmour;
    totalSlashArmour += stats.slashArmour;
    if (stats.speed < minSpeed) minSpeed = stats.speed;
    formationCount += 1;
  }

  const averageStat = (total: number) => formationCount > 0 ? total / formationCount : 0;
  return {
    upkeep: totalUpkeep,
    food: totalFood,
    siegePower: totalSiege,
    pierceDmg: averageStat(totalPierceDmg),
    crushDmg: averageStat(totalCrushDmg),
    slashDmg: averageStat(totalSlashDmg),
    pierceArmour: averageStat(totalPierceArmour),
    crushArmour: averageStat(totalCrushArmour),
    slashArmour: averageStat(totalSlashArmour),
    speed: minSpeed === Infinity ? 0 : minSpeed,
  };
}

export function coerceDoctrine(raw: string | undefined): MilitaryDoctrine {
  if (raw === 'screen' || raw === 'garrison' || raw === 'independent') return raw;
  return 'concentrate';
}

export function resourceIconPath(resourceId: string): string {
  if (resourceId === 'food') return WebkilnAssetPath('/assets/icons/I_Food.png');
  return WebkilnAssetPath(`/assets/resources/${resourceId}.png`);
}

export function formatUnitTypeName(type: string): string {
  return unitTypeLabel(type);
}

export function unitTypeIconPath(type: string): string {
  const direct = unitTypeIcons[type];
  if (direct) return direct;

  const formatted = formatUnitTypeName(type);
  const formattedMatch = unitTypeIcons[formatted];
  if (formattedMatch) return formattedMatch;

  const lowerType = type.toLowerCase();
  const matchingKey = Object.keys(unitTypeIcons).find((key) => key.toLowerCase() === lowerType);
  return matchingKey ? unitTypeIcons[matchingKey] : '/assets/icons/UnitTypes/I_ArmyInfantry.png';
}

export function formatResourceAmount(value: number): string {
  return formatResourceNumber(value);
}

export function formatSupplyWindow(days: number): string {
  if (days <= 0) return webUIText("MilitarySidebar.Empty");
  if (days >= 120) return webUIText("MilitarySidebar.Long");
  return webUIText("MilitarySidebar.Days", { Value1: formatNumber(days) });
}

function supplyAdvice(army: Army, status: string, settlement: string, missing: string): string {
  switch (status) {
    case 'missing_resources':
      return settlement
        ? webUIText('MilitarySidebar.SupplyMissingAtSettlement', { Settlement: settlement, Resources: missing })
        : webUIText('MilitarySidebar.SupplyMissingNoSettlement', { Resources: missing });
    case 'refilling_now':
      return webUIText('MilitarySidebar.SupplyRefillingNow', { Settlement: settlement });
    case 'refilling_slow':
      return webUIText('MilitarySidebar.SupplyRefillingSlow', { Settlement: settlement });
    case 'unfriendly':
      return webUIText('MilitarySidebar.SupplyUnfriendly', { Settlement: settlement });
    case 'not_in_port':
      return settlement
        ? webUIText('MilitarySidebar.SupplyNavyNotDockedAt', { Settlement: settlement })
        : webUIText('MilitarySidebar.SupplyNavyNotDocked');
    case 'no_port':
      return settlement
        ? webUIText('MilitarySidebar.SupplyNavyNoPortAt', { Settlement: settlement })
        : webUIText('MilitarySidebar.SupplyNavyNotDocked');
    case 'embarked':
      return webUIText('MilitarySidebar.SupplyEmbarked');
    case 'in_field':
      return army.isNavy ? webUIText('MilitarySidebar.SupplyHowNavy') : webUIText('MilitarySidebar.SupplyInField');
    default:
      return army.isNavy ? webUIText('MilitarySidebar.SupplyHowNavy') : webUIText('MilitarySidebar.SupplyHowArmy');
  }
}

export function buildSupplyTooltip(army: Army): TooltipContent {
  const days = army.supplyDays ?? 0;
  const status = army.supplyRefillStatus ?? '';
  const settlement = army.supplySettlementName ?? '';
  const missing = army.supplyMissingResources ?? '';
  const remaining = days <= 0
    ? webUIText('MilitarySidebar.SupplyEmptyBody')
    : webUIText('MilitarySidebar.SupplyDaysBody', { Days: formatNumber(days) });
  const lines: NonNullable<TooltipContent['lines']> = [
    {
      label: webUIText('MilitarySidebar.SupplyRemainingLabel'),
      value: formatSupplyWindow(days),
      valueColor: days > 30 ? 'var(--green)' : 'var(--red)',
    },
    {
      label: webUIText('MilitarySidebar.SupplySourceLabel'),
      value: settlement
        || (army.isNavy ? webUIText('MilitarySidebar.SupplyNoPort') : webUIText('MilitarySidebar.SupplyNoSource')),
    },
  ];
  if (missing) {
    lines.push({
      label: webUIText('MilitarySidebar.SupplyMissingLabel'),
      value: missing,
      valueColor: 'var(--red)',
    });
  }
  return {
    title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.621.20'),
    body: `${remaining} ${supplyAdvice(army, status, settlement, missing)}`.trim(),
    lines,
  };
}

export function buildResourceRows(army: Army): MilitaryResource[] {
  return army.resources ?? [];
}

export function resourceFillPercent(row: MilitaryResource): number {
  return row.capacity > 0 ? (row.amount / row.capacity) * 100 : 0;
}

export function resourceReserveTargetDays(row: MilitaryResource): number {
  return row.id === 'food' ? 180 : 365;
}

export function resourceReservePercent(row: MilitaryResource): number {
  if (row.monthlyUsage <= 0) return 100;
  return Math.min(100, (row.daysRemaining / resourceReserveTargetDays(row)) * 100);
}

/** True when stock is short enough that the player should notice it first. */
export function isResourceUrgent(row: MilitaryResource): boolean {
  if (row.monthlyUsage <= 0) {
    return row.capacity > 0 && row.amount / row.capacity <= 0.25;
  }
  return row.daysRemaining < resourceReserveTargetDays(row) * 0.35;
}

export function resourceUrgencyScore(row: MilitaryResource): number {
  if (row.monthlyUsage > 0) return row.daysRemaining;
  if (row.capacity > 0) return (row.amount / row.capacity) * 1000;
  return 1000 + row.amount;
}

/** Shortages first, then remaining days / fill ascending. */
export function sortResourceRowsByUrgency(rows: MilitaryResource[]): MilitaryResource[] {
  return [...rows].sort((a, b) => {
    const aUrgent = isResourceUrgent(a) ? 0 : 1;
    const bUrgent = isResourceUrgent(b) ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return resourceUrgencyScore(a) - resourceUrgencyScore(b);
  });
}

export function formatResourceStock(row: MilitaryResource): string {
  return row.capacity > 0
    ? `${formatResourceAmount(row.amount)} / ${formatResourceAmount(row.capacity)}`
    : formatResourceAmount(row.amount);
}

export function resolveCurrentOrderLabel(army: Army): string {
  if (army.currentOrder && army.currentOrder.trim().length > 0) {
    return army.currentOrder;
  }
  if (army.garrisonedAt) {
    return webUIText('MilitarySidebar.GarrisonedAt', { Settlement: army.garrisonedAt });
  }
  if (army.isReplenishing) {
    return webUIText('MilitarySidebar.ReplenishingActive');
  }
  return webUIText('MilitarySidebar.Idle');
}

export function resolveForcedMarchDisabledReason(army: Army): string | undefined {
  if (army.isForcedMarching) return undefined;
  if (!army.isPlayerControlled) return webUIText('MilitarySidebar.ForcedMarchNotYours');
  if (army.canForcedMarch) return undefined;
  if (army.garrisonedAt) {
    return webUIText('MilitarySidebar.ForcedMarchGarrisoned', { Settlement: army.garrisonedAt });
  }
  if (army.isRaiding) return webUIText('MilitarySidebar.ForcedMarchRaiding');
  return webUIText('MilitarySidebar.ForcedMarchInBattle');
}

export function unitRowSourceLabels(row: ArmyUnitRow): string[] {
  return row.sources.map(source => (
    source.count > 1 ? `${source.name} x${formatNumber(source.count)}` : source.name
  ));
}

export function unitRowSourcePreview(row: ArmyUnitRow, maxVisible = 2): {
  labels: string[];
  remaining: number;
  full: string;
} {
  const labels = unitRowSourceLabels(row);
  const full = labels.join(', ');
  if (labels.length <= maxVisible) {
    return { labels, remaining: 0, full };
  }
  return {
    labels: labels.slice(0, maxVisible),
    remaining: labels.length - maxVisible,
    full,
  };
}

export function isUnitRowPending(rowType: ArmyUnitRow['rowType']): boolean {
  return rowType !== 'existing';
}

export function selectedUnitsCanConsolidate(units: ArmyUnitRow[]): boolean {
  const understrengthByClass = new Map<string, number>();
  for (const unit of units) {
    if (unit.rowType !== 'existing' || !unit.selectable) continue;
    if (unit.maxStrength <= 0 || unit.strength <= 0 || unit.strength >= unit.maxStrength) continue;
    understrengthByClass.set(unit.unitId, (understrengthByClass.get(unit.unitId) ?? 0) + 1);
  }
  for (const count of understrengthByClass.values()) {
    if (count >= 2) return true;
  }
  return false;
}

export function isUnitRowProgressing(rowType: ArmyUnitRow['rowType']): boolean {
  return rowType === 'beingBuilt' || rowType === 'inTransit';
}

export function unitRowStatusText(row: ArmyUnitRow): string {
  switch (row.rowType) {
    case 'beingBuilt':
      return webUIText('Military.UnitRow.Raising');
    case 'inTransit':
      return webUIText('Military.UnitRow.InTransit');
    case 'unbuildable':
      return webUIText('Military.UnitRow.CannotBuild');
    case 'replenishDisabled':
      return webUIText('Military.UnitRow.ReplenishDisabled');
    case 'pending':
      return webUIText('Military.UnitRow.Pending');
    default:
      return row.statusLabel;
  }
}

export function unitRowPortraitSrc(unit: ArmyUnit | ArmyUnitRow): string {
  if (unit.portrait) {
    return unit.portrait;
  }
  return unitTypeIconPath(unit.type);
}

export function unitRowUsesTypePortrait(unit: ArmyUnit | ArmyUnitRow): boolean {
  return !unit.portrait;
}

export function armyUnitTooltipData(unit: ArmyUnit | ArmyUnitRow): UnitTooltipData {
  const stats = resolveUnitStats(unit);
  return {
    name: unit.name,
    description: stats.description,
    portrait: unitRowPortraitSrc(unit),
    typeLabel: formatUnitTypeName(unit.type),
    typeIcon: unitTypeIconPath(unit.type),
    tier: stats.tier,
    culture: unit.culture || undefined,
    cultureInfo: unit.cultureInfo,
    strength: unit.strength,
    maxStrength: unit.maxStrength,
    upkeep: stats.upkeep,
    foodConsumption: stats.foodConsumption,
    speed: stats.speed,
    attackSpeed: stats.attackSpeed,
    damage: {
      pierce: stats.pierceDmg,
      crush: stats.crushDmg,
      slash: stats.slashDmg,
    },
    armour: {
      pierce: stats.pierceArmour,
      crush: stats.crushArmour,
      slash: stats.slashArmour,
    },
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
    canAttackWhileMoving: unit.canAttackWhileMoving,
    count: unit.count,
  };
}


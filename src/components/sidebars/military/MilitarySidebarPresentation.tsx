import PaintedBar from '../../common/data-display/bars/PaintedBar';
import CultureTooltip from '../../common/tooltips/CultureTooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import type { Army, ArmyUnit, ArmyUnitRow, Character, CharacterStatModifier, MilitaryDoctrine, MilitaryResource, StatKey } from '../../../data/types';
import { STAT_ICONS, TIER_ICONS } from '../../../utils/iconMaps';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import glossary from '../../../data/glossary';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

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
  { key: 'tactics' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.28.1'); }, icon: STAT_ICONS.tactics, glossaryKey: 'Tactics' },
  { key: 'authority' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.29.2'); }, icon: STAT_ICONS.authority, glossaryKey: 'Authority' },
  { key: 'loyalty' as const, get label() { return webUIText('Auto.TopProp.ComponentsCommonPersonTooltip.32.5'); }, icon: STAT_ICONS.loyalty, glossaryKey: 'Loyalty' },
];

export interface UnitStats {
  description: string;
  tier: number;
  upkeep: number;
  foodConsumption: number;
  speed: number;
  siegePower: number;
  pierceDmg: number;
  crushDmg: number;
  slashDmg: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  attritionImmunity?: string;
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
    siegePower: unit.siegePower,
    pierceDmg: unit.pierceDmg,
    crushDmg: unit.crushDmg,
    slashDmg: unit.slashDmg,
    pierceArmour: unit.pierceArmour,
    crushArmour: unit.crushArmour,
    slashArmour: unit.slashArmour,
    attritionImmunity,
  };
}

export interface UnitStatCaps {
  pierceDmg: number;
  crushDmg: number;
  slashDmg: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  speed: number;
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

export interface UnitRosterGroup {
  key: string;
  name: string;
  type: string;
  rows: ArmyUnitRow[];
  count: number;
  strength: number;
  maxStrength: number;
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

function formatTemporaryModifierLabel(modifier: CharacterStatModifier): string {
  if (modifier.remainingDays === undefined) return modifier.label;
  const days = Math.round(modifier.remainingDays);
  return webUIText("Auto.Return.componentscommonPersonTooltip.120.1", { Label: modifier.label, Value2: formatNumber(days), Value3: days === 1 ? webUIText('Common.Day') : webUIText('Common.Days') });
}

function temporaryModifierTooltipLines(modifiers: CharacterStatModifier[]): TooltipLine[] {
  if (modifiers.length === 0) return [];

  return [
    { label: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.127.1'), isHeader: true },
    ...modifiers.map(modifier => ({
      label: formatTemporaryModifierLabel(modifier),
      value: formatSignedNumber(modifier.value, { maximumFractionDigits: 1 }),
      valueColor: modifierValueColor(modifier.value),
    })),
  ];
}

export function buildCommanderStatEntry(character: Character, statDef: typeof commanderStatDefs[number]) {
  const value = character.stats[statDef.key];
  const base = character.stats.base?.[statDef.key];
  const temporaryModifiers = getTemporaryStatModifiers(character, statDef.key);
  const temporaryTotal = getTemporaryStatModifierTotal(temporaryModifiers);
  const contributions = character.traits.flatMap((trait) =>
    (trait.effects ?? [])
      .filter((effect) => effect.stat === statDef.key)
      .map((effect) => ({
        label: trait.name,
        value: effect.value,
        valueColor: effect.isPositive ? 'var(--green)' : 'var(--red)',
      })),
  );
  const baseContent = glossary[statDef.glossaryKey as keyof typeof glossary] || { title: statDef.label, body: '' };
  const lines: TooltipLine[] = [];
  if (base !== undefined) lines.push({ label: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.365.6'), value: formatNumber(base) });
  if (contributions.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.367.7'), isHeader: true });
    lines.push(...contributions);
  }
  lines.push(...temporaryModifierTooltipLines(temporaryModifiers));

  return {
    id: statDef.key,
    label: statDef.label,
    value,
    icon: statDef.icon,
    temporaryTotal,
    tooltip: { title: baseContent.title, body: baseContent.body, lines },
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
  if (resourceId === 'Food') return FoaeCefUIAssetPath('/assets/icons/I_Food.png');
  return FoaeCefUIAssetPath(`/assets/resources/${resourceId}.png`);
}

export function formatUnitTypeName(type: string): string {
  return type.length > 0 ? type.charAt(0).toUpperCase() + type.slice(1) : type;
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
  return formatNumber(value, { maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0 });
}

export function formatSupplyWindow(days: number): string {
  if (days <= 0) return webUIText("Auto.Fix.Return.componentssidebarsMilitarySidebar.256.1");
  if (days >= 120) return webUIText("Auto.Fix.Return.componentssidebarsMilitarySidebar.257.1");
  return webUIText("Auto.Fix.Return.componentssidebarsMilitarySidebar.258.1", { Value1: formatNumber(days) });
}

export function buildResourceRows(army: Army): MilitaryResource[] {
  return army.resources ?? [];
}

export function resourceFillPercent(row: MilitaryResource): number {
  return row.capacity > 0 ? (row.amount / row.capacity) * 100 : 0;
}

export function resourceReserveTargetDays(row: MilitaryResource): number {
  return row.id === 'Food' ? 180 : 365;
}

export function resourceReservePercent(row: MilitaryResource): number {
  if (row.monthlyUsage <= 0) return 100;
  return Math.min(100, (row.daysRemaining / resourceReserveTargetDays(row)) * 100);
}

export function formatResourceStock(row: MilitaryResource): string {
  return row.capacity > 0
    ? `${formatResourceAmount(row.amount)} / ${formatResourceAmount(row.capacity)}`
    : formatResourceAmount(row.amount);
}

export function unitRowSourceSummary(row: ArmyUnitRow): string {
  return row.sources
    .map(source => source.count > 1 ? `${source.name} x${formatNumber(source.count)}` : source.name)
    .join(', ');
}

export function buildUnitTooltip(unit: ArmyUnit | ArmyUnitRow, maxStats: UnitStatCaps): TooltipContent {
  const stats = resolveUnitStats(unit);

  const row = 'rowType' in unit ? unit : null;
  const ratio = unit.maxStrength > 0 ? unit.strength / unit.maxStrength : 0;
  const veterancy = Math.min(100, Math.round(ratio * 60 + 20));
  const typeLabel = formatUnitTypeName(unit.type);
  const typeIcon = unitTypeIconPath(unit.type);
  const damageRows = [
    { id: 'pierce', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.362.1'), value: stats.pierceDmg, max: maxStats.pierceDmg, icon: '/assets/icons/I_Damage_Pierce.png' },
    { id: 'crush', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.363.2'), value: stats.crushDmg, max: maxStats.crushDmg, icon: '/assets/icons/I_Damage_Crush.png' },
    { id: 'slash', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.364.3'), value: stats.slashDmg, max: maxStats.slashDmg, icon: '/assets/icons/I_Damage_Slash.png' },
  ];
  const armourRows = [
    { id: 'pierce', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.368.4'), value: stats.pierceArmour, max: maxStats.pierceArmour, icon: '/assets/icons/I_Armour_Pierce.png' },
    { id: 'crush', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.369.5'), value: stats.crushArmour, max: maxStats.crushArmour, icon: '/assets/icons/I_Armour_Crush.png' },
    { id: 'slash', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.370.6'), value: stats.slashArmour, max: maxStats.slashArmour, icon: '/assets/icons/I_Armour_Slash.png' },
  ];

  return {
    afterLines: (
      <div className="mil-unit-tooltip">
      <div className="mil-unit-tooltip-title-row">
        <img src={typeIcon} alt="" className="mil-unit-tooltip-type-icon" />
        <span className="tt-title" style={{ margin: 0 }}>{unit.name}</span>
        {TIER_ICONS[stats.tier] && <img src={TIER_ICONS[stats.tier]} alt="" className="mil-unit-tooltip-tier-icon" />}
      </div>
      <div className="mil-unit-tooltip-header">
        <img src={unit.portrait} alt="" className="mil-unit-tooltip-portrait" draggable={false} />
        <div className="mil-unit-tooltip-info">
          <div className="mil-unit-tooltip-meta">
            <span className="tt-body">{typeLabel}</span>
            <CultureTooltip info={unit.cultureInfo} fallbackName={unit.culture} fallbackId={unit.cultureId}>
              <span className="tt-body">{unit.culture}</span>
            </CultureTooltip>
          </div>
          <div className="tt-body mil-unit-tooltip-description">{stats.description}</div>
        </div>
      </div>
      {row && row.rowType !== 'existing' && row.statusLabel && (
        <div className="tt-lines mil-unit-tooltip-special">
          <div className="tt-line">
            <span className="tt-line-label">{row.statusLabel}</span>
            <span className="tt-line-value">{unitRowSourceSummary(row)}</span>
          </div>
        </div>
      )}
      <div className="tt-lines">
        <div className="tt-line">
          <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.307.1" /></span>
          <span className="tt-line-value" style={{ color: getStrengthColor(ratio) }}>{formatStrength(unit.strength, unit.maxStrength)}</span>
        </div>
        <div className="tt-line">
          <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.311.2" /></span>
          <span className="tt-line-value"><img src="/assets/icons/I_Coins.png" alt="" className="tt-line-icon" />{formatNumber(stats.upkeep)}<WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.312.3" /></span>
        </div>
        <div className="tt-line">
          <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.315.4" /></span>
          <span className="tt-line-value"><img src="/assets/icons/I_Food.png" alt="" className="tt-line-icon" />{formatNumber(stats.foodConsumption)}<WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.316.5" /></span>
        </div>
      </div>
      <div className="tt-line tt-line--header"><span className="tt-line-header-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.319.6" /></span></div>
      <div className="mil-unit-stats">
        {damageRows.map(row => (
          <div key={row.id} className="mil-unit-stat-row">
            <img src={row.icon} alt="" className="mil-unit-stat-icon" draggable={false} />
            <span className="mil-unit-stat-label">{row.label}</span>
            <PaintedBar percent={row.max > 0 ? (row.value / row.max) * 100 : 0} color="red" className="mil-unit-stat-bar" />
            <span className="mil-unit-stat-val">{formatNumber(row.value)}</span>
          </div>
        ))}
      </div>
      <div className="tt-line tt-line--header"><span className="tt-line-header-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.334.7" /></span></div>
      <div className="mil-unit-stats">
        {armourRows.map(row => (
          <div key={row.id} className="mil-unit-stat-row">
            <img src={row.icon} alt="" className="mil-unit-stat-icon" draggable={false} />
            <span className="mil-unit-stat-label">{row.label}</span>
            <PaintedBar percent={row.max > 0 ? (row.value / row.max) * 100 : 0} color="gold" className="mil-unit-stat-bar" />
            <span className="mil-unit-stat-val">{formatNumber(row.value)}</span>
          </div>
        ))}
      </div>
      <div className="mil-unit-stats mil-unit-stats--compact">
        <div className="mil-unit-stat-row">
          <img src="/assets/icons/I_Speed.png" alt="" className="mil-unit-stat-icon" />
          <span className="mil-unit-stat-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.352.8" /></span>
          <PaintedBar percent={maxStats.speed > 0 ? (stats.speed / maxStats.speed) * 100 : 0} color="green" className="mil-unit-stat-bar" />
          <span className="mil-unit-stat-val">{formatNumber(stats.speed)}</span>
        </div>
        <div className="mil-unit-stat-row">
          <img src={TIER_ICONS[stats.tier] || TIER_ICONS[1]} alt="" className="mil-unit-stat-icon" />
          <span className="mil-unit-stat-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.358.9" /></span>
          <PaintedBar percent={veterancy} color="gold" className="mil-unit-stat-bar" />
          <span className="mil-unit-stat-val">{formatPercent(veterancy)}</span>
        </div>
      </div>
      {stats.attritionImmunity && (
        <div className="tt-lines mil-unit-tooltip-special">
          <div className="tt-line">
            <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsSidebarsMilitarySidebar.366.10" /></span>
            <span className="tt-line-value" style={{ color: 'var(--green)' }}>{stats.attritionImmunity}</span>
          </div>
        </div>
      )}
      </div>
    ),
  };
}


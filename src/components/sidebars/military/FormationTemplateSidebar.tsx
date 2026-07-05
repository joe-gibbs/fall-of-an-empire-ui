import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Badge from '../../common/data-display/stats/Badge';
import CloseButton from '../../common/buttons/CloseButton';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import type { UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import {
  applyFormationTemplateBridge,
  deleteFormationTemplateBridge,
  saveFormationTemplateBridge,
  useFormationTemplatesBridge,
} from '../../../bridge/military-map/useFormationTemplatesBridge';
import { setMilitaryFormationTemplateBridge } from '../../../bridge/military-map/useMilitaryBridge';
import { acknowledgeBridgeFailure, getRuntimeEngine } from '../../../bridge/core/runtimeEngine';
import { useMilitary } from '../../../data-source/index';
import type {
  FormationTemplateAssignedForce,
  FormationTemplateBattleGroupEntry,
  FormationTemplateEntry,
  FormationTemplateResourceCost,
  FormationTemplateUnitEntry,
  SaveFormationTemplateBattleGroupRequest,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import { useGameActions } from '../../../context/GameContext';
import { getFormationTemplateIcon } from '../../../utils/formationTemplatePresentation';
import { formatNumber } from '../../../utils/numberFormat';
import { TIER_ICONS } from '../../../utils/iconMaps';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import { registerSidebar } from '../../../registry/index';
import SidebarTabBar from '../shared/SidebarTabBar';
import SidebarToolbar from '../shared/SidebarToolbar';
import '../shared/Sidebar.css';
import './FormationTemplateSidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface FormationTemplateSidebarProps {
  sidebarId: string | null;
  onClose: () => void;
}

type TemplateType = 'land' | 'naval';
type TemplateTab = 'composition' | 'combat';
type BattleFormationRole = 'melee' | 'ranged';

interface DraftTemplate {
  templateId: string;
  name: string;
  iconId: string;
  type: TemplateType;
  counts: Record<string, number>;
  order: string[];
  battleGroups: DraftBattleGroup[];
}

interface DraftBattleGroup {
  id: string;
  role: BattleFormationRole;
  counts: Record<string, number>;
  order: string[];
}

interface ResourceTotal {
  name: string;
  amount: number;
}

interface DerivedTotals {
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
  infantry: '/assets/icons/UnitTypes/Infantry.png',
  cavalry: '/assets/icons/UnitTypes/Cavalry.png',
  ranged: '/assets/icons/UnitTypes/Ranged.png',
  siege: '/assets/icons/I_Siege.png',
  special: '/assets/icons/I_Swords.png',
  scout: '/assets/icons/I_NaviesQuickButton.png',
  transport: '/assets/icons/I_NaviesQuickButton.png',
  galley: '/assets/icons/I_NaviesQuickButton.png',
  trireme: '/assets/icons/I_NaviesQuickButton.png',
  quinquereme: '/assets/icons/I_NaviesQuickButton.png',
  navy: '/assets/icons/I_NaviesQuickButton.png',
  naval: '/assets/icons/I_NaviesQuickButton.png',
  other: '/assets/icons/I_Swords.png',
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

const EMPTY_TOTALS: DerivedTotals = {
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

const EMPTY_UNIT_CATALOGUE: FormationTemplateUnitEntry[] = [];
const MAX_BATTLE_FORMATION_SIZE = 10;
let nextBattleGroupId = 1;

function fmt(value: number, maximumFractionDigits = 0): string {
  return formatNumber(value, { maximumFractionDigits });
}

function normaliseTemplateType(type: string): TemplateType {
  return type === 'naval' || type === 'navy' ? 'naval' : 'land';
}

function newTemplateTypeFromSidebarId(sidebarId: string | null): TemplateType | null {
  if (!sidebarId || (sidebarId !== 'new' && !sidebarId.startsWith('new:'))) return null;
  if (sidebarId === 'new') return 'land';
  const rawType = decodeSidebarToken(sidebarId.slice('new:'.length).split(':')[0]);
  return normaliseTemplateType(rawType);
}

function decodeSidebarToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function templateKind(type: TemplateType): string {
  return type === 'naval' ? 'Fleet Template' : 'Legion Template';
}

function templateTypeName(type: TemplateType): string {
  return type === 'naval' ? 'Fleet' : 'Legion';
}

function unitTypeLabel(type: string): string {
  if (UNIT_TYPE_LABELS[type]) return UNIT_TYPE_LABELS[type];
  return type.replace(/(^|-|_)([a-z])/g, (_match, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`);
}

function unitTypeIcon(type: string): string {
  return UNIT_TYPE_ICONS[type] ?? UNIT_TYPE_ICONS.other;
}

function resourceIcon(name: string): string {
  return FoaeCefUIAssetPath(`/assets/resources/${name}.png`);
}

function resourceAmount(value: number): string {
  if (value >= 1) return fmt(value);
  return formatNumber(value, { maximumFractionDigits: value >= 0.1 ? 1 : 2 });
}

function toUnitKey(raw: string): string {
  return raw
    .replace(/^U/, '')
    .replace(/_C$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function unitPortrait(unit: FormationTemplateUnitEntry): string {
  const raw = unit.portrait || UNIT_PORTRAITS[toUnitKey(unit.id)] || UNIT_PORTRAITS[toUnitKey(unit.name)] || '';
  return FoaeCefUIAssetPath(raw) ?? raw;
}

function resourceCosts(costs: FormationTemplateResourceCost[]) {
  return costs.map(cost => ({
    name: cost.name,
    amount: cost.amount,
    icon: resourceIcon(cost.name),
  }));
}

function unitTooltipData(unit: FormationTemplateUnitEntry, count: number): UnitTooltipData {
  return {
    name: unit.name,
    description: unit.description,
    portrait: unitPortrait(unit),
    typeLabel: unitTypeLabel(unit.type),
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
  };
}

function defaultTemplateName(type: TemplateType): string {
  return webUIText(type === 'naval' ? 'MilitaryScreen.NewFleetTemplate' : 'MilitaryScreen.NewArmyTemplate');
}

function emptyDraft(type: TemplateType): DraftTemplate {
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

function createBattleGroupId(): string {
  const id = `group-${nextBattleGroupId}`;
  nextBattleGroupId += 1;
  return id;
}

function normaliseBattleRole(role: string): BattleFormationRole {
  return role === 'ranged' ? 'ranged' : 'melee';
}

function buildBattleGroups(groups: FormationTemplateBattleGroupEntry[]): DraftBattleGroup[] {
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

function buildDraft(template: FormationTemplateEntry): DraftTemplate {
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

function orderedUnitIds(draft: DraftTemplate): string[] {
  const ids = [...draft.order];
  Object.keys(draft.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids;
}

function compositionRequests(draft: DraftTemplate): SaveFormationTemplateUnitRequest[] {
  return orderedUnitIds(draft)
    .map(unitId => ({ unitId, count: draft.counts[unitId] ?? 0 }))
    .filter(unit => unit.count > 0);
}

function orderedBattleGroupUnitIds(group: DraftBattleGroup): string[] {
  const ids = [...group.order];
  Object.keys(group.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids;
}

function battleGroupUnitCount(group: DraftBattleGroup): number {
  return orderedBattleGroupUnitIds(group).reduce((sum, unitId) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

function battleGroupRequests(draft: DraftTemplate): SaveFormationTemplateBattleGroupRequest[] {
  return draft.battleGroups
    .map(group => ({
      role: group.role,
      units: orderedBattleGroupUnitIds(group)
        .map(unitId => ({ unitId, count: group.counts[unitId] ?? 0 }))
        .filter(unit => unit.count > 0),
    }))
    .filter(group => group.units.length > 0);
}

function draftUnitCount(draft: DraftTemplate): number {
  return compositionRequests(draft).reduce((sum, unit) => sum + unit.count, 0);
}

function draftsEqual(a: DraftTemplate | null, b: DraftTemplate | null): boolean {
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

function addResourceTotals(target: Map<string, number>, costs: FormationTemplateResourceCost[], count: number) {
  costs.forEach(cost => {
    const current = target.get(cost.name) ?? 0;
    target.set(cost.name, current + cost.amount * count);
  });
}

function sortedResources(resources: Map<string, number>): ResourceTotal[] {
  return Array.from(resources.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function computeDerived(draft: DraftTemplate, unitById: Map<string, FormationTemplateUnitEntry>): DerivedTotals {
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
  const resources = new Map<string, number>();
  const monthlyResources = new Map<string, number>();

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

function battleFormationRole(unit: FormationTemplateUnitEntry): BattleFormationRole {
  return unit.range > 0 ? 'ranged' : 'melee';
}

function assignedBattleGroupCount(draft: DraftTemplate, unitId: string): number {
  return draft.battleGroups.reduce((sum, group) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

function groupAssignedCountExcluding(draft: DraftTemplate, unitId: string, groupId: string): number {
  return draft.battleGroups.reduce((sum, group) => (
    group.id === groupId ? sum : sum + Math.max(0, group.counts[unitId] ?? 0)
  ), 0);
}

function unassignedUnitCount(draft: DraftTemplate, unitId: string): number {
  return Math.max(0, (draft.counts[unitId] ?? 0) - assignedBattleGroupCount(draft, unitId));
}

function allUnitsAssigned(draft: DraftTemplate): boolean {
  const requests = compositionRequests(draft);
  if (requests.length === 0) return false;
  return requests.every(request => assignedBattleGroupCount(draft, request.unitId) === request.count);
}

function battleGroupsValid(draft: DraftTemplate, unitById: Map<string, FormationTemplateUnitEntry>): boolean {
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

function pruneEmptyGroups(groups: DraftBattleGroup[]): DraftBattleGroup[] {
  return groups.filter(group => battleGroupUnitCount(group) > 0);
}

function removeUnitsFromBattleGroups(
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

function TierBadge({ tier }: { tier: number }) {
  return <img src={TIER_ICONS[tier] || TIER_ICONS[1]} alt={webUIText("Auto.Attr.componentssidebarsFormationTemplateSidebar.384.1", { Value1: fmt(tier) })} className="tpl-tier-badge" />;
}

function ResourceStrip({ resources, title }: { resources: ResourceTotal[]; title: string }) {
  if (resources.length === 0) return null;
  return (
    <div className="tpl-resource-strip">
      {resources.map(resource => (
        <Tooltip
          key={resource.name}
          position="bottom"
          delay={150}
          content={{
            title: resource.name,
            body: title,
            lines: [
              {
                label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.401.1'),
                value: resourceAmount(resource.amount),
                valueIcon: resourceIcon(resource.name),
                valueColor: 'var(--gold-light)',
              },
            ],
          }}
        >
          <span className="tpl-resource-pill">
            <img src={resourceIcon(resource.name)} alt="" className="tpl-resource-icon" />
            <span className="tpl-resource-amt">{resourceAmount(resource.amount)}</span>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

function TotalsBlock({ derived, isNaval }: { derived: DerivedTotals; isNaval: boolean }) {
  const stats = [
    {
      key: 'units',
      icon: isNaval ? '/assets/icons/I_NaviesQuickButton.png' : '/assets/icons/I_ArmiesQuickButton.png',
      label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.424.2'),
      value: fmt(derived.entries),
      color: 'var(--text-bright)',
      title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.427.3'),
      body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.428.4'),
    },
    {
      key: 'strength',
      icon: '/assets/icons/I_Swords.png',
      label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.433.5'),
      value: fmt(derived.strength),
      color: 'var(--green)',
      title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.436.6'),
      body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.437.7'),
    },
    {
      key: 'cost',
      icon: '/assets/icons/I_Coins.png',
      label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.442.8'),
      value: fmt(derived.price),
      color: 'var(--yellow)',
      title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.445.9'),
      body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.446.10'),
    },
    {
      key: 'upkeep',
      icon: '/assets/icons/I_Coins.png',
      label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.451.11'),
      get value() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.452.1", { Value1: fmt(derived.upkeep) }); },
      color: 'var(--red)',
      title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.454.12'),
      body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.455.13'),
    },
    {
      key: 'speed',
      icon: '/assets/icons/I_Speed.png',
      label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.460.14'),
      value: fmt(derived.speed),
      color: 'var(--text-bright)',
      title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.463.15'),
      body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.464.16'),
    },
    {
      key: isNaval ? 'food' : 'siege',
      icon: isNaval ? '/assets/icons/I_Food.png' : '/assets/icons/I_SiegePower.png',
      get label() { return isNaval ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.469.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.469.1"); },
      value: isNaval ? `-${fmt(derived.food, 1)}` : fmt(derived.siegePower, 1),
      color: isNaval ? 'var(--orange)' : 'var(--text-bright)',
      get title() { return isNaval ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.472.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.472.1"); },
      get body() { return isNaval ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.473.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.473.1"); },
    },
  ];

  return (
    <div className="tpl-totals-block">
      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.479.17')} />
      <div className="tpl-overview-grid">
        {stats.map(stat => (
          <Tooltip key={stat.key} content={{ title: stat.title, body: stat.body }} position="bottom" delay={200}>
            <div className="tpl-overview-stat">
              <img src={stat.icon} alt="" className="tpl-overview-stat-icon" />
              <span className="tpl-overview-stat-val" style={{ color: stat.color }}>{stat.value}</span>
              <span className="tpl-overview-stat-label">{stat.label}</span>
            </div>
          </Tooltip>
        ))}
      </div>
      <ResourceStrip resources={derived.resources} title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.491.18')} />
      <ResourceStrip resources={derived.monthlyResources} title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.492.19')} />
    </div>
  );
}

function UnitRow({
  unit,
  count,
  includesCore,
  unitById,
  onIncrement,
  onDecrement,
  onSwap,
  onRemove,
}: {
  unit: FormationTemplateUnitEntry;
  count: number;
  includesCore: boolean;
  unitById: Map<string, FormationTemplateUnitEntry>;
  onIncrement: () => void;
  onDecrement: () => void;
  onSwap: (fromId: string, toId: string) => void;
  onRemove: () => void;
}) {
  const upgrade = unit.upgradeUnitId ? unitById.get(unit.upgradeUnitId) : undefined;
  const downgrade = unit.downgradeUnitId ? unitById.get(unit.downgradeUnitId) : undefined;
  const strength = unit.maxStrength * count;
  const upkeep = unit.upkeep * count;

  return (
    <div className={`tpl-unit-row${includesCore ? ' tpl-unit-row--core' : ''}`}>
      <Tooltip content={{ afterLines: <UnitTooltip data={unitTooltipData(unit, count)} /> }} position="left" delay={200}>
        <img src={unitPortrait(unit)} alt="" className="tpl-unit-icon" />
      </Tooltip>
      <div className="tpl-unit-name-block">
        <div className="tpl-unit-name-row">
          <span className="tpl-unit-name">{unit.name}</span>
          {includesCore && (
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.530.20'), body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.530.21') }} position="bottom" delay={200}>
              <span className="tpl-core-badge"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.530.1" /></span>
            </Tooltip>
          )}
        </div>
        <div className="tpl-unit-type-row">
          <img src={unitTypeIcon(unit.type)} alt="" className="tpl-unit-cat-icon" />
          <span className="tpl-unit-type">{unitTypeLabel(unit.type)}</span>
          <TierBadge tier={unit.tier} />
        </div>
      </div>
      <Tooltip
        content={{
          title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.543.22'),
          get body() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.544.1", { Value1: fmt(count), Value2: webUIText(count === 1 ? 'Common.Unit' : 'Common.Units'), Value3: unit.name }); },
          lines: [
            { label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.546.23'), value: fmt(strength), valueColor: 'var(--green)' },
            { label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.547.24'), get value() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.547.1", { Value1: fmt(upkeep) }); }, valueColor: 'var(--red)' },
          ],
        }}
        position="left"
        delay={200}
      >
        <div className="tpl-stepper">
          <button type="button" className="tpl-step-btn" onMouseDown={onDecrement} aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25')}>-</button>
          <span className="tpl-step-count">{fmt(count)}</span>
          <button type="button" className="tpl-step-btn" onMouseDown={onIncrement} aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.556.26')}>+</button>
        </div>
      </Tooltip>
      <div className="tpl-unit-actions">
        {downgrade ? (
          <Tooltip content={{ get title() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.561.1", { Name: downgrade.name }); }, get body() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.561.2", { Name: unit.name, Name2: downgrade.name }); } }} position="left" delay={200}>
            <button type="button" className="tpl-unit-swap" onMouseDown={() => onSwap(unit.id, downgrade.id)} aria-label={webUIText("Auto.Attr.componentssidebarsFormationTemplateSidebar.562.1", { Name: downgrade.name })}>
              <img src="/assets/icons/I_UnitDemote.png" alt="" className="tpl-unit-action-icon" />
            </button>
          </Tooltip>
        ) : <span className="tpl-unit-action-spacer" />}
        {upgrade ? (
          <Tooltip content={{ get title() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.568.1", { Name: upgrade.name }); }, get body() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.568.2", { Name: unit.name, Name2: upgrade.name }); } }} position="left" delay={200}>
            <button type="button" className="tpl-unit-swap" onMouseDown={() => onSwap(unit.id, upgrade.id)} aria-label={webUIText("Auto.Attr.componentssidebarsFormationTemplateSidebar.569.1", { Name: upgrade.name })}>
              <img src="/assets/icons/I_UnitPromote.png" alt="" className="tpl-unit-action-icon" />
            </button>
          </Tooltip>
        ) : <span className="tpl-unit-action-spacer" />}
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.574.27'), get body() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.574.1", { Name: unit.name }); } }} position="left" delay={200}>
          <button type="button" className="tpl-unit-remove" onMouseDown={onRemove} aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.575.28')}>
            <img src="/assets/icons/I_Trash.png" alt="" className="tpl-unit-action-icon" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function Picker({
  availableClasses,
  currentCounts,
  onAdd,
  onCancel,
}: {
  availableClasses: Map<string, FormationTemplateUnitEntry[]>;
  currentCounts: Record<string, number>;
  onAdd: (unitId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const trimmedQuery = query.trim().toLowerCase();
  const queriedClasses = useMemo(() => (
    Array.from(availableClasses.entries())
      .map(([type, units]) => ({
        type,
        units: trimmedQuery.length === 0
          ? units
          : units.filter(unit => {
              const haystack = `${unit.name} ${unitTypeLabel(unit.type)} ${unit.description}`.toLowerCase();
              return haystack.includes(trimmedQuery);
            }),
      }))
      .filter(group => group.units.length > 0)
  ), [availableClasses, trimmedQuery]);
  const typeTabs = useMemo(() => ([
    {
      id: 'all',
      label: webUIText('Common.All'),
      icon: '/assets/icons/I_Template.png',
      count: queriedClasses.reduce((sum, group) => sum + group.units.length, 0),
    },
    ...queriedClasses.map(group => ({
      id: group.type,
      label: unitTypeLabel(group.type),
      icon: unitTypeIcon(group.type),
      count: group.units.length,
    })),
  ]), [queriedClasses]);
  const effectiveActiveType = typeTabs.some(tab => tab.id === activeType) ? activeType : 'all';
  const filteredClasses = useMemo(() => (
    effectiveActiveType === 'all'
      ? queriedClasses
      : queriedClasses.filter(group => group.type === effectiveActiveType)
  ), [effectiveActiveType, queriedClasses]);
  const visibleCount = filteredClasses.reduce((sum, group) => sum + group.units.length, 0);

  useEffect(() => {
    const engine = getRuntimeEngine();
    if (engine) {
      void Promise.resolve(engine.call('StrategySetWebUIMouseState', true, 'default'))
        .catch(error => acknowledgeBridgeFailure(error, 'StrategySetWebUIMouseState'));
    }

    return () => {
      const currentEngine = getRuntimeEngine();
      if (currentEngine) {
        void Promise.resolve(currentEngine.call('StrategySetWebUIMouseState', false, 'default'))
          .catch(error => acknowledgeBridgeFailure(error, 'StrategySetWebUIMouseState'));
      }
    };
  }, []);

  return createPortal(
    <div className="tpl-picker" onMouseDown={onCancel}>
      <div className="tpl-picker-dialog" onMouseDown={event => event.stopPropagation()}>
        <div className="tpl-picker-head">
          <div className="tpl-picker-title-block">
            <span className="tpl-picker-title"><WebUIText textKey="FormationTemplate.UnitCatalogue" /></span>
            <span className="tpl-picker-subtitle">{webUIText("Auto.Fix.Expr.componentssidebarsFormationTemplateSidebar.618.1", { Value1: fmt(visibleCount) })}</span>
          </div>
          <CloseButton size="sm" onClick={onCancel} />
        </div>
        <div className="tpl-picker-controls">
          <input
            className="search-input tpl-picker-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.627.29')}
            autoFocus
          />
        </div>
        <div className="tpl-picker-tabs">
          {typeTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`tpl-picker-tab${tab.id === effectiveActiveType ? ' tpl-picker-tab--active' : ''}`}
              onMouseDown={() => setActiveType(tab.id)}
            >
              <img src={tab.icon} alt="" className="tpl-picker-tab-icon" />
              <span className="tpl-picker-tab-label">{tab.label}</span>
              <span className="tpl-picker-tab-count">{fmt(tab.count)}</span>
            </button>
          ))}
        </div>
        <StyledScrollArea className="tpl-picker-body" viewportClassName="tpl-picker-body-viewport">
          {filteredClasses.length === 0 ? (
            <div className="tpl-picker-empty"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.632.3" /></div>
          ) : filteredClasses.map(({ type, units }) => (
            <div key={type} className="tpl-picker-section">
              <div className="tpl-picker-section-heading">
                <img src={unitTypeIcon(type)} alt="" className="tpl-picker-section-icon" />
                <span>{unitTypeLabel(type)}</span>
                <span>{fmt(units.length)}</span>
              </div>
              <div className="tpl-picker-list">
                {units.map(unit => {
                  const count = currentCounts[unit.id] ?? 0;
                  return (
                    <Tooltip key={unit.id} content={{ afterLines: <UnitTooltip data={unitTooltipData(unit, count)} /> }} position="left" delay={200}>
                      <button
                        type="button"
                        className="tpl-picker-row"
                        data-tutorial-target="DynamicUnit"
                        data-tutorial-unit-id={unit.id}
                        data-tutorial-unit-count={count}
                        onMouseDown={() => onAdd(unit.id)}
                      >
                        <img src={unitPortrait(unit)} alt="" className="tpl-picker-row-icon" />
                        <span className="tpl-picker-row-copy">
                          <strong>{unit.name}</strong>
                          <span>{webUIText("Auto.Fix.Expr.componentssidebarsFormationTemplateSidebar.650.1", { Value1: unitTypeLabel(unit.type), Value2: fmt(unit.tier) })}</span>
                        </span>
                        <span className="tpl-picker-row-stats">
                          <span>{webUIText("Auto.Fix.Expr.componentssidebarsFormationTemplateSidebar.653.1", { Value1: fmt(unit.maxStrength) })}</span>
                          <span>{webUIText("Auto.Fix.Expr.componentssidebarsFormationTemplateSidebar.654.1", { Value1: fmt(unit.price) })}</span>
                        </span>
                        <span className="tpl-picker-row-count">{count > 0 ? fmt(count) : '-'}</span>
                        <span className="tpl-picker-row-add">+</span>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </StyledScrollArea>
        <div className="tpl-picker-foot">
          <span>{webUIText("Auto.Fix.Expr.componentssidebarsFormationTemplateSidebar.667.1", { Value1: fmt(visibleCount) })}</span>
          <button type="button" className="tpl-picker-done" onMouseDown={onCancel}><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.667.4" /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AssignedForces({ forces, openForce }: { forces: FormationTemplateAssignedForce[]; openForce: (id: string) => void }) {
  return (
    <div className="tpl-force-list">
      {forces.length === 0 ? (
        <div className="tpl-empty"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.679.5" /></div>
      ) : forces.map(force => {
        const role = force.commanderName || force.rank || (force.isNavy ? webUIText("Auto.Fix.ExprFallbackTrue.componentssidebarsFormationTemplateSidebar.685.1") : webUIText("Auto.Fix.ExprFallbackFalse.componentssidebarsFormationTemplateSidebar.685.1"));
        return (
          <button key={force.id} type="button" className="tpl-force-row" onMouseDown={() => openForce(force.id)}>
            <span className="tpl-force-line tpl-force-line--primary">
              <span className="tpl-force-name">{force.name}</span>
              <span className="tpl-force-strength">{`${fmt(force.strength)}/${fmt(force.maxStrength)}`}</span>
            </span>
            <span className="tpl-force-line tpl-force-line--secondary">
              <span className="tpl-force-role">{role}</span>
              <span className="tpl-force-location">{force.location || force.rank}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CombatTab({
  draft,
  unitById,
  derived,
  onAddBattleGroup,
  onRemoveBattleGroup,
  onSetBattleGroupUnitCount,
}: {
  draft: DraftTemplate;
  unitById: Map<string, FormationTemplateUnitEntry>;
  derived: DerivedTotals;
  onAddBattleGroup: (role: BattleFormationRole) => void;
  onRemoveBattleGroup: (groupId: string) => void;
  onSetBattleGroupUnitCount: (groupId: string, unitId: string, count: number) => void;
}) {
  const roleEntries = compositionRequests(draft)
    .map(request => ({ request, unit: unitById.get(request.unitId) }))
    .filter((entry): entry is { request: SaveFormationTemplateUnitRequest; unit: FormationTemplateUnitEntry } => Boolean(entry.unit))
    .reduce((roles, entry) => {
      const label = unitTypeLabel(entry.unit.type);
      const current = roles.get(label) ?? { strength: 0, icon: unitTypeIcon(entry.unit.type) };
      current.strength += entry.unit.maxStrength * entry.request.count;
      roles.set(label, current);
      return roles;
    }, new Map<string, { strength: number; icon: string }>());

  const totalRoleStrength = Array.from(roleEntries.values()).reduce((sum, role) => sum + role.strength, 0) || 1;
  const unassignedUnits = compositionRequests(draft)
    .map(request => ({ unit: unitById.get(request.unitId), count: unassignedUnitCount(draft, request.unitId) }))
    .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);
  const hasUnassignedMelee = unassignedUnits.some(entry => battleFormationRole(entry.unit) === 'melee');
  const hasUnassignedRanged = unassignedUnits.some(entry => battleFormationRole(entry.unit) === 'ranged');

  return (
    <div className="tpl-combat">
      <SectionHeading variant="ornate" title={webUIText('FormationTemplate.BattlePlan.Title')} />
      <div className="tpl-battle-group-toolbar">
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewMeleeGroup')}>
          <button
            type="button"
            className="tpl-battle-group-add tpl-battle-group-add--icon"
            onMouseDown={() => onAddBattleGroup('melee')}
            disabled={!hasUnassignedMelee}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewMeleeGroup')}
          >
            <img src="/assets/icons/I_Plus.png" alt="" className="tpl-battle-group-add-icon" />
            <img src="/assets/icons/I_Swords.png" alt="" className="tpl-battle-group-add-icon" />
          </button>
        </Tooltip>
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewRangedGroup')}>
          <button
            type="button"
            className="tpl-battle-group-add tpl-battle-group-add--icon"
            onMouseDown={() => onAddBattleGroup('ranged')}
            disabled={!hasUnassignedRanged}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewRangedGroup')}
          >
            <img src="/assets/icons/I_Plus.png" alt="" className="tpl-battle-group-add-icon" />
            <img src="/assets/icons/UnitTypes/Ranged.png" alt="" className="tpl-battle-group-add-icon" />
          </button>
        </Tooltip>
      </div>
      <div className="tpl-battle-group-list">
        {draft.battleGroups.length === 0 ? (
          <div className="tpl-empty tpl-empty--plain"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroups" /></div>
        ) : draft.battleGroups.map((group, index) => {
          const groupCount = battleGroupUnitCount(group);
          const roleIcon = group.role === 'ranged' ? '/assets/icons/UnitTypes/Ranged.png' : '/assets/icons/I_Swords.png';
          const roleTitle = group.role === 'ranged'
            ? webUIText('FormationTemplate.BattlePlan.RangedTitle')
            : webUIText('FormationTemplate.BattlePlan.MeleeTitle');
          const compatibleUnassigned = unassignedUnits.filter(entry => battleFormationRole(entry.unit) === group.role);
          const groupUnits = orderedBattleGroupUnitIds(group)
            .map(unitId => ({ unit: unitById.get(unitId), count: group.counts[unitId] ?? 0 }))
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);

          return (
            <div key={group.id} className="tpl-battle-group">
              <div className="tpl-battle-group-head">
                <img src={roleIcon} alt="" className="tpl-battle-group-icon" />
                <span className="tpl-battle-group-title">{webUIText('FormationTemplate.BattlePlan.GroupTitle', { Role: roleTitle, Index: fmt(index + 1) })}</span>
                <span className={`tpl-battle-group-count${groupCount > MAX_BATTLE_FORMATION_SIZE ? ' tpl-battle-group-count--bad' : ''}`}>{`${fmt(groupCount)} / ${fmt(MAX_BATTLE_FORMATION_SIZE)}`}</span>
                <button type="button" className="tpl-unit-remove" onMouseDown={() => onRemoveBattleGroup(group.id)} aria-label={webUIText('FormationTemplate.BattlePlan.RemoveGroup')}>
                  <img src="/assets/icons/I_Trash.png" alt="" className="tpl-unit-action-icon" />
                </button>
              </div>
              <div className="tpl-battle-group-units">
                {groupUnits.length === 0 ? (
                  <div className="tpl-empty tpl-empty--plain"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroup" /></div>
                ) : groupUnits.map(({ unit, count }) => {
                  const assignedElsewhere = groupAssignedCountExcluding(draft, unit.id, group.id);
                  const availableForGroup = Math.max(0, (draft.counts[unit.id] ?? 0) - assignedElsewhere);
                  const groupRoom = MAX_BATTLE_FORMATION_SIZE - groupCount;
                  const canIncrement = count < availableForGroup && groupRoom > 0;
                  return (
                    <div key={unit.id} className="tpl-battle-group-unit">
                      <img src={unitPortrait(unit)} alt="" className="tpl-battle-group-unit-icon" />
                      <span className="tpl-battle-group-unit-name">{unit.name}</span>
                      <div className="tpl-stepper">
                        <button type="button" className="tpl-step-btn" onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, count - 1)}>-</button>
                        <span className="tpl-step-count">{fmt(count)}</span>
                        <button type="button" className="tpl-step-btn" onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, count + 1)} disabled={!canIncrement}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {compatibleUnassigned.length > 0 && groupCount < MAX_BATTLE_FORMATION_SIZE && (
                <div className="tpl-battle-group-add-list">
                  {compatibleUnassigned.map(({ unit, count }) => (
                    <button key={unit.id} type="button" className="tpl-battle-group-add-unit" onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, (group.counts[unit.id] ?? 0) + 1)}>
                      <img src={unitPortrait(unit)} alt="" className="tpl-battle-group-add-unit-icon" />
                      <span>{unit.name}</span>
                      <span>{fmt(count)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {unassignedUnits.length > 0 && (
        <div className="tpl-battle-unassigned">
          <span className="tpl-battle-unassigned-title"><WebUIText textKey="FormationTemplate.BattlePlan.Unassigned" /></span>
          {unassignedUnits.map(({ unit, count }) => (
            <span key={unit.id} className="tpl-battle-unassigned-item">{`${unit.name} ${fmt(count)}`}</span>
          ))}
        </div>
      )}

      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.713.30')} />
      <div className="tpl-bars">
        {([
          ['Pierce', derived.avgPierce, 35, 'red', '/assets/icons/I_Damage_Pierce.png'],
          ['Crush', derived.avgCrush, 45, 'red', '/assets/icons/I_Damage_Crush.png'],
          ['Slash', derived.avgSlash, 35, 'red', '/assets/icons/I_Damage_Slash.png'],
        ] as [string, number, number, 'red', string][]).map(([label, value, max, colour, icon]) => (
          <div key={label} className="tpl-bar-row">
            <img src={icon} alt="" className="tpl-bar-icon" />
            <span className="tpl-bar-label">{label}</span>
            <PaintedBar percent={max > 0 ? Math.min(100, (value / max) * 100) : 0} color={colour} className="tpl-bar-bar" />
            <span className="tpl-bar-val">{fmt(value)}</span>
          </div>
        ))}
      </div>

      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.729.31')} />
      <div className="tpl-bars">
        {([
          ['Pierce', derived.avgPierceArmour, 20, 'gold', '/assets/icons/I_Armour_Pierce.png'],
          ['Crush', derived.avgCrushArmour, 20, 'gold', '/assets/icons/I_Armour_Crush.png'],
          ['Slash', derived.avgSlashArmour, 20, 'gold', '/assets/icons/I_Armour_Slash.png'],
        ] as [string, number, number, 'gold', string][]).map(([label, value, max, colour, icon]) => (
          <div key={label} className="tpl-bar-row">
            <img src={icon} alt="" className="tpl-bar-icon" />
            <span className="tpl-bar-label">{label}</span>
            <PaintedBar percent={max > 0 ? Math.min(100, (value / max) * 100) : 0} color={colour} className="tpl-bar-bar" />
            <span className="tpl-bar-val">{fmt(value)}</span>
          </div>
        ))}
      </div>

      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.745.32')} />
      <div className="tpl-role-mix">
        {roleEntries.size === 0 ? (
          <div className="tpl-empty tpl-empty--plain"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.747.6" /></div>
        ) : Array.from(roleEntries.entries()).map(([label, role]) => (
          <div key={label} className="tpl-bar-row">
            <img src={role.icon} alt="" className="tpl-bar-icon" />
            <span className="tpl-bar-label">{label}</span>
            <PaintedBar percent={(role.strength / totalRoleStrength) * 100} color="gold" className="tpl-bar-bar" />
            <span className="tpl-bar-val">{`${fmt((role.strength / totalRoleStrength) * 100)}%`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FormationTemplateSidebar: React.FC<FormationTemplateSidebarProps> = ({ sidebarId, onClose }) => {
  const data = useFormationTemplatesBridge();
  const { openSidebar } = useGameActions();
  const templates = useMemo(() => data?.templates ?? [], [data]);
  const assignmentTargetId = sidebarId && sidebarId.startsWith('assign:')
    ? decodeSidebarToken(sidebarId.slice('assign:'.length))
    : null;
  const newTemplateType = newTemplateTypeFromSidebarId(sidebarId);
  const requestedTemplateId = sidebarId && sidebarId.startsWith('rename:')
    ? decodeSidebarToken(sidebarId.slice('rename:'.length))
    : sidebarId && !sidebarId.startsWith('assign:') && !newTemplateType
      ? sidebarId
      : null;
  const shouldStartRenaming = Boolean(sidebarId && sidebarId.startsWith('rename:'));
  const assignmentTarget = useMilitary(assignmentTargetId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftTemplate>(() => emptyDraft('land'));
  const [baseline, setBaseline] = useState<DraftTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateTab>('composition');
  const [renaming, setRenaming] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const assignmentTemplateType = assignmentTarget ? (assignmentTarget.isNavy ? 'naval' : 'land') : null;
  const templatesForMode = useMemo(() => (
    assignmentTemplateType
      ? templates.filter(template => normaliseTemplateType(template.type) === assignmentTemplateType)
      : templates
  ), [assignmentTemplateType, templates]);

  const selected = templatesForMode.find(template => template.id === selectedId)
    ?? templatesForMode.find(template => template.id === baseline?.templateId)
    ?? null;

  useEffect(() => {
    if (newTemplateType) {
      const timer = window.setTimeout(() => {
        setSelectedId(null);
        setDraft(emptyDraft(newTemplateType));
        setBaseline(null);
        setRenaming(true);
        setPickerOpen(false);
        setMessage('');
        setConfirmDeleteId(null);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (assignmentTargetId && !assignmentTarget) return;

    const requested = requestedTemplateId ? templatesForMode.find(template => template.id === requestedTemplateId) : null;
    const next = requested ?? (baseline ? null : templatesForMode[0] ?? null);

    if (!next) {
      if (assignmentTemplateType && !baseline) {
        const timer = window.setTimeout(() => {
          setSelectedId(null);
          setDraft(emptyDraft(assignmentTemplateType));
          setBaseline(null);
          setRenaming(true);
          setPickerOpen(false);
          setMessage('');
          setConfirmDeleteId(null);
        }, 0);

        return () => window.clearTimeout(timer);
      }
      return;
    }

    if (next.id === baseline?.templateId) {
      if (!shouldStartRenaming) return;

      const timer = window.setTimeout(() => {
        setRenaming(true);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      const nextDraft = buildDraft(next);
      setSelectedId(next.id);
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setRenaming(shouldStartRenaming);
      setPickerOpen(false);
      setMessage('');
      setConfirmDeleteId(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [assignmentTarget, assignmentTargetId, assignmentTemplateType, baseline, newTemplateType, requestedTemplateId, shouldStartRenaming, templatesForMode]);

  const landCatalogue = data?.landUnitCatalogue ?? EMPTY_UNIT_CATALOGUE;
  const navalCatalogue = data?.navalUnitCatalogue ?? EMPTY_UNIT_CATALOGUE;
  const catalogue = draft.type === 'naval' ? navalCatalogue : landCatalogue;

  const unitById = useMemo(() => {
    const map = new Map<string, FormationTemplateUnitEntry>();
    landCatalogue.forEach(unit => map.set(unit.id, unit));
    navalCatalogue.forEach(unit => map.set(unit.id, unit));
    selected?.units.forEach(unit => {
      const catalogueUnit = map.get(unit.id);
      map.set(unit.id, catalogueUnit ? { ...catalogueUnit, count: unit.count, includesCore: unit.includesCore } : unit);
    });
    return map;
  }, [landCatalogue, navalCatalogue, selected]);

  const availableClasses = useMemo(() => {
    const groups = new Map<string, FormationTemplateUnitEntry[]>();
    catalogue.forEach(unit => {
      const group = unit.type || 'other';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(unit);
    });
    return groups;
  }, [catalogue]);

  const visibleUnits = useMemo(() => (
    compositionRequests(draft)
      .map((request, index) => ({
        request,
        unit: unitById.get(request.unitId),
        includesCore: index === 0,
      }))
      .filter((entry): entry is { request: SaveFormationTemplateUnitRequest; unit: FormationTemplateUnitEntry; includesCore: boolean } => Boolean(entry.unit))
  ), [draft, unitById]);

  const derived = useMemo(() => computeDerived(draft, unitById), [draft, unitById]);
  const iconProfile = useMemo(() => getFormationTemplateIcon(
    draft.type,
    visibleUnits.map(entry => ({ ...entry.unit, count: entry.request.count })),
    draft.iconId,
  ), [draft.iconId, draft.type, visibleUnits]);
  const isDirty = !draftsEqual(draft, baseline);
  const unitCount = draftUnitCount(draft);
  const isNaval = draft.type === 'naval';
  const typeIcon = iconProfile.icon;
  const headerImage = isNaval ? '/assets/events/naval-battle.png' : '/assets/events/cavalry-charge.png';
  const headerTint = iconProfile.tint;
  const selectedSiblings = templatesForMode.filter(template => normaliseTemplateType(template.type) === draft.type);
  const selectedIndex = selectedSiblings.findIndex(template => template.id === selected?.id);
  const canSave = isDirty && draft.name.trim().length > 0 && unitCount > 0 && battleGroupsValid(draft, unitById) && (!selected || selected.canEdit);
  const canApply = Boolean(selected && !isDirty && selected.canApply);
  const canAssign = Boolean(assignmentTarget && selected && !isDirty && normaliseTemplateType(selected.type) === assignmentTemplateType);
  const assignButtonLabel = assignmentTarget
    ? webUIText('FormationTemplate.AssignButton', { Name: assignmentTarget.name })
    : webUIText('Common.Assign');

  const loadTemplate = (template: FormationTemplateEntry) => {
    const nextDraft = buildDraft(template);
    setSelectedId(template.id);
    setDraft(nextDraft);
    setBaseline(nextDraft);
    setRenaming(false);
    setPickerOpen(false);
    setMessage('');
    setConfirmDeleteId(null);
  };

  const beginCreate = () => {
    setSelectedId(null);
    setDraft(emptyDraft(assignmentTemplateType ?? draft.type));
    setBaseline(null);
    setRenaming(true);
    setPickerOpen(false);
    setMessage('');
    setConfirmDeleteId(null);
  };

  const gotoSibling = (delta: number) => {
    if (selectedSiblings.length === 0) return;
    const index = selectedIndex >= 0 ? selectedIndex : 0;
    const next = selectedSiblings[(index + delta + selectedSiblings.length) % selectedSiblings.length];
    if (!assignmentTargetId) {
      openSidebar('template', next.id);
    }
    loadTemplate(next);
  };

  const updateCount = (unitId: string, count: number) => {
    setDraft(current => {
      const previousCount = current.counts[unitId] ?? 0;
      const nextCount = Math.max(0, count);
      const counts = { ...current.counts, [unitId]: nextCount };
      if (nextCount === 0) delete counts[unitId];
      const order = current.order.includes(unitId) ? current.order : [...current.order, unitId];
      const battleGroups = nextCount < previousCount
        ? removeUnitsFromBattleGroups(current.battleGroups, unitId, previousCount - nextCount)
        : current.battleGroups;
      return { ...current, counts, order: order.filter(id => (counts[id] ?? 0) > 0), battleGroups };
    });
  };

  const swapUnit = (fromId: string, toId: string) => {
    setDraft(current => {
      const fromCount = current.counts[fromId] ?? 0;
      if (fromCount <= 0) return current;

      const counts = { ...current.counts };
      delete counts[fromId];
      counts[toId] = (counts[toId] ?? 0) + fromCount;

      const order = current.order
        .map(id => (id === fromId ? toId : id))
        .filter((id, index, ids) => ids.indexOf(id) === index);
      if (!order.includes(toId)) order.push(toId);

      const battleGroups = removeUnitsFromBattleGroups(current.battleGroups, fromId, fromCount);
      return { ...current, counts, order, battleGroups };
    });
  };

  const clearComposition = () => {
    setDraft(current => ({ ...current, counts: {}, order: [], battleGroups: [] }));
    setPickerOpen(false);
    setMessage('');
  };

  const addBattleGroup = (role: BattleFormationRole) => {
    setDraft(current => {
      const hasCompatibleUnassigned = compositionRequests(current)
        .some(request => {
          const unit = unitById.get(request.unitId);
          return unit ? unassignedUnitCount(current, request.unitId) > 0 && battleFormationRole(unit) === role : false;
        });
      if (!hasCompatibleUnassigned) return current;

      const group: DraftBattleGroup = {
        id: createBattleGroupId(),
        role,
        counts: {},
        order: [],
      };
      return { ...current, battleGroups: [...current.battleGroups, group] };
    });
  };

  const removeBattleGroup = (groupId: string) => {
    setDraft(current => ({
      ...current,
      battleGroups: current.battleGroups.filter(group => group.id !== groupId),
    }));
  };

  const setBattleGroupUnitCount = (groupId: string, unitId: string, count: number) => {
    const unit = unitById.get(unitId);
    if (!unit) return;

    setDraft(current => {
      const battleGroups = current.battleGroups.map(group => {
        if (group.id !== groupId || group.role !== battleFormationRole(unit)) return group;

        const currentCount = group.counts[unitId] ?? 0;
        const assignedElsewhere = groupAssignedCountExcluding(current, unitId, groupId);
        const availableForGroup = Math.max(0, (current.counts[unitId] ?? 0) - assignedElsewhere);
        const groupRoom = MAX_BATTLE_FORMATION_SIZE - battleGroupUnitCount(group) + currentCount;
        const nextCount = Math.max(0, Math.min(count, availableForGroup, groupRoom));
        const counts = { ...group.counts };
        let order = group.order.includes(unitId) ? [...group.order] : [...group.order, unitId];

        if (nextCount > 0) {
          counts[unitId] = nextCount;
        } else {
          delete counts[unitId];
          order = order.filter(id => id !== unitId);
        }

        return { ...group, counts, order };
      });

      return { ...current, battleGroups };
    });
  };

  const saveDraft = () => {
    if (!canSave) return;

    const savedDraft = {
      ...draft,
      name: draft.name.trim(),
    };

    const iconId = savedDraft.iconId || iconProfile.kind;

    void saveFormationTemplateBridge({
      templateId: savedDraft.templateId,
      name: savedDraft.name,
      iconId,
      type: savedDraft.type,
      battleGroups: battleGroupRequests(savedDraft),
      units: compositionRequests(savedDraft),
    }).then(response => {
      setMessage(response.message);
      if (!response.saved) return;

      const nextDraft = { ...savedDraft, templateId: response.templateId, name: response.templateName, iconId };
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setSelectedId(response.templateId);
      if (!savedDraft.templateId && newTemplateType) {
        openSidebar('template', response.templateId);
      }
      setRenaming(false);
      setPickerOpen(false);
      setConfirmDeleteId(null);
    });
  };

  const duplicateTemplate = () => {
    const copyName = draft.name.trim() || templateTypeName(draft.type);
    const copiedDraft = { ...draft, templateId: '', name: copyName };
    const iconId = copiedDraft.iconId || iconProfile.kind;
    void saveFormationTemplateBridge({
      templateId: '',
      name: copiedDraft.name,
      iconId,
      type: copiedDraft.type,
      battleGroups: battleGroupRequests(copiedDraft),
      units: compositionRequests(copiedDraft),
    }).then(response => {
      setMessage(response.message);
      if (!response.saved) return;

      const nextDraft = { ...copiedDraft, templateId: response.templateId, name: response.templateName, iconId };
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setSelectedId(response.templateId);
      setConfirmDeleteId(null);
    });
  };

  const deleteTemplate = () => {
    if (!selected) return;
    if (confirmDeleteId !== selected.id) {
      setConfirmDeleteId(selected.id);
      setMessage(webUIText('FormationTemplate.DeleteConfirmMessage'));
      return;
    }

    void deleteFormationTemplateBridge(selected.id).then(response => {
      setMessage(response.message);
      setConfirmDeleteId(null);
      if (!response.deleted) return;

      const next = templatesForMode.find(template => template.id !== selected.id && normaliseTemplateType(template.type) === draft.type)
        ?? templatesForMode.find(template => template.id !== selected.id)
        ?? null;
      if (next) {
        loadTemplate(next);
      } else {
        setSelectedId(null);
        setDraft(emptyDraft(draft.type));
        setBaseline(null);
      }
    });
  };

  const applySelected = () => {
    if (!selected || !canApply) return;
    void applyFormationTemplateBridge(selected.id).then(response => setMessage(response.message));
  };

  const assignSelected = () => {
    if (!assignmentTarget || !selected || !canAssign) return;
    void setMilitaryFormationTemplateBridge(assignmentTarget.id, selected.id).then(() => {
      setMessage(webUIText('FormationTemplate.AssignSuccess', { Template: selected.name, Name: assignmentTarget.name }));
      openSidebar('military', assignmentTarget.id);
    }).catch(error => {
      acknowledgeBridgeFailure(error, 'game.set_military_formation_template');
      setMessage(webUIText('FormationTemplate.AssignFailed'));
    });
  };

  const revertDraft = () => {
    if (!baseline) return;
    setDraft(baseline);
    setRenaming(false);
    setPickerOpen(false);
    setMessage('');
    setConfirmDeleteId(null);
  };

  return (
    <div className="sidebar sidebar--right sidebar--visible tpl-sidebar">
      <SidebarToolbar
        navButtons={[
          { icon: '/assets/icons/I_NavPrevious.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1047.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1047.2'); }, onClick: () => gotoSibling(-1), disabled: selectedSiblings.length <= 1 },
          { icon: '/assets/icons/I_NavNext.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1048.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1048.3'); }, onClick: () => gotoSibling(1), disabled: selectedSiblings.length <= 1 },
        ]}
        actionButtons={[
          ...(assignmentTarget ? [{
            icon: '/assets/icons/I_Template.png',
            get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1053.1"); },
            get tooltipBody() { return selected ? webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.4', { Name: assignmentTarget.name }) : webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.5'); },
            onClick: assignSelected,
            disabled: !canAssign,
          }] : []),
          { icon: typeIcon, get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1058.1"); }, get tooltipBody() { return selected?.applyReason || webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1058.6'); }, onClick: applySelected, disabled: !canApply },
          { icon: '/assets/icons/I_NewTemplate.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1059.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1059.7'); }, onClick: beginCreate },
          { icon: '/assets/icons/I_DuplicateTemplate.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1060.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1060.8'); }, onClick: duplicateTemplate, disabled: unitCount === 0 },
          { icon: '/assets/icons/DeselectAll.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1061.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1061.9'); }, onClick: clearComposition, disabled: unitCount === 0 },
          { icon: '/assets/icons/I_Close.png', get tooltip() { return confirmDeleteId === selected?.id ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.1062.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.1062.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1062.10'); }, onClick: deleteTemplate, disabled: !selected?.canDelete },
        ]}
        onClose={onClose}
        closePosition="start"
      />

      <div className="tpl-header">
        <img src={headerImage} alt="" className="tpl-header-bg" />
        <div className="tpl-header-scrim" style={{ '--template-tint': headerTint } as React.CSSProperties} />
        <div className="tpl-header-content">
          <Tooltip content={{ title: templateKind(draft.type), get body() { return isNaval ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.1072.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.1072.1"); } }} position="bottom" delay={200}>
            <div className="tpl-header-roundel">
              <img src={typeIcon} alt="" className="tpl-header-type-icon" />
            </div>
          </Tooltip>
          <div className="tpl-header-info">
            <div className="tpl-header-name-row">
              {renaming ? (
                <input
                  className="tpl-header-name-input"
                  autoFocus
                  value={draft.name}
                  onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
                  onBlur={() => {
                    setDraft(current => ({ ...current, name: current.name.trim() }));
                    setRenaming(false);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenaming(false);
                  }}
                  maxLength={64}
                />
              ) : (
                <button type="button" className="tpl-header-name-btn" onMouseDown={() => setRenaming(true)}>
                  <span className="tpl-header-name">{draft.name || webUIText("Auto.Fix.ExprFallback.componentssidebarsFormationTemplateSidebar.1097.1")}</span>
                  <img src="/assets/icons/I_Rename.png" alt="" className="tpl-header-edit-pencil" />
                </button>
              )}
            </div>
            <div className="tpl-header-status-row">
              <Badge text={templateKind(draft.type)} colour="var(--gold)" />
              {selected?.isActiveBuildTemplate && <Badge text={webUIText('Auto.ExtraAttr.ComponentsSidebarsFormationTemplateSidebar.1104.1')} colour="var(--green)" />}
              {isDirty && <Badge text={webUIText('Auto.ExtraAttr.ComponentsSidebarsFormationTemplateSidebar.1105.2')} colour="var(--orange)" />}
            </div>
            <div className="tpl-header-meta-row">
              <img src={typeIcon} alt="" className="tpl-header-meta-icon" />
              <span className="tpl-header-meta-text">{webUIText('Common.CountWithUnit', { Count: fmt(unitCount), Unit: webUIText(unitCount === 1 ? 'Common.Unit' : 'Common.Units') })}</span>
            </div>
          </div>
        </div>
      </div>

      <SidebarTabBar
        tabs={[{ id: 'composition', label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1116.33') }, { id: 'combat', label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1116.34') }]}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as TemplateTab)}
      />

      <StyledScrollArea className="sidebar-content sidebar-content--textured tpl-content">
        {activeTab === 'composition' ? (
          <div className="tpl-composition">
            <TotalsBlock derived={derived} isNaval={isNaval} />
            {assignmentTarget && (
              <div className="tpl-assignment-panel">
                <img src="/assets/icons/I_Template.png" alt="" className="tpl-assignment-icon" />
                <span className="tpl-assignment-copy">
                  <span className="tpl-assignment-title"><WebUIText textKey="FormationTemplate.AssignModeTitle" /></span>
                  <span className="tpl-assignment-body">{webUIText('FormationTemplate.AssignModeBody', { Name: assignmentTarget.name })}</span>
                </span>
              </div>
            )}
            {message && <div className="tpl-status">{message}</div>}
            {selected?.applyReason && <div className="tpl-status tpl-status--warning">{selected.applyReason}</div>}

            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.1128.35')} />
            {visibleUnits.length === 0 ? (
              <div className="tpl-empty"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.1129.7" /></div>
            ) : (
              <div className="tpl-unit-list">
                {visibleUnits.map(({ request, unit, includesCore }) => (
                  <UnitRow
                    key={unit.id}
                    unit={unit}
                    count={request.count}
                    includesCore={includesCore}
                    unitById={unitById}
                    onIncrement={() => updateCount(unit.id, request.count + 1)}
                    onDecrement={() => updateCount(unit.id, request.count - 1)}
                    onSwap={swapUnit}
                    onRemove={() => updateCount(unit.id, 0)}
                  />
                ))}
              </div>
            )}

            <button type="button" className="tpl-add-unit" onMouseDown={() => setPickerOpen(true)}>
              <img src="/assets/icons/I_NewTemplate.png" alt="" className="tpl-add-unit-icon" />
              <span className="tpl-add-unit-label"><WebUIText textKey="FormationTemplate.ChooseUnits" /></span>
            </button>

            {selected && (
              <>
                <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.1156.36')} />
                <AssignedForces forces={selected.assignedForces} openForce={id => openSidebar('military', id)} />
              </>
            )}
          </div>
        ) : (
          <CombatTab
            draft={draft}
            unitById={unitById}
            derived={derived}
            onAddBattleGroup={addBattleGroup}
            onRemoveBattleGroup={removeBattleGroup}
            onSetBattleGroupUnitCount={setBattleGroupUnitCount}
          />
        )}
      </StyledScrollArea>

      {pickerOpen && (
        <Picker
          availableClasses={availableClasses}
          currentCounts={draft.counts}
          onAdd={unitId => updateCount(unitId, (draft.counts[unitId] ?? 0) + 1)}
          onCancel={() => setPickerOpen(false)}
        />
      )}

      <div className="tpl-footer">
        {assignmentTarget && (
          <button type="button" className="tpl-footer-btn tpl-footer-btn--assign" onMouseDown={assignSelected} disabled={!canAssign}>
            {assignButtonLabel}
          </button>
        )}
        {selected && !assignmentTarget && (
          <button type="button" className="tpl-footer-btn tpl-footer-btn--danger" onMouseDown={deleteTemplate} disabled={!selected.canDelete}>
            {confirmDeleteId === selected.id ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.1062.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.1062.1")}
          </button>
        )}
        <button type="button" className="tpl-footer-btn tpl-footer-btn--secondary" onMouseDown={revertDraft} disabled={!isDirty || !baseline}>
          <WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.1176.9" />
        </button>
        <button type="button" className="tpl-footer-btn tpl-footer-btn--primary" onMouseDown={saveDraft} disabled={!canSave}>
          {isDirty ? webUIText("Auto.Fix.ExprTrue.componentssidebarsFormationTemplateSidebar.1180.1") : baseline ? webUIText("Auto.Fix.ExprFalseTrue.componentssidebarsFormationTemplateSidebar.1180.1") : webUIText("Auto.Fix.ExprFalseFalse.componentssidebarsFormationTemplateSidebar.1180.1", { Value1: templateTypeName(draft.type) })}
        </button>
      </div>
    </div>
  );
};

export default React.memo(FormationTemplateSidebar);

registerSidebar({
  id: 'template',
  side: 'right',
  component: FormationTemplateSidebar,
});

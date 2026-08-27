import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from '../../common/buttons/CloseButton';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import ModalDragHandle from '../../common/layout/shell/ModalDragHandle';
import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import ResourceLink from '../../common/resources/ResourceLink';
import { useDraggableOffset } from '../../../hooks/useDraggableOffset';
import type {
  FormationTemplateAssignedForce,
  FormationTemplateUnitEntry,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import { TIER_ICONS } from '../../../utils/iconMaps';
import {
  battleFormationDisplayName,
  battleFormationRoleIcon,
  newBattleFormationTooltip,
} from '../../../utils/battleFormationNaming';
import {
  stepAmountFromEvent,
  stepAmountFromMultiplier,
  stepButtonLabel,
  useStepMultiplier,
} from '../../../utils/stepModifiers';
import { useSettingsBridge } from '../../../bridge/app/useSettingsBridge';
import { formatActionBinding, stepModifiersHelpText } from '../../../utils/actionBindings';
import {
  battleFormationRole,
  battleGroupUnitCount,
  compositionRequests,
  fmt,
  groupAssignedCountExcluding,
  orderedBattleGroupUnitIds,
  resourceAmount,
  resourceIcon,
  unitPortrait,
  unitTooltipData,
  unitTypeIcon,
  unitTypeLabel,
  unassignedUnitCount,
  type BattleFormationRole,
  type DerivedTotals,
  type DraftTemplate,
  type ResourceTotal,
} from './FormationTemplateDraftModel';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';

export function TierBadge({ tier }: { tier: number }) {
  return <img src={TIER_ICONS[tier] || TIER_ICONS[1]} alt={webUIText("Auto.Attr.componentssidebarsFormationTemplateSidebar.384.1", { Value1: fmt(tier) })} className="tpl-tier-badge" />;
}

export function ResourceStrip({ resources, title }: { resources: ResourceTotal[]; title: string }) {
  if (resources.length === 0) return null;
  return (
    <div className="tpl-resource-strip">
      {resources.map(resource => (
        <Tooltip
          key={resource.name}
          position="bottom"
          delay={150}
          content={{
            title: resource.displayName,
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
          <ResourceLink resourceId={resource.name} className="tpl-resource-pill">
            <img src={resourceIcon(resource.name)} alt="" className="tpl-resource-icon" />
            <span className="tpl-resource-amt">{resourceAmount(resource.amount)}</span>
          </ResourceLink>
        </Tooltip>
      ))}
    </div>
  );
}

export function TotalsBlock({ derived, isNaval }: { derived: DerivedTotals; isNaval: boolean }) {
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
      get label() { return isNaval ? webUIText("FormationTemplateSidebar.Food") : webUIText("FormationTemplateSidebar.Siege"); },
      value: isNaval ? `-${fmt(derived.food, 1)}` : fmt(derived.siegePower, 1),
      color: isNaval ? 'var(--orange)' : 'var(--text-bright)',
      get title() { return isNaval ? webUIText("FormationTemplateSidebar.MonthlyFood") : webUIText("FormationTemplateSidebar.SiegePower"); },
      get body() { return isNaval ? webUIText("FormationTemplateSidebar.MonthlyFoodBody") : webUIText("FormationTemplateSidebar.SiegePowerBody"); },
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

export function UnitRow({
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
  onIncrement: (delta: number) => void;
  onDecrement: (delta: number) => void;
  onSwap: (fromId: string, toId: string) => void;
  onRemove: () => void;
}) {
  const upgrade = unit.upgradeUnitId ? unitById.get(unit.upgradeUnitId) : undefined;
  const downgrade = unit.downgradeUnitId ? unitById.get(unit.downgradeUnitId) : undefined;
  const strength = unit.maxStrength * count;
  const upkeep = unit.upkeep * count;
  const { settings } = useSettingsBridge();
  const batchKey = formatActionBinding(settings?.controls, 'IncreaseUnitProduction');
  const stepModifiersBody = stepModifiersHelpText(webUIText, batchKey);
  const stepMultiplier = useStepMultiplier();
  const effectiveStep = stepAmountFromMultiplier(stepMultiplier);
  const decrementLabel = stepButtonLabel(-1, effectiveStep);
  const incrementLabel = stepButtonLabel(1, effectiveStep);

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
          <img src={unitTypeIcon(unit.type, unit.category)} alt="" className="tpl-unit-cat-icon" />
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
          footer: stepModifiersBody,
        }}
        position="left"
        delay={200}
      >
        <div className="tpl-stepper">
          <button
            type="button"
            className="tpl-step-btn"
            onClick={(event) => {
              event.preventDefault();
              onDecrement(stepAmountFromEvent(event));
            }}
            aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25')}
          >
            {decrementLabel}
          </button>
          <span className="tpl-step-count">{fmt(count)}</span>
          <button
            type="button"
            className="tpl-step-btn"
            onClick={(event) => {
              event.preventDefault();
              onIncrement(stepAmountFromEvent(event));
            }}
            aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.556.26')}
          >
            {incrementLabel}
          </button>
        </div>
      </Tooltip>
      <div className="tpl-unit-actions">
        {downgrade ? (
          <Tooltip content={{ get title() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.561.1", { Name: downgrade.name }); }, get body() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.561.2", { Name: unit.name, Name2: downgrade.name }); } }} position="left" delay={200}>
            <button type="button" className="tpl-unit-swap" onClick={() => onSwap(unit.id, downgrade.id)} aria-label={webUIText("Auto.Attr.componentssidebarsFormationTemplateSidebar.562.1", { Name: downgrade.name })}>
              <img src="/assets/icons/I_UnitDemote.png" alt="" className="tpl-unit-action-icon" />
            </button>
          </Tooltip>
        ) : <span className="tpl-unit-action-spacer" />}
        {upgrade ? (
          <Tooltip content={{ get title() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.568.1", { Name: upgrade.name }); }, get body() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.568.2", { Name: unit.name, Name2: upgrade.name }); } }} position="left" delay={200}>
            <button type="button" className="tpl-unit-swap" onClick={() => onSwap(unit.id, upgrade.id)} aria-label={webUIText("Auto.Attr.componentssidebarsFormationTemplateSidebar.569.1", { Name: upgrade.name })}>
              <img src="/assets/icons/I_UnitPromote.png" alt="" className="tpl-unit-action-icon" />
            </button>
          </Tooltip>
        ) : <span className="tpl-unit-action-spacer" />}
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.574.27'), get body() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.574.1", { Name: unit.name }); } }} position="left" delay={200}>
          <button type="button" className="tpl-unit-remove" onClick={onRemove} aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.575.28')}>
            <img src="/assets/icons/I_Trash.png" alt="" className="tpl-unit-action-icon" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function unitCanBuildInAnySettlement(unit: FormationTemplateUnitEntry): boolean {
  if ((unit.availableSettlementCount || 0) > 0) return true;
  return (unit.availableSettlements ?? []).some(settlement => settlement.available);
}

export function Picker({
  availableClasses,
  currentCounts,
  onAdd,
  onCancel,
}: {
  availableClasses: Map<string, FormationTemplateUnitEntry[]>;
  currentCounts: Record<string, number>;
  onAdd: (unitId: string, amount: number) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const {
    offsetStyle,
    rootRef: dialogRef,
    onHandleMouseDown,
    onSurfaceMouseDown,
  } = useDraggableOffset({
    blockClassNames: [
      'styled-scroll-area',
      'tooltip-wrapper',
      'dropdown-select',
      'search-field',
      'search-input',
      'game-check-button',
      'tpl-picker-controls',
      'tpl-picker-tabs',
      'tpl-picker-body',
      'tpl-picker-foot',
      'tpl-picker-list',
    ],
  });
  const trimmedQuery = query.trim().toLowerCase();
  const queriedClasses = useMemo(() => (
    Array.from(availableClasses.entries())
      .map(([type, units]) => ({
        type,
        units: units.filter(unit => {
          if (!showUnavailable
            && !unitCanBuildInAnySettlement(unit)
            && (currentCounts[unit.id] ?? 0) <= 0) {
            return false;
          }
          if (trimmedQuery.length === 0) return true;
          const haystack = `${unit.name} ${unitTypeLabel(unit.type)} ${unit.description}`.toLowerCase();
          return haystack.includes(trimmedQuery);
        }),
      }))
      .filter(group => group.units.length > 0)
  ), [availableClasses, currentCounts, showUnavailable, trimmedQuery]);
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
      icon: unitTypeIcon(group.type, group.units[0]?.category),
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

  return createPortal(
    <div
      className="tpl-picker"
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }}
    >
      <div className="modal-drag-frame" style={offsetStyle}>
        <div
          ref={dialogRef}
          className="tpl-picker-dialog"
          onMouseDown={event => {
            event.stopPropagation();
            onSurfaceMouseDown(event);
          }}
        >
          <ModalDragHandle onMouseDown={onHandleMouseDown} />
          <div className="tpl-picker-head">
            <div className="tpl-picker-title-block">
              <span className="tpl-picker-title"><WebUIText textKey="FormationTemplate.UnitCatalogue" /></span>
              <span className="tpl-picker-subtitle">{webUIText("FormationTemplateSidebar.Available", { Value1: fmt(visibleCount) })}</span>
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
            <GameCheckButton
              checked={showUnavailable}
              label={webUIText('FormationTemplate.ShowUnavailableUnits')}
              className="tpl-picker-unavailable-toggle game-check-button--compact-label"
              onToggle={() => setShowUnavailable(value => !value)}
              tooltip={{
                title: webUIText('FormationTemplate.ShowUnavailableUnits'),
                body: webUIText('FormationTemplate.ShowUnavailableUnitsTooltip'),
              }}
            />
          </div>
          <div className="tpl-picker-tabs">
            {typeTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`tpl-picker-tab${tab.id === effectiveActiveType ? ' tpl-picker-tab--active' : ''}`}
                onClick={() => setActiveType(tab.id)}
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
                  <img src={unitTypeIcon(type, units[0]?.category)} alt="" className="tpl-picker-section-icon" />
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
                          onClick={(event) => {
                            event.preventDefault();
                            onAdd(unit.id, stepAmountFromEvent(event));
                          }}
                        >
                          <img src={unitPortrait(unit)} alt="" className="tpl-picker-row-icon" />
                          <span className="tpl-picker-row-copy">
                            <strong>{unit.name}</strong>
                            <span>
                              {unit.cultureName
                                ? webUIText('FormationTemplate.CulturePopulation', {
                                  Culture: unit.cultureName,
                                  Population: fmt(Math.max(0, unit.availableManpower ?? 0)),
                                })
                                : webUIText('FormationTemplateSidebar.Tier', { Value1: unitTypeLabel(unit.type), Value2: fmt(unit.tier) })}
                            </span>
                          </span>
                          <span className="tpl-picker-row-stats">
                            <span>{webUIText("FormationTemplateSidebar.Strength", { Value1: fmt(unit.maxStrength) })}</span>
                            <span>{webUIText("FormationTemplateSidebar.Gold", { Value1: fmt(unit.price) })}</span>
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
            <span>{webUIText("FormationTemplateSidebar.UnitsShown", { Value1: fmt(visibleCount) })}</span>
            <button type="button" className="tpl-picker-done" onClick={onCancel}><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.667.4" /></button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AssignedForces({ forces, openForce }: { forces: FormationTemplateAssignedForce[]; openForce: (id: string) => void }) {
  return (
    <div className="tpl-force-list">
      {forces.length === 0 ? (
        <div className="tpl-empty"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.679.5" /></div>
      ) : forces.map(force => {
        const role = force.commanderName || force.rank || (force.isNavy ? webUIText("Common.Fleet") : webUIText("Common.Army"));
        return (
          <button key={force.id} type="button" className="tpl-force-row" onClick={() => openForce(force.id)}>
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

export function CombatTab({
  draft,
  unitById,
  derived,
  maximumBattleGroupUnits,
  onAddBattleGroup,
  onRemoveBattleGroup,
  onSetBattleGroupUnitCount,
}: {
  draft: DraftTemplate;
  unitById: Map<string, FormationTemplateUnitEntry>;
  derived: DerivedTotals;
  maximumBattleGroupUnits: number;
  onAddBattleGroup: (role: BattleFormationRole) => void;
  onRemoveBattleGroup: (groupId: string) => void;
  onSetBattleGroupUnitCount: (groupId: string, unitId: string, count: number) => void;
}) {
  const { settings } = useSettingsBridge();
  const batchKey = formatActionBinding(settings?.controls, 'IncreaseUnitProduction');
  const stepModifiersBody = stepModifiersHelpText(webUIText, batchKey);
  const stepMultiplier = useStepMultiplier();
  const effectiveStep = stepAmountFromMultiplier(stepMultiplier);
  const decrementLabel = stepButtonLabel(-1, effectiveStep);
  const incrementLabel = stepButtonLabel(1, effectiveStep);
  const roleEntries = compositionRequests(draft)
    .map(request => ({ request, unit: unitById.get(request.unitId) }))
    .filter((entry): entry is { request: SaveFormationTemplateUnitRequest; unit: FormationTemplateUnitEntry } => Boolean(entry.unit))
    .reduce((roles, entry) => {
      const label = unitTypeLabel(entry.unit.type);
      const current = roles.get(label) ?? { strength: 0, icon: unitTypeIcon(entry.unit.type, entry.unit.category) };
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
  const hasUnassignedSiege = unassignedUnits.some(entry => battleFormationRole(entry.unit) === 'siege');
  const meleeTooltip = newBattleFormationTooltip('melee', draft.type);
  const rangedTooltip = newBattleFormationTooltip('ranged', draft.type);
  const siegeTooltip = newBattleFormationTooltip('siege', draft.type);

  return (
    <div className="tpl-combat">
      <SectionHeading variant="ornate" title={webUIText('FormationTemplate.BattlePlan.Title')} />
      <div className="tpl-battle-group-toolbar">
        <Tooltip content={meleeTooltip} bubbleClassName="tt-bubble--formation-role">
          <button
            type="button"
            className="tpl-battle-group-add tpl-battle-group-add--icon"
            onClick={() => onAddBattleGroup('melee')}
            disabled={!hasUnassignedMelee}
            aria-label={meleeTooltip.title}
          >
            <img src="/assets/icons/I_Plus.png" alt="" className="tpl-battle-group-add-icon" />
            <img src={battleFormationRoleIcon('melee', draft.type)} alt="" className="tpl-battle-group-add-icon" />
          </button>
        </Tooltip>
        <Tooltip content={rangedTooltip} bubbleClassName="tt-bubble--formation-role">
          <button
            type="button"
            className="tpl-battle-group-add tpl-battle-group-add--icon"
            onClick={() => onAddBattleGroup('ranged')}
            disabled={!hasUnassignedRanged}
            aria-label={rangedTooltip.title}
          >
            <img src="/assets/icons/I_Plus.png" alt="" className="tpl-battle-group-add-icon" />
            <img src={battleFormationRoleIcon('ranged', draft.type)} alt="" className="tpl-battle-group-add-icon" />
          </button>
        </Tooltip>
        <Tooltip content={siegeTooltip} bubbleClassName="tt-bubble--formation-role">
          <button
            type="button"
            className="tpl-battle-group-add tpl-battle-group-add--icon"
            onClick={() => onAddBattleGroup('siege')}
            disabled={!hasUnassignedSiege}
            aria-label={siegeTooltip.title}
          >
            <img src="/assets/icons/I_Plus.png" alt="" className="tpl-battle-group-add-icon" />
            <img src={battleFormationRoleIcon('siege', draft.type)} alt="" className="tpl-battle-group-add-icon" />
          </button>
        </Tooltip>
      </div>
      <div className="tpl-battle-group-list">
        {draft.battleGroups.length === 0 ? (
          <div className="tpl-empty tpl-empty--plain"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroups" /></div>
        ) : draft.battleGroups.map((group) => {
          const groupCount = battleGroupUnitCount(group);
          const groupName = battleFormationDisplayName(group, unitById, draft.type);
          const roleIcon = battleFormationRoleIcon(group.role, draft.type);
          const compatibleUnassigned = unassignedUnits.filter(entry => battleFormationRole(entry.unit) === group.role);
          const groupUnits = orderedBattleGroupUnitIds(group)
            .map(unitId => ({ unit: unitById.get(unitId), count: group.counts[unitId] ?? 0 }))
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);

          return (
            <div key={group.id} className="tpl-battle-group">
              <div className="tpl-battle-group-head">
                <img src={roleIcon} alt="" className="tpl-battle-group-icon" />
                <span className="tpl-battle-group-title">{groupName}</span>
                <span className={`tpl-battle-group-count${groupCount > maximumBattleGroupUnits ? ' tpl-battle-group-count--bad' : ''}`}>{`${fmt(groupCount)} / ${fmt(maximumBattleGroupUnits)}`}</span>
                <button type="button" className="tpl-unit-remove" onClick={() => onRemoveBattleGroup(group.id)} aria-label={webUIText('FormationTemplate.BattlePlan.RemoveGroup')}>
                  <img src="/assets/icons/I_Trash.png" alt="" className="tpl-unit-action-icon" />
                </button>
              </div>
              <div className="tpl-battle-group-units">
                {groupUnits.length === 0 ? (
                  <div className="tpl-empty tpl-empty--plain"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroup" /></div>
                ) : groupUnits.map(({ unit, count }) => {
                  const assignedElsewhere = groupAssignedCountExcluding(draft, unit.id, group.id);
                  const availableForGroup = Math.max(0, (draft.counts[unit.id] ?? 0) - assignedElsewhere);
                  const groupRoom = maximumBattleGroupUnits - groupCount;
                  const canIncrement = count < availableForGroup && groupRoom > 0;
                  return (
                    <div key={unit.id} className="tpl-battle-group-unit">
                      <img src={unitPortrait(unit)} alt="" className="tpl-battle-group-unit-icon" />
                      <span className="tpl-battle-group-unit-name">{unit.name}</span>
                      <Tooltip
                        content={{
                          title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.543.22'),
                          body: stepModifiersBody,
                        }}
                        position="left"
                        delay={200}
                      >
                        <div className="tpl-stepper">
                          <button
                            type="button"
                            className="tpl-step-btn"
                            onClick={(event) => {
                              event.preventDefault();
                              onSetBattleGroupUnitCount(group.id, unit.id, count - stepAmountFromEvent(event));
                            }}
                            aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25')}
                          >
                            {decrementLabel}
                          </button>
                          <span className="tpl-step-count">{fmt(count)}</span>
                          <button
                            type="button"
                            className="tpl-step-btn"
                            onClick={(event) => {
                              event.preventDefault();
                              onSetBattleGroupUnitCount(group.id, unit.id, count + stepAmountFromEvent(event));
                            }}
                            disabled={!canIncrement}
                            aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.556.26')}
                          >
                            {incrementLabel}
                          </button>
                        </div>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
              {compatibleUnassigned.length > 0 && groupCount < maximumBattleGroupUnits && (
                <div className="tpl-battle-group-add-list">
                  {compatibleUnassigned.map(({ unit, count }) => (
                    <Tooltip
                      key={unit.id}
                      content={{
                        title: unit.name,
                        body: stepModifiersBody,
                      }}
                      position="left"
                      delay={200}
                    >
                      <button
                        type="button"
                        className="tpl-battle-group-add-unit"
                        onClick={(event) => {
                          event.preventDefault();
                          onSetBattleGroupUnitCount(
                            group.id,
                            unit.id,
                            (group.counts[unit.id] ?? 0) + stepAmountFromEvent(event),
                          );
                        }}
                      >
                        <img src={unitPortrait(unit)} alt="" className="tpl-battle-group-add-unit-icon" />
                        <span>{unit.name}</span>
                        <span>{fmt(count)}</span>
                      </button>
                    </Tooltip>
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

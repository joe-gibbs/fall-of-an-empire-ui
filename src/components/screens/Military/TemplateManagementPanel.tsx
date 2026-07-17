import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from '../../common/buttons/CloseButton';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import DropdownSelect, { type DropdownSelectOption } from '../../common/forms/DropdownSelect';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip, { type UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import { useGameActions } from '../../../context/GameContext';
import { useMilitary } from '../../../data-source/index';
import { setMilitaryFormationTemplateBridge } from '../../../bridge/military-map/useMilitaryBridge';
import {
  applyFormationTemplateBridge,
  deleteFormationTemplateBridge,
  generateFormationTemplateNameBridge,
  saveFormationTemplateBridge,
  useFormationTemplateCatalogueBridge,
} from '../../../bridge/military-map/useFormationTemplatesBridge';
import { acknowledgeBridgeFailure, getRuntimeEngine } from '../../../bridge/core/runtimeEngine';
import type {
  FormationTemplateAssignedForce,
  FormationTemplateEntry,
  FormationTemplateUnitEntry,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import type { Army } from '../../../data/types';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import {
  FORMATION_TEMPLATE_ICON_OPTIONS,
  getFormationTemplateIcon,
} from '../../../utils/formationTemplatePresentation';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import type { TemplateCreateType } from './screenTokens';
import { TemplateBattlePlanner } from './TemplateBattlePlanner';
import {
  MAX_BATTLE_FORMATION_SIZE,
  battleGroupUnitCount,
  battleGroupsValid,
  battleRoleForUnit,
  buildTemplateDraft,
  createBattleGroupId,
  draftBattleGroupRequests,
  draftCompositionRequests,
  draftTotals,
  draftUnitCount,
  normaliseBattleRole,
  normaliseTemplateType,
  romanTier,
  templateDraftsEqual,
  type BattleFormationRole,
  type TemplateDraft,
} from './formationTemplateDraft';

const SWORDS_ICON = '/assets/icons/I_Swords.png';
const SUPPLY_ICON = '/assets/icons/I_Food.png';
const TEMPLATE_ICON = '/assets/icons/I_Template.png';
const GOLD_ICON = '/assets/icons/I_Coins.png';
const UPKEEP_ICON = '/assets/icons/Diplomacy/I_DemandGoldRecurring.png';
const SETTLEMENT_ICON = '/assets/icons/I_City.png';
const TIER_ICON = '/assets/icons/I_UnitPromote.png';
const TRAINING_ICON = '/assets/icons/I_ModTraining.png';
const SPEED_ICON = '/assets/icons/I_Speed.png';
const RAISE_ICON = '/assets/icons/I_ArmiesQuickButton.png';
const SAVE_ICON = '/assets/icons/I_SaveFolder.png';
const DUPLICATE_ICON = '/assets/icons/I_DuplicateTemplate.png';
const DELETE_ICON = '/assets/icons/I_Close.png';
const RENAME_ICON = '/assets/icons/I_Rename.png';
const TEMPLATE_LIMIT = 30;

type UnitCatalogueColumnKey = 'unit' | 'type' | 'tier' | 'strength' | 'cost' | 'upkeep' | 'settlements' | 'add';
type UnitCatalogueFilterKey = 'type' | 'culture';

const CATALOGUE_ALL_FILTER = '__all__';

const TEMPLATE_UNIT_TYPE_ICONS: Record<string, string> = {
  infantry: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  cavalry: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  ranged: '/assets/icons/UnitTypes/I_ArmyRanged.png',
  siege: '/assets/icons/UnitTypes/I_ArmySiege.png',
  special: '/assets/icons/UnitTypes/I_ArmySpecial.png',
  galley: '/assets/icons/I_NaviesQuickButton.png',
  trireme: '/assets/icons/I_NaviesQuickButton.png',
  quinquereme: '/assets/icons/I_NaviesQuickButton.png',
  naval: '/assets/icons/I_NaviesQuickButton.png',
  navy: '/assets/icons/I_NaviesQuickButton.png',
};

function templateUnitSummary(template: FormationTemplateEntry): string {
  const units = template.units
    .filter((unit) => unit.count > 0)
    .slice(0, 3)
    .map((unit) => `${formatNumber(unit.count)} ${unit.name}`);
  const hidden = Math.max(0, template.units.filter((unit) => unit.count > 0).length - units.length);
  if (units.length === 0) return webUIText('Military.NoUnitsAssigned');
  return hidden > 0 ? `${units.join(', ')} + ${formatNumber(hidden)} more` : units.join(', ');
}

function templateUnitTypeLabel(unit: FormationTemplateUnitEntry): string {
  return unit.unitTypeLabel || unit.type || unit.category;
}

function templateUnitTypeIcon(unit: FormationTemplateUnitEntry): string {
  if (unit.type === 'siege' && unit.category === 'naval') {
    return '/assets/icons/UnitTypes/I_NavySiege.png';
  }
  return TEMPLATE_UNIT_TYPE_ICONS[unit.type] ?? TEMPLATE_UNIT_TYPE_ICONS[unit.category] ?? '/assets/icons/UnitTypes/I_ArmySpecial.png';
}

export function templateUnitPortrait(unit: FormationTemplateUnitEntry): string {
  const portrait = WebkilnAssetPath(unit.portrait);
  return portrait || unit.portrait || templateUnitTypeIcon(unit);
}

function templateResourceCosts(unit: FormationTemplateUnitEntry, kind: 'raise' | 'monthly') {
  const costs = kind === 'raise' ? unit.resourceCost : unit.monthlyConsumption;
  return costs.map(cost => ({
    name: cost.name,
    displayName: cost.displayName,
    description: cost.description,
    effects: cost.effects,
    amount: cost.amount,
    icon: `/assets/resources/${cost.name}.png`,
  }));
}

export function templateUnitTooltipData(unit: FormationTemplateUnitEntry, count: number): UnitTooltipData {
  const settlements = availableSettlementNames(unit);
  const buildabilitySettlements = availableSettlementEntries(unit);
  return {
    name: unit.name,
    description: unit.description,
    portrait: templateUnitPortrait(unit),
    typeLabel: templateUnitTypeLabel(unit),
    typeIcon: templateUnitTypeIcon(unit),
    tier: unit.tier,
    culture: unit.cultureName,
    cultureIcon: unit.cultureId ? `/assets/cultures/${unit.cultureId}.png` : undefined,
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
    resourceCost: templateResourceCosts(unit, 'raise'),
    monthlyConsumption: templateResourceCosts(unit, 'monthly'),
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
    count,
    buildability: {
      count: unit.availableSettlementCount || settlements.length,
      total: Math.max(unit.availableSettlements.length, unit.availableSettlementCount || settlements.length),
      settlements: buildabilitySettlements,
    },
  };
}

function TemplateListItem({
  template,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  deletePending,
  duplicateDisabled,
  deleteDisabled,
}: {
  template: FormationTemplateEntry;
  selected: boolean;
  onSelect: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  deletePending: boolean;
  duplicateDisabled: boolean;
  deleteDisabled: boolean;
}) {
  const iconProfile = getFormationTemplateIcon(template.type, template.units, template.iconId);
  const duplicateTitle = webUIText('Auto.Prop.componentssidebarsFormationTemplateSidebar.1060.1');
  const deleteTitle = deletePending
    ? webUIText('FormationTemplate.ConfirmDeleteButton')
    : webUIText('FormationTemplate.DeleteButton');

  return (
    <div className={`chart-template-list-item${selected ? ' chart-template-list-item--selected' : ''}`}>
      <button
        type="button"
        className="chart-template-list-select"
        onMouseDown={() => onSelect(template.id)}
      >
        <img src={iconProfile.icon} alt="" className="chart-template-list-icon" draggable={false} />
        <span className="chart-template-list-copy">
          <span className="chart-template-list-name">{template.name}</span>
          <span className="chart-template-list-summary">{templateUnitSummary(template)}</span>
        </span>
      </button>
      <Tooltip
        content={{
          title: duplicateTitle,
          body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1060.8'),
        }}
        position="right"
      >
        <button
          type="button"
          className="chart-template-list-duplicate"
          aria-label={duplicateTitle}
          disabled={duplicateDisabled}
          onMouseDown={event => {
            event.stopPropagation();
            onDuplicate(template.id);
          }}
        >
          <img src={DUPLICATE_ICON} alt="" className="chart-template-list-duplicate-icon" draggable={false} />
        </button>
      </Tooltip>
      <Tooltip
        content={{
          title: deleteTitle,
          body: deletePending ? webUIText('FormationTemplate.DeleteConfirmMessage') : template.name,
        }}
        position="right"
      >
        <button
          type="button"
          className={`chart-template-list-delete${deletePending ? ' chart-template-list-delete--confirm' : ''}`}
          aria-label={deleteTitle}
          disabled={!template.canDelete || deleteDisabled}
          onMouseDown={event => event.stopPropagation()}
          onClick={event => {
            event.stopPropagation();
            onDelete(template.id);
          }}
        >
          <img src={DELETE_ICON} alt="" className="chart-template-list-delete-icon" draggable={false} />
        </button>
      </Tooltip>
    </div>
  );
}

function availableSettlementNames(unit: FormationTemplateUnitEntry): string[] {
  return availableSettlementEntries(unit)
    .map(settlement => settlement.name);
}

function availableSettlementEntries(unit: FormationTemplateUnitEntry): { id: string; name: string }[] {
  return unit.availableSettlements
    .filter(settlement => settlement.available)
    .map(settlement => ({ id: settlement.id, name: settlement.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function catalogueFilterOptions(
  units: FormationTemplateUnitEntry[],
  allLabel: string,
  getValue: (unit: FormationTemplateUnitEntry) => string,
  getLabel: (unit: FormationTemplateUnitEntry, value: string) => string,
  getIcon?: (unit: FormationTemplateUnitEntry) => string,
  getSwatch?: (unit: FormationTemplateUnitEntry) => string,
): DropdownSelectOption[] {
  const values = new Map<string, DropdownSelectOption>();
  units.forEach(unit => {
    const value = getValue(unit).trim();
    if (!value || values.has(value)) return;
    const icon = getIcon?.(unit);
    const swatch = getSwatch?.(unit);
    values.set(value, {
      value,
      label: getLabel(unit, value),
      icon: icon && icon.length > 0 ? icon : undefined,
      swatch: swatch && swatch.length > 0 ? swatch : undefined,
    });
  });

  const options = Array.from(values.values())
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
  return [{ value: CATALOGUE_ALL_FILTER, label: allLabel }, ...options];
}

function CatalogueFilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: UnitCatalogueFilterKey;
  label: string;
  value: string;
  options: DropdownSelectOption[];
  onChange: (value: string) => void;
}) {
  const safeValue = options.some(option => option.value === value) ? value : CATALOGUE_ALL_FILTER;
  return (
    <DropdownSelect
      className="chart-unit-picker-filter"
      id={`chart-unit-picker-${id}`}
      label={label}
      value={safeValue}
      options={options}
      escapeId={`formationTemplate.unitCatalogue.filter.${id}`}
      isActive={safeValue !== CATALOGUE_ALL_FILTER}
      onChange={onChange}
    />
  );
}

function TemplateUnitSelectorModal({
  units,
  currentCounts,
  onAdd,
  onRemove,
  onClose,
}: {
  units: FormationTemplateUnitEntry[];
  currentCounts: Record<string, number>;
  onAdd: (unitId: string) => void;
  onRemove: (unitId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(CATALOGUE_ALL_FILTER);
  const [cultureFilter, setCultureFilter] = useState(CATALOGUE_ALL_FILTER);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | undefined>(undefined);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, 160);
  };

  useEffect(() => () => {
    if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current);
  }, []);

  useEscapeStackEntry({
    id: 'modal.template-unit-selector',
    active: true,
    onClose: requestClose,
    allowFromInput: true,
  });

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

  const typeOptions = useMemo(() => catalogueFilterOptions(
    units,
    webUIText('Common.All'),
    unit => unit.type || unit.category,
    unit => templateUnitTypeLabel(unit),
    unit => templateUnitTypeIcon(unit),
  ), [units]);
  const cultureOptions = useMemo(() => catalogueFilterOptions(
    units,
    webUIText('Common.All'),
    unit => unit.cultureId || unit.cultureName,
    unit => unit.cultureName,
    undefined,
    unit => unit.cultureColour,
  ), [units]);
  const unitColumns = useMemo<Array<DataTableColumn<FormationTemplateUnitEntry, UnitCatalogueColumnKey>>>(() => [
    {
      id: 'unit',
      label: webUIText('Common.Unit'),
      width: '31%',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--unit',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--unit',
      render: unit => {
        const count = currentCounts[unit.id] ?? 0;
        return (
          <Tooltip
            position="left"
            delay={200}
            content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }}
          >
            <div
              className={`chart-unit-picker-unit${count > 0 ? ' chart-unit-picker-unit--selected' : ''}`}
              data-tutorial-target="DynamicUnit"
              data-tutorial-unit-id={unit.id}
              data-tutorial-unit-count={count}
            >
              <span className="chart-unit-picker-unit-portrait-frame">
                <img src={templateUnitPortrait(unit)} alt="" className="chart-unit-picker-unit-portrait" draggable={false} />
              </span>
              <span className="chart-unit-picker-unit-copy">
                <strong>{unit.name}</strong>
              </span>
              <span className="chart-unit-picker-unit-count">{formatNumber(count)}</span>
            </div>
          </Tooltip>
        );
      },
      sortValue: unit => unit.name,
      searchValue: unit => `${unit.name} ${templateUnitTypeLabel(unit)} ${unit.description}`,
    },
    {
      id: 'type',
      label: webUIText('Economy.Type'),
      width: '13%',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--type',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--type',
      render: unit => (
        <span className="chart-unit-picker-type">
          <img src={templateUnitTypeIcon(unit)} alt="" className="chart-unit-picker-type-icon" draggable={false} />
          <span>{templateUnitTypeLabel(unit)}</span>
        </span>
      ),
      sortValue: unit => templateUnitTypeLabel(unit),
      searchValue: unit => templateUnitTypeLabel(unit),
    },
    {
      id: 'tier',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={TIER_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsScreensEncyclopediaScreen.863.6')}</span>
        </span>
      ),
      width: '7%',
      align: 'centre',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--tier',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--tier',
      render: unit => romanTier(unit.tier),
      sortValue: unit => unit.tier,
    },
    {
      id: 'strength',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={SWORDS_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.433.5')}</span>
        </span>
      ),
      width: '10%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      render: unit => formatNumber(unit.maxStrength),
      sortValue: unit => unit.maxStrength,
    },
    {
      id: 'cost',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={GOLD_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.442.8')}</span>
        </span>
      ),
      width: '10%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      render: unit => formatNumber(unit.price),
      sortValue: unit => unit.price,
    },
    {
      id: 'upkeep',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={UPKEEP_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.451.11')}</span>
        </span>
      ),
      width: '10%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      render: unit => formatNumber(unit.upkeep),
      sortValue: unit => unit.upkeep,
    },
    {
      id: 'settlements',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={SETTLEMENT_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('PeaceNegotiation.Tooltip.Settlements')}</span>
        </span>
      ),
      width: '12%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--settlements',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--settlements',
      render: unit => {
        const settlementNames = availableSettlementNames(unit);
        const settlementCount = unit.availableSettlementCount || settlementNames.length;
        const settlementTooltipBody = settlementNames.length > 0
          ? settlementNames.join(', ')
          : settlementCount > 0
            ? webUIText('Auto.Fix.Expr.componentssidebarsFormationTemplateSidebar.618.1', { Value1: formatNumber(settlementCount) })
            : webUIText('Common.NoneAvailable');
        return (
          <Tooltip
            inline
            position="left"
            content={{
              title: webUIText('PeaceNegotiation.Tooltip.Settlements'),
              body: settlementTooltipBody,
            }}
          >
            <span className="chart-unit-picker-settlement-count">{formatNumber(settlementCount)}</span>
          </Tooltip>
        );
      },
      sortValue: unit => unit.availableSettlementCount || availableSettlementNames(unit).length,
    },
    {
      id: 'add',
      label: '',
      width: '7%',
      align: 'centre',
      sortable: false,
      className: 'chart-unit-picker-cell chart-unit-picker-cell--add',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--add',
      render: unit => {
        const count = currentCounts[unit.id] ?? 0;
        return (
          <span className="chart-unit-picker-actions">
            <Tooltip
              inline
              position="left"
              content={{ title: unit.name, body: webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25') }}
            >
              <button
                type="button"
                className="chart-unit-picker-add"
                disabled={count <= 0}
                onMouseDown={event => event.stopPropagation()}
                onClick={() => onRemove(unit.id)}
                aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25')}
              >
                <img src="/assets/icons/I_Minus.png" alt="" className="chart-unit-picker-add-icon" draggable={false} />
              </button>
            </Tooltip>
            <Tooltip
              inline
              position="left"
              content={{ title: unit.name, body: webUIText('Auto.ComponentsSidebarsFormationTemplateSidebar.616.2') }}
            >
              <button
                type="button"
                className="chart-unit-picker-add"
                onMouseDown={event => event.stopPropagation()}
                onClick={() => onAdd(unit.id)}
                aria-label={webUIText('Auto.ComponentsSidebarsFormationTemplateSidebar.616.2')}
              >
                <img src="/assets/icons/I_Plus.png" alt="" className="chart-unit-picker-add-icon" draggable={false} />
              </button>
            </Tooltip>
          </span>
        );
      },
    },
  ], [currentCounts, onAdd, onRemove]);
  const filterUnit = (unit: FormationTemplateUnitEntry) => {
    const unitType = unit.type || unit.category;
    const unitCulture = unit.cultureId || unit.cultureName;
    return (typeFilter === CATALOGUE_ALL_FILTER || typeFilter === unitType)
      && (cultureFilter === CATALOGUE_ALL_FILTER || cultureFilter === unitCulture);
  };

  return createPortal(
    <div
      className={`chart-unit-picker${closing ? ' chart-unit-picker--closing' : ''}`}
      onMouseDown={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className={`chart-unit-picker-dialog${closing ? ' chart-unit-picker-dialog--closing' : ''}`}
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="chart-unit-picker-head">
          <div className="chart-unit-picker-title-block">
            <span className="chart-unit-picker-title"><WebUIText textKey="FormationTemplate.UnitCatalogue" /></span>
          </div>
          <CloseButton size="sm" onClick={requestClose} />
        </div>
        <div className="chart-unit-picker-body">
          <DataTable
            rows={units}
            columns={unitColumns}
            rowKey={unit => unit.id}
            onRowClick={unit => onAdd(unit.id)}
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.627.29')}
            toolsExtra={(
              <div className="chart-unit-picker-filters">
                <CatalogueFilterSelect
                  id="type"
                  label={webUIText('Economy.Type')}
                  value={typeFilter}
                  options={typeOptions}
                  onChange={setTypeFilter}
                />
                <CatalogueFilterSelect
                  id="culture"
                  label={webUIText('MainMenu.Culture')}
                  value={cultureFilter}
                  options={cultureOptions}
                  onChange={setCultureFilter}
                />
              </div>
            )}
            filterPredicate={filterUnit}
            defaultSortKey="tier"
            defaultSortDirection="asc"
            emptyLabel={<WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.632.3" />}
            className="chart-unit-picker-table-block"
            toolsClassName="chart-unit-picker-table-tools"
            searchWrapClassName="chart-unit-picker-search-wrap"
            searchClassName="chart-unit-picker-search"
            wrapperClassName="chart-unit-picker-table-wrapper"
            tableClassName="chart-unit-picker-table"
            headerRowClassName="chart-unit-picker-table-head"
            bodyClassName="chart-unit-picker-table-body"
            bodyScrollFrameClassName="chart-unit-picker-table-scroll"
            rowClassName="chart-unit-picker-table-row"
            bodyCellClassName="chart-unit-picker-table-cell"
            headerContentClassName="chart-unit-picker-header-content"
            virtualRowHeightRem={4.15}
            emptyClassName="chart-unit-picker-empty"
            styledScrollbar
          />
        </div>
        <div className="chart-unit-picker-foot">
          <GameButton
            variant="burgundy"
            className="chart-unit-picker-done"
            tutorialTarget="CloseUnitCatalogueButton"
            onClick={requestClose}
          >
            <WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.667.4" />
          </GameButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TemplateAssignedForces({
  forces,
  onOpenForce,
}: {
  forces: FormationTemplateAssignedForce[];
  onOpenForce: (forceId: string) => void;
}) {
  if (forces.length === 0) {
    return <div className="chart-template-empty-inline"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.679.5" /></div>;
  }

  return (
    <div className="chart-template-force-list">
      {forces.map(force => {
        const role = force.commanderName
          || force.rank
          || (force.isNavy
            ? webUIText('Auto.Fix.ExprFallbackTrue.componentssidebarsFormationTemplateSidebar.685.1')
            : webUIText('Auto.Fix.ExprFallbackFalse.componentssidebarsFormationTemplateSidebar.685.1'));
        return (
          <button
            key={force.id}
            type="button"
            className="chart-template-force-row"
            onMouseDown={() => onOpenForce(force.id)}
          >
            <span className="chart-template-force-primary">
              <span className="chart-template-force-name">{force.name}</span>
              <span className="chart-template-force-strength">{formatNumber(force.strength)}/{formatNumber(force.maxStrength)}</span>
            </span>
            <span className="chart-template-force-secondary">
              <span>{role}</span>
              <span>{force.location || force.rank}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TemplateEditor({
  template,
  type,
  unitCatalogue,
  assignmentTarget,
  onNeedCatalogue,
  onRaiseTemplate,
  onAssignTemplate,
  onSaved,
  onMessage,
}: {
  template: FormationTemplateEntry | null;
  type: TemplateCreateType;
  unitCatalogue: FormationTemplateUnitEntry[];
  assignmentTarget?: Army | null;
  onNeedCatalogue: () => void;
  onRaiseTemplate: (id: string) => void;
  onAssignTemplate?: (id: string) => void;
  onSaved: (templateId: string) => void;
  onMessage: (message: string) => void;
}) {
  const [draft, setDraft] = useState(() => buildTemplateDraft(template, type));
  const [baseline, setBaseline] = useState(() => buildTemplateDraft(template, type));
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [catalogueGroupId, setCatalogueGroupId] = useState<string | null>(null);
  const [actionActive, setActionActive] = useState(false);
  const [renamingTitle, setRenamingTitle] = useState(!template);
  const [nameEdited, setNameEdited] = useState(Boolean(template));
  const titleInputRef = useRef<HTMLInputElement>(null);
  const automaticNameRequestRef = useRef(0);
  const gameActions = useGameActions();
  const unitById = useMemo(() => {
    const map = new Map<string, FormationTemplateUnitEntry>();
    unitCatalogue.forEach(unit => map.set(unit.id, unit));
    template?.units.forEach(unit => {
      const catalogueUnit = map.get(unit.id);
      map.set(unit.id, catalogueUnit ? { ...catalogueUnit, count: unit.count, includesCore: unit.includesCore } : unit);
    });
    return map;
  }, [template, unitCatalogue]);
  const draftUnits = useMemo(() => (
    draftCompositionRequests(draft)
      .map(request => ({ unit: unitById.get(request.unitId), count: request.count }))
      .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0)
  ), [draft, unitById]);
  const automaticNameSignature = JSON.stringify(draftCompositionRequests(draft));
  const catalogueGroup = catalogueGroupId
    ? draft.battleGroups.find(group => group.id === catalogueGroupId) ?? null
    : null;
  const catalogueUnits = useMemo(() => (
    catalogueGroup
      ? unitCatalogue.filter(unit => battleRoleForUnit(unit) === catalogueGroup.role)
      : []
  ), [catalogueGroup, unitCatalogue]);
  const totals = useMemo(() => draftTotals(draft, unitById), [draft, unitById]);
  const iconProfile = getFormationTemplateIcon(
    draft.type,
    draftUnits.map(({ unit, count }) => ({ ...unit, count })),
    draft.iconId,
  );
  const unitCount = draftUnitCount(draft);
  const dirty = !templateDraftsEqual(draft, baseline);
  const editable = !template || template.canEdit;
  const hasName = draft.name.trim().length > 0;
  const hasValidBattleGroups = battleGroupsValid(draft, unitById);
  const canSave = editable && dirty && hasName && unitCount > 0 && hasValidBattleGroups && !actionActive;
  const canRaise = !!template && template.canApply && !dirty && !actionActive;
  const canAssign = !!assignmentTarget
    && !!template
    && !dirty
    && normaliseTemplateType(template.type) === (assignmentTarget.isNavy ? 'naval' : 'land')
    && !actionActive;
  const createTitle = draft.type === 'naval'
    ? webUIText('MilitaryScreen.NewFleetTemplate')
    : webUIText('MilitaryScreen.NewArmyTemplate');
  const raiseTooltip = template?.applyReason || webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1058.6');
  const raiseCost = template?.creationCost ?? totals.cost;
  const beginRename = () => {
    if (!editable) return;
    setRenamingTitle(true);
    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const addBattleGroup = (role: BattleFormationRole) => {
    if (!editable) return;
    const groupId = createBattleGroupId();
    setDraft(current => ({
      ...current,
      battleGroups: [
        ...current.battleGroups,
        { id: groupId, role, counts: {}, order: [] },
      ],
    }));
    onNeedCatalogue();
    setCatalogueGroupId(groupId);
  };

  useEffect(() => {
    if (template || nameEdited) return;

    const requestId = automaticNameRequestRef.current + 1;
    automaticNameRequestRef.current = requestId;
    let cancelled = false;
    const units = JSON.parse(automaticNameSignature) as SaveFormationTemplateUnitRequest[];

    void generateFormationTemplateNameBridge(draft.type, units)
      .then(response => {
        if (cancelled || automaticNameRequestRef.current !== requestId) return;
        setDraft(current => current.templateId || current.name === response.name
          ? current
          : { ...current, name: response.name });
      })
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
    };
  }, [automaticNameSignature, draft.type, nameEdited, template]);

  const removeBattleGroup = (groupId: string) => {
    if (!editable) return;
    setDraft(current => ({
      ...current,
      battleGroups: current.battleGroups.filter(group => group.id !== groupId),
    }));
    setCatalogueGroupId(current => current === groupId ? null : current);
  };

  const adjustBattleGroupUnitCount = (groupId: string, unitId: string, delta: number) => {
    if (!editable) return;
    const unit = unitById.get(unitId);
    if (!unit) return;

    setDraft(current => {
      const role = battleRoleForUnit(unit);
      const targetIndex = current.battleGroups.findIndex(group => group.id === groupId && group.role === role);
      if (targetIndex < 0) return current;
      const targetGroup = current.battleGroups[targetIndex];
      const currentCount = targetGroup.counts[unitId] ?? 0;
      if (delta > 0 && battleGroupUnitCount(targetGroup) >= MAX_BATTLE_FORMATION_SIZE) return current;
      if (delta < 0 && currentCount <= 0) return current;

      const nextCount = currentCount + delta;
      const counts = { ...targetGroup.counts };
      if (nextCount > 0) counts[unitId] = nextCount;
      else delete counts[unitId];
      const order = nextCount > 0 && !targetGroup.order.includes(unitId)
        ? [...targetGroup.order, unitId]
        : targetGroup.order.filter(id => id !== unitId || nextCount > 0);
      const battleGroups = current.battleGroups.map((group, index) => (
        index === targetIndex ? { ...group, counts, order } : group
      ));
      return { ...current, battleGroups };
    });
  };

  const openUnitCatalogue = (groupId: string) => {
    if (!editable) return;
    onNeedCatalogue();
    setCatalogueGroupId(groupId);
  };

  const saveDraft = (draftToSave: TemplateDraft) => {
    const name = draftToSave.name.trim();
    if (!name || draftUnitCount(draftToSave) <= 0 || !battleGroupsValid(draftToSave, unitById)) return;

    const resolvedIconId = draftToSave.iconId || getFormationTemplateIcon(
      draftToSave.type,
      draftCompositionRequests(draftToSave)
        .map(unit => {
          const catalogueUnit = unitById.get(unit.unitId);
          return catalogueUnit ? { ...catalogueUnit, count: unit.count } : null;
        })
        .filter((unit): unit is FormationTemplateUnitEntry & { count: number } => Boolean(unit)),
    ).kind;

    setActionActive(true);
    onMessage('');
    void saveFormationTemplateBridge({
      templateId: draftToSave.templateId,
      name,
      iconId: resolvedIconId,
      type: draftToSave.type,
      units: draftCompositionRequests(draftToSave),
      battleGroups: draftBattleGroupRequests(draftToSave),
    })
      .then(response => {
        if (!response.saved) {
          onMessage(response.message);
          return;
        }

        const savedDraft: TemplateDraft = {
          ...draftToSave,
          templateId: response.templateId,
          name,
          iconId: resolvedIconId,
          battleGroups: draftToSave.battleGroups.map(group => ({
            ...group,
            counts: { ...group.counts },
            order: [...group.order],
          })),
        };
        setDraft(savedDraft);
        setBaseline(savedDraft);
        onSaved(response.templateId);
      })
      .catch(acknowledgeBridgeFailure)
      .finally(() => setActionActive(false));
  };

  useEscapeStackEntry({
    id: 'formation-template-icon-picker',
    active: iconPickerOpen,
    onClose: () => setIconPickerOpen(false),
    allowFromInput: true,
  });

  return (
    <section className="chart-template-workbench" onMouseDown={() => {
      if (iconPickerOpen) setIconPickerOpen(false);
    }}>
      <div className="chart-template-workbench-body">
        <div className="chart-template-composer">
          <div className="chart-template-composer-head">
            <div className="chart-template-composer-title">
              <div className="chart-template-icon-popout">
                <button
                  type="button"
                  className="chart-template-composer-icon-button"
                  aria-label={webUIText('FormationTemplate.IconChoice')}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!editable) return;
                    setIconPickerOpen(open => !open);
                  }}
                  disabled={!editable}
                >
                  <img src={iconProfile.icon} alt="" className="chart-template-composer-icon" draggable={false} />
                </button>
                {iconPickerOpen && (
                  <div className="chart-template-icon-popover" onMouseDown={event => event.stopPropagation()}>
                    {FORMATION_TEMPLATE_ICON_OPTIONS.map(option => (
                      <button
                        key={option.kind}
                        type="button"
                        className={`chart-template-icon-choice${iconProfile.kind === option.kind ? ' chart-template-icon-choice--selected' : ''}`}
                        aria-label={webUIText(option.labelKey)}
                        onMouseDown={() => {
                          setDraft(current => ({ ...current, iconId: option.kind }));
                          setIconPickerOpen(false);
                        }}
                      >
                        <img src={option.icon} alt="" draggable={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {renamingTitle ? (
                <input
                  ref={titleInputRef}
                  className="chart-template-title-input"
                  data-tutorial-target="FormationNameInput"
                  value={draft.name}
                  onChange={event => {
                    automaticNameRequestRef.current += 1;
                    setNameEdited(true);
                    setDraft(current => ({ ...current, name: event.target.value }));
                  }}
                  onBlur={() => {
                    if (draft.name.trim().length > 0 && template) setRenamingTitle(false);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && draft.name.trim().length > 0 && template) {
                      setRenamingTitle(false);
                    }
                  }}
                  placeholder={createTitle}
                  aria-label={webUIText('Common.Name')}
                  disabled={!editable}
                />
              ) : (
                <div className="chart-template-title-label">
                  {draft.name || createTitle}
                </div>
              )}
              <button
                type="button"
                className="chart-template-rename-button"
                aria-label={webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.585.12')}
                onMouseDown={(event) => {
                  event.preventDefault();
                  beginRename();
                }}
                disabled={!editable}
              >
                <img src={RENAME_ICON} alt="" className="chart-template-rename-icon" draggable={false} />
              </button>
            </div>
          </div>

          <section className="chart-template-battle-workbench">
            <TemplateBattlePlanner
              draft={draft}
              unitById={unitById}
              editable={editable}
              onAddBattleGroup={addBattleGroup}
              onRemoveBattleGroup={removeBattleGroup}
              onAdjustBattleGroupUnitCount={adjustBattleGroupUnitCount}
              onOpenUnitCatalogue={openUnitCatalogue}
            />
          </section>

        </div>

        <aside className="chart-template-side-rail">
          <div className="chart-template-rail-section">
            <h4><WebUIText textKey="FormationTemplate.TemplateTotals" /></h4>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={SWORDS_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.433.5')}</span>
              <strong>{formatNumber(totals.strength)}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={GOLD_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.442.8')}</span>
              <strong>{formatNumber(totals.cost)}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={UPKEEP_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.451.11')}</span>
              <strong className="chart-template-total-good">{webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.452.1", { Value1: formatNumber(totals.upkeep) })}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={TRAINING_ICON} alt="" className="chart-template-total-icon" draggable={false} /><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.340.7" /></span>
              <strong>{webUIText('Common.DayAbbrevValue', { Days: formatNumber(totals.days) })}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={SUPPLY_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.469.1')}</span>
              <strong className="chart-template-total-bad">{webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.452.1", { Value1: formatNumber(totals.food, { maximumFractionDigits: 1 }) })}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={SPEED_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.460.14')}</span>
              <strong>{formatNumber(totals.speed)}</strong>
            </div>
          </div>

          <div className="chart-template-rail-section chart-template-rail-section--forces">
            <h4><WebUIText textKey="Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.1156.36" /></h4>
            <TemplateAssignedForces
              forces={template?.assignedForces ?? []}
              onOpenForce={(forceId) => gameActions.openSidebar('military', forceId)}
            />
          </div>
        </aside>
      </div>

      <div className="chart-template-action-bar">
        {assignmentTarget && (
          <Tooltip content={{
            title: webUIText('FormationTemplate.AssignButton', { Name: assignmentTarget.name }),
            body: template
              ? webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.4', { Name: assignmentTarget.name })
              : webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.5'),
          }}>
            <GameButton
              variant="burgundy"
              icon={TEMPLATE_ICON}
              className="chart-template-action-button"
              disabled={!canAssign}
              onClick={() => {
                if (template) onAssignTemplate?.(template.id);
              }}
            >
              {webUIText('FormationTemplate.AssignButton', { Name: assignmentTarget.name })}
            </GameButton>
          </Tooltip>
        )}
        <Tooltip content={{ title: webUIText('MilitaryScreen.RaiseTemplate'), body: raiseTooltip }}>
          <GameButton
            variant="burgundy"
            icon={RAISE_ICON}
            className="chart-template-action-button"
            tutorialTarget="RaiseFormationButton"
            disabled={!canRaise}
            onClick={() => {
              if (template) onRaiseTemplate(template.id);
            }}
          >
            <WebUIText textKey="MilitaryScreen.RaiseTemplate" />
            <span className="chart-template-action-cost">
              <img src={GOLD_ICON} alt="" className="chart-template-action-cost-icon" draggable={false} />
              <span className="chart-template-action-cost-value">{formatNumber(raiseCost)}</span>
            </span>
          </GameButton>
        </Tooltip>
        <GameButton
          variant="burgundy"
          icon={SAVE_ICON}
          className="chart-template-action-button chart-template-action-button--save"
          tutorialTarget="SaveFormationButton"
          disabled={!canSave}
          onClick={() => {
            saveDraft(draft);
          }}
        >
          <WebUIText textKey="Auto.Fix.VarExprTrue.componentsscreensSaveGameDialog.71.1" />
        </GameButton>
      </div>

      {catalogueGroup && (
        <TemplateUnitSelectorModal
          units={catalogueUnits}
          currentCounts={catalogueGroup.counts}
          onAdd={(unitId) => adjustBattleGroupUnitCount(catalogueGroup.id, unitId, 1)}
          onRemove={(unitId) => adjustBattleGroupUnitCount(catalogueGroup.id, unitId, -1)}
          onClose={() => setCatalogueGroupId(null)}
        />
      )}
    </section>
  );
}

export function TemplatesPanel({
  templates,
  initialTemplateId,
  initialCreateType,
  assignmentTargetId,
  onCloseScreen,
}: {
  templates: FormationTemplateEntry[];
  initialTemplateId: string | null;
  initialCreateType: TemplateCreateType | null;
  assignmentTargetId: string | null;
  onCloseScreen: () => void;
}) {
  const [catalogueRequested, setCatalogueRequested] = useState(false);
  const catalogueData = useFormationTemplateCatalogueBridge(catalogueRequested);
  const landUnitCatalogue = catalogueData?.landUnitCatalogue ?? [];
  const navalUnitCatalogue = catalogueData?.navalUnitCatalogue ?? [];
  const assignmentTarget = useMilitary(assignmentTargetId);
  const assignmentTemplateType: TemplateCreateType | null = assignmentTarget
    ? (assignmentTarget.isNavy ? 'naval' : 'land')
    : null;
  const visibleTemplates = useMemo(() => (
    assignmentTemplateType
      ? templates.filter(template => normaliseTemplateType(template.type) === assignmentTemplateType)
      : templates
  ), [assignmentTemplateType, templates]);
  const [templateMessage, setTemplateMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId);
  const [creatingTemplate, setCreatingTemplate] = useState(initialCreateType !== null);
  const [newTemplateType, setNewTemplateType] = useState<TemplateCreateType>(initialCreateType ?? 'land');
  const [newTemplateVersion, setNewTemplateVersion] = useState(0);
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<string | null>(null);
  const [listActionActive, setListActionActive] = useState(false);

  const selectedTemplate = creatingTemplate
    ? null
    : visibleTemplates.find(template => template.id === selectedTemplateId) ?? visibleTemplates[0] ?? null;
  const createType = assignmentTemplateType ?? newTemplateType;
  const editorType = selectedTemplate ? normaliseTemplateType(selectedTemplate.type) : createType;
  const editorCatalogue = editorType === 'naval' ? navalUnitCatalogue : landUnitCatalogue;
  const createTitle = createType === 'naval'
    ? webUIText('MilitaryScreen.NewFleetTemplate')
    : webUIText('MilitaryScreen.NewArmyTemplate');
  const createBody = createType === 'naval'
    ? webUIText('MilitaryScreen.NewFleetTemplateBody')
    : webUIText('MilitaryScreen.NewArmyTemplateBody');
  const raiseTemplate = (templateId: string) => {
    setTemplateMessage('');
    void applyFormationTemplateBridge(templateId)
      .then(response => {
        if (response.selectionStarted || response.selectionActive) {
          onCloseScreen();
          return;
        }

        setTemplateMessage(response.message);
      })
      .catch(acknowledgeBridgeFailure);
  };
  const assignTemplate = (templateId: string) => {
    if (!assignmentTarget) return;
    const assignedTemplate = visibleTemplates.find(template => template.id === templateId);
    if (!assignedTemplate) return;

    setTemplateMessage('');
    void setMilitaryFormationTemplateBridge(assignmentTarget.id, templateId)
      .then(() => {
        setTemplateMessage(webUIText('FormationTemplate.AssignSuccess', {
          Template: assignedTemplate.name,
          Name: assignmentTarget.name,
        }));
      })
      .catch(error => {
        acknowledgeBridgeFailure(error, 'game.set_military_formation_template');
        setTemplateMessage(webUIText('FormationTemplate.AssignFailed'));
      });
  };
  const createTemplate = () => {
    setNewTemplateType(assignmentTemplateType ?? editorType);
    setSelectedTemplateId(null);
    setCreatingTemplate(true);
    setTemplateMessage('');
    setPendingDeleteTemplateId(null);
    setNewTemplateVersion(version => version + 1);
  };
  const selectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCreatingTemplate(false);
    setTemplateMessage('');
    setPendingDeleteTemplateId(null);
  };
  const deleteTemplateFromList = (templateId: string) => {
    const targetTemplate = visibleTemplates.find(template => template.id === templateId);
    if (!targetTemplate || !targetTemplate.canDelete || listActionActive) return;

    if (pendingDeleteTemplateId !== templateId) {
      setPendingDeleteTemplateId(templateId);
      setTemplateMessage(webUIText('FormationTemplate.DeleteConfirmMessage'));
      return;
    }

    setListActionActive(true);
    setTemplateMessage('');
    void deleteFormationTemplateBridge(templateId)
      .then(response => {
        setTemplateMessage(response.message);
        if (!response.deleted) return;

        const nextTemplate = visibleTemplates.find(template => template.id !== templateId) ?? null;
        if (selectedTemplateId === templateId || !nextTemplate) {
          setSelectedTemplateId(nextTemplate?.id ?? null);
          setCreatingTemplate(nextTemplate === null);
          if (nextTemplate === null) setNewTemplateVersion(version => version + 1);
        }
      })
      .catch(acknowledgeBridgeFailure)
      .finally(() => {
        setPendingDeleteTemplateId(null);
        setListActionActive(false);
      });
  };
  const duplicateTemplateFromList = (templateId: string) => {
    const sourceTemplate = visibleTemplates.find(template => template.id === templateId);
    if (!sourceTemplate || listActionActive || sourceTemplate.units.every(unit => unit.count <= 0)) return;

    setListActionActive(true);
    setTemplateMessage('');
    setPendingDeleteTemplateId(null);
    void saveFormationTemplateBridge({
      templateId: '',
      name: webUIText("Auto.Fix.VarExprTrue.componentssidebarsFormationTemplateSidebar.976.1", { Value1: sourceTemplate.name.trim() }),
      iconId: sourceTemplate.iconId,
      type: normaliseTemplateType(sourceTemplate.type),
      units: sourceTemplate.units
        .filter(unit => unit.count > 0)
        .map(unit => ({ unitId: unit.id, count: unit.count })),
      battleGroups: sourceTemplate.battleGroups
        .map(group => ({
          role: normaliseBattleRole(group.role),
          units: group.units
            .filter(unit => unit.count > 0)
            .map(unit => ({ unitId: unit.unitId, count: unit.count })),
        }))
        .filter(group => group.units.length > 0),
    })
      .then(response => {
        if (!response.saved) {
          setTemplateMessage(response.message);
          return;
        }

        setCreatingTemplate(false);
        setSelectedTemplateId(response.templateId);
      })
      .catch(acknowledgeBridgeFailure)
      .finally(() => setListActionActive(false));
  };
  const editorKey = selectedTemplate
    ? `template-${selectedTemplate.id}`
    : `new-${editorType}-${newTemplateVersion}`;

  return (
    <div className="chart-template-panel">
      {templateMessage && <div className="chart-template-status">{templateMessage}</div>}

      <div className="chart-template-split">
        <div className="chart-template-list-pane">
          <div className="chart-template-list-head">
            <span className="chart-template-list-title"><WebUIText textKey="Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.988.37" /></span>
            <div className="chart-template-list-head-actions">
              <span className="chart-template-list-count">{webUIText('FormationTemplate.TemplateCount', { Count: formatNumber(visibleTemplates.length), Max: formatNumber(TEMPLATE_LIMIT) })}</span>
              <Tooltip content={{ title: createTitle, body: createBody }} wrapperClassName="chart-template-create-wrapper">
                <button
                  type="button"
                  className="chart-template-create"
                  aria-label={createTitle}
                  data-tutorial-target="NewFormationButton"
                  onMouseDown={createTemplate}
                >
                  <span className="chart-template-create-plus" />
                  <span className="chart-template-create-copy">
                    <span className="chart-template-create-title">{createTitle}</span>
                  </span>
                </button>
              </Tooltip>
            </div>
          </div>
          <div className="chart-template-list-scroll">
          {visibleTemplates.length === 0 ? (
            <div className="chart-template-empty"><WebUIText textKey="MilitaryScreen.NoTemplatesForType" /></div>
          ) : visibleTemplates.map(template => (
            <TemplateListItem
              key={template.id}
              template={template}
              selected={!creatingTemplate && template.id === selectedTemplate?.id}
              onSelect={selectTemplate}
              onDuplicate={duplicateTemplateFromList}
              onDelete={deleteTemplateFromList}
              deletePending={pendingDeleteTemplateId === template.id}
              duplicateDisabled={listActionActive || template.units.every(unit => unit.count <= 0)}
              deleteDisabled={listActionActive}
            />
          ))}
          </div>
        </div>
        <TemplateEditor
          key={editorKey}
          template={selectedTemplate}
          type={editorType}
          unitCatalogue={editorCatalogue}
          assignmentTarget={assignmentTarget}
          onNeedCatalogue={() => setCatalogueRequested(true)}
          onRaiseTemplate={raiseTemplate}
          onAssignTemplate={assignTemplate}
          onSaved={(templateId) => {
            setCreatingTemplate(false);
            setSelectedTemplateId(templateId);
          }}
          onMessage={setTemplateMessage}
        />
      </div>
    </div>
  );
}

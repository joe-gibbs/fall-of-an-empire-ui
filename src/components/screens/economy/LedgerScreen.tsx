import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import DropdownSelect, { type DropdownSelectOption } from '../../common/forms/DropdownSelect';
import EntityLink from '../../common/entities/EntityLink';
import FactionRoundel from '../../common/entities/FactionRoundel';
import GameButton from '../../common/buttons/GameButton';
import ResourceLabel from '../../common/data-display/stats/ResourceLabel';
import Tooltip from '../../common/tooltips/Tooltip';
import BattleAfterActionModal, { type BattleAfterActionNotification } from '../../notifications/BattleAfterActionModal';
import { sidebarTypeForEntity } from '../../common/entities/entityLinkUtils';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import { compareSortValues, normaliseSortText, type SortDirection, type SortState } from '../../common/layout/tables/sortUtils';
import { useLedgerOverviewBridge } from '../../../bridge/settlements-economy/useLedgerOverviewBridge';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { useGameActions } from '../../../context/GameContext';
import { UI_PRESENTATION } from '../../../config/presentation';
import type {
  LedgerBuildingRow,
  LedgerFactionRow,
  LedgerMilitaryRow,
  LedgerNotificationHistoryRow,
  LedgerResourceRow,
  LedgerSettlementRow,
  LedgerFactionVisual,
} from '../../../bridge-types.generated.ts';
import { WebkilnAssetPath } from '../../../utils/assets';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { renderRichText } from '../../../utils/richText';
import { normaliseBattleAfterActionReport } from '../../../utils/battleAfterActionReport';
import './LedgerScreen.css';

import { webUIText } from '../../../localization/WebUITextContext';
type LedgerTab = 'settlements' | 'militaries' | 'factions' | 'resources' | 'buildings' | 'notifications';
const ALL_FILTER = '__all__';
const LEDGER_ROW_HEIGHT_REM = 3.75;
const LEDGER_PAGE_SIZE = 150;

const EMPTY_SETTLEMENTS: LedgerSettlementRow[] = [];
const EMPTY_MILITARIES: LedgerMilitaryRow[] = [];
const EMPTY_FACTIONS: LedgerFactionRow[] = [];
const EMPTY_RESOURCES: LedgerResourceRow[] = [];
const EMPTY_BUILDINGS: LedgerBuildingRow[] = [];
const EMPTY_NOTIFICATIONS: LedgerNotificationHistoryRow[] = [];

type FilterOption = DropdownSelectOption;

interface LedgerFilters {
  settlementFaction: string;
  settlementType: string;
  settlementRegion: string;
  militaryFaction: string;
  militaryKind: string;
  factionStatus: string;
  resourceCategory: string;
  buildingCategory: string;
  buildingFaction: string;
  notificationCategory: string;
}

type LedgerFilterKey = keyof LedgerFilters;

const DEFAULT_FILTERS: LedgerFilters = {
  settlementFaction: ALL_FILTER,
  settlementType: ALL_FILTER,
  settlementRegion: ALL_FILTER,
  militaryFaction: ALL_FILTER,
  militaryKind: ALL_FILTER,
  factionStatus: ALL_FILTER,
  resourceCategory: ALL_FILTER,
  buildingCategory: ALL_FILTER,
  buildingFaction: ALL_FILTER,
  notificationCategory: ALL_FILTER,
};

type Column<T> = DataTableColumn<T>;
type LedgerSortState = SortState<string>;

interface LedgerSummaryCounts {
  settlementCount: number;
  militaryCount: number;
  factionCount: number;
  resourceCount: number;
  buildingCount: number;
  notificationCount: number;
}

const DEFAULT_LEDGER_SORTS: Record<LedgerTab, LedgerSortState> = {
  settlements: { key: 'name', direction: 'asc' },
  militaries: { key: 'name', direction: 'asc' },
  factions: { key: 'name', direction: 'asc' },
  resources: { key: 'name', direction: 'asc' },
  buildings: { key: 'name', direction: 'asc' },
  notifications: { key: 'date', direction: 'desc' },
};

function fmt(value: number | undefined): string {
  return formatNumber(value);
}

function fmt1(value: number | undefined): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

function signed(value: number | undefined, suffix = ''): string {
  return `${formatSignedNumber(value, { maximumFractionDigits: 1 })}${suffix}`;
}

function norm(value: unknown): string {
  return normaliseSortText(value);
}

function normaliseToken(value: unknown): string {
  return String(value ?? '').replace(/[\s_-]+/g, '').toLowerCase();
}

function settlementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    village: 'Ledger.SettlementType.Village',
    town: 'Ledger.SettlementType.Town',
    city: 'Ledger.SettlementType.City',
    metropolis: 'Ledger.SettlementType.Metropolis',
    fortress: 'Ledger.SettlementType.Fortress',
    monastery: 'Ledger.SettlementType.Monastery',
    port: 'Ledger.SettlementType.Port',
    mining: 'Ledger.SettlementType.Mining',
  };
  const key = labels[normaliseToken(type)];
  return key ? webUIText(key) : type;
}

function resourceCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    food: 'Economy.ResourceCategoryFood',
    strategic: 'Economy.ResourceCategoryStrategic',
    luxury: 'Economy.ResourceCategoryLuxury',
    rawmaterials: 'Economy.ResourceCategoryRawMaterials',
  };
  const key = labels[normaliseToken(category)];
  return key ? webUIText(key) : category;
}

function buildingCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    economic: 'Ledger.BuildingCategory.Economic',
    military: 'Ledger.BuildingCategory.Military',
    defensive: 'Ledger.BuildingCategory.Defensive',
    infrastructure: 'Ledger.BuildingCategory.Infrastructure',
    cultural: 'Ledger.BuildingCategory.Cultural',
    administrative: 'Ledger.BuildingCategory.Administrative',
    naval: 'Ledger.BuildingCategory.Naval',
    other: 'Economy.Other',
  };
  const key = labels[normaliseToken(category)];
  return key ? webUIText(key) : category;
}

function statusLabel(status: string, isRebel?: boolean): string {
  if (isRebel) return webUIText('Ledger.Status.Rebel');
  const labels: Record<string, string> = {
    player: 'Ledger.Status.Player',
    ally: 'Ledger.Status.Ally',
    rival: 'Ledger.Status.Rival',
    neutral: 'Common.Neutral',
    war: 'Ledger.Status.War',
    subject: 'Ledger.Status.Subject',
  };
  const key = labels[normaliseToken(status)];
  return key ? webUIText(key) : status;
}

function statusFilterValue(row: LedgerFactionRow): string {
  return row.isRebel ? 'rebel' : normaliseToken(row.diplomaticStatus);
}

function statusIcon(status: string): string {
  const icons: Record<string, string> = {
    player: '/assets/icons/I_IndependentFactions.png',
    ally: '/assets/icons/I_Peace.png',
    rival: '/assets/icons/I_DeclareWar.png',
    neutral: '/assets/icons/I_OpinionNeutral.png',
    war: '/assets/icons/I_War.png',
    subject: '/assets/icons/I_Vassal.png',
    rebel: '/assets/icons/I_DeclareRebellion.png',
  };
  return icons[status] ?? '/assets/icons/I_Diplomacy.png';
}

function FactionStatusIcon({ row }: { row: LedgerFactionRow }) {
  const status = statusFilterValue(row);
  const label = statusLabel(row.diplomaticStatus, row.isRebel);
  return (
    <Tooltip content={{ title: label }} position="bottom" delay={150} inline wrapperClassName="ledger-status-tooltip">
      <span className={`ledger-status-icon ledger-status-icon--${status}`} aria-label={label} role="img">
        <img src={WebkilnAssetPath(statusIcon(status))} alt="" draggable={false} />
      </span>
    </Tooltip>
  );
}

function settlementTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    village: '/assets/icons/I_Village.png', town: '/assets/icons/I_Town.png', city: '/assets/icons/I_City.png',
    metropolis: '/assets/icons/I_Metropolis.png', fortress: '/assets/icons/I_Fortress.png', monastery: '/assets/icons/I_Monastery.png',
    port: '/assets/icons/I_Port.png', mining: '/assets/icons/I_Mining.png',
  };
  return icons[normaliseToken(type)] ?? '/assets/icons/I_City.png';
}

function militaryKindIcon(kind: string): string {
  return militaryKindFilterValue(kind) === 'navy' ? '/assets/icons/I_Anchor.png' : '/assets/icons/I_Swords.png';
}

function buildingCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    economic: '/assets/icons/I_Economy.png', military: '/assets/icons/I_Swords.png', defensive: '/assets/icons/I_Fortification.png',
    infrastructure: '/assets/icons/I_Domain.png', cultural: '/assets/icons/I_Cultures.png', administrative: '/assets/icons/I_Ledger.png', naval: '/assets/icons/I_Anchor.png',
  };
  return icons[normaliseToken(category)] ?? '/assets/icons/I_BuildingsQuickButton.png';
}

function LedgerIconLabel({ icon, children }: { icon: string; children: ReactNode }) {
  return <span className="ledger-icon-label"><img src={WebkilnAssetPath(icon)} alt="" draggable={false} /><span>{children}</span></span>;
}

function LedgerMetric({ icon, children }: { icon: string; children: ReactNode }) {
  return <span className="ledger-metric"><img src={WebkilnAssetPath(icon)} alt="" draggable={false} /><span>{children}</span></span>;
}

function LedgerFactionLink({
  factionId, factionName, visual, diplomaticStatus, isPlayer, isRebel, onOpen,
}: {
  factionId: string; factionName: string; visual: LedgerFactionVisual; diplomaticStatus?: string; isPlayer?: boolean; isRebel?: boolean; onOpen: () => void;
}) {
  return (
    <div className="ledger-faction-link">
      <FactionRoundel factionId={factionId} name={factionName} colour={visual.colour} secondaryColour={visual.secondaryColour} cultureGroup={visual.cultureGroup} emblem={visual.emblem} resolveFaction={false} diplomaticStatus={diplomaticStatus} isPlayer={isPlayer} isRebel={isRebel} size="xs" onClick={onOpen} />
      <EntityLink type="faction" id={factionId}>{factionName}</EntityLink>
    </div>
  );
}

function notificationCategoryFilterValue(row: LedgerNotificationHistoryRow): string {
  return normaliseToken(row.category);
}

function militaryKindFilterValue(kind: string): string {
  return normaliseToken(kind) === 'navy' ? 'navy' : 'army';
}

function matchFilter(filterValue: string, rowValue: string): boolean {
  return filterValue === ALL_FILTER || filterValue === rowValue;
}

function uniqueFilterOptions<T>(
  rows: T[],
  allLabel: string,
  getValue: (row: T) => string,
  getLabel: (row: T, value: string) => string,
): FilterOption[] {
  const values = new Map<string, string>();
  rows.forEach(row => {
    const value = getValue(row).trim();
    if (!value || values.has(value)) return;
    values.set(value, getLabel(row, value));
  });
  const options = Array.from(values.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => compareSortValues(left.label, right.label));
  return [{ value: ALL_FILTER, label: allLabel }, ...options];
}

function LedgerFilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const safeValue = options.some(option => option.value === value) ? value : ALL_FILTER;
  return (
    <DropdownSelect
      className="ledger-filter"
      id={`ledger-${id}`}
      label={label}
      value={safeValue}
      options={options}
      escapeId={`ledger.filter.${id}`}
      isActive={safeValue !== ALL_FILTER}
      onChange={onChange}
    />
  );
}

function cellClassName<T>(column: Column<T>, kind: 'header' | 'body'): string {
  return [
    'ledger-cell',
    kind === 'header' ? 'ledger-header-cell' : 'ledger-body-cell',
    `ledger-cell--${column.id}`,
    kind === 'body' ? column.className ?? '' : '',
    column.align === 'right' ? 'ledger-cell--right' : '',
    column.align === 'centre' ? 'ledger-cell--centre' : '',
  ].filter(Boolean).join(' ');
}

function BulkTable<T>({
  rows,
  columns,
  search,
  onSearch,
  emptyLabel,
  searchLabel,
  filterPredicate,
  toolsExtra,
  virtualRowHeight,
  tableClassName = 'ledger-table',
  defaultSortDirection,
  sortState,
  onSortChange,
  serverFiltered = false,
}: {
  rows: T[];
  columns: Column<T>[];
  search: string;
  onSearch: (value: string) => void;
  emptyLabel: string;
  searchLabel: string;
  filterPredicate?: (row: T) => boolean;
  toolsExtra?: ReactNode;
  virtualRowHeight: number;
  tableClassName?: string;
  defaultSortDirection?: SortDirection;
  sortState?: LedgerSortState;
  onSortChange?: (sort: LedgerSortState) => void;
  serverFiltered?: boolean;
}) {
  return (
    <DataTable
      className="ledger-section"
      rows={rows}
      columns={columns}
      rowKey={(_row, index) => index}
      emptyLabel={emptyLabel}
      searchValue={search}
      onSearchChange={onSearch}
      searchPlaceholder={searchLabel}
      searchWrapClassName="ledger-search-wrap"
      searchPredicate={serverFiltered ? () => true : (row, query) => norm(JSON.stringify(row)).includes(query)}
      filterPredicate={serverFiltered ? undefined : filterPredicate}
      toolsExtra={toolsExtra}
      toolsClassName="ledger-tools"
      searchClassName="ledger-search"
      wrapperClassName="ledger-table-wrap"
      tableClassName={tableClassName}
      headerRowClassName="ledger-header-row"
      bodyScrollFrameClassName="ledger-body-scroll"
      bodyClassName="ledger-body"
      headerCellClassName={column => cellClassName(column, 'header')}
      bodyCellClassName={(_row, column) => cellClassName(column, 'body')}
      headerContentClassName="ledger-header-label"
      activeHeaderClassName="is-active"
      rowClassName="ledger-row"
      emptyClassName="ledger-empty"
      defaultSortKey={columns[0]?.id}
      defaultSortDirection={defaultSortDirection}
      sortState={sortState}
      onSortChange={onSortChange}
      virtualized
      virtualizeThreshold={50}
      virtualRowHeight={virtualRowHeight}
      virtualOverscan={10}
      fixedVirtualRows={false}
      styledScrollbar
    />
  );
}

export default function LedgerScreen({ onClose }: { onClose: () => void }) {
  const { openSidebar } = useGameActions();
  const [selectedBattleResultId, setSelectedBattleResultId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LedgerTab>('settlements');
  const [rowOffset, setRowOffset] = useState(0);
  const [sortByTab, setSortByTab] = useState<Record<LedgerTab, LedgerSortState>>(DEFAULT_LEDGER_SORTS);
  const isPagedTab = activeTab === 'settlements' || activeTab === 'buildings';
  const rowLimit = isPagedTab ? LEDGER_PAGE_SIZE : 0;
  const activeSort = sortByTab[activeTab] ?? DEFAULT_LEDGER_SORTS[activeTab];
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<LedgerFilters>(DEFAULT_FILTERS);
  const [virtualRowHeight, setVirtualRowHeight] = useState(60);
  const [summaryCounts, setSummaryCounts] = useState<LedgerSummaryCounts | null>(null);
  const bridgeFilters = useMemo(() => ({
    searchText: isPagedTab ? search : '',
    settlementFactionFilter: activeTab === 'settlements' ? filters.settlementFaction : ALL_FILTER,
    settlementTypeFilter: activeTab === 'settlements' ? filters.settlementType : ALL_FILTER,
    settlementRegionFilter: activeTab === 'settlements' ? filters.settlementRegion : ALL_FILTER,
    buildingCategoryFilter: activeTab === 'buildings' ? filters.buildingCategory : ALL_FILTER,
    buildingFactionFilter: activeTab === 'buildings' ? filters.buildingFaction : ALL_FILTER,
  }), [
    activeTab,
    filters.buildingCategory,
    filters.buildingFaction,
    filters.settlementFaction,
    filters.settlementRegion,
    filters.settlementType,
    isPagedTab,
    search,
  ]);
  const data = useLedgerOverviewBridge(activeTab, rowOffset, rowLimit, isPagedTab ? activeSort : undefined, bridgeFilters);

  const settlements = data?.settlements ?? EMPTY_SETTLEMENTS;
  const militaries = data?.militaries ?? EMPTY_MILITARIES;
  const factions = data?.factions ?? EMPTY_FACTIONS;
  const resources = data?.resources ?? EMPTY_RESOURCES;
  const buildings = data?.buildings ?? EMPTY_BUILDINGS;
  const notifications = data?.notifications ?? EMPTY_NOTIFICATIONS;

  const battleResultNotification = useMemo<BattleAfterActionNotification | null>(() => {
    const row = notifications.find(notification => notification.id === selectedBattleResultId);
    if (!row) return null;
    const report = normaliseBattleAfterActionReport(row.battleAfterActionReport);
    if (!report) return null;
    return {
      title: row.titleHtml,
      description: row.bodyHtml,
      battleAfterActionReport: report,
    };
  }, [notifications, selectedBattleResultId]);

  useEffect(() => {
    if (!data) return;
    setSummaryCounts({
      settlementCount: data.settlementCount,
      militaryCount: data.militaryCount,
      factionCount: data.factionCount,
      resourceCount: data.resourceCount,
      buildingCount: data.buildingCount,
      notificationCount: data.notificationCount,
    });
  }, [data]);

  const setFilter = (key: LedgerFilterKey, value: string) => {
    if (
      key === 'settlementFaction'
      || key === 'settlementType'
      || key === 'settlementRegion'
      || key === 'buildingCategory'
      || key === 'buildingFaction'
    ) {
      setRowOffset(0);
    }
    setFilters(current => ({ ...current, [key]: value }));
  };

  const setLedgerSearch = (value: string) => {
    if (isPagedTab) {
      setRowOffset(0);
    }
    setSearch(value);
  };

  const setLedgerSort = useCallback((sort: LedgerSortState) => {
    if (isPagedTab) {
      setRowOffset(0);
    }
    setSortByTab(current => ({ ...current, [activeTab]: sort }));
  }, [activeTab, isPagedTab]);

  const handleRichLinkClick = useCallback((type: string, id: string) => {
    const sidebarType = sidebarTypeForEntity(type);
    if (sidebarType) openSidebar(sidebarType, id);
  }, [openSidebar]);

  const renderLedgerRichText = useCallback((text: string) => renderRichText(text, {
    onLinkClick: handleRichLinkClick,
    keepLinksWithPreviousWord: true,
    linkClassPrefix: 'ledger-rich-link',
  }), [handleRichLinkClick]);

  useEffect(() => {
    const updateVirtualRowHeight = () => {
      const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
      const safeFontSize = Number.isFinite(rootFontSize) && rootFontSize > 0
        ? rootFontSize
        : UI_PRESENTATION.rootFontSizePx;
      setVirtualRowHeight(Math.ceil(safeFontSize * LEDGER_ROW_HEIGHT_REM));
    };

    updateVirtualRowHeight();
    window.addEventListener('resize', updateVirtualRowHeight);
    window.addEventListener('webkiln:runtime-viewport', updateVirtualRowHeight);
    return () => {
      window.removeEventListener('resize', updateVirtualRowHeight);
      window.removeEventListener('webkiln:runtime-viewport', updateVirtualRowHeight);
    };
  }, []);

  const tabs = [
    { id: 'settlements', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.196.1'), icon: '/assets/icons/I_City.png', count: summaryCounts?.settlementCount ?? data?.settlementCount ?? settlements.length },
    { id: 'militaries', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.197.2'), icon: '/assets/icons/I_Swords.png', count: summaryCounts?.militaryCount ?? data?.militaryCount ?? militaries.length },
    { id: 'factions', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.198.3'), icon: '/assets/icons/I_IndependentFactions.png', count: summaryCounts?.factionCount ?? data?.factionCount ?? factions.length },
    { id: 'resources', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.199.4'), icon: '/assets/icons/I_Resources.png' },
    { id: 'buildings', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.200.5'), icon: '/assets/icons/I_BuildingsQuickButton.png' },
    { id: 'notifications', label: webUIText('Ledger.Tab.Notifications'), icon: '/assets/icons/I_Warning.png' },
  ];

  const activeRowCount = activeTab === 'settlements'
    ? (data?.filteredSettlementCount ?? data?.settlementCount ?? settlements.length)
    : activeTab === 'buildings'
      ? (data?.filteredBuildingCount ?? data?.buildingCount ?? buildings.length)
      : 0;
  const activePageRowCount = activeTab === 'settlements'
    ? settlements.length
    : activeTab === 'buildings'
      ? buildings.length
      : 0;
  const pageStart = isPagedTab && activeRowCount > 0 ? rowOffset + 1 : 0;
  const pageEnd = Math.min(rowOffset + activePageRowCount, activeRowCount);
  const canPageBack = isPagedTab && rowOffset > 0;
  const canPageForward = isPagedTab && rowOffset + rowLimit < activeRowCount;
  const pageRowsBack = () => setRowOffset(Math.max(0, rowOffset - LEDGER_PAGE_SIZE));
  const pageRowsForward = () => setRowOffset(rowOffset + LEDGER_PAGE_SIZE);

  const pageControls = isPagedTab ? (
    <div className="ledger-page-controls">
      <GameButton
        variant="outline"
        className="ledger-page-button"
        icon={WebkilnAssetPath('/assets/icons/I_NavPrevious.png')}
        disabled={!canPageBack}
        onClick={pageRowsBack}
      />
      <span className="ledger-page-label">
        {webUIText('ConvoyFilter.Shown')} {fmt(pageStart)}-{fmt(pageEnd)} / {fmt(activeRowCount)}
      </span>
      <GameButton
        variant="outline"
        className="ledger-page-button"
        icon={WebkilnAssetPath('/assets/icons/I_NavNext.png')}
        disabled={!canPageForward}
        onClick={pageRowsForward}
      />
    </div>
  ) : null;

  const allLabel = webUIText('Common.All');
  const filterOptions = useMemo(() => ({
    settlementFaction: uniqueFilterOptions(settlements, allLabel, row => row.factionId, row => row.factionName),
    settlementType: uniqueFilterOptions(settlements, allLabel, row => normaliseToken(row.type), (_row, value) => settlementTypeLabel(value)),
    settlementRegion: uniqueFilterOptions(settlements, allLabel, row => row.region, (_row, value) => value),
    militaryFaction: uniqueFilterOptions(militaries, allLabel, row => row.factionId, row => row.factionName),
    militaryKind: uniqueFilterOptions(militaries, allLabel, row => militaryKindFilterValue(row.kind), (_row, value) => webUIText(value === 'navy' ? 'Common.Fleet' : 'Common.Army')),
    factionStatus: uniqueFilterOptions(factions, allLabel, row => statusFilterValue(row), row => statusLabel(row.diplomaticStatus, row.isRebel)),
    resourceCategory: uniqueFilterOptions(resources, allLabel, row => normaliseToken(row.category), (_row, value) => resourceCategoryLabel(value)),
    buildingCategory: uniqueFilterOptions(buildings, allLabel, row => normaliseToken(row.category), (_row, value) => buildingCategoryLabel(value)),
    buildingFaction: uniqueFilterOptions(buildings, allLabel, row => row.factionId, row => row.factionName),
    notificationCategory: uniqueFilterOptions(notifications, allLabel, row => notificationCategoryFilterValue(row), row => row.categoryLabel),
  }), [allLabel, buildings, factions, militaries, notifications, resources, settlements]);

  const activeFilters = (() => {
    if (activeTab === 'settlements') {
      return (
        <div className="ledger-filters">
          <LedgerFilterSelect id="settlement-faction" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.210.7')} value={filters.settlementFaction} options={filterOptions.settlementFaction} onChange={value => setFilter('settlementFaction', value)} />
          <LedgerFilterSelect id="settlement-type" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.211.8')} value={filters.settlementType} options={filterOptions.settlementType} onChange={value => setFilter('settlementType', value)} />
          <LedgerFilterSelect id="settlement-region" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.212.9')} value={filters.settlementRegion} options={filterOptions.settlementRegion} onChange={value => setFilter('settlementRegion', value)} />
          {pageControls}
        </div>
      );
    }
    if (activeTab === 'militaries') {
      return (
        <div className="ledger-filters">
          <LedgerFilterSelect id="military-faction" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.222.16')} value={filters.militaryFaction} options={filterOptions.militaryFaction} onChange={value => setFilter('militaryFaction', value)} />
          <LedgerFilterSelect id="military-kind" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.223.17')} value={filters.militaryKind} options={filterOptions.militaryKind} onChange={value => setFilter('militaryKind', value)} />
        </div>
      );
    }
    if (activeTab === 'factions') {
      return (
        <div className="ledger-filters">
          <LedgerFilterSelect id="faction-status" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.234.25')} value={filters.factionStatus} options={filterOptions.factionStatus} onChange={value => setFilter('factionStatus', value)} />
        </div>
      );
    }
    if (activeTab === 'resources') {
      return (
        <div className="ledger-filters">
          <LedgerFilterSelect id="resource-category" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.246.34')} value={filters.resourceCategory} options={filterOptions.resourceCategory} onChange={value => setFilter('resourceCategory', value)} />
        </div>
      );
    }
    if (activeTab === 'notifications') {
      return (
        <div className="ledger-filters">
          <LedgerFilterSelect id="notification-category" label={webUIText('Ledger.Filter.Category')} value={filters.notificationCategory} options={filterOptions.notificationCategory} onChange={value => setFilter('notificationCategory', value)} />
        </div>
      );
    }
    return (
      <div className="ledger-filters">
        <LedgerFilterSelect id="building-category" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.256.41')} value={filters.buildingCategory} options={filterOptions.buildingCategory} onChange={value => setFilter('buildingCategory', value)} />
        <LedgerFilterSelect id="building-faction" label={webUIText('Auto.Prop.ComponentsScreensLedgerScreen.259.44')} value={filters.buildingFaction} options={filterOptions.buildingFaction} onChange={value => setFilter('buildingFaction', value)} />
        {pageControls}
      </div>
    );
  })();

  const settlementColumns: Column<LedgerSettlementRow>[] = [
    {
      id: 'name',
      label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.206.6'),
      render: row => <LedgerIconLabel icon={settlementTypeIcon(row.type)}><EntityLink type="settlement" id={row.id}>{row.name}</EntityLink></LedgerIconLabel>,
      sortValue: row => row.name,
    },
    { id: 'faction', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.210.7'), render: row => <LedgerFactionLink factionId={row.factionId} factionName={row.factionName} visual={row.factionVisual} onOpen={() => openSidebar('faction', row.factionId)} />, sortValue: row => row.factionName },
    { id: 'type', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.211.8'), render: row => <LedgerIconLabel icon={settlementTypeIcon(row.type)}>{settlementTypeLabel(row.type)}</LedgerIconLabel>, sortValue: row => settlementTypeLabel(row.type) },
    { id: 'region', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.212.9'), render: row => row.region || '-', sortValue: row => row.region },
    { id: 'population', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.213.10'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Population.png">{fmt(row.population)}</LedgerMetric>, sortValue: row => row.population },
    { id: 'income', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.214.11'), align: 'right', className: 'ledger-value', render: row => <LedgerMetric icon="/assets/icons/I_Coins.png">{signed(row.income)}</LedgerMetric>, sortValue: row => row.income },
    { id: 'food', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.215.12'), align: 'right', className: 'ledger-value', render: row => <LedgerMetric icon="/assets/icons/I_Food.png">{signed(row.foodProduction - row.foodConsumption)}</LedgerMetric>, sortValue: row => row.foodProduction - row.foodConsumption },
    { id: 'unrest', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.216.13'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Unrest.png">{`${fmt1(row.unrest)}%`}</LedgerMetric>, sortValue: row => row.unrest },
    { id: 'buildings', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.217.14'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_BuildingsQuickButton.png">{fmt(row.buildingCount)}</LedgerMetric>, sortValue: row => row.buildingCount },
  ];

  const militaryColumns: Column<LedgerMilitaryRow>[] = [
    { id: 'name', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.221.15'), render: row => <LedgerIconLabel icon={militaryKindIcon(row.kind)}><EntityLink type="military" id={row.id}>{row.name}</EntityLink></LedgerIconLabel>, sortValue: row => row.name },
    { id: 'faction', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.222.16'), render: row => <LedgerFactionLink factionId={row.factionId} factionName={row.factionName} visual={row.factionVisual} onOpen={() => openSidebar('faction', row.factionId)} />, sortValue: row => row.factionName },
    { id: 'kind', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.223.17'), render: row => <LedgerIconLabel icon={militaryKindIcon(row.kind)}>{webUIText(row.kind === 'navy' ? 'Common.Fleet' : 'Common.Army')}</LedgerIconLabel>, sortValue: row => row.kind },
    { id: 'commander', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.224.18'), render: row => <EntityLink type="character" id={row.commanderId}>{row.commanderName || webUIText('Common.NoCommander')}</EntityLink>, sortValue: row => row.commanderName },
    { id: 'strength', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.225.19'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Swords.png">{`${fmt(row.strength)} / ${fmt(row.maxStrength)}`}</LedgerMetric>, sortValue: row => row.strength },
    { id: 'morale', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.226.20'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Loyalty.png">{`${fmt(row.morale)}%`}</LedgerMetric>, sortValue: row => row.morale },
    { id: 'upkeep', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.227.21'), align: 'right', className: 'ledger-value ledger-value--bad', render: row => <LedgerMetric icon="/assets/icons/I_Coins.png">{`-${fmt(row.upkeep)}`}</LedgerMetric>, sortValue: row => row.upkeep },
    { id: 'supply', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.228.22'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Food.png">{webUIText('Common.DayAbbrevValue', { Days: fmt(row.supplyDays) })}</LedgerMetric>, sortValue: row => row.supplyDays },
    { id: 'location', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.229.23'), render: row => row.location || '-', sortValue: row => row.location },
  ];

  const factionColumns: Column<LedgerFactionRow>[] = [
    { id: 'name', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.233.24'), render: row => <LedgerFactionLink factionId={row.id} factionName={row.name} visual={row.visual} diplomaticStatus={row.diplomaticStatus} isPlayer={row.isPlayer} isRebel={row.isRebel} onOpen={() => openSidebar('faction', row.id)} />, sortValue: row => row.name },
    { id: 'status', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.234.25'), align: 'centre', render: row => <FactionStatusIcon row={row} />, sortValue: row => statusLabel(row.diplomaticStatus, row.isRebel) },
    { id: 'ruler', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.235.26'), render: row => <EntityLink type="character" id={row.rulerId}>{row.rulerName || webUIText("Auto.Fix.ExprFallback.componentsscreensLedgerScreen.235.1")}</EntityLink>, sortValue: row => row.rulerName },
    { id: 'settlements', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.236.27'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_City.png">{fmt(row.settlementCount)}</LedgerMetric>, sortValue: row => row.settlementCount },
    { id: 'population', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.237.28'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Population.png">{fmt(row.population)}</LedgerMetric>, sortValue: row => row.population },
    { id: 'strength', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.238.29'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Swords.png">{fmt(row.strength)}</LedgerMetric>, sortValue: row => row.strength },
    { id: 'forces', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.239.30'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_ArmiesQuickButton.png">{`${fmt(row.armyCount)} / ${fmt(row.navyCount)}`}</LedgerMetric>, sortValue: row => row.armyCount + row.navyCount },
    { id: 'gold', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.240.31'), align: 'right', className: 'ledger-value', render: row => <LedgerMetric icon="/assets/icons/I_Coins.png">{fmt(row.gold)}</LedgerMetric>, sortValue: row => row.gold },
    { id: 'income', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.241.32'), align: 'right', className: 'ledger-value', render: row => <LedgerMetric icon="/assets/icons/I_Coins.png">{signed(row.income)}</LedgerMetric>, sortValue: row => row.income },
  ];

  const resourceColumns: Column<LedgerResourceRow>[] = [
    { id: 'name', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.245.33'), render: row => <ResourceLabel resourceId={row.id} name={row.name} className="ledger-resource" />, sortValue: row => row.name },
    { id: 'category', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.246.34'), render: row => resourceCategoryLabel(row.category), sortValue: row => resourceCategoryLabel(row.category) },
    { id: 'stockpile', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.247.35'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Resources.png">{fmt1(row.stockpile)}</LedgerMetric>, sortValue: row => row.stockpile },
    { id: 'production', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.248.36'), align: 'right', className: 'ledger-value ledger-value--good', render: row => <LedgerMetric icon="/assets/icons/I_Plus.png">{`+${fmt1(row.production)}`}</LedgerMetric>, sortValue: row => row.production },
    { id: 'consumption', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.249.37'), align: 'right', className: 'ledger-value ledger-value--bad', render: row => <LedgerMetric icon="/assets/icons/I_Minus.png">{`-${fmt1(row.consumption)}`}</LedgerMetric>, sortValue: row => row.consumption },
    { id: 'net', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.250.38'), align: 'right', className: 'ledger-value', render: row => <LedgerMetric icon="/assets/icons/I_Chart.png">{signed(row.netPerMonth)}</LedgerMetric>, sortValue: row => row.netPerMonth },
    { id: 'settlements', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.251.39'), align: 'right', render: row => fmt(row.settlementCount), sortValue: row => row.settlementCount },
  ];

  const buildingColumns: Column<LedgerBuildingRow>[] = [
    { id: 'name', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.255.40'), render: row => <LedgerIconLabel icon={buildingCategoryIcon(row.category)}>{row.name}</LedgerIconLabel>, sortValue: row => row.name },
    { id: 'category', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.256.41'), render: row => <LedgerIconLabel icon={buildingCategoryIcon(row.category)}>{buildingCategoryLabel(row.category)}</LedgerIconLabel>, sortValue: row => buildingCategoryLabel(row.category) },
    { id: 'level', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.257.42'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_BuildingUpgraded.png">{`${fmt(row.level)} / ${fmt(row.maxLevel)}`}</LedgerMetric>, sortValue: row => row.level },
    { id: 'settlement', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.258.43'), render: row => <EntityLink type="settlement" id={row.settlementId}>{row.settlementName}</EntityLink>, sortValue: row => row.settlementName },
    { id: 'faction', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.259.44'), render: row => <LedgerFactionLink factionId={row.factionId} factionName={row.factionName} visual={row.factionVisual} onOpen={() => openSidebar('faction', row.factionId)} />, sortValue: row => row.factionName },
    { id: 'upkeep', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.260.45'), align: 'right', className: 'ledger-value ledger-value--bad', render: row => <LedgerMetric icon="/assets/icons/I_Coins.png">{row.upkeep > 0 ? `-${fmt(row.upkeep)}` : '0'}</LedgerMetric>, sortValue: row => row.upkeep },
    { id: 'condition', label: webUIText('Auto.Prop.ComponentsScreensLedgerScreen.261.46'), align: 'right', render: row => <LedgerMetric icon="/assets/icons/I_Fortification.png">{`${fmt1(row.condition)}%`}</LedgerMetric>, sortValue: row => row.condition },
  ];

  const notificationColumns: Column<LedgerNotificationHistoryRow>[] = [
    { id: 'date', label: webUIText('Ledger.Column.Date'), render: row => row.date || '-', sortValue: row => row.gameDate },
    {
      id: 'category',
      label: webUIText('Ledger.Filter.Category'),
      render: row => (
        <span className={`ledger-notification-category ledger-notification-category--${notificationCategoryFilterValue(row)}`}>
          <img src={WebkilnAssetPath(row.icon)} alt="" draggable={false} />
          <span>{row.categoryLabel}</span>
        </span>
      ),
      sortValue: row => row.categoryLabel,
    },
    {
      id: 'event',
      label: webUIText('Ledger.Column.Event'),
      render: row => (
        <span className="ledger-notification-event">
          <span className="ledger-notification-title">
            {renderLedgerRichText(row.titleHtml)}
          </span>
          <span className="ledger-notification-body">
            {renderLedgerRichText(row.bodyHtml)}
          </span>
        </span>
      ),
      sortValue: row => row.titleHtml,
      searchValue: row => `${row.titleHtml} ${row.bodyHtml}`,
    },
    {
      id: 'decision',
      label: webUIText('Ledger.Column.Decision'),
      align: 'centre',
      render: row => row.hasDecision
        ? <span className={`ledger-notification-decision${row.isAccepted ? ' ledger-notification-decision--accepted' : ' ledger-notification-decision--declined'}`}>{row.decision}</span>
        : '-',
      sortValue: row => row.decision,
    },
    {
      id: 'details',
      label: webUIText('Common.View'),
      align: 'centre',
      sortable: false,
      render: row => row.battleAfterActionReport.available
        ? (
          <GameButton
            variant="outline"
            className="ledger-battle-result-button"
            onClick={() => setSelectedBattleResultId(row.id)}
          >
            {webUIText('Common.View')}
          </GameButton>
        )
        : '-',
    },
  ];

  const table = (() => {
    if (activeTab === 'settlements') {
      return <BulkTable rows={settlements} columns={settlementColumns} search={search} onSearch={setLedgerSearch} emptyLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.266.1')} searchLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.266.2')} toolsExtra={activeFilters} virtualRowHeight={virtualRowHeight} sortState={activeSort} onSortChange={setLedgerSort} serverFiltered filterPredicate={row => matchFilter(filters.settlementFaction, row.factionId) && matchFilter(filters.settlementType, normaliseToken(row.type)) && matchFilter(filters.settlementRegion, row.region)} />;
    }
    if (activeTab === 'militaries') {
      return <BulkTable rows={militaries} columns={militaryColumns} search={search} onSearch={setLedgerSearch} emptyLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.269.3')} searchLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.269.4')} toolsExtra={activeFilters} virtualRowHeight={virtualRowHeight} filterPredicate={row => matchFilter(filters.militaryFaction, row.factionId) && matchFilter(filters.militaryKind, militaryKindFilterValue(row.kind))} />;
    }
    if (activeTab === 'factions') {
      return <BulkTable rows={factions} columns={factionColumns} search={search} onSearch={setLedgerSearch} emptyLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.272.5')} searchLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.272.6')} toolsExtra={activeFilters} virtualRowHeight={virtualRowHeight} filterPredicate={row => matchFilter(filters.factionStatus, statusFilterValue(row))} />;
    }
    if (activeTab === 'resources') {
      return <BulkTable rows={resources} columns={resourceColumns} search={search} onSearch={setLedgerSearch} emptyLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.275.7')} searchLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.275.8')} toolsExtra={activeFilters} virtualRowHeight={virtualRowHeight} tableClassName="ledger-table ledger-table--resources" filterPredicate={row => matchFilter(filters.resourceCategory, normaliseToken(row.category))} />;
    }
    if (activeTab === 'buildings') {
      return <BulkTable rows={buildings} columns={buildingColumns} search={search} onSearch={setLedgerSearch} emptyLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.278.9')} searchLabel={webUIText('Auto.ExtraAttr.ComponentsScreensLedgerScreen.278.10')} toolsExtra={activeFilters} virtualRowHeight={virtualRowHeight} sortState={activeSort} onSortChange={setLedgerSort} serverFiltered filterPredicate={row => matchFilter(filters.buildingCategory, normaliseToken(row.category)) && matchFilter(filters.buildingFaction, row.factionId)} />;
    }
    if (activeTab === 'notifications') {
      return <BulkTable rows={notifications} columns={notificationColumns} search={search} onSearch={setLedgerSearch} emptyLabel={webUIText('Ledger.Empty.Notifications')} searchLabel={webUIText('Ledger.Search.Notifications')} toolsExtra={activeFilters} virtualRowHeight={virtualRowHeight} defaultSortDirection="desc" filterPredicate={row => matchFilter(filters.notificationCategory, notificationCategoryFilterValue(row))} />;
    }
    return null;
  })();

  return (
    <>
      <ScreenShell
        title={webUIText('Auto.Attr.ComponentsScreensLedgerScreen.285.47')}
        onClose={onClose}
        advisorTopic="ledgerScreen"
        tabs={<SidebarTabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => { const nextTab = id as LedgerTab; setActiveTab(nextTab); setSearch(''); setRowOffset(0); }} />}
        className="screen--ledger"
        contentClassName="ledger-content"
      >
        <div className="ledger-wrap">{table}</div>
      </ScreenShell>
      <BattleAfterActionModal
        notification={battleResultNotification}
        open={battleResultNotification !== null}
        onClose={() => setSelectedBattleResultId(null)}
        onLinkClick={handleRichLinkClick}
      />
    </>
  );
}

registerTopbarButton({
  id: 'ledger',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensLedgerScreen.299.1'); },
  icon: '/assets/icons/I_Ledger.png',
  placement: 'right',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensLedgerScreen.303.2'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensLedgerScreen.304.3'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensLedgerScreen.306.4'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensLedgerScreen.307.5'); } },
    ],
  },
  order: 50,
});
registerScreen({
  id: 'ledger',
  render: ({ onClose }) => <LedgerScreen onClose={onClose} />,
  topbarId: 'ledger',
  advisorTopic: 'ledgerScreen',
});

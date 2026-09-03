import { Fragment, memo, useMemo, useState, type Key, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import Tooltip from '../../common/tooltips/Tooltip';
import EntityLink from '../../common/entities/EntityLink';
import CourtOfficeSummary from '../../common/entities/CourtOfficeSummary';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import CourtAppointmentModal from '../../modals/characters/CourtAppointmentModal';
import { useGameState } from '../../../context/GameContext';
import { useCourtPositions } from '../../../data-source/index';
import {
  adjustEconomySubjectTaxRateBridge,
  setResourcePriorityBridge,
  useEconomyOverviewBridge,
} from '../../../bridge/settlements-economy/useEconomyOverviewBridge';
import type {
  CommandUpkeepEntry,
  EconomyOverviewMilitaryRow,
  EconomyOverviewResourceAmount,
  EconomyOverviewSettlementRow,
  EconomyOverviewTaxRow,
  EconomyOverviewVassalRow,
  GetEconomyOverviewResponse,
  GetIncomeBreakdownResponse,
  IncomeEntry,
} from '../../../bridge-types.generated.ts';
import { useBridgeQuery } from '../../../bridge/core/useBridgeQuery';
import type { CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import {
  formatNumber,
  formatResourceNumber,
  formatSignedResourceNumber,
} from '../../../utils/numberFormat';
import type { SortDirection } from '../../common/layout/tables/sortUtils';
import { webUIText, useWebUIText, type WebUITextFormatter } from '../../../localization/WebUITextContext';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import ResourceWorkspace from './ResourceWorkspace';
import './EconomyScreen.css';

type EconomyTab = 'overview' | 'settlements' | 'military' | 'provinces';
type EconomyMetricKey =
  | 'settlementIncome'
  | 'tradeIncome'
  | 'resourceSalesIncome'
  | 'vassalTributeIncome'
  | 'treatyTributeIncome'
  | 'eventIncome'
  | 'lootingIncome'
  | 'otherIncome'
  | 'armyExpense'
  | 'commandMaintenanceExpense'
  | 'treasuryDampeningExpense'
  | 'replenishmentExpense'
  | 'buildingExpense'
  | 'tributePaidToLiege'
  | 'treatyTributePaid'
  | 'eventExpense'
  | 'powerBlocExpense'
  | 'landownerInterestExpense'
  | 'autoAssignCommanderExpense'
  | 'otherExpense'
  | 'treasuryAdjustmentIncome'
  | 'treasuryAdjustmentExpense';

interface MetricDef {
  key: EconomyMetricKey;
  labelKey: string;
}

type EconomyColumn<T> = DataTableColumn<T>;

const INCOME_ROWS: MetricDef[] = [
  { key: 'settlementIncome', labelKey: 'Economy.SettlementTax' },
  { key: 'tradeIncome', labelKey: 'Economy.Trade' },
  { key: 'vassalTributeIncome', labelKey: 'Economy.SubjectTribute' },
  { key: 'resourceSalesIncome', labelKey: 'Economy.ResourceSales' },
  { key: 'treatyTributeIncome', labelKey: 'Economy.Treaties' },
  { key: 'eventIncome', labelKey: 'Economy.Events' },
  { key: 'lootingIncome', labelKey: 'Economy.Looting' },
  { key: 'otherIncome', labelKey: 'Economy.Other' },
];

const EXPENSE_ROWS: MetricDef[] = [
  { key: 'armyExpense', labelKey: 'Economy.ArmyUpkeep' },
  { key: 'commandMaintenanceExpense', labelKey: 'Economy.Commanders' },
  { key: 'treasuryDampeningExpense', labelKey: 'Economy.Leakage' },
  { key: 'buildingExpense', labelKey: 'Economy.Buildings' },
  { key: 'replenishmentExpense', labelKey: 'Economy.Replenishment' },
  { key: 'tributePaidToLiege', labelKey: 'Economy.ImperialTribute' },
  { key: 'treatyTributePaid', labelKey: 'Economy.TreatyPayments' },
  { key: 'eventExpense', labelKey: 'Economy.Events' },
  { key: 'powerBlocExpense', labelKey: 'Economy.PowerBloc' },
  { key: 'landownerInterestExpense', labelKey: 'Economy.SenateInterest' },
  { key: 'autoAssignCommanderExpense', labelKey: 'Economy.AutoCommanders' },
  { key: 'otherExpense', labelKey: 'Economy.Other' },
];

function fmt(value: number | undefined): string {
  return formatNumber(value);
}

function fmt1(value: number | undefined): string {
  return formatResourceNumber(value);
}

function negativeFmt(value: number | undefined): string {
  const formatted = fmt(value);
  return formatted === '0' ? '0' : `-${formatted}`;
}

function resource(value: number | undefined): string {
  return formatResourceNumber(value);
}

function negativeResource(value: number | undefined): string {
  const formatted = resource(value);
  return formatted === '0' ? '0' : `-${formatted}`;
}

function signedResource(value: number | undefined): string {
  return formatSignedResourceNumber(value);
}

function signed(value: number | undefined, suffix = ''): string {
  return `${formatSignedResourceNumber(value)}${suffix}`;
}

function money(value: number | undefined, t: WebUITextFormatter): string {
  return `${signed(value)}${t('Economy.PerMonth')}`;
}

function valueClass(value: number | undefined): string {
  const next = value ?? 0;
  if (next > 0) return 'econ-positive';
  if (next < 0) return 'econ-negative';
  return 'econ-neutral';
}

function ratePercent(value: number | undefined): number {
  const next = Number(value ?? 0);
  return Math.abs(next) <= 1 ? next * 100 : next;
}

function displayRate(value: number | undefined): string {
  return `${fmt1(ratePercent(value))}%`;
}

function metric(data: GetEconomyOverviewResponse | null, key: EconomyMetricKey): number {
  if (key === 'treasuryAdjustmentIncome') return Math.max(0, data?.treasuryAdjustment ?? 0);
  if (key === 'treasuryAdjustmentExpense') return Math.max(0, -(data?.treasuryAdjustment ?? 0));
  return Number(data?.[key] ?? 0);
}

function useIncomeBreakdown(enabled: boolean): GetIncomeBreakdownResponse | null {
  return useBridgeQuery({
    action: 'game.get_income_breakdown',
    fetch: enabled,
    cacheResponseMs: 1000,
    map: data => data,
  });
}

function priorityLabel(priority: string, t: WebUITextFormatter): string {
  if (!priority) return '-';
  const labels: Record<string, string> = {
    low: t('Economy.Low'),
    normal: t('Economy.Normal'),
    high: t('Economy.High'),
    critical: t('Economy.Critical'),
  };
  return labels[priority] ?? priority;
}

function priorityShortLabel(priority: string): string {
  const key = priority.toLowerCase();
  if (key === 'low') return 'I';
  if (key === 'high') return 'III';
  return 'II';
}

function ResourceAmountTags({
  values,
  tone,
  limit = 4,
}: {
  values: EconomyOverviewResourceAmount[];
  tone: 'positive' | 'negative';
  limit?: number;
}) {
  if (values.length === 0) return <span className="econ-muted">-</span>;
  const visible = values.slice(0, limit);
  const sign = tone === 'negative' ? '-' : '+';
  const className = tone === 'negative' ? 'econ-negative' : 'econ-positive';
  return (
    <span className="econ-resource-tags">
      {visible.map((value, index) => (
        <span key={`${value.id}:${index}`} className={`econ-resource-tag ${className}`}>
          {index > 0 && <span className="econ-resource-tag-sep">/</span>}
          {value.name} {sign}{resource(value.amount)}
        </span>
      ))}
      {values.length > visible.length && <span className="econ-muted"> +{formatNumber(values.length - visible.length)}</span>}
    </span>
  );
}

function DetailPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="econ-detail-panel">
      <div className="econ-detail-panel-title">{title}</div>
      <div className="econ-detail-panel-body">{children}</div>
    </div>
  );
}

function ResourceAmountDetail({ values, tone }: { values: EconomyOverviewResourceAmount[]; tone: 'positive' | 'negative' }) {
  const className = tone === 'positive' ? 'econ-positive' : 'econ-negative';
  const sign = tone === 'positive' ? '+' : '-';
  return (
    <div className="econ-detail-grid">
      {values.length === 0 ? (
        <span className="econ-muted">-</span>
      ) : values.map((value, index) => (
        <div key={`${value.id}:${index}`} className="econ-detail-item">
          <span className="econ-detail-name">{value.name}</span>
          <span className={`econ-detail-value ${className}`}>{sign}{resource(value.amount)}</span>
        </div>
      ))}
    </div>
  );
}

interface TaxLossEntry {
  label: string;
  value: number;
}

function taxLossEntries(row: EconomyOverviewTaxRow, t: WebUITextFormatter): TaxLossEntry[] {
  return [
    { label: t('Economy.Blockade'), value: row.blockadeLoss },
    { label: t('Economy.Culture'), value: row.culturalLoss },
    { label: t('Economy.Corruption'), value: row.corruptionLoss },
    { label: t('Economy.Ungoverned'), value: row.ungovernedLoss },
    { label: t('Economy.Compliance'), value: row.complianceLoss },
  ].filter(loss => Math.round(loss.value) > 0);
}

function taxLossSummary(losses: TaxLossEntry[], t: WebUITextFormatter): string {
  if (losses.length === 0) return t('Common.None');
  return losses
    .map(loss => t('Economy.LossEntry', { Name: loss.label, Value: fmt(loss.value) }))
    .join(t('Economy.LossSeparator'));
}

function TaxLossDetail({ row }: { row: EconomyOverviewTaxRow }) {
  const t = useWebUIText();
  const losses = taxLossEntries(row, t);
  return (
    <div className="econ-detail-grid">
      {losses.length === 0 ? <span className="econ-muted">{t('Common.None')}</span> : losses.map(loss => (
        <div key={loss.label} className="econ-detail-item">
          <span className="econ-detail-name">{loss.label}</span>
          <span className="econ-detail-value econ-negative">-{fmt(loss.value)}</span>
        </div>
      ))}
    </div>
  );
}

function economyHeaderCellClass<T>(column: EconomyColumn<T>): string {
  return [
    'econ-table-cell',
    'econ-table-header-cell',
    column.align === 'right' ? 'econ-th--right' : '',
    column.align === 'centre' ? 'econ-th--centre' : '',
  ].filter(Boolean).join(' ');
}

function economyBodyCellClass<T>(column: EconomyColumn<T>): string {
  return [
    'econ-table-cell',
    'econ-table-body-cell',
    column.className ?? '',
    column.align === 'right' ? 'econ-td--right' : '',
    column.align === 'centre' ? 'econ-td--centre' : '',
  ].filter(Boolean).join(' ');
}

function EconomyDataTable<T>({
  rows,
  columns,
  emptyLabel,
  initialSort,
  initialSortDir = 'desc',
  rowKey,
  wrapClassName = '',
  tableClassName = '',
  virtualRowHeight = 36,
  virtualizeThreshold = 24,
}: {
  rows: T[];
  columns: EconomyColumn<T>[];
  emptyLabel: string;
  initialSort?: string;
  initialSortDir?: SortDirection;
  rowKey?: (row: T, index: number) => Key;
  wrapClassName?: string;
  tableClassName?: string;
  virtualRowHeight?: number;
  virtualizeThreshold?: number;
}) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={rowKey}
      emptyLabel={emptyLabel}
      wrapperClassName={`econ-table-wrap${wrapClassName ? ` ${wrapClassName}` : ''}`}
      tableClassName={`econ-table${tableClassName ? ` ${tableClassName}` : ''}`}
      headerGroupClassName="econ-table-head"
      headerRowClassName="econ-table-row econ-table-row--head"
      bodyClassName="econ-table-body"
      headerContentClassName="econ-table-th-content"
      headerCellClassName={economyHeaderCellClass}
      bodyCellClassName={(_row, column) => economyBodyCellClass(column)}
      activeHeaderClassName="is-active"
      rowClassName={(_row, index) => `econ-table-row${index % 2 === 1 ? ' econ-table-row--even' : ''}`}
      emptyClassName="econ-table-row econ-table-empty-row"
      emptyCellClassName="econ-table-cell econ-table-empty-cell"
      defaultSortKey={initialSort}
      defaultSortDirection={initialSortDir}
      virtualized
      virtualizeThreshold={virtualizeThreshold}
      virtualRowHeight={virtualRowHeight}
      virtualOverscan={8}
      fixedVirtualRows
      styledScrollbar
    />
  );
}

function SettlementResourceTags({ row }: { row: EconomyOverviewSettlementRow }) {
  if (row.productionResources.length === 0 && row.consumptionResources.length === 0) {
    return <ResourceAmountTags values={row.stockpileResources} tone="positive" limit={2} />;
  }

  return (
    <span className="econ-resource-tags econ-resource-tags--mixed">
      {row.productionResources.length > 0 && <ResourceAmountTags values={row.productionResources} tone="positive" limit={1} />}
      {row.consumptionResources.length > 0 && <ResourceAmountTags values={row.consumptionResources} tone="negative" limit={1} />}
    </span>
  );
}

function StatsBar({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const { population, populationDelta } = useGameState();
  const net = data?.netIncome ?? 0;
  const foodNet = data?.foodNet ?? 0;

  return (
    <div className="econ-stats-grid">
      <div className="econ-stat-cell">
        <span className="econ-stat-cell-val"><img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{fmt(data?.gold)}</span>
        <span className="econ-stat-cell-label">{t('Common.Treasury')}</span>
        <span className={`econ-stat-cell-sub ${valueClass(net)}`}>{money(net, t)}</span>
      </div>
      <div className="econ-stat-cell">
        <span className="econ-stat-cell-val econ-positive"><img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{fmt(data?.incomeTotal)}</span>
        <span className="econ-stat-cell-label">{t('Economy.IncomePerMonth')}</span>
      </div>
      <div className="econ-stat-cell">
        <span className="econ-stat-cell-val econ-negative"><img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />-{fmt(data?.expenseTotal)}</span>
        <span className="econ-stat-cell-label">{t('Economy.ExpensesPerMonth')}</span>
      </div>
      <div className="econ-stat-cell">
        <span className={`econ-stat-cell-val ${valueClass(foodNet)}`}>{signedResource(foodNet)}</span>
        <span className="econ-stat-cell-label">{t('Economy.FoodPerMonth')}</span>
      </div>
      <div className="econ-stat-cell">
        <span className="econ-stat-cell-val">{fmt(population)}</span>
        <span className="econ-stat-cell-label">{t('Common.Population')}</span>
        <span className={`econ-stat-cell-sub ${valueClass(populationDelta)}`}>{signed(populationDelta)}{t('Economy.PerMonth')}</span>
      </div>
    </div>
  );
}

function BreakdownColumn({
  title,
  rows,
  data,
  tone,
  selectedMetric,
  onSelectMetric,
}: {
  title: string;
  rows: MetricDef[];
  data: GetEconomyOverviewResponse | null;
  tone: 'income' | 'expense';
  selectedMetric: EconomyMetricKey | null;
  onSelectMetric: (metric: EconomyMetricKey) => void;
}) {
  const t = useWebUIText();
  const entries = rows
    .map(row => ({ ...row, value: metric(data, row.key) }))
    .filter(row => row.value > 0);
  const adjustment = data?.treasuryAdjustment ?? 0;
  if (tone === 'income' && adjustment > 0) {
    entries.push({ key: 'treasuryAdjustmentIncome', labelKey: 'Economy.DebtRelief', value: adjustment });
  } else if (tone === 'expense' && adjustment < 0) {
    entries.push({ key: 'treasuryAdjustmentExpense', labelKey: 'Economy.Leakage', value: Math.abs(adjustment) });
  }
  const total = tone === 'income' ? data?.incomeTotal ?? 0 : data?.expenseTotal ?? 0;
  const valueTone = tone === 'income' ? 'econ-positive' : 'econ-negative';

  return (
    <div className="econ-breakdown-col">
      <div className="econ-breakdown-header">
        <span className="econ-breakdown-title">{title}</span>
        <span className={`econ-breakdown-total-val ${valueTone}`}>
          <img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{tone === 'expense' ? '-' : '+'}{fmt(total)}{t('Economy.PerMonth')}
        </span>
      </div>
      <div className="econ-breakdown-list">
        {entries.length === 0 ? (
          <div className="econ-breakdown-row">
            <span className="econ-breakdown-label">{t('Common.None')}</span>
            <span className="econ-breakdown-value">0</span>
          </div>
        ) : entries.map((row, index) => (
          <button
            type="button"
            className={`econ-breakdown-row econ-breakdown-row--button${selectedMetric === row.key ? ' is-selected' : ''}`}
            key={`${row.labelKey}:${index}`}
            aria-expanded={selectedMetric === row.key}
            aria-controls="economy-flow-detail"
            onClick={(event) => {
              event.preventDefault();
              onSelectMetric(row.key);
            }}
          >
            <span className="econ-breakdown-label">
              {t(row.labelKey)}
            </span>
            <span className={`econ-breakdown-value ${valueTone}`}>
              <img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{tone === 'expense' ? '-' : '+'}{fmt(row.value)}
              <span className="econ-breakdown-caret" aria-hidden="true">&rsaquo;</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface MoneyFlowDetailEntry {
  name: string;
  amount: number;
  id?: string;
  linkType?: string;
}

interface CommandCostTreeNode extends CommandUpkeepEntry {
  children: CommandCostTreeNode[];
  maintenanceTotal: number;
}

function incomeEntries(entries: IncomeEntry[]): MoneyFlowDetailEntry[] {
  return entries.map(entry => ({
    name: entry.name,
    amount: entry.amount,
    id: entry.id || undefined,
    linkType: entry.linkType || undefined,
  }));
}

function buildCommandCostTree(entries: CommandUpkeepEntry[]): CommandCostTreeNode[] {
  const nodes = entries.map(entry => ({
    ...entry,
    children: [] as CommandCostTreeNode[],
    maintenanceTotal: entry.maintenance,
  }));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const roots: CommandCostTreeNode[] = [];

  for (const node of nodes) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sumMaintenance = (node: CommandCostTreeNode): number => {
    node.maintenanceTotal = node.maintenance
      + node.children.reduce((sum, child) => sum + sumMaintenance(child), 0);
    return node.maintenanceTotal;
  };
  roots.forEach(sumMaintenance);
  return roots;
}

function CommandCostNode({
  node,
  mode,
  expandedIds,
  onToggle,
}: {
  node: CommandCostTreeNode;
  mode: 'upkeep' | 'maintenance';
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = hasChildren && expandedIds.has(node.id);
  const rawLabel = mode === 'maintenance' ? node.commandName || node.name : node.name || node.commandName;
  const label = node.militaryId
    ? <EntityLink type="military" id={node.militaryId} inline>{rawLabel}</EntityLink>
    : rawLabel;
  const amount = mode === 'maintenance' ? node.maintenanceTotal : node.upkeep;
  const content = (
    <>
      <span className="econ-command-cost__name">
        {hasChildren && <span className="econ-command-cost__caret" aria-hidden="true">&rsaquo;</span>}
        {label}
      </span>
      <strong className="econ-negative">
        <img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />-{fmt(amount)}
      </strong>
    </>
  );

  return (
    <div className="econ-command-cost__branch">
      {hasChildren ? (
        <button
          type="button"
          className={`econ-command-cost__row${expanded ? ' is-expanded' : ''}`}
          aria-expanded={expanded}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle(node.id);
          }}
        >
          {content}
        </button>
      ) : (
        <div className="econ-command-cost__row">{content}</div>
      )}
      {expanded && (
        <div className="econ-command-cost__children">
          {node.children.map(child => (
            <CommandCostNode
              key={child.id}
              node={child}
              mode={mode}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommandCostTree({ entries, mode }: { entries: CommandUpkeepEntry[]; mode: 'upkeep' | 'maintenance' }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const roots = useMemo(() => buildCommandCostTree(entries), [entries]);
  const toggle = (id: string) => {
    setExpandedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="econ-command-cost">
      {roots.map(root => (
        <CommandCostNode
          key={root.id}
          node={root}
          mode={mode}
          expandedIds={expandedIds}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}

function detailEntriesForMetric(
  selectedMetric: EconomyMetricKey,
  details: GetIncomeBreakdownResponse | null,
  total: number,
  label: string,
): MoneyFlowDetailEntry[] {
  if (!details) return [{ name: label, amount: total }];
  let entries: MoneyFlowDetailEntry[] = [];
  if (selectedMetric === 'settlementIncome') entries = incomeEntries(details.settlementTaxes);
  if (selectedMetric === 'tradeIncome') entries = incomeEntries(details.settlementTrades);
  if (selectedMetric === 'vassalTributeIncome') entries = incomeEntries(details.vassals);
  if (entries.length > 0) return entries;
  return [{ name: label, amount: total }];
}

function MoneyFlowDetail({
  selectedMetric,
  data,
  details,
}: {
  selectedMetric: EconomyMetricKey;
  data: GetEconomyOverviewResponse | null;
  details: GetIncomeBreakdownResponse | null;
}) {
  const t = useWebUIText();
  const definition = [...INCOME_ROWS, ...EXPENSE_ROWS].find(row => row.key === selectedMetric)
    ?? (selectedMetric === 'treasuryAdjustmentIncome'
      ? { key: selectedMetric, labelKey: 'Economy.DebtRelief' }
      : { key: selectedMetric, labelKey: 'Economy.Leakage' });
  const label = t(definition.labelKey);
  const total = metric(data, selectedMetric);
  const expense = selectedMetric === 'treasuryAdjustmentExpense'
    || EXPENSE_ROWS.some(row => row.key === selectedMetric);
  const isLeakage = selectedMetric === 'treasuryDampeningExpense'
    || selectedMetric === 'treasuryAdjustmentExpense';
  const commandCostMode = selectedMetric === 'armyExpense'
    ? 'upkeep'
    : selectedMetric === 'commandMaintenanceExpense' ? 'maintenance' : null;
  const commandEntries = details?.armies ?? [];
  const showCommandTree = commandCostMode !== null && commandEntries.length > 0;
  const entries = detailEntriesForMetric(selectedMetric, details, total, label);
  const corruptOfficials = details?.leakageCorruptOfficials ?? [];

  return (
    <div className="econ-money-detail" id="economy-flow-detail">
      <div className="econ-money-detail__header">
        <span>{label}</span>
        <strong className={expense ? 'econ-negative' : 'econ-positive'}>
          <img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />
          {expense ? '-' : '+'}{fmt(total)}{t('Economy.PerMonth')}
        </strong>
      </div>
      {isLeakage && (
        <div className="econ-money-detail__note">
          <p>{t('Economy.LeakageTooltip')}</p>
          {details && total > 0 && (
            <p>{t('Economy.LeakageRetained', { Percent: details.leakageRetainedPercent })}</p>
          )}
          {corruptOfficials.length > 0 && (
            <p className="econ-money-detail__officials">
              <span>{t('Economy.LeakageCorruptOfficials')}: </span>
              {corruptOfficials.map((official, index) => (
                <Fragment key={`${official.id}:${index}`}>
                  {index > 0 ? ', ' : null}
                  <EntityLink type={official.linkType || 'person'} id={official.id} inline>
                    {official.name}
                  </EntityLink>
                </Fragment>
              ))}
            </p>
          )}
        </div>
      )}
      <div className={`econ-money-detail__grid${showCommandTree ? ' econ-money-detail__grid--tree' : ''}`}>
        {showCommandTree && commandCostMode ? (
          <CommandCostTree entries={commandEntries} mode={commandCostMode} />
        ) : entries.map((entry, index) => (
          <div className="econ-money-detail__row" key={`${entry.name}:${index}`}>
            <span>
              {entry.id && entry.linkType
                ? <EntityLink type={entry.linkType} id={entry.id} inline>{entry.name}</EntityLink>
                : entry.name}
            </span>
            <strong className={expense ? 'econ-negative' : 'econ-positive'}>
              <img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />
              {expense ? '-' : '+'}{fmt(entry.amount)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettlementResourceTooltip({ row, children }: { row: EconomyOverviewSettlementRow; children: ReactNode }) {
  const t = useWebUIText();
  const hasFlow = row.productionResources.length > 0 || row.consumptionResources.length > 0;
  const lines = hasFlow
    ? [
        ...row.productionResources.map(resource => ({
          label: resource.name,
          labelIcon: `/assets/resources/${resource.id}.png`,
          value: `+${formatResourceNumber(resource.amount)}${t('Economy.PerMonth')}`,
          valueColor: 'var(--green-light)',
        })),
        ...row.consumptionResources.map(resource => ({
          label: resource.name,
          labelIcon: `/assets/resources/${resource.id}.png`,
          value: `-${formatResourceNumber(resource.amount)}${t('Economy.PerMonth')}`,
          valueColor: 'var(--red-light)',
        })),
      ]
    : row.stockpileResources.map(resource => ({
        label: resource.name,
        labelIcon: `/assets/resources/${resource.id}.png`,
        value: formatResourceNumber(resource.amount),
      }));

  return (
    <Tooltip
      content={{ title: t('Common.Resources'), lines }}
      position="left"
      inline
      disabled={lines.length === 0}
      wrapperClassName="econ-resource-summary-tooltip"
    >
      {children}
    </Tooltip>
  );
}

function FlowFooter({ label, value, extra }: { label: string; value: ReactNode; extra?: ReactNode }) {
  return (
    <div className="econ-flow-footer">
      <span>{label}</span>
      <strong>{value}</strong>
      {extra}
    </div>
  );
}

function SummaryRow({ label, value, tone, className }: { label: string; value: ReactNode; tone?: string; className?: string }) {
  return (
    <div className={className ? `econ-summary-row ${className}` : 'econ-summary-row'}>
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function SettlementDashboard({ rows }: { rows: EconomyOverviewSettlementRow[] }) {
  const t = useWebUIText();
  const [detailId, setDetailId] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.income, 0);
  const detailRow = rows.find(row => row.id === detailId) ?? null;
  const columns: EconomyColumn<EconomyOverviewSettlementRow>[] = [
    { id: 'settlement', label: t('Economy.Settlement'), render: row => <EntityLink type="settlement" id={row.id}>{row.name}</EntityLink>, sortValue: row => row.name },
    { id: 'population', label: t('Economy.PopulationShort'), align: 'right', render: row => fmt(row.population), sortValue: row => row.population },
    { id: 'tax', label: t('Economy.TaxPerMonth'), align: 'right', className: 'econ-positive', render: row => `+${fmt(row.taxIncome)}`, sortValue: row => row.taxIncome },
    { id: 'trade', label: t('Economy.TradePerMonth'), align: 'right', className: 'econ-positive', render: row => `+${fmt(row.tradeIncome)}`, sortValue: row => row.tradeIncome },
    { id: 'total', label: t('Economy.TotalPerMonth'), align: 'right', render: row => <span className={valueClass(row.income)}>{signed(row.income)}</span>, sortValue: row => row.income },
    { id: 'governor', label: t('Economy.Governor'), render: row => row.governorId ? <EntityLink type="person" id={row.governorId}>{row.governorName}</EntityLink> : <span className="econ-governor">-</span>, sortValue: row => row.governorName },
    {
      id: 'resources',
      label: t('Common.Resources'),
      render: row => (
        <span className="econ-inline-detail-cell">
          <SettlementResourceTooltip row={row}>
            <SettlementResourceTags row={row} />
          </SettlementResourceTooltip>
          {(row.productionResources.length + row.consumptionResources.length + row.stockpileResources.length) > 2 && (
            <button
              type="button"
              className="econ-detail-toggle"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDetailId(current => current === row.id ? null : row.id);
              }}
            >
              {detailId === row.id ? '-' : '+'}
            </button>
          )}
        </span>
      ),
      sortValue: row => row.productionResources.length + row.stockpileResources.length,
    },
  ];

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.Settlements')} />
      <div className="econ-section-summary">
        <SummaryRow label={t('Economy.TotalIncome')} value={signed(total)} tone={valueClass(total)} />
      </div>
      {detailRow && (
        <DetailPanel title={detailRow.name}>
          <ResourceAmountDetail values={detailRow.productionResources.length > 0 ? detailRow.productionResources : detailRow.stockpileResources} tone="positive" />
        </DetailPanel>
      )}
      <EconomyDataTable
        rows={rows}
        columns={columns}
        emptyLabel={t('Economy.NoSettlements')}
        rowKey={row => row.id}
        tableClassName="econ-table--settlements"
        virtualRowHeight={40}
      />
    </section>
  );
}

function PriorityControls({
  targetType,
  targetId,
  priority,
}: {
  targetType: 'settlement' | 'military' | 'vassal';
  targetId: string;
  priority: string;
}) {
  const key = priority.toLowerCase();
  return (
    <div className="econ-priority-controls">
      {['low', 'normal', 'high'].map(option => (
        <button
          key={option}
          type="button"
          className={`econ-priority-btn${key === option ? ' econ-priority-btn--active' : ''}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (key === option) return;
            setResourcePriorityBridge(targetType, targetId, option).catch(() => undefined);
          }}
        >
          {priorityShortLabel(option)}
        </button>
      ))}
    </div>
  );
}

function SubjectTaxRateControls({
  factionId,
  taxRate,
  disabled,
}: {
  factionId: string;
  taxRate: number;
  disabled?: boolean;
}) {
  const taxPercent = ratePercent(taxRate);
  const canLowerTax = !disabled && taxPercent > 10.01;
  const canRaiseTax = !disabled && taxPercent < 89.99;
  return (
    <div className="econ-rate-controls">
      <button
        type="button"
        disabled={!canLowerTax}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (canLowerTax) adjustEconomySubjectTaxRateBridge(factionId, -0.05).catch(() => undefined);
        }}
      >
        -
      </button>
      <span>{displayRate(taxRate)}</span>
      <button
        type="button"
        disabled={!canRaiseTax}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (canRaiseTax) adjustEconomySubjectTaxRateBridge(factionId, 0.05).catch(() => undefined);
        }}
      >
        +
      </button>
    </div>
  );
}

function MilitaryDashboard({ rows }: { rows: EconomyOverviewMilitaryRow[] }) {
  const t = useWebUIText();
  const [detailId, setDetailId] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.upkeep, 0);
  const detailRow = rows.find(row => row.id === detailId) ?? null;
  const columns: EconomyColumn<EconomyOverviewMilitaryRow>[] = [
    {
      id: 'force',
      label: t('Economy.Force'),
      render: row => (
        <span className="econ-force-name">
          <img
            className="econ-force-kind-icon"
            src={row.kind === 'navy' ? '/assets/icons/I_Anchor.png' : '/assets/icons/I_Swords.png'}
            alt=""
            draggable={false}
          />
          <EntityLink type="military" id={row.id}>{row.name}</EntityLink>
        </span>
      ),
      sortValue: row => row.name,
    },
    { id: 'strength', label: t('Economy.Strength'), align: 'right', render: row => `${fmt(row.strength)} / ${fmt(row.maxStrength)}`, sortValue: row => row.strength },
    {
      id: 'upkeep',
      label: t('Economy.UpkeepPerMonth'),
      align: 'right',
      className: 'econ-negative',
      render: row => (
        <span className="econ-upkeep-value">
          <img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />
          {negativeFmt(row.upkeep)}
        </span>
      ),
      sortValue: row => row.upkeep,
    },
    { id: 'food', label: t('Economy.FoodPerMonth'), align: 'right', className: 'econ-negative', render: row => negativeResource(row.foodConsumption), sortValue: row => row.foodConsumption },
    {
      id: 'resources',
      label: t('Common.Resources'),
      render: row => {
        const resourceUsage = row.resourceUsage.filter(resource => resource.amount > 0.0001);
        return (
          <span className="econ-inline-detail-cell">
            <Tooltip
              content={{
                title: t('Economy.ResourceUse'),
                lines: resourceUsage.map(resource => ({
                  label: resource.name,
                  labelIcon: `/assets/resources/${resource.id}.png`,
                  value: `-${formatResourceNumber(resource.amount)}${t('Economy.PerMonth')}`,
                  valueColor: 'var(--red-light)',
                })),
              }}
              position="left"
              inline
              disabled={resourceUsage.length === 0}
              wrapperClassName="econ-resource-summary-tooltip"
            >
              <ResourceAmountTags values={resourceUsage} tone="negative" limit={2} />
            </Tooltip>
            {resourceUsage.length > 2 && (
              <button
                type="button"
                className="econ-detail-toggle"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDetailId(current => current === row.id ? null : row.id);
                }}
              >
                {detailId === row.id ? '-' : '+'}
              </button>
            )}
          </span>
        );
      },
      sortValue: row => row.resourceUsage.reduce((sum, value) => sum + value.amount, 0),
    },
    { id: 'location', label: t('Economy.Location'), render: row => <span className="econ-ellipsis">{row.location || '-'}</span>, sortValue: row => row.location },
    { id: 'priority', label: t('Economy.Priority'), render: row => <PriorityControls targetType="military" targetId={row.id} priority={row.priority} />, sortValue: row => priorityLabel(row.priority, t) },
  ];

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.MilitaryUpkeep')} />
      <div className="econ-section-summary">
        <SummaryRow
          label={t('Economy.TotalCost')}
          value={<span className="econ-upkeep-value"><img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{negativeFmt(total)}</span>}
          tone="econ-negative"
        />
      </div>
      {detailRow && (
        <DetailPanel title={detailRow.name}>
          <ResourceAmountDetail values={detailRow.resourceUsage} tone="negative" />
        </DetailPanel>
      )}
      <EconomyDataTable
        rows={rows}
        columns={columns}
        emptyLabel={t('Economy.NoForces')}
        rowKey={row => row.id}
        wrapClassName="econ-table-wrap--dashboard econ-table-wrap--military-fill"
        tableClassName="econ-table--military"
        virtualRowHeight={40}
      />
    </section>
  );
}

function VassalDashboard({ rows }: { rows: EconomyOverviewVassalRow[] }) {
  const t = useWebUIText();
  const [detailId, setDetailId] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.goldTribute, 0);
  const detailRow = rows.find(row => row.id === detailId) ?? null;
  const columns: EconomyColumn<EconomyOverviewVassalRow>[] = [
    { id: 'subject', label: t('Economy.Subject'), render: row => <EntityLink type="diplomacy" id={row.id}>{row.name}</EntityLink>, sortValue: row => row.name },
    { id: 'type', label: t('Economy.Type'), render: row => <span className="econ-type-badge">{row.type || (row.isFoederati ? t('Economy.Foederati') : t('Economy.Subject'))}</span>, sortValue: row => row.type || (row.isFoederati ? t('Economy.Foederati') : t('Economy.Subject')) },
    {
      id: 'tax',
      label: t('Economy.TaxRate'),
      align: 'right',
      render: row => <SubjectTaxRateControls factionId={row.id} taxRate={row.taxRate} disabled={row.isFoederati} />,
      sortValue: row => ratePercent(row.taxRate),
    },
    { id: 'tribute', label: t('Economy.TributePerMonth'), align: 'right', className: 'econ-positive', render: row => `+${fmt(row.goldTribute)}`, sortValue: row => row.goldTribute },
    { id: 'potential', label: t('Economy.Potential'), align: 'right', render: row => fmt1(row.potential), sortValue: row => row.potential },
    {
      id: 'resources',
      label: t('Common.Resources'),
      render: row => (
        <span className="econ-inline-detail-cell">
          <ResourceAmountTags values={row.contributions} tone="positive" limit={2} />
          {row.contributions.length > 2 && (
            <button
              type="button"
              className="econ-detail-toggle"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDetailId(current => current === row.id ? null : row.id);
              }}
            >
              {detailId === row.id ? '-' : '+'}
            </button>
          )}
        </span>
      ),
      sortValue: row => row.resourceContribution,
    },
    { id: 'priority', label: t('Economy.Priority'), render: row => <PriorityControls targetType="vassal" targetId={row.id} priority={row.priority} />, sortValue: row => priorityLabel(row.priority, t) },
  ];

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.SubjectContributions')} />
      <div className="econ-section-summary">
        <SummaryRow label={t('Economy.TotalTribute')} value={`+${fmt(total)}`} tone="econ-positive" />
      </div>
      {detailRow && (
        <DetailPanel title={detailRow.name}>
          <ResourceAmountDetail values={detailRow.contributions} tone="positive" />
        </DetailPanel>
      )}
      <EconomyDataTable
        rows={rows}
        columns={columns}
        emptyLabel={t('Economy.NoSubjectContributions')}
        rowKey={row => row.id}
        wrapClassName="econ-table-wrap--dashboard"
        tableClassName="econ-table--vassals"
        virtualRowHeight={44}
      />
    </section>
  );
}

function OverviewTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const [selectedMetric, setSelectedMetric] = useState<EconomyMetricKey | null>(null);
  const incomeBreakdown = useIncomeBreakdown(selectedMetric !== null);
  const selectMetric = (next: EconomyMetricKey) => {
    setSelectedMetric(current => current === next ? null : next);
  };
  return (
    <>
      <section className="econ-section">
        <SectionHeading variant="ornate" title={t('Economy.GoldFlow')} />
        <div className="econ-overview-top">
          <BreakdownColumn title={t('Economy.Income')} rows={INCOME_ROWS} data={data} tone="income" selectedMetric={selectedMetric} onSelectMetric={selectMetric} />
          <BreakdownColumn title={t('Economy.Expenses')} rows={EXPENSE_ROWS} data={data} tone="expense" selectedMetric={selectedMetric} onSelectMetric={selectMetric} />
        </div>
        {selectedMetric && <MoneyFlowDetail selectedMetric={selectedMetric} data={data} details={incomeBreakdown} />}
        <FlowFooter
          label={t('Economy.NetIncome')}
          value={<span className={valueClass(data?.netIncome)}><img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{money(data?.netIncome, t)}</span>}
          extra={<span className="econ-flow-footer__aside">{t('Common.Treasury')} <b><img className="econ-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{fmt(data?.gold)}</b></span>}
        />
      </section>
      <ResourceWorkspace data={data} />
    </>
  );
}

function SettlementsTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  return <SettlementDashboard rows={data?.settlements ?? []} />;
}

function MilitaryTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  return <MilitaryDashboard rows={data?.militaries ?? []} />;
}

function ProvinceTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const rows = data?.taxRows ?? [];
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRow = rows.find(row => row.factionId === detailId) ?? null;
  const taxColumns: EconomyColumn<EconomyOverviewTaxRow>[] = [
    { id: 'name', label: t('Economy.Faction'), render: row => <EntityLink type="diplomacy" id={row.factionId}>{row.factionName}</EntityLink>, sortValue: row => row.factionName },
    { id: 'kind', label: t('Economy.Source'), render: row => row.isPlayerFaction ? t('Economy.DirectRule') : row.isFoederati ? t('Economy.Foederati') : row.isVassal ? t('Economy.Subject') : t('Economy.Dependent'), sortValue: row => row.isPlayerFaction },
    { id: 'rate', label: t('Economy.Rate'), align: 'right', render: row => row.isVassal ? <SubjectTaxRateControls factionId={row.factionId} taxRate={row.effectiveRate} disabled={row.isFoederati} /> : displayRate(row.effectiveRate), sortValue: row => ratePercent(row.effectiveRate) },
    { id: 'current', label: t('Economy.Current'), align: 'right', className: 'econ-positive', render: row => `+${fmt(row.currentTax)}${t('Economy.PerMonth')}`, sortValue: row => row.currentTax },
    { id: 'potential', label: t('Economy.Potential'), align: 'right', render: row => fmt(row.potentialTax), sortValue: row => row.potentialTax },
    { id: 'leakage', label: t('Economy.Leakage'), align: 'right', className: 'econ-negative', render: row => Math.round(row.leakage) > 0 ? `-${fmt(row.leakage)}${t('Economy.PerMonth')}` : `0${t('Economy.PerMonth')}`, sortValue: row => row.leakage },
    {
      id: 'losses',
      label: t('Economy.Losses'),
      render: row => {
        const losses = taxLossEntries(row, t);
        return (
          <span className="econ-inline-detail-cell">
            <Tooltip
              content={{
                title: t('Economy.Losses'),
                lines: losses.map(loss => ({
                  label: loss.label,
                  value: `-${fmt(loss.value)}`,
                  valueColor: 'var(--red-light)',
                })),
              }}
              position="left"
              inline
              disabled={losses.length === 0}
              wrapperClassName="econ-loss-summary-tooltip"
            >
              <span className="econ-ellipsis">{taxLossSummary(losses, t)}</span>
            </Tooltip>
            {losses.length > 0 && (
              <button
                type="button"
                className="econ-detail-toggle"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDetailId(current => current === row.factionId ? null : row.factionId);
                }}
              >
                {detailId === row.factionId ? '-' : '+'}
              </button>
            )}
          </span>
        );
      },
      sortValue: row => row.blockadeLoss + row.culturalLoss + row.corruptionLoss + row.ungovernedLoss + row.complianceLoss,
    },
  ];

  return (
    <>
      <VassalDashboard rows={data?.vassals ?? []} />
      <section className="econ-section">
        <SectionHeading variant="ornate" title={t('Economy.TaxLosses')} />
        {detailRow && (
          <DetailPanel title={detailRow.factionName}>
            <TaxLossDetail row={detailRow} />
          </DetailPanel>
        )}
        <EconomyDataTable
          rows={rows}
          columns={taxColumns}
          emptyLabel={t('Economy.NoTaxBreakdowns')}
          initialSort="leakage"
          rowKey={row => row.factionId}
          tableClassName="econ-table--tax-losses"
          virtualRowHeight={40}
        />
      </section>
    </>
  );
}

const EconomyScreen = memo(function EconomyScreen({ onClose }: { onClose: () => void }) {
  const t = useWebUIText();
  const [activeTab, setActiveTab] = useState<EconomyTab>('overview');
  const data = useEconomyOverviewBridge(activeTab);
  const court = useCourtPositions(true);
  const [courtPosition, setCourtPosition] = useState<CourtPositionView | null>(null);
  const economyOffice = useMemo(
    () => court?.positions.find(position => position.key === 'masterofeconomy') ?? null,
    [court],
  );

  const tabs = [
    { id: 'overview', label: t('Economy.TabOverview') },
    { id: 'settlements', label: t('Economy.TabSettlements') },
    { id: 'military', label: t('Economy.TabMilitary') },
    { id: 'provinces', label: t('Economy.TabProvinces') },
  ];

  const content = (() => {
    if (activeTab === 'settlements') return <SettlementsTab data={data} />;
    if (activeTab === 'military') return <MilitaryTab data={data} />;
    if (activeTab === 'provinces') return <ProvinceTab data={data} />;
    return <OverviewTab data={data} />;
  })();
  const officeStrip = economyOffice ? (
    <div className="econ-office-strip econ-office-strip--top">
      <CourtOfficeSummary
        position={economyOffice}
        onOpen={setCourtPosition}
      />
    </div>
  ) : null;

  return (
    <ScreenShell
      title={t('Economy.ScreenTitle')}
      onClose={onClose}
      advisorTopic="economyScreen"
      className={`screen--economy${activeTab === 'overview' ? ' screen--economy-overview' : ''}`}
      tabs={<SidebarTabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as EconomyTab)} />}
      headerExtra={activeTab === 'overview' ? undefined : <StatsBar data={data} />}
      contentClassName={`econ-content${activeTab === 'overview' ? ' econ-content--overview' : ''}${activeTab === 'settlements' ? ' econ-content--settlements' : ''}`}
      styledScrollContent
    >
      {activeTab === 'overview' && <StatsBar data={data} />}
      {officeStrip}
      <div className={`econ-wrap${activeTab === 'overview' ? ' econ-wrap--overview' : ''}`}>{content}</div>
      <CourtAppointmentModal
        open={!!courtPosition}
        position={courtPosition}
        onClose={() => setCourtPosition(null)}
      />
    </ScreenShell>
  );
});

export default EconomyScreen;

registerTopbarButton({
  id: 'economy',
  get label() { return webUIText('Topbar.Economy'); },
  labelKey: 'Topbar.Economy',
  icon: '/assets/icons/I_Economy.png',
  tooltip: {
    get title() { return webUIText('Topbar.Economy'); },
    titleKey: 'Topbar.Economy',
    get body() { return webUIText('Topbar.EconomyTooltipBody'); },
    bodyKey: 'Topbar.EconomyTooltipBody',
    lines: [
      { get label() { return webUIText('Topbar.EconomyTooltipLineOne'); }, labelKey: 'Topbar.EconomyTooltipLineOne' },
      { get label() { return webUIText('Topbar.EconomyTooltipLineTwo'); }, labelKey: 'Topbar.EconomyTooltipLineTwo' },
    ],
  },
  order: 20,
});
registerScreen({
  id: 'economy',
  render: ({ onClose }) => <EconomyScreen onClose={onClose} />,
  topbarId: 'economy',
  advisorTopic: 'economyScreen',
});

import { memo, useMemo, useState, type Key, type MouseEvent, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import EntityLink from '../../common/entities/EntityLink';
import { canOpenEntityLink } from '../../common/entities/entityLinkUtils';
import Tooltip from '../../common/tooltips/Tooltip';
import CourtOfficeSummary from '../../common/entities/CourtOfficeSummary';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import CourtAppointmentModal from '../../modals/characters/CourtAppointmentModal';
import { useGameState } from '../../../context/GameContext';
import { useCourtPositions } from '../../../data-source/index';
import {
  adjustEconomySubjectTaxRateBridge,
  buyEconomyResourceBridge,
  sellEconomyResourceBridge,
  setEconomyAutoBuyBridge,
  setResourceAutoSellBridge,
  setResourcePriorityBridge,
  useEconomyOverviewBridge,
} from '../../../bridge/settlements-economy/useEconomyOverviewBridge';
import type {
  EconomyOverviewFoodRow,
  EconomyOverviewHistoryPoint,
  EconomyOverviewMilitaryRow,
  EconomyOverviewResourceAmount,
  EconomyOverviewResourceRow,
  EconomyOverviewResourceSource,
  EconomyOverviewSettlementRow,
  EconomyOverviewTaxRow,
  EconomyOverviewVassalRow,
  GetEconomyOverviewResponse,
} from '../../../bridge-types.generated.ts';
import type { CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import type { SortDirection } from '../../common/layout/tables/sortUtils';
import { webUIText, useWebUIText, type WebUITextFormatter } from '../../../localization/WebUITextContext';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import './EconomyScreen.css';

type EconomyTab = 'overview' | 'resources' | 'food' | 'settlements' | 'military' | 'provinces' | 'history';
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
  | 'autoAssignCommanderExpense'
  | 'otherExpense';
type HistoryMetricKey = Exclude<EconomyMetricKey, never>;

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
  { key: 'treasuryDampeningExpense', labelKey: 'Economy.TreasuryDampening' },
  { key: 'buildingExpense', labelKey: 'Economy.Buildings' },
  { key: 'replenishmentExpense', labelKey: 'Economy.Replenishment' },
  { key: 'tributePaidToLiege', labelKey: 'Economy.ImperialTribute' },
  { key: 'treatyTributePaid', labelKey: 'Economy.TreatyPayments' },
  { key: 'eventExpense', labelKey: 'Economy.Events' },
  { key: 'powerBlocExpense', labelKey: 'Economy.PowerBloc' },
  { key: 'autoAssignCommanderExpense', labelKey: 'Economy.AutoCommanders' },
  { key: 'otherExpense', labelKey: 'Economy.Other' },
];

const HISTORY_CHART_SEGMENTS: Array<{ key: HistoryMetricKey; labelKey: string; className: string }> = [
  { key: 'settlementIncome', labelKey: 'Economy.SettlementTax', className: 'settlement' },
  { key: 'tradeIncome', labelKey: 'Economy.Trade', className: 'trade' },
  { key: 'vassalTributeIncome', labelKey: 'Economy.SubjectTribute', className: 'vassal' },
  { key: 'resourceSalesIncome', labelKey: 'Economy.ResourceSales', className: 'resource' },
  { key: 'lootingIncome', labelKey: 'Economy.Looting', className: 'looting' },
  { key: 'eventIncome', labelKey: 'Economy.Events', className: 'events' },
];

const HISTORY_INCOME_KEYS: HistoryMetricKey[] = HISTORY_CHART_SEGMENTS.map(segment => segment.key);

const HISTORY_EXPENSE_KEYS: HistoryMetricKey[] = [
  'armyExpense',
  'commandMaintenanceExpense',
  'treasuryDampeningExpense',
  'replenishmentExpense',
  'buildingExpense',
  'tributePaidToLiege',
  'treatyTributePaid',
  'eventExpense',
  'powerBlocExpense',
  'autoAssignCommanderExpense',
  'otherExpense',
];

const TRADE_AMOUNT = 100;
const AUTO_SELL_STEP = 500;

function fmt(value: number | undefined): string {
  return formatNumber(value);
}

function fmt1(value: number | undefined): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

function negativeFmt(value: number | undefined): string {
  const formatted = fmt(value);
  return formatted === '0' ? '0' : `-${formatted}`;
}

function negativeFmt1(value: number | undefined): string {
  const formatted = fmt1(value);
  return formatted === '0' ? '0' : `-${formatted}`;
}

function signed(value: number | undefined, suffix = ''): string {
  return `${formatSignedNumber(value, { maximumFractionDigits: 1 })}${suffix}`;
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

function tradeAmountFromEvent(event: MouseEvent<HTMLButtonElement>): number {
  if (event.ctrlKey && event.shiftKey) return TRADE_AMOUNT * 10;
  if (event.shiftKey) return TRADE_AMOUNT * 5;
  return TRADE_AMOUNT;
}

function metric(data: GetEconomyOverviewResponse | null, key: EconomyMetricKey): number {
  return Number(data?.[key] ?? 0);
}

function historyMetric(point: EconomyOverviewHistoryPoint, key: HistoryMetricKey): number {
  return Number(point[key] ?? 0);
}

function historySum(point: EconomyOverviewHistoryPoint, keys: HistoryMetricKey[]): number {
  return keys.reduce((sum, key) => sum + historyMetric(point, key), 0);
}

function resourceCategoryLabel(category: string, t: WebUITextFormatter): string {
  const labels: Record<string, string> = {
    food: t('Economy.ResourceCategoryFood'),
    strategic: t('Economy.ResourceCategoryStrategic'),
    luxury: t('Economy.ResourceCategoryLuxury'),
    rawMaterials: t('Economy.ResourceCategoryRawMaterials'),
  };
  return labels[category] ?? category;
}

function militaryKindLabel(kind: string, t: WebUITextFormatter): string {
  return kind === 'navy' ? t('Economy.MilitaryKindFleet') : t('Economy.MilitaryKindArmy');
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

function monthLabel(point: EconomyOverviewHistoryPoint): string {
  return point.dateText;
}

function ResourceName({ row }: { row: EconomyOverviewResourceRow }) {
  return (
    <span className="econ-resource-name">
      <span>{row.name}</span>
    </span>
  );
}

function ProducerLinks({
  producers,
  onOpen,
}: {
  producers: EconomyOverviewResourceSource[];
  onOpen?: () => void;
}) {
  const visible = producers.slice(0, 2);
  if (visible.length === 0) return <span className="econ-muted">-</span>;

  return (
    <span className="econ-producers">
      {visible.map((producer, index) => {
        const label = webUIText("Auto.Var.componentsscreensEconomyScreen.222.1", { Name: producer.name, Value2: signed(producer.amount) });
        return (
          <span key={`${producer.linkType}:${producer.linkId}:${index}`} className="econ-producer">
            {index > 0 && <span className="econ-producer-sep">, </span>}
            {canOpenEntityLink(producer.linkType, producer.linkId) ? (
              <EntityLink type={producer.linkType} id={producer.linkId} inline>
                {label}
              </EntityLink>
            ) : label}
          </span>
        );
      })}
      {producers.length > visible.length && (
        <button
          type="button"
          className="econ-detail-toggle"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpen?.();
          }}
        >
          +{formatNumber(producers.length - visible.length)}
        </button>
      )}
    </span>
  );
}

function ProducerSourceLink({ producer }: { producer: EconomyOverviewResourceSource }) {
  return <EntityLink type={producer.linkType} id={producer.linkId}>{producer.name}</EntityLink>;
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
          {value.name} {sign}{fmt1(value.amount)}
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

function ResourceSourceDetail({ resource }: { resource: EconomyOverviewResourceRow }) {
  return (
    <div className="econ-detail-grid">
      {resource.producers.length === 0 ? (
        <span className="econ-muted">-</span>
      ) : resource.producers.map((producer, index) => (
        <div key={`${producer.linkType}:${producer.linkId}:${index}`} className="econ-detail-item">
          <span className="econ-detail-name">
            {canOpenEntityLink(producer.linkType, producer.linkId) ? (
              <EntityLink type={producer.linkType} id={producer.linkId} inline>{producer.name}</EntityLink>
            ) : producer.name}
          </span>
          <span className="econ-detail-value econ-positive">{signed(producer.amount)}</span>
        </div>
      ))}
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
          <span className={`econ-detail-value ${className}`}>{sign}{fmt1(value.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function TaxLossDetail({ row }: { row: EconomyOverviewTaxRow }) {
  const t = useWebUIText();
  const losses = [
    { label: t('Economy.Blockade'), value: row.blockadeLoss },
    { label: t('Economy.Culture'), value: row.culturalLoss },
    { label: t('Economy.Corruption'), value: row.corruptionLoss },
    { label: t('Economy.Ungoverned'), value: row.ungovernedLoss },
    { label: t('Economy.Compliance'), value: row.complianceLoss },
  ];
  return (
    <div className="econ-detail-grid">
      {losses.map(loss => (
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

function EconomyTable<T>({
  title,
  rows,
  columns,
  emptyLabel,
  initialSort,
  initialSortDir = 'desc',
  rowKey,
}: {
  title: string;
  rows: T[];
  columns: EconomyColumn<T>[];
  emptyLabel: string;
  initialSort?: string;
  initialSortDir?: SortDirection;
  rowKey?: (row: T, index: number) => Key;
}) {
  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={title} />
      <EconomyDataTable
        rows={rows}
        columns={columns}
        emptyLabel={emptyLabel}
        initialSort={initialSort}
        initialSortDir={initialSortDir}
        rowKey={rowKey}
      />
    </section>
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
        <span className="econ-stat-cell-val">{fmt(data?.gold)}</span>
        <span className="econ-stat-cell-label">{t('Common.Treasury')}</span>
        <span className={`econ-stat-cell-sub ${valueClass(net)}`}>{money(net, t)}</span>
      </div>
      <div className="econ-stat-cell">
        <span className="econ-stat-cell-val econ-positive">{fmt(data?.incomeTotal)}</span>
        <span className="econ-stat-cell-label">{t('Economy.IncomePerMonth')}</span>
      </div>
      <div className="econ-stat-cell">
        <span className="econ-stat-cell-val econ-negative">-{fmt(data?.expenseTotal)}</span>
        <span className="econ-stat-cell-label">{t('Economy.ExpensesPerMonth')}</span>
      </div>
      <div className="econ-stat-cell">
        <span className={`econ-stat-cell-val ${valueClass(foodNet)}`}>{signed(foodNet)}</span>
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
}: {
  title: string;
  rows: MetricDef[];
  data: GetEconomyOverviewResponse | null;
  tone: 'income' | 'expense';
}) {
  const t = useWebUIText();
  const entries = rows
    .map(row => ({ ...row, value: metric(data, row.key) }))
    .filter(row => row.value > 0);
  const adjustment = data?.treasuryAdjustment ?? 0;
  if (tone === 'income' && adjustment > 0) {
    entries.push({ key: 'otherIncome', labelKey: 'Economy.DebtRelief', value: adjustment });
  } else if (tone === 'expense' && adjustment < 0) {
    entries.push({ key: 'treasuryDampeningExpense', labelKey: 'Economy.TreasuryDampening', value: Math.abs(adjustment) });
  }
  const total = tone === 'income' ? data?.incomeTotal ?? 0 : data?.expenseTotal ?? 0;
  const valueTone = tone === 'income' ? 'econ-positive' : 'econ-negative';

  return (
    <div className="econ-breakdown-col">
      <div className="econ-breakdown-header">
        <span className="econ-breakdown-title">{title}</span>
        <span className={`econ-breakdown-total-val ${valueTone}`}>
          {tone === 'expense' ? '-' : '+'}{fmt(total)}{t('Economy.PerMonth')}
        </span>
      </div>
      <div className="econ-breakdown-list">
        {entries.length === 0 ? (
          <div className="econ-breakdown-row">
            <span className="econ-breakdown-label">{t('Common.None')}</span>
            <span className="econ-breakdown-value">0</span>
          </div>
        ) : entries.map((row, index) => (
          <div className="econ-breakdown-row" key={`${row.labelKey}:${index}`}>
            <span className="econ-breakdown-label">
              {t(row.labelKey)}
            </span>
            <span className={`econ-breakdown-value ${valueTone}`}>
              {tone === 'expense' ? '-' : '+'}{fmt(row.value)}
            </span>
          </div>
        ))}
        {tone === 'income' && (
          <div className="econ-breakdown-net">
            <span className="econ-breakdown-net-label">{t('Economy.NetIncome')}</span>
            <span className={`econ-breakdown-net-value ${valueClass(data?.netIncome)}`}>{money(data?.netIncome, t)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="econ-summary-row">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function AutoBuyControl({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const enabled = data?.autoBuyEnabled ?? false;
  return (
    <button
      type="button"
      className={`econ-toggle-btn${enabled ? ' econ-toggle-btn--active' : ''}`}
      disabled={!data}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!data) return;
        setEconomyAutoBuyBridge(!enabled).catch(() => undefined);
      }}
    >
      {enabled ? t('Economy.Enabled') : t('Economy.Disabled')}
    </button>
  );
}

function percentOf(value: number, max: number): string {
  if (max <= 0) return '0%';
  return `${Math.max(0, Math.min(100, (value / max) * 100)).toFixed(2)}%`;
}

function IncomeHistoryChart({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const points = (data?.history ?? []).slice(-12);
  const maxValue = Math.max(
    1,
    ...points.map(point => historySum(point, HISTORY_INCOME_KEYS)),
  );

  return (
    <section className="econ-section econ-chart-section">
      <SectionHeading variant="ornate" title={t('Economy.IncomeHistory12Month')} />
      <div className="econ-chart">
        <span className="econ-chart-gridline econ-chart-gridline--top" />
        <span className="econ-chart-gridline econ-chart-gridline--mid" />
        <span className="econ-chart-zero-line" />
        {points.length === 0 ? (
          <div className="econ-mini-empty">{t('Economy.NoIncomeHistory')}</div>
        ) : points.map((point, index) => {
          return (
            <div className="econ-chart-bar-col" key={`${point.year}:${point.month}:${index}`}>
              <div className="econ-chart-bar-track">
                <div className="econ-chart-bar-stack">
                  {HISTORY_CHART_SEGMENTS.map(segment => {
                    const value = historyMetric(point, segment.key);
                    if (value <= 0) return null;
                    return (
                      <span
                        key={segment.key}
                        className={`econ-chart-segment econ-chart-segment--${segment.className}`}
                        style={{ height: percentOf(value, maxValue) }}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="econ-chart-bar-label">{monthLabel(point)}</span>
            </div>
          );
        })}
      </div>
      <div className="econ-chart-legend">
        {HISTORY_CHART_SEGMENTS.map(segment => (
          <span className="econ-chart-legend-item" key={segment.key}>
            <span className={`econ-chart-legend-swatch econ-chart-legend-swatch--${segment.className}`} />
            {t(segment.labelKey)}
          </span>
        ))}
      </div>
    </section>
  );
}

function ResourceProduction({ resources }: { resources: EconomyOverviewResourceRow[] }) {
  const t = useWebUIText();
  const maxProduction = Math.max(1, ...resources.flatMap(row => row.producers.map(producer => Math.abs(producer.amount))));

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.ResourceProduction')} />
      <div className="econ-prod-grid">
        {resources.length === 0 ? (
          <div className="econ-mini-empty">{t('Economy.NoResourceProduction')}</div>
        ) : resources.map(resource => {
          const totalProduction = resource.production + resource.vassalContribution + resource.treatyIncome;
          const visibleProducers = resource.producers.slice(0, 4);
          return (
            <div className="econ-prod-widget" key={resource.id}>
              <div className="econ-prod-widget-header">
                <span className="econ-prod-widget-name">{resource.name}</span>
                <span className="econ-prod-widget-total">+{fmt1(totalProduction)}{t('Economy.PerMonth')}</span>
              </div>
              {visibleProducers.map((producer, index) => (
                <Tooltip
                  key={`${resource.id}:${producer.linkId}:${index}`}
                  content={{
                    title: producer.name,
                    lines: [{
                      label: t('Economy.Production'),
                      value: signed(producer.amount, t('Economy.PerMonth')),
                      valueColor: producer.amount > 0 ? 'var(--green)' : producer.amount < 0 ? 'var(--red)' : 'var(--text-muted)',
                    }],
                  }}
                  position="right"
                >
                  <div className="econ-prod-bar-row">
                    <span className="econ-prod-bar-label"><ProducerSourceLink producer={producer} /></span>
                    <div className="econ-prod-bar-stack">
                      <div className="econ-prod-bar-track"><span style={{ width: percentOf(Math.abs(producer.amount), maxProduction) }} /></div>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FoodBalanceDashboard({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const foodResources = (data?.resources ?? []).filter(resource => resource.category.toLowerCase() === 'food');
  const max = Math.max(
    1,
    ...foodResources.map(resource => resource.production),
    ...foodResources.map(resource => resource.armyUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss),
  );

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.FoodBalance')} />
      <div className="econ-food-balance">
        {foodResources.map(resource => {
          const consumption = resource.armyUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss;
          const net = resource.production - consumption;
          return (
            <div className="econ-food-balance-row" key={resource.id}>
              <span className="econ-food-label"><ResourceName row={resource} /></span>
              <div className="econ-food-bar-stack">
                <div className="econ-food-bar-area">
                  <span className="econ-food-bar econ-food-bar--positive" style={{ width: percentOf(resource.production, max) }} />
                  <span className="econ-food-bar econ-food-bar--negative" style={{ width: percentOf(consumption, max) }} />
                </div>
              </div>
              <div className="econ-food-values">
                <span className="econ-food-val econ-food-val--production econ-positive">+{fmt1(resource.production)}</span>
                <span className="econ-food-val econ-food-val--consumption econ-negative">-{fmt1(consumption)}</span>
                <span className={`econ-food-val econ-food-val--net ${valueClass(net)}`}>{signed(net)}{t('Economy.PerMonth')}</span>
              </div>
            </div>
          );
        })}
        <div className="econ-section-summary">
          <SummaryRow label={t('Economy.NetChange')} value={`${signed(data?.foodNet)}${t('Economy.PerMonth')}`} tone={valueClass(data?.foodNet)} />
          <SummaryRow label={t('Economy.FoodStores')} value={fmt1(data?.totalFood)} />
          <SummaryRow label={t('Economy.AutoBuy')} value={<AutoBuyControl data={data} />} />
        </div>
      </div>
    </section>
  );
}

function TradeControls({ resource, gold }: { resource: EconomyOverviewResourceRow; gold: number }) {
  const t = useWebUIText();
  const buyCost = Math.ceil(TRADE_AMOUNT * resource.buyPrice);
  const sellReturn = Math.floor(Math.min(TRADE_AMOUNT, resource.amount) * resource.sellPrice);
  const canBuy = buyCost > 0 && gold >= buyCost;
  const canSell = sellReturn > 0;

  return (
    <div className="econ-trade-btns">
      <button
        type="button"
        className="econ-trade-btn econ-trade-btn--buy"
        disabled={!canBuy}
        aria-label={t('Economy.Buy')}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!canBuy) return;
          buyEconomyResourceBridge(resource.id, tradeAmountFromEvent(event)).catch(() => undefined);
        }}
      >
        <img className="econ-trade-btn-mark" src="/assets/icons/I_Minus.png" alt="" />
        <img className="econ-trade-btn-coin" src="/assets/icons/I_Coins.png" alt="" />
        <span>{fmt(buyCost)}</span>
      </button>
      <button
        type="button"
        className="econ-trade-btn econ-trade-btn--sell"
        disabled={!canSell}
        aria-label={t('Economy.Sell')}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!canSell) return;
          sellEconomyResourceBridge(resource.id, tradeAmountFromEvent(event)).catch(() => undefined);
        }}
      >
        <img className="econ-trade-btn-mark" src="/assets/icons/I_Plus.png" alt="" />
        <img className="econ-trade-btn-coin" src="/assets/icons/I_Coins.png" alt="" />
        <span>{fmt(sellReturn)}</span>
      </button>
    </div>
  );
}

function AutoSellControl({ resource }: { resource: EconomyOverviewResourceRow }) {
  const t = useWebUIText();
  const enabled = resource.autoSellEnabled;
  const threshold = Math.max(0, resource.autoSellThreshold);
  const sliderMax = Math.max(1, resource.autoSellSliderMax);
  const autoSellPercent = Math.max(0, Math.min(100, threshold / sliderMax * 100));
  const setThreshold = (nextThreshold: number) => {
    setResourceAutoSellBridge(resource.id, true, Math.max(0, Math.min(sliderMax, nextThreshold))).catch(() => undefined);
  };

  return (
    <div className="econ-trade-cell">
      <div className="econ-autosell">
        <button
          type="button"
          className={`econ-autosell-check${enabled ? ' econ-autosell-check--active' : ''}`}
          aria-label={t('Economy.AutoSell')}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setResourceAutoSellBridge(resource.id, !enabled, threshold).catch(() => undefined);
          }}
        />
        {enabled && (
          <button
            type="button"
            className="econ-autosell-step"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setThreshold(threshold - AUTO_SELL_STEP);
            }}
          >
            -
          </button>
        )}
        <div className="econ-autosell-slider"><span style={{ width: `${autoSellPercent.toFixed(2)}%` }} /></div>
        <span className="econ-autosell-val">{enabled ? fmt(threshold) : '-'}</span>
        {enabled && (
          <button
            type="button"
            className="econ-autosell-step"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setThreshold(threshold + AUTO_SELL_STEP);
            }}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

function StockpileDashboard({ resources, gold }: { resources: EconomyOverviewResourceRow[]; gold: number }) {
  const t = useWebUIText();
  const maxAmount = Math.max(1, ...resources.map(row => row.amount));
  const columns: EconomyColumn<EconomyOverviewResourceRow>[] = [
    {
      id: 'resource',
      label: t('Economy.Resource'),
      render: resource => (
        <span className="econ-resource-cell">
          <ResourceName row={resource} />
          <span className="econ-resource-primary">{resourceCategoryLabel(resource.category, t)}</span>
        </span>
      ),
      sortValue: resource => resource.name,
    },
    {
      id: 'stockpile',
      label: t('Economy.Stockpile'),
      align: 'right',
      render: resource => (
        <div className="econ-stock-bar-wrap">
          <span className="econ-painted-bar--stock" style={{ width: percentOf(resource.amount, maxAmount) }} />
          <span className="econ-stock-bar-text">{fmt1(resource.amount)}</span>
        </div>
      ),
      sortValue: resource => resource.amount,
    },
    {
      id: 'production',
      label: t('Economy.ProductionShort'),
      align: 'right',
      className: 'econ-positive',
      render: resource => `+${fmt1(resource.production + resource.vassalContribution + resource.treatyIncome)}`,
      sortValue: resource => resource.production + resource.vassalContribution + resource.treatyIncome,
    },
    {
      id: 'consumption',
      label: t('Economy.ConsumptionShort'),
      align: 'right',
      className: 'econ-negative',
      render: resource => negativeFmt1(resource.armyUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss),
      sortValue: resource => resource.armyUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss,
    },
    {
      id: 'net',
      label: t('Economy.NetPerMonth'),
      align: 'right',
      render: resource => <span className={valueClass(resource.netPerMonth)}>{signed(resource.netPerMonth)}</span>,
      sortValue: resource => resource.netPerMonth,
    },
    { id: 'price', label: t('Economy.Price'), align: 'right', render: resource => `${fmt1(resource.marketMultiplier)}x`, sortValue: resource => resource.marketMultiplier },
    { id: 'trade', label: t('Economy.Trade'), render: resource => <TradeControls resource={resource} gold={gold} />, sortValue: resource => resource.buyPrice },
    { id: 'autosell', label: t('Economy.AutoSell'), render: resource => <AutoSellControl resource={resource} />, sortValue: resource => resource.autoSellEnabled ? resource.autoSellThreshold : -1 },
  ];

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.Stockpiles')} />
      <EconomyDataTable
        rows={resources}
        columns={columns}
        emptyLabel={t('Economy.NoResourceStockpiles')}
        rowKey={row => row.id}
        wrapClassName="econ-table-wrap--dashboard"
        tableClassName="econ-table--stockpiles"
        virtualRowHeight={54}
      />
    </section>
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
          <SettlementResourceTags row={row} />
          {(row.productionResources.length + row.consumptionResources.length + row.stockpileResources.length) > 2 && (
            <button
              type="button"
              className="econ-detail-toggle"
              onMouseDown={(event) => {
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
        wrapClassName="econ-table-wrap--dashboard"
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
          onMouseDown={(event) => {
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
        onMouseDown={(event) => {
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
        onMouseDown={(event) => {
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
    { id: 'force', label: t('Economy.Force'), render: row => <EntityLink type="military" id={row.id}>{row.name}</EntityLink>, sortValue: row => row.name },
    { id: 'strength', label: t('Economy.Strength'), align: 'right', render: row => `${fmt(row.strength)} / ${fmt(row.maxStrength)}`, sortValue: row => row.strength },
    { id: 'upkeep', label: t('Economy.UpkeepPerMonth'), align: 'right', className: 'econ-negative', render: row => negativeFmt(row.upkeep), sortValue: row => row.upkeep },
    { id: 'food', label: t('Economy.FoodPerMonth'), align: 'right', className: 'econ-negative', render: row => negativeFmt1(row.foodConsumption), sortValue: row => row.foodConsumption },
    {
      id: 'resources',
      label: t('Common.Resources'),
      render: row => (
        <span className="econ-inline-detail-cell">
          <ResourceAmountTags values={row.resourceUsage} tone="negative" limit={2} />
          {row.resourceUsage.length > 2 && (
            <button
              type="button"
              className="econ-detail-toggle"
              onMouseDown={(event) => {
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
      sortValue: row => row.resourceUsage.reduce((sum, value) => sum + value.amount, 0),
    },
    { id: 'location', label: t('Economy.Location'), render: row => <span className="econ-ellipsis">{row.location || '-'}</span>, sortValue: row => row.location },
    { id: 'priority', label: t('Economy.Priority'), render: row => <PriorityControls targetType="military" targetId={row.id} priority={row.priority} />, sortValue: row => priorityLabel(row.priority, t) },
  ];

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.MilitaryUpkeep')} />
      <div className="econ-section-summary">
        <SummaryRow label={t('Economy.TotalCost')} value={negativeFmt(total)} tone="econ-negative" />
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
        wrapClassName="econ-table-wrap--dashboard"
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
              onMouseDown={(event) => {
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
  return (
    <>
      <section className="econ-section">
        <SectionHeading variant="ornate" title={t('Economy.CashFlow')} />
        <div className="econ-overview-top">
          <BreakdownColumn title={t('Economy.Income')} rows={INCOME_ROWS} data={data} tone="income" />
          <BreakdownColumn title={t('Economy.Expenses')} rows={EXPENSE_ROWS} data={data} tone="expense" />
        </div>
      </section>
      <IncomeHistoryChart data={data} />
      <ResourceProduction resources={data?.resources ?? []} />
      <FoodBalanceDashboard data={data} />
      <StockpileDashboard resources={data?.resources ?? []} gold={data?.gold ?? 0} />
    </>
  );
}

function SettlementsTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  return <SettlementDashboard rows={data?.settlements ?? []} />;
}

function MilitaryTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  return <MilitaryDashboard rows={data?.militaries ?? []} />;
}

function ResourcesTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const rows = data?.resources ?? [];
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRow = rows.find(row => row.id === detailId) ?? null;
  const columns: EconomyColumn<EconomyOverviewResourceRow>[] = [
    { id: 'name', label: t('Economy.Resource'), render: row => <ResourceName row={row} />, sortValue: row => row.name },
    { id: 'category', label: t('Economy.Category'), render: row => resourceCategoryLabel(row.category, t), sortValue: row => resourceCategoryLabel(row.category, t) },
    { id: 'stockpile', label: t('Economy.Stockpile'), align: 'right', render: row => fmt1(row.amount), sortValue: row => row.amount },
    { id: 'production', label: t('Economy.Produced'), align: 'right', className: 'econ-positive', render: row => `+${fmt1(row.production)}`, sortValue: row => row.production },
    { id: 'vassals', label: t('Economy.Subjects'), align: 'right', render: row => `+${fmt1(row.vassalContribution)}`, sortValue: row => row.vassalContribution },
    { id: 'treaties', label: t('Economy.Treaties'), align: 'right', render: row => `+${fmt1(row.treatyIncome)}`, sortValue: row => row.treatyIncome },
    {
      id: 'use',
      label: t('Economy.Use'),
      align: 'right',
      className: 'econ-negative',
      render: row => negativeFmt1(row.armyUsage + row.queuedUsage + row.settlementConsumption),
      sortValue: row => row.armyUsage + row.queuedUsage + row.settlementConsumption,
    },
    { id: 'decay', label: t('Economy.Decay'), align: 'right', className: 'econ-negative', render: row => row.decayLoss > 0 ? `-${fmt1(row.decayLoss)}` : '0', sortValue: row => row.decayLoss },
    { id: 'net', label: t('Economy.NetPerMonth'), align: 'right', render: row => <span className={valueClass(row.netPerMonth)}>{signed(row.netPerMonth)}</span>, sortValue: row => row.netPerMonth },
    { id: 'market', label: t('Economy.Market'), align: 'right', render: row => `${fmt1(row.marketMultiplier)}x`, sortValue: row => row.marketMultiplier },
    { id: 'trade', label: t('Economy.Trade'), render: row => <TradeControls resource={row} gold={data?.gold ?? 0} /> },
    { id: 'autosell', label: t('Economy.AutoSell'), render: row => <AutoSellControl resource={row} /> },
    { id: 'producers', label: t('Economy.MainSources'), render: row => <ProducerLinks producers={row.producers} onOpen={() => setDetailId(current => current === row.id ? null : row.id)} />, sortValue: row => row.producers[0]?.name },
  ];

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.ResourceStockpiles')} />
      {detailRow && (
        <DetailPanel title={detailRow.name}>
          <ResourceSourceDetail resource={detailRow} />
        </DetailPanel>
      )}
      <EconomyDataTable
        rows={rows}
        columns={columns}
        emptyLabel={t('Economy.NoResourceStockpiles')}
        initialSort="net"
        initialSortDir="asc"
        rowKey={row => row.id}
        tableClassName="econ-table--resources"
        virtualRowHeight={40}
      />
    </section>
  );
}

function FoodTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const foodColumns: EconomyColumn<EconomyOverviewFoodRow>[] = [
    { id: 'settlement', label: t('Economy.Settlement'), render: row => <EntityLink type="settlement" id={row.settlementId}>{row.settlementName}</EntityLink>, sortValue: row => row.settlementName },
    { id: 'faction', label: t('Economy.Faction'), render: row => <EntityLink type="diplomacy" id={row.factionId}>{row.factionName}</EntityLink>, sortValue: row => row.factionName },
    { id: 'stockpile', label: t('Economy.Stockpile'), align: 'right', render: row => fmt1(row.stockpile), sortValue: row => row.stockpile },
    { id: 'production', label: t('Economy.Production'), align: 'right', className: 'econ-positive', render: row => `+${fmt1(row.production)}`, sortValue: row => row.production },
    { id: 'use', label: t('Economy.Use'), align: 'right', className: 'econ-negative', render: row => negativeFmt1(row.consumption), sortValue: row => row.consumption },
    { id: 'net', label: t('Economy.NetPerMonth'), align: 'right', render: row => <span className={valueClass(row.netPerMonth)}>{signed(row.netPerMonth)}</span>, sortValue: row => row.netPerMonth },
    { id: 'shortage', label: t('Economy.Shortage'), align: 'right', render: row => <span className={row.shortage > 0 ? 'econ-negative' : 'econ-neutral'}>{fmt1(row.shortage)}</span>, sortValue: row => row.shortage },
  ];

  const militaryColumns: EconomyColumn<EconomyOverviewMilitaryRow>[] = [
    { id: 'name', label: t('Economy.Force'), render: row => <EntityLink type="military" id={row.id}>{row.name}</EntityLink>, sortValue: row => row.name },
    { id: 'kind', label: t('Economy.Kind'), render: row => militaryKindLabel(row.kind, t), sortValue: row => row.kind },
    { id: 'stockpile', label: t('Economy.FoodStoresColumn'), align: 'right', render: row => fmt1(row.foodStockpile), sortValue: row => row.foodStockpile },
    { id: 'use', label: t('Economy.FoodUse'), align: 'right', className: 'econ-negative', render: row => `${negativeFmt1(row.foodConsumption)}${t('Economy.PerMonth')}`, sortValue: row => row.foodConsumption },
    { id: 'strength', label: t('Economy.Strength'), align: 'right', render: row => `${fmt(row.strength)} / ${fmt(row.maxStrength)}`, sortValue: row => row.strength },
    { id: 'priority', label: t('Economy.Priority'), render: row => <PriorityControls targetType="military" targetId={row.id} priority={row.priority} />, sortValue: row => priorityLabel(row.priority, t) },
    { id: 'location', label: t('Economy.Location'), render: row => row.location || '-', sortValue: row => row.location },
  ];

  return (
    <>
      <section className="econ-section">
        <SectionHeading variant="ornate" title={t('Economy.FoodFlow')} />
        <div className="econ-summary-grid">
          <SummaryRow label={t('Economy.Production')} value={`${fmt1(data?.foodProduction)}${t('Economy.PerMonth')}`} tone="econ-positive" />
          <SummaryRow label={t('Economy.SettlementUse')} value={`${negativeFmt1(data?.settlementFoodConsumption)}${t('Economy.PerMonth')}`} tone="econ-negative" />
          <SummaryRow label={t('Economy.ForceUse')} value={`${negativeFmt1(data?.armyFoodConsumption)}${t('Economy.PerMonth')}`} tone="econ-negative" />
          <SummaryRow label={t('Economy.NetChange')} value={`${signed(data?.foodNet)}${t('Economy.PerMonth')}`} tone={valueClass(data?.foodNet)} />
          <SummaryRow label={t('Economy.FoodStockpiles')} value={fmt1(data?.totalFood)} />
          <SummaryRow label={t('Economy.AutoBuy')} value={<AutoBuyControl data={data} />} />
        </div>
      </section>
      <EconomyTable
        title={t('Economy.SettlementFood')}
        rows={data?.foodRows ?? []}
        columns={foodColumns}
        emptyLabel={t('Economy.NoSettlementFoodRows')}
        initialSort="net"
        initialSortDir="asc"
        rowKey={row => row.settlementId}
      />
      <EconomyTable
        title={t('Economy.ForceFood')}
        rows={data?.militaries ?? []}
        columns={militaryColumns}
        emptyLabel={t('Economy.NoForcesUsingFood')}
        initialSort="use"
        rowKey={row => row.id}
      />
    </>
  );
}

function HistoryTab({ data }: { data: GetEconomyOverviewResponse | null }) {
  const t = useWebUIText();
  const points = (data?.history ?? []).slice(-24);
  const maxValue = Math.max(
    1,
    ...points.map(point => Math.abs(point.netIncome)),
    ...points.map(point => historySum(point, HISTORY_INCOME_KEYS)),
    ...points.map(point => historySum(point, HISTORY_EXPENSE_KEYS)),
  );

  return (
    <section className="econ-section">
      <SectionHeading variant="ornate" title={t('Economy.IncomeHistory')} />
      {points.length === 0 ? (
        <div className="econ-history-empty">{t('Economy.NoIncomeHistory')}</div>
      ) : (
        <div className="econ-history-chart">
          {points.map((point, index) => {
            const net = point.netIncome;
            const height = Math.min(100, Math.abs(net) / maxValue * 100);
            return (
              <div
                key={`${point.year}:${point.month}:${index}`}
                className="econ-history-col"
              >
                <div className="econ-history-track">
                  <div className={`econ-history-bar ${net >= 0 ? 'econ-history-bar--positive' : 'econ-history-bar--negative'}`} style={{ height: `${height}%` }} />
                </div>
                <span className="econ-history-label">{monthLabel(point)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
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
    { id: 'leakage', label: t('Economy.Leakage'), align: 'right', className: 'econ-negative', render: row => row.leakage > 0 ? `-${fmt(row.leakage)}${t('Economy.PerMonth')}` : `0${t('Economy.PerMonth')}`, sortValue: row => row.leakage },
    {
      id: 'losses',
      label: t('Economy.Losses'),
      render: row => (
        <span className="econ-inline-detail-cell">
          <span className="econ-ellipsis">{t('Economy.LossesBreakdown', { Blockade: fmt(row.blockadeLoss), Culture: fmt(row.culturalLoss), Corruption: fmt(row.corruptionLoss), Ungoverned: fmt(row.ungovernedLoss), Compliance: fmt(row.complianceLoss) })}</span>
          <button
            type="button"
            className="econ-detail-toggle"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDetailId(current => current === row.factionId ? null : row.factionId);
            }}
          >
            {detailId === row.factionId ? '-' : '+'}
          </button>
        </span>
      ),
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
    () => court?.positions.find(position => position.key === 'MasterOfEconomy') ?? null,
    [court],
  );

  const tabs = [
    { id: 'overview', label: t('Economy.TabOverview') },
    { id: 'resources', label: t('Economy.TabResources') },
    { id: 'food', label: t('Economy.TabFood') },
    { id: 'settlements', label: t('Economy.TabSettlements') },
    { id: 'military', label: t('Economy.TabMilitary') },
    { id: 'provinces', label: t('Economy.TabProvinces') },
    { id: 'history', label: t('Economy.TabHistory') },
  ];

  const content = (() => {
    if (activeTab === 'resources') return <ResourcesTab data={data} />;
    if (activeTab === 'food') return <FoodTab data={data} />;
    if (activeTab === 'settlements') return <SettlementsTab data={data} />;
    if (activeTab === 'military') return <MilitaryTab data={data} />;
    if (activeTab === 'provinces') return <ProvinceTab data={data} />;
    if (activeTab === 'history') return <HistoryTab data={data} />;
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
      className="screen--economy"
      tabs={<SidebarTabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as EconomyTab)} />}
      headerExtra={<StatsBar data={data} />}
      contentClassName="econ-content"
      styledScrollContent
    >
      {officeStrip}
      <div className="econ-wrap">{content}</div>
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

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import { useGameActions } from '../../../context/GameContext';
import { playSound } from '../../../hooks/useSound';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useBuildQueueBridge, unqueueBuildQueueItem, type BuildQueueCostView, type BuildQueueItemView } from '../../../bridge/settlements-economy/useBuildQueueBridge';
import { registerScreen } from '../../../registry/index';
import { UI_PRESENTATION } from '../../../config/presentation';
import { formatNumber } from '../../../utils/numberFormat';
import ResourceLink from '../../common/resources/ResourceLink';
import './BuildQueueScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
type FilterKey = 'all' | 'buildings' | 'recruitment' | 'waiting';
type SortKey = 'settlement' | 'item' | 'status' | 'remaining';
type SortDir = 'asc' | 'desc';

interface SortOption {
  id: SortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { id: 'settlement', get label() { return webUIText('Auto.TopProp.ComponentsScreensBuildQueueScreen.24.1'); } },
  { id: 'item', get label() { return webUIText('Auto.TopProp.ComponentsScreensBuildQueueScreen.25.2'); } },
  { id: 'status', get label() { return webUIText('Auto.TopProp.ComponentsScreensBuildQueueScreen.26.3'); } },
  { id: 'remaining', get label() { return webUIText('Auto.TopProp.ComponentsScreensBuildQueueScreen.27.4'); } },
];

const EMPTY_ITEMS: BuildQueueItemView[] = [];
/** Matches .buildq-row min-height plus a little slack for multi-line costs. */
const BUILDQ_ROW_HEIGHT_REM = 6.6;

function n(value: number | undefined): string {
  return formatNumber(value ?? 0);
}

function percent(value: number): string {
  return `${formatNumber(value, { maximumFractionDigits: 0 })}%`;
}

function norm(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function compareStrings(a: string, b: string): number {
  return norm(a).localeCompare(norm(b));
}

function sortValue(item: BuildQueueItemView, key: SortKey): string | number {
  if (key === 'item') return item.itemName;
  if (key === 'status') return item.statusLabel || item.state;
  if (key === 'remaining') return item.remainingDays;
  return item.settlementName;
}

function compareItems(a: BuildQueueItemView, b: BuildQueueItemView, key: SortKey): number {
  const av = sortValue(a, key);
  const bv = sortValue(b, key);
  if (typeof av === 'number' || typeof bv === 'number') {
    return Number(av ?? 0) - Number(bv ?? 0);
  }
  const primary = compareStrings(String(av), String(bv));
  if (primary !== 0) return primary;
  return compareStrings(a.itemName, b.itemName);
}

function daysLabel(days: number): string {
  if (days <= 0) return webUIText("Auto.Return.componentsscreensBuildQueueScreen.67.1");
  if (days === 1) return webUIText("Auto.Return.componentsscreensBuildQueueScreen.68.1");
  return webUIText("Auto.Return.componentsscreensBuildQueueScreen.69.1", { Value1: n(days) });
}

function filterItem(item: BuildQueueItemView, filter: FilterKey): boolean {
  if (filter === 'buildings') return item.itemKind === 'building';
  if (filter === 'recruitment') return item.itemKind !== 'building';
  if (filter === 'waiting') return item.state === 'awaiting_resources';
  return true;
}

function itemMatchesSearch(item: BuildQueueItemView, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    item.itemName,
    item.itemKindLabel,
    item.statusLabel,
    item.statusReason,
    item.settlementName,
    item.factionName,
  ].some(value => norm(value).includes(query));
}

function CostPart({ icon, label, value }: { icon?: string; label: string; value: string }) {
  return (
    <span className="buildq-cost-part">
      {icon && <img src={icon} alt="" className="buildq-cost-icon" draggable={false} />}
      <span className="buildq-cost-value">{value}</span>
      <span className="buildq-cost-label">{label}</span>
    </span>
  );
}

function ResourceCosts({ costs }: { costs: BuildQueueCostView[] }) {
  if (costs.length === 0) return null;
  return (
    <>
      {costs.map(cost => (
        <ResourceLink key={cost.name} resourceId={cost.name}>
          <CostPart
            icon={cost.icon}
            label={cost.label || cost.name}
            value={n(Math.ceil(cost.amount))}
          />
        </ResourceLink>
      ))}
    </>
  );
}

function EntityButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="buildq-link"
      onClick={(event) => {
        event.preventDefault();
        playSound('click');
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function QueueRow({
  item,
  pending,
  onOpenSettlement,
  onCancel,
}: {
  item: BuildQueueItemView;
  pending: boolean;
  onOpenSettlement: (settlementId: string) => void;
  onCancel: (item: BuildQueueItemView) => void;
}) {
  const hasProgress = item.hasActiveItem && item.state === 'building';
  const progressWidth = Math.max(0, Math.min(100, item.progressPercent));
  const countLabel = item.count > 1 ? webUIText("BuildQueue.Multiplier", { Value1: n(item.count) }) : '';
  const statusClass = item.state ? ` buildq-status--${item.state}` : '';
  const cancelClass = `buildq-cancel${pending ? ' buildq-cancel--pending' : ''}`;

  return (
    <div className={`buildq-row${item.hasActiveItem ? ' buildq-row--active' : ''}`}>
      <div className="buildq-art">
        <img src={item.icon} alt="" className="buildq-art-icon" draggable={false} />
        {countLabel && <span className="buildq-count">{countLabel}</span>}
      </div>

      <div className="buildq-main">
        <div className="buildq-title-row">
          <div className="buildq-title-wrap">
            <span className="buildq-title">{item.itemName}</span>
            <span className="buildq-subtitle">
              <EntityButton onClick={() => onOpenSettlement(item.settlementId)}>{item.settlementName}</EntityButton>
              {item.isVassal && item.factionName && <span className="buildq-vassal">{`- ${item.factionName}`}</span>}
            </span>
          </div>
          <div className={`buildq-status${statusClass}`}>
            <span className="buildq-kind">{item.itemKindLabel}</span>
            <span className="buildq-status-label">{item.statusLabel || webUIText("BuildQueue.Queued")}</span>
          </div>
        </div>

        <div className="buildq-meta">
          {item.goldCost > 0 && (
            <CostPart icon="/assets/icons/I_Coins.png" label={webUIText('Auto.Attr.ComponentsScreensBuildQueueScreen.213.1')} value={n(item.goldCost)} />
          )}
          {item.populationCost > 0 && (
            <CostPart label={webUIText('Auto.Attr.ComponentsScreensBuildQueueScreen.216.2')} value={n(item.populationCost)} />
          )}
          <ResourceCosts costs={item.resourceCost} />
          <span className="buildq-days">{daysLabel(item.remainingDays || item.durationDays)}</span>
        </div>

        {item.statusReason && <div className="buildq-reason">{item.statusReason}</div>}

        {item.missingResources.length > 0 && (
          <div className="buildq-missing">
            <span className="buildq-missing-label"><WebUIText textKey="Auto.ComponentsScreensBuildQueueScreen.225.6" /></span>
            <ResourceCosts costs={item.missingResources} />
          </div>
        )}

        {hasProgress && (
          <div className="buildq-progress">
            <div className="buildq-progress-track">
              <span className="buildq-progress-fill" style={{ width: `${progressWidth}%` }} />
            </div>
            <span className="buildq-progress-text">{percent(progressWidth)}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className={cancelClass}
        onClick={() => onCancel(item)}
        disabled={pending}
      >
        <img src="/assets/icons/I_Close.png" alt="" className="buildq-cancel-icon" draggable={false} />
        <span>{pending ? webUIText("BuildQueue.Cancelling") : webUIText("Common.Cancel")}</span>
      </button>
    </div>
  );
}

export default function BuildQueueScreen({ onClose }: { onClose: () => void }) {
  const data = useBuildQueueBridge();
  const { openSidebar } = useGameActions();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('settlement');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [virtualRowHeight, setVirtualRowHeight] = useState(() => (
    Math.ceil(UI_PRESENTATION.rootFontSizePx * BUILDQ_ROW_HEIGHT_REM)
  ));

  useEffect(() => {
    const updateVirtualRowHeight = () => {
      const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
      const safeFontSize = Number.isFinite(rootFontSize) && rootFontSize > 0
        ? rootFontSize
        : UI_PRESENTATION.rootFontSizePx;
      setVirtualRowHeight(Math.ceil(safeFontSize * BUILDQ_ROW_HEIGHT_REM));
    };
    updateVirtualRowHeight();
    window.addEventListener('webkiln:runtime-viewport', updateVirtualRowHeight);
    window.addEventListener('resize', updateVirtualRowHeight);
    return () => {
      window.removeEventListener('webkiln:runtime-viewport', updateVirtualRowHeight);
      window.removeEventListener('resize', updateVirtualRowHeight);
    };
  }, []);

  const items = data?.items ?? EMPTY_ITEMS;
  const filterTabs = [
    { id: 'all', label: webUIText('Auto.Prop.ComponentsScreensBuildQueueScreen.265.3'), count: items.length },
    { id: 'buildings', label: webUIText('Auto.Prop.ComponentsScreensBuildQueueScreen.266.4'), count: items.filter(item => item.itemKind === 'building').length },
    { id: 'recruitment', label: webUIText('Auto.Prop.ComponentsScreensBuildQueueScreen.267.5'), count: items.filter(item => item.itemKind !== 'building').length },
    { id: 'waiting', label: webUIText('Auto.Prop.ComponentsScreensBuildQueueScreen.268.6'), count: items.filter(item => item.state === 'awaiting_resources').length },
  ];

  const visibleItems = useMemo(() => {
    const filtered = items.filter(item => filterItem(item, activeFilter) && itemMatchesSearch(item, search));
    const sorted = [...filtered].sort((a, b) => compareItems(a, b, sortKey));
    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [activeFilter, items, search, sortDir, sortKey]);

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const cancelItem = (item: BuildQueueItemView) => {
    const key = `${item.settlementId}:${item.cancelQueueIndex}`;
    if (pendingKeys.includes(key)) return;
    playSound('click');
    setPendingKeys(current => [...current, key]);
    unqueueBuildQueueItem(item.settlementId, item.cancelQueueIndex)
      .catch(acknowledgeBridgeFailure)
      .finally(() => {
        setPendingKeys(current => current.filter(existing => existing !== key));
      });
  };

  const queueColumns: Array<DataTableColumn<BuildQueueItemView>> = [{
    id: 'queue',
    label: webUIText('Auto.Prop.ComponentsScreensBuildQueueScreen.301.7'),
    sortable: false,
    render: item => {
      const pendingKey = `${item.settlementId}:${item.cancelQueueIndex}`;
      return (
        <QueueRow
          item={item}
          pending={pendingKeys.includes(pendingKey)}
          onOpenSettlement={(settlementId) => openSidebar('settlement', settlementId)}
          onCancel={cancelItem}
        />
      );
    },
  }];

  return (
    <ScreenShell
      title={webUIText('Auto.Attr.ComponentsScreensBuildQueueScreen.318.8')}
      onClose={onClose}
      tabs={<SidebarTabBar tabs={filterTabs} activeTab={activeFilter} onTabChange={(id) => setActiveFilter(id as FilterKey)} />}
      className="screen--buildq"
      contentClassName="buildq-content"
    >
      <div className="buildq-wrap">
        <div className="buildq-tools">
          <input
            className="search-input buildq-search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={webUIText('Auto.Attr.ComponentsScreensBuildQueueScreen.339.9')}
          />
          <div className="buildq-sort">
            {SORT_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                className={`buildq-sort-btn${sortKey === option.id ? ' buildq-sort-btn--active' : ''}`}
                onClick={() => changeSort(option.id)}
              >
                <span>{option.label}</span>
                {sortKey === option.id && (
                  <span className={`buildq-sort-arrow buildq-sort-arrow--${sortDir}`} aria-hidden="true">
                    <span className="buildq-sort-arrow__triangle" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <span className="buildq-visible-count">{`${n(visibleItems.length)} / ${n(items.length)}`}</span>
        </div>

        <DataTable
          rows={visibleItems}
          columns={queueColumns}
          rowKey={item => item.id}
          emptyLabel={webUIText('Auto.ExtraAttr.ComponentsScreensBuildQueueScreen.365.1')}
          wrapperClassName="buildq-list"
          tableClassName="buildq-list-table"
          bodyClassName="buildq-list-body"
          rowClassName="buildq-list-row"
          bodyCellClassName="buildq-list-cell"
          bodyScrollFrameClassName="buildq-list-scroll"
          emptyClassName="buildq-empty"
          hideHeader
          styledScrollbar
          virtualized
          virtualizeThreshold={24}
          virtualRowHeight={virtualRowHeight}
          virtualOverscan={8}
        />
      </div>
    </ScreenShell>
  );
}

registerScreen({
  id: 'build',
  render: ({ onClose }) => <BuildQueueScreen onClose={onClose} />,
  topbarId: 'build',
});

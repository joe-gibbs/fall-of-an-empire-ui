import type { GetLedgerOverviewResponse } from '../../bridge-types.generated.ts';
import { clearBridgeQueryCache, useBridgeQuery } from '../core/useBridgeQuery';
import type { SortState } from '../../components/common/layout/tables/sortUtils';

const ALL_FILTER = '__all__';
const ledgerOverviewCache = new Map<string, GetLedgerOverviewResponse>();
let latestCounts: Pick<GetLedgerOverviewResponse,
  'settlementCount' | 'militaryCount' | 'factionCount' | 'resourceCount' | 'buildingCount' | 'notificationCount'
> | null = null;

export interface LedgerOverviewBridgeFilters {
  searchText?: string;
  settlementFactionFilter?: string;
  settlementTypeFilter?: string;
  settlementRegionFilter?: string;
  buildingCategoryFilter?: string;
  buildingFactionFilter?: string;
}

export function clearLedgerOverviewCache(): void {
  ledgerOverviewCache.clear();
  latestCounts = null;
  clearBridgeQueryCache('game.get_ledger_overview');
}

export function useLedgerOverviewBridge(
  activeTab: string,
  rowOffset = 0,
  rowLimit = 0,
  sortState?: SortState<string>,
  filters: LedgerOverviewBridgeFilters = {},
): GetLedgerOverviewResponse | null {
  const sortKey = sortState?.key ?? '';
  const sortDirection = sortState?.direction ?? 'asc';
  const searchText = filters.searchText ?? '';
  const settlementFactionFilter = filters.settlementFactionFilter ?? ALL_FILTER;
  const settlementTypeFilter = filters.settlementTypeFilter ?? ALL_FILTER;
  const settlementRegionFilter = filters.settlementRegionFilter ?? ALL_FILTER;
  const buildingCategoryFilter = filters.buildingCategoryFilter ?? ALL_FILTER;
  const buildingFactionFilter = filters.buildingFactionFilter ?? ALL_FILTER;
  const filterKey = [
    searchText,
    settlementFactionFilter,
    settlementTypeFilter,
    settlementRegionFilter,
    buildingCategoryFilter,
    buildingFactionFilter,
  ].join(':');
  const cacheKey = `${activeTab}:${rowOffset}:${rowLimit}:${sortKey}:${sortDirection}:${filterKey}`;
  const live = useBridgeQuery({
    action: 'game.get_ledger_overview',
    payload: {
      activeTab,
      rowOffset,
      rowLimit,
      sortKey,
      sortDirection,
      searchText,
      settlementFactionFilter,
      settlementTypeFilter,
      settlementRegionFilter,
      buildingCategoryFilter,
      buildingFactionFilter,
    },
    cacheResponseMs: 1000,
    matchPush: (data) => {
      if (data.rowOffset !== rowOffset || data.rowLimit !== rowLimit) return false;
      if (activeTab === 'settlements') return data.settlements.length > 0 || data.settlementCount === 0;
      if (activeTab === 'militaries') return data.militaries.length > 0 || data.militaryCount === 0;
      if (activeTab === 'factions') return data.factions.length > 0 || data.factionCount === 0;
      if (activeTab === 'resources') return data.resources.length > 0 || data.resourceCount === 0;
      if (activeTab === 'buildings') return data.buildings.length > 0 || data.buildingCount === 0;
      if (activeTab === 'notifications') return data.notifications.length > 0 || data.notificationCount === 0;
      return true;
    },
    map: (data) => {
      latestCounts = {
        settlementCount: data.settlementCount,
        militaryCount: data.militaryCount,
        factionCount: data.factionCount,
        resourceCount: data.resourceCount,
        buildingCount: data.buildingCount,
        notificationCount: data.notificationCount,
      };
      ledgerOverviewCache.set(cacheKey, data);
      return data;
    },
  });

  const cached = live ?? ledgerOverviewCache.get(cacheKey) ?? null;
  return cached && latestCounts ? { ...cached, ...latestCounts } : cached;
}

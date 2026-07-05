import React, { useEffect, useState } from 'react';
import Tooltip from './Tooltip';
import type { TooltipLine } from './Tooltip';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import type { GetGeographicSummaryResponse } from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';

import { webUIText } from '../../../localization/WebUITextContext';
type Tier = 'region' | 'land' | 'domain';

interface RegionTooltipProps {
  tier: Tier;
  /** Class-name key from the settlement bridge (regionKey/landKey/domainKey). */
  regionKey?: string;
  /** Localised display name shown immediately, before the bridge response arrives. */
  name: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}

const TIER_LABEL: Record<Tier, string> = {
  region: 'Region',
  land: 'Land',
  domain: 'Domain',
};

const CHILD_HEADING: Record<string, string> = {
  settlement: 'Settlements',
  region: 'Regions',
  land: 'Lands',
};

interface CachedEntry {
  data: GetGeographicSummaryResponse | null;
  fetchedAt: number;
}

const CACHE_TTL_MS = 3000;
const cache = new Map<string, CachedEntry>();
const inflight = new Map<string, Promise<GetGeographicSummaryResponse>>();

function fetchSummary(tier: Tier, key: string): Promise<GetGeographicSummaryResponse> {
  const id = `${tier}:${key}`;
  const cached = cache.get(id);
  const now = Date.now();
  if (cached && cached.data && now - cached.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  const existing = inflight.get(id);
  if (existing) return existing;
  const promise = bridgeCall('game.get_geographic_summary', { key, tier })
    .then((res) => {
      cache.set(id, { data: res, fetchedAt: Date.now() });
      inflight.delete(id);
      return res;
    })
    .catch((err) => {
      inflight.delete(id);
      throw err;
    });
  inflight.set(id, promise);
  return promise;
}

interface KeyedData {
  key: string;
  tier: Tier;
  data: GetGeographicSummaryResponse;
}

const RegionTooltip: React.FC<RegionTooltipProps> = ({ tier, regionKey, name, position = 'bottom', delay = 200, children }) => {
  const [keyed, setKeyed] = useState<KeyedData | null>(null);

  useEffect(() => {
    if (!regionKey) return;
    let cancelled = false;
    fetchSummary(tier, regionKey)
      .then((res) => { if (!cancelled) setKeyed({ key: regionKey, tier, data: res }); })
      .catch(() => { /* leave data unset - tooltip falls back to title only */ });
    return () => { cancelled = true; };
  }, [tier, regionKey]);

  // Discard stale data from a previous regionKey/tier so the tooltip never
  // shows children from a different region while the new fetch is in flight.
  const data = (keyed && keyed.key === regionKey && keyed.tier === tier) ? keyed.data : null;

  const lines: TooltipLine[] = [];
  if (data) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsCommonRegionTooltip.89.1'), value: formatNumber(data.totalPopulation) });
    if (data.children.length > 0) {
      lines.push({ get label() { return CHILD_HEADING[data.childTier] ?? webUIText("Auto.Fix.PropExprFallback.componentscommonRegionTooltip.92.1"); }, isHeader: true });
      for (const child of data.children) {
        lines.push({ label: child.name, value: formatNumber(child.population) });
      }
    }
  }

  const content = {
    title: name,
    body: TIER_LABEL[tier],
    lines: lines.length > 0 ? lines : undefined,
  };

  return (
    <Tooltip content={content} position={position} delay={delay}>
      {children}
    </Tooltip>
  );
};

export default RegionTooltip;

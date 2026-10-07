import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent, type GetConfederationDataResponse } from '../../../bridge-types.generated';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import type { WebUITextFormatter } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';

type Section = GetConfederationDataResponse['sections'][number];
type Row = Section['rows'][number];

export function detailLines(rows: Row[], gameDay: number, t: WebUITextFormatter, sections: Section[]): TooltipLine[] {
  return rows.map(row => {
    const elapsed = gameDay - row.dateStartDay;
    const value = row.dateStartDay < 0 ? row.value : row.requiredDays < 0 ? formatNumber(elapsed)
      : t('Confederation.DayRequirement', { Days: formatNumber(elapsed), Required: formatNumber(row.requiredDays) });
    const status = row.status === 'neutral' || row.dateStartDay < 0 || row.requiredDays < 0 ? row.status
      : elapsed >= row.requiredDays ? 'met' : 'unmet';
    const nested = row.tooltipId ? sections.find(section => section.id === row.tooltipId) : undefined;
    return {
      label: row.label, value,
      valueColor: status === 'met' ? 'var(--green)' : status === 'unmet' ? 'var(--red)' : undefined,
      subTooltip: nested ? sectionTooltip(nested, gameDay, t, sections) : undefined,
    };
  });
}

export function sectionTooltip(section: Section, gameDay: number, t: WebUITextFormatter, sections: Section[]): TooltipContent {
  return { title: section.title, lines: detailLines(section.rows, gameDay, t, sections) };
}

export function useConfederationData(factionId: string) {
  const [response, setResponse] = useState<GetConfederationDataResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const accept = (next: GetConfederationDataResponse) => {
      if (mounted && next.factionId === factionId) setResponse(next);
    };
    const unsubscribe = onBridgeEvent('game.get_confederation_data', accept);
    void bridgeCall('game.get_confederation_data', { factionId, active: true }).then(accept).catch(acknowledgeBridgeFailure);
    return () => {
      mounted = false;
      unsubscribe();
      void bridgeCall('game.get_confederation_data', { factionId, active: false }).catch(acknowledgeBridgeFailure);
    };
  }, [factionId]);

  return response?.factionId === factionId ? response : null;
}

import type { DiplomacyWarScoreEntry } from '../../../bridge-types.generated.ts';
import { webUIText } from '../../../localization/WebUITextContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import type { TooltipContent } from '../../common/tooltips/Tooltip';

export function warScoreBreakdownTooltip(
  entries: DiplomacyWarScoreEntry[] | undefined | null,
): TooltipContent {
  return {
    title: webUIText('Diplomacy.WarScoreBreakdown'),
    body: webUIText('Diplomacy.WarScoreBreakdownBody'),
    lines: (entries ?? []).map(entry => ({
      label: `${entry.depth > 0 ? '· ' : ''}${entry.label}${entry.eventCount > 1 ? ` (${formatNumber(entry.eventCount)})` : ''}`,
      value: formatSignedNumber(entry.score, { maximumFractionDigits: 1 }),
      valueColor: entry.score >= 0 ? 'var(--green)' : 'var(--red)',
    })),
  };
}

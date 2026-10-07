import type { DiplomacyWarScoreEntry } from '../../../bridge-types.generated';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import { webUIText } from '../../../localization/WebUITextContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';

const NESTED_DETAIL_LIMIT = 8;

interface WarScoreCategory {
  category: DiplomacyWarScoreEntry;
  details: DiplomacyWarScoreEntry[];
}

function formatScore(score: number): string {
  return formatSignedNumber(score, { maximumFractionDigits: 1 });
}

function scoreColor(score: number): string {
  if (score > 0) return 'var(--green)';
  if (score < 0) return 'var(--red)';
  return 'var(--gold)';
}

function scoreLine(label: string, score: number, extra?: Partial<TooltipLine>): TooltipLine {
  return {
    label,
    value: formatScore(score),
    valueColor: scoreColor(score),
    ...extra,
  };
}

function compareByMagnitude(a: DiplomacyWarScoreEntry, b: DiplomacyWarScoreEntry): number {
  const magnitude = Math.abs(b.score) - Math.abs(a.score);
  if (magnitude !== 0) return magnitude;
  return a.label.localeCompare(b.label);
}

function parseCategories(entries: DiplomacyWarScoreEntry[]): { ours: WarScoreCategory[]; theirs: WarScoreCategory[] } {
  const ours: WarScoreCategory[] = [];
  const theirs: WarScoreCategory[] = [];
  let current: WarScoreCategory | null = null;

  for (const entry of entries) {
    if (entry.depth <= 0) {
      current = { category: entry, details: [] };
      (entry.isOurs ? ours : theirs).push(current);
      continue;
    }
    current?.details.push(entry);
  }

  for (const group of [...ours, ...theirs]) {
    group.details.sort(compareByMagnitude);
  }
  ours.sort((a, b) => compareByMagnitude(a.category, b.category));
  theirs.sort((a, b) => compareByMagnitude(a.category, b.category));

  return { ours, theirs };
}

function sideTotal(categories: WarScoreCategory[]): number {
  return categories.reduce((sum, group) => sum + group.category.score, 0);
}

function detailLine(entry: DiplomacyWarScoreEntry): TooltipLine {
  return scoreLine(entry.label, entry.score);
}

function nestedDetailLines(details: DiplomacyWarScoreEntry[]): TooltipLine[] {
  if (details.length <= NESTED_DETAIL_LIMIT + 1) {
    return details.map(detailLine);
  }

  const inline = details.slice(0, NESTED_DETAIL_LIMIT);
  const overflow = details.slice(NESTED_DETAIL_LIMIT);
  const overflowScore = overflow.reduce((sum, entry) => sum + entry.score, 0);
  return [
    ...inline.map(detailLine),
    scoreLine(
      webUIText('Diplomacy.WarScoreOthers', { Count: formatNumber(overflow.length) }),
      overflowScore,
      {
        subTooltip: {
          title: webUIText('Diplomacy.WarScoreOthers', { Count: formatNumber(overflow.length) }),
          lines: overflow.map(detailLine),
        },
      },
    ),
  ];
}

function categorySubTooltip(group: WarScoreCategory): TooltipContent | undefined {
  if (group.details.length === 0) return undefined;
  return {
    title: group.category.label,
    lines: nestedDetailLines(group.details),
  };
}

function appendCategory(lines: TooltipLine[], group: WarScoreCategory): void {
  const { category } = group;
  const subTooltip = categorySubTooltip(group);
  lines.push(scoreLine(category.label, category.score, subTooltip ? { subTooltip } : undefined));
}

function appendSide(
  lines: TooltipLine[],
  header: string,
  categories: WarScoreCategory[],
): void {
  if (categories.length === 0) return;
  const total = sideTotal(categories);
  lines.push({
    label: header,
    value: formatScore(total),
    valueColor: scoreColor(total),
    isHeader: true,
  });
  for (const group of categories) {
    appendCategory(lines, group);
  }
}

export function warScoreBreakdownTooltip(
  entries: DiplomacyWarScoreEntry[] | undefined,
  netScore?: number,
): TooltipContent {
  const { ours, theirs } = parseCategories(entries ?? []);
  const lines: TooltipLine[] = [];
  appendSide(lines, webUIText('Diplomacy.WarScoreYourGains'), ours);
  appendSide(lines, webUIText('Diplomacy.WarScoreEnemyGains'), theirs);

  if (lines.length > 0) {
    const net = netScore ?? sideTotal(ours) + sideTotal(theirs);
    lines.push({
      label: webUIText('Diplomacy.WarScoreNet'),
      value: formatScore(net),
      valueColor: scoreColor(net),
      isHeader: true,
    });
  }

  return {
    title: webUIText('Diplomacy.WarScoreBreakdown'),
    body: webUIText('Diplomacy.WarScoreBreakdownBody'),
    lines,
  };
}

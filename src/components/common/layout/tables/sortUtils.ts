export type SortDirection = 'asc' | 'desc';
export type SortValue = string | number | boolean | null | undefined;

export interface SortState<T extends string> {
  key: T;
  direction: SortDirection;
}

const SORT_TEXT_REPLACEMENTS: Record<string, string> = {
  '\u00df': 'ss',
  '\u00e6': 'ae',
  '\u0153': 'oe',
  '\u00f0': 'd',
  '\u00fe': 'th',
  '\u0142': 'l',
  '\u00f8': 'o',
  '\u0111': 'd',
  '\u0131': 'i',
};

export function normaliseSortText(value: unknown): string {
  const raw = String(value ?? '').toLowerCase();
  let normalized = raw;
  try {
    normalized = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  } catch {
    normalized = raw;
  }

  return normalized.replace(/[\u00df\u00e6\u0153\u00f0\u00fe\u0142\u00f8\u0111\u0131]/g, character => (
    SORT_TEXT_REPLACEMENTS[character] ?? character
  ));
}

export function textMatchesSearch(haystack: unknown, query: unknown): boolean {
  const needle = normaliseSortText(query).trim();
  if (!needle) return true;
  return normaliseSortText(haystack).includes(needle);
}

function normaliseSortValue(value: unknown): string {
  return normaliseSortText(value);
}

export function compareSortValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' || typeof b === 'number') return Number(a ?? 0) - Number(b ?? 0);
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) - Number(b);
  return normaliseSortValue(a).localeCompare(normaliseSortValue(b));
}

export function compareSortValuesWithDirection(a: SortValue, b: SortValue, direction: SortDirection): number {
  const result = compareSortValues(a, b);
  return direction === 'asc' ? result : -result;
}

export function toggleSortState<T extends string>(
  current: SortState<T>,
  key: T,
  initialDirection: SortDirection = 'asc',
): SortState<T> {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }

  return { key, direction: initialDirection };
}

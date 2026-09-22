export function appendTooltipSection<T extends { label?: unknown; isHeader?: boolean }>(
  lines: T[],
  title: string,
  section: T[],
) {
  if (section.length === 0) return;
  lines.push({ label: title, isHeader: true } as T);
  lines.push(...section);
}

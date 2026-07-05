export function clampUnitFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function percentWidth(value: number): string {
  return `${(clampUnitFraction(value) * 100).toFixed(1)}%`;
}

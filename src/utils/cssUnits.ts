const ROOT_REM_FALLBACK = 11;

function formatRem(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0001) return '0';
  return `${value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}rem`;
}

export function toRootRem(value: number): string {
  const rootSize = typeof window !== 'undefined'
    ? Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize)
    : ROOT_REM_FALLBACK;
  const divisor = Number.isFinite(rootSize) && rootSize > 0 ? rootSize : ROOT_REM_FALLBACK;
  return formatRem(value / divisor);
}

export function designRem(value: number): string {
  return formatRem(value / ROOT_REM_FALLBACK);
}

export function designUnitScale(): number {
  const rootSize = typeof window !== 'undefined'
    ? Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize)
    : ROOT_REM_FALLBACK;
  return Number.isFinite(rootSize) && rootSize > 0 ? rootSize / ROOT_REM_FALLBACK : 1;
}

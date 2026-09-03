interface FormatNumberOptions {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

function clampFractionDigits(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(6, Math.round(value)));
}

function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatNumber(value: number | undefined | null, options: FormatNumberOptions = {}): string {
  const maximumFractionDigits = clampFractionDigits(options.maximumFractionDigits);
  const minimumFractionDigits = Math.min(
    maximumFractionDigits,
    clampFractionDigits(options.minimumFractionDigits),
  );
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return '0';

  const factor = Math.pow(10, maximumFractionDigits);
  const rounded = maximumFractionDigits > 0
    ? Math.round(Math.abs(numberValue) * factor) / factor
    : Math.round(Math.abs(numberValue));
  let raw = maximumFractionDigits > 0
    ? rounded.toFixed(maximumFractionDigits)
    : String(rounded);

  if (maximumFractionDigits > minimumFractionDigits && raw.indexOf('.') >= 0) {
    const parts = raw.split('.');
    let decimals = parts[1] ?? '';
    while (decimals.length > minimumFractionDigits && decimals.endsWith('0')) {
      decimals = decimals.slice(0, -1);
    }
    raw = decimals.length > 0 ? `${parts[0]}.${decimals}` : parts[0];
  }

  const parts = raw.split('.');
  const sign = numberValue < 0 && rounded !== 0 ? '-' : '';
  return `${sign}${groupDigits(parts[0])}${parts[1] !== undefined ? `.${parts[1]}` : ''}`;
}

export function formatSignedNumber(value: number | undefined | null, options: FormatNumberOptions = {}): string {
  const formatted = formatNumber(value, options);
  const numericValue = Number(value ?? 0);
  return numericValue > 0 ? `+${formatted}` : formatted;
}

function resourceFractionDigits(value: number | undefined | null): number {
  const absoluteValue = Math.abs(Number(value ?? 0));
  if (!Number.isFinite(absoluteValue) || absoluteValue === 0) return 0;
  return absoluteValue >= 0.1 ? 1 : 2;
}

export function formatResourceNumber(value: number | undefined | null): string {
  return formatNumber(value, { maximumFractionDigits: resourceFractionDigits(value) });
}

export function formatSignedResourceNumber(value: number | undefined | null): string {
  return formatSignedNumber(value, { maximumFractionDigits: resourceFractionDigits(value) });
}

export function formatCompactNumber(value: number | undefined | null): string {
  const numberValue = Math.round(Number(value ?? 0));
  if (!Number.isFinite(numberValue)) return '0';

  const abs = Math.abs(numberValue);
  if (abs >= 1000000) return `${formatNumber(numberValue / 1000000, { maximumFractionDigits: 1 })}m`;
  if (abs >= 1000) return `${formatNumber(numberValue / 1000, { maximumFractionDigits: 1 })}k`;
  return formatNumber(numberValue);
}

export function formatPercent(value: number | undefined | null, maximumFractionDigits = 0): string {
  return `${formatNumber(value, { maximumFractionDigits })}%`;
}

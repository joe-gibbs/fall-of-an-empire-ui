import { formatNumber, formatPercent, formatSignedNumber } from '../../../../utils/numberFormat';

export function compactNumber(value: number, fallback = ''): string {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return formatNumber(value);
}

export function signedNumber(value: number): string {
  return formatSignedNumber(value);
}

export function oneDecimal(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

export function percentValue(value: number): string {
  return formatPercent(value * 100);
}

export function percentInteger(value: number): string {
  return formatPercent(value * 100, 0);
}

export function signedTone(value: number): 'positive' | 'negative' | 'muted' {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'muted';
}

export function riskTone(value: number): 'positive' | 'warning' | 'negative' {
  if (value < 0.25) return 'positive';
  if (value < 0.6) return 'warning';
  return 'negative';
}

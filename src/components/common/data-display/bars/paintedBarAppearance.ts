import type { PaintedBarColor } from './PaintedBar';

export interface PaintedBarAppearance {
  color: PaintedBarColor;
  tint?: string;
}

export function paintedBarAppearance(colour?: string): PaintedBarAppearance {
  switch (colour) {
    case undefined:
    case 'var(--gold)':
    case 'var(--yellow)':
      return { color: 'gold' };
    case 'var(--green)':
      return { color: 'green' };
    case 'var(--red)':
    case 'var(--red-light)':
      return { color: 'red' };
    default:
      return { color: 'gold', tint: colour };
  }
}

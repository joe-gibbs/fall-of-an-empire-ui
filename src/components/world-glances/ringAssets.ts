import type { CSSProperties } from 'react';
import { clampUnitFraction } from './glanceMath';

const RING_ASSET_ROOT = '/assets/glance/rings';
const MILITARY_RING_COLUMNS = 25;
const MILITARY_RING_ROWS = 17;
const MILITARY_STRENGTH_SEGMENTS = 16;
const MILITARY_MORALE_SEGMENTS = 24;
const MILITARY_RING_STACK_SRC: Record<string, string> = {
  own: `${RING_ASSET_ROOT}/military-ring-stack-own.png`,
  ally: `${RING_ASSET_ROOT}/military-ring-stack-ally.png`,
  enemy: `${RING_ASSET_ROOT}/military-ring-stack-enemy.png`,
  neutral: `${RING_ASSET_ROOT}/military-ring-stack-neutral.png`,
};

function ringBucket(value: number, segments: number): number {
  const clamped = clampUnitFraction(value);
  if (clamped <= 0.001) return 0;
  return Math.max(1, Math.min(segments, Math.ceil(clamped * segments - 0.0001)));
}

function strengthTone(relation: string): string {
  if (relation === 'own' || relation === 'self' || relation === 'subject') return 'own';
  if (relation === 'ally') return 'ally';
  if (relation === 'enemy') return 'enemy';
  return 'neutral';
}

function spritePosition(index: number, columns: number, rows: number): string {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = columns <= 1 ? 0 : column / (columns - 1) * 100;
  const y = rows <= 1 ? 0 : row / (rows - 1) * 100;
  return `${formatSpritePercent(x)}% ${formatSpritePercent(y)}%`;
}

function formatSpritePercent(value: number): string {
  return value.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
}

export function militaryRingStackStyle(relation: string, strength: number, morale: number): CSSProperties {
  const strengthBucket = ringBucket(strength, MILITARY_STRENGTH_SEGMENTS);
  const moraleBucket = ringBucket(morale, MILITARY_MORALE_SEGMENTS);
  const index = strengthBucket * MILITARY_RING_COLUMNS + moraleBucket;

  return {
    backgroundImage: `url("${MILITARY_RING_STACK_SRC[strengthTone(relation)]}")`,
    backgroundPosition: spritePosition(index, MILITARY_RING_COLUMNS, MILITARY_RING_ROWS),
    backgroundSize: `${String(MILITARY_RING_COLUMNS * 100)}% ${String(MILITARY_RING_ROWS * 100)}%`,
  };
}

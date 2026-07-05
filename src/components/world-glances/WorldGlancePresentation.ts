import { webUIText } from '../../localization/WebUITextContext';
import type { FactionRelation } from './WorldGlanceTypes';

function parseHexColour(hex: string): [number, number, number] | null {
  const value = hex.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
}

function hexByte(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const normalised = value / 255;
    return normalised <= 0.03928
      ? normalised / 12.92
      : Math.pow((normalised + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function mixWithWhite([r, g, b]: [number, number, number], amount: number): string {
  return `#${hexByte(r + (255 - r) * amount)}${hexByte(g + (255 - g) * amount)}${hexByte(b + (255 - b) * amount)}`;
}

export function readableFactionTextColour(colour: string): string {
  const parsed = parseHexColour(colour);
  if (!parsed) return colour;

  const luminance = relativeLuminance(parsed);
  if (luminance >= 0.33) return colour;
  if (luminance >= 0.18) return mixWithWhite(parsed, 0.32);
  return mixWithWhite(parsed, 0.52);
}

export function relationDisplayLabel(relation: FactionRelation, atWar?: boolean): string {
  if (atWar || relation === 'enemy') return webUIText('WorldGlances.Relation.Hostile');
  if (relation === 'own') return webUIText('WorldGlances.Relation.Own');
  if (relation === 'ally') return webUIText('WorldGlances.Relation.Allied');
  return webUIText('WorldGlances.Relation.Neutral');
}

export function relationDisplayColour(relation: FactionRelation, atWar?: boolean): string {
  if (atWar || relation === 'enemy') return 'var(--red-light)';
  if (relation === 'own') return 'var(--gold-light)';
  if (relation === 'ally') return 'var(--green-light)';
  return 'var(--text-bright)';
}

import { webUIText } from '../localization/WebUITextContext';

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

/** Colour-code a character stat value (0-20 scale) */
export function getStatColor(val: number): string {
  if (val >= 16) return 'var(--green-light)';
  if (val >= 12) return 'var(--green)';
  if (val >= 8) return 'var(--gold-light)';
  if (val >= 5) return 'var(--orange)';
  return 'var(--red)';
}

/** Colour-code an opinion value (-100 to +100) */
export function getOpinionColor(opinion: number): string {
  if (opinion >= 60) return 'var(--green)';
  if (opinion >= 20) return 'var(--gold)';
  if (opinion >= -20) return 'var(--orange)';
  return 'var(--red)';
}

/** Colour-code an interaction success-chance percentage */
export function successChanceColour(percent: number): string {
  if (percent >= 70) return 'var(--green)';
  if (percent >= 40) return 'var(--gold)';
  if (percent >= 20) return 'var(--orange)';
  return 'var(--red)';
}

export interface ComplianceState {
  label: string;
  icon: string;
  color: string;
}

/** Compliance thresholds matching the game's 5-state system */
export function getComplianceState(val: number): ComplianceState {
  if (val >= 30) return { label: webUIText('Auto.Prop.UtilsColorFormatters.34.1'), icon: '/assets/icons/Compliance/I_Eager.png', color: 'var(--green)' };
  if (val >= 10) return { label: webUIText('Auto.Prop.UtilsColorFormatters.35.2'), icon: '/assets/icons/Compliance/I_Reliable.png', color: 'var(--blue)' };
  if (val >= -10) return { label: webUIText('Auto.Prop.UtilsColorFormatters.36.3'), icon: '/assets/icons/Compliance/I_Grumbling.png', color: 'var(--gold)' };
  if (val >= -30) return { label: webUIText('Auto.Prop.UtilsColorFormatters.37.4'), icon: '/assets/icons/Compliance/I_Delaying.png', color: 'var(--orange)' };
  return { label: webUIText('Auto.Prop.UtilsColorFormatters.38.5'), icon: '/assets/icons/Compliance/I_Refusing.png', color: 'var(--red)' };
}


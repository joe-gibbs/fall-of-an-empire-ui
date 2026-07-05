import { webUIText } from '../localization/WebUITextContext';
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


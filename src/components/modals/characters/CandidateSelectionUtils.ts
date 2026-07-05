import type { StatKey } from '../../../data/types';

import { webUIText } from '../../../localization/WebUITextContext';
export type CandidateModalPrefix = 'cam' | 'bam' | 'asm';

export const STAT_ICON_BASE = '/assets/icons/StatIcons/';

export const STAT_LABELS: Record<StatKey, string> = {
  get tactics() { return webUIText('Common.Tactics'); },
  get authority() { return webUIText('Common.Authority'); },
  get cunning() { return webUIText('Common.Cunning'); },
  get governance() { return webUIText('Common.Governance'); },
  get loyalty() { return webUIText('Common.Loyalty'); },
  get constitution() { return webUIText('Common.Constitution'); },
};

const STAT_ICON_NAMES: Record<StatKey, string> = {
  tactics: 'Tactics',
  authority: 'Authority',
  cunning: 'Cunning',
  governance: 'Governance',
  loyalty: 'Loyalty',
  constitution: 'Constitution',
};

export const ALL_STATS: { key: StatKey; label: string }[] = [
  { key: 'tactics', get label() { return STAT_LABELS.tactics; } },
  { key: 'authority', get label() { return STAT_LABELS.authority; } },
  { key: 'cunning', get label() { return STAT_LABELS.cunning; } },
  { key: 'governance', get label() { return STAT_LABELS.governance; } },
  { key: 'loyalty', get label() { return STAT_LABELS.loyalty; } },
  { key: 'constitution', get label() { return STAT_LABELS.constitution; } },
];

export function statIconPath(stat: StatKey | string): string {
  const iconName = STAT_ICON_NAMES[stat as StatKey] ?? stat;
  return `${STAT_ICON_BASE}I_${iconName}.png`;
}

export function candidateStatColour(stat: number): string {
  if (stat >= 15) return 'var(--green-light)';
  if (stat >= 12) return 'var(--green)';
  if (stat >= 8) return 'var(--gold)';
  if (stat >= 5) return 'var(--orange)';
  return 'var(--red)';
}

export function candidateStatTier(stat: number): string {
  if (stat >= 15) return webUIText('Common.Candidates.Exceptional');
  if (stat >= 12) return webUIText('Common.Candidates.StrongCandidate');
  if (stat >= 8) return webUIText('Common.Candidates.CapableHand');
  if (stat >= 5) return webUIText('Common.Candidates.MarginalPick');
  return webUIText('Common.Candidates.PoorFit');
}

export function candidateStatFillClass(prefix: CandidateModalPrefix, stat: number): string {
  if (stat >= 12) return '';
  if (stat >= 7) return `${prefix}-chance-bar-fill--mid`;
  return `${prefix}-chance-bar-fill--low`;
}

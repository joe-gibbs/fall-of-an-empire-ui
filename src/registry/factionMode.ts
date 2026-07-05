import type { FactionModeVisibility } from './types';

interface FactionModeRegistration {
  factionMode?: FactionModeVisibility;
}

export function isVisibleForFactionMode(registration: FactionModeRegistration, subjectMode: boolean): boolean {
  const mode = registration.factionMode ?? 'all';
  return mode === 'all' || (subjectMode ? mode === 'subject' : mode === 'independent');
}

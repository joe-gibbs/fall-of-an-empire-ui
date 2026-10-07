import type { FactionModeVisibility } from './types';

interface FactionModeRegistration {
  factionMode?: FactionModeVisibility;
}

interface FactionModeIdentity {
  diplomaticStatus?: string | null;
  subjectSubtype?: string | null;
}

export function isProvinceSubjectMode(playerFaction?: FactionModeIdentity | null): boolean {
  return playerFaction?.diplomaticStatus === 'subject'
    && (playerFaction.subjectSubtype ?? '').trim().toLowerCase() === 'province';
}

export function isVisibleForFactionMode(registration: FactionModeRegistration, subjectMode: boolean): boolean {
  const mode = registration.factionMode ?? 'all';
  return mode === 'all' || (subjectMode ? mode === 'subject' : mode === 'independent');
}

import { webUIText } from '../localization/WebUITextContext';

interface DiplomacyAuthorityFaction {
  subjectSubtype?: string | null;
}

export function canNegotiateDiplomacyWith(
  playerFaction?: DiplomacyAuthorityFaction | null,
  targetFaction?: DiplomacyAuthorityFaction | null,
): boolean {
  return !playerFaction?.subjectSubtype && !targetFaction?.subjectSubtype;
}

export function diplomacyAuthorityBlockedReason(
  playerFaction?: DiplomacyAuthorityFaction | null,
  targetFaction?: DiplomacyAuthorityFaction | null,
): string | null {
  if (playerFaction?.subjectSubtype) return webUIText('Diplomacy.NegotiateBlocked.PlayerSubject');
  if (targetFaction?.subjectSubtype) return webUIText('Diplomacy.NegotiateBlocked.TargetSubject');
  return null;
}

interface DiplomacyAuthorityFaction {
  subjectSubtype?: string | null;
}

export function canNegotiateDiplomacyWith(
  playerFaction?: DiplomacyAuthorityFaction | null,
  targetFaction?: DiplomacyAuthorityFaction | null,
): boolean {
  return !playerFaction?.subjectSubtype && !targetFaction?.subjectSubtype;
}

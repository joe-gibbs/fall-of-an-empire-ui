export interface BattleGlanceSideColours {
  attacker: string;
  defender: string;
}

export function battleGlanceSideColours(
  attacker?: { colour: string } | null,
  defender?: { colour: string } | null,
): BattleGlanceSideColours {
  return {
    attacker: attacker?.colour ?? 'var(--diplo-relation-neutral)',
    defender: defender?.colour ?? 'var(--diplo-relation-neutral)',
  };
}

export const advisorHintKeys = {
  settlementSidebar: 'SettlementHint',
  characterSidebar: 'CharactersHint',
  diplomacySidebar: 'DiplomacyHint',
  militarySidebar: 'MilitaryHint',
  powerBlocSidebar: 'PowerBlocDetailHint',
  peaceNegotiation: 'PeaceHint',
  economyScreen: 'EconomyHint',
  factionOverviewScreen: 'FactionHint',
  religionScreen: 'ReligionHint',
  diplomacyScreen: 'DiplomacyHint',
  externalPoliticsScreen: 'DiplomacyHint',
  internalPoliticsScreen: 'InternalAffairsHint',
  familyTreeScreen: 'FamilyTreeHint',
  encyclopediaScreen: 'EncyclopediaHint',
  eventPopup: 'EventsHint',
  battleView: 'BattleHint',
  charactersScreen: 'CharactersHint',
  powerBlocsScreen: 'PowerBlocsHint',
  ledgerScreen: 'LedgerHint',
  militaryScreen: 'MilitaryOverviewHint',
} as const;

export type AdvisorTopicId = keyof typeof advisorHintKeys;

export function getAdvisorHintKey(topic: AdvisorTopicId): string {
  return advisorHintKeys[topic];
}

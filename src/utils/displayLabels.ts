import { webUIText } from '../localization/WebUITextContext';

const PERSON_ACTIVITY_LABEL_KEYS: Record<string, string> = {
  RulingFaction: 'Display.PersonActivity.RulingFaction',
  LeadingSettlement: 'Display.PersonActivity.LeadingSettlement',
  CommandingArmy: 'Display.PersonActivity.CommandingArmy',
  InCourt: 'Display.PersonActivity.InCourt',
  Diplomat: 'Display.PersonActivity.Diplomat',
  Spy: 'Display.PersonActivity.Spy',
  Deceased: 'Display.PersonActivity.Deceased',
  None: '',
};

const TREATY_LABEL_KEYS: Record<string, string> = {
  Peace: 'Display.Treaty.Peace',
  NonAggression: 'Display.Treaty.NonAggression',
  Trade: 'Display.Treaty.Trade',
  TradeOneOff: 'Display.Treaty.TradeOneOff',
  MilitaryAlliance: 'Display.Treaty.MilitaryAlliance',
  DefensiveAlliance: 'Display.Treaty.DefensiveAlliance',
  Subject: 'Display.Treaty.SubjectPact',
  Tribute: 'Display.Treaty.Tribute',
  TributeOneOff: 'Display.Treaty.TributeOneOff',
  PassageRights: 'Display.Treaty.PassageRights',
  KnowledgeSharing: 'Display.Treaty.KnowledgeSharing',
  Marriage: 'Display.Treaty.Marriage',
  MerchantRights: 'Display.Treaty.MerchantRights',
};

const RELATIONSHIP_LABEL_KEYS: Record<string, string> = {
  Self: 'Character.Relation.Self',
  Father: 'Character.Relation.Father',
  Mother: 'Character.Relation.Mother',
  Son: 'Character.Relation.Son',
  Daughter: 'Character.Relation.Daughter',
  Brother: 'Character.Relation.Brother',
  Sister: 'Character.Relation.Sister',
  Uncle: 'Character.Relation.Uncle',
  Aunt: 'Character.Relation.Aunt',
  Nephew: 'Character.Relation.Nephew',
  Niece: 'Character.Relation.Niece',
  Cousin: 'Character.Relation.Cousin',
  Grandfather: 'Character.Relation.Grandfather',
  Grandmother: 'Character.Relation.Grandmother',
  Grandson: 'Character.Relation.Grandson',
  Granddaughter: 'Character.Relation.Granddaughter',
  GreatGrandfather: 'Character.Relation.GreatGrandfather',
  GreatGrandmother: 'Character.Relation.GreatGrandmother',
  GreatGrandson: 'Character.Relation.GreatGrandson',
  GreatGranddaughter: 'Character.Relation.GreatGranddaughter',
  GreatUncle: 'Character.Relation.GreatUncle',
  GreatAunt: 'Character.Relation.GreatAunt',
  FatherInLaw: 'Character.Relation.FatherInLaw',
  MotherInLaw: 'Character.Relation.MotherInLaw',
  SonInLaw: 'Character.Relation.SonInLaw',
  DaughterInLaw: 'Character.Relation.DaughterInLaw',
  BrotherInLaw: 'Character.Relation.BrotherInLaw',
  SisterInLaw: 'Character.Relation.SisterInLaw',
  Husband: 'Character.Relation.Husband',
  Wife: 'Character.Relation.Wife',
  Spouse: 'Character.Relation.Spouse',
  Friend: 'Character.Relation.Friend',
  Enemy: 'Character.Relation.Enemy',
  Patron: 'Character.Relation.Patron',
  Client: 'Character.Relation.Client',
  Heir: 'Character.Relation.Heir',
  Kinsman: 'Character.Relation.Kinsman',
  Kinswoman: 'Character.Relation.Kinswoman',
  Consort: 'Character.Relation.Consort',
  Ruler: 'Character.Relation.Ruler',
  'Designated Heir': 'Character.Relation.DesignatedHeir',
  Other: 'Character.Relation.Other',
};

const SETTLEMENT_TYPE_LABEL_KEYS: Record<string, string> = {
  village: 'Ledger.SettlementType.Village',
  town: 'Ledger.SettlementType.Town',
  city: 'Ledger.SettlementType.City',
  metropolis: 'Ledger.SettlementType.Metropolis',
  fortress: 'Ledger.SettlementType.Fortress',
  monastery: 'Ledger.SettlementType.Monastery',
  port: 'Ledger.SettlementType.Port',
  mining: 'Ledger.SettlementType.Mining',
};

export function formatPersonActivity(value: string | null | undefined): string {
  const source = (value ?? '').trim();
  if (!source) return '';
  const key = PERSON_ACTIVITY_LABEL_KEYS[source];
  return key ? webUIText(key) : '';
}

export function formatTreatyType(value: string | null | undefined): string {
  const source = (value ?? '').trim();
  if (!source) return '';
  const key = TREATY_LABEL_KEYS[source];
  return key ? webUIText(key) : '';
}

export function formatRelationshipType(value: string | null | undefined): string {
  const source = (value ?? '').trim();
  if (!source) return '';
  const key = RELATIONSHIP_LABEL_KEYS[source];
  return key ? webUIText(key) : webUIText('Character.Relation.Other');
}

export function formatSettlementType(value: string | null | undefined): string {
  const source = (value ?? '').trim().toLowerCase();
  if (!source) return '';
  const key = SETTLEMENT_TYPE_LABEL_KEYS[source];
  return key ? webUIText(key) : '';
}

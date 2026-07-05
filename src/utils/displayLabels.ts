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

export function formatEnumLabel(value: string | null | undefined): string {
  const source = (value ?? '').trim();
  if (!source) return '';

  return source
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function formatPersonActivity(value: string | null | undefined): string {
  const source = (value ?? '').trim();
  if (!source) return '';
  const key = PERSON_ACTIVITY_LABEL_KEYS[source];
  return key ? webUIText(key) : formatEnumLabel(source);
}

export function formatTreatyType(value: string | null | undefined): string {
  const source = (value ?? '').trim();
  if (!source) return '';
  const key = TREATY_LABEL_KEYS[source];
  return key ? webUIText(key) : formatEnumLabel(source);
}

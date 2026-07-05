/** Unit / settlement / building tier icons (1-5) */
export const TIER_ICONS: Record<number, string> = {
  1: '/assets/icons/Tiers/Tier1.png',
  2: '/assets/icons/Tiers/Tier2.png',
  3: '/assets/icons/Tiers/Tier3.png',
  4: '/assets/icons/Tiers/Tier4.png',
  5: '/assets/icons/Tiers/Tier5.png',
};

/** Person stat icons, keyed by the bridge's machine stat key (e.g. "tactics"). */
export const STAT_ICONS: Record<string, string> = {
  tactics: '/assets/icons/StatIcons/I_Tactics.png',
  authority: '/assets/icons/StatIcons/I_Authority.png',
  cunning: '/assets/icons/StatIcons/I_Cunning.png',
  governance: '/assets/icons/StatIcons/I_Governance.png',
  loyalty: '/assets/icons/StatIcons/I_Loyalty.png',
  constitution: '/assets/icons/StatIcons/I_Constitution.png',
};

export const GOVERNOR_MISSION_ICON = '/assets/icons/I_GovernorMission.png';
export const GOVERNOR_MISSION_TRIBUTE_ICON = '/assets/icons/I_OfferTribute.png';
export const GOVERNOR_MISSION_SUPPRESS_UNREST_ICON = '/assets/person-interactions/icons/RequestUnrestSuppression.png';
export const GOVERNOR_MISSION_PUBLIC_SUPPORT_ICON = '/assets/person-interactions/icons/RequestPublicEndorsement.png';

/** Treaty icons, keyed on the bridge's ETreatyType enum names and common UI aliases. */
export const TREATY_ICONS: Record<string, string> = {
  Peace: '/assets/icons/I_Peace.png',
  NonAggression: '/assets/icons/Treaties/I_NonAggression.png',
  Trade: '/assets/icons/Treaties/I_TradeAgreement.png',
  TradeAgreement: '/assets/icons/Treaties/I_TradeAgreement.png',
  TradeOneOff: '/assets/icons/Treaties/I_TradeAgreement.png',
  MerchantRights: '/assets/icons/Treaties/I_TradeAgreement.png',
  MilitaryAlliance: '/assets/icons/Treaties/I_MilitaryAlliance.png',
  DefensiveAlliance: '/assets/icons/Treaties/I_DefensiveAlliance.png',
  Subject: '/assets/icons/Treaties/I_Vassalage.png',
  Tribute: '/assets/icons/Treaties/I_Tribute.png',
  TributeOneOff: '/assets/icons/Treaties/I_Tribute.png',
  PassageRights: '/assets/icons/Treaties/I_MilitaryAccess.png',
  MilitaryAccess: '/assets/icons/Treaties/I_MilitaryAccess.png',
  KnowledgeSharing: '/assets/icons/Treaties/I_MapSharing.png',
  MapSharing: '/assets/icons/Treaties/I_MapSharing.png',
  Marriage: '/assets/icons/Treaties/I_DiplomaticMarriage.png',
  DiplomaticMarriage: '/assets/icons/Treaties/I_DiplomaticMarriage.png',
  PrisonerExchange: '/assets/icons/Treaties/I_PrisonerExchange.png',
};

export function treatyIconPath(type: string | null | undefined): string {
  const key = (type ?? '').trim();
  return TREATY_ICONS[key] ?? '/assets/icons/I_Diplomacy.png';
}

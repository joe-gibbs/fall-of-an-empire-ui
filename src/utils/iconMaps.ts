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

/**
 * Rich-text / structured-text `<concept id="X"/>` icons whose file names do not
 * match `/assets/icons/I_X.png`. Prefer this helper over building the path by hand.
 * Keys are matched case-insensitively.
 */
const CONCEPT_ICON_OVERRIDES: Record<string, string> = {
  gold: '/assets/icons/I_Coins.png',
  military: '/assets/icons/I_Swords.png',
  warehouse: '/assets/icons/I_Warehouse.png',
  stockpile: '/assets/icons/I_Warehouse.png',
  authority: STAT_ICONS.authority,
  tactics: STAT_ICONS.tactics,
  cunning: STAT_ICONS.cunning,
  governance: STAT_ICONS.governance,
  loyalty: STAT_ICONS.loyalty,
  constitution: STAT_ICONS.constitution,
};

/**
 * Resource concept icons used by processing building effects
 * (`<concept id="Wood"/>`, etc.). Filenames under `/assets/resources/`.
 * Keys are lowercase; values keep the on-disk casing.
 */
const RESOURCE_CONCEPT_ICONS: Record<string, string> = {
  armour: '/assets/resources/Armour.png',
  catapults: '/assets/resources/Catapults.png',
  clothes: '/assets/resources/Clothes.png',
  cotton: '/assets/resources/Cotton.png',
  dyes: '/assets/resources/Dyes.png',
  fineclothes: '/assets/resources/FineClothes.png',
  fish: '/assets/resources/Fish.png',
  fittings: '/assets/resources/Fittings.png',
  food: '/assets/resources/Food.png',
  garum: '/assets/resources/Garum.png',
  grain: '/assets/resources/Grain.png',
  horses: '/assets/resources/Horses.png',
  iron: '/assets/resources/Iron.png',
  leather: '/assets/resources/Leather.png',
  meat: '/assets/resources/Meat.png',
  oil: '/assets/resources/Oil.png',
  pitch: '/assets/resources/Pitch.png',
  preciousmetals: '/assets/resources/PreciousMetals.png',
  sails: '/assets/resources/Sails.png',
  silk: '/assets/resources/Silk.png',
  stone: '/assets/resources/Stone.png',
  weapons: '/assets/resources/Weapons.png',
  wine: '/assets/resources/Wine.png',
  wood: '/assets/resources/Wood.png',
  wool: '/assets/resources/Wool.png',
};

/** Asset path for a concept id used in rich text, encyclopedia markdown, and effect lines. */
export function conceptIconPath(conceptId: string | null | undefined): string {
  const id = (conceptId ?? '').trim();
  if (!id) return '/assets/icons/I_Dot.png';

  const lower = id.toLowerCase();
  return CONCEPT_ICON_OVERRIDES[lower]
    ?? RESOURCE_CONCEPT_ICONS[lower]
    ?? `/assets/icons/I_${id}.png`;
}

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

import type { ReactNode } from 'react';
import LocalizedMapModeTooltip from './LocalizedMapModeTooltip';
import type { MapModeTooltipDefinition } from './LocalizedMapModeTooltip';

const DEFINITIONS: Record<string, MapModeTooltipDefinition> = {
  landscape: {
    titleKey: 'MapModeTooltip.Landscape.Title',
    bodyKey: 'MapModeTooltip.Landscape.Body',
    footerKeys: ['MapModeTooltip.Landscape.Footer'],
  },
  political: {
    titleKey: 'MapModeTooltip.Political.Title',
    bodyKey: 'MapModeTooltip.Political.Body',
    footerKeys: ['MapModeTooltip.Political.Footer'],
  },
  overlord: {
    titleKey: 'MapModeTooltip.Overlord.Title',
    bodyKey: 'MapModeTooltip.Overlord.Body',
    bulletKeys: [
      'MapModeTooltip.Overlord.Bullet.Independent',
      'MapModeTooltip.Overlord.Bullet.Subjects',
      'MapModeTooltip.Overlord.Bullet.Foederati',
    ],
    footerKeys: ['MapModeTooltip.Overlord.Footer'],
  },
  religion: {
    titleKey: 'MapModeTooltip.Religion.Title',
    bodyKey: 'MapModeTooltip.Religion.Body',
    footerKeys: ['MapModeTooltip.Religion.Footer'],
  },
  culture: {
    titleKey: 'MapModeTooltip.Culture.Title',
    bodyKey: 'MapModeTooltip.Culture.Body',
    footerKeys: ['MapModeTooltip.Culture.Footer'],
  },
  bishopric: {
    titleKey: 'MapModeTooltip.Bishopric.Title',
    bodyKey: 'MapModeTooltip.Bishopric.Body',
    bulletKeys: [
      'MapModeTooltip.Bishopric.Bullet.Assigned',
      'MapModeTooltip.Bishopric.Bullet.Vacant',
      'MapModeTooltip.Bishopric.Bullet.Ineligible',
    ],
  },
  adminRegion: {
    titleKey: 'MapModeTooltip.AdminRegion.Title',
    bodyKey: 'MapModeTooltip.AdminRegion.Body',
    footerKeys: ['MapModeTooltip.AdminRegion.Footer'],
  },
  adminLand: {
    titleKey: 'MapModeTooltip.AdminLand.Title',
    bodyKey: 'MapModeTooltip.AdminLand.Body',
    footerKeys: ['MapModeTooltip.AdminLand.Footer'],
  },
  adminDomain: {
    titleKey: 'MapModeTooltip.AdminDomain.Title',
    bodyKey: 'MapModeTooltip.AdminDomain.Body',
    footerKeys: ['MapModeTooltip.AdminDomain.Footer'],
  },
  regionGovernor: {
    titleKey: 'MapModeTooltip.RegionGovernor.Title',
    bodyKey: 'MapModeTooltip.RegionGovernor.Body',
    bulletKeys: [
      'MapModeTooltip.RegionGovernor.Bullet.Missing',
      'MapModeTooltip.RegionGovernor.Bullet.Assigned',
    ],
    footerKeys: ['MapModeTooltip.RegionGovernor.Footer'],
  },
  resources: {
    titleKey: 'MapModeTooltip.Resources.Title',
    bodyKey: 'MapModeTooltip.Resources.Body',
    bulletKeys: [
      'MapModeTooltip.Resources.Bullet.None',
      'MapModeTooltip.Resources.Bullet.Production',
    ],
    footerKeys: [
      'MapModeTooltip.Resources.Footer.Terrain',
      'MapModeTooltip.Resources.Footer.Selection',
    ],
  },
  trade: {
    titleKey: 'MapModeTooltip.Trade.Title',
    bodyKey: 'MapModeTooltip.Trade.Body',
    bulletKeys: [
      'MapModeTooltip.Trade.Bullet.None',
      'MapModeTooltip.Trade.Bullet.Value',
      'MapModeTooltip.Trade.Bullet.Port',
    ],
    footerKeys: ['MapModeTooltip.Trade.Footer'],
  },
  stockpiles: {
    titleKey: 'MapModeTooltip.Stockpiles.Title',
    bodyKey: 'MapModeTooltip.Stockpiles.Body',
    bulletKeys: [
      'MapModeTooltip.Stockpiles.Bullet.None',
      'MapModeTooltip.Stockpiles.Bullet.Resource',
    ],
    footerKeys: ['MapModeTooltip.Stockpiles.Footer'],
  },
  economicProsperity: {
    titleKey: 'MapModeTooltip.EconomicProsperity.Title',
    bodyKey: 'MapModeTooltip.EconomicProsperity.Body',
    bulletKeys: [
      'MapModeTooltip.EconomicProsperity.Bullet.Crisis',
      'MapModeTooltip.EconomicProsperity.Bullet.Struggling',
      'MapModeTooltip.EconomicProsperity.Bullet.Prosperous',
      'MapModeTooltip.EconomicProsperity.Bullet.Thriving',
    ],
    footerKeys: [
      'MapModeTooltip.EconomicProsperity.Footer.Terrain',
      'MapModeTooltip.EconomicProsperity.Footer.Queue',
    ],
  },
  population: {
    titleKey: 'MapModeTooltip.Population.Title',
    bodyKey: 'MapModeTooltip.Population.Body',
    bulletKeys: [
      'MapModeTooltip.Population.Bullet.Small',
      'MapModeTooltip.Population.Bullet.Medium',
      'MapModeTooltip.Population.Bullet.Large',
    ],
    footerKeys: ['MapModeTooltip.Population.Footer'],
  },
  unrest: {
    titleKey: 'MapModeTooltip.Unrest.Title',
    bodyKey: 'MapModeTooltip.Unrest.Body',
    bulletKeys: [
      'MapModeTooltip.Unrest.Bullet.Low',
      'MapModeTooltip.Unrest.Bullet.Medium',
      'MapModeTooltip.Unrest.Bullet.High',
    ],
    footerKeys: ['MapModeTooltip.Unrest.Footer'],
  },
  disease: {
    titleKey: 'MapModeTooltip.Disease.Title',
    bodyKey: 'MapModeTooltip.Disease.Body',
    bulletKeys: [
      'MapModeTooltip.Disease.Bullet.None',
      'MapModeTooltip.Disease.Bullet.Outbreak',
    ],
    footerKeys: ['MapModeTooltip.Disease.Footer'],
  },
  corruption: {
    titleKey: 'MapModeTooltip.Corruption.Title',
    bodyKey: 'MapModeTooltip.Corruption.Body',
    bulletKeys: [
      'MapModeTooltip.Corruption.Bullet.Low',
      'MapModeTooltip.Corruption.Bullet.Medium',
      'MapModeTooltip.Corruption.Bullet.High',
      'MapModeTooltip.Corruption.Bullet.Severe',
    ],
    footerKeys: ['MapModeTooltip.Corruption.Footer'],
  },
  opinion: {
    titleKey: 'MapModeTooltip.Opinion.Title',
    bodyKey: 'MapModeTooltip.Opinion.Body',
    bulletKeys: [
      'MapModeTooltip.Opinion.Bullet.Bad',
      'MapModeTooltip.Opinion.Bullet.Mixed',
      'MapModeTooltip.Opinion.Bullet.Good',
    ],
  },
  loyalty: {
    titleKey: 'MapModeTooltip.Loyalty.Title',
    bodyKey: 'MapModeTooltip.Loyalty.Body',
    bulletKeys: [
      'MapModeTooltip.Loyalty.Bullet.Rebellious',
      'MapModeTooltip.Loyalty.Bullet.Shaky',
      'MapModeTooltip.Loyalty.Bullet.Stable',
      'MapModeTooltip.Loyalty.Bullet.Loyal',
    ],
    footerKeys: ['MapModeTooltip.Loyalty.Footer'],
  },
  diplomaticRelation: {
    titleKey: 'MapModeTooltip.DiplomaticRelation.Title',
    bodyKey: 'MapModeTooltip.DiplomaticRelation.Body',
    bulletKeys: [
      'MapModeTooltip.DiplomaticRelation.Bullet.Player',
      'MapModeTooltip.DiplomaticRelation.Bullet.Peace',
      'MapModeTooltip.DiplomaticRelation.Bullet.War',
      'MapModeTooltip.DiplomaticRelation.Bullet.Subject',
      'MapModeTooltip.DiplomaticRelation.Bullet.Alliance',
      'MapModeTooltip.DiplomaticRelation.Bullet.Overlord',
    ],
    footerKeys: ['MapModeTooltip.DiplomaticRelation.Footer'],
  },
  militaries: {
    titleKey: 'MapModeTooltip.Militaries.Title',
    bodyKey: 'MapModeTooltip.Militaries.Body',
    bulletKeys: [
      'MapModeTooltip.Militaries.Bullet.None',
      'MapModeTooltip.Militaries.Bullet.Own',
      'MapModeTooltip.Militaries.Bullet.Allied',
    ],
    footerKeys: ['MapModeTooltip.Militaries.Footer'],
  },
  garrisons: {
    titleKey: 'MapModeTooltip.Garrisons.Title',
    bodyKey: 'MapModeTooltip.Garrisons.Body',
    bulletKeys: [
      'MapModeTooltip.Garrisons.Bullet.None',
      'MapModeTooltip.Garrisons.Bullet.Small',
      'MapModeTooltip.Garrisons.Bullet.Medium',
      'MapModeTooltip.Garrisons.Bullet.Large',
    ],
    footerKeys: ['MapModeTooltip.Garrisons.Footer'],
  },
};

function buildTooltips(definitions: Record<string, MapModeTooltipDefinition>): Record<string, ReactNode> {
  const tooltips: Record<string, ReactNode> = {};
  Object.keys(definitions).forEach(id => {
    tooltips[id] = <LocalizedMapModeTooltip key={id} modeId={id} definition={definitions[id]} />;
  });
  return tooltips;
}

export const MAP_MODE_TOOLTIPS: Record<string, ReactNode> = buildTooltips(DEFINITIONS);

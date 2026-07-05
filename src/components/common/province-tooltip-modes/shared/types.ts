import type { GetProvinceTooltipResponse, ProvinceTooltipDiseaseInfo } from '../../../../bridge-types.generated.ts';

export interface ProvinceTooltipFactionView {
  name: string;
  colour?: string;
  relation?: string;
  isRebel?: boolean;
}

export interface ProvinceTooltipShareView {
  name: string;
  detail?: string;
  percent?: string;
  shareValue: number;
  colour?: string;
  change?: string;
  changeTone?: string;
}

export interface ProvinceTooltipResourceView {
  icon?: string;
  label: string;
  stock: number;
}

export interface ProvinceTooltipResourceAmountView {
  icon?: string;
  label: string;
  amount: number;
}

export interface ProvinceTooltipLabelView {
  label: string;
  colour?: string;
}

export interface ProvinceTooltipMapModeEntryView {
  label: string;
  colour?: string;
}

export interface ProvinceTooltipBuildView {
  label: string;
  progress: number;
}

export interface ProvinceTooltipModeData {
  mapModeId: string;
  mapModeLabel: string;
  mapModeEntries: ProvinceTooltipMapModeEntryView[];
  settlementName: string;
  settlementType: string;
  health: number;
  siegeProgress: number;
  fortification: number;
  fortificationProgress: number;
  faction: ProvinceTooltipFactionView;
  occupier?: ProvinceTooltipFactionView;
  population: number;
  populationValue: string;
  typeValue: string;
  locationValue: string;
  portStatus: string;
  monthlyIncome: number;
  tradeValue: number;
  corruption: number;
  unrest: number;
  loyalty: number;
  garrison: number;
  resources: ProvinceTooltipResourceView[];
  resourceProduction: ProvinceTooltipResourceAmountView[];
  stockpiles: ProvinceTooltipResourceAmountView[];
  diseaseInfo: ProvinceTooltipDiseaseInfo;
  culture: ProvinceTooltipLabelView;
  religion: ProvinceTooltipLabelView;
  cultureShares: ProvinceTooltipShareView[];
  religionShares: ProvinceTooltipShareView[];
  governorName: string;
  complianceTargetLabel: string;
  complianceTargetName: string;
  complianceTargetIsRuler: boolean;
  complianceLuxuryLabel: string;
  complianceLuxuryStatus: string;
  regionName: string;
  landName: string;
  domainName: string;
  independent: boolean;
  overlordName: string;
  bishopName: string;
  hasBuilding: boolean;
  building?: ProvinceTooltipBuildView;
  warWithPlayer: boolean;
  besieged: boolean;
  starving: boolean;
  diseased: boolean;
}

function factionFromProvince(faction: GetProvinceTooltipResponse['faction']): ProvinceTooltipFactionView {
  return {
    name: faction.name,
    colour: faction.colour,
    isRebel: faction.isRebel,
  };
}

export function provinceTooltipDataFromResponse(tooltip: GetProvinceTooltipResponse): ProvinceTooltipModeData {
  return {
    mapModeId: tooltip.mapModeId,
    mapModeLabel: tooltip.mapModeLabel,
    mapModeEntries: tooltip.mapModeEntries,
    settlementName: tooltip.settlementName,
    settlementType: tooltip.settlementType,
    health: tooltip.health,
    siegeProgress: tooltip.siegeProgress,
    fortification: tooltip.fortification,
    fortificationProgress: tooltip.fortificationProgress,
    faction: factionFromProvince(tooltip.faction),
    occupier: tooltip.hasOccupier ? factionFromProvince(tooltip.occupier) : undefined,
    population: tooltip.population,
    populationValue: tooltip.populationValue,
    typeValue: tooltip.typeValue,
    locationValue: tooltip.locationValue,
    portStatus: tooltip.portStatus,
    monthlyIncome: tooltip.monthlyIncome,
    tradeValue: tooltip.tradeValue,
    corruption: tooltip.corruption,
    unrest: tooltip.unrest,
    loyalty: tooltip.loyalty,
    garrison: tooltip.garrison,
    resources: tooltip.resources,
    resourceProduction: tooltip.resourceProduction,
    stockpiles: tooltip.stockpiles,
    diseaseInfo: tooltip.diseaseInfo,
    culture: tooltip.cultureInfo,
    religion: tooltip.religionInfo,
    cultureShares: tooltip.cultureShares,
    religionShares: tooltip.religionShares,
    governorName: tooltip.governorName,
    complianceTargetLabel: tooltip.complianceTargetLabel,
    complianceTargetName: tooltip.complianceTargetName,
    complianceTargetIsRuler: tooltip.complianceTargetIsRuler,
    complianceLuxuryLabel: tooltip.complianceLuxuryLabel,
    complianceLuxuryStatus: tooltip.complianceLuxuryStatus,
    regionName: tooltip.regionName,
    landName: tooltip.landName,
    domainName: tooltip.domainName,
    independent: tooltip.independent,
    overlordName: tooltip.overlordName,
    bishopName: tooltip.bishopName,
    hasBuilding: tooltip.hasBuilding,
    building: tooltip.hasBuilding ? tooltip.building : undefined,
    warWithPlayer: tooltip.warWithPlayer,
    besieged: tooltip.besieged,
    starving: tooltip.starving,
    diseased: tooltip.diseased,
  };
}

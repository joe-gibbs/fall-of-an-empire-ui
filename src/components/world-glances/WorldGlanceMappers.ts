import type { GetWorldGlancesResponse } from '../../bridge-types.generated.ts';
import type {
  ArmyGlanceData,
  BattleGlanceData,
  ConvoyGlanceData,
  FactionRelation,
  GlanceFactionStub,
  NavyGlanceData,
  PortGlanceData,
  SettlementGlanceData,
  WorldGlanceDetailClass,
} from './WorldGlanceTypes';

function clampTier(tier: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(tier))) as 1 | 2 | 3 | 4 | 5;
}

export function mapFaction(faction: GetWorldGlancesResponse['armies'][number]['faction']): GlanceFactionStub {
  return {
    id: faction.id,
    debugShortId: faction.debugShortId || undefined,
    name: faction.name ?? '',
    colour: faction.colour ?? '#ffffff',
    secondaryColour: faction.secondaryColour ?? faction.colour ?? '#ffffff',
    cultureGroup: faction.cultureGroup ?? '',
    emblem: faction.emblem,
    relation: (faction.relation ?? 'neutral') as FactionRelation,
    isRebel: faction.isRebel ?? false,
  };
}

export function mapSettlement(entry: GetWorldGlancesResponse['settlements'][number]): SettlementGlanceData {
  const resources = entry.resources ?? [];
  const culture = entry.culture ?? { label: '', colour: '' };
  const religion = entry.religion ?? { label: '', colour: '' };
  return {
    debugShortId: entry.debugShortId || undefined,
    name: entry.name,
    faction: mapFaction(entry.faction),
    occupier: entry.hasOccupier ? mapFaction(entry.occupier) : undefined,
    isCapital: entry.isCapital ?? false,
    isProvincialCapital: entry.isProvincialCapital ?? false,
    settlementType: entry.settlementType as SettlementGlanceData['settlementType'],
    badgeScale: entry.badgeScale,
    health: entry.health,
    selected: false,
    targeted: false,
    besieged: entry.besieged,
    siegeProgress: entry.siegeProgress ?? 0,
    fortification: entry.fortification ?? 0,
    fortificationProgress: entry.fortificationProgress ?? 0,
    starving: entry.starving ?? false,
    diseased: entry.diseased ?? false,
    mode: entry.mode as SettlementGlanceData['mode'],
    mapModeId: entry.mapModeId ?? '',
    mapModeLabel: entry.mapModeLabel ?? '',
    monthlyIncome: entry.monthlyIncome ?? 0,
    tradeValue: entry.tradeValue ?? 0,
    corruption: entry.corruption ?? 0,
    population: entry.population ?? 0,
    unrest: entry.unrest ?? 0,
    loyalty: entry.loyalty ?? 0,
    garrison: entry.garrison ?? 0,
    resources: resources.map((resource) => ({
      icon: resource.icon,
      label: resource.label,
      stock: resource.stock,
    })),
    culture: {
      label: culture.label,
      colour: culture.colour,
    },
    religion: {
      label: religion.label,
      colour: religion.colour,
    },
    governorName: entry.governorName ?? '',
    governorDebugShortId: entry.governorDebugShortId || undefined,
    complianceTargetLabel: entry.complianceTargetLabel ?? '',
    complianceTargetName: entry.complianceTargetName ?? '',
    complianceTargetIsRuler: entry.complianceTargetIsRuler ?? false,
    complianceLuxuryLabel: entry.complianceLuxuryLabel ?? '',
    complianceLuxuryStatus: entry.complianceLuxuryStatus ?? '',
    regionName: entry.regionName ?? '',
    landName: entry.landName ?? '',
    domainName: entry.domainName ?? '',
    independent: entry.independent ?? false,
    overlordName: entry.overlordName ?? '',
    bishopName: entry.bishopName ?? '',
    building: entry.hasBuilding ? {
      label: entry.building?.label ?? '',
      progress: entry.building?.progress ?? 0,
    } : undefined,
    warWithPlayer: entry.warWithPlayer ?? false,
  };
}

export function mapPort(entry: GetWorldGlancesResponse['ports'][number]): PortGlanceData {
  return {
    id: entry.id,
    faction: mapFaction(entry.faction),
    level: entry.level ?? 0,
    selected: false,
    targeted: false,
    blockaded: entry.blockaded ?? false,
  };
}

export function mapMilitary(entry: GetWorldGlancesResponse['armies'][number]): ArmyGlanceData {
  return {
    id: entry.id,
    faction: mapFaction(entry.faction),
    strength: entry.strength ?? 0,
    morale: entry.morale ?? 0,
    tier: clampTier(entry.tier),
    raiding: entry.raiding ?? false,
    attrition: entry.attrition ?? false,
    attritionIcon: entry.attritionIcon,
    selected: false,
    targeted: false,
  };
}

export function mapNavy(entry: GetWorldGlancesResponse['navies'][number]): NavyGlanceData {
  return {
    ...mapMilitary(entry),
    blockading: entry.blockading,
  };
}

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function mapBattle(entry: GetWorldGlancesResponse['battles'][number]): BattleGlanceData {
  return {
    id: entry.id,
    targeted: false,
    attacker: {
      participants: arrayOrEmpty(entry.attacker?.participants).map((participant) => ({
        faction: mapFaction(participant.faction),
      })),
      totalStrength: entry.attacker.totalStrength,
      morale: entry.attacker.morale,
      lastLosses: entry.attacker.lastLosses,
    },
    defender: {
      participants: arrayOrEmpty(entry.defender?.participants).map((participant) => ({
        faction: mapFaction(participant.faction),
      })),
      totalStrength: entry.defender.totalStrength,
      morale: entry.defender.morale,
      lastLosses: entry.defender.lastLosses,
    },
  };
}

export function mapConvoy(entry: GetWorldGlancesResponse['convoys'][number]): ConvoyGlanceData {
  return {
    id: entry.id,
    faction: mapFaction(entry.faction),
    routeType: entry.routeType === 'sea' ? 'sea' : 'road',
    cargo: entry.cargo.map((item) => ({
      icon: item.icon,
      amount: item.amount,
    })),
  };
}

export type WorldGlanceDetailLevel = 'flag' | 'name' | 'detailed' | 0 | 1 | 2;

export function detailClass(detailLevel: WorldGlanceDetailLevel | string | number): WorldGlanceDetailClass {
  switch (detailLevel) {
    case 'flag':
    case 0:
      return 'detail-flag';
    case 'name':
    case 1:
      return 'detail-name';
    case 'detailed':
    case 2:
    default: return 'detail-detailed';
  }
}

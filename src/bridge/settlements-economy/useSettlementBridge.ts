import { useEffect, useMemo, useState } from 'react';
import type { GetSettlementDataResponse, GetSettlementSiegeDataResponse } from '../../bridge-types.generated.ts';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import type { ArmyUnitType, Character, Settlement } from '../../data/types';
import { WebkilnAssetPath } from '../../utils/assets';

type SettlementBishopricResponse = GetSettlementDataResponse['bishoprics'][number];

const UNIT_TYPE_ICONS: Record<ArmyUnitType | 'Garrison', string> = {
  infantry: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  cavalry: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  ranged: '/assets/icons/UnitTypes/I_ArmyRanged.png',
  siege: '/assets/icons/UnitTypes/I_ArmySiege.png',
  navy: '/assets/icons/I_NaviesQuickButton.png',
  Garrison: '/assets/icons/Doctrines/I_Doctrine_Garrison.png',
};

function mapBishopCharacter(data: GetSettlementDataResponse, bishopric: SettlementBishopricResponse): Character {
  return {
    id: bishopric.bishopId,
    debugShortId: bishopric.bishopDebugShortId || undefined,
    name: bishopric.bishopName,
    title: bishopric.clergyTitle,
    shortTitle: bishopric.clergyTitle,
    age: 0,
    portrait: '',
    faction: data.faction,
    culture: '',
    religion: bishopric.religionName,
    religionInfo: bishopric.religion,
    stats: { tactics: 0, authority: bishopric.authority, cunning: 0, governance: 0, loyalty: 0, constitution: 0 },
    traits: [],
    honourDread: 0,
    fame: 0,
    activity: 'InCourt',
    roleExperience: { military: 0, administrative: 0, diplomatic: 0, intrigue: 0 },
    compliance: 0,
    governedRegions: [],
    relationships: [],
  };
}

/**
 * Maps bridge settlement response to the Settlement type used by the sidebar.
 * Fields that don't exist in the bridge response get sensible defaults.
 */
function mapSettlement(data: GetSettlementDataResponse): Settlement {
  // Bridge sends populationGrowth as absolute people per month.
  const firstBishopric = data.bishoprics.find(b => !!b.bishopId);
  const firstBishop = firstBishopric ? mapBishopCharacter(data, firstBishopric) : null;
  return {
    id: data.id,
    debugShortId: data.debugShortId,
    name: data.name,
    faction: data.faction,
    factionId: data.factionId || undefined,
    factionDebugShortId: data.factionDebugShortId || undefined,
    factionColour: data.factionColour || '#888888',
    factionSecondaryColour: data.factionSecondaryColour || undefined,
    factionEmblem: data.factionEmblem || undefined,
    factionCultureGroup: data.factionCultureGroup || undefined,
    isCapital: data.isCapital,
    isFactionIndependent: data.isFactionIndependent,
    canRename: data.canRename,
    canManageGovernor: data.canManageGovernor,
    governorCouldRebel: data.governorCouldRebel,
    showSetCapital: data.showSetCapital,
    canSetCapital: data.canSetCapital,
    capitalMoveCost: data.capitalMoveCost,
    capitalMoveBlockedReason: data.capitalMoveBlockedReason || undefined,
    canNavigateSettlements: data.canNavigateSettlements,
    type: (data.type as Settlement['type']) || 'village',
    population: data.population,
    populationGrowth: data.populationGrowth,
    income: data.income,
    food: 0,
    foodProduction: data.foodProduction,
    foodConsumption: data.foodConsumption,
    fortificationLevel: data.fortificationLevel,
    governor: data.hasGovernor ? {
      id: data.governor.personId,
      debugShortId: data.governor.debugShortId || undefined,
      name: data.governor.name,
      title: data.governor.title,
      shortTitle: data.governor.title,
      age: 0,
      portrait: '',
      faction: data.faction,
      culture: '',
      religion: '',
      stats: { tactics: 0, authority: 0, cunning: 0, governance: 0, loyalty: 0, constitution: 0 },
      traits: [],
      honourDread: 0,
      fame: 0,
      activity: 'LeadingSettlement',
      roleExperience: { military: 0, administrative: 0, diplomatic: 0, intrigue: 0 },
      compliance: 0,
      governedRegions: [],
      relationships: [],
    } : null,
    culture: data.culture,
    culturePercent: data.culturePercent,
    religion: data.religion,
    religionPercent: data.religionPercent,
    unrest: data.unrest * 100,
    unrestLabel: data.unrestLabel,
    buildings: data.buildings.map((b, i) => ({ id: `bld-${i}`, name: b.name, level: b.level })),
    hasPort: data.hasPort,
    garrison: data.garrison.map(u => ({
      name: u.name,
      description: u.description,
      type: u.unitType,
      typeIcon: WebkilnAssetPath(UNIT_TYPE_ICONS[u.unitType as ArmyUnitType | 'Garrison']) ?? '',
      portrait: WebkilnAssetPath(u.portrait) ?? '',
      tier: u.tier,
      sourceBuilding: '',
      strength: u.strength,
      maxStrength: u.maxStrength,
      upkeep: u.upkeep,
      foodConsumption: u.foodConsumption,
      speed: u.speed,
      attackSpeed: u.attackSpeed,
      pierceDmg: u.pierceDamage,
      crushDmg: u.crushDamage,
      slashDmg: u.slashDamage,
      pierceArm: u.pierceArmour,
      crushArm: u.crushArmour,
      slashArm: u.slashArmour,
      veterancy: 0,
      culture: u.culture,
    })),
    garrisonedArmies: data.garrisonedArmies.map(a => ({
      id: a.id || undefined,
      debugShortId: a.debugShortId || undefined,
      name: a.name,
      commanderName: a.commanderName,
      commanderId: a.commanderId || undefined,
      commanderDebugShortId: a.commanderDebugShortId || undefined,
      commanderPortrait: '',
      commanderTitle: a.commanderTitle,
      strength: a.strength,
      maxStrength: a.maxStrength,
      morale: a.morale,
      unitCount: a.unitCount,
    })),
    canViewGarrison: data.canViewGarrison,
    garrisonHiddenReason: data.garrisonHiddenReason || undefined,
    resourceCategories: data.resourceCategories.map(c => ({
      id: c.id,
      name: c.name,
      stockpile: c.stockpile,
      stockpileCap: c.stockpileCap,
      production: c.production,
      potentialProduction: c.potentialProduction,
      consumption: c.consumption,
      hasShortage: c.hasShortage,
      isCapitalStockpile: c.isCapitalStockpile,
    })),
    resources: data.resources.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      categoryName: r.categoryName,
      amount: r.amount,
      stockpile: r.stockpile,
      reserved: r.reserved,
      demand: r.demand,
      production: r.production,
      potentialProduction: r.potentialProduction,
      consumption: r.consumption,
      shortage: r.shortage,
      shortagePercent: r.shortagePercent,
      status: r.status,
      depleting: r.depleting,
      monthsUntilDepletion: r.monthsUntilDepletion,
      icon: r.id ? WebkilnAssetPath(`/assets/resources/${r.id}.png`) : undefined,
      isNatural: r.isNatural,
      siegeHalted: r.siegeHalted,
      productionSources: r.productionSources.map(s => ({ name: s.name, value: s.value })),
      consumptionSources: r.consumptionSources.map(s => ({ name: s.name, value: s.value })),
      bottlenecks: r.bottlenecks.map(b => ({ name: b.name, details: b.details })),
    })),
    region: data.region,
    land: data.land,
    domain: data.domain,
    regionKey: data.regionKey || undefined,
    landKey: data.landKey || undefined,
    domainKey: data.domainKey || undefined,
    cultures: data.cultures.map(c => ({
      id: c.info.id,
      name: c.info.name,
      percent: c.percent,
      color: c.info.colour,
      description: c.info.description,
      icon: c.info.id ? WebkilnAssetPath(`/assets/cultures/${c.info.id}.png`) : undefined,
      info: c.info.id ? c.info : undefined,
      monthlyChangePercent: c.monthlyChangePercent,
      pressureSources: c.pressureSources.map(s => ({ name: s.name, value: s.value })),
    })),
    religions: data.religions.map(r => ({
      id: r.info.id,
      name: r.info.name,
      percent: r.percent,
      color: r.info.colour,
      description: r.info.description,
      icon: r.info.id ? WebkilnAssetPath(`/assets/religions/${r.info.id}.png`) : undefined,
      info: r.info.id ? r.info : undefined,
      monthlyChangePercent: r.monthlyChangePercent,
      pressureSources: r.pressureSources.map(s => ({ name: s.name, value: s.value })),
      conversionResistancePercent: r.conversionResistancePercent,
      zealousMinority: r.zealousMinority,
      naturallyGrowing: r.naturallyGrowing,
      naturallyDeclining: r.naturallyDeclining,
      persecutionResilience: r.persecutionResilience,
    })),
    pops: data.pops.map(p => ({
      culture: p.culture,
      cultureAdjective: p.cultureAdjective,
      cultureIcon: p.cultureId ? WebkilnAssetPath(`/assets/cultures/${p.cultureId}.png`) : undefined,
      religion: p.religion,
      religionAdherentPlural: p.religionAdherentPlural,
      religionIcon: p.religionId ? WebkilnAssetPath(`/assets/religions/${p.religionId}.png`) : undefined,
      count: p.count,
      unrest: p.unrest,
      monthlyGrowth: p.monthlyGrowth,
      growthBreakdown: p.growthBreakdown.map(s => ({ name: s.name, value: s.value })),
      unrestBreakdown: p.unrestBreakdown.map(s => ({ name: s.name, value: s.value })),
      monthlyConversion: p.monthlyConversion,
      conversionTargetReligion: p.conversionTargetReligion || undefined,
      monthlyAssimilation: p.monthlyAssimilation,
      assimilationTargetCulture: p.assimilationTargetCulture || undefined,
    })),
    modifiers: data.modifiers.map(m => ({
      key: m.key,
      label: m.label,
      icon: (m.iconPath ? WebkilnAssetPath(m.iconPath) : undefined) ?? (m.id ? WebkilnAssetPath(`/assets/modifiers/${m.id}.png`) : '') ?? '',
      description: m.description,
      total: m.hasTotal ? m.total : undefined,
      isPercent: m.hasTotal ? m.isPercent : undefined,
      sources: m.hasTotal ? m.sources.map(s => ({ name: s.name, value: s.value })) : undefined,
    })),
    disease: data.disease.hasDisease ? {
      hasDisease: data.disease.hasDisease,
      name: data.disease.name,
      description: data.disease.description,
      severity: data.disease.severity,
      severityLabel: data.disease.severityLabel,
      daysRemaining: data.disease.daysRemaining,
      deaths: data.disease.deaths,
      effects: data.disease.effects.map(s => ({ name: s.name, value: s.value })),
    } : undefined,
    bishoprics: data.bishoprics.map(b => ({
      religion: b.religion,
      religionKey: b.religionKey,
      religionName: b.religionName,
      religionIcon: WebkilnAssetPath(b.religionIconPath) ?? (b.religionKey ? WebkilnAssetPath(`/assets/religions/${b.religionKey}.png`) : '') ?? '',
      clergyTitle: b.clergyTitle,
      canManage: b.canManage,
      bishop: b.bishopId ? mapBishopCharacter(data, b) : null,
      authority: b.authority,
      landReligionShare: b.landReligionShare,
      landFollowers: b.landFollowers,
      landPopulation: b.landPopulation,
    })),
    bishop: firstBishop,
    bishopReligion: firstBishopric?.religionName,
    incomeBreakdown: data.incomeBreakdown.map(s => ({ name: s.name, value: s.value })),
    unrestBreakdown: data.unrestBreakdown.map(s => ({ name: s.name, value: s.value })),
    growthBreakdown: data.growthBreakdown.map(s => ({ name: s.name, value: s.value })),
    foodBreakdown: data.foodBreakdown.map(s => ({ name: s.name, value: s.value })),
    fortificationBreakdown: data.fortificationBreakdown.map(s => ({ name: s.name, value: s.value })),
    siege: data.siegeStateKind === 'siege' || data.siegeStateKind === 'blockade' || data.siegeStateKind === 'occupation'
      ? {
          state: data.siegeStateKind,
          alsoBlockaded: data.alsoBlockaded,
          canAssault: data.canAssault,
          canSallyOut: data.canSallyOut,
          canPillage: data.canPillage,
          canSack: data.canSack,
          progress: data.siegeProgress,
          estimatedDays: data.estimatedSiegeDays,
          capitalOccupationDaysRemaining: data.hasCapitalOccupationDeadline
            ? data.capitalOccupationDaysRemaining
            : undefined,
          totalSiegePower: data.totalSiegePower,
          totalDefenderStrength: data.totalDefenderStrength,
          pillageGold: data.pillageGold,
          sackGold: data.sackGold,
          progressPerDay: data.siegeProgressPerDay,
          progressFactors: data.siegeProgressFactors.map(f => ({
            name: f.name,
            value: f.value,
            kind: f.kind as 'power' | 'defence' | 'multiplier' | 'percent',
            helpsProgress: f.helpsProgress,
          })),
          hostileFaction: data.hostileFaction,
          hostileFactionId: data.hostileFactionId || undefined,
          hostileFactionDebugShortId: data.hostileFactionDebugShortId || undefined,
          hostileFactionColour: data.hostileFactionColour || undefined,
          hostileFactionSecondaryColour: data.hostileFactionSecondaryColour || undefined,
          hostileFactionEmblem: data.hostileFactionEmblem || undefined,
          hostileFactionCultureGroup: data.hostileFactionCultureGroup || undefined,
          besiegingArmies: data.besiegingArmies.map(a => ({
            kind: a.kind === 'navy' ? 'navy' : 'army',
            debugShortId: a.debugShortId || undefined,
            name: a.name,
            commanderName: a.commanderName,
            commanderId: a.commanderId || undefined,
            commanderDebugShortId: a.commanderDebugShortId || undefined,
            strength: a.strength,
            maxStrength: a.maxStrength,
            siegePower: a.siegePower,
            morale: a.morale,
            unitCount: a.unitCount,
            isLead: a.isLead,
          })),
          defendingMilitaries: data.defendingMilitaries.map(a => ({
            kind: a.kind === 'navy' ? 'navy' : 'army',
            debugShortId: a.debugShortId || undefined,
            name: a.name,
            commanderName: a.commanderName,
            commanderId: a.commanderId || undefined,
            commanderDebugShortId: a.commanderDebugShortId || undefined,
            strength: a.strength,
            maxStrength: a.maxStrength,
            siegePower: a.siegePower,
            morale: a.morale,
            unitCount: a.unitCount,
            isLead: false,
          })),
        }
      : undefined,
    canBuild: data.canBuild,
    cannotBuildReason: data.cannotBuildReason || undefined,
  };
}

function mapSiegePatch(data: GetSettlementSiegeDataResponse): Settlement['siege'] {
  if (data.siegeStateKind !== 'siege' && data.siegeStateKind !== 'blockade' && data.siegeStateKind !== 'occupation') {
    return undefined;
  }

  return {
    state: data.siegeStateKind,
    alsoBlockaded: data.alsoBlockaded,
    canAssault: data.canAssault,
    canSallyOut: data.canSallyOut,
    canPillage: data.canPillage,
    canSack: data.canSack,
    progress: data.siegeProgress,
    estimatedDays: data.estimatedSiegeDays,
    capitalOccupationDaysRemaining: data.hasCapitalOccupationDeadline
      ? data.capitalOccupationDaysRemaining
      : undefined,
    totalSiegePower: data.totalSiegePower,
    totalDefenderStrength: data.totalDefenderStrength,
    pillageGold: data.pillageGold,
    sackGold: data.sackGold,
    progressPerDay: data.siegeProgressPerDay,
    progressFactors: data.siegeProgressFactors.map(f => ({
      name: f.name,
      value: f.value,
      kind: f.kind as 'power' | 'defence' | 'multiplier' | 'percent',
      helpsProgress: f.helpsProgress,
    })),
    hostileFaction: data.hostileFaction,
    hostileFactionId: data.hostileFactionId || undefined,
    hostileFactionDebugShortId: data.hostileFactionDebugShortId || undefined,
    hostileFactionColour: data.hostileFactionColour || undefined,
    hostileFactionSecondaryColour: data.hostileFactionSecondaryColour || undefined,
    hostileFactionEmblem: data.hostileFactionEmblem || undefined,
    hostileFactionCultureGroup: data.hostileFactionCultureGroup || undefined,
    besiegingArmies: data.besiegingArmies.map(a => ({
      kind: a.kind === 'navy' ? 'navy' : 'army',
      debugShortId: a.debugShortId || undefined,
      name: a.name,
      commanderName: a.commanderName,
      commanderId: a.commanderId || undefined,
      commanderDebugShortId: a.commanderDebugShortId || undefined,
      strength: a.strength,
      maxStrength: a.maxStrength,
      siegePower: a.siegePower,
      morale: a.morale,
      unitCount: a.unitCount,
      isLead: a.isLead,
    })),
    defendingMilitaries: data.defendingMilitaries.map(a => ({
      kind: a.kind === 'navy' ? 'navy' : 'army',
      debugShortId: a.debugShortId || undefined,
      name: a.name,
      commanderName: a.commanderName,
      commanderId: a.commanderId || undefined,
      commanderDebugShortId: a.commanderDebugShortId || undefined,
      strength: a.strength,
      maxStrength: a.maxStrength,
      siegePower: a.siegePower,
      morale: a.morale,
      unitCount: a.unitCount,
      isLead: false,
    })),
  };
}

function applySiegePatch(settlement: Settlement | null, patch: GetSettlementSiegeDataResponse | null): Settlement | null {
  if (!settlement || !patch || settlement.id !== patch.id) {
    return settlement;
  }

  return {
    ...settlement,
    siege: mapSiegePatch(patch),
    canBuild: patch.canBuild,
    cannotBuildReason: patch.cannotBuildReason || undefined,
  };
}

export function dispatchSettlementData(data: GetSettlementDataResponse): void {
  bridgeEvents.dispatchEvent(new CustomEvent('game.get_settlement_data', { detail: data }));
}

export async function refreshSettlementData(settlementId: string): Promise<void> {
  const fresh = await bridgeCall('game.get_settlement_data', { settlementId });
  dispatchSettlementData(fresh);
}

const inFlightSiegeCommands = new Map<string, Promise<void>>();

export async function performSiegeCommandBridge(
  settlementId: string,
  command: 'assault' | 'sallyOut' | 'pillage' | 'sack',
): Promise<void> {
  const existing = inFlightSiegeCommands.get(settlementId);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const result = await bridgeCall('game.perform_siege_command', { settlementId, command });
    if (!result.openedBattle) {
      await refreshSettlementData(settlementId);
    }
  })();

  inFlightSiegeCommands.set(settlementId, request);
  try {
    await request;
  } finally {
    if (inFlightSiegeCommands.get(settlementId) === request) {
      inFlightSiegeCommands.delete(settlementId);
    }
  }
}

/**
 * Fetches settlement data from the game bridge for a given settlement GUID.
 * Returns null while loading or if bridge is unavailable.
 * Returns null until the bridge provides settlement data.
 */
export function useSettlementBridge(settlementId: string | null): Settlement | null {
  const settlement = useBridgeQuery({
    action: 'game.get_settlement_data',
    payload: settlementId ? { settlementId } : null,
    map: mapSettlement,
    matchPush: (data) => data.id === settlementId,
    // Keep the current settlement visible while the next one loads so sidebar
    // tab / panel state is not torn down when navigating between settlements.
    keepPreviousData: true,
  });
  const [siegePatch, setSiegePatch] = useState<GetSettlementSiegeDataResponse | null>(null);

  useEffect(() => {
    if (!settlementId) {
      setSiegePatch(null);
      return undefined;
    }

    setSiegePatch(null);
    return onBridgeEvent('game.get_settlement_siege_data', (data) => {
      if (data.id === settlementId) {
        setSiegePatch(data);
      }
    });
  }, [settlementId]);

  // Only apply siege patches that belong to the settlement currently shown.
  // While keepPreviousData still shows the previous settlement, ignore the
  // next settlement's siege push until the main data has swapped over.
  const siegeForSettlement = settlement && siegePatch && siegePatch.id === settlement.id
    ? siegePatch
    : null;

  return useMemo(
    () => applySiegePatch(settlement, siegeForSettlement),
    [settlement, siegeForSettlement],
  );
}

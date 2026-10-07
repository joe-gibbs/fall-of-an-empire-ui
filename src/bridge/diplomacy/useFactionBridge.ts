import { useEffect, useMemo, useState } from 'react';
import { clearBridgeQueryCache, useBridgeQueryState } from '../core/useBridgeQuery';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import type {
  DiplomacyFactionReference,
  FactionDemographicShare as BridgeFactionDemographicShare,
  FactionSubjectDemographics as BridgeFactionSubjectDemographics,
  GetFactionDailyDataResponse,
  GetFactionDataResponse,
} from '../../bridge-types.generated.ts';
import type {
  Faction,
  FactionTreaty,
  FactionOpinionModifier,
  FactionWarFaction,
  FactionWarPartner,
  FactionDemographicShare,
  FactionSubjectDemographics,
  FactionPolicy,
  FactionModifier,
} from '../../data/types';

type DiplomaticStatus = Faction['diplomaticStatus'];

const VALID_STATUSES: readonly DiplomaticStatus[] = ['ally', 'rival', 'neutral', 'war', 'subject'];

function parseStatus(raw: string): DiplomaticStatus {
  return (VALID_STATUSES as readonly string[]).includes(raw) ? (raw as DiplomaticStatus) : 'neutral';
}

function parsePolicyDirection(raw: string): FactionPolicy['activeDirection'] {
  return raw === 'increase' || raw === 'decrease' ? raw : '';
}

function mapWarFaction(faction: DiplomacyFactionReference): FactionWarFaction {
  return {
    id: faction.id,
    name: faction.name,
    colour: faction.colour,
    secondaryColour: faction.secondaryColour || undefined,
    cultureGroup: faction.cultureGroup || undefined,
    emblem: faction.emblem || undefined,
    diplomaticStatus: faction.diplomaticStatus || undefined,
    subjectSubtype: faction.subjectSubtype || undefined,
    isPlayer: faction.isPlayer,
    isRebel: faction.isRebel,
  };
}

function mapDemographicShare(share: BridgeFactionDemographicShare): FactionDemographicShare {
  return {
    id: share.id,
    name: share.name,
    description: share.description,
    colour: share.colour,
    iconId: share.iconId,
    population: share.population,
  };
}

function mapSubjectDemographics(entry: BridgeFactionSubjectDemographics): FactionSubjectDemographics {
  return {
    faction: mapWarFaction(entry.faction),
    population: entry.population,
    cultures: entry.cultures.map(mapDemographicShare),
    religions: entry.religions.map(mapDemographicShare),
  };
}

/** Map the bridge response onto the Faction type the UI consumes. */
function mapFaction(data: GetFactionDataResponse): Faction {
  const diplomaticStatus = parseStatus(data.diplomaticStatus);
  const treaties: FactionTreaty[] = data.treaties.map(t => ({
    id: t.id,
    type: t.type,
    displayName: t.displayName,
    description: t.description,
    withFaction: t.withFaction,
    withFactionId: t.withFactionId,
    withFactionDebugShortId: t.withFactionDebugShortId,
    withFactionColour: t.withFactionColour,
    withFactionSecondaryColour: t.withFactionSecondaryColour,
    withFactionCulture: t.withFactionCulture,
    withFactionCultureGroup: t.withFactionCultureGroup,
    withFactionEmblem: t.withFactionEmblem,
    withFactionDiplomaticStatus: t.withFactionDiplomaticStatus || undefined,
    withFactionSubjectSubtype: t.withFactionSubjectSubtype || undefined,
    withFactionIsPlayer: t.withFactionIsPlayer,
    withFactionIsRebel: t.withFactionIsRebel,
    daysRemaining: t.daysRemaining,
    turnsRemaining: t.daysRemaining,
    isPerpetual: t.isPerpetual,
    canBreak: t.canBreak,
    breakingPenalty: t.breakingPenalty,
    breakingPenaltyTooltip: t.breakingPenaltyTooltip,
    isWithPlayer: t.isWithPlayer,
  }));

  return {
    foederatiPolitics: data.foederatiPolitics,
    id: data.id,
    debugShortId: data.debugShortId,
    name: data.name,
    colour: data.colour,
    secondaryColour: data.secondaryColour,
    rulerName: data.rulerName,
    rulerId: data.rulerId,
    dominantCourtierId: data.dominantCourtierId || undefined,
    dominantCourtierName: data.dominantCourtierName || undefined,
    dominantCourtierParts: data.dominantCourtierParts,
    splitCourt: data.splitCourt,
    rulerDebugShortId: data.rulerDebugShortId || undefined,
    rulerPortrait: data.rulerPortrait || undefined,
    rulerPortraitLayers: data.rulerPortraitLayers,
    strength: data.strength,
    strengthBreakdown: data.strengthBreakdown,
    isRebel: data.isRebel,
    rebelTypeName: data.rebelTypeName || undefined,
    rebelGoalName: data.rebelGoalName || undefined,
    rebelGoalDescription: data.rebelGoalDescription || undefined,
    description: '',
    culture: data.culture,
    cultureId: data.cultureId,
    cultureGroup: data.cultureGroup,
    cultureInfo: data.cultureInfo.id ? data.cultureInfo : undefined,
    emblem: data.emblem,
    religion: data.religion,
    religionId: data.religionId,
    religionInfo: data.religionInfo.id ? data.religionInfo : undefined,
    government: data.government || undefined,
    governmentTypeName: data.governmentTypeName || undefined,
    governmentDisplayName: data.governmentDisplayName || undefined,
    governmentDescription: data.governmentDescription || undefined,
    governmentCapabilities: data.governmentCapabilities,
    usesPowerBlocs: data.usesPowerBlocs,
    usesAdministrativeCorruption: data.usesAdministrativeCorruption,
    usesPatronage: data.usesPatronage,
    generatesLeaderOnSuccession: data.generatesLeaderOnSuccession,
    canAppointHeir: data.canAppointHeir,
    crownTaxPercent: data.crownTaxPercent,
    realmProgress: data.realmProgress,
    capital: data.capital,
    diplomaticStatus,
    subjectSubtype: data.subjectSubtype || undefined,
    subjectType: data.subjectType || undefined,
    overlordName: data.overlordName || undefined,
    peaceNegotiationTargetFactionId: data.peaceNegotiationTargetFactionId || undefined,
    opinion: data.opinion,
    population: data.population,
    directPopulation: data.directPopulation,
    subjectPopulation: data.subjectPopulation,
    populationMonthlyChange: data.populationMonthlyChange,
    populationGrowthBreakdown: (data.populationGrowthBreakdown ?? []).map(source => ({
      name: source.name,
      value: source.value,
    })),
    settlements: data.settlements,
    settlementBreakdown: data.settlementBreakdown,
    subjectSettlements: data.subjectSettlements,
    armyCount: data.armies,
    usesWarbands: data.usesWarbands,
    warbandStrength: data.warbandStrength,
    usesLevies: data.usesLevies,
    levyStrength: data.levyStrength,
    isFoederatiCalledUp: data.isFoederatiCalledUp,
    canCallFoederati: data.canCallFoederati,
    vassalCount: data.vassalCount,
    income: data.income,
    gold: data.gold,
    treaties,
    playerStrength: data.playerStrength,
    buildFocusKey: data.buildFocusKey || undefined,
    buildFocus: data.buildFocus || undefined,
    canSetBuildFocus: data.canSetBuildFocus,
    buildFocusBlockedReason: data.buildFocusBlockedReason || undefined,
    compliance: !data.isPlayer && diplomaticStatus === 'subject' ? data.compliance : undefined,
    cultures: data.cultures.map(mapDemographicShare),
    religions: data.religions.map(mapDemographicShare),
    subjectDemographics: data.subjectDemographics.map(mapSubjectDemographics),
    wars: data.wars.map<FactionWarPartner>(w => ({
      id: w.id,
      debugShortId: w.debugShortId,
      name: w.name,
      colour: w.colour,
      secondaryColour: w.secondaryColour || undefined,
      cultureGroup: w.cultureGroup || undefined,
      emblem: w.emblem || undefined,
      diplomaticStatus: w.diplomaticStatus || undefined,
      subjectSubtype: w.subjectSubtype || undefined,
      isPlayer: w.isPlayer,
      isRebel: w.isRebel,
      warId: w.warId || undefined,
      warName: w.warName || undefined,
      warScore: w.warScore,
      warScoreBreakdown: w.warScoreBreakdown,
      enemyParticipants: w.enemyParticipants.map(mapWarFaction),
    })),
    policies: data.policies.map<FactionPolicy>(p => ({
      id: p.id,
      key: p.key,
      iconId: p.iconId,
      name: p.name,
      description: p.description,
      effectDescription: p.effectDescription,
      effectLines: p.effectLines ?? [],
      increaseEffectDescription: p.increaseEffectDescription,
      increaseEffectLines: p.increaseEffectLines ?? [],
      decreaseEffectDescription: p.decreaseEffectDescription,
      decreaseEffectLines: p.decreaseEffectLines ?? [],
      levelEffects: (p.levelEffects ?? []).map(level => ({
        level: level.level,
        value: level.value,
        effectDescription: level.effectDescription,
        effectLines: level.effectLines ?? [],
        isCurrent: level.isCurrent,
        isAvailable: level.isAvailable,
        lockReason: level.lockReason || undefined,
      })),
      displayFactionName: p.displayFactionName,
      isFromLiege: p.isFromLiege,
      value: p.value,
      minValue: p.minValue,
      maxValue: p.maxValue,
      increaseCost: p.increaseCost,
      decreaseCost: p.decreaseCost,
      increaseDuration: p.increaseDuration,
      decreaseDuration: p.decreaseDuration,
      increaseCausesUnrest: p.increaseCausesUnrest,
      decreaseCausesUnrest: p.decreaseCausesUnrest,
      canModify: p.canModify,
      canIncrease: p.canIncrease,
      canDecrease: p.canDecrease,
      inProgress: p.inProgress,
      activeDirection: parsePolicyDirection(p.activeDirection),
      progress: p.progress,
      remainingDays: p.remainingDays,
      durationDays: p.durationDays,
      bureaucraticIncreaseLoad: p.bureaucraticIncreaseLoad,
      bureaucraticDecreaseLoad: p.bureaucraticDecreaseLoad,
      bureaucraticCurrentLoad: p.bureaucraticCurrentLoad,
      bureaucraticRushDaysSaved: p.bureaucraticRushDaysSaved,
      bureaucraticRushLoad: p.bureaucraticRushLoad,
    })),
    modifiers: data.modifiers.map<FactionModifier>(m => ({
      key: m.key,
      label: m.label,
      description: m.description,
      icon: m.icon,
      value: m.value,
      isPercent: m.isPercent,
      isMultiplier: m.isMultiplier,
      invertColouring: m.invertColouring,
      decimals: m.decimals,
      sources: m.sources.map(source => ({
        label: source.label,
        value: source.value,
      })),
    })),
    opinionBreakdown: data.opinionBreakdown.map<FactionOpinionModifier>(m => ({
      key: m.key || undefined,
      label: m.label,
      value: m.value,
    })),
    complianceBreakdown: data.complianceBreakdown.map<FactionOpinionModifier>(m => ({
      key: m.key || undefined,
      label: m.label,
      value: m.value,
    })),
    isPlayer: data.isPlayer,
    assignedDiplomat: data.assignedDiplomatId
      ? { id: data.assignedDiplomatId, name: data.assignedDiplomatName }
      : undefined,
    assignedSpy: data.assignedSpyId
      ? { id: data.assignedSpyId, name: data.assignedSpyName }
      : undefined,
    spyNetwork: {
      strength: data.spyNetworkStrength,
      heat: data.spyHeat,
      growthPerMonth: data.spyNetworkGrowthPerMonth,
      spyCunning: data.spyCunning,
    },
    canSetDesignatedHeir: data.canSetDesignatedHeir,
    designatedHeir: data.designatedHeirId
      ? { id: data.designatedHeirId, name: data.designatedHeirName }
      : undefined,
    effectiveHeir: data.effectiveHeirId
      ? { id: data.effectiveHeirId, name: data.effectiveHeirName }
      : undefined,
  };
}

const factionCache = new Map<string, Faction>();

export function clearFactionCaches(): void {
  factionCache.clear();
  clearBridgeQueryCache('game.get_faction_data');
}

function cacheFaction(faction: Faction): void {
  factionCache.set(faction.id, faction);
  factionCache.set(faction.name, faction);
}

function applyFactionDailyPatch(faction: Faction | null, patch: GetFactionDailyDataResponse | null): Faction | null {
  if (!faction || !patch || faction.id !== patch.id) {
    return faction;
  }

  const policies = faction.policies.map(policy => {
    const daily = patch.policies.find(entry => entry.id === policy.id);
    if (!daily) {
      return policy;
    }

    return {
      ...policy,
      value: daily.value,
      levelEffects: policy.levelEffects.map(level => ({
        ...level,
        isCurrent: Math.round(level.value) === Math.round(daily.value),
      })),
      canModify: daily.canModify,
      canIncrease: daily.canIncrease,
      canDecrease: daily.canDecrease,
      inProgress: daily.inProgress,
      activeDirection: parsePolicyDirection(daily.activeDirection),
      progress: daily.progress,
      remainingDays: daily.remainingDays,
      durationDays: daily.durationDays,
      bureaucraticCurrentLoad: daily.bureaucraticCurrentLoad,
      bureaucraticRushDaysSaved: daily.bureaucraticRushDaysSaved,
      bureaucraticRushLoad: daily.bureaucraticRushLoad,
    };
  });

  return {
    ...faction,
    population: patch.population,
    directPopulation: patch.directPopulation,
    subjectPopulation: patch.subjectPopulation,
    populationMonthlyChange: patch.populationMonthlyChange,
    settlements: patch.settlements,
    subjectSettlements: patch.subjectSettlements,
    armyCount: patch.armies,
    usesWarbands: patch.usesWarbands,
    warbandStrength: patch.warbandStrength,
    usesLevies: patch.usesLevies,
    levyStrength: patch.levyStrength,
    isFoederatiCalledUp: patch.isFoederatiCalledUp,
    canCallFoederati: patch.canCallFoederati,
    gold: patch.gold,
    income: patch.income,
    strength: patch.strength,
    playerStrength: patch.playerStrength,
    vassalCount: patch.vassalCount,
    policies,
  };
}

function cacheFactionDailyPatch(patch: GetFactionDailyDataResponse): void {
  const cached = factionCache.get(patch.id);
  const patched = applyFactionDailyPatch(cached ?? null, patch);
  if (patched) {
    cacheFaction(patched);
  }
}

export function clearFactionCache(factionId: string | undefined): void {
  if (!factionId) return;
  clearBridgeQueryCache('game.get_faction_data');
  const cached = factionCache.get(factionId);
  factionCache.delete(factionId);
  if (cached) {
    factionCache.delete(cached.id);
    factionCache.delete(cached.name);
  }
}

export function dispatchFactionData(data: GetFactionDataResponse): void {
  clearBridgeQueryCache('game.get_faction_data');
  const mapped = mapFaction(data);
  cacheFaction(mapped);
  bridgeEvents.dispatchEvent(new CustomEvent('game.get_faction_data', { detail: data }));
}

/**
 * Fetches a faction's record from the game bridge by FactionID or display name.
 * Returns cached data immediately while the next fetch is in flight.
 */
export type FactionBridgeScope = 'full' | 'overview' | 'summary';

export interface FactionBridgeState {
  faction: Faction | null;
  pending: boolean;
}

export function useFactionBridgeState(factionId: string | null | undefined, scope: FactionBridgeScope = 'full', fetch = true, suspend = false): FactionBridgeState {
  const cached = factionId ? factionCache.get(factionId) ?? null : null;
  const [dailyPatch, setDailyPatch] = useState<GetFactionDailyDataResponse | null>(null);
  const liveQuery = useBridgeQueryState({
    action: 'game.get_faction_data',
    suspend,
    payload: fetch && factionId ? { factionId, scope, subscriptionId: '', subscribe: false } : null,
    cacheResponseMs: 1500,
    map: (data) => {
      const mapped = mapFaction(data);
      cacheFaction(mapped);
      return mapped;
    },
    matchPush: (data) => !factionId || data.id === factionId || data.name === factionId,
  });

  useEffect(() => {
    if (!fetch || !factionId) return;
    const subscriptionId = `faction-${crypto.randomUUID()}`;
    let mounted = true;
    void bridgeCall('game.get_faction_data', { factionId, scope, subscriptionId, subscribe: true })
      .then(() => {
        // A gameplay-readiness retry can complete after this view has closed or changed.
        if (!mounted) {
          return bridgeCall('game.get_faction_data', { factionId, scope, subscriptionId, subscribe: false });
        }
      })
      .catch(acknowledgeBridgeFailure);
    return () => {
      mounted = false;
      void bridgeCall('game.get_faction_data', { factionId, scope, subscriptionId, subscribe: false })
        .catch(acknowledgeBridgeFailure);
    };
  }, [factionId, fetch, scope]);

  useEffect(() => {
    if (!factionId) {
      return undefined;
    }

    const unsubscribeFull = onBridgeEvent('game.get_faction_data', (data) => {
      if (data.id === factionId || data.name === factionId) {
        // A full snapshot supersedes every earlier daily update for this faction.
        setDailyPatch(null);
      }
    });
    const unsubscribeDaily = onBridgeEvent('game.get_faction_daily_data', (data) => {
      cacheFactionDailyPatch(data);
      if (data.id === factionId) {
        setDailyPatch(data);
        return;
      }

      const current = factionCache.get(factionId);
      if (current && current.id === data.id) {
        setDailyPatch(data);
      }
    });
    return () => {
      unsubscribeFull();
      unsubscribeDaily();
    };
  }, [factionId]);

  const faction = useMemo(() => {
    const base = liveQuery.value ?? cached;
    return applyFactionDailyPatch(base, dailyPatch);
  }, [cached, dailyPatch, liveQuery.value]);

  return {
    faction,
    pending: Boolean(fetch && factionId) && !cached && liveQuery.pending,
  };
}

export function useFactionBridge(factionId: string | null | undefined, scope: FactionBridgeScope = 'full', fetch = true, suspend = false): Faction | null {
  return useFactionBridgeState(factionId, scope, fetch, suspend).faction;
}

export async function refreshFactionData(factionId: string): Promise<void> {
  const fresh = await bridgeCall('game.get_faction_data', { subscriptionId: '', subscribe: false, factionId, scope: 'full' });
  dispatchFactionData(fresh);
}

export async function startFactionPolicyAdjustment(
  factionId: string,
  policyId: string,
  direction: 'increase' | 'decrease',
): Promise<boolean> {
  try {
    const response = await bridgeCall('game.start_policy_adjustment', { factionId, policyId, direction });
    await refreshFactionData(factionId);
    return response.started;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function cancelFactionCurrentInteraction(factionId: string): Promise<boolean> {
  try {
    const response = await bridgeCall('game.cancel_faction_interaction', { targetFactionId: factionId });
    await refreshFactionData(factionId);
    return response.cancelled;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

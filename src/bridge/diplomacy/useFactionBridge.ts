import { useEffect, useMemo, useState } from 'react';
import { clearBridgeQueryCache, useBridgeQueryState } from '../core/useBridgeQuery';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import type { GetFactionDailyDataResponse, GetFactionDataResponse } from '../../bridge-types.generated.ts';
import type {
  Faction,
  FactionTreaty,
  FactionOpinionModifier,
  FactionWarPartner,
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
    daysRemaining: t.daysRemaining,
    turnsRemaining: t.daysRemaining,
    isPerpetual: t.isPerpetual,
    canBreak: t.canBreak,
    breakingPenalty: t.breakingPenalty,
    isWithPlayer: t.isWithPlayer,
  }));

  return {
    id: data.id,
    debugShortId: data.debugShortId,
    name: data.name,
    colour: data.colour,
    secondaryColour: data.secondaryColour,
    rulerName: data.rulerName,
    rulerId: data.rulerId,
    rulerDebugShortId: data.rulerDebugShortId || undefined,
    rulerPortrait: data.rulerPortrait || undefined,
    rulerPortraitLayers: data.rulerPortraitLayers,
    strength: data.strength,
    isRebel: data.isRebel,
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
    governmentDisplayName: data.governmentDisplayName || undefined,
    governmentDescription: data.governmentDescription || undefined,
    governmentCapabilities: data.governmentCapabilities,
    generatesLeaderOnSuccession: data.generatesLeaderOnSuccession,
    capital: data.capital,
    diplomaticStatus,
    subjectSubtype: data.subjectSubtype || undefined,
    subjectType: data.subjectType || undefined,
    peaceNegotiationTargetFactionId: data.peaceNegotiationTargetFactionId || undefined,
    opinion: data.opinion,
    population: data.population,
    settlements: data.settlements,
    armyCount: data.armies,
    usesLevies: data.usesLevies,
    levyStrength: data.levyStrength,
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
    wars: data.wars.map<FactionWarPartner>(w => ({
      id: w.id,
      debugShortId: w.debugShortId,
      name: w.name,
      colour: w.colour,
      secondaryColour: w.secondaryColour || undefined,
      cultureGroup: w.cultureGroup || undefined,
      emblem: w.emblem || undefined,
    })),
    policies: data.policies.map<FactionPolicy>(p => ({
      id: p.id,
      key: p.key,
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
      label: m.label,
      value: m.value,
    })),
    complianceBreakdown: data.complianceBreakdown.map<FactionOpinionModifier>(m => ({
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
    settlements: patch.settlements,
    armyCount: patch.armies,
    usesLevies: patch.usesLevies,
    levyStrength: patch.levyStrength,
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
  window.dispatchEvent(new CustomEvent('bridge:game.get_faction_data', { detail: data }));
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

export function useFactionBridgeState(factionId: string | null | undefined, scope: FactionBridgeScope = 'full', fetch = true): FactionBridgeState {
  const cached = factionId ? factionCache.get(factionId) ?? null : null;
  const [dailyPatch, setDailyPatch] = useState<GetFactionDailyDataResponse | null>(null);
  const liveQuery = useBridgeQueryState({
    action: 'game.get_faction_data',
    payload: fetch && factionId ? { factionId, scope } : null,
    cacheResponseMs: 1500,
    map: (data) => {
      const mapped = mapFaction(data);
      cacheFaction(mapped);
      return mapped;
    },
    matchPush: (data) => !factionId || data.id === factionId || data.name === factionId,
  });

  useEffect(() => {
    if (!factionId) {
      return undefined;
    }

    return onBridgeEvent('game.get_faction_daily_data', (data) => {
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

export function useFactionBridge(factionId: string | null | undefined, scope: FactionBridgeScope = 'full', fetch = true): Faction | null {
  return useFactionBridgeState(factionId, scope, fetch).faction;
}

async function refreshFactionData(factionId: string): Promise<void> {
  const fresh = await bridgeCall('game.get_faction_data', { factionId, scope: 'full' });
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

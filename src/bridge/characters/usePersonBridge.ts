import { useBridgeQuery } from '../core/useBridgeQuery';
import { WebkilnAssetPath } from '../../utils/assets';
import { mapPortraitLayers, mapPortraitPath } from './portraitMapping';
import type { GetPersonDataResponse } from '../../bridge-types.generated.ts';
import type { ActivitySegment, Character, CharacterStatModifier, PersonActivity, StatKey } from '../../data/types';

function normaliseStatKey(raw: string): StatKey | null {
  switch (raw) {
    case 'tactics':
    case 'authority':
    case 'cunning':
    case 'governance':
    case 'loyalty':
    case 'constitution':
      return raw;
    default:
      return null;
  }
}

/**
 * Maps a bridge person response to the Character type used by UI components.
 * Fields that don't exist in the bridge response default to benign values.
 */
function mapPerson(data: GetPersonDataResponse): Character {
  const temporaryModifiers: CharacterStatModifier[] = data.stats.temporaryModifiers.flatMap((modifier) => {
    const stat = normaliseStatKey(modifier.stat);
    if (!stat) return [];

    return [{
      stat,
      label: modifier.label,
      value: modifier.value,
      remainingDays: modifier.remainingDays >= 0 ? modifier.remainingDays : undefined,
      totalDurationDays: modifier.totalDurationDays > 0 ? modifier.totalDurationDays : undefined,
    }];
  });

  return {
    id: data.id,
    name: data.name,
    title: data.title,
    shortTitle: data.shortTitle,
    age: data.age,
    birthDate: data.birthDate || undefined,
    deathDate: data.deathDate || undefined,
    lifespan: data.lifespan || undefined,
    debugShortId: data.debugShortId,
    debugAgeDays: data.debugAgeDays,
    vigor: data.vigor,
    isImmortal: data.isImmortal,
    powerBlocName: data.powerBlocName || undefined,
    powerBlocDebugShortId: data.powerBlocDebugShortId || undefined,
    commanderKind: data.commanderKind || undefined,
    portrait: mapPortraitPath(data.portrait),
    portraitLayers: mapPortraitLayers(data.portraitLayers),
    faction: data.faction,
    factionId: data.factionId || undefined,
    factionColour: data.factionColour || undefined,
    factionSecondaryColour: data.factionSecondaryColour || undefined,
    factionEmblem: data.factionEmblem || undefined,
    factionCultureGroup: data.factionCultureGroup || undefined,
    factionDiplomaticStatus: data.factionDiplomaticStatus || undefined,
    factionSubjectSubtype: data.factionSubjectSubtype || undefined,
    factionIsPlayer: data.factionIsPlayer,
    factionIsRebel: data.factionIsRebel,
    culture: data.culture,
    religion: data.religion,
    cultureInfo: data.cultureInfo.id ? data.cultureInfo : undefined,
    religionInfo: data.religionInfo.id ? data.religionInfo : undefined,
    stats: {
      tactics: Math.round(data.stats.tactics),
      authority: Math.round(data.stats.authority),
      cunning: Math.round(data.stats.cunning),
      governance: Math.round(data.stats.governance),
      loyalty: Math.round(data.stats.loyalty),
      constitution: Math.round(data.stats.constitution),
      base: {
        tactics: Math.round(data.stats.baseTactics),
        authority: Math.round(data.stats.baseAuthority),
        cunning: Math.round(data.stats.baseCunning),
        governance: Math.round(data.stats.baseGovernance),
        loyalty: Math.round(data.stats.baseLoyalty),
        constitution: Math.round(data.stats.baseConstitution),
      },
      temporaryModifiers: temporaryModifiers.length > 0 ? temporaryModifiers : undefined,
    },
    traits: data.traits.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.id,
      description: t.description,
      isPositive: t.isPositive,
      effects: t.effects.map(e => ({
        stat: e.stat,
        label: e.label,
        value: e.value,
        isPositive: e.isPositive,
      })),
      isTemporary: t.isTemporary || undefined,
      remainingDays: t.isTemporary ? t.remainingDays : undefined,
      totalDurationDays: t.isTemporary ? t.totalDurationDays : undefined,
    })),
    honourDread: data.honourDread,
    fame: Math.round(data.fame),
    activity: data.activity as PersonActivity,
    activitySegments: data.activitySegments.map(segment => ({
      text: segment.text,
      linkType: segment.linkType ? segment.linkType as ActivitySegment['linkType'] : undefined,
      linkId: segment.linkId || undefined,
    })),
    history: data.history.map(entry => ({
      type: entry.type,
      label: entry.label,
      targetId: entry.targetId || undefined,
      targetType: entry.targetType || undefined,
      targetName: entry.targetName,
      secondaryTargetId: entry.secondaryTargetId || undefined,
      secondaryTargetType: entry.secondaryTargetType || undefined,
      secondaryTargetName: entry.secondaryTargetName || undefined,
      startDate: entry.startDate || undefined,
      endDate: entry.endDate || undefined,
      startDay: entry.startDay,
      endDay: entry.endDay > 0 ? entry.endDay : undefined,
      isActive: entry.isActive,
      detail: entry.detail || undefined,
    })),
    roleExperience: {
      military: data.roleExperience.military,
      administrative: data.roleExperience.administrative,
      diplomatic: data.roleExperience.diplomatic,
      intrigue: data.roleExperience.intrigue,
    },
    roleTiers: {
      military: data.roleTiers.military,
      administrative: data.roleTiers.administrative,
      diplomatic: data.roleTiers.diplomatic,
      intrigue: data.roleTiers.intrigue,
    },
    compliance: data.complianceTowardPlayer,
    isPlayerCharacter: data.isPlayerCharacter,
    isRuler: data.isRuler,
    rulerFactionName: data.rulerFactionName || undefined,
    isHeir: data.isHeir,
    isDesignatedHeir: data.isDesignatedHeir,
    isFamilyOfPlayer: data.isFamilyOfPlayer,
    isSubordinateOfPlayer: data.isSubordinateOfPlayer,
    relationToPlayer: data.relationToPlayer || undefined,
    complianceBreakdown: data.complianceBreakdown.length
      ? data.complianceBreakdown.map(entry => ({
        key: entry.key || undefined,
        label: entry.label,
        value: entry.value,
      }))
      : undefined,
    opinionTowardPlayer: data.opinionBreakdown.length ? data.opinionTowardPlayer : undefined,
    opinionBreakdown: data.opinionBreakdown.length ? data.opinionBreakdown : undefined,
    honourDreadBreakdown: data.honourDreadBreakdown.length ? data.honourDreadBreakdown : undefined,
    governedRegions: data.governedRegions.map(region => ({
      id: region.id,
      name: region.name,
      focusSettlementId: region.focusSettlementId,
    })),
    courtPosition: data.courtPosition.key
      ? {
        key: data.courtPosition.key,
        name: data.courtPosition.name,
        courtFactionId: data.courtPosition.courtFactionId || undefined,
        courtFactionName: data.courtPosition.courtFactionName || undefined,
        isSubordinate: data.courtPosition.isSubordinate,
      }
      : undefined,
    commandedMilitary: data.commandedMilitary.id
      ? {
        id: data.commandedMilitary.id,
        name: data.commandedMilitary.name,
        isNavy: data.commandedMilitary.isNavy,
        rank: data.commandedMilitary.rank,
      }
      : undefined,
    relationships: data.relationships.map(r => ({
      type: r.type,
      characterId: r.id,
      characterName: r.name,
      portrait: mapPortraitPath(r.portrait),
      portraitLayers: mapPortraitLayers(r.portraitLayers),
      age: r.age,
      isAlive: r.isAlive,
    })),
    luxuryNeeds: data.luxuryNeeds.map(slot => ({
      name: slot.name,
      icon: WebkilnAssetPath(slot.icon) ?? slot.icon,
      required: slot.required,
      provided: slot.provided,
    })),
    isAlive: data.isAlive,
    isImprisoned: data.isImprisoned,
    imprisonedBy: data.imprisonedBy || undefined,
    imprisonedAt: data.imprisonmentSettlement || undefined,
    imprisonmentReason: data.imprisonmentReason || undefined,
    deathCause: data.deathCause || undefined,
  };
}

export function clearPersonCaches(): void {
  // Person bridge results are fetched on demand and are not retained here.
}

export function dispatchPersonData(data: GetPersonDataResponse): void {
  bridgeEvents.dispatchEvent(new CustomEvent('game.get_person_data', { detail: data }));
}

type PersonBridgeScope = 'full' | 'summary' | 'tooltip';

/**
 * Fetches a person's full record from the game bridge by PersonID.
 */
export function usePersonBridge(personId: string | null | undefined, scope: PersonBridgeScope = 'summary'): Character | null {
  const live = useBridgeQuery({
    action: 'game.get_person_data',
    payload: personId ? { personId, scope } : null,
    map: mapPerson,
    matchPush: (data) => !personId || data.id === personId,
    cacheResponseMs: scope === 'tooltip' ? 12_000 : 0,
  });

  if (live) return live;
  return null;
}

export function usePersonTooltipBridge(personId: string | null | undefined): Character | null {
  return usePersonBridge(personId, 'tooltip');
}

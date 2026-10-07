import { useBridgeQuery, useBridgeQueryState } from '../core/useBridgeQuery';
import { mapPortraitLayers, mapPortraitPath } from '../characters/portraitMapping';
import type { GetPlayerFactionResponse } from '../../bridge-types.generated.ts';
import type { Faction, PortraitLayerData } from '../../data/types';

export interface PlayerFactionSummary {
  id: string;
  name: string;
  colour: string;
  secondaryColour?: string;
  cultureGroup?: string;
  usesPowerBlocs: boolean;
  usesWarbands: boolean;
  usesRegionalForces: boolean;
  usesPatronage: boolean;
  hasImperialCourt: boolean;
  courtTitle?: string;
  usesAdministration: boolean;
  emblem?: string;
  religionId?: string;
  diplomaticStatus: Faction['diplomaticStatus'];
  subjectSubtype?: string;
  rulerId?: string;
  rulerName?: string;
  rulerPortrait?: string;
  rulerPortraitLayers?: PortraitLayerData;
  rulerIsAlive: boolean;
  rulerIsImprisoned: boolean;
}

export interface PlayerFactionSummaryBridgeState {
  summary: PlayerFactionSummary | null;
  pending: boolean;
}

function mapStatus(raw: string): Faction['diplomaticStatus'] {
  return raw === 'subject' ? 'subject' : 'neutral';
}

function mapPlayerFaction(data: GetPlayerFactionResponse): PlayerFactionSummary | null {
  if (!data.id) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    colour: data.colour,
    secondaryColour: data.secondaryColour || undefined,
    cultureGroup: data.cultureGroup || undefined,
    usesPowerBlocs: data.usesPowerBlocs,
    usesWarbands: data.usesWarbands,
    usesRegionalForces: data.usesRegionalForces,
    usesPatronage: data.usesPatronage,
    hasImperialCourt: data.hasImperialCourt,
    courtTitle: data.courtTitle || undefined,
    usesAdministration: data.usesAdministration,
    emblem: data.emblem || undefined,
    religionId: data.religionId || undefined,
    diplomaticStatus: mapStatus(data.diplomaticStatus),
    subjectSubtype: data.subjectSubtype || undefined,
    rulerId: data.rulerId || undefined,
    rulerName: data.rulerName || undefined,
    rulerPortrait: mapPortraitPath(data.rulerPortrait),
    rulerPortraitLayers: mapPortraitLayers(data.rulerPortraitLayers),
    rulerIsAlive: data.rulerIsAlive,
    rulerIsImprisoned: data.rulerIsImprisoned,
  };
}

export function usePlayerFactionSummaryBridge(suspend = false): PlayerFactionSummary | null {
  return useBridgeQuery({
    action: 'game.get_player_faction',
    suspend,
    map: mapPlayerFaction,
  });
}

export function usePlayerFactionSummaryBridgeState(suspend = false): PlayerFactionSummaryBridgeState {
  const query = useBridgeQueryState({
    action: 'game.get_player_faction',
    suspend,
    map: mapPlayerFaction,
  });

  return {
    summary: query.value,
    pending: query.pending,
  };
}

/** Resolves the local player's FactionID via the bridge. */
export function usePlayerFactionBridge(): string | null {
  return usePlayerFactionSummaryBridge()?.id ?? null;
}

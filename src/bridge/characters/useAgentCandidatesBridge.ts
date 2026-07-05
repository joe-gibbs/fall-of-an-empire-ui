import { useBridgeQuery } from '../core/useBridgeQuery';
import { mapPortraitLayers, mapPortraitPath } from './portraitMapping';
import type {
  GetAgentCandidatesResponse,
  AgentCandidate,
  AgentCandidateSuitability,
} from '../../bridge-types.generated.ts';
import type { Character, PersonActivity } from '../../data/types';

export interface AgentTargetFaction {
  id: string;
  name: string;
  colour: string;
  secondaryColour?: string;
  emblem?: string;
  cultureGroup?: string;
  /** Player faction's opinion of this target. */
  opinion: number;
  diplomaticStatus: 'ally' | 'rival' | 'neutral' | 'war' | 'subject';
}

export interface AgentCandidatesResult {
  candidates: AgentCandidateView[];
  factions: AgentTargetFaction[];
}

export interface AgentCandidateView {
  character: Character;
  suitability: AgentSuitability[];
}

export type AgentSuitability = AgentCandidateSuitability;

function parseStatus(raw: string): AgentTargetFaction['diplomaticStatus'] {
  switch (raw) {
    case 'ally': case 'rival': case 'war': case 'subject': return raw;
    default: return 'neutral';
  }
}

function mapCharacter(c: AgentCandidate): Character {
  return {
    id: c.id,
    name: c.name,
    title: c.title,
    shortTitle: c.title,
    age: c.age,
    portrait: mapPortraitPath(c.portrait),
    portraitLayers: mapPortraitLayers(c.portraitLayers),
    faction: '',
    culture: '',
    religion: '',
    stats: {
      tactics: 0,
      authority: c.authority,
      cunning: c.cunning,
      governance: c.governance,
      loyalty: c.loyalty,
      constitution: 0,
    },
    traits: c.traits.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.id,
      description: t.description,
      isPositive: t.isPositive,
    })),
    honourDread: 0,
    fame: c.fame,
    activity: c.activity as PersonActivity,
    roleExperience: {
      military: 0,
      administrative: 0,
      diplomatic: c.diplomaticXp,
      intrigue: c.intrigueXp,
    },
    compliance: 0,
    governedRegions: [],
    relationships: [],
    isAlive: true,
  };
}

function mapCandidate(c: AgentCandidate): AgentCandidateView {
  return {
    character: mapCharacter(c),
    suitability: c.suitability,
  };
}

function mapResponse(data: GetAgentCandidatesResponse): AgentCandidatesResult {
  return {
    candidates: data.candidates.map(mapCandidate),
    factions: data.foreignFactions.map(f => ({
      id: f.id,
      name: f.name,
      colour: f.colour,
      secondaryColour: f.secondaryColour || undefined,
      emblem: f.emblem || undefined,
      cultureGroup: f.cultureGroup || undefined,
      opinion: f.opinion,
      diplomaticStatus: parseStatus(f.diplomaticStatus),
    })),
  };
}

/**
 * Fetches the player's eligible candidates plus the foreign-faction list for
 * the agent-select modal. Null while loading or if the bridge is unavailable.
 */
export function useAgentCandidatesBridge(
  role: 'diplomat' | 'spy' | null,
  targetFactionId: string | null,
): AgentCandidatesResult | null {
  return useBridgeQuery({
    action: 'game.get_agent_candidates',
    payload: role && targetFactionId ? { role, targetFactionId } : null,
    map: mapResponse,
    matchPush: data => data.role === role && data.targetFactionId === targetFactionId,
  });
}

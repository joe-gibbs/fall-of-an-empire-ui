import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { mapPortraitLayers, mapPortraitPath } from '../characters/portraitMapping';
import type {
  GetDiocesesResponse,
  GetBishopCandidatesResponse,
  BishopCandidate,
  ReligionInfo,
} from '../../bridge-types.generated.ts';
import type { Character, PersonActivity } from '../../data/types';
import { WebkilnAssetPath } from '../../utils/assets';

export interface DioceseView {
  id: string;
  landKey: string;
  landName: string;
  bishopId: string | null;
  bishopName: string | null;
  bishopPortrait: string | null;
  authority: number;
  /** 0..1 fraction of the land's population following this religion. */
  followerPercent: number;
  /** Total religion followers in the Land (Population * share, summed). */
  followers: number;
  /** Total Land population across all factions. */
  landPopulation: number;
}

export interface OrganisedReligionView {
  info: ReligionInfo;
  key: string;
  name: string;
  clergyTitle: string;
  iconPath: string;
  colour: string;
  isPlayerReligion: boolean;
  canManage: boolean;
  leadingFactionName: string;
}

export interface ReligionDistributionSegment {
  key: string;
  name: string;
  colour: string;
  /** 0..1 share of the player's realm population. */
  share: number;
}

export interface DiocesesResult {
  religionInfo: ReligionInfo;
  religionKey: string;
  religionName: string;
  description: string;
  clergyTitle: string;
  iconPath: string;
  colour: string;
  canManage: boolean;
  leadingFactionName: string;
  autoAssignClergyEnabled: boolean;
  totalRealmPopulation: number;
  dioceses: DioceseView[];
  organisedReligions: OrganisedReligionView[];
  religionDistribution: ReligionDistributionSegment[];
}

function mapResponse(data: GetDiocesesResponse): DiocesesResult {
  return {
    religionInfo: data.religionInfo,
    religionKey: data.religionKey,
    religionName: data.religionName,
    description: data.description,
    clergyTitle: data.clergyTitle,
    iconPath: WebkilnAssetPath(data.iconPath) ?? '',
    colour: data.colour,
    canManage: data.canManage,
    leadingFactionName: data.leadingFactionName,
    autoAssignClergyEnabled: data.autoAssignClergyEnabled,
    totalRealmPopulation: data.totalRealmPopulation,
    organisedReligions: data.organisedReligions.map(r => ({
      info: r.info,
      key: r.key,
      name: r.name,
      clergyTitle: r.clergyTitle,
      iconPath: WebkilnAssetPath(r.iconPath) ?? '',
      colour: r.colour,
      isPlayerReligion: r.isPlayerReligion,
      canManage: r.canManage,
      leadingFactionName: r.leadingFactionName,
    })),
    dioceses: data.dioceses.map(d => ({
      id: d.landKey,
      landKey: d.landKey,
      landName: d.landName,
      bishopId: d.bishopId || null,
      bishopName: d.bishopName || null,
      bishopPortrait: null,
      authority: d.authority,
      followerPercent: d.religionShare,
      followers: d.followers,
      landPopulation: d.landPopulation,
    })),
    religionDistribution: data.religionDistribution.map(s => ({
      key: s.key,
      name: s.name,
      colour: s.colour,
      share: s.share,
    })),
  };
}

/**
 * Fetch the current dioceses + bishoprics for a religion. Passing `null` skips
 * the query; passing an empty string asks the backend for the player's
 * religion.
 */
export function useDiocesesBridge(religionKey: string | null): DiocesesResult | null {
  return useBridgeQuery({
    action: 'game.get_dioceses',
    payload: religionKey === null ? null : { religionKey },
    map: mapResponse,
  });
}

function mapCandidate(c: BishopCandidate): Character {
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
      tactics: c.tactics,
      authority: c.authority,
      cunning: c.cunning,
      governance: c.governance,
      loyalty: c.loyalty,
      constitution: c.constitution,
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
    roleExperience: { military: 0, administrative: 0, diplomatic: 0, intrigue: 0 },
    compliance: 0,
    governedRegions: [],
    relationships: [],
    isAlive: true,
  };
}

export function useBishopCandidatesBridge(religionKey: string | null): Character[] | null {
  return useBridgeQuery({
    action: 'game.get_bishop_candidates',
    payload: religionKey ? { religionKey } : null,
    map: (data: GetBishopCandidatesResponse) => data.candidates.map(mapCandidate),
  });
}

export async function appointBishop(religionKey: string, landKey: string, personId: string | null): Promise<boolean> {
  try {
    const response = await bridgeCall('game.appoint_bishop', {
      religionKey,
      landKey,
      personId: personId ?? '',
    });
    try {
      const fresh = await bridgeCall('game.get_dioceses', { religionKey });
      bridgeEvents.dispatchEvent(new CustomEvent('game.get_dioceses', { detail: fresh }));
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }
    return response.appointed || personId === null || personId === '';
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function setAutoAssignClergy(enabled: boolean, religionKey: string): Promise<void> {
  try {
    await bridgeCall('game.set_auto_assign_clergy', { enabled });
    try {
      const fresh = await bridgeCall('game.get_dioceses', { religionKey });
      bridgeEvents.dispatchEvent(new CustomEvent('game.get_dioceses', { detail: fresh }));
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }
  } catch (error) {
    acknowledgeBridgeFailure(error);
  }
}

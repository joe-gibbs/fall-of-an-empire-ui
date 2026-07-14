import { useRef } from 'react';
import { clearBridgeQueryCache, useBridgeQuery, useBridgeQueryState } from '../core/useBridgeQuery';
import type { GetCharacterListResponse } from '../../bridge-types.generated.ts';
import type { PortraitLayerData } from '../../data/types';

export interface CharacterListStats {
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
}

export interface CharacterListTrait {
  id: string;
  name: string;
}

export interface CharacterListEntry {
  id: string;
  name: string;
  portrait: string;
  portraitLayers?: PortraitLayerData;
  title: string;
  shortTitle: string;
  age: number;
  isAlive: boolean;
  isImprisoned: boolean;
  status: string;
  factionId: string;
  factionName: string;
  cultureId: string;
  culture: string;
  religionId: string;
  religion: string;
  activity: string;
  role: string;
  roleDetail: string;
  category: string;
  isPlayerCharacter: boolean;
  isHeir: boolean;
  canLeadProvince: boolean;
  hasCompliance: boolean;
  complianceTowardPlayer: number;
  fame: number;
  stats: CharacterListStats;
  traits: CharacterListTrait[];
}

export interface CharacterListData {
  factionId: string;
  factionName: string;
  rulerId: string;
  heirId: string;
  scope: CharacterListScope;
  characters: CharacterListEntry[];
}

export interface FamilyTreePerson {
  id: string;
  name: string;
  portrait: string;
  portraitLayers?: PortraitLayerData;
  title: string;
  shortTitle: string;
  age: number;
  isAlive: boolean;
  isImprisoned: boolean;
  gender: string;
  culture: string;
  religion: string;
  activity: string;
  role: string;
  relationToRuler: string;
  isFocus: boolean;
  isRuler: boolean;
  isHeir: boolean;
  isDesignatedHeir: boolean;
  isPreviousRuler: boolean;
  fame: number;
}

export interface FamilyTreeEdge {
  fromId: string;
  toId: string;
  type: string;
}

export interface FamilyTreePatronageLink {
  patronId: string;
  clientId: string;
  linkHealth: number;
  favourBalance: number;
  daysSinceLastInteraction: number;
  isInherited: boolean;
}

export interface FamilyTreeGroups {
  parents: string[];
  spouses: string[];
  children: string[];
  siblings: string[];
  grandchildren: string[];
  succession: string[];
  previousRulers: string[];
  otherRelatives: string[];
}

export interface FamilyTreeData {
  scope: FamilyTreeScope;
  focusPersonId: string;
  factionId: string;
  factionName: string;
  rulerId: string;
  heirId: string;
  designatedHeirId: string;
  patronageRootId: string;
  nodes: FamilyTreePerson[];
  edges: FamilyTreeEdge[];
  patronageNodes: FamilyTreePerson[];
  patronageLinks: FamilyTreePatronageLink[];
  groups: FamilyTreeGroups;
}

const familyTreeCache = new Map<string, FamilyTreeData>();
const DEFAULT_FAMILY_TREE_KEY = '';
export type FamilyTreeScope = 'lineage' | 'patronage' | 'succession' | 'history';
export type CharacterListScope = 'faction' | 'realm';
export type CharacterListRequestScope = CharacterListScope | 'default';

// The native character-list bridge emits compact arrays because realm-wide lists
// are large enough that repeated JSON object keys become a measurable cost.
type CharacterListCompactStats = [number, number, number, number, number, number];
type CharacterListCompactTrait = [string, string];
type CharacterListCompactEntry = [
  string,
  string,
  string,
  string,
  string,
  number,
  boolean,
  boolean,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  boolean,
  boolean,
  boolean,
  boolean,
  number,
  number,
  CharacterListCompactStats,
  string[],
];

type CharacterListRawTrait = CharacterListTrait | CharacterListCompactTrait;
type CharacterListRawEntry = (Omit<CharacterListEntry, 'traits'> & { traitIds?: string[] }) | CharacterListCompactEntry;
type CharacterListRawResponse = Omit<GetCharacterListResponse, 'characters' | 'traits'> & {
  characters: CharacterListRawEntry[];
  traits: CharacterListRawTrait[];
};

export function clearCharacterCaches(): void {
  familyTreeCache.clear();
  clearBridgeQueryCache('game.get_character_list');
  clearBridgeQueryCache('game.get_family_tree');
}

function mapCharacterListTrait(value: CharacterListRawTrait): CharacterListTrait {
  if (Array.isArray(value)) {
    return {
      id: value[0] ?? '',
      name: value[1] ?? '',
    };
  }
  return value;
}

function mapCompactStats(value: CharacterListCompactStats): CharacterListStats {
  return {
    tactics: value[0] ?? 0,
    authority: value[1] ?? 0,
    cunning: value[2] ?? 0,
    governance: value[3] ?? 0,
    loyalty: value[4] ?? 0,
    constitution: value[5] ?? 0,
  };
}

function mapCharacterListEntry(
  value: CharacterListRawEntry,
  traitMap: Map<string, CharacterListTrait>,
): CharacterListEntry {
  if (Array.isArray(value)) {
    const traitIds = value[26] ?? [];
    return {
      id: value[0] ?? '',
      name: value[1] ?? '',
      portrait: value[2] ?? '',
      title: value[3] ?? '',
      shortTitle: value[4] ?? '',
      age: value[5] ?? 0,
      isAlive: value[6] ?? false,
      isImprisoned: value[7] ?? false,
      status: value[8] ?? '',
      factionId: value[9] ?? '',
      factionName: value[10] ?? '',
      cultureId: value[11] ?? '',
      culture: value[12] ?? '',
      religionId: value[13] ?? '',
      religion: value[14] ?? '',
      activity: value[15] ?? '',
      role: value[16] ?? '',
      roleDetail: value[17] ?? '',
      category: value[18] ?? '',
      isPlayerCharacter: value[19] ?? false,
      isHeir: value[20] ?? false,
      canLeadProvince: value[21] ?? false,
      hasCompliance: value[22] ?? false,
      complianceTowardPlayer: value[23] ?? 0,
      fame: value[24] ?? 0,
      stats: mapCompactStats(value[25] ?? [0, 0, 0, 0, 0, 0]),
      traits: traitIds.map(id => traitMap.get(id) ?? { id, name: id }),
    };
  }

  const traitIds = value.traitIds ?? [];
  return {
    ...value,
    traits: traitIds.map(id => traitMap.get(id) ?? { id, name: id }),
  };
}

function mapCharacterList(value: GetCharacterListResponse): CharacterListData {
  const raw = value as unknown as CharacterListRawResponse;
  const traitMap = new Map(raw.traits.map(mapCharacterListTrait).map(trait => [trait.id, trait]));
  return {
    factionId: raw.factionId,
    factionName: raw.factionName,
    rulerId: raw.rulerId,
    heirId: raw.heirId,
    scope: raw.scope === 'realm' ? 'realm' : 'faction',
    characters: raw.characters.map(character => mapCharacterListEntry(character, traitMap)),
  };
}

function familyTreeCacheKey(personId: string | null | undefined, scope: FamilyTreeScope): string {
  return `${scope}:${personId ?? DEFAULT_FAMILY_TREE_KEY}`;
}

function normaliseFamilyTree(value: Omit<FamilyTreeData, 'scope'> & { scope: string }, scope: FamilyTreeScope): FamilyTreeData {
  return {
    ...value,
    scope: value.scope === 'patronage' || value.scope === 'succession' || value.scope === 'history'
      ? value.scope
      : scope,
  };
}

function cacheFamilyTree(value: Omit<FamilyTreeData, 'scope'> & { scope: string }, requestedPersonId: string | undefined, scope: FamilyTreeScope): FamilyTreeData {
  const mapped = normaliseFamilyTree(value, scope);
  const focusId = mapped.focusPersonId || mapped.rulerId || DEFAULT_FAMILY_TREE_KEY;
  familyTreeCache.set(familyTreeCacheKey(focusId, scope), mapped);
  if (requestedPersonId !== undefined) {
    familyTreeCache.set(familyTreeCacheKey(requestedPersonId, scope), mapped);
  }
  if (!requestedPersonId && focusId === mapped.rulerId && scope === 'lineage') {
    familyTreeCache.set(familyTreeCacheKey(DEFAULT_FAMILY_TREE_KEY, scope), mapped);
  }
  return mapped;
}

export function useCharacterListBridge(factionId: string | null | undefined, fetch = true, scope: CharacterListRequestScope = 'faction'): CharacterListData | null {
  const requestedFactionId = factionId ?? '';
  const resolvedDefaultScope = useRef<CharacterListScope | null>(null);
  const live = useBridgeQuery({
    action: 'game.get_character_list',
    payload: fetch && requestedFactionId ? { factionId: requestedFactionId, scope: scope === 'default' ? '' : scope } : null,
    cacheResponseMs: 5000,
    map: data => {
      const mapped = mapCharacterList(data);
      if (scope === 'default') {
        resolvedDefaultScope.current = mapped.scope;
      }
      return mapped;
    },
    matchPush: data => (data.factionId === requestedFactionId || data.factionName === requestedFactionId)
      && (data.scope === (scope === 'default' ? resolvedDefaultScope.current : scope)
        || (!data.scope && scope === 'faction')),
  });

  if (live) return live;
  return null;
}

export function useFamilyTreeBridge(personId?: string | null, scope: FamilyTreeScope = 'lineage', fetch = true): FamilyTreeData | null {
  const requestedPersonId = personId ?? DEFAULT_FAMILY_TREE_KEY;
  const requestedKey = familyTreeCacheKey(requestedPersonId, scope);
  const live = useBridgeQuery({
    action: 'game.get_family_tree',
    payload: fetch ? { personId: requestedPersonId, scope } : null,
    cacheResponseMs: 1500,
    map: data => cacheFamilyTree(data, requestedPersonId, scope),
    matchPush: data => {
      if (data.scope !== scope) return false;
      const focusId = data.focusPersonId || data.rulerId || DEFAULT_FAMILY_TREE_KEY;
      return requestedPersonId
        ? focusId === requestedPersonId
        : focusId === data.rulerId || focusId === DEFAULT_FAMILY_TREE_KEY;
    },
  });

  if (live) return live;
  return familyTreeCache.get(requestedKey) ?? null;
}

export interface FamilyTreeBridgeState {
  familyTree: FamilyTreeData | null;
  pending: boolean;
}

export function useFamilyTreeBridgeState(personId?: string | null, scope: FamilyTreeScope = 'lineage', fetch = true): FamilyTreeBridgeState {
  const requestedPersonId = personId ?? DEFAULT_FAMILY_TREE_KEY;
  const requestedKey = familyTreeCacheKey(requestedPersonId, scope);
  const cached = familyTreeCache.get(requestedKey) ?? null;
  const query = useBridgeQueryState({
    action: 'game.get_family_tree',
    payload: fetch ? { personId: requestedPersonId, scope } : null,
    cacheResponseMs: 1500,
    map: data => cacheFamilyTree(data, requestedPersonId, scope),
    matchPush: data => {
      if (data.scope !== scope) return false;
      const focusId = data.focusPersonId || data.rulerId || DEFAULT_FAMILY_TREE_KEY;
      return requestedPersonId
        ? focusId === requestedPersonId
        : focusId === data.rulerId || focusId === DEFAULT_FAMILY_TREE_KEY;
    },
  });

  return {
    familyTree: query.value ?? cached,
    pending: fetch && !cached && query.pending,
  };
}

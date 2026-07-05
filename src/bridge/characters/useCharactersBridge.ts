import { clearBridgeQueryCache, useBridgeQuery } from '../core/useBridgeQuery';
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
export type FamilyTreeScope = 'lineage' | 'patronage';

export function clearCharacterCaches(): void {
  familyTreeCache.clear();
  clearBridgeQueryCache('game.get_character_list');
  clearBridgeQueryCache('game.get_family_tree');
}

function mapCharacterList(value: GetCharacterListResponse): CharacterListData {
  return value;
}

function familyTreeCacheKey(personId: string | null | undefined, scope: FamilyTreeScope): string {
  return `${scope}:${personId ?? DEFAULT_FAMILY_TREE_KEY}`;
}

function normaliseFamilyTree(value: Omit<FamilyTreeData, 'scope'> & { scope: string }, scope: FamilyTreeScope): FamilyTreeData {
  return {
    ...value,
    scope: value.scope === 'patronage' ? 'patronage' : scope,
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

export function useCharacterListBridge(factionId: string | null | undefined, fetch = true): CharacterListData | null {
  const requestedFactionId = factionId ?? '';
  const live = useBridgeQuery({
    action: 'game.get_character_list',
    payload: fetch && requestedFactionId ? { factionId: requestedFactionId } : null,
    map: mapCharacterList,
    matchPush: data => data.factionId === requestedFactionId || data.factionName === requestedFactionId,
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

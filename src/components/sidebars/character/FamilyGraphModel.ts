import type { PortraitBadge } from '../../common/portraits/Portrait';
import type { Character, CharacterRelationship } from '../../../data/types';
import { formatRelationshipType } from '../../../utils/displayLabels';
import type { FamilyTreeData, FamilyTreePerson } from '../../../bridge/characters/useCharactersBridge';
import { webUIText } from '../../../localization/WebUITextContext';

export interface FamilyGraphEntry {
  id: string;
  name: string;
  label: string;
  portrait?: string;
  portraitLayers?: Character['portraitLayers'];
  isAlive?: boolean;
  isImprisoned?: boolean;
  isFocus?: boolean;
  badge?: PortraitBadge;
  activity?: string;
  commanderKind?: string;
  isPlayerCharacter?: boolean;
  isRuler?: boolean;
  isHeir?: boolean;
  isDesignatedHeir?: boolean;
  isPreviousRuler?: boolean;
  descendants?: FamilyGraphEntry[];
}

export interface FamilyGraphRow {
  id: string;
  title: string;
  entries: FamilyGraphEntry[];
  descendantTitle?: string;
}

export interface FamilyGraph {
  rows: FamilyGraphRow[];
  ids: Set<string>;
}

function addUnique(ids: string[], id: string): void {
  if (id && !ids.includes(id)) ids.push(id);
}

function sortPeopleByAge(ids: string[], people: Map<string, FamilyTreePerson>): string[] {
  return ids.slice().sort((a, b) => (people.get(b)?.age ?? 0) - (people.get(a)?.age ?? 0));
}

function familyBadgeForPerson(person: FamilyTreePerson, label: string, isFocus: boolean): PortraitBadge | undefined {
  if (person.isRuler) return 'ruler';
  if (person.isHeir || person.isDesignatedHeir) return 'heir';
  if (isFocus || ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Son', 'Daughter', 'Grandson', 'Granddaughter', 'Brother', 'Sister', 'Husband', 'Wife', 'Spouse'].includes(label)) return 'family';
  return undefined;
}

function familyBadgeForCharacter(character: Character): PortraitBadge {
  if (character.isRuler || character.activity === 'RulingFaction' || character.isPlayerCharacter) return 'ruler';
  if (character.isHeir || character.isDesignatedHeir) return 'heir';
  return 'family';
}

function familyEntryFromPerson(person: FamilyTreePerson, label: string, isFocus = false): FamilyGraphEntry {
  return {
    id: person.id,
    name: person.name,
    label,
    portrait: person.portrait,
    portraitLayers: person.portraitLayers,
    isAlive: person.isAlive,
    isImprisoned: person.isImprisoned,
    isFocus,
    badge: familyBadgeForPerson(person, label, isFocus),
    activity: person.activity,
    isRuler: person.isRuler,
    isHeir: person.isHeir,
    isDesignatedHeir: person.isDesignatedHeir,
    isPreviousRuler: person.isPreviousRuler,
  };
}

function familyEntryFromCharacter(character: Character): FamilyGraphEntry {
  return {
    id: character.id,
    name: character.name,
    get label() { return character.shortTitle || character.title || webUIText("CharacterSidebar.Selected"); },
    portrait: character.portrait,
    portraitLayers: character.portraitLayers,
    isAlive: character.isAlive,
    isImprisoned: character.isImprisoned,
    isFocus: true,
    badge: familyBadgeForCharacter(character),
    activity: character.activity,
    commanderKind: character.commanderKind,
    isPlayerCharacter: character.isPlayerCharacter,
    isRuler: character.isRuler,
    isHeir: character.isHeir,
    isDesignatedHeir: character.isDesignatedHeir,
  };
}

function familyEntryFromRelationship(rel: CharacterRelationship): FamilyGraphEntry {
  return {
    id: rel.characterId,
    name: rel.characterName,
    label: formatRelationshipType(rel.type),
    portrait: rel.portrait,
    portraitLayers: rel.portraitLayers,
    activity: 'InCourt',
    isRuler: rel.type === 'Ruler',
    isHeir: rel.type === 'Heir',
    isDesignatedHeir: rel.type === 'Designated Heir',
    badge: rel.type === 'Heir' || rel.type === 'Designated Heir'
      ? 'heir'
      : ['Father', 'Mother', 'Grandfather', 'Grandmother', 'GreatGrandfather', 'GreatGrandmother', 'Son', 'Daughter', 'Grandson', 'Granddaughter', 'GreatGrandson', 'GreatGranddaughter', 'Brother', 'Sister', 'Husband', 'Wife', 'Spouse', 'Consort'].includes(rel.type)
        ? 'family'
        : undefined,
  };
}

export function firstName(name: string): string {
  return name.trim().split(' ')[0] || name;
}

function genderedFamilyLabel(person: FamilyTreePerson | undefined, fallback: string): string {
  if (!person) return fallback;
  const female = person.gender === 'Female';
  switch (fallback) {
    case 'Parent': return webUIText(female ? 'Character.Relation.Mother' : 'Character.Relation.Father');
    case 'Grandparent': return webUIText(female ? 'Character.Relation.Grandmother' : 'Character.Relation.Grandfather');
    case 'Child': return webUIText(female ? 'Character.Relation.Daughter' : 'Character.Relation.Son');
    case 'Grandchild': return webUIText(female ? 'Character.Relation.Granddaughter' : 'Character.Relation.Grandson');
    case 'Sibling': return webUIText(female ? 'Character.Relation.Sister' : 'Character.Relation.Brother');
    case 'Spouse': return webUIText(female ? 'Character.Relation.Wife' : 'Character.Relation.Husband');
    default: return fallback;
  }
}

export function buildFamilyGraph(character: Character, familyTree: FamilyTreeData | null): FamilyGraph {
  const ids = new Set<string>();
  const rows: FamilyGraphRow[] = [];
  const pushRow = (id: string, title: string, entries: FamilyGraphEntry[], descendantTitle?: string) => {
    const uniqueEntries: FamilyGraphEntry[] = [];
    for (const entry of entries) {
      if (!entry.id || uniqueEntries.some(existing => existing.id === entry.id)) continue;
      uniqueEntries.push(entry);
      ids.add(entry.id);
      for (const descendant of entry.descendants ?? []) {
        if (descendant.id) ids.add(descendant.id);
      }
    }
    if (uniqueEntries.length > 0) rows.push({ id, title, entries: uniqueEntries, descendantTitle });
  };

  if (familyTree?.nodes.some(person => person.id === character.id)) {
    const people = new Map(familyTree.nodes.map(person => [person.id, person]));
    const parentsByChild = new Map<string, string[]>();
    const childrenByParent = new Map<string, string[]>();
    const spousesById = new Map<string, string[]>();

    for (const edge of familyTree.edges) {
      if (!people.has(edge.fromId) || !people.has(edge.toId)) continue;
      if (edge.type === 'parent') {
        const parents = parentsByChild.get(edge.toId) ?? [];
        addUnique(parents, edge.fromId);
        parentsByChild.set(edge.toId, parents);

        const children = childrenByParent.get(edge.fromId) ?? [];
        addUnique(children, edge.toId);
        childrenByParent.set(edge.fromId, children);
      } else if (edge.type === 'spouse') {
        const fromSpouses = spousesById.get(edge.fromId) ?? [];
        addUnique(fromSpouses, edge.toId);
        spousesById.set(edge.fromId, fromSpouses);

        const toSpouses = spousesById.get(edge.toId) ?? [];
        addUnique(toSpouses, edge.fromId);
        spousesById.set(edge.toId, toSpouses);
      }
    }

    const person = people.get(character.id);
    if (person) {
      const directLabel = (id: string, fallback: string): string => genderedFamilyLabel(people.get(id), fallback);
      const parentIds = sortPeopleByAge(parentsByChild.get(character.id) ?? [], people);
      const grandparentIds = sortPeopleByAge(parentIds.flatMap(id => parentsByChild.get(id) ?? []), people);
      const spouseIds = sortPeopleByAge(spousesById.get(character.id) ?? [], people);
      const childIds = sortPeopleByAge(childrenByParent.get(character.id) ?? [], people);

      pushRow('grandparents', 'Grandparents', grandparentIds.map(id => familyEntryFromPerson(people.get(id)!, directLabel(id, 'Grandparent'))));
      pushRow('parents', 'Parents', parentIds.map(id => familyEntryFromPerson(people.get(id)!, directLabel(id, 'Parent'))));
      const householdTitle = spouseIds.length > 1
        ? webUIText("CharacterSidebar.Spouses")
        : spouseIds.length === 1
          ? webUIText("CharacterSidebar.Spouse")
          : webUIText("CharacterSidebar.Selected");
      pushRow('household', householdTitle, [
        familyEntryFromPerson(person, person.shortTitle || person.title || 'Selected', true),
        ...spouseIds.map(id => familyEntryFromPerson(people.get(id)!, directLabel(id, 'Spouse'))),
      ]);
      pushRow('children', 'Children', childIds.map(id => {
        const entry = familyEntryFromPerson(people.get(id)!, directLabel(id, 'Child'));
        const descendants = sortPeopleByAge(childrenByParent.get(id) ?? [], people)
          .filter(descendantId => people.has(descendantId))
          .map(descendantId => familyEntryFromPerson(people.get(descendantId)!, directLabel(descendantId, 'Grandchild')));
        return descendants.length > 0 ? { ...entry, descendants } : entry;
      }), 'Grandchildren');

      return { rows, ids };
    }
  }

  const byType = (types: string[]) => character.relationships
    .filter(rel => types.includes(rel.type))
    .map(familyEntryFromRelationship);

  pushRow('grandparents', 'Grandparents', byType(['Grandfather', 'Grandmother', 'Grandparent']));
  pushRow('parents', 'Parents', byType(['Father', 'Mother', 'Parent']));
  const fallbackSpouses = byType(['Husband', 'Wife', 'Spouse', 'Consort']);
  const fallbackHouseholdTitle = fallbackSpouses.length > 1
    ? webUIText("CharacterSidebar.Spouses")
    : fallbackSpouses.length === 1
      ? webUIText("CharacterSidebar.Spouse")
      : webUIText("CharacterSidebar.Selected");
  pushRow('household', fallbackHouseholdTitle, [
    familyEntryFromCharacter(character),
    ...fallbackSpouses,
  ]);
  pushRow('children', 'Children', byType(['Son', 'Daughter', 'Child']));
  pushRow('grandchildren', 'Grandchildren', byType(['Grandson', 'Granddaughter', 'Grandchild']));

  return { rows, ids };
}

export function relationshipMatchesSearch(rel: CharacterRelationship, searchLower: string): boolean {
  if (!searchLower) return true;
  return rel.characterName.toLowerCase().includes(searchLower)
    || formatRelationshipType(rel.type).toLowerCase().includes(searchLower);
}

export function relationshipCardClass(type: string, canOpen: boolean): string {
  let className = 'char-rel-card';
  if (!canOpen) className += ' char-rel-card--static';
  if (type === 'Enemy' || type === 'Rival') return `${className} char-rel-card--hostile`;
  if (type === 'Patron' || type === 'Liege' || type === 'Client' || type === 'Ruler') return `${className} char-rel-card--patronage`;
  if (type === 'Friend') return `${className} char-rel-card--friendly`;
  return `${className} char-rel-card--family`;
}

export function relationshipTone(type: string): 'family' | 'patronage' | 'friendly' | 'hostile' {
  if (type === 'Enemy' || type === 'Rival') return 'hostile';
  if (type === 'Patron' || type === 'Liege' || type === 'Client' || type === 'Ruler') return 'patronage';
  if (type === 'Friend') return 'friendly';
  return 'family';
}

export function relationshipTypeTitle(type: string): string {
  return formatRelationshipType(type);
}

export function relationshipBadgeForType(type: string, related: Character | null): PortraitBadge | undefined {
  if (type === 'Ruler' || related?.isRuler || related?.activity === 'RulingFaction' || related?.isPlayerCharacter) return 'ruler';
  if (type === 'Heir' || type === 'Designated Heir' || related?.isHeir || related?.isDesignatedHeir) return 'heir';
  if (['Father', 'Mother', 'Grandfather', 'Grandmother', 'GreatGrandfather', 'GreatGrandmother', 'Son', 'Daughter', 'Grandson', 'Granddaughter', 'GreatGrandson', 'GreatGranddaughter', 'Brother', 'Sister', 'Husband', 'Wife', 'Spouse', 'Consort', 'Kinsman', 'Kinswoman', 'Relative', 'Kin'].includes(type) || related?.isFamilyOfPlayer) return 'family';
  return undefined;
}


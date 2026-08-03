import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Portrait, { type PortraitBadge } from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import ZoomPanCanvas, { type ZoomPanInitialView, type ZoomPanMetrics, type ZoomPanPoint } from '../../common/layout/scrolling/ZoomPanCanvas';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import { useGameActions } from '../../../context/GameContext';
import {
  useFamilyTreeBridge,
  type FamilyTreeData,
  type FamilyTreePatronageLink,
  type FamilyTreePerson,
} from '../../../bridge/characters/useCharactersBridge';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { designRem, designUnitScale } from '../../../utils/cssUnits';
import { formatNumber } from '../../../utils/numberFormat';
import './FamilyTreeScreen.css';

import { webUIText } from '../../../localization/WebUITextContext';
type FamilyTreeMode = 'tree' | 'patronage';

const NODE_SIZE = 92;
const NODE_TOTAL_HEIGHT = 132;
const SPOUSE_GAP = 26;
const HORIZONTAL_GAP = 68;
const ROOT_GAP = 126;
const LINE_STUB = 22;
const ROW_STEP = NODE_TOTAL_HEIGHT + LINE_STUB * 3;
const MIN_ZOOM = 0.52;
const MAX_ZOOM = 2;
const FIT_MARGIN = 76;
const PARENT_LINE = 'rgba(201, 168, 76, 0.58)';
const SPOUSE_LINE = 'rgba(201, 168, 76, 0.78)';
const PATRONAGE_NODE_WIDTH = 108;
const PATRONAGE_NODE_HEIGHT = 112;
const PATRONAGE_HORIZONTAL_GAP = 68;
const PATRONAGE_ROOT_GAP = 104;
const PATRONAGE_ROW_STEP = 162;
const PATRONAGE_LINE_STUB = 22;
const PATRONAGE_TRUNK_LINE = 'rgba(231, 226, 202, 0.54)';
const TREE_NODE_DOUBLE_CLICK_MS = 340;

interface PositionedPerson {
  person: FamilyTreePerson;
  x: number;
  y: number;
}

interface PatronagePositionedPerson extends PositionedPerson {
  linkToPatron: FamilyTreePatronageLink | null;
  isFocus: boolean;
}

interface TreeNode {
  person: FamilyTreePerson;
  spouse: FamilyTreePerson | null;
  children: TreeNode[];
  x: number;
  y: number;
  familyWidth: number;
  subtreeWidth: number;
}

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colour: string;
  thickness: number;
}

interface SpouseFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface TreeLayout {
  people: PositionedPerson[];
  lines: LineSegment[];
  spouseFrames: SpouseFrame[];
  bounds: Bounds;
  viewBox: Bounds;
}

interface RenderedTreeLayout<TNode extends PositionedPerson> {
  people: TNode[];
  lines: LineSegment[];
  spouseFrames?: SpouseFrame[];
  bounds: Bounds;
  viewBox: Bounds;
}

interface PatronageTreeNode {
  person: FamilyTreePerson;
  children: PatronageTreeNode[];
  linkToPatron: FamilyTreePatronageLink | null;
  x: number;
  y: number;
  subtreeWidth: number;
}

type PatronageLayout = RenderedTreeLayout<PatronagePositionedPerson>;

function emptyBounds(): Bounds {
  return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
}

function normaliseBounds(minX: number, minY: number, maxX: number, maxY: number): Bounds {
  const safeMinX = Number.isFinite(minX) ? minX : 0;
  const safeMinY = Number.isFinite(minY) ? minY : 0;
  const safeMaxX = Number.isFinite(maxX) ? maxX : safeMinX + 1;
  const safeMaxY = Number.isFinite(maxY) ? maxY : safeMinY + 1;
  return {
    minX: safeMinX,
    minY: safeMinY,
    maxX: Math.max(safeMinX + 1, safeMaxX),
    maxY: Math.max(safeMinY + 1, safeMaxY),
    width: Math.max(1, safeMaxX - safeMinX),
    height: Math.max(1, safeMaxY - safeMinY),
  };
}

function unique(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function addToMapList(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function lineageNodeIds(data: FamilyTreeData | null): Set<string> {
  const result = new Set<string>();
  if (!data || data.nodes.length === 0) return result;

  const nodeIds = new Set(data.nodes.map(person => person.id));
  const focusId = data.focusPersonId && nodeIds.has(data.focusPersonId)
    ? data.focusPersonId
    : data.rulerId && nodeIds.has(data.rulerId)
      ? data.rulerId
      : data.nodes.find(person => person.isFocus)?.id ?? data.nodes.find(person => person.isRuler)?.id ?? data.nodes[0].id;

  if (!focusId) return result;

  const neighbours = new Map<string, string[]>();
  for (const edge of data.edges) {
    if (edge.type !== 'parent' && edge.type !== 'spouse') continue;
    if (!nodeIds.has(edge.fromId) || !nodeIds.has(edge.toId)) continue;
    addToMapList(neighbours, edge.fromId, edge.toId);
    addToMapList(neighbours, edge.toId, edge.fromId);
  }

  const queue = [focusId];
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    if (!id || result.has(id)) continue;

    result.add(id);
    for (const nextId of neighbours.get(id) ?? []) {
      if (!result.has(nextId)) queue.push(nextId);
    }
  }

  return result;
}

function filterLineageData(data: FamilyTreeData | null): FamilyTreeData | null {
  if (!data) return null;

  const visibleIds = lineageNodeIds(data);
  if (visibleIds.size === data.nodes.length) return data;

  return {
    ...data,
    nodes: data.nodes.filter(person => visibleIds.has(person.id)),
    edges: data.edges.filter(edge => visibleIds.has(edge.fromId) && visibleIds.has(edge.toId)),
    groups: {
      parents: data.groups.parents.filter(id => visibleIds.has(id)),
      spouses: data.groups.spouses.filter(id => visibleIds.has(id)),
      children: data.groups.children.filter(id => visibleIds.has(id)),
      siblings: data.groups.siblings.filter(id => visibleIds.has(id)),
      grandchildren: data.groups.grandchildren.filter(id => visibleIds.has(id)),
      succession: data.groups.succession.filter(id => visibleIds.has(id)),
      previousRulers: data.groups.previousRulers.filter(id => visibleIds.has(id)),
      otherRelatives: data.groups.otherRelatives.filter(id => visibleIds.has(id)),
    },
  };
}

function relationLabel(person: FamilyTreePerson): string {
  if (person.isFocus && !person.isRuler) return person.shortTitle || person.title || person.relationToRuler || webUIText("CharacterSidebar.Selected");
  if (person.isRuler) return webUIText("Auto.Return.componentsscreensFamilyTreeScreen.152.1");
  if (person.isDesignatedHeir) return webUIText("Auto.Return.componentsscreensFamilyTreeScreen.153.1");
  if (person.isHeir) return webUIText("Auto.Return.componentsscreensFamilyTreeScreen.154.1");
  return person.shortTitle || person.title || person.relationToRuler || person.role || (person.gender === 'Female' ? webUIText("FamilyTree.Kinswoman") : webUIText("FamilyTree.Kinsman"));
}

function nodeClass(person: FamilyTreePerson, selectedId: string | null): string {
  let className = 'ft-node';
  if (person.id === selectedId) className += ' ft-selected';
  if (person.isFocus) className += ' ft-focus';
  if (!person.isAlive) className += ' ft-dead';
  if (person.isRuler) className += ' ft-ruler';
  if (person.isHeir || person.isDesignatedHeir) className += ' ft-heir';
  if (person.isPreviousRuler) className += ' ft-previous';
  if (person.isImprisoned && person.isAlive) className += ' ft-imprisoned';
  return className;
}

function portraitBadgeForTreePerson(person: FamilyTreePerson): PortraitBadge | undefined {
  if (person.isRuler) return 'ruler';
  if (person.isHeir || person.isDesignatedHeir) return 'heir';
  if (person.isFocus || person.relationToRuler) return 'family';
  return undefined;
}

function findBestSpouse(
  personId: string,
  spouseIds: string[],
  childrenByParent: Map<string, string[]>,
  nodeMap: Map<string, FamilyTreePerson>,
  consumed: Set<string>,
): string | null {
  const candidates = spouseIds.filter(id => nodeMap.has(id) && !consumed.has(id));
  if (candidates.length === 0) return null;

  const ownChildren = new Set(childrenByParent.get(personId) ?? []);
  candidates.sort((a, b) => {
    const sharedA = (childrenByParent.get(a) ?? []).filter(id => ownChildren.has(id)).length;
    const sharedB = (childrenByParent.get(b) ?? []).filter(id => ownChildren.has(id)).length;
    if (sharedA !== sharedB) return sharedB - sharedA;
    return (nodeMap.get(b)?.age ?? 0) - (nodeMap.get(a)?.age ?? 0);
  });
  return candidates[0] ?? null;
}

function descendantsCount(id: string, childrenByParent: Map<string, string[]>, seen = new Set<string>()): number {
  if (seen.has(id)) return 0;
  seen.add(id);
  let total = 0;
  for (const childId of childrenByParent.get(id) ?? []) {
    total += 1 + descendantsCount(childId, childrenByParent, seen);
  }
  return total;
}

function measureTree(node: TreeNode): number {
  const childWidth = node.children.reduce((total, child, index) => (
    total + measureTree(child) + (index > 0 ? HORIZONTAL_GAP : 0)
  ), 0);
  node.familyWidth = node.spouse ? NODE_SIZE * 2 + SPOUSE_GAP : NODE_SIZE;
  node.subtreeWidth = Math.max(node.familyWidth, childWidth);
  return node.subtreeWidth;
}

function placeTree(node: TreeNode, left: number, y: number): void {
  const childWidth = node.children.reduce((total, child, index) => (
    total + child.subtreeWidth + (index > 0 ? HORIZONTAL_GAP : 0)
  ), 0);

  node.x = left + (node.subtreeWidth - node.familyWidth) / 2;
  node.y = y;

  let childLeft = left + Math.max(0, (node.subtreeWidth - childWidth) / 2);
  for (const child of node.children) {
    placeTree(child, childLeft, y + ROW_STEP);
    childLeft += child.subtreeWidth + HORIZONTAL_GAP;
  }
}

function collectTree(
  node: TreeNode,
  people: PositionedPerson[],
  lines: LineSegment[],
  spouseFrames: SpouseFrame[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): void {
  const primaryX = node.x;
  const spouseX = node.spouse ? node.x + NODE_SIZE + SPOUSE_GAP : 0;
  people.push({ person: node.person, x: primaryX, y: node.y });
  bounds.minX = Math.min(bounds.minX, primaryX);
  bounds.minY = Math.min(bounds.minY, node.y);
  bounds.maxX = Math.max(bounds.maxX, primaryX + NODE_SIZE);
  bounds.maxY = Math.max(bounds.maxY, node.y + NODE_TOTAL_HEIGHT);

  if (node.spouse) {
    people.push({ person: node.spouse, x: spouseX, y: node.y });
    spouseFrames.push({
      left: primaryX - 4,
      top: node.y - 3,
      width: NODE_SIZE * 2 + SPOUSE_GAP + 8,
      height: NODE_SIZE + 8,
    });
    bounds.maxX = Math.max(bounds.maxX, spouseX + NODE_SIZE);
  }

  if (node.children.length > 0) {
    const parentBottomX = primaryX + NODE_SIZE / 2;
    const parentBottomY = node.y + NODE_TOTAL_HEIGHT;
    let joinX = parentBottomX;
    const joinY = parentBottomY + LINE_STUB;
    lines.push({ x1: parentBottomX, y1: parentBottomY, x2: parentBottomX, y2: joinY, colour: PARENT_LINE, thickness: 2 });

    if (node.spouse) {
      const spouseBottomX = spouseX + NODE_SIZE / 2;
      lines.push({ x1: spouseBottomX, y1: parentBottomY, x2: spouseBottomX, y2: joinY, colour: SPOUSE_LINE, thickness: 2 });
      lines.push({ x1: parentBottomX, y1: joinY, x2: spouseBottomX, y2: joinY, colour: SPOUSE_LINE, thickness: 2 });
      joinX = (parentBottomX + spouseBottomX) / 2;
    }

    const childTops = node.children.map(child => ({
      x: child.x + NODE_SIZE / 2,
      y: child.y,
    }));
    const childLineY = childTops[0].y - LINE_STUB;
    const leftChildX = Math.min(...childTops.map(child => child.x));
    const rightChildX = Math.max(...childTops.map(child => child.x));

    lines.push({ x1: joinX, y1: joinY, x2: joinX, y2: childLineY, colour: PARENT_LINE, thickness: 2 });
    if (childTops.length > 1) {
      lines.push({ x1: leftChildX, y1: childLineY, x2: rightChildX, y2: childLineY, colour: PARENT_LINE, thickness: 2 });
    }
    for (const child of childTops) {
      lines.push({ x1: child.x, y1: childLineY, x2: child.x, y2: child.y, colour: PARENT_LINE, thickness: 2 });
    }
  }

  for (const child of node.children) {
    collectTree(child, people, lines, spouseFrames, bounds);
  }
}

function buildTreeLayout(data: FamilyTreeData | null): TreeLayout {
  if (!data || data.nodes.length === 0) {
    const bounds = emptyBounds();
    return { people: [], lines: [], spouseFrames: [], bounds, viewBox: bounds };
  }

  const nodeMap = new Map(data.nodes.map(person => [person.id, person]));
  const childrenByParent = new Map<string, string[]>();
  const parentsByChild = new Map<string, string[]>();
  const spousesById = new Map<string, string[]>();

  for (const edge of data.edges) {
    if (!nodeMap.has(edge.fromId) || !nodeMap.has(edge.toId)) continue;
    if (edge.type === 'parent') {
      addToMapList(childrenByParent, edge.fromId, edge.toId);
      addToMapList(parentsByChild, edge.toId, edge.fromId);
    } else if (edge.type === 'spouse') {
      addToMapList(spousesById, edge.fromId, edge.toId);
      addToMapList(spousesById, edge.toId, edge.fromId);
    }
  }

  for (const [parentId, children] of childrenByParent) {
    childrenByParent.set(parentId, unique(children).sort((a, b) => (nodeMap.get(b)?.age ?? 0) - (nodeMap.get(a)?.age ?? 0)));
  }

  const consumed = new Set<string>();
  const buildSubtree = (id: string, path: Set<string>): TreeNode | null => {
    const person = nodeMap.get(id);
    if (!person || path.has(id)) return null;

    const nextPath = new Set(path);
    nextPath.add(id);
    consumed.add(id);

    const spouseId = findBestSpouse(id, spousesById.get(id) ?? [], childrenByParent, nodeMap, consumed);
    const spouse = spouseId ? nodeMap.get(spouseId) ?? null : null;
    if (spouseId) {
      nextPath.add(spouseId);
      consumed.add(spouseId);
    }

    const childIds = unique([
      ...(childrenByParent.get(id) ?? []),
      ...(spouseId ? childrenByParent.get(spouseId) ?? [] : []),
    ]);
    const children = childIds
      .filter(childId => !nextPath.has(childId))
      .map(childId => buildSubtree(childId, nextPath))
      .filter((child): child is TreeNode => child !== null);

    return {
      person,
      spouse,
      children,
      x: 0,
      y: 0,
      familyWidth: 0,
      subtreeWidth: 0,
    };
  };

  const rootIds = data.nodes
    .map(person => person.id)
    .filter(id => (parentsByChild.get(id)?.length ?? 0) === 0);
  const preferredRoots = rootIds.length > 0 ? rootIds : [data.rulerId || data.nodes[0].id];
  preferredRoots.sort((a, b) => {
    const descendantsDelta = descendantsCount(b, childrenByParent) - descendantsCount(a, childrenByParent);
    if (descendantsDelta !== 0) return descendantsDelta;
    return (nodeMap.get(b)?.age ?? 0) - (nodeMap.get(a)?.age ?? 0);
  });

  const roots: TreeNode[] = [];
  for (const id of preferredRoots) {
    if (consumed.has(id)) continue;
    const root = buildSubtree(id, new Set<string>());
    if (root) roots.push(root);
  }
  for (const person of data.nodes) {
    if (consumed.has(person.id)) continue;
    const root = buildSubtree(person.id, new Set<string>());
    if (root) roots.push(root);
  }

  let cursor = 0;
  for (const root of roots) {
    measureTree(root);
    placeTree(root, cursor, 0);
    cursor += root.subtreeWidth + ROOT_GAP;
  }

  const people: PositionedPerson[] = [];
  const lines: LineSegment[] = [];
  const spouseFrames: SpouseFrame[] = [];
  const rawBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const root of roots) {
    collectTree(root, people, lines, spouseFrames, rawBounds);
  }

  const lineBounds = lines.reduce((bounds, line) => ({
    minX: Math.min(bounds.minX, line.x1, line.x2),
    minY: Math.min(bounds.minY, line.y1, line.y2),
    maxX: Math.max(bounds.maxX, line.x1, line.x2),
    maxY: Math.max(bounds.maxY, line.y1, line.y2),
  }), rawBounds);

  const bounds = normaliseBounds(rawBounds.minX, rawBounds.minY, rawBounds.maxX, rawBounds.maxY);
  const viewBox = normaliseBounds(lineBounds.minX - 24, lineBounds.minY - 24, lineBounds.maxX + 24, lineBounds.maxY + 24);
  return { people, lines, spouseFrames, bounds, viewBox };
}

function patronageLineColour(link: FamilyTreePatronageLink | null): string {
  const health = link?.linkHealth ?? 1;
  if (health < 0.3) return 'rgba(179, 55, 45, 0.86)';
  if (health < 0.6) return 'rgba(212, 169, 73, 0.82)';
  return 'rgba(96, 166, 96, 0.78)';
}

function patronageLineThickness(link: FamilyTreePatronageLink | null): number {
  const health = link?.linkHealth ?? 1;
  if (health < 0.3) return 4;
  if (health < 0.6) return 3;
  return 2;
}

function patronageStatus(link: FamilyTreePatronageLink | null): string {
  if (!link) return webUIText("Auto.Return.componentsscreensFamilyTreeScreen.418.1");

  const health = Math.round(Math.max(0, Math.min(1, link.linkHealth)) * 100);
  return webUIText("Auto.Return.componentsscreensFamilyTreeScreen.421.1", { Health: health });
}

function patronageNodeClass(node: PatronagePositionedPerson, selectedId: string | null): string {
  let className = 'ft-patron-node';
  if (node.person.id === selectedId) className += ' ft-selected';
  if (node.isFocus) className += ' ft-patron-focus';
  if (!node.person.isAlive) className += ' ft-dead';
  if ((node.linkToPatron?.linkHealth ?? 1) < 0.3) className += ' ft-patron-at-risk';
  if (node.linkToPatron?.isInherited) className += ' ft-patron-inherited';
  return className;
}

function measurePatronageTree(node: PatronageTreeNode): number {
  const childWidth = node.children.reduce((total, child, index) => (
    total + measurePatronageTree(child) + (index > 0 ? PATRONAGE_HORIZONTAL_GAP : 0)
  ), 0);
  node.subtreeWidth = Math.max(PATRONAGE_NODE_WIDTH, childWidth);
  return node.subtreeWidth;
}

function placePatronageTree(node: PatronageTreeNode, left: number, y: number): void {
  const childWidth = node.children.reduce((total, child, index) => (
    total + child.subtreeWidth + (index > 0 ? PATRONAGE_HORIZONTAL_GAP : 0)
  ), 0);

  node.x = left + (node.subtreeWidth - PATRONAGE_NODE_WIDTH) / 2;
  node.y = y;

  let childLeft = left + Math.max(0, (node.subtreeWidth - childWidth) / 2);
  for (const child of node.children) {
    placePatronageTree(child, childLeft, y + PATRONAGE_ROW_STEP);
    childLeft += child.subtreeWidth + PATRONAGE_HORIZONTAL_GAP;
  }
}

function collectPatronageTree(
  node: PatronageTreeNode,
  focusId: string,
  people: PatronagePositionedPerson[],
  lines: LineSegment[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): void {
  people.push({
    person: node.person,
    x: node.x,
    y: node.y,
    linkToPatron: node.linkToPatron,
    isFocus: node.person.id === focusId,
  });
  bounds.minX = Math.min(bounds.minX, node.x);
  bounds.minY = Math.min(bounds.minY, node.y);
  bounds.maxX = Math.max(bounds.maxX, node.x + PATRONAGE_NODE_WIDTH);
  bounds.maxY = Math.max(bounds.maxY, node.y + PATRONAGE_NODE_HEIGHT);

  if (node.children.length > 0) {
    const parentBottomX = node.x + PATRONAGE_NODE_WIDTH / 2;
    const parentBottomY = node.y + PATRONAGE_NODE_HEIGHT;
    const joinY = parentBottomY + PATRONAGE_LINE_STUB;
    lines.push({ x1: parentBottomX, y1: parentBottomY, x2: parentBottomX, y2: joinY, colour: PATRONAGE_TRUNK_LINE, thickness: 2 });

    const childTops = node.children.map(child => ({
      x: child.x + PATRONAGE_NODE_WIDTH / 2,
      y: child.y,
      link: child.linkToPatron,
    }));
    const childLineY = childTops[0].y - PATRONAGE_LINE_STUB;
    const leftChildX = Math.min(...childTops.map(child => child.x));
    const rightChildX = Math.max(...childTops.map(child => child.x));

    lines.push({ x1: parentBottomX, y1: joinY, x2: parentBottomX, y2: childLineY, colour: PATRONAGE_TRUNK_LINE, thickness: 2 });
    if (childTops.length > 1) {
      lines.push({ x1: leftChildX, y1: childLineY, x2: rightChildX, y2: childLineY, colour: PATRONAGE_TRUNK_LINE, thickness: 2 });
    }
    for (const child of childTops) {
      lines.push({
        x1: child.x,
        y1: childLineY,
        x2: child.x,
        y2: child.y,
        colour: patronageLineColour(child.link),
        thickness: patronageLineThickness(child.link),
      });
    }
  }

  for (const child of node.children) {
    collectPatronageTree(child, focusId, people, lines, bounds);
  }
}

function buildPatronageLayout(data: FamilyTreeData | null): PatronageLayout {
  const nodes = data?.patronageNodes ?? [];
  if (nodes.length === 0) {
    const bounds = emptyBounds();
    return { people: [], lines: [], bounds, viewBox: bounds };
  }

  const nodeMap = new Map(nodes.map(person => [person.id, person]));
  const linksByPatron = new Map<string, FamilyTreePatronageLink[]>();
  const clientIds = new Set<string>();
  for (const link of data?.patronageLinks ?? []) {
    if (!nodeMap.has(link.patronId) || !nodeMap.has(link.clientId)) continue;
    clientIds.add(link.clientId);
    const list = linksByPatron.get(link.patronId);
    if (list) list.push(link);
    else linksByPatron.set(link.patronId, [link]);
  }

  for (const entry of linksByPatron) {
    linksByPatron.set(entry[0], entry[1].slice().sort((a, b) => {
      const personA = nodeMap.get(a.clientId);
      const personB = nodeMap.get(b.clientId);
      if ((personA?.isRuler ?? false) !== (personB?.isRuler ?? false)) return personA?.isRuler ? -1 : 1;
      if ((personA?.isHeir ?? false) !== (personB?.isHeir ?? false)) return personA?.isHeir ? -1 : 1;
      const fameDelta = (personB?.fame ?? 0) - (personA?.fame ?? 0);
      if (fameDelta !== 0) return fameDelta;
      return (personB?.age ?? 0) - (personA?.age ?? 0);
    }));
  }

  const visited = new Set<string>();
  const buildSubtree = (id: string, linkToPatron: FamilyTreePatronageLink | null, path: Set<string>): PatronageTreeNode | null => {
    const person = nodeMap.get(id);
    if (!person || path.has(id) || visited.has(id)) return null;

    visited.add(id);
    const nextPath = new Set(path);
    nextPath.add(id);
    const children = (linksByPatron.get(id) ?? [])
      .map(link => buildSubtree(link.clientId, link, nextPath))
      .filter((child): child is PatronageTreeNode => child !== null);

    return {
      person,
      children,
      linkToPatron,
      x: 0,
      y: 0,
      subtreeWidth: 0,
    };
  };

  const rootIds: string[] = [];
  const preferredRootId = data?.patronageRootId || data?.rulerId || nodes[0].id;
  if (preferredRootId && nodeMap.has(preferredRootId)) rootIds.push(preferredRootId);
  for (const person of nodes) {
    if (!clientIds.has(person.id) && !rootIds.includes(person.id)) rootIds.push(person.id);
  }
  for (const person of nodes) {
    if (!rootIds.includes(person.id)) rootIds.push(person.id);
  }

  const roots: PatronageTreeNode[] = [];
  for (const id of rootIds) {
    const root = buildSubtree(id, null, new Set<string>());
    if (root) roots.push(root);
  }

  let cursor = 0;
  for (const root of roots) {
    measurePatronageTree(root);
    placePatronageTree(root, cursor, 0);
    cursor += root.subtreeWidth + PATRONAGE_ROOT_GAP;
  }

  const focusId = data?.focusPersonId || data?.rulerId || '';
  const people: PatronagePositionedPerson[] = [];
  const lines: LineSegment[] = [];
  const rawBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const root of roots) {
    collectPatronageTree(root, focusId, people, lines, rawBounds);
  }

  const lineBounds = lines.reduce((bounds, line) => ({
    minX: Math.min(bounds.minX, line.x1, line.x2),
    minY: Math.min(bounds.minY, line.y1, line.y2),
    maxX: Math.max(bounds.maxX, line.x1, line.x2),
    maxY: Math.max(bounds.maxY, line.y1, line.y2),
  }), rawBounds);

  const bounds = normaliseBounds(rawBounds.minX, rawBounds.minY, rawBounds.maxX, rawBounds.maxY);
  const viewBox = normaliseBounds(lineBounds.minX - 36, lineBounds.minY - 36, lineBounds.maxX + 36, lineBounds.maxY + 36);
  return { people, lines, bounds, viewBox };
}

function FamilyNodeView({
  node,
  selectedId,
  onOpen,
}: {
  node: PositionedPerson;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  const person = node.person;
  const deceasedText = webUIText("Common.Deceased");
  const title = relationLabel(person);
  const ageLabel = person.age > 0 ? formatNumber(person.age) : '';

  return (
    <button
      type="button"
      className={nodeClass(person, selectedId)}
      data-id={person.id}
      style={{ left: designRem(node.x), top: designRem(node.y), width: designRem(NODE_SIZE) }}
      onClick={event => {
        if (event.detail === 0) onOpen(person.id);
      }}
      aria-label={person.isAlive ? person.name : `${person.name}, ${deceasedText}`}
    >
      <PersonTooltip characterId={person.id} position="right" delay={150}>
        <div className="ft-portrait-frame">
          <Portrait
            personId={person.id}
            src={person.portrait}
            layers={person.portraitLayers}
            resolvePerson={false}
            isAlive={person.isAlive}
            isImprisoned={person.isImprisoned}
            badge={portraitBadgeForTreePerson(person)}
            name={person.name}
            size="xl"
            shape="rect"
            showBorder
            activity={person.activity}
            isRuler={person.isRuler}
            isHeir={person.isHeir}
            isDesignatedHeir={person.isDesignatedHeir}
            isPreviousRuler={person.isPreviousRuler}
          />
          {!person.isAlive && (
            <span className="ft-dead-marker">
              <img src="/assets/icons/I_Skull.png" alt="" draggable={false} />
            </span>
          )}
        </div>
      </PersonTooltip>
      <span className="ft-node-label">
        <span className="ft-node-name">{person.name}</span>
        <span className="ft-node-title">
          <span>{title}</span>
          {ageLabel && <span className="ft-node-title-age">{ageLabel}</span>}
        </span>
      </span>
    </button>
  );
}

function nodeIdFromTarget(target: EventTarget | null): string | null {
  let element = target as HTMLElement | null;
  while (element) {
    const className = typeof element.className === 'string' ? element.className : '';
    const classes = className.split(' ');
    if (classes.includes('ft-node') || classes.includes('ft-patron-node')) {
      return element.getAttribute('data-id') || null;
    }
    element = element.parentElement;
  }
  return null;
}

function buildTreeInitialView<TNode extends PositionedPerson>(layout: RenderedTreeLayout<TNode>): ZoomPanInitialView {
  return (metrics: ZoomPanMetrics) => {
    const unitScale = designUnitScale();
    const boundsWidth = layout.bounds.width * unitScale;
    const boundsHeight = layout.bounds.height * unitScale;
    const fitMargin = FIT_MARGIN * unitScale;
    const usableWidth = Math.max(metrics.viewportWidth * 0.35, metrics.viewportWidth - fitMargin);
    const usableHeight = Math.max(metrics.viewportHeight * 0.35, metrics.viewportHeight - fitMargin);
    const zoom = Math.max(
      MIN_ZOOM,
      Math.min(
        MAX_ZOOM,
        Math.min(usableWidth / boundsWidth, usableHeight / boundsHeight),
      ),
    );
    const centerX = ((layout.bounds.minX + layout.bounds.maxX) / 2) * unitScale;
    const centerY = ((layout.bounds.minY + layout.bounds.maxY) / 2) * unitScale;

    return {
      zoom,
      panX: metrics.viewportWidth / 2 - centerX * zoom,
      panY: metrics.viewportHeight / 2 - centerY * zoom,
    };
  };
}

function TreeZoomIndicator({ zoom }: { zoom: number }) {
  return <div className="ft-zoom-indicator">{Math.round(zoom * 100)}%</div>;
}

function TreeViewport<TNode extends PositionedPerson>({
  layout,
  emptyMessage,
  onSelect,
  onDoubleSelect,
  renderNode,
}: {
  layout: RenderedTreeLayout<TNode>;
  emptyMessage: string;
  onSelect: (id: string) => void;
  onDoubleSelect?: (id: string) => void;
  renderNode: (node: TNode) => ReactNode;
}) {
  const initialView = useMemo(() => buildTreeInitialView(layout), [layout]);
  const lastNodeClickRef = useRef<{ id: string; time: number } | null>(null);

  if (layout.people.length === 0) {
    return (
      <div className="ft-fill">
        <div className="ft-viewport">
          <div className="ft-empty">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ft-fill">
      <ZoomPanCanvas
        key={`${layout.viewBox.minX}:${layout.viewBox.minY}:${layout.viewBox.maxX}:${layout.viewBox.maxY}:${layout.people.length}`}
        className="ft-viewport"
        contentClassName="ft-canvas"
        initialView={initialView}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        panMode="bounded"
        ignoreLeftDragFrom={() => false}
        onContentLeftClick={(_point: ZoomPanPoint, target?: HTMLElement | null) => {
          const nodeId = nodeIdFromTarget(target ?? null);
          if (!nodeId) return;

          const now = Date.now();
          const lastClick = lastNodeClickRef.current;
          if (onDoubleSelect && lastClick?.id === nodeId && now - lastClick.time <= TREE_NODE_DOUBLE_CLICK_MS) {
            lastNodeClickRef.current = null;
            onDoubleSelect(nodeId);
            return;
          }

          lastNodeClickRef.current = { id: nodeId, time: now };
          onSelect(nodeId);
        }}
        controls={TreeZoomIndicator}
        contentStyle={{
          width: designRem(layout.viewBox.maxX - layout.viewBox.minX),
          height: designRem(layout.viewBox.maxY - layout.viewBox.minY),
        }}
      >
          {layout.spouseFrames?.map((frame, index) => (
            <div
              key={`spouse-${index}`}
              className="ft-spouse-frame"
              style={{ left: designRem(frame.left), top: designRem(frame.top), width: designRem(frame.width), height: designRem(frame.height) }}
            />
          ))}
          <svg
            className="ft-lines-svg"
            viewBox={`${layout.viewBox.minX} ${layout.viewBox.minY} ${layout.viewBox.width} ${layout.viewBox.height}`}
            style={{
              left: designRem(layout.viewBox.minX),
              top: designRem(layout.viewBox.minY),
              width: designRem(layout.viewBox.width),
              height: designRem(layout.viewBox.height),
            }}
          >
            {layout.lines.map((line, index) => (
              <line
                key={`line-${index}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.colour}
                strokeWidth={line.thickness}
              />
            ))}
          </svg>
          {layout.people.map(renderNode)}
      </ZoomPanCanvas>
    </div>
  );
}

function FamilyTreeViewport({
  data,
  selectedId,
  onSelect,
  onDoubleSelect,
}: {
  data: FamilyTreeData | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDoubleSelect: (id: string) => void;
}) {
  const layout = useMemo(() => buildTreeLayout(data), [data]);

  return (
    <TreeViewport
      layout={layout}
      emptyMessage={webUIText('Auto.ExtraAttr.ComponentsScreensFamilyTreeScreen.792.1')}
      onSelect={onSelect}
      onDoubleSelect={onDoubleSelect}
      renderNode={(person) => (
        <FamilyNodeView
          key={person.person.id}
          node={person}
          selectedId={selectedId}
          onOpen={onSelect}
        />
      )}
    />
  );
}

function PatronageNodeView({
  node,
  selectedId,
  onOpen,
}: {
  node: PatronagePositionedPerson;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  const person = node.person;
  const title = node.isFocus ? relationLabel(person) : person.shortTitle || person.role || (node.linkToPatron ? webUIText("FamilyTree.Client") : webUIText("FamilyTree.Patron"));
  const status = node.linkToPatron?.isInherited
    ? webUIText('FamilyTree.PatronageStatusInherited', { Status: patronageStatus(node.linkToPatron) })
    : patronageStatus(node.linkToPatron);
  const ageLabel = person.age > 0 ? formatNumber(person.age) : '';

  return (
    <button
      type="button"
      className={patronageNodeClass(node, selectedId)}
      data-id={person.id}
      style={{ left: designRem(node.x), top: designRem(node.y), width: designRem(PATRONAGE_NODE_WIDTH), height: designRem(PATRONAGE_NODE_HEIGHT) }}
      onClick={event => {
        if (event.detail === 0) onOpen(person.id);
      }}
      aria-label={person.isAlive ? person.name : `${person.name}, ${webUIText("Common.Deceased")}`}
    >
      <PersonTooltip characterId={person.id} position="right" delay={150}>
        <div className="ft-patron-node-portrait">
          <Portrait
            personId={person.id}
            src={person.portrait}
            layers={person.portraitLayers}
            resolvePerson={false}
            isAlive={person.isAlive}
            isImprisoned={person.isImprisoned}
            badge={portraitBadgeForTreePerson(person)}
            name={person.name}
            size="lg"
            shape="rect"
            showBorder
            activity={person.activity}
            isRuler={person.isRuler}
            isHeir={person.isHeir}
            isDesignatedHeir={person.isDesignatedHeir}
            isPreviousRuler={person.isPreviousRuler}
          />
          {!person.isAlive && (
            <span className="ft-dead-marker">
              <img src="/assets/icons/I_Skull.png" alt="" draggable={false} />
            </span>
          )}
        </div>
      </PersonTooltip>
      <span className="ft-patron-node-copy">
        <span className="ft-patron-node-name">{person.name}</span>
        <span className="ft-patron-node-title">
          <span>{title}</span>
          {ageLabel && <span className="ft-node-title-age">{ageLabel}</span>}
        </span>
        <span className="ft-patron-node-status">{status}</span>
      </span>
    </button>
  );
}

function PatronageTreeViewport({
  data,
  selectedId,
  onSelect,
  onDoubleSelect,
}: {
  data: FamilyTreeData | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDoubleSelect: (id: string) => void;
}) {
  const layout = useMemo(() => buildPatronageLayout(data), [data]);

  return (
    <TreeViewport
      layout={layout}
      emptyMessage={webUIText('Auto.ExtraAttr.ComponentsScreensFamilyTreeScreen.870.2')}
      onSelect={onSelect}
      onDoubleSelect={onDoubleSelect}
      renderNode={(person) => (
        <PatronageNodeView
          key={person.person.id}
          node={person}
          selectedId={selectedId}
          onOpen={onSelect}
        />
      )}
    />
  );
}

interface FamilyTreeScreenTarget {
  mode: FamilyTreeMode;
  personId: string | null;
}

function parseFamilyTreeScreenId(screenId: string | null): FamilyTreeScreenTarget {
  if (!screenId) return { mode: 'tree', personId: null };

  const separatorIndex = screenId.indexOf(':');
  if (separatorIndex < 0) {
    return { mode: 'tree', personId: screenId || null };
  }

  const rawMode = screenId.slice(0, separatorIndex);
  const personId = screenId.slice(separatorIndex + 1) || null;
  return {
    mode: rawMode === 'patronage' ? 'patronage' : 'tree',
    personId,
  };
}

function familyTreeFocusName(data: FamilyTreeData | null, fallbackPersonName?: string): string {
  const focusId = data?.focusPersonId || data?.rulerId || '';
  const focusedPerson = focusId
    ? data?.nodes.find(person => person.id === focusId)
      || data?.patronageNodes.find(person => person.id === focusId)
    : null;
  return focusedPerson?.name || fallbackPersonName || '';
}

export default function FamilyTreeScreen({ screenId, onClose }: { screenId: string | null; onClose: () => void }) {
  const target = useMemo(() => parseFamilyTreeScreenId(screenId), [screenId]);
  const [activeMode, setActiveMode] = useState<FamilyTreeMode>(target.mode);
  const data = useFamilyTreeBridge(target.personId, activeMode === 'patronage' ? 'patronage' : 'lineage');
  const lineageData = useMemo(() => filterLineageData(data), [data]);
  const { openSidebar, openScreen } = useGameActions();
  const [selectedId, setSelectedId] = useState<string | null>(target.personId);

  const openCharacter = useCallback((id: string) => {
    setSelectedId(id);
    openSidebar('character', id);
  }, [openSidebar]);

  const switchToCharacterFamilyTree = useCallback((id: string) => {
    setSelectedId(id);
    openScreen('familyTree', `tree:${id}`);
  }, [openScreen]);

  const tabs = [
    { id: 'tree', label: webUIText('Auto.Prop.ComponentsScreensFamilyTreeScreen.895.1') },
    { id: 'patronage', label: webUIText('Auto.Prop.ComponentsScreensFamilyTreeScreen.896.2') },
  ];
  const focusName = familyTreeFocusName(data);
  const screenTitle = focusName
    ? webUIText('FamilyTreeScreen.FocusedTitle', { Name: focusName })
    : webUIText('Auto.Attr.ComponentsScreensFamilyTreeScreen.901.3');

  return (
    <ScreenShell
      title={screenTitle}
      onClose={onClose}
      advisorTopic="familyTreeScreen"
      tabs={<SidebarTabBar tabs={tabs} activeTab={activeMode} onTabChange={(id) => setActiveMode(id as FamilyTreeMode)} />}
      contentClassName="fts-content"
    >
      {activeMode === 'patronage'
        ? <PatronageTreeViewport data={data} selectedId={selectedId} onSelect={openCharacter} onDoubleSelect={switchToCharacterFamilyTree} />
        : <FamilyTreeViewport data={lineageData} selectedId={selectedId} onSelect={openCharacter} onDoubleSelect={switchToCharacterFamilyTree} />}
    </ScreenShell>
  );
}

registerTopbarButton({
  id: 'family',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensFamilyTreeScreen.917.1'); },
  icon: '/assets/icons/I_Family.png',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensFamilyTreeScreen.920.2'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensFamilyTreeScreen.921.3'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensFamilyTreeScreen.923.4'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensFamilyTreeScreen.924.5'); } },
    ],
  },
  order: 35,
  factionMode: 'all',
});
registerScreen({
  id: 'familyTree',
  render: ({ screenId, onClose }) => <FamilyTreeScreen key={screenId ?? 'default'} screenId={screenId} onClose={onClose} />,
  topbarId: 'family',
  advisorTopic: 'familyTreeScreen',
  bridgeNames: ['familytree', 'dynasty'],
  factionMode: 'all',
});

import type { ZoomPanPoint } from '../../common/layout/scrolling/ZoomPanCanvas';
import type { BattleFormationLive } from '../../../bridge/military-map/useBattleBridge';

const ORDER_PATH_MIN_POINT_DISTANCE = 60.0;
const ORDER_PATH_FINAL_POINT_DISTANCE = 10.0;

export interface SelectionBox {
  start: ZoomPanPoint;
  end: ZoomPanPoint;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
export function normaliseDegrees(value: number): number {
  let next = value;
  while (next < 0) next += 360;
  while (next >= 360) next -= 360;
  return next;
}

export function coordinatePercent(value: number, size: number, fallbackPercent: number): string {
  const fallback = size * fallbackPercent / 100;
  const coordinate = Number.isFinite(value) ? value : fallback;
  return `${clamp(coordinate / size * 100, 0, 100).toFixed(2)}%`;
}

export function coordinatePercentUnclamped(value: number, size: number, fallbackPercent: number): string {
  const fallback = size * fallbackPercent / 100;
  const coordinate = Number.isFinite(value) ? value : fallback;
  return `${(coordinate / size * 100).toFixed(2)}%`;
}

export function coordinatePercentValue(value: number, size: number, fallbackPercent: number): number {
  const fallback = size * fallbackPercent / 100;
  const coordinate = Number.isFinite(value) ? value : fallback;
  return clamp(coordinate / size * 100, 0, 100);
}

export function pathNumber(value: number): string {
  return value.toFixed(2);
}

export function radiusPercent(value: number, size: number): number {
  return clamp(value / size * 100, 0, 100);
}

export function sizePercent(value: number, size: number): string {
  return `${clamp(value / size * 100, 0, 100).toFixed(2)}%`;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = (hash * 16777619) >>> 0;
  }
  return hash >>> 0;
}

export function stableObstacleNoise(seed: string, index: number, salt: number): number {
  let value = stableHash(seed);
  value ^= ((index + 1) * 374761393) >>> 0;
  value ^= (salt * 668265263) >>> 0;
  value = (value ^ (value >>> 13)) >>> 0;
  value = (value * 1274126177) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return (value & 0xffff) / 65535;
}

export function percentPointToBattlefield(point: ZoomPanPoint, width: number, height: number): ZoomPanPoint {
  return {
    x: clamp(point.x, 0, 100) / 100 * width,
    y: clamp(point.y, 0, 100) / 100 * height,
  };
}

export function pointDistance(a: ZoomPanPoint, b: ZoomPanPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function elementHeight(element: HTMLElement | null): number {
  if (!element) return 0;
  return element.offsetHeight || element.getBoundingClientRect().height || 0;
}

export function normaliseSelectionBox(box: SelectionBox): { left: number; top: number; width: number; height: number } {
  const left = Math.min(box.start.x, box.end.x);
  const top = Math.min(box.start.y, box.end.y);
  return {
    left,
    top,
    width: Math.abs(box.end.x - box.start.x),
    height: Math.abs(box.end.y - box.start.y),
  };
}

export function formationInsideSelection(formation: BattleFormationLive, box: SelectionBox, width: number, height: number): boolean {
  if (formation.strength <= 0) return false;

  const rect = normaliseSelectionBox(box);
  const x = coordinatePercentValue(formation.positionX, width, formation.side === 'attacker' ? 32 : 68);
  const y = coordinatePercentValue(formation.positionY, height, formation.side === 'attacker' ? 65 : 35);
  const radius = Math.max(1.5, Math.min(radiusPercent(formation.collisionRadius ?? 60, width), 6));

  return x + radius >= rect.left
    && x - radius <= rect.left + rect.width
    && y + radius >= rect.top
    && y - radius <= rect.top + rect.height;
}

export function formationIdsInSelection(formations: BattleFormationLive[], box: SelectionBox, width: number, height: number): string[] {
  const picked = formations.filter(formation => formationInsideSelection(formation, box, width, height));
  const commandable = picked.filter(formation => formation.isCommandable);
  return (commandable.length > 0 ? commandable : picked).map(formation => formation.id);
}

export function findFormationAtPoint(formations: BattleFormationLive[], point: ZoomPanPoint): BattleFormationLive | null {
  let closest: BattleFormationLive | null = null;
  let closestDistSq = Number.MAX_VALUE;

  for (const formation of formations) {
    if (formation.strength <= 0) continue;

    const dx = point.x - formation.positionX;
    const dy = point.y - formation.positionY;
    const distSq = dx * dx + dy * dy;
    const hitRadius = Math.max(formation.collisionRadius ?? 80, 80) + 40;
    if (distSq <= hitRadius * hitRadius && distSq < closestDistSq) {
      closest = formation;
      closestDistSq = distSq;
    }
  }

  return closest;
}

export function simplifyBattlePath(path: ZoomPanPoint[]): ZoomPanPoint[] {
  if (path.length <= 2) return path;

  const simplified: ZoomPanPoint[] = [path[0]];
  for (let index = 1; index < path.length; index++) {
    const last = simplified[simplified.length - 1];
    const next = path[index];
    if (pointDistance(last, next) >= ORDER_PATH_MIN_POINT_DISTANCE) {
      simplified.push(next);
    }
  }

  const finalPoint = path[path.length - 1];
  const lastSimplified = simplified[simplified.length - 1];
  if (pointDistance(lastSimplified, finalPoint) > ORDER_PATH_FINAL_POINT_DISTANCE) {
    simplified.push(finalPoint);
  }

  return simplified;
}

export function buildWaypointSplinePath(points: ZoomPanPoint[], width: number, height: number): string {
  if (points.length < 2) return '';

  const projected = points.map(point => ({
    x: coordinatePercentValue(point.x, width, 50),
    y: coordinatePercentValue(point.y, height, 50),
  }));

  if (projected.length === 2) {
    const start = projected[0];
    const end = projected[1];
    return `M ${pathNumber(start.x)} ${pathNumber(start.y)} L ${pathNumber(end.x)} ${pathNumber(end.y)}`;
  }

  let path = `M ${pathNumber(projected[0].x)} ${pathNumber(projected[0].y)}`;
  for (let index = 0; index < projected.length - 1; index++) {
    const previous = projected[Math.max(0, index - 1)];
    const current = projected[index];
    const next = projected[index + 1];
    const following = projected[Math.min(projected.length - 1, index + 2)];
    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (following.x - current.x) / 6,
      y: next.y - (following.y - current.y) / 6,
    };
    path += ` C ${pathNumber(controlOne.x)} ${pathNumber(controlOne.y)} ${pathNumber(controlTwo.x)} ${pathNumber(controlTwo.y)} ${pathNumber(next.x)} ${pathNumber(next.y)}`;
  }

  return path;
}



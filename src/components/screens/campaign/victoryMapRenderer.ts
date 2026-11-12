import type { ScenarioOverviewMap } from '../../../bridge-types.generated.ts';
import type { VictoryMapBorders, VictoryMapProvince } from './victoryMap';

/**
 * Canvas drawing for the victory map. The campaign geometry is several megabytes of
 * pixel-traced outlines, so each draw culls to the visible area and uses outlines
 * simplified to the current scale. Simplified levels are built once per shape on first use.
 */

// Simplification tolerances in map pixels, finest first.
const LOD_TOLERANCES = [0.5, 1.5, 4, 12, 36];
// The largest on-screen error a simplified level may introduce, in CSS pixels.
const SCREEN_TOLERANCE = 0.4;

interface Shape {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Polylines (borders) or closed rings (fills) as flat x, y pairs. */
  raw: Float32Array[];
  levels: (Float32Array[] | undefined)[];
  closed: boolean;
}

interface MapGeometry {
  segments: (Shape | undefined)[];
  fills: Map<number, Shape>;
}

const geometryCache = new WeakMap<ScenarioOverviewMap, MapGeometry>();

function geometryFor(map: ScenarioOverviewMap): MapGeometry {
  let geometry = geometryCache.get(map);
  if (!geometry) {
    geometry = { segments: new Array(map.borderSegments.length), fills: new Map() };
    geometryCache.set(map, geometry);
  }
  return geometry;
}

/** Parse absolute and relative M, L, H, V and Z commands into flat point lists. */
function parsePath(path: string): Float32Array[] {
  const parts: Float32Array[] = [];
  const tokens = path.match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let current: number[] = [];
  let command = 'M';
  let x = 0, y = 0;
  const flush = () => {
    if (current.length >= 4) parts.push(Float32Array.from(current));
    current = [];
  };
  for (let i = 0; i < tokens.length;) {
    const token = tokens[i];
    if (/[A-Za-z]/.test(token)) {
      command = token;
      i++;
      if (command === 'Z' || command === 'z') {
        // Close back to the subpath start, as SVG does, so stroked outlines draw their last edge.
        if (current.length >= 4 && (current[0] !== x || current[1] !== y)) current.push(current[0], current[1]);
        if (current.length >= 2) {
          x = current[0];
          y = current[1];
        }
        flush();
      }
      continue;
    }
    const value = Number(token);
    switch (command) {
      case 'M': case 'm':
        flush();
        x = command === 'm' ? x + value : value;
        y = command === 'm' ? y + Number(tokens[i + 1]) : Number(tokens[i + 1]);
        i += 2;
        current.push(x, y);
        command = command === 'm' ? 'l' : 'L';
        continue;
      case 'L': case 'l':
        x = command === 'l' ? x + value : value;
        y = command === 'l' ? y + Number(tokens[i + 1]) : Number(tokens[i + 1]);
        i += 2;
        break;
      case 'H': case 'h':
        x = command === 'h' ? x + value : value;
        i++;
        break;
      case 'V': case 'v':
        y = command === 'v' ? y + value : value;
        i++;
        break;
      default:
        i++;
        continue;
    }
    current.push(x, y);
  }
  flush();
  return parts;
}

function shapeFrom(raw: Float32Array[], closed: boolean): Shape {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const points of raw) {
    for (let i = 0; i < points.length; i += 2) {
      minX = Math.min(minX, points[i]);
      maxX = Math.max(maxX, points[i]);
      minY = Math.min(minY, points[i + 1]);
      maxY = Math.max(maxY, points[i + 1]);
    }
  }
  return { minX, minY, maxX, maxY, raw, levels: [], closed };
}

function segmentShape(map: ScenarioOverviewMap, geometry: MapGeometry, index: number): Shape {
  let shape = geometry.segments[index];
  if (!shape) {
    shape = shapeFrom(parsePath(map.borderSegments[index].path), false);
    geometry.segments[index] = shape;
  }
  return shape;
}

function fillShape(geometry: MapGeometry, province: VictoryMapProvince): Shape {
  let shape = geometry.fills.get(province.provinceIndex);
  if (!shape) {
    shape = shapeFrom(parsePath(province.fillPath), true);
    geometry.fills.set(province.provinceIndex, shape);
  }
  return shape;
}

/** Douglas-Peucker simplification of a flat point list. */
function simplify(points: Float32Array, tolerance: number, closed: boolean): Float32Array | null {
  const source = closed ? Float32Array.from([...points, points[0], points[1]]) : points;
  const count = source.length / 2;
  if (count <= 2) return closed ? null : points;
  const keep = new Uint8Array(count);
  keep[0] = 1;
  keep[count - 1] = 1;
  const toleranceSq = tolerance * tolerance;
  const stack = [0, count - 1];
  while (stack.length) {
    const last = stack.pop()!;
    const first = stack.pop()!;
    const ax = source[first * 2], ay = source[first * 2 + 1];
    const dx = source[last * 2] - ax, dy = source[last * 2 + 1] - ay;
    const lengthSq = dx * dx + dy * dy;
    let worst = -1, worstSq = toleranceSq;
    for (let i = first + 1; i < last; i++) {
      const px = source[i * 2] - ax, py = source[i * 2 + 1] - ay;
      let distanceSq: number;
      if (lengthSq === 0) {
        distanceSq = px * px + py * py;
      } else {
        const cross = px * dy - py * dx;
        distanceSq = cross * cross / lengthSq;
      }
      if (distanceSq > worstSq) {
        worstSq = distanceSq;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push(first, worst, worst, last);
    }
  }
  const kept: number[] = [];
  for (let i = 0; i < (closed ? count - 1 : count); i++) {
    if (keep[i]) kept.push(source[i * 2], source[i * 2 + 1]);
  }
  if (closed && kept.length < 6) return null;
  return Float32Array.from(kept);
}

function shapeAtLevel(shape: Shape, level: number): Float32Array[] {
  if (level < 0) return shape.raw;
  let simplified = shape.levels[level];
  if (!simplified) {
    simplified = [];
    for (const points of shape.raw) {
      const result = simplify(points, LOD_TOLERANCES[level], shape.closed);
      if (result) simplified.push(result);
    }
    shape.levels[level] = simplified;
  }
  return simplified;
}

function levelForScale(scale: number): number {
  const allowed = SCREEN_TOLERANCE / scale;
  let level = -1;
  for (let i = 0; i < LOD_TOLERANCES.length; i++) {
    if (LOD_TOLERANCES[i] <= allowed) level = i;
  }
  return level;
}

/**
 * Returns a step function that builds every simplified level for the borders and the given fills,
 * coarsest first, while `hasTime` allows. It reports true once everything is built.
 */
export function prepareVictoryMapDetail(map: ScenarioOverviewMap, provinces: readonly VictoryMapProvince[]): (hasTime: () => boolean) => boolean {
  const geometry = geometryFor(map);
  const jobs: (() => void)[] = [];
  for (let level = LOD_TOLERANCES.length - 1; level >= 0; level--) {
    for (let index = 0; index < map.borderSegments.length; index++) {
      jobs.push(() => shapeAtLevel(segmentShape(map, geometry, index), level));
    }
    for (const province of provinces) jobs.push(() => shapeAtLevel(fillShape(geometry, province), level));
  }
  let next = 0;
  return hasTime => {
    while (next < jobs.length && hasTime()) jobs[next++]();
    return next >= jobs.length;
  };
}

/** Maps map pixels to canvas CSS pixels: screen = offset + map * scale. */
export interface VictoryMapView {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  pixelRatio: number;
}

export interface VictoryMapLayers {
  provinces: readonly VictoryMapProvince[];
  borders: VictoryMapBorders;
  focusedTier: number | null;
  tierColour: (index: number) => string;
  controlledColour: string;
}

function addPolylines(context: CanvasRenderingContext2D, parts: Float32Array[], close: boolean): void {
  for (const points of parts) {
    context.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
    if (close) context.closePath();
  }
}

export function drawVictoryMap(context: CanvasRenderingContext2D, map: ScenarioOverviewMap, layers: VictoryMapLayers, view: VictoryMapView): void {
  const geometry = geometryFor(map);
  const { scale, pixelRatio } = view;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, pixelRatio * view.offsetX, pixelRatio * view.offsetY);

  // Visible area in map pixels, padded so wide strokes at the edges still draw.
  const pad = 8 / scale;
  const left = -view.offsetX / scale - pad;
  const top = -view.offsetY / scale - pad;
  const right = (view.width - view.offsetX) / scale + pad;
  const bottom = (view.height - view.offsetY) / scale + pad;
  const visible = (shape: Shape) => shape.maxX >= left && shape.minX <= right && shape.maxY >= top && shape.minY <= bottom;
  const level = levelForScale(scale);

  const { focusedTier, tierColour, controlledColour } = layers;
  const fills = new Map<string, { colour: string; alpha: number; shapes: Shape[] }>();
  for (const province of layers.provinces) {
    if (province.maxX < left || province.minX > right || province.maxY < top || province.minY > bottom) continue;
    const inFocus = focusedTier !== null && province.tierIndices.includes(focusedTier);
    const colour = province.isControlled ? controlledColour : tierColour(inFocus ? focusedTier! : province.tierIndices[0]);
    const alpha = focusedTier !== null && !inFocus ? 0.18 : province.isControlled ? 0.72 : 0.55;
    const key = colour + '|' + alpha;
    let group = fills.get(key);
    if (!group) {
      group = { colour, alpha, shapes: [] };
      fills.set(key, group);
    }
    group.shapes.push(fillShape(geometry, province));
  }
  for (const group of fills.values()) {
    context.beginPath();
    for (const shape of group.shapes) addPolylines(context, shapeAtLevel(shape, level), true);
    context.globalAlpha = group.alpha;
    context.fillStyle = group.colour;
    context.fill('evenodd');
  }

  const stroke = (indices: readonly number[], colour: string, width: number, alpha = 1, dash: number[] = [], dashOffset = 0) => {
    context.beginPath();
    let any = false;
    for (const index of indices) {
      const shape = segmentShape(map, geometry, index);
      if (!visible(shape)) continue;
      addPolylines(context, shapeAtLevel(shape, level), false);
      any = true;
    }
    if (!any) return;
    context.globalAlpha = alpha;
    context.strokeStyle = colour;
    context.lineWidth = width / scale;
    context.setLineDash(dash.map(length => length / scale));
    context.lineDashOffset = dashOffset / scale;
    context.stroke();
  };
  const { borders } = layers;
  stroke(borders.regions, '#d8d0b7', 0.65, 0.45);
  stroke(borders.lands, '#e4d6ad', 1.3, 0.7);
  stroke(borders.domains, '#29231c', 3.4);
  stroke(borders.domains, '#f0e2bc', 1.8);
  stroke(borders.held, '#18261e', 6);
  stroke(borders.held, controlledColour, 4.5);
  borders.goals.forEach((indices, tierIndex) => stroke(indices, tierColour(tierIndex), focusedTier === tierIndex ? 3.5 : 2.5,
    focusedTier !== null && focusedTier !== tierIndex ? 0.2 : 1, [4, 8], tierIndex * 4));
  context.globalAlpha = 1;
  context.setLineDash([]);
}

/** The highlighted province under a map-pixel position, if any. */
export function victoryProvinceAt(map: ScenarioOverviewMap, provinces: readonly VictoryMapProvince[], x: number, y: number): VictoryMapProvince | null {
  const geometry = geometryFor(map);
  for (const province of provinces) {
    if (x < province.minX || x > province.maxX || y < province.minY || y > province.maxY) continue;
    let inside = false;
    for (const ring of fillShape(geometry, province).raw) {
      for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
        const yi = ring[i + 1], yj = ring[j + 1];
        if ((yi > y) !== (yj > y) && x < (ring[j] - ring[i]) * (y - yi) / (yj - yi) + ring[i]) inside = !inside;
      }
    }
    if (inside) return province;
  }
  return null;
}

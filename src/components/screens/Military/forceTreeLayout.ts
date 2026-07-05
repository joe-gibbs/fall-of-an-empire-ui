import type { Force, Rank } from './forces';

export const RANK_DIMS: Record<Rank, { w: number; h: number }> = {
  Dux: { w: 296, h: 136 },
  Praefectus: { w: 244, h: 112 },
  Legatus: { w: 208, h: 96 },
};

export const DEPTH_GAP = 90;
export const SIBLING_GAP = 12;
export const ROOT_GAP = 30;
export const CANVAS_PAD = 56;
export const INITIAL_CHART_ZOOM = 0.85;
export const MIN_CHART_ZOOM = 0.35;
export const MAX_CHART_ZOOM = 1.6;
export const CHART_ZOOM_STEP = 1.15;
export const DRAG_THRESHOLD = 5;

export interface PlacedNode {
  force: Force;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutResult {
  nodes: PlacedNode[];
  lines: { parentId: string; childId: string; x1: number; y1: number; x2: number; y2: number }[];
  width: number;
  height: number;
}

export function layoutTree(forces: Force[]): LayoutResult {
  const byId = new Map(forces.map(f => [f.id, f]));
  const children = new Map<string, Force[]>();
  forces.forEach(f => { if (f.parentId) (children.get(f.parentId) ?? children.set(f.parentId, []).get(f.parentId)!).push(f); });

  const roots = forces.filter(f => !f.parentId || !byId.has(f.parentId));
  const depthOf = new Map<string, number>();
  const visitDepth = (f: Force, d: number) => {
    depthOf.set(f.id, d);
    (children.get(f.id) ?? []).forEach(c => visitDepth(c, d + 1));
  };
  roots.forEach(r => visitDepth(r, 0));

  const depthMaxW: number[] = [];
  forces.forEach(f => {
    const d = depthOf.get(f.id) ?? 0;
    const w = RANK_DIMS[f.rank].w;
    depthMaxW[d] = Math.max(depthMaxW[d] ?? 0, w);
  });

  const xAtDepth: number[] = [];
  let cursorX = 0;
  depthMaxW.forEach((w, d) => {
    xAtDepth[d] = cursorX;
    cursorX += w + DEPTH_GAP;
  });
  const totalWidth = Math.max(0, cursorX - DEPTH_GAP);

  const heightMemo = new Map<string, number>();
  const heightOf = (id: string): number => {
    const cached = heightMemo.get(id);
    if (cached !== undefined) return cached;
    const f = byId.get(id)!;
    const own = RANK_DIMS[f.rank].h;
    const kids = children.get(id) ?? [];
    if (kids.length === 0) { heightMemo.set(id, own); return own; }
    const total = kids.reduce((s, k, i) => s + heightOf(k.id) + (i > 0 ? SIBLING_GAP : 0), 0);
    const h = Math.max(own, total);
    heightMemo.set(id, h);
    return h;
  };

  const nodes: PlacedNode[] = [];
  const lines: LayoutResult['lines'] = [];

  const place = (f: Force, top: number) => {
    const d = depthOf.get(f.id) ?? 0;
    const dim = RANK_DIMS[f.rank];
    const subtreeH = heightOf(f.id);
    const x = xAtDepth[d] + (depthMaxW[d] - dim.w) / 2;
    const y = top + (subtreeH - dim.h) / 2;
    nodes.push({ force: f, x, y, w: dim.w, h: dim.h });

    const kids = children.get(f.id) ?? [];
    if (kids.length === 0) return;

    const kidsTotal = kids.reduce((s, k, i) => s + heightOf(k.id) + (i > 0 ? SIBLING_GAP : 0), 0);
    let cursor = top + (subtreeH - kidsTotal) / 2;
    kids.forEach(k => {
      const kh = heightOf(k.id);
      const kdim = RANK_DIMS[k.rank];
      const kd = depthOf.get(k.id) ?? 0;
      const kx = xAtDepth[kd] + (depthMaxW[kd] - kdim.w) / 2;
      const ky = cursor + (kh - kdim.h) / 2;
      lines.push({
        parentId: f.id, childId: k.id,
        x1: x + dim.w, y1: y + dim.h / 2,
        x2: kx, y2: ky + kdim.h / 2,
      });
      place(k, cursor);
      cursor += kh + SIBLING_GAP;
    });
  };

  let y = 0;
  roots.forEach(r => {
    place(r, y);
    y += heightOf(r.id) + ROOT_GAP;
  });

  return {
    nodes,
    lines,
    width: totalWidth,
    height: Math.max(0, y - ROOT_GAP),
  };
}

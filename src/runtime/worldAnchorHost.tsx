import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { acknowledgeBridgeFailure, getRuntimeEngine } from '../bridge/core/runtimeEngine';

/**
 * World-anchor host: the mechanism behind engine-composited (same-frame) UI elements, exposed
 * as an HTML attribute so game code and mods author it the same way.
 *
 * Any element rendered under the host carrying `data-world-anchor="<key>"` is automatically
 * packed into a slot of this page's texture atlas, measured, and reported to the engine. Every
 * game frame the engine draws that slot's pixels at its own placement for `<key>` — so the
 * element's POSITION is always frame-exact even though its CONTENT is browser-painted and a few
 * frames stale. Keys must match an engine placement source:
 *   glance:settlement:<id>  glance:port:<id>  glance:convoy:<id>
 *   glance:army:<id>        glance:navy:<id>  glance:battle:<id>   notif:<id>
 *
 * Optional attributes:
 *   data-world-anchor-point         Point inside the element that maps onto the engine-projected
 *                                   position: "x,y" in element layout px, "x% y%" of the element
 *                                   size, or "center". Default "50% 50%".
 *   data-world-anchor-raster-scale  Rasterise the element at Nx into the atlas; the engine draws
 *                                   it back at layout size (sharper text on small plates). The
 *                                   element must also visually scale itself by the same factor
 *                                   (see --glance-atlas-raster-scale). Default 1.
 *   data-world-anchor-priority     Numeric; higher packs first when the atlas overflows (set it
 *                                   on recently-visible elements). Default 0.
 *
 * Invariants preserved from the glance compositor's flicker saga (see project memory):
 *  - Repacks never move painted pixels out from under the engine: before live elements move to
 *    a new region, static clones of their previous cells are placed in a ghost layer, and ghosts
 *    survive two further generations (four rotating regions) — the engine reads layouts up to
 *    two generations old while new ones age past its paint guard.
 *  - Layout reports go out only after the browser has actually painted (double rAF).
 *  - Repacks happen only when the cell set is wrong (new/removed/resized elements), never on
 *    content churn.
 */

const ATLAS_WIDTH = 4096;
const ATLAS_HEIGHT = 4096;
const ATLAS_REGIONS = 4;
const REGION_HEIGHT = ATLAS_HEIGHT / ATLAS_REGIONS;
const CELL_GAP = 8;
const GHOST_GENERATIONS = 2;
const REPACK_THROTTLE_MS = 400;
const REPACK_MIN_INTERVAL_MS = 120;
// New elements wait here, outside the 4096px atlas canvas, until packed: they get laid out and
// measured but never rasterised into the texture.
const STAGING_LEFT_PX = -4600;

interface AnchoredElementState {
  key: string;
  slot: { x: number; y: number; width: number; height: number } | null;
}

interface ReportCell {
  k: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  rs: number;
}

function parseRasterScale(element: HTMLElement): number {
  const value = Number.parseFloat(element.dataset.worldAnchorRasterScale ?? '1');
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function parsePriority(element: HTMLElement): number {
  const value = Number.parseFloat(element.dataset.worldAnchorPriority ?? '0');
  return Number.isFinite(value) ? value : 0;
}

// Anchor point in element LAYOUT px (pre raster scale); the report converts to atlas texels.
function parseAnchorPoint(element: HTMLElement, layoutWidth: number, layoutHeight: number): { x: number; y: number } {
  const raw = (element.dataset.worldAnchorPoint ?? 'center').trim();
  if (raw === 'center') {
    return { x: layoutWidth / 2, y: layoutHeight / 2 };
  }

  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 2) {
    return { x: layoutWidth / 2, y: layoutHeight / 2 };
  }

  const resolve = (part: string, extent: number, fallback: number): number => {
    if (part.endsWith('%')) {
      const percent = Number.parseFloat(part.slice(0, -1));
      return Number.isFinite(percent) ? (percent / 100) * extent : fallback;
    }
    const px = Number.parseFloat(part);
    return Number.isFinite(px) ? px : fallback;
  };

  return {
    x: resolve(parts[0], layoutWidth, layoutWidth / 2),
    y: resolve(parts[1], layoutHeight, layoutHeight / 2),
  };
}

class WorldAnchorHostController {
  private readonly ghostLayer: HTMLElement;
  private readonly elements = new Map<HTMLElement, AnchoredElementState>();
  private readonly mutationObserver: MutationObserver;
  private readonly resizeObserver: ResizeObserver;
  private generation = 0;
  private repackTimer: number | null = null;
  private lastRepackAt = 0;
  private reportFrameIds: number[] = [];
  private disposed = false;

  constructor(liveLayer: HTMLElement, ghostLayer: HTMLElement) {
    this.ghostLayer = ghostLayer;

    this.resizeObserver = new ResizeObserver((observations) => {
      let needsRepack = false;
      let urgent = false;
      for (const observation of observations) {
        const element = observation.target as HTMLElement;
        const state = this.elements.get(element);
        if (!state) {
          continue;
        }
        const rasterScale = parseRasterScale(element);
        const width = Math.ceil(element.offsetWidth * rasterScale);
        const height = Math.ceil(element.offsetHeight * rasterScale);
        if (!state.slot) {
          needsRepack = true;
          urgent = true;
        } else if (width > state.slot.width || height > state.slot.height) {
          // Content outgrew its cell: it would be clipped in the atlas (and overlap neighbours).
          needsRepack = true;
        }
      }
      if (needsRepack) {
        this.scheduleRepack(urgent);
      }
    });

    this.mutationObserver = new MutationObserver((mutations) => {
      let changed = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              changed = this.collectAnchoredElements(node) || changed;
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              changed = this.releaseAnchoredElements(node) || changed;
            }
          });
        } else if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          changed = this.refreshElement(mutation.target) || changed;
        }
      }
      if (changed) {
        this.scheduleRepack(true);
      }
    });

    this.mutationObserver.observe(liveLayer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-world-anchor', 'data-world-anchor-raster-scale', 'data-world-anchor-point'],
    });

    if (this.collectAnchoredElements(liveLayer)) {
      this.scheduleRepack(true);
    }
  }

  dispose() {
    this.disposed = true;
    this.mutationObserver.disconnect();
    this.resizeObserver.disconnect();
    if (this.repackTimer !== null) {
      window.clearTimeout(this.repackTimer);
    }
    for (const frameId of this.reportFrameIds) {
      window.cancelAnimationFrame(frameId);
    }
    this.elements.clear();
  }

  private collectAnchoredElements(root: HTMLElement): boolean {
    let changed = false;
    const candidates: HTMLElement[] = root.matches?.('[data-world-anchor]') ? [root] : [];
    root.querySelectorAll?.('[data-world-anchor]').forEach((node) => {
      if (node instanceof HTMLElement) {
        candidates.push(node);
      }
    });

    for (const element of candidates) {
      if (this.elements.has(element)) {
        continue;
      }
      const key = element.dataset.worldAnchor ?? '';
      if (!key) {
        continue;
      }
      this.elements.set(element, { key, slot: null });
      element.style.position = 'absolute';
      element.style.left = `${STAGING_LEFT_PX}px`;
      element.style.top = '0px';
      this.resizeObserver.observe(element);
      changed = true;
    }
    return changed;
  }

  private releaseAnchoredElements(root: HTMLElement): boolean {
    let changed = false;
    const candidates: HTMLElement[] = root.matches?.('[data-world-anchor]') ? [root] : [];
    root.querySelectorAll?.('[data-world-anchor]').forEach((node) => {
      if (node instanceof HTMLElement) {
        candidates.push(node);
      }
    });
    for (const element of candidates) {
      if (this.elements.delete(element)) {
        this.resizeObserver.unobserve(element);
        changed = true;
      }
    }
    // Removal only frees atlas space; the engine stops referencing the key in lockstep with the
    // entity leaving its placement source, so no urgent repaint is needed.
    return changed;
  }

  private refreshElement(element: HTMLElement): boolean {
    const state = this.elements.get(element);
    const key = element.dataset.worldAnchor ?? '';
    if (!state) {
      return key ? this.collectAnchoredElements(element) : false;
    }
    if (!key) {
      this.elements.delete(element);
      this.resizeObserver.unobserve(element);
      return true;
    }
    if (state.key !== key) {
      state.key = key;
      return true;
    }
    // Raster-scale / anchor-point changes only need a fresh report, which a repack provides.
    return true;
  }

  private scheduleRepack(urgent: boolean) {
    if (this.disposed) {
      return;
    }
    const minInterval = urgent ? REPACK_MIN_INTERVAL_MS : REPACK_THROTTLE_MS;
    const dueAt = this.lastRepackAt + minInterval;
    const delay = Math.max(dueAt - Date.now(), 0);
    if (this.repackTimer !== null) {
      if (!urgent) {
        return;
      }
      window.clearTimeout(this.repackTimer);
    }
    this.repackTimer = window.setTimeout(() => {
      this.repackTimer = null;
      this.repack();
    }, delay);
  }

  private repack() {
    if (this.disposed) {
      return;
    }

    this.lastRepackAt = Date.now();
    this.generation += 1;
    const generation = this.generation;
    const regionIndex = generation % ATLAS_REGIONS;
    const originY = regionIndex * REGION_HEIGHT;

    // Ghost pass FIRST, in the same synchronous batch as the moves below: the browser paints
    // both in one frame, so the regions the engine may still be sampling never present cleared.
    for (const [element, state] of this.elements) {
      if (!state.slot) {
        continue;
      }
      const ghost = element.cloneNode(true) as HTMLElement;
      ghost.removeAttribute('data-world-anchor');
      ghost.removeAttribute('data-world-anchor-priority');
      ghost.style.left = `${state.slot.x}px`;
      ghost.style.top = `${state.slot.y}px`;
      ghost.dataset.worldAnchorGhostGeneration = String(generation - 1);
      this.ghostLayer.appendChild(ghost);
    }

    // Prune ghosts old enough that the engine provably no longer samples their layout: it draws
    // the newest layout past its paint guard, at most ~two generations behind this one.
    this.ghostLayer.querySelectorAll('[data-world-anchor-ghost-generation]').forEach((node) => {
      const ghostGeneration = Number.parseInt((node as HTMLElement).dataset.worldAnchorGhostGeneration ?? '0', 10);
      if (generation - ghostGeneration > GHOST_GENERATIONS) {
        node.remove();
      }
    });

    // Measure and pack, highest priority first so overflow only ever drops elements their
    // consumer marked as least recently relevant.
    const pending: { element: HTMLElement; state: AnchoredElementState; width: number; height: number; priority: number }[] = [];
    for (const [element, state] of this.elements) {
      const rasterScale = parseRasterScale(element);
      const width = Math.ceil(element.offsetWidth * rasterScale);
      const height = Math.ceil(element.offsetHeight * rasterScale);
      if (width <= 0 || height <= 0) {
        state.slot = null;
        continue;
      }
      pending.push({ element, state, width, height, priority: parsePriority(element) });
    }
    pending.sort((a, b) => b.priority - a.priority);

    let cursorX = CELL_GAP;
    let cursorY = originY + CELL_GAP;
    let rowHeight = 0;
    let overflowed = 0;

    for (const item of pending) {
      if (cursorX + item.width + CELL_GAP > ATLAS_WIDTH) {
        cursorX = CELL_GAP;
        cursorY += rowHeight + CELL_GAP;
        rowHeight = 0;
      }
      if (cursorY + item.height > originY + REGION_HEIGHT) {
        overflowed += 1;
        item.state.slot = null;
        item.element.style.left = `${STAGING_LEFT_PX}px`;
        item.element.style.top = '0px';
        continue;
      }

      item.state.slot = { x: cursorX, y: cursorY, width: item.width, height: item.height };
      item.element.style.left = `${cursorX}px`;
      item.element.style.top = `${cursorY}px`;
      cursorX += item.width + CELL_GAP;
      rowHeight = Math.max(rowHeight, item.height);
    }

    if (overflowed > 0) {
      console.warn(`world-anchor atlas region ${regionIndex} overflowed: ${overflowed} elements unplaced (lowest priority)`);
    }

    this.reportAfterPaint(generation);
  }

  // Report only after the browser has actually painted the new packing (double rAF: the first
  // fires before paint, the second after the frame that painted). Under renderer load the
  // report self-delays with the paint, so the engine's age guard only covers the texture copy.
  private reportAfterPaint(generation: number) {
    const outerId = window.requestAnimationFrame(() => {
      const innerId = window.requestAnimationFrame(() => {
        this.reportFrameIds = this.reportFrameIds.filter((id) => id !== outerId && id !== innerId);
        if (this.disposed || generation !== this.generation) {
          return;
        }

        const engine = getRuntimeEngine();
        if (!engine) {
          return;
        }

        const cells: ReportCell[] = [];
        for (const [element, state] of this.elements) {
          if (!state.slot) {
            continue;
          }
          const rasterScale = parseRasterScale(element);
          const layoutWidth = element.offsetWidth;
          const layoutHeight = element.offsetHeight;
          const anchorPoint = parseAnchorPoint(element, layoutWidth, layoutHeight);
          cells.push({
            k: state.key,
            x: state.slot.x,
            y: state.slot.y,
            w: state.slot.width,
            h: state.slot.height,
            ax: anchorPoint.x * rasterScale,
            ay: anchorPoint.y * rasterScale,
            rs: rasterScale,
          });
        }

        void Promise.resolve(engine.call('WorldAnchorLayout', {
          layoutRevision: generation,
          atlasWidth: ATLAS_WIDTH,
          atlasHeight: ATLAS_HEIGHT,
          cells,
        })).catch((error) => acknowledgeBridgeFailure(error, 'WorldAnchorLayout'));
      });
      this.reportFrameIds.push(innerId);
    });
    this.reportFrameIds.push(outerId);
  }
}

export default function WorldAnchorHost({ children }: { children: ReactNode }) {
  const liveLayerRef = useRef<HTMLDivElement | null>(null);
  const ghostLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!liveLayerRef.current || !ghostLayerRef.current) {
      return undefined;
    }
    const controller = new WorldAnchorHostController(liveLayerRef.current, ghostLayerRef.current);
    return () => controller.dispose();
  }, []);

  return (
    <div className="world-anchor-atlas-root">
      <div ref={ghostLayerRef} className="world-anchor-ghost-layer" />
      <div ref={liveLayerRef} className="world-anchor-live-layer" />
      <ChildrenIntoLiveLayer liveLayerRef={liveLayerRef}>{children}</ChildrenIntoLiveLayer>
    </div>
  );
}

// Consumers render through a portal so their elements land inside the observed live layer.
function ChildrenIntoLiveLayer({ children, liveLayerRef }: { children: ReactNode; liveLayerRef: RefObject<HTMLDivElement | null> }) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    setLayer(liveLayerRef.current);
  }, [liveLayerRef]);
  return layer ? createPortal(children, layer) : null;
}

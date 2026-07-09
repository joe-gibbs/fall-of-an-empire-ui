import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { GetWorldGlancesResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure, getRuntimeEngine } from '../../bridge/core/runtimeEngine';
import {
  WORLD_GLANCE_FRAME_SECTIONS,
  makeWorldGlanceFrameEntryScratch,
  onWorldGlancesFrame,
  readWorldGlanceFrameEntry,
  useWorldGlancesBridge,
  worldGlanceFrameEntryCount,
  type WorldGlanceFrameSection,
} from '../../bridge/app/useWorldGlancesBridge';
import {
  detailClass,
  mapBattle,
  mapConvoy,
  mapMilitary,
  mapNavy,
  mapPort,
  mapSettlement,
} from './WorldGlanceMappers';
import type { WorldGlanceDetailClass } from './WorldGlanceTypes';
import ArmyGlance from './ArmyGlance';
import BattleGlance from './BattleGlance';
import ConvoyGlance from './ConvoyGlance';
import NavyGlance from './NavyGlance';
import PortGlance from './PortGlance';
import SettlementGlance from './SettlementGlance';
import './WorldGlances.css';
import './GlanceAtlas.css';

// The atlas page paints every catalogued glance plate into a fixed slot; the engine composites
// slot sub-rects at the current game frame's positions. Slots are shelf-packed into alternating
// vertical halves of the atlas per layout revision, so the previously reported half stays
// painted while the engine transitions to a new layout (its texture arrives frames later).

const ATLAS_WIDTH = 4096;
const ATLAS_HEIGHT = 4096;
// Four rotating regions: the engine may sample a couple of layout generations behind (each
// must age past its paint guard), so a region is only repainted three layouts after it was
// last reported — old layouts stay sampleable instead of tearing.
const ATLAS_REGIONS = 4;
const REGION_HEIGHT = ATLAS_HEIGHT / ATLAS_REGIONS;
const CELL_GAP = 4;
const RELAYOUT_THROTTLE_MS = 400;
const RELAYOUT_MIN_INTERVAL_MS = 120;

function noopPlateRef() {}
// Anchor constants mirror the DOM overlay's settlement transform offset (negated); every other
// kind is centre-anchored on its rendered plate.
const SETTLEMENT_ANCHOR_X_REM = 1.9091;
const SETTLEMENT_ANCHOR_Y_REM = 2.1364;

const CELL_BUDGETS: Record<WorldGlanceFrameSection, Record<WorldGlanceDetailClass, [number, number]>> = {
  settlement: { 'detail-flag': [96, 84], 'detail-name': [244, 100], 'detail-detailed': [424, 344] },
  port: { 'detail-flag': [84, 68], 'detail-name': [244, 92], 'detail-detailed': [324, 204] },
  convoy: { 'detail-flag': [284, 174], 'detail-name': [284, 174], 'detail-detailed': [284, 174] },
  army: { 'detail-flag': [100, 84], 'detail-name': [264, 114], 'detail-detailed': [324, 244] },
  navy: { 'detail-flag': [100, 84], 'detail-name': [264, 114], 'detail-detailed': [324, 244] },
  battle: { 'detail-flag': [324, 174], 'detail-name': [324, 174], 'detail-detailed': [324, 174] },
};

interface AtlasCell {
  key: string;
  section: WorldGlanceFrameSection;
  // Stable entity id: cell content must be resolved against the CURRENT snapshot by id at
  // render time — an array index captured at packing time dereferences the wrong entity (or
  // nothing) once a newer catalogue replaces the data, blanking plates until the next repack.
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  detail: WorldGlanceDetailClass;
}

interface AtlasLayoutState {
  revision: number;
  snapshotRevision: number;
  cells: AtlasCell[];
}

function sectionEntries(data: GetWorldGlancesResponse, section: WorldGlanceFrameSection): { id: string }[] {
  if (section === 'settlement') return data.settlements;
  if (section === 'port') return data.ports;
  if (section === 'convoy') return data.convoys;
  if (section === 'army') return data.armies;
  if (section === 'navy') return data.navies;
  return data.battles;
}

// Cell keys use the stable entity id (matching the ids in frame entries) so a layout stays
// valid for the engine across snapshot revisions — source indexes remap every revision.
function cellKey(section: WorldGlanceFrameSection, id: string): string {
  return `${WORLD_GLANCE_FRAME_SECTIONS.indexOf(section)}:${id}`;
}

function currentRuntimeViewportScale(): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--runtime-viewport-scale'));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function packCells(
  data: GetWorldGlancesResponse,
  detailByKey: Map<string, WorldGlanceDetailClass>,
  seenByKey: Map<string, number>,
  regionIndex: number,
  runtimeScale: number,
): AtlasCell[] {
  // Pack plates the engine has recently placed on screen first: the catalogue can outgrow the
  // atlas region, and overflow must only ever drop plates that are not currently visible.
  const pending: { key: string; section: WorldGlanceFrameSection; id: string; seenAt: number }[] = [];
  for (const section of WORLD_GLANCE_FRAME_SECTIONS) {
    const entries = sectionEntries(data, section);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const id = entries[entryIndex]?.id;
      if (!id) {
        continue;
      }
      const key = cellKey(section, id);
      pending.push({ key, section, id, seenAt: seenByKey.get(key) ?? 0 });
    }
  }
  pending.sort((a, b) => b.seenAt - a.seenAt);

  const cells: AtlasCell[] = [];
  const originY = regionIndex * REGION_HEIGHT;
  let cursorX = CELL_GAP;
  let cursorY = originY + CELL_GAP;
  let rowHeight = 0;
  let overflowed = 0;

  for (const item of pending) {
    const detail = detailByKey.get(item.key) ?? 'detail-flag';
    const [baseWidth, baseHeight] = CELL_BUDGETS[item.section][detail];
    const width = Math.ceil(baseWidth * runtimeScale);
    const height = Math.ceil(baseHeight * runtimeScale);

    if (cursorX + width + CELL_GAP > ATLAS_WIDTH) {
      cursorX = CELL_GAP;
      cursorY += rowHeight + CELL_GAP;
      rowHeight = 0;
    }
    if (cursorY + height > originY + REGION_HEIGHT) {
      overflowed += 1;
      continue;
    }

    cells.push({ key: item.key, section: item.section, id: item.id, x: cursorX, y: cursorY, width, height, detail });
    cursorX += width + CELL_GAP;
    rowHeight = Math.max(rowHeight, height);
  }

  if (overflowed > 0) {
    console.warn(`glance atlas region ${regionIndex} overflowed: ${overflowed} plates unpacked (least recently visible)`);
  }

  return cells;
}

const GlanceAtlasPlate = memo(function GlanceAtlasPlate({ section, entry, detail, selected, targeted, plateRef }: {
  section: WorldGlanceFrameSection;
  entry: unknown;
  detail: WorldGlanceDetailClass;
  selected: boolean;
  targeted: boolean;
  plateRef: (node: HTMLDivElement | null) => void;
}) {
  let content: ReactNode = null;
  if (section === 'settlement') content = <SettlementGlance data={mapSettlement(entry as GetWorldGlancesResponse['settlements'][number])} />;
  else if (section === 'port') content = <PortGlance data={mapPort(entry as GetWorldGlancesResponse['ports'][number])} />;
  else if (section === 'convoy') content = <ConvoyGlance data={mapConvoy(entry as GetWorldGlancesResponse['convoys'][number])} />;
  else if (section === 'army') content = <ArmyGlance data={mapMilitary(entry as GetWorldGlancesResponse['armies'][number])} />;
  else if (section === 'navy') content = <NavyGlance data={mapNavy(entry as GetWorldGlancesResponse['navies'][number])} />;
  else content = <BattleGlance data={mapBattle(entry as GetWorldGlancesResponse['battles'][number])} />;

  const classes = [
    'world-glance',
    'world-glance-node',
    `world-glance-node--${section}`,
    detail,
    'glance-atlas-plate',
  ];
  if (selected) classes.push('is-selected');
  if (targeted) classes.push('is-targeted');

  return (
    <div ref={plateRef} className={classes.join(' ')}>
      <div className="glance-tip world-glance-tip">{content}</div>
    </div>
  );
});

export default function GlanceAtlasRoot() {
  const data = useWorldGlancesBridge();
  const dataRef = useRef<GetWorldGlancesResponse | null>(null);

  const detailByKeyRef = useRef<Map<string, WorldGlanceDetailClass>>(new Map());
  const flagsByKeyRef = useRef<Map<string, { selected: boolean; targeted: boolean }>>(new Map());
  const seenByKeyRef = useRef<Map<string, number>>(new Map());
  const packedKeysRef = useRef<Set<string>>(new Set());
  const plateNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  // Last known entry per entity: plates keep rendering through brief catalogue churn (fog
  // flicker, event latency) instead of blanking a cell the engine is still compositing.
  const entryCacheRef = useRef<Map<WorldGlanceFrameSection, Map<string, { id: string }>>>(new Map());
  const layoutRevisionRef = useRef(0);
  const relayoutTimerRef = useRef<number | null>(null);
  const lastRelayoutAtRef = useRef(0);

  // Newest-first, up to three generations. Older generations STAY MOUNTED: unmounting (or
  // moving) their plates damage-clears their atlas region immediately, while the engine keeps
  // compositing from an older layout until the newest one ages past its paint guard — every
  // repack then strobed all plates blank. With three generations resident (four regions), the
  // region cleared by pruning is never one the engine can still be reading.
  const [layouts, setLayouts] = useState<AtlasLayoutState[]>([]);
  const [flagsByKey, setFlagsByKey] = useState<Map<string, { selected: boolean; targeted: boolean }>>(new Map());
  const [entryCache, setEntryCache] = useState<Map<WorldGlanceFrameSection, Map<string, { id: string }>>>(new Map());

  const rebuildLayout = useCallback(() => {
    const snapshot = dataRef.current;
    if (!snapshot) {
      return;
    }

    lastRelayoutAtRef.current = Date.now();
    layoutRevisionRef.current += 1;
    const revision = layoutRevisionRef.current;
    const cells = packCells(snapshot, detailByKeyRef.current, seenByKeyRef.current, revision % ATLAS_REGIONS, currentRuntimeViewportScale());
    packedKeysRef.current = new Set(cells.map((cell) => cell.key));
    setLayouts((previous) => [
      {
        revision,
        snapshotRevision: snapshot.snapshotRevision ?? 0,
        cells,
      },
      ...previous,
    ].slice(0, 3));
  }, []);

  const scheduleRelayout = useCallback((urgent = false) => {
    // Snapshot-revision changes remap every SourceIndex, so the engine freezes on the previous
    // pairing until the new layout lands — repack those near-immediately. Content-driven repacks
    // (detail class churn) stay coarsely throttled.
    const minInterval = urgent ? RELAYOUT_MIN_INTERVAL_MS : RELAYOUT_THROTTLE_MS;
    const dueAt = lastRelayoutAtRef.current + minInterval;
    const delay = Math.max(dueAt - Date.now(), 0);
    if (relayoutTimerRef.current !== null) {
      if (!urgent) {
        return;
      }
      window.clearTimeout(relayoutTimerRef.current);
    }
    relayoutTimerRef.current = window.setTimeout(() => {
      relayoutTimerRef.current = null;
      rebuildLayout();
    }, delay);
  }, [rebuildLayout]);

  // Cells are id-keyed, so catalogue churn does NOT invalidate the layout: entities keep their
  // cells and just repaint in place (small dirty rects, no region rotation). Repacking on every
  // snapshot revision saturated the atlas renderer under fast pans / high game speed, and the
  // engine then sampled regions whose paint lagged the layout report — the plate flicker.
  // Repacks happen only when the cell SET is wrong: first catalogue, a visible plate without a
  // cell (frame handler below), detail-class growth, or dead-cell drift after churn.
  useEffect(() => {
    if (!data) {
      return;
    }

    dataRef.current = data;
    let entryCacheChanged = false;
    for (const section of WORLD_GLANCE_FRAME_SECTIONS) {
      let sectionCache = entryCacheRef.current.get(section);
      if (!sectionCache) {
        sectionCache = new Map();
        entryCacheRef.current.set(section, sectionCache);
        entryCacheChanged = true;
      }
      for (const entry of sectionEntries(data, section)) {
        if (entry?.id) {
          if (sectionCache.get(entry.id) !== entry) {
            entryCacheChanged = true;
          }
          sectionCache.set(entry.id, entry);
        }
      }
    }
    if (entryCacheChanged) {
      setEntryCache(new Map(
        Array.from(entryCacheRef.current.entries(), ([section, sectionCache]) => [section, new Map(sectionCache)]),
      ));
    }

    if (layoutRevisionRef.current === 0) {
      scheduleRelayout(true);
      return;
    }

    const catalogueSize = WORLD_GLANCE_FRAME_SECTIONS.reduce(
      (total, section) => total + sectionEntries(data, section).length,
      0,
    );
    const packedCount = packedKeysRef.current.size;
    if (packedCount > catalogueSize * 1.5 + 32 || catalogueSize > packedCount * 1.5 + 32) {
      scheduleRelayout(false);
    }
  }, [data, scheduleRelayout]);

  useEffect(() => {
    const onRuntimeViewport = () => scheduleRelayout(true);
    window.addEventListener('foae:runtime-viewport', onRuntimeViewport);
    return () => window.removeEventListener('foae:runtime-viewport', onRuntimeViewport);
  }, [scheduleRelayout]);

  // Frame events drive per-entry detail level and selection/target content bits (positions are
  // consumed engine-side only).
  useEffect(() => {
    const scratch = makeWorldGlanceFrameEntryScratch();
    return onWorldGlancesFrame((frame) => {
      let detailChanged = false;
      let flagsChanged = false;
      let visiblePlateUnpacked = false;
      const now = Date.now();
      for (const section of WORLD_GLANCE_FRAME_SECTIONS) {
        const count = worldGlanceFrameEntryCount(frame, section);
        for (let index = 0; index < count; index += 1) {
          const entry = readWorldGlanceFrameEntry(frame, section, index, scratch);
          if (!entry || !entry.id) continue;
          const key = cellKey(section, entry.id);

          if ((entry.opacity ?? 0) > 0.05) {
            seenByKeyRef.current.set(key, now);
            if (!packedKeysRef.current.has(key)) {
              visiblePlateUnpacked = true;
            }
          }

          const nextDetail = detailClass(entry.detailLevel);
          if (detailByKeyRef.current.get(key) !== nextDetail) {
            detailByKeyRef.current.set(key, nextDetail);
            detailChanged = true;
          }

          const selected = entry.selected === true;
          const targeted = entry.targeted === true;
          const flags = flagsByKeyRef.current.get(key);
          if (!flags || flags.selected !== selected || flags.targeted !== targeted) {
            flagsByKeyRef.current.set(key, { selected, targeted });
            flagsChanged = true;
          }
        }
      }

      if (detailChanged || visiblePlateUnpacked) {
        // A visible plate without a cell is invisible on screen; restore it urgently.
        scheduleRelayout(visiblePlateUnpacked);
      } else if (flagsChanged) {
        setFlagsByKey(new Map(flagsByKeyRef.current));
      }
    });
  }, [scheduleRelayout]);

  // Report the painted layout to the engine only after the browser has actually painted the
  // new packing (double rAF: the first fires before paint, the second after the frame that
  // painted). Under renderer load the report self-delays with the paint, so the engine's age
  // guard only has to cover the texture copy — a fixed guard alone raced real paints.
  const layout = layouts.length > 0 ? layouts[0] : null;
  useLayoutEffect(() => {
    if (!layout) {
      return;
    }

    let innerFrameId = 0;
    const frameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
      const engine = getRuntimeEngine();
      if (!engine) {
        return;
      }

      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const cells = layout.cells.map((cell) => {
        let anchorX = cell.width / 2;
        let anchorY = cell.height / 2;
        if (cell.section === 'settlement') {
          anchorX = SETTLEMENT_ANCHOR_X_REM * remPx;
          anchorY = SETTLEMENT_ANCHOR_Y_REM * remPx;
        } else {
          const node = plateNodesRef.current.get(cell.key);
          if (node) {
            anchorX = node.offsetWidth / 2;
            anchorY = node.offsetHeight / 2;
          }
        }
        return {
          k: cell.key,
          x: cell.x,
          y: cell.y,
          w: cell.width,
          h: cell.height,
          ax: anchorX,
          ay: anchorY,
        };
      });

      void Promise.resolve(engine.call('GlanceAtlasLayout', {
        layoutRevision: layout.revision,
        snapshotRevision: layout.snapshotRevision,
        atlasWidth: ATLAS_WIDTH,
        atlasHeight: ATLAS_HEIGHT,
        cells,
      })).catch((error) => acknowledgeBridgeFailure(error, 'GlanceAtlasLayout'));
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (innerFrameId) {
        window.cancelAnimationFrame(innerFrameId);
      }
    };
  }, [layout]);

  // Stable per-cell ref callbacks so memoized plates skip re-rendering when only sibling
  // content changed.
  const makePlateRef = (key: string) => (node: HTMLDivElement | null) => {
    if (node) {
      plateNodesRef.current.set(key, node);
    } else {
      plateNodesRef.current.delete(key);
    }
  };

  if (!data || layouts.length === 0) {
    return <div className="glance-atlas-root" />;
  }

  // Every resident generation renders into its own region; keys are revision-scoped so React
  // never MOVES a plate between regions (moving damage-clears the source region while the
  // engine may still be sampling it).
  return (
    <div className="glance-atlas-root">
      {layouts.map((generation) => generation.cells.map((cell) => {
        // Content resolves through the persistent id cache: entities briefly absent from the
        // current catalogue keep their last-known plate instead of blanking a cell the engine
        // is still compositing.
        const entry = entryCache.get(cell.section)?.get(cell.id);
        if (!entry) {
          return null;
        }
        const flags = flagsByKey.get(cell.key);
        const isNewest = generation.revision === layouts[0].revision;
        return (
          <div
            key={`${generation.revision}:${cell.key}`}
            className="glance-atlas-cell"
            style={{ left: cell.x, top: cell.y, width: cell.width, height: cell.height }}
          >
            <GlanceAtlasPlate
              section={cell.section}
              entry={entry}
              detail={cell.detail}
              selected={flags?.selected === true}
              targeted={flags?.targeted === true}
              plateRef={isNewest ? makePlateRef(cell.key) : noopPlateRef}
            />
          </div>
        );
      }))}
    </div>
  );
}

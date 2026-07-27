import { memo, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { GetWorldGlancesResponse } from '../../bridge-types.generated.ts';
import { useUIScale } from '../../bridge/core/useUIScale';
import { UI_PRESENTATION } from '../../config/presentation';
import { NATIVE_BRIDGE_PROTOCOL } from '../../native-bridge-protocol.generated';
import { mapNotificationShown, onNotificationAnchorsFrame } from '../../bridge/app/useNotificationsBridge';
import {
  WORLD_GLANCE_FRAME_SECTIONS,
  makeWorldGlanceFrameEntryScratch,
  onWorldGlancesFrame,
  readWorldGlanceFrameEntry,
  useWorldGlancesBridge,
  worldGlanceFrameEntryCount,
  handleWorldGlanceHover,
  handleWorldGlanceInput,
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
import type { Notification } from '../../data/types';
import NotificationBanner from '../notifications/NotificationBanner';
import { prepareWorldAnchorContentChange } from '../../runtime/worldAnchorContentChanges';
import { useWorldAnchorRasterScale } from '../../runtime/worldAnchorRasterScale';
import type { WorldGlanceDetailClass } from './WorldGlanceTypes';
import ArmyGlance from './ArmyGlance';
import BattleGlance from './BattleGlance';
import ConvoyGlance from './ConvoyGlance';
import NavyGlance from './NavyGlance';
import PortGlance from './PortGlance';
import SettlementGlance from './SettlementGlance';
import ModWorldGlanceLayer from './ModWorldGlanceLayer';
import './WorldGlances.css';
import '../notifications/NotificationStack.css';
import './GlanceAtlas.css';

// Renders one plate per catalogued glance entity / active notification with Webkiln anchor
// attributes. Webkiln owns atlas packing and paint-safe layout hand-off; this component owns
// CONTENT only — which plates exist, their detail class, selection/hover styling.

const SETTLEMENT_BADGE_HALF_SIZE_REM = 2.1364;
const SETTLEMENT_ATLAS_EDGE_BLEED_REM = 0.0909;
// The siege progress track and capital socket sit above the settlement plate's layout box.
// Reserve that transparent space for every settlement so a state change cannot be clipped by
// the already-packed atlas cell.
const SETTLEMENT_STATUS_TOP_BLEED_REM = 0.4545;
// Covers the furthest military crown socket (1.5rem) plus a small atlas edge guard.
const MILITARY_ATLAS_BLEED_REM = 1.5909;
// Admitted settlement cells keep one stable footprint across flag/name/detail changes so their
// atlas coordinates remain valid until the next paint-safe admission generation becomes active.
const SETTLEMENT_NAMED_ATLAS_CAPACITY_WIDTH_REM = 15.1818;
const SETTLEMENT_NAMED_ATLAS_CAPACITY_HEIGHT_REM = 4.2727;
const MILITARY_ATLAS_CAPACITY_REM = 9;
const CONVOY_ATLAS_LEFT_BLEED_REM = 0.75;
const CONVOY_ATLAS_RIGHT_BLEED_REM = 8.75;
const CONVOY_ATLAS_TOP_BLEED_REM = 0.75;
const CONVOY_ATLAS_BOTTOM_BLEED_REM = 1.75;
const CONVOY_DETAILED_SIZE_REM = 4.9091;
const CONVOY_NAME_SIZE_REM = 4.1364;
const CONVOY_FLAG_SIZE_REM = 4.1364;

// Anchor constants mirror the DOM overlay's settlement transform offset (negated); every other
// world kind is centre-anchored, notifications bottom-centre.
const SETTLEMENT_ANCHOR_X_REM = 1.9091;
const SETTLEMENT_ANCHOR_Y_REM = 2.1364;

type AtlasSection = WorldGlanceFrameSection | 'notification';
const ATLAS_SECTIONS: readonly AtlasSection[] = [...WORLD_GLANCE_FRAME_SECTIONS, 'notification'];

interface SettlementBuildItemFrame {
  hasBuildItem: boolean;
  progress: number;
}

// Anchor keys are the modder-facing contract with the engine compositor: an engine placement
// source must emit the same key for the element to be drawn.
function worldAnchorKey(section: AtlasSection, id: string): string {
  return section === 'notification' ? `notif:${id}` : `glance:${section}:${id}`;
}

function worldSectionEntries(data: GetWorldGlancesResponse, section: WorldGlanceFrameSection): { id: string }[] {
  if (section === 'settlement') return data.settlements;
  if (section === 'port') return data.ports;
  if (section === 'convoy') return data.convoys;
  if (section === 'army') return data.armies;
  if (section === 'navy') return data.navies;
  return data.battles;
}

function currentRuntimeRootFontPx(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--runtime-root-font-size');
  return Number.parseFloat(value) || UI_PRESENTATION.rootFontSizePx;
}

function convoyMarkerSizeRem(detail: WorldGlanceDetailClass): number {
  if (detail === 'detail-flag') return CONVOY_FLAG_SIZE_REM;
  if (detail === 'detail-name') return CONVOY_NAME_SIZE_REM;
  return CONVOY_DETAILED_SIZE_REM;
}

function anchorPointFor(section: AtlasSection, detail: WorldGlanceDetailClass, remPx: number, settlementBleedRem: number): string {
  if (section === 'settlement') {
    return `${((SETTLEMENT_ANCHOR_X_REM + settlementBleedRem) * remPx).toFixed(2)},${((SETTLEMENT_ANCHOR_Y_REM + settlementBleedRem) * remPx).toFixed(2)}`;
  }
  if (section === 'convoy') {
    const markerHalfSize = convoyMarkerSizeRem(detail) / 2;
    return `${((CONVOY_ATLAS_LEFT_BLEED_REM + markerHalfSize) * remPx).toFixed(2)},${((CONVOY_ATLAS_TOP_BLEED_REM + markerHalfSize) * remPx).toFixed(2)}`;
  }
  if (section === 'notification') {
    return '50% 100%';
  }
  if (section === 'army' || section === 'navy') {
    const anchor = (MILITARY_ATLAS_CAPACITY_REM * 0.5 * remPx).toFixed(2);
    return `${anchor},${anchor}`;
  }
  return 'center';
}

function reserveSizeForSection(section: AtlasSection, remPx: number, settlementBleedRem: number, garrisonIndex: number): string | undefined {
  if (section === 'settlement') {
    const widthRem = SETTLEMENT_NAMED_ATLAS_CAPACITY_WIDTH_REM + settlementBleedRem * 2;
    const heightRem = SETTLEMENT_NAMED_ATLAS_CAPACITY_HEIGHT_REM + settlementBleedRem * 2;
    return `${(widthRem * remPx).toFixed(2)},${(heightRem * remPx).toFixed(2)}`;
  }
  if (section === 'army' || section === 'navy') {
    const width = (MILITARY_ATLAS_CAPACITY_REM * remPx).toFixed(2);
    const heightRem = MILITARY_ATLAS_CAPACITY_REM + Math.max(0, garrisonIndex) * 1.3636;
    return `${width},${(heightRem * remPx).toFixed(2)}`;
  }
  if (section === 'convoy') {
    const widthRem = CONVOY_ATLAS_LEFT_BLEED_REM + CONVOY_DETAILED_SIZE_REM + CONVOY_ATLAS_RIGHT_BLEED_REM;
    const heightRem = CONVOY_ATLAS_TOP_BLEED_REM + CONVOY_DETAILED_SIZE_REM + CONVOY_ATLAS_BOTTOM_BLEED_REM;
    return `${(widthRem * remPx).toFixed(2)},${(heightRem * remPx).toFixed(2)}`;
  }
  return undefined;
}

const GlanceAtlasPlate = memo(function GlanceAtlasPlate({ section, id, entry, detail, selected, targeted, hovered, buildItemFrame, remPx, rasterScale, plateRef, atlasVisible }: {
  section: AtlasSection;
  id: string;
  entry: unknown;
  detail: WorldGlanceDetailClass;
  selected: boolean;
  targeted: boolean;
  hovered: boolean;
  buildItemFrame?: SettlementBuildItemFrame;
  remPx: number;
  rasterScale: number;
  plateRef: (key: string, node: HTMLDivElement | null) => void;
  atlasVisible: boolean;
}) {
  const anchorKey = worldAnchorKey(section, id);
  const settlementBleedRem = section === 'settlement'
    ? Math.max(
      SETTLEMENT_STATUS_TOP_BLEED_REM,
      ((entry as GetWorldGlancesResponse['settlements'][number]).badgeScale > 1
        ? (((entry as GetWorldGlancesResponse['settlements'][number]).badgeScale - 1) * SETTLEMENT_BADGE_HALF_SIZE_REM) + SETTLEMENT_ATLAS_EDGE_BLEED_REM
        : 0),
    )
    : 0;
  const militaryEntry = section === 'army' || section === 'navy'
    ? entry as GetWorldGlancesResponse['armies'][number]
    : null;
  const garrisonIndex = militaryEntry?.garrisoned ? militaryEntry.garrisonIndex ?? 0 : 0;
  const reserveSize = reserveSizeForSection(section, remPx, settlementBleedRem, garrisonIndex);
  const anchorAttributes = {
    'data-webkiln-anchor': anchorKey,
    'data-webkiln-anchor-point': anchorPointFor(section, detail, remPx, settlementBleedRem),
    'data-webkiln-anchor-raster-scale': rasterScale,
    ...(section === 'notification'
      ? { 'data-webkiln-anchor-persistent': true }
      : { 'data-webkiln-anchor-demand': atlasVisible ? 'visible' : 'hidden' }),
    ...(reserveSize ? { 'data-webkiln-anchor-reserve-size': reserveSize } : {}),
  };
  const style = {
    '--glance-atlas-raster-scale': rasterScale,
    '--settlement-atlas-bleed': `${settlementBleedRem}rem`,
    '--military-atlas-bleed': `${section === 'army' || section === 'navy' ? MILITARY_ATLAS_BLEED_REM : 0}rem`,
    '--garrison-stack-offset': `${garrisonIndex * 1.3636}rem`,
    '--convoy-atlas-left-bleed': `${CONVOY_ATLAS_LEFT_BLEED_REM}rem`,
    '--convoy-atlas-right-bleed': `${CONVOY_ATLAS_RIGHT_BLEED_REM}rem`,
    '--convoy-atlas-top-bleed': `${CONVOY_ATLAS_TOP_BLEED_REM}rem`,
    '--convoy-atlas-bottom-bleed': `${CONVOY_ATLAS_BOTTOM_BLEED_REM}rem`,
  } as CSSProperties;
  const setNode = (node: HTMLDivElement | null) => plateRef(anchorKey, node);
  const interactiveProps = section === 'notification' ? {} : {
    onPointerEnter: () => handleWorldGlanceHover(section, id, true),
    onPointerLeave: () => handleWorldGlanceHover(section, id, false),
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 2) return;
      event.preventDefault();
      handleWorldGlanceInput(section, id, event.button === 2 ? 'right' : 'left', event.shiftKey);
    },
    onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => event.preventDefault(),
  };

  if (section === 'notification') {
    return (
      <div
        ref={setNode}
        className="world-glance world-glance-node world-glance-node--notification detail-flag glance-atlas-plate glance-atlas-notification-plate"
        style={style}
        {...anchorAttributes}
      >
        <div className="settlement-notification-slot notification-slot notification-slot--regular">
          <NotificationBanner notification={entry as Notification} onClose={() => {}} />
        </div>
      </div>
    );
  }

  let content: ReactNode = null;
  if (section === 'settlement') {
    const settlementData = mapSettlement(entry as GetWorldGlancesResponse['settlements'][number]);
    if (buildItemFrame) {
      settlementData.buildItem = buildItemFrame.hasBuildItem && settlementData.buildItem
        ? {
            label: settlementData.buildItem.label,
            icon: settlementData.buildItem.icon,
            progress: buildItemFrame.progress,
          }
        : undefined;
    }
    content = <SettlementGlance data={settlementData} />;
  }
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
  if (hovered) classes.push('is-hovered');
  if (militaryEntry?.garrisoned) classes.push('is-garrisoned');
  const wrapperIsHitTarget = section !== 'army' && section !== 'navy';

  return (
    <div ref={setNode} className={classes.join(' ')} style={style} {...anchorAttributes} {...interactiveProps}>
      <div className="glance-tip world-glance-tip" data-webkiln-anchor-hit={wrapperIsHitTarget || undefined}>{content}</div>
    </div>
  );
});

export default function GlanceAtlasRoot() {
  const uiScale = useUIScale();
  const rasterScale = useWorldAnchorRasterScale();
  const data = useWorldGlancesBridge();

  const detailByKeyRef = useRef<Map<string, WorldGlanceDetailClass>>(new Map());
  const flagsByKeyRef = useRef<Map<string, { selected: boolean; targeted: boolean }>>(new Map());
  const buildItemFrameByKeyRef = useRef<Map<string, SettlementBuildItemFrame>>(new Map());
  const plateNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const visibleAtlasKeysRef = useRef<Set<string>>(new Set());
  const notificationContentSignatureRef = useRef('');
  // Last known entry per entity: plates keep rendering through brief catalogue churn (fog
  // flicker, event latency) instead of blanking a cell the engine is still compositing.
  const entryCacheRef = useRef<Map<AtlasSection, Map<string, { id: string }>>>(new Map());

  const [detailByKey, setDetailByKey] = useState<Map<string, WorldGlanceDetailClass>>(new Map());
  const [flagsByKey, setFlagsByKey] = useState<Map<string, { selected: boolean; targeted: boolean }>>(new Map());
  const [buildItemFrameByKey, setBuildItemFrameByKey] = useState<Map<string, SettlementBuildItemFrame>>(new Map());
  const [hoveredKeys, setHoveredKeys] = useState<Set<string>>(new Set());
  const [visibleAtlasKeys, setVisibleAtlasKeys] = useState<Set<string>>(new Set());
  const [entryCache, setEntryCache] = useState<Map<AtlasSection, Map<string, { id: string }>>>(new Map());
  const [notificationEntries, setNotificationEntries] = useState<Notification[]>([]);
  const [runtimeRootFontPx, setRuntimeRootFontPx] = useState(() => currentRuntimeRootFontPx());
  const remPx = runtimeRootFontPx * (uiScale ?? 1);

  const plateRef = (key: string, node: HTMLDivElement | null) => {
    if (node) {
      plateNodesRef.current.set(key, node);
    } else {
      plateNodesRef.current.delete(key);
    }
  };

  // Fold new catalogue entries into the persistent cache (see comment above).
  useEffect(() => {
    let changed = false;
    for (const section of ATLAS_SECTIONS) {
      let sectionCache = entryCacheRef.current.get(section);
      if (!sectionCache) {
        sectionCache = new Map();
        entryCacheRef.current.set(section, sectionCache);
        changed = true;
      }
      const entries = section === 'notification'
        ? notificationEntries
        : (data ? worldSectionEntries(data, section) : []);
      for (const entry of entries) {
        if (entry?.id) {
          const previousEntry = sectionCache.get(entry.id);
          if (previousEntry !== entry) {
            const key = worldAnchorKey(section, entry.id);
            const node = plateNodesRef.current.get(key);
            if (previousEntry && node && (section === 'notification' || visibleAtlasKeysRef.current.has(key))) {
              prepareWorldAnchorContentChange(node);
            }
            changed = true;
          }
          sectionCache.set(entry.id, entry);
        }
      }
    }
    if (changed) {
      setEntryCache(new Map(
        Array.from(entryCacheRef.current.entries(), ([section, sectionCache]) => [section, new Map(sectionCache)]),
      ));
    }
  }, [data, notificationEntries]);

  // Runtime viewport scale changes rem sizing: plates resize (the host repacks via its
  // ResizeObserver) and settlement anchor points must be restated in fresh px.
  useEffect(() => {
    const onRuntimeViewport = () => setRuntimeRootFontPx(currentRuntimeRootFontPx());
    window.addEventListener('webkiln:runtime-viewport', onRuntimeViewport);
    return () => window.removeEventListener('webkiln:runtime-viewport', onRuntimeViewport);
  }, []);

  // Engine-side hover forwarding (native composite input path).
  useEffect(() => {
    const onHover = (event: Event) => {
      const args = (event as CustomEvent<{ args?: unknown[] }>).detail?.args;
      const section = args?.[0];
      const id = args?.[1];
      const hovered = args?.[2];
      if (typeof section !== 'string' || typeof id !== 'string' || typeof hovered !== 'boolean') {
        return;
      }
      if (!WORLD_GLANCE_FRAME_SECTIONS.includes(section as WorldGlanceFrameSection)) {
        return;
      }
      const key = worldAnchorKey(section as AtlasSection, id);
      setHoveredKeys((previous) => {
        const contains = previous.has(key);
        if (contains === hovered) {
          return previous;
        }
        const next = new Set(previous);
        if (hovered) next.add(key);
        else next.delete(key);
        return next;
      });
    };

    window.addEventListener(NATIVE_BRIDGE_PROTOCOL.events.worldGlanceHover, onHover);
    return () => window.removeEventListener(NATIVE_BRIDGE_PROTOCOL.events.worldGlanceHover, onHover);
  }, []);

  // Notification anchor frames define which notification plates are live.
  useEffect(() => onNotificationAnchorsFrame((frame) => {
    const contentSignature = frame.settlements
      .map(entry => `${entry.id}\u0000${entry.payloadJson}`)
      .join('\u0001');
    if (contentSignature === notificationContentSignatureRef.current) {
      return;
    }
    notificationContentSignatureRef.current = contentSignature;
    setNotificationEntries(frame.settlements.map(entry => mapNotificationShown(entry.payload)));
  }), []);

  // Frame events drive admission, detail level, and selection/target styling. The catalogue DOM
  // remains stable while the double-buffered atlas admits the camera-visible subset.
  useEffect(() => {
    const scratch = makeWorldGlanceFrameEntryScratch();
    return onWorldGlancesFrame((frame) => {
      let detailChanged = false;
      let flagsChanged = false;
      let constructionChanged = false;
      const nextVisibleKeys = new Set<string>();
      for (const section of WORLD_GLANCE_FRAME_SECTIONS) {
        const count = worldGlanceFrameEntryCount(frame, section);
        for (let index = 0; index < count; index += 1) {
          const entry = readWorldGlanceFrameEntry(frame, section, index, scratch);
          if (!entry || !entry.id) continue;
          const key = worldAnchorKey(section, entry.id);
          const atlasVisible =
            (entry.opacity ?? 0) > UI_PRESENTATION.worldAnchors.visibleOpacityThreshold;

          if (atlasVisible) {
            nextVisibleKeys.add(key);
          }

          if (section === 'settlement' && typeof entry.hasBuildItem === 'boolean') {
            const nextBuildItemFrame = {
              hasBuildItem: entry.hasBuildItem,
              progress: Math.max(0, Math.min(1, entry.buildItemProgress!)),
            };
            const buildItemFrame = buildItemFrameByKeyRef.current.get(key);
            if (!buildItemFrame
              || buildItemFrame.hasBuildItem !== nextBuildItemFrame.hasBuildItem
              || buildItemFrame.progress !== nextBuildItemFrame.progress) {
              const node = plateNodesRef.current.get(key);
              if (node && atlasVisible) {
                prepareWorldAnchorContentChange(node);
              }
              buildItemFrameByKeyRef.current.set(key, nextBuildItemFrame);
              constructionChanged = true;
            }
          }

          const nextDetail = detailClass(entry.detailLevel);
          if (detailByKeyRef.current.get(key) !== nextDetail) {
            const node = plateNodesRef.current.get(key);
            if (node && atlasVisible) {
              prepareWorldAnchorContentChange(node);
            }
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
      const previousVisibleKeys = visibleAtlasKeysRef.current;
      const visibilityChanged = previousVisibleKeys.size !== nextVisibleKeys.size
        || Array.from(nextVisibleKeys).some(key => !previousVisibleKeys.has(key));
      visibleAtlasKeysRef.current = nextVisibleKeys;

      if (detailChanged) {
        setDetailByKey(new Map(detailByKeyRef.current));
      }
      if (flagsChanged) {
        setFlagsByKey(new Map(flagsByKeyRef.current));
      }
      if (constructionChanged) {
        setBuildItemFrameByKey(new Map(buildItemFrameByKeyRef.current));
      }
      if (visibilityChanged) {
        setVisibleAtlasKeys(nextVisibleKeys);
      }
    });
  }, []);

  return (
    <>
      {ATLAS_SECTIONS.map((section) => {
        const sectionCache = entryCache.get(section);
        if (!sectionCache) {
          return null;
        }
        if (section !== 'notification' && !data) {
          return null;
        }
        // World plates retain their DOM node and atlas identity after first discovery. The native
        // frame changes demand as the camera moves; mounting only the latest catalogue would
        // continuously recycle cells and let an older painted layout sample replacement content.
        const renderedEntries = section === 'notification'
          ? notificationEntries
          : Array.from(sectionCache.values());
        return renderedEntries.map((entry) => {
          if (!entry?.id) {
            return null;
          }
          const cached = sectionCache.get(entry.id) ?? entry;
          const key = worldAnchorKey(section, entry.id);
          const flags = flagsByKey.get(key);
          return (
            <GlanceAtlasPlate
              key={key}
              section={section}
              id={entry.id}
              entry={cached}
              detail={detailByKey.get(key) ?? 'detail-flag'}
              selected={flags?.selected === true}
              targeted={flags?.targeted === true}
              hovered={hoveredKeys.has(key)}
              buildItemFrame={section === 'settlement' ? buildItemFrameByKey.get(key) : undefined}
              remPx={remPx}
              rasterScale={rasterScale}
              plateRef={plateRef}
              atlasVisible={section === 'notification' || visibleAtlasKeys.has(key)}
            />
          );
        });
      })}
      <ModWorldGlanceLayer atlas />
    </>
  );
}

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

interface SettlementFrameOverlay {
  besieged?: boolean;
  siegeProgress?: number;
  hasBuildItem?: boolean;
  buildProgress?: number;
}

interface BattleFrameOverlay {
  attackerStrength: number;
  attackerMorale: number;
  attackerLastLosses: number;
  defenderStrength: number;
  defenderMorale: number;
  defenderLastLosses: number;
}

const SETTLEMENT_FRAME_PROGRESS_EPSILON = 0.0001;
const BATTLE_FRAME_MORALE_EPSILON = 0.001;

function finiteUnit(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numeric));
}

function settlementFrameOverlayChanged(
  previous: SettlementFrameOverlay | undefined,
  next: SettlementFrameOverlay,
): boolean {
  if (!previous) {
    return true;
  }
  if (previous.besieged !== next.besieged || previous.hasBuildItem !== next.hasBuildItem) {
    return true;
  }
  if (
    typeof next.siegeProgress === 'number'
    && Math.abs((previous.siegeProgress ?? 0) - next.siegeProgress) > SETTLEMENT_FRAME_PROGRESS_EPSILON
  ) {
    return true;
  }
  if (
    typeof next.buildProgress === 'number'
    && Math.abs((previous.buildProgress ?? 0) - next.buildProgress) > SETTLEMENT_FRAME_PROGRESS_EPSILON
  ) {
    return true;
  }
  return false;
}

function battleFrameOverlayChanged(
  previous: BattleFrameOverlay | undefined,
  next: BattleFrameOverlay,
): boolean {
  if (!previous) {
    return true;
  }
  return previous.attackerStrength !== next.attackerStrength
    || Math.abs(previous.attackerMorale - next.attackerMorale) > BATTLE_FRAME_MORALE_EPSILON
    || previous.attackerLastLosses !== next.attackerLastLosses
    || previous.defenderStrength !== next.defenderStrength
    || Math.abs(previous.defenderMorale - next.defenderMorale) > BATTLE_FRAME_MORALE_EPSILON
    || previous.defenderLastLosses !== next.defenderLastLosses;
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

const GlanceAtlasPlate = memo(function GlanceAtlasPlate({ section, id, entry, detailClassName, selected, targeted, hovered, settlementFrame, battleFrame, remPx, rasterScale, plateRef, atlasVisible }: {
  section: AtlasSection;
  id: string;
  entry: unknown;
  detailClassName: WorldGlanceDetailClass;
  selected: boolean;
  targeted: boolean;
  hovered: boolean;
  settlementFrame?: SettlementFrameOverlay;
  battleFrame?: BattleFrameOverlay;
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
  // Armies and navies pack before dense settlement plates so a full atlas cannot strand a
  // military glance that is on-camera while lower-priority cells keep retained slots.
  const packPriority = section === 'army' || section === 'navy'
    ? 20
    : section === 'battle'
      ? 15
      : section === 'port' || section === 'convoy'
        ? 5
        : 0;
  const anchorAttributes = {
    'data-webkiln-anchor': anchorKey,
    'data-webkiln-anchor-point': anchorPointFor(section, detailClassName, remPx, settlementBleedRem),
    'data-webkiln-anchor-raster-scale': rasterScale,
    ...(section === 'notification'
      ? { 'data-webkiln-anchor-persistent': true }
      : {
        'data-webkiln-anchor-demand': atlasVisible ? 'visible' : 'hidden',
        'data-webkiln-anchor-priority': packPriority,
      }),
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
    if (settlementFrame) {
      if (typeof settlementFrame.besieged === 'boolean') {
        settlementData.besieged = settlementFrame.besieged;
        settlementData.siegeProgress = settlementFrame.siegeProgress ?? 0;
        settlementData.health = settlementFrame.besieged ? 1 - settlementData.siegeProgress : 1;
      }
      if (typeof settlementFrame.hasBuildItem === 'boolean') {
        settlementData.buildItem = settlementFrame.hasBuildItem && settlementData.buildItem
          ? {
              label: settlementData.buildItem.label,
              icon: settlementData.buildItem.icon,
              progress: settlementFrame.buildProgress ?? settlementData.buildItem.progress,
            }
          : undefined;
      }
    }
    content = <SettlementGlance data={settlementData} />;
  }
  else if (section === 'port') content = <PortGlance data={mapPort(entry as GetWorldGlancesResponse['ports'][number])} />;
  else if (section === 'convoy') content = <ConvoyGlance data={mapConvoy(entry as GetWorldGlancesResponse['convoys'][number])} />;
  else if (section === 'army') content = <ArmyGlance data={mapMilitary(entry as GetWorldGlancesResponse['armies'][number])} />;
  else if (section === 'navy') content = <NavyGlance data={mapNavy(entry as GetWorldGlancesResponse['navies'][number])} />;
  else {
    const battleData = mapBattle(entry as GetWorldGlancesResponse['battles'][number]);
    if (battleFrame) {
      battleData.attacker = {
        ...battleData.attacker,
        totalStrength: battleFrame.attackerStrength,
        morale: battleFrame.attackerMorale,
        lastLosses: battleFrame.attackerLastLosses,
      };
      battleData.defender = {
        ...battleData.defender,
        totalStrength: battleFrame.defenderStrength,
        morale: battleFrame.defenderMorale,
        lastLosses: battleFrame.defenderLastLosses,
      };
    }
    content = <BattleGlance data={battleData} />;
  }

  const classes = [
    'world-glance',
    'world-glance-node',
    `world-glance-node--${section}`,
    detailClassName,
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
  const settlementFrameByKeyRef = useRef<Map<string, SettlementFrameOverlay>>(new Map());
  const battleFrameByKeyRef = useRef<Map<string, BattleFrameOverlay>>(new Map());
  const plateNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const visibleAtlasKeysRef = useRef<Set<string>>(new Set());
  const notificationContentSignatureRef = useRef('');
  // Last known entry per entity: plates keep rendering through brief catalogue churn (fog
  // flicker, event latency) instead of blanking a cell the engine is still compositing.
  const entryCacheRef = useRef<Map<AtlasSection, Map<string, { id: string }>>>(new Map());

  const [detailByKey, setDetailByKey] = useState<Map<string, WorldGlanceDetailClass>>(new Map());
  const [flagsByKey, setFlagsByKey] = useState<Map<string, { selected: boolean; targeted: boolean }>>(new Map());
  const [settlementFrameByKey, setSettlementFrameByKey] = useState<Map<string, SettlementFrameOverlay>>(new Map());
  const [battleFrameByKey, setBattleFrameByKey] = useState<Map<string, BattleFrameOverlay>>(new Map());
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
    const opacityThreshold = UI_PRESENTATION.worldAnchors.visibleOpacityThreshold;
    let pendingDetail = false;
    let pendingFlags = false;
    let pendingSettlementFrame = false;
    let pendingBattleFrame = false;
    let pendingVisibility: Set<string> | null = null;
    let flushFrame: number | null = null;

    const flushFrameState = () => {
      flushFrame = null;
      if (pendingDetail) {
        pendingDetail = false;
        setDetailByKey(new Map(detailByKeyRef.current));
      }
      if (pendingFlags) {
        pendingFlags = false;
        setFlagsByKey(new Map(flagsByKeyRef.current));
      }
      if (pendingSettlementFrame) {
        pendingSettlementFrame = false;
        setSettlementFrameByKey(new Map(settlementFrameByKeyRef.current));
      }
      if (pendingBattleFrame) {
        pendingBattleFrame = false;
        setBattleFrameByKey(new Map(battleFrameByKeyRef.current));
      }
      if (pendingVisibility) {
        const nextVisible = pendingVisibility;
        pendingVisibility = null;
        setVisibleAtlasKeys(nextVisible);
      }
    };

    const scheduleFrameStateFlush = () => {
      if (flushFrame !== null) {
        return;
      }
      flushFrame = window.requestAnimationFrame(flushFrameState);
    };

    const unsubscribeFrame = onWorldGlancesFrame((frame) => {
      const nextVisibleKeys = new Set<string>();
      for (const section of WORLD_GLANCE_FRAME_SECTIONS) {
        const count = worldGlanceFrameEntryCount(frame, section);
        for (let index = 0; index < count; index += 1) {
          const entry = readWorldGlanceFrameEntry(frame, section, index, scratch);
          if (!entry || !entry.id) continue;
          const key = worldAnchorKey(section, entry.id);
          // Armies/navies/battles always demand when framed. Settlements/ports/convoys only demand
          // when their zoom-fade opacity is high enough to paint - faded settlement plates were
          // filling the atlas and stranding military glances that should stay visible.
          const alwaysDemand = section === 'army' || section === 'navy' || section === 'battle';
          if (alwaysDemand || (entry.opacity ?? 0) > opacityThreshold) {
            nextVisibleKeys.add(key);
          }

          if (section === 'settlement') {
            const nextSettlementFrame: SettlementFrameOverlay = {
              besieged: typeof entry.besieged === 'boolean' ? entry.besieged : undefined,
              siegeProgress: typeof entry.siegeProgress === 'number'
                ? finiteUnit(entry.siegeProgress)
                : undefined,
              hasBuildItem: typeof entry.hasBuildItem === 'boolean' ? entry.hasBuildItem : undefined,
              buildProgress: typeof entry.buildItemProgress === 'number'
                ? finiteUnit(entry.buildItemProgress)
                : undefined,
            };
            const previousSettlementFrame = settlementFrameByKeyRef.current.get(key);
            if (settlementFrameOverlayChanged(previousSettlementFrame, nextSettlementFrame)) {
              const node = plateNodesRef.current.get(key);
              if (node) {
                prepareWorldAnchorContentChange(node);
              }
              settlementFrameByKeyRef.current.set(key, nextSettlementFrame);
              pendingSettlementFrame = true;
            }
          }

          if (
            section === 'battle'
            && entry.attackerStrength !== undefined
            && entry.attackerMorale !== undefined
            && entry.attackerLastLosses !== undefined
            && entry.defenderStrength !== undefined
            && entry.defenderMorale !== undefined
            && entry.defenderLastLosses !== undefined
          ) {
            const nextBattleFrame: BattleFrameOverlay = {
              attackerStrength: entry.attackerStrength,
              attackerMorale: entry.attackerMorale,
              attackerLastLosses: entry.attackerLastLosses,
              defenderStrength: entry.defenderStrength,
              defenderMorale: entry.defenderMorale,
              defenderLastLosses: entry.defenderLastLosses,
            };
            const previousBattleFrame = battleFrameByKeyRef.current.get(key);
            if (battleFrameOverlayChanged(previousBattleFrame, nextBattleFrame)) {
              const node = plateNodesRef.current.get(key);
              if (node) {
                prepareWorldAnchorContentChange(node);
              }
              battleFrameByKeyRef.current.set(key, nextBattleFrame);
              pendingBattleFrame = true;
            }
          }

          const nextDetail = detailClass(entry.detailLevel);
          if (detailByKeyRef.current.get(key) !== nextDetail) {
            const node = plateNodesRef.current.get(key);
            if (node) {
              prepareWorldAnchorContentChange(node);
            }
            detailByKeyRef.current.set(key, nextDetail);
            pendingDetail = true;
          }

          const selected = entry.selected === true;
          const targeted = entry.targeted === true;
          const flags = flagsByKeyRef.current.get(key);
          if (!flags || flags.selected !== selected || flags.targeted !== targeted) {
            flagsByKeyRef.current.set(key, { selected, targeted });
            pendingFlags = true;
          }
        }
      }

      const previousVisibleKeys = visibleAtlasKeysRef.current;
      const visibilityChanged = previousVisibleKeys.size !== nextVisibleKeys.size
        || Array.from(nextVisibleKeys).some(key => !previousVisibleKeys.has(key))
        || Array.from(previousVisibleKeys).some(key => !nextVisibleKeys.has(key));
      if (visibilityChanged) {
        visibleAtlasKeysRef.current = nextVisibleKeys;
        pendingVisibility = nextVisibleKeys;
      }

      if (
        pendingDetail
        || pendingFlags
        || pendingSettlementFrame
        || pendingBattleFrame
        || pendingVisibility
      ) {
        scheduleFrameStateFlush();
      }
    });

    return () => {
      unsubscribeFrame();
      if (flushFrame !== null) {
        window.cancelAnimationFrame(flushFrame);
        flushFrame = null;
      }
    };
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
              detailClassName={detailByKey.get(key) ?? 'detail-flag'}
              selected={flags?.selected === true}
              targeted={flags?.targeted === true}
              hovered={hoveredKeys.has(key)}
              settlementFrame={section === 'settlement' ? settlementFrameByKey.get(key) : undefined}
              battleFrame={section === 'battle' ? battleFrameByKey.get(key) : undefined}
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

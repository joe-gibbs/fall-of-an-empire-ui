import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import ZoomPanCanvas, { type ZoomPanMetrics, type ZoomPanView } from '../../common/layout/scrolling/ZoomPanCanvas';
import GameButton from '../../common/buttons/GameButton';
import { useVictoryConditionsBridge } from '../../../bridge/app/useVictoryConditionsBridge';
import { useBridgeQuery } from '../../../bridge/core/useBridgeQuery';
import type { GetVictoryConditionsResponse, ScenarioOverviewMap, VictoryConditionProgressEntry } from '../../../bridge-types.generated.ts';
import { registerScreen } from '../../../registry';
import { usePlayerFactionId } from '../../../data-source';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../../utils/assets';
import { formatNumber } from '../../../utils/numberFormat';
import { victoryMapBounds, victoryMapProvinces, victoryMapBorders, type VictoryMapBorders, type VictoryMapBounds, type VictoryMapProvince } from './victoryMap';
import { drawVictoryMap, prepareVictoryMapDetail, victoryProvinceAt, type VictoryMapLayers } from './victoryMapRenderer';
import './VictoryConditionsScreen.css';

const TIER_COLOURS = ['#cf895b', '#9ebdd8', '#edcc69'];
const CONTROLLED_COLOUR = '#79ad83';
const tierColour = (index: number) => index < TIER_COLOURS.length ? TIER_COLOURS[index] : `hsl(${(index * 137.5) % 360} 55% 65%)`;
const mapResponse = (data: ScenarioOverviewMap) => data;
interface VictoryMapFrame { bounds: VictoryMapBounds | null }

function Requirement({ condition, focused, onFocus }: {
  condition: VictoryConditionProgressEntry;
  focused: string | null;
  onFocus: (id: string, indices: number[]) => void;
}) {
  const targets = condition.domains.flatMap(domain => domain.provinceIndices);
  const singlePlace = condition.domains.length === 1 ? condition.domains[0] : null;
  const progress = singlePlace
    ? webUIText('VictoryConditions.Count', { Current: formatNumber(singlePlace.controlledSettlements), Target: formatNumber(singlePlace.totalSettlements) })
    : condition.domains.length === 0 && ['survival', 'raiding-income', 'territory-count', 'religion'].includes(condition.kind)
      ? condition.detailText : '';
  const heading = <>
    <span>{condition.label}</span>
    {progress ? <span className="victory-place-progress">{progress}</span>
      : condition.isMet && <span className="victory-complete"><WebUIText textKey="Auto.Attr.ComponentsHudVictoryConditionsDropdown.59.1" /></span>}
  </>;
  return (
    <div className={`victory-requirement${condition.isMet ? ' victory-requirement--met' : ''}`}>
      {targets.length > 0 ? (
        <GameButton variant="ghost" fullWidth className="victory-requirement-focus"
          ariaPressed={focused === condition.id} onClick={() => onFocus(condition.id, targets)}>
          {heading}
        </GameButton>
      ) : <div className="victory-requirement-label">{heading}</div>}
      {condition.description && <p className="victory-requirement-description">{condition.description}</p>}
      {!singlePlace && condition.domains.map((place, index) => (
        <GameButton key={`${condition.id}:${index}`} variant="ghost" fullWidth
          className={`victory-place${place.isMet ? ' victory-place--met' : ''}`}
          disabled={place.provinceIndices.length === 0}
          ariaPressed={focused === `${condition.id}:${index}`}
          onClick={() => onFocus(`${condition.id}:${index}`, place.provinceIndices)}>
          <span className="victory-place-name">{place.name}</span>
          <span className="victory-place-progress">{webUIText('VictoryConditions.Count', { Current: formatNumber(place.controlledSettlements), Target: formatNumber(place.totalSettlements) })}</span>
        </GameButton>
      ))}
    </div>
  );
}

// The overlay canvas sits inside the pan/zoom content, so it moves and scales with the map image. It covers
// the view plus this share of the view on every side. It is redrawn in the same task that applies a new
// transform, so the two never show out of step: whenever the view leaves the drawn region, when a view
// settles at a new zoom, and during a wheel gesture once the zoom has drifted past this ratio.
const REGION_MARGIN = 0.5;
const GESTURE_ZOOM_RATIO = 1.5;
const MAX_CANVAS_PIXELS = 4096;

interface DrawnRegion { left: number; top: number; right: number; bottom: number; zoom: number }

const VictoryMapCanvas = memo(function VictoryMapCanvas({ map, provinces, borders, initialBounds, frame, focusedTier, onHover }: {
  map: ScenarioOverviewMap;
  provinces: VictoryMapProvince[];
  borders: VictoryMapBorders;
  initialBounds: VictoryMapBounds | null;
  frame: VictoryMapFrame | null;
  focusedTier: number | null;
  onHover: (name: string) => void;
}) {
  // Only explicit focus/reset navigation reframes an already open map.
  const [openingBounds] = useState(initialBounds);
  const initialView = useCallback(({ viewportWidth, viewportHeight, contentWidth, contentHeight }: ZoomPanMetrics) => {
    const area = (frame ? frame.bounds : openingBounds) ?? { minX: 0, minY: 0, maxX: contentWidth, maxY: contentHeight };
    const zoom = Math.min(viewportWidth / (area.maxX - area.minX + 96), viewportHeight / (area.maxY - area.minY + 96));
    return { zoom, panX: viewportWidth / 2 - (area.minX + area.maxX) / 2 * zoom,
      panY: viewportHeight / 2 - (area.minY + area.maxY) / 2 * zoom };
  }, [openingBounds, frame]);

  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layersRef = useRef<VictoryMapLayers>({ provinces, borders, focusedTier, tierColour, controlledColour: CONTROLLED_COLOUR });
  const viewRef = useRef<ZoomPanView | null>(null);
  const drawnRef = useRef<DrawnRegion | null>(null);
  const viewportRef = useRef({ width: 0, height: 0 });

  // Draw the view plus its margin into the canvas, at the detail and line widths for the current zoom.
  const drawRegion = useCallback(() => {
    const view = viewRef.current;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!view || !canvas || viewport.width === 0 || viewport.height === 0) return;
    const spanX = viewport.width / view.zoom;
    const spanY = viewport.height / view.zoom;
    const left = Math.max(0, -view.panX / view.zoom - spanX * REGION_MARGIN);
    const top = Math.max(0, -view.panY / view.zoom - spanY * REGION_MARGIN);
    const right = Math.min(map.width, -view.panX / view.zoom + spanX * (1 + REGION_MARGIN));
    const bottom = Math.min(map.height, -view.panY / view.zoom + spanY * (1 + REGION_MARGIN));
    if (right <= left || bottom <= top) return;
    const screenWidth = (right - left) * view.zoom;
    const screenHeight = (bottom - top) * view.zoom;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_PIXELS / Math.max(screenWidth, screenHeight));
    // Resizing reallocates the backing store, so only touch the size when it changes.
    const backingWidth = Math.max(1, Math.round(screenWidth * pixelRatio));
    const backingHeight = Math.max(1, Math.round(screenHeight * pixelRatio));
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    canvas.style.left = `${left}px`;
    canvas.style.top = `${top}px`;
    canvas.style.width = `${right - left}px`;
    canvas.style.height = `${bottom - top}px`;
    drawVictoryMap(canvas.getContext('2d')!, map, layersRef.current, { scale: view.zoom, offsetX: -left * view.zoom,
      offsetY: -top * view.zoom, width: screenWidth, height: screenHeight, pixelRatio });
    drawnRef.current = { left, top, right, bottom, zoom: view.zoom };
  }, [map]);

  const handleViewFrame = useCallback((view: ZoomPanView, settled: boolean) => {
    viewRef.current = view;
    const drawn = drawnRef.current;
    const viewport = viewportRef.current;
    const left = -view.panX / view.zoom;
    const top = -view.panY / view.zoom;
    const right = left + viewport.width / view.zoom;
    const bottom = top + viewport.height / view.zoom;
    const zoomRatio = drawn ? view.zoom / drawn.zoom : 1;
    // Mid-gesture the canvas scales with the map; settled views are drawn at their exact zoom.
    const detailMatches = drawn && (settled ? zoomRatio === 1 : zoomRatio < GESTURE_ZOOM_RATIO && zoomRatio > 1 / GESTURE_ZOOM_RATIO);
    const covered = detailMatches
      && (left >= drawn.left || drawn.left === 0) && (top >= drawn.top || drawn.top === 0)
      && (right <= drawn.right || drawn.right === map.width) && (bottom <= drawn.bottom || drawn.bottom === map.height);
    if (!covered) drawRegion();
  }, [drawRegion, map]);

  useLayoutEffect(() => {
    const frameElement = frameRef.current!;
    viewportRef.current = { width: frameElement.clientWidth, height: frameElement.clientHeight };
  }, []);

  useLayoutEffect(() => {
    layersRef.current = { provinces, borders, focusedTier, tierColour, controlledColour: CONTROLLED_COLOUR };
    drawRegion();
  }, [provinces, borders, focusedTier, drawRegion]);

  // Hover reads the province under the cursor once per frame, and redraws follow resizes of the map panel.
  useEffect(() => {
    const frameElement = frameRef.current!;
    const image = imageRef.current!;
    let frameId = 0;
    let pointer: { x: number; y: number } | null = null;
    let hoveredName = '';
    const setHovered = (name: string) => {
      if (name === hoveredName) return;
      hoveredName = name;
      onHover(name);
    };
    const hitTest = () => {
      frameId = 0;
      if (!pointer) return;
      const rect = image.getBoundingClientRect();
      const scale = rect.width / map.width;
      const province = victoryProvinceAt(map, layersRef.current.provinces, (pointer.x - rect.left) / scale, (pointer.y - rect.top) / scale);
      setHovered(province?.name ?? '');
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.buttons !== 0) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frameId === 0) frameId = requestAnimationFrame(hitTest);
    };
    const handlePointerLeave = () => {
      pointer = null;
      setHovered('');
    };
    frameElement.addEventListener('pointermove', handlePointerMove, { passive: true });
    frameElement.addEventListener('pointerleave', handlePointerLeave);
    const observer = new ResizeObserver(() => {
      viewportRef.current = { width: frameElement.clientWidth, height: frameElement.clientHeight };
      drawRegion();
    });
    observer.observe(frameElement);
    // Simplify the outlines for every zoom level while idle, so zooming never waits on that work.
    const prepareStep = prepareVictoryMapDetail(map, layersRef.current.provinces);
    let idleId = 0;
    const prepare = (deadline: IdleDeadline) => {
      idleId = prepareStep(() => deadline.timeRemaining() > 1) ? 0 : requestIdleCallback(prepare);
    };
    idleId = requestIdleCallback(prepare);
    return () => {
      if (frameId !== 0) cancelAnimationFrame(frameId);
      if (idleId !== 0) cancelIdleCallback(idleId);
      observer.disconnect();
      frameElement.removeEventListener('pointermove', handlePointerMove);
      frameElement.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [map, onHover, drawRegion]);

  return (
    <div ref={frameRef} className="victory-map-frame" role="img" aria-label={webUIText('VictoryConditions.Map')}>
      <ZoomPanCanvas className="victory-map"
        contentStyle={{ width: map.width, height: map.height, position: 'relative' }} initialView={initialView}
        minZoom={0.01} maxZoom={16} panMode="free" resetViewOnResize deferWheelViewState
        onViewFrame={handleViewFrame}
        controls={({ zoomIn, zoomOut }) => <div className="victory-map-zoom">
          <GameButton variant="burgundy" className="victory-map-zoom-button" icon="/assets/icons/I_Minus.png"
            ariaLabel={webUIText('FactionMilitary.ZoomOut')} onClick={zoomOut} />
          <GameButton variant="burgundy" className="victory-map-zoom-button" icon="/assets/icons/I_Plus.png"
            ariaLabel={webUIText('FactionMilitary.ZoomIn')} onClick={zoomIn} />
        </div>}>
        <img ref={imageRef} className="victory-map-image" src={WebkilnAssetPath(map.imageUrl)}
          width={map.width} height={map.height} alt="" draggable={false} />
        <canvas ref={canvasRef} className="victory-map-overlay" />
      </ZoomPanCanvas>
    </div>
  );
});

export function VictoryConditionsView({ victory, map, onClose }: {
  victory: GetVictoryConditionsResponse | null;
  map: ScenarioOverviewMap | null;
  onClose: () => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState('');
  const [frame, setFrame] = useState<VictoryMapFrame | null>(null);
  const provinces = useMemo(() => victory && map ? victoryMapProvinces(victory, map) : [], [victory, map]);
  const tierCount = victory?.tiers.length ?? 0;
  const borders = useMemo(() => map ? victoryMapBorders(map, provinces, tierCount) : null, [map, provinces, tierCount]);
  const focusedTierIndex = victory?.tiers.findIndex(tier => !tier.isAchieved && (focus === `tier:${tier.id}`
    || tier.conditions.some(condition => focus === condition.id || focus?.startsWith(`${condition.id}:`)))) ?? -1;
  const activeFocus = focusedTierIndex >= 0 ? focus : null;
  const bounds = useMemo(() => victoryMapBounds(provinces), [provinces]);
  const focusTargets = (id: string, indices: number[]) => {
    const targets = new Set(indices);
    setFocus(id);
    setFrame({ bounds: victoryMapBounds(provinces.filter(province => targets.has(province.provinceIndex))) });
  };

  return (
    <div className="victory-stage">
      <ScreenShell title={webUIText('Topbar.VictoryConditions')} onClose={onClose}
        className="screen--victory-conditions" contentClassName="victory-content">
        <StyledScrollArea className="victory-requirements" viewportClassName="victory-requirements-viewport">
          {victory && !victory.enabled && <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsHudVictoryConditionsDropdown.44.2" /></div>}
          {victory?.enabled && victory.tiers.length === 0 && <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsHudVictoryConditionsDropdown.48.3" /></div>}
          {victory?.enabled && victory.tiers.map((tier, index) => (
            <section className="victory-tier" key={tier.id}>
              <div className="victory-tier-heading">
                <img src={WebkilnAssetPath(tier.iconPath)} alt="" />
                <span className="victory-colour-key" style={{ backgroundColor: tierColour(index) }} />
                <h2><GameButton variant="ghost" className="victory-tier-focus"
                  disabled={tier.isAchieved || !tier.conditions.some(condition => condition.domains.length > 0)}
                  ariaPressed={activeFocus === `tier:${tier.id}`}
                  onClick={() => focusTargets(`tier:${tier.id}`, tier.conditions.flatMap(condition => condition.domains.flatMap(domain => domain.provinceIndices)))}>
                  {tier.name}
                </GameButton></h2>
                {tier.isAchieved && <span className="victory-complete"><WebUIText textKey="Auto.Attr.ComponentsHudVictoryConditionsDropdown.59.1" /></span>}
              </div>
              {!tier.isAchieved && tier.conditions.map(condition => <Requirement key={condition.id} condition={condition}
                focused={activeFocus} onFocus={focusTargets} />)}
            </section>
          ))}
        </StyledScrollArea>
        <div className="victory-map-panel">
          {map && victory && borders && (
            <VictoryMapCanvas key={map.mapId}
              map={map} provinces={provinces} borders={borders} initialBounds={bounds} frame={frame}
              focusedTier={focusedTierIndex >= 0 ? focusedTierIndex : null} onHover={setHoveredName} />
          )}
          <div className="victory-map-legend">
            {(['Regions', 'Lands', 'Domains'] as const).map((kind, index) => <span key={kind}>
              <svg width="24" height="12" aria-hidden="true"><path d="M1 6H23" stroke="#e4d6ad" strokeWidth={[0.65, 1.3, 2.5][index]} /></svg>
              <WebUIText textKey={`VictoryConditions.${kind}`} />
            </span>)}
            <span><svg width="24" height="12" aria-hidden="true"><path d="M1 6H23" stroke={CONTROLLED_COLOUR} strokeWidth="4.5" /></svg><WebUIText textKey="VictoryConditions.Controlled" /></span>
            <span><svg width="24" height="12" aria-hidden="true">{TIER_COLOURS.map((colour, index) => <path key={colour} d="M1 6H23" stroke={colour} strokeWidth="2.5" strokeDasharray="4 8" strokeDashoffset={index * 4} />)}</svg><WebUIText textKey="VictoryConditions.FutureGoals" /></span>
          </div>
          <div className="victory-map-toolbar">
            <span className="victory-map-place">{hoveredName}</span>
          </div>
        </div>
      </ScreenShell>
    </div>
  );
}

export default function VictoryConditionsScreen({ onClose }: { onClose: () => void }) {
  const playerFactionId = usePlayerFactionId();
  const victory = useVictoryConditionsBridge();
  const map = useBridgeQuery({ action: 'game.get_victory_map', map: mapResponse, cacheResponse: true });
  return <VictoryConditionsView key={`${playerFactionId}:${victory?.tiers.map(tier => tier.id).join(',')}`} victory={victory} map={map} onClose={onClose} />;
}

registerScreen({ id: 'victory', render: ({ onClose }) => <VictoryConditionsScreen onClose={onClose} />,
  topbarId: 'victory', overlayVariant: 'victory' });

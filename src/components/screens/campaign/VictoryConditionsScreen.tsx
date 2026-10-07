import { memo, useCallback, useMemo, useState } from 'react';
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
import { victoryMapBounds, victoryMapProvinces, victoryMapBorders, type VictoryMapBounds, type VictoryMapProvince } from './victoryMap';
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

const VictoryMapFills = memo(function VictoryMapFills({ provinces, focusedTier, onHover }: {
  provinces: VictoryMapProvince[];
  focusedTier: number | null;
  onHover: (name: string) => void;
}) {
  return provinces.map(province => (
    <g key={province.provinceIndex} data-province-index={province.provinceIndex}
      data-controlled={province.isControlled} data-tiers={province.tierIndices.join(',')}
      onPointerEnter={() => onHover(province.name)} onPointerLeave={() => onHover('')}>
      <path d={province.fillPath} fillRule="evenodd" fill={province.isControlled ? CONTROLLED_COLOUR
        : tierColour(focusedTier !== null && province.tierIndices.includes(focusedTier) ? focusedTier : province.tierIndices[0])}
        fillOpacity={focusedTier !== null && !province.tierIndices.includes(focusedTier) ? 0.18 : province.isControlled ? 0.72 : 0.55} />
    </g>
  ));
});

const VictoryMapCanvas = memo(function VictoryMapCanvas({ map, provinces, borders, initialBounds, frame, focusedTier, onHover }: {
  map: ScenarioOverviewMap;
  provinces: VictoryMapProvince[];
  borders: ReturnType<typeof victoryMapBorders>;
  initialBounds: VictoryMapBounds | null;
  frame: VictoryMapFrame | null;
  focusedTier: number | null;
  onHover: (name: string) => void;
}) {
  const [mapZoom, setMapZoom] = useState(1);
  const updateMapZoom = useCallback(({ zoom }: ZoomPanView) => setMapZoom(zoom), []);
  // Only explicit focus/reset navigation reframes an already open map.
  const [openingBounds] = useState(initialBounds);
  const initialView = useCallback(({ viewportWidth, viewportHeight, contentWidth, contentHeight }: ZoomPanMetrics) => {
    const area = (frame ? frame.bounds : openingBounds) ?? { minX: 0, minY: 0, maxX: contentWidth, maxY: contentHeight };
    const zoom = Math.min(viewportWidth / (area.maxX - area.minX + 96), viewportHeight / (area.maxY - area.minY + 96));
    return { zoom, panX: viewportWidth / 2 - (area.minX + area.maxX) / 2 * zoom,
      panY: viewportHeight / 2 - (area.minY + area.maxY) / 2 * zoom };
  }, [openingBounds, frame]);
  return (
            <ZoomPanCanvas className="victory-map"
              contentStyle={{ width: map.width, height: map.height }} initialView={initialView}
              minZoom={0.01} maxZoom={16} panMode="free" resetViewOnResize deferWheelViewState
              onViewChange={updateMapZoom}
              controls={({ zoomIn, zoomOut }) => <div className="victory-map-zoom">
                <GameButton variant="burgundy" className="victory-map-zoom-button" icon="/assets/icons/I_Minus.png"
                  ariaLabel={webUIText('FactionMilitary.ZoomOut')} onClick={zoomOut} />
                <GameButton variant="burgundy" className="victory-map-zoom-button" icon="/assets/icons/I_Plus.png"
                  ariaLabel={webUIText('FactionMilitary.ZoomIn')} onClick={zoomIn} />
              </div>}
              onContentMouseLeave={() => onHover('')}>
              <svg width={map.width} height={map.height} viewBox={`0 0 ${map.width} ${map.height}`}
                role="img" aria-label={webUIText('VictoryConditions.Map')}>
                <image href={WebkilnAssetPath(map.imageUrl)} width={map.width} height={map.height} />
                <VictoryMapFills provinces={provinces} focusedTier={focusedTier} onHover={onHover} />
                <g fill="none" pointerEvents="none">
                  <path data-border-layer="regions" d={borders.regions} stroke="#d8d0b7" strokeOpacity="0.45" strokeWidth={0.65 / mapZoom} />
                  <path data-border-layer="lands" d={borders.lands} stroke="#e4d6ad" strokeOpacity="0.7" strokeWidth={1.3 / mapZoom} />
                  <path data-border-layer="domains" d={borders.domains} stroke="#29231c" strokeWidth={3.4 / mapZoom} />
                  <path d={borders.domains} stroke="#f0e2bc" strokeWidth={1.8 / mapZoom} />
                  <path d={borders.held} stroke="#18261e" strokeWidth={6 / mapZoom} />
                  <path data-border-layer="held" d={borders.held} stroke={CONTROLLED_COLOUR} strokeWidth={4.5 / mapZoom} />
                  {borders.goals.map((path, tierIndex) => <path key={tierIndex} data-border-layer="goals" data-tier-index={tierIndex}
                    d={path} stroke={tierColour(tierIndex)} strokeWidth={(focusedTier === tierIndex ? 3.5 : 2.5) / mapZoom}
                    strokeDasharray={`${4 / mapZoom} ${8 / mapZoom}`} strokeDashoffset={tierIndex * 4 / mapZoom}
                    strokeOpacity={focusedTier !== null && focusedTier !== tierIndex ? 0.2 : 1} />)}
                </g>
              </svg>
            </ZoomPanCanvas>
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

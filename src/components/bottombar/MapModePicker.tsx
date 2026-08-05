import React, { useEffect, useMemo, useState } from 'react';
import { useMapModeBridge } from '../../bridge/military-map/useMapModeBridge';
import type { MapModeEntry } from '../../bridge-types.generated.ts';
import { useAnchoredDropdown } from '../../hooks/useAnchoredDropdown';
import { playSound } from '../../hooks/useSound';
import { webUIText } from '../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../utils/assets';
import {
  TUTORIAL_REVEAL_MAP_MODE_PICKER,
  type TutorialHudRevealDetail,
} from '../../utils/tutorialHudReveal';
import IconButton from '../common/buttons/IconButton';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../common/tooltips/Tooltip';
import { MAP_MODE_ICONS } from './mapModeIcons';
import { MAP_MODE_TOOLTIPS } from './mapModeTooltipContent';
import './MapModePicker.css';

const ROWS: string[][][] = [
  [['overlord', 'diplomaticRelation', 'political', 'religion', 'culture', 'resources', 'militaries', 'unrest']],
  [['loyalty', 'landscape', 'economicProsperity', 'adminRegion', 'adminLand', 'adminDomain', 'disease', 'population']],
  [['regionGovernor', 'trade', 'corruption', 'stockpiles', 'garrisons', 'bishopric']],
];

const BASE_MODE_IDS = new Set(ROWS.reduce<string[]>((all, row) => {
  for (const group of row) all.push(...group);
  return all;
}, []));

const EXIT_DURATION_MS = 120;

function mapModeIcon(id: string): string {
  const icon = MAP_MODE_ICONS[id];
  if (icon) return WebkilnAssetPath(icon) ?? icon;
  if (BASE_MODE_IDS.has(id)) return '';
  const path = `/assets/map-modes/${id}.png`;
  return WebkilnAssetPath(path) ?? path;
}

function orderedModeIds(customModeIds: string[]): string[] {
  const ordered: string[] = [];
  for (const row of ROWS) {
    for (const group of row) ordered.push(...group);
  }
  for (const id of customModeIds) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

const MapModePicker: React.FC = () => {
  const { state, setMapMode } = useMapModeBridge();
  const active = state?.activeMode ?? '';
  const [open, setOpen] = useState(false);

  const customModeIds = useMemo(
    () => state?.modes.filter((mode) => !BASE_MODE_IDS.has(mode.id)).map((mode) => mode.id) ?? [],
    [state?.modes],
  );
  const modeIds = useMemo(() => orderedModeIds(customModeIds), [customModeIds]);

  const activeEntry: MapModeEntry | undefined = active ? state?.byId.get(active) : undefined;
  const activeLabel = activeEntry?.label || active || webUIText('Topbar.MapModes');

  const { mounted, closing, style, setTriggerRef, setPopupRef } = useAnchoredDropdown({
    open,
    onClose: () => setOpen(false),
    durationMs: EXIT_DURATION_MS,
    // Inline so the panel can sit above the bottom-right trigger via CSS.
    position: 'inline',
    offset: 6,
    maxPopupHeight: 360,
    escapeId: 'hud.map-mode-picker',
  });

  // Tutorial spotlight: open the compact map-mode list when a specific mode is targeted.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TutorialHudRevealDetail>).detail;
      if (!detail?.tokens?.length) return;
      setOpen(true);
    };
    window.addEventListener(TUTORIAL_REVEAL_MAP_MODE_PICKER, handler);
    return () => window.removeEventListener(TUTORIAL_REVEAL_MAP_MODE_PICKER, handler);
  }, []);

  const triggerTooltip = active
    ? (MAP_MODE_TOOLTIPS[active] ?? { title: activeLabel })
    : { title: webUIText('Topbar.MapModes') };

  return (
    <div
      className="map-mode-picker"
      ref={setTriggerRef as React.RefCallback<HTMLDivElement>}
      data-tutorial-target="MapModeButtonGroup"
    >
      <Tooltip content={triggerTooltip} position="left" delay={200} bubbleClassName="tt-bubble--map-mode">
        <div className="map-mode-picker-trigger-wrap">
          <IconButton
            icon={mapModeIcon(active)}
            label={activeLabel}
            active={open || Boolean(active)}
            className="map-mode-picker-trigger"
            tutorialTarget={active ? `MapMode:${active}` : 'MapModeButtonGroup'}
            onClick={() => {
              setOpen((v) => !v);
            }}
          />
        </div>
      </Tooltip>

      {mounted && (
        <div
          className={`map-mode-picker-panel${closing ? ' map-mode-picker-panel--exiting' : ''}`}
          ref={setPopupRef}
          style={style}
          role="menu"
          aria-label={webUIText('Topbar.MapModes')}
        >
          <StyledScrollArea className="map-mode-picker-scroll" viewportClassName="map-mode-picker-scroll-viewport" variant="inline">
            <div className="map-mode-picker-grid">
              {modeIds.map((id) => {
                const entry = state?.byId.get(id);
                const label = entry?.label ?? id;
                const isActive = active === id;
                const itemTooltip = MAP_MODE_TOOLTIPS[id] ?? { title: label };
                return (
                  <Tooltip
                    key={id}
                    content={itemTooltip}
                    position="left"
                    delay={200}
                    bubbleClassName="tt-bubble--map-mode"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className={`map-mode-picker-item${isActive ? ' map-mode-picker-item--active' : ''}`}
                      data-tutorial-target={`MapMode:${id}`}
                      onMouseDown={() => {
                        playSound('click');
                        setMapMode(id);
                        setOpen(false);
                      }}
                    >
                      <img src={mapModeIcon(id)} alt="" className="map-mode-picker-item-icon" />
                      <span className="map-mode-picker-item-label">{label}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </StyledScrollArea>
        </div>
      )}
    </div>
  );
};

export default React.memo(MapModePicker);

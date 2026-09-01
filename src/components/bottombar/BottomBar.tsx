import React, { useRef } from 'react';
import Tooltip from '../common/tooltips/Tooltip';
import IconButton from '../common/buttons/IconButton';
import { useMapModeBridge } from '../../bridge/military-map/useMapModeBridge';
import { useCompactHud } from '../../hooks/useCompactHud';
import type { MapModeEntry } from '../../bridge-types.generated.ts';
import { mapModeTooltipForMode } from './mapModeTooltipContent';
import { MAP_MODE_ICONS } from './mapModeIcons';
import ConvoyFilterPanel from './ConvoyFilterPanel';
import GlanceToggleBar from './GlanceToggleBar';
import MapModeFilterPanel from './MapModeFilterPanel';
import MapModePicker from './MapModePicker';
import OperationBar from './OperationBar';
import './BottomBar.css';

const ROWS: string[][][] = [
  [['overlord', 'diplomaticRelation', 'political', 'religion', 'culture', 'resources', 'militaries', 'unrest']],
  [['loyalty', 'landscape', 'economicProsperity', 'adminRegion', 'adminLand', 'adminDomain', 'disease', 'population']],
  [['regionGovernor', 'luxury', 'trade', 'corruption', 'stockpiles', 'garrisons', 'bishopric']],
];

const BASE_MODE_IDS = new Set(ROWS.reduce<string[]>((all, row) => {
  for (const group of row) all.push(...group);
  return all;
}, []));

function mapModeIcon(id: string): string {
  const icon = MAP_MODE_ICONS[id];
  if (icon) return icon;
  if (BASE_MODE_IDS.has(id)) return '';
  return `/assets/map-modes/${id}.png`;
}

function mapModeTooltipContent(id: string, label: string, entry?: MapModeEntry): React.ReactNode {
  return mapModeTooltipForMode(id, label, entry);
}

const BottomBar: React.FC = () => {
  const compact = useCompactHud();
  const { state, setMapMode } = useMapModeBridge();
  const active = state?.activeMode ?? '';
  const trayRef = useRef<HTMLDivElement>(null);
  const customModeIds = state?.modes
    .filter((mode) => !BASE_MODE_IDS.has(mode.id))
    .map((mode) => mode.id) ?? [];
  const rows = customModeIds.length > 0
    ? [ROWS[0], ROWS[1], [...ROWS[2], customModeIds]]
    : ROWS;

  return (
    <div className={`bottombar${compact ? ' bottombar--compact' : ''}`}>
      <OperationBar />
      <MapModeFilterPanel />
      {active === 'resources' && <ConvoyFilterPanel />}
      {compact ? (
        <>
          <GlanceToggleBar />
          <MapModePicker />
        </>
      ) : (
        <div className="bottombar-tray" ref={trayRef} data-tutorial-target="MapModeButtonGroup">
          <GlanceToggleBar anchorRef={trayRef} />
          {rows.map((groups, ri) => (
            <div className="bottombar-row" key={ri}>
              {groups.map((ids, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <div className="bottombar-divider" />}
                  <div className="bottombar-group">
                    {ids.map((id) => {
                      const entry = state?.byId.get(id);
                      const label = entry?.label ?? id;
                      const content = mapModeTooltipContent(id, label, entry);
                      return (
                        <Tooltip
                          key={id}
                          content={content}
                          position="left"
                          anchorRef={trayRef}
                          bubbleClassName="tt-bubble--map-mode"
                        >
                          <IconButton
                            icon={mapModeIcon(id)}
                            label={label}
                            active={active === id}
                            tutorialTarget={`MapMode:${id}`}
                            onClick={() => setMapMode(id)}
                          />
                        </Tooltip>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(BottomBar);

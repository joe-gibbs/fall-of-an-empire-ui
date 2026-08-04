import React, { useRef } from 'react';
import Tooltip from '../common/tooltips/Tooltip';
import IconButton from '../common/buttons/IconButton';
import { ActionKeyGlyph } from '../common/ActionKeyGlyph';
import { useMapModeBridge } from '../../bridge/military-map/useMapModeBridge';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import type { MapModeEntry } from '../../bridge-types.generated.ts';
import { findActionBinding, getMapModeActionName } from '../../utils/actionBindings';
import { MAP_MODE_TOOLTIPS } from './mapModeTooltipContent';
import { MAP_MODE_ICONS } from './mapModeIcons';
import { MapModeTooltip, TTHeader } from './MapModeTooltip';
import ConvoyFilterPanel from './ConvoyFilterPanel';
import MapModeFilterPanel from './MapModeFilterPanel';
import OperationBar from './OperationBar';
import './BottomBar.css';

const ROWS: string[][][] = [
  [['overlord', 'diplomaticRelation', 'political', 'religion', 'culture', 'resources', 'militaries', 'unrest']],
  [['loyalty', 'landscape', 'economicProsperity', 'adminRegion', 'adminLand', 'adminDomain', 'disease', 'population']],
  [['regionGovernor', 'trade', 'corruption', 'stockpiles', 'garrisons', 'bishopric']],
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

/** Fallback tooltip for custom / uncatalogued map modes, with live KeyGlyph. */
function FallbackMapModeTooltip({
  id,
  label,
  entry,
}: {
  id: string;
  label: string;
  entry?: MapModeEntry;
}) {
  const { settings } = useSettingsBridge();
  const binding = findActionBinding(settings?.controls, getMapModeActionName(id));
  const body = entry?.tooltip || entry?.description;

  return (
    <MapModeTooltip>
      <TTHeader>{label}</TTHeader>
      {body && <p>{body}</p>}
      {binding && (
        <div className="mmtt-shortcut">
          <ActionKeyGlyph binding={binding} />
        </div>
      )}
    </MapModeTooltip>
  );
}

function mapModeTooltipContent(id: string, label: string, entry?: MapModeEntry): React.ReactNode {
  const fixedContent = MAP_MODE_TOOLTIPS[id];
  if (fixedContent) return fixedContent;
  return <FallbackMapModeTooltip id={id} label={label} entry={entry} />;
}

const BottomBar: React.FC = () => {
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
    <div className="bottombar">
      <OperationBar />
      <MapModeFilterPanel />
      {active === 'resources' && <ConvoyFilterPanel />}
      <div className="bottombar-tray" ref={trayRef} data-tutorial-target="MapModeButtonGroup">
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
    </div>
  );
};

export default React.memo(BottomBar);

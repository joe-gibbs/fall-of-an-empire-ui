import { useMemo, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import Tooltip from '../../common/tooltips/Tooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import ZoomPanCanvas from '../../common/layout/scrolling/ZoomPanCanvas';
import { useGameActions } from '../../../context/GameContext';
import { useFaction, useFactionMilitaryOverview } from '../../../data-source/index';
import type { MilitaryOverview } from '../../../data/types';
import { registerScreen } from '../../../registry/index';
import { designRem, designUnitScale } from '../../../utils/cssUnits';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { type Force, subtree } from './forces';
import {
  CANVAS_PAD,
  CHART_ZOOM_STEP,
  MAX_CHART_ZOOM,
  MIN_CHART_ZOOM,
  layoutTree,
} from './forceTreeLayout';
import {
  HIGHLIGHT_OPTIONS,
  NodeCard,
  buildChartInitialView,
  matchesHighlight,
  type HighlightKey,
} from './ForceTreeParts';
import { webUIText } from '../../../localization/WebUITextContext';
import './MilitaryScreen.css';
import './FactionMilitaryScreen.css';

type FactionMilitaryTab = 'land' | 'sea';

const SWORDS_ICON = '/assets/icons/I_Swords.png';

function FactionMilitaryStats({
  overview,
  view,
}: {
  overview: MilitaryOverview | null;
  view: FactionMilitaryTab;
}) {
  const naval = view === 'sea';
  const strength = naval ? overview?.totalNavyStrength ?? 0 : overview?.totalArmyStrength ?? 0;
  const maxStrength = naval ? overview?.totalNavyMaxStrength ?? 0 : overview?.totalArmyMaxStrength ?? 0;
  const percent = maxStrength > 0 ? strength / maxStrength * 100 : 0;
  const label = webUIText(naval ? 'MilitaryScreen.NavalStrength' : 'MilitaryScreen.LandStrength');
  const body = naval
    ? webUIText('MilitaryScreen.NavalManpowerBody', { Value1: formatNumber(maxStrength), Value2: formatPercent(percent) })
    : webUIText('MilitaryScreen.LandManpowerBody', { Value1: formatNumber(maxStrength), Value2: formatPercent(percent) });

  return (
    <div className="chart-empire-stats">
      <Tooltip content={{ title: label, body }}>
        <div className="chart-empire-stats-main">
          <img className="chart-empire-stats-icon" src={SWORDS_ICON} alt="" draggable={false} />
          <span className="chart-empire-stats-label">{label}</span>
          <span className="chart-empire-stats-value">{formatNumber(strength)}</span>
        </div>
      </Tooltip>
    </div>
  );
}

export default function FactionMilitaryScreen({
  screenId,
  onClose,
}: {
  screenId: string | null;
  onClose: () => void;
}) {
  const { openSidebar } = useGameActions();
  const faction = useFaction(screenId, 'summary');
  const data = useFactionMilitaryOverview(screenId);
  const [view, setView] = useState<FactionMilitaryTab>('land');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<HighlightKey>(null);
  const allForces = useMemo(
    () => (data?.overview.forces as Force[] | undefined) ?? [],
    [data],
  );
  const forces = useMemo(
    () => allForces.filter(force => view === 'sea' ? force.isNavy : !force.isNavy),
    [allForces, view],
  );
  const layout = useMemo(() => layoutTree(forces), [forces]);
  const chartInitialView = useMemo(() => buildChartInitialView(), []);
  const factionName = data?.factionName || faction?.name || webUIText('Common.Unknown');

  const commandChainIds = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set(subtree(forces, selectedId).map(force => force.id));
    let current = forces.find(force => force.id === selectedId);
    while (current?.parentId) {
      ids.add(current.parentId);
      current = forces.find(force => force.id === current!.parentId);
    }
    return ids;
  }, [forces, selectedId]);

  const tabs = [
    { id: 'land', label: webUIText('FactionMilitary.Land') },
    { id: 'sea', label: webUIText('FactionMilitary.Naval') },
  ];

  return (
    <ScreenShell
      title={webUIText('FactionMilitary.Title', { Faction: factionName })}
      onClose={onClose}
      className="chart-screen faction-military-screen"
      contentClassName="chart-content"
      tabs={<SidebarTabBar tabs={tabs} activeTab={view} onTabChange={(id) => {
        setView(id as FactionMilitaryTab);
        setSelectedId(null);
      }} />}
    >
      <div className="chart-header-extra">
        <div className="faction-military-identity">
          <FactionRoundel
            factionId={screenId ?? undefined}
            name={factionName}
            size="sm"
            onClick={() => screenId && openSidebar('diplomacy', screenId)}
          />
          <span className="faction-military-name">{factionName}</span>
        </div>
        {data?.canViewFullDetails && (
          <>
            <span className="chart-highlight-label">{webUIText('FactionMilitary.Highlight')}</span>
            <div className="chart-highlight-group">
          <Tooltip content={{ title: webUIText('FactionMilitary.HighlightAll'), body: webUIText('FactionMilitary.HighlightAllBody') }}>
            <button
              type="button"
              className={`chart-highlight-btn chart-highlight-btn--text${highlight === null ? ' is-active' : ''}`}
              onClick={() => setHighlight(null)}
            >
              {webUIText('FactionMilitary.All')}
            </button>
          </Tooltip>
          {HIGHLIGHT_OPTIONS.map(option => (
            <Tooltip key={String(option.key)} content={{ title: option.label, body: option.desc }}>
              <button
                type="button"
                className={`chart-highlight-btn${highlight === option.key ? ' is-active' : ''}`}
                onClick={() => setHighlight(option.key)}
                aria-label={option.label}
              >
                <img src={option.icon} alt="" className="chart-highlight-icon" draggable={false} />
              </button>
            </Tooltip>
          ))}
            </div>
          </>
        )}
        <FactionMilitaryStats overview={data?.overview ?? null} view={view} />
      </div>

      {forces.length === 0 ? (
        <div className="chart-viewport faction-military-empty">
          <div className="faction-military-empty-message">
            {webUIText(view === 'sea' ? 'FactionMilitary.NoNavalForces' : 'FactionMilitary.NoLandForces', { Faction: factionName })}
          </div>
        </div>
      ) : (
        <ZoomPanCanvas
          key={view}
          className="chart-viewport"
          contentClassName="chart-inner"
          contentStyle={{
            width: designRem(layout.width),
            height: designRem(layout.height),
          }}
          initialView={chartInitialView}
          minZoom={MIN_CHART_ZOOM}
          maxZoom={MAX_CHART_ZOOM}
          zoomStep={CHART_ZOOM_STEP}
          deferWheelViewState
          panMode="bounded"
          panMarginPx={CANVAS_PAD * designUnitScale()}
          ignoreLeftDragFrom={(target) => Boolean(target.closest('.chart-node-wrap'))}
          onContentLeftClick={() => setSelectedId(null)}
          controls={({ zoom, zoomIn, zoomOut }) => (
            <div className="chart-zoom-float">
              <Tooltip content={webUIText('FactionMilitary.ZoomOut')}>
                <button type="button" className="chart-zoom-btn" onClick={zoomOut} aria-label={webUIText('FactionMilitary.ZoomOut')}>
                  <img src="/assets/icons/I_Minus.png" alt="" className="chart-zoom-icon" draggable={false} />
                </button>
              </Tooltip>
              <span className="chart-zoom-val">{Math.round(zoom * 100)}%</span>
              <Tooltip content={webUIText('FactionMilitary.ZoomIn')}>
                <button type="button" className="chart-zoom-btn" onClick={zoomIn} aria-label={webUIText('FactionMilitary.ZoomIn')}>
                  <img src="/assets/icons/I_Plus.png" alt="" className="chart-zoom-icon" draggable={false} />
                </button>
              </Tooltip>
            </div>
          )}
        >
          <svg className="chart-lines" width={designRem(layout.width)} height={designRem(layout.height)} viewBox={`0 0 ${layout.width} ${layout.height}`}>
            <g>
              {layout.lines.map((line, index) => {
                const midX = (line.x1 + line.x2) / 2;
                const active = commandChainIds?.has(line.parentId) && commandChainIds.has(line.childId);
                const path = `M ${line.x1.toFixed(1)} ${line.y1.toFixed(1)} L ${midX.toFixed(1)} ${line.y1.toFixed(1)} L ${midX.toFixed(1)} ${line.y2.toFixed(1)} L ${line.x2.toFixed(1)} ${line.y2.toFixed(1)}`;
                return (
                  <path
                    key={index}
                    d={path}
                    fill="none"
                    stroke={active ? 'var(--gold-light)' : 'rgba(201,168,76,0.6)'}
                    strokeWidth={active ? 2.2 : 1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>
          </svg>
          {layout.nodes.map(node => {
            const inChain = !commandChainIds || commandChainIds.has(node.force.id);
            const matches = matchesHighlight(node.force, highlight);
            return (
              <div
                key={node.force.id}
                className="chart-node-wrap"
                data-id={node.force.id}
                style={{ left: designRem(node.x), top: designRem(node.y), width: designRem(node.w), height: designRem(node.h) }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedId(node.force.id);
                }}
              >
                <NodeCard
                  force={node.force}
                  allForces={allForces}
                  selected={selectedId === node.force.id}
                  highlighted={highlight !== null && matches}
                  dimmed={!inChain || (highlight !== null && !matches)}
                  readOnly
                  showDetailedStats={data?.canViewFullDetails ?? false}
                />
              </div>
            );
          })}
        </ZoomPanCanvas>
      )}
    </ScreenShell>
  );
}

registerScreen({
  id: 'factionMilitary',
  render: ({ screenId, onClose }) => <FactionMilitaryScreen key={screenId ?? 'none'} screenId={screenId} onClose={onClose} />,
  bridgeNames: ['factionmilitary', 'foreignmilitary'],
});

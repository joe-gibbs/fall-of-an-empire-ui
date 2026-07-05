import React from 'react';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import { useGameActions } from '../../../context/GameContext';
import { zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { useSelectedMilitaries } from '../../../data-source/index';
import { registerSidebar } from '../../../registry/index';
import type { MilitaryDoctrine, MilitaryForce } from '../../../data/types';
import { formatNumber } from '../../../utils/numberFormat';
import { webUIText } from '../../../localization/WebUITextContext';
import SidebarToolbar from '../shared/SidebarToolbar';
import '../shared/Sidebar.css';
import './MilitarySelectionSidebar.css';

function getStrengthColor(ratio: number): string {
  if (ratio >= 0.8) return 'var(--green)';
  if (ratio >= 0.5) return 'var(--yellow)';
  return 'var(--red)';
}

function getStrengthBarColor(ratio: number): 'green' | 'red' {
  return ratio > 0.5 ? 'green' : 'red';
}

function formatStrength(value: number, max: number): string {
  return `${formatNumber(value)}/${formatNumber(max)}`;
}

function doctrineLabel(doctrine: MilitaryDoctrine): string {
  return webUIText(`Military.Selection.Doctrine.${doctrine}`);
}

function formatSupplyDays(days: number): string {
  if (days <= 0) {
    return webUIText('Military.Selection.NoSupply');
  }
  return webUIText('Military.Selection.SupplyDays', { Days: formatNumber(days) });
}

function buildForceTooltip(force: MilitaryForce): TooltipContent {
  const ratio = force.maxStrength > 0 ? force.strength / force.maxStrength : 0;
  return {
    title: force.name,
    body: force.commanderName || force.location,
    lines: [
      { label: webUIText('Military.Selection.Tooltip.Commander'), value: force.commanderName || webUIText('Common.NoCommander') },
      { label: webUIText('Military.Selection.Tooltip.Rank'), value: force.rank },
      { label: webUIText('Military.Selection.Tooltip.Location'), value: force.location || '-' },
      { label: webUIText('Military.Selection.Tooltip.Order'), value: force.currentOrder || '-' },
      { label: webUIText('Military.Selection.Tooltip.Strength'), value: formatStrength(force.strength, force.maxStrength), valueColor: getStrengthColor(ratio) },
      { label: webUIText('Military.Selection.Tooltip.Morale'), value: `${formatNumber(force.morale)}%`, valueColor: getStrengthColor(force.morale / 100) },
      { label: webUIText('Military.Selection.Tooltip.Supply'), value: formatSupplyDays(force.supplyDays) },
      { label: webUIText('Military.Selection.Tooltip.Template'), value: force.template || '-' },
      {
        label: webUIText('Military.Selection.Tooltip.Command'),
        value: force.delegated
          ? webUIText('Military.Selection.Command.Delegated', { Doctrine: doctrineLabel(force.doctrine) })
          : webUIText('Military.Selection.Command.Direct'),
      },
    ],
  };
}

function MilitarySelectionSidebar({ onClose }: { sidebarId: string | null; onClose: () => void }) {
  const { openSidebar } = useGameActions();
  const selectedForces = useSelectedMilitaries() ?? [];

  const totals = selectedForces.reduce((acc, force) => ({
    strength: acc.strength + force.strength,
    maxStrength: acc.maxStrength + force.maxStrength,
  }), { strength: 0, maxStrength: 0 });

  if (selectedForces.length === 0) {
    return null;
  }

  const totalRatio = totals.maxStrength > 0 ? totals.strength / totals.maxStrength : 0;
  const totalStrengthLabel = webUIText('Military.Selection.TotalStrength', { Strength: formatNumber(totals.strength), MaxStrength: formatNumber(totals.maxStrength) });

  return (
    <div className="sidebar sidebar--left sidebar--visible military-selection-sidebar">
      <SidebarToolbar onClose={onClose} />

      <div className="mil-selection-hero">
        <div className="mil-selection-hero-title">{webUIText('Military.Selection.Count', { Count: formatNumber(selectedForces.length) })}</div>
        <div className="mil-selection-total">
          <div className="mil-selection-total-row">
            <img src="/assets/icons/I_Swords.png" alt="" />
            <span style={{ color: getStrengthColor(totalRatio) }}>
              {totalStrengthLabel}
            </span>
          </div>
          <PaintedBar percent={totalRatio * 100} color={getStrengthBarColor(totalRatio)} />
        </div>
      </div>

      <StyledScrollArea className="sidebar-content sidebar-content--textured mil-selection-content">
        <div className="mil-selection-list">
          {selectedForces.map((force) => {
            const ratio = force.maxStrength > 0 ? force.strength / force.maxStrength : 0;
            return (
              <Tooltip
                key={force.id}
                content={buildForceTooltip(force)}
                position="right"
                variant="sidebar"
                delay={450}
              >
                <div
                  className="mil-selection-row"
                  onMouseDown={() => openSidebar('military', force.id)}
                >
                  <img src={force.isNavy ? "/assets/icons/I_NaviesQuickButton.png" : "/assets/icons/I_ArmiesQuickButton.png"} alt="" className="mil-selection-icon" />
                  <div className="mil-selection-main">
                    <div className="mil-selection-title-row">
                      <span className="mil-selection-name">{force.name}</span>
                      <span className="mil-selection-strength" style={{ color: getStrengthColor(ratio) }}>{formatStrength(force.strength, force.maxStrength)}</span>
                    </div>
                    <div className="mil-selection-meta">{force.commanderName || force.location || force.rank}</div>
                    <PaintedBar percent={ratio * 100} color={getStrengthBarColor(ratio)} className="mil-selection-bar" />
                  </div>
                  <button
                    type="button"
                    className="mil-selection-zoom"
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      zoomToBridge('military', force.id);
                    }}
                  >
                    <img src="/assets/icons/I_ZoomTo.png" alt="" />
                  </button>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </StyledScrollArea>
    </div>
  );
}

export default React.memo(MilitarySelectionSidebar);

registerSidebar({
  id: 'military-selection',
  side: 'left',
  component: MilitarySelectionSidebar,
  advisorTopic: 'militarySidebar',
});

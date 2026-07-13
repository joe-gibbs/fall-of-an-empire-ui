import React, { useMemo } from 'react';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import { useGameActions } from '../../../context/GameContext';
import { zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { handleWorldGlanceInput } from '../../../bridge/app/useWorldGlancesBridge';
import { useSelectedMilitaries } from '../../../data-source/index';
import { registerSidebar } from '../../../registry/index';
import type { MilitaryDoctrine, MilitaryForce } from '../../../data/types';
import { formatNumber } from '../../../utils/numberFormat';
import { webUIText } from '../../../localization/WebUITextContext';
import { setSelectedMilitaryConnectorHover } from '../../hud/overlays/militarySelectionConnectorSignals';
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

interface SelectionBranch {
  force: MilitaryForce;
  children: SelectionBranch[];
}

const RANK_ORDER: Record<MilitaryForce['rank'], number> = {
  Dux: 0,
  Praefectus: 1,
  Legatus: 2,
};

function compareForces(left: MilitaryForce, right: MilitaryForce): number {
  return RANK_ORDER[left.rank] - RANK_ORDER[right.rank] || left.name.localeCompare(right.name);
}

function buildSelectionForest(forces: MilitaryForce[]): SelectionBranch[] {
  const branchById = new Map<string, SelectionBranch>();
  for (const force of forces) {
    branchById.set(force.id, { force, children: [] });
  }

  const roots: SelectionBranch[] = [];
  for (const force of forces) {
    const branch = branchById.get(force.id)!;
    const parent = force.parentId ? branchById.get(force.parentId) : undefined;
    if (parent) {
      parent.children.push(branch);
    } else {
      roots.push(branch);
    }
  }

  const sortBranch = (branch: SelectionBranch) => {
    branch.children.sort((left, right) => compareForces(left.force, right.force));
    branch.children.forEach(sortBranch);
  };
  roots.sort((left, right) => compareForces(left.force, right.force));
  roots.forEach(sortBranch);
  return roots;
}

function ForceBranch({ branch, depth, openMilitary }: {
  branch: SelectionBranch;
  depth: number;
  openMilitary: (id: string) => void;
}) {
  const { force } = branch;
  const ratio = force.maxStrength > 0 ? force.strength / force.maxStrength : 0;
  const kind = force.isNavy ? 'navy' : 'army';
  const detailLabel = webUIText(force.isNavy ? 'QuickInteraction.ViewFleet' : 'QuickInteraction.ViewArmy');
  const zoomLabel = webUIText(force.isNavy ? 'QuickInteraction.ZoomToFleet' : 'QuickInteraction.ZoomToArmy');

  return (
    <div className={`mil-selection-branch${depth > 0 ? ' mil-selection-branch--child' : ''}`}>
      <Tooltip content={buildForceTooltip(force)} position="right" variant="sidebar" delay={350}>
        <div
          className={`mil-selection-row mil-selection-row--rank-${force.rank.toLowerCase()}${force.attrition ? ' is-attrition' : ''}`}
          data-military-selection-node={force.id}
          onPointerEnter={() => setSelectedMilitaryConnectorHover(force.id)}
          onPointerLeave={() => setSelectedMilitaryConnectorHover(null)}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            handleWorldGlanceInput(kind, force.id, 'left', event.shiftKey);
          }}
        >
          <img src={force.isNavy ? "/assets/icons/I_NaviesQuickButton.png" : "/assets/icons/I_ArmiesQuickButton.png"} alt="" className="mil-selection-icon" />
          <div className="mil-selection-main">
            <div className="mil-selection-title-row">
              <span className="mil-selection-name">{force.name}</span>
              <span className="mil-selection-strength" style={{ color: getStrengthColor(ratio) }}>{formatStrength(force.strength, force.maxStrength)}</span>
            </div>
            <div className="mil-selection-meta">
              <span>{force.commanderName || webUIText('Common.NoCommander')}</span>
              <span className="mil-selection-rank">{force.rank}</span>
            </div>
            <PaintedBar percent={ratio * 100} color={getStrengthBarColor(ratio)} className="mil-selection-bar" />
            <div className="mil-selection-status-row">
              <span className="mil-selection-order">{force.currentOrder || force.location}</span>
              {force.attrition && (
                <span className="mil-selection-warning" aria-label={webUIText('Military.Selection.Attrition')}>
                  <img src="/assets/icons/Terrain/I_Attrition.png" alt="" />
                </span>
              )}
              <span className={`mil-selection-supply${force.supplyDays <= 7 ? ' is-low' : ''}`}>
                <img src="/assets/icons/I_Food.png" alt="" />
                {formatSupplyDays(force.supplyDays)}
              </span>
            </div>
          </div>
          <div className="mil-selection-actions">
            <button
              type="button"
              className="mil-selection-action"
              aria-label={detailLabel}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openMilitary(force.id);
              }}
            >
              <img src={force.isNavy ? "/assets/icons/I_NaviesQuickButton.png" : "/assets/icons/I_ArmiesQuickButton.png"} alt="" />
            </button>
            <button
              type="button"
              className="mil-selection-action"
              aria-label={zoomLabel}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                zoomToBridge('military', force.id);
              }}
            >
              <img src="/assets/icons/I_ZoomTo.png" alt="" />
            </button>
          </div>
        </div>
      </Tooltip>
      {branch.children.length > 0 && (
        <div className="mil-selection-children">
          {branch.children.map(child => (
            <ForceBranch key={child.force.id} branch={child} depth={depth + 1} openMilitary={openMilitary} />
          ))}
        </div>
      )}
    </div>
  );
}

function MilitarySelectionSidebar({ onClose }: { sidebarId: string | null; onClose: () => void }) {
  const { openSidebar } = useGameActions();
  const selectedForcesResult = useSelectedMilitaries();
  const selectedForces = useMemo(() => selectedForcesResult ?? [], [selectedForcesResult]);
  const selectionForest = useMemo(() => buildSelectionForest(selectedForces), [selectedForces]);

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
        <div className="mil-selection-chart">
          {selectionForest.map(branch => (
            <ForceBranch key={branch.force.id} branch={branch} depth={0} openMilitary={id => openSidebar('military', id)} />
          ))}
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

import React, { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import { useGameActions } from '../../../context/GameContext';
import { zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { handleWorldGlanceInput } from '../../../bridge/app/useWorldGlancesBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { setMilitaryParentBridge } from '../../../bridge/military-map/useMilitaryBridge';
import { useMilitaryOverview, useSelectedMilitaries } from '../../../data-source/index';
import {
  canDragMilitaryCommand,
  collectAssignableCommands,
  findCommandAssignmentTarget,
  markCommandDragConsumed,
  validateCommandAssignment,
  type CommandAssignmentForce,
} from '../../../utils/militaryCommandAssignment';
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

const DRAG_THRESHOLD = 6;

interface DragVisualState {
  sourceId: string | null;
  targetId: string | null;
  targetValid: boolean;
}

interface PendingDrag {
  pointerId: number;
  source: MilitaryForce;
  sourceElement: HTMLDivElement;
  startX: number;
  startY: number;
  shiftKey: boolean;
  canDrag: boolean;
  started: boolean;
}

function compareForces(left: MilitaryForce, right: MilitaryForce): number {
  const rankOrder: Record<MilitaryForce['rank'], number> = { Dux: 0, Praefectus: 1, Legatus: 2 };
  return rankOrder[left.rank] - rankOrder[right.rank] || left.name.localeCompare(right.name);
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

function assignmentCatalogue(
  selected: MilitaryForce[],
  overview: MilitaryForce[] | null | undefined,
): CommandAssignmentForce[] {
  const byId = new Map<string, CommandAssignmentForce>();
  for (const force of overview ?? []) {
    byId.set(force.id, force);
  }
  for (const force of selected) {
    byId.set(force.id, force);
  }
  return [...byId.values()];
}

function ForceBranch({
  branch,
  depth,
  dragVisual,
  openMilitary,
  onForcePointerDown,
  onDetach,
}: {
  branch: SelectionBranch;
  depth: number;
  dragVisual: DragVisualState;
  openMilitary: (id: string) => void;
  onForcePointerDown: (event: ReactPointerEvent<HTMLDivElement>, force: MilitaryForce) => void;
  onDetach: (force: MilitaryForce) => void;
}) {
  const { force } = branch;
  const ratio = force.maxStrength > 0 ? force.strength / force.maxStrength : 0;
  const detailLabel = webUIText(force.isNavy ? 'QuickInteraction.ViewFleet' : 'QuickInteraction.ViewArmy');
  const zoomLabel = webUIText(force.isNavy ? 'QuickInteraction.ZoomToFleet' : 'QuickInteraction.ZoomToArmy');
  const canDrag = canDragMilitaryCommand(force);
  const isDragSource = dragVisual.sourceId === force.id;
  const isDropTarget = dragVisual.targetId === force.id;

  return (
    <div className={`mil-selection-branch${depth > 0 ? ' mil-selection-branch--child' : ''}`}>
      <Tooltip content={buildForceTooltip(force)} position="right" variant="sidebar" delay={350} disabled={dragVisual.sourceId !== null}>
        <div
          className={`mil-selection-row mil-selection-row--rank-${force.rank.toLowerCase()}${force.attrition ? ' is-attrition' : ''}${canDrag ? ' is-draggable' : ''}${isDragSource ? ' is-drag-source' : ''}${isDropTarget ? (dragVisual.targetValid ? ' is-drop-target' : ' is-drop-invalid') : ''}`}
          data-military-selection-node={force.id}
          onPointerEnter={() => setSelectedMilitaryConnectorHover(force.id)}
          onPointerLeave={() => setSelectedMilitaryConnectorHover(null)}
          onPointerDown={(event) => onForcePointerDown(event, force)}
        >
          <img src={force.isNavy ? "/assets/icons/I_NaviesQuickButton.png" : "/assets/icons/I_ArmiesQuickButton.png"} alt="" className="mil-selection-icon" draggable={false} />
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
            {force.parentId && (
              <Tooltip
                content={{
                  title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.460.1'),
                  body: webUIText('Military.Selection.DetachDescription', {
                    Name: force.name,
                  }),
                }}
                position="right"
                delay={150}
              >
                <button
                  type="button"
                  className="mil-selection-action mil-selection-action--detach"
                  aria-label={webUIText('Military.Selection.DetachAria', { Name: force.name })}
                  disabled={!force.isPlayerControlled}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDetach(force);
                  }}
                >
                  <img src="/assets/icons/I_DetachCommand.png" alt="" />
                </button>
              </Tooltip>
            )}
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
            <ForceBranch
              key={child.force.id}
              branch={child}
              depth={depth + 1}
              dragVisual={dragVisual}
              openMilitary={openMilitary}
              onForcePointerDown={onForcePointerDown}
              onDetach={onDetach}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MilitarySelectionSidebar({ onClose }: { sidebarId: string | null; onClose: () => void }) {
  const { openSidebar } = useGameActions();
  const selectedForcesResult = useSelectedMilitaries();
  const overview = useMilitaryOverview();
  const serverForces = useMemo(() => selectedForcesResult ?? [], [selectedForcesResult]);
  const serverHierarchyKey = serverForces.map(force => `${force.id}:${force.parentId ?? ''}`).join('|');
  const [localHierarchy, setLocalHierarchy] = useState<{
    baseKey: string;
    forces: MilitaryForce[];
  } | null>(null);
  const selectedForces = localHierarchy?.baseKey === serverHierarchyKey
    ? localHierarchy.forces
    : serverForces;
  const selectionForest = useMemo(() => buildSelectionForest(selectedForces), [selectedForces]);
  const assignmentForces = useMemo(
    () => assignmentCatalogue(selectedForces, overview?.forces),
    [overview?.forces, selectedForces],
  );
  const forcesRef = useRef(selectedForces);
  const assignmentForcesRef = useRef(assignmentForces);
  const pendingDragRef = useRef<PendingDrag | null>(null);
  const dropTargetRef = useRef<CommandAssignmentForce | null>(null);
  const dragCopyRef = useRef<HTMLDivElement | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisualState>({ sourceId: null, targetId: null, targetValid: false });

  useEffect(() => {
    forcesRef.current = selectedForces;
  }, [selectedForces]);

  useEffect(() => {
    assignmentForcesRef.current = assignmentForces;
  }, [assignmentForces]);

  const removeDragCopy = useCallback(() => {
    dragCopyRef.current?.remove();
    dragCopyRef.current = null;
  }, []);

  const clearDrag = useCallback(() => {
    pendingDragRef.current = null;
    dropTargetRef.current = null;
    removeDragCopy();
    setDragVisual({ sourceId: null, targetId: null, targetValid: false });
    setSelectedMilitaryConnectorHover(null);
  }, [removeDragCopy]);

  const createDragCopy = useCallback((sourceElement: HTMLDivElement) => {
    const copy = sourceElement.cloneNode(true) as HTMLDivElement;
    copy.className = 'mil-selection-drag-copy';
    copy.removeAttribute('data-military-selection-node');
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelector('.mil-selection-actions')?.remove();
    copy.style.width = `${sourceElement.getBoundingClientRect().width}px`;
    copy.style.pointerEvents = 'none';
    document.body.appendChild(copy);
    dragCopyRef.current = copy;
    window.requestAnimationFrame(() => copy.classList.add('is-shown'));
  }, []);

  const moveDragCopy = useCallback((clientX: number, clientY: number) => {
    if (!dragCopyRef.current) return;
    dragCopyRef.current.style.transform = `translate3d(${clientX + 14}px, ${clientY + 10}px, 0) rotate(-2deg)`;
  }, []);

  const applyParentChange = useCallback((sourceId: string, parentId: string | null) => {
    const currentForces = forcesRef.current;
    const source = currentForces.find(force => force.id === sourceId);
    const previousParentId = source?.parentId ?? null;
    setLocalHierarchy({
      baseKey: serverHierarchyKey,
      forces: currentForces.map(force => {
        if (force.id === sourceId) return { ...force, parentId };
        if (force.id === previousParentId) {
          return { ...force, subordinateCount: Math.max(0, force.subordinateCount - 1) };
        }
        if (force.id === parentId) {
          return { ...force, subordinateCount: force.subordinateCount + 1 };
        }
        return force;
      }),
    });
    void setMilitaryParentBridge(sourceId, parentId).catch(error => {
      setLocalHierarchy(null);
      acknowledgeBridgeFailure(error, 'game.set_military_parent');
    });
  }, [serverHierarchyKey]);

  const applyParentChanges = useCallback((sourceIds: string[], parentId: string) => {
    const currentForces = forcesRef.current;
    const assigned = new Set(sourceIds);
    const previousParentCounts = new Map<string, number>();
    for (const sourceId of sourceIds) {
      const previousParentId = currentForces.find(force => force.id === sourceId)?.parentId;
      if (!previousParentId || assigned.has(previousParentId)) continue;
      previousParentCounts.set(previousParentId, (previousParentCounts.get(previousParentId) ?? 0) + 1);
    }
    setLocalHierarchy({
      baseKey: serverHierarchyKey,
      forces: currentForces.map(force => {
        if (assigned.has(force.id)) return { ...force, parentId };
        if (force.id === parentId) {
          return { ...force, subordinateCount: force.subordinateCount + sourceIds.length };
        }
        const detached = previousParentCounts.get(force.id);
        if (detached) {
          return { ...force, subordinateCount: Math.max(0, force.subordinateCount - detached) };
        }
        return force;
      }),
    });
    void Promise.all(sourceIds.map(sourceId => setMilitaryParentBridge(sourceId, parentId)))
      .catch(error => {
        setLocalHierarchy(null);
        acknowledgeBridgeFailure(error, 'game.set_military_parent');
      });
  }, [serverHierarchyKey]);

  const handleForcePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, source: MilitaryForce) => {
    if (event.button !== 0) return;
    pendingDragRef.current = {
      pointerId: event.pointerId,
      source,
      sourceElement: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      shiftKey: event.shiftKey,
      canDrag: canDragMilitaryCommand(source),
      started: false,
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (!pending || pending.pointerId !== event.pointerId) return;

      if (!pending.started) {
        const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
        if (distance <= DRAG_THRESHOLD || !pending.canDrag) return;
        pending.started = true;
        event.preventDefault();
        createDragCopy(pending.sourceElement);
        setDragVisual({ sourceId: pending.source.id, targetId: null, targetValid: false });
      }

      event.preventDefault();
      moveDragCopy(event.clientX, event.clientY);
      const pointedElement = document.elementFromPoint(event.clientX, event.clientY);
      const hit = findCommandAssignmentTarget(pointedElement);
      const target = hit
        ? assignmentForcesRef.current.find(force => force.id === hit.id) ?? null
        : null;
      const valid = target
        ? validateCommandAssignment(pending.source, target, assignmentForcesRef.current).ok
        : false;
      dropTargetRef.current = valid ? target : null;
      setDragVisual({
        sourceId: pending.source.id,
        targetId: target?.id ?? null,
        targetValid: valid,
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (!pending || pending.pointerId !== event.pointerId) return;
      const target = dropTargetRef.current;
      const wasDragging = pending.started;
      clearDrag();

      if (wasDragging) {
        event.preventDefault();
        markCommandDragConsumed();
        if (target) {
          const sources = collectAssignableCommands(
            forcesRef.current,
            pending.source.id,
            target,
            assignmentForcesRef.current,
          );
          if (sources.length > 0) {
            applyParentChanges(sources.map(force => force.id), target.id);
          }
        }
        return;
      }

      const kind = pending.source.isNavy ? 'navy' : 'army';
      handleWorldGlanceInput(kind, pending.source.id, 'left', pending.shiftKey);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', clearDrag);
    window.addEventListener('blur', clearDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearDrag);
      window.removeEventListener('blur', clearDrag);
      removeDragCopy();
    };
  }, [applyParentChange, applyParentChanges, clearDrag, createDragCopy, moveDragCopy, removeDragCopy]);

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
        <div className="mil-selection-drag-hint">{webUIText('Military.Selection.DragHint')}</div>
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
        <div className={`mil-selection-chart${dragVisual.sourceId ? ' is-dragging' : ''}`}>
          {selectionForest.map(branch => (
            <ForceBranch
              key={branch.force.id}
              branch={branch}
              depth={0}
              dragVisual={dragVisual}
              openMilitary={id => openSidebar('military', id)}
              onForcePointerDown={handleForcePointerDown}
              onDetach={force => applyParentChange(force.id, null)}
            />
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

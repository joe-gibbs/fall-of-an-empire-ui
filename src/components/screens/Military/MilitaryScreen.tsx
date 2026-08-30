import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import Tooltip from '../../common/tooltips/Tooltip';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import CourtOfficeSummary from '../../common/entities/CourtOfficeSummary';
import ZoomPanCanvas, { type ZoomPanPoint } from '../../common/layout/scrolling/ZoomPanCanvas';
import CourtAppointmentModal from '../../modals/characters/CourtAppointmentModal';
import { useGameActions } from '../../../context/GameContext';
import { useCourtPositions, useMilitaryOverview, usePlayerFactionId } from '../../../data-source/index';
import {
  setMilitaryParentBridge,
  selectMilitaryBridge,
  setAutoAssignCommandsBridge,
  setAutoReplenishFormationsBridge,
} from '../../../bridge/military-map/useMilitaryBridge';
import { useFormationTemplatesBridge } from '../../../bridge/military-map/useFormationTemplatesBridge';
import { usePersonalGuardBridge } from '../../../bridge/military-map/usePersonalGuardBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import type { CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import {
  type Force,
  rankLabel,
  subtree,
} from './forces';
import { canDragMilitaryCommand, collectAssignableCommands, validateCommandAssignment } from '../../../utils/militaryCommandAssignment';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { designRem, designUnitScale, toRootRem } from '../../../utils/cssUnits';
import {
  assignmentTargetFromScreenId,
  createTypeFromScreenId,
  initialMilitaryTab,
  templateIdFromScreenId,
  type MilitaryScreenTab,
} from './screenTokens';
import {
  CANVAS_PAD,
  CHART_ZOOM_STEP,
  DRAG_THRESHOLD,
  MAX_CHART_ZOOM,
  MIN_CHART_ZOOM,
  chartSelectionRect,
  forceIdsInChartSelection,
  layoutTree,
  type ChartSelectionBox,
} from './forceTreeLayout';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import {
  HIGHLIGHT_OPTIONS,
  NodeCard,
  buildChartInitialView,
  matchesHighlight,
  type HighlightKey,
} from './ForceTreeParts';
import { TemplatesPanel } from './TemplateManagementPanel';
import { PersonalGuardPanel } from './PersonalGuardPanel';
import './MilitaryScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

const SWORDS_ICON = '/assets/icons/I_Swords.png';
const SUPPLY_ICON = '/assets/icons/I_Food.png';
const NAVY_BADGE = '/assets/icons/I_NaviesQuickButton.png';

function fmt(n: number): string { return formatNumber(n); }



// ── Empire stats panel ──────────────────────────────────────────────────
function EmpireStats({
  view,
  totalArmyStrength,
  totalArmyMaxStrength,
  totalNavyStrength,
  totalNavyMaxStrength,
  totalShips,
  totalMaxShips,
  commandMaintenance,
  autoAssignCommandsEnabled,
  autoReplenishFormationsEnabled,
}: {
  view: 'land' | 'sea';
  totalArmyStrength: number;
  totalArmyMaxStrength: number;
  totalNavyStrength: number;
  totalNavyMaxStrength: number;
  totalShips: number;
  totalMaxShips: number;
  commandMaintenance: number;
  autoAssignCommandsEnabled: boolean;
  autoReplenishFormationsEnabled: boolean;
}) {
  const isNaval = view === 'sea';
  const strength = isNaval ? totalNavyStrength : totalArmyStrength;
  const maxStrength = isNaval ? totalNavyMaxStrength : totalArmyMaxStrength;
  const reservePct = maxStrength > 0 ? (strength / maxStrength) * 100 : 0;
  const strengthLabel = isNaval ? webUIText("MilitaryScreen.Crews") : webUIText("MilitaryScreen.Strength");
  const strengthTooltip = isNaval ? webUIText("MilitaryScreen.NavalManpowerBody", { Value1: fmt(maxStrength), Value2: formatPercent(reservePct) }) : webUIText("MilitaryScreen.LandManpowerBody", { Value1: fmt(maxStrength), Value2: formatPercent(reservePct) });

  return (
    <div className="chart-empire-stats">
      <Tooltip content={{
        get title() { return isNaval ? webUIText("MilitaryScreen.NavalStrength") : webUIText("MilitaryScreen.LandStrength"); },
        body: strengthTooltip,
      }}>
        <div className="chart-empire-stats-main">
          <img className="chart-empire-stats-icon" src={SWORDS_ICON} alt="" draggable={false} />
          <span className="chart-empire-stats-label">{strengthLabel}</span>
          <span className="chart-empire-stats-value">{fmt(strength)}</span>
        </div>
      </Tooltip>

      {isNaval && (
        <Tooltip content={{
          title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.662.26'),
          get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.663.1", { Value1: fmt(totalMaxShips) }); },
        }}>
          <div className="chart-empire-stats-main">
            <img className="chart-empire-stats-icon" src={NAVY_BADGE} alt="" draggable={false} />
            <span className="chart-empire-stats-label"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.666.9" /></span>
            <span className="chart-empire-stats-value">{fmt(totalShips)}</span>
          </div>
        </Tooltip>
      )}

      <div className="chart-empire-stats-sep" />

      <div className="chart-empire-stats-mods">
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.676.27'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.676.28') }}>
          <div className="chart-empire-stats-mod">
            <img className="chart-empire-stats-mod-icon" src={SUPPLY_ICON} alt="" draggable={false} />
            <span className="chart-empire-stats-mod-value chart-empire-stats-mod-value--negative">
              -{fmt(commandMaintenance)}
            </span>
            <span className="chart-empire-stats-mod-name"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.681.10" /></span>
          </div>
        </Tooltip>
        <GameCheckButton
          checked={autoAssignCommandsEnabled}
          label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.687.29')}
          className="game-check-button--compact-label"
          onToggle={() => { void setAutoAssignCommandsBridge(!autoAssignCommandsEnabled); }}
          tooltip={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.690.30'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.690.31') }}
        />
        <GameCheckButton
          checked={autoReplenishFormationsEnabled}
          label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.694.32')}
          className="game-check-button--compact-label"
          onToggle={() => { void setAutoReplenishFormationsBridge(!autoReplenishFormationsEnabled); }}
          tooltip={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.697.33'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.697.34') }}
        />
      </div>
    </div>
  );
}

export default function MilitaryScreen({ screenId, onClose }: { screenId: string | null; onClose: () => void }) {
  const { openSidebar } = useGameActions();
  const overview = useMilitaryOverview();
  const court = useCourtPositions(true);
  const playerFactionId = usePlayerFactionId();
  const [showOnly, setShowOnly] = useState<MilitaryScreenTab>(() => initialMilitaryTab(screenId));
  const templateData = useFormationTemplatesBridge(showOnly === 'templates');
  const personalGuard = usePersonalGuardBridge();
  const overviewForces = useMemo(
    () => (overview?.forces as Force[] | undefined) ?? [],
    [overview],
  );
  const militaryCourtPositions = useMemo(() => {
    const positions = court?.positions ?? [];
    return ['magistermilitum', 'magisternauticum']
      .map(key => positions.find(position => position.key === key))
      .filter((position): position is CourtPositionView => !!position);
  }, [court]);
  const templates = useMemo(
    () => templateData?.templates ?? [],
    [templateData],
  );
  const overviewKey = useMemo(
    () => JSON.stringify({
      forces: overviewForces.map((force) => [force.id, force.parentId, force.delegated, force.autoSquashRebels, force.doctrine]),
      control: overviewForces.map((force) => [force.id, force.isPlayerControlled]),
    }),
    [overviewForces],
  );
  const [localView, setLocalView] = useState<{
    baseKey: string;
    forces: Force[];
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<ChartSelectionBox | null>(null);
  const [courtPosition, setCourtPosition] = useState<CourtPositionView | null>(null);
  const [highlight, setHighlight] = useState<HighlightKey>(null);
  const initialTemplateId = useMemo(() => templateIdFromScreenId(screenId), [screenId]);
  const initialCreateType = useMemo(() => createTypeFromScreenId(screenId), [screenId]);
  const assignmentTargetId = useMemo(() => assignmentTargetFromScreenId(screenId), [screenId]);
  const allForces = localView?.baseKey === overviewKey ? localView.forces : overviewForces;

  const viewport = useRef<HTMLDivElement | null>(null);
  const forcesRef = useRef(allForces);
  useEffect(() => { forcesRef.current = allForces; }, [allForces]);

  const forces = useMemo(
    () => allForces.filter(f => showOnly === 'sea' ? f.isNavy : !f.isNavy),
    [allForces, showOnly],
  );

  const layout = useMemo(() => layoutTree(forces), [forces]);
  const chartInitialView = useMemo(() => buildChartInitialView(), []);
  const layoutRef = useRef(layout);
  useEffect(() => { layoutRef.current = layout; }, [layout]);

  const visibleSelectedIds = useMemo(
    () => selectedIds.filter(id => forces.some(force => force.id === id)),
    [forces, selectedIds],
  );
  const selectedIdsRef = useRef(visibleSelectedIds);
  useEffect(() => { selectedIdsRef.current = visibleSelectedIds; }, [visibleSelectedIds]);
  const effectiveSelectedId = visibleSelectedIds.length === 1 ? visibleSelectedIds[0] : null;

  const highlightIds = useMemo(() => {
    if (visibleSelectedIds.length !== 1 || !effectiveSelectedId) return null;
    const ids = new Set<string>(subtree(forces, effectiveSelectedId).map(f => f.id));
    let cur = forces.find(f => f.id === effectiveSelectedId);
    while (cur && cur.parentId) {
      ids.add(cur.parentId);
      cur = forces.find(f => f.id === cur!.parentId);
    }
    return ids;
  }, [effectiveSelectedId, forces, visibleSelectedIds.length]);

  // Pointer pipeline
  useEffect(() => {
    if (showOnly === 'templates' || showOnly === 'guard') return;
    const el = viewport.current;
    if (!el) return;

    type Mode = 'idle' | 'node-pending' | 'node-drag';
    let mode: Mode = 'idle';
    let startX = 0, startY = 0;
    let dragSourceId: string | null = null;
    let dragSourceCanDrag = false;
    let lastHoveredId: string | null = null;
    let ghost: HTMLDivElement | null = null;

    const nodeAt = (clientX: number, clientY: number): string | null => {
      const wraps = el.querySelectorAll<HTMLElement>('.chart-node-wrap');
      for (let i = wraps.length - 1; i >= 0; i--) {
        const wrap = wraps[i];
        const rect = wrap.getBoundingClientRect();
        if (clientX >= rect.left && clientX < rect.right && clientY >= rect.top && clientY < rect.bottom) {
          return wrap.dataset.id ?? null;
        }
      }
      return null;
    };

    const clearHover = () => {
      if (!lastHoveredId) return;
      el.querySelectorAll('.is-drop-target, .is-drop-invalid')
        .forEach(n => n.classList.remove('is-drop-target', 'is-drop-invalid'));
      lastHoveredId = null;
      ghost?.querySelector('.chart-drag-ghost-reason')?.remove();
    };

    const dragSourceIds = (srcId: string): Force[] => {
      const byId = new Map(forcesRef.current.map(f => [f.id, f]));
      const ids = selectedIdsRef.current.includes(srcId) ? selectedIdsRef.current : [srcId];
      return ids.map(id => byId.get(id)).filter((force): force is Force => !!force);
    };

    const validateDrop = (srcId: string, tgtId: string) => {
      const byId = new Map(forcesRef.current.map(f => [f.id, f]));
      const src = byId.get(srcId);
      const tgt = byId.get(tgtId);
      if (!src || !tgt) return { ok: false as const, reason: webUIText('Military.Command.UnknownTarget') };
      const accepted = collectAssignableCommands(dragSourceIds(srcId), srcId, tgt, forcesRef.current);
      if (accepted.length === 0) {
        return validateCommandAssignment(src, tgt, forcesRef.current);
      }
      return {
        ok: true as const,
        reason: accepted.length === 1
          ? webUIText('Military.Command.ReportsTo', { Name: tgt.name })
          : webUIText('Military.Command.ReportsToMany', { Count: formatNumber(accepted.length), Name: tgt.name }),
      };
    };

    const isValidDrop = (srcId: string, tgtId: string): boolean => validateDrop(srcId, tgtId).ok;

    const setGhostReason = (text: string | null, valid: boolean) => {
      if (!ghost) return;
      let reasonEl = ghost.querySelector<HTMLSpanElement>('.chart-drag-ghost-reason');
      if (!text) { reasonEl?.remove(); return; }
      if (!reasonEl) {
        reasonEl = document.createElement('span');
        reasonEl.className = 'chart-drag-ghost-reason';
        ghost.appendChild(reasonEl);
      }
      reasonEl.textContent = text;
      reasonEl.classList.toggle('is-valid', valid);
      reasonEl.classList.toggle('is-invalid', !valid);
    };

    const updateHover = (clientX: number, clientY: number) => {
      const hoverId = nodeAt(clientX, clientY);
      if (hoverId === lastHoveredId) return;
      clearHover();
      if (!hoverId || !dragSourceId) { setGhostReason(null, false); return; }
      const wrap = el.querySelector(`.chart-node-wrap[data-id="${hoverId}"]`);
      if (!wrap) return;
      const result = validateDrop(dragSourceId, hoverId);
      wrap.classList.add(result.ok ? 'is-drop-target' : 'is-drop-invalid');
      setGhostReason(result.reason, result.ok);
      lastHoveredId = hoverId;
    };

    const createGhost = (srcId: string) => {
      const src = forcesRef.current.find(f => f.id === srcId);
      if (!src) return;
      const extraSelected = Math.max(0, dragSourceIds(srcId).length - 1);
      const subCount = extraSelected > 0 ? extraSelected : subtree(forcesRef.current, srcId).length - 1;
      ghost = document.createElement('div');
      ghost.className = `chart-drag-ghost${subCount > 0 ? ' is-stacked' : ''}`;
      ghost.style.pointerEvents = 'none';
      const tail = extraSelected > 0
        ? `<span class="chart-drag-ghost-sub">${webUIText('Military.Selection.Count', { Count: formatNumber(extraSelected + 1) })}</span>`
        : subCount > 0
          ? `<span class="chart-drag-ghost-sub">${webUIText('Military.DragGhostSubordinates', { Count: formatNumber(subCount), Unit: webUIText(subCount === 1 ? 'Common.Subordinate' : 'Common.Subordinates') })}</span>`
          : '';
      ghost.innerHTML =
        `<span class="chart-drag-ghost-rank">${rankLabel(src)}</span>` +
        `<span class="chart-drag-ghost-name">${src.name}</span>` + tail;
      document.body.appendChild(ghost);
      requestAnimationFrame(() => ghost?.classList.add('is-shown'));
    };

    const moveGhost = (clientX: number, clientY: number) => {
      if (!ghost) return;
      ghost.style.transform =
        `translate3d(${toRootRem(clientX + 14)}, ${toRootRem(clientY + 10)}, 0) rotate(-3deg)`;
    };

    const removeGhost = () => { if (ghost) { ghost.remove(); ghost = null; } };

    const markSource = (id: string | null) => {
      el.querySelectorAll('.is-drag-source, .is-drag-subtree')
        .forEach(n => n.classList.remove('is-drag-source', 'is-drag-subtree'));
      if (!id) return;
      const sourceIds = dragSourceIds(id).map(force => force.id);
      for (const sourceId of sourceIds) {
        el.querySelector(`.chart-node-wrap[data-id="${sourceId}"]`)?.classList.add('is-drag-source');
      }
      for (const sourceId of sourceIds) {
        const sub = subtree(forcesRef.current, sourceId);
        for (const f of sub) {
          if (sourceIds.includes(f.id)) continue;
          el.querySelector(`.chart-node-wrap[data-id="${f.id}"]`)?.classList.add('is-drag-subtree');
        }
      }
    };

    const flashDropConfirmed = (id: string) => {
      const wrap = el.querySelector(`.chart-node-wrap[data-id="${id}"]`);
      if (!wrap) return;
      wrap.classList.add('is-drop-confirmed');
      window.setTimeout(() => wrap.classList.remove('is-drop-confirmed'), 600);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const hitId = nodeAt(e.clientX, e.clientY);
      if (!hitId) return;

      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      mode = 'node-pending';
      dragSourceId = hitId;
      const hitForce = forcesRef.current.find(f => f.id === hitId);
      dragSourceCanDrag = hitForce ? canDragMilitaryCommand(hitForce) : false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (mode === 'node-pending') {
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD && dragSourceId) {
          if (!dragSourceCanDrag) {
            mode = 'idle';
            dragSourceId = null;
            dragSourceCanDrag = false;
            return;
          }
          mode = 'node-drag';
          el.classList.add('is-node-dragging');
          createGhost(dragSourceId);
          markSource(dragSourceId);
        }
      }
      if (mode === 'node-drag') {
        moveGhost(e.clientX, e.clientY);
        updateHover(e.clientX, e.clientY);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (mode === 'node-drag') {
        updateHover(e.clientX, e.clientY);
        if (lastHoveredId && dragSourceId && isValidDrop(dragSourceId, lastHoveredId)) {
          const src = dragSourceId;
          const tgt = lastHoveredId;
          const target = forcesRef.current.find(force => force.id === tgt);
          const accepted = target
            ? collectAssignableCommands(dragSourceIds(src), src, target, forcesRef.current)
            : [];
          const acceptedIds = new Set(accepted.map(force => force.id));
          const previousParentCounts = new Map<string, number>();
          for (const force of accepted) {
            if (!force.parentId || acceptedIds.has(force.parentId)) continue;
            previousParentCounts.set(force.parentId, (previousParentCounts.get(force.parentId) ?? 0) + 1);
          }
          setLocalView({
            baseKey: overviewKey,
            forces: allForces.map((force) => {
              if (acceptedIds.has(force.id)) return { ...force, parentId: tgt };
              if (force.id === tgt) {
                return { ...force, subordinateCount: (force.subordinateCount ?? 0) + accepted.length };
              }
              const detached = previousParentCounts.get(force.id);
              if (detached) {
                return { ...force, subordinateCount: Math.max(0, (force.subordinateCount ?? 0) - detached) };
              }
              return force;
            }),
          });
          void Promise.all(accepted.map(force => setMilitaryParentBridge(force.id, tgt))).catch(error => {
            setLocalView(null);
            acknowledgeBridgeFailure(error, 'game.set_military_parent');
          });
          flashDropConfirmed(tgt);
        }
        markSource(null);
        removeGhost();
        clearHover();
        el.classList.remove('is-node-dragging');
      } else if (mode === 'node-pending' && dragSourceId) {
        const clickedId = dragSourceId;
        if (e.shiftKey) {
          setSelectedIds(prev => (prev.includes(clickedId)
            ? prev.filter(id => id !== clickedId)
            : [...prev, clickedId]));
        } else {
          setSelectedIds([clickedId]);
          const selectedForce = forcesRef.current.find(force => force.id === clickedId);
          if (selectedForce?.isPlayerControlled) {
            selectMilitaryBridge(clickedId).catch(acknowledgeBridgeFailure);
          }
          openSidebar('military', clickedId);
        }
      }
      mode = 'idle';
      dragSourceId = null;
      dragSourceCanDrag = false;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      removeGhost();
    };
  }, [allForces, openSidebar, overviewKey, showOnly]);

  const handleChartSelectionEnd = useCallback((start: ZoomPanPoint, end: ZoomPanPoint) => {
    setSelectionBox(null);
    setSelectedIds(forceIdsInChartSelection(layoutRef.current, { start, end }));
  }, []);

  const tabs = [
    { id: 'land',      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.986.35') },
    { id: 'sea',       label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.987.36') },
    { id: 'templates', label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.988.37') },
  ];
  if (personalGuard?.eligible) {
    tabs.push({
      id: 'guard',
      label: webUIText('Military.PersonalGuard.Tab'),
    });
  }

  const officeStrip = (showOnly === 'land' || showOnly === 'sea') && militaryCourtPositions.length > 0 ? (
    <div className="chart-office-strip">
      <span className="chart-office-strip-label"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.992.11" /></span>
      <div className="chart-office-list">
        {militaryCourtPositions.map(position => (
          <CourtOfficeSummary
            key={position.key}
            position={position}
            readOnly={Boolean(court?.courtFactionId && playerFactionId && court.courtFactionId !== playerFactionId)}
            onOpen={setCourtPosition}
          />
        ))}
      </div>
    </div>
  ) : null;

  const topControls = (
    <>
      {(showOnly === 'land' || showOnly === 'sea') && (
        <div className="chart-header-extra">
          <span className="chart-highlight-label"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.1009.12" /></span>
          <div className="chart-highlight-group">
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.1012.38'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.1012.39') }}>
              <button
                className={`chart-highlight-btn chart-highlight-btn--text${highlight === null ? ' is-active' : ''}`}
                onClick={() => setHighlight(null)}
              >
                <WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.1016.13" />
              </button>
            </Tooltip>
            {HIGHLIGHT_OPTIONS.map(opt => (
              <Tooltip key={String(opt.key)} content={{ title: opt.label, body: opt.desc }}>
                <button
                  className={`chart-highlight-btn${highlight === opt.key ? ' is-active' : ''}`}
                  onClick={() => setHighlight(opt.key)}
                  aria-label={opt.label}
                >
                  <img src={opt.icon} alt="" className="chart-highlight-icon" draggable={false} />
                </button>
              </Tooltip>
            ))}
          </div>

          <EmpireStats
            view={showOnly === 'sea' ? 'sea' : 'land'}
            totalArmyStrength={overview?.totalArmyStrength ?? 0}
            totalArmyMaxStrength={overview?.totalArmyMaxStrength ?? 0}
            totalNavyStrength={overview?.totalNavyStrength ?? 0}
            totalNavyMaxStrength={overview?.totalNavyMaxStrength ?? 0}
            totalShips={overview?.totalShips ?? 0}
            totalMaxShips={overview?.totalMaxShips ?? 0}
            commandMaintenance={overview?.commandMaintenance ?? 0}
            autoAssignCommandsEnabled={overview?.autoAssignCommandsEnabled ?? false}
            autoReplenishFormationsEnabled={overview?.autoReplenishFormationsEnabled ?? false}
          />
        </div>
      )}
    </>
  );

  return (
    <ScreenShell
      title={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.1053.40')}
      onClose={onClose}
      advisorTopic="militaryScreen"
      className={`chart-screen${showOnly === 'templates' ? ' chart-screen--templates' : ''}${showOnly === 'guard' ? ' chart-screen--guard' : ''}`}
      contentClassName="chart-content"
      tabs={<SidebarTabBar tabs={tabs} activeTab={showOnly} onTabChange={(id) => {
        const next = id as MilitaryScreenTab;
        if (next !== showOnly) {
          setSelectedIds([]);
          setSelectionBox(null);
        }
        setShowOnly(next);
      }} />}
    >
      {topControls}
      {officeStrip}
      {showOnly === 'guard' ? (
        personalGuard?.eligible ? <PersonalGuardPanel guard={personalGuard} /> : null
      ) : showOnly === 'templates' ? (
        <TemplatesPanel
          templates={templates}
          initialTemplateId={initialTemplateId}
          initialCreateType={initialCreateType}
          assignmentTargetId={assignmentTargetId}
          maximumBattleGroupUnits={templateData?.maximumBattleGroupUnits ?? 0}
          maximumFormationTemplates={templateData?.maximumFormationTemplates ?? 0}
          onCloseScreen={onClose}
        />
      ) : (
      <ZoomPanCanvas
        key={showOnly}
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
        viewportRef={viewport}
        leftDragMode="select"
        ignoreLeftDragFrom={(target) => !!target.closest('.chart-node-wrap')}
        onContentLeftClick={() => {
          setSelectedIds([]);
          setSelectionBox(null);
        }}
        onContentLeftDragUpdate={(start, end) => setSelectionBox({ start, end })}
        onContentLeftDragEnd={handleChartSelectionEnd}
        controls={({ zoom, zoomIn, zoomOut }) => (
          <div className="chart-zoom-float">
            <Tooltip content={webUIText("Auto.Attr.componentsscreensMilitaryMilitaryScreen.1090.1")}>
              <button
                className="chart-zoom-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  zoomOut();
                }}
                aria-label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.1097.41')}
              >
                <img src="/assets/icons/I_Minus.png" alt="" className="chart-zoom-icon" draggable={false} />
              </button>
            </Tooltip>
            <span className="chart-zoom-val">{Math.round(zoom * 100)}%</span>
            <Tooltip content={webUIText("Auto.Attr.componentsscreensMilitaryMilitaryScreen.1103.1")}>
              <button
                className="chart-zoom-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  zoomIn();
                }}
                aria-label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.1110.42')}
              >
                <img src="/assets/icons/I_Plus.png" alt="" className="chart-zoom-icon" draggable={false} />
              </button>
            </Tooltip>
          </div>
        )}
      >
          <svg className="chart-lines" width={designRem(layout.width)} height={designRem(layout.height)} viewBox={`0 0 ${layout.width} ${layout.height}`}>
            <g>
              {layout.lines.map((l, i) => {
                const midX = (l.x1 + l.x2) / 2;
                const isActive = highlightIds?.has(l.parentId) && highlightIds?.has(l.childId);
                const d = `M ${l.x1.toFixed(1)} ${l.y1.toFixed(1)} L ${midX.toFixed(1)} ${l.y1.toFixed(1)} L ${midX.toFixed(1)} ${l.y2.toFixed(1)} L ${l.x2.toFixed(1)} ${l.y2.toFixed(1)}`;
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={isActive ? 'var(--gold-light)' : 'rgba(201,168,76,0.6)'}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>
          </svg>
          {layout.nodes.map(n => {
            const inChain = !highlightIds || highlightIds.has(n.force.id);
            const matches = matchesHighlight(n.force, highlight);
            return (
              <div
                key={n.force.id}
                className="chart-node-wrap"
                data-id={n.force.id}
                style={{ left: designRem(n.x), top: designRem(n.y), width: designRem(n.w), height: designRem(n.h) }}
              >
                <NodeCard
                  force={n.force}
                  allForces={allForces}
                  selected={visibleSelectedIds.includes(n.force.id)}
                  highlighted={highlight !== null && matches}
                  dimmed={!inChain || (highlight !== null && !matches)}
                />
              </div>
            );
          })}
          {selectionBox && (() => {
            const rect = chartSelectionRect(selectionBox);
            return (
              <span
                className="chart-selection-box"
                style={{
                  left: `${rect.left.toFixed(2)}%`,
                  top: `${rect.top.toFixed(2)}%`,
                  width: `${rect.width.toFixed(2)}%`,
                  height: `${rect.height.toFixed(2)}%`,
                }}
              />
            );
          })()}
      </ZoomPanCanvas>
      )}
      <CourtAppointmentModal
        open={!!courtPosition}
        position={courtPosition}
        onClose={() => setCourtPosition(null)}
      />
    </ScreenShell>
  );
}

registerTopbarButton({
  id: 'military',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1171.4'); },
  icon: '/assets/icons/I_ArmiesQuickButton.png',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1174.5'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1175.6'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1177.7'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1178.8'); } },
    ],
  },
  order: 10,
});
registerScreen({
  id: 'military',
  render: ({ screenId, onClose }) => <MilitaryScreen key={screenId ?? 'default'} screenId={screenId} onClose={onClose} />,
  topbarId: 'military',
  advisorTopic: 'militaryScreen',
  bridgeNames: ['militaryscreen', 'militaryoverview', 'militaryoverviewscreen', 'formations', 'formationtemplates', 'formation_templates', 'personalguard', 'personalguard', 'guard'],
});

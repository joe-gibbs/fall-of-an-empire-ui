import React, { useState, useCallback, useEffect, useRef } from 'react';
import { playSound } from '../../hooks/useSound';
import Tooltip from '../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../common/tooltips/Tooltip';
import EntityLink from '../common/entities/EntityLink';
import ResourceLink from '../common/resources/ResourceLink';
import ResourcePurchaseButton from '../common/resources/ResourcePurchaseButton';
import type { Warning, WarningSeverity, WarningTarget } from '../../data/types';
import { activateWarning } from '../../bridge/app/useNotificationsBridge';
import { startGovernorAssignmentBridge } from '../../bridge/military-map/useBottomBarOperationsBridge';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { GOVERNOR_MISSION_ICON } from '../../utils/iconMaps';
import { WebkilnAssetPath } from '../../utils/assets';
import { bridgeEvents } from '../../bridge/core/bridgeEvents';
import { requestGamepadFocusRefresh } from '../../input/gamepadFocusEvents';
import { useEscapeStackEntry } from '../../context/EscapeStack';
import './WarningBar.css';

interface WarningBarProps {
  warnings: Warning[];
  onDismiss: (id: string) => void;
  hidden?: boolean;
}

const severityFrames: Record<WarningSeverity, string> = {
  caution: '/assets/icons/I_Caution.png',
  warning: '/assets/icons/I_Warning.png',
  critical: '/assets/icons/I_Warning.png',
};

// Maps game warning icon keys to packaged WebUI assets.
const iconKeyToAsset: Record<string, string> = {
  foodshortage: '/assets/icons/I_Food.png',
  treasurydeficit: '/assets/icons/I_Coins.png',
  powerblocunhappy: '/assets/icons/I_Intrigue.png',
  highunrest: '/assets/icons/I_Unrest.png',
  noheir: '/assets/icons/Relations/I_Heir.png',
  rebellionimminent: '/assets/icons/I_PowerBlocUnrest.png',
  settlementundersiege: '/assets/icons/I_Siege.png',
  unassignedgovernor: '/assets/icons/I_Region.png',
  vacantcourtposition: '/assets/icons/I_VacantCourt.png',
  capitaloccupied: '/assets/icons/I_RaidingTorch.png',
  powerblocdemand: '/assets/icons/I_Compliance.png',
  governormissiondeadline: GOVERNOR_MISSION_ICON,
  provincerecall: '/assets/icons/RecallStatus/I_RecallStatus_Warning.png',
  armyattrition: '/assets/icons/Terrain/I_Attrition.png',
  armydamaged: '/assets/icons/I_War.png',
  damagedbuildings: '/assets/icons/I_ModConstruction.png',
  crisis: '/assets/icons/I_ExclamationWarning.png',
  resourceshortage: '/assets/icons/I_ResourceConsumption.png',
  storesrunningout: '/assets/icons/I_Warehouse.png',
  luxuryshortage: '/assets/icons/I_Luxury.png',
};

const fallbackIcon = '/assets/icons/I_GoalNotMet.png';

function renderWarningBody(warning: Warning): React.ReactNode {
  const lines = warning.description
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <div className="warning-tooltip-flow">
      <div className="warning-tooltip-summary">{lines[0]}</div>
      {lines.slice(1).map((line, index) => (
        <div key={index} className="warning-tooltip-subhead">
          {line}
        </div>
      ))}
    </div>
  );
}

function warningTargetIcons(target: WarningTarget) {
  const { icons = [], resources = [] } = target;
  if (icons.length === 0 && resources.length === 0) return undefined;
  return (
    <span className="warning-missing-icons">
      {resources.map(resource => (
        <Tooltip
          key={resource.id}
          content={{ title: resource.name, afterLines: <ResourcePurchaseButton resourceId={resource.id} /> }}
          position="right"
          inline
        >
          <ResourceLink resourceId={resource.id}>
            <img src={WebkilnAssetPath(resource.icon)} alt={resource.name} className="warning-missing-icon" draggable={false} />
          </ResourceLink>
        </Tooltip>
      ))}
      {icons.map((icon, index) => (
        <img
          key={`${icon}-${index}`}
          src={WebkilnAssetPath(icon)}
          alt=""
          className="warning-missing-icon"
          draggable={false}
        />
      ))}
    </span>
  );
}

function warningTargetLabel(target: WarningTarget, fallback: string) {
  const text = target.label || fallback;
  if (!target.linkType || !target.linkId) return text;
  return (
    <EntityLink type={target.linkType} id={target.linkId} inline className="tt-entity-link">
      {text}
    </EntityLink>
  );
}

function warningTooltip(warning: Warning, currentTargetIndex: number): TooltipContent {
  const labels = warning.targetLabels ?? [];
  const targets = warning.targets ?? [];
  const lines: TooltipLine[] = targets.length > 0
    ? targets.map((target, index) => {
        const icons = warningTargetIcons(target);
        const value = icons && target.detail
          ? (
              <span className="warning-target-value">
                {icons}
                <span>{target.detail}</span>
              </span>
            )
          : icons ?? target.detail;
        return {
          label: warningTargetLabel(target, labels[index] ?? ''),
          labelColor: target.linkType
            ? undefined
            : index === currentTargetIndex ? 'var(--text-bright)' : 'var(--text-muted)',
          value,
          valueColor: target.detail ? 'var(--red)' : undefined,
        };
      })
    : labels.map((label, index) => ({
        label,
        labelColor: index === currentTargetIndex ? 'var(--text-bright)' : 'var(--text-muted)',
      }));
  return {
    title: warning.title,
    body: renderWarningBody(warning),
    lines,
  };
}

// Matches warning-icon-out in WarningBar.css, with headroom so the animation finishes first.
const WARNING_EXIT_FALLBACK_MS = 400;

const WarningBar: React.FC<WarningBarProps> = ({ warnings, onDismiss, hidden }) => {
  // Ids the player has dismissed whose exit animation is still running.
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [cycleIndexByWarning, setCycleIndexByWarning] = useState<Record<string, number>>({});
  const [controllerOpen, setControllerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const exitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Per-warning UI state ends when the game removes the warning, so a warning of the
  // same type raised later starts fresh rather than mid-exit.
  const [previousWarnings, setPreviousWarnings] = useState(warnings);
  if (warnings !== previousWarnings) {
    setPreviousWarnings(warnings);
    const liveIds = new Set(warnings.map(w => w.id));
    if (![...exiting].every(id => liveIds.has(id))) {
      setExiting(new Set([...exiting].filter(id => liveIds.has(id))));
    }
    if (!Object.keys(cycleIndexByWarning).every(id => liveIds.has(id))) {
      setCycleIndexByWarning(Object.fromEntries(Object.entries(cycleIndexByWarning).filter(([id]) => liveIds.has(id))));
    }
  }

  useEffect(() => {
    const liveIds = new Set(warnings.map(w => w.id));
    for (const [id, timer] of exitTimersRef.current) {
      if (!liveIds.has(id)) {
        clearTimeout(timer);
        exitTimersRef.current.delete(id);
      }
    }
  }, [warnings]);

  useEffect(() => {
    const timers = exitTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const finishDismiss = useCallback((id: string) => {
    const timer = exitTimersRef.current.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    exitTimersRef.current.delete(id);
    setExiting(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onDismiss(id);
  }, [onDismiss]);

  const closeControllerWarnings = useCallback(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && stripRef.current?.contains(focused)) focused.blur();
    setControllerOpen(false);
  }, []);

  useEscapeStackEntry({
    id: 'hud.warnings',
    active: controllerOpen,
    onClose: closeControllerWarnings,
    allowFromInput: true,
  });

  useEffect(() => {
    const openControllerWarnings = () => setControllerOpen(true);
    bridgeEvents.addEventListener('ui.gamepad_open_warnings', openControllerWarnings);
    return () => bridgeEvents.removeEventListener('ui.gamepad_open_warnings', openControllerWarnings);
  }, []);

  useEffect(() => {
    requestGamepadFocusRefresh();
  }, [controllerOpen]);

  const handleActivate = useCallback((w: Warning, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    playSound('click');
    if (w.iconKey === 'unassignedgovernor' || w.id === 'unassignedgovernor') {
      startGovernorAssignmentBridge().catch(acknowledgeBridgeFailure);
      return;
    }

    const next = cycleIndexByWarning[w.id] ?? 0;
    setCycleIndexByWarning(prev => ({
      ...prev,
      [w.id]: (next + 1) % Math.max(1, w.targetCount),
    }));
    activateWarning(w.id, next);
  }, [cycleIndexByWarning]);

  const handleDismiss = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (exitTimersRef.current.has(id)) return;
    playSound('close');
    setExiting(prev => new Set(prev).add(id));
    exitTimersRef.current.set(id, setTimeout(() => finishDismiss(id), WARNING_EXIT_FALLBACK_MS));
  }, [finishDismiss]);

  const handleAnimationEnd = useCallback((id: string, e: React.AnimationEvent) => {
    if (e.animationName === 'warning-icon-out') finishDismiss(id);
  }, [finishDismiss]);

  if (warnings.length === 0) return null;

  return (
    <div
      ref={stripRef}
      className={`warning-icon-strip${hidden ? ' warning-icon-strip--hidden' : ''}${controllerOpen ? ' warning-icon-strip--controller-open' : ''}`}
      data-tutorial-target="WarningsContainer"
      data-focus-root={controllerOpen ? 'warnings' : undefined}
      data-focus-group={controllerOpen ? 'horizontal' : undefined}
      data-focus-priority={controllerOpen ? '275' : undefined}
    >
      {warnings.map((w, i) => {
        const isExiting = exiting.has(w.id);
        const frame = severityFrames[w.severity];
        const icon = iconKeyToAsset[w.iconKey] ?? fallbackIcon;
        const currentTargetIndex = cycleIndexByWarning[w.id] ?? 0;
        return (
          <Tooltip
            key={w.id}
            content={warningTooltip(w, currentTargetIndex)}
            position="right"
            delay={150}
            bubbleClassName="warning-tooltip"
          >
            <button
              type="button"
              className={`warning-icon-btn warning-icon-btn--${w.severity}${isExiting ? ' warning-icon-btn--exiting' : ''}`}
              style={{ animationDelay: `${i * 0.08}s` }}
              aria-label={w.title}
              data-gamepad-default={controllerOpen && i === 0 ? '' : undefined}
              onAnimationEnd={(e) => handleAnimationEnd(w.id, e)}
              onClick={(e) => handleActivate(w, e)}
              onContextMenu={(e) => { e.preventDefault(); handleDismiss(w.id, e as unknown as React.MouseEvent); }}
            >
              <img src={frame} alt="" className="warning-icon-frame" />
              <img src={icon} alt="" className="warning-icon-img" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default WarningBar;

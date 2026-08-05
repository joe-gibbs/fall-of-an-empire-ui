import React, { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import InfoRow from '../../common/data-display/stats/InfoRow';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import GameButton from '../../common/buttons/GameButton';
import MilitaryCommanderAssignmentModal from '../../modals/characters/MilitaryCommanderAssignmentModal';
import type { Army, ArmyUnitRow, MilitaryDoctrine } from '../../../data/types';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { usePinnedItemsBridge, zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useMilitary, useMilitaryOverview, usePerson } from '../../../data-source/index';
import { registerSidebar } from '../../../registry/index';
import {
  disbandMilitaryBridge,
  demoteMilitaryCommandBridge,
  disembarkMilitaryBridge,
  duplicateMilitaryFormationTemplateBridge,
  promoteMilitaryCommandBridge,
  replenishMilitaryBridge,
  setMilitaryForcedMarchBridge,
  setMilitaryAutoSquashRebelsBridge,
  setMilitaryDelegationBridge,
  setMilitaryDoctrineBridge,
  setMilitaryParentBridge,
  showMilitarySidebarBridge,
  startMilitaryEmbarkTargetingBridge,
  startMilitaryMergeTargetingBridge,
  toggleFoederatiCallupBridge,
  ungarrisonMilitaryBridge,
} from '../../../bridge/military-map/useMilitaryBridge';
import SidebarTabBar from '../shared/SidebarTabBar';
import SidebarToolbar from '../shared/SidebarToolbar';
import { getStatColor } from '../../../utils/colorFormatters';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import '../shared/Sidebar.css';
import './MilitarySidebar.css';
import {
  MilitaryUnitsTab,
  renderUnitTypeCounts,
} from './MilitaryUnitsTab';
import {
  buildCommanderStatEntry,
  buildResourceRows,
  coerceDoctrine,
  commanderStatDefs,
  commandModeOptions,
  commandModeTooltips,
  computeArmyStats,
  formatLargeNumber,
  formatResourceAmount,
  formatResourceStock,
  formatStrength,
  formatSupplyWindow,
  formatUnitTypeName,
  getMoraleColor,
  getStrengthBarColor,
  getStrengthColor,
  isResourceUrgent,
  modifierValueColor,
  QUELL_ICON,
  resolveCurrentOrderLabel,
  resourceFillPercent,
  resourceIconPath,
  resourceReservePercent,
  resourceReserveTargetDays,
  resolveUnitStats,
  sortResourceRowsByUrgency,
  type CommandMode,
  type CompositionSummaryRow,
  type MilitaryAction,
  type ReadinessCard,
  type UnitSelectionBox,
  type UnitSelectionDragState,
} from './MilitarySidebarPresentation';

import { webUIText } from '../../../localization/WebUITextContext';
import { RANK_META } from '../../screens/Military/forces';
interface MilitarySidebarProps {
  army: Army;
  onClose: () => void;
}

const MilitarySidebar: React.FC<MilitarySidebarProps> = ({ army, onClose }) => {
  const { showAdvisor, openSidebar, openScreen } = useGameActions();
  const { debugMode } = useGameState();
  const { isPinned: checkPinned, togglePin } = usePinnedItemsBridge();
  const militaryOverview = useMilitaryOverview();
  const commander = usePerson(army.commanderId);

  const initialDoctrine = coerceDoctrine(army.commandDoctrine);
  const delegatedBase = army.delegated ?? false;
  const autoSquashBase = army.autoSquashRebels ?? false;

  const [activeTab, setActiveTab] = useState<'overview' | 'units'>('overview');
  const [doctrineOverride, setDoctrineOverride] = useState<{ base: MilitaryDoctrine; value: MilitaryDoctrine } | null>(null);
  const [delegationOverride, setDelegationOverride] = useState<{ base: boolean; value: boolean } | null>(null);
  const [autoSquashOverride, setAutoSquashOverride] = useState<{ base: boolean; value: boolean } | null>(null);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const [commanderAssignmentOpen, setCommanderAssignmentOpen] = useState(false);
  const [confirmDestructiveId, setConfirmDestructiveId] = useState<string | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [unitSelectionAnchorId, setUnitSelectionAnchorId] = useState<string | null>(null);
  const [unitSelectionBox, setUnitSelectionBox] = useState<UnitSelectionBox | null>(null);
  const unitSelectionDragRef = useRef<UnitSelectionDragState | null>(null);
  const unitRosterRef = useRef<HTMLDivElement | null>(null);
  const unitRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isPinned = checkPinned('military', army.id);
  const strengthRatio = army.maxStrength > 0 ? army.strength / army.maxStrength : 0;
  const unitRows = army.unitRows;
  const visibleUnitRows = useMemo(() => {
    const unitRowById = new Map(unitRows.map(row => [row.id, row]));
    const battleUnitIds = new Set(army.battleGroups.flatMap(group => group.unitIds));
    const battleRows = army.battleGroups.flatMap(group => (
      group.unitIds
        .map(unitId => unitRowById.get(unitId))
        .filter((row): row is ArmyUnitRow => Boolean(row))
    ));
    return [...battleRows, ...unitRows.filter(row => !battleUnitIds.has(row.id))];
  }, [army.battleGroups, unitRows]);
  const selectableUnitRows = useMemo(() => visibleUnitRows.filter(row => row.selectable), [visibleUnitRows]);
  const selectableUnitIdSet = useMemo(() => new Set(selectableUnitRows.map(row => row.id)), [selectableUnitRows]);
  const selectedUnitIdSet = useMemo(() => new Set(selectedUnitIds), [selectedUnitIds]);
  const derived = computeArmyStats(army.units);
  const isForcedMarching = army.isForcedMarching ?? false;
  const isReplenishing = army.isReplenishing ?? false;
  const movementSpeed = isForcedMarching ? derived.speed * 2 : derived.speed;
  const canHaveSubordinates = army.commandRank === 'Dux' || army.commandRank === 'Praefectus';
  const headerBg = army.isNavy ? '/assets/events/naval-battle.png' : '/assets/events/cavalry-charge.png';
  const isPlayerControlled = army.isPlayerControlled;
  const resourceRows = sortResourceRowsByUrgency(buildResourceRows(army));
  const urgentResourceRows = resourceRows.filter(isResourceUrgent);
  const currentOrderLabel = resolveCurrentOrderLabel(army);
  const subordinateRows = army.subordinates ?? [];
  const attritionSources = army.attritionSources ?? [];
  const embarkedRows = army.embarkedArmies ?? [];
  const militaryIds = useMemo(
    () => militaryOverview?.forces.map((force) => force.id) ?? [],
    [militaryOverview],
  );
  const militaryForceById = useMemo(
    () => new Map((militaryOverview?.forces ?? []).map((force) => [force.id, force])),
    [militaryOverview],
  );
  const currentIndex = militaryIds.indexOf(army.id);
  const previousMilitaryId = currentIndex > 0 ? militaryIds[currentIndex - 1] : null;
  const nextMilitaryId = currentIndex >= 0 && currentIndex < militaryIds.length - 1
    ? militaryIds[currentIndex + 1]
    : null;
  const doctrine = doctrineOverride && initialDoctrine === doctrineOverride.base
    ? doctrineOverride.value
    : initialDoctrine;
  const delegated = delegationOverride && delegatedBase === delegationOverride.base
    ? delegationOverride.value
    : delegatedBase;
  const autoSquash = autoSquashOverride && autoSquashBase === autoSquashOverride.base
    ? autoSquashOverride.value
    : autoSquashBase;
  const commandMode: CommandMode = delegated ? doctrine : 'direct';
  const commanderStats = commander ? commanderStatDefs.map((statDef) => buildCommanderStatEntry(commander, statDef)) : [];

  useEffect(() => {
    setSelectedUnitIds(current => current.filter(id => selectableUnitIdSet.has(id)));
    setUnitSelectionAnchorId(current => current && selectableUnitIdSet.has(current) ? current : null);
  }, [army.id, selectableUnitIdSet]);

  useEffect(() => {
    setConfirmDestructiveId(null);
  }, [army.id]);

  useEffect(() => () => {
    unitSelectionDragRef.current?.cleanup?.();
    unitSelectionDragRef.current = null;
  }, []);

  const selectUnitRange = (fromId: string, toId: string, baseSelectedIds: string[], additive: boolean): string[] => {
    const startIndex = selectableUnitRows.findIndex(row => row.id === fromId);
    const endIndex = selectableUnitRows.findIndex(row => row.id === toId);
    if (startIndex < 0 || endIndex < 0) return baseSelectedIds;

    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    const rangeIds = selectableUnitRows.slice(from, to + 1).map(row => row.id);
    if (!additive) return rangeIds;

    const next = new Set(baseSelectedIds);
    rangeIds.forEach(id => next.add(id));
    return Array.from(next);
  };

  const selectUnitRowsInClientBox = (box: { left: number; right: number; top: number; bottom: number }, baseSelectedIds: string[], additive: boolean): string[] => {
    const selected = selectableUnitRows
      .filter(row => {
        const element = unitRowRefs.current[row.id];
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.left <= box.right && rect.right >= box.left && rect.top <= box.bottom && rect.bottom >= box.top;
      })
      .map(row => row.id);

    if (!additive) return selected;
    const next = new Set(baseSelectedIds);
    selected.forEach(id => next.add(id));
    return Array.from(next);
  };

  const handleUnitRowMouseDown = (event: ReactMouseEvent<HTMLDivElement>, row: ArmyUnitRow) => {
    if (!row.selectable || event.button !== 0) return;

    event.preventDefault();
    const additive = event.ctrlKey || event.metaKey;
    const range = event.shiftKey;
    const roster = unitRosterRef.current;
    const drag: UnitSelectionDragState = {
      rowId: row.id,
      startX: event.clientX,
      startY: event.clientY,
      additive,
      range,
      baseSelectedIds: selectedUnitIds,
      moved: false,
    };

    const handleMove = (moveEvent: MouseEvent) => {
      const active = unitSelectionDragRef.current;
      if (!active || !roster) return;

      const deltaX = moveEvent.clientX - active.startX;
      const deltaY = moveEvent.clientY - active.startY;
      if (!active.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        active.moved = true;
      }
      if (!active.moved) return;

      const rosterRect = roster.getBoundingClientRect();
      const left = Math.min(active.startX, moveEvent.clientX);
      const right = Math.max(active.startX, moveEvent.clientX);
      const top = Math.min(active.startY, moveEvent.clientY);
      const bottom = Math.max(active.startY, moveEvent.clientY);
      setUnitSelectionBox({
        left: left - rosterRect.left,
        top: top - rosterRect.top,
        width: right - left,
        height: bottom - top,
      });
      setSelectedUnitIds(selectUnitRowsInClientBox({ left, right, top, bottom }, active.baseSelectedIds, active.additive));
    };

    const handleUp = () => {
      const active = unitSelectionDragRef.current;
      active?.cleanup?.();
      unitSelectionDragRef.current = null;
      setUnitSelectionBox(null);

      if (!active) return;
      if (active.moved) {
        setUnitSelectionAnchorId(active.rowId);
        return;
      }

      if (active.range && unitSelectionAnchorId) {
        setSelectedUnitIds(selectUnitRange(unitSelectionAnchorId, active.rowId, active.baseSelectedIds, active.additive));
        return;
      }

      if (active.additive) {
        setSelectedUnitIds(current => current.includes(active.rowId)
          ? current.filter(id => id !== active.rowId)
          : [...current, active.rowId]);
      } else {
        setSelectedUnitIds([active.rowId]);
      }
      setUnitSelectionAnchorId(active.rowId);
    };

    drag.cleanup = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    unitSelectionDragRef.current?.cleanup?.();
    unitSelectionDragRef.current = drag;
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const maxStats = army.units.reduce((acc, unit) => {
    const stats = resolveUnitStats(unit);
    return {
      pierceDmg: Math.max(acc.pierceDmg, stats.pierceDmg),
      crushDmg: Math.max(acc.crushDmg, stats.crushDmg),
      slashDmg: Math.max(acc.slashDmg, stats.slashDmg),
      pierceArmour: Math.max(acc.pierceArmour, stats.pierceArmour),
      crushArmour: Math.max(acc.crushArmour, stats.crushArmour),
      slashArmour: Math.max(acc.slashArmour, stats.slashArmour),
      speed: Math.max(acc.speed, stats.speed),
      attackSpeed: Math.max(acc.attackSpeed, stats.attackSpeed),
    };
  }, { pierceDmg: 0, crushDmg: 0, slashDmg: 0, pierceArmour: 0, crushArmour: 0, slashArmour: 0, speed: 0, attackSpeed: 0 });

  const compositionSummary = Array.from(
    army.units.reduce((groups, unit) => {
      const existing = groups.get(unit.type) ?? {
        type: unit.type,
        count: 0,
        strength: 0,
        maxStrength: 0,
        formations: 0,
      };
      existing.count += unit.count;
      existing.strength += unit.strength;
      existing.maxStrength += unit.maxStrength;
      existing.formations += 1;
      groups.set(unit.type, existing);
      return groups;
    }, new Map<string, CompositionSummaryRow>()).values(),
  );

  const commandActions: MilitaryAction[] = army.isPersonalGuard ? [] : [
    ...(army.parentCommandId ? [{
      label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.460.1'),
      icon: '/assets/icons/I_DetachCommand.png',
      description: webUIText('Auto.Prop.componentssidebarsMilitarySidebar.462.1', {
        ParentCommand: army.parentCommand || '',
      }),
      disabled: !isPlayerControlled,
      onClick: () => {
        setMilitaryParentBridge(army.id, null).catch(acknowledgeBridgeFailure);
      },
    }] : []),
    ...(army.commandRank !== 'Legatus' ? [{
      label: webUIText('Military.Command.Demote'),
      icon: '/assets/icons/I_Demote.png',
      description: webUIText('Military.Command.DemoteDescription'),
      disabled: !isPlayerControlled,
      onClick: () => {
        demoteMilitaryCommandBridge(army.id).catch(acknowledgeBridgeFailure);
      },
    }] : []),
    ...(army.commandRank !== 'Dux' ? [{
      label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.468.2'),
      icon: '/assets/icons/I_Promote.png',
      description: army.commandRank === 'Legatus' ? RANK_META.Praefectus.desc : RANK_META.Dux.desc,
      tutorialTarget: 'PromoteMilitaryCommandButton',
      disabled: !isPlayerControlled,
      onClick: () => {
        promoteMilitaryCommandBridge(army.id).catch(acknowledgeBridgeFailure);
      },
    }] : []),
  ];

  const garrisonAction: MilitaryAction | null = army.garrisonedAt ? {
    get label() { return army.isNavy ? webUIText("MilitarySidebar.Undock") : webUIText("MilitarySidebar.Ungarrison"); },
    icon: '/assets/icons/I_Ungarrison.png',
    get description() { return army.isNavy ? webUIText("MilitarySidebar.LeavePortBody", { GarrisonedAt: army.garrisonedAt }) : webUIText("MilitarySidebar.LeaveGarrisonBody", { GarrisonedAt: army.garrisonedAt }); },
    disabled: !isPlayerControlled,
    onClick: () => {
      ungarrisonMilitaryBridge(army.id).catch(acknowledgeBridgeFailure);
    },
  } : null;

  const embarkAction: MilitaryAction | null = !army.isNavy ? {
    label: army.embarkedNavyId
      ? webUIText('Military.Disembark')
      : webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.498.6'),
    icon: army.embarkedNavyId ? '/assets/icons/I_Ungarrison.png' : '/assets/icons/I_NaviesQuickButton.png',
    description: army.embarkedNavyId
      ? webUIText('Military.DisembarkNearest.Description')
      : webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.500.7'),
    tutorialTarget: army.embarkedNavyId ? undefined : 'EmbarkMilitaryButton',
    disabled: !isPlayerControlled,
    onClick: () => {
      const action = army.embarkedNavyId
        ? disembarkMilitaryBridge(army.id)
        : startMilitaryEmbarkTargetingBridge(army.id);
      action.catch(acknowledgeBridgeFailure);
    },
  } : null;

  const forcedMarchAction: MilitaryAction = {
    get label() { return isForcedMarching ? webUIText("MilitarySidebar.EndMarch") : webUIText("MilitarySidebar.ForcedMarch"); },
    icon: '/assets/icons/I_Speed.png',
    description: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.511.8'),
    isActive: isForcedMarching,
    disabled: army.isNavy || !isPlayerControlled || (!isForcedMarching && !army.canForcedMarch),
    onClick: () => {
      setMilitaryForcedMarchBridge(army.id, !isForcedMarching).catch(acknowledgeBridgeFailure);
    },
  };

  const orderPanelActions: MilitaryAction[] = [
    forcedMarchAction,
    ...(garrisonAction ? [garrisonAction] : []),
    ...(embarkAction ? [embarkAction] : []),
    {
      label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.533.9'),
      icon: '/assets/icons/I_MergeUnits.png',
      get description() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.535.1", { Value1: webUIText(army.isNavy ? 'Common.FleetLower' : 'Common.ArmyLower') }); },
      disabled: !isPlayerControlled || !army.canMerge,
      onClick: () => {
        startMilitaryMergeTargetingBridge(army.id).catch(acknowledgeBridgeFailure);
      },
    },
  ];

  const replenishCost = army.replenishCost ?? 0;
  const canUseReplenish = isReplenishing || (isPlayerControlled && !!army.formationTemplate && !!army.canReplenish && replenishCost > 0);
  const replenishTooltip: TooltipContent = {
    get title() { return isReplenishing ? webUIText("MilitarySidebar.CancelReplenish") : webUIText("MilitarySidebar.Replenish"); },
    get body() { return army.formationTemplate ? (isReplenishing ? webUIText("MilitarySidebar.CancelReplenishmentBody") : webUIText("MilitarySidebar.QueueReplenishmentBody")) : webUIText("MilitarySidebar.AssignFormationBeforeReplenish"); },
    lines: [
      { label: webUIText('Common.Cost'), value: formatNumber(replenishCost), valueIcon: '/assets/icons/I_Coins.png', valueColor: 'var(--gold)' },
    ],
  };
  const replenishAction: MilitaryAction = {
    get label() { return isReplenishing ? webUIText("MilitarySidebar.CancelReplenish") : webUIText("MilitarySidebar.Replenish"); },
    icon: '/assets/icons/I_Replenish.png',
    get description() { return army.formationTemplate ? (isReplenishing ? webUIText("MilitarySidebar.CancelReplenishmentBody") : webUIText("MilitarySidebar.QueueReplenishmentBody")) : webUIText("MilitarySidebar.AssignFormationBeforeReplenish"); },
    tooltip: replenishTooltip,
    isActive: isReplenishing,
    stateLabel: replenishCost > 0 ? formatNumber(replenishCost) : undefined,
    disabled: !canUseReplenish,
    onClick: () => {
      replenishMilitaryBridge(army.id).catch(acknowledgeBridgeFailure);
    },
  };

  const destructiveAction: MilitaryAction = {
    get label() { return army.isFoederatiAuxiliary ? webUIText("MilitarySidebar.StandDown") : webUIText("MilitarySidebar.Disband"); },
    icon: army.isFoederatiAuxiliary ? '/assets/icons/I_Retreat.png' : '/assets/icons/I_DisbandUnits.png',
    get description() { return army.isFoederatiAuxiliary ? webUIText("MilitarySidebar.ReleaseAuxiliaryBody") : webUIText("MilitarySidebar.DisbandThisForce"); },
    tone: 'danger',
    disabled: !isPlayerControlled,
    onClick: army.isFoederatiAuxiliary && army.foederatiOriginFactionId
      ? () => { toggleFoederatiCallupBridge(army.foederatiOriginFactionId!, false).catch(acknowledgeBridgeFailure); }
      : () => { disbandMilitaryBridge(army.id).catch(acknowledgeBridgeFailure); },
  };
  const destructiveConfirmPending = confirmDestructiveId === army.id;
  const handleDestructiveToolbarAction = () => {
    if (destructiveAction.disabled) return;

    if (!destructiveConfirmPending) {
      setConfirmDestructiveId(army.id);
      return;
    }

    setConfirmDestructiveId(null);
    destructiveAction.onClick?.();
  };
  const destructiveToolbarAction: MilitaryAction = {
    ...destructiveAction,
    label: destructiveConfirmPending ? `${webUIText('Common.Confirm')} ${destructiveAction.label}` : destructiveAction.label,
    icon: destructiveAction.icon,
    isActive: destructiveConfirmPending,
    onClick: handleDestructiveToolbarAction,
  };
  const headerCommandActions: MilitaryAction[] = [
    replenishAction,
    ...orderPanelActions,
  ];

  const formationActions: MilitaryAction[] = army.isPersonalGuard ? [] : [
    {
      get label() { return webUIText("Common.Assign"); },
      icon: '/assets/icons/I_NewTemplate.png',
      get description() { return webUIText("MilitarySidebar.AssignAFormation"); },
      disabled: !isPlayerControlled,
      onClick: () => {
        openScreen('military', `assign:${encodeURIComponent(army.id)}`);
      },
    },
    ...(army.formationTemplate ? [{
      get label() { return webUIText("MilitarySidebar.Edit"); },
      icon: '/assets/icons/I_Template.png',
      get description() { return webUIText("MilitarySidebar.EditTemplateBody"); },
      disabled: !isPlayerControlled,
      onClick: () => {
        if (army.formationTemplate) openScreen('military', `template:${encodeURIComponent(army.formationTemplate)}`);
      },
    }] : []),
    {
      label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.572.10'),
      icon: '/assets/icons/I_DuplicateTemplate.png',
      description: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.574.11'),
      disabled: !isPlayerControlled || !army.formationTemplate,
      onClick: () => {
        duplicateMilitaryFormationTemplateBridge(army.id)
          .then(response => {
            if (response.duplicated && response.templateId) openScreen('military', `template:${encodeURIComponent(response.templateId)}`);
          })
          .catch(acknowledgeBridgeFailure);
      },
    },
  ];

  const readinessCards: ReadinessCard[] = [
    {
      id: 'morale',
      label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.598.14'),
      icon: '/assets/icons/I_Loyalty.png',
      value: formatPercent(army.morale),
      percent: army.morale,
      color: army.morale >= 50 ? 'green' : 'red',
      valueColor: getMoraleColor(army.morale),
      tooltip: {
        title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.605.15'),
        body: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.606.16'),
        lines: [
          { label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.608.17'), value: formatPercent(army.morale), valueColor: getMoraleColor(army.morale) },
          ...(isForcedMarching ? [{ label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.609.18'), get value() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.609.1"); }, valueColor: 'var(--red)' }] : []),
        ],
      },
    },
    {
      id: 'supply',
      label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.615.19'),
      icon: '/assets/icons/I_RequisitionSupplies.png',
      get value() { return army.supplyDays != null ? formatSupplyWindow(army.supplyDays) : webUIText("Common.Unknown"); },
      percent: Math.min(100, ((army.supplyDays ?? 0) / 90) * 100),
      color: (army.supplyDays ?? 0) > 30 ? 'green' : 'red',
      valueColor: (army.supplyDays ?? 0) > 30 ? 'var(--green)' : 'var(--red)',
      tooltip: { title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.621.20'), body: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.621.21') },
    },
  ];
  const moraleReadiness = readinessCards[0];
  const supplyReadiness = readinessCards[1];

  const marchStatTiles = [
    {
      id: 'movement',
      label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.625.22'),
      icon: '/assets/icons/I_Speed.png',
      value: formatNumber(movementSpeed),
      tooltip: {
        title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.632.23'),
        get body() { return webUIText(isForcedMarching ? 'MilitarySidebar.MovementSpeedBodyForcedMarch' : 'MilitarySidebar.MovementSpeedBody'); },
      },
    },
    {
      id: 'pressure',
      get label() { return army.isNavy ? webUIText("MilitarySidebar.Capacity") : webUIText("MilitarySidebar.Siege"); },
      icon: army.isNavy ? '/assets/icons/I_Capacity.png' : '/assets/icons/I_SiegePower.png',
      value: army.isNavy && army.capacity != null
        ? `${formatNumber(army.usedCapacity ?? 0)}/${formatNumber(army.capacity)}`
        : formatNumber(derived.siegePower),
      tooltip: army.isNavy && army.capacity != null
        ? { title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.649.24'), get body() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.649.1", { Value1: formatNumber(army.usedCapacity ?? 0), Value2: formatNumber(army.capacity) }); } }
        : { title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.650.25'), body: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.650.26') },
    },
    {
      id: 'upkeep',
      label: webUIText('Auto.ComponentsSidebarsMilitarySidebar.311.2'),
      icon: '/assets/icons/I_Coins.png',
      value: formatNumber(derived.upkeep),
      tooltip: { title: webUIText('Auto.ComponentsSidebarsMilitarySidebar.311.2') },
    },
  ];

  // Short type names under Damage/Armour headers - full names live in tooltips only.
  const damageStatTiles = [
    { id: 'slashDmg', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.364.3'), icon: '/assets/icons/I_Damage_Slash.png', value: formatNumber(derived.slashDmg), tooltip: { title: webUIText('Auto.TopProp.DataGlossary.285.137'), body: webUIText('Auto.TopProp.DataGlossary.286.138') } },
    { id: 'pierceDmg', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.362.1'), icon: '/assets/icons/I_Damage_Pierce.png', value: formatNumber(derived.pierceDmg), tooltip: { title: webUIText('Auto.TopProp.DataGlossary.277.133'), body: webUIText('Auto.TopProp.DataGlossary.278.134') } },
    { id: 'crushDmg', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.363.2'), icon: '/assets/icons/I_Damage_Crush.png', value: formatNumber(derived.crushDmg), tooltip: { title: webUIText('Auto.TopProp.DataGlossary.281.135'), body: webUIText('Auto.TopProp.DataGlossary.282.136') } },
  ];

  const armourStatTiles = [
    { id: 'slashArmour', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.370.6'), icon: '/assets/icons/I_Armour_Slash.png', value: formatNumber(derived.slashArmour), tooltip: { title: webUIText('Auto.TopProp.DataGlossary.297.143'), body: webUIText('Auto.TopProp.DataGlossary.298.144') } },
    { id: 'pierceArmour', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.368.4'), icon: '/assets/icons/I_Armour_Pierce.png', value: formatNumber(derived.pierceArmour), tooltip: { title: webUIText('Auto.TopProp.DataGlossary.289.139'), body: webUIText('Auto.TopProp.DataGlossary.290.140') } },
    { id: 'crushArmour', label: webUIText('Auto.Attr.ComponentsCommonUnitTooltip.369.5'), icon: '/assets/icons/I_Armour_Crush.png', value: formatNumber(derived.crushArmour), tooltip: { title: webUIText('Auto.TopProp.DataGlossary.293.141'), body: webUIText('Auto.TopProp.DataGlossary.294.142') } },
  ];

  const handleCommandMode = (mode: CommandMode) => {
    if (mode === 'direct') {
      setDelegationOverride({ base: delegatedBase, value: false });
      setMilitaryDelegationBridge(army.id, false).catch((error) => {
        acknowledgeBridgeFailure(error);
        setDelegationOverride(null);
      });
      return;
    }

    setDoctrineOverride({ base: initialDoctrine, value: mode });
    setDelegationOverride({ base: delegatedBase, value: true });
    setMilitaryDoctrineBridge(army.id, mode)
      .then(() => setMilitaryDelegationBridge(army.id, true))
      .catch((error) => {
        acknowledgeBridgeFailure(error);
        setDoctrineOverride(null);
        setDelegationOverride(null);
      });
  };

  const renderCommandAction = (action: MilitaryAction) => (
    <Tooltip key={action.label} content={action.tooltip ?? { title: action.label, body: action.description }} position="bottom" delay={150}>
      <button
        type="button"
        data-tutorial-target={action.tutorialTarget}
        className={`mil-action-chip${action.disabled ? ' is-disabled' : ''}`}
        disabled={action.disabled}
        aria-label={action.label}
        onMouseDown={() => { if (!action.disabled && action.onClick) action.onClick(); }}
      >
        <img src={action.icon} alt="" className="mil-action-chip-icon" />
        <span className="mil-action-chip-label">{action.label}</span>
      </button>
    </Tooltip>
  );

  const renderFormationPanel = () => (
    <div className="mil-formation-panel mil-formation-panel--embedded">
      <div className="mil-formation-main">
        <img src="/assets/icons/I_Template.png" alt="" />
        <div>
          {army.formationTemplate && !army.isPersonalGuard ? (
            <Tooltip
              content={{
                title: army.formationTemplate,
                body: webUIText('MilitarySidebar.EditTemplateBody'),
              }}
              position="bottom"
              delay={150}
            >
              <button
                type="button"
                className="mil-formation-name-button"
                onMouseDown={() => openScreen('military', `template:${encodeURIComponent(army.formationTemplate || '')}`)}
              >
                <span className="mil-formation-name">{army.formationTemplate}</span>
              </button>
            </Tooltip>
          ) : (
            <span className="mil-formation-name">{army.formationTemplate || webUIText('MilitarySidebar.NoFormationAssigned')}</span>
          )}
        </div>
      </div>
      {formationActions.length > 0 && (
        <div className="mil-action-strip mil-action-strip--compact">
          {formationActions.map((action) => (
            <Tooltip key={action.label} content={action.tooltip ?? { title: action.label, body: action.description }} position="bottom" delay={150}>
              <button
                type="button"
                className={`mil-action-chip${action.disabled ? ' is-disabled' : ''}`}
                disabled={action.disabled}
                aria-label={action.label}
                onMouseDown={() => { if (!action.disabled && action.onClick) action.onClick(); }}
              >
                <img src={action.icon} alt="" className="mil-action-chip-icon" />
                <span className="mil-action-chip-label">{action.label}</span>
              </button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrderCommand = (action: MilitaryAction) => (
    <Tooltip key={action.label} content={action.tooltip ?? { title: action.label, body: action.description }} position="bottom" delay={150}>
      <button
        type="button"
        data-tutorial-target={action.tutorialTarget}
        className={`mil-order-command${action.isActive ? ' is-active' : ''}${action.disabled ? ' is-disabled' : ''}${action.tone === 'danger' ? ' mil-order-command--danger' : ''}`}
        aria-label={action.label}
        aria-pressed={action.isActive || undefined}
        disabled={action.disabled}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!action.disabled && action.onClick) action.onClick();
        }}
      >
        <img src={action.icon} alt="" />
      </button>
    </Tooltip>
  );

  const renderCommandAndFormation = () => {
    const hasHierarchy = canHaveSubordinates || subordinateRows.length > 0 || !!army.parentCommand || commandActions.length > 0;
    const collapsible = subordinateRows.length > 3;
    const visibleSubs = collapsible && !subsExpanded ? subordinateRows.slice(0, 3) : subordinateRows;

    return (
      <>
        <SectionHeading variant="ornate" title={webUIText('Auto.ComponentsSidebarsMilitarySidebar.934.15')} />
        <div className="mil-command-group">
          {(army.parentCommand || commandActions.length > 0) && (
            <div className="mil-command-top-row">
              {army.parentCommand ? (
                <Tooltip
                  content={{
                    title: army.parentCommand,
                    get body() { return webUIText('MilitarySidebar.Under', { ParentCommand: army.parentCommand }); },
                    lines: [
                      { label: webUIText('Military.Command.TacticsBonus'), value: formatPercent((army.hierarchyTacticsBonus ?? 0) * 100, 1), valueColor: 'var(--green)' },
                      { label: webUIText('Military.Command.MoraleBonus'), value: formatPercent((army.hierarchyMoraleBonus ?? 0) * 100, 1), valueColor: 'var(--green)' },
                      { label: webUIText('Military.Command.SpeedBonus'), value: formatPercent((army.hierarchySpeedBonus ?? 0) * 100, 1), valueColor: 'var(--green)' },
                    ],
                  }}
                  position="right"
                  delay={150}
                >
                  <div
                    className={`mil-parent-command-row${army.parentCommandId ? ' is-clickable' : ''}`}
                    onMouseDown={() => { if (army.parentCommandId) openSidebar('military', army.parentCommandId); }}
                  >
                    <img src="/assets/icons/I_AttachCommand.png" alt="" className="mil-parent-command-icon" />
                    <span className="mil-parent-command-name">{webUIText('MilitarySidebar.Under', { ParentCommand: army.parentCommand })}</span>
                    {army.parentCommandId && <img src="/assets/icons/I_NavNext.png" alt="" className="mil-parent-command-jump" />}
                  </div>
                </Tooltip>
              ) : (
                <div className="mil-command-top-spacer" />
              )}
              {commandActions.length > 0 && (
                <div className="mil-command-actions mil-command-actions--compact">
                  {commandActions.map((action) => renderCommandAction(action))}
                </div>
              )}
            </div>
          )}

          {renderFormationPanel()}

          {canHaveSubordinates && (
            <div className="mil-command-stats">
              <div>
                <span>{webUIText('Military.Command.SubordinateCapacity')}</span>
                <strong>{formatNumber(army.commandSubordinateCount ?? 0)} / {formatNumber(army.commandSubordinateCapacity ?? 0)}</strong>
              </div>
              <div>
                <span>{webUIText('Military.Command.BuffRadius')}</span>
                <strong>{formatNumber(army.commandBuffRadius ?? 0)}</strong>
              </div>
              <div>
                <span>{webUIText('Military.Command.Maintenance')}</span>
                <strong>{formatNumber(army.commandMaintenance ?? 0)}</strong>
              </div>
            </div>
          )}

          {canHaveSubordinates && (
            <div className="mil-sub-command">
              <div className="mil-sub-command-title">
                <span>{webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.949.39')}</span>
                <strong>{commandModeOptions.find((option) => option.id === commandMode)?.label}</strong>
              </div>
              <div className="mil-command-mode-grid mil-command-mode-grid--subordinates">
                {commandModeOptions.map((option) => (
                  <Tooltip key={option.id} content={commandModeTooltips[option.id]} position="bottom" delay={150}>
                    <button
                      type="button"
                      className={`mil-command-mode${commandMode === option.id ? ' is-active' : ''}${!isPlayerControlled ? ' is-disabled' : ''}`}
                      aria-label={option.label}
                      aria-pressed={commandMode === option.id}
                      disabled={!isPlayerControlled}
                      onMouseDown={() => { if (isPlayerControlled) handleCommandMode(option.id); }}
                    >
                      <img src={option.icon} alt="" />
                    </button>
                  </Tooltip>
                ))}
                <Tooltip
                  content={{
                    title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.967.40'),
                    get body() { return autoSquash ? webUIText('MilitarySidebar.IdleSubordinatesMarch') : webUIText('MilitarySidebar.WhenEnabledIdle'); },
                  }}
                  position="bottom"
                  delay={150}
                  wrapperClassName="mil-command-mode-quell-wrap"
                >
                  <button
                    type="button"
                    className={`mil-command-mode mil-command-mode--standing-order${autoSquash ? ' is-on' : ''}${!isPlayerControlled ? ' is-disabled' : ''}`}
                    aria-label={webUIText('Auto.ComponentsSidebarsMilitarySidebar.987.18')}
                    aria-pressed={autoSquash}
                    disabled={!isPlayerControlled}
                    onMouseDown={() => {
                      if (!isPlayerControlled) return;
                      const next = !autoSquash;
                      setAutoSquashOverride({ base: autoSquashBase, value: next });
                      setMilitaryAutoSquashRebelsBridge(army.id, next).catch((error) => {
                        acknowledgeBridgeFailure(error);
                        setAutoSquashOverride(null);
                      });
                    }}
                  >
                    <img src={QUELL_ICON} alt="" />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          {hasHierarchy && visibleSubs.map((sub) => {
            const ratio = sub.maxStrength > 0 ? sub.strength / sub.maxStrength : 0;
            const force = sub.id ? militaryForceById.get(sub.id) : undefined;
            const subMeta = sub.commanderName;
            const subUnitTypes = sub.unitTypes;
            return (
              <Tooltip
                key={sub.id ?? sub.name}
                content={{
                  title: sub.name,
                  get body() { return webUIText('Auto.Prop.componentssidebarsMilitarySidebar.1033.1', { CommanderName: sub.commanderName }); },
                  lines: [
                    { label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.1033.43'), value: formatStrength(sub.strength, sub.maxStrength), valueColor: getStrengthColor(ratio) },
                    ...(force ? [
                      { label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.598.14'), value: formatPercent(force.morale), valueColor: getMoraleColor(force.morale) },
                      { label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.615.19'), value: formatSupplyWindow(force.supplyDays), valueColor: force.supplyDays > 30 ? 'var(--green)' : 'var(--red)' },
                    ] : []),
                    { label: webUIText('Military.Command.RangeStatus'), value: webUIText(sub.withinCommandRange ? 'Military.Command.InRange' : 'Military.Command.OutOfRange'), valueColor: sub.withinCommandRange ? 'var(--green)' : 'var(--red)' },
                    { label: webUIText('Military.Command.Distance'), value: `${formatNumber(sub.distanceToSuperior)} / ${formatNumber(sub.superiorCommandRadius)}` },
                    { label: webUIText('Military.Command.TacticsBonus'), value: formatPercent(sub.hierarchyTacticsBonus * 100, 1), valueColor: sub.withinCommandRange ? 'var(--green)' : 'var(--text-muted)' },
                    { label: webUIText('Military.Command.MoraleBonus'), value: formatPercent(sub.hierarchyMoraleBonus * 100, 1), valueColor: sub.withinCommandRange ? 'var(--green)' : 'var(--text-muted)' },
                    { label: webUIText('Military.Command.SpeedBonus'), value: formatPercent(sub.hierarchySpeedBonus * 100, 1), valueColor: sub.withinCommandRange ? 'var(--green)' : 'var(--text-muted)' },
                    ...subUnitTypes.map((entry) => ({ label: formatUnitTypeName(entry.type), value: formatNumber(entry.count) })),
                  ],
                }}
                position="right"
                delay={200}
              >
                <div className={`mil-sub-row${sub.depth > 0 ? ' mil-sub-row--nested' : ''}${sub.withinCommandRange ? '' : ' mil-sub-row--out-of-range'}${sub.id ? ' is-clickable' : ''}`} onClick={sub.id ? () => openSidebar('military', sub.id) : undefined}>
                  <img src={army.isNavy ? '/assets/icons/I_NaviesQuickButton.png' : '/assets/icons/I_ArmiesQuickButton.png'} alt="" className="mil-sub-icon" />
                  <div className="mil-sub-info">
                    <span className="mil-sub-name">{sub.name}</span>
                    <span className="mil-sub-commander">{subMeta}</span>
                  </div>
                  <div className="mil-sub-metrics">
                    <PaintedBar percent={ratio * 100} color={getStrengthBarColor(ratio)} className="mil-sub-strength-meter" />
                    <div className="mil-sub-strength-line">
                      <span className="mil-sub-strength">{formatStrength(sub.strength, sub.maxStrength)}</span>
                    </div>
                    {subUnitTypes.length > 0 && (
                      <div className="mil-sub-type-counts">
                        {renderUnitTypeCounts(subUnitTypes)}
                      </div>
                    )}
                  </div>
                </div>
              </Tooltip>
            );
          })}
          {collapsible && (
            <button type="button" className="mil-sub-toggle" onClick={() => setSubsExpanded((current) => !current)}>
              {subsExpanded ? webUIText('MilitarySidebar.ShowLess') : webUIText('MilitarySidebar.ShowAll', { Value1: formatNumber(subordinateRows.length) })}
            </button>
          )}
        </div>
      </>
    );
  };

  const renderEmbarkedArmies = () => {
    if (!army.isNavy || embarkedRows.length === 0) return null;

    return (
      <>
        <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.1063.44')} />
        <div className="mil-embarked">
          {embarkedRows.map((embarkedArmy) => (
            <div key={embarkedArmy.id ?? embarkedArmy.name} className="mil-embarked-row">
              <button
                type="button"
                className="mil-embarked-link"
                disabled={!embarkedArmy.id}
                onMouseDown={() => {
                  if (embarkedArmy.id) showMilitarySidebarBridge(embarkedArmy.id).catch(acknowledgeBridgeFailure);
                }}
              >
                <img src="/assets/icons/I_ArmiesQuickButton.png" alt="" className="mil-embarked-icon" />
                <span className="mil-embarked-name">{embarkedArmy.name}</span>
                <span className="mil-embarked-strength">{formatLargeNumber(embarkedArmy.strength)}</span>
              </button>
              <Tooltip content={{ title: webUIText('Military.Disembark'), body: webUIText('Military.DisembarkNearest.Description') }} position="bottom" delay={150}>
                <GameButton
                  variant="outline"
                  icon="/assets/icons/I_Ungarrison.png"
                  className="mil-embarked-disembark"
                  disabled={!isPlayerControlled || !embarkedArmy.id}
                  ariaLabel={webUIText('Military.Disembark')}
                  onClick={() => {
                    if (embarkedArmy.id) disembarkMilitaryBridge(embarkedArmy.id).catch(acknowledgeBridgeFailure);
                  }}
                >
                  {webUIText('Military.Disembark')}
                </GameButton>
              </Tooltip>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <>
    <div className="sidebar sidebar--left sidebar--visible military-sidebar">
      <SidebarToolbar
        navButtons={[
          { icon: '/assets/icons/I_NavPrevious.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.679.1"); }, onClick: () => { if (previousMilitaryId) openSidebar('military', previousMilitaryId); } },
          { icon: '/assets/icons/I_NavNext.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.680.1"); }, onClick: () => { if (nextMilitaryId) openSidebar('military', nextMilitaryId); } },
        ]}
        actionButtons={[
          { icon: isPinned ? '/assets/icons/I_Pin_Pinned.png' : '/assets/icons/I_Pin_Unpinned.png', get tooltip() { return isPinned ? webUIText("MilitarySidebar.Unpin") : webUIText("MilitarySidebar.Pin"); }, onClick: () => togglePin('military', army.id), isActive: isPinned },
          { icon: '/assets/icons/I_ZoomTo.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.684.1"); }, onClick: () => zoomToBridge('military', army.id) },
          { icon: '/assets/icons/I_Diplomacy.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.685.1"); }, onClick: () => openSidebar('diplomacy', army.factionId ?? army.faction) },
          { icon: '/assets/ui/I_HelpIcon.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.686.1"); }, onClick: () => showAdvisor('militarySidebar', { force: true }) },
        ]}
        onClose={onClose}
      />

      <div className="mil-header">
        <img src={headerBg} alt="" className="mil-header-bg" />
        <div className="mil-header-scrim">
          <div className="mil-top-command-strip">
            <div className="mil-top-command-danger">
              {renderOrderCommand(destructiveToolbarAction)}
            </div>
            <div className="mil-top-command-main">
              {headerCommandActions.map((action) => renderOrderCommand(action))}
            </div>
          </div>
          <div className="mil-header-identity">
            <PersonTooltip characterId={army.commanderId ?? null} position="right" delay={200}>
              <button
                type="button"
                className="mil-header-portrait-button"
                onMouseDown={() => { if (army.commanderId) openSidebar('character', army.commanderId); }}
              >
                <Portrait personId={army.commanderId} name={army.commanderName} size="xl" shape="circle" showBorder borderTier="gold" className="mil-header-portrait" />
              </button>
            </PersonTooltip>
            <div className="mil-header-text">
              <div className="mil-header-name">{army.name}</div>
              <div className="mil-header-subtitle">
                <div className="mil-header-commander-line">
                  <div className="mil-header-commander-copy">
                    <span className="mil-header-commander-name">{army.commanderName || webUIText('Common.NoCommander')}</span>
                    <span className="mil-header-commander-title">{army.commanderTitle || army.commandRank}</span>
                  </div>
                  <Tooltip
                    content={{
                      get title() { return army.commanderId ? webUIText("MilitarySidebar.ReplaceCommander") : webUIText("MilitarySidebar.AssignCommander"); },
                      get body() { return isPlayerControlled ? webUIText("MilitarySidebar.ChooseCommanderBody") : webUIText("MilitarySidebar.OnlyYourOwn"); },
                    }}
                    position="bottom"
                    delay={150}
                  >
                    <button
                      type="button"
                      className={`mil-header-commander-action${!isPlayerControlled ? ' is-disabled' : ''}`}
                      aria-label={army.commanderId ? webUIText("MilitarySidebar.ReplaceCommander") : webUIText("MilitarySidebar.AssignCommander")}
                      disabled={!isPlayerControlled}
                      onMouseDown={() => { if (isPlayerControlled) setCommanderAssignmentOpen(true); }}
                    >
                      <img src="/assets/icons/I_ReplaceCommander.png" alt="" />
                    </button>
                  </Tooltip>
                </div>
              </div>
              {commanderStats.length > 0 && (
                <div className="mil-header-commander-stats">
                  {commanderStats.map((stat) => (
                    <Tooltip key={stat.id} content={stat.tooltip} position="bottom" delay={100}>
                      <div className="mil-header-commander-stat">
                        <img src={stat.icon} alt="" draggable={false} />
                        <span className="mil-header-commander-stat-label">{stat.label}</span>
                        {Math.abs(stat.temporaryTotal) >= 0.05 && (
                          <span className="mil-header-commander-stat-temp" style={{ color: modifierValueColor(stat.temporaryTotal) }}>
                            {formatSignedNumber(stat.temporaryTotal, { maximumFractionDigits: 1 })}
                          </span>
                        )}
                        <span className="mil-header-commander-stat-value" style={{ color: getStatColor(stat.value) }}>{formatNumber(stat.value)}</span>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )}
              <Tooltip content={{ get title() { return webUIText("Auto.Prop.componentssidebarsMilitarySidebar.723.1", { Value1: formatLargeNumber(army.strength), Value2: formatLargeNumber(army.maxStrength) }); }, body: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.723.27') }} position="bottom" delay={200} wrapperClassName="mil-header-status-tooltip">
                <div className="mil-strength-bar-wrap">
                  <span className="mil-strength-label" style={{ color: getStrengthColor(strengthRatio) }}>
                    <img src="/assets/icons/I_Swords.png" alt="" className="mil-strength-icon" />
                    {`${formatLargeNumber(army.strength)} / ${formatLargeNumber(army.maxStrength)}`}
                  </span>
                  <PaintedBar percent={strengthRatio * 100} color="gold" />
                </div>
              </Tooltip>
              <div className="mil-header-vitals">
                <Tooltip content={moraleReadiness.tooltip} position="bottom" delay={200} wrapperClassName="mil-header-status-tooltip">
                  <div className="mil-header-morale-wrap">
                    <span className="mil-header-morale-label" style={{ color: moraleReadiness.valueColor }}>
                      <img src={moraleReadiness.icon} alt="" className="mil-header-morale-icon" />
                      {moraleReadiness.label}
                    </span>
                    <span className="mil-header-morale-value" style={{ color: moraleReadiness.valueColor }}>{moraleReadiness.value}</span>
                    <PaintedBar percent={moraleReadiness.percent} color={moraleReadiness.color} />
                  </div>
                </Tooltip>
                <Tooltip content={supplyReadiness.tooltip} position="bottom" delay={200} wrapperClassName="mil-header-status-tooltip">
                  <div className="mil-header-morale-wrap mil-header-supply-wrap">
                    <span className="mil-header-morale-label" style={{ color: supplyReadiness.valueColor }}>
                      <img src={supplyReadiness.icon} alt="" className="mil-header-morale-icon" />
                      {supplyReadiness.label}
                    </span>
                    <span className="mil-header-morale-value" style={{ color: supplyReadiness.valueColor }}>{supplyReadiness.value}</span>
                    <PaintedBar percent={supplyReadiness.percent} color={supplyReadiness.color} />
                  </div>
                </Tooltip>
              </div>
            </div>
            <div className="mil-header-emblems">
              <FactionTooltip factionId={army.factionId} factionName={army.faction} delay={150}>
                <FactionRoundel
                  factionId={army.factionId ?? army.faction}
                  name={army.faction}
                  size="md"
                  className="mil-header-roundel"
                  onClick={() => openSidebar('diplomacy', army.factionId ?? army.faction)}
                />
              </FactionTooltip>
            </div>
          </div>
        </div>
      </div>

      <SidebarTabBar
        tabs={[{ id: 'overview', label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.736.28') }, { id: 'units', label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.736.30') }]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'overview' | 'units')}
      />

      <StyledScrollArea className="sidebar-content sidebar-content--textured mil-content">
        {activeTab === 'overview' && (
          <div className="mil-overview">
            <div className={`mil-status-strip${isForcedMarching || attritionSources.length > 0 ? ' mil-status-strip--warning' : ''}`}>
              <div className="mil-status-order">
                <span className="mil-status-order-label">{webUIText('Auto.ComponentsSidebarsMilitarySidebar.837.12')}</span>
                <strong className="mil-status-order-value">{currentOrderLabel}</strong>
              </div>
              <div className="mil-status-flags">
                {isForcedMarching && (
                  <span className="mil-status-flag mil-status-flag--warn">
                    <img src="/assets/icons/I_Speed.png" alt="" />
                    {webUIText('MilitarySidebar.ForcedMarchActive')}
                  </span>
                )}
                {isReplenishing && (
                  <span className="mil-status-flag">
                    <img src="/assets/icons/I_Replenish.png" alt="" />
                    {webUIText('MilitarySidebar.ReplenishingActive')}
                  </span>
                )}
                {army.embarkedNavyId && army.embarkedNavyName && (
                  <button
                    type="button"
                    className="mil-status-flag mil-status-flag--link"
                    onPointerDown={() => openSidebar('military', army.embarkedNavyId!)}
                  >
                    <img src="/assets/icons/I_NaviesQuickButton.png" alt="" />
                    <span>{webUIText('Military.EmbarkedIn', { Navy: army.embarkedNavyName })}</span>
                  </button>
                )}
              </div>
            </div>

            {attritionSources.length > 0 && (
              <>
                <SectionHeading variant="ornate" title={webUIText('Military.Attrition.Title')} />
                <div className="mil-attrition-list">
                  {attritionSources.map(source => {
                    const projectedLosses = Math.ceil(army.strength * source.strengthLossRate);
                    const icon = source.id === 'snow'
                      ? '/assets/icons/Terrain/I_SnowAttrition.png'
                      : source.id === 'desert'
                        ? '/assets/icons/Terrain/I_DesertAttrition.png'
                        : source.id === 'overcrowding'
                          ? '/assets/icons/I_ArmiesQuickButton.png'
                          : source.id === 'forcedMarch'
                            ? '/assets/icons/I_Speed.png'
                            : '/assets/icons/Terrain/I_Attrition.png';
                    return (
                      <div key={source.id} className="mil-attrition-row">
                        <img src={icon} alt="" />
                        <div className="mil-attrition-copy">
                          <strong>{source.name}</strong>
                          <span>
                            {webUIText(source.id === 'forcedMarch' ? 'Military.Attrition.ExhaustionLoss' : 'Military.Attrition.ProjectedLoss', {
                              Count: formatNumber(projectedLosses),
                              Percent: formatPercent(source.strengthLossRate * 100, 1),
                            })}
                          </span>
                          {source.moraleLossRate > 0 && (
                            <span>{webUIText('Military.Attrition.MoraleLoss', { Percent: formatPercent(source.moraleLossRate * 100, 1) })}</span>
                          )}
                          {source.id === 'supply' && (
                            <span>{webUIText('Military.Attrition.ShortageSeverity', { Percent: formatPercent(source.severity * 100, 0) })}</span>
                          )}
                          {source.id === 'overcrowding' && (
                            <span>{webUIText('Military.Attrition.NearbyStrength', {
                              Current: formatNumber(source.nearbyStrength),
                              Threshold: formatNumber(source.strengthThreshold),
                            })}</span>
                          )}
                          {source.id === 'forcedMarch' && (
                            <span>{webUIText('Military.Attrition.ExhaustionProgress', { Percent: formatPercent(source.progress * 100, 0) })}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {renderCommandAndFormation()}
            {renderEmbarkedArmies()}

            <SectionHeading variant="ornate" title={webUIText('MilitarySidebar.Combat')} />
            <div className="mil-combat-panel">
              <div className="mil-march-strip">
                {marchStatTiles.map((tile) => (
                  <Tooltip key={tile.id} content={tile.tooltip} position="bottom" delay={150}>
                    <div className="mil-march-tile">
                      <img src={tile.icon} alt="" />
                      <span className="mil-march-tile-label">{tile.label}</span>
                      <strong>{tile.value}</strong>
                    </div>
                  </Tooltip>
                ))}
              </div>
              <div className="mil-combat-grid">
                <div className="mil-combat-col">
                  <span className="mil-combat-col-label">{webUIText('Auto.ComponentsSidebarsMilitarySidebar.319.6')}</span>
                  {damageStatTiles.map((tile) => (
                    <Tooltip key={tile.id} content={tile.tooltip} position="bottom" delay={150}>
                      <div className="mil-combat-stat">
                        <img src={tile.icon} alt="" />
                        <span className="mil-combat-stat-label">{tile.label}</span>
                        <strong>{tile.value}</strong>
                      </div>
                    </Tooltip>
                  ))}
                </div>
                <div className="mil-combat-col">
                  <span className="mil-combat-col-label">{webUIText('Auto.ComponentsSidebarsMilitarySidebar.334.7')}</span>
                  {armourStatTiles.map((tile) => (
                    <Tooltip key={tile.id} content={tile.tooltip} position="bottom" delay={150}>
                      <div className="mil-combat-stat">
                        <img src={tile.icon} alt="" />
                        <span className="mil-combat-stat-label">{tile.label}</span>
                        <strong>{tile.value}</strong>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>

            <SectionHeading
              variant="ornate"
              title={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.849.36')}
              count={urgentResourceRows.length > 0 ? urgentResourceRows.length : undefined}
            />
            {resourceRows.length === 0 ? (
              <div className="mil-resource-empty">{webUIText('MilitarySidebar.StockpilesHealthy')}</div>
            ) : (
              <div className="mil-resource-list">
                {resourceRows.map((row) => {
                  const fillPercent = resourceFillPercent(row);
                  const urgent = isResourceUrgent(row);
                  const fillColor = urgent || fillPercent <= 25 ? 'red' : 'gold';
                  const reserveOk = row.daysRemaining >= resourceReserveTargetDays(row);
                  return (
                    <Tooltip
                      key={row.id}
                      content={{
                        title: row.name,
                        get body() {
                          return row.monthlyUsage > 0
                            ? webUIText('MilitarySidebar.StoredConsumesMonthly', { Value1: formatResourceAmount(row.amount), Value2: formatResourceAmount(row.monthlyUsage) })
                            : webUIText('MilitarySidebar.StoredNoCurrent', { Value1: formatResourceAmount(row.amount) });
                        },
                      }}
                      position="bottom"
                      delay={150}
                    >
                      <div className={`mil-resource-row${urgent ? ' mil-resource-row--urgent' : ' mil-resource-row--stable'}`}>
                        <img src={resourceIconPath(row.id)} alt="" className="mil-resource-icon" />
                        <div className="mil-resource-main">
                          <div className="mil-resource-top">
                            <span className="mil-resource-name">{row.name}</span>
                            <span className="mil-resource-amount">{formatResourceStock(row)}</span>
                          </div>
                          {(urgent || row.capacity > 0) && row.capacity > 0 && (
                            <PaintedBar percent={fillPercent} color={fillColor} className="mil-resource-progress" />
                          )}
                          {row.monthlyUsage > 0 && (urgent || !reserveOk) && (
                            <PaintedBar
                              percent={resourceReservePercent(row)}
                              color={reserveOk ? 'green' : fillColor}
                              className="mil-resource-progress mil-resource-window-progress"
                            />
                          )}
                          <div className="mil-resource-foot">
                            <span className={`mil-resource-burn${row.monthlyUsage > 0 ? ' is-consuming' : ''}`}>
                              {row.monthlyUsage > 0
                                ? webUIText('MilitarySidebar.PerMonthDelta', { Value1: formatResourceAmount(row.monthlyUsage) })
                                : webUIText('MilitarySidebar.Stable')}
                            </span>
                            <span className={`mil-resource-days${urgent ? ' is-urgent' : ''}`}>
                              {row.monthlyUsage > 0 ? formatSupplyWindow(row.daysRemaining) : webUIText('MilitarySidebar.Stored')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            )}

            {debugMode && (
              <>
                <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.811.31')} />
                <div className="sidebar-debug-rows">
                  <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.813.32')} value={`#${formatNumber(army.debugShortId ?? 0)}`} />
                  {army.factionDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.814.33')} value={`#${formatNumber(army.factionDebugShortId)}`} /> : null}
                  {army.commanderDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.815.34')} value={`#${formatNumber(army.commanderDebugShortId)}`} /> : null}
                  {army.parentCommandDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.816.35')} value={`#${formatNumber(army.parentCommandDebugShortId)}`} /> : null}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'units' && (
          <MilitaryUnitsTab
            isNavy={army.isNavy}
            compositionSummary={compositionSummary}
            unitRows={unitRows}
            battleGroups={army.battleGroups}
            unitSelectionBox={unitSelectionBox}
            unitRosterRef={unitRosterRef}
            unitRowRefs={unitRowRefs}
            selectedUnitIdSet={selectedUnitIdSet}
            maxStats={maxStats}
            handleUnitRowMouseDown={handleUnitRowMouseDown}
          />
        )}
      </StyledScrollArea>
    </div>
    <MilitaryCommanderAssignmentModal
      open={commanderAssignmentOpen}
      militaryId={army.id}
      militaryName={army.name}
      currentCommanderId={army.commanderId}
      onClose={() => setCommanderAssignmentOpen(false)}
    />
    </>
  );
};

export default React.memo(MilitarySidebar);

function MilitarySidebarSlot({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const army = useMilitary(sidebarId);
  if (!army) return null;
  return <MilitarySidebar key={army.id} army={army} onClose={onClose} />;
}

registerSidebar({
  id: 'military',
  side: 'left',
  component: MilitarySidebarSlot,
  advisorTopic: 'militarySidebar',
});

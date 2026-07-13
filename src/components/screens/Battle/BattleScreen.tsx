import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import ZoomPanCanvas, { type ZoomPanMetrics, type ZoomPanPoint, type ZoomPanView } from '../../common/layout/scrolling/ZoomPanCanvas';
import {
  hideBattleScreenBridge,
  requestBattleRetreatBridge,
  setBattleFormationOrderBridge,
  setBattleFormationStanceBridge,
  useBattleBridgeState,
  withdrawBattleFormationBridge,
  type BattleFormationLive,
} from '../../../bridge/military-map/useBattleBridge';
import { registerScreen } from '../../../registry/index';
import {
  battlefieldDimension,
  elementHeight,
  findFormationAtPoint,
  formationIdsInSelection,
  percentPointToBattlefield,
  simplifyBattlePath,
  type SelectionBox,
} from './battleGeometry';
import {
  attackKind,
  BattleActionButton,
  BattleHeightLayer,
  BattleObstacleLayer,
  BattleUnitAgentLayer,
  BattleZoomIndicator,
  buildBattleVisualAgents,
  clamp,
  DamageIndicator,
  FormationCounter,
  formationsAreInMeleeContact,
  fmt,
  RangeIndicator,
  SelectionBoxOverlay,
  SideBlock,
  terrainIcon,
  TargetAttackLine,
  WaypointLines,
  AttackEffect,
} from './BattleScreenParts';
import './BattleScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface BattleScreenProps {
  battleId?: string | null;
  onClose: () => void;
}

const MIN_BATTLE_ZOOM = 0.35;
const MAX_BATTLE_ZOOM = 2.5;
const BATTLE_ZOOM_STEP = 1.15;
const AGENT_TOOLTIP_MIN_ZOOM = 1.85;
const BATTLE_PAN_MARGIN_PX = 280;
const EMPTY_SELECTED_IDS: string[] = [];
const EMPTY_DAMAGE_INDICATORS: BattleDamageIndicator[] = [];
const EMPTY_ATTACK_EFFECTS: BattleAttackEffect[] = [];
const BATTLE_HEADER_MEASURE_FRAMES = 18;

const STANCE_OPTIONS = [
  { id: 'neutral', get label() { return webUIText('Auto.TopProp.ComponentsScreensBattleBattleScreen.42.1'); } },
  { id: 'hold', get label() { return webUIText('Auto.TopProp.ComponentsScreensBattleBattleScreen.43.2'); } },
  { id: 'aggressive', get label() { return webUIText('Auto.TopProp.ComponentsScreensBattleBattleScreen.44.3'); } },
  { id: 'defensive', get label() { return webUIText('Auto.TopProp.ComponentsScreensBattleBattleScreen.45.4'); } },
  { id: 'charge', get label() { return webUIText('Auto.TopProp.ComponentsScreensBattleBattleScreen.46.5'); } },
];


interface BattleDamageIndicator {
  key: string;
  formationId: string;
  amount: number;
  x: number;
  y: number;
}

interface BattleAttackEffect {
  key: string;
  formationId: string;
  targetFormationId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  side: string;
  kind: 'melee' | 'ranged' | 'siege';
}

interface BattleSelectionState {
  battleId: string;
  selectedIds: string[];
  selectionBox: SelectionBox | null;
}

interface BattleDamageState {
  battleId: string;
  indicators: BattleDamageIndicator[];
}

interface BattleAttackState {
  battleId: string;
  effects: BattleAttackEffect[];
}




export default function BattleScreen({ battleId, onClose }: BattleScreenProps) {
  const { battle, pending: battlePending } = useBattleBridgeState(battleId);
  const isNavalBattle = battle?.found === true && battle.battleType === 'naval';
  const [expanded, setExpanded] = useState(false);
  const [selectionState, setSelectionState] = useState<BattleSelectionState>({
    battleId: '',
    selectedIds: [],
    selectionBox: null,
  });
  const [damageState, setDamageState] = useState<BattleDamageState>({
    battleId: '',
    indicators: [],
  });
  const [attackState, setAttackState] = useState<BattleAttackState>({
    battleId: '',
    effects: [],
  });
  const [hoveredFormationId, setHoveredFormationId] = useState<string | null>(null);
  const [battleHeaderHeight, setBattleHeaderHeight] = useState(0);
  const [battleZoom, setBattleZoom] = useState(1);
  const battleHeaderRef = useRef<HTMLDivElement>(null);
  const previousStrengthsRef = useRef<{ battleId: string; strengths: Map<string, number> }>({
    battleId: '',
    strengths: new Map(),
  });
  const previousAttackSequencesRef = useRef<{ battleId: string; sequences: Map<string, number> }>({
    battleId: '',
    sequences: new Map(),
  });
  const damageIndexRef = useRef(0);
  const attackIndexRef = useRef(0);
  const damageTimersRef = useRef<number[]>([]);
  const attackTimersRef = useRef<number[]>([]);
  const activeBattleId = battle?.id || battleId || '';
  const closeBattleScreen = useCallback(() => {
    void hideBattleScreenBridge();
    onClose();
  }, [onClose]);
  const expandLabel = expanded ? webUIText('Battle.CollapseView') : webUIText('Battle.ExpandView');

  useEffect(() => {
    setExpanded(false);
  }, [activeBattleId]);

  useEffect(() => {
    let cancelled = false;
    let frameId = 0;
    let remainingFrames = BATTLE_HEADER_MEASURE_FRAMES;

    const measureHeader = () => {
      if (cancelled) return;

      const nextHeight = Math.ceil(elementHeight(battleHeaderRef.current));
      setBattleHeaderHeight(current => Math.abs(current - nextHeight) > 0.5 ? nextHeight : current);

      if (remainingFrames > 0) {
        remainingFrames -= 1;
        frameId = window.requestAnimationFrame(measureHeader);
      }
    };

    const handleResize = () => {
      remainingFrames = 6;
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(measureHeader);
    };

    frameId = window.requestAnimationFrame(measureHeader);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [activeBattleId, battle?.attacker.participants.length, battle?.defender.participants.length, battle?.found, expanded]);

  const clearDamageTimers = useCallback(() => {
    for (const timer of damageTimersRef.current) {
      window.clearTimeout(timer);
    }
    damageTimersRef.current = [];
  }, []);

  const clearAttackTimers = useCallback(() => {
    for (const timer of attackTimersRef.current) {
      window.clearTimeout(timer);
    }
    attackTimersRef.current = [];
  }, []);

  useEffect(() => () => {
    clearDamageTimers();
    clearAttackTimers();
  }, [clearAttackTimers, clearDamageTimers]);

  useEffect(() => {
    if (!battle?.found) {
      previousStrengthsRef.current = { battleId: activeBattleId, strengths: new Map() };
      previousAttackSequencesRef.current = { battleId: activeBattleId, sequences: new Map() };
      return;
    }

    const previous = previousStrengthsRef.current.battleId === activeBattleId
      ? previousStrengthsRef.current.strengths
      : new Map<string, number>();
    const previousSequences = previousAttackSequencesRef.current.battleId === activeBattleId
      ? previousAttackSequencesRef.current.sequences
      : new Map<string, number>();
    const nextStrengths = new Map<string, number>();
    const nextSequences = new Map<string, number>();
    const nextIndicators: BattleDamageIndicator[] = [];
    const nextAttacks: BattleAttackEffect[] = [];
    const formationsById = new Map(battle.formations.map(formation => [formation.id, formation]));

    for (const formation of battle.formations) {
      const priorStrength = previous.get(formation.id);
      const currentStrength = Math.max(0, formation.strength ?? 0);
      nextStrengths.set(formation.id, currentStrength);

      if (typeof priorStrength === 'number' && currentStrength < priorStrength) {
        const amount = Math.round(priorStrength - currentStrength);
        if (amount > 0) {
          damageIndexRef.current += 1;
          nextIndicators.push({
            key: `${formation.id}:${damageIndexRef.current}`,
            formationId: formation.id,
            amount,
            x: formation.positionX,
            y: formation.positionY,
          });
        }
      }

      const priorSequence = previousSequences.get(formation.id);
      const currentSequence = Math.max(0, Math.trunc(formation.attackSequence ?? 0));
      nextSequences.set(formation.id, currentSequence);

      const kind = attackKind(formation);
      if (typeof priorSequence === 'number' && currentSequence > priorSequence) {
        const target = formation.targetFormationId ? formationsById.get(formation.targetFormationId) : null;
        if (target) {
          attackIndexRef.current += 1;
          nextAttacks.push({
            key: `${formation.id}:attack:${attackIndexRef.current}`,
            formationId: formation.id,
            targetFormationId: target.id,
            x: formation.positionX,
            y: formation.positionY,
            targetX: target.positionX,
            targetY: target.positionY,
            side: formation.side,
            kind,
          });
        }
      }
    }

    previousStrengthsRef.current = { battleId: activeBattleId, strengths: nextStrengths };
    previousAttackSequencesRef.current = { battleId: activeBattleId, sequences: nextSequences };

    if (nextIndicators.length > 0) {
      const addTimer = window.setTimeout(() => {
        setDamageState(prev => ({
          battleId: activeBattleId,
          indicators: [
            ...(prev.battleId === activeBattleId ? prev.indicators : []),
            ...nextIndicators,
          ].slice(-32),
        }));
      }, 0);
      damageTimersRef.current.push(addTimer);

      for (const indicator of nextIndicators) {
        const timer = window.setTimeout(() => {
          setDamageState(prev => {
            if (prev.battleId !== activeBattleId) return prev;
            return {
              battleId: prev.battleId,
              indicators: prev.indicators.filter(item => item.key !== indicator.key),
            };
          });
        }, 950);
        damageTimersRef.current.push(timer);
      }
    }

    if (nextAttacks.length > 0) {
      const addTimer = window.setTimeout(() => {
        setAttackState(prev => ({
          battleId: activeBattleId,
          effects: [
            ...(prev.battleId === activeBattleId ? prev.effects : []),
            ...nextAttacks,
          ].slice(-24),
        }));
      }, 0);
      attackTimersRef.current.push(addTimer);

      for (const attack of nextAttacks) {
        const timer = window.setTimeout(() => {
          setAttackState(prev => {
            if (prev.battleId !== activeBattleId) return prev;
            return {
              battleId: prev.battleId,
              effects: prev.effects.filter(item => item.key !== attack.key),
            };
          });
        }, 820);
        attackTimersRef.current.push(timer);
      }
    }
  }, [activeBattleId, battle?.formations, battle?.found]);

  const formations = useMemo(() => battle?.formations ?? [], [battle?.formations]);
  const battlefieldWidth = battlefieldDimension(battle?.battlefieldWidth);
  const battlefieldHeight = battlefieldDimension(battle?.battlefieldHeight);
  const playerReferenceColour = useMemo(() => {
    const playerFormation = formations.find(formation => formation.isPlayerControlled);
    return playerFormation?.faction.colour || null;
  }, [formations]);
  const battleCanvasFrameStyle = useMemo<CSSProperties | undefined>(() => {
    if (battleHeaderHeight <= 0) return undefined;
    return {
      position: 'absolute',
      top: `${battleHeaderHeight}px`,
      right: 0,
      bottom: 0,
      left: 0,
      height: 'auto',
    };
  }, [battleHeaderHeight]);
  const battleInitialView = useCallback(({ viewportWidth, viewportHeight, contentWidth, contentHeight }: ZoomPanMetrics) => {
    const fitZoom = Math.min(viewportWidth / Math.max(1, contentWidth), viewportHeight / Math.max(1, contentHeight));
    const zoom = clamp(fitZoom, MIN_BATTLE_ZOOM, 1);
    return {
      zoom,
      panX: (viewportWidth - contentWidth * zoom) * 0.5,
      panY: (viewportHeight - contentHeight * zoom) * 0.5,
    };
  }, []);
  const handleBattleViewChange = useCallback((view: ZoomPanView) => {
    setBattleZoom(view.zoom);
  }, []);
  const liveFormationIds = useMemo(() => new Set(formations.map(formation => formation.id)), [formations]);
  const formationsById = useMemo(() => new Map(formations.map(formation => [formation.id, formation])), [formations]);
  const visualAgents = useMemo(
    () => buildBattleVisualAgents(formations, formationsById, playerReferenceColour, battlefieldWidth, battlefieldHeight, isNavalBattle),
    [battlefieldHeight, battlefieldWidth, formations, formationsById, isNavalBattle, playerReferenceColour],
  );

  const meleeEngagementTargets = useMemo(() => {
    const targets = new Map<string, BattleFormationLive>();
    for (const formation of formations) {
      const target = formation.targetFormationId ? formationsById.get(formation.targetFormationId) : null;
      if (target && formationsAreInMeleeContact(formation, target)) {
        targets.set(formation.id, target);
        if (!targets.has(target.id)) {
          targets.set(target.id, formation);
        }
      }
    }
    return targets;
  }, [formations, formationsById]);
  const rawSelectedIds = selectionState.battleId === activeBattleId ? selectionState.selectedIds : EMPTY_SELECTED_IDS;
  const selectedIds = useMemo(
    () => rawSelectedIds.filter(id => liveFormationIds.has(id)),
    [liveFormationIds, rawSelectedIds],
  );
  const selectionBox = selectionState.battleId === activeBattleId ? selectionState.selectionBox : null;
  const damageIndicators = damageState.battleId === activeBattleId ? damageState.indicators : EMPTY_DAMAGE_INDICATORS;
  const attackEffects = attackState.battleId === activeBattleId ? attackState.effects : EMPTY_ATTACK_EFFECTS;
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedFormations = useMemo(
    () => formations.filter(formation => selectedIdsSet.has(formation.id)),
    [formations, selectedIdsSet],
  );
  const hoveredFormation = useMemo(
    () => formations.find(formation => formation.id === hoveredFormationId) ?? null,
    [formations, hoveredFormationId],
  );
  const rangeFormations = useMemo(() => {
    if (!hoveredFormation || selectedIdsSet.has(hoveredFormation.id)) {
      return selectedFormations;
    }
    return [...selectedFormations, hoveredFormation];
  }, [hoveredFormation, selectedFormations, selectedIdsSet]);
  const targetLineFormations = useMemo(() => {
    const unique = new Map<string, BattleFormationLive>();
    for (const formation of selectedFormations) {
      if (formation.targetFormationId) unique.set(formation.id, formation);
    }
    if (hoveredFormation?.targetFormationId) {
      unique.set(hoveredFormation.id, hoveredFormation);
    }
    return [...unique.values()];
  }, [hoveredFormation, selectedFormations]);
  const damagedFormationIds = useMemo(
    () => new Set(damageIndicators.map(indicator => indicator.formationId)),
    [damageIndicators],
  );
  const damagePulseKeys = useMemo(() => {
    const keys = new Map<string, string>();
    for (const indicator of damageIndicators) {
      keys.set(indicator.formationId, indicator.key);
    }
    return keys;
  }, [damageIndicators]);
  const selectedCommandable = useMemo(
    () => selectedFormations.filter(formation => formation.isCommandable),
    [selectedFormations],
  );
  const selectedActionFormation = selectedCommandable.length === 1 ? selectedCommandable[0] : null;
  const selectedCommandableStrength = selectedCommandable.reduce((total, formation) => total + formation.strength, 0);
  const selectedCommandableMaxStrength = selectedCommandable.reduce((total, formation) => total + formation.maxStrength, 0);
  const retreatablePlayerParticipants = useMemo(() => {
    if (!battle?.found) {
      return [];
    }

    return [...battle.attacker.participants, ...battle.defender.participants]
      .filter(participant => participant.isPlayerControlled && participant.canRetreat);
  }, [battle]);

  const handleFormationSelect = useCallback((formationId: string, additive: boolean) => {
    setSelectionState(prev => {
      const currentIds = prev.battleId === activeBattleId ? prev.selectedIds : [];
      let nextIds: string[];
      if (!additive) nextIds = [formationId];
      else if (currentIds.includes(formationId)) nextIds = currentIds.filter(id => id !== formationId);
      else nextIds = [...currentIds, formationId];

      return {
        battleId: activeBattleId,
        selectedIds: nextIds,
        selectionBox: null,
      };
    });
  }, [activeBattleId]);

  const handleSelectionEnd = useCallback((start: ZoomPanPoint, end: ZoomPanPoint) => {
    if (!battle?.found) {
      setSelectionState(prev => ({
        battleId: activeBattleId,
        selectedIds: prev.battleId === activeBattleId ? prev.selectedIds : [],
        selectionBox: null,
      }));
      return;
    }

    setSelectionState({
      battleId: activeBattleId,
      selectedIds: formationIdsInSelection(battle.formations, { start, end }, battlefieldWidth, battlefieldHeight),
      selectionBox: null,
    });
  }, [activeBattleId, battle, battlefieldHeight, battlefieldWidth]);

  const submitFormationOrder = useCallback((contentPath: ZoomPanPoint[]) => {
    if (!battle || selectedCommandable.length === 0 || !activeBattleId || contentPath.length === 0) {
      return;
    }

    const path = simplifyBattlePath(
      contentPath.map(point => percentPointToBattlefield(point, battlefieldWidth, battlefieldHeight)),
    );
    const finalPoint = path[path.length - 1];
    const target = findFormationAtPoint(battle.formations, finalPoint);
    if (target) {
      const targetOrders = selectedCommandable.filter(formation => formation.side !== target.side);
      if (targetOrders.length > 0) {
        for (const formation of targetOrders) {
          void setBattleFormationOrderBridge(activeBattleId, formation.id, {
            targetFormationId: target.id,
          });
        }
        return;
      }
    }

    for (const formation of selectedCommandable) {
      void setBattleFormationOrderBridge(activeBattleId, formation.id, {
        waypoints: path,
      });
    }
  }, [activeBattleId, battle, battlefieldHeight, battlefieldWidth, selectedCommandable]);

  const updateFormationOrderDuringDrag = useCallback((contentPath: ZoomPanPoint[]) => {
    if (!battle || selectedCommandable.length === 0 || !activeBattleId || contentPath.length < 2) {
      return;
    }

    const path = contentPath.map(point => percentPointToBattlefield(point, battlefieldWidth, battlefieldHeight));
    for (const formation of selectedCommandable) {
      void setBattleFormationOrderBridge(activeBattleId, formation.id, {
        waypoints: path,
      });
    }
  }, [activeBattleId, battle, battlefieldHeight, battlefieldWidth, selectedCommandable]);

  const setSelectedStance = useCallback((stance: string) => {
    if (!activeBattleId || selectedCommandable.length === 0) {
      return;
    }

    for (const formation of selectedCommandable) {
      void setBattleFormationStanceBridge(activeBattleId, formation.id, stance);
    }
  }, [activeBattleId, selectedCommandable]);

  const withdrawSelectedFormations = useCallback(() => {
    if (!activeBattleId || selectedCommandable.length === 0) {
      return;
    }

    for (const formation of selectedCommandable) {
      void withdrawBattleFormationBridge(activeBattleId, formation.id);
    }
  }, [activeBattleId, selectedCommandable]);

  const surrenderBattle = useCallback(async () => {
    if (!activeBattleId || retreatablePlayerParticipants.length === 0) {
      return;
    }

    for (const participant of retreatablePlayerParticipants) {
      await requestBattleRetreatBridge(activeBattleId, participant.id);
    }
  }, [activeBattleId, retreatablePlayerParticipants]);

  const battleHeader = battle && battle.found ? (
    <div ref={battleHeaderRef} className="battle-header-stack">
      <div className="battle-title-strip">
        <div className="battle-title-text">
          <span className="battle-title-name">{battle.title}</span>
          <span className="battle-title-location">{battle.location}</span>
        </div>
        <div className="battle-title-actions">
          {retreatablePlayerParticipants.length > 0 && (
            <Tooltip content={{ title: webUIText('Battle.SurrenderTitle'), body: webUIText('Battle.SurrenderBody') }} position="bottom">
              <GameButton
                variant="outline"
                icon="/assets/icons/I_Retreat.png"
                className="battle-surrender"
                onClick={() => void surrenderBattle()}
              >
                <WebUIText textKey="Battle.Surrender" />
              </GameButton>
            </Tooltip>
          )}
          <Tooltip content={{ title: expandLabel }} position="bottom">
            <button
              type="button"
              className="battle-window-button battle-expand-toggle"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setExpanded(value => !value);
              }}
              aria-label={expandLabel}
            >
              <img src="/assets/icons/I_DropdownChevron.png" alt="" className="battle-expand-toggle-icon" draggable={false} />
            </button>
          </Tooltip>
          <CloseButton size="sm" onClick={closeBattleScreen} className="battle-title-close" />
        </div>
      </div>
      <div className="battle-header-bar">
        <SideBlock summary={battle.attacker} side="attacker" />
        <Tooltip
          position="bottom"
          content={{
            title: battle.terrain || battle.battleType,
            get body() { return webUIText("Auto.Prop.componentsscreensBattleBattleScreen.838.1", { Location: battle.location }); },
            lines: [
              ...(battle.hasSnowAttrition ? [{ label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.846.13'), get value() { return webUIText("Auto.Prop.componentsscreensBattleBattleScreen.840.1"); }, valueColor: 'var(--red)' }] : []),
              ...(battle.hasDesertAttrition ? [{ label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.847.14'), get value() { return webUIText("Auto.Prop.componentsscreensBattleBattleScreen.841.1"); }, valueColor: 'var(--red)' }] : []),
            ],
          }}
        >
          <div className="battle-terrain">
            <img src="/assets/lozenge.png" alt="" className="battle-terrain-lozenge" />
            <img src={terrainIcon(battle.terrain)} alt="" className="battle-terrain-icon" />
            <span className="battle-terrain-label">{battle.terrain || battle.battleType}</span>
            <img src="/assets/lozenge.png" alt="" className="battle-terrain-lozenge" />
          </div>
        </Tooltip>
        <SideBlock summary={battle.defender} side="defender" />
      </div>
    </div>
  ) : null;

  return (
    <ScreenShell
      title={battle?.title || webUIText("Auto.Fix.ExprFallback.componentsscreensBattleBattleScreen.859.1")}
      onClose={closeBattleScreen}
      advisorTopic="battleView"
      className={`battle-screen${expanded ? ' battle-screen--expanded' : ''}`}
      contentClassName="battle-screen-content"
    >
      {battlePending ? null : !battle || !battle.found ? (
        <div className="battle-empty"><WebUIText textKey="Auto.ComponentsScreensBattleBattleScreen.873.2" /></div>
      ) : (
        <>
          {battleHeader}
          <ZoomPanCanvas
            key={activeBattleId}
            className="battle-canvas-frame"
            style={battleCanvasFrameStyle}
            contentClassName="battle-canvas"
            contentStyle={{
              width: `${battlefieldWidth}px`,
              height: `${battlefieldHeight}px`,
            }}
            initialView={battleInitialView}
            minZoom={MIN_BATTLE_ZOOM}
            maxZoom={MAX_BATTLE_ZOOM}
            zoomStep={BATTLE_ZOOM_STEP}
            panMarginPx={BATTLE_PAN_MARGIN_PX}
            leftDragMode="select"
            deferWheelViewState
            onContentLeftClick={() => {
              setSelectionState({ battleId: activeBattleId, selectedIds: [], selectionBox: null });
            }}
            onContentLeftDragUpdate={(start, end) => {
              setSelectionState(prev => ({
                battleId: activeBattleId,
                selectedIds: prev.battleId === activeBattleId ? prev.selectedIds : [],
                selectionBox: { start, end },
              }));
            }}
            onContentLeftDragEnd={handleSelectionEnd}
            onContentRightClick={selectedCommandable.length > 0 ? (point) => submitFormationOrder([point]) : undefined}
            onContentRightDragUpdate={selectedCommandable.length > 0 ? updateFormationOrderDuringDrag : undefined}
            onContentRightDrag={selectedCommandable.length > 0 ? submitFormationOrder : undefined}
            onViewChange={handleBattleViewChange}
            controls={({ zoom }) => (
              <>
                <BattleZoomIndicator zoom={zoom} />

                {selectedCommandable.length > 0 && (
                  <div className={`battle-actions-panel${selectedCommandable.length > 1 ? ' battle-actions-panel--multi' : ''}`}>
                    <div className="battle-actions-info">
                      <div className="battle-actions-info-name">
                        {selectedActionFormation ? selectedActionFormation.name : webUIText("Auto.Fix.ExprFalse.componentsscreensBattleBattleScreen.922.1", { Length: selectedCommandable.length })}
                      </div>
                      <div className="battle-actions-info-meta">
                        {selectedActionFormation ? (
                          <>
                            <span>{selectedActionFormation.unitTypeLabel}</span>
                            <span>{fmt(selectedActionFormation.strength)} / {fmt(selectedActionFormation.maxStrength)}</span>
                          </>
                        ) : (
                          <>
                            <span><WebUIText textKey="Auto.ComponentsScreensBattleBattleScreen.938.6" /></span>
                            <span>{fmt(selectedCommandableStrength)} / {fmt(selectedCommandableMaxStrength)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {!isNavalBattle && (
                      <div className="battle-stance-group">
                        <div className="battle-stance-label"><WebUIText textKey="Auto.ComponentsScreensBattleBattleScreen.945.7" /></div>
                        <div className="battle-stance-row">
                          {STANCE_OPTIONS.map(stance => (
                            <button
                              key={stance.id}
                              type="button"
                              className={`battle-mode-btn${selectedCommandable.every(formation => formation.stance === stance.id) ? ' is-active' : ''}`}
                              onMouseDown={() => setSelectedStance(stance.id)}
                            >
                              {stance.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="battle-command-group">
                      <div className="battle-command-label"><WebUIText textKey="Settlement.Siege.Commands" /></div>
                      <div className="battle-command-row">
                        <Tooltip content={{ title: webUIText('Battle.FormationWithdrawTitle'), body: webUIText('Battle.FormationWithdrawBody') }} position="top">
                          <GameButton
                            variant="outline"
                            className="battle-withdraw"
                            onClick={withdrawSelectedFormations}
                          >
                            <WebUIText textKey="Battle.FormationWithdraw" />
                          </GameButton>
                        </Tooltip>
                        {retreatablePlayerParticipants.length > 0 && (
                          <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.911.15'), body: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.911.16') }} position="top">
                            <GameButton
                              variant="outline"
                              className="battle-retreat"
                              onClick={() => void surrenderBattle()}
                            >
                              <img src="/assets/icons/I_Retreat.png" alt="" className="battle-retreat-icon" />
                              <WebUIText textKey="Auto.ComponentsScreensBattleBattleScreen.917.5" />
                            </GameButton>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    {selectedActionFormation && (
                      <div className="battle-actions-buttons">
                        {selectedActionFormation.actions.map(action => (
                          <BattleActionButton
                            key={action.id}
                            action={action}
                            battleId={activeBattleId}
                            formationId={selectedActionFormation.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          >
          <BattleHeightLayer
            heightMap={battle.heightMap}
            columns={battle.heightMapColumns}
            rows={battle.heightMapRows}
          />
          <BattleObstacleLayer
            obstacles={battle.obstacles}
            battlefieldWidth={battlefieldWidth}
            battlefieldHeight={battlefieldHeight}
          />
          <span className="battle-zone-frame">
            <span className="battle-zone-frame-corner battle-zone-frame-corner--tl" />
            <span className="battle-zone-frame-corner battle-zone-frame-corner--tr" />
            <span className="battle-zone-frame-corner battle-zone-frame-corner--bl" />
            <span className="battle-zone-frame-corner battle-zone-frame-corner--br" />
          </span>
          {rangeFormations.map(formation => (
            <RangeIndicator
              key={`${formation.id}:range`}
              formation={formation}
              battlefieldWidth={battlefieldWidth}
              battlefieldHeight={battlefieldHeight}
            />
          ))}
          {selectedFormations.map(formation => (
            <WaypointLines
              key={`${formation.id}:waypoints`}
              formation={formation}
              battlefieldWidth={battlefieldWidth}
              battlefieldHeight={battlefieldHeight}
            />
          ))}
          {targetLineFormations.map(formation => {
            const target = formation.targetFormationId ? formationsById.get(formation.targetFormationId) : null;
            return target ? (
              <TargetAttackLine
                key={`${formation.id}:target:${target.id}`}
                formation={formation}
                target={target}
                battlefieldWidth={battlefieldWidth}
                battlefieldHeight={battlefieldHeight}
              />
            ) : null;
          })}
          <BattleUnitAgentLayer
            agents={visualAgents}
            battlefieldWidth={battlefieldWidth}
            battlefieldHeight={battlefieldHeight}
            showTooltips={battleZoom >= AGENT_TOOLTIP_MIN_ZOOM}
          />
          {damageIndicators.map(indicator => (
            <DamageIndicator
              key={indicator.key}
              indicator={indicator}
              battlefieldWidth={battlefieldWidth}
              battlefieldHeight={battlefieldHeight}
            />
          ))}
          {attackEffects.map(effect => (
            <AttackEffect
              key={effect.key}
              effect={effect}
              targetFormation={formationsById.get(effect.targetFormationId)}
              battlefieldWidth={battlefieldWidth}
              battlefieldHeight={battlefieldHeight}
            />
          ))}
          {selectionBox && <SelectionBoxOverlay box={selectionBox} />}
          {battle.formations.map(formation => (
            <FormationCounter
              key={formation.id}
              formation={formation}
              selected={selectedIdsSet.has(formation.id)}
              takingDamage={damagedFormationIds.has(formation.id)}
              damagePulseKey={damagePulseKeys.get(formation.id) ?? ''}
              engaged={meleeEngagementTargets.has(formation.id)}
              battlefieldWidth={battlefieldWidth}
              battlefieldHeight={battlefieldHeight}
              onSelect={(additive) => handleFormationSelect(formation.id, additive)}
              onHoverChange={setHoveredFormationId}
              playerReferenceColour={playerReferenceColour}
              showStance={!isNavalBattle}
              isNaval={isNavalBattle}
            />
          ))}
          </ZoomPanCanvas>
        </>
      )}
    </ScreenShell>
  );
}

registerScreen({
  id: 'battle',
  render: ({ screenId, onClose }) => <BattleScreen battleId={screenId} onClose={onClose} />,
  advisorTopic: 'battleView',
  bridgeNames: ['battle'],
  overlayVariant: 'battle',
});

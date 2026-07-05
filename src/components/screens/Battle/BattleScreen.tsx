import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import FactionRoundel from '../../common/entities/FactionRoundel';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import Portrait from '../../common/portraits/Portrait';
import Tooltip, { type TooltipContent } from '../../common/tooltips/Tooltip';
import ZoomPanCanvas, { type ZoomPanMetrics, type ZoomPanPoint, type ZoomPanView } from '../../common/layout/scrolling/ZoomPanCanvas';
import {
  hideBattleScreenBridge,
  requestBattleRetreatBridge,
  setBattleFormationOrderBridge,
  setBattleFormationStanceBridge,
  startBattleActionBridge,
  useBattleBridge,
  withdrawBattleFormationBridge,
  battleFrameAgentCount,
  readBattleAgentFrame,
  type BattleFormationLive,
  type BattleAgentFrameView,
} from '../../../bridge/military-map/useBattleBridge';
import { useGameActions } from '../../../context/GameContext';
import type {
  BattleActionOption,
  BattleParticipantDetail,
  BattleSideDetail,
  BattlefieldHeightPointDetail,
  BattlefieldObstacleDetail,
} from '../../../bridge-types.generated.ts';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { registerScreen } from '../../../registry/index';
import './BattleScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface BattleScreenProps {
  battleId?: string | null;
  onClose: () => void;
}

const DEFAULT_BATTLEFIELD_SIZE = 2000;
const MIN_BATTLE_ZOOM = 0.35;
const MAX_BATTLE_ZOOM = 2.5;
const BATTLE_ZOOM_STEP = 1.15;
const AGENT_TOOLTIP_MIN_ZOOM = 1.85;
const ORDER_PATH_MIN_POINT_DISTANCE = 60.0;
const ORDER_PATH_FINAL_POINT_DISTANCE = 10.0;
const BATTLE_PAN_MARGIN_PX = 280;
const HEIGHT_IMAGE_SIZE = 512;
const HEIGHT_CONTOUR_THRESHOLDS = [0.24, 0.38, 0.52, 0.66, 0.8] as const;
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

const TERRAIN_ICONS: Record<string, string> = {
  forest: '/assets/icons/Terrain/_0001_I_Forest.png',
  hills: '/assets/icons/Terrain/_0002_I_Rock.png',
  rocky: '/assets/icons/Terrain/_0002_I_Rock.png',
  desert: '/assets/icons/Terrain/_0003_I_Desert.png',
  snow: '/assets/icons/Terrain/_0004_I_Snow.png',
  swamp: '/assets/icons/Terrain/_0005_I_Swamp.png',
  grassland: '/assets/icons/Terrain/_0000_I_Grassland.png',
};

interface TerrainTree {
  x: number;
  y: number;
  size: number;
  src: string;
}

interface SelectionBox {
  start: ZoomPanPoint;
  end: ZoomPanPoint;
}

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

interface BattleVisualAgent {
  key: string;
  formationId: string;
  side: string;
  typeKey: 'infantry' | 'ranged' | 'cavalry' | 'siege';
  colour: string;
  formationName: string;
  unitTypeLabel: string;
  strength: number;
  maxStrength: number;
  healthPercent: number;
  x: number;
  y: number;
  rotation: number;
  state: 'formed' | 'engaged' | 'routing' | 'withdrawing';
  zIndex: number;
}

const TREE_OAK = '/assets/terrain/tree-oak-flat.png';
const TREE_PINE = '/assets/terrain/tree-pine-flat.png';
const TREE_SHRUB = '/assets/terrain/tree-shrub-flat.png';

const TERRAIN_TREE_SOURCES = [TREE_OAK, TREE_PINE, TREE_SHRUB];

const BATTLE_ACTION_ICON_IDS: Record<string, string> = {
  AmbushTacticsAction: 'I_Ambush',
  ArcherVolleyAction: 'I_ArcherVolley',
  ArtilleryBarrageAction: 'I_ArtilleryBarrage',
  BerserkerRageAction: 'I_Berserker',
  BoardingPartyAction: 'I_BoardingParty',
  CataphractWedgeAction: 'I_CataphractWedge',
  CavalryChargeAction: 'I_CavalryCharge',
  ChargeAction: 'I_InfantryCharge',
  DefensiveCircleAction: 'I_DefensiveCircle',
  ElephantChargeAction: 'I_ElephantCharge',
  EvasiveManeuversAction: 'I_EvasiveManeuvers',
  ExecuteDesertersAction: 'I_Execute',
  FeintAttackAction: 'I_Feint',
  FireArrowsAction: 'I_FireArrows',
  FlankingManeuverAction: 'I_Flank',
  FranciscaBarrageAction: 'I_Francisca',
  FullSailAction: 'I_FullSail',
  HeavyCavalryChargeAction: 'I_HeavyCharge',
  HorseArcheryAction: 'I_HorseArchery',
  NorthernShieldWallAction: 'I_NorthernShieldWall',
  RallyTroopsAction: 'I_Rally',
  RammingSpeedAction: 'I_RammingSpeed',
  RephsianFireAction: 'I_RephsianFire',
  ScoutScreenAction: 'I_ScoutScreen',
  ScorpionSalvoAction: 'I_ScorpionSalvo',
  SiegeEnginesAction: 'I_SiegeEngines',
  TacticalWithdrawalAction: 'I_Withdraw',
  TestudoFormationAction: 'I_Testudo',
  WarCryAction: 'I_WarCry',
  WedgeFormationAction: 'I_Wedge',
};

function fmt(value: number | undefined): string {
  return formatNumber(value);
}

function formatStrength(value: number | undefined): string {
  const next = Number(value ?? 0);
  if (next >= 1000) return `${formatNumber(next / 1000, { maximumFractionDigits: 1 })}k`;
  return formatNumber(next);
}

function pct(value: number | undefined): string {
  return formatPercent(value ?? 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface RgbColour {
  r: number;
  g: number;
  b: number;
}

function parseHexColour(value: string | undefined): RgbColour | null {
  if (!value) return null;
  const trimmed = value.trim();
  const hex = trimmed.charAt(0) === '#' ? trimmed.slice(1) : trimmed;
  if (hex.length !== 6 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function colourDistance(a: string | undefined, b: string | undefined): number {
  const first = parseHexColour(a);
  const second = parseHexColour(b);
  if (!first || !second) return 255;
  const dr = first.r - second.r;
  const dg = first.g - second.g;
  const db = first.b - second.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

const PLAYER_BATTLE_COLOUR = '#4f7f9f';
const ENEMY_BATTLE_COLOUR = '#b84a3c';

function readableCounterColour(formation: BattleFormationLive, playerReferenceColour: string | null): string {
  if (formation.isPlayerControlled) return PLAYER_BATTLE_COLOUR;
  if (formation.faction.relation === 'enemy') return ENEMY_BATTLE_COLOUR;

  const primary = formation.faction.colour || '#6d6d6d';
  const reference = playerReferenceColour || PLAYER_BATTLE_COLOUR;
  if (colourDistance(primary, reference) >= 105) return primary;

  const secondary = formation.faction.secondaryColour;
  if (secondary && colourDistance(secondary, reference) >= 105) {
    return secondary;
  }

  if (formation.side === 'attacker') return '#8b6842';
  return '#76623f';
}

function normaliseDegrees(value: number): number {
  let next = value;
  while (next < 0) next += 360;
  while (next >= 360) next -= 360;
  return next;
}

function battlefieldDimension(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : DEFAULT_BATTLEFIELD_SIZE;
}

function coordinatePercent(value: number, size: number, fallbackPercent: number): string {
  const fallback = size * fallbackPercent / 100;
  const coordinate = Number.isFinite(value) ? value : fallback;
  return `${clamp(coordinate / size * 100, 0, 100).toFixed(2)}%`;
}

function coordinatePercentUnclamped(value: number, size: number, fallbackPercent: number): string {
  const fallback = size * fallbackPercent / 100;
  const coordinate = Number.isFinite(value) ? value : fallback;
  return `${(coordinate / size * 100).toFixed(2)}%`;
}

function coordinatePercentValue(value: number, size: number, fallbackPercent: number): number {
  const fallback = size * fallbackPercent / 100;
  const coordinate = Number.isFinite(value) ? value : fallback;
  return clamp(coordinate / size * 100, 0, 100);
}

function pathNumber(value: number): string {
  return value.toFixed(2);
}

function radiusPercent(value: number, size: number): number {
  return clamp(value / size * 100, 0, 100);
}

function sizePercent(value: number, size: number): string {
  return `${clamp(value / size * 100, 0, 100).toFixed(2)}%`;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = (hash * 16777619) >>> 0;
  }
  return hash >>> 0;
}

function stableObstacleNoise(seed: string, index: number, salt: number): number {
  let value = stableHash(seed);
  value ^= ((index + 1) * 374761393) >>> 0;
  value ^= (salt * 668265263) >>> 0;
  value = (value ^ (value >>> 13)) >>> 0;
  value = (value * 1274126177) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return (value & 0xffff) / 65535;
}

function percentPointToBattlefield(point: ZoomPanPoint, width: number, height: number): ZoomPanPoint {
  return {
    x: clamp(point.x, 0, 100) / 100 * width,
    y: clamp(point.y, 0, 100) / 100 * height,
  };
}

function pointDistance(a: ZoomPanPoint, b: ZoomPanPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function elementHeight(element: HTMLElement | null): number {
  if (!element) return 0;
  return element.offsetHeight || element.getBoundingClientRect().height || 0;
}

function normaliseSelectionBox(box: SelectionBox): { left: number; top: number; width: number; height: number } {
  const left = Math.min(box.start.x, box.end.x);
  const top = Math.min(box.start.y, box.end.y);
  return {
    left,
    top,
    width: Math.abs(box.end.x - box.start.x),
    height: Math.abs(box.end.y - box.start.y),
  };
}

function formationInsideSelection(formation: BattleFormationLive, box: SelectionBox, width: number, height: number): boolean {
  if (formation.strength <= 0) return false;

  const rect = normaliseSelectionBox(box);
  const x = coordinatePercentValue(formation.positionX, width, formation.side === 'attacker' ? 32 : 68);
  const y = coordinatePercentValue(formation.positionY, height, formation.side === 'attacker' ? 65 : 35);
  const radius = Math.max(1.5, Math.min(radiusPercent(formation.collisionRadius ?? 60, width), 6));

  return x + radius >= rect.left
    && x - radius <= rect.left + rect.width
    && y + radius >= rect.top
    && y - radius <= rect.top + rect.height;
}

function formationIdsInSelection(formations: BattleFormationLive[], box: SelectionBox, width: number, height: number): string[] {
  const picked = formations.filter(formation => formationInsideSelection(formation, box, width, height));
  const commandable = picked.filter(formation => formation.isCommandable);
  return (commandable.length > 0 ? commandable : picked).map(formation => formation.id);
}

function findFormationAtPoint(formations: BattleFormationLive[], point: ZoomPanPoint): BattleFormationLive | null {
  let closest: BattleFormationLive | null = null;
  let closestDistSq = Number.MAX_VALUE;

  for (const formation of formations) {
    if (formation.strength <= 0) continue;

    const dx = point.x - formation.positionX;
    const dy = point.y - formation.positionY;
    const distSq = dx * dx + dy * dy;
    const hitRadius = Math.max(formation.collisionRadius ?? 80, 80) + 40;
    if (distSq <= hitRadius * hitRadius && distSq < closestDistSq) {
      closest = formation;
      closestDistSq = distSq;
    }
  }

  return closest;
}

function simplifyBattlePath(path: ZoomPanPoint[]): ZoomPanPoint[] {
  if (path.length <= 2) return path;

  const simplified: ZoomPanPoint[] = [path[0]];
  for (let index = 1; index < path.length; index++) {
    const last = simplified[simplified.length - 1];
    const next = path[index];
    if (pointDistance(last, next) >= ORDER_PATH_MIN_POINT_DISTANCE) {
      simplified.push(next);
    }
  }

  const finalPoint = path[path.length - 1];
  const lastSimplified = simplified[simplified.length - 1];
  if (pointDistance(lastSimplified, finalPoint) > ORDER_PATH_FINAL_POINT_DISTANCE) {
    simplified.push(finalPoint);
  }

  return simplified;
}

function buildWaypointSplinePath(points: ZoomPanPoint[], width: number, height: number): string {
  if (points.length < 2) return '';

  const projected = points.map(point => ({
    x: coordinatePercentValue(point.x, width, 50),
    y: coordinatePercentValue(point.y, height, 50),
  }));

  if (projected.length === 2) {
    const start = projected[0];
    const end = projected[1];
    return `M ${pathNumber(start.x)} ${pathNumber(start.y)} L ${pathNumber(end.x)} ${pathNumber(end.y)}`;
  }

  let path = `M ${pathNumber(projected[0].x)} ${pathNumber(projected[0].y)}`;
  for (let index = 0; index < projected.length - 1; index++) {
    const previous = projected[Math.max(0, index - 1)];
    const current = projected[index];
    const next = projected[index + 1];
    const following = projected[Math.min(projected.length - 1, index + 2)];
    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (following.x - current.x) / 6,
      y: next.y - (following.y - current.y) / 6,
    };
    path += ` C ${pathNumber(controlOne.x)} ${pathNumber(controlOne.y)} ${pathNumber(controlTwo.x)} ${pathNumber(controlTwo.y)} ${pathNumber(next.x)} ${pathNumber(next.y)}`;
  }

  return path;
}

function unitTypeKey(formation: BattleFormationLive): 'infantry' | 'ranged' | 'cavalry' | 'siege' {
  const type = formation.unitType.toLowerCase();
  if (type.indexOf('cavalry') >= 0 || type.indexOf('horse') >= 0) return 'cavalry';
  if (type.indexOf('archer') >= 0 || type.indexOf('ranged') >= 0 || type.indexOf('skirmish') >= 0) return 'ranged';
  if (type.indexOf('siege') >= 0 || type.indexOf('ballist') >= 0 || type.indexOf('catapult') >= 0) return 'siege';
  return 'infantry';
}

function attackKind(formation: BattleFormationLive): 'melee' | 'ranged' | 'siege' {
  const type = unitTypeKey(formation);
  if (type === 'ranged' || type === 'siege') return type;
  return 'melee';
}

function formationsAreInMeleeContact(formation: BattleFormationLive, target: BattleFormationLive): boolean {
  if (formation.side === target.side) return false;
  const formationMelee = attackKind(formation) === 'melee';
  const targetMelee = attackKind(target) === 'melee';
  if (!formationMelee && !targetMelee) return false;

  const dx = target.positionX - formation.positionX;
  const dy = target.positionY - formation.positionY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const meleeReach = Math.max(
    120,
    formationMelee ? formation.attackRange ?? 0 : 0,
    targetMelee ? target.attackRange ?? 0 : 0,
  );
  const contactDistance = (formation.collisionRadius ?? 80)
    + (target.collisionRadius ?? 80)
    + meleeReach;

  return distance <= contactDistance;
}

function buildBattleVisualAgents(
  formations: BattleFormationLive[],
  formationsById: Map<string, BattleFormationLive>,
  playerReferenceColour: string | null,
  battlefieldWidth: number,
  battlefieldHeight: number,
): BattleVisualAgent[] {
  const agents: BattleVisualAgent[] = [];
  const agentScratch: BattleAgentFrameView = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    inMelee: false,
    detached: false,
    targetFormationId: '',
  };
  for (const formation of formations) {
    const typeKey = unitTypeKey(formation);
    const colour = readableCounterColour(formation, playerReferenceColour);
    const formationRotation = Number.isFinite(formation.rotation) ? formation.rotation : 0;
    const agentCount = battleFrameAgentCount(formation);

    for (let index = 0; index < agentCount; index++) {
      const agent = readBattleAgentFrame(formation, index, agentScratch);
      if (!agent) continue;

      const velocityX = agent.velocityX;
      const velocityY = agent.velocityY;
      const speedSq = velocityX * velocityX + velocityY * velocityY;
      const target = agent.targetFormationId ? formationsById.get(agent.targetFormationId) : null;
      const state: BattleVisualAgent['state'] = formation.isRouting
        ? 'routing'
        : formation.isWithdrawing
          ? 'withdrawing'
          : (agent.inMelee || agent.detached)
            ? 'engaged'
            : 'formed';
      let rotation = formationRotation;
      if (target && state === 'engaged') {
        rotation = Math.atan2(target.positionY - agent.y, target.positionX - agent.x) * 180 / Math.PI;
      } else if ((state === 'routing' || state === 'withdrawing') && speedSq > 4) {
        rotation = Math.atan2(velocityY, velocityX) * 180 / Math.PI;
      }

      agents.push({
        key: `${formation.id}:${index}`,
        formationId: formation.id,
        side: formation.side,
        typeKey,
        colour,
        formationName: formation.name || formation.unitTypeLabel,
        unitTypeLabel: formation.unitTypeLabel,
        strength: formation.strength,
        maxStrength: formation.maxStrength,
        healthPercent: formation.healthPercent,
        x: state === 'routing' || state === 'withdrawing' ? agent.x : clamp(agent.x, 0, battlefieldWidth),
        y: state === 'routing' || state === 'withdrawing' ? agent.y : clamp(agent.y, 0, battlefieldHeight),
        rotation: normaliseDegrees(rotation),
        state,
        zIndex: (formation.zIndex || 2) + (state === 'engaged' ? 4 : 2),
      });
    }
  }

  return agents;
}

function formationAgentFootprint(formation: BattleFormationLive, typeKey: 'infantry' | 'ranged' | 'cavalry' | 'siege'): { width: number; height: number } {
  const count = Math.max(1, formation.agentCount || battleFrameAgentCount(formation) || Math.ceil(Math.max(formation.maxStrength, 1) / 180));
  const widthBias = typeKey === 'cavalry' ? 1.8 : typeKey === 'ranged' || typeKey === 'siege' ? 1.35 : 1.55;
  const columns = clamp(Math.ceil(Math.sqrt(count) * widthBias), 1, count);
  const rows = Math.max(1, Math.ceil(count / columns));
  const radius = formation.collisionRadius ?? 80;
  const spacingAcross = clamp(radius * 0.30, 28, 58);
  const spacingDeep = clamp(radius * 0.24, 22, 46);

  return {
    width: clamp((columns - 1) * spacingAcross * 0.36 + 54, 58, 180),
    height: clamp((rows - 1) * spacingDeep * 0.58 + 42, 34, 112),
  };
}

function unitIcon(formation: BattleFormationLive): string {
  const key = unitTypeKey(formation);
  if (key === 'cavalry') return '/assets/icons/UnitTypes/I_Cavalry.png';
  if (key === 'ranged') return '/assets/icons/UnitTypes/I_Ranged.png';
  if (key === 'siege') return '/assets/icons/UnitTypes/I_Siege.png';
  return '/assets/icons/UnitTypes/I_Infantry.png';
}

function actionIcon(action: BattleActionOption): string {
  const iconId = action.iconId.trim();
  if (!iconId) return '/assets/icons/I_Swords.png';
  if (iconId.indexOf('/assets/') === 0) return iconId;
  if (iconId.indexOf('/') >= 0) {
    const extension = iconId.indexOf('.png') >= 0 ? '' : '.png';
    return `/assets/icons/${iconId}${extension}`;
  }

  const filename = BATTLE_ACTION_ICON_IDS[iconId] ?? iconId;
  const fullName = filename.indexOf('I_') === 0 ? filename : `I_${filename}`;
  return `/assets/icons/BattleActions/${fullName}.png`;
}

function terrainIcon(terrain: string): string {
  const key = terrain.toLowerCase();
  return TERRAIN_ICONS[key] ?? TERRAIN_ICONS.grassland;
}

function sideCommander(side: BattleSideDetail): BattleParticipantDetail | null {
  return side.participants.find(participant => participant.commander) ?? side.participants[0] ?? null;
}

function leaderName(participant: BattleParticipantDetail | null | undefined): string {
  const commander = participant?.commander?.trim() ?? '';
  return commander || webUIText('Common.NoCommander');
}

function participantFallbackName(participant: BattleParticipantDetail | null | undefined): string {
  return participant?.commander || participant?.name || participant?.faction.name || webUIText('Common.NoCommander');
}

function hasLinkId(id: string | null | undefined): id is string {
  return Boolean(id && id.trim().length > 0);
}

function SideBlock({
  side,
  summary,
}: {
  side: 'attacker' | 'defender';
  summary: BattleSideDetail;
}) {
  const { openSidebar } = useGameActions();
  const commander = sideCommander(summary);
  const participant = commander ?? summary.participants[0];
  const alivePercent = summary.totalMaxStrength > 0 ? summary.totalStrength / summary.totalMaxStrength * 100 : 0;
  const participantCommanderId = participant && hasLinkId(participant.commanderId) ? participant.commanderId : '';
  const participantFactionId = participant && hasLinkId(participant.faction.id) ? participant.faction.id : '';
  const openLinkedSidebar = useCallback((event: MouseEvent<HTMLElement>, type: string, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    openSidebar(type, id);
  }, [openSidebar]);

  return (
    <div className={`battle-screen-side battle-screen-side--${side}`}>
      <Portrait
        personId={participantCommanderId || undefined}
        name={participantFallbackName(participant)}
        size="row"
        borderTier="silver"
        className="battle-screen-side-portrait"
        onClick={participantCommanderId ? () => openSidebar('character', participantCommanderId) : undefined}
      />
      <div className="battle-screen-side-body">
        <div className="battle-screen-side-top">
          {participant && (
            <FactionRoundel
              factionId={participantFactionId || undefined}
              colour={participant.faction.colour}
              secondaryColour={participant.faction.secondaryColour}
              cultureGroup={participant.faction.cultureGroup}
              name={participant.faction.name}
              size="sm"
              onClick={participantFactionId ? () => openSidebar('diplomacy', participantFactionId) : undefined}
            />
          )}
          <div className="battle-screen-side-names">
            {participantCommanderId ? (
              <button
                type="button"
                className="battle-screen-side-commander-name battle-screen-side-link"
                onMouseDown={(event) => openLinkedSidebar(event, 'character', participantCommanderId)}
              >
                {leaderName(participant)}
              </button>
            ) : (
              <span className="battle-screen-side-commander-name">{leaderName(participant)}</span>
            )}
            {participantFactionId ? (
              <button
                type="button"
                className="battle-screen-side-faction battle-screen-side-link"
                onMouseDown={(event) => openLinkedSidebar(event, 'diplomacy', participantFactionId)}
              >
                {participant.faction.name || webUIText("Auto.Fix.ExprFallback.componentsscreensBattleBattleScreen.346.1")}
              </button>
            ) : (
              <span className="battle-screen-side-faction">{participant?.faction.name || webUIText("Auto.Fix.ExprFallback.componentsscreensBattleBattleScreen.346.1")}</span>
            )}
          </div>
          <span className="battle-screen-side-strength">{formatStrength(summary.totalStrength)}</span>
        </div>
        <div className="battle-screen-side-bars">
          <Tooltip
            content={{
              title: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.359.1'),
              lines: [
                { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.361.2'), value: fmt(summary.totalStrength) },
                { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.362.3'), value: fmt(summary.totalMaxStrength) },
                { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.363.4'), value: fmt(summary.losses), valueColor: 'var(--red)' },
              ],
            }}
          >
            <PaintedBar className="battle-bar" percent={alivePercent} color="gold" />
          </Tooltip>
          <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.369.5'), get body() { return webUIText("Auto.Prop.componentsscreensBattleBattleScreen.363.1", { Value1: pct(summary.morale) }); } }}>
            <PaintedBar className="battle-bar battle-bar--morale" percent={summary.morale} color="green" />
          </Tooltip>
        </div>
        {summary.participants.length > 1 && (
          <div className="battle-screen-side-participants">
            {summary.participants.map((army, index) => {
              const rowKey = army.id || `${army.name}:${index}`;
              const commanderId = hasLinkId(army.commanderId) ? army.commanderId : '';
              const factionId = hasLinkId(army.faction.id) ? army.faction.id : '';
              return (
                <Tooltip
                  key={rowKey}
                  position={side === 'attacker' ? 'right' : 'left'}
                  content={{
                    title: army.name,
                    body: leaderName(army),
                    lines: [
                      { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.413.6'), get value() { return webUIText("Auto.Prop.componentsscreensBattleBattleScreen.407.1", { Value1: fmt(army.strength), Value2: fmt(army.maxStrength) }); } },
                      { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.369.5'), value: pct(army.morale) },
                      { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.414.7'), value: fmt(army.losses), valueColor: 'var(--red)' },
                    ],
                  }}
                >
                  <div className="battle-screen-side-participant">
                    <Portrait
                      personId={commanderId || undefined}
                      name={participantFallbackName(army)}
                      size="sm"
                      borderTier="bronze"
                      className="battle-screen-side-participant-portrait"
                      onClick={commanderId ? () => openSidebar('character', commanderId) : undefined}
                    />
                    <div className="battle-screen-side-participant-main">
                      {hasLinkId(army.id) ? (
                        <button
                          type="button"
                          className="battle-screen-side-participant-name battle-screen-side-link"
                          onMouseDown={(event) => openLinkedSidebar(event, 'military', army.id)}
                        >
                          {army.name}
                        </button>
                      ) : (
                        <span className="battle-screen-side-participant-name">{army.name}</span>
                      )}
                      {commanderId ? (
                        <button
                          type="button"
                          className="battle-screen-side-participant-commander battle-screen-side-link"
                          onMouseDown={(event) => openLinkedSidebar(event, 'character', commanderId)}
                        >
                          {leaderName(army)}
                        </button>
                      ) : (
                        <span className="battle-screen-side-participant-commander">{leaderName(army)}</span>
                      )}
                    </div>
                    <FactionRoundel
                      factionId={factionId || undefined}
                      colour={army.faction.colour}
                      secondaryColour={army.faction.secondaryColour}
                      cultureGroup={army.faction.cultureGroup}
                      name={army.faction.name}
                      size="xs"
                      onClick={factionId ? () => openSidebar('diplomacy', factionId) : undefined}
                    />
                    <span className="battle-screen-side-participant-strength">{formatStrength(army.strength)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FormationCounter({
  formation,
  selected,
  takingDamage,
  damagePulseKey,
  engaged,
  battlefieldWidth,
  battlefieldHeight,
  onSelect,
  onHoverChange,
  playerReferenceColour,
}: {
  formation: BattleFormationLive;
  selected: boolean;
  takingDamage: boolean;
  damagePulseKey: string;
  engaged: boolean;
  battlefieldWidth: number;
  battlefieldHeight: number;
  onSelect: (additive: boolean) => void;
  onHoverChange: (formationId: string | null) => void;
  playerReferenceColour: string | null;
}) {
  const typeKey = unitTypeKey(formation);
  const footprint = formationAgentFootprint(formation, typeKey);
  const factionColour = readableCounterColour(formation, playerReferenceColour);
  const health = formation.maxStrength > 0 ? formation.strength / formation.maxStrength * 100 : formation.healthPercent * 100;
  const morale = clamp((Number.isFinite(formation.morale) ? formation.morale : 1) * 100, 0, 100);
  const chargeReady = clamp((formation.attackChargePercent ?? 0) * 100, 0, 100);
  const agentCount = formation.agentCount || battleFrameAgentCount(formation);
  const active = formation.isRouting
    ? webUIText('Battle.FormationRouting')
    : formation.isWithdrawing
      ? webUIText('Battle.FormationWithdrawing')
      : formation.activeActionName || formation.stanceLabel;
  const rotation = Number.isFinite(formation.rotation) ? formation.rotation : 0;
  const counterRotation = normaliseDegrees(rotation + 90);
  const stateIcon = formation.isRouting
    ? '/assets/icons/I_Retreat.png'
    : formation.isWithdrawing
      ? '/assets/icons/BattleActions/I_Withdraw.png'
      : '';
  const stateIconClass = formation.isRouting
    ? ' battle-counter-state-icon--routing'
    : formation.isWithdrawing
      ? ' battle-counter-state-icon--withdrawing'
      : '';

  return (
    <div
      className="battle-formation-anchor"
      style={{
        left: coordinatePercent(formation.positionX, battlefieldWidth, formation.side === 'attacker' ? 32 : 68),
        top: coordinatePercent(formation.positionY, battlefieldHeight, formation.side === 'attacker' ? 65 : 35),
        zIndex: formation.zIndex || 2,
      }}
    >
      <Tooltip
        content={{
          title: formation.name,
          body: <FormationTooltipBody formation={formation} />,
          lines: [
            ...(formation.militaryName ? [{ label: webUIText('Battle.UnitTooltip.Force'), value: formation.militaryName }] : []),
            { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.413.6'), get value() { return webUIText("Auto.Prop.componentsscreensBattleBattleScreen.407.1", { Value1: fmt(formation.strength), Value2: fmt(formation.maxStrength) }); } },
            { label: webUIText('Battle.UnitTooltip.Health'), value: formatPercent(health) },
            { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.414.7'), value: fmt(formation.losses), valueColor: 'var(--red)' },
            { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.369.5'), value: formatPercent(morale) },
            { label: webUIText('Battle.UnitTooltip.Speed'), labelIcon: '/assets/icons/I_Speed.png', value: fmt(Math.round(formation.speed)) },
            { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.415.8'), value: formation.stanceLabel },
            ...(formation.activeActionName ? [{ label: webUIText('Battle.UnitTooltip.Action'), value: formation.activeActionName }] : []),
            ...(formation.attackRange > 0 ? [{ label: webUIText('Battle.UnitTooltip.Range'), value: fmt(Math.round(formation.attackRange)) }] : []),
            ...(formation.minimumAttackRange > 0 ? [{ label: webUIText('Battle.UnitTooltip.MinimumRange'), value: fmt(Math.round(formation.minimumAttackRange)) }] : []),
            { label: webUIText('Battle.UnitTooltip.ChargeReady'), value: formatPercent(chargeReady) },
            ...(agentCount > 0 ? [{ label: webUIText('Battle.UnitTooltip.UnitGroups'), value: fmt(agentCount) }] : []),
            { label: webUIText('Battle.UnitTooltip.Commandable'), value: webUIText(formation.isCommandable ? 'Common.Yes' : 'Common.No') },
            ...(formation.targetFormationName ? [{ label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.416.9'), value: formation.targetFormationName }] : []),
            ...(formation.hasManualTarget ? [{ label: webUIText('Battle.UnitTooltip.ManualTarget'), value: webUIText('Common.Yes') }] : []),
            ...(formation.waypoints.length > 0 ? [{ label: webUIText('Battle.UnitTooltip.OrderPoints'), value: fmt(formation.waypoints.length) }] : []),
          ],
        }}
        position="right"
      >
        <button
          type="button"
          className={`battle-formation battle-formation--${formation.side} battle-counter--${typeKey}${selected ? ' battle-formation--selected' : ''}${takingDamage ? ' battle-formation--taking-damage' : ''}${engaged ? ' battle-formation--engaged' : ''}${formation.isRouting ? ' battle-formation--routing' : ''}${formation.isWithdrawing ? ' battle-formation--withdrawing' : ''}`}
          onMouseEnter={() => onHoverChange(formation.id)}
          onMouseLeave={() => onHoverChange(null)}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            onSelect(event.ctrlKey || event.shiftKey);
          }}
          style={{ borderTopColor: factionColour, borderRightColor: factionColour, borderBottomColor: factionColour, borderLeftColor: factionColour }}
        >
          <div key={damagePulseKey || formation.id} className="battle-counter">
            <div className="battle-counter-rotator" style={{ transform: `rotate(${counterRotation.toFixed(2)}deg)` }}>
              <div
                className="battle-counter-footprint"
                style={{
                  width: `${footprint.width.toFixed(0)}px`,
                  height: `${footprint.height.toFixed(0)}px`,
                }}
              />
            </div>
            <img className="battle-counter-typepip" src={unitIcon(formation)} alt="" />
            {stateIcon && <img className={`battle-counter-state-icon${stateIconClass}`} src={stateIcon} alt="" draggable={false} />}
            <span className={`battle-counter-hp ${health < 35 ? 'battle-counter-hp--critical' : health < 70 ? 'battle-counter-hp--wounded' : 'battle-counter-hp--healthy'}`}>
              {Math.round(health)}
            </span>
            <span className="battle-counter-morale" aria-hidden="true">
              <span style={{ width: `${morale.toFixed(0)}%` }} />
            </span>
          </div>
          <span className="battle-counter-label">
            <span className="battle-counter-label-name">{formation.name}</span>
            <span className="battle-counter-label-meta">{formatStrength(formation.strength)} - {active}</span>
          </span>
        </button>
      </Tooltip>
    </div>
  );
}

function FormationTooltipBody({ formation }: { formation: BattleFormationLive }) {
  return (
    <div className="battle-formation-tooltip-faction">
      <FactionRoundel
        factionId={formation.faction.id || undefined}
        colour={formation.faction.colour}
        secondaryColour={formation.faction.secondaryColour}
        cultureGroup={formation.faction.cultureGroup}
        name={formation.faction.name}
        size="xs"
        className="battle-formation-tooltip-roundel"
      />
      <div className="battle-formation-tooltip-faction-text">
        <span className="battle-formation-tooltip-unit-type">{formation.unitTypeLabel}</span>
        <span className="battle-formation-tooltip-faction-name">{formation.faction.name}</span>
      </div>
    </div>
  );
}

function battleUnitAgentTooltip(agent: BattleVisualAgent): TooltipContent {
  const healthPercent = agent.maxStrength > 0
    ? agent.strength / agent.maxStrength * 100
    : agent.healthPercent * 100;
  const healthColour = healthPercent > 50 ? 'var(--green)' : healthPercent > 25 ? 'var(--yellow)' : 'var(--red-light)';

  return {
    title: agent.formationName,
    body: agent.unitTypeLabel,
    lines: [
      {
        label: webUIText('Auto.ComponentsCommonUnitTooltip.318.4'),
        value: `${fmt(agent.strength)} / ${fmt(agent.maxStrength)} (${formatPercent(healthPercent)})`,
        valueColor: healthColour,
      },
    ],
  };
}

function BattleUnitAgentMarker({
  agent,
  battlefieldWidth,
  battlefieldHeight,
  showTooltip,
}: {
  agent: BattleVisualAgent;
  battlefieldWidth: number;
  battlefieldHeight: number;
  showTooltip: boolean;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const classes = `battle-unit-agent battle-unit-agent--${agent.typeKey} battle-unit-agent--${agent.state} battle-unit-agent--${agent.side}`;
  const positionStyle: CSSProperties = {
    left: coordinatePercentUnclamped(agent.x, battlefieldWidth, agent.side === 'attacker' ? 32 : 68),
    top: coordinatePercentUnclamped(agent.y, battlefieldHeight, agent.side === 'attacker' ? 65 : 35),
    zIndex: agent.zIndex,
    transform: `translate(-50%, -50%) rotate(${agent.rotation.toFixed(2)}deg)`,
  };
  const marker = (
    <span
      ref={markerRef}
      className={classes}
      style={{
        ...positionStyle,
        backgroundColor: agent.colour,
      }}
      onMouseDown={event => {
        if (event.button === 0) event.stopPropagation();
      }}
    />
  );

  if (!showTooltip) return marker;

  return (
    <Tooltip
      content={battleUnitAgentTooltip(agent)}
      position="top"
      delay={150}
      inline
      anchorRef={markerRef}
      wrapperClassName="battle-unit-agent-tooltip-anchor"
      wrapperStyle={positionStyle}
      bubbleClassName="tt-bubble--battle-unit"
    >
      <span
        ref={markerRef}
        className={`${classes} battle-unit-agent--tooltip-child`}
        style={{ backgroundColor: agent.colour }}
        onMouseDown={event => {
          if (event.button === 0) event.stopPropagation();
        }}
      />
    </Tooltip>
  );
}

function BattleUnitAgentLayer({
  agents,
  battlefieldWidth,
  battlefieldHeight,
  showTooltips,
}: {
  agents: BattleVisualAgent[];
  battlefieldWidth: number;
  battlefieldHeight: number;
  showTooltips: boolean;
}) {
  return (
    <div className={`battle-unit-agent-layer${showTooltips ? ' battle-unit-agent-layer--interactive' : ''}`} aria-hidden={!showTooltips}>
      {agents.map(agent => (
        <BattleUnitAgentMarker
          key={agent.key}
          agent={agent}
          battlefieldWidth={battlefieldWidth}
          battlefieldHeight={battlefieldHeight}
          showTooltip={showTooltips}
        />
      ))}
    </div>
  );
}

function WaypointLines({
  formation,
  battlefieldWidth,
  battlefieldHeight,
}: {
  formation: BattleFormationLive;
  battlefieldWidth: number;
  battlefieldHeight: number;
}) {
  if (formation.waypoints.length === 0) return null;
  const points = [
    { x: formation.positionX, y: formation.positionY },
    ...formation.waypoints,
  ];
  const splinePath = buildWaypointSplinePath(points, battlefieldWidth, battlefieldHeight);

  return (
    <svg className="battle-waypoint-spline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path
        d={splinePath}
        fill="none"
        stroke="rgba(20, 13, 7, 0.86)"
        strokeWidth="0.38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={splinePath}
        fill="none"
        stroke="rgba(220, 180, 90, 0.9)"
        strokeWidth="0.16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TargetAttackLine({
  formation,
  target,
  battlefieldWidth,
  battlefieldHeight,
}: {
  formation: BattleFormationLive;
  target: BattleFormationLive;
  battlefieldWidth: number;
  battlefieldHeight: number;
}) {
  const sourceX = coordinatePercentValue(formation.positionX, battlefieldWidth, formation.side === 'attacker' ? 32 : 68);
  const sourceY = coordinatePercentValue(formation.positionY, battlefieldHeight, formation.side === 'attacker' ? 65 : 35);
  const targetX = coordinatePercentValue(target.positionX, battlefieldWidth, target.side === 'attacker' ? 32 : 68);
  const targetY = coordinatePercentValue(target.positionY, battlefieldHeight, target.side === 'attacker' ? 65 : 35);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  return (
    <span
      className={`battle-target-line battle-target-line--${formation.side}`}
      style={{
        left: `${sourceX.toFixed(2)}%`,
        top: `${sourceY.toFixed(2)}%`,
        width: `${length.toFixed(2)}%`,
        transform: `rotate(${angle.toFixed(2)}deg)`,
      }}
    >
      <span className="battle-target-line-rail battle-target-line-rail--outer" />
      <span className="battle-target-line-rail battle-target-line-rail--inner" />
      <span className="battle-target-line-end" />
    </span>
  );
}

function RangeIndicator({
  formation,
  battlefieldWidth,
  battlefieldHeight,
}: {
  formation: BattleFormationLive;
  battlefieldWidth: number;
  battlefieldHeight: number;
}) {
  const radius = Math.max((formation.attackRange ?? 0) + (formation.collisionRadius ?? 0), 80);
  const diameter = radiusPercent(radius * 2, battlefieldWidth);
  const minimumRadius = (formation.minimumAttackRange ?? 0) > 0
    ? Math.max(formation.minimumAttackRange + (formation.collisionRadius ?? 0), 0)
    : 0;
  const minimumDiameterPercentOfOuter = radius > 0
    ? clamp(minimumRadius / radius * 100, 0, 100)
    : 0;

  return (
    <span
      className={`battle-range-indicator battle-range-indicator--${formation.side}`}
      style={{
        left: coordinatePercent(formation.positionX, battlefieldWidth, formation.side === 'attacker' ? 32 : 68),
        top: coordinatePercent(formation.positionY, battlefieldHeight, formation.side === 'attacker' ? 65 : 35),
        width: `${diameter.toFixed(2)}%`,
        height: `${diameter.toFixed(2)}%`,
      }}
    >
      {minimumDiameterPercentOfOuter > 0 && (
        <span
          className="battle-range-indicator-minimum"
          style={{
            width: `${minimumDiameterPercentOfOuter.toFixed(2)}%`,
            height: `${minimumDiameterPercentOfOuter.toFixed(2)}%`,
          }}
        />
      )}
    </span>
  );
}

function SelectionBoxOverlay({ box }: { box: SelectionBox }) {
  const rect = normaliseSelectionBox(box);
  return (
    <span
      className="battle-selection-box"
      style={{
        left: `${rect.left.toFixed(2)}%`,
        top: `${rect.top.toFixed(2)}%`,
        width: `${rect.width.toFixed(2)}%`,
        height: `${rect.height.toFixed(2)}%`,
      }}
    />
  );
}

function DamageIndicator({
  indicator,
  battlefieldWidth,
  battlefieldHeight,
}: {
  indicator: BattleDamageIndicator;
  battlefieldWidth: number;
  battlefieldHeight: number;
}) {
  return (
    <span
      className="battle-damage-indicator"
      style={{
        left: coordinatePercent(indicator.x, battlefieldWidth, 50),
        top: coordinatePercent(indicator.y, battlefieldHeight, 50),
      }}
    >
      <span className="battle-damage-burst" />
      <span className="battle-damage-chip battle-damage-chip--a" />
      <span className="battle-damage-chip battle-damage-chip--b" />
      <span className="battle-damage-chip battle-damage-chip--c" />
      <span className="battle-damage-number">-{formatStrength(indicator.amount)}</span>
    </span>
  );
}

function AttackEffect({
  effect,
  targetFormation,
  battlefieldWidth,
  battlefieldHeight,
}: {
  effect: BattleAttackEffect;
  targetFormation?: BattleFormationLive | null;
  battlefieldWidth: number;
  battlefieldHeight: number;
}) {
  const sourceX = coordinatePercentValue(effect.x, battlefieldWidth, effect.side === 'attacker' ? 32 : 68);
  const sourceY = coordinatePercentValue(effect.y, battlefieldHeight, effect.side === 'attacker' ? 65 : 35);
  const targetX = coordinatePercentValue(targetFormation?.positionX ?? effect.targetX, battlefieldWidth, effect.side === 'attacker' ? 68 : 32);
  const targetY = coordinatePercentValue(targetFormation?.positionY ?? effect.targetY, battlefieldHeight, effect.side === 'attacker' ? 35 : 65);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  if (effect.kind === 'melee') {
    return (
      <span
        className={`battle-attack battle-attack--melee battle-attack--${effect.side}`}
        style={{
          left: `${((sourceX + targetX) * 0.5).toFixed(2)}%`,
          top: `${((sourceY + targetY) * 0.5).toFixed(2)}%`,
        }}
      >
        <span className="battle-attack-clash battle-attack-clash--a" />
        <span className="battle-attack-clash battle-attack-clash--b" />
        <span className="battle-attack-clash battle-attack-clash--c" />
      </span>
    );
  }

  const tracks = effect.kind === 'siege' ? ['siege'] : ['a', 'b', 'c'];

  return (
    <span
      className={`battle-attack battle-attack--projectile battle-attack--${effect.side} battle-attack--${effect.kind}`}
      style={{
        left: `${sourceX.toFixed(2)}%`,
        top: `${sourceY.toFixed(2)}%`,
        width: `${length.toFixed(2)}%`,
        transform: `rotate(${angle.toFixed(2)}deg)`,
      }}
    >
      {tracks.map(track => (
        <span key={track} className={`battle-attack-projectile-track battle-attack-projectile-track--${track}`}>
          <span className="battle-attack-projectile" />
        </span>
      ))}
      <span className="battle-attack-impact" />
    </span>
  );
}

function buildObstacleTrees(obstacle: BattlefieldObstacleDetail): TerrainTree[] {
  const treeCount = clamp(Math.round((obstacle.width + obstacle.height) / 115), 3, 9);
  const trees: TerrainTree[] = [];

  for (let index = 0; index < treeCount; index++) {
    const sourceIndex = Math.floor(stableObstacleNoise(obstacle.id, index, 19) * TERRAIN_TREE_SOURCES.length) % TERRAIN_TREE_SOURCES.length;
    trees.push({
      x: clamp(14 + stableObstacleNoise(obstacle.id, index, 31) * 72, 8, 92),
      y: clamp(24 + stableObstacleNoise(obstacle.id, index, 43) * 58, 14, 86),
      size: 1.8 + stableObstacleNoise(obstacle.id, index, 59) * 1.1,
      src: TERRAIN_TREE_SOURCES[sourceIndex],
    });
  }

  return trees;
}

interface RgbaColour extends RgbColour {
  a: number;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_CRC_TABLE = (() => {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function heightColour(height: number, slope: number): RgbColour {
  const clampedHeight = clamp(height, 0, 1);
  const clampedSlope = clamp(slope, 0, 1);

  if (clampedHeight < 0.18) return { r: Math.round(48 + clampedSlope * 10), g: Math.round(78 + clampedSlope * 8), b: Math.round(72 + clampedSlope * 10) };
  if (clampedHeight < 0.38) return { r: Math.round(73 + clampedSlope * 10), g: Math.round(86 + clampedSlope * 8), b: Math.round(56 + clampedSlope * 8) };
  if (clampedHeight > 0.82) return { r: Math.round(148 + clampedSlope * 12), g: Math.round(126 + clampedSlope * 10), b: Math.round(86 + clampedSlope * 10) };
  if (clampedHeight > 0.62) return { r: Math.round(119 + clampedSlope * 12), g: Math.round(100 + clampedSlope * 10), b: Math.round(66 + clampedSlope * 8) };
  return { r: Math.round(98 + clampedSlope * 10), g: Math.round(88 + clampedSlope * 8), b: Math.round(58 + clampedSlope * 8) };
}

function heightOpacity(height: number, slope: number): number {
  return clamp(0.24 + Math.abs(height - 0.5) * 0.22 + slope * 0.08, 0.18, 0.48);
}

function contourColour(threshold: number): RgbColour {
  if (threshold < 0.28) return { r: 42, g: 62, b: 58 };
  if (threshold > 0.72) return { r: 75, g: 55, b: 34 };
  return { r: 75, g: 64, b: 42 };
}

function heightMapValue(
  heightMap: BattlefieldHeightPointDetail[],
  columns: number,
  rows: number,
  column: number,
  row: number,
): BattlefieldHeightPointDetail {
  const safeColumn = Math.max(0, Math.min(columns - 1, column));
  const safeRow = Math.max(0, Math.min(rows - 1, row));
  return heightMap[safeRow * columns + safeColumn] ?? { height: 0.5, slope: 0 };
}

function sampleHeightMap(
  heightMap: BattlefieldHeightPointDetail[],
  columns: number,
  rows: number,
  x: number,
  y: number,
): { height: number; slope: number } {
  if (heightMap.length === 0 || columns <= 1 || rows <= 1) {
    return { height: 0.5, slope: 0 };
  }

  const gridX = clamp(x, 0, 1) * (columns - 1);
  const gridY = clamp(y, 0, 1) * (rows - 1);
  const left = Math.floor(gridX);
  const top = Math.floor(gridY);
  const right = Math.min(columns - 1, left + 1);
  const bottom = Math.min(rows - 1, top + 1);
  const alphaX = gridX - left;
  const alphaY = gridY - top;

  const topLeft = heightMapValue(heightMap, columns, rows, left, top);
  const topRight = heightMapValue(heightMap, columns, rows, right, top);
  const bottomLeft = heightMapValue(heightMap, columns, rows, left, bottom);
  const bottomRight = heightMapValue(heightMap, columns, rows, right, bottom);

  const topHeight = topLeft.height + (topRight.height - topLeft.height) * alphaX;
  const bottomHeight = bottomLeft.height + (bottomRight.height - bottomLeft.height) * alphaX;
  const topSlope = topLeft.slope + (topRight.slope - topLeft.slope) * alphaX;
  const bottomSlope = bottomLeft.slope + (bottomRight.slope - bottomLeft.slope) * alphaX;

  return {
    height: topHeight + (bottomHeight - topHeight) * alphaY,
    slope: topSlope + (bottomSlope - topSlope) * alphaY,
  };
}

function heightBandBoundaryColour(height: number, slope: number): RgbColour | null {
  for (const threshold of HEIGHT_CONTOUR_THRESHOLDS) {
    const boundaryWidth = 0.0045 + clamp(slope, 0, 1) * 0.0025;
    if (Math.abs(height - threshold) <= boundaryWidth) {
      return contourColour(threshold);
    }
  }

  return null;
}

function heightPixelColour(height: number, slope: number): RgbaColour {
  const boundaryColour = heightBandBoundaryColour(height, slope);
  const colour = boundaryColour ?? heightColour(height, slope);

  return {
    ...colour,
    a: Math.round(clamp(heightOpacity(height, slope) + (boundaryColour ? 0.1 : 0), 0, 0.62) * 255),
  };
}

function appendBytes(target: number[], source: readonly number[]): void {
  for (let index = 0; index < source.length; index += 1) {
    target.push(source[index] & 0xff);
  }
}

function appendUInt32BE(target: number[], value: number): void {
  target.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function pngTypeBytes(type: string): number[] {
  return [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)];
}

function crc32(bytes: readonly number[]): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = PNG_CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: readonly number[]): number[] {
  const typeBytes = pngTypeBytes(type);
  const crcBytes: number[] = [];
  appendBytes(crcBytes, typeBytes);
  appendBytes(crcBytes, data);

  const chunk: number[] = [];
  appendUInt32BE(chunk, data.length);
  appendBytes(chunk, typeBytes);
  appendBytes(chunk, data);
  appendUInt32BE(chunk, crc32(crcBytes));
  return chunk;
}

function adler32(bytes: readonly number[]): number {
  let a = 1;
  let b = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    a = (a + bytes[index]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStore(bytes: readonly number[]): number[] {
  const output = [0x78, 0x01];
  let offset = 0;

  while (offset < bytes.length) {
    const blockLength = Math.min(65535, bytes.length - offset);
    const finalBlock = offset + blockLength >= bytes.length;
    const inverseLength = (~blockLength) & 0xffff;

    output.push(finalBlock ? 0x01 : 0x00);
    output.push(blockLength & 0xff, (blockLength >>> 8) & 0xff);
    output.push(inverseLength & 0xff, (inverseLength >>> 8) & 0xff);

    for (let index = 0; index < blockLength; index += 1) {
      output.push(bytes[offset + index] & 0xff);
    }

    offset += blockLength;
  }

  appendUInt32BE(output, adler32(bytes));
  return output;
}

function bytesToBase64(bytes: readonly number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const second = hasSecond ? bytes[index + 1] : 0;
    const third = hasThird ? bytes[index + 2] : 0;

    result += alphabet[first >>> 2];
    result += alphabet[((first & 0x03) << 4) | (second >>> 4)];
    result += hasSecond ? alphabet[((second & 0x0f) << 2) | (third >>> 6)] : '=';
    result += hasThird ? alphabet[third & 0x3f] : '=';
  }

  return result;
}

function buildPngDataUrl(width: number, height: number, rgbaScanlines: readonly number[]): string {
  const ihdr: number[] = [];
  appendUInt32BE(ihdr, width);
  appendUInt32BE(ihdr, height);
  ihdr.push(8, 6, 0, 0, 0);

  const pngBytes: number[] = [];
  appendBytes(pngBytes, PNG_SIGNATURE);
  appendBytes(pngBytes, pngChunk('IHDR', ihdr));
  appendBytes(pngBytes, pngChunk('IDAT', zlibStore(rgbaScanlines)));
  appendBytes(pngBytes, pngChunk('IEND', []));

  return `data:image/png;base64,${bytesToBase64(pngBytes)}`;
}

function buildHeightMapDataUrl(
  heightMap: BattlefieldHeightPointDetail[],
  columns: number,
  rows: number,
): string {
  if (heightMap.length === 0 || columns <= 0 || rows <= 0) {
    return '';
  }

  const imageSize = HEIGHT_IMAGE_SIZE;
  const maxIndex = imageSize - 1;
  const rgbaScanlines: number[] = [];

  for (let y = 0; y < imageSize; y += 1) {
    rgbaScanlines.push(0);
    for (let x = 0; x < imageSize; x += 1) {
      const sampled = sampleHeightMap(heightMap, columns, rows, x / maxIndex, y / maxIndex);
      const pixel = heightPixelColour(sampled.height, sampled.slope);
      rgbaScanlines.push(pixel.r, pixel.g, pixel.b, pixel.a);
    }
  }

  return buildPngDataUrl(imageSize, imageSize, rgbaScanlines);
}

function BattleHeightLayer({
  heightMap,
  columns,
  rows,
}: {
  heightMap: BattlefieldHeightPointDetail[];
  columns: number;
  rows: number;
}) {
  const heightMapSrc = useMemo(
    () => buildHeightMapDataUrl(heightMap, columns, rows),
    [columns, heightMap, rows],
  );

  if (!heightMapSrc) {
    return null;
  }

  return <img className="battle-heightmap" src={heightMapSrc} alt="" draggable={false} aria-hidden="true" />;
}

function BattleObstacleFeature({
  obstacle,
  battlefieldWidth,
  battlefieldHeight,
}: {
  obstacle: BattlefieldObstacleDetail;
  battlefieldWidth: number;
  battlefieldHeight: number;
}) {
  const style: CSSProperties = {
    left: coordinatePercent(obstacle.centreX, battlefieldWidth, 50),
    top: coordinatePercent(obstacle.centreY, battlefieldHeight, 50),
    width: sizePercent(obstacle.width, battlefieldWidth),
    height: sizePercent(obstacle.height, battlefieldHeight),
    transform: `translate(-50%, -50%) rotate(${obstacle.rotation.toFixed(2)}deg)`,
  };
  const trees = obstacle.type === 'woods' ? buildObstacleTrees(obstacle) : [];

  return (
    <span
      className={`battle-feature battle-obstacle battle-obstacle--${obstacle.type}${obstacle.blocksMovement ? ' battle-obstacle--blocking' : ''}`}
      style={style}
    >
      {trees.map((tree, index) => (
        <img
          key={`${obstacle.id}:${index}`}
          className="battle-obstacle-tree"
          src={tree.src}
          alt=""
          draggable={false}
          style={{
            left: `${tree.x}%`,
            top: `${tree.y}%`,
            width: `${tree.size}rem`,
          }}
        />
      ))}
    </span>
  );
}

function BattleObstacleLayer({
  obstacles,
  battlefieldWidth,
  battlefieldHeight,
}: {
  obstacles: BattlefieldObstacleDetail[];
  battlefieldWidth: number;
  battlefieldHeight: number;
}) {
  return (
    <div className="battle-terrain-features" aria-hidden="true">
      {obstacles.map(obstacle => (
        <BattleObstacleFeature
          key={obstacle.id}
          obstacle={obstacle}
          battlefieldWidth={battlefieldWidth}
          battlefieldHeight={battlefieldHeight}
        />
      ))}
    </div>
  );
}

function BattleActionButton({
  action,
  battleId,
  formationId,
}: {
  action: BattleActionOption;
  battleId: string;
  formationId: string;
}) {
  const requestedAction = action.isActive ? '' : action.id;
  const actionUnavailable = !action.canActivate && !action.isActive;
  return (
    <Tooltip
      position="top"
      content={{
        title: action.name,
        body: action.description,
        lines: [
          { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.609.10'), value: String(action.requiredTactics) },
          { label: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.610.11'), value: String(action.requiredAuthority) },
        ],
        footer: action.disabledReason || undefined,
      }}
    >
      <button
        type="button"
        className={`battle-action-btn${action.isActive ? ' is-active' : ''}${actionUnavailable ? ' is-disabled' : ''}`}
        aria-disabled={actionUnavailable ? 'true' : 'false'}
        onMouseDown={() => {
          if (actionUnavailable) return;
          void startBattleActionBridge(battleId, formationId, requestedAction);
        }}
      >
        <img src={actionIcon(action)} alt="" />
      </button>
    </Tooltip>
  );
}

function BattleZoomIndicator({ zoom }: { zoom: number }) {
  return <div className="battle-zoom-indicator">{Math.round(zoom * 100)}%</div>;
}

export default function BattleScreen({ battleId, onClose }: BattleScreenProps) {
  const battle = useBattleBridge(battleId);
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
  const previousAttackChargesRef = useRef<{ battleId: string; charges: Map<string, number> }>({
    battleId: '',
    charges: new Map(),
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
      previousAttackChargesRef.current = { battleId: activeBattleId, charges: new Map() };
      return;
    }

    const previous = previousStrengthsRef.current.battleId === activeBattleId
      ? previousStrengthsRef.current.strengths
      : new Map<string, number>();
    const previousCharges = previousAttackChargesRef.current.battleId === activeBattleId
      ? previousAttackChargesRef.current.charges
      : new Map<string, number>();
    const nextStrengths = new Map<string, number>();
    const nextCharges = new Map<string, number>();
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

      const priorCharge = previousCharges.get(formation.id);
      const currentCharge = clamp(formation.attackChargePercent ?? 0, 0, 1);
      nextCharges.set(formation.id, currentCharge);

      const kind = attackKind(formation);
      if (typeof priorCharge === 'number' && priorCharge > 0.72 && currentCharge < 0.25) {
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
    previousAttackChargesRef.current = { battleId: activeBattleId, charges: nextCharges };

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
    () => buildBattleVisualAgents(formations, formationsById, playerReferenceColour, battlefieldWidth, battlefieldHeight),
    [battlefieldHeight, battlefieldWidth, formations, formationsById, playerReferenceColour],
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
  const selected = selectedFormations[0] ?? null;
  const selectedActionFormation = selectedCommandable.length === 1 ? selectedCommandable[0] : null;
  const selectedCommandableStrength = selectedCommandable.reduce((total, formation) => total + formation.strength, 0);
  const selectedCommandableMaxStrength = selectedCommandable.reduce((total, formation) => total + formation.maxStrength, 0);
  const selectedParticipant = selected
    ? sideCommander(selected.side === 'defender' ? battle?.defender ?? { participants: [], totalStrength: 0, totalMaxStrength: 0, currentManpower: 0, initialManpower: 0, losses: 0, morale: 0 } : battle?.attacker ?? { participants: [], totalStrength: 0, totalMaxStrength: 0, currentManpower: 0, initialManpower: 0, losses: 0, morale: 0 })
    : null;

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

  const battleHeader = battle && battle.found ? (
    <div ref={battleHeaderRef} className="battle-header-stack">
      <div className="battle-title-strip">
        <div className="battle-title-text">
          <span className="battle-title-name">{battle.title}</span>
          <span className="battle-title-location">{battle.location}</span>
        </div>
        <div className="battle-title-actions">
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
      {!battle || !battle.found ? (
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
                            <span>{selectedActionFormation.stanceLabel}</span>
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
                    <Tooltip content={{ title: webUIText('Battle.FormationWithdrawTitle'), body: webUIText('Battle.FormationWithdrawBody') }} position="top">
                      <GameButton
                        variant="outline"
                        className="battle-withdraw"
                        onClick={withdrawSelectedFormations}
                      >
                        <img src="/assets/icons/BattleActions/I_Withdraw.png" alt="" className="battle-withdraw-icon" />
                        <WebUIText textKey="Battle.FormationWithdraw" />
                      </GameButton>
                    </Tooltip>
                    {selectedParticipant?.canRetreat && (
                      <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.911.15'), body: webUIText('Auto.Prop.ComponentsScreensBattleBattleScreen.911.16') }} position="top">
                        <GameButton
                          variant="outline"
                          className="battle-retreat"
                          onClick={() => void requestBattleRetreatBridge(activeBattleId, selectedParticipant.id)}
                        >
                          <img src="/assets/icons/I_Retreat.png" alt="" className="battle-retreat-icon" />
                          <WebUIText textKey="Auto.ComponentsScreensBattleBattleScreen.917.5" />
                        </GameButton>
                      </Tooltip>
                    )}
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

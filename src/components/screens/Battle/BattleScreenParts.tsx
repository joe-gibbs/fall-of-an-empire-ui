import { useCallback, useMemo, useRef, type CSSProperties, type MouseEvent } from 'react';
import FactionRoundel from '../../common/entities/FactionRoundel';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import Portrait from '../../common/portraits/Portrait';
import Tooltip, { type TooltipContent } from '../../common/tooltips/Tooltip';
import type { BattleFormationLive, BattleAgentFrameView } from '../../../bridge/military-map/useBattleBridge';
import { battleFrameAgentCount, readBattleAgentFrame, startBattleActionBridge } from '../../../bridge/military-map/useBattleBridge';
import { useGameActions } from '../../../context/GameContext';
import type { BattleActionOption, BattleParticipantDetail, BattleSideDetail, BattlefieldHeightPointDetail, BattlefieldObstacleDetail } from '../../../bridge-types.generated.ts';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { buildHeightMapDataUrl } from './heightMapImage';
import { buildWaypointSplinePath, coordinatePercent, coordinatePercentUnclamped, coordinatePercentValue, normaliseDegrees, normaliseSelectionBox, radiusPercent, sizePercent, stableObstacleNoise, type SelectionBox } from './battleGeometry';
import { webUIText } from '../../../localization/WebUITextContext';

const TERRAIN_ICONS: Record<string, string> = {
  forest: '/assets/icons/Terrain/_0001_I_Forest.png',
  hills: '/assets/icons/Terrain/_0002_I_Rock.png',
  rocky: '/assets/icons/Terrain/_0002_I_Rock.png',
  desert: '/assets/icons/Terrain/_0003_I_Desert.png',
  snow: '/assets/icons/Terrain/_0004_I_Snow.png',
  swamp: '/assets/icons/Terrain/_0005_I_Swamp.png',
  grassland: '/assets/icons/Terrain/_0000_I_Grassland.png',
};

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

interface TerrainTree {
  x: number;
  y: number;
  size: number;
  src: string;
}

export interface BattleVisualAgent {
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

export const BATTLE_ACTION_ICON_IDS: Record<string, string> = {
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

export function fmt(value: number | undefined): string {
  return formatNumber(value);
}

export function formatStrength(value: number | undefined): string {
  const next = Number(value ?? 0);
  if (next >= 1000) return `${formatNumber(next / 1000, { maximumFractionDigits: 1 })}k`;
  return formatNumber(next);
}

export function pct(value: number | undefined): string {
  return formatPercent(value ?? 0);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface RgbColour {
  r: number;
  g: number;
  b: number;
}

export function parseHexColour(value: string | undefined): RgbColour | null {
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

export function colourDistance(a: string | undefined, b: string | undefined): number {
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
const BATTLE_COUNTER_MORALE_SEGMENTS = 10;

export function readableCounterColour(formation: BattleFormationLive, playerReferenceColour: string | null): string {
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

export function unitTypeKey(formation: BattleFormationLive): 'infantry' | 'ranged' | 'cavalry' | 'siege' {
  const type = formation.unitType.toLowerCase();
  if (type.indexOf('cavalry') >= 0 || type.indexOf('horse') >= 0) return 'cavalry';
  if (type.indexOf('archer') >= 0 || type.indexOf('ranged') >= 0 || type.indexOf('skirmish') >= 0) return 'ranged';
  if (type.indexOf('siege') >= 0 || type.indexOf('ballist') >= 0 || type.indexOf('catapult') >= 0) return 'siege';
  return 'infantry';
}

export function attackKind(formation: BattleFormationLive): 'melee' | 'ranged' | 'siege' {
  const type = unitTypeKey(formation);
  if (type === 'ranged' || type === 'siege') return type;
  return 'melee';
}

export function formationsAreInMeleeContact(formation: BattleFormationLive, target: BattleFormationLive): boolean {
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

export function buildBattleVisualAgents(
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

export function formationAgentFootprint(formation: BattleFormationLive, typeKey: 'infantry' | 'ranged' | 'cavalry' | 'siege'): { width: number; height: number } {
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

export function unitIcon(formation: BattleFormationLive): string {
  const key = unitTypeKey(formation);
  if (key === 'cavalry') return '/assets/icons/UnitTypes/I_Cavalry.png';
  if (key === 'ranged') return '/assets/icons/UnitTypes/I_Ranged.png';
  if (key === 'siege') return '/assets/icons/UnitTypes/I_Siege.png';
  return '/assets/icons/UnitTypes/I_Infantry.png';
}

export function actionIcon(action: BattleActionOption): string {
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

export function terrainIcon(terrain: string): string {
  const key = terrain.toLowerCase();
  return TERRAIN_ICONS[key] ?? TERRAIN_ICONS.grassland;
}

export function sideCommander(side: BattleSideDetail): BattleParticipantDetail | null {
  return side.participants.find(participant => participant.commander) ?? side.participants[0] ?? null;
}

export function leaderName(participant: BattleParticipantDetail | null | undefined): string {
  const commander = participant?.commander?.trim() ?? '';
  return commander || webUIText('Common.NoCommander');
}

export function participantFallbackName(participant: BattleParticipantDetail | null | undefined): string {
  return participant?.commander || participant?.name || participant?.faction.name || webUIText('Common.NoCommander');
}

export function hasLinkId(id: string | null | undefined): id is string {
  return Boolean(id && id.trim().length > 0);
}

export function SideBlock({
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

export function FormationCounter({
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
  const moraleClass = morale < 35
    ? ' battle-counter-morale--critical'
    : morale < 65
      ? ' battle-counter-morale--shaken'
      : ' battle-counter-morale--steady';
  const moraleSegments = Array.from({ length: BATTLE_COUNTER_MORALE_SEGMENTS }, (_, index) => {
    const segmentStart = index / BATTLE_COUNTER_MORALE_SEGMENTS * 100;
    const segmentWidth = 100 / BATTLE_COUNTER_MORALE_SEGMENTS;
    return clamp((morale - segmentStart) / segmentWidth * 100, 0, 100);
  });
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
            <span
              className={`battle-counter-morale${moraleClass}`}
              aria-hidden="true"
            >
              {moraleSegments.map((segmentFill, index) => (
                <span key={index} className="battle-counter-morale-segment">
                  <span style={{ width: `${segmentFill.toFixed(0)}%` }} />
                </span>
              ))}
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

export function FormationTooltipBody({ formation }: { formation: BattleFormationLive }) {
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

export function battleUnitAgentTooltip(agent: BattleVisualAgent): TooltipContent {
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

export function BattleUnitAgentMarker({
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

export function BattleUnitAgentLayer({
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

export function WaypointLines({
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

export function TargetAttackLine({
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

export function RangeIndicator({
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

export function SelectionBoxOverlay({ box }: { box: SelectionBox }) {
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

export function DamageIndicator({
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

export function AttackEffect({
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

export function buildObstacleTrees(obstacle: BattlefieldObstacleDetail): TerrainTree[] {
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

export function BattleHeightLayer({
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

export function BattleObstacleFeature({
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

export function BattleObstacleLayer({
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

export function BattleActionButton({
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

export function BattleZoomIndicator({ zoom }: { zoom: number }) {
  return <div className="battle-zoom-indicator">{Math.round(zoom * 100)}%</div>;
}


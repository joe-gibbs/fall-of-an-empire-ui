import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import { dismissSharedTooltips } from '../common/tooltips/tooltipEvents';
import FactionTooltip from '../common/tooltips/FactionTooltip';
import PersonTooltip from '../common/tooltips/PersonTooltip';
import EntityLink from '../common/entities/EntityLink';
import FactionRoundel from '../common/entities/FactionRoundel';
import GameButton from '../common/buttons/GameButton';
import type { ArmyGlanceData, GlanceFactionStub, NavyGlanceData } from './WorldGlanceTypes';
import { bridgeCall, type GetMilitaryDataResponse } from '../../bridge-types.generated.ts';
import { clampUnitFraction } from './glanceMath';
import { militaryRingStackStyle } from './ringAssets';
import { formatNumber, formatPercent } from '../../utils/numberFormat';
import { WebkilnAssetPath } from '../../utils/assets';
import { useGameState, useOptionalGameActions } from '../../context/GameContext';
import { roundelDiplomacyProps } from '../../utils/factionBorder';
import { isHostileGlance, relationDisplayColour, relationDisplayLabel, relationTextVars } from './WorldGlancePresentation';
import GlanceRelationFrame from './GlanceRelationFrame';

import { webUIText } from '../../localization/WebUITextContext';
function moraleColour(m: number): string {
  if (m >= 0.75) return 'var(--green-light)';
  if (m >= 0.5) return 'var(--gold)';
  if (m >= 0.25) return '#c88a3a';
  return 'var(--red)';
}

function strengthColour(pct: number): string {
  if (pct >= 0.8) return 'var(--green)';
  if (pct >= 0.5) return 'var(--gold)';
  return 'var(--red)';
}

function tierColour(tier: number): string {
  if (tier >= 5) return '#d6dce5';
  if (tier >= 4) return '#d7a45c';
  if (tier >= 3) return 'var(--gold)';
  if (tier >= 2) return '#86a96d';
  return '#78909a';
}

function tierTexture(tier: number): string {
  const t = Math.min(5, Math.max(1, tier));
  return `/assets/icons/Tiers/Tier${String(t)}.png`;
}

function relationBackgroundColour(relation: ArmyGlanceData['faction']['relation']): string {
  if (relation === 'own' || relation === 'subject') return 'rgba(32, 20, 27, 0.82)';
  if (relation === 'ally') return 'rgba(18, 38, 28, 0.82)';
  if (relation === 'enemy') return 'rgba(46, 18, 17, 0.84)';
  return 'rgba(20, 20, 21, 0.76)';
}

function relationTargetBackgroundColour(relation: ArmyGlanceData['faction']['relation']): string {
  if (relation === 'own' || relation === 'subject') return 'rgba(42, 24, 32, 0.88)';
  if (relation === 'ally') return 'rgba(20, 50, 35, 0.88)';
  if (relation === 'enemy') return 'rgba(58, 20, 18, 0.9)';
  return 'rgba(30, 29, 27, 0.86)';
}

function relationLabelBackgroundColour(relation: ArmyGlanceData['faction']['relation']): string {
  if (relation === 'own' || relation === 'subject') return 'rgba(29, 15, 22, 0.9)';
  if (relation === 'ally') return 'rgba(11, 30, 22, 0.9)';
  if (relation === 'enemy') return 'rgba(42, 13, 12, 0.92)';
  return 'rgba(13, 13, 14, 0.88)';
}

function relationBorderTopColour(relation: ArmyGlanceData['faction']['relation']): string {
  if (relation === 'ally') return 'rgba(122, 180, 110, 0.78)';
  if (relation === 'enemy') return 'rgba(204, 75, 55, 0.82)';
  if (relation === 'neutral') return 'rgba(190, 176, 132, 0.52)';
  return 'rgba(224, 200, 114, 0.62)';
}

function relationBorderSideColour(relation: ArmyGlanceData['faction']['relation']): string {
  if (relation === 'ally') return 'rgba(96, 150, 92, 0.36)';
  if (relation === 'enemy') return 'rgba(185, 60, 45, 0.42)';
  if (relation === 'neutral') return 'rgba(166, 150, 102, 0.24)';
  return 'rgba(201, 168, 76, 0.28)';
}

const STRENGTH_RING_REFERENCE = 5000;
const ARMY_TYPE_ICON = '/assets/icons/I_Swords.png';
const NAVY_TYPE_ICON = '/assets/icons/I_Anchor.png';

function strengthFraction(data: { strength: number }): number {
  return clampUnitFraction(data.strength / STRENGTH_RING_REFERENCE);
}

function strengthValueLabel(strength: number, maxStrength: number): string {
  if (maxStrength > 0) {
    return webUIText("Auto.Return.componentsworldglancesArmyGlance.136.1", { Value1: formatNumber(strength), Value2: formatNumber(maxStrength) });
  }

  return formatNumber(strength);
}

function GlanceFactionMark({
  faction,
  className,
  size,
  showRing = false,
}: {
  faction: GlanceFactionStub;
  className?: string;
  size: 'xs' | 'md';
  showRing?: boolean;
}) {
  return (
    <FactionRoundel
      className={className}
      factionId={faction.id}
      colour={faction.colour}
      secondaryColour={faction.secondaryColour}
      cultureGroup={faction.cultureGroup}
      emblem={faction.emblem}
      name={faction.name}
      size={size}
      showRing={showRing}
      resolveFaction={false}
      {...roundelDiplomacyProps(faction)}
    />
  );
}

function militaryKindLabel(isNavy: boolean, isPersonalGuard: boolean): string {
  if (isNavy) return webUIText('Common.Fleet');
  if (isPersonalGuard) return webUIText('Military.PersonalGuard');
  return webUIText('Common.Army');
}

function MilitaryGlanceHeader({
  faction,
  title,
  isNavy,
  isPersonalGuard,
  interactive,
}: {
  faction: GlanceFactionStub;
  title: string;
  isNavy: boolean;
  isPersonalGuard: boolean;
  interactive: boolean;
}) {
  const openSidebar = useOptionalGameActions()?.openSidebar;
  const identity = (
    <div className="military-glance-tt-identity">
      <GlanceFactionMark faction={faction} className="military-glance-tt-roundel" size="md" showRing />
      <div className="military-glance-tt-copy">
        <div className="military-glance-tt-name">{title}</div>
        <div className="military-glance-tt-meta">
          <span>{militaryKindLabel(isNavy, isPersonalGuard)}</span>
          <span className="military-glance-tt-meta-rule" aria-hidden="true" />
          <span style={{ color: relationDisplayColour(faction.relation) }}>
            {relationDisplayLabel(faction.relation)}
          </span>
        </div>
      </div>
    </div>
  );

  if (!interactive) {
    return identity;
  }

  return (
    <FactionTooltip factionId={faction.id} factionName={faction.name} delay={150}>
      <div
        className="military-glance-tt-identity-hit"
        onClick={() => {
          if (faction.id) {
            openSidebar?.('diplomacy', faction.id);
          }
        }}
      >
        {identity}
      </div>
    </FactionTooltip>
  );
}

function GlancePersonValue({ id, name, interactive }: { id?: string; name: string; interactive: boolean }) {
  if (!interactive || !id) {
    return <>{name}</>;
  }

  return (
    <PersonTooltip characterId={id} delay={150}>
      <span className="tt-nested-link">{name}</span>
    </PersonTooltip>
  );
}

function GlanceEntityValue({ type, id, name, interactive }: { type: string; id?: string; name: string; interactive: boolean }) {
  if (!interactive) {
    return <>{name}</>;
  }

  return (
    <EntityLink type={type} id={id} inline className="tt-entity-link" fallbackClassName="tt-nested-link">
      {name}
    </EntityLink>
  );
}

function linkedOrderValue(detail: GetMilitaryDataResponse, fallback: string, interactive: boolean): ReactNode {
  const targetId = detail.currentOrderTargetId;
  const targetType = detail.currentOrderTargetType;
  if (!interactive || !targetId || !targetType) {
    return fallback;
  }

  return <GlanceEntityValue type={targetType} id={targetId} name={fallback} interactive />;
}

function militaryTooltip(
  data: ArmyGlanceData | NavyGlanceData,
  detail: GetMilitaryDataResponse | null,
  isNavy: boolean,
  blockading: boolean,
  debugMode: boolean,
  interactive: boolean,
  onViewMilitary: () => void,
): TooltipContent {
  const isRaiding = detail?.isRaiding ?? Boolean(data.raiding);
  const isPersonalGuard = Boolean(detail?.found && detail.isPersonalGuard);
  const strength = detail?.found ? detail.strength : data.strength;
  const maxStrength = detail?.found ? detail.maxStrength : 0;
  const moralePercent = detail?.found ? detail.morale : clampUnitFraction(data.morale) * 100;
  const statuses: string[] = [];
  if (isRaiding) statuses.push(webUIText('WorldGlances.Military.Raiding'));
  if (data.attrition) statuses.push(webUIText('WorldGlances.Military.Attrition'));
  if (blockading) statuses.push(webUIText('WorldGlances.Military.Blockading'));
  const embarkedArmyCount = isNavy ? (data as NavyGlanceData).embarkedArmyCount ?? 0 : 0;
  const currentOrder = detail?.currentOrder ?? '';
  const garrisonedAt = detail?.found ? detail.garrisonedAt : '';
  const embarkedNavyName = detail?.found ? detail.embarkedNavyName : '';
  const parentCommand = detail?.found ? detail.parentCommand : '';

  const lines: TooltipLine[] = [];

  if (detail?.found) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.173.3'),
      value: (
        <GlancePersonValue
          id={detail.commanderId || undefined}
          name={detail.commanderName || webUIText('Common.NoCommander')}
          interactive={interactive}
        />
      ),
    });
  }

  lines.push({
    label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.174.4'),
    value: (
      <GlanceEntityValue
        type="faction"
        id={data.faction.id}
        name={data.faction.name}
        interactive={interactive}
      />
    ),
  });

  if (garrisonedAt) {
    lines.push({
      label: webUIText('WorldGlances.Military.GarrisonedIn'),
      value: (
        <GlanceEntityValue
          type="settlement"
          id={detail?.garrisonedAtId || undefined}
          name={garrisonedAt}
          interactive={interactive}
        />
      ),
      valueIcon: '/assets/icons/I_Domain.png',
    });
  }

  if (embarkedNavyName) {
    lines.push({
      label: webUIText('WorldGlances.Military.EmbarkedIn'),
      value: (
        <GlanceEntityValue
          type="military"
          id={detail?.embarkedNavyId || undefined}
          name={embarkedNavyName}
          interactive={interactive}
        />
      ),
      valueIcon: '/assets/icons/I_NaviesQuickButton.png',
    });
  }

  if (parentCommand) {
    lines.push({
      label: webUIText('WorldGlances.Military.Command'),
      value: (
        <GlanceEntityValue
          type="military"
          id={detail?.parentCommandId || undefined}
          name={parentCommand}
          interactive={interactive}
        />
      ),
      valueIcon: '/assets/icons/I_ArmiesQuickButton.png',
    });
  }

  if (currentOrder) {
    lines.push({
      label: webUIText('WorldGlances.Military.CurrentAction'),
      value: detail?.found ? linkedOrderValue(detail, currentOrder, interactive) : currentOrder,
      valueIcon: blockading ? '/assets/icons/I_Siege.png' : isRaiding ? '/assets/icons/I_RaidingTorch.png' : undefined,
    });
  }

  lines.push(
    {
      get label() { return isNavy ? webUIText("ArmyGlance.Ships") : webUIText("ArmyGlance.Soldiers"); },
      value: strengthValueLabel(strength, maxStrength),
      valueColor: strengthColour(clampUnitFraction(strength / STRENGTH_RING_REFERENCE)),
      valueIcon: isNavy ? NAVY_TYPE_ICON : ARMY_TYPE_ICON,
      isHeader: true,
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.168.2'),
      value: formatPercent(moralePercent),
      valueColor: moraleColour(moralePercent / 100),
      valueIcon: '/assets/icons/I_Loyalty.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.176.5'),
      get value() { return webUIText("Auto.Prop.componentsworldglancesArmyGlance.178.1", { Value1: String(data.tier) }); },
      valueIcon: tierTexture(data.tier),
    },
  );

  if (embarkedArmyCount > 0) {
    lines.push({
      label: webUIText('Military.EmbarkedArmies'),
      value: formatNumber(embarkedArmyCount),
      valueIcon: '/assets/icons/I_ArmiesQuickButton.png',
    });
  }

  if (statuses.length > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.184.6'),
      value: statuses.join(', '),
      valueColor: data.attrition ? 'var(--red)' : 'var(--gold-light)',
    });
  }

  if (debugMode) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.191.7'), isHeader: true });
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.192.8'), value: `#${formatNumber(detail?.debugShortId ?? 0)}` });
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.193.9'), value: `#${formatNumber(data.faction.debugShortId ?? 0)}` });
    if (detail?.commanderDebugShortId) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.195.10'), value: `#${formatNumber(detail.commanderDebugShortId)}` });
    }
  }

  return {
    header: (
      <MilitaryGlanceHeader
        faction={data.faction}
        title={detail?.name || data.faction.name}
        isNavy={isNavy}
        isPersonalGuard={isPersonalGuard}
        interactive={interactive}
      />
    ),
    lines,
    footer: (
      <GameButton
        variant="burgundy"
        fullWidth
        icon={isNavy ? '/assets/icons/I_NaviesQuickButton.png' : '/assets/icons/I_ArmiesQuickButton.png'}
        onClick={onViewMilitary}
      >
        {webUIText('FactionMilitary.ViewMilitary')}
      </GameButton>
    ),
  };
}

interface ArmyGlanceProps {
  data: ArmyGlanceData | NavyGlanceData;
  isNavy?: boolean;
  enableHoverTooltip?: boolean;
}

interface MilitaryTooltipProps extends ArmyGlanceProps {
  children: React.ReactNode;
  open?: boolean;
  passive?: boolean;
  wrapperStyle?: CSSProperties;
}

function MilitaryTooltip({ data, isNavy = false, children, open, passive = false, wrapperStyle }: MilitaryTooltipProps) {
  const { debugMode } = useGameState();
  const openSidebar = useOptionalGameActions()?.openSidebar;
  const [tooltipDetail, setTooltipDetail] = useState<{ id: string; data: GetMilitaryDataResponse } | null>(null);
  const requestInFlightIdRef = useRef<string | null>(null);
  const blockading = isNavy && (data as NavyGlanceData).blockading;
  const resolvedDetail = tooltipDetail?.id === data.id ? tooltipDetail.data : null;

  const requestTooltipDetail = useCallback(() => {
    if (tooltipDetail?.id === data.id || requestInFlightIdRef.current === data.id) return;
    requestInFlightIdRef.current = data.id;
    const requestedId = data.id;
    bridgeCall('game.get_military_data', { militaryId: requestedId, subscriptionId: '', subscribe: false })
      .then((response) => {
        if (requestInFlightIdRef.current === requestedId) {
          requestInFlightIdRef.current = null;
        }
        setTooltipDetail({ id: requestedId, data: response });
      })
      .catch(() => {
        if (requestInFlightIdRef.current === requestedId) {
          requestInFlightIdRef.current = null;
        }
      });
  }, [data.id, tooltipDetail]);

  const viewMilitary = useCallback(() => {
    dismissSharedTooltips();
    openSidebar?.('military', data.id);
  }, [data.id, openSidebar]);

  const content = useMemo(
    () => militaryTooltip(data, resolvedDetail, isNavy, Boolean(blockading), debugMode, true, viewMilitary),
    [blockading, data, debugMode, isNavy, resolvedDetail, viewMilitary],
  );

  return (
    <Tooltip
      content={content}
      open={open}
      position="top"
      delay={520}
      bubbleClassName={`tt-bubble--glance${passive ? ' tt-bubble--passive' : ''}`}
      onShowIntent={requestTooltipDetail}
      wrapperStyle={wrapperStyle}
    >
      {children}
    </Tooltip>
  );
}

export function NativeMilitaryGlanceTooltip({
  data,
  isNavy = false,
  anchor,
}: ArmyGlanceProps & { anchor: { x: number; y: number } }) {
  return (
    <MilitaryTooltip
      data={data}
      isNavy={isNavy}
      open
      wrapperStyle={{
        position: 'fixed',
        left: anchor.x,
        top: anchor.y,
        width: '5rem',
        height: '5rem',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <span aria-hidden="true" />
    </MilitaryTooltip>
  );
}

export default function ArmyGlance({ data, isNavy = false, enableHoverTooltip = true }: ArmyGlanceProps) {
  const strengthPct = strengthFraction(data);
  const moralePct = clampUnitFraction(data.morale);
  const moraleStateClass = data.retreating ? ' is-retreating' : moralePct < 0.5 ? ' is-low-morale' : '';
  const blockading = isNavy && (data as NavyGlanceData).blockading;
  const embarkedArmyCount = isNavy ? (data as NavyGlanceData).embarkedArmyCount ?? 0 : 0;
  const militaryTypeIcon = WebkilnAssetPath(isNavy ? NAVY_TYPE_ICON : ARMY_TYPE_ICON);
  const statusIcon = blockading ? '/assets/icons/I_Siege.png' : data.raiding ? '/assets/icons/I_RaidingTorch.png' : '';
  const attritionIcon = WebkilnAssetPath(data.attritionIcon || '/assets/icons/Terrain/I_Attrition.png');
  const visibleStatusCount = (statusIcon ? 1 : 0) + (data.attrition ? 1 : 0) + (embarkedArmyCount > 0 ? 1 : 0);
  const crownCount = 1 + visibleStatusCount;
  const atWar = isHostileGlance(data.faction.relation);
  const relationColour = relationDisplayColour(data.faction.relation);
  const typeMark = (
    <img
      className={`glance-military-type-mark${isNavy ? ' glance-military-type-mark--navy' : ' glance-military-type-mark--army'}`}
      src={militaryTypeIcon}
      alt=""
    />
  );

  const glance = data.garrisoned ? (
    <div
      className={`glance glance--military-garrison${isNavy ? ' glance--navy' : ''}${atWar ? ' glance--enemy is-at-war' : ''}${moraleStateClass}${data.selected ? ' is-selected' : ''}${data.targeted ? ' is-targeted' : ''}`}
      style={{
        '--relation-colour': relationColour,
        ...relationTextVars(data.faction.relation),
        '--relation-label-bg': relationLabelBackgroundColour(data.faction.relation),
        '--relation-border-top': relationBorderTopColour(data.faction.relation),
        '--garrison-stack-offset': `${(data.garrisonIndex ?? 0) * 1.3636}rem`,
      } as CSSProperties}
    >
      {atWar && <span className="glance-war-glow" aria-hidden="true" />}
      <span className="glance-military-garrison-hit-target" data-webkiln-anchor-hit aria-hidden="true" />
      <span className="glance-military-alert-flash" aria-hidden="true" />
      <span className="glance-garrison-selection" aria-hidden="true" />
      <span className="glance-garrison-target" aria-hidden="true" />
      <span className="glance-garrison-kind" aria-hidden="true">
        <GlanceFactionMark faction={data.faction} className="glance-garrison-faction-roundel" size="xs" />
      </span>
      <span className="glance-garrison-type" aria-hidden="true">
        {typeMark}
      </span>
      <img className="glance-garrison-tier" src={tierTexture(data.tier)} alt="" />
      <span className="glance-garrison-strength">{formatNumber(data.strength)}</span>
    </div>
  ) : (
    <div
      className={`glance glance--military${isNavy ? ' glance--navy' : ''}${atWar ? ' glance--enemy is-at-war' : ''}${moraleStateClass}${data.selected ? ' is-selected' : ''}${data.targeted ? ' is-targeted' : ''}`}
      style={{
        '--relation-colour': relationColour,
        ...relationTextVars(data.faction.relation),
        '--relation-bg': relationBackgroundColour(data.faction.relation),
        '--relation-target-bg': relationTargetBackgroundColour(data.faction.relation),
        '--relation-label-bg': relationLabelBackgroundColour(data.faction.relation),
        '--relation-border-top': relationBorderTopColour(data.faction.relation),
        '--relation-border-side': relationBorderSideColour(data.faction.relation),
        '--tier-colour': tierColour(data.tier),
        '--morale-colour': moraleColour(moralePct),
      } as CSSProperties}
    >
      {atWar && <span className="glance-war-glow" aria-hidden="true" />}
      <span className="glance-military-hit-target" data-webkiln-anchor-hit aria-hidden="true" />
      <span className="glance-military-alert-flash" aria-hidden="true" />
      <div className="glance-military-rings" aria-hidden="true">
        <div className="glance-ring-sprite glance-military-ring-stack" style={militaryRingStackStyle(data.faction.relation, strengthPct, moralePct)} />
        <GlanceRelationFrame relation={data.faction.relation} />
      </div>
      <span className="glance-military-target-indicator" aria-hidden="true" />

      <div className="glance-military-core">
        <GlanceFactionMark faction={data.faction} className="glance-military-faction-roundel" size="md" />
        <div className={`glance-military-kind${isNavy ? ' glance-military-kind--navy' : ' glance-military-kind--army'}`}>
          {typeMark}
        </div>
      </div>
      <div className={`glance-military-crown glance-military-crown--count-${String(crownCount)}`}>
        <img className="glance-military-tier glance-military-icon-socket" src={tierTexture(data.tier)} alt="" />
        {statusIcon && (
          <img className="glance-military-status glance-military-status--raid glance-military-icon-socket" src={statusIcon} alt="" />
        )}
        {data.attrition && (
          <img className="glance-military-status glance-military-status--attrition glance-military-icon-socket" src={attritionIcon} alt="" />
        )}
        {embarkedArmyCount > 0 && (
          <span className="glance-military-status glance-military-status--embarked glance-military-icon-socket" aria-label={webUIText('Military.EmbarkedArmies')}>
            <img className="glance-military-embarked-icon" src={WebkilnAssetPath('/assets/icons/I_ArmiesQuickButton.png')} alt="" />
            <span className="glance-military-embarked-count">{formatNumber(embarkedArmyCount)}</span>
          </span>
        )}
      </div>
      <div className="glance-military-strength">{formatNumber(data.strength)}</div>
    </div>
  );

  if (!enableHoverTooltip) {
    return glance;
  }

  return (
    <MilitaryTooltip data={data} isNavy={isNavy}>
      {glance}
    </MilitaryTooltip>
  );
}

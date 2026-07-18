import { useCallback, useState, type CSSProperties } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import type { ArmyGlanceData, NavyGlanceData } from './WorldGlanceTypes';
import { bridgeCall, type GetMilitaryDataResponse } from '../../bridge-types.generated.ts';
import { clampUnitFraction } from './glanceMath';
import { militaryRingStackStyle } from './ringAssets';
import { formatNumber, formatPercent } from '../../utils/numberFormat';
import { WebkilnAssetPath } from '../../utils/assets';
import { useGameState } from '../../context/GameContext';
import { readableFactionTextColour, relationDisplayLabel } from './WorldGlancePresentation';
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
  if (relation === 'own') return 'rgba(32, 20, 27, 0.82)';
  if (relation === 'ally') return 'rgba(18, 38, 28, 0.82)';
  if (relation === 'enemy') return 'rgba(46, 18, 17, 0.84)';
  return 'rgba(20, 20, 21, 0.76)';
}

function relationTargetBackgroundColour(relation: ArmyGlanceData['faction']['relation']): string {
  if (relation === 'own') return 'rgba(42, 24, 32, 0.88)';
  if (relation === 'ally') return 'rgba(20, 50, 35, 0.88)';
  if (relation === 'enemy') return 'rgba(58, 20, 18, 0.9)';
  return 'rgba(30, 29, 27, 0.86)';
}

function relationLabelBackgroundColour(relation: ArmyGlanceData['faction']['relation']): string {
  if (relation === 'own') return 'rgba(29, 15, 22, 0.9)';
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

function strengthFraction(data: { strength: number }): number {
  return clampUnitFraction(data.strength / STRENGTH_RING_REFERENCE);
}

function strengthValueLabel(data: GetMilitaryDataResponse): string {
  if (data.maxStrength > 0) {
    return webUIText("Auto.Return.componentsworldglancesArmyGlance.136.1", { Value1: formatNumber(data.strength), Value2: formatNumber(data.maxStrength) });
  }

  return formatNumber(data.strength);
}

function militaryTooltip(
  data: ArmyGlanceData | NavyGlanceData,
  detail: GetMilitaryDataResponse,
  isNavy: boolean,
  blockading: boolean,
  debugMode: boolean,
): TooltipContent {
  const statuses: string[] = [];
  if (detail.isRaiding) statuses.push('Raiding');
  if (data.attrition) statuses.push('Attrition');
  if (blockading) statuses.push('Blockading');
  const embarkedArmyCount = isNavy ? (data as NavyGlanceData).embarkedArmyCount ?? 0 : 0;

  const lines: TooltipLine[] = [
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.157.1'),
      get value() { return isNavy ? webUIText("Auto.Fix.PropExprTrue.componentsworldglancesArmyGlance.159.1") : webUIText("Auto.Fix.PropExprFalse.componentsworldglancesArmyGlance.159.1"); },
      valueIcon: isNavy ? '/assets/icons/I_Port.png' : '/assets/icons/I_Swords.png',
    },
    {
      label: webUIText('WorldGlances.Military.CurrentAction'),
      value: detail.currentOrder,
      valueIcon: blockading ? '/assets/icons/I_Siege.png' : detail.isRaiding ? '/assets/icons/I_RaidingTorch.png' : undefined,
    },
    {
      get label() { return isNavy ? webUIText("Auto.Fix.PropExprTrue.componentsworldglancesArmyGlance.163.1") : webUIText("Auto.Fix.PropExprFalse.componentsworldglancesArmyGlance.163.1"); },
      value: strengthValueLabel(detail),
      valueColor: strengthColour(strengthFraction(detail)),
      valueIcon: isNavy ? '/assets/icons/I_Port.png' : '/assets/icons/I_Swords.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.168.2'),
      value: formatPercent(detail.morale),
      valueColor: moraleColour(detail.morale / 100),
      valueIcon: '/assets/icons/I_Loyalty.png',
    },
    { label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.173.3'), value: detail.commanderName || webUIText('Common.NoCommander') },
    { label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.174.4'), value: data.faction.name, valueColor: readableFactionTextColour(data.faction.colour) },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.176.5'),
      get value() { return webUIText("Auto.Prop.componentsworldglancesArmyGlance.178.1", { Value1: String(data.tier) }); },
      valueIcon: tierTexture(data.tier),
    },
  ];

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
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.192.8'), value: `#${formatNumber(detail.debugShortId)}` });
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.193.9'), value: `#${formatNumber(data.faction.debugShortId ?? 0)}` });
    if (detail.commanderDebugShortId) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesArmyGlance.195.10'), value: `#${formatNumber(detail.commanderDebugShortId)}` });
    }
  }

  return {
    title: detail.name,
    get body() { return webUIText("Auto.Prop.componentsworldglancesArmyGlance.202.1", { Value1: webUIText(isNavy ? 'Common.Fleet' : 'Common.Army'), Value2: relationDisplayLabel(data.faction.relation), Name: data.faction.name }); },
    lines,
  };
}

interface ArmyGlanceProps {
  data: ArmyGlanceData | NavyGlanceData;
  isNavy?: boolean;
}

interface MilitaryTooltipProps extends ArmyGlanceProps {
  children: React.ReactNode;
  open?: boolean;
  passive?: boolean;
  wrapperStyle?: CSSProperties;
}

function MilitaryTooltip({ data, isNavy = false, children, open, passive = false, wrapperStyle }: MilitaryTooltipProps) {
  const { debugMode } = useGameState();
  const [tooltipDetail, setTooltipDetail] = useState<GetMilitaryDataResponse | null>(null);
  const blockading = isNavy && (data as NavyGlanceData).blockading;
  const requestTooltipDetail = useCallback(() => {
    setTooltipDetail(null);
    bridgeCall('game.get_military_data', { militaryId: data.id, subscriptionId: '', subscribe: false })
      .then((response) => {
        if (response.found) {
          setTooltipDetail(response);
        }
      })
      .catch(() => undefined);
  }, [data.id]);

  return (
    <Tooltip
      content={tooltipDetail ? militaryTooltip(data, tooltipDetail, isNavy, Boolean(blockading), debugMode) : null}
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
      passive
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

export default function ArmyGlance({ data, isNavy = false }: ArmyGlanceProps) {
  const strengthPct = strengthFraction(data);
  const moralePct = clampUnitFraction(data.morale);
  const blockading = isNavy && (data as NavyGlanceData).blockading;
  const embarkedArmyCount = isNavy ? (data as NavyGlanceData).embarkedArmyCount ?? 0 : 0;
  const militaryTypeIcon = WebkilnAssetPath(isNavy ? '/assets/icons/I_Anchor.png' : '/assets/icons/I_Swords.png');
  const statusIcon = blockading ? '/assets/icons/I_Siege.png' : data.raiding ? '/assets/icons/I_RaidingTorch.png' : '';
  const attritionIcon = WebkilnAssetPath(data.attritionIcon || '/assets/icons/Terrain/I_Attrition.png');
  const visibleStatusCount = (statusIcon ? 1 : 0) + (data.attrition ? 1 : 0) + (embarkedArmyCount > 0 ? 1 : 0);
  const crownCount = 1 + visibleStatusCount;

  if (data.garrisoned) {
    return (
      <MilitaryTooltip data={data} isNavy={isNavy}>
        <div
          className={`glance glance--military-garrison${isNavy ? ' glance--navy' : ''}${data.faction.relation === 'enemy' ? ' glance--enemy' : ''}${data.selected ? ' is-selected' : ''}${data.targeted ? ' is-targeted' : ''}`}
          data-webkiln-anchor-hit
          style={{
            '--faction-colour': data.faction.colour,
            '--relation-label-bg': relationLabelBackgroundColour(data.faction.relation),
            '--relation-border-top': relationBorderTopColour(data.faction.relation),
            '--garrison-stack-offset': `${(data.garrisonIndex ?? 0) * 1.3636}rem`,
          } as CSSProperties}
        >
          <span className="glance-garrison-selection" aria-hidden="true" />
          <span className="glance-garrison-target" aria-hidden="true" />
          <span className="glance-garrison-kind" aria-hidden="true">
            <img src={militaryTypeIcon} alt="" />
          </span>
          <img className="glance-garrison-tier" src={tierTexture(data.tier)} alt="" />
          <span className="glance-garrison-strength">{formatNumber(data.strength)}</span>
        </div>
      </MilitaryTooltip>
    );
  }

  return (
    <MilitaryTooltip data={data} isNavy={isNavy}>
      <div
        className={`glance glance--military${isNavy ? ' glance--navy' : ''}${data.faction.relation === 'enemy' ? ' glance--enemy' : ''}${data.selected ? ' is-selected' : ''}${data.targeted ? ' is-targeted' : ''}`}
        data-webkiln-anchor-hit
        style={{
          '--faction-colour': data.faction.colour,
          '--relation-bg': relationBackgroundColour(data.faction.relation),
          '--relation-target-bg': relationTargetBackgroundColour(data.faction.relation),
          '--relation-label-bg': relationLabelBackgroundColour(data.faction.relation),
          '--relation-border-top': relationBorderTopColour(data.faction.relation),
          '--relation-border-side': relationBorderSideColour(data.faction.relation),
          '--tier-colour': tierColour(data.tier),
          '--morale-colour': moraleColour(moralePct),
        } as CSSProperties}
      >
        <div className="glance-military-rings" aria-hidden="true">
          <div className="glance-ring-sprite glance-military-ring-stack" style={militaryRingStackStyle(data.faction.relation, strengthPct, moralePct)} />
          <GlanceRelationFrame relation={data.faction.relation} />
        </div>
        <span className="glance-military-target-indicator" aria-hidden="true" />

        <div className="glance-military-core">
          <span className="glance-military-faction-field" aria-hidden="true" />
          <div className={`glance-military-kind${isNavy ? ' glance-military-kind--navy' : ' glance-military-kind--army'}`}>
            <img className={`glance-military-type-mark${isNavy ? ' glance-military-type-mark--navy' : ' glance-military-type-mark--army'}`} src={militaryTypeIcon} alt="" />
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
    </MilitaryTooltip>
  );
}

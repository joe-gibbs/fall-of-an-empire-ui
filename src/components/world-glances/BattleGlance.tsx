import type { CSSProperties } from 'react';
import FactionRoundel from '../common/entities/FactionRoundel';
import { roundelDiplomacyProps } from '../../utils/factionBorder';
import Tooltip, { type TooltipContent } from '../common/tooltips/Tooltip';
import type { BattleGlanceData, BattleSideData } from './WorldGlanceTypes';
import { relationDisplayColour } from './WorldGlancePresentation';
import { clampUnitFraction } from './glanceMath';
import { formatCompactNumber, formatNumber, formatPercent } from '../../utils/numberFormat';
import type { GetWorldGlanceTooltipResponse } from '../../bridge-types.generated';
import { useWorldGlanceTooltip } from '../../bridge/app/useWorldGlanceTooltip';

import { webUIText } from '../../localization/WebUITextContext';

function battleTooltip(
  data: BattleGlanceData,
  attackerMorale: number,
  defenderMorale: number,
  attackerColour: string,
  defenderColour: string,
  detail: GetWorldGlanceTooltipResponse,
): TooltipContent {
  const lines: TooltipContent['lines'] = [
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesBattleGlance.37.1'),
      value: formatNumber(data.attacker.totalStrength),
      valueColor: attackerColour,
      valueIcon: '/assets/icons/I_Swords.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesBattleGlance.43.2'),
      value: formatPercent(attackerMorale * 100),
      valueColor: attackerColour,
      valueIcon: '/assets/icons/I_Loyalty.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesBattleGlance.49.3'),
      value: formatNumber(data.defender.totalStrength),
      valueColor: defenderColour,
      valueIcon: '/assets/icons/I_Swords.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesBattleGlance.55.4'),
      value: formatPercent(defenderMorale * 100),
      valueColor: defenderColour,
      valueIcon: '/assets/icons/I_Loyalty.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesBattleGlance.61.5'),
      get value() { return webUIText('Auto.Prop.componentsworldglancesBattleGlance.63.1', { Value1: formatNumber(detail.attackerCount), Value2: formatNumber(detail.defenderCount) }); },
    },
  ];

  return {
    title: webUIText('Auto.Prop.ComponentsWorldGlancesBattleGlance.79.9'),
    get body() { return webUIText('Auto.Prop.componentsworldglancesBattleGlance.81.1', { Value1: detail.attackerName, Value2: detail.defenderName }); },
    lines,
  };
}

interface BattleGlanceProps {
  data: BattleGlanceData;
}

function BattleFactionRoundel({ side }: { side: BattleSideData }) {
  const participant = side.participants[0];
  const faction = participant?.faction;

  return (
    <FactionRoundel
      factionId={faction?.id}
      colour={faction?.colour}
      secondaryColour={faction?.secondaryColour}
      cultureGroup={faction?.cultureGroup}
      emblem={faction?.emblem}
      name={faction?.name}
      size="xs"
      resolveFaction={false}
      {...roundelDiplomacyProps(faction)}
      className="battle-faction-roundel"
    />
  );
}

function BattleLossBurst({ side, alignment }: { side: BattleSideData; alignment: 'attacker' | 'defender' }) {
  if (side.lastLosses <= 0) {
    return null;
  }

  return (
    <>
      <span
        key={`${alignment}-loss-${side.totalStrength}-${side.lastLosses}`}
        className={`battle-loss-float battle-loss-float--${alignment} comparison-strength-value`}
        aria-hidden="true"
      >
        <span className="battle-loss-minus">-</span>
        <span className="battle-loss-number">{formatCompactNumber(side.lastLosses)}</span>
      </span>
      <span
        key={`${alignment}-hit-${side.totalStrength}-${side.lastLosses}`}
        className={`battle-hit-flash battle-hit-flash--${alignment}`}
        aria-hidden="true"
      />
    </>
  );
}

function BattleSideValues({
  side,
  morale,
  colour,
  alignment,
}: {
  side: BattleSideData;
  morale: number;
  colour: string;
  alignment: 'attacker' | 'defender';
}) {
  return (
    <div className={`battle-side-values battle-side-values--${alignment}`}>
      <span className={`battle-strength battle-strength--${alignment} comparison-strength-value`}>
        {formatCompactNumber(side.totalStrength)}
      </span>
      <div className={`battle-token-morale battle-token-morale--${alignment}`} aria-hidden="true">
        <span
          className="battle-token-morale-fill"
          style={{ transform: `scaleX(${morale})`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

export default function BattleGlance({ data }: BattleGlanceProps) {
  const { detail, request } = useWorldGlanceTooltip('battle', data.id);
  const attackerParticipant = data.attacker.participants[0];
  const defenderParticipant = data.defender.participants[0];
  const attColour = relationDisplayColour(attackerParticipant?.faction.relation ?? 'neutral');
  const defColour = relationDisplayColour(defenderParticipant?.faction.relation ?? 'neutral');
  const attackerMorale = clampUnitFraction(data.attacker.morale);
  const defenderMorale = clampUnitFraction(data.defender.morale);
  const total = data.attacker.totalStrength + data.defender.totalStrength;
  const attackerShare = total > 0 ? clampUnitFraction(data.attacker.totalStrength / total) : 0.5;

  return (
    <Tooltip
      content={detail ? battleTooltip(data, attackerMorale, defenderMorale, attColour, defColour, detail) : null}
      onShowIntent={request}
      position="top"
      delay={520}
      bubbleClassName="tt-bubble--glance"
    >
      <div
        className={`glance glance--battle${data.targeted ? ' is-targeted' : ''}`}
        style={{
          '--attacker-colour': attColour,
          '--defender-colour': defColour,
          '--attacker-strength-colour': attColour,
          '--defender-strength-colour': defColour,
        } as CSSProperties}
      >
        <div className="battle-token-frame" aria-hidden="true" />
        <div className="battle-token">
          <div className="battle-faction battle-faction--attacker">
            <BattleFactionRoundel side={data.attacker} />
            <BattleSideValues side={data.attacker} morale={attackerMorale} colour={attColour} alignment="attacker" />
            <BattleLossBurst side={data.attacker} alignment="attacker" />
          </div>
          <div className="battle-centre" aria-hidden="true">
            <img src="/assets/icons/I_Swords.png" alt={webUIText('Auto.Attr.ComponentsWorldGlancesBattleGlance.150.10')} className="battle-centre-swords" />
          </div>
          <div className="battle-faction battle-faction--defender">
            <BattleFactionRoundel side={data.defender} />
            <BattleSideValues side={data.defender} morale={defenderMorale} colour={defColour} alignment="defender" />
            <BattleLossBurst side={data.defender} alignment="defender" />
          </div>
        </div>

        <div className="battle-progress">
          <div className="battle-progress-att" style={{ transform: `scaleX(${attackerShare})`, backgroundColor: attColour }} aria-hidden="true" />
          <div className="battle-progress-def" style={{ transform: `scaleX(${1 - attackerShare})`, backgroundColor: defColour }} aria-hidden="true" />
        </div>
      </div>
    </Tooltip>
  );
}

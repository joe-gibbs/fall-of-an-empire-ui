import React from 'react';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import InteractionCard from '../../common/interactions/InteractionCard';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import UnitTooltip, { type UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import { unitTypeLabel } from '../../../utils/displayLabels';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { performSiegeCommandBridge } from '../../../bridge/settlements-economy/useSettlementBridge';
import { useGameActions } from '../../../context/GameContext';
import type { BesiegingArmyInfo, Settlement, SiegeInfo, SiegeProgressFactor, SiegeStateKind } from '../../../data/types';
import { useFaction, usePlayerFactionId, useSettlement } from '../../../data-source/index';
import { registerSidebar } from '../../../registry/index';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import SidebarToolbar from '../shared/SidebarToolbar';
import '../shared/Sidebar.css';
import './SiegeSidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

type SiegeCommandId = 'assault' | 'sallyOut' | 'pillage' | 'sack' | 'killUnbelievers' | 'restoreTown';
type PlayerRole = 'attacker' | 'defender' | 'observer';

interface SiegeForceRow {
  key: string;
  kind?: 'army' | 'navy' | 'garrison';
  name: string;
  commanderName: string;
  commanderId?: string;
  strength: number;
  maxStrength: number;
  siegePower?: number;
  morale?: number;
  unitCount: number;
  isLead?: boolean;
  icon?: string;
  unitTooltip?: UnitTooltipData;
}

interface SiegeViewModel {
  state: SiegeStateKind;
  stateLabel: string;
  subtitlePrefix: string;
  titleIcon: string;
  headerImage: string;
  settlementName: string;
  regionName: string;
  defenderFaction: string;
  defenderFactionId?: string;
  defenderFactionColour: string;
  defenderFactionSecondaryColour?: string;
  defenderFactionEmblem?: string;
  defenderFactionCultureGroup?: string;
  defenderFactionDiplomaticStatus?: string;
  defenderFactionSubjectSubtype?: string;
  defenderFactionIsPlayer?: boolean;
  defenderFactionIsRebel?: boolean;
  hostileFaction: string;
  hostileFactionId?: string;
  hostileFactionColour: string;
  hostileFactionSecondaryColour?: string;
  hostileFactionEmblem?: string;
  hostileFactionCultureGroup?: string;
  hostileFactionDiplomaticStatus?: string;
  hostileFactionSubjectSubtype?: string;
  hostileFactionIsPlayer?: boolean;
  hostileFactionIsRebel?: boolean;
  progress: number;
  estimatedDays: number;
  capitalOccupationDaysRemaining?: number;
  progressPerDay: number;
  progressFactors: SiegeProgressFactor[];
  siegePower: number;
  siegePowerWarning?: string;
  defenderStrength: number;
  attackerStrength: number;
  morale: number;
  canAssault: boolean;
  canSallyOut: boolean;
  canPillage: boolean;
  canSack: boolean;
  showKillUnbelievers: boolean;
  canKillUnbelievers: boolean;
  killUnbelieversUnavailableReason?: string;
  canRestoreTown: boolean;
  restoreTownUnavailableReason?: string;
  lootGold: number;
  sackGold: number;
  pillagePopulationKilled: number;
  sackPopulationKilled: number;
  killUnbelieversGold: number;
  killUnbelieversPopulation: number;
  restoreTownGold: number;
  restoreTownBuildingCondition: number;
  pillageCommanderHonourDread: number;
  pillageRulerHonourDread: number;
  sackCommanderHonourDread: number;
  sackRulerHonourDread: number;
  killUnbelieversCommanderHonourDread: number;
  killUnbelieversRulerHonourDread: number;
  restoreTownCommanderHonourDread: number;
  restoreTownRulerHonourDread: number;
  occupationCommanderIsRuler: boolean;
  attackers: SiegeForceRow[];
  defenders: SiegeForceRow[];
  dockedNavies: SiegeForceRow[];
}

const STATE_META: Record<SiegeStateKind, { labelKey: string; prefixKey: string; icon: string; image: string; modifier: string }> = {
  siege: {
    labelKey: 'Settlement.Siege.StateBesieged',
    prefixKey: 'Settlement.Siege.By',
    icon: '/assets/icons/I_Siege.png',
    image: '/assets/events/starvation-siege.png',
    modifier: 'siege',
  },
  blockade: {
    labelKey: 'Settlement.Siege.StateBlockaded',
    prefixKey: 'Settlement.Siege.By',
    icon: '/assets/icons/I_SiegePower.png',
    image: '/assets/events/naval-battle.png',
    modifier: 'blockade',
  },
  occupation: {
    labelKey: 'Settlement.Siege.StateOccupied',
    prefixKey: 'Settlement.Siege.HeldBy',
    icon: '/assets/icons/I_Locked.png',
    image: '/assets/events/siege-assault.png',
    modifier: 'occupation',
  },
};

const COMMAND_ICONS: Record<SiegeCommandId, string> = {
  assault: '/assets/icons/I_Swords.png',
  sallyOut: '/assets/icons/I_War.png',
  pillage: '/assets/icons/I_RaidingTorch.png',
  sack: '/assets/icons/I_Siege.png',
  killUnbelievers: '/assets/icons/I_KillUnbelievers.png',
  restoreTown: '/assets/icons/I_RestoreTown.png',
};

const COMMAND_BACKGROUNDS: Record<SiegeCommandId, string> = {
  assault: '/assets/events/siege-assault.png',
  sallyOut: '/assets/events/sally-forth.png',
  pillage: '/assets/events/interaction-pillage.png',
  sack: '/assets/events/sacked-city.png',
  killUnbelievers: '/assets/events/interaction-kill-unbelievers.png',
  restoreTown: '/assets/events/interaction-restore-town.png',
};

const COMMAND_LABEL_KEYS: Record<SiegeCommandId, string> = {
  assault: 'Settlement.Siege.Assault',
  sallyOut: 'Settlement.Siege.SallyOut',
  pillage: 'Settlement.Siege.Pillage',
  sack: 'Settlement.Siege.Sack',
  killUnbelievers: 'Settlement.Siege.KillUnbelievers',
  restoreTown: 'Settlement.Siege.RestoreTown',
};

const COMMAND_BODY_KEYS: Record<SiegeCommandId, string> = {
  assault: 'Settlement.Siege.AssaultBody',
  sallyOut: 'Settlement.Siege.SallyOutBody',
  pillage: 'Settlement.Siege.PillageBody',
  sack: 'Settlement.Siege.SackBody',
  killUnbelievers: 'Settlement.Siege.KillUnbelieversBody',
  restoreTown: 'Settlement.Siege.RestoreTownBody',
};

function armyRow(army: BesiegingArmyInfo, index: number): SiegeForceRow {
  return {
    key: `attacker-${army.kind}-${army.debugShortId ?? index}`,
    kind: army.kind,
    name: army.name,
    commanderName: army.commanderName || webUIText('Settlement.Siege.NoCommander'),
    commanderId: army.commanderId,
    strength: army.strength,
    maxStrength: army.maxStrength,
    siegePower: army.siegePower,
    morale: army.morale,
    unitCount: army.unitCount,
    isLead: army.isLead,
  };
}

function defenderRows(settlement: Settlement, siege: SiegeInfo): SiegeForceRow[] {
  const militaries = siege.defendingMilitaries.map((military, index) => ({
    key: `defender-${military.kind}-${military.debugShortId ?? index}`,
    kind: military.kind,
    name: military.name,
    commanderName: military.commanderName || webUIText('Settlement.Siege.NoCommander'),
    commanderId: military.commanderId,
    strength: military.strength,
    maxStrength: military.maxStrength,
    morale: military.morale,
    unitCount: military.unitCount,
  }));

  const groupedGarrison = new Map<string, SiegeForceRow>();
  settlement.garrison.forEach((unit, index) => {
    const groupKey = `${unit.name}\u0000${unit.type}\u0000${unit.portrait}`;
    const existing = groupedGarrison.get(groupKey);
    if (existing) {
      existing.strength += unit.strength;
      existing.maxStrength += unit.maxStrength;
      existing.unitCount += 1;
      if (existing.unitTooltip) {
        existing.unitTooltip.strength = existing.strength;
        existing.unitTooltip.maxStrength = existing.maxStrength;
        existing.unitTooltip.count = existing.unitCount;
      }
      return;
    }

    groupedGarrison.set(groupKey, {
      key: `garrison-${index}`,
      kind: 'garrison',
      name: unit.name,
      commanderName: unit.type,
      strength: unit.strength,
      maxStrength: unit.maxStrength,
      unitCount: 1,
      icon: unit.typeIcon || '/assets/icons/Doctrines/I_Doctrine_Garrison.png',
      unitTooltip: {
        name: unit.name,
        description: unit.description,
        portrait: unit.portrait,
        typeLabel: unitTypeLabel(unit.type),
        typeIcon: unit.typeIcon,
        tier: unit.tier,
        culture: unit.culture,
        sourceBuilding: unit.sourceBuilding,
        strength: unit.strength,
        maxStrength: unit.maxStrength,
        upkeep: unit.upkeep,
        foodConsumption: unit.foodConsumption,
        speed: unit.speed,
        attackSpeed: unit.attackSpeed,
        veterancy: unit.veterancy,
        damage: { pierce: unit.pierceDmg, crush: unit.crushDmg, slash: unit.slashDmg },
        armour: { pierce: unit.pierceArm, crush: unit.crushArm, slash: unit.slashArm },
        count: 1,
      },
    });
  });

  return [...militaries, ...groupedGarrison.values()];
}

function sumStrength(rows: SiegeForceRow[]): number {
  return rows.reduce((sum, row) => sum + row.strength, 0);
}

function averageMorale(rows: SiegeForceRow[]): number {
  const moraleRows = rows.filter(row => row.morale !== undefined);
  if (moraleRows.length === 0) return 0;
  return moraleRows.reduce((sum, row) => sum + (row.morale ?? 0), 0) / moraleRows.length;
}

function formatDayCount(days: number): string {
  if (days < 0) return webUIText('Settlement.Siege.NoProgress');
  const rounded = Math.round(days);
  return webUIText('Common.DayCount', {
    Days: formatNumber(rounded),
    Unit: webUIText(rounded === 1 ? 'Common.Day' : 'Common.Days'),
  });
}

function formatDailyProgress(value: number): string {
  const fractionDigits = value > 0 && value < 1 ? 1 : 0;
  return webUIText('Settlement.Siege.DailyProgressValue', {
    Value: formatPercent(value, fractionDigits),
  });
}

function formatFactorValue(factor: SiegeProgressFactor): string {
  if (factor.kind === 'multiplier') {
    return webUIText('Settlement.Siege.MultiplierValue', {
      Value: formatNumber(factor.value, { maximumFractionDigits: 2 }),
    });
  }
  if (factor.kind === 'percent') return formatPercent(factor.value);
  if (factor.kind === 'power') return formatSignedNumber(factor.value);
  return formatNumber(factor.value, { maximumFractionDigits: 1 });
}

function buildViewModel(settlement: Settlement): SiegeViewModel | null {
  const siege: SiegeInfo | undefined = settlement?.siege;
  if (!siege) return null;

  const state: SiegeStateKind = siege.state;
  const meta = STATE_META[state];
  const attackers = siege.besiegingArmies.map(armyRow);
  const defendingForces = defenderRows(settlement, siege);
  const defenders = defendingForces.filter(row => row.kind !== 'navy');
  const dockedNavies = defendingForces.filter(row => row.kind === 'navy');
  const defenderStrength = siege.totalDefenderStrength;
  const attackerStrength = sumStrength(attackers);
  const attackerMorale = averageMorale(attackers);

  return {
    state,
    stateLabel: siege?.alsoBlockaded && state === 'siege'
      ? webUIText('Settlement.Siege.StateBesiegedBlockaded')
      : webUIText(meta.labelKey),
    subtitlePrefix: webUIText(meta.prefixKey),
    titleIcon: meta.icon,
    headerImage: meta.image,
    settlementName: settlement.name,
    regionName: settlement.region,
    defenderFaction: settlement.faction,
    defenderFactionId: settlement.factionId,
    defenderFactionColour: settlement.factionColour,
    defenderFactionSecondaryColour: settlement.factionSecondaryColour,
    defenderFactionEmblem: settlement.factionEmblem,
    defenderFactionCultureGroup: settlement.factionCultureGroup,
    defenderFactionDiplomaticStatus: settlement.factionDiplomaticStatus,
    defenderFactionSubjectSubtype: settlement.factionSubjectSubtype,
    defenderFactionIsPlayer: settlement.factionIsPlayer,
    defenderFactionIsRebel: settlement.factionIsRebel,
    hostileFaction: siege.hostileFaction,
    hostileFactionId: siege.hostileFactionId,
    hostileFactionColour: siege.hostileFactionColour ?? '#8f2424',
    hostileFactionSecondaryColour: siege.hostileFactionSecondaryColour,
    hostileFactionEmblem: siege.hostileFactionEmblem,
    hostileFactionCultureGroup: siege.hostileFactionCultureGroup,
    hostileFactionDiplomaticStatus: siege.hostileFactionDiplomaticStatus,
    hostileFactionSubjectSubtype: siege.hostileFactionSubjectSubtype,
    hostileFactionIsPlayer: siege.hostileFactionIsPlayer,
    hostileFactionIsRebel: siege.hostileFactionIsRebel,
    progress: siege.progress,
    estimatedDays: siege.estimatedDays,
    capitalOccupationDaysRemaining: siege.capitalOccupationDaysRemaining,
    progressPerDay: siege.progressPerDay,
    progressFactors: siege.progressFactors,
    siegePower: siege.totalSiegePower,
    siegePowerWarning: siege.siegePowerWarning,
    defenderStrength,
    attackerStrength,
    morale: attackerMorale,
    canAssault: siege.canAssault,
    canSallyOut: siege.canSallyOut,
    canPillage: siege.canPillage,
    canSack: siege.canSack,
    showKillUnbelievers: siege.showKillUnbelievers,
    canKillUnbelievers: siege.canKillUnbelievers,
    killUnbelieversUnavailableReason: siege.killUnbelieversUnavailableReason,
    canRestoreTown: siege.canRestoreTown,
    restoreTownUnavailableReason: siege.restoreTownUnavailableReason,
    lootGold: siege.pillageGold,
    sackGold: siege.sackGold,
    pillagePopulationKilled: siege.pillagePopulationKilled,
    sackPopulationKilled: siege.sackPopulationKilled,
    killUnbelieversGold: siege.killUnbelieversGold,
    killUnbelieversPopulation: siege.killUnbelieversPopulation,
    restoreTownGold: siege.restoreTownGold,
    restoreTownBuildingCondition: siege.restoreTownBuildingCondition,
    pillageCommanderHonourDread: siege.pillageCommanderHonourDread,
    pillageRulerHonourDread: siege.pillageRulerHonourDread,
    sackCommanderHonourDread: siege.sackCommanderHonourDread,
    sackRulerHonourDread: siege.sackRulerHonourDread,
    killUnbelieversCommanderHonourDread: siege.killUnbelieversCommanderHonourDread,
    killUnbelieversRulerHonourDread: siege.killUnbelieversRulerHonourDread,
    restoreTownCommanderHonourDread: siege.restoreTownCommanderHonourDread,
    restoreTownRulerHonourDread: siege.restoreTownRulerHonourDread,
    occupationCommanderIsRuler: siege.occupationCommanderIsRuler,
    attackers,
    defenders,
    dockedNavies,
  };
}

function determinePlayerRole(view: SiegeViewModel, playerFactionId: string | null): PlayerRole {
  if (!playerFactionId) return 'observer';
  if (view.hostileFactionId && view.hostileFactionId === playerFactionId) return 'attacker';
  if (view.defenderFactionId && view.defenderFactionId === playerFactionId) return 'defender';
  return 'observer';
}

function commandsForRole(role: PlayerRole, view: SiegeViewModel): SiegeCommandId[] {
  if (role === 'attacker') {
    if (view.state === 'occupation') {
      const commands: SiegeCommandId[] = ['pillage', 'sack'];
      if (view.showKillUnbelievers) commands.push('killUnbelievers');
      commands.push('restoreTown');
      return commands;
    }
    return ['assault'];
  }
  if (role === 'defender') {
    if (view.state === 'siege' || view.state === 'blockade') return ['sallyOut'];
    return [];
  }
  return [];
}

function commandDisabledReason(command: SiegeCommandId, view: SiegeViewModel): string | undefined {
  if (command === 'assault' && !view.canAssault) return webUIText('Settlement.Siege.AssaultUnavailable');
  if (command === 'sallyOut' && !view.canSallyOut) return webUIText('Settlement.Siege.SallyOutUnavailable');
  if (command === 'pillage' && !view.canPillage) return webUIText('Settlement.Siege.OccupationOnly');
  if (command === 'sack' && !view.canSack) return webUIText('Settlement.Siege.OccupationOnly');
  if (command === 'killUnbelievers' && !view.canKillUnbelievers) {
    return view.killUnbelieversUnavailableReason || webUIText('Settlement.Siege.OccupationOnly');
  }
  if (command === 'restoreTown' && !view.canRestoreTown) {
    return view.restoreTownUnavailableReason || webUIText('Settlement.Siege.OccupationOnly');
  }
  return undefined;
}

function honourDreadLines(
  commanderDelta: number,
  rulerDelta: number,
  commanderIsRuler: boolean,
): TooltipLine[] {
  const commanderIsDread = commanderDelta < 0;
  const lines: TooltipLine[] = [{
    label: commanderIsRuler
      ? webUIText(commanderIsDread ? 'Settlement.Siege.Dread' : 'Settlement.Siege.Honour')
      : webUIText(commanderIsDread ? 'Settlement.Siege.CommanderDread' : 'Settlement.Siege.CommanderHonour'),
    value: formatNumber(Math.abs(commanderDelta), { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
    valueIcon: commanderIsDread ? '/assets/icons/I_Dread.png' : '/assets/icons/I_Honor.png',
  }];
  if (!commanderIsRuler) {
    const rulerIsDread = rulerDelta < 0;
    lines.push({
      label: webUIText(rulerIsDread ? 'Settlement.Siege.RulerDread' : 'Settlement.Siege.RulerHonour'),
      value: formatNumber(Math.abs(rulerDelta), { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
      valueIcon: rulerIsDread ? '/assets/icons/I_Dread.png' : '/assets/icons/I_Honor.png',
    });
  }
  return lines;
}

function commandTooltip(command: SiegeCommandId, view: SiegeViewModel): TooltipContent {
  const disabledReason = commandDisabledReason(command, view);
  const lines: TooltipLine[] = [];
  if (command === 'pillage') {
    lines.push({
      label: webUIText('Settlement.Siege.GoldGained'),
      value: formatNumber(view.lootGold),
      valueIcon: '/assets/icons/I_Coins.png',
    });
    lines.push({
      label: webUIText('Settlement.Siege.PeopleKilled'),
      value: formatNumber(view.pillagePopulationKilled),
      valueIcon: '/assets/icons/I_Population.png',
    });
    lines.push(...honourDreadLines(
      view.pillageCommanderHonourDread,
      view.pillageRulerHonourDread,
      view.occupationCommanderIsRuler,
    ));
  } else if (command === 'sack') {
    lines.push({
      label: webUIText('Settlement.Siege.GoldGained'),
      value: formatNumber(view.sackGold),
      valueIcon: '/assets/icons/I_Coins.png',
    });
    lines.push({
      label: webUIText('Settlement.Siege.PeopleKilled'),
      value: formatNumber(view.sackPopulationKilled),
      valueIcon: '/assets/icons/I_Population.png',
    });
    lines.push(...honourDreadLines(
      view.sackCommanderHonourDread,
      view.sackRulerHonourDread,
      view.occupationCommanderIsRuler,
    ));
  } else if (command === 'killUnbelievers') {
    lines.push({
      label: webUIText('Settlement.Siege.GoldGained'),
      value: formatNumber(view.killUnbelieversGold),
      valueIcon: '/assets/icons/I_Coins.png',
    });
    lines.push({
      label: webUIText('Settlement.Siege.UnbelieversKilled'),
      value: formatNumber(view.killUnbelieversPopulation),
      valueIcon: '/assets/icons/I_KillUnbelievers.png',
    });
    lines.push(...honourDreadLines(
      view.killUnbelieversCommanderHonourDread,
      view.killUnbelieversRulerHonourDread,
      view.occupationCommanderIsRuler,
    ));
  } else if (command === 'restoreTown') {
    lines.push({
      label: webUIText('Settlement.Siege.GoldSpent'),
      value: formatNumber(view.restoreTownGold),
      valueIcon: '/assets/icons/I_Coins.png',
    });
    lines.push({
      label: webUIText('Settlement.Siege.BuildingsRepaired'),
      value: formatSignedNumber(view.restoreTownBuildingCondition),
      valueIcon: '/assets/icons/I_RestoreTown.png',
    });
    lines.push(...honourDreadLines(
      view.restoreTownCommanderHonourDread,
      view.restoreTownRulerHonourDread,
      view.occupationCommanderIsRuler,
    ));
  }
  return {
    title: webUIText(COMMAND_LABEL_KEYS[command]),
    body: disabledReason ?? webUIText(COMMAND_BODY_KEYS[command]),
    lines: lines.length > 0 ? lines : undefined,
  };
}

function SiegeOverview({ view, daysValue }: { view: SiegeViewModel; daysValue: string }) {
  const lead = view.attackers.find(row => row.isLead) ?? view.attackers[0];
  const leadCommander = lead?.commanderName && lead.commanderName !== webUIText('Settlement.Siege.NoCommander')
    ? lead.commanderName
    : '';
  const visibleFactors = view.progressFactors.slice(0, 4);

  return (
    <div className="siege-overview">
      <div className="siege-overview-lead">
        <img src={view.titleIcon} alt="" className="siege-overview-lead-icon" />
        <div className="siege-overview-lead-copy">
          <span className="siege-overview-label">
            <WebUIText textKey={view.state === 'blockade' ? 'Settlement.Siege.BlockadingForce' : 'Settlement.Siege.BesiegingForce'} />
          </span>
          <span className="siege-overview-title">{lead?.name ?? view.hostileFaction}</span>
          <span className="siege-overview-meta">
            {leadCommander || view.hostileFaction}
          </span>
        </div>
        {!view.siegePowerWarning && (
          <div className="siege-overview-power">
            <span className="siege-overview-power-value">{formatNumber(view.siegePower)}</span>
            <span className="siege-overview-power-label"><WebUIText textKey="Settlement.Siege.SiegePower" /></span>
          </div>
        )}
      </div>

      <div className="siege-summary-row">
        <Tooltip content={{ title: webUIText('Settlement.Siege.DefenderStrength'), body: webUIText('Settlement.Siege.DefenderStrengthBody') }} position="bottom" delay={150}>
          <div className="siege-summary-item">
            <span className="siege-summary-label"><WebUIText textKey="Settlement.Siege.DefenderStrength" /></span>
            <span className="siege-summary-value">{formatNumber(view.defenderStrength)}</span>
          </div>
        </Tooltip>
        <Tooltip content={{ title: webUIText('Settlement.Siege.DaysToFall'), body: webUIText('Settlement.Siege.DaysToFallBody') }} position="bottom" delay={150}>
          <div className="siege-summary-item">
            <span className="siege-summary-label"><WebUIText textKey="Settlement.Siege.DaysToFall" /></span>
            <span className="siege-summary-value">{daysValue}</span>
          </div>
        </Tooltip>
        <Tooltip content={{ title: webUIText('Settlement.Siege.ProgressPerDay'), body: webUIText('Settlement.Siege.ProgressPerDayBody') }} position="bottom" delay={150}>
          <div className="siege-summary-item">
            <span className="siege-summary-label"><WebUIText textKey="Settlement.Siege.ProgressPerDay" /></span>
            <span className="siege-summary-value">{formatDailyProgress(view.progressPerDay)}</span>
          </div>
        </Tooltip>
      </div>

      <div className="siege-factor-list">
        <div className="siege-compact-heading"><WebUIText textKey="Settlement.Siege.ProgressFactors" /></div>
        {visibleFactors.length > 0
          ? visibleFactors.map((factor, index) => {
            const row = (
              <div className="siege-factor-row">
                <span className="siege-factor-name">{factor.name}</span>
                <span className="siege-factor-value">{formatFactorValue(factor)}</span>
              </div>
            );
            return view.state === 'blockade' && factor.kind === 'percent'
              ? (
                <Tooltip
                  key={`${factor.name}-${index}`}
                  content={{ title: factor.name, body: webUIText('Settlement.Siege.BlockadePressureBody') }}
                  position="bottom"
                  delay={150}
                  wrapperClassName="siege-factor-tooltip"
                >
                  {row}
                </Tooltip>
              )
              : <React.Fragment key={`${factor.name}-${index}`}>{row}</React.Fragment>;
          })
          : <div className="siege-empty-row"><WebUIText textKey="Settlement.Siege.NoProgressFactors" /></div>}
      </div>
    </div>
  );
}

function ForceRow({ row }: { row: SiegeForceRow }) {
  const strengthPercent = row.maxStrength > 0 ? (row.strength / row.maxStrength) * 100 : 0;
  const portrait = row.icon ? (
    <img src={row.icon} alt="" className="siege-force-icon" />
  ) : (
    <Portrait
      personId={row.commanderId}
      name={row.commanderName || row.name}
      size="row"
      shape="circle"
      showBorder
      borderTier={row.isLead ? 'gold' : 'bronze'}
    />
  );

  const rowBody = (
    <div className={`siege-force-row${row.isLead ? ' siege-force-row--lead' : ''}`}>
      {row.commanderId ? (
        <PersonTooltip characterId={row.commanderId} position="right" delay={200}>
          {portrait}
        </PersonTooltip>
      ) : portrait}
      <div className="siege-force-copy">
        <span className="siege-force-name">{row.name}</span>
        <span className="siege-force-commander">{row.commanderName}</span>
      </div>
      <div className="siege-force-stats">
        <span className="siege-force-strength">{formatNumber(row.strength)}</span>
        <PaintedBar percent={strengthPercent} color={strengthPercent >= 50 ? 'green' : 'red'} className="siege-force-bar" />
        <span className="siege-force-meta">
          {formatNumber(row.unitCount)} {webUIText(row.unitCount === 1 ? 'Common.Unit' : 'Common.Units')}
          {row.siegePower !== undefined ? ` | ${formatNumber(row.siegePower)}` : ''}
          {row.morale !== undefined ? ` | ${formatPercent(row.morale)}` : ''}
        </span>
      </div>
    </div>
  );

  if (!row.unitTooltip) return rowBody;

  return (
    <Tooltip content={{ afterLines: <UnitTooltip data={row.unitTooltip} /> }} position="right" delay={200}>
      {rowBody}
    </Tooltip>
  );
}

function ForceGroup({
  titleKey,
  totalStrength,
  rows,
  emptyKey,
}: {
  titleKey: string;
  totalStrength: number;
  rows: SiegeForceRow[];
  emptyKey: string;
}) {
  return (
    <>
      <div className="siege-force-group-head">
        <SectionHeading title={webUIText(titleKey)} variant="ornate" />
        <span className="siege-force-group-total">{formatNumber(totalStrength)}</span>
      </div>
      <div className="siege-force-group">
        {rows.length > 0
          ? rows.map(row => <ForceRow key={row.key} row={row} />)
          : <div className="siege-empty-row"><WebUIText textKey={emptyKey} /></div>}
      </div>
    </>
  );
}

function SiegeSidebar({ settlement, onClose }: { settlement: Settlement; onClose: () => void }) {
  const { openSidebar } = useGameActions();
  const playerFactionId = usePlayerFactionId();
  const playerFaction = useFaction(playerFactionId);
  const [pendingCommand, setPendingCommand] = React.useState<SiegeCommandId | null>(null);

  React.useEffect(() => {
    setPendingCommand(null);
  }, [settlement.id]);

  const view = buildViewModel(settlement);
  if (!view) return null;

  const stateModifier = STATE_META[view.state].modifier;
  const role = determinePlayerRole(view, playerFactionId);
  const commands = commandsForRole(role, view);
  const isOccupied = view.state === 'occupation';
  const hasCapitalDeadline = isOccupied && view.capitalOccupationDaysRemaining !== undefined;
  const daysValue = hasCapitalDeadline
    ? formatDayCount(view.capitalOccupationDaysRemaining ?? 0)
    : isOccupied
      ? webUIText('Settlement.Siege.Fallen')
    : formatDayCount(view.estimatedDays);
  const progressPercent = hasCapitalDeadline
    ? Math.max(0, Math.min(100, (365 - (view.capitalOccupationDaysRemaining ?? 365)) / 365 * 100))
    : isOccupied ? 100 : view.progress;
  const showForceDetails = !isOccupied && (view.attackers.length > 1 || view.defenders.length > 0);
  const handleCommand = (command: SiegeCommandId) => {
    if (pendingCommand !== null) return;

    setPendingCommand(command);
    void performSiegeCommandBridge(settlement.id, command)
      .catch(acknowledgeBridgeFailure)
      .finally(() => {
        setPendingCommand(current => current === command ? null : current);
      });
  };

  return (
    <div className={`sidebar sidebar--left sidebar--visible siege-sidebar siege-sidebar--${stateModifier}`}>
      <SidebarToolbar
        navButtons={[
          {
            icon: '/assets/icons/I_NavPrevious.png',
            tooltip: webUIText('Settlement.Siege.BackToSettlement'),
            onClick: () => {
              if (settlement) openSidebar('settlement', settlement.id);
            },
            disabled: !settlement,
          },
        ]}
        actionButtons={[
          {
            icon: '/assets/icons/I_Diplomacy.png',
            tooltip: webUIText('Settlement.Siege.OpenEnemyDiplomacy'),
            onClick: () => {
              if (view.hostileFactionId) openSidebar('diplomacy', view.hostileFactionId);
            },
            disabled: !view.hostileFactionId,
          },
        ]}
        onClose={onClose}
      />

      <div className="siege-header">
        <img src={view.headerImage} alt="" className="siege-header-bg" />
        <div className="siege-header-scrim">
          <div className="siege-header-name-row">
            <FactionTooltip factionId={view.defenderFactionId} factionName={view.defenderFaction} position="bottom" delay={200}>
              <FactionRoundel
                factionId={view.defenderFactionId}
                colour={view.defenderFactionColour}
                secondaryColour={view.defenderFactionSecondaryColour}
                emblem={view.defenderFactionEmblem}
                cultureGroup={view.defenderFactionCultureGroup}
                name={view.defenderFaction}
                size="md"
                className="siege-header-roundel"
                diplomaticStatus={view.defenderFactionDiplomaticStatus}
                subjectSubtype={view.defenderFactionSubjectSubtype}
                isPlayer={view.defenderFactionIsPlayer}
                isRebel={view.defenderFactionIsRebel}
                onClick={view.defenderFactionId ? () => openSidebar('diplomacy', view.defenderFactionId!) : undefined}
              />
            </FactionTooltip>
            <div className="siege-header-titles">
              <span className="siege-header-title">{view.settlementName}</span>
              <span className="siege-header-region">{view.regionName}</span>
            </div>
          </div>
          <div className="siege-header-state-row">
            <img src={view.titleIcon} alt="" className="siege-header-state-icon" />
            <div className="siege-header-state-copy">
              <span className="siege-header-state-label">{view.stateLabel}</span>
              <span className="siege-header-state-by">{view.subtitlePrefix}</span>
              <FactionTooltip factionId={view.hostileFactionId} factionName={view.hostileFaction} position="bottom" delay={200}>
                <FactionRoundel
                  factionId={view.hostileFactionId}
                  colour={view.hostileFactionColour}
                  secondaryColour={view.hostileFactionSecondaryColour}
                  emblem={view.hostileFactionEmblem}
                  cultureGroup={view.hostileFactionCultureGroup}
                  name={view.hostileFaction}
                  size="xs"
                  className="siege-header-hostile-roundel"
                  diplomaticStatus={view.hostileFactionDiplomaticStatus}
                  subjectSubtype={view.hostileFactionSubjectSubtype}
                  isPlayer={view.hostileFactionIsPlayer}
                  isRebel={view.hostileFactionIsRebel}
                  onClick={view.hostileFactionId ? () => openSidebar('diplomacy', view.hostileFactionId!) : undefined}
                />
              </FactionTooltip>
              <span className="siege-header-hostile-name">{view.hostileFaction}</span>
            </div>
          </div>
        </div>
      </div>

      <StyledScrollArea className="sidebar-content sidebar-content--textured siege-content" variant="inline">
        <div className="siege-progress-strip">
          <div className="siege-progress-head">
            <span className="siege-progress-label">
              <WebUIText textKey={hasCapitalDeadline
                ? 'Settlement.Siege.RebelTakeoverProgress'
                : view.state === 'blockade' ? 'Settlement.Siege.BlockadeProgress' : 'Settlement.Siege.Progress'} />
            </span>
            {!isOccupied && <span className="siege-progress-value">{formatPercent(view.progress)}</span>}
            <span className={`siege-progress-days${isOccupied ? ' siege-progress-days--fallen' : ''}`}>{daysValue}</span>
          </div>
          <PaintedBar percent={progressPercent} color={isOccupied ? 'gold' : 'red'} />
        </div>

        {hasCapitalDeadline && (
          <div className="game-notice game-notice--danger game-notice--compact">
            {webUIText('Settlement.Siege.CapitalDeadlineBody', {
              Days: formatNumber(view.capitalOccupationDaysRemaining ?? 0),
              Government: playerFaction?.governmentTypeName,
            })}
          </div>
        )}

        <SiegeOverview view={view} daysValue={daysValue} />
        {view.siegePowerWarning && (
          <div className="game-notice game-notice--danger game-notice--compact siege-power-warning">
            {view.siegePowerWarning}
          </div>
        )}

        {commands.length > 0 && (
          <div className="siege-actions-section">
            <div className="siege-compact-heading"><WebUIText textKey="Settlement.Siege.Commands" /></div>
            <div className="siege-actions" data-tutorial-target={isOccupied ? 'SiegeOccupationCommands' : undefined}>
              {commands.map(command => {
                const disabled = pendingCommand !== null || !!commandDisabledReason(command, view);
                return (
                  <Tooltip key={command} content={commandTooltip(command, view)} position="left" delay={200}>
                    <div className={`siege-cmd siege-cmd--${command}`}>
                      <InteractionCard
                        title={webUIText(COMMAND_LABEL_KEYS[command])}
                        description={webUIText(COMMAND_BODY_KEYS[command])}
                        image={COMMAND_ICONS[command]}
                        bgImage={COMMAND_BACKGROUNDS[command]}
                        onClick={disabled ? undefined : () => handleCommand(command)}
                        tutorialTarget={command === 'pillage' ? 'SiegePillageButton' : command === 'sack' ? 'SiegeSackButton' : undefined}
                      />
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {showForceDetails && (
          <>
            {view.attackers.length > 1 && (
              <ForceGroup
                titleKey={view.state === 'blockade' ? 'Settlement.Siege.BlockadingForce' : 'Settlement.Siege.BesiegingForce'}
                totalStrength={sumStrength(view.attackers)}
                rows={view.attackers}
                emptyKey="Settlement.Siege.NoBesiegingArmies"
              />
            )}

            {view.defenders.length > 0 && (
              <ForceGroup
                titleKey="Common.Defender"
                totalStrength={view.defenderStrength}
                rows={view.defenders}
                emptyKey="Settlement.Siege.NoVisibleDefenders"
              />
            )}
            {view.dockedNavies.length > 0 && (
              <ForceGroup
                titleKey="Auto.Prop.ComponentsWorldGlancesPortGlance.59.6"
                totalStrength={sumStrength(view.dockedNavies)}
                rows={view.dockedNavies}
                emptyKey="Settlement.Siege.NoVisibleDefenders"
              />
            )}
          </>
        )}
      </StyledScrollArea>
    </div>
  );
}

function SiegeSidebarSlot({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const settlement = useSettlement(sidebarId);
  if (!settlement || !settlement.siege) return null;
  return <SiegeSidebar settlement={settlement} onClose={onClose} />;
}

registerSidebar({
  id: 'siege',
  side: 'left',
  component: SiegeSidebarSlot,
  advisorTopic: 'settlementSidebar',
  preloadAssets: [
    '/assets/events/starvation-siege.png',
    '/assets/events/siege-assault.png',
    '/assets/events/sally-forth.png',
    '/assets/events/interaction-pillage.png',
    '/assets/events/sacked-city.png',
    '/assets/events/naval-battle.png',
    '/assets/ui/SiegePanel.png',
    '/assets/icons/I_Siege.png',
    '/assets/icons/I_SiegePower.png',
    '/assets/icons/I_Fortification.png',
    '/assets/icons/I_Speed.png',
    '/assets/icons/Siege/pillage.png',
    '/assets/icons/Siege/sack.png',
  ],
});

export default React.memo(SiegeSidebar);

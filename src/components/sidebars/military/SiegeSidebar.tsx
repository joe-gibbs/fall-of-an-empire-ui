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
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { performSiegeCommandBridge } from '../../../bridge/settlements-economy/useSettlementBridge';
import { useGameActions } from '../../../context/GameContext';
import type { BesiegingArmyInfo, Settlement, SiegeInfo, SiegeProgressFactor, SiegeStateKind } from '../../../data/types';
import { usePlayerFactionId, useSettlement } from '../../../data-source/index';
import { registerSidebar } from '../../../registry/index';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import SidebarToolbar from '../shared/SidebarToolbar';
import '../shared/Sidebar.css';
import './SiegeSidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

type SiegeCommandId = 'assault' | 'sallyOut' | 'pillage' | 'sack';
type PlayerRole = 'attacker' | 'defender' | 'observer';

interface SiegeForceRow {
  key: string;
  kind?: 'army' | 'navy';
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
  hostileFaction: string;
  hostileFactionId?: string;
  hostileFactionColour: string;
  hostileFactionSecondaryColour?: string;
  hostileFactionEmblem?: string;
  hostileFactionCultureGroup?: string;
  progress: number;
  estimatedDays: number;
  capitalOccupationDaysRemaining?: number;
  progressPerDay: number;
  progressFactors: SiegeProgressFactor[];
  siegePower: number;
  defenderStrength: number;
  attackerStrength: number;
  morale: number;
  canAssault: boolean;
  canSallyOut: boolean;
  canPillage: boolean;
  canSack: boolean;
  lootGold: number;
  sackGold: number;
  attackers: SiegeForceRow[];
  defenders: SiegeForceRow[];
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
};

const COMMAND_BACKGROUNDS: Record<SiegeCommandId, string> = {
  assault: '/assets/events/siege-assault.png',
  sallyOut: '/assets/events/sally-forth.png',
  pillage: '/assets/events/interaction-pillage.png',
  sack: '/assets/events/sacked-city.png',
};

const COMMAND_LABEL_KEYS: Record<SiegeCommandId, string> = {
  assault: 'Settlement.Siege.Assault',
  sallyOut: 'Settlement.Siege.SallyOut',
  pillage: 'Settlement.Siege.Pillage',
  sack: 'Settlement.Siege.Sack',
};

const COMMAND_BODY_KEYS: Record<SiegeCommandId, string> = {
  assault: 'Settlement.Siege.AssaultBody',
  sallyOut: 'Settlement.Siege.SallyOutBody',
  pillage: 'Settlement.Siege.PillageBody',
  sack: 'Settlement.Siege.SackBody',
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

function defenderRows(settlement: Settlement): SiegeForceRow[] {
  const armies = settlement.garrisonedArmies.map((army, index) => ({
    key: `defender-army-${army.debugShortId ?? index}`,
    name: army.name,
    commanderName: army.commanderName || webUIText('Settlement.Siege.NoCommander'),
    commanderId: army.commanderId,
    strength: army.strength,
    maxStrength: army.maxStrength,
    morale: army.morale,
    unitCount: army.unitCount,
    isLead: index === 0,
  }));

  const units = settlement.garrison.slice(0, 4).map((unit, index) => ({
    key: `garrison-${index}`,
    name: unit.name,
    commanderName: unit.type,
    strength: unit.strength,
    maxStrength: unit.maxStrength,
    unitCount: 1,
    icon: unit.typeIcon || '/assets/icons/Doctrines/I_Doctrine_Garrison.png',
  }));

  return [...armies, ...units];
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
  const defenders = defenderRows(settlement);
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
    hostileFaction: siege.hostileFaction,
    hostileFactionId: siege.hostileFactionId,
    hostileFactionColour: siege.hostileFactionColour ?? '#8f2424',
    hostileFactionSecondaryColour: siege.hostileFactionSecondaryColour,
    hostileFactionEmblem: siege.hostileFactionEmblem,
    hostileFactionCultureGroup: siege.hostileFactionCultureGroup,
    progress: siege.progress,
    estimatedDays: siege.estimatedDays,
    capitalOccupationDaysRemaining: siege.capitalOccupationDaysRemaining,
    progressPerDay: siege.progressPerDay,
    progressFactors: siege.progressFactors,
    siegePower: siege.totalSiegePower,
    defenderStrength,
    attackerStrength,
    morale: attackerMorale,
    canAssault: siege.canAssault,
    canSallyOut: siege.canSallyOut,
    canPillage: siege.canPillage,
    canSack: siege.canSack,
    lootGold: siege.pillageGold,
    sackGold: siege.sackGold,
    attackers,
    defenders,
  };
}

function determinePlayerRole(view: SiegeViewModel, playerFactionId: string | null): PlayerRole {
  if (!playerFactionId) return 'observer';
  if (view.hostileFactionId && view.hostileFactionId === playerFactionId) return 'attacker';
  if (view.defenderFactionId && view.defenderFactionId === playerFactionId) return 'defender';
  return 'observer';
}

function commandsForRole(role: PlayerRole, state: SiegeStateKind): SiegeCommandId[] {
  if (role === 'attacker') {
    if (state === 'occupation') return ['pillage', 'sack'];
    return ['assault'];
  }
  if (role === 'defender') {
    if (state === 'siege') return ['sallyOut'];
    return [];
  }
  return [];
}

function commandDisabledReason(command: SiegeCommandId, view: SiegeViewModel): string | undefined {
  if (command === 'assault' && !view.canAssault) return webUIText('Settlement.Siege.AssaultUnavailable');
  if (command === 'sallyOut' && !view.canSallyOut) return webUIText('Settlement.Siege.SallyOutUnavailable');
  if (command === 'pillage' && !view.canPillage) return webUIText('Settlement.Siege.OccupationOnly');
  if (command === 'sack' && !view.canSack) return webUIText('Settlement.Siege.OccupationOnly');
  return undefined;
}

function commandTooltip(command: SiegeCommandId, view: SiegeViewModel): TooltipContent {
  const disabledReason = commandDisabledReason(command, view);
  const lines: TooltipLine[] = [];
  if (command === 'pillage' || command === 'sack') {
    lines.push({
      label: webUIText('Settlement.Siege.GoldGained'),
      value: formatNumber(command === 'pillage' ? view.lootGold : view.sackGold),
      valueIcon: '/assets/icons/I_Coins.png',
    });
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
        <img src="/assets/icons/I_Siege.png" alt="" className="siege-overview-lead-icon" />
        <div className="siege-overview-lead-copy">
          <span className="siege-overview-label"><WebUIText textKey="Settlement.Siege.BesiegingForce" /></span>
          <span className="siege-overview-title">{lead?.name ?? view.hostileFaction}</span>
          <span className="siege-overview-meta">
            {leadCommander || view.hostileFaction}
          </span>
        </div>
        <div className="siege-overview-power">
          <span className="siege-overview-power-value">{formatNumber(view.siegePower)}</span>
          <span className="siege-overview-power-label"><WebUIText textKey="Settlement.Siege.SiegePower" /></span>
        </div>
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
          ? visibleFactors.map((factor, index) => (
            <div key={`${factor.name}-${index}`} className={`siege-factor-row${factor.helpsProgress ? ' siege-factor-row--helps' : ' siege-factor-row--holds'}`}>
              <span className="siege-factor-name">{factor.name}</span>
              <span className="siege-factor-value">{formatFactorValue(factor)}</span>
            </div>
          ))
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

  return (
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
  const [pendingCommand, setPendingCommand] = React.useState<SiegeCommandId | null>(null);

  React.useEffect(() => {
    setPendingCommand(null);
  }, [settlement.id]);

  const view = buildViewModel(settlement);
  if (!view) return null;

  const stateModifier = STATE_META[view.state].modifier;
  const role = determinePlayerRole(view, playerFactionId);
  const commands = commandsForRole(role, view.state);
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
                onClick={view.hostileFactionId ? () => openSidebar('diplomacy', view.hostileFactionId!) : undefined}
              />
            </FactionTooltip>
            <span className="siege-header-hostile-name">{view.hostileFaction}</span>
          </div>
        </div>
      </div>

      <StyledScrollArea className="sidebar-content sidebar-content--textured siege-content" variant="inline">
        <div className="siege-progress-strip">
          <div className="siege-progress-head">
            <span className="siege-progress-label">
              <WebUIText textKey={hasCapitalDeadline
                ? 'Settlement.Siege.RebelTakeoverProgress'
                : 'Settlement.Siege.Progress'} />
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
            })}
          </div>
        )}

        <SiegeOverview view={view} daysValue={daysValue} />

        {commands.length > 0 && (
          <div className="siege-actions-section">
            <div className="siege-compact-heading"><WebUIText textKey="Settlement.Siege.Commands" /></div>
            <div className="siege-actions">
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
                titleKey="Settlement.Siege.BesiegingForce"
                totalStrength={sumStrength(view.attackers)}
                rows={view.attackers}
                emptyKey="Settlement.Siege.NoBesiegingArmies"
              />
            )}

            {view.defenders.length > 0 && (
              <ForceGroup
                titleKey="Common.Defender"
                totalStrength={sumStrength(view.defenders)}
                rows={view.defenders}
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

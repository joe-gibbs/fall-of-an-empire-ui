import { useMemo, useCallback, useEffect, useRef } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import Portrait from '../../common/portraits/Portrait';
import GameBar from '../../common/data-display/bars/GameBar';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import { useGameActions, useGameState } from '../../../context/GameContext';
import {
  formPersonalPowerBlocAndRefresh,
  getPowerBlocDemandDaysRemaining,
  getPowerBlocDemandTimeRemainingPct,
  setPowerBlocMembershipAndRefresh,
  usePowerBlocSubjectActionsBridge,
  usePowerBlocsBridge,
} from '../../../bridge/diplomacy/usePowerBlocsBridge';
import { useFaction, usePlayerFactionId } from '../../../data-source/index';
import type { PowerBloc, PowerBlocDemand } from '../../../data/types';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { renderRichText } from '../../../utils/richText';
import { getScreenByBridgeName, registerScreen, registerTopbarButton } from '../../../registry/index';
import './PowerBlocsScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

interface PowerBlocsScreenProps {
  onClose: () => void;
}

type BlocTableColumnKey = 'bloc' | 'leader' | 'members' | 'happiness' | 'strength' | 'escalation' | 'demand' | 'action';

const ESCALATION_LABEL_KEYS = [
  'Auto.Return.componentssidebarsPowerBlocSidebar.118.1',
  'Auto.Return.componentssidebarsPowerBlocSidebar.120.1',
  'Auto.Return.componentssidebarsPowerBlocSidebar.122.1',
  'Auto.Return.componentssidebarsPowerBlocSidebar.124.1',
];
const ESCALATION_STAGES = ESCALATION_LABEL_KEYS.length;
const EMPTY_POWER_BLOCS: PowerBloc[] = [];

function getHappinessColour(happiness: number): string {
  if (happiness >= 65) return 'var(--green)';
  if (happiness >= 40) return 'var(--yellow)';
  return 'var(--red)';
}

function getEscalationColour(stage: number): string {
  if (stage >= 3) return 'var(--red)';
  if (stage === 2) return 'var(--orange)';
  if (stage === 1) return 'var(--yellow)';
  return 'var(--green)';
}

function getTypeLabel(bloc: PowerBloc): string {
  const label = bloc.subtype || bloc.type;
  return label === 'Vassal' ? webUIText('Economy.Subject') : label;
}

function currentModifiers(bloc: PowerBloc) {
  return [
    ...(bloc.contentModifiers ?? []),
    ...(bloc.unhappyModifiers ?? []),
  ];
}

function fmtDays(days: number): string {
  const d = Math.round(days);
  return webUIText('Auto.Return.componentsscreensPowerBlocsScreen.63.1', {
    Value1: formatNumber(d),
    Value2: webUIText(d === 1 ? 'Common.Day' : 'Common.Days'),
  });
}

function escalationLabel(stage: number): string {
  const key = ESCALATION_LABEL_KEYS[Math.max(0, Math.min(stage, ESCALATION_LABEL_KEYS.length - 1))];
  return key ? webUIText(key) : webUIText('Auto.Return.componentssidebarsPowerBlocSidebar.126.1');
}

function buildBlocTooltip(bloc: PowerBloc): TooltipContent {
  const lines: TooltipContent['lines'] = [
    { label: webUIText('Auto.Prop.ComponentsScreensPowerBlocsScreen.72.1'), value: bloc.subtype || bloc.type },
    { label: webUIText('Auto.Prop.ComponentsScreensPowerBlocsScreen.73.2'), value: formatNumber(bloc.memberCount) },
    {
      label: webUIText('Auto.Prop.ComponentsScreensPowerBlocsScreen.75.3'),
      value: formatPercent(bloc.happiness),
      valueColor: getHappinessColour(bloc.happiness),
    },
    {
      label: webUIText('Auto.Prop.ComponentsScreensPowerBlocsScreen.80.4'),
      value: escalationLabel(bloc.escalationStage),
      valueColor: getEscalationColour(bloc.escalationStage),
    },
  ];

  if (bloc.unhappyDays && bloc.unhappyDays > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsScreensPowerBlocsScreen.87.5'), value: fmtDays(bloc.unhappyDays) });
  }

  if (bloc.failedDemandCount && bloc.failedDemandCount > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsScreensPowerBlocsScreen.91.6'), value: formatNumber(bloc.failedDemandCount), valueColor: 'var(--red)' });
  }

  const modifiers = currentModifiers(bloc);
  if (modifiers.length > 0) {
    lines.push({ label: webUIText('PowerBlocs.CurrentEffects'), isHeader: true });
    for (const modifier of modifiers) {
      lines.push({
        label: modifier.label,
        value: modifier.value,
        valueColor: modifier.isPositive ? 'var(--green)' : 'var(--red)',
      });
    }
  }

  return { title: bloc.name, body: bloc.description, lines };
}

function buildEscalationTooltip(bloc: PowerBloc): TooltipContent {
  const totalStrength = bloc.strength + bloc.imperialStrength;
  const strengthShare = totalStrength > 0 ? (bloc.strength / totalStrength) * 100 : 0;
  const canMakeDemands = strengthShare >= 25;
  const canRebel = strengthShare >= 33;

  return {
    title: webUIText('PowerBlocs.EscalationTooltip.Title'),
    body: webUIText('PowerBlocs.EscalationTooltip.Body'),
    lines: [
      {
        label: webUIText('Auto.ComponentsScreensPowerBlocsScreen.181.4'),
        value: escalationLabel(bloc.escalationStage),
        valueColor: getEscalationColour(bloc.escalationStage),
      },
      {
        label: webUIText('PowerBlocs.EscalationTooltip.StrengthShare'),
        value: formatPercent(strengthShare),
        valueColor: canMakeDemands ? 'var(--yellow)' : 'var(--text-dark)',
      },
      {
        label: webUIText('PowerBlocs.EscalationTooltip.Demands'),
        value: canMakeDemands
          ? webUIText('PowerBlocs.EscalationTooltip.DemandsReady')
          : webUIText('PowerBlocs.EscalationTooltip.DemandsWeak'),
        valueColor: canMakeDemands ? 'var(--yellow)' : 'var(--text-dark)',
      },
      {
        label: webUIText('PowerBlocs.EscalationTooltip.Rebellion'),
        value: canRebel
          ? webUIText('PowerBlocs.EscalationTooltip.RebellionReady')
          : webUIText('PowerBlocs.EscalationTooltip.RebellionWeak'),
        valueColor: canRebel ? 'var(--red)' : 'var(--text-dark)',
      },
    ],
  };
}

function EscalationDots({ stage }: { stage: number }) {
  const colour = getEscalationColour(stage);
  return (
    <div className="pbs-escalation">
      {Array.from({ length: ESCALATION_STAGES }).map((_, i) => (
        <span
          key={i}
          className={`pbs-escalation-dot${i <= stage ? ' pbs-escalation-dot--active' : ''}`}
          style={i <= stage ? { backgroundColor: colour } : undefined}
        />
      ))}
    </div>
  );
}

function ProgressRow({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="pbs-progress-row">
      <div className="pbs-progress-label-row">
        <span>{label}</span>
        <span style={{ color: colour }}>{formatPercent(value)}</span>
      </div>
      <GameBar value={value} max={100} colour={colour} size="sm" />
    </div>
  );
}

function PowerBlocRichText({
  text,
  onLinkClick,
  blockBullets = false,
}: {
  text: string;
  onLinkClick?: (type: string, id: string) => void;
  blockBullets?: boolean;
}) {
  return <>{renderRichText(text, { onLinkClick, keepLinksWithPreviousWord: true, blockBullets })}</>;
}

function DemandRows({ demand, currentGameDay }: { demand: PowerBlocDemand; currentGameDay: number }) {
  const urgencyPct = getPowerBlocDemandTimeRemainingPct(demand, currentGameDay);
  const urgencyColour = urgencyPct < 25 ? 'var(--red)' : urgencyPct < 50 ? 'var(--orange)' : 'var(--yellow)';
  const progressColour = demand.progress >= 75 ? 'var(--green)' : demand.progress >= 25 ? 'var(--yellow)' : 'var(--red)';

  return (
    <>
      <ProgressRow label={webUIText('Auto.ComponentsScreensPowerBlocsScreen.127.1')} value={demand.progress} colour={progressColour} />
      <ProgressRow label={webUIText('PowerBlocs.TimeRemaining')} value={urgencyPct} colour={urgencyColour} />
    </>
  );
}

function BlocIdentity({ bloc, size = 'md', showLeader = true }: { bloc: PowerBloc; size?: 'sm' | 'md'; showLeader?: boolean }) {
  const leaderLabel = bloc.leaderName || webUIText('PowerBlocsScreen.NoLeader');

  return (
    <div className={`pbs-identity pbs-identity--${size}`}>
      {bloc.iconKey && <img className="pbs-bloc-icon" src={bloc.iconKey} alt="" draggable={false} />}
      <div className="pbs-identity-text">
        <Tooltip content={buildBlocTooltip(bloc)} delay={200}>
          <span className="pbs-bloc-name">{bloc.name}</span>
        </Tooltip>
        <span className="pbs-bloc-type">{getTypeLabel(bloc)}</span>
        {showLeader ? <span className="pbs-bloc-leader">{leaderLabel}</span> : null}
      </div>
    </div>
  );
}

function LeaderCell({ bloc }: { bloc: PowerBloc }) {
  const leaderLabel = bloc.leaderName || webUIText('PowerBlocsScreen.NoLeader');

  return (
    <div className="pbs-leader-cell">
      <PersonTooltip characterId={bloc.leaderId || bloc.leaderName}>
        <Portrait personId={bloc.leaderId} name={bloc.leaderName} size="sm" showBorder />
      </PersonTooltip>
      <span>{leaderLabel}</span>
    </div>
  );
}

function DemandCard({
  bloc,
  onOpen,
  onLinkClick,
  currentGameDay,
}: {
  bloc: PowerBloc;
  onOpen: (id: string) => void;
  onLinkClick?: (type: string, id: string) => void;
  currentGameDay: number;
}) {
  const handleMouseDown = useCallback(() => onOpen(bloc.id), [bloc.id, onOpen]);
  const demand = bloc.activeDemand!;
  const happinessColour = getHappinessColour(bloc.happiness);
  const escalationColour = getEscalationColour(bloc.escalationStage);
  const daysRemaining = getPowerBlocDemandDaysRemaining(demand, currentGameDay);
  const urgencyPct = getPowerBlocDemandTimeRemainingPct(demand, currentGameDay);
  const urgencyColour = urgencyPct < 25 ? 'var(--red)' : urgencyPct < 50 ? 'var(--orange)' : 'var(--yellow)';

  return (
    <div className="pbs-demand-card" onClick={handleMouseDown}>
      <div className="pbs-demand-bloc">
        <BlocIdentity bloc={bloc} />
        <div className="pbs-demand-bloc-meta">
          <span>{webUIText('PowerBlocsScreen.Members', { Value1: formatNumber(bloc.memberCount) })}</span>
          <span style={{ color: happinessColour }}>{formatPercent(bloc.happiness)}</span>
          <span>{formatNumber(bloc.strength)}</span>
        </div>
      </div>

      <div className="pbs-demand-main">
        <div className="pbs-demand-title-row">
          <div className="pbs-demand-title-box">
            <span className="pbs-demand-title">{demand.title}</span>
            <span className="pbs-demand-description"><PowerBlocRichText text={demand.description} onLinkClick={onLinkClick} /></span>
            {demand.progressLabel ? (
              <div className="pbs-demand-progress-hint">
                <PowerBlocRichText text={demand.progressLabel} onLinkClick={onLinkClick} blockBullets />
              </div>
            ) : null}
          </div>
          <div className="pbs-demand-days" style={{ color: urgencyColour }}>
            <span className="pbs-demand-days-value">{formatNumber(daysRemaining)}</span>
            <span>{webUIText('PowerBlocs.DaysRemaining')}</span>
          </div>
        </div>
        <div className="pbs-demand-lower">
          <div className="pbs-demand-progress">
            <DemandRows demand={demand} currentGameDay={currentGameDay} />
          </div>
          <div className="pbs-demand-escalation">
            <span className="pbs-demand-escalation-label"><WebUIText textKey="Auto.ComponentsScreensPowerBlocsScreen.181.4" /></span>
            <span className="pbs-demand-escalation-value" style={{ color: escalationColour }}>{escalationLabel(bloc.escalationStage)}</span>
            <EscalationDots stage={bloc.escalationStage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BlocTable({
  blocs,
  onOpen,
  showDemand = true,
  playerBlocId,
  subjectMode = false,
  playerCharacterId,
  currentGameDay,
}: {
  blocs: PowerBloc[];
  onOpen: (id: string) => void;
  showDemand?: boolean;
  playerBlocId?: string;
  subjectMode?: boolean;
  playerCharacterId?: string | null;
  currentGameDay: number;
}) {
  const columns = useMemo<Array<DataTableColumn<PowerBloc, BlocTableColumnKey>>>(() => {
    const cellClass = (id: BlocTableColumnKey) => `pbs-cell pbs-cell--${id}`;
    const includeAction = subjectMode && Boolean(playerCharacterId);
    const next: Array<DataTableColumn<PowerBloc, BlocTableColumnKey>> = [
      {
        id: 'bloc',
        label: webUIText('PowerBlocs.Bloc'),
        width: showDemand ? '29%' : includeAction ? '28%' : '31%',
        className: cellClass('bloc'),
        headerClassName: cellClass('bloc'),
        render: bloc => <BlocIdentity bloc={bloc} size="sm" showLeader={false} />,
        sortValue: bloc => bloc.name,
        searchValue: bloc => `${bloc.name} ${getTypeLabel(bloc)}`,
      },
      {
        id: 'leader',
        label: webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.166.11'),
        width: showDemand ? '20%' : includeAction ? '20%' : '23%',
        className: cellClass('leader'),
        headerClassName: cellClass('leader'),
        render: bloc => <LeaderCell bloc={bloc} />,
        sortValue: bloc => bloc.leaderName || webUIText('PowerBlocsScreen.NoLeader'),
        searchValue: bloc => bloc.leaderName,
      },
      {
        id: 'members',
        label: webUIText('Auto.Prop.ComponentsScreensPowerBlocsScreen.73.2'),
        width: showDemand ? '8%' : includeAction ? '8%' : '10%',
        className: cellClass('members'),
        headerClassName: cellClass('members'),
        render: bloc => formatNumber(bloc.memberCount),
        sortValue: bloc => bloc.memberCount,
      },
      {
        id: 'happiness',
        label: webUIText('Auto.ComponentsScreensPowerBlocsScreen.174.3'),
        width: showDemand ? '10%' : includeAction ? '10%' : '12%',
        className: cellClass('happiness'),
        headerClassName: cellClass('happiness'),
        render: bloc => {
          const colour = getHappinessColour(bloc.happiness);
          return (
            <>
              <span style={{ color: colour }}>{formatPercent(bloc.happiness)}</span>
              <GameBar value={bloc.happiness} max={100} colour={colour} size="sm" />
            </>
          );
        },
        sortValue: bloc => bloc.happiness,
      },
      {
        id: 'strength',
        label: webUIText('Economy.Strength'),
        width: showDemand ? '10%' : includeAction ? '10%' : '12%',
        className: cellClass('strength'),
        headerClassName: cellClass('strength'),
        render: bloc => (
          <>
            <span>{formatNumber(bloc.strength)}</span>
            <GameBar value={bloc.strength} max={bloc.strength + bloc.imperialStrength} colour="var(--gold)" size="sm" />
          </>
        ),
        sortValue: bloc => bloc.strength,
      },
      {
        id: 'escalation',
        label: webUIText('Auto.ComponentsScreensPowerBlocsScreen.181.4'),
        width: showDemand ? '10%' : includeAction ? '11%' : '12%',
        className: cellClass('escalation'),
        headerClassName: cellClass('escalation'),
        render: bloc => {
          const colour = getEscalationColour(bloc.escalationStage);
          return (
            <Tooltip content={buildEscalationTooltip(bloc)} position="left" delay={150}>
              <span className="pbs-escalation-cell">
                <EscalationDots stage={bloc.escalationStage} />
                <span style={{ color: colour }}>{escalationLabel(bloc.escalationStage)}</span>
              </span>
            </Tooltip>
          );
        },
        sortValue: bloc => bloc.escalationStage,
      },
    ];

    if (showDemand) {
      next.push({
        id: 'demand',
        label: webUIText('PowerBlocs.Demand'),
        width: '13%',
        className: cellClass('demand'),
        headerClassName: cellClass('demand'),
        render: bloc => {
          if (!bloc.activeDemand) {
            return <span className="pbs-muted">{webUIText('PowerBlocs.NoDemand')}</span>;
          }

          const daysRemaining = getPowerBlocDemandDaysRemaining(bloc.activeDemand, currentGameDay);
          return (
            <>
              <span className="pbs-demand-table-title">{bloc.activeDemand.title}</span>
              <span className="pbs-demand-table-time">{fmtDays(daysRemaining)}</span>
            </>
          );
        },
        sortValue: bloc => bloc.activeDemand ? getPowerBlocDemandDaysRemaining(bloc.activeDemand, currentGameDay) : 999999,
        searchValue: bloc => bloc.activeDemand?.title,
      });
    }

    if (includeAction) {
      next.push({
        id: 'action',
        label: webUIText('PowerBlocs.SubjectAvailableActions'),
        width: '13%',
        className: cellClass('action'),
        headerClassName: cellClass('action'),
        render: bloc => {
          const joined = playerInBloc(bloc, playerCharacterId);
          if (!joined && !bloc.canPlayerJoin) {
            const tooltip: TooltipContent = {
              title: webUIText('PowerBlocs.SubjectJoin'),
              body: bloc.canPlayerJoinReason,
            };

            return (
              <div className="pbs-join-cell" onClick={event => event.stopPropagation()}>
                <Tooltip content={tooltip} position="left" delay={150} disabled={!bloc.canPlayerJoinReason}>
                  <GameButton
                    variant="outline"
                    className="pbs-join-button"
                    tutorialTarget={bloc.definitionKey === 'tutorialpatronagebloc' ? 'TutorialPatronageBlocJoinButton' : undefined}
                    disabled
                  >
                    {webUIText('PowerBlocs.SubjectJoin')}
                  </GameButton>
                </Tooltip>
              </div>
            );
          }

          return (
            <div className="pbs-join-cell" onClick={event => event.stopPropagation()}>
              <GameButton
                variant={joined ? 'outline' : 'burgundy'}
                className="pbs-join-button"
                tutorialTarget={!joined && bloc.definitionKey === 'tutorialpatronagebloc' ? 'TutorialPatronageBlocJoinButton' : undefined}
                onClick={() => setPowerBlocMembershipAndRefresh(bloc.id, !joined)}
              >
                {joined ? webUIText('PowerBlocs.SubjectAction.Leave') : webUIText('PowerBlocs.SubjectJoin')}
              </GameButton>
            </div>
          );
        },
        sortValue: bloc => {
          const joined = playerInBloc(bloc, playerCharacterId);
          if (joined) return 0;
          return bloc.canPlayerJoin ? 1 : 2;
        },
      });
    }

    return next;
  }, [currentGameDay, playerCharacterId, showDemand, subjectMode]);

  return (
    <DataTable
      rows={blocs}
      columns={columns}
      rowKey={bloc => bloc.id}
      onRowClick={bloc => onOpen(bloc.id)}
      defaultSortKey="strength"
      defaultSortDirection="desc"
      className="pbs-table-block"
      wrapperClassName="pbs-table-wrapper"
      tableClassName={`pbs-table${showDemand ? '' : ' pbs-table--no-demand'}`}
      headerGroupClassName="pbs-table-header-group"
      headerRowClassName="pbs-table-header"
      bodyClassName="pbs-table-body"
      rowClassName={bloc => `pbs-table-row${bloc.id === playerBlocId ? ' pbs-table-row--subject-player' : ''}`}
      emptyLabel={<WebUIText textKey="Auto.ComponentsScreensPowerBlocsScreen.271.9" />}
    />
  );
}

function playerMember(bloc: PowerBloc, playerCharacterId: string | null | undefined) {
  if (!playerCharacterId) return undefined;
  return bloc.members?.find(member => member.id === playerCharacterId);
}

function playerInBloc(bloc: PowerBloc, playerCharacterId: string | null | undefined): boolean {
  return Boolean(playerCharacterId && (bloc.playerIsMember || bloc.leaderId === playerCharacterId || playerMember(bloc, playerCharacterId)));
}

function findPlayerBloc(blocs: PowerBloc[], playerCharacterId: string | null | undefined): PowerBloc | undefined {
  if (!playerCharacterId) return undefined;
  return blocs.find(bloc => playerInBloc(bloc, playerCharacterId));
}

function SubjectPlayerBlocPanel({
  bloc,
  member,
  playerCharacterId,
  canFormPersonalBloc,
  formPersonalBlocReason,
  onOpen,
}: {
  bloc?: PowerBloc;
  member?: ReturnType<typeof playerMember>;
  playerCharacterId: string | null | undefined;
  canFormPersonalBloc: boolean;
  formPersonalBlocReason?: string;
  onOpen: (id: string) => void;
}) {
  if (!bloc) {
    const formButton = (
      <GameButton
        variant="burgundy"
        disabled={!canFormPersonalBloc}
        onClick={formPersonalPowerBlocAndRefresh}
      >
        {webUIText('PowerBlocs.SubjectAction.FormPersonalBloc')}
      </GameButton>
    );

    return (
      <div className="pbs-subject-current">
        <SectionHeading title={webUIText('PowerBlocs.SubjectCurrentBloc')} />
        <div className="pbs-empty pbs-empty--compact">{webUIText('PowerBlocs.SubjectNoBloc')}</div>
        {formPersonalBlocReason ? (
          <Tooltip content={{ title: webUIText('PowerBlocs.SubjectAction.FormPersonalBloc'), body: formPersonalBlocReason }} position="right" delay={150}>
            {formButton}
          </Tooltip>
        ) : formButton}
      </div>
    );
  }

  const isLeader = bloc.leaderId === playerCharacterId || member?.isLeader === true;
  const happinessColour = getHappinessColour(bloc.happiness);
  const strengthMax = Math.max(1, bloc.strength + bloc.imperialStrength);

  return (
    <div className="pbs-subject-current">
      <SectionHeading title={webUIText('PowerBlocs.SubjectCurrentBloc')} />
      <div
        className="pbs-subject-hero"
        data-tutorial-target="PlayerPowerBloc"
        onClick={() => onOpen(bloc.id)}
      >
        <div className="pbs-subject-hero-main">
          <BlocIdentity bloc={bloc} />
          <p className="pbs-subject-description">{bloc.description}</p>
        </div>
        <div className="pbs-subject-status">
          <div className="pbs-subject-stat">
            <span>{webUIText('PowerBlocs.SubjectYourRole')}</span>
            <strong>{member?.role ?? (isLeader ? webUIText('ProvinceMode.BlocMembership.Leader') : webUIText('ProvinceMode.BlocMembership.Member'))}</strong>
          </div>
          <div className="pbs-subject-stat">
            <span>{webUIText('Auto.ComponentsScreensPowerBlocsScreen.174.3')}</span>
            <strong style={{ color: happinessColour }}>{formatPercent(bloc.happiness)}</strong>
            <GameBar value={bloc.happiness} max={100} colour={happinessColour} size="sm" />
          </div>
          <div className="pbs-subject-stat">
            <span>{webUIText('Economy.Strength')}</span>
            <strong>{formatNumber(bloc.strength)}</strong>
            <GameBar value={bloc.strength} max={strengthMax} colour="var(--gold)" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectPowerBlocsView({
  blocs,
  playerCharacterId,
  onOpen,
}: {
  blocs: PowerBloc[];
  playerCharacterId: string | null | undefined;
  onOpen: (id: string) => void;
}) {
  const { gameDay } = useGameState();
  const subjectActions = usePowerBlocSubjectActionsBridge();
  const bloc = findPlayerBloc(blocs, playerCharacterId);
  const member = bloc ? playerMember(bloc, playerCharacterId) : undefined;

  return (
    <div className="pbs-layout pbs-layout--subject">
      <SubjectPlayerBlocPanel
        bloc={bloc}
        member={member}
        playerCharacterId={playerCharacterId}
        canFormPersonalBloc={subjectActions.canFormPersonalBloc}
        formPersonalBlocReason={subjectActions.formPersonalBlocReason}
        onOpen={onOpen}
      />
      <div className="pbs-section pbs-section--table pbs-section--subject-table">
        <SectionHeading title={webUIText('PowerBlocs.SubjectImperialBlocs')} count={blocs.length} />
        {blocs.length === 0 ? (
          <div className="pbs-empty">{webUIText('PowerBlocs.SubjectNoOtherBlocs')}</div>
        ) : (
          <BlocTable
            blocs={blocs}
            onOpen={onOpen}
            showDemand={false}
            playerBlocId={bloc?.id}
            subjectMode
            playerCharacterId={playerCharacterId}
            currentGameDay={gameDay}
          />
        )}
      </div>
    </div>
  );
}

function PowerBlocsScreen({ onClose }: PowerBlocsScreenProps) {
  const { openRightSidebar, openScreen, openSidebar } = useGameActions();
  const { gameDay, rightSidebar } = useGameState();
  const playerFactionId = usePlayerFactionId();
  const playerFaction = useFaction(playerFactionId);
  const fetchedBlocs = usePowerBlocsBridge();
  const blocs = fetchedBlocs ?? EMPTY_POWER_BLOCS;
  const subjectMode = playerFaction?.diplomaticStatus === 'subject';
  const playerCharacterId = playerFaction?.rulerId ?? null;
  const autoOpenedRef = useRef(false);

  const sortedBlocs = useMemo(() => {
    return [...blocs].sort((a, b) => {
      if (!!a.activeDemand !== !!b.activeDemand) return a.activeDemand ? -1 : 1;
      if (a.escalationStage !== b.escalationStage) return b.escalationStage - a.escalationStage;
      return a.happiness - b.happiness;
    });
  }, [blocs]);

  const demandingBlocs = useMemo(
    () => sortedBlocs
      .filter(bloc => bloc.activeDemand)
      .sort((a, b) => (
        getPowerBlocDemandDaysRemaining(a.activeDemand!, gameDay) -
        getPowerBlocDemandDaysRemaining(b.activeDemand!, gameDay)
      )),
    [gameDay, sortedBlocs],
  );

  const otherBlocs = useMemo(() => sortedBlocs.filter(bloc => !bloc.activeDemand), [sortedBlocs]);
  const strongestBlocId = useMemo(
    () => [...blocs].sort((a, b) => b.strength - a.strength)[0]?.id ?? null,
    [blocs],
  );

  const handleOpen = useCallback((id: string) => openRightSidebar('powerbloc', id), [openRightSidebar]);
  const handleRichLinkClick = useCallback((type: string, id: string) => {
    switch (type) {
      case 'settlement': openSidebar('settlement', id); break;
      case 'character': openSidebar('character', id); break;
      case 'faction': openSidebar('diplomacy', id); break;
      case 'army':
      case 'military': openSidebar('military', id); break;
      case 'screen': {
        const separatorIndex = id.indexOf(':');
        const screenName = separatorIndex >= 0 ? id.slice(0, separatorIndex) : id;
        const screenId = separatorIndex >= 0 ? id.slice(separatorIndex + 1) : undefined;
        const target = getScreenByBridgeName(screenName, subjectMode);
        if (target) openScreen(target.id, screenId);
        break;
      }
    }
  }, [openScreen, openSidebar, subjectMode]);

  useEffect(() => {
    if (subjectMode || autoOpenedRef.current || !strongestBlocId || rightSidebar === 'powerbloc') return;
    autoOpenedRef.current = true;
    openRightSidebar('powerbloc', strongestBlocId);
  }, [openRightSidebar, rightSidebar, strongestBlocId, subjectMode]);

  if (subjectMode) {
    return (
      <ScreenShell
        title={webUIText('ProvinceMode.BlocTitle')}
        onClose={onClose}
        advisorTopic="powerBlocsScreen"
        className="screen--power-blocs"
        contentClassName="screen-content--power-blocs"
      >
        <SubjectPowerBlocsView blocs={sortedBlocs} playerCharacterId={playerCharacterId} onOpen={handleOpen} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={webUIText('Auto.Attr.ComponentsScreensPowerBlocsScreen.243.8')}
      onClose={onClose}
      advisorTopic="powerBlocsScreen"
      className="screen--power-blocs"
      contentClassName="screen-content--power-blocs"
    >
      <div className="pbs-layout">
        {blocs.length === 0 ? (
          <div className="pbs-empty"><WebUIText textKey="Auto.ComponentsScreensPowerBlocsScreen.271.9" /></div>
        ) : (
          <>
            <div className="pbs-section">
              <SectionHeading title={webUIText('Auto.TopProp.ComponentsScreensPowerBlocsScreen.24.2')} count={demandingBlocs.length} />
              <div className="pbs-demand-list">
                {demandingBlocs.length === 0 ? (
                  <div className="pbs-empty"><WebUIText textKey="Auto.ComponentsScreensPowerBlocsScreen.282.10" /></div>
                ) : demandingBlocs.map(bloc => (
                  <DemandCard key={bloc.id} bloc={bloc} onOpen={handleOpen} onLinkClick={handleRichLinkClick} currentGameDay={gameDay} />
                ))}
              </div>
            </div>

            <div className="pbs-section pbs-section--table">
              <SectionHeading
                title={webUIText('PowerBlocs.OtherBlocs')}
                count={otherBlocs.length}
              />
              <BlocTable blocs={otherBlocs} onOpen={handleOpen} showDemand={false} currentGameDay={gameDay} />
            </div>
          </>
        )}
      </div>
    </ScreenShell>
  );
}

export default PowerBlocsScreen;

registerTopbarButton({
  id: 'powerblocs',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensPowerBlocsScreen.325.3'); },
  icon: '/assets/icons/I_PowerBlocs.png',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensPowerBlocsScreen.328.4'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensPowerBlocsScreen.329.5'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensPowerBlocsScreen.331.6'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensPowerBlocsScreen.332.7'); } },
    ],
  },
  order: 60,
  factionMode: 'all',
});

registerScreen({
  id: 'powerBlocs',
  render: ({ onClose }) => <PowerBlocsScreen onClose={onClose} />,
  topbarId: 'powerblocs',
  advisorTopic: 'powerBlocsScreen',
  bridgeNames: ['powerblocs'],
  factionMode: 'all',
});

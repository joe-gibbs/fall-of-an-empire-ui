import React from 'react';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import InteractionCard from '../../common/interactions/InteractionCard';
import InteractionEffectsTooltip from '../../common/tooltips/InteractionEffectsTooltip';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import InfoRow from '../../common/data-display/stats/InfoRow';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import glossary from '../../../data/glossary';
import type { PowerBloc, PowerBlocDemand, PowerBlocGoal, PowerBlocMember, PowerBlocModifier } from '../../../data/types';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { useBlocInteractionsBridge } from '../../../bridge/diplomacy/useBlocInteractionsBridge';
import type { BlocInteractionView } from '../../../bridge/diplomacy/useBlocInteractionsBridge';
import {
  formPersonalPowerBlocAndRefresh,
  getPowerBlocDemandDaysRemaining,
  getPowerBlocDemandTimeRemainingPct,
  setPowerBlocMembershipAndRefresh,
  usePowerBlocBridge,
  usePowerBlocSubjectActionsBridge,
} from '../../../bridge/diplomacy/usePowerBlocsBridge';
import { useFaction, usePlayerFactionId } from '../../../data-source/index';
import { successChanceColour } from '../../../utils/colorFormatters';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { renderRichText } from '../../../utils/richText';
import { getScreenByBridgeName, registerSidebar } from '../../../registry/index';
import { BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import SidebarToolbar from '../shared/SidebarToolbar';
import '../shared/Sidebar.css';
import './PowerBlocSidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface PowerBlocSidebarProps {
  bloc: PowerBloc;
  onClose: () => void;
}

type PowerBlocMemberColumnKey = 'member' | 'influence' | 'loyalty';

interface SubjectBlocAction {
  icon: string;
  titleKey: string;
  bodyKey: string;
}

const ESCALATION_LABEL_KEYS = [
  'Auto.Return.componentssidebarsPowerBlocSidebar.118.1',
  'Auto.Return.componentssidebarsPowerBlocSidebar.120.1',
  'Auto.Return.componentssidebarsPowerBlocSidebar.122.1',
  'Auto.Return.componentssidebarsPowerBlocSidebar.124.1',
];
const SUBJECT_JOIN_ACTION: SubjectBlocAction = {
  icon: '/assets/icons/I_PowerBlocs.png',
  titleKey: 'PowerBlocs.SubjectJoin',
  bodyKey: 'PowerBlocs.SubjectAction.JoinBody',
};
const SUBJECT_LEAVE_ACTION: SubjectBlocAction = {
  icon: '/assets/icons/I_Close.png',
  titleKey: 'PowerBlocs.SubjectAction.Leave',
  bodyKey: 'PowerBlocs.SubjectAction.LeaveBody',
};
const SUBJECT_FORM_PERSONAL_BLOC_ACTION: SubjectBlocAction = {
  icon: '/assets/icons/I_Characters.png',
  titleKey: 'PowerBlocs.SubjectAction.FormPersonalBloc',
  bodyKey: 'PowerBlocs.SubjectAction.FormPersonalBlocBody',
};

const POWER_BLOC_TITLE_MIN_FONT_REM = 0.72;
const POWER_BLOC_TITLE_MAX_FONT_REM = 1.55;

function PowerBlocTitle({ name }: { name: string }) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const frame = frameRef.current;
    const title = titleRef.current;
    if (!frame || !title) return undefined;

    const fitTitle = () => {
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const minFontSize = POWER_BLOC_TITLE_MIN_FONT_REM * rootFontSize;
      const maxFontSize = POWER_BLOC_TITLE_MAX_FONT_REM * rootFontSize;
      const fits = (fontSize: number) => {
        title.style.fontSize = `${fontSize}px`;
        return title.scrollHeight <= frame.clientHeight + 0.5
          && title.scrollWidth <= frame.clientWidth + 0.5;
      };

      if (!fits(minFontSize)) return;

      let low = minFontSize;
      let high = maxFontSize;
      for (let pass = 0; pass < 8; pass += 1) {
        const candidate = (low + high) / 2;
        if (fits(candidate)) low = candidate;
        else high = candidate;
      }
      title.style.fontSize = `${low}px`;
    };

    fitTitle();
    const observer = new ResizeObserver(fitTitle);
    observer.observe(frame);

    let active = true;
    void document.fonts.ready.then(() => {
      if (active) fitTitle();
    });

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [name]);

  return (
    <div ref={frameRef} className="powerbloc-hero-title-frame">
      <Tooltip
        content={glossary['Power Bloc']}
        position="right"
        delay={200}
        wrapperClassName="powerbloc-hero-title-tooltip"
      >
        <span ref={titleRef} className="sidebar-title powerbloc-hero-title">{name}</span>
      </Tooltip>
    </div>
  );
}

function buildBlocInteractionTooltip(i: BlocInteractionView, blocId: string): TooltipContent {
  const lines: TooltipContent['lines'] = [];

  if (i.goldCost > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.35.1'), value: formatNumber(i.goldCost), valueIcon: '/assets/icons/I_Coins.png' });
  }

  if (i.inProgress && i.remainingDays > 0) {
    const days = Math.round(i.remainingDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.40.2'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsPowerBlocSidebar.40.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else if (i.durationDays > 0) {
    const days = Math.round(i.durationDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.43.3'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsPowerBlocSidebar.43.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.45.4'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsPowerBlocSidebar.45.1"); } });
  }

  if (i.successFactors.length > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.50.5'),
      value: formatPercent(i.successChancePercent),
      valueColor: successChanceColour(i.successChancePercent),
      labelIcon: '/assets/icons/I_GoalMet.png',
      isHeader: true,
    });
    for (const f of i.successFactors) {
      lines.push({
        label: f.name,
        value: `${formatSignedNumber(f.percent)}%`,
        valueColor: f.percent >= 0 ? 'var(--green)' : 'var(--red)',
      });
    }
  }

  if (i.cooldownDays > 0) {
    if (i.cooldownRemainingDays > 0) {
      const remaining = Math.round(i.cooldownRemainingDays);
      lines.push({
        label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.68.6'), labelIcon: '/assets/icons/I_Cooling.png',
        get value() { return webUIText("Auto.Prop.componentssidebarsPowerBlocSidebar.69.1", { Value1: formatNumber(remaining), Value2: webUIText(remaining === 1 ? 'Common.Day' : 'Common.Days') }); },
        valueColor: 'var(--red)',
      });
    } else {
      const total = Math.round(i.cooldownDays);
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.74.7'), labelIcon: '/assets/icons/I_Cooling.png', get value() { return webUIText("Auto.Prop.componentssidebarsPowerBlocSidebar.74.1", { Value1: formatNumber(total), Value2: webUIText(total === 1 ? 'Common.Day' : 'Common.Days') }); } });
    }
  }

  if (i.reasons.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.79.8'), isHeader: true });
    for (const r of i.reasons) {
      lines.push({ label: r.reason, valueColor: 'var(--red)' });
    }
  }

  const body = i.inProgress && i.remainingDays > 0
    ? (
      <>
        <span>{i.description}</span>
        <BureaucraticRushTooltipAction
          actionId={`bloc:${i.id}`}
          targetId={blocId}
          daysSaved={i.bureaucraticRushDaysSaved}
          overloadLoad={i.bureaucraticRushLoad}
        />
      </>
    )
    : i.description;

  return {
    title: i.name,
    body,
    lines,
    afterLines: <InteractionEffectsTooltip lines={i.effectLines} />,
  };
}

function getTypeBadgeColour(type: string): string {
  switch (type) {
    case 'Institutional':
      return 'var(--purple)';
    case 'Religious':
      return 'var(--blue)';
    case 'Vassal':
      return 'var(--gold)';
    case 'Regional':
      return 'var(--green)';
    case 'Personal':
      return 'var(--orange)';
    default:
      return 'var(--text-muted)';
  }
}

function getTypeBadgeLabel(type: string): string {
  return type === 'Vassal' ? webUIText('Economy.Subject') : type;
}

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

function getEscalationLabel(stage: number): string {
  const key = ESCALATION_LABEL_KEYS[Math.max(0, Math.min(stage, ESCALATION_LABEL_KEYS.length - 1))];
  return key ? webUIText(key) : webUIText("Auto.Return.componentssidebarsPowerBlocSidebar.126.1");
}

function fmtDays(days: number): string {
  const d = Math.round(days);
  return webUIText('Auto.Return.componentsscreensPowerBlocsScreen.63.1', {
    Value1: formatNumber(d),
    Value2: webUIText(d === 1 ? 'Common.Day' : 'Common.Days'),
  });
}

function getDemandTimeColour(demand: PowerBlocDemand, currentGameDay: number): string {
  const remainingPct = getPowerBlocDemandTimeRemainingPct(demand, currentGameDay);
  if (remainingPct < 25) return 'var(--red)';
  if (remainingPct < 50) return 'var(--orange)';
  return 'var(--yellow)';
}

function getDemandProgressColour(progress: number): string {
  if (progress >= 75) return 'var(--green)';
  if (progress >= 25) return 'var(--yellow)';
  return 'var(--red)';
}

function paintedBarColour(colour: string): 'green' | 'red' | 'gold' {
  if (colour === 'var(--green)') return 'green';
  if (colour === 'var(--red)' || colour === 'var(--orange)') return 'red';
  return 'gold';
}

function PowerBlocBar({ value, colour, size = 'sm' }: { value: number; colour: string; size?: 'sm' | 'md' }) {
  return (
    <PaintedBar
      percent={value}
      color={paintedBarColour(colour)}
      className={`powerbloc-painted-bar powerbloc-painted-bar--${size}`}
    />
  );
}

function currentModifiers(bloc: PowerBloc): PowerBlocModifier[] {
  return [
    ...(bloc.contentModifiers ?? []),
    ...(bloc.unhappyModifiers ?? []),
  ];
}

function DemandProgressRow({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="powerbloc-demand-progress-row">
      <div className="powerbloc-demand-progress-labels">
        <span>{label}</span>
        <span style={{ color: colour }}>{formatPercent(value)}</span>
      </div>
      <PowerBlocBar value={value} colour={colour} size="sm" />
    </div>
  );
}

function PowerBlocRichText({ text, onLinkClick }: { text: string; onLinkClick?: (type: string, id: string) => void }) {
  return <>{renderRichText(text, { onLinkClick, keepLinksWithPreviousWord: true })}</>;
}

function EscalationTrack({ stage }: { stage: number }) {
  const label = getEscalationLabel(stage);
  const colour = getEscalationColour(stage);

  return (
    <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.233.22'), body: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.233.23'), lines: [{ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.233.24'), value: label, valueColor: colour }] }} position="right" delay={150}>
      <div className="powerbloc-demand-escalation">
        <div className="powerbloc-demand-escalation-header">
          <span>{webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.233.22')}</span>
          <span style={{ color: colour }}>{label}</span>
        </div>
        <div className="powerbloc-escalation-stages">
          {ESCALATION_LABEL_KEYS.map((key, i) => (
            <div
              key={key}
              className={
                'powerbloc-escalation-stage' +
                (i <= stage
                  ? ' powerbloc-escalation-stage--active-' + stage
                  : '')
              }
            />
          ))}
        </div>
      </div>
    </Tooltip>
  );
}

function CurrentDemandSection({
  demand,
  escalationStage,
  onLinkClick,
  currentGameDay,
}: {
  demand?: PowerBlocDemand;
  escalationStage: number;
  onLinkClick?: (type: string, id: string) => void;
  currentGameDay: number;
}) {
  if (!demand) {
    return (
      <div className="powerbloc-demand-card">
        <div className="powerbloc-demand-primary">
          <div className="powerbloc-panel-heading">{webUIText('PowerBlocs.CurrentDemand')}</div>
          <div className="powerbloc-demand-empty">{webUIText('PowerBlocs.NoDemand')}</div>
        </div>
        <div className="powerbloc-demand-status">
          <EscalationTrack stage={escalationStage} />
        </div>
      </div>
    );
  }

  const daysRemaining = getPowerBlocDemandDaysRemaining(demand, currentGameDay);
  const timeRemaining = getPowerBlocDemandTimeRemainingPct(demand, currentGameDay);
  const timeColour = getDemandTimeColour(demand, currentGameDay);
  const progressColour = getDemandProgressColour(demand.progress);

  return (
    <div className="powerbloc-demand-card">
      <div className="powerbloc-demand-primary">
        <div className="powerbloc-panel-heading">{webUIText('PowerBlocs.CurrentDemand')}</div>
        <div className="powerbloc-demand-title">{demand.title}</div>
        <div className="powerbloc-demand-days" style={{ color: timeColour }}>
          {webUIText('Auto.Fix.Expr.componentsscreensPowerBlocsScreen.122.1', { Value1: fmtDays(daysRemaining) })}
        </div>
        <div className="powerbloc-demand-rule" />
        <div className="powerbloc-demand-progress">
          <DemandProgressRow label={webUIText('Auto.ComponentsScreensPowerBlocsScreen.127.1')} value={demand.progress} colour={progressColour} />
          <DemandProgressRow label={webUIText('PowerBlocs.TimeRemaining')} value={timeRemaining} colour={timeColour} />
        </div>
        {demand.progressLabel ? <div className="powerbloc-demand-hint"><PowerBlocRichText text={demand.progressLabel} onLinkClick={onLinkClick} /></div> : null}
      </div>
      <div className="powerbloc-demand-status">
        <EscalationTrack stage={escalationStage} />
        <div className="powerbloc-demand-rule" />
        <div className="powerbloc-if-unmet">
          <div className="powerbloc-panel-heading">{webUIText('PowerBlocs.IfUnmet')}</div>
          <div className="powerbloc-demand-description"><PowerBlocRichText text={demand.description} onLinkClick={onLinkClick} /></div>
        </div>
      </div>
    </div>
  );
}

function CurrentEffectsSection({ modifiers }: { modifiers: PowerBlocModifier[] }) {
  if (modifiers.length === 0) return null;

  return (
    <div className="powerbloc-effects-panel">
      <div className="powerbloc-panel-heading">{webUIText('PowerBlocs.CurrentEffects')}</div>
      <div className="powerbloc-effects-list">
        {modifiers.map((modifier) => (
          <div key={`${modifier.label}:${modifier.value}`} className="powerbloc-effects-row">
            <span className="powerbloc-effects-label">{modifier.label}</span>
            <span className={`powerbloc-effects-value ${modifier.isPositive ? 'powerbloc-effects-value--positive' : 'powerbloc-effects-value--negative'}`}>
              {modifier.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getGoalColour(satisfaction: number): string {
  if (satisfaction >= 65) return 'var(--green)';
  if (satisfaction >= 35) return 'var(--yellow)';
  return 'var(--red)';
}

function getGoalIcon(satisfaction: number): string {
  if (satisfaction >= 75) return '/assets/icons/I_GoalMet.png';
  if (satisfaction >= 35) return '/assets/icons/I_GoalPartial.png';
  return '/assets/icons/I_GoalNotMet.png';
}

function GoalRow({ goal }: { goal: PowerBlocGoal }) {
  const satisfaction = goal.satisfaction ?? 50;
  const colour = getGoalColour(satisfaction);
  const body = goal.breakdown ? `${goal.description}<hr/>${goal.breakdown}` : goal.description;

  return (
    <Tooltip content={{ title: goal.name, body, lines: [{ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.260.26'), value: formatPercent(satisfaction), valueColor: colour }] }} position="right" delay={200}>
      <div className="powerbloc-goal-row">
        <div className="powerbloc-goal-icon">
          <img src={getGoalIcon(satisfaction)} alt="" draggable={false} />
        </div>
        <div className="powerbloc-goal-main">
          <div className="powerbloc-goal-name">{goal.name}</div>
          <PowerBlocBar value={satisfaction} colour={colour} size="sm" />
        </div>
        <div className="powerbloc-goal-value" style={{ color: colour }}>{formatPercent(satisfaction)}</div>
      </div>
    </Tooltip>
  );
}

function MemberIdentityCell({ member }: { member: PowerBlocMember }) {
  return (
    <div className="powerbloc-member-identity">
      <PersonTooltip characterId={member.id}>
        <Portrait personId={member.id} name={member.name} size="sm" showBorder={member.isLeader} />
      </PersonTooltip>
      <div className="powerbloc-member-main">
        <span className="powerbloc-member-name">{member.name}</span>
        <span className="powerbloc-member-role">{member.role}</span>
        {member.affiliation ? <span className="powerbloc-member-affiliation">{member.affiliation}</span> : null}
      </div>
    </div>
  );
}

function playerMember(bloc: PowerBloc, playerCharacterId: string | null | undefined): PowerBlocMember | undefined {
  if (!playerCharacterId) return undefined;
  return bloc.members?.find(member => member.id === playerCharacterId);
}

function playerInBloc(bloc: PowerBloc, playerCharacterId: string | null | undefined): boolean {
  return Boolean(playerCharacterId && (bloc.playerIsMember || bloc.leaderId === playerCharacterId || playerMember(bloc, playerCharacterId)));
}

function SubjectActionCard({
  action,
  disabled,
  disabledReason,
  onClick,
}: {
  action: SubjectBlocAction;
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
}) {
  return (
    <InteractionCard
      title={webUIText(action.titleKey)}
      description={webUIText(action.bodyKey)}
      image={action.icon}
      meta={disabledReason ? <span className="powerbloc-subject-action-reason">{disabledReason}</span> : undefined}
      onClick={disabled ? undefined : onClick}
    />
  );
}

function SubjectActionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="powerbloc-subject-action-group">
      <div className="powerbloc-panel-heading">{title}</div>
      <div className="powerbloc-action-list">
        {children}
      </div>
    </div>
  );
}

function SubjectPowerBlocActions({
  bloc,
  playerCharacterId,
  memberActionsOnly = false,
}: {
  bloc: PowerBloc;
  playerCharacterId: string | null | undefined;
  memberActionsOnly?: boolean;
}) {
  const subjectActions = usePowerBlocSubjectActionsBridge();
  const isMember = playerInBloc(bloc, playerCharacterId);
  const handleJoin = React.useCallback(() => {
    setPowerBlocMembershipAndRefresh(bloc.id, true);
  }, [bloc.id]);
  const handleLeave = React.useCallback(() => {
    setPowerBlocMembershipAndRefresh(bloc.id, false);
  }, [bloc.id]);
  const handleFormPersonalBloc = React.useCallback(() => {
    formPersonalPowerBlocAndRefresh();
  }, []);

  if (!isMember && !memberActionsOnly) {
    const disabled = !bloc.canPlayerJoin;
    const disabledReason = disabled ? bloc.canPlayerJoinReason : undefined;
    const card = <SubjectActionCard action={SUBJECT_JOIN_ACTION} disabled={disabled} disabledReason={disabledReason} onClick={handleJoin} />;
    const formPersonalBlocDisabled = !subjectActions.canFormPersonalBloc;
    const formPersonalBlocReason = formPersonalBlocDisabled ? subjectActions.formPersonalBlocReason : undefined;
    const formPersonalBlocCard = (
      <SubjectActionCard
        action={SUBJECT_FORM_PERSONAL_BLOC_ACTION}
        disabled={formPersonalBlocDisabled}
        disabledReason={formPersonalBlocReason}
        onClick={handleFormPersonalBloc}
      />
    );

    return (
      <SubjectActionGroup
        title={webUIText('PowerBlocs.SubjectAvailableActions')}
      >
        {disabledReason ? (
          <Tooltip content={{ title: webUIText('PowerBlocs.SubjectJoin'), body: disabledReason }} position="left" delay={150}>
            {card}
          </Tooltip>
        ) : card}
        {formPersonalBlocReason ? (
          <Tooltip content={{ title: webUIText('PowerBlocs.SubjectAction.FormPersonalBloc'), body: formPersonalBlocReason }} position="left" delay={150}>
            {formPersonalBlocCard}
          </Tooltip>
        ) : formPersonalBlocCard}
      </SubjectActionGroup>
    );
  }

  if (!isMember) {
    return null;
  }

  return (
    <SubjectActionGroup
      title={webUIText('PowerBlocs.SubjectMemberActions')}
    >
      <SubjectActionCard action={SUBJECT_LEAVE_ACTION} onClick={handleLeave} />
    </SubjectActionGroup>
  );
}

const PowerBlocSidebar: React.FC<PowerBlocSidebarProps> = ({ bloc, onClose }) => {
  const { openScreen, openSidebar, showAdvisor } = useGameActions();
  const { debugMode, gameDay } = useGameState();
  const playerFactionId = usePlayerFactionId();
  const playerFaction = useFaction(playerFactionId);
  const [showAllMembers, setShowAllMembers] = React.useState(false);
  const totalStrength = bloc.strength + bloc.imperialStrength;
  const blocPct = totalStrength > 0 ? (bloc.strength / totalStrength) * 100 : 50;
  const imperialPct = 100 - blocPct;
  const members = bloc.members ?? [];
  const leader = members.find(member => member.isLeader);
  const canShowMoreMembers = !showAllMembers && members.length > 3;
  const typeLabel = getTypeBadgeLabel(bloc.subtype || bloc.type);
  const typeColour = getTypeBadgeColour(bloc.type);
  const modifiers = currentModifiers(bloc);
  const subjectMode = playerFaction?.diplomaticStatus === 'subject';
  const playerCharacterId = playerFaction?.rulerId ?? null;
  const isPlayerBlocLeader = subjectMode && !!playerCharacterId && bloc.leaderId === playerCharacterId;
  const handleRichLinkClick = React.useCallback((type: string, id: string) => {
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

  const { state: blocInteractionsState, start: startBlocInteraction, cancel: cancelBlocInteraction } =
    useBlocInteractionsBridge(bloc.id);
  const liveBlocInteractions = blocInteractionsState?.interactions ?? [];
  const visibleBlocInteractions = liveBlocInteractions.filter(interaction => interaction.availability !== 'hidden' || interaction.inProgress);
  const showBlocInteractionActions = !subjectMode || visibleBlocInteractions.length > 0;
  const memberCellClass = (id: PowerBlocMemberColumnKey) => `powerbloc-member-cell powerbloc-member-cell--${id}`;
  const memberColumns: Array<DataTableColumn<PowerBlocMember, PowerBlocMemberColumnKey>> = [
    {
      id: 'member',
      label: webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.303.29'),
      width: '62%',
      className: memberCellClass('member'),
      headerClassName: memberCellClass('member'),
      render: member => <MemberIdentityCell member={member} />,
      sortValue: member => member.name,
      searchValue: member => `${member.name} ${member.role} ${member.affiliation ?? ''}`,
    },
    {
      id: 'influence',
      label: webUIText('PowerBlocs.Influence'),
      width: '20%',
      align: 'right',
      className: memberCellClass('influence'),
      headerClassName: memberCellClass('influence'),
      render: member => member.influence !== undefined ? formatNumber(member.influence) : '',
      sortValue: member => member.influence ?? -1,
    },
    {
      id: 'loyalty',
      label: webUIText('Common.Loyalty'),
      width: '18%',
      align: 'right',
      className: memberCellClass('loyalty'),
      headerClassName: memberCellClass('loyalty'),
      render: member => member.loyalty !== undefined ? formatNumber(member.loyalty) : '',
      sortValue: member => member.loyalty ?? -1,
    },
  ];

  return (
    <div className="sidebar sidebar--right sidebar--visible powerbloc-sidebar">
      <SidebarToolbar
        onClose={onClose}
        closePosition="start"
        actionButtons={[
          {
            icon: '/assets/ui/I_HelpIcon.png',
            tooltip: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.144.9'),
            tooltipBody: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.144.10'),
            onClick: () => showAdvisor('powerBlocSidebar', { force: true }),
          },
        ]}
      />

      <div className="sidebar-header powerbloc-hero-header">
        {bloc.headerImage ? <div className="powerbloc-hero-bg" style={{ backgroundImage: `url(${bloc.headerImage})` }} /> : null}
        {bloc.iconKey ? <img src={bloc.iconKey} alt="" className="powerbloc-hero-icon" draggable={false} /> : null}
        <div className="powerbloc-hero-copy">
          <PowerBlocTitle name={bloc.name} />
          <div className="powerbloc-hero-meta">
            <span style={{ color: typeColour }}>{typeLabel}</span>
            <span className="powerbloc-hero-dot" />
            <span>{webUIText("Auto.Fix.Expr.componentssidebarsPowerBlocSidebar.158.1", { Value1: formatNumber(bloc.memberCount) })}</span>
          </div>
          <p className="powerbloc-description">{bloc.description}</p>
        </div>
      </div>

      <StyledScrollArea className="sidebar-content powerbloc-content">
        <div className="powerbloc-summary-panel">
          <div className="powerbloc-leader-card">
            <PersonTooltip characterId={bloc.leaderId || bloc.leaderName}>
              <Portrait personId={bloc.leaderId} name={bloc.leaderName} size="lg" showBorder />
            </PersonTooltip>
            <div className="powerbloc-leader-info">
              <div className="powerbloc-panel-heading"><WebUIText textKey="Auto.ComponentsSidebarsPowerBlocSidebar.171.1" /></div>
              <div className="powerbloc-leader-name">{bloc.leaderName}</div>
              {leader?.role ? <div className="powerbloc-leader-role">{leader.role}</div> : null}
            </div>
          </div>

          <div className="powerbloc-summary-stats">
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.191.18'), body: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.191.19'), lines: [{ label: webUIText('Auto.Prop.ComponentsSidebarsPowerBlocSidebar.191.20'), get value() { return webUIText("Auto.Prop.componentssidebarsPowerBlocSidebar.191.1", { Happiness: bloc.happiness }); }, valueColor: getHappinessColour(bloc.happiness) }] }} position="right" delay={150}>
              <div className="powerbloc-happiness-section">
                <div className="powerbloc-happiness-label">
                  <span className="powerbloc-happiness-text"><WebUIText textKey="Auto.ComponentsSidebarsPowerBlocSidebar.193.2" /></span>
                  <span className="powerbloc-happiness-value" style={{ color: getHappinessColour(bloc.happiness) }}>
                    {formatPercent(bloc.happiness)}
                  </span>
                </div>
                <PowerBlocBar value={bloc.happiness} colour={getHappinessColour(bloc.happiness)} size="md" />
              </div>
            </Tooltip>

              <div className="powerbloc-strength-section">
                <div className="powerbloc-strength-labels">
                <span className="powerbloc-strength-title">{webUIText('PowerBlocs.StrengthLabel')}</span>
                <span className="powerbloc-strength-value comparison-strength-value comparison-strength-value--red">{formatNumber(bloc.strength)}</span>
              </div>
              <Tooltip content={{
                title: webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.212.21'),
                lines: [
                  { label: bloc.name, value: formatNumber(bloc.strength), valueColor: 'var(--red)' },
                  { label: webUIText('PowerBlocs.ImperialStrength'), value: formatNumber(bloc.imperialStrength), valueColor: 'var(--gold)' },
                ],
              }} position="left" delay={150}>
                <div className="sidebar-comparison-track powerbloc-strength-track">
                  <div
                    className="sidebar-comparison-fill-left"
                    style={{ width: blocPct + '%' }}
                  />
                  <div
                    className="sidebar-comparison-fill-right"
                    style={{ width: imperialPct + '%' }}
                  />
                </div>
              </Tooltip>
            </div>
          </div>
        </div>

        {debugMode && (
          <div className="powerbloc-debug-panel">
            <SectionHeading title={webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.181.13')} />
            <div className="sidebar-debug-rows">
              <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.183.14')} value={`#${formatNumber(bloc.debugShortId ?? 0)}`} />
              {bloc.leaderDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.184.15')} value={`#${formatNumber(bloc.leaderDebugShortId)}`} /> : null}
              <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.185.16')} value={formatNumber(bloc.unhappyDays ?? 0)} />
              <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.186.17')} value={formatNumber(bloc.failedDemandCount ?? 0)} />
            </div>
          </div>
        )}

        {!subjectMode ? <CurrentDemandSection demand={bloc.activeDemand} escalationStage={bloc.escalationStage} onLinkClick={handleRichLinkClick} currentGameDay={gameDay} /> : null}
        <CurrentEffectsSection modifiers={modifiers} />

        <div className="powerbloc-goals-actions-panel">
          <div className="powerbloc-goals-column">
            <div className="powerbloc-panel-heading">{webUIText('Auto.Attr.ComponentsSidebarsPowerBlocSidebar.258.25')}</div>
            <div className="powerbloc-goal-list">
              {bloc.goals.map((goal) => (
                <GoalRow key={goal.name} goal={goal} />
              ))}
            </div>
          </div>
          <div className="powerbloc-actions-column">
            {showBlocInteractionActions ? (
              <>
                <div className="powerbloc-panel-heading">{webUIText(subjectMode ? 'PowerBlocs.SubjectAvailableActions' : 'Auto.Attr.ComponentsSidebarsPowerBlocSidebar.270.28')}</div>
                <div className="powerbloc-action-list">
                  {visibleBlocInteractions.length > 0 ? visibleBlocInteractions.map(i => {
                    const matchesOutcome = blocInteractionsState?.lastCompletedInteractionId === i.id;
                    const outcome: 'success' | 'failure' | undefined = matchesOutcome
                      ? blocInteractionsState!.lastInteractionSucceeded ? 'success' : 'failure'
                      : undefined;
                    const outcomeKey = matchesOutcome
                      ? `${blocInteractionsState!.lastInteractionCompletedDate}:${i.id}`
                      : undefined;
                    const cardKey = `bloc:${bloc.id}:${i.id}`;
                    return (
                      <Tooltip key={cardKey} content={buildBlocInteractionTooltip(i, bloc.id)} position="left" delay={150} variant="sidebar">
                        <InteractionCard
                          title={i.name}
                          description={i.description}
                          image={i.iconUrl ?? '/assets/icons/I_PowerBlocs.png'}
                          bgImage={i.backgroundUrl}
                          durationDays={i.durationDays}
                          remainingDays={i.remainingDays}
                          inProgress={i.inProgress}
                          outcome={outcome}
                          outcomeText={matchesOutcome ? blocInteractionsState!.lastInteractionOutcomeText : undefined}
                          outcomeKey={outcomeKey}
                          cooldownDays={i.cooldownDays}
                          cooldownRemainingDays={i.cooldownRemainingDays}
                          tutorialTarget={`Interaction:${i.id}${i.id === 'makepromiseinteraction' && bloc.definitionKey === 'loyalistbloc' ? ' LoyalistMakePromiseButton' : ''}`}
                          onClick={i.availability === 'available' && !i.inProgress ? () => startBlocInteraction(i.id) : undefined}
                          onCancel={i.inProgress ? cancelBlocInteraction : undefined}
                        />
                      </Tooltip>
                    );
                  }) : <span className="powerbloc-action-empty">{webUIText('PowerBlocs.NoActions')}</span>}
                </div>
              </>
            ) : null}
            {subjectMode ? (
              <SubjectPowerBlocActions bloc={bloc} playerCharacterId={playerCharacterId} memberActionsOnly={isPlayerBlocLeader} />
            ) : null}
          </div>
        </div>

        <div className="powerbloc-members-panel">
          <div className="powerbloc-panel-heading">{webUIText('PowerBlocs.KeyMembers')}</div>
          <DataTable
            rows={members}
            columns={memberColumns}
            rowKey={member => member.id}
            defaultSortKey="influence"
            defaultSortDirection="desc"
            rowLimit={showAllMembers ? undefined : 3}
            className="powerbloc-member-table-block"
            wrapperClassName="powerbloc-member-table-wrapper"
            tableClassName="powerbloc-member-table"
            headerGroupClassName="powerbloc-member-table-head-group"
            headerRowClassName="powerbloc-member-table-head"
            bodyClassName="powerbloc-member-table-body"
            rowClassName="powerbloc-member-row"
            virtualized={false}
            emptyLabel={<WebUIText textKey="Auto.ComponentsSidebarsPowerBlocSidebar.305.5" />}
          />
          {canShowMoreMembers ? (
            <button type="button" className="powerbloc-view-members" onMouseDown={() => setShowAllMembers(true)}>
              {webUIText('PowerBlocs.ViewAllMembers')}
            </button>
          ) : null}
        </div>
      </StyledScrollArea>
    </div>
  );
};

export default React.memo(PowerBlocSidebar);

function PowerBlocSidebarSlot({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const bloc = usePowerBlocBridge(sidebarId);
  if (!bloc) {
    return (
      <div className="sidebar sidebar--right sidebar--visible powerbloc-sidebar">
        <SidebarToolbar onClose={onClose} closePosition="start" />
        <div className="sidebar-header">
          <span className="sidebar-title"><WebUIText textKey="Auto.ComponentsSidebarsPowerBlocSidebar.330.6" /></span>
        </div>
        <StyledScrollArea className="sidebar-content">
          <p className="powerbloc-description"><WebUIText textKey="Auto.ComponentsSidebarsPowerBlocSidebar.333.7" /></p>
        </StyledScrollArea>
      </div>
    );
  }
  return <PowerBlocSidebar bloc={bloc} onClose={onClose} />;
}

registerSidebar({
  id: 'powerbloc',
  side: 'right',
  component: PowerBlocSidebarSlot,
  advisorTopic: 'powerBlocSidebar',
});

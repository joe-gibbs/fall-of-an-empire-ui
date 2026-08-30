import { useCallback, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Portrait from '../../common/portraits/Portrait';
import GameBar from '../../common/data-display/bars/GameBar';
import GameButton from '../../common/buttons/GameButton';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import FactionRoundel from '../../common/entities/FactionRoundel';
import InteractionCard from '../../common/interactions/InteractionCard';
import InfoRow from '../../common/data-display/stats/InfoRow';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { enterCourtAppointmentContest, type CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import { useCourtAppointmentContests, useCourtPositions, useFaction, useProvinceModeOverview } from '../../../data-source/index';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import {
  refreshDiplomacyOverviewBridge,
  setAutoAssignGovernorsBridge,
  useDiplomacyOverviewBridge,
  type DiplomacyOverviewState,
} from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
import { useGameActions } from '../../../context/GameContext';
import { GOVERNOR_MISSION_ICON } from '../../../utils/iconMaps';
import { sidebarTypeForEntity } from '../../common/entities/entityLinkUtils';
import { renderRichText } from '../../../utils/richText';
import type { PortraitLayerData } from '../../../data/types';
import type { AppointmentContestView } from '../../../bridge/characters/useCourtAppointmentContestsBridge';
import { runCourtOfficeAction, runGovernorMissionAction, type ProvinceModeCourtOfficeAction, type ProvinceModeMissionStatus, type ProvinceModeOverview } from '../../../bridge/provinces/useProvinceModeOverviewBridge';
import RegionGovernorAppointmentModal from '../../modals/characters/RegionGovernorAppointmentModal';
import Tooltip from '../../common/tooltips/Tooltip';
import { cultureIconPath } from '../../../utils/cultureIcons';
import { registerScreen } from '../../../registry/index';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { CourtPositionsPanel, FactionModifierCard, PolicyEntry } from './FactionOverviewShared';
import './GovernorFactionOverviewScreen.css';

type TabId = 'province' | 'missions' | 'governors' | 'empire' | 'court' | 'appointments';
type RegionalGovernor = DiplomacyOverviewState['regionalGovernors'][number];

type WarningStageTone = 'favoured' | 'stable' | 'active' | 'danger' | 'critical';

interface WarningStage {
  id: string;
  labelKey: string;
  tooltipKey: string;
  tone: WarningStageTone;
  icon: string;
}

interface ThreatRow {
  id: string;
  icon: string;
  labelKey?: string;
  label?: string;
  description?: string;
  value: number;
  remainingDays?: number;
  tone: 'high' | 'medium' | 'low';
}

interface StandingModifierRow {
  id: string;
  icon: string;
  labelKey?: string;
  label?: string;
  description?: string;
  value: number;
  remainingDays: number;
  tone: 'positive' | 'negative' | 'neutral';
}

interface MissionRow {
  id: string;
  missionTypeId?: string;
  icon: string;
  titleKey?: string;
  title?: string;
  bodyKey?: string;
  body?: string;
  rewardKey?: string;
  reward?: string;
  status: ProvinceModeMissionStatus;
  deadlineDays?: number;
  deadlinePercent?: number;
  targetName?: string;
  primaryAction?: string;
  primaryActionLabel?: string;
  canRunPrimaryAction?: boolean;
}

type AppointmentStatus = 'leading' | 'contender' | 'player' | 'rival';

interface AppointmentCandidate {
  id: string;
  nameKey?: string;
  name?: string;
  portrait: string;
  portraitLayers?: PortraitLayerData;
  provinceKey?: string;
  provinceName?: string;
  opinion: number;
  stat: number;
  patronage: number;
  threat: number;
  multiContest?: number;
  total: number;
  status: AppointmentStatus;
  isPlayer?: boolean;
  rank?: number;
}

interface AppointmentRole {
  id: string;
  isContestData: boolean;
  positionKey?: string;
  icon: string;
  titleKey?: string;
  title?: string;
  bodyKey?: string;
  body?: string;
  categoryKey?: string;
  category?: string;
  primaryStatKey?: string;
  primaryStatLabel?: string;
  primaryStatIcon: string;
  currentHolderKey?: string;
  currentHolderId?: string;
  currentHolderName?: string;
  remainingDays: number;
  availableInDays: number;
  contestWindowDays?: number;
  termYears?: number;
  isOpen: boolean;
  canPlayerEnter?: boolean;
  playerEntryBlockReason?: string;
  playerSubmitted: boolean;
  playerRank?: number;
  candidates: AppointmentCandidate[];
}

const RECALL_STATUS_ICON = '/assets/icons/RecallStatus/I_RecallStatus_Overview.png';

const WARNING_STAGES: WarningStage[] = [
  { id: 'favoured', labelKey: 'ProvinceMode.Warning.Favoured', tooltipKey: 'ProvinceMode.Warning.FavouredTooltip', tone: 'favoured', icon: '/assets/icons/RecallStatus/I_RecallStatus_Favoured.png' },
  { id: 'stable', labelKey: 'ProvinceMode.Warning.Stable', tooltipKey: 'ProvinceMode.Warning.StableTooltip', tone: 'stable', icon: '/assets/icons/RecallStatus/I_RecallStatus_Stable.png' },
  { id: 'recall-status', labelKey: 'ProvinceMode.Warning.Watched', tooltipKey: 'ProvinceMode.Warning.WatchedTooltip', tone: 'active', icon: '/assets/icons/RecallStatus/I_RecallStatus_Watched.png' },
  { id: 'recall-warning', labelKey: 'ProvinceMode.Warning.RecallWarning', tooltipKey: 'ProvinceMode.Warning.RecallWarningTooltip', tone: 'danger', icon: '/assets/icons/RecallStatus/I_RecallStatus_Warning.png' },
  { id: 'recall-ordered', labelKey: 'ProvinceMode.Warning.RecallOrdered', tooltipKey: 'ProvinceMode.Warning.RecallOrderedTooltip', tone: 'critical', icon: '/assets/icons/RecallStatus/I_RecallStatus_Ordered.png' },
];

function scoreColour(score: number): string {
  if (score >= 65) return 'var(--green)';
  if (score >= 40) return 'var(--yellow)';
  return 'var(--orange)';
}

function threatColour(score: number): string {
  if (score >= 60) return 'var(--red)';
  if (score >= 35) return 'var(--orange)';
  return 'var(--text-muted)';
}

function threatTone(tone: string): ThreatRow['tone'] {
  if (tone === 'high' || tone === 'medium' || tone === 'low') return tone;
  return 'low';
}

function standingTone(tone: string): StandingModifierRow['tone'] {
  if (tone === 'positive' || tone === 'negative' || tone === 'neutral') return tone;
  return 'neutral';
}

function missionStatusKey(status: MissionRow['status']): string {
  switch (status) {
    case 'succeeded': return 'ProvinceMode.Mission.StatusSucceeded';
    case 'failed': return 'ProvinceMode.Mission.StatusFailed';
    default: return 'ProvinceMode.Mission.StatusActive';
  }
}

function appointmentElapsedDays(role: AppointmentRole, contestWindowDays: number): number {
  if (contestWindowDays <= 0) return 0;
  return Math.max(0, contestWindowDays - role.remainingDays);
}

function keyedText(t: ReturnType<typeof useWebUIText>, key: string | undefined, fallback = ''): string {
  return key ? t(key) : fallback;
}

function appointmentRoleTitle(role: AppointmentRole, t: ReturnType<typeof useWebUIText>): string {
  return role.title ?? keyedText(t, role.titleKey);
}

function appointmentRoleBody(role: AppointmentRole, t: ReturnType<typeof useWebUIText>): string {
  return role.body ?? keyedText(t, role.bodyKey);
}

function appointmentRoleCategory(role: AppointmentRole, t: ReturnType<typeof useWebUIText>): string {
  return role.category ?? keyedText(t, role.categoryKey);
}

function appointmentPrimaryStat(role: AppointmentRole, t: ReturnType<typeof useWebUIText>): string {
  return role.primaryStatLabel ?? keyedText(t, role.primaryStatKey);
}

function appointmentCurrentHolder(role: AppointmentRole, t: ReturnType<typeof useWebUIText>): string {
  return role.currentHolderName ?? keyedText(t, role.currentHolderKey);
}

function appointmentCandidateName(candidate: AppointmentCandidate, t: ReturnType<typeof useWebUIText>): string {
  return candidate.name ?? keyedText(t, candidate.nameKey);
}

function appointmentCandidateHome(candidate: AppointmentCandidate, t: ReturnType<typeof useWebUIText>): string {
  if (candidate.provinceName) return t('ProvinceMode.Competition.From', { Name: candidate.provinceName });
  return t('ProvinceMode.Competition.Province', { Name: keyedText(t, candidate.provinceKey) });
}

function governorOverviewTabFromScreenId(screenId: string | null): TabId {
  const normalised = (screenId ?? '').toLowerCase();
  if (normalised === 'missions') return 'missions';
  if (normalised === 'governors' || normalised === 'regionalgovernors' || normalised === 'regiongovernors') return 'governors';
  if (normalised === 'empire' || normalised === 'imperial') return 'empire';
  if (normalised === 'court' || normalised === 'imperialcourt') return 'court';
  if (normalised === 'appointments') return 'appointments';
  return 'province';
}

function primaryStatLabelKey(primaryStat: string): string {
  if (primaryStat === 'tactics') return 'Common.Tactics';
  if (primaryStat === 'authority') return 'Common.Authority';
  if (primaryStat === 'cunning') return 'Common.Cunning';
  if (primaryStat === 'governance') return 'Common.Governance';
  if (primaryStat === 'loyalty') return 'Common.Loyalty';
  return 'Common.Governance';
}

function primaryStatIcon(primaryStat: string): string {
  if (primaryStat === 'tactics') return '/assets/icons/StatIcons/I_Tactics.png';
  if (primaryStat === 'authority') return '/assets/icons/StatIcons/I_Authority.png';
  if (primaryStat === 'cunning') return '/assets/icons/StatIcons/I_Cunning.png';
  if (primaryStat === 'governance') return '/assets/icons/StatIcons/I_Governance.png';
  if (primaryStat === 'loyalty') return '/assets/icons/StatIcons/I_Loyalty.png';
  return '/assets/icons/StatIcons/I_Governance.png';
}

function appointmentContestIcon(positionKey: string): string {
  if (positionKey === 'magistermilitum' || positionKey === 'magisternauticum') return '/assets/icons/I_ArmiesQuickButton.png';
  if (positionKey === 'masterofeconomy') return '/assets/icons/I_Coins.png';
  if (positionKey === 'masterofdiplomacy') return '/assets/icons/I_Diplomacy.png';
  if (positionKey === 'masterofreligion') return '/assets/icons/I_Religions.png';
  return '/assets/icons/I_Fame.png';
}

function appointmentRoleFromContest(contest: AppointmentContestView, t: ReturnType<typeof useWebUIText>): AppointmentRole {
  return {
    id: contest.positionKey,
    isContestData: true,
    positionKey: contest.positionKey,
    icon: contest.icon || appointmentContestIcon(contest.positionKey),
    title: contest.title,
    body: contest.description,
    category: contest.category,
    primaryStatLabel: t(primaryStatLabelKey(contest.primaryStat)),
    primaryStatIcon: primaryStatIcon(contest.primaryStat),
    currentHolderId: contest.currentHolderId,
    currentHolderName: contest.currentHolderName,
    remainingDays: contest.daysRemaining,
    availableInDays: contest.availableInDays,
    contestWindowDays: contest.contestWindowDays,
    termYears: contest.termYears,
    isOpen: contest.isOpen,
    canPlayerEnter: contest.canPlayerEnter,
    playerEntryBlockReason: contest.playerEntryBlockReason,
    playerSubmitted: contest.playerEntered,
    playerRank: contest.playerRank,
    candidates: contest.candidates.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      portrait: candidate.portrait,
      portraitLayers: candidate.portraitLayers,
      provinceName: candidate.provinceName,
      opinion: candidate.opinionScore,
      stat: candidate.primaryStatScore,
      patronage: candidate.patronageScore,
      threat: candidate.threatScore,
      multiContest: candidate.multiContestMalus,
      total: candidate.totalScore,
      status: candidate.rank === 1 ? 'leading' : candidate.isPlayerCharacter ? 'player' : 'contender',
      isPlayer: candidate.isPlayerCharacter,
      rank: candidate.rank,
    })),
  };
}

function appointmentRoleFromPosition(position: CourtPositionView, t: ReturnType<typeof useWebUIText>): AppointmentRole {
  const contestWindowDays = position.appointmentContestWindowDays ?? 0;
  const holderDaysRemaining = position.holderDaysRemaining ?? 0;
  const isOpen = position.appointmentContestOpen === true;

  return {
    id: position.key,
    isContestData: false,
    positionKey: position.key,
    icon: appointmentContestIcon(position.key),
    title: position.name,
    body: position.description,
    category: t(position.key === 'magistermilitum' || position.key === 'magisternauticum'
      ? 'ProvinceMode.Appointment.Category.Army'
      : 'ProvinceMode.Appointment.Category.Court'),
    primaryStatLabel: t(primaryStatLabelKey(position.primaryStat)),
    primaryStatIcon: primaryStatIcon(position.primaryStat),
    currentHolderId: position.holder?.id,
    currentHolderName: position.holder?.name ?? '',
    remainingDays: holderDaysRemaining,
    availableInDays: isOpen ? 0 : Math.max(0, holderDaysRemaining - contestWindowDays),
    contestWindowDays,
    termYears: position.appointmentTermYears,
    isOpen,
    canPlayerEnter: position.canPlayerEnterContest,
    playerEntryBlockReason: undefined,
    playerSubmitted: position.playerEnteredContest === true,
    playerRank: position.playerContestRank,
    candidates: [],
  };
}

function appointmentScoreValue(score: number | undefined, t: ReturnType<typeof useWebUIText>): string {
  return typeof score === 'number' ? formatNumber(score) : t('Common.None');
}

function appointmentPlayerScoreValue(score: number | undefined, rank: number | undefined, t: ReturnType<typeof useWebUIText>): string {
  if (typeof score !== 'number') {
    return t('Common.None');
  }

  if (rank !== undefined && rank > 0) {
    return t('ProvinceMode.Appointment.RankedScoreValue', {
      Rank: formatNumber(rank),
      Score: formatNumber(score),
    });
  }

  return formatNumber(score);
}

function formatAppointmentDayCount(days: number, t: ReturnType<typeof useWebUIText>): string {
  const safeDays = Math.max(0, Math.round(days));
  return t('Common.DayCount', {
    Days: formatNumber(safeDays),
    Unit: safeDays === 1 ? t('Common.Day') : t('Common.Days'),
  });
}

function formatAppointmentTermLength(termYears: number | undefined, t: ReturnType<typeof useWebUIText>): string {
  if (termYears === undefined || termYears <= 0) return t('Common.None');
  return t('ProvinceMode.Appointment.TermYears', { Years: formatNumber(termYears) });
}

function formatAppointmentTermDetail(daysRemaining: number, t: ReturnType<typeof useWebUIText>): string {
  if (daysRemaining <= 0) return t('CourtAppointment.TermComplete');
  return t('ProvinceMode.Appointment.TermRemainingDetail', {
    Value: formatAppointmentDayCount(daysRemaining, t),
  });
}

function appointmentEntryStatus(role: AppointmentRole, t: ReturnType<typeof useWebUIText>): string {
  if (!role.isOpen) {
    return t('ProvinceMode.Appointment.OpensInValue', {
      Time: formatAppointmentDayCount(role.availableInDays, t),
    });
  }

  if (role.canPlayerEnter === false) {
    return t('ProvinceMode.Appointment.Action.Unavailable');
  }

  return t('ProvinceMode.Appointment.Action.Available');
}

function appointmentEntryBlockReason(role: AppointmentRole, t: ReturnType<typeof useWebUIText>): string {
  if (!role.isOpen) {
    return t('ProvinceMode.Appointment.PutForward.OpensInBody', {
      Time: formatAppointmentDayCount(role.availableInDays, t),
    });
  }

  if (role.playerEntryBlockReason) {
    return role.playerEntryBlockReason;
  }

  if (role.canPlayerEnter === false) {
    return t('ProvinceMode.Appointment.PutForward.UnavailableBody');
  }

  return '';
}

function compareAppointmentRoles(left: AppointmentRole, right: AppointmentRole): number {
  const availableDiff = left.availableInDays - right.availableInDays;
  if (availableDiff !== 0) return availableDiff;
  return left.remainingDays - right.remainingDays;
}

function RecallStatusPanel({
  activeStage,
}: {
  activeStage: number;
}) {
  const t = useWebUIText();

  return (
    <div className="gfov-recall-status">
      <div className="gfov-recall-seal">
        <img src={RECALL_STATUS_ICON} alt="" draggable={false} />
      </div>
      <div className="gfov-recall-main">
        <div className="gfov-recall-heading">
          <span className="gfov-recall-title">{t('ProvinceMode.RecallStatusLabel')}</span>
        </div>
        <div className="gfov-recall-track">
          <div className="gfov-recall-stages">
            {WARNING_STAGES.map((stage, index) => {
              const state = index === activeStage ? 'active' : index < activeStage ? 'past' : 'future';
              return (
                <Tooltip
                  key={stage.id}
                  content={{ title: t(stage.labelKey), body: t(stage.tooltipKey) }}
                  position="top"
                  delay={150}
                  wrapperClassName="gfov-recall-stage-tooltip"
                >
                  <div className={`gfov-recall-stage gfov-recall-stage--${state} gfov-recall-stage--tone-${stage.tone}`}>
                    <span className="gfov-recall-stage-connector" aria-hidden="true" />
                    <span className="gfov-recall-stage-marker">
                      <img src={stage.icon} alt="" draggable={false} />
                    </span>
                    <span className="gfov-recall-stage-label">{t(stage.labelKey)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmperorPanel({ overview, onOpenCharacter }: { overview: ProvinceModeOverview | null; onOpenCharacter: (id: string) => void }) {
  const t = useWebUIText();
  const emperorName = overview?.emperor.name || '';
  return (
    <div className="gfov-emperor-panel">
      <div className="gfov-emperor-portrait">
        <Portrait
          personId={overview?.emperor.id}
          layers={overview?.emperor.portraitLayers}
          src={overview?.emperor.portrait}
          name={emperorName}
          size="md"
          showBadge={false}
          resolvePerson={false}
          onClick={() => overview?.emperor.id && onOpenCharacter(overview.emperor.id)}
        />
      </div>
      <div className="gfov-emperor-copy">
        <div className="gfov-emperor-name">{emperorName}</div>
        <p className="gfov-emperor-body">{t('ProvinceMode.EmperorBody')}</p>
      </div>
    </div>
  );
}

function EmpireStatCell({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: 'gold' | 'positive' | 'negative';
}) {
  return (
    <div className="gfov-empire-stat">
      <img className="gfov-empire-stat-icon" src={icon} alt="" draggable={false} />
      <div className="gfov-empire-stat-copy">
        <span className="gfov-empire-stat-label">{label}</span>
        <span className={`gfov-empire-stat-value${tone ? ` gfov-empire-stat-value--${tone}` : ''}`}>{value}</span>
      </div>
    </div>
  );
}

function EmpireTab({ overview, onOpenCharacter }: { overview: ProvinceModeOverview | null; onOpenCharacter: (id: string) => void }) {
  const t = useWebUIText();
  const imperialFaction = useFaction(overview?.imperialFaction.id);
  const summary = overview?.imperialFaction;
  const treasury = summary?.gold ?? 0;
  const income = summary?.income ?? 0;
  const expenses = summary?.expenses ?? 0;
  const net = summary?.netIncome ?? 0;
  const policies = imperialFaction?.policies ?? [];
  const modifiers = imperialFaction?.modifiers ?? [];
  const emperorName = overview?.emperor.name || '';
  const successorName = overview?.successor.name || '';

  return (
    <div className="gfov-empire-tab">
      <div className="gfov-empire-overview-summary">
        <div className="gfov-empire-identity-row">
          <div className="gfov-empire-overview-primary">
            <div className="gfov-empire-faction-header">
              <FactionRoundel
                factionId={summary?.id}
                colour={summary?.colour ?? '#6f2234'}
                secondaryColour={summary?.secondaryColour}
                cultureGroup={summary?.cultureGroup}
                emblem={summary?.emblem}
                name={summary?.name ?? ''}
                size="lg"
                showRing
                resolveFaction={false}
                diplomaticStatus={summary?.diplomaticStatus}
                subjectSubtype={summary?.subjectSubtype}
                isPlayer={summary?.isPlayer}
                isRebel={summary?.isRebel}
              />
              <Portrait
                personId={overview?.emperor.id}
                layers={overview?.emperor.portraitLayers}
                src={overview?.emperor.portrait}
                name={emperorName}
                size="xl"
                showBadge={false}
                resolvePerson={false}
                onClick={() => overview?.emperor.id && onOpenCharacter(overview.emperor.id)}
              />
              <div className="gfov-empire-faction-info">
                <div className="gfov-empire-ruler-name">{emperorName}</div>
                <div className="gfov-empire-faction-name">{summary?.name ?? ''}</div>
                <div className="gfov-empire-identity-items">
                  <span className="gfov-empire-identity-item">
                    <img
                      className="gfov-empire-identity-icon"
                      src={cultureIconPath(imperialFaction?.cultureId || imperialFaction?.cultureInfo?.id)}
                      alt=""
                      draggable={false}
                    />
                    {summary?.culture ?? ''}
                  </span>
                  <span className="gfov-empire-identity-item">
                    <img className="gfov-empire-identity-icon" src="/assets/icons/I_Religions.png" alt="" draggable={false} />
                    {summary?.religion ?? ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="gfov-empire-successor">
            <Portrait
              personId={overview?.successor.id}
              layers={overview?.successor.portraitLayers}
              src={overview?.successor.portrait}
              name={successorName}
              size="lg"
              showBadge={false}
              resolvePerson={false}
              onClick={() => overview?.successor.id && onOpenCharacter(overview.successor.id)}
            />
            <div className="gfov-empire-successor-info">
              <div className="gfov-empire-successor-title">{t('FactionOverview.LikelySuccessor')}</div>
              <div className="gfov-empire-successor-name">{successorName}</div>
              <div className="gfov-empire-successor-relation">{overview?.successor.title ?? ''}</div>
            </div>
          </div>
        </div>

        <div className="gfov-empire-metrics-row">
          <div className="gfov-empire-finance-summary">
            <div className="gfov-empire-finance-top-row">
              <div className="gfov-empire-finance-primary">
                <span className="gfov-empire-detail-label">{t('Common.Treasury')}</span>
                <span className="gfov-empire-finance-treasury">{formatNumber(treasury)}</span>
              </div>
              <div className="gfov-empire-finance-primary">
                <span className="gfov-empire-detail-label">{t('FactionOverview.Net')}</span>
                <span className={`gfov-empire-finance-net${net >= 0 ? ' gfov-empire-finance-net--positive' : ' gfov-empire-finance-net--negative'}`}>
                  {formatSignedNumber(net)}
                </span>
              </div>
            </div>
            <div className="gfov-empire-finance-breakdown">
              <InfoRow
                label={t('FactionOverview.Income')}
                value={formatSignedNumber(income)}
                valueColor={income >= 0 ? 'positive' : 'negative'}
              />
              <InfoRow
                label={t('FactionOverview.Expenses')}
                value={formatSignedNumber(-expenses)}
                valueColor={expenses > 0 ? 'negative' : 'positive'}
              />
            </div>
          </div>

          <div className="gfov-empire-stats-bar">
            <EmpireStatCell icon="/assets/icons/I_Domain.png" label={t('Economy.Settlements')} value={formatNumber(summary?.settlements ?? 0)} />
            <EmpireStatCell icon="/assets/icons/I_Population.png" label={t('Common.Population')} value={formatNumber(summary?.population ?? 0)} />
            <EmpireStatCell icon="/assets/icons/I_ArmiesQuickButton.png" label={t('FactionOverview.ArmyStrength')} value={formatNumber(summary?.strength ?? 0)} />
            <EmpireStatCell icon="/assets/icons/I_Capital.png" label={t('FactionOverview.Capital')} value={summary?.capital ?? ''} />
          </div>
        </div>
      </div>

      <SectionHeading variant="ornate" title={t('FactionOverview.Modifiers')} />
      <div className="fov-modifier-grid gfov-empire-modifier-grid">
        {modifiers.map(modifier => (
          <FactionModifierCard key={modifier.key} modifier={modifier} />
        ))}
      </div>

      <div className="fov-policies-layout gfov-empire-policies-layout">
        <div className="fov-policies-col gfov-empire-policies-col">
          <SectionHeading variant="ornate" title={t('FactionOverview.Policies')} />
          <div className="fov-policies-list gfov-empire-policies-list">
            {policies.map(policy => (
              <PolicyEntry
                key={policy.id}
                factionId={summary?.id ?? ''}
                policy={policy}
                blockedByInteraction={false}
                readOnly
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentRoleCard({
  role,
  active,
  playerEntered,
  contestWindowDays,
  onSelect,
  onOpenCharacter,
}: {
  role: AppointmentRole;
  active: boolean;
  playerEntered: boolean;
  contestWindowDays: number;
  onSelect: () => void;
  onOpenCharacter: (id: string) => void;
}) {
  const t = useWebUIText();
  const visibleCandidates = playerEntered ? role.candidates : role.candidates.filter(candidate => !candidate.isPlayer);
  const leading = visibleCandidates.find(candidate => candidate.status === 'leading') ?? visibleCandidates[0];
  const elapsedDays = appointmentElapsedDays(role, contestWindowDays);
  const progressMax = Math.max(contestWindowDays, 1);
  const holderName = appointmentCurrentHolder(role, t);
  const holderLabel = holderName
    ? t('ProvinceMode.Appointment.CurrentHolder', { Name: holderName })
    : t('Common.Vacant');
  const timingDays = role.isOpen ? role.remainingDays : role.availableInDays;
  const timingLabel = role.isOpen ? t('ProvinceMode.Appointment.DecisionIn') : t('ProvinceMode.Appointment.OpensIn');
  const timingValue = formatAppointmentDayCount(timingDays, t);
  const termValue = formatAppointmentTermLength(role.termYears, t);
  const roleClassName = `gfov-appointment-role${active ? ' gfov-appointment-role--active' : ''}${playerEntered ? ' gfov-appointment-role--entered' : ''}`;

  return (
    <button
      type="button"
      className={roleClassName}
      onClick={onSelect}
    >
      <img className="gfov-appointment-role-icon" src={role.icon} alt="" draggable={false} />
      <div className="gfov-appointment-role-body">
        <div className="gfov-appointment-role-copy">
          <span className="gfov-appointment-role-title">{appointmentRoleTitle(role, t)}</span>
          <span className="gfov-appointment-role-meta">
            <span className="gfov-appointment-role-category">{appointmentRoleCategory(role, t)}</span>
            {playerEntered && <span className="gfov-appointment-race-star" aria-hidden="true">★</span>}
          </span>
          <span className="gfov-appointment-role-holder">{holderLabel}</span>
          <div className="gfov-appointment-role-progress">
            <GameBar value={elapsedDays} max={progressMax} colour="var(--gold)" size="sm" />
          </div>
        </div>
        <div className="gfov-appointment-role-status">
          <span className="gfov-appointment-role-status-cell">
            <span>{timingLabel}</span>
            <strong>{timingValue}</strong>
          </span>
          <span className="gfov-appointment-role-status-cell gfov-appointment-role-status-cell--leader">
            <span>{t('ProvinceMode.Appointment.LeadCandidate')}</span>
            <strong className="gfov-appointment-role-leading">
              {leading && (
                <Portrait
                  personId={leading.id}
                  src={leading.portrait}
                  layers={leading.portraitLayers}
                  name={appointmentCandidateName(leading, t)}
                  size="sm"
                  className="gfov-appointment-role-leading-portrait"
                  showBadge={false}
                  resolvePerson={false}
                  onClick={() => onOpenCharacter(leading.id)}
                />
              )}
              <span>{leading ? appointmentCandidateName(leading, t) : t('Common.None')}</span>
            </strong>
          </span>
          <span className="gfov-appointment-role-status-cell">
            <span>{t('ProvinceMode.Appointment.Term')}</span>
            <strong>{termValue}</strong>
          </span>
        </div>
      </div>
    </button>
  );
}

function AppointmentCandidateRow({
  candidate,
  role,
  rank,
  onOpenCharacter,
}: {
  candidate: AppointmentCandidate;
  role: AppointmentRole;
  rank: number;
  onOpenCharacter: (id: string) => void;
}) {
  const t = useWebUIText();
  const scoreColor = scoreColour(candidate.total);
  const multiContest = candidate.multiContest ?? 0;

  return (
    <div className={`gfov-appointment-candidate${candidate.isPlayer ? ' gfov-appointment-candidate--player' : ''}`}>
      <div className="gfov-appointment-rank">
        {formatNumber(candidate.rank ?? rank)}
      </div>
      <Portrait
        personId={candidate.id}
        src={candidate.portrait}
        layers={candidate.portraitLayers}
        name={appointmentCandidateName(candidate, t)}
        size="sm"
        showBadge={false}
        resolvePerson={false}
        onClick={() => onOpenCharacter(candidate.id)}
      />
      <div className="gfov-appointment-candidate-main">
        <div className="gfov-appointment-candidate-name-row">
          <span className="gfov-appointment-candidate-name">{appointmentCandidateName(candidate, t)}</span>
          {candidate.isPlayer && <span className="gfov-appointment-race-star gfov-appointment-race-star--candidate" aria-hidden="true">★</span>}
        </div>
        <div className="gfov-appointment-candidate-sub">
          {appointmentCandidateHome(candidate, t)}
        </div>
        <div className="gfov-appointment-factor-list">
          <span><strong>{t('ProvinceMode.Appointment.Opinion')}</strong>{formatSignedNumber(candidate.opinion)}</span>
          <span><strong>{appointmentPrimaryStat(role, t)}</strong>{formatSignedNumber(candidate.stat)}</span>
          <span><strong>{t('ProvinceMode.Appointment.Patronage')}</strong>{formatSignedNumber(candidate.patronage)}</span>
          <span><strong>{t('ProvinceMode.Appointment.Threat')}</strong>{formatSignedNumber(candidate.threat)}</span>
          {multiContest !== 0 && <span><strong>{t('ProvinceMode.Appointment.MultipleContests')}</strong>{formatSignedNumber(multiContest)}</span>}
        </div>
      </div>
      <div className="gfov-appointment-score">
        <span className="gfov-appointment-score-value" style={{ color: scoreColor }}>{formatNumber(candidate.total)}</span>
        <GameBar value={candidate.total} max={100} colour={scoreColor} size="sm" />
      </div>
    </div>
  );
}

function AppointmentSummaryCell({
  label,
  personId,
  portrait,
  portraitLayers,
  name,
  value,
  detail,
  toneColour,
  wide = false,
  onOpenCharacter,
}: {
  label: string;
  personId?: string;
  portrait?: string;
  portraitLayers?: PortraitLayerData;
  name?: string;
  value: string;
  detail?: string;
  toneColour?: string;
  wide?: boolean;
  onOpenCharacter: (id: string) => void;
}) {
  const showPortrait = Boolean(personId || portrait || portraitLayers);
  const resolvedName = name || value;

  return (
    <div className={`gfov-appointment-decision-cell${wide ? ' gfov-appointment-decision-cell--wide' : ''}`}>
      <span>{label}</span>
      <strong style={toneColour ? { color: toneColour } : undefined}>
        {showPortrait && (
          <Portrait
            personId={personId}
            src={portrait}
            layers={portraitLayers}
            name={resolvedName}
            size="sm"
            showBadge={false}
            resolvePerson={!portrait && !portraitLayers}
            onClick={personId ? () => onOpenCharacter(personId) : undefined}
          />
        )}
        <span className="gfov-appointment-summary-text">
          <span className="gfov-appointment-summary-main">{value}</span>
          {detail && <span className="gfov-appointment-summary-detail">{detail}</span>}
        </span>
      </strong>
    </div>
  );
}

function AppointmentsTab({ overview, onOpenCharacter }: { overview: ProvinceModeOverview | null; onOpenCharacter: (id: string) => void }) {
  const t = useWebUIText();
  const court = useCourtPositions(true);
  const contests = useCourtAppointmentContests(true);
  const contestRoles = contests?.contests.map(contest => appointmentRoleFromContest(contest, t)) ?? [];
  const contestPositionKeys = new Set(contestRoles.map(role => role.positionKey));
  const upcomingRoles = (court?.positions ?? [])
    .filter(position => !contestPositionKeys.has(position.key) && position.holder !== null)
    .map(position => appointmentRoleFromPosition(position, t));
  const courtPositionForRole = (role: AppointmentRole): CourtPositionView | undefined => (
    role.positionKey ? court?.positions.find(position => position.key === role.positionKey) : undefined
  );
  const displayRole = (role: AppointmentRole): AppointmentRole => {
    const position = courtPositionForRole(role);
    if (!position) return role;

    const contestWindowDays = role.isContestData
      ? role.contestWindowDays ?? 0
      : position.appointmentContestWindowDays ?? role.contestWindowDays ?? 0;
    const holderDaysRemaining = role.isContestData
      ? role.remainingDays
      : position.holderDaysRemaining ?? role.remainingDays;
    const isOpen = role.isContestData ? role.isOpen : position.appointmentContestOpen === true;
    const playerSubmitted = role.playerSubmitted || position.playerEnteredContest === true;
    return {
      ...role,
      currentHolderId: position.holder?.id ?? role.currentHolderId,
      currentHolderName: position.holder?.name ?? role.currentHolderName,
      remainingDays: holderDaysRemaining,
      availableInDays: role.isContestData ? role.availableInDays : isOpen ? 0 : Math.max(0, holderDaysRemaining - contestWindowDays),
      contestWindowDays,
      termYears: position.appointmentTermYears ?? role.termYears,
      isOpen,
      canPlayerEnter: position.canPlayerEnterContest ?? role.canPlayerEnter,
      playerEntryBlockReason: role.playerEntryBlockReason,
      playerSubmitted,
      playerRank: role.playerRank && role.playerRank > 0 ? role.playerRank : undefined,
      candidates: role.candidates.map(candidate => (
        candidate.isPlayer && position.playerContestScore !== undefined
          ? { ...candidate, total: position.playerContestScore }
          : candidate
      )),
    };
  };
  const appointmentSettings = court?.positions.find(position => (
    (position.appointmentContestWindowDays ?? 0) > 0
  ));
  const contestWindowDays = appointmentSettings?.appointmentContestWindowDays ?? 0;
  const [activeRoleId, setActiveRoleId] = useState('');
  const [enteredRoleIds, setEnteredRoleIds] = useState<string[]>([]);
  const roles = [...contestRoles, ...upcomingRoles]
    .map(displayRole)
    .sort(compareAppointmentRoles)
    .slice(0, 5);
  const activeRole = roles.find(role => role.id === activeRoleId) ?? roles[0];

  if (!activeRole) {
    return (
      <div className="gfov-appointments-tab">
        <div className="gfov-appointments-layout">
          <div className="gfov-appointments-list-panel">
            <SectionHeading title={t('ProvinceMode.Appointment.NextRoles')} count={0} variant="ornate" />
            <div className="gfov-appointment-empty">{t('ProvinceMode.Appointment.NoOpenRoles')}</div>
          </div>
          <div className="gfov-appointments-detail-panel">
            <div className="gfov-appointment-empty gfov-appointment-empty--detail">
              <strong>{t('ProvinceMode.Appointment.NoOpenRoles')}</strong>
              <span>{t('ProvinceMode.Appointment.NoOpenRolesBody')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activePosition = courtPositionForRole(activeRole);
  const playerEntered = enteredRoleIds.includes(activeRole.id) || activeRole.playerSubmitted || activePosition?.playerEnteredContest === true;
  const visibleCandidates = playerEntered ? activeRole.candidates : activeRole.candidates.filter(candidate => !candidate.isPlayer);
  const roleContestWindowDays = activeRole.contestWindowDays ?? contestWindowDays;
  const elapsedDays = appointmentElapsedDays(activeRole, roleContestWindowDays);
  const progressMax = Math.max(roleContestWindowDays, 1);
  const canSubmitPlayer = activeRole.isOpen && !playerEntered && (activeRole.canPlayerEnter ?? activePosition?.canPlayerEnterContest ?? true);
  const submitStatus = playerEntered ? undefined : appointmentEntryStatus(activeRole, t);
  const submitDescription = playerEntered
    ? t('ProvinceMode.Appointment.PutForward.SubmittedBody')
    : canSubmitPlayer
      ? t('ProvinceMode.Appointment.PutForward.Body')
      : appointmentEntryBlockReason(activeRole, t);
  const leadingCandidate = activeRole.candidates[0];
  const leadingScore = typeof leadingCandidate?.total === 'number'
    ? leadingCandidate.total
    : undefined;
  const playerCandidate = activeRole.candidates.find(candidate => candidate.isPlayer);
  const rawPlayerScore = typeof playerCandidate?.total === 'number'
    ? playerCandidate.total
    : activePosition?.playerContestScore;
  const hasPlayerScore = typeof rawPlayerScore === 'number' && (rawPlayerScore > 0 || playerEntered || canSubmitPlayer);
  const playerScore = hasPlayerScore ? rawPlayerScore : undefined;
  const playerRank = playerCandidate?.rank
    ?? (activeRole.playerRank && activeRole.playerRank > 0 ? activeRole.playerRank : undefined);
  const scoreGap = typeof playerScore === 'number' && typeof leadingScore === 'number'
    ? playerScore - leadingScore
    : undefined;
  const scoreGapColour = scoreGap === undefined
    ? undefined
    : scoreGap >= 0
      ? 'var(--green)'
      : 'var(--orange)';
  const holderName = appointmentCurrentHolder(activeRole, t) || t('Common.Vacant');
  const holderTermDetail = formatAppointmentTermDetail(activeRole.remainingDays, t);
  const leadingName = leadingCandidate ? appointmentCandidateName(leadingCandidate, t) : t('Common.None');
  const playerName = overview?.governor.name ?? t('Common.None');
  const playerId = overview?.governor.id;
  const playerPortrait = overview?.governor.portrait;
  const playerPortraitLayers = overview?.governor.portraitLayers;
  const submitPlayer = () => {
    if (activeRole.positionKey) {
      enterCourtAppointmentContest(activeRole.positionKey).then(entered => {
        if (entered) {
          setEnteredRoleIds(ids => ids.includes(activeRole.id) ? ids : [...ids, activeRole.id]);
        }
      });
      return;
    }

    setEnteredRoleIds(ids => ids.includes(activeRole.id) ? ids : [...ids, activeRole.id]);
  };

  return (
    <div className="gfov-appointments-tab">
      <div className="gfov-appointments-layout">
        <div className="gfov-appointments-list-panel">
          <SectionHeading title={t('ProvinceMode.Appointment.NextRoles')} count={roles.length} variant="ornate" />
          <div className="gfov-appointment-role-list">
            {roles.map(role => (
              <AppointmentRoleCard
                key={role.id}
                role={role}
                active={role.id === activeRole.id}
                playerEntered={enteredRoleIds.includes(role.id) || role.playerSubmitted}
                contestWindowDays={role.contestWindowDays ?? contestWindowDays}
                onSelect={() => setActiveRoleId(role.id)}
                onOpenCharacter={onOpenCharacter}
              />
            ))}
          </div>
        </div>

        <div className="gfov-appointments-detail-panel">
          <div className="gfov-appointment-detail-header">
            <img src={activeRole.icon} alt="" draggable={false} />
            <div>
              <h2>{appointmentRoleTitle(activeRole, t)}</h2>
              <span>{appointmentRoleCategory(activeRole, t)}</span>
              <p>{appointmentRoleBody(activeRole, t)}</p>
            </div>
          </div>

          <div className="gfov-appointment-decision-row">
            <AppointmentSummaryCell
              label={t('CourtAppointment.CurrentHolder')}
              personId={activeRole.currentHolderId}
              name={holderName}
              value={holderName}
              detail={holderTermDetail}
              wide
              onOpenCharacter={onOpenCharacter}
            />
            <AppointmentSummaryCell
              label={t('ProvinceMode.Appointment.LeadingScore')}
              personId={leadingCandidate?.id}
              portrait={leadingCandidate?.portrait}
              portraitLayers={leadingCandidate?.portraitLayers}
              name={leadingName}
              value={leadingName}
              detail={leadingScore !== undefined ? t('ProvinceMode.Appointment.ScoreValue', { Score: appointmentScoreValue(leadingScore, t) }) : undefined}
              wide
              onOpenCharacter={onOpenCharacter}
            />
            {playerEntered && (
              <>
                <AppointmentSummaryCell
                  label={t('ProvinceMode.Appointment.YourScore')}
                  personId={playerId}
                  portrait={playerPortrait}
                  portraitLayers={playerPortraitLayers}
                  name={playerName}
                  value={playerName}
                  detail={appointmentPlayerScoreValue(playerScore, playerRank, t)}
                  wide
                  onOpenCharacter={onOpenCharacter}
                />
                <AppointmentSummaryCell
                  label={t('ProvinceMode.Appointment.ScoreGap')}
                  value={scoreGap !== undefined ? formatSignedNumber(scoreGap) : t('Common.None')}
                  toneColour={scoreGapColour}
                  onOpenCharacter={onOpenCharacter}
                />
              </>
            )}
          </div>

          <div className="gfov-appointment-progress-panel">
            <div className="gfov-appointment-progress-head">
              <span>{t('ProvinceMode.Appointment.Progress')}</span>
              <strong>{t('ProvinceMode.Appointment.ProgressValue', {
                Elapsed: formatNumber(elapsedDays),
                Total: formatNumber(roleContestWindowDays),
              })}</strong>
            </div>
            <GameBar value={elapsedDays} max={progressMax} colour="var(--gold)" size="sm" />
          </div>

          <div className="gfov-appointment-submit-action">
            <InteractionCard
              title={t(playerEntered ? 'ProvinceMode.Appointment.PutForward.SubmittedTitle' : 'ProvinceMode.Appointment.PutForward.Title')}
              description={submitDescription}
              image="/assets/icons/I_Fame.png"
              cooldown={submitStatus}
              durationDays={roleContestWindowDays}
              remainingDays={activeRole.remainingDays}
              inProgress={playerEntered}
              onClick={canSubmitPlayer ? submitPlayer : undefined}
              tutorialTarget={canSubmitPlayer ? 'EnterImperialCouncilContestButton' : undefined}
            />
          </div>

          <SectionHeading title={t('ProvinceMode.Appointment.Candidates')} count={visibleCandidates.length} variant="ornate" />
          <div className="gfov-appointment-candidate-list">
            {visibleCandidates.map((candidate, index) => (
              <AppointmentCandidateRow
                key={`${activeRole.id}:${candidate.id}`}
                candidate={candidate}
                role={activeRole}
                rank={index + 1}
                onOpenCharacter={onOpenCharacter}
              />
            ))}
            {visibleCandidates.length === 0 && (
              <div className="gfov-appointment-empty">
                {t(activeRole.isOpen ? 'ProvinceMode.Appointment.NoCandidatesOpen' : 'ProvinceMode.Appointment.NoCandidatesYet')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProvinceTab({ overview, onOpenCharacter }: { overview: ProvinceModeOverview | null; onOpenCharacter: (id: string) => void }) {
  const t = useWebUIText();
  const standingScore = overview?.standingScore ?? 0;
  const threatScore = overview?.threatScore ?? 0;
  const standingColour = scoreColour(standingScore);
  const threatColourValue = threatColour(threatScore);
  const reviewDays = overview?.nextReviewDays ?? 0;
  const reviewIntervalDays = overview?.reviewIntervalDays ?? 0;
  const reviewElapsedDays = overview ? reviewIntervalDays - reviewDays : 0;
  const governorName = overview?.governor.name || '';
  const provinceName = overview?.province.name || '';
  const threatRows: ThreatRow[] = (overview?.threatRows ?? []).map(row => ({ ...row, tone: threatTone(row.tone) }));
  const standingRows: StandingModifierRow[] = (overview?.standingRows ?? []).map(row => ({ ...row, tone: standingTone(row.tone) }));
  const recallStage = overview?.recallStage ?? 0;

  return (
    <div className="gfov-province-tab">
      <div className="gfov-governor-header">
        <div className="gfov-governor-portrait-frame">
          <Portrait
            personId={overview?.governor.id}
            layers={overview?.governor.portraitLayers}
            src={overview?.governor.portrait}
            name={governorName}
            size="lg"
            showBadge={false}
            resolvePerson={false}
            onClick={() => overview?.governor.id && onOpenCharacter(overview.governor.id)}
          />
        </div>
        <div className="gfov-governor-copy">
          <h2 className="gfov-governor-name">{governorName}</h2>
          <p className="gfov-governor-province">
            {t('ProvinceMode.ProvinceLabel')}: <strong>{provinceName}</strong>
          </p>
        </div>
        <div className="gfov-header-meters">
          <div className="gfov-meter-card">
            <div className="gfov-meter-label">
              <img src="/assets/icons/I_Compliance.png" alt="" draggable={false} />
              {t('ProvinceMode.StandingTitle')}
            </div>
            <div className="gfov-meter-score-row">
              <span className="gfov-meter-score" style={{ color: standingColour }}>{formatNumber(standingScore)}</span>
              <span className="gfov-meter-max">/ 100</span>
            </div>
            <GameBar value={standingScore} max={100} colour={standingColour} size="sm" />
          </div>
          <div className="gfov-meter-card">
            <div className="gfov-meter-label">
              <img src="/assets/icons/I_Dread.png" alt="" draggable={false} />
              {t('ProvinceMode.ThreatTitle')}
            </div>
            <div className="gfov-meter-score-row">
              <span className="gfov-meter-score" style={{ color: threatColourValue }}>{formatNumber(threatScore)}</span>
              <span className="gfov-meter-max">/ 100</span>
            </div>
            <GameBar value={threatScore} max={100} colour={threatColourValue} size="sm" />
          </div>
          <div className="gfov-meter-card gfov-meter-card--review">
            <div className="gfov-meter-label">
              <img src="/assets/icons/RecallStatus/I_RecallStatus_Overview.png" alt="" draggable={false} />
              {t('ProvinceMode.NextReviewLabel')}
            </div>
            <div className="gfov-meter-review-row">
              <span className="gfov-meter-review-days">{formatNumber(reviewDays)}</span>
              <span className="gfov-meter-review-unit">{t(reviewDays === 1 ? 'Common.Day' : 'Common.Days')}</span>
            </div>
            <div className="gfov-meter-review-progress">
              <GameBar value={reviewElapsedDays} max={reviewIntervalDays} colour="var(--gold)" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <RecallStatusPanel
        activeStage={recallStage}
      />
          <EmperorPanel overview={overview} onOpenCharacter={onOpenCharacter} />

      <div className="gfov-two-cols">
        <div className="gfov-col">
          <div className="gfov-panel">
            <div className="gfov-panel-header">
              <img className="gfov-panel-icon" src="/assets/icons/I_Dread.png" alt="" draggable={false} />
              <SectionHeading title={t('ProvinceMode.ThreatTitle')} variant="ornate" />
            </div>
            <div className="gfov-threat-rows">
              {threatRows.map(row => (
                <div className="gfov-threat-row" key={row.id}>
                  <div className="gfov-threat-row-copy">
                    <div className="gfov-threat-row-label">
                      <img src={row.icon} alt="" draggable={false} />
                      {row.label ?? keyedText(t, row.labelKey)}
                    </div>
                    {row.description && (
                      <span className="gfov-threat-row-description">
                        {row.description}
                      </span>
                    )}
                    {row.remainingDays !== undefined && row.remainingDays > 0 && (
                      <span className="gfov-threat-row-time">
                        {t('ProvinceMode.StandingModifier.Remaining', { Days: formatNumber(row.remainingDays) })}
                      </span>
                    )}
                  </div>
                  <span className={`gfov-threat-value gfov-threat-value--${row.tone}`}>
                    {row.value > 0 ? `+${formatNumber(row.value)}` : formatNumber(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gfov-col">
          <div className="gfov-panel">
            <div className="gfov-panel-header">
              <img className="gfov-panel-icon" src="/assets/icons/I_Compliance.png" alt="" draggable={false} />
              <SectionHeading title={t('ProvinceMode.StandingBreakdownTitle')} variant="ornate" />
            </div>
            <div className="gfov-standing-rows">
              {standingRows.map(row => (
                <div className="gfov-standing-row" key={row.id}>
                  <div className="gfov-standing-row-copy">
                    <div className="gfov-standing-row-label">
                      <img className="gfov-standing-row-marker" src={row.icon || '/assets/icons/I_Compliance.png'} alt="" draggable={false} />
                      {row.label ?? keyedText(t, row.labelKey)}
                    </div>
                    {row.description && (
                      <span className="gfov-standing-row-description">
                        {row.description}
                      </span>
                    )}
                    {row.remainingDays > 0 && (
                      <span className="gfov-standing-row-time">
                        {t('ProvinceMode.StandingModifier.Remaining', { Days: formatNumber(row.remainingDays) })}
                      </span>
                    )}
                  </div>
                  <span className={`gfov-standing-value gfov-standing-value--${row.tone}`}>
                    {formatSignedNumber(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GovernorMetric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'muted' }) {
  return (
    <div className={`gfov-reggov-metric${tone ? ` gfov-reggov-metric--${tone}` : ''}`}>
      <span className="gfov-reggov-metric-label">{label}</span>
      <span className="gfov-reggov-metric-value">{value}</span>
    </div>
  );
}

function GovernorsTab({ onOpenCharacter }: { onOpenCharacter: (id: string) => void }) {
  const t = useWebUIText();
  const diplomacy = useDiplomacyOverviewBridge('governors');
  const [editing, setEditing] = useState<RegionalGovernor | null>(null);
  const governors = [...(diplomacy?.regionalGovernors ?? [])].sort((a, b) => a.regionName.localeCompare(b.regionName));
  const autoAssignGovernorsEnabled = diplomacy?.autoAssignGovernorsEnabled ?? false;
  const tutorialGovernorRowIndex = governors.findIndex(row => !row.governorId && row.canManageGovernor && row.settlementId);

  const refreshGovernors = useCallback(() => {
    void refreshDiplomacyOverviewBridge('governors').catch(error => acknowledgeBridgeFailure(error, 'game.get_diplomacy_overview'));
  }, []);

  const toggleAutoAssign = useCallback(() => {
    void setAutoAssignGovernorsBridge(!autoAssignGovernorsEnabled).catch(error => acknowledgeBridgeFailure(error, 'game.set_auto_assign_governors'));
  }, [autoAssignGovernorsEnabled]);

  return (
    <div className="gfov-governors-tab">
      <div className="gfov-reggov-toolbar">
        <GameCheckButton
          checked={autoAssignGovernorsEnabled}
          label={t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.824.8')}
          onToggle={toggleAutoAssign}
          tooltip={{
            title: t('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.9'),
            body: t('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.10'),
          }}
        />
      </div>

      <div className="gfov-reggov-list">
        <div className="gfov-reggov-header" role="row">
          <span>{t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.831.11')}</span>
          <span>{t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.832.12')}</span>
          <span>{t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.833.13')}</span>
          <span>{t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.834.14')}</span>
          <span>{t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.835.15')}</span>
          <span>{t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.836.16')}</span>
          <span>{t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.837.17')}</span>
          <span>{t('Auto.ComponentsScreensInternalPoliticsScreen.875.10')}</span>
        </div>

        {governors.length === 0 ? (
          <div className="gfov-reggov-empty">{diplomacy?.governorEmptyReason || t('InternalPolitics.NoRegionalGovernors')}</div>
        ) : (
          governors.map((row, rowIndex) => {
            const corruptionTone = row.corruptionPercent >= 25 ? 'bad' : row.corruptionPercent >= 12 ? 'muted' : 'good';
            const actionLabel = t(row.governorId ? 'FactionOverview.ReplaceAppointment' : 'Settlement.AppointGovernor');
            return (
              <div
                key={row.regionId || row.regionName}
                className="gfov-reggov-row"
                role={row.governorId ? 'button' : undefined}
                tabIndex={row.governorId ? 0 : undefined}
                onClick={() => row.governorId && onOpenCharacter(row.governorId)}
              >
                <div className="gfov-reggov-region">
                  <span className="gfov-reggov-region-name">{row.regionName}</span>
                  <span className="gfov-reggov-region-sub">{row.settlementName}</span>
                </div>
                <div className="gfov-reggov-governor">
                  <span className={row.governorId ? 'gfov-reggov-governor-name' : 'gfov-reggov-governor-name gfov-reggov-governor-name--empty'}>
                    {row.governorName || t('Settlement.NoGovernor')}
                  </span>
                  {row.isLocked ? <span className="gfov-reggov-locked">{t('Auto.ComponentsScreensInternalPoliticsScreen.578.6')}</span> : null}
                </div>
                <GovernorMetric label={t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.833.13')} value={formatNumber(row.settlementCount)} />
                <GovernorMetric label={t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.834.14')} value={`${formatNumber(row.corruptionPercent)}%`} tone={corruptionTone} />
                <GovernorMetric label={t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.835.15')} value={`${formatSignedNumber(row.taxBonusPercent)}%`} tone={row.taxBonusPercent >= 0 ? 'good' : 'bad'} />
                <GovernorMetric label={t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.836.16')} value={`${formatSignedNumber(row.unrestReductionPercent)}%`} tone={row.unrestReductionPercent >= 0 ? 'good' : 'bad'} />
                <GovernorMetric label={t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.837.17')} value={`${formatSignedNumber(row.militaryBonusPercent)}%`} tone={row.militaryBonusPercent >= 0 ? 'good' : 'bad'} />
                <div
                  className="gfov-reggov-actions"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  {row.governorId ? (
                    <GameButton
                      variant="outline"
                      onClick={() => onOpenCharacter(row.governorId)}
                    >
                      {t('Common.View')}
                    </GameButton>
                  ) : null}
                  <GameButton
                    variant="burgundy"
                    disabled={!row.canManageGovernor || !row.settlementId}
                    onClick={() => setEditing(row)}
                    tutorialTarget={rowIndex === tutorialGovernorRowIndex ? 'TutorialGovernorAppointButton' : undefined}
                  >
                    {actionLabel}
                  </GameButton>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing ? (
        <RegionGovernorAppointmentModal
          open={!!editing}
          settlementId={editing.settlementId}
          settlementName={editing.settlementName}
          regionName={editing.regionName}
          currentGovernorId={editing.governorId || undefined}
          onClose={() => setEditing(null)}
          onAppointed={refreshGovernors}
        />
      ) : null}
    </div>
  );
}

function MissionsTab({ overview }: { overview: ProvinceModeOverview | null }) {
  const t = useWebUIText();
  const { openSidebar } = useGameActions();
  const missions: MissionRow[] = overview?.missions ?? [];
  const handleMissionCommand = useCallback((missionId: string, command: string) => {
    void runGovernorMissionAction(missionId, command).catch(acknowledgeBridgeFailure);
  }, []);
  const handleRichLinkClick = useCallback((type: string, id: string) => {
    const sidebarType = sidebarTypeForEntity(type);
    if (sidebarType) openSidebar(sidebarType, id);
  }, [openSidebar]);
  const renderMissionRichText = useCallback((text: string) => renderRichText(text, {
    onLinkClick: handleRichLinkClick,
    keepLinksWithPreviousWord: true,
    linkClassPrefix: 'gfov-mission-link',
  }), [handleRichLinkClick]);

  return (
    <div className="gfov-missions-tab">
      <div className="gfov-two-cols">
        <div className="gfov-col">
          <div className="gfov-panel">
            <div className="gfov-panel-header">
              <img className="gfov-panel-icon" src={GOVERNOR_MISSION_ICON} alt="" draggable={false} />
              <SectionHeading title={t('ProvinceMode.MissionsTitle')} variant="ornate" />
            </div>
            <div className="gfov-mission-list">
              {missions.map(mission => {
                const days = mission.deadlineDays ?? 0;
                const deadlinePercent = mission.deadlinePercent ?? 0;
                const hasOpenDeadline = mission.status === 'active';
                const canRunPrimaryAction = mission.status === 'active' && Boolean(mission.primaryAction);
                const statusIcon = mission.status === 'succeeded'
                  ? '/assets/ui/I_TickIcon.png'
                  : (mission.status === 'failed' ? '/assets/ui/I_CloseIcon.png' : '');
                return (
                  <div className="gfov-mission-row" key={mission.id}>
                    <img className="gfov-mission-icon" src={mission.icon} alt="" draggable={false} />
                    <div className="gfov-mission-copy">
                      <div className="gfov-mission-title-row">
                        <span className="gfov-mission-title">{mission.title ?? keyedText(t, mission.titleKey)}</span>
                        <span className={`gfov-mission-status gfov-mission-status--${mission.status}`}>
                          {statusIcon
                            ? <img className="gfov-mission-status-icon" src={statusIcon} alt={t(missionStatusKey(mission.status))} draggable={false} />
                            : t(missionStatusKey(mission.status))}
                        </span>
                      </div>
                      <p className="gfov-mission-body">{renderMissionRichText(mission.body ?? keyedText(t, mission.bodyKey))}</p>
                      <div className="gfov-mission-footer">
                        <span>
                          {days > 0
                            ? t('ProvinceMode.Mission.Deadline', { Days: String(days) })
                            : t('ProvinceMode.Mission.Ongoing')}
                        </span>
                        <span className="gfov-mission-reward">
                          {t('ProvinceMode.Mission.RewardLabel')}: {mission.reward ?? keyedText(t, mission.rewardKey)}
                        </span>
                      </div>
                      {hasOpenDeadline && (
                        <div className="gfov-mission-progress">
                          <div className="gfov-mission-progress-track">
                            <div className="gfov-mission-progress-fill" style={{ width: `${deadlinePercent}%` }} />
                          </div>
                        </div>
                      )}
                      {canRunPrimaryAction && (
                        <div className="gfov-mission-actions">
                          <GameButton
                            variant="burgundy"
                            className="gfov-mission-action"
                            disabled={!mission.canRunPrimaryAction}
                            onClick={() => mission.primaryAction && handleMissionCommand(mission.id, mission.primaryAction)}
                          >
                            {mission.primaryActionLabel ?? ''}
                          </GameButton>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourtOfficeActionsPanel({ actions }: { actions: ProvinceModeCourtOfficeAction[] }) {
  const t = useWebUIText();
  const handleRunAction = useCallback((actionId: string) => {
    void runCourtOfficeAction(actionId).catch(acknowledgeBridgeFailure);
  }, []);

  return (
    <div className="gfov-panel gfov-court-actions-panel">
      <div className="gfov-panel-header">
        <img className="gfov-panel-icon" src="/assets/icons/I_Fame.png" alt="" draggable={false} />
        <SectionHeading title={t('ProvinceMode.CourtOfficeActionsTitle')} count={actions.length} variant="ornate" />
      </div>
      {actions.length === 0 ? (
        <div className="gfov-court-action-empty">{t('ProvinceMode.CourtOfficeActionsEmpty')}</div>
      ) : (
        <div className="gfov-court-action-list">
          {actions.map(action => {
            const cooldownDays = action.cooldownDaysRemaining ?? 0;
            return (
              <div className="gfov-court-action-row" key={action.id}>
                <img className="gfov-court-action-icon" src={action.icon} alt="" draggable={false} />
                <div className="gfov-court-action-copy">
                  <div className="gfov-court-action-title-row">
                    <span className="gfov-court-action-title">{action.title}</span>
                    <span className="gfov-court-action-scope">{action.scope}</span>
                  </div>
                  <p className="gfov-court-action-body">{action.body}</p>
                  <div className="gfov-court-action-footer">
                    <span className="gfov-court-action-effect">{action.effect}</span>
                    <span className="gfov-court-action-cooldown">
                      {cooldownDays > 0
                        ? t('ProvinceMode.CourtOfficeActionCooldown', { Days: formatNumber(cooldownDays) })
                        : t('ProvinceMode.CourtOfficeActionReady')}
                    </span>
                  </div>
                </div>
                <GameButton
                  variant="burgundy"
                  className="gfov-court-action-button"
                  disabled={!action.canRun}
                  onClick={() => handleRunAction(action.id)}
                >
                  {t('ProvinceMode.CourtOfficeActionUse')}
                </GameButton>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourtTab({ overview, onOpenCharacter }: { overview: ProvinceModeOverview | null; onOpenCharacter: (id: string) => void }) {
  const actions = overview?.courtOfficeActions ?? [];

  return (
    <div className="gfov-court-tab">
      <CourtOfficeActionsPanel actions={actions} />
      <CourtPositionsPanel
        enabled
        readOnly
        titleKey="ProvinceMode.CourtTitle"
        highlightPlayerOffice
        showBureaucraticPower={false}
        onOpenCharacter={onOpenCharacter}
      />
    </div>
  );
}

export default function GovernorFactionOverviewScreen({ screenId, onClose }: { screenId: string | null; onClose: () => void }) {
  const t = useWebUIText();
  const overview = useProvinceModeOverview(true);
  const [activeTab, setActiveTab] = useState<TabId>(() => governorOverviewTabFromScreenId(screenId));
  const { openSidebar } = useGameActions();
  const openCharacter = useCallback((id: string) => {
    if (id) openSidebar('character', id);
  }, [openSidebar]);

  const tabs = [
    { id: 'province', label: t('ProvinceMode.Tab.Province') },
    { id: 'missions', label: t('ProvinceMode.Tab.Missions') },
    { id: 'governors', label: t('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.49.3') },
    { id: 'empire', label: t('ProvinceMode.Tab.Empire') },
    { id: 'court', label: t('ProvinceMode.Tab.Court') },
    { id: 'appointments', label: t('ProvinceMode.Tab.Appointments') },
  ];

  return (
    <>
      <ScreenShell
        title={t('ProvinceMode.GovFactionTitle')}
        onClose={onClose}
        className="screen--gov-faction-overview"
        tabs={<SidebarTabBar tabs={tabs} activeTab={activeTab} onTabChange={id => setActiveTab(id as TabId)} />}
        styledScrollContent
      >
        {activeTab === 'province' && <ProvinceTab overview={overview} onOpenCharacter={openCharacter} />}
        {activeTab === 'missions' && <MissionsTab overview={overview} />}
        {activeTab === 'governors' && <GovernorsTab onOpenCharacter={openCharacter} />}
        {activeTab === 'empire' && <EmpireTab overview={overview} onOpenCharacter={openCharacter} />}
        {activeTab === 'court' && <CourtTab overview={overview} onOpenCharacter={openCharacter} />}
        {activeTab === 'appointments' && <AppointmentsTab overview={overview} onOpenCharacter={openCharacter} />}
      </ScreenShell>
    </>
  );
}

registerScreen({
  id: 'governor-faction-overview',
  render: ({ screenId, onClose }) => (
    <GovernorFactionOverviewScreen key={screenId ?? 'default'} screenId={screenId} onClose={onClose} />
  ),
  topbarId: 'faction',
  openedByTopbar: true,
  bridgeNames: ['faction', 'factions', 'province', 'missions', 'governors', 'regionalgovernors', 'regiongovernors', 'empire', 'imperial', 'court', 'imperialcourt', 'appointments', 'governorfactionoverview'],
  factionMode: 'subject',
});

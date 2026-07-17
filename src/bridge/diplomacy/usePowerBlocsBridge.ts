import { bridgeCall } from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import type {
  GetPowerBlocDetailResponse,
  GetPowerBlocsResponse,
  PowerBlocOverviewEntry,
} from '../../bridge-types.generated.ts';
import type {
  PowerBloc,
  PowerBlocDemand,
  PowerBlocGoal,
  PowerBlocMember,
  PowerBlocModifier,
} from '../../data/types';
import { WebkilnAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

let powerBlocCache: PowerBloc[] | null = null;

export interface PowerBlocSubjectActionsState {
  canFormPersonalBloc: boolean;
  formPersonalBlocReason?: string;
}

const EMPTY_SUBJECT_ACTIONS: PowerBlocSubjectActionsState = {
  canFormPersonalBloc: false,
};

let powerBlocSubjectActionsCache: PowerBlocSubjectActionsState = EMPTY_SUBJECT_ACTIONS;

const POWER_BLOC_HEADER_IMAGES: Record<string, string> = {
  bureaucracybloc: 'edict-centralize-bureaucracy',
  foederaticouncilbloc: 'interaction-commission-foederati-officers',
  loyalistbloc: 'regency-council',
  militaryestablishmentbloc: 'military-chain-of-command',
  newmenbloc: 'interaction-fund-public-works',
  personalfactionbloc: 'power-struggle',
  regionalinterestbloc: 'interaction-dispatch-imperial-aid',
  religiousbloc: 'religious-ceremony',
  senatorialaristocracybloc: 'senate-debate',
  tutorialpatronagebloc: 'conspiracy-meeting',
};

export function clearPowerBlocCache(blocId: string | undefined): void {
  if (!blocId || !powerBlocCache) return;
  powerBlocCache = powerBlocCache.filter((bloc) => bloc.id !== blocId);
}

export function clearPowerBlocCaches(): void {
  powerBlocCache = null;
  powerBlocSubjectActionsCache = EMPTY_SUBJECT_ACTIONS;
}

function iconUrl(key: string): string | undefined {
  if (key.startsWith('/') || key.startsWith('coui://')) return WebkilnAssetPath(key);
  return key ? WebkilnAssetPath(`/assets/power-blocs/${key}.png`) : undefined;
}

function headerImageUrl(key: string): string | undefined {
  const image = POWER_BLOC_HEADER_IMAGES[key];
  return image ? WebkilnAssetPath(`/assets/events/${image}.png`) : undefined;
}

function mapGoal(goal: PowerBlocOverviewEntry['goals'][number]): PowerBlocGoal {
  return {
    name: goal.name,
    description: goal.description,
    breakdown: goal.breakdown || undefined,
    weight: goal.weight,
    satisfaction: goal.satisfaction,
  };
}

function mapMember(member: PowerBlocOverviewEntry['members'][number]): PowerBlocMember {
  return {
    id: member.id,
    debugShortId: member.debugShortId,
    name: member.name,
    role: member.role,
    affiliation: member.affiliation || undefined,
    influence: member.influence,
    loyalty: member.loyalty,
    isLeader: member.isLeader,
  };
}

function mapModifier(modifier: PowerBlocOverviewEntry['contentModifiers'][number]): PowerBlocModifier {
  return {
    label: modifier.label,
    value: modifier.value,
    isPositive: modifier.isPositive,
  };
}

function mapDemand(entry: PowerBlocOverviewEntry): PowerBlocDemand | undefined {
  if (!entry.hasActiveDemand) return undefined;
  return {
    title: entry.activeDemand.title,
    description: entry.activeDemand.description,
    issuedDate: entry.activeDemand.issuedDate,
    deadlineDate: entry.activeDemand.deadlineDate,
    daysRemaining: entry.activeDemand.daysRemaining,
    totalDays: entry.activeDemand.totalDays,
    progress: entry.activeDemand.progress,
    progressLabel: entry.activeDemand.progressLabel || undefined,
  };
}

export function getPowerBlocDemandDaysRemaining(demand: PowerBlocDemand, gameDay: number): number {
  if (demand.deadlineDate > 0 && gameDay > 0) {
    return Math.max(0, demand.deadlineDate - gameDay);
  }
  return demand.daysRemaining;
}

export function getPowerBlocDemandTimeRemainingPct(demand: PowerBlocDemand, gameDay: number): number {
  const totalDays = Math.max(1, demand.totalDays);
  return (getPowerBlocDemandDaysRemaining(demand, gameDay) / totalDays) * 100;
}

function mapBloc(entry: PowerBlocOverviewEntry): PowerBloc {
  return {
    id: entry.id,
    debugShortId: entry.debugShortId,
    name: entry.name,
    type: entry.type,
    definitionKey: entry.iconKey || undefined,
    subtype: entry.subtype || undefined,
    iconKey: iconUrl(entry.iconKey),
    headerImage: headerImageUrl(entry.iconKey),
    description: entry.description,
    leaderId: entry.leaderId || undefined,
    leaderDebugShortId: entry.leaderDebugShortId || undefined,
    leaderName: entry.leaderName,
    memberCount: entry.memberCount,
    happiness: entry.happiness,
    strength: entry.strength,
    imperialStrength: entry.imperialStrength,
    escalationStage: entry.escalationStage,
    unhappyDays: entry.unhappyDays,
    failedDemandCount: entry.failedDemandCount,
    goals: entry.goals.map(mapGoal),
    members: entry.members.map(mapMember),
    contentModifiers: entry.contentModifiers.map(mapModifier),
    unhappyModifiers: entry.unhappyModifiers.map(mapModifier),
    activeDemand: mapDemand(entry),
    playerIsMember: entry.playerIsMember,
    canPlayerJoin: entry.canPlayerJoin,
    canPlayerJoinReason: entry.canPlayerJoinReason || undefined,
  };
}

function mapSubjectActions(data: GetPowerBlocsResponse): PowerBlocSubjectActionsState {
  powerBlocSubjectActionsCache = {
    canFormPersonalBloc: data.canFormPersonalBloc,
    formPersonalBlocReason: data.formPersonalBlocReason || undefined,
  };
  return powerBlocSubjectActionsCache;
}

function mapResponse(data: GetPowerBlocsResponse): PowerBloc[] {
  mapSubjectActions(data);
  powerBlocCache = data.blocs.map(mapBloc);
  return powerBlocCache;
}

function dispatchPowerBlocs(data: GetPowerBlocsResponse): void {
  window.dispatchEvent(new CustomEvent('bridge:game.get_power_blocs', { detail: data }));
}

function dispatchPowerBlocDetail(data: GetPowerBlocDetailResponse): void {
  window.dispatchEvent(new CustomEvent('bridge:game.get_power_bloc_detail', { detail: data }));
}

async function refreshPowerBlocs(): Promise<void> {
  const data = await bridgeCall('game.get_power_blocs');
  dispatchPowerBlocs(data);
}

async function refreshPowerBlocDetail(blocId: string): Promise<void> {
  const data = await bridgeCall('game.get_power_bloc_detail', { blocId });
  dispatchPowerBlocDetail(data);
}

export async function setPowerBlocMembership(blocId: string, join: boolean): Promise<boolean> {
  const response = await bridgeCall('game.set_power_bloc_membership', { blocId, join });
  if (response.success) {
    await refreshPowerBlocs();
    await refreshPowerBlocDetail(blocId);
  }
  return response.success;
}

export function setPowerBlocMembershipAndRefresh(blocId: string, join: boolean): void {
  setPowerBlocMembership(blocId, join).catch(acknowledgeBridgeFailure);
}

export async function formPersonalPowerBloc(): Promise<boolean> {
  const response = await bridgeCall('game.form_personal_power_bloc');
  if (response.success) {
    await refreshPowerBlocs();
  }
  return response.success;
}

export function formPersonalPowerBlocAndRefresh(): void {
  formPersonalPowerBloc().catch(acknowledgeBridgeFailure);
}

export function usePowerBlocsBridge(fetch = true): PowerBloc[] | null {
  const live = useBridgeQuery({
    action: 'game.get_power_blocs',
    map: mapResponse,
    fetch,
  });

  return live ?? powerBlocCache;
}

export function usePowerBlocSubjectActionsBridge(): PowerBlocSubjectActionsState {
  const live = useBridgeQuery({
    action: 'game.get_power_blocs',
    map: mapSubjectActions,
  });

  return live ?? powerBlocSubjectActionsCache;
}

function usePowerBlocDetailBridge(blocId: string | null | undefined): PowerBloc | null {
  return useBridgeQuery({
    action: 'game.get_power_bloc_detail',
    payload: blocId ? { blocId } : null,
    map: data => mapBloc(data.bloc),
    matchPush: data => data.bloc.id === blocId,
  });
}

function mergeBlocDetail(overview: PowerBloc | null | undefined, detail: PowerBloc | null): PowerBloc | null {
  if (!detail) return overview ?? null;
  if (!overview) return detail;
  return {
    ...detail,
    ...overview,
    goals: detail.goals,
    members: detail.members,
  };
}

export function usePowerBlocBridge(blocId: string | null | undefined): PowerBloc | null {
  const blocs = usePowerBlocsBridge(false);
  const overview = blocId ? blocs?.find(bloc => bloc.id === blocId) : blocs?.[0];
  const detail = usePowerBlocDetailBridge(blocId);
  return mergeBlocDetail(overview, detail);
}

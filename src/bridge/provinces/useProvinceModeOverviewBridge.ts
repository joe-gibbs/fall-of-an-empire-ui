import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { mapPortraitLayers, mapPortraitPath } from '../characters/portraitMapping';
import type {
  GetProvinceModeOverviewResponse,
  ProvinceModeCourtOfficeActionDTO,
  ProvinceModeFactionSummaryDTO,
  ProvinceModeMissionDTO,
  ProvinceModePersonDTO,
  ProvinceModeScorePartDTO,
  ProvinceModeScoreRowDTO,
} from '../../bridge-types.generated.ts';
import type { PortraitLayerData } from '../../data/types';
import { WebkilnAssetPath } from '../../utils/assets';

export interface ProvinceModeFactionSummary {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  culture: string;
  cultureGroup: string;
  religion: string;
  emblem: string;
  diplomaticStatus?: string;
  subjectSubtype?: string;
  isPlayer?: boolean;
  isRebel?: boolean;
  capital: string;
  gold: number;
  income: number;
  expenses: number;
  netIncome: number;
  population: number;
  settlements: number;
  strength: number;
}

export interface ProvinceModePerson {
  id: string;
  debugShortId: number;
  name: string;
  title: string;
  portrait: string;
  portraitLayers?: PortraitLayerData;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  fame: number;
  clients: number;
  patrons: number;
  hasCommand: boolean;
  commandName: string;
}

export interface ProvinceModeScorePart {
  label: string;
  value: number;
}

export interface ProvinceModeScoreRow {
  id: string;
  icon: string;
  label: string;
  description: string;
  value: number;
  remainingDays: number;
  tone: 'positive' | 'negative' | 'neutral' | 'high' | 'medium' | 'low';
  parts: ProvinceModeScorePart[];
}

export type ProvinceModeMissionStatus = 'active' | 'succeeded' | 'failed';

export interface ProvinceModeMission {
  id: string;
  missionTypeId: string;
  icon: string;
  title: string;
  body: string;
  reward: string;
  status: ProvinceModeMissionStatus;
  deadlineDays: number;
  deadlinePercent: number;
  targetName: string;
  primaryAction: string;
  primaryActionLabel: string;
  canRunPrimaryAction: boolean;
}

export interface ProvinceModeCourtOfficeAction {
  id: string;
  positionKey: string;
  scope: string;
  icon: string;
  title: string;
  body: string;
  effect: string;
  canRun: boolean;
  cooldownDaysRemaining: number;
}

export interface ProvinceModeOverview {
  active: boolean;
  province: ProvinceModeFactionSummary;
  imperialFaction: ProvinceModeFactionSummary;
  governor: ProvinceModePerson;
  emperor: ProvinceModePerson;
  successor: ProvinceModePerson;
  standingScore: number;
  standingTrend: number;
  threatScore: number;
  recallStage: number;
  nextReviewDays: number;
  reviewIntervalDays: number;
  threatRows: ProvinceModeScoreRow[];
  standingRows: ProvinceModeScoreRow[];
  missions: ProvinceModeMission[];
  courtOfficeActions: ProvinceModeCourtOfficeAction[];
}

function tone<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function mapFaction(data: ProvinceModeFactionSummaryDTO): ProvinceModeFactionSummary {
  return {
    id: data.id,
    name: data.name,
    colour: data.colour,
    secondaryColour: data.secondaryColour,
    culture: data.culture,
    cultureGroup: data.cultureGroup,
    religion: data.religion,
    emblem: data.emblem,
    diplomaticStatus: data.diplomaticStatus || undefined,
    subjectSubtype: data.subjectSubtype || undefined,
    isPlayer: data.isPlayer,
    isRebel: data.isRebel,
    capital: data.capital,
    gold: data.gold,
    income: data.income,
    expenses: data.expenses,
    netIncome: data.netIncome,
    population: data.population,
    settlements: data.settlements,
    strength: data.strength,
  };
}

function mapPerson(data: ProvinceModePersonDTO): ProvinceModePerson {
  return {
    id: data.id,
    debugShortId: data.debugShortId,
    name: data.name,
    title: data.title,
    portrait: mapPortraitPath(data.portrait),
    portraitLayers: mapPortraitLayers(data.portraitLayers),
    tactics: data.tactics,
    authority: data.authority,
    cunning: data.cunning,
    governance: data.governance,
    loyalty: data.loyalty,
    fame: data.fame,
    clients: data.clients,
    patrons: data.patrons,
    hasCommand: data.hasCommand,
    commandName: data.commandName,
  };
}

function mapScorePart(data: ProvinceModeScorePartDTO): ProvinceModeScorePart {
  return {
    label: data.label,
    value: data.value,
  };
}

function mapScoreRow(data: ProvinceModeScoreRowDTO): ProvinceModeScoreRow {
  return {
    id: data.id,
    icon: WebkilnAssetPath(data.icon) ?? '',
    label: data.label,
    description: data.description,
    value: data.value,
    remainingDays: data.remainingDays,
    tone: tone(data.tone, ['positive', 'negative', 'neutral', 'high', 'medium', 'low'] as const, 'neutral'),
    parts: (data.parts ?? []).map(mapScorePart),
  };
}

function mapMission(data: ProvinceModeMissionDTO): ProvinceModeMission {
  return {
    id: data.id,
    missionTypeId: data.missionTypeId,
    icon: WebkilnAssetPath(data.icon) ?? '',
    title: data.title,
    body: data.body,
    reward: data.reward,
    status: tone(data.status, ['active', 'succeeded', 'failed'] as const, 'active'),
    deadlineDays: data.deadlineDays,
    deadlinePercent: data.deadlinePercent,
    targetName: data.targetName,
    primaryAction: data.primaryAction,
    primaryActionLabel: data.primaryActionLabel,
    canRunPrimaryAction: data.canRunPrimaryAction,
  };
}

function mapCourtOfficeAction(data: ProvinceModeCourtOfficeActionDTO): ProvinceModeCourtOfficeAction {
  return {
    id: data.id,
    positionKey: data.positionKey,
    scope: data.scope,
    icon: WebkilnAssetPath(data.icon) ?? '',
    title: data.title,
    body: data.body,
    effect: data.effect,
    canRun: data.canRun,
    cooldownDaysRemaining: data.cooldownDaysRemaining,
  };
}

function dispatchProvinceModeOverview(data: GetProvinceModeOverviewResponse): void {
  bridgeEvents.dispatchEvent(new CustomEvent('game.get_province_mode_overview', { detail: data }));
}

export async function runGovernorMissionAction(missionId: string, action: string): Promise<boolean> {
  const response = await bridgeCall('game.run_governor_mission_action', { missionId, action });
  if (response.success) {
    const fresh = await bridgeCall('game.get_province_mode_overview');
    dispatchProvinceModeOverview(fresh);
  }
  return response.success;
}

export async function runCourtOfficeAction(actionId: string): Promise<boolean> {
  const response = await bridgeCall('game.run_court_office_action', { actionId });
  if (response.success) {
    const fresh = await bridgeCall('game.get_province_mode_overview');
    dispatchProvinceModeOverview(fresh);
  }
  return response.success;
}

function mapResponse(data: GetProvinceModeOverviewResponse): ProvinceModeOverview {
  return {
    active: data.active,
    province: mapFaction(data.province),
    imperialFaction: mapFaction(data.imperialFaction),
    governor: mapPerson(data.governor),
    emperor: mapPerson(data.emperor),
    successor: mapPerson(data.successor),
    standingScore: data.standingScore,
    standingTrend: data.standingTrend,
    threatScore: data.threatScore,
    recallStage: data.recallStage,
    nextReviewDays: data.nextReviewDays,
    reviewIntervalDays: data.reviewIntervalDays,
    threatRows: data.threatRows.map(mapScoreRow),
    standingRows: data.standingRows.map(mapScoreRow),
    missions: data.missions.map(mapMission),
    courtOfficeActions: data.courtOfficeActions.map(mapCourtOfficeAction),
  };
}

export function useProvinceModeOverviewBridge(enabled: boolean): ProvinceModeOverview | null {
  return useBridgeQuery({
    action: 'game.get_province_mode_overview',
    payload: enabled ? undefined : null,
    map: mapResponse,
  });
}

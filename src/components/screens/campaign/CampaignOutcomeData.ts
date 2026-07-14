import type { PortraitLayerData } from '../../../data/types';

import { webUIText } from '../../../localization/WebUITextContext';
export type GameOverCause = 'extinction' | 'conquest' | 'subjugation' | 'rebellion' | 'governorship' | 'failed_rebellion' | 'demo_expired';
export type CampaignOutcomeKind = 'victory' | 'defeat';

export interface CampaignOutcomeRuler {
  id?: string;
  name: string;
  title: string;
  reign: string;
  battlesWon: number;
  battlesLost: number;
  fate?: string;
  portrait?: string;
  portraitLayers?: PortraitLayerData;
  isImprisoned?: boolean;
}

export interface CampaignOutcomeHistoryPoint {
  label: string;
  settlements: number;
  population: number;
}

export interface CampaignOutcomeMilestone {
  label: string;
  detail: string;
  tone?: 'good' | 'bad' | 'neutral';
}

export interface CampaignOutcomeSummary {
  cause?: GameOverCause;
  kicker?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  factionName?: string;
  endDate?: string;
  totalTimeRuled?: string;
  totalBattlesWon?: number;
  totalBattlesLost?: number;
  currentRuler?: CampaignOutcomeRuler;
  previousRulers?: CampaignOutcomeRuler[];
  history?: CampaignOutcomeHistoryPoint[];
  milestones?: CampaignOutcomeMilestone[];
  crestIcon?: string;
  headerImage?: string;
  primaryAction?: string;
  secondaryAction?: string;
}

export interface ResolvedCampaignOutcomeSummary {
  cause?: GameOverCause;
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  factionName: string;
  endDate: string;
  totalTimeRuled: string;
  totalBattlesWon: number;
  totalBattlesLost: number;
  currentRuler: CampaignOutcomeRuler;
  previousRulers: CampaignOutcomeRuler[];
  history: CampaignOutcomeHistoryPoint[];
  milestones: CampaignOutcomeMilestone[];
  crestIcon: string;
  headerImage: string;
  primaryAction: string;
  secondaryAction: string;
}

const DEFAULT_HISTORY: CampaignOutcomeHistoryPoint[] = [
  { label: '742', settlements: 14, population: 1284000 },
  { label: '746', settlements: 12, population: 1160000 },
  { label: '751', settlements: 16, population: 1390000 },
  { label: '758', settlements: 21, population: 1740000 },
  { label: '764', settlements: 26, population: 2100000 },
  { label: '771', settlements: 30, population: 2420000 },
  { label: '778', settlements: 34, population: 2680000 },
  { label: '784', settlements: 38, population: 3010000 },
];

const DEFAULT_DEFEAT_HISTORY: CampaignOutcomeHistoryPoint[] = [
  { label: '742', settlements: 14, population: 1284000 },
  { label: '746', settlements: 12, population: 1160000 },
  { label: '751', settlements: 16, population: 1390000 },
  { label: '758', settlements: 21, population: 1740000 },
  { label: '764', settlements: 26, population: 2100000 },
  { label: '771', settlements: 17, population: 1320000 },
  { label: '778', settlements: 8, population: 690000 },
  { label: '784', settlements: 2, population: 240000 },
];

const DEFAULT_PREVIOUS_RULERS: CampaignOutcomeRuler[] = [
  {
    id: 'mock-person-previous-ruler',
    get name() { return webUIText("Auto.Prop.componentsscreensCampaignOutcomeData.101.1"); },
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.101.1'); },
    reign: '681 - 711',
    battlesWon: 12,
    battlesLost: 3,
    get fate() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.106.20'); },
    portrait: '/assets/portraits/male_002.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensCampaignOutcomeData.110.1"); },
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.110.2'); },
    reign: '650 - 681',
    battlesWon: 7,
    battlesLost: 1,
    get fate() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.115.21'); },
    portrait: '/assets/portraits/female_001.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensCampaignOutcomeData.119.1"); },
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.119.3'); },
    reign: '623 - 650',
    battlesWon: 9,
    battlesLost: 4,
    get fate() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.124.22'); },
    portrait: '/assets/portraits/male_001.png',
  },
];

const DEFAULT_CURRENT_RULER: CampaignOutcomeRuler = {
  id: 'mock-person-ruler',
  get name() { return webUIText("Auto.Prop.componentsscreensCampaignOutcomeData.131.1"); },
  get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.131.4'); },
  reign: '711 - 784',
  battlesWon: 18,
  battlesLost: 2,
  get fate() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.136.23'); },
  portrait: '/assets/portraits/male_001.png',
};

const DEFAULT_VICTORY: ResolvedCampaignOutcomeSummary = {
  get kicker() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.141.24'); },
  get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.141.5'); },
  get subtitle() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.142.6'); },
  get description() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.143.7'); },
  get factionName() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.144.25'); },
  endDate: '17 Summer 784',
  get totalTimeRuled() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.146.26'); },
  totalBattlesWon: 46,
  totalBattlesLost: 10,
  currentRuler: DEFAULT_CURRENT_RULER,
  previousRulers: DEFAULT_PREVIOUS_RULERS,
  history: DEFAULT_HISTORY,
  milestones: [],
  crestIcon: '/assets/icons/Victory/I_Victory_Gold.png',
  headerImage: '/assets/events/triumphal-return.png',
  get primaryAction() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.154.27'); },
  get secondaryAction() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.155.28'); },
};

const DEFEAT_TEXT: Record<GameOverCause, Pick<ResolvedCampaignOutcomeSummary, 'title' | 'subtitle' | 'description' | 'crestIcon'>> = {
  extinction: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.161.8'); },
    get subtitle() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.162.9'); },
    get description() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.163.10'); },
    crestIcon: '/assets/icons/I_Dread.png',
  },
  conquest: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.167.11'); },
    get subtitle() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.168.12'); },
    get description() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.169.13'); },
    crestIcon: '/assets/icons/I_War.png',
  },
  subjugation: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.173.14'); },
    get subtitle() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.174.15'); },
    get description() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.175.16'); },
    crestIcon: '/assets/icons/Diplomacy/I_ForceVassalisation.png',
  },
  rebellion: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.179.17'); },
    get subtitle() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.180.18'); },
    get description() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.181.19'); },
    crestIcon: '/assets/icons/I_Mutiny.png',
  },
  failed_rebellion: {
    get title() { return webUIText('GameOver.FailedRebellionHeader'); },
    get subtitle() { return webUIText('GameOver.FailedRebellionSubtitle'); },
    get description() { return webUIText('GameOver.FailedRebellionDescription'); },
    crestIcon: '/assets/icons/I_DeclareRebellion.png',
  },
  governorship: {
    get title() { return webUIText('GameOver.GovernorshipLostHeader'); },
    get subtitle() { return webUIText('GameOver.GovernorshipLostSubtitle'); },
    get description() { return webUIText('GameOver.GovernorshipLostDescription'); },
    crestIcon: '/assets/icons/AssignGovernor.png',
  },
  demo_expired: {
    get title() { return webUIText('GameOver.DemoExpiredHeader'); },
    get subtitle() { return webUIText('GameOver.DemoExpiredSubtitle'); },
    get description() { return webUIText('GameOver.DemoExpiredDescription'); },
    crestIcon: '/assets/icons/I_Fame.png',
  },
};

export function createDefaultVictorySummary(): CampaignOutcomeSummary {
  return DEFAULT_VICTORY;
}

export function createDefaultGameOverSummary(cause: GameOverCause): CampaignOutcomeSummary {
  const causeText = DEFEAT_TEXT[cause];
  return {
    ...DEFAULT_VICTORY,
    ...causeText,
    get kicker() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.199.29'); },
    get totalTimeRuled() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.200.30'); },
    totalBattlesWon: 31,
    totalBattlesLost: 18,
    currentRuler: {
      ...DEFAULT_CURRENT_RULER,
      get fate() {
        if (cause === 'rebellion') return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.204.31');
        if (cause === 'failed_rebellion') return webUIText('CampaignOutcome.FailedRebellionFate');
        if (cause === 'governorship') return webUIText('CampaignOutcome.GovernorshipLostFate');
        return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.204.32');
      },
      isImprisoned: cause === 'rebellion' || cause === 'failed_rebellion',
    },
    previousRulers: DEFAULT_PREVIOUS_RULERS,
    history: DEFAULT_DEFEAT_HISTORY,
    milestones: [],
    get primaryAction() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.212.33'); },
    get secondaryAction() { return webUIText('Auto.TopProp.ComponentsScreensCampaignOutcomeData.213.34'); },
    headerImage: cause === 'rebellion'
      ? '/assets/events/usurper-crowned.png'
      : cause === 'failed_rebellion'
        ? '/assets/events/rebellion-uprising.png'
        : '/assets/events/sacked-city.png',
  };
}

export function resolveCampaignOutcomeSummary(kind: CampaignOutcomeKind, summary: CampaignOutcomeSummary): ResolvedCampaignOutcomeSummary {
  const fallback = kind === 'victory'
    ? DEFAULT_VICTORY
    : createDefaultGameOverSummary('rebellion') as ResolvedCampaignOutcomeSummary;
  return {
    ...fallback,
    ...summary,
    currentRuler: summary.currentRuler ?? fallback.currentRuler,
    previousRulers: summary.previousRulers ?? fallback.previousRulers,
    history: summary.history && summary.history.length > 0 ? summary.history : fallback.history,
    milestones: summary.milestones ?? fallback.milestones,
  };
}

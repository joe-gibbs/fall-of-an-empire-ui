import { useEffect } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import type {
  GetReligionConversionResponse,
  ReligionConversionOptionEntry,
  ReligionConversionStageEntry,
  ReligionConversionStateEntry,
} from '../../bridge-types.generated.ts';
import { FoaeCefUIAssetPath } from '../../utils/assets';

const RELIGION_FALLBACK_ICON = '/assets/icons/I_Religions.png';

export type ReligionConversionStageState = 'locked' | 'ready' | 'active' | 'complete';

export interface ReligionConversionOptionView {
  key: string;
  name: string;
  description: string;
  iconPath: string;
  colour: string;
  realmShare: number;
}

export interface ReligionConversionStageView {
  index: number;
  name: string;
  description: string;
  durationDays: number;
  goldCost: number;
  unrestPercent: number;
  targetShareBoostPerYear: number;
  taxEfficiencyPenalty: number;
  courtierLoyaltyPenalty: number;
  changesReligion: boolean;
  state: ReligionConversionStageState;
  progress: number;
  remainingDays: number;
  canActivate: boolean;
  reason: string;
}

export interface ReligionConversionStateView {
  active: boolean;
  currentReligionKey: string;
  currentReligionName: string;
  currentReligionIconPath: string;
  currentReligionColour: string;
  targetReligionKey: string;
  targetReligionName: string;
  targetReligionIconPath: string;
  targetReligionColour: string;
  currentStageIndex: number;
  currentStageName: string;
  currentStageProgress: number;
  currentStageRemainingDays: number;
  canAdvance: boolean;
  canComplete: boolean;
  playerGold: number;
}

export interface ReligionConversionResult {
  state: ReligionConversionStateView;
  options: ReligionConversionOptionView[];
  stages: ReligionConversionStageView[];
}

function iconPath(path: string): string {
  return FoaeCefUIAssetPath(path) ?? RELIGION_FALLBACK_ICON;
}

function mapOption(option: ReligionConversionOptionEntry): ReligionConversionOptionView {
  return {
    key: option.key,
    name: option.name,
    description: option.description,
    iconPath: iconPath(option.iconPath),
    colour: option.colour,
    realmShare: option.realmShare,
  };
}

function mapStage(stage: ReligionConversionStageEntry): ReligionConversionStageView {
  return {
    index: stage.index,
    name: stage.name,
    description: stage.description,
    durationDays: stage.durationDays,
    goldCost: stage.goldCost,
    unrestPercent: stage.unrestPercent,
    targetShareBoostPerYear: stage.targetShareBoostPerYear,
    taxEfficiencyPenalty: stage.taxEfficiencyPenalty,
    courtierLoyaltyPenalty: stage.courtierLoyaltyPenalty,
    changesReligion: stage.changesReligion,
    state: stage.state as ReligionConversionStageState,
    progress: stage.progress,
    remainingDays: stage.remainingDays,
    canActivate: stage.canActivate,
    reason: stage.reason,
  };
}

function mapState(state: ReligionConversionStateEntry): ReligionConversionStateView {
  return {
    active: state.active,
    currentReligionKey: state.currentReligionKey,
    currentReligionName: state.currentReligionName,
    currentReligionIconPath: iconPath(state.currentReligionIconPath),
    currentReligionColour: state.currentReligionColour,
    targetReligionKey: state.targetReligionKey,
    targetReligionName: state.targetReligionName,
    targetReligionIconPath: iconPath(state.targetReligionIconPath),
    targetReligionColour: state.targetReligionColour,
    currentStageIndex: state.currentStageIndex,
    currentStageName: state.currentStageName,
    currentStageProgress: state.currentStageProgress,
    currentStageRemainingDays: state.currentStageRemainingDays,
    canAdvance: state.canAdvance,
    canComplete: state.canComplete,
    playerGold: state.playerGold,
  };
}

function mapResponse(data: GetReligionConversionResponse): ReligionConversionResult {
  return {
    state: mapState(data.state),
    options: data.options.map(mapOption),
    stages: data.stages.map(mapStage),
  };
}

export async function refreshReligionConversion(): Promise<void> {
  try {
    const fresh = await bridgeCall('game.get_religion_conversion');
    window.dispatchEvent(new CustomEvent('bridge:game.get_religion_conversion', { detail: fresh }));
  } catch (error) {
    acknowledgeBridgeFailure(error);
  }
}

export function useReligionConversionBridge(): ReligionConversionResult | null {
  const data = useBridgeQuery({
    action: 'game.get_religion_conversion',
    map: mapResponse,
  });
  const active = Boolean(data?.state.active);

  useEffect(() => onBridgeEvent('game.get_game_state', () => {
    if (active) {
      void refreshReligionConversion();
    }
  }), [active]);

  return data;
}

export async function startReligionConversion(religionKey: string): Promise<boolean> {
  try {
    const response = await bridgeCall('game.start_religion_conversion', { religionKey });
    await refreshReligionConversion();
    return response.success;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function advanceReligionConversion(): Promise<boolean> {
  try {
    const response = await bridgeCall('game.advance_religion_conversion');
    await refreshReligionConversion();
    return response.success;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function cancelReligionConversion(): Promise<boolean> {
  try {
    const response = await bridgeCall('game.cancel_religion_conversion');
    await refreshReligionConversion();
    return response.success;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

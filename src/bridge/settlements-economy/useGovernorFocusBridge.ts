import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetSettlementGovernorFocusResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { WebkilnAssetPath } from '../../utils/assets';

export interface GovernorFocusOption {
  id: string;
  name: string;
  description: string;
  effect: string;
  icon: string;
  available: boolean;
}

export interface GovernorFocusState {
  settlementId: string;
  canChoose: boolean;
  hasGovernor: boolean;
  currentFocusId: string;
  effectivenessPercent: number;
  daysToFullEffect: number;
  options: GovernorFocusOption[];
}

function mapResponse(data: GetSettlementGovernorFocusResponse): GovernorFocusState {
  return {
    settlementId: data.settlementId,
    canChoose: data.canChoose,
    hasGovernor: data.hasGovernor,
    currentFocusId: data.currentFocusId,
    effectivenessPercent: data.effectivenessPercent,
    daysToFullEffect: data.daysToFullEffect,
    options: data.options.map(option => ({
      id: option.id,
      name: option.name,
      description: option.description,
      effect: option.effect,
      icon: WebkilnAssetPath(option.icon),
      available: option.available,
    })),
  };
}

export function useGovernorFocusBridge(settlementId: string | null): GovernorFocusState | null {
  return useBridgeQuery({
    action: 'game.get_settlement_governor_focus',
    payload: settlementId ? { settlementId } : null,
    map: mapResponse,
    matchPush: data => data.settlementId === settlementId,
  });
}

export function setGovernorFocus(settlementId: string, focusId: string): void {
  bridgeCall('game.set_settlement_governor_focus', { settlementId, focusId }).catch(acknowledgeBridgeFailure);
}

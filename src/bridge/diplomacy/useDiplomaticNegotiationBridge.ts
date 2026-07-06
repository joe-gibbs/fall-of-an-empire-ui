import { useCallback } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { useBridgeQueryState } from '../core/useBridgeQuery';
import type {
  DiplomaticNegotiationProposalDraft,
  GetDiplomaticNegotiationStateResponse,
  SubmitDiplomaticNegotiationResponse,
} from '../../bridge-types.generated.ts';

export type DiplomaticNegotiationState = GetDiplomaticNegotiationStateResponse;
export type DiplomaticProposalDraft = DiplomaticNegotiationProposalDraft;
export type DiplomaticNegotiationSubmitResult = SubmitDiplomaticNegotiationResponse;

export interface DiplomaticNegotiationBridge {
  state: DiplomaticNegotiationState | null;
  statePending: boolean;
  submit: (proposals: DiplomaticProposalDraft[]) => Promise<DiplomaticNegotiationSubmitResult | null>;
}

export function useDiplomaticNegotiationBridge(
  targetFactionId: string | null | undefined,
  proposals: DiplomaticProposalDraft[],
): DiplomaticNegotiationBridge {
  const stateQuery = useBridgeQueryState({
    action: 'game.get_diplomatic_negotiation_state',
    payload: targetFactionId ? { targetFactionId, proposals } : null,
    map: data => data,
    matchPush: data => data.targetFactionId === targetFactionId,
  });

  const submit = useCallback(async (currentProposals: DiplomaticProposalDraft[]) => {
    if (!targetFactionId) return null;
    return bridgeCall('game.submit_diplomatic_negotiation', {
      targetFactionId,
      proposals: currentProposals,
    });
  }, [targetFactionId]);

  return { state: stateQuery.value, statePending: stateQuery.pending, submit };
}

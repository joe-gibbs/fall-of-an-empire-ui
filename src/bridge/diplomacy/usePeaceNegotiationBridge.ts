import { useCallback, useEffect, useRef, useState } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { useBridgeQueryState } from '../core/useBridgeQuery';
import type {
  GetPeaceNegotiationStateResponse,
  GetPeaceNegotiationPreviewResponse,
  StartPeaceSettlementSelectionResponse,
  SubmitPeaceNegotiationResponse,
  PeaceNegotiationTermDraft,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type PeaceNegotiationState = GetPeaceNegotiationStateResponse;
export type PeaceNegotiationDraftPreview = GetPeaceNegotiationPreviewResponse;
export type PeaceNegotiationSubmitResult = SubmitPeaceNegotiationResponse;
export type PeaceTermDraft = PeaceNegotiationTermDraft;

export interface PeaceNegotiationBridge {
  state: PeaceNegotiationState | null;
  statePending: boolean;
  draftPreview: PeaceNegotiationDraftPreview | null;
  submit: (terms: PeaceTermDraft[]) => Promise<PeaceNegotiationSubmitResult | null>;
  /** Start or re-sync map settlement selection to match the given territory terms. */
  startSettlementSelection: (terms: PeaceTermDraft[]) => Promise<StartPeaceSettlementSelectionResponse | null>;
  endSettlementSelection: () => Promise<StartPeaceSettlementSelectionResponse | null>;
}

export function usePeaceNegotiationBridge(
  targetFactionId: string | null | undefined,
  terms: PeaceTermDraft[],
  submitTargetFactionId: string | null | undefined = targetFactionId,
): PeaceNegotiationBridge {
  const stateQuery = useBridgeQueryState({
    action: 'game.get_peace_negotiation_state',
    payload: targetFactionId ? { targetFactionId, terms: [] } : null,
    map: data => data,
    matchPush: data => data.targetFactionId === targetFactionId,
  });
  const [draftPreview, setDraftPreview] = useState<PeaceNegotiationDraftPreview | null>(null);
  const previewRequestIdRef = useRef(0);
  const termsKey = JSON.stringify(terms);

  useEffect(() => {
    if (!targetFactionId) {
      setDraftPreview(null);
      return undefined;
    }

    let cancelled = false;
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;

    bridgeCall('game.get_peace_negotiation_preview', {
      targetFactionId,
      terms,
    })
      .then((data) => {
        if (cancelled || previewRequestIdRef.current !== requestId) return;
        setDraftPreview(data);
      })
      .catch((error) => {
        if (cancelled || previewRequestIdRef.current !== requestId) return;
        acknowledgeBridgeFailure(error, 'game.get_peace_negotiation_preview');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFactionId, termsKey]);

  const submit = useCallback(async (currentTerms: PeaceTermDraft[]) => {
    if (!submitTargetFactionId) return null;
    return bridgeCall('game.submit_peace_negotiation', {
      targetFactionId: submitTargetFactionId,
      terms: currentTerms,
    });
  }, [submitTargetFactionId]);

  const startSettlementSelection = useCallback(async (currentTerms: PeaceTermDraft[]) => {
    if (!targetFactionId) return null;
    try {
      return await bridgeCall('game.start_peace_settlement_selection', {
        targetFactionId,
        terms: currentTerms,
        cancelSelection: false,
      });
    } catch (error) {
      acknowledgeBridgeFailure(error, 'game.start_peace_settlement_selection');
      return null;
    }
  }, [targetFactionId]);

  const endSettlementSelection = useCallback(async () => {
    if (!targetFactionId) return null;
    try {
      return await bridgeCall('game.start_peace_settlement_selection', {
        targetFactionId,
        terms: [],
        cancelSelection: true,
      });
    } catch (error) {
      acknowledgeBridgeFailure(error, 'game.start_peace_settlement_selection');
      return null;
    }
  }, [targetFactionId]);

  return {
    state: stateQuery.value,
    statePending: stateQuery.pending,
    draftPreview,
    submit,
    startSettlementSelection,
    endSettlementSelection,
  };
}

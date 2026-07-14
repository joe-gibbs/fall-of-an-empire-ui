import { useCallback, useEffect, useRef, useState } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { useBridgeQueryState } from '../core/useBridgeQuery';
import type {
  DiplomaticNegotiationProposalDraft,
  GetDiplomaticNegotiationPreviewResponse,
  GetDiplomaticNegotiationStateResponse,
  SubmitDiplomaticNegotiationResponse,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type DiplomaticNegotiationState = GetDiplomaticNegotiationStateResponse;
export type DiplomaticNegotiationDraftPreview = GetDiplomaticNegotiationPreviewResponse;
export type DiplomaticProposalDraft = DiplomaticNegotiationProposalDraft;
export type DiplomaticNegotiationSubmitResult = SubmitDiplomaticNegotiationResponse;

const PREVIEW_DEBOUNCE_MS = 200;

export interface DiplomaticNegotiationBridge {
  state: DiplomaticNegotiationState | null;
  statePending: boolean;
  draftPreview: DiplomaticNegotiationDraftPreview | null;
  submit: (proposals: DiplomaticProposalDraft[]) => Promise<DiplomaticNegotiationSubmitResult | null>;
}

export function useDiplomaticNegotiationBridge(
  targetFactionId: string | null | undefined,
  proposals: DiplomaticProposalDraft[],
): DiplomaticNegotiationBridge {
  const stateQuery = useBridgeQueryState({
    action: 'game.get_diplomatic_negotiation_state',
    payload: targetFactionId ? { targetFactionId, proposals: [] } : null,
    map: data => data,
    matchPush: data => data.targetFactionId === targetFactionId,
  });
  const [draftPreview, setDraftPreview] = useState<DiplomaticNegotiationDraftPreview | null>(null);
  const previewRequestIdRef = useRef(0);
  const proposalsKey = JSON.stringify(proposals);

  useEffect(() => {
    if (!targetFactionId || proposals.length === 0) {
      previewRequestIdRef.current += 1;
      setDraftPreview(null);
      return undefined;
    }

    let cancelled = false;
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    const timer = window.setTimeout(() => {
      bridgeCall('game.get_diplomatic_negotiation_preview', {
        targetFactionId,
        proposals,
      })
        .then((data) => {
          if (cancelled || previewRequestIdRef.current !== requestId) return;
          setDraftPreview(data);
        })
        .catch((error) => {
          if (cancelled || previewRequestIdRef.current !== requestId) return;
          acknowledgeBridgeFailure(error, 'game.get_diplomatic_negotiation_preview');
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFactionId, proposalsKey]);

  const submit = useCallback(async (currentProposals: DiplomaticProposalDraft[]) => {
    if (!targetFactionId) return null;
    return bridgeCall('game.submit_diplomatic_negotiation', {
      targetFactionId,
      proposals: currentProposals,
    });
  }, [targetFactionId]);

  return { state: stateQuery.value, statePending: stateQuery.pending, draftPreview, submit };
}

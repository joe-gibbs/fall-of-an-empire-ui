import { useCallback, useRef, useState } from 'react';
import { bridgeCall, type GetWorldGlanceTooltipResponse } from '../../bridge-types.generated.ts';

export function useWorldGlanceTooltip(kind: 'port' | 'convoy' | 'battle', id: string) {
  const [detailResult, setDetailResult] = useState<{
    key: string;
    response: GetWorldGlanceTooltipResponse;
  } | null>(null);
  const detailKeyRef = useRef<string | null>(null);
  const requestInFlightKeyRef = useRef<string | null>(null);
  const requestSequenceRef = useRef(0);
  const requestKey = `${kind}:${id}`;
  const detail = detailResult?.key === requestKey ? detailResult.response : null;

  const request = useCallback(() => {
    if (detailKeyRef.current === requestKey || requestInFlightKeyRef.current === requestKey) return;

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    requestInFlightKeyRef.current = requestKey;
    bridgeCall('game.get_world_glance_tooltip', { kind, id })
      .then((response) => {
        if (requestSequenceRef.current !== requestSequence) return;
        requestInFlightKeyRef.current = null;
        if (!response.found) return;
        detailKeyRef.current = requestKey;
        setDetailResult({ key: requestKey, response });
      })
      .catch(() => {
        if (requestSequenceRef.current === requestSequence) {
          requestInFlightKeyRef.current = null;
        }
      });
  }, [id, kind, requestKey]);

  return { detail, request };
}

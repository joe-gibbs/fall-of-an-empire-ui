import { useCallback, useEffect, useRef, useState } from 'react';
import { bridgeCall, type GetWorldGlanceTooltipResponse } from '../../bridge-types.generated.ts';

export function useWorldGlanceTooltip(kind: 'port' | 'convoy' | 'battle', id: string) {
  const [detail, setDetail] = useState<GetWorldGlanceTooltipResponse | null>(null);
  const detailKeyRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);
  const requestKey = `${kind}:${id}`;

  useEffect(() => {
    detailKeyRef.current = null;
    requestInFlightRef.current = false;
    setDetail(null);
  }, [id, kind]);

  const request = useCallback(() => {
    if (detailKeyRef.current === requestKey || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    bridgeCall('game.get_world_glance_tooltip', { kind, id })
      .then((response) => {
        requestInFlightRef.current = false;
        if (!response.found) return;
        detailKeyRef.current = requestKey;
        setDetail(response);
      })
      .catch(() => {
        requestInFlightRef.current = false;
      });
  }, [id, kind, requestKey]);

  return { detail, request };
}

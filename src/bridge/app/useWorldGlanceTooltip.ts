import { useCallback, useState } from 'react';
import { bridgeCall, type GetWorldGlanceTooltipResponse } from '../../bridge-types.generated.ts';

export function useWorldGlanceTooltip(kind: 'port' | 'convoy' | 'battle', id: string) {
  const [detail, setDetail] = useState<GetWorldGlanceTooltipResponse | null>(null);
  const request = useCallback(() => {
    setDetail(null);
    bridgeCall('game.get_world_glance_tooltip', { kind, id })
      .then((response) => {
        if (response.found) setDetail(response);
      })
      .catch(() => undefined);
  }, [id, kind]);

  return { detail, request };
}

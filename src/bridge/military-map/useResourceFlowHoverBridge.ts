import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetResourceFlowHoverResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export function useResourceFlowHoverBridge() {
  const [hover, setHover] = useState<GetResourceFlowHoverResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applyHover = (next: GetResourceFlowHoverResponse) => {
      if (!cancelled) setHover(next);
    };
    const unsubscribe = onBridgeEvent('game.get_resource_flow_hover', applyHover);

    bridgeCall('game.get_resource_flow_hover')
      .then(applyHover)
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return hover;
}

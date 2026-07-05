import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetProvinceTooltipResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export function useProvinceTooltipBridge() {
  const [tooltip, setTooltip] = useState<GetProvinceTooltipResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyTooltip = (next: GetProvinceTooltipResponse | null) => {
      if (cancelled) {
        return;
      }

      setTooltip(next);
    };

    const unsubscribe = onBridgeEvent('game.get_province_tooltip', (next) => {
      applyTooltip(next);
    });

    bridgeCall('game.get_province_tooltip')
      .then((next) => applyTooltip(next))
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return tooltip;
}

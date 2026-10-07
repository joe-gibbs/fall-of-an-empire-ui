import { useEffect, useId } from 'react';
import { bridgeCall, type PaganWorshipActionRequest } from '../../bridge-types.generated';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export function usePaganWorship(religionId: string | null) {
  const subscriptionId = useId();
  const data = useBridgeQuery({
    action: 'game.get_pagan_worship',
    payload: religionId === null ? null : { religionId, subscriptionId, subscribe: true },
    map: result => result,
    matchPush: result => result.subscriptionId === subscriptionId,
  });
  useEffect(() => () => {
    if (religionId !== null) void bridgeCall('game.get_pagan_worship', {
      religionId, subscriptionId, subscribe: false,
    }).catch(acknowledgeBridgeFailure);
  }, [religionId, subscriptionId]);
  return data;
}

export function performPaganWorship(request: PaganWorshipActionRequest) {
  return bridgeCall('game.pagan_worship_action', request);
}

export function useHeldPaganRelics(factionId: string) {
  const subscriptionId = useId();
  const data = useBridgeQuery({ action: 'game.get_held_relics', payload: { factionId, subscriptionId, subscribe: true }, map: result => result,
    matchPush: result => result.factionId === factionId,
  });
  useEffect(() => () => { void bridgeCall('game.get_held_relics', { factionId, subscriptionId, subscribe: false }).catch(acknowledgeBridgeFailure); }, [factionId, subscriptionId]);
  return data;
}

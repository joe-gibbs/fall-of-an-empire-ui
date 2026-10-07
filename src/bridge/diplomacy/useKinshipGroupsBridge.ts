import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated';
import type { GetKinshipGroupsResponse } from '../../bridge-types.generated';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { useBridgeQuery } from '../core/useBridgeQuery';

let nextKinshipSubscriptionId = 0;

export function useKinshipGroupsBridge() {
  const [data, setData] = useState<GetKinshipGroupsResponse | null>(null);
  useEffect(() => {
    const subscriptionId = `kinship-${++nextKinshipSubscriptionId}`;
    let cancelled = false;
    const applyResponse = (response: GetKinshipGroupsResponse) => {
      if (!cancelled) setData(response);
    };
    const unsubscribe = onBridgeEvent('game.get_kinship_groups', applyResponse);
    const unsubscribeChanges = onBridgeEvent('game.change_personal_warband', () => {
      void bridgeCall('game.get_kinship_groups', { subscriptionId, subscribe: true }).then(applyResponse).catch(acknowledgeBridgeFailure);
    });
    bridgeCall('game.get_kinship_groups', { subscriptionId, subscribe: true })
      .then(applyResponse)
      .catch(acknowledgeBridgeFailure);
    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeChanges();
      bridgeCall('game.get_kinship_groups', { subscriptionId, subscribe: false })
        .catch(acknowledgeBridgeFailure);
    };
  }, []);
  return data;
}

export function useKinshipGroupDetailBridge(groupId: string | null, personId: string | null = null) {
  return useBridgeQuery({
    action: 'game.get_kinship_group_detail',
    payload: groupId || personId ? { groupId: groupId ?? '', personId: personId ?? '' } : null,
    map: data => personId ? { ...data, focusPersonId: personId } : data,
    matchPush: data => groupId ? data.group.id === groupId : data.group.members.some(member => member.id === personId),
    refreshOn: ['game.change_personal_warband', 'game.muster_warbands', 'game.get_kinship_groups', 'game.get_warbands'],
  });
}

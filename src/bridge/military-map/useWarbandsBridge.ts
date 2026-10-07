import { useBridgeQuery } from '../core/useBridgeQuery';

export function useWarbandsBridge(musterSiteId = '') {
  return useBridgeQuery({ action: 'game.get_warbands', payload: { musterSiteId }, map: data => data, keepPreviousData: true, refreshOn: ['game.change_personal_warband'] });
}

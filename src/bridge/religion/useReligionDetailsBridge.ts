import { useBridgeQuery } from '../core/useBridgeQuery';

export function useReligionDetailsBridge(religionId: string | null) {
  return useBridgeQuery({
    action: 'game.get_religion_details',
    payload: religionId ? { religionId } : null,
    map: data => data,
  });
}

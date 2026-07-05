import { useBridgeQuery } from '../core/useBridgeQuery';
import type { GetEncyclopediaEntriesResponse } from '../../bridge-types.generated.ts';

export function useEncyclopediaBridge(): GetEncyclopediaEntriesResponse | null {
  return useBridgeQuery({
    action: 'game.get_encyclopedia_entries',
    cacheResponse: true,
    map: (data) => data,
  });
}

import { useBridgeQuery } from '../core/useBridgeQuery';

export function useCultureDevelopmentBridge(cultureId: string | null) {
  return useBridgeQuery({
    action: 'game.get_culture_development',
    payload: cultureId ? { cultureId } : null,
    map: data => data,
  });
}

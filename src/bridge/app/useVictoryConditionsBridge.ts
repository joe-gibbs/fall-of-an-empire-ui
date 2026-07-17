import { useBridgeQuery } from '../core/useBridgeQuery';
import type { GetVictoryConditionsResponse } from '../../bridge-types.generated.ts';
import { WebkilnAssetPath } from '../../utils/assets';

let victoryConditionsCache: GetVictoryConditionsResponse | null = null;

export function clearVictoryConditionsCache(): void {
  victoryConditionsCache = null;
}

function mapResponse(data: GetVictoryConditionsResponse): GetVictoryConditionsResponse {
  const mapped = {
    ...data,
    tiers: data.tiers.map((tier) => ({
      ...tier,
      iconPath: WebkilnAssetPath(tier.iconPath) ?? '',
    })),
  };
  victoryConditionsCache = mapped;
  return mapped;
}

export function useVictoryConditionsBridge(enabled = true): GetVictoryConditionsResponse | null {
  const live = useBridgeQuery({
    action: 'game.get_victory_conditions',
    payload: enabled ? undefined : null,
    map: mapResponse,
  });

  return live ?? victoryConditionsCache;
}

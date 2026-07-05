import { useEffect } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export function useFactionBorderHighlightBridge(factionId: string | null | undefined) {
  useEffect(() => {
    const activeFactionId = factionId || '';

    bridgeCall('game.set_faction_border_highlight', {
      factionId: activeFactionId,
      highlighted: activeFactionId.length > 0,
    }).catch(error => acknowledgeBridgeFailure(error, 'game.set_faction_border_highlight'));

    return () => {
      bridgeCall('game.set_faction_border_highlight', {
        factionId: '',
        highlighted: false,
      }).catch(error => acknowledgeBridgeFailure(error, 'game.set_faction_border_highlight'));
    };
  }, [factionId]);
}

import { useEffect } from 'react';
import { bridgeCall, onBridgeEvent, type HintEventsResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export interface HintEventHandlers {
  onHintShown: (hint: HintEventsResponse) => void;
}

export function useHintEventsBridge(handlers: HintEventHandlers) {
  useEffect(() => onBridgeEvent('game.hint_events', hint => {
    if (!hint || (!hint.title && hint.paragraphs.length === 0)) return;
    handlers.onHintShown(hint);
  }), [handlers]);

  useEffect(() => {
    bridgeCall('game.hint_events', { command: 'bind', hintKey: '', force: false }).catch(acknowledgeBridgeFailure);
  }, []);
}

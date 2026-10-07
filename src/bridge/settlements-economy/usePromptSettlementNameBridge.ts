import { useCallback, useEffect, useState } from 'react';
import { onBridgeEvent } from '../../bridge-types.generated.ts';
import { GAMEPLAY_CONTEXT_RESET_EVENT } from '../core/gameplayCacheReset';
import { bridgeEvents } from '../core/bridgeEvents';
import { renameSettlementBridge } from './useSettlementManagementBridge';

export interface PromptSettlementNameState {
  open: boolean;
  settlementId: string;
  suggestedName: string;
}

const CLOSED: PromptSettlementNameState = {
  open: false,
  settlementId: '',
  suggestedName: '',
};

export function usePromptSettlementNameBridge() {
  const [state, setState] = useState<PromptSettlementNameState>(CLOSED);

  useEffect(() => onBridgeEvent('game.prompt_settlement_name', (event) => {
    if (!event.open || !event.settlementId) {
      setState(CLOSED);
      return;
    }
    setState({
      open: true,
      settlementId: event.settlementId,
      suggestedName: event.suggestedName,
    });
  }), []);

  useEffect(() => {
    const handleReset = () => setState(CLOSED);
    bridgeEvents.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
    return () => bridgeEvents.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
  }, []);

  const close = useCallback(() => setState(CLOSED), []);

  const confirm = useCallback((name: string) => {
    const settlementId = state.settlementId;
    const nextName = name.trim();
    setState(CLOSED);
    if (!settlementId || !nextName || nextName === state.suggestedName) {
      return;
    }
    void renameSettlementBridge(settlementId, nextName, true);
  }, [state.settlementId, state.suggestedName]);

  return { state, close, confirm };
}

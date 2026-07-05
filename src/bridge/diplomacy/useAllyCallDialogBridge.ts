import { useCallback, useEffect, useRef, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { AllyCallDialogEvent } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type AllyCallDialogState = AllyCallDialogEvent;

const CLOSED_STATE: AllyCallDialogState = {
  open: false,
  requestId: '',
  enemyId: '',
  enemyName: '',
  isDefensive: false,
  allies: [],
};

export function useAllyCallDialogBridge() {
  const [state, setState] = useState<AllyCallDialogState>(CLOSED_STATE);
  const activeRequestIdRef = useRef('');

  useEffect(() => onBridgeEvent('ui.ally_call_dialog', (event) => {
    if (!event.open) {
      activeRequestIdRef.current = '';
      setState(CLOSED_STATE);
      return;
    }

    activeRequestIdRef.current = event.requestId;
    setState(event);
  }), []);

  const respond = useCallback((requestId: string, selectedAllyIds: string[], cancelled: boolean) => {
    if (!requestId || activeRequestIdRef.current !== requestId) {
      return;
    }

    activeRequestIdRef.current = '';
    setState(CLOSED_STATE);

    bridgeCall('ui.ally_call_dialog', {
      requestId,
      selectedAllyIds,
      cancelled,
    }).catch(error => acknowledgeBridgeFailure(error, 'ui.ally_call_dialog'));
  }, []);

  return { state, respond };
}

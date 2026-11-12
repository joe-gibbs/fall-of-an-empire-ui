import { useCallback, useEffect, useRef, useState } from 'react';

type PresencePhase = 'entered' | 'closingByRequest' | 'closingExternally' | 'closed';

interface PresenceState {
  observedVisible: boolean;
  phase: PresencePhase;
  closeRequestId: number;
  afterClose?: () => void;
}

interface AnimatedPresenceOptions {
  durationMs: number;
  onClosed?: () => void;
}

interface AnimatedPresence {
  mounted: boolean;
  closing: boolean;
  requestClose: (afterClose?: () => void) => void;
}

export function useAnimatedPresence(
  visible: boolean,
  { durationMs, onClosed }: AnimatedPresenceOptions,
): AnimatedPresence {
  const [state, setState] = useState<PresenceState>(() => ({
    observedVisible: visible,
    phase: visible ? 'entered' : 'closed',
    closeRequestId: 0,
  }));
  const requestCloseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const externalCloseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  let current = state;
  if (visible !== state.observedVisible) {
    current = visible
      ? {
          observedVisible: true,
          phase: 'entered',
          closeRequestId: state.closeRequestId,
        }
      : {
          observedVisible: false,
          phase: state.phase === 'closed' ? 'closed' : 'closingExternally',
          closeRequestId: state.phase === 'closed' ? state.closeRequestId : state.closeRequestId + 1,
        };
    setState(current);
  }

  const phase = current.phase;
  const closeRequestId = current.closeRequestId;
  const requestAfterClose = current.afterClose;

  useEffect(() => {
    if (visible) {
      clearTimeout(externalCloseTimerRef.current);
      externalCloseTimerRef.current = undefined;
      return;
    }

    clearTimeout(requestCloseTimerRef.current);
    requestCloseTimerRef.current = undefined;
  }, [visible]);

  useEffect(() => {
    if (phase !== 'closingByRequest') return;

    clearTimeout(requestCloseTimerRef.current);
    requestCloseTimerRef.current = setTimeout(() => {
      requestCloseTimerRef.current = undefined;
      const afterClose = requestAfterClose ?? onClosedRef.current;
      setState((nextState) => (
        nextState.phase === 'closingByRequest'
          && nextState.closeRequestId === closeRequestId
          ? {
              observedVisible: nextState.observedVisible,
              phase: 'closed',
              closeRequestId: nextState.closeRequestId,
            }
          : nextState
      ));
      afterClose?.();
    }, durationMs);

    return () => {
      clearTimeout(requestCloseTimerRef.current);
      requestCloseTimerRef.current = undefined;
    };
  }, [phase, closeRequestId, durationMs, requestAfterClose]);

  useEffect(() => {
    if (phase !== 'closingExternally') return;

    clearTimeout(externalCloseTimerRef.current);
    externalCloseTimerRef.current = setTimeout(() => {
      externalCloseTimerRef.current = undefined;
      setState((nextState) => (
        nextState.phase === 'closingExternally'
          && nextState.closeRequestId === closeRequestId
          ? {
              observedVisible: false,
              phase: 'closed',
              closeRequestId: nextState.closeRequestId,
            }
          : nextState
      ));
      onClosedRef.current?.();
    }, durationMs);

    return () => {
      clearTimeout(externalCloseTimerRef.current);
      externalCloseTimerRef.current = undefined;
    };
  }, [phase, closeRequestId, durationMs]);

  useEffect(() => () => {
    clearTimeout(requestCloseTimerRef.current);
    clearTimeout(externalCloseTimerRef.current);
  }, []);

  const requestClose = useCallback((afterClose?: () => void) => {
    setState((nextState) => {
      if (nextState.phase !== 'entered') return nextState;
      return {
        observedVisible: nextState.observedVisible,
        phase: 'closingByRequest',
        afterClose,
        closeRequestId: nextState.closeRequestId + 1,
      };
    });
  }, []);

  return {
    mounted: phase !== 'closed',
    closing: phase === 'closingByRequest' || phase === 'closingExternally',
    requestClose,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

type PresencePhase = 'entered' | 'closing' | 'closed';
type ClosePath = 'request' | 'external';

interface PresenceState {
  observedVisible: boolean;
  phase: PresencePhase;
  closeRequestId: number;
  closePath?: ClosePath;
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
  const requestAfterCloseRef = useRef<(() => void) | undefined>(undefined);
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
          closePath: undefined,
        }
      : {
          observedVisible: false,
          phase: state.phase === 'closed' ? 'closed' : 'closing',
          closeRequestId: state.phase === 'closed' ? state.closeRequestId : state.closeRequestId + 1,
          closePath: state.phase === 'closed' ? undefined : 'external',
        };
    setState(current);
  }

  const phase = current.phase;
  const closeRequestId = current.closeRequestId;
  const closePath = current.closePath;

  useEffect(() => {
    if (visible) {
      clearTimeout(externalCloseTimerRef.current);
      externalCloseTimerRef.current = undefined;
      return;
    }

    clearTimeout(requestCloseTimerRef.current);
    requestCloseTimerRef.current = undefined;
    requestAfterCloseRef.current = undefined;
  }, [visible]);

  useEffect(() => {
    if (phase !== 'closing' || closePath !== 'request') return;

    clearTimeout(requestCloseTimerRef.current);
    requestCloseTimerRef.current = setTimeout(() => {
      requestCloseTimerRef.current = undefined;
      const afterClose = requestAfterCloseRef.current ?? onClosedRef.current;
      requestAfterCloseRef.current = undefined;
      setState((nextState) => (
        nextState.phase === 'closing'
          && nextState.closePath === 'request'
          && nextState.closeRequestId === closeRequestId
          ? {
              observedVisible: false,
              phase: 'closed',
              closeRequestId: nextState.closeRequestId,
              closePath: undefined,
            }
          : nextState
      ));
      afterClose?.();
    }, durationMs);

    return () => {
      clearTimeout(requestCloseTimerRef.current);
      requestCloseTimerRef.current = undefined;
    };
  }, [phase, closePath, closeRequestId, durationMs]);

  useEffect(() => {
    if (phase !== 'closing' || closePath !== 'external') return;

    clearTimeout(externalCloseTimerRef.current);
    externalCloseTimerRef.current = setTimeout(() => {
      externalCloseTimerRef.current = undefined;
      setState((nextState) => (
        nextState.phase === 'closing'
          && nextState.closePath === 'external'
          && nextState.closeRequestId === closeRequestId
          ? {
              observedVisible: false,
              phase: 'closed',
              closeRequestId: nextState.closeRequestId,
              closePath: undefined,
            }
          : nextState
      ));
      onClosedRef.current?.();
    }, durationMs);

    return () => {
      clearTimeout(externalCloseTimerRef.current);
      externalCloseTimerRef.current = undefined;
    };
  }, [phase, closePath, closeRequestId, durationMs]);

  useEffect(() => () => {
    clearTimeout(requestCloseTimerRef.current);
    clearTimeout(externalCloseTimerRef.current);
  }, []);

  const requestClose = useCallback((afterClose?: () => void) => {
    requestAfterCloseRef.current = afterClose;
    setState((nextState) => {
      if (nextState.phase !== 'entered') return nextState;
      return {
        observedVisible: nextState.observedVisible,
        phase: 'closing',
        closeRequestId: nextState.closeRequestId + 1,
        closePath: 'request',
      };
    });
  }, []);

  return {
    mounted: phase !== 'closed',
    closing: phase === 'closing',
    requestClose,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

type PresencePhase = 'entered' | 'closing' | 'closed';

interface PresenceState {
  observedVisible: boolean;
  phase: PresencePhase;
  closeRequestId: number;
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const afterCloseRef = useRef<(() => void) | undefined>(undefined);

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
          phase: state.phase === 'closed' ? 'closed' : 'closing',
          closeRequestId: state.phase === 'closed' ? state.closeRequestId : state.closeRequestId + 1,
        };
    setState(current);
  }

  const phase = current.phase;
  const closeRequestId = current.closeRequestId;

  useEffect(() => {
    if (!visible) return;
    clearTimeout(timerRef.current);
    afterCloseRef.current = undefined;
  }, [visible]);

  useEffect(() => {
    if (phase !== 'closing') return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const afterClose = afterCloseRef.current ?? onClosed;
      afterCloseRef.current = undefined;
      setState((nextState) => (
        nextState.phase === 'closing'
          ? { observedVisible: false, phase: 'closed', closeRequestId: nextState.closeRequestId }
          : nextState
      ));
      afterClose?.();
    }, durationMs);

    return () => clearTimeout(timerRef.current);
  }, [phase, closeRequestId, durationMs, onClosed]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const requestClose = useCallback((afterClose?: () => void) => {
    afterCloseRef.current = afterClose;
    setState((nextState) => {
      if (nextState.phase !== 'entered') return nextState;
      return {
        observedVisible: nextState.observedVisible,
        phase: 'closing',
        closeRequestId: nextState.closeRequestId + 1,
      };
    });
  }, []);

  return {
    mounted: phase !== 'closed',
    closing: phase === 'closing',
    requestClose,
  };
}

import { useCallback, type MouseEvent } from 'react';
import { useEscapeStackEntry } from '../context/EscapeStack';
import { useAnimatedPresence } from './useAnimatedPresence';
import { UI_MOTION } from '../config/motion';

type ModalCloseStrategy = 'notify' | 'request';

interface UseModalPresenceOptions {
  open: boolean;
  onClose: () => void;
  escapeId: string;
  durationMs?: number;
  allowFromInput?: boolean;
  closeStrategy?: ModalCloseStrategy;
  onBeforeClose?: () => void;
}

interface UseModalPresenceResult {
  mounted: boolean;
  closing: boolean;
  close: () => void;
  requestClose: (afterClose?: () => void) => void;
  stopPropagation: (event: MouseEvent<HTMLElement>) => void;
}

export function useModalPresence({
  open,
  onClose,
  escapeId,
  durationMs = UI_MOTION.modalCloseMs,
  allowFromInput = false,
  closeStrategy = 'notify',
  onBeforeClose,
}: UseModalPresenceOptions): UseModalPresenceResult {
  const shouldNotifyAfterClose = closeStrategy === 'request';
  const {
    mounted,
    closing,
    requestClose: requestAnimatedClose,
  } = useAnimatedPresence(open, {
    durationMs,
    onClosed: shouldNotifyAfterClose ? onClose : undefined,
  });

  const requestClose = useCallback((afterClose?: () => void) => {
    if (closing) return;
    requestAnimatedClose(afterClose);
  }, [closing, requestAnimatedClose]);

  const close = useCallback(() => {
    if (closing) return;
    onBeforeClose?.();

    if (closeStrategy === 'request') {
      requestAnimatedClose(onClose);
      return;
    }

    onClose();
  }, [closeStrategy, closing, onBeforeClose, onClose, requestAnimatedClose]);

  useEscapeStackEntry({
    id: escapeId,
    active: mounted,
    onClose: close,
    allowFromInput,
  });

  const stopPropagation = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  }, []);

  return {
    mounted,
    closing,
    close,
    requestClose,
    stopPropagation,
  };
}

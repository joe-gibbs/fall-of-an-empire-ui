import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  EscapeStackContext,
  isEscapeTextEntryTarget,
  type EscapeStackContextValue,
  type EscapeStackRecord,
  type RegisterEscapeStackEntryArgs,
} from './EscapeStack';

const ESCAPE_DEBOUNCE_MS = 80;

export function EscapeStackProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<EscapeStackRecord[]>([]);
  const lastHandledAtRef = useRef(0);

  const registerEntry = useCallback((entry: RegisterEscapeStackEntryArgs) => {
    const record: EscapeStackRecord = {
      id: entry.id,
      orderKey: entry.orderKey,
      onCloseRef: entry.onCloseRef,
      allowFromInput: entry.allowFromInput ?? false,
    };

    const existingIndex = stackRef.current.findIndex(item => item.id === entry.id);
    if (existingIndex !== -1) stackRef.current.splice(existingIndex, 1);
    stackRef.current.push(record);

    return () => {
      const index = stackRef.current.findIndex(item => (
        item.id === entry.id
        && item.orderKey === entry.orderKey
      ));
      if (index !== -1) stackRef.current.splice(index, 1);
    };
  }, []);

  const closeLatest = useCallback((options: { fromInput?: boolean } = {}) => {
    const latest = stackRef.current[stackRef.current.length - 1];
    if (!latest) return false;
    if (options.fromInput && !latest.allowFromInput) return false;

    latest.onCloseRef.current();
    return true;
  }, []);

  const markEscapeHandled = useCallback(() => {
    lastHandledAtRef.current = Date.now();
  }, []);

  const handleEscapeStack = useCallback((options: { fromInput?: boolean } = {}) => {
    const now = Date.now();
    if (now - lastHandledAtRef.current < ESCAPE_DEBOUNCE_MS) return true;

    const closed = closeLatest(options);
    if (closed) lastHandledAtRef.current = now;
    return closed;
  }, [closeLatest]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.code !== 'Escape') return;

      const handled = handleEscapeStack({
        fromInput: isEscapeTextEntryTarget(event.target),
      });
      if (!handled) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [handleEscapeStack]);

  useEffect(() => {
    const handler = (event: Event) => {
      const handled = handleEscapeStack({ fromInput: false });
      if (!handled) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('bridge:ui.escape_pressed', handler);
    return () => window.removeEventListener('bridge:ui.escape_pressed', handler);
  }, [handleEscapeStack]);

  const value = useMemo<EscapeStackContextValue>(() => ({
    registerEntry,
    closeLatest,
    handleEscapeStack,
    markEscapeHandled,
  }), [registerEntry, closeLatest, handleEscapeStack, markEscapeHandled]);

  return (
    <EscapeStackContext.Provider value={value}>
      {children}
    </EscapeStackContext.Provider>
  );
}

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

import { bridgeEvents } from '../bridge/core/bridgeEvents';
import { useSettingsBridge } from '../bridge/app/useSettingsBridge';
import { findActionBinding } from '../utils/actionBindings';
import { createConfirmationPress, matchesConfirmationBinding } from '../input/confirmation';

const ESCAPE_DEBOUNCE_MS = 80;

export function EscapeStackProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<EscapeStackRecord[]>([]);
  const lastHandledAtRef = useRef(0);
  const { settings } = useSettingsBridge();
  const confirmBinding = findActionBinding(settings?.controls, 'Confirm', 'keyboard');

  const registerEntry = useCallback((entry: RegisterEscapeStackEntryArgs) => {
    const record: EscapeStackRecord = {
      id: entry.id,
      orderKey: entry.orderKey,
      onCloseRef: entry.onCloseRef,
      onConfirmRef: entry.onConfirmRef,
      canConfirmRef: entry.canConfirmRef,
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

    bridgeEvents.addEventListener('ui.escape_pressed', handler);
    return () => bridgeEvents.removeEventListener('ui.escape_pressed', handler);
  }, [handleEscapeStack]);

  useEffect(() => {
    const press = createConfirmationPress<EscapeStackRecord>();
    let heldCode: string | null = null;
    let claimed = false;
    const latest = () => stackRef.current.at(-1) ?? null;
    const enabled = (entry: EscapeStackRecord | null) => Boolean(entry?.onConfirmRef.current && entry.canConfirmRef.current);
    const fromInput = (target: EventTarget | null) => isEscapeTextEntryTarget(target) || isEscapeTextEntryTarget(document.activeElement);
    const cancel = () => { heldCode = null; claimed = false; press.cancel(); };
    const keyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !matchesConfirmationBinding(confirmBinding, event)) return;
      heldCode = event.code;
      const entry = latest();
      const editing = fromInput(event.target);
      press.press(entry, enabled(entry), editing, event.repeat);
      claimed = Boolean(entry?.onConfirmRef.current) && !editing;
      if (!claimed) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code !== heldCode) return;
      heldCode = null;
      const entry = latest();
      const confirmed = press.release(entry, enabled(entry), fromInput(event.target));
      if (claimed) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      claimed = false;
      confirmed?.onConfirmRef.current?.();
    };
    const nativePress = () => {
      const entry = latest();
      press.press(entry, enabled(entry), fromInput(null), false);
    };
    const nativeRelease = () => {
      const entry = latest();
      press.release(entry, enabled(entry), fromInput(null))?.onConfirmRef.current?.();
    };
    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('keyup', keyUp, true);
    window.addEventListener('blur', cancel);
    bridgeEvents.addEventListener('ui.confirm_pressed', nativePress);
    bridgeEvents.addEventListener('ui.confirm_released', nativeRelease);
    return () => {
      cancel();
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
      window.removeEventListener('blur', cancel);
      bridgeEvents.removeEventListener('ui.confirm_pressed', nativePress);
      bridgeEvents.removeEventListener('ui.confirm_released', nativeRelease);
    };
  }, [confirmBinding]);

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

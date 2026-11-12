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
  type EscapeFallbackRecord,
  type EscapeStackContextValue,
  type EscapeStackRecord,
} from './EscapeStack';

import { bridgeEvents } from '../bridge/core/bridgeEvents';
import { useSettingsBridge } from '../bridge/app/useSettingsBridge';
import { findActionBinding } from '../utils/actionBindings';
import { createConfirmationPress, matchesConfirmationBinding } from '../input/confirmation';

function removeByToken<T extends { token: string }>(items: T[], token: string) {
  const index = items.findIndex(item => item.token === token);
  if (index !== -1) items.splice(index, 1);
}

export function EscapeStackProvider({ children }: { children: ReactNode }) {
  // Sorted by opening order; the last entry is the one on top.
  const stackRef = useRef<EscapeStackRecord[]>([]);
  // Sorted by priority; the last fallback is tried first.
  const fallbacksRef = useRef<EscapeFallbackRecord[]>([]);
  const { settings } = useSettingsBridge();
  const confirmBinding = findActionBinding(settings?.controls, 'Confirm', 'keyboard');

  const registerEntry = useCallback((record: EscapeStackRecord) => {
    const stack = stackRef.current;
    removeByToken(stack, record.token);
    const index = stack.findIndex(item => item.openedAt > record.openedAt);
    stack.splice(index === -1 ? stack.length : index, 0, record);
    return () => removeByToken(stackRef.current, record.token);
  }, []);

  const registerFallback = useCallback((record: EscapeFallbackRecord) => {
    const fallbacks = fallbacksRef.current;
    removeByToken(fallbacks, record.token);
    const index = fallbacks.findIndex(item => item.priority > record.priority);
    fallbacks.splice(index === -1 ? fallbacks.length : index, 0, record);
    return () => removeByToken(fallbacksRef.current, record.token);
  }, []);

  const dispatchEscape = useCallback((options: { fromInput?: boolean } = {}) => {
    const top = stackRef.current.at(-1);
    if (top) {
      if (options.fromInput && !top.allowFromInput) return false;
      top.onCloseRef.current();
      return true;
    }
    if (options.fromInput) return false;
    for (const fallback of [...fallbacksRef.current].reverse()) {
      if (fallback.handleRef.current()) return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.code !== 'Escape') return;
      // Holding Escape must not close one layer per key repeat.
      if (event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      const handled = dispatchEscape({
        fromInput: isEscapeTextEntryTarget(event.target),
      });
      if (!handled) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [dispatchEscape]);

  useEffect(() => {
    // The game sends this only when the viewport has keyboard focus; a press the
    // browser view receives arrives as the keydown above instead.
    const handler = () => { dispatchEscape({ fromInput: false }); };

    bridgeEvents.addEventListener('ui.escape_pressed', handler);
    return () => bridgeEvents.removeEventListener('ui.escape_pressed', handler);
  }, [dispatchEscape]);

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
    registerFallback,
    dispatchEscape,
  }), [registerEntry, registerFallback, dispatchEscape]);

  return (
    <EscapeStackContext.Provider value={value}>
      {children}
    </EscapeStackContext.Provider>
  );
}

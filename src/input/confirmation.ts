import { browserKeyToUnrealKey } from '../bridge/core/browserKeyToUnrealKey.ts';
import type { ActionBindingLike } from '../utils/actionBindings.ts';

type ConfirmationKeyEvent = Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>;

export function matchesConfirmationBinding(binding: ActionBindingLike | null, event: ConfirmationKeyEvent): boolean {
  return binding !== null
    && binding.keyName === browserKeyToUnrealKey(event.code, event.key)
    && Boolean(binding.ctrl) === event.ctrlKey
    && Boolean(binding.shift) === event.shiftKey
    && Boolean(binding.alt) === event.altKey
    && Boolean(binding.cmd) === event.metaKey;
}

/** A key held before a dialog opens must never confirm that new dialog on release. */
export function createConfirmationPress<T>() {
  let held = false;
  let target: T | null = null;
  return {
    press(current: T | null, enabled: boolean, fromInput: boolean, repeat: boolean): boolean {
      if (held || repeat) return target !== null;
      held = true;
      target = enabled && !fromInput ? current : null;
      return target !== null;
    },
    release(current: T | null, enabled: boolean, fromInput: boolean): T | null {
      const confirmed = target !== null && target === current && enabled && !fromInput ? target : null;
      held = false;
      target = null;
      return confirmed;
    },
    cancel() {
      held = false;
      target = null;
    },
  };
}

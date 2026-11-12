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
  type PressState = { phase: 'released' | 'ignored' } | { phase: 'armed'; target: T };
  let state: PressState = { phase: 'released' };
  return {
    press(current: T | null, enabled: boolean, fromInput: boolean, repeat: boolean): boolean {
      if (state.phase !== 'released' || repeat) return state.phase === 'armed';
      state = enabled && !fromInput && current !== null
        ? { phase: 'armed', target: current }
        : { phase: 'ignored' };
      return state.phase === 'armed';
    },
    release(current: T | null, enabled: boolean, fromInput: boolean): T | null {
      const confirmed = state.phase === 'armed' && state.target === current && enabled && !fromInput ? current : null;
      state = { phase: 'released' };
      return confirmed;
    },
    cancel() {
      state = { phase: 'released' };
    },
  };
}

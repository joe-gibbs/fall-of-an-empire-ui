import { useSyncExternalStore } from 'react';
import { formatNumber } from './numberFormat';
import { subscribeBridgeEvent } from '../bridge/core/bridgeEvents';

/** Shared click multipliers for quantity +/- controls. */
export const STEP_MULTIPLIER_SHIFT = 5;
export const STEP_MULTIPLIER_CTRL = 10;
export const STEP_MULTIPLIER_CTRL_SHIFT = 50;

export type StepModifierKeys = {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey?: boolean;
};

/**
 * Multiplier for quantity steppers and trade clicks:
 * none = 1x, Shift = 5x, Ctrl = 10x, Ctrl+Shift = 50x.
 * Meta (Cmd on macOS) counts as Ctrl.
 */
export function stepMultiplierFromEvent(event: StepModifierKeys): number {
  const ctrl = event.ctrlKey || Boolean(event.metaKey);
  if (ctrl && event.shiftKey) return STEP_MULTIPLIER_CTRL_SHIFT;
  if (ctrl) return STEP_MULTIPLIER_CTRL;
  if (event.shiftKey) return STEP_MULTIPLIER_SHIFT;
  return 1;
}

/** Base step times the modifier-key multiplier. */
export function stepAmountFromEvent(event: StepModifierKeys, baseStep = 1): number {
  return baseStep * stepMultiplierFromEvent(event);
}

export function stepAmountFromMultiplier(multiplier: number, baseStep = 1): number {
  return baseStep * multiplier;
}

/** Label for a +/- button: "+" / "-" at 1, otherwise "+5" / "-10". */
export function stepButtonLabel(direction: 1 | -1, amount: number): string {
  if (amount <= 1) return direction > 0 ? '+' : '-';
  const formatted = formatNumber(amount);
  return direction > 0 ? `+${formatted}` : `-${formatted}`;
}

// --- Live keyboard modifier state for button labels ---

let listening = false;
let heldShift = false;
let heldCtrl = false;
let currentMultiplier = 1;
const subscribers = new Set<() => void>();

function publishMultiplier(): void {
  const next = stepMultiplierFromEvent({ shiftKey: heldShift, ctrlKey: heldCtrl });
  if (next === currentMultiplier) return;
  currentMultiplier = next;
  subscribers.forEach(listener => listener());
}

function setHeldKeys(shift: boolean, ctrl: boolean): void {
  if (heldShift === shift && heldCtrl === ctrl) return;
  heldShift = shift;
  heldCtrl = ctrl;
  publishMultiplier();
}

/** Update held modifiers from any input event that carries shift/ctrl flags. */
export function noteModifierKeysFromEvent(event: StepModifierKeys): void {
  setHeldKeys(event.shiftKey, event.ctrlKey || Boolean(event.metaKey));
}

function onKeyDown(event: KeyboardEvent): void {
  let shift = event.shiftKey;
  let ctrl = event.ctrlKey || event.metaKey;
  // Modifier-only presses are more reliable via code than shiftKey flags in some hosts.
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shift = true;
  if (
    event.code === 'ControlLeft' || event.code === 'ControlRight'
    || event.code === 'MetaLeft' || event.code === 'MetaRight'
  ) {
    ctrl = true;
  }
  setHeldKeys(shift, ctrl);
}

function onKeyUp(event: KeyboardEvent): void {
  let shift = event.shiftKey;
  let ctrl = event.ctrlKey || event.metaKey;
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shift = false;
  if (
    event.code === 'ControlLeft' || event.code === 'ControlRight'
    || event.code === 'MetaLeft' || event.code === 'MetaRight'
  ) {
    ctrl = false;
  }
  setHeldKeys(shift, ctrl);
}

function onPointerSample(event: MouseEvent | PointerEvent | WheelEvent): void {
  noteModifierKeysFromEvent(event);
}

function clearHeldKeys(): void {
  setHeldKeys(false, false);
}

function onNativeModifierKeys(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const payload = data as { shift?: unknown; ctrl?: unknown };
  setHeldKeys(Boolean(payload.shift), Boolean(payload.ctrl));
}

function ensureListening(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;

  // In-game CEF often keeps keyboard focus on the game viewport, so keydown for
  // Shift/Ctrl never arrives. Pointer events and native ui.modifier_keys carry
  // the real modifier state from Unreal instead.
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('pointermove', onPointerSample, true);
  window.addEventListener('pointerdown', onPointerSample, true);
  window.addEventListener('pointerenter', onPointerSample, true);
  window.addEventListener('mousemove', onPointerSample, true);
  window.addEventListener('mousedown', onPointerSample, true);
  window.addEventListener('mouseover', onPointerSample, true);
  window.addEventListener('wheel', onPointerSample, true);
  window.addEventListener('blur', clearHeldKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') clearHeldKeys();
  });

  subscribeBridgeEvent('ui.modifier_keys', onNativeModifierKeys);
}

function subscribeStepMultiplier(onStoreChange: () => void): () => void {
  ensureListening();
  subscribers.add(onStoreChange);
  return () => {
    subscribers.delete(onStoreChange);
  };
}

function getStepMultiplierSnapshot(): number {
  return currentMultiplier;
}

function getStepMultiplierServerSnapshot(): number {
  return 1;
}

/** Live Shift/Ctrl multiplier while those keys are held (for button labels). */
export function useStepMultiplier(): number {
  return useSyncExternalStore(
    subscribeStepMultiplier,
    getStepMultiplierSnapshot,
    getStepMultiplierServerSnapshot,
  );
}

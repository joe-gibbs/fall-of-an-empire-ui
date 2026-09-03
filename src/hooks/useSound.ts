import { useCallback, useEffect } from 'react';
import { acknowledgeBridgeFailure, callRuntimeBridge } from '../bridge/core/runtimeEngine';

const SOUND_EVENT_IDS = {
  click: 'UI_ButtonClick',
  hover: 'UI_ButtonClick',
  whoosh: 'UI_EventOpen',
  interactionSuccess: 'Notification_ActionSuccess',
  confirm: 'UI_ButtonClick',
  error: 'UI_Demolish',
  tab: 'UI_ButtonClick',
  open: 'UI_SidebarOpen',
  close: 'UI_SidebarOpen',
  eventOpen: 'UI_EventOpen',
  eventClose: 'UI_SidebarOpen',
} as const;

export type SoundName = keyof typeof SOUND_EVENT_IDS;

const VOLUME: Partial<Record<SoundName, number>> = {
  click: 0.5,
  open: 0.55,
  close: 0.35,
  whoosh: 0.5,
  hover: 0.4,
  tab: 0.45,
  eventOpen: 0.6,
  eventClose: 0.45,
};

function playSound(name: SoundName, volume?: number) {
  void callRuntimeBridge({
    action: 'StrategyPlayUISound',
    payload: [SOUND_EVENT_IDS[name], volume ?? VOLUME[name] ?? 1],
  })
    .catch(error => acknowledgeBridgeFailure(error, 'StrategyPlayUISound'));
}

function ensureLoaded() {
  // UI sounds are preloaded by the game data subsystem.
}

export function useSound() {
  ensureLoaded();

  const play = useCallback((name: SoundName, volume?: number) => {
    playSound(name, volume);
  }, []);

  return { play };
}

export function useButtonClickSound() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;

      const button = event.target.closest('button');
      if (!(button instanceof HTMLButtonElement) || button.disabled || button.getAttribute('aria-disabled') === 'true') return;

      playSound('click');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);
}

export { playSound, ensureLoaded };

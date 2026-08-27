import { createContext, useContext } from 'react';

export type ControllerAppMode = 'mainmenu' | 'ingame' | null;

export interface GamepadFocusContextValue {
  ownsUIInput: boolean;
  activeRoot: HTMLElement | null;
}

export const GamepadFocusContext = createContext<GamepadFocusContextValue>({
  ownsUIInput: false,
  activeRoot: null,
});

export function useGamepadFocus() {
  return useContext(GamepadFocusContext);
}

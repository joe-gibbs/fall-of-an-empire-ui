import { useState, type ReactNode } from 'react';
import { createInitialGameState, GameStateContext } from './GameContextCore';

// Atlas renderers use a few presentation-only fields such as debugMode. Supplying the state
// context directly keeps those components usable without mounting GameProvider, whose bridge
// subscriptions require the visible gameplay view and a live world context.
export function WorldAnchorGameStateProvider({ children }: { children: ReactNode }) {
  const [state] = useState(createInitialGameState);
  return <GameStateContext.Provider value={state}>{children}</GameStateContext.Provider>;
}

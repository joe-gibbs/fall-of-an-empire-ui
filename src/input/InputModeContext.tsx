import { createContext, useContext } from 'react';
import type { ActiveInputDevice } from '../hooks/useActiveInputDevice';

export const InputModeContext = createContext<ActiveInputDevice>('keyboard');

export function useInputMode(): ActiveInputDevice {
  return useContext(InputModeContext);
}

import { useEffect, type ReactNode } from 'react';
import { useSettingsBridge } from '../bridge/app/useSettingsBridge';
import { useActiveInputDevice } from '../hooks/useActiveInputDevice';
import { InputModeContext } from './InputModeContext';

export default function InputModeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettingsBridge();
  const device = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );

  useEffect(() => {
    const root = document.documentElement;
    const gamepad = device === 'gamepad';
    root.classList.toggle('input-gamepad', gamepad);
    root.dataset.input = device;
    return () => {
      root.classList.remove('input-gamepad');
      delete root.dataset.input;
    };
  }, [device]);

  return (
    <InputModeContext.Provider value={device}>
      {children}
    </InputModeContext.Provider>
  );
}

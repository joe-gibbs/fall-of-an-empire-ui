import { useEffect, useState } from 'react';
import { useInputMode } from '../input/InputModeContext';

/** Match Steam Deck and other short/narrow windows (1280x800, 1366x768, etc.). */
const COMPACT_MAX_WIDTH_PX = 1400;
const COMPACT_MAX_HEIGHT_PX = 900;
let compactClassOwnerCount = 0;

function readCompact(gamepad: boolean): boolean {
  if (typeof window === 'undefined') return false;
  return gamepad || window.innerWidth <= COMPACT_MAX_WIDTH_PX || window.innerHeight <= COMPACT_MAX_HEIGHT_PX;
}

/**
 * True on small viewports where the full top-bar / map-mode grid is too crowded.
 * Also toggles `html.hud-compact` for global CSS (warnings, bottom bar, etc.).
 */
export function useCompactHud(): boolean {
  const activeInputDevice = useInputMode();
  const gamepad = activeInputDevice === 'gamepad';
  const [compact, setCompact] = useState(() => readCompact(gamepad));

  useEffect(() => {
    compactClassOwnerCount += 1;
    const apply = () => {
      const next = readCompact(gamepad);
      setCompact(next);
      document.documentElement.classList.toggle('hud-compact', next);
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('webkiln:runtime-viewport', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('webkiln:runtime-viewport', apply);
      compactClassOwnerCount -= 1;
      if (compactClassOwnerCount === 0) {
        document.documentElement.classList.remove('hud-compact');
      }
    };
  }, [gamepad]);

  return compact;
}

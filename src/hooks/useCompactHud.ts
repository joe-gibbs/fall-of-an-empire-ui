import { useEffect, useState } from 'react';

/** Match Steam Deck and other short/narrow windows (1280x800, 1366x768, etc.). */
const COMPACT_MAX_WIDTH_PX = 1400;
const COMPACT_MAX_HEIGHT_PX = 900;

function readCompact(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= COMPACT_MAX_WIDTH_PX || window.innerHeight <= COMPACT_MAX_HEIGHT_PX;
}

/**
 * True on small viewports where the full top-bar / map-mode grid is too crowded.
 * Also toggles `html.hud-compact` for global CSS (warnings, bottom bar, etc.).
 */
export function useCompactHud(): boolean {
  const [compact, setCompact] = useState(readCompact);

  useEffect(() => {
    const apply = () => {
      const next = readCompact();
      setCompact(next);
      document.documentElement.classList.toggle('hud-compact', next);
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('webkiln:runtime-viewport', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('webkiln:runtime-viewport', apply);
      document.documentElement.classList.remove('hud-compact');
    };
  }, []);

  return compact;
}

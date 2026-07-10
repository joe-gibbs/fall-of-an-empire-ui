import { useEffect } from 'react';
import { useBridgeQuery } from './useBridgeQuery';

// Mirror the game's UIScale gameplay setting into a `--ui-scale` CSS custom
// property on :root. Also mirrors scroll speed, tooltip delay, and reduced
// motion for shared Web UI behaviour.
// index.css multiplies the root font-size by this, so all rem-sized UI scales
// proportionally - matching what UUserInterfaceSettings ApplicationScale does
// for native UMG widgets.
export function useUIScale(): number | undefined {
  const scales = useBridgeQuery({
    action: 'game.get_settings',
    map: (data) => ({
      uiScale: data.gameplay.uiScale,
      uiScrollSpeed: data.gameplay.uiScrollSpeed,
      tooltipDelaySeconds: data.gameplay.tooltipDelaySeconds,
      reduceMotion: data.gameplay.reduceMotion,
    }),
  });

  useEffect(() => {
    if (scales?.uiScale != null && Number.isFinite(scales.uiScale) && scales.uiScale > 0) {
      document.documentElement.style.setProperty('--ui-scale', String(scales.uiScale));
    }
    if (scales?.uiScrollSpeed != null && Number.isFinite(scales.uiScrollSpeed) && scales.uiScrollSpeed > 0) {
      document.documentElement.style.setProperty('--ui-scroll-speed', String(scales.uiScrollSpeed));
    }
    if (scales?.tooltipDelaySeconds != null && Number.isFinite(scales.tooltipDelaySeconds) && scales.tooltipDelaySeconds >= 0) {
      document.documentElement.style.setProperty('--tooltip-delay-ms', String(Math.round(scales.tooltipDelaySeconds * 1000)));
    }
    document.documentElement.classList.toggle('ui-reduce-motion', scales?.reduceMotion === true);
  }, [scales]);

  return scales?.uiScale;
}

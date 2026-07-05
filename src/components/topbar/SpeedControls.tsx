import React from 'react';
import { playSound } from '../../hooks/useSound';
import { webUIText } from '../../localization/WebUITextContext';

type Speed = 0 | 1 | 2 | 3 | 4;

interface SpeedControlsProps {
  speed?: Speed;
  onSpeedChange?: (speed: Speed) => void;
}

// Speed icon for the cycle button - shows current speed state
const speedIcons: Record<number, string> = {
  0: '/assets/ui-shadowed/T_Speed_Inctive.png',
  1: '/assets/ui-shadowed/T_Speedx1_Active_copy.png',
  2: '/assets/ui-shadowed/T_Speedx2_Active.png',
  3: '/assets/ui-shadowed/T_Speedx3_Active.png',
  4: '/assets/ui-shadowed/T_Speedx4_Active.png',
};

const SpeedControls: React.FC<SpeedControlsProps> = ({
  speed = 0,
  onSpeedChange,
}) => {
  const isPaused = speed === 0;

  const handlePauseToggle = () => {
    onSpeedChange?.(isPaused ? 1 : 0);
  };

  // Cycle through speeds: 1→2→3→4→1. If paused, unpause to 1.
  const handleSpeedCycle = () => {
    if (isPaused) {
      onSpeedChange?.(1);
      return;
    }
    const next: Speed = speed >= 4 ? 1 : ((speed + 1) as Speed);
    onSpeedChange?.(next);
  };

  return (
    <div className="speed-controls" data-tutorial-target="TimeControls">
      {/* Pause/Play toggle */}
      <button
        className="speed-btn speed-btn--pause"
        data-tutorial-target="PausePlayButton"
        onMouseDown={() => { playSound('click'); handlePauseToggle(); }}
      >
        <img
          src={isPaused ? '/assets/ui-shadowed/T_Paused_Active.png' : '/assets/ui-shadowed/T_Play_Active.png'}
          alt={isPaused ? webUIText("Auto.Fix.ExprTrue.componentstopbarSpeedControls.49.1") : webUIText("Auto.Fix.ExprFalse.componentstopbarSpeedControls.49.1")}
          className="speed-btn-img"
        />
      </button>

      {/* Speed cycle button */}
      <button
        className="speed-btn speed-btn--cycle"
        data-tutorial-target="SpeedButton"
        onMouseDown={() => { playSound('click'); handleSpeedCycle(); }}
      >
        <img
          src={speedIcons[speed]}
          alt={isPaused ? webUIText("Auto.Fix.ExprTrue.componentstopbarSpeedControls.58.1") : webUIText("Auto.Fix.ExprFalse.componentstopbarSpeedControls.58.1", { Speed: speed })}
          className="speed-btn-img speed-btn-img--wide"
        />
      </button>
    </div>
  );
};

export default SpeedControls;

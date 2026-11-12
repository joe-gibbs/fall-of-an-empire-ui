import React from 'react';
import { playSound } from '../../hooks/useSound';
import { webUIText } from '../../localization/WebUITextContext';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import { useActiveInputDevice } from '../../hooks/useActiveInputDevice';
import { findActionBinding } from '../../utils/actionBindings';
import { WebkilnAssetPath } from '../../utils/assets';
import { ActionKeyGlyph } from '../common/ActionKeyGlyph';
import { actionBindingFooter } from '../common/actionBindingFooter';
import Tooltip, { type TooltipContent } from '../common/tooltips/Tooltip';

type Speed = 1 | 2 | 3 | 4;

interface SpeedControlsProps {
  speed: Speed;
  isPaused: boolean;
  onTogglePause: () => void;
  onSpeedChange?: (speed: Speed) => void;
}

// Speed icon for the cycle button - shows current speed state
const speedIcons: Record<number, string> = {
  0: WebkilnAssetPath('/assets/ui-shadowed/T_Speed_Inctive.png') ?? '/assets/ui-shadowed/T_Speed_Inctive.png',
  1: WebkilnAssetPath('/assets/ui-shadowed/T_Speedx1_Active_copy.png') ?? '/assets/ui-shadowed/T_Speedx1_Active_copy.png',
  2: WebkilnAssetPath('/assets/ui-shadowed/T_Speedx2_Active.png') ?? '/assets/ui-shadowed/T_Speedx2_Active.png',
  3: WebkilnAssetPath('/assets/ui-shadowed/T_Speedx3_Active.png') ?? '/assets/ui-shadowed/T_Speedx3_Active.png',
  4: WebkilnAssetPath('/assets/ui-shadowed/T_Speedx4_Active.png') ?? '/assets/ui-shadowed/T_Speedx4_Active.png',
};

// Debug and harness speeds can run faster than the fastest player speed; they share the x4 icon.
function speedIconFor(speed: number, isPaused: boolean): string {
  if (isPaused) return speedIcons[0];
  return speedIcons[Math.min(Math.max(Math.round(speed), 1), 4)];
}

const SpeedControls: React.FC<SpeedControlsProps> = ({
  speed,
  isPaused,
  onTogglePause,
  onSpeedChange,
}) => {
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );
  const pauseBinding = findActionBinding(settings?.controls, 'Pause', activeInputDevice);
  const fasterBinding = findActionBinding(settings?.controls, 'IncreaseSpeed', activeInputDevice);
  const slowerBinding = findActionBinding(settings?.controls, 'ReduceSpeed', activeInputDevice);

  // Resume at the selected speed; cycle only while time is running.
  const handleSpeedCycle = () => {
    if (isPaused) {
      onSpeedChange?.(speed);
      return;
    }
    const next: Speed = speed >= 4 ? 1 : ((speed + 1) as Speed);
    onSpeedChange?.(next);
  };

  const speedFooter = (fasterBinding || slowerBinding) ? (
    <div className="tt-footer-shortcuts">
      {fasterBinding && (
        <span className="tt-footer-shortcut-row">
          <span className="tt-footer-shortcut-label">{webUIText('TopbarSpeed.FasterLabel')}</span>
          <ActionKeyGlyph binding={fasterBinding} />
        </span>
      )}
      {slowerBinding && (
        <span className="tt-footer-shortcut-row">
          <span className="tt-footer-shortcut-label">{webUIText('TopbarSpeed.SlowerLabel')}</span>
          <ActionKeyGlyph binding={slowerBinding} />
        </span>
      )}
    </div>
  ) : undefined;

  const pauseTooltip: TooltipContent = {
    title: isPaused ? webUIText('TopbarSpeed.ResumeTitle') : webUIText('TopbarSpeed.PauseTitle'),
    body: isPaused
      ? webUIText('TopbarSpeed.ResumeBody')
      : webUIText('TopbarSpeed.PauseBody'),
    titleAccessory: actionBindingFooter(pauseBinding),
  };

  const speedTooltip: TooltipContent = {
    title: webUIText('TopbarSpeed.CycleTitle'),
    body: webUIText('TopbarSpeed.CycleBody'),
    footer: speedFooter,
  };

  return (
    <div className="speed-controls" data-tutorial-target="TimeControls">
      <Tooltip content={pauseTooltip} position="bottom" delay={200} variant="sidebar" bubbleClassName="tt-bubble--screen-button">
        <button
          className="speed-btn speed-btn--pause"
          data-tutorial-target="PausePlayButton"
          onClick={() => {
            playSound('click');
            // Resume at the selected speed; onTogglePause only ever pauses.
            if (isPaused) onSpeedChange?.(speed);
            else onTogglePause();
          }}
        >
          <img
            src={WebkilnAssetPath(isPaused ? '/assets/ui-shadowed/T_Paused_Active.png' : '/assets/ui-shadowed/T_Play_Active.png')
              ?? (isPaused ? '/assets/ui-shadowed/T_Paused_Active.png' : '/assets/ui-shadowed/T_Play_Active.png')}
            alt={isPaused ? webUIText("TopbarSpeed.Paused") : webUIText("TopbarSpeed.Playing")}
            className="speed-btn-img"
          />
        </button>
      </Tooltip>

      <Tooltip content={speedTooltip} position="bottom" delay={200} variant="sidebar" bubbleClassName="tt-bubble--screen-button">
        <button
          className="speed-btn speed-btn--cycle"
          data-tutorial-target="SpeedButton"
          onClick={() => { playSound('click'); handleSpeedCycle(); }}
        >
          <img
            src={speedIconFor(speed, isPaused)}
            alt={isPaused ? webUIText("TopbarSpeed.Speed") : webUIText("TopbarSpeed.SpeedMultiplier", { Speed: speed })}
            className="speed-btn-img speed-btn-img--wide"
          />
        </button>
      </Tooltip>
    </div>
  );
};

export default SpeedControls;

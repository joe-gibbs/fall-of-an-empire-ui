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

type Speed = 0 | 1 | 2 | 3 | 4;

interface SpeedControlsProps {
  speed?: Speed;
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

const SpeedControls: React.FC<SpeedControlsProps> = ({
  speed = 0,
  onSpeedChange,
}) => {
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );
  const isPaused = speed === 0;
  const pauseBinding = findActionBinding(settings?.controls, 'Pause', activeInputDevice);
  const fasterBinding = findActionBinding(settings?.controls, 'IncreaseSpeed', activeInputDevice);
  const slowerBinding = findActionBinding(settings?.controls, 'ReduceSpeed', activeInputDevice);

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
          onClick={() => { playSound('click'); handlePauseToggle(); }}
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
            src={speedIcons[speed]}
            alt={isPaused ? webUIText("TopbarSpeed.Speed") : webUIText("TopbarSpeed.SpeedMultiplier", { Speed: speed })}
            className="speed-btn-img speed-btn-img--wide"
          />
        </button>
      </Tooltip>
    </div>
  );
};

export default SpeedControls;

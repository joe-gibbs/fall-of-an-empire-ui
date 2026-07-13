import React, { type CSSProperties } from 'react';
import { designRem } from '../../../../utils/cssUnits';
import './PaintedBar.css';

export type PaintedBarColor = 'green' | 'red' | 'gold';

interface PaintedBarProps {
  percent: number;
  color: PaintedBarColor;
  tint?: string;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

type PaintedBarStyle = CSSProperties & {
  '--painted-bar-height'?: string;
  '--painted-bar-tint'?: string;
};

const PaintedBar: React.FC<PaintedBarProps> = ({ percent, color, tint, height, className = '', ariaLabel }) => {
  const hiddenPercent = 100 - Math.min(100, Math.max(0, percent));
  const displayedPercent = 100 - hiddenPercent;
  const trackStyle: PaintedBarStyle | undefined = height === undefined
    ? undefined
    : { '--painted-bar-height': designRem(height) };
  const fillStyle: PaintedBarStyle = {
    clipPath: `inset(0 ${hiddenPercent}% 0 0 round 0.3636rem)`,
  };

  if (tint) {
    fillStyle['--painted-bar-tint'] = tint;
  }

  return (
    <div
      className={`painted-bar-track ${className}`}
      style={trackStyle}
      role={ariaLabel ? 'progressbar' : undefined}
      aria-label={ariaLabel}
      aria-valuemin={ariaLabel ? 0 : undefined}
      aria-valuemax={ariaLabel ? 100 : undefined}
      aria-valuenow={ariaLabel ? displayedPercent : undefined}
    >
      <div
        className={`painted-bar-fill painted-bar-fill--${tint ? 'tinted' : color}`}
        style={fillStyle}
      />
    </div>
  );
};

export default React.memo(PaintedBar);

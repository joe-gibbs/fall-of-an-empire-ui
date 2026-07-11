import React from 'react';
import './PaintedBar.css';

type PaintedBarColor = 'green' | 'red' | 'gold';

interface PaintedBarProps {
  percent: number;
  color: PaintedBarColor;
  className?: string;
}

const PaintedBar: React.FC<PaintedBarProps> = ({ percent, color, className = '' }) => {
  const hiddenPercent = 100 - Math.min(100, Math.max(0, percent));

  return (
    <div className={`painted-bar-track ${className}`}>
      <div
        className={`painted-bar-fill painted-bar-fill--${color}`}
        style={{ clipPath: `inset(0 ${hiddenPercent}% 0 0 round 0.3636rem)` }}
      />
    </div>
  );
};

export default React.memo(PaintedBar);

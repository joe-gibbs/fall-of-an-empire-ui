import React from 'react';
import './PaintedBar.css';

type PaintedBarColor = 'green' | 'red' | 'gold';

interface PaintedBarProps {
  percent: number;
  color: PaintedBarColor;
  className?: string;
}

const PaintedBar: React.FC<PaintedBarProps> = ({ percent, color, className = '' }) => (
  <div className={`painted-bar-track ${className}`}>
    <div
      className={`painted-bar-fill painted-bar-fill--${color}`}
      style={{ width: '100%', transform: `scaleX(${Math.min(100, Math.max(0, percent)) / 100})` }}
    />
  </div>
);

export default React.memo(PaintedBar);

import React from 'react';
import PaintedBar from './PaintedBar';
import { paintedBarAppearance } from './paintedBarAppearance';

interface ProgressBarProps {
  value: number;
  max: number;
  colour?: string;
  height?: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  colour,
  height = 6,
  className = '',
}) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const appearance = paintedBarAppearance(colour);

  return (
    <PaintedBar
      percent={pct}
      color={appearance.color}
      tint={appearance.tint}
      height={height}
      className={className}
    />
  );
};

export default ProgressBar;

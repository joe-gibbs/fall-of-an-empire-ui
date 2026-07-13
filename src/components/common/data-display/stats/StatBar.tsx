import React from 'react';
import { formatNumber } from '../../../../utils/numberFormat';
import PaintedBar from '../bars/PaintedBar';
import { paintedBarAppearance } from '../bars/paintedBarAppearance';
import './StatBar.css';

interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  colour?: string;
  showText?: boolean;
  size?: 'sm' | 'md';
  layout?: 'stacked' | 'inline';
}

const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  maxValue,
  colour,
  showText = true,
  size = 'md',
  layout = 'stacked',
}) => {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const appearance = paintedBarAppearance(colour);

  if (layout === 'inline') {
    return (
      <div className={`stat-bar stat-bar--${size} stat-bar--inline`}>
        <span className="stat-bar-label">{label}</span>
        <PaintedBar percent={pct} color={appearance.color} tint={appearance.tint} className="stat-bar-track" />
        {showText && (
          <span className="stat-bar-value">
            {formatNumber(value)}/{formatNumber(maxValue)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`stat-bar stat-bar--${size}`}>
      <div className="stat-bar-header">
        <span className="stat-bar-label">{label}</span>
        {showText && (
          <span className="stat-bar-value">
            {`${formatNumber(value)} / ${formatNumber(maxValue)}`}
          </span>
        )}
      </div>
      <PaintedBar percent={pct} color={appearance.color} tint={appearance.tint} className="stat-bar-track" />
    </div>
  );
};

export default StatBar;

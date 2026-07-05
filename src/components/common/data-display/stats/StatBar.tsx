import React from 'react';
import { formatNumber } from '../../../../utils/numberFormat';
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
  const barColour = colour || 'var(--gold)';

  if (layout === 'inline') {
    return (
      <div className={`stat-bar stat-bar--${size} stat-bar--inline`}>
        <span className="stat-bar-label">{label}</span>
        <div className="stat-bar-track">
          <div
            className="stat-bar-fill"
            style={{
              width: '100%',
              transform: `scaleX(${pct / 100})`,
              backgroundImage: `linear-gradient(to right, ${barColour}, ${barColour}cc)`,
            }}
          />
        </div>
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
      <div className="stat-bar-track">
        <div
          className="stat-bar-fill"
          style={{
            width: '100%',
            transform: `scaleX(${pct / 100})`,
            backgroundImage: `linear-gradient(to right, ${barColour}, ${barColour}cc)`,
          }}
        />
      </div>
    </div>
  );
};

export default StatBar;

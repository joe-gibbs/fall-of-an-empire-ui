import React, { type CSSProperties } from 'react';
import { formatNumber } from '../../../../utils/numberFormat';

interface GameBarProps {
  value: number;
  max: number;
  colour?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
}

const GameBar: React.FC<GameBarProps> = ({
  value,
  max,
  colour,
  size = 'md',
  label,
  showValue,
}) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const barColour = colour ?? 'var(--gold)';

  return (
    <>
      {(label || showValue) && (
        <div className="bar-label-row">
          {label && <span className="bar-label">{label}</span>}
          {showValue && <span className="bar-value">{formatNumber(value)}/{formatNumber(max)}</span>}
        </div>
      )}
      <div
        className={`bar-track bar-track--${size}`}
        style={{ '--bar-color': barColour } as CSSProperties}
      >
        <div className="bar-fill" style={{ width: '100%', transform: `scaleX(${pct / 100})` }} />
      </div>
    </>
  );
};

export default React.memo(GameBar);

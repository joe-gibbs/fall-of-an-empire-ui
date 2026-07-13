import React from 'react';
import { formatNumber } from '../../../../utils/numberFormat';
import PaintedBar from './PaintedBar';
import { paintedBarAppearance } from './paintedBarAppearance';

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
  const appearance = paintedBarAppearance(colour);

  return (
    <>
      {(label || showValue) && (
        <div className="bar-label-row">
          {label && <span className="bar-label">{label}</span>}
          {showValue && <span className="bar-value">{formatNumber(value)}/{formatNumber(max)}</span>}
        </div>
      )}
      <PaintedBar
        percent={pct}
        color={appearance.color}
        tint={appearance.tint}
        className={`bar-track bar-track--${size}`}
      />
    </>
  );
};

export default React.memo(GameBar);

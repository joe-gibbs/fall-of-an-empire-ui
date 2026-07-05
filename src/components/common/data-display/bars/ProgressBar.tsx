import React from 'react';
import { designRem } from '../../../../utils/cssUnits';

interface ProgressBarProps {
  value: number;
  max: number;
  colour?: string;
  height?: number;
  bgColour?: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  colour,
  height = 6,
  bgColour,
  className = '',
}) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const fillColour = colour || 'var(--gold)';
  const trackColour = bgColour || 'rgba(8, 12, 17, 0.35)';

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: designRem(height),
        boxSizing: 'border-box',
        backgroundColor: trackColour,
        borderRadius: 0,
        overflow: 'hidden',
        border: '0.0909rem solid rgba(60, 55, 40, 0.25)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          backgroundImage: `linear-gradient(180deg, ${fillColour}, ${fillColour}aa)`,
          borderRadius: 0,
          transition: 'transform 0.4s ease',
          transformOrigin: 'left',
          transform: `scaleX(${pct / 100})`,
        }}
      />
    </div>
  );
};

export default ProgressBar;

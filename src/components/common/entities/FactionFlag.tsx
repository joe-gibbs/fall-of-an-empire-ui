import React from 'react';
import { playSound } from '../../../hooks/useSound';
import { designRem } from '../../../utils/cssUnits';
import './FactionFlag.css';

type FlagSize = 'sm' | 'md' | 'lg';

interface FactionFlagProps {
  colour: string;
  name: string;
  size?: FlagSize;
  onClick?: () => void;
}

const sizeMap: Record<FlagSize, { width: string; height: string }> = {
  sm: { width: designRem(18), height: designRem(22) },
  md: { width: designRem(26), height: designRem(32) },
  lg: { width: designRem(36), height: designRem(44) },
};

const FactionFlag: React.FC<FactionFlagProps> = ({
  colour,
  name,
  size = 'md',
  onClick,
}) => {
  const { width, height } = sizeMap[size];
  const darkColour = /^#[0-9a-f]{6}$/i.test(colour) ? `${colour}b3` : colour;

  return (
    <div
      className={`faction-flag ${onClick ? 'faction-flag--clickable' : ''}`}
      onMouseDown={onClick ? () => { playSound('click'); onClick(); } : undefined}
    >
      <div className="faction-flag-frame" style={{ width, height }}>
        <div
          className="faction-flag-shape"
          style={{ backgroundImage: `linear-gradient(135deg, ${colour}, ${darkColour})` }}
          aria-label={name}
          role="img"
        />
      </div>
    </div>
  );
};

export default FactionFlag;

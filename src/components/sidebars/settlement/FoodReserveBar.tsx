import React, { type CSSProperties } from 'react';
import './FoodReserveBar.css';

interface FoodReserveBarProps {
  /** Food in the pool armies draw from. */
  food: number;
  /** Part of that food the settlement keeps for its own people. */
  reserve: number;
  /** Stockpile cap, when the settlement has one. */
  cap: number;
}

type FoodReserveBarStyle = CSSProperties & {
  '--food-reserve-kept-right'?: string;
  '--food-reserve-spare-left'?: string;
  '--food-reserve-spare-right'?: string;
  '--food-reserve-line'?: string;
};

/**
 * Splits a settlement's food into the part kept for its people and the part armies may take.
 * The kept part turns red when the settlement cannot cover its own reserve.
 */
const FoodReserveBar: React.FC<FoodReserveBarProps> = ({ food, reserve, cap }) => {
  const scale = Math.max(cap, food, reserve * 1.5, 1);
  const toPercent = (value: number) => Math.min(100, Math.max(0, (value / scale) * 100));
  const kept = toPercent(Math.min(food, reserve));
  const spare = toPercent(Math.max(0, food - reserve));
  const line = toPercent(reserve);
  const style: FoodReserveBarStyle = {
    '--food-reserve-kept-right': `${100 - kept}%`,
    '--food-reserve-spare-left': `${kept}%`,
    '--food-reserve-spare-right': `${100 - kept - spare}%`,
    '--food-reserve-line': `${line}%`,
  };

  return (
    <div className="food-reserve-bar" style={style} aria-hidden="true">
      <div className={`food-reserve-bar__kept${food < reserve ? ' food-reserve-bar__kept--short' : ''}`} />
      <div className="food-reserve-bar__spare" />
      <div className="food-reserve-bar__line" />
    </div>
  );
};

export default React.memo(FoodReserveBar);

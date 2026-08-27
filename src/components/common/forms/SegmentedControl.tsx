import React from 'react';
import { playSound } from '../../../hooks/useSound';

interface SegmentedControlProps {
  options: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, active, onChange }) => (
  <div className="segmented-control">
    {options.map((opt) => (
      <button
        key={opt.id}
        className={`segmented-btn${active === opt.id ? ' segmented-btn--active' : ''}`}
        onClick={() => { playSound('tab'); onChange(opt.id); }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;

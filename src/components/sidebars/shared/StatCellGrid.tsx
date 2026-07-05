import React from 'react';
import './StatCellGrid.css';

interface StatCellGridProps {
  children: React.ReactNode;
  className?: string;
}

const StatCellGrid: React.FC<StatCellGridProps> = ({ children, className = '' }) => (
  <div className={`stat-cell-grid ${className}`}>
    {children}
  </div>
);

interface StatCellProps {
  icon: string;
  value: React.ReactNode;
  valueColor?: string;
  delta?: React.ReactNode;
  deltaColor?: string;
}

const StatCell: React.FC<StatCellProps> = ({ icon, value, valueColor, delta, deltaColor }) => (
  <div className="stat-cell">
    <img src={icon} alt="" className="stat-cell-icon" />
    <span className="stat-cell-val" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    {delta !== undefined && <span className="stat-cell-delta" style={deltaColor ? { color: deltaColor } : undefined}>{delta}</span>}
  </div>
);

export { StatCellGrid, StatCell };

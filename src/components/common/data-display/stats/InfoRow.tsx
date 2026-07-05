import React, { type ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: string | ReactNode;
  valueColor?: 'positive' | 'negative' | 'warning' | 'gold';
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, valueColor }) => (
  <div className="info-row">
    <span className="info-label">{label}</span>
    <span className={`info-value${valueColor ? ` info-value--${valueColor}` : ''}`}>{value}</span>
  </div>
);

export default React.memo(InfoRow);

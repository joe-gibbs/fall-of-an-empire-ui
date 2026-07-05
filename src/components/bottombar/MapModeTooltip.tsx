import React from 'react';
import './MapModeTooltip.css';

interface Props {
  children: React.ReactNode;
}

export const TTHeader: React.FC<Props> = ({ children }) => (
  <div className="mmtt-header">{children}</div>
);

export const TTMuted: React.FC<Props> = ({ children }) => (
  <p className="mmtt-muted">{children}</p>
);

export const TTBullets: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="mmtt-bullets">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

export const MapModeTooltip: React.FC<Props> = ({ children }) => (
  <div className="mmtt">{children}</div>
);

import React from 'react';
import { designRem } from '../../../../utils/cssUnits';
import './Panel.css';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  noPadding?: boolean;
}

const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className = '',
  style,
  width,
  noPadding = false,
}) => {
  return (
    <div
      className={`panel ${className}`}
      style={{ width: typeof width === 'number' ? designRem(width) : width, ...style }}
    >
      {title && (
        <div className="panel-header">
          <span className="panel-title">{title}</span>
          <div className="panel-header-rule" />
        </div>
      )}
      <div className={`panel-body ${noPadding ? 'panel-body--no-padding' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Panel;

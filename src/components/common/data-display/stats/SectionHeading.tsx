import React from 'react';
import { formatNumber } from '../../../../utils/numberFormat';

interface SectionHeadingProps {
  title: string;
  count?: number;
  withRule?: boolean;
  variant?: 'default' | 'ornate';
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ title, count, withRule = true, variant = 'default' }) => (
  <div className={`section-heading-row${variant === 'ornate' ? ' section-heading-row--ornate' : ''}`}>
    <span className="section-heading">{title}</span>
    {count !== undefined && <span className="section-heading-count">{formatNumber(count)}</span>}
    {withRule && <div className="section-heading-rule" />}
  </div>
);

export default React.memo(SectionHeading);

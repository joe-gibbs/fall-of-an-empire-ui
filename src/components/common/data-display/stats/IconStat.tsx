import React from 'react';
import Tooltip from '../../tooltips/Tooltip';
import type { TooltipContent } from '../../tooltips/Tooltip';
import './IconStat.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface IconStatProps {
  icon: string;
  value: React.ReactNode;
  valueColor?: string;
  tooltip?: React.ReactNode | TooltipContent;
  tooltipPosition?: TooltipPosition;
  tooltipDelay?: number;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

const IconStat: React.FC<IconStatProps> = ({
  icon,
  value,
  valueColor,
  tooltip,
  tooltipPosition = 'top',
  tooltipDelay = 120,
  className = '',
  iconClassName = '',
  valueClassName = '',
}) => {
  const node = (
    <span className={classNames('icon-stat', className)}>
      <img className={classNames('icon-stat__icon', iconClassName)} src={icon} alt="" />
      <span className={classNames('icon-stat__value', valueClassName)} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </span>
  );

  if (tooltip === undefined || tooltip === null) return node;

  return (
    <Tooltip content={tooltip} position={tooltipPosition} delay={tooltipDelay}>
      {node}
    </Tooltip>
  );
};

export default React.memo(IconStat);

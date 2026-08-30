import { memo, type ReactNode } from 'react';
import Tooltip, { type TooltipContent } from '../../tooltips/Tooltip';
import './CompactStat.css';

type CompactStatMode = 'icon' | 'value' | 'full';

interface CompactStatProps {
  icon: string;
  label: string;
  value?: ReactNode;
  valueColor?: string;
  mode?: CompactStatMode;
  tooltip?: ReactNode | TooltipContent;
  tooltipDelay?: number;
  onShowIntent?: () => void;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

const CompactStat = memo(function CompactStat({
  icon,
  label,
  value,
  valueColor,
  mode = 'full',
  tooltip,
  tooltipDelay = 120,
  onShowIntent,
  className,
  iconClassName,
  valueClassName,
}: CompactStatProps) {
  const showIcon = mode !== 'value';
  const showValue = mode !== 'icon';
  const node = (
    <span className={classNames('compact-stat', `compact-stat--${mode}`, className)}>
      {showIcon && <img className={classNames('compact-stat__icon', iconClassName)} src={icon} alt="" draggable={false} />}
      {showValue && (
        <span className={classNames('compact-stat__value', valueClassName)} style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </span>
      )}
    </span>
  );

  return (
    <Tooltip content={tooltip ?? { title: label }} delay={tooltipDelay} inline onShowIntent={onShowIntent}>
      {node}
    </Tooltip>
  );
});

export default CompactStat;

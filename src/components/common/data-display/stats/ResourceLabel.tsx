import { memo, type ReactNode } from 'react';
import { FoaeCefUIAssetPath } from '../../../../utils/assets';
import './ResourceLabel.css';

interface ResourceLabelProps {
  resourceId?: string;
  icon?: string;
  name: ReactNode;
  amount?: ReactNode;
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  amountClassName?: string;
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

const ResourceLabel = memo(function ResourceLabel({
  resourceId,
  icon,
  name,
  amount,
  className,
  iconClassName,
  nameClassName,
  amountClassName,
}: ResourceLabelProps) {
  const iconPath = icon ?? (resourceId ? `/assets/resources/${resourceId}.png` : undefined);

  return (
    <span className={classNames('resource-label', className)}>
      {iconPath && <img src={FoaeCefUIAssetPath(iconPath)} alt="" className={classNames('resource-label__icon', iconClassName)} draggable={false} />}
      <span className={classNames('resource-label__name', nameClassName)}>{name}</span>
      {amount !== undefined && amount !== null && (
        <span className={classNames('resource-label__amount', amountClassName)}>{amount}</span>
      )}
    </span>
  );
});

export default ResourceLabel;

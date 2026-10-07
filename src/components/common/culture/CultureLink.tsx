import type { MouseEvent, ReactNode } from 'react';
import { useOptionalCultureDetails } from '../../../context/CultureDetailsContext';
import './CultureLink.css';
import CultureTooltip from '../tooltips/CultureTooltip';
import type { CultureInfo } from '../../../bridge-types.generated';

interface Props {
  cultureId: string;
  children: ReactNode;
  className?: string;
  info?: CultureInfo;
  showTooltip?: boolean;
}

export default function CultureLink({ cultureId, children, className, info, showTooltip = true }: Props) {
  const details = useOptionalCultureDetails();
  const classes = `culture-link${className ? ` ${className}` : ''}`;
  if (!details || !cultureId) return <span className={classes}>{children}</span>;

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    details.openCulture(cultureId);
  };

  const button = <button type="button" className={classes} onClick={open}>{children}</button>;
  if (!showTooltip) return button;
  return <CultureTooltip info={info} fallbackId={cultureId} interactive={false}>{button}</CultureTooltip>;
}

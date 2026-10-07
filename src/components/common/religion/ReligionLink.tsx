import type { MouseEvent, ReactNode } from 'react';
import { useOptionalReligionDetails } from '../../../context/ReligionDetailsContext';
import './ReligionLink.css';
import ReligionTooltip from '../tooltips/ReligionTooltip';
import type { ReligionInfo } from '../../../bridge-types.generated';

interface Props {
  religionId: string;
  children: ReactNode;
  className?: string;
  info?: ReligionInfo;
  showTooltip?: boolean;
}

export default function ReligionLink({ religionId, children, className, info, showTooltip = true }: Props) {
  const details = useOptionalReligionDetails();
  const classes = `religion-link${className ? ` ${className}` : ''}`;
  if (!details || !religionId) return <span className={classes}>{children}</span>;

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    details.openReligion(religionId);
  };

  const button = <button type="button" className={classes} onClick={open}>{children}</button>;
  if (!showTooltip) return button;
  return <ReligionTooltip info={info} fallbackId={religionId} interactive={false}>{button}</ReligionTooltip>;
}

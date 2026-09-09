import type { ReactNode } from 'react';
import ReligionTooltip from '../tooltips/ReligionTooltip';

interface Props {
  religionId: string;
  children: ReactNode;
  className?: string;
}

export default function ReligionLink({ religionId, className, children }: Props) {
  return (
    <ReligionTooltip fallbackId={religionId} wrapperClassName={className}>
      {children}
    </ReligionTooltip>
  );
}

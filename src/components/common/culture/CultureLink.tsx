import type { ReactNode } from 'react';
import CultureTooltip from '../tooltips/CultureTooltip';

interface Props {
  cultureId: string;
  children: ReactNode;
  className?: string;
}

export default function CultureLink({ cultureId, className, children }: Props) {
  return (
    <CultureTooltip fallbackId={cultureId} wrapperClassName={className}>
      {children}
    </CultureTooltip>
  );
}

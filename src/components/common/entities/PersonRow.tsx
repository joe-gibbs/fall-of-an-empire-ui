import React, { type ReactNode } from 'react';
import Portrait from '../portraits/Portrait';
import PersonTooltip from '../tooltips/PersonTooltip';

type PortraitSize = 'sm' | 'md' | 'lg' | 'xl';
type BorderTier = 'gold' | 'silver' | 'bronze';

interface PersonRowProps {
  personId: string;
  name: string;
  title?: string;
  portrait?: string;
  portraitSize?: PortraitSize;
  borderTier?: BorderTier;
  extra?: ReactNode;
}

const PersonRow: React.FC<PersonRowProps> = ({
  personId,
  name,
  title,
  portrait,
  portraitSize = 'md',
  borderTier,
  extra,
}) => (
  <div className="flex-row gap-md">
    <PersonTooltip characterId={personId}>
      <Portrait personId={personId} name={name} src={portrait} size={portraitSize} showBorder borderTier={borderTier} />
    </PersonTooltip>
    <div className="flex-col">
      <span className="text-bright" style={{ fontSize: '1.1818rem' }}>{name}</span>
      {title && <span className="text-muted" style={{ fontSize: '1rem' }}>{title}</span>}
    </div>
    {extra}
  </div>
);

export default PersonRow;

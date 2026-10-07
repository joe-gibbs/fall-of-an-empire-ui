import { useState, type ReactNode } from 'react';
import { usePersonTooltipBridge } from '../../../bridge/characters/usePersonBridge';
import Tooltip from './Tooltip';

export default function OriginalNameTooltip({ characterId, children }: {
  characterId: string;
  children: ReactNode;
}) {
  const [requested, setRequested] = useState(false);
  const person = usePersonTooltipBridge(requested ? characterId : null);
  return (
    <Tooltip
      content={person?.originalNameText ? { body: person.originalNameText } : null}
      onShowIntent={() => setRequested(true)}
      inline
    >
      {children}
    </Tooltip>
  );
}

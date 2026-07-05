import React from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from './Tooltip';
import { webUIText } from '../../../localization/WebUITextContext';

interface GovernmentTooltipProps {
  government?: string;
  displayName?: string;
  description?: string;
  capabilities?: string[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}

function capabilityLines(capabilities?: string[]): TooltipLine[] {
  if (!capabilities || capabilities.length === 0) return [];
  return capabilities
    .filter(capability => capability.trim().length > 0)
    .map(capability => ({ label: capability }));
}

const GovernmentTooltip: React.FC<GovernmentTooltipProps> = ({
  government,
  displayName,
  description,
  capabilities,
  position = 'bottom',
  delay = 200,
  children,
}) => {
  const title = displayName || government || webUIText('MainMenu.Government');
  const content: TooltipContent = {
    title,
    body: description || webUIText('GovernmentTooltip.UnknownBody'),
    lines: capabilityLines(capabilities),
  };

  return (
    <Tooltip content={content} position={position} delay={delay}>
      {children}
    </Tooltip>
  );
};

export default GovernmentTooltip;

import React, { useState } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from './Tooltip';
import type { ReligionInfo } from '../../../data/types';
import { religionIconPath } from '../../../utils/religionIcons';
import { religionEffectFacts } from '../religion/religionFacts';
import { appendTooltipSection } from './tooltipSections';
import { useOptionalReligionDetails } from '../../../context/ReligionDetailsContext';
import { useReligionDetailsBridge } from '../../../bridge/religion/useReligionDetailsBridge';
import './IdentityTooltip.css';
import '../religion/ReligionLink.css';

import { webUIText } from '../../../localization/WebUITextContext';
interface ReligionTooltipProps {
  info?: ReligionInfo;
  fallbackName?: string;
  fallbackId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  extraLines?: TooltipLine[];
  wrapperClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
  interactive?: boolean;
}

function religionTooltipContent({ info, fallbackName, fallbackId, extraLines = [] }: Omit<ReligionTooltipProps, 'children' | 'position' | 'delay' | 'wrapperClassName' | 'disabled' | 'interactive'>): TooltipContent {
  const id = info?.id ?? fallbackId;
  const name = info?.name ?? fallbackName ?? '';
  const iconUrl = id ? religionIconPath(id) : undefined;
  const lines: TooltipLine[] = [];
  if (info) {
    appendTooltipSection(lines, webUIText('InteractionCard.Effects'), religionEffectFacts(info));
    lines.push({
      label: webUIText('Religion.OrganisedClergy'),
      value: webUIText(info.isOrganised ? 'Common.Yes' : 'Common.No'),
      valueColor: info.isOrganised ? 'var(--green)' : 'var(--text-muted)',
    });
  }
  lines.push(...extraLines);

  return {
    header: (
      <div className="tt-identity-header">
        {iconUrl && <img src={iconUrl} alt="" className="tt-identity-icon" />}
        <div className="tt-identity-title">{name}</div>
      </div>
    ),
    lines,
  };
}

const ReligionTooltip: React.FC<ReligionTooltipProps> = ({
  info, fallbackName, fallbackId, position = 'bottom', delay = 200, extraLines, wrapperClassName, disabled, children, interactive = true,
}) => {
  const religionDetails = useOptionalReligionDetails();
  const religionId = info?.id || fallbackId;
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const details = useReligionDetailsBridge(!info && requestedId === fallbackId ? requestedId : null);
  return (
    <Tooltip
      content={religionTooltipContent({ info: info ?? details?.religion, fallbackName, fallbackId, extraLines })}
      onShowIntent={() => { if (!info && fallbackId) setRequestedId(fallbackId); }}
      position={position}
      delay={delay}
      wrapperClassName={wrapperClassName}
      disabled={disabled}
    >
      {interactive && religionDetails && religionId ? <button type="button" className="religion-link" onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        religionDetails.openReligion(religionId);
      }}>{children}</button> : children}
    </Tooltip>
  );
};

export default ReligionTooltip;

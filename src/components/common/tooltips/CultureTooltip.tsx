import React, { useState } from 'react';
import Tooltip, { type TooltipContent } from './Tooltip';
import { cultureFacts } from '../culture/cultureFacts';
import { webUIText } from '../../../localization/WebUITextContext';
import { useCultureDevelopmentBridge } from '../../../bridge/culture/useCultureDevelopmentBridge';
import type { CultureInfo } from '../../../data/types';
import { cultureIconPath } from '../../../utils/cultureIcons';
import './IdentityTooltip.css';
import '../culture/CultureLink.css';
import { useOptionalCultureDetails } from '../../../context/CultureDetailsContext';

interface CultureTooltipProps {
  info?: CultureInfo;
  /** Display name fallback when full info isn't available. */
  fallbackName?: string;
  /** Stable id used to build the icon path when info is absent. */
  fallbackId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  wrapperClassName?: string;
  children: React.ReactNode;
  interactive?: boolean;
}

function cultureTooltipContent({ info, fallbackName }: Omit<CultureTooltipProps, 'children' | 'position' | 'delay'>): TooltipContent {
  const name = info?.name ?? fallbackName ?? '';
  const iconUrl = info ? cultureIconPath(info) : undefined;
  const lines = info ? cultureFacts(info, webUIText) : [];

  return {
    header: (
      <div className="tt-identity-header">
        {iconUrl && <img src={iconUrl} alt="" className="tt-identity-icon" />}
        <div className="tt-identity-title">{name}</div>
        {info && <div className="tt-identity-group">{info.groupDisplayName || info.group}</div>}
      </div>
    ),
    lines,
  };
}

const CultureTooltip: React.FC<CultureTooltipProps> = ({ info, fallbackName, fallbackId, position = 'bottom', delay = 200, wrapperClassName, children, interactive = true }) => {
  const cultureDetails = useOptionalCultureDetails();
  const cultureId = info?.id || fallbackId;
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const details = useCultureDevelopmentBridge(!info && requestedId === fallbackId ? requestedId : null);
  return (
    <Tooltip
      content={cultureTooltipContent({ info: info ?? details?.culture, fallbackName, fallbackId })}
      onShowIntent={() => { if (!info && fallbackId) setRequestedId(fallbackId); }}
      position={position}
      delay={delay}
      wrapperClassName={wrapperClassName}
    >
      {interactive && cultureDetails && cultureId ? <button type="button" className="culture-link" onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        cultureDetails.openCulture(cultureId);
      }}>{children}</button> : children}
    </Tooltip>
  );
};

export default CultureTooltip;

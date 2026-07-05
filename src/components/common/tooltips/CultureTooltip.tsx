import React from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from './Tooltip';
import type { CultureInfo } from '../../../data/types';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import './IdentityTooltip.css';

import { webUIText } from '../../../localization/WebUITextContext';
interface CultureTooltipProps {
  info?: CultureInfo;
  /** Display name fallback when full info isn't available. */
  fallbackName?: string;
  /** Stable id used to build the icon path when info is absent. */
  fallbackId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}

function cultureIconUrl(id?: string): string | undefined {
  return id ? FoaeCefUIAssetPath(`/assets/cultures/${id}.png`) : undefined;
}

function cultureTooltipContent({ info, fallbackName, fallbackId }: Omit<CultureTooltipProps, 'children' | 'position' | 'delay'>): TooltipContent {
  const id = info?.id ?? fallbackId;
  const name = info?.name ?? fallbackName ?? '';
  const iconUrl = cultureIconUrl(id);
  const lines: TooltipLine[] = info ? [
    {
      label: webUIText('Auto.ComponentsSidebarsSettlementSidebar.1251.8'),
      value: info.groupDisplayName || info.group,
    },
    {
      label: webUIText('Auto.ComponentsCommonCultureTooltip.48.3'),
      value: webUIText(info.canRecruitAsAuxiliaries ? 'Common.Yes' : 'Common.No'),
      valueColor: info.canRecruitAsAuxiliaries ? 'var(--green)' : 'var(--text-muted)',
    },
  ] : [];

  return {
    header: (
      <div className="tt-identity-header">
        {iconUrl && <img src={iconUrl} alt="" className="tt-identity-icon" />}
        <div className="tt-identity-title">{name}</div>
      </div>
    ),
    body: info?.description,
    lines,
  };
}

const CultureTooltip: React.FC<CultureTooltipProps> = ({ info, fallbackName, fallbackId, position = 'bottom', delay = 200, children }) => {
  return (
    <Tooltip
      content={cultureTooltipContent({ info, fallbackName, fallbackId })}
      position={position}
      delay={delay}
    >
      {children}
    </Tooltip>
  );
};

export default CultureTooltip;

import React from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from './Tooltip';
import type { ReligionInfo } from '../../../data/types';
import { formatSignedNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import './IdentityTooltip.css';

import { webUIText } from '../../../localization/WebUITextContext';
interface ReligionTooltipProps {
  info?: ReligionInfo;
  /** Display name fallback when full info isn't available. */
  fallbackName?: string;
  /** Stable id used to build the icon path when info is absent. */
  fallbackId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  extraLines?: TooltipLine[];
  wrapperClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function religionIconUrl(id?: string): string | undefined {
  return id ? WebkilnAssetPath(`/assets/religions/${id}.png`) : undefined;
}

interface EffectLine {
  label: string;
  value: number;
  format: 'integer' | 'percent';
  inverted?: boolean;
}

/** Build the effects list from a ReligionInfo, filtering out zeroed modifiers. */
function collectReligionEffects(info: ReligionInfo): EffectLine[] {
  const lines: EffectLine[] = [
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.32.1'), value: info.tacticsBonus, format: 'integer' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.33.2'), value: info.authorityBonus, format: 'integer' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.34.3'), value: info.cunningBonus, format: 'integer' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.35.4'), value: info.governanceBonus, format: 'integer' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.36.5'), value: info.armyMoraleBonus, format: 'integer' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.37.6'), value: info.taxEfficiencyModifier, format: 'percent' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.38.7'), value: info.developmentSpeedModifier, format: 'percent' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.39.8'), value: info.recruitmentSpeedModifier, format: 'percent' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.40.9'), value: info.settlementGrowthModifier, format: 'percent' },
    { label: webUIText('Auto.Prop.ComponentsCommonReligionTooltip.41.10'), value: info.unrestModifier, format: 'percent', inverted: true },
  ];
  return lines.filter(l => Math.abs(l.value) > 0.0001);
}

function formatEffect(line: EffectLine): string {
  if (line.format === 'percent') return `${formatSignedNumber(line.value * 100)}%`;
  return formatSignedNumber(line.value);
}

/** Unrest is inverted: positive unrest is bad. Morale / stat bonuses: positive is good. */
function effectColor(line: EffectLine): string {
  const good = line.inverted ? line.value < 0 : line.value > 0;
  return good ? 'var(--green)' : 'var(--red)';
}

function religionTooltipContent({ info, fallbackName, fallbackId, extraLines = [] }: Omit<ReligionTooltipProps, 'children' | 'position' | 'delay' | 'wrapperClassName' | 'disabled'>): TooltipContent {
  const id = info?.id ?? fallbackId;
  const name = info?.name ?? fallbackName ?? '';
  const iconUrl = religionIconUrl(id);
  const effects = info ? collectReligionEffects(info) : [];
  const lines: TooltipLine[] = [
    ...effects.map((e): TooltipLine => ({
      label: e.label,
      value: formatEffect(e),
      valueColor: effectColor(e),
    })),
    ...(info ? [{
      label: webUIText('Auto.ComponentsCommonReligionTooltip.83.1'),
      value: webUIText(info.isOrganised ? 'Common.Yes' : 'Common.No'),
      valueColor: info.isOrganised ? 'var(--green)' : 'var(--text-muted)',
    }] : []),
    ...extraLines,
  ];

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

const ReligionTooltip: React.FC<ReligionTooltipProps> = ({ info, fallbackName, fallbackId, position = 'bottom', delay = 200, extraLines, wrapperClassName, disabled, children }) => {
  return (
    <Tooltip
      content={religionTooltipContent({ info, fallbackName, fallbackId, extraLines })}
      position={position}
      delay={delay}
      wrapperClassName={wrapperClassName}
      disabled={disabled}
    >
      {children}
    </Tooltip>
  );
};

export default ReligionTooltip;

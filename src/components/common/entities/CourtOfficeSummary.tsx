import Portrait from '../portraits/Portrait';
import Tooltip, { type TooltipContent } from '../tooltips/Tooltip';
import type { CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import './CourtOfficeSummary.css';

import { webUIText } from '../../../localization/WebUITextContext';
const STAT_LABEL_KEYS: Record<string, string> = {
  tactics: 'Common.Tactics',
  authority: 'Common.Authority',
  cunning: 'Common.Cunning',
  governance: 'Common.Governance',
  loyalty: 'Common.Loyalty',
};

const STAT_ICON_NAMES: Record<string, string> = {
  tactics: 'Tactics',
  authority: 'Authority',
  cunning: 'Cunning',
  governance: 'Governance',
  loyalty: 'Loyalty',
};

function statLabel(stat: string): string {
  const key = STAT_LABEL_KEYS[stat];
  return key ? webUIText(key) : stat;
}

function statIconPath(stat: string): string {
  return `/assets/icons/StatIcons/I_${STAT_ICON_NAMES[stat] ?? stat}.png`;
}

function officeTooltip(position: CourtPositionView, readOnly: boolean): TooltipContent {
  const primaryLabel = statLabel(position.primaryStat);
  if (!position.holder) {
    return {
      title: position.name,
      body: position.description,
      lines: [
        { label: webUIText('Auto.Prop.ComponentsCommonCourtOfficeSummary.46.1'), value: webUIText('Common.Vacant'), valueColor: 'var(--text-dark)' },
        { label: webUIText('Auto.Prop.ComponentsCommonCourtOfficeSummary.47.2'), value: webUIText('Common.None'), valueColor: 'var(--text-dark)' },
      ],
      footer: readOnly ? undefined : webUIText('Auto.Prop.ComponentsCommonCourtOfficeSummary.49.3'),
    };
  }

  return {
    title: position.name,
    body: position.description,
    lines: [
      { label: webUIText('Auto.Prop.ComponentsCommonCourtOfficeSummary.57.4'), value: position.holder.name },
      { label: primaryLabel, value: formatNumber(position.holder.statValue), valueColor: 'var(--green)' },
      { label: position.bonusLabel, value: position.bonusText, valueColor: 'var(--green)' },
      ...(position.subordinates.length > 0 ? [{ label: webUIText('Auto.Prop.ComponentsCommonCourtOfficeSummary.60.5'), isHeader: true as const }] : []),
      ...position.subordinates.map(sub => ({
        label: sub.name,
        get value() { return webUIText("Auto.Prop.componentscommonCourtOfficeSummary.73.1", { Value1: formatSignedNumber(sub.statContribution), Value2: primaryLabel }); },
      })),
    ],
    footer: readOnly ? undefined : webUIText('Auto.Prop.ComponentsCommonCourtOfficeSummary.66.6'),
  };
}

interface CourtOfficeSummaryProps {
  position: CourtPositionView;
  className?: string;
  onOpen?: (position: CourtPositionView) => void;
  onOpenCharacter?: (id: string) => void;
  readOnly?: boolean;
}

export default function CourtOfficeSummary({
  position,
  className,
  onOpen,
  onOpenCharacter,
  readOnly = false,
}: CourtOfficeSummaryProps) {
  const holder = position.holder;
  const primaryLabel = statLabel(position.primaryStat);
  const rootClassName = [
    'court-office-summary',
    holder ? '' : 'court-office-summary--vacant',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <Tooltip content={officeTooltip(position, readOnly)} delay={200} variant="sidebar">
      <button
        type="button"
        className={rootClassName}
        aria-disabled={readOnly}
        onMouseDown={() => {
          if (!readOnly) onOpen?.(position);
        }}
      >
        <span
          className={`court-office-portrait${holder && onOpenCharacter ? ' court-office-portrait--clickable' : ''}`}
          onMouseDown={event => {
            if (!holder || !onOpenCharacter) return;
            event.stopPropagation();
            onOpenCharacter(holder.id);
          }}
        >
          {holder ? (
            <Portrait personId={holder.id} src={holder.portrait || undefined} name={holder.name} size="sm" />
          ) : (
            <span className="court-office-vacant-portrait">
              <img src="/assets/icons/I_Characters.png" alt="" className="court-office-vacant-icon" draggable={false} />
            </span>
          )}
        </span>
        <span className="court-office-main">
          <span className="court-office-title-row">
            <img src={statIconPath(position.primaryStat)} alt="" className="court-office-stat-icon" draggable={false} />
            <span className="court-office-title">{position.name}</span>
          </span>
          <span className="court-office-holder">{holder?.name ?? webUIText('Common.Vacant')}</span>
        </span>
        <span className="court-office-benefit">
          <span className="court-office-benefit-value">{position.bonusText}</span>
          <span className="court-office-benefit-label">{holder ? position.bonusLabel : primaryLabel}</span>
        </span>
      </button>
    </Tooltip>
  );
}

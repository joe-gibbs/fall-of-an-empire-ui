import { ModeRow, ModeRows } from './ModeLayout';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData, ProvinceTooltipShareView } from './types';

function distinctShareDetail(share: ProvinceTooltipShareView): string {
  const detail = share.detail?.trim();
  if (!detail) {
    return '';
  }
  if (detail.toLowerCase() === share.name.trim().toLowerCase()) {
    return '';
  }
  return detail;
}

function ShareRows({
  shares,
  fallback,
}: {
  shares: ProvinceTooltipShareView[];
  fallback: string;
}) {
  if (shares.length === 0) {
    return (
      <ModeRows>
        <ModeRow label={webUIText('ProvinceTooltip.SettlementLabel')} value={fallback} />
      </ModeRows>
    );
  }

  const showChanges = shares.some((share) => Boolean(share.change));

  return (
    <div className="province-tooltip-share-mode-list">
      {shares.map((share, index) => {
        const detail = distinctShareDetail(share);
        return (
          <div key={`${share.name}-${index}`} className="province-tooltip-share-mode-row">
            <span className="province-tooltip-share-mode-swatch-cell">
              <span
                className="province-tooltip-share-mode-swatch"
                style={share.colour ? { backgroundColor: share.colour } : undefined}
              />
            </span>
            <span className="province-tooltip-share-mode-name-wrap">
              <span className="province-tooltip-share-mode-name">{share.name}</span>
              {detail && <span className="province-tooltip-share-mode-detail">({detail})</span>}
            </span>
            <span className="province-tooltip-share-mode-values">
              {share.percent && <span className="province-tooltip-share-mode-percent">{share.percent}</span>}
              {showChanges && (
                <span className={`province-tooltip-share-mode-change province-tooltip-share-mode-change--${share.changeTone || 'neutral'}`}>
                  {share.change || ''}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReligionTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return <ShareRows shares={data.religionShares} fallback={data.religion.label} />;
}

export function CultureTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return <ShareRows shares={data.cultureShares} fallback={data.culture.label} />;
}

import { ModeRow, ModeRows } from './ModeLayout';
import type { ProvinceTooltipModeData, ProvinceTooltipShareView } from './types';

function ShareRows({
  shares,
  fallback,
}: {
  shares: ProvinceTooltipShareView[];
  fallback: string;
}) {
  if (shares.length === 0) {
    return <ModeRow label="Settlement:" value={fallback} />;
  }

  return (
    <div className="province-tooltip-share-mode-list">
      {shares.map((share, index) => (
        <div key={`${share.name}-${index}`} className="province-tooltip-share-mode-row">
          <span
            className="province-tooltip-share-mode-swatch"
            style={share.colour ? { backgroundColor: share.colour } : undefined}
          />
          <span className="province-tooltip-share-mode-name-wrap">
            <span className="province-tooltip-share-mode-name">{share.name}</span>
            {share.detail && <span className="province-tooltip-share-mode-detail">{share.detail}</span>}
          </span>
          <span className="province-tooltip-share-mode-values">
            {share.percent && <span className="province-tooltip-share-mode-percent">{share.percent}</span>}
            {share.change && (
              <span className={`province-tooltip-share-mode-change province-tooltip-share-mode-change--${share.changeTone || 'neutral'}`}>
                {share.change}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReligionTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ShareRows shares={data.religionShares} fallback={data.religion.label} />
      <ModeRow label="Faction:" value={data.religion.label} colour={data.religion.colour} />
    </ModeRows>
  );
}

export function CultureTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ShareRows shares={data.cultureShares} fallback={data.culture.label} />
      <ModeRow label="Faction:" value={data.culture.label} colour={data.culture.colour} />
    </ModeRows>
  );
}

import ProgressBar from '../../common/data-display/bars/ProgressBar';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import { useVictoryConditionsBridge } from '../../../bridge/app/useVictoryConditionsBridge';
import { useAnchoredDropdown } from '../../../hooks/useAnchoredDropdown';
import { formatNumber } from '../../../utils/numberFormat';
import type { VictoryConditionProgressEntry, VictoryConditionTierEntry } from '../../../bridge-types.generated.ts';
import './VictoryConditionsDropdown.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface VictoryConditionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXIT_DURATION_MS = 120;

function conditionProgress(condition: VictoryConditionProgressEntry): number {
  return condition.progress;
}

function conditionDetail(condition: VictoryConditionProgressEntry): string {
  return condition.detailText || `${Math.round(conditionProgress(condition))}%`;
}

function tierCompletedCount(tier: VictoryConditionTierEntry): number {
  return tier.conditions.filter(condition => condition.isMet).length;
}

function tierProgress(tier: VictoryConditionTierEntry): number {
  if (tier.conditions.length === 0) return 0;
  return (tierCompletedCount(tier) / tier.conditions.length) * 100;
}

function VictoryTierSummary({ tier }: { tier: VictoryConditionTierEntry }) {
  return (
    <div className={`vc-tier-summary${tier.isAchieved ? ' vc-tier-summary--achieved' : ''}`}>
      <div className="vc-tier-summary-main">
        <img src={tier.iconPath} alt="" className="vc-tier-summary-icon" />
        <span className="vc-tier-summary-name">{tier.name}</span>
      </div>
      <ProgressBar
        value={tierProgress(tier)}
        max={100}
        colour={tier.isAchieved ? 'var(--green)' : 'var(--gold)'}
        height={5}
        className="vc-tier-summary-bar"
      />
    </div>
  );
}

function VictoryConditionDescription({ condition }: { condition: VictoryConditionProgressEntry }) {
  return (
    <div className="vc-condition-desc">
      {condition.description && <p>{condition.description}</p>}
      {condition.domains.length > 0 && (
        <div className="vc-domain-list">
          {condition.domains.map(domain => (
            <div
              className={`vc-domain-row${domain.isMet ? ' vc-domain-row--met' : ' vc-domain-row--missing'}`}
              key={domain.name}
            >
              <span className="vc-domain-bullet" />
              <span className="vc-domain-text">
                <span className="vc-domain-name">{domain.name}</span>
                <span className="vc-domain-count">
                  {`${formatNumber(domain.controlledSettlements)} / ${formatNumber(domain.totalSettlements)}`}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VictoryConditionsDropdown({ isOpen, onClose }: VictoryConditionsDropdownProps) {
  const { mounted, closing, style, setPopupRef } = useAnchoredDropdown({
    open: isOpen,
    onClose,
    durationMs: EXIT_DURATION_MS,
    position: 'below-right',
    anchorSelector: '.victory-toggle-btn',
    escapeId: 'hud.victory-conditions',
  });
  const victoryConditions = useVictoryConditionsBridge(mounted);

  if (!mounted) return null;

  const tiers = victoryConditions?.enabled ? victoryConditions.tiers : [];

  return (
    <div
      className={`vc-dropdown${closing ? ' vc-dropdown--exiting' : ''}`}
      ref={setPopupRef}
      style={style}
    >
      <div className="vc-dropdown-header">
        <img src="/assets/icons/Victory/I_Victory_Gold.png" alt="" className="vc-dropdown-header-icon" />
        <span className="vc-dropdown-title"><WebUIText textKey="Auto.ComponentsHudVictoryConditionsDropdown.38.1" /></span>
      </div>

      <StyledScrollArea className="vc-dropdown-body" viewportClassName="vc-dropdown-body-viewport" variant="inline">
        {victoryConditions && !victoryConditions.enabled && (
          <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsHudVictoryConditionsDropdown.44.2" /></div>
        )}

        {victoryConditions?.enabled && victoryConditions.tiers.length === 0 && (
          <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsHudVictoryConditionsDropdown.48.3" /></div>
        )}

        {victoryConditions?.enabled && tiers.length > 0 && (
          <>
            {tiers.length > 1 && (
              <div className="vc-tier-summary-list">
                {tiers.map(tier => <VictoryTierSummary tier={tier} key={tier.id} />)}
              </div>
            )}

            {tiers.map(tier => (
              <section className="vc-tier" key={tier.id}>
                <div className="vc-tier-header">
                  <img src={tier.iconPath} alt="" className="vc-tier-icon" />
                  <span className={`vc-tier-name${tier.isAchieved ? ' vc-tier-name--achieved' : ''}`}>
                    {tier.name}
                  </span>
                  {tier.isAchieved && <span className="vc-tier-check" aria-label={webUIText('Auto.Attr.ComponentsHudVictoryConditionsDropdown.59.1')} />}
                </div>

                <div className="vc-tier-conditions">
                  {tier.conditions.map(condition => (
                    <article
                      className={`vc-condition${condition.isMet ? ' vc-condition--met' : ''}`}
                      key={condition.id}
                    >
                      <div className="vc-condition-top">
                        <span className="vc-condition-label">{condition.label}</span>
                        {!condition.isMet && (
                          <span className="vc-condition-detail">
                            {conditionDetail(condition)}
                          </span>
                        )}
                        {condition.isMet && <span className="vc-condition-check" aria-label={webUIText('Auto.Attr.ComponentsHudVictoryConditionsDropdown.72.2')} />}
                      </div>

                      {!condition.isMet && <VictoryConditionDescription condition={condition} />}

                      <div className="vc-condition-bar-row">
                        <ProgressBar
                          value={conditionProgress(condition)}
                          max={100}
                          colour={condition.isMet ? 'var(--green)' : 'var(--gold)'}
                          height={condition.isMet ? 4 : 6}
                          className="vc-condition-bar"
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </StyledScrollArea>
    </div>
  );
}

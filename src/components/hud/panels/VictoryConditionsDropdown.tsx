import { useState } from 'react';
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

function conditionCounts(condition: VictoryConditionProgressEntry): { current: number; target: number } {
  if (condition.domains.length > 0) {
    let current = 0;
    let target = 0;
    for (const domain of condition.domains) {
      current += domain.controlledSettlements;
      target += domain.totalSettlements;
    }
    return { current, target };
  }

  return { current: condition.currentCount, target: condition.targetCount };
}

function usesSettlementCount(condition: VictoryConditionProgressEntry): boolean {
  return condition.kind === 'domains' || condition.kind === 'religion' || condition.domains.length > 0;
}

function formatConditionCount(condition: VictoryConditionProgressEntry): string {
  const { current, target } = conditionCounts(condition);
  return webUIText(
    usesSettlementCount(condition) ? 'VictoryConditions.SettlementCount' : 'VictoryConditions.Count',
    { Current: formatNumber(current), Target: formatNumber(target) },
  );
}

function blockingCondition(tier: VictoryConditionTierEntry): VictoryConditionProgressEntry | null {
  if (tier.isAchieved) return null;

  const unmet = tier.conditions.filter(condition => !condition.isMet);
  if (unmet.length === 0) return null;

  return unmet.find(condition => condition.kind === 'domains' || condition.domains.length > 0)
    ?? unmet.find(condition => condition.kind === 'religion')
    ?? unmet.find(condition => condition.kind === 'year')
    ?? unmet[0];
}

function tierHasDetails(tier: VictoryConditionTierEntry): boolean {
  const domainLists = tier.conditions.filter(condition => condition.domains.length > 0).length;
  const extraLines = tier.conditions.filter(condition => condition.domains.length === 0).length;
  return domainLists > 0 || extraLines > 1;
}

function defaultExpandedTierId(tiers: VictoryConditionTierEntry[]): string | null {
  const next = tiers.find(tier => !tier.isAchieved && tierHasDetails(tier));
  return next?.id ?? null;
}

function VictoryDomainList({ condition }: { condition: VictoryConditionProgressEntry }) {
  return (
    <div className="vc-domain-list">
      {condition.domains.map(domain => (
        <div
          className={`vc-domain-row${domain.isMet ? ' vc-domain-row--met' : ' vc-domain-row--missing'}`}
          key={domain.name}
        >
          <span className="vc-domain-name">{domain.name}</span>
          <span className="vc-domain-count">
            {webUIText('VictoryConditions.Count', {
              Current: formatNumber(domain.controlledSettlements),
              Target: formatNumber(domain.totalSettlements),
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

function VictoryConditionLine({ condition }: { condition: VictoryConditionProgressEntry }) {
  return (
    <div className={`vc-line${condition.isMet ? ' vc-line--met' : ''}`}>
      <span className="vc-line-label">{condition.label}</span>
      <span className="vc-line-count">{formatConditionCount(condition)}</span>
    </div>
  );
}

function VictoryTierDetails({ tier }: { tier: VictoryConditionTierEntry }) {
  return (
    <div className="vc-tier-details">
      {tier.conditions.map(condition => (
        condition.domains.length > 0 ? (
          <VictoryDomainList condition={condition} key={condition.id} />
        ) : (
          <VictoryConditionLine condition={condition} key={condition.id} />
        )
      ))}
    </div>
  );
}

function VictoryTier({
  tier,
  expanded,
  onToggle,
}: {
  tier: VictoryConditionTierEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const expandable = tierHasDetails(tier);
  const blocking = blockingCondition(tier);
  const count = blocking ? formatConditionCount(blocking) : null;
  const className = [
    'vc-tier',
    expandable ? 'vc-tier--expandable' : '',
    expanded ? 'vc-tier--expanded' : '',
    tier.isAchieved ? 'vc-tier--achieved' : '',
  ].filter(Boolean).join(' ');

  const heading = (
    <>
      <img src={tier.iconPath} alt="" className="vc-tier-icon" />
      {expandable && <span className="vc-tier-caret" aria-hidden="true" />}
      <span className="vc-tier-name">{tier.name}</span>
      {count && <span className="vc-tier-count">{count}</span>}
      {tier.isAchieved && (
        <span className="vc-tier-check" aria-label={webUIText('Auto.Attr.ComponentsHudVictoryConditionsDropdown.59.1')} />
      )}
    </>
  );

  return (
    <section className={className}>
      {expandable ? (
        <button
          type="button"
          className="vc-tier-heading"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {heading}
        </button>
      ) : (
        <div className="vc-tier-heading">{heading}</div>
      )}
      {expanded && expandable && <VictoryTierDetails tier={tier} />}
    </section>
  );
}

export default function VictoryConditionsDropdown({ isOpen, onClose }: VictoryConditionsDropdownProps) {
  const compact = typeof document !== 'undefined'
    && document.documentElement.classList.contains('hud-compact');
  const { mounted, closing, style, setPopupRef } = useAnchoredDropdown({
    open: isOpen,
    onClose,
    durationMs: EXIT_DURATION_MS,
    position: compact ? 'below-left' : 'below-right',
    anchorSelector: '.victory-toggle-btn',
    escapeId: 'hud.victory-conditions',
  });
  const victoryConditions = useVictoryConditionsBridge(mounted);
  const [expandedId, setExpandedId] = useState<string | null | undefined>(undefined);
  if (!isOpen && expandedId !== undefined) {
    setExpandedId(undefined);
  }

  if (!mounted) return null;

  const tiers = victoryConditions?.enabled ? victoryConditions.tiers : [];
  const resolvedExpandedId = expandedId === undefined ? defaultExpandedTierId(tiers) : expandedId;

  return (
    <div
      className={`vc-dropdown${closing ? ' vc-dropdown--exiting' : ''}`}
      ref={setPopupRef}
      style={style}
    >
      <div className="vc-dropdown-header">
        <img src="/assets/icons/Victory/I_Victory_Gold.png" alt="" className="vc-dropdown-header-icon" />
        <span className="vc-dropdown-title"><WebUIText textKey="Topbar.VictoryConditions" /></span>
      </div>

      <StyledScrollArea className="vc-dropdown-body" viewportClassName="vc-dropdown-body-viewport" variant="inline">
        {victoryConditions && !victoryConditions.enabled && (
          <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsHudVictoryConditionsDropdown.44.2" /></div>
        )}

        {victoryConditions?.enabled && victoryConditions.tiers.length === 0 && (
          <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsHudVictoryConditionsDropdown.48.3" /></div>
        )}

        {victoryConditions?.enabled && tiers.length > 0 && (
          <div className="vc-tier-list">
            {tiers.map(tier => (
              <VictoryTier
                tier={tier}
                key={tier.id}
                expanded={resolvedExpandedId === tier.id}
                onToggle={() => setExpandedId(current => {
                  const openId = current === undefined ? defaultExpandedTierId(tiers) : current;
                  return openId === tier.id ? null : tier.id;
                })}
              />
            ))}
          </div>
        )}
      </StyledScrollArea>
    </div>
  );
}

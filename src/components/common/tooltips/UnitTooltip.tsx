import React from 'react';
import PaintedBar from '../data-display/bars/PaintedBar';
import CultureTooltip from './CultureTooltip';
import { NestedTooltip } from './Tooltip';
import { WebkilnAssetPath } from '../../../utils/assets';
import { TIER_ICONS } from '../../../utils/iconMaps';
import { formatNumber } from '../../../utils/numberFormat';
import type { BuildingResourceCost, CultureInfo } from '../../../data/types';
import { zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import ResourceLink from '../resources/ResourceLink';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

/** Rich unit tooltip body. Matches the Garrison tab's `.settle-unit-tooltip`
 *  layout: portrait + name + tier, type/culture/source building, description,
 *  strength/upkeep/food lines, damage bars, armour bars, speed/veterancy.
 *
 *  Designed to cover both GARRISON units (have current strength + veterancy)
 *  and RECRUITABLE unit classes (have price + buildTime but no current
 *  strength). Fields flagged optional turn off the corresponding row. */

/** Individual modifier applied to a unit stat. Positive delta = buff, negative = penalty. */
export interface UnitStatModifier {
  label: string;
  delta: number;
}

/** Map of modifier lists to each unit stat axis. Unlisted axes fall back to base. */
export interface UnitStatModifiers {
  damage?: { pierce?: UnitStatModifier[]; crush?: UnitStatModifier[]; slash?: UnitStatModifier[] };
  armour?: { pierce?: UnitStatModifier[]; crush?: UnitStatModifier[]; slash?: UnitStatModifier[] };
  speed?: UnitStatModifier[];
}

/** Buildability summary for a recruitable unit class. Shown when the unit has
 *  not yet been built anywhere so the player can see if it is unlocked. */
export interface UnitBuildability {
  /** Settlements in the faction that can currently build this unit. */
  count: number;
  /** Total settlements in the faction. */
  total: number;
  /** Optional sample of settlements that can currently raise this unit. */
  settlements?: UnitBuildabilitySettlement[];
  /** Why locked at the remaining settlements (e.g. "Requires Stable Lv 3"). */
  requirement?: string;
}

export interface UnitBuildabilitySettlement {
  id: string;
  name: string;
}

export interface UnitTooltipData {
  name: string;
  description?: string;
  portrait: string;
  /** Short label for the "Infantry" / "Heavy Infantry" / etc line under the name. */
  typeLabel: string;
  /** Icon for the unit-type (infantry/cavalry/...). */
  typeIcon: string;
  /** 1-4. Small tier badge next to the name; also used for the veterancy row icon. */
  tier: number;
  /** Culture name shown with icon in the header block. */
  culture?: string;
  cultureIcon?: string;
  /** Full culture data for the nested culture tooltip. */
  cultureInfo?: CultureInfo;
  /** Building name (not the asset key) shown with a building icon. */
  sourceBuilding?: string;
  /** Current strength (garrison only). Omit for recruitable classes. */
  strength?: number;
  maxStrength: number;
  /** Cost to recruit one unit (recruitable only). */
  price?: number;
  /** Days to train one unit (recruitable only). */
  buildTime?: number;
  upkeep: number;
  foodConsumption: number;
  speed: number;
  /** 0.0 - 1.0 (garrison only). */
  veterancy?: number;
  damage: { pierce: number; crush: number; slash: number };
  armour: { pierce: number; crush: number; slash: number };
  /** Strategic resources consumed per recruit. Mirrors the AS tooltip's
   *  "Build Cost:" block (UArmyUnit.ResourceUsage). */
  resourceCost?: BuildingResourceCost[];
  /** Strategic resources consumed each month at full strength.
   *  Mirrors UArmyUnit.GetFullStrengthMonthlyConsumption. */
  monthlyConsumption?: BuildingResourceCost[];
  /** Appended to the description like the AS tooltip does. */
  immuneToWinterAttrition?: boolean;
  immuneToDesertAttrition?: boolean;
  /** Number of merged same-class units represented by this row. */
  count?: number;
  /** Per-axis modifiers. When present, bars render segmented (base + positive
   *  / negative) and the modifier breakdown is listed below the bars. */
  modifiers?: UnitStatModifiers;
  /** When present AND no units of this class are built yet, shows a
   *  "raisable at N of M settlements" line. */
  buildability?: UnitBuildability;
}

const TIER_LABELS: Record<number, string> = {
  get 1() { return webUIText('UnitTooltip.Tier.1'); },
  get 2() { return webUIText('UnitTooltip.Tier.2'); },
  get 3() { return webUIText('UnitTooltip.Tier.3'); },
  get 4() { return webUIText('UnitTooltip.Tier.4'); },
  get 5() { return webUIText('UnitTooltip.Tier.5'); },
};

/** Hardcoded game-wide per-axis maxima. Computed once from the full UArmyUnit
 *  roster in Script/Units/** - the highest-stat unit in the entire game for
 *  that axis fills the bar. Every other unit scales proportionally, so bar
 *  length reads as "this unit's stat relative to the best in the game".
 *
 *  If unit data changes materially, rerun the scan in the repo with:
 *    python -c "<ArmyUnit stat scan>" (see git history for exact script).
 *  Last refresh: Rephsian + 8 other cultures + navies, 2026-04-13. */
const GAME_WIDE_MAXES = {
  damage: { pierce: 40, crush: 50, slash: 35 },
  armour: { pierce: 18, crush: 20, slash: 18 },
  speed: 280,
};

const n = (v: number): string => formatNumber(v);

function ResourceList({ title, items, perContext }: { title: string; items: BuildingResourceCost[]; perContext: string }) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="tt-line tt-line--header">
        <span className="tt-line-header-label">{title}</span>
      </div>
      <div className="unit-tt-res-list">
        {items.map(r => {
          const valueLabel = r.amount >= 1
            ? n(r.amount)
            : formatNumber(r.amount, { maximumFractionDigits: r.amount >= 0.1 ? 1 : 2 });
          return (
            <NestedTooltip
              key={r.name}
              inline
              delay={150}
              content={{
                title: r.displayName || r.name,
                body: r.description || r.effects || webUIText("Auto.Fix.PropExprFallback.componentscommonUnitTooltip.156.1"),
                lines: [
                  { label: perContext, value: valueLabel, valueIcon: r.icon, valueColor: 'var(--gold-light)' },
                ],
              }}
            >
              <ResourceLink resourceId={r.name} className="unit-tt-res">
                <img src={r.icon} alt="" className="unit-tt-res-icon" />
                <span className="unit-tt-res-val">{valueLabel}</span>
              </ResourceLink>
            </NestedTooltip>
          );
        })}
      </div>
    </>
  );
}

function Bar({
  icon, label, value, max, color, format, modifiers,
}: {
  icon: string;
  label: string;
  /** Base (unmodified) value for this stat. */
  value: number;
  max: number;
  color: 'red' | 'gold' | 'green';
  format?: (v: number) => string;
  modifiers?: UnitStatModifier[];
}) {
  const pctOf = (v: number) => (max > 0 ? Math.min(100, Math.max(0, (v / max) * 100)) : 0);
  if (!modifiers || modifiers.length === 0) {
    return (
      <div className="settle-unit-stat-row">
        <img src={icon} alt="" className="settle-unit-stat-icon" />
        <span className="settle-unit-stat-label">{label}</span>
        <PaintedBar percent={pctOf(value)} color={color} className="settle-unit-stat-bar" />
        <span className="settle-unit-stat-val">{format ? format(value) : formatNumber(value, { maximumFractionDigits: 1 })}</span>
      </div>
    );
  }
  const delta = modifiers.reduce((a, m) => a + m.delta, 0);
  const effective = Math.max(0, value + delta);
  const basePct = pctOf(value);
  const effectivePct = pctOf(effective);
  const displayedVal = format ? format(effective) : formatNumber(effective, { maximumFractionDigits: 1 });
  const fmtDelta = (v: number) => (v >= 0 ? '+' : '') + formatNumber(v, { maximumFractionDigits: v % 1 === 0 ? 0 : 1 });
  const baseW = Math.round(Math.min(basePct, effectivePct));
  const posL = Math.round(basePct);
  const posW = Math.round(effectivePct - basePct);
  const negL = Math.round(effectivePct);
  const negW = Math.round(basePct - effectivePct);
  const tickL = Math.round(basePct);
  return (
    <>
      <div className="settle-unit-stat-row">
        <img src={icon} alt="" className="settle-unit-stat-icon" />
        <span className="settle-unit-stat-label">{label}</span>
        <div className={`seg-bar seg-bar--${color} settle-unit-stat-bar`}>
          <div className="seg-bar-track" />
          <div className="seg-bar-base" style={{ width: `${baseW}%` }} />
          {effective > value && (
            <div className="seg-bar-pos" style={{ left: `${posL}%`, width: `${posW}%` }} />
          )}
          {effective < value && (
            <div className="seg-bar-neg" style={{ left: `${negL}%`, width: `${negW}%` }} />
          )}
          <div className="seg-bar-tick" style={{ left: `${tickL}%` }} />
        </div>
        <span
          className="settle-unit-stat-val"
          style={{ color: delta > 0 ? 'var(--green-light)' : delta < 0 ? 'var(--red-light)' : undefined }}
        >
          {displayedVal}
        </span>
      </div>
      {modifiers.map((m, i) => (
        <div key={`${label}-mod-${Math.round(i)}`} className="settle-unit-stat-mod">
          <span className="settle-unit-stat-mod-dot" aria-hidden="true" />
          <span className="settle-unit-stat-mod-label">{m.label}</span>
          <span
            className="settle-unit-stat-mod-val"
            style={{ color: m.delta >= 0 ? 'var(--green-light)' : 'var(--red-light)' }}
          >
            {fmtDelta(m.delta)}
          </span>
        </div>
      ))}
    </>
  );
}


const UnitTooltip: React.FC<{ data: UnitTooltipData }> = ({ data }) => {
  const [showAllBuildabilitySettlements, setShowAllBuildabilitySettlements] = React.useState(false);
  const d = data;
  React.useEffect(() => {
    setShowAllBuildabilitySettlements(false);
  }, [d.name, d.buildability?.settlements?.length]);
  const tierIcon = TIER_ICONS[d.tier];
  const portrait = WebkilnAssetPath(d.portrait) ?? d.portrait;
  const typeIcon = WebkilnAssetPath(d.typeIcon) ?? d.typeIcon;
  const tierIconPath = WebkilnAssetPath(tierIcon) ?? tierIcon;
  const cultureIcon = WebkilnAssetPath(d.cultureIcon) ?? d.cultureIcon;
  // Every bar scales against the game-wide max for that axis (constants
  // above). This is intentionally not settlement-scoped - the player sees
  // "how strong is this unit compared to anything in the game", not just
  // "compared to what I currently recruit".
  const dmg = GAME_WIDE_MAXES.damage;
  const arm = GAME_WIDE_MAXES.armour;
  const speedMax = GAME_WIDE_MAXES.speed;
  const ratio = d.strength !== undefined && d.maxStrength > 0
    ? d.strength / d.maxStrength
    : 1;
  const strengthColor = ratio > 0.5 ? 'var(--green)' : 'var(--red)';
  const hasDescription = Boolean(d.description || d.immuneToWinterAttrition || d.immuneToDesertAttrition);
  const allBuildabilitySettlements = d.buildability?.settlements ?? [];
  const buildabilitySettlements = showAllBuildabilitySettlements
    ? allBuildabilitySettlements
    : allBuildabilitySettlements.slice(0, 4);
  const hiddenBuildabilitySettlementCount = allBuildabilitySettlements.length - buildabilitySettlements.length;
  const canCollapseBuildabilitySettlements = showAllBuildabilitySettlements && allBuildabilitySettlements.length > 4;
  const hasBuildabilityListAction = hiddenBuildabilitySettlementCount > 0 || canCollapseBuildabilitySettlements;

  return (
    <div className="settle-unit-tooltip">
      <div className="settle-unit-tooltip-title-row">
        <img src={typeIcon} alt="" className="settle-unit-tooltip-type-icon" />
        <span className="tt-title" style={{ margin: 0 }}>{d.name}</span>
        {d.count !== undefined && d.count > 1 && (
          <span className="unit-tt-count">
            <img src="/assets/icons/I_Multiplier.png" alt="" className="unit-tt-count-icon" draggable={false} />
            <span>{n(d.count)}</span>
          </span>
        )}
        {tierIconPath && <img src={tierIconPath} alt="" className="settle-unit-tooltip-tier-icon" />}
      </div>
      <div className={`settle-unit-tooltip-header${hasDescription ? ' settle-unit-tooltip-header--has-description' : ''}`}>
        <img src={portrait} alt="" className="settle-unit-tooltip-portrait" />
        <div className="settle-unit-tooltip-info">
          <div className="tt-body">{d.typeLabel}</div>
          {d.culture && (
            <CultureTooltip info={d.cultureInfo} fallbackName={d.culture}>
              <div className="tt-body" style={{ display: 'flex', alignItems: 'center' }}>
                {cultureIcon && (
                  <img src={cultureIcon} alt="" style={{ width: '0.8rem', height: '0.8rem', marginRight: '0.25rem' }} />
                )}
                {d.culture}
              </div>
            </CultureTooltip>
          )}
          {d.sourceBuilding && (
            <div className="tt-body" style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/assets/icons/I_BuildingsQuickButton.png" alt="" style={{ width: '0.8rem', height: '0.8rem', marginRight: '0.25rem' }} />
              {d.sourceBuilding}
            </div>
          )}
          {TIER_LABELS[d.tier] && (
            <div className="tt-body" style={{ color: 'var(--gold)' }}>{TIER_LABELS[d.tier]}</div>
          )}
          {hasDescription && (
            <div className="tt-body settle-unit-tooltip-description">
              {d.description}
              {d.immuneToWinterAttrition && d.immuneToDesertAttrition && (
                <><br /><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.305.1" /></>
              )}
              {d.immuneToWinterAttrition && !d.immuneToDesertAttrition && (
                <><br /><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.308.2" /></>
              )}
              {!d.immuneToWinterAttrition && d.immuneToDesertAttrition && (
                <><br /><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.311.3" /></>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="tt-lines">
        {d.strength !== undefined ? (
          <div className="tt-line">
            <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.318.4" /></span>
            <span className="tt-line-value" style={{ color: strengthColor }}>
              {n(d.strength)}/{n(d.maxStrength)}
            </span>
          </div>
        ) : (
          <div className="tt-line">
            <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.325.5" /></span>
            <span className="tt-line-value">{n(d.maxStrength)}</span>
          </div>
        )}
        {d.price !== undefined && (
          <div className="tt-line">
            <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.331.6" /></span>
            <span className="tt-line-value">
              <img src="/assets/icons/I_Coins.png" alt="" className="tt-line-icon" />
              {n(d.price)}
            </span>
          </div>
        )}
        {d.buildTime !== undefined && (
          <div className="tt-line">
            <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.340.7" /></span>
              <span className="tt-line-value">{webUIText("Auto.Fix.Expr.componentscommonUnitTooltip.342.1", { Value1: n(d.buildTime) })}</span>
          </div>
        )}
        <div className="tt-line">
          <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.345.8" /></span>
          <span className="tt-line-value">
            <img src="/assets/icons/I_Coins.png" alt="" className="tt-line-icon" />
            {n(d.upkeep)}<WebUIText textKey="Auto.ComponentsCommonUnitTooltip.348.9" />
          </span>
        </div>
        <div className="tt-line">
          <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.352.10" /></span>
          <span className="tt-line-value">
            <img src="/assets/icons/I_Food.png" alt="" className="tt-line-icon" />
            {formatNumber(d.foodConsumption, { maximumFractionDigits: 1 })}<WebUIText textKey="Auto.ComponentsCommonUnitTooltip.355.11" />
          </span>
        </div>
      </div>
      <div className="tt-line tt-line--header"><span className="tt-line-header-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.359.12" /></span></div>
      <div className="settle-unit-stats">
        <Bar icon="/assets/icons/I_Damage_Pierce.png" label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.362.1')} value={d.damage.pierce} max={dmg.pierce} color="red" modifiers={d.modifiers?.damage?.pierce} />
        <Bar icon="/assets/icons/I_Damage_Crush.png" label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.363.2')} value={d.damage.crush} max={dmg.crush} color="red" modifiers={d.modifiers?.damage?.crush} />
        <Bar icon="/assets/icons/I_Damage_Slash.png" label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.364.3')} value={d.damage.slash} max={dmg.slash} color="red" modifiers={d.modifiers?.damage?.slash} />
      </div>
      <div className="tt-line tt-line--header"><span className="tt-line-header-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.365.13" /></span></div>
      <div className="settle-unit-stats">
        <Bar icon="/assets/icons/I_Armour_Pierce.png" label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.368.4')} value={d.armour.pierce} max={arm.pierce} color="gold" modifiers={d.modifiers?.armour?.pierce} />
        <Bar icon="/assets/icons/I_Armour_Crush.png" label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.369.5')} value={d.armour.crush} max={arm.crush} color="gold" modifiers={d.modifiers?.armour?.crush} />
        <Bar icon="/assets/icons/I_Armour_Slash.png" label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.370.6')} value={d.armour.slash} max={arm.slash} color="gold" modifiers={d.modifiers?.armour?.slash} />
      </div>
      <div className="settle-unit-stats" style={{ marginTop: '0.2rem' }}>
        <Bar icon="/assets/icons/I_Speed.png" label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.373.7')} value={d.speed} max={speedMax} color="green" format={n} modifiers={d.modifiers?.speed} />
        {d.veterancy !== undefined && (
          <Bar
            icon={tierIconPath || TIER_ICONS[1]}
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.377.8')}
            value={d.veterancy * 100}
            max={100}
            color="gold"
            format={v => `${n(v)}%`}
          />
        )}
      </div>
      {d.buildability && d.strength === undefined && (
        <>
          <div className="tt-line tt-line--header">
            <span className="tt-line-header-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.387.14" /></span>
          </div>
          <div className="tt-lines">
            <div className="tt-line">
              <span className="tt-line-label"><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.391.15" /></span>
              <span
                className="tt-line-value"
                style={{ color: d.buildability.count === 0 ? 'var(--red)' : d.buildability.count < d.buildability.total ? 'var(--yellow)' : 'var(--green)' }}
              >
                <img src="/assets/icons/I_BuildingsQuickButton.png" alt="" className="tt-line-icon" />
                {`${n(d.buildability.count)} / ${n(d.buildability.total)}`}
              </span>
            </div>
            {d.buildability.settlements && d.buildability.settlements.length > 0 && (
              <div className="tt-line tt-line--label-only settle-unit-tooltip-settlement-row">
                <span className="tt-line-label settle-unit-tooltip-settlements">
                  {buildabilitySettlements.map((settlement, index) => (
                    <span className="settle-unit-tooltip-settlement-item" key={settlement.id}>
                      <button
                        type="button"
                        className="settle-unit-tooltip-settlement-link"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          zoomToBridge('settlement', settlement.id);
                        }}
                      >
                        {settlement.name}
                      </button>
                      {(index < buildabilitySettlements.length - 1 || hasBuildabilityListAction) && (
                        <span className="settle-unit-tooltip-settlement-separator">,</span>
                      )}
                    </span>
                  ))}
                  {hiddenBuildabilitySettlementCount > 0 && (
                    <span className="settle-unit-tooltip-settlement-item">
                      <button
                        type="button"
                        className="settle-unit-tooltip-settlement-link settle-unit-tooltip-more-link"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setShowAllBuildabilitySettlements(true);
                        }}
                      >
                        {webUIText("Auto.Fix.Expr.componentsscreensMilitaryMilitaryScreen.518.1", { Value1: n(hiddenBuildabilitySettlementCount) })}
                      </button>
                    </span>
                  )}
                  {canCollapseBuildabilitySettlements && (
                    <span className="settle-unit-tooltip-settlement-item">
                      <button
                        type="button"
                        className="settle-unit-tooltip-settlement-link settle-unit-tooltip-more-link"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setShowAllBuildabilitySettlements(false);
                        }}
                      >
                        {webUIText('UnitTooltip.ShowFewerSettlements')}
                      </button>
                    </span>
                  )}
                </span>
              </div>
            )}
            {d.buildability.count === 0 && d.buildability.requirement && (
              <div className="tt-line">
                <span className="tt-line-label" style={{ color: 'var(--red-light)' }}>
                  {d.buildability.requirement}
                </span>
              </div>
            )}
          </div>
        </>
      )}
      {d.resourceCost && (
        <ResourceList title={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.419.9')} items={d.resourceCost} perContext={webUIText('UnitTooltip.PerRecruit')} />
      )}
      {d.monthlyConsumption && (
        <ResourceList title={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.422.10')} items={d.monthlyConsumption} perContext={webUIText('UnitTooltip.PerMonth')} />
      )}
    </div>
  );
};

export default UnitTooltip;

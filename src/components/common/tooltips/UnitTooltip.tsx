import React from 'react';
import PaintedBar from '../data-display/bars/PaintedBar';
import CultureTooltip from './CultureTooltip';
import { NestedTooltip, type TooltipContent, type TooltipLine } from './Tooltip';
import { getGlossaryEntry } from '../../../data/glossary';
import { WebkilnAssetPath } from '../../../utils/assets';
import { TIER_ICONS } from '../../../utils/iconMaps';
import { formatNumber } from '../../../utils/numberFormat';
import type { BuildingResourceCost, CultureInfo } from '../../../data/types';
import { zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import ResourceLink from '../resources/ResourceLink';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';

/** Rich unit tooltip body. Zones: identity → cost strip → combat →
 *  availability → flavour. Covers garrison units (current strength +
 *  veterancy) and recruitable classes (price + build time). */

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

/** Soft minimum fill so low-tier stats still show a readable stub. */
const BAR_MIN_FILL_PCT = 10;

const n = (v: number): string => formatNumber(v);

function formatResourceAmount(amount: number): string {
  if (amount >= 1) return n(amount);
  return formatNumber(amount, { maximumFractionDigits: amount >= 0.1 ? 1 : 2 });
}

function SectionRule({
  label,
  tooltip,
}: {
  label: string;
  tooltip?: TooltipContent;
}) {
  const labelNode = tooltip ? (
    <NestedTooltip inline delay={150} content={tooltip}>
      <span className="unit-tt-section-label text-with-help">{label}</span>
    </NestedTooltip>
  ) : (
    <span className="unit-tt-section-label">{label}</span>
  );

  return (
    <div className="unit-tt-section">
      <span className="unit-tt-section-lozenge" aria-hidden="true" />
      {labelNode}
      <span className="unit-tt-section-rule" aria-hidden="true" />
    </div>
  );
}

function ColHeader({
  label,
  glossaryKey,
}: {
  label: string;
  glossaryKey: string;
}) {
  const entry = getGlossaryEntry(glossaryKey);
  if (!entry) {
    return <div className="unit-tt-col-header">{label}</div>;
  }
  return (
    <div className="unit-tt-col-header">
      <NestedTooltip inline delay={150} content={entry}>
        <span className="text-with-help">{label}</span>
      </NestedTooltip>
    </div>
  );
}

function buildStatTooltip(
  label: string,
  glossaryKey: string | undefined,
  displayedVal: string,
  modifiers?: UnitStatModifier[],
): TooltipContent {
  const entry = glossaryKey ? getGlossaryEntry(glossaryKey) : undefined;
  const lines: TooltipLine[] = [
    { label: webUIText('UnitTooltip.CurrentValue'), value: displayedVal },
  ];
  if (modifiers && modifiers.length > 0) {
    lines.push({ label: webUIText('UnitTooltip.Modifiers'), isHeader: true });
    for (const m of modifiers) {
      const deltaText = (m.delta >= 0 ? '+' : '') + formatNumber(m.delta, {
        maximumFractionDigits: m.delta % 1 === 0 ? 0 : 1,
      });
      lines.push({
        label: m.label,
        value: deltaText,
        valueColor: m.delta >= 0 ? 'var(--green-light)' : 'var(--red-light)',
      });
    }
  }
  return {
    title: entry?.title ?? label,
    body: entry?.body,
    lines,
  };
}

function CostChip({
  icon,
  value,
  title,
  body,
  valueColor,
}: {
  icon: string;
  value: string;
  title: string;
  body?: string;
  valueColor?: string;
}) {
  return (
    <NestedTooltip
      inline
      delay={150}
      content={{
        title,
        body: body || undefined,
        lines: body ? undefined : [{ label: title, value }],
      }}
    >
      <span className="unit-tt-cost-chip">
        <img src={icon} alt="" className="unit-tt-cost-chip-icon" draggable={false} />
        <span className="unit-tt-cost-chip-val" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </span>
      </span>
    </NestedTooltip>
  );
}

function ResourceChip({
  item,
  perContext,
}: {
  item: BuildingResourceCost;
  perContext: string;
}) {
  const valueLabel = formatResourceAmount(item.amount);
  return (
    <NestedTooltip
      inline
      delay={150}
      content={{
        title: item.displayName || item.name,
        body: item.description || item.effects || webUIText('UnitTooltip.StrategicResource'),
        lines: [
          { label: perContext, value: valueLabel, valueIcon: item.icon, valueColor: 'var(--gold-light)' },
        ],
      }}
    >
      <ResourceLink resourceId={item.name} className="unit-tt-cost-chip unit-tt-cost-chip--resource">
        <img src={item.icon} alt="" className="unit-tt-cost-chip-icon" draggable={false} />
        <span className="unit-tt-cost-chip-val">{valueLabel}</span>
      </ResourceLink>
    </NestedTooltip>
  );
}

function Bar({
  icon,
  label,
  value,
  max,
  color,
  format,
  modifiers,
  compact,
  glossaryKey,
}: {
  icon: string;
  label: string;
  /** Base (unmodified) value for this stat. */
  value: number;
  max: number;
  color: 'red' | 'gold' | 'green';
  format?: (v: number) => string;
  modifiers?: UnitStatModifier[];
  /** Icon + bar + value only (no text label). Used in dual combat columns. */
  compact?: boolean;
  /** Glossary term key for the nested help tooltip (e.g. "Pierce Damage"). */
  glossaryKey?: string;
}) {
  const pctOf = (v: number) => {
    if (max <= 0) return 0;
    const raw = (v / max) * 100;
    if (v <= 0) return 0;
    return Math.min(100, Math.max(BAR_MIN_FILL_PCT, raw));
  };
  const displayVal = (v: number) => (format ? format(v) : formatNumber(v, { maximumFractionDigits: 1 }));

  const hasMods = Boolean(modifiers && modifiers.length > 0);
  const delta = hasMods ? modifiers!.reduce((a, m) => a + m.delta, 0) : 0;
  const effective = hasMods ? Math.max(0, value + delta) : value;
  const displayedVal = displayVal(effective);
  const tooltip = buildStatTooltip(label, glossaryKey, displayedVal, modifiers);

  const row = !hasMods ? (
    <div className={`settle-unit-stat-row${compact ? ' settle-unit-stat-row--compact' : ''}`}>
      <img src={icon} alt="" className="settle-unit-stat-icon" draggable={false} />
      {!compact && <span className="settle-unit-stat-label">{label}</span>}
      <PaintedBar percent={pctOf(value)} color={color} className="settle-unit-stat-bar" />
      <span className="settle-unit-stat-val">{displayedVal}</span>
    </div>
  ) : (() => {
    const basePct = pctOf(value);
    const effectivePct = pctOf(effective);
    const baseW = Math.round(Math.min(basePct, effectivePct));
    const posL = Math.round(basePct);
    const posW = Math.round(effectivePct - basePct);
    const negL = Math.round(effectivePct);
    const negW = Math.round(basePct - effectivePct);
    const tickL = Math.round(basePct);
    const fmtDelta = (v: number) => (v >= 0 ? '+' : '') + formatNumber(v, { maximumFractionDigits: v % 1 === 0 ? 0 : 1 });
    return (
      <>
        <div className={`settle-unit-stat-row${compact ? ' settle-unit-stat-row--compact' : ''}`}>
          <img src={icon} alt="" className="settle-unit-stat-icon" draggable={false} />
          {!compact && <span className="settle-unit-stat-label">{label}</span>}
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
        {modifiers!.map((m, i) => (
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
  })();

  return (
    <NestedTooltip delay={140} content={tooltip} wrapperClassName="settle-unit-stat-tt">
      {row}
    </NestedTooltip>
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

  const strengthLabel = d.strength !== undefined
    ? `${n(d.strength)}/${n(d.maxStrength)}`
    : n(d.maxStrength);

  const resourceCost = d.resourceCost ?? [];
  const monthlyConsumption = d.monthlyConsumption ?? [];

  return (
    <div className="settle-unit-tooltip">
      {/* ── Identity ─────────────────────────────────────────── */}
      <div className="settle-unit-tooltip-title-row">
        <img src={typeIcon} alt="" className="settle-unit-tooltip-type-icon" draggable={false} />
        <span className="settle-unit-tooltip-name">{d.name}</span>
        {d.count !== undefined && d.count > 1 && (
          <span className="unit-tt-count">
            <img src="/assets/icons/I_Multiplier.png" alt="" className="unit-tt-count-icon" draggable={false} />
            <span>{n(d.count)}</span>
          </span>
        )}
        {tierIconPath && <img src={tierIconPath} alt="" className="settle-unit-tooltip-tier-icon" draggable={false} />}
      </div>

      <div className="settle-unit-tooltip-header">
        <img src={portrait} alt="" className="settle-unit-tooltip-portrait" draggable={false} />
        <div className="settle-unit-tooltip-info">
          <div className="settle-unit-tooltip-type">{d.typeLabel}</div>
          <div className="settle-unit-tooltip-meta">
            {d.culture && (
              <CultureTooltip info={d.cultureInfo} fallbackName={d.culture}>
                <span className="settle-unit-tooltip-meta-chip">
                  {cultureIcon && (
                    <img src={cultureIcon} alt="" className="settle-unit-tooltip-meta-icon" draggable={false} />
                  )}
                  <span>{d.culture}</span>
                </span>
              </CultureTooltip>
            )}
            {d.culture && d.sourceBuilding && (
              <span className="settle-unit-tooltip-meta-dot" aria-hidden="true" />
            )}
            {d.sourceBuilding && (
              <span className="settle-unit-tooltip-meta-chip">
                <img
                  src="/assets/icons/I_BuildingsQuickButton.png"
                  alt=""
                  className="settle-unit-tooltip-meta-icon"
                  draggable={false}
                />
                <span>{d.sourceBuilding}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Cost strip ───────────────────────────────────────── */}
      <div className="unit-tt-cost-strip">
        <CostChip
          icon="/assets/icons/I_Population.png"
          value={strengthLabel}
          title={webUIText('Auto.ComponentsCommonUnitTooltip.318.4')}
          valueColor={d.strength !== undefined ? strengthColor : undefined}
        />
        {d.price !== undefined && (
          <CostChip
            icon="/assets/icons/I_Coins.png"
            value={n(d.price)}
            title={webUIText('Auto.ComponentsCommonUnitTooltip.331.6')}
          />
        )}
        {d.buildTime !== undefined && (
          <CostChip
            icon="/assets/icons/I_ModTraining.png"
            value={webUIText('UnitTooltip.DaysShort', { Value1: n(d.buildTime) })}
            title={webUIText('Auto.ComponentsCommonUnitTooltip.340.7')}
            body={webUIText('UnitTooltip.Days', { Value1: n(d.buildTime) })}
          />
        )}
        <CostChip
          icon="/assets/icons/I_Coins.png"
          value={`${n(d.upkeep)}${webUIText('Auto.ComponentsCommonUnitTooltip.348.9')}`}
          title={webUIText('Auto.ComponentsCommonUnitTooltip.345.8')}
        />
        <CostChip
          icon="/assets/icons/I_Food.png"
          value={`${formatNumber(d.foodConsumption, { maximumFractionDigits: 1 })}${webUIText('Auto.ComponentsCommonUnitTooltip.355.11')}`}
          title={webUIText('Auto.ComponentsCommonUnitTooltip.352.10')}
        />
        {resourceCost.map((r) => (
          <ResourceChip key={`cost-${r.name}`} item={r} perContext={webUIText('UnitTooltip.PerRecruit')} />
        ))}
        {monthlyConsumption.map((r) => (
          <ResourceChip key={`mo-${r.name}`} item={r} perContext={webUIText('UnitTooltip.PerMonth')} />
        ))}
      </div>

      {/* ── Combat ───────────────────────────────────────────── */}
      <div className="unit-tt-combat">
        <div className="unit-tt-combat-col">
          <ColHeader
            label={webUIText('Auto.ComponentsCommonUnitTooltip.359.12')}
            glossaryKey="Damage Types"
          />
          <Bar
            icon="/assets/icons/I_Damage_Pierce.png"
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.362.1')}
            glossaryKey="Pierce Damage"
            value={d.damage.pierce}
            max={dmg.pierce}
            color="red"
            modifiers={d.modifiers?.damage?.pierce}
            compact
          />
          <Bar
            icon="/assets/icons/I_Damage_Crush.png"
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.363.2')}
            glossaryKey="Crush Damage"
            value={d.damage.crush}
            max={dmg.crush}
            color="red"
            modifiers={d.modifiers?.damage?.crush}
            compact
          />
          <Bar
            icon="/assets/icons/I_Damage_Slash.png"
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.364.3')}
            glossaryKey="Slash Damage"
            value={d.damage.slash}
            max={dmg.slash}
            color="red"
            modifiers={d.modifiers?.damage?.slash}
            compact
          />
        </div>
        <div className="unit-tt-combat-col">
          <ColHeader
            label={webUIText('Auto.ComponentsCommonUnitTooltip.365.13')}
            glossaryKey="Armour"
          />
          <Bar
            icon="/assets/icons/I_Armour_Pierce.png"
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.368.4')}
            glossaryKey="Pierce Armour"
            value={d.armour.pierce}
            max={arm.pierce}
            color="gold"
            modifiers={d.modifiers?.armour?.pierce}
            compact
          />
          <Bar
            icon="/assets/icons/I_Armour_Crush.png"
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.369.5')}
            glossaryKey="Crush Armour"
            value={d.armour.crush}
            max={arm.crush}
            color="gold"
            modifiers={d.modifiers?.armour?.crush}
            compact
          />
          <Bar
            icon="/assets/icons/I_Armour_Slash.png"
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.370.6')}
            glossaryKey="Slash Armour"
            value={d.armour.slash}
            max={arm.slash}
            color="gold"
            modifiers={d.modifiers?.armour?.slash}
            compact
          />
        </div>
      </div>

      <div className="unit-tt-movement">
        <Bar
          icon="/assets/icons/I_Speed.png"
          label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.373.7')}
          glossaryKey="Speed"
          value={d.speed}
          max={speedMax}
          color="green"
          format={n}
          modifiers={d.modifiers?.speed}
        />
        {d.veterancy !== undefined && (
          <Bar
            icon={tierIconPath || TIER_ICONS[1]}
            label={webUIText('Auto.Attr.ComponentsCommonUnitTooltip.377.8')}
            glossaryKey="Veterancy"
            value={d.veterancy * 100}
            max={100}
            color="gold"
            format={(v) => `${n(v)}%`}
          />
        )}
      </div>

      {/* ── Availability ─────────────────────────────────────── */}
      {d.buildability && d.strength === undefined && (
        <>
          <SectionRule
            label={webUIText('Auto.ComponentsCommonUnitTooltip.387.14')}
            tooltip={{
              title: webUIText('UnitTooltip.RaisableTitle'),
              body: webUIText('UnitTooltip.RaisableBody'),
              lines: [
                {
                  label: webUIText('UnitTooltip.RaisableCountLabel'),
                  value: `${n(d.buildability.count)} / ${n(d.buildability.total)}`,
                  valueColor:
                    d.buildability.count === 0
                      ? 'var(--red)'
                      : d.buildability.count < d.buildability.total
                        ? 'var(--yellow)'
                        : 'var(--green)',
                },
              ],
            }}
          />
          <div className="unit-tt-raisable">
            <NestedTooltip
              delay={150}
              content={{
                title: webUIText('UnitTooltip.RaisableTitle'),
                body: webUIText('UnitTooltip.RaisableBody'),
                lines: [
                  {
                    label: webUIText('UnitTooltip.RaisableCountLabel'),
                    value: `${n(d.buildability.count)} / ${n(d.buildability.total)}`,
                    valueColor:
                      d.buildability.count === 0
                        ? 'var(--red)'
                        : d.buildability.count < d.buildability.total
                          ? 'var(--yellow)'
                          : 'var(--green)',
                  },
                  ...(d.buildability.requirement
                    ? [{ label: webUIText('UnitTooltip.RaisableRequirement'), value: d.buildability.requirement }]
                    : []),
                ],
              }}
              wrapperClassName="unit-tt-raisable-count-tt"
            >
              <div className="unit-tt-raisable-count">
                <img
                  src="/assets/icons/I_BuildingsQuickButton.png"
                  alt=""
                  className="unit-tt-raisable-icon"
                  draggable={false}
                />
                <span
                  className="unit-tt-raisable-value"
                  style={{
                    color:
                      d.buildability.count === 0
                        ? 'var(--red)'
                        : d.buildability.count < d.buildability.total
                          ? 'var(--yellow)'
                          : 'var(--green)',
                  }}
                >
                  {`${n(d.buildability.count)} / ${n(d.buildability.total)}`}
                </span>
                <span className="unit-tt-raisable-label text-with-help">
                  <WebUIText textKey="Auto.ComponentsCommonUnitTooltip.391.15" />
                </span>
              </div>
            </NestedTooltip>
            {d.buildability.settlements && d.buildability.settlements.length > 0 && (
              <div className="settle-unit-tooltip-settlements">
                {buildabilitySettlements.map((settlement, index) => (
                  <span className="settle-unit-tooltip-settlement-item" key={settlement.id}>
                    <NestedTooltip
                      inline
                      delay={120}
                      content={{
                        title: settlement.name,
                        body: webUIText('UnitTooltip.RaisableSettlementBody'),
                      }}
                    >
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
                    </NestedTooltip>
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
                      {webUIText('MilitaryScreen.More', { Value1: n(hiddenBuildabilitySettlementCount) })}
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
              </div>
            )}
            {d.buildability.count === 0 && d.buildability.requirement && (
              <div className="unit-tt-raisable-req">{d.buildability.requirement}</div>
            )}
          </div>
        </>
      )}

      {/* ── Flavour last ─────────────────────────────────────── */}
      {hasDescription && (
        <div className="settle-unit-tooltip-description">
          {d.description}
          {d.immuneToWinterAttrition && d.immuneToDesertAttrition && (
            <>
              {d.description ? ' ' : null}
              <WebUIText textKey="Auto.ComponentsCommonUnitTooltip.305.1" />
            </>
          )}
          {d.immuneToWinterAttrition && !d.immuneToDesertAttrition && (
            <>
              {d.description ? ' ' : null}
              <WebUIText textKey="Auto.ComponentsCommonUnitTooltip.308.2" />
            </>
          )}
          {!d.immuneToWinterAttrition && d.immuneToDesertAttrition && (
            <>
              {d.description ? ' ' : null}
              <WebUIText textKey="Auto.ComponentsCommonUnitTooltip.311.3" />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UnitTooltip;

import PaintedBar from '../../common/data-display/bars/PaintedBar';
import { useQuickInteractionMenu } from '../../common/interactions/useQuickInteractionMenu';
import Tooltip from '../../common/tooltips/Tooltip';
import type { ZoomPanInitialView } from '../../common/layout/scrolling/ZoomPanCanvas';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import { demoteMilitaryCommandBridge, promoteMilitaryCommandBridge } from '../../../bridge/military-map/useMilitaryBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { designUnitScale } from '../../../utils/cssUnits';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import {
  type Force,
  type Doctrine,
  strengthPct,
  subtree,
  RANK_META,
  DOCTRINE_META,
  rankLabel,
  DELEGATION_ICON,
  DIRECT_ICON,
  SQUASH_ICON,
} from './forces';
import { CANVAS_PAD, INITIAL_CHART_ZOOM } from './forceTreeLayout';

const SWORDS_ICON = '/assets/icons/I_Swords.png';
const MORALE_ICON = '/assets/icons/I_Loyalty.png';
const SUPPLY_ICON = '/assets/icons/I_Food.png';
const NAVY_BADGE = '/assets/icons/I_NaviesQuickButton.png';

function strengthPaintColor(f: Force): 'green' | 'gold' | 'red' {
  const p = strengthPct(f);
  if (p >= 80) return 'green';
  if (p >= 50) return 'gold';
  return 'red';
}

function moralePaintColor(m: number): 'green' | 'gold' | 'red' {
  if (m >= 70) return 'green';
  if (m >= 40) return 'gold';
  return 'red';
}

function fmt(n: number): string { return formatNumber(n); }
// ── Per-rank dimensions ─────────────────────────────────────────────────
// Higher-rank cards are visibly bigger so the top of the chain reads first.

export function buildChartInitialView(): ZoomPanInitialView {
  return () => ({
    zoom: INITIAL_CHART_ZOOM,
    panX: CANVAS_PAD * designUnitScale(),
    panY: CANVAS_PAD * designUnitScale(),
  });
}

// ── Node card ───────────────────────────────────────────────────────────

function buildCardTooltip(force: Force, allForces: Force[]) {
  const pct = strengthPct(force);
  const dm = DOCTRINE_META[force.doctrine];
  const subs = subtree(allForces, force.id).length - 1;

  const strengthTextColor =
    pct >= 80 ? 'var(--green-light)' :
    pct >= 50 ? 'var(--gold-light)' :
                'var(--red-light)';
  const moraleTextColor =
    force.morale >= 70 ? 'var(--green-light)' :
    force.morale >= 40 ? 'var(--gold-light)' :
                         'var(--red-light)';
  const supplyTextColor =
    force.supplyDays >= 14 ? 'var(--green-light)' :
    force.supplyDays >= 7  ? 'var(--gold-light)' :
                             'var(--red-light)';

  type Line = {
    label: string;
    labelIcon?: string;
    value?: string;
    valueColor?: string;
    valueIcon?: string;
    isHeader?: boolean;
  };
  const lines: Line[] = [
    { isHeader: true, label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.219.1') },
    {
      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.221.2'), labelIcon: SWORDS_ICON,
      get value() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.222.1", { Value1: fmt(force.strength), Value2: fmt(force.maxStrength) }); },
      valueColor: strengthTextColor,
    },
    {
      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.226.3'), labelIcon: SWORDS_ICON,
      value: formatPercent(pct),
      valueColor: strengthTextColor,
    },
    {
      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.231.4'), labelIcon: MORALE_ICON,
      get value() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.232.1", { Value1: formatNumber(force.morale) }); },
      valueColor: moraleTextColor,
    },
    {
      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.236.5'), labelIcon: SUPPLY_ICON,
      get value() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.237.1", { Value1: formatNumber(force.supplyDays) }); },
      valueColor: supplyTextColor,
    },

    { isHeader: true, label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.241.6') },
    {
      get label() { return force.delegated ? webUIText("Auto.Fix.PropExprTrue.componentsscreensMilitaryMilitaryScreen.243.1") : webUIText("Auto.Fix.PropExprFalse.componentsscreensMilitaryMilitaryScreen.243.1"); },
      labelIcon: force.delegated ? DELEGATION_ICON : DIRECT_ICON,
      value: force.delegated ? dm.label : undefined,
      valueIcon: force.delegated ? dm.icon : '/assets/icons/I_Minus.png',
    },
  ];

  if (force.rank === 'Dux') {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.252.7'),
      labelIcon: SQUASH_ICON,
      get value() { return force.autoSquashRebels ? webUIText("Auto.Fix.PropExprTrue.componentsscreensMilitaryMilitaryScreen.254.1") : webUIText("Auto.Fix.PropExprFalse.componentsscreensMilitaryMilitaryScreen.254.1"); },
      valueColor: force.autoSquashRebels ? 'var(--green-light)' : 'var(--text-muted)',
    });
  }
  if (subs > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.260.8'),
      get value() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.261.1", { Value1: fmt(subs) }); },
    });
  }
  lines.push({
    label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.265.9'),
    value: force.location,
  });

  return {
    title: force.name,
    get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.271.1", { Value1: rankLabel(force), Value2: force.commanderName }); },
    lines,
  };
}

export function NodeCard({
  force, allForces, selected, highlighted, dimmed,
}: {
  force: Force;
  allForces: Force[];
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const rm = RANK_META[force.rank];
  const dm = DOCTRINE_META[force.doctrine];
  const pct = strengthPct(force);
  const showDux = force.rank === 'Dux';
  const quickMenu = useQuickInteractionMenu<HTMLDivElement>({
    kind: 'military',
    targetId: force.id,
    militaryType: force.isNavy ? 'fleet' : 'army',
    actions: force.isPlayerControlled
      ? [
        ...(force.rank !== 'Dux' ? [{
          label: webUIText('QuickInteraction.PromoteCommand'),
          onSelect: () => promoteMilitaryCommandBridge(force.id).catch(acknowledgeBridgeFailure),
        }] : []),
        ...(force.rank !== 'Legatus' ? [{
          label: webUIText('QuickInteraction.DemoteCommand'),
          onSelect: () => demoteMilitaryCommandBridge(force.id).catch(acknowledgeBridgeFailure),
        }] : []),
      ]
      : [],
  });

  return (
    <>
      <Tooltip content={buildCardTooltip(force, allForces)} position="right" delay={250} variant="sidebar">
        <div
          data-tutorial-target={force.isPlayerControlled && force.rank === 'Legatus' ? 'PromotableMilitaryCommand' : undefined}
          className={[
            'chart-node',
            `chart-node--${force.rank.toLowerCase()}`,
            `chart-node--strength-${strengthPaintColor(force)}`,
            `chart-node--morale-${moralePaintColor(force.morale)}`,
            selected ? 'is-selected' : '',
            highlighted ? 'is-highlighted' : '',
            dimmed ? 'is-dimmed' : '',
            !force.isPlayerControlled ? 'chart-node--uncontrolled' : '',
            force.isNavy ? 'chart-node--navy' : '',
          ].filter(Boolean).join(' ')}
          onContextMenu={quickMenu.onContextMenu}
        >
        <div className="chart-node-inner">
        <Tooltip content={{ title: rankLabel(force), body: force.isProvincialGuard ? webUIText('Military.ProvincialGuard.Description') : rm.desc }}>
          <div className="chart-node-crest">
            <img className="chart-node-rank-icon" src={rm.icon} alt="" draggable={false} />
            {force.isNavy && (
              <img className="chart-node-navy-badge" src={NAVY_BADGE} alt="" draggable={false} />
            )}
          </div>
        </Tooltip>
        <div className="chart-node-body">
          <span className="chart-node-name">{force.name}</span>
          <span className="chart-node-commander">{force.commanderName}</span>
          <div className="chart-node-bars">
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.317.10'), get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.317.1", { Value1: fmt(force.strength), Value2: fmt(force.maxStrength), Value3: formatPercent(pct) }); } }}>
              <div className="chart-node-bar-row">
                <PaintedBar percent={pct} color={strengthPaintColor(force)} className="chart-node-bar" />
              </div>
            </Tooltip>
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.322.11'), get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.322.1", { Value1: formatNumber(force.morale) }); } }}>
              <div className="chart-node-bar-row">
                <PaintedBar percent={force.morale} color={moralePaintColor(force.morale)} className="chart-node-bar chart-node-bar--morale" />
              </div>
            </Tooltip>
          </div>
        </div>
        <div className="chart-node-foot">
          <div className="chart-node-stats">
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.331.12'), get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.331.1", { Value1: fmt(force.strength), Value2: fmt(force.maxStrength), Value3: formatPercent(pct) }); } }}>
              <span className="chart-node-strength">
                <img className="chart-node-foot-icon" src={SWORDS_ICON} alt="" draggable={false} />
                {fmt(force.strength)}
              </span>
            </Tooltip>
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.337.13'), get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.337.1", { Value1: formatNumber(force.morale) }); } }}>
              <span className="chart-node-morale">
                <img className="chart-node-foot-icon" src={MORALE_ICON} alt="" draggable={false} />
                {formatNumber(force.morale)}
              </span>
            </Tooltip>
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.343.14'), get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.343.1", { Value1: formatNumber(force.supplyDays) }); } }}>
              <span className="chart-node-supply">
                <img className="chart-node-foot-icon" src={SUPPLY_ICON} alt="" draggable={false} />
                {formatNumber(force.supplyDays)}<WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.345.1" />
              </span>
            </Tooltip>
          </div>
          <div className="chart-node-command-row">
            <Tooltip content={{
              get title() { return force.delegated ? webUIText("Auto.Fix.PropExprTrue.componentsscreensMilitaryMilitaryScreen.352.1") : webUIText("Auto.Fix.PropExprFalse.componentsscreensMilitaryMilitaryScreen.352.1"); },
              get body() { return force.delegated ? webUIText("Auto.Fix.PropExprTrue.componentsscreensMilitaryMilitaryScreen.354.1") : webUIText("Auto.Fix.PropExprFalse.componentsscreensMilitaryMilitaryScreen.355.1"); },
            }}>
              <span className={`chart-node-command-mark${force.delegated ? ' is-on' : ''}`}>
                <img
                  className="chart-node-command-icon"
                  src={force.delegated ? DELEGATION_ICON : DIRECT_ICON}
                  alt=""
                  draggable={false}
                />
                <span className="chart-node-command-text">{force.delegated ? webUIText("Auto.Fix.ExprTrue.componentsscreensMilitaryMilitaryScreen.364.1") : webUIText("Auto.Fix.ExprFalse.componentsscreensMilitaryMilitaryScreen.364.1")}</span>
              </span>
            </Tooltip>
            <Tooltip content={{ get title() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.367.1", { Label: dm.label }); }, body: dm.desc }}>
              <span className="chart-node-command-mark is-doctrine">
                <img
                  className="chart-node-command-icon"
                  src={dm.icon}
                  alt=""
                  draggable={false}
                />
                <span className="chart-node-command-text">{dm.label}</span>
              </span>
            </Tooltip>
            {showDux && force.autoSquashRebels && (
              <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.379.15'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.379.16') }}>
                <span className="chart-node-command-mark is-squash is-on">
                  <img className="chart-node-command-icon" src={SQUASH_ICON} alt="" draggable={false} />
                  <span className="chart-node-command-text"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.381.2" /></span>
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
        </div>
      </Tooltip>
      {quickMenu.node}
    </>
  );
}


// ── Main ────────────────────────────────────────────────────────────────

export type HighlightKey = null | 'delegated' | 'direct' | 'squash' | Doctrine;

export const HIGHLIGHT_OPTIONS: { key: HighlightKey; label: string; icon: string; desc: string }[] = [
  { key: 'delegated', get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.400.1'); },     icon: DELEGATION_ICON, get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.398.9'); } },
  { key: 'direct',    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.401.2'); }, icon: DIRECT_ICON,    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.399.10'); } },
  { key: 'squash',    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.402.3'); },       icon: SQUASH_ICON,     get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.400.11'); } },
  { key: 'concentrate', label: DOCTRINE_META.concentrate.label, icon: DOCTRINE_META.concentrate.icon, desc: DOCTRINE_META.concentrate.desc },
  { key: 'screen',      label: DOCTRINE_META.screen.label,      icon: DOCTRINE_META.screen.icon,      desc: DOCTRINE_META.screen.desc },
  { key: 'garrison',    label: DOCTRINE_META.garrison.label,    icon: DOCTRINE_META.garrison.icon,    desc: DOCTRINE_META.garrison.desc },
  { key: 'independent', label: DOCTRINE_META.independent.label, icon: DOCTRINE_META.independent.icon, desc: DOCTRINE_META.independent.desc },
];

export function matchesHighlight(f: Force, h: HighlightKey): boolean {
  if (h === null) return true;
  if (h === 'delegated') return f.delegated;
  if (h === 'direct')    return !f.delegated;
  if (h === 'squash')    return f.autoSquashRebels;
  return f.doctrine === h;
}

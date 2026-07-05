import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import CloseButton from '../../common/buttons/CloseButton';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import DropdownSelect, { type DropdownSelectOption } from '../../common/forms/DropdownSelect';
import GameButton from '../../common/buttons/GameButton';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import Tooltip from '../../common/tooltips/Tooltip';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import UnitTooltip, { type UnitTooltipData } from '../../common/tooltips/UnitTooltip';
import CourtOfficeSummary from '../../common/entities/CourtOfficeSummary';
import ZoomPanCanvas, { type ZoomPanInitialView, type ZoomPanView } from '../../common/layout/scrolling/ZoomPanCanvas';
import CourtAppointmentModal from '../../modals/characters/CourtAppointmentModal';
import { useGameActions } from '../../../context/GameContext';
import { useCourtPositions, useMilitary, useMilitaryOverview, usePlayerFactionId } from '../../../data-source/index';
import {
  setMilitaryParentBridge,
  selectMilitaryBridge,
  setMilitaryFormationTemplateBridge,
  setAutoAssignCommandsBridge,
  setAutoReplenishFormationsBridge,
} from '../../../bridge/military-map/useMilitaryBridge';
import {
  applyFormationTemplateBridge,
  deleteFormationTemplateBridge,
  saveFormationTemplateBridge,
  useFormationTemplatesBridge,
} from '../../../bridge/military-map/useFormationTemplatesBridge';
import { acknowledgeBridgeFailure, getRuntimeEngine } from '../../../bridge/core/runtimeEngine';
import type {
  FormationTemplateAssignedForce,
  FormationTemplateBattleGroupEntry,
  FormationTemplateEntry,
  FormationTemplateUnitEntry,
  SaveFormationTemplateBattleGroupRequest,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import type { CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import type { Army } from '../../../data/types';
import {
  type Force, type Rank, type Doctrine,
  strengthPct, subtree,
  RANK_META, DOCTRINE_META, rankLabel,
  DELEGATION_ICON, DIRECT_ICON, SQUASH_ICON,
} from './forces';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import { designRem, designUnitScale, toRootRem } from '../../../utils/cssUnits';
import {
  FORMATION_TEMPLATE_ICON_OPTIONS,
  getFormationTemplateIcon,
} from '../../../utils/formationTemplatePresentation';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import './MilitaryScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
// ── Per-rank dimensions ─────────────────────────────────────────────────
// Higher-rank cards are visibly bigger so the top of the chain reads first.
const RANK_DIMS: Record<Rank, { w: number; h: number }> = {
  Dux:        { w: 296, h: 136 },
  Praefectus: { w: 244, h: 112 },
  Legatus:    { w: 208, h: 96 },
};

const DEPTH_GAP = 90;
const SIBLING_GAP = 12;
const ROOT_GAP = 30;
const CANVAS_PAD = 56;
const INITIAL_CHART_ZOOM = 0.85;
const MIN_CHART_ZOOM = 0.35;
const MAX_CHART_ZOOM = 1.6;
const CHART_ZOOM_STEP = 1.15;
const DRAG_THRESHOLD = 5;

const SWORDS_ICON = '/assets/icons/I_Swords.png';
const MORALE_ICON = '/assets/icons/I_Loyalty.png';
const SUPPLY_ICON = '/assets/icons/I_Food.png';
const NAVY_BADGE  = '/assets/icons/I_NaviesQuickButton.png';
const TEMPLATE_ICON = '/assets/icons/I_Template.png';
const GOLD_ICON = '/assets/icons/I_Coins.png';
const UPKEEP_ICON = '/assets/icons/Diplomacy/I_DemandGoldRecurring.png';
const SETTLEMENT_ICON = '/assets/icons/I_City.png';
const TIER_ICON = '/assets/icons/I_UnitPromote.png';
const TRAINING_ICON = '/assets/icons/I_ModTraining.png';
const SPEED_ICON = '/assets/icons/I_Speed.png';
const RAISE_ICON = '/assets/icons/I_ArmiesQuickButton.png';
const SAVE_ICON = '/assets/icons/I_SaveFolder.png';
const DUPLICATE_ICON = '/assets/icons/I_DuplicateTemplate.png';
const DELETE_ICON = '/assets/icons/I_Close.png';
const RENAME_ICON = '/assets/icons/I_Rename.png';
const ADD_ICON = '/assets/icons/I_Plus.png';
const TEMPLATE_LIMIT = 30;
const MAX_BATTLE_FORMATION_SIZE = 10;

type MilitaryScreenTab = 'land' | 'sea' | 'templates';
type TemplateCreateType = 'land' | 'naval';
type TemplateEditorTab = 'units' | 'battle';
type BattleFormationRole = 'melee' | 'ranged';
type UnitCatalogueColumnKey = 'unit' | 'type' | 'tier' | 'strength' | 'cost' | 'upkeep' | 'settlements' | 'add';
type UnitCatalogueFilterKey = 'type' | 'culture';

const CATALOGUE_ALL_FILTER = '__all__';

function decodeScreenToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function compactScreenToken(value: string): string {
  return value.replace(/[\s_-]/g, '');
}

function isTemplateScreenToken(id: string): boolean {
  const compactId = compactScreenToken(id);
  return compactId === 'templates'
    || compactId === 'template'
    || compactId === 'formations'
    || compactId === 'formation'
    || compactId === 'formationtemplates'
    || compactId === 'armytemplates'
    || compactId === 'landtemplates'
    || compactId === 'navytemplates'
    || compactId === 'navaltemplates'
    || id.startsWith('template:')
    || id.startsWith('new:')
    || id.startsWith('rename:')
    || id.startsWith('assign:');
}

function initialMilitaryTab(screenId: string | null | undefined): MilitaryScreenTab {
  const id = (screenId ?? '').trim().toLowerCase();
  if (isTemplateScreenToken(id)) {
    return 'templates';
  }
  if (id === 'sea' || id === 'naval' || id === 'navy') return 'sea';
  return 'land';
}

function templateIdFromScreenId(screenId: string | null | undefined): string | null {
  if (!screenId) return null;
  const id = screenId.trim();
  const lower = id.toLowerCase();
  if (lower.startsWith('template:')) return decodeScreenToken(id.slice('template:'.length));
  if (lower.startsWith('rename:')) return decodeScreenToken(id.slice('rename:'.length));
  return null;
}

function createTypeFromScreenId(screenId: string | null | undefined): TemplateCreateType | null {
  const id = (screenId ?? '').trim().toLowerCase();
  const compactId = compactScreenToken(id);
  if (id === 'new:naval' || id === 'new:fleet' || id === 'new:sea') return 'naval';
  if (id === 'new:land' || id === 'new:army') return 'land';
  if (compactId === 'navytemplates' || compactId === 'navaltemplates') return 'naval';
  if (compactId === 'armytemplates' || compactId === 'landtemplates') return 'land';
  return null;
}

function assignmentTargetFromScreenId(screenId: string | null | undefined): string | null {
  if (!screenId) return null;
  const id = screenId.trim();
  return id.toLowerCase().startsWith('assign:')
    ? decodeScreenToken(id.slice('assign:'.length))
    : null;
}

const TEMPLATE_UNIT_TYPE_ICONS: Record<string, string> = {
  infantry: '/assets/icons/UnitTypes/Infantry.png',
  cavalry: '/assets/icons/UnitTypes/Cavalry.png',
  ranged: '/assets/icons/UnitTypes/Ranged.png',
  siege: '/assets/icons/I_Siege.png',
  galley: '/assets/icons/I_NaviesQuickButton.png',
  trireme: '/assets/icons/I_NaviesQuickButton.png',
  quinquereme: '/assets/icons/I_NaviesQuickButton.png',
  naval: '/assets/icons/I_NaviesQuickButton.png',
  navy: '/assets/icons/I_NaviesQuickButton.png',
};

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

// ── Layout ──────────────────────────────────────────────────────────────

interface PlacedNode {
  force: Force;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutResult {
  nodes: PlacedNode[];
  lines: { x1: number; y1: number; x2: number; y2: number; parentId: string; childId: string }[];
  width: number;
  height: number;
}

function layoutTree(forces: Force[]): LayoutResult {
  const childrenOf = new Map<string | null, Force[]>();
  for (const f of forces) {
    const arr = childrenOf.get(f.parentId) ?? [];
    arr.push(f);
    childrenOf.set(f.parentId, arr);
  }
  const byId = new Map(forces.map(f => [f.id, f]));

  // Per-depth column width = widest node at that depth. Computed by scanning
  // the tree once so unusual hierarchies still lay out correctly.
  const depthMaxW: number[] = [];
  function probeDepth(id: string, depth: number) {
    const f = byId.get(id)!;
    const w = RANK_DIMS[f.rank].w;
    depthMaxW[depth] = Math.max(depthMaxW[depth] ?? 0, w);
    for (const k of childrenOf.get(id) ?? []) probeDepth(k.id, depth + 1);
  }
  for (const r of childrenOf.get(null) ?? []) probeDepth(r.id, 0);

  // Absolute x for each depth column.
  const depthX: number[] = [];
  let cursorX = 0;
  for (let d = 0; d < depthMaxW.length; d++) {
    depthX[d] = cursorX;
    cursorX += depthMaxW[d] + DEPTH_GAP;
  }
  const totalWidth = Math.max(0, cursorX - DEPTH_GAP);

  const subtreeHeight = new Map<string, number>();
  function heightOf(id: string): number {
    if (subtreeHeight.has(id)) return subtreeHeight.get(id)!;
    const f = byId.get(id)!;
    const own = RANK_DIMS[f.rank].h;
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) { subtreeHeight.set(id, own); return own; }
    const total = kids.reduce((s, k, i) => s + heightOf(k.id) + (i > 0 ? SIBLING_GAP : 0), 0);
    const h = Math.max(own, total);
    subtreeHeight.set(id, h);
    return h;
  }

  const nodes: PlacedNode[] = [];
  const lines: LayoutResult['lines'] = [];

  function place(id: string, yTop: number, depth: number) {
    const f = byId.get(id)!;
    const dim = RANK_DIMS[f.rank];
    const subH = heightOf(id);
    const colW = depthMaxW[depth];
    // Left-align inside the column so parent→child edges read left→right,
    // but centre the card within its subtree's vertical span.
    const nodeX = depthX[depth];
    const nodeY = yTop + (subH - dim.h) / 2;
    nodes.push({ force: f, x: nodeX, y: nodeY, w: dim.w, h: dim.h });

    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return;
    const kidsTotal = kids.reduce((s, k, i) => s + heightOf(k.id) + (i > 0 ? SIBLING_GAP : 0), 0);
    let cursor = yTop + (subH - kidsTotal) / 2;
    for (const k of kids) {
      const kh = heightOf(k.id);
      const kdim = RANK_DIMS[k.rank];
      lines.push({
        x1: nodeX + dim.w,
        y1: nodeY + dim.h / 2,
        x2: depthX[depth + 1],
        y2: cursor + (kh - kdim.h) / 2 + kdim.h / 2,
        parentId: id,
        childId: k.id,
      });
      place(k.id, cursor, depth + 1);
      cursor += kh + SIBLING_GAP;
    }
    void colW; // columns used only for edge x2
  }

  const roots = childrenOf.get(null) ?? [];
  let y = 0;
  for (const r of roots) {
    place(r.id, y, 0);
    y += heightOf(r.id) + ROOT_GAP;
  }

  return {
    nodes,
    lines,
    width: totalWidth,
    height: Math.max(0, y - ROOT_GAP),
  };
}

function buildChartInitialView(): ZoomPanInitialView {
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

function NodeCard({
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

  return (
    <Tooltip content={buildCardTooltip(force, allForces)} position="right" delay={250} variant="sidebar">
      <div
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
      >
        <div className="chart-node-inner">
        <Tooltip content={{ title: rankLabel(force), body: rm.desc }}>
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
  );
}


// ── Main ────────────────────────────────────────────────────────────────

type HighlightKey = null | 'delegated' | 'direct' | 'squash' | Doctrine;
let nextBattleGroupId = 1;

const HIGHLIGHT_OPTIONS: { key: HighlightKey; label: string; icon: string; desc: string }[] = [
  { key: 'delegated', get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.400.1'); },     icon: DELEGATION_ICON, get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.398.9'); } },
  { key: 'direct',    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.401.2'); }, icon: DIRECT_ICON,    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.399.10'); } },
  { key: 'squash',    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.402.3'); },       icon: SQUASH_ICON,     get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.400.11'); } },
  { key: 'concentrate', label: DOCTRINE_META.concentrate.label, icon: DOCTRINE_META.concentrate.icon, desc: DOCTRINE_META.concentrate.desc },
  { key: 'screen',      label: DOCTRINE_META.screen.label,      icon: DOCTRINE_META.screen.icon,      desc: DOCTRINE_META.screen.desc },
  { key: 'garrison',    label: DOCTRINE_META.garrison.label,    icon: DOCTRINE_META.garrison.icon,    desc: DOCTRINE_META.garrison.desc },
  { key: 'independent', label: DOCTRINE_META.independent.label, icon: DOCTRINE_META.independent.icon, desc: DOCTRINE_META.independent.desc },
];

function matchesHighlight(f: Force, h: HighlightKey): boolean {
  if (h === null) return true;
  if (h === 'delegated') return f.delegated;
  if (h === 'direct')    return !f.delegated;
  if (h === 'squash')    return f.autoSquashRebels;
  return f.doctrine === h;
}

function templateUnitSummary(template: FormationTemplateEntry): string {
  const units = template.units
    .filter((unit) => unit.count > 0)
    .slice(0, 3)
    .map((unit) => `${formatNumber(unit.count)} ${unit.name}`);
  const hidden = Math.max(0, template.units.filter((unit) => unit.count > 0).length - units.length);
  if (units.length === 0) return webUIText('Military.NoUnitsAssigned');
  return hidden > 0 ? `${units.join(', ')} + ${formatNumber(hidden)} more` : units.join(', ');
}

function templateUnitTypeLabel(unit: FormationTemplateUnitEntry): string {
  return unit.unitTypeLabel || unit.type || unit.category;
}

function templateUnitTypeIcon(unit: FormationTemplateUnitEntry): string {
  return TEMPLATE_UNIT_TYPE_ICONS[unit.type] ?? TEMPLATE_UNIT_TYPE_ICONS[unit.category] ?? SWORDS_ICON;
}

function templateUnitPortrait(unit: FormationTemplateUnitEntry): string {
  const portrait = FoaeCefUIAssetPath(unit.portrait);
  return portrait || unit.portrait || templateUnitTypeIcon(unit);
}

function templateResourceCosts(unit: FormationTemplateUnitEntry, kind: 'raise' | 'monthly') {
  const costs = kind === 'raise' ? unit.resourceCost : unit.monthlyConsumption;
  return costs.map(cost => ({
    name: cost.name,
    amount: cost.amount,
    icon: `/assets/resources/${cost.name}.png`,
  }));
}

function templateUnitTooltipData(unit: FormationTemplateUnitEntry, count: number): UnitTooltipData {
  const settlements = availableSettlementNames(unit);
  const buildabilitySettlements = availableSettlementEntries(unit);
  return {
    name: unit.name,
    description: unit.description,
    portrait: templateUnitPortrait(unit),
    typeLabel: templateUnitTypeLabel(unit),
    typeIcon: templateUnitTypeIcon(unit),
    tier: unit.tier,
    maxStrength: unit.maxStrength,
    price: unit.price,
    buildTime: unit.buildTimeDays,
    upkeep: unit.upkeep,
    foodConsumption: unit.foodConsumption,
    speed: unit.speed,
    damage: {
      pierce: unit.pierceDamage,
      crush: unit.crushDamage,
      slash: unit.slashDamage,
    },
    armour: {
      pierce: unit.pierceArmour,
      crush: unit.crushArmour,
      slash: unit.slashArmour,
    },
    resourceCost: templateResourceCosts(unit, 'raise'),
    monthlyConsumption: templateResourceCosts(unit, 'monthly'),
    immuneToWinterAttrition: unit.immuneToWinterAttrition,
    immuneToDesertAttrition: unit.immuneToDesertAttrition,
    count,
    buildability: {
      count: unit.availableSettlementCount || settlements.length,
      total: Math.max(unit.availableSettlements.length, unit.availableSettlementCount || settlements.length),
      settlements: buildabilitySettlements,
    },
  };
}

function templateUnitAttack(unit: FormationTemplateUnitEntry): number {
  return unit.pierceDamage + unit.crushDamage + unit.slashDamage;
}

function templateUnitDefence(unit: FormationTemplateUnitEntry): number {
  return unit.pierceArmour + unit.crushArmour + unit.slashArmour;
}

interface TemplateDraft {
  templateId: string;
  name: string;
  iconId: string;
  type: TemplateCreateType;
  counts: Record<string, number>;
  order: string[];
  battleGroups: DraftBattleGroup[];
}

interface DraftBattleGroup {
  id: string;
  role: BattleFormationRole;
  counts: Record<string, number>;
  order: string[];
}

interface TemplateDraftTotals {
  units: number;
  strength: number;
  cost: number;
  upkeep: number;
  days: number;
  food: number;
  speed: number;
}

const EMPTY_TEMPLATE_TOTALS: TemplateDraftTotals = {
  units: 0,
  strength: 0,
  cost: 0,
  upkeep: 0,
  days: 0,
  food: 0,
  speed: 0,
};

function normaliseTemplateType(type: string): TemplateCreateType {
  return type === 'naval' ? 'naval' : 'land';
}

function createBattleGroupId(): string {
  const id = `group-${nextBattleGroupId}`;
  nextBattleGroupId += 1;
  return id;
}

function normaliseBattleRole(role: string): BattleFormationRole {
  return role === 'ranged' ? 'ranged' : 'melee';
}

function orderedBattleGroupUnitIds(group: DraftBattleGroup): string[] {
  const ids = [...group.order];
  Object.keys(group.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids.filter(id => (group.counts[id] ?? 0) > 0);
}

function battleGroupUnitCount(group: DraftBattleGroup): number {
  return orderedBattleGroupUnitIds(group).reduce((sum, unitId) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

function buildDraftBattleGroups(groups: FormationTemplateBattleGroupEntry[]): DraftBattleGroup[] {
  return groups.map(group => {
    const counts: Record<string, number> = {};
    const order: string[] = [];
    group.units.forEach(unit => {
      if (unit.count <= 0) return;
      counts[unit.unitId] = unit.count;
      order.push(unit.unitId);
    });

    return {
      id: group.id || createBattleGroupId(),
      role: normaliseBattleRole(group.role),
      counts,
      order,
    };
  }).filter(group => battleGroupUnitCount(group) > 0);
}

function buildTemplateDraft(template: FormationTemplateEntry | null, type: TemplateCreateType): TemplateDraft {
  if (!template) {
    return {
      templateId: '',
      name: '',
      iconId: '',
      type,
      counts: {},
      order: [],
      battleGroups: [],
    };
  }

  const counts: Record<string, number> = {};
  const order: string[] = [];
  template.units.forEach(unit => {
    if (unit.count <= 0) return;
    counts[unit.id] = unit.count;
    order.push(unit.id);
  });

  return {
    templateId: template.id,
    name: template.name,
    iconId: template.iconId || '',
    type: normaliseTemplateType(template.type),
    counts,
    order,
    battleGroups: buildDraftBattleGroups(template.battleGroups),
  };
}

function orderedDraftUnitIds(draft: TemplateDraft): string[] {
  const ids = [...draft.order];
  Object.keys(draft.counts).forEach(id => {
    if (!ids.includes(id)) ids.push(id);
  });
  return ids.filter(id => (draft.counts[id] ?? 0) > 0);
}

function draftCompositionRequests(draft: TemplateDraft): SaveFormationTemplateUnitRequest[] {
  return orderedDraftUnitIds(draft).map(unitId => ({
    unitId,
    count: draft.counts[unitId] ?? 0,
  }));
}

function draftBattleGroupRequests(draft: TemplateDraft): SaveFormationTemplateBattleGroupRequest[] {
  return draft.battleGroups
    .map(group => ({
      role: group.role,
      units: orderedBattleGroupUnitIds(group).map(unitId => ({
        unitId,
        count: group.counts[unitId] ?? 0,
      })),
    }))
    .filter(group => group.units.length > 0);
}

function draftUnitCount(draft: TemplateDraft): number {
  return draftCompositionRequests(draft).reduce((sum, unit) => sum + unit.count, 0);
}

function templateDraftsEqual(left: TemplateDraft, right: TemplateDraft): boolean {
  if (left.templateId !== right.templateId || left.name !== right.name || left.iconId !== right.iconId || left.type !== right.type) return false;
  const leftUnits = draftCompositionRequests(left);
  const rightUnits = draftCompositionRequests(right);
  if (leftUnits.length !== rightUnits.length) return false;
  if (!leftUnits.every((unit, index) => unit.unitId === rightUnits[index].unitId && unit.count === rightUnits[index].count)) return false;

  const leftGroups = draftBattleGroupRequests(left);
  const rightGroups = draftBattleGroupRequests(right);
  if (leftGroups.length !== rightGroups.length) return false;
  return leftGroups.every((group, groupIndex) => {
    const rightGroup = rightGroups[groupIndex];
    if (group.role !== rightGroup.role || group.units.length !== rightGroup.units.length) return false;
    return group.units.every((unit, unitIndex) => (
      unit.unitId === rightGroup.units[unitIndex].unitId
      && unit.count === rightGroup.units[unitIndex].count
    ));
  });
}

function draftTotals(draft: TemplateDraft, unitById: Map<string, FormationTemplateUnitEntry>): TemplateDraftTotals {
  const units = draftCompositionRequests(draft);
  if (units.length === 0) return EMPTY_TEMPLATE_TOTALS;

  const totals = units.reduce((currentTotals, request, index) => {
    const unit = unitById.get(request.unitId);
    if (!unit) return currentTotals;
    return {
      units: currentTotals.units + request.count,
      strength: currentTotals.strength + unit.maxStrength * request.count,
      cost: currentTotals.cost + unit.price * request.count + (index === 0 ? unit.price : 0),
      upkeep: currentTotals.upkeep + unit.upkeep * request.count,
      days: currentTotals.days + unit.buildTimeDays * request.count,
      food: currentTotals.food + unit.foodConsumption * request.count,
      speed: currentTotals.speed === 0 ? unit.speed : Math.min(currentTotals.speed, unit.speed),
    };
  }, EMPTY_TEMPLATE_TOTALS);

  return {
    ...totals,
    food: Math.round(totals.food * 10) / 10,
  };
}

function romanTier(tier: number): string {
  return ['-', 'I', 'II', 'III', 'IV', 'V', 'VI'][tier] ?? formatNumber(tier);
}

function battleRoleForUnit(unit: FormationTemplateUnitEntry | undefined): 'melee' | 'ranged' {
  return unit && unit.range > 0 ? 'ranged' : 'melee';
}

function assignedBattleGroupCount(draft: TemplateDraft, unitId: string): number {
  return draft.battleGroups.reduce((sum, group) => sum + Math.max(0, group.counts[unitId] ?? 0), 0);
}

function groupAssignedCountExcluding(draft: TemplateDraft, unitId: string, groupId: string): number {
  return draft.battleGroups.reduce((sum, group) => (
    group.id === groupId ? sum : sum + Math.max(0, group.counts[unitId] ?? 0)
  ), 0);
}

function unassignedUnitCount(draft: TemplateDraft, unitId: string): number {
  return Math.max(0, (draft.counts[unitId] ?? 0) - assignedBattleGroupCount(draft, unitId));
}

function battleGroupsValid(draft: TemplateDraft, unitById: Map<string, FormationTemplateUnitEntry>): boolean {
  const requests = draftCompositionRequests(draft);
  if (requests.length === 0) return false;
  if (!requests.every(request => assignedBattleGroupCount(draft, request.unitId) === request.count)) return false;

  return draft.battleGroups.every(group => {
    const total = battleGroupUnitCount(group);
    if (total <= 0 || total > MAX_BATTLE_FORMATION_SIZE) return false;
    return orderedBattleGroupUnitIds(group).every(unitId => {
      const unit = unitById.get(unitId);
      return unit ? battleRoleForUnit(unit) === group.role : false;
    });
  });
}

function removeUnitsFromBattleGroups(groups: DraftBattleGroup[], unitId: string, count: number): DraftBattleGroup[] {
  let remaining = count;
  const nextGroups = groups.map(group => {
    if (remaining <= 0 || !group.counts[unitId]) return group;
    const currentCount = group.counts[unitId] ?? 0;
    const removeCount = Math.min(currentCount, remaining);
    remaining -= removeCount;

    const counts = { ...group.counts };
    const nextCount = currentCount - removeCount;
    if (nextCount > 0) counts[unitId] = nextCount;
    else delete counts[unitId];

    return {
      ...group,
      counts,
      order: group.order.filter(id => id !== unitId || nextCount > 0),
    };
  });

  return nextGroups.filter(group => battleGroupUnitCount(group) > 0);
}

function addUnitToBattleGroups(
  groups: DraftBattleGroup[],
  unitId: string,
  role: BattleFormationRole,
): DraftBattleGroup[] {
  const targetIndex = groups.findIndex(group => group.role === role && battleGroupUnitCount(group) < MAX_BATTLE_FORMATION_SIZE);
  if (targetIndex >= 0) {
    return groups.map((group, index) => {
      if (index !== targetIndex) return group;
      const count = (group.counts[unitId] ?? 0) + 1;
      return {
        ...group,
        counts: { ...group.counts, [unitId]: count },
        order: group.order.includes(unitId) ? group.order : [...group.order, unitId],
      };
    });
  }

  return [
    ...groups,
    {
      id: createBattleGroupId(),
      role,
      counts: { [unitId]: 1 },
      order: [unitId],
    },
  ];
}

function TemplateListItem({
  template,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  deletePending,
  duplicateDisabled,
  deleteDisabled,
}: {
  template: FormationTemplateEntry;
  selected: boolean;
  onSelect: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  deletePending: boolean;
  duplicateDisabled: boolean;
  deleteDisabled: boolean;
}) {
  const iconProfile = getFormationTemplateIcon(template.type, template.units, template.iconId);
  const duplicateTitle = webUIText('Auto.Prop.componentssidebarsFormationTemplateSidebar.1060.1');
  const deleteTitle = deletePending
    ? webUIText('FormationTemplate.ConfirmDeleteButton')
    : webUIText('FormationTemplate.DeleteButton');

  return (
    <div className={`chart-template-list-item${selected ? ' chart-template-list-item--selected' : ''}`}>
      <button
        type="button"
        className="chart-template-list-select"
        onMouseDown={() => onSelect(template.id)}
      >
        <img src={iconProfile.icon} alt="" className="chart-template-list-icon" draggable={false} />
        <span className="chart-template-list-copy">
          <span className="chart-template-list-name">{template.name}</span>
          <span className="chart-template-list-summary">{templateUnitSummary(template)}</span>
        </span>
      </button>
      <Tooltip
        content={{
          title: duplicateTitle,
          body: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1060.8'),
        }}
        position="right"
      >
        <button
          type="button"
          className="chart-template-list-duplicate"
          aria-label={duplicateTitle}
          disabled={duplicateDisabled}
          onMouseDown={event => {
            event.stopPropagation();
            onDuplicate(template.id);
          }}
        >
          <img src={DUPLICATE_ICON} alt="" className="chart-template-list-duplicate-icon" draggable={false} />
        </button>
      </Tooltip>
      <Tooltip
        content={{
          title: deleteTitle,
          body: deletePending ? webUIText('FormationTemplate.DeleteConfirmMessage') : template.name,
        }}
        position="right"
      >
        <button
          type="button"
          className={`chart-template-list-delete${deletePending ? ' chart-template-list-delete--confirm' : ''}`}
          aria-label={deleteTitle}
          disabled={!template.canDelete || deleteDisabled}
          onMouseDown={event => event.stopPropagation()}
          onClick={event => {
            event.stopPropagation();
            onDelete(template.id);
          }}
        >
          <img src={DELETE_ICON} alt="" className="chart-template-list-delete-icon" draggable={false} />
        </button>
      </Tooltip>
    </div>
  );
}

function availableSettlementNames(unit: FormationTemplateUnitEntry): string[] {
  return availableSettlementEntries(unit)
    .map(settlement => settlement.name);
}

function availableSettlementEntries(unit: FormationTemplateUnitEntry): { id: string; name: string }[] {
  return unit.availableSettlements
    .filter(settlement => settlement.available)
    .map(settlement => ({ id: settlement.id, name: settlement.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function catalogueFilterOptions(
  units: FormationTemplateUnitEntry[],
  allLabel: string,
  getValue: (unit: FormationTemplateUnitEntry) => string,
  getLabel: (unit: FormationTemplateUnitEntry, value: string) => string,
  getIcon?: (unit: FormationTemplateUnitEntry) => string,
  getSwatch?: (unit: FormationTemplateUnitEntry) => string,
): DropdownSelectOption[] {
  const values = new Map<string, DropdownSelectOption>();
  units.forEach(unit => {
    const value = getValue(unit).trim();
    if (!value || values.has(value)) return;
    const icon = getIcon?.(unit);
    const swatch = getSwatch?.(unit);
    values.set(value, {
      value,
      label: getLabel(unit, value),
      icon: icon && icon.length > 0 ? icon : undefined,
      swatch: swatch && swatch.length > 0 ? swatch : undefined,
    });
  });

  const options = Array.from(values.values())
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
  return [{ value: CATALOGUE_ALL_FILTER, label: allLabel }, ...options];
}

function CatalogueFilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: UnitCatalogueFilterKey;
  label: string;
  value: string;
  options: DropdownSelectOption[];
  onChange: (value: string) => void;
}) {
  const safeValue = options.some(option => option.value === value) ? value : CATALOGUE_ALL_FILTER;
  return (
    <DropdownSelect
      className="chart-unit-picker-filter"
      id={`chart-unit-picker-${id}`}
      label={label}
      value={safeValue}
      options={options}
      escapeId={`formationTemplate.unitCatalogue.filter.${id}`}
      isActive={safeValue !== CATALOGUE_ALL_FILTER}
      onChange={onChange}
    />
  );
}

function TemplateUnitSelectorModal({
  units,
  currentCounts,
  onAdd,
  onClose,
}: {
  units: FormationTemplateUnitEntry[];
  currentCounts: Record<string, number>;
  onAdd: (unitId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(CATALOGUE_ALL_FILTER);
  const [cultureFilter, setCultureFilter] = useState(CATALOGUE_ALL_FILTER);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | undefined>(undefined);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, 160);
  };

  useEffect(() => () => {
    if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current);
  }, []);

  useEscapeStackEntry({
    id: 'modal.template-unit-selector',
    active: true,
    onClose: requestClose,
    allowFromInput: true,
  });

  useEffect(() => {
    const engine = getRuntimeEngine();
    if (engine) {
      void Promise.resolve(engine.call('StrategySetWebUIMouseState', true, 'default'))
        .catch(error => acknowledgeBridgeFailure(error, 'StrategySetWebUIMouseState'));
    }

    return () => {
      const currentEngine = getRuntimeEngine();
      if (currentEngine) {
        void Promise.resolve(currentEngine.call('StrategySetWebUIMouseState', false, 'default'))
          .catch(error => acknowledgeBridgeFailure(error, 'StrategySetWebUIMouseState'));
      }
    };
  }, []);

  const typeOptions = useMemo(() => catalogueFilterOptions(
    units,
    webUIText('Common.All'),
    unit => unit.type || unit.category,
    unit => templateUnitTypeLabel(unit),
    unit => templateUnitTypeIcon(unit),
  ), [units]);
  const cultureOptions = useMemo(() => catalogueFilterOptions(
    units,
    webUIText('Common.All'),
    unit => unit.cultureId || unit.cultureName,
    unit => unit.cultureName,
    undefined,
    unit => unit.cultureColour,
  ), [units]);
  const unitColumns = useMemo<Array<DataTableColumn<FormationTemplateUnitEntry, UnitCatalogueColumnKey>>>(() => [
    {
      id: 'unit',
      label: webUIText('Common.Unit'),
      width: '31%',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--unit',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--unit',
      render: unit => {
        const count = currentCounts[unit.id] ?? 0;
        return (
          <Tooltip
            position="left"
            delay={200}
            content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }}
          >
            <div
              className={`chart-unit-picker-unit${count > 0 ? ' chart-unit-picker-unit--selected' : ''}`}
              data-tutorial-target="DynamicUnit"
              data-tutorial-unit-id={unit.id}
              data-tutorial-unit-count={count}
            >
              <span className="chart-unit-picker-unit-portrait-frame">
                <img src={templateUnitPortrait(unit)} alt="" className="chart-unit-picker-unit-portrait" draggable={false} />
              </span>
              <span className="chart-unit-picker-unit-copy">
                <strong>{unit.name}</strong>
              </span>
              <span className="chart-unit-picker-unit-count">{formatNumber(count)}</span>
            </div>
          </Tooltip>
        );
      },
      sortValue: unit => unit.name,
      searchValue: unit => `${unit.name} ${templateUnitTypeLabel(unit)} ${unit.description}`,
    },
    {
      id: 'type',
      label: webUIText('Economy.Type'),
      width: '13%',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--type',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--type',
      render: unit => (
        <span className="chart-unit-picker-type">
          <img src={templateUnitTypeIcon(unit)} alt="" className="chart-unit-picker-type-icon" draggable={false} />
          <span>{templateUnitTypeLabel(unit)}</span>
        </span>
      ),
      sortValue: unit => templateUnitTypeLabel(unit),
      searchValue: unit => templateUnitTypeLabel(unit),
    },
    {
      id: 'tier',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={TIER_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsScreensEncyclopediaScreen.863.6')}</span>
        </span>
      ),
      width: '7%',
      align: 'centre',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--tier',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--tier',
      render: unit => romanTier(unit.tier),
      sortValue: unit => unit.tier,
    },
    {
      id: 'strength',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={SWORDS_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.433.5')}</span>
        </span>
      ),
      width: '10%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      render: unit => formatNumber(unit.maxStrength),
      sortValue: unit => unit.maxStrength,
    },
    {
      id: 'cost',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={GOLD_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.442.8')}</span>
        </span>
      ),
      width: '10%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      render: unit => formatNumber(unit.price),
      sortValue: unit => unit.price,
    },
    {
      id: 'upkeep',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={UPKEEP_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.451.11')}</span>
        </span>
      ),
      width: '10%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--number',
      render: unit => formatNumber(unit.upkeep),
      sortValue: unit => unit.upkeep,
    },
    {
      id: 'settlements',
      label: (
        <span className="chart-unit-picker-header-label">
          <img src={SETTLEMENT_ICON} alt="" className="chart-unit-picker-header-icon" draggable={false} />
          <span>{webUIText('PeaceNegotiation.Tooltip.Settlements')}</span>
        </span>
      ),
      width: '12%',
      align: 'right',
      className: 'chart-unit-picker-cell chart-unit-picker-cell--settlements',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--settlements',
      render: unit => {
        const settlementNames = availableSettlementNames(unit);
        const settlementCount = unit.availableSettlementCount || settlementNames.length;
        const settlementTooltipBody = settlementNames.length > 0
          ? settlementNames.join(', ')
          : settlementCount > 0
            ? webUIText('Auto.Fix.Expr.componentssidebarsFormationTemplateSidebar.618.1', { Value1: formatNumber(settlementCount) })
            : webUIText('Common.NoneAvailable');
        return (
          <Tooltip
            inline
            position="left"
            content={{
              title: webUIText('PeaceNegotiation.Tooltip.Settlements'),
              body: settlementTooltipBody,
            }}
          >
            <span className="chart-unit-picker-settlement-count">{formatNumber(settlementCount)}</span>
          </Tooltip>
        );
      },
      sortValue: unit => unit.availableSettlementCount || availableSettlementNames(unit).length,
    },
    {
      id: 'add',
      label: '',
      width: '7%',
      align: 'centre',
      sortable: false,
      className: 'chart-unit-picker-cell chart-unit-picker-cell--add',
      headerClassName: 'chart-unit-picker-cell chart-unit-picker-cell--add',
      render: unit => (
        <Tooltip
          inline
          position="left"
          content={{ title: unit.name, body: webUIText('Auto.ComponentsSidebarsFormationTemplateSidebar.616.2') }}
        >
          <button
            type="button"
            className="chart-unit-picker-add"
            onMouseDown={event => event.stopPropagation()}
            onClick={() => onAdd(unit.id)}
            aria-label={webUIText('Auto.ComponentsSidebarsFormationTemplateSidebar.616.2')}
          >
            <img src="/assets/icons/I_Plus.png" alt="" className="chart-unit-picker-add-icon" draggable={false} />
          </button>
        </Tooltip>
      ),
    },
  ], [currentCounts, onAdd]);
  const filterUnit = (unit: FormationTemplateUnitEntry) => {
    const unitType = unit.type || unit.category;
    const unitCulture = unit.cultureId || unit.cultureName;
    return (typeFilter === CATALOGUE_ALL_FILTER || typeFilter === unitType)
      && (cultureFilter === CATALOGUE_ALL_FILTER || cultureFilter === unitCulture);
  };

  return createPortal(
    <div className={`chart-unit-picker${closing ? ' chart-unit-picker--closing' : ''}`} onMouseDown={requestClose}>
      <div className={`chart-unit-picker-dialog${closing ? ' chart-unit-picker-dialog--closing' : ''}`} onMouseDown={event => event.stopPropagation()}>
        <div className="chart-unit-picker-head">
          <div className="chart-unit-picker-title-block">
            <span className="chart-unit-picker-title"><WebUIText textKey="FormationTemplate.UnitCatalogue" /></span>
          </div>
          <CloseButton size="sm" onClick={requestClose} />
        </div>
        <div className="chart-unit-picker-body">
          <DataTable
            rows={units}
            columns={unitColumns}
            rowKey={unit => unit.id}
            onRowClick={unit => onAdd(unit.id)}
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.627.29')}
            toolsExtra={(
              <div className="chart-unit-picker-filters">
                <CatalogueFilterSelect
                  id="type"
                  label={webUIText('Economy.Type')}
                  value={typeFilter}
                  options={typeOptions}
                  onChange={setTypeFilter}
                />
                <CatalogueFilterSelect
                  id="culture"
                  label={webUIText('MainMenu.Culture')}
                  value={cultureFilter}
                  options={cultureOptions}
                  onChange={setCultureFilter}
                />
              </div>
            )}
            filterPredicate={filterUnit}
            defaultSortKey="tier"
            defaultSortDirection="asc"
            emptyLabel={<WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.632.3" />}
            className="chart-unit-picker-table-block"
            toolsClassName="chart-unit-picker-table-tools"
            searchWrapClassName="chart-unit-picker-search-wrap"
            searchClassName="chart-unit-picker-search"
            wrapperClassName="chart-unit-picker-table-wrapper"
            tableClassName="chart-unit-picker-table"
            headerRowClassName="chart-unit-picker-table-head"
            bodyClassName="chart-unit-picker-table-body"
            bodyScrollFrameClassName="chart-unit-picker-table-scroll"
            rowClassName="chart-unit-picker-table-row"
            bodyCellClassName="chart-unit-picker-table-cell"
            headerContentClassName="chart-unit-picker-header-content"
            virtualRowHeightRem={4.15}
            emptyClassName="chart-unit-picker-empty"
            styledScrollbar
          />
        </div>
        <div className="chart-unit-picker-foot">
          <GameButton variant="burgundy" className="chart-unit-picker-done" onClick={requestClose}>
            <WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.667.4" />
          </GameButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TemplateBattlePlanner({
  draft,
  unitById,
  editable,
  onAddBattleGroup,
  onRemoveBattleGroup,
  onSetBattleGroupUnitCount,
}: {
  draft: TemplateDraft;
  unitById: Map<string, FormationTemplateUnitEntry>;
  editable: boolean;
  onAddBattleGroup: (role: BattleFormationRole) => void;
  onRemoveBattleGroup: (groupId: string) => void;
  onSetBattleGroupUnitCount: (groupId: string, unitId: string, count: number) => void;
}) {
  const unassignedUnits = draftCompositionRequests(draft)
    .map(request => ({ unit: unitById.get(request.unitId), count: unassignedUnitCount(draft, request.unitId) }))
    .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);
  const hasUnassignedMelee = unassignedUnits.some(entry => battleRoleForUnit(entry.unit) === 'melee');
  const hasUnassignedRanged = unassignedUnits.some(entry => battleRoleForUnit(entry.unit) === 'ranged');

  return (
    <div className="chart-template-battle-editor">
      <div className="chart-template-battle-toolbar">
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewMeleeGroup')}>
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            onMouseDown={() => onAddBattleGroup('melee')}
            disabled={!editable || !hasUnassignedMelee}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewMeleeGroup')}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src={SWORDS_ICON} alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewRangedGroup')}>
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            onMouseDown={() => onAddBattleGroup('ranged')}
            disabled={!editable || !hasUnassignedRanged}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewRangedGroup')}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src="/assets/icons/UnitTypes/Ranged.png" alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
      </div>

      <div className="chart-template-battle-groups">
        {draft.battleGroups.length === 0 ? (
          <div className="chart-template-empty-inline"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroups" /></div>
        ) : draft.battleGroups.map((group, index) => {
          const groupCount = battleGroupUnitCount(group);
          const roleIcon = group.role === 'ranged' ? '/assets/icons/UnitTypes/Ranged.png' : SWORDS_ICON;
          const roleTitle = group.role === 'ranged'
            ? webUIText('FormationTemplate.BattlePlan.RangedTitle')
            : webUIText('FormationTemplate.BattlePlan.MeleeTitle');
          const compatibleMovable = draftCompositionRequests(draft)
            .map(request => {
              const unit = unitById.get(request.unitId);
              if (!unit || battleRoleForUnit(unit) !== group.role) return null;
              const inGroup = group.counts[unit.id] ?? 0;
              const outsideGroup = Math.max(0, request.count - inGroup);
              return outsideGroup > 0 ? { unit, count: outsideGroup } : null;
            })
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry));
          const groupUnits = orderedBattleGroupUnitIds(group)
            .map(unitId => ({ unit: unitById.get(unitId), count: group.counts[unitId] ?? 0 }))
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);

          return (
            <div key={group.id} className="chart-template-battle-group">
              <div className="chart-template-battle-group-head">
                <img src={roleIcon} alt="" className="chart-template-battle-group-icon" draggable={false} />
                <span className="chart-template-battle-group-title">
                  {webUIText('FormationTemplate.BattlePlan.GroupTitle', { Role: roleTitle, Index: formatNumber(index + 1) })}
                </span>
                <span className={`chart-template-battle-group-count${groupCount > MAX_BATTLE_FORMATION_SIZE ? ' chart-template-battle-group-count--bad' : ''}`}>
                  {formatNumber(groupCount)} / {formatNumber(MAX_BATTLE_FORMATION_SIZE)}
                </span>
                <button
                  type="button"
                  className="chart-template-battle-remove"
                  onMouseDown={() => onRemoveBattleGroup(group.id)}
                  disabled={!editable}
                  aria-label={webUIText('FormationTemplate.BattlePlan.RemoveGroup')}
                >
                  <img src={DELETE_ICON} alt="" className="chart-template-battle-remove-icon" draggable={false} />
                </button>
              </div>

              <div className="chart-template-battle-group-units">
                {groupUnits.length === 0 ? (
                  <div className="chart-template-empty-inline"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroup" /></div>
                ) : groupUnits.map(({ unit, count }) => {
                  const availableOutsideGroup = Math.max(0, (draft.counts[unit.id] ?? 0) - count);
                  const groupRoom = MAX_BATTLE_FORMATION_SIZE - groupCount;
                  const canIncrement = editable && availableOutsideGroup > 0 && groupRoom > 0;

                  return (
                    <div key={unit.id} className="chart-template-battle-unit">
                      <Tooltip content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }} position="left" delay={200}>
                        <img src={templateUnitPortrait(unit)} alt="" className="chart-template-battle-unit-icon" draggable={false} />
                      </Tooltip>
                      <span className="chart-template-battle-unit-name">{unit.name}</span>
                      <span className="chart-template-unit-stepper">
                        <button
                          type="button"
                          className="chart-template-stepper-button"
                          onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, count - 1)}
                          disabled={!editable}
                        >
                          <img src="/assets/icons/I_Minus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                        <span className="chart-template-unit-count">{formatNumber(count)}</span>
                        <button
                          type="button"
                          className="chart-template-stepper-button"
                          onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, count + 1)}
                          disabled={!canIncrement}
                        >
                          <img src="/assets/icons/I_Plus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>

              {compatibleMovable.length > 0 && groupCount < MAX_BATTLE_FORMATION_SIZE && (
                <div className="chart-template-battle-add-list">
                  {compatibleMovable.map(({ unit, count }) => (
                    <Tooltip
                      key={unit.id}
                      inline
                      content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }}
                      position="left"
                      delay={200}
                    >
                      <button
                        type="button"
                        className="chart-template-battle-add-unit"
                        onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, (group.counts[unit.id] ?? 0) + 1)}
                        disabled={!editable}
                      >
                        <img src={ADD_ICON} alt="" className="chart-template-battle-add-unit-plus" draggable={false} />
                        <img src={templateUnitPortrait(unit)} alt="" className="chart-template-battle-add-unit-icon" draggable={false} />
                        <span>{unit.name}</span>
                        <strong>{formatNumber(count)}</strong>
                      </button>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unassignedUnits.length > 0 && (
        <div className="chart-template-battle-unassigned">
          <span className="chart-template-battle-unassigned-title"><WebUIText textKey="FormationTemplate.BattlePlan.Unassigned" /></span>
          {unassignedUnits.map(({ unit, count }) => (
            <span key={unit.id} className="chart-template-battle-unassigned-item">
              {unit.name} {formatNumber(count)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateAssignedForces({
  forces,
  onOpenForce,
}: {
  forces: FormationTemplateAssignedForce[];
  onOpenForce: (forceId: string) => void;
}) {
  if (forces.length === 0) {
    return <div className="chart-template-empty-inline"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.679.5" /></div>;
  }

  return (
    <div className="chart-template-force-list">
      {forces.map(force => {
        const role = force.commanderName
          || force.rank
          || (force.isNavy
            ? webUIText('Auto.Fix.ExprFallbackTrue.componentssidebarsFormationTemplateSidebar.685.1')
            : webUIText('Auto.Fix.ExprFallbackFalse.componentssidebarsFormationTemplateSidebar.685.1'));
        return (
          <button
            key={force.id}
            type="button"
            className="chart-template-force-row"
            onMouseDown={() => onOpenForce(force.id)}
          >
            <span className="chart-template-force-primary">
              <span className="chart-template-force-name">{force.name}</span>
              <span className="chart-template-force-strength">{formatNumber(force.strength)}/{formatNumber(force.maxStrength)}</span>
            </span>
            <span className="chart-template-force-secondary">
              <span>{role}</span>
              <span>{force.location || force.rank}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TemplateEditor({
  template,
  type,
  unitCatalogue,
  assignmentTarget,
  onRaiseTemplate,
  onAssignTemplate,
  onSaved,
  onMessage,
}: {
  template: FormationTemplateEntry | null;
  type: TemplateCreateType;
  unitCatalogue: FormationTemplateUnitEntry[];
  assignmentTarget?: Army | null;
  onRaiseTemplate: (id: string) => void;
  onAssignTemplate?: (id: string) => void;
  onSaved: (templateId: string) => void;
  onMessage: (message: string) => void;
}) {
  const [draft, setDraft] = useState(() => buildTemplateDraft(template, type));
  const [baseline, setBaseline] = useState(() => buildTemplateDraft(template, type));
  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateEditorTab>('units');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [actionActive, setActionActive] = useState(false);
  const [renamingTitle, setRenamingTitle] = useState(!template);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const gameActions = useGameActions();
  const unitById = useMemo(() => {
    const map = new Map<string, FormationTemplateUnitEntry>();
    unitCatalogue.forEach(unit => map.set(unit.id, unit));
    template?.units.forEach(unit => {
      const catalogueUnit = map.get(unit.id);
      map.set(unit.id, catalogueUnit ? { ...catalogueUnit, count: unit.count, includesCore: unit.includesCore } : unit);
    });
    return map;
  }, [template, unitCatalogue]);
  const draftUnits = useMemo(() => (
    orderedDraftUnitIds(draft)
      .map(unitId => ({ unit: unitById.get(unitId), count: draft.counts[unitId] ?? 0 }))
      .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0)
  ), [draft, unitById]);
  const totals = useMemo(() => draftTotals(draft, unitById), [draft, unitById]);
  const iconProfile = getFormationTemplateIcon(
    draft.type,
    draftUnits.map(({ unit, count }) => ({ ...unit, count })),
    draft.iconId,
  );
  const unitCount = draftUnitCount(draft);
  const dirty = !templateDraftsEqual(draft, baseline);
  const editable = !template || template.canEdit;
  const hasName = draft.name.trim().length > 0;
  const hasValidBattleGroups = battleGroupsValid(draft, unitById);
  const canSave = editable && dirty && hasName && unitCount > 0 && hasValidBattleGroups && !actionActive;
  const canRaise = !!template && template.canApply && !dirty && !actionActive;
  const canAssign = !!assignmentTarget
    && !!template
    && !dirty
    && normaliseTemplateType(template.type) === (assignmentTarget.isNavy ? 'naval' : 'land')
    && !actionActive;
  const createTitle = draft.type === 'naval'
    ? webUIText('MilitaryScreen.NewFleetTemplate')
    : webUIText('MilitaryScreen.NewArmyTemplate');
  const raiseTooltip = template?.applyReason || webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1058.6');
  const raiseCost = template?.creationCost ?? totals.cost;
  const beginRename = () => {
    if (!editable) return;
    setRenamingTitle(true);
    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const withUnitCount = (current: TemplateDraft, unitId: string, count: number): TemplateDraft => {
    const unit = unitById.get(unitId);
    if (!unit) return current;

    const previousCount = current.counts[unitId] ?? 0;
    const nextCount = Math.max(0, count);
    const counts = { ...current.counts };
    if (nextCount > 0) counts[unitId] = nextCount;
    else delete counts[unitId];
    const order = nextCount > 0 && !current.order.includes(unitId)
      ? [...current.order, unitId]
      : current.order.filter(id => id !== unitId || nextCount > 0);

    let battleGroups = current.battleGroups;
    if (nextCount > previousCount) {
      for (let index = 0; index < nextCount - previousCount; index += 1) {
        battleGroups = addUnitToBattleGroups(battleGroups, unitId, battleRoleForUnit(unit));
      }
    } else if (nextCount < previousCount) {
      battleGroups = removeUnitsFromBattleGroups(battleGroups, unitId, previousCount - nextCount);
    }

    return { ...current, counts, order, battleGroups };
  };

  const adjustUnitCount = (unitId: string, delta: number) => {
    if (!editable) return;
    setDraft(current => withUnitCount(current, unitId, (current.counts[unitId] ?? 0) + delta));
  };

  const addBattleGroup = (role: BattleFormationRole) => {
    if (!editable) return;
    setDraft(current => {
      const candidate = draftCompositionRequests(current)
        .map(request => ({ unit: unitById.get(request.unitId), count: unassignedUnitCount(current, request.unitId) }))
        .find((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => (
          Boolean(entry.unit) && entry.count > 0 && battleRoleForUnit(entry.unit) === role
        ));
      if (!candidate) return current;

      return {
        ...current,
        battleGroups: [
          ...current.battleGroups,
          {
            id: createBattleGroupId(),
            role,
            counts: { [candidate.unit.id]: 1 },
            order: [candidate.unit.id],
          },
        ],
      };
    });
  };

  const removeBattleGroup = (groupId: string) => {
    if (!editable) return;
    setDraft(current => ({
      ...current,
      battleGroups: current.battleGroups.filter(group => group.id !== groupId),
    }));
  };

  const setBattleGroupUnitCount = (groupId: string, unitId: string, count: number) => {
    if (!editable) return;
    const unit = unitById.get(unitId);
    if (!unit) return;

    setDraft(current => {
      const role = battleRoleForUnit(unit);
      const targetIndex = current.battleGroups.findIndex(group => group.id === groupId && group.role === role);
      if (targetIndex < 0) return current;

      const battleGroups = current.battleGroups.map(group => ({
        ...group,
        counts: { ...group.counts },
        order: [...group.order],
      }));
      const targetGroup = battleGroups[targetIndex];
      const currentCount = targetGroup.counts[unitId] ?? 0;
      const desiredCount = Math.max(0, count);
      const groupRoom = MAX_BATTLE_FORMATION_SIZE - battleGroupUnitCount(targetGroup);
      const totalUnitCount = current.counts[unitId] ?? 0;
      let nextCount = desiredCount;

      if (desiredCount > currentCount) {
        const assignedElsewhere = groupAssignedCountExcluding(current, unitId, groupId);
        const unassigned = Math.max(0, totalUnitCount - assignedElsewhere - currentCount);
        const increase = Math.min(desiredCount - currentCount, groupRoom, totalUnitCount - currentCount);
        let transferNeeded = Math.max(0, increase - unassigned);

        for (let index = 0; index < battleGroups.length && transferNeeded > 0; index += 1) {
          if (index === targetIndex) continue;
          const sourceGroup = battleGroups[index];
          if (sourceGroup.role !== role) continue;

          const sourceCount = sourceGroup.counts[unitId] ?? 0;
          const moved = Math.min(sourceCount, transferNeeded);
          if (moved <= 0) continue;

          const remaining = sourceCount - moved;
          if (remaining > 0) sourceGroup.counts[unitId] = remaining;
          else {
            delete sourceGroup.counts[unitId];
            sourceGroup.order = sourceGroup.order.filter(id => id !== unitId);
          }
          transferNeeded -= moved;
        }

        nextCount = currentCount + increase;
      } else {
        nextCount = desiredCount;
      }

      if (nextCount > 0) targetGroup.counts[unitId] = nextCount;
      else delete targetGroup.counts[unitId];
      targetGroup.order = nextCount > 0 && !targetGroup.order.includes(unitId)
        ? [...targetGroup.order, unitId]
        : targetGroup.order.filter(id => id !== unitId || nextCount > 0);

      return { ...current, battleGroups: battleGroups.filter(group => battleGroupUnitCount(group) > 0) };
    });
  };

  const saveDraft = (draftToSave: TemplateDraft) => {
    const name = draftToSave.name.trim();
    if (!name || draftUnitCount(draftToSave) <= 0 || !battleGroupsValid(draftToSave, unitById)) return;

    const resolvedIconId = draftToSave.iconId || getFormationTemplateIcon(
      draftToSave.type,
      draftCompositionRequests(draftToSave)
        .map(unit => {
          const catalogueUnit = unitById.get(unit.unitId);
          return catalogueUnit ? { ...catalogueUnit, count: unit.count } : null;
        })
        .filter((unit): unit is FormationTemplateUnitEntry & { count: number } => Boolean(unit)),
    ).kind;

    setActionActive(true);
    onMessage('');
    void saveFormationTemplateBridge({
      templateId: draftToSave.templateId,
      name,
      iconId: resolvedIconId,
      type: draftToSave.type,
      units: draftCompositionRequests(draftToSave),
      battleGroups: draftBattleGroupRequests(draftToSave),
    })
      .then(response => {
        if (!response.saved) {
          onMessage(response.message);
          return;
        }

        const savedDraft: TemplateDraft = {
          ...draftToSave,
          templateId: response.templateId,
          name,
          iconId: resolvedIconId,
          counts: { ...draftToSave.counts },
          order: [...draftToSave.order],
          battleGroups: draftToSave.battleGroups.map(group => ({
            ...group,
            counts: { ...group.counts },
            order: [...group.order],
          })),
        };
        setDraft(savedDraft);
        setBaseline(savedDraft);
        onSaved(response.templateId);
      })
      .catch(acknowledgeBridgeFailure)
      .finally(() => setActionActive(false));
  };

  useEscapeStackEntry({
    id: 'formation-template-icon-picker',
    active: iconPickerOpen,
    onClose: () => setIconPickerOpen(false),
    allowFromInput: true,
  });

  return (
    <section className="chart-template-workbench" onMouseDown={() => {
      if (iconPickerOpen) setIconPickerOpen(false);
    }}>
      <div className="chart-template-workbench-body">
        <div className="chart-template-composer">
          <div className="chart-template-composer-head">
            <div className="chart-template-composer-title">
              <div className="chart-template-icon-popout">
                <button
                  type="button"
                  className="chart-template-composer-icon-button"
                  aria-label={webUIText('FormationTemplate.IconChoice')}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!editable) return;
                    setIconPickerOpen(open => !open);
                  }}
                  disabled={!editable}
                >
                  <img src={iconProfile.icon} alt="" className="chart-template-composer-icon" draggable={false} />
                </button>
                {iconPickerOpen && (
                  <div className="chart-template-icon-popover" onMouseDown={event => event.stopPropagation()}>
                    {FORMATION_TEMPLATE_ICON_OPTIONS.map(option => (
                      <button
                        key={option.kind}
                        type="button"
                        className={`chart-template-icon-choice${iconProfile.kind === option.kind ? ' chart-template-icon-choice--selected' : ''}`}
                        aria-label={webUIText(option.labelKey)}
                        onMouseDown={() => {
                          setDraft(current => ({ ...current, iconId: option.kind }));
                          setIconPickerOpen(false);
                        }}
                      >
                        <img src={option.icon} alt="" draggable={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {renamingTitle ? (
                <input
                  ref={titleInputRef}
                  className="chart-template-title-input"
                  value={draft.name}
                  onChange={event => {
                    setDraft(current => ({ ...current, name: event.target.value }));
                  }}
                  onBlur={() => {
                    if (draft.name.trim().length > 0 && template) setRenamingTitle(false);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && draft.name.trim().length > 0 && template) {
                      setRenamingTitle(false);
                    }
                  }}
                  placeholder={createTitle}
                  aria-label={webUIText('Common.Name')}
                  disabled={!editable}
                />
              ) : (
                <button
                  type="button"
                  className="chart-template-title-label"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    beginRename();
                  }}
                  disabled={!editable}
                >
                  {draft.name || createTitle}
                </button>
              )}
              <button
                type="button"
                className="chart-template-rename-button"
                aria-label={webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.585.12')}
                onMouseDown={(event) => {
                  event.preventDefault();
                  beginRename();
                }}
                disabled={!editable}
              >
                <img src={RENAME_ICON} alt="" className="chart-template-rename-icon" draggable={false} />
              </button>
            </div>
            <GameButton
              variant="burgundy"
              icon={ADD_ICON}
              className="chart-template-pick-units"
              ariaLabel={webUIText('Auto.ComponentsSidebarsFormationTemplateSidebar.616.2')}
              disabled={!editable}
              onClick={() => {
                if (editable) {
                  setIconPickerOpen(false);
                  setCatalogueOpen(true);
                }
              }}
            />
          </div>

          <div className="chart-template-editor-tabs">
            <SidebarTabBar
              tabs={[
                { id: 'units', label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1116.33') },
                { id: 'battle', label: webUIText('FormationTemplate.BattlePlan.Title') },
              ]}
              activeTab={activeTemplateTab}
              onTabChange={id => setActiveTemplateTab(id as TemplateEditorTab)}
            />
          </div>

          {activeTemplateTab === 'units' ? (
            <div className="chart-template-unit-table">
              <div className="chart-template-unit-table-head">
                <span><WebUIText textKey="FormationTemplate.UnitColumn" /></span>
                <span><img src={TIER_ICON} alt="" className="chart-template-table-heading-icon" draggable={false} /></span>
                <span><img src={SWORDS_ICON} alt="" className="chart-template-table-heading-icon" draggable={false} /></span>
                <span><WebUIText textKey="FormationTemplate.CountColumn" /></span>
              </div>
              {draftUnits.length === 0 ? (
                <div className="chart-template-unit-table-empty">
                  <img src={TEMPLATE_ICON} alt="" className="chart-template-unit-table-empty-icon" draggable={false} />
                  <span>{webUIText('Military.NoUnitsAssigned')}</span>
                </div>
              ) : draftUnits.map(({ unit, count }) => (
                <Tooltip
                  key={unit.id}
                  content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }}
                  position="left"
                  delay={200}
                  wrapperClassName="chart-template-unit-row-tooltip"
                >
                  <div className="chart-template-unit-table-row">
                    <span className="chart-template-unit-cell chart-template-unit-cell--unit">
                      <img src={templateUnitPortrait(unit)} alt="" className="chart-template-unit-portrait" draggable={false} />
                      <span className="chart-template-unit-copy">
                        <span className="chart-template-unit-name">{unit.name}</span>
                        <span className="chart-template-unit-quick-stats">
                          <span><img src={SWORDS_ICON} alt="" className="chart-template-unit-stat-icon" draggable={false} />{formatNumber(unit.maxStrength)}</span>
                          <span><img src="/assets/icons/I_Damage_Slash.png" alt="" className="chart-template-unit-stat-icon" draggable={false} />{formatNumber(templateUnitAttack(unit))}</span>
                          <span><img src="/assets/icons/I_Armour_Slash.png" alt="" className="chart-template-unit-stat-icon" draggable={false} />{formatNumber(templateUnitDefence(unit))}</span>
                        </span>
                      </span>
                    </span>
                    <span className="chart-template-unit-cell chart-template-unit-cell--tier">
                      <span className="chart-template-tier-diamond">{romanTier(unit.tier)}</span>
                    </span>
                    <span className="chart-template-unit-cell chart-template-unit-cell--role">
                      <img src={templateUnitTypeIcon(unit)} alt="" className="chart-template-unit-type-icon" draggable={false} />
                      {templateUnitTypeLabel(unit)}
                    </span>
                    <span className="chart-template-unit-cell chart-template-unit-cell--count">
                      <span className="chart-template-unit-stepper">
                        <button
                          type="button"
                          className="chart-template-stepper-button"
                          aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25')}
                          onMouseDown={() => adjustUnitCount(unit.id, -1)}
                          disabled={!editable}
                        >
                          <img src="/assets/icons/I_Minus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                        <span className="chart-template-unit-count">{formatNumber(count)}</span>
                        <button
                          type="button"
                          className="chart-template-stepper-button"
                          aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.556.26')}
                          onMouseDown={() => adjustUnitCount(unit.id, 1)}
                          disabled={!editable}
                        >
                          <img src="/assets/icons/I_Plus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                      </span>
                    </span>
                  </div>
                </Tooltip>
              ))}
            </div>
          ) : (
            <TemplateBattlePlanner
              draft={draft}
              unitById={unitById}
              editable={editable}
              onAddBattleGroup={addBattleGroup}
              onRemoveBattleGroup={removeBattleGroup}
              onSetBattleGroupUnitCount={setBattleGroupUnitCount}
            />
          )}

        </div>

        <aside className="chart-template-side-rail">
          <div className="chart-template-rail-section">
            <h4><WebUIText textKey="FormationTemplate.TemplateTotals" /></h4>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={SWORDS_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.433.5')}</span>
              <strong>{formatNumber(totals.strength)}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={GOLD_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.442.8')}</span>
              <strong>{formatNumber(totals.cost)}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={UPKEEP_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.451.11')}</span>
              <strong className="chart-template-total-good">{webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.452.1", { Value1: formatNumber(totals.upkeep) })}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={TRAINING_ICON} alt="" className="chart-template-total-icon" draggable={false} /><WebUIText textKey="Auto.ComponentsCommonUnitTooltip.340.7" /></span>
              <strong>{webUIText('Common.DayAbbrevValue', { Days: formatNumber(totals.days) })}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={SUPPLY_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.469.1')}</span>
              <strong className="chart-template-total-bad">{webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.452.1", { Value1: formatNumber(totals.food, { maximumFractionDigits: 1 }) })}</strong>
            </div>
            <div className="chart-template-total-row">
              <span className="chart-template-total-label"><img src={SPEED_ICON} alt="" className="chart-template-total-icon" draggable={false} />{webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.460.14')}</span>
              <strong>{formatNumber(totals.speed)}</strong>
            </div>
          </div>

          <div className="chart-template-rail-section chart-template-rail-section--forces">
            <h4><WebUIText textKey="Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.1156.36" /></h4>
            <TemplateAssignedForces
              forces={template?.assignedForces ?? []}
              onOpenForce={(forceId) => gameActions.openSidebar('military', forceId)}
            />
          </div>
        </aside>
      </div>

      <div className="chart-template-action-bar">
        {assignmentTarget && (
          <Tooltip content={{
            title: webUIText('FormationTemplate.AssignButton', { Name: assignmentTarget.name }),
            body: template
              ? webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.4', { Name: assignmentTarget.name })
              : webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.5'),
          }}>
            <GameButton
              variant="burgundy"
              icon={TEMPLATE_ICON}
              className="chart-template-action-button"
              disabled={!canAssign}
              onClick={() => {
                if (template) onAssignTemplate?.(template.id);
              }}
            >
              {webUIText('FormationTemplate.AssignButton', { Name: assignmentTarget.name })}
            </GameButton>
          </Tooltip>
        )}
        <Tooltip content={{ title: webUIText('MilitaryScreen.RaiseTemplate'), body: raiseTooltip }}>
          <GameButton
            variant="burgundy"
            icon={RAISE_ICON}
            className="chart-template-action-button"
            disabled={!canRaise}
            onClick={() => {
              if (template) onRaiseTemplate(template.id);
            }}
          >
            <WebUIText textKey="MilitaryScreen.RaiseTemplate" />
            <span className="chart-template-action-cost">
              <img src={GOLD_ICON} alt="" className="chart-template-action-cost-icon" draggable={false} />
              <span className="chart-template-action-cost-value">{formatNumber(raiseCost)}</span>
            </span>
          </GameButton>
        </Tooltip>
        <GameButton
          variant="burgundy"
          icon={SAVE_ICON}
          className="chart-template-action-button chart-template-action-button--save"
          disabled={!canSave}
          onClick={() => {
            saveDraft(draft);
          }}
        >
          <WebUIText textKey="Auto.Fix.VarExprTrue.componentsscreensSaveGameDialog.71.1" />
        </GameButton>
      </div>

      {catalogueOpen && (
        <TemplateUnitSelectorModal
          units={unitCatalogue}
          currentCounts={draft.counts}
          onAdd={(unitId) => adjustUnitCount(unitId, 1)}
          onClose={() => setCatalogueOpen(false)}
        />
      )}
    </section>
  );
}

function TemplatesPanel({
  templates,
  landUnitCatalogue,
  navalUnitCatalogue,
  initialTemplateId,
  initialCreateType,
  assignmentTargetId,
  onCloseScreen,
}: {
  templates: FormationTemplateEntry[];
  landUnitCatalogue: FormationTemplateUnitEntry[];
  navalUnitCatalogue: FormationTemplateUnitEntry[];
  initialTemplateId: string | null;
  initialCreateType: TemplateCreateType | null;
  assignmentTargetId: string | null;
  onCloseScreen: () => void;
}) {
  const assignmentTarget = useMilitary(assignmentTargetId);
  const assignmentTemplateType: TemplateCreateType | null = assignmentTarget
    ? (assignmentTarget.isNavy ? 'naval' : 'land')
    : null;
  const visibleTemplates = useMemo(() => (
    assignmentTemplateType
      ? templates.filter(template => normaliseTemplateType(template.type) === assignmentTemplateType)
      : templates
  ), [assignmentTemplateType, templates]);
  const [templateMessage, setTemplateMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId);
  const [creatingTemplate, setCreatingTemplate] = useState(initialCreateType !== null);
  const [newTemplateType, setNewTemplateType] = useState<TemplateCreateType>(initialCreateType ?? 'land');
  const [newTemplateVersion, setNewTemplateVersion] = useState(0);
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<string | null>(null);
  const [listActionActive, setListActionActive] = useState(false);

  const selectedTemplate = creatingTemplate
    ? null
    : visibleTemplates.find(template => template.id === selectedTemplateId) ?? visibleTemplates[0] ?? null;
  const createType = assignmentTemplateType ?? newTemplateType;
  const editorType = selectedTemplate ? normaliseTemplateType(selectedTemplate.type) : createType;
  const editorCatalogue = editorType === 'naval' ? navalUnitCatalogue : landUnitCatalogue;
  const createTitle = createType === 'naval'
    ? webUIText('MilitaryScreen.NewFleetTemplate')
    : webUIText('MilitaryScreen.NewArmyTemplate');
  const createBody = createType === 'naval'
    ? webUIText('MilitaryScreen.NewFleetTemplateBody')
    : webUIText('MilitaryScreen.NewArmyTemplateBody');
  const raiseTemplate = (templateId: string) => {
    setTemplateMessage('');
    void applyFormationTemplateBridge(templateId)
      .then(response => {
        if (response.selectionStarted || response.selectionActive) {
          onCloseScreen();
          return;
        }

        setTemplateMessage(response.message);
      })
      .catch(acknowledgeBridgeFailure);
  };
  const assignTemplate = (templateId: string) => {
    if (!assignmentTarget) return;
    const assignedTemplate = visibleTemplates.find(template => template.id === templateId);
    if (!assignedTemplate) return;

    setTemplateMessage('');
    void setMilitaryFormationTemplateBridge(assignmentTarget.id, templateId)
      .then(() => {
        setTemplateMessage(webUIText('FormationTemplate.AssignSuccess', {
          Template: assignedTemplate.name,
          Name: assignmentTarget.name,
        }));
      })
      .catch(error => {
        acknowledgeBridgeFailure(error, 'game.set_military_formation_template');
        setTemplateMessage(webUIText('FormationTemplate.AssignFailed'));
      });
  };
  const createTemplate = () => {
    setNewTemplateType(assignmentTemplateType ?? editorType);
    setSelectedTemplateId(null);
    setCreatingTemplate(true);
    setTemplateMessage('');
    setPendingDeleteTemplateId(null);
    setNewTemplateVersion(version => version + 1);
  };
  const selectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCreatingTemplate(false);
    setTemplateMessage('');
    setPendingDeleteTemplateId(null);
  };
  const deleteTemplateFromList = (templateId: string) => {
    const targetTemplate = visibleTemplates.find(template => template.id === templateId);
    if (!targetTemplate || !targetTemplate.canDelete || listActionActive) return;

    if (pendingDeleteTemplateId !== templateId) {
      setPendingDeleteTemplateId(templateId);
      setTemplateMessage(webUIText('FormationTemplate.DeleteConfirmMessage'));
      return;
    }

    setListActionActive(true);
    setTemplateMessage('');
    void deleteFormationTemplateBridge(templateId)
      .then(response => {
        setTemplateMessage(response.message);
        if (!response.deleted) return;

        const nextTemplate = visibleTemplates.find(template => template.id !== templateId) ?? null;
        if (selectedTemplateId === templateId || !nextTemplate) {
          setSelectedTemplateId(nextTemplate?.id ?? null);
          setCreatingTemplate(nextTemplate === null);
          if (nextTemplate === null) setNewTemplateVersion(version => version + 1);
        }
      })
      .catch(acknowledgeBridgeFailure)
      .finally(() => {
        setPendingDeleteTemplateId(null);
        setListActionActive(false);
      });
  };
  const duplicateTemplateFromList = (templateId: string) => {
    const sourceTemplate = visibleTemplates.find(template => template.id === templateId);
    if (!sourceTemplate || listActionActive || sourceTemplate.units.every(unit => unit.count <= 0)) return;

    setListActionActive(true);
    setTemplateMessage('');
    setPendingDeleteTemplateId(null);
    void saveFormationTemplateBridge({
      templateId: '',
      name: webUIText("Auto.Fix.VarExprTrue.componentssidebarsFormationTemplateSidebar.976.1", { Value1: sourceTemplate.name.trim() }),
      iconId: sourceTemplate.iconId,
      type: normaliseTemplateType(sourceTemplate.type),
      units: sourceTemplate.units
        .filter(unit => unit.count > 0)
        .map(unit => ({ unitId: unit.id, count: unit.count })),
      battleGroups: sourceTemplate.battleGroups
        .map(group => ({
          role: normaliseBattleRole(group.role),
          units: group.units
            .filter(unit => unit.count > 0)
            .map(unit => ({ unitId: unit.unitId, count: unit.count })),
        }))
        .filter(group => group.units.length > 0),
    })
      .then(response => {
        if (!response.saved) {
          setTemplateMessage(response.message);
          return;
        }

        setCreatingTemplate(false);
        setSelectedTemplateId(response.templateId);
      })
      .catch(acknowledgeBridgeFailure)
      .finally(() => setListActionActive(false));
  };
  const editorKey = selectedTemplate
    ? `template-${selectedTemplate.id}`
    : `new-${editorType}-${newTemplateVersion}`;

  return (
    <div className="chart-template-panel">
      {templateMessage && <div className="chart-template-status">{templateMessage}</div>}

      <div className="chart-template-split">
        <div className="chart-template-list-pane">
          <div className="chart-template-list-head">
            <span className="chart-template-list-title"><WebUIText textKey="Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.988.37" /></span>
            <div className="chart-template-list-head-actions">
              <span className="chart-template-list-count">{webUIText('FormationTemplate.TemplateCount', { Count: formatNumber(visibleTemplates.length), Max: formatNumber(TEMPLATE_LIMIT) })}</span>
              <Tooltip content={{ title: createTitle, body: createBody }} wrapperClassName="chart-template-create-wrapper">
                <button
                  type="button"
                  className="chart-template-create"
                  aria-label={createTitle}
                  data-tutorial-target="NewFormationButton"
                  onMouseDown={createTemplate}
                >
                  <span className="chart-template-create-plus" />
                  <span className="chart-template-create-copy">
                    <span className="chart-template-create-title">{createTitle}</span>
                  </span>
                </button>
              </Tooltip>
            </div>
          </div>
          <div className="chart-template-list-scroll">
          {visibleTemplates.length === 0 ? (
            <div className="chart-template-empty"><WebUIText textKey="MilitaryScreen.NoTemplatesForType" /></div>
          ) : visibleTemplates.map(template => (
            <TemplateListItem
              key={template.id}
              template={template}
              selected={!creatingTemplate && template.id === selectedTemplate?.id}
              onSelect={selectTemplate}
              onDuplicate={duplicateTemplateFromList}
              onDelete={deleteTemplateFromList}
              deletePending={pendingDeleteTemplateId === template.id}
              duplicateDisabled={listActionActive || template.units.every(unit => unit.count <= 0)}
              deleteDisabled={listActionActive}
            />
          ))}
          </div>
        </div>
        <TemplateEditor
          key={editorKey}
          template={selectedTemplate}
          type={editorType}
          unitCatalogue={editorCatalogue}
          assignmentTarget={assignmentTarget}
          onRaiseTemplate={raiseTemplate}
          onAssignTemplate={assignTemplate}
          onSaved={(templateId) => {
            setCreatingTemplate(false);
            setSelectedTemplateId(templateId);
          }}
          onMessage={setTemplateMessage}
        />
      </div>
    </div>
  );
}

// ── Empire stats panel ──────────────────────────────────────────────────
function EmpireStats({
  view,
  totalArmyStrength,
  totalArmyMaxStrength,
  totalNavyStrength,
  totalNavyMaxStrength,
  totalShips,
  totalMaxShips,
  commandMaintenance,
  autoAssignCommandsEnabled,
  autoReplenishFormationsEnabled,
}: {
  view: 'land' | 'sea';
  totalArmyStrength: number;
  totalArmyMaxStrength: number;
  totalNavyStrength: number;
  totalNavyMaxStrength: number;
  totalShips: number;
  totalMaxShips: number;
  commandMaintenance: number;
  autoAssignCommandsEnabled: boolean;
  autoReplenishFormationsEnabled: boolean;
}) {
  const isNaval = view === 'sea';
  const strength = isNaval ? totalNavyStrength : totalArmyStrength;
  const maxStrength = isNaval ? totalNavyMaxStrength : totalArmyMaxStrength;
  const reservePct = maxStrength > 0 ? (strength / maxStrength) * 100 : 0;
  const strengthLabel = isNaval ? webUIText("Auto.Fix.VarExprTrue.componentsscreensMilitaryMilitaryScreen.642.1") : webUIText("Auto.Fix.VarExprFalse.componentsscreensMilitaryMilitaryScreen.642.1");
  const strengthTooltip = isNaval ? webUIText("Auto.Fix.VarExprTrue.componentsscreensMilitaryMilitaryScreen.644.1", { Value1: fmt(maxStrength), Value2: formatPercent(reservePct) }) : webUIText("Auto.Fix.VarExprFalse.componentsscreensMilitaryMilitaryScreen.645.1", { Value1: fmt(maxStrength), Value2: formatPercent(reservePct) });

  return (
    <div className="chart-empire-stats">
      <Tooltip content={{
        get title() { return isNaval ? webUIText("Auto.Fix.PropExprTrue.componentsscreensMilitaryMilitaryScreen.650.1") : webUIText("Auto.Fix.PropExprFalse.componentsscreensMilitaryMilitaryScreen.650.1"); },
        body: strengthTooltip,
      }}>
        <div className="chart-empire-stats-main">
          <img className="chart-empire-stats-icon" src={SWORDS_ICON} alt="" draggable={false} />
          <span className="chart-empire-stats-label">{strengthLabel}</span>
          <span className="chart-empire-stats-value">{fmt(strength)}</span>
        </div>
      </Tooltip>

      {isNaval && (
        <Tooltip content={{
          title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.662.26'),
          get body() { return webUIText("Auto.Prop.componentsscreensMilitaryMilitaryScreen.663.1", { Value1: fmt(totalMaxShips) }); },
        }}>
          <div className="chart-empire-stats-main">
            <img className="chart-empire-stats-icon" src={NAVY_BADGE} alt="" draggable={false} />
            <span className="chart-empire-stats-label"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.666.9" /></span>
            <span className="chart-empire-stats-value">{fmt(totalShips)}</span>
          </div>
        </Tooltip>
      )}

      <div className="chart-empire-stats-sep" />

      <div className="chart-empire-stats-mods">
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.676.27'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.676.28') }}>
          <div className="chart-empire-stats-mod">
            <img className="chart-empire-stats-mod-icon" src={SUPPLY_ICON} alt="" draggable={false} />
            <span className="chart-empire-stats-mod-value chart-empire-stats-mod-value--negative">
              -{fmt(commandMaintenance)}
            </span>
            <span className="chart-empire-stats-mod-name"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.681.10" /></span>
          </div>
        </Tooltip>
        <GameCheckButton
          checked={autoAssignCommandsEnabled}
          label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.687.29')}
          className="game-check-button--compact-label"
          onToggle={() => { void setAutoAssignCommandsBridge(!autoAssignCommandsEnabled); }}
          tooltip={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.690.30'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.690.31') }}
        />
        <GameCheckButton
          checked={autoReplenishFormationsEnabled}
          label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.694.32')}
          className="game-check-button--compact-label"
          onToggle={() => { void setAutoReplenishFormationsBridge(!autoReplenishFormationsEnabled); }}
          tooltip={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.697.33'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.697.34') }}
        />
      </div>
    </div>
  );
}

export default function MilitaryScreen({ screenId, onClose }: { screenId: string | null; onClose: () => void }) {
  const { openSidebar } = useGameActions();
  const overview = useMilitaryOverview();
  const court = useCourtPositions(true);
  const playerFactionId = usePlayerFactionId();
  const templateData = useFormationTemplatesBridge();
  const overviewForces = useMemo(
    () => (overview?.forces as Force[] | undefined) ?? [],
    [overview],
  );
  const militaryCourtPositions = useMemo(() => {
    const positions = court?.positions ?? [];
    return ['MagisterMilitum', 'MagisterNauticum']
      .map(key => positions.find(position => position.key === key))
      .filter((position): position is CourtPositionView => !!position);
  }, [court]);
  const templates = useMemo(
    () => templateData?.templates ?? [],
    [templateData],
  );
  const overviewKey = useMemo(
    () => JSON.stringify({
      forces: overviewForces.map((force) => [force.id, force.parentId, force.delegated, force.autoSquashRebels, force.doctrine]),
      control: overviewForces.map((force) => [force.id, force.isPlayerControlled]),
    }),
    [overviewForces],
  );
  const [localView, setLocalView] = useState<{
    baseKey: string;
    forces: Force[];
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [courtPosition, setCourtPosition] = useState<CourtPositionView | null>(null);
  const [showOnly, setShowOnly] = useState<MilitaryScreenTab>(() => initialMilitaryTab(screenId));
  const [highlight, setHighlight] = useState<HighlightKey>(null);
  const initialTemplateId = useMemo(() => templateIdFromScreenId(screenId), [screenId]);
  const initialCreateType = useMemo(() => createTypeFromScreenId(screenId), [screenId]);
  const assignmentTargetId = useMemo(() => assignmentTargetFromScreenId(screenId), [screenId]);
  const allForces = localView?.baseKey === overviewKey ? localView.forces : overviewForces;
  const effectiveSelectedId = selectedId && allForces.some((force) => force.id === selectedId) ? selectedId : null;

  const viewport = useRef<HTMLDivElement | null>(null);
  const chartViewRef = useRef<ZoomPanView>({
    zoom: INITIAL_CHART_ZOOM,
    panX: CANVAS_PAD * designUnitScale(),
    panY: CANVAS_PAD * designUnitScale(),
  });
  const forcesRef = useRef(allForces);
  const nodesRef = useRef<PlacedNode[]>([]);
  useEffect(() => { forcesRef.current = allForces; }, [allForces]);

  const forces = useMemo(
    () => allForces.filter(f => showOnly === 'sea' ? f.isNavy : !f.isNavy),
    [allForces, showOnly],
  );

  const layout = useMemo(() => layoutTree(forces), [forces]);
  const chartInitialView = useMemo(() => buildChartInitialView(), []);
  useEffect(() => { nodesRef.current = layout.nodes; }, [layout.nodes]);


  const highlightIds = useMemo(() => {
    if (!effectiveSelectedId) return null;
    const ids = new Set<string>(subtree(forces, effectiveSelectedId).map(f => f.id));
    let cur = forces.find(f => f.id === effectiveSelectedId);
    while (cur && cur.parentId) {
      ids.add(cur.parentId);
      cur = forces.find(f => f.id === cur!.parentId);
    }
    return ids;
  }, [effectiveSelectedId, forces]);

  // Pointer pipeline
  useEffect(() => {
    if (showOnly === 'templates') return;
    const el = viewport.current;
    if (!el) return;

    type Mode = 'idle' | 'node-pending' | 'node-drag';
    let mode: Mode = 'idle';
    let startX = 0, startY = 0;
    let dragSourceId: string | null = null;
    let dragSourceCanDrag = false;
    let lastHoveredId: string | null = null;
    let ghost: HTMLDivElement | null = null;

    const nodeAt = (clientX: number, clientY: number): string | null => {
      if (!viewport.current) return null;
      const rect = viewport.current.getBoundingClientRect();
      const vx = clientX - rect.left;
      const vy = clientY - rect.top;
      const view = chartViewRef.current;
      const z = view.zoom;
      const unitScale = designUnitScale();
      const wx = (vx - view.panX) / z / unitScale;
      const wy = (vy - view.panY) / z / unitScale;
      const nodes = nodesRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (wx >= n.x && wx < n.x + n.w && wy >= n.y && wy < n.y + n.h) {
          return n.force.id;
        }
      }
      return null;
    };

    const clearHover = () => {
      if (!lastHoveredId) return;
      el.querySelectorAll('.is-drop-target, .is-drop-invalid')
        .forEach(n => n.classList.remove('is-drop-target', 'is-drop-invalid'));
      lastHoveredId = null;
      ghost?.querySelector('.chart-drag-ghost-reason')?.remove();
    };

    const validateDrop = (srcId: string, tgtId: string): { ok: true; reason: string } | { ok: false; reason: string } => {
      const byId = new Map(forcesRef.current.map(f => [f.id, f]));
      const src = byId.get(srcId);
      const tgt = byId.get(tgtId);
      if (!src || !tgt) return { ok: false, reason: 'Unknown target' };
      if (!src.isPlayerControlled) return { ok: false, reason: 'You do not command this military' };
      if (!tgt.isPlayerControlled) return { ok: false, reason: 'You do not command the parent military' };
      if (srcId === tgtId) return { ok: false, reason: 'Cannot report to itself' };

      let cur: Force | undefined = tgt;
      while (cur) {
        if (cur.id === srcId) return { ok: false, reason: 'Cannot report to a subordinate' };
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }

      if (src.parentId === tgtId) return { ok: false, reason: 'Already reports here' };
      if (src.isNavy !== tgt.isNavy) {
        return { ok: false, reason: 'Land and naval commands cannot mix' };
      }

      const srcTier = RANK_META[src.rank].tier;
      const tgtTier = RANK_META[tgt.rank].tier;
      if (srcTier >= tgtTier) {
        return {
          ok: false,
          reason: srcTier === tgtTier
            ? `A ${rankLabel(src)} cannot report to another ${rankLabel(tgt)}`
            : `A ${rankLabel(src)} cannot report to a ${rankLabel(tgt)}`,
        };
      }

      return { ok: true, reason: `Reports to ${tgt.name}` };
    };

    const isValidDrop = (srcId: string, tgtId: string): boolean => validateDrop(srcId, tgtId).ok;

    const setGhostReason = (text: string | null, valid: boolean) => {
      if (!ghost) return;
      let reasonEl = ghost.querySelector<HTMLSpanElement>('.chart-drag-ghost-reason');
      if (!text) { reasonEl?.remove(); return; }
      if (!reasonEl) {
        reasonEl = document.createElement('span');
        reasonEl.className = 'chart-drag-ghost-reason';
        ghost.appendChild(reasonEl);
      }
      reasonEl.textContent = text;
      reasonEl.classList.toggle('is-valid', valid);
      reasonEl.classList.toggle('is-invalid', !valid);
    };

    const updateHover = (clientX: number, clientY: number) => {
      const hoverId = nodeAt(clientX, clientY);
      if (hoverId === lastHoveredId) return;
      clearHover();
      if (!hoverId || !dragSourceId) { setGhostReason(null, false); return; }
      const wrap = el.querySelector(`.chart-node-wrap[data-id="${hoverId}"]`);
      if (!wrap) return;
      const result = validateDrop(dragSourceId, hoverId);
      wrap.classList.add(result.ok ? 'is-drop-target' : 'is-drop-invalid');
      setGhostReason(result.reason, result.ok);
      lastHoveredId = hoverId;
    };

    const createGhost = (srcId: string) => {
      const src = forcesRef.current.find(f => f.id === srcId);
      if (!src) return;
      const subCount = subtree(forcesRef.current, srcId).length - 1;
      ghost = document.createElement('div');
      ghost.className = `chart-drag-ghost${subCount > 0 ? ' is-stacked' : ''}`;
      const tail = subCount > 0
        ? `<span class="chart-drag-ghost-sub">+ ${formatNumber(subCount)} subordinate${subCount === 1 ? '' : 's'}</span>`
        : '';
      ghost.innerHTML =
        `<span class="chart-drag-ghost-rank">${rankLabel(src)}</span>` +
        `<span class="chart-drag-ghost-name">${src.name}</span>` + tail;
      document.body.appendChild(ghost);
      requestAnimationFrame(() => ghost?.classList.add('is-shown'));
    };

    const moveGhost = (clientX: number, clientY: number) => {
      if (!ghost) return;
      ghost.style.transform =
        `translate3d(${toRootRem(clientX + 14)}, ${toRootRem(clientY + 10)}, 0) rotate(-3deg)`;
    };

    const removeGhost = () => { if (ghost) { ghost.remove(); ghost = null; } };

    const markSource = (id: string | null) => {
      el.querySelectorAll('.is-drag-source, .is-drag-subtree')
        .forEach(n => n.classList.remove('is-drag-source', 'is-drag-subtree'));
      if (!id) return;
      const sub = subtree(forcesRef.current, id);
      el.querySelector(`.chart-node-wrap[data-id="${id}"]`)?.classList.add('is-drag-source');
      for (const f of sub) {
        if (f.id === id) continue;
        el.querySelector(`.chart-node-wrap[data-id="${f.id}"]`)?.classList.add('is-drag-subtree');
      }
    };

    const flashDropConfirmed = (id: string) => {
      const wrap = el.querySelector(`.chart-node-wrap[data-id="${id}"]`);
      if (!wrap) return;
      wrap.classList.add('is-drop-confirmed');
      window.setTimeout(() => wrap.classList.remove('is-drop-confirmed'), 600);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const hitId = nodeAt(e.clientX, e.clientY);
      if (!hitId) return;

      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      mode = 'node-pending';
      dragSourceId = hitId;
      dragSourceCanDrag = forcesRef.current.find(f => f.id === hitId)?.isPlayerControlled ?? false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (mode === 'node-pending') {
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD && dragSourceId) {
          if (!dragSourceCanDrag) {
            mode = 'idle';
            dragSourceId = null;
            dragSourceCanDrag = false;
            return;
          }
          mode = 'node-drag';
          el.classList.add('is-node-dragging');
          createGhost(dragSourceId);
          markSource(dragSourceId);
        }
      }
      if (mode === 'node-drag') {
        moveGhost(e.clientX, e.clientY);
        updateHover(e.clientX, e.clientY);
      }
    };

    const onMouseUp = () => {
      if (mode === 'node-drag') {
        if (lastHoveredId && dragSourceId && isValidDrop(dragSourceId, lastHoveredId)) {
          const src = dragSourceId;
          const tgt = lastHoveredId;
          setLocalView({
            baseKey: overviewKey,
            forces: allForces.map((force) => (force.id === src ? { ...force, parentId: tgt } : force)),
          });
          setMilitaryParentBridge(src, tgt).catch(() => {
            setLocalView(null);
          });
          flashDropConfirmed(src);
        }
        markSource(null);
        removeGhost();
        clearHover();
        el.classList.remove('is-node-dragging');
      } else if (mode === 'node-pending' && dragSourceId) {
        // Click a node → open the standard Military sidebar on the left.
        // The selection state keeps the card's highlighted chain visible.
        setSelectedId(dragSourceId);
        const selectedForce = forcesRef.current.find(force => force.id === dragSourceId);
        if (selectedForce?.isPlayerControlled) {
          selectMilitaryBridge(dragSourceId).catch(acknowledgeBridgeFailure);
        }
        openSidebar('military', dragSourceId);
      }
      mode = 'idle';
      dragSourceId = null;
      dragSourceCanDrag = false;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      removeGhost();
    };
  }, [allForces, openSidebar, overviewKey, showOnly]);

  const tabs = [
    { id: 'land',      label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.986.35') },
    { id: 'sea',       label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.987.36') },
    { id: 'templates', label: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.988.37') },
  ];

  const officeStrip = militaryCourtPositions.length > 0 ? (
    <div className="chart-office-strip">
      <span className="chart-office-strip-label"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.992.11" /></span>
      <div className="chart-office-list">
        {militaryCourtPositions.map(position => (
          <CourtOfficeSummary
            key={position.key}
            position={position}
            readOnly={Boolean(court?.courtFactionId && playerFactionId && court.courtFactionId !== playerFactionId)}
            onOpen={setCourtPosition}
          />
        ))}
      </div>
    </div>
  ) : null;

  const topControls = (
    <>
      {showOnly !== 'templates' && (
        <div className="chart-header-extra">
          <span className="chart-highlight-label"><WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.1009.12" /></span>
          <div className="chart-highlight-group">
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.1012.38'), body: webUIText('Auto.Prop.ComponentsScreensMilitaryMilitaryScreen.1012.39') }}>
              <button
                className={`chart-highlight-btn chart-highlight-btn--text${highlight === null ? ' is-active' : ''}`}
                onMouseDown={() => setHighlight(null)}
              >
                <WebUIText textKey="Auto.ComponentsScreensMilitaryMilitaryScreen.1016.13" />
              </button>
            </Tooltip>
            {HIGHLIGHT_OPTIONS.map(opt => (
              <Tooltip key={String(opt.key)} content={{ title: opt.label, body: opt.desc }}>
                <button
                  className={`chart-highlight-btn${highlight === opt.key ? ' is-active' : ''}`}
                  onMouseDown={() => setHighlight(opt.key)}
                  aria-label={opt.label}
                >
                  <img src={opt.icon} alt="" className="chart-highlight-icon" draggable={false} />
                </button>
              </Tooltip>
            ))}
          </div>

          <EmpireStats
            view={showOnly === 'sea' ? 'sea' : 'land'}
            totalArmyStrength={overview?.totalArmyStrength ?? 0}
            totalArmyMaxStrength={overview?.totalArmyMaxStrength ?? 0}
            totalNavyStrength={overview?.totalNavyStrength ?? 0}
            totalNavyMaxStrength={overview?.totalNavyMaxStrength ?? 0}
            totalShips={overview?.totalShips ?? 0}
            totalMaxShips={overview?.totalMaxShips ?? 0}
            commandMaintenance={overview?.commandMaintenance ?? 0}
            autoAssignCommandsEnabled={overview?.autoAssignCommandsEnabled ?? false}
            autoReplenishFormationsEnabled={overview?.autoReplenishFormationsEnabled ?? false}
          />
        </div>
      )}
    </>
  );

  return (
    <ScreenShell
      title={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.1053.40')}
      onClose={onClose}
      advisorTopic="militaryScreen"
      className={`chart-screen${showOnly === 'templates' ? ' chart-screen--templates' : ''}`}
      contentClassName="chart-content"
      tabs={<SidebarTabBar tabs={tabs} activeTab={showOnly} onTabChange={(id) => setShowOnly(id as MilitaryScreenTab)} />}
    >
      {topControls}
      {officeStrip}
      {showOnly === 'templates' ? (
        <TemplatesPanel
          templates={templates}
          landUnitCatalogue={templateData?.landUnitCatalogue ?? []}
          navalUnitCatalogue={templateData?.navalUnitCatalogue ?? []}
          initialTemplateId={initialTemplateId}
          initialCreateType={initialCreateType}
          assignmentTargetId={assignmentTargetId}
          onCloseScreen={onClose}
        />
      ) : (
      <ZoomPanCanvas
        key={showOnly}
        className="chart-viewport"
        contentClassName="chart-inner"
        contentStyle={{
          width: designRem(layout.width),
          height: designRem(layout.height),
        }}
        initialView={chartInitialView}
        minZoom={MIN_CHART_ZOOM}
        maxZoom={MAX_CHART_ZOOM}
        zoomStep={CHART_ZOOM_STEP}
        panMode="bounded"
        panMarginPx={CANVAS_PAD * designUnitScale()}
        viewportRef={viewport}
        ignoreLeftDragFrom={(target) => !!target.closest('.chart-node-wrap')}
        onContentLeftClick={() => setSelectedId(null)}
        onViewChange={(view) => {
          chartViewRef.current = view;
        }}
        controls={({ zoom, zoomIn, zoomOut }) => (
          <div className="chart-zoom-float">
            <Tooltip content={webUIText("Auto.Attr.componentsscreensMilitaryMilitaryScreen.1090.1")}>
              <button
                className="chart-zoom-btn"
                onMouseDown={(event) => {
                  event.stopPropagation();
                  zoomOut();
                }}
                aria-label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.1097.41')}
              >
                <img src="/assets/icons/I_Minus.png" alt="" className="chart-zoom-icon" draggable={false} />
              </button>
            </Tooltip>
            <span className="chart-zoom-val">{Math.round(zoom * 100)}%</span>
            <Tooltip content={webUIText("Auto.Attr.componentsscreensMilitaryMilitaryScreen.1103.1")}>
              <button
                className="chart-zoom-btn"
                onMouseDown={(event) => {
                  event.stopPropagation();
                  zoomIn();
                }}
                aria-label={webUIText('Auto.Attr.ComponentsScreensMilitaryMilitaryScreen.1110.42')}
              >
                <img src="/assets/icons/I_Plus.png" alt="" className="chart-zoom-icon" draggable={false} />
              </button>
            </Tooltip>
          </div>
        )}
      >
          <svg className="chart-lines" width={designRem(layout.width)} height={designRem(layout.height)} viewBox={`0 0 ${layout.width} ${layout.height}`}>
            <g>
              {layout.lines.map((l, i) => {
                const midX = (l.x1 + l.x2) / 2;
                const isActive = highlightIds?.has(l.parentId) && highlightIds?.has(l.childId);
                const d = `M ${l.x1.toFixed(1)} ${l.y1.toFixed(1)} L ${midX.toFixed(1)} ${l.y1.toFixed(1)} L ${midX.toFixed(1)} ${l.y2.toFixed(1)} L ${l.x2.toFixed(1)} ${l.y2.toFixed(1)}`;
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={isActive ? 'var(--gold-light)' : 'rgba(201,168,76,0.6)'}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>
          </svg>
          {layout.nodes.map(n => {
            const inChain = !highlightIds || highlightIds.has(n.force.id);
            const matches = matchesHighlight(n.force, highlight);
            return (
              <div
                key={n.force.id}
                className="chart-node-wrap"
                data-id={n.force.id}
                style={{ left: designRem(n.x), top: designRem(n.y), width: designRem(n.w), height: designRem(n.h) }}
              >
                <NodeCard
                  force={n.force}
                  allForces={allForces}
                  selected={n.force.id === effectiveSelectedId}
                  highlighted={highlight !== null && matches}
                  dimmed={!inChain || (highlight !== null && !matches)}
                />
              </div>
            );
          })}
      </ZoomPanCanvas>
      )}
      <CourtAppointmentModal
        open={!!courtPosition}
        position={courtPosition}
        onClose={() => setCourtPosition(null)}
      />
    </ScreenShell>
  );
}

registerTopbarButton({
  id: 'military',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1171.4'); },
  icon: '/assets/icons/I_ArmiesQuickButton.png',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1174.5'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1175.6'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1177.7'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryMilitaryScreen.1178.8'); } },
    ],
  },
  order: 10,
});
registerScreen({
  id: 'military',
  render: ({ screenId, onClose }) => <MilitaryScreen key={screenId ?? 'default'} screenId={screenId} onClose={onClose} />,
  topbarId: 'military',
  advisorTopic: 'militaryScreen',
  bridgeNames: ['militaryscreen', 'militaryoverview', 'militaryoverviewscreen', 'formations', 'formationtemplates', 'formation_templates'],
});

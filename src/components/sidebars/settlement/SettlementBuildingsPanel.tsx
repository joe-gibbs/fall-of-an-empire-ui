import React from 'react';
import type {
  Settlement,
  Building,
  AvailableBuilding,
  BuildingCategory,
  BuildingResourceCost,
  BuildingRequirement,
  ConstructionQueueItem,
} from '../../../data/types';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import {
  demolishSettlementBuilding,
  downgradeSettlementBuilding,
  queueSettlementBuilding,
  unqueueSettlementBuilding,
  useSettlementBuildingsBridgeState,
} from '../../../bridge/settlements-economy/useSettlementBuildingsBridge';
import { startBuildingPlacementBridge } from '../../../bridge/military-map/useBottomBarOperationsBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import HtmlContent from '../../common/layout/content/HtmlContent';
import { formatNumber } from '../../../utils/numberFormat';
import './SettlementBuildingsPanel.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface Props {
  settlement: Settlement;
}

/** Reason why the entire panel should treat all available buildings as locked
 *  (e.g. settlement under siege). Empty string = no override. Used by AvailCard
 *  to short-circuit interactivity without prop-drilling through ChainBranch. */
const PanelLockContext = React.createContext<string>('');

/** Matches the category tab order in BuildingBrowser.GetCategoryTabIndex. */
const CATEGORY_ORDER: BuildingCategory[] = [
  'economic',
  'military',
  'defensive',
  'infrastructure',
  'cultural',
  'administrative',
  'naval',
  'other',
];

const CATEGORY_LABELS: Record<BuildingCategory, string> = {
  economic: 'Economic',
  military: 'Military',
  defensive: 'Defensive',
  infrastructure: 'Infrastructure',
  cultural: 'Cultural',
  administrative: 'Administrative',
  naval: 'Naval',
  other: 'Other',
};

const GENERIC_ICON = '/assets/icons/I_BuildingsQuickButton.png';
const BUILDING_QUEUEING_ANIMATION_MS = 520;

const n = (v: number): string => formatNumber(v);

/** Unified node type used during tree rendering. Either a built Building or
 *  an AvailableBuilding. */
type TreeNode =
  | { kind: 'built'; b: Building }
  | { kind: 'avail'; a: AvailableBuilding };

interface PanelBuildingsData {
  buildings: Building[];
  availableBuildings: AvailableBuilding[];
  hasPort: boolean;
  construction: { queue: ConstructionQueueItem[] };
  canBuild?: boolean;
  cannotBuildReason?: string;
}

interface BuildingQueueSummary {
  count: number;
  highestToLevel: number;
  leadItem: ConstructionQueueItem;
  activeItem?: ConstructionQueueItem;
}

interface QueueAnchor {
  buildingId: string;
  element: HTMLElement;
  viewport: HTMLElement;
  top: number;
  tabs?: HTMLElement;
  tabsTop?: number;
}

function nodeAssetKey(node: TreeNode): string {
  return node.kind === 'built' ? node.b.assetKey ?? node.b.name : node.a.assetKey;
}

function nodeCategory(node: TreeNode): BuildingCategory | undefined {
  return node.kind === 'built' ? node.b.category : node.a.category;
}

function nodeDevelopedFrom(node: TreeNode): string | undefined {
  return node.kind === 'built' ? node.b.developedFrom : node.a.developedFrom;
}

function nodeChainName(node: TreeNode): string {
  if (node.kind === 'built') return node.b.chainName ?? node.b.name;
  return node.a.chainName ?? node.a.name;
}

function findScrollViewport(element: HTMLElement): HTMLElement | null {
  return element.closest('.styled-scroll-area__viewport') as HTMLElement | null;
}

function normaliseBuildingIdentifier(value: string): string {
  const tail = value.split('/').pop()?.split('.').pop() ?? value;
  return tail.replace(/_C$/i, '').replace(/^U(?=[A-Z])/, '').toLowerCase();
}

function buildingIdentifierMatches(value: string | undefined, target: string): boolean {
  return !!value && normaliseBuildingIdentifier(value) === normaliseBuildingIdentifier(target);
}

function findBuildingNode(buildingId: string): HTMLElement | null {
  const nodes = document.querySelectorAll('[data-tutorial-building-id]');
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;
    if (
      buildingIdentifierMatches(node.getAttribute('data-tutorial-building-id') ?? undefined, buildingId)
      || buildingIdentifierMatches(node.getAttribute('data-tutorial-building-class-id') ?? undefined, buildingId)
    ) {
      return node;
    }
  }

  return null;
}

function nodeMatchesBuildingTarget(node: TreeNode, target: string): boolean {
  if (node.kind === 'built') {
    return buildingIdentifierMatches(node.b.assetKey, target) || buildingIdentifierMatches(node.b.id, target);
  }
  return buildingIdentifierMatches(node.a.assetKey, target) || buildingIdentifierMatches(node.a.id, target);
}

function buildQueueSummaries(queue: ConstructionQueueItem[]): Map<string, BuildingQueueSummary> {
  const summaries = new Map<string, BuildingQueueSummary>();

  for (const item of queue) {
    const existing = summaries.get(item.assetKey);
    if (existing) {
      existing.count += 1;
      existing.highestToLevel = Math.max(existing.highestToLevel, item.toLevel);
      if (!existing.activeItem && item.remainingDays !== undefined) {
        existing.activeItem = item;
      }
      continue;
    }

    summaries.set(item.assetKey, {
      count: 1,
      highestToLevel: item.toLevel,
      leadItem: item,
      activeItem: item.remainingDays !== undefined ? item : undefined,
    });
  }

  return summaries;
}

function displayQueueItem(summary?: BuildingQueueSummary): ConstructionQueueItem | undefined {
  if (!summary) return undefined;
  return summary.activeItem ?? summary.leadItem;
}

function cancellationQueueIndex(summary?: BuildingQueueSummary): number | undefined {
  return displayQueueItem(summary)?.queueIndex;
}

function queueBuildProgressPercent(item: ConstructionQueueItem): number | undefined {
  if (item.remainingDays === undefined || item.durationDays <= 0) return undefined;
  return Math.max(0, Math.min(100, (1 - item.remainingDays / item.durationDays) * 100));
}

// ---------------------------------------------------------------------------
// Tree assembly: given a flat list of nodes, build per-chain tree roots.
// A node is a root of its chain if its developedFrom is undefined OR the
// developedFrom target isn't in the visible set (e.g. different category).
// ---------------------------------------------------------------------------

interface ChainTree {
  /** ChainName from the root node. */
  chainName: string;
  /** Root node (DFS entry). */
  root: TreeNode;
  /** Descendants in DFS order with their depth from the root. */
  children: Map<string, TreeNode[]>;
}

function buildChainTrees(nodes: TreeNode[]): ChainTree[] {
  const byKey = new Map<string, TreeNode>();
  for (const node of nodes) byKey.set(nodeAssetKey(node), node);

  // Group children by parent's assetKey.
  const childrenByParent = new Map<string, TreeNode[]>();
  for (const node of nodes) {
    const parent = nodeDevelopedFrom(node);
    if (parent && byKey.has(parent)) {
      const arr = childrenByParent.get(parent) ?? [];
      arr.push(node);
      childrenByParent.set(parent, arr);
    }
  }

  // Roots = nodes whose developedFrom isn't in the visible set.
  const roots: TreeNode[] = [];
  for (const node of nodes) {
    const parent = nodeDevelopedFrom(node);
    if (!parent || !byKey.has(parent)) roots.push(node);
  }

  // One ChainTree per root.
  return roots.map(root => ({
    chainName: nodeChainName(root),
    root,
    children: childrenByParent,
  }));
}

// ---------------------------------------------------------------------------
// Tooltip builders
// ---------------------------------------------------------------------------

function queueTooltipLines(summary?: BuildingQueueSummary): TooltipLine[] {
  const item = displayQueueItem(summary);
  if (!item) return [];

  const lines: TooltipLine[] = [];
  lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.209.1'), isHeader: true });

  if (item.statusLabel) {
    const valueColor = item.state === 'awaiting_resources'
      ? 'var(--red)'
      : item.state === 'building' || item.state === 'starting'
        ? 'var(--green)'
        : 'var(--gold)';
    lines.push({ label: item.statusLabel, valueColor });
  }

  if (item.statusReason) {
    lines.push({ label: item.statusReason });
  }

  for (const missing of item.missingResources ?? []) {
    lines.push({
      label: missing.name,
      get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.223.1", { Value1: n(missing.amount) }); },
      valueIcon: missing.icon,
      valueColor: 'var(--red)',
    });
  }

  return lines;
}

function buildingTooltipBody(description?: string, effectsHtml?: string): React.ReactNode | undefined {
  if (!description && !effectsHtml) return undefined;

  return (
    <>
      {description && (
        <div className="bld-tooltip-description">
          {description}
        </div>
      )}
      <HtmlContent html={effectsHtml} className="bld-tooltip-effects" />
    </>
  );
}

function addResourceCostLines(lines: TooltipLine[], resourceCost?: BuildingResourceCost[]) {
  if (!resourceCost || resourceCost.length === 0) return;

  lines.push({ label: webUIText('Common.Resources'), isHeader: true });
  for (const cost of resourceCost) {
    lines.push({
      label: cost.name,
      labelIcon: cost.icon,
      value: n(cost.amount),
      valueColor: 'var(--gold-light)',
    });
  }
}

function addBuildingRequirementLines(lines: TooltipLine[], requiredBuildings?: BuildingRequirement[]) {
  if (!requiredBuildings || requiredBuildings.length === 0) return;

  lines.push({ label: webUIText('Auto.ComponentsSidebarsSettlementBuildingsPanel.362.1'), isHeader: true });
  for (const requirement of requiredBuildings) {
    lines.push({
      label: requirement.name,
      labelIcon: requirement.icon,
      value: requirement.met
        ? webUIText('Auto.Fix.PropExprTrue.componentssidebarsSettlementBuildingsPanel.367.1')
        : webUIText('Auto.Fix.PropExprFalse.componentssidebarsSettlementBuildingsPanel.368.1'),
      valueColor: requirement.met ? 'var(--green)' : 'var(--red)',
    });
  }
}

function builtTooltip(
  b: Building,
  queueSummary?: BuildingQueueSummary,
  lockReason?: string,
  canCancel = false,
  actions?: React.ReactNode,
): TooltipContent {
  const lines: TooltipLine[] = [];
  if (b.maxLevel !== undefined) {
    const maxLevel = b.maxLevel;
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.240.2'),
      get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.237.1", { Value1: n(b.level), Value2: n(maxLevel) }); },
      valueColor: 'var(--gold)',
    });
  }
  if (b.upkeep !== undefined) {
    const upkeep = b.upkeep;
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.247.3'),
      get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.244.1", { Value1: n(upkeep) }); },
      valueIcon: '/assets/icons/I_Coins.png',
    });
  }
  if (b.condition !== undefined) {
    const condition = b.condition;
    const color = condition >= 80 ? 'var(--green)'
      : condition >= 50 ? 'var(--gold)'
      : condition >= 20 ? 'var(--orange)'
      : 'var(--red)';
    const label = condition >= 80 ? webUIText("Auto.Fix.VarExprTrue.componentssidebarsSettlementBuildingsPanel.253.1") : condition >= 50 ? webUIText("Auto.Fix.VarExprFalseTrue.componentssidebarsSettlementBuildingsPanel.254.1") : condition >= 20 ? webUIText("Auto.Fix.VarExprFalseFalseTrue.componentssidebarsSettlementBuildingsPanel.255.1") : webUIText("Auto.Fix.VarExprFalseFalseFalse.componentssidebarsSettlementBuildingsPanel.256.1");
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.261.4'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.257.1", { Value1: n(condition), Value2: label }); }, valueColor: color });
  }
  lines.push(...queueTooltipLines(queueSummary));
  if (b.nextBuildState) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.265.5'), isHeader: true });
    if (b.nextLevelPrice !== undefined) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.267.6'), value: n(b.nextLevelPrice), valueIcon: '/assets/icons/I_Coins.png' });
    }
    if (b.nextLevelBuildTime !== undefined) {
      const nextLevelBuildTime = b.nextLevelBuildTime;
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.270.7'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.266.1", { Value1: n(nextLevelBuildTime) }); } });
    }
    addResourceCostLines(lines, b.resourceCost);
    if (lockReason) {
      lines.push({ label: lockReason, valueColor: 'var(--red)' });
    }
  }
  addBuildingRequirementLines(lines, b.requiredBuildings);
  return {
    title: b.name,
    body: buildingTooltipBody(b.description, b.effectsHtml),
    lines,
    afterLines: actions,
    footer: canCancel && displayQueueItem(queueSummary)
      ? webUIText('SettlementBuildings.RightClickCancelConstruction')
      : undefined,
  };
}

function availTooltip(
  a: AvailableBuilding,
  queueSummary?: BuildingQueueSummary,
  lockReason?: string,
  canCancel = false,
): TooltipContent {
  const lines: TooltipLine[] = [];
  lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.281.8'), value: n(a.price), valueIcon: '/assets/icons/I_Coins.png' });
  lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.282.9'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.278.1", { Value1: n(a.buildTime) }); } });
  if (a.upkeep > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.285.10'),
      get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.282.1", { Value1: n(a.upkeep) }); },
      valueIcon: '/assets/icons/I_Coins.png',
      valueColor: 'var(--text-muted)',
    });
  }
  addResourceCostLines(lines, a.resourceCost);
  addBuildingRequirementLines(lines, a.requiredBuildings);
  lines.push(...queueTooltipLines(queueSummary));
  if (lockReason) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.293.11'), isHeader: true });
    lines.push({ label: lockReason, valueColor: 'var(--red)' });
  }
  return {
    title: a.name,
    body: buildingTooltipBody(a.description, a.effectsHtml),
    lines,
    footer: canCancel && displayQueueItem(queueSummary)
      ? webUIText('SettlementBuildings.RightClickCancelConstruction')
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Small display pieces
// ---------------------------------------------------------------------------

function LevelPips({
  level,
  maxLevel,
  queuedToLevel,
}: {
  level: number;
  maxLevel: number;
  queuedToLevel?: number;
}) {
  const pips: React.ReactNode[] = [];
  const queuedTarget = Math.min(maxLevel, Math.max(level, queuedToLevel ?? level));
  for (let i = 0; i < maxLevel; i++) {
    const isBuilt = i < level;
    const isQueued = i >= level && i < queuedTarget;
    pips.push(
      <span
        key={i}
        className={
          `bld-pip${isBuilt ? ' bld-pip--on' : ''}`
          + (isQueued ? ' bld-pip--queued' : '')
        }
      />,
    );
  }
  return <span className="bld-pips">{pips}</span>;
}

function ResourceRow({
  items,
  mode = 'required',
}: {
  items: BuildingResourceCost[];
  mode?: 'required' | 'missing';
}) {
  if (items.length === 0) return null;

  const amountTooltipKey = mode === 'missing'
    ? 'SettlementBuildings.ResourceMissingAmount'
    : 'SettlementBuildings.ResourceRequiredAmount';

  return (
    <div className={`bld-res-row${mode === 'missing' ? ' bld-res-row--missing' : ''}`}>
      {items.map(r => (
        <Tooltip
          key={r.name}
          content={{ title: r.name, get body() { return webUIText(amountTooltipKey, { Amount: n(r.amount) }); } }}
          position="bottom"
          delay={150}
        >
          <span className={`bld-res${mode === 'missing' ? ' bld-res--missing' : ''}`}>
            <img src={r.icon} alt="" className="bld-res-icon" />
            <span className="bld-res-amt">{n(r.amount)}</span>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

function MapPlaceButton({
  buildingId,
  buildingName,
  onPlace,
}: {
  buildingId: string;
  buildingName: string;
  onPlace?: (buildingId: string) => void;
}) {
  if (!onPlace) return null;

  const label = webUIText('BottomBar.BuildingPlacement.PlaceOnMap');
  return (
    <Tooltip
      content={{ title: label, body: webUIText('BottomBar.BuildingPlacement.PlaceOnMapBody') }}
      position="left"
      delay={150}
    >
      <button
        type="button"
        className="bld-map-place-btn"
        aria-label={webUIText('BottomBar.BuildingPlacement.PlaceNamedOnMap', { Name: buildingName })}
        onMouseDown={(event) => {
          event.stopPropagation();
          onPlace(buildingId);
        }}
      >
        <img src="/assets/icons/I_Region.png" alt="" className="bld-map-place-icon" draggable={false} />
      </button>
    </Tooltip>
  );
}

/** Cross-chain prerequisites row: small icons of each RequiredBuilding with
 *  a tick (met) or cross (missing) marker. */
function RequiresRow({ items }: { items: BuildingRequirement[] }) {
  if (items.length === 0) return null;
  return (
    <div className="bld-requires-row">
      <span className="bld-requires-label"><WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.362.1" /></span>
      <div className="bld-requires-list">
        {items.map(r => (
          <Tooltip
            key={r.assetKey}
            content={{
              title: r.name,
              get body() { return r.met ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementBuildingsPanel.367.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementBuildingsPanel.368.1"); },
            }}
            position="bottom"
            delay={150}
          >
            <span className={`bld-requires-item${r.met ? ' bld-requires-item--met' : ' bld-requires-item--missing'}`}>
              {r.icon && <img src={r.icon} alt="" className="bld-requires-icon" />}
              <span className="bld-requires-mark">{r.met ? '+' : webUIText("Auto.Fix.ExprFalse.componentssidebarsSettlementBuildingsPanel.375.1")}</span>
            </span>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function EffectsBlock({ html }: { html?: string }) {
  return <HtmlContent html={html} className="bld-effects" />;
}

type BuildingManagementAction = 'downgrade' | 'demolish';

function BuildingManagementActions({
  building,
  confirmingAction,
  pendingAction,
  onAction,
}: {
  building: Building;
  confirmingAction: BuildingManagementAction | null;
  pendingAction: BuildingManagementAction | null;
  onAction: (action: BuildingManagementAction, event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const downgradeLabel = confirmingAction === 'downgrade'
    ? webUIText('SettlementBuildings.ConfirmDowngrade')
    : webUIText('SettlementBuildings.Downgrade');
  const demolishLabel = confirmingAction === 'demolish'
    ? webUIText('SettlementBuildings.ConfirmDismantle')
    : webUIText('SettlementBuildings.Dismantle');
  const actionPending = pendingAction !== null;
  const downgradeDisabled = actionPending || !building.canDowngrade;
  const demolishDisabled = actionPending || !building.canDemolish;

  return (
    <div className="bld-tooltip-actions">
      <div className="bld-tooltip-actions-title">{webUIText('SettlementBuildings.ManageBuilding')}</div>
      <div className="bld-tooltip-action-row">
        <div className="bld-tooltip-action-copy">
          <span className="bld-tooltip-action-name">{webUIText('SettlementBuildings.Downgrade')}</span>
          <span className="bld-tooltip-action-detail">
            {building.canDowngrade && building.downgradeTargetName && building.downgradeTargetLevel !== undefined
              ? webUIText('SettlementBuildings.DowngradeTo', { Name: building.downgradeTargetName, Level: n(building.downgradeTargetLevel) })
              : building.downgradeReason}
          </span>
        </div>
        <button
          type="button"
          className={`bld-tooltip-action-btn${confirmingAction === 'downgrade' ? ' bld-tooltip-action-btn--confirm' : ''}`}
          disabled={downgradeDisabled}
          onMouseDown={event => onAction('downgrade', event)}
        >
          {downgradeLabel}
        </button>
      </div>
      <div className="bld-tooltip-action-row bld-tooltip-action-row--danger">
        <div className="bld-tooltip-action-copy">
          <span className="bld-tooltip-action-name">{webUIText('SettlementBuildings.Dismantle')}</span>
          <span className="bld-tooltip-action-detail">
            {building.canDemolish ? webUIText('SettlementBuildings.DismantleBody') : building.demolishReason}
          </span>
          {building.canDemolish && (
            <span className="bld-tooltip-spoils">
              <span className="bld-tooltip-spoils-label">{webUIText('SettlementBuildings.DismantleSpoils')}</span>
              {(building.dismantleSpoils ?? []).length > 0 ? (
                <span className="bld-tooltip-spoils-list">
                  {building.dismantleSpoils!.map(spoil => (
                    <span key={spoil.name} className="bld-tooltip-spoil">
                      <img src={spoil.icon} alt="" className="bld-tooltip-spoil-icon" draggable={false} />
                      {n(spoil.amount)}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="bld-tooltip-spoils-empty">{webUIText('SettlementBuildings.NoSpoils')}</span>
              )}
            </span>
          )}
        </div>
        <button
          type="button"
          className={`bld-tooltip-action-btn bld-tooltip-action-btn--danger${confirmingAction === 'demolish' ? ' bld-tooltip-action-btn--confirm' : ''}`}
          disabled={demolishDisabled}
          onMouseDown={event => onAction('demolish', event)}
        >
          {demolishLabel}
        </button>
      </div>
      {confirmingAction && !pendingAction && (
        <div className="bld-tooltip-confirm-note">{webUIText('SettlementBuildings.PressAgain')}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Building node card - mirrors the InteractionCard structure (0.2727rem gold-frame
// border, dark gradient, left icon + body) so it lives in the same visual
// language as the rest of the sidebar.
// ---------------------------------------------------------------------------

function BuiltCard({
  b,
  onQueue,
  onUnqueue,
  onPlace,
  onDemolish,
  onDowngrade,
  queueSummary,
  queueing = false,
}: {
  b: Building;
  onQueue?: (buildingId: string, element?: HTMLElement | null) => void;
  onUnqueue?: (queueIndex: number) => void;
  onPlace?: (buildingId: string) => void;
  onDemolish?: (buildingId: string) => Promise<void>;
  onDowngrade?: (buildingId: string) => Promise<void>;
  queueSummary?: BuildingQueueSummary;
  queueing?: boolean;
}) {
  const [confirmingAction, setConfirmingAction] = React.useState<BuildingManagementAction | null>(null);
  const [pendingAction, setPendingAction] = React.useState<BuildingManagementAction | null>(null);
  const panelLockReason = React.useContext(PanelLockContext);
  const maxed = b.maxLevel !== undefined && b.level >= b.maxLevel;
  const intrinsicLocked = b.nextBuildState !== undefined && b.nextBuildState.state !== 'visible';
  const lockReason = queueSummary
    ? undefined
    : panelLockReason || (intrinsicLocked ? b.nextBuildState?.reason : undefined);
  const actionable = !!onQueue && !panelLockReason && b.nextBuildState?.state === 'visible';
  const queuedToLevel = queueSummary?.highestToLevel;
  const cancelQueueIndex = cancellationQueueIndex(queueSummary);
  const cancellable = !!onUnqueue && cancelQueueIndex !== undefined;
  const conditionColor: 'green' | 'red' | 'gold' =
    b.condition === undefined ? 'gold'
      : b.condition >= 80 ? 'green'
      : b.condition >= 50 ? 'gold'
      : 'red';
  const showCondition = b.condition !== undefined && b.condition < 80;
  const levelText = b.maxLevel !== undefined && queuedToLevel !== undefined && queuedToLevel > b.level
    ? `${n(b.level)} -> ${n(queuedToLevel)} / ${n(b.maxLevel)}`
    : maxed
      ? 'Max'
      : (b.maxLevel !== undefined ? `${n(b.level)} / ${n(b.maxLevel)}` : undefined);
  const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 0) {
      if (actionable) onQueue?.(b.id, event.currentTarget);
      return;
    }

    if (event.button === 2 && cancellable) {
      event.preventDefault();
      onUnqueue?.(cancelQueueIndex);
    }
  }, [actionable, b.id, cancelQueueIndex, cancellable, onQueue, onUnqueue]);
  const handleManagementAction = React.useCallback((action: BuildingManagementAction, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pendingAction !== null) return;

    const enabled = action === 'downgrade' ? b.canDowngrade : b.canDemolish;
    const handler = action === 'downgrade' ? onDowngrade : onDemolish;
    if (!enabled || !handler) return;

    if (confirmingAction !== action) {
      setConfirmingAction(action);
      return;
    }

    setPendingAction(action);
    handler(b.id)
      .catch(acknowledgeBridgeFailure)
      .finally(() => {
        setPendingAction(null);
        setConfirmingAction(null);
      });
  }, [b.canDemolish, b.canDowngrade, b.id, confirmingAction, onDemolish, onDowngrade, pendingAction]);
  const managementActions = (onDemolish || onDowngrade) ? (
    <BuildingManagementActions
      building={b}
      confirmingAction={confirmingAction}
      pendingAction={pendingAction}
      onAction={handleManagementAction}
    />
  ) : undefined;

  return (
    <Tooltip content={builtTooltip(b, queueSummary, lockReason, cancellable, managementActions)} position="left" delay={200}>
      <div
        className={
          `bld-node bld-node--built${maxed ? ' bld-node--maxed' : ''}`
          + (actionable ? ' bld-node--actionable' : '')
          + (queueing ? ' bld-node--queueing' : '')
        }
        data-tutorial-target="DynamicBuilding"
        data-tutorial-building-id={b.assetKey ?? b.id}
        data-tutorial-building-class-id={b.id}
        onMouseDown={actionable || cancellable ? handleMouseDown : undefined}
        onContextMenu={cancellable ? event => event.preventDefault() : undefined}
        role={actionable || cancellable ? 'button' : undefined}
      >
        <div className="bld-node-icon-wrap">
          <img src={b.icon ?? GENERIC_ICON} alt="" className="bld-node-icon" />
        </div>
        <div className="bld-node-body">
          <div className="bld-node-header">
            <span className="bld-node-name">{b.name}</span>
            <span className="bld-node-header-right">
              {b.maxLevel !== undefined && b.maxLevel > 1 ? (
                <span className="bld-node-level">
                  <LevelPips
                    level={b.level}
                    maxLevel={b.maxLevel}
                    queuedToLevel={queuedToLevel}
                  />
                  {levelText && (
                    <span className="bld-node-level-text">
                      {levelText}
                    </span>
                  )}
                </span>
              ) : null}
              <MapPlaceButton
                buildingId={b.id}
                buildingName={b.name}
                onPlace={onPlace}
              />
            </span>
          </div>
          <EffectsBlock html={b.effectsHtml} />
          {b.requiredBuildings && b.requiredBuildings.length > 0 && (
            <RequiresRow items={b.requiredBuildings} />
          )}
          <div className="bld-node-meta">
            {b.upkeep !== undefined && b.upkeep > 0 && (
              <span className="bld-node-meta-item">
                <img src="/assets/icons/I_Coins.png" alt="" className="bld-meta-icon" />
                {n(b.upkeep)}<WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.470.2" />
              </span>
            )}
            {showCondition && (
              <span className="bld-node-condition">
                <span className="bld-node-condition-bar">
                  <PaintedBar percent={b.condition!} color={conditionColor} />
                </span>
                <span className="bld-node-condition-val">{n(b.condition!)}%</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

function AvailCard({
  a,
  onQueue,
  onUnqueue,
  onPlace,
  queueSummary,
  queueing = false,
}: {
  a: AvailableBuilding;
  onQueue?: (buildingId: string, element?: HTMLElement | null) => void;
  onUnqueue?: (queueIndex: number) => void;
  onPlace?: (buildingId: string) => void;
  queueSummary?: BuildingQueueSummary;
  queueing?: boolean;
}) {
  const panelLockReason = React.useContext(PanelLockContext);
  const intrinsicLocked = a.buildState.state !== 'visible';
  const locked = intrinsicLocked || !!panelLockReason;
  // Panel-wide locks (siege/occupation) take precedence over per-building reasons.
  const lockReason = queueSummary
    ? undefined
    : panelLockReason || (intrinsicLocked ? a.buildState.reason : undefined);
  const actionable = !!onQueue && !locked;
  const queuedToLevel = queueSummary?.highestToLevel;
  const cancelQueueIndex = cancellationQueueIndex(queueSummary);
  const cancellable = !!onUnqueue && cancelQueueIndex !== undefined;
  const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 0) {
      if (actionable) onQueue?.(a.id, event.currentTarget);
      return;
    }

    if (event.button === 2 && cancellable) {
      event.preventDefault();
      onUnqueue?.(cancelQueueIndex);
    }
  }, [a.id, actionable, cancelQueueIndex, cancellable, onQueue, onUnqueue]);

  return (
    <Tooltip content={availTooltip(a, queueSummary, lockReason, cancellable)} position="left" delay={200}>
      <div
        className={
          `bld-node bld-node--avail${locked ? ' bld-node--locked' : ''}`
          + (actionable ? ' bld-node--actionable' : '')
          + (queueing ? ' bld-node--queueing' : '')
        }
        data-tutorial-target="DynamicBuilding"
        data-tutorial-building-id={a.assetKey}
        data-tutorial-building-class-id={a.id}
        onMouseDown={actionable || cancellable ? handleMouseDown : undefined}
        onContextMenu={cancellable ? event => event.preventDefault() : undefined}
        role={actionable || cancellable ? 'button' : undefined}
      >
        <div className="bld-node-icon-wrap">
          <img src={a.icon ?? GENERIC_ICON} alt="" className="bld-node-icon" />
          {locked && (
            <img src="/assets/icons/I_Locked.png" alt="" className="bld-node-lock" />
          )}
        </div>
        <div className="bld-node-body">
          <div className="bld-node-header">
            <span className="bld-node-name">{a.name}</span>
            <span className="bld-node-header-right">
              <span className="bld-node-cost">
                <img src="/assets/icons/I_Coins.png" alt="" className="bld-meta-icon" />
                {n(a.price)}
              </span>
              <MapPlaceButton
                buildingId={a.id}
                buildingName={a.name}
                onPlace={onPlace}
              />
            </span>
          </div>
          {queuedToLevel !== undefined && a.maxLevel > 1 && (
            <div className="bld-node-subheader">
              <span className="bld-node-level">
                <LevelPips level={0} maxLevel={a.maxLevel} queuedToLevel={queuedToLevel} />
                <span className="bld-node-level-text">
                  {`${n(queuedToLevel)} / ${n(a.maxLevel)}`}
                </span>
              </span>
            </div>
          )}
          <EffectsBlock html={a.effectsHtml} />
          {a.requiredBuildings && a.requiredBuildings.length > 0 && (
            <RequiresRow items={a.requiredBuildings} />
          )}
          <div className="bld-node-meta">
            <span className="bld-node-meta-item">
              {webUIText("Auto.Fix.Expr.componentssidebarsSettlementBuildingsPanel.545.1", { Value1: n(a.buildTime) })}
            </span>
            {a.upkeep > 0 && (
              <span className="bld-node-meta-item bld-node-meta-item--muted">
                <img src="/assets/icons/I_Coins.png" alt="" className="bld-meta-icon" />
                {n(a.upkeep)}<WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.553.3" />
              </span>
            )}
              <ResourceRow items={a.resourceCost} />
          </div>
          {locked && lockReason && (
            <div className="game-notice game-notice--warning game-notice--compact bld-node-reason">{lockReason}</div>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Chain renderer - shows parent, then children indented under a connector line
// ---------------------------------------------------------------------------

function ChainBranch({
  node,
  childrenByParent,
  depth,
  onQueue,
  onUnqueue,
  onPlace,
  onDemolish,
  onDowngrade,
  queueSummaries,
  queueingBuildingIds,
  isLastChild = false,
}: {
  node: TreeNode;
  childrenByParent: Map<string, TreeNode[]>;
  depth: number;
  onQueue?: (buildingId: string, element?: HTMLElement | null) => void;
  onUnqueue?: (queueIndex: number) => void;
  onPlace?: (buildingId: string) => void;
  onDemolish?: (buildingId: string) => Promise<void>;
  onDowngrade?: (buildingId: string) => Promise<void>;
  queueSummaries: Map<string, BuildingQueueSummary>;
  queueingBuildingIds: Set<string>;
  isLastChild?: boolean;
}) {
  const nodeKey = nodeAssetKey(node);
  const children = childrenByParent.get(nodeAssetKey(node)) ?? [];
  const hasChildren = children.length > 0;
  const queueSummary = queueSummaries.get(nodeKey);
  const queueing = node.kind === 'built'
    ? queueingBuildingIds.has(node.b.id)
    : queueingBuildingIds.has(node.a.id);

  const card = node.kind === 'built'
    ? <BuiltCard b={node.b} onQueue={onQueue} onUnqueue={onUnqueue} onPlace={onPlace} onDemolish={onDemolish} onDowngrade={onDowngrade} queueSummary={queueSummary} queueing={queueing} />
    : <AvailCard a={node.a} onQueue={onQueue} onUnqueue={onUnqueue} onPlace={onPlace} queueSummary={queueSummary} queueing={queueing} />;

  return (
    <div
      className={
        `bld-branch bld-branch--depth-${n(Math.min(depth, 3))}`
        + (depth > 0 && !isLastChild ? ' bld-branch--continues' : '')
      }
    >
      <div className="bld-branch-row">
        {depth > 0 && <span className="bld-branch-elbow" aria-hidden="true" />}
        <div className="bld-branch-node">{card}</div>
      </div>
      {hasChildren && (
        <div className="bld-branch-children">
          {children.map((child, index) => (
            <ChainBranch
              key={nodeAssetKey(child)}
              node={child}
              childrenByParent={childrenByParent}
              depth={depth + 1}
              onQueue={onQueue}
              onUnqueue={onUnqueue}
              onPlace={onPlace}
              onDemolish={onDemolish}
              onDowngrade={onDowngrade}
              queueSummaries={queueSummaries}
              queueingBuildingIds={queueingBuildingIds}
              isLastChild={index === children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

function QueueItemCard({
  item,
  order,
  onUnqueue,
  pendingRemoval = false,
}: {
  item: ConstructionQueueItem;
  order: number;
  onUnqueue?: (queueIndex: number) => void;
  pendingRemoval?: boolean;
}) {
  const buildProgressPercent = queueBuildProgressPercent(item);
  const showResourceCost = item.state === 'awaiting_resources' && item.resourceCost.length > 0;
  const showBuildProgress = item.state !== 'awaiting_resources' && buildProgressPercent !== undefined;
  const canUnqueue = !!onUnqueue && item.queueIndex !== undefined && !pendingRemoval;

  return (
    <div
      className={
        `bld-queue-card${item.state ? ` bld-queue-card--${item.state}` : ''}`
        + (pendingRemoval ? ' bld-queue-card--pending' : '')
      }
    >
      <div className="bld-queue-card-art">
        <img src={item.icon ?? GENERIC_ICON} alt="" className="bld-queue-card-icon" />
        <span className="bld-queue-card-order">{n(order)}</span>
        {item.kind === 'upgrade' && (
          <span className="bld-queue-card-level">{webUIText("Auto.Fix.Expr.componentssidebarsSettlementBuildingsPanel.654.1", { Value1: n(item.toLevel) })}</span>
        )}
      </div>
      <div className="bld-queue-card-body">
        <div className="bld-queue-card-header">
          <div className="bld-queue-card-title-wrap">
            <span className="bld-queue-card-title">{item.name}</span>
            {item.statusLabel && (
              <span className="bld-queue-card-status">{item.statusLabel}</span>
            )}
          </div>
          {(canUnqueue || pendingRemoval) && (
            <Tooltip
              content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.671.12'), body: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.671.13') }}
              position="left"
              delay={150}
            >
              <button
                type="button"
                className={`bld-queue-card-action${pendingRemoval ? ' bld-queue-card-action--pending' : ''}`}
                onClick={() => {
                  if (!canUnqueue) return;
                  onUnqueue?.(item.queueIndex!);
                }}
                disabled={pendingRemoval}
                aria-label={webUIText("Auto.Attr.componentssidebarsSettlementBuildingsPanel.679.1", { Name: item.name })}
              >
                <img src="/assets/icons/I_Close.png" alt="" className="bld-queue-card-action-icon" draggable={false} />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="bld-queue-card-meta">
          <span className="bld-node-meta-item">
            <img src="/assets/icons/I_Coins.png" alt="" className="bld-meta-icon" />
            {n(item.goldCost)}
          </span>
          <span className="bld-node-meta-item">
            {item.remainingDays !== undefined ? webUIText("Auto.Fix.ExprTrue.componentssidebarsSettlementBuildingsPanel.694.1", { Value1: n(item.remainingDays), Value2: n(item.durationDays) }) : webUIText("Auto.Fix.ExprFalse.componentssidebarsSettlementBuildingsPanel.695.1", { Value1: n(item.durationDays) })}
          </span>
        </div>

        {item.statusReason && (
          <div className="bld-queue-card-reason">{item.statusReason}</div>
        )}

        {showBuildProgress && (
          <div className="bld-queue-card-progress-block">
            <div className="bld-queue-card-progress-label">
              <span className="bld-queue-card-progress-title"><WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.722.5" /></span>
              <span className="bld-queue-card-progress-value">{n(buildProgressPercent)}%</span>
            </div>
            <PaintedBar percent={Math.round(buildProgressPercent)} color="green" />
          </div>
        )}

        {showResourceCost && (
          <div className="bld-queue-card-resources">
            <ResourceRow items={item.resourceCost} />
          </div>
        )}
      </div>
    </div>
  );
}

function ConstructionSection({
  items,
  onUnqueue,
  pendingUnqueueIndices,
}: {
  items: ConstructionQueueItem[];
  onUnqueue?: (queueIndex: number) => void;
  pendingUnqueueIndices: Set<number>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="bld-construction">
      <div className="bld-construction-heading">
        <span className="bld-construction-title"><WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.757.7" /></span>
        <span className="bld-construction-count">{n(items.length)}</span>
      </div>
      <div className="bld-queue-list">
        {items.map((item, index) => (
          <QueueItemCard
            key={item.id}
            item={item}
            order={index + 1}
            onUnqueue={onUnqueue}
            pendingRemoval={item.queueIndex !== undefined && pendingUnqueueIndices.has(item.queueIndex)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category tabs - matches the in-game CategoryFilter (8 tabs in game order).
// Tabs disabled when no buildings in that category for this settlement.
// ---------------------------------------------------------------------------

function CategoryTabs({
  active,
  counts,
  disabledCategories,
  onChange,
}: {
  active: BuildingCategory;
  counts: Record<BuildingCategory, number>;
  disabledCategories: Set<BuildingCategory>;
  onChange: (c: BuildingCategory) => void;
}) {
  return (
    <div className="bld-cat-tabs">
      {CATEGORY_ORDER.map(cat => {
        const count = counts[cat];
        const disabled = disabledCategories.has(cat) || count === 0;
        const isActive = active === cat;
        return (
          <button
            key={cat}
            className={
              'bld-cat-tab'
              + (isActive ? ' bld-cat-tab--active' : '')
              + (disabled ? ' bld-cat-tab--disabled' : '')
            }
            onMouseDown={disabled ? undefined : () => onChange(cat)}
            disabled={disabled}
          >
            <span className="bld-cat-tab-label">{CATEGORY_LABELS[cat]}</span>
            <span className="bld-cat-tab-count">{n(count)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

function hasRichBuildingsData(settlement: Settlement): boolean {
  return settlement.availableBuildings !== undefined
    || settlement.construction !== undefined
    || settlement.hasPort !== undefined
    || settlement.buildings.some(b => (
      b.assetKey !== undefined
      || b.category !== undefined
      || b.maxLevel !== undefined
      || b.nextBuildState !== undefined
      || b.description !== undefined
    ));
}

const SettlementBuildingsPanel: React.FC<Props> = ({ settlement }) => {
  const liveDataState = useSettlementBuildingsBridgeState(settlement.id);
  const liveData = liveDataState.data;
  const inlineData = React.useMemo<PanelBuildingsData | null>(() => {
    if (!hasRichBuildingsData(settlement)) return null;
    return {
      buildings: settlement.buildings,
      availableBuildings: settlement.availableBuildings ?? [],
      hasPort: settlement.hasPort ?? false,
      construction: settlement.construction ?? { queue: [] },
      canBuild: settlement.canBuild,
      cannotBuildReason: settlement.cannotBuildReason,
    };
  }, [settlement]);

  const data = liveData ?? inlineData;
  const canQueueViaBridge = liveData !== null;
  const [pendingUnqueueIndices, setPendingUnqueueIndices] = React.useState<number[]>([]);
  const [queueingBuildingIds, setQueueingBuildingIds] = React.useState<string[]>([]);
  const queueAnchorRef = React.useRef<QueueAnchor | null>(null);
  const queueingAnimationTimerRef = React.useRef<number | null>(null);
  const pendingQueueBuildingIdsRef = React.useRef<Set<string>>(new Set());
  const pendingTutorialBuildingTargetRef = React.useRef<string | null>(null);
  const pendingUnqueueSet = React.useMemo(
    () => new Set(pendingUnqueueIndices),
    [pendingUnqueueIndices],
  );
  const queueingBuildingSet = React.useMemo(
    () => new Set(queueingBuildingIds),
    [queueingBuildingIds],
  );
  const rememberQueueAnchor = React.useCallback((buildingId: string, element?: HTMLElement | null) => {
    if (!element) return;

    const viewport = findScrollViewport(element);
    if (!viewport) return;

    const panel = element.closest('.bld-panel') as HTMLElement | null;
    const tabs = panel?.querySelector('.bld-cat-tabs') as HTMLElement | null;
    queueAnchorRef.current = {
      buildingId,
      element,
      viewport,
      top: element.getBoundingClientRect().top,
      tabs: tabs ?? undefined,
      tabsTop: tabs ? tabs.getBoundingClientRect().top : undefined,
    };
  }, []);
  const handleQueueBuilding = React.useCallback((buildingId: string, element?: HTMLElement | null) => {
    if (pendingQueueBuildingIdsRef.current.has(buildingId)) {
      return;
    }

    pendingQueueBuildingIdsRef.current.add(buildingId);
    rememberQueueAnchor(buildingId, element);
    setQueueingBuildingIds(prev => (prev.includes(buildingId) ? prev : [...prev, buildingId]));
    if (queueingAnimationTimerRef.current !== null) {
      window.clearTimeout(queueingAnimationTimerRef.current);
    }
    queueingAnimationTimerRef.current = window.setTimeout(() => {
      setQueueingBuildingIds([]);
      queueingAnimationTimerRef.current = null;
    }, BUILDING_QUEUEING_ANIMATION_MS);

    queueSettlementBuilding(settlement.id, buildingId)
      .catch(error => {
        queueAnchorRef.current = null;
        setQueueingBuildingIds(prev => prev.filter(id => id !== buildingId));
        acknowledgeBridgeFailure(error);
      })
      .finally(() => {
        pendingQueueBuildingIdsRef.current.delete(buildingId);
      });
  }, [rememberQueueAnchor, settlement.id]);
  const handlePlaceBuilding = React.useCallback((buildingId: string) => {
    startBuildingPlacementBridge(buildingId).catch(acknowledgeBridgeFailure);
  }, []);
  const handleUnqueueBuilding = React.useCallback((queueIndex: number) => {
    setPendingUnqueueIndices(prev => (prev.includes(queueIndex) ? prev : [...prev, queueIndex]));
    unqueueSettlementBuilding(settlement.id, queueIndex)
      .catch(acknowledgeBridgeFailure)
      .finally(() => {
        setPendingUnqueueIndices(prev => prev.filter(index => index !== queueIndex));
      });
  }, [settlement.id]);
  const handleDemolishBuilding = React.useCallback((buildingId: string) => {
    return demolishSettlementBuilding(settlement.id, buildingId);
  }, [settlement.id]);
  const handleDowngradeBuilding = React.useCallback((buildingId: string) => {
    return downgradeSettlementBuilding(settlement.id, buildingId);
  }, [settlement.id]);

  const built = React.useMemo(() => data?.buildings ?? [], [data]);
  const available = React.useMemo(() => data?.availableBuildings ?? [], [data]);
  const hasPort = data?.hasPort ?? false;
  const queue = React.useMemo(() => data?.construction.queue ?? [], [data]);
  const queueSummaries = React.useMemo(() => buildQueueSummaries(queue), [queue]);

  const scrollTutorialBuildingIntoView = React.useCallback((buildingId: string) => {
    const element = findBuildingNode(buildingId);
    if (!element) return false;

    const viewport = findScrollViewport(element);
    if (!viewport) return true;

    const viewportRect = viewport.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const topGap = elementRect.top - viewportRect.top;
    const bottomGap = elementRect.bottom - viewportRect.bottom;
    if (topGap < 0) {
      viewport.scrollTop += topGap - 12;
    } else if (bottomGap > 0) {
      viewport.scrollTop += bottomGap + 12;
    }
    return true;
  }, []);

  React.useEffect(() => {
    return () => {
      if (queueingAnimationTimerRef.current !== null) {
        window.clearTimeout(queueingAnimationTimerRef.current);
      }
    };
  }, []);

  React.useLayoutEffect(() => {
    const anchor = queueAnchorRef.current;
    if (!anchor) return;

    queueAnchorRef.current = null;
    const currentElement = document.body.contains(anchor.element)
      ? anchor.element
      : findBuildingNode(anchor.buildingId);
    if (currentElement) {
      const nextTop = currentElement.getBoundingClientRect().top;
      anchor.viewport.scrollTop += nextTop - anchor.top;
      return;
    }

    if (anchor.tabs && document.body.contains(anchor.tabs) && anchor.tabsTop !== undefined) {
      const nextTabsTop = anchor.tabs.getBoundingClientRect().top;
      anchor.viewport.scrollTop += nextTabsTop - anchor.tabsTop;
    }
  }, [queue]);

  // Group built + available into tree nodes per category. Naval hidden when no port.
  const nodes: TreeNode[] = React.useMemo(() => {
    const out: TreeNode[] = [];
    for (const b of built) {
      if (b.category === 'naval' && !hasPort) continue;
      out.push({ kind: 'built', b });
    }
    for (const a of available) {
      if (a.category === 'naval' && !hasPort) continue;
      if (a.buildState.state === 'hidden') continue;
      out.push({ kind: 'avail', a });
    }
    return out;
  }, [built, available, hasPort]);

  // Counts per category for tab badges.
  const counts = React.useMemo(() => {
    const c: Record<BuildingCategory, number> = {
      economic: 0, military: 0, defensive: 0, infrastructure: 0,
      cultural: 0, administrative: 0, naval: 0, other: 0,
    };
    for (const node of nodes) {
      const cat = nodeCategory(node);
      if (cat) c[cat]++;
    }
    return c;
  }, [nodes]);

  const disabledCategories = React.useMemo(() => {
    const s = new Set<BuildingCategory>();
    if (!hasPort) s.add('naval');
    return s;
  }, [hasPort]);

  // Default tab: first category with buildings.
  const [activeTab, setActiveTab] = React.useState<BuildingCategory>(() => {
    for (const cat of CATEGORY_ORDER) {
      if (counts[cat] > 0 && !disabledCategories.has(cat)) return cat;
    }
    return 'economic';
  });

  // Filter nodes to active category, then build per-chain trees.
  const chainTrees = React.useMemo(() => {
    const inCat = nodes.filter(n => nodeCategory(n) === activeTab);
    return buildChainTrees(inCat);
  }, [nodes, activeTab]);

  React.useEffect(() => {
    if (counts[activeTab] > 0 && !disabledCategories.has(activeTab)) return;
    for (const cat of CATEGORY_ORDER) {
      if (counts[cat] > 0 && !disabledCategories.has(cat)) {
        setActiveTab(cat);
        return;
      }
    }
  }, [activeTab, counts, disabledCategories]);

  React.useEffect(() => {
    const handler = (event: Event) => {
      const target = String((event as CustomEvent).detail ?? '');
      if (!target) return;

      const targetNode = nodes.find(node => nodeMatchesBuildingTarget(node, target));
      const targetCategory = targetNode ? nodeCategory(targetNode) : undefined;
      if (!targetCategory || disabledCategories.has(targetCategory)) return;

      pendingTutorialBuildingTargetRef.current = target;
      if (targetCategory !== activeTab) {
        setActiveTab(targetCategory);
        return;
      }

      window.requestAnimationFrame(() => {
        if (pendingTutorialBuildingTargetRef.current === target && scrollTutorialBuildingIntoView(target)) {
          pendingTutorialBuildingTargetRef.current = null;
        }
      });
    };

    window.addEventListener('tutorial:building-target-request', handler);
    return () => window.removeEventListener('tutorial:building-target-request', handler);
  }, [activeTab, disabledCategories, nodes, scrollTutorialBuildingIntoView]);

  React.useLayoutEffect(() => {
    const target = pendingTutorialBuildingTargetRef.current;
    if (!target) return;

    const frameId = window.requestAnimationFrame(() => {
      if (pendingTutorialBuildingTargetRef.current === target && scrollTutorialBuildingIntoView(target)) {
        pendingTutorialBuildingTargetRef.current = null;
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, chainTrees, scrollTutorialBuildingIntoView]);

  const panelLockReason = data?.canBuild === false
    ? (data.cannotBuildReason || 'Construction is not available right now.')
    : '';

  return (
    <PanelLockContext.Provider value={panelLockReason}>
      <div className="bld-panel">
        {panelLockReason && (
          <div className="game-notice game-notice--warning panel-blocked-banner">
            <img src="/assets/icons/I_Locked.png" alt="" className="panel-blocked-banner-icon" />
            <span className="panel-blocked-banner-text">{panelLockReason}</span>
          </div>
        )}

        {liveDataState.pending && !inlineData ? null : !data ? (
          <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.946.8" /></div>
        ) : (
          <>
            <ConstructionSection
              items={queue}
              onUnqueue={canQueueViaBridge ? handleUnqueueBuilding : undefined}
              pendingUnqueueIndices={pendingUnqueueSet}
            />

            <CategoryTabs
              active={activeTab}
              counts={counts}
              disabledCategories={disabledCategories}
              onChange={setActiveTab}
            />

            {chainTrees.length === 0 && (
              <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.963.9" /></div>
            )}

            {chainTrees.map(tree => (
              <div key={nodeAssetKey(tree.root)} className="bld-chain">
                <SectionHeading variant="ornate" title={tree.chainName} />
                <ChainBranch
                  node={tree.root}
                  childrenByParent={tree.children}
                  depth={0}
                  onQueue={canQueueViaBridge ? handleQueueBuilding : undefined}
                  onUnqueue={canQueueViaBridge ? handleUnqueueBuilding : undefined}
                  onPlace={canQueueViaBridge ? handlePlaceBuilding : undefined}
                  onDemolish={canQueueViaBridge ? handleDemolishBuilding : undefined}
                  onDowngrade={canQueueViaBridge ? handleDowngradeBuilding : undefined}
                  queueSummaries={queueSummaries}
                  queueingBuildingIds={queueingBuildingSet}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </PanelLockContext.Provider>
  );
};

export default SettlementBuildingsPanel;

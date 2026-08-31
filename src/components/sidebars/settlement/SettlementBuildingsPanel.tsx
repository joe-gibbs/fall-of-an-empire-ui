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
import GameCheckButton from '../../common/buttons/GameCheckButton';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import {
  demolishSettlementBuilding,
  downgradeSettlementBuilding,
  queueSettlementBuilding,
  repairSettlementBuilding,
  reorderSettlementBuilding,
  unqueueSettlementBuilding,
  useSettlementBuildingsBridgeState,
} from '../../../bridge/settlements-economy/useSettlementBuildingsBridge';
import { startBuildingPlacementBridge } from '../../../bridge/military-map/useBottomBarOperationsBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import BuildingEffects from '../../common/content/BuildingEffects';
import ResourceLink from '../../common/resources/ResourceLink';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { textMatchesSearch } from '../../common/layout/tables/sortUtils';
import { toRootRem } from '../../../utils/cssUnits';
import './SettlementBuildingsPanel.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import { useSettingsBridge } from '../../../bridge/app/useSettingsBridge';
import { useActiveInputDevice } from '../../../hooks/useActiveInputDevice';
import { findActionBinding } from '../../../utils/actionBindings';
import { ActionKeyGlyph } from '../../common/ActionKeyGlyph';

interface Props {
  settlement: Settlement;
}

function useCancelConstructionHint(): React.ReactNode {
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );
  const commandBinding = findActionBinding(settings?.controls, 'Command', activeInputDevice);
  if (!commandBinding) {
    return webUIText('SettlementBuildings.CancelConstruction');
  }
  return (
    <span className="tt-footer-shortcut-row">
      <ActionKeyGlyph binding={commandBinding} />
      <span>{webUIText('SettlementBuildings.CancelConstructionSuffix')}</span>
    </span>
  );
}

/** Reason why the entire panel should treat all available buildings as locked
 *  (e.g. settlement under siege). Empty string = no override. Used by AvailCard
 *  to short-circuit interactivity without prop-drilling through ChainBranch. */
const PanelLockContext = React.createContext<string>('');

interface BuildingLinkTarget {
  assetKey: string;
  name: string;
}

interface BuildingLinkMatch extends BuildingLinkTarget {
  start: number;
  end: number;
}

interface BuildingNavigationContextValue {
  navigateToBuilding: (buildingId: string) => void;
  findRequirementTargets: (
    reason: string | undefined,
    developedFrom: string | undefined,
    requiredBuildings: BuildingRequirement[] | undefined,
  ) => BuildingLinkMatch[];
}

const BuildingNavigationContext = React.createContext<BuildingNavigationContextValue | null>(null);

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

const CATEGORY_LABEL_KEYS: Record<BuildingCategory, string> = {
  economic: 'Ledger.BuildingCategory.Economic',
  military: 'Ledger.BuildingCategory.Military',
  defensive: 'Ledger.BuildingCategory.Defensive',
  infrastructure: 'Ledger.BuildingCategory.Infrastructure',
  cultural: 'Ledger.BuildingCategory.Cultural',
  administrative: 'Ledger.BuildingCategory.Administrative',
  naval: 'Ledger.BuildingCategory.Naval',
  other: 'Economy.Other',
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

function nodeSearchHaystack(node: TreeNode): string {
  if (node.kind === 'built') {
    return [node.b.name, node.b.chainName, node.b.description]
      .filter(Boolean)
      .join(' ');
  }
  return [node.a.name, node.a.chainName, node.a.description]
    .filter(Boolean)
    .join(' ');
}

function nodeMatchesSearch(node: TreeNode, query: string): boolean {
  if (!query) return true;
  return textMatchesSearch(nodeSearchHaystack(node), query);
}

function nodeIsRuin(node: TreeNode): boolean {
  return node.kind === 'built' && node.b.condition !== undefined && node.b.condition <= 0;
}

function nodeIsMaxed(node: TreeNode): boolean {
  if (node.kind !== 'built' || nodeIsRuin(node)) return false;
  return node.b.maxLevel !== undefined && node.b.level >= node.b.maxLevel;
}

function nodeIsPopulationBlocked(node: TreeNode): boolean {
  if (node.kind === 'built') return !!node.b.nextBuildState?.blockedByPopulation;
  return !!node.a.buildState.blockedByPopulation;
}

function nodeIsUnbuildable(node: TreeNode): boolean {
  if (node.kind === 'built') return false;
  return node.a.buildState.state !== 'visible';
}

interface BuildingHideFilters {
  hideMaxed: boolean;
  hideLackingPopulation: boolean;
  hideUnbuildable: boolean;
}

function nodeMatchesHideFilters(
  node: TreeNode,
  filters: BuildingHideFilters,
  queued: boolean,
): boolean {
  if (queued) return true;
  if (filters.hideMaxed && nodeIsMaxed(node)) return false;
  if (filters.hideLackingPopulation && nodeIsPopulationBlocked(node)) return false;
  if (filters.hideUnbuildable && nodeIsUnbuildable(node)) return false;
  return true;
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

function lockReasonIsShownByRequirements(
  targets: BuildingLinkMatch[],
  requiredBuildings?: BuildingRequirement[],
): boolean {
  return targets.some(target => requiredBuildings?.some(requirement => (
    !requirement.met && buildingIdentifierMatches(requirement.assetKey, target.assetKey)
  )));
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

  if (item.statusLabel && !isRoutineQueueState(item.state)) {
    lines.push({ label: item.statusLabel, valueColor: 'var(--red)' });
  }

  if (item.statusReason && !isRoutineQueueState(item.state)) {
    lines.push({ label: item.statusReason });
  }

  for (const missing of item.missingResources ?? []) {
    lines.push({
      label: (
        <ResourceLink resourceId={missing.name}>
          {missing.displayName || missing.name}
        </ResourceLink>
      ),
      get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.223.1", { Value1: n(missing.amount) }); },
      valueIcon: missing.icon,
      valueColor: 'var(--red)',
    });
  }

  return lines;
}

function buildingTooltipBody(description?: string, effectsText?: string): React.ReactNode | undefined {
  if (!description && !effectsText) return undefined;

  return (
    <>
      {description && (
        <div className="bld-tooltip-description">
          {description}
        </div>
      )}
      <BuildingEffects text={effectsText} className="bld-tooltip-effects" />
    </>
  );
}

function addResourceCostLines(lines: TooltipLine[], resourceCost?: BuildingResourceCost[]) {
  if (!resourceCost || resourceCost.length === 0) return;

  lines.push({ label: webUIText('Common.Resources'), isHeader: true });
  for (const cost of resourceCost) {
    lines.push({
      label: (
        <ResourceLink resourceId={cost.name}>
          {cost.displayName || cost.name}
        </ResourceLink>
      ),
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
        ? webUIText('SettlementBuildings.CrossChainRequirement')
        : webUIText('SettlementBuildings.ThisCrossChain'),
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
  requirementTargets: BuildingLinkMatch[] = [],
  onNavigate?: (buildingId: string) => void,
  cancelHint?: React.ReactNode,
): TooltipContent {
  const lines: TooltipLine[] = [];
  const ruined = b.condition !== undefined && b.condition <= 0;
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
    const label = condition >= 80 ? webUIText("SettlementBuildings.Pristine") : condition >= 50 ? webUIText("SettlementBuildings.Worn") : condition >= 20 ? webUIText("SettlementBuildings.Dilapidated") : webUIText("SettlementBuildings.Ruin2");
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.261.4'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.257.1", { Value1: n(condition), Value2: label }); }, valueColor: color });
  }
  if (b.maintenanceGovernanceThreshold !== undefined) {
    lines.push({ label: webUIText('SettlementBuildings.Maintenance'), isHeader: true });
    if (!ruined && b.monthlyConditionChange !== undefined) {
      lines.push({
        label: webUIText('SettlementBuildings.MonthlyConditionChange'),
        value: webUIText('SettlementBuildings.ConditionChangePerMonth', {
          Amount: formatSignedNumber(b.monthlyConditionChange, { maximumFractionDigits: 2 }),
        }),
        valueColor: b.monthlyConditionChange > 0
          ? 'var(--green)'
          : b.monthlyConditionChange < 0
            ? 'var(--red)'
            : 'var(--text-muted)',
      });
    }
    lines.push({
      label: webUIText('SettlementBuildings.GovernanceMaintenance', {
        Governance: n(b.maintenanceGovernanceThreshold),
      }),
    });
  }
  lines.push(...queueTooltipLines(queueSummary));
  if (b.nextBuildState) {
    lines.push({
      label: ruined
        ? webUIText('SettlementBuildings.Rebuild')
        : webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.265.5'),
      isHeader: true,
    });
    if (b.nextLevelPrice !== undefined) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.267.6'), value: n(b.nextLevelPrice), valueIcon: '/assets/icons/I_Coins.png' });
    }
    if (b.nextLevelBuildTime !== undefined) {
      const nextLevelBuildTime = b.nextLevelBuildTime;
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.270.7'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementBuildingsPanel.266.1", { Value1: n(nextLevelBuildTime) }); } });
    }
    addResourceCostLines(lines, b.resourceCost);
    if (lockReason) {
      lines.push({
        label: requirementTargets.length > 0 && onNavigate
          ? (
              <BuildingRequirementText
                reason={lockReason}
                targets={requirementTargets}
                onNavigate={onNavigate}
                variant="tooltip"
              />
            )
          : lockReason,
      });
    }
  }
  addBuildingRequirementLines(lines, b.requiredBuildings);
  return {
    title: b.name,
    body: buildingTooltipBody(b.description, b.effectsText),
    lines,
    afterLines: actions,
    footer: canCancel && displayQueueItem(queueSummary) && cancelHint
      ? cancelHint
      : undefined,
  };
}

function availTooltip(
  a: AvailableBuilding,
  queueSummary?: BuildingQueueSummary,
  lockReason?: string,
  canCancel = false,
  requirementTargets: BuildingLinkMatch[] = [],
  onNavigate?: (buildingId: string) => void,
  cancelHint?: React.ReactNode,
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
    lines.push({
      label: requirementTargets.length > 0 && onNavigate
        ? (
            <BuildingRequirementText
              reason={lockReason}
              targets={requirementTargets}
              onNavigate={onNavigate}
              variant="tooltip"
            />
          )
        : lockReason,
    });
  }
  return {
    title: a.name,
    body: buildingTooltipBody(a.description, a.effectsText),
    lines,
    footer: canCancel && displayQueueItem(queueSummary) && cancelHint
      ? cancelHint
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
          content={{ title: r.displayName || r.name, get body() { return webUIText(amountTooltipKey, { Amount: n(r.amount) }); } }}
          position="bottom"
          delay={150}
        >
          <ResourceLink
            resourceId={r.name}
            className={`bld-res${mode === 'missing' ? ' bld-res--missing' : ''}`}
          >
            <img src={r.icon} alt="" className="bld-res-icon" />
            <span className="bld-res-amt">{n(r.amount)}</span>
          </ResourceLink>
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
        onClick={(event) => {
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
  const buildingNavigation = React.useContext(BuildingNavigationContext);
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
              get body() { return r.met ? webUIText("SettlementBuildings.CrossChainRequirement") : webUIText("SettlementBuildings.ThisCrossChain"); },
              footer: webUIText('SettlementBuildings.ViewRequirement', { Name: r.name }),
            }}
            position="bottom"
            delay={150}
          >
            <button
              type="button"
              className={`bld-requires-item${r.met ? ' bld-requires-item--met' : ' bld-requires-item--missing'}`}
              aria-label={webUIText('SettlementBuildings.ViewRequirement', { Name: r.name })}
              onClick={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                buildingNavigation?.navigateToBuilding(r.assetKey);
              }}
            >
              {r.icon && <img src={r.icon} alt="" className="bld-requires-icon" />}
              <span className="bld-requires-mark">{r.met ? '+' : webUIText("SettlementBuildings.Times")}</span>
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function EffectsBlock({ text }: { text?: string }) {
  return <BuildingEffects text={text} className="bld-effects" />;
}

type BuildingManagementAction = 'repair' | 'downgrade' | 'demolish';

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
  const ruined = building.condition !== undefined && building.condition <= 0;
  const showRepair = !ruined && building.condition !== undefined && building.condition < 100;
  const repairLabel = confirmingAction === 'repair'
    ? webUIText('SettlementBuildings.ConfirmRepair')
    : webUIText('SettlementBuildings.Repair');
  const downgradeLabel = confirmingAction === 'downgrade'
    ? webUIText('SettlementBuildings.ConfirmDowngrade')
    : webUIText('SettlementBuildings.Downgrade');
  const demolishLabel = confirmingAction === 'demolish'
    ? webUIText('SettlementBuildings.ConfirmDismantle')
    : webUIText('SettlementBuildings.Dismantle');
  const actionPending = pendingAction !== null;
  const repairDisabled = actionPending || !building.canRepair;
  const downgradeDisabled = actionPending || !building.canDowngrade;
  const demolishDisabled = actionPending || !building.canDemolish;
  const repairCosts = [
    ...(building.repairGoldCost
      ? [{ name: 'gold', amount: building.repairGoldCost, icon: '/assets/icons/I_Coins.png' }]
      : []),
    ...(building.repairResourceCost ?? []),
  ];

  return (
    <div className="bld-tooltip-actions">
      <div className="bld-tooltip-actions-title">{webUIText('SettlementBuildings.ManageBuilding')}</div>
      {showRepair && (
        <button
          type="button"
          className={`bld-tooltip-action-btn${confirmingAction === 'repair' ? ' bld-tooltip-action-btn--confirm' : ''}`}
          disabled={repairDisabled}
          onClick={event => onAction('repair', event)}
        >
          <span className="bld-tooltip-action-name">{repairLabel}</span>
          <span className="bld-tooltip-action-detail">
            {building.canRepair ? webUIText('SettlementBuildings.RepairBody') : building.repairReason}
          </span>
          {building.canRepair && (
            <span className="bld-tooltip-spoils">
              <span className="bld-tooltip-spoils-label">{webUIText('SettlementBuildings.RepairCost')}</span>
              {repairCosts.length > 0 ? (
                <span className="bld-tooltip-spoils-list">
                  {repairCosts.map(cost => (
                    <span key={cost.name} className="bld-tooltip-spoil">
                      <img src={cost.icon} alt="" className="bld-tooltip-spoil-icon" draggable={false} />
                      {n(cost.amount)}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="bld-tooltip-spoils-empty">{webUIText('SettlementBuildings.NoSpoils')}</span>
              )}
            </span>
          )}
        </button>
      )}
      <button
        type="button"
        className={`bld-tooltip-action-btn${confirmingAction === 'downgrade' ? ' bld-tooltip-action-btn--confirm' : ''}`}
        disabled={downgradeDisabled}
        onClick={event => onAction('downgrade', event)}
      >
        <span className="bld-tooltip-action-name">{downgradeLabel}</span>
        <span className="bld-tooltip-action-detail">
          {building.canDowngrade && building.downgradeTargetName && building.downgradeTargetLevel !== undefined
            ? webUIText('SettlementBuildings.DowngradeTo', { Name: building.downgradeTargetName, Level: n(building.downgradeTargetLevel) })
            : building.downgradeReason}
        </span>
      </button>
      <button
        type="button"
        className={`bld-tooltip-action-btn bld-tooltip-action-btn--danger${confirmingAction === 'demolish' ? ' bld-tooltip-action-btn--confirm' : ''}`}
        disabled={demolishDisabled}
        onClick={event => onAction('demolish', event)}
      >
        <span className="bld-tooltip-action-name">{demolishLabel}</span>
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
      </button>
      {confirmingAction && !pendingAction && (
        <div className="bld-tooltip-confirm-note">{webUIText('SettlementBuildings.PressAgain')}</div>
      )}
    </div>
  );
}

function BuildingRequirementText({
  reason,
  targets,
  onNavigate,
  variant,
}: {
  reason: string;
  targets: BuildingLinkMatch[];
  onNavigate: (buildingId: string) => void;
  variant: 'card' | 'tooltip';
}) {
  const content: React.ReactNode[] = [];
  let cursor = 0;
  for (const target of targets) {
    if (target.start > cursor) {
      content.push(reason.slice(cursor, target.start));
    }
    content.push(
      <button
        key={`${target.assetKey}-${target.start}`}
        type="button"
        className="bld-requirement-link"
        aria-label={webUIText('SettlementBuildings.ViewRequirement', { Name: target.name })}
        onClick={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          onNavigate(target.assetKey);
        }}
      >
        {reason.slice(target.start, target.end)}
      </button>,
    );
    cursor = target.end;
  }
  if (cursor < reason.length) {
    content.push(reason.slice(cursor));
  }

  return (
    <span className={`bld-requirement-text bld-requirement-text--${variant}`}>
      {content}
    </span>
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
  onRepair,
  queueSummary,
  queueing = false,
}: {
  b: Building;
  onQueue?: (buildingId: string, element?: HTMLElement | null) => void;
  onUnqueue?: (queueIndex: number) => void;
  onPlace?: (buildingId: string) => void;
  onDemolish?: (buildingId: string) => Promise<void>;
  onDowngrade?: (buildingId: string) => Promise<void>;
  onRepair?: (buildingId: string) => Promise<void>;
  queueSummary?: BuildingQueueSummary;
  queueing?: boolean;
}) {
  const buildingNavigation = React.useContext(BuildingNavigationContext);
  const cancelHint = useCancelConstructionHint();
  const [confirmingAction, setConfirmingAction] = React.useState<BuildingManagementAction | null>(null);
  const [pendingAction, setPendingAction] = React.useState<BuildingManagementAction | null>(null);
  const panelLockReason = React.useContext(PanelLockContext);
  const ruined = b.condition !== undefined && b.condition <= 0;
  const maxed = !ruined && b.maxLevel !== undefined && b.level >= b.maxLevel;
  const intrinsicLocked = b.nextBuildState !== undefined && b.nextBuildState.state !== 'visible';
  const rawLockReason = queueSummary
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
  const multiLevel = b.maxLevel !== undefined && b.maxLevel > 1;
  const levelText = ruined
    ? webUIText('SettlementBuildings.Ruin')
    : b.maxLevel !== undefined && queuedToLevel !== undefined && queuedToLevel > b.level
    ? `${n(b.level)} -> ${n(queuedToLevel)} / ${n(b.maxLevel)}`
    : maxed
      ? webUIText('SettlementBuildings.Max')
      : (b.maxLevel !== undefined ? `${n(b.level)} / ${n(b.maxLevel)}` : undefined);
  const builtStatusLabel = ruined
    ? webUIText('SettlementBuildings.Ruin')
    : webUIText('SettlementBuildings.Built');
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (actionable) onQueue?.(b.id, event.currentTarget);
  }, [actionable, b.id, onQueue]);
  const handleContextMenu = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!cancellable) return;
    event.preventDefault();
    onUnqueue?.(cancelQueueIndex);
  }, [cancelQueueIndex, cancellable, onUnqueue]);
  const handleManagementAction = React.useCallback((action: BuildingManagementAction, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pendingAction !== null) return;

    const enabled = action === 'repair' ? b.canRepair : action === 'downgrade' ? b.canDowngrade : b.canDemolish;
    const handler = action === 'repair' ? onRepair : action === 'downgrade' ? onDowngrade : onDemolish;
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
  }, [b.canDemolish, b.canDowngrade, b.canRepair, b.id, confirmingAction, onDemolish, onDowngrade, onRepair, pendingAction]);
  const managementActions = (onDemolish || onDowngrade || onRepair) ? (
    <BuildingManagementActions
      building={b}
      confirmingAction={confirmingAction}
      pendingAction={pendingAction}
      onAction={handleManagementAction}
    />
  ) : undefined;
  const rawRequirementTargets = buildingNavigation?.findRequirementTargets(
    rawLockReason,
    b.developedFrom,
    b.requiredBuildings,
  ) ?? [];
  const lockReason = !panelLockReason && lockReasonIsShownByRequirements(rawRequirementTargets, b.requiredBuildings)
    ? undefined
    : rawLockReason;
  const requirementTargets = lockReason ? rawRequirementTargets : [];

  return (
    <Tooltip
      content={builtTooltip(
        b,
        queueSummary,
        lockReason,
        cancellable,
        managementActions,
        requirementTargets,
        buildingNavigation?.navigateToBuilding,
        cancelHint,
      )}
      position="left"
      delay={200}
    >
      <div
        className={
          `bld-node bld-node--built${maxed ? ' bld-node--maxed' : ''}`
          + (actionable ? ' bld-node--actionable' : '')
          + (queueing ? ' bld-node--queueing' : '')
        }
        data-tutorial-target="DynamicBuilding"
        data-tutorial-building-id={b.assetKey ?? b.id}
        data-tutorial-building-class-id={b.id}
        onClick={actionable ? handleClick : undefined}
        onContextMenu={cancellable ? handleContextMenu : undefined}
        role={actionable || cancellable ? 'button' : undefined}
      >
        <div className="bld-node-icon-wrap">
          <img src={b.icon ?? GENERIC_ICON} alt="" className="bld-node-icon" />
          {!ruined && (
            <img
              src="/assets/icons/I_GoalMet.png"
              alt=""
              className="bld-node-built-mark"
              draggable={false}
            />
          )}
        </div>
        <div className="bld-node-body">
          <div className="bld-node-header">
            <span className="bld-node-name">{b.name}</span>
            <span className="bld-node-header-right">
              {multiLevel ? (
                <span className="bld-node-level">
                  <LevelPips
                    level={b.level}
                    maxLevel={b.maxLevel!}
                    queuedToLevel={queuedToLevel}
                  />
                  {levelText && (
                    <span className="bld-node-level-text">
                      {levelText}
                    </span>
                  )}
                </span>
              ) : (
                <span
                  className={
                    `bld-node-status${ruined ? ' bld-node-status--ruin' : ' bld-node-status--built'}`
                  }
                >
                  {!ruined && (
                    <img
                      src="/assets/icons/I_GoalMet.png"
                      alt=""
                      className="bld-node-status-icon"
                      draggable={false}
                    />
                  )}
                  {builtStatusLabel}
                </span>
              )}
              {b.nextLevelPrice !== undefined && (
                <span className="bld-node-cost">
                  <img src="/assets/icons/I_Coins.png" alt="" className="bld-meta-icon" />
                  {n(b.nextLevelPrice)}
                </span>
              )}
              <MapPlaceButton
                buildingId={b.id}
                buildingName={b.name}
                onPlace={onPlace}
              />
            </span>
          </div>
          <EffectsBlock text={b.effectsText} />
          {b.requiredBuildings && b.requiredBuildings.length > 0 && (
            <RequiresRow items={b.requiredBuildings} />
          )}
          <div className="bld-node-meta">
            {b.nextLevelBuildTime !== undefined && (
              <span className="bld-node-meta-item">
                {webUIText("SettlementBuildings.Days", { Value1: n(b.nextLevelBuildTime) })}
              </span>
            )}
            {b.upkeep !== undefined && b.upkeep > 0 && (
              <span className="bld-node-meta-item">
                <img src="/assets/icons/I_Coins.png" alt="" className="bld-meta-icon" />
                {n(b.upkeep)}<WebUIText textKey="Auto.ComponentsSidebarsSettlementBuildingsPanel.470.2" />
              </span>
            )}
            {b.resourceCost && b.resourceCost.length > 0 && (
              <ResourceRow items={b.resourceCost} />
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
  const buildingNavigation = React.useContext(BuildingNavigationContext);
  const cancelHint = useCancelConstructionHint();
  const panelLockReason = React.useContext(PanelLockContext);
  const intrinsicLocked = a.buildState.state !== 'visible';
  const locked = intrinsicLocked || !!panelLockReason;
  // Panel-wide locks (siege/occupation) take precedence over per-building reasons.
  const rawLockReason = queueSummary
    ? undefined
    : panelLockReason || (intrinsicLocked ? a.buildState.reason : undefined);
  const actionable = !!onQueue && !locked;
  const queuedToLevel = queueSummary?.highestToLevel;
  const cancelQueueIndex = cancellationQueueIndex(queueSummary);
  const cancellable = !!onUnqueue && cancelQueueIndex !== undefined;
  const rawRequirementTargets = buildingNavigation?.findRequirementTargets(
    rawLockReason,
    a.developedFrom,
    a.requiredBuildings,
  ) ?? [];
  const lockReason = !panelLockReason && lockReasonIsShownByRequirements(rawRequirementTargets, a.requiredBuildings)
    ? undefined
    : rawLockReason;
  const requirementTargets = lockReason ? rawRequirementTargets : [];
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (actionable) onQueue?.(a.id, event.currentTarget);
  }, [a.id, actionable, onQueue]);
  const handleContextMenu = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!cancellable) return;
    event.preventDefault();
    onUnqueue?.(cancelQueueIndex);
  }, [cancelQueueIndex, cancellable, onUnqueue]);

  return (
    <Tooltip
      content={availTooltip(
        a,
        queueSummary,
        lockReason,
        cancellable,
        requirementTargets,
        buildingNavigation?.navigateToBuilding,
        cancelHint,
      )}
      position="left"
      delay={200}
    >
      <div
        className={
          `bld-node bld-node--avail${locked ? ' bld-node--locked' : ''}`
          + (actionable ? ' bld-node--actionable' : '')
          + (queueing ? ' bld-node--queueing' : '')
        }
        data-tutorial-target="DynamicBuilding"
        data-tutorial-building-id={a.assetKey}
        data-tutorial-building-class-id={a.id}
        onClick={actionable ? handleClick : undefined}
        onContextMenu={cancellable ? handleContextMenu : undefined}
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
          <EffectsBlock text={a.effectsText} />
          {a.requiredBuildings && a.requiredBuildings.length > 0 && (
            <RequiresRow items={a.requiredBuildings} />
          )}
          <div className="bld-node-meta">
            <span className="bld-node-meta-item">
              {webUIText("SettlementBuildings.Days", { Value1: n(a.buildTime) })}
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
            requirementTargets.length > 0 && buildingNavigation ? (
              <div className="game-notice game-notice--warning game-notice--compact bld-node-reason">
                <BuildingRequirementText
                  reason={lockReason}
                  targets={requirementTargets}
                  onNavigate={buildingNavigation.navigateToBuilding}
                  variant="card"
                />
              </div>
            ) : (
              <div className="game-notice game-notice--warning game-notice--compact bld-node-reason">{lockReason}</div>
            )
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
  onRepair,
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
  onRepair?: (buildingId: string) => Promise<void>;
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
    ? <BuiltCard b={node.b} onQueue={onQueue} onUnqueue={onUnqueue} onPlace={onPlace} onDemolish={onDemolish} onDowngrade={onDowngrade} onRepair={onRepair} queueSummary={queueSummary} queueing={queueing} />
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
              onRepair={onRepair}
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

function isRoutineQueueState(state: ConstructionQueueItem['state']): boolean {
  return state === 'queued' || state === 'starting' || state === 'building';
}

type QueueDropPosition = 'before' | 'after';
const QUEUE_DRAG_THRESHOLD = 5;

function finalQueueIndex(
  sourceQueueIndex: number,
  hoveredQueueIndex: number,
  position: QueueDropPosition,
): number {
  if (sourceQueueIndex < hoveredQueueIndex) {
    return position === 'before' ? hoveredQueueIndex - 1 : hoveredQueueIndex;
  }
  return position === 'after' ? hoveredQueueIndex + 1 : hoveredQueueIndex;
}

function QueueItemCard({
  item,
  order,
  onUnqueue,
  pendingRemoval = false,
  canReorder = false,
  dragging = false,
  dropPosition,
  onHandleMouseDown,
}: {
  item: ConstructionQueueItem;
  order: number;
  onUnqueue?: (queueIndex: number) => void;
  pendingRemoval?: boolean;
  canReorder?: boolean;
  dragging?: boolean;
  dropPosition?: QueueDropPosition;
  onHandleMouseDown?: (event: React.MouseEvent<HTMLElement>, item: ConstructionQueueItem) => void;
}) {
  const buildProgressPercent = queueBuildProgressPercent(item);
  const showResourceCost = item.state === 'awaiting_resources' && item.resourceCost.length > 0;
  const showBuildProgress = item.state !== 'awaiting_resources' && buildProgressPercent !== undefined;
  const showStatus = !isRoutineQueueState(item.state);
  const canUnqueue = !!onUnqueue && item.queueIndex !== undefined && !pendingRemoval;

  return (
    <div
      className={
        `bld-queue-card${item.state ? ` bld-queue-card--${item.state}` : ''}`
        + (pendingRemoval ? ' bld-queue-card--pending' : '')
        + (dragging ? ' bld-queue-card--dragging' : '')
        + (dropPosition ? ` bld-queue-card--drop-${dropPosition}` : '')
      }
      data-queue-item-id={item.id}
    >
      {canReorder && !pendingRemoval && (
        <span
          className="bld-queue-card-drag-handle"
          aria-hidden="true"
          onMouseDown={event => onHandleMouseDown?.(event, item)}
        />
      )}
      <div className="bld-queue-card-art">
        <img src={item.icon ?? GENERIC_ICON} alt="" className="bld-queue-card-icon" draggable={false} />
        <span className="bld-queue-card-order">{n(order)}</span>
        {item.kind === 'upgrade' && (
          <span className="bld-queue-card-level">{webUIText("SettlementBuildings.Lv", { Value1: n(item.toLevel) })}</span>
        )}
        {item.kind === 'rebuild' && (
          <span className="bld-queue-card-level">{webUIText('SettlementBuildings.Rebuild')}</span>
        )}
      </div>
      <div className="bld-queue-card-body">
        <div className="bld-queue-card-header">
          <div className="bld-queue-card-title-wrap">
            <span className="bld-queue-card-title">{item.name}</span>
            {showStatus && item.statusLabel && (
              <span className="badge badge--gold bld-queue-card-status">{item.statusLabel}</span>
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
            {item.remainingDays !== undefined ? webUIText("SettlementBuildings.Days2", { Value1: n(item.remainingDays), Value2: n(item.durationDays) }) : webUIText("SettlementBuildings.Days", { Value1: n(item.durationDays) })}
          </span>
        </div>

        {showStatus && item.statusReason && (
          <div className="bld-queue-card-reason">{item.statusReason}</div>
        )}

        {showBuildProgress && (
          <div className="bld-queue-card-progress-block">
            <div className="bld-queue-card-progress-label">
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
  onReorder,
  pendingUnqueueIndices,
  reordering = false,
}: {
  items: ConstructionQueueItem[];
  onUnqueue?: (queueIndex: number) => void;
  onReorder?: (sourceQueueIndex: number, targetQueueIndex: number) => void;
  pendingUnqueueIndices: Set<number>;
  reordering?: boolean;
}) {
  const draggedItemRef = React.useRef<ConstructionQueueItem | null>(null);
  const dragOriginRef = React.useRef<{ x: number; y: number } | null>(null);
  const dragStartedRef = React.useRef(false);
  const sourceCardRef = React.useRef<HTMLDivElement | null>(null);
  const dragCopyRef = React.useRef<HTMLDivElement | null>(null);
  const dropTargetRef = React.useRef<{ item: ConstructionQueueItem; position: QueueDropPosition } | null>(null);
  const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{ itemId: string; position: QueueDropPosition } | null>(null);

  const removeDragCopy = React.useCallback(() => {
    dragCopyRef.current?.remove();
    dragCopyRef.current = null;
  }, []);

  const createDragCopy = React.useCallback(() => {
    const sourceCard = sourceCardRef.current;
    if (!sourceCard || dragCopyRef.current) return;

    const copy = sourceCard.cloneNode(true) as HTMLDivElement;
    copy.classList.remove(
      'bld-queue-card--dragging',
      'bld-queue-card--drop-before',
      'bld-queue-card--drop-after',
    );
    copy.classList.add('bld-queue-drag-copy');
    copy.removeAttribute('data-queue-item-id');
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelector('.bld-queue-card-drag-handle')?.remove();
    copy.style.width = toRootRem(sourceCard.getBoundingClientRect().width);
    document.body.appendChild(copy);
    dragCopyRef.current = copy;
    window.requestAnimationFrame(() => {
      if (copy.isConnected) copy.classList.add('bld-queue-drag-copy--shown');
    });
  }, []);

  const moveDragCopy = React.useCallback((clientX: number, clientY: number) => {
    const copy = dragCopyRef.current;
    if (!copy) return;
    copy.style.transform = `translate3d(${toRootRem(clientX + 14)}, ${toRootRem(clientY + 10)}, 0) rotate(-3deg)`;
  }, []);

  const clearDrag = React.useCallback(() => {
    removeDragCopy();
    draggedItemRef.current = null;
    dragOriginRef.current = null;
    dragStartedRef.current = false;
    sourceCardRef.current = null;
    dropTargetRef.current = null;
    setDraggedItemId(null);
    setDropTarget(null);
  }, [removeDragCopy]);

  const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLElement>, item: ConstructionQueueItem) => {
    if (event.button !== 0 || item.queueIndex === undefined) return;

    event.preventDefault();
    event.stopPropagation();
    draggedItemRef.current = item;
    dragOriginRef.current = { x: event.clientX, y: event.clientY };
    dragStartedRef.current = false;
    sourceCardRef.current = event.currentTarget.closest<HTMLDivElement>('.bld-queue-card');
  }, []);

  const handleMouseMove = React.useCallback((event: MouseEvent) => {
    const source = draggedItemRef.current;
    if (!source) return;

    event.preventDefault();
    event.stopPropagation();
    const origin = dragOriginRef.current;
    if (!dragStartedRef.current && origin) {
      const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      if (distance <= QUEUE_DRAG_THRESHOLD) return;

      dragStartedRef.current = true;
      setDraggedItemId(source.id);
      createDragCopy();
    }
    if (!dragStartedRef.current) return;

    moveDragCopy(event.clientX, event.clientY);
    const pointedElement = document.elementFromPoint(event.clientX, event.clientY);
    const card = pointedElement?.closest<HTMLElement>('.bld-queue-card');
    const itemId = card?.dataset.queueItemId;
    const item = itemId ? items.find(candidate => candidate.id === itemId) : undefined;
    if (!card || !item || source.id === item.id || item.queueIndex === undefined) {
      dropTargetRef.current = null;
      setDropTarget(null);
      return;
    }

    const bounds = card.getBoundingClientRect();
    const position: QueueDropPosition = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    dropTargetRef.current = { item, position };
    setDropTarget(current => (
      current?.itemId === item.id && current.position === position
        ? current
        : { itemId: item.id, position }
    ));
  }, [createDragCopy, items, moveDragCopy]);

  const handleMouseUp = React.useCallback((event: MouseEvent) => {
    const source = draggedItemRef.current;
    const target = dropTargetRef.current;
    if (!source) return;

    event.preventDefault();
    event.stopPropagation();
    let targetQueueIndex: number | undefined;
    if (dragStartedRef.current && source.queueIndex !== undefined && target?.item.queueIndex !== undefined) {
      const finalIndex = finalQueueIndex(source.queueIndex, target.item.queueIndex, target.position);
      if (finalIndex !== source.queueIndex) {
        targetQueueIndex = finalIndex;
      }
    }

    clearDrag();
    if (targetQueueIndex !== undefined && source.queueIndex !== undefined) {
      onReorder?.(source.queueIndex, targetQueueIndex);
    }
  }, [clearDrag, onReorder]);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', clearDrag);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', clearDrag);
      removeDragCopy();
    };
  }, [clearDrag, handleMouseMove, handleMouseUp, removeDragCopy]);

  if (items.length === 0) return null;

  const canReorder = !!onReorder && items.length > 1 && pendingUnqueueIndices.size === 0 && !reordering;

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
            canReorder={canReorder}
            dragging={draggedItemId === item.id}
            dropPosition={dropTarget?.itemId === item.id ? dropTarget.position : undefined}
            onHandleMouseDown={handleMouseDown}
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

interface CategoryCount {
  built: number;
  total: number;
}

function emptyCategoryCounts(): Record<BuildingCategory, CategoryCount> {
  return {
    economic: { built: 0, total: 0 },
    military: { built: 0, total: 0 },
    defensive: { built: 0, total: 0 },
    infrastructure: { built: 0, total: 0 },
    cultural: { built: 0, total: 0 },
    administrative: { built: 0, total: 0 },
    naval: { built: 0, total: 0 },
    other: { built: 0, total: 0 },
  };
}

function CategoryTabs({
  active,
  counts,
  disabledCategories,
  onChange,
}: {
  active: BuildingCategory;
  counts: Record<BuildingCategory, CategoryCount>;
  disabledCategories: Set<BuildingCategory>;
  onChange: (c: BuildingCategory) => void;
}) {
  return (
    <div className="bld-cat-tabs">
      {CATEGORY_ORDER.map(cat => {
        const count = counts[cat];
        const disabled = disabledCategories.has(cat) || count.total === 0;
        const isActive = active === cat;
        return (
          <button
            key={cat}
            className={
              'bld-cat-tab'
              + (isActive ? ' bld-cat-tab--active' : '')
              + (disabled ? ' bld-cat-tab--disabled' : '')
            }
            onClick={disabled ? undefined : () => onChange(cat)}
            disabled={disabled}
          >
            <span className="bld-cat-tab-label">{webUIText(CATEGORY_LABEL_KEYS[cat])}</span>
            <span className="bld-cat-tab-count">{n(count.built)}/{n(count.total)}</span>
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
  const [reorderingQueue, setReorderingQueue] = React.useState(false);
  const queueAnchorRef = React.useRef<QueueAnchor | null>(null);
  const queueingAnimationTimerRef = React.useRef<number | null>(null);
  const pendingQueueBuildingIdsRef = React.useRef<Set<string>>(new Set());
  const pendingBuildingTargetRef = React.useRef<string | null>(null);
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
  const handleReorderBuilding = React.useCallback((sourceQueueIndex: number, targetQueueIndex: number) => {
    if (reorderingQueue) return;

    setReorderingQueue(true);
    reorderSettlementBuilding(settlement.id, sourceQueueIndex, targetQueueIndex)
      .catch(acknowledgeBridgeFailure)
      .finally(() => setReorderingQueue(false));
  }, [reorderingQueue, settlement.id]);
  const handleDemolishBuilding = React.useCallback((buildingId: string) => {
    return demolishSettlementBuilding(settlement.id, buildingId);
  }, [settlement.id]);
  const handleDowngradeBuilding = React.useCallback((buildingId: string) => {
    return downgradeSettlementBuilding(settlement.id, buildingId);
  }, [settlement.id]);
  const handleRepairBuilding = React.useCallback((buildingId: string) => {
    return repairSettlementBuilding(settlement.id, buildingId);
  }, [settlement.id]);

  const built = React.useMemo(() => data?.buildings ?? [], [data]);
  const available = React.useMemo(() => data?.availableBuildings ?? [], [data]);
  const hasPort = data?.hasPort ?? false;
  const queue = React.useMemo(() => data?.construction.queue ?? [], [data]);
  const queueSummaries = React.useMemo(() => buildQueueSummaries(queue), [queue]);
  const [buildingSearch, setBuildingSearch] = React.useState('');
  const [hideMaxed, setHideMaxed] = React.useState(false);
  const [hideLackingPopulation, setHideLackingPopulation] = React.useState(false);
  const [hideUnbuildable, setHideUnbuildable] = React.useState(false);
  const [pinnedBuildingId, setPinnedBuildingId] = React.useState<string | null>(null);
  const [searchSettlementId, setSearchSettlementId] = React.useState(settlement.id);
  if (searchSettlementId !== settlement.id) {
    setSearchSettlementId(settlement.id);
    setBuildingSearch('');
    setPinnedBuildingId(null);
  }
  const searchQuery = buildingSearch.trim();
  const hideFilters = React.useMemo<BuildingHideFilters>(() => ({
    hideMaxed,
    hideLackingPopulation,
    hideUnbuildable,
  }), [hideMaxed, hideLackingPopulation, hideUnbuildable]);
  const filtersActive = hideMaxed || hideLackingPopulation || hideUnbuildable;

  const bringBuildingIntoView = React.useCallback((buildingId: string) => {
    const element = findBuildingNode(buildingId);
    if (!element) return false;

    const viewport = findScrollViewport(element);
    if (viewport) {
      const viewportRect = viewport.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      viewport.scrollTop += elementRect.top - viewportRect.top - 12;
    }

    element.animate(
      [
        { opacity: 1 },
        { opacity: 0.48, offset: 0.42 },
        { opacity: 1 },
      ],
      { duration: 620, easing: 'ease-out' },
    );
    document.querySelectorAll('.bld-node--navigation-target').forEach(node => {
      node.classList.remove('bld-node--navigation-target');
    });
    window.requestAnimationFrame(() => {
      element.classList.add('bld-node--navigation-target');
      window.setTimeout(() => element.classList.remove('bld-node--navigation-target'), 900);
    });
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

  const visibleNodes = React.useMemo(() => {
    return nodes.filter(node => {
      if (pinnedBuildingId && nodeMatchesBuildingTarget(node, pinnedBuildingId)) return true;
      if (!nodeMatchesSearch(node, searchQuery)) return false;
      return nodeMatchesHideFilters(node, hideFilters, queueSummaries.has(nodeAssetKey(node)));
    });
  }, [hideFilters, nodes, pinnedBuildingId, queueSummaries, searchQuery]);

  // Counts per category for tab badges (respect search filter).
  const counts = React.useMemo(() => {
    const c = emptyCategoryCounts();
    for (const node of visibleNodes) {
      const cat = nodeCategory(node);
      if (!cat) continue;
      c[cat].total += 1;
      if (node.kind === 'built') c[cat].built += 1;
    }
    return c;
  }, [visibleNodes]);

  const disabledCategories = React.useMemo(() => {
    const s = new Set<BuildingCategory>();
    if (!hasPort) s.add('naval');
    return s;
  }, [hasPort]);

  // Default tab: first category with buildings.
  const [activeTab, setActiveTab] = React.useState<BuildingCategory>(() => {
    for (const cat of CATEGORY_ORDER) {
      if (counts[cat].total > 0 && !disabledCategories.has(cat)) return cat;
    }
    return 'economic';
  });

  const navigateToBuilding = React.useCallback((target: string) => {
    const targetNode = nodes.find(node => nodeMatchesBuildingTarget(node, target));
    const targetCategory = targetNode ? nodeCategory(targetNode) : undefined;
    if (!targetCategory || disabledCategories.has(targetCategory)) return;

    // Clear search so requirement links can surface buildings outside the
    // current filter, then switch category / scroll into view.
    setBuildingSearch('');
    setPinnedBuildingId(target);
    pendingBuildingTargetRef.current = target;
    if (targetCategory !== activeTab) {
      setActiveTab(targetCategory);
      return;
    }

    window.requestAnimationFrame(() => {
      if (pendingBuildingTargetRef.current === target && bringBuildingIntoView(target)) {
        pendingBuildingTargetRef.current = null;
      }
    });
  }, [activeTab, bringBuildingIntoView, disabledCategories, nodes]);

  const findRequirementTargets = React.useCallback((
    reason: string | undefined,
    developedFrom: string | undefined,
    requiredBuildings: BuildingRequirement[] | undefined,
  ): BuildingLinkMatch[] => {
    if (!reason) return [];

    const candidates = new Map<string, BuildingLinkTarget>();
    for (const node of nodes) {
      const assetKey = nodeAssetKey(node);
      const name = node.kind === 'built' ? node.b.name : node.a.name;
      candidates.set(normaliseBuildingIdentifier(assetKey), { assetKey, name });
    }

    const normalisedReason = reason.toLocaleLowerCase();
    const found: BuildingLinkMatch[] = [];
    for (const candidate of candidates.values()) {
      const normalisedName = candidate.name.toLocaleLowerCase();
      let searchFrom = 0;
      while (searchFrom < normalisedReason.length) {
        const start = normalisedReason.indexOf(normalisedName, searchFrom);
        if (start < 0) break;
        found.push({ ...candidate, start, end: start + normalisedName.length });
        searchFrom = start + normalisedName.length;
      }
    }

    found.sort((left, right) => left.start - right.start || right.end - right.start - (left.end - left.start));
    const matches: BuildingLinkMatch[] = [];
    for (const match of found) {
      const previous = matches[matches.length - 1];
      if (!previous || match.start >= previous.end) {
        matches.push(match);
      }
    }

    if (matches.length > 0) return matches;

    const fallbackTargets = new Map<string, BuildingLinkTarget>();
    if (developedFrom) {
      const predecessor = nodes.find(node => nodeMatchesBuildingTarget(node, developedFrom));
      if (predecessor?.kind === 'avail') {
        fallbackTargets.set(normaliseBuildingIdentifier(developedFrom), {
          assetKey: developedFrom,
          name: predecessor.a.name,
        });
      }
    }
    for (const requirement of requiredBuildings ?? []) {
      const requirementNode = nodes.find(node => nodeMatchesBuildingTarget(node, requirement.assetKey));
      if (!requirement.met && requirementNode) {
        fallbackTargets.set(normaliseBuildingIdentifier(requirement.assetKey), {
          assetKey: requirement.assetKey,
          name: requirementNode.kind === 'built' ? requirementNode.b.name : requirementNode.a.name,
        });
      }
    }

    if (fallbackTargets.size !== 1) return [];
    const fallback = [...fallbackTargets.values()][0];
    return [{ ...fallback, start: 0, end: reason.length }];
  }, [nodes]);

  const buildingNavigation = React.useMemo<BuildingNavigationContextValue>(() => ({
    navigateToBuilding,
    findRequirementTargets,
  }), [findRequirementTargets, navigateToBuilding]);

  // Filter nodes to active category (and search), then build per-chain trees.
  const chainTrees = React.useMemo(() => {
    const inCat = visibleNodes.filter(n => nodeCategory(n) === activeTab);
    return buildChainTrees(inCat);
  }, [visibleNodes, activeTab]);

  React.useEffect(() => {
    if (counts[activeTab].total > 0 && !disabledCategories.has(activeTab)) return;
    for (const cat of CATEGORY_ORDER) {
      if (counts[cat].total > 0 && !disabledCategories.has(cat)) {
        setActiveTab(cat);
        return;
      }
    }
  }, [activeTab, counts, disabledCategories]);

  React.useEffect(() => {
    const handler = (event: Event) => {
      const target = String((event as CustomEvent).detail ?? '');
      if (!target) return;
      navigateToBuilding(target);
    };

    window.addEventListener('tutorial:building-target-request', handler);
    return () => window.removeEventListener('tutorial:building-target-request', handler);
  }, [navigateToBuilding]);

  React.useLayoutEffect(() => {
    const target = pendingBuildingTargetRef.current;
    if (!target) return;

    const frameId = window.requestAnimationFrame(() => {
      if (pendingBuildingTargetRef.current === target && bringBuildingIntoView(target)) {
        pendingBuildingTargetRef.current = null;
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, bringBuildingIntoView, chainTrees]);

  const panelLockReason = data?.canBuild === false
    ? (data.cannotBuildReason || webUIText('SettlementBuildings.ConstructionUnavailable'))
    : '';

  return (
    <BuildingNavigationContext.Provider value={buildingNavigation}>
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
              onUnqueue={canQueueViaBridge && !reorderingQueue ? handleUnqueueBuilding : undefined}
              onReorder={canQueueViaBridge ? handleReorderBuilding : undefined}
              pendingUnqueueIndices={pendingUnqueueSet}
              reordering={reorderingQueue}
            />

            <div className="bld-search-row">
              <div className="search-field bld-search-field">
                <img src="/assets/icons/I_Search.png" alt="" className="search-field__icon" draggable={false} />
                <input
                  type="text"
                  className="search-field__input bld-search-input"
                  placeholder={webUIText('SettlementBuildings.SearchPlaceholder')}
                  value={buildingSearch}
                  onChange={event => {
                    setPinnedBuildingId(null);
                    setBuildingSearch(event.target.value);
                  }}
                />
              </div>
              <div className="bld-filter-row">
                <GameCheckButton
                  checked={hideMaxed}
                  label={webUIText('SettlementBuildings.HideMaxed')}
                  className="game-check-button--compact-label"
                  onToggle={() => {
                    setPinnedBuildingId(null);
                    setHideMaxed(value => !value);
                  }}
                  tooltip={{
                    title: webUIText('SettlementBuildings.HideMaxed'),
                    body: webUIText('SettlementBuildings.HideMaxedTooltip'),
                  }}
                />
                <GameCheckButton
                  checked={hideLackingPopulation}
                  label={webUIText('SettlementBuildings.HideLackingPopulation')}
                  className="game-check-button--compact-label"
                  onToggle={() => {
                    setPinnedBuildingId(null);
                    setHideLackingPopulation(value => !value);
                  }}
                  tooltip={{
                    title: webUIText('SettlementBuildings.HideLackingPopulation'),
                    body: webUIText('SettlementBuildings.HideLackingPopulationTooltip'),
                  }}
                />
                <GameCheckButton
                  checked={hideUnbuildable}
                  label={webUIText('SettlementBuildings.HideUnbuildable')}
                  className="game-check-button--compact-label"
                  onToggle={() => {
                    setPinnedBuildingId(null);
                    setHideUnbuildable(value => !value);
                  }}
                  tooltip={{
                    title: webUIText('SettlementBuildings.HideUnbuildable'),
                    body: webUIText('SettlementBuildings.HideUnbuildableTooltip'),
                  }}
                />
              </div>
            </div>

            <CategoryTabs
              active={activeTab}
              counts={counts}
              disabledCategories={disabledCategories}
              onChange={setActiveTab}
            />

            {chainTrees.length === 0 && (
              <div className="sidebar-placeholder">
                <WebUIText
                  textKey={searchQuery
                    ? 'SettlementBuildings.NoSearchResults'
                    : filtersActive
                      ? 'SettlementBuildings.NoFilterResults'
                      : 'Auto.ComponentsSidebarsSettlementBuildingsPanel.963.9'}
                />
              </div>
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
                  onRepair={canQueueViaBridge ? handleRepairBuilding : undefined}
                  queueSummaries={queueSummaries}
                  queueingBuildingIds={queueingBuildingSet}
                />
              </div>
            ))}
          </>
        )}
        </div>
      </PanelLockContext.Provider>
    </BuildingNavigationContext.Provider>
  );
};

export default SettlementBuildingsPanel;

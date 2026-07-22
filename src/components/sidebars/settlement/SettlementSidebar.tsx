import React from 'react';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import InfoRow from '../../common/data-display/stats/InfoRow';
import InteractionCard from '../../common/interactions/InteractionCard';
import InteractionEffectsTooltip from '../../common/tooltips/InteractionEffectsTooltip';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import RegionTooltip from '../../common/tooltips/RegionTooltip';
import SortableHeader from '../../common/layout/tables/SortableHeader';
import type { Settlement, ModifierSource, Resource, CultureInfo, ReligionInfo, SettlementBishopric } from '../../../data/types';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { useSettlementInteractionsBridge } from '../../../bridge/settlements-economy/useSettlementInteractionsBridge';
import type { SettlementInteractionView } from '../../../bridge/settlements-economy/useSettlementInteractionsBridge';
import { usePinnedItemsBridge, zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { consumePendingSidebarTab } from '../../../bridge/core/useBridgeSidebarEvents';
import {
  navigateSettlementBridge,
  renameSettlementBridge,
  setSettlementCapitalBridge,
} from '../../../bridge/settlements-economy/useSettlementManagementBridge';
import { appointBishop, type DioceseView } from '../../../bridge/settlements-economy/useDiocesesBridge';
import RegionGovernorAppointmentModal from '../../modals/characters/RegionGovernorAppointmentModal';
import BishopAppointmentModal from '../../modals/provinces/BishopAppointmentModal';
import { BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import SidebarTabBar from '../shared/SidebarTabBar';
import SidebarToolbar from '../shared/SidebarToolbar';
import { StatCellGrid, StatCell } from '../shared/StatCellGrid';
import SettlementBuildingsPanel from './SettlementBuildingsPanel';
import SettlementMilitaryPanel from './SettlementMilitaryPanel';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import ResourceLink from '../../common/resources/ResourceLink';
import { successChanceColour } from '../../../utils/colorFormatters';
import { WebkilnAssetPath } from '../../../utils/assets';
import { TIER_ICONS } from '../../../utils/iconMaps';
import { formatNumber, formatPercent as formatPercentValue, formatSignedNumber } from '../../../utils/numberFormat';
import { compareSortValuesWithDirection, toggleSortState, type SortState } from '../../common/layout/tables/sortUtils';
import { registerSidebar } from '../../../registry/index';
import { useSettlement } from '../../../data-source/index';
import '../shared/Sidebar.css';
import './SettlementSidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import { formatSettlementType } from '../../../utils/displayLabels';
interface SettlementSidebarProps {
  settlement: Settlement;
  onClose: () => void;
}

function getUnrestColor(unrest: number): string {
  if (unrest <= 10) return 'var(--green)';
  if (unrest <= 20) return 'var(--orange)';
  return 'var(--red)';
}

/** Local fallback for the unrest label — used only if the bridge didn't
 *  supply one. The game side is the source
 *  of truth for real settlements. Matches the AS thresholds in
 *  GetSettlementDataAction.UnrestLabelForValue. */
function getUnrestLabelFallback(unrest: number): string {
  if (unrest >= 75) return webUIText("Auto.Return.componentssidebarsSettlementSidebar.60.1");
  if (unrest >= 50) return webUIText("Auto.Return.componentssidebarsSettlementSidebar.61.1");
  if (unrest >= 25) return webUIText("Auto.Return.componentssidebarsSettlementSidebar.62.1");
  if (unrest >= 10) return webUIText("Auto.Return.componentssidebarsSettlementSidebar.63.1");
  return webUIText("Auto.Return.componentssidebarsSettlementSidebar.64.1");
}

function getFoodColor(prod: number, cons: number): string {
  const net = prod - cons;
  if (net > 2) return 'var(--green)';
  if (net >= 0) return 'var(--gold)';
  return 'var(--red)';
}

const settlementTypeIcons: Record<string, string> = {
  city: '/assets/icons/I_City.png',
  town: '/assets/icons/I_Town.png',
  village: '/assets/icons/I_Village.png',
  metropolis: '/assets/icons/I_Metropolis.png',
  fortress: '/assets/icons/I_Fortress.png',
  monastery: '/assets/icons/I_Monastery.png',
  port: '/assets/icons/I_Port.png',
  mining: '/assets/icons/I_Mining.png',
};

const settlementTypeHeaderBg: Record<string, string> = {
  city: '/assets/events/settlement-city.png',
  town: '/assets/events/settlement-town.png',
  village: '/assets/events/settlement-village.png',
  metropolis: '/assets/events/settlement-metropolis.png',
  fortress: '/assets/events/settlement-fortress.png',
  monastery: '/assets/events/settlement-monastery.png',
  port: '/assets/events/settlement-port.png',
  mining: '/assets/events/settlement-mining.png',
};

function buildInteractionTooltip(i: SettlementInteractionView, settlementId: string): TooltipContent {
  const lines: TooltipLine[] = [];

  lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.99.1'), labelIcon: i.scope === 'region' ? '/assets/icons/I_Region.png' : '/assets/icons/I_City.png', get value() { return i.scope === 'region' ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementSidebar.99.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementSidebar.99.1"); } });

  if (i.goldCost > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.102.2'), value: formatNumber(i.goldCost), valueIcon: '/assets/icons/I_Coins.png' });
  }

  if (i.inProgress && i.remainingDays > 0) {
    const days = Math.round(i.remainingDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.107.3'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.107.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else {
    const days = Math.round(i.durationDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.111.5'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.111.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  }

  if (i.needsDestinationSelection) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.115.6'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.115.1"); } });
  }

  if (i.successFactors.length > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.120.7'),
      value: formatPercentValue(i.successChancePercent),
      valueColor: successChanceColour(i.successChancePercent),
      isHeader: true,
    });
    for (const f of i.successFactors) {
      lines.push({
        label: f.name,
        value: `${formatSignedNumber(f.percent)}%`,
        valueColor: f.percent >= 0 ? 'var(--green)' : 'var(--red)',
      });
    }
  }

  if (i.cooldownDays > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.135.8'), labelIcon: '/assets/icons/I_Cooling.png', get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.135.1", { Value1: formatNumber(i.cooldownDays) }); } });
  }

  if (i.reasons.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.139.9'), isHeader: true });
    for (const r of i.reasons) {
      lines.push({ label: r.reason, valueColor: 'var(--red)' });
    }
  }

  const body = i.inProgress && i.remainingDays > 0
    ? (
      <>
        <span>{i.description}</span>
        <BureaucraticRushTooltipAction
          actionId={`settlement:${i.id}`}
          targetId={settlementId}
          daysSaved={i.bureaucraticRushDaysSaved}
          overloadLoad={i.bureaucraticRushLoad}
        />
      </>
    )
    : i.description;

  return {
    title: i.name,
    body,
    lines,
    afterLines: <InteractionEffectsTooltip lines={i.effectLines} />,
  };
}

function showHintKey(hintKey: string, force: boolean = true) {
  bridgeCall('game.hint_events', {
    command: 'show',
    hintKey,
    force,
  }).catch(acknowledgeBridgeFailure);
}

function refreshSettlementData(settlementId: string): void {
  bridgeCall('game.get_settlement_data', { settlementId })
    .then((fresh) => {
      bridgeEvents.dispatchEvent(new CustomEvent('game.get_settlement_data', { detail: fresh }));
    })
    .catch(acknowledgeBridgeFailure);
}

function setSettlementAmbient(enabled: boolean): void {
  bridgeCall('game.set_settlement_sidebar_ambient', { enabled }).catch(acknowledgeBridgeFailure);
}

/** Format a percentage: whole number if >= 1%, else one decimal. */
function formatPercent(p: number): string {
  return formatNumber(p, { maximumFractionDigits: p >= 1 ? 0 : 1 });
}

/** Convert breakdown sources into tooltip lines, formatting the value per kind.
 *  `inverted` flips the colour semantics (used for unrest, where +value is bad). */
function breakdownLines(
  sources: ModifierSource[] | undefined,
  format: (v: number) => string,
  inverted: boolean = false,
): TooltipContent['lines'] {
  if (!sources || sources.length === 0) return undefined;
  // Sort by absolute value descending so the most impactful rows come first.
  const sorted = [...sources].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return sorted.map(s => {
    const good = inverted ? s.value < 0 : s.value >= 0;
    return {
      label: s.name,
      value: (s.value >= 0 ? '+' : '') + format(s.value),
      valueColor: good ? 'var(--green)' : 'var(--red)',
    };
  });
}

interface ShareEntry {
  id?: string;
  name: string;
  percent: number;
  color: string;
  icon?: string;
  description?: string;
  info?: CultureInfo | ReligionInfo;
  monthlyChangePercent?: number;
  pressureSources?: ModifierSource[];
  conversionResistancePercent?: number;
  zealousMinority?: boolean;
  naturallyGrowing?: boolean;
  naturallyDeclining?: boolean;
  persecutionResilience?: boolean;
}

function yesNoLine(label: string, value: boolean | undefined): TooltipLine | null {
  if (value === undefined) return null;
  return {
    label,
    value: webUIText(value ? 'Common.Yes' : 'Common.No'),
    valueColor: value ? 'var(--green)' : 'var(--text-muted)',
  };
}

function buildShareTooltip(entry: ShareEntry, kind: 'culture' | 'religion'): TooltipContent {
  const lines: TooltipLine[] = [];
  const change = entry.monthlyChangePercent ?? 0;
  const stable = Math.abs(change) < 0.01;
  lines.push({
    label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.224.10'),
    value: stable ? webUIText('Settlement.Stable') : `${formatSignedNumber(change, { maximumFractionDigits: 2 })}%`,
    valueColor: stable ? 'var(--text-muted)' : change > 0 ? 'var(--green)' : 'var(--red)',
  });

  if (entry.pressureSources && entry.pressureSources.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.230.11'), isHeader: true });
    for (const source of entry.pressureSources) {
      lines.push({
        label: source.name,
        value: `${formatSignedNumber(source.value, { maximumFractionDigits: 2 })}%`,
        valueColor: source.value >= 0 ? 'var(--green)' : 'var(--red)',
      });
    }
  } else {
    lines.push({ label: webUIText('Settlement.NoPressureSources'), value: webUIText('Settlement.Decaying'), valueColor: 'var(--text-muted)' });
  }

  if (kind === 'culture') {
    const info = entry.info as CultureInfo | undefined;
    if (info) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.245.12'), isHeader: true });
      [yesNoLine(webUIText('Settlement.RecruitableAsAuxiliaries'), info.canRecruitAsAuxiliaries)]
        .filter((line): line is TooltipLine => !!line)
        .forEach(line => lines.push(line));
    }
  } else {
    if ((entry.conversionResistancePercent ?? 0) > 0) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.252.13'), value: `${formatNumber(entry.conversionResistancePercent ?? 0)}%` });
    }
    if (entry.zealousMinority) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.254.14'), value: webUIText('Settlement.ResistingConversion'), valueColor: 'var(--gold)' });
    if (entry.naturallyGrowing) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.255.15'), value: webUIText('Settlement.Growing'), valueColor: 'var(--green)' });
    if (entry.naturallyDeclining) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.256.16'), value: webUIText('Settlement.Declining'), valueColor: 'var(--red)' });
    if (entry.persecutionResilience) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.257.17'), value: webUIText('Settlement.StrengtheningResolve'), valueColor: 'var(--gold)' });
  }

  return {
    get title() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.261.1", { Name: entry.name, Value2: formatPercent(entry.percent) }); },
    body: entry.description,
    lines,
  };
}

function findBishopricForShare(entry: ShareEntry, bishoprics?: SettlementBishopric[]): SettlementBishopric | undefined {
  if (!bishoprics || bishoprics.length === 0) return undefined;
  return bishoprics.find(b => (!!entry.id && b.religionKey === entry.id) || b.religionName === entry.name);
}

function TooltipLineList({ lines }: { lines?: TooltipLine[] }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="tt-lines">
      {lines.map((line, i) => line.isHeader ? (
        <div key={i} className="tt-line tt-line--header">
          <span className="tt-line-header-label">{line.label}</span>
        </div>
      ) : (
        <div key={i} className="tt-line">
          <span className="tt-line-label">
            {line.labelIcon && <img src={line.labelIcon} alt="" className="tt-line-label-icon" draggable={false} />}
            <span style={line.labelColor ? { color: line.labelColor } : undefined}>{line.label}</span>
          </span>
          {(line.value !== undefined || line.valueIcon) && (
            <span className="tt-line-value" style={line.valueColor ? { color: line.valueColor } : undefined}>
              {line.valueIcon && <img src={line.valueIcon} alt="" className="tt-line-icon" draggable={false} />}
              {line.value !== undefined && <span>{line.value}</span>}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ShareTooltipPanel({
  entry,
  kind,
  bishopric,
  settlement,
  onOpenBishopModal,
  onDismissBishop,
}: {
  entry: ShareEntry;
  kind: 'culture' | 'religion';
  bishopric?: SettlementBishopric;
  settlement?: Settlement;
  onOpenBishopModal?: (bishopric: SettlementBishopric) => void;
  onDismissBishop?: (bishopric: SettlementBishopric) => void;
}) {
  const data = buildShareTooltip(entry, kind);
  const showClergy = kind === 'religion' && bishopric && settlement;
  const followerPercent = bishopric ? formatPercentValue(bishopric.landReligionShare * 100) : '';
  const canManage = !!bishopric?.canManage;

  return (
    <div className="settle-share-tooltip">
      {data.title && <div className="tt-title">{data.title}</div>}
      {data.body && <div className="tt-body">{data.body}</div>}
      <TooltipLineList lines={data.lines} />
      {showClergy && bishopric && settlement && (
        <div className="settle-share-clergy-panel">
          <div className="settle-share-clergy-head">
            <span className="settle-share-clergy-title">{bishopric.clergyTitle}</span>
            <span className="settle-share-clergy-land">{settlement.land}</span>
          </div>
          <div className="settle-share-clergy-row">
            {bishopric.bishop ? (
              <PersonTooltip characterId={bishopric.bishop.id} position="right" delay={200}>
                <Portrait personId={bishopric.bishop.id} name={bishopric.bishop.name} size="sm" shape="circle" showBorder borderTier="bronze" />
              </PersonTooltip>
            ) : (
              <img src={bishopric.religionIcon} alt="" className="settle-share-clergy-empty-icon" />
            )}
            <div className="settle-share-clergy-copy">
              <span className="settle-share-clergy-name">{bishopric.bishop ? bishopric.bishop.name : webUIText("Auto.Fix.ExprFalse.componentssidebarsSettlementSidebar.336.1", { ClergyTitle: bishopric.clergyTitle })}</span>
              <span className="settle-share-clergy-meta">{formatNumber(bishopric.landFollowers)} <WebUIText textKey="Auto.ComponentsSidebarsSettlementSidebar.336.1" /> {followerPercent}</span>
            </div>
            {canManage && (
              <div className="settle-share-clergy-actions">
                <button
                  type="button"
                  className="settle-share-clergy-action-btn"
                  onMouseDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenBishopModal?.(bishopric);
                  }}
                >
                  <img src={bishopric.bishop ? "/assets/icons/I_ReplaceGovernor.png" : "/assets/icons/I_Bishop.png"} alt="" />
                </button>
                {bishopric.bishop && (
                  <button
                    type="button"
                    className="settle-share-clergy-action-btn"
                    onMouseDown={(event) => {
                      if (event.button !== 0) return;
                      event.preventDefault();
                      event.stopPropagation();
                      onDismissBishop?.(bishopric);
                    }}
                  >
                    <img src="/assets/ui/I_CloseIcon.png" alt="" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Wraps a single share trigger (bar segment or legend row) in settlement-specific dynamics. */
function ShareTooltipWrap({
  entry,
  kind,
  bishoprics,
  settlement,
  onOpenBishopModal,
  onDismissBishop,
  children,
}: {
  entry: ShareEntry;
  kind: 'culture' | 'religion';
  bishoprics?: SettlementBishopric[];
  settlement?: Settlement;
  onOpenBishopModal?: (bishopric: SettlementBishopric) => void;
  onDismissBishop?: (bishopric: SettlementBishopric) => void;
  children: React.ReactNode;
}) {
  const bishopric = kind === 'religion' ? findBishopricForShare(entry, bishoprics) : undefined;
  return (
    <Tooltip
      content={kind === 'religion'
        ? (
            <ShareTooltipPanel
              entry={entry}
              kind={kind}
              bishopric={bishopric}
              settlement={settlement}
              onOpenBishopModal={onOpenBishopModal}
              onDismissBishop={onDismissBishop}
            />
          )
        : buildShareTooltip(entry, kind)}
      position="bottom"
      delay={200}
      bubbleClassName={kind === 'religion' ? 'tt-bubble--settle-share' : undefined}
    >
      {children}
    </Tooltip>
  );
}

function buildResourceTooltip(r: Resource): TooltipContent {
  const lines: TooltipLine[] = [];
  const prodStr = formatNumber(r.production, { maximumFractionDigits: 1 });
  const potential = r.potentialProduction ?? r.production;
  const potentialStr = formatNumber(potential, { maximumFractionDigits: 1 });
  const consStr = formatNumber(r.consumption, { maximumFractionDigits: 1 });
  const net = r.production - r.consumption;
  const netStr = formatSignedNumber(net, { maximumFractionDigits: 1 });

  lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.440.21'), value: formatNumber(r.amount, { maximumFractionDigits: 1 }), valueColor: 'var(--gold)' });
  if ((r.stockpile ?? r.amount) !== r.amount || (r.reserved ?? 0) > 0 || (r.demand ?? 0) > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.442.22'), value: formatNumber(r.stockpile ?? r.amount, { maximumFractionDigits: 1 }) });
    if ((r.reserved ?? 0) > 0) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.443.23'), value: formatNumber(r.reserved ?? 0, { maximumFractionDigits: 1 }), valueColor: 'var(--orange)' });
    if ((r.demand ?? 0) > 0) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.444.24'), value: formatNumber(r.demand ?? 0, { maximumFractionDigits: 1 }), valueColor: 'var(--red)' });
  }
  lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.446.25'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.446.1", { NetStr: netStr }); }, valueColor: net > 0 ? 'var(--green)' : net < 0 ? 'var(--red)' : 'var(--text-muted)' });
  if (r.status) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.448.26'), value: r.status, valueColor: (r.shortage ?? 0) > 0 ? 'var(--red)' : 'var(--green)' });
  }
  if ((r.shortage ?? 0) > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.451.27'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.451.1", { Value1: formatNumber(r.shortage ?? 0, { maximumFractionDigits: 1 }), Value2: formatNumber(r.shortagePercent ?? 0, { maximumFractionDigits: 0 }) }); }, valueColor: 'var(--red)' });
  }
  if (r.depleting) {
    const months = r.monthsUntilDepletion ?? 0;
    const depletion = months <= 0 ? 'Depleted' : months < 1 ? '< 1 month' : `${formatNumber(months, { maximumFractionDigits: 1 })} months`;
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.456.28'), value: depletion, valueColor: months > 0 && months >= 6 ? 'var(--text-muted)' : 'var(--orange)' });
  }

  if (r.siegeHalted) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.460.29'), value: '', valueColor: 'var(--red)' });
  } else if (r.productionSources && r.productionSources.length > 0) {
    lines.push({ get label() { return potential > r.production + 0.05 ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementSidebar.462.1", { ProdStr: prodStr, PotentialStr: potentialStr }) : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementSidebar.462.1", { ProdStr: prodStr }); }, isHeader: true });
    r.productionSources.forEach(s => {
      lines.push({ label: s.name, get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.464.1", { Value1: formatSignedNumber(s.value, { maximumFractionDigits: 1 }) }); }, valueColor: 'var(--green)' });
    });
  } else if (r.production > 0.01) {
    // Fallback when bridge did not populate sources.
    lines.push({ get label() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.468.1", { ProdStr: prodStr }); }, isHeader: true });
    if (r.isNatural) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.470.30'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.470.1", { ProdStr: prodStr }); }, valueColor: 'var(--green)' });
    }
  }

  if (r.bottlenecks && r.bottlenecks.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.475.31'), isHeader: true });
    for (const issue of r.bottlenecks) {
      lines.push({ label: issue.name, value: issue.details, valueColor: 'var(--orange)' });
    }
  }

  if (r.consumptionSources && r.consumptionSources.length > 0) {
    lines.push({ get label() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.482.1", { ConsStr: consStr }); }, isHeader: true });
    r.consumptionSources.forEach(s => {
      lines.push({ label: s.name, get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.484.1", { Value1: formatNumber(s.value, { maximumFractionDigits: 1 }) }); }, valueColor: 'var(--red)' });
    });
  }

  return {
    title: r.name,
    get body() { return r.isNatural ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementSidebar.490.1", { Value1: r.categoryName ? r.categoryName.toLowerCase() : webUIText("Auto.Fix.PropExprTrueArgFalse.componentssidebarsSettlementSidebar.490.1") }) : r.categoryName; },
    lines,
  };
}

/** Horizontal stacked share bar */
function ShareBar({
  shares,
  kind,
  bishoprics,
  settlement,
  onOpenBishopModal,
  onDismissBishop,
}: {
  shares: ShareEntry[];
  kind: 'culture' | 'religion';
  bishoprics?: SettlementBishopric[];
  settlement?: Settlement;
  onOpenBishopModal?: (bishopric: SettlementBishopric) => void;
  onDismissBishop?: (bishopric: SettlementBishopric) => void;
}) {
  return (
    <div className="settle-share-bar">
      {shares.map(s => (
        <div key={s.name} className="settle-share-segment-wrap" style={{ width: s.percent + '%' }}>
          <ShareTooltipWrap entry={s} kind={kind} bishoprics={bishoprics} settlement={settlement} onOpenBishopModal={onOpenBishopModal} onDismissBishop={onDismissBishop}>
            <div className="settle-share-segment" style={{ backgroundColor: s.color }} />
          </ShareTooltipWrap>
        </div>
      ))}
    </div>
  );
}

/** Legend row for shares */
function ShareLegend({
  shares,
  kind,
  bishoprics,
  settlement,
  onOpenBishopModal,
  onDismissBishop,
}: {
  shares: ShareEntry[];
  kind: 'culture' | 'religion';
  bishoprics?: SettlementBishopric[];
  settlement?: Settlement;
  onOpenBishopModal?: (bishopric: SettlementBishopric) => void;
  onDismissBishop?: (bishopric: SettlementBishopric) => void;
}) {
  return (
    <div className="settle-share-legend">
      {shares.map(s => (
        <ShareTooltipWrap key={s.name} entry={s} kind={kind} bishoprics={bishoprics} settlement={settlement} onOpenBishopModal={onOpenBishopModal} onDismissBishop={onDismissBishop}>
          <div className="settle-share-legend-item">
            {s.icon ? <img src={s.icon} alt="" className="settle-share-legend-icon" /> : <span className="settle-share-dot" style={{ backgroundColor: s.color }} />}
            <span className="settle-share-label">{s.name}</span>
            <span className="settle-share-pct">{formatPercent(s.percent)}%</span>
          </div>
        </ShareTooltipWrap>
      ))}
    </div>
  );
}

type PopSortKey = 'name' | 'population' | 'unrest';

function buildUnrestTooltip(settlement: Settlement, unrestRounded: string, unrestLabel: string): TooltipContent {
  const lines: TooltipLine[] = [
    ...(breakdownLines(settlement.unrestBreakdown, v => `${formatNumber(v, { maximumFractionDigits: 1 })}%`, true) ?? []),
    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.566.32'), isHeader: true },
    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.567.33'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.567.1"); } },
    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.568.34'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.568.1"); } },
    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.569.35'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.569.1"); } },
    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.570.36'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.570.1"); } },
  ];

  if (settlement.pops.length > 1) {
    const sorted = [...settlement.pops].sort((a, b) => b.unrest - a.unrest);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    if (highest && lowest && highest !== lowest) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.578.37'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.578.1", { Culture: highest.culture, Value2: formatPercentValue(highest.unrest) }); }, valueColor: 'var(--red)' });
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.579.38'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.579.1", { Culture: lowest.culture, Value2: formatPercentValue(lowest.unrest) }); }, valueColor: 'var(--green)' });
    }
  }

  return {
    get title() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.584.1", { UnrestRounded: unrestRounded, UnrestLabel: unrestLabel }); },
    body: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.585.39'),
    lines,
  };
}

function buildPopulationGrowthTooltip(settlement: Settlement): TooltipContent {
  const lines: TooltipLine[] = [
    ...(breakdownLines(settlement.growthBreakdown, v => `${formatNumber(v, { maximumFractionDigits: 2 })}%`) ?? []),
  ];

  if (settlement.pops.length > 1) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.596.40'), isHeader: true });
    for (const pop of settlement.pops) {
      const growth = pop.monthlyGrowth ?? 0;
      lines.push({
        label: pop.culture,
        value: formatSignedNumber(growth),
        valueColor: growth > 0 ? 'var(--green)' : growth < 0 ? 'var(--red)' : 'var(--text-muted)',
      });
    }
  }

  return {
    title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.608.41'),
    get body() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.609.1", { Value1: formatNumber(settlement.population), Value2: formatSignedNumber(settlement.populationGrowth, { maximumFractionDigits: 1 }) }); },
    lines,
  };
}

function buildDiseaseTooltip(settlement: Settlement): TooltipContent {
  const disease = settlement.disease;
  if (!disease) return { title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.616.42') };
  const lines: TooltipLine[] = [
    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.618.43'), value: disease.severityLabel, valueColor: disease.severity >= 0.9 ? 'var(--red)' : disease.severity >= 0.6 ? 'var(--orange)' : 'var(--gold)' },
    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.619.44'), value: formatNumber(disease.deaths), valueColor: 'var(--red)' },
  ];
  if (disease.daysRemaining > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.622.45'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.622.1", { Value1: formatNumber(disease.daysRemaining), Value2: webUIText(disease.daysRemaining === 1 ? 'Common.Day' : 'Common.Days') }); } });
  }
  if (disease.effects.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.625.46'), isHeader: true });
    for (const effect of disease.effects) {
      lines.push({
        label: effect.name,
        value: `${formatSignedNumber(effect.value, { maximumFractionDigits: 0 })}%`,
        valueColor: effect.value < 0 ? 'var(--red)' : 'var(--green)',
      });
    }
  }
  return { title: disease.name, body: disease.description, lines };
}

function bishopricToAssignment(settlement: Settlement, bishopric: SettlementBishopric): DioceseView {
  return {
    id: settlement.landKey || settlement.land,
    landKey: settlement.landKey || settlement.land,
    landName: settlement.land,
    bishopId: bishopric.bishop?.id ?? null,
    bishopName: bishopric.bishop?.name ?? null,
    bishopPortrait: null,
    authority: bishopric.authority,
    followerPercent: bishopric.landReligionShare,
    followers: bishopric.landFollowers,
    landPopulation: bishopric.landPopulation,
  };
}

function HintSectionHeading({ title, hintKey }: { title: string; hintKey?: string }) {
  if (!hintKey) return <SectionHeading variant="ornate" title={title} />;
  return (
    <div className="settle-section-heading-with-action">
      <SectionHeading variant="ornate" title={title} />
      <Tooltip content={{ get title() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.657.1", { Title: title }); } }} position="left" delay={200}>
        <button type="button" className="settle-section-help-btn" onMouseDown={(event) => { event.preventDefault(); showHintKey(hintKey); }}>
          <img src="/assets/ui/I_HelpIcon.png" alt="" />
        </button>
      </Tooltip>
    </div>
  );
}

type SettlementSidebarTab = 'general' | 'buildings' | 'military' | 'garrison';

function settlementTabFromIndex(tabIndex: number | undefined): SettlementSidebarTab | null {
  if (tabIndex === 0) return 'general';
  if (tabIndex === 1) return 'buildings';
  if (tabIndex === 2) return 'military';
  if (tabIndex === 3) return 'garrison';
  return null;
}

const SettlementSidebar: React.FC<SettlementSidebarProps> = ({ settlement, onClose }) => {
  const { showAdvisor, openSidebar } = useGameActions();
  const { debugMode } = useGameState();
  const [activeTab, setActiveTab] = React.useState<SettlementSidebarTab>('general');
  const [showAllPops, setShowAllPops] = React.useState(false);
  const [popSort, setPopSort] = React.useState<SortState<PopSortKey>>({ key: 'population', direction: 'desc' });
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState(settlement.name);
  const [governorModalOpen, setGovernorModalOpen] = React.useState(false);
  const [bishopModal, setBishopModal] = React.useState<{ bishopric: SettlementBishopric; assignment: DioceseView } | null>(null);
  const { isPinned: checkPinned, togglePin } = usePinnedItemsBridge();
  const isPinned = checkPinned('settlement', settlement.id);

  const { state: interactionsState, start: startInteraction, cancel: cancelInteraction } = useSettlementInteractionsBridge(settlement.id);
  const interactions = interactionsState?.interactions ?? [];

  React.useEffect(() => {
    setSettlementAmbient(true);
    return () => setSettlementAmbient(false);
  }, []);

  React.useEffect(() => {
    setIsRenaming(false);
    setRenameDraft(settlement.name);
    setGovernorModalOpen(false);
    setBishopModal(null);
    setShowAllPops(false);
  }, [settlement.id, settlement.name]);

  React.useEffect(() => {
    const pendingTab = settlementTabFromIndex(consumePendingSidebarTab('settlement', settlement.id));
    if (pendingTab) setActiveTab(pendingTab);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { type?: string; id?: string; tabIndex?: number } | undefined;
      if (!detail || detail.type !== 'settlement' || detail.id !== settlement.id) return;

      const tab = settlementTabFromIndex(detail.tabIndex);
      if (tab) setActiveTab(tab);
    };

    bridgeEvents.addEventListener('ui.sidebar_tab_event', handler);
    return () => bridgeEvents.removeEventListener('ui.sidebar_tab_event', handler);
  }, [settlement.id]);

  const foodNet = settlement.foodProduction - settlement.foodConsumption;
  const foodColor = getFoodColor(settlement.foodProduction, settlement.foodConsumption);
  const unrestColor = getUnrestColor(settlement.unrest);
  const unrestPct = Math.min(100, settlement.unrest);
  const unrestRounded = formatNumber(settlement.unrest);
  const unrestLabel = settlement.unrestLabel ?? getUnrestLabelFallback(settlement.unrest);
  const foodNetRounded = foodNet >= 0 ? Math.floor(foodNet) : Math.ceil(foodNet);
  const foodProdRounded = Math.round(settlement.foodProduction);
  const foodConsRounded = Math.round(settlement.foodConsumption);

  const siege = settlement.siege;
  const canRename = !!settlement.canRename;
  const canManageGovernor = !!settlement.canManageGovernor;

  const sortedPops = React.useMemo(() => {
    const sorted = [...settlement.pops];
    sorted.sort((a, b) => {
      if (popSort.key === 'population') return compareSortValuesWithDirection(a.count, b.count, popSort.direction);
      if (popSort.key === 'unrest') return compareSortValuesWithDirection(a.unrest, b.unrest, popSort.direction);
      return compareSortValuesWithDirection(`${a.cultureAdjective} ${a.religionAdherentPlural}`, `${b.cultureAdjective} ${b.religionAdherentPlural}`, popSort.direction);
    });
    return sorted;
  }, [settlement.pops, popSort]);

  const visiblePops = showAllPops ? sortedPops : sortedPops.slice(0, 3);

  const resourceCategories = React.useMemo(() => settlement.resourceCategories ?? [], [settlement.resourceCategories]);
  const resourcesByCategory = React.useMemo(() => {
    const groups = new Map<string, Resource[]>();
    for (const resource of settlement.resources) {
      const key = resource.category || 'other';
      const list = groups.get(key) ?? [];
      list.push(resource);
      groups.set(key, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [settlement.resources]);

  const confirmRename = React.useCallback(() => {
    const nextName = renameDraft.trim();
    if (!nextName) return;
    setIsRenaming(false);
    if (nextName !== settlement.name) {
      void renameSettlementBridge(settlement.id, nextName);
    }
  }, [renameDraft, settlement.id, settlement.name]);

  const cancelRename = React.useCallback(() => {
    setRenameDraft(settlement.name);
    setIsRenaming(false);
  }, [settlement.name]);

  const handleRenameKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  }, [confirmRename, cancelRename]);

  const handleNavigate = React.useCallback((direction: -1 | 1) => {
    void navigateSettlementBridge(settlement.id, direction);
  }, [settlement.id]);

  const handleSetCapital = React.useCallback(() => {
    if (!settlement.canSetCapital) return;
    void setSettlementCapitalBridge(settlement.id);
  }, [settlement.canSetCapital, settlement.id]);

  const refreshThisSettlement = React.useCallback(() => {
    refreshSettlementData(settlement.id);
  }, [settlement.id]);

  const handleOpenBishopModal = React.useCallback((bishopric: SettlementBishopric) => {
    setBishopModal({ bishopric, assignment: bishopricToAssignment(settlement, bishopric) });
  }, [settlement]);

  const handleDismissBishop = React.useCallback((bishopric: SettlementBishopric) => {
    if (!bishopric.canManage || !settlement.landKey) return;
    void appointBishop(bishopric.religionKey, settlement.landKey, null).then(() => {
      refreshThisSettlement();
    });
  }, [refreshThisSettlement, settlement.landKey]);

  const governorActionTitle = webUIText(settlement.governor ? 'Settlement.ReplaceGovernor' : 'Settlement.AppointGovernor');
  const governorActionBody = settlement.governor
    ? webUIText('Settlement.ChangeGovernorBody', {
      Region: settlement.region,
      Warning: settlement.governorCouldRebel ? webUIText('Settlement.ChangeGovernorMayRebel') : '',
    })
    : webUIText('Settlement.AppointGovernorBody', { Region: settlement.region });

  const capitalIcon = settlement.isCapital ? (
    <Tooltip
      content={{
        title: webUIText(settlement.isFactionIndependent ? 'Settlement.Capital' : 'Settlement.ProvincialCapital'),
        body: settlement.isFactionIndependent
          ? webUIText('Settlement.SeatOf', { Faction: settlement.faction })
          : webUIText('Settlement.SeatOfSubject', { Faction: settlement.faction }),
      }}
      position="bottom"
      delay={200}
    >
      <img
        src={settlement.isFactionIndependent ? "/assets/icons/I_Capital.png" : "/assets/icons/I_ProvincialCapital.png"}
        alt=""
        className="settle-header-capital-icon"
      />
    </Tooltip>
  ) : null;

  return (
    <div className="sidebar sidebar--left sidebar--visible settlement-sidebar">
      <SidebarToolbar
        navButtons={[
          { icon: '/assets/icons/I_NavPrevious.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.818.1"); }, onClick: () => handleNavigate(-1), disabled: !settlement.canNavigateSettlements },
          { icon: '/assets/icons/I_NavNext.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.819.1"); }, onClick: () => handleNavigate(1), disabled: !settlement.canNavigateSettlements },
        ]}
        actionButtons={[
          { icon: isPinned ? '/assets/icons/I_Pin_Pinned.png' : '/assets/icons/I_Pin_Unpinned.png', get tooltip() { return isPinned ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementSidebar.822.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementSidebar.822.1"); }, onClick: () => togglePin('settlement', settlement.id), isActive: isPinned },
          { icon: '/assets/icons/I_ZoomTo.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.823.1"); }, onClick: () => zoomToBridge('settlement', settlement.id) },
          ...(settlement.showSetCapital ? [{
            icon: '/assets/icons/I_Capital.png',
            get tooltip() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.826.1"); },
            get tooltipBody() {
              return settlement.canSetCapital
                ? webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.827.88', { Value1: formatNumber(settlement.capitalMoveCost ?? 0) })
                : settlement.capitalMoveBlockedReason;
            },
            onClick: handleSetCapital,
            disabled: !settlement.canSetCapital,
          }] : []),
          ...(siege ? [{
            icon: '/assets/icons/I_Siege.png',
            get tooltip() { return webUIText('Settlement.Siege.OpenSidebar'); },
            onClick: () => openSidebar('siege', settlement.id),
            isActive: true,
          }] : []),
          { icon: '/assets/icons/I_Diplomacy.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.833.1"); }, onClick: () => { if (settlement.factionId) openSidebar('diplomacy', settlement.factionId); }, tutorialTarget: 'SettlementDiplomacyButton' },
          { icon: '/assets/ui/I_HelpIcon.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.834.1"); }, onClick: () => showAdvisor('settlementSidebar', { force: true }) },
        ]}
        onClose={onClose}
      />

      {/* Header */}
      <div className="settle-header">
        <img src={settlementTypeHeaderBg[settlement.type] || "/assets/events/settlement-village.png"} alt="" className="settle-header-bg" />
        <Tooltip content={{ title: formatSettlementType(settlement.type), body: settlement.region }} position="bottom" delay={200}>
          <div className="settle-header-type-badge">
            <img src={WebkilnAssetPath(settlementTypeIcons[settlement.type])} alt="" className="settle-header-type-icon" />
          </div>
        </Tooltip>
        {settlement.governor && (
          <PersonTooltip characterId={settlement.governor.id} position="left" delay={200}>
            <div className="settle-header-governor">
              <Portrait personId={settlement.governor.id} name={settlement.governor.name} size="md" shape="circle" showBorder borderTier="silver" />
            </div>
          </PersonTooltip>
        )}
        <div className="settle-header-scrim">
          <div className="settle-header-name-row">
            <FactionTooltip factionId={settlement.factionId} factionName={settlement.faction} delay={150}>
              <FactionRoundel
                factionId={settlement.factionId}
                colour={settlement.factionColour}
                secondaryColour={settlement.factionSecondaryColour}
                emblem={settlement.factionEmblem}
                cultureGroup={settlement.factionCultureGroup}
                name={settlement.faction}
                size="md"
                className="settle-header-roundel"
                onClick={() => openSidebar('diplomacy', settlement.faction)}
              />
            </FactionTooltip>
            <div className="settle-header-title-block">
              {isRenaming ? (
                <div className="settle-rename-row">
                  <input
                    className="settle-rename-input"
                    value={renameDraft}
                    onChange={event => setRenameDraft(event.target.value)}
                    onKeyDown={handleRenameKeyDown}
                  />
                  <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.875.47') }} position="bottom" delay={150}>
                    <button type="button" className="settle-rename-icon-btn" onClick={confirmRename}>
                      <img src="/assets/ui/I_TickIcon.png" alt="" />
                    </button>
                  </Tooltip>
                  <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.880.48') }} position="bottom" delay={150}>
                    <button type="button" className="settle-rename-icon-btn" onClick={cancelRename}>
                      <img src="/assets/ui/I_CloseIcon.png" alt="" />
                    </button>
                  </Tooltip>
                </div>
              ) : (
                <div className="settle-header-name">
                  <span className="settle-header-name-text">{settlement.name}</span>
                  {capitalIcon}
                  {canRename && (
                    <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.891.49') }} position="bottom" delay={150}>
                      <button
                        type="button"
                        className="settle-header-rename-btn"
                        onClick={() => {
                          setRenameDraft(settlement.name);
                          setIsRenaming(true);
                        }}
                      >
                        <img src="/assets/icons/I_Rename.png" alt="" className="settle-header-rename-icon" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}
              <div className="settle-header-subtitle">{settlement.faction}</div>
            </div>
          </div>
          <Tooltip content={buildUnrestTooltip(settlement, unrestRounded, unrestLabel)} position="bottom" delay={200}>
            <div className="settle-unrest-bar-wrap">
              <PaintedBar percent={unrestPct} color="red" />
              <span className="settle-unrest-label" style={{ color: unrestColor }}>
                <img src="/assets/icons/I_Unrest.png" alt="" className="settle-unrest-icon" />
                <span>{`${unrestLabel} (${unrestRounded}%)`}</span>
              </span>
            </div>
          </Tooltip>
        </div>
      </div>

      <SidebarTabBar
        tabs={[
          { id: 'general', label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.956.50') },
          { id: 'buildings', label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.957.51') },
          { id: 'military', label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.958.52') },
          { id: 'garrison', label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.959.53') },
        ]}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as SettlementSidebarTab)}
      />

      <StyledScrollArea className="sidebar-content sidebar-content--textured settle-content">
        {activeTab === 'general' && <>
          {siege?.capitalOccupationDaysRemaining !== undefined && (
            <div className="game-notice game-notice--danger game-notice--compact">
              <strong>{webUIText('Settlement.CapitalOccupationDeadline', {
                Days: formatNumber(siege.capitalOccupationDaysRemaining),
              })}</strong>
              <span>{webUIText('Settlement.CapitalOccupationDeadlineBody')}</span>
            </div>
          )}

          {/* Stats row */}
          <StatCellGrid>
            <Tooltip content={buildPopulationGrowthTooltip(settlement)} position="bottom" delay={150}>
              <StatCell icon="/assets/icons/I_Population.png" value={formatNumber(settlement.population)} delta={`${formatSignedNumber(settlement.populationGrowth, { maximumFractionDigits: 1 })}%`} deltaColor={settlement.populationGrowth >= 0 ? 'var(--green)' : 'var(--red)'} />
            </Tooltip>
            <Tooltip content={{
              title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1078.60'),
              get body() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1082.1", { Value1: formatNumber(settlement.income) }); },
              lines: breakdownLines(settlement.incomeBreakdown, v => formatNumber(v)),
            }} position="bottom" delay={150}>
              <StatCell icon="/assets/icons/I_Coins.png" value={formatNumber(settlement.income)} />
            </Tooltip>
            <Tooltip content={{
              title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1085.61'),
              get body() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1089.1", { Value1: formatNumber(foodProdRounded), Value2: formatNumber(foodConsRounded) }); },
              lines: breakdownLines(settlement.foodBreakdown, v => formatNumber(v, { maximumFractionDigits: 1 })),
            }} position="bottom" delay={150}>
              <StatCell icon="/assets/icons/I_Food.png" value={formatSignedNumber(foodNetRounded)} valueColor={foodColor} />
            </Tooltip>
            <Tooltip content={{
              get title() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1095.1", { Value1: formatNumber(settlement.fortificationLevel) }); },
              body: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1093.62'),
              lines: breakdownLines(settlement.fortificationBreakdown, v => formatNumber(v)),
            }} position="bottom" delay={150}>
              <StatCell icon="/assets/icons/I_Fortification.png" value={formatNumber(settlement.fortificationLevel)} />
            </Tooltip>
          </StatCellGrid>

          {settlement.disease && (
            <Tooltip content={buildDiseaseTooltip(settlement)} position="left" delay={200}>
              <div className="settle-disease-row">
                <img src="/assets/icons/I_Skull.png" alt="" className="settle-disease-icon" />
                <div className="settle-disease-copy">
                  <span className="settle-disease-name">{settlement.disease.name}</span>
                  <span className="settle-disease-meta">
                    {settlement.disease.severityLabel}
                    {settlement.disease.deaths > 0 ? webUIText("Auto.Fix.ExprTrue.componentssidebarsSettlementSidebar.1111.1", { Value1: formatNumber(settlement.disease.deaths) }) : ''}
                  </span>
                </div>
              </div>
            </Tooltip>
          )}

          {/* Region / Land / Domain */}
          <div className="settle-geo-row">
            <RegionTooltip tier="region" regionKey={settlement.regionKey} name={settlement.region}>
              <div className="settle-geo-item">
                <img src="/assets/icons/I_Region.png" alt="" className="settle-geo-icon" />
                <span className="settle-geo-value">{settlement.region}</span>
              </div>
            </RegionTooltip>
            <RegionTooltip tier="land" regionKey={settlement.landKey} name={settlement.land}>
              <div className="settle-geo-item">
                <img src="/assets/icons/I_Land.png" alt="" className="settle-geo-icon" />
                <span className="settle-geo-value">{settlement.land}</span>
              </div>
            </RegionTooltip>
            <RegionTooltip tier="domain" regionKey={settlement.domainKey} name={settlement.domain}>
              <div className="settle-geo-item">
                <img src="/assets/icons/I_Domain.png" alt="" className="settle-geo-icon" />
                <span className="settle-geo-value">{settlement.domain}</span>
              </div>
            </RegionTooltip>
          </div>

          {debugMode && (
            <>
              <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1139.63')} />
              <div className="sidebar-debug-rows">
                <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1141.64')} value={`#${formatNumber(settlement.debugShortId ?? 0)}`} />
                {settlement.factionDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1142.65')} value={`#${formatNumber(settlement.factionDebugShortId)}`} /> : null}
                {settlement.governor?.debugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1143.66')} value={`#${formatNumber(settlement.governor.debugShortId)}`} /> : null}
                {settlement.siege?.hostileFactionDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1144.67')} value={`#${formatNumber(settlement.siege.hostileFactionDebugShortId)}`} /> : null}
              </div>
            </>
          )}

          {/* Governor row */}
          {(settlement.governor || canManageGovernor) && (
            <div className={`settle-person-row${settlement.governor ? '' : ' settle-person-row--empty'}`}>
              {settlement.governor ? (
                <PersonTooltip characterId={settlement.governor.id} position="bottom" delay={200}>
                  <Portrait personId={settlement.governor.id} name={settlement.governor.name} size="sm" shape="circle" showBorder borderTier="silver" />
                </PersonTooltip>
              ) : (
                <img src="/assets/icons/AssignGovernor.png" alt="" className="settle-person-empty-icon" />
              )}
              <div className="settle-person-info">
                <span className="settle-person-name">{settlement.governor ? settlement.governor.name : webUIText('Settlement.NoGovernor')}</span>
                <RegionTooltip tier="region" regionKey={settlement.regionKey} name={settlement.region}>
                  <span className="settle-person-role">{webUIText('Settlement.GovernorOfRegion', { Region: settlement.region })}</span>
                </RegionTooltip>
              </div>
              {canManageGovernor && (
                <div className="settle-person-actions">
                  <Tooltip content={{ title: governorActionTitle, body: governorActionBody }} position="left" delay={150}>
                    <button
                      type="button"
                      className="settle-person-action-btn"
                      onMouseDown={(event) => {
                        if (event.button !== 0) return;
                        event.preventDefault();
                        setGovernorModalOpen(true);
                      }}
                    >
                      <img src={settlement.governor ? "/assets/icons/I_ReplaceGovernor.png" : "/assets/icons/AssignGovernor.png"} alt="" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          )}

          {/* Modifier indicators grid */}
          {settlement.modifiers.length > 0 && (
            <div className="settle-modifiers">
              {settlement.modifiers.map(m => {
                const hasNumeric = typeof m.total === 'number';
                const total = m.total ?? 0;
                const isPositive = hasNumeric ? total >= 0 : true;
                const totalStr = m.isPercent ? formatNumber(total, { maximumFractionDigits: 1 }) : formatNumber(total);
                const tooltip: TooltipContent = hasNumeric ? {
                  title: m.label,
                  get body() { return m.description || webUIText("Auto.Fix.PropExprFallback.componentssidebarsSettlementSidebar.1198.1", { Value1: total >= 0 ? '+' : '', TotalStr: totalStr, Value3: m.isPercent ? '%' : '' }); },
                  lines: m.sources?.map(s => ({
                    label: s.name,
                    value: formatSignedNumber(s.value, { maximumFractionDigits: m.isPercent ? 1 : 0 }) + (m.isPercent ? '%' : ''),
                    valueColor: s.value >= 0 ? 'var(--green)' : 'var(--red)',
                  })),
                } : {
                  title: m.label,
                  body: m.description,
                };
                return (
                  <Tooltip key={m.key} content={tooltip} position="bottom" delay={150}>
                    <div className={`settle-modifier${isPositive ? ' settle-modifier--pos' : ' settle-modifier--neg'}`}>
                      {m.icon && <img src={m.icon} alt="" className="settle-modifier-icon" />}
                      {hasNumeric
                        ? <span className="settle-modifier-val">{total >= 0 ? '+' : ''}{totalStr}{m.isPercent ? '%' : ''}</span>
                        : <span className="settle-modifier-val">{m.label}</span>}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Population - Culture shares */}
          <HintSectionHeading title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1220.68')} hintKey="CultureHint" />
          <div className="settle-share-section">
            <ShareBar shares={settlement.cultures} kind="culture" />
            <ShareLegend shares={settlement.cultures} kind="culture" />
          </div>

          {/* Population - Religion shares */}
          <HintSectionHeading title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1227.69')} hintKey="ReligionHint" />
          <div className="settle-share-section">
            <ShareBar
              shares={settlement.religions}
              kind="religion"
              bishoprics={settlement.bishoprics}
              settlement={settlement}
              onOpenBishopModal={handleOpenBishopModal}
              onDismissBishop={handleDismissBishop}
            />
            <ShareLegend
              shares={settlement.religions}
              kind="religion"
              bishoprics={settlement.bishoprics}
              settlement={settlement}
              onOpenBishopModal={handleOpenBishopModal}
              onDismissBishop={handleDismissBishop}
            />
          </div>

          {/* Pop groups table */}
          {settlement.pops.length > 0 && <>
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1249.70')} />
            <div className="settle-pop-table">
              <div className="settle-pop-header">
                <SortableHeader
                  id="name"
                  label={<WebUIText textKey="Auto.ComponentsSidebarsSettlementSidebar.1251.8" />}
                  className="settle-pop-sort settle-pop-col-name"
                  activeClassName="settle-pop-sort--active"
                  sort={popSort}
                  onSort={(key) => setPopSort(current => toggleSortState(current, key))}
                />
                <SortableHeader
                  id="population"
                  label={<WebUIText textKey="Auto.ComponentsSidebarsSettlementSidebar.1252.9" />}
                  className="settle-pop-sort settle-pop-col-count"
                  activeClassName="settle-pop-sort--active"
                  sort={popSort}
                  onSort={(key) => setPopSort(current => toggleSortState(current, key, 'desc'))}
                />
                <SortableHeader
                  id="unrest"
                  label={<WebUIText textKey="Auto.ComponentsSidebarsSettlementSidebar.1253.10" />}
                  className="settle-pop-sort settle-pop-col-unrest"
                  activeClassName="settle-pop-sort--active"
                  sort={popSort}
                  onSort={(key) => setPopSort(current => toggleSortState(current, key, 'desc'))}
                />
              </div>
              {visiblePops.map((p, i) => {
                const tooltipLines: TooltipContent['lines'] = [];
                const popShare = settlement.population > 0 ? (p.count / settlement.population) * 100 : 0;
                const monthlyGrowth = p.monthlyGrowth ?? 0;
                tooltipLines.push({
                  label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1261.71'),
                  value: `${formatNumber(popShare, { maximumFractionDigits: 1 })}%`,
                });
                tooltipLines.push({
                  label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1265.72'),
                  get value() { return monthlyGrowth === 0 ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementSidebar.1269.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementSidebar.1269.1", { Value1: formatSignedNumber(monthlyGrowth) }); },
                  valueColor: monthlyGrowth > 0 ? 'var(--green)' : monthlyGrowth < 0 ? 'var(--red)' : 'var(--text-muted)',
                });
                const growthLines = breakdownLines(p.growthBreakdown, v => formatNumber(v, { maximumFractionDigits: 0 }));
                if (growthLines && growthLines.length > 0) {
                  tooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1271.73'), isHeader: true });
                  tooltipLines.push(...growthLines);
                }
                if (p.monthlyConversion && p.conversionTargetReligion) {
                  tooltipLines.push({
                    get label() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1279.1", { ConversionTargetReligion: p.conversionTargetReligion }); },
                    get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1280.1", { Value1: formatSignedNumber(p.monthlyConversion) }); },
                    valueColor: p.monthlyConversion > 0 ? 'var(--green)' : 'var(--red)',
                  });
                }
                if (p.monthlyAssimilation && p.assimilationTargetCulture) {
                  tooltipLines.push({
                    get label() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1286.1", { Value1: p.assimilationTargetCulture }); },
                    get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1287.1", { Value1: formatSignedNumber(p.monthlyAssimilation) }); },
                    valueColor: p.monthlyAssimilation > 0 ? 'var(--green)' : 'var(--red)',
                  });
                }
                const unrestLines = breakdownLines(p.unrestBreakdown, v => `${formatNumber(v, { maximumFractionDigits: 1 })}%`, true);
                if (unrestLines && unrestLines.length > 0) {
                  tooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1290.74'), isHeader: true });
                  tooltipLines.push(...unrestLines);
                }

                const popTooltip: TooltipContent = {
                  get title() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1298.1", { Culture: p.cultureAdjective, Religion: p.religionAdherentPlural }); },
                  get body() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1299.1", { Value1: formatNumber(p.count), Value2: formatPercentValue(p.unrest) }); },
                  lines: tooltipLines.length > 0 ? tooltipLines : undefined,
                };
                return (
                  <Tooltip key={i} content={popTooltip} position="left" delay={200}>
                    <div className="settle-pop-row">
                      <span className="settle-pop-col-name">
                        {p.cultureIcon && <img src={p.cultureIcon} alt="" className="settle-pop-icon" />}
                        {p.religionIcon && <img src={p.religionIcon} alt="" className="settle-pop-icon" />}
                        <span className="settle-pop-name-text">{p.cultureAdjective} {p.religionAdherentPlural}</span>
                      </span>
                      <span className="settle-pop-col-count">{formatNumber(p.count)}</span>
                      <span className="settle-pop-col-unrest" style={{ color: getUnrestColor(p.unrest) }}>{formatPercentValue(p.unrest)}</span>
                    </div>
                  </Tooltip>
                );
              })}
              {settlement.pops.length > 3 && (
                <button className="settle-pop-toggle" onClick={() => setShowAllPops(!showAllPops)}>
                  {showAllPops ? webUIText("Auto.Fix.ExprTrue.componentssidebarsSettlementSidebar.1318.1") : webUIText("Auto.Fix.ExprFalse.componentssidebarsSettlementSidebar.1318.1", { Value1: formatNumber(settlement.pops.length) })}
                </button>
              )}
            </div>
          </>}

          {/* Resources */}
          {settlement.resources.length > 0 && <>
            <HintSectionHeading title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1323.75')} hintKey="TradeAndResourcesHint" />
            <div className="settle-resources">
              {(resourceCategories.length > 0 ? resourceCategories : [{ id: 'other', get name() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1328.1"); }, stockpile: 0, stockpileCap: 0, production: 0, potentialProduction: 0, consumption: 0, hasShortage: false, isCapitalStockpile: false }]).map(category => {
                const resources = resourcesByCategory.get(category.id) ?? (category.id === 'other' ? settlement.resources : []);
                if (resources.length === 0 && category.stockpile <= 0 && category.production <= 0 && category.consumption <= 0) return null;
                const categoryNet = category.production - category.consumption;
                const categoryPotential = category.potentialProduction;
                const categoryTooltip: TooltipContent = {
                  title: category.name,
                  get body() { return category.isCapitalStockpile ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementSidebar.1335.1") : undefined; },
                  lines: [
                    {
                      label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1335.76'),
                      value: category.isCapitalStockpile || category.stockpileCap <= 0
                        ? formatNumber(category.stockpile, { maximumFractionDigits: 0 })
                        : `${formatNumber(category.stockpile, { maximumFractionDigits: 0 })}/${formatNumber(category.stockpileCap, { maximumFractionDigits: 0 })}`,
                      valueColor: category.hasShortage ? 'var(--red)' : 'var(--gold)',
                    },
                    {
                      label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1342.77'),
                      get value() { return categoryPotential > category.production + 0.05 ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsSettlementSidebar.1347.1", { Value1: formatNumber(category.production, { maximumFractionDigits: 1 }), Value2: formatNumber(categoryPotential, { maximumFractionDigits: 1 }) }) : webUIText("Auto.Fix.PropExprFalse.componentssidebarsSettlementSidebar.1348.1", { Value1: formatNumber(category.production, { maximumFractionDigits: 1 }) }); },
                      valueColor: categoryPotential > category.production + 0.05 ? 'var(--orange)' : 'var(--green)',
                    },
                    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1348.78'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1351.1", { Value1: formatNumber(category.consumption, { maximumFractionDigits: 1 }) }); }, valueColor: category.consumption > 0 ? 'var(--red)' : 'var(--text-muted)' },
                    { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1349.79'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1352.1", { Value1: formatSignedNumber(categoryNet, { maximumFractionDigits: 1 }) }); }, valueColor: categoryNet > 0 ? 'var(--green)' : categoryNet < 0 ? 'var(--red)' : 'var(--text-muted)' },
                  ],
                };
                return (
                  <div key={category.id} className="settle-resource-category">
                    <Tooltip content={categoryTooltip} position="left" delay={200}>
                      <div className={`settle-resource-category-head${category.hasShortage ? ' settle-resource-category-head--shortage' : ''}`}>
                        <span className="settle-resource-category-name">{category.name}</span>
                        <span className="settle-resource-category-stock">
                          {category.isCapitalStockpile || category.stockpileCap <= 0
                            ? formatNumber(category.stockpile, { maximumFractionDigits: 0 })
                            : `${formatNumber(category.stockpile, { maximumFractionDigits: 0 })}/${formatNumber(category.stockpileCap, { maximumFractionDigits: 0 })}`}
                        </span>
                        <span className="settle-resource-category-net" style={{ color: categoryNet > 0 ? 'var(--green)' : categoryNet < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                          {formatSignedNumber(categoryNet, { maximumFractionDigits: 1 })}
                        </span>
                      </div>
                    </Tooltip>
                    <div className="settle-resource-category-rows">
                      {resources.map(r => {
                        const net = r.production - r.consumption;
                        const netColor = net > 0 ? 'var(--green)' : net < 0 ? 'var(--red)' : 'var(--text-muted)';
                        const amountStr = formatNumber(r.amount, { maximumFractionDigits: 1 });
                        const netStr = formatNumber(net, { maximumFractionDigits: 1 });
                        return (
                          <Tooltip key={r.id ?? r.name} content={buildResourceTooltip(r)} position="left" delay={200}>
                            <ResourceLink resourceId={r.id ?? r.name} className={`settle-resource-row${(r.shortage ?? 0) > 0 ? ' settle-resource-row--shortage' : ''}`}>
                              <img src={WebkilnAssetPath(r.icon || `/assets/resources/${r.id ?? r.name}.png`)} alt="" className="settle-resource-icon" />
                              <span className="settle-resource-name">{r.name}</span>
                              <span className="settle-resource-stock">{amountStr}</span>
                              <span className="settle-resource-net" style={{ color: netColor }}>{net >= 0 ? '+' : ''}{netStr}</span>
                            </ResourceLink>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>}

          {/* Actions */}
          {interactions.length > 0 && <>
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1393.80')} />
            <div className="settle-actions">
              {interactions.map(i => {
                const matchesOutcome = interactionsState?.lastCompletedInteractionId === i.id;
                const outcome: 'success' | 'failure' | undefined = matchesOutcome
                  ? interactionsState!.lastInteractionSucceeded ? 'success' : 'failure'
                  : undefined;
                const outcomeKey = matchesOutcome
                  ? `${interactionsState!.lastInteractionCompletedDate}:${i.id}`
                  : undefined;
                const cardKey = `${settlement.id}:${i.id}`;
                return (
                  <Tooltip key={cardKey} content={buildInteractionTooltip(i, settlement.id)} position="left" delay={150}>
                    <InteractionCard
                      title={i.name}
                      description={i.description}
                      image={i.iconUrl}
                      bgImage={i.backgroundUrl}
                      durationDays={i.durationDays}
                      remainingDays={i.remainingDays}
                      inProgress={i.inProgress}
                      outcome={outcome}
                      outcomeText={matchesOutcome ? interactionsState!.lastInteractionOutcomeText : undefined}
                      outcomeKey={outcomeKey}
                      cooldownDays={i.cooldownDays}
                      cooldownRemainingDays={i.cooldownRemainingDays}
                      onClick={i.availability === 'available' && !i.inProgress ? () => startInteraction(i.id) : undefined}
                      onCancel={i.inProgress ? cancelInteraction : undefined}
                    />
                  </Tooltip>
                );
              })}
            </div>
          </>}
        </>}

        {activeTab === 'buildings' && <SettlementBuildingsPanel settlement={settlement} />}

        {activeTab === 'military' && <SettlementMilitaryPanel settlement={settlement} />}

        {activeTab === 'garrison' && <>
          {!settlement.canViewGarrison && (
            <div className="settle-garrison-empty">
              <img src="/assets/icons/Doctrines/I_Doctrine_Garrison.png" alt="" className="settle-garrison-empty-icon" />
              <div className="settle-garrison-empty-copy">
                <span className="settle-garrison-empty-title"><WebUIText textKey="Auto.ComponentsSidebarsSettlementSidebar.1435.11" /></span>
                <span className="settle-garrison-empty-body">{settlement.garrisonHiddenReason || webUIText('Settlement.ScoutDefenders')}</span>
              </div>
              <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1439.81') }} position="left" delay={200}>
                <button type="button" className="settle-section-help-btn" onMouseDown={(event) => { event.preventDefault(); showHintKey('GarrisonHint'); }}>
                  <img src="/assets/ui/I_HelpIcon.png" alt="" />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Garrisoned Armies */}
          {settlement.canViewGarrison !== false && settlement.garrisonedArmies.length > 0 && <>
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1449.82')} />
            <div className="settle-garrison-block">
              {settlement.garrisonedArmies.map(army => {
                const ratio = army.maxStrength > 0 ? army.strength / army.maxStrength : 0;
                return (
                  <Tooltip key={army.name} content={{
                    title: army.name,
                    get body() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1459.1", { CommanderName: army.commanderName, CommanderTitle: army.commanderTitle }); },
                    lines: [
                      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1458.83'), get value() { return webUIText("Auto.Prop.componentssidebarsSettlementSidebar.1461.1", { Value1: formatNumber(army.strength), Value2: formatNumber(army.maxStrength) }); }, valueColor: ratio > 0.5 ? 'var(--green)' : 'var(--red)' },
                      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1459.84'), value: formatPercentValue(army.morale), valueColor: army.morale > 60 ? 'var(--green)' : 'var(--orange)' },
                      { label: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1460.85'), value: formatNumber(army.unitCount) },
                    ],
                  }} position="bottom" delay={200}>
                    <div className="settle-army-row">
                      <PersonTooltip characterId={army.commanderId ?? null} position="bottom">
                        <Portrait personId={army.commanderId} name={army.commanderName} src={army.commanderPortrait} size="sm" shape="circle" showBorder borderTier="silver" />
                      </PersonTooltip>
                      <div className="settle-army-info">
                        <span className="settle-army-name">{army.name}</span>
                        <span className="settle-army-commander">{`${army.commanderName}, ${army.commanderTitle}`}</span>
                      </div>
                      <div className="settle-army-stats">
                        <span className="settle-army-strength">{formatNumber(army.strength)}/{formatNumber(army.maxStrength)}</span>
                        <PaintedBar percent={ratio * 100} color={ratio > 0.5 ? 'green' : 'red'} />
                      </div>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </>}

          {/* Stationary Garrison */}
          {settlement.canViewGarrison !== false && settlement.garrison.length > 0 && (() => {
            // Merge same-class entries into a single row. Two garrison
            // stacks are "the same" when their unit class matches (keyed
            // by name since GarrisonUnit has no assetKey). Aggregates:
            // strength, maxStrength, upkeep, and foodConsumption are
            // summed; veterancy is weighted by strength so a 200-man
            // stack at 0.6 veterancy dominates a 20-man stack at 0.1.
            // Per-class stats (damage, armour, speed, tier, portrait,
            // description) are identical across a group and taken from
            // the first entry.
            const groups = (() => {
              const byName = new Map<string, typeof settlement.garrison>();
              for (const u of settlement.garrison) {
                const arr = byName.get(u.name) ?? [];
                arr.push(u);
                byName.set(u.name, arr);
              }
              return Array.from(byName.values()).map(stack => {
                const first = stack[0];
                const strength = stack.reduce((s, u) => s + u.strength, 0);
                const maxStrength = stack.reduce((s, u) => s + u.maxStrength, 0);
                const upkeep = stack.reduce((s, u) => s + u.upkeep, 0);
                const foodConsumption = stack.reduce((s, u) => s + u.foodConsumption, 0);
                const veterancy = strength > 0
                  ? stack.reduce((s, u) => s + u.veterancy * u.strength, 0) / strength
                  : first.veterancy;
                return {
                  ...first,
                  strength, maxStrength, upkeep, foodConsumption, veterancy,
                  count: stack.length,
                };
              });
            })();
            return <>
              <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsSettlementSidebar.1517.86')} />
              <div className="settle-garrison-block">
                {groups.map(unit => {
                  const ratio = unit.maxStrength > 0 ? unit.strength / unit.maxStrength : 0;
                  const matchingCulture = settlement.cultures.find(c => c.name === unit.culture);
                  const cultureIcon = matchingCulture?.icon;
                  const cultureInfo = matchingCulture?.info as CultureInfo | undefined;
                  return (
                    <Tooltip key={unit.name} content={
                      <UnitTooltip data={{
                        name: unit.name,
                        count: unit.count,
                        description: unit.description,
                        portrait: unit.portrait,
                        typeLabel: unit.type,
                        typeIcon: unit.typeIcon,
                        tier: unit.tier,
                        culture: unit.culture,
                        cultureIcon,
                        cultureInfo,
                        sourceBuilding: unit.sourceBuilding,
                        strength: unit.strength,
                        maxStrength: unit.maxStrength,
                        upkeep: unit.upkeep,
                        foodConsumption: unit.foodConsumption,
                        speed: unit.speed,
                        veterancy: unit.veterancy,
                        damage: { pierce: unit.pierceDmg, crush: unit.crushDmg, slash: unit.slashDmg },
                        armour: { pierce: unit.pierceArm, crush: unit.crushArm, slash: unit.slashArm },
                      }} />
                    } position="left" delay={200}>
                      <div className="settle-garrison-unit">
                        <img src={unit.typeIcon} alt="" className="settle-garrison-type-icon" />
                        <div className="settle-garrison-info">
                          <span className="settle-garrison-name">
                            {unit.name}
                            {unit.count > 1 && (
                              <span className="settle-garrison-count">
                                <img src="/assets/icons/I_Multiplier.png" alt="" className="settle-garrison-count-icon" draggable={false} />
                                <span>{formatNumber(unit.count)}</span>
                              </span>
                            )}
                          </span>
                          <span className="settle-garrison-type">
                            {unit.type}
                            {TIER_ICONS[unit.tier] && <img src={TIER_ICONS[unit.tier]} alt={webUIText("Auto.Attr.componentssidebarsSettlementSidebar.1565.1", { Value1: formatNumber(unit.tier) })} className="settle-garrison-tier-icon" />}
                            <span className="settle-garrison-source">{unit.sourceBuilding}</span>
                          </span>
                        </div>
                        <div className="settle-garrison-bar">
                          <PaintedBar percent={ratio * 100} color={ratio > 0.5 ? 'green' : 'red'} />
                          <span className="settle-garrison-strength">{formatNumber(unit.strength)}/{formatNumber(unit.maxStrength)}</span>
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </>;
          })()}

          {settlement.canViewGarrison !== false && settlement.garrison.length === 0 && settlement.garrisonedArmies.length === 0 && (
            <div className="settle-garrison-empty">
              <img src="/assets/icons/Doctrines/I_Doctrine_Garrison.png" alt="" className="settle-garrison-empty-icon" />
              <div className="settle-garrison-empty-copy">
                <span className="settle-garrison-empty-title"><WebUIText textKey="Auto.ComponentsSidebarsSettlementSidebar.1581.12" /></span>
                <span className="settle-garrison-empty-body"><WebUIText textKey="Auto.ComponentsSidebarsSettlementSidebar.1582.13" /></span>
              </div>
              <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.1585.87') }} position="left" delay={200}>
                <button type="button" className="settle-section-help-btn" onMouseDown={(event) => { event.preventDefault(); showHintKey('GarrisonHint'); }}>
                  <img src="/assets/ui/I_HelpIcon.png" alt="" />
                </button>
              </Tooltip>
            </div>
          )}
        </>}
      </StyledScrollArea>
      <RegionGovernorAppointmentModal
        open={governorModalOpen}
        settlementId={settlement.id}
        settlementName={settlement.name}
        regionName={settlement.region}
        currentGovernorId={settlement.governor?.id}
        governorCouldRebel={settlement.governorCouldRebel}
        onClose={() => setGovernorModalOpen(false)}
      />
      <BishopAppointmentModal
        open={!!bishopModal}
        assignment={bishopModal?.assignment ?? null}
        religionKey={bishopModal?.bishopric.religionKey ?? ''}
        religionName={bishopModal?.bishopric.religionName ?? ''}
        religionIcon={bishopModal?.bishopric.religionIcon ?? ''}
        onClose={() => setBishopModal(null)}
        onAppointed={refreshThisSettlement}
      />
    </div>
  );
};

export default React.memo(SettlementSidebar);

function SettlementSidebarSlot({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const settlement = useSettlement(sidebarId);
  if (!settlement) return null;
  return <SettlementSidebar settlement={settlement} onClose={onClose} />;
}

registerSidebar({
  id: 'settlement',
  side: 'left',
  component: SettlementSidebarSlot,
  advisorTopic: 'settlementSidebar',
});

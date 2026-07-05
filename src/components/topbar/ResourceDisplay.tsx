import React, { useEffect, useState } from 'react';
import Tooltip from '../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../common/tooltips/Tooltip';
import { useGameState } from '../../context/GameContext';
import { useBridgeQuery } from '../../bridge/core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetIncomeBreakdownResponse, IncomeEntry, CommandUpkeepEntry } from '../../bridge-types.generated.ts';
import { formatNumber, formatSignedNumber } from '../../utils/numberFormat';

import { webUIText } from '../../localization/WebUITextContext';
const goldIcon = '/assets/icons/I_Coins.png';
const FPS_UPDATE_MS = 200;

interface CommandUpkeepTreeNode extends CommandUpkeepEntry {
  children: CommandUpkeepTreeNode[];
}

function entriesToSubTooltip(title: string, entries: IncomeEntry[], negate = false): { title: string; lines: TooltipLine[] } | undefined {
  if (entries.length === 0) return undefined;
  return {
    title,
    lines: entries.map(e => {
      const v = negate ? -e.amount : e.amount;
      return {
        label: e.name,
        value: formatSignedNumber(v),
        valueColor: v >= 0 ? 'var(--green)' : 'var(--red)',
        valueIcon: goldIcon,
      };
    }),
  };
}

function buildCommandTree(entries: CommandUpkeepEntry[]): CommandUpkeepTreeNode[] {
  const nodes = entries.map(entry => ({ ...entry, children: [] as CommandUpkeepTreeNode[] }));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const roots: CommandUpkeepTreeNode[] = [];

  for (const node of nodes) {
    if (node.parentId && node.parentId !== node.id) {
      const parent = byId.get(node.parentId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  return roots;
}

function commandNodeToLine(node: CommandUpkeepTreeNode): TooltipLine {
  const v = -node.upkeep;
  const line: TooltipLine = {
    get label() { return node.name || webUIText("Auto.Fix.PropExprFallback.componentstopbarResourceDisplay.58.1"); },
    value: formatSignedNumber(v),
    valueColor: 'var(--red)',
    valueIcon: goldIcon,
  };
  if (node.children.length > 0) {
    line.subTooltip = {
      get title() { return node.name || webUIText("Auto.Fix.PropExprFallback.componentstopbarResourceDisplay.65.1"); },
      lines: node.children.map(commandNodeToLine),
    };
  }
  return line;
}

function commandEntriesToSubTooltip(title: string, entries: CommandUpkeepEntry[]): { title: string; lines: TooltipLine[] } | undefined {
  if (entries.length === 0) return undefined;
  const nodes = buildCommandTree(entries);
  return {
    title,
    lines: nodes.map(commandNodeToLine),
  };
}

function buildIncomeTooltip(data: GetIncomeBreakdownResponse): TooltipContent {
  const lines: TooltipLine[] = [];

  // Settlement income with per-settlement sub-tooltip
  const settlementTotal = data.settlementIncome + data.tradeIncome;
  if (settlementTotal !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.87.1'),
      value: formatSignedNumber(settlementTotal),
      valueColor: settlementTotal >= 0 ? 'var(--green)' : 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: entriesToSubTooltip('Settlement Income', data.settlements),
    });
  }

  if (data.resourceSalesIncome !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.96.2'), value: formatSignedNumber(data.resourceSalesIncome), valueColor: 'var(--green)', valueIcon: goldIcon });
  if (data.vassalTributeIncome !== 0)
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.99.3'),
      value: formatSignedNumber(data.vassalTributeIncome),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
      subTooltip: entriesToSubTooltip('Tributary Income', data.vassals),
    });
  if (data.treatyTributeIncome !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.106.4'), value: formatSignedNumber(data.treatyTributeIncome), valueColor: 'var(--green)', valueIcon: goldIcon });
  if (data.eventIncome !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.108.5'), value: formatSignedNumber(data.eventIncome), valueColor: 'var(--green)', valueIcon: goldIcon });
  if (data.lootingIncome !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.110.6'), value: formatSignedNumber(data.lootingIncome), valueColor: 'var(--green)', valueIcon: goldIcon });
  if (data.otherIncome !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.112.7'), value: formatSignedNumber(data.otherIncome), valueColor: 'var(--green)', valueIcon: goldIcon });

  // Expenses (shown as negative)
  if (data.armyExpense !== 0)
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.117.8'),
      value: formatSignedNumber(-data.armyExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: commandEntriesToSubTooltip('Army Upkeep', data.armies),
    });
  if (data.commandMaintenanceExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.124.9'), value: formatSignedNumber(-data.commandMaintenanceExpense), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.treasuryDampeningExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.126.10'), value: formatSignedNumber(-data.treasuryDampeningExpense), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.replenishmentExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.128.11'), value: formatSignedNumber(-data.replenishmentExpense), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.buildingExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.130.12'), value: formatSignedNumber(-data.buildingExpense), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.tributePaidToLiege !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.132.13'), value: formatSignedNumber(-data.tributePaidToLiege), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.treatyTributePaid !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.134.14'), value: formatSignedNumber(-data.treatyTributePaid), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.eventExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.136.15'), value: formatSignedNumber(-data.eventExpense), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.powerBlocExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.138.16'), value: formatSignedNumber(-data.powerBlocExpense), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.autoAssignCommanderExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.140.17'), value: formatSignedNumber(-data.autoAssignCommanderExpense), valueColor: 'var(--red)', valueIcon: goldIcon });
  if (data.otherExpense !== 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.142.18'), value: formatSignedNumber(-data.otherExpense), valueColor: 'var(--red)', valueIcon: goldIcon });

  if (data.treasuryAdjustment < 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.154.19'), value: formatSignedNumber(data.treasuryAdjustment), valueColor: 'var(--red)', valueIcon: goldIcon });
  else if (data.treasuryAdjustment > 0)
    lines.push({ label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.156.20'), value: formatSignedNumber(data.treasuryAdjustment), valueColor: 'var(--green)', valueIcon: goldIcon });

  return {
    get title() { return webUIText("Auto.Prop.componentstopbarResourceDisplay.160.1", { Value1: formatNumber(data.gold) }); },
    lines,
  };
}

function useFpsCounter(active: boolean): number {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    let frameId = 0;
    let frames = 0;
    let lastUpdate = Date.now();

    const tick = () => {
      frames += 1;
      const now = Date.now();
      const elapsed = now - lastUpdate;
      if (elapsed >= FPS_UPDATE_MS) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        lastUpdate = now;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active]);

  return fps;
}

const ResourceDisplay: React.FC = () => {
  const { gold, goldDelta } = useGameState();
  const [incomeData, setIncomeData] = useState<GetIncomeBreakdownResponse | null>(null);
  const showFpsCounter = useBridgeQuery({
    action: 'game.get_settings',
    map: data => data.graphics.showFpsCounter,
  });
  const fps = useFpsCounter(showFpsCounter === true);

  useEffect(() => {
    bridgeCall('game.get_income_breakdown').then(setIncomeData).catch(acknowledgeBridgeFailure);
  }, [gold, goldDelta]);

  const tooltip = incomeData
    ? buildIncomeTooltip(incomeData)
    : { title: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.210.21'), lines: [] };
  const deltaSign = goldDelta >= 0 ? '+' : '';
  const deltaClass = goldDelta >= 0 ? 'resource-delta--positive' : 'resource-delta--negative';
  const deltaText = `${deltaSign}${formatNumber(goldDelta)}`;

  return (
    <div className="resource-display">
      {showFpsCounter === true && (
        <>
          <span className="resource-fps">{webUIText("Auto.Fix.Expr.componentstopbarResourceDisplay.219.1", { Value1: formatNumber(fps) })}</span>
          <div className="resource-separator" />
        </>
      )}
      <Tooltip content={tooltip} position="bottom">
        <div className="resource-main" data-tutorial-target="ResourceDisplay GoldDisplay IncomeText">
          <img src="/assets/icons/I_Coins.png" alt={webUIText('Auto.Attr.ComponentsTopbarResourceDisplay.224.22')} className="resource-coin-icon" />
          <span className="resource-pop-value">{formatNumber(gold)}</span>
          <span className={`resource-delta ${deltaClass}`}>{deltaText}</span>
        </div>
      </Tooltip>
    </div>
  );
};

export default ResourceDisplay;

import type { ReactNode } from 'react';
import type { TooltipContent, TooltipLine } from '../common/tooltips/Tooltip';
import EntityLink from '../common/entities/EntityLink';
import type { GetIncomeBreakdownResponse, IncomeEntry, CommandUpkeepEntry } from '../../bridge-types.generated';
import { formatNumber, formatSignedNumber } from '../../utils/numberFormat';
import { webUIText } from '../../localization/WebUITextContext';
const goldIcon = '/assets/icons/I_Coins.png';

interface CommandUpkeepTreeNode extends CommandUpkeepEntry {
  children: CommandUpkeepTreeNode[];
}

function entityLabel(name: string, id?: string, linkType?: string): ReactNode {
  if (!id || !linkType) return name;
  return (
    <EntityLink type={linkType} id={id} inline className="tt-entity-link">
      {name}
    </EntityLink>
  );
}

function entriesToSubTooltip(title: string, entries: IncomeEntry[], negate = false): TooltipContent | undefined {
  if (entries.length === 0) return undefined;
  return {
    title,
    lines: entries.map(e => {
      const v = negate ? -e.amount : e.amount;
      return {
        label: entityLabel(e.name, e.id, e.linkType),
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

function commandNodeToLine(node: CommandUpkeepTreeNode, mode: 'upkeep' | 'maintenance'): TooltipLine | null {
  const amount = mode === 'upkeep' ? node.upkeep : node.maintenance;
  if (mode === 'maintenance' && amount === 0 && node.children.length === 0) {
    return null;
  }

  const childLines = node.children
    .map(child => commandNodeToLine(child, mode))
    .filter((line): line is TooltipLine => line !== null);

  if (mode === 'maintenance' && amount === 0 && childLines.length === 0) {
    return null;
  }

  const displayAmount = mode === 'upkeep'
    ? -Math.max(amount, 0)
    : amount !== 0
      ? -amount
      : undefined;

  const line: TooltipLine = {
    label: entityLabel(
      node.name || webUIText('Common.Unassigned'),
      node.militaryId || undefined,
      node.militaryId ? 'military' : undefined,
    ),
  };

  if (displayAmount !== undefined) {
    line.value = formatSignedNumber(displayAmount);
    line.valueColor = 'var(--red)';
    line.valueIcon = goldIcon;
  }

  if (childLines.length > 0) {
    line.subTooltip = {
      title: node.name || webUIText('Common.Subordinates'),
      lines: childLines,
    };
  }
  return line;
}

function commandEntriesToSubTooltip(
  title: string,
  entries: CommandUpkeepEntry[],
  mode: 'upkeep' | 'maintenance',
  body?: string,
): TooltipContent | undefined {
  if (entries.length === 0 && !body) return undefined;
  const nodes = buildCommandTree(entries);
  const lines = nodes
    .map(node => commandNodeToLine(node, mode))
    .filter((line): line is TooltipLine => line !== null);
  if (lines.length === 0 && !body) return undefined;
  return {
    title,
    body,
    lines,
  };
}

function buildLeakageSubTooltip(data: GetIncomeBreakdownResponse): TooltipContent {
  const lines: TooltipLine[] = [
    {
      label: webUIText('Economy.LeakageRetained', { Percent: data.leakageRetainedPercent }),
      stacked: true,
    },
  ];

  if (data.leakageCorruptOfficials.length > 0) {
    lines.push({
      label: webUIText('Economy.LeakageCorruptOfficials'),
      isHeader: true,
    });
    for (const official of data.leakageCorruptOfficials) {
      lines.push({
        label: entityLabel(official.name, official.id, official.linkType || 'person'),
        value: webUIText('Economy.LeakageCorruptOfficial'),
        valueColor: 'var(--red)',
      });
    }
  } else {
    lines.push({
      label: webUIText('Economy.LeakageNoCorruptOfficials'),
      stacked: true,
    });
  }

  return {
    title: webUIText('Economy.Leakage'),
    body: webUIText('Economy.LeakageTooltip'),
    lines,
  };
}

export function buildIncomeTooltip(data: GetIncomeBreakdownResponse): TooltipContent {
  const lines: TooltipLine[] = [];

  for (const entry of data.factionGoldEntries) {
    lines.push({
      label: entry.name,
      value: formatSignedNumber(entry.amount),
      valueColor: entry.amount >= 0 ? 'var(--green)' : 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: entry.description ? { title: entry.name, body: entry.description } : undefined,
    });
  }

  if (data.settlementIncome !== 0) {
    lines.push({
      label: webUIText('Economy.SettlementTax'),
      value: formatSignedNumber(data.settlementIncome),
      valueColor: data.settlementIncome >= 0 ? 'var(--green)' : 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: entriesToSubTooltip(webUIText('Economy.SettlementTax'), data.settlementTaxes),
    });
  }

  if (data.tradeIncome !== 0) {
    lines.push({
      label: webUIText('Economy.Trade'),
      value: formatSignedNumber(data.tradeIncome),
      valueColor: data.tradeIncome >= 0 ? 'var(--green)' : 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: entriesToSubTooltip(webUIText('Economy.Trade'), data.settlementTrades),
    });
  }

  if (data.resourceSalesIncome !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.96.2'),
      value: formatSignedNumber(data.resourceSalesIncome),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
    });
  }
  if (data.vassalTributeIncome !== 0) {
    lines.push({
      label: webUIText('Economy.SubjectTribute'),
      value: formatSignedNumber(data.vassalTributeIncome),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
      subTooltip: entriesToSubTooltip(webUIText('Economy.SubjectTribute'), data.vassals),
    });
  }
  if (data.foederatiSubsidyIncome !== 0) {
    lines.push({ label: webUIText('Foederati.SubsidyReceived'), value: formatSignedNumber(data.foederatiSubsidyIncome),
      valueColor: 'var(--green)', valueIcon: goldIcon,
      subTooltip: { ...entriesToSubTooltip(webUIText('Foederati.SubsidyReceived'), data.foederatiSubsidySources), body: webUIText('Foederati.SubsidyHelp') },
    });
  }
  if (data.foederatiSubsidyPaid !== 0) {
    lines.push({ label: webUIText('Foederati.SubsidyPaid'), value: formatSignedNumber(-data.foederatiSubsidyPaid),
      valueColor: 'var(--red)', valueIcon: goldIcon,
      subTooltip: { ...entriesToSubTooltip(webUIText('Foederati.SubsidyPaid'), data.foederatiSubsidyRecipients, true), body: webUIText('Foederati.SubsidyHelp') },
    });
  }
  if (data.treatyTributeIncome !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.106.4'),
      value: formatSignedNumber(data.treatyTributeIncome),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
    });
  }
  if (data.eventIncome !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.108.5'),
      value: formatSignedNumber(data.eventIncome),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
    });
  }
  if (data.lootingIncome !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.110.6'),
      value: formatSignedNumber(data.lootingIncome),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
    });
  }
  if (data.otherIncome !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.112.7'),
      value: formatSignedNumber(data.otherIncome),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
    });
  }

  if (data.armyExpense !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.117.8'),
      value: formatSignedNumber(-data.armyExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: commandEntriesToSubTooltip(
        webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.117.8'),
        data.armies,
        'upkeep',
        webUIText('Economy.ArmyUpkeepTooltip'),
      ),
    });
  }
  if (data.commandMaintenanceExpense !== 0) {
    lines.push({
      label: webUIText('Economy.CommandMaintenance'),
      value: formatSignedNumber(-data.commandMaintenanceExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: commandEntriesToSubTooltip(
        webUIText('Economy.CommandMaintenance'),
        data.armies,
        'maintenance',
        webUIText('Economy.CommandMaintenanceTooltip'),
      ),
    });
  }
  if (data.treasuryDampeningExpense !== 0) {
    lines.push({
      label: webUIText('Economy.Leakage'),
      value: formatSignedNumber(-data.treasuryDampeningExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: buildLeakageSubTooltip(data),
    });
  }
  if (data.replenishmentExpense !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.128.11'),
      value: formatSignedNumber(-data.replenishmentExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }
  if (data.buildingExpense !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.130.12'),
      value: formatSignedNumber(-data.buildingExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }
  if (data.tributePaidToLiege !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.132.13'),
      value: formatSignedNumber(-data.tributePaidToLiege),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }
  if (data.treatyTributePaid !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.134.14'),
      value: formatSignedNumber(-data.treatyTributePaid),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }
  if (data.eventExpense !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.136.15'),
      value: formatSignedNumber(-data.eventExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }
  if (data.powerBlocExpense !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.138.16'),
      value: formatSignedNumber(-data.powerBlocExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }
  if (data.autoAssignCommanderExpense !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.140.17'),
      value: formatSignedNumber(-data.autoAssignCommanderExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }
  if (data.otherExpense !== 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.142.18'),
      value: formatSignedNumber(-data.otherExpense),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
    });
  }

  if (data.treasuryAdjustment < 0) {
    lines.push({
      label: webUIText('Economy.Leakage'),
      value: formatSignedNumber(data.treasuryAdjustment),
      valueColor: 'var(--red)',
      valueIcon: goldIcon,
      subTooltip: buildLeakageSubTooltip(data),
    });
  } else if (data.treasuryAdjustment > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.156.20'),
      value: formatSignedNumber(data.treasuryAdjustment),
      valueColor: 'var(--green)',
      valueIcon: goldIcon,
    });
  }

  return {
    get title() { return webUIText('Auto.Prop.componentstopbarResourceDisplay.160.1', { Value1: formatNumber(data.gold) }); },
    lines,
  };
}


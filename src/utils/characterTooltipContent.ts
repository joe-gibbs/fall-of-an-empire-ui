import type { TooltipContent, TooltipLine } from '../components/common/tooltips/Tooltip';
import type { Character, CharacterStatModifier, StatKey } from '../data/types';
import { getGlossaryEntry } from '../data/glossary';
import { webUIText } from '../localization/WebUITextContext';
import { characterStatEffectLines } from './characterStatEffects';
import { getComplianceState, getOpinionColor } from './colorFormatters';
import { formatNumber, formatSignedNumber } from './numberFormat';

const STAT_GLOSSARY_KEYS: Record<StatKey, string> = {
  tactics: 'Tactics',
  authority: 'Authority',
  cunning: 'Cunning',
  governance: 'Governance',
  loyalty: 'Loyalty',
  constitution: 'Constitution',
};

export function getTemporaryStatModifiers(character: Character, stat: StatKey): CharacterStatModifier[] {
  return character.stats.temporaryModifiers?.filter(modifier => modifier.stat === stat) ?? [];
}

export function getTemporaryStatModifierTotal(modifiers: CharacterStatModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
}

export function modifierValueColor(value: number): string {
  if (value > 0) return 'var(--green)';
  if (value < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

export interface ModifierTooltipEntry {
  key?: string;
  label: string;
  value: number;
}

export function modifierTooltipLines(
  entries?: ModifierTooltipEntry[],
  maximumFractionDigits = 1,
): TooltipLine[] {
  return (entries ?? []).map(entry => ({
    label: entry.label,
    value: formatSignedNumber(entry.value, { maximumFractionDigits }),
    valueColor: modifierValueColor(entry.value),
  }));
}

export function formatTemporaryModifierLabel(modifier: CharacterStatModifier): string {
  if (modifier.remainingDays === undefined) return modifier.label;
  const days = Math.round(modifier.remainingDays);
  return webUIText('Auto.Return.componentssidebarsCharacterSidebar.156.1', {
    Label: modifier.label,
    Value2: formatNumber(days),
    Value3: webUIText(days === 1 ? 'Common.Day' : 'Common.Days'),
  });
}

export function temporaryModifierTooltipLines(modifiers: CharacterStatModifier[]): TooltipLine[] {
  if (modifiers.length === 0) return [];

  return [
    { label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.163.3'), isHeader: true },
    ...modifiers.map(modifier => ({
      label: formatTemporaryModifierLabel(modifier),
      value: formatSignedNumber(modifier.value, { maximumFractionDigits: 1 }),
      valueColor: modifierValueColor(modifier.value),
    })),
  ];
}

function traitContributionLines(character: Character, stat: StatKey): TooltipLine[] {
  return character.traits.flatMap(trait =>
    (trait.effects ?? [])
      .filter(effect => effect.stat === stat)
      .map(effect => ({
        label: trait.name,
        value: effect.value,
        valueColor: effect.isPositive ? 'var(--green)' : 'var(--red)',
      })),
  );
}

export function characterStatGlossary(stat: StatKey): { title: string; body: string } {
  const entry = getGlossaryEntry(STAT_GLOSSARY_KEYS[stat]);
  return {
    title: entry?.title ?? STAT_GLOSSARY_KEYS[stat],
    body: entry?.body ?? '',
  };
}

export function buildCharacterStatTooltip(
  stat: StatKey,
  value: number,
  character?: Character | null,
  options?: { title?: string; body?: string },
): TooltipContent {
  const glossary = characterStatGlossary(stat);
  const resolvedValue = character ? character.stats[stat] : value;
  const lines: TooltipLine[] = [];

  if (character) {
    const base = character.stats.base?.[stat];
    if (base !== undefined) {
      lines.push({
        label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1196.38'),
        value: formatNumber(base),
      });
    }

    const contributions = traitContributionLines(character, stat);
    if (contributions.length > 0) {
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1199.39'), isHeader: true });
      lines.push(...contributions);
    }

    lines.push(...temporaryModifierTooltipLines(getTemporaryStatModifiers(character, stat)));
  }

  lines.push({ label: webUIText('CharacterStats.CurrentEffects'), isHeader: true });
  lines.push(...characterStatEffectLines(stat, resolvedValue));

  return {
    title: options?.title ?? glossary.title,
    body: options?.body ?? glossary.body,
    lines,
  };
}

export type ComplianceBreakdownEntry = ModifierTooltipEntry;

export type ComplianceTooltipSource = Pick<Character, 'compliance'> &
  Partial<Pick<Character, 'complianceBreakdown' | 'opinionTowardPlayer' | 'opinionBreakdown' | 'stats' | 'traits'>>;

const COMPLIANCE_FACTOR_ICONS: Record<string, string> = {
  Loyalty: '/assets/icons/StatIcons/I_Loyalty.png',
  OpinionOfYou: '/assets/icons/I_OpinionNeutral.png',
  Patronage: '/assets/icons/Relations/I_Patron.png',
  Honour: '/assets/icons/I_Honor.png',
  Dread: '/assets/icons/I_Dread.png',
  NewRuler: '/assets/icons/RecallStatus/I_RecallStatus_Overview.png',
  ImprisonedLeader: '/assets/icons/Treaties/I_PrisonerExchange.png',
  PowerBloc: '/assets/icons/I_PowerBlocs.png',
};

function glossaryTooltip(term: string, titleFallback?: string): TooltipContent | undefined {
  const entry = getGlossaryEntry(term);
  const title = entry?.title ?? titleFallback;
  if (!title) return undefined;
  return { title, body: entry?.body };
}

function opinionSubTooltip(character?: ComplianceTooltipSource | null): TooltipContent | undefined {
  const glossary = getGlossaryEntry('Opinion');
  const lines = modifierTooltipLines(character?.opinionBreakdown);
  if (!glossary && lines.length === 0) return undefined;
  return {
    title: glossary?.title ?? webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1128.33'),
    body: glossary?.body,
    lines: lines.length > 0 ? lines : undefined,
  };
}

function loyaltySubTooltip(character?: ComplianceTooltipSource | null): TooltipContent | undefined {
  if (character?.stats) {
    return buildCharacterStatTooltip(
      'loyalty',
      character.stats.loyalty,
      character.traits ? (character as Character) : undefined,
    );
  }
  return glossaryTooltip('Loyalty');
}

function complianceFactorSubTooltip(
  entry: ComplianceBreakdownEntry,
  character?: ComplianceTooltipSource | null,
): TooltipContent | undefined {
  switch (entry.key) {
    case 'Loyalty':
      return loyaltySubTooltip(character);
    case 'OpinionOfYou':
      return opinionSubTooltip(character) ?? glossaryTooltip('Opinion', entry.label);
    case 'Patronage':
      return glossaryTooltip('Patronage', entry.label);
    case 'Honour':
      return {
        title: entry.label,
        body: webUIText('Compliance.Factor.Honour.Body'),
      };
    case 'Dread':
      return {
        title: entry.label,
        body: webUIText('Compliance.Factor.Dread.Body'),
      };
    case 'NewRuler':
      return {
        title: entry.label,
        body: webUIText('Compliance.Factor.NewRuler.Body'),
      };
    case 'ImprisonedLeader':
      return {
        title: entry.label,
        body: webUIText('Compliance.Factor.ImprisonedLeader.Body'),
      };
    case 'PowerBloc':
      return {
        title: entry.label,
        body: webUIText('Compliance.Factor.PowerBloc.Body'),
      };
    default:
      return getGlossaryEntry(entry.key || entry.label)
        ? glossaryTooltip(entry.key || entry.label)
        : undefined;
  }
}

function complianceBreakdownLine(
  entry: ComplianceBreakdownEntry,
  character?: ComplianceTooltipSource | null,
): TooltipLine {
  return {
    label: entry.label,
    labelIcon: (entry.key && COMPLIANCE_FACTOR_ICONS[entry.key]) || undefined,
    value: formatSignedNumber(entry.value, { maximumFractionDigits: 1 }),
    valueColor: modifierValueColor(entry.value),
    subTooltip: complianceFactorSubTooltip(entry, character),
  };
}

export function buildComplianceTooltip(
  value: number,
  character?: ComplianceTooltipSource | null,
  options?: { title?: string; body?: string; footer?: string },
): TooltipContent {
  const compliance = character?.compliance ?? value;
  const state = getComplianceState(compliance);
  const glossary = getGlossaryEntry('Compliance');
  const lines: TooltipLine[] = [
    {
      label: webUIText('Auto.ComponentsCommonFactionTooltip.186.3'),
      value: formatSignedNumber(compliance),
      valueColor: state.color,
    },
  ];

  if (character?.opinionTowardPlayer !== undefined) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1128.33'),
      value: formatSignedNumber(character.opinionTowardPlayer),
      valueColor: getOpinionColor(character.opinionTowardPlayer),
      subTooltip: opinionSubTooltip(character),
    });
  }

  lines.push({
    label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1129.34'),
    value: state.label,
    valueColor: state.color,
  });

  const breakdownLines = (character?.complianceBreakdown ?? []).map(entry => (
    complianceBreakdownLine(entry, character)
  ));
  if (breakdownLines.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1199.39'), isHeader: true });
    lines.push(...breakdownLines);
  }

  return {
    title: options?.title ?? webUIText('Auto.Prop.componentsscreensCharactersScreen.143.1', { Label: state.label }),
    body: options?.body ?? glossary?.body ?? webUIText('Auto.Prop.ComponentsCommonPersonTooltip.187.2'),
    footer: options?.footer,
    lines,
  };
}

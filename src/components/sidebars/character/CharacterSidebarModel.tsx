import InteractionEffectsTooltip from '../../common/tooltips/InteractionEffectsTooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import type { Character, CharacterStatModifier, SettlementTier, StatKey } from '../../../data/types';
import type { PersonInteractionView } from '../../../bridge/characters/usePersonInteractionsBridge';
import { successChanceColour } from '../../../utils/colorFormatters';
import { BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { webUIText } from '../../../localization/WebUITextContext';

export interface RelationshipGroup {
  id: string;
  title: string;
  types: string[];
  tone: 'family' | 'patronage' | 'friendly' | 'hostile';
}

export type CharacterSidebarTab = 'general' | 'relationships' | 'history';

/** Map honourDread value (-1 to +1) to a display label */
export function getHonourDreadLabel(val: number): string {
  if (val >= 0.75) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.98.1");
  if (val >= 0.5) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.99.1");
  if (val >= 0.25) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.100.1");
  if (val > -0.25) return webUIText('Common.Neutral');
  if (val > -0.5) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.102.1");
  if (val > -0.75) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.103.1");
  return webUIText("Auto.Return.componentssidebarsCharacterSidebar.104.1");
}

export function getHonourDreadColor(val: number): string {
  if (val >= 0.25) return 'var(--green)';
  if (val <= -0.25) return 'var(--red)';
  return 'var(--text-muted)';
}

export function RoleStars({ count }: { count: number }) {
  const max = 5;
  return (
    <span className="char-role-stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`char-role-star${i < count ? ' char-role-star--filled' : ''}`} />
      ))}
    </span>
  );
}

export function getHeaderAgeValue(character: Character): string {
  return formatNumber(character.age);
}

export function lowerFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

export function lowerRelationDisplay(value: string): string {
  return value.split(',').map(part => lowerFirst(part)).join(', ');
}

export function formatSettlementTierLabel(tier: SettlementTier): string {
  return webUIText(settlementTierLabelKeys[tier]);
}

export function buildHeaderAgeTooltip(character: Character, isAlive: boolean): TooltipContent {
  const lines: TooltipLine[] = [];
  if (character.birthDate) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.130.1'), value: character.birthDate });
  if (!isAlive && character.deathDate) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.131.2'), value: character.deathDate });

  return {
    get title() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.134.1", { Value1: formatNumber(character.age) }); },
    lines,
  };
}

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

export function getOpinionIcon(value: number): string {
  if (value >= 20) return '/assets/icons/I_OpinionPositive.png';
  if (value >= -20) return '/assets/icons/I_OpinionNeutral.png';
  return '/assets/icons/I_OpinionNegative.png';
}

export function modifierTooltipLines(entries?: { label: string; value: number }[]): TooltipLine[] {
  return (entries ?? []).map(entry => ({
    label: entry.label,
    value: formatSignedNumber(entry.value, { maximumFractionDigits: 1 }),
    valueColor: modifierValueColor(entry.value),
  }));
}

export function formatTemporaryModifierLabel(modifier: CharacterStatModifier): string {
  if (modifier.remainingDays === undefined) return modifier.label;
  const days = Math.round(modifier.remainingDays);
  return webUIText("Auto.Return.componentssidebarsCharacterSidebar.156.1", { Label: modifier.label, Value2: formatNumber(days), Value3: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') });
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

export const roleIcons: Record<string, string> = {
  military: '/assets/icons/I_ArmiesQuickButton.png',
  administrative: '/assets/icons/I_Domain.png',
  diplomatic: '/assets/icons/I_Diplomacy.png',
  intrigue: '/assets/icons/I_Intrigue.png',
};

export const regionIcons: Record<string, string> = {
  city: '/assets/icons/I_Capital.png',
  town: '/assets/icons/I_ProvincialCapital.png',
  village: '/assets/icons/I_Land.png',
  metropolis: '/assets/icons/I_Metropolis.png',
  fortress: '/assets/icons/I_Fortress.png',
  monastery: '/assets/icons/I_Monastery.png',
  port: '/assets/icons/I_Port.png',
  mining: '/assets/icons/I_Mining.png',
};

export const settlementTierLabelKeys: Record<SettlementTier, string> = {
  village: 'Ledger.SettlementType.Village',
  town: 'Ledger.SettlementType.Town',
  city: 'Ledger.SettlementType.City',
  metropolis: 'Ledger.SettlementType.Metropolis',
  fortress: 'Ledger.SettlementType.Fortress',
  monastery: 'Ledger.SettlementType.Monastery',
  port: 'Ledger.SettlementType.Port',
  mining: 'Ledger.SettlementType.Mining',
};

export const interactionCategoryLabels: Record<string, string> = {
  diplomacy: 'Diplomacy',
  intrigue: 'Intrigue',
  personal: 'Personal',
  military: 'Military',
  economic: 'Economic',
  marriage: 'Marriage',
  family: 'Family',
};

export const interactionCategoryOrder = [
  'personal',
  'family',
  'marriage',
  'diplomacy',
  'intrigue',
  'economic',
  'military',
] as const;

export const interactionRequirementStatusMeta: Record<string, { label: string; colour: string }> = {
  available: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.211.1'); }, colour: 'var(--green)' },
  greyed: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.212.2'); }, colour: 'var(--red)' },
  hidden: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.213.3'); }, colour: 'var(--text-dark)' },
};

export const socialRelationshipGroups: RelationshipGroup[] = [
  { id: 'succession', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.217.4'); }, types: ['Ruler', 'Heir', 'Designated Heir'], tone: 'patronage' },
  { id: 'patronage', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.218.5'); }, types: ['Patron', 'Liege', 'Client'], tone: 'patronage' },
  { id: 'friends', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.219.6'); }, types: ['Friend'], tone: 'friendly' },
  { id: 'rivals', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.220.7'); }, types: ['Enemy', 'Rival'], tone: 'hostile' },
  { id: 'relatives', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.221.8'); }, types: ['Kinsman', 'Kinswoman', 'Relative', 'Kin'], tone: 'family' },
];

export const knownRelationshipTypes = new Set(socialRelationshipGroups.reduce<string[]>((types, group) => {
  types.push(...group.types);
  return types;
}, []));

export function isPatronageRelationship(type: string): boolean {
  return type === 'Patron' || type === 'Liege' || type === 'Client';
}

export const interactionDifficultyMeta: Record<string, { label: string; colour: string }> = {
  veryEasy: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.230.9'); }, colour: 'var(--green-light)' },
  easy: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.231.10'); }, colour: 'var(--green)' },
  medium: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.232.11'); }, colour: 'var(--gold)' },
  hard: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.233.12'); }, colour: 'var(--orange)' },
  veryHard: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.234.13'); }, colour: 'var(--red)' },
};

export const EMPTY_INTERACTIONS: PersonInteractionView[] = [];

export function normaliseInteractionReason(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function uniqueInteractionReasons(interaction: PersonInteractionView) {
  const seen = new Set<string>();
  return interaction.reasons.flatMap((reason) => {
    const text = reason.reason.trim();
    if (!text) return [];
    const key = normaliseInteractionReason(text);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...reason, reason: text }];
  });
}

export function compareInteractions(a: PersonInteractionView, b: PersonInteractionView): number {
  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;
  return a.id.localeCompare(b.id);
}

export function buildInteractionTooltip(interaction: PersonInteractionView, targetPersonId: string): TooltipContent {
  const lines: TooltipLine[] = [];
  const difficulty = interactionDifficultyMeta[interaction.difficulty] ?? {
    label: interaction.difficulty,
    colour: 'var(--text-muted)',
  };
  const reasons = uniqueInteractionReasons(interaction);
  const initiatorRequirement = interaction.initiatorRequirementDescription.trim();
  const hasInitiatorRequirementReason = initiatorRequirement.length > 0
    && reasons.some(reason => normaliseInteractionReason(reason.reason) === normaliseInteractionReason(initiatorRequirement));

  lines.push({
    label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.281.4'),
    value: interactionCategoryLabels[interaction.category] ?? interaction.category,
  });
  lines.push({
    label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.285.5'),
    value: difficulty.label,
    valueColor: difficulty.colour,
  });

  if (interaction.goldCost > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.292.6'),
      value: formatNumber(interaction.goldCost),
      valueIcon: '/assets/icons/I_Coins.png',
    });
  }

  if (interaction.inProgress && interaction.remainingDays > 0) {
    const days = Math.round(interaction.remainingDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.300.7'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.300.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else if (interaction.durationDays > 0) {
    const days = Math.round(interaction.durationDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.303.8'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.303.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.305.9'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.305.1"); } });
  }

  if (interaction.successFactors.length > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.310.10'),
      value: formatPercent(interaction.successChancePercent),
      valueColor: successChanceColour(interaction.successChancePercent),
      labelIcon: '/assets/icons/I_GoalMet.png',
      isHeader: true,
    });

    for (const factor of interaction.successFactors) {
      lines.push({
        label: factor.name,
        value: `${formatSignedNumber(factor.percent)}%`,
        valueColor: factor.percent >= 0 ? 'var(--green)' : 'var(--red)',
      });
    }
  }

  if (interaction.cooldownDays > 0) {
    if (interaction.cooldownRemainingDays > 0) {
      const remaining = Math.round(interaction.cooldownRemainingDays);
      lines.push({
        label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.329.11'), labelIcon: '/assets/icons/I_Cooling.png',
        get value() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.330.1", { Value1: formatNumber(remaining), Value2: webUIText(remaining === 1 ? 'Common.Day' : 'Common.Days') }); },
        valueColor: 'var(--red)',
      });
    } else {
      const total = Math.round(interaction.cooldownDays);
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.335.12'), labelIcon: '/assets/icons/I_Cooling.png', get value() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.335.1", { Value1: formatNumber(total), Value2: webUIText(total === 1 ? 'Common.Day' : 'Common.Days') }); } });
    }
  }

  if (reasons.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.340.13'), isHeader: true });
    for (const reason of reasons) {
      const meta = interactionRequirementStatusMeta[reason.status] ?? {
        label: reason.status,
        colour: 'var(--text-muted)',
      };
      lines.push({
        label: reason.reason,
        labelColor: meta.colour,
        value: meta.label,
        valueColor: meta.colour,
      });
    }
  }

  let footer: string | undefined;
  if (interaction.needsGiftSelection) {
    footer = 'Choose the gift from the modal before starting this action.';
  } else if (interaction.needsInitiatorSelection && !hasInitiatorRequirementReason) {
    footer = initiatorRequirement || 'Choose who will carry out this action.';
  }

  const body = interaction.inProgress && interaction.remainingDays > 0
    ? (
      <>
        <span>{interaction.description}</span>
        <BureaucraticRushTooltipAction
          actionId={`person:${interaction.id}`}
          targetId={targetPersonId}
          daysSaved={interaction.bureaucraticRushDaysSaved}
          overloadLoad={interaction.bureaucraticRushLoad}
        />
      </>
    )
    : interaction.description;

  return {
    title: interaction.name,
    body,
    lines,
    afterLines: <InteractionEffectsTooltip lines={interaction.effectLines} />,
    footer,
  };
}

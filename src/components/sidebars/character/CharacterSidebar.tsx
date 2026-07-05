import React from 'react';
import Portrait, { type PortraitBadge, type PortraitHandle } from '../../common/portraits/Portrait';
import { portraitLightFromMouseEvent } from '../../common/portraits/portraitLighting';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import GameButton from '../../common/buttons/GameButton';
import InfoRow from '../../common/data-display/stats/InfoRow';
import InteractionCard from '../../common/interactions/InteractionCard';
import InteractionEffectsTooltip from '../../common/tooltips/InteractionEffectsTooltip';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../../common/tooltips/Tooltip';
import CultureTooltip from '../../common/tooltips/CultureTooltip';
import ReligionTooltip from '../../common/tooltips/ReligionTooltip';
import { TraitIcon } from '../../common/entities/TraitIcon';
import PersonInteractionInitiatorModal from '../../modals/people/PersonInteractionInitiatorModal';
import PersonInteractionGiftModal from '../../modals/people/PersonInteractionGiftModal';
import { BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import type { Character, CharacterHistoryEntry, CharacterRelationship, ActivitySegment, CharacterStatModifier, SettlementTier, StatKey } from '../../../data/types';
import { STAT_ICONS } from '../../../utils/iconMaps';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { dispatchPersonData } from '../../../bridge/characters/usePersonBridge';
import { usePinnedItemsBridge, zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import {
  usePersonInteractionsBridge,
  type PersonInteractionView,
} from '../../../bridge/characters/usePersonInteractionsBridge';
import {
  useFamilyTreeBridge,
  type FamilyTreeData,
  type FamilyTreePerson,
} from '../../../bridge/characters/useCharactersBridge';
import SidebarTabBar from '../shared/SidebarTabBar';
import SidebarToolbar from '../shared/SidebarToolbar';
import { StatCellGrid, StatCell } from '../shared/StatCellGrid';
import {
  getStatColor,
  getComplianceState,
  getOpinionColor,
  successChanceColour,
} from '../../../utils/colorFormatters';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { useFaction, usePerson, usePlayerFactionId } from '../../../data-source/index';
import { registerSidebar } from '../../../registry/index';
import '../shared/Sidebar.css';
import './CharacterSidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface CharacterSidebarProps {
  character: Character;
  onClose: () => void;
  side?: 'left' | 'right';
}

interface RelationshipGroup {
  id: string;
  title: string;
  types: string[];
  tone: 'family' | 'patronage' | 'friendly' | 'hostile';
}

interface FamilyGraphEntry {
  id: string;
  name: string;
  label: string;
  portrait?: string;
  portraitLayers?: Character['portraitLayers'];
  isAlive?: boolean;
  isImprisoned?: boolean;
  isFocus?: boolean;
  badge?: PortraitBadge;
  activity?: string;
  commanderKind?: string;
  isPlayerCharacter?: boolean;
  isRuler?: boolean;
  isHeir?: boolean;
  isDesignatedHeir?: boolean;
  isPreviousRuler?: boolean;
  descendants?: FamilyGraphEntry[];
}

interface FamilyGraphRow {
  id: string;
  title: string;
  entries: FamilyGraphEntry[];
  descendantTitle?: string;
}

interface FamilyGraph {
  rows: FamilyGraphRow[];
  ids: Set<string>;
}

type CharacterSidebarTab = 'general' | 'relationships' | 'history';

/** Map honourDread value (-1 to +1) to a display label */
function getHonourDreadLabel(val: number): string {
  if (val >= 0.75) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.98.1");
  if (val >= 0.5) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.99.1");
  if (val >= 0.25) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.100.1");
  if (val > -0.25) return webUIText('Common.Neutral');
  if (val > -0.5) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.102.1");
  if (val > -0.75) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.103.1");
  return webUIText("Auto.Return.componentssidebarsCharacterSidebar.104.1");
}

function getHonourDreadColor(val: number): string {
  if (val >= 0.25) return 'var(--green)';
  if (val <= -0.25) return 'var(--red)';
  return 'var(--text-muted)';
}

function RoleStars({ count }: { count: number }) {
  const max = 5;
  return (
    <span className="char-role-stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`char-role-star${i < count ? ' char-role-star--filled' : ''}`} />
      ))}
    </span>
  );
}

function getHeaderAgeValue(character: Character): string {
  return formatNumber(character.age);
}

function lowerFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

function lowerRelationDisplay(value: string): string {
  return value.split(',').map(part => lowerFirst(part)).join(', ');
}

function formatSettlementTierLabel(tier: SettlementTier): string {
  return webUIText(settlementTierLabelKeys[tier]);
}

function buildHeaderAgeTooltip(character: Character, isAlive: boolean): TooltipContent {
  const lines: TooltipLine[] = [];
  if (character.birthDate) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.130.1'), value: character.birthDate });
  if (!isAlive && character.deathDate) lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.131.2'), value: character.deathDate });

  return {
    get title() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.134.1", { Value1: formatNumber(character.age) }); },
    lines,
  };
}

function getTemporaryStatModifiers(character: Character, stat: StatKey): CharacterStatModifier[] {
  return character.stats.temporaryModifiers?.filter(modifier => modifier.stat === stat) ?? [];
}

function getTemporaryStatModifierTotal(modifiers: CharacterStatModifier[]): number {
  return modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
}

function modifierValueColor(value: number): string {
  if (value > 0) return 'var(--green)';
  if (value < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function getOpinionIcon(value: number): string {
  if (value >= 20) return '/assets/icons/I_OpinionPositive.png';
  if (value >= -20) return '/assets/icons/I_OpinionNeutral.png';
  return '/assets/icons/I_OpinionNegative.png';
}

function modifierTooltipLines(entries?: { label: string; value: number }[]): TooltipLine[] {
  return (entries ?? []).map(entry => ({
    label: entry.label,
    value: formatSignedNumber(entry.value, { maximumFractionDigits: 1 }),
    valueColor: modifierValueColor(entry.value),
  }));
}

function formatTemporaryModifierLabel(modifier: CharacterStatModifier): string {
  if (modifier.remainingDays === undefined) return modifier.label;
  const days = Math.round(modifier.remainingDays);
  return webUIText("Auto.Return.componentssidebarsCharacterSidebar.156.1", { Label: modifier.label, Value2: formatNumber(days), Value3: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') });
}

function temporaryModifierTooltipLines(modifiers: CharacterStatModifier[]): TooltipLine[] {
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

const roleIcons: Record<string, string> = {
  military: '/assets/icons/I_ArmiesQuickButton.png',
  administrative: '/assets/icons/I_Domain.png',
  diplomatic: '/assets/icons/I_Diplomacy.png',
  intrigue: '/assets/icons/I_Intrigue.png',
};

const regionIcons: Record<string, string> = {
  city: '/assets/icons/I_Capital.png',
  town: '/assets/icons/I_ProvincialCapital.png',
  village: '/assets/icons/I_Land.png',
  metropolis: '/assets/icons/I_Metropolis.png',
  fortress: '/assets/icons/I_Fortress.png',
  monastery: '/assets/icons/I_Monastery.png',
  port: '/assets/icons/I_Port.png',
  mining: '/assets/icons/I_Mining.png',
};

const settlementTierLabelKeys: Record<SettlementTier, string> = {
  village: 'Ledger.SettlementType.Village',
  town: 'Ledger.SettlementType.Town',
  city: 'Ledger.SettlementType.City',
  metropolis: 'Ledger.SettlementType.Metropolis',
  fortress: 'Ledger.SettlementType.Fortress',
  monastery: 'Ledger.SettlementType.Monastery',
  port: 'Ledger.SettlementType.Port',
  mining: 'Ledger.SettlementType.Mining',
};

const interactionCategoryLabels: Record<string, string> = {
  diplomacy: 'Diplomacy',
  intrigue: 'Intrigue',
  personal: 'Personal',
  military: 'Military',
  economic: 'Economic',
  marriage: 'Marriage',
  family: 'Family',
};

const interactionCategoryOrder = [
  'personal',
  'family',
  'marriage',
  'diplomacy',
  'intrigue',
  'economic',
  'military',
] as const;

const interactionRequirementStatusMeta: Record<string, { label: string; colour: string }> = {
  available: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.211.1'); }, colour: 'var(--green)' },
  greyed: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.212.2'); }, colour: 'var(--red)' },
  hidden: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.213.3'); }, colour: 'var(--text-dark)' },
};

const socialRelationshipGroups: RelationshipGroup[] = [
  { id: 'succession', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.217.4'); }, types: ['Ruler', 'Heir', 'Designated Heir'], tone: 'patronage' },
  { id: 'patronage', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.218.5'); }, types: ['Patron', 'Liege', 'Client'], tone: 'patronage' },
  { id: 'friends', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.219.6'); }, types: ['Friend'], tone: 'friendly' },
  { id: 'rivals', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.220.7'); }, types: ['Enemy', 'Rival'], tone: 'hostile' },
  { id: 'relatives', get title() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.221.8'); }, types: ['Kinsman', 'Kinswoman', 'Relative', 'Kin'], tone: 'family' },
];

const knownRelationshipTypes = new Set(socialRelationshipGroups.reduce<string[]>((types, group) => {
  types.push(...group.types);
  return types;
}, []));

function isPatronageRelationship(type: string): boolean {
  return type === 'Patron' || type === 'Liege' || type === 'Client';
}

const interactionDifficultyMeta: Record<string, { label: string; colour: string }> = {
  veryEasy: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.230.9'); }, colour: 'var(--green-light)' },
  easy: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.231.10'); }, colour: 'var(--green)' },
  medium: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.232.11'); }, colour: 'var(--gold)' },
  hard: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.233.12'); }, colour: 'var(--orange)' },
  veryHard: { get label() { return webUIText('Auto.TopProp.ComponentsSidebarsCharacterSidebar.234.13'); }, colour: 'var(--red)' },
};

const EMPTY_INTERACTIONS: PersonInteractionView[] = [];

function normaliseInteractionReason(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function uniqueInteractionReasons(interaction: PersonInteractionView) {
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

function compareInteractions(a: PersonInteractionView, b: PersonInteractionView): number {
  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;
  return a.id.localeCompare(b.id);
}

function buildInteractionTooltip(interaction: PersonInteractionView, targetPersonId: string): TooltipContent {
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

function sidebarTypeForActivityLink(type: string): string | null {
  switch (type) {
    case 'settlement': return 'settlement';
    case 'character': return 'character';
    case 'faction': return 'diplomacy';
    case 'army':
    case 'military': return 'military';
    default: return null;
  }
}

/** Render activity text with clickable links */
function ActivityText({
  segments,
  onLinkClick,
}: {
  segments?: ActivitySegment[];
  onLinkClick: (type: string, id: string) => void;
}) {
  return (
    <span className="char-header-activity-rich">
      {(segments ?? []).map((seg, i) =>
        seg.linkType && seg.linkId ? (
          <span
            key={i}
            className="char-activity-link char-activity-link--clickable"
            onMouseDown={(e) => { e.stopPropagation(); onLinkClick(seg.linkType!, seg.linkId!); }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

function HeaderActivity({
  playerRelation,
  hasActivitySegments,
  segments,
  fallbackActivity,
  onLinkClick,
}: {
  playerRelation: string;
  hasActivitySegments: boolean;
  segments?: ActivitySegment[];
  fallbackActivity: string;
  onLinkClick: (type: string, id: string) => void;
}) {
  const hasActivity = hasActivitySegments || fallbackActivity.length > 0;
  return (
    <div className="char-header-living-status">
      {playerRelation && (
        <span className="char-header-player-relation">
          <img src="/assets/icons/I_Family.png" alt="" className="char-header-player-relation-icon" draggable={false} />
          <span>{playerRelation}</span>
        </span>
      )}
      {playerRelation && hasActivity && <span className="char-header-status-separator">,</span>}
      {hasActivitySegments ? (
        <ActivityText
          segments={segments}
          onLinkClick={onLinkClick}
        />
      ) : (
        <span>{fallbackActivity}</span>
      )}
    </div>
  );
}

function historyIconForType(type: string): string {
  switch (type) {
    case 'RulingFaction':
    case 'InCourt':
      return '/assets/icons/I_Domain.png';
    case 'MilitaryCommand':
      return '/assets/icons/I_ArmiesQuickButton.png';
    case 'Diplomat':
      return '/assets/icons/I_Diplomacy.png';
    case 'Spy':
      return '/assets/icons/I_Spy.png';
    case 'Imprisoned':
      return '/assets/person-interactions/icons/ImprisonCharacter.png';
    case 'Governorship':
      return '/assets/icons/I_GovernorMission.png';
    default:
      return '/assets/icons/I_Domain.png';
  }
}

function formatHistoryRange(entry: CharacterHistoryEntry): string {
  const end = entry.isActive ? webUIText('Common.Current') : entry.endDate;
  if (entry.startDate && end) return `${entry.startDate} - ${end}`;
  return entry.startDate || end || '';
}

function sidebarTypeForHistoryTarget(entry: CharacterHistoryEntry): string | null {
  return sidebarTypeForActivityLink(entry.targetType ?? '');
}

function CharacterHistoryList({
  history,
  onOpenTarget,
}: {
  history: CharacterHistoryEntry[];
  onOpenTarget: (sidebarType: string, id: string) => void;
}) {
  const ordered = React.useMemo(() => history.slice().sort((a, b) => {
    const startDiff = (b.startDay ?? 0) - (a.startDay ?? 0);
    if (startDiff !== 0) return startDiff;
    return (b.endDay ?? 0) - (a.endDay ?? 0);
  }), [history]);

  return (
    <div className="char-history-list">
      {ordered.map((entry, index) => {
        const sidebarType = sidebarTypeForHistoryTarget(entry);
        const canOpen = Boolean(sidebarType && entry.targetId);
        const targetName = entry.targetName || entry.secondaryTargetName || entry.label;
        const dateRange = formatHistoryRange(entry);

        return (
          <div className="char-history-entry" key={`${entry.type}:${entry.targetId ?? entry.targetName}:${entry.startDay}:${index}`}>
            <img src={historyIconForType(entry.type)} alt="" className="char-history-icon" draggable={false} />
            <div className="char-history-body">
              <div className="char-history-head">
                <span className="char-history-title">{entry.label}</span>
                {dateRange && <span className="char-history-date">{dateRange}</span>}
              </div>
              {canOpen && sidebarType && entry.targetId ? (
                <button
                  type="button"
                  className="char-history-target char-history-target--link"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onOpenTarget(sidebarType, entry.targetId!);
                  }}
                >
                  {targetName}
                </button>
              ) : (
                <span className="char-history-target">{targetName}</span>
              )}
              {entry.secondaryTargetName && <span className="char-history-detail">{entry.secondaryTargetName}</span>}
              {entry.detail && <span className="char-history-detail">{entry.detail}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function addUnique(ids: string[], id: string): void {
  if (id && !ids.includes(id)) ids.push(id);
}

function sortPeopleByAge(ids: string[], people: Map<string, FamilyTreePerson>): string[] {
  return ids.slice().sort((a, b) => (people.get(b)?.age ?? 0) - (people.get(a)?.age ?? 0));
}

function familyBadgeForPerson(person: FamilyTreePerson, label: string, isFocus: boolean): PortraitBadge | undefined {
  if (person.isRuler) return 'ruler';
  if (person.isHeir || person.isDesignatedHeir) return 'heir';
  if (isFocus || ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Son', 'Daughter', 'Grandson', 'Granddaughter', 'Brother', 'Sister', 'Husband', 'Wife', 'Spouse'].includes(label)) return 'family';
  return undefined;
}

function familyBadgeForCharacter(character: Character): PortraitBadge {
  if (character.isRuler || character.activity === 'RulingFaction' || character.isPlayerCharacter) return 'ruler';
  if (character.isHeir || character.isDesignatedHeir) return 'heir';
  return 'family';
}

function familyEntryFromPerson(person: FamilyTreePerson, label: string, isFocus = false): FamilyGraphEntry {
  return {
    id: person.id,
    name: person.name,
    label,
    portrait: person.portrait,
    portraitLayers: person.portraitLayers,
    isAlive: person.isAlive,
    isImprisoned: person.isImprisoned,
    isFocus,
    badge: familyBadgeForPerson(person, label, isFocus),
    activity: person.activity,
    isRuler: person.isRuler,
    isHeir: person.isHeir,
    isDesignatedHeir: person.isDesignatedHeir,
    isPreviousRuler: person.isPreviousRuler,
  };
}

function familyEntryFromCharacter(character: Character): FamilyGraphEntry {
  return {
    id: character.id,
    name: character.name,
    get label() { return character.shortTitle || character.title || webUIText("Auto.Fix.PropExprFallback.componentssidebarsCharacterSidebar.424.1"); },
    portrait: character.portrait,
    portraitLayers: character.portraitLayers,
    isAlive: character.isAlive,
    isImprisoned: character.isImprisoned,
    isFocus: true,
    badge: familyBadgeForCharacter(character),
    activity: character.activity,
    commanderKind: character.commanderKind,
    isPlayerCharacter: character.isPlayerCharacter,
    isRuler: character.isRuler,
    isHeir: character.isHeir,
    isDesignatedHeir: character.isDesignatedHeir,
  };
}

function familyEntryFromRelationship(rel: CharacterRelationship): FamilyGraphEntry {
  return {
    id: rel.characterId,
    name: rel.characterName,
    label: rel.type,
    portrait: rel.portrait,
    portraitLayers: rel.portraitLayers,
    activity: 'InCourt',
    isRuler: rel.type === 'Ruler',
    isHeir: rel.type === 'Heir',
    isDesignatedHeir: rel.type === 'Designated Heir',
    badge: rel.type === 'Heir' || rel.type === 'Designated Heir'
      ? 'heir'
      : ['Father', 'Mother', 'Grandfather', 'Grandmother', 'GreatGrandfather', 'GreatGrandmother', 'Son', 'Daughter', 'Grandson', 'Granddaughter', 'GreatGrandson', 'GreatGranddaughter', 'Brother', 'Sister', 'Husband', 'Wife', 'Spouse', 'Consort'].includes(rel.type)
        ? 'family'
        : undefined,
  };
}

function firstName(name: string): string {
  return name.trim().split(' ')[0] || name;
}

function genderedFamilyLabel(person: FamilyTreePerson | undefined, fallback: string): string {
  if (!person) return fallback;
  const female = person.gender === 'Female';
  switch (fallback) {
    case 'Parent': return webUIText(female ? 'Character.Relation.Mother' : 'Character.Relation.Father');
    case 'Grandparent': return webUIText(female ? 'Character.Relation.Grandmother' : 'Character.Relation.Grandfather');
    case 'Child': return webUIText(female ? 'Character.Relation.Daughter' : 'Character.Relation.Son');
    case 'Grandchild': return webUIText(female ? 'Character.Relation.Granddaughter' : 'Character.Relation.Grandson');
    case 'Sibling': return webUIText(female ? 'Character.Relation.Sister' : 'Character.Relation.Brother');
    case 'Spouse': return webUIText(female ? 'Character.Relation.Wife' : 'Character.Relation.Husband');
    default: return fallback;
  }
}

function buildFamilyGraph(character: Character, familyTree: FamilyTreeData | null): FamilyGraph {
  const ids = new Set<string>();
  const rows: FamilyGraphRow[] = [];
  const pushRow = (id: string, title: string, entries: FamilyGraphEntry[], descendantTitle?: string) => {
    const uniqueEntries: FamilyGraphEntry[] = [];
    for (const entry of entries) {
      if (!entry.id || uniqueEntries.some(existing => existing.id === entry.id)) continue;
      uniqueEntries.push(entry);
      ids.add(entry.id);
      for (const descendant of entry.descendants ?? []) {
        if (descendant.id) ids.add(descendant.id);
      }
    }
    if (uniqueEntries.length > 0) rows.push({ id, title, entries: uniqueEntries, descendantTitle });
  };

  if (familyTree?.nodes.some(person => person.id === character.id)) {
    const people = new Map(familyTree.nodes.map(person => [person.id, person]));
    const parentsByChild = new Map<string, string[]>();
    const childrenByParent = new Map<string, string[]>();
    const spousesById = new Map<string, string[]>();

    for (const edge of familyTree.edges) {
      if (!people.has(edge.fromId) || !people.has(edge.toId)) continue;
      if (edge.type === 'parent') {
        const parents = parentsByChild.get(edge.toId) ?? [];
        addUnique(parents, edge.fromId);
        parentsByChild.set(edge.toId, parents);

        const children = childrenByParent.get(edge.fromId) ?? [];
        addUnique(children, edge.toId);
        childrenByParent.set(edge.fromId, children);
      } else if (edge.type === 'spouse') {
        const fromSpouses = spousesById.get(edge.fromId) ?? [];
        addUnique(fromSpouses, edge.toId);
        spousesById.set(edge.fromId, fromSpouses);

        const toSpouses = spousesById.get(edge.toId) ?? [];
        addUnique(toSpouses, edge.fromId);
        spousesById.set(edge.toId, toSpouses);
      }
    }

    const person = people.get(character.id);
    if (person) {
      const directLabel = (id: string, fallback: string): string => genderedFamilyLabel(people.get(id), fallback);
      const parentIds = sortPeopleByAge(parentsByChild.get(character.id) ?? [], people);
      const grandparentIds = sortPeopleByAge(parentIds.flatMap(id => parentsByChild.get(id) ?? []), people);
      const siblingIds = sortPeopleByAge(parentIds.flatMap(id => childrenByParent.get(id) ?? []), people)
        .filter(id => id !== character.id);
      const spouseIds = sortPeopleByAge(spousesById.get(character.id) ?? [], people);
      const childIds = sortPeopleByAge(childrenByParent.get(character.id) ?? [], people);

      pushRow('grandparents', 'Grandparents', grandparentIds.map(id => familyEntryFromPerson(people.get(id)!, directLabel(id, 'Grandparent'))));
      pushRow('parents', 'Parents', parentIds.map(id => familyEntryFromPerson(people.get(id)!, directLabel(id, 'Parent'))));
      const sameGenerationTitle = siblingIds.length > 0 && spouseIds.length > 0 ? webUIText("Auto.Fix.VarExprTrue.componentssidebarsCharacterSidebar.520.1") : siblingIds.length > 0 ? webUIText("Auto.Fix.VarExprFalseTrue.componentssidebarsCharacterSidebar.522.1") : spouseIds.length > 1 ? webUIText("Auto.Fix.VarExprFalseFalseTrue.componentssidebarsCharacterSidebar.524.1") : webUIText("Auto.Fix.VarExprFalseFalseFalse.componentssidebarsCharacterSidebar.525.1");
      pushRow('household', sameGenerationTitle, [
        ...siblingIds.map(id => familyEntryFromPerson(people.get(id)!, directLabel(id, 'Sibling'))),
        familyEntryFromPerson(person, person.shortTitle || person.title || 'Selected', true),
        ...spouseIds.map(id => familyEntryFromPerson(people.get(id)!, directLabel(id, 'Spouse'))),
      ]);
      pushRow('children', 'Children', childIds.map(id => {
        const entry = familyEntryFromPerson(people.get(id)!, directLabel(id, 'Child'));
        const descendants = sortPeopleByAge(childrenByParent.get(id) ?? [], people)
          .filter(descendantId => people.has(descendantId))
          .map(descendantId => familyEntryFromPerson(people.get(descendantId)!, directLabel(descendantId, 'Grandchild')));
        return descendants.length > 0 ? { ...entry, descendants } : entry;
      }), 'Grandchildren');

      return { rows, ids };
    }
  }

  const byType = (types: string[]) => character.relationships
    .filter(rel => types.includes(rel.type))
    .map(familyEntryFromRelationship);

  pushRow('grandparents', 'Grandparents', byType(['Grandfather', 'Grandmother', 'Grandparent']));
  pushRow('parents', 'Parents', byType(['Father', 'Mother', 'Parent']));
  const fallbackSiblings = byType(['Brother', 'Sister', 'Sibling']);
  const fallbackSpouses = byType(['Husband', 'Wife', 'Spouse', 'Consort']);
  const fallbackSameGenerationTitle = fallbackSiblings.length > 0 && fallbackSpouses.length > 0 ? webUIText("Auto.Fix.VarExprTrue.componentssidebarsCharacterSidebar.547.1") : fallbackSiblings.length > 0 ? webUIText("Auto.Fix.VarExprFalseTrue.componentssidebarsCharacterSidebar.549.1") : fallbackSpouses.length > 1 ? webUIText("Auto.Fix.VarExprFalseFalseTrue.componentssidebarsCharacterSidebar.551.1") : webUIText("Auto.Fix.VarExprFalseFalseFalse.componentssidebarsCharacterSidebar.552.1");
  pushRow('household', fallbackSameGenerationTitle, [
    ...fallbackSiblings,
    familyEntryFromCharacter(character),
    ...fallbackSpouses,
  ]);
  pushRow('children', 'Children', byType(['Son', 'Daughter', 'Child']));
  pushRow('grandchildren', 'Grandchildren', byType(['Grandson', 'Granddaughter', 'Grandchild']));

  return { rows, ids };
}

function relationshipMatchesSearch(rel: CharacterRelationship, searchLower: string): boolean {
  if (!searchLower) return true;
  return rel.characterName.toLowerCase().includes(searchLower)
    || rel.type.toLowerCase().includes(searchLower);
}

function relationshipCardClass(type: string, canOpen: boolean): string {
  let className = 'char-rel-card';
  if (!canOpen) className += ' char-rel-card--static';
  if (type === 'Enemy' || type === 'Rival') return `${className} char-rel-card--hostile`;
  if (type === 'Patron' || type === 'Liege' || type === 'Client' || type === 'Ruler') return `${className} char-rel-card--patronage`;
  if (type === 'Friend') return `${className} char-rel-card--friendly`;
  return `${className} char-rel-card--family`;
}

function relationshipTone(type: string): RelationshipGroup['tone'] {
  if (type === 'Enemy' || type === 'Rival') return 'hostile';
  if (type === 'Patron' || type === 'Liege' || type === 'Client' || type === 'Ruler') return 'patronage';
  if (type === 'Friend') return 'friendly';
  return 'family';
}

function relationshipTypeTitle(type: string): string {
  const trimmed = type.trim();
  if (!trimmed) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.588.1");
  if (trimmed === 'Kinsman' || trimmed === 'Kinswoman') return webUIText("Auto.Return.componentssidebarsCharacterSidebar.589.1");
  if (trimmed === 'Consort') return webUIText("Auto.Return.componentssidebarsCharacterSidebar.590.1");
  if (trimmed === 'Heir') return webUIText("Auto.Return.componentssidebarsCharacterSidebar.591.1");
  if (trimmed.endsWith('s')) return trimmed;
  if (trimmed.endsWith('y')) return webUIText("Auto.Return.componentssidebarsCharacterSidebar.593.1", { Value1: trimmed.slice(0, trimmed.length - 1) });
  return webUIText("Auto.Return.componentssidebarsCharacterSidebar.594.1", { Trimmed: trimmed });
}

function relationshipBadgeForType(type: string, related: Character | null): PortraitBadge | undefined {
  if (type === 'Ruler' || related?.isRuler || related?.activity === 'RulingFaction' || related?.isPlayerCharacter) return 'ruler';
  if (type === 'Heir' || type === 'Designated Heir' || related?.isHeir || related?.isDesignatedHeir) return 'heir';
  if (['Father', 'Mother', 'Grandfather', 'Grandmother', 'GreatGrandfather', 'GreatGrandmother', 'Son', 'Daughter', 'Grandson', 'Granddaughter', 'GreatGrandson', 'GreatGranddaughter', 'Brother', 'Sister', 'Husband', 'Wife', 'Spouse', 'Consort', 'Kinsman', 'Kinswoman', 'Relative', 'Kin'].includes(type) || related?.isFamilyOfPlayer) return 'family';
  return undefined;
}

function FamilyGraphCard({
  entry,
  onOpen,
}: {
  entry: FamilyGraphEntry;
  onOpen: (id: string) => void;
}) {
  const displayName = entry.name;
  const familyName = firstName(displayName);
  const detail = entry.label;
  const isAlive = entry.isAlive;
  const isImprisoned = entry.isImprisoned === true;
  const canOpen = Boolean(entry.id) && !entry.isFocus;
  const activity = entry.activity ?? 'InCourt';
  const commanderKind = entry.commanderKind;
  const isPlayerCharacter = entry.isPlayerCharacter;
  const isRuler = entry.isRuler;
  const isHeir = entry.isHeir;
  const isDesignatedHeir = entry.isDesignatedHeir;

  return (
    <button
      type="button"
      className={`char-family-card${entry.isFocus ? ' char-family-card--focus' : ''}${isAlive === false ? ' char-family-card--dead' : ''}${isImprisoned && isAlive !== false ? ' char-family-card--imprisoned' : ''}${canOpen ? '' : ' char-family-card--static'}`}
      onMouseDown={canOpen ? () => onOpen(entry.id) : undefined}
      aria-label={displayName}
    >
      <PersonTooltip characterId={entry.id} position="left" delay={150}>
        <span className="char-family-card-portrait">
          <Portrait
            personId={entry.id}
            resolvePerson={false}
            src={entry.portrait}
            layers={entry.portraitLayers}
            isImprisoned={entry.isImprisoned}
            isAlive={isAlive}
            badge={entry.badge}
            name={displayName}
            size="lg"
            shape="rect"
            showBorder
            activity={activity}
            commanderKind={commanderKind}
            isPlayerCharacter={isPlayerCharacter}
            isRuler={isRuler}
            isHeir={isHeir}
            isDesignatedHeir={isDesignatedHeir}
            isPreviousRuler={entry.isPreviousRuler}
          />
          {isAlive === false && <span className="char-rel-state-badge char-rel-state-badge--dead"><img src="/assets/icons/I_Skull.png" alt="" draggable={false} /></span>}
          {isImprisoned && isAlive !== false && <span className="char-rel-state-badge char-rel-state-badge--imprisoned"><img src="/assets/person-interactions/icons/ImprisonCharacter.png" alt="" draggable={false} /></span>}
        </span>
      </PersonTooltip>
      <span className="char-family-card-copy">
        <span className="char-family-card-name">{familyName}</span>
        <span className="char-family-card-role">{entry.label}</span>
        {detail && detail !== entry.label && <span className="char-family-card-detail">{detail}</span>}
      </span>
    </button>
  );
}

function FamilyGraphView({
  graph,
  onOpen,
}: {
  graph: FamilyGraph;
  onOpen: (id: string) => void;
}) {
  if (graph.rows.length === 0) return null;

  return (
    <div className="char-family-tree">
      {graph.rows.map(row => (
        <div key={row.id} className={`char-family-row char-family-row--${row.id}`}>
          <div className="char-family-row-label">{row.title}</div>
          <div className={`char-family-row-cards${row.entries.length > 1 ? ' char-family-row-cards--multi' : ''}`}>
            {row.entries.map(entry => {
              const descendants = entry.descendants ?? [];
              const branchStyle: React.CSSProperties | undefined = descendants.length > 0
                ? { width: `${Math.max(5.9, descendants.length * 5.9)}rem` }
                : undefined;

              return (
                <div key={entry.id} className={`char-family-branch${descendants.length > 0 ? ' char-family-branch--with-descendants' : ''}`} style={branchStyle}>
                  <div className="char-family-branch-head">
                    <FamilyGraphCard entry={entry} onOpen={onOpen} />
                  </div>
                  {descendants.length > 0 && (
                    <div className="char-family-descendants">
                      <div className="char-family-descendants-label">{row.descendantTitle}</div>
                      <div className={`char-family-descendant-cards${descendants.length > 1 ? ' char-family-descendant-cards--multi' : ''}`}>
                        {descendants.map(descendant => (
                          <div key={descendant.id} className="char-family-descendant-branch">
                            <FamilyGraphCard entry={descendant} onOpen={onOpen} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RelationshipOverviewCard({
  rel,
  onOpen,
}: {
  rel: CharacterRelationship;
  onOpen: (id: string) => void;
}) {
  const displayName = rel.characterName;
  const detail = rel.type;
  const status = rel.age && rel.age > 0 ? webUIText('AgentSelect.CandidateAge', { Age: formatNumber(rel.age) }) : '';
  const isAlive = rel.isAlive;
  const isImprisoned = false;
  const badge = relationshipBadgeForType(rel.type, null);
  const canOpen = Boolean(rel.characterId);
  const activity = 'InCourt';
  const isRuler = rel.type === 'Ruler';
  const isHeir = rel.type === 'Heir';
  const isDesignatedHeir = rel.type === 'Designated Heir';

  return (
    <button
      type="button"
      className={`${relationshipCardClass(rel.type, canOpen)}${isAlive === false ? ' char-rel-card--dead' : ''}${isImprisoned && isAlive !== false ? ' char-rel-card--imprisoned' : ''}`}
      onMouseDown={canOpen ? () => onOpen(rel.characterId) : undefined}
      aria-label={displayName}
    >
      <PersonTooltip characterId={rel.characterId} position="left" delay={150}>
        <span className="char-rel-card-portrait">
          <Portrait
            personId={rel.characterId}
            resolvePerson={false}
            src={rel.portrait}
            layers={rel.portraitLayers}
            isImprisoned={false}
            isAlive={isAlive}
            badge={badge}
            name={displayName}
            size="lg"
            shape="rect"
            showBorder
            activity={activity}
            isRuler={isRuler}
            isHeir={isHeir}
            isDesignatedHeir={isDesignatedHeir}
          />
          {isAlive === false && <span className="char-rel-state-badge char-rel-state-badge--dead"><img src="/assets/icons/I_Skull.png" alt="" draggable={false} /></span>}
          {isImprisoned && isAlive !== false && <span className="char-rel-state-badge char-rel-state-badge--imprisoned"><img src="/assets/person-interactions/icons/ImprisonCharacter.png" alt="" draggable={false} /></span>}
        </span>
      </PersonTooltip>
      <span className="char-rel-card-copy">
        <span className="char-rel-card-name">{displayName}</span>
        <span className="char-rel-card-role">{rel.type}</span>
        {detail && <span className="char-rel-card-detail">{detail}</span>}
        {status && <span className="char-rel-card-status">{status}</span>}
      </span>
    </button>
  );
}

function CharacterDutyRow({
  icon,
  label,
  value,
  detail,
  tooltip,
  onOpen,
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
  tooltip: TooltipContent;
  onOpen: () => void;
}) {
  return (
    <Tooltip content={tooltip} position="bottom" delay={160}>
      <button
        type="button"
        className="char-duty-row"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }}
      >
        <img src={icon} alt="" className="char-duty-icon" draggable={false} />
        <span className="char-duty-label">{label}</span>
        <span className="char-duty-value">{value}</span>
        {detail && <span className="char-duty-detail">{detail}</span>}
      </button>
    </Tooltip>
  );
}

const CharacterSidebar: React.FC<CharacterSidebarProps> = ({ character, onClose, side = 'left' }) => {
  const { openSidebar, openScreen, showAdvisor, addNotification, navigateSidebarHistory } = useGameActions();
  const { debugMode, sidebarNavigation, gameDay } = useGameState();
  const playerFactionId = usePlayerFactionId();
  const playerFaction = useFaction(playerFactionId, 'overview', false);
  const isRight = side === 'right';
  const { isPinned: checkPinned, togglePin } = usePinnedItemsBridge();
  const {
    state: interactionsState,
    start: startInteraction,
    cancel: cancelInteraction,
    loadOptions: loadInteractionOptions,
  } = usePersonInteractionsBridge(character.id);
  const [activeTab, setActiveTab] = React.useState<CharacterSidebarTab>('general');
  const familyTree = useFamilyTreeBridge(character.id, 'lineage', activeTab === 'relationships');
  const isPinned = checkPinned('character', character.id);
  const characterNavigation = sidebarNavigation.character;
  const canNavigateBack = (characterNavigation?.back.length ?? 0) > 0;
  const canNavigateForward = (characterNavigation?.forward.length ?? 0) > 0;
  const [relationshipSearch, setRelationshipSearch] = React.useState('');
  const [initiatorModalInteraction, setInitiatorModalInteraction] = React.useState<PersonInteractionView | null>(null);
  const [giftModalInteraction, setGiftModalInteraction] = React.useState<PersonInteractionView | null>(null);
  const lastDayRefreshRef = React.useRef<{ personId: string; gameDay: number } | null>(null);

  React.useEffect(() => {
    if (!character.id || gameDay <= 0) return;

    const previous = lastDayRefreshRef.current;
    lastDayRefreshRef.current = { personId: character.id, gameDay };

    if (!previous || previous.personId !== character.id || previous.gameDay === gameDay) return;

    bridgeCall('game.get_person_data', { personId: character.id })
      .then(dispatchPersonData)
      .catch(acknowledgeBridgeFailure);
  }, [character.id, gameDay]);

  // Derive spouse from relationships
  const spouseRel = character.relationships.find(r => r.type === 'Husband' || r.type === 'Wife' || r.type === 'Spouse' || r.type === 'Consort');
  const spouseId = spouseRel?.characterId || null;
  const spouse = usePerson(spouseId);
  const isAlive = character.isAlive !== false;
  const isImprisoned = character.isImprisoned === true;
  const showCompliance = isAlive
    && character.isPlayerCharacter !== true
    && character.isSubordinateOfPlayer === true;
  const complianceState = showCompliance ? getComplianceState(character.compliance) : null;
  const showOpinionOfPlayer = isAlive
    && character.isPlayerCharacter !== true
    && character.opinionTowardPlayer !== undefined;
  const opinionOfPlayer = character.opinionTowardPlayer ?? 0;
  const opinionColor = getOpinionColor(opinionOfPlayer);
  const opinionIcon = getOpinionIcon(opinionOfPlayer);
  const opinionTooltipLines: TooltipLine[] = [
    {
      label: webUIText('Auto.ComponentsSidebarsDiplomacySidebar.409.4'),
      value: formatSignedNumber(opinionOfPlayer),
      valueColor: opinionColor,
    },
  ];
  const opinionBreakdownLines = modifierTooltipLines(character.opinionBreakdown);
  if (opinionBreakdownLines.length > 0) {
    opinionTooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1199.39'), isHeader: true });
    opinionTooltipLines.push(...opinionBreakdownLines);
  }
  const complianceTooltipLines: TooltipLine[] = complianceState ? [
    {
      label: webUIText('Auto.ComponentsCommonFactionTooltip.186.3'),
      value: formatSignedNumber(character.compliance),
      valueColor: complianceState.color,
    },
    ...(showOpinionOfPlayer ? [{
      label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1128.33'),
      value: formatSignedNumber(opinionOfPlayer),
      valueColor: opinionColor,
    }] : []),
    {
      label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1129.34'),
      value: complianceState.label,
      valueColor: complianceState.color,
    },
  ] : [];
  const complianceBreakdownLines = modifierTooltipLines(character.complianceBreakdown);
  if (complianceTooltipLines.length > 0 && complianceBreakdownLines.length > 0) {
    complianceTooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1199.39'), isHeader: true });
    complianceTooltipLines.push(...complianceBreakdownLines);
  }

  // Luxury needs (hide for dead characters)
  const luxuryNeeds = isAlive ? (character.luxuryNeeds || []) : [];

  const coreStats: Array<{ key: StatKey; label: string; value: number; icon: string; description: string }> = [
    { key: 'tactics', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.788.14'), value: character.stats.tactics, icon: STAT_ICONS.tactics, description: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.788.15') },
    { key: 'authority', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.789.16'), value: character.stats.authority, icon: STAT_ICONS.authority, description: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.789.17') },
    { key: 'cunning', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.790.18'), value: character.stats.cunning, icon: STAT_ICONS.cunning, description: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.790.19') },
    { key: 'governance', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.791.20'), value: character.stats.governance, icon: STAT_ICONS.governance, description: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.791.21') },
    { key: 'loyalty', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.792.22'), value: character.stats.loyalty, icon: STAT_ICONS.loyalty, description: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.792.23') },
    { key: 'constitution', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.793.24'), value: character.stats.constitution, icon: STAT_ICONS.constitution, description: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.793.25') },
  ];

  // Honour/Dread: -1.0 to +1.0. Single bar showing abs(value), color changes by sign.
  const hdVal = character.honourDread;
  const hdLabel = getHonourDreadLabel(hdVal);
  const hdColor = getHonourDreadColor(hdVal);

  // Role experience entries
  const roleEntries = character.roleTiers ? [
    { key: 'military', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.803.26'), xp: character.roleExperience.military, tier: character.roleTiers.military },
    { key: 'administrative', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.804.27'), xp: character.roleExperience.administrative, tier: character.roleTiers.administrative },
    { key: 'diplomatic', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.805.28'), xp: character.roleExperience.diplomatic, tier: character.roleTiers.diplomatic },
    { key: 'intrigue', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.806.29'), xp: character.roleExperience.intrigue, tier: character.roleTiers.intrigue },
  ] : [];
  const characterHistory = character.history ?? [];

  const familyGraph = React.useMemo(
    () => buildFamilyGraph(character, familyTree),
    [character, familyTree],
  );
  const searchLower = relationshipSearch.trim().toLowerCase();
  const visibleFamilyGraph = React.useMemo(() => {
    if (!searchLower) return familyGraph;
    return {
      ids: familyGraph.ids,
      rows: familyGraph.rows
        .map(row => ({
          ...row,
          entries: row.entries.filter(entry => (
            entry.name.toLowerCase().includes(searchLower)
            || entry.label.toLowerCase().includes(searchLower)
          )),
        }))
        .filter(row => row.entries.length > 0),
    };
  }, [familyGraph, searchLower]);
  const groupedSocialRelationshipSections = socialRelationshipGroups
    .map(group => ({
      id: group.id,
      title: group.title,
      tone: group.tone,
      items: character.relationships
        .filter(rel => group.types.includes(rel.type))
        .filter(rel => isPatronageRelationship(rel.type) || !familyGraph.ids.has(rel.characterId))
        .filter(rel => relationshipMatchesSearch(rel, searchLower)),
    }))
    .filter(section => section.items.length > 0);
  const otherRelationships = character.relationships
    .filter(rel => !knownRelationshipTypes.has(rel.type))
    .filter(rel => !familyGraph.ids.has(rel.characterId))
    .filter(rel => relationshipMatchesSearch(rel, searchLower));
  const otherSocialRelationshipSections = Array.from(otherRelationships.reduce((grouped, rel) => {
    const key = rel.type.trim() || 'Connections';
    const existing = grouped.get(key);
    if (existing) existing.push(rel);
    else grouped.set(key, [rel]);
    return grouped;
  }, new Map<string, CharacterRelationship[]>()).entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, items]) => ({
      id: `type-${type}`,
      title: relationshipTypeTitle(type),
      tone: relationshipTone(type),
      items,
    }));
  const socialRelationshipSections = [...groupedSocialRelationshipSections, ...otherSocialRelationshipSections];

  const interactions = React.useMemo(
    () => interactionsState?.interactions ?? EMPTY_INTERACTIONS,
    [interactionsState],
  );
  const interactionSections = React.useMemo(() => {
    const grouped = new Map<string, PersonInteractionView[]>();

    for (const interaction of interactions) {
      const category = interaction.category || 'personal';
      const existing = grouped.get(category);
      if (existing) existing.push(interaction);
      else grouped.set(category, [interaction]);
    }

    const orderedSections = interactionCategoryOrder
      .filter(category => grouped.has(category))
      .map(category => ({
        id: category,
        label: interactionCategoryLabels[category] ?? category,
        interactions: (grouped.get(category) ?? EMPTY_INTERACTIONS).slice().sort(compareInteractions),
      }));

    const extraSections = Array.from(grouped.entries())
      .filter(([category]) => !interactionCategoryOrder.includes(category as (typeof interactionCategoryOrder)[number]))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, sectionInteractions]) => ({
        id: category,
        label: interactionCategoryLabels[category] ?? category,
        interactions: sectionInteractions.slice().sort(compareInteractions),
      }));

    return [...orderedSections, ...extraSections];
  }, [interactions]);

  const closeInteractionModals = React.useCallback(() => {
    setInitiatorModalInteraction(null);
    setGiftModalInteraction(null);
  }, []);

  React.useEffect(() => {
    closeInteractionModals();
  }, [character.id, closeInteractionModals]);

  const isInteractionModalOpen = initiatorModalInteraction !== null || giftModalInteraction !== null;
  React.useEffect(() => {
    if (!isInteractionModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeInteractionModals();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [closeInteractionModals, isInteractionModalOpen]);

  const notifyInteractionFailure = React.useCallback((message?: string) => {
    addNotification({
      title: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.941.30'),
      get description() { return message || webUIText("Auto.Fix.PropExprFallback.componentssidebarsCharacterSidebar.942.1"); },
      type: 'character',
    });
  }, [addNotification]);

  const startSimpleInteraction = React.useCallback(async (interactionId: string) => {
    const response = await startInteraction(interactionId);
    if (!response?.started) {
      notifyInteractionFailure(response?.message);
    }
  }, [notifyInteractionFailure, startInteraction]);

  const handleInteractionClick = React.useCallback(async (interaction: PersonInteractionView) => {
    if (interaction.availability !== 'available') return;

    if (interaction.needsInitiatorSelection) {
      const loaded = await loadInteractionOptions(interaction.id);
      if (!loaded || loaded.availability !== 'available' || loaded.initiatorCandidates.length === 0) {
        notifyInteractionFailure(loaded?.reasons[0]?.reason);
        return;
      }

      setGiftModalInteraction(null);
      setInitiatorModalInteraction(loaded);
      return;
    }

    if (interaction.needsGiftSelection) {
      const loaded = await loadInteractionOptions(interaction.id);
      if (!loaded || loaded.availability !== 'available' || loaded.giftOptions.length === 0) {
        notifyInteractionFailure(loaded?.reasons[0]?.reason);
        return;
      }

      setInitiatorModalInteraction(null);
      setGiftModalInteraction(loaded);
      return;
    }

    await startSimpleInteraction(interaction.id);
  }, [loadInteractionOptions, notifyInteractionFailure, startSimpleInteraction]);

  const handleInitiatorConfirm = React.useCallback(async (candidateId: string) => {
    if (!initiatorModalInteraction) {
      return webUIText('CharacterSidebar.ActionUnavailable');
    }

    const response = await startInteraction(initiatorModalInteraction.id, { initiatorPersonId: candidateId });
    if (!response) {
      return webUIText('CharacterSidebar.ActionStartFailed');
    }

    if (!response.started) {
      return response.message || webUIText('CharacterSidebar.ActionStartFailed');
    }

    return null;
  }, [initiatorModalInteraction, startInteraction]);

  const handleGiftConfirm = React.useCallback(async (giftTypeIndex: number) => {
    if (!giftModalInteraction) {
      return webUIText('CharacterSidebar.ActionUnavailable');
    }

    const response = await startInteraction(giftModalInteraction.id, { giftTypeIndex });
    if (!response) {
      return webUIText('CharacterSidebar.ActionStartFailed');
    }

    if (!response.started) {
      return response.message || webUIText('CharacterSidebar.ActionStartFailed');
    }

    return null;
  }, [giftModalInteraction, startInteraction]);

  const sideClass = isRight ? 'sidebar--right' : 'sidebar--left';

  // Faction name is only needed for the tooltip label; the roundel fetches
  // its own colour/emblem from the factionId.
  const factionSlug = character.faction?.replace('faction-', '') || '';
  const factionName = factionSlug.replace(/^\w/, c => c.toUpperCase()).replace(/-/g, ' ');
  const activityLabel = formatPersonActivity(character.activity);
  const headerActivityLabel = activityLabel;
  const hasActivitySegments = (character.activitySegments?.length ?? 0) > 0;
  const rulerFactionSuffix = character.isRuler && character.rulerFactionName
    ? webUIText('CharacterSidebar.RulerFactionSuffix', { Faction: character.rulerFactionName })
    : '';
  const playerRelationLabel = isAlive && character.isFamilyOfPlayer && character.relationToPlayer
    ? webUIText('CharacterSidebar.PlayerRelation', { Relation: lowerRelationDisplay(character.relationToPlayer) })
    : '';
  const courtScreen = playerFaction?.diplomaticStatus === 'subject'
    ? 'governor-faction-overview'
    : 'factionOverview';
  const deathStatusText = !isAlive
    ? [character.lifespan, character.deathCause].filter(Boolean).join(' - ')
    : '';
  const hasHeaderActivity = !isAlive || playerRelationLabel.length > 0 || hasActivitySegments || headerActivityLabel.length > 0;
  const headerAgeValue = getHeaderAgeValue(character);
  const headerAgeTooltip = buildHeaderAgeTooltip(character, isAlive);
  const handleActivityLinkClick = React.useCallback((type: string, id: string) => {
    const sidebarType = sidebarTypeForActivityLink(type);
    if (!sidebarType || !id) return;
    openSidebar(sidebarType, id);
  }, [openSidebar]);
  const headerBackdropPortraitRef = React.useRef<PortraitHandle | null>(null);
  const headerForegroundPortraitRef = React.useRef<PortraitHandle | null>(null);
  const headerSpousePortraitRef = React.useRef<PortraitHandle | null>(null);
  const handleHeaderMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const light = portraitLightFromMouseEvent(event);
    headerBackdropPortraitRef.current?.relight(light);
    headerForegroundPortraitRef.current?.relight(light);
    headerSpousePortraitRef.current?.relight(light);
  }, []);

  return (
    <div className={`sidebar ${sideClass} sidebar--visible character-sidebar`}>
      <SidebarToolbar
        navButtons={[
          {
            icon: '/assets/icons/I_NavPrevious.png',
            get tooltip() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1027.1"); },
            get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1016.7'); },
            onClick: () => navigateSidebarHistory('character', -1),
            disabled: !canNavigateBack,
          },
          {
            icon: '/assets/icons/I_NavNext.png',
            get tooltip() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1034.1"); },
            get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1023.8'); },
            onClick: () => navigateSidebarHistory('character', 1),
            disabled: !canNavigateForward,
          },
        ]}
        actionButtons={[
          { icon: isPinned ? '/assets/icons/I_Pin_Pinned.png' : '/assets/icons/I_Pin_Unpinned.png', get tooltip() { return isPinned ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsCharacterSidebar.1041.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsCharacterSidebar.1041.1"); }, get tooltipBody() { return isPinned ? webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1029.1') : webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1029.2'); }, onClick: () => togglePin('character', character.id), isActive: isPinned },
          { icon: '/assets/icons/I_Family.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1042.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1030.3'); }, onClick: () => openScreen('familyTree', `tree:${character.id}`) },
          { icon: '/assets/icons/I_Diplomacy.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1043.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1031.4'); }, onClick: () => openScreen('familyTree', `patronage:${character.id}`) },
          { icon: '/assets/icons/I_ZoomTo.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1044.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1032.5'); }, onClick: () => zoomToBridge('character', character.id) },
          { icon: '/assets/ui/I_HelpIcon.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1045.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1033.6'); }, onClick: () => showAdvisor('characterSidebar', { force: true }) },
        ]}
        onClose={onClose}
        closePosition={isRight ? 'start' : 'end'}
      />

      {/* Full-width header with portrait scene */}
      <div className={`char-header${!isAlive ? ' char-header--dead' : ''}`} onMouseMove={handleHeaderMouseMove}>
        <div className={`char-header-portrait${spouseRel ? ' char-header-portrait--with-spouse' : ''}`}>
          <Portrait ref={headerBackdropPortraitRef} className="char-header-selected-backdrop" name={character.name} src={character.portrait} layers={character.portraitLayers} isAlive={isAlive} isImprisoned={isImprisoned} size="hero" shape="rect" showBorder={false} />
          {spouseRel && (
            <div className="char-header-spouse-wrap">
              <PersonTooltip character={spouse ?? undefined} characterId={spouse ? undefined : spouseId} position="left" delay={200}>
                <div className="char-header-spouse">
                  <Portrait
                    ref={headerSpousePortraitRef}
                    personId={spouse ? undefined : spouseId ?? undefined}
                    name={spouse?.name ?? spouseRel.characterName}
                    src={spouse?.portrait ?? spouseRel.portrait}
                    layers={spouse?.portraitLayers}
                    isAlive={spouse?.isAlive ?? spouseRel.isAlive}
                    isImprisoned={spouse?.isImprisoned}
                    size="hero"
                    shape="rect"
                    showBorder={false}
                    showBadge={false}
                  />
                </div>
              </PersonTooltip>
            </div>
          )}
          <Portrait ref={headerForegroundPortraitRef} className="char-header-selected-foreground" name={character.name} src={character.portrait} layers={character.portraitLayers} isAlive={isAlive} isImprisoned={isImprisoned} size="hero" shape="rect" showBorder={false} />
        </div>
        {/* Dead icon overlay */}
        {!isAlive && (
          <Tooltip content={{
            title: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1059.31'),
            get body() { return character.deathCause && character.deathDate ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsCharacterSidebar.1061.1", { DeathCause: character.deathCause, DeathDate: character.deathDate }) : character.deathCause ? webUIText("Auto.Fix.PropExprFalseTrue.componentssidebarsCharacterSidebar.1063.1", { DeathCause: character.deathCause }) : webUIText("Auto.Fix.PropExprFalseFalse.componentssidebarsCharacterSidebar.1064.1"); },
          }} position="bottom" delay={200}>
            <div className="char-header-dead-overlay">
              <img src="/assets/icons/I_Dread.png" alt="" className="char-header-dead-icon" />
            </div>
          </Tooltip>
        )}
        {character.faction && (
          <div className="char-header-roundel">
            <FactionTooltip factionId={character.faction} factionName={factionName} position="right" delay={200}>
              <FactionRoundel
                factionId={character.faction}
                colour={character.factionColour}
                secondaryColour={character.factionSecondaryColour}
                name={factionName}
                size="lg"
                showRing={false}
                resolveFaction={false}
                onClick={() => openSidebar('diplomacy', character.faction)}
              />
            </FactionTooltip>
          </div>
        )}
        <div className="char-header-scrim">
          <div className="char-header-name-row">
            <div className="char-header-main-name">
              {character.shortTitle && <span className="char-header-title-prefix">{character.shortTitle}</span>}
              <span className="char-header-name">{character.name}</span>
              <Tooltip content={headerAgeTooltip} position="bottom" delay={200} inline>
                <span className="char-header-age">{headerAgeValue}</span>
              </Tooltip>
            </div>
            {rulerFactionSuffix && <span className="char-header-ruler-suffix">{rulerFactionSuffix}</span>}
          </div>
          <div className="char-header-info-row">
            {hasHeaderActivity && (
              <div className="char-header-faction">
                {!isAlive ? (
                  <div className="char-header-lifespan">
                    <img src="/assets/icons/I_Skull.png" alt="" className="char-header-lifespan-icon" draggable={false} />
                    {deathStatusText && <span>{deathStatusText}</span>}
                  </div>
                ) : (
                  <HeaderActivity
                    playerRelation={playerRelationLabel}
                    hasActivitySegments={hasActivitySegments}
                    segments={character.activitySegments}
                    fallbackActivity={headerActivityLabel}
                    onLinkClick={handleActivityLinkClick}
                  />
                )}
              </div>
            )}
            {(showOpinionOfPlayer || complianceState) && (
              <div className="char-header-standing-badges">
                {showOpinionOfPlayer && (
                  <Tooltip content={{
                    title: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.221.3'),
                    lines: opinionTooltipLines,
                  }} position="bottom" delay={200}>
                    <div className="char-header-opinion-badge" style={{ color: opinionColor }}>
                      <img src={opinionIcon} alt="" className="char-header-opinion-badge-icon" />
                    </div>
                  </Tooltip>
                )}
                {complianceState && (
                  <Tooltip content={{
                    get title() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1125.1", { Label: complianceState.label }); },
                    body: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1126.32'),
                    lines: complianceTooltipLines,
                    footer: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1131.35'),
                  }} position="bottom" delay={200}>
                    <div className="char-header-compliance-badge" style={{ color: complianceState.color }}>
                      <img src={complianceState.icon} alt="" className="char-header-compliance-badge-icon" />
                      {complianceState.label}
                    </div>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <SidebarTabBar
        tabs={[
          { id: 'general', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1144.36') },
          { id: 'relationships', label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1144.37') },
          { id: 'history', label: webUIText('Economy.TabHistory') },
        ]}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as CharacterSidebarTab)}
      />

      <StyledScrollArea className="sidebar-content sidebar-content--textured">
        {activeTab === 'general' && <>
        {/* Culture / Religion - side by side */}
        <div className="char-identity-pair">
          <CultureTooltip info={character.cultureInfo} fallbackName={character.culture}>
            <div className="char-identity-row">
              <img src="/assets/icons/I_Cultures.png" alt="" className="char-identity-icon" />
              <span className="char-identity-label"><WebUIText textKey="Auto.ComponentsSidebarsCharacterSidebar.1155.1" /></span>
              <span className="char-identity-value">{character.culture}</span>
            </div>
          </CultureTooltip>
          <ReligionTooltip info={character.religionInfo} fallbackName={character.religion}>
            <div className="char-identity-row">
              <img src="/assets/icons/I_Religions.png" alt="" className="char-identity-icon" />
              <span className="char-identity-label"><WebUIText textKey="Auto.ComponentsSidebarsCharacterSidebar.1162.2" /></span>
              <span className="char-identity-value">{character.religion}</span>
            </div>
          </ReligionTooltip>
        </div>

        {/* Traits */}
        <div className="char-trait-strip">
          {character.traits.map((trait) => {
            const footer = trait.isTemporary && trait.remainingDays !== undefined ? webUIText("Auto.Fix.VarExprTrue.componentssidebarsCharacterSidebar.1173.1", { RemainingDays: trait.remainingDays, Value2: trait.remainingDays === 1 ? webUIText("Auto.Fix.VarExprTrueArgTrue.componentssidebarsCharacterSidebar.1173.1") : webUIText("Auto.Fix.VarExprTrueArgFalse.componentssidebarsCharacterSidebar.1173.1") }) : undefined;
            return (
              <Tooltip key={trait.id} position="bottom" delay={100} content={{ title: trait.name, body: trait.description, footer, lines: (trait.effects ?? []).map(e => ({ label: e.label, labelIcon: STAT_ICONS[e.stat], value: e.value, valueColor: e.isPositive ? 'var(--green)' : 'var(--red)' })) }}>
                <TraitIcon trait={trait} className="char-trait-icon" />
              </Tooltip>
            );
          })}
        </div>

        {/* Stats - 3-column grid */}
        <StatCellGrid>
          {coreStats.map((stat) => {
            const base = character.stats.base?.[stat.key];
            const temporaryModifiers = getTemporaryStatModifiers(character, stat.key);
            const temporaryTotal = getTemporaryStatModifierTotal(temporaryModifiers);
            const contributions = character.traits.flatMap((trait) =>
              (trait.effects ?? [])
                .filter((e) => e.stat === stat.key)
                .map((e) => ({ label: trait.name, value: e.value, valueColor: e.isPositive ? 'var(--green)' : 'var(--red)' })),
            );
            const tooltipLines: TooltipLine[] = [];
            if (base !== undefined) {
              tooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1196.38'), value: formatNumber(base) });
            }
            if (contributions.length > 0) {
              tooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1199.39'), isHeader: true });
              tooltipLines.push(...contributions);
            }
            tooltipLines.push(...temporaryModifierTooltipLines(temporaryModifiers));
            return (
              <Tooltip key={stat.label} content={{ title: stat.label, body: stat.description, lines: tooltipLines }} position="bottom" delay={150}>
                <StatCell
                  icon={stat.icon}
                  value={stat.value}
                  valueColor={getStatColor(stat.value)}
                  delta={Math.abs(temporaryTotal) >= 0.05 ? formatSignedNumber(temporaryTotal, { maximumFractionDigits: 1 }) : undefined}
                  deltaColor={modifierValueColor(temporaryTotal)}
                />
              </Tooltip>
            );
          })}
        </StatCellGrid>
        {/* Fame - separated */}
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1217.40'), body: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1217.41') }} position="bottom" delay={150}>
          <div className="char-fame-row">
            <img src="/assets/icons/I_Fame.png" alt="" className="char-fame-icon" />
            <span className="char-fame-label"><WebUIText textKey="Auto.ComponentsSidebarsCharacterSidebar.1219.3" /></span>
            <span className="char-fame-val">{formatNumber(character.fame)}</span>
          </div>
        </Tooltip>

        {/* Role Experience stars */}
        <div className="char-role-experience">
          {roleEntries.map(role => {
            const tier = role.tier;
            return (
              <Tooltip key={role.key} content={{ get title() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1230.1", { Label: role.label, Label2: tier.label }); }, get body() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1230.2", { Xp: role.xp, Value2: role.label.toLowerCase() }); } }} position="bottom" delay={200}>
                <div className="char-role-row">
                  <img src={roleIcons[role.key]} alt="" className="char-role-icon" />
                  <span className="char-role-label">{role.label}</span>
                  <RoleStars count={tier.stars} />
                </div>
              </Tooltip>
            );
          })}
        </div>

        {/* Honour/Dread - center-pivot bar */}
        <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1242.42'), body: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1242.43') }} position="bottom" delay={200}>
          <div className="char-honour-row">
            <img src="/assets/icons/I_Dread.png" alt={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1244.44')} className="char-honour-icon" />
            <div className="char-honour-track painted-bar-track">
              {hdVal < 0 && (
                <div className="painted-bar-fill painted-bar-fill--red" style={{ width: '50%', right: '50%', left: 'auto', borderRadius: 0, transformOrigin: 'right', transform: `scaleX(${Math.abs(hdVal)})` }} />
              )}
              {hdVal > 0 && (
                <div className="painted-bar-fill painted-bar-fill--green" style={{ width: '50%', left: '50%', borderRadius: 0, transform: `scaleX(${hdVal})` }} />
              )}
              <div className="char-honour-center" />
            </div>
            <img src="/assets/icons/I_Honor.png" alt={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1254.45')} className="char-honour-icon" />
          </div>
        </Tooltip>
        <div className="char-honour-label-row">
          <span className="char-honour-label" style={{ color: hdColor }}>{hdLabel}</span>
        </div>

        {debugMode && (
          <>
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1263.46')} />
            <div className="sidebar-debug-rows">
              <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1265.47')} value={`#${formatNumber(character.debugShortId ?? 0)}`} />
              <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1266.48')} value={formatPersonActivity(character.activity)} />
              <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1267.49')} value={formatNumber(character.debugAgeDays ?? 0)} />
              <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1268.50')} value={formatNumber(character.vigor ?? 0, { maximumFractionDigits: 1 })} />
              {character.powerBlocName && (
                <InfoRow
                  label={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1271.51')}
                  value={`${character.powerBlocName}${character.powerBlocDebugShortId ? ` (#${formatNumber(character.powerBlocDebugShortId)})` : ''}`}
                />
              )}
              {character.commanderKind && <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1275.52')} value={character.commanderKind} />}
              {character.isImmortal && <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1276.53')} value="Immortal" valueColor="warning" />}
            </div>
          </>
        )}

        {/* Governed Regions */}
        {character.governedRegions.length > 0 && (
          <>
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1284.54')} />
            <div className="char-duty-list">
              {character.governedRegions.map((s) => (
                <CharacterDutyRow
                  key={s.id || s.name}
                  icon={regionIcons[s.type] || regionIcons.town}
                  label={formatSettlementTierLabel(s.type)}
                  value={s.name}
                  tooltip={{
                    title: s.name,
                    get body() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1289.1", { Value1: formatSettlementTierLabel(s.type) }); },
                    footer: webUIText('CharacterSidebar.ZoomToGovernedRegion'),
                  }}
                  onOpen={() => zoomToBridge('settlement', s.id)}
                />
              ))}
            </div>
          </>
        )}

        {character.courtPosition && (
          <>
            <SectionHeading variant="ornate" title={webUIText('CharacterSidebar.CourtPosition')} />
            <div className="char-duty-list">
              <CharacterDutyRow
                icon="/assets/icons/I_VacantCourt.png"
                label={character.courtPosition.isSubordinate ? webUIText('CharacterSidebar.CourtSubordinate') : webUIText('CharacterSidebar.CourtPosition')}
                value={character.courtPosition.name}
                detail={character.courtPosition.courtFactionName}
                tooltip={{
                  title: character.courtPosition.name,
                  body: character.courtPosition.isSubordinate
                    ? webUIText('CharacterSidebar.CourtSubordinateTooltip')
                    : webUIText('CharacterSidebar.CourtPositionTooltip'),
                  footer: webUIText('CharacterSidebar.OpenCourtPositions'),
                }}
                onOpen={() => openScreen(courtScreen, 'court')}
              />
            </div>
          </>
        )}

        {character.commandedMilitary && (
          <>
            <SectionHeading variant="ornate" title={webUIText('CharacterSidebar.CommandedMilitary')} />
            <div className="char-duty-list">
              <CharacterDutyRow
                icon={character.commandedMilitary.isNavy ? '/assets/icons/I_NaviesQuickButton.png' : '/assets/icons/I_ArmiesQuickButton.png'}
                label={webUIText('CharacterSidebar.CommandedMilitary')}
                value={character.commandedMilitary.name}
                detail={character.commandedMilitary.rank}
                tooltip={{
                  title: character.commandedMilitary.name,
                  body: webUIText('CharacterSidebar.CommandedMilitaryTooltip'),
                  footer: webUIText('CharacterSidebar.OpenMilitary'),
                }}
                onOpen={() => openScreen('military', character.commandedMilitary?.isNavy ? 'sea' : 'land')}
              />
            </div>
          </>
        )}

        {/* Luxury Needs */}
        {luxuryNeeds.length > 0 && (
          <>
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1304.55')} />
            <div className="char-luxury-list">
              {luxuryNeeds.map(slot => {
                const pct = slot.required > 0 ? Math.min(100, (slot.provided / slot.required) * 100) : 0;
                const isSatisfied = slot.provided >= slot.required;
                return (
                  <Tooltip key={slot.name} content={{
                    title: slot.name,
                    get body() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1312.1", { Provided: slot.provided, Required: slot.required }); },
                    lines: [
                      { label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1314.56'), get value() { return isSatisfied ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsCharacterSidebar.1314.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsCharacterSidebar.1314.1"); }, valueColor: isSatisfied ? 'var(--green)' : 'var(--red)' },
                      ...(!isSatisfied ? [{ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1315.57'), get value() { return webUIText("Auto.Prop.componentssidebarsCharacterSidebar.1315.1", { Value1: (slot.required - slot.provided) * 20 }); }, valueColor: 'var(--red)' }] : []),
                    ],
                  }} position="bottom" delay={200}>
                    <div className="char-luxury-row">
                      <img src={slot.icon} alt="" className="char-luxury-icon" />
                      <span className="char-luxury-name">{slot.name}</span>
                      <div className="char-luxury-bar">
                        <PaintedBar percent={pct} color={isSatisfied ? 'green' : 'red'} />
                      </div>
                      <span className="char-luxury-count" style={{ color: isSatisfied ? 'var(--text-muted)' : 'var(--red)' }}>
                        {formatNumber(slot.provided)}/{formatNumber(slot.required)}
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </>
        )}

        {/* Interactions */}
        <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1336.58')} />
        <div className="char-actions-block">
          {interactionsState === null ? (
            <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsSidebarsCharacterSidebar.1338.4" /></div>
          ) : interactionSections.length > 0 ? (
            interactionSections.map((section) => (
              <div key={section.id} className="char-actions-category">
                <SectionHeading title={section.label} count={section.interactions.length} />
                <div className="char-actions-category__cards">
                  {section.interactions.map((interaction) => {
                    const matchesOutcome = interactionsState.lastCompletedInteractionId === interaction.id;
                    const outcome: 'success' | 'failure' | undefined = matchesOutcome
                      ? interactionsState.lastInteractionSucceeded ? 'success' : 'failure'
                      : undefined;
                    const outcomeKey = matchesOutcome
                      ? `${interactionsState.lastInteractionCompletedDate}:${interaction.id}`
                      : undefined;
                    const cardKey = `${character.id}:${section.id}:${interaction.id}`;

                    return (
                      <Tooltip key={cardKey} content={buildInteractionTooltip(interaction, character.id)} position="left" delay={150} variant="sidebar">
                        <InteractionCard
                          title={interaction.name}
                          description={interaction.description}
                          image={interaction.iconUrl}
                          bgImage={interaction.backgroundUrl}
                          durationDays={interaction.durationDays}
                          remainingDays={interaction.remainingDays}
                          inProgress={interaction.inProgress}
                          outcome={outcome}
                          outcomeText={matchesOutcome ? interactionsState.lastInteractionOutcomeText : undefined}
                          outcomeKey={outcomeKey}
                          cooldownDays={interaction.cooldownDays}
                          cooldownRemainingDays={interaction.cooldownRemainingDays}
                          tutorialTarget={`Interaction:${interaction.id}${interaction.id === 'OfferGift' ? ' OfferGiftButton' : ''}${interaction.id === 'ProposeMarriage' ? ' ProposeMarriageButton' : ''}`}
                          onClick={interaction.availability === 'available' && !interaction.inProgress
                            ? () => { void handleInteractionClick(interaction); }
                            : undefined}
                          onCancel={interaction.inProgress ? () => { void cancelInteraction(); } : undefined}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsSidebarsCharacterSidebar.1379.5" /></div>
          )}
        </div>

        </>}

        {activeTab === 'relationships' && <>
        {/* Relationships */}
        {character.relationships.length > 0 ? (
          <div className="char-relationships-block">
            <div className="char-relationships-search-row">
              <div className="search-field">
                <img src="/assets/icons/I_Search.png" alt="" className="search-field__icon" draggable={false} />
                <input
                  type="text"
                  className="search-field__input char-relationships-search-input"
                  placeholder={webUIText('Auto.Attr.ComponentsSidebarsCharacterSidebar.1396.59')}
                  value={relationshipSearch}
                  onChange={e => setRelationshipSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="char-family-action-row">
              <GameButton
                variant="outline"
                icon="/assets/icons/I_Family.png"
                className="char-family-action-button"
                onClick={() => openScreen('familyTree', `tree:${character.id}`)}
              >
                <WebUIText textKey="CharacterSidebar.ViewFamilyTree" />
              </GameButton>
              <GameButton
                variant="outline"
                icon="/assets/icons/I_Diplomacy.png"
                className="char-family-action-button"
                onClick={() => openScreen('familyTree', `patronage:${character.id}`)}
              >
                <WebUIText textKey="Auto.Prop.componentssidebarsCharacterSidebar.1043.1" />
              </GameButton>
            </div>
            {visibleFamilyGraph.rows.length > 0 || socialRelationshipSections.length > 0 ? (
              <>
                <FamilyGraphView graph={visibleFamilyGraph} onOpen={(id) => openSidebar('character', id)} />
                {socialRelationshipSections.length > 0 && (
                  <div className="char-social-relations">
                    {socialRelationshipSections.map((section) => (
                      <div key={section.id} className={`char-social-section char-social-section--${section.tone}`}>
                        <SectionHeading variant="ornate" title={section.title} />
                        <div className="char-social-card-wrap">
                          {section.items.map((rel) => (
                            <RelationshipOverviewCard
                              key={`${rel.type}:${rel.characterId || rel.characterName}`}
                              rel={rel}
                              onOpen={(id) => openSidebar('character', id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsSidebarsCharacterSidebar.1424.6" /></div>
            )}
          </div>
        ) : (
          <div className="sidebar-placeholder"><WebUIText textKey="Auto.ComponentsSidebarsCharacterSidebar.1428.7" /></div>
        )}
        </>}

        {activeTab === 'history' && (
          characterHistory.length > 0 ? (
            <CharacterHistoryList
              history={characterHistory}
              onOpenTarget={(sidebarType, id) => openSidebar(sidebarType, id)}
            />
          ) : (
            <div className="sidebar-placeholder"><WebUIText textKey="CharacterSidebar.NoHistory" /></div>
          )
        )}
      </StyledScrollArea>

      {initiatorModalInteraction && (
        <PersonInteractionInitiatorModal
          key={initiatorModalInteraction.id}
          interaction={initiatorModalInteraction}
          targetPersonId={character.id}
          targetPersonName={character.name}
          onClose={() => setInitiatorModalInteraction(null)}
          onConfirm={handleInitiatorConfirm}
        />
      )}
      {giftModalInteraction && (
        <PersonInteractionGiftModal
          key={giftModalInteraction.id}
          interaction={giftModalInteraction}
          targetPersonId={character.id}
          targetPersonName={character.name}
          targetPersonTitle={character.shortTitle || character.title}
          targetPersonPortrait={character.portrait}
          targetPortraitLayers={character.portraitLayers}
          targetIsImprisoned={character.isImprisoned}
          playerGold={interactionsState?.playerGold ?? 0}
          onClose={() => setGiftModalInteraction(null)}
          onConfirm={handleGiftConfirm}
        />
      )}
    </div>
  );
};

export default React.memo(CharacterSidebar);

function CharacterSidebarSlot({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const character = usePerson(sidebarId);
  if (!character) return null;
  return <CharacterSidebar character={character} onClose={onClose} side="right" />;
}

registerSidebar({
  id: 'character',
  side: 'right',
  component: CharacterSidebarSlot,
  advisorTopic: 'characterSidebar',
});

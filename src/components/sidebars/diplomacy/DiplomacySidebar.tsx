import { HeldPaganRelics } from '../../screens/economy/PaganReligionPanel';
import FoederatiPoliticsPanel from '../../screens/faction/FoederatiPoliticsPanel';
import React, { useState, useMemo } from 'react';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import GameButton from '../../common/buttons/GameButton';
import InfoRow from '../../common/data-display/stats/InfoRow';
import InteractionCard from '../../common/interactions/InteractionCard';
import InteractionEffectsTooltip from '../../common/tooltips/InteractionEffectsTooltip';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import WarScoreProgress from '../../common/data-display/bars/WarScoreProgress';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import HeirAssignmentModal from '../../modals/characters/HeirAssignmentModal';
import FactionInteractionPersonSelectionModal from '../../modals/diplomacy/FactionInteractionPersonSelectionModal';
import FactionInteractionInputModal from '../../modals/diplomacy/FactionInteractionInputModal';
import RebellionChoiceModal, { type RebellionKind } from '../../modals/diplomacy/RebellionChoiceModal';
import PreviousRulersModal from '../../modals/diplomacy/PreviousRulersModal';
import CultureLink from '../../common/culture/CultureLink';
import GovernmentTooltip from '../../common/tooltips/GovernmentTooltip';
import ReligionLink from '../../common/religion/ReligionLink';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { usePinnedItemsBridge, zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { breakTreatyBridge, setProvinceBuildFocusBridge } from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { dispatchFactionData, refreshFactionData } from '../../../bridge/diplomacy/useFactionBridge';
import { toggleFoederatiCallupBridge } from '../../../bridge/military-map/useMilitaryBridge';
import { BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import glossary from '../../../data/glossary';
import type { DisplayTextLine, Faction, FactionPolicy, FactionPolicyLevel, FactionTreaty, FactionWarFaction, FactionWarPartner } from '../../../data/types';
import { STAT_ICONS, treatyIconPath } from '../../../utils/iconMaps';
import { formatTreatyType } from '../../../utils/displayLabels';
import { canNegotiateDiplomacyWith } from '../../../utils/diplomacyAuthority';
import { getComplianceState } from '../../../utils/colorFormatters';
import { buildComplianceTooltip } from '../../../utils/characterTooltipContent';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { diplomacyMilitaryOverview } from './diplomacyMilitaryOverview';
import { cultureIconPath } from '../../../utils/cultureIcons';
import { religionIconPath } from '../../../utils/religionIcons';
import { displayTextToPlain } from '../../../utils/displayText';
import { renderRichText } from '../../../utils/richText';
import { WebkilnAssetPath } from '../../../utils/assets';
import { usePerson, useFaction, usePlayerFactionId, usePlayerFactionSummary } from '../../../data-source/index';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import type {
  BridgeFactionInteractionProvidedInput,
  StartFactionInteractionResponse,
  StartSpyInteractionResponse,
} from '../../../bridge-types.generated.ts';
import { registerSidebar } from '../../../registry/index';
import { bridgeEvents } from '../../../bridge/core/bridgeEvents';
import { useSidebarTabRequest } from '../../../bridge/core/useBridgeSidebarEvents';
import { warScoreBreakdownTooltip } from '../../screens/diplomacy/warScoreBreakdownTooltip';
import { useFactionInteractionsBridge } from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import type { FactionInteractionView } from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import { useSpyInteractionsBridge } from '../../../bridge/diplomacy/useSpyInteractionsBridge';
import type { SpyInteractionView } from '../../../bridge/diplomacy/useSpyInteractionsBridge';
import SidebarToolbar from '../shared/SidebarToolbar';
import SidebarTabBar from '../shared/SidebarTabBar';
import DiplomacyDemographicsPanel from './DiplomacyDemographicsPanel';
import '../shared/Sidebar.css';
import './DiplomacySidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
type DiplomacySidebarTab = 'info' | 'policies' | 'demographics';

interface DiplomacySidebarProps {
  faction: Faction;
  onClose: () => void;
  activeTab: DiplomacySidebarTab;
  onTabChange: (tab: DiplomacySidebarTab) => void;
}

function diplomacyTabFromIndex(tabIndex: number | undefined): DiplomacySidebarTab | null {
  if (tabIndex === 0) return 'info';
  if (tabIndex === 1) return 'policies';
  if (tabIndex === 2) return 'demographics';
  return null;
}

type AgentRole = 'diplomat' | 'spy';
type BuildFocusId = 'balanced' | 'economic' | 'military' | 'infrastructure' | 'cultural' | 'administrative';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function successChanceColour(p: number): string {
  if (p >= 70) return 'var(--green)';
  if (p >= 40) return 'var(--gold)';
  if (p >= 20) return 'var(--orange)';
  return 'var(--red)';
}

// Shared tooltip for faction + spy interactions. Both view types have the same
// fields this function touches, so we type the parameter structurally.
type FactionLikeInteraction =
  Pick<FactionInteractionView,
    'id' | 'name' | 'description' | 'goldCost' | 'durationDays' | 'remainingDays'
    | 'inProgress' | 'cooldownDays' | 'cooldownRemainingDays'
    | 'successChancePercent' | 'successFactors' | 'effectLines' | 'reasons'>
  & Partial<Pick<FactionInteractionView, 'requirementsDescription'>>;

function primaryInteractionReason(i: FactionLikeInteraction): string {
  for (const reason of i.reasons) {
    const text = reason.reason.trim();
    if (text.length > 0) return text;
  }
  return '';
}

function buildFactionInteractionTooltip(
  i: FactionLikeInteraction,
  rush?: { actionKind: 'interaction' | 'spy'; targetFactionId: string; daysSaved: number; overloadLoad: number },
): TooltipContent {
  const lines: TooltipContent['lines'] = [];

  if (i.successFactors.length > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.78.5'),
      value: formatPercent(i.successChancePercent),
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

  if (i.requirementsDescription) {
    lines.push({
      label: webUIText('TreatyNegotiation.Acceptance'),
      subTooltip: {
        title: webUIText('TreatyNegotiation.Acceptance'),
        body: i.requirementsDescription,
      },
    });
  }

  if (i.goldCost > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.63.1'), value: formatNumber(i.goldCost), valueIcon: '/assets/icons/I_Coins.png' });
  }

  if (i.inProgress && i.remainingDays > 0) {
    const days = Math.round(i.remainingDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.68.2'), labelIcon: '/assets/icons/I_Duration.png', get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.68.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else if (i.durationDays > 0) {
    const days = Math.round(i.durationDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.71.3'), labelIcon: '/assets/icons/I_Duration.png', get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.71.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else {
    lines.push({ label: webUIText('Common.Duration'), labelIcon: '/assets/icons/I_Duration.png', get value() { return webUIText("Auto.Prop.componentssidebarsPowerBlocSidebar.45.1"); } });
  }

  if (i.cooldownDays > 0) {
    if (i.cooldownRemainingDays > 0) {
      const remaining = Math.round(i.cooldownRemainingDays);
      lines.push({
        label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.96.6'), labelIcon: '/assets/icons/I_Cooldown.png',
        get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.97.1", { Value1: formatNumber(remaining), Value2: webUIText(remaining === 1 ? 'Common.Day' : 'Common.Days') }); },
        valueColor: 'var(--red)',
      });
    } else {
      const total = Math.round(i.cooldownDays);
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.102.7'), labelIcon: '/assets/icons/I_Cooldown.png', get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.102.1", { Value1: formatNumber(total), Value2: webUIText(total === 1 ? 'Common.Day' : 'Common.Days') }); } });
    }
  }

  if (i.reasons.length > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.107.8'), isHeader: true });
    for (const r of i.reasons) {
      lines.push({ label: r.reason, valueColor: 'var(--red)' });
    }
  }

  const body = rush && i.inProgress && i.remainingDays > 0
    ? (
      <>
        <span>{renderRichText(i.description)}</span>
        <BureaucraticRushTooltipAction
          actionId={`${rush.actionKind}:${i.id}`}
          targetFactionId={rush.targetFactionId}
          daysSaved={rush.daysSaved}
          overloadLoad={rush.overloadLoad}
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

function getStatusBadgeText(faction: Faction): string | null {
  switch (faction.diplomaticStatus) {
    case 'war': return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.118.9');
    case 'ally': return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.119.10');
    case 'rival': return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.120.11');
    case 'subject': return faction.subjectType || webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.121.12');
    default: return null;
  }
}

function DiplomacyStatusBadge({ text, status }: { text: string; status: string }) {
  return <span className={`badge badge--${status} diplo-status-badge`}>{text}</span>;
}

function getOpinionColor(opinion: number): string {
  if (opinion >= 60) return 'var(--green)';
  if (opinion >= 20) return 'var(--gold)';
  if (opinion >= -20) return 'var(--orange)';
  return 'var(--red)';
}

function getOpinionIcon(opinion: number): string {
  if (opinion >= 20) return '/assets/icons/I_OpinionPositive.png';
  if (opinion >= -20) return '/assets/icons/I_OpinionNeutral.png';
  return '/assets/icons/I_OpinionNegative.png';
}

const statusIcons: Record<string, string> = {
  war: '/assets/icons/I_War.png',
  ally: '/assets/icons/I_Peace.png',
  rival: '/assets/icons/I_Swords.png',
  subject: '/assets/icons/I_Vassal.png',
  foederati: '/assets/icons/I_InviteFoederati.png',
  neutral: '/assets/icons/I_Diplomacy.png',
};

function statusIconForFaction(faction: Faction): string {
  if (faction.subjectSubtype === 'foederati') return statusIcons.foederati;
  return statusIcons[faction.diplomaticStatus] || statusIcons.neutral;
}

function warEnemyFactions(war: FactionWarPartner): FactionWarFaction[] {
  const extras = (war.enemyParticipants ?? []).filter(partner => partner.id !== war.id);
  return [war, ...extras];
}

const ALLIANCE_TREATY_TYPES = new Set(['MilitaryAlliance', 'DefensiveAlliance']);

const FOCUS_OPTIONS: Array<{ id: BuildFocusId; label: string; icon: string; body: string }> = [
  {
    id: 'balanced',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.66.6'); },
    icon: '/assets/events/I_Focus_Balanced.png',
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.68.7'); },
  },
  {
    id: 'economic',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.72.8'); },
    icon: '/assets/events/I_Focus_Economic.png',
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.74.9'); },
  },
  {
    id: 'military',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.78.10'); },
    icon: '/assets/events/I_Focus_Military.png',
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.80.11'); },
  },
  {
    id: 'infrastructure',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.84.12'); },
    icon: '/assets/events/I_Focus_Infrastructure.png',
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.86.13'); },
  },
  {
    id: 'cultural',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.90.14'); },
    icon: '/assets/events/I_Focus_Cultural.png',
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.92.15'); },
  },
  {
    id: 'administrative',
    get label() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.96.16'); },
    icon: '/assets/events/I_Focus_Administrative.png',
    get body() { return webUIText('Auto.TopProp.ComponentsScreensInternalPoliticsScreen.98.17'); },
  },
];

function focusKeyForFaction(faction: Faction): BuildFocusId {
  const key = faction.buildFocusKey || '';
  return FOCUS_OPTIONS.some(option => option.id === key) ? key as BuildFocusId : 'balanced';
}

function policyHeaderText(lines?: DisplayTextLine[]): string {
  return displayTextToPlain((lines ?? []).filter(line => line.kind === 'header'));
}

function policyMechanicalLines(lines?: DisplayTextLine[]): DisplayTextLine[] {
  return (lines ?? []).filter(line => line.kind !== 'header');
}

function policyStanceText(policy: FactionPolicy): string {
  const currentLevel = policy.levelEffects.find(level => level.isCurrent);
  return policyHeaderText(currentLevel?.effectLines) || policyHeaderText(policy.effectLines);
}

function policyCurrentLevelIndex(policy: FactionPolicy): number {
  return policy.levelEffects.findIndex(level => level.isCurrent);
}

function policyFillPercent(policy: FactionPolicy): number {
  const levels = policy.levelEffects;
  if (levels.length === 0) return 0;
  const currentIndex = policyCurrentLevelIndex(policy);
  if (currentIndex < 0) return 0;
  return ((currentIndex + 1) / levels.length) * 100;
}

function policyLevelValueLabel(policy: FactionPolicy, index = policyCurrentLevelIndex(policy)): string {
  if (policy.levelEffects.length === 0 || index < 0) return '';
  return webUIText('FactionOverview.PolicyLevelValue', {
    Level: index + 1,
    Total: policy.levelEffects.length,
  });
}

function policyIcon(policy: FactionPolicy): string {
  const key = policy.key || policy.id;
  return WebkilnAssetPath(policy.iconId || `/assets/policies/${key}.png`) ?? '/assets/icons/I_Chart.png';
}

function policyTooltip(policy: FactionPolicy): TooltipContent {
  const stance = policyStanceText(policy);
  const levelValue = policyLevelValueLabel(policy);
  return {
    title: policy.name,
    body: policy.description || undefined,
    lines: [
      ...(policy.isFromLiege ? [{
        label: webUIText('FactionOverview.SetBy'),
        value: policy.displayFactionName,
      }] : []),
      ...(stance || levelValue ? [{
        label: webUIText('FactionOverview.CurrentLevel'),
        value: stance || levelValue,
        valueColor: 'var(--gold)',
      }] : []),
    ],
    afterLines: <InteractionEffectsTooltip lines={policyMechanicalLines(
      policy.levelEffects.find(level => level.isCurrent)?.effectLines ?? policy.effectLines,
    )} />,
  };
}

function policyLevelTooltip(policy: FactionPolicy, level: FactionPolicyLevel, index: number): TooltipContent {
  const stance = policyHeaderText(level.effectLines);
  return {
    title: stance || policy.name,
    lines: [
      {
        label: level.isCurrent ? webUIText('FactionOverview.CurrentLevel') : webUIText('FactionOverview.Level'),
        value: policyLevelValueLabel(policy, index),
        valueColor: level.isCurrent ? 'var(--gold)' : undefined,
      },
      ...(!level.isAvailable ? [
        { label: webUIText('Common.Requirements'), isHeader: true },
        { label: level.lockReason || webUIText('FactionOverview.Locked'), labelColor: 'var(--red)' },
      ] : []),
    ],
    afterLines: <InteractionEffectsTooltip lines={policyMechanicalLines(level.effectLines)} />,
  };
}

async function refreshAgentTarget(factionId: string, role: AgentRole): Promise<void> {
  const factionData = await bridgeCall('game.get_faction_data', { subscriptionId: '', subscribe: false, factionId, scope: 'full' });
  dispatchFactionData(factionData);

  if (role === 'spy') {
    const spyInteractions = await bridgeCall('game.get_spy_interactions', { targetFactionId: factionId });
    bridgeEvents.dispatchEvent(new CustomEvent('game.get_spy_interactions', { detail: spyInteractions }));
  } else {
    const factionInteractions = await bridgeCall('game.get_faction_interactions', { targetFactionId: factionId });
    bridgeEvents.dispatchEvent(new CustomEvent('game.get_faction_interactions', { detail: factionInteractions }));
  }
}

/* ------------------------------------------------------------------ */
/*  Dialog state                                                       */
/* ------------------------------------------------------------------ */

/** The one dialog the sidebar has open, tied to the faction it was opened for. */
type DiplomacyDialog =
  | { kind: 'none' }
  | { kind: 'confirmInteraction'; factionId: string; response: StartFactionInteractionResponse; selectedPersonId?: string; rebellionKind?: RebellionKind }
  | { kind: 'heirAssignment'; factionId: string }
  | { kind: 'previousRulers'; factionId: string }
  | { kind: 'rebellionChoice'; factionId: string; interactionId: string; interactionName: string }
  | { kind: 'personSelection'; factionId: string; selection: StartFactionInteractionResponse }
  | { kind: 'factionInput'; factionId: string; selection: StartFactionInteractionResponse }
  | { kind: 'spyInput'; factionId: string; selection: StartSpyInteractionResponse };

const NO_DIALOG: DiplomacyDialog = { kind: 'none' };

type DialogOfKind<K extends DiplomacyDialog['kind']> = Extract<DiplomacyDialog, { kind: K }>;

function dialogOfKind<K extends DiplomacyDialog['kind']>(dialog: DiplomacyDialog, kind: K): DialogOfKind<K> | null {
  return dialog.kind === kind ? dialog as DialogOfKind<K> : null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DiplomacySidebar: React.FC<DiplomacySidebarProps> = ({ faction, onClose, activeTab, onTabChange }) => {
  const { openSidebar, openScreen, showAdvisor, openAgentSelect, navigateSidebarHistory } = useGameActions();
  const { debugMode, sidebarNavigation } = useGameState();
  const playerFactionId = usePlayerFactionId();
  const playerInstitutions = usePlayerFactionSummary();
  const playerFaction = useFaction(playerFactionId);
  const { isPinned: checkPinned, togglePin } = usePinnedItemsBridge();
  const isPinned = checkPinned('faction', faction.id);
  const [storedDialog, setDialog] = useState<DiplomacyDialog>(NO_DIALOG);
  const [breakingTreatyId, setBreakingTreatyId] = useState<string | null>(null);
  const dialog = storedDialog.kind !== 'none' && storedDialog.factionId === faction.id ? storedDialog : NO_DIALOG;
  // A close is bound to the dialog that requested it, so the end of one
  // dialog's exit animation cannot dismiss the dialog that replaced it.
  const closeDialog = React.useCallback((target: DiplomacyDialog | null) => {
    if (!target) return;
    setDialog(current => (current === target ? NO_DIALOG : current));
  }, []);
  const confirmDialog = dialogOfKind(dialog, 'confirmInteraction');
  const heirDialog = dialogOfKind(dialog, 'heirAssignment');
  const previousRulersDialog = dialogOfKind(dialog, 'previousRulers');
  const rebellionChoiceDialog = dialogOfKind(dialog, 'rebellionChoice');
  const personSelectionDialog = dialogOfKind(dialog, 'personSelection');
  const factionInputDialog = dialogOfKind(dialog, 'factionInput');
  const spyInputDialog = dialogOfKind(dialog, 'spyInput');
  const diplomacyNavigation = sidebarNavigation.diplomacy;
  const canNavigateBack = (diplomacyNavigation?.back.length ?? 0) > 0;
  const canNavigateForward = (diplomacyNavigation?.forward.length ?? 0) > 0;
  const statusText = getStatusBadgeText(faction);
  const realmStatusText = faction.overlordName
    ? faction.subjectType || webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.121.12')
    : null;
  const isProvinceSubject = faction.subjectSubtype === 'province';
  const isPlayerFoederati = !faction.isPlayer && faction.diplomaticStatus === 'subject' && faction.subjectSubtype === 'foederati';
  const canToggleFoederatiCallup = Boolean(faction.isFoederatiCalledUp || faction.canCallFoederati);
  const foederatiCallupLabel = faction.isFoederatiCalledUp
    ? webUIText('InternalPolitics.StandDown')
    : faction.foederatiPolitics?.callupPending
      ? webUIText('Foederati.CallupRequested')
      : webUIText('InternalPolitics.CallUp');
  const foederatiCallupBody = faction.isFoederatiCalledUp
    ? webUIText('InternalPolitics.StandDownThis')
    : faction.foederatiPolitics?.callupBlockReason || webUIText('Foederati.CallupHelp');
  const hasBuildFocus = isProvinceSubject && Boolean(faction.buildFocus);
  const focusKey = focusKeyForFaction(faction);
  const canSetBuildFocus = hasBuildFocus && Boolean(faction.canSetBuildFocus);
  const buildFocusBlockedReason = faction.buildFocusBlockedReason || webUIText('InternalPolitics.NotUnderYourControl');
  const peaceNegotiationTargetFactionId = faction.peaceNegotiationTargetFactionId || faction.id;
  const hasDiplomaticAuthority = canNegotiateDiplomacyWith(playerFaction, faction);
  const canNegotiatePeace = faction.diplomaticStatus === 'war'
    && !faction.isPlayer
    && peaceNegotiationTargetFactionId === faction.id
    && hasDiplomaticAuthority;
  const canNegotiateTreaty = faction.diplomaticStatus !== 'war' && !faction.isPlayer && hasDiplomaticAuthority;
  const playerStrength = faction.playerStrength ?? 0;
  const totalStrength = faction.strength + playerStrength;
  const theirPct = totalStrength > 0 ? (faction.strength / totalStrength) * 100 : 50;
  const ourPct = 100 - theirPct;
  const militaryOverview = diplomacyMilitaryOverview(faction);
  const militaryOverviewStat = militaryOverview.kind === 'warbands'
    ? {
      title: webUIText('DiplomacySidebar.PossibleWarbandStrength'),
      body: webUIText('DiplomacySidebar.PossibleWarbandStrengthTooltip'),
      value: militaryOverview.value,
      label: webUIText('DiplomacySidebar.Warbands'),
    }
    : militaryOverview.kind === 'levies'
      ? {
        title: webUIText('DiplomacySidebar.PossibleLevyStrength'),
        body: webUIText('DiplomacySidebar.PossibleLevyStrengthTooltip'),
        value: militaryOverview.value,
        label: webUIText('DiplomacySidebar.Levies'),
      }
      : {
        title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.465.37'),
        body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.465.38'),
        value: militaryOverview.value,
        label: webUIText('Auto.ComponentsSidebarsDiplomacySidebar.468.8'),
      };

  const rulerCharacter = usePerson(faction.rulerId);

  // Live diplomacy + edicts from the bridge. Filter to non-edicts for this panel.
  const {
    state: factionInteractionsState,
    selection: factionInteractionSelection,
    start: startFactionInteraction,
    confirmSelection: confirmFactionInteractionSelection,
    cancelSelection: cancelFactionInteractionSelection,
    cancel: cancelFactionInteraction,
  } =
    useFactionInteractionsBridge(faction.id);
  const factionInteractionSelectionPanelRef = React.useRef<HTMLDivElement>(null);
  const liveDiplomaticInteractions = (factionInteractionsState?.interactions ?? [])
    .filter(i => !i.isEdict);

  React.useEffect(() => {
    if (!factionInteractionSelection) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      factionInteractionSelectionPanelRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [factionInteractionSelection]);

  // Spy interactions live on a parallel slot (FactionCharacterComponent).
  const { state: spyInteractionsState, start: startSpyInteraction, cancel: cancelSpyInteraction } =
    useSpyInteractionsBridge(faction.id);
  const liveSpyInteractions: SpyInteractionView[] = spyInteractionsState?.interactions ?? [];
  const showDiplomaticActionArea = !faction.isPlayer && liveDiplomaticInteractions.length > 0;
  const showSpyActionArea = !faction.isPlayer && liveSpyInteractions.length > 0;

  const cultureIcon = cultureIconPath(faction.cultureInfo);
  const religionIcon = religionIconPath(faction.religionId || faction.religionInfo?.id);

  // Opinion is ~-100 to +100 (unbounded in extreme cases). The bar pivots at 0.
  const opinionColor = getOpinionColor(faction.opinion);
  const opinionIcon = getOpinionIcon(faction.opinion);
  const opinionFill = Math.min(1, Math.abs(faction.opinion) / 100);

  // Compliance (for subject factions)
  const isSubject = faction.diplomaticStatus === 'subject';
  const showOpinion = !faction.isPlayer && !isSubject;
  const complianceVal = faction.compliance ?? 0;
  const complianceState = !faction.isPlayer && isSubject ? getComplianceState(complianceVal) : null;
  const isSeizeTerritorySelection = factionInteractionSelection?.interactionId === 'seizeterritoryinteraction';
  const showSeizeTerritoryBreakdown = Boolean(
    isSeizeTerritorySelection && factionInteractionSelection && factionInteractionSelection.selectedSettlementCount > 0,
  );
  const selectionSettlementTotal = factionInteractionSelection
    ? Math.max(faction.settlements, factionInteractionSelection.selectedSettlementCount)
    : faction.settlements;
  const selectionSettlementShare = factionInteractionSelection
    ? webUIText('Diplomacy.InteractionSelection.SettlementShare', {
      Count: formatNumber(factionInteractionSelection.selectedSettlementCount),
      Total: formatNumber(selectionSettlementTotal),
    })
    : '';
  const selectionComplianceValue = complianceState
    ? webUIText('Diplomacy.InteractionSelection.ComplianceValue', {
      Label: complianceState.label,
      Value: formatNumber(complianceVal),
    })
    : formatNumber(complianceVal);
  const successor = faction.designatedHeir ?? faction.effectiveHeir;
  const successorTitle = faction.designatedHeir
    ? webUIText('FactionOverview.DesignatedSuccessor')
    : webUIText('FactionOverview.LikelySuccessor');
  const canSetSuccessor = Boolean(faction.canSetDesignatedHeir);

  const recallAgent = (role: AgentRole) => {
    bridgeCall('game.appoint_agent', {
      personId: '',
      targetFactionId: faction.id,
      role,
    }).then(() => refreshAgentTarget(faction.id, role)).catch(acknowledgeBridgeFailure);
  };

  const setBuildFocus = React.useCallback((focus: BuildFocusId) => {
    if (!canSetBuildFocus || focus === focusKey) return;
    void setProvinceBuildFocusBridge(faction.id, focus)
      .then(() => bridgeCall('game.get_faction_data', { subscriptionId: '', subscribe: false, factionId: faction.id, scope: 'full' }))
      .then(dispatchFactionData)
      .catch(acknowledgeBridgeFailure);
  }, [canSetBuildFocus, faction.id, focusKey]);

  const startInteraction = React.useCallback((interactionId: string, selectedPersonId?: string, rebellionKind?: RebellionKind, confirm = false) => {
    if (interactionId === 'declarerebellioninteraction' && !rebellionKind) {
      const interaction = factionInteractionsState?.interactions.find(entry => entry.id === interactionId);
      setDialog({ kind: 'rebellionChoice', factionId: faction.id, interactionId, interactionName: interaction?.name ?? '' });
      return;
    }

    void startFactionInteraction(interactionId, selectedPersonId, undefined, rebellionKind, confirm).then((response) => {
      if (response?.confirmationRequired) {
        setDialog({ kind: 'confirmInteraction', factionId: response.targetFactionId, response, selectedPersonId, rebellionKind });
      } else if (response?.rebellionChoiceRequired) {
        const interaction = factionInteractionsState?.interactions.find(entry => entry.id === interactionId);
        setDialog({ kind: 'rebellionChoice', factionId: faction.id, interactionId, interactionName: interaction?.name || response.interactionName });
      } else if (response?.personSelectionRequired) {
        setDialog({ kind: 'personSelection', factionId: faction.id, selection: response });
      } else if (response?.inputSelectionRequired) {
        setDialog({ kind: 'factionInput', factionId: faction.id, selection: response });
      }
    });
  }, [faction.id, factionInteractionsState?.interactions, startFactionInteraction]);

  const confirmFactionInputs = React.useCallback(async (
    interactionId: string,
    inputs: BridgeFactionInteractionProvidedInput[],
  ) => {
    const response = await startFactionInteraction(interactionId, '', inputs);
    if (response?.inputSelectionRequired) {
      setDialog({ kind: 'factionInput', factionId: faction.id, selection: response });
      return response.message || null;
    }
    if (response?.personSelectionRequired) {
      setDialog({ kind: 'personSelection', factionId: faction.id, selection: response });
      return null;
    }
    return response?.started || response?.selectionStarted ? null : response?.message ?? null;
  }, [faction.id, startFactionInteraction]);

  const startSpy = React.useCallback((interactionId: string) => {
    void startSpyInteraction(interactionId).then((response) => {
      if (response?.inputSelectionRequired) {
        setDialog({ kind: 'spyInput', factionId: faction.id, selection: response });
      }
    });
  }, [faction.id, startSpyInteraction]);

  const confirmSpyInputs = React.useCallback(async (
    interactionId: string,
    inputs: BridgeFactionInteractionProvidedInput[],
  ) => {
    const response = await startSpyInteraction(interactionId, inputs);
    if (response?.inputSelectionRequired) {
      setDialog({ kind: 'spyInput', factionId: faction.id, selection: response });
      return response.message || null;
    }
    return response?.started ? null : response?.message ?? null;
  }, [faction.id, startSpyInteraction]);

  const closeSidebar = React.useCallback(() => {
    if (factionInteractionSelection) {
      void cancelFactionInteractionSelection();
    }
    setDialog(NO_DIALOG);
    onClose();
  }, [cancelFactionInteractionSelection, factionInteractionSelection, onClose]);

  // Relations with other factions. Player alliances remain visible here so the
  // viewed faction's complete set of allies is represented by roundels.
  const warFactions = faction.wars ?? [];
  // Group treaties by type, collecting all partner factions per type so a
  // faction with ten subjects shows one subject pact row, not ten.
  interface TreatyPartner {
    id: string;
    name: string;
    debugShortId?: number;
    colour?: string;
    secondaryColour?: string;
    culture?: string;
    cultureGroup?: string;
    emblem?: string;
    diplomaticStatus?: string;
    subjectSubtype?: string;
    isPlayer?: boolean;
    isRebel?: boolean;
  }
  const treatyRelations = useMemo(() => {
    const grouped = new Map<string, TreatyPartner[]>();
    for (const t of faction.treaties.filter(treaty => (
      !treaty.isWithPlayer || ALLIANCE_TREATY_TYPES.has(treaty.type)
    ))) {
      const partner: TreatyPartner = {
        id: t.withFactionId ?? t.withFaction,
        name: t.withFaction,
        debugShortId: t.withFactionDebugShortId,
        colour: t.withFactionColour,
        secondaryColour: t.withFactionSecondaryColour,
        culture: t.withFactionCulture,
        cultureGroup: t.withFactionCultureGroup,
        emblem: t.withFactionEmblem,
        diplomaticStatus: t.withFactionDiplomaticStatus,
        subjectSubtype: t.withFactionSubjectSubtype,
        isPlayer: t.withFactionIsPlayer,
        isRebel: t.withFactionIsRebel,
      };
      const list = grouped.get(t.type) ?? [];
      list.push(partner);
      grouped.set(t.type, list);
    }
    return Array.from(grouped.entries()).map(([type, partners]) => ({ type, partners }));
  }, [faction.treaties]);
  // Treaties the player can manage from this sidebar: mutual treaties when viewing
  // another faction, or all of the player's own treaties when viewing themselves.
  const managedTreaties = useMemo(() => {
    if (faction.isPlayer) {
      return faction.treaties.filter(treaty => Boolean(treaty.id));
    }
    return faction.treaties.filter(treaty => treaty.isWithPlayer || (Boolean(treaty.id) && Boolean(treaty.canBreak)));
  }, [faction.isPlayer, faction.treaties]);

  const breakTreaty = (treaty: FactionTreaty) => {
    if (!treaty.id || !treaty.canBreak) return;
    setBreakingTreatyId(treaty.id);
    breakTreatyBridge(treaty.id, faction.id)
      .catch(acknowledgeBridgeFailure)
      .finally(() => setBreakingTreatyId(null));
  };

  return (
    <>
    <div className="sidebar sidebar--left sidebar--visible diplomacy-sidebar" data-tutorial-target="DiplomacySidebar DiplomacyTabButton">
      <SidebarToolbar
        navButtons={[
          {
            icon: '/assets/icons/I_NavPrevious.png',
            get tooltip() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.283.1"); },
            get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.284.19'); },
            onClick: () => navigateSidebarHistory('diplomacy', -1),
            disabled: !canNavigateBack,
          },
          {
            icon: '/assets/icons/I_NavNext.png',
            get tooltip() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.290.1"); },
            get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.291.20'); },
            onClick: () => navigateSidebarHistory('diplomacy', 1),
            disabled: !canNavigateForward,
          },
        ]}
        actionButtons={[
          { icon: isPinned ? '/assets/icons/I_Pin_Pinned.png' : '/assets/icons/I_Pin_Unpinned.png', get tooltip() { return isPinned ? webUIText("DiplomacySidebar.UnpinFaction") : webUIText("DiplomacySidebar.PinFaction"); }, get tooltipBody() { return isPinned ? webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.297.21') : webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.297.22'); }, onClick: () => togglePin('faction', faction.id), isActive: isPinned },
          { icon: '/assets/icons/I_ZoomTo.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.298.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.298.23'); }, onClick: () => zoomToBridge('faction', faction.id) },
          { icon: '/assets/ui/I_HelpIcon.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.299.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.299.24'); }, onClick: () => showAdvisor('diplomacySidebar', { force: true }) },
        ]}
        onClose={closeSidebar}
      />

      {/* Faction header with event image + colour-tinted scrim */}
      <div className="diplo-header">
        <img src={WebkilnAssetPath("/assets/events/diplomatic-envoy.png")} alt="" className="diplo-header-bg" />
        <div className="diplo-header-scrim" style={{ '--faction-tint': faction.colour } as React.CSSProperties} />
        <div className="diplo-header-content">
          <FactionTooltip
            factionId={faction.id}
            data={{
              id: faction.id,
              debugShortId: faction.debugShortId,
              name: faction.name,
              rulerName: faction.rulerName,
              culture: faction.culture,
              cultureId: faction.cultureId,
              cultureInfo: faction.cultureInfo,
              religion: faction.religion,
              religionId: faction.religionId,
              religionInfo: faction.religionInfo,
              capital: faction.capital,
              opinion: faction.opinion,
              population: faction.population,
              settlements: faction.settlements,
              armies: faction.armyCount,
              vassals: faction.vassalCount,
              income: faction.income,
              gold: faction.gold,
              isPlayer: faction.isPlayer,
              compliance: faction.compliance,
              treaties: faction.treaties.map(treaty => ({
                key: treaty.id || `${treaty.type}:${treaty.withFactionId ?? treaty.withFaction}`,
                type: treaty.type,
                label: treaty.displayName || formatTreatyType(treaty.type),
                description: treaty.description,
                withFaction: treaty.withFaction,
                withFactionId: treaty.withFactionId,
                withFactionDebugShortId: treaty.withFactionDebugShortId,
                withFactionColour: treaty.withFactionColour,
                withFactionSecondaryColour: treaty.withFactionSecondaryColour,
                withFactionCulture: treaty.withFactionCulture,
                withFactionCultureGroup: treaty.withFactionCultureGroup,
                withFactionEmblem: treaty.withFactionEmblem,
                withFactionDiplomaticStatus: treaty.withFactionDiplomaticStatus,
                withFactionSubjectSubtype: treaty.withFactionSubjectSubtype,
                withFactionIsPlayer: treaty.withFactionIsPlayer,
                withFactionIsRebel: treaty.withFactionIsRebel,
              })),
            }}
            delay={150}
          >
            <FactionRoundel
              factionId={faction.id}
              colour={faction.colour}
              secondaryColour={faction.secondaryColour}
              cultureGroup={faction.cultureGroup}
              emblem={faction.emblem}
              name={faction.name}
              diplomaticStatus={faction.diplomaticStatus}
              subjectSubtype={faction.subjectSubtype}
              isPlayer={faction.isPlayer}
              isRebel={faction.isRebel}
              resolveFaction={false}
              size="xl"
              showRing
            />
          </FactionTooltip>
          <div className="diplo-header-info">
            <span className="diplo-header-name">{faction.name}</span>
            {!faction.isPlayer && (statusText || faction.isRebel) && <div className="diplo-header-status-row">
              {statusText && (
                <>
                  <img src={statusIconForFaction(faction)} alt="" className="diplo-header-status-icon" />
                  <DiplomacyStatusBadge
                    text={statusText}
                    status={faction.diplomaticStatus}
                  />
                </>
              )}
              {faction.isRebel && (
                <DiplomacyStatusBadge
                  text={webUIText('Auto.ExtraAttr.ComponentsSidebarsDiplomacySidebar.317.1')}
                  status="war"
                />
              )}
            </div>}
            {realmStatusText && (faction.isPlayer || faction.diplomaticStatus !== 'subject') && (
              <div className="diplo-header-status-row">
                <img
                  src={statusIcons.subject}
                  alt=""
                  className="diplo-header-status-icon"
                />
                <DiplomacyStatusBadge
                  text={realmStatusText}
                  status="subject"
                />
              </div>
            )}
            <div className="diplo-header-capital">
              <img src="/assets/icons/I_Capital.png" alt="" className="diplo-header-capital-icon" />
              <span className="diplo-header-capital-text">{faction.capital}</span>
            </div>
          </div>
        </div>
        {!faction.isPlayer && !isProvinceSubject && (
          <Tooltip content={glossary.Strength || { title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.326.19'), body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.326.20') }} position="bottom" delay={200}>
            <div className="diplo-header-strength">
              <div className="diplo-header-strength-labels">
                <span className="diplo-header-strength-value diplo-header-strength-value--theirs comparison-strength-value comparison-strength-value--bright">{formatNumber(faction.strength)}</span>
                <img src="/assets/icons/I_Swords.png" alt="" className="diplo-header-strength-swords" />
                <span className="diplo-header-strength-value diplo-header-strength-value--ours comparison-strength-value comparison-strength-value--gold">{formatNumber(playerStrength)}</span>
              </div>
              <div className="sidebar-comparison-track">
                <div className="sidebar-comparison-fill-left" style={{ width: theirPct + '%', backgroundColor: faction.colour }} />
                <div className="sidebar-comparison-fill-right" style={{ width: ourPct + '%', backgroundColor: 'var(--gold)' }} />
              </div>
            </div>
          </Tooltip>
        )}
      </div>

      <SidebarTabBar
        tabs={[
          { id: 'info', label: webUIText('DiplomacySidebar.TabInfo') },
          { id: 'policies', label: webUIText('DiplomacySidebar.TabPolicies') },
          { id: 'demographics', label: webUIText('DiplomacySidebar.TabDemographics') },
        ]}
        activeTab={activeTab}
        onTabChange={id => onTabChange(id as DiplomacySidebarTab)}
      />

      <StyledScrollArea className="sidebar-content sidebar-content--textured">
        {activeTab === 'info' && <>
          {canNegotiatePeace && (
            <div className="diplo-negotiate-section">
              <Tooltip
                content={{
                  title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.347.21'),
                  body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.348.22'),
                }}
                position="bottom"
                delay={200}
              >
                <GameButton
                  variant="burgundy"
                  fullWidth
                  icon="/assets/icons/I_Peace.png"
                  className="diplo-negotiate-button"
                  tutorialTarget="MakePeaceButton"
                  onClick={() => openScreen('peace', peaceNegotiationTargetFactionId)}
                >
                  <WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.359.1" />
                </GameButton>
              </Tooltip>
            </div>
          )}

          {canNegotiateTreaty && (
            <div className="diplo-negotiate-section">
              <Tooltip
                content={{
                  title: webUIText('Diplomacy.NegotiateTreaty'),
                  body: webUIText('Diplomacy.NegotiateTreatyTooltip'),
                }}
                position="bottom"
                delay={200}
              >
                <GameButton
                  variant="burgundy"
                  fullWidth
                  icon="/assets/icons/I_Diplomacy.png"
                  className="diplo-negotiate-button"
                  tutorialTarget="NegotiateTreatyButton"
                  onClick={() => openScreen('treaty', faction.id)}
                >
                  <WebUIText textKey="Diplomacy.NegotiateTreaty" />
                </GameButton>
              </Tooltip>
            </div>
          )}

          <HeldPaganRelics factionId={faction.id} />

          {/* Culture / Religion / Government */}
          <div className="char-identity-pair diplo-identity-pair">
            <CultureLink info={faction.cultureInfo} cultureId={faction.cultureId || faction.cultureInfo?.id || ''}>
              <div className="char-identity-row">
                <img src={cultureIcon} alt="" className="char-identity-icon" />
                <span className="char-identity-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.370.2" /></span>
                <span className="char-identity-value">{faction.culture}</span>
              </div>
            </CultureLink>
            <ReligionLink info={faction.religionInfo} religionId={faction.religionId || faction.religionInfo?.id || ''}>
              <div className="char-identity-row">
                <img src={religionIcon} alt="" className="char-identity-icon" />
                <span className="char-identity-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.377.3" /></span>
                <span className="char-identity-value">{faction.religion}</span>
              </div>
            </ReligionLink>
            <GovernmentTooltip
              government={faction.government}
              displayName={faction.governmentDisplayName}
              description={faction.governmentDescription}
              capabilities={faction.governmentCapabilities}
              position="right"
            >
              <div className="char-identity-row">
                <img src="/assets/icons/I_Domain.png" alt="" className="char-identity-icon" />
                <span className="char-identity-label"><WebUIText textKey="MainMenu.Government" /></span>
                <span className="char-identity-value">{faction.governmentDisplayName || faction.government || '-'}</span>
              </div>
            </GovernmentTooltip>
          </div>

          {faction.isRebel && faction.rebelTypeName && faction.rebelGoalName && (
            <>
              <SectionHeading variant="ornate" title={webUIText('Diplomacy.Rebellion')} />
              <div className="diplo-rebellion-summary">
                <div className="diplo-rebellion-row">
                  <span className="diplo-rebellion-label">{webUIText('Diplomacy.RebelType')}</span>
                  <span className="diplo-rebellion-value">{faction.rebelTypeName}</span>
                </div>
                <div className="diplo-rebellion-row">
                  <span className="diplo-rebellion-label">{webUIText('Diplomacy.RebelGoal')}</span>
                  <span className="diplo-rebellion-value">{faction.rebelGoalName}</span>
                </div>
                {faction.rebelGoalDescription && (
                  <p className="diplo-rebellion-description">{faction.rebelGoalDescription}</p>
                )}
              </div>
            </>
          )}

          {debugMode && (
            <>
              <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.386.23')} />
              <div className="sidebar-debug-rows">
                <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.388.24')} value={`#${formatNumber(faction.debugShortId ?? 0)}`} />
                {faction.rulerDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.389.25')} value={`#${formatNumber(faction.rulerDebugShortId)}`} /> : null}
              </div>
            </>
          )}

          {/* Opinion bar (hidden for subjects â€” compliance replaces it) */}
          {showOpinion && (
            <Tooltip content={{
              title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.397.26'),
              body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.398.27'),
              lines: [
                { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.400.28'), value: formatNumber(faction.opinion), valueColor: opinionColor },
                ...(faction.opinionBreakdown ?? []).map(m => ({
                  label: m.label,
                  value: formatSignedNumber(m.value),
                  valueColor: m.value > 0 ? '#6dba4c' : m.value < 0 ? '#c75b3a' : 'var(--text-muted)',
                })),
              ],
            }} position="bottom" delay={200}>
              <div className="diplo-opinion-row">
                <img src={opinionIcon} alt="" className="diplo-opinion-icon" />
                <span className="diplo-opinion-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.409.4" /></span>
                <div className="diplo-opinion-bar painted-bar-track">
                  {faction.opinion < 0 && (
                    <div className="painted-bar-fill painted-bar-fill--red" style={{ width: '50%', right: '50%', left: 'auto', borderRadius: 0, transformOrigin: 'right', transform: `scaleX(${opinionFill})` }} />
                  )}
                  {faction.opinion > 0 && (
                    <div className="painted-bar-fill painted-bar-fill--green" style={{ width: '50%', left: '50%', borderRadius: 0, transformOrigin: 'left', transform: `scaleX(${opinionFill})` }} />
                  )}
                  <div className="diplo-opinion-center" />
                </div>
                <span className="diplo-opinion-val" style={{ color: opinionColor }}>{formatNumber(faction.opinion)}</span>
              </div>
            </Tooltip>
          )}

          {/* Compliance (subject factions only) */}
          {complianceState && (
            <Tooltip content={buildComplianceTooltip(complianceVal, {
              compliance: complianceVal,
              complianceBreakdown: faction.complianceBreakdown,
            }, {
              title: webUIText('Auto.Prop.componentssidebarsDiplomacySidebar.428.1', { Label: complianceState.label }),
              body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.429.29'),
              footer: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.438.31'),
            })} position="bottom" delay={200}>
              <div className="diplo-compliance-row">
                <img src={complianceState.icon} alt="" className="diplo-compliance-icon" />
                <span className="diplo-compliance-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.441.5" /></span>
                <span className="diplo-compliance-val" style={{ color: complianceState.color }}>{complianceState.label}</span>
              </div>
            </Tooltip>
          )}

          {hasBuildFocus && (
            <>
              <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.920.32')} />
              <div className="diplo-build-focus-options">
                {FOCUS_OPTIONS.map(option => (
                  <Tooltip
                    key={option.id}
                    inline
                    position="bottom"
                    content={{
                      title: option.label,
                      body: option.body,
                      get footer() { return canSetBuildFocus ? option.id === focusKey ? webUIText("InternalPolitics.CurrentBuildFocus") : webUIText("InternalPolitics.SetBuildFocusBody") : buildFocusBlockedReason; },
                    }}
                  >
                    <button
                      type="button"
                      className={`diplo-build-focus-button${option.id === focusKey ? ' diplo-build-focus-button--active' : ''}${canSetBuildFocus ? '' : ' diplo-build-focus-button--disabled'}`}
                      aria-label={option.label}
                      disabled={!canSetBuildFocus}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setBuildFocus(option.id);
                      }}
                    >
                      <img className="diplo-build-focus-icon" src={option.icon} alt="" />
                    </button>
                  </Tooltip>
                ))}
              </div>
            </>
          )}

          {managedTreaties.length > 0 && (
            <>
              <SectionHeading
                variant="ornate"
                title={faction.isPlayer
                  ? webUIText('Diplomacy.ActiveTreaties')
                  : webUIText('Diplomacy.TreatiesWithUs')}
              />
              <div className="diplo-player-treaties">
                {managedTreaties.map(treaty => {
                  const canBreak = Boolean(treaty.canBreak && treaty.id);
                  const partnerLabel = faction.isPlayer
                    ? treaty.withFaction
                    : undefined;
                  const detail = treaty.isPerpetual
                    ? webUIText('Diplomacy.TreatyPerpetual')
                    : treaty.daysRemaining && treaty.daysRemaining > 0
                      ? webUIText('Diplomacy.TreatyDaysRemaining', { Days: formatNumber(treaty.daysRemaining) })
                      : webUIText('Diplomacy.TreatyNoExpiry');
                  const breakTooltip: TooltipContent | undefined = canBreak
                    ? {
                        title: webUIText('Diplomacy.BreakTreaty'),
                        body: treaty.breakingPenaltyTooltip,
                      }
                    : undefined;
                  return (
                    <div
                      key={treaty.id || `${treaty.type}:${treaty.withFactionId}`}
                      className="diplo-player-treaty-row"
                    >
                      <img
                        src={treatyIconPath(treaty.type)}
                        alt=""
                        className="diplo-relation-type-icon"
                      />
                      <div className="diplo-player-treaty-copy">
                        <span className="diplo-player-treaty-name">
                          {treaty.displayName || formatTreatyType(treaty.type)}
                        </span>
                        <span className="diplo-player-treaty-detail">
                          {partnerLabel ? `${partnerLabel} - ${detail}` : detail}
                        </span>
                      </div>
                      {canBreak ? (
                        <Tooltip content={breakTooltip} position="left" delay={200}>
                          <button
                            type="button"
                            className="btn--outline diplo-treaty-break"
                            disabled={breakingTreatyId === treaty.id}
                            aria-label={webUIText('Diplomacy.BreakTreaty')}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              breakTreaty(treaty);
                            }}
                          >
                            <img
                              src="/assets/icons/I_ExclamationWarning.png"
                              alt=""
                              className="diplo-treaty-break-icon"
                              draggable={false}
                            />
                            <WebUIText textKey="Diplomacy.BreakTreaty" />
                          </button>
                        </Tooltip>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Faction overview stats */}
          <div className="diplo-section-heading-with-action">
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.449.32')} />
            <GameButton
              variant="outline"
              icon="/assets/icons/I_ArmiesQuickButton.png"
              className="diplo-view-military-button"
              onClick={() => openScreen(faction.isPlayer ? 'military' : 'factionMilitary', faction.isPlayer ? undefined : faction.id)}
            >
              {webUIText('FactionMilitary.ViewMilitary')}
            </GameButton>
            {playerInstitutions?.usesRegionalForces && (faction.isPlayer || (faction.diplomaticStatus === 'subject' && faction.subjectSubtype === 'hereditary_vassal')) && (
              <Tooltip content={webUIText('RegionalForces.Description')}>
                <GameButton variant="outline" onClick={() => openScreen('military', `regions:${faction.id}`)}>{webUIText('RegionalForces.Title')}</GameButton>
              </Tooltip>
            )}
            {isPlayerFoederati && (
              <Tooltip
                inline
                content={{ title: foederatiCallupLabel, body: foederatiCallupBody }}
                position="left"
                delay={200}
              >
                <GameButton
                  variant="outline"
                  icon={faction.isFoederatiCalledUp ? '/assets/icons/T_ReleaseFoederati.png' : '/assets/icons/T_RaiseFoederati.png'}
                  className="diplo-levy-action-button"
                  disabled={!canToggleFoederatiCallup}
                  onClick={() => {
                    if (!canToggleFoederatiCallup) return;
                    void toggleFoederatiCallupBridge(faction.id, !faction.isFoederatiCalledUp)
                      .then(() => refreshFactionData(faction.id))
                      .catch(acknowledgeBridgeFailure);
                  }}
                >
                  {foederatiCallupLabel}
                </GameButton>
              </Tooltip>
            )}
          </div>
          <div className="diplo-overview-grid">
            {faction.subjectSubtype === 'hereditary_vassal' && faction.crownTaxPercent !== undefined && <Tooltip
              content={{ title: webUIText('RegionalForces.CrownTax'), body: webUIText('RegionalForces.CrownTaxHelp', { Percent: formatNumber(faction.crownTaxPercent) }) }}>
              <div className="diplo-overview-stat">
                <img src="/assets/icons/I_Coins.png" alt="" className="diplo-overview-stat-icon" />
                <span className="diplo-overview-stat-val">{formatNumber(faction.crownTaxPercent)}%</span>
                <span className="diplo-overview-stat-label"><WebUIText textKey="RegionalForces.CrownTax" /></span>
              </div>
            </Tooltip>}
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.451.33'), body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.451.34') }} position="bottom" delay={200}>
              <div className="diplo-overview-stat">
                <img src="/assets/icons/I_Population.png" alt="" className="diplo-overview-stat-icon" />
                <span className="diplo-overview-stat-val">{formatNumber(faction.population)}</span>
                <span className="diplo-overview-stat-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.454.6" /></span>
              </div>
            </Tooltip>
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.458.35'), body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.458.36') }} position="bottom" delay={200}>
              <div className="diplo-overview-stat">
                <img src="/assets/icons/I_Domain.png" alt="" className="diplo-overview-stat-icon" />
                <span className="diplo-overview-stat-val">{formatNumber(faction.settlements)}</span>
                <span className="diplo-overview-stat-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.461.7" /></span>
              </div>
            </Tooltip>
            <Tooltip content={{ title: militaryOverviewStat.title, body: militaryOverviewStat.body }} position="bottom" delay={200}>
              <div className="diplo-overview-stat">
                <img src="/assets/icons/I_ArmiesQuickButton.png" alt="" className="diplo-overview-stat-icon" />
                <span className="diplo-overview-stat-val">{formatNumber(militaryOverviewStat.value)}</span>
                <span className="diplo-overview-stat-label">{militaryOverviewStat.label}</span>
              </div>
            </Tooltip>
            {faction.vassalCount > 0 && (
              <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.473.39'), body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.473.40') }} position="bottom" delay={200}>
                <div className="diplo-overview-stat">
                  <img src="/assets/icons/I_DependentFactions.png" alt="" className="diplo-overview-stat-icon" />
                  <span className="diplo-overview-stat-val">{formatNumber(faction.vassalCount)}</span>
                  <span className="diplo-overview-stat-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.476.9" /></span>
                </div>
              </Tooltip>
            )}
          </div>

          {/* Characters - ruler first, then by category */}
          <div className="diplo-section-heading-with-action">
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.485.41')} />
            <div className="diplo-section-heading-actions">
              <GameButton
                variant="outline"
                icon="/assets/icons/I_Ledger.png"
                className="diplo-view-characters-button"
                onClick={() => setDialog({ kind: 'previousRulers', factionId: faction.id })}
              >
                <WebUIText textKey="DiplomacySidebar.PreviousRulers" />
              </GameButton>
              <GameButton
                variant="outline"
                icon="/assets/icons/I_Characters.png"
                className="diplo-view-characters-button"
                onClick={() => openScreen('characters', faction.id)}
              >
                <WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.491.10" />
              </GameButton>
            </div>
          </div>
          {/* Ruler row - attributes available in the portrait tooltip */}
          <div className="diplo-ruler-section">
              <PersonTooltip characterId={faction.rulerId} position="right">
                  <Portrait
                    personId={faction.rulerId}
                    name={faction.rulerName}
                    src={rulerCharacter?.portrait ?? faction.rulerPortrait}
                    layers={rulerCharacter?.portraitLayers ?? faction.rulerPortraitLayers}
                    isAlive={rulerCharacter?.isAlive}
                    isImprisoned={rulerCharacter?.isImprisoned}
                    activity={rulerCharacter?.activity}
                    isPlayerCharacter={rulerCharacter?.isPlayerCharacter}
                    isRuler={rulerCharacter?.isRuler}
                    size="lg"
                    showBorder
                  />
              </PersonTooltip>
              <div className="diplo-ruler-info">
                <div className="diplo-ruler-name">{faction.rulerName}</div>
                <div className="diplo-ruler-title">{rulerCharacter?.shortTitle || webUIText("DiplomacySidebar.Ruler")}</div>
                {rulerCharacter && rulerCharacter.traits.length > 0 && (
                  <div className="diplo-ruler-traits">
                    {rulerCharacter.traits.map(trait => (
                      <Tooltip key={trait.id} position="bottom" delay={100} content={{ title: trait.name, body: trait.description, lines: (trait.effects ?? []).map(e => ({ label: e.label, labelIcon: STAT_ICONS[e.stat], value: e.value, valueColor: e.isPositive ? 'var(--green)' : 'var(--red)' })) }}>
                        <img src={`/assets/traits/${trait.icon}.png`} alt={trait.name} className="diplo-ruler-trait-icon" />
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          {(successor || canSetSuccessor) && (
            <>
              <SectionHeading variant="ornate" title={webUIText('FactionOverview.Succession')} />
              <div className="diplo-successor-section">
                {successor ? (
                  <PersonTooltip characterId={successor.id} position="right" delay={150}>
                    <Portrait
                      personId={successor.id}
                      name={successor.name}
                      size="md"
                      showBorder
                      borderTier="gold"
                    />
                  </PersonTooltip>
                ) : (
                  <div className="diplo-successor-slot">
                    <img src="/assets/icons/I_Family.png" alt="" className="diplo-successor-slot-icon" />
                  </div>
                )}
                <div className="diplo-successor-info">
                  <span className="diplo-successor-title">{successor ? successorTitle : webUIText('FactionOverview.NoSuccessor')}</span>
                  {successor ? <span className="diplo-successor-name">{successor.name}</span> : null}
                </div>
                {canSetSuccessor ? (
                  <Tooltip
                    content={{ body: webUIText('FactionOverview.AssignProvinceSuccessorTooltip') }}
                    position="left"
                    delay={180}
                    wrapperClassName="diplo-successor-action-wrap"
                  >
                    <button
                      type="button"
                      className="btn--outline diplo-successor-action"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDialog({ kind: 'heirAssignment', factionId: faction.id });
                      }}
                    >
                      {webUIText('Common.Assign')}
                    </button>
                  </Tooltip>
                ) : null}
              </div>
            </>
          )}
          {/* Relations - wars and treaties with other factions */}
          <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.567.43')} />
          <div className="diplo-relations-list">
            {warFactions.map(war => (
              <div key={war.warId || war.id} className="diplo-relation-war">
                <div className="diplo-relation-row diplo-relation-row--war">
                  <img src="/assets/icons/I_War.png" alt="" className="diplo-relation-type-icon" />
                  <span className="diplo-relation-type-label">
                    {war.warName || webUIText('Auto.ComponentsSidebarsDiplomacySidebar.571.14')}
                  </span>
                  <div className="diplo-relation-factions">
                    {warEnemyFactions(war).map(f => (
                      <FactionTooltip
                        key={f.id}
                        factionId={f.id}
                        factionName={f.name}
                        data={{
                          id: f.id,
                          debugShortId: f.debugShortId,
                          name: f.name,
                        }}
                        position="bottom"
                        delay={200}
                      >
                        <FactionRoundel
                          factionId={f.id}
                          colour={f.colour}
                          secondaryColour={f.secondaryColour}
                          cultureGroup={f.cultureGroup}
                          emblem={f.emblem}
                          name={f.name}
                          resolveFaction={false}
                          diplomaticStatus={f.diplomaticStatus}
                          subjectSubtype={f.subjectSubtype}
                          isPlayer={f.isPlayer}
                          isRebel={f.isRebel}
                          size="xs"
                          showRing
                          onClick={() => openSidebar('diplomacy', f.id)}
                        />
                      </FactionTooltip>
                    ))}
                  </div>
                </div>
                <Tooltip
                  content={warScoreBreakdownTooltip(war.warScoreBreakdown, war.warScore)}
                  position="bottom"
                  delay={150}
                  wrapperClassName="diplo-war-score-tooltip"
                >
                  <div className="diplo-war-score">
                    <WarScoreProgress score={war.warScore} />
                  </div>
                </Tooltip>
              </div>
            ))}
            {treatyRelations.map(({ type, partners }) => (
              <div key={type} className="diplo-relation-row">
                <img src={treatyIconPath(type)} alt="" className="diplo-relation-type-icon" />
                <span className="diplo-relation-type-label">{formatTreatyType(type)}</span>
                <div className="diplo-relation-factions">
                  {partners.map(p => (
                    <FactionTooltip
                      key={p.id}
                      factionId={p.id}
                      factionName={p.name}
                      data={{
                        id: p.id,
                        debugShortId: p.debugShortId,
                        name: p.name,
                        culture: p.culture,
                      }}
                      position="bottom"
                      delay={200}
                    >
                      <FactionRoundel
                        factionId={p.id}
                        colour={p.colour}
                        secondaryColour={p.secondaryColour}
                        cultureGroup={p.cultureGroup}
                        emblem={p.emblem}
                        name={p.name}
                        resolveFaction={false}
                        diplomaticStatus={p.diplomaticStatus}
                        subjectSubtype={p.subjectSubtype}
                        isPlayer={p.isPlayer}
                        isRebel={p.isRebel}
                        size="xs"
                        showRing
                        onClick={() => openSidebar('diplomacy', p.id)}
                      />
                    </FactionTooltip>
                  ))}
                </div>
              </div>
            ))}
            {treatyRelations.length === 0 && warFactions.length === 0 && (
              <div className="diplo-relations-empty"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.601.15" /></div>
            )}
          </div>

          {showDiplomaticActionArea && (
            <>
          <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.607.44')} />
          {faction.assignedDiplomat ? (
            <PersonTooltip characterId={faction.assignedDiplomat.id} position="bottom" delay={200}>
              <div
                className="diplo-agent-section diplo-agent-section--clickable diplo-agent-section--filled"
                data-tutorial-target="DiplomatPortrait"
                onClick={() => openAgentSelect(faction.id, 'diplomat')}
                role="button"
              >
                <Portrait
                  personId={faction.assignedDiplomat.id}
                  name={faction.assignedDiplomat.name}
                  size="md"
                  shape="circle"
                  showBorder
                  borderTier="gold"
                />
                <div className="diplo-agent-info">
                  <span className="diplo-agent-name">{faction.assignedDiplomat.name}</span>
                  <span className="diplo-agent-hint"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.617.16" /></span>
                </div>
                <button
                  type="button"
                  className="btn--outline diplo-agent-recall"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    recallAgent('diplomat');
                  }}
                >
                  {webUIText('Common.Recall')}
                </button>
              </div>
            </PersonTooltip>
          ) : (
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.623.45'), body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.623.46'), lines: [{ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.623.47'), get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.623.1"); }, valueColor: 'var(--gold)' }] }} position="bottom" delay={200}>
              <div
                className="diplo-agent-section diplo-agent-section--clickable"
                data-tutorial-target="DiplomatPortrait"
                onClick={() => openAgentSelect(faction.id, 'diplomat')}
                role="button"
              >
                <div className="diplo-agent-portrait-slot">
                  <img src="/assets/icons/I_Diplomacy.png" alt="" className="diplo-agent-slot-icon" />
                </div>
                <div className="diplo-agent-info">
                  <span className="diplo-agent-empty"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.632.17" /></span>
                  <span className="diplo-agent-hint"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.633.18" /></span>
                </div>
                <img src="/assets/icons/I_Caution.png" alt="" className="diplo-agent-warning" />
              </div>
            </Tooltip>
          )}
          {!factionInteractionSelection && <div className="diplo-actions-block">
            {liveDiplomaticInteractions.map(i => {
              const matchesOutcome = factionInteractionsState?.lastCompletedInteractionId === i.id;
              const outcome: 'success' | 'failure' | undefined = matchesOutcome
                ? factionInteractionsState!.lastInteractionSucceeded ? 'success' : 'failure'
                : undefined;
              const outcomeKey = matchesOutcome
                ? `${factionInteractionsState!.lastInteractionCompletedDate}:${i.id}`
                : undefined;
              const canClick = !i.inProgress && (i.availability === 'available' || i.canStartSettlementSelection || i.canStartInputSelection);
              const unavailableReason = !canClick && !i.inProgress ? primaryInteractionReason(i) : '';
              // Key by target faction + interaction so switching sidebars remounts
              // each card; reusing instances would trigger a false completion flash.
              const cardKey = `${faction.id}:${i.id}`;
              return (
                <Tooltip
                  key={cardKey}
                  content={buildFactionInteractionTooltip(i, {
                    actionKind: 'interaction',
                    targetFactionId: faction.id,
                    daysSaved: i.bureaucraticRushDaysSaved,
                    overloadLoad: i.bureaucraticRushLoad,
                  })}
                  position="left"
                  delay={150}
                  variant="sidebar"
                >
                  <InteractionCard
                    title={i.name}
                    description={i.description}
                    image={i.iconUrl}
                    bgImage={i.backgroundUrl}
                    durationDays={i.durationDays}
                    remainingDays={i.remainingDays}
                    inProgress={i.inProgress}
                    outcome={outcome}
                    outcomeText={matchesOutcome ? factionInteractionsState!.lastInteractionOutcomeText : undefined}
                    outcomeKey={outcomeKey}
                    cooldownDays={i.cooldownDays}
                    cooldownRemainingDays={i.cooldownRemainingDays}
                    tutorialTarget={`Interaction:${i.id}${i.id === 'subornfoederatiinteraction' ? ' SubornFoederatiButton' : ''}${i.id === 'invitefoederatiinteraction' ? ' InviteFoederatiButton' : ''}${i.id === 'declarerebellioninteraction' ? ' DeclareRebellionButton' : ''}${i.id === 'calltowarinteraction' ? ' CallToWarButton' : ''}`}
                    onClick={canClick ? () => startInteraction(i.id) : undefined}
                    onCancel={i.inProgress ? cancelFactionInteraction : undefined}
                    meta={unavailableReason ? <span className="diplo-action-reason">{unavailableReason}</span> : undefined}
                  />
                </Tooltip>
              );
            })}
          </div>}
          {factionInteractionSelection && (
            <div
              ref={factionInteractionSelectionPanelRef}
              className="diplo-selection-panel"
              data-tutorial-target="FoederatiRegionSelectionPanel"
            >
              <div className="diplo-selection-panel__header">{factionInteractionSelection.interactionName}</div>
              <div className="diplo-selection-panel__message">{factionInteractionSelection.message || factionInteractionSelection.prompt}</div>
              <div className="diplo-selection-panel__count">
                {factionInteractionSelection.selectedSettlementCount > 0
                  ? webUIText('Diplomacy.InteractionSelection.Count', { Count: formatNumber(factionInteractionSelection.selectedSettlementCount) })
                  : webUIText('Diplomacy.InteractionSelection.EmptyCount')}
              </div>
              {factionInteractionSelection.hasSuccessChance && (
                <div className="diplo-selection-panel__chance">
                  <span className="diplo-selection-panel__chance-label">
                    {webUIText('Diplomacy.InteractionSelection.AcceptChance')}
                  </span>
                  <span
                    className="diplo-selection-panel__chance-value"
                    style={{ color: successChanceColour(factionInteractionSelection.successChancePercent) }}
                  >
                    {formatPercent(factionInteractionSelection.successChancePercent)}
                  </span>
                </div>
              )}
              {showSeizeTerritoryBreakdown ? (
                <div className="diplo-selection-panel__effects">
                  {complianceState && (
                    <div className="diplo-selection-panel__effect-row">
                      <span className="diplo-selection-panel__effect-label">
                        {webUIText('Diplomacy.InteractionSelection.SubjectCompliance')}
                      </span>
                      <span className="diplo-selection-panel__effect-text">
                        {selectionComplianceValue}
                      </span>
                    </div>
                  )}
                  <div className="diplo-selection-panel__effect-row">
                    <span className="diplo-selection-panel__effect-label">
                      {webUIText('Diplomacy.InteractionSelection.Settlements')}
                    </span>
                    <span className="diplo-selection-panel__effect-text">
                      {selectionSettlementShare}
                    </span>
                  </div>
                </div>
              ) : (!isSeizeTerritorySelection && (factionInteractionSelection.impactText
                || factionInteractionSelection.successEffect
                || factionInteractionSelection.failureEffect
                || factionInteractionSelection.riskText)) && (
                <div className="diplo-selection-panel__effects">
                  {factionInteractionSelection.impactText && (
                    <div className="diplo-selection-panel__effect-row">
                      <span className="diplo-selection-panel__effect-label">
                        {webUIText('Diplomacy.InteractionSelection.Impact')}
                      </span>
                      <span className="diplo-selection-panel__effect-text">
                        {factionInteractionSelection.impactText}
                      </span>
                    </div>
                  )}
                  {factionInteractionSelection.successEffect && (
                    <div className="diplo-selection-panel__effect-row">
                      <span className="diplo-selection-panel__effect-label">
                        {webUIText('Diplomacy.InteractionSelection.Accepted')}
                      </span>
                      <span className="diplo-selection-panel__effect-text">
                        {factionInteractionSelection.successEffect}
                      </span>
                    </div>
                  )}
                  {factionInteractionSelection.failureEffect && (
                    <div className="diplo-selection-panel__effect-row">
                      <span className="diplo-selection-panel__effect-label diplo-selection-panel__effect-label--danger">
                        {webUIText('Diplomacy.InteractionSelection.Refused')}
                      </span>
                      <span className="diplo-selection-panel__effect-text">
                        {factionInteractionSelection.failureEffect}
                      </span>
                    </div>
                  )}
                  {factionInteractionSelection.riskText && (
                    <div className="diplo-selection-panel__risk">
                      {factionInteractionSelection.riskText}
                    </div>
                  )}
                </div>
              )}
              <div className="diplo-selection-panel__actions">
                <GameButton
                  variant="burgundy"
                  tutorialTarget="ConfirmFoederatiSelectionButton"
                  disabled={factionInteractionSelection.selectedSettlementCount === 0}
                  onClick={() => { void confirmFactionInteractionSelection(); }}
                >
                  {webUIText('Diplomacy.InteractionSelection.Confirm')}
                </GameButton>
                <GameButton variant="outline" onClick={() => { void cancelFactionInteractionSelection(); }}>
                  {webUIText('Diplomacy.InteractionSelection.Cancel')}
                </GameButton>
              </div>
            </div>
          )}
            </>
          )}

          {showSpyActionArea && (
            <>
          <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.674.48')} />
          {faction.assignedSpy ? (
            <PersonTooltip characterId={faction.assignedSpy.id} position="bottom" delay={200}>
              <div
                className="diplo-agent-section diplo-agent-section--clickable diplo-agent-section--filled"
                onClick={() => openAgentSelect(faction.id, 'spy')}
                role="button"
              >
                <Portrait
                  personId={faction.assignedSpy.id}
                  name={faction.assignedSpy.name}
                  size="md"
                  shape="circle"
                  showBorder
                  borderTier="gold"
                />
                <div className="diplo-agent-info">
                  <span className="diplo-agent-name">{faction.assignedSpy.name}</span>
                  <span className="diplo-agent-hint"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.684.19" /></span>
                </div>
                <button
                  type="button"
                  className="btn--outline diplo-agent-recall"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    recallAgent('spy');
                  }}
                >
                  {webUIText('Common.Recall')}
                </button>
              </div>
            </PersonTooltip>
          ) : (
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.690.49'), body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.690.50'), lines: [{ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.690.51'), get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.690.1"); }, valueColor: 'var(--gold)' }] }} position="bottom" delay={200}>
              <div
                className="diplo-agent-section diplo-agent-section--clickable"
                onClick={() => openAgentSelect(faction.id, 'spy')}
                role="button"
              >
                <div className="diplo-agent-portrait-slot">
                  <img src="/assets/icons/I_Spy.png" alt="" className="diplo-agent-slot-icon" />
                </div>
                <div className="diplo-agent-info">
                  <span className="diplo-agent-empty"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.699.20" /></span>
                  <span className="diplo-agent-hint"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.700.21" /></span>
                </div>
                <img src="/assets/icons/I_Caution.png" alt="" className="diplo-agent-warning" />
              </div>
            </Tooltip>
          )}
          {(() => {
            const net = faction.spyNetwork ?? { strength: 0, heat: 0, growthPerMonth: 0, spyCunning: 0 };
            const strength = Math.round(net.strength);
            const strengthText = formatNumber(strength);
            const heat = Math.round(net.heat);
            const heatText = formatNumber(heat);
            const growth = net.growthPerMonth;
            const hasSpy = !!faction.assignedSpy;
            const tooltip: TooltipContent = {
              title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.714.52'),
              get body() { return strength >= 100 ? webUIText("DiplomacySidebar.MaxInfluenceReached") : hasSpy ? webUIText("DiplomacySidebar.EachDayYour") : webUIText("DiplomacySidebar.NetworkStallsWithout"); },
              lines: hasSpy
                ? [
                    { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.722.53'), get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.722.1", { StrengthText: strengthText }); }, valueColor: 'var(--gold)' },
                    { label: webUIText('Diplomacy.Espionage.Exposure'), value: heatText, valueColor: heat > 0 ? 'var(--orange)' : 'var(--text-muted)' },
                    { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.723.54'), value: formatNumber(net.spyCunning), valueColor: 'var(--gold)' },
                    {
                      label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.725.55'),
                      get value() { return strength >= 100 ? webUIText("DiplomacySidebar.Capped") : webUIText("DiplomacySidebar.Month", { Value1: formatSignedNumber(growth, { maximumFractionDigits: 1 }) }); },
                      valueColor: strength >= 100 ? 'var(--text-muted)' : 'var(--green)',
                    },
                  ]
                : [
                    { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.731.56'), get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.731.1", { StrengthText: strengthText }); }, valueColor: 'var(--text-muted)' },
                    { label: webUIText('Diplomacy.Espionage.Exposure'), value: heatText, valueColor: 'var(--text-muted)' },
                    { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.732.57'), get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.732.1"); }, valueColor: 'var(--text-muted)' },
                  ],
            };
            return (
              <Tooltip content={tooltip} position="bottom" delay={200}>
                <div className="diplo-agent-network">
                  <img src="/assets/icons/I_Intrigue.png" alt="" className="diplo-agent-network-icon" />
                  <div className="diplo-agent-network-main">
                    <span className="diplo-agent-network-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.738.22" /></span>
                    <div className="diplo-agent-network-bar"><PaintedBar percent={strength} color="gold" /></div>
                    <span className="diplo-agent-network-val">{strengthText}/100</span>
                  </div>
                  <div className="diplo-agent-network-exposure">
                    <span className="diplo-agent-network-exposure-label"><WebUIText textKey="Diplomacy.Espionage.Exposure" /></span>
                    <span className="diplo-agent-network-exposure-val">{heatText}</span>
                  </div>
                  {hasSpy && strength < 100 && (
                    <span className="diplo-agent-network-growth">{formatSignedNumber(growth, { maximumFractionDigits: 1 })}<WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.742.23" /></span>
                  )}
                </div>
              </Tooltip>
            );
          })()}
          <div className="diplo-actions-block">
            {liveSpyInteractions.map(i => {
              const matchesOutcome = spyInteractionsState?.lastCompletedInteractionId === i.id;
              const outcome: 'success' | 'failure' | undefined = matchesOutcome
                ? spyInteractionsState!.lastInteractionSucceeded ? 'success' : 'failure'
                : undefined;
              const outcomeKey = matchesOutcome
                ? `${spyInteractionsState!.lastInteractionCompletedDate}:${i.id}`
                : undefined;
              const cardKey = `spy:${faction.id}:${i.id}`;
              const canClick = !i.inProgress && (i.availability === 'available' || i.canStartInputSelection);
              const unavailableReason = !canClick && !i.inProgress ? primaryInteractionReason(i) : '';
              return (
                <Tooltip
                  key={cardKey}
                  content={buildFactionInteractionTooltip(i, {
                    actionKind: 'spy',
                    targetFactionId: faction.id,
                    daysSaved: i.bureaucraticRushDaysSaved,
                    overloadLoad: i.bureaucraticRushLoad,
                  })}
                  position="left"
                  delay={150}
                  variant="sidebar"
                >
                  <InteractionCard
                    title={i.name}
                    description={i.description}
                    image={i.iconUrl}
                    bgImage={i.backgroundUrl}
                    durationDays={i.durationDays}
                    remainingDays={i.remainingDays}
                    inProgress={i.inProgress}
                    outcome={outcome}
                    outcomeText={matchesOutcome ? spyInteractionsState!.lastInteractionOutcomeText : undefined}
                    outcomeKey={outcomeKey}
                    cooldownDays={i.cooldownDays}
                    cooldownRemainingDays={i.cooldownRemainingDays}
                    onClick={canClick ? () => startSpy(i.id) : undefined}
                    onCancel={i.inProgress ? cancelSpyInteraction : undefined}
                    meta={unavailableReason ? <span className="diplo-action-reason">{unavailableReason}</span> : undefined}
                  />
                </Tooltip>
              );
            })}
          </div>
            </>
          )}

        </>}
        {activeTab === 'policies' && (
          <>
          <FoederatiPoliticsPanel factionId={faction.id} factionName={faction.name} data={faction.foederatiPolitics} />
          {faction.policies.length > 0 ? (
            <div className="diplo-policies">
              {faction.policies.map(policy => {
                const stance = policyStanceText(policy);
                const levels = policy.levelEffects;
                const fillPercent = policyFillPercent(policy);
                return (
                  <div key={policy.id} className="diplo-policy-row">
                    <Tooltip
                      content={policyTooltip(policy)}
                      position="right"
                      delay={200}
                      wrapperClassName="diplo-policy-main-tooltip"
                    >
                      <div className="diplo-policy-main">
                        <img src={policyIcon(policy)} alt="" className="diplo-policy-icon" draggable={false} />
                        <div className="diplo-policy-copy">
                          <span className="diplo-policy-name">{policy.name}</span>
                          {stance ? <span className="diplo-policy-stance">{stance}</span> : null}
                          {policy.isFromLiege ? (
                            <span className="diplo-policy-source">
                              {webUIText('FactionOverview.SetBy')} {policy.displayFactionName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Tooltip>
                    {levels.length > 0 && (
                      <div className="diplo-policy-pips">
                        <div className="diplo-policy-pips-track">
                          <div className="diplo-policy-pips-fill" style={{ width: `${fillPercent}%` }} />
                        </div>
                        <div className="diplo-policy-pips-levels">
                          {levels.map((level, index) => (
                            <Tooltip
                              key={`${level.level}:${index}`}
                              content={policyLevelTooltip(policy, level, index)}
                              position="top"
                              delay={150}
                              inline
                              wrapperClassName="diplo-policy-pip-wrap"
                            >
                              <span
                                className={`diplo-policy-pip${level.isCurrent ? ' diplo-policy-pip--current' : ''}${!level.isAvailable ? ' diplo-policy-pip--locked' : ''}${index === levels.length - 1 ? ' diplo-policy-pip--last' : ''}`}
                              />
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !faction.foederatiPolitics?.enabled ? (
            <div className="diplo-relations-empty"><WebUIText textKey="DiplomacySidebar.NoPolicies" /></div>
          ) : null}
          </>
        )}
        {activeTab === 'demographics' && (
          <DiplomacyDemographicsPanel faction={faction} />
        )}

      </StyledScrollArea>
    </div>
    <PreviousRulersModal
      open={previousRulersDialog !== null}
      factionId={faction.id}
      factionName={faction.name}
      onClose={() => closeDialog(previousRulersDialog)}
      onOpenCharacter={(id) => openSidebar('character', id)}
    />
    <ConfirmDialog
      visible={confirmDialog !== null}
      title={confirmDialog?.response.interactionName ?? ''}
      message={confirmDialog && <>
        {renderRichText(confirmDialog.response.confirmationMessage)}
        <InteractionEffectsTooltip lines={confirmDialog.response.confirmationEffectLines} compact />
      </>}
      variant="danger"
      onConfirm={() => {
        if (!confirmDialog) return;
        startInteraction(confirmDialog.response.interactionId, confirmDialog.selectedPersonId, confirmDialog.rebellionKind, true);
      }}
      onClosed={() => closeDialog(confirmDialog)}
    />
    <HeirAssignmentModal
      open={heirDialog !== null}
      factionId={faction.id}
      currentHeirId={faction.effectiveHeir?.id}
      currentDesignatedHeirId={faction.designatedHeir?.id}
      onClose={() => closeDialog(heirDialog)}
      onOpenCharacter={(id) => openSidebar('character', id)}
    />
    <RebellionChoiceModal
      open={rebellionChoiceDialog !== null}
      interactionName={rebellionChoiceDialog?.interactionName ?? ''}
      targetFaction={{
        id: faction.id,
        name: faction.name,
        colour: faction.colour,
        secondaryColour: faction.secondaryColour,
        cultureGroup: faction.cultureGroup,
        emblem: faction.emblem,
      }}
      onClose={() => closeDialog(rebellionChoiceDialog)}
      onChoose={(kind) => {
        if (!rebellionChoiceDialog) return;
        closeDialog(rebellionChoiceDialog);
        startInteraction(rebellionChoiceDialog.interactionId, undefined, kind);
      }}
    />
    <FactionInteractionPersonSelectionModal
      open={personSelectionDialog !== null}
      selection={personSelectionDialog?.selection ?? null}
      onClose={() => closeDialog(personSelectionDialog)}
      onSelect={(interactionId, personId) => startInteraction(interactionId, personId)}
      onOpenCharacter={(id) => openSidebar('character', id)}
    />
    <FactionInteractionInputModal
      selection={factionInputDialog?.selection ?? null}
      targetFaction={{
        id: faction.id,
        name: faction.name,
        colour: faction.colour,
        secondaryColour: faction.secondaryColour,
        cultureGroup: faction.cultureGroup,
        emblem: faction.emblem,
      }}
      onClose={() => closeDialog(factionInputDialog)}
      onConfirm={confirmFactionInputs}
    />
    <FactionInteractionInputModal
      selection={spyInputDialog?.selection ?? null}
      targetFaction={{
        id: faction.id,
        name: faction.name,
        colour: faction.colour,
        secondaryColour: faction.secondaryColour,
        cultureGroup: faction.cultureGroup,
        emblem: faction.emblem,
      }}
      onClose={() => closeDialog(spyInputDialog)}
      onConfirm={confirmSpyInputs}
    />
    </>
  );
};

export default React.memo(DiplomacySidebar);

function DiplomacySidebarSlot({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const faction = useFaction(sidebarId);
  const [activeTab, setActiveTab] = React.useState<DiplomacySidebarTab>('info');

  useSidebarTabRequest('diplomacy', sidebarId, tabIndex => {
    const tab = diplomacyTabFromIndex(tabIndex);
    if (tab) setActiveTab(tab);
  });

  if (!faction) return null;
  return (
    <DiplomacySidebar
      faction={faction}
      onClose={onClose}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
}

registerSidebar({
  id: 'diplomacy',
  side: 'left',
  component: DiplomacySidebarSlot,
  advisorTopic: 'diplomacySidebar',
});

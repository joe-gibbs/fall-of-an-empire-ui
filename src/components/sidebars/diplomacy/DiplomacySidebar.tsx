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
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import HeirAssignmentModal from '../../modals/characters/HeirAssignmentModal';
import FactionInteractionPersonSelectionModal from '../../modals/diplomacy/FactionInteractionPersonSelectionModal';
import FactionInteractionInputModal from '../../modals/diplomacy/FactionInteractionInputModal';
import CultureTooltip from '../../common/tooltips/CultureTooltip';
import GovernmentTooltip from '../../common/tooltips/GovernmentTooltip';
import ReligionTooltip from '../../common/tooltips/ReligionTooltip';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { usePinnedItemsBridge, zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { breakTreatyBridge, setProvinceBuildFocusBridge } from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { dispatchFactionData } from '../../../bridge/diplomacy/useFactionBridge';
import { BureaucraticRushTooltipAction } from '../../bureaucracy/BureaucraticThroughput';
import glossary from '../../../data/glossary';
import type { Faction, FactionTreaty } from '../../../data/types';
import { STAT_ICONS } from '../../../utils/iconMaps';
import { formatTreatyType } from '../../../utils/displayLabels';
import { canNegotiateDiplomacyWith } from '../../../utils/diplomacyAuthority';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import { usePerson, useFaction, usePlayerFactionId } from '../../../data-source/index';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import type {
  BridgeFactionInteractionProvidedInput,
  StartFactionInteractionResponse,
  StartSpyInteractionResponse,
} from '../../../bridge-types.generated.ts';
import { registerSidebar } from '../../../registry/index';
import { useFactionInteractionsBridge } from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import type { FactionInteractionView } from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import { useSpyInteractionsBridge } from '../../../bridge/diplomacy/useSpyInteractionsBridge';
import type { SpyInteractionView } from '../../../bridge/diplomacy/useSpyInteractionsBridge';
import SidebarToolbar from '../shared/SidebarToolbar';
import '../shared/Sidebar.css';
import './DiplomacySidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface DiplomacySidebarProps {
  faction: Faction;
  onClose: () => void;
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
    | 'successChancePercent' | 'successFactors' | 'effectLines' | 'reasons'>;

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

  if (i.goldCost > 0) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.63.1'), value: formatNumber(i.goldCost), valueIcon: '/assets/icons/I_Coins.png' });
  }

  if (i.inProgress && i.remainingDays > 0) {
    const days = Math.round(i.remainingDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.68.2'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.68.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else if (i.durationDays > 0) {
    const days = Math.round(i.durationDays);
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.71.3'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.71.1", { Value1: formatNumber(days), Value2: webUIText(days === 1 ? 'Common.Day' : 'Common.Days') }); } });
  } else {
    lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.73.4'), labelIcon: '/assets/icons/I_Speed.png', get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.73.1"); } });
  }

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

  if (i.cooldownDays > 0) {
    if (i.cooldownRemainingDays > 0) {
      const remaining = Math.round(i.cooldownRemainingDays);
      lines.push({
        label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.96.6'), labelIcon: '/assets/icons/I_Cooling.png',
        get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.97.1", { Value1: formatNumber(remaining), Value2: webUIText(remaining === 1 ? 'Common.Day' : 'Common.Days') }); },
        valueColor: 'var(--red)',
      });
    } else {
      const total = Math.round(i.cooldownDays);
      lines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.102.7'), labelIcon: '/assets/icons/I_Cooling.png', get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.102.1", { Value1: formatNumber(total), Value2: webUIText(total === 1 ? 'Common.Day' : 'Common.Days') }); } });
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
        <span>{i.description}</span>
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

function getStatusBadgeText(status: Faction['diplomaticStatus']): string {
  switch (status) {
    case 'war': return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.118.9');
    case 'ally': return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.119.10');
    case 'rival': return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.120.11');
    case 'subject': return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.121.12');
    default: return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.122.13');
  }
}

function DiplomacyStatusBadge({ text, status }: { text: string; status: string }) {
  return <span className={`diplo-status-badge diplo-status-badge--${status}`}>{text}</span>;
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
  neutral: '/assets/icons/I_Diplomacy.png',
};


/** Keyed on the bridge's ETreatyType enum names. */
const treatyIcons: Record<string, string> = {
  NonAggression: '/assets/icons/Treaties/I_NonAggression.png',
  Trade: '/assets/icons/Treaties/I_TradeAgreement.png',
  TradeOneOff: '/assets/icons/Treaties/I_TradeAgreement.png',
  MilitaryAlliance: '/assets/icons/Treaties/I_MilitaryAlliance.png',
  DefensiveAlliance: '/assets/icons/Treaties/I_DefensiveAlliance.png',
  Subject: '/assets/icons/Treaties/I_Vassalage.png',
  Tribute: '/assets/icons/Treaties/I_Tribute.png',
  TributeOneOff: '/assets/icons/Treaties/I_Tribute.png',
  PassageRights: '/assets/icons/Treaties/I_MilitaryAccess.png',
  MerchantRights: '/assets/icons/Treaties/I_TradeAgreement.png',
  KnowledgeSharing: '/assets/icons/Treaties/I_MapSharing.png',
  Peace: '/assets/icons/I_Peace.png',
};

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

function getStatColor(val: number): string {
  if (val >= 16) return 'var(--green-light)';
  if (val >= 12) return 'var(--green)';
  if (val >= 8) return 'var(--gold-light)';
  if (val >= 5) return 'var(--orange)';
  return 'var(--red)';
}

const statMeta: { key: import('../../../data/types').StatKey; label: string; icon: string; desc: string }[] = [
  { key: 'tactics', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.178.1'); }, icon: '/assets/icons/StatIcons/I_Tactics.png', get desc() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.178.7'); } },
  { key: 'authority', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.179.2'); }, icon: '/assets/icons/StatIcons/I_Authority.png', get desc() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.179.8'); } },
  { key: 'cunning', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.180.3'); }, icon: '/assets/icons/StatIcons/I_Cunning.png', get desc() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.180.9'); } },
  { key: 'governance', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.181.4'); }, icon: '/assets/icons/StatIcons/I_Governance.png', get desc() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.181.10'); } },
  { key: 'loyalty', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.182.5'); }, icon: '/assets/icons/StatIcons/I_Loyalty.png', get desc() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.182.11'); } },
  { key: 'constitution', get label() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.183.6'); }, icon: '/assets/icons/StatIcons/I_Constitution.png', get desc() { return webUIText('Auto.TopProp.ComponentsSidebarsDiplomacySidebar.183.12'); } },
];

/** Compliance thresholds matching the game's 5-state system */
function getComplianceState(val: number): { label: string; icon: string; color: string } {
  if (val >= 30) return { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.188.14'), icon: '/assets/icons/Compliance/I_Eager.png', color: 'var(--green)' };
  if (val >= 10) return { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.189.15'), icon: '/assets/icons/Compliance/I_Reliable.png', color: '#9acd32' };
  if (val >= -10) return { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.190.16'), icon: '/assets/icons/Compliance/I_Grumbling.png', color: 'var(--gold)' };
  if (val >= -30) return { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.191.17'), icon: '/assets/icons/Compliance/I_Delaying.png', color: 'var(--orange)' };
  return { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.192.18'), icon: '/assets/icons/Compliance/I_Refusing.png', color: 'var(--red)' };
}

async function refreshAgentTarget(factionId: string, role: AgentRole): Promise<void> {
  const factionData = await bridgeCall('game.get_faction_data', { factionId, scope: 'full' });
  dispatchFactionData(factionData);

  if (role === 'spy') {
    const spyInteractions = await bridgeCall('game.get_spy_interactions', { targetFactionId: factionId });
    window.dispatchEvent(new CustomEvent('bridge:game.get_spy_interactions', { detail: spyInteractions }));
  } else {
    const factionInteractions = await bridgeCall('game.get_faction_interactions', { targetFactionId: factionId });
    window.dispatchEvent(new CustomEvent('bridge:game.get_faction_interactions', { detail: factionInteractions }));
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DiplomacySidebar: React.FC<DiplomacySidebarProps> = ({ faction, onClose }) => {
  const { openSidebar, openScreen, showAdvisor, openAgentSelect, navigateSidebarHistory } = useGameActions();
  const { debugMode, sidebarNavigation } = useGameState();
  const playerFactionId = usePlayerFactionId();
  const playerFaction = useFaction(playerFactionId);
  const { isPinned: checkPinned, togglePin } = usePinnedItemsBridge();
  const isPinned = checkPinned('faction', faction.id);
  const [heirModalOpen, setHeirModalOpen] = useState(false);
  const [personSelection, setPersonSelection] = useState<StartFactionInteractionResponse | null>(null);
  const [breakingTreatyId, setBreakingTreatyId] = useState<string | null>(null);
  const [factionInputSelection, setFactionInputSelection] = useState<StartFactionInteractionResponse | null>(null);
  const [spyInputSelection, setSpyInputSelection] = useState<StartSpyInteractionResponse | null>(null);
  const diplomacyNavigation = sidebarNavigation.diplomacy;
  const canNavigateBack = (diplomacyNavigation?.back.length ?? 0) > 0;
  const canNavigateForward = (diplomacyNavigation?.forward.length ?? 0) > 0;
  const statusText = getStatusBadgeText(faction.diplomaticStatus);
  const isProvinceSubject = faction.subjectSubtype === 'province';
  const hasBuildFocus = isProvinceSubject && Boolean(faction.buildFocus);
  const focusKey = focusKeyForFaction(faction);
  const canSetBuildFocus = hasBuildFocus && Boolean(faction.canSetBuildFocus);
  const buildFocusBlockedReason = faction.buildFocusBlockedReason || webUIText('Auto.Fix.VarExprFalse.componentsscreensInternalPoliticsScreen.416.1');
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
  const militaryOverviewStat = faction.usesLevies
    ? {
      title: webUIText('DiplomacySidebar.PossibleLevyStrength'),
      body: webUIText('DiplomacySidebar.PossibleLevyStrengthTooltip'),
      value: faction.levyStrength ?? 0,
      label: webUIText('DiplomacySidebar.Levies'),
    }
    : {
      title: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.465.37'),
      body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.465.38'),
      value: faction.armyCount,
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
  const liveDiplomaticInteractions = (factionInteractionsState?.interactions ?? [])
    .filter(i => !i.isEdict);

  // Spy interactions live on a parallel slot (FactionCharacterComponent).
  const { state: spyInteractionsState, start: startSpyInteraction, cancel: cancelSpyInteraction } =
    useSpyInteractionsBridge(faction.id);
  const liveSpyInteractions: SpyInteractionView[] = spyInteractionsState?.interactions ?? [];
  const showDiplomaticActionArea = !faction.isPlayer && liveDiplomaticInteractions.length > 0;
  const showSpyActionArea = !faction.isPlayer && liveSpyInteractions.length > 0;

  const cultureIcon = FoaeCefUIAssetPath(faction.cultureId ? `/assets/cultures/${faction.cultureId}.png` : '/assets/icons/I_Cultures.png');
  const religionIcon = FoaeCefUIAssetPath(faction.religionId ? `/assets/religions/${faction.religionId}.png` : '/assets/icons/I_Religions.png');

  // Opinion is ~-100 to +100 (unbounded in extreme cases). The bar pivots at 0.
  const opinionColor = getOpinionColor(faction.opinion);
  const opinionIcon = getOpinionIcon(faction.opinion);
  const opinionFill = Math.min(1, Math.abs(faction.opinion) / 100);

  // Compliance (for subject factions)
  const isSubject = faction.diplomaticStatus === 'subject';
  const showOpinion = !faction.isPlayer && !isSubject;
  const complianceVal = faction.compliance ?? 0;
  const complianceState = !faction.isPlayer && isSubject ? getComplianceState(complianceVal) : null;
  const isSeizeTerritorySelection = factionInteractionSelection?.interactionId === 'SeizeTerritoryInteraction';
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
      .then(() => bridgeCall('game.get_faction_data', { factionId: faction.id, scope: 'full' }))
      .then(dispatchFactionData)
      .catch(acknowledgeBridgeFailure);
  }, [canSetBuildFocus, faction.id, focusKey]);

  const startInteraction = React.useCallback((interactionId: string, selectedPersonId?: string) => {
    void startFactionInteraction(interactionId, selectedPersonId).then((response) => {
      if (response?.personSelectionRequired) {
        setPersonSelection(response);
        setFactionInputSelection(null);
        setSpyInputSelection(null);
      } else if (response?.inputSelectionRequired) {
        setFactionInputSelection(response);
        setPersonSelection(null);
        setSpyInputSelection(null);
      } else {
        setPersonSelection(null);
        setFactionInputSelection(null);
      }
    });
  }, [startFactionInteraction]);

  const confirmFactionInputs = React.useCallback(async (
    interactionId: string,
    inputs: BridgeFactionInteractionProvidedInput[],
  ) => {
    const response = await startFactionInteraction(interactionId, '', inputs);
    if (response?.inputSelectionRequired) {
      setFactionInputSelection(response);
      return response.message || null;
    }
    if (response?.personSelectionRequired) {
      setPersonSelection(response);
      setFactionInputSelection(null);
      return null;
    }
    setFactionInputSelection(null);
    return response?.started || response?.selectionStarted ? null : response?.message ?? null;
  }, [startFactionInteraction]);

  const startSpy = React.useCallback((interactionId: string) => {
    void startSpyInteraction(interactionId).then((response) => {
      if (response?.inputSelectionRequired) {
        setSpyInputSelection(response);
        setFactionInputSelection(null);
        setPersonSelection(null);
      } else {
        setSpyInputSelection(null);
      }
    });
  }, [startSpyInteraction]);

  const confirmSpyInputs = React.useCallback(async (
    interactionId: string,
    inputs: BridgeFactionInteractionProvidedInput[],
  ) => {
    const response = await startSpyInteraction(interactionId, inputs);
    if (response?.inputSelectionRequired) {
      setSpyInputSelection(response);
      return response.message || null;
    }
    setSpyInputSelection(null);
    return response?.started ? null : response?.message ?? null;
  }, [startSpyInteraction]);

  const closeSidebar = React.useCallback(() => {
    if (factionInteractionSelection) {
      void cancelFactionInteractionSelection();
    }
    setFactionInputSelection(null);
    setSpyInputSelection(null);
    onClose();
  }, [cancelFactionInteractionSelection, factionInteractionSelection, onClose]);

  // Relations with OTHER factions (wars, treaties). Wars come from the bridge.
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
  }
  const treatyRelations = useMemo(() => {
    const grouped = new Map<string, TreatyPartner[]>();
    for (const t of faction.treaties.filter(treaty => !treaty.isWithPlayer)) {
      const partner: TreatyPartner = {
        id: t.withFactionId ?? t.withFaction,
        name: t.withFaction,
        debugShortId: t.withFactionDebugShortId,
        colour: t.withFactionColour,
        secondaryColour: t.withFactionSecondaryColour,
        culture: t.withFactionCulture,
        cultureGroup: t.withFactionCultureGroup,
        emblem: t.withFactionEmblem,
      };
      const list = grouped.get(t.type) ?? [];
      list.push(partner);
      grouped.set(t.type, list);
    }
    return Array.from(grouped.entries()).map(([type, partners]) => ({ type, partners }));
  }, [faction.treaties]);
  const ourTreaties = useMemo(() => (
    faction.isPlayer ? [] : faction.treaties.filter(treaty => treaty.isWithPlayer)
  ), [faction.isPlayer, faction.treaties]);

  const breakTreaty = (treaty: FactionTreaty) => {
    if (!treaty.id || !treaty.canBreak) return;
    setBreakingTreatyId(treaty.id);
    breakTreatyBridge(treaty.id).catch(acknowledgeBridgeFailure).finally(() => setBreakingTreatyId(null));
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
          { icon: isPinned ? '/assets/icons/I_Pin_Pinned.png' : '/assets/icons/I_Pin_Unpinned.png', get tooltip() { return isPinned ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsDiplomacySidebar.297.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsDiplomacySidebar.297.1"); }, get tooltipBody() { return isPinned ? webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.297.21') : webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.297.22'); }, onClick: () => togglePin('faction', faction.id), isActive: isPinned },
          { icon: '/assets/icons/I_ZoomTo.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.298.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.298.23'); }, onClick: () => zoomToBridge('faction', faction.id) },
          { icon: '/assets/ui/I_HelpIcon.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.299.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.299.24'); }, onClick: () => showAdvisor('diplomacySidebar', { force: true }) },
        ]}
        onClose={closeSidebar}
      />

      {/* Faction header with event image + colour-tinted scrim */}
      <div className="diplo-header">
        <img src="/assets/events/diplomatic-envoy.png" alt="" className="diplo-header-bg" />
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
              cultureInfo: faction.cultureInfo,
              religion: faction.religion,
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
            {!faction.isPlayer && <div className="diplo-header-status-row">
              <img src={statusIcons[faction.diplomaticStatus] || statusIcons.neutral} alt="" className="diplo-header-status-icon" />
              <DiplomacyStatusBadge text={statusText} status={faction.diplomaticStatus} />
              {faction.isRebel && (
                <DiplomacyStatusBadge
                  text={webUIText('Auto.ExtraAttr.ComponentsSidebarsDiplomacySidebar.317.1')}
                  status="war"
                />
              )}
            </div>}
            <div className="diplo-header-capital">
              <img src="/assets/icons/I_Capital.png" alt="" className="diplo-header-capital-icon" />
              <span className="diplo-header-capital-text">{faction.capital}</span>
            </div>
          </div>
        </div>
        {!isProvinceSubject && (
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

      <StyledScrollArea className="sidebar-content sidebar-content--textured">

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
                  onClick={() => openScreen('treaty', faction.id)}
                >
                  <WebUIText textKey="Diplomacy.NegotiateTreaty" />
                </GameButton>
              </Tooltip>
            </div>
          )}

          {/* Culture / Religion / Government */}
          <div className="char-identity-pair diplo-identity-pair">
            <CultureTooltip info={faction.cultureInfo} fallbackName={faction.culture} fallbackId={faction.cultureId}>
              <div className="char-identity-row">
                <img src={cultureIcon} alt="" className="char-identity-icon" />
                <span className="char-identity-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.370.2" /></span>
                <span className="char-identity-value">{faction.culture}</span>
              </div>
            </CultureTooltip>
            <ReligionTooltip info={faction.religionInfo} fallbackName={faction.religion} fallbackId={faction.religionId}>
              <div className="char-identity-row">
                <img src={religionIcon} alt="" className="char-identity-icon" />
                <span className="char-identity-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.377.3" /></span>
                <span className="char-identity-value">{faction.religion}</span>
              </div>
            </ReligionTooltip>
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

          {debugMode && (
            <>
              <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.386.23')} />
              <div className="sidebar-debug-rows">
                <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.388.24')} value={`#${formatNumber(faction.debugShortId ?? 0)}`} />
                {faction.rulerDebugShortId ? <InfoRow label={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.389.25')} value={`#${formatNumber(faction.rulerDebugShortId)}`} /> : null}
              </div>
            </>
          )}

          {/* Opinion bar (hidden for subjects — compliance replaces it) */}
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
                    <div className="painted-bar-fill painted-bar-fill--green" style={{ width: '50%', left: '50%', borderRadius: 0, transform: `scaleX(${opinionFill})` }} />
                  )}
                  <div className="diplo-opinion-center" />
                </div>
                <span className="diplo-opinion-val" style={{ color: opinionColor }}>{formatNumber(faction.opinion)}</span>
              </div>
            </Tooltip>
          )}

          {/* Compliance (subject factions only) */}
          {complianceState && (
            <Tooltip content={{
              get title() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.428.1", { Label: complianceState.label }); },
              body: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.429.29'),
              lines: [
                { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.431.30'), value: formatNumber(complianceVal), valueColor: complianceState.color },
                ...(faction.complianceBreakdown ?? []).map(m => ({
                  label: m.label,
                  value: formatSignedNumber(m.value),
                  valueColor: m.value > 0 ? '#6dba4c' : m.value < 0 ? '#c75b3a' : 'var(--text-muted)',
                })),
              ],
              footer: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.438.31'),
            }} position="bottom" delay={200}>
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
                      body: canSetBuildFocus ? option.body : buildFocusBlockedReason,
                      get footer() { return canSetBuildFocus ? option.id === focusKey ? webUIText("Auto.Fix.PropExprTrueTrue.componentsscreensInternalPoliticsScreen.483.1") : webUIText("Auto.Fix.PropExprTrueFalse.componentsscreensInternalPoliticsScreen.483.1") : buildFocusBlockedReason; },
                    }}
                  >
                    <button
                      type="button"
                      className={`diplo-build-focus-button${option.id === focusKey ? ' diplo-build-focus-button--active' : ''}${canSetBuildFocus ? '' : ' diplo-build-focus-button--disabled'}`}
                      aria-label={option.label}
                      disabled={!canSetBuildFocus}
                      onMouseDown={(event) => {
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

          {ourTreaties.length > 0 && (
            <>
              <SectionHeading variant="ornate" title={webUIText('Diplomacy.TreatiesWithUs')} />
              <div className="diplo-player-treaties">
                {ourTreaties.map(treaty => (
                  <div key={treaty.id || `${treaty.type}:${treaty.withFactionId}`} className="diplo-player-treaty-row">
                    <img src={treatyIcons[treaty.type] || '/assets/icons/I_Diplomacy.png'} alt="" className="diplo-relation-type-icon" />
                    <div className="diplo-player-treaty-copy">
                      <span className="diplo-player-treaty-name">{treaty.displayName || formatTreatyType(treaty.type)}</span>
                      <span className="diplo-player-treaty-detail">
                        {treaty.isPerpetual
                          ? webUIText('Diplomacy.TreatyPerpetual')
                          : treaty.daysRemaining && treaty.daysRemaining > 0
                            ? webUIText('Diplomacy.TreatyDaysRemaining', { Days: formatNumber(treaty.daysRemaining) })
                            : webUIText('Diplomacy.TreatyNoExpiry')}
                      </span>
                    </div>
                    {treaty.canBreak && treaty.id ? (
                      <button
                        type="button"
                        className="diplo-treaty-break"
                        disabled={breakingTreatyId === treaty.id}
                        onMouseDown={() => breakTreaty(treaty)}
                      >
                        <WebUIText textKey="Diplomacy.BreakTreaty" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Faction overview stats */}
          <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.449.32')} />
          <div className="diplo-overview-grid">
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

          {/* Characters - ruler first (with inline stats), then by category */}
          <div className="diplo-section-heading-with-action">
            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.485.41')} />
            <GameButton
              variant="outline"
              icon="/assets/icons/I_Characters.png"
              className="diplo-view-characters-button"
              onClick={() => openScreen('characters', faction.id)}
            >
              <WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.491.10" />
            </GameButton>
          </div>
          {/* Ruler row - prominent, inline with stats */}
          <div className="diplo-ruler-section">
              <PersonTooltip characterId={faction.rulerId} position="right">
                  <Portrait
                    personId={faction.rulerId}
                    name={faction.rulerName}
                    size="lg"
                    showBorder
                  />
              </PersonTooltip>
              <div className="diplo-ruler-info">
                <div className="diplo-ruler-name">{faction.rulerName}</div>
                <div className="diplo-ruler-title">{rulerCharacter?.shortTitle || webUIText("Auto.Fix.ExprFallback.componentssidebarsDiplomacySidebar.502.1")}</div>
                {rulerCharacter && (
                  <div className="diplo-ruler-stats">
                    {statMeta.map(s => {
                      const val = rulerCharacter.stats[s.key];
                      return (
                        <Tooltip key={s.key} content={{ title: s.label, body: s.desc }} position="bottom" delay={150}>
                          <div className="diplo-ruler-stat">
                            <img src={s.icon} alt="" className="diplo-ruler-stat-icon" />
                            <span className="diplo-ruler-stat-val" style={{ color: getStatColor(val) }}>{formatNumber(val)}</span>
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
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
                  <span className="diplo-successor-name">{successor?.name ?? webUIText('Common.None')}</span>
                </div>
                {canSetSuccessor ? (
                  <button
                    type="button"
                    className="diplo-successor-action"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setHeirModalOpen(true);
                    }}
                  >
                    {webUIText('Common.Assign')}
                  </button>
                ) : null}
              </div>
            </>
          )}
          {/* Relations - wars and treaties with other factions */}
          <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsDiplomacySidebar.567.43')} />
          <div className="diplo-relations-list">
            {warFactions.length > 0 && (
              <div className="diplo-relation-row diplo-relation-row--war">
                <img src="/assets/icons/I_War.png" alt="" className="diplo-relation-type-icon" />
                <span className="diplo-relation-type-label"><WebUIText textKey="Auto.ComponentsSidebarsDiplomacySidebar.571.14" /></span>
                <div className="diplo-relation-factions">
                  {warFactions.map(f => (
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
                        size="xs"
                        showRing
                        onClick={() => openSidebar('diplomacy', f.id)}
                      />
                    </FactionTooltip>
                  ))}
                </div>
              </div>
            )}
            {treatyRelations.map(({ type, partners }) => (
              <div key={type} className="diplo-relation-row">
                <img src={treatyIcons[type] || "/assets/icons/I_Diplomacy.png"} alt="" className="diplo-relation-type-icon" />
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
                onMouseDown={() => openAgentSelect(faction.id, 'diplomat')}
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
                  className="diplo-agent-recall"
                  onMouseDown={(event) => {
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
                onMouseDown={() => openAgentSelect(faction.id, 'diplomat')}
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
          <div className="diplo-actions-block">
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
                    tutorialTarget={`Interaction:${i.id}${i.id === 'SubornFoederatiInteraction' ? ' SubornFoederatiButton' : ''}${i.id === 'InviteFoederatiInteraction' ? ' InviteFoederatiButton' : ''}`}
                    onClick={canClick ? () => startInteraction(i.id) : undefined}
                    onCancel={i.inProgress ? cancelFactionInteraction : undefined}
                    meta={unavailableReason ? <span className="diplo-action-reason">{unavailableReason}</span> : undefined}
                  />
                </Tooltip>
              );
            })}
          </div>
          {factionInteractionSelection && (
            <div className="diplo-selection-panel">
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
                <GameButton variant="burgundy" onClick={() => { void confirmFactionInteractionSelection(); }}>
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
                onMouseDown={() => openAgentSelect(faction.id, 'spy')}
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
                  className="diplo-agent-recall"
                  onMouseDown={(event) => {
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
                onMouseDown={() => openAgentSelect(faction.id, 'spy')}
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
              get body() { return strength >= 100 ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsDiplomacySidebar.716.1") : hasSpy ? webUIText("Auto.Fix.PropExprFalseTrue.componentssidebarsDiplomacySidebar.718.1") : webUIText("Auto.Fix.PropExprFalseFalse.componentssidebarsDiplomacySidebar.719.1"); },
              lines: hasSpy
                ? [
                    { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.722.53'), get value() { return webUIText("Auto.Prop.componentssidebarsDiplomacySidebar.722.1", { StrengthText: strengthText }); }, valueColor: 'var(--gold)' },
                    { label: webUIText('Diplomacy.Espionage.Exposure'), value: heatText, valueColor: heat > 0 ? 'var(--orange)' : 'var(--text-muted)' },
                    { label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.723.54'), value: formatNumber(net.spyCunning), valueColor: 'var(--gold)' },
                    {
                      label: webUIText('Auto.Prop.ComponentsSidebarsDiplomacySidebar.725.55'),
                      get value() { return strength >= 100 ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsDiplomacySidebar.726.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsDiplomacySidebar.726.1", { Value1: formatSignedNumber(growth, { maximumFractionDigits: 1 }) }); },
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

      </StyledScrollArea>
    </div>
    <HeirAssignmentModal
      open={heirModalOpen}
      factionId={faction.id}
      currentHeirId={faction.effectiveHeir?.id}
      currentDesignatedHeirId={faction.designatedHeir?.id}
      onClose={() => setHeirModalOpen(false)}
      onOpenCharacter={(id) => openSidebar('character', id)}
    />
    <FactionInteractionPersonSelectionModal
      open={Boolean(personSelection)}
      selection={personSelection}
      onClose={() => setPersonSelection(null)}
      onSelect={(interactionId, personId) => startInteraction(interactionId, personId)}
      onOpenCharacter={(id) => openSidebar('character', id)}
    />
    <FactionInteractionInputModal
      selection={factionInputSelection}
      targetFaction={{
        id: faction.id,
        name: faction.name,
        colour: faction.colour,
        secondaryColour: faction.secondaryColour,
        cultureGroup: faction.cultureGroup,
        emblem: faction.emblem,
      }}
      onClose={() => setFactionInputSelection(null)}
      onConfirm={confirmFactionInputs}
    />
    <FactionInteractionInputModal
      selection={spyInputSelection}
      targetFaction={{
        id: faction.id,
        name: faction.name,
        colour: faction.colour,
        secondaryColour: faction.secondaryColour,
        cultureGroup: faction.cultureGroup,
        emblem: faction.emblem,
      }}
      onClose={() => setSpyInputSelection(null)}
      onConfirm={confirmSpyInputs}
    />
    </>
  );
};

export default React.memo(DiplomacySidebar);

function DiplomacySidebarSlot({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const faction = useFaction(sidebarId);
  if (!faction) return null;
  return <DiplomacySidebar faction={faction} onClose={onClose} />;
}

registerSidebar({
  id: 'diplomacy',
  side: 'left',
  component: DiplomacySidebarSlot,
  advisorTopic: 'diplomacySidebar',
});

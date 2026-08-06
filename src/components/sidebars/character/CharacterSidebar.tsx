import React from 'react';
import Portrait, { type PortraitHandle } from '../../common/portraits/Portrait';
import { portraitLightFromMouseEvent } from '../../common/portraits/portraitLighting';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import GameButton from '../../common/buttons/GameButton';
import InfoRow from '../../common/data-display/stats/InfoRow';
import InteractionCard from '../../common/interactions/InteractionCard';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipLine } from '../../common/tooltips/Tooltip';
import CultureTooltip from '../../common/tooltips/CultureTooltip';
import ReligionTooltip from '../../common/tooltips/ReligionTooltip';
import { cultureIconPath } from '../../../utils/cultureIcons';
import { TraitIcon } from '../../common/entities/TraitIcon';
import PersonInteractionInitiatorModal from '../../modals/people/PersonInteractionInitiatorModal';
import PersonInteractionGiftModal from '../../modals/people/PersonInteractionGiftModal';
import type { Character, CharacterRelationship, StatKey } from '../../../data/types';
import { STAT_ICONS } from '../../../utils/iconMaps';
import { characterStatEffectLines } from '../../../utils/characterStatEffects';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { bridgeCall, type StartPersonInteractionResponse } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { dispatchPersonData } from '../../../bridge/characters/usePersonBridge';
import { usePinnedItemsBridge, zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import {
  usePersonInteractionsBridge,
  type PersonInteractionView,
} from '../../../bridge/characters/usePersonInteractionsBridge';
import {
  useFamilyTreeBridge,
} from '../../../bridge/characters/useCharactersBridge';
import {
  buildFamilyGraph,
  relationshipMatchesSearch,
  relationshipTone,
  relationshipTypeTitle,
} from './FamilyGraphModel';
import { FamilyGraphView } from './FamilyGraphPanel';
import {
  CharacterDutyRow,
  CharacterHistoryList,
  HeaderActivity,
  RelationshipOverviewCard,
  sidebarTypeForActivityLink,
} from './CharacterSidebarPanels';
import {
  EMPTY_INTERACTIONS,
  RoleStars,
  buildHeaderAgeTooltip,
  buildInteractionTooltip,
  compareInteractions,
  getHeaderAgeValue,
  getHonourDreadColor,
  getHonourDreadLabel,
  getOpinionIcon,
  getTemporaryStatModifierTotal,
  getTemporaryStatModifiers,
  interactionCategoryLabels,
  interactionCategoryOrder,
  isPatronageRelationship,
  knownRelationshipTypes,
  lowerRelationDisplay,
  modifierTooltipLines,
  modifierValueColor,
  roleIcons,
  socialRelationshipGroups,
  temporaryModifierTooltipLines,
  type CharacterSidebarTab,
} from './CharacterSidebarModel';
import SidebarTabBar from '../shared/SidebarTabBar';
import SidebarToolbar from '../shared/SidebarToolbar';
import { StatCellGrid, StatCell } from '../shared/StatCellGrid';
import {
  getStatColor,
  getComplianceState,
  getOpinionColor,
} from '../../../utils/colorFormatters';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { useFaction, usePerson, usePlayerFactionId } from '../../../data-source/index';
import { registerSidebar } from '../../../registry/index';
import '../shared/Sidebar.css';
import './CharacterSidebar.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface InitiatorModalSession {
  interaction: PersonInteractionView;
  targetPersonId: string;
  targetPersonName: string;
}

interface CharacterSidebarProps {
  character: Character;
  onClose: () => void;
  side?: 'left' | 'right';
  initiatorModalSession?: InitiatorModalSession | null;
  onOpenInitiatorModal?: (session: InitiatorModalSession) => void;
  onCloseInitiatorModal?: () => void;
}

const CHARACTER_HEADER_NAME_MIN_FONT_REM = 0.82;
const CHARACTER_HEADER_NAME_MAX_FONT_REM = 1.25;

function CharacterHeaderName({ name }: { name: string }) {
  const nameRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const element = nameRef.current;
    const row = element?.parentElement;
    if (!element || !row) return undefined;

    const fitName = () => {
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const minFontSize = CHARACTER_HEADER_NAME_MIN_FONT_REM * rootFontSize;
      const maxFontSize = CHARACTER_HEADER_NAME_MAX_FONT_REM * rootFontSize;
      element.style.fontSize = `${maxFontSize}px`;

      const availableWidth = element.clientWidth;
      const requiredWidth = element.scrollWidth;
      if (requiredWidth <= availableWidth + 0.5) return;

      const fittedFontSize = Math.max(minFontSize, maxFontSize * ((availableWidth - 1) / requiredWidth));
      element.style.fontSize = `${fittedFontSize}px`;
    };

    fitName();
    const observer = new ResizeObserver(fitName);
    observer.observe(row);

    let active = true;
    void document.fonts.ready.then(() => {
      if (active) fitName();
    });

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [name]);

  return <span ref={nameRef} className="char-header-name">{name}</span>;
}

const CharacterSidebar: React.FC<CharacterSidebarProps> = ({
  character,
  onClose,
  side = 'left',
  initiatorModalSession = null,
  onOpenInitiatorModal,
  onCloseInitiatorModal,
}) => {
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
  const [localInitiatorModal, setLocalInitiatorModal] = React.useState<InitiatorModalSession | null>(null);
  const [giftModalInteraction, setGiftModalInteraction] = React.useState<PersonInteractionView | null>(null);
  const lastDayRefreshRef = React.useRef<{ personId: string; gameDay: number } | null>(null);
  const fullDetailsPersonRef = React.useRef<string | null>(null);
  const initiatorModalInteraction = onOpenInitiatorModal
    ? (initiatorModalSession?.interaction ?? null)
    : (localInitiatorModal?.interaction ?? null);
  const initiatorModalTargetId = onOpenInitiatorModal
    ? (initiatorModalSession?.targetPersonId ?? character.id)
    : (localInitiatorModal?.targetPersonId ?? character.id);
  const initiatorModalTargetName = onOpenInitiatorModal
    ? (initiatorModalSession?.targetPersonName ?? character.name)
    : (localInitiatorModal?.targetPersonName ?? character.name);
  const openInitiatorModal = React.useCallback((session: InitiatorModalSession) => {
    if (onOpenInitiatorModal) {
      onOpenInitiatorModal(session);
      return;
    }
    setLocalInitiatorModal(session);
  }, [onOpenInitiatorModal]);
  const closeInitiatorModal = React.useCallback(() => {
    if (onCloseInitiatorModal) {
      onCloseInitiatorModal();
      return;
    }
    setLocalInitiatorModal(null);
  }, [onCloseInitiatorModal]);

  React.useEffect(() => {
    if (activeTab === 'general' || fullDetailsPersonRef.current === character.id) return;

    fullDetailsPersonRef.current = character.id;
    bridgeCall('game.get_person_data', { personId: character.id, scope: 'full' })
      .then(dispatchPersonData)
      .catch((error) => {
        fullDetailsPersonRef.current = null;
        acknowledgeBridgeFailure(error);
      });
  }, [activeTab, character.id]);

  React.useEffect(() => {
    if (!character.id || gameDay <= 0 || activeTab !== 'general') return;

    const previous = lastDayRefreshRef.current;
    lastDayRefreshRef.current = { personId: character.id, gameDay };

    if (!previous || previous.personId !== character.id || previous.gameDay === gameDay) return;

    bridgeCall('game.get_person_data', { personId: character.id, scope: 'summary' })
      .then(dispatchPersonData)
      .catch(acknowledgeBridgeFailure);
  }, [activeTab, character.id, gameDay]);

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
  const honourDreadTooltipLines: TooltipLine[] = [
    {
      label: hdLabel,
      value: formatSignedNumber(hdVal, { maximumFractionDigits: 2 }),
      valueColor: hdColor,
    },
  ];
  const honourDreadBreakdownLines = (character.honourDreadBreakdown ?? []).map(entry => ({
    label: entry.label,
    value: formatSignedNumber(entry.value, { maximumFractionDigits: 2 }),
    valueColor: modifierValueColor(entry.value),
  }));
  if (honourDreadBreakdownLines.length > 0) {
    honourDreadTooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1199.39'), isHeader: true });
    honourDreadTooltipLines.push(...honourDreadBreakdownLines);
  }

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
    closeInitiatorModal();
    setGiftModalInteraction(null);
  }, [closeInitiatorModal]);

  React.useEffect(() => {
    // Gift choices belong to the open character; initiator selection is kept
    // alive while browsing candidates so View does not cancel the proposal.
    setGiftModalInteraction(null);
    if (!onOpenInitiatorModal) {
      setLocalInitiatorModal(current => (
        current && current.targetPersonId !== character.id ? null : current
      ));
    }
  }, [character.id, onOpenInitiatorModal]);

  const isInteractionModalOpen = Boolean(initiatorModalInteraction) || giftModalInteraction !== null;
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
      get description() { return message || webUIText("CharacterSidebar.TheActionCould"); },
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
      openInitiatorModal({
        interaction: loaded,
        targetPersonId: character.id,
        targetPersonName: character.name,
      });
      return;
    }

    if (interaction.needsGiftSelection) {
      const loaded = await loadInteractionOptions(interaction.id);
      if (!loaded || loaded.availability !== 'available' || loaded.giftOptions.length === 0) {
        notifyInteractionFailure(loaded?.reasons[0]?.reason);
        return;
      }

      closeInitiatorModal();
      setGiftModalInteraction(loaded);
      return;
    }

    await startSimpleInteraction(interaction.id);
  }, [
    character.id,
    character.name,
    closeInitiatorModal,
    loadInteractionOptions,
    notifyInteractionFailure,
    openInitiatorModal,
    startSimpleInteraction,
  ]);

  const handleInitiatorConfirm = React.useCallback(async (candidateId: string) => {
    if (!initiatorModalInteraction) {
      return webUIText('CharacterSidebar.ActionUnavailable');
    }

    // Confirm against the original marriage/interaction target, not whichever
    // candidate character is currently open in the sidebar after View.
    let response: StartPersonInteractionResponse | null = null;
    if (initiatorModalTargetId === character.id) {
      response = await startInteraction(initiatorModalInteraction.id, { initiatorPersonId: candidateId });
    } else {
      try {
        response = await bridgeCall('game.start_person_interaction', {
          personId: initiatorModalTargetId,
          interactionId: initiatorModalInteraction.id,
          initiatorPersonId: candidateId,
          giftTypeIndex: -1,
        });
      } catch (error) {
        acknowledgeBridgeFailure(error);
        response = null;
      }
    }

    if (!response) {
      return webUIText('CharacterSidebar.ActionStartFailed');
    }

    if (!response.started) {
      return response.message || webUIText('CharacterSidebar.ActionStartFailed');
    }

    return null;
  }, [character.id, initiatorModalInteraction, initiatorModalTargetId, startInteraction]);

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

  const factionName = character.faction;
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
          { icon: isPinned ? '/assets/icons/I_Pin_Pinned.png' : '/assets/icons/I_Pin_Unpinned.png', get tooltip() { return isPinned ? webUIText("CharacterSidebar.UnpinCharacter") : webUIText("CharacterSidebar.PinCharacter"); }, get tooltipBody() { return isPinned ? webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1029.1') : webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1029.2'); }, onClick: () => togglePin('character', character.id), isActive: isPinned },
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
          <Portrait ref={headerBackdropPortraitRef} personId={character.id} className="char-header-selected-backdrop" name={character.name} src={character.portrait} layers={character.portraitLayers} isAlive={isAlive} isImprisoned={isImprisoned} size="hero" shape="rect" showBorder={false} />
          {spouseRel && (
            <div className="char-header-spouse-wrap">
              <PersonTooltip character={spouse ?? undefined} characterId={spouse ? undefined : spouseId} position="left" delay={200}>
                <div className="char-header-spouse">
                  <Portrait
                    ref={headerSpousePortraitRef}
                    personId={spouse?.id ?? spouseId ?? undefined}
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
          <Portrait ref={headerForegroundPortraitRef} personId={character.id} className="char-header-selected-foreground" name={character.name} src={character.portrait} layers={character.portraitLayers} isAlive={isAlive} isImprisoned={isImprisoned} size="hero" shape="rect" showBorder={false} />
        </div>
        {/* Dead icon overlay */}
        {!isAlive && (
          <Tooltip content={{
            title: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1059.31'),
            get body() { return character.deathCause && character.deathDate ? webUIText("CharacterSidebar.DiedOfCauseOnDate", { DeathCause: character.deathCause, DeathDate: character.deathDate }) : character.deathCause ? webUIText("CharacterSidebar.DiedOf", { DeathCause: character.deathCause }) : webUIText("CharacterSidebar.ThisCharacterIs"); },
          }} position="bottom" delay={200}>
            <div className="char-header-dead-overlay">
              <img src="/assets/icons/I_Dread.png" alt="" className="char-header-dead-icon" />
            </div>
          </Tooltip>
        )}
        {character.factionId && (
          <div className="char-header-roundel">
            <FactionTooltip factionId={character.factionId} factionName={factionName} position="right" delay={200}>
              <FactionRoundel
                factionId={character.factionId}
                colour={character.factionColour}
                secondaryColour={character.factionSecondaryColour}
                emblem={character.factionEmblem}
                cultureGroup={character.factionCultureGroup}
                name={factionName}
                size="lg"
                showRing
                resolveFaction={false}
                onClick={() => openSidebar('diplomacy', character.factionId!)}
              />
            </FactionTooltip>
          </div>
        )}
        <div className="char-header-scrim">
          <div className="char-header-name-row">
            <div className="char-header-main-name">
              {character.shortTitle && <span className="char-header-title-prefix">{character.shortTitle}</span>}
              <CharacterHeaderName name={character.name} />
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
          <CultureTooltip info={character.cultureInfo} fallbackName={character.culture} fallbackId={character.cultureInfo?.id}>
            <div className="char-identity-row">
              <img src={cultureIconPath(character.cultureInfo?.id)} alt="" className="char-identity-icon" />
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
            const footer = trait.isTemporary && trait.remainingDays !== undefined ? webUIText("CharacterSidebar.ExpiresIn", { RemainingDays: trait.remainingDays, Value2: trait.remainingDays === 1 ? webUIText("Common.Day") : webUIText("Common.Days") }) : undefined;
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
            tooltipLines.push({ label: webUIText('CharacterStats.CurrentEffects'), isHeader: true });
            tooltipLines.push(...characterStatEffectLines(stat.key, stat.value));
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
        <Tooltip content={{
          title: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1242.42'),
          body: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1242.43'),
          lines: honourDreadTooltipLines,
        }} position="bottom" delay={200}>
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
              {character.governedRegions.map((region) => (
                <CharacterDutyRow
                  key={region.id}
                  icon="/assets/icons/I_Region.png"
                  label={webUIText('CharacterSidebar.RegionLabel')}
                  value={region.name}
                  tooltip={{
                    title: region.name,
                    get body() { return webUIText('CharacterSidebar.GovernedRegionTooltip'); },
                    footer: webUIText('CharacterSidebar.ZoomToGovernedRegion'),
                  }}
                  onOpen={() => zoomToBridge('settlement', region.focusSettlementId)}
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
                      { label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1314.56'), get value() { return isSatisfied ? webUIText("CharacterSidebar.Satisfied") : webUIText("CharacterSidebar.Shortage"); }, valueColor: isSatisfied ? 'var(--green)' : 'var(--red)' },
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
                          tutorialTarget={`Interaction:${interaction.id}${interaction.id === 'offergift' ? ' OfferGiftButton' : ''}${interaction.id === 'proposemarriage' ? ' ProposeMarriageButton' : ''}${interaction.id === 'poachclient' ? ' PoachClientButton' : ''}`}
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

      {!onOpenInitiatorModal && initiatorModalInteraction && (
        <PersonInteractionInitiatorModal
          key={`${initiatorModalTargetId}:${initiatorModalInteraction.id}`}
          interaction={initiatorModalInteraction}
          targetPersonId={initiatorModalTargetId}
          targetPersonName={initiatorModalTargetName}
          onClose={closeInitiatorModal}
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
  const [initiatorModalSession, setInitiatorModalSession] = React.useState<InitiatorModalSession | null>(null);
  const targetPersonForConfirm = usePerson(initiatorModalSession?.targetPersonId ?? null);

  const handleInitiatorConfirm = React.useCallback(async (candidateId: string) => {
    if (!initiatorModalSession) {
      return webUIText('CharacterSidebar.ActionUnavailable');
    }

    try {
      const response = await bridgeCall('game.start_person_interaction', {
        personId: initiatorModalSession.targetPersonId,
        interactionId: initiatorModalSession.interaction.id,
        initiatorPersonId: candidateId,
        giftTypeIndex: -1,
      });
      if (!response.started) {
        return response.message || webUIText('CharacterSidebar.ActionStartFailed');
      }
      if (targetPersonForConfirm) {
        dispatchPersonData(await bridgeCall('game.get_person_data', {
          personId: initiatorModalSession.targetPersonId,
          scope: 'summary',
        }));
      }
      return null;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return webUIText('CharacterSidebar.ActionStartFailed');
    }
  }, [initiatorModalSession, targetPersonForConfirm]);

  return (
    <>
      {character && (
        <CharacterSidebar
          character={character}
          onClose={onClose}
          side="right"
          initiatorModalSession={initiatorModalSession}
          onOpenInitiatorModal={setInitiatorModalSession}
          onCloseInitiatorModal={() => setInitiatorModalSession(null)}
        />
      )}
      {initiatorModalSession && (
        <PersonInteractionInitiatorModal
          key={`${initiatorModalSession.targetPersonId}:${initiatorModalSession.interaction.id}`}
          interaction={initiatorModalSession.interaction}
          targetPersonId={initiatorModalSession.targetPersonId}
          targetPersonName={initiatorModalSession.targetPersonName}
          onClose={() => setInitiatorModalSession(null)}
          onConfirm={handleInitiatorConfirm}
        />
      )}
    </>
  );
}

registerSidebar({
  id: 'character',
  side: 'right',
  component: CharacterSidebarSlot,
  advisorTopic: 'characterSidebar',
});

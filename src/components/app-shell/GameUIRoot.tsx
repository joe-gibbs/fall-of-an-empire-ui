import { PortraitReadinessContext } from '../common/portraits/portraitReadiness';
import { Suspense } from 'react';
import { Profiler, useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import TopBar from '../topbar/TopBar';
import BottomBar from '../bottombar/BottomBar';
import AdvisorPanel from '../hud/panels/AdvisorPanel';
import TutorialProgress from '../hud/tutorial/TutorialProgress';
import TutorialSpotlightOverlay from '../hud/overlays/TutorialSpotlightOverlay';
import PinnedItemsBar from '../hud/panels/PinnedItemsBar';
import WorldSearchBar from '../hud/panels/WorldSearchBar';
import WorldGlanceOverlay from '../hud/overlays/WorldGlanceOverlay';
import { isWorldGlanceTutorialTarget } from '../hud/overlays/worldGlanceTutorialTarget';
import ProvinceTooltipOverlay from '../hud/overlays/ProvinceTooltipOverlay';
import ResourceFlowTooltipOverlay from '../hud/overlays/ResourceFlowTooltipOverlay';
import DragSelectionMarquee from '../hud/overlays/DragSelectionMarquee';
import AchievementUnlockToast from '../hud/overlays/AchievementUnlockToast';
import BuildQueueCompletionToast from '../topbar/BuildQueueCompletionToast';
import VictoryScreen from '../screens/campaign/VictoryScreen';
import GameOverScreen, { type GameOverCause } from '../screens/campaign/GameOverScreen';
import type { CampaignOutcomeSummary } from '../screens/campaign/CampaignOutcomeData';
import PauseMenu from '../screens/system/PauseMenu';
import LoadGameModal from '../screens/system/LoadGameModal';
import AgentSelectModal from '../modals/characters/AgentSelectModal';
import CourtierPromotionModal from '../modals/characters/CourtierPromotionModal';
import AllyCallDialogModal from '../modals/diplomacy/AllyCallDialogModal';
import PromptSettlementNameModal from '../modals/settlements/PromptSettlementNameModal';
import ConfirmDialog from '../common/forms/ConfirmDialog';
import ProvinceEmperorTakeoverModal from '../modals/provinces/ProvinceEmperorTakeoverModal';
import WarningBar from '../notifications/WarningBar';
import NotificationStack from '../notifications/NotificationStack';
import type { AdvisorTopicId } from '../../data/advisorTopics';
import { ensureLoaded as preloadSounds } from '../../hooks/useSound';
import { useBridgeSidebarEvents } from '../../bridge/core/useBridgeSidebarEvents';
import { useEventBridge } from '../../bridge/app/useEventBridge';
import { useTutorialProgressBridge } from '../../bridge/app/useTutorialProgressBridge';
import { useTutorialSpotlightBridge } from '../../bridge/app/useTutorialSpotlightBridge';
import { usePinnedItemsBridge } from '../../bridge/app/usePinnedItemsBridge';
import { useCourtierPromotionBridge } from '../../bridge/characters/useCourtierPromotionBridge';
import { useAllyCallDialogBridge } from '../../bridge/diplomacy/useAllyCallDialogBridge';
import { usePromptSettlementNameBridge } from '../../bridge/settlements-economy/usePromptSettlementNameBridge';
import { useMilitaryMergeConfirmBridge } from '../../bridge/military-map/useMilitaryMergeConfirmBridge';
import { useFactionBorderHighlightBridge } from '../../bridge/diplomacy/useFactionBorderHighlightBridge';
import {
  refreshProvinceEmperorTakeover,
  useProvinceEmperorTakeoverBridge,
} from '../../bridge/provinces/useProvinceEmperorTakeoverBridge';
import { useProvinceRecallBridge } from '../../bridge/provinces/useProvinceRecallBridge';
import { useEscapeFallback, useEscapeStackEntry } from '../../context/EscapeStack';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { GAMEPLAY_CONTEXT_RESET_EVENT } from '../../bridge/core/gameplayCacheReset';
import { getScreen, getScreenOpenedByTopbar, getSidebar, isProvinceSubjectMode } from '../../registry/index';
import { useEntityLinkClick } from '../../hooks/useEntityLinkClick';
import { useObserverMode, usePlayerFactionSummary } from '../../data-source/index';
import { bridgeEvents } from '../../bridge/core/bridgeEvents';
import { beginUIPerfInteraction, recordUIPerfReactRender } from '../../perf/uiPerfProfiler';
import { personalGuardRevealScreenId, TUTORIAL_REVEAL_PERSONAL_GUARD, type TutorialHudRevealDetail } from '../../utils/tutorialHudReveal';
import AnimatedSlot from './AnimatedSlot';
import EventPopupSlot from './EventPopupSlot';

type CampaignOutcome =
  | { kind: 'victory'; key: number; summary: CampaignOutcomeSummary | undefined }
  | { kind: 'gameOver'; key: number; cause: GameOverCause; summary: CampaignOutcomeSummary | undefined };

/** Full-screen layers that block the campaign. Only one can be open at a time. */
type BlockingOverlay =
  | { kind: 'none' }
  | { kind: 'pause' }
  | { kind: 'outcome'; outcome: CampaignOutcome; loadingSave: boolean };

const NO_OVERLAY: BlockingOverlay = { kind: 'none' };
const PAUSE_OVERLAY: BlockingOverlay = { kind: 'pause' };
let nextOutcomeKey = 0;

export default function GameUIRoot() {
  const {
    leftSidebar: leftPane, rightSidebar: rightPane, activeScreen: screenPane,
    advisorHint, advisorStep, advisorVisible,
    warnings, notifications,
    gameDay,
    agentSelect,
    closeLeftSidebar, closeRightSidebar, closeSidebarFromBridge, closeSidebarEntityFromBridge, closeScreen,
    dismissWarning, dismissNotification,
    toggleScreen, openSidebar, openScreen, openScreenFromBridge, closeScreenFromBridge,
    showAdvisor, dismissAdvisor, nextAdvisorPage, previousAdvisorPage,
    closeAgentSelect,
  } = useGame();
  const leftSidebar = leftPane?.type ?? null;
  const leftSidebarId = leftPane?.id ?? null;
  const rightSidebar = rightPane?.type ?? null;
  const rightSidebarId = rightPane?.id ?? null;
  const activeScreen = screenPane?.type ?? null;
  const activeScreenId = screenPane?.id ?? null;
  const playerFaction = usePlayerFactionSummary();
  const observerMode = useObserverMode();
  const subjectMode = isProvinceSubjectMode(playerFaction);

  // Bridge-received navigation uses local-only handlers to avoid echoing the
  // game event back through the bridge.
  useBridgeSidebarEvents(
    openSidebar,
    closeSidebarFromBridge,
    closeSidebarEntityFromBridge,
    openScreenFromBridge,
    closeScreenFromBridge,
    subjectMode,
  );
  useFactionBorderHighlightBridge(leftSidebar === 'diplomacy' ? leftSidebarId : null);

  const playerFactionId = playerFaction?.id ?? null;
  useEffect(() => {
    if (observerMode) {
      if (activeScreen && activeScreen !== 'encyclopedia') {
        closeScreen();
      }
      dismissAdvisor();
      return;
    }
    if (!playerFactionId) return;
    if (playerFaction?.usesWarbands && (activeScreen === 'internalPolitics' || activeScreen === 'internal-politics')) {
      openScreen('powerBlocs', 'governors');
    } else if (subjectMode && (activeScreen === 'faction-overview' || activeScreen === 'factionOverview')) {
      openScreen('governor-faction-overview', activeScreenId ?? undefined);
    } else if (!subjectMode && activeScreen === 'governor-faction-overview') {
      openScreen('factionOverview', activeScreenId ?? undefined);
    }
  }, [activeScreen, activeScreenId, closeScreen, dismissAdvisor, observerMode, openScreen, playerFaction?.usesWarbands, playerFactionId, subjectMode]);

  // Current LLM/tutorial event pushed from the game (null when nothing is active).
  const { event: bridgeEvent, chooseOption: bridgeChooseOption } = useEventBridge();
  const { event: provinceRecallEvent, chooseOption: chooseProvinceRecallOption } = useProvinceRecallBridge(subjectMode);
  const presentedEvent = observerMode ? null : (bridgeEvent ?? provinceRecallEvent);
  const choosePresentedEventOption = bridgeEvent ? bridgeChooseOption : chooseProvinceRecallOption;

  const tutorialProgress = useTutorialProgressBridge();
  const tutorialSpotlight = useTutorialSpotlightBridge();

  useEffect(() => {
    const handler = (event: Event) => {
      const tokens = (event as CustomEvent<TutorialHudRevealDetail>).detail?.tokens ?? [];
      if (tokens.length === 0) return;
      const screenId = personalGuardRevealScreenId(tokens);
      if (activeScreen === 'military' && (screenId === undefined || activeScreenId === screenId)) return;
      openScreenFromBridge('military', screenId);
    };
    window.addEventListener(TUTORIAL_REVEAL_PERSONAL_GUARD, handler);
    return () => window.removeEventListener(TUTORIAL_REVEAL_PERSONAL_GUARD, handler);
  }, [activeScreen, activeScreenId, openScreenFromBridge]);

  // Live pinned-items list from the game (settlements, characters, militaries, factions).
  const { items: pinnedItems, togglePin } = usePinnedItemsBridge();

  // Event body <link> tags (emitted by the game's LinkUtils) map to sidebars,
  // screens, and identity details such as culture and religion.
  const handleEventLinkClick = useEntityLinkClick();

  // Pre-load all UI sound effects on first user interaction
  useEffect(() => {
    const init = () => { preloadSounds(); document.removeEventListener('mousedown', init); };
    document.addEventListener('mousedown', init, { once: true });
    return () => document.removeEventListener('mousedown', init);
  }, []);

  const [overlay, setOverlay] = useState<BlockingOverlay>(NO_OVERLAY);
  const showPause = overlay.kind === 'pause';
  const campaignOutcome = overlay.kind === 'outcome' ? overlay.outcome : null;
  const showOutcomeLoad = overlay.kind === 'outcome' && overlay.loadingSave;
  const blockingOverlayOpen = overlay.kind !== 'none';
  const {
    state: courtierPromotion,
    close: closeCourtierPromotion,
    promote: promoteCourtier,
  } = useCourtierPromotionBridge();
  const {
    state: allyCallDialog,
    respond: respondToAllyCall,
  } = useAllyCallDialogBridge();
  const {
    state: settlementNamePrompt,
    close: closeSettlementNamePrompt,
    confirm: confirmSettlementNamePrompt,
  } = usePromptSettlementNameBridge();
  const militaryMergeConfirm = useMilitaryMergeConfirmBridge();
  const provinceEmperorTakeover = useProvinceEmperorTakeoverBridge(true);
  const [showPinned, setShowPinned] = useState(false);
  const [provinceEmperorTakeoverDismissed, setProvinceEmperorTakeoverDismissed] = useState(false);

  const closePinned = useCallback(() => setShowPinned(false), []);
  const closeProvinceEmperorTakeover = useCallback(() => setProvinceEmperorTakeoverDismissed(true), []);

  useEffect(() => {
    const handleReset = () => {
      setOverlay(NO_OVERLAY);
      setShowPinned(false);
      setProvinceEmperorTakeoverDismissed(false);
    };

    bridgeEvents.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
    return () => bridgeEvents.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
  }, []);

  useEffect(() => {
    bridgeCall('ui.escape_pressed').catch(acknowledgeBridgeFailure);
  }, [activeScreen]);

  useEscapeStackEntry({
    id: 'ui.left-sidebar',
    active: !!leftSidebar,
    orderKey: `left:${leftSidebar ?? ''}:${leftSidebarId ?? ''}`,
    onClose: closeLeftSidebar,
  });
  useEscapeStackEntry({
    id: 'ui.right-sidebar',
    active: !!rightSidebar,
    orderKey: `right:${rightSidebar ?? ''}:${rightSidebarId ?? ''}`,
    onClose: closeRightSidebar,
  });
  useEscapeStackEntry({
    id: 'ui.screen',
    active: !!activeScreen,
    orderKey: `screen:${activeScreen ?? ''}:${activeScreenId ?? ''}`,
    onClose: closeScreen,
    allowFromInput: true,
  });
  useEscapeStackEntry({
    id: 'ui.pinned-items',
    active: showPinned,
    onClose: closePinned,
  });
  const openPause = useCallback(() => {
    if (overlay.kind !== 'none') return;
    beginUIPerfInteraction('screen:pause-menu');
    setOverlay(PAUSE_OVERLAY);
  }, [overlay.kind]);
  const closePause = useCallback(() => {
    setOverlay(current => (current.kind === 'pause' ? NO_OVERLAY : current));
  }, []);

  // Escape with nothing else open opens the pause menu. While a campaign outcome
  // is showing, Escape does nothing here.
  const pauseFromEscape = useCallback(() => {
    openPause();
    return true;
  }, [openPause]);
  useEscapeFallback(0, pauseFromEscape);

  // ESC menu must keep the campaign paused for as long as it is open.
  useEffect(() => {
    bridgeCall('game.set_pause_menu_open', { open: showPause }).catch(acknowledgeBridgeFailure);
    if (!showPause) return undefined;
    return () => {
      bridgeCall('game.set_pause_menu_open', { open: false }).catch(acknowledgeBridgeFailure);
    };
  }, [showPause]);

  useEffect(() => {
    bridgeEvents.addEventListener('ui.gamepad_menu', openPause);
    return () => bridgeEvents.removeEventListener('ui.gamepad_menu', openPause);
  }, [openPause]);

  useEffect(() => {
    const handler = () => {
      beginUIPerfInteraction('modal:province-emperor-takeover');
      setProvinceEmperorTakeoverDismissed(false);
      void refreshProvinceEmperorTakeover().catch(acknowledgeBridgeFailure);
    };
    bridgeEvents.addEventListener('ui.open_province_emperor_takeover_picker', handler);
    return () => bridgeEvents.removeEventListener('ui.open_province_emperor_takeover_picker', handler);
  }, []);

  const handleCampaignOutcomeContinue = useCallback(() => {
    bridgeCall('game.dismiss_campaign_outcome').catch(acknowledgeBridgeFailure);
  }, []);

  const handleCampaignOutcomeMainMenu = useCallback(() => {
    bridgeCall('game.return_to_main_menu').catch(acknowledgeBridgeFailure);
  }, []);

  const handleCampaignOutcomeLoadSave = useCallback(() => {
    setOverlay(current => (current.kind === 'outcome' ? { ...current, loadingSave: true } : current));
  }, []);
  const closeCampaignOutcomeLoad = useCallback(() => {
    setOverlay(current => (current.kind === 'outcome' && current.loadingSave ? { ...current, loadingSave: false } : current));
  }, []);
  const closeCampaignOutcome = useCallback((outcome: CampaignOutcome) => {
    setOverlay(current => (current.kind === 'outcome' && current.outcome === outcome ? NO_OVERLAY : current));
  }, []);

  const handlePurchaseFullGame = useCallback(() => {
    bridgeCall('ui.open_external_link', { linkId: 'full_game' }).catch(acknowledgeBridgeFailure);
  }, []);

  useEffect(() => {
    const victoryHandler = (event: Event) => {
      beginUIPerfInteraction('screen:victory');
      const data = (event as CustomEvent).detail as CampaignOutcomeSummary | undefined;
      nextOutcomeKey += 1;
      setOverlay({
        kind: 'outcome',
        outcome: { kind: 'victory', key: nextOutcomeKey, summary: data && typeof data === 'object' ? data : undefined },
        loadingSave: false,
      });
    };
    const gameOverHandler = (event: Event) => {
      beginUIPerfInteraction('screen:game-over');
      const data = (event as CustomEvent).detail as CampaignOutcomeSummary & { cause?: string } | undefined;
      const cause = data?.cause;
      nextOutcomeKey += 1;
      setOverlay({
        kind: 'outcome',
        outcome: {
          kind: 'gameOver',
          key: nextOutcomeKey,
          cause: cause === 'extinction' || cause === 'conquest' || cause === 'subjugation' || cause === 'rebellion' || cause === 'governorship' || cause === 'failed_rebellion' || cause === 'succession' || cause === 'demo_expired'
            ? cause
            : 'rebellion',
          summary: data && typeof data === 'object' ? data : undefined,
        },
        loadingSave: false,
      });
    };

    bridgeEvents.addEventListener('ui.show_victory_screen', victoryHandler);
    bridgeEvents.addEventListener('ui.show_game_over_screen', gameOverHandler);
    return () => {
      bridgeEvents.removeEventListener('ui.show_victory_screen', victoryHandler);
      bridgeEvents.removeEventListener('ui.show_game_over_screen', gameOverHandler);
    };
  }, []);

  // Registry lookups for active screen/sidebars. These are plain reads, not
  // hooks - the registry is populated synchronously at module load time (see
  // registry/builtins.tsx, imported from main.tsx).
  const leftSidebarReg = getSidebar(leftSidebar);
  const rightSidebarReg = getSidebar(rightSidebar);
  const activeScreenReg = getScreen(activeScreen);

  const handleScreenChange = useCallback((topbarId: string) => {
    const target = getScreenOpenedByTopbar(topbarId, subjectMode);
    if (target) toggleScreen(target.id);
  }, [subjectMode, toggleScreen]);

  const togglePinned = useCallback(() => setShowPinned(v => {
    const next = !v;
    if (next) beginUIPerfInteraction('dropdown:pinned-items');
    return next;
  }), []);

  const activeScreenButtonId: string | null = activeScreenReg?.topbarId ?? null;

  // Keep the current hint while an event is open, then resume its normal placement.
  let autoAdvisorTopic: AdvisorTopicId | null = null;
  if (activeScreenReg?.advisorTopic) {
    autoAdvisorTopic = typeof activeScreenReg.advisorTopic === 'function'
      ? activeScreenReg.advisorTopic(playerFaction)
      : activeScreenReg.advisorTopic;
  }
  else if (rightSidebarReg) autoAdvisorTopic = rightSidebarReg.advisorTopic ?? null;
  else if (leftSidebarReg) autoAdvisorTopic = leftSidebarReg.advisorTopic ?? null;

  // Only re-request a hint when the topic actually changes. Repeated show calls
  // push fresh hint events and re-render the whole HUD every time.
  const lastAdvisorTopicRef = useRef<AdvisorTopicId | null | undefined>(undefined);
  useEffect(() => {
    if (presentedEvent) return;
    if (observerMode || blockingOverlayOpen) {
      lastAdvisorTopicRef.current = undefined;
      return;
    }
    if (lastAdvisorTopicRef.current === autoAdvisorTopic) return;
    lastAdvisorTopicRef.current = autoAdvisorTopic;
    if (autoAdvisorTopic) showAdvisor(autoAdvisorTopic);
    else dismissAdvisor();
  }, [presentedEvent, observerMode, blockingOverlayOpen, autoAdvisorTopic, showAdvisor, dismissAdvisor]);

  const advisorPlacement = activeScreen
    ? 'center'
    : leftSidebar
      ? 'shifted'
      : 'left';
  const provinceEmperorTakeoverOpen = !!provinceEmperorTakeover?.active && !provinceEmperorTakeoverDismissed;

  const LeftSidebarComponent = leftSidebarReg?.component;
  const RightSidebarComponent = rightSidebarReg?.component;

  // AnimatedSlot freezes this class while the closing animation plays.
  const overlayVariant = activeScreenReg?.overlayVariant;
  const screenOverlayClass = overlayVariant
    ? `screen-overlay screen-overlay--${overlayVariant}`
    : 'screen-overlay';
  const mapAnchorsObscured = Boolean(
    activeScreen
    || blockingOverlayOpen
    || !!presentedEvent
    || agentSelect.open
    || courtierPromotion.open
    || allyCallDialog.open
    || settlementNamePrompt.open
    || (provinceEmperorTakeoverOpen && !!provinceEmperorTakeover?.active),
  );
  const tutorialWorldGlanceTarget = tutorialSpotlight.spotlight.isVisible
    && isWorldGlanceTutorialTarget(tutorialSpotlight.spotlight.target)
    ? tutorialSpotlight.spotlight.target
    : '';
  const mapGlancesObscured = Boolean(
    blockingOverlayOpen
    || !!presentedEvent
    || agentSelect.open
    || courtierPromotion.open
    || allyCallDialog.open
    || settlementNamePrompt.open
    || (provinceEmperorTakeoverOpen && !!provinceEmperorTakeover?.active),
  );

  return (
    <div className={`game-container${observerMode ? ' game-container--observer' : ''}`} data-webkiln-world-input>
      {!observerMode && <AchievementUnlockToast />}
      <TopBar
        onScreenChange={handleScreenChange}
        activeScreen={activeScreenButtonId}
        onOpenBureaucracyOverview={() => openScreen('factionOverview')}
        onPinnedToggle={togglePinned}
        isPinnedOpen={showPinned}
        pinnedCount={pinnedItems.length}
      />
      {!observerMode && (
        <BuildQueueCompletionToast
          notifications={notifications}
          onDismiss={dismissNotification}
          currentGameDay={gameDay}
          onLinkClick={handleEventLinkClick}
        />
      )}

      <div className={`game-main${activeScreen ? ' game-main--screen-open' : ''}${leftSidebar ? ' game-main--left-sidebar-open' : ''}`} data-webkiln-world-input>
        {!observerMode && warnings.length > 0 && (
          <div className="hud-attention-strip">
            <WarningBar warnings={warnings} onDismiss={dismissWarning} />
          </div>
        )}

        {!observerMode && (
          <NotificationStack
            notifications={notifications}
            onDismiss={dismissNotification}
            currentGameDay={gameDay}
            onLinkClick={handleEventLinkClick}
            anchorsEnabled={!mapAnchorsObscured}
          />
        )}

        <BottomBar rightSidebarOpen={!!rightSidebar} />
        <WorldGlanceOverlay
          visible={!mapGlancesObscured}
          tutorialTarget={tutorialWorldGlanceTarget}
        />
        <ResourceFlowTooltipOverlay />
        <ProvinceTooltipOverlay />
        <DragSelectionMarquee enabled={!mapAnchorsObscured} />

        {/* Left sidebar - registry-driven (settlement / military / diplomacy / mod). */}
        <Profiler id={`sidebar:left:${leftSidebar ?? 'closed'}`} onRender={recordUIPerfReactRender}>
          <AnimatedSlot active={!!leftSidebar} className={`sidebar-left${activeScreen === 'ledger' ? ' sidebar-left--above-screen' : ''}`}>
            {LeftSidebarComponent ? <LeftSidebarComponent sidebarId={leftSidebarId} onClose={closeLeftSidebar} /> : null}
          </AnimatedSlot>
        </Profiler>

        {/* Right sidebar - registry-driven (character / powerbloc / template / mod). */}
        <Profiler id={`sidebar:right:${rightSidebar ?? 'closed'}`} onRender={recordUIPerfReactRender}>
          <AnimatedSlot active={!!rightSidebar} className="sidebar-right">
            {RightSidebarComponent ? <RightSidebarComponent sidebarId={rightSidebarId} onClose={closeRightSidebar} /> : null}
          </AnimatedSlot>
        </Profiler>

        {/* Screen overlay - registry-driven. */}
        <Profiler id={`screen:${activeScreen ?? 'closed'}`} onRender={recordUIPerfReactRender}>
          <AnimatedSlot active={!!activeScreen} className={screenOverlayClass} passesWorldInput>
            <Suspense fallback={null}>
              {/* Tree navigation commits its whole portrait graph. Scrolling lists prepare portraits locally. */}
              <PortraitReadinessContext.Provider value={activeScreen === 'familyTree'}>
                {activeScreenReg ? activeScreenReg.render({ screenId: activeScreenId, onClose: closeScreen }) : null}
              </PortraitReadinessContext.Provider>
            </Suspense>
          </AnimatedSlot>
        </Profiler>
      </div>

      {!observerMode && (
        <TutorialProgress
          progress={tutorialProgress}
          placement={leftSidebar ? 'shifted' : 'left'}
          screenOpen={!!activeScreen}
          warningCount={observerMode ? 0 : warnings.length}
          onLinkClick={handleEventLinkClick}
        />
      )}
      <Profiler id="dropdown:pinned-items" onRender={recordUIPerfReactRender}>
        <PinnedItemsBar
          isOpen={showPinned}
          onClose={() => setShowPinned(false)}
          items={pinnedItems.map(i => ({
            id: i.itemId,
            type: i.itemType,
            name: i.name,
            detail: i.detail || undefined,
          }))}
          onItemClick={(item) => {
            if (item.type === 'settlement') openSidebar('settlement', item.id);
            else if (item.type === 'character') openSidebar('character', item.id);
            else if (item.type === 'military') openSidebar('military', item.id);
            else if (item.type === 'faction') openSidebar('diplomacy', item.id);
          }}
          onUnpin={(item) => togglePin(item.type, item.id)}
          onUnpinAll={(type) => {
            pinnedItems.filter(i => i.itemType === type).forEach(i => togglePin(i.itemType, i.itemId));
          }}
        />
      </Profiler>
      <Profiler id="overlay:world-search" onRender={recordUIPerfReactRender}>
        <WorldSearchBar />
      </Profiler>
      {!observerMode && !presentedEvent && (
        <AdvisorPanel
          hint={advisorHint}
          step={advisorStep}
          visible={advisorVisible && !blockingOverlayOpen}
          placement={advisorPlacement}
          onPrevious={previousAdvisorPage}
          onNext={nextAdvisorPage}
          onDismiss={dismissAdvisor}
        />
      )}
      {!observerMode && (
        <Profiler id="modal:event-popup" onRender={recordUIPerfReactRender}>
          <EventPopupSlot
            event={presentedEvent}
            onOptionSelect={choosePresentedEventOption}
            onLinkClick={handleEventLinkClick}
          />
        </Profiler>
      )}
      {!observerMode && (
        <TutorialSpotlightOverlay
          spotlight={tutorialSpotlight.spotlight}
          onResolve={tutorialSpotlight.resolve}
          onDismiss={tutorialSpotlight.dismiss}
          onNavigate={tutorialSpotlight.navigate}
          onLinkClick={handleEventLinkClick}
        />
      )}

      <Profiler id="screen:pause-menu" onRender={recordUIPerfReactRender}>
        <PauseMenu visible={showPause} onClosed={closePause} />
      </Profiler>
      {campaignOutcome?.kind === 'victory' && (
        <VictoryScreen
          key={campaignOutcome.key}
          summary={campaignOutcome.summary}
          onClose={() => closeCampaignOutcome(campaignOutcome)}
          onContinuePlaying={handleCampaignOutcomeContinue}
          onMainMenu={handleCampaignOutcomeMainMenu}
        />
      )}
      {campaignOutcome?.kind === 'gameOver' && (
        <GameOverScreen
          key={campaignOutcome.key}
          cause={campaignOutcome.cause}
          summary={campaignOutcome.summary}
          onClose={() => closeCampaignOutcome(campaignOutcome)}
          onLoadSave={handleCampaignOutcomeLoadSave}
          onMainMenu={handleCampaignOutcomeMainMenu}
          onPurchaseFullGame={handlePurchaseFullGame}
        />
      )}
      <LoadGameModal
        visible={showOutcomeLoad}
        onClosed={closeCampaignOutcomeLoad}
      />
      {!observerMode && (
        <AgentSelectModal
          key={`agent-select:${agentSelect.targetFactionId ?? ''}:${agentSelect.role ?? ''}`}
          open={agentSelect.open}
          targetFactionId={agentSelect.targetFactionId}
          role={agentSelect.role}
          onClose={closeAgentSelect}
        />
      )}
      {!observerMode && (
        <CourtierPromotionModal
          open={courtierPromotion.open}
          onClose={closeCourtierPromotion}
          settlementName={courtierPromotion.settlementName}
          playerGold={courtierPromotion.playerGold}
          promotionCost={courtierPromotion.promotionCost}
          types={courtierPromotion.types}
          onPromote={promoteCourtier}
        />
      )}
      {!observerMode && (
        <AllyCallDialogModal
          state={allyCallDialog}
          onRespond={respondToAllyCall}
        />
      )}
      {!observerMode && (
        <PromptSettlementNameModal
          key={`settlement-name:${settlementNamePrompt.settlementId}:${settlementNamePrompt.suggestedName}`}
          open={settlementNamePrompt.open}
          suggestedName={settlementNamePrompt.suggestedName}
          onConfirm={confirmSettlementNamePrompt}
          onClose={closeSettlementNamePrompt}
        />
      )}
      {!observerMode && (
        <ConfirmDialog
          visible={militaryMergeConfirm.visible}
          title={militaryMergeConfirm.title}
          message={militaryMergeConfirm.message}
          confirmText={militaryMergeConfirm.confirmText}
          onConfirm={militaryMergeConfirm.confirm}
          onClosed={militaryMergeConfirm.cancel}
        />
      )}
      {!observerMode && (
        <ProvinceEmperorTakeoverModal
          open={provinceEmperorTakeoverOpen}
          takeover={provinceEmperorTakeover}
          onClose={closeProvinceEmperorTakeover}
        />
      )}
    </div>
  );
}

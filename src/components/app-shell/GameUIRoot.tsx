import { Profiler, useEffect, useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import TopBar from '../topbar/TopBar';
import BottomBar from '../bottombar/BottomBar';
import AdvisorPanel from '../hud/panels/AdvisorPanel';
import TutorialProgress from '../hud/tutorial/TutorialProgress';
import TutorialSpotlightOverlay from '../hud/overlays/TutorialSpotlightOverlay';
import PinnedItemsBar from '../hud/panels/PinnedItemsBar';
import VictoryConditionsDropdown from '../hud/panels/VictoryConditionsDropdown';
import WorldGlanceOverlay, { isWorldGlanceTutorialTarget } from '../hud/overlays/WorldGlanceOverlay';
import ProvinceTooltipOverlay from '../hud/overlays/ProvinceTooltipOverlay';
import DragSelectionMarquee from '../hud/overlays/DragSelectionMarquee';
import AchievementUnlockToast from '../hud/overlays/AchievementUnlockToast';
import VictoryScreen from '../screens/campaign/VictoryScreen';
import GameOverScreen, { type GameOverCause } from '../screens/campaign/GameOverScreen';
import type { CampaignOutcomeSummary } from '../screens/campaign/CampaignOutcomeData';
import PauseMenu from '../screens/system/PauseMenu';
import LoadGameModal from '../screens/system/LoadGameModal';
import AgentSelectModal from '../modals/characters/AgentSelectModal';
import CourtierPromotionModal from '../modals/characters/CourtierPromotionModal';
import AllyCallDialogModal from '../modals/diplomacy/AllyCallDialogModal';
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
import { useFactionBorderHighlightBridge } from '../../bridge/diplomacy/useFactionBorderHighlightBridge';
import {
  refreshProvinceEmperorTakeover,
  useProvinceEmperorTakeoverBridge,
} from '../../bridge/provinces/useProvinceEmperorTakeoverBridge';
import { useProvinceRecallBridge } from '../../bridge/provinces/useProvinceRecallBridge';
import { isEscapeTextEntryTarget, useEscapeStack, useEscapeStackEntry } from '../../context/EscapeStack';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { GAMEPLAY_CONTEXT_RESET_EVENT } from '../../bridge/core/gameplayCacheReset';
import { getScreen, getScreenByBridgeName, getScreenOpenedByTopbar, getSidebar } from '../../registry/index';
import { usePlayerFactionSummary } from '../../data-source/index';
import { beginUIPerfInteraction, recordUIPerfReactRender } from '../../perf/uiPerfProfiler';
import AnimatedSlot from './AnimatedSlot';
import EventPopupSlot from './EventPopupSlot';
export default function GameUIRoot() {
  const {
    leftSidebar, leftSidebarId, rightSidebar, rightSidebarId,
    activeScreen, activeScreenId,
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
  const playerFaction = usePlayerFactionSummary();
  const subjectMode = playerFaction?.diplomaticStatus === 'subject';

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

  useEffect(() => {
    if (!playerFaction) return;
    if (subjectMode && activeScreen === 'faction-overview') {
      openScreen('governor-faction-overview', activeScreenId ?? undefined);
    } else if (!subjectMode && activeScreen === 'governor-faction-overview') {
      openScreen('faction-overview', activeScreenId ?? undefined);
    }
  }, [activeScreen, activeScreenId, openScreen, playerFaction, subjectMode]);

  // Current LLM/tutorial event pushed from the game (null when nothing is active).
  const { event: bridgeEvent, chooseOption: bridgeChooseOption } = useEventBridge();
  const { event: provinceRecallEvent, chooseOption: chooseProvinceRecallOption } = useProvinceRecallBridge(subjectMode);
  const presentedEvent = bridgeEvent ?? provinceRecallEvent;
  const choosePresentedEventOption = bridgeEvent ? bridgeChooseOption : chooseProvinceRecallOption;

  const tutorialProgress = useTutorialProgressBridge();
  const tutorialSpotlight = useTutorialSpotlightBridge();

  // Live pinned-items list from the game (settlements, characters, militaries, factions).
  const { items: pinnedItems, togglePin } = usePinnedItemsBridge();

  // Event body <link> tags (emitted by the game's LinkUtils) map to sidebars.
  const handleEventLinkClick = useCallback((type: string, id: string) => {
    switch (type) {
      case 'settlement': openSidebar('settlement', id); break;
      case 'character':  openSidebar('character', id); break;
      case 'faction':    openSidebar('diplomacy', id); break;
      case 'army':
      case 'military':   openSidebar('military', id); break;
      case 'screen': {
        const separatorIndex = id.indexOf(':');
        const screenName = separatorIndex >= 0 ? id.slice(0, separatorIndex) : id;
        const screenId = separatorIndex >= 0 ? id.slice(separatorIndex + 1) : undefined;
        const target = getScreenByBridgeName(screenName, subjectMode);
        if (target) openScreen(target.id, screenId);
        break;
      }
    }
  }, [openScreen, openSidebar, subjectMode]);

  // Pre-load all UI sound effects on first user interaction
  useEffect(() => {
    const init = () => { preloadSounds(); document.removeEventListener('mousedown', init); };
    document.addEventListener('mousedown', init, { once: true });
    return () => document.removeEventListener('mousedown', init);
  }, []);

  const [showPause, setShowPause] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showOutcomeLoad, setShowOutcomeLoad] = useState(false);
  const [gameOverCause, setGameOverCause] = useState<GameOverCause>('rebellion');
  const [victorySummary, setVictorySummary] = useState<CampaignOutcomeSummary | undefined>();
  const [gameOverSummary, setGameOverSummary] = useState<CampaignOutcomeSummary | undefined>();
  const { handleEscapeStack, markEscapeHandled } = useEscapeStack();
  const {
    state: courtierPromotion,
    close: closeCourtierPromotion,
    promote: promoteCourtier,
  } = useCourtierPromotionBridge();
  const {
    state: allyCallDialog,
    respond: respondToAllyCall,
  } = useAllyCallDialogBridge();
  const provinceEmperorTakeover = useProvinceEmperorTakeoverBridge(true);
  const [showPinned, setShowPinned] = useState(false);
  const [showVictoryConditions, setShowVictoryConditions] = useState(false);
  const [provinceEmperorTakeoverDismissed, setProvinceEmperorTakeoverDismissed] = useState(false);

  const closePinned = useCallback(() => setShowPinned(false), []);
  const closeVictoryConditions = useCallback(() => setShowVictoryConditions(false), []);
  const closeProvinceEmperorTakeover = useCallback(() => setProvinceEmperorTakeoverDismissed(true), []);

  useEffect(() => {
    const handleReset = () => {
      setShowPause(false);
      setShowVictory(false);
      setShowGameOver(false);
      setShowOutcomeLoad(false);
      setVictorySummary(undefined);
      setGameOverSummary(undefined);
      setShowPinned(false);
      setShowVictoryConditions(false);
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
  useEscapeStackEntry({
    id: 'ui.victory-conditions',
    active: showVictoryConditions,
    onClose: closeVictoryConditions,
  });
  const handleEscape = useCallback((fromInput = false) => {
    if (handleEscapeStack({ fromInput })) return true;
    if (fromInput) return false;

    markEscapeHandled();
    beginUIPerfInteraction('screen:pause-menu');
    setShowPause(true);
    return true;
  }, [handleEscapeStack, markEscapeHandled]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        const handled = handleEscape(isEscapeTextEntryTarget(e.target));
        if (!handled) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleEscape]);

  useEffect(() => {
    const handler = () => { handleEscape(false); };
    bridgeEvents.addEventListener('ui.escape_pressed', handler);
    return () => bridgeEvents.removeEventListener('ui.escape_pressed', handler);
  }, [handleEscape]);

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
    setShowOutcomeLoad(true);
  }, []);

  const handlePurchaseFullGame = useCallback(() => {
    bridgeCall('ui.open_external_link', { linkId: 'full_game' }).catch(acknowledgeBridgeFailure);
  }, []);

  useEffect(() => {
    const victoryHandler = (event: Event) => {
      beginUIPerfInteraction('screen:victory');
      const data = (event as CustomEvent).detail as CampaignOutcomeSummary | undefined;
      setVictorySummary(data && typeof data === 'object' ? data : undefined);
      setShowGameOver(false);
      setShowVictory(true);
    };
    const gameOverHandler = (event: Event) => {
      beginUIPerfInteraction('screen:game-over');
      const data = (event as CustomEvent).detail as CampaignOutcomeSummary & { cause?: string } | undefined;
      const cause = data?.cause;
      if (cause === 'extinction' || cause === 'conquest' || cause === 'subjugation' || cause === 'rebellion' || cause === 'governorship' || cause === 'failed_rebellion' || cause === 'demo_expired') {
        setGameOverCause(cause);
      } else {
        setGameOverCause('rebellion');
      }
      setGameOverSummary(data && typeof data === 'object' ? data : undefined);
      setShowVictory(false);
      setShowGameOver(true);
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
    if (next) setShowVictoryConditions(false);
    return next;
  }), []);
  const toggleVictoryConditions = useCallback(() => setShowVictoryConditions(v => {
    const next = !v;
    if (next) beginUIPerfInteraction('dropdown:victory-conditions');
    if (next) setShowPinned(false);
    return next;
  }), []);

  const activeScreenButtonId: string | null = activeScreenReg?.topbarId ?? null;

  // Events take precedence; then the active screen's topic, then the visible
  // sidebar's topic. null leaves the advisor dismissed.
  let autoAdvisorTopic: AdvisorTopicId | null = null;
  if (presentedEvent) autoAdvisorTopic = 'eventPopup';
  else if (activeScreenReg?.advisorTopic) autoAdvisorTopic = activeScreenReg.advisorTopic;
  else if (rightSidebarReg) autoAdvisorTopic = rightSidebarReg.advisorTopic ?? null;
  else if (leftSidebarReg) autoAdvisorTopic = leftSidebarReg.advisorTopic ?? null;

  useEffect(() => {
    if (showPause || showVictory || showGameOver || showOutcomeLoad) return;
    if (autoAdvisorTopic) showAdvisor(autoAdvisorTopic);
    else dismissAdvisor();
  }, [showPause, showVictory, showGameOver, showOutcomeLoad, autoAdvisorTopic, showAdvisor, dismissAdvisor]);

  const advisorPlacement = presentedEvent || activeScreen
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
    || showPause
    || showVictory
    || showGameOver
    || showOutcomeLoad
    || !!presentedEvent
    || agentSelect.open
    || courtierPromotion.open
    || allyCallDialog.open
    || (provinceEmperorTakeoverOpen && !!provinceEmperorTakeover?.active)
    || tutorialSpotlight.spotlight.isVisible,
  );
  const tutorialWorldGlanceTarget = tutorialSpotlight.spotlight.isVisible
    && isWorldGlanceTutorialTarget(tutorialSpotlight.spotlight.target)
    ? tutorialSpotlight.spotlight.target
    : '';
  const mapGlancesObscured = Boolean(
    showPause
    || showVictory
    || showGameOver
    || showOutcomeLoad
    || !!presentedEvent
    || agentSelect.open
    || courtierPromotion.open
    || allyCallDialog.open
    || (provinceEmperorTakeoverOpen && !!provinceEmperorTakeover?.active)
    || (tutorialSpotlight.spotlight.isVisible && !tutorialWorldGlanceTarget),
  );

  return (
    <div className="game-container" data-webkiln-world-input>
      <AchievementUnlockToast />
      <TopBar
        onScreenChange={handleScreenChange}
        activeScreen={activeScreenButtonId}
        onOpenBureaucracyOverview={() => openScreen('factionOverview')}
        onPinnedToggle={togglePinned}
        isPinnedOpen={showPinned}
        pinnedCount={pinnedItems.length}
        onVictoryToggle={toggleVictoryConditions}
        isVictoryOpen={showVictoryConditions}
      />

      <div className="game-main" data-webkiln-world-input>
        {warnings.length > 0 && (
          <WarningBar warnings={warnings} onDismiss={dismissWarning} />
        )}

        <NotificationStack
          notifications={notifications}
          onDismiss={dismissNotification}
          currentGameDay={gameDay}
          onLinkClick={handleEventLinkClick}
          anchorsEnabled={!mapAnchorsObscured}
        />

        <BottomBar />
        <WorldGlanceOverlay
          visible={!mapGlancesObscured}
          tutorialTarget={tutorialWorldGlanceTarget}
        />
        <ProvinceTooltipOverlay />
        <DragSelectionMarquee enabled={!mapAnchorsObscured} />

        {/* Left sidebar - registry-driven (settlement / military / diplomacy / mod). */}
        <Profiler id={`sidebar:left:${leftSidebar ?? 'closed'}`} onRender={recordUIPerfReactRender}>
          <AnimatedSlot active={!!leftSidebar} className="sidebar-left">
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
            {activeScreenReg ? activeScreenReg.render({ screenId: activeScreenId, onClose: closeScreen }) : null}
          </AnimatedSlot>
        </Profiler>
      </div>

      <TutorialProgress
        progress={tutorialProgress}
        placement={leftSidebar ? 'shifted' : 'left'}
        onLinkClick={handleEventLinkClick}
      />
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
      <VictoryConditionsDropdown
        isOpen={showVictoryConditions}
        onClose={() => setShowVictoryConditions(false)}
      />
      <AdvisorPanel
        hint={advisorHint}
        step={advisorStep}
        visible={advisorVisible && !showPause && !showVictory && !showGameOver && !showOutcomeLoad}
        placement={advisorPlacement}
        onPrevious={previousAdvisorPage}
        onNext={nextAdvisorPage}
        onDismiss={dismissAdvisor}
      />
      <Profiler id="modal:event-popup" onRender={recordUIPerfReactRender}>
        <EventPopupSlot
          event={presentedEvent}
          onOptionSelect={choosePresentedEventOption}
          onLinkClick={handleEventLinkClick}
        />
      </Profiler>
      <TutorialSpotlightOverlay
        spotlight={tutorialSpotlight.spotlight}
        onResolve={tutorialSpotlight.resolve}
        onDismiss={tutorialSpotlight.dismiss}
        onNavigate={tutorialSpotlight.navigate}
        onLinkClick={handleEventLinkClick}
      />

      <Profiler id="screen:pause-menu" onRender={recordUIPerfReactRender}>
        <PauseMenu visible={showPause} onClosed={() => setShowPause(false)} />
      </Profiler>
      {showVictory && (
        <VictoryScreen
          summary={victorySummary}
          onClose={() => setShowVictory(false)}
          onContinuePlaying={handleCampaignOutcomeContinue}
          onMainMenu={handleCampaignOutcomeMainMenu}
        />
      )}
      {showGameOver && (
        <GameOverScreen
          cause={gameOverCause}
          summary={gameOverSummary}
          onClose={() => setShowGameOver(false)}
          onLoadSave={handleCampaignOutcomeLoadSave}
          onMainMenu={handleCampaignOutcomeMainMenu}
          onPurchaseFullGame={handlePurchaseFullGame}
        />
      )}
      <LoadGameModal
        visible={showOutcomeLoad}
        onClosed={() => setShowOutcomeLoad(false)}
      />
      <AgentSelectModal
        key={`${agentSelect.targetFactionId ?? ''}:${agentSelect.role ?? ''}`}
        open={agentSelect.open}
        targetFactionId={agentSelect.targetFactionId}
        role={agentSelect.role}
        onClose={closeAgentSelect}
      />
      <CourtierPromotionModal
        open={courtierPromotion.open}
        onClose={closeCourtierPromotion}
        settlementName={courtierPromotion.settlementName}
        playerGold={courtierPromotion.playerGold}
        promotionCost={courtierPromotion.promotionCost}
        types={courtierPromotion.types}
        onPromote={promoteCourtier}
      />
      <AllyCallDialogModal
        state={allyCallDialog}
        onRespond={respondToAllyCall}
      />
      <ProvinceEmperorTakeoverModal
        open={provinceEmperorTakeoverOpen}
        takeover={provinceEmperorTakeover}
        onClose={closeProvinceEmperorTakeover}
      />
    </div>
  );
}


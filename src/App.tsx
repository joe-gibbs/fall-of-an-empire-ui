import { Component, Profiler, useEffect, useState, useCallback, type AnimationEvent, type ReactNode } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import TopBar from './components/topbar/TopBar';
import BottomBar from './components/bottombar/BottomBar';
import AdvisorPanel from './components/hud/panels/AdvisorPanel';
import TutorialProgress from './components/hud/tutorial/TutorialProgress';
import TutorialSpotlightOverlay from './components/hud/overlays/TutorialSpotlightOverlay';
import PinnedItemsBar from './components/hud/panels/PinnedItemsBar';
import VictoryConditionsDropdown from './components/hud/panels/VictoryConditionsDropdown';
import WorldGlanceOverlay from './components/hud/overlays/WorldGlanceOverlay';
import ProvinceTooltipOverlay from './components/hud/overlays/ProvinceTooltipOverlay';
import DragSelectionMarquee from './components/hud/overlays/DragSelectionMarquee';
import MainMenu from './pages/MainMenu';
import VictoryScreen from './components/screens/campaign/VictoryScreen';
import GameOverScreen, { type GameOverCause } from './components/screens/campaign/GameOverScreen';
import type { CampaignOutcomeSummary } from './components/screens/campaign/CampaignOutcomeData';
import PauseMenu from './components/screens/system/PauseMenu';
import LoadGameModal from './components/screens/system/LoadGameModal';
import EventPopup from './components/events/EventPopup';
import AgentSelectModal from './components/modals/characters/AgentSelectModal';
import CourtierPromotionModal from './components/modals/characters/CourtierPromotionModal';
import AllyCallDialogModal from './components/modals/diplomacy/AllyCallDialogModal';
import ProvinceEmperorTakeoverModal from './components/modals/provinces/ProvinceEmperorTakeoverModal';
import WarningBar from './components/notifications/WarningBar';
import NotificationStack from './components/notifications/NotificationStack';
import LoadingScreenOverlay from './components/loading/LoadingScreenOverlay';
import { TooltipHost } from './components/common/tooltips/Tooltip';
import type { AdvisorTopicId } from './data/advisorTopics';
import type { Event as GameEvent, EventChoiceInputs } from './data/types';
import { ensureLoaded as preloadSounds } from './hooks/useSound';
import { WebUITextProvider } from './localization/WebUITextProvider';
import { useBridgeSidebarEvents } from './bridge/core/useBridgeSidebarEvents';
import { useEventBridge } from './bridge/app/useEventBridge';
import { useTutorialProgressBridge } from './bridge/app/useTutorialProgressBridge';
import { useTutorialSpotlightBridge } from './bridge/app/useTutorialSpotlightBridge';
import { useAppMode } from './bridge/app/useAppModeBridge';
import { useUIScale } from './bridge/core/useUIScale';
import { usePinnedItemsBridge } from './bridge/app/usePinnedItemsBridge';
import { useCourtierPromotionBridge } from './bridge/characters/useCourtierPromotionBridge';
import { useAllyCallDialogBridge } from './bridge/diplomacy/useAllyCallDialogBridge';
import { useFactionBorderHighlightBridge } from './bridge/diplomacy/useFactionBorderHighlightBridge';
import { useProvinceEmperorTakeoverBridge } from './bridge/provinces/useProvinceEmperorTakeoverBridge';
import { useProvinceRecallBridge } from './bridge/provinces/useProvinceRecallBridge';
import { EscapeStackProvider } from './context/EscapeStackProvider';
import { preloadWebUIAssets } from './preload/assets';
import {
  isEscapeTextEntryTarget,
  useEscapeStack,
  useEscapeStackEntry,
} from './context/EscapeStack';
import { bridgeCall } from './bridge-types.generated.ts';
import { acknowledgeBridgeFailure, getRuntimeEngine } from './bridge/core/runtimeEngine';
import { GAMEPLAY_CONTEXT_RESET_EVENT } from './bridge/core/gameplayCacheReset';
import { getScreen, getScreenByBridgeName, getScreenOpenedByTopbar, getSidebar } from './registry/index';
import { usePlayerFactionSummary } from './data-source/index';
import { beginUIPerfInteraction, recordUIPerfReactRender } from './perf/uiPerfProfiler';
import './App.css';

/** Keeps children mounted & frozen during exit animation when requested. */
interface AnimatedSlotProps {
  active: boolean;
  className: string;
  children: ReactNode;
  keepMountedOnExit?: boolean;
}

interface AnimatedSlotState {
  mounted: boolean;
  frozenClassName: string;
  frozenChildren: ReactNode;
}

class AnimatedSlot extends Component<AnimatedSlotProps, AnimatedSlotState> {
  state: AnimatedSlotState = {
    mounted: this.props.active,
    frozenClassName: this.props.className,
    frozenChildren: this.props.active ? this.props.children : null,
  };

  private exitFallbackTimer: number | null = null;

  static getDerivedStateFromProps(props: AnimatedSlotProps, state: AnimatedSlotState): Partial<AnimatedSlotState> | null {
    if (!props.active) {
      if (props.keepMountedOnExit === false && state.mounted) {
        return {
          mounted: false,
          frozenChildren: null,
        };
      }
      return null;
    }
    if (
      state.mounted
      && state.frozenClassName === props.className
      && state.frozenChildren === props.children
    ) {
      return null;
    }
    return {
      mounted: true,
      frozenClassName: props.className,
      frozenChildren: props.children,
    };
  }

  componentDidUpdate(prevProps: AnimatedSlotProps) {
    const exiting = this.state.mounted && !this.props.active;
    if (exiting && (prevProps.active || this.exitFallbackTimer === null)) {
      this.clearExitFallback();
      this.exitFallbackTimer = window.setTimeout(this.finishExit, 360);
    }
    if ((this.props.active && !prevProps.active) || (!this.props.active && this.props.keepMountedOnExit === false)) {
      this.clearExitFallback();
    }
  }

  componentWillUnmount() {
    this.clearExitFallback();
  }

  private clearExitFallback = () => {
    if (this.exitFallbackTimer === null) return;
    window.clearTimeout(this.exitFallbackTimer);
    this.exitFallbackTimer = null;
  };

  private finishExit = () => {
    const exiting = this.state.mounted && !this.props.active;
    if (!exiting) return;
    this.clearExitFallback();
    this.setState({ mounted: false, frozenChildren: null });
  };

  // Derive exiting synchronously - no effect delay, no flash
  private handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    // AnimationEvent bubbles. The exit animation runs on either the slot div
    // itself (screen overlays) or its direct child (sidebars). Ignore events
    // from deeper descendants so child animations (tooltip fades, shimmers)
    // can't unmount us before the flyout finishes.
    if (e.target !== e.currentTarget && (e.target as Node).parentNode !== e.currentTarget) return;
    const exiting = this.state.mounted && !this.props.active;
    if (exiting) this.finishExit();
  };

  render() {
    const exiting = this.state.mounted && !this.props.active;
    if (!this.state.mounted) return null;

    const className = exiting ? this.state.frozenClassName : this.props.className;
    return (
      <div
        className={`${className}${exiting ? ' slot--exiting' : ''}`}
        onAnimationEnd={this.handleAnimationEnd}
      >
        {exiting ? this.state.frozenChildren : this.props.children}
      </div>
    );
  }
}

interface EventPopupSlotProps {
  event: GameEvent | null;
  onOptionSelect: (index: number, inputs?: EventChoiceInputs) => void;
  onLinkClick?: (type: string, id: string) => void;
}

interface EventPopupSlotState {
  presentedEvent: GameEvent | null;
}

class EventPopupSlot extends Component<EventPopupSlotProps, EventPopupSlotState> {
  state: EventPopupSlotState = {
    presentedEvent: this.props.event,
  };

  static getDerivedStateFromProps(props: EventPopupSlotProps, state: EventPopupSlotState): Partial<EventPopupSlotState> | null {
    if (!props.event || props.event === state.presentedEvent) return null;
    return { presentedEvent: props.event };
  }

  private handleClosed = (eventId: string) => {
    this.setState(state => (
      state.presentedEvent?.id === eventId
        ? { presentedEvent: null }
        : null
    ));
  };

  render() {
    const event = this.state.presentedEvent;
    if (!event) return null;

    return (
      <EventPopup
        key={event.id}
        event={event}
        visible={!!this.props.event && this.props.event.id === event.id}
        onClose={() => this.handleClosed(event.id)}
        onOptionSelect={this.props.onOptionSelect}
        onLinkClick={this.props.onLinkClick}
      />
    );
  }
}

function GameUI() {
  const {
    leftSidebar, leftSidebarId, rightSidebar, rightSidebarId,
    activeScreen, activeScreenId,
    advisorHint, advisorStep, advisorVisible,
    warnings, notifications,
    gameDay,
    agentSelect,
    closeLeftSidebar, closeRightSidebar, closeSidebarFromBridge, closeSidebarEntityFromBridge, closeScreen,
    dismissWarning, dismissNotification,
    toggleScreen, openSidebar, openScreen,
    showAdvisor, dismissAdvisor, nextAdvisorPage, previousAdvisorPage,
    closeAgentSelect,
  } = useGame();
  const playerFaction = usePlayerFactionSummary();
  const subjectMode = playerFaction?.diplomaticStatus === 'subject';

  // Listen for sidebar open/close + screen-open events from the game
  // (close path must bypass bridge round-trip).
  useBridgeSidebarEvents(openSidebar, closeSidebarFromBridge, closeSidebarEntityFromBridge, openScreen, closeScreen, subjectMode);
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

    window.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
    return () => window.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
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
    window.addEventListener('bridge:ui.escape_pressed', handler);
    return () => window.removeEventListener('bridge:ui.escape_pressed', handler);
  }, [handleEscape]);

  useEffect(() => {
    const handler = () => {
      beginUIPerfInteraction('modal:province-emperor-takeover');
      setProvinceEmperorTakeoverDismissed(false);
    };
    window.addEventListener('bridge:ui.open_province_emperor_takeover_picker', handler);
    return () => window.removeEventListener('bridge:ui.open_province_emperor_takeover_picker', handler);
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
      if (cause === 'extinction' || cause === 'conquest' || cause === 'subjugation' || cause === 'rebellion' || cause === 'governorship' || cause === 'failed_rebellion') {
        setGameOverCause(cause);
      } else {
        setGameOverCause('rebellion');
      }
      setGameOverSummary(data && typeof data === 'object' ? data : undefined);
      setShowVictory(false);
      setShowGameOver(true);
    };

    window.addEventListener('bridge:ui.show_victory_screen', victoryHandler);
    window.addEventListener('bridge:ui.show_game_over_screen', gameOverHandler);
    return () => {
      window.removeEventListener('bridge:ui.show_victory_screen', victoryHandler);
      window.removeEventListener('bridge:ui.show_game_over_screen', gameOverHandler);
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
    || tutorialSpotlight.spotlight.isVisible,
  );

  return (
    <div className="game-container">
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

      <div className="game-main">
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
        <WorldGlanceOverlay visible={!mapGlancesObscured} />
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
          <AnimatedSlot active={!!activeScreen} className={screenOverlayClass}>
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

function App() {
  useUIScale();
  const appMode = useAppMode();
  useEffect(() => {
    preloadWebUIAssets(appMode);
  }, [appMode]);

  useEffect(() => {
    if (!appMode) return undefined;

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let timer = 0;

    const notifyRendered = () => {
      if (cancelled) return;
      const engine = getRuntimeEngine();
      if (!engine) return;
      void Promise.resolve(engine.call('UIRendered', { mode: appMode }))
        .catch(error => acknowledgeBridgeFailure(error, 'UIRendered'));
    };

    const scheduleWithTimer = () => {
      timer = window.setTimeout(notifyRendered, 0);
    };

    if (typeof window.requestAnimationFrame === 'function') {
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          notifyRendered();
        });
      });
    } else {
      scheduleWithTimer();
    }

    return () => {
      cancelled = true;
      if (firstFrame !== 0) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== 0) window.cancelAnimationFrame(secondFrame);
      if (timer !== 0) window.clearTimeout(timer);
    };
  }, [appMode]);

  let content: ReactNode = null;
  if (appMode === 'mainmenu') {
    content = (
      <>
        <MainMenu />
        <TooltipHost />
      </>
    );
  } else if (appMode === 'ingame') {
    content = (
      <GameProvider>
        <GameUI />
        <TooltipHost />
      </GameProvider>
    );
  }

  return (
    <EscapeStackProvider>
      <WebUITextProvider>
        <div className="game-cursor-surface">
          {content}
          <LoadingScreenOverlay />
        </div>
      </WebUITextProvider>
    </EscapeStackProvider>
  );
}

export default App;

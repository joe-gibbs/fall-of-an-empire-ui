import React, { useEffect, useLayoutEffect } from 'react';
import ScreenButtons, { type ScreenId } from './ScreenButtons';
import ScreensMenu from './ScreensMenu';
import { ScreenButtonTooltipBody } from './ScreenButtonTooltip';
import DateDisplay from './DateDisplay';
import DemoTimer from './DemoTimer';
import SpeedControls from './SpeedControls';
import ResourceDisplay from './ResourceDisplay';
import ImperialStandingIndicator from './ImperialStandingIndicator';
import PersonTooltip from '../common/tooltips/PersonTooltip';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import IconButton from '../common/buttons/IconButton';
import Portrait from '../common/portraits/Portrait';
import { BureaucraticThroughputHudValue } from '../bureaucracy/BureaucraticThroughput';
import { usePlayerFactionSummary } from '../../data-source/index';
import { useGameState, useGameActions } from '../../context/GameContext';
import { playSound } from '../../hooks/useSound';
import { useCompactHud } from '../../hooks/useCompactHud';
import { updateTopbarLayoutScale } from '../../utils/topbarLayoutScale';
import './TopBar.css';

import { webUIText } from '../../localization/WebUITextContext';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import { useActiveInputDevice } from '../../hooks/useActiveInputDevice';
import { findActionBinding } from '../../utils/actionBindings';
import { ActionKeyGlyph } from '../common/ActionKeyGlyph';
import { KeyGlyph } from '../common/KeyGlyph';
import { bridgeEvents } from '../../bridge/core/bridgeEvents';

interface ActionButtonConfig {
  id: 'build' | 'victory' | 'pinned';
  labelKey: string;
  icon: string;
  tooltipBodyKey: string;
  tooltipLineKeys?: readonly string[];
  tooltipLineKeysWithBinding?: ReadonlyArray<{ textKey: string; actionName: string }>;
  tutorialTarget: string;
  factionMode?: 'all' | 'independent' | 'subject';
}

const actionButtons: readonly ActionButtonConfig[] = [
  {
    id: 'build',
    labelKey: 'Topbar.BuildQueue',
    icon: '/assets/icons/I_BuildingsQuickButton.png',
    tooltipBodyKey: 'Topbar.BuildQueueTooltipBody',
    tooltipLineKeys: ['Topbar.BuildQueueTooltipLineOne'],
    tutorialTarget: 'BuildQueueButton',
  },
  {
    id: 'victory',
    labelKey: 'Topbar.VictoryConditions',
    icon: '/assets/icons/Victory/I_Victory_Gold.png',
    tooltipBodyKey: 'Topbar.VictoryConditionsTooltipBody',
    tooltipLineKeys: ['Topbar.VictoryConditionsTooltipLineOne'],
    tutorialTarget: 'VictoryConditionsButton',
    factionMode: 'independent',
  },
  {
    id: 'pinned',
    labelKey: 'Topbar.PinnedItems',
    icon: '/assets/icons/I_Pin_Pinned.png',
    tooltipBodyKey: 'Topbar.PinnedItemsTooltipBody',
    tooltipLineKeys: ['Topbar.PinnedItemsTooltipLineOne'],
    tooltipLineKeysWithBinding: [
      { textKey: 'Topbar.PinnedItemsTooltipLineTwo', actionName: 'WorldSearch' },
    ],
    tutorialTarget: 'PinnedItemsToggleButton',
  },
];

type Speed = 0 | 1 | 2 | 3 | 4;

interface TopBarProps {
  onScreenChange?: (screen: ScreenId) => void;
  activeScreen?: ScreenId | null;
  onPinnedToggle?: () => void;
  isPinnedOpen?: boolean;
  pinnedCount?: number;
  onVictoryToggle?: () => void;
  isVictoryOpen?: boolean;
  onOpenBureaucracyOverview?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  onScreenChange,
  activeScreen = null,
  onPinnedToggle,
  isPinnedOpen = false,
  pinnedCount = 0,
  onVictoryToggle,
  isVictoryOpen = false,
  onOpenBureaucracyOverview,
}) => {
  const compact = useCompactHud();
  const { isPaused, speed: contextSpeed, saveSerial } = useGameState();
  const { togglePause, setSpeed: contextSetSpeed, openSidebar } = useGameActions();
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );
  const openScreensBinding = findActionBinding(settings?.controls, 'OpenScreensMenu', 'gamepad');
  const openMapModesBinding = findActionBinding(settings?.controls, 'OpenMapModes', 'gamepad');
  const playerFaction = usePlayerFactionSummary();
  const subjectMode = playerFaction?.diplomaticStatus === 'subject';
  const playerCharacterId = playerFaction?.rulerId ?? null;

  const speed: Speed = isPaused ? 0 : (contextSpeed as Speed);
  const playerCharacterName = playerFaction?.rulerName ?? playerFaction?.name ?? webUIText('TopBar.YourCharacter');

  useLayoutEffect(() => {
    if (compact) {
      const root = document.documentElement;
      root.style.setProperty('--topbar-layout-scale', '1');
      root.style.removeProperty('--topbar-design-width');
      return undefined;
    }
    updateTopbarLayoutScale();
    window.addEventListener('resize', updateTopbarLayoutScale);
    window.addEventListener('webkiln:runtime-viewport', updateTopbarLayoutScale);
    return () => {
      window.removeEventListener('resize', updateTopbarLayoutScale);
      window.removeEventListener('webkiln:runtime-viewport', updateTopbarLayoutScale);
    };
  }, [compact, settings?.gameplay?.uiScale]);

  useEffect(() => {
    const openCurrentCharacter = () => {
      if (!playerCharacterId) return;
      playSound('click');
      openSidebar('character', playerCharacterId);
    };
    bridgeEvents.addEventListener('ui.gamepad_open_current_character', openCurrentCharacter);
    return () => bridgeEvents.removeEventListener('ui.gamepad_open_current_character', openCurrentCharacter);
  }, [openSidebar, playerCharacterId]);

  const handleSpeedChange = (newSpeed: Speed) => {
    if (newSpeed === 0) {
      togglePause();
    } else if (isPaused) {
      contextSetSpeed(newSpeed as 1 | 2 | 4);
    } else {
      contextSetSpeed(newSpeed as 1 | 2 | 4);
    }
  };

  const handlePortraitClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!playerCharacterId) return;
    playSound('click');
    openSidebar('character', playerCharacterId);
  };

  const actionTooltip = (button: ActionButtonConfig): TooltipContent => {
    const lines: TooltipLine[] = [];
    button.tooltipLineKeys?.forEach((key) => {
      lines.push({ label: webUIText(key) });
    });
    button.tooltipLineKeysWithBinding?.forEach((entry) => {
      const binding = findActionBinding(settings?.controls, entry.actionName, activeInputDevice);
      lines.push({
        label: (
          <span className="tt-footer-shortcut-row">
            {binding ? <ActionKeyGlyph binding={binding} /> : null}
            <span>{webUIText(entry.textKey)}</span>
          </span>
        ),
      });
    });
    return {
      title: webUIText(button.labelKey),
      body: <ScreenButtonTooltipBody body={webUIText(button.tooltipBodyKey)} lines={lines} />,
    };
  };

  const portraitButton = (
    <button
      type="button"
      className="topbar-portrait"
      data-webkiln-hit="alpha"
      data-tutorial-target="LeaderPortrait"
      onClick={handlePortraitClick}
      disabled={!playerCharacterId}
      aria-label={webUIText('Auto.Attr.componentstopbarTopBar.75.1', { PlayerCharacterName: playerCharacterName })}
    >
      <span className="topbar-portrait-surface">
        <Portrait
          key={`${saveSerial}:${playerCharacterId ?? ''}:${playerFaction?.rulerPortrait ?? ''}`}
          personId={playerCharacterId ?? undefined}
          name={playerCharacterName}
          src={playerFaction?.rulerPortrait}
          layers={playerFaction?.rulerPortraitLayers}
          isAlive={playerFaction?.rulerIsAlive}
          isImprisoned={playerFaction?.rulerIsImprisoned}
          resolvePerson={false}
          size="md"
          showBorder={false}
          className="topbar-portrait-composite"
        />
      </span>
    </button>
  );

  const portraitNode = playerCharacterId ? (
    <PersonTooltip characterId={playerCharacterId} position="left" delay={200}>
      {portraitButton}
    </PersonTooltip>
  ) : (
    portraitButton
  );

  if (compact) {
    return (
      <>
        <div className="topbar-shell topbar-shell--compact">
          <header className="topbar topbar--compact">
            <div className="topbar-compact-side topbar-compact-side--left" data-tutorial-target="ScreenButtonGroup">
              {/*
                StripLeft PNG has the hard/solid end on its RIGHT. Horizontally
                flip so that hard edge sits on the left of the screen and the
                organic taper faces the open centre.
              */}
              <img
                src="/assets/ui-shadowed/T_TopNavbar_StripLeft.png"
                className="topbar-compact-side-bg topbar-compact-side-bg--left"
                alt=""
                draggable={false}
              />
              <ScreensMenu
                activeScreen={activeScreen}
                onScreenChange={onScreenChange}
                onPinnedToggle={onPinnedToggle}
                isPinnedOpen={isPinnedOpen}
                pinnedCount={pinnedCount}
                onVictoryToggle={onVictoryToggle}
                isVictoryOpen={isVictoryOpen}
                subjectMode={subjectMode}
              />
              <div className="topbar-compact-speed">
                <SpeedControls speed={speed} onSpeedChange={handleSpeedChange} />
              </div>
              {activeInputDevice === 'gamepad' && (
                <div className="topbar-controller-shortcuts" aria-label={webUIText('Controller.PromptBar')}>
                  {openScreensBinding && (
                    <span className="topbar-controller-shortcut">
                      <ActionKeyGlyph binding={openScreensBinding} />
                      <span className="topbar-controller-shortcut-label">{openScreensBinding.label}</span>
                    </span>
                  )}
                  {openMapModesBinding && (
                    <span className="topbar-controller-shortcut">
                      <ActionKeyGlyph binding={openMapModesBinding} />
                      <span className="topbar-controller-shortcut-label">{openMapModesBinding.label}</span>
                    </span>
                  )}
                  {openScreensBinding && (
                    <span className="topbar-controller-shortcut">
                      <span className="topbar-controller-shortcut-glyphs">
                        <KeyGlyph glyphId="gamepad_lb" keyDisplay={webUIText('Controller.LeftBumper')} />
                        <ActionKeyGlyph binding={openScreensBinding} />
                      </span>
                      <span className="topbar-controller-shortcut-label">{webUIText('Controller.Prompt.Warnings')}</span>
                    </span>
                  )}
                  {openScreensBinding && (
                    <span className="topbar-controller-shortcut">
                      <span className="topbar-controller-shortcut-glyphs">
                        <KeyGlyph glyphId="gamepad_rb" keyDisplay={webUIText('Controller.RightBumper')} />
                        <ActionKeyGlyph binding={openScreensBinding} />
                      </span>
                      <span className="topbar-controller-shortcut-label">{webUIText('Controller.Prompt.CurrentCharacter')}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="topbar-compact-right-cluster">
              {/*
                Metrics: T_TopNavbar_Right unflipped (taper left / hard right) and
                wide enough for date + gold. Portrait: square PortraitCircle crop
                (flipped horizontally to match fullsize meander orientation).
              */}
              <div className="topbar-compact-side topbar-compact-side--metrics">
                <img
                  src="/assets/ui-shadowed/T_TopNavbar_Right.png"
                  className="topbar-compact-side-bg topbar-compact-side-bg--metrics"
                  alt=""
                  draggable={false}
                />
                <DateDisplay />
                <ResourceDisplay />
              </div>
              <div className="topbar-compact-portrait-island" data-webkiln-hit="alpha" data-tutorial-target="LeaderPortraitSlot">
                <img
                  src="/assets/ui-shadowed/T_TopNavbar_PortraitCircle.png"
                  className="topbar-compact-portrait-frame"
                  alt=""
                  draggable={false}
                />
                <div className="topbar-compact-portrait">
                  {portraitNode}
                </div>
              </div>
            </div>

            {saveSerial > 0 && (
              <div key={saveSerial} className="topbar-saving-indicator topbar-saving-indicator--compact" role="status" aria-live="polite">
                <img src="/assets/icons/I_SaveFolder.png" alt="" className="topbar-saving-indicator-icon" draggable={false} />
                <span>{webUIText('Topbar.Saving')}</span>
              </div>
            )}
          </header>
        </div>
        <DemoTimer />
      </>
    );
  }

  return (
    <>
      <div className="topbar-shell">
        <div className="topbar-scale">
          <header className="topbar">
            <img
              src="/assets/ui-shadowed/T_TopNavbar_Right.png"
              className="topbar-bg-right"
              alt=""
              draggable={false}
            />

            <img
              src="/assets/ui-shadowed/T_TopNavbar_Left.png"
              className="topbar-bg-left"
              alt=""
              draggable={false}
            />

            <div className="topbar-left" data-tutorial-target="ScreenButtonGroup">
              <ScreenButtons
                activeScreen={activeScreen}
                onScreenChange={onScreenChange}
              />
            </div>

            <div className="topbar-center">
              <img
                src="/assets/ui-shadowed/T_CentreBorder.png"
                className="topbar-center-bg"
                alt=""
                draggable={false}
              />
              <div className="topbar-center-content">
                <SpeedControls speed={speed} onSpeedChange={handleSpeedChange} />
                <div className="topbar-center-divider" />
                <DateDisplay />
              </div>
              {saveSerial > 0 && (
                <div key={saveSerial} className="topbar-saving-indicator" role="status" aria-live="polite">
                  <img src="/assets/icons/I_SaveFolder.png" alt="" className="topbar-saving-indicator-icon" draggable={false} />
                  <span>{webUIText('Topbar.Saving')}</span>
                </div>
              )}
            </div>

            <div className="topbar-right-rail">
              <div className="topbar-actions" data-tutorial-target="ScreenButtonGroup ActionButtonGroup">
                <ScreenButtons
                  activeScreen={activeScreen}
                  onScreenChange={onScreenChange}
                  placement="right"
                />
                {actionButtons.filter((btn) => {
                  const mode = btn.factionMode ?? 'all';
                  return mode === 'all' || (subjectMode ? mode === 'subject' : mode === 'independent');
                }).map((btn) => {
                  const label = webUIText(btn.labelKey);
                  const active = activeScreen === btn.id || (btn.id === 'pinned' && isPinnedOpen) || (btn.id === 'victory' && isVictoryOpen);
                  const className = btn.id === 'pinned' ? 'pinned-toggle-btn' : btn.id === 'victory' ? 'victory-toggle-btn' : '';
                  const handleClick = () => {
                    if (btn.id === 'pinned') onPinnedToggle?.();
                    else if (btn.id === 'victory') onVictoryToggle?.();
                    else onScreenChange?.(btn.id as ScreenId);
                  };
                  return (
                    <Tooltip
                      key={btn.id}
                      content={actionTooltip(btn)}
                      position="bottom"
                      delay={200}
                      variant="sidebar"
                      bubbleClassName="tt-bubble--screen-button"
                    >
                      <IconButton
                        icon={btn.icon}
                        label={label}
                        active={active}
                        className={className}
                        tutorialTarget={btn.tutorialTarget}
                        onClick={handleClick}
                        badge={btn.id === 'pinned' ? pinnedCount : undefined}
                      />
                    </Tooltip>
                  );
                })}
              </div>

              <div className="topbar-right">
                <ImperialStandingIndicator
                  playerFaction={playerFaction}
                  onOpenSubjectScreen={() => onScreenChange?.('faction')}
                  tooltipDisabled={activeScreen === 'governor-faction-overview'}
                />
                {!subjectMode && <BureaucraticThroughputHudValue onOpen={onOpenBureaucracyOverview} />}
                <ResourceDisplay />
              </div>
            </div>
          </header>

          <div className="topbar-portrait-slot" data-tutorial-target="LeaderPortraitSlot">
            {portraitNode}
          </div>
          <img
            src="/assets/ui-shadowed/T_TopNavbar_Left.png"
            className="topbar-portrait-frame"
            alt=""
            draggable={false}
          />
        </div>
      </div>
      <DemoTimer />
    </>
  );
};

export default React.memo(TopBar);

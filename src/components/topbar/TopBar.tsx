import React from 'react';
import ScreenButtons, { type ScreenId } from './ScreenButtons';
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
import './TopBar.css';

import { webUIText } from '../../localization/WebUITextContext';

interface ActionButtonConfig {
  id: 'build' | 'victory' | 'pinned';
  labelKey: string;
  icon: string;
  tooltipBodyKey: string;
  tooltipLineKeys?: readonly string[];
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
  const { isPaused, speed: contextSpeed, saveSerial } = useGameState();
  const { togglePause, setSpeed: contextSetSpeed, openSidebar } = useGameActions();
  const playerFaction = usePlayerFactionSummary();
  const subjectMode = playerFaction?.diplomaticStatus === 'subject';
  const playerCharacterId = playerFaction?.rulerId ?? null;

  const speed: Speed = isPaused ? 0 : (contextSpeed as Speed);
  const playerCharacterName = playerFaction?.rulerName ?? playerFaction?.name ?? webUIText("Auto.Fix.VarExprFallback.componentstopbarTopBar.51.1");

  const handleSpeedChange = (newSpeed: Speed) => {
    if (newSpeed === 0) {
      togglePause();
    } else if (isPaused) {
      // Unpausing - set speed
      contextSetSpeed(newSpeed as 1 | 2 | 4);
    } else {
      contextSetSpeed(newSpeed as 1 | 2 | 4);
    }
  };

  const handlePortraitMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!playerCharacterId) return;
    playSound('click');
    openSidebar('character', playerCharacterId);
  };

  const handlePortraitClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const actionTooltip = (button: ActionButtonConfig): TooltipContent => {
    const lines = button.tooltipLineKeys?.map<TooltipLine>(key => ({ label: webUIText(key) })) ?? [];
    return {
      title: webUIText(button.labelKey),
      body: <ScreenButtonTooltipBody body={webUIText(button.tooltipBodyKey)} lines={lines} />,
    };
  };

  const portraitButton = (
    <button
      type="button"
      className="topbar-portrait"
      data-tutorial-target="LeaderPortrait"
      onMouseDown={handlePortraitMouseDown}
      onClick={handlePortraitClick}
      disabled={!playerCharacterId}
      aria-label={webUIText("Auto.Attr.componentstopbarTopBar.75.1", { PlayerCharacterName: playerCharacterName })}
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

  return (
    <>
      <header className="topbar">
        {/* Left bar panel (Right asset mirrored) */}
        <img
          src="/assets/ui-shadowed/T_TopNavbar_Right.png"
          className="topbar-bg-right"
          alt=""
          draggable={false}
        />

      {/* Right panel with portrait circle (Left asset mirrored) */}
      <img
        src="/assets/ui-shadowed/T_TopNavbar_Left.png"
        className="topbar-bg-left"
        alt=""
        draggable={false}
      />

      {/* Left: screen buttons */}
      <div className="topbar-left" data-tutorial-target="ScreenButtonGroup">
        <ScreenButtons
          activeScreen={activeScreen}
          onScreenChange={onScreenChange}
        />
      </div>

      {/* Center: speed controls + date with centre border bg */}
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

      {/* Right: screen and action buttons */}
      <div className="topbar-actions" data-tutorial-target="ScreenButtonGroup ActionButtonGroup">
        <ScreenButtons
          activeScreen={activeScreen}
          onScreenChange={onScreenChange}
          placement="right"
        />
        {actionButtons.filter(btn => {
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

      {/* Far right: standing and resources */}
      <div className="topbar-right">
        <ImperialStandingIndicator
          playerFaction={playerFaction}
          onOpenSubjectScreen={() => onScreenChange?.('faction')}
          tooltipDisabled={activeScreen === 'governor-faction-overview'}
        />
        {!subjectMode && <BureaucraticThroughputHudValue onOpen={onOpenBureaucracyOverview} />}
        <ResourceDisplay />
      </div>
      </header>

      {/* Kept outside the topbar stacking context so it remains above sidebars. */}
      <div className="topbar-portrait-slot" data-tutorial-target="LeaderPortraitSlot">
        {playerCharacterId ? (
          <PersonTooltip characterId={playerCharacterId} position="left" delay={200}>
            {portraitButton}
          </PersonTooltip>
        ) : (
          portraitButton
        )}
      </div>
      <img
        src="/assets/ui-shadowed/T_TopNavbar_Left.png"
        className="topbar-portrait-frame"
        alt=""
        draggable={false}
      />
      <DemoTimer />
    </>
  );
};

export default React.memo(TopBar);

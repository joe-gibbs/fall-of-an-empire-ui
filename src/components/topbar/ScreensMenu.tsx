import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { bridgeEvents } from '../../bridge/core/bridgeEvents';
import { usePlayerFactionSummary } from '../../data-source/index';
import { getAllTopbarButtons, isVisibleForFactionMode } from '../../registry/index';
import type { TopbarButtonRegistration } from '../../registry/index';
import { useAnchoredDropdown } from '../../hooks/useAnchoredDropdown';
import { playSound } from '../../hooks/useSound';
import { WebkilnAssetPath } from '../../utils/assets';
import {
  TUTORIAL_REVEAL_SCREENS_MENU,
  type TutorialHudRevealDetail,
} from '../../utils/tutorialHudReveal';
import { useWebUIText, type WebUITextFormatter } from '../../localization/WebUITextContext';
import FactionRoundel from '../common/entities/FactionRoundel';
import FactionTooltip from '../common/tooltips/FactionTooltip';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import { requestGamepadFocusRefresh } from '../../input/gamepadFocusEvents';
import { openWorldSearch } from '../hud/panels/openWorldSearch';
import './ScreensMenu.css';

export type ScreenMenuId = string;

interface ScreensMenuProps {
  activeScreen?: string | null;
  onScreenChange?: (screen: string) => void;
  onPinnedToggle?: () => void;
  isPinnedOpen?: boolean;
  pinnedCount?: number;
  onVictoryToggle?: () => void;
  isVictoryOpen?: boolean;
  subjectMode?: boolean;
}

const FACTION_BUTTON_ID = 'faction';
const FACTION_FALLBACK_ICON = '/assets/icons/I_Domain.png';
const RELIGION_BUTTON_ID = 'religion';
const ACHIEVEMENTS_BUTTON_ID = 'achievements';
const EXIT_DURATION_MS = 120;

interface MenuEntry {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onSelect: () => void;
  tutorialTarget?: string;
}

function localizeButtonLabel(
  button: Pick<TopbarButtonRegistration, 'label' | 'labelKey'>,
  t: WebUITextFormatter,
): string {
  return button.labelKey ? t(button.labelKey) : button.label;
}

function resolveScreenButtonIcon(
  button: TopbarButtonRegistration,
  playerReligionId: string | undefined,
): string {
  if (button.id === RELIGION_BUTTON_ID && playerReligionId) {
    return WebkilnAssetPath(`/assets/religions/${playerReligionId}.png`) ?? button.icon;
  }
  return button.icon;
}

const ScreensMenu: React.FC<ScreensMenuProps> = ({
  activeScreen = null,
  onScreenChange,
  onPinnedToggle,
  isPinnedOpen = false,
  pinnedCount = 0,
  onVictoryToggle,
  isVictoryOpen = false,
  subjectMode = false,
}) => {
  const t = useWebUIText();
  const playerFaction = usePlayerFactionSummary();
  const [open, setOpen] = useState(false);
  const [steamAchievementsAvailable, setSteamAchievementsAvailable] = useState<boolean | null>(null);

  const { mounted, closing, style, setTriggerRef, setPopupRef } = useAnchoredDropdown({
    open,
    onClose: () => setOpen(false),
    durationMs: EXIT_DURATION_MS,
    // Fixed below the trigger so overflow/clipping on the compact strip cannot hide it.
    position: 'below-left',
    offset: 6,
    maxPopupHeight: 420,
    escapeId: 'hud.screens-menu',
  });

  useEffect(() => {
    let cancelled = false;
    const apply = (response: { steamAvailable: boolean }) => {
      if (!cancelled) setSteamAchievementsAvailable(response.steamAvailable);
    };
    const unsubscribe = onBridgeEvent('game.achievement_events', apply);
    bridgeCall('game.achievement_events').then(apply).catch(acknowledgeBridgeFailure);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const openMenu = () => setOpen(true);
    bridgeEvents.addEventListener('ui.gamepad_open_screens_menu', openMenu);
    return () => bridgeEvents.removeEventListener('ui.gamepad_open_screens_menu', openMenu);
  }, []);

  useEffect(() => {
    if (mounted) requestGamepadFocusRefresh();
  }, [mounted]);

  // Tutorial spotlight: mount menu items when a compact-HUD target lives only inside the panel.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TutorialHudRevealDetail>).detail;
      if (!detail?.tokens?.length) return;
      setOpen(true);
    };
    window.addEventListener(TUTORIAL_REVEAL_SCREENS_MENU, handler);
    return () => window.removeEventListener(TUTORIAL_REVEAL_SCREENS_MENU, handler);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const entries = useMemo((): MenuEntry[] => {
    const registrations = getAllTopbarButtons().filter((b) => (
      b.id !== FACTION_BUTTON_ID
      && (b.id !== ACHIEVEMENTS_BUTTON_ID || steamAchievementsAvailable === false)
      && isVisibleForFactionMode(b, subjectMode)
    ));

    const screenEntries: MenuEntry[] = registrations.map((btn) => ({
      id: btn.id,
      label: localizeButtonLabel(btn, t),
      icon: resolveScreenButtonIcon(btn, playerFaction?.religionId),
      active: activeScreen === btn.id,
      tutorialTarget: `ScreenButton:${btn.id}`,
      onSelect: () => {
        playSound('click');
        onScreenChange?.(btn.id);
        close();
      },
    }));

    const extras: MenuEntry[] = [
      {
        id: 'build',
        label: t('Topbar.BuildQueue'),
        icon: '/assets/icons/I_BuildingsQuickButton.png',
        active: activeScreen === 'build',
        tutorialTarget: 'BuildQueueButton',
        onSelect: () => {
          playSound('click');
          onScreenChange?.('build');
          close();
        },
      },
    ];

    if (!subjectMode) {
      extras.push({
        id: 'victory',
        label: t('Topbar.VictoryConditions'),
        icon: '/assets/icons/Victory/I_Victory_Gold.png',
        active: isVictoryOpen || activeScreen === 'victory',
        tutorialTarget: 'VictoryConditionsButton',
        onSelect: () => {
          playSound('click');
          // Close the menu first so the victory panel can mount against the anchor.
          close();
          window.setTimeout(() => onVictoryToggle?.(), 0);
        },
      });
    }

    extras.push({
      id: 'search',
      label: t('WorldSearch.Title'),
      icon: '/assets/icons/I_SearchQuickButton.png',
      active: false,
      tutorialTarget: 'WorldSearchButton',
      onSelect: () => {
        playSound('click');
        close();
        window.setTimeout(() => openWorldSearch(), 0);
      },
    });

    extras.push({
      id: 'pinned',
      label: t('Topbar.PinnedItems'),
      icon: '/assets/icons/I_Pin_Pinned.png',
      active: isPinnedOpen,
      badge: pinnedCount > 0 ? pinnedCount : undefined,
      tutorialTarget: 'PinnedItemsToggleButton',
      onSelect: () => {
        playSound('click');
        close();
        window.setTimeout(() => onPinnedToggle?.(), 0);
      },
    });

    // Faction overview stays first; then other screens, then utility actions.
    const factionEntry: MenuEntry = {
      id: FACTION_BUTTON_ID,
      label: t('Topbar.Faction'),
      icon: FACTION_FALLBACK_ICON,
      active: activeScreen === FACTION_BUTTON_ID,
      tutorialTarget: 'ScreenButton:faction',
      onSelect: () => {
        playSound('click');
        onScreenChange?.(FACTION_BUTTON_ID);
        close();
      },
    };

    return [factionEntry, ...screenEntries, ...extras];
  }, [
    activeScreen,
    close,
    isPinnedOpen,
    isVictoryOpen,
    onPinnedToggle,
    onScreenChange,
    onVictoryToggle,
    pinnedCount,
    playerFaction?.religionId,
    steamAchievementsAvailable,
    subjectMode,
    t,
  ]);

  const factionLabel = t('Topbar.Faction');
  const menuOpen = open && !closing;
  const triggerButton = (
    <button
      type="button"
      className={`icon-button screen-button-faction screens-menu-trigger${menuOpen ? ' icon-button--active screen-button-faction--active' : ''}${activeScreen === FACTION_BUTTON_ID ? ' screen-button-faction--active' : ''}`}
      data-tutorial-target="ScreenButtonGroup ScreenButton:faction"
      aria-label={factionLabel}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      onClick={() => {
        playSound('click');
        setOpen((v) => !v);
      }}
    >
      {playerFaction ? (
        <FactionRoundel
          factionId={playerFaction.id}
          colour={playerFaction.colour}
          secondaryColour={playerFaction.secondaryColour}
          cultureGroup={playerFaction.cultureGroup}
          emblem={playerFaction.emblem}
          diplomaticStatus={playerFaction.diplomaticStatus}
          subjectSubtype={playerFaction.subjectSubtype}
          isPlayer={true}
          resolveFaction={false}
          name={playerFaction.name}
          size="md"
          className="screen-button-faction-roundel"
        />
      ) : (
        <img src={FACTION_FALLBACK_ICON} alt="" className="screen-button-faction-fallback-icon" />
      )}
    </button>
  );

  return (
    <div className="screens-menu" ref={setTriggerRef as React.RefCallback<HTMLDivElement>}>
      {/*
        Pinned / victory panels anchor on these classes in the full top bar.
        Compact mode has no separate toggle buttons, so the faction menu host
        carries the same anchors so those dropdowns still open and position.
      */}
      <span className="pinned-toggle-btn victory-toggle-btn screens-menu-dropdown-anchor" aria-hidden="true" />
      <FactionTooltip
        factionId={playerFaction?.id}
        factionName={playerFaction?.name}
        position="bottom"
        delay={200}
      >
        {triggerButton}
      </FactionTooltip>

      {mounted && (
        <div
          className={`screens-menu-panel${closing ? ' screens-menu-panel--exiting' : ''}`}
          ref={setPopupRef}
          style={style}
          role="menu"
          data-focus-root
          data-focus-group="vertical"
          data-focus-priority="260"
          aria-label={factionLabel}
        >
          <StyledScrollArea className="screens-menu-scroll" viewportClassName="screens-menu-scroll-viewport" variant="inline">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                aria-current={entry.active || undefined}
                className={`screens-menu-item${entry.active ? ' screens-menu-item--active' : ''}`}
                data-tutorial-target={entry.tutorialTarget}
                onClick={entry.onSelect}
              >
                <img src={WebkilnAssetPath(entry.icon) ?? entry.icon} alt="" className="screens-menu-item-icon" />
                <span className="screens-menu-item-label">{entry.label}</span>
                {entry.badge != null && (
                  <span className="screens-menu-item-badge">{entry.badge > 99 ? '99+' : entry.badge}</span>
                )}
              </button>
            ))}
          </StyledScrollArea>
        </div>
      )}
    </div>
  );
};

export default React.memo(ScreensMenu);

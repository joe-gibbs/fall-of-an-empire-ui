import React, { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { playSound } from '../../hooks/useSound';
import Tooltip from '../common/tooltips/Tooltip';
import type { TooltipContent, TooltipLine } from '../common/tooltips/Tooltip';
import IconButton from '../common/buttons/IconButton';
import FactionRoundel from '../common/entities/FactionRoundel';
import FactionTooltip from '../common/tooltips/FactionTooltip';
import { usePlayerFactionSummary } from '../../data-source/index';
import { getAllTopbarButtons, isVisibleForFactionMode } from '../../registry/index';
import type { TopbarButtonRegistration } from '../../registry/index';
import { WebkilnAssetPath } from '../../utils/assets';
import { useWebUIText, type WebUITextFormatter } from '../../localization/WebUITextContext';
import { ScreenButtonTooltipBody } from './ScreenButtonTooltip';
import './ScreenButtons.css';

/**
 * Topbar button ids are free-form strings so mods can register their own.
 * The base game uses: 'military', 'economy', 'characters', 'diplomacy',
 * 'faction', 'religion', 'ledger', 'powerblocs', 'familytree', 'encyclopedia'.
 */
export type ScreenId = string;

interface ScreenButtonsProps {
  activeScreen?: string | null;
  onScreenChange?: (screen: string) => void;
  placement?: 'left' | 'right';
}

/** The faction button is special: it shows a FactionRoundel instead of a
 *  flat icon. We pin its id so the main list can skip it. */
const FACTION_BUTTON_ID = 'faction';
const FACTION_FALLBACK_ICON = '/assets/icons/I_Domain.png';
const FACTION_LABEL_KEY = 'Topbar.Faction';
const RELIGION_BUTTON_ID = 'religion';
const ACHIEVEMENTS_BUTTON_ID = 'achievements';
const LEGACY_TOPBAR_TARGETS: Record<string, string[]> = {
  characters: ['CharacterSearchButton'],
  diplomacy: ['DiplomacyButton'],
  economy: ['EconomyButton'],
  encyclopedia: ['EncyclopediaButton'],
  faction: ['FactionButton'],
  family: ['FamilyTreeButton'],
  ledger: ['LedgerButton', 'SettlementFinderButton'],
  military: ['MilitaryButton'],
  powerblocs: ['PowerBlocsButton'],
  religion: ['ReligionButton'],
};

function localizeButtonLabel(button: Pick<TopbarButtonRegistration, 'label' | 'labelKey'>, t: WebUITextFormatter): string {
  return button.labelKey ? t(button.labelKey) : button.label;
}

function screenTooltipContent(button: Pick<TopbarButtonRegistration, 'label' | 'labelKey' | 'tooltip'>, t: WebUITextFormatter): React.ReactNode | TooltipContent {
  if (!button.tooltip) return localizeButtonLabel(button, t);

  const title = button.tooltip.titleKey ? t(button.tooltip.titleKey) : button.tooltip.title;
  const body = button.tooltip.bodyKey ? t(button.tooltip.bodyKey) : button.tooltip.body;
  const lines = button.tooltip.lines?.map<TooltipLine>(line => ({
    label: line.labelKey ? t(line.labelKey) : line.label,
    labelColor: line.labelColor,
    labelIcon: line.labelIcon,
    value: line.valueKey ? t(line.valueKey) : line.value,
    valueColor: line.valueColor,
    valueIcon: line.valueIcon,
    isHeader: line.isHeader,
  }));
  const footer = button.tooltip.footerKey ? t(button.tooltip.footerKey) : button.tooltip.footer;
  const useScreenButtonFlow = lines?.length && lines.every(line => (
    !line.labelIcon
    && !line.value
    && !line.valueIcon
    && !line.isHeader
    && !line.subTooltip
  ));

  if (useScreenButtonFlow) {
    return {
      title,
      body: <ScreenButtonTooltipBody body={body} lines={lines} />,
      footer,
    };
  }

  return {
    title,
    body,
    lines,
    footer,
  };
}

function resolveScreenButtonIcon(button: TopbarButtonRegistration, playerReligionId: string | undefined): string {
  if (button.id === RELIGION_BUTTON_ID && playerReligionId) {
    return WebkilnAssetPath(`/assets/religions/${playerReligionId}.png`);
  }

  return button.icon;
}

function topbarButtonTargets(id: string): string {
  return [`ScreenButton:${id}`, `${id}Button`, ...(LEGACY_TOPBAR_TARGETS[id] ?? [])].join(' ');
}

const ScreenButtons: React.FC<ScreenButtonsProps> = ({
  activeScreen = null,
  onScreenChange,
  placement = 'left',
}) => {
  const t = useWebUIText();
  const playerFaction = usePlayerFactionSummary();
  const [steamAchievementsAvailable, setSteamAchievementsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applyAchievementAvailability = (response: { steamAvailable: boolean }) => {
      if (!cancelled) setSteamAchievementsAvailable(response.steamAvailable);
    };
    const unsubscribe = onBridgeEvent('game.achievement_events', applyAchievementAvailability);

    bridgeCall('game.achievement_events')
      .then(applyAchievementAvailability)
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const registrations = getAllTopbarButtons();
  const subjectMode = playerFaction?.diplomaticStatus === 'subject';
  const factionButton = registrations.find(b => b.id === FACTION_BUTTON_ID);
  const showFactionButton = Boolean(factionButton && isVisibleForFactionMode(factionButton, subjectMode));
  const buttons = registrations.filter(b => (
    b.id !== FACTION_BUTTON_ID
    && (b.id !== ACHIEVEMENTS_BUTTON_ID || steamAchievementsAvailable === false)
    && (b.placement ?? 'left') === placement
    && isVisibleForFactionMode(b, subjectMode)
  ));
  const factionButtonLabel = factionButton ? localizeButtonLabel(factionButton, t) : t(FACTION_LABEL_KEY);
  const playerFactionId = playerFaction?.id ?? null;
  const playerReligionId = playerFaction?.religionId;
  const factionButtonNode = (
    <button
      type="button"
      className={`icon-button screen-button-faction ${activeScreen === FACTION_BUTTON_ID ? 'icon-button--active screen-button-faction--active' : ''}`}
      data-tutorial-target={topbarButtonTargets(FACTION_BUTTON_ID)}
      data-tutorial-satisfied={activeScreen === FACTION_BUTTON_ID ? 'true' : undefined}
      onMouseDown={() => { playSound('click'); onScreenChange?.(FACTION_BUTTON_ID); }}
      aria-label={factionButtonLabel}
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

  if (placement !== 'left' && buttons.length === 0) return null;

  return (
    <div className="screen-buttons">
      {placement === 'left' && showFactionButton && (
        <FactionTooltip factionId={playerFactionId ?? undefined} factionName={playerFaction?.name} position="bottom" delay={200}>
          {factionButtonNode}
        </FactionTooltip>
      )}
      {buttons.map((btn) => (
        <Tooltip key={btn.id} content={screenTooltipContent(btn, t)} position="bottom" delay={200} variant="sidebar" bubbleClassName="tt-bubble--screen-button">
          <IconButton
            icon={resolveScreenButtonIcon(btn, playerReligionId)}
            label={localizeButtonLabel(btn, t)}
            active={activeScreen === btn.id}
            tutorialTarget={topbarButtonTargets(btn.id)}
            onClick={() => onScreenChange?.(btn.id)}
          />
        </Tooltip>
      ))}
    </div>
  );
};

export default React.memo(ScreenButtons);

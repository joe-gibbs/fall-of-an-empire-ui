import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { useFactionInteractionsBridge, type FactionInteractionView } from '../../../bridge/diplomacy/useFactionInteractionsBridge';
import {
  mapPersonInteractionEntry,
  type PersonInteractionView,
} from '../../../bridge/characters/usePersonInteractionsBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useOptionalGameActions } from '../../../context/GameContext';
import type { Notification } from '../../../data/types';
import { playSound } from '../../../hooks/useSound';
import { successChanceColour } from '../../../utils/colorFormatters';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { webUIText } from '../../../localization/WebUITextContext';
import type { TooltipContent, TooltipLine } from '../tooltips/Tooltip';
import Tooltip from '../tooltips/Tooltip';
import InteractionEffectsTooltip from '../tooltips/InteractionEffectsTooltip';
import { dismissSharedTooltips } from '../tooltips/tooltipEvents';
import './QuickInteractionMenu.css';

type QuickMenuKind = 'person' | 'faction';
type QuickInteraction = PersonInteractionView | FactionInteractionView;

interface MenuPoint {
  x: number;
  y: number;
}

interface UseQuickInteractionMenuOptions {
  kind: QuickMenuKind;
  targetId?: string;
}

interface QuickInteractionMenuResult<T extends HTMLElement> {
  onContextMenu?: (event: React.MouseEvent<T>) => void;
  node: React.ReactNode;
}

const MENU_WIDTH_REM = 15.5;

function canUseTargetId(targetId?: string): targetId is string {
  return Boolean(targetId && targetId.length >= 32);
}

function isFactionInteraction(interaction: QuickInteraction): interaction is FactionInteractionView {
  return 'isEdict' in interaction;
}

function isDirectlyStartable(interaction: QuickInteraction): boolean {
  if (interaction.inProgress) return false;
  if (interaction.availability !== 'available') return false;
  if ('needsGiftSelection' in interaction && interaction.needsGiftSelection) return false;
  if ('needsInitiatorSelection' in interaction && interaction.needsInitiatorSelection) return false;
  if (isFactionInteraction(interaction)) {
    if (interaction.isEdict) return false;
    if (interaction.needsSettlementSelection) return false;
    if (interaction.needsInputSelection) return false;
  }
  return true;
}

function quickInteractions(interactions: QuickInteraction[]): QuickInteraction[] {
  return interactions
    .filter(interaction => interaction.showInQuickInteractionMenu)
    .filter(isDirectlyStartable);
}

function tooltipFor(interaction: QuickInteraction): TooltipContent {
  const lines: TooltipLine[] = [];

  if (interaction.durationDays > 0) {
    const days = Math.round(interaction.durationDays);
    lines.push({
      label: webUIText('Common.Duration'),
      labelIcon: '/assets/icons/I_Speed.png',
      value: webUIText('Common.DayCount', {
        Days: formatNumber(days),
        Unit: webUIText(days === 1 ? 'Common.Day' : 'Common.Days'),
      }),
    });
  }

  if (interaction.goldCost > 0) {
    lines.push({
      label: webUIText('Common.Cost'),
      labelIcon: '/assets/icons/I_Coins.png',
      value: formatNumber(interaction.goldCost),
    });
  }

  if (interaction.successChancePercent > 0 && interaction.successChancePercent < 100) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.310.10'),
      value: formatPercent(interaction.successChancePercent),
      valueColor: successChanceColour(interaction.successChancePercent),
    });
  }

  if (interaction.cooldownDays > 0) {
    lines.push({
      label: webUIText('FactionOverview.Cooldown'),
      labelIcon: '/assets/icons/I_Cooling.png',
      value: webUIText('Common.DayCount', {
        Days: formatNumber(interaction.cooldownDays),
        Unit: webUIText(interaction.cooldownDays === 1 ? 'Common.Day' : 'Common.Days'),
      }),
    });
  }

  return {
    title: interaction.name,
    body: interaction.description,
    lines,
    afterLines: <InteractionEffectsTooltip lines={interaction.effectLines} />,
  };
}

function useMenuPosition(point: MenuPoint | null, itemCount: number): React.CSSProperties | undefined {
  return useMemo(() => {
    if (!point || typeof window === 'undefined') return undefined;

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize || '16') || 16;
    const menuWidth = MENU_WIDTH_REM * rem;
    const estimatedMenuHeight = Math.min(
      window.innerHeight - 16,
      (0.616 + itemCount * 2.46 + Math.max(0, itemCount - 1) * 0.154) * rem,
    );
    const left = Math.min(point.x, Math.max(8, window.innerWidth - menuWidth - 8));
    const top = Math.min(point.y, Math.max(8, window.innerHeight - estimatedMenuHeight - 8));
    return { left, top };
  }, [itemCount, point]);
}

function usePersonQuickInteractions(personId: string | null, requestKey: number): PersonInteractionView[] {
  const [state, setState] = useState<{ personId: string; interactions: PersonInteractionView[] } | null>(null);

  useEffect(() => {
    if (!personId) return undefined;

    let cancelled = false;
    void bridgeCall('game.get_person_quick_interactions', { personId })
      .then((data) => {
        if (cancelled) return;
        setState({
          personId: data.personId,
          interactions: data.interactions.map(mapPersonInteractionEntry),
        });
      })
      .catch((error) => {
        if (!cancelled) acknowledgeBridgeFailure(error);
      });

    return () => {
      cancelled = true;
    };
  }, [personId, requestKey]);

  return state?.personId === personId ? state.interactions : [];
}

function quickInteractionNotificationType(kind: QuickMenuKind): Notification['type'] {
  return kind === 'person' ? 'character' : 'diplomatic';
}

export function useQuickInteractionMenu<T extends HTMLElement>({
  kind,
  targetId,
}: UseQuickInteractionMenuOptions): QuickInteractionMenuResult<T> {
  const [requestedTargetId, setRequestedTargetId] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [point, setPoint] = useState<MenuPoint | null>(null);
  const personQuickInteractions = usePersonQuickInteractions(kind === 'person' ? requestedTargetId : null, requestKey);
  const factionBridge = useFactionInteractionsBridge(kind === 'faction' ? requestedTargetId : null);
  const gameActions = useOptionalGameActions();
  const hasViewAction = canUseTargetId(requestedTargetId ?? undefined) && Boolean(gameActions);
  const viewLabel = kind === 'person'
    ? webUIText('QuickInteraction.ViewCharacter')
    : webUIText('QuickInteraction.ViewFaction');

  const interactions = useMemo(() => {
    if (kind === 'person') {
      return quickInteractions(personQuickInteractions);
    }
    return quickInteractions(factionBridge.state?.interactions ?? []);
  }, [factionBridge.state?.interactions, kind, personQuickInteractions]);
  const itemCount = interactions.length + (hasViewAction ? 1 : 0);
  const style = useMenuPosition(point, itemCount);

  const close = useCallback(() => {
    setPoint(null);
  }, []);

  const onContextMenu = useCallback((event: React.MouseEvent<T>) => {
    if (!canUseTargetId(targetId)) return;
    event.preventDefault();
    event.stopPropagation();
    playSound('click');
    dismissSharedTooltips();
    setRequestedTargetId(targetId);
    setRequestKey(key => key + 1);
    setPoint({ x: event.clientX, y: event.clientY });
  }, [targetId]);

  useEffect(() => {
    if (!point) return undefined;

    const handlePointerDown = () => close();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [close, point]);

  const start = useCallback((interaction: QuickInteraction) => {
    close();
    playSound('confirm');
    const notifyOutcome = (succeeded: boolean, message?: string) => {
      gameActions?.addNotification({
        title: webUIText(succeeded ? 'QuickInteraction.ActionSucceeded' : 'QuickInteraction.ActionFailed'),
        description: message || webUIText(succeeded
          ? 'QuickInteraction.ActionSucceededFallback'
          : 'QuickInteraction.ActionFailedFallback'),
        type: quickInteractionNotificationType(kind),
      });
    };
    const notifyRejected = (message?: string) => {
      gameActions?.addNotification({
        title: webUIText('QuickInteraction.ActionCouldNotStart'),
        description: message || webUIText('QuickInteraction.ActionCouldNotStartFallback'),
        type: quickInteractionNotificationType(kind),
      });
    };

    if (kind === 'person') {
      void bridgeCall('game.start_person_interaction', {
        personId: requestedTargetId ?? '',
        interactionId: interaction.id,
        initiatorPersonId: '',
        giftTypeIndex: -1,
      }).then((response) => {
        if (response.completed) {
          notifyOutcome(response.succeeded, response.message);
        } else if (!response.started) {
          notifyRejected(response.message);
        }
      }).catch((error) => {
        acknowledgeBridgeFailure(error);
        notifyRejected();
      });
    } else {
      void factionBridge.start(interaction.id).then((response) => {
        if (response?.completed) {
          notifyOutcome(response.succeeded, response.message);
        } else if (!response?.started) {
          notifyRejected(response?.message);
        }
      });
    }
  }, [close, factionBridge, gameActions, kind, requestedTargetId]);

  const viewTarget = useCallback(() => {
    const targetIdForView = requestedTargetId ?? undefined;
    if (!canUseTargetId(targetIdForView) || !gameActions) return;
    close();
    if (kind === 'person') {
      gameActions.openSidebar('character', targetIdForView);
    } else {
      gameActions.openSidebar('diplomacy', targetIdForView);
    }
  }, [close, gameActions, kind, requestedTargetId]);

  const node = point && style && (hasViewAction || interactions.length > 0) && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="quick-interaction-menu"
        style={style}
        onPointerEnter={dismissSharedTooltips}
        onPointerDown={event => event.stopPropagation()}
        onContextMenu={event => event.preventDefault()}
      >
        {hasViewAction && (
          <button
            type="button"
            className="quick-interaction-menu__button"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              viewTarget();
            }}
          >
            {viewLabel}
          </button>
        )}
        {interactions.map(interaction => (
          <Tooltip
            key={interaction.id}
            content={tooltipFor(interaction)}
            position="right"
            delay={120}
            variant="sidebar"
            bubbleClassName="quick-interaction-menu__bubble"
            wrapperClassName="quick-interaction-menu__tooltip"
          >
            <button
              type="button"
              className="quick-interaction-menu__button"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                start(interaction);
              }}
            >
              {interaction.name}
            </button>
          </Tooltip>
        ))}
      </div>,
      document.body,
    )
    : null;

  return {
    onContextMenu: canUseTargetId(targetId) ? onContextMenu : undefined,
    node,
  };
}

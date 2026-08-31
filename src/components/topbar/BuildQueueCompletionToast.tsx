import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { activateNotification, dismissNotificationOnBridge } from '../../bridge/app/useNotificationsBridge';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import { useAnchoredDropdown } from '../../hooks/useAnchoredDropdown';
import { playSound } from '../../hooks/useSound';
import { webUIText } from '../../localization/WebUITextContext';
import { isBuildQueueCompletionNotification } from '../../notifications/buildQueueCompletion';
import { WebkilnAssetPath } from '../../utils/assets';
import { toRootRem } from '../../utils/cssUnits';
import { renderEventTextChunk } from '../../utils/eventTextFlow';
import { renderRichText } from '../../utils/richText';
import type { Notification } from '../../data/types';
import { UI_MOTION } from '../../config/motion';
import CloseButton from '../common/buttons/CloseButton';
import GameButton from '../common/buttons/GameButton';
import './BuildQueueCompletionToast.css';

interface BuildQueueCompletionToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onLinkClick?: (type: string, id: string) => void;
}

const DISPLAY_DURATION_MS = 5000;
const EXIT_DURATION_MS = 220;
const TOAST_WIDTH_PX = 296;

function queueCompletionAnchor(): DOMRect | null {
  const exact = document.querySelector('[data-tutorial-target="BuildQueueButton"]');
  if (exact) return exact.getBoundingClientRect();
  const menuTrigger = document.querySelector('.screens-menu-trigger');
  if (menuTrigger) return menuTrigger.getBoundingClientRect();
  const actions = document.querySelector('[data-tutorial-target="ScreenButtonGroup ActionButtonGroup"]');
  if (actions) return actions.getBoundingClientRect();
  return null;
}

export default function BuildQueueCompletionToast({
  notifications,
  onDismiss,
  onLinkClick,
}: BuildQueueCompletionToastProps) {
  const queued = useMemo(
    () => notifications.filter(isBuildQueueCompletionNotification),
    [notifications],
  );
  const current = queued[0] ?? null;
  const { settings } = useSettingsBridge();
  const [closing, setClosing] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const dismissTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastRightMouseDownRef = useRef(0);
  const {
    mounted: optionsMounted,
    closing: optionsClosing,
    style: optionsStyle,
    setTriggerRef,
    setPopupRef,
    computePosition,
  } = useAnchoredDropdown({
    open: optionsOpen,
    onClose: () => setOptionsOpen(false),
    durationMs: UI_MOTION.notificationCloseMs,
    position: 'below-left',
    offset: 6,
    useRootRem: true,
    minSpaceBelow: 130,
    maxPopupHeight: 220,
    closeOnScroll: true,
    escapeId: current ? `buildq.completion.options.${current.id}` : 'buildq.completion.options',
  });

  const clearTimers = useCallback(() => {
    if (dismissTimer.current !== undefined) {
      window.clearTimeout(dismissTimer.current);
      dismissTimer.current = undefined;
    }
    if (closeTimer.current !== undefined) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  const finishClose = useCallback((id: string) => {
    clearTimers();
    dismissNotificationOnBridge(id);
    onDismiss(id);
    setClosing(false);
    setOptionsOpen(false);
  }, [clearTimers, onDismiss]);

  const beginClose = useCallback((id: string) => {
    if (closeTimer.current !== undefined) return;
    if (dismissTimer.current !== undefined) {
      window.clearTimeout(dismissTimer.current);
      dismissTimer.current = undefined;
    }
    setOptionsOpen(false);
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined;
      finishClose(id);
    }, EXIT_DURATION_MS);
  }, [finishClose]);

  const measureAnchor = useCallback(() => {
    setAnchor(queueCompletionAnchor());
  }, []);

  const currentId = current?.id;

  useLayoutEffect(() => {
    measureAnchor();
  }, [currentId, measureAnchor]);

  useEffect(() => {
    if (!currentId) return undefined;
    window.addEventListener('resize', measureAnchor);
    return () => window.removeEventListener('resize', measureAnchor);
  }, [currentId, measureAnchor]);

  useEffect(() => {
    if (!currentId) {
      clearTimers();
      setClosing(false);
      return undefined;
    }

    setClosing(false);
    clearTimers();
    const multiplier = settings?.gameplay.notificationDurationMultiplier ?? 1;
    const duration = Math.max(2000, DISPLAY_DURATION_MS * multiplier);
    dismissTimer.current = window.setTimeout(() => {
      dismissTimer.current = undefined;
      beginClose(currentId);
    }, duration);

    return () => {
      clearTimers();
    };
  }, [beginClose, clearTimers, currentId, settings?.gameplay.notificationDurationMultiplier]);

  const handleMuteType = useCallback(() => {
    if (!current?.notificationTypeId) return;
    const typeId = current.notificationTypeId;
    setOptionsOpen(false);
    void bridgeCall('game.set_notification_muted', { typeId, muted: true })
      .catch(acknowledgeBridgeFailure);
    for (const notification of queued) {
      if (notification.notificationTypeId === typeId) {
        dismissNotificationOnBridge(notification.id);
        onDismiss(notification.id);
      }
    }
  }, [current, onDismiss, queued]);

  if (!current) return null;

  const iconPath = current.iconPath || '/assets/icons/I_BuildingsQuickButton.png';
  const notificationTypeLabel = current.notificationTypeLabel
    || current.title
    || webUIText('Notifications.ThisType');
  const left = anchor
    ? Math.min(
      Math.max(anchor.left + (anchor.width / 2), (TOAST_WIDTH_PX / 2) + 8),
      window.innerWidth - (TOAST_WIDTH_PX / 2) - 8,
    )
    : window.innerWidth / 2;
  const top = anchor ? anchor.bottom + 8 : 56;
  const optionsPositionStyle = optionsStyle ? { ...optionsStyle, minWidth: undefined } : undefined;

  const optionsPopover = optionsMounted ? createPortal(
    <div
      ref={setPopupRef}
      className="notification-options-popover-positioner"
      style={optionsPositionStyle}
      onClick={event => event.stopPropagation()}
      onContextMenu={event => { event.preventDefault(); event.stopPropagation(); }}
    >
      <div className={`notification-options-popover${optionsClosing ? ' notification-options-popover--closing' : ''}`}>
        <div className="notification-options-popover__header">
          <span className="notification-options-popover__title">
            {webUIText('Notifications.OptionsTitle')}
          </span>
          <CloseButton size="sm" onClick={() => setOptionsOpen(false)} />
        </div>
        <div className="notification-options-popover__body">
          {current.notificationTypeId ? (
            <>
              <GameButton variant="burgundy" fullWidth className="notification-options-popover__button" onClick={handleMuteType}>
                {webUIText('Notifications.HideAllOfType', { Type: notificationTypeLabel })}
              </GameButton>
              <span className="notification-options-popover__desc">
                {webUIText('Notifications.HideAllOfTypeDescription', { Type: notificationTypeLabel })}
              </span>
            </>
          ) : (
            <span className="notification-options-popover__desc">
              {webUIText('Notifications.TypeUnavailable')}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <aside
        ref={setTriggerRef}
        className="buildq-completion-toast-slot"
        style={{ top: toRootRem(top), left: toRootRem(left), transform: 'translateX(-50%)' }}
        role="status"
        aria-live="polite"
      >
        <div
          key={current.id}
          className={`buildq-completion-toast${closing ? ' buildq-completion-toast--closing' : ''}`}
          data-focus-root
          data-focus-priority="250"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('.buildq-completion-toast-close')) return;
            playSound('click');
            activateNotification(current.id);
            beginClose(current.id);
          }}
          onMouseDown={(event) => {
            if (event.button === 2) {
              lastRightMouseDownRef.current = Date.now();
              event.preventDefault();
              event.stopPropagation();
              playSound('click');
              computePosition();
              setOptionsOpen(true);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (Date.now() - lastRightMouseDownRef.current > 250) {
              playSound('click');
              computePosition();
              setOptionsOpen(true);
            }
          }}
        >
          <img src={WebkilnAssetPath(iconPath)} alt="" className="buildq-completion-toast-icon" draggable={false} />
          <div className="buildq-completion-toast-copy">
            <div className="buildq-completion-toast-title">{current.title}</div>
            {current.description && (
              <div className="buildq-completion-toast-body">
                {renderRichText(current.description, {
                  onLinkClick,
                  keepLinksWithPreviousWord: true,
                  linkClassPrefix: 'event-link',
                  transformText: (chunk, key) => renderEventTextChunk(chunk, `buildq-toast-${current.id}-${key}`),
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            className="buildq-completion-toast-close"
            onClick={(event) => {
              event.stopPropagation();
              playSound('close');
              beginClose(current.id);
            }}
            aria-label={webUIText('Auto.Attr.ComponentsNotificationsNotificationBanner.66.1')}
          >
            <img src="/assets/icons/I_Close.png" alt="" className="buildq-completion-toast-close-icon" draggable={false} />
          </button>
        </div>
      </aside>
      {optionsPopover}
    </>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { activateNotification, dismissNotificationOnBridge } from '../../bridge/app/useNotificationsBridge';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
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
  currentGameDay: number;
  onLinkClick?: (type: string, id: string) => void;
}

interface BuildQueueCompletionToastItemProps {
  notification: Notification;
  closing: boolean;
  staggerMs: number;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onMuteType: (typeId: string) => void;
  onLinkClick?: (type: string, id: string) => void;
}

const MAX_VISIBLE_TOASTS = 5;
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

function BuildQueueCompletionToastItem({
  notification,
  closing,
  staggerMs,
  onActivate,
  onClose,
  onMuteType,
  onLinkClick,
}: BuildQueueCompletionToastItemProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const lastRightMouseDownRef = useRef(0);
  const {
    mounted: optionsMounted,
    closing: optionsClosing,
    style: optionsStyle,
    setTriggerRef,
    setPopupRef,
    computePosition,
  } = useAnchoredDropdown({
    open: optionsOpen && !closing,
    onClose: () => setOptionsOpen(false),
    durationMs: UI_MOTION.notificationCloseMs,
    position: 'below-left',
    offset: 6,
    useRootRem: true,
    minSpaceBelow: 130,
    maxPopupHeight: 220,
    closeOnScroll: true,
    escapeId: `buildq.completion.options.${notification.id}`,
  });

  const iconPath = notification.iconPath || '/assets/icons/I_BuildingsQuickButton.png';
  const notificationTypeId = notification.notificationTypeId;
  const notificationTypeLabel = notification.notificationTypeLabel
    || notification.title
    || webUIText('Notifications.ThisType');
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
          {notificationTypeId ? (
            <>
              <GameButton
                variant="burgundy"
                fullWidth
                className="notification-options-popover__button"
                onClick={() => {
                  setOptionsOpen(false);
                  onMuteType(notificationTypeId);
                }}
              >
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
      <div
        ref={setTriggerRef}
        className={`buildq-completion-toast${closing ? ' buildq-completion-toast--closing' : ''}`}
        style={{ animationDelay: closing ? '0s' : `${staggerMs}ms` }}
        data-focus-root
        data-focus-priority="250"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('.buildq-completion-toast-close')) return;
          playSound('click');
          onActivate(notification.id);
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
          <div className="buildq-completion-toast-title">{notification.title}</div>
          {notification.description && (
            <div className="buildq-completion-toast-body">
              {renderRichText(notification.description, {
                onLinkClick,
                keepLinksWithPreviousWord: true,
                linkClassPrefix: 'event-link',
                transformText: (chunk, key) => renderEventTextChunk(chunk, `buildq-toast-${notification.id}-${key}`),
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
            onClose(notification.id);
          }}
          aria-label={webUIText('Auto.Attr.ComponentsNotificationsNotificationBanner.66.1')}
        >
          <img src="/assets/icons/I_Close.png" alt="" className="buildq-completion-toast-close-icon" draggable={false} />
        </button>
      </div>
      {optionsPopover}
    </>
  );
}

export default function BuildQueueCompletionToast({
  notifications,
  onDismiss,
  currentGameDay,
  onLinkClick,
}: BuildQueueCompletionToastProps) {
  const queued = useMemo(
    () => notifications.filter(isBuildQueueCompletionNotification),
    [notifications],
  );
  const visible = useMemo(
    () => queued.slice(0, MAX_VISIBLE_TOASTS),
    [queued],
  );
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());
  const closeTimersRef = useRef<Record<string, number>>({});

  const measureAnchor = useCallback(() => {
    setAnchor(queueCompletionAnchor());
  }, []);

  const visibleKey = visible.map(notification => notification.id).join('|');

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      measureAnchor();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visibleKey, measureAnchor]);

  useEffect(() => {
    if (visible.length === 0) return undefined;
    window.addEventListener('resize', measureAnchor);
    return () => window.removeEventListener('resize', measureAnchor);
  }, [visible.length, measureAnchor]);

  const dismissNow = useCallback((id: string) => {
    const timer = closeTimersRef.current[id];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete closeTimersRef.current[id];
    }
    dismissNotificationOnBridge(id);
    onDismiss(id);
    setClosingIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [onDismiss]);

  const finishClose = useCallback((id: string) => {
    dismissNow(id);
  }, [dismissNow]);

  const beginClose = useCallback((id: string) => {
    if (closeTimersRef.current[id] !== undefined) return;
    setClosingIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    closeTimersRef.current[id] = window.setTimeout(() => {
      delete closeTimersRef.current[id];
      finishClose(id);
    }, EXIT_DURATION_MS);
  }, [finishClose]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(closeTimersRef.current)) {
        window.clearTimeout(timer);
      }
      closeTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (currentGameDay <= 0) return undefined;
    const expiredIds: string[] = [];
    for (const notification of queued) {
      if (
        typeof notification.expiresOnDay === 'number'
        && notification.expiresOnDay <= currentGameDay
        && !closingIds.has(notification.id)
      ) {
        expiredIds.push(notification.id);
      }
    }
    if (expiredIds.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      for (const id of expiredIds) {
        beginClose(id);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [beginClose, closingIds, currentGameDay, queued]);

  const handleActivate = useCallback((id: string) => {
    activateNotification(id);
    beginClose(id);
  }, [beginClose]);

  const handleMuteType = useCallback((typeId: string) => {
    void bridgeCall('game.set_notification_muted', { typeId, muted: true })
      .catch(acknowledgeBridgeFailure);
    for (const notification of queued) {
      if (notification.notificationTypeId === typeId) {
        dismissNow(notification.id);
      }
    }
  }, [dismissNow, queued]);

  if (visible.length === 0) return null;

  const left = anchor
    ? Math.min(
      Math.max(anchor.left + (anchor.width / 2), (TOAST_WIDTH_PX / 2) + 8),
      window.innerWidth - (TOAST_WIDTH_PX / 2) - 8,
    )
    : window.innerWidth / 2;
  const top = anchor ? anchor.bottom + 8 : 56;

  return (
    <aside
      className="buildq-completion-toast-slot"
      style={{ top: toRootRem(top), left: toRootRem(left), transform: 'translateX(-50%)' }}
      role="status"
      aria-live="polite"
    >
      {visible.map((notification, index) => (
        <BuildQueueCompletionToastItem
          key={notification.id}
          notification={notification}
          closing={closingIds.has(notification.id)}
          staggerMs={index * UI_MOTION.notificationStackStaggerMs}
          onActivate={handleActivate}
          onClose={beginClose}
          onMuteType={handleMuteType}
          onLinkClick={onLinkClick}
        />
      ))}
    </aside>
  );
}

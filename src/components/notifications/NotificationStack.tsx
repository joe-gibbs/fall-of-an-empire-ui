import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo, type CSSProperties } from 'react';
import type { Notification } from '../../data/types';
import NotificationBanner from './NotificationBanner';
import BattleAfterActionModal from './BattleAfterActionModal';
import {
  activateDiplomaticNotification,
  activateNotification,
  dismissDiplomaticNotificationOnBridge,
  dismissNotificationOnBridge,
  onNotificationAnchorsFrame,
  respondDiplomaticNotification,
  type NotificationAnchorsFrameResponse,
} from '../../bridge/app/useNotificationsBridge';
import {
  makeWorldGlanceFrameEntryScratch,
  onWorldGlancesFrame,
  readWorldGlanceFrameEntry,
  worldGlanceFrameEntryCount,
  worldGlanceFrameViewportHeight,
  worldGlanceFrameViewportWidth,
  type WorldGlancesFrameResponse,
} from '../../bridge/app/useWorldGlancesBridge';
import { toRootRem } from '../../utils/cssUnits';
import { UI_MOTION } from '../../config/motion';
import { UI_PRESENTATION } from '../../config/presentation';
import { isBuildQueueCompletionNotification } from '../../notifications/buildQueueCompletion';
import '../world-glances/WorldGlances.css';
import './NotificationStack.css';

interface NotificationStackProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  currentGameDay: number;
  onLinkClick?: (type: string, id: string) => void;
  anchorsEnabled?: boolean;
}

interface SettlementNotificationAnchor {
  screenX: number;
  screenY: number;
  viewportWidth: number;
  viewportHeight: number;
  zOrder: number;
}

type SettlementAnchorMap = Record<string, SettlementNotificationAnchor>;

const SETTLEMENT_NOTIFICATION_BASE_Z_INDEX = 20;
const SETTLEMENT_NOTIFICATION_MAX_Z_INDEX = 43;

function canUseSettlementAnchor(notification: Notification): boolean {
  return notification.canAnchorAtSettlement === true && (notification.style ?? 'regular') === 'regular';
}

function hasInitialSettlementAnchor(notification: Notification): boolean {
  return Boolean(
    canUseSettlementAnchor(notification)
    && Number.isFinite(notification.settlementScreenX)
    && Number.isFinite(notification.settlementScreenY)
    && Number.isFinite(notification.settlementViewportWidth)
    && Number.isFinite(notification.settlementViewportHeight)
    && (notification.settlementViewportWidth ?? 0) > 0
    && (notification.settlementViewportHeight ?? 0) > 0,
  );
}

function initialSettlementAnchor(notification: Notification): SettlementNotificationAnchor | null {
  if (!hasInitialSettlementAnchor(notification)) return null;
  return {
    screenX: notification.settlementScreenX ?? 0,
    screenY: notification.settlementScreenY ?? 0,
    viewportWidth: notification.settlementViewportWidth ?? 0,
    viewportHeight: notification.settlementViewportHeight ?? 0,
    zOrder: 0,
  };
}

function buildSettlementAnchorMap(frame: NotificationAnchorsFrameResponse): SettlementAnchorMap {
  const anchors: SettlementAnchorMap = {};
  for (const entry of frame.settlements) {
    anchors[entry.id] = {
      screenX: entry.screenX,
      screenY: entry.screenY,
      viewportWidth: entry.viewportWidth,
      viewportHeight: entry.viewportHeight,
      zOrder: entry.zOrder,
    };
  }
  return anchors;
}

function buildWorldSettlementAnchorMap(frame: WorldGlancesFrameResponse): SettlementAnchorMap {
  const anchors: SettlementAnchorMap = {};
  const frameViewportWidth = worldGlanceFrameViewportWidth(frame) || viewportWidthValue();
  const frameViewportHeight = worldGlanceFrameViewportHeight(frame) || viewportHeightValue();
  const scratch = makeWorldGlanceFrameEntryScratch();
  const count = worldGlanceFrameEntryCount(frame, 'settlement');
  for (let index = 0; index < count; index += 1) {
    const entry = readWorldGlanceFrameEntry(frame, 'settlement', index, scratch);
    if (!entry) {
      continue;
    }

    anchors[entry.id] = {
      screenX: entry.screenX,
      screenY: entry.screenY,
      viewportWidth: frameViewportWidth,
      viewportHeight: frameViewportHeight,
      zOrder: entry.zOrder,
    };
  }
  return anchors;
}

function settlementAnchorsEqual(
  left: SettlementNotificationAnchor | undefined,
  right: SettlementNotificationAnchor | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.screenX === right.screenX
    && left.screenY === right.screenY
    && left.viewportWidth === right.viewportWidth
    && left.viewportHeight === right.viewportHeight
    && left.zOrder === right.zOrder;
}

function settlementAnchorMapsEqual(left: SettlementAnchorMap, right: SettlementAnchorMap): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!settlementAnchorsEqual(left[key], right[key])) return false;
  }
  return true;
}

function notificationCountdownProgress(notification: Notification, currentGameDay: number): number | null {
  if ((notification.style ?? 'regular') === 'cinematic') return null;
  const { createdOnDay, expiresOnDay, durationDays } = notification;
  if (
    typeof createdOnDay !== 'number'
    || typeof expiresOnDay !== 'number'
    || !Number.isFinite(createdOnDay)
    || !Number.isFinite(expiresOnDay)
  ) {
    return null;
  }

  const totalDays = Math.max(1, durationDays ?? expiresOnDay - createdOnDay);
  const displayDay = currentGameDay > 0 ? currentGameDay : createdOnDay;
  return Math.max(0, Math.min(1, (expiresOnDay - displayDay) / totalDays));
}

function shouldUseSettlementAnchor(
  notification: Notification,
  anchors: SettlementAnchorMap,
  exitAnchors: SettlementAnchorMap,
  worldSettlementAnchors: SettlementAnchorMap,
  missingAnchorIds: Set<string>,
): boolean {
  return settlementAnchorFor(notification, anchors, exitAnchors, worldSettlementAnchors, missingAnchorIds) !== null;
}

function settlementAnchorFor(
  notification: Notification,
  anchors: SettlementAnchorMap,
  exitAnchors: SettlementAnchorMap,
  worldSettlementAnchors: SettlementAnchorMap,
  missingAnchorIds: Set<string>,
): SettlementNotificationAnchor | null {
  if (!canUseSettlementAnchor(notification)) return null;
  const liveAnchor = anchors[notification.id];
  if (liveAnchor) return liveAnchor;
  const exitAnchor = exitAnchors[notification.id];
  if (exitAnchor) return exitAnchor;
  if (missingAnchorIds.has(notification.id)) return null;
  const worldAnchor = notification.settlementId ? worldSettlementAnchors[notification.settlementId] : undefined;
  if (worldAnchor) return worldAnchor;
  return initialSettlementAnchor(notification);
}

function viewportWidthValue(): number {
  return typeof window !== 'undefined'
    ? window.innerWidth || document.documentElement.clientWidth || 0
    : 0;
}

function viewportHeightValue(): number {
  return typeof window !== 'undefined'
    ? window.innerHeight || document.documentElement.clientHeight || 0
    : 0;
}

function settlementNotificationStyle(anchor: SettlementNotificationAnchor, index: number): CSSProperties {
  const width = viewportWidthValue() || anchor.viewportWidth || 1;
  const height = viewportHeightValue() || anchor.viewportHeight || 1;
  const scaleX = anchor.viewportWidth > 0 ? width / anchor.viewportWidth : 1;
  const scaleY = anchor.viewportHeight > 0 ? height / anchor.viewportHeight : 1;
  const screenX = anchor.screenX * scaleX;
  const screenY = anchor.screenY * scaleY;
  const relativeYOrder = Math.round((screenY / Math.max(height, 1)) * 16);
  const zIndex = Math.min(
    SETTLEMENT_NOTIFICATION_MAX_Z_INDEX,
    SETTLEMENT_NOTIFICATION_BASE_Z_INDEX + Math.max(0, relativeYOrder) + index,
  );

  return {
    zIndex,
    transform: `translate3d(${toRootRem(screenX)}, ${toRootRem(screenY)}, 0) translate3d(-50%, -100%, 0) scale(${UI_PRESENTATION.worldAnchors.notificationScale})`,
  };
}

const NotificationStack: React.FC<NotificationStackProps> = ({
  notifications,
  onDismiss,
  currentGameDay,
  onLinkClick,
  anchorsEnabled = true,
}) => {
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [settlementAnchors, setSettlementAnchors] = useState<SettlementAnchorMap>({});
  const [settlementExitAnchors, setSettlementExitAnchors] = useState<SettlementAnchorMap>({});
  const [worldSettlementAnchors, setWorldSettlementAnchors] = useState<SettlementAnchorMap>({});
  const [settlementMissingAnchorIds, setSettlementMissingAnchorIds] = useState<Set<string>>(new Set());
  const [battleReportNotificationId, setBattleReportNotificationId] = useState<string | null>(null);
  const exitTimersRef = useRef<Record<string, number>>({});
  const notificationsRef = useRef<Notification[]>(notifications);
  const anchorsEnabledRef = useRef(anchorsEnabled);

  const settlementNotifications = useMemo(
    () => notifications.filter((n) => !isBuildQueueCompletionNotification(n) && shouldUseSettlementAnchor(n, settlementAnchors, settlementExitAnchors, worldSettlementAnchors, settlementMissingAnchorIds)),
    [notifications, settlementAnchors, settlementExitAnchors, worldSettlementAnchors, settlementMissingAnchorIds],
  );

  const stackNotifications = useMemo(
    () => notifications.filter((n) => !isBuildQueueCompletionNotification(n) && !shouldUseSettlementAnchor(n, settlementAnchors, settlementExitAnchors, worldSettlementAnchors, settlementMissingAnchorIds)),
    [notifications, settlementAnchors, settlementExitAnchors, worldSettlementAnchors, settlementMissingAnchorIds],
  );

  const battleReportNotification = useMemo(
    () => notifications.find(n => n.id === battleReportNotificationId) ?? null,
    [battleReportNotificationId, notifications],
  );

  const finishExit = useCallback((id: string) => {
    const timer = exitTimersRef.current[id];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete exitTimersRef.current[id];
    }

    setExiting(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSettlementExitAnchors(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    onDismiss(id);
  }, [onDismiss]);

  const settlementAnchorsRef = useRef(settlementAnchors);
  const settlementExitAnchorsRef = useRef(settlementExitAnchors);
  const worldSettlementAnchorsRef = useRef(worldSettlementAnchors);
  const settlementMissingAnchorIdsRef = useRef(settlementMissingAnchorIds);

  useLayoutEffect(() => {
    notificationsRef.current = notifications;
    anchorsEnabledRef.current = anchorsEnabled;
    settlementAnchorsRef.current = settlementAnchors;
    settlementExitAnchorsRef.current = settlementExitAnchors;
    worldSettlementAnchorsRef.current = worldSettlementAnchors;
    settlementMissingAnchorIdsRef.current = settlementMissingAnchorIds;
  }, [anchorsEnabled, notifications, settlementAnchors, settlementExitAnchors, worldSettlementAnchors, settlementMissingAnchorIds]);

  const beginExit = useCallback((id: string, options?: { releaseBridge?: boolean }) => {
    if (exitTimersRef.current[id] !== undefined) return;

    const notification = notificationsRef.current.find(n => n.id === id);
    if (notification) {
      const anchor = settlementAnchorFor(
        notification,
        settlementAnchorsRef.current,
        settlementExitAnchorsRef.current,
        worldSettlementAnchorsRef.current,
        settlementMissingAnchorIdsRef.current,
      );
      if (anchor) {
        setSettlementExitAnchors(prev => {
          if (prev[id]) return prev;
          return { ...prev, [id]: anchor };
        });
      }
    }

    setExiting(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Release the cached payload on the game side so the cache can't grow
    // unbounded over a long session.
    if (options?.releaseBridge !== false) {
      if (notification?.diplomaticRequest) {
        dismissDiplomaticNotificationOnBridge(notification.diplomaticRequest.notificationId);
      } else {
        dismissNotificationOnBridge(id);
      }
    }
    exitTimersRef.current[id] = window.setTimeout(
      () => finishExit(id),
      UI_MOTION.notificationRemovalFallbackMs,
    );
  }, [finishExit]);

  const handleDecision = useCallback((id: string, accepted: boolean) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification?.diplomaticRequest) return;

    if (accepted && notification.diplomaticRequest.notificationType === 'peace_offer') {
      activateDiplomaticNotification(notification.diplomaticRequest.notificationId);
      return;
    }

    respondDiplomaticNotification(notification.diplomaticRequest.notificationId, accepted);
    beginExit(id, { releaseBridge: false });
  }, [beginExit, notifications]);

  const handleView = useCallback((id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification?.diplomaticRequest) {
      activateDiplomaticNotification(notification.diplomaticRequest.notificationId);
      return;
    }

    if (notification?.battleAfterActionReport?.available) {
      setBattleReportNotificationId(id);
      return;
    }

    // Click just activates (opens the relevant sidebar / pans camera). The
    // banner stays up so the player can keep reading until its game-day expiry
    // or manual dismissal.
    activateNotification(id);
  }, [notifications]);

  const handleAnimationEnd = useCallback((id: string, e: React.AnimationEvent) => {
    if (
      e.animationName === 'notification-scroll-close'
      || e.animationName === 'notification-scroll-slot-out'
      || e.animationName === 'settlement-notification-out'
    ) {
      finishExit(id);
    }
  }, [finishExit]);

  useEffect(() => {
    const expiredIds: string[] = [];
    for (const n of notifications) {
      if (
        currentGameDay > 0
        && typeof n.expiresOnDay === 'number'
        && n.expiresOnDay <= currentGameDay
        && !exiting.has(n.id)
      ) {
        expiredIds.push(n.id);
      }
    }

    if (expiredIds.length === 0) return;

    const timer = window.setTimeout(() => {
      for (const id of expiredIds) {
        beginExit(id);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [notifications, currentGameDay, exiting, beginExit]);

  const stackRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new notifications arrive
  useLayoutEffect(() => {
    if (stackRef.current) {
      stackRef.current.scrollTop = stackRef.current.scrollHeight;
    }
  }, [stackNotifications.length]);

  useEffect(() => {
    let previousAnchors: SettlementAnchorMap = {};
    let previousMissingKey = '';
    return onNotificationAnchorsFrame((frame) => {
      if (!anchorsEnabledRef.current) {
        return;
      }

      const anchors = buildSettlementAnchorMap(frame);
      const missingAnchorIds = new Set<string>();
      for (const notification of notificationsRef.current) {
        if (canUseSettlementAnchor(notification) && !anchors[notification.id]) {
          missingAnchorIds.add(notification.id);
        }
      }
      const missingKey = Array.from(missingAnchorIds).sort().join('\0');
      if (!settlementAnchorMapsEqual(previousAnchors, anchors)) {
        previousAnchors = anchors;
        setSettlementAnchors(anchors);
      }
      if (missingKey !== previousMissingKey) {
        previousMissingKey = missingKey;
        setSettlementMissingAnchorIds(missingAnchorIds);
      }
    });
  }, []);

  useEffect(() => {
    let previousAnchors: SettlementAnchorMap = {};
    return onWorldGlancesFrame((frame) => {
      if (!anchorsEnabledRef.current) {
        return;
      }

      const anchors = buildWorldSettlementAnchorMap(frame);
      if (settlementAnchorMapsEqual(previousAnchors, anchors)) {
        return;
      }
      previousAnchors = anchors;
      setWorldSettlementAnchors(anchors);
    });
  }, []);

  useEffect(() => () => {
    for (const timer of Object.values(exitTimersRef.current)) {
      window.clearTimeout(timer);
    }
    exitTimersRef.current = {};
  }, []);

  if (notifications.length === 0) return null;

  return (
    <>
      <BattleAfterActionModal
        notification={battleReportNotification}
        open={!!battleReportNotification}
        onClose={() => setBattleReportNotificationId(null)}
        onNavigate={battleReportNotification ? () => activateNotification(battleReportNotification.id) : undefined}
        onLinkClick={onLinkClick}
      />

      {stackNotifications.length > 0 && (
        <div ref={stackRef} className="notification-stack">
          {stackNotifications.map((n, i) => {
            const isExiting = exiting.has(n.id);
            return (
              <div
                key={n.id}
                className={`notification-slot notification-slot--${n.style ?? 'regular'}${isExiting ? ' notification-slot--exiting' : ''}`}
                style={{ animationDelay: isExiting ? '0s' : `${i * UI_MOTION.notificationStackStaggerMs}ms` }}
                onAnimationEnd={(e) => handleAnimationEnd(n.id, e)}
              >
                <NotificationBanner
                  notification={n}
                  onClose={() => beginExit(n.id)}
                  onView={() => handleView(n.id)}
                  onDecision={(accepted) => handleDecision(n.id, accepted)}
                  onLinkClick={onLinkClick}
                  countdownProgress={notificationCountdownProgress(n, currentGameDay)}
                />
              </div>
            );
          })}
        </div>
      )}

      {settlementNotifications.length > 0 && (
        <div className="settlement-notification-overlay">
          {settlementNotifications.map((n, i) => {
            const anchor = settlementAnchorFor(n, settlementAnchors, settlementExitAnchors, worldSettlementAnchors, settlementMissingAnchorIds);
            if (!anchor) return null;

            return (
              <div
                key={n.id}
                className="world-glance world-glance-node world-glance-node--notification detail-flag settlement-notification-node"
                style={settlementNotificationStyle(anchor, i)}
              >
                <div
                  className={`settlement-notification-slot notification-slot notification-slot--${n.style ?? 'regular'}${exiting.has(n.id) ? ' notification-slot--exiting' : ''}`}
                  style={{
                    animationDelay: exiting.has(n.id)
                      ? '0s'
                      : `${i * UI_MOTION.settlementNotificationStaggerMs}ms`,
                  }}
                  onAnimationEnd={(e) => handleAnimationEnd(n.id, e)}
                >
                  <NotificationBanner
                    notification={n}
                    onClose={() => beginExit(n.id)}
                    onView={() => handleView(n.id)}
                    onDecision={(accepted) => handleDecision(n.id, accepted)}
                    onLinkClick={onLinkClick}
                    countdownProgress={notificationCountdownProgress(n, currentGameDay)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default React.memo(NotificationStack);

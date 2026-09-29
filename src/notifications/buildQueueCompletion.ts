import type { Notification } from '../data/types';

export const MAX_VISIBLE_BUILD_QUEUE_TOASTS = 5;

export type BuildQueueCloseScope = 'one' | 'visible' | 'queued';

export function isBuildQueueCompletionNotification(notification: Notification): boolean {
  return notification.notificationTypeId === 'BuildingFinished'
    || notification.notificationTypeId === 'BuildingRepaired'
    || notification.notificationTypeId === 'UnitTrained';
}

export function buildQueueCloseScope(event: {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): BuildQueueCloseScope {
  if (event.ctrlKey || event.metaKey) return 'queued';
  if (event.shiftKey) return 'visible';
  return 'one';
}

export function idsForBuildQueueClose(
  clickedId: string,
  visibleIds: readonly string[],
  queuedIds: readonly string[],
  scope: BuildQueueCloseScope,
): { animateIds: string[]; dismissIds: string[] } {
  if (scope === 'one') {
    return { animateIds: [clickedId], dismissIds: [] };
  }

  const visibleSet = new Set(visibleIds);
  if (scope === 'visible') {
    return { animateIds: [...visibleIds], dismissIds: [] };
  }

  return {
    animateIds: [...visibleIds],
    dismissIds: queuedIds.filter(id => !visibleSet.has(id)),
  };
}

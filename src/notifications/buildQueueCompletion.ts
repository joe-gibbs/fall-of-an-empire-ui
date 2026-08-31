import type { Notification } from '../data/types';

export function isBuildQueueCompletionNotification(notification: Notification): boolean {
  return notification.notificationTypeId === 'BuildingFinished'
    || notification.notificationTypeId === 'UnitTrained';
}

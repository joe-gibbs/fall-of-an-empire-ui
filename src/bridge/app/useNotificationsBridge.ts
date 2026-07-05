import { useEffect } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { BattleAfterActionReportPayload, PortraitLayerData } from '../../bridge-types.generated.ts';
import type { Notification, Warning, WarningSeverity } from '../../data/types';
import { webUIText } from '../../localization/WebUITextContext';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

interface NotificationShown {
  id: string;
  title: string;
  description: string;
  type: string;
  notificationTypeId?: string;
  notificationTypeLabel?: string;
  iconPath?: string;
  timestamp: string;
  style?: string;
  createdOnDay?: number;
  expiresOnDay?: number;
  durationDays?: number;
  hasPortrait?: boolean;
  characterName?: string;
  portraitLayers?: PortraitLayerData;
  canAnchorAtSettlement?: boolean;
  settlementId?: string;
  settlementScreenX?: number;
  settlementScreenY?: number;
  settlementViewportWidth?: number;
  settlementViewportHeight?: number;
  battleAfterActionReport?: BattleAfterActionReportPayload;
}

interface DiplomacyFactionReference {
  id?: string;
  name?: string;
}

interface DiplomaticNotificationShown {
  id: string;
  notificationType: string;
  title: string;
  description: string;
  iconPath?: string;
  timestamp: string;
  createdOnDay?: number;
  expiresOnDay?: number;
  durationDays?: number;
  requiresDecision?: boolean;
  acceptLabel?: string;
  declineLabel?: string;
  initiatingFaction?: DiplomacyFactionReference;
  targetFaction?: DiplomacyFactionReference;
  thirdPartyFaction?: DiplomacyFactionReference;
}

interface DiplomaticNotificationDismissed {
  id: string;
}

interface WarningEvent {
  id: string;
  title: string;
  description: string;
  severity: string;
  iconKey: string;
  targetCount: number;
  screenToOpen: string;
  screenTab?: string;
  powerBlocId?: string;
  targetLabels?: string[];
}

interface WarningRemoved {
  id: string;
}

export interface NotificationAnchorFrameEntry {
  id: string;
  screenX: number;
  screenY: number;
  viewportWidth: number;
  viewportHeight: number;
  zOrder: number;
}

export interface NotificationAnchorsFrameResponse {
  settlements: NotificationAnchorFrameEntry[];
}

const DIPLOMATIC_NOTIFICATION_PREFIX = 'diplomatic:';

const VALID_NOTIFICATION_TYPES = new Set<Notification['type']>([
  'general', 'military', 'diplomatic', 'character', 'political', 'settlement',
]);

function mapNotificationType(raw: string): Notification['type'] {
  return VALID_NOTIFICATION_TYPES.has(raw as Notification['type'])
    ? (raw as Notification['type'])
    : 'general';
}

function mapNotificationStyle(raw?: string): NonNullable<Notification['style']> {
  return raw === 'cinematic' ? 'cinematic' : 'regular';
}

function mapSeverity(raw: string): WarningSeverity {
  if (raw === 'caution' || raw === 'warning' || raw === 'critical') return raw;
  return 'warning';
}

function mapWarning(data: WarningEvent): Warning {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    severity: mapSeverity(data.severity),
    iconKey: data.iconKey,
    targetCount: Math.max(1, data.targetCount ?? 1),
    screenToOpen: data.screenToOpen ?? '',
    screenTab: data.screenTab || undefined,
    powerBlocId: data.powerBlocId || undefined,
    targetLabels: data.targetLabels ?? [],
  };
}

function mapBattleAfterActionReport(report?: BattleAfterActionReportPayload): BattleAfterActionReportPayload | undefined {
  if (!report?.available) return undefined;
  return {
    ...report,
    headerImage: FoaeCefUIAssetPath(report.headerImage) ?? '',
    spoilsList: (report.spoilsList ?? []).map(spoil => ({
      ...spoil,
      iconPath: FoaeCefUIAssetPath(spoil.iconPath) ?? '',
    })),
    unitDamage: (report.unitDamage ?? []).map(unit => ({
      ...unit,
      iconPath: FoaeCefUIAssetPath(unit.iconPath) ?? '',
    })),
  };
}

function diplomaticNotificationId(rawId: string): string {
  return `${DIPLOMATIC_NOTIFICATION_PREFIX}${rawId}`;
}

function positiveDay(value?: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function diplomaticNotificationMuteType(notificationType: string): { id: string; label: string } | undefined {
  if (notificationType === 'peace_offer') {
    return { id: 'PeaceNegotiation', label: webUIText('Notifications.DiplomaticPeaceNegotiations') };
  }
  if (notificationType === 'war_declaration' || notificationType === 'call_to_arms') {
    return { id: 'WarDeclaration', label: webUIText('Notifications.DiplomaticWarDeclarations') };
  }
  return undefined;
}

function mapDiplomaticNotification(data: DiplomaticNotificationShown): Notification {
  const notificationType = diplomaticNotificationMuteType(data.notificationType);
  return {
    id: diplomaticNotificationId(data.id),
    title: data.title,
    description: data.description,
    type: 'diplomatic',
    notificationTypeId: notificationType?.id,
    notificationTypeLabel: notificationType?.label,
    iconPath: FoaeCefUIAssetPath(data.iconPath),
    timestamp: data.timestamp,
    style: 'regular',
    createdOnDay: positiveDay(data.createdOnDay),
    expiresOnDay: positiveDay(data.expiresOnDay),
    durationDays: positiveDay(data.durationDays),
    diplomaticRequest: {
      notificationId: data.id,
      notificationType: data.notificationType,
      requiresDecision: Boolean(data.requiresDecision),
      acceptLabel: data.acceptLabel ?? '',
      declineLabel: data.declineLabel ?? '',
      initiatingFactionId: data.initiatingFaction?.id || undefined,
      initiatingFactionName: data.initiatingFaction?.name || undefined,
      targetFactionId: data.targetFaction?.id || undefined,
      thirdPartyFactionId: data.thirdPartyFaction?.id || undefined,
    },
  };
}

interface BridgeHandlers {
  onNotificationShown: (n: Notification) => void;
  onNotificationDismissed: (id: string) => void;
  onNotificationsCleared: () => void;
  onWarningAdded: (w: Warning) => void;
  onWarningUpdated: (w: Warning) => void;
  onWarningRemoved: (id: string) => void;
  onWarningsCleared: () => void;
  onInitialWarnings: (warnings: Warning[]) => void;
}

/**
 * Subscribes to notification + warning push events from the game bridge.
 */
export function useNotificationsAndWarningsBridge(handlers: BridgeHandlers) {
  useEffect(() => {
    const onShown = (e: Event) => {
      const data = (e as CustomEvent<NotificationShown>).detail;
      if (!data) return;
      handlers.onNotificationShown({
        id: data.id,
        title: data.title,
        description: data.description,
        type: mapNotificationType(data.type),
        notificationTypeId: data.notificationTypeId || undefined,
        notificationTypeLabel: data.notificationTypeLabel || undefined,
        iconPath: FoaeCefUIAssetPath(data.iconPath),
        timestamp: data.timestamp,
        style: mapNotificationStyle(data.style),
        createdOnDay: data.createdOnDay,
        expiresOnDay: data.expiresOnDay,
        durationDays: data.durationDays,
        portraitLayers: data.hasPortrait ? data.portraitLayers : undefined,
        characterName: data.characterName,
        canAnchorAtSettlement: data.canAnchorAtSettlement,
        settlementId: data.settlementId || undefined,
        settlementScreenX: data.settlementScreenX,
        settlementScreenY: data.settlementScreenY,
        settlementViewportWidth: data.settlementViewportWidth,
        settlementViewportHeight: data.settlementViewportHeight,
        battleAfterActionReport: mapBattleAfterActionReport(data.battleAfterActionReport),
      });
    };
    const onCleared = () => handlers.onNotificationsCleared();
    const onDiplomaticShown = (e: Event) => {
      const data = (e as CustomEvent<DiplomaticNotificationShown>).detail;
      if (!data) return;
      handlers.onNotificationShown(mapDiplomaticNotification(data));
    };
    const onDiplomaticDismissed = (e: Event) => {
      const data = (e as CustomEvent<DiplomaticNotificationDismissed>).detail;
      if (!data) return;
      handlers.onNotificationDismissed(diplomaticNotificationId(data.id));
    };

    const onAdded = (e: Event) => {
      const data = (e as CustomEvent<WarningEvent>).detail;
      if (!data) return;
      handlers.onWarningAdded(mapWarning(data));
    };
    const onUpdated = (e: Event) => {
      const data = (e as CustomEvent<WarningEvent>).detail;
      if (!data) return;
      handlers.onWarningUpdated(mapWarning(data));
    };
    const onRemoved = (e: Event) => {
      const data = (e as CustomEvent<WarningRemoved>).detail;
      if (!data) return;
      handlers.onWarningRemoved(data.id);
    };
    const onWarningsClearedFn = () => handlers.onWarningsCleared();

    window.addEventListener('bridge:game.notification_shown', onShown);
    window.addEventListener('bridge:game.notifications_cleared', onCleared);
    window.addEventListener('bridge:game.diplomatic_notification_shown', onDiplomaticShown);
    window.addEventListener('bridge:game.diplomatic_notification_dismissed', onDiplomaticDismissed);
    window.addEventListener('bridge:game.warning_added', onAdded);
    window.addEventListener('bridge:game.warning_updated', onUpdated);
    window.addEventListener('bridge:game.warning_removed', onRemoved);
    window.addEventListener('bridge:game.warnings_cleared', onWarningsClearedFn);

    return () => {
      window.removeEventListener('bridge:game.notification_shown', onShown);
      window.removeEventListener('bridge:game.notifications_cleared', onCleared);
      window.removeEventListener('bridge:game.diplomatic_notification_shown', onDiplomaticShown);
      window.removeEventListener('bridge:game.diplomatic_notification_dismissed', onDiplomaticDismissed);
      window.removeEventListener('bridge:game.warning_added', onAdded);
      window.removeEventListener('bridge:game.warning_updated', onUpdated);
      window.removeEventListener('bridge:game.warning_removed', onRemoved);
      window.removeEventListener('bridge:game.warnings_cleared', onWarningsClearedFn);
    };
  }, [handlers]);

  useEffect(() => {
    // Touch the event actions so their delegate bindings initialise, and
    // fetch the initial warning snapshot.
    bridgeCall('game.notification_events', { command: 'bind', id: '' }).catch(acknowledgeBridgeFailure);
    bridgeCall('game.diplomatic_notification_events', { command: 'bind', id: '', accepted: false }).catch(acknowledgeBridgeFailure);
    bridgeCall('game.warning_events', { command: 'bind', key: '', targetIndex: 0 }).catch(acknowledgeBridgeFailure);
    bridgeCall('game.get_warnings')
      .then(res => handlers.onInitialWarnings(res.warnings.map(mapWarning)))
      .catch(acknowledgeBridgeFailure);
  }, [handlers]);
}

/**
 * Trigger click-through navigation on the game side. These are fire-and-forget;
 * the resulting actor navigation emits its own sidebar events which the UI
 * already subscribes to.
 */
export function activateNotification(id: string) {
  bridgeCall('game.notification_events', { command: 'activate', id }).catch(acknowledgeBridgeFailure);
}

export function dismissNotificationOnBridge(id: string) {
  bridgeCall('game.notification_events', { command: 'dismiss', id }).catch(acknowledgeBridgeFailure);
}

export function activateDiplomaticNotification(notificationId: string) {
  bridgeCall('game.diplomatic_notification_events', { command: 'activate', id: notificationId, accepted: false }).catch(acknowledgeBridgeFailure);
}

export function respondDiplomaticNotification(notificationId: string, accepted: boolean) {
  bridgeCall('game.diplomatic_notification_events', { command: 'respond', id: notificationId, accepted }).catch(acknowledgeBridgeFailure);
}

export function dismissDiplomaticNotificationOnBridge(notificationId: string) {
  bridgeCall('game.diplomatic_notification_events', { command: 'dismiss', id: notificationId, accepted: false }).catch(acknowledgeBridgeFailure);
}

export function onNotificationAnchorsFrame(callback: (data: NotificationAnchorsFrameResponse) => void): () => void {
  const handler = (event: Event) => callback((event as CustomEvent<NotificationAnchorsFrameResponse>).detail);
  window.addEventListener('bridge:game.notification_anchors_frame', handler as EventListener);
  return () => window.removeEventListener('bridge:game.notification_anchors_frame', handler as EventListener);
}

export function activateWarning(key: string, targetIndex: number) {
  bridgeCall('game.warning_events', { command: 'activate', key, targetIndex }).catch(acknowledgeBridgeFailure);
}

import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import type { Notification } from '../../data/types';
import { playSound } from '../../hooks/useSound';
import { useAnchoredDropdown } from '../../hooks/useAnchoredDropdown';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import { renderEventTextChunk } from '../../utils/eventTextFlow';
import { renderRichText } from '../../utils/richText';
import CloseButton from '../common/buttons/CloseButton';
import GameButton from '../common/buttons/GameButton';
import Portrait from '../common/portraits/Portrait';
import './NotificationBanner.css';

import { webUIText } from '../../localization/WebUITextContext';
interface NotificationBannerProps {
  notification: Notification;
  onClose: () => void;
  onView?: () => void;
  onDecision?: (accepted: boolean) => void;
  onLinkClick?: (type: string, id: string) => void;
  countdownProgress?: number | null;
}

const typeIcons: Record<Notification['type'], string> = {
  military: '/assets/icons/I_Swords.png',
  diplomatic: '/assets/icons/I_Diplomacy.png',
  character: '/assets/icons/I_Characters.png',
  settlement: '/assets/icons/I_City.png',
  political: '/assets/icons/I_PowerBlocs.png',
  general: '/assets/icons/I_Warning.png',
};

const RICH_TAG_RE = /<\/>|<[a-z]+(?:\s[^>]*)?\/?>/i;

function hasRichTextMarkup(text: string): boolean {
  return RICH_TAG_RE.test(text);
}

function renderNotificationRichText(
  text: string,
  keyPrefix: string,
  onLinkClick?: (type: string, id: string) => void,
): React.ReactNode {
  return renderRichText(text, {
    onLinkClick,
    keepLinksWithPreviousWord: true,
    linkClassPrefix: 'event-link',
    transformText: (chunk, key) => renderEventTextChunk(chunk, `${keyPrefix}-${key}`),
  });
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onClose,
  onView,
  onDecision,
  onLinkClick,
  countdownProgress,
}) => {
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
    open: optionsOpen,
    onClose: () => setOptionsOpen(false),
    durationMs: 120,
    position: 'below-left',
    offset: 6,
    useRootRem: true,
    minSpaceBelow: 130,
    maxPopupHeight: 220,
    closeOnScroll: true,
    escapeId: `notification.options.${notification.id}`,
  });
  const style = notification.style ?? 'regular';
  const hasPortrait = Boolean(notification.portraitLayers);
  const iconPath = notification.iconPath ?? typeIcons[notification.type];
  const diplomaticRequest = notification.diplomaticRequest;
  const requiresDecision = Boolean(diplomaticRequest?.requiresDecision);
  const notificationTypeLabel = notification.notificationTypeLabel
    || notification.title
    || webUIText('Notifications.ThisType');
  const iconOrPortrait = hasPortrait ? (
    <Portrait
      layers={notification.portraitLayers}
      name={notification.characterName ?? notification.title}
      size={style === 'cinematic' ? 'md' : 'sm'}
      shape="rect"
      className="notification-portrait"
      showBorder
    />
  ) : (
    <div className={`notification-icon notification-icon--${notification.type}${notification.iconPath ? ' notification-icon--custom' : ''}`}>
      <img src={FoaeCefUIAssetPath(iconPath)} alt="" />
    </div>
  );

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.notification-close, .notification-decision-btn')) return;
    onView?.();
  };

  const openOptionsPopover = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playSound('click');
    computePosition();
    setOptionsOpen(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      lastRightMouseDownRef.current = Date.now();
      openOptionsPopover(e);
      return;
    }

    if (e.button !== 0) return;
    playSound('click');
    handleClick(e);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastRightMouseDownRef.current > 250) {
      openOptionsPopover(e);
    }
  };

  const handleMuteType = useCallback(() => {
    const typeId = notification.notificationTypeId;
    if (!typeId) return;

    setOptionsOpen(false);
    void bridgeCall('game.set_notification_muted', { typeId, muted: true })
      .catch(acknowledgeBridgeFailure);
    onClose();
  }, [notification.notificationTypeId, onClose]);
  const optionsPositionStyle = optionsStyle ? { ...optionsStyle, minWidth: undefined } : undefined;

  const optionsPopover = optionsMounted ? createPortal(
    <div
      ref={setPopupRef}
      className="notification-options-popover-positioner"
      style={optionsPositionStyle}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className={`notification-options-popover${optionsClosing ? ' notification-options-popover--closing' : ''}`}>
        <div className="notification-options-popover__header">
          <span className="notification-options-popover__title">
            {webUIText('Notifications.OptionsTitle')}
          </span>
          <CloseButton size="sm" onClick={() => setOptionsOpen(false)} />
        </div>
        <div className="notification-options-popover__body">
          {notification.notificationTypeId ? (
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

  const closeButton = (
    <button
      className="notification-close"
      onMouseDown={(e) => { e.stopPropagation(); playSound('close'); onClose(); }}
      aria-label={webUIText('Auto.Attr.ComponentsNotificationsNotificationBanner.66.1')}
    >
      <img src="/assets/icons/I_Close.png" alt="" className="notification-close-icon" draggable={false} />
    </button>
  );
  const decisionActions = requiresDecision ? (
    <div className="notification-decision-actions">
      <button
        type="button"
        className="notification-decision-btn notification-decision-btn--accept"
        onMouseDown={(e) => { e.stopPropagation(); playSound('click'); onDecision?.(true); }}
      >
        {diplomaticRequest?.acceptLabel || webUIText('Auto.ComponentsScreensPeaceNegotiationScreen.945.14')}
      </button>
      <button
        type="button"
        className="notification-decision-btn notification-decision-btn--decline"
        onMouseDown={(e) => { e.stopPropagation(); playSound('close'); onDecision?.(false); }}
      >
        {diplomaticRequest?.declineLabel || webUIText('Auto.ComponentsScreensPeaceNegotiationScreen.944.13')}
      </button>
    </div>
  ) : null;

  const hasCountdown = typeof countdownProgress === 'number' && Number.isFinite(countdownProgress);
  const countdownFill = hasCountdown ? Math.max(0, Math.min(1, countdownProgress ?? 0)) : 0;
  const description = notification.description;
  const title = hasRichTextMarkup(notification.title) ? (
    <span className="notification-title notification-title-flow">
      {renderNotificationRichText(notification.title, `notification-title-${notification.id}`, onLinkClick)}
    </span>
  ) : (
    <span className="notification-title">{notification.title}</span>
  );
  const descriptionContent = hasRichTextMarkup(description) ? (
    <span className="notification-rich-flow">
      {renderNotificationRichText(description, `notification-description-${notification.id}`, onLinkClick)}
    </span>
  ) : description;

  if (style === 'cinematic') {
    return (
      <div
        ref={setTriggerRef}
        className={`notification-banner notification-banner--${notification.type} notification-banner--style-cinematic${requiresDecision ? ' notification-banner--decision' : ''}`}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <div className="notification-scroll-roller notification-scroll-roller--left" />
        <div className="notification-scroll-sheet">
          <div className="notification-scroll-content">
            {iconOrPortrait}
            <div className="notification-content">
              {title}
              <span className="notification-description">{descriptionContent}</span>
            </div>
            {decisionActions}
          </div>
          {requiresDecision ? null : closeButton}
        </div>
        <div className="notification-scroll-roller notification-scroll-roller--right" />
        {optionsPopover}
      </div>
    );
  }

  return (
    <div
      ref={setTriggerRef}
      className={`notification-banner notification-banner--${notification.type} notification-banner--style-${style}${requiresDecision ? ' notification-banner--decision' : ''}`}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {iconOrPortrait}
      <div className="notification-content">
        {title}
        <span className="notification-description">{descriptionContent}</span>
      </div>
      {decisionActions}
      {requiresDecision ? null : closeButton}
      {hasCountdown && (
        <div className="notification-countdown" aria-hidden="true">
          <div
            className="notification-countdown-fill"
            style={{ transform: `scaleX(${countdownFill})` }}
          />
        </div>
      )}
      <div className="notification-edge" />
      {optionsPopover}
    </div>
  );
};

export default NotificationBanner;

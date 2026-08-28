import React, { useCallback, useState } from 'react';
import { playSound } from '../../hooks/useSound';
import Tooltip from '../common/tooltips/Tooltip';
import type { TooltipContent } from '../common/tooltips/Tooltip';
import type { Notification } from '../../data/types';
import { activateNotification } from '../../bridge/app/useNotificationsBridge';
import { webUIText } from '../../localization/WebUITextContext';
import { renderRichText } from '../../utils/richText';
import './WarningBar.css';

interface ActionResultsBarProps {
  notifications: Notification[];
}

function resultTooltip(notification: Notification): TooltipContent {
  return {
    title: notification.title.replace(/<[^>]+>/g, ''),
    body: (
      <div className="warning-tooltip-flow">
        <div className="warning-tooltip-summary">
          {renderRichText(notification.description, { keepLinksWithPreviousWord: true })}
        </div>
      </div>
    ),
  };
}

const ActionResultsBar: React.FC<ActionResultsBarProps> = ({ notifications }) => {
  const [cycleIndex, setCycleIndex] = useState(0);

  const handleActivate = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || notifications.length === 0) return;
    e.stopPropagation();
    playSound('click');
    const index = cycleIndex % notifications.length;
    const current = notifications[index];
    setCycleIndex((index + 1) % notifications.length);
    if (current) activateNotification(current.id);
  }, [cycleIndex, notifications]);

  if (notifications.length === 0) return null;

  const current = notifications[cycleIndex % notifications.length] ?? notifications[0];
  const failed = notifications.some(notification => notification.actionSucceeded === false);
  const icon = failed ? '/assets/icons/I_GoalNotMet.png' : '/assets/icons/I_GoalMet.png';
  const frame = failed ? '/assets/icons/I_Warning.png' : '/assets/icons/I_Caution.png';

  return (
    <Tooltip
      content={resultTooltip(current)}
      position="right"
      delay={150}
      bubbleClassName="warning-tooltip"
    >
      <button
        type="button"
        className={`warning-icon-btn warning-icon-btn--${failed ? 'warning' : 'caution'}`}
        aria-label={webUIText('Notifications.ActionResults')}
        onClick={handleActivate}
      >
        <img src={frame} alt="" className="warning-icon-frame" />
        <img src={icon} alt="" className="warning-icon-img" />
      </button>
    </Tooltip>
  );
};

export default ActionResultsBar;

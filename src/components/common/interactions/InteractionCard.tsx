import React, { useEffect, useState } from 'react';
import { playSound } from '../../../hooks/useSound';
import { formatNumber } from '../../../utils/numberFormat';
import './InteractionCard.css';
import { webUIText } from '../../../localization/WebUITextContext';

export type InteractionOutcome = 'success' | 'failure';

interface InteractionCardProps {
  title: string;
  description?: React.ReactNode;
  image?: string;
  bgImage?: string;
  cooldown?: string;
  onClick?: () => void;
  onCancel?: () => void;
  /** Total duration of the action, in game-days. 0 = instant. */
  durationDays?: number;
  /** When true, the card shows a live in-progress state driven by `remainingDays`. */
  inProgress?: boolean;
  /** Days remaining while in progress. Falls back to `durationDays`. */
  remainingDays?: number;
  /**
   * Outcome of the most recent completion of this action, if any. Consumed
   * when the card transitions from in-progress → idle, or when `outcomeKey`
   * changes (for instant interactions that never enter an in-progress state).
   */
  outcome?: InteractionOutcome;
  /** Short text explaining the latest outcome. */
  outcomeText?: string;
  /**
   * Unique key identifying the current completion instance (e.g.
   * `${completedDate}:${interactionId}` when THIS card's action has just
   * completed, undefined otherwise). A change triggers the success/failure
   * flash even if `inProgress` never flipped — needed for instant actions.
   */
  outcomeKey?: string;
  /** Full cooldown length in game-days. */
  cooldownDays?: number;
  /** Days remaining until the action comes off cooldown. */
  cooldownRemainingDays?: number;
  meta?: React.ReactNode;
  tutorialTarget?: string;
}

const SUCCESS_FLASH_MS = 1600;
const FAILURE_FLASH_MS = 1400;
const DESCRIPTION_MAX_CHARS = 96;

function getShortOutcomeText(value?: string): string | undefined {
  const plain = value?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!plain) return undefined;

  const sentence = plain.match(/^(.+?[.!?])(\s|$)/);
  return sentence?.[1] ?? plain;
}

function truncateDescription(value?: React.ReactNode): React.ReactNode {
  if (typeof value !== 'string') return value;

  const singleLine = value.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= DESCRIPTION_MAX_CHARS) return singleLine;

  const clipped = singleLine.slice(0, DESCRIPTION_MAX_CHARS + 1);
  const lastSpace = clipped.lastIndexOf(' ');
  const cutAt = lastSpace >= DESCRIPTION_MAX_CHARS * 0.65 ? lastSpace : DESCRIPTION_MAX_CHARS;
  return `${singleLine.slice(0, cutAt).replace(/\s+$/, '')}...`;
}

const InteractionCard: React.FC<InteractionCardProps> = ({
  title,
  description,
  image,
  bgImage,
  cooldown,
  onClick,
  onCancel,
  durationDays = 0,
  inProgress = false,
  remainingDays,
  outcome,
  outcomeText,
  outcomeKey,
  cooldownDays = 0,
  cooldownRemainingDays = 0,
  meta,
  tutorialTarget,
}) => {
  const [flash, setFlash] = useState<InteractionOutcome | null>(null);
  const [flashOutcomeText, setFlashOutcomeText] = useState<string | undefined>(undefined);
  const [prevInProgress, setPrevInProgress] = useState(inProgress);
  const [prevOutcomeKey, setPrevOutcomeKey] = useState(outcomeKey);

  if (prevInProgress !== inProgress || prevOutcomeKey !== outcomeKey) {
    const wasInProgress = prevInProgress;
    const hadOutcomeKey = prevOutcomeKey;
    setPrevInProgress(inProgress);
    setPrevOutcomeKey(outcomeKey);
    const hasReportedOutcome = outcome !== undefined;
    const finishedDeferred = wasInProgress && !inProgress && hasReportedOutcome;
    const finishedInstant = hasReportedOutcome && !!outcomeKey && outcomeKey !== hadOutcomeKey && !inProgress;
    if (finishedDeferred || finishedInstant) {
      setFlash(outcome);
      setFlashOutcomeText(getShortOutcomeText(outcomeText));
    }
  }

  useEffect(() => {
    if (!flash) return;
    playSound(flash === 'success' ? 'notification' : 'error');
    const id = window.setTimeout(
      () => setFlash(null),
      flash === 'success' ? SUCCESS_FLASH_MS : FAILURE_FLASH_MS,
    );
    return () => window.clearTimeout(id);
  }, [flash]);

  const onCooldown = !inProgress && !flash && cooldownDays > 0 && cooldownRemainingDays > 0;
  const isDisabled = !onClick && !onCancel && !inProgress && !flash && !onCooldown;
  const isClickable = !!onClick && !inProgress && !flash;
  const canCancel = !!onCancel && inProgress && !flash;

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!isClickable) return;
    event.preventDefault();
    playSound('confirm');
    onClick?.();
  };

  const handleCancelMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    playSound('confirm');
    onCancel?.();
  };

  const daysLeft = Math.round(remainingDays ?? durationDays);
  const progressFraction = inProgress && durationDays > 0
    ? Math.max(0, Math.min(1, 1 - daysLeft / durationDays))
    : 0;
  const cooldownFraction = cooldownDays > 0
    ? Math.max(0, Math.min(1, 1 - cooldownRemainingDays / cooldownDays))
    : 0;
  const cooldownDaysLeft = Math.round(cooldownRemainingDays);
  const visibleDescription = truncateDescription(description);

  const classes = [
    'interaction-card',
    bgImage ? 'interaction-card--has-bg' : '',
    isClickable ? 'interaction-card--clickable' : '',
    isDisabled ? 'interaction-card--disabled' : '',
    onCooldown ? 'interaction-card--cooldown' : '',
    inProgress ? 'interaction-card--active' : '',
    flash === 'success' ? 'interaction-card--success' : '',
    flash === 'failure' ? 'interaction-card--failure' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} data-tutorial-target={tutorialTarget} onMouseDown={handleMouseDown}>
      {bgImage && (
        <div className="interaction-card-bg" style={{ backgroundImage: `url(${bgImage})` }} />
      )}
      {inProgress && (
        <div className="interaction-card-progress">
          <div
            className="interaction-card-progress-fill"
            style={{ transform: `scaleX(${progressFraction.toFixed(4)})` }}
          />
        </div>
      )}
      {onCooldown && (
        <div className="interaction-card-progress interaction-card-progress--cooldown">
          <div
            className="interaction-card-progress-fill interaction-card-progress-fill--cooldown"
            style={{ transform: `scaleX(${cooldownFraction.toFixed(4)})` }}
          />
        </div>
      )}
      {flash === 'success' && <div className="interaction-card-success-overlay" />}
      {flash === 'failure' && <div className="interaction-card-failure-overlay" />}
      {image && (
        <div className="interaction-card-image">
          <img src={image} alt="" draggable={false} />
        </div>
      )}
      <div className="interaction-card-body">
        <div className="interaction-card-header">
          <span className="interaction-card-title">
            {flash === 'success' ? webUIText("InteractionCard.Succeeded") : flash === 'failure' ? webUIText("InteractionCard.Failed") : title}
          </span>
          {onCooldown && (
            <span className="interaction-card-cooldown-status">
              {formatNumber(cooldownDaysLeft)} {cooldownDaysLeft === 1 ? webUIText("Common.Day") : webUIText("Common.Days")}
            </span>
          )}
          {!inProgress && !flash && !onCooldown && cooldown && (
            <span className="interaction-card-cooldown">{cooldown}</span>
          )}
          {inProgress && durationDays > 0 && (
            <span className="interaction-card-status">{webUIText('Common.DayCount', { Days: formatNumber(daysLeft), Unit: daysLeft === 1 ? webUIText('Common.Day') : webUIText('Common.Days') })}</span>
          )}
          {canCancel && (
            <button
              type="button"
              className="interaction-card-cancel"
              onMouseDown={handleCancelMouseDown}
              aria-label={webUIText('Common.Cancel')}
            >
              <img src="/assets/icons/I_Close.png" alt="" draggable={false} />
            </button>
          )}
        </div>
        {!inProgress && !flash && visibleDescription && (
          <p className="interaction-card-desc">{visibleDescription}</p>
        )}
        {inProgress && (
          <p className="interaction-card-desc interaction-card-desc--progress">
            {durationDays > 0 ? webUIText("InteractionCard.InProgress") : webUIText("InteractionCard.Executing")}
          </p>
        )}
        {flash === 'success' && (
          <p className="interaction-card-desc interaction-card-desc--success">{flashOutcomeText ?? title}</p>
        )}
        {flash === 'failure' && (
          <p className="interaction-card-desc interaction-card-desc--failure">{flashOutcomeText ?? webUIText("InteractionCard.TheAttemptFailed", { Title: title })}</p>
        )}
        {!flash && meta && (
          <div className="interaction-card-meta">{meta}</div>
        )}
      </div>
    </div>
  );
};

export default React.memo(InteractionCard);

import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from '../../common/buttons/CloseButton';
import FactionRoundel from '../../common/entities/FactionRoundel';
import Tooltip from '../../common/tooltips/Tooltip';
import { playSound } from '../../../hooks/useSound';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { UI_MOTION } from '../../../config/motion';
import { WebkilnAssetPath } from '../../../utils/assets';
import '../people/PersonInteractionGiftModal.css';
import './RebellionChoiceModal.css';

export type RebellionKind = 'throne' | 'limited';

interface TargetFactionSummary {
  id: string;
  name: string;
  colour?: string;
  secondaryColour?: string;
  cultureGroup?: string;
  emblem?: string;
}

interface Props {
  open: boolean;
  interactionName: string;
  targetFaction: TargetFactionSummary;
  onClose: () => void;
  onChoose: (kind: RebellionKind) => void;
}

export default function RebellionChoiceModal({
  open,
  interactionName,
  targetFaction,
  onClose,
  onChoose,
}: Props) {
  const t = useWebUIText();
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginClose = useCallback(() => {
    if (closing || closeTimerRef.current) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, UI_MOTION.modalCloseMs);
  }, [closing, onClose]);

  useEscapeStackEntry({
    id: 'modal.rebellion-choice',
    active: open,
    onClose: beginClose,
    allowFromInput: true,
  });

  // A close that was still animating when the modal was reopened must not close the new one.
  useEffect(() => {
    if (!open) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosing(false);
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handleOverlayMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    beginClose();
  }, [beginClose]);

  const handleModalMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const choose = useCallback((kind: RebellionKind) => {
    playSound('confirm');
    onChoose(kind);
  }, [onChoose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const throneBackground = WebkilnAssetPath('/assets/diplomatic-interactions/backgrounds/DeclareRebellionInteraction.png');
  const throneIcon = WebkilnAssetPath('/assets/diplomatic-interactions/icons/DeclareRebellionInteraction.png');
  const limitedBackground = WebkilnAssetPath('/assets/diplomatic-interactions/backgrounds/SeizeTerritoryInteraction.png');
  const limitedIcon = WebkilnAssetPath('/assets/diplomatic-interactions/icons/SeizeTerritoryInteraction.png');

  return createPortal(
    <div
      className={`pig-overlay${closing ? ' pig-overlay--closing' : ''}`}
      onMouseDown={handleOverlayMouseDown}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className={`modal pig-modal rebellion-choice-modal${closing ? ' pig-modal--closing' : ''}`}
        onMouseDown={handleModalMouseDown}
      >
        <div className="pig-header">
          <div className="pig-header__copy">
            <h2 className="pig-title">{interactionName || t('Diplomacy.RebellionChoiceTitle')}</h2>
          </div>
          <CloseButton size="sm" onClick={beginClose} />
        </div>

        <div className="pig-body rebellion-choice-body">
          <div className="rebellion-choice-leader">
            <FactionRoundel
              factionId={targetFaction.id}
              name={targetFaction.name}
              colour={targetFaction.colour}
              secondaryColour={targetFaction.secondaryColour}
              cultureGroup={targetFaction.cultureGroup}
              emblem={targetFaction.emblem}
              size="lg"
            />
            <span className="rebellion-choice-leader__name">{targetFaction.name}</span>
          </div>

          <div className="rebellion-choice-list">
            <Tooltip bubbleClassName="rebellion-choice-tooltip" content={{
              title: t('Diplomacy.RebellionChoiceClaimThrone'),
              lines: [
                { label: t('Diplomacy.RebellionChoiceVictory'), value: t('Diplomacy.RebellionChoiceThroneVictory'), stacked: true },
                { label: t('Diplomacy.RebellionChoiceDefeat'), value: t('Diplomacy.RebellionChoiceThroneDefeat'), stacked: true, valueColor: 'var(--red)' },
                { label: t('Diplomacy.RebellionChoiceSupport'), subTooltip: { body: t('Diplomacy.RebellionChoiceSupportHelp') } },
              ],
            }}>
            <button
              type="button"
              className="rebellion-choice-card"
              data-tutorial-target="ClaimThroneCard"
              onClick={() => choose('throne')}
            >
              {throneBackground && (
                <span
                  className="rebellion-choice-card__bg"
                  style={{ backgroundImage: `url(${throneBackground})` }}
                />
              )}
              <span className="rebellion-choice-card__copy">
                <span className="rebellion-choice-card__heading">
                  <img src={throneIcon} alt="" className="rebellion-choice-card__icon" draggable={false} />
                <span className="rebellion-choice-card__title">{t('Diplomacy.RebellionChoiceClaimThrone')}</span>
                </span>
                <span className="rebellion-choice-card__body">{t('Diplomacy.RebellionChoiceClaimThroneBody')}</span>
              </span>
            </button>
            </Tooltip>

            <Tooltip bubbleClassName="rebellion-choice-tooltip" content={{
              title: t('Diplomacy.RebellionChoiceLimited'),
              lines: [
                { label: t('Diplomacy.RebellionChoicePeace'), value: t('Diplomacy.RebellionChoiceLimitedPeace'), stacked: true },
                { label: t('Diplomacy.RebellionChoiceSubjectStatus'), value: t('Diplomacy.RebellionChoiceLimitedStatus'), stacked: true },
              ],
            }}>
            <button
              type="button"
              className="rebellion-choice-card"
              data-tutorial-target="LimitedRebellionCard"
              onClick={() => choose('limited')}
            >
              {limitedBackground && (
                <span
                  className="rebellion-choice-card__bg"
                  style={{ backgroundImage: `url(${limitedBackground})` }}
                />
              )}
              <span className="rebellion-choice-card__copy">
                <span className="rebellion-choice-card__heading">
                  <img src={limitedIcon} alt="" className="rebellion-choice-card__icon" draggable={false} />
                <span className="rebellion-choice-card__title">{t('Diplomacy.RebellionChoiceLimited')}</span>
                </span>
                <span className="rebellion-choice-card__body">{t('Diplomacy.RebellionChoiceLimitedBody')}</span>
              </span>
            </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

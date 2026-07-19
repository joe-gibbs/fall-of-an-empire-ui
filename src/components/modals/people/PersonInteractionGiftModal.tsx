import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from '../../common/buttons/CloseButton';
import Portrait from '../../common/portraits/Portrait';
import type {
  PersonInteractionView,
} from '../../../bridge/characters/usePersonInteractionsBridge';
import type { PortraitLayerData } from '../../../data/types';
import { formatNumber } from '../../../utils/numberFormat';
import { playSound } from '../../../hooks/useSound';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import './PersonInteractionGiftModal.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface Props {
  interaction: PersonInteractionView | null;
  targetPersonId: string;
  targetPersonName: string;
  targetPersonTitle?: string;
  targetPersonPortrait?: string;
  targetPortraitLayers?: PortraitLayerData;
  targetIsImprisoned?: boolean;
  playerGold: number;
  onClose: () => void;
  onConfirm: (giftTypeIndex: number) => Promise<string | null | void>;
}

const EMPTY_GIFT_OPTIONS: PersonInteractionView['giftOptions'] = [];
const CLOSE_MS = 180;

export default function PersonInteractionGiftModal({
  interaction,
  targetPersonId,
  targetPersonName,
  targetPersonTitle,
  targetPersonPortrait,
  targetPortraitLayers,
  targetIsImprisoned,
  playerGold,
  onClose,
  onConfirm,
}: Props) {
  const giftOptions = interaction?.giftOptions ?? EMPTY_GIFT_OPTIONS;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    giftOptions.find(option => option.cost <= playerGold)?.index ?? giftOptions[0]?.index ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = useMemo(
    () => giftOptions.find(option => option.index === selectedIndex) ?? null,
    [giftOptions, selectedIndex],
  );
  const selectedAffordable = selected ? selected.cost <= playerGold : false;
  const remainingGold = selected ? playerGold - selected.cost : playerGold;

  const beginClose = useCallback(() => {
    if (closing || closeTimerRef.current) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, CLOSE_MS);
  }, [closing, onClose]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    beginClose();
  }, [beginClose, submitting]);
  useEscapeStackEntry({
    id: 'modal.person-interaction-gift',
    active: interaction !== null,
    onClose: handleClose,
    allowFromInput: true,
  });

  const handleOverlayMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    handleClose();
  }, [handleClose]);

  const handleModalMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleSelectGift = useCallback((optionIndex: number) => {
    if (optionIndex !== selectedIndex) {
      playSound('tab');
    }
    setSelectedIndex(optionIndex);
    setError(null);
  }, [selectedIndex]);

  const handleConfirm = useCallback(async () => {
    if (!selected || submitting || selected.cost > playerGold) return;
    playSound('confirm');
    setSubmitting(true);
    setError(null);
    let maybeError: string | null | void;
    try {
      maybeError = await onConfirm(selected.index);
    } catch {
      maybeError = 'The action could not be started.';
    }
    setSubmitting(false);
    if (maybeError) {
      setError(maybeError);
      return;
    }
    beginClose();
  }, [beginClose, onConfirm, playerGold, selected, submitting]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  if (!interaction) return null;
  if (typeof document === 'undefined') return null;

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
      <div className={`modal pig-modal${closing ? ' pig-modal--closing' : ''}`} onMouseDown={handleModalMouseDown}>
        <div className="pig-header">
          {interaction.backgroundUrl && (
            <div
              className="pig-header__event-backdrop"
              style={{ backgroundImage: `url(${interaction.backgroundUrl})` }}
            />
          )}
          <div className="pig-header__copy">
            <h2 className="pig-title">{interaction.name}</h2>
            <p className="pig-subtitle">{interaction.description}</p>
          </div>
          <CloseButton size="sm" onClick={handleClose} />
        </div>

        <div className="pig-body">
          {interaction.backgroundUrl && (
            <div
              className="pig-event-backdrop"
              style={{ backgroundImage: `url(${interaction.backgroundUrl})` }}
            />
          )}
          <div className="pig-summary">
            <div className="pig-recipient">
              <div className="pig-recipient__portrait">
                <Portrait
                  personId={targetPersonId}
                  name={targetPersonName}
                  src={targetPersonPortrait}
                  layers={targetPortraitLayers}
                  isImprisoned={targetIsImprisoned}
                  size="lg"
                  shape="circle"
                  showBorder
                  borderTier="gold"
                />
              </div>
              <div className="pig-recipient__copy">
                <span className="pig-recipient__name">{targetPersonName}</span>
                {targetPersonTitle && <span className="pig-recipient__title">{targetPersonTitle}</span>}
              </div>
            </div>

            <div className="pig-result">
              {selected ? (
                <>
                  <span className="pig-result__name">{selected.name}</span>
                  <p className="pig-result__desc">{selected.description}</p>
                  <div className="pig-ledger">
                    <div className="pig-ledger__row">
                      <span className="pig-ledger__label"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.176.4" /></span>
                      <span className="pig-ledger__value">{formatNumber(playerGold)}</span>
                    </div>
                    <div className="pig-ledger__row">
                      <span className="pig-ledger__label"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.180.5" /></span>
                      <span className="pig-ledger__value pig-ledger__value--cost">-{formatNumber(selected.cost)}</span>
                    </div>
                    <div className="pig-ledger__row pig-ledger__row--total">
                      <span className="pig-ledger__label"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.184.6" /></span>
                      <span className={`pig-ledger__value${remainingGold < 0 ? ' pig-ledger__value--broke' : ''}`}>
                        {formatNumber(remainingGold)}
                      </span>
                    </div>
                  </div>
                  <div className="pig-impact">
                    <span className="pig-impact__label"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.191.7" /></span>
                    <span className="pig-impact__value">+{formatNumber(selected.relationshipBonus)}</span>
                  </div>
                </>
              ) : (
                <p className="pig-result__desc"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.196.8" /></p>
              )}
            </div>
          </div>

          <div className="pig-options">
            <div className="pig-list">
              {giftOptions.length > 0 ? giftOptions.map((option) => {
                const selectedCard = option.index === selected?.index;
                const affordable = option.cost <= playerGold;
                const shortfall = option.cost - playerGold;
                return (
                  <button
                    key={option.index}
                    type="button"
                    className={`pig-option${selectedCard ? ' pig-option--selected' : ''}${!affordable ? ' pig-option--locked' : ''}`}
                    aria-pressed={selectedCard}
                    onMouseDown={(event) => {
                      if (event.button !== 0) return;
                      event.preventDefault();
                      handleSelectGift(option.index);
                    }}
                  >
                    <div className="pig-option__icon-wrap">
                      {option.iconPath && (
                        <img src={option.iconPath} alt="" className="pig-option__icon" draggable={false} />
                      )}
                    </div>
                    <div className="pig-option__copy">
                      <span className="pig-option__name">{option.name}</span>
                      <span className="pig-option__desc">{option.description}</span>
                      {!affordable && <span className="pig-option__shortfall">{webUIText("Auto.Fix.Expr.componentsmodalsPersonInteractionGiftModal.231.1", { Value1: formatNumber(shortfall) })}</span>}
                    </div>
                    {option.iconPath && (
                      <img src={option.iconPath} alt="" className="pig-option__mark" draggable={false} />
                    )}
                    <div className="pig-option__stats">
                      <div className="pig-option__stat">
                        <span className="pig-option__stat-label"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.237.10" /></span>
                        <span className={`pig-option__stat-value${affordable ? '' : ' pig-option__stat-value--broke'}`}>
                          <img src="/assets/icons/I_Coins.png" alt="" className="pig-option__stat-icon" draggable={false} />
                          {formatNumber(option.cost)}
                        </span>
                      </div>
                      <div className="pig-option__stat">
                        <span className="pig-option__stat-label"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.244.11" /></span>
                        <span className="pig-option__stat-value pig-option__stat-value--bonus">+{formatNumber(option.relationshipBonus)}</span>
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="pig-list__empty"><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.251.12" /></div>
              )}
            </div>
            {error && <div className="game-notice game-notice--warning pig-error">{error}</div>}
          </div>
        </div>

        <div className="pig-footer">
          <button type="button" className="btn--outline pig-footer__button" onMouseDown={handleClose}><WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.259.13" /></button>
          <button
            type="button"
            className={`btn--burgundy pig-footer__button${!selected || submitting || !selectedAffordable ? ' pig-footer__button--disabled' : ''}`}
            disabled={!selected || submitting || !selectedAffordable}
            onMouseDown={() => { void handleConfirm(); }}
          >
            <WebUIText textKey="Auto.ComponentsModalsPersonInteractionGiftModal.266.14" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

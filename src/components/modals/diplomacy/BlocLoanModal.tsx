import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BlocInteractionView } from '../../../bridge/diplomacy/useBlocInteractionsBridge';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import { playSound } from '../../../hooks/useSound';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import { UI_MOTION } from '../../../config/motion';
import CloseButton from '../../common/buttons/CloseButton';
import '../people/PersonInteractionGiftModal.css';
import './BlocLoanModal.css';

interface Props {
  interaction: BlocInteractionView | null;
  blocName: string;
  onClose: () => void;
  onConfirm: (loanOptionIndex: number) => Promise<string | null | void>;
}

export default function BlocLoanModal({ interaction, blocName, onClose, onConfirm }: Props) {
  const t = useWebUIText();
  const options = useMemo(() => interaction?.loanOptions ?? [], [interaction]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(options[0]?.index ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = options.find(option => option.index === selectedIndex) ?? options[0] ?? null;
  const newDebt = (interaction?.currentLandownerDebt ?? 0) + (selected?.amount ?? 0);

  const beginClose = useCallback(() => {
    if (closing || closeTimerRef.current) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, UI_MOTION.modalCloseMs);
  }, [closing, onClose]);

  const handleClose = useCallback(() => {
    if (!submitting) beginClose();
  }, [beginClose, submitting]);

  useEscapeStackEntry({
    id: 'modal.bloc-loan',
    active: interaction !== null,
    onClose: handleClose,
    allowFromInput: true,
  });

  const handleConfirm = useCallback(async () => {
    if (!selected || submitting) return;
    playSound('confirm');
    setSubmitting(true);
    setError(null);
    try {
      const result = await onConfirm(selected.index);
      setSubmitting(false);
      if (result) {
        setError(t('PowerBlocs.Loan.CouldNotStart'));
        return;
      }
      beginClose();
    } catch {
      setSubmitting(false);
      setError(t('PowerBlocs.Loan.CouldNotStart'));
    }
  }, [beginClose, onConfirm, selected, submitting, t]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  if (!interaction || typeof document === 'undefined') return null;

  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    handleClose();
  };

  return createPortal(
    <div className={`pig-overlay${closing ? ' pig-overlay--closing' : ''}`} onPointerDown={handleOverlayPointerDown}>
      <div className={`modal pig-modal blm-modal${closing ? ' pig-modal--closing' : ''}`} onPointerDown={event => event.stopPropagation()}>
        <div className="pig-header">
          {interaction.backgroundUrl && <div className="pig-header__event-backdrop" style={{ backgroundImage: `url(${interaction.backgroundUrl})` }} />}
          <div className="pig-header__copy">
            <h2 className="pig-title">{interaction.name}</h2>
            <p className="pig-subtitle">{interaction.description}</p>
          </div>
          <CloseButton size="sm" onClick={handleClose} />
        </div>

        <div className="pig-body">
          {interaction.backgroundUrl && <div className="pig-event-backdrop" style={{ backgroundImage: `url(${interaction.backgroundUrl})` }} />}
          <div className="pig-summary">
            <div className="pig-recipient blm-lender">
              <img src={WebkilnAssetPath('/assets/power-blocs/SenatorialAristocracyBloc.png')} alt="" className="blm-lender__icon" draggable={false} />
              <div className="pig-recipient__copy">
                <span className="pig-recipient__name">{blocName}</span>
                <span className="pig-recipient__title">{t('PowerBlocs.Loan.GrossRevenue', { Amount: formatNumber(interaction.grossRevenue) })}</span>
              </div>
            </div>

            <div className="pig-result">
              {selected && (
                <>
                  <span className="pig-result__name">{selected.name}</span>
                  <p className="pig-result__desc">{selected.description}</p>
                  <div className="pig-ledger">
                    <div className="pig-ledger__row">
                      <span className="pig-ledger__label">{t('PowerBlocs.Loan.CurrentDebt')}</span>
                      <span className="pig-ledger__value">{formatNumber(interaction.currentLandownerDebt)}</span>
                    </div>
                    <div className="pig-ledger__row">
                      <span className="pig-ledger__label">{t('PowerBlocs.Loan.Advance')}</span>
                      <span className="pig-ledger__value blm-value--positive">+{formatNumber(selected.amount)}</span>
                    </div>
                    <div className="pig-ledger__row pig-ledger__row--total">
                      <span className="pig-ledger__label">{t('PowerBlocs.Loan.NewDebt')}</span>
                      <span className="pig-ledger__value">{formatNumber(newDebt)}</span>
                    </div>
                  </div>
                  <div className="pig-impact blm-impact--interest">
                    <span className="pig-impact__label">{t('PowerBlocs.Loan.MonthlyInterest')}</span>
                    <span className="pig-impact__value blm-value--interest">-{formatNumber(selected.monthlyInterest)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pig-options">
            <div className="pig-list">
              {options.map(option => {
                const isSelected = selected?.index === option.index;
                return (
                  <button
                    key={option.index}
                    type="button"
                    className={`pig-option${isSelected ? ' pig-option--selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (!isSelected) playSound('tab');
                      setSelectedIndex(option.index);
                      setError(null);
                    }}
                  >
                    <div className="pig-option__icon-wrap">
                      <img src={WebkilnAssetPath(option.iconPath)} alt="" className="pig-option__icon" draggable={false} />
                    </div>
                    <div className="pig-option__copy">
                      <span className="pig-option__name">{option.name}</span>
                      <span className="pig-option__desc">{option.description}</span>
                    </div>
                    <div className="pig-option__stats">
                      <div className="pig-option__stat">
                        <span className="pig-option__stat-label">{t('PowerBlocs.Loan.Receive')}</span>
                        <span className="pig-option__stat-value blm-value--positive">+{formatNumber(option.amount)}</span>
                      </div>
                      <div className="pig-option__stat">
                        <span className="pig-option__stat-label">{t('PowerBlocs.Loan.MonthlyInterest')}</span>
                        <span className="pig-option__stat-value blm-value--interest">-{formatNumber(option.monthlyInterest)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {options.length === 0 && <div className="pig-list__empty">{t('PowerBlocs.Loan.NoneAvailable')}</div>}
              {error && <div className="game-notice game-notice--warning pig-error">{error}</div>}
            </div>
          </div>
        </div>

        <div className="pig-footer">
          <button type="button" className="btn--outline pig-footer__button" onClick={handleClose}>{t('Common.Cancel')}</button>
          <button
            type="button"
            className={`btn--burgundy pig-footer__button${!selected || submitting ? ' pig-footer__button--disabled' : ''}`}
            disabled={!selected || submitting}
            onClick={() => { void handleConfirm(); }}
          >
            {t('PowerBlocs.Loan.Accept')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

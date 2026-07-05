import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from '../../common/buttons/CloseButton';
import FactionRoundel from '../../common/entities/FactionRoundel';
import type {
  BridgeFactionInteractionFactionCandidate,
  BridgeFactionInteractionProvidedInput,
  BridgeFactionInteractionInputRequirement,
  StartFactionInteractionResponse,
  StartSpyInteractionResponse,
} from '../../../bridge-types.generated.ts';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { playSound } from '../../../hooks/useSound';
import { useEscapeStackEntry } from '../../../context/EscapeStack';
import { useWebUIText } from '../../../localization/WebUITextContext';
import '../people/PersonInteractionGiftModal.css';
import './FactionInteractionInputModal.css';

interface TargetFactionSummary {
  id: string;
  name: string;
  colour?: string;
  secondaryColour?: string;
  cultureGroup?: string;
  emblem?: string;
}

type InputSelectionResponse = Pick<
  StartFactionInteractionResponse | StartSpyInteractionResponse,
  'targetFactionId' | 'interactionId' | 'interactionName' | 'inputSelectionPrompt'
    | 'inputRequirements' | 'factionCandidates' | 'playerGold' | 'message'
>;

interface Props {
  selection: InputSelectionResponse | null;
  targetFaction: TargetFactionSummary;
  onClose: () => void;
  onConfirm: (interactionId: string, inputs: BridgeFactionInteractionProvidedInput[]) => Promise<string | null | void>;
}

const CLOSE_MS = 180;

function selectionKey(selection: InputSelectionResponse | null): string {
  if (!selection) return '';
  return `${selection.targetFactionId}:${selection.interactionId}:${selection.inputRequirements.map(req => `${req.inputId}:${req.inputType}`).join('|')}`;
}

function defaultGold(req: BridgeFactionInteractionInputRequirement): number {
  if (req.selectedGoldAmount > 0) return req.selectedGoldAmount;
  return req.goldOptions[0]?.amount ?? 0;
}

function defaultFaction(req: BridgeFactionInteractionInputRequirement, candidates: BridgeFactionInteractionFactionCandidate[]): string {
  if (req.selectedFactionId) return req.selectedFactionId;
  return candidates[0]?.id ?? '';
}

export default function FactionInteractionInputModal({
  selection,
  targetFaction,
  onClose,
  onConfirm,
}: Props) {
  const t = useWebUIText();
  const [goldByInputState, setGoldByInputState] = useState<{ key: string; value: Record<string, number> }>({ key: '', value: {} });
  const [factionByInputState, setFactionByInputState] = useState<{ key: string; value: Record<string, string> }>({ key: '', value: {} });
  const [submittingState, setSubmittingState] = useState({ key: '', value: false });
  const [errorState, setErrorState] = useState<{ key: string; value: string | null }>({ key: '', value: null });
  const [closingState, setClosingState] = useState({ key: '', value: false });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSelectionKey = selectionKey(selection);
  const requirements = useMemo(() => selection?.inputRequirements ?? [], [selection]);
  const candidates = useMemo(() => {
    const next = (selection?.factionCandidates ?? []).slice();
    next.sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }, [selection]);
  const defaultGoldByInput = useMemo(() => {
    const nextGold: Record<string, number> = {};
    if (!selection) return nextGold;
    for (const req of selection.inputRequirements) {
      if (req.inputType === 'goldAmount') {
        nextGold[req.inputId] = defaultGold(req);
      }
    }
    return nextGold;
  }, [selection]);
  const defaultFactionByInput = useMemo(() => {
    const nextFaction: Record<string, string> = {};
    if (!selection) return nextFaction;
    for (const req of selection.inputRequirements) {
      if (req.inputType === 'factionSelection') {
        nextFaction[req.inputId] = defaultFaction(req, selection.factionCandidates);
      }
    }
    return nextFaction;
  }, [selection]);
  const defaultError = selection?.message && selection.message !== selection.inputSelectionPrompt ? selection.message : null;
  const goldByInput = goldByInputState.key === currentSelectionKey ? goldByInputState.value : defaultGoldByInput;
  const factionByInput = factionByInputState.key === currentSelectionKey ? factionByInputState.value : defaultFactionByInput;
  const submitting = submittingState.key === currentSelectionKey ? submittingState.value : false;
  const error = errorState.key === currentSelectionKey ? errorState.value : defaultError;
  const closing = closingState.key === currentSelectionKey ? closingState.value : false;
  const setSubmitting = useCallback((value: boolean) => {
    setSubmittingState({ key: currentSelectionKey, value });
  }, [currentSelectionKey]);
  const setError = useCallback((value: string | null) => {
    setErrorState({ key: currentSelectionKey, value });
  }, [currentSelectionKey]);
  const setClosing = useCallback((value: boolean) => {
    setClosingState({ key: currentSelectionKey, value });
  }, [currentSelectionKey]);

  const selectedGoldRequirement = requirements.find(req => req.inputType === 'goldAmount') ?? null;
  const selectedFactionRequirement = requirements.find(req => req.inputType === 'factionSelection') ?? null;
  const selectedGoldAmount = selectedGoldRequirement ? goldByInput[selectedGoldRequirement.inputId] ?? defaultGold(selectedGoldRequirement) : 0;
  const selectedGoldOption = selectedGoldRequirement
    ? selectedGoldRequirement.goldOptions.find(option => option.amount === selectedGoldAmount) ?? selectedGoldRequirement.goldOptions[0] ?? null
    : null;
  const selectedFactionId = selectedFactionRequirement
    ? factionByInput[selectedFactionRequirement.inputId] ?? defaultFaction(selectedFactionRequirement, candidates)
    : '';
  const selectedFaction = candidates.find(candidate => candidate.id === selectedFactionId) ?? candidates[0] ?? null;
  const remainingGold = selection ? selection.playerGold - selectedGoldAmount : 0;

  const beginClose = useCallback(() => {
    if (closing || closeTimerRef.current) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, CLOSE_MS);
  }, [closing, onClose, setClosing]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    beginClose();
  }, [beginClose, submitting]);

  useEscapeStackEntry({
    id: 'modal.faction-interaction-input',
    active: selection !== null,
    onClose: handleClose,
    allowFromInput: true,
  });

  const handleOverlayMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    handleClose();
  }, [handleClose]);

  const handleModalMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const selectGold = useCallback((inputId: string, amount: number) => {
    playSound('tab');
    setGoldByInputState({ key: currentSelectionKey, value: { ...goldByInput, [inputId]: amount } });
    setError(null);
  }, [currentSelectionKey, goldByInput, setError]);

  const selectFaction = useCallback((inputId: string, factionId: string) => {
    playSound('tab');
    setFactionByInputState({ key: currentSelectionKey, value: { ...factionByInput, [inputId]: factionId } });
    setError(null);
  }, [currentSelectionKey, factionByInput, setError]);

  const canConfirm = requirements.every(req => {
    if (req.inputType === 'goldAmount') {
      const amount = goldByInput[req.inputId] ?? defaultGold(req);
      return amount >= req.minGold && amount <= selection!.playerGold;
    }
    if (req.inputType === 'factionSelection') {
      return Boolean(factionByInput[req.inputId] ?? defaultFaction(req, candidates));
    }
    return true;
  });

  const handleConfirm = useCallback(async () => {
    if (!selection || submitting || !canConfirm) return;
    playSound('confirm');
    setSubmitting(true);
    setError(null);
    const inputs = requirements.map(req => ({
      inputId: req.inputId,
      goldAmount: req.inputType === 'goldAmount' ? goldByInput[req.inputId] ?? defaultGold(req) : 0,
      factionId: req.inputType === 'factionSelection' ? factionByInput[req.inputId] ?? defaultFaction(req, candidates) : '',
    }));
    let maybeError: string | null | void;
    try {
      maybeError = await onConfirm(selection.interactionId, inputs);
    } catch {
      maybeError = selection.message || selection.inputSelectionPrompt;
    }
    setSubmitting(false);
    if (maybeError) {
      setError(maybeError);
      return;
    }
    beginClose();
  }, [beginClose, canConfirm, candidates, factionByInput, goldByInput, onConfirm, requirements, selection, setError, setSubmitting, submitting]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  if (!selection) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`pig-overlay${closing ? ' pig-overlay--closing' : ''}`} onMouseDown={handleOverlayMouseDown}>
      <div className={`modal pig-modal fii-modal${closing ? ' pig-modal--closing' : ''}`} onMouseDown={handleModalMouseDown}>
        <div className="pig-header">
          <div className="pig-header__copy">
            <h2 className="pig-title">{selection.interactionName || t('Common.Select')}</h2>
          </div>
          <CloseButton size="sm" onClick={handleClose} />
        </div>

        <div className="pig-body">
          <div className="pig-summary">
            <div className="pig-recipient">
              <FactionRoundel
                factionId={targetFaction.id}
                name={targetFaction.name}
                colour={targetFaction.colour}
                secondaryColour={targetFaction.secondaryColour}
                cultureGroup={targetFaction.cultureGroup}
                emblem={targetFaction.emblem}
                size="lg"
              />
              <div className="pig-recipient__copy">
                <span className="pig-recipient__name">{targetFaction.name}</span>
              </div>
            </div>

            <div className="pig-result">
              {selectedGoldRequirement && (
                <>
                  <span className="pig-result__label">{selectedGoldRequirement.prompt}</span>
                  {selectedGoldOption && (
                    <>
                      <span className="pig-result__name">{selectedGoldOption.label}</span>
                      {selectedGoldOption.description && <p className="pig-result__desc">{selectedGoldOption.description}</p>}
                    </>
                  )}
                  <div className="pig-ledger">
                    <div className="pig-ledger__row">
                      <span className="pig-ledger__label">{t('Common.Treasury')}</span>
                      <span className="pig-ledger__value">{formatNumber(selection.playerGold)}</span>
                    </div>
                    <div className="pig-ledger__row">
                      <span className="pig-ledger__label">{t('Common.Cost')}</span>
                      <span className="pig-ledger__value pig-ledger__value--cost">-{formatNumber(selectedGoldAmount)}</span>
                    </div>
                    <div className="pig-ledger__row pig-ledger__row--total">
                      <span className="pig-ledger__label"><span>{t('Economy.Gold')}</span></span>
                      <span className={`pig-ledger__value${remainingGold < 0 ? ' pig-ledger__value--broke' : ''}`}>
                        {formatNumber(remainingGold)}
                      </span>
                    </div>
                  </div>
                  {selectedGoldOption && (
                    <div className="fii-impact-pair">
                      <div className="pig-impact">
                        <span className="pig-impact__label">{t('Common.Cost')}</span>
                        <span className="pig-impact__value">{formatNumber(selectedGoldOption.amount)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedFactionRequirement && selectedFaction && (
                <div className="fii-selected-faction">
                  <span className="pig-result__label">{selectedFactionRequirement.prompt}</span>
                  <div className="fii-selected-faction__main">
                    <FactionRoundel
                      factionId={selectedFaction.id}
                      name={selectedFaction.name}
                      colour={selectedFaction.colour}
                      secondaryColour={selectedFaction.secondaryColour}
                      cultureGroup={selectedFaction.cultureGroup}
                      emblem={selectedFaction.emblem}
                      size="md"
                    />
                    <div className="fii-selected-faction__copy">
                      <span className="pig-result__name">{selectedFaction.name}</span>
                      <span className="pig-result__desc">{selectedFaction.rulerName || selectedFaction.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pig-options">
            <div className="pig-options__header">
              <span>{t('Common.Select')}</span>
            </div>
            <div className="pig-list">
              {requirements.map(req => (
                <div key={req.inputId} className="fii-requirement">
                  {req.inputType === 'goldAmount' && req.goldOptions.length > 0 && req.goldOptions.map(option => {
                    const selected = (goldByInput[req.inputId] ?? defaultGold(req)) === option.amount;
                    const affordable = option.amount <= selection.playerGold;
                    const shortfall = option.amount - selection.playerGold;
                    return (
                      <button
                        key={`${req.inputId}:${option.amount}`}
                        type="button"
                        className={`pig-option fii-option${selected ? ' pig-option--selected' : ''}${!affordable ? ' pig-option--locked' : ''}`}
                        aria-pressed={selected}
                        onMouseDown={(event) => {
                          if (event.button !== 0 || !affordable) return;
                          event.preventDefault();
                          selectGold(req.inputId, option.amount);
                        }}
                      >
                        <div className="pig-option__icon-wrap">
                          <img src="/assets/icons/I_Coins.png" alt="" className="pig-option__icon" draggable={false} />
                        </div>
                        <div className="pig-option__copy">
                          <span className="pig-option__name">{option.label}</span>
                          <span className="pig-option__desc">{option.description || req.prompt}</span>
                          {!affordable && <span className="pig-option__shortfall">{formatNumber(shortfall)}</span>}
                        </div>
                        <div className="pig-option__stats">
                          <div className="pig-option__stat">
                            <span className="pig-option__stat-label">{t('Common.Cost')}</span>
                            <span className={`pig-option__stat-value${affordable ? '' : ' pig-option__stat-value--broke'}`}>
                              <img src="/assets/icons/I_Coins.png" alt="" className="pig-option__stat-icon" draggable={false} />
                              {formatNumber(option.amount)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {req.inputType === 'factionSelection' && (
                    <div className="fii-faction-list">
                      {candidates.length > 0 ? candidates.map(candidate => {
                        const selected = (factionByInput[req.inputId] ?? defaultFaction(req, candidates)) === candidate.id;
                        return (
                          <button
                            key={`${req.inputId}:${candidate.id}`}
                            type="button"
                            className={`fii-faction-option${selected ? ' fii-faction-option--selected' : ''}`}
                            aria-pressed={selected}
                            onMouseDown={(event) => {
                              if (event.button !== 0) return;
                              event.preventDefault();
                              selectFaction(req.inputId, candidate.id);
                            }}
                          >
                            <FactionRoundel
                              factionId={candidate.id}
                              name={candidate.name}
                              colour={candidate.colour}
                              secondaryColour={candidate.secondaryColour}
                              cultureGroup={candidate.cultureGroup}
                              emblem={candidate.emblem}
                              size="md"
                            />
                            <div className="fii-faction-option__copy">
                              <span className="fii-faction-option__name">{candidate.name}</span>
                              <span className="fii-faction-option__meta">{candidate.rulerName || candidate.status}</span>
                            </div>
                            <span className={`fii-faction-option__opinion${candidate.opinion < 0 ? ' fii-faction-option__opinion--bad' : ''}`}>
                              {formatSignedNumber(candidate.opinion)}
                            </span>
                          </button>
                        );
                      }) : (
                        <div className="pig-list__empty">{t('Common.NoneAvailable')}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {error && <div className="pig-error">{error}</div>}
            </div>
          </div>
        </div>

        <div className="pig-footer">
          <button type="button" className="btn--outline pig-footer__button" onMouseDown={handleClose}>{t('Common.Cancel')}</button>
          <button
            type="button"
            className={`btn--burgundy pig-footer__button${!canConfirm || submitting ? ' pig-footer__button--disabled' : ''}`}
            disabled={!canConfirm || submitting}
            onMouseDown={() => { void handleConfirm(); }}
          >
            {t('Common.Confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

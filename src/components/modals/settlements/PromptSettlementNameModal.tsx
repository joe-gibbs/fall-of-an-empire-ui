import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import { webUIText } from '../../../localization/WebUITextContext';
import { useModalPresence } from '../../../hooks/useModalPresence';
import './PromptSettlementNameModal.css';

interface Props {
  open: boolean;
  suggestedName: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function PromptSettlementNameModal({
  open,
  suggestedName,
  onConfirm,
  onClose,
}: Props) {
  const [draft, setDraft] = useState(suggestedName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.prompt-settlement-name',
    allowFromInput: true,
    closeStrategy: 'request',
  });

  useEffect(() => {
    if (!mounted || closing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [mounted, closing, suggestedName]);

  const submit = useCallback(() => {
    const nextName = draft.trim() || suggestedName;
    onConfirm(nextName);
  }, [draft, onConfirm, suggestedName]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }, [submit]);

  if (!mounted) return null;

  return (
    <div
      className={`modal-overlay prompt-settlement-name-overlay${closing ? ' modal-overlay--closing' : ''}`}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
    >
      <div
        className={`modal prompt-settlement-name-modal${closing ? ' modal--closing' : ''}`}
        onClick={stopPropagation}
      >
        <div className="prompt-settlement-name-header">
          <span className="prompt-settlement-name-title">{webUIText('Settlement.NameSettlement')}</span>
          <CloseButton size="sm" onClick={close} />
        </div>
        <div className="prompt-settlement-name-body">
          <input
            ref={inputRef}
            className="prompt-settlement-name-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="prompt-settlement-name-actions">
          <GameButton variant="burgundy" onClick={submit}>
            {webUIText('Common.Confirm')}
          </GameButton>
        </div>
      </div>
    </div>
  );
}

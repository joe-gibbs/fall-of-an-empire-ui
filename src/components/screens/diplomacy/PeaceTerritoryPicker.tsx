import type { StartPeaceSettlementSelectionResponse } from '../../../bridge-types.generated';
import type { PeaceSelectionContext, PeaceTermDraft } from '../../../bridge/diplomacy/usePeaceNegotiationBridge';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import GameButton from '../../common/buttons/GameButton';
import DropdownSelect from '../../common/forms/DropdownSelect';
import Panel from '../../common/layout/shell/Panel';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import './PeaceTerritoryPicker.css';

interface Props {
  context: PeaceSelectionContext;
  selection: StartPeaceSettlementSelectionResponse;
  terms: PeaceTermDraft[];
  termKey: (term: PeaceTermDraft) => string;
  onRecipientChange: (id: string) => void;
  onAssign: (termId: string, recipientId: string) => void;
  onRemove: (termId: string) => void;
  onDone: () => void;
}

export default function PeaceTerritoryPicker({ context, selection, terms, termKey, onRecipientChange, onAssign, onRemove, onDone }: Props) {
  const recipientsFor = (type: string, direction: string) => (
    direction === 'concession' ? selection.theirRecipients : selection.ourRecipients
  ).filter(recipient => type !== 'migration_settlement' || recipient.canMigrate)
    .map(recipient => ({ value: recipient.id, label: recipient.name }));

  const activeRecipients = recipientsFor(context.selectionType, context.selectionDirection);

  return (
    <Panel className="peace-territory-picker" title={webUIText(context.selectionType === 'migration_settlement' ? 'PeaceNegotiation.MigrationDestinations' : 'PeaceNegotiation.Provinces')}>
      {activeRecipients.length > 1 && (
        <DropdownSelect
          id="peace-map-recipient"
          label={webUIText('PeaceNegotiation.Recipient')}
          value={context.recipientFactionId}
          options={activeRecipients}
          onChange={onRecipientChange}
          portal
        />
      )}
      <StyledScrollArea className="peace-transfer-list" variant="inline">
        {terms.map(term => {
          const key = termKey(term);
          const recipients = recipientsFor(term.type, term.direction);
          return (
            <div className={`peace-transfer-row peace-transfer--${term.direction}`} key={key}>
              <div className="peace-transfer-details">
                <div className="peace-transfer-heading">
                  <span className="peace-transfer-direction"><WebUIText textKey={term.direction === 'concession' ? 'PeaceNegotiation.Giving' : 'PeaceNegotiation.Taking'} /></span>
                  <span className="peace-transfer-land">{term.settlementSummary}</span>
                </div>
                <div className="peace-transfer-recipient">
                  <span aria-hidden="true">→</span>
                  {recipients.length > 1 ? (
                    <DropdownSelect
                      id={`peace-recipient-${key}`}
                      value={term.recipientFactionId}
                      options={recipients}
                      onChange={id => onAssign(key, id)}
                      portal
                    />
                  ) : <span>{recipients.find(recipient => recipient.value === term.recipientFactionId)!.label}</span>}
                </div>
              </div>
              <GameButton variant="outline" className="peace-transfer-remove" onClick={() => onRemove(key)}>
                <WebUIText textKey="PeaceNegotiation.RemoveTransfer" />
              </GameButton>
            </div>
          );
        })}
      </StyledScrollArea>
      <GameButton variant="burgundy" className="peace-transfer-done" onClick={onDone}>
        <WebUIText textKey="PeaceNegotiation.ReturnToTerms" />
      </GameButton>
    </Panel>
  );
}

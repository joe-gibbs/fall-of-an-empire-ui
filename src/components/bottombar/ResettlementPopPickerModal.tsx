import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from '../common/buttons/CloseButton';
import GameButton from '../common/buttons/GameButton';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../common/tooltips/Tooltip';
import { useModalPresence } from '../../hooks/useModalPresence';
import { useWebUIText } from '../../localization/WebUITextContext';
import { formatNumber, formatPercent } from '../../utils/numberFormat';
import { cultureIconPath } from '../../utils/cultureIcons';
import { religionIconPath } from '../../utils/religionIcons';
import type { ResettlementPopOptionView, ResettlementSelectionOperation } from '../../bridge/military-map/useBottomBarOperationsBridge';
import '../common/forms/ConfirmDialog.css';
import './ResettlementPopPickerModal.css';

interface Props {
  open: boolean;
  operation: ResettlementSelectionOperation;
  onConfirm: (cultureId: string, religionId: string) => void;
  onCancel: () => void;
}

function popKey(cultureId: string, religionId: string): string {
  return `${cultureId}:${religionId}`;
}

function unrestColour(unrest: number): string {
  if (unrest <= 10) return 'var(--green)';
  if (unrest <= 20) return 'var(--orange)';
  return 'var(--red)';
}

export default function ResettlementPopPickerModal({
  open,
  operation,
  onConfirm,
  onCancel,
}: Props) {
  const t = useWebUIText();
  const defaultKey = popKey(operation.selectedCultureId, operation.selectedReligionId);
  const [picked, setPicked] = useState({ sourceId: operation.sourceSettlementId, key: defaultKey });
  const selectedKey = picked.sourceId === operation.sourceSettlementId && picked.key
    ? picked.key
    : defaultKey;
  const selected = operation.pops.find(pop => popKey(pop.cultureId, pop.religionId) === selectedKey)
    ?? operation.pops[0]
    ?? null;

  const confirmSelected = useCallback(() => {
    if (!selected) return;
    onConfirm(selected.cultureId, selected.religionId);
  }, [onConfirm, selected]);

  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open,
    onClose: onCancel,
    onConfirm: confirmSelected,
    escapeId: 'modal.resettlement-pop-picker',
    allowFromInput: true,
  });

  const chooseRow = useCallback((pop: ResettlementPopOptionView) => {
    setPicked({
      sourceId: operation.sourceSettlementId,
      key: popKey(pop.cultureId, pop.religionId),
    });
  }, [operation.sourceSettlementId]);

  if (!mounted) return null;

  const title = operation.interactionName || t('BottomBar.Resettlement.Title');
  const moveLine = selected
    ? (selected.migrantCount === 1
      ? t('BottomBar.Resettlement.MoveCountSingular', { Group: selected.name })
      : t('BottomBar.Resettlement.MoveCount', {
        Count: formatNumber(selected.migrantCount),
        Group: selected.name,
      }))
    : operation.message;

  const overlayCls = closing
    ? 'modal-overlay confirm-dialog-overlay confirm-dialog-overlay--closing'
    : 'modal-overlay confirm-dialog-overlay';
  const modalCls = closing
    ? 'modal confirm-dialog resettlement-pop-picker resettlement-pop-picker--closing'
    : 'modal confirm-dialog resettlement-pop-picker';

  return createPortal(
    <div
      className={overlayCls}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
    >
      <div className={modalCls} onClick={stopPropagation}>
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-title">{title}</span>
          <CloseButton size="sm" onClick={close} />
        </div>

        <StyledScrollArea className="resettlement-pop-picker__list" variant="inline">
          <div className="resettlement-pop-picker__rows">
          {operation.pops.map(pop => {
            const active = selected != null
              && pop.cultureId === selected.cultureId
              && pop.religionId === selected.religionId;
            return (
              <Tooltip
                key={popKey(pop.cultureId, pop.religionId)}
                content={{
                  title: pop.name,
                  body: pop.migrantCount === 1
                    ? t('BottomBar.Resettlement.MoveCountSingular', { Group: pop.name })
                    : t('BottomBar.Resettlement.MoveCount', {
                      Count: formatNumber(pop.migrantCount),
                      Group: pop.name,
                    }),
                  lines: [
                    { label: t('BottomBar.Resettlement.Population'), value: formatNumber(pop.count) },
                    {
                      label: t('BottomBar.Resettlement.Unrest'),
                      value: formatPercent(pop.unrest),
                      valueColor: unrestColour(pop.unrest),
                    },
                  ],
                }}
                position="right"
                delay={200}
              >
                <button
                  type="button"
                  className={`resettlement-pop-picker__row${active ? ' resettlement-pop-picker__row--selected' : ''}`}
                  onClick={() => chooseRow(pop)}
                >
                  <span className="resettlement-pop-picker__name">
                    <img src={cultureIconPath(pop.cultureId)} alt="" className="resettlement-pop-picker__icon" draggable={false} />
                    <img src={religionIconPath(pop.religionId)} alt="" className="resettlement-pop-picker__icon" draggable={false} />
                    <span className="resettlement-pop-picker__name-text">{pop.name}</span>
                  </span>
                  <span className="resettlement-pop-picker__count">{formatNumber(pop.count)}</span>
                  <span className="resettlement-pop-picker__unrest" style={{ color: unrestColour(pop.unrest) }}>
                    {formatPercent(pop.unrest)}
                  </span>
                </button>
              </Tooltip>
            );
          })}
          </div>
        </StyledScrollArea>

        <div className="resettlement-pop-picker__summary">
          <span className="resettlement-pop-picker__move">{moveLine}</span>
          {operation.goldCost > 0 && (
            <span className="resettlement-pop-picker__cost">
              <img src="/assets/icons/I_Coins.png" alt="" draggable={false} />
              {t('BottomBar.Resettlement.GoldCost', { Amount: formatNumber(operation.goldCost) })}
            </span>
          )}
        </div>

        <div className="confirm-dialog-actions">
          <GameButton variant="outline" onClick={close}>
            {t('Common.Cancel')}
          </GameButton>
          <GameButton
            variant="burgundy"
            disabled={closing || selected == null}
            onClick={confirmSelected}
          >
            {t('Common.Confirm')}
          </GameButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

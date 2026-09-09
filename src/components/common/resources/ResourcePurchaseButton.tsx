import { useRef, useState } from 'react';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import {
  buyEconomyResourceBridge,
  useEconomyOverviewBridge,
} from '../../../bridge/settlements-economy/useEconomyOverviewBridge';
import { useGameState } from '../../../context/GameContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatResourceNumber } from '../../../utils/numberFormat';
import {
  noteModifierKeysFromEvent,
  stepAmountFromEvent,
  stepAmountFromMultiplier,
  useStepMultiplier,
} from '../../../utils/stepModifiers';
import GameButton from '../buttons/GameButton';
import './ResourcePurchaseButton.css';

/** Mounted inside the visible tooltip so hidden resource rows do not request prices. */
export default function ResourcePurchaseButton({ resourceId }: { resourceId: string }) {
  const economy = useEconomyOverviewBridge('resources');
  const { gold } = useGameState();
  const t = useWebUIText();
  const multiplier = useStepMultiplier();
  const purchaseInFlight = useRef(false);
  const [purchasing, setPurchasing] = useState(false);
  const resource = economy?.resources.find(row => row.id === resourceId);

  if (!economy || !resource || resource.aggregate) return null;

  const amount = stepAmountFromMultiplier(multiplier, economy.tradeTransactionAmount);
  const cost = Math.ceil(amount * resource.buyPrice);
  const canBuy = cost > 0 && gold >= cost && resource.storageAvailable >= amount;

  return (
    <div
      className="resource-tooltip-purchase"
      onPointerEnter={noteModifierKeysFromEvent}
      onPointerMove={noteModifierKeysFromEvent}
    >
      <GameButton
        variant="burgundy"
        fullWidth
        disabled={!canBuy || purchasing}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          if (purchaseInFlight.current) return;
          noteModifierKeysFromEvent(event);
          const purchaseAmount = stepAmountFromEvent(event, economy.tradeTransactionAmount);
          const purchaseCost = Math.ceil(purchaseAmount * resource.buyPrice);
          if (purchaseCost <= 0 || gold < purchaseCost || resource.storageAvailable < purchaseAmount) return;
          purchaseInFlight.current = true;
          setPurchasing(true);
          buyEconomyResourceBridge(resource.id, purchaseAmount)
            .catch(acknowledgeBridgeFailure)
            .finally(() => {
              purchaseInFlight.current = false;
              setPurchasing(false);
            });
        }}
      >
        <span>{t('Economy.BuyAmount', { Amount: formatResourceNumber(amount) })}</span>
        <span>{t('Economy.CostsGold', { Amount: formatResourceNumber(cost) })}</span>
      </GameButton>
    </div>
  );
}

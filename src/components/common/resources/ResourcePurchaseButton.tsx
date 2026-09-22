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
import type { ResourcePurchaseDestination } from './resourcePurchaseDestinationContext';
import './ResourcePurchaseButton.css';

/** Mounted inside the visible tooltip so hidden resource rows do not request prices. */
export default function ResourcePurchaseButton({
  resourceId,
  settlementId,
  personId,
  categoryRooms,
}: { resourceId: string } & ResourcePurchaseDestination) {
  const economy = useEconomyOverviewBridge('resources');
  const destination = { settlementId, personId };
  const { gold } = useGameState();
  const t = useWebUIText();
  const multiplier = useStepMultiplier();
  const purchaseInFlight = useRef(false);
  const [purchasing, setPurchasing] = useState(false);
  const resource = economy?.resources.find(row => row.id === resourceId);

  if (!economy || !resource || resource.aggregate) return null;

  const amount = stepAmountFromMultiplier(multiplier, economy.tradeTransactionAmount);
  const cost = resource.tradeQuotes.find(quote => quote.amount === amount)!.buyCost;
  const localRoom = categoryRooms?.[resource.category] ?? null;
  const storageAvailable = localRoom == null
    ? resource.storageAvailable
    : Math.min(resource.storageAvailable, localRoom);
  const canBuy = cost > 0 && gold >= cost && storageAvailable >= amount;

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
          const purchaseCost = resource.tradeQuotes.find(quote => quote.amount === purchaseAmount)!.buyCost;
          if (purchaseCost <= 0 || gold < purchaseCost || storageAvailable < purchaseAmount) return;
          purchaseInFlight.current = true;
          setPurchasing(true);
          buyEconomyResourceBridge(resource.id, purchaseAmount, destination)
            .catch(acknowledgeBridgeFailure)
            .finally(() => {
              purchaseInFlight.current = false;
              setPurchasing(false);
            });
        }}
      >
        <span>{t('Economy.BuyAmount', { Amount: formatResourceNumber(amount) })}</span>
        <span className="resource-tooltip-purchase__cost">
          <img src="/assets/icons/I_Coins.png" alt="" />
          {t('Economy.CostsGold', { Amount: formatResourceNumber(cost) })}
        </span>
      </GameButton>
    </div>
  );
}

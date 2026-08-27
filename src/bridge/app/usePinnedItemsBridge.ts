import { useCallback, useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetPinnedItemsResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type PinnedItemType = 'character' | 'settlement' | 'military' | 'faction';

export interface PinnedItem {
  itemType: PinnedItemType;
  itemId: string;
  name: string;
  detail: string;
}

export interface PinnedItemsBridge {
  items: PinnedItem[];
  isPinned: (type: PinnedItemType, id: string) => boolean;
  togglePin: (type: PinnedItemType, id: string) => void;
}

function normaliseType(raw: string): PinnedItemType {
  if (raw === 'settlement' || raw === 'military' || raw === 'faction') return raw;
  return 'character';
}

function mapItems(data: GetPinnedItemsResponse): PinnedItem[] {
  return data.items.map(i => ({
    itemType: normaliseType(i.itemType),
    itemId: i.itemId,
    name: i.name,
    detail: i.detail,
  }));
}

/**
 * Subscribes to the game's pinned-items subsystem. Returns a stable API
 * for checking pin state and toggling pins. The underlying list is pushed
 * from the game side whenever it changes.
 */
export function usePinnedItemsBridge(): PinnedItemsBridge {
  const [items, setItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const unsub = onBridgeEvent('game.get_pinned_items', (data) => {
      if (cancelled) return;
      setItems(mapItems(data));
    });

    bridgeCall('game.get_pinned_items')
      .then((data) => {
        if (cancelled) return;
        setItems(mapItems(data));
      })
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const isPinned = useCallback(
    (type: PinnedItemType, id: string) =>
      items.some(i => i.itemType === type && i.itemId === id),
    [items],
  );

  const togglePin = useCallback((type: PinnedItemType, id: string) => {
    bridgeCall('game.toggle_pin', { itemType: type, itemId: id }).catch(acknowledgeBridgeFailure);
  }, []);

  return { items, isPinned, togglePin };
}

/**
 * Fire-and-forget camera focus via the game bridge. For factions, the game
 * zooms to the capital (falling back to the first army if there is none).
 */
export function zoomToBridge(type: PinnedItemType, id: string): void {
  if (!id) return;
  bridgeCall('game.zoom_to', { itemType: type, itemId: id }).catch(acknowledgeBridgeFailure);
}

export function zoomToCharacterCapital(personId: string): void {
  if (!personId) return;
  bridgeCall('game.zoom_to', { itemType: 'character_capital', itemId: personId }).catch(acknowledgeBridgeFailure);
}

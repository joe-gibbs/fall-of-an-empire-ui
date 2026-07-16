import { useCallback, useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { SaveGameEntryDto } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type SaveEntry = SaveGameEntryDto;

export interface DeleteSaveResult {
  deleted: boolean;
  failureReason: string;
}

export interface UseSavesBridge {
  saves: SaveEntry[] | null;
  load: (slotName: string) => Promise<void>;
  remove: (slotName: string, deleteFromCloud?: boolean) => Promise<DeleteSaveResult>;
}

export function useSavesBridge(enabled: boolean): UseSavesBridge {
  const [saves, setSaves] = useState<SaveEntry[] | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await bridgeCall('game.list_saves');
        if (!cancelled) setSaves(res.saves ?? []);
      } catch (error) {
        acknowledgeBridgeFailure(error);
        if (!cancelled) setSaves([]);
      }
    })();

    const unsub = onBridgeEvent('game.list_saves', (data) => {
      if (!cancelled) setSaves(data.saves ?? []);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [enabled]);

  const load = useCallback(async (slotName: string) => {
    await bridgeCall('game.load_save', { slotName });
  }, []);

  const remove = useCallback(async (slotName: string, deleteFromCloud = false) => {
    try {
      const res = await bridgeCall('game.delete_save', { slotName, deleteFromCloud });
      if (res.deleted) {
        setSaves(prev => prev ? prev.filter(save => save.slotName !== slotName) : prev);
      }
      return { deleted: res.deleted, failureReason: res.failureReason };
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return {
        deleted: false,
        failureReason: error instanceof Error ? error.message : '',
      };
    }
  }, []);

  return { saves, load, remove };
}

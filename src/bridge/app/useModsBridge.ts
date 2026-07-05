import { useCallback, useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { ModEntryDto, UploadModToWorkshopResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type ModEntry = ModEntryDto;
export type ModUploadState = 'preparing' | 'uploading' | 'succeeded' | 'failed';

export interface ModUploadStatus {
  state: ModUploadState;
  error: string;
  publishedFileId: string;
  needsLegalAgreement: boolean;
  url: string;
}

export interface UseModsBridge {
  mods: ModEntry[] | null;
  setEnabled: (modId: string, enabled: boolean) => Promise<boolean>;
  uploadMod: (modId: string) => Promise<boolean>;
  uploadStatuses: Record<string, ModUploadStatus>;
}

export function useModsBridge(enabled: boolean): UseModsBridge {
  const [mods, setMods] = useState<ModEntry[] | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, ModUploadStatus>>({});

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await bridgeCall('game.list_mods');
        if (!cancelled) setMods(res.mods ?? []);
      } catch (error) {
        acknowledgeBridgeFailure(error);
        if (!cancelled) setMods([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const applyUploadEvent = (event: UploadModToWorkshopResponse) => {
      if (!event.modId || !event.state) return;
      setUploadStatuses(prev => ({
        ...prev,
        [event.modId]: {
          state: event.state as ModUploadState,
          error: event.error ?? '',
          publishedFileId: event.publishedFileId ?? '',
          needsLegalAgreement: Boolean(event.needsLegalAgreement),
          url: event.url ?? '',
        },
      }));
    };

    return onBridgeEvent('game.upload_mod_to_workshop', applyUploadEvent);
  }, [enabled]);

  const setEnabled = useCallback(async (modId: string, nextEnabled: boolean) => {
    setMods(prev => prev
      ? prev.map(m => m.id === modId ? { ...m, enabled: nextEnabled } : m)
      : prev);
    try {
      await bridgeCall('game.set_mod_enabled', { modId, enabled: nextEnabled });
      return true;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setMods(prev => prev
        ? prev.map(m => m.id === modId ? { ...m, enabled: !nextEnabled } : m)
        : prev);
      return false;
    }
  }, []);

  const uploadMod = useCallback(async (modId: string) => {
    setUploadStatuses(prev => ({
      ...prev,
      [modId]: {
        state: 'preparing',
        error: '',
        publishedFileId: prev[modId]?.publishedFileId ?? '',
        needsLegalAgreement: false,
        url: prev[modId]?.url ?? '',
      },
    }));
    try {
      await bridgeCall('game.upload_mod_to_workshop', { modId });
      return true;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setUploadStatuses(prev => ({
        ...prev,
        [modId]: {
          state: 'failed',
          error: error instanceof Error ? error.message : '',
          publishedFileId: prev[modId]?.publishedFileId ?? '',
          needsLegalAgreement: false,
          url: prev[modId]?.url ?? '',
        },
      }));
      return false;
    }
  }, []);

  return { mods, setEnabled, uploadMod, uploadStatuses };
}

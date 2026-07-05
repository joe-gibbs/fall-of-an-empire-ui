import { useCallback } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import type {
  GetSettingsResponse,
  ApplySettingsRequest,
  RebindActionKeyRequest,
  RebindActionKeyResponse,
} from '../../bridge-types.generated.ts';

export function useSettingsBridge(): {
  settings: GetSettingsResponse | null;
  apply: (request: ApplySettingsRequest) => Promise<void>;
  reset: (page: string) => Promise<GetSettingsResponse>;
  setNotificationMuted: (typeId: string, muted: boolean) => Promise<void>;
  resetNotificationMutes: () => Promise<void>;
  rebindActionKey: (request: RebindActionKeyRequest) => Promise<RebindActionKeyResponse | null>;
} {
  const settings = useBridgeQuery({
    action: 'game.get_settings',
    map: (data) => data,
  });

  const apply = useCallback(async (request: ApplySettingsRequest) => {
    await bridgeCall('game.apply_settings', request);
  }, []);

  const reset = useCallback(async (page: string) => {
    return await bridgeCall('game.reset_settings', { page });
  }, []);

  const setNotificationMuted = useCallback(async (typeId: string, muted: boolean) => {
    await bridgeCall('game.set_notification_muted', { typeId, muted });
  }, []);

  const resetNotificationMutes = useCallback(async () => {
    await bridgeCall('game.reset_notification_mutes');
  }, []);

  const rebindActionKey = useCallback(async (request: RebindActionKeyRequest) => {
    return bridgeCall('game.rebind_action_key', request).catch((error) => {
      acknowledgeBridgeFailure(error);
      return null;
    });
  }, []);

  return { settings, apply, reset, setNotificationMuted, resetNotificationMutes, rebindActionKey };
}

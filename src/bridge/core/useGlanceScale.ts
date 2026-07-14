import { useBridgeQuery } from './useBridgeQuery';

export function useGlanceScale(): number {
  const scale = useBridgeQuery({
    action: 'game.get_settings',
    map: (data) => data.gameplay.glanceScale,
  });

  return scale ?? 1.2;
}

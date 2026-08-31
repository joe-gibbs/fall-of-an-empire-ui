import { publishBridgeEvent } from '../../../bridge/core/bridgeEvents';

export function openWorldSearch(): void {
  publishBridgeEvent('ui.open_world_search', {});
}

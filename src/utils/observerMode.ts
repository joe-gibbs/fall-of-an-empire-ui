/** Screen buttons that remain useful while watching the map. */
export const OBSERVER_TOPBAR_BUTTON_IDS = new Set(['encyclopedia']);

/** Utility actions that remain useful while watching the map. */
export const OBSERVER_ACTION_BUTTON_IDS = new Set(['search', 'pinned']);

export function isObserverMode(playerFaction: { id?: string } | null | undefined): boolean {
  return !playerFaction?.id;
}

export function isObserverTopbarButton(id: string): boolean {
  return OBSERVER_TOPBAR_BUTTON_IDS.has(id);
}

export function isObserverActionButton(id: string): boolean {
  return OBSERVER_ACTION_BUTTON_IDS.has(id);
}

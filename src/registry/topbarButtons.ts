import type { TopbarButtonRegistration } from './types';

const buttons = new Map<string, TopbarButtonRegistration>();

export function registerTopbarButton(registration: TopbarButtonRegistration): void {
  buttons.set(registration.id, registration);
}

export function unregisterTopbarButton(id: string): void {
  buttons.delete(id);
}

export function getTopbarButton(id: string | null | undefined): TopbarButtonRegistration | undefined {
  if (!id) return undefined;
  return buttons.get(id);
}

/** Return the registered buttons in render order (lower `order` first,
 *  registration order as tiebreaker). */
export function getAllTopbarButtons(): TopbarButtonRegistration[] {
  const list = Array.from(buttons.values());
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

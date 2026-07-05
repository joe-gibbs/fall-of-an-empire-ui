import type { SidebarRegistration } from './types';

const sidebars = new Map<string, SidebarRegistration>();

export function registerSidebar(registration: SidebarRegistration): void {
  sidebars.set(registration.id, registration);
}

export function unregisterSidebar(id: string): void {
  sidebars.delete(id);
}

export function getSidebar(id: string | null | undefined): SidebarRegistration | undefined {
  if (!id) return undefined;
  return sidebars.get(id);
}

export function getAllSidebars(): SidebarRegistration[] {
  return Array.from(sidebars.values());
}

/** Which side does this sidebar id live on? Used by GameContext to route
 *  the legacy `openSidebar(type, id)` call when the caller didn't specify. */
export function getSidebarSide(id: string | null | undefined): 'left' | 'right' | undefined {
  if (!id) return undefined;
  return sidebars.get(id)?.side;
}

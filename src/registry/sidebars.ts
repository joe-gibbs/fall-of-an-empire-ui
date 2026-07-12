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

/** Returns the pane selected by the sidebar's registration. */
export function getSidebarSide(id: string | null | undefined): 'left' | 'right' | undefined {
  if (!id) return undefined;
  return sidebars.get(id)?.side;
}

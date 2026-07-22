import type { ScreenRegistration } from './types';
import { isVisibleForFactionMode } from './factionMode';

const screens = new Map<string, ScreenRegistration>();

/**
 * Register a screen. Later registrations with the same id replace earlier
 * ones (last-wins), which gives mods a simple override path: import your
 * own registry module after the builtins and re-register the id.
 */
export function registerScreen(registration: ScreenRegistration): void {
  screens.set(registration.id, registration);
}

export function unregisterScreen(id: string): void {
  screens.delete(id);
}

export function getScreen(id: string | null | undefined): ScreenRegistration | undefined {
  if (!id) return undefined;
  return screens.get(id);
}

export function getAllScreens(): ScreenRegistration[] {
  return Array.from(screens.values());
}

function visibleInMode(screen: ScreenRegistration, subjectMode?: boolean): boolean {
  return subjectMode === undefined || isVisibleForFactionMode(screen, subjectMode);
}

/** Which screen should a click on the given topbar button open? */
export function getScreenOpenedByTopbar(topbarId: string, subjectMode?: boolean): ScreenRegistration | undefined {
  for (const s of screens.values()) {
    if (s.topbarId === topbarId && s.openedByTopbar !== false && visibleInMode(s, subjectMode)) return s;
  }
  return undefined;
}

/** Resolve a screen from an incoming `ui.show_screen` event name. */
export function getScreenByBridgeName(name: string, subjectMode?: boolean): ScreenRegistration | undefined {
  const lower = name.toLowerCase();
  for (const s of screens.values()) {
    if (!visibleInMode(s, subjectMode)) continue;
    if (s.id.toLowerCase() === lower) return s;
    if (s.bridgeNames?.includes(lower)) return s;
  }
  return undefined;
}

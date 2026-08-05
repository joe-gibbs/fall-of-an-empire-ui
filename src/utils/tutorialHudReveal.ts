/**
 * Compact HUD (Deck / short viewports) hides some chrome inside dropdowns.
 * Tutorial spotlights only resolve visible DOM targets, so when a target lives
 * only inside a closed menu we ask that menu to open and stay open.
 */

export const TUTORIAL_REVEAL_SCREENS_MENU = 'tutorial:reveal-screens-menu';
export const TUTORIAL_REVEAL_MAP_MODE_PICKER = 'tutorial:reveal-map-mode-picker';

export interface TutorialHudRevealDetail {
  tokens: string[];
}

/** Targets that exist on the always-visible compact host without opening the menu. */
const SCREENS_MENU_HOST_ONLY = new Set([
  'screenbuttongroup',
  'factionbutton',
  'actionbuttongroup',
]);

const SCREENS_MENU_ENTRY_TOKENS = new Set([
  'militarybutton',
  'diplomacybutton',
  'charactersearchbutton',
  'powerblocsbutton',
  'settlementfinderbutton',
  'encyclopediabutton',
  'buildqueuebutton',
  'victoryconditionsbutton',
  'pinneditemstogglebutton',
  'ledgerbutton',
]);

function normaliseToken(token: string): string {
  return token.trim().toLowerCase();
}

export function tokensNeedScreensMenuReveal(tokens: readonly string[]): boolean {
  const lower = tokens.map(normaliseToken).filter(Boolean);
  if (lower.length === 0) return false;
  if (lower.every((token) => SCREENS_MENU_HOST_ONLY.has(token))) return false;
  return lower.some((token) => (
    token.startsWith('screenbutton:')
    || SCREENS_MENU_ENTRY_TOKENS.has(token)
  ));
}

export function tokensNeedMapModePickerReveal(tokens: readonly string[]): boolean {
  const lower = tokens.map(normaliseToken).filter(Boolean);
  if (lower.length === 0) return false;
  // MapModeButtonGroup sits on the closed trigger; only open for a specific mode.
  return lower.some((token) => token.startsWith('mapmode:') && token !== 'mapmodebuttongroup');
}

export function requestTutorialHudReveal(tokens: readonly string[]): void {
  if (typeof window === 'undefined') return;
  const normalised = tokens.map(normaliseToken).filter(Boolean);
  if (normalised.length === 0) return;

  if (tokensNeedScreensMenuReveal(normalised)) {
    window.dispatchEvent(new CustomEvent<TutorialHudRevealDetail>(TUTORIAL_REVEAL_SCREENS_MENU, {
      detail: { tokens: normalised },
    }));
  }

  if (tokensNeedMapModePickerReveal(normalised)) {
    window.dispatchEvent(new CustomEvent<TutorialHudRevealDetail>(TUTORIAL_REVEAL_MAP_MODE_PICKER, {
      detail: { tokens: normalised },
    }));
  }
}

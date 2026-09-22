// Keep in sync with StrategyGameInstance GetLoadingScreenBackgrounds.
export const LOADING_SCREEN_BACKGROUNDS = [
  '/assets/loading-screens/desert.png',
  '/assets/loading-screens/general.png',
  '/assets/loading-screens/hovel.png',
  '/assets/loading-screens/intrigue.png',
  '/assets/loading-screens/limes.png',
  '/assets/loading-screens/meeting.png',
  '/assets/loading-screens/raiders.png',
  '/assets/loading-screens/rephsian-navy.png',
  '/assets/loading-screens/siege.png',
  '/assets/loading-screens/steppe.png',
] as const;

export const LOADING_SCREEN_FALLBACK_BACKGROUND = '/assets/loading-screens/general.png';
export const LOADING_SCREEN_LOGO = '/assets/main-menu-logo.png';

export type LoadingAppMode = 'mainmenu' | 'ingame' | 'loading';
export type LoadingContentAppMode = 'mainmenu' | 'ingame';

export function resolveLoadingContentAppMode(
  appMode: LoadingAppMode | null,
  lastContentAppMode: LoadingContentAppMode | null,
  overlayPictureReady: boolean,
): LoadingContentAppMode | null {
  if (appMode === 'loading') {
    return overlayPictureReady ? null : lastContentAppMode;
  }
  if (appMode === 'mainmenu' || appMode === 'ingame') {
    return appMode;
  }
  return null;
}

export function shouldShowLoadingOverlay(
  visible: boolean,
  pictureReady: boolean,
  isClosing: boolean,
): boolean {
  if (isClosing) {
    return true;
  }
  return visible && pictureReady;
}

export function resolvePresentedAppMode(
  appMode: LoadingAppMode | null,
  overlayPictureReady: boolean,
): LoadingAppMode | null {
  if (!appMode) {
    return null;
  }
  if (appMode === 'loading') {
    return overlayPictureReady ? 'loading' : null;
  }
  return appMode;
}

export function shouldNotifyLoadingAppModeRendered(
  appMode: LoadingAppMode | null,
  overlayPictureReady: boolean,
): boolean {
  return resolvePresentedAppMode(appMode, overlayPictureReady) != null;
}

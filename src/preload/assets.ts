import { getAllTopbarButtons, getScreen, getSidebar } from '../registry/index';
import { WebkilnAssetPath } from '../utils/assets';

type WebUIAssetPreloadMode = 'mainmenu' | 'ingame' | null;

const COMMON_ASSETS = [
  '/assets/main-menu-logo.png',
  '/assets/loading-screens/general.png',
  '/assets/baked/texture-overlay-heavy.png',
  '/assets/baked/texture-overlay-dark.png',
  '/assets/baked/modal-charcoal.png',
  '/assets/baked/panel-dark.png',
  '/assets/baked/panel-charcoal.png',
  '/assets/baked/screen-charcoal.png',
  '/assets/baked/screen-content-charcoal.png',
  '/assets/baked/card-charcoal.png',
  '/assets/baked/card-charcoal-hover.png',
  '/assets/baked/button-burgundy.png',
  '/assets/baked/button-burgundy-hover.png',
  '/assets/baked/button-burgundy-active.png',
  '/assets/baked/icon-button.png',
  '/assets/baked/icon-button-hover.png',
  '/assets/baked/icon-button-gold.png',
  '/assets/baked/icon-button-gold-hover.png',
  '/assets/baked/button-close-dark.png',
  '/assets/baked/button-close-red.png',
  '/assets/baked/bar-track.png',
  '/assets/baked/badge-gold.png',
  '/assets/ui-shadowed/T_TopNavbar_Left.png',
  '/assets/ui-shadowed/T_TopNavbar_Right.png',
  '/assets/ui-shadowed/T_TopNavbar_PortraitCircle.png',
  '/assets/ui-shadowed/T_TopNavbar_StripLeft.png',

  '/assets/ui-shadowed/T_CentreBorder.png',
  '/assets/icons/I_Coins.png',
  '/assets/icons/I_BuildingsQuickButton.png',
  '/assets/icons/Victory/I_Victory_Gold.png',
  '/assets/icons/I_Pin_Pinned.png',
  '/assets/icons/I_Pin_Unpinned.png',
  '/assets/icons/I_Domain.png',
  '/assets/icons/I_Characters.png',
  '/assets/icons/I_Diplomacy.png',
  '/assets/icons/I_Economy.png',
  '/assets/icons/I_IndependentFactions.png',
  '/assets/icons/I_DependentFactions.png',
  '/assets/icons/I_Religions.png',
  '/assets/icons/I_Ledger.png',
  '/assets/icons/I_ArmiesQuickButton.png',
  '/assets/icons/I_Capital.png',
  '/assets/icons/I_Family.png',
  '/assets/icons/I_Encyclopedia.png',
  '/assets/icons/I_PowerBlocs.png',
  '/assets/icons/I_Chart.png',
  '/assets/icons/I_GoalMet.png',
  '/assets/icons/I_GoalPartial.png',
  '/assets/icons/I_GoalNotMet.png',
  '/assets/icons/I_Terrain.png',
  '/assets/icons/I_Cultures.png',
  '/assets/icons/I_Bishop.png',
  '/assets/icons/I_Region.png',
  '/assets/icons/I_Land.png',
  '/assets/icons/I_Resources.png',
  '/assets/icons/I_Population.png',
  '/assets/icons/I_Unrest.png',
  '/assets/icons/I_Skull.png',
  '/assets/icons/I_Loyalty.png',
  '/assets/icons/I_Peace.png',
  '/assets/icons/I_ResourceConsumption.png',
  '/assets/icons/Treaties/I_TradeAgreement.png',
  '/assets/icons/Doctrines/I_Doctrine_Garrison.png',
  '/assets/icons/Armies/I_ArmyRephsian.png',
  '/assets/traits/Corrupt.png',
  '/assets/glance/glance-panel.png',
  '/assets/glance/glance-panel-strong.png',
  '/assets/glance/glance-chip.png',
  '/assets/glance/glance-bar-track.png',
  '/assets/glance/glance-brush-plate.png',
  '/assets/glance/glance-brush-signal.png',
  '/assets/glance/settlement-label-brush.png',
  '/assets/glance/rings/military-ring-stack-own.png',
  '/assets/glance/rings/military-ring-stack-ally.png',
  '/assets/glance/rings/military-ring-stack-enemy.png',
  '/assets/glance/rings/military-ring-stack-neutral.png',
  '/assets/glance/military-relations-v1/military-relation-own.png',
  '/assets/glance/military-relations-v1/military-relation-ally.png',
  '/assets/glance/military-relations-v1/military-relation-enemy.png',
  '/assets/glance/military-relations-v1/military-relation-neutral.png',
  '/assets/glance/rings/imperial-standing-ring-stack.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-village-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-village-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-village-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-village-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-village-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-village-hover-overlay.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-town-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-town-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-town-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-town-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-town-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-town-hover-overlay.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-city-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-city-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-city-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-city-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-city-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-city-hover-overlay.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-metropolis-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-metropolis-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-metropolis-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-metropolis-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-metropolis-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-metropolis-hover-overlay.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-fortress-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-fortress-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-fortress-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-fortress-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-fortress-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-fortress-hover-overlay.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-monastery-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-monastery-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-monastery-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-monastery-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-monastery-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-monastery-hover-overlay.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-port-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-port-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-port-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-port-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-port-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-port-hover-overlay.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-mining-shadow.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-mining-background.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-mining-enamel-mask.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-mining-enamel-light.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-mining-foreground.png',
  '/assets/glance/settlement-types-v3/layers/settlement-badge-mining-hover-overlay.png',
] as const;

const MAIN_MENU_ASSETS = [
  '/assets/main-menu-background.png',
  '/assets/baked/main-menu-panel.png',
  '/assets/baked/main-menu-panel-soft.png',
  '/assets/baked/main-menu-button.png',
  '/assets/baked/main-menu-button-hover.png',
  '/assets/baked/main-menu-social.png',
  '/assets/baked/main-menu-social-hover.png',
  '/assets/baked/main-menu-stamp.png',
  '/assets/ui-shadowed/T_MainMenuGradient.png',
] as const;

const IN_GAME_ASSETS = [
  '/assets/icons/Command/I_Command_Direct.png',
  '/assets/icons/I_Swords.png',
  '/assets/icons/Siege/besiege.png',
  '/assets/icons/I_Anchor.png',
  '/assets/icons/I_Port.png',
  '/assets/icons/I_MergeUnits.png',
  '/assets/ui-shadowed/T_Paused_Active.png',
  '/assets/ui-shadowed/T_Play_Active.png',
  '/assets/ui-shadowed/T_Speed_Inctive.png',
  '/assets/ui-shadowed/T_Speedx1_Active_copy.png',
  '/assets/ui-shadowed/T_Speedx2_Active.png',
  '/assets/ui-shadowed/T_Speedx3_Active.png',
  '/assets/ui-shadowed/T_Speedx4_Active.png',
  '/assets/notification-scroll-edge-left.png',
  '/assets/notification-scroll-edge-right.png',
  '/assets/notification-scroll-shadow.png',
] as const;

const retainedImages = new Map<string, HTMLImageElement>();
const inFlightImages = new Set<string>();
const queuedImages: string[] = [];
const queuedImageSources = new Set<string>();
const preloadedModes = new Set<WebUIAssetPreloadMode>();
const APP_PRELOAD_BATCH_SIZE = 8;
const APP_PRELOAD_BATCH_DELAY_MS = 16;
let queuedPreloadTimer = 0;

function resolvedAssetPath(path: string): string {
  return WebkilnAssetPath(path) ?? path;
}

function preloadResolvedImageAsset(src: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (retainedImages.has(src) || inFlightImages.has(src)) {
    return;
  }

  const image = document.createElement('img');
  inFlightImages.add(src);
  retainedImages.set(src, image);

  const finish = () => {
    inFlightImages.delete(src);
  };

  image.onload = finish;
  image.onerror = finish;
  image.src = src;
}

export function preloadImageAsset(path: string): void {
  preloadResolvedImageAsset(resolvedAssetPath(path));
}

function preloadImages(paths: readonly string[]): void {
  for (const path of paths) {
    preloadImageAsset(path);
  }
}

export function preloadImageAssets(paths: readonly string[]): void {
  preloadImages(paths);
}

function preloadTopbarButtonIcons(): void {
  for (const button of getAllTopbarButtons()) {
    if (button.icon.length > 0) {
      queueImagePreload(button.icon);
    }
    if (button.preloadAssets) {
      queueImagePreloads(button.preloadAssets);
    }
  }
}

function flushQueuedImagePreloads(): void {
  queuedPreloadTimer = 0;

  for (let i = 0; i < APP_PRELOAD_BATCH_SIZE && queuedImages.length > 0; i += 1) {
    const src = queuedImages.shift();
    if (!src) break;
    queuedImageSources.delete(src);
    preloadResolvedImageAsset(src);
  }

  if (queuedImages.length > 0) {
    queuedPreloadTimer = window.setTimeout(flushQueuedImagePreloads, APP_PRELOAD_BATCH_DELAY_MS);
  }
}

function scheduleQueuedImagePreloads(): void {
  if (queuedPreloadTimer !== 0 || typeof window === 'undefined') {
    return;
  }

  queuedPreloadTimer = window.setTimeout(flushQueuedImagePreloads, APP_PRELOAD_BATCH_DELAY_MS);
}

function queueImagePreload(path: string): void {
  const src = resolvedAssetPath(path);
  if (retainedImages.has(src) || inFlightImages.has(src) || queuedImageSources.has(src)) {
    return;
  }

  queuedImageSources.add(src);
  queuedImages.push(src);
  scheduleQueuedImagePreloads();
}

function queueImagePreloads(paths: readonly string[]): void {
  for (const path of paths) {
    queueImagePreload(path);
  }
}

export function preloadScreenAssets(screenId: string | null | undefined): void {
  const assets = getScreen(screenId)?.preloadAssets;
  if (assets) {
    preloadImages(assets);
  }
}

export function preloadSidebarAssets(sidebarId: string | null | undefined): void {
  const assets = getSidebar(sidebarId)?.preloadAssets;
  if (assets) {
    preloadImages(assets);
  }
}

export function preloadWebUIAssets(mode: WebUIAssetPreloadMode): void {
  if (!mode) {
    return;
  }

  if (!preloadedModes.has(null)) {
    queueImagePreloads(COMMON_ASSETS);
    preloadTopbarButtonIcons();
    preloadedModes.add(null);
  }

  if (preloadedModes.has(mode)) {
    return;
  }

  queueImagePreloads(mode === 'mainmenu' ? MAIN_MENU_ASSETS : IN_GAME_ASSETS);
  preloadedModes.add(mode);
}

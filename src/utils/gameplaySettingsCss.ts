import type { SettingsGameplayDTO } from '../bridge-types.generated.ts';

/** Matches settings slider and StrategySettingsSubsystem clamp (50%–150%). */
export const UI_SCALE_MIN = 0.5;
export const UI_SCALE_MAX = 1.5;

export function clampUIScale(uiScale: number): number {
  if (!Number.isFinite(uiScale) || uiScale <= 0) {
    return 1;
  }
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, uiScale));
}

export function applyUIScaleCssVariable(uiScale: number) {
  if (Number.isFinite(uiScale) && uiScale > 0) {
    document.documentElement.style.setProperty('--ui-scale', String(clampUIScale(uiScale)));
  }
}

export function applyGameplayCssVariables(gameplay: SettingsGameplayDTO) {
  applyUIScaleCssVariable(gameplay.uiScale);
  if (Number.isFinite(gameplay.uiScrollSpeed) && gameplay.uiScrollSpeed > 0) {
    document.documentElement.style.setProperty('--ui-scroll-speed', String(gameplay.uiScrollSpeed));
  }
  if (Number.isFinite(gameplay.tooltipDelaySeconds) && gameplay.tooltipDelaySeconds >= 0) {
    document.documentElement.style.setProperty('--tooltip-delay-ms', String(Math.round(gameplay.tooltipDelaySeconds * 1000)));
  }
  document.documentElement.classList.toggle('ui-reduce-motion', gameplay.reduceMotion);
}

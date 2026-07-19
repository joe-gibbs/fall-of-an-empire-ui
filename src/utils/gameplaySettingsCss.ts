import type { SettingsGameplayDTO } from '../bridge-types.generated.ts';

export function applyUIScaleCssVariable(uiScale: number) {
  if (Number.isFinite(uiScale) && uiScale > 0) {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
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

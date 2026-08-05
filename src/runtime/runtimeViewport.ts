// Runtime viewport helpers are shared by the Webkiln host and mock browser mode.
import { UI_PRESENTATION } from '../config/presentation';

export interface RuntimeViewportState {
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  width?: number;
  height?: number;
  renderWidth?: number;
  renderHeight?: number;
}

declare global {
  interface Window {
    __webkilnRuntimeViewport?: RuntimeViewportState;
  }
}

export function applyRuntimeViewportScale(detail: RuntimeViewportState | undefined) {
  const scale = detail?.scale ?? detail?.scaleX ?? 1;
  const safeScale = scale > 0 ? scale : 1;
  const scaledRootFontPx = UI_PRESENTATION.rootFontSizePx * safeScale;
  const rootFontPx = Math.max(scaledRootFontPx, UI_PRESENTATION.minRootFontSizePx);

  document.documentElement.style.setProperty('--runtime-root-font-size', `${rootFontPx}px`);
  document.documentElement.style.setProperty('--runtime-viewport-scale', String(safeScale));
}

export function setRuntimeClass(isWebkiln: boolean) {
  const root = document.documentElement;
  if (isWebkiln) {
    root.classList.add('webui-runtime');
    root.classList.remove('webui-standalone');
    applyRuntimeViewportScale(window.__webkilnRuntimeViewport);
  } else {
    root.classList.add('webui-standalone');
    root.classList.remove('webui-runtime');
    applyRuntimeViewportScale({ scale: 1 });
  }
}


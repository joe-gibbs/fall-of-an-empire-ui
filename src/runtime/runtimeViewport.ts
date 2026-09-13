// Runtime viewport helpers are shared by the Webkiln host and mock browser mode.
import { UI_PRESENTATION } from '../config/presentation.ts';

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
  // The host reports logical viewport scale, which already includes inverse CEF DPI.
  // Apply the legibility floor in physical pixels, then return to CSS pixels.
  // index.css applies the player's UI scale once after this compensation.
  const dpi = window.devicePixelRatio;
  const scaledRootFontPx = UI_PRESENTATION.rootFontSizePx * safeScale * dpi;
  const rootFontPx = Math.max(scaledRootFontPx, UI_PRESENTATION.minRootFontSizePx) / dpi;

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

export function bindRuntimeViewportScaleEvents() {
  let viewport = window.__webkilnRuntimeViewport;
  const updateScale = () => applyRuntimeViewportScale(viewport);
  window.addEventListener('webkiln:runtime-viewport', (event) => {
    viewport = (event as CustomEvent<RuntimeViewportState>).detail;
    updateScale();
  });
  // The native viewport notification can precede Chromium's DPI update.
  // Recalculate when the browser has applied its new viewport and pixel ratio.
  window.addEventListener('resize', updateScale);
  const watchPixelRatio = () => {
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
      updateScale();
      watchPixelRatio();
    }, { once: true });
  };
  watchPixelRatio();
}


/** Authored chrome width inside .topbar-scale (frozen 13.2px em canvas). */
const TOPBAR_DESIGN_VIEWPORT_PX = 1920;
const TOPBAR_MIN_LAYOUT_SCALE = 0.55;

/**
 * Pin the topbar across the real viewport.
 *
 * The chrome is authored for 1920 CSS px with a frozen 13.2px em base inside
 * .topbar-scale. On narrower viewports the 1920 canvas is scaled down so
 * left / centre / right still fit. On wider viewports the canvas expands to
 * the real width (scale stays 1) so left stays left, right stays right, and
 * the date stays centred — instead of a 1920 block stuck on the left.
 *
 * Viewport width alone drives this; global UI-scale rem inflation does not.
 */
export function updateTopbarLayoutScale() {
  const viewportWidth = Math.max(1, window.innerWidth || TOPBAR_DESIGN_VIEWPORT_PX);
  const scale = Math.min(
    1,
    Math.max(TOPBAR_MIN_LAYOUT_SCALE, viewportWidth / TOPBAR_DESIGN_VIEWPORT_PX),
  );
  // Expand past the design width on wide screens; keep 1920 when scaling down.
  const canvasWidth = viewportWidth > TOPBAR_DESIGN_VIEWPORT_PX
    ? viewportWidth
    : TOPBAR_DESIGN_VIEWPORT_PX;

  const root = document.documentElement;
  root.style.setProperty('--topbar-layout-scale', scale.toFixed(4));
  root.style.setProperty('--topbar-design-width', `${Math.round(canvasWidth)}px`);
}

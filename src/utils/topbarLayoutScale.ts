/** Matches --topbar-design-width in TopBar.css (frozen 13.2px chrome canvas). */
const TOPBAR_DESIGN_VIEWPORT_PX = 1920;
const TOPBAR_MIN_LAYOUT_SCALE = 0.55;

/**
 * Fit the 1920px design canvas into the real viewport.
 * Chrome sizes are frozen to a 13.2px em base inside .topbar-scale, so only
 * viewport width drives this scale — not the global UI-scale rem inflation.
 */
export function updateTopbarLayoutScale() {
  const scale = Math.min(1, Math.max(TOPBAR_MIN_LAYOUT_SCALE, window.innerWidth / TOPBAR_DESIGN_VIEWPORT_PX));
  document.documentElement.style.setProperty('--topbar-layout-scale', scale.toFixed(4));
}

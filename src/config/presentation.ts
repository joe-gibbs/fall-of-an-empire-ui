export const UI_PRESENTATION = {
  // Root font size used to calibrate rem-based game UI measurements at the
  // 1920x1080 design resolution (Webkiln multiplies this by viewport/design scale).
  rootFontSizePx: 13.2,
  // Absolute floor after viewport scaling. At Steam Deck 1280x800 the design
  // scale is ~0.67, which would otherwise yield ~9px body text. This keeps
  // frequently read rem text near or above Valve's 12px legibility guideline
  // once default UI scale and body rem sizes are applied.
  minRootFontSizePx: 14,
  worldAnchors: {
    // Opacity at or below which a world-anchored element is excluded from presentation.
    visibleOpacityThreshold: 0.05,
    // Visual scale applied to notification banners anchored over settlements.
    notificationScale: 0.7,
  },
  tooltip: {
    // Delay before the first tooltip in a hover chain may open, before the player's preference is applied.
    // Later tooltips in the same chain open immediately until the pointer leaves for a non-tooltip area.
    minimumDelayMs: 450,
    // Grace period after the pointer leaves a tooltip surface before closing.
    // Long enough to travel between a parent tooltip and a nested child without dismissing.
    hideGraceMs: 350,
    // Minimum distance maintained between a tooltip and the viewport edge.
    viewportPaddingPx: 8,
    // Standard gap between a tooltip and its target.
    gapPx: 12,
    // Gap between nested tooltips.
    nestedGapPx: 6,
    // Vertical offset applied when placing a nested tooltip.
    nestedVerticalOffsetPx: 8,
    // Frames allowed for tooltip placement to settle after content changes.
    placementStabiliseFrames: 8,
  },
} as const;

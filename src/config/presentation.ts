export const UI_PRESENTATION = {
  // Root font size used to calibrate rem-based game UI measurements.
  rootFontSizePx: 13.2,
  worldAnchors: {
    // Opacity at or below which a world-anchored element is excluded from presentation.
    visibleOpacityThreshold: 0.05,
    // Visual scale applied to notification banners anchored over settlements.
    notificationScale: 0.7,
  },
  tooltip: {
    // Minimum delay before a tooltip may open, before the player's preference is applied.
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

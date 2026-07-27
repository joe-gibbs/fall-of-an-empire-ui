export const UI_PERFORMANCE = {
  // Minimum item count at which lists switch to virtualised rendering.
  virtualListThreshold: 24,
  // Extra rows rendered above and below a virtualised list's visible range.
  virtualListOverscan: 8,
  // Rows shown per page by the economy ledger's large data tables.
  ledgerPageSize: 150,
  worldGlances: {
    // Delay before a large detail-level change begins applying to mounted glances.
    detailFlushDelayMs: 180,
    // Maximum detail-class changes applied in one flush.
    detailFlushBatchSize: 4,
    // Delay between detail-class batches.
    detailFlushBatchIntervalMs: 32,
    // Maximum glance bodies hydrated in one animation frame.
    contentHydrationBatchSize: 8,
  },
} as const;

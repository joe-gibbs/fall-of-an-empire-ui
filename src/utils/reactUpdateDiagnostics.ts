/**
 * Optional report text for max-update-depth log formatting.
 *
 * Do not install setState / useSyncExternalStore wrappers here. Hook wrappers previously
 * restarted external stores and amplified React #185 on the world-glances atlas.
 */

export function formatTopUpdaters(): string[] {
  return []
}

export function getUpdateDepthDiagnosticReport(): string {
  return '  (update-depth-sampling-disabled)'
}

/** Formats a live control chord from settings controls for player-facing UI. */

export interface ActionBindingLike {
  actionName: string;
  keyDisplay?: string;
  keyName?: string;
  glyphId?: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  cmd?: boolean;
  isAxis?: boolean;
}

/**
 * First matching non-axis binding for `actionName`, or null when unbound.
 * Prefer this when rendering KeyGlyph; use formatActionBinding for plain text.
 */
export function findActionBinding(
  controls: readonly ActionBindingLike[] | null | undefined,
  actionName: string,
): ActionBindingLike | null {
  if (!controls || !actionName) return null;

  return controls.find((entry) => (
    entry.actionName === actionName
    && !entry.isAxis
    && Boolean(entry.keyDisplay || entry.keyName)
  )) ?? null;
}

/**
 * Build a display string such as "Ctrl+F" or "Space" from the first matching
 * non-axis binding for `actionName`. Empty when unbound or missing.
 */
export function formatActionBinding(
  controls: readonly ActionBindingLike[] | null | undefined,
  actionName: string,
): string {
  const match = findActionBinding(controls, actionName);
  if (!match) return '';

  const key = (match.keyDisplay || match.keyName || '').trim();
  if (!key) return '';

  const parts: string[] = [];
  if (match.ctrl) parts.push('Ctrl');
  if (match.shift) parts.push('Shift');
  if (match.alt) parts.push('Alt');
  if (match.cmd) parts.push('Cmd');
  parts.push(key);
  return parts.join('+');
}

/**
 * Map-mode UI id -> rebindable MapMode_* action name.
 * Mirrors MapModeInfo::GetMapModeActionName in AngelScript.
 */
const MAP_MODE_ACTION_OVERRIDES: Readonly<Record<string, string>> = {
  political: 'MapMode_Factions',
  diplomaticRelation: 'MapMode_Diplomacy',
  landscape: 'MapMode_Terrain',
  economicProsperity: 'MapMode_Economy',
  militaries: 'MapMode_Military',
};

export function getMapModeActionName(modeId: string): string {
  if (!modeId) return '';
  const override = MAP_MODE_ACTION_OVERRIDES[modeId];
  if (override) return override;
  return `MapMode_${modeId.charAt(0).toUpperCase()}${modeId.slice(1)}`;
}

/** Topbar screen id -> rebindable Screen_* action name. */
export const TOPBAR_SCREEN_ACTIONS: Readonly<Record<string, string>> = {
  faction: 'Screen_FactionOverview',
  military: 'Screen_Military',
  economy: 'Screen_Economy',
  diplomacy: 'Screen_Factions',
  characters: 'Screen_CharacterFinder',
  powerblocs: 'Screen_PowerBlocs',
  family: 'Screen_Relationships',
  ledger: 'Screen_Ledger',
  encyclopedia: 'Screen_BuildingEncyclopedia',
};

/**
 * Stepper help text. Shift/Ctrl multipliers are raw modifier keys in WebUI.
 * When a live batch-production binding is supplied, it is appended so players
 * can find the rebindable control in Settings.
 */
export function stepModifiersHelpText(
  format: (key: string, args?: Record<string, string | number>) => string,
  batchProductionKey = '',
): string {
  const base = format('Common.StepModifiersBody');
  if (!batchProductionKey) return base;
  return format('Common.StepModifiersWithBatchKey', { Key: batchProductionKey });
}

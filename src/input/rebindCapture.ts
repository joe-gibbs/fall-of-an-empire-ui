export type RebindCaptureMods = {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  cmd: boolean;
};

export type RebindCaptureResult =
  | { type: 'cancel' }
  | { type: 'mods'; mods: RebindCaptureMods }
  | { type: 'bind'; keyName: string; mods: RebindCaptureMods }
  | { type: 'ignore' };

function readMods(payload: {
  shift?: unknown;
  ctrl?: unknown;
  alt?: unknown;
  cmd?: unknown;
}): RebindCaptureMods {
  return {
    shift: Boolean(payload.shift),
    ctrl: Boolean(payload.ctrl),
    alt: Boolean(payload.alt),
    cmd: Boolean(payload.cmd),
  };
}

/** Native `ui.rebind_key` payload from the player controller while the overlay is listening. */
export function interpretRebindCapture(payload: unknown): RebindCaptureResult {
  if (!payload || typeof payload !== 'object') return { type: 'ignore' };

  const data = payload as {
    keyName?: unknown;
    shift?: unknown;
    ctrl?: unknown;
    alt?: unknown;
    cmd?: unknown;
    isModifier?: unknown;
  };
  const mods = readMods(data);
  const keyName = typeof data.keyName === 'string' ? data.keyName : '';
  if (keyName === 'Escape') return { type: 'cancel' };
  if (data.isModifier || keyName.length === 0) return { type: 'mods', mods };
  return { type: 'bind', keyName, mods };
}

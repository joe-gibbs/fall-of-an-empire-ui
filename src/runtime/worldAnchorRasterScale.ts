import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let rasterScale = 1;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): number {
  return rasterScale;
}

export function setWorldAnchorRasterScale(scale: unknown): void {
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0 || scale === rasterScale) return;
  rasterScale = scale;
  for (const listener of listeners) listener();
}

export function useWorldAnchorRasterScale(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

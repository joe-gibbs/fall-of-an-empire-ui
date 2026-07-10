import { useSyncExternalStore, type ReactNode } from 'react';

export interface ModWorldGlanceEntry {
  anchorKey: string;
  payload: unknown;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface WorldGlanceInput {
  anchorKey: string;
  payload: unknown;
  mouseButton: 'left' | 'right';
  shiftKey: boolean;
}

export interface WorldGlanceHover {
  anchorKey: string;
  payload: unknown;
  hovered: boolean;
}

export interface WorldGlanceRegistration {
  // Matches the provider id passed to SendNativeModWorldGlancesFrameToUI.
  id: string;
  render: (entry: ModWorldGlanceEntry) => ReactNode;
  onInput?: (input: WorldGlanceInput) => void;
  onHover?: (hover: WorldGlanceHover) => void;
  anchorPoint?: string;
  rasterScale?: number;
}

const registrations = new Map<string, WorldGlanceRegistration>();
const listeners = new Set<() => void>();
let snapshot: readonly WorldGlanceRegistration[] = [];

function publish(): void {
  snapshot = Array.from(registrations.values());
  for (const listener of listeners) {
    listener();
  }
}

export function registerWorldGlance(registration: WorldGlanceRegistration): void {
  registrations.set(registration.id, registration);
  publish();
}

export function unregisterWorldGlance(id: string): void {
  if (registrations.delete(id)) {
    publish();
  }
}

export function getWorldGlance(id: string): WorldGlanceRegistration | undefined {
  return registrations.get(id);
}

export function getAllWorldGlances(): readonly WorldGlanceRegistration[] {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): readonly WorldGlanceRegistration[] {
  return snapshot;
}

// Runtime content packs may load after the HUD has mounted. This lets both the regular overlay
// and the anchor atlas acquire a newly registered renderer without recreating either root.
export function useWorldGlanceRegistrations(): readonly WorldGlanceRegistration[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

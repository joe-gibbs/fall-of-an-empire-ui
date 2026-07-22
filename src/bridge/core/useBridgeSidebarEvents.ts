import { useEffect } from 'react';
import type { ScreenType, SidebarType } from '../../context/GameContext';
import { getScreenByBridgeName } from '../../registry/index';
import { clearFactionCache } from '../diplomacy/useFactionBridge';
import { clearFormationTemplateCache } from '../military-map/useFormationTemplatesBridge';
import { clearMilitaryCache } from '../military-map/useMilitaryBridge';
import { clearPowerBlocCache } from '../diplomacy/usePowerBlocsBridge';
import { recordUIPerfSpan } from '../../perf/uiPerfProfiler';

interface SidebarEvent {
  type: string;
  id?: string;
  entityType?: string;
  tabIndex?: number;
}

interface ShowScreenEvent {
  screen: string;
  id?: string;
}

const pendingSidebarTabs = new Map<string, SidebarEvent>();

function sidebarTabKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function dispatchSidebarTabEvent(data: SidebarEvent) {
  if (typeof data.tabIndex !== 'number' || data.tabIndex < 0) return;
  if (data.type && data.id) {
    pendingSidebarTabs.set(sidebarTabKey(data.type, data.id), data);
  }

  const event = new CustomEvent('ui.sidebar_tab_event', { detail: data });
  bridgeEvents.dispatchEvent(event);
  window.setTimeout(() => bridgeEvents.dispatchEvent(event), 0);
}

export function consumePendingSidebarTab(type: string, id: string): number | undefined {
  const key = sidebarTabKey(type, id);
  const pending = pendingSidebarTabs.get(key);
  if (!pending || typeof pending.tabIndex !== 'number' || pending.tabIndex < 0) return undefined;

  pendingSidebarTabs.delete(key);
  return pending.tabIndex;
}

/**
 * Listens for sidebar open/close events pushed from the game bridge
 * and dispatches them to the GameContext sidebar actions.
 *
 * The close paths MUST use local-only closers (no bridge round-trip), otherwise
 * we get a feedback loop: game broadcasts close -> we call a hide action ->
 * game broadcasts close again -> infinite.
 *
 * These events are intentionally untyped, so they aren't in the generated
 * BridgeActions type map.
 */
export function useBridgeSidebarEvents(
  openSidebar: (type: SidebarType, id?: string) => void,
  closeSidebarFromBridge: (side?: 'left' | 'right') => void,
  closeSidebarEntityFromBridge: (type: SidebarType, id?: string) => void,
  openScreen: (type: ScreenType, id?: string) => void,
  closeScreenFromBridge?: () => void,
  subjectMode?: boolean,
) {
  useEffect(() => {
    const sidebarHandler = (e: Event) => {
      const data = (e as CustomEvent).detail as SidebarEvent;
      if (!data || !data.type) return;

      const startedAtMs = Date.now();
      try {
        if (data.type === 'close') {
          closeSidebarFromBridge();
        } else if (data.type === 'close_left') {
          closeSidebarFromBridge('left');
        } else if (data.type === 'close_right') {
          closeSidebarFromBridge('right');
        } else if (data.type === 'entity_destroyed') {
          if (data.entityType === 'diplomacy') clearFactionCache(data.id);
          if (data.entityType === 'military') clearMilitaryCache(data.id);
          if (data.entityType === 'powerbloc') clearPowerBlocCache(data.id);
          if (data.entityType === 'template') clearFormationTemplateCache(data.id);
          closeSidebarEntityFromBridge(data.entityType as SidebarType, data.id);
        } else {
          openSidebar(data.type as SidebarType, data.id);
          dispatchSidebarTabEvent(data);
        }
      } finally {
        recordUIPerfSpan('bridge-event', 'ui.sidebar_event.handler', startedAtMs, Date.now(), `${data.type}:${data.id ?? ''}`);
      }
    };

    const screenHandler = (e: Event) => {
      const data = (e as CustomEvent).detail as ShowScreenEvent;
      if (!data) return;

      const startedAtMs = Date.now();
      try {
        if (!data.screen) {
          closeScreenFromBridge?.();
          return;
        }

        // Game-side names may include a "Name:Tab" suffix (e.g. "Encyclopedia:Units").
        // Strip the suffix for lookup, but keep it as the WebUI screen id when
        // the bridge event did not already split it out.
        const separatorIndex = data.screen.indexOf(':');
        const name = separatorIndex >= 0 ? data.screen.slice(0, separatorIndex) : data.screen;
        const suffixId = separatorIndex >= 0 ? data.screen.slice(separatorIndex + 1) : undefined;
        const screenId = data.id && data.id.length > 0 ? data.id : suffixId;
        const target = getScreenByBridgeName(name, subjectMode);
        if (target) openScreen(target.id, screenId);
      } finally {
        recordUIPerfSpan('bridge-event', 'ui.show_screen.handler', startedAtMs, Date.now(), `${data.screen}:${data.id ?? ''}`);
      }
    };

    const hideCurrentScreenHandler = () => {
      const startedAtMs = Date.now();
      try {
        closeScreenFromBridge?.();
      } finally {
        recordUIPerfSpan('bridge-event', 'ui.hide_current_screen.handler', startedAtMs, Date.now());
      }
    };

    bridgeEvents.addEventListener('ui.sidebar_event', sidebarHandler);
    bridgeEvents.addEventListener('ui.show_screen', screenHandler);
    bridgeEvents.addEventListener('ui.hide_current_screen', hideCurrentScreenHandler);
    return () => {
      bridgeEvents.removeEventListener('ui.sidebar_event', sidebarHandler);
      bridgeEvents.removeEventListener('ui.show_screen', screenHandler);
      bridgeEvents.removeEventListener('ui.hide_current_screen', hideCurrentScreenHandler);
    };
  }, [openSidebar, closeSidebarFromBridge, closeSidebarEntityFromBridge, openScreen, closeScreenFromBridge, subjectMode]);
}

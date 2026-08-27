import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { bridgeEvents } from '../bridge/core/bridgeEvents';
import { useEscapeStack } from '../context/EscapeStack';
import { GamepadFocusContext, type ControllerAppMode } from './GamepadFocusContext';
import { useInputMode } from './InputModeContext';
import { GAMEPAD_FOCUS_REFRESH_EVENT } from './gamepadFocusEvents';

type Direction = 'up' | 'down' | 'left' | 'right';
const dispatchedDirectionalEvents = new WeakSet<Event>();

const ROOT_SELECTOR = [
  '[data-focus-root]',
  '.modal',
  '[aria-modal="true"]',
  '.pause-overlay',
  '.event-popup',
  '.outcome-screen',
  '.settings-rebind-modal',
  '.settings-display-confirm-modal',
  '.mm-lang-modal',
  '.erd-modal',
  '.tpl-picker-dialog',
  '.chart-unit-picker-dialog',
  '.screen',
  '.sidebar-left',
  '.sidebar-right',
  '.world-search',
  '.pinned-dropdown',
  '.vc-dropdown',
  '.screens-menu-panel',
  '.map-mode-picker-panel',
  '.notification-banner--decision',
  '.notification-options-popover',
  '.advisor-drag-frame',
  '.mm-root',
  '.fs-root',
].join(',');

const FOCUSABLE_SELECTOR = [
  '[data-focusable]',
  'button:not([disabled])',
  'a[href]',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  '[role="option"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[role="slider"]:not([aria-disabled="true"])',
  'summary',
  '[tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])',
  '.clickable',
  '.icon-button',
  '.event-option',
  '[class*="-link--clickable"]',
  '.interaction-card--clickable',
  '.warning-icon-btn',
  '.pinned-item-row',
  '.screen-button-faction',
  '.speed-btn',
  '[class*="--clickable"]',
  '.is-clickable',
  '.settings-slider-track',
  '.settings-event-card',
  '.bld-node--actionable',
  '.bld-node--queueing',
  '.fov-ruler-entry',
  '.ips-foederati-row',
  '.pbs-demand-card',
  '.pbs-subject-hero',
].join(',');

function isVisible(element: HTMLElement): boolean {
  if (element.closest('[aria-hidden="true"], [inert], .slot--exiting')) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

function defaultFocusable(available: HTMLElement[]): HTMLElement | null {
  return available.find(element => element.hasAttribute('data-gamepad-default'))
    ?? available.find(element => element.matches('[aria-selected="true"], [aria-current="true"], [aria-pressed="true"]'))
    ?? available.find(element => !element.matches('.close-btn, .screen-help-button, [aria-label="Close"]'))
    ?? available[0]
    ?? null;
}

function rootPriority(root: HTMLElement): number {
  const declared = Number(root.dataset.focusPriority);
  if (Number.isFinite(declared) && declared > 0) return declared;
  if (root.matches('.modal, [aria-modal="true"], .pause-overlay, .event-popup, .outcome-screen, .settings-rebind-modal, .settings-display-confirm-modal, .mm-lang-modal, .erd-modal, .tpl-picker-dialog, .chart-unit-picker-dialog, .notification-banner--decision')) return 500;
  if (root.matches('.screen, .fs-root')) return 400;
  if (root.matches('.sidebar-left, .sidebar-right, .advisor-drag-frame')) return 300;
  if (root.matches('.world-search, .pinned-dropdown, .vc-dropdown, .screens-menu-panel, .map-mode-picker-panel, .notification-options-popover')) return 250;
  if (root.matches('.mm-root')) return 200;
  return 100;
}

function selectActiveRoot(): HTMLElement | null {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(ROOT_SELECTOR))
    .filter(root => isVisible(root) && focusables(root).length > 0);
  roots.sort((left, right) => {
    const priorityDelta = rootPriority(left) - rootPriority(right);
    if (priorityDelta !== 0) return priorityDelta;
    const position = left.compareDocumentPosition(right);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  return roots.at(-1) ?? null;
}

function setFocusedElement(previous: HTMLElement | null, next: HTMLElement | null) {
  if (previous && previous !== next) {
    previous.classList.remove('is-gamepad-focused');
    delete previous.dataset.gamepadFocused;
  }
  if (!next) return;
  if (next.tabIndex < 0) next.tabIndex = 0;
  next.classList.add('is-gamepad-focused');
  next.dataset.gamepadFocused = 'true';
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function dispatchActivation(element: HTMLElement) {
  setFocusedElement(document.activeElement instanceof HTMLElement ? document.activeElement : null, element);
  const pointerOptions: PointerEventInit = { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0 };
  const mouseOptions: MouseEventInit = { bubbles: true, cancelable: true, button: 0 };
  element.dispatchEvent(new PointerEvent('pointerdown', pointerOptions));
  element.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
  element.dispatchEvent(new PointerEvent('pointerup', pointerOptions));
  element.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
  element.dispatchEvent(new MouseEvent('click', mouseOptions));
}

function dispatchDirectionalControl(element: HTMLElement, direction: Direction): boolean {
  if (!element.matches('[role="slider"], input, select, textarea, [data-gamepad-directional]')) return false;
  if (element.matches('[role="slider"], input[type="range"]') && (direction === 'up' || direction === 'down')) {
    return false;
  }
  const key = direction === 'up' ? 'ArrowUp'
    : direction === 'down' ? 'ArrowDown'
      : direction === 'left' ? 'ArrowLeft'
        : 'ArrowRight';
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  dispatchedDirectionalEvents.add(event);
  element.dispatchEvent(event);
  return event.defaultPrevented;
}

function directionVector(direction: Direction): { x: number; y: number } {
  if (direction === 'up') return { x: 0, y: -1 };
  if (direction === 'down') return { x: 0, y: 1 };
  if (direction === 'left') return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function groupedMove(current: HTMLElement, direction: Direction, candidates: HTMLElement[]): HTMLElement | null {
  const group = current.closest<HTMLElement>('[data-focus-group], [role="menu"], [role="listbox"], [role="tablist"]');
  if (!group) return null;
  const orientation = group.dataset.focusGroup
    || group.getAttribute('aria-orientation')
    || (group.getAttribute('role') === 'tablist' ? 'horizontal' : 'vertical');
  if (orientation === 'grid') return null;
  if (orientation === 'horizontal' && direction !== 'left' && direction !== 'right') return null;
  if (orientation === 'vertical' && direction !== 'up' && direction !== 'down') return null;
  const inGroup = candidates.filter(candidate => group.contains(candidate));
  const index = inGroup.indexOf(current);
  if (index < 0 || inGroup.length < 2) return null;
  const step = direction === 'left' || direction === 'up' ? -1 : 1;
  const nextIndex = index + step;
  return nextIndex >= 0 && nextIndex < inGroup.length ? inGroup[nextIndex] ?? null : null;
}

function declaredMove(current: HTMLElement, direction: Direction, root: HTMLElement): HTMLElement | null {
  const owner = current.closest<HTMLElement>(`[data-focus-${direction}]`);
  const key = `focus${direction[0].toUpperCase()}${direction.slice(1)}`;
  const selector = owner?.dataset[key];
  if (!selector) return null;
  const target = Array.from(root.querySelectorAll<HTMLElement>(selector)).find(isVisible) ?? null;
  if (!target) return null;
  if (target.matches(FOCUSABLE_SELECTOR)) return target;
  return defaultFocusable(focusables(target));
}

function spatialMove(current: HTMLElement, direction: Direction, candidates: HTMLElement[]): HTMLElement | null {
  const currentRect = current.getBoundingClientRect();
  const currentX = currentRect.left + currentRect.width / 2;
  const currentY = currentRect.top + currentRect.height / 2;
  const vector = directionVector(direction);
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach(candidate => {
    if (candidate === current) return;
    const rect = candidate.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - currentX;
    const dy = rect.top + rect.height / 2 - currentY;
    const primary = dx * vector.x + dy * vector.y;
    if (primary <= 4) return;
    const secondary = Math.abs(dx * vector.y - dy * vector.x);
    if (secondary > primary * 1.35 + 12) return;
    const currentHalf = direction === 'left' || direction === 'right'
      ? currentRect.height / 2
      : currentRect.width / 2;
    const candidateHalf = direction === 'left' || direction === 'right'
      ? rect.height / 2
      : rect.width / 2;
    const laneGap = Math.max(0, secondary - currentHalf - candidateHalf);
    const score = primary + secondary * 0.15 + laneGap * 3.5;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  return best;
}

function scrollContainer(element: HTMLElement, root: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element.parentElement;
  while (current && current !== root) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 2) return current;
    current = current.parentElement;
  }
  return root;
}

function isTab(element: HTMLElement): boolean {
  if (element.getAttribute('role') === 'tab') return true;
  return element.className.split(/\s+/).some(name => /(^|[-_])tab($|[-_])/.test(name));
}

function eventDetail(event: Event): Record<string, unknown> {
  const detail = (event as CustomEvent<unknown>).detail;
  return detail && typeof detail === 'object' ? detail as Record<string, unknown> : {};
}

export default function GamepadFocusProvider({
  appMode,
  children,
}: {
  appMode: ControllerAppMode;
  children: ReactNode;
}) {
  const device = useInputMode();
  const { handleEscapeStack } = useEscapeStack();
  const [ownsUIInput, setOwnsUIInput] = useState(false);
  const [activeRoot, setActiveRoot] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const focusedRef = useRef<HTMLElement | null>(null);
  const savedFocusRef = useRef(new WeakMap<HTMLElement, HTMLElement>());
  const ownsRef = useRef(false);
  const refreshFrameRef = useRef(0);

  const updateOwnership = useCallback((next: boolean) => {
    if (ownsRef.current === next) return;
    ownsRef.current = next;
    setOwnsUIInput(next);
  }, []);

  const refreshRoot = useCallback(() => {
    refreshFrameRef.current = 0;
    const nextRoot = selectActiveRoot();
    const previousRoot = rootRef.current;
    if (previousRoot && focusedRef.current && previousRoot.contains(focusedRef.current)) {
      savedFocusRef.current.set(previousRoot, focusedRef.current);
    }
    rootRef.current = nextRoot;
    setActiveRoot(nextRoot);
    updateOwnership(appMode === 'mainmenu' || (appMode === 'ingame' && nextRoot !== null));

    if (device !== 'gamepad') {
      setFocusedElement(focusedRef.current, null);
      focusedRef.current = null;
      return;
    }
    if (!nextRoot) {
      setFocusedElement(focusedRef.current, null);
      focusedRef.current = null;
      return;
    }

    const available = focusables(nextRoot);
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const saved = savedFocusRef.current.get(nextRoot) ?? null;
    const next = active && nextRoot.contains(active) && available.includes(active)
      ? active
      : saved && available.includes(saved)
        ? saved
        : defaultFocusable(available);
    setFocusedElement(focusedRef.current, next);
    focusedRef.current = next;
  }, [appMode, device, updateOwnership]);

  const scheduleRefresh = useCallback(() => {
    if (refreshFrameRef.current !== 0) return;
    refreshFrameRef.current = window.requestAnimationFrame(refreshRoot);
  }, [refreshRoot]);

  useEffect(() => {
    scheduleRefresh();
  }, [device, appMode, scheduleRefresh]);

  useEffect(() => {
    window.addEventListener(GAMEPAD_FOCUS_REFRESH_EVENT, scheduleRefresh);
    return () => window.removeEventListener(GAMEPAD_FOCUS_REFRESH_EVENT, scheduleRefresh);
  }, [scheduleRefresh]);

  useEffect(() => {
    const observer = new MutationObserver(records => {
      const currentRoot = rootRef.current;
      const relevant = records.some(record => {
        const target = record.target instanceof HTMLElement ? record.target : record.target.parentElement;
        if (target && (target.matches(ROOT_SELECTOR) || target.closest(ROOT_SELECTOR))) return true;
        if (currentRoot && target && currentRoot.contains(target)) return true;
        return Array.from(record.addedNodes).some(node => (
          node instanceof HTMLElement && (node.matches(ROOT_SELECTOR) || Boolean(node.querySelector(ROOT_SELECTOR)))
        )) || Array.from(record.removedNodes).some(node => (
          node instanceof HTMLElement && (node.matches(ROOT_SELECTOR) || Boolean(node.querySelector(ROOT_SELECTOR)))
        ));
      });
      if (relevant) scheduleRefresh();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden', 'disabled'],
    });
    return () => observer.disconnect();
  }, [scheduleRefresh]);

  useEffect(() => () => {
    if (refreshFrameRef.current !== 0) {
      window.cancelAnimationFrame(refreshFrameRef.current);
      refreshFrameRef.current = 0;
    }
  }, []);

  const focusElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    setFocusedElement(focusedRef.current, element);
    focusedRef.current = element;
    if (rootRef.current) savedFocusRef.current.set(rootRef.current, element);
  }, []);

  const handleMove = useCallback((direction: Direction) => {
    const root = rootRef.current;
    if (!root) return;
    const available = focusables(root);
    const current = focusedRef.current && available.includes(focusedRef.current)
      ? focusedRef.current
      : defaultFocusable(available);
    if (!current) return;
    if (dispatchDirectionalControl(current, direction)) return;
    const grouped = groupedMove(current, direction, available);
    const declared = grouped ? null : declaredMove(current, direction, root);
    focusElement(grouped ?? declared ?? spatialMove(current, direction, available) ?? current);
  }, [focusElement]);

  const handleConfirm = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const available = focusables(root);
    const focused = focusedRef.current && available.includes(focusedRef.current)
      ? focusedRef.current
      : defaultFocusable(available);
    if (!focused) return;
    focusElement(focused);
    dispatchActivation(focused);
  }, [focusElement]);

  const handleBack = useCallback(() => {
    if (handleEscapeStack({ fromInput: false })) return;
    const root = rootRef.current;
    const back = root?.querySelector<HTMLElement>('[data-gamepad-back], .close-btn, .mm-back-btn, .mm-credits-back-btn, .fs-back-btn');
    if (back && isVisible(back)) {
      dispatchActivation(back);
      return;
    }
    if (root) return;
    if (appMode === 'ingame') {
      bridgeEvents.dispatchEvent(new CustomEvent('ui.escape_pressed', { detail: {} }));
    }
  }, [appMode, handleEscapeStack]);

  const handleSecondary = useCallback(() => {
    const root = rootRef.current;
    const focused = focusedRef.current;
    if (!root || !focused) return;
    const declared = focused.matches('[data-gamepad-secondary]')
      ? focused
      : focused.querySelector<HTMLElement>('[data-gamepad-secondary]');
    if (declared) {
      dispatchActivation(declared);
      return;
    }
    focused.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
    focused.dispatchEvent(new CustomEvent('gamepadsecondary', { bubbles: true }));
  }, []);

  const handleTertiary = useCallback(() => {
    const target = rootRef.current?.querySelector<HTMLElement>('[data-gamepad-tertiary]');
    if (target && isVisible(target)) dispatchActivation(target);
  }, []);

  const handlePage = useCallback((direction: 'up' | 'down') => {
    const root = rootRef.current;
    const focused = focusedRef.current;
    if (!root || !focused) return;
    const container = scrollContainer(focused, root);
    const distance = Math.max(container.clientHeight * 0.72, 120) * (direction === 'up' ? -1 : 1);
    container.scrollBy({ top: distance, behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    const root = rootRef.current;
    const focused = focusedRef.current;
    if (!root || !focused) return;
    const container = scrollContainer(focused, root);
    container.scrollBy({ top: direction === 'up' ? -88 : 88, behavior: 'auto' });
  }, []);

  const handleTab = useCallback((direction: 'previous' | 'next') => {
    const root = rootRef.current;
    if (!root) return;
    const tabs = focusables(root).filter(isTab);
    if (tabs.length === 0) return;
    const currentIndex = focusedRef.current ? tabs.indexOf(focusedRef.current) : -1;
    const step = direction === 'previous' ? -1 : 1;
    const next = tabs[(currentIndex + step + tabs.length) % tabs.length] ?? tabs[0];
    focusElement(next);
    dispatchActivation(next);
  }, [focusElement]);

  useEffect(() => {
    const nav = (event: Event) => {
      const direction = eventDetail(event).direction;
      if (direction === 'up' || direction === 'down' || direction === 'left' || direction === 'right') {
        handleMove(direction);
      }
    };
    const page = (event: Event) => {
      const direction = eventDetail(event).direction;
      if (direction === 'up' || direction === 'down') handlePage(direction);
    };
    const tab = (event: Event) => {
      const direction = eventDetail(event).direction;
      if (direction === 'previous' || direction === 'next') handleTab(direction);
    };
    const scroll = (event: Event) => {
      const direction = eventDetail(event).direction;
      if (direction === 'up' || direction === 'down') handleScroll(direction);
    };
    bridgeEvents.addEventListener('ui.gamepad_nav', nav);
    bridgeEvents.addEventListener('ui.gamepad_confirm', handleConfirm);
    bridgeEvents.addEventListener('ui.gamepad_back', handleBack);
    bridgeEvents.addEventListener('ui.gamepad_secondary', handleSecondary);
    bridgeEvents.addEventListener('ui.gamepad_tertiary', handleTertiary);
    bridgeEvents.addEventListener('ui.gamepad_page', page);
    bridgeEvents.addEventListener('ui.gamepad_scroll', scroll);
    bridgeEvents.addEventListener('ui.gamepad_tab', tab);
    return () => {
      bridgeEvents.removeEventListener('ui.gamepad_nav', nav);
      bridgeEvents.removeEventListener('ui.gamepad_confirm', handleConfirm);
      bridgeEvents.removeEventListener('ui.gamepad_back', handleBack);
      bridgeEvents.removeEventListener('ui.gamepad_secondary', handleSecondary);
      bridgeEvents.removeEventListener('ui.gamepad_tertiary', handleTertiary);
      bridgeEvents.removeEventListener('ui.gamepad_page', page);
      bridgeEvents.removeEventListener('ui.gamepad_scroll', scroll);
      bridgeEvents.removeEventListener('ui.gamepad_tab', tab);
    };
  }, [handleBack, handleConfirm, handleMove, handlePage, handleScroll, handleSecondary, handleTab, handleTertiary]);

  useEffect(() => {
    if (device !== 'gamepad') return undefined;
    const handleKeyboard = (event: KeyboardEvent) => {
      if (dispatchedDirectionalEvents.has(event)) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown'
        || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        handleMove(event.key.slice(5).toLowerCase() as Direction);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleConfirm();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [device, handleBack, handleConfirm, handleMove]);

  return (
    <GamepadFocusContext.Provider value={{ ownsUIInput, activeRoot }}>
      {children}
    </GamepadFocusContext.Provider>
  );
}

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useEscapeStackEntry } from '../context/EscapeStack';
import { toRootRem } from '../utils/cssUnits';
import { useAnimatedPresence } from './useAnimatedPresence';

type DropdownPosition = 'inline' | 'below-right' | 'below-left';

interface UseAnchoredDropdownOptions {
  open: boolean;
  onClose: () => void;
  durationMs: number;
  position?: DropdownPosition;
  anchorSelector?: string;
  offset?: number;
  useRootRem?: boolean;
  minSpaceBelow?: number;
  maxPopupHeight?: number;
  closeOnScroll?: boolean;
  escapeId?: string;
  allowFromInput?: boolean;
}

interface UseAnchoredDropdownResult {
  mounted: boolean;
  closing: boolean;
  style: CSSProperties | undefined;
  setTriggerRef: (node: HTMLElement | null) => void;
  setPopupRef: (node: HTMLElement | null) => void;
  computePosition: () => void;
}

function cssLength(value: number, useRootRem: boolean): string | number {
  return useRootRem ? toRootRem(value) : value;
}

export function useAnchoredDropdown({
  open,
  onClose,
  durationMs,
  position = 'inline',
  anchorSelector,
  offset = 4,
  useRootRem = false,
  minSpaceBelow = 160,
  maxPopupHeight = 280,
  closeOnScroll = false,
  escapeId,
  allowFromInput = false,
}: UseAnchoredDropdownOptions): UseAnchoredDropdownResult {
  const triggerRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLElement | null>(null);
  const [style, setStyle] = useState<CSSProperties | undefined>(position === 'inline' ? {} : undefined);

  const clearPosition = useCallback(() => {
    if (position !== 'inline') setStyle(undefined);
  }, [position]);

  const mountedVisible = open && (position === 'inline' || style !== undefined);
  const presence = useAnimatedPresence(mountedVisible, {
    durationMs,
    onClosed: clearPosition,
  });

  const anchorElement = useCallback((): HTMLElement | null => {
    if (anchorSelector) return document.querySelector(anchorSelector);
    return triggerRef.current;
  }, [anchorSelector]);

  const computePosition = useCallback(() => {
    if (position === 'inline') {
      setStyle({});
      return;
    }

    const anchor = anchorElement();
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    if (position === 'below-right') {
      setStyle({
        top: cssLength(rect.bottom + offset, useRootRem),
        right: cssLength(window.innerWidth - rect.right, useRootRem),
      });
      return;
    }

    if (position === 'below-left') {
      setStyle({
        top: cssLength(rect.bottom + offset, useRootRem),
        left: cssLength(rect.left, useRootRem),
      });
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom - offset * 2;
    const spaceAbove = rect.top - offset * 2;
    const placeAbove = spaceBelow < Math.min(minSpaceBelow, maxPopupHeight) && spaceAbove > spaceBelow;
    setStyle({
      top: cssLength(placeAbove ? rect.top - offset : rect.bottom + offset, useRootRem),
      left: cssLength(rect.left, useRootRem),
      minWidth: cssLength(rect.width, useRootRem),
      transform: placeAbove ? 'translateY(-100%)' : undefined,
    });
  }, [anchorElement, maxPopupHeight, minSpaceBelow, offset, position, useRootRem]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(computePosition, 0);
    return () => window.clearTimeout(id);
  }, [computePosition, open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const anchor = anchorElement();
      if (popupRef.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };

    // Keep the menu open while the page scrolls; re-anchor to the trigger instead.
    // Closing on every scroll makes menus in smooth-scroll panels thrash open/closed
    // with vertical enter/exit animations and prevents option selection.
    const handleScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && popupRef.current?.contains(target)) return;
      computePosition();
    };
    const handleResize = () => {
      computePosition();
    };
    const id = setTimeout(() => window.addEventListener('mousedown', handleOutside), 0);
    if (closeOnScroll) {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      clearTimeout(id);
      window.removeEventListener('mousedown', handleOutside);
      if (closeOnScroll) {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [anchorElement, closeOnScroll, computePosition, onClose, open]);

  useEscapeStackEntry({
    id: escapeId ?? 'dropdown.inactive',
    active: Boolean(escapeId && presence.mounted),
    onClose,
    allowFromInput,
  });

  const setTriggerRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const setPopupRef = useCallback((node: HTMLElement | null) => {
    popupRef.current = node;
  }, []);

  return {
    mounted: presence.mounted,
    closing: presence.closing,
    style,
    setTriggerRef,
    setPopupRef,
    computePosition,
  };
}

const TOOLTIP_DISMISS_EVENT = 'foae:dismiss-tooltips';

export function dismissSharedTooltips() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(TOOLTIP_DISMISS_EVENT));
}

export function subscribeTooltipDismissEvent(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(TOOLTIP_DISMISS_EVENT, listener);
  return () => window.removeEventListener(TOOLTIP_DISMISS_EVENT, listener);
}

export function isPointerOverTooltipInteraction(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return Boolean(
    document.querySelector('[data-tooltip-surface]:hover')
    || document.querySelector('.tooltip-wrapper:hover, .tooltip-wrapper-inline:hover'),
  );
}

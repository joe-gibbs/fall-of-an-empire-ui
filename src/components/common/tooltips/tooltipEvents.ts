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

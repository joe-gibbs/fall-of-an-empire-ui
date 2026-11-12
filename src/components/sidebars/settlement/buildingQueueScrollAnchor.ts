export interface BuildingQueueScrollAnchor {
  buildingId: string;
  element: HTMLElement;
  viewport: HTMLElement;
  top: number;
}

export function findBuildingQueueScrollViewport(element: HTMLElement): HTMLElement | null {
  const named = element.closest('.styled-scroll-area__viewport') as HTMLElement | null;
  if (named) return named;

  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return current;
    current = current.parentElement;
  }
  return null;
}

export function captureBuildingQueueScrollAnchor(
  buildingId: string,
  element: HTMLElement,
): BuildingQueueScrollAnchor | null {
  const viewport = findBuildingQueueScrollViewport(element);
  if (!viewport) return null;
  return {
    buildingId,
    element,
    viewport,
    top: element.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
  };
}

export function restoreBuildingQueueScrollAnchor(
  anchor: BuildingQueueScrollAnchor | null,
  resolveElement?: (buildingId: string) => HTMLElement | null,
): void {
  if (!anchor) return;

  const element = document.body.contains(anchor.element)
    ? anchor.element
    : (resolveElement?.(anchor.buildingId) ?? null);
  if (!element) return;

  const delta = element.getBoundingClientRect().top - anchor.viewport.getBoundingClientRect().top - anchor.top;
  if (Math.abs(delta) > 0.5) {
    anchor.viewport.scrollTop += delta;
  }
}

export function compensateScrollForConstructionSlotGrowth(
  slot: HTMLElement,
  previousHeight: number,
): number {
  const viewport = findBuildingQueueScrollViewport(slot);
  const next = slot.getBoundingClientRect().height;
  if (!viewport) return next;

  const growth = next - previousHeight;
  if (Math.abs(growth) > 0.5) {
    viewport.scrollTop += growth;
  }
  return next;
}

export function watchConstructionSlotScrollCompensation(
  slot: HTMLElement,
  shouldCompensate: () => boolean,
): () => void {
  const viewport = findBuildingQueueScrollViewport(slot);
  if (!viewport) return () => undefined;

  let height = slot.getBoundingClientRect().height;
  let skipping = true;
  const observer = new ResizeObserver(() => {
    const next = slot.getBoundingClientRect().height;
    if (skipping) {
      skipping = false;
      height = next;
      return;
    }
    // A queued building's anchor already compensates for the same layout change.
    // Applying both offsets moves the viewport twice, then reverses it next tick.
    height = shouldCompensate()
      ? compensateScrollForConstructionSlotGrowth(slot, height)
      : next;
  });
  observer.observe(slot);
  return () => observer.disconnect();
}

export function watchBuildingQueueScrollAnchor(
  anchor: BuildingQueueScrollAnchor,
  resolveElement?: (buildingId: string) => HTMLElement | null,
): () => void {
  const restore = () => restoreBuildingQueueScrollAnchor(anchor, resolveElement);
  const observer = new ResizeObserver(restore);
  const slot = anchor.viewport.querySelector('.bld-construction-slot');
  if (slot) observer.observe(slot);
  observer.observe(anchor.viewport);
  restore();
  const frameId = window.requestAnimationFrame(restore);
  return () => {
    observer.disconnect();
    window.cancelAnimationFrame(frameId);
  };
}

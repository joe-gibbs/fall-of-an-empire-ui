const MODE_PROPS = ['--game-ui-font-fit', '--game-ui-font-fit-mode'] as const;
const MIN_SIZE_PROP = '--game-ui-font-fit-min-size';
const MAX_SIZE_PROP = '--game-ui-font-fit-max-size';
const FIT_TOLERANCE = 0.5;
const BINARY_SEARCH_PASSES = 8;
const ROOT_REM_FALLBACK = 11;
const SKIP_TAGS = new Set([
  'IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'SOURCE', 'TRACK',
  'SCRIPT', 'STYLE', 'LINK', 'META', 'BR', 'HR', 'INPUT', 'TEXTAREA',
  'SELECT', 'OPTION', 'COL', 'COLGROUP', 'PATH', 'CIRCLE', 'RECT',
  'LINE', 'POLYLINE', 'POLYGON', 'USE', 'DEFS', 'CLIPPATH',
]);

interface TrackedFit {
  lastKey: string;
  stylesheetPx: number;
}

let installed = false;
let frameId = 0;
let mutationObserver: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
const tracked = new Map<HTMLElement, TrackedFit>();
const pending = new Set<HTMLElement>();

function rootFontSizePx(): number {
  const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : ROOT_REM_FALLBACK;
}

function parseLengthPx(value: string, emBasePx: number): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount)) return 0;
  if (trimmed.endsWith('rem')) return amount * rootFontSizePx();
  if (trimmed.endsWith('em')) return amount * emBasePx;
  return amount;
}

function fitMode(style: CSSStyleDeclaration): string {
  for (const property of MODE_PROPS) {
    const value = style.getPropertyValue(property).trim().toLowerCase();
    if (value) return value;
  }
  return '';
}

function canHoldFit(element: HTMLElement): boolean {
  return !SKIP_TAGS.has(element.tagName);
}

function isShrinkTarget(element: HTMLElement): boolean {
  return canHoldFit(element) && fitMode(getComputedStyle(element)) === 'shrink';
}

function trackedOwner(node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && tracked.has(current)) return current;
    current = current.parentNode;
  }
  return null;
}

function hasTrackedAncestor(element: HTMLElement): boolean {
  return trackedOwner(element.parentElement) !== null;
}

function paddingBoxSize(element: HTMLElement, style: CSSStyleDeclaration): { width: number; height: number } {
  const padX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  return {
    width: element.clientWidth - (Number.isFinite(padX) ? padX : 0),
    height: element.clientHeight - (Number.isFinite(padY) ? padY : 0),
  };
}

function paintedContentSize(element: HTMLElement): { width: number; height: number } {
  const range = document.createRange();
  range.selectNodeContents(element);
  const rects = range.getClientRects();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index];
    if (rect.width === 0 && rect.height === 0) continue;
    minX = Math.min(minX, rect.left);
    maxX = Math.max(maxX, rect.right);
    minY = Math.min(minY, rect.top);
    maxY = Math.max(maxY, rect.bottom);
  }
  if (!Number.isFinite(minX)) {
    return { width: element.scrollWidth, height: element.scrollHeight };
  }
  return { width: maxX - minX, height: maxY - minY };
}

function fitsBox(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  if (element.scrollWidth > element.clientWidth + FIT_TOLERANCE) return false;
  if (element.scrollHeight > element.clientHeight + FIT_TOLERANCE) return false;
  const box = paddingBoxSize(element, style);
  const painted = paintedContentSize(element);
  return painted.width <= box.width + FIT_TOLERANCE && painted.height <= box.height + FIT_TOLERANCE;
}

function untrack(element: HTMLElement): void {
  tracked.delete(element);
  pending.delete(element);
  resizeObserver?.unobserve(element);
  if (element.style.fontSize) element.style.fontSize = '';
}

function queueFit(element: HTMLElement): void {
  pending.add(element);
  if (frameId) return;
  frameId = window.requestAnimationFrame(() => {
    frameId = 0;
    const batch = Array.from(pending);
    pending.clear();
    for (const item of batch) fitElement(item);
  });
}

function track(element: HTMLElement): void {
  for (const other of Array.from(tracked.keys())) {
    if (other !== element && element.contains(other)) untrack(other);
  }
  if (!tracked.has(element)) {
    tracked.set(element, { lastKey: '', stylesheetPx: 0 });
    resizeObserver?.observe(element);
  }
  queueFit(element);
}

function emBasePx(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return rootFontSizePx();
  const size = Number.parseFloat(getComputedStyle(parent).fontSize);
  return Number.isFinite(size) && size > 0 ? size : rootFontSizePx();
}

function stylesheetFontPx(element: HTMLElement, state: TrackedFit): number {
  if (state.stylesheetPx > 0) return state.stylesheetPx;
  const inline = element.style.fontSize;
  element.style.fontSize = '';
  const size = Number.parseFloat(getComputedStyle(element).fontSize);
  element.style.fontSize = inline;
  state.stylesheetPx = Number.isFinite(size) && size > 0 ? size : 0;
  return state.stylesheetPx;
}

function fitElement(element: HTMLElement): void {
  if (!element.isConnected) {
    untrack(element);
    return;
  }
  if (!isShrinkTarget(element) || hasTrackedAncestor(element)) {
    untrack(element);
    return;
  }

  const state = tracked.get(element);
  if (!state) return;

  const style = getComputedStyle(element);
  if (fitMode(style) !== 'shrink') {
    untrack(element);
    return;
  }

  const emPx = emBasePx(element);
  const maxFromCss = parseLengthPx(style.getPropertyValue(MAX_SIZE_PROP), emPx);
  const minFromCss = parseLengthPx(style.getPropertyValue(MIN_SIZE_PROP), emPx);
  const maxFontSize = maxFromCss > 0 ? maxFromCss : stylesheetFontPx(element, state);
  const minFontSize = minFromCss > 0 ? minFromCss : Math.min(maxFontSize, 0.5 * rootFontSizePx());
  if (!(maxFontSize > 0)) return;

  const availableWidth = element.clientWidth;
  if (availableWidth <= 0) return;

  const key = `${element.textContent ?? ''}\0${availableWidth}\0${minFontSize}\0${maxFontSize}`;
  if (state.lastKey === key) return;

  const nowrap = style.whiteSpace === 'nowrap' || style.whiteSpace === 'pre';
  element.style.fontSize = `${maxFontSize}px`;
  if (fitsBox(element, style)) {
    element.style.fontSize = '';
    state.lastKey = key;
    return;
  }

  const box = paddingBoxSize(element, getComputedStyle(element));
  const painted = paintedContentSize(element);
  if (nowrap && element.childElementCount === 0 && painted.width > box.width + FIT_TOLERANCE) {
    const fitted = Math.max(minFontSize, maxFontSize * ((box.width - 1) / painted.width));
    element.style.fontSize = `${fitted}px`;
    state.lastKey = key;
    return;
  }

  let low = minFontSize;
  let high = maxFontSize;
  for (let pass = 0; pass < BINARY_SEARCH_PASSES; pass += 1) {
    const candidate = (low + high) / 2;
    element.style.fontSize = `${candidate}px`;
    if (fitsBox(element, getComputedStyle(element))) low = candidate;
    else high = candidate;
  }
  element.style.fontSize = `${low}px`;
  state.lastKey = key;
}

function collectFrom(root: ParentNode): void {
  const nodes: HTMLElement[] = [];
  if (root instanceof HTMLElement && canHoldFit(root)) nodes.push(root);
  root.querySelectorAll('*').forEach((node) => {
    if (node instanceof HTMLElement && canHoldFit(node)) nodes.push(node);
  });

  const shrinkNodes = nodes.filter(isShrinkTarget);
  const shrinkSet = new Set(shrinkNodes);
  for (const element of shrinkNodes) {
    let ancestor = element.parentElement;
    let nested = false;
    while (ancestor) {
      if (shrinkSet.has(ancestor) || tracked.has(ancestor)) {
        nested = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (!nested) track(element);
  }
}

function handleMutations(mutations: MutationRecord[]): void {
  const added: HTMLElement[] = [];
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      const owner = trackedOwner(mutation.target);
      if (owner) queueFit(owner);
      continue;
    }

    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) added.push(node);
    });

    mutation.removedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (tracked.has(node)) untrack(node);
      for (const element of Array.from(tracked.keys())) {
        if (node.contains(element)) untrack(element);
      }
    });
  }

  const addedRoots = added.filter((element) => !added.some((other) => other !== element && other.contains(element)));
  for (const root of addedRoots) collectFrom(root);
}

function refitAll(): void {
  for (const [element, state] of tracked) {
    state.lastKey = '';
    state.stylesheetPx = 0;
    queueFit(element);
  }
}

export function installFontFit(): void {
  if (installed) return;
  installed = true;

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement && tracked.has(entry.target)) {
          queueFit(entry.target);
        }
      }
    });
  }

  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }

  window.addEventListener('resize', refitAll);
  window.addEventListener('webkiln:runtime-viewport', refitAll);
  window.addEventListener('webkiln:localisation-changed', refitAll);
  void document.fonts.ready.then(refitAll);
  collectFrom(document.documentElement);
}

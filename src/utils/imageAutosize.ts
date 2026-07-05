import {
  FoaeCefUIAutoSizedAssetPath,
  isSizableAssetPath,
  normaliseSizedAssetSource,
} from './assets';

const SOURCE_ATTR = 'data-foae-sized-source';
const APPLIED_ATTR = 'data-foae-sized-path';
const FALLBACK_ATTR = 'data-foae-sized-fallback';
const MIN_MEASURED_SIZE = 1;

interface ImageState {
  missing: Set<string>;
}

let installed = false;
let frameId = 0;
let mutationObserver: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
const imageStates = new WeakMap<HTMLImageElement, ImageState>();
const observedImages = new WeakSet<HTMLImageElement>();

function getImageState(image: HTMLImageElement): ImageState {
  const existing = imageStates.get(image);
  if (existing) return existing;

  const state: ImageState = { missing: new Set() };
  imageStates.set(image, state);
  return state;
}

function displayPixelSize(image: HTMLImageElement): number {
  const rect = image.getBoundingClientRect();
  const cssSize = Math.max(rect.width, rect.height);
  if (!Number.isFinite(cssSize) || cssSize < MIN_MEASURED_SIZE) return 0;

  const deviceScale = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
    ? window.devicePixelRatio
    : 1;
  return Math.ceil(cssSize * deviceScale);
}

function imageSource(image: HTMLImageElement): string {
  const stored = image.getAttribute(SOURCE_ATTR);
  if (stored) return stored;

  const current = image.getAttribute('src') ?? '';
  const source = normaliseSizedAssetSource(current);
  if (source && isSizableAssetPath(source)) {
    image.setAttribute(SOURCE_ATTR, source);
  }
  return source;
}

function applySizedSource(image: HTMLImageElement): void {
  const source = imageSource(image);
  if (!source || !isSizableAssetPath(source)) return;

  const size = displayPixelSize(image);
  if (size <= 0) return;

  const target = FoaeCefUIAutoSizedAssetPath(source, size);
  if (!target || target === image.getAttribute('src')) return;

  const state = getImageState(image);
  if (state.missing.has(target)) return;

  image.removeAttribute(FALLBACK_ATTR);
  image.setAttribute(APPLIED_ATTR, target);
  image.setAttribute('src', target);
}

function watchImage(image: HTMLImageElement): void {
  if (!observedImages.has(image)) {
    observedImages.add(image);
    resizeObserver?.observe(image);
    image.addEventListener('error', () => {
      const source = image.getAttribute(SOURCE_ATTR);
      const applied = image.getAttribute(APPLIED_ATTR);
      if (!source || !applied || image.getAttribute('src') !== applied) return;

      getImageState(image).missing.add(applied);
      image.setAttribute(FALLBACK_ATTR, '1');
      image.setAttribute('src', source);
    });
  }

  if (image.getAttribute(FALLBACK_ATTR) === '1') return;
  applySizedSource(image);
}

function scanImages(root: ParentNode = document): void {
  root.querySelectorAll('img').forEach((image) => {
    watchImage(image as HTMLImageElement);
  });
}

function scheduleScan(root: ParentNode = document): void {
  if (frameId) return;
  frameId = window.requestAnimationFrame(() => {
    frameId = 0;
    scanImages(root);
  });
}

function handleMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
      const image = mutation.target;
      const src = image.getAttribute('src') ?? '';
      const applied = image.getAttribute(APPLIED_ATTR);
      if (src !== applied) {
        image.removeAttribute(SOURCE_ATTR);
        image.removeAttribute(APPLIED_ATTR);
        image.removeAttribute(FALLBACK_ATTR);
      }
      watchImage(image);
      continue;
    }

    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLImageElement) {
        watchImage(node);
      } else if (node instanceof Element) {
        scheduleScan(node);
      }
    });
  }
}

export function installImageAutosize(): void {
  if (installed) return;
  installed = true;

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLImageElement) {
          applySizedSource(entry.target);
        }
      }
    });
  }

  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  window.addEventListener('resize', () => scheduleScan());
  window.addEventListener('foae:runtime-viewport', () => scheduleScan());
  scheduleScan();
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captureBuildingQueueScrollAnchor,
  restoreBuildingQueueScrollAnchor,
  watchConstructionSlotScrollCompensation,
} from './buildingQueueScrollAnchor.ts';

test('queue growth is compensated once while a building is anchored, then normal scrolling resumes', () => {
  let slotHeight = 40;
  let viewportTop = 80;
  let resize;
  const viewport = {
    scrollTop: 100,
    getBoundingClientRect: () => ({ top: viewportTop }),
  };
  const slot = {
    closest: () => viewport,
    getBoundingClientRect: () => ({ height: slotHeight }),
  };
  const building = {
    closest: () => viewport,
    getBoundingClientRect: () => ({ top: viewportTop + 300 + slotHeight - viewport.scrollTop }),
  };
  const previousObserver = globalThis.ResizeObserver;
  const previousDocument = globalThis.document;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  };
  globalThis.document = { body: { contains: () => true } };
  let anchor = captureBuildingQueueScrollAnchor('granary', building);
  const stop = watchConstructionSlotScrollCompensation(slot, () => anchor === null);
  try {
    resize();
    slotHeight = 70;
    restoreBuildingQueueScrollAnchor(anchor);
    resize();
    assert.equal(viewport.scrollTop, 130, 'one queue expansion applies one scroll adjustment');
    restoreBuildingQueueScrollAnchor(anchor);
    assert.equal(viewport.scrollTop, 130, 'the next daily refresh does not reverse the adjustment');

    viewportTop = 120;
    restoreBuildingQueueScrollAnchor(anchor);
    assert.equal(viewport.scrollTop, 130, 'moving the whole panel does not scroll its contents');

    anchor = null;
    slotHeight = 90;
    resize();
    assert.equal(viewport.scrollTop, 150, 'after releasing the anchor only subsequent queue growth is compensated');
  } finally {
    stop();
    globalThis.ResizeObserver = previousObserver;
    globalThis.document = previousDocument;
  }
});

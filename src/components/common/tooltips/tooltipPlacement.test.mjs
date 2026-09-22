import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeTooltip, rectFromPosition } from './tooltipPlacement.ts';

const VIEWPORT = { width: 1920, height: 1080 };
const LEFT_SIDEBAR = {
  side: 'left',
  rect: rectFromPosition(0, 80, 400, 1000),
};
const RIGHT_SIDEBAR = {
  side: 'right',
  rect: rectFromPosition(1520, 80, 400, 1000),
};

test('a tooltip outside a sidebar still prefers the requested side', () => {
  const trigger = rectFromPosition(800, 400, 80, 32);
  const placement = placeTooltip('top', trigger, trigger, 240, 80, VIEWPORT.width, VIEWPORT.height);
  assert.equal(placement.side, 'top');
  assert.ok(placement.rect.bottom <= trigger.top);
});

test('a left-sidebar row tooltip sits beside the panel instead of covering the next row', () => {
  const trigger = rectFromPosition(16, 240, 368, 48);
  const placement = placeTooltip(
    'top',
    trigger,
    trigger,
    360,
    160,
    VIEWPORT.width,
    VIEWPORT.height,
    LEFT_SIDEBAR,
  );
  assert.equal(placement.side, 'right');
  assert.ok(placement.rect.left >= LEFT_SIDEBAR.rect.right);
  assert.equal(placement.overlapArea, 0);
});

test('a compact left-sidebar stat still clears the whole panel, not just the cell', () => {
  const trigger = rectFromPosition(16, 520, 120, 64);
  const nextCell = rectFromPosition(148, 520, 120, 64);
  const placement = placeTooltip(
    'bottom',
    trigger,
    trigger,
    280,
    96,
    VIEWPORT.width,
    VIEWPORT.height,
    LEFT_SIDEBAR,
  );
  assert.equal(placement.side, 'right');
  assert.ok(placement.rect.left >= LEFT_SIDEBAR.rect.right);
  assert.equal(placement.overlapArea, 0);
  const coversNextCell = Math.max(0, Math.min(placement.rect.right, nextCell.right) - Math.max(placement.rect.left, nextCell.left))
    * Math.max(0, Math.min(placement.rect.bottom, nextCell.bottom) - Math.max(placement.rect.top, nextCell.top));
  assert.equal(coversNextCell, 0);
});

test('a right-sidebar tooltip sits to the left of the panel', () => {
  const trigger = rectFromPosition(1536, 360, 368, 40);
  const placement = placeTooltip(
    'bottom',
    trigger,
    trigger,
    300,
    120,
    VIEWPORT.width,
    VIEWPORT.height,
    RIGHT_SIDEBAR,
  );
  assert.equal(placement.side, 'left');
  assert.ok(placement.rect.right <= RIGHT_SIDEBAR.rect.left);
  assert.equal(placement.overlapArea, 0);
});

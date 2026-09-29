import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildQueueCloseScope,
  idsForBuildQueueClose,
  isBuildQueueCompletionNotification,
} from './buildQueueCompletion.ts';

test('repair completions belong with the build-queue toast stack', () => {
  assert.equal(isBuildQueueCompletionNotification({ notificationTypeId: 'BuildingRepaired' }), true);
  assert.equal(isBuildQueueCompletionNotification({ notificationTypeId: 'BuildingFinished' }), true);
  assert.equal(isBuildQueueCompletionNotification({ notificationTypeId: 'UnitTrained' }), true);
  assert.equal(isBuildQueueCompletionNotification({ notificationTypeId: 'SettlementEvent' }), false);
});

test('shift closes the five visible toasts and leaves the rest queued', () => {
  const scope = buildQueueCloseScope({ shiftKey: true, ctrlKey: false, metaKey: false });
  assert.equal(scope, 'visible');
  const result = idsForBuildQueueClose(
    'a',
    ['a', 'b', 'c', 'd', 'e'],
    ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    scope,
  );
  assert.deepEqual(result.animateIds, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(result.dismissIds, []);
});

test('ctrl closes visible toasts and the scheduled messages behind them', () => {
  const scope = buildQueueCloseScope({ shiftKey: false, ctrlKey: true, metaKey: false });
  assert.equal(scope, 'queued');
  const result = idsForBuildQueueClose(
    'a',
    ['a', 'b', 'c', 'd', 'e'],
    ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    scope,
  );
  assert.deepEqual(result.animateIds, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(result.dismissIds, ['f', 'g']);
});

test('ctrl wins when shift is also held', () => {
  assert.equal(
    buildQueueCloseScope({ shiftKey: true, ctrlKey: true, metaKey: false }),
    'queued',
  );
});

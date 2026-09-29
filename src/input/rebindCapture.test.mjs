import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpretRebindCapture } from './rebindCapture.ts';
import { browserKeyToUnrealKey } from '../bridge/core/browserKeyToUnrealKey.ts';

test('Enter from the overlay binds Confirm instead of being treated as cancel', () => {
  assert.equal(browserKeyToUnrealKey('Enter', 'Enter'), 'Enter');
  assert.deepEqual(
    interpretRebindCapture({ keyName: 'Enter', shift: false, ctrl: false, alt: false, cmd: false }),
    { type: 'bind', keyName: 'Enter', mods: { shift: false, ctrl: false, alt: false, cmd: false } },
  );
});

test('Escape cancels the rebind overlay', () => {
  assert.deepEqual(
    interpretRebindCapture({ keyName: 'Escape' }),
    { type: 'cancel' },
  );
});

test('modifier-only native events update the chord preview', () => {
  assert.deepEqual(
    interpretRebindCapture({ keyName: 'LeftAlt', isModifier: true, alt: true }),
    { type: 'mods', mods: { shift: false, ctrl: false, alt: true, cmd: false } },
  );
});

test('Alt+Enter binds the explicit chord rather than a hidden display toggle', () => {
  assert.deepEqual(
    interpretRebindCapture({ keyName: 'Enter', alt: true }),
    { type: 'bind', keyName: 'Enter', mods: { shift: false, ctrl: false, alt: true, cmd: false } },
  );
});

test('invalid native payloads are ignored', () => {
  assert.equal(interpretRebindCapture(null).type, 'ignore');
  assert.equal(interpretRebindCapture('Enter').type, 'ignore');
});

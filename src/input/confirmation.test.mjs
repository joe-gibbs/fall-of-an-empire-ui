import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConfirmationPress, matchesConfirmationBinding } from './confirmation.ts';

test('confirmation fires on release once, only for the dialog present on press', () => {
  const press = createConfirmationPress();
  const first = {}, second = {};
  assert.equal(press.press(first, true, false, false), true);
  assert.equal(press.press(first, true, false, true), true);
  assert.equal(press.release(first, true, false), first);
  assert.equal(press.release(first, true, false), null);
  press.press(first, true, false, false);
  assert.equal(press.release(second, true, false), null);
});

test('text entry, disabled actions and focus loss cancel confirmation', () => {
  const press = createConfirmationPress();
  const dialog = {};
  assert.equal(press.press(dialog, true, true, false), false);
  assert.equal(press.release(dialog, true, false), null);
  assert.equal(press.press(dialog, false, false, false), false);
  assert.equal(press.release(dialog, true, false), null);
  press.press(dialog, true, false, false);
  assert.equal(press.release(dialog, false, false), null);
  press.press(dialog, true, false, false);
  assert.equal(press.release(dialog, true, true), null);
  press.press(dialog, true, false, false);
  press.cancel();
  assert.equal(press.release(dialog, true, false), null);
});

test('a held key cannot confirm a newly opened dialog', () => {
  const press = createConfirmationPress();
  const dialog = {};
  press.press(null, false, false, false);
  assert.equal(press.press(dialog, true, false, true), false);
  assert.equal(press.release(dialog, true, false), null);
});

test('keyboard confirmation respects the rebound key and exact chord', () => {
  const binding = { actionName: 'Confirm', keyName: 'Y', ctrl: true };
  const event = { code: 'KeyY', key: 'y', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false };
  assert.equal(matchesConfirmationBinding(binding, event), true);
  assert.equal(matchesConfirmationBinding(binding, { ...event, ctrlKey: false }), false);
  assert.equal(matchesConfirmationBinding(binding, { ...event, shiftKey: true }), false);
  assert.equal(matchesConfirmationBinding(binding, { ...event, code: 'Enter' }), false);
  assert.equal(matchesConfirmationBinding(null, event), false);
});

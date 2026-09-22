import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  resolveLoadingContentAppMode,
  resolvePresentedAppMode,
  shouldNotifyLoadingAppModeRendered,
  shouldShowLoadingOverlay,
} from './loadingScreenPresentation.ts';

test('loading mode keeps the previous screen until the overlay picture is ready', () => {
  assert.equal(
    resolveLoadingContentAppMode('loading', 'mainmenu', false),
    'mainmenu',
  );
  assert.equal(
    resolveLoadingContentAppMode('loading', 'ingame', false),
    'ingame',
  );
});

test('loading mode unmounts the previous screen once the overlay picture is ready', () => {
  assert.equal(
    resolveLoadingContentAppMode('loading', 'mainmenu', true),
    null,
  );
});

test('a main-menu loading overlay keeps the menu mounted', () => {
  assert.equal(
    resolveLoadingContentAppMode('mainmenu', 'mainmenu', true),
    'mainmenu',
  );
});

test('the loading overlay stays hidden until its picture is ready', () => {
  assert.equal(shouldShowLoadingOverlay(true, false, false), false);
  assert.equal(shouldShowLoadingOverlay(true, true, false), true);
  assert.equal(shouldShowLoadingOverlay(false, false, false), false);
});

test('a closing overlay keeps covering the screen after the picture has already been shown', () => {
  assert.equal(shouldShowLoadingOverlay(false, false, true), true);
});

test('UIRendered for loading waits until the overlay picture is ready', () => {
  assert.equal(shouldNotifyLoadingAppModeRendered('loading', false), false);
  assert.equal(shouldNotifyLoadingAppModeRendered('loading', true), true);
  assert.equal(shouldNotifyLoadingAppModeRendered('mainmenu', false), true);
  assert.equal(shouldNotifyLoadingAppModeRendered(null, true), false);
  assert.equal(resolvePresentedAppMode('loading', false), null);
  assert.equal(resolvePresentedAppMode('loading', true), 'loading');
  assert.equal(resolvePresentedAppMode('mainmenu', true), 'mainmenu');
});

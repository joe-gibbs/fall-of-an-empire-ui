import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  personalGuardRevealScreenId,
  tokensNeedPersonalGuardReveal,
  tokensNeedScreensMenuReveal,
} from './tutorialHudReveal.ts';

test('Personal Guard tab tokens open Military without switching away from Land', () => {
  const tokens = ['MilitaryPersonalGuardTab', 'SidebarTab:guard'];
  assert.equal(tokensNeedPersonalGuardReveal(tokens), true);
  assert.equal(personalGuardRevealScreenId(tokens), undefined);
});

test('Personal Guard founding controls open the guard panel', () => {
  assert.equal(personalGuardRevealScreenId(['FormPersonalGuardButton']), 'guard');
  assert.equal(personalGuardRevealScreenId(['ConfirmPersonalGuardButton']), 'guard');
  assert.equal(tokensNeedPersonalGuardReveal(['FormPersonalGuardButton']), true);
});

test('unrelated spotlight tokens do not reveal Personal Guard', () => {
  assert.equal(tokensNeedPersonalGuardReveal(['ScreenButton:military']), false);
  assert.equal(personalGuardRevealScreenId(['ScreenButton:military']), undefined);
});

test('Power Blocs top-bar tokens open the compact screens menu', () => {
  assert.equal(tokensNeedScreensMenuReveal(['PowerBlocsButton']), true);
  assert.equal(tokensNeedScreensMenuReveal(['ScreenButton:powerblocs']), true);
});

test('Bureaucracy HUD token does not open the compact screens menu', () => {
  assert.equal(tokensNeedScreensMenuReveal(['BureaucracyHud']), false);
});

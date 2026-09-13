import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindRuntimeViewportScaleEvents } from './runtimeViewport.ts';

function fixture() {
  const listeners = new Map(), queries = [], properties = new Map();
  globalThis.document = { documentElement: { style: {
    setProperty(name, value) { properties.set(name, value); },
  } } };
  globalThis.window = {
    devicePixelRatio: 0.666,
    __webkilnRuntimeViewport: { scale: 1 },
    addEventListener(name, callback) { listeners.set(name, callback); },
    matchMedia() {
      const query = new EventTarget(); queries.push(query); return query;
    },
  };
  bindRuntimeViewportScaleEvents();
  return {
    properties,
    emit(name, detail) { listeners.get(name)?.({ detail }); },
    changeDpi(dpi) {
      window.devicePixelRatio = dpi;
      queries.at(-1)?.dispatchEvent(new Event('change'));
    },
    font() { return parseFloat(properties.get('--runtime-root-font-size')); },
  };
}

test('maximising recomputes the font after the new browser pixel ratio arrives', () => {
  const f = fixture();
  f.emit('webkiln:runtime-viewport', { scale: 1 });
  assert.ok(f.font() > 21);
  window.devicePixelRatio = 1.8694443702697754;
  f.emit('resize');
  assert.equal(f.font(), 13.2);
  assert.equal(f.properties.has('--ui-scale'), false);
});

test('repeated DPI changes without a viewport resize retain physical legibility', () => {
  const f = fixture();
  f.emit('webkiln:runtime-viewport', { scale: 1 });
  for (const dpi of [2, 0.666, 1.25]) {
    f.changeDpi(dpi);
    assert.ok(Math.abs(f.font() * dpi - Math.max(13.2 * dpi, 14)) < 0.000001);
  }
});

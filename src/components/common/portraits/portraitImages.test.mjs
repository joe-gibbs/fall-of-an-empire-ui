import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readPortraitImages } from './portraitImages.ts';

test('a layered portrait waits for every decoded asset and shares outstanding image requests', async () => {
  const images = [];
  globalThis.document = {
    createElement: () => {
      let finish;
      const image = { decode: () => new Promise(resolve => { finish = resolve; }) };
      images.push({ image, finish: () => finish() });
      return image;
    },
  };
  let readiness;
  try { readPortraitImages(['face', 'normal', 'helmet', 'mask']); } catch (pending) { readiness = pending; }
  assert.ok(readiness instanceof Promise);
  assert.equal(images.length, 4, 'all assets start together');
  assert.throws(() => readPortraitImages(['face', 'normal', 'helmet', 'mask']), Promise);
  assert.equal(images.length, 4, 'a suspended retry reuses the requests');
  images[0].finish();
  images[1].finish();
  images[2].finish();
  await Promise.resolve();
  assert.throws(() => readPortraitImages(['face', 'normal', 'helmet', 'mask']), Promise);
  images[3].finish();
  await readiness;
  assert.deepEqual(readPortraitImages(['face', 'normal', 'helmet', 'mask']), images.map(entry => entry.image));
});

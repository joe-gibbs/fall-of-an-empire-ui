import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));

test('the first close owns its callback and reopening cancels an external close', async () => {
  const entry = 'scripts/presence-fixture.js';
  const bundle = await build({
    root,
    configFile: false,
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: { write: false, lib: { entry, name: 'PresenceTest', formats: ['iife'] } },
    plugins: [{
      name: 'presence-fixture',
      resolveId(id) { if (id.replaceAll('\\', '/').endsWith(entry)) return root.replaceAll('\\', '/') + entry; },
      load(id) {
        if (!id.endsWith(entry)) return;
        return `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { flushSync } from 'react-dom';
          import { useAnimatedPresence } from '/src/hooks/useAnimatedPresence.ts';
          const root = createRoot(document.getElementById('root'));
          window.completed = [];
          function Dialog({ visible }) {
            const { mounted, closing, requestClose } = useAnimatedPresence(visible, {
              durationMs: 100, onClosed: () => window.completed.push('external'),
            });
            window.closeTwice = () => {
              requestClose(() => window.completed.push('first'));
              requestClose(() => window.completed.push('second'));
            };
            return React.createElement('output', null, !mounted ? 'closed' : closing ? 'closing' : 'open');
          }
          window.show = visible => flushSync(() => root.render(React.createElement(Dialog, { visible })));
          window.show(true);
        `;
      },
    }],
  });
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    const page = await browser.newPage();
    await page.clock.install();
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle[0].output[0].code });
    await page.evaluate(() => window.closeTwice());
    await page.locator('output').filter({ hasText: 'closing' }).waitFor();
    await page.clock.runFor(150);
    assert.equal(await page.locator('output').innerText(), 'closed');
    assert.deepEqual(await page.evaluate(() => window.completed), ['first']);
    await page.evaluate(() => { window.show(false); window.show(true); window.show(false); });
    assert.equal(await page.locator('output').innerText(), 'closing');
    await page.evaluate(() => window.show(true));
    await page.clock.runFor(150);
    assert.equal(await page.locator('output').innerText(), 'open');
    assert.deepEqual(await page.evaluate(() => window.completed), ['first']);
    await page.evaluate(() => window.show(false));
    await page.clock.runFor(150);
    assert.deepEqual(await page.evaluate(() => window.completed), ['first', 'external']);
  } finally {
    await browser.close();
  }
});

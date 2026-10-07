import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// Use an installed Playwright package, or point PLAYWRIGHT_MODULE at a shared runtime.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('canvas drags finish only when their own mouse button is released', async () => {
  const temporaryRoot = resolve(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, 'foae-zoom-pan-'));
  const component = '/@fs/' + join(root, 'src/components/common/layout/scrolling/ZoomPanCanvas.tsx').replaceAll('\\', '/');
  await writeFile(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/fixture.tsx"></script>');
  await writeFile(join(fixture, 'fixture.tsx'), `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import Canvas from ${JSON.stringify(component)};
    window.dragEvents = [];
    createRoot(document.getElementById('root')).render(
      <Canvas style={{width:800,height:500}} contentStyle={{width:1600,height:1000}}
        initialView={{zoom:1,panX:-300,panY:-200}} minZoom={0.3} maxZoom={3}
        deferWheelViewState leftDragMode="select"
        onContentLeftClick={() => window.dragEvents.push('click')}
        onContentLeftDragEnd={() => window.dragEvents.push('select')}
        onContentRightDrag={() => window.dragEvents.push('order')}>
        <div style={{width:'100%',height:'100%'}} />
      </Canvas>);
  `);
  const server = await createServer({
    configFile: false,
    root: fixture,
    plugins: [react()],
    resolve: { alias: {
      react: join(root, 'node_modules/react'),
      'react-dom': join(root, 'node_modules/react-dom'),
    } },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [fixture, root] } },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    const content = page.locator('.zoom-pan-canvas__content');
    const transform = () => content.evaluate(element => getComputedStyle(element).transform);
    const events = () => page.evaluate(() => window.dragEvents);
    const reset = async () => {
      await page.goto(server.resolvedUrls.local[0]);
      await content.waitFor();
      await page.waitForFunction(() => {
        const element = document.querySelector('.zoom-pan-canvas__content');
        return element && getComputedStyle(element).transform === 'matrix(1, 0, 0, 1, -300, -200)';
      });
    };

    await reset();
    await page.mouse.click(350, 250);
    assert.deepEqual(await events(), ['click'], 'left click selects');
    await page.mouse.move(350, 250);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(450, 310, { steps: 5 });
    await page.mouse.up({ button: 'left' });
    assert.equal(await transform(), 'matrix(1, 0, 0, 1, -300, -200)', 'left drag does not pan');
    assert.deepEqual(await events(), ['click', 'select']);

    await reset();
    await page.mouse.move(350, 250);
    await page.mouse.down({ button: 'left' });
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(400, 280, { steps: 5 });
    assert.equal(await transform(), 'matrix(1, 0, 0, 1, -250, -170)');
    await page.mouse.up({ button: 'left' });
    await page.mouse.move(500, 340, { steps: 5 });
    assert.equal(await transform(), 'matrix(1, 0, 0, 1, -150, -110)',
      'releasing left must not end the middle-button pan');
    await page.mouse.up({ button: 'middle' });
    await page.mouse.move(550, 380);
    assert.equal(await transform(), 'matrix(1, 0, 0, 1, -150, -110)', 'middle release ends the pan');
    assert.deepEqual(await events(), [], 'panning does not issue selection or movement orders');
    await page.mouse.wheel(0, -120);
    await page.waitForFunction(() => {
      const element = document.querySelector('.zoom-pan-canvas__content');
      return new DOMMatrix(getComputedStyle(element).transform).a > 1.1;
    });

    // The same mouseup handler must not submit a right-drag order on left release.
    await reset();
    await page.mouse.move(350, 250);
    await page.mouse.down({ button: 'left' });
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(400, 280, { steps: 5 });
    await page.mouse.up({ button: 'left' });
    assert.deepEqual(await events(), [], 'left release must not submit the right-drag order');
    await page.mouse.move(500, 340, { steps: 5 });
    await page.mouse.up({ button: 'right' });
    assert.deepEqual(await events(), ['order'], 'right release submits exactly one order');
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    await server.close();
    assert.equal(dirname(resolve(fixture)), temporaryRoot);
    await rm(fixture, { recursive: true });
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('military selection and target glows scale with the badge without a hard outline', async () => {
  const temporaryRoot = resolve(tmpdir());
  const fixture = await mkdtemp(join(temporaryRoot, 'foae-glance-highlights-'));
  const source = '/@fs/' + join(root, 'src').replaceAll('\\', '/');
  await writeFile(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/fixture.tsx"></script>');
  await writeFile(join(fixture, 'fixture.tsx'), `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import ArmyGlance from '${source}/components/world-glances/ArmyGlance.tsx';
    import NavyGlance from '${source}/components/world-glances/NavyGlance.tsx';
    import '${source}/index.css';
    import '${source}/components/world-glances/WorldGlances.css';
    const faction = {name:'Test',colour:'#732c42',secondaryColour:'#d8b765',cultureGroup:'Roman',relation:'own'};
    createRoot(document.getElementById('root')).render(<main style={{display:'flex',flexWrap:'wrap',gap:60,padding:60}}>
      {['detail-flag','detail-name','detail-detailed'].flatMap(detail => [false,true].flatMap(naval =>
        ['normal','selected','targeted','both'].map(state => {
          const Component = naval ? NavyGlance : ArmyGlance;
          const id = detail + '-' + naval + '-' + state;
          return <div key={id} data-case={id} className={'world-glance-node '+detail+
            (state==='selected'||state==='both'?' is-selected':'')+(state==='targeted'||state==='both'?' is-targeted':'')}>
            <Component enableHoverTooltip={false} data={{id,faction,strength:1000,morale:0.8,tier:2}} />
          </div>;
        })))}</main>);
  `);
  const server = await createServer({
    configFile: false, root: fixture, publicDir: join(root, 'public'), plugins: [react()],
    resolve: { alias: { react: join(root, 'node_modules/react'), 'react-dom': join(root, 'node_modules/react-dom') } },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [fixture, root] } },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(server.resolvedUrls.local[0]);
      await page.locator('[data-case]').first().waitFor();
      const highlights = await page.locator('[data-case]').evaluateAll(nodes => nodes.map(node => {
        const ring = node.querySelector('.glance-military-state-glow');
        if (!ring) return { id: node.dataset.case, present: false };
        const style = getComputedStyle(ring);
        const bounds = ring.getBoundingClientRect();
        const badge = node.querySelector('.glance-military-rings').getBoundingClientRect();
        return { id: node.dataset.case, present: true, opacity: style.opacity,
          border: style.borderTopColor, borderWidth: parseFloat(style.borderTopWidth),
          background: style.backgroundImage, radius: style.borderTopLeftRadius,
          widthRatio: bounds.width / badge.width,
          centreOffset: Math.abs((bounds.left + bounds.right) - (badge.left + badge.right)) };
      }));
      assert.equal(highlights.length, 24);
      for (const ring of highlights) {
        assert.equal(ring.present, true, `${ring.id}: the badge has a selection/target glow`);
        const normal = ring.id.endsWith('-normal');
        const targeted = ring.id.endsWith('-targeted') || ring.id.endsWith('-both');
        assert.equal(ring.opacity, normal ? '0' : '1', `${ring.id}: highlight visibility`);
        assert.ok(ring.background.includes(targeted ? '255, 167, 105' : '255, 228, 152'), `${ring.id}: glow colour`);
        assert.equal(ring.borderWidth, 0, `${ring.id}: no hard outline`);
        assert.ok(ring.background.startsWith('radial-gradient(circle closest-side,'), `${ring.id}: fade reaches transparency before the circular edge`);
        assert.equal(ring.radius, '50%');
        assert.ok(ring.widthRatio > 1.5 && ring.widthRatio < 1.7, `${ring.id}: follows the badge size`);
        assert.ok(ring.centreOffset < 0.1, `${ring.id}: centred on the badge`);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await server.close();
    assert.equal(dirname(resolve(fixture)), temporaryRoot);
    await rm(fixture, { recursive: true });
  }
});

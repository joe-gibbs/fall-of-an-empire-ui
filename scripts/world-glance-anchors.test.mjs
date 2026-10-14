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

test('native atlas military centres stay on their anchor across zoom detail and raster scale', async () => {
  const fixture = await mkdtemp(join(resolve(tmpdir()), 'foae-atlas-centres-'));
  const source = '/@fs/' + join(root, 'src').replaceAll('\\', '/');
  await writeFile(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/fixture.tsx"></script>');
  await writeFile(join(fixture, 'fixture.tsx'), `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import ArmyGlance from '${source}/components/world-glances/ArmyGlance.tsx';
    import NavyGlance from '${source}/components/world-glances/NavyGlance.tsx';
    import '${source}/index.css';
    import '${source}/components/world-glances/WorldGlances.css';
    import '${source}/components/world-glances/GlanceAtlas.css';
    const faction = {name:'Test',colour:'#732c42',secondaryColour:'#d8b765',cultureGroup:'Roman',relation:'own'};
    createRoot(document.getElementById('root')).render(<>
      {['detail-flag','detail-name','detail-detailed'].flatMap((detail, index) => [false,true].map(naval => {
        const Component = naval ? NavyGlance : ArmyGlance;
        const id = detail + '-' + naval;
        return <div key={id} data-case={id} className={'world-glance-node world-glance-node--'+(naval?'navy':'army')+' glance-atlas-plate '+detail}
          style={{left: index*250, top: naval?300:0, '--military-atlas-capacity':'9rem', '--military-atlas-bleed':'1.5909rem'}}>
          <div className="world-glance-tip"><Component enableHoverTooltip={false} data={{id,faction,strength:1000,morale:0.8,tier:2}} /></div>
        </div>;
      }))}</>);
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
    const page = await browser.newPage({viewport: {width: 1200, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(server.resolvedUrls.local[0]);
    await page.locator('[data-case]').first().waitFor();
    for (const raster of [0.75, 1, 1.5]) {
      await page.locator('[data-case]').evaluateAll((nodes, value) => {
        for (const node of nodes) node.style.setProperty('--glance-atlas-raster-scale', String(value));
      }, raster);
      const centres = await page.locator('[data-case]').evaluateAll(nodes => nodes.map(node => {
        const cell = node.getBoundingClientRect();
        const marker = node.querySelector('.glance--military').getBoundingClientRect();
        return {id: node.dataset.case, dx: (marker.left+marker.right-cell.left-cell.right)/2,
          dy: (marker.top+marker.bottom-cell.top-cell.bottom)/2};
      }));
      for (const centre of centres) {
        assert.ok(Math.abs(centre.dx) < 0.1 && Math.abs(centre.dy) < 0.1, `${centre.id} moved off its anchor at raster scale ${raster}: ${JSON.stringify(centre)}`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
    await rm(fixture, {recursive: true, force: true});
  }
});


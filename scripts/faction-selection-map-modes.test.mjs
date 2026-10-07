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
const source = path => '/@fs/' + join(root, 'src', path).replaceAll('\\', '/');

for (const width of [1600, 1000, 640]) test(`faction selection map modes, picking and dated starts at ${width}px`, async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'foae-selection-map-modes-'));
  await writeFile(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/fixture.tsx"></script>');
  await writeFile(join(fixture, 'fixture.tsx'), `
    import React, {useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import ${JSON.stringify(source('index.css'))};
    import ${JSON.stringify(source('styles/game-ui.css'))};
    import ${JSON.stringify(source('styles/raster-surfaces.css'))};
    import FactionSelection from ${JSON.stringify(source('pages/FactionSelection.tsx'))};
    import {createMockBridgeRuntime} from ${JSON.stringify(source('dev/mockBridgeData.ts'))};
    const runtime = createMockBridgeRuntime(new URLSearchParams());
    const legend = {
      culture: [{id:'Rephsian', name:'Rephsian', colour:'#bb3344'}, {id:'Raseni', name:'Raseni', colour:'#66aa33'}],
      religion: [{id:'Aurelianism', name:'Aurelianism', colour:'#ddaa55'}],
      political: [],
    };
    window.requests = [];
    window.picks = 0;
    window.__webkilnRuntimeEngineMock = {isAttached:true, on:()=>()=>{}, call:()=>{},
      callBridge: ({action, payload}) => {
        if (action === 'game.faction_selection_tabletop') {
          window.requests.push(payload);
          if (payload.command === 'pick') window.picks++;
          return {baseName:payload.command === 'pick' ? 'AurestianLeague' : '', legend:legend[payload.mapMode] ?? []};
        }
        const response = runtime.handle(action, payload, () => {}).result;
        return action === 'game.get_new_game_map_faction_selection' ? {...response, startDateId:payload.startDateId} : response;
      }};
    const dates = [
      {id:'', displayName:'Grand Campaign', startingDateLabel:'4 Harvest 784', isLocked:false},
      {id:'later', displayName:'Later Campaign', startingDateLabel:'4 Harvest 897', isLocked:false},
    ];
    function App() {
      const [date, setDate] = useState('');
      return <FactionSelection mapId="Campaign" startDateId={date} startDates={dates}
        onSelectStartDate={setDate} onClose={()=>{}} onConfirm={()=>{}}/>;
    }
    createRoot(document.getElementById('root')).render(<App/>);
  `);
  const server = await createServer({configFile:false, root:fixture, cacheDir:join(root,'.vite/faction-selection-map-modes'), publicDir:join(root,'public'), plugins:[react()],
    resolve:{alias:{react:join(root,'node_modules/react'), 'react-dom':join(root,'node_modules/react-dom')}},
    server:{host:'127.0.0.1',port:0,fs:{allow:[fixture,root]}}});
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({headless:true, channel:process.env.PLAYWRIGHT_CHANNEL});
    const page = await browser.newPage({viewport:{width,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(server.resolvedUrls.local[0], {waitUntil:'domcontentloaded'});
    const controls = page.locator('.fs-map-modes');
    await controls.waitFor({timeout:10000});
    const factions = controls.getByRole('button', {name:'Factions', exact:true});
    const culture = controls.getByRole('button', {name:'Culture', exact:true});
    const religion = controls.getByRole('button', {name:'Religion', exact:true});
    assert.equal(await factions.getAttribute('aria-pressed'), 'true');
    await culture.click();
    assert.equal(await culture.getAttribute('aria-pressed'), 'true');
    await page.locator('.fs-map-legend').getByText('Raseni', {exact:true}).waitFor();
    assert.equal(await page.locator('.fs-map-legend').getByText('Rephsian', {exact:true}).count(), 1);
    assert.equal(await page.evaluate(() => window.picks), 0, 'mode buttons must not select a faction');
    await religion.click();
    await page.locator('.fs-map-legend').getByText('Aurelianism', {exact:true}).waitFor();
    await page.screenshot({path:join(root, '.vite', `faction-selection-map-modes-${width}.png`)});
    assert.equal(await page.locator('.fs-map-legend').getByText('Raseni', {exact:true}).count(), 0);
    await page.locator('.fs-start-date-button').filter({hasText:'4 Harvest 897'}).click();
    await page.waitForFunction(() => window.requests.some(request => request.command === 'show' && request.startDateId === 'later'));
    assert.equal(await religion.getAttribute('aria-pressed'), 'true', 'changing date must keep the selected map mode');
    await page.waitForFunction(() => window.requests.filter(request => request.command === 'map_mode').length >= 4);
    assert.equal((await page.evaluate(() => window.requests.filter(request => request.command === 'map_mode').at(-1))).mapMode, 'religion');
    const bounds = await controls.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const dates = element.closest('.fs-map-panel').querySelector('.fs-start-dates').getBoundingClientRect();
      const zoom = element.closest('.fs-map-panel').querySelector('.fs-zoom-controls').getBoundingClientRect();
      return {left:rect.left, right:rect.right, top:rect.top, datesBottom:dates.bottom,
        overlapsZoom:rect.left < zoom.right && rect.right > zoom.left && rect.top < zoom.bottom && rect.bottom > zoom.top};
    });
    assert.ok(bounds.left >= 0 && bounds.right <= width, 'mode controls must fit on the screen');
    assert.ok(bounds.top >= bounds.datesBottom, 'mode controls must not overlap the date buttons');
    assert.equal(bounds.overlapsZoom, false, 'mode controls must not overlap the zoom buttons');
    await factions.click();
    await page.waitForFunction(() => window.requests.filter(request => request.command === 'map_mode').at(-1)?.mapMode === 'political');
    assert.equal(await page.locator('.fs-map-legend').count(), 0);
    const input = page.locator('.fs-tabletop-input');
    await input.click({position:{x:width/2, y:150}});
    await page.waitForFunction(() => window.picks === 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
    await rm(fixture, {recursive:true,force:true});
  }
});

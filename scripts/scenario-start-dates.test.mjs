import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
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
const source = (path) => '/@fs/' + join(root, 'src', path).replaceAll('\\', '/');

for (const width of [1600, 1000, 640]) test(`dated starts keep separate faction selections and launch identities at ${width}px`, async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'foae-scenario-dates-'));
  await writeFile(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/fixture.tsx"></script>');
  await writeFile(join(fixture, 'fixture.tsx'), `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import ${JSON.stringify(source('index.css'))};
    import ${JSON.stringify(source('styles/game-ui.css'))};
    import ${JSON.stringify(source('styles/raster-surfaces.css'))};
    import MainMenu from ${JSON.stringify(source('pages/MainMenu.tsx'))};
    import { EscapeStackProvider } from ${JSON.stringify(source('context/EscapeStackProvider.tsx'))};
    import { createMockBridgeRuntime } from ${JSON.stringify(source('dev/mockBridgeData.ts'))};
    const runtime = createMockBridgeRuntime(new URLSearchParams());
    const dates = [
      {id:'', displayName:'Grand Campaign', startingDateLabel:'4 Harvest 784', isLocked:false},
      {id:'AfterTheEmpire', displayName:'After the Empire', startingDateLabel:'4 Harvest 897', isLocked:false},
    ];
    const entries = [{id:'Campaign', displayName:'Grand Campaign', startingDateLabel:'4 Harvest 784',startDates:dates}]
    .map((entry, i) => ({...entry, menuKicker:'', menuDescription:'', menuImageUrl:'', menuOrder:i,
      requiresFactionSelection:true, isLocked:false}));
    window.launches = [];
    window.selections = [];
    window.tabletopRequests = [];
    window.__webkilnRuntimeEngineMock = {
      on: () => () => {}, call: () => {}, isAttached:true,
      callBridge: ({action,payload}) => {
        if (action === 'game.list_new_game_maps') return {maps:entries};
        if (action === 'game.start_scenario_map') {window.launches.push(payload); return {};}
        if (action === 'game.faction_selection_tabletop') window.tabletopRequests.push(payload);
        const response = runtime.handle(action, payload, () => {}).result;
        if (action === 'game.get_new_game_map_faction_selection') {
          window.selections.push(payload.mapId + ':' + payload.startDateId);
          const later = payload.startDateId === 'AfterTheEmpire';
          const name = later ? 'Kyrnos' : 'RephsianDominion';
          return {...response, mapId:payload.mapId, startDateId:payload.startDateId, displayName:dates[later ? 1:0].displayName,
            startingDateLabel:dates[later ? 1:0].startingDateLabel, factionSelectionDescription:later ? 'Later campaign briefing prose' : 'Original campaign briefing prose',
            defaultPlayerFactionBaseName:name, politicalMapUrl:later ? '/897-political.png' : '/784-political.png',
            factions:[{...response.factions[0],baseName:name,displayName:later ? 'Kyrnos Remnant' : 'Rephsian Empire',description:'Faction description prose',
              sovereignBaseName:'', subjects:[], leader:{...response.factions[0].leader,displayName:later ? 'Marcellus Histrius' : 'Original Emperor'}}]};
        }
        return response;
      }
    };
    createRoot(document.getElementById('root')).render(<EscapeStackProvider><MainMenu/></EscapeStackProvider>);
  `);
  const server = await createServer({configFile:false, root:fixture, cacheDir:join(root,'.vite/scenario-start-dates'), publicDir:join(root,'public'), plugins:[react()],
    resolve:{alias:{react:join(root,'node_modules/react'), 'react-dom':join(root,'node_modules/react-dom')}},
    server:{host:'127.0.0.1',port:0,fs:{allow:[fixture,root]}}});
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL});
    const page = await browser.newPage({viewport:{width,height:1000}});
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror',error => errors.push(String(error)));
    await page.goto(server.resolvedUrls.local[0], {waitUntil:'domcontentloaded'});
    const campaign = page.locator('.mm-illust-btn').filter({hasText:'Grand Campaign'});
    await campaign.waitFor();
    assert.doesNotMatch(await campaign.innerText(), /4 Harvest (784|897)/, 'main menu must show the campaign without a start date');
    assert.equal(await page.locator('.mm-illust-btn').filter({hasText:'After the Empire'}).count(),0);
    await campaign.click();
    await page.getByText('Rephsian Empire', {exact:true}).first().waitFor();
    const dateButtons = page.locator('.fs-map-panel .fs-start-date-button');
    await dateButtons.first().waitFor();
    assert.equal(await dateButtons.count(), 2, 'both dated starts must be visible as map buttons');
    assert.equal(await page.locator('.fs-root .dropdown-select').count(), 0);
    const originalButton = dateButtons.filter({hasText:'4 Harvest 784'});
    const laterButton = dateButtons.filter({hasText:'4 Harvest 897'});
    assert.match(await originalButton.innerText(), /Grand Campaign/);
    assert.match(await laterButton.innerText(), /After the Empire/);
    assert.equal(await originalButton.getAttribute('aria-pressed'), 'true');
    assert.equal(await laterButton.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.getByText('Original campaign briefing prose', {exact:true}).count(),1);
    assert.equal(await page.getByText('Faction description prose', {exact:true}).count(),0);
    const briefingBounds = await page.locator('.fs-campaign-description').evaluate(element => {
      const rect = element.getBoundingClientRect();
      const map = element.closest('.fs-map-panel').getBoundingClientRect();
      return {left:rect.left,right:rect.right,centre:(rect.left+rect.right)/2,mapCentre:(map.left+map.right)/2};
    });
    assert.ok(Math.abs(briefingBounds.centre - briefingBounds.mapCentre) < 2, 'campaign briefing must stay centred below the map');
    assert.ok(briefingBounds.left >= 0 && briefingBounds.right <= width, 'campaign briefing must remain fully visible');
    const buttonStyles = await dateButtons.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const map = element.closest('.fs-map-panel').getBoundingClientRect();
      const briefing = element.closest('.fs-map-panel').querySelector('.fs-campaign-description').getBoundingClientRect();
      const zoom = element.closest('.fs-map-panel').querySelector('.fs-zoom-controls').getBoundingClientRect();
      return {height:rect.height,width:rect.width,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
        mapTop:map.top,briefingTop:briefing.top,background:style.backgroundImage,frame:style.borderImageSource,
        overlapsZoom:rect.left < zoom.right && rect.right > zoom.left && rect.top < zoom.bottom && rect.bottom > zoom.top};
    }));
    for (const button of buttonStyles) {
      assert.ok(button.height >= 64 && button.width >= 180, 'date buttons must be large enough for both lines');
      assert.ok(button.left >= 0 && button.right <= width, 'date buttons must stay inside the viewport');
      assert.ok(button.top >= button.mapTop && button.bottom <= button.briefingTop, 'date buttons float over the map above the briefing');
      assert.match(button.background,/main-menu-button/);
      assert.match(button.frame,/gold-frame/);
      assert.equal(button.overlapsZoom, false, 'map controls must not cover the date buttons');
    }
    assert.notEqual(buttonStyles[0].background, buttonStyles[1].background, 'selected start must use a distinct authored surface');
    if (process.env.SCENARIO_START_SCREENSHOT_DIR) {
      await mkdir(process.env.SCENARIO_START_SCREENSHOT_DIR, {recursive:true});
      await originalButton.scrollIntoViewIfNeeded();
      await page.screenshot({path:join(process.env.SCENARIO_START_SCREENSHOT_DIR, `scenario-starts-${width}.png`)});
    }
    await page.evaluate(() => {
      window.selectionRoot = document.querySelector('.fs-root');
      window.tabletopRequests.length = 0;
    });
    await laterButton.click();
    await page.getByText('Kyrnos Remnant', {exact:true}).first().waitFor();
    assert.equal(await page.getByText('Later campaign briefing prose', {exact:true}).count(),1);
    assert.equal(await page.getByText('Original campaign briefing prose', {exact:true}).count(),0);
    assert.equal(await page.getByText('Faction description prose', {exact:true}).count(),0);
    assert.equal(await page.locator('.fs-root').getByText('Rephsian Empire', {exact:true}).count(),0);
    assert.equal(await originalButton.getAttribute('aria-pressed'), 'false');
    assert.equal(await laterButton.getAttribute('aria-pressed'), 'true');
    await originalButton.click();
    await page.getByText('Rephsian Empire', {exact:true}).first().waitFor();
    assert.equal(await page.getByText('Original campaign briefing prose', {exact:true}).count(),1);
    assert.equal(await originalButton.getAttribute('aria-pressed'), 'true');
    await laterButton.click();
    await page.getByText('Kyrnos Remnant', {exact:true}).first().waitFor();
    await page.waitForFunction(() => window.tabletopRequests.some(request => request.command === 'show' && request.mapId === 'Campaign' && request.startDateId === 'AfterTheEmpire'));
    assert.equal(await page.evaluate(() => document.querySelector('.fs-root') === window.selectionRoot), true, 'switching dates must retain the selection screen');
    const dateRequests = await page.evaluate(() => window.tabletopRequests);
    assert.equal(dateRequests.some(request => ['prepare', 'hide'].includes(request.command)), false, 'date changes must keep the tabletop visible');
    assert.equal(dateRequests.some(request => ['focus', 'reset'].includes(request.command)), false, 'date changes must preserve the camera position');
    assert.ok(dateRequests.filter(request => request.command === 'show').every(request =>
      request.baseName === (request.startDateId === 'AfterTheEmpire' ? 'Kyrnos' : 'RephsianDominion')), 'tabletop date and selected faction must belong to the same response');
    await page.locator('.fs-begin-btn').click();
    await page.waitForFunction(() => window.launches.length === 1);
    assert.deepEqual(await page.evaluate(() => window.launches), [{mapId:'Campaign',startDateId:'AfterTheEmpire',playerFactionBaseName:'Kyrnos'}]);
    assert.deepEqual((await page.evaluate(() => window.selections)).sort(),['Campaign:','Campaign:AfterTheEmpire']);
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    await server.close();
    await rm(fixture,{recursive:true,force:true});
  }
});

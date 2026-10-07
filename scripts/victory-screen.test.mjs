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
const source = path => '/@fs/' + join(root, 'src', path).replaceAll('\\', '/');

test('victory screen frames all targets, focuses requirements and preserves pan through control updates', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'foae-victory-screen-'));
  await writeFile(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/fixture.tsx"></script>');
  await writeFile(join(fixture, 'fixture.tsx'), `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import ${JSON.stringify(source('index.css'))};
    import ${JSON.stringify(source('styles/game-ui.css'))};
    import ${JSON.stringify(source('styles/raster-surfaces.css'))};
    import ${JSON.stringify(source('App.css'))};
    import { VictoryConditionsView } from ${JSON.stringify(source('components/screens/campaign/VictoryConditionsScreen.tsx'))};
    const root = createRoot(document.getElementById('root'));
    window.victoryClosedCount = 0;
    const reasons = { 'bronze-land': 'The coast gives your realm a foothold for further conquests.',
      'silver-land': 'The heartland can support more troops and a stronger treasury.',
      'gold-land': 'Securing the frontier protects your new holdings.' };
    const condition = (id, label, indices) => ({id, label, kind:'territory', description:reasons[id], progress:0,
      currentCount:0, targetCount:indices.length, detailText:'0 of '+indices.length+' settlements controlled', isMet:false,
      domains:indices.map(i => ({name:'Settlement '+i,provinceIndices:[i],controlledSettlements:0,totalSettlements:1,isMet:false}))});
    const tiers = [
      {id:'bronze',name:'A Foothold',iconPath:'/assets/icons/Victory/I_Victory_Bronze.png',isAchieved:false,conditions:[condition('bronze-land','Take the coast',[0])]},
      {id:'silver',name:'Restoration',iconPath:'/assets/icons/Victory/I_Victory_Silver.png',isAchieved:false,conditions:[condition('silver-land','Take the heartland',[0,1])]},
      {id:'gold',name:'Total Victory',iconPath:'/assets/icons/Victory/I_Victory_Gold.png',isAchieved:false,conditions:[condition('gold-land','Take the frontier',[2])]},
    ];
    const map = {mapId:'test',imageUrl:'/assets/world-map-painted.jpg',width:1200,height:720,
      provinces:Array.from({length:4},(_,i) => ({provinceIndex:i,
        fillPath:'M'+(150+i*230)+' 250h120v150h-120Z',borderPath:'M'+(150+i*230)+' 250h120v150h-120Z',
        minX:150+i*230,minY:250,maxX:270+i*230,maxY:400,regionId:'r'+i,landId:'l'+i,domainId:'d'+i})),
      borderSegments:Array.from({length:4},(_,i)=>({provinceIndex:i,adjacentProvinceIndex:-1,path:'M'+(150+i*230)+' 250h120v150h-120Z'}))};
    window.renderVictory = (captured=false, long=false, earned=false) => root.render(<div className="screen-overlay screen-overlay--victory">
      <VictoryConditionsView map={map} victory={{enabled:true,completedConditions:0,totalConditions:3,
        tiers:earned ? tiers.map((tier,index)=>index===0?{...tier,isAchieved:true}:tier) : long ? tiers.map((tier,index)=>index!==2?tier:{...tier,conditions:[{...tier.conditions[0],
          domains:Array.from({length:40},(_,i)=>({name:'Frontier '+i,provinceIndices:[2],controlledSettlements:0,totalSettlements:1,isMet:false}))}]}) : tiers,
        settlements:Array.from({length:4},(_,i)=>({key:''+i,name:'Settlement '+i,provinceIndex:i,isControlled:i===3 || (i===0 && captured)}))}}
        onClose={()=>window.victoryClosedCount++}/></div>);
    window.renderVictory();
  `);
  const server = await createServer({ configFile: false, root: fixture, publicDir: join(root, 'public'), plugins: [react()],
    resolve: { alias: { react: join(root, 'node_modules/react'), 'react-dom': join(root, 'node_modules/react-dom') } },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [fixture, root] } },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole('heading', { name: 'Victory Conditions', exact: true }).waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const content = page.locator('.zoom-pan-canvas__content');
    const transform = () => content.evaluate(element => getComputedStyle(element).transform);
    await page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('.zoom-pan-canvas__content')).transform).a !== 1);
    const allTargetsTransform = await transform();
    assert.equal(await page.getByRole('button', { name: 'All targets', exact: true }).count(), 0);
    const heldScreenWidth = () => page.locator('[data-border-layer="held"]').evaluate(path =>
      Number(path.getAttribute('stroke-width')) * new DOMMatrix(getComputedStyle(document.querySelector('.zoom-pan-canvas__content')).transform).a);
    assert.ok(Math.abs(await heldScreenWidth() - 4.5) < 0.01, 'held borders stay legible at the initial fitted scale');
    assert.equal(await page.locator('.victory-tier').count(), 3);
    assert.equal(await page.locator('.victory-requirement-description').count(), 3, 'every territorial objective shows its motivation');
    assert.equal(await page.getByText('0 of 2 settlements controlled', { exact: true }).count(), 0,
      'the overview omits aggregate progress that repeats the place counts');
    assert.equal(await page.locator('.victory-tier').first().getByText('Settlement 0', { exact: true }).count(), 0,
      'a single target shares the objective row instead of repeating its name below');
    for (const selector of ['.victory-tier-focus > .btn-content', '.victory-requirement-focus > .btn-content', '.victory-place > .btn-content']) {
      assert.equal(await page.locator(selector).first().evaluate(element => getComputedStyle(element).textAlign), 'left');
    }
    assert.equal(await page.locator('[data-border-layer="goals"]').count(), 3, 'all future tiers have their own outer border');
    for (const kind of ['regions','lands','domains','held']) {
      assert.ok(await page.locator('[data-border-layer="'+kind+'"]').getAttribute('d'), kind+' border is rendered');
    }
    assert.equal(await page.locator('[data-province-index="3"]').getAttribute('data-controlled'), 'true');
    for (const province of await page.locator('[data-province-index]').all()) {
      const area = await province.boundingBox();
      const viewport = await page.locator('.victory-map').boundingBox();
      assert.ok(area.x >= viewport.x && area.x + area.width <= viewport.x + viewport.width + 1, 'all targets and holdings fit horizontally');
      assert.ok(area.y >= viewport.y && area.y + area.height <= viewport.y + viewport.height + 1, 'all targets and holdings fit vertically');
    }
    await page.evaluate(() => {
      window.victoryMapElement = document.querySelector('.victory-map > .zoom-pan-canvas__interaction-surface svg');
    });
    await page.getByRole('button', { name: 'Take the heartland', exact: true }).click();
    assert.equal(await page.evaluate(() => window.victoryMapElement === document.querySelector('.victory-map > .zoom-pan-canvas__interaction-surface svg')), true,
      'focusing a requirement retains the parsed map geometry');
    assert.equal(await page.locator('[data-province-index="0"] > path').first().getAttribute('fill'), '#9ebdd8',
      'selecting silver makes its shared targets readable in silver');
    await page.waitForFunction(old => new DOMMatrix(getComputedStyle(document.querySelector('.zoom-pan-canvas__content')).transform).a > new DOMMatrix(old).a, allTargetsTransform);
    const viewport = await page.locator('.victory-map').boundingBox();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('[data-border-layer="held"]').getAttribute('stroke-width'))
      * new DOMMatrix(getComputedStyle(document.querySelector('.zoom-pan-canvas__content')).transform).a - 4.5) < 0.01);
    assert.ok(Math.abs(await heldScreenWidth() - 4.5) < 0.01, 'zoom buttons preserve the visible border width');
    const beforePanTransform = await transform();
    await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
    await page.mouse.down();
    await page.mouse.move(viewport.x + viewport.width / 2 + 100, viewport.y + viewport.height / 2 + 50, { steps: 5 });
    await page.mouse.up();
    const pannedTransform = await transform();
    assert.notEqual(pannedTransform, beforePanTransform);
    await page.evaluate(() => window.renderVictory(true));
    await page.waitForFunction(() => document.querySelector('[data-province-index="0"]').dataset.controlled === 'true');
    await page.waitForTimeout(100);
    assert.equal(await transform(), pannedTransform, 'ownership updates must preserve the playerâ€™s chosen map view');
    const zoomBefore = await transform();
    await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
    await page.mouse.wheel(0, -240);
    await page.waitForFunction(old => getComputedStyle(document.querySelector('.zoom-pan-canvas__content')).transform !== old, zoomBefore);
    for (const width of [1920, 1280, 1000]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      const left = await page.locator('.victory-requirements').boundingBox();
      const right = await page.locator('.victory-map-panel').boundingBox();
      const panel = await page.locator('.screen--victory-conditions').boundingBox();
      const expectedWidth = await page.evaluate(() => Math.min(innerWidth, 72 * parseFloat(getComputedStyle(document.documentElement).fontSize)));
      assert.ok(Math.abs(panel.width - expectedWidth) < 1, 'victory uses the shared screen width');
      assert.ok(left.x + left.width <= right.x && right.width > 300, 'requirements and map stay side by side');
      assert.ok(right.x + right.width <= width + 1);
      if (process.env.VICTORY_SCREEN_SCREENSHOT_DIR && width === 1920) {
        await page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('.zoom-pan-canvas__content')).transform).a !== 1);
        await mkdir(process.env.VICTORY_SCREEN_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: join(process.env.VICTORY_SCREEN_SCREENSHOT_DIR, 'victory-screen.png') });
      }
    }
    await page.evaluate(() => window.renderVictory(false, true));
    await page.getByRole('button', { name: /Frontier 39/ }).waitFor({ state: 'attached' });
    await page.evaluate(() => {
      const viewport = document.querySelector('.victory-requirements > .styled-scroll-area__viewport');
      viewport.scrollTop = viewport.scrollHeight;
    });
    const finalRequirement = await page.getByRole('button', { name: /Frontier 39/ }).boundingBox();
    const requirementPane = await page.locator('.victory-requirements').boundingBox();
    assert.ok(finalRequirement.y >= requirementPane.y && finalRequirement.y + finalRequirement.height <= requirementPane.y + requirementPane.height + 1,
      'every requirement remains reachable when the conquest list exceeds the screen height');
    await page.getByRole('button', { name: /^Take the coast/ }).click();
    await page.evaluate(() => window.renderVictory(false, false, true));
    await page.locator('.victory-tier').first().getByText('Complete', { exact:true }).waitFor();
    assert.equal(await page.locator('.victory-tier').first().getByText('0 of 1 settlements controlled', { exact:true }).count(), 0,
      'earned stages retain completion without displaying a contradictory unmet requirement');
    assert.equal(await page.locator('[data-province-index="0"]').getAttribute('data-controlled'), 'false',
      'historical completion does not invent current control');
    assert.equal(await page.locator('[data-border-layer="goals"][data-tier-index="1"]').getAttribute('stroke-opacity'), '1',
      'earning the focused tier clears its dimming of future goals');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await page.evaluate(() => window.victoryClosedCount), 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
    assert.ok(resolve(fixture).startsWith(resolve(tmpdir()) + '\\'), 'fixture cleanup stays in the temporary directory');
    await rm(fixture, { recursive: true, force: true });
  }
});

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

for (const width of [1600, 1000, 640]) test(`campaign outcomes retain readable content and actions at ${width}px`, async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'foae-campaign-outcome-'));
  await writeFile(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/fixture.tsx"></script>');
  await writeFile(join(fixture, 'fixture.tsx'), `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import ${JSON.stringify(source('index.css'))};
    import ${JSON.stringify(source('styles/game-ui.css'))};
    import ${JSON.stringify(source('styles/raster-surfaces.css'))};
    import CampaignOutcomeScreen from ${JSON.stringify(source('components/screens/campaign/CampaignOutcomeScreen.tsx'))};
    import { EscapeStackProvider } from ${JSON.stringify(source('context/EscapeStackProvider.tsx'))};
    const root = createRoot(document.getElementById('root'));
    window.closedCount = 0;
    window.continued = 0;
    window.loaded = 0;
    const ruler = {name:'Sample Ruler',title:'King',reign:'4/9/897 - 12/10/897',battlesWon:0,battlesLost:0,
      portrait:'/assets/portraits/male_001.png',fate:''};
    const summary = {kicker:'Victory',title:'Savania Taken',subtitle:'Your campaign objective is complete',
      description:'The Kingdom of Franhall holds Savania. Completed on 12/10/897.',
      factionName:'Kingdom of Franhall',endDate:'12/10/897',totalTimeRuled:'38 days',totalBattlesWon:0,totalBattlesLost:0,
      currentRuler:ruler,previousRulers:[],history:[{label:'12/10/897',settlements:46,population:71000}],
      milestones:[],tierConditions:[{label:'Savania Taken',detail:'13 of 13 settlements controlled'}],
      crestIcon:'/assets/icons/Victory/I_Victory_Bronze.png',headerImage:'/assets/events/triumphal-return.png',
      primaryAction:'Continue Playing',secondaryAction:'Main Menu'};
    window.renderOutcome = (long = false, kind = 'victory', history = summary.history) => root.render(<EscapeStackProvider>
      <CampaignOutcomeScreen key={kind + ':' + long + ':' + history.length} kind={kind} summary={{...(long ? {...summary,
        title:'Every Settlement Across the Western Empire Reunited Under One Crown',
        previousRulers:Array.from({length:12},(_,i) => ({...ruler,name:'Previous Ruler ' + i})),
        history:[{label:'4/9/897',settlements:20,population:50000},...summary.history]} : {...summary,history}),
        primaryAction:kind === 'victory' ? 'Continue Playing' : 'Load Game'}}
        onClose={() => window.closedCount++} onContinuePlaying={() => window.continued++}
        onLoadSave={() => window.loaded++}/>
    </EscapeStackProvider>);
    window.renderOutcome();
  `);
  const server = await createServer({configFile:false,root:fixture,cacheDir:join(root,'.vite/campaign-outcome'),
    publicDir:join(root,'public'),plugins:[react()],
    resolve:{alias:{react:join(root,'node_modules/react'),'react-dom':join(root,'node_modules/react-dom')}},
    server:{host:'127.0.0.1',port:0,fs:{allow:[fixture,root]}}});
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL});
    const page = await browser.newPage({viewport:{width,height:800}});
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(server.resolvedUrls.local[0], {waitUntil:'domcontentloaded'});
    await page.getByRole('heading', {name:'Savania Taken',exact:true}).waitFor();
    assert.equal(await page.getByText('Savania Taken',{exact:true}).count(),1,'the completed objective title appears once');
    assert.equal(await page.getByText(/No (settlement|population) change/).count(),0,'one snapshot cannot establish a change');
    assert.equal(await page.locator('.outcome-history').count(),0,'one snapshot cannot establish a history chart');
    assert.equal(await page.getByText(/^(46|46 settlements)$/).count(),1,'current and peak must not repeat the same realm size');
    const primary = page.getByRole('button',{name:'Continue Playing',exact:true});
    assert.ok(await primary.isVisible());
    await page.evaluate(() => window.renderOutcome(true));
    await page.getByRole('heading',{name:'Every Settlement Across the Western Empire Reunited Under One Crown'}).waitFor();
    assert.equal(await page.locator('.outcome-history').count(),1,'multiple dates provide history');
    const bounds = await primary.boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 800,'actions remain inside the viewport with long ruler history');
    const titleFits = await page.getByRole('heading').first().evaluate(el => el.scrollWidth <= el.clientWidth + 1);
    assert.ok(titleFits,'long titles wrap instead of clipping');
    await page.evaluate(() => {
      const viewport = document.querySelector('.outcome-scroll > .styled-scroll-area__viewport');
      viewport.scrollTop = viewport.scrollHeight;
    });
    const lastRuler = await page.getByText('Previous Ruler 0',{exact:true}).boundingBox();
    const scrollBounds = await page.locator('.outcome-scroll').boundingBox();
    assert.ok(lastRuler.y >= scrollBounds.y && lastRuler.y + lastRuler.height <= scrollBounds.y + scrollBounds.height,'the body can scroll to every ruler');
    await primary.click();
    await page.waitForFunction(() => window.closedCount === 1 && window.continued === 1);
    await page.evaluate(() => window.renderOutcome(false, 'victory', [
      {label:'4/9/897',settlements:0,population:0},
      {label:'20/9/897',settlements:60,population:40000},
      {label:'12/10/897',settlements:46,population:71000},
    ]));
    await page.getByRole('heading',{name:'Savania Taken',exact:true}).waitFor();
    const peak = page.locator('.outcome-ledger tbody tr').filter({hasText:'At Its Height'});
    assert.match(await peak.innerText(), /60\s+20\/9\/897\s+-/,'peak settlement date is independent of peak population');
    assert.equal(await page.getByText('46',{exact:true}).count(),1,'realm history does not duplicate the current total');
    assert.equal((await page.locator('.outcome-chart-bar').first().boundingBox()).height,0,'zero values have no visible bar');
    await page.evaluate(() => window.renderOutcome(false, 'victory', []));
    await page.waitForFunction(() => document.querySelectorAll('.outcome-ledger').length === 0);
    assert.equal(await page.locator('.outcome-history').count(),0,'empty history must not display invented data');
    await page.evaluate(() => window.renderOutcome(false, 'defeat'));
    await page.getByRole('button',{name:'Load Game',exact:true}).click();
    await page.waitForFunction(() => window.loaded === 1);
    assert.equal(await page.evaluate(() => window.continued),1,'defeat must not continue a defeated campaign');
    assert.deepEqual(errors,[]);
    if (process.env.OUTCOME_SCREENSHOT) {
      await page.evaluate(() => window.renderOutcome());
      await page.waitForTimeout(300);
      await page.screenshot({path:join(process.env.OUTCOME_SCREENSHOT,`campaign-outcome-${width}.png`)});
    }
  } finally {
    await browser?.close();
    await server.close();
    await rm(fixture,{recursive:true,force:true});
  }
});

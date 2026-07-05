/**
 * Fall of an Empire – UI Performance Benchmark
 *
 * Measures FPS, frame timing, layout/paint/composite costs, and DOM stats
 * across idle, sidebar, screen, and event-popup scenarios.
 *
 * Usage:  node bench.mjs            (headless, default)
 *         node bench.mjs --headed   (watch it run)
 */

import puppeteer from 'puppeteer';

const HEADED = process.argv.includes('--headed');
const URL    = 'http://localhost:5173';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Sleep for ms milliseconds. */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Collect rAF-based frame timings for `durationMs` via page-side JS. */
async function collectFrameTimings(page, durationMs) {
  return page.evaluate(dur => new Promise(resolve => {
    const times = [];
    let start = null;
    function tick(ts) {
      if (!start) start = ts;
      times.push(ts);
      if (ts - start < dur) requestAnimationFrame(tick);
      else resolve(times);
    }
    requestAnimationFrame(tick);
  }), durationMs);
}

/** Turn raw rAF timestamps into stats. */
function analyseFrames(timestamps) {
  const deltas = [];
  for (let i = 1; i < timestamps.length; i++) deltas.push(timestamps[i] - timestamps[i - 1]);
  if (deltas.length === 0) return { fps: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0, jank: 0, frames: 0 };

  deltas.sort((a, b) => a - b);
  const sum   = deltas.reduce((a, b) => a + b, 0);
  const avg   = sum / deltas.length;
  const p     = q => deltas[Math.min(Math.floor(q * deltas.length), deltas.length - 1)];
  const jank  = deltas.filter(d => d > 33.33).length;   // frames > 30 fps threshold
  const fps   = 1000 / avg;

  return { fps: +fps.toFixed(1), avg: +avg.toFixed(2), p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), p99: +p(0.99).toFixed(2), max: +deltas[deltas.length - 1].toFixed(2), jank, frames: deltas.length };
}

/** Collect Chrome DevTools tracing metrics for a period. */
async function collectTraceMetrics(cdp, durationMs) {
  await cdp.send('Performance.enable');
  const before = await cdp.send('Performance.getMetrics');
  await sleep(durationMs);
  const after  = await cdp.send('Performance.getMetrics');
  await cdp.send('Performance.disable');

  const get = (metrics, name) => metrics.metrics.find(m => m.name === name)?.value ?? 0;
  const delta = name => get(after, name) - get(before, name);

  return {
    layoutCount:    delta('LayoutCount'),
    layoutDuration: +(delta('LayoutDuration') * 1000).toFixed(2),
    recalcCount:    delta('RecalcStyleCount'),
    recalcDuration: +(delta('RecalcStyleDuration') * 1000).toFixed(2),
    scriptDuration: +(delta('ScriptDuration') * 1000).toFixed(2),
    taskDuration:   +(delta('TaskDuration') * 1000).toFixed(2),
  };
}

/** Count DOM elements and CSS rules. */
async function domStats(page) {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('*').length;
    let cssRules = 0;
    for (const sheet of document.styleSheets) {
      try { cssRules += sheet.cssRules.length; } catch {}
    }
    return { elements, cssRules };
  });
}

/** Press a key and wait for the UI to settle. */
async function pressAndSettle(page, key, settleMs = 600) {
  await page.keyboard.press(key);
  await sleep(settleMs);
}

// ── scenarios ────────────────────────────────────────────────────────────────

async function runScenario(page, cdp, name, setupFn, teardownFn) {
  if (setupFn) await setupFn();
  await sleep(300); // let animations finish

  const sampleMs = 2000;

  // Collect FPS + trace in parallel
  const [timestamps, trace] = await Promise.all([
    collectFrameTimings(page, sampleMs),
    collectTraceMetrics(cdp, sampleMs),
  ]);

  const stats = analyseFrames(timestamps);
  const dom   = await domStats(page);

  if (teardownFn) await teardownFn();
  await sleep(200);

  return { name, ...stats, ...trace, ...dom };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const browser = await puppeteer.launch({
    headless: !HEADED,
    args: [
      '--disable-gpu-vsync',           // uncap FPS in headless
      '--disable-frame-rate-limit',
      '--run-all-compositor-stages-before-draw',
      '--disable-background-timer-throttling',
      '--no-sandbox',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate
  console.log(`\nConnecting to ${URL} ...`);
  try {
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 15000 });
  } catch {
    console.error('Could not reach dev server. Run "npm run dev" first.');
    await browser.close();
    process.exit(1);
  }
  await sleep(1000); // let React hydrate + CSS settle

  const cdp = await page.createCDPSession();
  const results = [];

  // Warm up - do one quick pass to JIT everything
  await collectFrameTimings(page, 500);

  console.log('Running benchmarks (each scenario ~3s) ...\n');

  // 1. Idle – nothing open
  results.push(await runScenario(page, cdp, 'Idle (map only)'));

  // 2. Left sidebar (settlement)
  results.push(await runScenario(page, cdp, 'Settlement sidebar',
    () => pressAndSettle(page, '1'),
    () => pressAndSettle(page, '0'),
  ));

  // 3. Right sidebar (character)
  results.push(await runScenario(page, cdp, 'Character sidebar',
    () => pressAndSettle(page, '2'),
    () => pressAndSettle(page, '0'),
  ));

  // 4. Both sidebars
  results.push(await runScenario(page, cdp, 'Both sidebars',
    async () => { await pressAndSettle(page, '1'); await pressAndSettle(page, '2'); },
    () => pressAndSettle(page, '0'),
  ));

  // 5. Diplomacy sidebar
  results.push(await runScenario(page, cdp, 'Diplomacy sidebar',
    () => pressAndSettle(page, '3'),
    () => pressAndSettle(page, '0'),
  ));

  // 6. Military sidebar
  results.push(await runScenario(page, cdp, 'Military sidebar',
    () => pressAndSettle(page, '4'),
    () => pressAndSettle(page, '0'),
  ));

  // 7. Power bloc sidebar
  results.push(await runScenario(page, cdp, 'Power bloc sidebar',
    () => pressAndSettle(page, '5'),
    () => pressAndSettle(page, '0'),
  ));

  // 8. Event popup
  results.push(await runScenario(page, cdp, 'Event popup',
    () => pressAndSettle(page, 'e'),
    () => pressAndSettle(page, 'e'),
  ));

  // 9. Sidebar open/close churn – measure FPS while rapidly toggling
  {
    const name = 'Rapid sidebar toggle';
    const timestamps = [];
    const startMark = performance.now();

    // Start frame collection
    const framePromise = collectFrameTimings(page, 3000);
    const tracePromise = collectTraceMetrics(cdp, 3000);

    // Rapid toggle for 3s
    for (let i = 0; i < 8; i++) {
      await pressAndSettle(page, '1', 150);
      await pressAndSettle(page, '2', 150);
      await pressAndSettle(page, '0', 150);
    }

    const [frames, trace] = await Promise.all([framePromise, tracePromise]);
    const stats = analyseFrames(frames);
    const dom   = await domStats(page);
    results.push({ name, ...stats, ...trace, ...dom });
    await pressAndSettle(page, '0');
  }

  // 10. Animation stress test - open sidebar and measure during slide-in
  {
    const name = 'Sidebar slide-in animation';
    // Collect frames starting just before the keypress
    const framePromise = collectFrameTimings(page, 1500);
    await sleep(100);
    await page.keyboard.press('2');  // trigger character sidebar
    const frames = await framePromise;
    const stats = analyseFrames(frames);
    const dom = await domStats(page);
    const trace = await collectTraceMetrics(cdp, 500);
    results.push({ name, ...stats, ...trace, ...dom });
    await pressAndSettle(page, '0');
  }

  // ── output ─────────────────────────────────────────────────────────────────

  console.log('='.repeat(100));
  console.log('  FALL OF AN EMPIRE – UI PERFORMANCE BENCHMARK');
  console.log('='.repeat(100));
  console.log(`  Mode: ${HEADED ? 'Headed' : 'Headless'}  |  Viewport: 1920x1080  |  Sample: 2-3s per scenario`);
  console.log('='.repeat(100));
  console.log('');

  // FPS table
  console.log('  FRAME RATE (rAF-based)');
  console.log('  ' + '-'.repeat(96));
  console.log('  ' + 'Scenario'.padEnd(30) + 'FPS'.padStart(8) + 'Avg ms'.padStart(10) + 'P50 ms'.padStart(10) + 'P95 ms'.padStart(10) + 'P99 ms'.padStart(10) + 'Max ms'.padStart(10) + 'Jank'.padStart(8));
  console.log('  ' + '-'.repeat(96));
  for (const r of results) {
    const fpsColor = r.fps >= 55 ? '\x1b[32m' : r.fps >= 30 ? '\x1b[33m' : '\x1b[31m';
    const jankColor = r.jank === 0 ? '\x1b[32m' : r.jank <= 3 ? '\x1b[33m' : '\x1b[31m';
    console.log('  ' +
      r.name.padEnd(30) +
      (fpsColor + String(r.fps).padStart(8) + '\x1b[0m') +
      String(r.avg).padStart(10) +
      String(r.p50).padStart(10) +
      String(r.p95).padStart(10) +
      String(r.p99).padStart(10) +
      String(r.max).padStart(10) +
      (jankColor + String(r.jank).padStart(8) + '\x1b[0m')
    );
  }
  console.log('  ' + '-'.repeat(96));
  console.log('');

  // Engine cost table
  console.log('  ENGINE COST (Chrome Performance API, over sample period)');
  console.log('  ' + '-'.repeat(96));
  console.log('  ' + 'Scenario'.padEnd(30) + 'Layouts'.padStart(10) + 'Layout ms'.padStart(12) + 'Recalcs'.padStart(10) + 'Recalc ms'.padStart(12) + 'Script ms'.padStart(12) + 'Task ms'.padStart(12));
  console.log('  ' + '-'.repeat(96));
  for (const r of results) {
    console.log('  ' +
      r.name.padEnd(30) +
      String(r.layoutCount).padStart(10) +
      String(r.layoutDuration).padStart(12) +
      String(r.recalcCount).padStart(10) +
      String(r.recalcDuration).padStart(12) +
      String(r.scriptDuration).padStart(12) +
      String(r.taskDuration).padStart(12)
    );
  }
  console.log('  ' + '-'.repeat(96));
  console.log('');

  // DOM stats
  console.log('  DOM STATS');
  console.log('  ' + '-'.repeat(50));
  for (const r of results) {
    console.log('  ' + r.name.padEnd(30) + `${r.elements} elements, ${r.cssRules} rules`);
  }
  console.log('  ' + '-'.repeat(50));
  console.log('');

  // Verdict
  const idleFps = results[0].fps;
  const worstFps = Math.min(...results.map(r => r.fps));
  const worstP95 = Math.max(...results.map(r => r.p95));
  const totalJank = results.reduce((s, r) => s + r.jank, 0);

  console.log('  VERDICT');
  console.log('  ' + '-'.repeat(60));
  console.log(`  Idle FPS:          ${idleFps >= 55 ? '\x1b[32mPASS' : '\x1b[31mFAIL'}\x1b[0m  (${idleFps} fps)`);
  console.log(`  Worst-case FPS:    ${worstFps >= 30 ? '\x1b[32mPASS' : '\x1b[31mFAIL'}\x1b[0m  (${worstFps} fps)`);
  console.log(`  Worst P95 frame:   ${worstP95 <= 33.33 ? '\x1b[32mPASS' : worstP95 <= 50 ? '\x1b[33mWARN' : '\x1b[31mFAIL'}\x1b[0m  (${worstP95} ms)`);
  console.log(`  Total jank frames: ${totalJank === 0 ? '\x1b[32mPASS' : totalJank <= 10 ? '\x1b[33mWARN' : '\x1b[31mFAIL'}\x1b[0m  (${totalJank} frames > 33ms)`);
  console.log(`  Game UI ready:     ${worstFps >= 30 && worstP95 <= 50 ? '\x1b[32mYES' : '\x1b[31mNO'}\x1b[0m`);
  console.log('  ' + '-'.repeat(60));
  console.log('');

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });

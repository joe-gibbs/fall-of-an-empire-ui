type PerfKind = 'bridge-call' | 'bridge-event' | 'react-render' | 'interaction';

interface PerfSample {
  kind: PerfKind;
  name: string;
  ms: number;
  atMs: number;
  interactionId?: number;
  interactionName?: string;
  detail?: string;
}

interface PerfAggregate {
  kind: PerfKind;
  name: string;
  count: number;
  totalMs: number;
  maxMs: number;
  maxDetail?: string;
}

interface InteractionRecord {
  id: number;
  name: string;
  startedAtMs: number;
  endsAtMs: number;
  count: number;
  totalMs: number;
  maxMs: number;
  bridgeCallMs: number;
  bridgeEventMs: number;
  reactRenderMs: number;
}

interface PerfCommand {
  command?: string;
  thresholdMs?: number;
  windowMs?: number;
  top?: number;
}

interface ReportEngine {
  call?: (name: string, ...args: unknown[]) => unknown | Promise<unknown>;
}

const MAX_SLOW_SAMPLES = 400;
const DEFAULT_THRESHOLD_MS = 2;
const DEFAULT_INTERACTION_WINDOW_MS = 2000;
const DEFAULT_REPORT_TOP = 25;

let enabled = false;
let thresholdMs = DEFAULT_THRESHOLD_MS;
let interactionWindowMs = DEFAULT_INTERACTION_WINDOW_MS;
let captureStartedAtMs = 0;
let sampleCount = 0;
let nextInteractionId = 1;
let commandListenerBound = false;

const aggregates = new Map<string, PerfAggregate>();
const slowSamples: PerfSample[] = [];
const activeInteractions: InteractionRecord[] = [];
const completedInteractions: InteractionRecord[] = [];

function nowMs(): number {
  return Date.now();
}

function formatMs(value: number): string {
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
}

function aggregateKey(kind: PerfKind, name: string): string {
  return `${kind}:${name}`;
}

function resetCapture(): void {
  aggregates.clear();
  slowSamples.length = 0;
  activeInteractions.length = 0;
  completedInteractions.length = 0;
  sampleCount = 0;
  nextInteractionId = 1;
  captureStartedAtMs = nowMs();
}

function completeExpiredInteractions(atMs: number): void {
  for (let i = activeInteractions.length - 1; i >= 0; i -= 1) {
    if (activeInteractions[i].endsAtMs >= atMs) continue;
    completedInteractions.push(activeInteractions[i]);
    activeInteractions.splice(i, 1);
  }
}

function currentInteraction(atMs: number): InteractionRecord | undefined {
  completeExpiredInteractions(atMs);
  return activeInteractions.length > 0 ? activeInteractions[activeInteractions.length - 1] : undefined;
}

function recordAggregate(sample: PerfSample): void {
  const key = aggregateKey(sample.kind, sample.name);
  const existing = aggregates.get(key);
  if (existing) {
    existing.count += 1;
    existing.totalMs += sample.ms;
    if (sample.ms > existing.maxMs) {
      existing.maxMs = sample.ms;
      existing.maxDetail = sample.detail;
    }
    return;
  }

  aggregates.set(key, {
    kind: sample.kind,
    name: sample.name,
    count: 1,
    totalMs: sample.ms,
    maxMs: sample.ms,
    maxDetail: sample.detail,
  });
}

function recordInteractionSample(sample: PerfSample): void {
  const interaction = sample.interactionId
    ? activeInteractions.find(item => item.id === sample.interactionId)
    : undefined;
  if (!interaction) return;

  interaction.count += 1;
  interaction.totalMs += sample.ms;
  interaction.maxMs = Math.max(interaction.maxMs, sample.ms);
  if (sample.kind === 'bridge-call') interaction.bridgeCallMs += sample.ms;
  else if (sample.kind === 'bridge-event') interaction.bridgeEventMs += sample.ms;
  else if (sample.kind === 'react-render') interaction.reactRenderMs += sample.ms;
}

function recordSample(sample: PerfSample): void {
  sampleCount += 1;
  recordAggregate(sample);
  recordInteractionSample(sample);

  if (sample.kind === 'interaction') {
    sendSampleToNative(sample);
  }

  if (sample.ms < thresholdMs) return;

  slowSamples.push(sample);
  slowSamples.sort((a, b) => b.ms - a.ms);
  if (slowSamples.length > MAX_SLOW_SAMPLES) {
    slowSamples.length = MAX_SLOW_SAMPLES;
  }

  sendSampleToNative(sample);
}

export function beginUIPerfInteraction(name: string, detail?: string): void {
  if (!enabled) return;

  const atMs = nowMs();
  completeExpiredInteractions(atMs);
  const record: InteractionRecord = {
    id: nextInteractionId,
    name,
    startedAtMs: atMs,
    endsAtMs: atMs + interactionWindowMs,
    count: 0,
    totalMs: 0,
    maxMs: 0,
    bridgeCallMs: 0,
    bridgeEventMs: 0,
    reactRenderMs: 0,
  };
  nextInteractionId += 1;
  activeInteractions.push(record);

  recordSample({
    kind: 'interaction',
    name,
    ms: 0,
    atMs,
    interactionId: record.id,
    interactionName: name,
    detail,
  });
}

export function recordUIPerfSpan(kind: PerfKind, name: string, startedAtMs: number, endedAtMs: number, detail?: string): void {
  if (!enabled) return;

  const ms = Math.max(0, endedAtMs - startedAtMs);
  const interaction = currentInteraction(endedAtMs);
  recordSample({
    kind,
    name,
    ms,
    atMs: endedAtMs,
    interactionId: interaction?.id,
    interactionName: interaction?.name,
    detail,
  });
}

export function recordUIPerfBridgeEvent(eventName: string, startedAtMs: number, endedAtMs: number): void {
  recordUIPerfSpan('bridge-event', eventName, startedAtMs, endedAtMs);
}

export function recordUIPerfBridgeCall(action: string, startedAtMs: number, endedAtMs: number, detail?: string): void {
  recordUIPerfSpan('bridge-call', action, startedAtMs, endedAtMs, detail);
}

export function recordUIPerfReactRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
): void {
  if (!enabled) return;
  const endedAtMs = nowMs();
  const name = `${id}:${phase}`;
  recordUIPerfSpan('react-render', name, endedAtMs - actualDuration, endedAtMs, `base ${formatMs(baseDuration)} ms`);
}

function sortedAggregates(filter?: (aggregate: PerfAggregate) => boolean): PerfAggregate[] {
  const values = Array.from(aggregates.values());
  return values
    .filter(aggregate => (filter ? filter(aggregate) : true))
    .sort((a, b) => b.totalMs - a.totalMs || b.maxMs - a.maxMs);
}

function sortedInteractions(): InteractionRecord[] {
  completeExpiredInteractions(nowMs());
  return [...completedInteractions, ...activeInteractions]
    .filter(interaction => interaction.count > 0)
    .sort((a, b) => b.totalMs - a.totalMs || b.maxMs - a.maxMs);
}

function appendAggregateRows(lines: string[], rows: PerfAggregate[], top: number): void {
  rows.slice(0, top).forEach((row, index) => {
    const detail = row.maxDetail ? ` (${row.maxDetail})` : '';
    lines.push(`${String(index + 1).padStart(2, ' ')}. ${formatMs(row.totalMs).padStart(7, ' ')} ms total  ${formatMs(row.maxMs).padStart(6, ' ')} ms max  ${String(row.count).padStart(4, ' ')}x  ${row.kind}  ${row.name}${detail}`);
  });
}

function appendReport(lines: string[], top: number): void {
  const elapsedMs = captureStartedAtMs > 0 ? nowMs() - captureStartedAtMs : 0;
  lines.push('=== WebUI Perf Report ===');
  lines.push(`State: ${enabled ? 'running' : 'stopped'}  elapsed: ${(elapsedMs / 1000).toFixed(1)} s  threshold: ${formatMs(thresholdMs)} ms  opening window: ${formatMs(interactionWindowMs)} ms  samples: ${sampleCount}`);

  const interactions = sortedInteractions();
  if (interactions.length > 0) {
    lines.push('');
    lines.push('Openings by measured UI work:');
    interactions.slice(0, top).forEach((interaction, index) => {
      lines.push(`${String(index + 1).padStart(2, ' ')}. ${formatMs(interaction.totalMs).padStart(7, ' ')} ms total  ${formatMs(interaction.maxMs).padStart(6, ' ')} ms max  ${String(interaction.count).padStart(4, ' ')} samples  ${interaction.name}`);
      lines.push(`    bridge calls ${formatMs(interaction.bridgeCallMs)} ms, bridge events ${formatMs(interaction.bridgeEventMs)} ms, React ${formatMs(interaction.reactRenderMs)} ms`);
    });
  }

  const bridgeCalls = sortedAggregates(row => row.kind === 'bridge-call');
  if (bridgeCalls.length > 0) {
    lines.push('');
    lines.push('Bridge calls by total time:');
    appendAggregateRows(lines, bridgeCalls, top);
  }

  const bridgeEvents = sortedAggregates(row => row.kind === 'bridge-event');
  if (bridgeEvents.length > 0) {
    lines.push('');
    lines.push('Pushed events by handler time:');
    appendAggregateRows(lines, bridgeEvents, top);
  }

  const renders = sortedAggregates(row => row.kind === 'react-render');
  if (renders.length > 0) {
    lines.push('');
    lines.push('React commits by total render time:');
    appendAggregateRows(lines, renders, top);
  }

  if (slowSamples.length > 0) {
    lines.push('');
    lines.push('Slowest individual samples:');
    slowSamples.slice(0, top).forEach((sample, index) => {
      const interaction = sample.interactionName ? `  during ${sample.interactionName}` : '';
      const detail = sample.detail ? `  ${sample.detail}` : '';
      lines.push(`${String(index + 1).padStart(2, ' ')}. ${formatMs(sample.ms).padStart(7, ' ')} ms  ${sample.kind}  ${sample.name}${interaction}${detail}`);
    });
  }
}

function reportText(top = DEFAULT_REPORT_TOP): string {
  const lines: string[] = [];
  appendReport(lines, Math.max(1, top));
  return lines.join('\n');
}

function sendTextToNative(text: string): void {
  const engine = (window as typeof window & { engine?: ReportEngine }).engine;
  if (engine?.call) {
    void Promise.resolve(engine.call('StrategyWebUIPerfReport', text)).catch(() => {
      console.log(text);
    });
    return;
  }

  console.log(text);
}

function sendSampleToNative(sample: PerfSample): void {
  const engine = (window as typeof window & { engine?: ReportEngine }).engine;
  if (!engine?.call) return;

  const payload = {
    kind: sample.kind,
    name: sample.name,
    ms: sample.ms,
    atMs: sample.atMs,
    interactionId: sample.interactionId ?? null,
    interactionName: sample.interactionName ?? '',
    detail: sample.detail ?? '',
    captureStartedAtMs,
  };
  void Promise.resolve(engine.call('StrategyWebUIPerfSample', JSON.stringify(payload))).catch(() => {});
}

function normaliseNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function handleCommand(command: PerfCommand): void {
  const action = typeof command.command === 'string' ? command.command.toLowerCase() : 'report';
  const top = Math.max(1, Math.round(normaliseNumber(command.top, DEFAULT_REPORT_TOP)));

  if (action === 'start') {
    thresholdMs = Math.max(0, normaliseNumber(command.thresholdMs, DEFAULT_THRESHOLD_MS));
    interactionWindowMs = Math.max(100, normaliseNumber(command.windowMs, DEFAULT_INTERACTION_WINDOW_MS));
    resetCapture();
    enabled = true;
    sendTextToNative(`WebUI perf capture started. Threshold ${formatMs(thresholdMs)} ms, opening window ${formatMs(interactionWindowMs)} ms.`);
    return;
  }

  if (action === 'stop') {
    enabled = false;
    sendTextToNative(reportText(top));
    return;
  }

  if (action === 'reset') {
    resetCapture();
    sendTextToNative('WebUI perf capture reset.');
    return;
  }

  if (action === 'status' || action === 'report') {
    sendTextToNative(reportText(top));
  }
}

export function bindUIPerfCommands(): void {
  if (commandListenerBound) return;
  commandListenerBound = true;

  window.addEventListener('bridge:ui.perf_profile', (event) => {
    handleCommand(((event as CustomEvent).detail ?? {}) as PerfCommand);
  });
}

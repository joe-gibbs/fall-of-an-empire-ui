/**
 * Tracks high-frequency React state updates so Maximum update depth errors can
 * name the components that drove the loop (React often omits componentStack).
 *
 * Wraps the live hooks dispatcher on React's client internals. Safe to install
 * more than once; no-ops if internals are unavailable.
 *
 * Critical: any wrapper around useSyncExternalStore's `subscribe` argument must
 * be referentially stable for a given original subscribe function. Creating a
 * new subscribe every render makes React unsubscribe/resubscribe every time,
 * which restarts external stores and can flood bridge refreshes (#185).
 */
import * as React from 'react'

type SetStateFn = (...args: unknown[]) => unknown
type SubscribeFn = (onStoreChange: () => void) => () => void

type HookDispatcher = {
  useState?: (...args: unknown[]) => unknown
  useReducer?: (...args: unknown[]) => unknown
  useSyncExternalStore?: (...args: unknown[]) => unknown
  __foaeUpdateDiagWrapped?: boolean
}

type ReactClientInternals = {
  H: HookDispatcher | null
}

const SKIP_STACK_NAMES = new Set([
  'Object',
  'Function',
  'Array',
  'Promise',
  'Proxy',
  'dispatchSetState',
  'dispatchReducerAction',
  'dispatchAction',
  'basicStateReducer',
  'scheduleUpdateOnFiber',
  'forceStoreRerender',
  'updateStoreInstance',
  'mountState',
  'updateState',
  'useState',
  'useReducer',
  'useSyncExternalStore',
  'mountSyncExternalStore',
  'updateSyncExternalStore',
  'Wrapped',
  'wrappedSetState',
  'wrappedDispatch',
  'noteStateUpdate',
  'recordUpdate',
  'getCallerComponentName',
  'installReactUpdateDiagnostics',
])

const NAME_SAMPLE_THRESHOLD = 20
const UPDATE_WARN_THRESHOLD = 40
const UPDATE_REPORT_LIMIT = 12
const MAX_LABELS = 64

const updateCounts = new Map<string, number>()
const setStateWrappers = new WeakMap<SetStateFn, SetStateFn>()
const subscribeWrappers = new WeakMap<SubscribeFn, SubscribeFn>()

let updatesThisTurn = 0
let turnFlushScheduled = false
let warnedThisTurn = false
let installed = false

function getReactClientInternals(): ReactClientInternals | null {
  const reactModule = React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: ReactClientInternals
  }
  return reactModule.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ?? null
}

function getCallerComponentName(): string {
  const stack = new Error().stack
  if (!stack) return 'Unknown'

  for (const rawLine of stack.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('at ')) continue

    const withPath = /^\s*at\s+(?:async\s+)?([^\s(/]+)\s+\(/.exec(line)
    const bare = /^\s*at\s+(?:async\s+)?([^\s(/]+)\s*$/.exec(line)
    const name = (withPath?.[1] ?? bare?.[1] ?? '').replace(/^Object\./, '')
    if (!name || SKIP_STACK_NAMES.has(name)) continue
    if (name.startsWith('use') && name.length < 24) continue
    if (/^[a-z]/.test(name) && !name.includes('.')) continue
    return name
  }

  for (const rawLine of stack.split('\n')) {
    const pathMatch = /(?:gameui:\/\/app\/src\/|\/src\/|WebUI\/src\/)([^\s:)]+)/i.exec(rawLine)
    if (!pathMatch) continue
    const file = pathMatch[1].split('/').pop() ?? pathMatch[1]
    return file.replace(/\.(tsx?|jsx?)$/i, '')
  }

  return 'Unknown'
}

function bumpLabel(label: string) {
  updateCounts.set(label, (updateCounts.get(label) ?? 0) + 1)
  if (updateCounts.size <= MAX_LABELS) {
    return
  }
  const sorted = [...updateCounts.entries()].sort((a, b) => b[1] - a[1])
  updateCounts.clear()
  for (const [key, value] of sorted.slice(0, Math.floor(MAX_LABELS / 2))) {
    updateCounts.set(key, value)
  }
}

function recordUpdate(kind: string, resolveName: () => string) {
  updatesThisTurn += 1

  // Stack capture is relatively expensive; only attribute once a turn is storming.
  if (updatesThisTurn >= NAME_SAMPLE_THRESHOLD) {
    bumpLabel(`${resolveName()} (${kind})`)
  } else {
    bumpLabel(`(pre-storm ${kind})`)
  }

  if (!turnFlushScheduled) {
    turnFlushScheduled = true
    queueMicrotask(() => {
      turnFlushScheduled = false
      updatesThisTurn = 0
      warnedThisTurn = false
      updateCounts.clear()
    })
  }

  if (!warnedThisTurn && updatesThisTurn >= UPDATE_WARN_THRESHOLD) {
    warnedThisTurn = true
    console.error(
      `[WebUI] ${updatesThisTurn} React state updates in one turn (approaching max update depth).\n`
      + `  top updaters:\n    ${formatTopUpdaters().join('\n    ')}`,
    )
  }
}

export function formatTopUpdaters(limit = UPDATE_REPORT_LIMIT): string[] {
  return [...updateCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => `${count}x ${label}`)
}

export function getUpdateDepthDiagnosticReport(): string {
  if (updateCounts.size === 0 && updatesThisTurn === 0) {
    return '  (no setState/useReducer samples recorded this turn)'
  }
  return [
    `  updates this turn: ${updatesThisTurn}`,
    '  top updaters:',
    ...formatTopUpdaters().map(line => `    ${line}`),
  ].join('\n')
}

function wrapSetStateLike(setState: SetStateFn, kind: string): SetStateFn {
  const existing = setStateWrappers.get(setState)
  if (existing) {
    return existing
  }
  const wrapped: SetStateFn = (...args: unknown[]) => {
    recordUpdate(kind, getCallerComponentName)
    return setState(...args)
  }
  setStateWrappers.set(setState, wrapped)
  return wrapped
}

function wrapSubscribe(subscribe: SubscribeFn): SubscribeFn {
  const existing = subscribeWrappers.get(subscribe)
  if (existing) {
    return existing
  }
  const wrapped: SubscribeFn = (onStoreChange) => {
    // Stable subscribe identity is required. Do not close over per-render owner names.
    return subscribe(() => {
      recordUpdate('useSyncExternalStore', () => 'external-store')
      onStoreChange()
    })
  }
  subscribeWrappers.set(subscribe, wrapped)
  return wrapped
}

function wrapDispatcher(dispatcher: HookDispatcher): HookDispatcher {
  if (!dispatcher || dispatcher.__foaeUpdateDiagWrapped) {
    return dispatcher
  }

  if (typeof dispatcher.useState === 'function') {
    const original = dispatcher.useState.bind(dispatcher)
    dispatcher.useState = (...args: unknown[]) => {
      const result = original(...args) as [unknown, SetStateFn]
      if (Array.isArray(result) && typeof result[1] === 'function') {
        return [result[0], wrapSetStateLike(result[1], 'useState')]
      }
      return result
    }
  }

  if (typeof dispatcher.useReducer === 'function') {
    const original = dispatcher.useReducer.bind(dispatcher)
    dispatcher.useReducer = (...args: unknown[]) => {
      const result = original(...args) as [unknown, SetStateFn]
      if (Array.isArray(result) && typeof result[1] === 'function') {
        return [result[0], wrapSetStateLike(result[1], 'useReducer')]
      }
      return result
    }
  }

  if (typeof dispatcher.useSyncExternalStore === 'function') {
    const original = dispatcher.useSyncExternalStore.bind(dispatcher)
    dispatcher.useSyncExternalStore = (
      subscribe: unknown,
      getSnapshot: unknown,
      getServerSnapshot?: unknown,
    ) => {
      if (typeof subscribe !== 'function') {
        return original(subscribe, getSnapshot, getServerSnapshot)
      }
      return original(wrapSubscribe(subscribe as SubscribeFn), getSnapshot, getServerSnapshot)
    }
  }

  dispatcher.__foaeUpdateDiagWrapped = true
  return dispatcher
}

/**
 * Install before createRoot. Patches React's live hooks dispatcher so setState
 * storms log the responsible components before React throws #185.
 */
export function installReactUpdateDiagnostics(): void {
  if (installed || typeof window === 'undefined') return
  const internals = getReactClientInternals()
  if (!internals) return
  installed = true

  let current = internals.H
  if (current) {
    wrapDispatcher(current)
  }

  try {
    Object.defineProperty(internals, 'H', {
      configurable: true,
      enumerable: true,
      get() {
        return current
      },
      set(next: HookDispatcher | null) {
        current = next ? wrapDispatcher(next) : next
      },
    })
  } catch {
    const pollId = window.setInterval(() => {
      if (internals.H && !internals.H.__foaeUpdateDiagWrapped) {
        wrapDispatcher(internals.H)
      }
    }, 0)
    window.setTimeout(() => window.clearInterval(pollId), 5000)
  }
}

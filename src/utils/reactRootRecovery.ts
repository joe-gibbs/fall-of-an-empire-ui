import { createRoot, type Root } from 'react-dom/client'
import type { ReactNode } from 'react'
import { createReactRootErrorOptions } from './reactErrorDecoder'

export const REACT_RECOVERY_WINDOW_MS = 10_000
export const REACT_RECOVERY_MAX_REMOUNTS = 3

export type RecoveryDecision = 'remount' | 'exhausted'

export type RootRecoveryController = {
  beginRecover: () => RecoveryDecision
  reset: () => void
  isExhausted: () => boolean
  retryDelayMs: () => number
  noteBoundaryMount: () => void
  noteBoundaryUnmount: () => void
  isBoundaryMounted: () => boolean
}

export type RecoverableRoot = {
  controller: RootRecoveryController
  remount: () => void
}

export function createRootRecoveryController(): RootRecoveryController {
  let attemptTimes: number[] = []
  let exhausted = false
  let boundaryMounts = 0

  function prune(now: number): void {
    attemptTimes = attemptTimes.filter(time => now - time < REACT_RECOVERY_WINDOW_MS)
  }

  return {
    beginRecover() {
      if (exhausted) return 'exhausted'
      const now = Date.now()
      prune(now)
      if (attemptTimes.length >= REACT_RECOVERY_MAX_REMOUNTS) {
        exhausted = true
        console.error('[WebUI] React recovery exhausted after repeated crashes')
        return 'exhausted'
      }
      attemptTimes.push(now)
      console.error('[WebUI] Remounting React tree after crash')
      return 'remount'
    },
    reset() {
      attemptTimes = []
      exhausted = false
    },
    isExhausted() {
      return exhausted
    },
    retryDelayMs() {
      if (attemptTimes.length === 0) return REACT_RECOVERY_WINDOW_MS
      return Math.max(0, attemptTimes[0] + REACT_RECOVERY_WINDOW_MS - Date.now())
    },
    noteBoundaryMount() {
      boundaryMounts += 1
    },
    noteBoundaryUnmount() {
      boundaryMounts = Math.max(0, boundaryMounts - 1)
    },
    isBoundaryMounted() {
      return boundaryMounts > 0
    },
  }
}

export function mountRecoverableRoot(
  container: HTMLElement,
  renderTree: (api: RecoverableRoot) => ReactNode,
): RecoverableRoot {
  const controller = createRootRecoveryController()
  let root: Root | null = null
  let remountQueued = false
  const api: RecoverableRoot = {
    controller,
    remount,
  }

  function remount(): void {
    remountQueued = false
    if (root) {
      try {
        root.unmount()
      } catch {
        // React may already have unmounted this root after a fatal error.
      }
      root = null
    }
    root = createRoot(container, createReactRootErrorOptions({
      onUncaughtError() {
        if (remountQueued) return
        remountQueued = true
        requestAnimationFrame(() => {
          if (controller.isBoundaryMounted() || controller.isExhausted()) {
            remountQueued = false
            return
          }
          controller.beginRecover()
          remount()
        })
      },
    }))
    root.render(renderTree(api))
  }

  remount()
  return api
}

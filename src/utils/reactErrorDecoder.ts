/**
 * Decodes minified React production errors so Unreal/Webkiln console logs show
 * the real message instead of only "Minified React error #N".
 *
 * Also formats createRoot onUncaughtError / onCaughtError / onRecoverableError
 * payloads so component stacks (and the leaf component) appear in logs.
 *
 * Codes match https://react.dev/errors/<code> (React 19).
 */
import type { RootOptions } from 'react-dom/client'

const REACT_ERROR_MESSAGES: Record<number, string> = {
  185: 'Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.',
  300: 'Rendered more hooks than during the previous render.',
  301: 'Rendered fewer hooks than expected. This may be caused by an accidental early return statement.',
  310: 'Rendered more hooks than during the previous render.',
  311: 'Rendered fewer hooks than expected. This may be caused by an accidental early return statement.',
  418: 'Hydration failed because the server rendered HTML didn\'t match the client.',
  419: 'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
  421: 'This Suspense boundary received an update before it finished hydrating.',
  422: 'There was an error while hydrating this Suspense boundary. Switched to client rendering.',
  423: 'There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.',
  425: 'Text content does not match server-rendered HTML.',
}

const MINIFIED_REACT_ERROR_RE = /Minified React error #(\d+)/i
const COMPONENT_STACK_FRAME_RE = /^\s*at\s+([^\s(]+)/gm
const ANONYMOUS_FRAME_RE = /^(anonymous|Unknown|Object|Function|eval|Array|Promise)$/i
const MAX_STACK_COMPONENTS = 12
// In-game stacks look like: at Foo (gameui://app/src/components/.../Bar.js:12:3)
const APP_SOURCE_PATH_RE = /(?:gameui:\/\/app\/src\/|\/src\/|WebUI\/src\/)[^\s:)]+\.(?:jsx?|tsx?)(?::\d+(?::\d+)?)?/i
const VENDOR_STACK_RE = /node_modules|react-dom|\/scheduler\/|\/react\/cjs\//i
const STACK_FN_NAME_RE = /^\s*at\s+(?:async\s+)?([^\s(]+)/

export type ReactRootErrorKind = 'uncaught' | 'caught' | 'recoverable'

export function decodeReactErrorMessage(message: string): string | null {
  const match = MINIFIED_REACT_ERROR_RE.exec(message)
  if (!match) return null
  const code = Number(match[1])
  const decoded = REACT_ERROR_MESSAGES[code]
  if (!decoded) {
    return `React error #${code}. See https://react.dev/errors/${code}`
  }
  return `React error #${code}: ${decoded}`
}

function errorMessageText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const decoded = decodeReactErrorMessage(error.message)
    if (decoded) {
      return error.stack ? `${decoded}\n${error.stack}` : decoded
    }
    return error.stack ? `${error.message}\n${error.stack}` : error.message
  }
  if (typeof error === 'string') {
    return decodeReactErrorMessage(error) ?? error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/**
 * Pulls readable component names from a React componentStack string.
 * Returns them leaf-first (the failing component first).
 */
export function extractComponentNames(componentStack: string | null | undefined): string[] {
  if (!componentStack) return []
  const names: string[] = []
  const seen = new Set<string>()
  COMPONENT_STACK_FRAME_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = COMPONENT_STACK_FRAME_RE.exec(componentStack)) !== null) {
    const name = match[1]?.trim()
    if (!name || ANONYMOUS_FRAME_RE.test(name) || seen.has(name)) continue
    seen.add(name)
    names.push(name)
    if (names.length >= MAX_STACK_COMPONENTS) break
  }
  return names
}

/**
 * Fallback when React omits componentStack (common for #185 infinite loops):
 * pick the first few app source frames from the JS Error.stack.
 */
export function extractAppStackHints(error: unknown): string[] {
  if (!(error instanceof Error) || !error.stack) return []
  const hints: string[] = []
  const seen = new Set<string>()
  for (const rawLine of error.stack.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('at ')) continue
    if (VENDOR_STACK_RE.test(line)) continue
    const pathMatch = APP_SOURCE_PATH_RE.exec(line)
    if (!pathMatch) continue
    const nameMatch = STACK_FN_NAME_RE.exec(line)
    const name = nameMatch?.[1]?.trim()
    const path = pathMatch[0]
    const label =
      name && !ANONYMOUS_FRAME_RE.test(name) && !path.startsWith(name)
        ? `${name} (${path})`
        : path
    if (seen.has(label)) continue
    seen.add(label)
    hints.push(label)
    if (hints.length >= MAX_STACK_COMPONENTS) break
  }
  return hints
}

function summariseComponentPath(componentStack: string | null | undefined): string {
  const names = extractComponentNames(componentStack)
  if (names.length === 0) return ''
  return names.join(' < ')
}

/**
 * Formats a React root error for the Unreal/Webkiln console.
 * Prefer this path over window 'error' — only createRoot callbacks get componentStack.
 */
export function formatReactRootError(
  kind: ReactRootErrorKind,
  error: unknown,
  errorInfo?: { componentStack?: string | null },
): string {
  const rawMessage = errorMessageText(error)
  const decoded = decodeReactErrorMessage(rawMessage) ?? rawMessage
  const componentStack = errorInfo?.componentStack?.trim() ?? ''
  const path = summariseComponentPath(componentStack)
  const leaf = extractComponentNames(componentStack)[0]
  const appHints = componentStack ? [] : extractAppStackHints(error)
  const leafHint = leaf ?? appHints[0]?.match(/^([^\s(]+)/)?.[1]

  const lines: string[] = [
    `[WebUI] React ${kind} error${leafHint ? ` in ${leafHint}` : ''}: ${decoded}`,
  ]
  if (path) {
    lines.push(`  component path: ${path}`)
  }
  if (componentStack) {
    lines.push(componentStack)
  } else if (appHints.length > 0) {
    lines.push('  app stack (no React componentStack; likely update loop source):')
    for (const hint of appHints) {
      lines.push(`    ${hint}`)
    }
  } else {
    lines.push('  (no component stack available from React)')
  }
  if (error instanceof Error && error.stack) {
    lines.push(error.stack)
  }
  return lines.join('\n')
}

export function logReactRootError(
  kind: ReactRootErrorKind,
  error: unknown,
  errorInfo?: { componentStack?: string | null },
): void {
  console.error(formatReactRootError(kind, error, errorInfo), error)
}

/**
 * Root options that log which component failed when React reports an error.
 * Pass these into every createRoot(...) call.
 */
export function createReactRootErrorOptions(): RootOptions {
  return {
    onUncaughtError(error, errorInfo) {
      logReactRootError('uncaught', error, errorInfo)
    },
    onCaughtError(error, errorInfo) {
      logReactRootError('caught', error, errorInfo)
    },
    onRecoverableError(error, errorInfo) {
      logReactRootError('recoverable', error, errorInfo)
    },
  }
}

/**
 * Installs window-level handlers that re-log decoded React production errors.
 * Safe to call more than once.
 *
 * Note: window handlers usually do not receive React's componentStack.
 * Prefer createReactRootErrorOptions() on createRoot for component identity.
 */
export function installReactErrorDecoder(): void {
  if (typeof window === 'undefined') return
  const flag = '__foaeReactErrorDecoderInstalled' as const
  const installed = window as Window & { [flag]?: boolean }
  if (installed[flag]) return
  installed[flag] = true

  window.addEventListener('error', (event) => {
    const source = event.error ?? event.message
    const decoded = source instanceof Error
      ? decodeReactErrorMessage(source.message)
      : typeof source === 'string'
        ? decodeReactErrorMessage(source)
        : null
    if (!decoded) return

    // createRoot onUncaughtError usually logs first with componentStack.
    // This is a secondary path when React rethrows or createRoot options were not used.
    const error = event.error instanceof Error ? event.error : null
    const componentStack = error && 'componentStack' in error
      ? String((error as Error & { componentStack?: string }).componentStack ?? '')
      : ''
    if (componentStack) {
      console.error(
        formatReactRootError('uncaught', event.error ?? event.message, { componentStack }),
        event.error ?? event.message,
      )
      return
    }
    const appHints = extractAppStackHints(event.error)
    if (appHints.length > 0) {
      console.error(
        `[WebUI] ${decoded} (window error)\n  app stack:\n    ${appHints.join('\n    ')}`,
        event.error ?? event.message,
      )
      return
    }
    console.error(
      `[WebUI] ${decoded} (window error; see prior createRoot log for component path)`,
      event.error ?? event.message,
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason ?? '')
    const decoded = decodeReactErrorMessage(message)
    if (!decoded) return
    console.error(`[WebUI] ${decoded}`, formatUnknownError(reason))
  })
}

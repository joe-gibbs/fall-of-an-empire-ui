/**
 * Formats React root / window errors for Unreal/Webkiln console logs.
 *
 * The WebUI build resolves React to its development builds so thrown Errors
 * already carry full messages. This module still:
 * - rewrites any leftover "Minified React error #N" text in Error objects
 * - formats createRoot onUncaughtError / onCaughtError / onRecoverableError
 *   payloads so component stacks (and the leaf component) appear in logs
 *
 * Codes match https://react.dev/errors/<code> (React 19).
 */
import type { RootOptions } from 'react-dom/client'
import { getUpdateDepthDiagnosticReport } from './reactUpdateDiagnostics'

const REACT_ERROR_MESSAGES: Record<number, string> = {
  130: 'Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined.',
  152: 'Too many re-renders. React limits the number of renders to prevent an infinite loop.',
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

const MINIFIED_REACT_ERROR_RE = /Minified React error #(\d+)(?:; visit https:\/\/react\.dev\/errors\/\d+[^\s]*)?/i
const MAX_UPDATE_DEPTH_RE = /Maximum update depth exceeded/i
const CULPRIT_FIBER_RE = /Culprit fiber:\s*(.+)$/im
const COMPONENT_STACK_FRAME_RE = /^\s*at\s+([^\s(]+)/gm
const ANONYMOUS_FRAME_RE = /^(anonymous|Unknown|Object|Function|eval|Array|Promise)$/i
const MAX_STACK_COMPONENTS = 12
// In-game stacks look like: at Foo (gameui://app/src/components/.../Bar.js:12:3)
const APP_SOURCE_PATH_RE = /(?:gameui:\/\/app\/src\/|\/src\/|WebUI\/src\/)[^\s:)]+\.(?:jsx?|tsx?)(?::\d+(?::\d+)?)?/i
const VENDOR_STACK_RE = /node_modules|react-dom|\/scheduler\/|\/react\/cjs\//i
const STACK_FN_NAME_RE = /^\s*at\s+(?:async\s+)?([^\s(]+)/

export type ReactRootErrorKind = 'uncaught' | 'caught' | 'recoverable'

function isMaxUpdateDepthError(message: string): boolean {
  return MAX_UPDATE_DEPTH_RE.test(message) || /Minified React error #185\b/i.test(message)
}

function extractCulpritFiber(message: string): string | null {
  const match = CULPRIT_FIBER_RE.exec(message)
  const path = match?.[1]?.trim()
  return path || null
}

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

/**
 * Rewrite minified React text on the Error itself so later log sinks (and the
 * second console.error argument) show the expanded message rather than the code.
 */
export function expandMinifiedReactError(error: unknown): void {
  if (!(error instanceof Error)) return
  const decoded = decodeReactErrorMessage(error.message)
  if (!decoded) return
  try {
    error.message = decoded
  } catch {
    // Some hosts freeze Error.message; formatting paths still expand text.
  }
  if (typeof error.stack === 'string' && MINIFIED_REACT_ERROR_RE.test(error.stack)) {
    try {
      error.stack = error.stack.replace(MINIFIED_REACT_ERROR_RE, decoded)
    } catch {
      // ignore non-writable stack
    }
  }
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
  expandMinifiedReactError(error)
  const rawMessage = errorMessageText(error)
  const decoded = decodeReactErrorMessage(rawMessage) ?? rawMessage
  const componentStack = errorInfo?.componentStack?.trim() ?? ''
  const path = summariseComponentPath(componentStack)
  const culpritFiber = extractCulpritFiber(rawMessage) ?? extractCulpritFiber(decoded)
  const leaf = extractComponentNames(componentStack)[0]
    ?? culpritFiber?.split(' < ')[0]
  const appHints = componentStack ? [] : extractAppStackHints(error)
  const leafHint = leaf ?? appHints[0]?.match(/^([^\s(]+)/)?.[1]
  const maxDepth = isMaxUpdateDepthError(rawMessage) || isMaxUpdateDepthError(decoded)

  const lines: string[] = [
    `[WebUI] React ${kind} error${leafHint ? ` in ${leafHint}` : ''}: ${decoded}`,
  ]
  if (culpritFiber) {
    lines.push(`  culprit fiber: ${culpritFiber}`)
  }
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
  } else if (!culpritFiber) {
    lines.push('  (no component stack available from React)')
  }
  if (maxDepth) {
    lines.push('  update-depth diagnostics:')
    lines.push(getUpdateDepthDiagnosticReport())
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
  expandMinifiedReactError(error)
  console.error(formatReactRootError(kind, error, errorInfo), error)
}

type ReactRootErrorHandler = (
  error: unknown,
  errorInfo?: { componentStack?: string | null },
) => void

/**
 * Root options that log which component failed when React reports an error.
 * Pass these into every createRoot(...) call.
 */
export function createReactRootErrorOptions(handlers?: {
  onUncaughtError?: ReactRootErrorHandler
}): RootOptions {
  return {
    onUncaughtError(error, errorInfo) {
      logReactRootError('uncaught', error, errorInfo)
      handlers?.onUncaughtError?.(error, errorInfo)
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
 * Installs window-level handlers that expand leftover minified React codes and
 * log app stacks. Safe to call more than once.
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
    expandMinifiedReactError(event.error)
    const source = event.error ?? event.message
    const rawMessage = source instanceof Error
      ? source.message
      : typeof source === 'string'
        ? source
        : ''
    const decoded = decodeReactErrorMessage(rawMessage)
    const maxDepth = isMaxUpdateDepthError(rawMessage)
    // Re-log minified production codes and max-update-depth always — that path
    // usually has no React componentStack, so our fiber/updater report is the
    // only useful identity in Unreal logs.
    if (!decoded && !maxDepth) return

    console.error(
      formatReactRootError('uncaught', event.error ?? event.message),
      event.error ?? event.message,
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    expandMinifiedReactError(event.reason)
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason ?? '')
    const decoded = decodeReactErrorMessage(message)
    const maxDepth = isMaxUpdateDepthError(message)
    if (!decoded && !maxDepth) return
    console.error(
      formatReactRootError('uncaught', reason),
      formatUnknownError(reason),
    )
  })
}

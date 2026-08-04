/**
 * Decodes minified React production errors so Unreal/Webkiln console logs show
 * the real message instead of only "Minified React error #N".
 *
 * Codes match https://react.dev/errors/<code> (React 19).
 */
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
};

const MINIFIED_REACT_ERROR_RE = /Minified React error #(\d+)/i;

export function decodeReactErrorMessage(message: string): string | null {
  const match = MINIFIED_REACT_ERROR_RE.exec(message);
  if (!match) return null;
  const code = Number(match[1]);
  const decoded = REACT_ERROR_MESSAGES[code];
  if (!decoded) {
    return `React error #${code}. See https://react.dev/errors/${code}`;
  }
  return `React error #${code}: ${decoded}`;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const decoded = decodeReactErrorMessage(error.message);
    if (decoded) return decoded;
    return error.stack ? `${error.message}\n${error.stack}` : error.message;
  }
  if (typeof error === 'string') {
    return decodeReactErrorMessage(error) ?? error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Installs window-level handlers that re-log decoded React production errors.
 * Safe to call more than once.
 */
export function installReactErrorDecoder(): void {
  if (typeof window === 'undefined') return;
  const flag = '__foaeReactErrorDecoderInstalled' as const;
  const installed = window as Window & { [flag]?: boolean };
  if (installed[flag]) return;
  installed[flag] = true;

  window.addEventListener('error', (event) => {
    const source = event.error ?? event.message;
    const decoded = source instanceof Error
      ? decodeReactErrorMessage(source.message)
      : typeof source === 'string'
        ? decodeReactErrorMessage(source)
        : null;
    if (!decoded) return;
    const error = event.error instanceof Error ? event.error : null;
    const componentStack = error && 'componentStack' in error
      ? String((error as Error & { componentStack?: string }).componentStack ?? '')
      : '';
    // Log a clear second line; the original minified message is already on the console.
    if (componentStack) {
      console.error(`[WebUI] ${decoded}\n${componentStack}`, event.error ?? event.message);
    } else {
      console.error(`[WebUI] ${decoded}`, event.error ?? event.message);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? '');
    const decoded = decodeReactErrorMessage(message);
    if (!decoded) return;
    console.error(`[WebUI] ${decoded}`, formatUnknownError(reason));
  });
}

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';

export interface EscapeStackRecord {
  /** Unique per hook instance, so two mounts that share an id stay separate entries. */
  token: string;
  id: string;
  /** Render order of the opening. Parents render before children and earlier siblings before later ones. */
  openedAt: number;
  onCloseRef: MutableRefObject<() => void>;
  allowFromInput: boolean;
  onConfirmRef: MutableRefObject<(() => void) | undefined>;
  canConfirmRef: MutableRefObject<boolean>;
}

export type RegisterEscapeStackEntryArgs = EscapeStackRecord;

/**
 * Runs when Escape reaches no open entry. Handlers are tried from the highest
 * priority down, and the first one that returns true handles the press.
 */
export interface EscapeFallbackRecord {
  token: string;
  priority: number;
  handleRef: MutableRefObject<() => boolean>;
}

export interface EscapeStackContextValue {
  registerEntry: (entry: RegisterEscapeStackEntryArgs) => () => void;
  registerFallback: (fallback: EscapeFallbackRecord) => () => void;
  /** Closes the top entry, or runs the fallbacks when nothing is open. */
  dispatchEscape: (options?: { fromInput?: boolean }) => boolean;
}

interface EscapeStackEntryOptions {
  id: string;
  active: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  canConfirm?: boolean;
  /** A change of key while active is a fresh opening, which moves the entry to the top. */
  orderKey?: string;
  allowFromInput?: boolean;
}

export const EscapeStackContext = createContext<EscapeStackContextValue | null>(null);

let lastOpenedAt = 0;
function nextOpenedAt(): number {
  lastOpenedAt += 1;
  return lastOpenedAt;
}

export function isEscapeTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input'
    || tagName === 'select'
    || tagName === 'textarea'
    || target.isContentEditable
    || !!target.closest('[contenteditable="true"]')
  );
}

export function useEscapeStack() {
  const context = useContext(EscapeStackContext);
  if (!context) throw new Error('useEscapeStack must be used within EscapeStackProvider');
  return context;
}

interface EscapeOpening {
  key: string | null;
  openedAt: number;
}

function openingFor(key: string | null): EscapeOpening {
  return { key, openedAt: key === null ? 0 : nextOpenedAt() };
}

export function useEscapeStackEntry({
  id,
  active,
  onClose,
  onConfirm,
  canConfirm = true,
  orderKey = id,
  allowFromInput = false,
}: EscapeStackEntryOptions) {
  const { registerEntry } = useEscapeStack();
  const token = useId();
  const onCloseRef = useRef(onClose);
  const onConfirmRef = useRef(onConfirm);
  const canConfirmRef = useRef(canConfirm);

  // The opening order is taken during render, so an entry opened inside another
  // entry's subtree in the same commit sits above it.
  const openKey = active ? orderKey : null;
  const [opening, setOpening] = useState<EscapeOpening>(() => openingFor(openKey));
  let current = opening;
  if (opening.key !== openKey) {
    current = openingFor(openKey);
    setOpening(current);
  }
  const { openedAt } = current;

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    onConfirmRef.current = onConfirm;
    canConfirmRef.current = canConfirm;
  }, [onClose, onConfirm, canConfirm]);

  useLayoutEffect(() => {
    if (!active) return undefined;
    return registerEntry({
      token,
      id,
      openedAt,
      onCloseRef,
      onConfirmRef,
      canConfirmRef,
      allowFromInput,
    });
  }, [active, allowFromInput, id, openedAt, registerEntry, token]);
}

/** Registers what Escape does when no entry is open. */
export function useEscapeFallback(priority: number, handle: () => boolean) {
  const { registerFallback } = useEscapeStack();
  const token = useId();
  const handleRef = useRef(handle);

  useLayoutEffect(() => {
    handleRef.current = handle;
  }, [handle]);

  useLayoutEffect(() => registerFallback({ token, priority, handleRef }), [priority, registerFallback, token]);
}

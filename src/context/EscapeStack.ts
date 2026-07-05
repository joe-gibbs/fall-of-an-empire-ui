import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
} from 'react';

export interface EscapeStackRecord {
  id: string;
  orderKey: string;
  onCloseRef: MutableRefObject<() => void>;
  allowFromInput: boolean;
}

export interface RegisterEscapeStackEntryArgs {
  id: string;
  orderKey: string;
  onCloseRef: MutableRefObject<() => void>;
  allowFromInput?: boolean;
}

export interface EscapeStackContextValue {
  registerEntry: (entry: RegisterEscapeStackEntryArgs) => () => void;
  closeLatest: (options?: { fromInput?: boolean }) => boolean;
  handleEscapeStack: (options?: { fromInput?: boolean }) => boolean;
  markEscapeHandled: () => void;
}

interface EscapeStackEntryOptions {
  id: string;
  active: boolean;
  onClose: () => void;
  orderKey?: string;
  allowFromInput?: boolean;
}

export const EscapeStackContext = createContext<EscapeStackContextValue | null>(null);

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

export function useEscapeStackEntry({
  id,
  active,
  onClose,
  orderKey = id,
  allowFromInput = false,
}: EscapeStackEntryOptions) {
  const { registerEntry } = useEscapeStack();
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!active) return undefined;
    return registerEntry({
      id,
      orderKey,
      onCloseRef,
      allowFromInput,
    });
  }, [active, allowFromInput, id, orderKey, registerEntry]);
}

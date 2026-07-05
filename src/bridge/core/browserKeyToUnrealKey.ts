/**
 * Maps a browser KeyboardEvent.code to the Unreal Engine FKey name expected by
 * the game's input system. Returns `null` for keys that cannot be bound
 * (modifier-only keys, media keys, etc.).
 */
const CODE_TO_UE_KEY: Record<string, string> = {
  // Letters
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N',
  KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T', KeyU: 'U',
  KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y', KeyZ: 'Z',

  // Top-row digits
  Digit0: 'Zero', Digit1: 'One', Digit2: 'Two', Digit3: 'Three', Digit4: 'Four',
  Digit5: 'Five', Digit6: 'Six', Digit7: 'Seven', Digit8: 'Eight', Digit9: 'Nine',

  // Numpad
  Numpad0: 'NumPadZero', Numpad1: 'NumPadOne', Numpad2: 'NumPadTwo',
  Numpad3: 'NumPadThree', Numpad4: 'NumPadFour', Numpad5: 'NumPadFive',
  Numpad6: 'NumPadSix', Numpad7: 'NumPadSeven', Numpad8: 'NumPadEight',
  Numpad9: 'NumPadNine',
  NumpadAdd: 'Add', NumpadSubtract: 'Subtract', NumpadMultiply: 'Multiply',
  NumpadDivide: 'Divide', NumpadDecimal: 'Decimal', NumpadEnter: 'Enter',

  // Function keys
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
  F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',

  // Whitespace / editing
  Space: 'SpaceBar',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'BackSpace',
  Escape: 'Escape',
  CapsLock: 'CapsLock',
  Insert: 'Insert',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',

  // Arrows
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',

  // Punctuation
  Semicolon: 'Semicolon',
  Quote: 'Apostrophe',
  BracketLeft: 'LeftBracket',
  BracketRight: 'RightBracket',
  Backslash: 'Backslash',
  Slash: 'Slash',
  Comma: 'Comma',
  Period: 'Period',
  Minus: 'Hyphen',
  Equal: 'Equals',
};

export function browserKeyToUnrealKey(code: string, key?: string): string | null {
  if (code === 'Backquote') {
    return key === '^' || key === 'Dead' ? 'Caret' : 'Tilde';
  }
  return CODE_TO_UE_KEY[code] ?? null;
}

export function browserMouseButtonToUnrealKey(button: number): string | null {
  switch (button) {
    case 0:
      return 'LeftMouseButton';
    case 1:
      return 'MiddleMouseButton';
    case 2:
      return 'RightMouseButton';
    case 3:
      return 'ThumbMouseButton';
    case 4:
      return 'ThumbMouseButton2';
    default:
      return null;
  }
}

export function isModifierCode(code: string): boolean {
  return (
    code === 'ShiftLeft' || code === 'ShiftRight' ||
    code === 'ControlLeft' || code === 'ControlRight' ||
    code === 'AltLeft' || code === 'AltRight' ||
    code === 'MetaLeft' || code === 'MetaRight'
  );
}

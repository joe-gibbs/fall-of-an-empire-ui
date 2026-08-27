export const GAMEPAD_FOCUS_REFRESH_EVENT = 'foae.gamepad_focus_refresh';

export function requestGamepadFocusRefresh() {
  window.dispatchEvent(new Event(GAMEPAD_FOCUS_REFRESH_EVENT));
}

/**
 * Maps standard Gamepad API button indices (Xbox layout) to Unreal FKey names.
 * Steam Deck, Xbox, and most XInput controllers use this layout.
 */
const BUTTON_TO_UE_KEY: Record<number, string> = {
  0: 'Gamepad_FaceButton_Bottom', // A
  1: 'Gamepad_FaceButton_Right', // B
  2: 'Gamepad_FaceButton_Left', // X
  3: 'Gamepad_FaceButton_Top', // Y
  4: 'Gamepad_LeftShoulder',
  5: 'Gamepad_RightShoulder',
  6: 'Gamepad_LeftTrigger',
  7: 'Gamepad_RightTrigger',
  8: 'Gamepad_Special_Left', // View / Select
  9: 'Gamepad_Special_Right', // Menu / Start
  10: 'Gamepad_LeftThumbstick',
  11: 'Gamepad_RightThumbstick',
  12: 'Gamepad_DPad_Up',
  13: 'Gamepad_DPad_Down',
  14: 'Gamepad_DPad_Left',
  15: 'Gamepad_DPad_Right',
};

export function browserGamepadButtonToUnrealKey(buttonIndex: number): string | null {
  return BUTTON_TO_UE_KEY[buttonIndex] ?? null;
}

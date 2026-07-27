export const UI_MOTION = {
  // Standard close animation for modal dialogs.
  modalCloseMs: 180,
  // Standard close animation for side panels.
  panelCloseMs: 220,
  // Close animation for nested views within a screen.
  subviewCloseMs: 200,
  // Close animation for the full pause menu.
  pauseMenuCloseMs: 280,
  // Close animation for the campaign outcome screen.
  campaignOutcomeCloseMs: 240,
  // Close animation for notification banners.
  notificationCloseMs: 120,
  // Delay that leaves an accepted negotiation visible before it closes.
  acceptedNegotiationCloseMs: 1150,
} as const;

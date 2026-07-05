import type React from 'react';

export interface PortraitLight {
  x: number;
  y: number;
  z: number;
}

export const DEFAULT_PORTRAIT_LIGHT = (() => {
  const x = -0.46;
  const y = -0.58;
  const z = 0.67;
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
})();

function normaliseLight(x: number, y: number, z: number): PortraitLight {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

export function portraitLightFromMouseEvent(event: React.MouseEvent<HTMLElement>): PortraitLight {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return DEFAULT_PORTRAIT_LIGHT;
  }

  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 1.44;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 1.44;
  return normaliseLight(x, y, 0.76);
}

export const EMPTY_RING_THRESHOLD = 0.001;

export function ringPoint(radius: number, angleDeg: number): { x: number; y: number } {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
}

export function ringArcPath(radius: number, startDeg: number, endDeg: number): string {
  const start = ringPoint(radius, startDeg);
  const end = ringPoint(radius, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${String(largeArc)} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

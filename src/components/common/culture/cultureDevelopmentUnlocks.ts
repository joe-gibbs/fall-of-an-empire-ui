export function cultureDevelopmentUnlockSlotPercent(index: number, count: number): number {
  return ((index + 0.5) / count) * 100;
}

export function cultureDevelopmentUnlockFillPercent(development: number, requirements: number[]): number {
  if (requirements.length === 0) return development;
  if (development <= 0) return 0;
  if (development >= 100) return 100;

  const points: Array<{ req: number; pos: number }> = [{ req: 0, pos: 0 }];
  for (let index = 0; index < requirements.length; index++) {
    points.push({
      req: requirements[index],
      pos: cultureDevelopmentUnlockSlotPercent(index, requirements.length),
    });
  }
  points.push({ req: 100, pos: 100 });

  let from = points[0];
  let to = points[points.length - 1];
  for (const point of points) {
    if (point.req <= development) from = point;
    if (point.req > development) {
      to = point;
      break;
    }
  }
  if (to.req === from.req) return from.pos;
  return from.pos + ((development - from.req) / (to.req - from.req)) * (to.pos - from.pos);
}

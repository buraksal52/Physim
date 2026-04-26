export function calculateImpulse(force: number, time: number) {
  return { impulse: force * time };
}

export function calculateImpulseFromMomentum(
  mass: number,
  v1: number,
  v2: number
) {
  const impulse = mass * (v2 - v1);
  const deltaV = v2 - v1;
  return { impulse, deltaV };
}

export function calculateImpulseFromGraph(
  points: { t: number; f: number }[]
): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].t - points[i - 1].t;
    const avgF = (points[i].f + points[i - 1].f) / 2;
    area += avgF * dt;
  }
  return area;
}

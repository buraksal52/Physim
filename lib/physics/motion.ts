export function calculateUniformMotion(v: number, t: number) {
  return { x: v * t };
}

export function calculateAcceleratedMotion(
  v0: number,
  a: number,
  t: number,
  x0 = 0
) {
  const v = v0 + a * t;
  const x = x0 + v0 * t + 0.5 * a * t * t;
  return { v, x };
}

export function calculateRelativeVelocity(vA: number, vB: number) {
  return { vAB: vA - vB, vBA: vB - vA };
}

export function getMotionGraphPoints(
  v0: number,
  a: number,
  duration: number,
  steps = 100
): { t: number; x: number; v: number }[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * duration;
    const { v, x } = calculateAcceleratedMotion(v0, a, t);
    return { t, v, x };
  });
}
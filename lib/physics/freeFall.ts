export interface FreeFallResult {
  t: number; // time in seconds
  v: number; // final velocity in m/s
  h: number; // height in m
}

/**
 * Calculate free fall time and final velocity for a given height.
 */
export function calculateFreeFall(h: number, g = 9.8): FreeFallResult {
  const t = Math.sqrt((2 * h) / g);
  const v = g * t;
  return { t, v, h };
}

/**
 * Calculate instantaneous position (distance fallen) at a given elapsed time.
 */
export function positionAtTime(elapsed: number, g = 9.8): number {
  return 0.5 * g * elapsed * elapsed;
}

/**
 * Calculate instantaneous velocity at a given elapsed time.
 */
export function velocityAtTime(elapsed: number, g = 9.8): number {
  return g * elapsed;
}

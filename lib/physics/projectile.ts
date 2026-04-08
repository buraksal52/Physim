export function calculateProjectile(h: number, v0: number, g = 9.8) {
  const t = Math.sqrt((2 * h) / g);
  const range = v0 * t;
  return { t, range, h, v0 };
}

export function getProjectilePosition(v0: number, h: number, elapsed: number, g = 9.8) {
  const x = v0 * elapsed;
  const y = h - 0.5 * g * elapsed * elapsed;
  return { x, y: Math.max(y, 0) };
}

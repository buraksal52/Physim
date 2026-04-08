export function calculateAngledThrow(v0: number, angleDeg: number, g = 9.8) {
  const theta = (angleDeg * Math.PI) / 180;
  const vx = v0 * Math.cos(theta);
  const vy = v0 * Math.sin(theta);
  const tTotal = (2 * vy) / g;
  const range = vx * tTotal;
  const hMax = (vy * vy) / (2 * g);
  return { vx, vy, tTotal, range, hMax };
}

export function getAngledThrowPosition(v0: number, angleDeg: number, elapsed: number, g = 9.8) {
  const theta = (angleDeg * Math.PI) / 180;
  const vx = v0 * Math.cos(theta);
  const vy = v0 * Math.sin(theta);
  const x = vx * elapsed;
  const y = vy * elapsed - 0.5 * g * elapsed * elapsed;
  const currentVy = vy - g * elapsed;
  return { x, y: Math.max(y, 0), currentVy };
}

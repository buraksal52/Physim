export function calculateDownwardThrow(h: number, v0: number, g = 9.8) {
  const t = (-v0 + Math.sqrt(v0 * v0 + 2 * g * h)) / g;
  const vFinal = v0 + g * t;
  return { t, vFinal, h, v0 };
}

export function getDownwardThrowPosition(h: number, v0: number, elapsed: number, g = 9.8) {
  const y = h - (v0 * elapsed + 0.5 * g * elapsed * elapsed);
  const v = v0 + g * elapsed;
  return { y: Math.max(y, 0), v };
}

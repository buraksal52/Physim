export function calculateVerticalThrow(v0: number, g = 9.8) {
  const tZirve = v0 / g;
  const hMax = (v0 * v0) / (2 * g);
  const tTotal = (2 * v0) / g;
  return { tZirve, hMax, tTotal };
}

export function getVerticalThrowPosition(v0: number, elapsed: number, g = 9.8) {
  const y = v0 * elapsed - 0.5 * g * elapsed * elapsed;
  const v = v0 - g * elapsed;
  return { y: Math.max(y, 0), v };
}

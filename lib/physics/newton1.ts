export function getNewton1Position(
  v0: number,
  friction: number,
  elapsed: number
) {
  const v = Math.max(v0 - friction * elapsed, 0);
  const x = v0 * elapsed - 0.5 * friction * elapsed * elapsed;
  return { x: Math.max(x, 0), v };
}

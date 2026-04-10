export function calculateNewton2(force: number, mass: number) {
  const a = force / mass;
  return { a };
}

export function getNewton2Position(force: number, mass: number, elapsed: number) {
  const a = force / mass;
  const v = a * elapsed;
  const x = 0.5 * a * elapsed * elapsed;
  return { x, v, a };
}

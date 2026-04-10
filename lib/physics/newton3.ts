export function calculateCollision(
  m1: number, v1: number,
  m2: number, v2: number,
  restitution = 1.0
) {
  const v1Final =
    ((m1 - restitution * m2) * v1 + (1 + restitution) * m2 * v2) / (m1 + m2);
  const v2Final =
    ((m2 - restitution * m1) * v2 + (1 + restitution) * m1 * v1) / (m1 + m2);
  return { v1Final, v2Final };
}

export function getImpactForce(
  m: number, vBefore: number, vAfter: number, dt = 0.1
) {
  return Math.abs(m * (vAfter - vBefore) / dt);
}

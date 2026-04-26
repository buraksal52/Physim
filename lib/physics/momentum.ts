export function calculateMomentum(mass: number, velocity: number) {
  return { p: mass * velocity };
}

export function calculateElasticCollision(
  m1: number, v1: number,
  m2: number, v2: number
) {
  const v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
  const v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
  const p1i = m1 * v1; const p2i = m2 * v2;
  const p1f = m1 * v1f; const p2f = m2 * v2f;
  const ek1i = 0.5 * m1 * v1 * v1; const ek2i = 0.5 * m2 * v2 * v2;
  const ek1f = 0.5 * m1 * v1f * v1f; const ek2f = 0.5 * m2 * v2f * v2f;
  return { v1f, v2f, totalPi: p1i + p2i, totalPf: p1f + p2f, totalEki: ek1i + ek2i, totalEkf: ek1f + ek2f };
}

export function calculateInelasticCollision(
  m1: number, v1: number,
  m2: number, v2: number
) {
  const vf = (m1 * v1 + m2 * v2) / (m1 + m2);
  const totalPi = m1 * v1 + m2 * v2;
  const totalPf = (m1 + m2) * vf;
  const totalEki = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  const totalEkf = 0.5 * (m1 + m2) * vf * vf;
  const lostEnergy = totalEki - totalEkf;
  return { vf, totalPi, totalPf, totalEki, totalEkf, lostEnergy };
}

export function calculate2DCollision(
  m1: number, v1: number, angle1Deg: number,
  m2: number, v2: number, angle2Deg: number
) {
  const a1 = (angle1Deg * Math.PI) / 180;
  const a2 = (angle2Deg * Math.PI) / 180;
  const p1x = m1 * v1 * Math.cos(a1); const p1y = m1 * v1 * Math.sin(a1);
  const p2x = m2 * v2 * Math.cos(a2); const p2y = m2 * v2 * Math.sin(a2);
  const totalPx = p1x + p2x; const totalPy = p1y + p2y;
  const totalMass = m1 + m2;
  const vfx = totalPx / totalMass; const vfy = totalPy / totalMass;
  const vf = Math.sqrt(vfx * vfx + vfy * vfy);
  const anglef = Math.atan2(vfy, vfx) * (180 / Math.PI);
  return { vfx, vfy, vf, anglef, totalPx, totalPy };
}
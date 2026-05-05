const G = 6.674e-11;

export function calculateGravitationalForce(
  m1: number,
  m2: number,
  r: number
) {
  return { F: (G * m1 * m2) / (r * r) };
}

export function calculateOrbitalVelocity(M: number, r: number) {
  return { v: Math.sqrt((G * M) / r) };
}

export function calculateEscapeVelocity(M: number, r: number) {
  return { v: Math.sqrt((2 * G * M) / r) };
}

export function calculateOrbitalPeriod(a: number, M: number) {
  return { T: 2 * Math.PI * Math.sqrt((a * a * a) / (G * M)) };
}

export function calculateKeplerRatio(a: number, M: number) {
  const T = 2 * Math.PI * Math.sqrt((a * a * a) / (G * M));
  return { T, ratio: (T * T) / (a * a * a) };
}

export function integrateOrbit(
  x: number, y: number,
  vx: number, vy: number,
  Mx: number, My: number,
  M: number,
  dt: number
) {
  const dx = Mx - x;
  const dy = My - y;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < 1e-6) return { x, y, vx, vy };
  // Using G=1 or scaled G for simulation often easier, but here we stay formal
  // For UI simulation, M usually represents GM/G or we use a virtual G
  const a = (G * M) / (r * r);
  const ax = a * (dx / r);
  const ay = a * (dy / r);
  
  // Leapfrog or simple Euler for simplicity in simulation
  const newVx = vx + ax * dt;
  const newVy = vy + ay * dt;
  return {
    x: x + newVx * dt,
    y: y + newVy * dt,
    vx: newVx,
    vy: newVy,
    r: r
  };
}

export function calculateSweptArea(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number
) {
  const ax = x1 - cx, ay = y1 - cy;
  const bx = x2 - cx, by = y2 - cy;
  return Math.abs(ax * by - ay * bx) / 2;
}

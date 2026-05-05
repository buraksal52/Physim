export function calculateAngularVelocity(T: number) {
  return { omega: (2 * Math.PI) / T };
}

export function calculateLinearVelocity(omega: number, r: number) {
  return { v: omega * r };
}

export function calculateCentripetalAcceleration(v: number, r: number) {
  return { ac: (v * v) / r };
}

export function calculateCentripetalForce(m: number, v: number, r: number) {
  return { Fc: (m * v * v) / r };
}

export function calculatePeriod(v: number, r: number) {
  return { T: (2 * Math.PI * r) / v };
}

export function getCircularPosition(
  cx: number,
  cy: number,
  r: number,
  omega: number,
  elapsed: number,
  startAngle = 0
) {
  const angle = startAngle + omega * elapsed;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const vx = -omega * r * Math.sin(angle);
  const vy = omega * r * Math.cos(angle);
  const ax = -omega * omega * r * Math.cos(angle);
  const ay = -omega * omega * r * Math.sin(angle);
  return { x, y, vx, vy, ax, ay, angle };
}

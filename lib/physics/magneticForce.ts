export function calculateLorentzForce(
  q: number,
  v: number,
  B: number,
  angleDeg = 90
) {
  const theta = (angleDeg * Math.PI) / 180;
  return { F: q * v * B * Math.sin(theta) };
}

export function calculateWireForce(
  B: number,
  I: number,
  L: number,
  angleDeg = 90
) {
  const theta = (angleDeg * Math.PI) / 180;
  return { F: B * I * L * Math.sin(theta) };
}

export function calculateCircularRadius(
  m: number,
  v: number,
  q: number,
  B: number
) {
  return { r: (m * v) / (Math.abs(q) * B) };
}

export function calculateCyclotronFrequency(q: number, B: number, m: number) {
  return { f: (Math.abs(q) * B) / (2 * Math.PI * m) };
}

export function getCircularOrbitPosition(
  cx: number,
  cy: number,
  r: number,
  omega: number,
  elapsed: number,
  startAngle = 0
) {
  const angle = startAngle + omega * elapsed;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
    angle
  };
}
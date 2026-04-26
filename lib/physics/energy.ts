export function calculateKineticEnergy(mass: number, velocity: number) {
  return { ek: 0.5 * mass * velocity * velocity };
}

export function calculatePotentialEnergy(mass: number, height: number, g = 9.8) {
  return { ep: mass * g * height };
}

export function calculateTotalEnergy(mass: number, velocity: number, height: number, g = 9.8) {
  const ek = 0.5 * mass * velocity * velocity;
  const ep = mass * g * height;
  return { ek, ep, total: ek + ep };
}

export function calculateVelocityFromHeight(height: number, g = 9.8) {
  return { v: Math.sqrt(2 * g * height) };
}

export function getPendulumPosition(
  length: number,
  angle0Deg: number,
  elapsed: number,
  g = 9.8
) {
  const angle0 = (angle0Deg * Math.PI) / 180;
  const omega = Math.sqrt(g / length);
  const angle = angle0 * Math.cos(omega * elapsed);
  const x = length * Math.sin(angle);
  const y = -length * Math.cos(angle);
  const height = length - length * Math.cos(angle);
  const v = Math.sqrt(2 * g * height);
  return { angle, x, y, height, v };
}
export function calculateMomentOfInertia(
  shape: "disk" | "ring" | "sphere" | "rod_center" | "rod_end",
  mass: number,
  radius: number
) {
  switch (shape) {
    case "disk": return { I: 0.5 * mass * radius * radius };
    case "ring": return { I: mass * radius * radius };
    case "sphere": return { I: (2 / 5) * mass * radius * radius };
    case "rod_center": return { I: (1 / 12) * mass * radius * radius };
    case "rod_end": return { I: (1 / 3) * mass * radius * radius };
  }
}

export function calculateAngularAcceleration(torque: number, I: number) {
  return { alpha: torque / I };
}

export function calculateAngularVelocityAfter(
  omega0: number,
  alpha: number,
  t: number
) {
  return { omega: omega0 + alpha * t };
}

export function calculateAngularMomentum(I: number, omega: number) {
  return { L: I * omega };
}

export function calculateRollingVelocity(
  shape: "disk" | "ring" | "sphere",
  mass: number,
  radius: number,
  height: number,
  g = 9.8
) {
  const { I } = calculateMomentOfInertia(shape, mass, radius);
  const factor = I / (mass * radius * radius);
  const v = Math.sqrt((2 * g * height) / (1 + factor));
  const omega = v / radius;
  return { v, omega, factor };
}

export function calculateRollingAcceleration(
  shape: "disk" | "ring" | "sphere",
  mass: number,
  radius: number,
  angleDeg: number,
  g = 9.8
) {
  const { I } = calculateMomentOfInertia(shape, mass, radius);
  const theta = (angleDeg * Math.PI) / 180;
  const a = (g * Math.sin(theta)) / (1 + I / (mass * radius * radius));
  return { a };
}

export function applyAngularMomentumConservation(
  I1: number,
  omega1: number,
  I2: number
) {
  const L = I1 * omega1;
  const omega2 = L / I2;
  return { L, omega2 };
}

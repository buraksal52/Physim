export function calculateSpringSystem(k: number, m: number) {
  const omega = Math.sqrt(k / m);
  const T = (2 * Math.PI) / omega;
  const f = 1 / T;
  return { omega, T, f };
}

export function getSpringPosition(
  A: number,
  omega: number,
  t: number,
  phi = 0,
  damping = 0,
  mass = 1
) {
  // x(t) = A * e^(-bt/2m) * cos(omega*t + phi)
  const envelope = Math.exp((-damping * t) / (2 * mass));
  const x = A * envelope * Math.cos(omega * t + phi);
  
  // Derivatives for V and A (simplified approx for UI)
  const v = -A * envelope * omega * Math.sin(omega * t + phi);
  const a = -A * envelope * omega * omega * Math.cos(omega * t + phi);
  
  return { x, v, a, envelope };
}

export function calculateSpringEnergy(k: number, m: number, x: number, v: number) {
  const Ep = 0.5 * k * x * x;
  const Ek = 0.5 * m * v * v;
  return { Ep, Ek, total: Ep + Ek };
}

export function getSpringGraphPoints(
  A: number,
  omega: number,
  cycles = 3,
  steps = 300
) {
  const T = (2 * Math.PI) / omega;
  const duration = cycles * T;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * duration;
    const { x, v, a } = getSpringPosition(A, omega, t);
    return { t, x, v, a };
  });
}

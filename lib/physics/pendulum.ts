export function calculatePendulumSystem(L: number, g = 9.8) {
  const omega = Math.sqrt(g / L);
  const T = (2 * Math.PI) / omega;
  const f = 1 / T;
  return { omega, T, f };
}

export function getPendulumAngle(
  theta0Deg: number,
  omega: number,
  t: number,
  damping = 0,
  m = 1
) {
  const theta0 = (theta0Deg * Math.PI) / 180;
  // Approximation for damping: decay envelope
  const envelope = Math.exp((-damping * t) / (2 * m));
  const theta = theta0 * envelope * Math.cos(omega * t);
  const thetaDot = -theta0 * envelope * omega * Math.sin(omega * t);
  return { theta, thetaDot, thetaDeg: theta * (180 / Math.PI), envelope };
}

export function getPendulumCartesian(
  pivotX: number,
  pivotY: number,
  L: number,
  theta: number
) {
  const x = pivotX + L * Math.sin(theta);
  const y = pivotY + L * Math.cos(theta);
  return { x, y };
}

export function getPendulumEnergy(
  m: number,
  L: number,
  theta: number,
  thetaDot: number,
  g = 9.8
) {
  const h = L * (1 - Math.cos(theta));
  const Ep = m * g * h;
  // v = L * theta_dot
  const v = L * thetaDot;
  const Ek = 0.5 * m * v * v;
  return { Ep, Ek, total: Ep + Ek, h, v };
}

export function getPendulumGraphPoints(
  theta0Deg: number,
  omega: number,
  cycles = 3,
  steps = 300
) {
  const T = (2 * Math.PI) / omega;
  const duration = cycles * T;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * duration;
    const { theta, thetaDot, thetaDeg } = getPendulumAngle(theta0Deg, omega, t);
    return { t, theta, thetaDot, thetaDeg };
  });
}

/**
 * Elliptic integral approximation for true period of a pendulum
 * T = T_bhh * (1 + (1/16)theta_0^2 + (11/3072)theta_0^4 + ...)
 * @param T_bhh Period from small-angle approximation
 * @param theta0Deg Initial angle in degrees
 */
export function getTruePeriod(T_bhh: number, theta0Deg: number): number {
  const rad = (theta0Deg * Math.PI) / 180;
  return T_bhh * (1 + (1/16) * rad * rad);
}

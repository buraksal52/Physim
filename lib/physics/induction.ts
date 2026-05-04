export function calculateFaradayEMF(
  N: number,
  deltaPhi: number,
  deltaT: number
) {
  return { emf: -N * (deltaPhi / deltaT), magnitude: Math.abs(N * (deltaPhi / deltaT)) };
}

export function calculateMagneticFlux(
  B: number,
  A: number,
  angleDeg: number
) {
  const theta = (angleDeg * Math.PI) / 180;
  return { phi: B * A * Math.cos(theta) };
}

export function calculateMotionalEMF(B: number, L: number, v: number) {
  return { emf: B * L * v };
}

export function calculateSelfInductionEMF(
  L: number,
  deltaI: number,
  deltaT: number
) {
  return { emf: -L * (deltaI / deltaT) };
}

export function getFluxOverTime(
  B0: number,
  A: number,
  omega: number,
  elapsed: number
) {
  const phi = B0 * A * Math.cos(omega * elapsed);
  const emf = B0 * A * omega * Math.sin(omega * elapsed);
  return { phi, emf };
}

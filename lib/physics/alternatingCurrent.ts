export function calculateRMS(peak: number) {
  return { rms: peak / Math.sqrt(2) };
}

export function calculatePeak(rms: number) {
  return { peak: rms * Math.sqrt(2) };
}

export function calculateAngularFrequency(f: number) {
  return { omega: 2 * Math.PI * f };
}

export function calculatePeriod(f: number) {
  return { T: 1 / f };
}

export function getInstantaneousVoltage(
  V0: number,
  omega: number,
  t: number,
  phiDeg = 0
) {
  const phi = (phiDeg * Math.PI) / 180;
  return { v: V0 * Math.sin(omega * t + phi) };
}

export function calculateActivePower(
  Vrms: number,
  Irms: number,
  phiDeg: number
) {
  const phi = (phiDeg * Math.PI) / 180;
  return { P: Vrms * Irms * Math.cos(phi) };
}

export function getACWavePoints(
  V0: number,
  f: number,
  phiDeg = 0,
  cycles = 3,
  steps = 300
) {
  const omega = 2 * Math.PI * f;
  const duration = cycles / f;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * duration;
    const { v } = getInstantaneousVoltage(V0, omega, t, phiDeg);
    return { t, v };
  });
}

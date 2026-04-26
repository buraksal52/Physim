const epsilon0 = 8.854e-12;

export function calculateCapacitance(charge: number, voltage: number) {
  return { C: charge / voltage };
}

export function calculateParallelPlateCapacitance(
  area: number,
  distance: number,
  dielectric = 1
) {
  return { C: dielectric * epsilon0 * (area / distance) };
}

export function calculateElectricField(voltage: number, distance: number) {
  return { E: voltage / distance };
}

export function calculateStoredEnergy(C: number, V: number) {
  return { U: 0.5 * C * V * V };
}

export function calculateCharge(C: number, V: number) {
  return { Q: C * V };
}

export function calculateSeriesCapacitance(capacitances: number[]) {
  const reciprocal = capacitances.reduce((s, c) => s + 1 / c, 0);
  return { Ceq: 1 / reciprocal };
}

export function calculateParallelCapacitance(capacitances: number[]) {
  return { Ceq: capacitances.reduce((s, c) => s + c, 0) };
}

export function getChargingCurve(
  C: number,
  R: number,
  Vmax: number,
  steps = 100
) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * 5 * R * C;
    const q = C * Vmax * (1 - Math.exp(-t / (R * C)));
    const v = q / C;
    return { t, q, v };
  });
}

export function getDischargeCurve(
  C: number,
  R: number,
  Q0: number,
  steps = 100
) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * 5 * R * C;
    const q = Q0 * Math.exp(-t / (R * C));
    const v = q / C;
    return { t, q, v };
  });
}
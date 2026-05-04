export function calculateTransformer(
  V1: number,
  N1: number,
  N2: number,
  I1: number,
  efficiency = 1
) {
  const V2 = V1 * (N2 / N1);
  const I2ideal = I1 * (N1 / N2);
  const P1 = V1 * I1;
  const P2 = P1 * efficiency;
  const I2actual = efficiency > 0 ? P2 / V2 : 0;
  const turnsRatio = N1 / N2;
  return { V2, I2ideal, I2actual, P1, P2, turnsRatio };
}

export function getTransformerType(N1: number, N2: number) {
  if (N2 > N1) return "step-up";
  if (N2 < N1) return "step-down";
  return "isolation";
}

export function calculateTransmissionLoss(
  power: number,
  voltage: number,
  resistance: number
) {
  const current = power / voltage;
  const loss = current * current * resistance;
  const efficiency = ((power - loss) / power) * 100;
  return { current, loss, efficiency };
}

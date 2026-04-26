export function calculateGearSystem(
  driverTeeth: number,
  drivenTeeth: number,
  driverRpm: number,
  driverTorque: number
) {
  const gearRatio = driverTeeth / drivenTeeth;
  const drivenRpm = driverRpm * gearRatio;
  const drivenTorque = driverTorque / gearRatio;
  return { gearRatio, drivenRpm, drivenTorque };
}

export function getGearAngle(
  rpm: number,
  elapsedSeconds: number
): number {
  return (rpm / 60) * elapsedSeconds * 2 * Math.PI;
}
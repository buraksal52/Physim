export function calculatePower(work: number, time: number) {
  return { power: work / time };
}

export function calculatePowerFromForce(force: number, velocity: number) {
  return { power: force * velocity };
}

export function calculateLiftPower(
  mass: number,
  height: number,
  time: number,
  g = 9.8
) {
  const work = mass * g * height;
  const power = work / time;
  return { work, power };
}

export function calculateEfficiency(
  usefulPower: number,
  inputPower: number
) {
  return { efficiency: (usefulPower / inputPower) * 100 };
}
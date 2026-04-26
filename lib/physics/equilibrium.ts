export function checkEquilibrium(
  forces: { fx: number; fy: number }[],
  torques: { value: number; direction: 1 | -1 }[]
) {
  const netFx = forces.reduce((s, f) => s + f.fx, 0);
  const netFy = forces.reduce((s, f) => s + f.fy, 0);
  const netTorque = torques.reduce((s, t) => s + t.value * t.direction, 0);
  const isEquilibrium = Math.abs(netFx) < 0.5 && Math.abs(netFy) < 0.5 && Math.abs(netTorque) < 1;
  return { netFx, netFy, netTorque, isEquilibrium };
}

export function calculateSeesawBalance(
  f1: number, d1: number,
  f2: number, d2: number
) {
  const torque1 = f1 * d1;
  const torque2 = f2 * d2;
  const netTorque = torque1 - torque2;
  return { torque1, torque2, netTorque, isBalanced: Math.abs(netTorque) < 1 };
}

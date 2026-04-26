export function calculateTorque(force: number, distance: number, angleDeg: number) {
  const theta = (angleDeg * Math.PI) / 180;
  return { torque: force * distance * Math.sin(theta) };
}

export function calculateNetTorque(torques: { value: number; direction: 1 | -1 }[]) {
  const net = torques.reduce((sum, t) => sum + t.value * t.direction, 0);
  return { net };
}

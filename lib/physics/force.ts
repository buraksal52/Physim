export function calculateResultantForce(forces: { fx: number; fy: number }[]) {
  const fx = forces.reduce((sum, f) => sum + f.fx, 0);
  const fy = forces.reduce((sum, f) => sum + f.fy, 0);
  const magnitude = Math.sqrt(fx * fx + fy * fy);
  const angle = Math.atan2(fy, fx) * (180 / Math.PI);
  return { fx, fy, magnitude, angle };
}

export function calculateInclinedPlane(mass: number, angleDeg: number, g = 9.8) {
  const theta = (angleDeg * Math.PI) / 180;
  const parallel = mass * g * Math.sin(theta);
  const normal = mass * g * Math.cos(theta);
  return { parallel, normal };
}

export function calculateSpringForce(k: number, x: number) {
  return { force: k * x };
}

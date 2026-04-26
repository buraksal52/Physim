export function calculateInclinedPlane(
  mass: number,
  angleDeg: number,
  friction: number = 0,
  g = 9.8
) {
  const theta = (angleDeg * Math.PI) / 180;
  const weight = mass * g;
  const normal = weight * Math.cos(theta);
  const parallel = weight * Math.sin(theta);
  const frictionForce = friction * normal;
  const effort = parallel + frictionForce;
  const mechanicalAdvantage = weight / effort;
  const efficiency = friction === 0 ? 100 : (Math.tan(theta) / (Math.tan(theta) + friction)) * 100;
  return { weight, normal, parallel, frictionForce, effort, mechanicalAdvantage, efficiency };
}
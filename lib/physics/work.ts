export function calculateWork(
  force: number,
  distance: number,
  angleDeg: number
) {
  const theta = (angleDeg * Math.PI) / 180;
  const work = force * distance * Math.cos(theta);
  return { work };
}

export function calculateWorkFromGraph(
  points: { x: number; f: number }[]
): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const avgF = (points[i].f + points[i - 1].f) / 2;
    area += avgF * dx;
  }
  return area;
}
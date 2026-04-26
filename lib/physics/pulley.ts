export function calculatePulley(load: number, movablePulleys: number) {
  const ropeSegments = movablePulleys * 2;
  const effort = movablePulleys === 0 ? load : load / ropeSegments;
  const mechanicalAdvantage = movablePulleys === 0 ? 1 : ropeSegments;
  return { effort, mechanicalAdvantage, ropeSegments };
}
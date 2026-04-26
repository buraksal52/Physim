export function calculateLever(
  effortArm: number,
  loadArm: number,
  load: number
) {
  const effort = (load * loadArm) / effortArm;
  const mechanicalAdvantage = load / effort;
  return { effort, mechanicalAdvantage };
}

export function getLeverClass(
  fulcrumPos: number,
  effortPos: number,
  loadPos: number
): 1 | 2 | 3 {
  if (fulcrumPos < Math.min(effortPos, loadPos) || fulcrumPos > Math.max(effortPos, loadPos)) {
    return effortPos < loadPos ? 2 : 3;
  }
  return 1;
}
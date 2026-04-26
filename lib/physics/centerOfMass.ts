export function calculateCenterOfMass(
  masses: { m: number; x: number; y: number }[]
) {
  const totalMass = masses.reduce((s, p) => s + p.m, 0);
  if (totalMass === 0) return { xcm: 0, ycm: 0, totalMass: 0 };
  const xcm = masses.reduce((s, p) => s + p.m * p.x, 0) / totalMass;
  const ycm = masses.reduce((s, p) => s + p.m * p.y, 0) / totalMass;
  return { xcm, ycm, totalMass };
}

export function calculateShapeCenterOfMass(
  shapes: { m: number; xcm: number; ycm: number }[]
) {
  return calculateCenterOfMass(
    shapes.map((s) => ({ m: s.m, x: s.xcm, y: s.ycm }))
  );
}
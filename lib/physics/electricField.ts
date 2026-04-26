const k = 9e9;

export function calculateElectricField(Q: number, r: number) {
  if (r === 0) return { E: Infinity };
  return { E: (k * Math.abs(Q)) / (r * r) };
}

export function calculateFieldAtPoint(
  charges: { q: number; x: number; y: number }[],
  px: number,
  py: number
) {
  let Ex = 0, Ey = 0;
  for (const charge of charges) {
    const dx = px - charge.x;
    const dy = py - charge.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1e-6) continue;
    const r = Math.sqrt(r2);
    const E = (k * charge.q) / r2;
    Ex += E * (dx / r);
    Ey += E * (dy / r);
  }
  return { Ex, Ey, magnitude: Math.sqrt(Ex * Ex + Ey * Ey) };
}

export function calculateParallelPlateField(voltage: number, distance: number) {
  return { E: voltage / distance };
}
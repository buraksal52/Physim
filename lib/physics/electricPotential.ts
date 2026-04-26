const k = 9e9;

export function calculatePotential(Q: number, r: number) {
  if (r === 0) return { V: Infinity };
  return { V: (k * Q) / r };
}

export function calculatePotentialAtPoint(
  charges: { q: number; x: number; y: number }[],
  px: number,
  py: number
) {
  let V = 0;
  for (const charge of charges) {
    const dx = px - charge.x;
    const dy = py - charge.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1e-6) continue;
    V += (k * charge.q) / r;
  }
  return { V };
}

export function calculatePotentialEnergy(q: number, V: number) {
  return { U: q * V };
}

export function calculateWork(q: number, Va: number, Vb: number) {
  return { W: q * (Vb - Va) };
}
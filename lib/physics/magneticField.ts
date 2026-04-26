const mu0 = 4 * Math.PI * 1e-7;

export function calculateStraightWireField(I: number, r: number) {
  if (r === 0) return { B: Infinity };
  return { B: (mu0 * I) / (2 * Math.PI * r) };
}

export function calculateSolenoidField(N: number, L: number, I: number) {
  const n = N / L;
  return { B: mu0 * n * I, n };
}

export function calculateFieldAtPoint(
  wires: { x: number; y: number; I: number }[],
  px: number,
  py: number
) {
  let Bx = 0, By = 0;
  for (const wire of wires) {
    const dx = px - wire.x;
    const dy = py - wire.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1e-6) continue;
    const r = Math.sqrt(r2);
    const B = (mu0 * wire.I) / (2 * Math.PI * r);
    Bx += B * (dy / r) * (wire.I > 0 ? -1 : 1);
    By += B * (dx / r) * (wire.I > 0 ? 1 : -1);
  }
  return { Bx, By, magnitude: Math.sqrt(Bx * Bx + By * By) };
}
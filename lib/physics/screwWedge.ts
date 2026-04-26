export function calculateScrew(
  pitch: number,
  armLength: number
) {
  const mechanicalAdvantage = (2 * Math.PI * armLength) / pitch;
  return { mechanicalAdvantage };
}

export function calculateScrewAdvancement(turns: number, pitch: number) {
  return { distance: turns * pitch };
}

export function calculateWedge(length: number, thickness: number) {
  const mechanicalAdvantage = length / thickness;
  return { mechanicalAdvantage };
}
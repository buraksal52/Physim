// Shape stored in localStorage under key "physicslab_progress"
type Progress = {
  [topicSlug: string]: {
    zorunlu_deney: boolean;
  };
};

const STORAGE_KEY = "physicslab_progress";

export function getProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Progress;
  } catch {
    return {};
  }
}

export function markDeneyComplete(slug: string): void {
  const progress = getProgress();
  progress[slug] = { zorunlu_deney: true };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function isDeneyComplete(slug: string): boolean {
  const progress = getProgress();
  return progress[slug]?.zorunlu_deney === true;
}

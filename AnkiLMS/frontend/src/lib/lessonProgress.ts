const PROGRESS_KEY = "haechivn_learning_progress_v1";

type Progress = Record<string, Record<string, number[]>>;

function getProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return value && typeof value === "object" ? value as Progress : {};
  } catch {
    return {};
  }
}

function getProgressOwner(): string {
  try {
    const user = JSON.parse(localStorage.getItem("haechivn_user_profile") || "null");
    return typeof user?.id === "string" ? user.id : "guest";
  } catch {
    return "guest";
  }
}

export function loadLessonProgress(moduleName: "dictation" | "shadowing", lessonId: string): number[] {
  const stored = getProgress()[getProgressOwner()]?.[`${moduleName}:${lessonId}`];
  return Array.isArray(stored) ? stored.filter((id) => Number.isInteger(id)) : [];
}

export function saveLessonProgress(moduleName: "dictation" | "shadowing", lessonId: string, segmentIds: number[]): void {
  if (typeof window === "undefined") return;
  const progress = getProgress();
  const owner = getProgressOwner();
  progress[owner] = { ...progress[owner], [`${moduleName}:${lessonId}`]: segmentIds };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Learning continues if browser storage is unavailable or full.
  }
}

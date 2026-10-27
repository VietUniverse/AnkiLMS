export const STUDY_RANKS = ["Sơ cấp 1", "Sơ cấp 2", "Trung cấp 1", "Trung cấp 2", "Cao cấp 1", "Cao cấp 2"] as const;

/** XP-backed account levels currently advance every 300 XP. Five account levels form each named rank. */
export function getStudyRank(level: number | null | undefined): string {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return STUDY_RANKS[Math.min(STUDY_RANKS.length - 1, Math.floor((safeLevel - 1) / 5))];
}

export function getCourseRank(topikLevel: number): string {
  return STUDY_RANKS[Math.min(STUDY_RANKS.length - 1, Math.max(0, Math.floor(topikLevel) - 1))];
}

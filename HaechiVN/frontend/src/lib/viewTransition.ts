/** Tên View Transition dùng chung giữa card ở /explore và header ở /explore/[id]. */
export function deckTransitionName(id: string): string {
  return `vt-deck-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

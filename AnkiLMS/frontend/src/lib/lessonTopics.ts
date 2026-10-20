const TOPIC_KEYWORDS: Record<string, string[]> = {
  "#tàu_điện_ngầm": ["tau dien ngam"],
  "#du_lịch": ["tham quan", "di chuyen"],
  "#cung_điện": ["hoang cung", "gyeongbokgung"],
  "#giao_tiếp": ["giao tiep", "드라마 연습", "팬 인터뷰"],
  "#ăn_uống": ["an uong"],
  "#mua_sắm": ["mua sam"],
};

export const KOREAN_LESSON_TOPICS = ["#all", ...Object.keys(TOPIC_KEYWORDS)];

function searchText(value: string): string {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export function matchesLessonTopic(title: string, topic: string): boolean {
  if (topic === "#all") return true;
  const keywords = TOPIC_KEYWORDS[topic];
  if (!keywords) return false;
  const normalizedTitle = searchText(title);
  return keywords.some((keyword) => normalizedTitle.includes(searchText(keyword)));
}

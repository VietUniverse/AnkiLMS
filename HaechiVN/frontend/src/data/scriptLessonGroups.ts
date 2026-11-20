export type ScriptLessonGroup = {
  id: string;
  title: string;
  description: string;
  icon: string;
  matches: (lesson: any) => boolean;
};

const titleOf = (lesson: any) => `${lesson?.title || ""} ${lesson?.sourceTitle || ""}`.toLowerCase();

// Keep the catalog organized by the actual series/source instead of presenting
// every personal-script video under one generic heading.
export const SCRIPT_LESSON_GROUPS: ScriptLessonGroup[] = [
  {
    id: "netflix",
    title: "Netflix · Phim và series",
    description: "Trailer và trích đoạn từ nội dung Netflix",
    icon: "🎬",
    matches: (lesson) => /netflix|넷플릭스/.test(titleOf(lesson)),
  },
  {
    id: "learn-korean-conversation",
    title: "Learn Korean Conversation · PopPopping Korean",
    description: "Hội thoại hoạt hình theo tình huống hằng ngày",
    icon: "💬",
    matches: (lesson) => /learn korean conversation|poppopping/.test(titleOf(lesson)),
  },
  {
    id: "sejong",
    title: "Sejong Korean · Hội thoại theo giáo trình",
    description: "Mẫu hội thoại từ giáo trình Sejong Hakdang",
    icon: "📘",
    matches: (lesson) => /세종한국어|sejong/.test(titleOf(lesson)),
  },
  {
    id: "current-affairs",
    title: "Thời sự · SBS và VideoMug",
    description: "Phóng sự xã hội và bản tin tiếng Hàn",
    icon: "📰",
    matches: (lesson) => /sbs|뉴스|비디오머그|videomug/.test(titleOf(lesson)),
  },
  {
    id: "knowledge",
    title: "Kiến thức · 사물궁이",
    description: "Giải thích khoa học và những câu hỏi đời sống",
    icon: "🧠",
    matches: (lesson) => /사물궁이|시간은 거꾸로|눈 색깔/.test(titleOf(lesson)),
  },
  {
    id: "life-tips",
    title: "Mẹo đời sống · 1분미만",
    description: "Công nghệ và mẹo hữu ích trong cuộc sống",
    icon: "💡",
    matches: (lesson) => /1분미만|통신사|빨리 받아가/.test(titleOf(lesson)),
  },
  {
    id: "korean-series",
    title: "Phim bộ Hàn Quốc",
    description: "Cảnh phim và hội thoại trong phim truyền hình",
    icon: "🎭",
    matches: (lesson) => /모범택시|빈센조|신병/.test(titleOf(lesson)),
  },
  {
    id: "animation-entertainment",
    title: "Hoạt hình · Giải trí",
    description: "Hoạt hình, nội dung vui và video giải trí",
    icon: "✨",
    matches: (lesson) => /루피|빵빵이|짤툰|애니|animation/.test(titleOf(lesson)),
  },
  {
    id: "trailers-other",
    title: "Trailer · Video khác",
    description: "Các video có lời thoại tiếng Hàn theo timeline",
    icon: "📺",
    matches: () => true,
  },
];

export function getScriptLessonGroupId(lesson: any): string {
  return SCRIPT_LESSON_GROUPS.find((group) => group.id !== "trailers-other" && group.matches(lesson))?.id
    || "trailers-other";
}

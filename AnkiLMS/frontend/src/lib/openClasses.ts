// Lớp mở theo cấp độ: khách học thử vài từ đầu, muốn học tiếp thì đăng nhập để vào lớp.
// Dùng chung cho trang /classes và API /api/classes (action "join_open").
// Từ vựng mỗi lớp nằm ở src/data/openClassWords.ts (chỉ server dùng) và openClassTrial.ts (phần học thử).

export const OPEN_CLASSES = [
  { key: "so-cap-1", title: "Sơ cấp 1", description: "Bắt đầu từ con số 0: từ vựng nền tảng cho chào hỏi, gia đình, đồ vật quanh mình." },
  { key: "so-cap-2", title: "Sơ cấp 2", description: "Mở rộng vốn từ sơ cấp để nói chuyện hằng ngày và đọc câu ngắn." },
  { key: "trung-cap-1", title: "Trung cấp 1", description: "Từ vựng trung cấp cho học tập, công việc và đời sống ở Hàn." },
  { key: "trung-cap-2", title: "Trung cấp 2", description: "Củng cố trung cấp, chuẩn bị cho TOPIK II." },
  { key: "cao-cap-1", title: "Cao cấp 1", description: "Từ vựng cao cấp cho báo chí, xã hội và bài viết dài." },
  { key: "cao-cap-2", title: "Cao cấp 2", description: "Hoàn thiện cao cấp, hướng tới TOPIK 5–6." },
] as const;

export type OpenClass = (typeof OPEN_CLASSES)[number];
export type OpenClassKey = OpenClass["key"];

/** Số từ mỗi bài trong lớp mở (mỗi bài là một bài tập của lớp). */
export const OPEN_CLASS_LESSON_SIZE = 50;

export function openClassId(key: OpenClassKey): string {
  return `cls_open_${key}`;
}

export function findOpenClass(key: unknown): OpenClass | undefined {
  return OPEN_CLASSES.find((item) => item.key === key);
}

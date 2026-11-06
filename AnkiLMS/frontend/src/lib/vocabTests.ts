import type { TestCard, TestConfig } from "./vocabTest";

export type VocabTestDef = {
  slug: string;
  resultKey: string;
  shortName: string;
  hubDescription: string;
  title: string;
  sourceName: string;
  minutes: number;
  dataUrl: string;
  toCards: (json: unknown) => TestCard[];
  config: TestConfig;
  lessonLabel: (lesson: string) => string;
  verdicts: { pass: { title: string; text: string }; almost: { title: string; text: string }; fail: { title: string; text: string } };
  passCta: { href: string; label: string };
  failCta: { href: string; label: string };
};

const lessonNumber = (lesson: string) => Number(lesson.match(/^0?(\d+)\./)?.[1] ?? 0);

export const SEOUL_1A_TEST: VocabTestDef = {
  slug: "seoul-1a",
  resultKey: "haechivn_seoul1a_result",
  shortName: "Seoul 1A",
  hubDescription: "Đủ vốn từ để học 1B chưa? Lấy từ bài 1 đến 8 của 서울대 한국어 플러스 1A.",
  title: "Bạn đủ vốn từ để học 1B chưa?",
  sourceName: "서울대 한국어 플러스 1A (bài 1–8)",
  minutes: 7,
  dataUrl: "/api/learning-data?name=seoul-1a.json",
  toCards: (json) => (json as { cards: TestCard[] }).cards,
  config: { total: 60, minPerLesson: 5, maxPerLesson: 12, minLesson: 1, maxLesson: 8 },
  lessonLabel: (lesson) => {
    const m = lesson.match(/^0?(\d+)\.\s*(.+)$/);
    return m ? `Bài ${m[1]}: ${m[2]}` : lesson;
  },
  verdicts: {
    pass: { title: "Đủ vốn từ để học 1B", text: "Bạn nắm vững từ vựng 1A. Có thể học tiếp 1B." },
    almost: { title: "Gần đạt", text: "Bạn biết phần lớn từ vựng 1A. Ôn lại các bài còn yếu rồi làm lại." },
    fail: { title: "Chưa đạt", text: "Hãy học bộ 1A trước, rồi quay lại làm bài này." },
  },
  passCta: { href: "/explore", label: "Chọn bộ tiếp theo" },
  failCta: { href: "/explore/seoul-1a", label: "Học bộ 1A" },
};

export const THTH_1_TEST: VocabTestDef = {
  slug: "thth-1",
  resultKey: "haechivn_thth1_result",
  shortName: "Tiếng Hàn Tổng Hợp 1",
  hubDescription: "Bạn đã pass quyển 1 chưa? Lấy từ 15 bài của Tiếng Hàn Tổng Hợp 1.",
  title: "Bạn đã pass Tiếng Hàn Tổng Hợp 1 chưa?",
  sourceName: "Tiếng Hàn Tổng Hợp quyển 1 (bài 1–15)",
  minutes: 9,
  dataUrl: "/api/learning-data?name=thth-1.json",
  toCards: (json) => (json as [number, string, string][]).map(([lesson, korean, vietnamese]) => ({
    koreanText: korean,
    vietnameseMeaning: vietnamese,
    tags: ["", "", `${String(lesson).padStart(2, "0")}. Bài ${lesson}`],
  })),
  config: { total: 80, minPerLesson: 3, maxPerLesson: 12, minLesson: 1, maxLesson: 15 },
  lessonLabel: (lesson) => `Bài ${lessonNumber(lesson)}`,
  verdicts: {
    pass: { title: "Bạn đã pass quyển 1", text: "Bạn nắm vững từ vựng quyển 1. Có thể học tiếp quyển 2." },
    almost: { title: "Gần đạt", text: "Bạn biết phần lớn từ vựng quyển 1. Ôn lại các bài còn yếu rồi làm lại." },
    fail: { title: "Chưa đạt", text: "Hãy học Tiếng Hàn Tổng Hợp 1 trước, rồi quay lại làm bài này." },
  },
  passCta: { href: "/flashcards", label: "Học tiếp quyển 2" },
  failCta: { href: "/flashcards", label: "Học Tiếng Hàn Tổng Hợp 1" },
};

export const THTH_1_5_TEST: VocabTestDef = {
  ...THTH_1_TEST,
  slug: "thth-1-5",
  resultKey: "haechivn_thth1_5_result",
  shortName: "Tiếng Hàn Tổng Hợp 1 (bài 1–5)",
  hubDescription: "Đã chắc 5 bài đầu chưa? Lấy từ bài 1 đến 5 của Tiếng Hàn Tổng Hợp 1.",
  title: "Bạn đã nắm bài 1–5 Tiếng Hàn Tổng Hợp 1 chưa?",
  sourceName: "Tiếng Hàn Tổng Hợp quyển 1 (bài 1–5)",
  minutes: 6,
  config: { total: 50, minPerLesson: 5, maxPerLesson: 12, minLesson: 1, maxLesson: 5 },
  verdicts: {
    pass: { title: "Bạn đã nắm bài 1–5", text: "Bạn nắm vững từ vựng bài 1–5. Có thể học tiếp bài 6." },
    almost: { title: "Gần đạt", text: "Bạn biết phần lớn từ vựng bài 1–5. Ôn lại các bài còn yếu rồi làm lại." },
    fail: { title: "Chưa đạt", text: "Hãy ôn bài 1–5 Tiếng Hàn Tổng Hợp 1, rồi quay lại làm bài này." },
  },
  passCta: { href: "/flashcards", label: "Học tiếp bài 6" },
};

export const VOCAB_TESTS = [SEOUL_1A_TEST, THTH_1_TEST, THTH_1_5_TEST];

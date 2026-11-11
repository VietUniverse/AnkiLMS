"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Filter,
  GraduationCap,
  Layers,
  ListChecks,
  Lock,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  Volume2,
} from "lucide-react";

export type BookSlug = "so-cap-1" | "so-cap-2" | "trung-cap-3" | "trung-cap-4" | "cao-cap-5" | "cao-cap-6";

export type LessonKind = "hangul" | "lesson" | "review" | "exam";

export interface CurriculumLesson {
  id: string;
  num: string;
  kind: LessonKind;
  ko: string;
  vi: string;
  grammar?: string;
  pages: number;
  exercisePages?: number;
  available: boolean;
  unitGroup: string;
}

export interface CurriculumBook {
  id: BookSlug;
  volumeNumber: number;
  code: string;
  title: string;
  koTitle: string;
  levelBadge: string;
  topikTarget: string;
  status: "ready" | "upcoming";
  statusLabel: string;
  summary: string;
  highlights: string[];
  accentGrad: string;
  accentBadge: string;
  lessons: CurriculumLesson[];
}

export const SACH_BOOKS: CurriculumBook[] = [
  {
    id: "so-cap-1",
    volumeNumber: 1,
    code: "QUYỂN 1",
    title: "Sơ cấp 1",
    koTitle: "초급 1",
    levelBadge: "Sơ cấp · TOPIK I (Cấp 1)",
    topikTarget: "TOPIK I · 800+ từ vựng nền tảng",
    status: "ready",
    statusLabel: "Đủ 25 bài · Sẵn sàng học",
    summary:
      "5 bài bảng chữ cái Hangul, 15 bài giao tiếp theo chủ đề đời sống, 4 bài ôn tập tổng hợp và 1 đề thi thử TOPIK I có chấm điểm trực tiếp.",
    highlights: ["20 bài giáo trình", "19 sách bài tập", "4 bài ôn tập", "1 đề thi thử TOPIK"],
    accentGrad: "from-sky-500/20 via-cyan-500/10 to-transparent",
    accentBadge: "border-sky-500/35 bg-sky-500/15 text-sky-400",
    lessons: [
      {
        id: "bai-01",
        num: "01",
        kind: "hangul",
        ko: "모음",
        vi: "Nguyên âm",
        grammar: "10 nguyên âm cơ bản · 11 nguyên âm ghép · Cách viết & phát âm chuẩn",
        pages: 9,
        exercisePages: 3,
        available: true,
        unitGroup: "Phần 1 · Bảng chữ cái Hangul (Bài 1–5)",
      },
      {
        id: "bai-02",
        num: "02",
        kind: "hangul",
        ko: "기본 자음",
        vi: "Phụ âm cơ bản",
        grammar: "14 phụ âm cơ bản · Ghép âm tiết CV & CVC",
        pages: 7,
        exercisePages: 5,
        available: true,
        unitGroup: "Phần 1 · Bảng chữ cái Hangul (Bài 1–5)",
      },
      {
        id: "bai-03",
        num: "03",
        kind: "hangul",
        ko: "격음과 경음",
        vi: "Phụ âm bật hơi và phụ âm căng",
        grammar: "Phụ âm bật hơi (ㅋ, ㅌ, ㅍ, ㅊ) · Phụ âm căng (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)",
        pages: 8,
        exercisePages: 4,
        available: true,
        unitGroup: "Phần 1 · Bảng chữ cái Hangul (Bài 1–5)",
      },
      {
        id: "bai-04",
        num: "04",
        kind: "hangul",
        ko: "받침",
        vi: "Patchim (phụ âm cuối)",
        grammar: "7 nhóm âm cuối đại diện · Quy tắc thu âm cuối âm tiết",
        pages: 8,
        exercisePages: 4,
        available: true,
        unitGroup: "Phần 1 · Bảng chữ cái Hangul (Bài 1–5)",
      },
      {
        id: "bai-05",
        num: "05",
        kind: "hangul",
        ko: "연음과 교실 표현",
        vi: "Nối âm và biểu hiện trong lớp học",
        grammar: "Quy tắc nối âm (연음) · Các câu giao tiếp cửa miệng trong lớp học",
        pages: 9,
        exercisePages: 5,
        available: true,
        unitGroup: "Phần 1 · Bảng chữ cái Hangul (Bài 1–5)",
      },
      {
        id: "on-tap-1",
        num: "Ôn 1",
        kind: "review",
        ko: "복습 1",
        vi: "Ôn tập 1 (Bài 1–5 · Tổng kết Hangul)",
        grammar: "Nghe phân biệt âm · Đọc trơn câu ngắn · Kiểm tra bảng chữ cái",
        pages: 5,
        exercisePages: 7,
        available: true,
        unitGroup: "Phần 1 · Bảng chữ cái Hangul (Bài 1–5)",
      },
      {
        id: "bai-06",
        num: "06",
        kind: "lesson",
        ko: "안녕하세요?",
        vi: "Xin chào",
        grammar: "N이에요 / N예요 · N은 / N는",
        pages: 7,
        exercisePages: 8,
        available: true,
        unitGroup: "Phần 2 · Giao tiếp cơ bản (Bài 6–10)",
      },
      {
        id: "bai-07",
        num: "07",
        kind: "lesson",
        ko: "방에 책상이 있어요",
        vi: "Trong phòng có bàn học",
        grammar: "N이 / N가 + 있어요 / 없어요 · N(nơi chốn)에 있어요",
        pages: 9,
        exercisePages: 8,
        available: true,
        unitGroup: "Phần 2 · Giao tiếp cơ bản (Bài 6–10)",
      },
      {
        id: "bai-08",
        num: "08",
        kind: "lesson",
        ko: "한국어를 배워요",
        vi: "Tôi học tiếng Hàn",
        grammar: "V/A-아요 / -어요 · N을 / N를",
        pages: 8,
        exercisePages: 8,
        available: true,
        unitGroup: "Phần 2 · Giao tiếp cơ bản (Bài 6–10)",
      },
      {
        id: "bai-09",
        num: "09",
        kind: "lesson",
        ko: "라흐만 씨가 식당에 가요",
        vi: "Anh Rahman đi quán ăn",
        grammar: "N에 가다 (N에 가요) · N에서",
        pages: 8,
        exercisePages: 8,
        available: true,
        unitGroup: "Phần 2 · Giao tiếp cơ bản (Bài 6–10)",
      },
      {
        id: "bai-10",
        num: "10",
        kind: "lesson",
        ko: "오늘은 5월 5일이에요",
        vi: "Hôm nay là ngày 5 tháng 5",
        grammar: "N에 (thời gian) · N이 아니에요 / N가 아니에요",
        pages: 9,
        exercisePages: 12,
        available: true,
        unitGroup: "Phần 2 · Giao tiếp cơ bản (Bài 6–10)",
      },
      {
        id: "on-tap-2",
        num: "Ôn 2",
        kind: "review",
        ko: "복습 2",
        vi: "Ôn tập 2 (Bài 6–10)",
        grammar: "Tổng hợp từ vựng, ngữ pháp và nghe đọc bài 6–10",
        pages: 5,
        available: true,
        unitGroup: "Phần 2 · Giao tiếp cơ bản (Bài 6–10)",
      },
      {
        id: "bai-11",
        num: "11",
        kind: "lesson",
        ko: "9시부터 6시까지 일해요",
        vi: "Tôi làm việc từ 9 giờ đến 6 giờ",
        grammar: "N부터 ~ N까지 · 안 + V/A",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 3 · Sinh hoạt & Đời sống (Bài 11–15)",
      },
      {
        id: "bai-12",
        num: "12",
        kind: "lesson",
        ko: "김치찌개 하나 주세요",
        vi: "Cho tôi một canh kim chi",
        grammar: "V-고 싶다 · V-(으)세요 · V/A-아서/어서",
        pages: 10,
        exercisePages: 14,
        available: true,
        unitGroup: "Phần 3 · Sinh hoạt & Đời sống (Bài 11–15)",
      },
      {
        id: "bai-13",
        num: "13",
        kind: "lesson",
        ko: "칫솔하고 치약을 삽니다",
        vi: "Mua bàn chải và kem đánh răng",
        grammar: "N하고 N · -습니다 / -ㅂ니다, -습니까? / -ㅂ니까?",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 3 · Sinh hoạt & Đời sống (Bài 11–15)",
      },
      {
        id: "bai-14",
        num: "14",
        kind: "lesson",
        ko: "지난 주말에 친구를 만났어요",
        vi: "Cuối tuần trước tôi đã gặp bạn",
        grammar: "V/A-았어요 / -었어요 / 했어요 · 못 + V · V-(으)ㄹ 수 있다",
        pages: 10,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 3 · Sinh hoạt & Đời sống (Bài 11–15)",
      },
      {
        id: "bai-15",
        num: "15",
        kind: "lesson",
        ko: "어버이날에 부모님께 꽃을 드려요",
        vi: "Ngày Cha Mẹ tôi tặng hoa cho bố mẹ",
        grammar: "V/A-(으)시- → -(으)세요 · N에게 / N한테 / N께 · V-아/어 주다",
        pages: 10,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 3 · Sinh hoạt & Đời sống (Bài 11–15)",
      },
      {
        id: "on-tap-3",
        num: "Ôn 3",
        kind: "review",
        ko: "복습 3",
        vi: "Ôn tập 3 (Bài 11–15)",
        grammar: "Tổng hợp thời gian, gọi món, mua sắm, thì quá khứ và kính ngữ",
        pages: 5,
        available: true,
        unitGroup: "Phần 3 · Sinh hoạt & Đời sống (Bài 11–15)",
      },
      {
        id: "bai-16",
        num: "16",
        kind: "lesson",
        ko: "이번 휴가에 뭐 할 거예요?",
        vi: "Kỳ nghỉ này bạn sẽ làm gì?",
        grammar: "V-(으)ㄹ 거예요 · V/A-고",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 4 · Kế hoạch & Trải nghiệm (Bài 16–20)",
      },
      {
        id: "bai-17",
        num: "17",
        kind: "lesson",
        ko: "버스로 공항에 가요",
        vi: "Đi xe buýt ra sân bay",
        grammar: "N(으)로 (phương tiện) · V-(으)러 가다/오다",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 4 · Kế hoạch & Trải nghiệm (Bài 16–20)",
      },
      {
        id: "bai-18",
        num: "18",
        kind: "lesson",
        ko: "저녁 7시에 만날까요?",
        vi: "7 giờ tối mình gặp nhau nhé?",
        grammar: "V-(으)ㄹ까요? · V-읍시다 / -ㅂ시다 · V-고 있다",
        pages: 10,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 4 · Kế hoạch & Trải nghiệm (Bài 16–20)",
      },
      {
        id: "bai-19",
        num: "19",
        kind: "lesson",
        ko: "오늘 날씨가 정말 덥네요",
        vi: "Hôm nay trời nóng thật",
        grammar: "V/A-네요 · N보다",
        pages: 9,
        exercisePages: 12,
        available: true,
        unitGroup: "Phần 4 · Kế hoạch & Trải nghiệm (Bài 16–20)",
      },
      {
        id: "bai-20",
        num: "20",
        kind: "lesson",
        ko: "배가 아파서 병원에 가요",
        vi: "Đau bụng nên tôi đi bệnh viện",
        grammar: "V-지 마세요 · V-(으)ㄴ 후에",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 4 · Kế hoạch & Trải nghiệm (Bài 16–20)",
      },
      {
        id: "on-tap-4",
        num: "Ôn 4",
        kind: "review",
        ko: "복습 4",
        vi: "Ôn tập 4 (Bài 16–20)",
        grammar: "Tổng hợp kế hoạch tương lai, giao thông, hẹn gặp, thời tiết và sức khỏe",
        pages: 6,
        exercisePages: 9,
        available: true,
        unitGroup: "Phần 4 · Kế hoạch & Trải nghiệm (Bài 16–20)",
      },
      {
        id: "thi-thu",
        num: "Thi",
        kind: "exam",
        ko: "모의고사",
        vi: "Thi thử TOPIK Sơ cấp 1",
        grammar: "Đề kiểm tra tổng kết Nghe & Đọc theo chuẩn TOPIK I",
        pages: 4,
        available: true,
        unitGroup: "Phần 5 · Đánh giá tổng kết",
      },
    ],
  },
  {
    id: "so-cap-2",
    volumeNumber: 2,
    code: "QUYỂN 2",
    title: "Sơ cấp 2",
    koTitle: "초급 2",
    levelBadge: "Sơ cấp · TOPIK I (Cấp 2)",
    topikTarget: "TOPIK I Cấp 2 · Giao tiếp mở rộng",
    status: "ready",
    statusLabel: "7 bài đã mở · Đang cập nhật tiếp",
    summary:
      "Mở rộng câu phức, định ngữ, biểu hiện hứa hẹn, thử nghiệm, điều kiện và lý do. Đã mở 7 bài đầu kèm sách bài tập tương tác đầy đủ.",
    highlights: ["7 bài đã mở", "7 sách bài tập", "25 mục toàn lộ trình", "Chuẩn TOPIK I Cấp 2"],
    accentGrad: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accentBadge: "border-emerald-500/35 bg-emerald-500/15 text-emerald-400",
    lessons: [
      {
        id: "bai-01",
        num: "01",
        kind: "lesson",
        ko: "제 고향은 경치가 아름다운 곳이에요",
        vi: "Quê tôi là nơi phong cảnh đẹp",
        grammar: "N(이)라고 하다 · A-(으)ㄴ + N",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 1 · Quê hương, Sinh hoạt & Mua sắm (Bài 1–5)",
      },
      {
        id: "bai-02",
        num: "02",
        kind: "lesson",
        ko: "쓰레기는 내가 버릴게요",
        vi: "Để tôi đi đổ rác",
        grammar: "V-(으)ㄹ게요 · V-(으)면서",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 1 · Quê hương, Sinh hoạt & Mua sắm (Bài 1–5)",
      },
      {
        id: "bai-03",
        num: "03",
        kind: "lesson",
        ko: "이걸로 한번 입어 보세요",
        vi: "Mặc thử cái này xem",
        grammar: "N이나 / N나 · V-아/어 보다",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 1 · Quê hương, Sinh hoạt & Mua sắm (Bài 1–5)",
      },
      {
        id: "bai-04",
        num: "04",
        kind: "lesson",
        ko: "지금 통화할 수 있어요?",
        vi: "Bây giờ nói chuyện điện thoại được không?",
        grammar: "반말 (nói trống không) · 명사 + 에게서, 명사 + 한테서",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 1 · Quê hương, Sinh hoạt & Mua sắm (Bài 1–5)",
      },
      {
        id: "bai-05",
        num: "05",
        kind: "lesson",
        ko: "많이 아프면 이 약을 드세요",
        vi: "Nếu đau nhiều thì uống thuốc này",
        grammar: "V/A-(으)면 · V-아서/어서 (순차) · V-아/어도 되다, V-(으)면 안 되다",
        pages: 10,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 1 · Quê hương, Sinh hoạt & Mua sắm (Bài 1–5)",
      },
      {
        id: "on-tap-1",
        num: "Ôn 1",
        kind: "review",
        ko: "복습 1",
        vi: "Ôn tập 1 (Bài 1–5)",
        grammar: "Tổng hợp định ngữ tính từ, hứa hẹn, thử nghiệm và câu điều kiện",
        pages: 6,
        available: false,
        unitGroup: "Phần 1 · Quê hương, Sinh hoạt & Mua sắm (Bài 1–5)",
      },
      {
        id: "bai-06",
        num: "06",
        kind: "lesson",
        ko: "맛있는 음식을 먹을 때 행복해요",
        vi: "Khi ăn món ngon tôi thấy hạnh phúc",
        grammar: "V/A-겠- · V/A-을 때 · 동사 + -을래/-ㄹ래",
        pages: 10,
        exercisePages: 14,
        available: true,
        unitGroup: "Phần 2 · Cảm xúc, Giao thiệp & Kế hoạch (Bài 6–10)",
      },
      {
        id: "bai-07",
        num: "07",
        kind: "lesson",
        ko: "집들이니까 세제나 휴지를 가져갈게요",
        vi: "Tân gia nên tôi sẽ mang nước giặt hay giấy vệ sinh",
        grammar: "V/A-(으)니까 · 동사, 형용사 + -기 때문에",
        pages: 9,
        exercisePages: 13,
        available: true,
        unitGroup: "Phần 2 · Cảm xúc, Giao thiệp & Kế hoạch (Bài 6–10)",
      },
      {
        id: "bai-08",
        num: "08",
        kind: "lesson",
        ko: "9월부터 한국어 수업을 듣기로 했어요",
        vi: "Tôi đã quyết định học tiếng Hàn từ tháng 9",
        grammar: "V-기 전에 · V-기로 하다",
        pages: 9,
        exercisePages: 13,
        available: false,
        unitGroup: "Phần 2 · Cảm xúc, Giao thiệp & Kế hoạch (Bài 6–10)",
      },
      {
        id: "bai-09",
        num: "09",
        kind: "lesson",
        ko: "근처에 자주 가는 식당이 있어요",
        vi: "Gần đây có quán tôi hay đến",
        grammar: "V/A-(으)ㄹ 것 같다 · V-는 + N",
        pages: 9,
        exercisePages: 13,
        available: false,
        unitGroup: "Phần 2 · Cảm xúc, Giao thiệp & Kế hoạch (Bài 6–10)",
      },
      {
        id: "bai-10",
        num: "10",
        kind: "lesson",
        ko: "교실에서는 한국어로만 말할 것",
        vi: "Trong lớp chỉ nói tiếng Hàn",
        grammar: "동사 + -을/-ㄹ 것 · -을/-ㄹ 수밖에 없다 · V-아/어야 되다",
        pages: 9,
        exercisePages: 13,
        available: false,
        unitGroup: "Phần 2 · Cảm xúc, Giao thiệp & Kế hoạch (Bài 6–10)",
      },
      {
        id: "on-tap-2",
        num: "Ôn 2",
        kind: "review",
        ko: "복습 2",
        vi: "Ôn tập 2 (Bài 6–10)",
        grammar: "Tổng hợp bài 6–10",
        pages: 6,
        available: false,
        unitGroup: "Phần 2 · Cảm xúc, Giao thiệp & Kế hoạch (Bài 6–10)",
      },
      {
        id: "bai-11",
        num: "11",
        kind: "lesson",
        ko: "소포를 보내려고 하는데요",
        vi: "Tôi định gửi bưu kiện",
        grammar: "V-(으)려고 하다 · V/A-는데, N인데",
        pages: 9,
        exercisePages: 13,
        available: false,
        unitGroup: "Phần 3 · Dịch vụ & Cuộc sống tại Hàn (Bài 11–20)",
      },
      {
        id: "bai-12",
        num: "12",
        kind: "lesson",
        ko: "비자 연장 신청을 하러 왔어요",
        vi: "Tôi đến để xin gia hạn visa",
        grammar: "V-(으)려면 · V-(으)ㄴ/는데도",
        pages: 9,
        exercisePages: 13,
        available: false,
        unitGroup: "Phần 3 · Dịch vụ & Cuộc sống tại Hàn (Bài 11–20)",
      },
    ],
  },
  {
    id: "trung-cap-3",
    volumeNumber: 3,
    code: "QUYỂN 3",
    title: "Trung cấp 3",
    koTitle: "중급 3",
    levelBadge: "Trung cấp · TOPIK II (Cấp 3)",
    topikTarget: "TOPIK II Cấp 3 · Giao tiếp xã hội",
    status: "upcoming",
    statusLabel: "Đang biên soạn",
    summary:
      "Chuyển tiếp từ câu giao tiếp sinh hoạt sang thảo luận công việc, giải thích nguyên nhân sâu, tường thuật gián tiếp và đọc hiểu văn bản dài.",
    highlights: ["Tường thuật gián tiếp", "Từ vựng công sở & xã hội", "Đọc hiểu đoạn văn TOPIK II"],
    accentGrad: "from-violet-500/20 via-indigo-500/10 to-transparent",
    accentBadge: "border-violet-500/35 bg-violet-500/15 text-violet-400",
    lessons: [],
  },
  {
    id: "trung-cap-4",
    volumeNumber: 4,
    code: "QUYỂN 4",
    title: "Trung cấp 4",
    koTitle: "중급 4",
    levelBadge: "Trung cấp · TOPIK II (Cấp 4)",
    topikTarget: "TOPIK II Cấp 4 · Viết & Thảo luận",
    status: "upcoming",
    statusLabel: "Đang biên soạn",
    summary:
      "Ngữ pháp trung cấp nâng cao, thành ngữ quán dụng, văn phong báo chí và cấu trúc lập luận phục vụ câu 51–54 bài thi Viết TOPIK II.",
    highlights: ["Biểu hiện quán dụng", "Đọc báo & tin tức", "Lập luận câu 51–54"],
    accentGrad: "from-amber-500/20 via-orange-500/10 to-transparent",
    accentBadge: "border-amber-500/35 bg-amber-500/15 text-amber-400",
    lessons: [],
  },
  {
    id: "cao-cap-5",
    volumeNumber: 5,
    code: "QUYỂN 5",
    title: "Cao cấp 5",
    koTitle: "고급 5",
    levelBadge: "Cao cấp · KIIP 5 & TOPIK II",
    topikTarget: "Hội nhập xã hội & Văn hóa Hàn Quốc",
    status: "upcoming",
    statusLabel: "Đang biên soạn",
    summary:
      "Chuyên đề xã hội, pháp luật, kinh tế, lịch sử và đời sống công dân tại Hàn Quốc theo khung chương trình Hội nhập xã hội (KIIP) và TOPIK II.",
    highlights: ["Kinh tế & Pháp luật", "Văn hóa & Lịch sử", "Chuẩn KIIP 5"],
    accentGrad: "from-rose-500/20 via-pink-500/10 to-transparent",
    accentBadge: "border-rose-500/35 bg-rose-500/15 text-rose-400",
    lessons: [],
  },
  {
    id: "cao-cap-6",
    volumeNumber: 6,
    code: "QUYỂN 6",
    title: "Cao cấp 6",
    koTitle: "고급 6",
    levelBadge: "Cao cấp · TOPIK II (Cấp 5–6)",
    topikTarget: "TOPIK II Cấp 5–6 · Học thuật",
    status: "upcoming",
    statusLabel: "Đang biên soạn",
    summary:
      "Ngôn ngữ học thuật, văn bản chuyên ngành, từ Hán Hàn nâng cao và phân tích chuyên sâu giúp chinh phục TOPIK II cấp 5–6.",
    highlights: ["Từ Hán Hàn học thuật", "Diễn thuyết & Phản biện", "Chinh phục Cấp 5–6"],
    accentGrad: "from-cyan-500/20 via-blue-500/10 to-transparent",
    accentBadge: "border-cyan-500/35 bg-cyan-500/15 text-cyan-400",
    lessons: [],
  },
];

interface ProgressSnapshot {
  doneMap: Record<string, boolean>;
  seenPagesMap: Record<string, number[]>;
}

function readProgressSnapshot(): ProgressSnapshot {
  if (typeof window === "undefined") {
    return { doneMap: {}, seenPagesMap: {} };
  }
  let doneMap: Record<string, boolean> = {};
  let seenPagesMap: Record<string, number[]> = {};
  try {
    const rawDone = window.localStorage.getItem("sach:bai-xong");
    if (rawDone) {
      const parsed = JSON.parse(rawDone);
      if (parsed && typeof parsed === "object") doneMap = parsed;
    }
  } catch {
    // ignore malformed storage
  }
  try {
    const rawSeen = window.localStorage.getItem("sach:trang-da-xem");
    if (rawSeen) {
      const parsed = JSON.parse(rawSeen);
      if (parsed && typeof parsed === "object") seenPagesMap = parsed;
    }
  } catch {
    // ignore malformed storage
  }
  return { doneMap, seenPagesMap };
}

function isLessonDone(doneMap: Record<string, boolean>, bookId: string, lessonId: string): boolean {
  if (doneMap[`${bookId}/${lessonId}`]) return true;
  if (bookId === "so-cap-1" && doneMap[lessonId]) return true;
  return false;
}

function getSeenPages(seenPagesMap: Record<string, number[]>, key: string, legacyKey?: string): number[] {
  const direct = seenPagesMap[key];
  if (Array.isArray(direct) && direct.length > 0) return direct;
  if (legacyKey && Array.isArray(seenPagesMap[legacyKey])) return seenPagesMap[legacyKey];
  return [];
}

export function SachLibraryModule({ initialBook }: { initialBook?: "so-cap-1" | "so-cap-2" }) {
  const [selectedBookId, setSelectedBookId] = useState<"so-cap-1" | "so-cap-2">(initialBook || "so-cap-1");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "available" | "hangul" | "lesson" | "review" | "unfinished">("all");
  const [reversed, setReversed] = useState(false);
  const [progress, setProgress] = useState<ProgressSnapshot>({ doneMap: {}, seenPagesMap: {} });

  useEffect(() => {
    if (initialBook) {
      setSelectedBookId(initialBook);
    }
  }, [initialBook]);

  useEffect(() => {
    const refresh = () => setProgress(readProgressSnapshot());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const toggleLessonDone = (bookId: string, lessonId: string) => {
    try {
      const current = readProgressSnapshot().doneMap;
      const key = `${bookId}/${lessonId}`;
      const currentlyDone = isLessonDone(current, bookId, lessonId);
      const next = { ...current, [key]: !currentlyDone };
      if (bookId === "so-cap-1" && lessonId in next) {
        delete next[lessonId];
      }
      if (!next[key]) delete next[key];
      window.localStorage.setItem("sach:bai-xong", JSON.stringify(next));
      setProgress(readProgressSnapshot());
    } catch {
      // ignore storage errors
    }
  };

  const activeBook = useMemo(
    () => SACH_BOOKS.find((b) => b.id === selectedBookId) || SACH_BOOKS[0],
    [selectedBookId]
  );

  // Calculate book-level stats
  const bookStats = useMemo(() => {
    const stats: Record<
      string,
      {
        availableCount: number;
        doneCount: number;
        inProgressCount: number;
        percent: number;
        resumeLesson?: { lesson: CurriculumLesson; lastPage: number };
      }
    > = {};

    for (const book of SACH_BOOKS) {
      const availableLessons = book.lessons.filter((l) => l.available);
      let doneCount = 0;
      let inProgressCount = 0;
      let resumeLesson: { lesson: CurriculumLesson; lastPage: number } | undefined;

      for (const lesson of availableLessons) {
        const done = isLessonDone(progress.doneMap, book.id, lesson.id);
        const seen = getSeenPages(
          progress.seenPagesMap,
          `${book.id}/${lesson.id}`,
          book.id === "so-cap-1" ? lesson.id : undefined
        );
        if (done) {
          doneCount++;
        } else if (seen.length > 0) {
          inProgressCount++;
          const maxPage = Math.max(...seen, 1);
          resumeLesson = { lesson, lastPage: Math.min(maxPage, lesson.pages) };
        } else if (!resumeLesson) {
          resumeLesson = { lesson, lastPage: 1 };
        }
      }

      const percent = availableLessons.length > 0 ? Math.round((doneCount / availableLessons.length) * 100) : 0;
      stats[book.id] = {
        availableCount: availableLessons.length,
        doneCount,
        inProgressCount,
        percent,
        resumeLesson,
      };
    }
    return stats;
  }, [progress]);

  const filteredLessons = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = reversed ? [...activeBook.lessons].reverse() : activeBook.lessons;
    return base.filter((lesson) => {
      if (kindFilter === "available" && !lesson.available) return false;
      if (kindFilter === "hangul" && lesson.kind !== "hangul") return false;
      if (kindFilter === "lesson" && lesson.kind !== "lesson") return false;
      if (kindFilter === "review" && lesson.kind !== "review" && lesson.kind !== "exam") return false;
      if (kindFilter === "unfinished") {
        if (!lesson.available) return false;
        if (isLessonDone(progress.doneMap, activeBook.id, lesson.id)) return false;
      }
      if (!q) return true;
      const haystack = `${lesson.num} ${lesson.id} ${lesson.ko} ${lesson.vi} ${lesson.grammar || ""} ${lesson.unitGroup}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [activeBook, query, kindFilter, reversed, progress.doneMap]);

  // Group lessons by unitGroup when not reversing or searching
  const groupedLessons = useMemo(() => {
    const groups: { title: string; items: CurriculumLesson[] }[] = [];
    for (const lesson of filteredLessons) {
      const last = groups[groups.length - 1];
      if (!last || last.title !== lesson.unitGroup) {
        groups.push({ title: lesson.unitGroup, items: [lesson] });
      } else {
        last.items.push(lesson);
      }
    }
    return groups;
  }, [filteredLessons]);

  const activeStats = bookStats[activeBook.id] || {
    availableCount: 0,
    doneCount: 0,
    inProgressCount: 0,
    percent: 0,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 animate-fadeIn text-ink">
      {/* Breadcrumb when on dedicated /sach/[book] page */}
      {initialBook && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-ink-soft">
          <div className="flex items-center gap-2">
            <Link href="/sach" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-field px-3 py-1.5 text-ink hover:border-sky-400/50">
              <ArrowLeft className="h-3.5 w-3.5 text-sky-400" />
              Kệ sách tiếng Hàn
            </Link>
            <span className="text-ink-mute">/</span>
            <span className="text-sky-400 font-black">{activeBook.title} ({activeBook.koTitle})</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={activeBook.id === "so-cap-1" ? "/sach/so-cap-2" : "/sach/so-cap-1"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-field px-3 py-1.5 text-ink-soft hover:text-ink hover:border-sky-400/50"
            >
              Chuyển sang {activeBook.id === "so-cap-1" ? "Sơ cấp 2" : "Sơ cấp 1"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      )}

      {/* Hero Banner */}
      <header className="card-duo relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-400">
                <BookMarked className="h-3.5 w-3.5" />
                Giáo trình tương tác · AnkiVN LMS
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                <Volume2 className="h-3 w-3" />
                Chạm nghe phát âm & Làm bài trực tiếp
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-ink sm:text-4xl">
              {initialBook ? (
                <>
                  Giáo trình <span className="text-sky-400">{activeBook.title}</span>{" "}
                  <span className="font-noto font-bold text-ink-soft">({activeBook.koTitle})</span>
                </>
              ) : (
                "Kệ sách Tiếng Hàn Tương Tác (Quyển 1 – 6)"
              )}
            </h1>

            <p className="text-sm leading-relaxed text-ink-soft">
              {initialBook
                ? activeBook.summary
                : "Lộ trình 6 quyển từ bảng chữ cái Hangul Sơ cấp 1 đến TOPIK II Cao cấp. Nghe hội thoại, tra nghĩa từng câu, lật thẻ ngữ pháp và làm sách bài tập ngay trên từng trang sách."}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {activeStats.resumeLesson && (
                <a
                  href={`/sach/${activeBook.id}/${activeStats.resumeLesson.lesson.id}/${
                    activeStats.resumeLesson.lastPage > 1 ? `#trang-${activeStats.resumeLesson.lastPage}` : ""
                  }`}
                  className="btn-duo bg-sky-500 border-sky-700 text-white px-4 py-2.5 text-xs inline-flex items-center gap-2"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {activeStats.doneCount > 0 || activeStats.inProgressCount > 0
                    ? `Học tiếp ${activeBook.title} · Bài ${activeStats.resumeLesson.lesson.num}`
                    : `Bắt đầu ${activeBook.title} · Bài 01`}
                </a>
              )}
              <Link
                href="/flashcards"
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-field px-4 py-2.5 text-xs font-extrabold text-ink hover:border-sky-400/50 transition"
              >
                <Layers className="h-4 w-4 text-sky-400" />
                Ôn Flashcard SRS
              </Link>
              <Link
                href="/topik/archive"
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-field px-4 py-2.5 text-xs font-extrabold text-ink hover:border-emerald-400/50 transition"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                Kho đề TOPIK
              </Link>
            </div>
          </div>

          {/* Active Book Live Progress Card */}
          <div className="w-full lg:w-80 shrink-0 rounded-2xl border border-line bg-field p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-mute">
                  TIẾN ĐỘ {activeBook.code}
                </p>
                <p className="text-base font-black text-ink">
                  {activeBook.title} <span className="font-noto text-xs font-bold text-ink-soft">({activeBook.koTitle})</span>
                </p>
              </div>
              <span className="rounded-xl border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-xs font-black text-sky-400 tabular-nums">
                {activeStats.percent}%
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel border border-line">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(activeStats.percent, activeStats.inProgressCount > 0 ? 4 : 0)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-line bg-panel px-2 py-2">
                <p className="text-sm font-black text-emerald-400 tabular-nums">{activeStats.doneCount}</p>
                <p className="text-[10px] font-bold text-ink-mute">Đã xong</p>
              </div>
              <div className="rounded-xl border border-line bg-panel px-2 py-2">
                <p className="text-sm font-black text-amber-400 tabular-nums">{activeStats.inProgressCount}</p>
                <p className="text-[10px] font-bold text-ink-mute">Đang học</p>
              </div>
              <div className="rounded-xl border border-line bg-panel px-2 py-2">
                <p className="text-sm font-black text-sky-400 tabular-nums">{activeStats.availableCount}</p>
                <p className="text-[10px] font-bold text-ink-mute">Tổng bài mở</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 6-Book Shelf Grid */}
      <section aria-label="Kệ sách 6 quyển" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-ink">
              Lộ trình 6 quyển chuẩn TOPIK & KIIP
            </h2>
          </div>
          <span className="text-xs font-semibold text-ink-mute">
            Chọn quyển sách để xem danh sách bài học và sách bài tập
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SACH_BOOKS.map((book) => {
            const isSelected = book.id === activeBook.id;
            const isReady = book.status === "ready";
            const stats = bookStats[book.id];

            return (
              <div
                key={book.id}
                onClick={() => {
                  if (isReady) {
                    setSelectedBookId(book.id as "so-cap-1" | "so-cap-2");
                  }
                }}
                role={isReady ? "button" : undefined}
                tabIndex={isReady ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isReady && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setSelectedBookId(book.id as "so-cap-1" | "so-cap-2");
                  }
                }}
                className={`card-duo relative flex flex-col justify-between overflow-hidden p-4 transition-all ${
                  isReady ? "cursor-pointer hover:-translate-y-0.5" : "opacity-75"
                } ${
                  isSelected
                    ? "ring-2 ring-sky-400 border-sky-400/60"
                    : ""
                }`}
              >
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${book.accentGrad}`} />

                <div className="relative space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-ink-mute">
                        {book.code}
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <h3 className="text-lg font-black text-ink">{book.title}</h3>
                        <span className="font-noto text-sm font-bold text-ink-soft">{book.koTitle}</span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${book.accentBadge}`}>
                      {isReady ? `${stats.doneCount}/${stats.availableCount} bài` : "Sắp mở"}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-ink-soft line-clamp-2">{book.summary}</p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {book.highlights.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-line bg-field px-2 py-0.5 text-[10px] font-bold text-ink-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-ink-mute">{book.levelBadge}</span>

                  {isReady ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sach/${book.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-extrabold text-sky-400 hover:underline inline-flex items-center gap-1"
                      >
                        Mục lục riêng
                      </Link>
                      <a
                        href={`/sach/${book.id}/bai-01/`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-xl bg-sky-500/15 border border-sky-400/35 px-2.5 py-1 text-[11px] font-black text-sky-400 hover:bg-sky-500/25"
                      >
                        Vào học <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-mute">
                      <Lock className="h-3 w-3" /> Đang biên soạn
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Book Curriculum Section */}
      <section aria-label={`Mục lục ${activeBook.title}`} className="card-duo p-4 sm:p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-line pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${activeBook.accentBadge}`}>
                {activeBook.code}
              </span>
              <h2 className="text-xl font-black text-ink sm:text-2xl">
                Mục lục {activeBook.title}{" "}
                <span className="font-noto text-base font-bold text-ink-soft">({activeBook.koTitle})</span>
              </h2>
            </div>
            <p className="text-xs text-ink-soft">
              {activeBook.statusLabel} · Bấm <strong>Giáo trình</strong> để học lý thuyết & hội thoại, hoặc{" "}
              <strong>Bài tập</strong> để luyện nghe – viết.
            </p>
          </div>

          {/* Quick Book Switcher Tabs */}
          <div className="inline-flex rounded-2xl border border-line bg-field p-1 self-start">
            {(["so-cap-1", "so-cap-2"] as const).map((bookSlug) => {
              const b = SACH_BOOKS.find((item) => item.id === bookSlug)!;
              const active = activeBook.id === bookSlug;
              return (
                <button
                  key={bookSlug}
                  type="button"
                  onClick={() => setSelectedBookId(bookSlug)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
                    active
                      ? "bg-sky-500 text-white shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {b.title} ({b.lessons.filter((l) => l.available).length} bài)
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-field px-3.5 py-2.5 focus-within:border-sky-400">
            <Search className="h-4 w-4 text-ink-mute shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Tìm bài học, chủ đề, tiếng Hàn hoặc ngữ pháp trong ${activeBook.title}...`}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-xs font-bold text-ink-mute hover:text-ink"
              >
                Xóa
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-ink-mute mr-1 hidden sm:inline" />
            {(
              [
                { id: "all", label: "Tất cả" },
                { id: "available", label: "Đã mở" },
                ...(activeBook.id === "so-cap-1" ? [{ id: "hangul", label: "Hangul (1–5)" }] : []),
                { id: "lesson", label: "Bài học" },
                { id: "review", label: "Ôn tập & Thi" },
                { id: "unfinished", label: "Chưa hoàn thành" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKindFilter(tab.id as typeof kindFilter)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                  kindFilter === tab.id
                    ? "border-sky-400/50 bg-sky-500/15 text-sky-400"
                    : "border-line bg-field text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setReversed((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                reversed
                  ? "border-amber-400/50 bg-amber-500/15 text-amber-400"
                  : "border-line bg-field text-ink-soft hover:text-ink"
              }`}
              title="Đảo ngược thứ tự bài để ôn tập từ cuối lên đầu"
            >
              <RotateCcw className={`h-3.5 w-3.5 transition-transform ${reversed ? "rotate-180" : ""}`} />
              {reversed ? "Đang đảo ngược" : "Đảo thứ tự"}
            </button>
          </div>
        </div>

        {/* Lesson Groups & Cards */}
        {groupedLessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-field p-10 text-center space-y-2">
            <p className="text-sm font-bold text-ink">Không tìm thấy bài học phù hợp với bộ lọc hiện tại.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setKindFilter("all");
              }}
              className="text-xs font-extrabold text-sky-400 hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedLessons.map((group) => (
              <div key={group.title} className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-sky-400">
                    {group.title}
                  </h3>
                  <span className="text-[11px] font-bold text-ink-mute">
                    {group.items.length} mục
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {group.items.map((lesson) => {
                    const done = isLessonDone(progress.doneMap, activeBook.id, lesson.id);
                    const textbookSeen = getSeenPages(
                      progress.seenPagesMap,
                      `${activeBook.id}/${lesson.id}`,
                      activeBook.id === "so-cap-1" ? lesson.id : undefined
                    );
                    const workbookSeen = getSeenPages(
                      progress.seenPagesMap,
                      `${activeBook.id}/${lesson.id}/bai-tap`,
                      activeBook.id === "so-cap-1" ? `${lesson.id}/bai-tap` : undefined
                    );
                    const textbookMaxPage = textbookSeen.length > 0 ? Math.min(Math.max(...textbookSeen), lesson.pages) : 0;
                    const isReviewOrExam = lesson.kind === "review" || lesson.kind === "exam";

                    return (
                      <article
                        key={lesson.id}
                        className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                          !lesson.available
                            ? "border-line bg-field/50 opacity-65"
                            : done
                              ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                              : "border-line bg-field hover:border-sky-400/50"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`inline-flex h-9 min-w-[2.25rem] px-2 items-center justify-center rounded-xl text-xs font-black tabular-nums ${
                                  done
                                    ? "bg-emerald-500 text-white"
                                    : isReviewOrExam
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-400/35"
                                      : "bg-sky-500/15 text-sky-400 border border-sky-400/30"
                                }`}
                              >
                                {lesson.num}
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h4 className="font-noto text-base font-black text-ink leading-snug">
                                    {lesson.ko}
                                  </h4>
                                  {lesson.kind === "hangul" && (
                                    <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-cyan-400">
                                      Hangul
                                    </span>
                                  )}
                                  {lesson.kind === "review" && (
                                    <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-400">
                                      Ôn tập
                                    </span>
                                  )}
                                  {lesson.kind === "exam" && (
                                    <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-400">
                                      Đề thi thử
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-ink-soft mt-0.5">{lesson.vi}</p>
                              </div>
                            </div>

                            {lesson.available ? (
                              <button
                                type="button"
                                onClick={() => toggleLessonDone(activeBook.id, lesson.id)}
                                title={done ? "Đánh dấu chưa xong" : "Đánh dấu đã hoàn thành bài này"}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition shrink-0 ${
                                  done
                                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-400"
                                    : "border-line bg-panel text-ink-mute hover:text-ink hover:border-sky-400/40"
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {done ? "Đã xong" : "Đánh dấu"}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-[10px] font-bold text-ink-mute shrink-0">
                                <Clock className="h-3 w-3" /> Sắp mở
                              </span>
                            )}
                          </div>

                          {lesson.grammar && (
                            <p className="rounded-xl border border-line bg-panel px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                              <span className="font-black text-sky-400">Trọng tâm: </span>
                              {lesson.grammar}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons & Page Progress */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
                          {lesson.available ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={`/sach/${activeBook.id}/${lesson.id}/`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:brightness-110 transition"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                {lesson.kind === "exam" ? "Làm đề thi" : "Giáo trình"}
                                <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                                  {textbookSeen.length > 0
                                    ? `${Math.min(textbookSeen.length, lesson.pages)}/${lesson.pages} tr`
                                    : `${lesson.pages} trang`}
                                </span>
                              </a>

                              {lesson.exercisePages && (
                                <a
                                  href={`/sach/${activeBook.id}/${lesson.id}/bai-tap/`}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500/25 transition"
                                >
                                  <ListChecks className="h-3.5 w-3.5" />
                                  Bài tập
                                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                                    {workbookSeen.length > 0
                                      ? `${Math.min(workbookSeen.length, lesson.exercisePages)}/${lesson.exercisePages} tr`
                                      : `${lesson.exercisePages} trang`}
                                  </span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-ink-mute">
                              Nội dung tương tác của bài này đang được hoàn thiện.
                            </span>
                          )}

                          {lesson.available && textbookMaxPage > 1 && !done && (
                            <a
                              href={`/sach/${activeBook.id}/${lesson.id}/#trang-${textbookMaxPage}`}
                              className="text-[11px] font-extrabold text-amber-400 hover:underline ml-auto"
                            >
                              Tiếp trang {textbookMaxPage} →
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Study Guide & Integration Footer */}
      <section className="card-duo p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-sky-400">
              <GraduationCap className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-wider">
                Cách kết hợp Sách Tương Tác với Hệ sinh thái AnkiVN LMS
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-ink-soft">
              1. Mở <strong>Giáo trình</strong> để nghe phát âm, chạm vào từng câu hội thoại để xem giải nghĩa và cấu trúc ngữ pháp.{" "}
              2. Chuyển sang <strong>Bài tập</strong> cùng bài để luyện điền từ, nối câu và nghe hiểu có chấm điểm tự động.{" "}
              3. Ôn lại từ vựng bằng thuật toán lặp lại ngắt quãng FSRS trong mục <strong>Flashcard</strong> và thử sức với đề thật tại <strong>Kho đề TOPIK</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <a
              href="/sach/so-cap-1/bai-01/"
              className="rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-black text-white hover:brightness-110"
            >
              Mở Bài 1 · Sơ cấp 1
            </a>
            <a
              href="/sach/so-cap-2/bai-01/"
              className="rounded-xl border border-line bg-field px-3.5 py-2 text-xs font-extrabold text-ink hover:border-sky-400/50"
            >
              Mở Bài 1 · Sơ cấp 2
            </a>
            <Link
              href="/dictionary"
              className="rounded-xl border border-line bg-field px-3.5 py-2 text-xs font-extrabold text-ink hover:border-sky-400/50"
            >
              Từ điển Hàn – Việt
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

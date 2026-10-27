export const FEATURE_CATALOG = [
  { key: "classes", label: "Lớp học AnkiVN", description: "Tạo lớp, giao bài và theo dõi tiến độ học viên.", route: "/classes" },
  { key: "hangul", label: "Bảng Hangeul", description: "Bảng chữ cái và luyện đọc Hangeul.", route: "/hangul" },
  { key: "lessons", label: "Lộ trình bài học", description: "Các bài học theo lộ trình tiếng Hàn.", route: "/lessons" },
  { key: "flashcards", label: "Từ vựng SRS / Ôn Anki", description: "Ôn tập thẻ Anki theo lịch SRS.", route: "/flashcards" },
  { key: "dictionary", label: "Từ điển Hàn–Việt–Anh", description: "Tra cứu từ vựng trong bộ NIKL.", route: "/dictionary" },
  { key: "topics", label: "Học theo chủ đề", description: "Từ vựng và câu mẫu theo chủ đề.", route: "/topics" },
  { key: "dictation", label: "Luyện nghe chính tả", description: "Nghe video/âm thanh và chép lại.", route: "/dictation" },
  { key: "shadowing", label: "Shadowing", description: "Nghe mẫu và luyện nói nhại.", route: "/shadowing" },
  { key: "listen", label: "Nghe thụ động", description: "Lướt video để nghe tiếng Hàn.", route: "/listen" },
  { key: "games", label: "Trò chơi từ vựng", description: "Trò chơi ghi nhớ từ vựng.", route: "/games" },
  { key: "aiSpeaking", label: "Luyện nói tiếng Hàn", description: "Luyện nói với nhận diện giọng nói.", route: "/ai-speaking" },
  { key: "topik", label: "Luyện thi TOPIK", description: "Bộ luyện thi TOPIK I/II.", route: "/topik" },
  { key: "missions", label: "Nhiệm vụ hằng ngày", description: "Nhiệm vụ học tập mỗi ngày.", route: "/missions" },
  { key: "leaderboard", label: "Bảng xếp hạng", description: "Xếp hạng hoạt động học tập.", route: "/leaderboard" },
  { key: "achievements", label: "Huy hiệu & Mốc thưởng", description: "Thành tích và phần thưởng học tập.", route: "/achievements" },
  { key: "community", label: "Cộng đồng Haechi", description: "Bài viết và chia sẻ của học viên.", route: "/community" },
  { key: "chat", label: "Phòng trò chuyện", description: "Trò chuyện cộng đồng.", route: "/chat" },
  { key: "feedback", label: "Góp ý & Đánh giá", description: "Gửi phản hồi về HaechiVN.", route: "/feedback" },
  { key: "rewards", label: "Cửa hàng đổi quà", description: "Đổi gem lấy khung và vật phẩm.", route: "/rewards" },
  { key: "referrals", label: "Mời bạn bè", description: "Giới thiệu người học mới.", route: "/referrals" },
  { key: "pricing", label: "Nâng cấp PRO", description: "Trang thông tin gói PRO.", route: "/pricing" },
  { key: "profile", label: "Hồ sơ cá nhân", description: "Hồ sơ và tiến độ cá nhân.", route: "/profile" },
  { key: "ankiImport", label: "Nhập bộ Anki", description: "Nút nhập file .apkg trên thanh menu.", route: null },
] as const;

export type FeatureKey = (typeof FEATURE_CATALOG)[number]["key"];
export type FeatureFlags = Record<FeatureKey, boolean>;

export const DEFAULT_FEATURE_FLAGS = Object.fromEntries(
  FEATURE_CATALOG.map(({ key }) => [key, true]),
) as FeatureFlags;

export function featureForPath(pathname: string): FeatureKey | null {
  if (pathname === "/member" || pathname.startsWith("/member/")) return "profile";
  return FEATURE_CATALOG.find((feature) => feature.route && (pathname === feature.route || pathname.startsWith(`${feature.route}/`)))?.key ?? null;
}

export type AchievementMetric = "streak" | "level" | "sessions" | "minutes" | "cards" | "dictation" | "shadowing" | "topik" | "accuracy";

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementMetric;
  reqValue: number;
  rewardGems: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

const make = (id: string, name: string, description: string, icon: string, category: AchievementMetric, reqValue: number, rewardGems: number, tier: AchievementBadge["tier"] = "bronze"): AchievementBadge => ({ id, name, description, icon, category, reqValue, rewardGems, tier });

export const ACHIEVEMENTS_DATA: AchievementBadge[] = [
  make("streak_1", "Ngày đầu tiên", "Hoàn thành buổi học đầu tiên và khởi động chuỗi học.", "🌱", "streak", 1, 10),
  make("streak_3", "Giữ nhịp", "Học liên tục 3 ngày.", "🔥", "streak", 3, 20),
  make("streak_7", "Một tuần bền bỉ", "Học liên tục 7 ngày.", "⚡", "streak", 7, 40, "silver"),
  make("streak_14", "Không bỏ cuộc", "Học liên tục 14 ngày.", "🧭", "streak", 14, 70, "silver"),
  make("streak_30", "Kỷ luật thép", "Học liên tục 30 ngày.", "🛡️", "streak", 30, 120, "gold"),
  make("streak_60", "Hai tháng thăng tiến", "Đạt chuỗi học 60 ngày.", "🌋", "streak", 60, 200, "gold"),
  make("streak_100", "Huyền thoại Haechi", "Đạt chuỗi học 100 ngày.", "👑", "streak", 100, 350, "diamond"),
  make("streak_180", "Bậc thầy kiên trì", "Đạt chuỗi học 180 ngày.", "🐉", "streak", 180, 500, "diamond"),
  make("streak_365", "Một năm chinh phục", "Duy trì học tập suốt 365 ngày.", "🏆", "streak", 365, 1000, "diamond"),
  make("level_3", "Tân binh tiếng Hàn", "Đạt cấp độ 3.", "🎒", "level", 3, 15),
  make("level_5", "Học viên tiềm năng", "Đạt cấp độ 5.", "🌿", "level", 5, 30),
  make("level_10", "Thợ săn từ vựng", "Đạt cấp độ 10.", "🎯", "level", 10, 60, "silver"),
  make("level_15", "Chiến binh TOPIK", "Đạt cấp độ 15.", "⚔️", "level", 15, 100, "silver"),
  make("level_20", "Bậc thầy Haechi", "Đạt cấp độ 20.", "💎", "level", 20, 180, "gold"),
  make("level_30", "Học giả Seoul", "Đạt cấp độ 30.", "🏯", "level", 30, 300, "gold"),
  make("level_50", "Hàn ngữ tinh thông", "Đạt cấp độ 50.", "🐲", "level", 50, 600, "diamond"),
  make("sessions_1", "Mở sách", "Hoàn thành phiên học đầu tiên.", "📖", "sessions", 1, 10),
  make("sessions_10", "Vào guồng", "Hoàn thành 10 phiên học.", "🧩", "sessions", 10, 25),
  make("sessions_50", "Chăm học mỗi ngày", "Hoàn thành 50 phiên học.", "🗓️", "sessions", 50, 60, "silver"),
  make("sessions_100", "Trăm buổi tiến bộ", "Hoàn thành 100 phiên học.", "🎖️", "sessions", 100, 120, "gold"),
  make("sessions_250", "Không ngừng luyện tập", "Hoàn thành 250 phiên học.", "🌠", "sessions", 250, 250, "gold"),
  make("sessions_500", "Cỗ máy học tập", "Hoàn thành 500 phiên học.", "🚀", "sessions", 500, 500, "diamond"),
  make("minutes_60", "Giờ đầu tiên", "Tích lũy 60 phút học.", "⏱️", "minutes", 60, 15),
  make("minutes_600", "Mười giờ tập trung", "Tích lũy 10 giờ học.", "🌙", "minutes", 600, 60, "silver"),
  make("minutes_3000", "Trăm giờ làm chủ", "Tích lũy 50 giờ học.", "🪄", "minutes", 3000, 200, "gold"),
  make("minutes_10000", "Kho báu tri thức", "Tích lũy hơn 166 giờ học.", "🏅", "minutes", 10000, 500, "diamond"),
  make("cards_100", "Trăm câu đầu tiên", "Luyện 100 câu hoặc thẻ học.", "📝", "cards", 100, 25),
  make("cards_1000", "Ngàn câu vững vàng", "Luyện 1.000 câu hoặc thẻ học.", "📚", "cards", 1000, 100, "silver"),
  make("cards_5000", "Từ điển sống", "Luyện 5.000 câu hoặc thẻ học.", "📚", "cards", 5000, 250, "gold"),
  make("dictation_10", "Đôi tai tinh tường", "Hoàn thành 10 phiên nghe chép.", "🎧", "dictation", 10, 40),
  make("dictation_50", "Nghe đâu hiểu đó", "Hoàn thành 50 phiên nghe chép.", "🔊", "dictation", 50, 120, "silver"),
  make("dictation_150", "Bắt trọn từng âm", "Hoàn thành 150 phiên nghe chép.", "🎼", "dictation", 150, 300, "gold"),
  make("shadowing_10", "Bắt chước chuẩn", "Hoàn thành 10 phiên shadowing.", "🗣️", "shadowing", 10, 40),
  make("shadowing_50", "Ngữ điệu tự nhiên", "Hoàn thành 50 phiên shadowing.", "🎙️", "shadowing", 50, 120, "silver"),
  make("shadowing_150", "Giọng Seoul", "Hoàn thành 150 phiên shadowing.", "🇰🇷", "shadowing", 150, 300, "gold"),
  make("topik_10", "Thí sinh chăm chỉ", "Hoàn thành 10 phiên luyện TOPIK.", "📋", "topik", 10, 50),
  make("topik_50", "Sẵn sàng đi thi", "Hoàn thành 50 phiên luyện TOPIK.", "🎓", "topik", 50, 180, "gold"),
  make("accuracy_80", "Chính xác 80%", "Đạt độ chính xác 80% sau ít nhất 100 câu.", "🎯", "accuracy", 80, 80, "silver"),
  make("accuracy_95", "Chuẩn từng câu", "Đạt độ chính xác 95% sau ít nhất 500 câu.", "💯", "accuracy", 95, 250, "diamond"),
];

export const ACHIEVEMENT_METRIC_LABELS: Record<AchievementMetric, string> = {
  streak: "ngày streak", level: "cấp độ", sessions: "phiên học", minutes: "phút học", cards: "câu / thẻ",
  dictation: "phiên nghe chép", shadowing: "phiên shadowing", topik: "phiên TOPIK", accuracy: "% chính xác",
};

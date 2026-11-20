export interface DictEntry {
  hangul: string;
  romaja: string;
  vietnamese: string;
  partOfSpeech: string; // danh từ, động từ, tính từ...
  example?: string;
}

export const KOREAN_DICTIONARY: DictEntry[] = [
  { hangul: "안녕하세요", romaja: "annyeonghaseyo", vietnamese: "Xin chào", partOfSpeech: "Thán từ", example: "안녕하세요! 반갑습니다." },
  { hangul: "감사합니다", romaja: "gamsahabnida", vietnamese: "Cảm ơn", partOfSpeech: "Động từ", example: "도와주셔서 감사합니다." },
  { hangul: "사랑해요", romaja: "saranghaeyo", vietnamese: "Tôi yêu bạn", partOfSpeech: "Cụm từ", example: "정말 사랑해요." },
  { hangul: "죄송합니다", romaja: "joesonghabnida", vietnamese: "Xin lỗi", partOfSpeech: "Động từ", example: "늦어서 죄송합니다." },
  { hangul: "네", romaja: "ne", vietnamese: "Vâng / Có / Đúng", partOfSpeech: "Thán từ", example: "네, 알겠습니다." },
  { hangul: "아니요", romaja: "aniyo", vietnamese: "Không / Không phải", partOfSpeech: "Thán từ", example: "아니요, 괜찮습니다." },
  { hangul: "사람", romaja: "saram", vietnamese: "Con người / Người", partOfSpeech: "Danh từ", example: "좋은 사람입니다." },
  { hangul: "물", romaja: "mul", vietnamese: "Nước", partOfSpeech: "Danh từ", example: "물 한 잔 주세요." },
  { hangul: "밥", romaja: "bap", vietnamese: "Cơm / Bữa ăn", partOfSpeech: "Danh từ", example: "밥 먹었어요?" },
  { hangul: "학교", romaja: "hakgyo", vietnamese: "Trường học", partOfSpeech: "Danh từ", example: "학교에 갑니다." },
  { hangul: "선생님", romaja: "seonsaengnim", vietnamese: "Thầy/Cô giáo", partOfSpeech: "Danh từ", example: "선생님, 질문이 있습니다." },
  { hangul: "학생", romaja: "haksaeng", vietnamese: "Học sinh / Sinh viên", partOfSpeech: "Danh từ", example: "저는 한국어 학생입니다." },
  { hangul: "친구", romaja: "chingu", vietnamese: "Bạn bè", partOfSpeech: "Danh từ", example: "좋은 친구를 만났어요." },
  { hangul: "집", romaja: "jip", vietnamese: "Nhà", partOfSpeech: "Danh từ", example: "지금 집에 있어요." },
  { hangul: "책", romaja: "chaek", vietnamese: "Sách", partOfSpeech: "Danh từ", example: "책을 읽고 있어요." },
  { hangul: "한국", romaja: "hanguk", vietnamese: "Hàn Quốc", partOfSpeech: "Danh từ", example: "한국 문화를 좋아합니다." },
  { hangul: "베트남", romaja: "beteunam", vietnamese: "Việt Nam", partOfSpeech: "Danh từ", example: "저는 베트남 사람입니다." },
  { hangul: "공부하다", romaja: "gongbuhada", vietnamese: "Học tập", partOfSpeech: "Động từ", example: "매일 열심히 공부합니다." },
  { hangul: "먹다", romaja: "meokda", vietnamese: "Ăn", partOfSpeech: "Động từ", example: "맛있는 음식 먹어요." },
  { hangul: "마시다", romaja: "masida", vietnamese: "Uống", partOfSpeech: "Động từ", example: "커피를 마셔요." },
  { hangul: "가다", romaja: "gada", vietnamese: "Đi", partOfSpeech: "Động từ", example: "어디에 가세요?" },
  { hangul: "오다", romaja: "oda", vietnamese: "Đến / Đến nơi", partOfSpeech: "Động từ", example: "빨리 오세요." },
  { hangul: "좋다", romaja: "johda", vietnamese: "Tốt / Thích", partOfSpeech: "Tính từ", example: "날씨가 참 좋아요." },
  { hangul: "예쁘다", romaja: "yeppeuda", vietnamese: "Đẹp", partOfSpeech: "Tính từ", example: "꽃이 아주 예뻐요." },
  { hangul: "어렵다", romaja: "eoryeopda", vietnamese: "Khó khăn", partOfSpeech: "Tính từ", example: "한국어가 조금 어렵지만 재미있어요." },
  { hangul: "쉬운", romaja: "swiun", vietnamese: "Dễ dàng", partOfSpeech: "Tính từ", example: "쉬운 문제예요." },
  { hangul: "오늘", romaja: "oneul", vietnamese: "Hôm nay", partOfSpeech: "Danh từ", example: "오늘 기분이 좋아요." },
  { hangul: "내일", romaja: "naeil", vietnamese: "Ngày mai", partOfSpeech: "Danh từ", example: "내일 만나요." },
  { hangul: "시간", romaja: "sigan", vietnamese: "Thời gian / Giờ", partOfSpeech: "Danh từ", example: "지금 몇 시예요?" },
  { hangul: "돈", romaja: "don", vietnamese: "Tiền", partOfSpeech: "Danh từ", example: "얼마예요?" },
];

export function searchDictionary(query: string): DictEntry[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  return KOREAN_DICTIONARY.filter(
    (item) =>
      item.hangul.includes(q) ||
      item.vietnamese.toLowerCase().includes(q) ||
      item.romaja.toLowerCase().includes(q)
  );
}

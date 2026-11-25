// Chia 3 bộ Explore TOPIK (NIKL) thành deck con theo phân loại gốc của 한국어기초사전 (NIKL):
//   1. "주제 및 상황 범주" (chủ đề và tình huống) → deck con theo chủ đề;
//   2. không có chủ đề nhưng có "의미 범주" (nhóm nghĩa) → "Nhóm nghĩa::<nhóm>";
//   3. không có gì → "Từ khác::<từ loại>".
// Ghi vào trường `subdeck` (không đổi deckName, vì stateKey = deckName_id: đổi là học viên mất tiến độ).
// Nguồn XML (CC BY-SA 2.0 KR, không để trong repo): https://github.com/spellcheck-ko/korean-dict-nikl-krdict
// Chạy: node scripts/add-topik1-subdecks.mjs <thư mục chứa 5000.xml … 51947.xml>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DECKS = { "topik-vocab-level1-2": "초급", "topik-vocab-level3-4": "중급", "topik-vocab-level5-6": "고급" };
const FILES = ["src/data/topikCuratedDecks.json", "public/data/curated-decks.json"];
const POS_KO = {
  "Danh từ": "명사", "Động từ": "동사", "Tính từ": "형용사", "Phó từ": "부사", "Số từ": "수사", "Đại từ": "대명사",
  "Định từ": "관형사", "Danh từ phụ thuộc": "의존 명사", "Thán từ": "감탄사", "Trợ động từ": "보조 동사", "Trợ tính từ": "보조 형용사",
};
const TOPIC_VI = {
  "가족 행사": "Sự kiện gia đình", "가족 행사-명절": "Sự kiện gia đình", "감사하기": "Cảm ơn",
  "감정, 기분 표현하기": "Cảm xúc, tâm trạng", "개인 정보 교환하기": "Trao đổi thông tin cá nhân", "건강": "Sức khỏe",
  "건축": "Kiến trúc", "경제·경영": "Kinh tế, kinh doanh", "공공 기관 이용하기(도서관)": "Thư viện",
  "공공 기관 이용하기(우체국)": "Bưu điện", "공공 기관 이용하기(출입국 관리 사무소)": "Cục xuất nhập cảnh",
  "공공기관 이용하기": "Cơ quan công cộng", "공연과 감상": "Biểu diễn, thưởng thức", "과학과 기술": "Khoa học, công nghệ",
  "교육": "Giáo dục", "교통 이용하기": "Giao thông", "기후": "Khí hậu", "길찾기": "Tìm đường", "날씨와 계절": "Thời tiết, mùa",
  "날짜 표현하기": "Ngày tháng", "대중 매체": "Truyền thông", "대중 문화": "Văn hóa đại chúng",
  "문제 해결하기(분실 및 고장)": "Mất đồ, hỏng hóc", "문화 비교하기": "So sánh văn hóa", "문화 차이": "Khác biệt văn hóa",
  "물건 사기": "Mua sắm", "법": "Pháp luật", "병원 이용하기": "Bệnh viện", "보건과 의료": "Y tế", "복장 표현하기": "Trang phục",
  "사건, 사고, 재해 기술하기": "Sự cố, tai nạn, thiên tai", "사과하기": "Xin lỗi", "사회 문제": "Vấn đề xã hội",
  "사회 제도": "Chế độ xã hội", "성격 표현하기": "Tính cách", "소개하기(가족 소개)": "Giới thiệu gia đình",
  "소개하기(자기소개)": "Giới thiệu bản thân", "스포츠": "Thể thao", "시간 표현하기": "Thời gian", "식문화": "Văn hóa ẩm thực",
  "실수담 말하기": "Kể chuyện nhầm lẫn", "심리": "Tâm lý", "약국 이용하기": "Nhà thuốc", "약속하기": "Hẹn gặp", "언론": "Báo chí",
  "언어": "Ngôn ngữ", "여가 생활": "Giải trí", "여행": "Du lịch", "역사": "Lịch sử", "연애와 결혼": "Hẹn hò, kết hôn",
  "영화 보기": "Xem phim", "예술": "Nghệ thuật", "외모 표현하기": "Ngoại hình", "외양": "Dáng vẻ", "요리 설명하기": "Nấu ăn",
  "요일 표현하기": "Thứ trong tuần", "위치 표현하기": "Vị trí", "음식 설명하기": "Món ăn", "음식 주문하기": "Gọi món",
  "인간관계": "Quan hệ con người", "인사하기": "Chào hỏi", "전화하기": "Gọi điện", "정치": "Chính trị", "종교": "Tôn giáo",
  "주거 생활": "Nhà ở", "주말 및 휴가": "Cuối tuần, kỳ nghỉ", "지리 정보": "Địa lý", "직업과 진로": "Nghề nghiệp",
  "직장 생활": "Công sở", "집 구하기": "Tìm nhà", "집안일": "Việc nhà", "철학·윤리": "Triết học, đạo đức",
  "초대와 방문": "Mời, thăm hỏi", "취미": "Sở thích", "컴퓨터와 인터넷": "Máy tính, Internet", "하루 생활": "Sinh hoạt hằng ngày",
  "학교생활": "Trường học", "한국 생활": "Cuộc sống ở Hàn", "한국의 문학": "Văn học Hàn Quốc", "환경 문제": "Môi trường",
};
const SEMANTIC_VI = {
  "개념": "Khái niệm (số lượng, thời gian, vị trí…)", "경제 생활": "Kinh tế", "교육": "Giáo dục", "동식물": "Động thực vật",
  "문화": "Văn hóa", "사회 생활": "Xã hội", "삶": "Đời sống", "식생활": "Ăn uống", "의생활": "Trang phục", "인간": "Con người",
  "자연": "Tự nhiên", "정치와 행정": "Chính trị, hành chính", "종교": "Tôn giáo", "주생활": "Nhà ở",
};

const dir = process.argv[2];
if (!dir) throw new Error("Thiếu thư mục XML NIKL (xem đầu file)");
// Regex thay XML parser: 30000.xml có '<' trần trong giá trị thuộc tính nên parser chuẩn báo lỗi.
const FEAT = /<feat att="([^"]*)" val="([^"]*)"\s*\/>/g;
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const entries = new Map();
for (const name of readdirSync(dir).filter((n) => n.endsWith(".xml"))) {
  for (const chunk of readFileSync(join(dir, name), "utf8").split("<LexicalEntry").slice(1)) {
    const feats = [...chunk.split("</LexicalEntry>")[0].matchAll(FEAT)].map(([, a, v]) => [a, unescape(v)]);
    const get = (att) => feats.find(([a]) => a === att)?.[1];
    const word = get("writtenForm")?.trim();
    if (!word) continue;
    const list = entries.get(word) || [];
    list.push({
      level: get("vocabularyLevel"), pos: get("partOfSpeech"),
      subject: feats.find(([a]) => a === "subjectCategiory")?.[1], // NIKL viết sai chính tả tên thuộc tính
      semantic: get("semanticCategory")?.split(" > ")[0],
    });
    entries.set(word, list);
  }
}
if (entries.size < 40000) throw new Error(`Chỉ đọc được ${entries.size} mục, thiếu file XML?`);

const subdeckOf = (card, level) => {
  const posTag = card.tags?.find((t) => POS_KO[t]);
  const candidates = [...(entries.get((card.koreanText || card.frontText || "").trim()) || [])]
    // Đồng âm: ưu tiên đúng cấp độ, đúng từ loại, rồi mục có chủ đề.
    .sort((a, b) => (a.level !== level) - (b.level !== level) || (a.pos !== POS_KO[posTag]) - (b.pos !== POS_KO[posTag]) || !a.subject - !b.subject);
  const best = candidates[0];
  if (best?.subject) {
    if (!TOPIC_VI[best.subject]) throw new Error(`Chưa dịch chủ đề: ${best.subject}`);
    // "소개하기(가족 소개)" → "가족 소개" cho gọn tên.
    const ko = best.subject.replace(/-명절$/, "").replace(/^.*\((.+)\)$/, "$1");
    return `${TOPIC_VI[best.subject]} (${ko})`;
  }
  if (best?.semantic) return `Nhóm nghĩa::${SEMANTIC_VI[best.semantic] || best.semantic}`;
  // NIKL không phân loại: chia tiếp theo từ loại để bộ "Từ khác" không quá dài.
  return posTag ? `Từ khác::${posTag}` : "Từ khác::Khác";
};

for (const file of FILES) {
  const decks = JSON.parse(readFileSync(file, "utf8"));
  for (const [id, level] of Object.entries(DECKS)) {
    const deck = decks.find((d) => d.id === id);
    if (!deck) throw new Error(`Không thấy ${id} trong ${file}`);
    const stats = { topic: 0, semantic: 0, other: 0 };
    for (const card of deck.cards) {
      card.subdeck = subdeckOf(card, level);
      stats[card.subdeck.startsWith("Từ khác") ? "other" : card.subdeck.startsWith("Nhóm nghĩa::") ? "semantic" : "topic"] += 1;
    }
    console.log(`${file} ${id}: ${JSON.stringify(stats)} / ${deck.cards.length}`);
  }
  writeFileSync(file, JSON.stringify(decks, null, 2));
}

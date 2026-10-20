export interface HangeulChar {
  char: string;
  type: "consonant" | "vowel" | "batchim";
  name: string;
  romaja: string;
  pronunciationGuide: string;
  exampleWord: string;
  exampleMeaning: string;
}

export interface VocabularyItem {
  id: string;
  hangul: string;
  romaja: string;
  vietnamese: string;
  topic: string;
  level: "Sơ cấp" | "Trung cấp" | "TOPIK I" | "TOPIK II";
  exampleSentence: string;
  exampleTranslation: string;
}

export interface DictationLesson {
  id: string;
  title: string;
  level: string;
  audioText: string;
  translation: string;
  hints: string[];
  vocabulary: { word: string; meaning: string }[];
}

export interface ShadowingLesson {
  id: string;
  title: string;
  category: string;
  duration: string;
  lines: {
    speaker: string;
    hangul: string;
    romaja: string;
    vietnamese: string;
    startTime: number;
  }[];
}

export interface TopikQuestion {
  id: number;
  question: string;
  passage?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// 1. Hangeul Alphabet Dataset
export const HANGEUL_DATA: HangeulChar[] = [
  // Phụ âm đơn
  { char: "ㄱ", type: "consonant", name: "Giyeok (기역)", romaja: "g / k", pronunciationGuide: "Phát âm như chữ 'k' hoặc 'g' nhẹ", exampleWord: "가방 (Gabang)", exampleMeaning: "Cặp sách / Túi xách" },
  { char: "ㄴ", type: "consonant", name: "Nieun (니은)", romaja: "n", pronunciationGuide: "Phát âm như chữ 'n' trong tiếng Việt", exampleWord: "나무 (Namu)", exampleMeaning: "Cây cối" },
  { char: "ㄷ", type: "consonant", name: "Digeut (디귿)", romaja: "d / t", pronunciationGuide: "Phát âm như chữ 't' hoặc 'đ'", exampleWord: "다리 (Dari)", exampleMeaning: "Cây cầu / Cái chân" },
  { char: "ㄹ", type: "consonant", name: "Rieul (리을)", romaja: "r / l", pronunciationGuide: "Uốn lưỡi như 'r' hoặc 'l'", exampleWord: "라면 (Ramyeon)", exampleMeaning: "Mì ăn liền" },
  { char: "ㅁ", type: "consonant", name: "Mieum (미음)", romaja: "m", pronunciationGuide: "Phát âm như chữ 'm'", exampleWord: "모자 (Moja)", exampleMeaning: "Mũ / Nón" },
  { char: "ㅂ", type: "consonant", name: "Bieup (비읍)", romaja: "b / p", pronunciationGuide: "Phát âm như 'p' hoặc 'b'", exampleWord: "바다 (Bada)", exampleMeaning: "Biển" },
  { char: "ㅅ", type: "consonant", name: "Siot (시옷)", romaja: "s", pronunciationGuide: "Phát âm như chữ 's' nhẹ", exampleWord: "사랑 (Sarang)", exampleMeaning: "Tình yêu" },
  { char: "ㅇ", type: "consonant", name: "Ieung (이응)", romaja: "ng / câm", pronunciationGuide: "Đứng đầu câm, đứng cuối là 'ng'", exampleWord: "안녕 (Annyeong)", exampleMeaning: "Xin chào" },
  { char: "ㅈ", type: "consonant", name: "Jieut (지읒)", romaja: "j / ch", pronunciationGuide: "Phát âm như 'ch' hoặc 'j'", exampleWord: "지도 (Jido)", exampleMeaning: "Bản đồ" },
  { char: "ㅊ", type: "consonant", name: "Ch'ieut (치읓)", romaja: "ch'", pronunciationGuide: "Bật hơi mạnh chữ 'ch'", exampleWord: "치마 (Chima)", exampleMeaning: "Váy" },
  { char: "ㅋ", type: "consonant", name: "K'ieut (키읔)", romaja: "k'", pronunciationGuide: "Bật hơi mạnh chữ 'k'", exampleWord: "커피 (Keopi)", exampleMeaning: "Cà phê" },
  { char: "ㅌ", type: "consonant", name: "T'ieut (티읕)", romaja: "t'", pronunciationGuide: "Bật hơi mạnh chữ 't'", exampleWord: "택시 (Taeksi)", exampleMeaning: "Xe Taxi" },
  { char: "ㅍ", type: "consonant", name: "P'ieup (피읖)", romaja: "p'", pronunciationGuide: "Bật hơi mạnh chữ 'p'", exampleWord: "피자 (Pija)", exampleMeaning: "Bánh Pizza" },
  { char: "ㅎ", type: "consonant", name: "Hieut (히읗)", romaja: "h", pronunciationGuide: "Phát âm như chữ 'h'", exampleWord: "하늘 (Haneul)", exampleMeaning: "Bầu trời" },
  { char: "ㄲ", type: "consonant", name: "Ssang-Giyeok (쌍기역)", romaja: "kk", pronunciationGuide: "Phụ âm căng: siết nhẹ thanh quản, không bật hơi", exampleWord: "까치 (Kkachi)", exampleMeaning: "Chim ác là" },
  { char: "ㄸ", type: "consonant", name: "Ssang-Digeut (쌍디귿)", romaja: "tt", pronunciationGuide: "Phụ âm căng tương ứng với ㄷ", exampleWord: "딸기 (Ttalgi)", exampleMeaning: "Dâu tây" },
  { char: "ㅃ", type: "consonant", name: "Ssang-Bieup (쌍비읍)", romaja: "pp", pronunciationGuide: "Phụ âm căng tương ứng với ㅂ", exampleWord: "뽀뽀 (Ppoppo)", exampleMeaning: "Nụ hôn" },
  { char: "ㅆ", type: "consonant", name: "Ssang-Siot (쌍시옷)", romaja: "ss", pronunciationGuide: "Phụ âm căng tương ứng với ㅅ", exampleWord: "쌀 (Ssal)", exampleMeaning: "Gạo" },
  { char: "ㅉ", type: "consonant", name: "Ssang-Jieut (쌍지읒)", romaja: "jj", pronunciationGuide: "Phụ âm căng tương ứng với ㅈ", exampleWord: "짜다 (Jjada)", exampleMeaning: "Mặn" },

  // Nguyên âm đơn
  { char: "ㅏ", type: "vowel", name: "A", romaja: "a", pronunciationGuide: "Đọc như 'a' trong tiếng Việt", exampleWord: "아버지 (Abeoji)", exampleMeaning: "Bố / Cha" },
  { char: "ㅓ", type: "vowel", name: "Eo", romaja: "eo", pronunciationGuide: "Phát âm như chữ 'ơ' hoặc 'o' nhẹ", exampleWord: "어머니 (Eomeoni)", exampleMeaning: "Mẹ" },
  { char: "ㅗ", type: "vowel", name: "O", romaja: "o", pronunciationGuide: "Tròn môi phát âm chữ 'ô'", exampleWord: "오리 (Ori)", exampleMeaning: "Con vịt" },
  { char: "ㅜ", type: "vowel", name: "U", romaja: "u", pronunciationGuide: "Phát âm như chữ 'u'", exampleWord: "우유 (Uyu)", exampleMeaning: "Sữa tươi" },
  { char: "ㅡ", type: "vowel", name: "Eu", romaja: "eu", pronunciationGuide: "Dẹt môi phát âm chữ 'ư'", exampleWord: "으뜸 (Eutteum)", exampleMeaning: "Hàng đầu / Thượng hạng" },
  { char: "ㅣ", type: "vowel", name: "I", romaja: "i", pronunciationGuide: "Phát âm như chữ 'i'", exampleWord: "이빨 (Ippal)", exampleMeaning: "Răng" },
  { char: "ㅑ", type: "vowel", name: "Ya", romaja: "ya", pronunciationGuide: "Phát âm ghép 'y' + 'a' = 'ya'", exampleWord: "야구 (Yagu)", exampleMeaning: "Môn bóng chày" },
  { char: "ㅕ", type: "vowel", name: "Yeo", romaja: "yeo", pronunciationGuide: "Phát âm 'yơ' hoặc 'yo'", exampleWord: "여자 (Yeoja)", exampleMeaning: "Phụ nữ / Con gái" },
  { char: "ㅛ", type: "vowel", name: "Yo", romaja: "yo", pronunciationGuide: "Phát âm 'yô'", exampleWord: "요리 (Yori)", exampleMeaning: "Nấu ăn / Món ăn" },
  { char: "ㅠ", type: "vowel", name: "Yu", romaja: "yu", pronunciationGuide: "Phát âm 'yu'", exampleWord: "휴지 (Hyuji)", exampleMeaning: "Giấy vệ sinh" },
  { char: "ㅐ", type: "vowel", name: "Ae", romaja: "ae", pronunciationGuide: "Nguyên âm ghép, trong tiếng Hàn hiện đại thường gần âm ㅔ", exampleWord: "개 (Gae)", exampleMeaning: "Chó" },
  { char: "ㅒ", type: "vowel", name: "Yae", romaja: "yae", pronunciationGuide: "Ghép âm y với ㅐ", exampleWord: "얘기 (Yaegi)", exampleMeaning: "Câu chuyện" },
  { char: "ㅔ", type: "vowel", name: "E", romaja: "e", pronunciationGuide: "Nguyên âm ghép, trong tiếng Hàn hiện đại thường gần âm ㅐ", exampleWord: "네 (Ne)", exampleMeaning: "Vâng" },
  { char: "ㅖ", type: "vowel", name: "Ye", romaja: "ye", pronunciationGuide: "Ghép âm y với ㅔ", exampleWord: "예 (Ye)", exampleMeaning: "Vâng / Dạ" },
  { char: "ㅘ", type: "vowel", name: "Wa", romaja: "wa", pronunciationGuide: "Ghép ㅗ và ㅏ", exampleWord: "과일 (Gwa-il)", exampleMeaning: "Trái cây" },
  { char: "ㅙ", type: "vowel", name: "Wae", romaja: "wae", pronunciationGuide: "Ghép ㅗ và ㅐ", exampleWord: "왜 (Wae)", exampleMeaning: "Tại sao" },
  { char: "ㅚ", type: "vowel", name: "Oe", romaja: "oe", pronunciationGuide: "Ghép ㅗ và ㅣ; phát âm hiện đại gần âm oe/we", exampleWord: "외국 (Oeguk)", exampleMeaning: "Nước ngoài" },
  { char: "ㅝ", type: "vowel", name: "Wo", romaja: "wo", pronunciationGuide: "Ghép ㅜ và ㅓ", exampleWord: "원 (Won)", exampleMeaning: "Won Hàn Quốc" },
  { char: "ㅞ", type: "vowel", name: "We", romaja: "we", pronunciationGuide: "Ghép ㅜ và ㅔ", exampleWord: "웨이터 (Weiteo)", exampleMeaning: "Nhân viên phục vụ" },
  { char: "ㅟ", type: "vowel", name: "Wi", romaja: "wi", pronunciationGuide: "Ghép ㅜ và ㅣ", exampleWord: "위 (Wi)", exampleMeaning: "Phía trên" },
  { char: "ㅢ", type: "vowel", name: "Ui", romaja: "ui", pronunciationGuide: "Ghép ㅡ và ㅣ; cách đọc thay đổi theo vị trí trong từ", exampleWord: "의사 (Uisa)", exampleMeaning: "Bác sĩ" },
];

// 2. Sample Vocabulary Dataset
export const VOCABULARY_DATA: VocabularyItem[] = [
  { id: "v1", hangul: "안녕하세요", romaja: "Annyeonghaseyo", vietnamese: "Xin chào", topic: "Giao tiếp cơ bản", level: "Sơ cấp", exampleSentence: "안녕하세요! 저는 한국어를 배워요.", exampleTranslation: "Xin chào! Tôi đang học tiếng Hàn." },
  { id: "v2", hangul: "감사합니다", romaja: "Gamsahabnida", vietnamese: "Cảm ơn", topic: "Giao tiếp cơ bản", level: "Sơ cấp", exampleSentence: "도와주셔서 정말 감사합니다.", exampleTranslation: "Rất cảm ơn vì đã giúp đỡ tôi." },
  { id: "v3", hangul: "죄송합니다", romaja: "Joesonghabnida", vietnamese: "Xin lỗi", topic: "Giao tiếp cơ bản", level: "Sơ cấp", exampleSentence: "늦어서 정말 죄송합니다.", exampleTranslation: "Tôi thành thật xin lỗi vì đã đến muộn." },
  { id: "v4", hangul: "맛있어요", romaja: "Mas-isseoyo", vietnamese: "Ngon lắm", topic: "Ẩm thực", level: "Sơ cấp", exampleSentence: "이 김치찌개는 진짜 맛있어요!", exampleTranslation: "Món canh kim chi này thật sự rất ngon!" },
  { id: "v5", hangul: "얼마예요?", romaja: "Eolmayeyo?", vietnamese: "Bao nhiêu tiền?", topic: "Mua sắm", level: "Sơ cấp", exampleSentence: "이 사과 한 상자에 얼마예요?", exampleTranslation: "Một thùng táo này bao nhiêu tiền ạ?" },
  { id: "v6", hangul: "어디예요?", romaja: "Eodiyeyo?", vietnamese: "Ở đâu?", topic: "Du lịch", level: "Sơ cấp", exampleSentence: "화장실이 어디예요?", exampleTranslation: "Nhà vệ sinh ở đâu vậy ạ?" },
  { id: "v7", hangul: "행복하다", romaja: "Haengbokhada", vietnamese: "Hạnh phúc", topic: "Cảm xúc", level: "TOPIK I", exampleSentence: "가족과 함께 있어서 정말 행복해요.", exampleTranslation: "Tôi rất hạnh phúc khi ở bên gia đình." },
  { id: "v8", hangul: "열심히", romaja: "Yeolsimhi", vietnamese: "Chăm chỉ / Hết sức", topic: "Học tập", level: "TOPIK I", exampleSentence: "TOPIK 시험을 위해 열심히 공부해요.", exampleTranslation: "Tôi học tập chăm chỉ cho kỳ thi TOPIK." },
];

// 3. Dictation Lessons
export const DICTATION_DATA: DictationLesson[] = [
  {
    "id": "lesson_1",
    "title": "Bài 1: Đi tàu điện ngầm & Di chuyển",
    "level": "TOPIK 1",
    "audioText": "안녕하세요. Talk To Me In Korean의 유승환입니다. 오늘은 한국에서 가장 유명한 관광지 중에 한 곳을 가볼 거예요. 바로 경복궁입니다. 가보신 분들도 있을 것 같은데 경복궁은 옛날 왕들이 살면서 일했던 곳이에요. 미국의 백악관 같은 곳이라고 할 수 있어요. 어, 신호등 바뀌었다. 건너에 지금 그래서 지하철을 타러 가고 있습니다. 저는 지금 홍대 입구에 있고요. 제가 가야 할 곳은 여기 경복궁 여기예요. 그래서 하나, 둘, 셋, 넷, 다섯, 여섯, 일곱. 일곱 정거장을 가서 을지로 삼가역에서 이 주황색 선으로 갈아타야 돼요.",
    "translation": "Xin chào. Tôi là Yoo Seung-hwan từ Talk To Me In Korean. Hôm nay chúng ta sẽ đến thăm một trong những điểm du lịch nổi tiếng nhất ở Hàn Quốc. Đó chính là Cung điện Gyeongbokgung....",
    "hints": [
      "안녕하세요. Talk To Me In Korean의 유승환입니다.",
      "오늘은 한국에서 가장 유명한 관광지 중에 한 곳을 가볼 거예요.",
      "바로 경복궁입니다.",
      "가보신 분들도 있을 것 같은데"
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_2",
    "title": "Bài 2: Đi tàu điện ngầm & Di chuyển",
    "level": "TOPIK 1",
    "audioText": "그다음에 하나, 둘, 셋, 세 정거장을 더 가면 돼요. 신촌 쪽으로 가는 걸 타야겠네요. 홍대 입구에서 신촌으로 가는 걸 타야 되고 합정으로 가는 거 타면 안 돼요. 방금 을지로 삼가역에 내렸어요. 보시면 갈아타는 곳이라고 써 있고 화살표가 있죠? 이걸 따라가면 돼요. 이제 3호선 타는 곳에 거의 도착했어요. 경복궁 써 있네요. 경복궁역에 내렸어요. 경복궁역에서 경복궁과 가장 가까운 출구는 5번 출구예요. 그래서 5번 출구로 나가볼게요. 출구 찾는 방법.",
    "translation": "Sau đó đi thêm 1, 2, 3 trạm nữa là đến nơi. Tôi phải đi chuyến tàu hướng về phía Sinchon. Từ Hongdae đi Sinchon thì phải đón đúng hướng tàu,...",
    "hints": [
      "그다음에 하나, 둘, 셋, 세 정거장을 더 가면 돼요.",
      "신촌 쪽으로 가는 걸 타야겠네요.",
      "홍대 입구에서 신촌으로 가는 걸 타야 되고",
      "합정으로 가는 거 타면 안 돼요."
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_3",
    "title": "Bài 3: Tham quan Hoàng Cung 경복궁",
    "level": "TOPIK 1",
    "audioText": "일단 숫자를 먼저 찾아야 돼요. 여기 써 있네요. 5번 출구는 오른쪽으로 가라고 써 있어요. 경복궁도 써 있고요. 5번 출구로 나오면 이런 모습이에요. 헉! 잠깐만! 평일인데 이렇게 많다고 사람이? 저는 약간 텅 비어있을 줄 알았거든요. 와... 한국인 관광객도 많고 외국인 관광객도 많은 것 같아요. 아, 다들 뭔가 기다리고 있구나. 다들 여기 서 있는데 아마 10시에 뭔가 시작되는 것 같아요. 그래서 이렇게 다들 뭔가 기다리고 있어요. 도착한 장소. 네, 지금 표 사는 곳에 왔는데요.",
    "translation": "Trích đầu tiên là phải tìm con số trước. Nó có ghi ở đây rồi này. Biển chỉ dẫn ghi Cửa số 5 rẽ sang bên phải....",
    "hints": [
      "일단 숫자를 먼저 찾아야 돼요.",
      "여기 써 있네요.",
      "5번 출구는 오른쪽으로 가라고 써 있어요.",
      "경복궁도 써 있고요."
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_4",
    "title": "Bài 4: Tham quan Hoàng Cung 경복궁",
    "level": "TOPIK 3",
    "audioText": "줄을 서서 기다리고 있어요. 줄이 정말 길고 사람들도 정말 많아요. 안녕하세요. 어른 한 명이요. 감사합니다. 현금 되나요? 감사합니다. 혹시 근데 여기 몇 시까지 해요? 들어가시는 분은 5시까지. 5시까지 입장 가능해요? 알람은 6시까지. 아, 네. 알겠습니다. 감사합니다. 가위바위보. 네, 표를 현장 샀습니다. 이제 들어가 볼게요. 정신이 하나도 없는데. 보면 이렇게 한복을 입고 계신 분들이 많은데 이유가 있어요. 한복을 입으면 경복궁에 무료로 입장할 수 있어요. 그래서 저는 3천 원을 내고 들어왔지만 한복을 입고 있으면 이 3천 원을 내지 않아도 여기 들어올 수 있어요. 그래서 경복궁에 오면 한복 입은 사람들을 정말 많이 볼 수 있어요. 이게 경복궁에서 가장 큰 건물인데",
    "translation": "Tôi đang đứng xếp hàng chờ tới lượt. Hàng người rất dài và đông đúc. Xin chào ạ....",
    "hints": [
      "줄을 서서 기다리고 있어요.",
      "줄이 정말 길고 사람들도 정말 많아요.",
      "안녕하세요.",
      "어른 한 명이요."
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_5",
    "title": "Bài 5: Luyện nghe giao tiếp #5",
    "level": "TOPIK 3",
    "audioText": "아마 한국 사람들이 궁하면 제일 먼저 떠올리는 게 이런 이미지일 거예요. 아는 이렇게 생겼어요. 다른 분들도 보셔야 되니까 너무 한 자리에 오래 있으면 안 될 것 같아요. 제 기억에는 저쪽에 호수 같은 게 있었거든요. 그쪽으로 한번 가볼게요. 사진 찍어줄까요? 좀 모여보세요. 하나, 둘, 셋. 한번 더 찍을게요. 가로로. 하나, 둘, 셋. 네, 여기요. 감사합니다. 중학생인 것 같은데 셀카로만 찍고 있어서 찍어줬어요. 수학여행으로 온 것 같아요. 아까 큰 건물인 근정전에서 왼쪽으로 오면 작은 공원과 연못이 있어요.",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "아마 한국 사람들이",
      "궁하면 제일 먼저 떠올리는 게",
      "이런 이미지일 거예요.",
      "아는 이렇게 생겼어요."
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_6",
    "title": "Bài 6: Tham quan Hoàng Cung 경복궁",
    "level": "TOPIK 3",
    "audioText": "여기도 사진 찍기가 정말 좋아서 보시면 벌써 많은 사람들이 서 있네요. 여기 이런 연못이 있고 그리고 여기 있는 버드나무가 이 곳이랑 너무 잘 어울려요. 사진 좀 찍어드릴까? 사진 찍어드릴까요 두 분? 사진 찍어드릴까요? 핸드폰 주시면 제가 찍어드릴게요. 네, 저 주세요. 하나, 둘, 셋. 네. 사진을 아주 예쁘게 잘 찍어드려서 되게 만족스러워 하실 것 같아요. 여러분 경복궁 오셔서 진짜 저 메인 건물만 보고 그냥 가면 안 돼요. 여기 꼭 오셔야 돼요. 지금 벤치에 앉아서 쉬고 있는데 아까 혹시 배고파지면 먹으려고 가져왔던 간식이 생각나서 이거 아세요? 발리에 갔던 회사 동료분이 사오셨어요. 근데 너무 맛있는 거예요 진짜. 다른 동료분들 못 먹고 제가 다 먹은 것 같아요 거의. 진짜 맛있죠. 두 개 먹을 거예요.",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "여기도 사진 찍기가 정말 좋아서",
      "보시면 벌써 많은 사람들이 서 있네요.",
      "여기 이런 연못이 있고",
      "그리고 여기 있는 버드나무가"
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_7",
    "title": "Bài 7: Tham quan Hoàng Cung 경복궁",
    "level": "TOPIK 3",
    "audioText": "이게 날아가서 다시 주었어요. 요즘 아침에는 춥고 낮에는 조금 덥고 저녁에는 다시 춥고 이래요. 오늘 아침 서울 기온이 7도였어요. 지금은 17도예요. 하루 중에 제일 낮은 온도랑 제일 높은 온도의 차이를 이루고 차이를 일교차 라고 하는데 요즘 일교차가 진짜 커요. 감기 조심해야 돼요. 보시면 저도 아까는 겉옷을 입고 있었는데 지금은 벗고 팔도 겉옷 잖아요. 겉옷도 항상 챙겨 다녀야 돼요. 그래도 요즘 날씨가 제일 좋아요. 밖에 돌아다니기. 여름엔 너무 춥고 겨울... 여름엔 너무 덥고 겨울엔 너무 춥고 이래서 지금이 진짜 딱 좋아요. 이제 경복궁 밖으로 나가서 광화문 광장 쪽으로 가보려고 해요. 거기에도 볼 게 좀 있어요. 되게 큰 서점도 있고 최종대왕 이순신 장군 동상도 있고 가볼게요. 이렇게 광화문을 나왔어요. 나오면 바로 이렇게 높은 건물들이 보여요.",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "이게 날아가서 다시 주었어요.",
      "요즘 아침에는 춥고 낮에는 조금 덥고",
      "저녁에는 다시 춥고 이래요.",
      "오늘 아침 서울 기온이 7도였어요."
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_8",
    "title": "Bài 8: Tham quan Hoàng Cung 경복궁",
    "level": "TOPIK 6",
    "audioText": "그리고 앞에 뻥 뚫린 이곳이 광화문 광장이에요. 신호를 기다리고 있어요. 건물 때문에? 촬영하지 말라고요? 방금 어떤 경원 같은 분이 오셔서 촬영하면 안 된다고 해서 카메라를 잠깐 껐었는데 그때 경찰 오토바이랑 검은 차들이 지나갔거든요. 되게 중요한 사람이 타고 있었나 봐요. 그 경원분한테도 물어봤어요. 누구냐고. 근데 말해줄 수 없다고 했어요. 와 햇빛 오늘 아침에 선크림을 발랐는데 아주 잘한 선택 같아요. 안 발랐으면 얼굴이 좀 탔을 것 같아요. 여기 최종대왕님의 동상이 있어요. 최종대왕은 한글을 만든 사람이죠. 한글 만들어주셔서 감사합니다. 여기 옆에 보면 이렇게 자음과 모음이 써있어요.",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "그리고 앞에 뻥 뚫린 이곳이",
      "광화문 광장이에요.",
      "신호를 기다리고 있어요.",
      "건물 때문에?"
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_9",
    "title": "Bài 9: Đi tàu điện ngầm & Di chuyển",
    "level": "TOPIK 1",
    "audioText": "다 읽을 수 있죠? 오 해시계다. 요즘 사람들 이거 읽을 줄 모를 텐데. 몇시냐면 지금 11시 43분이네요 딱. 어렵지 않아요 해시계 읽는 방법. 다음에 알려드릴게요. 여기 지나가도 돼요? 네! 아기들 진짜 좋아하겠다. 최종대왕님을 지나서 광화문역 쪽으로 더 가까이 오면 이제 이분이 계십니다. 이순신 장군님인데 한국 사람들이라면 모를 수가 없는 분이에요. 그리고 이게 바로 이순신 장군님이 만드신 거북선. 거북이 모양처럼 생겨서 거북선이에요. 공연하는데 지나다니면 안 돼.",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "다 읽을 수 있죠?",
      "오 해시계다.",
      "요즘 사람들 이거 읽을 줄 모를 텐데.",
      "몇시냐면 지금"
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_10",
    "title": "Bài 10: Đi tàu điện ngầm & Di chuyển",
    "level": "TOPIK 1",
    "audioText": "광화문 광장에 오면 또 쉽게 볼 수 있는 게 바로 이 경찰 버스예요. 그 이유는 광화문 광장에서 시위를 많이 해요. 그래서 저기도 보면 경찰 버스들이 있죠? 시위가 많아서 경찰들도 많습니다. 광화문 하면 또 유명한 게 바로 이 교보문고예요. 교보문고는 서점인데 광화문에서 유명한 장소 중 하나예요. 되게 커요. 그리고 지하철역과 연결되어 있어서 쉽게 찾아갈 수 있어요. 출구, 입소 여기는 나오는 문 여기는 들어가는 문 그리고 여기 왔으니까 우리 책을 찾아보자. Talk to me in Korean 책. 여기서 책을 검색해볼게요. 바로 나오네. 여기서 나오죠? 재고 5개 지금 5번이 있다는 뜻이고 Print 하기를 누르면 이렇게 나와요. 한국어 책은 지금",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "광화문 광장에 오면 또",
      "쉽게 볼 수 있는 게 바로",
      "이 경찰 버스예요.",
      "그 이유는"
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_11",
    "title": "Bài 11: Luyện nghe giao tiếp #11",
    "level": "TOPIK 5",
    "audioText": "G0부터 E에 있고 G가 여기 있네요. 제가 있는 곳이 여기니까 오른쪽으로 쭉 가서 코너를 돌면 책을 찾을 수 있을 것 같아요. G, 외국어 외국어 섹션에 있나봐요. 한국어는 저한테 모국어지만 한국어를 배우는 사람한테는 외국어니까 한국어 교제 바로 있네. 여기서 제가 추천하는 책은 이거 이거 이거 이거 우리 책 아니고 이거 이거 다들 좋은 주인 만나서 행복하게 살아. 방금 서점 직원분들의 이야기를 엿들었는데 한국어 책이 잘 나간대요. 그래서 기분이 좋아졌어요. 여러분 책 많이 사서 많이 공부하세요.",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "G0부터 E에 있고",
      "G가 여기 있네요.",
      "제가 있는 곳이 여기니까",
      "오른쪽으로 쭉 가서"
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_12",
    "title": "Bài 12: Ăn uống & Mua sắm",
    "level": "TOPIK 6",
    "audioText": "안녕하세요. 아니요. 괜찮아요. 공부 회원 있으세요? 아니요. 아니지. 420원 하겠습니다. 네. 주차 안 했어요. 주차 안 했어요. 카드 챙겨주시고 영수증 드릴게요. 네. 감사합니다. 마침 읽고 싶은 게 있어서 한 건 샀어요. 이제 점심시간이라서 뭔가 먹어야겠어요. 배고파. 샌드위치를 포장해서 천계천에서 먹을 생각이에요. 샌드위치 먹으려고 했는데 김밥집을 발견했거든요. 맛있어 보여서 메뉴를 바꾸려고 해요. 김밥 4천원에서 5천원 6천원까지 다양하게 있어요. 안녕하세요. 이거 하나요. 손 씌워가는 거죠? 아니요. 가져가요. 감사합니다. 저는 김밥을 테이크아웃해서",
    "translation": "Xin chào ạ. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "안녕하세요.",
      "아니요. 괜찮아요.",
      "공부 회원 있으세요?",
      "아니요."
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_13",
    "title": "Bài 13: Tham quan Hoàng Cung 경복궁",
    "level": "TOPIK 1",
    "audioText": "천계천에 왔습니다. 여기서 먹을 거예요. 경복궁, 광암광장 그리고 천계천까지 다 가까이 붙어있어요. 그래서 이렇게 걸으면서 둘러보기에 정말 좋아요. 이 근처에 회사도 되게 많아서 점심 먹고 산책하는 직장인들도 되게 있어요. 메뉴 이름은 에듬치즈김밥이에요. 에듬치즈가 뭐지? 치즈 종류인가? 치즈 맛이 좀 딱조름하네요. 이 천계천은 낮에도 좋고 밤에도 좋아요. 걷기도 좋고 앉아서 얘기하기도 좋고. 천계천의 단점 하나는 물가나서 약간 벌레들이 많아요. 그래서 되게 작은 벌레들. 근데 원래는 여기가 도로였대요. 지금 이렇게 물이 흘러다니지만 옛날에는",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "천계천에 왔습니다.",
      "여기서 먹을 거예요.",
      "경복궁, 광암광장",
      "그리고 천계천까지"
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  },
  {
    "id": "lesson_14",
    "title": "Bài 14: Ăn uống & Mua sắm",
    "level": "TOPIK 6",
    "audioText": "차가 지나다니는 도로였대요. 이 물이 도로 밑에서 흐르던 거죠. 지금은 도로를 다 없애고 천계천을 이렇게 볼 수 있게 됐는데 그래서 좋은 것 같아요. 이제 한두 달만 지나도 이렇게 밖에 나와서 밥 먹는 거 못해요. 추워서. 날씨 좋을 때 자두자두 나와야 돼요. 오! 비둘기가 날아다녀. 벌레 좀 먹어조라. 비둘기야. 벌레 좀 많이 먹어줘. 여러분 오늘 영상이 재밌으셨다면 그리고 한국어 공부에 도움이 되셨다면 알려주세요. 좋아요 눌러주시고 댓글도 달아주시고 또 이런 영상 많이 찍어볼게요. 감사합니다.",
    "translation": "Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh. Luyện nghe chép chính tả tiếng Hàn thực tế theo ngữ cảnh....",
    "hints": [
      "차가 지나다니는",
      "도로였대요.",
      "이 물이 도로 밑에서",
      "흐르던 거죠."
    ],
    "vocabulary": [
      {
        "word": "지하철",
        "meaning": "Tàu điện ngầm"
      },
      {
        "word": "경복궁",
        "meaning": "Cung điện Gyeongbokgung"
      },
      {
        "word": "관광지",
        "meaning": "Địa điểm du lịch"
      }
    ]
  }
];

// 4. Shadowing Lessons
export const SHADOWING_DATA: ShadowingLesson[] = [
  {
    "id": "lesson_1",
    "title": "Bài 1: Đi tàu điện ngầm & Di chuyển",
    "category": "TOPIK 1 - TOPIK 1",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "안녕하세요. Talk To Me In Korean의 유승환입니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin chào. Tôi là Yoo Seung-hwan từ Talk To Me In Korean.",
        "startTime": 0.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "오늘은 한국에서 가장 유명한 관광지 중에 한 곳을 가볼 거예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Hôm nay chúng ta sẽ đến thăm một trong những điểm du lịch nổi tiếng nhất ở Hàn Quốc.",
        "startTime": 3.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "바로 경복궁입니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Đó chính là Cung điện Gyeongbokgung.",
        "startTime": 9.4
      },
      {
        "speaker": "Seunghwan",
        "hangul": "가보신 분들도 있을 것 같은데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Chắc hẳn cũng có nhiều bạn đã từng đến đây rồi.",
        "startTime": 12.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경복궁은 옛날 왕들이 살면서 일했던 곳이에요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Gyeongbokgung là nơi các nhà vua thời xưa từng sống và làm việc.",
        "startTime": 16.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "미국의 백악관 같은 곳이라고 할 수 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Có thể nói nơi này giống như Nhà Trắng của Mỹ vậy.",
        "startTime": 21.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "어, 신호등 바뀌었다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Ơ, đèn giao thông chuyển màu rồi.",
        "startTime": 26.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "건너에 지금 그래서 지하철을 타러 가고 있습니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Tôi đang băng qua đường để đi sang ga tàu điện ngầm.",
        "startTime": 29.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "저는 지금 홍대 입구에 있고요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Hiện tại tôi đang ở trạm Hongdae Entrance.",
        "startTime": 51.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "제가 가야 할 곳은 여기 경복궁 여기예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Nơi tôi cần đến là trạm Gyeongbokgung ở đây.",
        "startTime": 55.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 하나, 둘, 셋, 넷, 다섯, 여섯, 일곱.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Vì vậy: 1, 2, 3, 4, 5, 6, 7.",
        "startTime": 60.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "일곱 정거장을 가서 을지로 삼가역에서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Đi qua 7 trạm rồi tại trạm Euljiro 3-ga,",
        "startTime": 68.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이 주황색 선으로 갈아타야 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "tôi phải đổi sang tuyến màu cam này.",
        "startTime": 73.1
      }
    ]
  },
  {
    "id": "lesson_2",
    "title": "Bài 2: Đi tàu điện ngầm & Di chuyển",
    "category": "TOPIK 1 - TOPIK 1",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "그다음에 하나, 둘, 셋, 세 정거장을 더 가면 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Sau đó đi thêm 1, 2, 3 trạm nữa là đến nơi.",
        "startTime": 77.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "신촌 쪽으로 가는 걸 타야겠네요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Tôi phải đi chuyến tàu hướng về phía Sinchon.",
        "startTime": 82.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "홍대 입구에서 신촌으로 가는 걸 타야 되고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Từ Hongdae đi Sinchon thì phải đón đúng hướng tàu,",
        "startTime": 85.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "합정으로 가는 거 타면 안 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "không được lên chuyến đi về hướng Hapjeong.",
        "startTime": 92.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "방금 을지로 삼가역에 내렸어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Tôi vừa mới xuống ở trạm Euljiro 3-ga.",
        "startTime": 103.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "보시면 갈아타는 곳이라고 써 있고 화살표가 있죠?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Nếu bạn nhìn kìa, có biển ghi 'Nơi đổi tàu' và mũi tên hướng dẫn đúng không?",
        "startTime": 106.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이걸 따라가면 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Chỉ cần đi theo mũi tên này là được.",
        "startTime": 109.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이제 3호선 타는 곳에 거의 도착했어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Giờ tôi đã sắp tới nơi đón Tuyến số 3 rồi.",
        "startTime": 114.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경복궁 써 있네요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Có chữ Gyeongbokgung ghi trên biển kìa.",
        "startTime": 119.4
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경복궁역에 내렸어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Tôi đã xuống tại ga Gyeongbokgung.",
        "startTime": 135.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경복궁역에서 경복궁과 가장 가까운 출구는 5번 출구예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Cửa ra gần Cung điện Gyeongbokgung nhất ở ga này là Cửa số 5.",
        "startTime": 138.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 5번 출구로 나가볼게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Vì vậy tôi sẽ đi ra theo Cửa số 5.",
        "startTime": 144.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "출구 찾는 방법.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Cách tìm cửa ra.",
        "startTime": 151.8
      }
    ]
  },
  {
    "id": "lesson_3",
    "title": "Bài 3: Tham quan Hoàng Cung 경복궁",
    "category": "TOPIK 1 - TOPIK 1",
    "duration": "01:21",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "일단 숫자를 먼저 찾아야 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Trích đầu tiên là phải tìm con số trước.",
        "startTime": 153.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기 써 있네요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Nó có ghi ở đây rồi này.",
        "startTime": 156.4
      },
      {
        "speaker": "Seunghwan",
        "hangul": "5번 출구는 오른쪽으로 가라고 써 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Biển chỉ dẫn ghi Cửa số 5 rẽ sang bên phải.",
        "startTime": 158.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경복궁도 써 있고요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Và cũng có ghi cả chữ Gyeongbokgung nữa.",
        "startTime": 161.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "5번 출구로 나오면 이런 모습이에요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Khi đi ra theo Cửa số 5 thì quang cảnh sẽ như thế này.",
        "startTime": 165.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "헉! 잠깐만!",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Hơ! Chờ chút đã!",
        "startTime": 169.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "평일인데 이렇게 많다고 사람이?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Hôm nay là ngày thường mà sao đông người thế này?",
        "startTime": 172.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "저는 약간 텅 비어있을 줄 알았거든요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Tôi cứ tưởng là nơi này sẽ vắng vẻ cơ.",
        "startTime": 175.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "와...",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Woa...",
        "startTime": 179.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한국인 관광객도 많고 외국인 관광객도 많은 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Có vẻ như cả du khách Hàn Quốc và du khách nước ngoài đều rất đông.",
        "startTime": 181.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아, 다들 뭔가 기다리고 있구나.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "À, hóa ra mọi người đang đứng chờ điều gì đó.",
        "startTime": 187.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "다들 여기 서 있는데 아마 10시에 뭔가 시작되는 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Mọi người đứng ở đây có lẽ vì đúng 10 giờ sẽ có nghi lễ bắt đầu.",
        "startTime": 192.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 이렇게 다들 뭔가 기다리고 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Cho nên ai nấy đều đang đứng kiên nhẫn chờ đợi.",
        "startTime": 197.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "도착한 장소.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Địa điểm đã đến.",
        "startTime": 220.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네, 지금 표 사는 곳에 왔는데요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Vâng, hiện tại tôi đã tới khu vực quầy bán vé.",
        "startTime": 233.6
      }
    ]
  },
  {
    "id": "lesson_4",
    "title": "Bài 4: Tham quan Hoàng Cung 경복궁",
    "category": "TOPIK 3 - TOPIK 3",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "줄을 서서 기다리고 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Tôi đang đứng xếp hàng chờ tới lượt.",
        "startTime": 235.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "줄이 정말 길고 사람들도 정말 많아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Hàng người rất dài và đông đúc.",
        "startTime": 239.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "안녕하세요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin chào ạ.",
        "startTime": 242.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "어른 한 명이요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Cho tôi 1 vé người lớn ạ.",
        "startTime": 246.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin cảm ơn.",
        "startTime": 247.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "현금 되나요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Có dùng tiền mặt được không ạ?",
        "startTime": 249.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin cảm ơn.",
        "startTime": 253.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "혹시 근데 여기 몇 시까지 해요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Cho tôi hỏi ở đây mở cửa đến mấy giờ ạ?",
        "startTime": 254.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "들어가시는 분은 5시까지.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Khách vào tham quan thì nhận lượt đến 5 giờ chiều ạ.",
        "startTime": 256.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "5시까지 입장 가능해요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Có thể vào cửa cho đến 5 giờ chiều đúng không ạ?",
        "startTime": 258.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "알람은 6시까지.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Vâng, và đóng cửa hoàn toàn lúc 6 giờ.",
        "startTime": 260.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아, 네. 알겠습니다. 감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "À vâng, tôi hiểu rồi. Xin cảm ơn ạ.",
        "startTime": 261.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "가위바위보.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Oẳn tù tì nào.",
        "startTime": 263.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네, 표를 현장 샀습니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Vâng, tôi đã mua vé trực tiếp tại quầy.",
        "startTime": 264.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이제 들어가 볼게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Bây giờ tôi sẽ đi vào bên trong.",
        "startTime": 266.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "정신이 하나도 없는데.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Nhiều người quá làm tôi hơi choáng ngợp.",
        "startTime": 277.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "보면 이렇게 한복을 입고 계신 분들이 많은데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Nhìn quanh thấy có rất nhiều người mặc trang phục Hanbok,",
        "startTime": 280.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이유가 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "điều này đều có lý do cả đấy.",
        "startTime": 284.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한복을 입으면 경복궁에 무료로 입장할 수 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Nếu bạn mặc Hanbok thì sẽ được vào cửa Cung điện Gyeongbokgung hoàn toàn miễn phí.",
        "startTime": 285.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 저는 3천 원을 내고 들어왔지만",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Cho nên mặc dù tôi vừa phải trả 3.000 Won mua vé,",
        "startTime": 290.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한복을 입고 있으면 이 3천 원을 내지 않아도",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "nhưng nếu mặc Hanbok thì bạn không cần tốn 3.000 Won này",
        "startTime": 295.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기 들어올 수 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "mà vẫn có thể vào thẳng bên trong.",
        "startTime": 298.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 경복궁에 오면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Vì thế khi đến Cung điện Gyeongbokgung,",
        "startTime": 300.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한복 입은 사람들을 정말 많이 볼 수 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "bạn sẽ bắt gặp rất nhiều người mặc trang phục Hanbok truyền thống.",
        "startTime": 302.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이게 경복궁에서 가장 큰 건물인데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Đây là tòa nhà lớn nhất trong Cung điện Gyeongbokgung.",
        "startTime": 307.0
      }
    ]
  },
  {
    "id": "lesson_5",
    "title": "Bài 5: Luyện nghe giao tiếp #5",
    "category": "TOPIK 3 - TOPIK 3",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "아마 한국 사람들이",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 311.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "궁하면 제일 먼저 떠올리는 게",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 314.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이런 이미지일 거예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 317.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아는 이렇게 생겼어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 324.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "다른 분들도 보셔야 되니까",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 330.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "너무 한 자리에 오래 있으면 안 될 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 333.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "제 기억에는 저쪽에 호수 같은 게 있었거든요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 336.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그쪽으로 한번 가볼게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 341.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "사진 찍어줄까요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 352.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "좀 모여보세요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 356.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "하나, 둘, 셋.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 359.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한번 더 찍을게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 361.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "가로로.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 363.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "하나, 둘, 셋.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 365.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네, 여기요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 367.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin cảm ơn.",
        "startTime": 369.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "중학생인 것 같은데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 371.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "셀카로만 찍고 있어서 찍어줬어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 373.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "수학여행으로 온 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 378.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아까 큰 건물인 근정전에서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 380.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "왼쪽으로 오면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 383.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "작은 공원과 연못이 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 385.2
      }
    ]
  },
  {
    "id": "lesson_6",
    "title": "Bài 6: Tham quan Hoàng Cung 경복궁",
    "category": "TOPIK 3 - TOPIK 3",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "여기도 사진 찍기가 정말 좋아서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 388.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "보시면 벌써 많은 사람들이 서 있네요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 390.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기 이런 연못이 있고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 394.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그리고 여기 있는 버드나무가",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 397.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이 곳이랑 너무 잘 어울려요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 400.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "사진 좀 찍어드릴까?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 404.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "사진 찍어드릴까요 두 분?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 406.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "사진 찍어드릴까요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 408.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "핸드폰 주시면 제가 찍어드릴게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 410.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네, 저 주세요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 414.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "하나, 둘, 셋.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 416.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 420.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "사진을 아주 예쁘게 잘 찍어드려서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 422.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "되게 만족스러워 하실 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 426.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여러분 경복궁 오셔서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 428.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "진짜 저 메인 건물만 보고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 430.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그냥 가면 안 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 432.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기 꼭 오셔야 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 435.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지금 벤치에 앉아서 쉬고 있는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 437.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아까 혹시 배고파지면 먹으려고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 441.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "가져왔던 간식이 생각나서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 445.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이거 아세요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 449.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "발리에 갔던 회사 동료분이",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 451.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "사오셨어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 453.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "근데 너무 맛있는 거예요 진짜.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 455.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "다른 동료분들 못 먹고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 457.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "제가 다 먹은 것 같아요 거의.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 459.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "진짜 맛있죠.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 461.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "두 개 먹을 거예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 463.4
      }
    ]
  },
  {
    "id": "lesson_7",
    "title": "Bài 7: Tham quan Hoàng Cung 경복궁",
    "category": "TOPIK 3 - TOPIK 3",
    "duration": "01:19",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "이게 날아가서 다시 주었어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 472.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "요즘 아침에는 춥고 낮에는 조금 덥고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 479.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "저녁에는 다시 춥고 이래요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 483.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "오늘 아침 서울 기온이 7도였어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 487.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지금은 17도예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 491.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "하루 중에 제일 낮은 온도랑",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 493.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "제일 높은 온도의 차이를 이루고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 495.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "차이를 일교차 라고 하는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 499.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "요즘 일교차가 진짜 커요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 503.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "감기 조심해야 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 505.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "보시면 저도 아까는 겉옷을 입고 있었는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 507.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지금은 벗고 팔도 겉옷 잖아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 511.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "겉옷도 항상 챙겨 다녀야 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 515.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래도 요즘 날씨가 제일 좋아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 517.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "밖에 돌아다니기.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 519.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여름엔 너무 춥고 겨울...",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 521.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여름엔 너무 덥고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 523.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "겨울엔 너무 춥고 이래서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 525.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지금이 진짜 딱 좋아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 528.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이제 경복궁 밖으로 나가서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 530.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "광화문 광장 쪽으로 가보려고 해요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 532.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "거기에도 볼 게 좀 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 536.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "되게 큰 서점도 있고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 538.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "최종대왕 이순신 장군 동상도 있고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 540.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "가볼게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 542.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이렇게 광화문을 나왔어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 544.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "나오면 바로 이렇게 높은 건물들이 보여요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 546.1
      }
    ]
  },
  {
    "id": "lesson_8",
    "title": "Bài 8: Tham quan Hoàng Cung 경복궁",
    "category": "TOPIK 6 - TOPIK 6",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "그리고 앞에 뻥 뚫린 이곳이",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 552.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "광화문 광장이에요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 554.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "신호를 기다리고 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 565.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "건물 때문에?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 568.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "촬영하지 말라고요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 572.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "방금 어떤 경원 같은 분이 오셔서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 574.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "촬영하면 안 된다고 해서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 576.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "카메라를 잠깐 껐었는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 580.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그때 경찰 오토바이랑",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 582.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "검은 차들이 지나갔거든요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 586.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "되게 중요한 사람이 타고 있었나 봐요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 590.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그 경원분한테도 물어봤어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 594.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "누구냐고.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 596.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "근데 말해줄 수 없다고 했어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 598.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "와 햇빛",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 600.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "오늘 아침에 선크림을 발랐는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 604.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아주 잘한 선택 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 606.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "안 발랐으면 얼굴이 좀 탔을 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 608.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기 최종대왕님의 동상이 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 614.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "최종대왕은 한글을 만든 사람이죠.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 616.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한글 만들어주셔서 감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 620.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기 옆에 보면 이렇게",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 624.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "자음과 모음이 써있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 626.3
      }
    ]
  },
  {
    "id": "lesson_9",
    "title": "Bài 9: Đi tàu điện ngầm & Di chuyển",
    "category": "TOPIK 1 - TOPIK 1",
    "duration": "01:26",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "다 읽을 수 있죠?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 628.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "오 해시계다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 633.1
      },
      {
        "speaker": "Seunghwan",
        "hangul": "요즘 사람들 이거 읽을 줄 모를 텐데.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 640.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "몇시냐면 지금",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 646.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "11시 43분이네요 딱.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 650.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "어렵지 않아요 해시계 읽는 방법.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 653.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "다음에 알려드릴게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 655.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기 지나가도 돼요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 657.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네!",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 659.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아기들 진짜 좋아하겠다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 667.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "최종대왕님을 지나서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 673.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "광화문역 쪽으로 더 가까이 오면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 675.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이제 이분이 계십니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 677.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이순신 장군님인데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 681.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한국 사람들이라면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 683.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "모를 수가 없는 분이에요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 685.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그리고 이게 바로",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 687.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이순신 장군님이 만드신 거북선.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 692.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "거북이 모양처럼 생겨서 거북선이에요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 694.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "공연하는데 지나다니면 안 돼.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 700.5
      }
    ]
  },
  {
    "id": "lesson_10",
    "title": "Bài 10: Đi tàu điện ngầm & Di chuyển",
    "category": "TOPIK 1 - TOPIK 1",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "광화문 광장에 오면 또",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 716.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "쉽게 볼 수 있는 게 바로",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 718.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이 경찰 버스예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 720.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그 이유는",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 722.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "광화문 광장에서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 724.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "시위를 많이 해요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 726.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 저기도 보면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 728.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경찰 버스들이 있죠?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 730.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "시위가 많아서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 732.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경찰들도 많습니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 734.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "광화문 하면 또 유명한 게",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 736.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "바로 이 교보문고예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 738.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "교보문고는 서점인데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 740.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "광화문에서 유명한",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 742.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "장소 중 하나예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 744.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "되게 커요. 그리고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 746.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지하철역과 연결되어 있어서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 748.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "쉽게 찾아갈 수 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 750.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "출구, 입소",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 752.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기는 나오는 문",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 758.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기는 들어가는 문",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 760.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그리고 여기 왔으니까",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 764.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "우리 책을 찾아보자.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 766.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "Talk to me in Korean 책.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 768.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기서 책을 검색해볼게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 770.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "바로 나오네.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 774.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 778.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "나오죠? 재고 5개",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 780.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지금 5번이 있다는 뜻이고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 782.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "Print 하기를 누르면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 784.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이렇게 나와요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 786.6
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한국어 책은 지금",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 790.5
      }
    ]
  },
  {
    "id": "lesson_11",
    "title": "Bài 11: Luyện nghe giao tiếp #11",
    "category": "TOPIK 5 - TOPIK 5",
    "duration": "01:15",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "G0부터 E에 있고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 792.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "G가 여기 있네요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 794.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "제가 있는 곳이 여기니까",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 796.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "오른쪽으로 쭉 가서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 798.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "코너를 돌면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 800.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "책을 찾을 수 있을 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 802.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "G, 외국어",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 804.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "외국어 섹션에 있나봐요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 806.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한국어는 저한테 모국어지만",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 808.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한국어를 배우는 사람한테는",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 810.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "외국어니까",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 812.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한국어 교제",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 814.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "바로 있네.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 816.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기서 제가 추천하는 책은",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 818.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이거",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 820.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이거",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 822.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이거",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 824.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이거",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 826.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "우리 책 아니고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 828.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이거",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 830.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이거",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 832.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "다들 좋은 주인 만나서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 834.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "행복하게 살아.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 841.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "방금",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 843.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "서점 직원분들의 이야기를",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 845.9
      },
      {
        "speaker": "Seunghwan",
        "hangul": "엿들었는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 850.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한국어 책이 잘 나간대요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 852.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 854.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "기분이 좋아졌어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 856.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여러분 책 많이 사서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 858.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "많이 공부하세요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 860.0
      }
    ]
  },
  {
    "id": "lesson_12",
    "title": "Bài 12: Ăn uống & Mua sắm",
    "category": "TOPIK 6 - TOPIK 6",
    "duration": "01:16",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "안녕하세요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin chào ạ.",
        "startTime": 868.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아니요. 괜찮아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 870.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "공부 회원 있으세요?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 872.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아니요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 874.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아니지. 420원 하겠습니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 876.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 878.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "주차 안 했어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 880.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "주차 안 했어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 882.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "카드 챙겨주시고 영수증 드릴게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 884.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "네.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 886.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin cảm ơn.",
        "startTime": 888.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "마침 읽고 싶은 게 있어서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 890.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "한 건 샀어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 892.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이제 점심시간이라서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 894.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "뭔가 먹어야겠어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 896.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "배고파.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 898.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "샌드위치를",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 900.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "포장해서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 902.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "천계천에서 먹을",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 904.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "생각이에요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 906.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "샌드위치 먹으려고 했는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 908.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "김밥집을 발견했거든요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 910.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "맛있어 보여서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 912.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "메뉴를 바꾸려고 해요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 914.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "김밥",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 916.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "4천원에서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 918.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "5천원",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 920.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "6천원까지 다양하게 있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 922.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "안녕하세요. 이거 하나요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 924.2
      },
      {
        "speaker": "Seunghwan",
        "hangul": "손 씌워가는 거죠?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 929.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "아니요. 가져가요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 931.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin cảm ơn.",
        "startTime": 940.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "저는 김밥을 테이크아웃해서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 942.5
      }
    ]
  },
  {
    "id": "lesson_13",
    "title": "Bài 13: Tham quan Hoàng Cung 경복궁",
    "category": "TOPIK 1 - TOPIK 1",
    "duration": "01:15",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "천계천에 왔습니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 944.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여기서 먹을 거예요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 946.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "경복궁, 광암광장",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 950.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그리고 천계천까지",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 952.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "다 가까이 붙어있어요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 954.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 956.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이렇게 걸으면서 둘러보기에",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 958.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "정말 좋아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 960.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이 근처에 회사도 되게 많아서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 962.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "점심 먹고 산책하는",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 964.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "직장인들도 되게",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 966.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "있어요. 메뉴 이름은",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 968.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "에듬치즈김밥이에요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 981.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "에듬치즈가 뭐지?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 983.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "치즈 종류인가?",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 985.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "치즈 맛이 좀 딱조름하네요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 987.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이 천계천은",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 989.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "낮에도 좋고 밤에도 좋아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 991.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "걷기도 좋고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 993.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "앉아서 얘기하기도",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 997.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "좋고. 천계천의",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 999.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "단점 하나는",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1001.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "물가나서 약간",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1003.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "벌레들이 많아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1005.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 되게 작은 벌레들.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1007.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "근데 원래는 여기가",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1009.0
      },
      {
        "speaker": "Seunghwan",
        "hangul": "도로였대요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1013.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지금 이렇게 물이 흘러다니지만",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1015.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "옛날에는",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1017.5
      }
    ]
  },
  {
    "id": "lesson_14",
    "title": "Bài 14: Ăn uống & Mua sắm",
    "category": "TOPIK 6 - TOPIK 6",
    "duration": "00:57",
    "lines": [
      {
        "speaker": "Seunghwan",
        "hangul": "차가 지나다니는",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1019.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "도로였대요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1021.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이 물이 도로 밑에서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1023.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "흐르던 거죠.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1025.5
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지금은 도로를 다 없애고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1028.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "천계천을 이렇게 볼 수 있게 됐는데",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1030.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그래서 좋은 것 같아요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1032.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "이제 한두 달만",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1036.3
      },
      {
        "speaker": "Seunghwan",
        "hangul": "지나도 이렇게 밖에 나와서",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1039.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "밥 먹는 거 못해요. 추워서.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1041.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "날씨 좋을 때",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1043.7
      },
      {
        "speaker": "Seunghwan",
        "hangul": "자두자두 나와야 돼요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1047.4
      },
      {
        "speaker": "Seunghwan",
        "hangul": "오! 비둘기가 날아다녀.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1054.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "벌레 좀 먹어조라. 비둘기야.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1058.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "벌레 좀 많이 먹어줘.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1060.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "여러분 오늘 영상이",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1062.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "재밌으셨다면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1064.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "그리고 한국어 공부에 도움이 되셨다면",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1066.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "알려주세요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1068.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "좋아요 눌러주시고 댓글도 달아주시고",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1070.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "또 이런 영상 많이 찍어볼게요.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Luyện nghe nói nhại tiếng Hàn thực tế theo ngữ cảnh.",
        "startTime": 1072.8
      },
      {
        "speaker": "Seunghwan",
        "hangul": "감사합니다.",
        "romaja": "Phát âm tiếng Hàn",
        "vietnamese": "Xin cảm ơn.",
        "startTime": 1074.8
      }
    ]
  }
];

// 5. TOPIK Exam Questions
export const TOPIK_DATA: TopikQuestion[] = [
  {
    id: 1,
    question: "다음 ( )에 들어갈 가장 알맞은 것을 고르십시오.",
    passage: "저는 매일 아침 7시에 ( ). 그리고 학교에 갑니다.",
    options: ["일어납니다 (Thức dậy)", "자 니다 (Đi ngủ)", "마십니다 (Uống)", "봅니다 (Xem)"],
    correctAnswer: 0,
    explanation: "Câu trước nói 'Tôi thức dậy lúc 7 giờ sáng mỗi ngày. Và sau đó đi đến trường.' -> Động词 일어납니다 (Thức dậy) là chính xác nhất.",
  },
  {
    id: 2,
    question: "다음 밑줄 친 부분과 의미가 반대인 것을 고르십시오.",
    passage: "이 가방은 너무 <u>หนัก</u> (비쌉니다).",
    options: ["싸다 (Rẻ)", "크다 (To)", "작다 (Nhỏ)", "예쁘다 (Đẹp)"],
    correctAnswer: 0,
    explanation: "Từ 비쌉니다 (Đắt tiền) có từ trái nghĩa là 싸다 (Rẻ tiền).",
  },
];

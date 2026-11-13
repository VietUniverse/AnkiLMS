export interface TopikQuestion {
  id: number;
  section: "reading" | "listening" | "grammar";
  level: "TOPIK I (Sơ cấp)" | "TOPIK II (Trung cấp)";
  passage?: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
}

export const TOPIK_QUESTION_BANK: TopikQuestion[] = [
  {
    "id": 1,
    "section": "reading",
    "level": "TOPIK I (Sơ cấp)",
    "passage": "저는 오늘 도서관에 갔습니다. 도서관에서 한국어 책을 읽었습니다. 책이 아주 재미있었습니다.",
    "question": "이 사람은 오늘 도서관에서 무엇을 했습니까?",
    "options": [
      "친구를 만났습니다.",
      "한국어 책을 읽었습니다.",
      "공부하지 않고 잤습니다.",
      "음식을 먹었습니다."
    ],
    "correctAnswer": 1,
    "explanation": "Đoạn văn ghi rõ: '도서관에서 한국어 책을 읽었습니다' (Tôi đã đọc sách tiếng Hàn ở thư viện)."
  },
  {
    "id": 2,
    "section": "reading",
    "level": "TOPIK I (Sơ cấp)",
    "passage": "내일은 제 생일입니다. 그래서 친구들과 함께 맛있는 음식을 먹으려고 합니다. 케이크도 살 것입니다.",
    "question": "이 사람은 내일 무엇을 할 예정입니까?",
    "options": [
      "생일 파티를 하고 친구들과 음식을 먹습니다.",
      "혼자 집에 있습니다.",
      "학교에 시험을 보러 갑니다.",
      "여행을 떠납니다."
    ],
    "correctAnswer": 0,
    "explanation": "Nhân vật sẽ đón sinh nhật vào ngày mai ('내일은 제 생일입니다') và ăn ngon cùng bạn bè."
  },
  {
    "id": 3,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "다음 빈칸에 들어갈 가장 알맞은 것을 고르십시오: '저는 식당(  ) 밥을 먹습니다.'",
    "options": [
      "에",
      "에서",
      "을",
      "과"
    ],
    "correctAnswer": 1,
    "explanation": "Điền trợ từ chỉ nơi chốn diễn ra hành động: '에서' (ở/tại nhà hàng)."
  },
  {
    "id": 4,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "다음 빈칸에 들어갈 가장 알맞은 것을 고르십시오: '날씨가 아주 (  ).'",
    "options": [
      "춥습니다",
      "추워서",
      "추우면",
      "춥고"
    ],
    "correctAnswer": 0,
    "explanation": "Đuôi câu trần thuật trang trọng kết thúc ở thì hiện tại: '춥습니다' (Rất lạnh)."
  },
  {
    "id": 5,
    "section": "listening",
    "level": "TOPIK I (Sơ cấp)",
    "passage": "남: 이 사과 얼마예요?\n여: 한 개에 천 원입니다.",
    "question": "여자는 무엇을 하고 있습니까?",
    "options": [
      "사과 가격을 안내하고 있습니다.",
      "사과를 먹고 있습니다.",
      "사과를 씻고 있습니다.",
      "사과를 버리고 있습니다."
    ],
    "correctAnswer": 0,
    "explanation": "Người phụ nữ trả lời giá quả táo: '1,000 won / 1 quả'."
  },
  {
    "id": 6,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "다음 빈칸에 들어갈 가장 알맞은 것을 고르십시오: '한국어를 (  ) 한국으로 여행을 가고 싶어요.'",
    "options": [
      "배우면",
      "배워서",
      "배우고",
      "배우지만"
    ],
    "correctAnswer": 1,
    "explanation": "'배워서' (Học rồi/vì học nên Muốn đi du lịch Hàn Quốc)."
  },
  {
    "id": 7,
    "section": "reading",
    "level": "TOPIK I (Sơ cấp)",
    "passage": "저는 주말에 산에 갑니다. 산에서 등산을 하면 기분이 아주 좋아집니다. 공기도 깨끗합니다.",
    "question": "이 사람은 왜 산에 갑니까?",
    "options": [
      "등산을 하면 기분이 좋아지고 공기가 깨끗해서",
      "산에서 쇼핑을 하기 위해",
      "친구를 기다리기 위해",
      "일을 하기 위해"
    ],
    "correctAnswer": 0,
    "explanation": "Nhân vật thích đi núi vì leo núi làm tâm trạng tốt hơn và không khí sạch."
  },
  {
    "id": 8,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "다음 중 의미가 반대인 단어 쌍은 무엇입니까?",
    "options": [
      "크다 - 작다",
      "좋다 - 예쁘다",
      "오다 - 가다 (X)",
      "빠르다 - 느리다"
    ],
    "correctAnswer": 0,
    "explanation": "'크다' (to/lớn) trái nghĩa với '작다' (nhỏ/bé)."
  },
  {
    "id": 101,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 내일 뭐 할 거예요? B: 오전에는 (……..) 오후에는 도서관에 갈 거예요",
    "options": [
      "친구를 만나고",
      "친구를 만나서",
      "친구를 만난 후에",
      "친구를 만나는데"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: AV-고 (1, Liệt kê và tương phản). Ngữ pháp  AV-고 được sử dụng để nối hai sự vật, sự việc, trạng thái, tương đương nghĩa tiếng Việt “và” gắn –고 sau gốc động từ hoặc tính từ."
  },
  {
    "id": 102,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 안녕! 잘 있어요. 건강하세요. 2년 후에 올게요B: 잘 가요. 가끔 편지를 (…..) 이메일을 보내세요!",
    "options": [
      "쓰거나",
      "쓰고",
      "써서",
      "써도"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: V-거나 (1, Liệt kê và tương phản). [A 거나 B] Trong A và B lựa chọn/ chọn ra lấy một."
  },
  {
    "id": 103,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 주말에도 바빠요?B: 평일에는 ……… 주말에는 ………",
    "options": [
      "바빠서, 한가해요",
      "바쁘지만, 한가해요",
      "바쁘고, 한가해요",
      "바쁠 때, 한가해요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: AV-지만 (1, Liệt kê và tương phản). '-지만' Được sử dụng khi nội dung vế sau trái ngược với nội dung vế trước hoặc có suy nghĩ, cảm nghĩ khác, có nghĩa tương đương với tiếng Việt là ‘nhưng, tuy ngiên'."
  },
  {
    "id": 104,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 저는 오빠는 (………) 언니는 없어요.",
    "options": [
      "있고",
      "있거나",
      "있는데",
      "있어서"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 4. [NGỮ PHÁP] Động từTính từ + -(으)ㄴ는데 (1, Liệt kê và tương phản). Sử dụng cấu trúc này để diễn tả thông tin ở mệnh đề sau trái ngược, tương phản hoặc là kết quả không mong đợi của hành động ở mệnh đề trước."
  },
  {
    "id": 105,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 식사 (……….) 이 약을 드세요",
    "options": [
      "해서",
      "때문에",
      "하거나",
      "전에"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, [Ngữ pháp] 전,후, 기 전에, -(으)ㄴ 후에 (2, Cấu trúc thời gian). Cấu trúc này có nghĩa 'sau một khoảng thời gian', hoặc 'sau một hành động' nào đó, tương đương nghĩa tiếng Việt là 'sau khi', 'sau'."
  },
  {
    "id": 106,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 왜 아르바이트를 해요? B: 돈을 (…..) 카메라를 살 거예요.",
    "options": [
      "벌어서",
      "벌고",
      "벌거나",
      "벌 때"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [Ngữ pháp] Động từ + 아/어서 (2, Cấu trúc thời gian). Sử dụng khi vế trước xảy ra rồi kế tiếp vế sau xuất hiện lần lượt theo trình tự thời gian."
  },
  {
    "id": 107,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 햄버거 좋아해요? B: 시간이 (………..) 햄버거를 먹어요",
    "options": [
      "없어서",
      "없으면",
      "없을 때",
      "없거나"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 3, [Ngữ pháp] Danh từ + 때 \"vào\", Động/Tính từ + (으)ㄹ 때 (2, Cấu trúc thời gian). ."
  },
  {
    "id": 108,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: ……………….뭐 해요? B: 친구들과 파티를 할 거예요.",
    "options": [
      "크리스마스 온 후에",
      "크리스마스 와서",
      "크리스마스 오면",
      "크리스마스 때"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [Ngữ pháp] Danh từ + 때, Động/Tính từ + (으)ㄹ 때 (2, Cấu trúc thời gian). ."
  },
  {
    "id": 109,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 친구를 (…….) 책을 읽어요",
    "options": [
      "기다리면서",
      "기다리지만",
      "기다리거나",
      "기다리면"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [Ngữ pháp] -(으)면서 (2, Cấu trúc thời gian). Diễn tả hành động ở mệnh đề trước và mệnh đề sau xảy ra đồng thời, tương đương nghĩa tiếng việt là 'vừa."
  },
  {
    "id": 110,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이사할 거예요. 그래서 집을 (…..)",
    "options": [
      "찾는데요",
      "찾기 때문이에요",
      "찾는 중이에요",
      "찾더라고요"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 5, [Ngữ pháp] Động từ + 는 중이다 (2, Cấu trúc thời gian). Đứng sau động từ thể hiện một thời điểm trong quá trình của hành động nào đó đang được tiến hành, tương ứng với nghĩa tiếng Việt là “đang."
  },
  {
    "id": 111,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 어제 4시간 (…….) 일했어요",
    "options": [
      "후에",
      "전에",
      "동안",
      "때문에"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 6, [Ngữ Pháp] Động từ + 는 동안; Danh từ + 동안 (2, Cấu trúc thời gian). Đứng sau động từ để thể hiện ý nghĩa “trong lúc”, thể hiện thời gian mà hành động hoặc trạng thái nào đó được duy trì liên tục."
  },
  {
    "id": 112,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 듣기 시험을 어떻게 봐요? B: 문제를 두 번 읽을 거예요. 문제를 잘 (……) 대답을 찾으세요.",
    "options": [
      "듣고",
      "들으면",
      "듣고 나서",
      "듣거나"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 7, [NGỮ PHÁP] V-고 나서 (2, Cấu trúc thời gian). Đứng sau động từ với nghĩa là “xong rồi thì…” biểu hiện hành động ở vế sau được thực hiện sau khi hành động ở vế trước hoàn thành."
  },
  {
    "id": 113,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 너무 피곤해서 집에 (….) 잤어요.",
    "options": [
      "오자마자",
      "오면",
      "와서",
      "올 때"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 8, [NGỮ PHÁP] V- 자마자 (2, Cấu trúc thời gian). Nó biểu hiện việc gì đó xảy ra ngay lập tức sau một sự kiện nào đó \"ngay khi."
  },
  {
    "id": 114,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 리처드 씨는 대학교를  (…….) 9년 되었습니다",
    "options": [
      "졸업한 후에",
      "졸업한지",
      "졸업해서",
      "졸업하면"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 9, [NGỮ PHÁP] V-(으)ㄴ 지 (2, Cấu trúc thời gian). Có nghĩa là đã bao lâu từ khi bạn làm một việc gì đó."
  },
  {
    "id": 115,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아프리카 말을 (……)",
    "options": [
      "할 수 없어요.",
      "해효",
      "하기 때문이에요",
      "하는데요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V-(으)ㄹ 수 있다/없다 (3, Năng lực và khả năng). Biểu hiện '-(으)ㄹ 수 있다' thường kết hợp sau thân từ của động từ hoặc tính từ."
  },
  {
    "id": 116,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 저는 잡채하고 스파게티를 (…..).",
    "options": [
      "만들어요",
      "만들 줄 알아요",
      "만드는데요",
      "만들기 때문이에요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [Ngữ pháp] V-(으)ㄹ 줄 알다/모르다 (3, Năng lực và khả năng). Cấu trúc này diễn tả ai đó có năng lực hoặc biết cách làm cái gì đó."
  },
  {
    "id": 117,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 살을 빼고 싶어요. B:그럼 야채를 많이 (……..).",
    "options": [
      "드세요",
      "먹어요",
      "먹어라",
      "먹자"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]V-(으)세요 (4, Yêu cầu và bổn phận, cho phép và cấm đoán). Dùng -(으)세요 để yêu cầu người nghe làm gì một cách lịch sự hoặc để chỉ đường, tương đương nghĩa tiếng Việt là 'hãy, vui lòng'."
  },
  {
    "id": 118,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 음악을 너무 크게 (……). 귀에 안 좋아요. B: 네, 알겠어요.",
    "options": [
      "듣지 마세요",
      "들으세요",
      "들 수 있어요",
      "듣잖아요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V- 지 마세요 (4, Yêu cầu và bổn phận, cho phép và cấm đoán). 지 마세요 là hình thức phủ định của (으)세요, tương đương nghĩa tiếng Việt là ‘đừng’."
  },
  {
    "id": 119,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 오늘 시간 있으면 같이 테니스 칠까요? B: 미안해요. 부모님이 한국에 오셔서……..",
    "options": [
      "항공에 가요",
      "항공에 가야 해요",
      "항공에 가기 때문이에요",
      "항공에 가던데요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] A/V 아/어야 되다/하다 (4, Yêu cầu và bổn phận, cho phép và cấm đoán). Diễn tả bổn phận, nghĩa vụ hoặc nhấn mạnh hành vi cẩn thiết phải làm, tương đương nghĩa tiếng Việt \"phải, cần\"."
  },
  {
    "id": 120,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 에어컨을 ……..? B: 네, 켜세요.",
    "options": [
      "켜도 돼요?",
      "켜요",
      "켜거든요",
      "켜는데요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] A/V 아/어도 되다 (4, Yêu cầu và bổn phận, cho phép và cấm đoán). ."
  },
  {
    "id": 121,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 선생님, 커피를 마셔도 돼요? B: 커피를 …….",
    "options": [
      "마셔요",
      "마시면 안 돼요",
      "마시잖아요",
      "마시거든요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP] A/V (으)면 안 되다 (4, Yêu cầu và bổn phận, cho phép và cấm đoán). Biểu hiện '-(으)면 안 되다' gắn vào thân của động từ, tính từ biểu hiện ý nghĩa cấm đoán, ngăn cấm ai đó không được làm một việc gì đó."
  },
  {
    "id": 122,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 오늘 회식에 꼭 가야 돼요? B: 바쁘면 (……).",
    "options": [
      "가기 때문이에요",
      "가도 돼요",
      "안 가도 돼요",
      "가던데요"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 6, [NGỮ PHÁP] A/V 지 않아도 되다( 안 A/V-아/어도 되다) (4, Yêu cầu và bổn phận, cho phép và cấm đoán). Cấu trúc A/V –지 않아도 되다 diễn tả hành động không cần thiết phải làm , tương đương nghĩa tiếng Việt “không cần ."
  },
  {
    "id": 123,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 딸기를 (…….).",
    "options": [
      "먹어요",
      "먹고 싶어요",
      "먹어야 해요",
      "먹기 때문이에요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V-고 싶다 (5, Hy vọng và ước muốn). Ngữ pháp 고 싶다 là một trong các cấu trúc ngữ pháp thường hay sử dụng để diễn tả mong muốn, nhu cầu của chính bản thân mình hoặc của người bạn, người thân, hay của một ai đó về việc thực hiện hành động nào đó được đề cập đến trong câu."
  },
  {
    "id": 124,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 돈이 (……..)",
    "options": [
      "많지 않아도 돼요",
      "많았으면 좋겠어요",
      "많거든요",
      "많아요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] A/V 았/었으면 좋겠다 (5, Hy vọng và ước muốn). Cả hai biểu hiện 았/었으면 좋겠다 và (으)면 좋겠다 là tương tự nhau."
  },
  {
    "id": 125,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 왜 약을 먹어요? B: 어제 술을 많이………. 머리가 아파요.",
    "options": [
      "마셔서",
      "마시면",
      "마시면서",
      "마시고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] A/V 아/어서 (6, Nguyên nhân và kết quả). 아/어서 diễn tả mệnh đề trước là nguyên nhân gây ra kết quả ở mệnh đề sau, tương đương nghĩa tiềng Việt là 'vì."
  },
  {
    "id": 126,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 몇 번 버스가 시청 앞에 가요? B: 저는 잘 (……) 운룡 씨한테 물어보세요.",
    "options": [
      "모르거나",
      "몰라서",
      "모르나까",
      "모르고"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] A/V (으)니까 (6, Nguyên nhân và kết quả). Thể hiện nhấn mạnh vế trước trở thành nguyên nhân hay căn cứ, tiền đề đối với vế sau."
  },
  {
    "id": 127,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 여보세요. 여보, 오늘 일찍 와요? B: 미안해요. ………….늦을 거예요.",
    "options": [
      "회사 일이 있으면",
      "회사 일이 있으니까",
      "회사 일이 있어서",
      "회사 일 때문에"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] A/V 기 때문에, N 때문에 (6, Nguyên nhân và kết quả). Diễn tả nội dung ở vế trước là nguyên nhân của vế sau, tương đương nghĩa tiếng Việt là \"do, vì\"."
  },
  {
    "id": 128,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A:……….?B: 네 열어 드릴게요.",
    "options": [
      "문을 열어요",
      "문을 열어 주시겠어요?",
      "문을 열기 때문이에요",
      "문을 열고 있어요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V-아/어 주세요, V-아/어 주시겠어요? (7, Yêu cầu và trợ giúp). Dùng cấu trúc này để yêu cầu ai đó thực hiện hành động nào đó tương đương nghĩa tiếng Việt “xin hãy, hãy vui lòng” V-아/어주시겠어요?, Yêu cầu một cách lịch sự và tôn kính hơn so với V-아/어주세요."
  },
  {
    "id": 129,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: A: 제가…….B: 네. 감사합니다",
    "options": [
      "도와 드릴게요",
      "도와 주세요",
      "도와  주시겠어요?",
      "도와 할 거예요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2,[NGỮ PHÁP] V-아/어 줄게요, V-아/어 줄까요? (7, Yêu cầu và trợ giúp). Cấu trúc này diễn tả ý muốn giúp ai đó, tương đương nghĩa tiếng Việt là “tôi làm giúp."
  },
  {
    "id": 130,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 김치가 맛있어요. 김치를 (…)",
    "options": [
      "먹고 있어요",
      "먹어 보세요",
      "먹으세요",
      "먹었어요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP] V-아/어 보다 (8, Thử nghiệm và kinh nghiệm). ."
  },
  {
    "id": 131,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 일본어를 (…) 정말 재미있게 느껴요",
    "options": [
      "배웠고",
      "배우고 있고",
      "배우고",
      "배워 본 적이 있고"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V-(으)ㄴ 적이 있다/없다 (8, Thử nghiệm và kinh nghiệm). ."
  },
  {
    "id": 132,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 같이 (…)",
    "options": [
      "농구했어요?",
      "농구해요?",
      "농구할까요?",
      "농구하고 있어요?"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V-(으)ㄹ까요?(1) (9, Hỏi ý kiến và gợi ý). ."
  },
  {
    "id": 133,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 남가 우리 모임에 (…)",
    "options": [
      "나올까요?",
      "나올 거예요?",
      "나왔어요?",
      "나와요?"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V-(으)ㄹ까요?(2) (9, Hỏi ý kiến và gợi ý). ."
  },
  {
    "id": 134,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 내일 영화를 (….)",
    "options": [
      "봤어요",
      "볼까요",
      "봐요",
      "봅시다"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3,[NGỮ PHÁP] V-(으)ㅂ시다 (9, Hỏi ý kiến và gợi ý). ."
  },
  {
    "id": 135,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 커피에 설탕을 (…)",
    "options": [
      "넣으시겠어요?",
      "넣으세요",
      "넣겠어요",
      "넣을까요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] V-(으)시겠어요? (9, Hỏi ý kiến và gợi ý). ."
  },
  {
    "id": 136,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 우리가 같이 (…)",
    "options": [
      "식사했어요?",
      "식사하시겠어요?",
      "식사할래요?",
      "식사할 거예요?"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP] V-(으)ㄹ래요?(1) (9, Hỏi ý kiến và gợi ý). ."
  },
  {
    "id": 137,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 3년 후에는 준수가 대학생이 (..)",
    "options": [
      "되겠군요.",
      "돼요",
      "될래요?",
      "됐어요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V/A-겠어요?(1) (10, Ý định và kế hoạch). ."
  },
  {
    "id": 138,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이제부터 운동을 열심히 (.....)",
    "options": [
      "하겠어요",
      "해요",
      "할 거에요",
      "할게요."
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V-(으)ㄹ게요 (10, Ý định và kế hoạch). ."
  },
  {
    "id": 139,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 등산 (.....) ?",
    "options": [
      "갔어요?",
      "갈래요?",
      "갈게요",
      "갈 수 있어요?"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] V-(으)ㄹ래요?(2) (10, Ý định và kế hoạch). ."
  },
  {
    "id": 140,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 내일 (.....) 뭘 할 거예요?",
    "options": [
      "토요일이라서",
      "토요일인데",
      "토요일이나",
      "토요일과"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP] V/A-(으)ㄴ/는데(2) (11, Tiền đề thông tin và giải thích). ."
  },
  {
    "id": 141,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아침에 학교에 (...) 아무도 없었어요.",
    "options": [
      "가서",
      "갔는데",
      "가고 나서",
      "가니까"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V-(으)니까(2) (11, Tiền đề thông tin và giải thích). ."
  },
  {
    "id": 142,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 옷을 (...) 탈의실에 갑니다.",
    "options": [
      "갈아입어서",
      "갈아입었으니까",
      "갈아입고",
      "갈아입으러"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V-(으)러 가다/오다:Đi đến đâu...để làm gì đó. (12, Mục đích và ý định). ."
  },
  {
    "id": 143,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이번 주말에는 친구를(...)해요.",
    "options": [
      "만나려고",
      "만나러",
      "만나서",
      "만나고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V-(으)려고 “định, để (làm gì).” (12, Mục đích và ý định). ."
  },
  {
    "id": 144,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 동생에게생일 선물을(....) 합니다.",
    "options": [
      "부치러",
      "부치고",
      "부치면",
      "부치려고"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] V-(으)려고 하다 \"định (làm)\", \"muốn (làm gì đó)\" (12, Mục đích và ý định). ."
  },
  {
    "id": 145,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 할아버님을 (...) 미국에 갔어요.",
    "options": [
      "뵙기로 해서",
      "뵙기 위하여",
      "뵙은데",
      "뵙으니까"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] N을/를 위해(서), V-기 위해(서)'làm gì đó...để' (12, Mục đích và ý định). ."
  },
  {
    "id": 146,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 여자친구를 (...).",
    "options": [
      "만나러요",
      "만나려고요",
      "만나기로 했다.",
      "만나요"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP] V-기로 하다  Quyết định làm gì đó (12, Mục đích và ý định). ."
  },
  {
    "id": 147,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 술을 많이 (...) 건강에 안 좋아요.",
    "options": [
      "마셔서",
      "마시면",
      "마신 후",
      "마시면서"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V/A-(으)면 Nếu, khi (조건 표현- Biểu hiện điều kiện) (13, Điều kiện và giả định). ."
  },
  {
    "id": 148,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 한국말을 잘 (...) 한국 찬구를 많이 사귀어요",
    "options": [
      "하려면",
      "하려고",
      "하면",
      "해서"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2,[NGỮ PHÁP] V-(으)려면'Nếu muốn...thì...\" (13, Điều kiện và giả định). ."
  },
  {
    "id": 149,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아무리 (....) 이해할수 없습니다.",
    "options": [
      "배우니까",
      "배워서",
      "배워도",
      "배운데"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] V/A-아/어도 (13, Điều kiện và giả định). ."
  },
  {
    "id": 150,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 배고프(...).",
    "options": [
      "배고프겠어요.",
      "배고프니까요",
      "배고프려고요",
      "배고프셨어요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP] V/A-겠어요(2) (14, Phỏng đoán). ."
  },
  {
    "id": 151,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 다음 주에 차를 (....)",
    "options": [
      "살게요",
      "살 수 있어요",
      "살겠어요",
      "살 거예요"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V/A-(으)ㄹ 거예요(2) (14, Phỏng đoán). ."
  },
  {
    "id": 152,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이번에 누가 승진을 (....)?",
    "options": [
      "할까요?",
      "해요?",
      "하겠어요?",
      "할 수 있어요?"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] V/A-(으)ㄹ까요?(3) (14, Phỏng đoán). ."
  },
  {
    "id": 153,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 남 씨는 벌써 (....). 전화를 안 받아요",
    "options": [
      "떠난 것 같아요",
      "떠날 거에요",
      "떠나겠어요",
      "떠나요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] V/A-(으)ㄴ/는/(으)ㄹ 것 같다 (14, Phỏng đoán). ."
  },
  {
    "id": 154,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 손으로 책을 (......).",
    "options": [
      "들고 있어요",
      "들지만",
      "들거나",
      "들었다"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] V-고 있다(2) (16, Cấu trúc trạng thái). V-고 있다(2) Gắn vào sau động từ, biểu hiện quá trình đang tiếp diễn của một hành động nào đó (đang được tiến hành hoặc đang được tiếp tục), giống như trong tiếng Anh là dạng ‘-ing’."
  },
  {
    "id": 155,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 환자들이 병원에 (......).",
    "options": [
      "눕고 있어요",
      "누워 있어요",
      "눕지만",
      "눕거나"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V-아어 있다 Trạng thái tiếp diễn (16, Cấu trúc trạng thái). V-아어 있다  diễn đạt việc tiếp diễn của trạng thái xuất hiện ở vế trước."
  },
  {
    "id": 156,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 당근을 많이 먹으면 눈이 (......).",
    "options": [
      "좋아지지 않아요",
      "좋아져요",
      "좋아지지만",
      "좋았어요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] A-아어지다 (16, Cấu trúc trạng thái). A-아어지다 : gắn sau tính từ để chỉ sự thay đổi trạng thái, tính chất của chủ thể."
  },
  {
    "id": 157,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 요리를 (......) 기분이 좋다.",
    "options": [
      "잘하게 돼서",
      "잘하지 못해서",
      "잘하면",
      "잘하고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] V-게 되다 'được, bị, trở nên, phải...' (16, Cấu trúc trạng thái). 게 되다' Đứng sau động từ hoặc tính từ tương đương với nghĩa 'được, bị, trở nên, phải."
  },
  {
    "id": 158,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아이가 어디가 (......) 모르겠어요.",
    "options": [
      "아픈지",
      "아파서",
      "아프고",
      "아파도"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP] VA-(으)ㄴ는지 (17, Xác nhận thông tin). Đuôi ~은지/는지/ㄴ지 chủ·yếu dùng với các động·từ liên·quan đến hiểu·biết (biết (알다), không biết (모르다)), suy·đoán, thông·báo, suy·nghĩ (생각하다),…để diễn·đạt ý·nghĩa không chắc·chắn, băn·khoăn ”hay không”, “có hay không”, “hay chưa”."
  },
  {
    "id": 159,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 차를 (......) 30만 원 들었어요.",
    "options": [
      "고치는 데",
      "고치고",
      "고쳐도",
      "고치거나"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] V-는 데 걸리다들다 Tốn, mất vào việc (17, Xác nhận thông tin). Sử dụng cấu trúc V는 데 ."
  },
  {
    "id": 160,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 한국어를 (......)?",
    "options": [
      "부운데",
      "배우는데요",
      "배우지요",
      "배울까"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] VA-지요‘ đúng chứ, phải chứ, mà nhỉ' (17, Xác nhận thông tin). V/A-지요 Được sử dụng khi người nói đã biết trước sự thật, nhưng muốn xác nhận lại sự thật hoặc tìm sự đồng tình của đối phương."
  },
  {
    "id": 161,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 요즘 눈이 (......).",
    "options": [
      "나빠요",
      "나쁘군요",
      "나쁘지만",
      "나쁘거나"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP] VA-군요는군요 Cảm thánngạc nhiên khi biết một sự việc hoàn toàn mới (18, Phát hiện và ngạc nhiên). V/A-군요는군요 Được dùng để thể hiện sự cảm thán với nghĩa : thực sự, vậy cơ à,…cấu trúc này tương đương với cấu trúc 는구나 nhưng được sử dụng trong các tình huống trang trọng."
  },
  {
    "id": 162,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가족이 정말  (......).",
    "options": [
      "많네요",
      "많아요",
      "많지만",
      "많았어요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] VA-네요 Cảm thánngạc nhiên khi biết một sự việc hoàn toàn mới (18, Phát hiện và ngạc nhiên). V/A-네요 Gắn vào sau thân động từ và tính từ, sử dụng khi nói về cảm giác, cảm xúc của người nói về việc mà được biết lần đầu vào thời điểm hiện tại, ngay lúc bấy giờ (thể hiện sự cảm thán hay ngạc nhiên của người nói khi biết một sự việc hoàn toàn mới)."
  },
  {
    "id": 163,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 주말에 재미있게 (......)?",
    "options": [
      "보내셨나요",
      "보내요",
      "보내지만",
      "보낼까요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] A-(으)ㄴ가요, V-나요 (19, Đuôi câu khác). A-(으)ㄴ가요, V-나요 Là đuôi câu được sử dụng để hỏi ai đó điều gì một cách lịch sự và nhẹ nhàng tôn trọng  người nghe."
  },
  {
    "id": 164,
    "section": "grammar",
    "level": "TOPIK I (Sơ cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 이 그림 어때요?나: 와, (......).",
    "options": [
      "멋있는데요",
      "멋있어요",
      "멋있거나",
      "멋있지만"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] VA-(으)ㄴ는데요 (19, Đuôi câu khác). V/A-(으)ㄴ는데요 Được gắn sau thân động từ hành động hay động từ trạng thái sử dụng để từ chối đề nghị của đối phương một cách nhẹ nhàng và xem xét phản ứng của người nghe."
  },
  {
    "id": 165,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 이 책은 정말…………나: 네, 카일리 씨한테는 어려울 것 같네요.",
    "options": [
      "어렵잖아요",
      "어려워 보여요",
      "어려울 것 같아요",
      "어려워요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] 아/어 보이다 (1, Diễn tả phỏng đoán và suy đoán). Có nghĩa là ‘(cái gì đó/ai đó) có vẻ, trông/nhìn có vẻ/như là’, để mô tả diện mạo, vẻ bề ngoài, phong thái của ai đó hay cái gì đó."
  },
  {
    "id": 166,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 저축을 많이 하는 걸 보니 흐엉 씨는 (.......)",
    "options": [
      "알뜰한 모양이에요",
      "알뜰하더라고요",
      "알뜰하는데요",
      "알뜰하니까요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] (으)ㄴ/는 모양이다 (1, Diễn tả phỏng đoán và suy đoán). ‘모양’ trong cấu trúc này mang nghĩa vẻ bề ngoài, trạng thái, tình trạng được sử dụng ở đây để diễn đạt một hoàn cảnh hay trạng thái cụ thể."
  },
  {
    "id": 167,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 저 옷을 한번 입어 볼까요? 나: …………..다른 옷을 입어 보세요.",
    "options": [
      "저 옷을 작을 텐데",
      "저 옷을 작아서",
      "저 옷을 작을 것 같아서",
      "저 옷을 작기 때문에"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP](으)ㄹ 텐데 (1, Diễn tả phỏng đoán và suy đoán). Được dùng khi người nói giả định, suy đoán, phỏng đoán mạnh mẽ của người nói về một hoàn cảnh (như bối cảnh, nguyên do, sự đối chiếu, đối sánh."
  },
  {
    "id": 168,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 책상을 저쪽으로 옮기는 게 좋겠어요. 나: 혼자 옮기기에는……… 제가 도와 드릴게요.",
    "options": [
      "무겁기 때문에",
      "무거워서",
      "무거울 테니까",
      "무거울 것 같아서"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] (으)ㄹ 테니까 (1, Diễn tả phỏng đoán và suy đoán). Cấu trúc này là sự kết hợp của -(으)ㄹ 터이다, cấu trúc diễn tả tình huống tương lai hoặc ý định làm gì đó và -(으)니까, cấu trúc diễn tả lý do."
  },
  {
    "id": 169,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 어제 양강 씨도 테니스 치러 갔을까요? 나: 아마 안 (…….). 예전에 테니스를 못 친다고 했던 것 같아요.",
    "options": [
      "갔을걸요",
      "갔을 거예요",
      "갔을 것 같아요",
      "갔아요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP] (으)ㄹ 걸요 (1, Diễn tả phỏng đoán và suy đoán). Sử dụng cấu trúc này để diễn tả sự phỏng đoán, giả định về những sự việc trong tương lai hoặc việc mà người nói chưa chắc chắn lắm."
  },
  {
    "id": 170,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 부산이 (…….). 부산도 서울처럼 추운 줄 알았어요.",
    "options": [
      "따뜻한 줄 몰랐어요",
      "따뜻해요",
      "따뜻한데요",
      "따뜻할 것 같아요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 6, [NGỮ PHÁP](으)ㄴ/는/(으)ㄹ 줄 몰랐다(알았다) (1, Diễn tả phỏng đoán và suy đoán). Cấu trúc -(으)ㄴ/는/(으)ㄹ 줄 몰랐다 diễn tả những điều người nói không nhận biết hoặc không tiên liệu trước được."
  },
  {
    "id": 171,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 내일 연극 공연에 다섯 명 자리를 예약하면 되겠지요? 나: 제나 씨는 아르바이트 때문에 ……….다시 한번 확인해 보세요.",
    "options": [
      "못 와서",
      "못 올지도 모르나까",
      "못 오기 때문에",
      "못 오니까"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 7, [NGỮ PHÁP] (으)ㄹ지도 모르다 (1, Diễn tả phỏng đoán và suy đoán). Cấu trúc này diễn tả sự phỏng đoán về một việc gì đó có thể sẽ xảy ra trong tương lai hoặc đã xảy ra trong quá khứ."
  },
  {
    "id": 172,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이 음식을 (…….) 많이 먹지는 않을 거예요.",
    "options": [
      "먹은 후에",
      "먹어서",
      "먹기는 하겠지만",
      "먹어야"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] 기는 하지만 (2, Diễn tả sự tương phản). Cấu trúc này sử dụng khi biểu thị ý nghĩa đối chiếu, tương phản và biểu thị dưới hai dạng: A/V -기는 하지만, -기는 -지만."
  },
  {
    "id": 173,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 언니가 정리를 잘해요? 나: 네,나는 잘 ……..언니는 정리를 잘해요.",
    "options": [
      "못해서",
      "못하는 반면에",
      "못하고",
      "못하기 때문에"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP](으)ㄴ/는 반면에 (2, Diễn tả sự tương phản). Sử dụng cấu trúc này khi diễn tả một thực tế mà hai mệnh đề có nội dung trái ngược nhau."
  },
  {
    "id": 174,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 이 전공이 적성에 맞지 않아요? 나: 네, 제 적성에 ……..부모님 때문에 어쩔 수 없이 공부하고 있어요",
    "options": [
      "맞지 않기 때문에",
      "맞지 않고",
      "맞지 않아서",
      "맞지 않는데도"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP](으)ㄴ/는데도 (2, Diễn tả sự tương phản). Cấu trúc này là sự kết hợp của -(으)ㄴ/는데, đưa ra hoàn cảnh và -아/어도, mệnh đề nhượng bộ hoặc tương phản."
  },
  {
    "id": 175,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 저 가수의 노래는 인기가 많을 (………)",
    "options": [
      "것이에요",
      "것 같아요",
      "것입니다",
      "것이다"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, 서술체 (3, Thể trần thuật và thân mật). ."
  },
  {
    "id": 176,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 나는 아르바이트비를 일주일에 한 번씩 (…….).",
    "options": [
      "받는다",
      "받아요",
      "받고 싶어요",
      "받거든요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, 서술체 (3, Thể trần thuật và thân mật). ."
  },
  {
    "id": 177,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 윤지 씨, 내일 같이 쇼핑하러 (……..)",
    "options": [
      "갈게",
      "갈까요?",
      "갈까?",
      "가자"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 2, 반말체 (3, Thể trần thuật và thân mật). ."
  },
  {
    "id": 178,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 자야 씨, 오늘도 이 식당에 가려고요? 나: 네, 여기가 정말 (……..). 마크 씨도 같이 갈래요?",
    "options": [
      "맛있거든요",
      "맛있는데요",
      "맛있잖아요",
      "맛있어요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] 거든요 (4, Diễn tả nguyên nhân). Sử dụng cấu trúc này để đáp lại câu hỏi, hoặc khi người nói muốn đưa ra ý kiến, lý do mà người nghe chưa biết tới."
  },
  {
    "id": 179,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 점심에 같이 닭갈비를 먹을까요? 나: 자야 씨는 매운 음식을 ……….좋겠어요. 맵지 않은 음식을 먹는 게 좋겠어요",
    "options": [
      "못 먹거든요",
      "못 먹잖아요",
      "못 먹어요",
      "못 먹는데요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] 잖아요 (4, Diễn tả nguyên nhân). Sử dụng cấu trúc này khi người nói muốn đưa ra lý do mà người nghe cũng biết hoặc người nói muốn gợi lại cho người nghe lý do mà có vẻ người nghe đã quên."
  },
  {
    "id": 180,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 어제 왜 야근했어요? 나: 보고서를……….야근했어요.",
    "options": [
      "마무리하고",
      "마무리하느라고",
      "마무리하도록",
      "마무리하면서"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]느라고 (4, Diễn tả nguyên nhân). Là ngữ pháp dùng để biểu hiện nội dung vế trước trở thành nguyên nhân hoặc lý do của vế sau."
  },
  {
    "id": 181,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 어떻게 하다가 용돈을 다 썼어요? 나: 친구랑 밤늦게까지 술을(…….. ) 돈을 다 썼어요.",
    "options": [
      "마시는 바람에",
      "마시느라고",
      "마셔서",
      "마시고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] 는 바람에 (4, Diễn tả nguyên nhân). Cấu trúc này bao gồm mệnh đề trước là lý do cho kết quả ở mệnh đề sau."
  },
  {
    "id": 182,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 어제 술을 많이 (…….) 오늘 아침에 머리가 아팠어요.",
    "options": [
      "마시면",
      "마시고",
      "마셔서",
      "마신 탓에"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP] (으)ㄴ/는 탓에 (4, Diễn tả nguyên nhân). Bản chất 탓 có nghĩa là lý do hoặc nguyên nhân gây ra tình huống tiêu cực nào đó."
  },
  {
    "id": 183,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 월급도 (……..) 친구들에게 한턱냈어요.",
    "options": [
      "타거나",
      "타면",
      "타고 해서",
      "타고"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 6, [NGỮ PHÁP] V/A 고 해서, N (이)고 해서 (4, Diễn tả nguyên nhân). Thể hiện vế trước là lý do tiêu biểu, điển hình trong số nhiều lý do để trở thành việc thực hiện tình huống ở vế sau."
  },
  {
    "id": 184,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 수업에 방해가 (…….) 휴대전화를 꺼 놓았어요",
    "options": [
      "될 까봐",
      "되고",
      "되도록",
      "되면"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 7, [NGỮ PHÁP] V/A (으)ㄹ까 봐 (4, Diễn tả nguyên nhân). Cấu trúc này diễn tả người nói e sợ, lo sợ một hành động, sự việc nào đó sẽ xảy ra."
  },
  {
    "id": 185,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 빌려 준 책을 다 읽었어요. 나: 책을 벌써 (…….)? 책을 정말 빨리 읽는군요",
    "options": [
      "다 읽었어요",
      "다 읽었다고요",
      "다 읽었는데요",
      "다 읽었잖아요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] 다고요? (5, Trích dẫn gián tiếp). Sử dụng cấu trúc này để xác nhận lại thông tin người khác nói."
  },
  {
    "id": 186,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 한강에서 불꽃놀이 축제를 (……) 같이 안 갈래요? 나: 네, 좋아요. 정말 멋지겠네요. 같이 가요.",
    "options": [
      "한다고 하던데",
      "해서",
      "하니까",
      "하도록"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]다고 하던데 (5, Trích dẫn gián tiếp). Cấu trúc này là sự kết hợp của câu trích dẫn gián tiếp -는다고 하다 và cấu trúc hồi tưởng -던데."
  },
  {
    "id": 187,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 나: 요즘 설악산이 정말 (……..)? 가: 네, 정말 아름답더라고요.",
    "options": [
      "아름답다면서요",
      "아름다워요",
      "아름답저든요",
      "아름다운데요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] 다면서요? (5, Trích dẫn gián tiếp). Sử dụng cấu trúc này để hỏi và xác nhận lại một sự thật, thông tin nào đó mà người nói đã biết hoặc nghe ở đâu đó rồi, nhưng còn chưa chắc chắn, cấu trúc này có thể được rút gọn thành 다며?; sử dụng khi trò chuyện với những người thần thiết, bạn bè."
  },
  {
    "id": 188,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 손님, 그 제품을 사시려면 명동 매장에 가 보세요. 나: 명동 매장에……….? 지금 명동 매장에서 왔는데요.",
    "options": [
      "가 보고 싶어요",
      "가 볼 만해요",
      "가 보라니요",
      "가 봤어요"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] 다니요? (5, Trích dẫn gián tiếp). Sử dụng cấu trúc này khi người nói ngạc nhiên hoặc không tin điều người khác nói là đúng, là thật."
  },
  {
    "id": 189,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 부산까지 어떻게 갈 거예요?나: 시간이 많이 없으니까 비행기를…….",
    "options": [
      "타잖아요",
      "타거든요",
      "타기로 했어요",
      "탈까 해요"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP](으)ㄹ까 하다 (6, Diễn tả quyết tâm và ý đồ). Người nói thể hiện việc suy nghĩ, dự định sẽ làm một việc gì đó một cách mơ hồ, chưa chắc chắn, có thể thay đổi."
  },
  {
    "id": 190,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 왜 한국어를 열심히 공부합니까? 나: 한국어를 열심히 공부해서 한국에 있는 대학교에………",
    "options": [
      "진학하도록 합니다",
      "진학하고자 합니다",
      "진학하려고 하비다",
      "진학하기 때문입니다"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]고자 (6, Diễn tả quyết tâm và ý đồ). Là biểu hiện dùng trong văn viết thể hiện việc làm hành động ở vế sau là vì, là dành cho về trước."
  },
  {
    "id": 191,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 이 문법을 다 이해했어요? 나: 아니요, 잘 몰라서 ……..",
    "options": [
      "질문하기로 합니다",
      "질문하고자 합니다",
      "질문하려고 합니다",
      "질문하려던 참이었어요"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP](으)려던 참이다 (6, Diễn tả quyết tâm và ý đồ). Diễn đạt việc đã đang suy nghĩ và có ý định/dự định làm việc gì đó ngay bây giờ, ngay hiện tại, ngay lúc này."
  },
  {
    "id": 192,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가:수영 씨, 백화점에 가려고 해요? 나: 네, (……..)가려고 해요. 같이 갈래요?",
    "options": [
      "구경도 할 겸 친구 생일 선물도 살 겸",
      "구경도 하고 친구 생일 선물도 사고",
      "구경도 하거나 친구 생일 선물도 사",
      "구경도 하면서 친구 생일 선물도 사"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-(으)ㄹ 겸-(으)ㄹ 겸 (6, Diễn tả quyết tâm và ý đồ). “Động từ + -(으)ㄹ 겸” Được sử dụng khi bạn muốn nói về một hành động có hai hay nhiều mục đích, bạn có thể liệt kê chúng ra khi sử dụng -(으)ㄹ 겸."
  },
  {
    "id": 193,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 한국에서 운전을 하고 싶어. 올해는 운전 연습을 열심히 해서 꼭 ……….",
    "options": [
      "운전면허를 따는데요",
      "운전면허를 따거든요",
      "운전면허를 따야지",
      "운전면허를 따요"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP]아/어야지요 (6, Diễn tả quyết tâm và ý đồ). Sử dụng cấu trúc này khi người nói tự hứa với chính bản thân quyết định thực hiện việc nào đó hoặc đơn giản diễn tả ý định của mình."
  },
  {
    "id": 194,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 저 영화가 어때요? 나: 주인공들이 멋있어서 한번 (……)",
    "options": [
      "보거든요",
      "봐요",
      "볼 만해요.",
      "보는데요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)ㄹ 만하다 (7, Diễn tả gợi ý và lời khuyên). Cấu trúc này diễn tả hành động nào đó có giá trị để làm."
  },
  {
    "id": 195,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 돈을 모으고 싶은데 어떻게 하면 좋을까요? 나: 조금씩이라도 매달 은행에 (…….)",
    "options": [
      "저축하기 때문이에요.",
      "저축하는데요.",
      "저축해요.",
      "저축하도록 하세요."
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] -도록 하다 (7, Diễn tả gợi ý và lời khuyên). Sử dụng cấu trúc này để chỉ dẫn hoặc gợi ý hành động cho người khác."
  },
  {
    "id": 196,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 입맛이 없는데도 많이 먹었더니 속이 안 좋아요. 나: 아이고, 조금만……..?",
    "options": [
      "먹지 그랬어요",
      "먹지 않아요",
      "먹지 않을까요",
      "먹지 읺을래요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- 지 그래요? (7, Diễn tả gợi ý và lời khuyên). Sử dụng cấu trúc này để gợi ý ai đó làm cái gì."
  },
  {
    "id": 197,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 아이한테 장난감을 많이 사 줬나 봐요. 나: 아니에요. 친구 아이가 …….장난감을 받은 거예요.",
    "options": [
      "가지고 놀고",
      "가지고 놀았던",
      "가지고 놀던",
      "가지고 노는데"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] -던 (8, Diễn tả sự hồi tưởng). Sử dụng cấu trúc này để hồi tưởng lại hành động hay thói quen nào đó đã lặp lại nhiều lần trong quá khứ."
  },
  {
    "id": 198,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 한국에서 여행을 해 보니까 한국에는 정말 산이 (……)",
    "options": [
      "많는데요",
      "많더라고요",
      "많네요",
      "많아요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]- 더라고요 (8, Diễn tả sự hồi tưởng). Sử dụng cấu trúc này để hồi tưởng lại những hành động, sự việc mà người nói trực tiếp chứng kiến, nghe thấy hoặc cảm nhận."
  },
  {
    "id": 199,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 오늘은 사장님 기분이 좀 괜찮아지셨어요? 나: 아니요, 아까 보니까 오늘도 얼굴 표정이 안 (…….)",
    "options": [
      "좋네요",
      "좋으시던데요.",
      "좋거든요",
      "좋잖아요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- 던데요 (8, Diễn tả sự hồi tưởng). Cấu trúc này là sự kết hợp của -던, diễn tả sự hồi tưởng và -(으)ㄴ데요 làm bối cảnh cho mệnh đề tiếp theo."
  },
  {
    "id": 200,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 밖에서 무슨 소리가 (…..)",
    "options": [
      "듣다",
      "듣는 것같아요",
      "들리는 것 같아요.",
      "들어요"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]단어 피동 (-이/히/리/기) (9, Hình thức bị động). Bị động trong tiếng Hàn không dựa vào quy tắc ngữ pháp mà nó được tạo thành như một động từ phái sinh."
  },
  {
    "id": 201,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 미나 씨가 정말 (….)",
    "options": [
      "예쁘네요",
      "예뻐졌어요",
      "예뻐요",
      "에쁘니까요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] 아/어지다 (9, Hình thức bị động). Cấu trúc này gần giống với câu bị động ở phần trước (gắn tiếp từ -이/히/리/기- vào động từ) và hình thức này chỉ được sử dụng với một số động từ mà không thể gắn tiếp từ -이/히/리/기-."
  },
  {
    "id": 202,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그래서 점점 일하는 것에 흥미를 (…..)",
    "options": [
      "잃었어요",
      "잃게 됐어요",
      "잃었으니까요",
      "잃면서요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] -게 되다 'được, bị, trở nên, phải...' (9, Hình thức bị động). 게 되다' Đứng sau động từ hoặc tính từ tương đương với nghĩa 'được, bị, trở nên, phải."
  },
  {
    "id": 203,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 우리가 택시를 (…)",
    "options": [
      "세워요",
      "세웠어요",
      "세우고 있어요",
      "세울 거예요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] 단어 사동(-이/히/리/기/우/추-) (10, Hình thức sai khiến). Sử dụng cấu trúc này khi chủ ngữ làm cho người, động vật, sự vật hoặc một đối tượng nào khác làm gì hoặc đạt tới một."
  },
  {
    "id": 204,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 선생님은 학생들에게 모르는 단어는 사전을 (….)",
    "options": [
      "찾게 해요",
      "찾아요",
      "찾을 거예요",
      "찾았어요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-게 하다Bắt/khiến/sai/biểu cho ai làm gì; để cho/cho phép ai làm gì (10, Hình thức sai khiến). [Ngữ pháp] Động từ - 게 하다 Bắt/khiến/sai/biểu cho ai làm gì; để cho/cho phép ai làm gì Nền tảng của cấu trúc này là một tác động, lý do, căn nguyên hay sự ảnh hưởng nào đó khiến một hành động xảy ra."
  },
  {
    "id": 205,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이 회사에 취직하면 토픽 6급이 (…..)",
    "options": [
      "있어요",
      "있어야 돼요",
      "있었어요",
      "있을 거예요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] 아/어야 (11, Diễn tả điều kiện). Đứng sau động từ hoặc tính từ, có nghĩa là 'sẽ phải', được dùng để thể hiện suy nghĩ hay ý chí nhất định sẽ phải làm một việc nào đó, hoặc phải ở trạng thái nào đó."
  },
  {
    "id": 206,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이 책을 다 (….)  빌려 주시겠어요?",
    "options": [
      "읽고",
      "읽거든",
      "읽으면서",
      "읽어서"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]V/A-거든 ‘nếu, nếu như…’ (11, Diễn tả điều kiện). Cấu trúc 거든 – Khi đứng giữa câu nó mang ý giả định một kết quả, điều kiện nào đó có thể xảy ra, hoặc được xảy ra."
  },
  {
    "id": 207,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 생일 파티에 손님이 많이 (….) 선물도 많이 받았어요.",
    "options": [
      "왔으니까",
      "왔을 뿐만 아니라",
      "왔고",
      "왔는데"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)ㄹ 뿐만 아니라 Không những... mà còn (12, Diễn tả bổ sung thông tin). Cấu trúc thể hiện việc có cả nội dung mà vế sau diễn đạt thêm vào nội dung mà vế trước diễn đạt."
  },
  {
    "id": 208,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 요즘 (…..) 화사 일까지 겹쳐서 힘들어 죽겠어요.",
    "options": [
      "집안일인데",
      "집안일에다가",
      "집안일이니까",
      "집안일 때문에"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 2,[NGỮ PHÁP]- (으)ㄴ/는 데다가 (12, Diễn tả bổ sung thông tin). V + 는 데다가 : Mệnh đề sau bổ sung thêm ý nghĩa cho mệnh đề trước, 2 mệnh đề phải cùng chủ ngữ, và cùng tính chất với nhau."
  },
  {
    "id": 209,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 우리 엄마는 해외여행은커녕 (……) 못 가 보셨어요",
    "options": [
      "제주도이면",
      "제주도조차",
      "제주도이지만",
      "제주도인데"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] N-조차 “ngay cả, thậm chí, kể cả” (12, Diễn tả bổ sung thông tin). Được dùng gắn vào sau danh từ."
  },
  {
    "id": 210,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 자동차는 관리비가 정말 많이 들어요. (…..) 한 달에 15만 원 이상 나가는 것 같아요.",
    "options": [
      "주차비만에",
      "주차비만 해도",
      "주차비밖에",
      "주차비이지만"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]- 만 해도 (12, Diễn tả bổ sung thông tin). Là hình thái kết hợp giữa trợ từ bổ trợ –만 với dạng chia của động từ 하다, được dùng gắn vào sau danh từ, đưa ra ví dụ giải thích cho một hoàn cảnh hay tình huống được đề cập trước đó trong câu."
  },
  {
    "id": 211,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 지나 (…..) 들렀습니다.",
    "options": [
      "가는 길에",
      "가고 있고",
      "갔고",
      "갈 거이고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP]- 는 길에 (13, Diễn tả hành động gián đoạn). Cấu trúc này còn sử dụng dưới hình thức -는 길이다."
  },
  {
    "id": 212,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 우리는 수도물을 (….) 요즘은 생수를 배달시켜서 먹어요.",
    "options": [
      "마시고 나서",
      "마시면서",
      "마시다가",
      "마신 후에"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-다가 (13, Diễn tả hành động gián đoạn). Ý nghĩa 다가: Có ý nghĩa thêm một hành động khác vào hành động của mệnh đề trước."
  },
  {
    "id": 213,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그렇게 화를 (…..) 기분이 나빴어요?",
    "options": [
      "내고",
      "낼 정도로",
      "내고 나서",
      "내면"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)ㄹ 정도로 'đến mức', 'đến nỗi' (14, Diễn tả mức độ). A/V+ (으)ㄹ 정도로: Diễn đạt mức độ của một hành động hoặc một trạng thái (trong phạm vi) nào đó."
  },
  {
    "id": 214,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아무리 편한 곳도 (……) 곳은 없어요. 작기는 해도 우리 집이 제일 편해요.",
    "options": [
      "집인",
      "집만 한",
      "집으로",
      "집으니까"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]N-만 하다 (14, Diễn tả mức độ). Sử dụng cấu trúc này với danh từ, số lượng, con số nhằm so sánh giữa hai vật, hai việc có kích thước, số lượng hay mức độ tương đương nhau."
  },
  {
    "id": 215,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 승규가 다니는 회사는 주말에도 일을 하는 만큼 월급을 더 준다.",
    "options": [
      "해서",
      "하는",
      "하니까",
      "하는 만큼"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)ㄴ/는/(으)ㄹ 만큼 (14, Diễn tả mức độ). Cấu trúc-(으)ㄴ/는 만큼 thường được dùng trong trường hợp người nói đưa ra lý do hoặc một nguyên nhân nào đó và do có nguyên nhân, lý do đó mà sẽ có kết quả tương ứng sau đó."
  },
  {
    "id": 216,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: (….) 나를 알지 못하는 곳으로 가고 싶어요.",
    "options": [
      "아무데나",
      "누구나",
      "아무도",
      "아무거나"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP] - 아무+(이)나/아무+도 ”bất cứ, bất kỳ” (15, Diễn tả sự lựa chọn). Bản chất 아무 nghĩa là không chọn bất cứ cái gì đặc biệt, tương đương nghĩa tiếng Việt là ”bất cứ, bất kỳ” (ví dụ như bất cứ cái gì, bất cứ ai)."
  },
  {
    "id": 217,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 포장지는 주로 (…..) 비닐로 만든다.",
    "options": [
      "종이나",
      "종아도",
      "종거든",
      "종지만"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2,[NGỮ PHÁP] (이)나  \"hoặc, hay, hoặc là, hay là\" (15, Diễn tả sự lựa chọn). ."
  },
  {
    "id": 218,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 커피가 없는데 (…..) 마실래요?",
    "options": [
      "물이라도",
      "물라도",
      "물이지만",
      "물이나"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- (이)라도 ‘dù là...cũng hãy...' (15, Diễn tả sự lựa chọn). Danh từ + (이)라도 (1) \"cho dù, dù là\"."
  },
  {
    "id": 219,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 사람들이 음식을 (…..) 상관없이 일단 많이 준비해 놓을게요.",
    "options": [
      "먹어서",
      "먹든지 말든지",
      "그말든지",
      "암 먹든지"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]- 든지-든지  'bất kể, bất cứ' (15, Diễn tả sự lựa chọn). ."
  },
  {
    "id": 220,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이 약은 입에 (….._ 효과는 아주 좋다.",
    "options": [
      "써서",
      "쓰고나서",
      "쓰고 있고",
      "쓴 대신에"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP]-(으)ㄴ/는 대신에 “bù lại, thay vào đó” (15, Diễn tả sự lựa chọn). vế trước và vế sau có nội dung trái ngược nhau."
  },
  {
    "id": 221,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이 (…..) 집에 돌아왔어요.",
    "options": [
      "주동안",
      "주만에",
      "주만 해서",
      "주이나"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP] 만에 (16, Diễn tả thời gian và trật tự hành động). Diễn tả việc nào đó xảy ra một thời gian, sau đó lại có việc khác xảy ra."
  },
  {
    "id": 222,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 숙제는 내일까지 (….) 올게요.",
    "options": [
      "해 가지고",
      "했는데",
      "해서",
      "하면서"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]- 아/어 가지고 (16, Diễn tả thời gian và trật tự hành động). Thể hiện kết quả hay trạng thái nào đó của vế trước được duy trì."
  },
  {
    "id": 223,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 저녁에 피자과 지킨을 (…) 집에서 먹을까요?",
    "options": [
      "시켜서",
      "시켜다가",
      "시키나",
      "시키는 바람에"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-아/어다가 “rồi” (16, Diễn tả thời gian và trật tự hành động). Cấu trúc này diễn tả phải có hành động ở mệnh đề trước thì mới có hành động ở mệnh đề sau."
  },
  {
    "id": 224,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 계단에서 (….. )한참을 일어나지 못했어요.",
    "options": [
      "넘어지고서",
      "넘어지거든",
      "넘어지면",
      "넘어져서"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-고서 ‘sau khi’ (16, Diễn tả thời gian và trật tự hành động). Ngữ pháp 고서 trong tiếng Hàn dùng để thể hiện mối quan hệ giữa hai sự việc của mệnh đề trước và mệnh đề sau."
  },
  {
    "id": 225,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 세일을 한다고 해서 옷을 샀어요. 그런데 옷을 (......) 작년 상품이었어요.",
    "options": [
      "샀는데",
      "사고 보니",
      "샀지만",
      "살"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]- 고 보니 làm (vế trước) ~ rồi mới thấy  rồi mới biết  rồi mới nhận ra...(vế sau) (17, Diễn tả sự phát hiện và kết quả). 고 보니 diễn đạt việc nhận ra, khám phá ra một kết quả mới, có thể không ngờ đến hoặc khác với suy nghĩ của mình ở vế sau, sau khi thực hiện một việc ở vế trước."
  },
  {
    "id": 226,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 자꾸 (......) 이젠 매운 음식도 잘 먹게 되었어요.",
    "options": [
      "먹다 보니",
      "먹고",
      "먹는",
      "먹지만"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]- 다 보니 (17, Diễn tả sự phát hiện và kết quả). 다 보니 diễn tả người nói phát hiện điều gì mới hay tình huống mới xảy ra sau khi thực hiện hành động nào đó liên tục trong quá khứ."
  },
  {
    "id": 227,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 어제 친한 친구하고 크게 싸워서 기분이 안 좋아요.나: 같이  (......) 싸울 때도 있지요. 하지만 빨리 화해하세요.",
    "options": [
      "지내고",
      "지내다 보면",
      "지내고 해서",
      "지내는데"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- 다 보면 “cứ (làm gì đó)…thì…” (17, Diễn tả sự phát hiện và kết quả). 다 보면 diễn tả hành động ở mệnh đề trước liên tục xảy ra và cuối cùng dẫn đến một kết quả nào đó."
  },
  {
    "id": 228,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아기 때부터 (......) 배우가 되었어요.",
    "options": [
      "예쁘더니",
      "예쁘고",
      "예쁜",
      "예쁘지만"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]- 더니 Vậy mà,thế mà... vì,do...nên (17, Diễn tả sự phát hiện và kết quả). Sử dụng 더니 khi một trạng thái khác ở vế sau xuất hiện có tính tương phản, trái ngược với thứ mà người nói đã từng có kinh nghiệm hay đã biết trước đây ở vế trước (diễn tả sự đối lập giữa quá khứ và hiện tại của một sự việc, trạng thái nào đó mà người nói trực tiếp chứng kiến, trải nghiệm."
  },
  {
    "id": 229,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 유리 씨에게 (......) 계속 통화중이었다.",
    "options": [
      "전화했더니",
      "전화했고",
      "전화했지만",
      "전화하기 위해서"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP] 았었 더니 đã… nên… mà (17, Diễn tả sự phát hiện và kết quả). 았/었 더니 diễn tả sau khi thực hiện hành động ở mệnh đề trước thì người nói phát hiện ở mệnh đề sau một điều gì đó mới, khác với sự việc hay tình huống trong quá khứ."
  },
  {
    "id": 230,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 한 잔만 마셨으니까 운전해도 되겠지요?나: 술을 마시고 (......) 큰일 나요. 오늘은 택시 타고 가세요.",
    "options": [
      "운전해서",
      "운전하다가는",
      "운전하도록",
      "운전했더니"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 6, [NGỮ PHÁP]- 다가는 (17, Diễn tả sự phát hiện và kết quả). 다가는 diễn tả hành động hoặc trạng thái nào đó cứ tiếp tục thì sẽ có kết quả không tốt xảy ra."
  },
  {
    "id": 231,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 다른 사람들에 비하면 나는 매운 음식을 잘 먹는 거나 마찬가지다.",
    "options": [
      "먹는 셈이다",
      "먹을 것 같아요",
      "먹지 않아요",
      "먹어요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 7, [NGỮ PHÁP]- (으)ㄴ는 셈이다 Xem như là, coi như là (17, Diễn tả sự phát hiện và kết quả). Cấu trúc (으)ㄴ는 셈이다 diễn đạt sau khi xem xét một vấn đề gì, sự việc nào đó thì kết luận rằng nó gần giống với một sự việc nào đó."
  },
  {
    "id": 232,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 날씨가 더우니까 제가 회의실에 미리 가서 에어컨을  (......).",
    "options": [
      "틀어 놓을게요",
      "틀어요",
      "틀고 해서",
      "틀더니"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]- 아어 놓다 (18, Diễn tả trạng thái hành động). ."
  },
  {
    "id": 233,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 자를  (......) 곳이 어디예요?",
    "options": [
      "세워서",
      "세워 둔",
      "세우지만",
      "세우거나"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]- 아어 두다 (18, Diễn tả trạng thái hành động). 아어 두다 diễn tả một hành động xảy ra trong quá khứ nhưng trạng thái của nó vẫn duy trì và kéo dài đến hiện tại và tương lai."
  },
  {
    "id": 234,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 휴대폰 전원을 (......) 수리 센터에 가져가야 한다.",
    "options": [
      "끈 채로",
      "끄지 않아도",
      "끄지만",
      "끄더니"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- (으)ㄴ 채로 (18, Diễn tả trạng thái hành động). (으)ㄴ 채로 diễn tả một hành động nào đó vẫn giữ nguyên trạng thái hành động trước và tiếp nối bởi một hành động khác ở phía sau."
  },
  {
    "id": 235,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 어머니가 지난 주말에  (......) 어제 백화점에 가서 새 옷을 사 주셨어요.",
    "options": [
      "약속하고",
      "약속한 대로",
      "약속해서",
      "약속하지만"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] (으)ㄴ는 대로 (18, Diễn tả trạng thái hành động). (으)ㄴ는 대로 kết hợp với động từ thì diễn tả hành động mệnh đề sau diễn ra đúng theo cách mệnh đề trước."
  },
  {
    "id": 236,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 저는 아침보다는 저녁에 더 많이  (......).",
    "options": [
      "먹어요",
      "먹는 편이에요",
      "먹는데",
      "먹지만"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP]- (으)ㄴ는 편이다 Vào loại.., thuộc diện (19, Diễn tả đặc điểm và tính chất). (으)ㄴ는 편이다 được sử dụng khi nói về một sự việc nào đó gần với hoặc thuộc về phía nào đó hơn là nói một cách quả quyết ."
  },
  {
    "id": 237,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그렇게 하는 것은 (......) 행동입니다.",
    "options": [
      "바본",
      "바보스러운",
      "바보지만",
      "바보고"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] 스럽다 (19, Diễn tả đặc điểm và tính chất). Tiếp từ '스럽다' gắn vào danh từ với nghĩa có cảm giác hoặc tính chất giống như danh từ đó."
  },
  {
    "id": 238,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 동생에게 그렇게 심한 말을 하는 것은 정말 (......)지 않은 행동이야.",
    "options": [
      "형이",
      "형답",
      "형아니",
      "형인"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP] 답다 (19, Diễn tả đặc điểm và tính chất). Tiếp từ 답다 gắn vào danh từ, diễn tả đặc điểm hoặc tính chất của danh từ đó."
  },
  {
    "id": 239,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 우리 아이가 7살이 되더니 얼마나 말을 안 (......) 모릅니다.",
    "options": [
      "듣도록",
      "들어서",
      "듣는지",
      "듣고"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]- 얼마나-(으)ㄴ는지 모르다 Không biết nhiều bao nhiêu, nhiều đến thế nào (20, Diễn tả sự nhấn mạnh). ."
  },
  {
    "id": 240,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 여보, 오늘도 야근할 거예요?나: 상사들이 모두 야근을 하니까 나도 야근을 (......).",
    "options": [
      "했어요",
      "하지만",
      "헸는데",
      "할 수밖에 없어요"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-(으)ㄹ 수밖에 없다 Không còn cách nào khác (20, Diễn tả sự nhấn mạnh). (으)ㄹ 수밖에 없다 là dạng ngữ pháp kết hợp của hai ngữ pháp -(으)ㄹ 수 없다 (không thể làm thứ gì đó) và 밖에 được dùng trong câu phủ định để diễn đạt ý nghĩa “chỉ có/ only”."
  },
  {
    "id": 241,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 지수는 단지 같은 과 (......) 다른 사람들이 애인인 줄 알아요.",
    "options": [
      "친구이지만",
      "친구일 뿐인데",
      "친구답고",
      "친구하고"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- (으)ㄹ 뿐이다 ‘chỉ, chỉ là’ (20, Diễn tả sự nhấn mạnh). Ý nghĩa của cấu trúc ㄹ 뿐이다, 을 뿐이다: 앞에 오는 말이 나타내는 상태나 상황 이외에 다른 어떤 것도 없음을 나타내는 표현."
  },
  {
    "id": 242,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: (......) 제가 가장 존경하는 분이에요.",
    "options": [
      "할아버지인데",
      "할아버지야말로 인해",
      "할아버지이지만",
      "할아버지야말로"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP] (이)야말로 Thực sự Chắc chắn (20, Diễn tả sự nhấn mạnh). ."
  },
  {
    "id": 243,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 학생들이  (......) 난방 온도를 올렸어요.",
    "options": [
      "춥지 않아서",
      "춥지 않게",
      "춥도록",
      "추운데"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP] -게 để, để cho (21, Diễn tả mục đích). ."
  },
  {
    "id": 244,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 사람들이 (......) 큰 소리로 말해 주세요.",
    "options": [
      "듣지 않아서",
      "듣고 싶지않아",
      "들거나",
      "들을 수 있도록"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP] - 도록 Đểđể cho - cho đến khicho đến tận (21, Diễn tả mục đích). ."
  },
  {
    "id": 245,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 마음이 맞지 않는 사람과 일을 (…….) 차라리 밤을 새워도 혼자 하는 게 낫지.",
    "options": [
      "해서",
      "하느니",
      "하거나",
      "하도록"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]- 느니 (1, Diễn tả sự lựa chọn). Ngữ pháp 느니 được dùng trong tình huống có 2 mệnh đề được đưa ra, cả 2 mệnh đề đều phù hợp nhưng mệnh đề sau sẽ phù hợp hơn, ưu tiên hơn."
  },
  {
    "id": 246,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 게으름을 (……) 안 하는 것이 더 좋겠다.",
    "options": [
      "피울 때",
      "피울 바에야",
      "피우면",
      "피우니까"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-(으)ㄹ 바에야 (1, Diễn tả sự lựa chọn). Kết hợp sau động từ biểu hiện nghĩa \"đối với việc."
  },
  {
    "id": 247,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그 사람이 누구를 (……) 너하고는 관계가 없잖아.",
    "options": [
      "만나건",
      "만나고",
      "만나고자",
      "만나기는 했지만"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- 건-건 (1, Diễn tả sự lựa chọn). Biểu hiện có tính khẩu ngữ, thể hiện việc không liên quan, không sao cho dù có làm cái gì."
  },
  {
    "id": 248,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 좋아해서 (……) 편해서 먹는 거예요.",
    "options": [
      "먹는데",
      "먹는다기보다는",
      "먹도ㄱ",
      "먹거나"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-(느)ㄴ 다기보다는 (1, Diễn tả sự lựa chọn). Được gắn vào thân tính từ hay động từ hành động dùng khi phủ nhận nội dung vế trước và nội dung ở vế sau phù hợp hơn."
  },
  {
    "id": 249,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 난 씨가 열심히 음식을 만들었는데, 남편이 (…….) 요리 학원에라도 다냐야겠다고 했다",
    "options": [
      "난 씨 때문에",
      "난 씨인데",
      "난 씨이고",
      "난 씨보고"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-보고 (2, Diễn tả sự trích dẫn). Ngữ pháp này dùng để chỉ ra người chịu trực tiếp tác động bởi hành động, nhờ và, gợi ý hoặc mệnh lệnh sai khiến."
  },
  {
    "id": 250,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 친구가 이 책을 읽어 (….) 읽긴 했는데 무슨 말인지 하나도 모르겠어요",
    "options": [
      "보면",
      "보라니까",
      "보도록",
      "보는데"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-(느)ㄴ다니까 (2, Diễn tả sự trích dẫn). [A다니까 B] là dạng rút gọn của 'ㄴ/는다고 하다+(으)니까' mang ý nghĩa là 'vì A - lời nói của bản thân hoặc nội dung mà nghe từ người khác nên xuất hiện, xảy ra hiệu ứng/phản ứng hoặc tình huống B."
  },
  {
    "id": 251,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 요즘 투안 씨가 무슨 일이 있나 봐요. 수업이 끝나자 마자 (…..) 뛰어나가던데요",
    "options": [
      "늦었다면서",
      "늦었기 때문에",
      "늦었으면",
      "늦었고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3,[NGỮ PHÁP]-(느)ㄴ다면서 (2, Diễn tả sự trích dẫn). Ngữ pháp -다면서 (Còn được viết rút gọn 다며): Dùng để hỏi xác nhận lại thông tin : nghe nói là ."
  },
  {
    "id": 252,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 세계 보건 기구의 (…..) 간접흡연으로 매년 60만 명이 사망한다고 한다",
    "options": [
      "발표에 따라",
      "발표에 의하면",
      "발표인데",
      "발표에서"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-에 의하면 (2, Diễn tả sự trích dẫn). Được gắn vào danh từ dùng khi làm sáng tỏ nguồn gốc của nội dung được trích dẫn."
  },
  {
    "id": 253,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: (......) 가득한 가정이 행복한 가정이지요.",
    "options": [
      "즐겁게",
      "즐거워",
      "즐거운지",
      "즐거움이"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)ㅁ (3, Diễn tả danh từ hoá). Được gắn vào thân tính từ hoặc động từ hành động dùng khi chuyển đổi tính từ hoặc động từ hành động sang dạng danh từ."
  },
  {
    "id": 254,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이번 사건으로 우리 모두(......) 많습니다.",
    "options": [
      "얻은 바가",
      "얻기",
      "얻게",
      "얻도록"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-는 바 (3, Diễn tả danh từ hoá). Thể hiện việc hoặc nội dung trong lời nói ở phía trước."
  },
  {
    "id": 255,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 과학 기술의 (......) 우리의 생활이 편리해졌다.",
    "options": [
      "발전으로 인해",
      "발전은",
      "발전이",
      "발전하고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)로 인해서 Vì do bởi...mà (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 256,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 각계각층의 사람들이 모금 활동에 적극 (......) 목표 금액을 쉽게 달성할 수 있었다.",
    "options": [
      "참여했고",
      "참여했기에",
      "참여했는데",
      "참여했지만"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 10, [NGỮ PHÁP]-기에 '(như thế nào đó) chođể mà (làm gì đó)' (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 257,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 얼마 만에 고향에 가신 거였어요?나: 1년 만이었어요. 오래간만에 가서 그런지 부모님께 서 무척 좋아하시더라고요. 근처에 사는 친척들도 우리를 본다고  (......) 가까운 곳으로 가족 여행도 다녀왔어요.",
    "options": [
      "왔는데",
      "왔길래",
      "왔지만",
      "왔더니"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 11, [NGỮ PHÁP]-길래 ...vì vậyvì thế..., ...mà (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 258,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 버스를 잘못 (......) 반대 방향으로 한참을 갔어요.",
    "options": [
      "타는 통에",
      "타고",
      "타지만",
      "탈"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-는 통에 ‘tại vì… nên…’ (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 259,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 명절 때만 되면 주부들은 많은 음식 (......) 온몸이 녹초가 되곤 한다.",
    "options": [
      "준비로 말미암아",
      "준비가",
      "준비는",
      "준비를 위해서"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- (으)로 말미암아 “vì, do…” (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 260,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 다 같이 기숙사 생활을 (......) 각자가 약간의 불편을 감수해야 한다.",
    "options": [
      "하느니만큼",
      "하지만",
      "했더니",
      "했는데"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-느니만큼 “nên” (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 261,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 수강 신청자가 이렇게 (......) 폐강을 해야 하지 않을까 싶습니다.",
    "options": [
      "적은 이상",
      "적은",
      "적으나",
      "적으면"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP]-는 이상 (4, Diễn tả lý do và nguyên nhân). Được gắn vào thân tính từ hoặc động từ hành động dùng khi lấy sự thật được coi chắc chắn làm tiền đề để làm sáng tỏ quan điểm hay chủ trương của người nói."
  },
  {
    "id": 262,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아이 방이 좀 (......) 그렇게 아이를 야단칠 것까지 있나 싶어요.",
    "options": [
      "더럽기로",
      "더럽고",
      "더럽기로서니",
      "더러워"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 6, [NGỮ PHÁP]-기로서니 (4, Diễn tả lý do và nguyên nhân). Được gắn vào thân tính từ hay động từ hành động dùng khi xem nhẹ nội dung của vế sau và không thể chấp nhận mặc dù công nhận nội dung của vế trước."
  },
  {
    "id": 263,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그 사람의 키가 (......) 안 그랬으면 이 옷이 안 맞았겠네요.",
    "options": [
      "크기에 망정이지",
      "크기",
      "크지만",
      "커서"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 7, [NGỮ PHÁP]-기에 망정이지 “may mà… chứ…” (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 264,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 행사가 (......) 사람들이 주로 사용하는 길을 다 막아버렸다.",
    "options": [
      "있답시고",
      "있지만",
      "있고",
      "있는데"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 8, [NGỮ PHÁP]-(느)ㄴ 답시고 “bày đặt bảo là… rồi lạimà lại” (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 265,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 책을 많이 (......) 견문을 넓히고 있습니다",
    "options": [
      "읽음으로써",
      "읽어도",
      "읽으로",
      "읽지만"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 9, [NGỮ PHÁP]-(으)ㅁ으로써  “với việc…, bằng việc…, bởi việc…” (4, Diễn tả lý do và nguyên nhân). ."
  },
  {
    "id": 266,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 남편이 화를 (….) 참으세요",
    "options": [
      "내면",
      "내기 때문에",
      "내도록",
      "내더라도"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]- 더라도 (5, Diễn tả tình huống giả định). [A더라도 B]: Cấu trúc này thể hiện việc thực hiện B không liên quan, không chịu ảnh hưởng khi giả định A xảy ra."
  },
  {
    "id": 267,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그 선수가 아무리 세계적으로 (….) 도덕적으로 문제가 있다면 대중으로부터 외면 받게 마련이다.",
    "options": [
      "유명한데",
      "유명하고",
      "유명할 때",
      "유명할지라도"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]- (으)ㄹ지라도 (5, Diễn tả tình huống giả định). Gắn vào sau động từ và tính từ, thể hiện ý nghĩa nhấn mạnh mặc dù vế trước đưa ra một tình huống nào đó và công nhận hay giả định điều đó nhưng kết quả vế sau đối lập hay khác với sự mong đợi của vế trước."
  },
  {
    "id": 268,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 의학이 (…..) 모든 질병을 극복할 수는 없을 것이다.",
    "options": [
      "발달하면",
      "발달한 다음에",
      "발달한들",
      "발달한데"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)ㄴ들 (5, Diễn tả tình huống giả định). Biểu hiện nghĩa cho dù nội dung giả định ở vế trước được công nhận thì kết quả xảy ra ở vế sau cũng ngoài dự tính, khác với dự kiến."
  },
  {
    "id": 269,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 저회는 따로 (…..) 늘 부모님을 생각합니다.",
    "options": [
      "살망정",
      "살 때",
      "사면",
      "사고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-(으)ㄹ망정 (5, Diễn tả tình huống giả định). Gắn vào sau động từ hoặc tính từ dùng khi nhấn mạnh sự thật như thế nào đó trong vế sau hoàn toàn khác với suy nghĩ thông thường mặc cho sự thật ở vế trước (công nhận sự việc mang tính phủ định ở phía trước, đồng thời nói tiếp sự việc khác trái ngược với điều đó."
  },
  {
    "id": 270,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 돈이 아무리 (…..) 집에 갈 차비는 있겠지.",
    "options": [
      "없다고 하는데",
      "없다고 치더라도",
      "없다고 하면",
      "없다고 하던데"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP]-(느)ㄴ다고 치다 (5, Diễn tả tình huống giả định). Thể hiện sự thừa nhận, chấp nhận, công nhận là như thế về một hoàn cảnh, tình huống nào đó."
  },
  {
    "id": 271,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가족들과 여행 (….) 아프리카에 가서 봉사활동을 했다.",
    "options": [
      "온 셈치고",
      "오는데",
      "오면",
      "오고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 6, [NGỮ PHÁP]- 는 셈치다 (5, Diễn tả tình huống giả định). Biểu hiện này thể hiện sự giả định nội dung ở vế trước quá đó làm tiền đề để thực hiện việc nào đó ở vế sau, tương đương trong tiếng Việt “cứ cho là, cứ coi như là, kể như là, xem như là”."
  },
  {
    "id": 272,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 집에 (..........) 손발을 깨끗이 씻어라",
    "options": [
      "오면",
      "오기가 무섭게",
      "오도록",
      "올 뿐만 아니라"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-기가 무섭게 (6, Diễn tả hành động mang tính tuần tự). Nó là dạng nhấn mạnh của 자마자 với nghĩa là \"ngay khi, ngay sau khi\"."
  },
  {
    "id": 273,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아이는 돈을(……) 좋아서 웃었어요",
    "options": [
      "받기 위해서",
      "받아서",
      "받으면",
      "받자"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-자 (6, Diễn tả hành động mang tính tuần tự). Diễn tả hành động ở vế sau bắt đầu được thực hiện ngay sau khi hành động ở vế trước kết thúc."
  },
  {
    "id": 274,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 부모님이 옆에 (……) 힘든 일이 있어도 의지할 곳이 있다.",
    "options": [
      "계시고",
      "계시는 한",
      "계셔도",
      "계셔서"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-는 한 (7, Diễn tả điều kiện và quyết định). Đứng sau động từ diễn tả điều kiện, tiền đề hoặc yêu cầu về một hành động hay một trạng thái nào đó (Vế trước trở thành điều kiện hay tiền đề đối với trạng thái hay hành vi ở vế sau), có nghĩa tương đương trong tiếng Việt là ‘nếu, nếu như, trong trường hợp, chỉ với điều kiện’."
  },
  {
    "id": 275,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 리모컨이 평소에는 잘 보이다가 텔레비전을 (……) 이상하게 안 보인다.",
    "options": [
      "보고",
      "봐서",
      "보면",
      "볼라치면"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-(으)ㄹ라치면 (7, Diễn tả điều kiện và quyết định). Tình huống của mệnh đề sau sẽ xảy ra một cách đương nhiên khi lấy kinh nghiệm của sự thật trong quá khứ làm điều kiện."
  },
  {
    "id": 276,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 힘들어도 포기하지 않고 계속 (……) 반드시 성공할 거예요.",
    "options": [
      "노력해서",
      "노력하노라면",
      "노력하고",
      "노력하면"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-노라면 (7, Diễn tả điều kiện và quyết định). Ngữ pháp này biểu hiện việc nếu liên tục, thường xuyên làm một việc gì đó ở vế trước thì sẽ cho ra một kết quả tương tự ở vế sau."
  },
  {
    "id": 277,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 현재 진행 중인 수출 계약의 성사 여부는 우리 제품의 품질이 얼마나 (…..)",
    "options": [
      "뛰어나냐에 달려 있습니다.",
      "뛰어나요",
      "뛰어나기 때문이에요",
      "뛰어나거든요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4,[NGỮ PHÁP] V/A-느냐에 달려 있다 (7, Diễn tả điều kiện và quyết định). Gắn vào thân tính từ hay động từ hành động thể hiện ý nghĩa rằng kết quả nào đó được quyết định tùy vào nội dung của vế trước."
  },
  {
    "id": 278,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아무리 예쁜 옷도 사람마다 모두 다르게 보이므로 (…..)",
    "options": [
      "입기 나름이라고 생각한다",
      "입는데요",
      "입어요",
      "입거든요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP]-기 나름이다 (7, Diễn tả điều kiện và quyết định). Gắn vào sau động từ, thể hiện ý nghĩa một việc hay một hành vi nào đó có thể thay đổi tùy theo phương pháp hay mức độ thực hiện công việc hay hành vi đó như thế nào."
  },
  {
    "id": 279,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 제 음성 메시지를 듣는 대로 전화해 주세요.",
    "options": [
      "듣니까",
      "듣는 대로",
      "듣에 따라",
      "듣다고"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1,[NGỮ PHÁP]-은/는 대로 “như, cứ như, theo như..” (8, Diễn tả hành động tiếp nối nhau và thể hiện hành động riêng biệt). Đứng sau động từ hoặc tính từ, biểu hiện ý nghĩa “thực hiện vế sau như hành vi đang xảy ra ở vế trước đó”."
  },
  {
    "id": 280,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 고향에 간 김에 전통의상도 사가지고 왔다",
    "options": [
      "간 김에",
      "가느니",
      "감에도 불구하고",
      "가건만"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]- 는 김에 nhân tiện, nhân thể, tiện thể, sẵn tiện (8, Diễn tả hành động tiếp nối nhau và thể hiện hành động riêng biệt). [A 는 김에 B] Thể hiện việc 'nhân cơ hội/ dịp làm việc A thì cùng làm việc B (xuất hiện, nảy sinh mà đã không được dự tính trước)."
  },
  {
    "id": 281,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 여기는 공공장소건만 너무 시끄럽게 떠들고 있다.",
    "options": [
      "공공장소느니",
      "공공장소고도",
      "공공장소건만",
      "공공장소는 듯이"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]- 건만 ‘thế nhưng, nhưng mà’ (9, Diễn tả phản đối và đối chiếu). Gắn vào sau động từ và tính từ, có nghĩa tương đương trong tiếng Việt là 'thế nhưng, nhưng mà' thể hiện sự xuất hiện của một sự kiện hay động tác nào đó ngược lại với những điều mong đợi hay lý giải từ một sự thật của mệnh đề trước đó."
  },
  {
    "id": 282,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 한국에 오시고도 연락조차 안 하셔서 서운했습니다.",
    "options": [
      "오시고도",
      "오시건만",
      "오신듯이",
      "오시는 대로"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]- 고도 “mà lại, cho dù… vẫn, mặc dù… cũng” (9, Diễn tả phản đối và đối chiếu). Là hình thái rút gọn của ‘고(2)+아/어도’ thể hiện hành động vế trước đã hoàn thành thì hành động vế sau nối tiếp nhưng kết quả không bình thường hoặc khác với mong đợi."
  },
  {
    "id": 283,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 항상 열심히 공부하는데도 불구하고 시험을 못 봐요.",
    "options": [
      "공부하느니",
      "공부하는데도 불구하고",
      "공부하건만",
      "공부하고도"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]- (으)ㅁ에도 불구하고 (9, Diễn tả phản đối và đối chiếu). Có thể hiểu nghĩa nó gần như : “Dù/ mặc dù… mà (vẫn) Ngữ pháp giống ngữ pháp này: “- (으)ㄴ/는데도 불구하고”."
  },
  {
    "id": 284,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 일이 바빠서 아침은 물론이거니와 점심도 아직 못 먹었어요",
    "options": [
      "물론이는 대로",
      "물론이느니",
      "물론이거니와",
      "물론이건만"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-거니와 ‘…thêm vào đó' (11, Diễn tả bao gồm và bổ sung). Gắn vào sau động từ hay tính từ, có nghĩa tương đương trong tiếng Việt là '… ."
  },
  {
    "id": 285,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 아들하고 대화는커녕 얼굴 본지도 한참 되었다",
    "options": [
      "대홤에도 불구하고",
      "대화는커녕",
      "대화느니",
      "대화는 대로"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-기는커녕 ‘chẳng những không…. mà lại còn’ (11, Diễn tả bao gồm và bổ sung). ."
  },
  {
    "id": 286,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 요즘은 날씨도 더울뿐더러 습기도 많지요.",
    "options": [
      "덥건만",
      "더울뿐더러",
      "더움에도 불구하고",
      "덥는 대로"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)ㄹ뿐더러 \"Không những chỉ ... mà còn\" (11, Diễn tả bao gồm và bổ sung). Được gắn vào thân tính từ hoặc động từ hành động dùng khi thể hiện thêm nội dung khác vào nội dung nào đó (cộng thêm một sự thật hay tình huống khác vào một sự thật hay tình huống nào đó)."
  },
  {
    "id": 287,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 진달래는 꽃이되 꽃이 곧 진달래만은 아니다.",
    "options": [
      "꽃이는 대로",
      "꽃이건만",
      "꽃이고도",
      "꽃이되"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-되 ‘nhưng’ (11, Diễn tả bao gồm và bổ sung). Thường được dùng trong văn viết và mang phong thái lịch sự, cổ xưa."
  },
  {
    "id": 288,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 엄마마저 나를 못 믿는구나",
    "options": [
      "엄마과",
      "엄마마저",
      "엄마하고",
      "엄마처럼"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 5, [NGỮ PHÁP]- 마저 “kể cả, ngay cả, thậm chí…” (11, Diễn tả bao gồm và bổ sung). Danh từ + 마저: 마저 gắn vào sau danh từ, có nghĩa tương đương trong tiếng Việt là “kể cả, ngay cả, thậm chí…”, dùng để thể hiện sự cộng thêm nội dung khác ngoài nội dung của danh từ trước đó."
  },
  {
    "id": 289,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 물가 상승으로 인해 우편 요금을 비롯한 공공요금이 오른다고 한다.",
    "options": [
      "요금을 비롯한",
      "요금처럼",
      "요금에 따라",
      "요금이어도"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 6, [NGỮ PHÁP]-을/를 비롯해서 (11, Diễn tả bao gồm và bổ sung). Được gắn vào danh từ dùng khi thể hiện cái bắt đầu đầu tiên trong một vài cái."
  },
  {
    "id": 290,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그녀는 조금의 티끌도 남기지 않으려는 듯이 빨래를 빨아 댔다",
    "options": [
      "빨면",
      "빨아 댔다",
      "빨기마저",
      "빨건만"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-아/어 대다 (12, Diễn tả thái độ và thói quen). Ngữ pháp tiếng Hàn thông dụng, trong tiếng Việt khi diễn tả một số hành động có tính liên tục thì có thể dùng các từ như ” lắm, (nhiều)cứ, liên tục” vậy trong tiếng Hàn cũng có 1 ngữ pháp tương tự để diễn đạt ý nghĩa này đó là 아/어 대다."
  },
  {
    "id": 291,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 자취를 하는 승규는 아침을 거르기 일쑤이다",
    "options": [
      "거르다면",
      "거르건만",
      "거르기 일쑤이다",
      "거르고도"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-기 일쑤이다 “thường xuyên, thường, hay…” (12, Diễn tả thái độ và thói quen). Gắn sau động từ biểu hiện việc phát sinh thường xuyên một hành vi hay sự việc không mong muốn nào đó."
  },
  {
    "id": 292,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 늦잠을 자는 바람에 아침밥은커녕 세수도 하는 둥 마는 둥 하고 나왔어요.",
    "options": [
      "하는 둥 마는 둥 하고",
      "하느니",
      "하거니와",
      "하기는커녕"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-는 둥 마는 둥 하다 ‘làm cũng như không làm, làm sơ sài, làm qua loa, làm cho có (12, Diễn tả thái độ và thói quen). Gắn vào sau động từ, thể hiện ý nghĩa không làm chăm chỉ hoặc hoàn toàn không làm một hành vi nào đó."
  },
  {
    "id": 293,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 과학 기술은 예측할 수 없으리만치 빠른 속도로 발전하고 있다.",
    "options": [
      "없이마저",
      "없다시피 해서",
      "없으리만치",
      "없는 대로"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)리만치 (13, Diễn tả mức độ). Dùng cấu trúc này để nhấn mạnh nội dung vế sau đến độ như nội dung vế trước."
  },
  {
    "id": 294,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 거짓말을 하다 못해 이젠 속이기까지 하니?",
    "options": [
      "하다 못해",
      "하건만",
      "하고도",
      "한 듯이"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-다 못해 (13, Diễn tả mức độ). Khi kết hợp với động từ nó thể hiện việc không thể tiếp tục hơn nữa hành động mà từ ngữ phía trước thể hiện, tương đương với nghĩa “không thể."
  },
  {
    "id": 295,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 모자를 준다는 것이 그만 옷을 줬어요.",
    "options": [
      "준다면",
      "준다는 것이",
      "준 듯이",
      "주는 김에"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(느)ㄴ다는 것이 (14, Diễn tả ý đồ). Được dùng khi phía sau xảy ra kết quả hoặc hành động nào đó khác với ý đồ đã định ra trước đó bởi vì sự nhầm lẫn, sai lầm, hoặc tình huống không thể làm gì khác."
  },
  {
    "id": 296,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 남의 말을 듣지 않고 자기의 주장만 내세우려고 든다면 토론이 제대로 이루어지지 않을 것이에요.",
    "options": [
      "내세우면",
      "내세우려고 든다면",
      "내세우건만",
      "내세우고도"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-(으)려고 들다 (14, Diễn tả ý đồ). Gắn vào thân động từ hành động thể hiện nghĩa ‘nếu mang ý đồ đó và hành động một cách tích cực’."
  },
  {
    "id": 297,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 당장 결정을 내리려다가 하루 더 생각하기로 하였습니다.",
    "options": [
      "내리면",
      "내리는 대로",
      "내리느까",
      "내리려다가"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)려다가 (14, Diễn tả ý đồ). Cấu trúc thể hiện việc đang có ý đồ thực hiện hành vi nào đó thì ngừng lại hoặc bị thay đổi sang hành vi khác."
  },
  {
    "id": 298,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가 : 소포를 급하게 보내느라고 주소를 잘못 썼어요.나: 서두르다 보면 실수하기 마련이지요.",
    "options": [
      "실수할 듯하지요",
      "실수하는 법이지요",
      "실수할 뿐이지요",
      "실수할 척하지요"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-기 마련이다 “chắc chắn là…, đương nhiêntất nhiêndĩ nhiên là…” (16, Diễn tả sự đương nhiên). 기 마련이다 Là cấu trúc mà động từ, tính từ, vị từ이다 kết hợp với –기 trở thành tiểu cú danh từ rồi được tiếp nối bởi마련이다."
  },
  {
    "id": 299,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 사람이 병에 걸리면 마음이 약해지기 마련이에요.",
    "options": [
      "약해지는 법이에요",
      "약하던데요",
      "약하기 때문이에요",
      "약하는데요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-는 법이다  'hiển nhiên là, chắc chắn là…’ (16, Diễn tả sự đương nhiên). 는 법이다 thể hiện động tác hay trạng thái ở vế trước đã được định ra hoặc điều đó là đương nhiên."
  },
  {
    "id": 300,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이곳 날씨는 아침에는 (......), 저녁에는 비가 오기도 한다.",
    "options": [
      "좋은",
      "좋은가 하면",
      "좋지 않아서",
      "좋아 가"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-는가 하면 ‘nếu có … thì cũng có…’ (17, Diễn tả sự liệt kê). 는가 하면 đứng sau động từ hoặc tính từ thể hiện việc vừa có nội dung ở vế trước đồng thời cũng vừa có nội dung ở vế sau khi nói về một tình huống nào đó, hai nội dung đối lập nhau, trong nội dung mệnh đề sau thường dùng chữ 도."
  },
  {
    "id": 301,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 호텔이 경치가(......) 시설이 (......) 내 집만 못하다.",
    "options": [
      "좋으니/좋으니 해도",
      "좋지만/좋을 때",
      "좋으니까/좋으니까",
      "좋아도/좋아서"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-느니-느니 하다 (17, Diễn tả sự liệt kê). 느니-느니 하다 được sử dụng để liệt kê những suy nghĩ hoặc ý kiến khác nhau về một sự việc hoặc trạng thái nào đó (có thể tương phản hoặc có quan hệ với nhau để tạo sự đối lập về nội dung giữa mệnh đề đi trước và mệnh đề đi sau)."
  },
  {
    "id": 302,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 40대 가장들은 노후 준비도  (......) 아이들 교육도  (......) 이래저래 돈 들어갈 데가 많다.",
    "options": [
      "하지만/시키고",
      "하면/시키면",
      "해/시켜",
      "하랴/시키랴"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)랴-(으)랴 nào là... nào là..., vừa lo… vừa lo (17, Diễn tả sự liệt kê). ."
  },
  {
    "id": 303,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 오빠는  (......) 할머니가 좋아하시는 것들을 잔뜩 사 들고 왔다.",
    "options": [
      "떡이/한과",
      "떡이며/한과며",
      "떡이며/한과와",
      "떡이와/한과며"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-(이)며-(이)며 vừa ... vừa..., và (17, Diễn tả sự liệt kê). ."
  },
  {
    "id": 304,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그 성악가는 5번 넘게 성대 수술을  (......) 잃어버렸던 목소리를 되찾을 수 있었다.",
    "options": [
      "받은 끝에",
      "받은",
      "받지만",
      "받고"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)ㄴ 끝에 (18, Diễn tả hồi tưởng và kết quả). (으)ㄴ 끝에 đứng sau danh từ ,động từ ở dạng định ngữ thì quá khứ để chỉ ý nghĩa vế sau bắt đầu từ hành động của vế trước."
  },
  {
    "id": 305,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 김주희 씨는 신체장애가 있는 딸을 세계적인 피아니스트로 (......).",
    "options": [
      "길러 냈고",
      "길러 냈지만",
      "길러 냈다",
      "길러 낸"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-아어 내다 (18, Diễn tả hồi tưởng và kết quả). ."
  },
  {
    "id": 306,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그는 며칠 밤을 (......)쓰러지고 말았다.",
    "options": [
      "새고",
      "새기 십상이고",
      "새고서야",
      "샌 나머지"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)ㄴ 나머지 “do quá…nên…” (18, Diễn tả hồi tưởng và kết quả). (으)ㄴ 나머지 gắn vào sau tính từ và động từ, có nghĩa tương đương với tiếng Việt là “do quá … nên …”, dùng để biểu thị kết quả được tạo ra do thực hiện một hành động nào đó hoặc bởi sự tiến triển của một trạng thái nào đó."
  },
  {
    "id": 307,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 옆집 아들은 공부도 잘하고 운동도 잘해서 그 집 부모가 자랑하고 다닐 (......).",
    "options": [
      "만하겠는데",
      "만하지만",
      "만하겠데요",
      "만하겠지만"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-데요 (18, Diễn tả hồi tưởng và kết quả). 데요 Được gắn sau thân động từ hành động hay động từ trạng thái sử dụng để từ chối đề nghị của đối phương một cách nhẹ nhàng và xem xét phản ứng của người nghe."
  },
  {
    "id": 308,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이런 훌륭한 작품을 바쁜 (......) 틈틈이 시간을 내서 만들었다니 놀라울 따름이다.",
    "options": [
      "바쁘도록",
      "바쁘니",
      "바쁘고",
      "바쁜 가운데"
    ],
    "correctAnswer": 3,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-는 가운데 giữa lúc, trong lúc (19, Diễn tả tiêu chuẩn và tình hình). ."
  },
  {
    "id": 309,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 이제 모든 진실이 확실하게 (......) 범인도 더 이상 거짓말을 할 수가 없을 거예요.",
    "options": [
      "드러난 마당에",
      "드러나더니",
      "드러나고",
      "드러날수록"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-는 마당에 một khi, khi, trong khi (19, Diễn tả tiêu chuẩn và tình hình). ."
  },
  {
    "id": 310,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그 선수는 (......) 몸이 너무 왜소해요.",
    "options": [
      "운동선수와",
      "운동선수치고",
      "운동선수인지",
      "운동선수이지만"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-치고 Đã là...thì (sẽ) không...  so với...thì (19, Diễn tả tiêu chuẩn và tình hình). ."
  },
  {
    "id": 311,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 소비자의 욕구가 (......) 기능은 물론 디자인에도 신경을 많이 쓴 가전제품들이 속속 출시되고 있다.",
    "options": [
      "다양해짐에 따라",
      "다양해지고",
      "다양해진",
      "다양해지더니"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 4, [NGỮ PHÁP]-(으)ㅁ에 따라  “theo, tùy theo” (19, Diễn tả tiêu chuẩn và tình hình). ."
  },
  {
    "id": 312,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 타고난 성격을 바꾸는 것은 (......).",
    "options": [
      "여간 어렵지 못 하다",
      "어렵지만",
      "여간 어렵지 않다",
      "어려워요"
    ],
    "correctAnswer": 2,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-여간-지 않다 không phải thường đâu (20, Diễn tả sự nhấn mạnh). Ngữ pháp 여간 + 지 않다 – Cấu trúc này được dùng để nhấn mạnh."
  },
  {
    "id": 313,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 그동안 많은 도움을 주셨는데 이런 일로 폐를 끼치게 되어 (......).",
    "options": [
      "죄송스럽기가 이를 데 없네요",
      "죄송스럽기",
      "죄송스럽게 이를 데 없네요",
      "죄송스럽게"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-기가 이를 데 없다 không tả xiết... không sao tả nổi (20, Diễn tả sự nhấn mạnh). ."
  },
  {
    "id": 314,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 거짓말이 들통 났는데도 미안해하기는커녕 오히려 뻔뻔하게 변명을 하니까 화를 (......).",
    "options": [
      "참을래야 참을 수가 없었어요",
      "참고 참을 수가 없었어요",
      "참을래야 참을 수 있다",
      "참게 참을 수가 없었어요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)ㄹ래야 - (으)ㄹ 수가 없다 Hoàn toàn không thể (20, Diễn tả sự nhấn mạnh). (으)ㄹ래야 - (으)ㄹ 수가 없다 được sử dụng để nhấn mạnh sự thật rằng người nói không thể thực hiện hành động mình định làm dù có cố gắng đến thế nào vì lí do hoặc hoàn cảnh nào đó."
  },
  {
    "id": 315,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 나는 제주도 (......). 당신은 어디에서 왔소?",
    "options": [
      "사람이오",
      "사람인데",
      "사람이고",
      "사람이지요"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, 하오체 (21, Diễn tả cách nói đề cao). ."
  },
  {
    "id": 316,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: (......). 수고가 많으이.",
    "options": [
      "고맙다",
      "고마우이",
      "고맙고",
      "고마워"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, 하게체 (21, Diễn tả cách nói đề cao). ."
  },
  {
    "id": 317,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 정부는 나라를 안정시키고자 애를 쓰고 (......) 테러는 좀처럼 잦아들지 않고 있다.",
    "options": [
      "있으나",
      "있으로",
      "있더니",
      "있다 보면"
    ],
    "correctAnswer": 0,
    "explanation": "Ngữ pháp trọng tâm: 1, [NGỮ PHÁP]-(으)므로, -(으)나, -(으)며 (22, Các biểu hiện hữu dụng khác). (으)므로 là vĩ tố liên kết thể hiện nguyên nhân hay lí do nghĩa là vì…(으)나 được dùng để chỉ sự đối lập trong một mệnh đề gồm hai luồng thông tin đối lập nhau."
  },
  {
    "id": 318,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 정부는 우리 문화를 외국인들에게 알리고 (......) 문화 공연을 할 예정이다.",
    "options": [
      "이해하기 위해",
      "이해시키기 위해",
      "이해시킨",
      "이해시키고"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 2, [NGỮ PHÁP]-피동과 사동 (22, Các biểu hiện hữu dụng khác). 피동과 사동 gắn vào thân động từ, tính từ, có nghĩa tương đương trong tiếng Việt là‘làm cho, khiến cho ai đó thực hiện hành động nào đó’."
  },
  {
    "id": 319,
    "section": "grammar",
    "level": "TOPIK II (Trung cấp)",
    "question": "Chọn đáp án đúng điền vào chỗ trống: 가: 영주 씨가 발표를 잘했을까요?나: 그렇게 준비를 하는 둥 마는 둥 했는데 (......).",
    "options": [
      "잘했을",
      "잘했을 턱이 없어요",
      "잘했을 없어요",
      "잘했을수록"
    ],
    "correctAnswer": 1,
    "explanation": "Ngữ pháp trọng tâm: 3, [NGỮ PHÁP]-(으)ㄹ세라,-는양,-는 한편, -(으)ㄹ 턱이 없다 (22, Các biểu hiện hữu dụng khác). (으)ㄹ 세라 Là trợ từ liên kết diễn đạt ý nghĩa lo lắng sẽ như thế nào đấy căn cứ vào lý do của mệnh đề đi trước."
  }
];

export interface KoreanCourseLesson {
  id: string;
  unit: string;
  level: "Sơ cấp 1" | "Sơ cấp 2" | "Trung cấp";
  title: string;
  goal: string;
  minutes: number;
  grammar: { pattern: string; explanation: string; example: string; translation: string }[];
  vocabulary: { korean: string; romanization: string; meaning: string }[];
  dialogue: { speaker: string; korean: string; translation: string }[];
  quiz: { question: string; options: string[]; answer: number; explanation: string };
}

// An original HaechiVN course organized around common beginner-to-intermediate functions.
export const KOREAN_COURSE: KoreanCourseLesson[] = [
  {
    id: "intro-greetings", unit: "01 · Làm quen", level: "Sơ cấp 1", title: "Chào hỏi và giới thiệu bản thân", goal: "Chào hỏi lịch sự, nói tên và giới thiệu mình là ai.", minutes: 12,
    grammar: [
      { pattern: "N은/는", explanation: "Đánh dấu chủ đề. Dùng 은 sau phụ âm cuối, 는 sau nguyên âm.", example: "저는 민수예요.", translation: "Tôi là Minsu." },
      { pattern: "N이에요/예요", explanation: "Nói “là…”. Dùng 이에요 sau phụ âm cuối, 예요 sau nguyên âm.", example: "저는 학생이에요. 저는 린이에요.", translation: "Tôi là học sinh. Tôi là Linh." },
    ],
    vocabulary: [
      { korean: "안녕하세요", romanization: "annyeonghaseyo", meaning: "xin chào (lịch sự)" }, { korean: "만나다", romanization: "mannada", meaning: "gặp" },
      { korean: "이름", romanization: "ireum", meaning: "tên" }, { korean: "학생", romanization: "haksaeng", meaning: "học sinh, sinh viên" },
      { korean: "선생님", romanization: "seonsaengnim", meaning: "thầy, cô giáo" }, { korean: "반갑다", romanization: "bangapda", meaning: "vui, mừng (khi gặp)" },
    ],
    dialogue: [
      { speaker: "민수", korean: "안녕하세요. 저는 민수예요.", translation: "Xin chào. Tôi là Minsu." },
      { speaker: "린", korean: "안녕하세요. 저는 린이에요.", translation: "Xin chào. Tôi là Linh." },
      { speaker: "민수", korean: "만나서 반가워요.", translation: "Rất vui được gặp bạn." },
      { speaker: "린", korean: "저도 반가워요.", translation: "Tôi cũng rất vui." },
    ], quiz: { question: "Chọn câu đúng: “Tôi là giáo viên.”", options: ["저는 선생님예요.", "저는 선생님이에요.", "저는 선생님 있어요."], answer: 1, explanation: "선생님 kết thúc bằng phụ âm ㅁ nên dùng 이에요." },
  },
  {
    id: "nationality-jobs", unit: "01 · Làm quen", level: "Sơ cấp 1", title: "Quốc tịch và nghề nghiệp", goal: "Hỏi và trả lời về quốc tịch, nghề nghiệp bằng cách nói lịch sự.", minutes: 14,
    grammar: [
      { pattern: "N은/는 어디 사람이에요?", explanation: "Hỏi ai đó đến từ đâu; trả lời bằng quốc gia + 사람.", example: "어디 사람이에요? 베트남 사람이에요.", translation: "Bạn là người nước nào? Tôi là người Việt Nam." },
      { pattern: "N이/가 아니에요", explanation: "Phủ định danh từ: “không phải là…”. Dùng 이 sau phụ âm, 가 sau nguyên âm.", example: "저는 의사가 아니에요.", translation: "Tôi không phải bác sĩ." },
    ],
    vocabulary: [
      { korean: "나라", romanization: "nara", meaning: "đất nước" }, { korean: "베트남", romanization: "beteunam", meaning: "Việt Nam" },
      { korean: "한국", romanization: "hanguk", meaning: "Hàn Quốc" }, { korean: "사람", romanization: "saram", meaning: "người" },
      { korean: "회사원", romanization: "hoesawon", meaning: "nhân viên công ty" }, { korean: "의사", romanization: "uisa", meaning: "bác sĩ" },
    ],
    dialogue: [
      { speaker: "지수", korean: "안 씨는 어느 나라 사람이에요?", translation: "Bạn An là người nước nào?" },
      { speaker: "안", korean: "베트남 사람이에요. 지수 씨는요?", translation: "Tôi là người Việt Nam. Còn bạn Jisu?" },
      { speaker: "지수", korean: "저는 한국 사람이에요. 회사원이에요.", translation: "Tôi là người Hàn Quốc. Tôi là nhân viên công ty." },
    ], quiz: { question: "“Tôi không phải là bác sĩ.”", options: ["저는 의사예요.", "저는 의사가 아니에요.", "저는 의사에 있어요."], answer: 1, explanation: "Phủ định danh từ dùng mẫu N이/가 아니에요." },
  },
  {
    id: "objects-existence", unit: "01 · Làm quen", level: "Sơ cấp 1", title: "Đồ vật và những thứ đang có", goal: "Gọi tên vật dụng và nói mình có hoặc không có thứ gì.", minutes: 13,
    grammar: [
      { pattern: "N이/가 있어요 · 없어요", explanation: "Nói có/không có đồ vật hoặc người. 있어요 cũng diễn tả sự tồn tại.", example: "책이 있어요. 시간이 없어요.", translation: "Tôi có sách. Tôi không có thời gian." },
      { pattern: "N하고 N", explanation: "Nối hai danh từ theo cách nói thân thiện, nghĩa là “và/với”.", example: "책하고 공책이 있어요.", translation: "Tôi có sách và vở." },
    ],
    vocabulary: [
      { korean: "책", romanization: "chaek", meaning: "sách" }, { korean: "공책", romanization: "gongchaek", meaning: "vở" },
      { korean: "연필", romanization: "yeonpil", meaning: "bút chì" }, { korean: "가방", romanization: "gabang", meaning: "cặp, túi" },
      { korean: "휴대폰", romanization: "hyudaepon", meaning: "điện thoại di động" }, { korean: "시간", romanization: "sigan", meaning: "thời gian" },
    ],
    dialogue: [
      { speaker: "수진", korean: "가방 안에 뭐가 있어요?", translation: "Trong túi có gì vậy?" },
      { speaker: "투이", korean: "책하고 공책이 있어요. 연필도 있어요.", translation: "Có sách và vở. Cũng có bút chì." },
      { speaker: "수진", korean: "휴대폰도 있어요?", translation: "Có cả điện thoại không?" },
      { speaker: "투이", korean: "아니요, 휴대폰은 없어요.", translation: "Không, không có điện thoại." },
    ], quiz: { question: "Điền vào chỗ trống: 시간이 ___. (Tôi không có thời gian.)", options: ["없어요", "아니에요", "가요"], answer: 0, explanation: "없어요 diễn tả không có; 아니에요 phủ định danh từ." },
  },
  {
    id: "places-location", unit: "02 · Sinh hoạt hằng ngày", level: "Sơ cấp 1", title: "Địa điểm và vị trí đồ vật", goal: "Hỏi nơi chốn và mô tả vị trí của đồ vật.", minutes: 15,
    grammar: [
      { pattern: "N은/는 N에 있어요", explanation: "에 đánh dấu nơi một người hoặc vật đang ở.", example: "책은 책상 위에 있어요.", translation: "Quyển sách ở trên bàn." },
      { pattern: "N 앞/뒤/옆/안/밖", explanation: "Các danh từ vị trí thường đi với 에 để chỉ nơi chốn.", example: "은행 옆에 카페가 있어요.", translation: "Có quán cà phê bên cạnh ngân hàng." },
    ],
    vocabulary: [
      { korean: "학교", romanization: "hakgyo", meaning: "trường học" }, { korean: "은행", romanization: "eunhaeng", meaning: "ngân hàng" },
      { korean: "책상", romanization: "chaeksang", meaning: "bàn học" }, { korean: "위", romanization: "wi", meaning: "phía trên" },
      { korean: "옆", romanization: "yeop", meaning: "bên cạnh" }, { korean: "맞은편", romanization: "majeunpyeon", meaning: "đối diện" },
    ],
    dialogue: [
      { speaker: "하나", korean: "화장실이 어디에 있어요?", translation: "Nhà vệ sinh ở đâu ạ?" },
      { speaker: "직원", korean: "은행 옆에 있어요.", translation: "Ở bên cạnh ngân hàng." },
      { speaker: "하나", korean: "카페 맞은편이에요?", translation: "Có phải đối diện quán cà phê không ạ?" },
      { speaker: "직원", korean: "네, 맞아요.", translation: "Vâng, đúng rồi." },
    ], quiz: { question: "“Điện thoại ở trong túi.”", options: ["휴대폰은 가방 안에 있어요.", "휴대폰은 가방 안이에요 가요.", "휴대폰이 가방을 있어요."], answer: 0, explanation: "Mẫu vị trí: chủ thể + nơi chốn 에 있어요." },
  },
  {
    id: "numbers-time", unit: "02 · Sinh hoạt hằng ngày", level: "Sơ cấp 1", title: "Số đếm, giờ và lịch hẹn", goal: "Nói giờ, hỏi thời gian và đặt lịch gặp đơn giản.", minutes: 16,
    grammar: [
      { pattern: "Giờ thuần Hàn + 시, phút Hán Hàn + 분", explanation: "Giờ thường dùng 하나…열둘 (một đổi thành 한 시); phút dùng 일, 이, 삼…", example: "세 시 십 분에 만나요.", translation: "Chúng ta gặp lúc 3 giờ 10 phút nhé." },
      { pattern: "Thời gian + 에", explanation: "에 gắn sau mốc thời gian để chỉ khi nào hành động xảy ra.", example: "토요일 두 시에 만나요.", translation: "Thứ Bảy gặp lúc 2 giờ nhé." },
    ],
    vocabulary: [
      { korean: "몇 시", romanization: "myeot si", meaning: "mấy giờ" }, { korean: "분", romanization: "bun", meaning: "phút" },
      { korean: "오늘", romanization: "oneul", meaning: "hôm nay" }, { korean: "내일", romanization: "naeil", meaning: "ngày mai" },
      { korean: "토요일", romanization: "toyoil", meaning: "thứ Bảy" }, { korean: "약속", romanization: "yaksok", meaning: "cuộc hẹn" },
    ],
    dialogue: [
      { speaker: "린", korean: "내일 몇 시에 만날까요?", translation: "Ngày mai chúng ta gặp lúc mấy giờ?" },
      { speaker: "민수", korean: "두 시 어때요?", translation: "Hai giờ được không?" },
      { speaker: "린", korean: "좋아요. 학교 앞에서 만나요.", translation: "Được đó. Gặp trước cổng trường nhé." },
    ], quiz: { question: "Điền tiểu từ: 세 시 ___ 만나요. (Gặp lúc 3 giờ.)", options: ["에", "에서", "을"], answer: 0, explanation: "에 đi sau thời gian; 에서 thường đánh dấu nơi hành động diễn ra." },
  },
  {
    id: "daily-routine", unit: "02 · Sinh hoạt hằng ngày", level: "Sơ cấp 1", title: "Một ngày thường của tôi", goal: "Nói về thói quen bằng động từ hiện tại và tân ngữ.", minutes: 15,
    grammar: [
      { pattern: "Động từ + 아요/어요", explanation: "Đuôi lịch sự thân mật ở hiện tại: xét nguyên âm cuối của thân động từ để chọn 아요/어요.", example: "읽다 → 읽어요 · 가다 → 가요", translation: "đọc → đọc · đi → đi" },
      { pattern: "N을/를 + động từ", explanation: "Đánh dấu tân ngữ: 을 sau phụ âm cuối, 를 sau nguyên âm.", example: "아침을 먹어요. 한국어를 공부해요.", translation: "Tôi ăn sáng. Tôi học tiếng Hàn." },
    ],
    vocabulary: [
      { korean: "일어나다", romanization: "ireonada", meaning: "thức dậy" }, { korean: "씻다", romanization: "ssitda", meaning: "rửa, tắm" },
      { korean: "아침", romanization: "achim", meaning: "buổi sáng; bữa sáng" }, { korean: "공부하다", romanization: "gongbuhada", meaning: "học" },
      { korean: "일하다", romanization: "ilhada", meaning: "làm việc" }, { korean: "자다", romanization: "jada", meaning: "ngủ" },
    ],
    dialogue: [
      { speaker: "유나", korean: "보통 몇 시에 일어나요?", translation: "Bạn thường thức dậy lúc mấy giờ?" },
      { speaker: "남", korean: "일곱 시에 일어나요. 아침을 먹고 한국어를 공부해요.", translation: "Tôi thức dậy lúc 7 giờ. Tôi ăn sáng rồi học tiếng Hàn." },
      { speaker: "유나", korean: "저녁에는 뭐 해요?", translation: "Buổi tối bạn làm gì?" },
      { speaker: "남", korean: "일하고 열한 시쯤 자요.", translation: "Tôi làm việc rồi ngủ khoảng 11 giờ." },
    ], quiz: { question: "Chọn dạng đúng: 한국어___ 공부해요.", options: ["를", "을", "에"], answer: 0, explanation: "한국어 kết thúc bằng nguyên âm nên dùng 를." },
  },
  {
    id: "food-ordering", unit: "02 · Sinh hoạt hằng ngày", level: "Sơ cấp 1", title: "Gọi món ở quán ăn", goal: "Gọi món, dùng số đếm với đơn vị và hỏi giá.", minutes: 16,
    grammar: [
      { pattern: "N 주세요", explanation: "Cách lịch sự, ngắn gọn để gọi món hoặc xin một vật: “Cho tôi…”.", example: "김밥 한 줄하고 물 주세요.", translation: "Cho tôi một cuộn kimbap và nước." },
      { pattern: "Số thuần Hàn + đơn vị", explanation: "Nhiều món dùng số thuần Hàn trước đơn vị như 개 (cái), 명 (người), 잔 (cốc).", example: "커피 두 잔 주세요.", translation: "Cho tôi hai cốc cà phê." },
    ],
    vocabulary: [
      { korean: "메뉴판", romanization: "menyupan", meaning: "thực đơn" }, { korean: "김밥", romanization: "gimbap", meaning: "cơm cuộn rong biển" },
      { korean: "물", romanization: "mul", meaning: "nước" }, { korean: "맵다", romanization: "maepda", meaning: "cay" },
      { korean: "덜 맵게", romanization: "deol maepge", meaning: "ít cay hơn" }, { korean: "계산하다", romanization: "gyesanhada", meaning: "tính tiền" },
    ],
    dialogue: [
      { speaker: "손님", korean: "김밥 한 줄하고 물 한 병 주세요.", translation: "Cho tôi một cuộn kimbap và một chai nước." },
      { speaker: "직원", korean: "매운 떡볶이도 드릴까요?", translation: "Quý khách dùng thêm tokbokki cay không ạ?" },
      { speaker: "손님", korean: "네, 덜 맵게 해 주세요.", translation: "Vâng, làm ít cay giúp tôi." },
      { speaker: "직원", korean: "모두 만 원입니다.", translation: "Tổng cộng 10.000 won ạ." },
    ], quiz: { question: "Bạn muốn gọi hai cốc trà. Câu nào phù hợp?", options: ["차 두 잔 주세요.", "차 둘 잔 있어요.", "차 두 개 주세요 잔."], answer: 0, explanation: "잔 là đơn vị cho đồ uống; dùng 두 잔 trước 주세요." },
  },
  {
    id: "transport-directions", unit: "03 · Đi lại và trải nghiệm", level: "Sơ cấp 2", title: "Hỏi đường và đi phương tiện công cộng", goal: "Hỏi cách đến nơi và nói mình lên/xuống phương tiện ở đâu.", minutes: 17,
    grammar: [
      { pattern: "N에 가요", explanation: "에 đánh dấu điểm đến khi dùng các động từ di chuyển như 가다, 오다.", example: "지하철역에 가요.", translation: "Tôi đi đến ga tàu điện ngầm." },
      { pattern: "N에서 V", explanation: "에서 đánh dấu nơi một hành động diễn ra hoặc nơi bắt đầu di chuyển.", example: "버스 정류장에서 버스를 타요.", translation: "Tôi lên xe buýt ở trạm." },
    ],
    vocabulary: [
      { korean: "지하철역", romanization: "jihacheol-yeok", meaning: "ga tàu điện ngầm" }, { korean: "버스 정류장", romanization: "beoseu jeongnyujang", meaning: "trạm xe buýt" },
      { korean: "갈아타다", romanization: "garatada", meaning: "chuyển (tàu/xe)" }, { korean: "내리다", romanization: "naerida", meaning: "xuống xe" },
      { korean: "타다", romanization: "tada", meaning: "lên, đi (phương tiện)" }, { korean: "곧장", romanization: "gotjang", meaning: "đi thẳng" },
    ],
    dialogue: [
      { speaker: "관광객", korean: "시청에 어떻게 가요?", translation: "Đi đến tòa thị chính bằng cách nào ạ?" },
      { speaker: "시민", korean: "이 버스를 타고 세 정거장 가세요.", translation: "Hãy đi xe buýt này ba bến." },
      { speaker: "관광객", korean: "어디에서 내려요?", translation: "Tôi xuống ở đâu ạ?" },
      { speaker: "시민", korean: "시청 앞에서 내리면 돼요.", translation: "Bạn chỉ cần xuống trước tòa thị chính." },
    ], quiz: { question: "“Tôi học ở thư viện.” Chọn tiểu từ đúng.", options: ["도서관에 공부해요.", "도서관에서 공부해요.", "도서관을 공부해요."], answer: 1, explanation: "Hành động học diễn ra tại thư viện nên dùng 에서." },
  },
  {
    id: "past-weekend", unit: "03 · Đi lại và trải nghiệm", level: "Sơ cấp 2", title: "Kể lại cuối tuần đã qua", goal: "Dùng quá khứ để kể hoạt động và cảm nhận của mình.", minutes: 15,
    grammar: [
      { pattern: "Động/tính từ + 았어요/었어요", explanation: "Đuôi quá khứ lịch sự thân mật; chọn theo nguyên âm cuối của thân từ.", example: "보다 → 봤어요 · 먹다 → 먹었어요", translation: "đã xem · đã ăn" },
      { pattern: "N하고 같이", explanation: "Nói làm gì cùng với ai đó.", example: "친구하고 같이 영화를 봤어요.", translation: "Tôi đã xem phim cùng bạn." },
    ],
    vocabulary: [
      { korean: "주말", romanization: "jumal", meaning: "cuối tuần" }, { korean: "영화", romanization: "yeonghwa", meaning: "phim" },
      { korean: "산책하다", romanization: "sanchaekada", meaning: "đi dạo" }, { korean: "사진을 찍다", romanization: "sajineul jjikda", meaning: "chụp ảnh" },
      { korean: "재미있다", romanization: "jaemiitda", meaning: "thú vị" }, { korean: "피곤하다", romanization: "pigonhada", meaning: "mệt" },
    ],
    dialogue: [
      { speaker: "현우", korean: "주말에 뭐 했어요?", translation: "Cuối tuần bạn đã làm gì?" },
      { speaker: "란", korean: "친구하고 공원에서 산책했어요.", translation: "Tôi đã đi dạo ở công viên cùng bạn." },
      { speaker: "현우", korean: "사진도 찍었어요?", translation: "Bạn cũng chụp ảnh chứ?" },
      { speaker: "란", korean: "네, 많이 찍었어요. 정말 재미있었어요.", translation: "Vâng, tôi chụp nhiều lắm. Rất vui." },
    ], quiz: { question: "Quá khứ của 보다 là gì?", options: ["보어요", "봤어요", "볼 거예요"], answer: 1, explanation: "보다 → 보았어요 → 봤어요 (dạng rút gọn)." },
  },
  {
    id: "plans-invitations", unit: "03 · Đi lại và trải nghiệm", level: "Sơ cấp 2", title: "Nói kế hoạch và rủ bạn", goal: "Nói dự định tương lai và đề nghị cùng làm một việc.", minutes: 16,
    grammar: [
      { pattern: "V + (으)ㄹ 거예요", explanation: "Diễn tả kế hoạch hoặc dự đoán tương lai: có 받침 dùng 을 거예요, không có 받침 dùng ㄹ 거예요.", example: "주말에 여행할 거예요.", translation: "Cuối tuần tôi sẽ đi du lịch." },
      { pattern: "V + (으)ㄹ까요?", explanation: "Đề nghị cùng làm gì hoặc hỏi ý người nghe.", example: "같이 점심을 먹을까요?", translation: "Chúng ta ăn trưa cùng nhau nhé?" },
    ],
    vocabulary: [
      { korean: "계획", romanization: "gyehoek", meaning: "kế hoạch" }, { korean: "여행하다", romanization: "yeohaenghada", meaning: "du lịch" },
      { korean: "박물관", romanization: "bangmulgwan", meaning: "bảo tàng" }, { korean: "표", romanization: "pyo", meaning: "vé" },
      { korean: "같이", romanization: "gachi", meaning: "cùng nhau" }, { korean: "시간이 되다", romanization: "sigani doeda", meaning: "có thời gian, tiện thời gian" },
    ],
    dialogue: [
      { speaker: "투이", korean: "토요일에 뭐 할 거예요?", translation: "Thứ Bảy bạn sẽ làm gì?" },
      { speaker: "지민", korean: "박물관에 갈 거예요. 같이 갈까요?", translation: "Tôi sẽ đi bảo tàng. Bạn đi cùng nhé?" },
      { speaker: "투이", korean: "좋아요. 제가 표를 예매할게요.", translation: "Được đó. Tôi sẽ đặt vé." },
    ], quiz: { question: "“Ngày mai tôi sẽ học.”", options: ["내일 공부했어요.", "내일 공부할 거예요.", "내일 공부하세요."], answer: 1, explanation: "Kế hoạch tương lai dùng -(으)ㄹ 거예요." },
  },
  {
    id: "health-at-clinic", unit: "04 · Giao tiếp mở rộng", level: "Sơ cấp 2", title: "Nói về sức khỏe ở phòng khám", goal: "Mô tả triệu chứng và hiểu lời khuyên đơn giản.", minutes: 16,
    grammar: [
      { pattern: "A/V + 아서/어서", explanation: "Nối nguyên nhân với kết quả hoặc hai hành động liên tiếp trong các ngữ cảnh phù hợp.", example: "머리가 아파서 병원에 가요.", translation: "Vì đau đầu nên tôi đi bệnh viện." },
      { pattern: "V + (으)세요", explanation: "Đưa lời đề nghị hoặc chỉ dẫn lịch sự.", example: "물을 많이 드세요.", translation: "Hãy uống nhiều nước." },
    ],
    vocabulary: [
      { korean: "병원", romanization: "byeongwon", meaning: "bệnh viện" }, { korean: "약국", romanization: "yakguk", meaning: "hiệu thuốc" },
      { korean: "머리", romanization: "meori", meaning: "đầu" }, { korean: "배", romanization: "bae", meaning: "bụng" },
      { korean: "아프다", romanization: "apeuda", meaning: "đau, ốm" }, { korean: "약을 먹다", romanization: "yageul meokda", meaning: "uống thuốc" },
    ],
    dialogue: [
      { speaker: "의사", korean: "어디가 아프세요?", translation: "Bạn đau ở đâu?" },
      { speaker: "환자", korean: "배가 아파서 왔어요.", translation: "Tôi đến vì đau bụng." },
      { speaker: "의사", korean: "이 약을 하루에 세 번 드세요.", translation: "Hãy uống thuốc này ngày ba lần." },
      { speaker: "환자", korean: "네, 알겠습니다.", translation: "Vâng, tôi hiểu rồi." },
    ], quiz: { question: "Chọn câu khuyên lịch sự: “Hãy nghỉ ngơi.”", options: ["쉬었어요.", "쉬세요.", "쉬고 싶어요."], answer: 1, explanation: "-(으)세요 dùng để đề nghị/chỉ dẫn lịch sự." },
  },
  {
    id: "shopping-comparison", unit: "04 · Giao tiếp mở rộng", level: "Sơ cấp 2", title: "Mua sắm và so sánh sản phẩm", goal: "Hỏi giá, kích cỡ và nói thích món nào hơn.", minutes: 15,
    grammar: [
      { pattern: "N보다 더 A", explanation: "So sánh hơn: gắn 보다 sau đối tượng làm mốc, 더 trước tính từ.", example: "이 가방이 저 가방보다 더 커요.", translation: "Cái túi này to hơn cái túi kia." },
      { pattern: "얼마예요?", explanation: "Câu hỏi giá cơ bản. Có thể thêm 이거/저거 để chỉ món đồ.", example: "이 신발은 얼마예요?", translation: "Đôi giày này giá bao nhiêu?" },
    ],
    vocabulary: [
      { korean: "가격", romanization: "gagyeok", meaning: "giá cả" }, { korean: "사이즈", romanization: "saijeu", meaning: "kích cỡ" },
      { korean: "입어 보다", romanization: "ibeo boda", meaning: "mặc thử" }, { korean: "크다", romanization: "keuda", meaning: "to, lớn" },
      { korean: "작다", romanization: "jakda", meaning: "nhỏ" }, { korean: "마음에 들다", romanization: "maeume deulda", meaning: "ưng ý" },
    ],
    dialogue: [
      { speaker: "손님", korean: "이 셔츠는 얼마예요?", translation: "Áo sơ mi này bao nhiêu tiền?" },
      { speaker: "직원", korean: "삼만 원이에요. 입어 보세요.", translation: "30.000 won ạ. Mời bạn thử." },
      { speaker: "손님", korean: "이것보다 파란색이 더 마음에 들어요.", translation: "Tôi thích chiếc màu xanh hơn chiếc này." },
    ], quiz: { question: "“Cà phê nóng đắt hơn cà phê lạnh.”", options: ["뜨거운 커피가 아이스커피보다 더 비싸요.", "뜨거운 커피가 아이스커피에 비싸요.", "뜨거운 커피를 아이스커피보다 비싸요."], answer: 0, explanation: "Mẫu so sánh: A가 B보다 더 + tính từ." },
  },
  {
    id: "hobbies-experience", unit: "05 · Bước vào trung cấp", level: "Trung cấp", title: "Sở thích và trải nghiệm", goal: "Nói về sở thích, tần suất và trải nghiệm đã từng có.", minutes: 18,
    grammar: [
      { pattern: "V + 고 싶어요", explanation: "Diễn đạt mong muốn của người nói: muốn làm gì.", example: "한국 음식을 만들어 보고 싶어요.", translation: "Tôi muốn thử làm món ăn Hàn Quốc." },
      { pattern: "V + (으)ㄴ 적이 있어요/없어요", explanation: "Nói đã/ chưa từng trải nghiệm việc gì trong quá khứ.", example: "제주도에 간 적이 있어요.", translation: "Tôi đã từng đến đảo Jeju." },
    ],
    vocabulary: [
      { korean: "취미", romanization: "chwimi", meaning: "sở thích" }, { korean: "등산", romanization: "deungsan", meaning: "leo núi" },
      { korean: "요리", romanization: "yori", meaning: "nấu ăn, món ăn" }, { korean: "경험", romanization: "gyeongheom", meaning: "kinh nghiệm, trải nghiệm" },
      { korean: "자주", romanization: "jaju", meaning: "thường xuyên" }, { korean: "한 번", romanization: "han beon", meaning: "một lần" },
    ],
    dialogue: [
      { speaker: "아영", korean: "취미가 뭐예요?", translation: "Sở thích của bạn là gì?" },
      { speaker: "투이", korean: "요리하는 것을 좋아해요. 김치를 만들어 본 적이 있어요.", translation: "Tôi thích nấu ăn. Tôi từng làm kimchi rồi." },
      { speaker: "아영", korean: "정말요? 저도 만들어 보고 싶어요.", translation: "Thật sao? Tôi cũng muốn thử làm." },
    ], quiz: { question: "“Tôi chưa từng leo núi.”", options: ["등산한 적이 없어요.", "등산하고 싶어요.", "등산할 거예요."], answer: 0, explanation: "Trải nghiệm phủ định dùng V-(으)ㄴ 적이 없어요." },
  },
  {
    id: "ability-rules", unit: "05 · Bước vào trung cấp", level: "Trung cấp", title: "Khả năng và điều cần làm", goal: "Nói mình có thể làm gì và diễn đạt việc cần phải làm.", minutes: 18,
    grammar: [
      { pattern: "V + (으)ㄹ 수 있어요/없어요", explanation: "Diễn đạt khả năng hoặc điều kiện có thể/không thể làm.", example: "한글을 읽을 수 있어요.", translation: "Tôi có thể đọc Hangeul." },
      { pattern: "V + 아야/어야 해요", explanation: "Diễn đạt nghĩa vụ hoặc việc cần phải làm.", example: "오늘 숙제를 해야 해요.", translation: "Hôm nay tôi phải làm bài tập." },
    ],
    vocabulary: [
      { korean: "가능하다", romanization: "ganeunghada", meaning: "có thể, khả thi" }, { korean: "운전하다", romanization: "unjeonhada", meaning: "lái xe" },
      { korean: "예약하다", romanization: "yeyakhada", meaning: "đặt trước" }, { korean: "숙제", romanization: "sukje", meaning: "bài tập về nhà" },
      { korean: "준비하다", romanization: "junbihada", meaning: "chuẩn bị" }, { korean: "연습하다", romanization: "yeonseuphada", meaning: "luyện tập" },
    ],
    dialogue: [
      { speaker: "동료", korean: "오늘 회의 자료를 준비할 수 있어요?", translation: "Hôm nay bạn chuẩn bị tài liệu họp được không?" },
      { speaker: "린", korean: "네, 할 수 있어요. 그런데 먼저 이메일을 보내야 해요.", translation: "Vâng, tôi làm được. Nhưng trước hết tôi phải gửi email." },
      { speaker: "동료", korean: "알겠습니다. 오후까지 부탁해요.", translation: "Tôi hiểu rồi. Nhờ bạn xong trước buổi chiều nhé." },
    ], quiz: { question: "“Tôi không thể lái xe.”", options: ["운전해야 해요.", "운전할 수 없어요.", "운전한 적이 있어요."], answer: 1, explanation: "Không thể làm gì dùng -(으)ㄹ 수 없어요." },
  },
  {
    id: "reasons-opinions", unit: "05 · Bước vào trung cấp", level: "Trung cấp", title: "Giải thích lý do và nêu ý kiến", goal: "Nối lý do với kết quả và nói suy đoán nhẹ nhàng.", minutes: 19,
    grammar: [
      { pattern: "A/V + 아서/어서", explanation: "Nối nguyên nhân tự nhiên với kết quả; không dùng với câu mệnh lệnh/rủ rê ở vế sau.", example: "길이 막혀서 늦었어요.", translation: "Vì tắc đường nên tôi đến muộn." },
      { pattern: "A/V + (으)ㄴ/는 것 같아요", explanation: "Nói suy đoán hoặc ý kiến dè dặt: “có vẻ như / tôi nghĩ là”.", example: "이 식당 음식이 맛있는 것 같아요.", translation: "Tôi thấy đồ ăn ở quán này có vẻ ngon." },
    ],
    vocabulary: [
      { korean: "이유", romanization: "iyu", meaning: "lý do" }, { korean: "길이 막히다", romanization: "giri makida", meaning: "đường bị tắc" },
      { korean: "늦다", romanization: "neutda", meaning: "muộn" }, { korean: "편리하다", romanization: "pyeollihada", meaning: "tiện lợi" },
      { korean: "조용하다", romanization: "joyonghada", meaning: "yên tĩnh" }, { korean: "생각하다", romanization: "saenggakhada", meaning: "nghĩ" },
    ],
    dialogue: [
      { speaker: "민지", korean: "왜 지하철을 타요?", translation: "Sao bạn đi tàu điện ngầm?" },
      { speaker: "안", korean: "버스는 길이 막혀서 지하철이 더 빠른 것 같아요.", translation: "Vì xe buýt bị tắc đường nên tôi nghĩ tàu điện ngầm nhanh hơn." },
      { speaker: "민지", korean: "맞아요. 출근 시간에는 지하철이 편리해요.", translation: "Đúng vậy. Giờ đi làm thì tàu điện ngầm tiện." },
    ], quiz: { question: "Chọn câu tự nhiên: “Vì mệt nên tôi nghỉ ở nhà.”", options: ["피곤해서 집에서 쉬어요.", "피곤는 것 같아서 집을 쉬어요.", "피곤을 해서 집에 쉬어요."], answer: 0, explanation: "피곤하다 → 피곤해서; nghỉ ở nhà dùng 집에서 쉬어요." },
  },
  {
    id: "contrast-connectors", unit: "05 · Bước vào trung cấp", level: "Trung cấp", title: "Nối ý: và, nhưng, sau khi", goal: "Kể chuỗi sự việc và đối chiếu hai ý trong hội thoại.", minutes: 18,
    grammar: [
      { pattern: "V + 고", explanation: "Nối hai hành động theo trình tự hoặc liệt kê thông tin.", example: "아침을 먹고 학교에 가요.", translation: "Tôi ăn sáng rồi đi học." },
      { pattern: "A/V + 지만", explanation: "Nối hai vế tương phản, nghĩa là “nhưng”.", example: "비싸지만 정말 좋아요.", translation: "Tuy đắt nhưng rất tốt." },
    ],
    vocabulary: [
      { korean: "먼저", romanization: "meonjeo", meaning: "trước tiên" }, { korean: "그리고", romanization: "geurigo", meaning: "và, sau đó" },
      { korean: "하지만", romanization: "hajiman", meaning: "nhưng" }, { korean: "바쁘다", romanization: "bappeuda", meaning: "bận" },
      { korean: "가깝다", romanization: "gakkapda", meaning: "gần" }, { korean: "멀다", romanization: "meolda", meaning: "xa" },
    ],
    dialogue: [
      { speaker: "수현", korean: "새 회사는 어때요?", translation: "Công ty mới thế nào?" },
      { speaker: "투이", korean: "일이 많지만 동료들이 친절해요.", translation: "Công việc nhiều nhưng đồng nghiệp thân thiện." },
      { speaker: "수현", korean: "집에서 회사까지 멀어요?", translation: "Từ nhà đến công ty có xa không?" },
      { speaker: "투이", korean: "조금 멀어요. 그래서 아침을 먹고 일찍 출발해요.", translation: "Hơi xa. Vì vậy tôi ăn sáng rồi xuất phát sớm." },
    ], quiz: { question: "Chọn liên từ phù hợp: “Tôi bận nhưng vẫn học tiếng Hàn.”", options: ["바쁘고 한국어를 공부해요.", "바쁘지만 한국어를 공부해요.", "바빠서 한국어를 공부해요."], answer: 1, explanation: "지만 nối hai ý tương phản: bận nhưng vẫn học." },
  },
];

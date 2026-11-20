import type { TopikQuestion } from "./topikQuestionBank";

export interface TopikFillBlankExam {
  id: string;
  title: string;
  subtitle: string;
  duration: number;
  instruction: string;
  questions: TopikQuestion[];
}

const q = (
  id: number,
  question: string,
  options: string[],
  correctAnswer: number,
  explanation: string,
): TopikQuestion => ({
  id,
  section: "grammar",
  level: "TOPIK I (Sơ cấp)",
  question,
  options,
  correctAnswer,
  explanation,
});

const instruction = "Câu 1–5: Chọn từ hoặc ngữ pháp phù hợp nhất để điền vào chỗ trống.";

export const TOPIK_I_FILL_BLANK_EXAMS: TopikFillBlankExam[] = [
  {
    id: "fill-blank-01",
    title: "Đề 01 · Trợ từ cơ bản",
    subtitle: "Chủ ngữ, địa điểm, tân ngữ và thời gian",
    duration: 5,
    instruction,
    questions: [
      q(101, "저는 매일 학교[   ].", ["에 갑니다", "를 갑니다", "에서 갑니다", "와 갑니다"], 0, "에 chỉ đích đến với động từ 가다: 학교에 갑니다 (đi đến trường)."),
      q(102, "식당[   ] 밥을 먹습니다.", ["에", "에서", "을", "으로"], 1, "에서 đánh dấu nơi hành động ăn cơm diễn ra."),
      q(103, "사과[   ] 두 개 샀습니다.", ["가", "에", "를", "와"], 2, "를 đánh dấu tân ngữ trực tiếp của động từ 샀습니다 (đã mua)."),
      q(104, "저녁[   ] 친구를 만나요.", ["에", "에서", "부터", "까지"], 0, "에 dùng với thời điểm: 저녁에 (vào buổi tối)."),
      q(105, "책상 위[   ] 책이 있습니다.", ["를", "가", "에", "에서"], 2, "에 đánh dấu vị trí tồn tại với 있다: trên bàn có sách."),
    ],
  },
  {
    id: "fill-blank-02",
    title: "Đề 02 · Sinh hoạt hằng ngày",
    subtitle: "Động từ hiện tại và mẫu câu quen thuộc",
    duration: 5,
    instruction,
    questions: [
      q(106, "저는 아침에 커피를 [   ].", ["마십니다", "먹습니다", "읽습니다", "입습니다"], 0, "마시다 dùng với đồ uống: 커피를 마십니다 (uống cà phê)."),
      q(107, "민수 씨는 회사에서 한국어를 [   ].", ["공부합니다", "수영합니다", "요리합니다", "산책합니다"], 0, "공부하다 là học; câu có nghĩa Minsu học tiếng Hàn ở công ty."),
      q(108, "날씨가 아주 [   ].", ["춥습니다", "추워서", "추우면", "춥고"], 0, "춥습니다 là dạng kết thúc câu lịch sự trang trọng phù hợp."),
      q(109, "동생은 음악을 [   ].", ["듣습니다", "봅니다", "씁니다", "만듭니다"], 0, "듣다 (nghe) kết hợp với 음악을: nghe nhạc."),
      q(110, "저는 주말마다 공원에서 [   ].", ["산책합니다", "운전합니다", "수업합니다", "출근합니다"], 0, "산책하다 nghĩa là đi dạo, phù hợp với ngữ cảnh công viên."),
    ],
  },
  {
    id: "fill-blank-03",
    title: "Đề 03 · Quá khứ và kế hoạch",
    subtitle: "Kể việc đã làm và dự định sắp tới",
    duration: 5,
    instruction,
    questions: [
      q(111, "어제 도서관에서 책을 [   ].", ["읽었습니다", "읽겠습니다", "읽으세요", "읽으면서"], 0, "어제 (hôm qua) cần thì quá khứ: 읽었습니다 (đã đọc)."),
      q(112, "내일 친구를 [   ].", ["만날 거예요", "만났어요", "만나고 있어요", "만나세요"], 0, "내일 (ngày mai) diễn tả dự định tương lai: 만날 거예요."),
      q(113, "오늘 아침 일찍 [   ].", ["일어났습니다", "일어납니다", "일어나겠습니다", "일어나세요"], 0, "오늘 아침 trong câu kể việc đã xong phù hợp với quá khứ 일어났습니다."),
      q(114, "비가 와서 우산을 [   ].", ["가져왔어요", "가져오세요", "가져올까요", "가져오지만"], 0, "가져왔어요 là đã mang theo/đem đến, phù hợp câu kể hoàn chỉnh."),
      q(115, "어제 저녁에 가족과 저녁을 [   ].", ["먹었어요", "먹을 거예요", "먹으세요", "먹고 싶어요"], 0, "어제 저녁 (tối hôm qua) chỉ thời gian quá khứ: 먹었어요."),
    ],
  },
  {
    id: "fill-blank-04",
    title: "Đề 04 · Số đếm và thời gian",
    subtitle: "Đơn vị đếm, giờ và khoảng thời gian",
    duration: 5,
    instruction,
    questions: [
      q(116, "사과 한 [   ] 주세요.", ["개", "명", "권", "잔"], 0, "개 là đơn vị đếm chung cho quả táo."),
      q(117, "교실에 학생이 열 [   ] 있습니다.", ["명", "개", "권", "마리"], 0, "명 là đơn vị đếm người: 열 명 (mười người)."),
      q(118, "수업은 세 시[   ] 시작합니다.", ["에", "에서", "부터", "까지"], 0, "에 đánh dấu giờ diễn ra sự việc: bắt đầu lúc 3 giờ."),
      q(119, "도서관은 아홉 시부터 여섯 시[   ] 엽니다.", ["까지", "마다", "전에", "쯤"], 0, "부터…까지 diễn tả khoảng từ…đến…"),
      q(120, "저는 일주일에 세 [   ] 운동합니다.", ["번", "명", "개", "살"], 0, "번 là đơn vị chỉ số lần: ba lần một tuần."),
    ],
  },
  {
    id: "fill-blank-05",
    title: "Đề 05 · Yêu cầu và xin phép",
    subtitle: "Nhờ vả lịch sự và hỏi có được phép không",
    duration: 5,
    instruction,
    questions: [
      q(121, "문을 [   ].", ["열어 주세요", "열어서", "열지만", "열면"], 0, "Động từ + 아/어 주세요 dùng để nhờ vả lịch sự: xin hãy mở cửa."),
      q(122, "여기에서 사진을 [   ]?", ["찍어도 돼요", "찍으면 안 돼요", "찍고 싶어요", "찍을 거예요"], 0, "아/어도 돼요 hỏi xin phép: chụp ảnh ở đây có được không?"),
      q(123, "잠깐만 [   ].", ["기다려 주세요", "기다리지만", "기다리면", "기다렸어요"], 0, "기다려 주세요 là lời nhờ lịch sự: xin hãy đợi một lát."),
      q(124, "저를 [   ] 주세요.", ["도와", "도와서", "도와도", "돕지만"], 0, "도와 주세요 là cách nhờ giúp đỡ lịch sự từ 돕다."),
      q(125, "죄송하지만 조금 천천히 [   ].", ["말씀해 주세요", "말씀하셨어요", "말씀하겠어요", "말씀하면서"], 0, "말씀해 주세요 là lời đề nghị lịch sự xin nói chậm hơn."),
    ],
  },
  {
    id: "fill-blank-06",
    title: "Đề 06 · Nối câu và mục đích",
    subtitle: "Lý do, đối lập, trình tự và mục đích",
    duration: 5,
    instruction,
    questions: [
      q(126, "배가 [   ] 밥을 먹었습니다.", ["고파서", "고프지만", "고프면", "고프고"], 0, "아/어서 nối lý do với kết quả: vì đói nên đã ăn cơm."),
      q(127, "친구를 [   ] 카페에 갑니다.", ["만나러", "만나서", "만났지만", "만나면"], 0, "으러/러 가다 diễn tả mục đích đi đâu để làm gì: đi gặp bạn."),
      q(128, "비가 [   ] 산책할 거예요.", ["오지만", "와서", "오니까", "오면"], 0, "지만 diễn tả đối lập: dù mưa nhưng sẽ đi dạo."),
      q(129, "숙제를 [   ] 텔레비전을 봤어요.", ["하고 나서", "하기 때문에", "했지만", "하면"], 0, "고 나서 nghĩa là sau khi làm bài tập thì xem TV."),
      q(130, "한국어를 [   ] 학원에 다녀요.", ["배우려고", "배워서", "배웠지만", "배우면"], 0, "으려고 diễn tả mục đích: đi học ở trung tâm để học tiếng Hàn."),
    ],
  },
  {
    id: "fill-blank-07",
    title: "Đề 07 · Kính ngữ cơ bản",
    subtitle: "Cách nói lịch sự với người lớn và thầy cô",
    duration: 5,
    instruction,
    questions: [
      q(131, "선생님께서 교실에 [   ].", ["오십니다", "옵니다", "와요", "왔습니다"], 0, "께서 và 오시다 tạo câu kính ngữ: thầy/cô đến lớp."),
      q(132, "할머니께서 진지를 [   ].", ["드십니다", "먹습니다", "마십니다", "잡니다"], 0, "드십니다 là kính ngữ của 먹다, dùng cho người lớn tuổi."),
      q(133, "아버지께 선물을 [   ].", ["드렸어요", "줬어요", "받았어요", "샀어요"], 0, "드리다 là kính ngữ khi mình biếu/tặng người lớn."),
      q(134, "주말에 할아버지를 [   ] 갔어요.", ["뵈러", "봐서", "보지만", "보면"], 0, "뵈다 là kính ngữ của 보다; 뵈러 가다 là đi thăm/gặp."),
      q(135, "선생님은 지금 교무실에 [   ].", ["계십니다", "있습니다", "있어요", "있었습니다"], 0, "계십니다 là kính ngữ của 있다 khi nói về thầy/cô."),
    ],
  },
  {
    id: "fill-blank-08",
    title: "Đề 08 · Vị trí và phương tiện",
    subtitle: "Nơi chốn, hướng đi và phương tiện giao thông",
    duration: 5,
    instruction,
    questions: [
      q(136, "은행은 우체국 [   ] 있어요.", ["옆에", "옆에서", "옆으로", "옆을"], 0, "옆에 있어요 diễn tả vị trí: ngân hàng ở cạnh bưu điện."),
      q(137, "저는 지하철을 [   ] 회사에 가요.", ["타고", "타서", "타지만", "타면"], 0, "Động từ + 고 nối hai hành động: đi tàu điện ngầm rồi đến công ty."),
      q(138, "약국은 병원 [   ] 있습니다.", ["앞에", "앞에서", "앞으로", "앞을"], 0, "앞에 diễn tả vị trí ở phía trước bệnh viện."),
      q(139, "이 길에서 왼쪽으로 [   ].", ["가세요", "가서", "가지만", "갔어요"], 0, "세요 là đuôi yêu cầu lịch sự: xin hãy đi về bên trái."),
      q(140, "학교에서 집[   ] 십 분 걸려요.", ["까지", "부터", "에", "에서"], 0, "까지 đánh dấu điểm cuối của quãng đường: từ trường đến nhà."),
    ],
  },
  {
    id: "fill-blank-09",
    title: "Đề 09 · So sánh và trải nghiệm",
    subtitle: "So sánh sự vật và nói về kinh nghiệm",
    duration: 5,
    instruction,
    questions: [
      q(141, "동생[   ] 제가 더 큽니다.", ["보다", "에게", "에서", "하고"], 0, "보다 đặt sau đối tượng được so sánh: tôi cao hơn em."),
      q(142, "이 가방은 저 가방[   ] 싸요.", ["보다", "까지", "부터", "에게"], 0, "보다 dùng để so sánh giá của hai chiếc túi."),
      q(143, "저는 한국에 [   ] 있어요.", ["가 본 적이", "간 다음에", "가고 나서", "가려고"], 0, "아/어 본 적이 있다 diễn tả đã từng trải nghiệm việc gì."),
      q(144, "오늘은 어제[   ] 따뜻해요.", ["보다", "에서", "까지", "에게"], 0, "보다 đánh dấu mốc so sánh: hôm nay ấm hơn hôm qua."),
      q(145, "저는 매운 음식[   ] 좋아해요.", ["을 더", "에 더", "에서 더", "부터 더"], 0, "을 là trợ từ tân ngữ của 좋아하다: thích món cay hơn."),
    ],
  },
  {
    id: "fill-blank-10",
    title: "Đề 10 · Tổng hợp sơ cấp",
    subtitle: "Kết hợp từ vựng và ngữ pháp TOPIK I",
    duration: 5,
    instruction,
    questions: [
      q(146, "시간이 [   ] 택시를 탔어요.", ["없어서", "없지만", "없으면", "없고"], 0, "아/어서 diễn tả lý do: vì không có thời gian nên đã đi taxi."),
      q(147, "저는 한국어를 [   ] 학생입니다.", ["공부하는", "공부해서", "공부하면", "공부했지만"], 0, "Động từ hiện tại + 는 bổ nghĩa cho danh từ: học sinh đang học tiếng Hàn."),
      q(148, "책을 [   ] 도서관에 가세요.", ["빌리려면", "빌렸지만", "빌려서", "빌리고"], 0, "으려면 nghĩa là nếu muốn mượn sách thì hãy đến thư viện."),
      q(149, "친구가 오면 같이 [   ].", ["먹을 거예요", "먹었어요", "먹으세요", "먹고 있어요"], 0, "오면 là nếu/khi bạn đến; 먹을 거예요 diễn tả kế hoạch tương lai."),
      q(150, "이 음식은 너무 [   ] 아이가 못 먹어요.", ["매워서", "맵지만", "매우면", "맵고"], 0, "아/어서 nêu nguyên nhân: món ăn quá cay nên trẻ không ăn được."),
    ],
  },
];


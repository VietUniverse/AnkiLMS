// Original HaechiVN examples organized around King Sejong Institute style progression.
// These are not copied from Sejong Hakdang textbooks.
export type SejongTopicWord = {
  id: string;
  level: string;
  topic: string;
  korean: string;
  romanization: string;
  meaning: string;
  example: string;
  translation: string;
};

const rows: [string, string, string, string, string, string, string][] = [
  ["TOPIK 1", "Chào hỏi", "처음 뵙겠습니다", "Cheoeum boepgetseumnida", "Rất vui được gặp lần đầu", "저는 민수입니다. 처음 뵙겠습니다.", "Tôi là Minsu. Rất vui được gặp bạn."],
  ["TOPIK 1", "Giới thiệu", "고향", "Gohyang", "Quê hương", "제 고향은 부산이에요.", "Quê tôi ở Busan."],
  ["TOPIK 1", "Gia đình", "동생", "Dongsaeng", "Em", "저는 여동생이 한 명 있어요.", "Tôi có một em gái."],
  ["TOPIK 1", "Sinh hoạt", "일어나다", "Ireonada", "Thức dậy", "저는 아침 일곱 시에 일어나요.", "Tôi thức dậy lúc bảy giờ sáng."],
  ["TOPIK 1", "Thời gian", "주말", "Jumal", "Cuối tuần", "주말에 친구를 만나요.", "Cuối tuần tôi gặp bạn."],
  ["TOPIK 1", "Ăn uống", "주문하다", "Jumunhada", "Gọi món", "불고기 하나하고 물을 주문할게요.", "Cho tôi gọi một phần bulgogi và nước."],
  ["TOPIK 1", "Mua sắm", "이것", "Igeot", "Cái này", "이것은 얼마예요?", "Cái này giá bao nhiêu?"],
  ["TOPIK 1", "Địa điểm", "왼쪽", "Oenjjok", "Bên trái", "은행은 왼쪽에 있어요.", "Ngân hàng ở bên trái."],
  ["TOPIK 2", "Nhà cửa", "이사하다", "Isahada", "Chuyển nhà", "다음 달에 새 집으로 이사해요.", "Tháng sau tôi chuyển đến nhà mới."],
  ["TOPIK 2", "Giao thông", "갈아타다", "Garata-da", "Chuyển tuyến", "시청역에서 2호선으로 갈아타세요.", "Hãy chuyển sang tuyến số 2 ở ga City Hall."],
  ["TOPIK 2", "Sức khỏe", "감기에 걸리다", "Gamgie geollida", "Bị cảm", "감기에 걸려서 병원에 갔어요.", "Tôi bị cảm nên đã đến bệnh viện."],
  ["TOPIK 2", "Thời tiết", "비가 그치다", "Biga geuchida", "Mưa tạnh", "오후에는 비가 그칠 거예요.", "Chiều nay trời sẽ tạnh mưa."],
  ["TOPIK 2", "Du lịch", "예약하다", "Yeyak-hada", "Đặt trước", "주말 기차표를 미리 예약했어요.", "Tôi đã đặt vé tàu cuối tuần trước."],
  ["TOPIK 2", "Học tập", "복습하다", "Bokseup-hada", "Ôn tập", "수업이 끝난 후에 배운 내용을 복습해요.", "Sau giờ học tôi ôn lại nội dung đã học."],
  ["TOPIK 2", "Công việc", "회의", "Hoeui", "Cuộc họp", "오전 회의는 열 시에 시작해요.", "Cuộc họp buổi sáng bắt đầu lúc mười giờ."],
  ["TOPIK 2", "Sở thích", "등산", "Deungsan", "Leo núi", "건강을 위해 주말마다 등산을 해요.", "Vì sức khỏe, cuối tuần nào tôi cũng leo núi."],
  ["TOPIK 3", "Kinh nghiệm", "경험을 쌓다", "Gyeongheomeul ssata", "Tích lũy kinh nghiệm", "다양한 사람을 만나며 경험을 쌓았어요.", "Tôi tích lũy kinh nghiệm khi gặp gỡ nhiều người."],
  ["TOPIK 3", "Mục tiêu", "목표를 세우다", "Mokpyoreul seuda", "Đặt mục tiêu", "올해는 한국어 시험에 합격하는 것을 목표로 세웠어요.", "Năm nay tôi đặt mục tiêu đỗ kỳ thi tiếng Hàn."],
  ["TOPIK 3", "Cảm xúc", "마음이 놓이다", "Maeumi nohida", "Thấy nhẹ nhõm", "결과를 듣고 나니 마음이 놓였어요.", "Nghe kết quả xong tôi thấy nhẹ nhõm."],
  ["TOPIK 3", "Môi trường", "분리수거", "Bunrisugeo", "Phân loại rác", "재활용을 위해 쓰레기를 분리수거해야 해요.", "Cần phân loại rác để tái chế."],
  ["TOPIK 3", "Truyền thông", "소식을 전하다", "Sosigeul jeonhada", "Truyền tin", "인터넷은 빠르게 소식을 전해 줘요.", "Internet giúp truyền tin nhanh chóng."],
  ["TOPIK 3", "Văn hóa", "전통을 이어가다", "Jeontongeul ieogada", "Tiếp nối truyền thống", "젊은 세대가 전통문화를 이어가고 있어요.", "Thế hệ trẻ đang tiếp nối văn hóa truyền thống."],
  ["TOPIK 3", "Quan hệ", "의견을 나누다", "Uigyeoneul nanuda", "Trao đổi ý kiến", "친구들과 진로에 대해 의견을 나눴어요.", "Tôi đã trao đổi với bạn bè về định hướng nghề nghiệp."],
  ["TOPIK 3", "Đời sống", "균형을 맞추다", "Gyunhyeongeul matchuda", "Giữ cân bằng", "일과 휴식의 균형을 맞추는 것이 중요해요.", "Giữ cân bằng giữa công việc và nghỉ ngơi rất quan trọng."],
  ["TOPIK 4", "Xã hội", "고령화", "Goryeonghwa", "Già hóa dân số", "고령화에 대비한 복지 정책이 필요합니다.", "Cần có chính sách phúc lợi để chuẩn bị cho tình trạng già hóa dân số."],
  ["TOPIK 4", "Công nghệ", "개인 정보", "Gaein jeongbo", "Thông tin cá nhân", "개인 정보를 안전하게 관리해야 합니다.", "Cần quản lý an toàn thông tin cá nhân."],
  ["TOPIK 4", "Giáo dục", "학습 효과", "Hakseup hyogwa", "Hiệu quả học tập", "꾸준히 복습하면 학습 효과가 높아집니다.", "Ôn tập đều đặn sẽ nâng cao hiệu quả học tập."],
  ["TOPIK 4", "Môi trường", "에너지를 절약하다", "Eneojireul jeollyakhada", "Tiết kiệm năng lượng", "작은 실천으로 에너지를 절약할 수 있습니다.", "Có thể tiết kiệm năng lượng bằng những hành động nhỏ."],
  ["TOPIK 4", "Văn hóa", "세대 차이", "Sedae chai", "Khác biệt thế hệ", "서로의 경험을 나누면 세대 차이를 줄일 수 있어요.", "Chia sẻ trải nghiệm với nhau có thể thu hẹp khoảng cách thế hệ."],
  ["TOPIK 4", "Kinh tế", "소비 습관", "Sobi seupgwan", "Thói quen tiêu dùng", "광고는 사람들의 소비 습관에 영향을 줍니다.", "Quảng cáo ảnh hưởng đến thói quen tiêu dùng của mọi người."],
  ["TOPIK 4", "Sức khỏe", "예방하다", "Yebanghada", "Phòng ngừa", "규칙적인 운동은 여러 질병을 예방하는 데 도움이 됩니다.", "Tập thể dục đều đặn giúp phòng ngừa nhiều bệnh."],
  ["TOPIK 4", "Thảo luận", "근거를 제시하다", "Geungeoreul jesihada", "Đưa ra căn cứ", "주장을 할 때에는 구체적인 근거를 제시해야 합니다.", "Khi đưa ra quan điểm cần nêu căn cứ cụ thể."],
  ["TOPIK 5", "Việc làm", "근무 환경", "Geunmu hwangyeong", "Môi trường làm việc", "유연한 근무 환경은 직원의 만족도를 높일 수 있습니다.", "Môi trường làm việc linh hoạt có thể tăng mức độ hài lòng của nhân viên."],
  ["TOPIK 5", "Khoa học", "연구 결과", "Yeongu gyeolgwa", "Kết quả nghiên cứu", "연구 결과를 해석할 때에는 자료의 한계도 고려해야 합니다.", "Khi phân tích kết quả nghiên cứu cũng cần cân nhắc giới hạn của dữ liệu."],
  ["TOPIK 5", "Đô thị", "주거 비용", "Jugeo biyong", "Chi phí nhà ở", "대도시에서는 주거 비용이 큰 부담이 되고 있습니다.", "Ở các thành phố lớn, chi phí nhà ở đang trở thành gánh nặng lớn."],
  ["TOPIK 5", "Truyền thông", "정보를 판별하다", "Jeongboreul panbyeolhada", "Đánh giá độ tin cậy thông tin", "다양한 출처를 비교해 정보의 신뢰성을 판별해야 합니다.", "Cần so sánh nhiều nguồn để đánh giá độ tin cậy của thông tin."],
  ["TOPIK 5", "Môi trường", "탄소 배출량", "Tanso baechullyang", "Lượng phát thải carbon", "기업은 생산 과정에서 탄소 배출량을 줄이려 노력하고 있습니다.", "Các doanh nghiệp đang nỗ lực giảm lượng phát thải carbon trong sản xuất."],
  ["TOPIK 5", "Văn hóa", "문화적 다양성", "Munhwajeok dayangseong", "Đa dạng văn hóa", "문화적 다양성을 존중하는 태도가 필요합니다.", "Cần có thái độ tôn trọng sự đa dạng văn hóa."],
  ["TOPIK 5", "Kinh tế", "장기적인 관점", "Janggijeogin gwanjeom", "Góc nhìn dài hạn", "단기적인 이익보다 장기적인 관점에서 판단해야 합니다.", "Nên đánh giá từ góc nhìn dài hạn thay vì lợi ích ngắn hạn."],
  ["TOPIK 5", "Giao tiếp", "합의점을 찾다", "Hap-uijeomeul chatda", "Tìm điểm đồng thuận", "서로의 입장을 듣고 현실적인 합의점을 찾았습니다.", "Chúng tôi lắng nghe lập trường của nhau và tìm được điểm đồng thuận thực tế."],
  ["TOPIK 6", "Xã hội", "사회적 합의", "Sahoejeok habui", "Sự đồng thuận xã hội", "제도의 변화에는 충분한 논의와 사회적 합의가 뒤따라야 합니다.", "Thay đổi thể chế cần đi cùng thảo luận đầy đủ và đồng thuận xã hội."],
  ["TOPIK 6", "Chính sách", "정책의 실효성", "Jeongchaegui silhyoseong", "Tính hiệu quả thực tế của chính sách", "정책의 실효성을 높이려면 현장의 의견을 반영해야 합니다.", "Để tăng hiệu quả thực tế của chính sách, cần phản ánh ý kiến từ thực tiễn."],
  ["TOPIK 6", "Khoa học", "연구 윤리", "Yeongu yulli", "Đạo đức nghiên cứu", "연구자는 결과뿐 아니라 연구 윤리도 지켜야 합니다.", "Nhà nghiên cứu cần tuân thủ đạo đức nghiên cứu bên cạnh việc quan tâm kết quả."],
  ["TOPIK 6", "Môi trường", "생태계의 회복력", "Saengtaegyui hoebokryeok", "Khả năng phục hồi của hệ sinh thái", "생태계의 회복력을 고려한 개발 계획이 필요합니다.", "Cần kế hoạch phát triển có cân nhắc khả năng phục hồi của hệ sinh thái."],
  ["TOPIK 6", "Truyền thông", "담론을 형성하다", "Damnoneul hyeongseonghada", "Hình thành diễn ngôn", "미디어는 사회적 쟁점에 대한 담론을 형성하는 데 큰 역할을 합니다.", "Truyền thông đóng vai trò lớn trong việc hình thành diễn ngôn về các vấn đề xã hội."],
  ["TOPIK 6", "Kinh tế", "구조적 불평등", "Gujojeok bulpyeongdeung", "Bất bình đẳng mang tính cơ cấu", "구조적 불평등을 완화하기 위해 장기적인 제도 개선이 요구됩니다.", "Cần cải thiện thể chế dài hạn để giảm bất bình đẳng mang tính cơ cấu."],
  ["TOPIK 6", "Lập luận", "전제를 검토하다", "Jeonjereul geomtohada", "Xem xét tiền đề", "주장의 타당성을 판단하려면 먼저 전제를 검토해야 합니다.", "Muốn đánh giá tính hợp lý của lập luận, trước hết cần xem xét tiền đề."],
  ["TOPIK 6", "Học thuật", "상호 보완적", "Sangho bowanjeok", "Bổ sung lẫn nhau", "두 접근법은 경쟁 관계라기보다 상호 보완적이라고 볼 수 있습니다.", "Có thể xem hai cách tiếp cận bổ sung cho nhau hơn là cạnh tranh."],
];

export const SEJONG_TOPIC_VOCABULARY: SejongTopicWord[] = rows.map(([level, topic, korean, romanization, meaning, example, translation], index) => ({
  id: `sejong-topic-${index + 1}`,
  level,
  topic,
  korean,
  romanization,
  meaning,
  example,
  translation,
}));

export const TOPIK_LEVEL_GUIDE: { level: string; course: string; description: string }[] = [
  { level: "TOPIK 1", course: "Sơ cấp 1 · Sejong 1", description: "Chào hỏi và nhu cầu hằng ngày" },
  { level: "TOPIK 2", course: "Sơ cấp 2 · Sejong 2", description: "Sinh hoạt, dịch vụ và trải nghiệm" },
  { level: "TOPIK 3", course: "Trung cấp 1 · Sejong 3", description: "Kể chuyện, nêu ý kiến và giải thích" },
  { level: "TOPIK 4", course: "Trung cấp 2 · Sejong 4", description: "Chủ đề xã hội và lập luận rõ ràng" },
  { level: "TOPIK 5", course: "Cao cấp 1 · Sejong 5", description: "Diễn đạt chuyên sâu và ngữ cảnh trang trọng" },
  { level: "TOPIK 6", course: "Cao cấp 2 · Sejong 6", description: "Văn bản học thuật và vấn đề trừu tượng" },
];

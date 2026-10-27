"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Headphones, Volume2, CheckCircle2, Play, Square, RefreshCw, HelpCircle, Sparkles, Filter, ChevronLeft, ChevronRight, Eye, Mic, RotateCcw, Keyboard, ArrowLeft, Star, PlayCircle, Lock, AlertTriangle } from "lucide-react";
import { ApiClient } from "../lib/apiClient";
import { calculateKoreanSimilarity, normalizeKoreanText } from "../lib/koreanText";
import { loadLessonProgress, saveLessonProgress } from "../lib/lessonProgress";
import { loadYouTubeIframeApi } from "../lib/youtubeIframe";
import { KOREAN_LESSON_TOPICS, matchesLessonTopic } from "../lib/lessonTopics";

// Import TOPIK lessons dataset
import topikLessonsData from "../data/topik_lessons.json";
import scriptFolderData from "../data/script_folder_lessons.json";
import { SCRIPT_LESSON_GROUPS, getScriptLessonGroupId } from "../data/scriptLessonGroups";
import { KOREAN_WORD_GLOSSARY } from "../data/koreanWordGlossary";
import { TranslationLanguageSetup } from "./TranslationLanguageSetup";
import { useTranslationLanguage } from "../lib/translationPreference";

const DEFAULT_VIDEO_ID = "TLgAJgYqIZk";
const VIDEO_DICTATION_SOURCES = [
  {
    videoId: "R6XM76T4tCk", title: "주간 넷플릭스 · 10월 3주 차", topikLevel: 5, durationSec: 229,
    segments: [
      { start: 0, end: 2, text: "주간 넷플릭스 10월 3주 차. 이번", translation: "Netflix tuần này, tuần thứ ba của tháng 10. Tuần này,", translationEn: "Netflix Weekly, the third week of October. This week," },
      { start: 2, end: 4, text: "주 넷플릭스 신작, 주사위로 떠나는", translation: "các tác phẩm mới của Netflix: chuyến du lịch ngẫu nhiên bằng xúc xắc", translationEn: "Netflix's new releases: a random trip guided by dice" },
      { start: 4, end: 6, text: "랜덤 세계 여행. 이번엔 여행 필름", translation: "vòng quanh thế giới. Lần này, chuyến đi gặp lễ hội phim du lịch", translationEn: "around the world. This time, it meets a travel film" },
      { start: 6, end: 8, text: "페스티벌과 만났습니다. 지구마불 세계", translation: "festival. Chương trình Du lịch Địa Cầu bằng Xúc Xắc", translationEn: "festival. World Dice Tour" },
      { start: 8, end: 11, text: "여행 시즌 4 힘차게 출발합니다. 전 세계를", translation: "mùa 4 chính thức khởi hành đầy khí thế. Chuyến đi vòng quanh thế giới", translationEn: "season 4 sets off with energy. The world-spanning" },
      { start: 11, end: 13, text: "누볐던 곽빠원의 보드 게임", translation: "trong trò chơi bàn cờ của Kwak, Pani và Wonji", translationEn: "board-game journey of Kwak, Pani and Wonji" },
      { start: 13, end: 15, text: "여행이 이번 시즌 한층 더", translation: "đã trở nên đa dạng hơn trong mùa này", translationEn: "has become even more varied this season" },
      { start: 15, end: 18, text: "버라이어티해졌는데요.", translation: "và đầy màu sắc hơn.", translationEn: "and more entertaining." },
      { start: 18, end: 23, text: "기차를 잘못 타가지고 진짜 열받는다. 되는 일이 없어.", translation: "Tôi lên nhầm tàu nên tức điên lên. Chẳng việc gì suôn sẻ cả.", translationEn: "I got on the wrong train, and I'm really annoyed. Nothing is going right." },
      { start: 23, end: 32, text: "액션, 스릴러, SF 판타지, 어드벤처, 코미디, 드라마까지 지구를 무대로 한 다양한 장르의 영화 같은 여정이 펼쳐집니다.", translation: "Từ hành động, giật gân, khoa học viễn tưởng, phiêu lưu, hài đến chính kịch, một hành trình điện ảnh thuộc nhiều thể loại sẽ mở ra trên sân khấu là Trái Đất.", translationEn: "From action and thrillers to sci-fi fantasy, adventure, comedy and drama, a cinematic journey across genres unfolds on Earth." },
      { start: 32, end: 37, text: "여기에 더해 이 매력 넘치는 여행 파트너들이 활약한 지난 시즌들도 모두 넷플릭스에서 만나 보실 수 있습니다.", translation: "Ngoài ra, bạn có thể xem trên Netflix cả những mùa trước với các bạn đồng hành du lịch đầy sức hút này.", translationEn: "You can also watch previous seasons featuring these captivating travel partners on Netflix." },
      { start: 37, end: 40, text: "보자고, 먹어보자고, 까보자고.", translation: "Đi xem nào, ăn thử nào, mở ra xem nào.", translationEn: "Let's see it, taste it, and find out." },
      { start: 40, end: 53, text: "새롭게 단장한 보드판으로 떠나는 지구 한 바퀴. 더 다이내믹해진 글로벌 테마파크, 지구마불 세계여행 시즌 4, 10월 17일 개장합니다.", translation: "Một vòng quanh Trái Đất với bàn cờ được làm mới. Công viên chủ đề toàn cầu năng động hơn: Du lịch Địa Cầu bằng Xúc Xắc mùa 4 khởi hành ngày 17 tháng 10.", translationEn: "A trip around Earth on a newly redesigned game board. World Dice Tour season 4, now a more dynamic global theme park, launches October 17." },
      { start: 53, end: 68, text: "다음 신작. 1971년 전 세계를 충격에 빠뜨렸던 심리 실험이 넷플릭스 리얼리티로 다시 태어났습니다. 스탠퍼드 감옥 실험 리부트입니다.", translation: "Tác phẩm mới tiếp theo. Thí nghiệm tâm lý từng gây chấn động thế giới năm 1971 được tái hiện thành chương trình thực tế của Netflix: Stanford Prison Experiment: Reboot.", translationEn: "The next new release. The psychological experiment that shocked the world in 1971 is reborn as a Netflix reality series: The Stanford Prison Experiment: Reboot." },
      { start: 68, end: 81, text: "2주간 실제 교도소에서 진행되는 이 실험은 30명의 지원자에게 교도관과 수감자 역할을 임의로 배정해 진행되는데요.", translation: "Thí nghiệm diễn ra trong hai tuần tại một nhà tù thật, với 30 tình nguyện viên được phân ngẫu nhiên vào vai cai ngục và tù nhân.", translationEn: "Conducted for two weeks in a real prison, the experiment randomly assigns 30 volunteers to act as guards or inmates." },
      { start: 81, end: 94, text: "그저 역할을 나눴을 뿐이지만 거대한 위계 질서 속에서 참가자들은 걷잡을 수 없이 변해가고 극한의 통제가 만든 거대한 권력 앞에서 숨겨진 인간의 내면이 서서히 드러나기 시작합니다.", translation: "Dù ban đầu chỉ được chia vai, những người tham gia dần biến đổi không thể kiểm soát trong một trật tự thứ bậc khổng lồ; trước quyền lực được tạo ra bởi sự kiểm soát cực độ, nội tâm ẩn giấu của con người dần lộ diện.", translationEn: "Though they are only assigned roles, participants change uncontrollably within a vast hierarchy, and human nature slowly emerges under the immense power created by extreme control." },
      { start: 94, end: 107, text: "인간은 주어진 환경에 순응하며 권력에 굴복할 것인가? 그 질문에 대한 답을 10월 21일 스탠퍼드 감옥 실험 리부트에서 찾아보세요.", translation: "Con người sẽ thích nghi với hoàn cảnh và khuất phục trước quyền lực chứ? Hãy tìm câu trả lời trong Stanford Prison Experiment: Reboot, ngày 21 tháng 10.", translationEn: "Will people adapt to their circumstances and submit to power? Find the answer in The Stanford Prison Experiment: Reboot on October 21." },
      { start: 107, end: 117, text: "다음 신작. 하루아침에 세상에서 완전히 지워진 대배우가 인생 되찾기에 나섰습니다. 넷플릭스 코미디 시리즈", translation: "Tác phẩm mới tiếp theo. Một ngôi sao lớn bỗng bị xóa sổ hoàn toàn khỏi thế giới và bắt đầu tìm lại cuộc đời mình. Loạt phim hài Netflix", translationEn: "The next new release. A major star is suddenly erased from the world and sets out to reclaim his life. The Netflix comedy series" },
      { start: 117, end: 125, text: "누가 내 얘기 안 했어?", translation: "Có ai nhắc đến tôi không?", translationEn: "Did Someone Forget About Me?" },
      { start: 125, end: 138, text: "이름만 대면 누구나 아는 일본 대표 배우 타카세가와 겐. 영국 런던에서 리어왕 무대에 올라 명연기로 관객들의 찬사를 받았는데요. 하지만 일본에 돌아온 순간", translation: "Ken Takasegawa, một diễn viên hàng đầu Nhật Bản mà ai cũng biết tên. Anh được khán giả tán thưởng nhờ diễn xuất xuất sắc trong vở Vua Lear ở London, Anh. Nhưng ngay khi trở về Nhật Bản,", translationEn: "Ken Takasegawa, a leading Japanese actor known by everyone. He earned acclaim for his performance in King Lear in London, but the moment he returned to Japan," },
      { start: 138, end: 153, text: "과거의 영광도 무대 위 스포트라이트도 한여름 밤의 꿈처럼 사라져 버렸죠. 하루아침에 인생이 리셋되고 밑바닥부터 다시 시작하게 된 겐.", translation: "Vinh quang xưa và ánh đèn sân khấu đều tan biến như giấc mơ giữa đêm hè. Chỉ sau một đêm, cuộc đời Ken bị đặt lại từ đầu và anh phải bắt đầu lại từ đáy.", translationEn: "His past glory and the spotlight vanished like a midsummer night's dream. Overnight, Ken's life was reset, and he had to start again from the bottom." },
      { start: 153, end: 162, text: "무엇 하나 쉬운 게 없지만 그간 잊고 지냈던 주변인들과의 소중한 일상을 차근차근 만들어 갑니다.", translation: "Dù chẳng có gì dễ dàng, anh từng bước xây dựng lại những khoảnh khắc quý giá với những người xung quanh mà mình đã lãng quên.", translationEn: "Though nothing is easy, he slowly rebuilds a precious everyday life with the people around him whom he had neglected." },
      { start: 162, end: 173, text: "다음 신작. 열성팬에서 레전드 힙합 클랜의 일원이 된 남자. 그의 발자취를 쫓아 화제의 앨범 제작 과정을 되짚어 봅니다. 다큐멘터리 더 디사이플: 우 탱 클랜의 제자입니다.", translation: "Tác phẩm mới tiếp theo. Từ một người hâm mộ cuồng nhiệt, anh trở thành thành viên của nhóm hip-hop huyền thoại. Phim lần theo hành trình của anh và nhìn lại quá trình tạo nên album gây tiếng vang. Đây là phim tài liệu The Disciple: Đệ tử của Wu-Tang Clan.", translationEn: "The next new release. A devoted fan becomes part of a legendary hip-hop clan. This documentary follows his journey and revisits the making of a talked-about album: The Disciple: The Wu-Tang Clan's Disciple." },
      { start: 173, end: 185, text: "아웃사이더였던 실버링즈는 전설적인 힙합 그룹 우 탱 클랜의 열성 팬이었습니다. 실버링즈는 그들의 무대에 올라 직접 랩을 선보이며 자신의 운명을 바꿀 기회를 얻는데요.", translation: "Silver Rings, 한때 외부인이었던 그는 전설적인 힙합 그룹 Wu-Tang Clan의 열성 팬이었습니다. 그들의 무대에 올라 직접 랩을 선보이며 운명을 바꿀 기회를 얻습니다.", translationEn: "Silver Rings, once an outsider, was a devoted fan of legendary hip-hop group Wu-Tang Clan. He gets a chance to change his fate by taking their stage and performing a rap." },
      { start: 185, end: 197, text: "당당하게 실력을 증명한 실버링즈는 우상이었던 우 탱 클랜의 제자로 인정받습니다. 그는 힙합의 저항 정신과 음악의 예술적 가치를 담은 앨범 '원스 어폰 어 타임 인 샤오린'을 제작하는데요.", translation: "Sau khi tự tin chứng minh năng lực, Silver Rings được Wu-Tang Clan, nhóm nhạc anh ngưỡng mộ, công nhận là đệ tử. Anh thực hiện album 'Once Upon a Time in Shaolin', chứa đựng tinh thần phản kháng của hip-hop và giá trị nghệ thuật của âm nhạc.", translationEn: "After proving his ability, Silver Rings is recognized as a disciple by his idols, Wu-Tang Clan. He creates Once Upon a Time in Shaolin, an album embodying hip-hop's rebellious spirit and music's artistic value." },
      { start: 197, end: 211, text: "하지만 딱 한 장만 발매된 그 앨범은 수공의 은상자에 담겨 경매에 올라 큰 논란을 일으켰죠. 그의 재능으로 탄생한 문제적 앨범과 그 음악이 남긴 숙제들, 더 디사이플: 우 탱 클랜의 제자에서 만나보세요.", translation: "Nhưng album chỉ phát hành duy nhất một bản ấy được đặt trong chiếc hộp bạc thủ công và đem bán đấu giá, gây ra tranh cãi lớn. Hãy khám phá album gây tranh luận ra đời từ tài năng của anh và những câu hỏi âm nhạc ấy để lại trong The Disciple: Đệ tử của Wu-Tang Clan.", translationEn: "But the album, released as a single copy, was placed in a handmade silver box and auctioned, causing controversy. Discover the contentious album born of his talent and the questions it left behind in The Disciple: The Wu-Tang Clan's Disciple." },
      { start: 211, end: 215, text: "넷플릭스를 즐기는 가장 영리한 방법, 주간 넷플릭스였습니다.", translation: "Cách thông minh nhất để tận hưởng Netflix. Vừa rồi là Netflix tuần này.", translationEn: "The smartest way to enjoy Netflix. That was Netflix Weekly." },
      { start: 215, end: 219, text: "다음 주에는 마음까지 충전해질 작품들과 함께 돌아올게요.", translation: "Tuần sau, chúng tôi sẽ trở lại với những tác phẩm giúp nạp đầy năng lượng cho cả trái tim.", translationEn: "Next week, we'll be back with titles that recharge your heart, too." },
    ],
  },
  {
    videoId: "t_EGBys58lo", title: "종이의 집: 공동경제구역 · Money Heist Korea", topikLevel: 4, durationSec: 168,
    segments: [
      { start: 26, end: 29, text: "여기 지키라, 내래 처리한다.", translation: "Cứ canh ở đây, để tôi xử lý.", translationEn: "Keep watch here. I'll take care of it." },
      { start: 29, end: 31, text: "예.", translation: "Vâng.", translationEn: "Yes, sir." },
      { start: 75, end: 77, text: "어, 동지…", translation: "Ơ, đồng chí…", translationEn: "Oh, comrade…" },
      { start: 78, end: 80, text: "내래 기계 가르쳤네?", translation: "Anh dạy tôi dùng máy rồi à?", translationEn: "Did you teach me how to use the machine?" },
      { start: 78, end: 83, text: "배때기에 기름기가 꼈는지 움직임이 영 둔해졌구만.", translation: "Chắc bụng tích mỡ rồi hay sao mà cử động chậm chạp hẳn đi.", translationEn: "Maybe you've gotten fat around the belly; your movements have slowed right down." },
      { start: 83, end: 85, text: "무혁 동지.", translation: "Đồng chí Mu-hyeok.", translationEn: "Comrade Mu-hyeok." },
      { start: 85, end: 88, text: "살려주시오.", translation: "Xin hãy tha mạng cho tôi.", translationEn: "Please spare my life." },
      { start: 88, end: 92, text: "마지막으로 남길 말이 고작 기건가?", translation: "Lời cuối cùng anh muốn để lại chỉ có vậy thôi sao?", translationEn: "Is that all you have to say as your last words?" },
      { start: 96, end: 99, text: "분단 시대는 이제 끝났소.", translation: "Thời kỳ chia cắt giờ đã kết thúc.", translationEn: "The era of division is over now." },
      { start: 104, end: 105, text: "다시 말해 보라.", translation: "Nói lại xem.", translationEn: "Say that again." },
      { start: 105, end: 109, text: "윗선에서 이미 이야기가 끝났다고 들었소.", translation: "Tôi nghe nói cấp trên đã quyết định xong chuyện này rồi.", translationEn: "I heard the higher-ups have already settled the matter." },
      { start: 109, end: 113, text: "우리 같은 이 종자들은 기냥 쓰다 버려지는 거야.", translation: "Những kẻ như chúng ta chỉ bị dùng xong rồi vứt bỏ thôi.", translationEn: "People like us are just used and thrown away." },
      { start: 122, end: 124, text: "옛정을 생각해서리.", translation: "Nghĩ đến tình nghĩa xưa.", translationEn: "For old times' sake." },
      { start: 124, end: 126, text: "고통 없이 보내 주려고 했는데.", translation: "Tôi đã định cho anh ra đi không đau đớn.", translationEn: "I was going to let you go without pain." },
    ],
  },
  {
    videoId: "yW6_97U-tlI", title: "스텝스 · 공식 예고편", topikLevel: 4, durationSec: 156,
    segments: [
      { start: 0.43, end: 1.93, text: "여러분, 안녕하세요?", translation: "Xin chào mọi người.", translationEn: "Hello, everyone." },
      { start: 4.23, end: 6.63, text: "제가 주인공인 세계에 떨어진 느낌이야!", translation: "Cảm giác như mình rơi vào thế giới mà mình là nhân vật chính vậy!", translationEn: "It feels like I fell into a world where I'm the main character!" },
      { start: 8.53, end: 11.43, text: "네가 바라는 건 내가 다 이뤄줄 거야!", translation: "Điều em mong muốn, anh sẽ biến tất cả thành hiện thực!", translationEn: "I'll make everything you wish for come true!" },
      { start: 17.03, end: 19.23, text: "그러니까 진짜 이야기를 알아야지.", translation: "Vì vậy phải biết câu chuyện thật sự chứ.", translationEn: "That's why you need to know the real story." },
      { start: 24.13, end: 29.51, text: "이거 놔!", translation: "Buông tôi ra!", translationEn: "Let go of me!" },
      { start: 35.81, end: 38.81, text: "이 난장판을 바로잡을 방법은 딱 하나야.", translation: "Chỉ có một cách duy nhất để sửa chữa mớ hỗn độn này.", translationEn: "There's only one way to fix this mess." },
      { start: 77.72, end: 80.42, text: "그런 이름은 없어. 난 신데렐라야.", translation: "Không có cái tên đó. Tôi là Cinderella.", translationEn: "There's no such name. I'm Cinderella." },
    ],
  },
  {
    videoId: "yft3IXFn8IY", title: "나를 충전해줘 · 드라마 클립", topikLevel: 4, durationSec: 243,
    segments: [
      { start: 1, end: 3, text: "진짜 재미있는 걸 보면", translation: "Khi xem thứ gì đó thật sự thú vị,", translationEn: "When I watch something really fun," },
      { start: 3, end: 7, text: "이 세상에서 나만 싹 도려내서 데려가요.", translation: "cứ như chỉ có tôi bị tách khỏi thế giới này rồi đưa đi vậy.", translationEn: "it feels like I'm the only one cut out of this world and taken away." },
      { start: 7, end: 10, text: "그게 얼마나 대단한 건지 알아요?", translation: "Anh biết điều đó tuyệt vời đến mức nào không?", translationEn: "Do you know how amazing that is?" },
      { start: 11, end: 13, text: "그러니까", translation: "Vì vậy,", translationEn: "So," },
      { start: 13, end: 18, text: "나도 뭐 충전율 테스트든 충전이든 하라는 거 다 할 테니까", translation: "tôi sẽ làm mọi thứ được yêu cầu, dù là kiểm tra tỷ lệ sạc hay sạc pin,", translationEn: "I'll do whatever you ask, whether it's testing the charge rate or charging," },
      { start: 19, end: 21, text: "내 로맨스에.", translation: "trong chuyện tình cảm của tôi.", translationEn: "for my romance." },
      { start: 22, end: 24, text: "물론입니다, 계약했으니까.", translation: "Tất nhiên rồi, vì chúng ta đã ký hợp đồng mà.", translationEn: "Of course. We have a contract." },
      { start: 27, end: 30, text: "오늘 버킷리스트도 하나 해치우죠.", translation: "Hôm nay cũng hoàn thành một điều trong danh sách mong muốn nhé.", translationEn: "Let's check one item off the bucket list today, too." },
      { start: 37, end: 41, text: "아직 안 됐어요? 한 10분 지난 거 같은데.", translation: "Vẫn chưa xong sao? Hình như khoảng 10 phút rồi.", translationEn: "Is it still not done? I think about ten minutes have passed." },
      { start: 54, end: 57, text: "10분에 1프로 충전 맞습니다.", translation: "Đúng là sạc được 1% trong 10 phút.", translationEn: "That's right, it charges by one percent every ten minutes." },
      { start: 57, end: 60, text: "그럼 다음.", translation: "Vậy tiếp theo.", translationEn: "Then, next." },
      { start: 62, end: 66, text: "어때요? 몇 퍼 깎였어요?", translation: "Thế nào? Tụt bao nhiêu phần trăm rồi?", translationEn: "How is it? How many percent did it drop?" },
      { start: 66, end: 70, text: "나보배 씨가 차고 안에 있을 때는", translation: "Khi cô Na Bo-bae ở trong gara,", translationEn: "When Ms. Na Bo-bae is in the garage," },
      { start: 70, end: 73, text: "내 방이랑 차고까지만 충전되는 거 같아요.", translation: "có vẻ như chỉ sạc được trong phòng tôi và gara.", translationEn: "it seems to charge only in my room and the garage." },
      { start: 73, end: 77, text: "방전은 15분에 1프로씩 떨어지는 거 같고요.", translation: "Còn pin hao đi khoảng 1% mỗi 15 phút.", translationEn: "And it seems to discharge by about one percent every 15 minutes." },
      { start: 77, end: 81, text: "거리가 가까우면", translation: "Nếu khoảng cách gần,", translationEn: "If the distance is short," },
      { start: 81, end: 85, text: "7분, 8분 안에도 충전이 되는 거 같아요.", translation: "thì có vẻ cũng sạc được trong vòng 7 đến 8 phút.", translationEn: "it seems to charge in seven or eight minutes." },
      { start: 87, end: 91, text: "이게 막 그렇게 정확하지는 않네요?", translation: "Cái này có vẻ không chính xác lắm nhỉ?", translationEn: "This isn't all that accurate, is it?" },
      { start: 91, end: 95, text: "뭐, 컨디션이나 심박수에 따라 달라지는 거 같기는 한데", translation: "Có vẻ kết quả thay đổi tùy thể trạng hay nhịp tim,", translationEn: "It seems to vary depending on condition or heart rate," },
      { start: 99, end: 103, text: "스킨십 강도에 따른 테스트도", translation: "nhưng chúng ta cũng nên kiểm tra theo mức độ tiếp xúc thân mật", translationEn: "but we should also test different levels of physical contact" },
      { start: 103, end: 107, text: "진행을 해 봐야…", translation: "…để thử xem sao.", translationEn: "…and see how it goes." },
      { start: 107, end: 112, text: "확실히 알 수 있을 것 같기는 한데…", translation: "Có lẽ lúc đó mới biết chắc được…", translationEn: "I think that's the only way we'll know for sure…" },
      { start: 112, end: 115, text: "아…", translation: "À…", translationEn: "Ah…" },
      { start: 115, end: 118, text: "네, 스킨십 강도, 그렇죠.", translation: "Vâng, mức độ tiếp xúc thân mật, đúng vậy.", translationEn: "Right, the level of physical contact." },
      { start: 118, end: 120, text: "해야죠.", translation: "Phải thử chứ.", translationEn: "We should do that." },
      { start: 120, end: 123, text: "손잡기?", translation: "Nắm tay à?", translationEn: "Holding hands?" },
      { start: 126, end: 128, text: "네.", translation: "Vâng.", translationEn: "Yes." },
      { start: 128, end: 132, text: "손잡기는 5프로가 오르네요.", translation: "Nắm tay thì tăng 5% nhỉ.", translationEn: "Holding hands raises it by five percent." },
      { start: 132, end: 135, text: "그럼 다음은…", translation: "Vậy tiếp theo là…", translationEn: "Then next…" },
      { start: 135, end: 138, text: "포옹으로 가죠!", translation: "Chuyển sang ôm nhé!", translationEn: "Let's move on to a hug!" },
      { start: 138, end: 141, text: "네? 뭐.", translation: "Hả? Gì cơ?", translationEn: "Huh? What?" },
      { start: 163, end: 166, text: "이, 이거 왜 삑삑거려요?", translation: "C-cái này sao cứ kêu bíp bíp vậy?", translationEn: "W-why is this thing beeping?" },
      { start: 166, end: 169, text: "심박수 100?", translation: "Nhịp tim 100 sao?", translationEn: "Heart rate 100?" },
      { start: 169, end: 172, text: "아, 아니에요!", translation: "À, không phải đâu!", translationEn: "Oh, no!" },
      { start: 172, end: 175, text: "그, 이게…", translation: "Chuyện là, cái này…", translationEn: "Well, this…" },
      { start: 175, end: 180, text: "갑자기 급하게 충전이 돼서 그런 거 같은데.", translation: "Có lẽ vì đột nhiên được sạc nhanh quá.", translationEn: "I think it suddenly charged too quickly." },
      { start: 180, end: 184, text: "아, 포옹은 10프로…", translation: "À, ôm thì được 10%…", translationEn: "Oh, a hug gives ten percent…" },
      { start: 190, end: 193, text: "그러면", translation: "Vậy thì", translationEn: "Then," },
      { start: 192, end: 195, text: "다음은", translation: "tiếp theo là", translationEn: "next is" },
      { start: 194, end: 197, text: "키스…", translation: "hôn…", translationEn: "a kiss…" },
      { start: 197, end: 200, text: "인 건가?", translation: "sao?", translationEn: "is it?" },
      { start: 213, end: 217, text: "굳이 키스는", translation: "Còn chuyện hôn thì không nhất thiết…", translationEn: "As for kissing, we don't have to…" },
      { start: 217, end: 221, text: "뭐, 지금 할 필요 없을 거 같은데.", translation: "Chắc không cần làm ngay bây giờ đâu.", translationEn: "I don't think we need to do that now." },
      { start: 221, end: 223, text: "그, 그렇죠? 응. 예.", translation: "Đ-đúng vậy nhỉ? Ừ. Vâng.", translationEn: "R-right? Yeah. Yes." },
      { start: 223, end: 227, text: "뭐, 나, 나도 별로 궁금하지는 않았어요.", translation: "Tôi cũng không tò mò lắm đâu.", translationEn: "I wasn't really curious either." },
      { start: 227, end: 230, text: "마, 마음의 준비를 조금, 조금 하기는 했는데.", translation: "T-tôi cũng có chuẩn bị tâm lý một chút…", translationEn: "I did prepare myself a little, though…" },
      { start: 230, end: 234, text: "뭐, 뭐 안 하면 안 해도 되고.", translation: "M-mà không làm cũng được.", translationEn: "I mean, we don't have to if we don't want to." },
    ],
  },
];
const VIDEO_DICTATION_LESSONS = VIDEO_DICTATION_SOURCES.map((source, index) => ({
  id: `video-dictation-${source.videoId}`,
  collectionId: "video-dictation",
  lessonNum: index + 1,
  title: source.title,
  sourceTitle: source.title,
  sourceLabel: "Video YouTube gốc · lời chép theo mốc thời gian",
  sourceType: "video",
  videoId: source.videoId,
  sourceUrl: `https://www.youtube.com/watch?v=${source.videoId}`,
  topikLevel: source.topikLevel,
  topikName: `TOPIK ${source.topikLevel}`,
  durationSec: source.durationSec,
  scriptDurationSec: Math.round(source.segments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0)),
  startSec: source.segments[0]?.start || 0,
  endSec: 86400,
  segmentCount: source.segments.length,
  freeDictation: false,
  segments: source.segments.map((segment, lineIndex) => ({ id: lineIndex + 1, ...segment })),
}));
const SCRIPT_FOLDER_LESSONS: any[] = scriptFolderData.map((lesson: any, index: number) => ({
  ...lesson,
  lessonNum: index + 1,
  sourceLabel: lesson.sourceLabel || "Video YouTube gốc · script và timeline từ thư mục Script",
  sourceType: "video",
  freeDictation: lesson.freeDictation === true,
  scriptDurationSec: Math.round(lesson.segments.reduce((total: number, segment: any) => total + Math.max(0, segment.end - segment.start), 0)),
}));
// Keep the public catalog focused on the four reviewed personal-script lessons.
// Other built-in and admin-managed lessons are hidden from this module for now.
const ALL_LESSONS: any[] = SCRIPT_FOLDER_LESSONS;

// Validate YouTube video ID format
const isValidVideoId = (id: string): boolean => /^[A-Za-z0-9_-]{11}$/.test(id);

// Course Section Catalog Data
const RAW_COURSE_SECTIONS: any[] = [{
  id: "sec_talk-to-me-in-korean",
  title: "Hội thoại tiếng Hàn có phụ đề · Talk To Me In Korean",
  videoId: "TLgAJgYqIZk",
  lessons: topikLessonsData.filter((lesson: any) => lesson.videoId === "TLgAJgYqIZk"),
}, {
  id: "sec_ttmik-restaurant",
  title: "Gọi món & ăn uống · Talk To Me In Korean",
  videoId: "5n7HFxyE4ZI",
  lessons: topikLessonsData.filter((lesson: any) => lesson.videoId === "5n7HFxyE4ZI"),
}, {
  id: "sec-video-dictation", title: "Dictation bằng video gốc · script theo từng câu", collectionId: "video-dictation", lessons: []
}, ...SCRIPT_LESSON_GROUPS.map((group) => ({
  id: `sec-script-${group.id}`,
  title: group.title,
  description: group.description,
  icon: group.icon,
  catalogGroupId: group.id,
  lessons: [],
}))];

export const DictationModule: React.FC = () => {
  const [viewMode, setViewMode] = useState<"catalog" | "workspace">("catalog");
  const [selectedUserLevel, setSelectedUserLevel] = useState<"all" | "beginner" | "experienced">("all");
  const [selectedHashtag, setSelectedHashtag] = useState<string>("#all");
  const [showEmbeddedSubtitles, setShowEmbeddedSubtitles] = useState(false);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);

  const [selectedTopik, setSelectedTopik] = useState<string>("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("lesson_1");
  const [currentSubIndex, setCurrentSubIndex] = useState<number>(0);
  const [dictationInput, setDictationInput] = useState<string>("");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [translationLanguage, setTranslationLanguage] = useTranslationLanguage();
  const [generatedTranslation, setGeneratedTranslation] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [generatedWordGlosses, setGeneratedWordGlosses] = useState<Record<string, string>>({});
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [isGuidedPlayback, setIsGuidedPlayback] = useState(false);
  const [guidedWaiting, setGuidedWaiting] = useState(false);
  const [revealedWordIndices, setRevealedWordIndices] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number | null>(null);
  const [completedSubIds, setCompletedSubIds] = useState<number[]>([]);
  const [ytError, setYtError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [managedLessons, setManagedLessons] = useState<any[]>([]);
  const [hiddenLessonIds, setHiddenLessonIds] = useState<string[]>([]);
  const allLessons = useMemo(() => [...ALL_LESSONS, ...managedLessons.filter((lesson: any) => lesson.collectionId === "script-folder" && isValidVideoId(String(lesson.videoId || "")) && lesson.sourceType !== "original")].filter((lesson: any) => !hiddenLessonIds.includes(lesson.id)), [managedLessons, hiddenLessonIds]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/lessons").then((response) => response.ok ? response.json() : null).then((data) => {
      if (cancelled || !data) return;
      setHiddenLessonIds(Array.isArray(data.hiddenLessonIds) ? data.hiddenLessonIds : []);
      if (!Array.isArray(data.lessons)) return;
      const rows = data.lessons.filter((row: any) => row.lessonType === "both" || row.lessonType === "dictation");
      setManagedLessons(rows.map((row: any, index: number) => {
        const lines = String(row.koreanText || "").split(/\r?\n/).filter(Boolean);
        const translations = String(row.vietnameseText || "").split(/\r?\n/);
        const level = Number(String(row.level || "").match(/\d+/)?.[0]) || 1;
        return { id: row.id, lessonNum: index + 1, title: row.title, topikLevel: level, topikName: row.level || `TOPIK ${level}`, durationSec: lines.length * 5, segmentCount: lines.length, collectionId: "admin-custom", sourceType: "original", sourceLabel: row.description || "Bài học do trung tâm biên soạn", sourceUrl: row.sourceUrl, segments: lines.map((text: string, lineIndex: number) => ({ id: lineIndex + 1, start: lineIndex * 5, end: (lineIndex + 1) * 5, text, translation: translations[lineIndex] || "" })) };
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const seekTargetStartRef = useRef<number | null>(null);
  const seekTargetEndRef = useRef<number | null>(null);
  const isSeekingRef = useRef<boolean>(false);
  const seekTimeRef = useRef<number>(0);
  const ttsRunIdRef = useRef(0);
  const ttsGapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedModeRef = useRef(false);

  const cancelTtsPlayback = useCallback(() => {
    ttsRunIdRef.current += 1;
    if (ttsGapTimerRef.current) clearTimeout(ttsGapTimerRef.current);
    ttsGapTimerRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsPlayingFull(false);
  }, []);

  useEffect(() => () => {
    ttsRunIdRef.current += 1;
    if (ttsGapTimerRef.current) clearTimeout(ttsGapTimerRef.current);
    if (guidedAdvanceTimerRef.current) clearTimeout(guidedAdvanceTimerRef.current);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  // Filter lessons by level & TOPIK
  const filteredLessons = useMemo(() => {
    let lessons: any[] = allLessons;

    // Filter by beginner (TOPIK 1-2) or experienced (TOPIK 3-6)
    if (selectedUserLevel === "beginner") {
      lessons = lessons.filter((l: any) => l.topikLevel <= 2);
    } else if (selectedUserLevel === "experienced") {
      lessons = lessons.filter((l: any) => l.topikLevel >= 3);
    }

    // Filter by specific TOPIK level tab
    if (selectedTopik !== "all") {
      const level = parseInt(selectedTopik, 10);
      if (!isNaN(level)) {
        lessons = lessons.filter((l: any) => l.topikLevel === level);
      }
    }

    lessons = lessons.filter((lesson: any) => matchesLessonTopic(lesson.title, selectedHashtag));

    return lessons;
  }, [selectedUserLevel, selectedTopik, selectedHashtag, allLessons]);

  // Filter Course Sections by selected level
  const filteredCourseSections = useMemo(() => {
    return RAW_COURSE_SECTIONS.map((section) => ({
      ...section,
      lessons: filteredLessons.filter((lesson: any) => section.catalogGroupId
        ? getScriptLessonGroupId(lesson) === section.catalogGroupId
        : section.collectionId ? lesson.collectionId === section.collectionId : lesson.videoId === section.videoId),
      totalLessons: filteredLessons.filter((lesson: any) => section.catalogGroupId
        ? getScriptLessonGroupId(lesson) === section.catalogGroupId
        : section.collectionId ? lesson.collectionId === section.collectionId : lesson.videoId === section.videoId).length,
    })).filter((section) => section.lessons.length > 0);
  }, [filteredLessons]);

  // Safe access to current lesson and segment by selectedLessonId
  const currentLesson = useMemo(() => {
    return allLessons.find((l: any) => l.id === selectedLessonId) || allLessons[0];
  }, [selectedLessonId, allLessons]);

  const currentSub = currentLesson?.segments?.[currentSubIndex] || currentLesson?.segments?.[0] || null;
  const isFreeVideoDictation = currentLesson?.freeDictation === true;
  const currentTranslation = translationLanguage === "vi" ? currentSub?.translation : translationLanguage === "en" ? currentSub?.translationEn : undefined;

  useEffect(() => {
    let cancelled = false;
    setGeneratedTranslation("");
    setTranslationError("");
    if (!currentSub?.text || currentTranslation?.trim()) {
      setTranslationLoading(false);
      return;
    }

    const cacheKey = `haechivn-translation:${translationLanguage}:${currentSub.text}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        setGeneratedTranslation(cached);
        setTranslationLoading(false);
        return;
      }
    } catch { /* Translation still works when browser storage is unavailable. */ }

    setTranslationLoading(true);
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "ko");
    url.searchParams.set("tl", translationLanguage);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", currentSub.text);
    void fetch(url.toString()).then(async (response) => {
      if (!response.ok) throw new Error("Dịch vụ dịch đang bận. Hãy thử lại sau.");
      const payload = await response.json() as unknown;
      const chunks = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
      const translation = chunks.map((chunk) => Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "").join("").trim();
      if (!translation) throw new Error("Chưa lấy được nghĩa cho câu này.");
      if (cancelled) return;
      setGeneratedTranslation(translation);
      try { window.localStorage.setItem(cacheKey, translation); } catch { /* Ignore full/private storage. */ }
    }).catch((error: unknown) => {
      if (!cancelled) setTranslationError(error instanceof Error ? error.message : "Không dịch được câu này.");
    }).finally(() => {
      if (!cancelled) setTranslationLoading(false);
    });

    return () => { cancelled = true; };
  }, [currentSub?.id, currentSub?.text, currentTranslation, translationLanguage]);

  const displayedTranslation = currentTranslation?.trim() || generatedTranslation;

  useEffect(() => {
    setShowEmbeddedSubtitles(false);
  }, [selectedLessonId]);

  // Memoize targetWords based on currentSub
  const targetWords = useMemo(() => {
    if (!currentSub) return [];
    return cleanText(currentSub.text).split(/\s+/).filter(Boolean);
  }, [currentSub]);

  // Reveal tiles should always show a meaning, including inflected words and
  // words absent from the hand-written glossary. Fetch only requested hints.
  useEffect(() => {
    let cancelled = false;
    const revealedWords = [...new Set(revealedWordIndices.map((index) => targetWords[index]).filter(Boolean))];
    const missingWords = revealedWords.filter((word) => {
      const wordKey = cleanText(word);
      return !KOREAN_WORD_GLOSSARY[wordKey]?.[translationLanguage]
        && !generatedWordGlosses[`${translationLanguage}:${wordKey}`];
    });
    if (!missingWords.length) return;

    for (const word of missingWords) {
      const wordKey = cleanText(word);
      setGeneratedWordGlosses((previous) => ({ ...previous, [`${translationLanguage}:${wordKey}`]: "Đang tải nghĩa…" }));
    }

    void Promise.all(missingWords.map(async (word) => {
      const wordKey = cleanText(word);
      const stateKey = `${translationLanguage}:${wordKey}`;
      const cacheKey = `haechivn-word-translation:${stateKey}`;
      try {
        const cached = window.localStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) setGeneratedWordGlosses((previous) => ({ ...previous, [stateKey]: cached }));
          return;
        }

        const url = new URL("https://translate.googleapis.com/translate_a/single");
        url.searchParams.set("client", "gtx");
        url.searchParams.set("sl", "ko");
        url.searchParams.set("tl", translationLanguage);
        url.searchParams.set("dt", "t");
        url.searchParams.set("q", wordKey);
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Translation request failed");
        const payload = await response.json() as unknown;
        const chunks = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
        const meaning = chunks.map((chunk) => Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "").join("").trim();
        if (!meaning) throw new Error("Empty translation");
        if (cancelled) return;
        setGeneratedWordGlosses((previous) => ({ ...previous, [stateKey]: meaning }));
        try { window.localStorage.setItem(cacheKey, meaning); } catch { /* Ignore unavailable storage. */ }
      } catch {
        if (!cancelled) setGeneratedWordGlosses((previous) => ({ ...previous, [stateKey]: "Chưa tải được nghĩa" }));
      }
    }));

    return () => { cancelled = true; };
  }, [revealedWordIndices, targetWords, translationLanguage]);

  // YouTube API Init
  useEffect(() => {
    if (viewMode !== "workspace" || !currentLesson) return;

    if (currentLesson.sourceType === "original" && !currentLesson.videoId) {
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = null; playerReadyRef.current = false; setYtError(null);
      return;
    }
    const videoId = currentLesson.videoId || DEFAULT_VIDEO_ID;
    if (!isValidVideoId(videoId)) {
      setYtError("Video ID không hợp lệ.");
      return;
    }

    const startSec = currentSub?.start || currentLesson?.startSec || 0;

    let cancelled = false;
    void loadYouTubeIframeApi()
      .then(() => { if (!cancelled) initYTPlayer(videoId, startSec); })
      .catch(() => { if (!cancelled) setYtError("Không thể tải YouTube Player. Kiểm tra kết nối mạng hoặc thử phát âm bằng nút phát lại câu."); });

    return () => {
      cancelled = true;
      playerReadyRef.current = false;
      isSeekingRef.current = false;
      seekTargetStartRef.current = null;
      seekTargetEndRef.current = null;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try { playerRef.current.destroy(); } catch (_e) { /* ignore */ }
      }
      playerRef.current = null;
    };
  }, [viewMode, selectedLessonId]);

  // Continuous YouTube Player Monitor: auto-pause at script/segment end for ALL playback triggers
  useEffect(() => {
    if (viewMode !== "workspace") return;

    const interval = setInterval(() => {
      if (!playerRef.current || !playerReadyRef.current || typeof playerRef.current.getCurrentTime !== "function") {
        return;
      }

      try {
        const playerState = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
        if (playerState !== 1 && playerState !== 3) return;

        const currentTime = playerRef.current.getCurrentTime();

        const targetStart = seekTargetStartRef.current !== null ? seekTargetStartRef.current : (currentSub ? currentSub.start : 0);
        const targetEnd = seekTargetEndRef.current !== null ? seekTargetEndRef.current : (currentSub ? currentSub.end : (currentLesson ? currentLesson.endSec : 999999));

        if (isSeekingRef.current) {
          const timeSinceSeek = Date.now() - seekTimeRef.current;
          const diff = Math.abs(currentTime - targetStart);

          if (diff < 2.0 || timeSinceSeek > 2500) {
            isSeekingRef.current = false;
          }
        } else {
          if (currentTime >= targetEnd) {
            pausePlayer();
            seekTargetStartRef.current = null;
            seekTargetEndRef.current = null;
            if (guidedModeRef.current) setGuidedWaiting(true);
          }
        }
      } catch (_e) {
        /* ignore transient player errors */
      }
    }, 50);

    return () => clearInterval(interval);
  }, [viewMode, currentSub, currentLesson]);

  const initYTPlayer = (videoId: string, startSec: number = 0) => {
    if (playerRef.current && typeof playerRef.current.destroy === "function") {
      try { playerRef.current.destroy(); } catch (_e) { /* ignore */ }
    }
    playerRef.current = null;
    playerReadyRef.current = false;
    isSeekingRef.current = false;
    seekTargetStartRef.current = null;
    seekTargetEndRef.current = null;
    setYtError(null);

    const initialStart = Math.floor(startSec);

    try {
      playerRef.current = new (window as any).YT.Player("yt-dictation-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
          start: initialStart,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            if (startSec > 0 && playerRef.current && typeof playerRef.current.seekTo === "function") {
              try {
                playerRef.current.seekTo(startSec, true);
              } catch (_e) {}
            }
          },
          onError: (e: any) => {
            setYtError(`YouTube Player Error: ${e.data}`);
          },
        },
      });
    } catch (e) {
      console.error("YouTube Player Init error:", e);
      setYtError("Không thể khởi tạo YouTube Player.");
    }
  };

  const isPlayerReady = (): boolean => {
    return !!(playerRef.current && playerReadyRef.current && typeof playerRef.current.seekTo === "function");
  };

  const pausePlayer = () => {
    if (isPlayerReady()) {
      try { playerRef.current.pauseVideo(); } catch (_e) { /* ignore */ }
    }
  };

  const stopGuidedPlayback = () => {
    guidedModeRef.current = false;
    if (guidedAdvanceTimerRef.current) clearTimeout(guidedAdvanceTimerRef.current);
    guidedAdvanceTimerRef.current = null;
    setIsGuidedPlayback(false);
    setGuidedWaiting(false);
    cancelTtsPlayback();
    pausePlayer();
  };

  // Play a specific segment and automatically pause at sub.end
  const playSegment = useCallback((sub: any, onEnded?: () => void) => {
    if (!sub) return;
    cancelTtsPlayback();

    if (isPlayerReady()) {
      try {
        seekTargetStartRef.current = sub.start;
        seekTargetEndRef.current = sub.end;
        isSeekingRef.current = true;
        seekTimeRef.current = Date.now();

        playerRef.current.setPlaybackRate(playbackSpeed);
        playerRef.current.seekTo(sub.start, true);
        playerRef.current.playVideo();
      } catch (e) {
        console.error("playSegment error:", e);
        if (currentLesson?.sourceType === "original" && !currentLesson?.videoId) playTTSFallback(sub.text, onEnded);
        else setYtError("Không thể phát câu này trong video. Hãy thử tải lại video rồi phát lại.");
      }
    } else {
      if (currentLesson?.sourceType === "original" && !currentLesson?.videoId) playTTSFallback(sub.text, onEnded);
      else setYtError("Video đang tải. Hãy đợi video sẵn sàng rồi phát lại câu.");
    }
  }, [playbackSpeed, cancelTtsPlayback, currentLesson]);

  const playTTSFallback = (text: string, onEnded?: () => void) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = playbackSpeed;
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.startsWith("ko"));
      if (koVoice) utterance.voice = koVoice;
      if (onEnded) utterance.onend = onEnded;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playFullLesson = () => {
    if (!currentLesson) return;
    if (currentLesson.sourceType === "original" && !currentLesson.videoId) {
      if (!("speechSynthesis" in window)) return;
      if (isPlayingFull) { cancelTtsPlayback(); return; }
      const runId = ++ttsRunIdRef.current;
      if (ttsGapTimerRef.current) clearTimeout(ttsGapTimerRef.current);
      window.speechSynthesis.cancel();
      setIsPlayingFull(true);
      const speakAt = (index: number) => {
        if (runId !== ttsRunIdRef.current) return;
        if (index >= currentLesson.segments.length) { setIsPlayingFull(false); ttsGapTimerRef.current = null; return; }
        const segment = currentLesson.segments[index];
        setCurrentSubIndex(index);
        const utterance = new SpeechSynthesisUtterance(segment.text);
        utterance.lang = "ko-KR"; utterance.rate = playbackSpeed;
        const koVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko"));
        if (koVoice) utterance.voice = koVoice;
        utterance.onend = () => {
          if (runId !== ttsRunIdRef.current) return;
          // Leave a clear pause between sentences and keep the transcript aligned with the spoken line.
          ttsGapTimerRef.current = setTimeout(() => speakAt(index + 1), 700);
        };
        utterance.onerror = () => { if (runId === ttsRunIdRef.current) setIsPlayingFull(false); };
        window.speechSynthesis.speak(utterance);
      };
      speakAt(0);
      return;
    }
    cancelTtsPlayback();
    if (!isPlayerReady()) {
      setYtError("Video đang tải. Hãy thử lại sau ít giây.");
      return;
    }

    try {
      seekTargetStartRef.current = currentLesson.startSec;
      seekTargetEndRef.current = currentLesson.endSec;
      isSeekingRef.current = true;
      seekTimeRef.current = Date.now();

      playerRef.current.setPlaybackRate(playbackSpeed);
      playerRef.current.seekTo(currentLesson.startSec, true);
      playerRef.current.playVideo();
    } catch (e) {
      console.error("playFullLesson error:", e);
    }
  };

  const startGuidedPlayback = () => {
    if (!currentLesson || !currentSub) return;
    if (guidedModeRef.current) { stopGuidedPlayback(); return; }
    cancelTtsPlayback();
    guidedModeRef.current = true;
    setIsGuidedPlayback(true);
    setGuidedWaiting(false);
    setDictationInput("");
    setRevealedWordIndices([]);
    setIsSubmitted(false);
    setScore(null);
    playSegment(currentSub, () => { if (guidedModeRef.current) setGuidedWaiting(true); });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (viewMode !== "workspace") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.target instanceof HTMLTextAreaElement && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isSubmitted) handleCheckAnswer();
        return;
      }
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(e.target.tagName))) return;

      // Replay current sentence: Ctrl + ` (Backquote)
      if (e.ctrlKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        playSegment(currentSub, guidedModeRef.current ? () => { if (guidedModeRef.current) setGuidedWaiting(true); } : undefined);
      } else if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (!guidedModeRef.current) handleNextSub();
      } else if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (!guidedModeRef.current) handlePrevSub();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, currentSub, dictationInput, isSubmitted, currentSubIndex, selectedLessonId, playSegment]);

  // Normalize and clean Korean text for comparison
  function cleanText(str: string): string {
    return normalizeKoreanText(str);
  }

  // Character-level similarity comparison
  function calculateSimilarity(target: string, input: string): number {
    return calculateKoreanSimilarity(target, input);
  }

  const handleCheckAnswer = () => {
    if (!dictationInput.trim() || !currentSub) return;

    if (isFreeVideoDictation) {
      setScore(null);
      setIsSubmitted(true);
      if (!completedSubIds.includes(currentSub.id)) {
        const nextCompleted = [...completedSubIds, currentSub.id];
        setCompletedSubIds(nextCompleted);
        saveLessonProgress("dictation", selectedLessonId, nextCompleted);
      }
      return;
    }

    const matchScore = calculateSimilarity(currentSub.text, dictationInput);
    const hintPenalty = targetWords.length
      ? Math.round((revealedWordIndices.length / targetWords.length) * 100)
      : 0;
    const calcScore = Math.max(0, matchScore - hintPenalty);
    setScore(calcScore);
    setIsSubmitted(true);

    if (guidedModeRef.current && currentLesson) {
      setGuidedWaiting(false);
      if (guidedAdvanceTimerRef.current) clearTimeout(guidedAdvanceTimerRef.current);
      guidedAdvanceTimerRef.current = setTimeout(() => {
        guidedAdvanceTimerRef.current = null;
        if (!guidedModeRef.current) return;
        const nextIndex = currentSubIndex + 1;
        if (nextIndex >= currentLesson.segments.length) { stopGuidedPlayback(); return; }
        const nextSegment = currentLesson.segments[nextIndex];
        setCurrentSubIndex(nextIndex);
        setDictationInput("");
        setRevealedWordIndices([]);
        setIsSubmitted(false);
        setScore(null);
        playSegment(nextSegment, () => { if (guidedModeRef.current) setGuidedWaiting(true); });
      }, 1100);
    }

    if (calcScore >= 70) {
      if (!completedSubIds.includes(currentSub.id)) {
        const nextCompleted = [...completedSubIds, currentSub.id];
        setCompletedSubIds(nextCompleted);
        saveLessonProgress("dictation", selectedLessonId, nextCompleted);
        const realDuration = Math.round((Date.now() - sessionStartTime) / 1000);
        const xpEarned = Math.min(20, Math.round(calcScore / 10));
        ApiClient.recordStudySession("dictation", 1, 1, xpEarned, Math.min(realDuration, 300));
      }
    }
  };

  const handleSelectSub = (subIdx: number) => {
    if (guidedModeRef.current) stopGuidedPlayback();
    cancelTtsPlayback();
    pausePlayer();
    setCurrentSubIndex(subIdx);
    setDictationInput("");
    setRevealedWordIndices([]);
    setIsSubmitted(false);
    setScore(null);
    setSessionStartTime(Date.now());

    const sub = currentLesson?.segments?.[subIdx];
    if (sub) {
      setTimeout(() => playSegment(sub), 100);
    }
  };

  const handleNextSub = () => {
    if (!currentLesson) return;
    pausePlayer();

    if (currentSubIndex < currentLesson.segments.length - 1) {
      handleSelectSub(currentSubIndex + 1);
    } else {
      const currentIdx = allLessons.findIndex((l: any) => l.id === selectedLessonId);
      if (currentIdx >= 0 && currentIdx < allLessons.length - 1) {
        openLessonWorkspace(allLessons[currentIdx + 1]);
      }
    }
  };

  const handlePrevSub = () => {
    if (currentSubIndex > 0) {
      handleSelectSub(currentSubIndex - 1);
    }
  };

  const toggleRevealWord = (wIdx: number) => {
    if (revealedWordIndices.includes(wIdx)) {
      setRevealedWordIndices(revealedWordIndices.filter(i => i !== wIdx));
    } else {
      setRevealedWordIndices([...revealedWordIndices, wIdx]);
    }
  };

  const revealAllWords = () => {
    setRevealedWordIndices(targetWords.map((_, idx) => idx));
  };

  const openLessonWorkspace = (lesson: any) => {
    if (!lesson) return;
    if (guidedModeRef.current) stopGuidedPlayback();
    cancelTtsPlayback();
    setSelectedLessonId(lesson.id);
    setCurrentSubIndex(0);
    setDictationInput("");
    setRevealedWordIndices([]);
    setIsSubmitted(false);
    setScore(null);
    setCompletedSubIds(loadLessonProgress("dictation", lesson.id));
    setSessionStartTime(Date.now());
    setYtError(null);
    setViewMode("workspace");
  };

  const backToCatalog = () => {
    if (guidedModeRef.current) stopGuidedPlayback();
    cancelTtsPlayback();
    pausePlayer();
    setViewMode("catalog");
    setSelectedTopik("all");
  };

  // Helper for Topik Level Badge styling
  const getTopikBadgeColor = (level: number) => {
    switch (level) {
      case 1: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case 2: return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case 3: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case 4: return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      case 5: return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case 6: return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      default: return "bg-slate-800 text-slate-300";
    }
  };

  const getTopikLevelName = (level: number) => {
    return `TOPIK ${level}`;
  };

  // ================= VIEW 1: CATALOG LANDING PAGE =================
  if (viewMode === "catalog") {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 w-full max-w-[1800px] mx-auto text-slate-100 px-2 sm:px-4">
        <div className="flex justify-end"><TranslationLanguageSetup language={translationLanguage} onChange={setTranslationLanguage} /></div>

        {/* Banner 1: Header Explanation */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Giải thích Phương pháp Nghe chép chính tả
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Khám phá cách <span className="text-purple-400 font-bold">hiệu quả nhất</span> để học và tinh chỉnh <span className="text-sky-400 font-bold">kỹ năng nghe tiếng Hàn thực tế</span>
          </p>
        </div>

        {/* Banner 2: Level Selection Big Cards (Interactive Level Filtering) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedUserLevel(prev => prev === "beginner" ? "all" : "beginner")}
            className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${
              selectedUserLevel === "beginner"
                ? "bg-purple-950/80 border-purple-500 shadow-xl shadow-purple-900/40 ring-2 ring-purple-500/50 scale-[1.02]"
                : "bg-slate-950/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 opacity-80"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Dành cho người mới bắt đầu (TOPIK 1 - 2)</h3>
              {selectedUserLevel === "beginner" && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-black">Đang chọn</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Tập trung vào phát âm cơ bản và luyện nghe từng từ, câu đơn giản</p>
          </button>

          <button
            onClick={() => setSelectedUserLevel(prev => prev === "experienced" ? "all" : "experienced")}
            className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${
              selectedUserLevel === "experienced"
                ? "bg-purple-950/80 border-purple-500 shadow-xl shadow-purple-900/40 ring-2 ring-purple-500/50 scale-[1.02]"
                : "bg-slate-950/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 opacity-80"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-sm font-bold text-purple-400">Dành cho người đã có kinh nghiệm (TOPIK 3 - 6)</h3>
              {selectedUserLevel === "experienced" && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-black">Đang chọn</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Nâng cao kỹ năng với tốc độ nói thực tế và các chủ đề phức tạp hơn</p>
          </button>
        </div>

        {/* Level filter status bar if active */}
        {selectedUserLevel !== "all" && (
          <div className="flex items-center justify-between bg-purple-950/40 border border-purple-500/30 p-3 rounded-2xl max-w-4xl mx-auto text-xs text-purple-300">
            <span>
              Đang lọc bài học cho: <strong>{selectedUserLevel === "beginner" ? "Người mới bắt đầu (TOPIK 1 - 2)" : "Người có kinh nghiệm (TOPIK 3 - 6)"}</strong>
            </span>
            <button
              onClick={() => setSelectedUserLevel("all")}
              className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px]"
            >
              Xem tất cả bài học
            </button>
          </div>
        )}

        {/* Section 3: Topic Hashtags List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Chọn chủ đề để lọc các đoạn hội thoại trong khóa học
          </h3>
          <div className="flex flex-wrap gap-2">
            {KOREAN_LESSON_TOPICS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedHashtag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                  selectedHashtag === tag
                    ? "bg-sky-500 text-white shadow-md shadow-sky-900/40"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {filteredLessons.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400">
            Không có bài học phù hợp với bộ lọc này. Hãy chọn chủ đề khác.
          </div>
        )}

        {/* Section 4: Course Video Cards Sections Grid */}
        {filteredCourseSections.map((sec) => {
          const isSectionExpanded = expandedSectionIds.includes(sec.id);
          return (
          <section key={sec.id} className="space-y-4 pt-2">
            {/* Section Header Bar */}
            <div className="flex items-center justify-between border-l-4 border-purple-500 pl-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white">{sec.icon ? `${sec.icon} ` : ""}{sec.title}</h2>
                  <span className="text-xs text-slate-400 font-bold font-mono">({sec.totalLessons} bài học)</span>
                </div>
                {sec.description && <p className="mt-1 text-xs text-slate-400">{sec.description}</p>}
              </div>

              {sec.sourceUrl && <a href={sec.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-300 hover:text-white underline underline-offset-4">Nguồn xem thêm: {sec.sourceLabel} ↗</a>}

              <button
                onClick={() => setExpandedSectionIds((ids) => isSectionExpanded ? ids.filter((id) => id !== sec.id) : [...ids, sec.id])}
                className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1"
                aria-label={isSectionExpanded ? "Thu gọn bài học" : "Xem tất cả bài học"}
              >
                <span>{isSectionExpanded ? "THU GỌN" : "XEM TẤT CẢ"}</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Video Cards 4-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(isSectionExpanded ? sec.lessons : sec.lessons.slice(0, 4)).map((lesson: any) => {
                const levelTag = getTopikLevelName(lesson.topikLevel);
                const badgeColor = getTopikBadgeColor(lesson.topikLevel);

                return (
                  <div
                    key={`${sec.id}-${lesson.id}`}
                    onClick={() => openLessonWorkspace(lesson)}
                    className="group bg-slate-900 border border-slate-800 hover:border-purple-500 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-purple-900/20 flex flex-col justify-between"
                  >
                    {/* Card Thumbnail Area */}
                    <div className="relative w-full pt-[56.25%] bg-slate-950 overflow-hidden">
                      {lesson.videoId ? <img
                        src={`https://img.youtube.com/vi/${lesson.videoId}/hqdefault.jpg`}
                        alt={`Thumbnail: ${lesson.title}`}
                        className="absolute top-0 left-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                        loading="lazy"
                      /> : <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-950 via-slate-900 to-indigo-950 text-center p-4"><span className="text-4xl">{lesson.collectionId === "original-blackpink" ? "💖" : "🎬"}</span><span className="mt-2 text-xs font-black text-white">대화 연습 · 한국어</span><span className="text-[10px] text-slate-300">HaechiVN 창작 대화</span></div>}

                      {/* Top Badges overlay */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-slate-300 text-[10px] font-bold font-mono">
                            Tập {lesson.lessonNum}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-md border font-mono text-xs font-black backdrop-blur-md shadow-md ${badgeColor}`}>
                          {levelTag}
                        </span>
                      </div>

                      {/* Bottom Duration & Youtube Badge overlay */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                          {lesson.videoId ? "▶ Video" : "🔊 Giọng đọc tiếng Hàn"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-slate-300 text-[10px] font-mono font-bold">
                          ▶ Video {Math.round(lesson.durationSec)}s
                        </span>
                      </div>
                    </div>

                    {/* Card Content & Title */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-purple-400 transition-colors line-clamp-2 leading-relaxed font-noto">
                        {lesson.title}
                      </h4>
                      {lesson.sourceTitle && <p className="text-[10px] leading-4 text-slate-500 line-clamp-2">Nguồn video: {lesson.sourceTitle}</p>}

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-400">Dictation</span>
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black font-mono">
                          {lesson.segmentCount} câu · script {lesson.scriptDurationSec}s
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );})}

      </div>
    );
  }

  // ================= GUARD: No lesson data =================
  if (!currentLesson || !currentSub) {
    return (
      <div className="card-duo p-12 text-center max-w-xl mx-auto my-12 space-y-4 animate-fadeIn">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto" />
        <h2 className="text-xl font-black text-white">Không tìm thấy bài học</h2>
        <p className="text-xs text-slate-400">Bộ lọc hiện tại không có bài học nào phù hợp. Hãy thử chọn cấp độ TOPIK khác.</p>
        <button onClick={backToCatalog} className="btn-duo btn-duo-primary px-6 py-2.5 text-xs">Quay Về Danh Sách</button>
      </div>
    );
  }

  // ================= VIEW 2: 3-COLUMN DICTATION WORKSPACE =================
  return (
    <div className="space-y-4 animate-fadeIn pb-24 w-full max-w-[1800px] mx-auto text-slate-100 px-2 sm:px-4">

      {/* Top Header Bar with Back Button */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
        <button
          onClick={backToCatalog}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all"
          aria-label="Quay lại danh sách bài học"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Quay lại Danh Sách Bài Học (Catalog)</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Bài đang học:</span>
          <span className="text-xs font-black text-purple-400 font-noto">{currentLesson.title}</span>
        </div>
        <TranslationLanguageSetup language={translationLanguage} onChange={setTranslationLanguage} />
      </div>

      {/* YouTube Error Toast */}
      {ytError && (
        <div className="p-3.5 bg-rose-500/20 border border-rose-500 rounded-2xl text-xs text-rose-300 font-bold flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          <span>{ytError}</span>
        </div>
      )}

      {/* Keyboard Shortcut Banner */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <Keyboard className="w-4 h-4" aria-hidden="true" />
          <span>Hướng dẫn phím tắt:</span>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-slate-300">
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Ctrl + `</kbd>: <strong>Phát lại câu (Replay)</strong></span>
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Ctrl + →</kbd>: <strong>Qua câu mới</strong></span>
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Ctrl + ←</kbd>: <strong>Quay lui câu trước</strong></span>
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Enter</kbd>: <strong>Kiểm tra câu gõ</strong></span>
        </div>
      </div>

      {/* Main Spacious Dashboard Layout (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT COLUMN: LESSONS MENU & TOPIK FILTER (Col 1-3) */}
        <aside className="order-2 lg:order-1 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 max-h-[420px] lg:max-h-[820px] overflow-y-auto shadow-lg">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Headphones className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span>DANH MỤC BÀI HỌC</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{filteredLessons.length} Bài học ngắn (1-2 phút)</p>
          </div>

          {/* TOPIK Filter List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">🎯 CẤP ĐỘ TOPIK:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {["all", "1", "2", "3", "4", "5", "6"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedTopik(lvl);
                    setCurrentSubIndex(0);
                    const nextLesson = allLessons.find((lesson: any) => lvl === "all" || lesson.topikLevel === Number(lvl));
                    if (nextLesson) {
                      setSelectedLessonId(nextLesson.id);
                      setCompletedSubIds(loadLessonProgress("dictation", nextLesson.id));
                    }
                    setDictationInput("");
                    setRevealedWordIndices([]);
                    setIsSubmitted(false);
                    setScore(null);
                    setCompletedSubIds([]);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                    selectedTopik === lvl
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                      : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {lvl === "all" ? `Tất Cả (${allLessons.length} Bài)` : `TOPIK ${lvl}`}
                </button>
              ))}
            </div>
          </div>

          {/* Lessons Cards List */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">🎬 DANH SÁCH BÀI HỌC:</span>
            {filteredLessons.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3">Không có bài học nào cho cấp độ này.</p>
            )}
            {filteredLessons.map((l: any) => {
              const isSelected = l.id === selectedLessonId;
              return (
                <button
                  key={`lesson-${l.id}`}
                  onClick={() => openLessonWorkspace(l)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${
                    isSelected
                      ? "bg-purple-600/20 border-purple-500 text-white font-bold shadow-md shadow-purple-900/30"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-400 font-extrabold font-mono">BÀI #{l.lessonNum}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[11px]">{l.topikName}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{l.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{l.freeDictation ? "🎬 Video gốc · chép tự do" : l.sourceType === "video" ? `▶ Video ${Math.round(l.durationSec)}s · script ${l.segmentCount} câu / ${l.scriptDurationSec}s` : `⏱️ ${Math.round(l.durationSec)}s • ${l.segmentCount} câu`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: MAIN WORKSPACE (Col 4-9) */}
        <main className="order-1 min-w-0 lg:order-2 lg:col-span-6 space-y-5">

          {/* Top Video Player Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-extrabold text-white text-base font-noto">{currentLesson.title}</h2>
                <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 font-bold text-xs">{currentLesson.topikName}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{isFreeVideoDictation ? "🎬 Video gốc · chép tự do" : currentLesson.sourceType === "video" ? `▶ Video ${Math.round(currentLesson.durationSec)} giây · script ${currentLesson.segments.length} câu / ${currentLesson.scriptDurationSec} giây` : `⏱️ ${Math.round(currentLesson.durationSec)} giây (${currentLesson.segments.length} câu)`}</span>
            </div>

            {/* Video Player */}
            <div className={`relative w-full ${currentLesson.sourceType === "original" && !currentLesson.videoId ? "min-h-40" : "pt-[56.25%]"} bg-black rounded-xl overflow-hidden border border-slate-800 shadow-md`}>
              {currentLesson.sourceType === "original" && !currentLesson.videoId ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-950 to-slate-950 p-4 text-center"><span className="text-3xl">🎧</span><p className="text-sm font-bold text-white">Nghe câu tiếng Hàn qua giọng đọc trên thiết bị rồi chép lại</p><p className="text-xs text-slate-300">{currentLesson.sourceLabel}</p><a href={currentLesson.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-300 underline underline-offset-4">Mở nguồn tham khảo bên ngoài · không khớp lời luyện ↗</a></div> : <><div id="yt-dictation-player" className="absolute inset-0 h-full w-full"></div>{currentLesson.videoId && !isFreeVideoDictation && !showEmbeddedSubtitles && <div aria-hidden="true" className="absolute left-[5%] right-[5%] bottom-[6%] z-20 h-[18%] rounded-md bg-black pointer-events-none" />}</>}
            </div>

            {/* Control Buttons & Speed bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={playFullLesson}
                  className={`py-2.5 px-5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${isPlayingFull ? "bg-rose-700 hover:bg-rose-600 shadow-rose-900/40" : "bg-purple-600 hover:bg-purple-500 shadow-purple-900/40"}`}
                  aria-label={isPlayingFull ? "Dừng phát toàn bộ bài học" : "Phát toàn bộ bài học"}
                >
                  {isPlayingFull ? <Square className="w-4 h-4 fill-white" aria-hidden="true" /> : <Play className="w-4 h-4 fill-white" aria-hidden="true" />}
                  <span>{isFreeVideoDictation ? "PHÁT VIDEO GỐC" : isPlayingFull ? "DỪNG NGHE" : "NGHE CẢ BÀI LIÊN TỤC"}</span>
                </button>

                {!isFreeVideoDictation && <button
                  onClick={startGuidedPlayback}
                  className={`py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${isGuidedPlayback ? "bg-rose-700 hover:bg-rose-600 shadow-rose-900/40" : "bg-emerald-700 hover:bg-emerald-600 shadow-emerald-900/30"}`}
                  aria-label={isGuidedPlayback ? "Dừng luyện từng câu" : "Bắt đầu luyện từng câu"}
                >
                  {isGuidedPlayback ? <Square className="w-4 h-4 fill-white" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
                  <span>{isGuidedPlayback ? "DỪNG LUYỆN" : "LUYỆN TỪNG CÂU"}</span>
                </button>}

                <button
                  onClick={() => playSegment(currentSub, guidedModeRef.current ? () => { if (guidedModeRef.current) setGuidedWaiting(true); } : undefined)}
                  className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
                  aria-label="Phát lại câu hiện tại"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>PHÁT LẠI CÂU</span>
                </button>

                {currentLesson.videoId && !isFreeVideoDictation && <button
                  type="button"
                  onClick={() => setShowEmbeddedSubtitles((visible) => !visible)}
                  aria-pressed={showEmbeddedSubtitles}
                  className={`py-2.5 px-4 rounded-xl border font-bold text-xs transition-colors ${showEmbeddedSubtitles ? "bg-amber-500/15 border-amber-400/40 text-amber-200" : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"}`}
                >
                  {showEmbeddedSubtitles ? "ẨN PHỤ ĐỀ GỐC" : "HIỆN PHỤ ĐỀ GỐC"}
                </button>}
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 px-1">Tốc độ:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(Math.min(2, Math.max(0.5, s)))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                      playbackSpeed === s
                        ? "bg-purple-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {isGuidedPlayback && <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-xs font-semibold ${guidedWaiting ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-sky-500/30 bg-sky-500/10 text-sky-200"}`}>
              {guidedWaiting ? `Đã phát xong câu #${currentSubIndex + 1}. Gõ câu trả lời rồi nhấn Enter để chấm và nghe câu kế tiếp.` : `Đang phát câu #${currentSubIndex + 1}. Sau khi nghe xong, hãy gõ lại câu và nhấn Enter.`}
            </div>}
          </div>

          {/* Dictation Input & Eye Reveal Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">

            {/* Input Label & Segment Prev/Next Navigation */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
              <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider">
                {isFreeVideoDictation ? "CHÉP LẠI LỜI THOẠI TRONG VIDEO GỐC:" : `GÕ NHỮNG GÌ BẠN NGHE ĐƯỢC (CÂU #${currentSubIndex + 1} / ${currentLesson.segments.length}):`}
              </label>

              <div className="flex items-center gap-2">
                <button onClick={handlePrevSub} disabled={currentSubIndex === 0 || isGuidedPlayback} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40" aria-label="Câu trước">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Câu trước
                </button>
                <button onClick={handleNextSub} disabled={isGuidedPlayback} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40" aria-label="Câu tiếp">
                  Câu tiếp <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Large Spacious Input Textarea */}
            <textarea
              rows={4}
              value={dictationInput}
              onChange={(e) => setDictationInput(e.target.value)}
              placeholder={isFreeVideoDictation ? "Xem video và chép lại câu tiếng Hàn bạn nghe được..." : "Gõ câu trả lời tiếng Hàn của bạn ở đây..."}
              disabled={isSubmitted}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-lg font-noto font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all leading-relaxed"
            />

            {/* Interactive Word Hint Boxes (Eye Reveal) */}
            {!isFreeVideoDictation && <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {targetWords.map((word, wIdx) => {
                  const isRevealed = revealedWordIndices.includes(wIdx);
                  const wordKey = cleanText(word);
                  const wordGloss = KOREAN_WORD_GLOSSARY[wordKey]?.[translationLanguage]
                    || generatedWordGlosses[`${translationLanguage}:${wordKey}`];
                  return (
                    <button
                      key={`word-${wIdx}`}
                      onClick={() => toggleRevealWord(wIdx)}
                      className={`px-3 py-2 rounded-xl border text-sm font-noto font-bold transition-all flex flex-col items-center gap-1 ${
                        isRevealed
                          ? "bg-purple-600/30 border-purple-500 text-sky-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-purple-500/50"
                      }`}
                      aria-label={isRevealed ? `Từ đã hiện: ${word}` : "Bấm để xem gợi ý"}
                    >
                      <Eye className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                      <span>{isRevealed ? word : "·".repeat(Math.max(word.length, 2))}</span>
                      {isRevealed && <span className="max-w-28 text-center text-[10px] font-medium leading-4 text-emerald-200">{wordGloss || "Đang tải nghĩa…"}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-amber-400 font-medium">
                Các từ được tiết lộ sẽ bị tính là lỗi và ảnh hưởng đến điểm số của bạn.
              </p>
            </div>}

            {currentSub?.text && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3" aria-live="polite">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Dịch nghĩa · {{ vi: "Tiếng Việt", en: "English", ja: "日本語" }[translationLanguage]}</p>
              {displayedTranslation
                ? <p className="mt-1 text-sm leading-6 text-slate-200">{displayedTranslation}</p>
                : translationLoading
                  ? <p className="mt-1 text-sm text-slate-400">Đang tải nghĩa câu…</p>
                  : <p className="mt-1 text-sm text-amber-300">{translationError || "Chưa có bản dịch cho câu này."}</p>}
            </div>}

            {/* Dictation Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {!isFreeVideoDictation && <button
                onClick={revealAllWords}
                className="py-3 px-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-400 font-bold text-xs hover:bg-amber-900/40 transition-all flex items-center justify-center gap-2"
                aria-label="Hiện tất cả từ"
              >
                <Eye className="w-4 h-4" aria-hidden="true" /> HIỆN TẤT CẢ TỪ
              </button>}

              {!isSubmitted ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!dictationInput.trim()}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50 shadow-lg shadow-purple-900/40 transition-all"
                >
                  {isFreeVideoDictation ? "LƯU BẢN CHÉP" : "KIỂM TRA CÂU GÕ (ENTER)"}
                </button>
              ) : (
                <button
                  onClick={handleNextSub}
                  className="py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-900/40 transition-all"
                >
                  TIẾP THEO &gt;
                </button>
              )}
            </div>

            {/* Feedback Score Panel */}
            {isSubmitted && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">{isFreeVideoDictation ? "BẢN CHÉP VIDEO GỐC:" : "KẾT QUẢ SO SÁNH:"}</span>
                  {!isFreeVideoDictation && <span className={(score || 0) >= 80 ? "text-emerald-400 text-sm font-extrabold" : (score || 0) >= 50 ? "text-amber-400 text-sm font-extrabold" : "text-rose-400 text-sm font-extrabold"}>{score}% Match</span>}
                </div>
                {!isFreeVideoDictation && <div className="p-3 bg-slate-900 rounded-lg text-sm font-noto font-bold text-white leading-relaxed">{currentSub.text}</div>}
                {/* Show user's answer for comparison */}
                <div className="p-3 bg-slate-900/50 rounded-lg text-sm font-noto text-slate-300 leading-relaxed border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">CÂU TRẢ LỜI CỦA BẠN:</span>
                  {dictationInput}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* RIGHT COLUMN: SUBTITLE TIMELINE LIST (BẢN CHÉP BÀI HỌC) (Col 10-12) */}
        <aside className="order-3 min-w-0 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[420px] lg:max-h-[820px] overflow-y-auto shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">BẢN CHÉP BÀI HỌC</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              {completedSubIds.length}/{currentLesson.segments.length}
            </span>
          </div>

          {isFreeVideoDictation ? <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm leading-6 text-slate-300">
            <p className="font-bold text-sky-300">Đang dùng video YouTube gốc</p>
            <p className="mt-2">Phát video, chép trực tiếp vào ô bên cạnh rồi lưu bản chép. Video không bị thay bằng giọng đọc TTS.</p>
            {currentLesson.sourceUrl && <a className="mt-3 inline-block text-sky-300 underline" href={currentLesson.sourceUrl} target="_blank" rel="noreferrer">Mở video trên YouTube ↗</a>}
          </div> : <div className="space-y-2.5">
            {currentLesson.segments.map((sub: any, subIdx: number) => {
              const isSelected = subIdx === currentSubIndex;
              const isDone = completedSubIds.includes(sub.id);
              const words = cleanText(sub.text).split(/\s+/).filter(Boolean);
              const masked = words.map(w => "·".repeat(Math.max(w.length, 2))).join(" ");

              let cardStyle = "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800";
              if (isDone) {
                cardStyle = isSelected
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/30"
                  : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400/90";
              } else if (isSelected) {
                cardStyle = "bg-purple-600/20 border-purple-500 text-slate-200 shadow-md shadow-purple-900/30";
              }

              return (
                <button
                  key={`sub-${sub.id}`}
                  onClick={() => handleSelectSub(subIdx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-mono font-bold ${isDone ? "text-emerald-400" : isSelected ? "text-purple-400" : "text-sky-400"}`}>
                      {currentLesson.sourceType === "original" ? `CÂU #${subIdx + 1}` : `#${subIdx + 1} (${Math.floor(sub.start / 60)}:${Math.floor(sub.start % 60).toString().padStart(2, '0')})`}
                    </span>
                    <span>{isDone ? "✅" : isSelected && isPlayingFull ? "🔊 ĐANG NGHE" : "⚠️"}</span>
                  </div>
                  <p className="text-xs font-noto font-bold line-clamp-2 leading-relaxed">
                    {isDone ? sub.text : masked}
                  </p>
                </button>
              );
            })}
          </div>}
        </aside>

      </div>
    </div>
  );
};


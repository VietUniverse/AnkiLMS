"""Fill missing Vietnamese meanings for PDF headwords and rebuild Explore courses.

Translations are cached so the input can be reviewed and corrected without
repeating remote requests. The small manual overrides resolve OCR errors in
the source PDF or ambiguous machine translations.
"""

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
MISSING = ROOT / "scripts" / "pdf-missing-naver.json"
CACHE = ROOT / "scripts" / "pdf-vi-translations.json"
TOPICS = DATA / "dictionary-topic-vocab.json"

OVERRIDES = {
    "머리 모양": "kiểu tóc",
    "스포츠머리": "kiểu tóc thể thao",
    "커트 머리": "tóc cắt ngắn",
    "머리가 상하다": "tóc bị hư tổn",
    "머리를 기르다": "nuôi tóc dài",
    "머리를 내리다": "thả tóc xuống",
    "머리를 넘기다": "vuốt tóc sang bên",
    "머리를 다듬다 (=손질하다)": "tỉa / chỉnh lại tóc (= chải chuốt)",
    "머리를 땋다": "tết tóc",
    "이사철": "mùa chuyển nhà",
    "전망이 좋다": "có tầm nhìn đẹp",
    "새집 증후군": "hội chứng nhà mới (khó chịu do chất ô nhiễm trong nhà mới)",
    "집을 보다": "đi xem nhà",
    "햇빛이 잘 들다": "đón nhiều ánh nắng",
    "화장실이 딸려 있다": "có nhà vệ sinh riêng",
    "수도세": "tiền nước",
    "환율 서명하다": "ký xác nhận giao dịch ngoại tệ",
    "카드를 만들다": "làm thẻ",
    "현금 자동 인출": "rút tiền mặt tự động (ATM)",
    "집중력을 항상시키다": "nâng cao khả năng tập trung",
    "수면에 영향을 미치 다": "ảnh hưởng đến giấc ngủ",
    "약물에 중독되다": "nghiện thuốc / chất gây nghiện",
    "투자 급등하다": "đầu tư tăng vọt",
    "경제관념이 없다": "không có ý thức quản lý tiền bạc",
    "경제적 이익이 발생하다": "phát sinh lợi ích kinh tế",
    "호황기를(→ 불황기) 맞다 화폐 가치가": "bước vào thời kỳ thịnh vượng (↔ suy thoái); giá trị đồng tiền…",
    "교권이 추락하다": "uy quyền của giáo viên suy giảm",
    "눈높이를 맞추다": "điều chỉnh cho phù hợp với tầm hiểu biết / mong đợi",
    "삼한사온": "quy luật ba ngày rét, bốn ngày ấm",
    "가을· 봄을 타다": "nhạy cảm với thời tiết mùa thu / mùa xuân",
    "황사 건조하다": "bụi vàng; khô hanh",
    "더위를(→추위) 타다": "chịu nóng (↔ chịu lạnh)",
    "부채질을 하다": "quạt bằng quạt tay",
    "더위를 먹다": "bị cảm nắng",
    "불우 이웃": "những người hàng xóm có hoàn cảnh khó khăn",
    "접촉 사고": "tai nạn va chạm",
    "사망하다/속다 (→속이다)": "tử vong / bị lừa (→ lừa người khác)",
    "병원으로 옮겨 지다": "được chuyển đến bệnh viện",
    "불이 번지 다": "đám cháy lan rộng",
    "차가 부서 지다": "xe bị hư hỏng",
    "차량 통행을 막다": "chặn xe cộ lưu thông",
    "내숭을 떨다": "giả vờ ngây thơ / làm bộ",
    "낭비가 심하다": "lãng phí quá mức",
    "입이 가볍다(<-> 싸다)": "hay tiết lộ chuyện riêng (↔ nói năng thô tục)",
    "정찰제": "niêm yết giá cố định",
    "바가지를 씌우다": "chặt chém, tính giá quá cao",
    "카드에 적립하다": "tích điểm vào thẻ",
    "기품이 있다": "có phong thái tao nhã",
    "깊은 소리를 자아내다": "tạo nên âm thanh trầm sâu",
    "당시의 생활 양식을 잘 보여 주다 독특하게": "thể hiện độc đáo lối sống thời bấy giờ",
    "서민 문화의 특징을 잘 보여 주다 섬세한": "thể hiện tinh tế đặc trưng văn hóa bình dân",
    "조상의 지혜를 엿볼 수 있다": "có thể thấy được trí tuệ của tổ tiên",
    "조화가 잘 되다": "hài hòa với nhau",
    "운동경기": "trận đấu thể thao",
    "운동부족": "thiếu vận động",
    "경기에 집중하다": "tập trung vào trận đấu",
    "이길 가능성이 크다": "có khả năng chiến thắng cao",
    "단추가 풀리다": "cúc áo bị tuột",
    "액세서리를 하다": "đeo phụ kiện",
    "인사를 건네다": "gửi lời chào",
    "잘 지내다": "sống khỏe / sống tốt",
    "잘 있다": "vẫn khỏe, vẫn ổn",
    "한 그릇": "một bát",
    "만족도가 높다": "mức độ hài lòng cao",
    "더위를 먹다": "bị cảm nắng",
    "귀족적": "mang tính quý tộc",
    "노골적으로 표현하다": "thể hiện một cách thẳng thừng",
    "그려지다": "được khắc họa",
    "조형미가 뛰어나다": "có vẻ đẹp tạo hình nổi bật",
    "잘하다-못하다": "làm tốt – làm không tốt",
    "운동경기": "thi đấu thể thao",
    "시켜 먹다": "gọi món để ăn",
    "계단을 오르다": "đi lên cầu thang",
    "와이파이": "Wi-Fi",
    "용량을 둘이다": "giảm dung lượng",
    "건강을 해치 가 발달하다": "gây hại cho sức khỏe; phát triển",
    "세균을 옮기다 다": "lây truyền vi khuẩn",
    "물 가가 상승하다 (→ 하락하다)": "giá cả tăng lên (↔ giảm xuống)",
    "소나 기가 내리다": "mưa rào đổ xuống",
    "계산기를 두르리다": "gõ máy tính",
    "다자인이 단순하다": "thiết kế đơn giản",
    "매달을 따다": "giành huy chương",
    "논밭이 물에 잠시다": "ruộng đồng bị ngập nước",
    "용량을 둘이다": "giảm dung lượng",
    "오래만": "lâu rồi mới gặp",
    "취적": "sở thích; thị hiếu",
    "지하철 역": "ga tàu điện ngầm",
    "환율이 상승하다": "tỷ giá hối đoái tăng",
    "화폐 가치가": "giá trị đồng tiền",
    "상승하다 (→ 떨어 지다)": "tăng lên (↔ giảm xuống)",
    "티셔츠 가": "áo phông",
    "방을 메다": "đeo túi trên vai",
    "가뭄이": "hạn hán",
    "-줄어들다": "giảm xuống",
}


def translate(term):
    if term in OVERRIDES:
        return OVERRIDES[term]
    query = term.replace("<->", "↔")
    for attempt in range(4):
        try:
            response = requests.get(
                "https://translate.googleapis.com/translate_a/single",
                params={"client": "gtx", "sl": "ko", "tl": "vi", "dt": "t", "q": query},
                timeout=20,
            )
            response.raise_for_status()
            result = "".join(part[0] or "" for part in response.json()[0]).strip()
            if result and re.search(r"[A-Za-zÀ-ỹ]", result):
                return result
        except (requests.RequestException, ValueError, IndexError, TypeError):
            time.sleep(1 + attempt)
    return ""


def main():
    missing = json.loads(MISSING.read_text(encoding="utf-8"))
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    cache.update(OVERRIDES)
    needed = [row[0] for row in missing if row[0] not in cache]
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(translate, term): term for term in needed}
        for index, future in enumerate(as_completed(futures), 1):
            cache[futures[future]] = future.result()
            if index % 25 == 0:
                CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(f"Translated {index}/{len(needed)}", flush=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    empty = [term for term in needed if not cache[term]]
    if empty:
        raise RuntimeError(f"No translation for {len(empty)} terms: {empty[:10]}")
    topics = json.loads(TOPICS.read_text(encoding="utf-8"))
    missing_terms = {row[0] for row in missing}
    updated = 0
    for row in topics:
        if row[0] in missing_terms and cache.get(row[0]):
            row[1] = cache[row[0]]
            updated += 1
    TOPICS.write_text(json.dumps(topics, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Filled {updated} dictionary-topic-vocab rows", flush=True)


if __name__ == "__main__":
    main()

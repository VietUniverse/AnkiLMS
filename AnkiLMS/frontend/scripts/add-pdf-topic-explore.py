"""Build one TOPIK 1–6 Explore deck with bilingual topic labels."""

import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "public" / "data"
COURSES = DATA / "course-vocabulary.json"
TOPICS = DATA / "dictionary-topic-vocab.json"
BASE = DATA / "dictionary-ko-multi.json"

catalog = json.loads(COURSES.read_text(encoding="utf-8"))
topics = json.loads(TOPICS.read_text(encoding="utf-8"))
base = {row[0]: row for row in json.loads(BASE.read_text(encoding="utf-8"))}
for group in catalog["decks"]:
    group["courses"] = [course for course in group["courses"] if course["id"] not in {str(4100 + level) for level in range(1, 7)}]
pdf_meanings = {}
study_file = Path(__file__).resolve().parents[3] / "dictionary.txt"
for line in study_file.read_text(encoding="utf-8-sig").splitlines()[3:]:
    parts = line.split("\t")
    if len(parts) >= 2 and parts[1] and not parts[1].startswith("[PDF"):
        pdf_meanings.setdefault(parts[0], parts[1])
existing_levels = defaultdict(list)
existing = set()
for group in catalog["decks"]:
    for course in group["courses"]:
        level = int(course["topik"].split()[-1])
        for unit in course["units"]:
            for word in unit["words"]:
                existing.add(word[1])
                existing_levels[word[1]].append(level)

topic_levels = defaultdict(list)
for hangul, _, topic, *_ in topics:
    topic_levels[topic].extend(existing_levels.get(hangul, []))

topic_translations = {
    "가정": "Gia đình", "감정": "Cảm xúc", "감정 · 몸짓": "Cảm xúc · cử chỉ",
    "건강": "Sức khỏe", "건강 · 신체": "Sức khỏe · cơ thể", "건강 · 음식": "Sức khỏe · ẩm thực",
    "경제": "Kinh tế", "계획-희망": "Kế hoạch · hy vọng", "고객센터": "Chăm sóc khách hàng",
    "고객센터 · 분실물 보관소": "Chăm sóc khách hàng · đồ thất lạc", "고객센터 · 은행": "Chăm sóc khách hàng · ngân hàng",
    "고객센터 · 컴퓨터": "Chăm sóc khách hàng · máy tính", "공연 – 전시회": "Biểu diễn – triển lãm",
    "공항": "Sân bay", "공항 · 교통": "Sân bay · giao thông", "과학 – 발전": "Khoa học – phát triển",
    "교육": "Giáo dục", "교통": "Giao thông", "교환 – 환불": "Đổi trả – hoàn tiền",
    "교환 – 환불 · 쇼핑": "Đổi trả – hoàn tiền · mua sắm", "날씨": "Thời tiết", "도서관": "Thư viện",
    "도시": "Thành phố", "동물": "Động vật", "동물 · 식물": "Động vật · thực vật",
    "몸짓": "Cử chỉ", "몸짓 · 예절": "Cử chỉ · phép lịch sự", "미용실": "Tiệm làm tóc",
    "방사": "Hoạt động thiện nguyện", "방송": "Phát sóng · truyền hình", "병원 – 약국": "Bệnh viện – nhà thuốc",
    "병원 – 약국 · 건강": "Bệnh viện – nhà thuốc · sức khỏe", "부동산": "Bất động sản", "부탁": "Nhờ vả",
    "분실물 보관소": "Quầy đồ thất lạc", "사건": "Vụ việc", "사건 · 재난 – 재해": "Vụ việc · thảm họa",
    "사회 문제": "Vấn đề xã hội", "사회 문제 · 성격": "Vấn đề xã hội · tính cách",
    "사회-정치": "Xã hội – chính trị", "사회-정치 · 역사": "Xã hội – chính trị · lịch sử",
    "성격": "Tính cách", "성격 · 외모": "Tính cách · ngoại hình", "세탁소": "Tiệm giặt là",
    "소개": "Giới thiệu", "쇼핑": "Mua sắm", "수리센터": "Trung tâm sửa chữa", "스포츠": "Thể thao",
    "식물": "Thực vật", "신체": "Cơ thể", "신체 · 예절": "Cơ thể · phép lịch sự",
    "신체 · 음식": "Cơ thể · ẩm thực", "여행": "Du lịch", "역사": "Lịch sử",
    "연애 – 결혼": "Tình yêu – hôn nhân", "예술": "Nghệ thuật", "예절": "Phép lịch sự",
    "외모": "Ngoại hình", "요리": "Nấu ăn", "우제국": "Bưu điện", "운동": "Tập luyện",
    "위치": "Vị trí", "은행": "Ngân hàng", "음식": "Ẩm thực", "의상": "Trang phục",
    "인사 – 안부": "Chào hỏi – hỏi thăm", "일과": "Sinh hoạt hằng ngày", "재난 – 재해": "Thảm họa",
    "조사": "Khảo sát", "주문": "Gọi món · đặt hàng", "컴퓨터": "Máy tính", "풍습": "Phong tục",
    "호텔": "Khách sạn", "호텔 · 여행": "Khách sạn · du lịch",
}
by_topic = defaultdict(list)
coarse = {"초급": 2, "중급": 4, "고급": 6}
for hangul, meaning, topic, *_ in topics:
    meaning = meaning or pdf_meanings.get(hangul, "")
    if not hangul or not meaning or hangul in existing:
        continue
    entry = base.get(hangul)
    declared = coarse.get(entry[5] if entry else "")
    related = topic_levels.get(topic, [])
    inferred = round(statistics.median(related)) if related else 3
    level = max(1, min(6, declared or inferred))
    by_topic[topic].append((hangul, meaning, f"TOPIK {level}"))
    existing.add(hangul)

units = []
for unit_number, (topic, words) in enumerate(sorted(by_topic.items()), 1):
    topic_title = f"{topic} · {topic_translations[topic]}" if topic in topic_translations else topic
    units.append({
        "number": unit_number,
        "title": topic_title,
        "words": [[410000000 + unit_number * 10000 + index, hangul, meaning, "", "", "", level]
                  for index, (hangul, meaning, level) in enumerate(words, 1)],
    })
topic_course = {
    "id": "topic-vocabulary",
    "title": "Từ vựng TOPIK theo chủ đề",
    "level": "TOPIK 1–6",
    "topik": "TOPIK 1–6",
    "topic": "Từ vựng theo chủ đề",
    "units": units,
    "wordCount": sum(len(unit["words"]) for unit in units),
}
topic_group = next((group for group in catalog["decks"] if group["id"] == "topic-vocabulary"), None)
if topic_group is None:
    topic_group = {"id": "topic-vocabulary", "title": "Từ vựng theo chủ đề", "subtitle": "TOPIK 1–6 · Chọn chủ đề khi học", "courses": []}
    catalog["decks"].append(topic_group)
topic_group["courses"] = [topic_course]

catalog["courseCount"] = sum(len(group["courses"]) for group in catalog["decks"])
catalog["wordCount"] = sum(course["wordCount"] for group in catalog["decks"] for course in group["courses"])
COURSES.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Added {topic_course['wordCount']} verified words across {len(units)} topics in one TOPIK 1–6 deck")

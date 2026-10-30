"""Add nonduplicate, dictionary-verified PDF headwords to six TOPIK Explore courses."""

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
    units.append({
        "number": unit_number,
        "title": topic,
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

"""Rebuild the TOPIK topic deck with every PDF headword, grouped by PDF topic order.
Meanings/levels come from words already in the app (not from PDF translations)."""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "public" / "data"
catalog = json.loads((DATA / "course-vocabulary.json").read_text(encoding="utf-8"))
topics = json.loads((DATA / "dictionary-topic-vocab.json").read_text(encoding="utf-8"))
group = next(g for g in catalog["decks"] if g["id"] == "topic-vocabulary")
old_units = group["courses"][0]["units"]

known = {}
for g in catalog["decks"]:
    for course in g["courses"]:
        for unit in course["units"]:
            for w in unit["words"]:
                level = w[6] if len(w) > 6 and w[6] else course["topik"]
                known.setdefault(w[1], (w[2], level if level[-1].isdigit() and "–" not in level else "TOPIK 3"))

vi = {u["title"].split(" - ", 1)[0]: u["title"].split(" - ", 1)[1] for u in old_units if u["title"].count(" - ") == 1}
vi.update({"계획-희망": "Kế hoạch, hy vọng", "방송": "Phát sóng, truyền hình", "주문": "Gọi món, đặt hàng"})
by_topic = {}
for hangul, fallback, topic, *_ in topics:
    primary = topic.split(" · ")[0]
    meaning, level = known.get(hangul, (fallback, "TOPIK 3"))
    if meaning:
        by_topic.setdefault(primary, []).append((hangul, meaning, level))

units = [{
    "number": n,
    "title": f"{topic} - {vi[topic]}" if topic in vi else topic,
    "words": [[410000000 + n * 10000 + i, h, m, "", "", "", lv] for i, (h, m, lv) in enumerate(words, 1)],
} for n, (topic, words) in enumerate(by_topic.items(), 1)]
course = group["courses"][0]
course["units"] = units
course["wordCount"] = sum(len(u["words"]) for u in units)
catalog["wordCount"] = sum(c["wordCount"] for g in catalog["decks"] for c in g["courses"])
(DATA / "course-vocabulary.json").write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(len(units), "topics,", course["wordCount"], "words; missing vi titles:", [u["title"] for u in units if " - " not in u["title"]])

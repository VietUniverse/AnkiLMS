#!/usr/bin/env python3
"""Convert the supplied Korean vocabulary course export to app and study files."""

from __future__ import annotations

import argparse
import csv
import json
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE = ROOT / "inputs" / "haechivn.csv"
DEFAULT_MANIFEST = ROOT / "inputs" / "haechivn_manifest.json"
DEFAULT_OUTPUT = ROOT / "AnkiLMS" / "frontend" / "public" / "data" / "course-vocabulary.json"
DEFAULT_TEXT_OUTPUT = ROOT / "dictionary.txt"

# Course IDs are kept intact so cards can be separated into two top-level
# Anki-like collections while preserving each original course and unit.
COURSE_META = {
    "1000": 1, "1100": 1, "1200": 2, "1300": 3, "1400": 4,
    "1500": 5, "1600": 6,
    # Courses spanning two exam levels are assigned to the upper level so a
    # single word is not duplicated across multiple decks.
    "1700": 2, "1800": 4, "1900": 6,
    "2000": 1, "2100": 2, "2200": 3, "2300": 4, "2400": 5, "2500": 6,
    "2600": 2, "2700": 4, "2800": 3, "2900": 6,
    "3000": 1, "3100": 2, "3200": 3, "3300": 4,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--text-output", type=Path, default=DEFAULT_TEXT_OUTPUT)
    args = parser.parse_args()

    courses_by_id: OrderedDict[str, dict] = OrderedDict()
    with args.source.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            course_id = str(row["course_id"])
            if course_id not in COURSE_META:
                continue
            topik_number = COURSE_META[course_id]
            course = courses_by_id.setdefault(course_id, {
                "id": course_id,
                "title": row["course_title"].strip(),
                "level": f"TOPIK {topik_number}",
                "topik": f"TOPIK {topik_number}",
                "topic": row["course_title"].strip(),
                "units": OrderedDict(),
            })
            unit_number = int(row["unit_number"])
            unit = course["units"].setdefault(unit_number, {
                "number": unit_number,
                "title": row["unit_title"].strip(),
                "words": [],
            })
            word_number = int(row["word_number"])
            # Stable integer IDs are unique by course, unit and row. They fit
            # in a signed 32-bit integer for synced SRS storage.
            card_id = int(course_id) * 100_000 + unit_number * 1_000 + word_number
            unit["words"].append([
                card_id,
                row["korean"].strip(),
                row["vietnamese"].strip(),
                row["romanization"].strip(),
                row["hanja"].strip(),
                row["pronunciation"].strip(),
            ])

    groups = [
        {"id": f"topik-{level}", "title": f"TOPIK {level}", "subtitle": f"Từ vựng cấp TOPIK {level}", "courses": []}
        for level in range(1, 7)
    ]
    group_by_id = {group["id"]: group for group in groups}
    for course_id, course in courses_by_id.items():
        group_id = f"topik-{COURSE_META[course_id]}"
        course["units"] = list(course["units"].values())
        course["wordCount"] = sum(len(unit["words"]) for unit in course["units"])
        group_by_id[group_id]["courses"].append(course)

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    result = {
        "version": 1,
        "source": "User-provided Korean–Vietnamese vocabulary course archive",
        "courseCount": sum(len(group["courses"]) for group in groups),
        "wordCount": sum(course["wordCount"] for group in groups for course in group["courses"]),
        "decks": groups,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    text_lines = [
        "TỪ VỰNG HÀN–VIỆT THEO KHÓA HỌC",
        f"Tổng: {result['wordCount']:,} mục từ trong {result['courseCount']} khóa",
        "",
        "Bản xuất phục vụ học tập cá nhân.",
    ]
    for deck in groups:
        text_lines.extend(["", "=" * 78, deck["title"], deck["subtitle"], "=" * 78])
        for course in deck["courses"]:
            text_lines.extend(["", f"## {course['title']} · {course['level']} · {course['topik']}"])
            for unit in course["units"]:
                text_lines.extend(["", f"### {unit['title']}"])
                for _, korean, vietnamese, romanization, hanja, pronunciation in unit["words"]:
                    details = " · ".join(value for value in (romanization, hanja, pronunciation) if value)
                    text_lines.append(f"{korean}\t{vietnamese}" + (f"\t{details}" if details else ""))
    args.text_output.parent.mkdir(parents=True, exist_ok=True)
    args.text_output.write_text("\n".join(text_lines) + "\n", encoding="utf-8")
    print(f"Courses: {result['courseCount']}; words: {result['wordCount']}")
    for deck in groups:
        print(f"{deck['title']}: {sum(c['wordCount'] for c in deck['courses'])} words across {len(deck['courses'])} courses")
    print(f"Wrote {args.output} ({args.output.stat().st_size:,} bytes)")
    print(f"Wrote personal text export {args.text_output} ({args.text_output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()

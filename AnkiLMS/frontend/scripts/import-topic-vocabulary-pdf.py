#!/usr/bin/env python3
"""Import the user-provided TOPIK topic list as personal study text and headword index.

The text export keeps the source Vietnamese column for the user's study file.
The public web index contains Korean headwords and topic labels only; its
Vietnamese meanings are supplied by the project's already licensed dictionary.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import OrderedDict
from pathlib import Path

import pdfplumber


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PDF = REPO_ROOT / "ankimobile-docs" / "Từ vựng topik theo chủ đề Thành Tuấn.pdf"
DEFAULT_TEXT = REPO_ROOT / "dictionary.txt"
DEFAULT_WEB = REPO_ROOT / "AnkiLMS" / "frontend" / "public" / "data" / "dictionary-topic-vocab.json"
DEFAULT_BASE = REPO_ROOT / "AnkiLMS" / "frontend" / "public" / "data" / "dictionary-ko-multi.json"

HANGUL = re.compile(r"[가-힣]")
HEADER = re.compile(r"^\s*(\d+)\.\s*(.*)$")
PAREN_ONLY = re.compile(r"^\(.*\)$")


def clean_lines(cell: str | None) -> list[str]:
    if not cell:
        return []
    return [re.sub(r"\s+", " ", line).strip() for line in cell.splitlines() if line.strip()]


def heading_from_row(row: list[str | None]) -> str | None:
    parts = [value.strip() for value in row if value and value.strip()]
    for value in parts:
        match = HEADER.match(value)
        if not match:
            continue
        name = match.group(2).strip()
        # Some headings are split between two table cells, e.g. "18." / "교육".
        if not name:
            name = next((p for p in parts if p != value and HANGUL.search(p)), "")
        elif "–" in name or "-" in name:
            pass
        return re.sub(r"\s+", " ", name).strip(" -–")
    return None


def parse_pdf(path: Path) -> list[dict]:
    sections: OrderedDict[str, dict] = OrderedDict()
    current_topic: str | None = None
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            table_objects = page.find_tables()
            # The PDF has a few detached text blocks where one table cell overflowed.
            # Infer their topic from the closest heading above their physical position.
            page_headers: list[tuple[float, str]] = []
            word_rows: dict[int, list] = {}
            for word in page.extract_words(x_tolerance=2, y_tolerance=3):
                y = round(word["top"] / 2) * 2
                word_rows.setdefault(y, []).append(word)
            for y, words in sorted(word_rows.items()):
                line = " ".join(word["text"] for word in words)
                match = HEADER.match(line)
                if match:
                    name = match.group(2).strip()
                    if not name:
                        name = " ".join(w["text"] for w in words if w["text"] != match.group(1) + ".")
                    page_headers.append((float(y), re.sub(r"\s+", " ", name).strip(" -–")))

            # Main tables contain their heading rows; separate fragments are routed by y.
            for table in sorted(table_objects, key=lambda item: item.bbox[1]):
                rows = table.extract()
                table_has_heading = any(heading_from_row(row) for row in rows)
                topic_for_table = current_topic
                if not table_has_heading:
                    y_top = table.bbox[1]
                    local = [topic for y, topic in page_headers if y <= y_top + 1]
                    if local:
                        topic_for_table = local[-1]
                for row in rows:
                    topic = heading_from_row(row)
                    if topic:
                        current_topic = topic
                        topic_for_table = topic
                        sections.setdefault(topic, {"topic": topic, "terms": [], "meanings": [], "pages": []})
                        continue
                    if not topic_for_table:
                        continue
                    cells = [cell or "" for cell in row]
                    # The Hangul column is always the first cell; the translated column
                    # is the first populated cell after it.
                    hangul_cell = cells[0] if cells else ""
                    meaning_cell = next((cell for cell in cells[1:] if cell.strip()), "")
                    section = sections.setdefault(
                        topic_for_table,
                        {"topic": topic_for_table, "terms": [], "meanings": [], "pages": []},
                    )
                    terms = [line for line in clean_lines(hangul_cell) if HANGUL.search(line) and not line.startswith("TIẾNG")]
                    meanings = [line for line in clean_lines(meaning_cell) if not line.startswith("TIẾNG")]
                    if terms:
                        section["terms"].extend({"text": term, "page": page_number} for term in terms)
                        section["pages"].append(page_number)
                    if meanings:
                        section["meanings"].extend({"text": meaning, "page": page_number} for meaning in meanings)

    # Detached overflow tables can repeat the same extracted line. Remove only exact
    # duplicates while retaining deliberate repeated words in the Korean column.
    for section in sections.values():
        seen_meanings: set[tuple[int, str]] = set()
        deduped = []
        for item in section["meanings"]:
            key = (item["page"], item["text"].casefold())
            if key in seen_meanings:
                continue
            seen_meanings.add(key)
            deduped.append(item)
        section["meanings"] = deduped
    return list(sections.values())


def merge_continuations(items: list[dict]) -> list[dict]:
    merged: list[dict] = []
    for item in items:
        value = re.sub(r"\s+", " ", item["text"]).strip()
        if PAREN_ONLY.match(value) and merged and item["page"] == merged[-1]["page"]:
            merged[-1]["text"] = f"{merged[-1]['text']} {value}"
        else:
            merged.append({**item, "text": value})
    return merged


def normalize_sections(sections: list[dict]) -> list[dict]:
    for section in sections:
        section["terms"] = merge_continuations(section["terms"])
        section["meanings"] = merge_continuations(section["meanings"])

        # A narrow cell wraps this single compound across two lines in the source PDF.
        if section["topic"] == "교육":
            for index in range(len(section["terms"]) - 1):
                if section["terms"][index]["text"] == "주입식" and section["terms"][index + 1]["text"] == "교육":
                    section["terms"][index]["text"] = "주입식 교육"
                    section["terms"].pop(index + 1)
                    break
            for index in range(len(section["meanings"]) - 1):
                if section["meanings"][index]["text"] == "phương thức truyền" and section["meanings"][index + 1]["text"] == "giáo dục, đào tạo":
                    section["meanings"][index]["text"] = "phương thức truyền giáo dục, đào tạo"
                    section["meanings"].pop(index + 1)
                    break

        # These translations overflow the next topic's table cell in the PDF.
        if section["topic"] == "교육":
            for other in sections:
                if other["topic"].startswith("공연"):
                    misplaced = next((i for i, item in enumerate(other["meanings"]) if item["text"] == "việc phạt, hình phạt"), None)
                    if misplaced is not None:
                        section["meanings"].insert(min(5, len(section["meanings"])), other["meanings"].pop(misplaced))
                    break

        # A standalone parenthetical translation belongs with the preceding item.
        if section["topic"].startswith("과학"):
            for index in range(len(section["meanings"]) - 1):
                if section["meanings"][index]["text"].startswith("mật độ thấp") and section["meanings"][index + 1]["text"] == "(→ Cao)":
                    section["meanings"][index]["text"] += " (→ Cao)"
                    section["meanings"].pop(index + 1)
                    break

        # The source has an extra gloss "Trộn" and carries the last two food
        # definitions onto the next page. Keep the gloss with 무침 and realign the rest.
        if section["topic"] == "요리":
            mix = next((i for i, item in enumerate(section["terms"]) if item["text"] == "무침"), None)
            if mix is not None and mix + 1 < len(section["meanings"]):
                extra = next((i for i, item in enumerate(section["meanings"]) if item["text"].casefold() == "trộn"), None)
                if extra is not None:
                    section["meanings"][mix]["text"] += "; Trộn"
                    section["meanings"].pop(extra)
            carried = [i for i, item in enumerate(section["meanings"]) if item["text"].casefold() in {"chảo", "hạt tiêu"}]
            if len(carried) == 2 and len(section["terms"]) >= 30:
                carry_items = [section["meanings"][i] for i in carried]
                for i in reversed(carried):
                    section["meanings"].pop(i)
                insert_at = min(28, len(section["meanings"]))
                section["meanings"][insert_at:insert_at] = carry_items

        # This heading is printed with an obvious typo in the provided source.
        aliases = {"분식물 보관소": "분실물 보관소", "응식": "음식", "검퓨터": "컴퓨터"}
        section["topic"] = aliases.get(section["topic"], section["topic"])
    return sections


def base_vietnamese_map(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    rows = json.loads(path.read_text(encoding="utf-8"))
    result: dict[str, str] = {}
    for row in rows:
        if len(row) >= 3 and row[0] and row[2]:
            result.setdefault(row[0], row[2])
    return result


def align_section(section: dict, base_meanings: dict[str, str]) -> list[dict]:
    terms = section["terms"]
    meanings = section["meanings"]
    topic = section["topic"]
    pairs: list[tuple[dict, str]] = []

    # The PDF's narrow columns occasionally split/merge a line, so the two
    # columns can have different counts. Never shift neighboring meanings to
    # make the counts fit: use the PDF translations only when the section is
    # one-to-one, otherwise rely on exact dictionary matches below.
    if topic == "교육" and len(terms) == 25 and len(meanings) == 21:
        # This section has four visibly blank cells in the supplied source.
        # Keeping the known blank positions prevents all later glosses from
        # shifting onto the wrong headword.
        blank_positions = {9, 13, 14, 18}
        meaning_index = 0
        for term_index, term in enumerate(terms):
            if term_index in blank_positions:
                pairs.append((term, ""))
            else:
                pairs.append((term, meanings[meaning_index]["text"]))
                meaning_index += 1
    elif len(terms) == len(meanings):
        pairs.extend((term, meaning["text"]) for term, meaning in zip(terms, meanings))
    else:
        pairs.extend((term, "") for term in terms)

    rows: list[dict] = []
    for term, pdf_meaning in pairs:
        hangul = re.sub(r"\s+", " ", term["text"]).strip().rstrip("/").strip()
        if not HANGUL.search(hangul):
            continue
        licensed_meaning = base_meanings.get(hangul, "")
        # Preserve PDF translations only when their column alignment is
        # unambiguous. Where the PDF is blank or misaligned, use an exact
        # existing dictionary match instead of guessing.
        study_meaning = pdf_meaning or licensed_meaning
        rows.append({
            "hangul": hangul,
            "vietnamese": study_meaning,
            "dictionaryVietnamese": licensed_meaning,
            "topic": topic,
            "page": term["page"],
        })
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--text-out", type=Path, default=DEFAULT_TEXT)
    parser.add_argument("--web-out", type=Path, default=DEFAULT_WEB)
    parser.add_argument("--base-dictionary", type=Path, default=DEFAULT_BASE)
    args = parser.parse_args()

    sections = normalize_sections(parse_pdf(args.pdf))
    base = base_vietnamese_map(args.base_dictionary)
    records = [record for section in sections for record in align_section(section, base)]
    unique_web: OrderedDict[str, dict] = OrderedDict()
    for record in records:
        current = unique_web.get(record["hangul"])
        if current:
            topics = current["topic"].split(" · ")
            if record["topic"] not in topics:
                current["topic"] += f" · {record['topic']}"
            if not current["vietnamese"] and record["dictionaryVietnamese"]:
                current["vietnamese"] = record["dictionaryVietnamese"]
        else:
            unique_web[record["hangul"]] = {
                "hangul": record["hangul"],
                "vietnamese": record["dictionaryVietnamese"],
                "topic": record["topic"],
                "source": "user-pdf-headword",
            }

    args.text_out.parent.mkdir(parents=True, exist_ok=True)
    with args.text_out.open("w", encoding="utf-8-sig", newline="\n") as output:
        output.write("TỪ VỰNG TOPIK THEO CHỦ ĐỀ — trích từ PDF Thành Tuấn\n")
        output.write("Nghĩa lấy từ PDF khi hai cột khớp 1:1; nếu lệch dùng nghĩa khớp chính xác từ từ điển HaechiVN. Mục còn trống không được tự đoán.\n")
        output.write("Hangul\tNghĩa tiếng Việt\tChủ đề\tTrang PDF\n")
        for section in sections:
            section_records = align_section(section, base)
            for record in section_records:
                meaning = record["vietnamese"] or "[PDF không có nghĩa; chưa có trong từ điển HaechiVN]"
                output.write(f"{record['hangul']}\t{meaning}\t{record['topic']}\t{record['page']}\n")

    args.web_out.parent.mkdir(parents=True, exist_ok=True)
    web_rows = [[row["hangul"], row["vietnamese"], row["topic"], row["source"]] for row in unique_web.values()]
    args.web_out.write_text(json.dumps(web_rows, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    print(f"PDF topic sections: {len(sections)}")
    print(f"Study rows: {len(records)}; unique web headwords: {len(web_rows)}")
    print(f"Rows with Vietnamese in PDF or exact dictionary match: {sum(bool(row['vietnamese']) for row in records)}")
    unaligned = [section for section in sections if len(section["terms"]) != len(section["meanings"]) and section["topic"] != "교육"]
    print(f"Sections using exact dictionary fallback instead of PDF column pairing: {len(unaligned)}")
    print("Sections aligned with verified blank positions: 교육")
    if unaligned:
        print("Unaligned topics: " + ", ".join(section["topic"] for section in unaligned))
    for section in sections:
        print(f"{section['topic']}: {len(section['terms'])} terms, {len(section['meanings'])} source gloss lines")
    print(f"Wrote {args.text_out}")
    print(f"Wrote {args.web_out}")


if __name__ == "__main__":
    main()

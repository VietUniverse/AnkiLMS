r"""Build compact lookup assets from the user-specified dictionary snapshots.

Run with source files stored on D: or another drive with sufficient space:
  py scripts/import-linked-dictionaries.py --nikl-csv D:\path\2024_01.csv \
      --yomichan-json D:\path\term_bank_1.json \
      --nikl-xml D:\path\nikl-xml

Requires lxml (pip install lxml). The XML input directory contains the
eleven NIKL snapshot files named nikl-5000.xml through nikl-51947.xml.

Only Korean headwords are retained from the unlicensed Yomichan/Naver archive.
No Japanese definitions, examples, pronunciation media, or Naver text are
redistributed.
"""

import argparse
import ast
import csv
import json
from pathlib import Path
from lxml import etree as ET


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data"
VIETNAMESE = ROOT / "src" / "data" / "niklKoreanViVocabulary.json"


def first_definition(raw: str) -> str:
    try:
        values = ast.literal_eval(raw or "[]")
    except (ValueError, SyntaxError):
        return ""
    if not isinstance(values, list):
        return ""
    for value in values:
        if isinstance(value, str) and value.strip():
            return " ".join(value.split())[:240]
    return ""


def add_nikl_translations(vietnamese: dict[str, str], japanese: dict[str, str], xml_directory: Path) -> None:
    for path in sorted(xml_directory.glob("nikl-*.xml")):
        with path.open("rb") as source:
            for _, entry in ET.iterparse(source, events=("end",), recover=True, load_dtd=False, no_network=True, huge_tree=True):
                if entry.tag != "LexicalEntry":
                    continue
                written = entry.find("./Lemma/feat[@att='writtenForm']")
                word = written.get("val", "").strip() if written is not None else ""
                meanings: dict[str, list[str]] = {"베트남어": [], "일본어": []}
                for equivalent in entry.iter("Equivalent"):
                    language = equivalent.find("./feat[@att='language']")
                    target = language.get("val") if language is not None else ""
                    if target not in meanings:
                        continue
                    lemma = equivalent.find("./feat[@att='lemma']")
                    meaning = " ".join((lemma.get("val", "") if lemma is not None else "").split())
                    if meaning and meaning not in meanings[target]:
                        meanings[target].append(meaning)
                if word:
                    for target, destination in (("베트남어", vietnamese), ("일본어", japanese)):
                        if not meanings[target]:
                            continue
                        existing = destination.get(word, "")
                        combined = list(dict.fromkeys([*existing.split("; "), *meanings[target]])) if existing else meanings[target]
                        destination[word] = "; ".join(combined)[:320]
                entry.clear()
                while entry.getprevious() is not None:
                    del entry.getparent()[0]


def build(nikl_csv: Path, yomichan_json: Path, nikl_xml: Path) -> None:
    vietnamese = {
        item["hangul"].strip(): item["vietnamese"].strip()
        for item in json.loads(VIETNAMESE.read_text(encoding="utf-8"))
        if item.get("hangul") and item.get("vietnamese")
    }
    japanese: dict[str, str] = {}
    add_nikl_translations(vietnamese, japanese, nikl_xml)
    entries: dict[str, list[str]] = {}
    with nikl_csv.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            word = row["Form"].strip()
            english = first_definition(row["English Definition"])
            if not word or not english:
                continue
            existing = entries.get(word)
            if existing:
                if english not in existing[1] and len(existing[1]) + len(english) < 300:
                    existing[1] += " / " + english
                continue
            entries[word] = [
                word,
                english,
                vietnamese.get(word, ""),
                japanese.get(word, ""),
                row["Part of Speech"].strip(),
                row["Vocabulary Level"].strip(),
            ]
    for word, meaning in vietnamese.items():
        if word not in entries:
            entries[word] = [word, "", meaning, japanese.get(word, ""), "", ""]
    for word, meaning in japanese.items():
        if word not in entries:
            entries[word] = [word, "", "", meaning, "", ""]

    # This archive is Korean-Japanese and has no declared reuse license.
    # Export only headwords so the UI can direct learners to the source.
    raw_terms = json.loads(yomichan_json.read_text(encoding="utf-8"))
    forms = {
        term[0].strip()
        for term in raw_terms
        if isinstance(term, list)
        and term
        and isinstance(term[0], str)
        and any("\uac00" <= char <= "\ud7a3" for char in term[0])
    }
    for word in forms:
        if word not in entries:
            entries[word] = [word, "", "", "", "", ""]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "dictionary-ko-multi.json").write_text(
        json.dumps(sorted(entries.values(), key=lambda item: item[0]), ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"Unified lookup: {len(entries):,} unique forms; "
        f"VI {sum(bool(item[2]) for item in entries.values()):,}, "
        f"EN {sum(bool(item[1]) for item in entries.values()):,}, "
        f"JA {sum(bool(item[3]) for item in entries.values()):,}; "
        f"Yomichan index {len(forms):,}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--nikl-csv", type=Path, required=True)
    parser.add_argument("--yomichan-json", type=Path, required=True)
    parser.add_argument("--nikl-xml", type=Path, required=True)
    args = parser.parse_args()
    build(args.nikl_csv, args.yomichan_json, args.nikl_xml)

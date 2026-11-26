"""Restore Anki subdeck labels on the published Công giáo deck without changing card IDs.

Usage: python scripts/restore-cong-giao-subdecks.py source.apkg cards-v3.json cards-v4.json
Requires the zstandard Python package for collection.anki21b archives.
"""

import io
import json
import sqlite3
import sys
import tempfile
import zipfile
from collections import Counter
from pathlib import Path

import zstandard


def source_decks(apkg: Path) -> dict[int, str]:
    with zipfile.ZipFile(apkg) as archive:
        if "collection.anki21b" in archive.namelist():
            with zstandard.ZstdDecompressor().stream_reader(
                io.BytesIO(archive.read("collection.anki21b"))
            ) as stream:
                database = stream.read()
        else:
            database = archive.read("collection.anki21" if "collection.anki21" in archive.namelist() else "collection.anki2")

    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "collection.db"
        path.write_bytes(database)
        connection = sqlite3.connect(path)
        try:
            decks = dict(connection.execute("SELECT id, name FROM decks"))
            cards = dict(connection.execute("SELECT id, did FROM cards"))
        finally:
            connection.close()
    return {card_id: decks[deck_id].replace("\x1f", "::") for card_id, deck_id in cards.items()}


def main() -> None:
    apkg, source, target = map(Path, sys.argv[1:4])
    deck_by_card = source_decks(apkg)
    cards = json.loads(source.read_text(encoding="utf-8"))
    for card in cards:
        full_name = deck_by_card.get(card["id"])
        if not full_name or "::" not in full_name:
            raise ValueError(f"Missing Anki subdeck for card {card['id']}")
        root, subdeck = full_name.split("::", 1)
        if root != card["deckName"]:
            raise ValueError(f"Deck name mismatch for card {card['id']}: {root}")
        card["subdeck"] = subdeck

    counts = Counter(card["subdeck"] for card in cards)
    if len(counts) != 14 or len(cards) != 280:
        raise ValueError(f"Unexpected deck structure: {len(cards)} cards, {len(counts)} subdecks")
    target.write_text(json.dumps(cards, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for name, count in sorted(counts.items()):
        print(f"{name}: {count}")


if __name__ == "__main__":
    main()

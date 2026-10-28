# Third-party vocabulary data

## Unified Korean lookup

`public/data/dictionary-ko-multi.json` is the lookup asset used by the dictionary, header search, vocabulary games, and speaking practice. It contains **155,186 unique Korean forms** after deduplication across the selected sources. The current snapshot has 48,620 Vietnamese, 48,780 English, and 47,679 Japanese meanings; a form may have more than one target-language meaning.

### NIKL / Korean Learners Dictionary

- Original work: [Korean Learners Dictionary](https://krdict.korean.go.kr/), National Institute of Korean Language.
- Dataset: [NIKL Korean–English dictionary](https://huggingface.co/datasets/binjang/NIKL-korean-english-dictionary), pinned snapshot `3b4cfd2126debfd5440cade3ef6c2a3c20cf7cf9`.
- XML snapshot: [spellcheck-ko/korean-dict-nikl-krdict](https://github.com/spellcheck-ko/korean-dict-nikl-krdict), eleven files.
- License: the dataset declares MIT; the underlying NIKL-derived material carries [CC BY-SA 2.0 Korea](https://creativecommons.org/licenses/by-sa/2.0/kr/). Attribution and share-alike terms are retained for the NIKL-derived fields.
- Modifications: deduplicated on Korean written form, retained the first English definition, merged Vietnamese and Japanese equivalents from the NIKL XML, and kept part-of-speech and level metadata. Unused media and other fields were removed.

### Yomichan Korean headword index

- Source: [Lyroxide/yomichan-ko-dic](https://github.com/Lyroxide/yomichan-ko-dic), snapshot `b8da625a5f97ccaaea7d73003d04e51c14443013`.
- 133,928 Korean forms were indexed; overlapping forms are deduplicated in the unified total.
- The source archive does not declare a reuse license. HaechiVN includes only Korean headwords from this source, not its Japanese/Naver definitions, examples, or media. Entries without a licensed NIKL meaning are shown as headwords without an invented definition. Naver lookup is an explicit user-initiated external link; HaechiVN does not scrape Naver.

The earlier `niklKoreanViVocabulary.json` file remains a small local fallback used by existing offline flows. Rebuild the unified lookup asset with `scripts/import-linked-dictionaries.py` and the downloaded source snapshots outside the repository.

### User-provided TOPIK topic PDF

- Source: the locally supplied `ankimobile-docs/Từ vựng topik theo chủ đề Thành Tuấn.pdf`.
- `scripts/import-topic-vocabulary-pdf.py` exports its Korean headwords, topic labels, page numbers, and extracted Vietnamese column to the user's local `dictionary.txt` for study.
- The public `public/data/dictionary-topic-vocab.json` index contains Korean headwords and topic labels. Vietnamese meanings in the public index are populated only from exact matches in the NIKL-derived dictionary above; PDF translations are not republished in that public asset.
- If a PDF topic has a mismatch between the Korean and Vietnamese column counts, the importer leaves the PDF meanings unmatched rather than shifting meanings to the wrong word, except for the education section whose blank-cell positions were explicitly mapped. It uses an exact NIKL match when available, otherwise marks the meaning as unavailable in the personal text export.

### Korean–Vietnamese course vocabulary export

- Source: [Jaemy Vietnamese learning courses](https://jaemy.net/learning?hl=vi), exported by the site owner.
- The supplied 24-course CSV/JSON archive contains 30,076 Korean–Vietnamese entries. `scripts/import-course-vocabulary.py` converts it into `public/data/course-vocabulary.json` and a personal `dictionary.txt` export.
- The application indexes the words for dictionary lookup, random games, and six SRS decks labeled TOPIK 1–6. Broad or combined courses are assigned once to the nearest single level to avoid duplicate cards; the original course and unit grouping is retained below each TOPIK deck.
- No separate redistribution license was present in the supplied archive. This source entry records provenance and does not claim that the source material is licensed for republication; obtain/retain the publisher's permission before making the public deployment available to third parties.

### Naver source tools reviewed

The linked Naver repositories are tools for distinct, limited jobs, not a redistributable full-dictionary dump:

- [`ngyinkit/naver-dict-scraper`](https://github.com/ngyinkit/naver-dict-scraper) is a browser extension that exports a learner's saved Naver wordbook (including TOPIK lists after the user adds them to that wordbook).
- [`rareloto/beginnerwebscraping-naverdictionary`](https://github.com/rareloto/beginnerwebscraping-naverdictionary) extracts Korean–English pairs from Naver's Conversation of the Day, not dictionary headwords.
- [`choonyongchan/NaverDictionary`](https://github.com/choonyongchan/NaverDictionary) documents a scraper-backed API for looking up an individual word and its metadata; it is not a complete corpus export.

HaechiVN therefore does not claim its current local 48,620 Vietnamese meanings are Naver data. The current searchable corpus remains the attributed NIKL-derived data plus Korean headwords described above, with a user-initiated Naver lookup link. The dictionary browser exposes only source-provided beginner/intermediate/advanced labels; unlabelled items remain unclassified rather than being assigned an invented TOPIK level. To import a user's own Naver wordbook, use the extension's CSV export and review its reuse permissions before publishing those entries to all learners.

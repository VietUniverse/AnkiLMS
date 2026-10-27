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

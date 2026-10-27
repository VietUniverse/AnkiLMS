# Third-party vocabulary data

## Korean Learners Dictionary (한국어기초사전)

`niklKoreanViVocabulary.json` is a modified vocabulary extract from the Korean Learners Dictionary published by the National Institute of Korean Language (NIKL / 국립국어원).

- Original work: [Korean Learners Dictionary](https://krdict.korean.go.kr/)
- Dataset/API information: [NIKL Open API](https://krdict.korean.go.kr/kor/openApi/openApiInfo)
- License: [Creative Commons Attribution-ShareAlike 2.0 Korea (CC BY-SA 2.0 KR)](https://creativecommons.org/licenses/by-sa/2.0/kr/)
- Source snapshot mirror: [spellcheck-ko/korean-dict-nikl-krdict](https://github.com/spellcheck-ko/korean-dict-nikl-krdict)
- Modifications: retained Korean headwords and Vietnamese equivalents, merged dictionary senses by headword, and removed pronunciation media URLs and other unused fields.
- This earlier local fallback contains 4,593 headwords from the first XML
  chunk. The game and speaking practice now load the complete Vietnamese
  vocabulary below when available.

This derived vocabulary file is distributed under the same CC BY-SA 2.0 KR license. NIKL pronunciation recordings are not included.

## NIKL Korean–English lookup

`public/data/nikl-ko-en-vi.json` contains 48,795 distinct headwords generated
from the [binjang/NIKL-korean-english-dictionary](https://huggingface.co/datasets/binjang/NIKL-korean-english-dictionary)
snapshot at commit `3b4cfd2126debfd5440cade3ef6c2a3c20cf7cf9`. The source dataset
lists 53,172 rows and marks itself MIT. It originates from the NIKL Korean
Learners Dictionary; retain attribution to the original source and its
CC BY-SA 2.0 KR terms as well. We retain the Korean headword, the first
English definition, part of speech, and NIKL beginner/intermediate/advanced
level, then merge Vietnamese lemmas from the
[NIKL XML snapshot](https://github.com/spellcheck-ko/korean-dict-nikl-krdict)
(all eleven files). 48,620 headwords have Vietnamese meanings. The snapshot
is CC BY-SA 2.0 KR. English meanings are always labelled EN in the interface.
The game and speaking practice load the complete Vietnamese vocabulary.

## Yomichan Korean headword index

`public/data/yomichan-headwords.json` contains 133,928 Korean headwords
extracted from [Lyroxide/yomichan-ko-dic](https://github.com/Lyroxide/yomichan-ko-dic)
at commit `b8da625a5f97ccaaea7d73003d04e51c14443013`. The repository's
`naver_kr_jp_dict` archive is Korean–Japanese and does not declare a reuse
license. Only headwords are included here as a search fallback. Its Japanese
and Naver definitions, examples, and media are not redistributed. The
interface links to Naver for a learner-initiated lookup. No automated
requests to Naver are made by HaechiVN.

Rebuild both lookup assets with `scripts/import-linked-dictionaries.py` using
the two source files downloaded to a working directory outside the repo.

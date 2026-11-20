const IGNORED_PUNCTUATION = /[.,?!~"'·…:;()\[\]{}「」『』“”‘’]/g;

export function normalizeKoreanText(value: string): string {
  return value.normalize("NFC").replace(IGNORED_PUNCTUATION, "").replace(/\s+/g, " ").trim();
}

/** Ordered character similarity; repeated or rearranged letters cannot score as a match. */
export function calculateKoreanSimilarity(target: string, answer: string): number {
  const expected = [...normalizeKoreanText(target).replace(/\s/g, "")];
  const actual = [...normalizeKoreanText(answer).replace(/\s/g, "")];
  if (!expected.length || !actual.length) return 0;

  let previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 1; row <= expected.length; row++) {
    const current = [row];
    for (let column = 1; column <= actual.length; column++) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  const distance = previous[actual.length];
  return Math.max(0, Math.round((1 - distance / Math.max(expected.length, actual.length)) * 100));
}

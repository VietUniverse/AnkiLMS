import type { AnkiCard, AnkiDeck } from "./ankiParser";

const STUDY_STATE_FIELDS = ["dueDate", "interval", "reps", "lapses", "state"] as const;

function sameCardIdentity(left: AnkiCard, right: AnkiCard): boolean {
  return left.id === right.id && left.noteId === right.noteId;
}

function syncCard(source: AnkiCard, saved: AnkiCard): AnkiCard {
  const merged: AnkiCard = {
    ...source,
    // The latest published deck supplies the card content; the learner keeps
    // their own scheduling and review history.
    dueDate: saved.dueDate,
    interval: saved.interval,
    reps: saved.reps,
    lapses: saved.lapses,
    state: saved.state,
    audioUrls: [...new Set([...(source.audioUrls || []), ...(saved.audioUrls || [])])],
    imageUrls: [...new Set([...(source.imageUrls || []), ...(saved.imageUrls || [])])],
    mediaRefs: [...new Set([...(source.mediaRefs || []), ...(saved.mediaRefs || [])])],
  };

  // Preserve FSRS metadata and other per-card properties written by newer app versions.
  const sourceRecord = source as AnkiCard & Record<string, unknown>;
  const savedRecord = saved as AnkiCard & Record<string, unknown>;
  for (const key of Object.keys(savedRecord)) {
    if (!(key in sourceRecord) || STUDY_STATE_FIELDS.includes(key as typeof STUDY_STATE_FIELDS[number])) {
      (merged as AnkiCard & Record<string, unknown>)[key] = savedRecord[key];
    }
  }
  return merged;
}

/** Update only Explore-managed decks, matching cards by their stable Anki IDs. */
export function syncManagedDecks(savedDecks: AnkiDeck[], publishedDecks: AnkiDeck[]): AnkiDeck[] {
  const publishedById = new Map(publishedDecks.map((deck) => [deck.id, deck]));
  let changed = false;

  // The TOPIK topic vocabulary used to be published as six separate decks.
  // Fold those learner copies into the new single deck while retaining each
  // card's FSRS/review state and stable Anki identity.
  const topicDeckId = "curated-course-topic-vocabulary";
  const oldTopicDeckIds = new Set(Array.from({ length: 6 }, (_, index) => `curated-course-410${index + 1}`));
  const oldTopicDecks = savedDecks.filter((deck) => oldTopicDeckIds.has(deck.id));
  const publishedTopicDeck = publishedById.get(topicDeckId);
  let decksToSync = savedDecks;
  if (oldTopicDecks.length && publishedTopicDeck) {
    const existingTopicDeck = savedDecks.find((deck) => deck.id === topicDeckId);
    const sourceCards = [...oldTopicDecks.flatMap((deck) => deck.cards || []), ...(existingTopicDeck?.cards || [])];
    const uniqueSavedCards = new Map<string, AnkiCard>();
    for (const card of sourceCards) uniqueSavedCards.set(`${card.id}:${card.noteId}`, card);
    const consolidated: AnkiDeck = {
      ...publishedTopicDeck,
      ...(existingTopicDeck || {}),
      id: topicDeckId,
      name: publishedTopicDeck.name,
      cards: [...uniqueSavedCards.values()],
    };
    consolidated.cardCount = consolidated.cards.length;
    decksToSync = [...savedDecks.filter((deck) => !oldTopicDeckIds.has(deck.id) && deck.id !== topicDeckId), consolidated];
    changed = true;
  }

  const nextDecks = decksToSync.map((savedDeck) => {
    if (!savedDeck.id.startsWith("curated-")) return savedDeck;
    const published = publishedById.get(savedDeck.id);
    if (!published) return savedDeck;

    const savedCards = savedDeck.cards || [];
    const matchedSaved = new Set<AnkiCard>();
    const cards = published.cards.map((sourceCard) => {
      const savedCard = savedCards.find((candidate) => sameCardIdentity(candidate, sourceCard));
      if (!savedCard) return sourceCard;
      matchedSaved.add(savedCard);
      return syncCard(sourceCard, savedCard);
    });

    // Keep cards that were removed from the published set so a content update
    // never deletes a learner's existing material or progress.
    for (const savedCard of savedCards) {
      if (!matchedSaved.has(savedCard)) cards.push(savedCard);
    }

    const merged: AnkiDeck = {
      ...published,
      id: savedDeck.id,
      cards,
      cardCount: cards.length,
      mediaAssets: [...(published.mediaAssets || []), ...(savedDeck.mediaAssets || [])],
    };
    const sourceComparable = { ...savedDeck, mediaAssets: undefined };
    const mergedComparable = { ...merged, mediaAssets: undefined };
    if (JSON.stringify(sourceComparable) === JSON.stringify(mergedComparable)) return savedDeck;
    changed = true;
    return merged;
  });

  return changed ? nextDecks : savedDecks;
}

import { CURATED_DECKS } from "../../../data/curatedDecks";
import DeckDetailClient from "./DeckDetailClient";

export function generateStaticParams() {
  return CURATED_DECKS.map((deck) => ({
    id: deck.id,
  }));
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeckDetailClient id={id} />;
}

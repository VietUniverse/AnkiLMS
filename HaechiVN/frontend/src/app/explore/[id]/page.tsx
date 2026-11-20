import { CURATED_DECKS } from "../../../data/curatedDecks";
import { readFile } from "node:fs/promises";
import path from "node:path";
import DeckDetailClient from "./DeckDetailClient";

export async function generateStaticParams() {
  let courseIds: string[] = [];
  try {
    const data = JSON.parse(await readFile(path.join(process.cwd(), "public/data/course-vocabulary.json"), "utf8"));
    courseIds = (data.decks || []).flatMap((group: { courses?: { id: string }[] }) => (group.courses || []).map((course) => `course-${course.id}`));
  } catch {
    // The Explore page can still build when the optional course catalog is absent.
  }
  return [...CURATED_DECKS.map((deck) => ({
    id: deck.id,
  })), ...courseIds.map((id) => ({ id })), { id: "curriculum-sejong" }, { id: "curriculum-kiip" }, { id: "seoul-1a" }];
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeckDetailClient id={id} />;
}

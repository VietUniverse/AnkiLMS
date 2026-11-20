import { AppShell } from "../../../components/AppShell";
import { SachLibraryModule } from "../../../components/SachLibraryModule";

export function generateStaticParams() {
  return [{ book: "so-cap-1" }, { book: "so-cap-2" }];
}

export default async function SachBookPage({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const { book } = await params;
  const validBook = book === "so-cap-2" ? "so-cap-2" : "so-cap-1";

  return (
    <AppShell>
      <SachLibraryModule initialBook={validBook} />
    </AppShell>
  );
}

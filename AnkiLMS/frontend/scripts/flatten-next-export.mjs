import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Next's static export stores RSC payloads in nested __next.* folders, while
// its client router asks Cloudflare Pages for a dot-joined .txt path.
const root = join(process.cwd(), "out");
let copied = 0;

function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { visit(path); continue; }
    if (entry.name !== "__PAGE__.txt") continue;
    const parts = relative(root, path).split(sep);
    const start = parts.findIndex((part) => part.startsWith("__next."));
    if (start < 0) continue;
    const target = join(root, ...parts.slice(0, start), parts.slice(start).join("."));
    copyFileSync(path, target);
    copied++;
  }
}

if (!existsSync(root)) throw new Error("Missing Next export directory: out");
visit(root);
// These files are uploaded to private R2 and served only by an authenticated API.
// Keep the source files for static route generation, but never publish them.
for (const name of ["dictionary-ko-multi.json", "dictionary-topic-vocab.json", "course-vocabulary.json", "seoul-1a.json", "thth-1.json", "nikl-ko-en-vi.json", "yomichan-headwords.json"]) {
  rmSync(join(root, "data", name), { force: true });
}
// Cloudflare Pages may retain immutable assets from older deployments at the
// production hostname. Overwrite known data-bearing chunks with inert files.
const legacyChunkDir = join(root, "_next", "static", "chunks");
mkdirSync(legacyChunkDir, { recursive: true });
for (const name of ["3ogbh3c8esv8y.js", "17ne4q1-qmzhr.js"]) {
  writeFileSync(join(legacyChunkDir, name), "/* retired legacy data chunk */\n", "utf8");
}
console.log(`Prepared ${copied} Cloudflare RSC routes`);

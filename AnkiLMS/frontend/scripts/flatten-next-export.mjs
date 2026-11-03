import { copyFileSync, existsSync, readdirSync } from "node:fs";
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
console.log(`Prepared ${copied} Cloudflare RSC routes`);

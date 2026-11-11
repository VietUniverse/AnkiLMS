import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// The book lessons are static exports from a separate interactive reader.
// Publish them at /sach/* as real files so Cloudflare Pages serves the exact
// URL that the embedded Next.js router sees (no edge rewrite/hydration split).
const root = join(process.cwd(), "out");
const source = join(root, "tieng-han", "sach");
const target = join(root, "sach");

if (!existsSync(source) || !existsSync(target)) {
  throw new Error("Expected Next output and static book export under out/");
}

function copyLessons(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    // Keep the app's own /sach catalog page; the old static landing page is
    // not part of the lesson route tree.
    if (from === source && entry === "index.html") continue;
    const sourcePath = join(from, entry);
    const targetPath = join(to, entry);
    if (statSync(sourcePath).isDirectory()) {
      copyLessons(sourcePath, targetPath);
      continue;
    }
    cpSync(sourcePath, targetPath);
    if (entry.toLowerCase().endsWith(".html")) {
      const original = readFileSync(targetPath, "utf8");
      const canonicalRoutes = original
        .replaceAll("/tieng-han/sach/", "/sach/")
        .replaceAll("https://www.haechivn.com/sach/", "https://lms.ankivn.com/sach/");
      if (canonicalRoutes !== original) writeFileSync(targetPath, canonicalRoutes, "utf8");
    }
  }
}

copyLessons(join(source, "so-cap-1"), join(target, "so-cap-1"));
copyLessons(join(source, "so-cap-2"), join(target, "so-cap-2"));
cpSync(join(source, "reader-light.css"), join(target, "reader-light.css"));

let lessons = 0;
for (const level of ["so-cap-1", "so-cap-2"]) {
  const levelDir = join(target, level);
  function count(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) count(path);
      else if (entry.name === "index.html") lessons++;
    }
  }
  count(levelDir);
}
console.log(`Published ${lessons} static book pages under /sach/`);

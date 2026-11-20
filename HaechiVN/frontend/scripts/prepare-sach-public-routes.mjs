import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";

// The book lessons are static exports from a separate interactive reader.
// Publish them at /sach/* as real files so Cloudflare Pages serves the exact
// URL that the embedded Next.js router sees (no edge rewrite/hydration split).
const root = join(process.cwd(), "out");
const source = join(root, "tieng-han", "sach");
const target = join(root, "sach");

if (!existsSync(source) || !existsSync(target)) {
  throw new Error("Expected Next output and static book export under out/");
}

const bookRoots = new Set([
  source,
  join(source, "so-cap-1"),
  join(source, "so-cap-2"),
]);

function transformLessonHtml(original) {
  // Serve the exported markup untouched. React hydrates the serialized Flight
  // tree; rewriting any URL inside it (even just /tieng-han/sach -> /sach)
  // desynchronises the server markup from the client tree and aborts hydration
  // with React error #412. Old /tieng-han/sach links are handled by the edge
  // redirect in functions/_middleware.ts instead.
  return original;
}

function copyLessons(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    // Keep the app's own /sach, /sach/so-cap-1, and /sach/so-cap-2 catalog pages;
    // the old static landing pages are not part of the lesson route tree.
    if (bookRoots.has(from) && entry === "index.html") continue;
    const sourcePath = join(from, entry);
    const targetPath = join(to, entry);
    if (statSync(sourcePath).isDirectory()) {
      copyLessons(sourcePath, targetPath);
      continue;
    }
    cpSync(sourcePath, targetPath);
    if (entry.toLowerCase().endsWith(".html")) {
      const original = readFileSync(targetPath, "utf8");
      const updated = transformLessonHtml(original);
      if (updated !== original) {
        writeFileSync(targetPath, updated, "utf8");
      }
      // Also write sibling <slug>.html so Cloudflare Pages can serve both
      // /sach/so-cap-1/bai-01 and /sach/so-cap-1/bai-01/ directly.
      if (entry.toLowerCase() === "index.html" && !bookRoots.has(from)) {
        const parentDir = dirname(to);
        const slug = basename(to);
        writeFileSync(join(parentDir, `${slug}.html`), updated, "utf8");
      }
    }
  }
}

copyLessons(join(source, "so-cap-1"), join(target, "so-cap-1"));
copyLessons(join(source, "so-cap-2"), join(target, "so-cap-2"));
cpSync(join(source, "reader-light.css"), join(target, "reader-light.css"));

// Ensure /sach/, /sach/so-cap-1/, and /sach/so-cap-2/ directory index files
// match the Next.js App Router catalog exports (sach.html, so-cap-1.html, so-cap-2.html).
const catalogHtml = join(root, "sach.html");
if (existsSync(catalogHtml)) {
  cpSync(catalogHtml, join(target, "index.html"));
}
for (const level of ["so-cap-1", "so-cap-2"]) {
  const levelHtml = join(target, `${level}.html`);
  if (existsSync(levelHtml)) {
    cpSync(levelHtml, join(target, level, "index.html"));
  }
}

// Remove the duplicate /tieng-han export directory from out/ so Cloudflare Pages
// only uploads /sach/* and lets _middleware.ts redirect legacy /tieng-han/sach/* URLs.
rmSync(join(root, "tieng-han"), { recursive: true, force: true });
// The exported lesson HTML links its stylesheet at /tieng-han/sach/reader-light.css.
// Keep that one asset in the deployment so the untouched markup needs no rewrite.
const legacyCssDir = join(root, "tieng-han", "sach");
mkdirSync(legacyCssDir, { recursive: true });
cpSync(join(target, "reader-light.css"), join(legacyCssDir, "reader-light.css"));

let lessons = 0;
for (const level of ["so-cap-1", "so-cap-2"]) {
  const levelDir = join(target, level);
  function count(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) count(path);
      else if (entry.name === "index.html" && dir !== levelDir) lessons++;
    }
  }
  count(levelDir);
}
console.log(`Published ${lessons} static book pages under /sach/`);

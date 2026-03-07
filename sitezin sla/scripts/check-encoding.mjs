import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "public"];
const TARGET_FILES = ["index.html", "README.md"];
const ALLOWED_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".md", ".json"]);

const mojibakeRegex = /[ÃÂ]|â€|â€“|â€”|â€œ|â€|â€˜|â€™|\uFFFD/;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const files = new Set();
for (const d of TARGET_DIRS) {
  for (const f of walk(path.join(ROOT, d))) files.add(f);
}
for (const f of TARGET_FILES) {
  const full = path.join(ROOT, f);
  if (fs.existsSync(full)) files.add(full);
}

let hasError = false;

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) continue;

  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (err) {
    hasError = true;
    console.error(`[encoding] cannot read ${path.relative(ROOT, file)}: ${err.message}`);
    continue;
  }

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (mojibakeRegex.test(lines[i])) {
      hasError = true;
      console.error(`[encoding] mojibake in ${path.relative(ROOT, file)}:${i + 1}: ${lines[i].trim()}`);
    }
  }
}

if (hasError) {
  console.error("\nEncoding check failed. Fix corrupted text before commit/deploy.");
  process.exit(1);
}

console.log("Encoding check passed.");

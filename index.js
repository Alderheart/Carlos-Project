#!/usr/bin/env node
// Usage: node index.js <plan.pdf> [--page N] [--scale 2] [--no-text] [--text-only]
// Writes everything to out/<pdf name>/ and prints a room table.
import fs from "node:fs/promises";
import path from "node:path";
import { extractText, formatText } from "./src/extract-text.js";
import { renderPages } from "./src/render.js";
import { analyzePage, MODEL } from "./src/analyze.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const pdfPath = args.find((a) => a.toLowerCase().endsWith(".pdf"));
if (!pdfPath) {
  console.error("Usage: node index.js <plan.pdf> [--page N] [--scale 2] [--no-text] [--text-only]");
  process.exit(1);
}
const scale = Number(opt("--scale", 2));
const onlyPage = opt("--page") ? Number(opt("--page")) : null;
const outDir = path.join("out", path.basename(pdfPath, path.extname(pdfPath)));
await fs.mkdir(outDir, { recursive: true });

// Step 1: dump all text
const pages = await extractText(pdfPath, { scale });
const allText = formatText(pages);
await fs.writeFile(path.join(outDir, "text.txt"), allText);
console.log(allText);
console.log(`\nText written to ${outDir}/text.txt`);
if (flag("--text-only")) process.exit(0);

// Step 2: render + ask Claude
const images = await renderPages(pdfPath, { scale });
for (const [i, png] of images.entries()) {
  const n = i + 1;
  if (onlyPage && n !== onlyPage) continue;
  await fs.writeFile(path.join(outDir, `page-${n}.png`), png);

  console.log(`\nPage ${n}: asking ${MODEL}...`);
  const text = flag("--no-text") ? null : formatText([pages[i]]);
  const { result, usage } = await analyzePage({ png, text });
  await fs.writeFile(path.join(outDir, `rooms-page-${n}.json`), JSON.stringify(result, null, 2));

  console.log(`Scale: ${result.scale || "(none found)"}`);
  console.table(
    result.rooms.map((r) => ({
      room: r.name,
      written: r.dimensions_as_written,
      "W ft": r.width_ft,
      "L ft": r.length_ft,
      sqft: r.area_sqft,
      source: r.source,
      conf: r.confidence,
    })),
  );
  if (result.notes) console.log(`Notes: ${result.notes}`);
  console.log(`Tokens: ${usage.input_tokens} in / ${usage.output_tokens} out. Saved ${outDir}/rooms-page-${n}.json`);
}

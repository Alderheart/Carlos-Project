// Dump every piece of text on a PDF, with positions.
// Positions are converted to the coordinate space of the rendered image
// (origin top-left, pixels at the given scale) so Claude can line text up with the picture.
import fs from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractText(pdfPath, { scale = 2 } = {}) {
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const task = getDocument({ data, verbosity: 0 });
  const doc = await task.promise;
  const pages = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale });
    const content = await page.getTextContent();

    const items = content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => {
        // transform[4], transform[5] = x, y of the text origin in PDF space
        const [x, y] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
        return { str: it.str.trim(), x: Math.round(x), y: Math.round(y) };
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);

    pages.push({ page: n, width: Math.round(viewport.width), height: Math.round(viewport.height), items });
  }

  await task.destroy();
  return pages;
}

// Plain-text form: one line per text item, "[x,y] text".
export function formatText(pages) {
  return pages
    .map((p) => {
      const lines = p.items.map((it) => `[${it.x},${it.y}] ${it.str}`);
      return `=== Page ${p.page} (${p.width}x${p.height}px) — ${p.items.length} text items ===\n${lines.join("\n") || "(no text layer — page is probably a scanned image)"}`;
    })
    .join("\n\n");
}

// Render PDF pages to PNG buffers.
import { pdf } from "pdf-to-img";

export async function renderPages(pdfPath, { scale = 2 } = {}) {
  const images = [];
  for await (const png of await pdf(pdfPath, { scale })) images.push(png);
  return images;
}

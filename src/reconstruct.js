// Redraw a floor plan from Claude's JSON: one rectangle per room.
const PX_PER_FT = 20;
const PAD = 40;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function toSvg(plan) {
  const rooms = plan.rooms;
  const maxX = Math.max(0, ...rooms.map((r) => r.x_ft + r.width_ft));
  const maxY = Math.max(0, ...rooms.map((r) => r.y_ft + r.length_ft));
  const w = maxX * PX_PER_FT + PAD * 2;
  const h = maxY * PX_PER_FT + PAD * 2;

  const shapes = rooms.map((r) => {
    const x = PAD + r.x_ft * PX_PER_FT;
    const y = PAD + r.y_ft * PX_PER_FT;
    const rw = r.width_ft * PX_PER_FT;
    const rh = r.length_ft * PX_PER_FT;
    const cx = x + rw / 2;
    const cy = y + rh / 2;
    const fill = r.source === "estimated" ? "#fff4e0" : "#ffffff";
    return `  <g>
    <rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${fill}" stroke="#222" stroke-width="3"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-weight="bold" font-size="12">${esc(r.name)}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="11">${esc(`${r.width_ft}' x ${r.length_ft}'`)}</text>
  </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Helvetica, Arial, sans-serif">
  <rect width="100%" height="100%" fill="#fafafa"/>
${shapes.join("\n")}
  <text x="${PAD}" y="${h - 12}" font-size="11" fill="#666">Reconstructed from Claude's JSON · 1 ft = ${PX_PER_FT}px · orange = estimated size</text>
</svg>
`;
}

// Original page and reconstruction side by side.
export function compareHtml({ title, pngFile, svgFile, plan }) {
  const rows = plan.rooms
    .map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.dimensions_as_written)}</td><td>${r.width_ft}</td><td>${r.length_ft}</td><td>${r.area_sqft ?? ""}</td><td>${r.source}</td><td>${r.confidence}</td></tr>`)
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:sans-serif;margin:16px}.pair{display:flex;gap:16px;flex-wrap:wrap}.pair img{max-width:48%;border:1px solid #ccc}table{border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:4px 8px}</style>
<h1>${esc(title)}</h1>
<div class="pair"><img src="${pngFile}" alt="original"><img src="${svgFile}" alt="reconstruction"></div>
<table><tr><th>Room</th><th>As written</th><th>W ft</th><th>L ft</th><th>sqft</th><th>source</th><th>conf</th></tr>
${rows}
</table>
<p>${esc(plan.notes)}</p>
`;
}

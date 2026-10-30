// Compare Claude's rooms against known-correct room sizes.
// Truth file: JSON array of { "name": "Kitchen", "width": "12'-6\"", "length": 10.5 }
// (sizes may be decimal feet or feet-inches text; width/length order doesn't matter).

export function parseFeet(v) {
  if (typeof v === "number") return v;
  const s = String(v).trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*['’]?\s*-?\s*(?:(\d+(?:\.\d+)?)\s*(?:["”]|''))?$/);
  if (!m) throw new Error(`Can't read size "${v}"`);
  return Number(m[1]) + (m[2] ? Number(m[2]) / 12 : 0);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function findMatch(name, rooms, used) {
  const n = norm(name);
  const free = rooms.filter((r) => !used.has(r));
  return free.find((r) => norm(r.name) === n) ?? free.find((r) => norm(r.name).includes(n) || n.includes(norm(r.name)));
}

export function score(plan, truth) {
  const used = new Set();
  const rows = [];

  for (const t of truth) {
    const want = [parseFeet(t.width), parseFeet(t.length)].sort((a, b) => a - b);
    const got = findMatch(t.name, plan.rooms, used);
    if (!got) {
      rows.push({ room: t.name, matched: "(missing)" });
      continue;
    }
    used.add(got);
    const have = [got.width_ft, got.length_ft].sort((a, b) => a - b);
    const errIn = Math.max(Math.abs(have[0] - want[0]), Math.abs(have[1] - want[1])) * 12;
    const wantArea = want[0] * want[1];
    const areaErrPct = ((have[0] * have[1] - wantArea) / wantArea) * 100;
    rows.push({
      room: t.name,
      matched: got.name,
      truth: `${fmt(want[0])} x ${fmt(want[1])}`,
      claude: `${fmt(have[0])} x ${fmt(have[1])}`,
      "worst err (in)": round(errIn),
      "area err %": round(areaErrPct),
      source: got.source,
    });
  }

  const extra = plan.rooms.filter((r) => !used.has(r)).map((r) => r.name);
  const scored = rows.filter((r) => r["worst err (in)"] !== undefined);
  const within = (inches) => scored.filter((r) => r["worst err (in)"] <= inches).length;
  const summary = {
    rooms_in_truth: truth.length,
    found: scored.length,
    missing: truth.length - scored.length,
    extra_rooms_from_claude: extra.length,
    exact_within_1in: within(1),
    within_6in: within(6),
    mean_worst_err_in: round(scored.reduce((s, r) => s + r["worst err (in)"], 0) / (scored.length || 1)),
    mean_abs_area_err_pct: round(scored.reduce((s, r) => s + Math.abs(r["area err %"]), 0) / (scored.length || 1)),
  };
  return { rows, extra, summary };
}

const round = (x) => Math.round(x * 10) / 10;
const fmt = (ft) => `${Math.floor(ft + 1e-9)}'-${round((ft - Math.floor(ft + 1e-9)) * 12)}"`;

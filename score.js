#!/usr/bin/env node
// Usage: node score.js out/<plan>/rooms-page-1.json truth.json
import fs from "node:fs/promises";
import { score } from "./src/score.js";

const [planFile, truthFile] = process.argv.slice(2);
if (!planFile || !truthFile) {
  console.error("Usage: node score.js <rooms-page-N.json> <truth.json>");
  process.exit(1);
}
const plan = JSON.parse(await fs.readFile(planFile, "utf8"));
const truth = JSON.parse(await fs.readFile(truthFile, "utf8"));
const { rows, extra, summary } = score(plan, truth);
console.table(rows);
if (extra.length) console.log(`Rooms Claude listed that aren't in the truth file: ${extra.join(", ")}`);
console.log(summary);

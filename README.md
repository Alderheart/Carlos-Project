# Floor plan reader (experiment)

Reads a floor plan PDF and asks Claude (`claude-opus-5-5`) for every room's name and dimensions.

One command does it all:

1. **Dumps all text** in the PDF with its position (`[x,y] text`), in the same pixel coordinates as the rendered image.
2. **Renders each page** to a PNG.
3. **Sends the image plus the positioned text** to Claude and gets back structured JSON: room name, dimensions as written, width/length in decimal feet, position (x/y in feet from the building's top-left corner), area, whether it was labeled or estimated, and confidence.
4. **Rebuilds the floor plan from that JSON** as an SVG (one rectangle per room) and writes a side-by-side page comparing it with the original.

## Setup

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
```

## Run

```bash
node index.js path/to/plan.pdf            # text dump + Claude analysis of every page
node index.js plan.pdf --page 2           # only analyze page 2
node index.js plan.pdf --text-only        # just dump the text, no API call
node index.js plan.pdf --no-text          # image only, to compare accuracy without text context
node index.js plan.pdf --scale 3          # render at higher resolution (default 2)
node index.js plan.pdf --truth truth.json # also score accuracy against known room sizes
```

## Scoring accuracy

Write the real room sizes in a truth file (see `samples/test-plan.truth.json`):

```json
[{ "name": "Kitchen", "width": "12'-6\"", "length": "10'-0\"" }]
```

Sizes can be feet-inches text or decimal feet, and width/length order doesn't matter. Rooms are matched by name.
Pass it with `--truth`, or score an earlier run with `node score.js out/<plan>/rooms-page-1.json truth.json`.
The report shows each room's worst dimension error in inches, its area error, missing and extra rooms, and a summary.

Output goes to `out/<pdf name>/`:

- `text.txt` — every text item with its `[x,y]` position
- `page-N.png` — what Claude saw
- `rooms-page-N.json` — Claude's answer
- `reconstructed-page-N.svg` — the plan redrawn from the JSON only
- `compare-page-N.html` — original and reconstruction side by side, plus the room table
- `score-page-N.json` — accuracy report (only with `--truth`)

`samples/test-plan.pdf` is a simple synthetic plan for a smoke test.

Note: scanned PDFs have no text layer, so only the image is used for those.

// Ask Claude for room names and dimensions from a floor plan image + its extracted text.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

export const MODEL = "claude-opus-5-5";

const Room = z.object({
  name: z.string().describe("Room name as labeled on the plan, e.g. 'Master Bedroom'"),
  dimensions_as_written: z.string().describe("Dimension text exactly as shown, e.g. 12'-6\" x 14'-0\". Empty if none shown."),
  width_ft: z.number().nullable().describe("First dimension in decimal feet"),
  length_ft: z.number().nullable().describe("Second dimension in decimal feet"),
  area_sqft: z.number().nullable(),
  source: z.enum(["labeled", "estimated"]).describe("labeled = read from a printed dimension; estimated = inferred from scale or neighbouring dimensions"),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string(),
});

const FloorPlan = z.object({
  scale: z.string().describe("Drawing scale if shown, e.g. 1/4\" = 1'-0\". Empty if none."),
  rooms: z.array(Room),
  notes: z.string().describe("Anything that affected accuracy: unreadable text, missing dimensions, etc."),
});

const PROMPT = `This is an architectural floor plan. List every room/space on it with its dimensions.

Rules:
- Prefer dimensions printed on the plan. Use the extracted PDF text below as ground truth for what the text says; use the image to work out which text belongs to which room.
- The text positions are [x,y] pixel coordinates in the attached image (origin top-left).
- Convert feet-inches to decimal feet (12'-6" = 12.5).
- If a room has no printed dimension, estimate it from the scale or nearby dimension strings, mark source "estimated", and lower the confidence.
- Include closets, baths, halls, garages, porches, etc.`;

export async function analyzePage({ png, text }) {
  const client = new Anthropic();
  const content = [
    { type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } },
    { type: "text", text: text ? `${PROMPT}\n\nExtracted PDF text:\n${text}` : PROMPT },
  ];

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "high", format: zodOutputFormat(FloorPlan) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error(`Claude declined: ${JSON.stringify(response.stop_details)}`);
  if (response.stop_reason === "max_tokens") throw new Error("Response hit max_tokens before finishing");
  return { result: response.parsed_output, usage: response.usage };
}

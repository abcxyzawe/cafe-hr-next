// Generate cafe-themed onboarding hero illustration via xAI image API.
// Self-contained ESM Node script. Run with:
//   node --env-file=.env scripts/generate-onboarding-hero.mjs [--force]
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const OUT_DIR = join(ROOT, "public", "illustrations");
const OUT_FILE = join(OUT_DIR, "onboarding-hero.png");
const ENDPOINT = "https://api.x.ai/v1/images/generations";

const PROMPT =
  "Wide stylized welcome illustration for a Vietnamese cafe HR app dashboard, friendly cafe scene with a barista, two customers and warm window light, soft cream and brown palette, modern flat vector style, gentle rounded shapes, no text, generous negative space on the right for layout, 16:9 aspect";

const force = process.argv.includes("--force");

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function generate(apiKey, model) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: PROMPT,
      n: 1,
      response_format: "url",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = await res.json();
  const url = data?.data?.[0]?.url;
  if (!url) throw new Error(`No URL in response: ${JSON.stringify(data).slice(0, 200)}`);
  const dl = await fetch(url);
  if (!dl.ok) throw new Error(`Download failed ${dl.status}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  await writeFile(OUT_FILE, buf);
  return { out: OUT_FILE, bytes: buf.length };
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error(
      "ERROR: XAI_API_KEY not set. Run with: node --env-file=.env scripts/generate-onboarding-hero.mjs",
    );
    process.exit(1);
  }
  const model = process.env.XAI_IMAGE_MODEL || "grok-imagine-image";
  await mkdir(OUT_DIR, { recursive: true });
  if (!force && (await fileExists(OUT_FILE))) {
    console.log(`SKIP onboarding-hero (exists, use --force to regenerate)`);
    return;
  }
  const t0 = Date.now();
  try {
    const r = await generate(apiKey, model);
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`OK   onboarding-hero -> ${r.out} (${r.bytes} bytes, ${sec}s)`);
  } catch (err) {
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FAIL onboarding-hero: ${msg} (${sec}s)`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

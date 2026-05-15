// Generate cafe role portrait illustrations via xAI image API.
// Self-contained ESM Node script. Run with:
//   node --env-file=.env scripts/generate-role-illustrations.mjs [--force]
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const OUT_DIR = join(ROOT, "public", "illustrations");
const ENDPOINT = "https://api.x.ai/v1/images/generations";

const ENTITIES = [
  {
    key: "barista",
    prompt:
      "Friendly stylized portrait illustration of a Vietnamese cafe barista at espresso machine pulling a shot, soft cream background, warm minimalist flat vector style, no text, soft smile, head-and-shoulders composition, square 1:1",
  },
  {
    key: "server",
    prompt:
      "Friendly stylized portrait illustration of a Vietnamese cafe server holding a tray with two coffee cups, soft cream background, warm minimalist flat vector style, no text, soft smile, head-and-shoulders composition, square 1:1",
  },
  {
    key: "cashier",
    prompt:
      "Friendly stylized portrait illustration of a Vietnamese cafe cashier at the register with a small POS terminal, soft cream background, warm minimalist flat vector style, no text, soft smile, head-and-shoulders composition, square 1:1",
  },
  {
    key: "manager",
    prompt:
      "Friendly stylized portrait illustration of a Vietnamese cafe manager holding a clipboard, professional warm appearance, soft cream background, warm minimalist flat vector style, no text, soft smile, head-and-shoulders composition, square 1:1",
  },
];

const force = process.argv.includes("--force");

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function generateOne(apiKey, model, entity) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: entity.prompt,
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
  const out = join(OUT_DIR, `role-${entity.key}.png`);
  await writeFile(out, buf);
  return { out, bytes: buf.length };
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error(
      "ERROR: XAI_API_KEY not set. Run with: node --env-file=.env scripts/generate-role-illustrations.mjs",
    );
    process.exit(1);
  }
  const model = process.env.XAI_IMAGE_MODEL || "grok-imagine-image";
  await mkdir(OUT_DIR, { recursive: true });
  let okCount = 0;
  let failCount = 0;
  for (const ent of ENTITIES) {
    const out = join(OUT_DIR, `role-${ent.key}.png`);
    if (!force && (await fileExists(out))) {
      console.log(`SKIP ${ent.key} (exists, use --force to regenerate)`);
      continue;
    }
    const t0 = Date.now();
    try {
      const r = await generateOne(apiKey, model, ent);
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`OK   ${ent.key} -> ${r.out} (${r.bytes} bytes, ${sec}s)`);
      okCount += 1;
    } catch (err) {
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAIL ${ent.key}: ${msg} (${sec}s)`);
      failCount += 1;
    }
  }
  console.log(`Done. ok=${okCount} fail=${failCount} total=${ENTITIES.length}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

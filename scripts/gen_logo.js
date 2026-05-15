// Generate Cafe HR logo concepts via Grok image API.
// Then optimize with sharp into multiple sizes for sidebar / PWA / favicon.

const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function readEnvKey() {
  const envPath = path.resolve(__dirname, "..", ".env");
  const text = await fs.readFile(envPath, "utf8");
  const m = text.match(/XAI_API_KEY\s*=\s*"?([^"\s]+)"?/);
  if (!m) throw new Error("XAI_API_KEY not found in .env");
  return m[1];
}

async function gen(apiKey, prompt) {
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-imagine-image",
      prompt,
      n: 1,
      response_format: "url",
    }),
  });
  if (!res.ok) throw new Error(`Grok ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].url;
}

async function download(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const CONCEPTS = {
  "logo-concept-a.jpg":
    "Minimalist square app icon for 'Cafe HR' coffee shop management software. " +
    "A stylized coffee cup viewed from above with three small friendly people silhouettes " +
    "forming the foam pattern inside, warm espresso brown coffee with cream foam, " +
    "clean centered flat vector design with subtle modern gradient, soft cream background, " +
    "rounded soft edges, 1:1 ratio, NO TEXT, NO LETTERS, NO NUMBERS, recognizable at small sizes",

  "logo-concept-b.jpg":
    "Modern square app icon for a coffee shop HR app. A side-view of a takeaway coffee cup " +
    "with steam forming an abstract heart shape rising up, in warm brown and cream tones with " +
    "a soft amber gradient circular badge background, clean flat vector design, professional logo style, " +
    "centered, 1:1 ratio, NO TEXT, NO LETTERS, NO NUMBERS, looks great at 32x32 and 512x512",

  "logo-concept-c.jpg":
    "Geometric square app icon: a stylized coffee bean shape morphing into a person silhouette, " +
    "warm espresso brown on a soft cream background with a subtle gradient ring border, " +
    "clean minimal flat design, modern startup logo aesthetic, centered composition, " +
    "1:1 ratio, NO TEXT, NO LETTERS, suitable for favicon and PWA icon, recognizable at small sizes",
};

async function main() {
  const apiKey = await readEnvKey();
  const outDir = path.resolve(__dirname, "..", "public", "grok-assets");
  await fs.mkdir(outDir, { recursive: true });

  const t0 = Date.now();
  const tasks = Object.entries(CONCEPTS).map(async ([filename, prompt]) => {
    const url = await gen(apiKey, prompt);
    const raw = await download(url);
    await fs.writeFile(path.join(outDir, filename), raw);
    return { filename, size: raw.length };
  });
  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    const filename = Object.keys(CONCEPTS)[i];
    if (r.status === "fulfilled") {
      console.log(`✓ ${filename} (${(r.value.size / 1024).toFixed(0)} KB)`);
    } else {
      console.error(`✗ ${filename}: ${r.reason}`);
    }
  });
  console.log(`Generated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

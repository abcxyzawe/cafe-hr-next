// Generate kiosk-welcome banner via xAI Grok image API
const fs = require('fs/promises');
const path = require('path');

const ENV_PATH = 'E:/Bai tap công nghệ phần mêm/cafe-hr/.env';
const OUT_DIR = 'E:/Bai tap công nghệ phần mêm/cafe-hr-next/public/grok-assets';
const ENDPOINT = 'https://api.x.ai/v1/images/generations';

const ASSET = {
  file: 'kiosk-welcome.jpg',
  prompt:
    'Wide horizontal banner illustration of a friendly cafe entrance with morning sunlight, a chalkboard sign that says nothing readable, coffee aroma steam, warm wood tones, cozy welcoming atmosphere, 21:9 ultra-wide aspect, slight overhead perspective looking into the cafe, no readable text, suitable as a kiosk welcome screen background with dark overlay',
};

async function readApiKey() {
  const raw = await fs.readFile(ENV_PATH, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*XAI_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  throw new Error('XAI_API_KEY not found in .env');
}

async function generateOne(apiKey, asset) {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-imagine-image',
      prompt: asset.prompt,
      n: 1,
      response_format: 'url',
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${resp.status}: ${text}`);
  }
  const json = await resp.json();
  const url = json?.data?.[0]?.url;
  if (!url) throw new Error(`No URL in response: ${JSON.stringify(json)}`);

  const imgResp = await fetch(url);
  if (!imgResp.ok) throw new Error(`Download failed ${imgResp.status}`);
  const buf = Buffer.from(await imgResp.arrayBuffer());

  const outPath = path.join(OUT_DIR, asset.file);
  await fs.writeFile(outPath, buf);
  return { file: asset.file, path: outPath, bytes: buf.length };
}

(async () => {
  const t0 = Date.now();
  const apiKey = await readApiKey();
  await fs.mkdir(OUT_DIR, { recursive: true });
  try {
    const r = await generateOne(apiKey, ASSET);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`OK ${r.path} (${r.bytes} bytes) in ${elapsed}s`);
  } catch (e) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`ERR ${ASSET.file}: ${e.message} (after ${elapsed}s)`);
    process.exitCode = 1;
  }
})();

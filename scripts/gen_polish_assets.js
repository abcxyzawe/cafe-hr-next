// Generate polish cafe-themed empty-state illustrations via xAI Grok image API
const fs = require('fs/promises');
const path = require('path');

const ENV_PATHS = [
  'E:/Bai tap công nghệ phần mêm/cafe-hr/.env',
  'E:/Bai tap công nghệ phần mêm/cafe-hr-next/.env',
];
const OUT_DIR = 'E:/Bai tap công nghệ phần mêm/cafe-hr-next/public/assets';
const ENDPOINT = 'https://api.x.ai/v1/images/generations';

const ASSETS = [
  {
    file: 'empty-tasks.jpg',
    prompt:
      'Flat vector illustration of a small empty clipboard with a few unchecked checkboxes resting on a wooden cafe counter beside a coffee cup, warm cream and brown tones, friendly minimalist style, no text, 4:3 composition, soft soft shadow',
  },
  {
    file: 'quick-actions-bg.jpg',
    prompt:
      'Wide horizontal banner with abstract coffee-themed geometric shapes — coffee bean silhouettes, steam swirls, soft circles in warm amber and brown tones on a cream background, subtle decorative pattern (not photographic), modern minimalist, no text, 21:9, suitable as a card background with content overlay',
  },
  {
    file: 'welcome-first-employee.jpg',
    prompt:
      "Flat vector illustration of an empty cafe staff lineup with name tags being placed on a table — inviting and welcoming feel, warm beige and amber tones, friendly minimalist design, no text, 4:3, perfect as an empty-state for an HR app's first-time experience",
  },
  {
    file: 'team-collaboration.jpg',
    prompt:
      'Flat vector illustration of 3-4 stylized cafe staff working together happily — one pouring coffee, one taking orders, one greeting customers — warm cafe interior, warm cream/brown palette, modern flat design, no text, 16:9, suitable as a hero image for HR/team page',
  },
];

async function readApiKey() {
  for (const p of ENV_PATHS) {
    try {
      const raw = await fs.readFile(p, 'utf8');
      const m = raw.match(/XAI_API_KEY\s*=\s*"?([^"\r\n\s]+)"?/);
      if (m) return m[1];
    } catch {}
  }
  throw new Error('XAI_API_KEY not found in any .env');
}

async function generateOne(apiKey, asset) {
  const t0 = Date.now();
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
  return { file: asset.file, path: outPath, bytes: buf.length, ms: Date.now() - t0 };
}

(async () => {
  const t0 = Date.now();
  const apiKey = await readApiKey();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const results = await Promise.allSettled(ASSETS.map((a) => generateOne(apiKey, a)));

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      const { path: p, bytes, ms } = r.value;
      console.log(`OK  ${p} (${bytes} bytes, ${(ms / 1000).toFixed(1)}s)`);
    } else {
      console.error(`ERR ${ASSETS[i].file}: ${r.reason?.message || r.reason}`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nWall time: ${elapsed}s`);
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) process.exitCode = 1;
})();

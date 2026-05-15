// Take a chosen Grok logo concept, optimize and emit multiple sizes
// to public/brand/ (favicon, app icon, sidebar, splash).
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const SRC_NAME = process.argv[2] || "logo-concept-b.jpg";
  const srcPath = path.resolve(
    __dirname,
    "..",
    "public",
    "grok-assets",
    SRC_NAME,
  );
  const outDir = path.resolve(__dirname, "..", "public", "brand");
  await fs.mkdir(outDir, { recursive: true });
  const raw = await fs.readFile(srcPath);

  // Crop concept B's circular center; concept A/C are already centered.
  const meta = await sharp(raw).metadata();
  const sz = Math.min(meta.width || 1024, meta.height || 1024);
  const base = await sharp(raw)
    .resize(sz, sz, { fit: "cover", position: "center" })
    .toBuffer();

  const variants = [
    { name: "logo-512.png", size: 512, fmt: "png" },
    { name: "logo-192.png", size: 192, fmt: "png" },
    { name: "logo-96.png", size: 96, fmt: "png" },
    { name: "logo-48.png", size: 48, fmt: "png" },
    { name: "logo-32.png", size: 32, fmt: "png" },
    { name: "favicon.ico", size: 32, fmt: "png" }, // saved as png; modern browsers accept
  ];

  for (const v of variants) {
    let pipe = sharp(base).resize(v.size, v.size, { fit: "cover" });
    pipe = pipe.png({ compressionLevel: 9, quality: 90 });
    const buf = await pipe.toBuffer();
    await fs.writeFile(path.join(outDir, v.name), buf);
    console.log(`✓ ${v.name} (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  // WebP large for splash / hero use
  const splash = await sharp(base)
    .resize(1024, 1024)
    .webp({ quality: 92 })
    .toBuffer();
  await fs.writeFile(path.join(outDir, "logo-1024.webp"), splash);
  console.log(`✓ logo-1024.webp (${(splash.length / 1024).toFixed(1)} KB)`);

  console.log(`\nSource: ${SRC_NAME}\nOutput dir: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

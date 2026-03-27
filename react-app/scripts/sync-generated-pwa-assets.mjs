import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const generatedIconsDir = path.join(projectRoot, "icons");
const publicIconsDir = path.join(projectRoot, "public", "icons");
const manifestPath = path.join(projectRoot, "public", "manifest.webmanifest");

await mkdir(publicIconsDir, { recursive: true });
await cp(generatedIconsDir, publicIconsDir, { recursive: true, force: true });

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

manifest.icons = [
  48,
  72,
  96,
  128,
  192,
  256,
  512,
].map((size) => ({
  src: `/icons/icon-${size}.webp`,
  type: "image/webp",
  sizes: `${size}x${size}`,
  purpose: "any maskable",
}));

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

/**
 * Rapatrie les photos du carnet de voyage japonais depuis l'ancien blog WordPress.
 *
 * Les fiches de `src/content/travel/japon-2024-*.md` pointent vers
 * `/images/voyages/<fichier>`. Ce script télécharge chaque fichier depuis
 * l'ancien blog et le dépose dans `public/images/voyages/`, pour que le site
 * n'ait plus aucune dépendance envers lui.
 *
 * Les originales sont des photos de téléphone de plusieurs mégaoctets : elles
 * sont ramenées à 1600 pixels de large et réencodées, sans quoi une page de
 * carnet pèserait des dizaines de mégaoctets.
 *
 *   node scripts/fetch-blog-images.mjs
 *
 * À lancer depuis une machine qui joint encore blog.vitet.info. Les fichiers
 * déjà présents sont conservés : le script peut être relancé sans risque.
 * Si l'originale n'existe plus, la variante redimensionnée de WordPress est
 * tentée en secours.
 */
import { readFile, writeFile, mkdir, access, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'images', 'voyages');
const manifest = JSON.parse(await readFile(join(root, 'scripts', 'blog-images.json'), 'utf8'));

/** Variante redimensionnée d'origine, au cas où l'image pleine taille a disparu. */
const fallbacks = (url) => {
  const sizes = ['1024x768', '768x1024', '300x225', '225x300'];
  const ext = url.slice(url.lastIndexOf('.'));
  const base = url.slice(0, url.lastIndexOf('.'));
  return sizes.map((s) => `${base}-${s}${ext}`);
};

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

/** Ramène une photo à une taille raisonnable pour le web, en gardant son format. */
const MAX_WIDTH = 1600;
async function shrink(buffer, name) {
  try {
    const image = sharp(buffer, { failOn: 'none' });
    const { width } = await image.metadata();
    if (!width || width <= MAX_WIDTH) return buffer;
    const pipeline = image.rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
    return name.toLowerCase().endsWith('.png')
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    return buffer; // format exotique : on garde l'originale
  }
}

await mkdir(outDir, { recursive: true });

let downloaded = 0;
let skipped = 0;
let resized = 0;
const failed = [];

for (const [name, url] of Object.entries(manifest)) {
  const target = join(outDir, name);
  if (await exists(target)) {
    // Déjà là : on la réduit si elle a été récupérée avant l'ajout du redimensionnement.
    const current = await readFile(target);
    const reduced = await shrink(current, name);
    if (reduced.length < current.length) {
      await writeFile(target, reduced);
      resized += 1;
    } else {
      skipped += 1;
    }
    continue;
  }
  let saved = false;
  for (const candidate of [url, ...fallbacks(url)]) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(target, await shrink(buffer, name));
      downloaded += 1;
      saved = true;
      break;
    } catch {
      /* on tente la variante suivante */
    }
  }
  if (!saved) failed.push(name);
}

let bytes = 0;
for (const name of Object.keys(manifest)) {
  try {
    bytes += (await stat(join(outDir, name))).size;
  } catch {
    /* absente */
  }
}
const mo = (bytes / 1024 / 1024).toFixed(1);
console.log(
  `${downloaded} téléchargées, ${resized} réduites, ${skipped} inchangées, ${failed.length} en échec — ${mo} Mo au total`,
);
if (failed.length > 0) {
  console.log('Manquantes :');
  for (const name of failed) console.log(`  ${name} → ${manifest[name]}`);
  process.exitCode = 1;
}

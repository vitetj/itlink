/**
 * Rapatrie les photos du carnet de voyage japonais depuis l'ancien blog WordPress.
 *
 * Les fiches de `src/content/travel/japon-2024-*.md` pointent vers
 * `/images/voyages/<fichier>`. Ce script télécharge chaque fichier depuis
 * l'ancien blog et le dépose dans `public/images/voyages/`, pour que le site
 * n'ait plus aucune dépendance envers lui.
 *
 *   node scripts/fetch-blog-images.mjs
 *
 * À lancer depuis une machine qui joint encore blog.vitet.info. Les fichiers
 * déjà présents sont conservés : le script peut être relancé sans risque.
 * Si l'originale n'existe plus, la variante redimensionnée de WordPress est
 * tentée en secours.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
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

await mkdir(outDir, { recursive: true });

let downloaded = 0;
let skipped = 0;
const failed = [];

for (const [name, url] of Object.entries(manifest)) {
  const target = join(outDir, name);
  if (await exists(target)) {
    skipped += 1;
    continue;
  }
  let saved = false;
  for (const candidate of [url, ...fallbacks(url)]) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) continue;
      await writeFile(target, Buffer.from(await response.arrayBuffer()));
      downloaded += 1;
      saved = true;
      break;
    } catch {
      /* on tente la variante suivante */
    }
  }
  if (!saved) failed.push(name);
}

console.log(`${downloaded} téléchargées, ${skipped} déjà présentes, ${failed.length} en échec`);
if (failed.length > 0) {
  console.log('Manquantes :');
  for (const name of failed) console.log(`  ${name} → ${manifest[name]}`);
  process.exitCode = 1;
}

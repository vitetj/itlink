/** Utilitaires texte : slugs, temps de lecture, extraits. */

/** Transforme une chaîne en slug ASCII (`Réseau & Wi-Fi` → `reseau-wi-fi`). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Nombre de mots d'un corps Markdown (approximatif mais stable). */
export function wordCount(body: string | undefined): number {
  if (!body) return 0;
  const stripped = body
    .replace(/```[\s\S]*?```/g, ' ') // blocs de code : comptés comme un mot
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\[\]()|-]/g, ' ');
  return stripped.split(/\s+/).filter(Boolean).length;
}

export interface ReadingTime {
  minutes: number;
  words: number;
  label: string;
}

/** Temps de lecture à 200 mots/minute, minimum 1 minute. */
export function readingTime(body: string | undefined): ReadingTime {
  const words = wordCount(body);
  const minutes = Math.max(1, Math.round(words / 200));
  return { minutes, words, label: `${minutes} min de lecture` };
}

/** Coupe proprement un texte à `max` caractères sur une limite de mot. */
export function excerpt(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Formatage des dates en français. */

const long = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const short = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

export function formatDate(date: Date, style: 'long' | 'short' | 'month' = 'long'): string {
  if (style === 'short') return short.format(date);
  if (style === 'month') return monthYear.format(date);
  return long.format(date);
}

/** ISO 8601 (date seule) pour `<time datetime>`, JSON-LD et flux. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Vrai si `updated` est postérieure à `published` d'au moins un jour. */
export function isUpdated(published: Date, updated?: Date): updated is Date {
  return !!updated && updated.getTime() - published.getTime() > 86_400_000;
}

/** Une procédure est « à vérifier » si elle n'a pas été touchée depuis `months` mois. */
export function isStale(date: Date | undefined, months = 18, now = new Date()): boolean {
  if (!date) return false;
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - months);
  return date < limit;
}

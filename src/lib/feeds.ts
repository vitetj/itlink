/** Fabrique de flux RSS à partir des cartes de contenu. */
import rss, { type RSSFeedItem } from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '@/data/site';
import type { CardItem } from './content';

export function cardsToFeedItems(cards: CardItem[]): RSSFeedItem[] {
  return cards.map((card) => ({
    title: card.title,
    description: card.description,
    link: card.href,
    pubDate: card.published,
    categories: [card.sectionLabel, ...(card.categoryLabel ? [card.categoryLabel] : []), ...card.tags],
    author: `${SITE.author.email} (${SITE.author.name})`,
  }));
}

export function buildFeed(context: APIContext, opts: { title: string; description: string; cards: CardItem[]; self: string }) {
  return rss({
    title: opts.title,
    description: opts.description,
    site: context.site ?? SITE.url,
    items: cardsToFeedItems(opts.cards),
    customData: `<language>${SITE.lang}</language><atom:link href="${new URL(opts.self, SITE.url).toString()}" rel="self" type="application/rss+xml"/>`,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    trailingSlash: false,
  });
}

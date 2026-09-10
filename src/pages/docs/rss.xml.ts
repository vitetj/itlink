import type { APIRoute } from 'astro';
import { SITE } from '@/data/site';
import { docToCard, getDocs } from '@/lib/content';
import { buildFeed } from '@/lib/feeds';

export const GET: APIRoute = async (context) =>
  buildFeed(context, {
    title: `${SITE.name} — docs`,
    description: 'Nouvelles fiches et tutoriels de la base de connaissances.',
    cards: (await getDocs()).map(docToCard),
    self: '/docs/rss.xml',
  });

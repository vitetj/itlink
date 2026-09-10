import type { APIRoute } from 'astro';
import { SITE } from '@/data/site';
import { getLab, labToCard } from '@/lib/content';
import { buildFeed } from '@/lib/feeds';

export const GET: APIRoute = async (context) =>
  buildFeed(context, {
    title: `${SITE.name} — lab`,
    description: 'Homelab, projets et expérimentations.',
    cards: (await getLab()).map(labToCard),
    self: '/lab/rss.xml',
  });

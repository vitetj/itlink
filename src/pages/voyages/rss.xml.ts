import type { APIRoute } from 'astro';
import { SITE } from '@/data/site';
import { getTravel, travelToCard } from '@/lib/content';
import { buildFeed } from '@/lib/feeds';

export const GET: APIRoute = async (context) =>
  buildFeed(context, {
    title: `${SITE.name} — voyages`,
    description: 'Carnet de voyages geek.',
    cards: (await getTravel()).map(travelToCard),
    self: '/voyages/rss.xml',
  });

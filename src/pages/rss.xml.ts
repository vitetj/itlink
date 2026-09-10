import type { APIRoute } from 'astro';
import { SITE } from '@/data/site';
import { getAllCards } from '@/lib/content';
import { buildFeed } from '@/lib/feeds';

export const GET: APIRoute = async (context) =>
  buildFeed(context, {
    title: `${SITE.name} — tout le site`,
    description: SITE.description,
    cards: (await getAllCards()).slice(0, 50),
    self: '/rss.xml',
  });

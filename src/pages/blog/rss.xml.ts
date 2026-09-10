import type { APIRoute } from 'astro';
import { SITE } from '@/data/site';
import { getPosts, postToCard } from '@/lib/content';
import { buildFeed } from '@/lib/feeds';

export const GET: APIRoute = async (context) =>
  buildFeed(context, {
    title: `${SITE.name} — blog`,
    description: "Billets d'humeur, veille et retours d'expérience.",
    cards: (await getPosts()).map(postToCard),
    self: '/blog/rss.xml',
  });

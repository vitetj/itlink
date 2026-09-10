/**
 * Images OpenGraph générées au build (1200×630) pour chaque page :
 * titre en Inter, fil d'Ariane et signature en IBM Plex Mono.
 * Satori rend un arbre d'éléments en SVG, resvg le rastérise en PNG.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { BLOG_CATEGORIES, DOC_CATEGORIES, LAB_CATEGORIES, SITE } from '@/data/site';
import { getAllCards } from '@/lib/content';

interface OgProps {
  [key: string]: unknown;
  title: string;
  crumbs: string[];
  subtitle?: string | undefined;
  color: string;
}

const COLORS = { docs: '#2997ff', blog: '#ff9f0a', lab: '#30d158', voyages: '#ff375f', site: '#2997ff' } as const;

export const getStaticPaths = (async () => {
  const cards = await getAllCards();
  const pages: { slug: string; props: OgProps }[] = [
    { slug: 'accueil', props: { title: SITE.title, crumbs: ['~'], subtitle: SITE.author.role, color: COLORS.site } },
    { slug: 'docs', props: { title: 'Base de connaissances IT', crumbs: ['docs'], subtitle: 'Tutoriels testés sur le terrain', color: COLORS.docs } },
    { slug: 'blog', props: { title: "Billets, veille et retours d'expérience", crumbs: ['blog'], color: COLORS.blog } },
    { slug: 'lab', props: { title: 'Homelab & expérimentations', crumbs: ['lab'], color: COLORS.lab } },
    { slug: 'voyages', props: { title: 'Carnet de voyages geek', crumbs: ['voyages'], color: COLORS.voyages } },
    { slug: 'a-propos', props: { title: 'À propos', crumbs: ['a-propos'], subtitle: SITE.author.role, color: COLORS.site } },
    { slug: 'cv', props: { title: 'Parcours & compétences', crumbs: ['cv'], subtitle: SITE.author.role, color: COLORS.site } },
    { slug: 'tags', props: { title: 'Tous les tags', crumbs: ['tags'], color: COLORS.site } },
    { slug: 'recherche', props: { title: 'Recherche', crumbs: ['recherche'], color: COLORS.site } },
    ...DOC_CATEGORIES.map((c) => ({ slug: `docs/${c.slug}`, props: { title: c.label, crumbs: ['docs', c.slug], subtitle: c.description, color: COLORS.docs } })),
    ...BLOG_CATEGORIES.map((c) => ({ slug: `blog/categorie/${c.slug}`, props: { title: c.label, crumbs: ['blog', 'categorie'], color: COLORS.blog } })),
    ...LAB_CATEGORIES.map((c) => ({ slug: `lab/categorie/${c.slug}`, props: { title: c.label, crumbs: ['lab', 'categorie'], color: COLORS.lab } })),
    ...cards.map((card) => ({
      slug: card.href.replace(/^\/|\/$/g, ''),
      props: {
        title: card.title,
        crumbs: card.href.split('/').filter(Boolean).slice(0, -1),
        subtitle: card.description,
        color: COLORS[card.section],
      },
    })),
  ];
  return pages.map((p) => ({ params: { slug: p.slug }, props: p.props }));
}) satisfies GetStaticPaths;

const fontsDir = path.join(process.cwd(), 'node_modules');
const fontCache: { display?: Buffer; mono?: Buffer } = {};
async function fonts() {
  fontCache.display ??= await readFile(path.join(fontsDir, '@fontsource/inter/files/inter-latin-700-normal.woff'));
  fontCache.mono ??= await readFile(path.join(fontsDir, '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff'));
  return [
    { name: 'Inter', data: fontCache.display, weight: 700 as const, style: 'normal' as const },
    { name: 'Plex Mono', data: fontCache.mono, weight: 400 as const, style: 'normal' as const },
  ];
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

function template({ title, crumbs, subtitle, color }: OgProps) {
  const titleSize = title.length > 70 ? 46 : title.length > 40 ? 56 : 66;
  return el(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '56px 64px',
      background: '#000000',
      backgroundImage: `radial-gradient(900px 480px at 8% -12%, ${color}33, transparent 70%)`,
      color: '#e7e5df',
      fontFamily: 'Plex Mono',
    },
    [
      el('div', { display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, color: '#a9acb3' }, [
        el('span', { color: '#4ade80' }, '$'),
        el('span', {}, `cd ~/${crumbs.join('/')}`),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', gap: 24 }, [
        el('div', { display: 'flex', width: 96, height: 8, background: color, borderRadius: 4 }),
        el('div', { fontFamily: 'Inter', fontSize: titleSize, lineHeight: 1.08, letterSpacing: -1, color: '#f5f5f7', display: 'flex' }, title),
        subtitle
          ? el('div', { fontSize: 26, lineHeight: 1.35, color: '#a9acb3', display: 'flex' }, subtitle.length > 150 ? `${subtitle.slice(0, 147)}…` : subtitle)
          : null,
      ]),
      el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: '#a9acb3' }, [
        el('div', { display: 'flex', gap: 14 }, [el('span', { color: '#f5f5f7', fontFamily: 'Inter', fontSize: 28 }, SITE.name), el('span', {}, '·'), el('span', {}, SITE.author.role)]),
        el('span', { color }, new URL(SITE.url).host),
      ]),
    ],
  );
}

export const GET: APIRoute = async ({ props }) => {
  const svg = await satori(template(props as OgProps) as never, { width: 1200, height: 630, fonts: await fonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
};

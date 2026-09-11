/**
 * Accès aux collections de contenu et normalisation en « cartes » homogènes.
 * Toutes les pages passent par ici : filtrage des brouillons, tri, catégories, articles liés.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import {
  BLOG_CATEGORIES,
  DOC_CATEGORIES,
  LAB_CATEGORIES,
  blogCategory,
  docCategory,
  labCategory,
  type Level,
  type SectionKey,
} from '@/data/site';
import { readingTime } from './text';

export type Doc = CollectionEntry<'docs'>;
export type Post = CollectionEntry<'posts'>;
export type Lab = CollectionEntry<'lab'>;
export type Travel = CollectionEntry<'travel'>;
export type Project = CollectionEntry<'projects'>;

/** Carte de contenu indépendante de la collection d'origine. */
export interface CardItem {
  id: string;
  section: SectionKey;
  sectionLabel: string;
  href: string;
  title: string;
  description: string;
  published: Date;
  updated?: Date | undefined;
  tags: string[];
  category?: string | undefined;
  categoryLabel?: string | undefined;
  categoryHref?: string | undefined;
  level?: Level | undefined;
  readingMinutes: number;
  tested?: boolean | undefined;
  cover?: ImageMetadata | undefined;
  /** Photo servie telle quelle depuis `public/` (contenu importé). */
  coverUrl?: string | undefined;
  coverAlt?: string | undefined;
  featured: boolean;
}

/** Les brouillons sont visibles en développement, masqués en production. */
const showDrafts = import.meta.env.DEV;

function notDraft<T extends { data: { draft?: boolean } }>(entry: T): boolean {
  return showDrafts || !entry.data.draft;
}

export const byDateDesc = <T extends { published: Date }>(a: T, b: T) =>
  b.published.getTime() - a.published.getTime();

/* -------------------------------------------------------------------------- */
/* Docs                                                                       */
/* -------------------------------------------------------------------------- */

/** Catégorie d'un doc : frontmatter, sinon premier dossier après `docs/`. */
export function docCategorySlug(doc: Doc): string | undefined {
  if (doc.data.category) return doc.data.category;
  const [, folder] = doc.id.split('/');
  return folder && DOC_CATEGORIES.some((c) => c.slug === folder) ? folder : undefined;
}

export function docHref(doc: Doc): string {
  return `/${doc.id}/`;
}

/** Page d'index (accueil docs ou index de catégorie) : pas un article. */
export function isDocIndex(doc: Doc): boolean {
  return doc.id === 'docs' || doc.id.endsWith('/index') || doc.id.split('/').length < 3;
}

/** Articles de documentation publiés (hors pages d'index), du plus récent au plus ancien. */
export async function getDocs(): Promise<Doc[]> {
  const docs = await getCollection('docs', (d) => notDraft(d) && !isDocIndex(d) && !!d.data.published);
  return docs.sort((a, b) => (b.data.published?.getTime() ?? 0) - (a.data.published?.getTime() ?? 0));
}

export function docToCard(doc: Doc): CardItem {
  const category = docCategorySlug(doc);
  const meta = category ? docCategory(category) : undefined;
  return {
    id: doc.id,
    section: 'docs',
    sectionLabel: 'Docs',
    href: docHref(doc),
    title: doc.data.title,
    description: doc.data.description ?? '',
    published: doc.data.published ?? new Date(0),
    updated: doc.data.updated,
    tags: doc.data.tags,
    category,
    categoryLabel: meta?.label,
    categoryHref: category ? `/docs/${category}/` : undefined,
    level: doc.data.level,
    readingMinutes: readingTime(doc.body).minutes,
    tested: doc.data.tested ?? doc.data.tested_on.length > 0,
    featured: doc.data.featured,
  };
}

/* -------------------------------------------------------------------------- */
/* Blog                                                                       */
/* -------------------------------------------------------------------------- */

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', notDraft);
  return posts.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

export function postHref(post: Post): string {
  return `/blog/${post.id}/`;
}

export function postToCard(post: Post): CardItem {
  return {
    id: post.id,
    section: 'blog',
    sectionLabel: 'Blog',
    href: postHref(post),
    title: post.data.title,
    description: post.data.description,
    published: post.data.published,
    updated: post.data.updated,
    tags: post.data.tags,
    category: post.data.category,
    categoryLabel: blogCategory(post.data.category)?.label,
    categoryHref: `/blog/categorie/${post.data.category}/`,
    readingMinutes: readingTime(post.body).minutes,
    cover: post.data.cover,
    coverAlt: post.data.coverAlt,
    featured: post.data.featured,
  };
}

/* -------------------------------------------------------------------------- */
/* Lab                                                                        */
/* -------------------------------------------------------------------------- */

export async function getLab(): Promise<Lab[]> {
  const items = await getCollection('lab', notDraft);
  return items.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

export function labHref(item: Lab): string {
  return `/lab/${item.id}/`;
}

export function labToCard(item: Lab): CardItem {
  return {
    id: item.id,
    section: 'lab',
    sectionLabel: 'Lab',
    href: labHref(item),
    title: item.data.title,
    description: item.data.description,
    published: item.data.published,
    updated: item.data.updated,
    tags: item.data.tags,
    category: item.data.category,
    categoryLabel: labCategory(item.data.category)?.label,
    categoryHref: `/lab/categorie/${item.data.category}/`,
    readingMinutes: readingTime(item.body).minutes,
    cover: item.data.cover,
    coverAlt: item.data.coverAlt,
    featured: item.data.featured,
  };
}

/* -------------------------------------------------------------------------- */
/* Voyages                                                                    */
/* -------------------------------------------------------------------------- */

export async function getTravel(): Promise<Travel[]> {
  const items = await getCollection('travel', notDraft);
  return items.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

export function travelHref(item: Travel): string {
  return `/voyages/${item.id}/`;
}

export function travelToCard(item: Travel): CardItem {
  return {
    id: item.id,
    section: 'voyages',
    sectionLabel: 'Voyages',
    href: travelHref(item),
    title: item.data.title,
    description: item.data.description,
    published: item.data.published,
    updated: item.data.updated,
    tags: item.data.tags,
    category: item.data.country,
    categoryLabel: item.data.country,
    readingMinutes: readingTime(item.body).minutes,
    cover: item.data.cover,
    coverUrl: item.data.coverUrl,
    coverAlt: item.data.coverAlt,
    featured: item.data.featured,
  };
}

/* -------------------------------------------------------------------------- */
/* Projets                                                                    */
/* -------------------------------------------------------------------------- */

export async function getProjects(): Promise<Project[]> {
  const items = await getCollection('projects', notDraft);
  return items.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

/* -------------------------------------------------------------------------- */
/* Agrégats                                                                   */
/* -------------------------------------------------------------------------- */

/** Tous les contenus datés, sous forme de cartes, du plus récent au plus ancien. */
export async function getAllCards(): Promise<CardItem[]> {
  const [docs, posts, lab, travel] = await Promise.all([getDocs(), getPosts(), getLab(), getTravel()]);
  return [
    ...docs.map(docToCard),
    ...posts.map(postToCard),
    ...lab.map(labToCard),
    ...travel.map(travelToCard),
  ].sort(byDateDesc);
}

export interface TagEntry {
  tag: string;
  slug: string;
  count: number;
  items: CardItem[];
}

/** Index des tags sur l'ensemble du site. */
export async function getTagIndex(): Promise<TagEntry[]> {
  const cards = await getAllCards();
  const map = new Map<string, TagEntry>();
  for (const card of cards) {
    for (const tag of card.tags) {
      const slug = slugifyTag(tag);
      const entry = map.get(slug) ?? { tag, slug, count: 0, items: [] };
      entry.count += 1;
      entry.items.push(card);
      map.set(slug, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'fr'));
}

export function slugifyTag(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Articles liés : score par tags communs (2 pts) et même catégorie (1 pt),
 * complété par les plus récents de la même section.
 */
export function relatedCards(current: CardItem, pool: CardItem[], limit = 3, pinned: string[] = []): CardItem[] {
  const pinnedItems = pinned.map((id) => pool.find((c) => c.id === id)).filter((c): c is CardItem => !!c);
  const scored = pool
    .filter((c) => c.id !== current.id && !pinnedItems.includes(c))
    .map((c) => {
      const shared = c.tags.filter((t) => current.tags.includes(t)).length;
      const sameCategory = c.category && c.category === current.category ? 1 : 0;
      const sameSection = c.section === current.section ? 0.5 : 0;
      return { card: c, score: shared * 2 + sameCategory + sameSection };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.card, b.card))
    .map((s) => s.card);
  return [...pinnedItems, ...scored].slice(0, limit);
}

/** Catégories docs avec le nombre d'articles publiés. */
export async function getDocCategoriesWithCounts() {
  const docs = await getDocs();
  return DOC_CATEGORIES.map((category) => ({
    ...category,
    href: `/docs/${category.slug}/`,
    count: docs.filter((d) => docCategorySlug(d) === category.slug).length,
  }));
}

export { BLOG_CATEGORIES, LAB_CATEGORIES, DOC_CATEGORIES };

/** Construction des métadonnées SEO et des schémas JSON-LD. */
import { SITE } from '@/data/site';
import { isoDate } from './dates';

export interface SeoInput {
  title: string;
  description: string;
  /** Chemin ou URL canonique ; par défaut l'URL courante. */
  canonical?: string | URL | undefined;
  type?: 'website' | 'article' | 'profile';
  /** Chemin de l'image OpenGraph (absolu ou relatif au site). */
  image?: string | undefined;
  imageAlt?: string | undefined;
  published?: Date | undefined;
  updated?: Date | undefined;
  tags?: string[] | undefined;
  section?: string | undefined;
  noindex?: boolean | undefined;
}

export function absoluteUrl(path: string | URL): string {
  return new URL(path, SITE.url).toString();
}

/** Titre complet d'onglet : « Titre · Jérémie Vitet », sauf sur l'accueil. */
export function pageTitle(title: string): string {
  return title === SITE.name ? SITE.title : `${title} · ${SITE.name}`;
}

/** Chemin d'une image OpenGraph générée pour une page. */
export function ogImagePath(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `/og/${clean || 'accueil'}.png`;
}

type JsonLd = Record<string, unknown>;

export function personJsonLd(): JsonLd {
  return {
    '@type': 'Person',
    '@id': `${SITE.url}/#person`,
    name: SITE.author.name,
    url: SITE.url,
    email: `mailto:${SITE.author.email}`,
    jobTitle: 'Directeur des systèmes d’information',
    sameAs: [SITE.author.github, SITE.author.linkedin],
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.locale,
    author: personJsonLd(),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/recherche/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface ArticleJsonLdInput {
  kind: 'TechArticle' | 'BlogPosting' | 'Article';
  url: string;
  title: string;
  description: string;
  published: Date;
  updated?: Date | undefined;
  tags?: string[] | undefined;
  section?: string | undefined;
  image?: string | undefined;
  wordCount?: number | undefined;
  proficiencyLevel?: string | undefined;
}

export function articleJsonLd(input: ArticleJsonLdInput): JsonLd {
  const ld: JsonLd = {
    '@context': 'https://schema.org',
    '@type': input.kind,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    headline: input.title,
    description: input.description,
    inLanguage: SITE.locale,
    datePublished: isoDate(input.published),
    dateModified: isoDate(input.updated ?? input.published),
    author: personJsonLd(),
    publisher: personJsonLd(),
  };
  if (input.tags?.length) ld.keywords = input.tags.join(', ');
  if (input.section) ld.articleSection = input.section;
  if (input.image) ld.image = absoluteUrl(input.image);
  if (input.wordCount) ld.wordCount = input.wordCount;
  if (input.proficiencyLevel) ld.proficiencyLevel = input.proficiencyLevel;
  return ld;
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

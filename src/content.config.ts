import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import {
  BLOG_CATEGORIES,
  DOC_CATEGORIES,
  LAB_CATEGORIES,
  LEVELS,
  STATUSES,
  type BlogCategorySlug,
  type DocCategorySlug,
  type LabCategorySlug,
} from './data/site';

/* ---------------------------------------------------------------------------
 * Briques partagées
 * ------------------------------------------------------------------------- */

const docCategorySlugs = DOC_CATEGORIES.map((c) => c.slug) as [DocCategorySlug, ...DocCategorySlug[]];
const blogCategorySlugs = BLOG_CATEGORIES.map((c) => c.slug) as [BlogCategorySlug, ...BlogCategorySlug[]];
const labCategorySlugs = LAB_CATEGORIES.map((c) => c.slug) as [LabCategorySlug, ...LabCategorySlug[]];

const tags = z.array(z.string().min(1)).default([]);
const date = z.coerce.date();

/** Champs communs à tous les contenus datés. */
const editorial = {
  published: date,
  updated: date.optional(),
  tags,
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
};

/* ---------------------------------------------------------------------------
 * docs — base de connaissances (Starlight)
 * Les fichiers vivent dans src/content/docs/docs/<categorie>/*.md(x)
 * ------------------------------------------------------------------------- */

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      /** Date de première publication. Absente sur les pages d'index de catégorie. */
      published: date.optional(),
      /** Date de dernière mise à jour significative. */
      updated: date.optional(),
      /** Catégorie ; déduite du dossier si absente. */
      category: z.enum(docCategorySlugs).optional(),
      tags,
      level: z.enum(LEVELS).default('intermédiaire'),
      featured: z.boolean().default(false),
      status: z.enum(STATUSES).default('à jour'),
      /** Environnements sur lesquels la procédure a réellement été déroulée. */
      tested_on: z.array(z.string()).default([]),
      /** Force l'affichage « testé » même sans détail d'environnement. */
      tested: z.boolean().optional(),
      /** Identifiants d'articles liés à afficher en priorité (ex. `docs/reseau/vlan-trunk`). */
      related: z.array(z.string()).default([]),
    }),
  }),
});

/* ---------------------------------------------------------------------------
 * posts — blog (billets, veille, retours d'expérience…)
 * ------------------------------------------------------------------------- */

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(220),
      ...editorial,
      category: z.enum(blogCategorySlugs),
      cover: image().optional(),
      coverAlt: z.string().optional(),
    }),
});

/* ---------------------------------------------------------------------------
 * lab — homelab, expérimentations, projets personnels
 * ------------------------------------------------------------------------- */

const lab = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/lab' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(220),
      ...editorial,
      category: z.enum(labCategorySlugs),
      /** État du projet. */
      status: z.enum(['idée', 'en cours', 'en production', 'archivé']).default('en cours'),
      /** Technologies et matériel mis en œuvre. */
      stack: z.array(z.string()).default([]),
      repo: z.url().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
    }),
});

/* ---------------------------------------------------------------------------
 * travel — carnet de voyages
 * ------------------------------------------------------------------------- */

const travel = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/travel' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(220),
      ...editorial,
      country: z.string(),
      place: z.string().optional(),
      /** Période du voyage (facultatif, distinct de la date de publication). */
      trip: z.object({ from: date, to: date.optional() }).optional(),
      cover: image().optional(),
      /** Photo déjà servie depuis `public/`, pour le carnet importé de l'ancien blog. */
      coverUrl: z.string().optional(),
      coverAlt: z.string().optional(),
    }),
});

/* ---------------------------------------------------------------------------
 * projects — fiches courtes (dépôts GitHub, outils internes, packages…)
 * ------------------------------------------------------------------------- */

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(220),
    ...editorial,
    kind: z.enum(['application', 'package', 'script', 'infrastructure', 'autre']).default('autre'),
    status: z.enum(['actif', 'maintenu', 'archivé']).default('actif'),
    stack: z.array(z.string()).default([]),
    repo: z.url().optional(),
    homepage: z.url().optional(),
  }),
});

/** Surcharges des libellés d'interface Starlight (src/content/i18n/fr.json). */
const i18n = defineCollection({ loader: i18nLoader(), schema: i18nSchema() });

export const collections = { docs, i18n, posts, lab, travel, projects };

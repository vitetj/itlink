import { defineConfig, fontProviders } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { DOC_CATEGORIES, SITE } from './src/data/site';

/**
 * Configuration Astro.
 *
 * - Starlight gère la base de connaissances sous `/docs` (contenu dans `src/content/docs/docs/`).
 * - Le reste du site (accueil, blog, lab, voyages, à propos, CV…) utilise nos propres layouts.
 * - Les polices sont auto-hébergées via l'API Fonts d'Astro à partir des paquets @fontsource.
 */
export default defineConfig({
  site: SITE.url,
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  image: {
    responsiveStyles: true,
    layout: 'constrained',
  },
  integrations: [
    starlight({
      title: SITE.name,
      description: SITE.description,
      titleDelimiter: '·',
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Français', lang: 'fr' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: SITE.author.github },
        { icon: 'linkedin', label: 'LinkedIn', href: SITE.author.linkedin },
        { icon: 'rss', label: 'Flux RSS', href: '/rss.xml' },
      ],
      customCss: ['./src/styles/global.css', './src/styles/starlight.css'],
      components: {
        Head: './src/components/starlight/Head.astro',
        Header: './src/components/starlight/Header.astro',
        MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
        PageTitle: './src/components/starlight/PageTitle.astro',
        Footer: './src/components/starlight/Footer.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
      },
      sidebar: [
        { label: 'Vue d’ensemble', link: '/docs' },
        ...DOC_CATEGORIES.map((category) => ({
          label: category.label,
          collapsed: true,
          items: [{ autogenerate: { directory: `docs/${category.slug}` } }],
        })),
      ],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      pagination: true,
      lastUpdated: false,
      credits: false,
      disable404Route: true,
      markdown: {
        headingLinks: true,
        // Les billets, le lab et les voyages profitent aussi des encadrés `:::note` et des ancres de titres.
        processedDirs: ['./src/content/posts/', './src/content/lab/', './src/content/travel/'],
      },
      expressiveCode: {
        themes: ['vitesse-dark', 'vitesse-light'],
        styleOverrides: {
          borderRadius: '0.5rem',
          codeFontFamily: 'var(--font-plex-mono), ui-monospace, monospace',
          uiFontFamily: 'var(--font-plex), system-ui, sans-serif',
          codeFontSize: '0.875rem',
          codeLineHeight: '1.65',
          frames: {
            shadowColor: 'transparent',
            terminalTitlebarDotsForeground: 'var(--c-fg-subtle)',
          },
        },
      },
    }),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/og/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: ['./node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2'],
            weight: '100 700',
            style: 'normal',
          },
          {
            src: ['./node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2'],
            weight: '100 700',
            style: 'italic',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-brico',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: ['./node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2'],
            weight: '200 800',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      options: {
        variants: [
          { src: ['./node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'], weight: 400, style: 'normal' },
          { src: ['./node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-italic.woff2'], weight: 400, style: 'italic' },
          { src: ['./node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2'], weight: 500, style: 'normal' },
          { src: ['./node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2'], weight: 600, style: 'normal' },
        ],
      },
    },
  ],
});

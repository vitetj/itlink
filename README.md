# vitet.info — site personnel de Jérémie Vitet

Base de connaissances IT, blog technique, lab, carnet de voyages et CV.
Site 100 % statique : **Astro 7 + Starlight + Tailwind CSS 4 + Pagefind**, sans base de données ni CMS.
Tout le contenu est versionné dans Git, en Markdown / MDX.

## Démarrage

```bash
npm install          # Node 22+
npm run dev          # http://localhost:4321
npm run check        # vérification TypeScript / Astro
npm run build        # génère dist/ (+ index Pagefind, sitemap, flux RSS, images OpenGraph)
npm run preview      # sert dist/ (nécessaire pour tester la recherche)
```

## Arborescence

```
.
├── astro.config.ts          # Astro, Starlight (/docs), MDX, sitemap, Tailwind, polices auto-hébergées
├── tsconfig.json            # TypeScript strict (preset "strictest"), alias @/ → src/
├── public/                  # fichiers servis tels quels (favicon.svg, _headers Cloudflare)
├── deploy/nginx.conf        # exemple de vhost Nginx
└── src/
    ├── content.config.ts    # collections et schémas Zod (docs, posts, lab, travel, projects)
    ├── content/
    │   ├── docs/docs/       # base de connaissances Starlight, un dossier par catégorie
    │   │   ├── index.mdx    # accueil /docs
    │   │   └── <categorie>/ # index.mdx (page de catégorie) + fiches *.md
    │   ├── posts/           # blog (/blog/<slug>)
    │   ├── lab/             # homelab & expérimentations (/lab/<slug>)
    │   ├── travel/          # carnet de voyages (/voyages/<slug>)
    │   └── projects/        # fiches courtes de dépôts / outils (listées sur /lab)
    ├── data/
    │   ├── site.ts          # identité, navigation, sections, catégories, niveaux, statuts
    │   └── cv.ts            # données de la page /cv
    ├── layouts/
    │   ├── BaseLayout.astro     # squelette HTML, SEO, polices, thème, header/footer
    │   └── ArticleLayout.astro  # page d'article (blog, lab, voyages) : méta, sommaire, liés, précédent/suivant
    ├── components/
    │   ├── SiteNav / Header / Footer / ThemeToggle / Icon
    │   ├── Card / CardGrid / SectionHeading / TagList / Breadcrumbs / Pagination
    │   ├── ArticleMeta / LevelBadge / StatusBadge / TestedBadge / TOC / PrevNext / Related
    │   ├── DocsHome / CategoryIndex          # utilisés dans les pages index de la documentation
    │   └── starlight/                        # surcharges Starlight : Head, Header, PageTitle, Footer, ThemeSelect, MobileMenuFooter
    ├── lib/
    │   ├── content.ts       # accès aux collections, cartes homogènes, tags, articles liés
    │   ├── seo.ts           # métadonnées, JSON-LD (WebSite, Person, TechArticle, BlogPosting, Breadcrumb)
    │   ├── feeds.ts         # fabrique des flux RSS
    │   ├── dates.ts / text.ts
    ├── pages/
    │   ├── index.astro                      # accueil
    │   ├── blog/[...page].astro             # liste paginée
    │   ├── blog/[slug].astro                # billet
    │   ├── blog/categorie/[category].astro
    │   ├── lab/index.astro, lab/[slug].astro, lab/categorie/[category].astro
    │   ├── voyages/index.astro, voyages/[slug].astro
    │   ├── a-propos.astro, cv.astro, tags/index.astro, tags/[tag].astro, recherche.astro, 404.astro
    │   ├── rss.xml.ts (+ blog/, docs/, lab/, voyages/rss.xml.ts), robots.txt.ts
    │   └── og/[...slug].png.ts              # images OpenGraph générées au build (satori + resvg)
    └── styles/
        ├── global.css       # jetons de design (light-dark), Tailwind, prose, encadrés, utilitaires
        └── starlight.css    # habillage de Starlight avec les mêmes jetons
```

## Modèle de contenu

Les schémas sont définis dans `src/content.config.ts` (Zod) et validés au build.

### Fiche de documentation (`src/content/docs/docs/<categorie>/<slug>.md`)

```yaml
---
title: "Titre de la fiche"
description: "Une ou deux phrases (220 caractères max)."
published: 2025-03-06
updated: 2025-09-01          # facultatif
category: reseau             # = nom du dossier ; voir DOC_CATEGORIES dans src/data/site.ts
tags: [stormshield, vpn, ipsec]
level: intermédiaire         # débutant | intermédiaire | avancé | expert
status: à jour               # brouillon | à jour | à vérifier | obsolète
featured: false              # mis en avant sur l'accueil et /docs
tested_on: [Stormshield SNS 4.8, Windows Server 2022]   # affiche « Testé sur … »
related: [docs/reseau/autre-fiche]                       # liens prioritaires (facultatif)
draft: false
---
```

Catégories : `microsoft`, `microsoft-365`, `windows-server`, `linux`, `reseau`, `cybersecurite`, `virtualisation`,
`conteneurs`, `self-hosting`, `cloud-web`, `automatisation`, `architecture`, `dsi`.
Chaque dossier contient un `index.mdx` (page de catégorie, liste automatique des fiches).

### Billet (`src/content/posts/<slug>.md`)

`title`, `description`, `published`, `updated?`, `category` (`humeur`, `veille`, `retex`, `dsi`, `logiciels`, `hardware`, `culture-geek`),
`tags`, `featured`, `draft`, `cover?` (image dans `src/assets/`), `coverAlt?`.

### Lab (`src/content/lab/<slug>.md`)

`title`, `description`, `published`, `category` (`homelab`, `proxmox`, `docker`, `reseau`, `serveurs`, `stockage`, `self-hosting`,
`hardware`, `experimental`), `status` (`idée`, `en cours`, `en production`, `archivé`), `stack: []`, `repo?`, `tags`, `featured`, `cover?`.

### Voyage (`src/content/travel/<slug>.md`)

`title`, `description`, `published`, `country`, `place?`, `trip: { from, to? }`, `tags`, `featured`, `cover?`, `coverAlt?`.

### Projet (`src/content/projects/<slug>.md`)

`title`, `description`, `published`, `kind` (`application`, `package`, `script`, `infrastructure`, `autre`), `status`
(`actif`, `maintenu`, `archivé`), `stack: []`, `repo?`, `homepage?`, `tags`.

### Syntaxe Markdown disponible partout

- Encadrés Starlight : `:::note`, `:::tip`, `:::caution`, `:::danger` (titre facultatif : `:::tip[Astuce]`).
- Blocs de code Expressive Code : `` ```powershell title="fichier.ps1" ``, surlignage de lignes `{2-3}`, cadre terminal automatique pour `bash`/`sh`/`powershell`, bouton copier.
- Ancres sur les titres, sommaire automatique (h2/h3), temps de lecture calculé.
- Les brouillons (`draft: true`) sont visibles en `npm run dev` et exclus du build.

## Design

- Jetons de couleur dans `src/styles/global.css` (`--c-*`), définis avec `light-dark()` : le thème suit `data-theme`
  (bouton dans l'en-tête, même clé `starlight-theme` que Starlight) ou, sans JavaScript, la préférence système.
- Polices auto-hébergées via l'API Fonts d'Astro à partir des paquets `@fontsource` : IBM Plex Sans (texte),
  Bricolage Grotesque (titres), IBM Plex Mono (tags, métadonnées, code).
- Chaque section a une teinte (`hue-docs`, `hue-blog`, `hue-lab`, `hue-travel`) utilisée pour les liens actifs, cartes et badges.
- Largeur de lecture `--measure` (44 rem) ; les blocs de code, tableaux et figures peuvent s'étendre jusqu'à `--wide` (60 rem).

## SEO et flux

- Canonical, OpenGraph, Twitter Cards et JSON-LD sur toutes les pages (`src/components/SEO.astro`, `src/lib/seo.ts`).
- Images OpenGraph générées au build pour chaque page : `/og/<chemin>.png`.
- Sitemap : `/sitemap-index.xml` ; robots : `/robots.txt`.
- Flux RSS : `/rss.xml` (tout), `/docs/rss.xml`, `/blog/rss.xml`, `/lab/rss.xml`, `/voyages/rss.xml`.
- Recherche plein texte locale : Pagefind, index construit après le build par Starlight ; page `/recherche` et modale (Ctrl+K) dans `/docs`.
  Les pages hors documentation sont indexées grâce à l'attribut `data-pagefind-body` posé sur les articles.

L'URL canonique du site est définie dans `src/data/site.ts` (`SITE.url`).

## Déploiement

Sortie statique dans `dist/`. Commande de build : `npm run build`, dossier de publication : `dist`, Node 22.

- **Cloudflare Pages** : framework preset « Astro », les en-têtes de `public/_headers` sont appliqués automatiquement.
- **Vercel** : preset « Astro », rien à configurer.
- **Nginx** : copier `dist/` sur le serveur et adapter `deploy/nginx.conf` (page 404, cache long sur `/_astro/`).

La génération des images OpenGraph lit les fichiers de polices dans `node_modules/@fontsource/*` depuis le dossier du projet :
lancer le build depuis la racine du dépôt.

## Conventions pour les contributions (humaines ou assistées)

Voir `AGENTS.md` : conventions de nommage, style éditorial, règles de confidentialité et checklist avant publication.

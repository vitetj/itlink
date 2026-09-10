/**
 * Configuration éditoriale du site.
 * Tout ce qui est "identité" (nom, URL, navigation, sections, catégories)
 * vit ici pour être modifiable sans toucher aux composants.
 */

export const SITE = {
  /** URL canonique (sans slash final). À adapter si le site change de domaine. */
  url: 'https://vitet.info',
  name: 'Jérémie Vitet',
  title: 'Jérémie Vitet — DSI, infra, réseau, cloud & geek',
  description:
    "15 ans passés dans l'IT. Notes de terrain, tutoriels, retours d'expérience et carnet de voyages d'un DSI qui aime encore mettre les mains dans le cambouis.",
  locale: 'fr-FR',
  lang: 'fr',
  author: {
    name: 'Jérémie Vitet',
    role: 'DSI • Infrastructure • Réseau • Cloud • Geek',
    email: 'jeremie@vitet.info',
    location: 'Deux-Sèvres, France',
    github: 'https://github.com/vitetj',
    linkedin: 'https://fr.linkedin.com/in/vitetjeremie',
  },
  /** Année de démarrage utilisée dans le pied de page. */
  since: 2024,
} as const;

/** Navigation principale. */
export const NAV = [
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
  { href: '/lab', label: 'Lab' },
  { href: '/voyages', label: 'Voyages' },
  { href: '/a-propos', label: 'À propos' },
] as const;

/** Sections du site : chaque section porte une teinte pour le repérage visuel. */
export const SECTIONS = {
  docs: { href: '/docs', label: 'Docs', hue: 'docs', tagline: 'Base de connaissances' },
  blog: { href: '/blog', label: 'Blog', hue: 'blog', tagline: "Billets & retours d'expérience" },
  lab: { href: '/lab', label: 'Lab', hue: 'lab', tagline: 'Homelab & expérimentations' },
  voyages: { href: '/voyages', label: 'Voyages', hue: 'travel', tagline: 'Carnet de voyages geek' },
} as const;

export type SectionKey = keyof typeof SECTIONS;

/**
 * Catégories de la documentation. L'ordre définit l'ordre d'affichage.
 * `slug` correspond au dossier dans `src/content/docs/docs/<slug>/`.
 */
export const DOC_CATEGORIES = [
  { slug: 'microsoft', label: 'Microsoft', short: 'MS', description: 'Windows, Office, outils Microsoft côté poste de travail.' },
  { slug: 'microsoft-365', label: 'Microsoft 365 / Entra', short: 'M365', description: 'Exchange Online, Entra ID, Intune, licences, Copilot.' },
  { slug: 'windows-server', label: 'Windows Server', short: 'WS', description: 'Active Directory, GPO, DNS/DHCP, RDS, impression.' },
  { slug: 'linux', label: 'Linux', short: 'LNX', description: 'Debian, Ubuntu, shell, services, durcissement.' },
  { slug: 'reseau', label: 'Réseau', short: 'NET', description: 'VLAN, routage, VPN, SD-WAN, Wi-Fi, firewalls.' },
  { slug: 'cybersecurite', label: 'Cybersécurité', short: 'SEC', description: 'EDR, MFA, sauvegardes immuables, audits, hygiène.' },
  { slug: 'virtualisation', label: 'Virtualisation', short: 'VIRT', description: 'VMware, Proxmox, XCP-ng, hyperconvergence.' },
  { slug: 'conteneurs', label: 'Conteneurs / Docker', short: 'DKR', description: 'Docker, Compose, images, registres, bonnes pratiques.' },
  { slug: 'self-hosting', label: 'Self-hosting', short: 'SELF', description: 'Cloudron, reverse proxy, certificats, services auto-hébergés.' },
  { slug: 'cloud-web', label: 'Cloud / Web', short: 'CLD', description: 'Azure, OVHcloud, DNS, hébergement, sites statiques.' },
  { slug: 'automatisation', label: 'Automatisation / scripting', short: 'AUTO', description: 'PowerShell, Bash, CI/CD, API, tâches planifiées.' },
  { slug: 'architecture', label: 'Architecture IT', short: 'ARCH', description: 'Conception, PRA/PCA, dimensionnement, choix de solutions.' },
  { slug: 'dsi', label: 'DSI', short: 'DSI', description: 'Budget, fournisseurs, gouvernance, conformité, management.' },
] as const;

export type DocCategorySlug = (typeof DOC_CATEGORIES)[number]['slug'];

export function docCategory(slug: string) {
  return DOC_CATEGORIES.find((c) => c.slug === slug);
}

/** Catégories éditoriales du blog. */
export const BLOG_CATEGORIES = [
  { slug: 'humeur', label: "Billet d'humeur" },
  { slug: 'veille', label: 'Veille & actualités' },
  { slug: 'retex', label: "Retour d'expérience" },
  { slug: 'dsi', label: 'Métier de DSI' },
  { slug: 'logiciels', label: 'Découvertes logicielles' },
  { slug: 'hardware', label: 'Hardware' },
  { slug: 'culture-geek', label: 'Culture geek' },
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]['slug'];

export function blogCategory(slug: string) {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}

/** Catégories du Lab. */
export const LAB_CATEGORIES = [
  { slug: 'homelab', label: 'Homelab' },
  { slug: 'proxmox', label: 'Proxmox' },
  { slug: 'docker', label: 'Docker' },
  { slug: 'reseau', label: 'Réseau' },
  { slug: 'serveurs', label: 'Serveurs' },
  { slug: 'stockage', label: 'Stockage' },
  { slug: 'self-hosting', label: 'Auto-hébergement' },
  { slug: 'hardware', label: 'Électronique / hardware' },
  { slug: 'experimental', label: 'Projets expérimentaux' },
] as const;

export type LabCategorySlug = (typeof LAB_CATEGORIES)[number]['slug'];

export function labCategory(slug: string) {
  return LAB_CATEGORIES.find((c) => c.slug === slug);
}

/** Niveaux de difficulté des tutoriels. */
export const LEVELS = ['débutant', 'intermédiaire', 'avancé', 'expert'] as const;
export type Level = (typeof LEVELS)[number];

/** Statut de fraîcheur d'une procédure. */
export const STATUSES = ['brouillon', 'à jour', 'à vérifier', 'obsolète'] as const;
export type Status = (typeof STATUSES)[number];

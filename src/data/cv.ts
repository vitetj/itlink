/**
 * Données du CV. Modifier ici, la page /cv se met à jour.
 * Les périodes sont des chaînes libres pour rester lisibles (« 2019 – aujourd'hui »).
 */

export interface Experience {
  company: string;
  role: string;
  period: string;
  start: number;
  end?: number;
  location?: string;
  summary: string;
  highlights: string[];
  stack: string[];
}

export interface SkillGroup {
  name: string;
  icon: 'network' | 'server' | 'shield' | 'cloud' | 'terminal' | 'briefcase';
  items: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  year?: number;
  status?: 'obtenue' | 'en cours' | 'expirée';
  url?: string;
}

export const CV = {
  headline: 'DSI · Architecte infrastructure · Admin sys & réseau',
  intro:
    "Au carrefour de la direction informatique et du terrain : je conçois, je déploie et je maintiens moi-même l'infrastructure d'une PME industrielle multi-sites (France ↔ États-Unis). Je privilégie les solutions robustes, sobres et si possible souveraines, et je documente tout ce qui a fini par marcher.",
  yearsInIT: 15,
  location: 'Mauléon – Bressuire (Deux-Sèvres), France',
  languages: ['Français (natif)', 'Anglais (professionnel)', 'Japonais (notions, un an à Tokyo)'],
  experiences: [
    {
      company: 'PME industrielle — machines d’emballage (Deux-Sèvres)',
      role: 'DSI, DevOps & administrateur systèmes',
      period: '2019 – aujourd’hui',
      start: 2019,
      location: 'Mauléon (79) · site aux États-Unis',
      summary:
        'Refonte complète du parc et de l’infrastructure, gouvernance hybride on-premise / Microsoft 365, sécurité opérationnelle et pilotage des prestataires, avec une équipe IT volontairement réduite.',
      highlights: [
        'Infrastructure hyperconvergée Dell VxRail / VMware, sauvegardes Veeam avec PRA réellement testé.',
        'Interconnexion France ↔ USA : MPLS Orange puis bascule progressive vers un SASE (Cato Networks).',
        'Migration de la messagerie on-premise vers Exchange Online / Entra ID, MFA généralisé, Intune.',
        'Sécurité : EDR/XDR et SOC managé, filtrage mail (Hornetsecurity), campagnes anti-phishing, audits.',
        'Téléphonie Mitel MiVoice 5000 / MiCollab, réseau industriel segmenté (VLAN, QoS machines).',
        'Développement d’outils internes : formulaires qualité, portail RH, gestion de parc (GLPI), scripts PowerShell.',
        'Renouvellement d’infrastructure 2026 : étude Proxmox / XCP-ng / Azure Local face à la politique tarifaire Broadcom.',
      ],
      stack: ['VMware VxRail', 'Windows Server', 'Linux', 'Microsoft 365', 'Entra ID', 'Cato SASE', 'Veeam', 'Mitel', 'GLPI', 'PowerShell', 'Docker'],
    },
    {
      company: 'Atelier du Bocage',
      role: 'Technicien électronicien',
      period: '2018',
      start: 2018,
      end: 2018,
      location: 'Deux-Sèvres',
      summary: 'Réparation et reconditionnement de smartphones et tablettes en salle blanche ; audit électronique et amélioration des contrôles qualité.',
      highlights: ['Diagnostic et réparation composants', 'Processus de contrôle qualité'],
      stack: ['Électronique', 'Contrôle qualité'],
    },
    {
      company: 'Auger Jean-Paul',
      role: 'Employé bureau d’études',
      period: '2017',
      start: 2017,
      end: 2017,
      summary: 'Préparation et suivi de dossiers d’appels d’offres photovoltaïques, assistance administrative et technique aux projets.',
      highlights: ['Dossiers d’appels d’offres', 'Suivi de projets'],
      stack: ['Photovoltaïque', 'Gestion de projet'],
    },
    {
      company: 'SOS Data',
      role: 'Technicien support & réseaux',
      period: '2016',
      start: 2016,
      end: 2016,
      summary: 'Support utilisateurs niveau 1, supervision d’un datacenter, développement d’outils internes et automatisation des sauvegardes clients.',
      highlights: ['Supervision datacenter', 'Automatisation des sauvegardes'],
      stack: ['Support N1', 'Supervision', 'Sauvegardes'],
    },
    {
      company: 'Structures éducatives et technologiques — Tokyo',
      role: 'Support informatique & enseignement',
      period: '2015 – 2016',
      start: 2015,
      end: 2016,
      location: 'Tokyo, Japon',
      summary: 'Un an au Japon : support de proximité bilingue pour des structures internationales, développement mobile léger, traduction technique et animation de cours.',
      highlights: ['Support multilingue et documentation locale', 'Sensibilisation sécurité et cloud'],
      stack: ['Support', 'Mobile', 'Enseignement'],
    },
    {
      company: 'Dédiweb',
      role: 'Fondateur & développeur',
      period: '2014 – 2015',
      start: 2014,
      end: 2015,
      summary: 'Création d’une offre d’hébergement et gestion des serveurs ; logiciels sur mesure pour des PME locales.',
      highlights: ['Hébergement et administration de serveurs', 'Développement web sur mesure'],
      stack: ['Hébergement', 'Linux', 'Web'],
    },
    {
      company: 'École des Mines',
      role: 'Développeur logiciel',
      period: '2013 – 2014',
      start: 2013,
      end: 2014,
      summary: 'Cadrage fonctionnel et réalisation d’un outil de gestion d’élèves, d’une plateforme web et d’un outil de gestion de parc informatique.',
      highlights: ['Cahier des charges', 'Développement web', 'Gestion de parc'],
      stack: ['Web', 'Gestion de parc'],
    },
  ] satisfies Experience[],

  skills: [
    { name: 'Réseaux & télécoms', icon: 'network', items: ['Alcatel-Lucent OmniSwitch', 'VLAN & QoS industrielle', 'MPLS / SD-WAN / SASE (Cato)', 'VPN IPsec & SSL', 'Wi-Fi entreprise', 'Mitel MiVoice / MiCollab', 'Fibre FTTO/FTTH'] },
    { name: 'Systèmes & virtualisation', icon: 'server', items: ['VMware vSphere / VxRail', 'Proxmox VE', 'Windows Server, AD, GPO', 'Linux Debian / Ubuntu', 'Veeam, PRA/PCA', 'Stockage SAN & NAS', 'Onduleurs, salle serveur'] },
    { name: 'Cybersécurité opérationnelle', icon: 'shield', items: ['EDR / XDR & SOC managé', 'MFA, accès conditionnel', 'Filtrage mail & anti-phishing', 'Segmentation, firewalls Stormshield', 'Sauvegardes immuables', 'Audits, NIS2, RGPD'] },
    { name: 'Cloud & identité', icon: 'cloud', items: ['Microsoft 365 / Exchange Online', 'Entra ID, Intune, Autopilot', 'Hybride AD ↔ Entra', 'Azure (Local, Files)', 'OVHcloud', 'Cloudron & self-hosting'] },
    { name: 'Automatisation & dev', icon: 'terminal', items: ['PowerShell', 'Bash', 'Docker / Compose', 'GitLab CI, GitHub', 'React / TypeScript', 'PHP, SQL, API REST', 'Power Automate'] },
    { name: 'Gouvernance DSI', icon: 'briefcase', items: ['Budget & contrats', 'Pilotage fournisseurs', 'Gestion de parc (GLPI)', 'Inventaire & risques', 'Conformité', 'Support & formation utilisateurs'] },
  ] satisfies SkillGroup[],

  expertise: [
    { title: 'Infrastructure d’une PME industrielle', text: 'Concevoir et faire tourner une infra hybride avec une équipe réduite : virtualisation, stockage, sauvegardes, réseau industriel, téléphonie.' },
    { title: 'Microsoft 365 & identité', text: 'Migrer, sécuriser et administrer un tenant : Exchange Online, Entra ID, MFA, Intune, licences et Copilot.' },
    { title: 'Réseau multi-sites', text: 'Relier des sites en France et aux États-Unis avec du MPLS puis du SASE, sans casser la production.' },
    { title: 'Sécurité pragmatique', text: 'EDR, SOC, filtrage mail, campagnes de sensibilisation : des mesures qui tiennent dans un budget de PME.' },
    { title: 'Self-hosting & outillage', text: 'Packager et auto-héberger des outils (GLPI, OpenVAS, ISO manager…) sur Cloudron, écrire les scripts qui manquent.' },
    { title: 'Arbitrages technologiques', text: 'Comparer, chiffrer et trancher : VMware vs Proxmox vs XCP-ng vs Azure Local, MPLS vs SASE, on-premise vs cloud.' },
  ],

  certifications: [] as Certification[],

  technologies: [
    'Windows Server', 'Active Directory', 'GPO', 'Exchange Online', 'Entra ID', 'Intune', 'Microsoft 365', 'Copilot',
    'VMware vSphere', 'Dell VxRail', 'Proxmox VE', 'XCP-ng', 'Veeam', 'Dell PowerEdge', 'iDRAC', 'Dell PowerVault',
    'Debian', 'Ubuntu', 'Docker', 'Cloudron', 'GLPI', 'GitLab', 'GitHub', 'Nginx', 'Apache',
    'Alcatel-Lucent OmniSwitch', 'Cato Networks', 'Orange Business MPLS', 'Stormshield', 'IPsec', 'Mitel MiVoice 5000', 'MiCollab',
    'Hornetsecurity', 'SentinelOne', 'OpenVAS', 'PowerShell', 'Bash', 'TypeScript', 'React', 'PHP', 'SQL', 'Power Automate',
  ],
} as const;

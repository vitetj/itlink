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
      company: 'Ixapack Global — machines d’emballage',
      role: 'DSI, DevOps & administrateur systèmes',
      period: '2019 – aujourd’hui',
      start: 2019,
      location: 'Mauléon (79) · filiale aux États-Unis',
      summary:
        'Responsable unique du système d’information d’une PME industrielle présente en France, en Espagne et aux États-Unis : infrastructure, réseau, sécurité, Microsoft 365, téléphonie, développement d’outils internes, achats et pilotage des prestataires, avec un alternant et des stagiaires encadrés.',
      highlights: [
        'Infrastructure hyperconvergée Dell VxRail / VMware (une centaine de VM Windows et Linux), sauvegardes Veeam, plan de reprise testé.',
        'Migration de la messagerie : Exchange 2013 → 2019 sur Windows Server 2025, hybridation Entra Connect / ADFS, bascule vers Exchange Online, puis décommissionnement du dernier serveur hybride.',
        'Tenant Microsoft 365 hybride : Business Premium puis E7, MFA généralisé, accès conditionnel, Intune et Autopilot, Security Copilot.',
        'Refonte WAN/LAN/sécurité 2025-2026 : cluster Stormshield SN720 en HA, MPLS Orange, SASE Cato Networks avec SOC managé, interconnexion OVHcloud en BGP, ZTNA sur tout le parc.',
        'Téléphonie Mitel MiVoice 5000 / MiCollab sur trunk SIP, flotte mobile Samsung Enterprise, eSIM et double opérateur.',
        'Conception et déploiement de l’infrastructure réseau et téléphonie de la filiale américaine (UniFi, IPsec, bascule 4G → fibre).',
        'Sécurité et conformité : EDR, filtrage mail, campagnes anti-phishing, PKI interne, réponse NIS2, charte informatique, dossier assureur cyber.',
        'Outils internes : helpdesk Zammad, déploiement WAPT, GLPI, plateforme Cloudron (30+ applications auto-hébergées), scripts PowerShell, pipelines GitLab CI, applications web métier.',
        'Gouvernance : roadmap SI pluriannuelle chiffrée, inventaire logiciels et risques, rapports d’architecture, arbitrage VMware / Proxmox / XCP-ng / Azure Local.',
      ],
      stack: ['VMware VxRail', 'Windows Server', 'Active Directory', 'Exchange', 'Microsoft 365', 'Entra ID', 'Intune', 'Linux', 'Stormshield', 'Cato SASE', 'Mitel', 'Veeam', 'Cloudron', 'GLPI', 'WAPT', 'PowerShell', 'Docker', 'GitLab'],
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

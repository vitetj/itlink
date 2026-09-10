---
title: "DNS d'entreprise sécurisé : Active Directory, AdGuard Home puis Cloudflare Gateway"
description: "Parti d'une envie de bloquer les pubs, arrivé à une chaîne DNS à trois étages : AD en interne, AdGuard Home en LAN et en DMZ, Cloudflare Gateway en sortie chiffrée, avec filtrage et journaux pour le SOC."
published: 2026-03-14
category: reseau
status: en production
stack: [Active Directory DNS, AdGuard Home, Cloudflare Gateway, DNS over TLS, DNS over HTTPS, SEKOIA]
tags: [dns, adguard-home, cloudflare, doh, dot, securite]
featured: false
---

À l'origine, je voulais bloquer les pubs sur YouTube. Puis j'ai vrillé. Le résultat s'appelle « DNS d'entreprise sécurisé », il occupe quatre machines et un compte Cloudflare, et il tourne aujourd'hui pour tout le site. Le point de départ était futile, le point d'arrivée ne l'est pas : le DNS est le premier service que contacte un poste compromis, et c'est celui que presque personne ne surveille.

Mon objectif, une fois la crise de lucidité passée, tenait en une liste que j'ai cochée point par point : DNS chiffré en sortie de site, filtrage des domaines malveillants, blocage du DNS tunneling et des contournements par DoH, journaux exploitables par le SOC, et haute disponibilité, parce qu'un DNS qui tombe, c'est une entreprise qui s'arrête.

## Matériel / stack

- **Active Directory DNS**, sur les contrôleurs de domaine. Il reste l'autorité pour la zone interne et le seul serveur DNS que les postes connaissent. Rien ne change pour eux.
- **AdGuard Home, deux instances sur le LAN**, en redirecteurs des serveurs AD. C'est là que se fait le filtrage local et que les requêtes sont chiffrées avant de sortir.
- **AdGuard Home, deux instances en DMZ publique**, avec des noms dédiés et un certificat valide, pour les postes nomades, les mobiles et les accès VPN qui ne passent pas par le LAN.
- **Cloudflare Gateway**, en résolveur amont, avec une « DNS location » par point de sortie, joint en DoT ou en DoH. C'est lui qui porte les catégories de sécurité et les journaux.
- **SEKOIA**, le SIEM du SOC, en destination des journaux.

Le schéma tient en deux lignes :

```text title="Chaîne de résolution"
Interne : poste → DNS AD → AdGuard Home LAN (x2) → Cloudflare Gateway (DoT/DoH) → Internet
Externe : nomade / mobile / VPN → AdGuard Home DMZ (x2, FQDN dédiés) → Cloudflare Gateway → Internet
```

## Mise en place

### Cloudflare Gateway : la location et les règles

Dans la console Zero Trust, je crée une DNS location par point de sortie. Chaque location fournit ses points d'accès DoH et DoT, de la forme `https://<identifiant>.cloudflare-gateway.com/dns-query` et `<identifiant>.cloudflare-gateway.com` sur le port 853. Les règles DNS de Gateway font le travail de fond : blocage des catégories de sécurité (malware, phishing, commande et contrôle), blocage du DNS tunneling, et blocage des domaines des résolveurs DoH publics connus pour que personne ne contourne la chaîne depuis un navigateur.

### AdGuard Home : chiffrer en amont, garder l'interne en interne

Le point délicat est de ne surtout pas envoyer la zone Active Directory vers l'extérieur. AdGuard Home sait router un domaine vers un serveur précis : la zone interne retourne vers les contrôleurs de domaine, tout le reste part vers Gateway, chiffré.

```yaml title="Extrait de la configuration AdGuard Home (LAN)"
dns:
  bind_hosts:
    - 0.0.0.0
  upstream_dns:
    - "[/ad.example.com/]192.0.2.10 192.0.2.11"
    - tls://<identifiant>.cloudflare-gateway.com
    - https://<identifiant>.cloudflare-gateway.com/dns-query
  bootstrap_dns:
    - 1.1.1.1
    - 1.0.0.1
  upstream_mode: parallel
  use_private_ptr_resolvers: true
  local_ptr_upstreams:
    - 192.0.2.10
    - 192.0.2.11
```

Le mode `parallel` interroge les deux transports et garde le premier qui répond, ce qui rend la panne d'un chemin invisible. Les résolveurs PTR privés renvoient les requêtes inverses des plages internes vers AD, sinon vos journaux se remplissent d'adresses au lieu de noms.

### Active Directory : rediriger vers AdGuard

Sur chaque contrôleur de domaine, les redirecteurs pointent vers les deux instances AdGuard du LAN, et les indications de racine sont désactivées pour qu'aucune requête ne parte en clair si les deux tombent.

```powershell title="Redirecteurs DNS sur un contrôleur de domaine"
Set-DnsServerForwarder -IPAddress 192.0.2.53, 192.0.2.54 -UseRootHint $false
Get-DnsServerForwarder
```

### Pare-feu : fermer la porte de derrière

Une chaîne DNS chiffrée ne sert à rien si un poste peut contacter directement un résolveur public. Trois règles sur le pare-feu de site :

1. Seuls les serveurs AD peuvent joindre les AdGuard LAN sur le port 53.
2. Seuls les AdGuard peuvent sortir en 853 (DoT) et en 443 vers les points d'accès Gateway.
3. Tout autre flux sortant en 53 et en 853 est bloqué et journalisé. Le journal est intéressant : c'est là qu'on découvre l'équipement qui avait un DNS public codé en dur.

### DMZ : le même AdGuard, en façade

Les deux instances en DMZ écoutent en DoT et en DoH sur des noms dédiés, avec un certificat public. Les mobiles utilisent le « DNS privé » d'Android en pointant sur le nom, les postes nomades reçoivent la configuration DoH. Elles n'ont aucune route vers le LAN : leur seul amont est Gateway, et la zone interne ne s'y résout pas, volontairement.

### Journaux : Gateway vers le SOC

Les journaux DNS de Gateway partent vers le SIEM du SOC par export en continu. Côté AdGuard, le journal de requêtes reste local avec une rétention courte : il sert au diagnostic, pas à la détection.

## Ce que ça donne

Pour l'utilisateur, rien n'a changé, et c'est le résultat le plus important : le poste continue d'interroger AD, la zone interne se résout comme avant, et le tunnel SASE Always-On n'a rien à voir avec cette chaîne, il la traverse.

Pour moi : plus une seule requête DNS ne sort du site en clair, les catégories malveillantes sont bloquées avant même qu'une connexion soit tentée, les tentatives de DNS tunneling et de contournement DoH deviennent visibles, et le SOC dispose d'un journal DNS complet à corréler avec l'EDR. C'est exactement le genre de journal qu'on aimerait avoir sous la main le jour où l'EDR isole un poste.

Et les pubs YouTube ? Elles sont toujours là. Elles sont servies depuis les mêmes domaines que les vidéos, un filtre DNS ne peut rien contre elles. Le projet a donc totalement échoué sur son objectif initial et réussi sur tous les autres, ce qui est une assez bonne définition d'un projet d'infrastructure.

## Limites et suite

- **Haute disponibilité.** Deux instances par étage, mais les serveurs AD n'ont que deux redirecteurs et un basculement qui dépend des délais d'attente. Une adresse virtuelle devant les AdGuard LAN serait plus propre.
- **Le contournement applicatif.** Un navigateur configuré en DoH vers un résolveur inconnu est bloqué par Gateway et par le pare-feu, mais une application qui embarque sa propre résolution chiffrée sur un port banal passe. C'est un travail pour l'inspection TLS du SASE, pas pour le DNS.
- **La question contractuelle.** Gateway est-il inclus dans le contrat Cloudflare Enterprise porté par le partenaire ? La question a été posée au MSSP, et la réponse conditionne le WAF Cloudflare, qui est le sujet suivant.
- **L'agent SASE.** Un agent Always-On apporte son propre DNS et peut casser la résolution interne s'il n'est pas configuré pour la laisser tranquille ; c'est un autre article : [Diagnostiquer une résolution DNS interne cassée par un client VPN tiers ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/). Et pour le comportement de l'agent lui-même sur le LAN, voyez [Agent Cato : Office Mode, Always-On et bypass temporaire contrôlé](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/).

La procédure interne est rédigée en Markdown, ce qui a nécessité d'expliquer à quelques collègues ce qu'est un lecteur Markdown. C'est peut-être la partie du projet qui a pris le plus de temps.

<!-- source : mail « Cloudflare Gateway waf ? » et procédure DNS sécurisé jointe, 2026-03-13 -->

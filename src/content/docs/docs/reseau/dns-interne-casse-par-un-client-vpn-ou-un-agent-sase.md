---
title: "Diagnostiquer une résolution DNS interne cassée par un client VPN tiers ou un agent SASE"
description: "Le poste pingue mais ne résout plus les noms internes ? Avant d'accuser le DNS de l'AD : l'onglet DNS de la carte, nslookup interne et public, la route, puis l'agent SASE. Deux cas réels, dont une annonce BGP oubliée."
published: 2026-08-07
category: reseau
tags: [dns, vpn, sase, cato, windows-11, diagnostic]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 11, Cato Client]
sidebar:
  label: "Diagnostiquer une résolution DNS…"
---

Deux tickets, à quelques semaines d'écart, même symptôme : « je n'arrive plus à joindre les ressources internes ».
Le poste a une adresse, Internet passe, les serveurs répondent au ping par adresse IP. Mais par leur nom, rien.

Premier cas : un utilisateur qui travaille avec un partenaire avait installé le client VPN de ce partenaire. Ce
client avait écrit ses propres serveurs DNS dans les paramètres avancés de la carte réseau du poste. Le poste
demandait donc à un DNS externe où se trouvait `srv-fichiers.ad.example.com`, et cet externe répondait
honnêtement qu'il n'en savait rien.

Deuxième cas, plus coriace : le déploiement d'un agent SASE (Cato) en mode always-on sur des postes du LAN. Le
poste pinguait les serveurs, ne résolvait pas les noms internes, un nom public de l'éditeur de l'agent se
résolvait en adresse privée, et un `tracert` vers un serveur interne ne sortait jamais du cœur de réseau. Le
support de l'éditeur a joué les passe-plats pendant des semaines. La cause finale : une annonce BGP manquante
pour un réseau interne, côté interconnexion avec le fournisseur. Corrigée le jour même où on l'a trouvée.

La leçon vaut pour les deux : le DNS de l'Active Directory est le premier accusé et rarement le coupable. Cette
fiche déroule la méthode dans l'ordre, de la carte réseau à la table de routage.

## Prérequis

- Un compte administrateur local sur le poste : les commandes de lecture passent sans élévation, la correction
  en demande une.
- L'adresse de vos serveurs DNS internes (ici `10.0.0.10` et `10.0.0.11`) et votre suffixe (`ad.example.com`).
- Un hôte interne de référence (`srv-fichiers.ad.example.com`) et un nom public quelconque pour comparer.

## Regarder d'abord l'onglet DNS de chaque carte réseau

C'est le réflexe numéro un, celui que je répète dans chaque réponse de ticket. Par le panneau de configuration :
**Connexions réseau → Propriétés de la carte → Protocole Internet version 4 → Avancé → onglet DNS**. Faites-le
pour chaque carte : Ethernet, Wi-Fi, et chaque adaptateur virtuel créé par un client VPN ou un agent. En
PowerShell, c'est plus rapide et plus complet :

```powershell title="Serveurs DNS par interface"
Get-DnsClientServerAddress -AddressFamily IPv4 | Format-Table InterfaceAlias, ServerAddresses -AutoSize
ipconfig /all
```

Ce que vous cherchez : une carte en DHCP qui affiche des serveurs DNS qui ne sont pas les vôtres. Le bail DHCP
n'y est pour rien ; quelqu'un, humain ou logiciel, les a fixés à la main. Pour revenir aux serveurs fournis par
le DHCP :

```powershell title="Rendre la main au DHCP"
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ResetServerAddresses
Clear-DnsClientCache
```

:::caution
Un client VPN qui a forcé des DNS une fois le refera probablement à sa prochaine connexion. Documentez le cas
dans le ticket et demandez à l'éditeur du client un réglage en split DNS : son suffixe vers ses serveurs, tout le
reste vers les vôtres. Sinon vous rejouerez cette fiche tous les lundis.
:::

## Comparer le DNS interne et un DNS public

Une fois la carte propre, faites parler les serveurs eux-mêmes. `nslookup` sans second argument interroge le
serveur configuré ; avec un second argument, il interroge celui que vous désignez.

```powershell title="Même question, deux serveurs"
nslookup srv-fichiers.ad.example.com
nslookup srv-fichiers.ad.example.com 10.0.0.10
Resolve-DnsName srv-fichiers.ad.example.com -Server 10.0.0.10
```

| Résultat | Lecture |
| --- | --- |
| Échec par défaut, succès en désignant `10.0.0.10` | Le poste n'interroge pas le bon serveur : carte, métriques ou NRPT |
| Échec dans les deux cas, ping de `10.0.0.10` OK | Le service DNS ne répond pas, ou le port 53 est filtré sur le chemin |
| Échec dans les deux cas, ping de `10.0.0.10` KO | Problème de routage, passez à la section suivante |
| Un nom public renvoie une adresse privée | Un intermédiaire répond à la place du DNS : agent, proxy, interception |
| Tout se résout mais la connexion échoue | Ce n'est pas le DNS ; routage ou pare-feu |

Le quatrième cas est exactement ce que l'agent SASE a produit. Un nom public qui se résout en `10.x` n'est pas
une réponse de votre AD ; c'est la signature d'un agent qui intercepte les requêtes et les traite dans son tunnel.

## Vérifier qui gagne entre deux cartes : métriques et NRPT

Quand un poste a plusieurs interfaces actives, Windows envoie ses requêtes DNS de préférence sur celle qui a la
métrique la plus basse. Les adaptateurs VPN se donnent souvent une métrique très faible pour capter le trafic.
Ensuite, la table NRPT (Name Resolution Policy Table) peut router un suffixe précis vers des serveurs précis ;
les clients VPN, les agents SASE et les GPO y écrivent.

```powershell title="Métriques et règles NRPT"
Get-NetIPInterface -AddressFamily IPv4 | Sort-Object InterfaceMetric |
  Format-Table InterfaceAlias, InterfaceMetric, ConnectionState -AutoSize
Get-DnsClientNrptPolicy
```

Un adaptateur VPN en tête de liste sans règle NRPT pour votre suffixe signifie que `ad.example.com` part dans
le tunnel du partenaire. La bonne correction est chez l'éditeur du client (une règle NRPT limitée à son
suffixe). En attendant, relever la métrique de l'adaptateur VPN avec `Set-NetIPInterface -InterfaceMetric`
dépanne, mais sera écrasé à la prochaine mise à jour du client.

## Suivre la route quand le DNS est hors de cause

Si les noms se résolvent, ou si le serveur DNS lui-même est injoignable, le problème est en dessous.

```powershell title="Routage"
route print -4
tracert srv-fichiers.ad.example.com
tracert nom-public.example.org
Test-NetConnection srv-fichiers.ad.example.com -Port 445
```

Dans le cas de l'agent SASE, le `tracert` vers un serveur interne ne sortait jamais du cœur de réseau : les
paquets tournaient au premier saut. Ce n'est pas un symptôme DNS, c'est un symptôme de routage, et il a fallu
le regarder en face plutôt que de continuer à ouvrir des tickets « résolution de noms ». Comparez toujours un
`tracert` interne et un `tracert` public : si le public sort et pas l'interne, le chemin vers vos réseaux
internes est cassé quelque part entre le poste et le serveur.

## Agent SASE : mode, split tunneling et routes annoncées

Un agent SASE always-on ajoute trois questions à la liste.

1. **Le mode.** Sur le LAN, l'agent doit-il rester en tunnel complet ou détecter qu'il est au bureau (Office
   Mode) et laisser le trafic local passer par le réseau local ? Un agent en tunnel complet sur le LAN envoie vos
   requêtes DNS internes vers le cloud de l'éditeur, qui doit ensuite les ramener vers vos serveurs.
2. **Le split tunneling.** Quels préfixes sont exclus du tunnel ? Vos réseaux internes doivent y figurer, ou
   bien être correctement routés depuis le cloud de l'éditeur vers votre site.
3. **Les routes annoncées.** Si votre site est raccordé au cloud SASE par une interconnexion en BGP, l'éditeur ne
   connaît de vos réseaux que ce que vous lui annoncez. Un réseau oublié dans l'annonce est invisible depuis le
   tunnel : les requêtes DNS vers un serveur de ce réseau partent et ne reviennent jamais.

C'est ce troisième point qui a réglé l'affaire. Personne au support ne l'a trouvé ; c'est en croisant les trois
constats, un nom public résolu en adresse privée, un `tracert` qui tourne en rond, et la liste des préfixes
annoncés en BGP, que le réseau manquant est apparu. Demandez à votre intégrateur la liste des préfixes que le
cloud SASE a appris de votre site, et comparez-la à votre plan d'adressage. C'est une ligne de commande de leur
côté, et ça vous évite des semaines.

:::tip
Quand vous ouvrez un ticket chez un éditeur, joignez d'emblée la sortie des commandes de cette fiche : DNS par
interface, `nslookup` avec et sans serveur, `route print`, les deux `tracert`. Un support qui reçoit des faits
bruts avance plus vite qu'un support qui reçoit « ça ne marche pas ».
:::

## Pour aller plus loin

- Le comportement de l'agent au bureau et ses exceptions :
  [Agent Cato : Office Mode, always-on et bypass contrôlé](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/).
- L'interconnexion et les annonces BGP côté site :
  [OVHcloud Connect vers Cato via Equinix Fabric en BGP](/docs/cloud-web/ovhcloud-connect-vers-cato-via-equinix-fabric-bgp/).
- Le retour d'expérience global :
  [Du MPLS au SASE : ce que personne ne vous dit](/blog/du-mpls-au-sase-ce-que-personne-ne-vous-dit/).

<!-- source : ticket « accès réseau », 2026-08-06 ; mails « Projet MicroSOC SHIELD », 2026-06-10, et « Point global sur le déploiement Cato », 2026-07-21 -->

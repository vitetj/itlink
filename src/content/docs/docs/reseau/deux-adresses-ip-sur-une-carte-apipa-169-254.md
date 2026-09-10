---
title: "Deux adresses IP sur une même carte réseau : comprendre l'APIPA 169.254.x.x"
description: "Une adresse en 169.254 qui apparaît à côté de votre IP habituelle n'est pas un virus ni un bug : c'est Windows qui s'auto-attribue une adresse faute de DHCP. D'où ça vient, quand c'est normal, et quoi faire."
published: 2024-09-10
category: reseau
tags: [apipa, dhcp, adressage-ip, windows, automates]
level: débutant
status: à jour
featured: false
tested_on: [Windows 10, Windows 11]
sidebar:
  label: "Deux adresses IP sur une même carte…"
---

Un automaticien m'a envoyé un jour une capture d'écran inquiète : `ipconfig` affichait deux adresses sur sa carte
réseau, la bonne, et une autre en `169.254.x.x` sortie de nulle part. Rien de grave. Cette plage a un nom, APIPA, et
un comportement parfaitement documenté. Mais quand on la découvre sur un PC qui parle à des machines de production,
mieux vaut comprendre ce qu'elle raconte.

## Ce qu'est une adresse 169.254.x.x

APIPA (Automatic Private IP Addressing) est le mécanisme par lequel Windows, faute de réponse d'un serveur DHCP,
s'attribue tout seul une adresse dans la plage `169.254.0.0/16`. C'est la plage « link-local » IPv4 définie par la
RFC 3927 : elle n'est jamais routée, elle ne sert qu'à parler aux machines directement branchées sur le même segment.

Le raisonnement du système est simple :

1. la carte est active, un câble est branché ;
2. le poste envoie une demande DHCP (`DHCPDISCOVER`) ;
3. personne ne répond dans le délai ;
4. le poste choisit une adresse au hasard dans `169.254.1.0` à `169.254.254.255`, vérifie par ARP qu'elle n'est pas déjà
   prise, et l'utilise.

Il continuera à retenter le DHCP régulièrement. Si un serveur finit par répondre, l'adresse APIPA disparaît.

## Pourquoi on en voit deux sur la même carte

C'est le cas qui surprend. Une carte réseau peut avoir une adresse fixe **et** une adresse APIPA en même temps si :

- la carte est configurée en IP statique, mais Windows a aussi un profil en DHCP actif sur la même interface (typique
  après une configuration à moitié faite, ou avec l'option « Configuration alternative ») ;
- un logiciel a ajouté une adresse secondaire ;
- la carte est en DHCP, a reçu un bail, puis l'a perdu partiellement (le bail expiré reste affiché quelques instants).

Sur un poste d'automaticien, le scénario le plus fréquent est plus simple : la **deuxième carte** (ou le port Ethernet
USB) est branchée directement sur un automate ou un variateur, sans aucun serveur DHCP de l'autre côté. Windows fait
alors exactement ce qu'on lui a demandé : il s'auto-attribue une adresse en attendant un DHCP qui ne viendra jamais.

:::note
Ce comportement est propre à la carte, pas au PC. Chaque interface (Ethernet, Wi-Fi, USB, VPN) mène sa propre vie et
peut afficher sa propre adresse APIPA.
:::

## Vérifier ce qui se passe

Depuis une invite de commandes ou PowerShell :

```powershell title="Voir toutes les adresses et leur origine"
Get-NetIPAddress -AddressFamily IPv4 |
  Select-Object InterfaceAlias, IPAddress, PrefixOrigin, SuffixOrigin, AddressState |
  Format-Table -AutoSize
```

Une adresse APIPA apparaît avec `PrefixOrigin` et `SuffixOrigin` à `WellKnown` et `Link`. Une adresse reçue par
DHCP affiche `Dhcp`, une adresse fixe affiche `Manual`.

Pour vérifier qu'un serveur DHCP est censé répondre sur cette interface :

```cmd title="Relancer une demande DHCP"
ipconfig /release "Ethernet 2"
ipconfig /renew "Ethernet 2"
```

Si `renew` échoue avec « Impossible de contacter votre serveur DHCP », le diagnostic est fait : sur ce segment, personne
ne distribue d'adresses. Ce n'est pas forcément un problème.

## Quand c'est normal, quand ça ne l'est pas

| Situation | APIPA attendue ? | Que faire |
| --- | --- | --- |
| Carte reliée directement à un automate, un variateur, une IHM | Oui | Fixer une IP statique dans le sous-réseau de la machine |
| Carte reliée au réseau bureautique de l'entreprise | Non | Vérifier le câble, le port du switch, le VLAN, puis le serveur DHCP |
| Poste en Wi-Fi qui vient de changer de réseau | Parfois, quelques secondes | Attendre, ou `ipconfig /renew` |
| Carte USB-Ethernet branchée sans câble | Oui | Rien |
| Deux adresses sur la carte reliée au réseau de l'entreprise | Non | Nettoyer la configuration IP (voir ci-dessous) |

## Corriger sur un poste d'atelier

Pour une carte dédiée à une machine, la bonne pratique est de lui donner une adresse fixe dans le réseau de la machine,
et rien d'autre :

```powershell title="Fixer une IP statique sur la carte machine (exemple)"
New-NetIPAddress -InterfaceAlias "Ethernet 2" -IPAddress 192.0.2.50 -PrefixLength 24
Set-DnsClientServerAddress -InterfaceAlias "Ethernet 2" -ResetServerAddresses
```

Ne mettez pas de passerelle par défaut sur cette carte : le poste en a déjà une sur le réseau bureautique, et deux
passerelles par défaut sont la recette classique du « ça marche une fois sur deux ».

Si une adresse APIPA persiste sur une carte censée être en DHCP, vérifiez l'onglet **Configuration alternative** des
propriétés IPv4 : « Adresse IP privée automatique » est le réglage par défaut, et c'est lui qui produit le 169.254.

:::tip
Sur un réseau de machines, laissez le DHCP hors jeu volontairement. Les équipements industriels aiment les adresses
qui ne bougent pas, et un serveur DHCP oublié sur ce segment est un excellent moyen de mettre une ligne de production
à l'arrêt un lundi matin.
:::

## Pour aller plus loin

- [Réseaux machines industrielles : ne jamais mélanger réseau machine, télémaintenance et LAN](/docs/architecture/segmenter-les-reseaux-machines-industrielles/)
- [Diagnostiquer une résolution DNS interne cassée par un client VPN tiers ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/)
- La RFC 3927 décrit précisément le mécanisme link-local IPv4.

<!-- source : mail « 2 adresses ip sur une même carte », 2024-09-09 -->

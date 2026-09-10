---
title: "Réseaux machines industrielles : ne jamais mélanger réseau machine, télémaintenance et LAN bureautique"
description: "Trois architectures possibles pour le réseau d'une machine industrielle, pourquoi une seule tient la route, et le rappel à faire au SAV : les adresses publiques n'ont rien à faire dans un automate."
published: 2026-07-22
category: architecture
tags: [ot, automates, adressage-ip, ewon, segmentation, telemaintenance]
level: avancé
status: à jour
featured: false
---

Dans une PME qui conçoit des machines, le réseau ne s'arrête pas à la porte du bureau d'études. Chaque machine embarque son propre réseau : un automate, des variateurs, une IHM, et un routeur de télémaintenance pour que le SAV puisse intervenir chez le client. Ce réseau est conçu par les automaticiens, pas par le service informatique, et pendant longtemps personne n'a vraiment tranché la question de son architecture. En mai 2026, mon collègue responsable informatique a formalisé trois options pour le service automatisme. Deux mois plus tard, j'ai dû envoyer un rappel à tout le monde parce que des machines partaient chez des clients avec des adresses IP publiques. Ces deux épisodes tiennent en un principe : le réseau machine, la télémaintenance et le LAN bureautique sont trois mondes, et ils ne se mélangent pas.

## Prérequis

- Savoir ce qu'il y a dans une machine : automate (Rockwell chez nous), variateurs, IHM, capteurs intelligents, routeur de télémaintenance EWON avec le service talk2m.
- Connaître les plages privées de la RFC 1918 et savoir expliquer à un non-informaticien pourquoi elles existent.
- Avoir la main, ou au moins la voix, sur le standard d'adressage des machines avant qu'elles ne quittent l'atelier.

## Comparer les trois architectures possibles

Voici les trois options telles qu'elles ont été présentées au service automatisme. Le vocabulaire est volontairement le leur.

| Option | Principe | Avantages | Inconvénients |
| --- | --- | --- | --- |
| 1. Deux réseaux par machine + un VPN EWON | Un réseau privé pour les variateurs et composants, un réseau d'échange et de télémaintenance pour l'IHM et l'automate | Plus sûr, déjà en place, modulable | Deux interfaces à configurer par machine |
| 2. Une seule carte, masque large sur l'automate | Tout le monde dans le même sous-réseau, l'automate voit tout | Simple à câbler | Hors bonnes pratiques : aucune frontière, un composant compromis voit tout |
| 3. Une carte + EWON + pare-feu par machine | Un pare-feu physique dans chaque machine | Sûr | Complexe, coûteux, un équipement de plus à maintenir chez le client |

L'option 1 a été retenue, et pas seulement parce qu'elle était déjà en place. Elle sépare ce qui doit l'être sans ajouter de boîtier : le réseau privé des variateurs ne sort jamais de la machine, le réseau d'échange est le seul que le client et le SAV voient.

### Le réseau privé de la machine

Variateurs, modules d'entrées-sorties déportés, capteurs : tout ce qui parle à l'automate et à personne d'autre. Ce réseau n'a pas besoin de passerelle par défaut, et je recommande de ne pas en mettre. Un variateur qui ne peut pas router vers l'extérieur ne peut pas non plus être atteint depuis l'extérieur.

### Le réseau d'échange et de télémaintenance

L'automate y a une seconde interface, l'IHM aussi, et le routeur EWON. C'est par là que le client remonte ses données de production et que le SAV se connecte en télémaintenance. C'est le seul réseau de la machine dont l'adressage peut avoir à s'adapter à celui du client.

## Comprendre pourquoi le LAN bureautique n'a rien à faire là-dedans

On me demande régulièrement pourquoi je refuse qu'une machine en test dans l'atelier soit branchée directement sur le réseau des bureaux. Trois raisons, dans l'ordre où elles font mal.

**Les conflits de routage.** Une machine est livrée avec un plan d'adressage standard, identique d'une machine à l'autre. Le jour où deux machines sont en test côte à côte, ou le jour où le client a le même plan que nous, deux équipements portent la même adresse et plus rien n'est prévisible. Sur un réseau isolé, ce n'est pas grave. Sur le LAN bureautique, c'est une panne.

**La sécurité.** Un automate ne se met pas à jour comme un poste Windows, ne porte pas d'EDR, et accepte souvent des connexions sans authentification sur ses ports de programmation. Le mettre sur le même réseau que les postes de comptabilité, c'est offrir un rebond gratuit dans les deux sens. Notre EDR a déjà isolé des postes de techniciens à cause d'installateurs d'automatisme jugés trop bavards ; imaginez la même détection sur un automate qui ne sait pas se défendre.

**Le VPN et le MPLS.** Depuis que le site est raccordé à un lien MPLS et à un SASE, chaque réseau interne est annoncé vers l'opérateur et vers le cloud de sécurité. Un réseau machine qui apparaît sur le LAN, c'est un réseau de plus annoncé partout, avec des adresses qui n'ont jamais été validées. Et l'agent SASE en Always-On sur le PC de l'automaticien ajoute sa propre couche : sans split tunnel, le trafic vers l'automate tente de monter dans le tunnel.

:::tip
La règle que j'ai fini par écrire noir sur blanc : une machine en atelier se branche sur le VLAN machines, jamais sur une prise du bureau. Si l'automaticien a besoin des deux en même temps, c'est son PC qui a deux cartes, pas la machine.
:::

## Adresser les machines en plages privées, et rien d'autre

C'est l'épisode de juillet. Des machines ont été configurées par le SAV et les automaticiens avec des adresses en plage publique, du type 203.0.113.x pour prendre un exemple, c'est-à-dire des adresses qui appartiennent à un opérateur quelque part sur Internet. Ça fonctionne, tant que la machine est isolée. Le jour où elle est branchée sur un réseau qui route vers Internet, tout paquet destiné à ces adresses part dans la machine au lieu d'aller vers le site légitime, ou l'inverse. J'ai envoyé un rappel, direction en copie, avec une formule que j'assume : utiliser des adresses publiques en interne est contraire aux bonnes pratiques réseau, et c'est un fondamental de notre métier.

Les plages privées définies par la RFC 1918 sont les seules autorisées dans une machine :

| Plage | Notation | Nombre d'adresses | Usage typique |
| --- | --- | --- | --- |
| 10.0.0.0 – 10.255.255.255 | 10.0.0.0/8 | environ 16 millions | Réseaux d'entreprise, sites multiples |
| 172.16.0.0 – 172.31.255.255 | 172.16.0.0/12 | environ 1 million | Réseaux intermédiaires, DMZ |
| 192.168.0.0 – 192.168.255.255 | 192.168.0.0/16 | 65 536 | Petits réseaux, machines, box |

Un plan d'adressage machine, à titre d'exemple (adaptez les valeurs, l'important est la logique) :

```text title="Exemple de plan d'adressage pour une machine"
Réseau privé machine (variateurs, E/S)     192.168.10.0/24   pas de passerelle
  automate, interface 1                    192.168.10.1
  variateurs                               192.168.10.11 - .49
  E/S déportées                            192.168.10.51 - .99

Réseau d'échange / télémaintenance         192.168.20.0/24   passerelle = EWON
  automate, interface 2                    192.168.20.1
  IHM                                      192.168.20.2
  routeur EWON (côté machine)              192.168.20.254
```

:::danger
Ne validez jamais un « ça marche » obtenu avec une adresse publique. Il marchera jusqu'au jour où la machine sera raccordée à un vrai réseau, chez le client, et ce jour-là c'est le client qui appellera. Et il aura raison.
:::

## Cadrer la télémaintenance

Le routeur EWON monte un VPN sortant vers le service talk2m ; le technicien s'y connecte depuis son PC avec le client de l'éditeur. Deux conséquences d'architecture :

- Le LAN bureautique ne route jamais vers le réseau d'échange d'une machine. La télémaintenance passe par l'EWON, même quand la machine est à dix mètres. Ça paraît absurde, c'est en fait la seule façon d'être certain que la procédure du SAV est la même en atelier et chez le client.
- Côté SASE, chaque client VPN de télémaintenance utilisé chez un client final doit être déclaré et autorisé explicitement, ticket à l'appui, à l'exception du client EWON.

:::note
Si un automaticien vous montre un `ipconfig` avec deux adresses sur la même carte, dont une en 169.254.x.x, ce n'est pas lié : c'est l'APIPA, et c'est expliqué dans [Deux adresses IP sur une même carte réseau](/docs/reseau/deux-adresses-ip-sur-une-carte-apipa-169-254/).
:::

## Pour aller plus loin

- [Agent Cato : Office Mode, Always-On et bypass temporaire contrôlé pour les techniciens](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/), pour la partie split tunnel et déconnexion temporaire.
- [Un poste isolé par l'EDR : que faire](/docs/cybersecurite/poste-isole-par-l-edr-que-faire/), pour les installateurs d'automatisme qui déclenchent l'EDR.
- La RFC 1918, « Address Allocation for Private Internets », qui tient en quelques pages et que tout le monde devrait avoir lue une fois.

<!-- source : mails « Adresse IP » 2026-05-18 → 2026-05-19, « Rappel adresses IP publiques » 2026-07-21, « Rappel sur le fonctionnement du nouveau VPN Cato » 2026-07-21 -->

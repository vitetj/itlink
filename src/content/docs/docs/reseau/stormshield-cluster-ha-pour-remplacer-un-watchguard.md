---
title: "Remplacer un pare-feu WatchGuard par un cluster Stormshield SN720 en haute disponibilité"
description: "Export WSM, plan de VLAN, étiquetage du cœur, relais DHCP, routes de transition et règles stateful : ce qu'un admin solo doit préparer avant l'arrivée du technicien, et les pièges du jour J."
published: 2025-04-14
updated: 2026-06-30
category: reseau
tags: [stormshield, watchguard, haute-disponibilite, vlan, omniswitch, pare-feu]
level: avancé
status: à jour
featured: true
tested_on: ["Stormshield SN720 x2 (SNS v4)", "Alcatel-Lucent OmniSwitch OS6900 en VFL", "WatchGuard WSM 12.11.2", "Routeurs Orange LBB350 (fibre) et LBB154 (4G)"]
sidebar:
  label: "Remplacer un pare-feu WatchGuard par…"
---

Le WatchGuard qui gardait la porte de ma boîte arrivait en bout de course. Le renouvellement s'est joué en deux
mails avec l'opérateur : on me proposait un SN520, j'ai demandé le modèle du dessus. Trois raisons techniques : le
port 10 Gbit/s n'existe qu'à partir du SN720, le SN520 n'est pas évolutif, et le SN720 accepte jusqu'à sept liens
WAN, ce qui compte quand un MPLS, un secours 4G et un accès Internet direct se partagent le même boîtier. Commande
finale : deux SN720 en haute disponibilité et une souscription sur cinq ans.

Pourquoi deux ? Parce qu'un pare-feu unique est le seul point de passage entre vos serveurs, votre téléphonie et
Internet. Quand il tombe, tout tombe, et la production avec. Un cluster actif/passif transforme cette panne en une
ligne de journal que vous lisez le lendemain, café à la main.

Le décor : une PME industrielle, un cœur Alcatel-Lucent OmniSwitch OS6900 en VFL, deux routeurs opérateur pour le
MPLS (fibre et 4G), un routeur Business Internet et un trunk SIP pour la téléphonie Mitel. Quatre jours de mise en
service avec le technicien LAN de l'opérateur, le cluster à côté de l'ancien pare-feu, pas à sa place. Voici ce que
j'ai préparé, et ce qui nous a fait perdre du temps.

## Créer le compte MyStormshield et récupérer l'appliance virtuelle

Le compte MyStormshield porte licences, mises à jour et téléchargements. Créez-le sur une adresse générique de
service (`it@example.com`), pas nominative : votre remplaçant doit pouvoir y entrer. Récupérez-y aussi l'appliance
virtuelle EVA et son kit d'activation : bac à sable le premier jour, routeur chez un hébergeur plus tard.

## Exporter et relire la configuration du WatchGuard

Pas de convertisseur magique : la migration se fait règle par règle. Installez WSM, ouvrez Policy Manager, puis
`Fichier > Ouvrir` sur le XML de configuration. Les NAT se lisent dans `Setup > Actions > SNAT`. Deux enseignements de
cette relecture :

- Les règles de téléphonie (SIP, RTP, passerelle Mitel en DMZ) sont trop sensibles pour être recopiées telles
  quelles. Je les ai retirées du XML et réécrites dans un tableau : source, destination, ports, sens, commentaire.
  C'est ce tableau que le technicien a saisi.
- Chaque NAT 1-on-1 du WatchGuard était doublé d'une règle SNAT. Sur Stormshield, une seule règle de NAT par flux ;
  recopier les deux crée des doublons qui se contredisent.

## Recenser les réseaux et fixer le plan de VLAN

Le technicien vous posera la question que vous évitez depuis des années : quels réseaux n'existent plus ? Faites le
ménage. Le plan retenu chez nous, à adapter :

| VLAN | Rôle | Sur le cluster |
|---|---|---|
| admin | Management du cœur et des bornes | Interface interne, relais DHCP |
| serveurs | Serveurs, contrôleurs de domaine | Interface interne |
| dmz | Services exposés (passerelle Mitel…) | Interface DMZ |
| voix | Téléphonie | Interface interne |
| mgmt-fw | Management des pare-feux | Interface dédiée |
| HA | Synchronisation du cluster | Lien HA, VLAN dédié |

Donnez au VLAN de haute disponibilité un nom explicite, `VLAN10-HA-SN720` : dans deux ans, personne ne se demandera
à quoi sert le VLAN 10.

## Étiqueter les ports du cœur avant de câbler

Le jour J, le technicien branche vite ; sans étiquettes, vous passerez la matinée à suivre des câbles. La syntaxe
OmniSwitch est `châssis/slot/port` ; extrait du plan pour deux boîtiers (A et B) répartis sur les deux châssis :

```text title="Plan de câblage du cœur (extrait)"
1/1/18  "*** SN720-A PORT 10 HA ***"      (vlan admin, non taggé)
1/1/24  "*** SN720-A PORT 1 BI ***"
1/1/25  "*** SN720-A PORT 3 MPLS ***"
1/1/26  "*** BOX BUSINESS INTERNET PORT 0 ***"
2/1/17  "*** SN720-B PORT 10 HA ***"      (vlan admin, non taggé)
2/1/24  "*** SN720-B PORT 1 BI ***"
2/1/25  "*** SN720-B PORT 3 MPLS ***"
```

Le lien de synchronisation HA peut être porté par les deux châssis (`1/1/29` et `2/1/29` chez nous) avec des
modules SFP cuivre et une configuration strictement identique. En AOS :

```bash title="OmniSwitch AOS 8"
interfaces port 1/1/24 alias "*** SN720-A PORT 1 BI ***"
vlan 10 admin-state enable name "VLAN10-HA-SN720"
vlan 10 members port 1/1/29 untagged
```

## Configurer un relais DHCP, pas un serveur

Sur SNS, le relais DHCP et le serveur DHCP sont mutuellement exclusifs : dans `Configuration > Réseau > DHCP`, on
choisit un mode pour tout le boîtier. Si le WatchGuard servait la DMZ ou le Wi-Fi invité, créez ces étendues sur vos
serveurs DHCP Active Directory et laissez le cluster relayer : une seule console pour toutes les réservations.

## Comprendre les zones et les passerelles

Je vais être honnête : le premier jour, j'ai écrit au technicien « je ne comprends pas les notions de passerelle sur
le pare-feu pour le réseau interne ». Sur WatchGuard, on raisonne en interfaces trusted, optional et external. Sur
Stormshield, on raisonne en objets réseau et en slots de filtrage : c'est une règle de filtrage avec son NAT qui
décide qui sort par où. Le technicien a supprimé ma route statique de test, créé un slot avec sa règle de NAT, et
tout est devenu limpide. Prévoyez cette heure dans le planning.

## Faire cohabiter les deux pare-feux

Le cluster vit à côté du WatchGuard pendant quelques jours. Deux précautions.

1. **Une route de transition.** Le réseau de l'ancien VPN reste joignable via le WatchGuard : créez un objet réseau
   `NET-ANCIENVPN`, un objet machine `FW-WATCHGUARD`, puis une route statique de l'un vers l'autre dans
   `Configuration > Réseau > Routage`. Ouvrez la règle correspondante côté WatchGuard.
2. **Un seul câble.** Tant que le WatchGuard est en production, seul le lien vers le cœur est branché sur le cluster.
   Les ports Business Internet et MPLS attendent.

:::danger[Ce qui arrive sinon]
Le 10 avril, nous avons branché les ports 1 et 3 du cluster en plus du lien cœur. Résultat : conflit VRRP/ARP entre
le WatchGuard, le routeur Business Internet et les routeurs du trunk SIP, des « Redirect Host (New nexthop) » dans les
captures, et la téléphonie coupée le temps de comprendre. Deux passerelles qui se disputent, c'est deux GPS qui
parlent en même temps.
:::

Autre surprise : sur l'interface voix, la protection anti-usurpation refusait le trunk SIP tant qu'une adresse fixe
n'était pas posée côté WatchGuard. Vérifiez que l'interface voix porte exactement l'adresse que l'opérateur attend.

## Écrire les règles de filtrage dans le bon sens

Le pare-feu est stateful : une règle se pense depuis l'initiateur de la connexion, le retour est accepté
automatiquement. J'avais recopié deux règles autorisant les adresses des services de télémaintenance et de messagerie
instantanée vers mes réseaux internes. Réponse du technicien : « ces adresses ne viendront jamais vers tes réseaux
internes, c'est l'inverse qu'il faut faire ». Ce sont vos postes qui ouvrent la connexion, jamais le contraire.

La méthode qui a marché :

1. Commencer par des règles larges, `NET-SERVEURS → LAN`, pour ne rien casser le jour de la bascule.
2. Réduire ensuite serveur par serveur, en relisant les journaux.
3. Une fois l'annuaire synchronisé sur le boîtier, restreindre par groupe : le RDP vers les serveurs n'est ouvert
   qu'au groupe du service informatique.

## Tester, basculer, retirer l'ancien

Avant de débrancher le WatchGuard, testez depuis chaque VLAN : sortie Internet, bail DHCP relayé, ouverture de
session sur le domaine, services publiés en DMZ, lien MPLS, appel entrant et sortant avec audio dans les deux sens.
Relisez une par une les règles de téléphonie de votre tableau.

:::caution
Ne décâblez pas trop vite. Le port 1 du cluster (Business Internet) est retombé en down parce que nous avions
débranché l'ancien matériel avant que tout soit stabilisé. Laissez passer une journée complète de production.
:::

## Durcir le cluster après chaque intervention externe

Un technicien laisse toujours des traces : une règle de test « ouverte à tout », un SSH activé, un mot de passe
temporaire. Dix mois plus tard, une autre intervention (remise en stack d'un switch, validation du basculement
Wi-Fi/4G des téléphones) a rappelé la liste :

1. Supprimer ou désactiver la règle de test dès que la validation est faite.
2. Remettre votre propre mot de passe administrateur.
3. Désactiver le SSH dans `Configuration > Système > Configuration > Administration du firewall`.
4. Vérifier les comptes rattachés à MyStormshield : une adresse de service, pas celle du technicien.

Les alertes « VPN Brute-Force » remontées par notre SOC sur le VPN SSL, en janvier puis en juin 2026, ont fini de
me convaincre : une fois un agent SASE déployé, le VPN SSL n'a plus à écouter sur Internet.

## Pour aller plus loin

- [Basculer la passerelle par défaut vers un lien MPLS + SASE](/docs/reseau/basculer-la-passerelle-par-defaut-vers-mpls-et-sase/), l'étape suivante.
- [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/), pour la direction.
- [Du MPLS au SASE, ce que personne ne vous dit](/blog/du-mpls-au-sase-ce-que-personne-ne-vous-dit/), le récit complet.
- [Documentation Stormshield SNS](https://documentation.stormshield.eu/).

<!-- source : mails « elements parefeux », 2025-04-07 → 2025-04-10 ; « Mise en service SN720 », 2025-04-10/11 ; « BTIP DOWN », 2025-04-10 ; « RE: Firewall Stormshield », 2025-01-28 ; « règle openbar et switch », 2026-02-25 -->

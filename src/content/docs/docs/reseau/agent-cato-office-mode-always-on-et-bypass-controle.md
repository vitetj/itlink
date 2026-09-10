---
title: "Agent Cato : Office Mode qui ne s'active pas, Always-On et bypass temporaire contrôlé pour les techniciens"
description: "Après le déploiement d'un agent Cato Always-On : Office Mode absent sur le LAN à cause d'une route BGP manquante, techniciens terrain qui doivent se débrancher, et accès prestataire sans VPN via Browser Access."
published: 2026-09-09
category: reseau
tags: [cato, sase, ztna, always-on, bgp, automatisme]
level: intermédiaire
status: à jour
featured: false
tested_on: [Cato Client Windows, Stormshield SN720]
---

Quand on déploie un agent SASE en mode Always-On sur tout le parc, on signe pour une promesse simple : chaque poste passe par le cloud de sécurité, tout le temps, sans que l'utilisateur ait quoi que ce soit à faire. La réalité, dans une PME industrielle avec des automaticiens qui branchent leur PC sur des machines sans Internet, est un peu plus nuancée. Voici les trois sujets qui m'ont occupé pendant les semaines qui ont suivi la bascule vers Cato Networks : un Office Mode qui refusait de s'activer sur le réseau interne, un Always-On qu'il a fallu rendre vivable pour les techniciens terrain, et un accès prestataire chez un client lui-même sous Cato.

## Prérequis

- Un tenant Cato avec l'agent déployé sur les postes Windows et la stratégie Always-On activée.
- Un site raccordé à Cato, ici via un lien MPLS d'opérateur annoncé en BGP vers le PoP Cato, derrière un cluster Stormshield SN720.
- Un accès à la console de management Cato, ou un partenaire MSSP qui l'opère pour vous et à qui vous savez poser des questions précises.
- Des utilisateurs prévenus : ce que fait l'agent, ce qu'il ne fait pas, et à qui écrire quand ça coince.

## Comprendre ce que l'agent essaie de faire

L'agent Cato a deux façons de vivre. Hors du bureau, il monte son propre tunnel vers le PoP le plus proche : c'est le mode connecté, celui du télétravail. Sur un site déjà raccordé à Cato, il détecte qu'il est « à la maison », n'ouvre pas de tunnel et laisse le trafic emprunter celui du site : c'est l'Office Mode. L'analogie que j'utilise : hors du bureau, chaque poste prend sa propre navette ; au bureau, tout le monde monte dans le bus de l'entreprise.

Pour faire cette détection, l'agent doit joindre les services internes de Cato à travers le tunnel du site. Ces services vivent dans une plage réservée, documentée par l'éditeur (10.254.254.0/24). Retenez cette phrase, c'est toute la suite de l'article.

## Diagnostiquer un Office Mode qui ne s'active pas

### Les symptômes

Sur le réseau interne, après la bascule de la passerelle par défaut vers Cato :

- le ping vers certaines ressources fonctionne, mais la résolution DNS interne est cassée ;
- l'agent n'arrive pas à s'authentifier ;
- l'Office Mode ne s'active jamais ;
- chaque changement de réseau prend deux à trois minutes avant que le poste retrouve un état stable.

Le poste sortait bien sur Internet. Il n'arrivait simplement pas à parler à Cato depuis l'intérieur.

### Le diagnostic

Deux commandes suffisent, depuis un poste du LAN.

```cmd title="Vérifier où va le trafic et où vit le service Cato"
tracert -d www.example.com
nslookup tunnel-api.catonetworks.com
```

Le `tracert` ne sortait jamais du cœur de réseau privé, ce qui est attendu quand l'Internet passe par le MPLS puis par Cato. Le `nslookup`, lui, renvoyait une adresse dans la plage interne des services Cato (10.254.254.x). Et cette plage n'était annoncée nulle part : la session BGP entre le routeur MPLS de l'opérateur et Cato transportait nos réseaux internes et la route par défaut, pas la plage des services Cato. L'agent tentait de joindre une adresse pour laquelle le cœur de réseau n'avait aucune route.

```cmd title="Vérifier la route depuis le poste"
route print 10.254.254.0
```

### Le correctif

Faire annoncer, ou router statiquement selon la façon dont votre opérateur gère le BGP, la plage des services Cato vers le tunnel du site. Chez nous, c'est l'opérateur qui gère le routeur MPLS, donc une demande précise avec la plage exacte et le pourquoi. Effet immédiat après l'ajout : authentification de l'agent et passage en Office Mode, sans redémarrage.

:::tip
Avant d'ouvrir un ticket, posez trois questions à votre partenaire, de préférence par écrit : le split tunneling est-il nécessaire dans notre cas ? Quelles sont les bonnes pratiques de l'éditeur pour l'accès au LAN et au DNS interne en Always-On ? Où se trouve l'option Anti-Tamper de l'agent ? Les trois sont dans mon ticket ; les deux premières ont orienté tout le reste.
:::

:::note
Si votre DNS interne reste cassé alors que l'Office Mode est actif, le problème est ailleurs : voyez [Diagnostiquer une résolution DNS interne cassée par un client VPN tiers ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/).
:::

## Encadrer l'Always-On pour les techniciens terrain

Un automaticien qui branche son PC sur un automate en atelier, ou sur la machine d'un client à l'autre bout du monde, n'a pas d'Internet à ce moment-là. Un agent Always-On qui ne trouve pas son PoP se met à chercher, et le PC devient pénible à utiliser. Première réaction des techniciens : « on peut désactiver Cato ? ». Ma réponse, et je la maintiens : non. Pas parce que je ne fais confiance à personne, mais parce que je sais qu'un agent désactivé pour une intervention ne sera pas réactivé après. Un pare-feu qu'on ouvre « le temps de », c'est une porte qu'on retrouve ouverte six mois plus tard.

Ce qui a été mis en place à la place :

1. **Une règle de déconnexion temporaire** dans la stratégie Always-On : 60 minutes maximum, motif obligatoire saisi par l'utilisateur, reconnexion automatique à l'échéance. Le technicien garde la main, la trace existe, et l'oubli est impossible par construction.
2. **Le split tunnel** pour les réseaux industriels locaux, afin que le trafic vers un automate ne cherche pas à monter dans le tunnel.
3. **L'autorisation explicite de chaque client VPN tiers** utilisé chez les clients. À l'exception du client EWON, chaque outil de télémaintenance doit être déclaré et autorisé dans Cato, ce qui veut dire que le technicien doit me le demander avant, pas pendant.
4. **Une communication écrite** aux automaticiens, courte, sans ambiguïté.

```text title="Squelette du rappel envoyé aux techniciens"
- L'agent est en Always-On : il ne se désactive pas, c'est voulu.
- Au changement de réseau (Wi-Fi, câble, 4G), comptez 2 à 3 minutes avant
  un état stable. C'est connu et en cours de traitement avec l'éditeur.
- Sur un automate sans Internet : utilisez la « Déconnexion temporaire »
  (60 min, motif obligatoire), l'agent se reconnecte tout seul.
- Tout VPN client (télémaintenance) doit être déclaré : ticket obligatoire
  au help desk avant l'intervention.
```

:::caution
Les techniciens ont vite compris qu'un partage de connexion 4G permettait de déclencher la déconnexion temporaire puis de rebrancher le câble. C'est un contournement, mais un contournement tracé et limité dans le temps, ce qui vaut mieux qu'un agent désinstallé. Ne le combattez pas, comptez-le.
:::

### Ce qui reste ouvert avec l'éditeur

Après plusieurs semaines, cinq problèmes ont été formalisés et remontés d'abord au MSSP, puis directement à l'ingénieur avant-vente de Cato : un automate sans Internet reste un cas pénible malgré le split tunnel ; une boucle Office Mode / connecté quand plusieurs interfaces sont actives ; environ cinq secondes de coupure au passage Wi-Fi vers Ethernet ; le refus de notre part d'une désactivation libre de l'Always-On ; et le cas des clients eux-mêmes sous Cato. La cible discutée est un profil « Automaticiens » avec sa propre stratégie de connectivité. Il existe aussi un bug connu de l'agent quand toutes les interfaces tombent en même temps.

| Situation | Ce qui se passe | Réponse actuelle |
| --- | --- | --- |
| PC branché sur un automate sans Internet | L'agent cherche son PoP | Déconnexion temporaire 60 min + split tunnel |
| Plusieurs interfaces actives | Boucle Office Mode / connecté | Remonté à l'éditeur, profil dédié en discussion |
| Passage Wi-Fi vers Ethernet | Environ 5 s de coupure | Connu, en cours chez l'éditeur |
| Client final lui-même sous Cato | Conflit d'agents | VM avec second agent, ou Browser Access (ci-dessous) |

## Donner un accès prestataire sans VPN : Browser Access

Le cas inverse est arrivé en septembre : nous devions installer un logiciel sur un serveur d'un client, lui-même sous Cato avec Entra ID et MFA. Le client a d'abord tenté de nous enrôler par un access package Entra. Résultat : erreur 53003, accès bloqué par l'accès conditionnel, parce que notre poste n'est ni enregistré ni conforme dans son tenant. Normal, et plutôt rassurant sur sa configuration.

Ce que j'ai proposé, et qui vaut pour vos propres prestataires :

1. Le client crée dans Cato un **compte invité local dédié**, sans passer par Entra ID.
2. Il publie dans son **Application Portal** (Browser Access) le seul serveur nécessaire, avec les seuls protocoles utiles.
3. Les règles vivent dans Cato, l'accès est tracé, et le compte est désactivé dès la fin de l'intervention.
4. Le prestataire ouvre le portail du client dans un navigateur et n'installe rien.

:::caution
Piège vécu : si le prestataire a déjà un agent Cato Always-On rattaché à son propre tenant, le SSO du portail le renvoie chez lui. Il faut cibler explicitement le sous-domaine du client, du type `nom-du-client.via.catonetworks.com`, et pas l'URL générique. Demandez-le dès le premier échange, cela évite une journée d'allers-retours.
:::

C'est exactement le principe du bastion pour prestataires que j'avais vendu à ma direction dans le dossier du projet : pas de VPN supplémentaire, pas d'agent chez le tiers, un seul serveur visible, et une désactivation en un clic.

## Pour aller plus loin

- [Basculer la passerelle par défaut vers MPLS et SASE](/docs/reseau/basculer-la-passerelle-par-defaut-vers-mpls-et-sase/), l'étape qui précède tout ça.
- [Réseaux machines industrielles : ne jamais mélanger réseau machine, télémaintenance et LAN bureautique](/docs/architecture/segmenter-les-reseaux-machines-industrielles/), pour comprendre pourquoi le split tunnel des automaticiens est une question d'architecture, pas de confort.
- La documentation Cato « Managing applications for the Browser Access portal » pour la partie publication d'applications.

<!-- source : mails « Point global déploiement Cato » 2026-07-21, « Rappel sur le fonctionnement du nouveau VPN Cato » 2026-07-21, « Retour Cato et problème » 2026-09-04 → 2026-09-09, « RE: Logiciel trieuse » 2026-09-09 -->

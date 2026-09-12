---
title: "Administrer une infrastructure de postes virtuels VMware Horizon"
description: "Publier des applications, gérer les droits par groupe, lire le tableau de santé et comprendre la chaîne de dépendances Horizon, RDS et vCenter — y compris pourquoi tout s'arrête quand un seul maillon tombe."
published: 2026-02-19
category: virtualisation
tags: [vmware, horizon, rds, vdi, applications, gpo]
level: avancé
status: à jour
featured: false
tested_on: [VMware Horizon, VMware vCenter Server, Windows Server RDS]
sidebar:
  label: "Administrer une infrastructure Horizon"
---

Une infrastructure de postes et d'applications virtualisés ressemble à une boîte noire tant qu'on n'a pas
compris qui fait quoi. Les utilisateurs cliquent sur une icône, une application s'ouvre, et quand elle ne
s'ouvre pas, la question « c'est Horizon ou c'est le serveur ? » n'a rien d'évident.

La réponse tient en une phrase, et c'est la chose la plus utile à retenir de cette fiche : **Horizon ne
remplace pas les services Bureau à distance, il les publie**. Ce sont deux solutions indépendantes, reliées par
un agent. Le jour où la brique Microsoft tombe, Horizon continue d'afficher son catalogue et plus rien ne
démarre, parce qu'il n'y a plus personne pour fournir la session.

## La chaîne de dépendances, dans l'ordre

Avant toute manipulation, il faut savoir de quoi dépend une icône d'application.

1. **L'annuaire** authentifie l'utilisateur et porte les groupes qui ouvrent les droits.
2. **Le serveur de connexion Horizon** — le courtier — reçoit la demande, vérifie les droits et oriente
   l'utilisateur vers une ressource.
3. **Le serveur d'applications ou de bureaux**, sous Windows Server avec le rôle Bureau à distance, exécute
   réellement l'application et fournit la session.
4. **L'agent Horizon**, installé sur ce serveur, est le lien entre les deux mondes. C'est lui qui fait qu'un
   serveur configuré correctement est détecté et exploitable.
5. **vCenter** permet au courtier de voir les machines et, sur les pools automatisés, de les provisionner.

Chaque maillon manquant produit un symptôme différent, et c'est en remontant cette liste qu'on diagnostique
vite. Une application absente du catalogue est un problème de droits ou de publication. Une application
présente mais qui ne démarre pas est presque toujours un problème côté serveur Bureau à distance ou agent.

:::caution
Le point de fragilité est le serveur qui exécute les applications. S'il est arrêté, saturé ou si son rôle
Bureau à distance est mal configuré, aucun réglage Horizon ne rattrapera la situation. Commencez toujours le
diagnostic par lui, pas par la console d'administration.
:::

## Se connecter à la console d'administration

La console est publiée sur le nom interne du serveur de connexion, suivi du chemin d'administration —
typiquement `https://horizon.example.com/admin`. Elle n'est accessible que depuis le réseau interne, et c'est
très bien ainsi : une console de courtier exposée sur Internet est une cible de choix.

L'authentification se fait avec un compte de l'annuaire disposant du rôle d'administrateur Horizon, pas avec
un compte local. Donnez ce rôle à un groupe, jamais à des comptes nominatifs.

:::note
Sur les versions anciennes, cette console repose sur une technologie d'affichage aujourd'hui retirée de tous
les navigateurs, ce qui oblige à conserver un poste ou une machine virtuelle dédiée pour l'administrer. Si
c'est votre cas, traitez-le comme une dette technique à échéance : la console moderne des versions récentes
est une interface web classique, sans extension. Et en attendant, isolez ce poste d'administration.
:::

## Lire le tableau de santé

La page d'accueil de la console affiche l'état de tous les composants de l'infrastructure : serveurs de
connexion, serveurs d'applications et de bureaux, connexion à vCenter, domaines. Le code couleur est
universel — vert pour normal, orange pour avertissement, rouge pour erreur — et chaque composant est cliquable
pour afficher le détail de l'anomalie.

Le second endroit à consulter est le journal des événements, accessible depuis le compteur affiché en haut de
la console. C'est lui qui donne le contexte : quel utilisateur, quelle ressource, quel horodatage. Un tableau
de santé vert avec des événements d'erreur récents mérite qu'on s'arrête : cela signale en général un problème
intermittent, celui qui génère les tickets qu'on n'arrive pas à reproduire.

## Publier une application

La publication d'applications se fait depuis le catalogue, dans la section dédiée aux pools d'applications.
La console propose d'abord la liste des applications qu'elle a détectées sur les serveurs disponibles : dans
la majorité des cas, il suffit de cocher.

Quand l'application n'apparaît pas — un exécutable installé hors des chemins standard, un outil métier lancé
par un raccourci particulier — il faut la déclarer manuellement en désignant le serveur d'exécution, puis le
chemin de l'exécutable et ses éventuels paramètres.

Deux options méritent qu'on s'y arrête, parce qu'elles sont mal comprises :

| Option | Ce qu'elle fait | Quand l'utiliser |
| --- | --- | --- |
| Prélancement | L'application est démarrée dès l'ouverture de session, avant que l'utilisateur ne clique | Sur une application lourde, très utilisée, dont le temps de démarrage est pénible. Consomme des ressources en permanence |
| Sessions multiples | Autorise l'usage simultané de la même application depuis plusieurs points de connexion | Pour un utilisateur qui travaille depuis deux postes. À éviter sur les applications qui verrouillent leurs fichiers |

Le prélancement est tentant et se paie : chaque session prélancée occupe de la mémoire sur le serveur, qu'elle
serve ou non. Réservez-le à une ou deux applications, jamais au catalogue entier.

## Attribuer les droits par groupe, jamais par personne

À la fin de la création d'un pool, la console ouvre directement la fenêtre d'attribution des droits. C'est le
moment de prendre la bonne habitude : **on attribue à des groupes de l'annuaire, pas à des utilisateurs**.

La raison est opérationnelle. Un nouvel arrivant dans un service doit obtenir ses applications en étant ajouté
à deux ou trois groupes, pas en ouvrant une console et en cochant quinze pools. Un départ se traite de la même
façon, en une action, et de façon vérifiable.

Les droits d'un pool existant se modifient de la même manière, sans toucher à la publication elle-même : on
ouvre les autorisations, on ajoute ou retire un groupe, on valide. C'est instantané côté catalogue, mais une
session déjà ouverte conserve ce qu'elle avait au moment de l'authentification. Prévenez les utilisateurs qu'un
nouveau droit demande une reconnexion.

## Ce qui ne se règle pas dans la console

Une partie du comportement du poste virtuel ne se configure pas dans Horizon mais **par stratégie de groupe**,
avec les modèles d'administration fournis par l'éditeur : gestion du profil utilisateur, redirection de
dossiers, restrictions sur les périphériques clients, impression, presse-papiers.

C'est un point qui surprend les administrateurs qui découvrent le produit : ils cherchent longtemps une case à
cocher dans la console alors que le réglage est du côté Windows. La règle pratique : **la console gère qui
accède à quoi, la stratégie de groupe gère comment la session se comporte**.

L'ajout d'un serveur d'applications suit la même logique. Il n'y a rien à créer dans Horizon : on prépare un
serveur Windows avec le rôle Bureau à distance comme dans n'importe quelle infrastructure Microsoft, on le
place dans sa collection de sessions, on y installe l'agent Horizon, et le courtier le détecte de lui-même via
vCenter. Si la partie Microsoft est bancale, l'agent n'y changera rien.

## Trois réflexes d'exploitation

**Surveiller le serveur d'applications comme un serveur de production.** Processeur, mémoire, espace disque et
nombre de sessions. La plupart des « Horizon est lent » sont des serveurs saturés.

**Documenter la correspondance groupe / pool / application.** Un tableau à trois colonnes, tenu à jour, qui
sert à l'arrivée d'un collaborateur, à un audit de droits et au diagnostic. Sans lui, la console est la seule
source de vérité, et elle ne s'exporte pas facilement.

**Tester après chaque mise à jour du serveur d'applications.** Un correctif Windows qui touche au rôle Bureau
à distance peut casser la publication sans qu'aucun voyant ne passe au rouge : le composant est vert, la
session ne s'ouvre pas. Gardez un compte de test avec un droit sur chaque pool, et faites-le tourner.

## Pour aller plus loin

- [Déployer et configurer une appliance vCenter Server](/docs/virtualisation/deployer-et-configurer-vcenter-server-appliance/)
- [Checklist d'intégration d'un nouveau collaborateur](/docs/dsi/checklist-dintegration-dun-nouveau-collaborateur/)
- [Ce que le rachat de VMware change pour une PME](/blog/broadcom-vmware-facture-pme/)

<!-- source : procédure interne « Gestion du serveur Horizon », centre de documentation -->

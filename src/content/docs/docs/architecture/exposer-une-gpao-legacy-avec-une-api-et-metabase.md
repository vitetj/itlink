---
title: "Exposer les données d'une GPAO ancienne sans y toucher : API du fournisseur et Metabase en lecture seule"
description: "Une GPAO de 2010 embarque souvent un serveur d'API que personne n'a jamais allumé. Comment sortir la donnée sans toucher au progiciel, brancher Metabase en lecture seule et annoncer honnêtement sa fraîcheur."
published: 2025-10-21
category: architecture
tags: [gpao, metabase, api, legacy, bi]
level: avancé
status: à jour
featured: false
tested_on: [Universe DBMS 11.3.1.0, Metabase]
sidebar:
  label: "Exposer les données d'une GPAO…"
---

La demande métier est toujours formulée de la même manière : « on voudrait un tableau de bord en direct, pas un
export Excel de fin de semaine ». Le problème, c'est que la donnée demandée vit dans une GPAO installée en
2010, assise sur une base MultiValue de type Universe, avec une cinquantaine de postes en production et un
éditeur qui n'a plus grand-chose à proposer sur cette gamme.

Le réflexe est alors de parler migration d'ERP, budget à six chiffres et projet de dix-huit mois. Avant d'en
arriver là, il y a une question beaucoup moins coûteuse à se poser : **qu'est-ce que ce progiciel sait déjà
faire que personne n'utilise ?** Dans mon cas, la réponse tenait dans un composant livré avec la GPAO depuis
des années, installé, licencié, et allumé par personne : un serveur d'API.

## La règle du jeu : ne pas toucher au progiciel

Un progiciel métier ancien tient debout parce que personne n'y touche. Modifier son schéma, ajouter un index,
écrire dans ses tables en dehors de l'application, c'est perdre le peu de support qui reste et découvrir un
matin que le traitement de nuit ne passe plus.

Tout ce qui suit part donc d'un principe non négociable : **on lit, on n'écrit pas, et on ne modifie rien dans
le produit.** Trois voies de sortie existent, et elles ne se valent pas.

| Voie | Ce qu'on obtient | Risque | Fraîcheur |
| --- | --- | --- | --- |
| Export périodique de fichiers | Ce que l'éditeur a bien voulu prévoir | Faible | Celle de la planification |
| Lecture directe de la base | Tout, y compris ce qu'on n'aurait pas dû voir | Moyen : schéma non documenté, non contractuel | Celle de la base |
| API du fournisseur | Les objets métier, tels que l'application les expose | Faible : c'est l'interface prévue pour ça | Temps réel |

La bonne architecture combine souvent les deux dernières : la base pour l'analyse en masse, l'API pour le
temps réel et pour l'écriture.

## Ce qu'est le serveur d'API d'une GPAO

Beaucoup de GPAO de cette génération embarquent un module d'intégration web. C'est une **passerelle
logicielle** : elle permet à d'autres programmes de dialoguer avec la GPAO **sans passer par son interface
utilisateur**, au moyen de requêtes authentifiées.

Concrètement, n'importe quel langage — PHP, Python, JavaScript — peut l'interroger pour :

- **lire** : ordres de fabrication, stocks, nomenclatures, planning ;
- **écrire** : pointages d'atelier, changements d'état, retours de production.

Ce n'est pas de la théorie. Le pointage web que nous utilisons en atelier est un simple script PHP qui
interroge cette passerelle, affiche les données en temps réel et les met à jour. Pas de framework, pas de
dépendance : quelques centaines de lignes qui parlent à une GPAO de 2010 comme on parlerait à un service web
moderne.

C'est aussi l'argument de communication le plus utile du dossier : un système d'information ancien n'est pas
forcément un système fermé. Montrer qu'il dispose déjà d'une **interface d'échange capable de dialoguer avec
des environnements cloud actuels**, ça déplace la discussion de « il faut tout remplacer » vers « il faut
brancher ».

## Prérequis

- Un **inventaire précis** de ce qui tourne : modules, versions et numéros de build, version du moteur de base
  de données, nombre de licences. C'est la première chose que l'éditeur demandera.
- La confirmation que le module d'intégration est **couvert par votre contrat**, ou son coût s'il est facturé
  à part.
- La **documentation des points d'accès** exposés, à réclamer à l'éditeur. Sans elle, vous devinez, et deviner
  sur une base de production n'est pas une méthode.
- Un **compte de service dédié**, distinct de tout compte nominatif.
- Un coffre-fort de mots de passe pour ranger le secret associé.

## Inventorier avant d'appeler l'éditeur

Commencez par vérifier que le service tourne réellement et sur quel port il écoute — dans bien des
installations, il est installé et arrêté depuis la mise en service.

```powershell title="Repérer le service et le port d'écoute sur le serveur GPAO"
Get-Service | Where-Object { $_.DisplayName -like "*integration*" -or $_.DisplayName -like "*web*" } |
  Select-Object Name, DisplayName, Status, StartType

Get-NetTCPConnection -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess |
  Sort-Object LocalPort
```

Puis validez un appel simple depuis un poste d'administration, avec le compte de service, avant d'écrire la
moindre ligne d'application :

```bash title="Premier appel de validation"
curl -s -u "svc_bi:$API_SECRET" \
  "https://192.0.2.30:8443/<point-d-acces>/<objet>?limit=1" | head -c 500
```

Si cet appel répond, l'essentiel du travail d'architecture est fait : vous avez une porte d'entrée
contractuelle, authentifiée, qui ne dépend pas du schéma interne du produit.

## Un compte de service en lecture seule

La règle « une personne = un compte » a un corollaire : **un programme = un compte de service**. Ce compte doit
être créé pour l'usage, nommé pour l'usage, et limité à l'usage.

1. Droits **strictement en lecture** au niveau du moteur de base de données, pas au niveau de l'outil de
   restitution. Un outil qui autorise les requêtes natives ne protège rien : c'est le SGBD qui doit refuser.
2. Portée limitée aux vues ou aux tables réellement nécessaires.
3. Secret stocké dans le coffre-fort, injecté par variable d'environnement, jamais écrit dans le code ni dans
   un fichier de configuration versionné.
4. Journalisation des appels activée, pour être capable de dire qui a lu quoi le jour où la question se pose.

## Brancher Metabase, avec un objectif modeste

Metabase est un outil de restitution web : on lui déclare une source de données, on écrit des questions, on
les assemble en tableaux de bord.

L'erreur classique consiste à annoncer un « portail décisionnel ». L'objectif tenu ici était beaucoup plus
petit, et c'est pour ça qu'il a abouti en quelques jours : **reproduire à l'identique un tableau Excel qui
existait déjà**, alimenté par la base de la GPAO, accessible depuis un navigateur. Même colonnes, mêmes
totaux, même vocabulaire métier. Les utilisateurs reconnaissent leur outil, et la discussion porte sur les
données, pas sur l'interface.

Trois principes pour que ça tienne :

- **Modélisez côté base**, dans des vues nommées, pas dans des questions Metabase enchaînées. Une vue se relit,
  se documente et se corrige à un seul endroit.
- **Ne redonnez jamais les droits d'écriture**, même « juste pour tester une mise à jour de statut ».
- **Limitez le nombre de tableaux de bord.** Un tableau que personne ne regarde coûte le même effort de
  maintenance qu'un tableau utilisé tous les matins.

:::caution
Metabase permet d'écrire des requêtes natives, et une requête native mal écrite sur une base de production de
progiciel peut la mettre à genoux en pleine journée d'atelier. Réservez ce droit à un petit groupe, et faites
en sorte que le compte utilisé soit incapable d'écrire, quoi qu'on lui demande.
:::

## Annoncer la fraîcheur de la donnée, honnêtement

C'est le point qui décide de la crédibilité de tout le dispositif. Dans notre cas, la GPAO **convertit sa base
seulement deux fois par jour**. Autrement dit : on ne sera jamais « en direct direct » avec cette source, quel
que soit l'outil de restitution branché derrière.

Cette limite ne se cache pas, elle s'affiche. Mettez l'horodatage de la dernière conversion **en haut du
tableau de bord**, en évidence, et formulez-le en langage métier : « données arrêtées au 21/10 à 06:00 ». Sans
ça, quelqu'un finira par prendre une décision d'ordonnancement sur des chiffres de la veille en croyant lire
l'instant présent — et le jour où il s'en apercevra, c'est tout le tableau de bord qui deviendra suspect.

C'est précisément cette latence que l'interconnexion par API vient corriger : l'API interroge la GPAO, pas sa
copie convertie. La suite logique du chantier consiste donc à basculer vers elle les indicateurs qui exigent
vraiment le temps réel, et à laisser sur la base les analyses de fond, où deux rafraîchissements par jour ne
gênent personne.

## La suite : dialoguer avec un ERP ou un CRM

La même passerelle ouvre une perspective plus large : faire échanger la GPAO avec un ERP ou un CRM tiers, sans
double saisie. Le travail d'architecture consiste alors à comparer, des deux côtés, les **formats d'échange
disponibles** — REST, XML, CSV — et les points d'accès réellement exposés, puis à choisir le maillon le plus
pauvre comme référence : c'est lui qui dictera le rythme et le format de l'intégration.

## Pour aller plus loin

- [Cadrer une migration MySQL 5.5 vers 8.0](/docs/architecture/cadrer-une-migration-mysql-5-5-vers-8-0/),
  pour la méthode d'inventaire quand c'est la base elle-même qu'il faut faire bouger.
- [SSO pour une appli maison : LDAP, OIDC ou SAML](/docs/self-hosting/sso-pour-une-appli-maison-ldap-oidc-ou-saml/),
  la suite naturelle quand le tableau de bord doit sortir du réseau interne.
- La documentation officielle de Metabase détaille la gestion des permissions par groupe et le contrôle des
  requêtes natives.

<!-- source : mails « Exposer une GPAO legacy : API + Metabase », inventaire GPAO et publication du tableau de bord, 2025-10-14 → 2025-10-21 -->

---
title: "Revenir en arrière sur un déploiement applicatif : script de session, GPO et forçage de paquet"
description: "Une v2 buguée en production et des dizaines de postes à remettre en v1 sans y aller un par un : le script de session déjà présent dans le SYSVOL, le mail à envoyer, et le forçage de paquet en secours."
published: 2026-06-19
updated: 2026-07-01
category: automatisation
tags: [gpo, wapt, deploiement, rollback, active-directory, sysvol]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 10, Windows 11, Active Directory, WAPT]
---

Juin 2026. La version 2 d'un outil métier développé en interne part sur le parc. Deux jours plus tard, la réalité : elle est buguée sur un cas d'usage que personne n'avait vu en recette. Plusieurs dizaines d'utilisateurs, sur plusieurs sites, doivent repasser en version 1. Vite, et sans que je passe sur chaque poste.

Le sujet de cette fiche n'est pas le bug. Le sujet, c'est que ce retour en arrière a tenu **en un seul mail**, parce que le mécanisme de rollback existait déjà avant le déploiement. Si vous ne deviez retenir qu'une phrase : le chemin de retour s'écrit avant de pousser la nouvelle version, pas pendant l'incendie.

Deux mécanismes se complètent ici : un script de session porté par une GPO, pour la masse, et le forçage de paquet par le gestionnaire de déploiement, pour les cas récalcitrants.

## Prérequis

- Un domaine Active Directory, des postes Windows 10 ou 11 qui ouvrent une session dessus.
- Une GPO utilisateur contenant un script de session, appliquée à la population concernée.
- Un gestionnaire de paquets sur le parc (ici WAPT) et son dépôt interne.
- **L'ancienne version toujours disponible** : dans le dépôt de paquets et sur le partage d'installation. C'est le point qui fait tout échouer quand on l'oublie.

## Préparer le chemin de retour avant de pousser la nouvelle version

Avant chaque montée de version, trois choses doivent exister :

1. **Le paquet de la version précédente reste publié** dans le dépôt, sous un nom explicite (`monoutil-v1` à côté de `monoutil`). Renommer plutôt que supprimer : forcer l'installation d'un paquet nommé est beaucoup plus sûr que d'espérer qu'une syntaxe de version fera ce que vous croyez.
2. **Le script de session de retour arrière est déjà déposé** dans la GPO, désactivé ou inoffensif tant qu'on ne s'en sert pas. Le déposer le jour de l'incident, c'est attendre la réplication du SYSVOL en pleine crise.
3. **Le mail de rollback est écrit à l'avance**, avec le chemin exact à copier. Vous n'aurez pas envie de le rédiger correctement à 17 h 40.

:::tip
Un script de session bien fait est idempotent : on peut le lancer trois fois de suite sans casser quoi que ce soit. C'est ce qui vous permet de dire aux utilisateurs « relancez-le » sans avoir à savoir où ils en sont.
:::

## Comprendre où vit le script de session

Le script d'une GPO n'est pas rangé dans un endroit mystérieux : il est dans le SYSVOL, sous le GUID de la GPO, dans l'arborescence des scripts d'ouverture de session utilisateur.

```text title="Emplacement d'un script de session utilisateur"
\\ad.example.com\SysVol\ad.example.com\Policies\{GUID-DE-LA-GPO}\User\Scripts\Logon\rollback-monoutil.bat
```

Pour retrouver le GUID de la bonne GPO sans fouiller à la main :

```powershell title="Retrouver le GUID et le chemin"
Get-GPO -Name "Deploiement - MonOutil" | Select-Object DisplayName, Id
gpresult /r /scope:user
```

Ce chemin UNC est lisible par tous les utilisateurs du domaine : c'est exactement ce qui permet de leur demander de lancer le script eux-mêmes, sans droits particuliers et sans prise en main à distance.

## Déclencher le retour arrière à la main, poste par poste, sans y aller

Le script s'exécutera de toute façon à la prochaine ouverture de session. Le faire lancer immédiatement par l'utilisateur est simplement un raccourci — et c'est ce qui rend le rollback instantané au lieu d'être étalé sur deux jours de télétravail.

Le message envoyé au parc tient en trois lignes. Il est volontairement écrit pour être copié-collé par quelqu'un qui n'est pas informaticien :

```text title="Modèle de message aux utilisateurs"
Bonjour,

La nouvelle version de <application> présente un défaut. On repasse à la version
précédente, l'opération dure une minute et se fait depuis votre poste :

1. Touche Windows + R
2. Tapez  cmd  puis Entrée
3. Copiez-collez la ligne ci-dessous, puis Entrée :

\\ad.example.com\SysVol\ad.example.com\Policies\{GUID}\User\Scripts\Logon\rollback-monoutil.bat

Si le raccourci a disparu de votre bureau, ouvrez  %appdata%\MonOutil  et
recopiez-le sur le bureau.

Merci de me confirmer par un ticket si quelque chose ne se passe pas comme décrit.
```

Deux détails qui comptent : la mention explicite de la touche Windows (tout le monde ne sait pas ouvrir une invite de commandes), et le rappel du ticket. Sans cette dernière ligne, vous recevrez trente réponses individuelles au fil de la journée et vous n'aurez aucune idée du taux de réussite.

:::caution
Ne demandez jamais ce type de manipulation à quelqu'un connecté en session distante sur le poste qu'il modifie, et vérifiez que le script ne ferme pas l'application pendant qu'elle a un document ouvert. Un rollback qui fait perdre une saisie, c'est un rollback qui ne sera pas rejoué la fois suivante.
:::

## Retrouver le raccourci et les fichiers en profil utilisateur

Quand un installeur écrit dans le profil utilisateur plutôt que dans `Program Files`, le retour arrière laisse parfois le bureau orphelin. Le raccourci n'est pas perdu, il est resté à la source :

```bat title="Ouvrir le dossier de l'application dans le profil"
explorer %appdata%\MonOutil
```

C'est aussi là que vous irez chercher une configuration locale à sauvegarder avant de repartir en arrière.

## Forcer la réinstallation par le gestionnaire de paquets

Pour les postes où le script n'a pas fait son travail — session jamais rouverte, application verrouillée, utilisateur en congés — le gestionnaire de paquets reprend la main. Dans une invite de commandes **administrateur** :

```bat title="Forcer l'installation d'un paquet WAPT"
wapt-get update
wapt-get install monoutil-v1 --force
```

`--force` réinstalle même si le gestionnaire considère que le paquet est déjà présent et à jour. C'est précisément le cas ici : du point de vue de l'inventaire, la v2 est « bien installée », c'est nous qui n'en voulons plus.

:::note
La même commande sert dans l'autre sens quand le correctif arrive : republier le paquet corrigé et forcer son installation, plutôt que d'attendre le prochain cycle. Pensez à repasser ensuite le parc sur le paquet nominal, sinon vous garderez une population figée sur `monoutil-v1` pendant des mois.
:::

## Ce qu'un rollback binaire ne rattrape pas

Remettre l'ancien exécutable ne défait pas ce que le nouveau a écrit. Avant de déclencher, posez-vous les trois questions :

| Question | Si la réponse est « oui » |
| --- | --- |
| La v2 a-t-elle modifié un format de fichier ou de configuration ? | La v1 devra les relire, ou il faut restaurer la configuration précédente |
| A-t-elle écrit en base de données ? | Le rollback applicatif ne suffit pas, il faut traiter les données |
| A-t-elle changé des droits ou des chemins ? | Vérifiez-les après retour, pas avant |

Dans mon cas, la v2 ne touchait ni au schéma de données ni aux chemins : le retour arrière était sans risque. C'est une chance, pas une règle — et c'est aussi ce qu'il faut vérifier au moment de la recette, pas au moment du rollback.

## Résumer : la procédure en cinq lignes

1. Publier la version précédente sous un nom distinct et la garder.
2. Déposer le script de session de retour arrière dans la GPO avant le déploiement.
3. Le jour J : envoyer le mail avec le chemin UNC à copier-coller.
4. Rattraper les postes restants avec un forçage de paquet en invite administrateur.
5. Écrire dans le ticket ce qui a cassé, sinon la v3 refera pareil.

## Pour aller plus loin

- [Déployer Microsoft 365 Apps sur un parc avec WAPT](/docs/automatisation/deployer-microsoft-365-apps-avec-wapt/) : la construction d'un paquet, en amont de tout ce qui précède.
- [Pare-feu Windows par rôle via GPO : audit puis application](/docs/windows-server/pare-feu-windows-par-role-via-gpo-audit-puis-application/) : la même prudence appliquée à une GPO qui peut couper un service.
- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/) : parce que la moitié d'un rollback réussi, c'est le mail.

<!-- source : mails « retour en arrière toute », 2026-06-19 ; « réinstallation forcée du paquet », 2026-07-01 -->

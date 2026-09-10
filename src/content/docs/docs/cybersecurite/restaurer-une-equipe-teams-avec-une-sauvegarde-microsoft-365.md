---
title: "Restaurer une équipe Teams supprimée avec une sauvegarde Microsoft 365 tierce"
description: "Une équipe Teams disparue chez un utilisateur à l'étranger, restaurée depuis le portail granulaire d'une sauvegarde 365 tierce : pourquoi ne jamais écraser, comment lire le rapport et quoi dire à l'utilisateur."
published: 2026-01-19
category: cybersecurite
tags: [teams, microsoft-365, sauvegarde, hornetsecurity, restauration]
level: débutant
status: à jour
featured: false
tested_on: [Hornetsecurity 365 Total Backup, Microsoft Teams]
sidebar:
  label: "Restaurer une équipe Teams supprimée avec une…"
---

Mi-janvier 2026, un utilisateur du site américain m'écrit : son équipe Teams a disparu. Pas un canal, pas un fichier : l'équipe entière, avec ses conversations et sa bibliothèque de documents. Ce n'est pas la panne la plus technique de l'année, mais c'est le genre de demande qui dit tout de ce que vaut votre sauvegarde Microsoft 365. Depuis novembre 2025, la mienne est une sauvegarde tierce (Hornetsecurity 365 Total Backup), avec un portail de restauration granulaire. Voici comment la restauration s'est passée, et surtout les deux choix qui font la différence entre une restauration propre et un joyeux bazar.

## Pourquoi une sauvegarde tierce alors que Microsoft « sauvegarde déjà »

Microsoft garantit la disponibilité de son service, pas la conservation de vos données face à vos propres erreurs. Une équipe supprimée passe par une corbeille pendant une durée limitée, puis disparaît définitivement. Un utilisateur qui supprime, un administrateur qui nettoie un peu vite, une stratégie de rétention mal comprise : les trois mènent au même endroit.

Mon analogie préférée pour l'expliquer à la direction : le disque de sauvegarde est dans la maison, mais le coffre est à la banque. Même si Microsoft ferme les volets un matin, j'ai une copie ailleurs, sur un portail qui n'a pas besoin de Microsoft pour fonctionner. C'est aussi ce qui m'a permis d'annoncer aux utilisateurs, dès la migration de l'antispam, qu'un portail de restauration existait et qu'ils pouvaient me solliciter.

## Prérequis

- Une sauvegarde Microsoft 365 tierce active sur les équipes Teams (pas seulement sur les boîtes mail : vérifiez que Teams et SharePoint sont bien dans le périmètre sauvegardé).
- Un compte administrateur sur le portail de restauration de l'éditeur.
- Le nom exact de l'équipe et une date à laquelle elle existait encore.
- Un accord avec l'utilisateur sur ce qu'il attend : « tout », ou seulement certains canaux et fichiers.

## Vérifier d'abord la corbeille native de Microsoft 365

Avant de sortir la sauvegarde tierce, regardez la corbeille native. Une équipe Teams repose sur un groupe Microsoft 365 ; un groupe supprimé reste restaurable pendant 30 jours depuis le centre d'administration Microsoft Entra (Groupes, puis Groupes supprimés) ou depuis le centre d'administration Teams. Si vous êtes dans la fenêtre, c'est la restauration la plus fidèle : mêmes identifiants, mêmes membres, mêmes liens.

```powershell title="Lister et restaurer un groupe supprimé (Microsoft Graph PowerShell)"
Connect-MgGraph -Scopes "Group.ReadWrite.All"
Get-MgDirectoryDeletedItemAsGroup | Select-Object Id, DisplayName, DeletedDateTime
Restore-MgDirectoryDeletedItem -DirectoryObjectId "<id du groupe>"
```

Si la corbeille est vide, ou si vous n'êtes plus dans la fenêtre, passez à la suite. C'est exactement le scénario pour lequel la sauvegarde tierce est payée.

## Ouvrir le portail de restauration granulaire

Connectez-vous au portail de restauration de l'éditeur (chez Hornetsecurity, l'accès se fait depuis le Control Panel, en SSO Microsoft 365, donc sans mot de passe supplémentaire à retenir). Sélectionnez la sauvegarde Teams, retrouvez l'équipe par son nom, puis choisissez un point de sauvegarde antérieur à la suppression. Prenez le temps de parcourir le contenu affiché : canaux, conversations, fichiers. C'est le moment de vérifier que ce que vous allez restaurer est bien ce que l'utilisateur a perdu, et pas une version d'il y a six mois.

## Choisir la cible : jamais en écrasement

C'est le point qui compte. Le portail propose de restaurer dans l'équipe d'origine ou dans une nouvelle équipe. J'ai restauré dans une équipe homonyme, nouvellement créée par le portail, et jamais en écrasement. Pourquoi ?

- Si l'équipe d'origine existe encore partiellement (recréée par un utilisateur entre-temps, par exemple), une restauration par-dessus mélange l'ancien et le nouveau, et personne ne sait plus ce qui est à jour.
- Une équipe séparée permet à l'utilisateur de comparer, de récupérer ce qui manque, puis de décider lui-même ce qu'il garde.
- En cas de problème, on supprime la copie restaurée et on recommence. Rien d'irréversible.

| | Restaurer dans l'équipe d'origine | Restaurer dans une nouvelle équipe |
| --- | --- | --- |
| Risque d'écraser du contenu récent | Oui | Non |
| Comparaison avant/après possible | Non | Oui |
| Retour arrière | Difficile | Supprimer la copie |
| Identifiants et liens conservés | Oui | Non : nouveaux liens |

:::caution
« Restaurer » n'est pas synonyme de « remettre comme avant ». Une restauration en écrasement est une modification de production, avec les mêmes conséquences qu'une suppression si elle se passe mal. Traitez-la comme telle.
:::

## Lire le rapport de restauration

Une fois la restauration terminée, le portail produit un rapport. Lisez-le jusqu'au bout : un message peut échouer. Dans mon cas, le rapport signalait un message en échec. Ce n'est pas un échec de la restauration, mais c'est une information à transmettre à l'utilisateur, pour qu'il ne cherche pas pendant une heure une conversation qui n'est pas revenue.

## Prévenir l'utilisateur

Le mail à l'utilisateur tient en quatre lignes : le nom de la nouvelle équipe, ce qui a été restauré, ce qui a éventuellement échoué, et ce qu'on attend de lui (vérifier, puis dire si l'équipe d'origine peut être supprimée ou renommée). Sur un site à l'étranger, écrivez-le en anglais, sans jargon.

```text title="Modèle de message"
Hello,
Your team "<name>" has been restored from our Microsoft 365 backup
into a new team with the same name.
Channels, conversations and files up to <date> are back.
One message could not be restored (see attached report).
Please check the content and tell me whether the new team
can replace the old one.
```

:::tip
Ne supprimez pas l'ancienne équipe vous-même, même vide. Laissez l'utilisateur confirmer, puis renommez-la avec un suffixe « ancienne » pendant quelques semaines avant de la supprimer. Le coût est nul, et cela évite une seconde demande de restauration.
:::

## Ce que cet incident m'a rappelé

- La sauvegarde ne vaut que si quelqu'un sait s'en servir un lundi matin. Faites une restauration de test par trimestre, sur une équipe de test.
- Annoncez l'existence du portail de restauration aux utilisateurs. Ils ne supprimeront pas moins, mais ils vous préviendront plus vite, et plus vite veut dire dans la fenêtre de rétention.
- Documentez la restauration dans le helpdesk : quoi, quand, vers où, ce qui a échoué. Le prochain incident ressemblera à celui-ci.

## Pour aller plus loin

- [Migrer un antispam Vade vers Hornetsecurity](/docs/cybersecurite/migrer-un-antispam-vade-vers-hornetsecurity/) : la migration pendant laquelle le portail de restauration a été annoncé aux utilisateurs.
- [RAID 5 n'est pas une sauvegarde](/blog/raid5-nest-pas-une-sauvegarde/) : la même logique, côté serveurs.
- Documentation Microsoft : [restaurer un groupe Microsoft 365 supprimé](https://learn.microsoft.com/entra/identity/users/groups-restore-deleted).

<!-- source : mail de restauration d'une équipe Teams via 365 Total Backup, 2026-01-16 -->

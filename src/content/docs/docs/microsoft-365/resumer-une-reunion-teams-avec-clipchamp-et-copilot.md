---
title: "Résumer une réunion Teams : transcription, Clipchamp et Copilot"
description: "Obtenir un résumé exploitable d'une réunion Teams, y compris quand on n'en est pas l'organisateur : ce qu'il faut annoncer avant d'enregistrer, où trouver le fichier, et le passage par Clipchamp."
published: 2025-10-08
category: microsoft-365
tags: [teams, ia, clipchamp, sharepoint, microsoft-365, rgpd]
level: débutant
status: à jour
featured: false
tested_on: ["Microsoft Teams", "Clipchamp (application Windows)", "Microsoft 365"]
---

« Tu peux me sortir un résumé de la réunion de mardi ? Je n'étais pas dedans. » La demande est légitime, la réponse
tient en une phrase : ça dépend de l'existence d'une **transcription**. Copilot ne regarde pas une vidéo, il lit du
texte. Sans transcription, il n'y a rien à résumer, quel que soit le nombre de licences.

Le reste de cette fiche décrit les deux chemins possibles — celui de l'organisateur, et celui de tous les autres —
et commence par la partie qu'on saute toujours et qui est pourtant la seule irrattrapable.

## Avant d'enregistrer : ce qui ne se règle pas dans un menu

Un enregistrement de réunion, c'est de la voix, des visages et des propos attribués nominativement. Une
transcription, c'est encore pire de ce point de vue : c'est un verbatim, avec le nom de chacun en face de chaque
phrase. Ce sont des données personnelles, avec tout ce que ça implique.

- **Prévenez, à voix haute, avant de lancer.** Teams affiche bien un bandeau, mais un bandeau n'est pas une
  annonce. Dites ce que vous enregistrez, pourquoi, qui aura accès au fichier et combien de temps il sera gardé.
  Cinq secondes de préambule évitent la discussion pénible du lendemain.
- **Acceptez qu'on dise non.** Si quelqu'un demande de ne pas être enregistré, on ne le contourne pas : on prend
  des notes comme avant. Un accord obtenu par la gêne n'est pas un accord.
- **Il y a des réunions qu'on n'enregistre pas.** Entretien individuel, sujet disciplinaire, santé, litige,
  négociation avec un tiers. Le résumé automatique n'a pas sa place là-dedans, et l'existence du fichier vous
  posera plus de problèmes qu'elle n'en résoudra.
- **Les invités externes ne sont pas des collègues.** Ils n'ont aucun accès au fichier par défaut, et c'est très
  bien. Si vous devez le leur partager, c'est une décision, pas une case à cocher.

:::caution[La réunion d'un autre ne vous appartient pas]
Récupérer un enregistrement pour le passer à un outil de résumé, c'est réutiliser des propos tenus dans un cadre
précis. Demandez à l'organisateur, et dites-lui ce que vous comptez en faire. C'est de la politesse, et c'est aussi
ce qui vous évitera d'expliquer un jour pourquoi un verbatim s'est retrouvé dans un compte rendu diffusé.
:::

Côté administration, deux réglages méritent d'être regardés une bonne fois dans les stratégies de réunion du centre
d'administration Teams : l'option qui **exige l'accord des participants** avant enregistrement et transcription, et
l'**URL de politique de confidentialité** affichée par Teams, qu'on peut remplacer par celle de sa propre société.
Pensez aussi à la durée d'expiration des enregistrements : par défaut, ils ne sont pas éternels, donc ils ne sont
pas un archivage.

## Prérequis

- Une réunion **enregistrée**, et si possible **transcrite** — c'est la transcription qui fait le travail.
- Les droits de lecture sur le fichier d'enregistrement.
- Pour le résumé natif : une licence **Copilot** (ou Teams Premium pour le récapitulatif intelligent).
- Pour le chemin de contournement : l'**application Clipchamp**, installée depuis le Microsoft Store. Pas la
  version web du navigateur — c'est l'application qui ouvre proprement les fichiers du tenant.

## Cas 1 : vous êtes l'organisateur

C'est le cas simple, et c'est celui qu'il faut privilégier quand vous savez à l'avance qu'un compte rendu sera
attendu.

1. Dans la réunion, lancez l'**enregistrement**, et vérifiez que la **transcription** est bien active (elle ne l'est
   pas toujours par défaut selon la stratégie appliquée).
2. À la fin, l'enregistrement et la transcription arrivent automatiquement dans le stockage du tenant : le
   **OneDrive de l'organisateur** pour une réunion privée, le **site SharePoint de l'équipe** pour une réunion de
   canal, dans un dossier `Recordings`.
3. Dans Teams, ouvrez la réunion passée et son onglet **Récapitulatif** : vous y trouvez la vidéo, la transcription
   et, si vous êtes licencié, le résumé, les points clés et les actions proposées.
4. Relisez et corrigez avant diffusion. Toujours.

## Cas 2 : la réunion est celle de quelqu'un d'autre

C'est le cas fréquent, et celui pour lequel la réponse évidente n'existe pas. L'enregistrement ne vous est pas
proposé dans votre propre Teams : il faut aller le chercher dans le stockage, puis fabriquer soi-même le texte.

### Récupérer l'enregistrement

Le hub vidéo du tenant liste les vidéos auxquelles vous avez accès :

```text title="Hub vidéo SharePoint"
https://<votre-tenant>.sharepoint.com/_layouts/15/videohub.aspx
```

Si la vidéo n'apparaît pas, ce n'est pas un bug : vous n'y avez pas droit. C'est le piège numéro un de cette
procédure. Demandez à l'organisateur d'ajuster le partage du fichier — ça se fait sur l'enregistrement lui-même,
comme sur n'importe quel document.

### Fabriquer la transcription avec Clipchamp

1. Ouvrez l'**application Clipchamp** et importez l'enregistrement récupéré.
2. Générez les **sous-titres automatiques**. Clipchamp produit une transcription horodatée du dialogue.
3. Récupérez ce texte et donnez-le à **Copilot**, avec une consigne explicite : « résume cette réunion en points de
   décision, sujets ouverts et actions avec leur porteur ». Un résumé sans porteur d'action ne sert à rien.

:::tip[Demandez un format, pas un résumé]
« Résume-moi ça » donne une dissertation. Demandez une structure : décisions prises, points en suspens, actions et
qui les porte, avec la date. C'est ce que les gens liront, et c'est ce qui se recopie dans un compte rendu.
:::

## Ce que ça rate, et qu'il faut relire

La transcription automatique est bonne sur la langue courante et mauvaise sur tout ce qui fait votre métier :
noms de familles, noms de machines, références produit, sigles internes, acronymes. Elle mélange aussi les
locuteurs quand plusieurs personnes parlent en même temps ou partagent un micro de salle. Un administrateur peut
charger un **dictionnaire personnalisé** dans le centre d'administration Microsoft 365 pour améliorer la
reconnaissance du vocabulaire maison — ça aide, ça ne fait pas de miracle.

Conséquence pratique : le résumé est un brouillon, jamais un relevé de décisions. Il fait gagner la mise en forme
et l'ordre des idées, pas la responsabilité de ce qui est écrit. Vous signez le compte rendu, pas l'outil.

Dernier point, pour les réunions multilingues : la transcription et les sous-titres gèrent la traduction
automatique, et c'est très utile pour des collègues étrangers. Mais un contresens sur une décision technique
traduite automatiquement coûte plus cher qu'une réunion supplémentaire. Faites relire par quelqu'un qui était dans
la salle.

## Pour aller plus loin

- Les réflexes à diffuser aux utilisateurs sur le partage de fichiers et les données sensibles :
  [Fiches d'hygiène numérique pour les utilisateurs](/docs/cybersecurite/fiches-dhygiene-numerique-pour-les-utilisateurs/).
- Quand le contenu d'une équipe disparaît et qu'il faut le récupérer :
  [Restaurer une équipe Teams avec une sauvegarde Microsoft 365](/docs/cybersecurite/restaurer-une-equipe-teams-avec-une-sauvegarde-microsoft-365/).
- Référence Microsoft :
  [Enregistrement et transcription des réunions Teams](https://learn.microsoft.com/microsoftteams/recording-transcription-overview).

<!-- source : astuce diffusée aux collègues « résumer une réunion Teams via Clipchamp + Copilot », 2025-10-08 et 2025-10-13 -->

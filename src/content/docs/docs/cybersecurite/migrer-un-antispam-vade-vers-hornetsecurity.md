---
title: "Migrer un antispam Vade vers Hornetsecurity sans perdre les utilisateurs en route"
description: "Changer d'antispam, c'est une bascule d'un soir et six semaines d'habitudes. SSO, import des listes, mail d'annonce, connecteur de secours et rappels : ce qui a compté dans ma migration Vade vers Hornetsecurity."
published: 2025-11-26
category: cybersecurite
tags: [hornetsecurity, vade, antispam, microsoft-365, migration, communication]
level: intermédiaire
status: à jour
featured: false
tested_on: [Vade Cloud, Hornetsecurity Email Protection, Hornetsecurity 365 Total Backup, Microsoft 365]
sidebar:
  label: "Migrer un antispam Vade vers…"
---

En novembre 2025, dans le cadre d'un renouvellement global de la sécurité (antispam et sauvegarde Microsoft 365
chez le même éditeur), j'ai remplacé Vade par Hornetsecurity Email Protection. Techniquement, une passerelle
antispam en remplace une autre : le courrier entre par un tuyau, il sort par un autre, et l'éditeur documente
très bien la bascule. Le vrai sujet, ce n'est pas le tuyau. Ce sont les deux cents personnes qui recevaient un
rapport de quarantaine Vade tous les matins depuis des années et qui vont continuer à le chercher.

Une migration d'antispam ressemble à un changement de banque : les virements passent dès le premier jour,
mais pendant des semaines, quelqu'un cherche encore l'ancienne carte au fond du portefeuille. Voici ce que
j'ai préparé, ce qui a marché, et ce que j'ai dû rattraper.

## Prérequis

- Un accès administrateur au tenant Microsoft 365 (le Control Panel Hornetsecurity s'y adosse pour
  l'authentification).
- L'export des listes blanches et noires de Vade, au niveau du domaine et au niveau des utilisateurs.
- Le guide utilisateur Hornetsecurity en français, fourni par l'éditeur, à joindre au mail d'annonce.
- La liste des sites et des langues : chez moi, des collègues francophones et anglophones, donc deux versions
  de chaque communication.

## Préparer l'authentification unique avant tout le reste

Le premier motif d'abandon d'un nouvel outil, c'est un mot de passe de plus. Le Control Panel Hornetsecurity
sait déléguer l'authentification à Microsoft 365 : l'utilisateur clique sur le lien du rapport, se retrouve
sur la page de connexion Microsoft qu'il connaît déjà, et arrive dans sa quarantaine sans rien créer. Activez
ce SSO avant d'envoyer la moindre annonce. Si les gens tombent sur un formulaire inconnu dès le premier jour,
vous ne les récupérez plus.

:::tip
Testez le parcours complet avec un compte utilisateur standard, pas avec votre compte administrateur : le
lien du rapport, la redirection Microsoft, l'arrivée dans la quarantaine, la libération d'un mail. Si une
étape vous fait hésiter, elle bloquera vos utilisateurs.
:::

## Importer les listes blanches et noires

Les listes d'expéditeurs autorisés et bloqués sont la mémoire de votre ancien antispam. Les perdre, c'est
revoir passer en quarantaine des fournisseurs de dix ans et rouvrir la porte à des expéditeurs que quelqu'un
avait bloqués pour de bonnes raisons.

1. Exportez les listes depuis Vade, niveau domaine et niveau utilisateur.
2. Importez-les dans Hornetsecurity, au même niveau. Je l'ai fait le lendemain de la bascule, une fois le flux
   stabilisé, et pas dans la précipitation du soir même.
3. Prévenez les utilisateurs que leurs listes ont été reprises, en français et en anglais. Sinon, ils
   reconstruisent la leur à la main, avec les erreurs qui vont avec.

:::caution
Une liste blanche importée en bloc est une liste que personne n'a relue. Profitez de l'export pour repérer les
entrées trop larges (un domaine entier de messagerie grand public, par exemple) avant l'import. C'est le seul
moment où vous aurez cette liste sous les yeux.
:::

## Écrire le mail d'annonce qui sera relu

Le mail à tout le personnel est parti le jour de la bascule. Il ne doit pas décrire l'architecture, il doit
répondre aux questions que les gens vont se poser le matin même. Voici ce qu'il contenait, dans cet ordre :

| Rubrique | Ce que l'utilisateur doit retenir |
| --- | --- |
| Le Control Panel | L'adresse, et le fait qu'on s'y connecte avec son compte Microsoft, sans nouveau mot de passe |
| Les rapports de quarantaine | À quelle fréquence ils arrivent, à quoi servent les boutons, et qu'ils remplacent ceux de Vade |
| Email Live Tracking | Comment retrouver soi-même un mail « qui n'est jamais arrivé » sans ouvrir un ticket |
| La protection des liens | Pourquoi les liens des mails sont réécrits, et que c'est normal |
| L'add-in Outlook | À quoi il sert, comment signaler un spam depuis Outlook |
| Le portail de restauration | Où retrouver un mail ou un fichier supprimé, grâce à la sauvegarde Microsoft 365 |
| Le guide utilisateur | En pièce jointe, en français |

Un seul mail, un tableau, une pièce jointe. Pas de version longue : ceux qui la voulaient m'ont écrit, et
c'est très bien ainsi.

## Surveiller les connecteurs sortants les premiers jours

Une passerelle antispam ne filtre pas que l'entrant : elle relaie aussi le sortant, avec des connecteurs
Exchange Online dédiés. Douze jours après la bascule, un client m'a signalé qu'il ne recevait plus nos mails.
Rien de visible côté utilisateurs, rien dans les rapports : le message partait, puis disparaissait quelque
part entre nous et eux.

Le ticket ouvert chez l'éditeur a mis une semaine à aboutir, et la solution tenait dans le connecteur de
relais de secours, celui qui prend le relais quand le chemin principal ne répond pas. Vérifiez donc, dès la
première semaine, que vos connecteurs sortants et leur secours sont configurés et testés vers plusieurs
destinataires externes, et gardez un canal ouvert avec vos clients les plus réactifs : ce sont eux qui vous
préviendront.

:::note
Pendant cette période, Email Live Tracking est votre meilleur ami : il montre le chemin de chaque message,
entrant ou sortant, et permet de dire « il est parti d'ici, il n'est pas arrivé là » avec des horodatages
plutôt que des suppositions.
:::

## Relancer individuellement, sans agacer

Une semaine après la bascule, un collègue m'écrit depuis un rapport de quarantaine Vade en me demandant
pourquoi il ne peut plus libérer un mail. Il n'avait pas fait le lien entre l'annonce et son rituel du matin.
Ma réponse tenait en une ligne : « Nous ne sommes plus sur Vade », avec le lien vers le nouveau Control Panel.

Les habitudes survivent plusieurs semaines à n'importe quel mail d'annonce. Ce n'est pas de la mauvaise
volonté, c'est la façon dont fonctionnent les gens qui ont autre chose à faire que de lire l'informatique.
Prévoyez donc :

- de couper les rapports de l'ancien service dès que possible, pour ne pas laisser deux sources concurrentes ;
- de répondre à chaque relance par un rappel court et sans reproche, avec le lien ;
- de garder l'annonce d'origine sous la main pour la renvoyer telle quelle.

## Noter ce qui manque, et le dire à l'éditeur

Deux jours après la bascule, j'ai fait remonter une demande de fonctionnalité : le bouton de l'add-in
n'apparaissait pas dans le nouveau Outlook, alors qu'il était présent dans le classique. L'éditeur l'a logué
comme demande d'évolution. Ce n'est pas bloquant, mais c'est le genre de détail qui fait dire aux utilisateurs
« ça ne marche pas » alors que tout le reste fonctionne.

Tenez une liste de ces écarts dès le premier jour : ce qui manque, qui l'a signalé, ce que l'éditeur a
répondu. Elle vous servira au prochain point avec le support, et elle évitera de redécouvrir le même manque à
chaque nouveau ticket.

## Ce que je referais autrement

Deux choses. D'abord, envoyer l'annonce deux jours avant la bascule plutôt que le jour même, pour que les
questions arrivent avant le changement et non pendant. Ensuite, tester le sortant vers une dizaine de
destinataires externes réels, clients compris, dès le premier soir : un client qui ne reçoit plus vos mails
pendant une semaine, c'est un devis qui part chez le concurrent.

## Pour aller plus loin

- [Hornetsecurity et Microsoft 365 : stopper les libérations automatiques de quarantaine provoquées par Safe Links](/docs/cybersecurite/hornetsecurity-safe-links-auto-release-de-quarantaine/),
  le piège qui m'attendait quelques mois plus tard.
- [Restaurer une équipe Teams avec une sauvegarde Microsoft 365](/docs/cybersecurite/restaurer-une-equipe-teams-avec-une-sauvegarde-microsoft-365/),
  pour le second volet de ce renouvellement.
- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/),
  parce que le mail d'annonce compte autant que la configuration.

<!-- source : mails « Migration antispam » 2025-11-05, imports des listes 2025-11-06, rappel 2025-11-12, ticket éditeur 2025-11-17 -> 2025-11-25 -->

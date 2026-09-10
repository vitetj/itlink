---
title: "Exchange Online : résoudre l'erreur OWA 500 TooManyObjectsOpenedException"
description: "Un utilisateur ne peut plus ouvrir sa messagerie : OWA renvoie une erreur 500 « TooManyObjectsOpenedException », parfois une 503. Trop de sessions MAPI ouvertes : le diagnostic et la remise en état, boîte par boîte."
published: 2026-05-07
category: microsoft-365
tags: [exchange-online, owa, outlook, mapi, boites-partagees, powershell]
level: intermédiaire
status: à jour
featured: false
tested_on: ["Exchange Online"]
sidebar:
  label: "Exchange Online"
---

Un matin, un collègue passe la tête dans le bureau : « ma messagerie ne s'ouvre plus ». Outlook Web App affiche une
page d'erreur 500 avec, en bas, un texte que personne ne lit sauf nous : `TooManyObjectsOpenedException`. En
rafraîchissant, on obtient parfois une 503 avec un en-tête `X-FEServer`. Il est le seul concerné dans l'entreprise, et,
pour corser le tout, le centre d'administration Microsoft 365 affiche au même moment un incident Exchange Online en
cours. Voilà le genre de matinée où l'on ne sait pas si l'on doit attendre Microsoft ou se retrousser les manches.

Réponse courte : les deux. Cette fiche décrit ce que l'erreur veut dire, et la séquence qui a remis la boîte en état
avec l'aide du TAM de notre CSP, sans recréer la boîte ni perdre une seule archive.

## Comprendre l'erreur

`TooManyObjectsOpenedException`, et sa cousine `MapiExceptionSessionLimit` qu'on trouve dans les journaux, disent la
même chose : le magasin de boîtes aux lettres refuse d'ouvrir un objet de plus pour cet utilisateur. Exchange limite
le nombre de sessions MAPI qu'une boîte peut avoir en parallèle, et le nombre d'objets (dossiers, messages,
notifications, pièces jointes) que chaque session peut garder ouverts. Quand le plafond est atteint, tout est refusé,
y compris la fenêtre OWA que vous ouvrez pour vérifier.

Qui consomme ces sessions ? Tout ce qui parle à la boîte en même temps :

| Consommateur | Pourquoi ça compte |
|---|---|
| Outlook classique sur le PC | Plusieurs sessions par profil, plus une par boîte partagée automappée |
| Le nouvel Outlook ouvert en parallèle | Encore un client complet, avec ses propres sessions |
| L'application mobile | Une session de plus, qui reste active en arrière-plan |
| Les onglets OWA | Chaque onglet ouvert compte |
| Les compléments (add-ins) | Certains gardent des objets ouverts en permanence |
| Les boîtes partagées automappées | Chaque boîte ajoutée automatiquement au profil ouvre ses propres sessions |

C'est un parking plein : le problème n'est pas la voiture qui arrive, ce sont toutes celles qui ne sont jamais
ressorties. Un utilisateur avec quatre boîtes partagées, deux clients de bureau, un mobile et trois onglets OWA
remplit le parking sans rien faire d'anormal.

La 503 avec `X-FEServer` est un symptôme secondaire : l'en-tête nomme le serveur frontal qui a traité la requête. Il ne
vous sert à rien, mais il sert au support Microsoft pour localiser le nœud. Notez-le si vous ouvrez un ticket.

## Prérequis

- Un compte administrateur Exchange sur le tenant.
- Le module `ExchangeOnlineManagement` installé (`Install-Module ExchangeOnlineManagement`).
- La liste des boîtes partagées sur lesquelles l'utilisateur a des droits.
- Un peu de patience : deux étapes demandent d'attendre que le serveur libère des ressources.

## Vérifier l'état du service avant de toucher à la boîte

Centre d'administration Microsoft 365 > Intégrité > État du service. S'il y a un incident Exchange Online en cours,
notez son identifiant et lisez le résumé. Chez nous, il y en avait un, et il expliquait probablement la 503, mais pas
la 500 : un seul utilisateur était touché, et son erreur parlait d'objets ouverts, pas de service indisponible.

:::note
Ne concluez pas trop vite à une boîte corrompue quand un incident est ouvert. Mais ne concluez pas non plus que tout
vient de Microsoft : un incident de service se manifeste rarement sur un seul utilisateur.
:::

## Fermer toutes les sessions de l'utilisateur

Première action, la plus simple et la plus efficace : couper tout ce qui est connecté à la boîte pour laisser le
magasin libérer les sessions.

1. Faire fermer Outlook, le nouvel Outlook, l'application mobile et tous les onglets du navigateur.
2. Centre d'administration > Utilisateurs > Utilisateurs actifs > l'utilisateur > « Déconnecter de toutes les
   sessions ». En PowerShell, l'équivalent passe par Microsoft Graph :

```powershell title="Révoquer les sessions"
Connect-MgGraph -Scopes User.RevokeSessions.All
Revoke-MgUserSignInSession -UserId user@example.com
```

3. Attendre 30 à 60 minutes avant tout nouvel essai. C'est le délai que le TAM nous a demandé de respecter, et c'est
   celui qu'il a fallu : les sessions côté serveur ne meurent pas à l'instant où le client se déconnecte.

## Retirer temporairement les boîtes partagées automappées

L'automapping est pratique : vous donnez un accès complet, la boîte partagée apparaît toute seule dans Outlook. Le
revers, c'est que chaque boîte ainsi ajoutée ouvre ses propres sessions, sans que l'utilisateur puisse la fermer.

Listez d'abord ce que l'utilisateur a comme accès :

```powershell title="Boîtes partagées accessibles par l'utilisateur"
Connect-ExchangeOnline
Get-Mailbox -RecipientTypeDetails SharedMailbox -ResultSize Unlimited |
  Get-MailboxPermission -User user@example.com |
  Where-Object { $_.AccessRights -contains 'FullAccess' } |
  Select-Object Identity, AccessRights
```

Puis retirez le droit et remettez-le sans automapping sur chaque boîte :

```powershell
Remove-MailboxPermission -Identity partage@example.com -User user@example.com -AccessRights FullAccess -Confirm:$false
Add-MailboxPermission -Identity partage@example.com -User user@example.com -AccessRights FullAccess -AutoMapping $false
```

L'utilisateur garde l'accès, mais Outlook n'ouvrira plus ces boîtes automatiquement. Il pourra ajouter à la main
celles dont il a vraiment besoin au quotidien (Fichier > Paramètres du compte > Paramètres supplémentaires > Avancé >
Ouvrir ces boîtes aux lettres supplémentaires), et consulter les autres depuis OWA à la demande.

:::tip
C'est le bon moment pour poser la question qui fâche : a-t-il vraiment besoin de ces six boîtes partagées, ou de deux ?
Chaque accès complet retiré est une famille de sessions en moins, pour de bon.
:::

## Lancer une réparation de boîte

Une fois les sessions retombées, on répare les structures internes qui peuvent avoir souffert. Exchange Online propose
quatre types de réparation, et on peut les demander en une seule fois :

```powershell title="Réparation en ligne"
New-MailboxRepairRequest -Mailbox user@example.com -CorruptionType ProvisionedFolder,SearchFolder,AggregateCounts,FolderView
```

| Type | Ce qui est vérifié |
|---|---|
| `ProvisionedFolder` | Les dossiers système qui doivent exister dans la boîte |
| `SearchFolder` | Les dossiers de recherche, souvent laissés en vrac par les clients |
| `AggregateCounts` | Les compteurs de messages et de non-lus par dossier |
| `FolderView` | Les vues de dossiers, celles qui font boucler un client quand elles sont incohérentes |

La commande rend la main tout de suite. La réparation se fait en tâche de fond, la boîte reste accessible pendant ce
temps, et il n'y a pas de barre de progression : laissez passer un moment avant de retester.

## Réduire ce qui consomme des sessions, durablement

Une fois l'accès rétabli, si vous ne changez rien, le parking se remplira à nouveau. Les règles que nous avons appliquées
à l'utilisateur concerné :

- Un seul client de bureau. Outlook classique ou le nouvel Outlook, pas les deux ouverts en permanence.
- Les boîtes partagées ouvertes à la demande, pas automappées, sauf les deux qu'il utilise toute la journée.
- Les compléments inutilisés désactivés (Fichier > Options > Compléments).
- Un seul onglet OWA quand il travaille depuis un autre poste.

## Récapitulatif

1. Vérifier l'état du service et noter l'identifiant d'incident s'il y en a un.
2. Fermer tous les clients et révoquer toutes les sessions, puis attendre 30 à 60 minutes.
3. Retirer les boîtes partagées automappées, les remettre avec `-AutoMapping $false`.
4. Lancer `New-MailboxRepairRequest` avec les quatre types de corruption.
5. Retester depuis OWA, puis depuis Outlook, et réduire durablement le nombre de clients et de compléments.

Chez nous, la boîte était de nouveau accessible dans la journée, sans recréation ni restauration. L'incident Exchange
Online, lui, s'est refermé tout seul, comme d'habitude.

## Pour aller plus loin

- Un autre cas où l'interface ne suffit pas :
  [Transférer une boîte partagée vers un alias externe « plus-adressé »](/docs/microsoft-365/regle-de-flux-transfert-vers-alias-plus-adresse/).
- Pour les boîtes qui refusent de migrer :
  [Migrer une boîte aux lettres de plus de 50 Go vers Exchange Online](/docs/microsoft-365/migrer-une-boite-de-plus-de-50-go-vers-exchange-online/).
- Référence Microsoft : [New-MailboxRepairRequest](https://learn.microsoft.com/powershell/module/exchange/new-mailboxrepairrequest).

<!-- source : mail « Incident OWA – Accès mails impossible pour un utilisateur », 2026-05-05 / 2026-05-06 -->

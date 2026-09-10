---
title: "Migrer une boîte aux lettres de plus de 50 Go vers Exchange Online sans y laisser sa nuit"
description: "Le lot de migration hybride s'arrête sur « Mailbox size 51.47 GB exceeds target quota 50 GB ». Quotas des plans Business, archive en ligne à activer avant le déplacement, PST à réinjecter : comment faire passer la boîte."
published: 2025-03-27
category: microsoft-365
tags: [exchange-online, migration, hybride, archive, quota, powershell]
level: intermédiaire
status: à jour
featured: false
tested_on: ["Exchange Server 2019", "Exchange Online", "Microsoft 365 Business Standard"]
sidebar:
  label: "Migrer une boîte aux lettres de plus de 50 Go…"
---

Le lot de migration tourne depuis la veille, les collègues ont reçu leur mail « redémarrez Outlook quand la fenêtre
apparaît », tout se passe bien. Puis une ligne rouge dans la liste des utilisateurs du lot :

```text
Mailbox size 51.47 GB exceeds target quota 50 GB
```

La boîte appartient à quelqu'un qui, deux mois plus tôt, avait réinjecté des années d'archives PST dans sa boîte à
notre demande. C'était la méthode retenue faute de pouvoir importer les PST directement dans l'archive en ligne. Résultat
prévisible avec le recul : une boîte de 51 Go, et un plan Microsoft 365 Business qui plafonne à 50. Exchange Online ne
négocie pas : tant que la source ne rentre pas dans le quota cible, le déplacement ne démarre pas, quel que soit le
`BadItemLimit` que vous mettez.

Cette fiche explique d'où vient le plafond, comment repérer les boîtes à risque avant de lancer le lot, et la méthode
qui a fait passer celle-là : activer l'archive en ligne avant le déplacement.

## Pourquoi 50 Go

Le quota de la boîte principale dépend de la licence attribuée à l'utilisateur, pas du tenant. Les ordres de grandeur
au moment où j'écris, à vérifier dans la page des limites Exchange Online de Microsoft qui change régulièrement :

| Licence | Boîte principale | Archive en ligne |
|---|---|---|
| Microsoft 365 Business Basic / Standard / Premium | 50 Go | 50 Go |
| Microsoft 365 E3 / E5 | 100 Go | Extensible automatiquement, jusqu'à 1,5 To |
| Exchange Online Archiving (module complémentaire) | Inchangée | Extensible automatiquement, jusqu'à 1,5 To |

La migration hybride vérifie la taille de la source contre le quota de la cible avant de déplacer le premier message.
Deux leviers, donc : réduire la source, ou agrandir la cible. Changer de plan pour un seul utilisateur est possible mais
coûteux ; l'archive en ligne est le levier raisonnable, et il rend service après la migration aussi.

## Prérequis

- L'Exchange Management Shell sur le serveur local et le module Exchange Online PowerShell.
- Une licence qui inclut l'archive pour l'utilisateur concerné : un plan Business ou Entreprise, ou le module Exchange
  Online Archiving seul. C'est ce que nous avons pris pour un utilisateur qui n'avait pas de licence Office.
- Du temps. La stratégie d'archivage ne vide pas une boîte en dix minutes, et c'est le point qui pique.

## Repérer les boîtes à risque avant de lancer le lot

Un tri par taille sur le serveur local évite de découvrir le problème en plein lot :

```powershell title="Exchange Management Shell, sur le serveur local"
Get-Mailbox -ResultSize Unlimited | Get-MailboxStatistics |
  Sort-Object TotalItemSize -Descending |
  Select-Object -First 15 DisplayName, ItemCount, TotalItemSize, TotalDeletedItemSize
```

Règle que j'applique depuis : tout ce qui dépasse 45 Go est traité avant le lot, pas après. La marge couvre le décalage
entre la taille affichée et celle que calcule le service de déplacement.

## Activer l'archive en ligne avant le déplacement

L'archive est une seconde boîte, rattachée à la première, où la stratégie de rétention déplace automatiquement les
éléments anciens. La stratégie par défaut (« Default MRM Policy ») contient une balise « Default 2 year move to
archive » : tout ce qui a plus de deux ans part dans l'archive sans intervention de l'utilisateur.

En hybride, une boîte encore sur le serveur local peut avoir son archive dans le cloud. C'est ce que nous avons fait :

```powershell title="Sur le serveur Exchange local"
Enable-Mailbox -Identity user@example.com -RemoteArchive -ArchiveDomain "example.mail.onmicrosoft.com"
```

Puis, sur le serveur Entra Connect, forcez une synchronisation pour que l'objet remonte avec son archive, et attribuez
(ou vérifiez) la licence qui inclut l'archive :

```powershell
Start-ADSyncSyncCycle -PolicyType Delta
```

Ensuite, ne restez pas à regarder la boîte en espérant qu'elle maigrisse. C'est ce que je redoutais, et c'est ce qui
s'est produit : rien ne partait tout seul dans l'archive dans un délai compatible avec une migration en cours.
L'assistant de dossiers gérés travaille par cycle, pas à la demande. Forcez-le :

```powershell
Start-ManagedFolderAssistant -Identity user@example.com
```

Contrôlez ensuite l'évolution de la boîte principale et de l'archive :

```powershell
Get-MailboxStatistics -Identity user@example.com | Format-List DisplayName, ItemCount, TotalItemSize
Get-MailboxStatistics -Identity user@example.com -Archive | Format-List DisplayName, ItemCount, TotalItemSize
```

:::caution[La balise de deux ans ne déplace que ce qui a deux ans]
Si les 51 Go sont faits de mails récents, la stratégie par défaut ne fera presque rien. Deux options : créer une balise
de rétention plus courte le temps de la migration, ou demander à l'utilisateur de déplacer lui-même ses dossiers
volumineux dans l'archive depuis Outlook, par glisser-déposer. La seconde est plus rapide qu'on ne le croit : deux ou
trois gros dossiers d'archives suffisent en général à repasser sous la barre.
:::

## Relancer le déplacement

Une fois la boîte principale sous les 50 Go, relancez l'utilisateur en échec dans le lot, sans recréer le lot :

```powershell title="Exchange Online PowerShell"
Connect-ExchangeOnline
Get-MigrationUserStatistics -Identity user@example.com | Format-List Status, Error, TotalItemsInSourceMailboxCount, BytesTransferred
Start-MigrationUser -Identity user@example.com
```

Chez nous, la boîte est passée au second essai, archive comprise, et l'utilisateur a retrouvé ses dossiers exactement
comme il les avait rangés.

## Alternative : réinjecter les PST dans la boîte avant la migration

C'est la méthode qui nous a mis dans cette situation, mais elle reste valable pour les boîtes raisonnables. Le
prestataire de la première tentative ne savait pas importer les PST directement dans l'archive en ligne. Nous avons donc
agrandi temporairement le disque de la base Exchange, relevé les quotas locaux à 40 Go, et demandé aux utilisateurs
de glisser le contenu de leurs PST dans leur boîte avant le déplacement :

```powershell title="Relever le quota d'une boîte locale"
Set-Mailbox -Identity user@example.com -UseDatabaseQuotaDefaults $false `
  -IssueWarningQuota 38GB -ProhibitSendQuota 39GB -ProhibitSendReceiveQuota 40GB
```

Le calcul à faire avant : taille de la boîte, plus taille des PST, doit rester sous 50 Go avec de la marge. Sinon vous
lirez la même ligne rouge que moi.

## Et l'import PST par Microsoft ?

Le service d'importation de Microsoft Purview (chargement réseau vers un conteneur Azure, puis mappage vers les boîtes)
est la méthode officielle pour les PST. Au moment de notre migration, le lien de chargement renvoyait une erreur 500 et
le ticket ouvert chez Microsoft n'a pas abouti à temps. Gardez-le pour les archives à traiter après la migration, pas
comme plan pour le jour J.

## Récapitulatif

1. Trier les boîtes locales par taille, traiter tout ce qui dépasse 45 Go avant le lot.
2. Activer une archive distante (`Enable-Mailbox -RemoteArchive`), synchroniser, vérifier la licence.
3. Forcer l'assistant de dossiers gérés, ou faire déplacer les gros dossiers à la main.
4. Contrôler la taille, puis `Start-MigrationUser`.

## Pour aller plus loin

- Le flux hybride qui refusait de passer la même semaine :
  [Exchange hybride : flux on-premise vers Exchange Online refusé « 451 5.7.3 STARTTLS is required »](/docs/microsoft-365/exchange-hybride-451-starttls-required/).
- Le récit complet de la migration :
  [Exchange hybride : la migration « clé en main » que j'ai finie à la main](/blog/exchange-hybride-la-migration-que-jai-finie-a-la-main/).
- Référence Microsoft : [Limites Exchange Online](https://learn.microsoft.com/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits).

<!-- source : mails « Une manipulation avant migration des mails », 2025-01-30 ; « Sniff », 2025-03-24 ; « RE: bug connu chez Vade », 2025-03-26 -->

---
title: "Archiver sa boîte Outlook sans perdre ses mails"
description: "Archivage local en PST, archive en ligne Exchange et suppression ne font pas la même chose. Et pourquoi l'archivage d'Outlook ne déplace presque rien tant qu'une clé de registre n'est pas corrigée."
published: 2024-06-11
category: microsoft-365
tags: [outlook, exchange-online, archivage, pst, retention, registre]
level: débutant
status: à jour
tested_on: [Outlook 16.0]
featured: false
sidebar:
  label: "Archiver sa boîte Outlook"
---

« Votre boîte aux lettres est pleine. » Le message tombe généralement un matin, et il tombe rarement seul :
quand une boîte sature, elle cesse d'envoyer, puis de recevoir. La réponse spontanée est d'archiver. Sauf
qu'« archiver » désigne trois choses différentes, dont une seule correspond en général à ce que veut
l'utilisateur, et dont une autre fait sortir ses mails de toute sauvegarde sans qu'il s'en rende compte.

Prenons le temps de les distinguer avant de cliquer.

## Les trois options, et ce qu'elles font vraiment

| | Archive en ligne | Archivage local (.pst) | Suppression |
|---|---|---|---|
| Où vont les mails | Dans une seconde boîte, côté serveur | Dans un fichier sur le poste | Dans les éléments supprimés, puis nulle part |
| Accessible depuis le webmail et le mobile | Oui | Non | — |
| Compris dans la sauvegarde de la messagerie | Oui | Non | — |
| Recherche globale | Oui | Seulement depuis ce poste, ce profil | — |
| Libère la boîte principale | Oui | Oui | Oui, avec un délai |
| Risque principal | Dépend du plan de licence | Fichier unique, corruptible, perdu avec le poste | Irréversible passé les délais de rétention |

La ligne à retenir est la troisième. Un fichier PST posé sur un disque local n'est sauvegardé par personne.
C'est un carton au grenier : il n'existe qu'à un exemplaire, il prend feu avec la maison, et quand on y
retourne cinq ans plus tard on découvre qu'il s'est abîmé. Plusieurs entreprises ont perdu dix ans d'historique
commercial comme ça, sans malveillance ni panne spectaculaire — juste un PC remplacé.

## Option 1 : l'archive en ligne, celle qu'il faut préférer

Exchange sait attacher à une boîte une seconde boîte d'archive, qui apparaît dans Outlook et dans le webmail
comme un dossier supplémentaire. Les mails restent côté serveur : sauvegardés, cherchables, accessibles depuis
le téléphone.

:::note
L'archive en ligne n'est pas incluse dans tous les plans Exchange Online. Vérifiez ce que couvre votre
abonnement **avant** de la promettre à un utilisateur ; c'est une déception classique en réunion.
:::

L'activation se fait depuis le centre d'administration Exchange, ou en une ligne de PowerShell Exchange Online :

```powershell title="Activer l'archive d'une boîte"
Enable-Mailbox -Identity utilisateur@example.com -Archive
Get-Mailbox -Identity utilisateur@example.com | Select-Object ArchiveStatus, ArchiveQuota
```

Activer l'archive ne déplace rien toute seule. Ce qui déplace, c'est une **stratégie de rétention** : une règle
qui dit « tout message de plus de deux ans part à l'archive ». Elle s'applique côté serveur, sans intervention
de l'utilisateur, et continue de fonctionner quand il est en congés.

```powershell title="Créer une règle de déplacement vers l'archive"
New-RetentionPolicyTag "Vers archive - 2 ans" -Type All -RetentionEnabled $true `
  -AgeLimitForRetention 730 -RetentionAction MoveToArchive
New-RetentionPolicy "Archivage standard" -RetentionPolicyTagLinks "Vers archive - 2 ans"
Set-Mailbox -Identity utilisateur@example.com -RetentionPolicy "Archivage standard"
```

L'assistant qui applique ces règles ne passe pas en temps réel, comptez plusieurs jours. Pour une boîte en
urgence, forcez-le :

```powershell title="Forcer le traitement d'une boîte"
Start-ManagedFolderAssistant -Identity utilisateur@example.com
```

## Option 2 : l'archivage local dans un fichier PST

C'est l'archivage historique d'Outlook : **Fichier > Outils > Nettoyer les anciens éléments**. On choisit un
dossier, une date, un fichier de destination, et Outlook déplace ce qui est plus ancien.

Sur le papier. En pratique, le scénario est toujours le même : on lance l'archivage sur une boîte de quinze
ans, ça tourne dix minutes, et deux cents messages ont bougé. La boîte est toujours pleine, l'utilisateur
toujours bloqué, et on recommence en changeant la date sans que ça n'aide.

### Pourquoi l'archivage ne déplace presque rien

Parce qu'Outlook ne regarde pas la date de réception du message, mais sa **date de dernière modification**. Or
un message est « modifié » dès qu'on le déplace dans un sous-dossier, qu'on lui met une catégorie, un indicateur
de suivi, ou qu'il est touché par une réorganisation de la boîte. Un mail de 2011 rangé dans un dossier client
en 2023 a, pour Outlook, une date de modification de 2023. Il ne sera jamais archivé.

Microsoft documente une valeur de registre qui règle exactement ce point : elle demande à Outlook d'ignorer la
date de dernière modification et de se fier à la date du message.

```reg title="Ignorer la date de dernière modification à l'archivage"
[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Preferences]
"ArchiveIgnoreLastModifiedTime"=dword:00000001
```

Ou, en PowerShell, dans la session de l'utilisateur concerné :

```powershell title="La même chose, sans passer par regedit"
$cle = 'HKCU:\Software\Microsoft\Office\16.0\Outlook\Preferences'
New-Item -Path $cle -Force | Out-Null
New-ItemProperty -Path $cle -Name 'ArchiveIgnoreLastModifiedTime' `
  -PropertyType DWord -Value 1 -Force
```

Fermez Outlook, rouvrez la session, relancez l'archivage : cette fois les messages partent réellement.

:::caution
`16.0` correspond à Outlook 2016 et à toutes les versions suivantes, y compris Microsoft 365 Apps. Vérifiez
la branche présente sur le poste avant de créer la clé au mauvais endroit.

Surtout, c'est une clé **utilisateur** : sur un serveur de bureaux à distance partagé, il faut la déposer pour
chaque profil. Passez par les préférences de stratégie de groupe (Configuration utilisateur > Préférences >
Paramètres Windows > Registre) plutôt que de faire le tour des sessions à la main.
:::

### Si vous devez vraiment produire un PST

Alors traitez-le comme une pièce d'archive, pas comme un dossier de travail : un fichier par personne, rangé
sur un partage **sauvegardé**, passé en lecture seule une fois constitué, et inventorié quelque part. Et
sachez que Microsoft ne prend pas en charge un PST ouvert en permanence depuis un partage réseau : c'est le
meilleur moyen de le corrompre. On l'y dépose, on ne travaille pas dedans.

## Option 3 : supprimer, et savoir où vont les messages

Supprimer libère de la place, mais pas immédiatement, et c'est ce qui déroute les utilisateurs.

Un message supprimé va d'abord dans **Éléments supprimés**, où il compte toujours dans le quota. Vidé de là, il
passe dans les **éléments récupérables**, invisibles dans le dossier mais conservés — 14 jours par défaut,
jusqu'à 30 si vous le demandez — et ils comptent dans leur propre quota. D'où la phrase classique : « j'ai tout
vidé et c'est toujours plein ».

```powershell title="Allonger la fenêtre de récupération"
Set-Mailbox -Identity utilisateur@example.com -RetainDeletedItemsFor 30.00:00:00
```

Avant de supprimer quoi que ce soit, faites le tri par le poids et pas par l'âge : **Fichier > Outils >
Nettoyage de la boîte aux lettres** donne la taille par dossier. Dans la grande majorité des boîtes saturées,
quelques dizaines de mails avec pièces jointes lourdes représentent l'essentiel du volume. Les traiter prend
dix minutes et évite complètement le débat sur l'archivage.

## L'ordre dans lequel je procède

1. Mesurer : taille de la boîte, taille par dossier, quota réel.
2. Sortir les grosses pièces jointes vers l'espace de fichiers prévu pour ça.
3. Vider les dossiers sans valeur, puis attendre l'expiration des éléments récupérables.
4. Activer l'archive en ligne et poser une stratégie de rétention, pour que le problème ne revienne pas.
5. Ne produire un PST que pour un cas précis : un départ, une demande juridique, une reprise d'historique.

Les quatre premières étapes ne demandent rien à l'utilisateur. C'est tout l'intérêt : une boîte qui se gère
toute seule ne repasse pas au support dans six mois.

## Pour aller plus loin

- [Migrer une boîte de plus de 50 Go vers Exchange Online](/docs/microsoft-365/migrer-une-boite-de-plus-de-50-go-vers-exchange-online/).
- [OWA : erreur 500 TooManyObjectsOpened](/docs/microsoft-365/owa-erreur-500-toomanyobjectsopened/), l'autre
  symptôme des boîtes qui ont trop grossi.
- [Restaurer une équipe Teams avec une sauvegarde Microsoft 365](/docs/cybersecurite/restaurer-une-equipe-teams-avec-une-sauvegarde-microsoft-365/),
  parce qu'archivage et sauvegarde ne sont pas synonymes.
- Documentation Microsoft : [Archives en ligne dans Exchange Online](https://learn.microsoft.com/exchange/policy-and-compliance/mrm/mrm).

<!-- source : procédure interne « Archivage Outlook », export du centre de documentation -->

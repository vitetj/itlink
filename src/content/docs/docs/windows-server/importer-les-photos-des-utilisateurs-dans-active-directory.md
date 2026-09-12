---
title: "Importer les photos des utilisateurs dans Active Directory"
description: "Préparer les images au bon format, écrire l'attribut thumbnailPhoto en masse avec PowerShell, et comprendre pourquoi la photo met un à deux jours à apparaître dans Outlook et dans Teams."
published: 2025-09-24
category: windows-server
tags: [active-directory, powershell, thumbnailphoto, outlook, teams, annuaire]
level: intermédiaire
status: à jour
featured: false
sidebar:
  label: "Importer les photos dans l'AD"
---

La demande arrive rarement de l'informatique. Elle vient des ressources humaines, ou d'un nouvel arrivant qui
met trois semaines à associer les noms aux visages dans une usine de cent personnes. Techniquement, c'est
simple : une photo par compte dans l'annuaire, et Outlook, Teams et le webmail l'affichent partout, à côté de
chaque message et de chaque réunion.

Simple, mais avec quelques pièges bien cachés : un attribut à la taille limitée, un format d'image qui rend mal
dans Outlook, et un délai d'affichage qui fait croire que l'import a échoué alors qu'il a parfaitement
fonctionné. Voici la procédure complète, du fichier image jusqu'à la vignette dans Teams.

## Ce que stocke réellement Active Directory

La photo vit dans l'attribut **`thumbnailPhoto`** de l'objet utilisateur. C'est un attribut binaire, qui
contient l'image elle-même — pas un chemin vers un fichier. Deux conséquences.

D'abord, une limite dure : le schéma Active Directory plafonne `thumbnailPhoto` à **100 Ko**. Au-delà,
l'écriture est refusée. Ce n'est pas un conseil de performance, c'est un mur.

Ensuite, cet attribut est répliqué. Il part vers tous vos contrôleurs de domaine, il est publié dans le
catalogue global, et il grossit la base d'annuaire d'autant. Mille utilisateurs à 100 Ko, c'est 100 Mo à
répliquer sur chaque contrôleur. Mille utilisateurs à 8 Ko, c'est 8 Mo. La différence à l'écran est nulle,
la différence pour l'annuaire est réelle. Visez petit.

:::note
Vous croiserez aussi l'attribut `jpegPhoto`, utilisé par certaines applications LDAP et par beaucoup d'outils
du monde Linux. Si vous avez un intranet ou un annuaire interne qui lit LDAP, vérifiez lequel des deux il
attend avant de conclure que « la photo ne remonte pas ».
:::

## Prérequis

- Le **droit d'écriture sur les objets utilisateur** des unités d'organisation concernées. Une délégation
  suffit largement, inutile d'être administrateur du domaine pour poser une photo.
- Le **module PowerShell ActiveDirectory** (outils d'administration de serveur distant), depuis un poste ou
  un serveur d'administration. Ouvrir une session interactive sur un contrôleur de domaine pour faire ça n'a
  aucune justification : tout se pilote à distance.
- Un dossier contenant les images, **nommées avec l'identifiant de connexion** de chaque utilisateur :
  `jdupont.jpg`, `mmartin.jpg`. C'est ce qui rend l'opération automatisable ; tout le reste en découle.
- L'accord des personnes concernées, et une ligne dans votre registre de traitements. Une photo de salarié est
  une donnée personnelle.

## Préparer les images, c'est 90 % du travail

| Usage | Dimensions | Poids visé | Où c'est stocké |
|---|---|---|---|
| Annuaire AD, Outlook classique | 96 × 96 px | 5 à 10 Ko | `thumbnailPhoto` |
| Photo haute définition Microsoft 365 | 648 × 648 px | < 500 Ko | Boîte aux lettres Exchange |

Partez d'un cliché net, recadré **carré** et centré sur le visage : tous les clients affichent la vignette en
rond ou en carré, un portrait en 3/4 sera tronqué n'importe comment. Gardez un original en haute définition
quelque part, il servira pour le trombinoscope, le badge et l'intranet.

Ensuite, redimensionnez. À l'unité, n'importe quel éditeur d'images fait l'affaire. En lot, ImageMagick règle
la question en une commande :

```bash title="Recadrer et réduire tout un dossier"
magick mogrify -resize "96x96^" -gravity center -extent 96x96 -quality 85 -strip *.jpg
```

L'option `-strip` retire les métadonnées EXIF, dont la géolocalisation du téléphone qui a pris la photo. Ce
n'est pas un détail quand l'attribut sera lisible par tout le domaine.

:::caution
Préférez le **JPEG**. Un PNG 32 bits embarque une couche de transparence qu'une partie des clients Outlook ne
sait pas interpréter : la photo s'affiche alors sur fond noir, et vous passerez une heure à chercher pourquoi
seuls certains postes sont concernés. Si vous tenez au PNG, aplatissez-le sur fond blanc.
:::

## Importer en masse avec PowerShell

Le script parcourt le dossier, retrouve chaque compte à partir du nom de fichier, refuse ce qui dépasse la
limite et écrit l'attribut. Testez-le d'abord sur deux ou trois comptes.

```powershell title="Import des photos depuis un dossier"
Import-Module ActiveDirectory
$source = 'C:\photos'

foreach ($fichier in Get-ChildItem -Path $source -Filter *.jpg) {
    $identifiant = $fichier.BaseName

    if ($fichier.Length -gt 100KB) {
        Write-Warning "$identifiant : $([math]::Round($fichier.Length/1KB)) Ko, au-dessus de la limite. Ignoré."
        continue
    }

    $compte = Get-ADUser -Filter "sAMAccountName -eq '$identifiant'" -ErrorAction SilentlyContinue
    if (-not $compte) {
        Write-Warning "$identifiant : aucun compte correspondant. Ignoré."
        continue
    }

    $octets = [System.IO.File]::ReadAllBytes($fichier.FullName)
    Set-ADUser -Identity $compte -Replace @{ thumbnailPhoto = $octets }
    Write-Host "OK  $identifiant  ($([math]::Round($fichier.Length/1KB,1)) Ko)"
}
```

Vérifiez ensuite qu'un compte porte bien sa photo, et sa taille :

```powershell title="Contrôle après import"
(Get-ADUser jdupont -Properties thumbnailPhoto).thumbnailPhoto.Length
```

Pour retirer une photo — un départ, une demande de la personne, une image obsolète :

```powershell title="Supprimer la photo d'un compte"
Set-ADUser -Identity jdupont -Clear thumbnailPhoto
```

### Et les outils graphiques ?

Il existe des utilitaires dédiés, gratuits pour certains, qui présentent l'arborescence des unités
d'organisation, redimensionnent l'image et écrivent l'attribut en deux clics. Pour une photo isolée ou pour
déléguer la tâche à quelqu'un qui n'ouvrira jamais PowerShell, c'est parfaitement adapté. Pour une campagne
annuelle ou une intégration de nouvel arrivant, le script gagne : il est reproductible, il journalise, et il
refuse silencieusement les fichiers trop gros au lieu d'échouer devant vous.

## Faire apparaître la photo dans Outlook, Teams et Microsoft 365

C'est ici que la plupart des tickets « ça n'a pas marché » se créent. L'import est instantané, l'affichage ne
l'est pas.

### Outlook avec un Exchange sur site

Outlook ne lit pas l'annuaire en direct, il lit une copie locale : le carnet d'adresses en mode hors
connexion. Celui-ci est régénéré côté serveur une fois par jour, et téléchargé par le client à son propre
rythme. Deux jours de décalage sont normaux. Pour accélérer, forcez la régénération côté Exchange, puis
demandez au client de retélécharger via **Envoi/Réception > Carnets d'adresses**.

```powershell title="Régénérer le carnet d'adresses hors connexion"
Update-OfflineAddressBook -Identity "Default Offline Address Book"
```

### Microsoft 365, Teams et le webmail

Dans un environnement synchronisé, l'outil de synchronisation d'annuaire remonte bien `thumbnailPhoto` vers
Entra ID. Mais dès qu'une boîte existe dans Exchange Online, **c'est la photo stockée côté boîte aux lettres
qui fait foi** pour Teams, le webmail et Outlook, et l'annuaire local ne l'écrase pas. Autrement dit : écrire
dans l'AD ne suffit pas toujours à changer la vignette Teams de quelqu'un qui en a déjà une.

La photo haute définition se pose côté Exchange Online, ou via Microsoft Graph :

```powershell title="Poser la photo côté boîte aux lettres"
Set-UserPhoto -Identity utilisateur@example.com `
  -PictureData ([System.IO.File]::ReadAllBytes("C:\photos\hd\jdupont.jpg")) -Confirm:$false
```

Teams met ensuite plusieurs heures à rafraîchir son propre cache. Ne relancez rien pendant ce temps, et
surtout ne réimportez pas : vous ajouteriez seulement du bruit.

:::tip
Si vous tenez à ce que les photos restent cohérentes et validées, empêchez les utilisateurs de changer la
leur depuis le webmail avec `Set-OwaMailboxPolicy -SetPhotoEnabled $false`. À arbitrer : c'est un gain de
cohérence contre une perte d'autonomie, et tout le monde ne tranchera pas dans le même sens.
:::

## Les pièges à connaître

- **Une image de 120 Ko fait échouer l'écriture** avec une erreur de violation de contrainte peu explicite.
  Contrôlez la taille avant, comme le fait le script.
- **La photo est répliquée partout.** Ce n'est pas un stockage de fichiers : gardez les originaux ailleurs.
- **Prévoyez la sortie autant que l'entrée.** Purger `thumbnailPhoto` doit figurer dans la procédure de départ
  d'un collaborateur, au même titre que la désactivation du compte.
- **Demandez l'accord des personnes** et dites-leur qui verra la photo. Une opposition doit être simple à
  exercer, et gratuite pour vous à appliquer : une ligne de PowerShell.

## Pour aller plus loin

- [Checklist d'intégration d'un nouveau collaborateur](/docs/dsi/checklist-dintegration-dun-nouveau-collaborateur/),
  où la photo trouve sa place à côté du compte et du matériel.
- [Aligner l'annuaire d'entreprise sur l'ERP](/docs/architecture/aligner-lannuaire-dentreprise-sur-lerp/).
- [Synchroniser l'annuaire d'entreprise dans les contacts Outlook](/lab/synchroniser-lannuaire-dentreprise-dans-les-contacts-outlook/).
- Documentation Microsoft : [Set-UserPhoto](https://learn.microsoft.com/powershell/module/exchange/set-userphoto).

<!-- source : procédure interne « Importation photos dans l'AD », export du centre de documentation -->

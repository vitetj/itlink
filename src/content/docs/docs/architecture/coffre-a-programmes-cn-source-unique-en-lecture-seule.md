---
title: "Le coffre à programmes de commande numérique : une source unique, en lecture seule, sauvegardée"
description: "Sortir les programmes CN des clés USB et des disques de cellule sans acheter un PDM : un partage unique, un compte de service par machine en lecture seule, des raccourcis pour les opérateurs, une sauvegarde qui tourne."
published: 2025-10-09
category: architecture
tags: [cnc, smb, sauvegarde, atelier, veeam, gouvernance-des-donnees]
level: intermédiaire
status: à jour
featured: true
tested_on: [Windows Server, Veeam, Fastems MMS5]
---

Un atelier d'usinage, c'est plusieurs machines achetées à plusieurs époques, chez plusieurs constructeurs, avec chacune sa façon d'aller chercher un programme. Chez moi : un centre d'usinage alimenté par clé USB, deux tours qui ne sont même pas raccordés au réseau, une cellule FMS dont le PC de contrôle stocke les programmes en local — sur un disque régulièrement plein — et des programmeurs qui gardent leurs versions de travail dans leurs dossiers personnels.

Tant que tout va bien, ça marche. Le jour où le disque de la cellule lâche, où la clé USB est perdue, ou simplement où deux personnes ont chacune « la bonne version » d'un programme, on découvre que la donnée qui fait tourner l'atelier n'existe nulle part de façon fiable. Ce n'est pas un problème de sauvegarde : c'est un problème de **source de vérité**.

La solution propre s'appelle un PDM, et je l'ai demandée. En attendant qu'elle soit budgétée, j'ai monté ce que les programmeurs ont baptisé « le coffre » : un partage unique, sauvegardé, exposé aux machines en lecture seule. Une semaine de travail, aucun achat de licence, et le risque le plus visible de l'atelier a disparu.

## Prérequis

- Un serveur de fichiers avec de la place et déjà couvert par votre sauvegarde. Si le partage n'est pas sauvegardé, vous n'avez pas fait un coffre, vous avez fait un placard.
- Un annuaire pour créer des comptes de service, ou au minimum des comptes locaux si certaines machines ne savent pas s'authentifier autrement.
- La liste des machines, avec pour chacune : sait-elle lire un partage réseau, et dans quelle version de SMB.
- **Un programmeur d'usinage qui accepte de définir la nomenclature.** Le domaine de l'industrie n'est pas mon métier ; l'arborescence et les règles de nommage sont les leurs, pas les miennes. Mon travail est de tenir le contenant.

## Concevoir l'arborescence avant de créer quoi que ce soit

L'erreur classique consiste à créer un partage vide et à laisser chacun y déposer ce qu'il veut. Six mois plus tard, vous avez reproduit le désordre initial, mais centralisé.

Fixez d'abord la structure, machine par machine, et validez-la avec les programmeurs :

```text title="Arborescence du coffre"
\\srv-fichiers.example.com\programmes
├── _archives\              versions retirées du service, jamais supprimées
├── _modeles\               squelettes de programmes, en-têtes standard
├── centre-usinage-01\
│   ├── production\         programmes validés, envoyés en machine
│   └── essais\             en cours de mise au point
├── cellule-fms\
│   ├── production\
│   └── essais\
├── tour-01\
└── tour-02\
```

Deux principes gouvernent cette arborescence.

**Un dossier par machine, pas par affaire.** L'opérateur qui cherche un programme est devant une machine, pas devant un dossier client. L'arborescence doit suivre son geste, sinon il retournera à sa clé USB.

**Une séparation nette entre `essais` et `production`.** C'est ce qui permet plus tard de donner des droits différents et de savoir ce qui tourne réellement. Sans cette séparation, personne n'ose rien supprimer et le coffre gonfle indéfiniment.

## Créer un compte de service par machine, en lecture seule

C'est le cœur du dispositif, et le point sur lequel je n'ai pas transigé. Une machine-outil ne doit **jamais** écrire dans le coffre.

Une commande numérique n'a pas d'antivirus, pas de journalisation exploitable, et son pupitre est accessible à toute personne qui passe dans l'atelier. Si elle peut écrire, elle peut aussi écraser et supprimer — par erreur de manipulation, par un opérateur pressé, ou par un rançongiciel arrivé par une clé USB. La lecture seule transforme le pire scénario machine en simple incident local.

```powershell title="Compte de service et partage, côté serveur de fichiers"
# Un compte par machine, mot de passe long, pas d'expiration mais rotation planifiée
New-ADUser -Name "svc-cellule-fms" -SamAccountName "svc-cellule-fms" `
  -Description "Compte machine - lecture seule sur le coffre programmes" `
  -AccountPassword (Read-Host -AsSecureString "Mot de passe") `
  -PasswordNeverExpires $true -CannotChangePassword $true -Enabled $true

# Partage : lecture seule pour les machines, écriture pour les programmeurs
New-SmbShare -Name "programmes" -Path "D:\Data\Programmes" `
  -ReadAccess "DOMAINE\svc-cellule-fms","DOMAINE\svc-tour-01" `
  -ChangeAccess "DOMAINE\GG-Programmation-Usinage"

# NTFS : on retire l'héritage large et on ne laisse que ce qui est nécessaire
icacls "D:\Data\Programmes" /grant "DOMAINE\svc-cellule-fms:(OI)(CI)(RX)"
```

:::caution
Un compte de service par machine, pas un compte partagé pour tout l'atelier. Le jour où une machine part en révision ou change de propriétaire, vous désactivez un compte sans toucher aux autres. Et quand vous verrez des accès bizarres dans les journaux, vous saurez de quelle machine ils viennent.
:::

## Ramener les machines hors réseau dans le dispositif

Toutes les machines ne savent pas lire un partage moderne. Deux cas typiques et leurs réponses.

**La machine qui ne parle que SMB1.** Réactiver SMB1 sur le serveur de fichiers pour lui faire plaisir n'est pas une option : c'est un protocole obsolète, non chiffré, et exactement le vecteur qu'on cherche à éviter. La réponse est une petite passerelle — un poste dédié, isolé sur le VLAN machines, qui monte le coffre en SMB moderne d'un côté et expose un partage restreint à la machine de l'autre. Une VM suffit.

**La machine qui ne lit qu'une clé USB.** Elle ne rejoindra pas le coffre, et ce n'est pas grave à condition d'inverser le flux : la clé n'est plus le stockage de référence, elle devient une copie jetable **fabriquée depuis le coffre**. Le programme validé vit sur le serveur, on le copie sur la clé au moment de l'usinage, et on ne modifie jamais la version de la clé.

:::note
Ces machines-là sont aussi celles pour lesquelles la sauvegarde compte le plus : les seules copies de leurs programmes n'existent souvent que sur le disque de la commande numérique, et personne ne sait s'il est sauvegardé. Réponse courte : non.
:::

## Poser des raccourcis là où les gens regardent déjà

C'est l'étape que je trouve la plus rentable, et celle que les projets techniques oublient toujours.

Les opérateurs et les programmeurs ont des habitudes : un dossier sur le bureau, un lecteur réseau, un chemin appris par cœur. Si le coffre les oblige à changer, ils ne l'utiliseront pas, ou seulement quand vous regardez.

Alors on ne change rien à leurs habitudes : on met un **raccourci vers le coffre à l'endroit exact où ils avaient l'habitude d'aller**, et on vide progressivement l'ancien emplacement.

```powershell title="Raccourci vers le dossier machine, déposé par GPO ou script d'ouverture de session"
$w = New-Object -ComObject WScript.Shell
$lnk = $w.CreateShortcut("$env:USERPROFILE\Desktop\Programmes cellule FMS.lnk")
$lnk.TargetPath = "\\srv-fichiers.example.com\programmes\cellule-fms"
$lnk.Description = "Coffre a programmes - source unique"
$lnk.Save()
```

Et côté machines, on mappe le dossier correspondant avec le compte de service, jamais avec un compte nominatif : le jour où la personne quitte l'entreprise, la machine continue de fonctionner.

## Sauvegarder, et vérifier que la sauvegarde existe vraiment

Un coffre non sauvegardé n'est qu'un point de défaillance de plus, et il est pire que la situation initiale : tout le monde lui fait confiance.

Deux niveaux, complémentaires :

| Niveau | Ce qu'il protège | Fréquence |
| --- | --- | --- |
| Sauvegarde du serveur de fichiers | Perte du serveur, chiffrement, restauration à une date | Selon votre politique, avec une copie hors site |
| Copie de sécurité vers un second emplacement | Suppression accidentelle, besoin de récupérer vite un fichier | Quotidienne, planifiée |

Pour le second niveau, une tâche planifiée suffit :

```powershell title="Copie miroir quotidienne du coffre"
robocopy "D:\Data\Programmes" "E:\Copies\Programmes" /MIR /R:2 /W:5 /NP /LOG+:D:\Logs\coffre.log
```

:::danger
`/MIR` supprime dans la destination ce qui a disparu de la source. C'est voulu pour une copie miroir, mais ça veut dire qu'une suppression accidentelle se propage à la copie dès la nuit suivante. La copie miroir n'est pas votre filet de sécurité : la sauvegarde avec rétention l'est. Ne confondez jamais les deux.
:::

Enfin, mettez une alerte d'espace disque sur le volume. Le disque plein est la panne la plus prévisible de l'atelier, et c'est celle qui a déclenché tout ce chantier chez moi.

## Ce que ce coffre ne fait pas

Soyons honnêtes sur les limites, parce que ce dispositif est une étape, pas une destination.

Il n'apporte **aucune gestion de version** : deux fichiers avec des noms proches restent deux fichiers, et rien n'empêche d'envoyer en machine une version périmée. Il n'apporte **aucune traçabilité métier** : qui a validé quoi, pour quelle affaire, sur quelle révision de plan. Il ne remplace pas le lien entre la CAO, la FAO et l'atelier.

Tout cela, c'est le travail d'un PDM ou d'un serveur central côté constructeur. Le coffre sert à tenir jusque-là — et surtout, il sert à **arriver à la discussion budgétaire avec des données propres**. Un projet PDM se vend beaucoup mieux quand on peut montrer l'arborescence existante, les volumes réels et l'historique des incidents évités.

## Pour aller plus loin

- [Licences flottantes de CAO : Sentinel RMS et FlexNet](/docs/architecture/licences-flottantes-cao-sentinel-rms-et-flexnet/), l'autre pièce du puzzle logiciel côté bureau d'études.
- [Réseaux machines industrielles : ne jamais mélanger réseau machine, télémaintenance et LAN bureautique](/docs/architecture/segmenter-les-reseaux-machines-industrielles/), pour placer la passerelle SMB au bon endroit.
- [Un PC de cellule qui démarre en boucle](/docs/microsoft/pc-industriel-en-boucle-de-demarrage-recuperer-les-donnees/), l'incident qui rend ce chantier urgent.

<!-- source : mails « Programme réseau » 2025-05-12, « Coffre presque OK » 2025-10-08 → 2025-10-09, « Cellule FMS » 2025-09-08 -->

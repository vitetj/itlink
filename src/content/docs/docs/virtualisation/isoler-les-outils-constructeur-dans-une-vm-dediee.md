---
title: "Outils constructeur d'automates : pourquoi les isoler dans une VM dédiée"
description: "Un poste d'automaticien finit toujours par accumuler les ateliers logiciels de trois constructeurs qui se marchent dessus. Comment passer d'une réinstallation par mois à une VM par constructeur, sauvegardée."
published: 2026-07-02
category: virtualisation
tags: [automates, yaskawa, omron, hyper-v, licences, poste-de-travail]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 11 Pro, Yaskawa MPE720 v7.A3, Yaskawa MPE720 v7.A5, Hyper-V]
---

Le poste d'un automaticien, c'est une brocante. Il y a l'atelier logiciel du fabricant de robots — chez moi Yaskawa Engineering Tool MPE720 —, celui des automates Omron Sysmac, celui de Rockwell, plus une ou deux consoles héritées d'une machine livrée il y a huit ans. Chacun installe ses pilotes, son service de licence, sa pile de communication, parfois sa propre couche réseau. Chacun considère qu'il est seul sur la machine.

Pendant des mois, j'ai traité ces postes au symptôme. Un outil ne démarre plus : on réinstalle. La licence n'est plus reconnue : on réinstalle. L'outil ne voit plus le contrôleur : on vérifie l'adressage, et on réinstalle quand même. Ça fonctionne, une fois. Puis le ticket revient, parce que le problème n'est pas dans l'outil : il est dans la cohabitation.

En juillet 2026, j'ai arrêté de réinstaller et j'ai mis chaque constructeur dans sa propre VM. Depuis, les tickets sur ce périmètre ont changé de nature : on parle de machines, plus de postes.

## Prérequis

- Un poste avec de la RAM et du SSD. Une VM par constructeur, ce n'est pas gratuit : comptez au moins 16 Go de mémoire sur l'hôte, 32 Go si l'automaticien fait tourner deux ateliers en même temps.
- Le rôle Hyper-V (inclus dans Windows 11 Pro) ou un hyperviseur de poste équivalent.
- Les médias d'installation et les **fichiers de licence** de chaque outil, avec la version exacte. J'y reviens, c'est le vrai piège.
- Le plan d'adressage des machines et des contrôleurs, validé avec le service automatisme.

## Comprendre pourquoi ces outils se gênent

Avant de virtualiser, il faut savoir ce qu'on isole, sinon on déplace le problème.

**Les pilotes et les piles de communication.** Ces ateliers installent des pilotes de cartes de communication, des ponts série virtuels, parfois un service qui capte une interface réseau entière. Omron et Yaskawa posent chacun leur couche sur la même carte, et l'un des deux perd la main sur son contrôleur — sans message d'erreur explicite, juste un « ça ne trouve pas l'automate ».

**Les services de licence.** Beaucoup de ces outils utilisent une activation liée à l'empreinte de la machine. Une mise à jour de pilote, une carte réseau désactivée, un changement de configuration matérielle, et l'activation saute. Sur un poste où trois éditeurs font la même chose, la probabilité qu'un événement casse au moins une licence par mois est élevée.

**Les dossiers de travail.** Un blocage sur ces outils vient très souvent d'un accès fichier refusé : dossier de projet redirigé dans un espace synchronisé vers le cloud, droits NTFS restreints, chemin trop long. L'outil affiche un message générique et on cherche du côté du réseau alors que le problème est dans un dossier.

**Le plan d'adressage.** Un atelier logiciel ne dialogue avec son contrôleur que si le poste est dans le même sous-réseau — et, sur les protocoles industriels anciens, la diffusion de découverte ne traverse aucun routeur. Le poste doit donc être *sur* le réseau machine, ce qui est précisément ce qu'on ne veut pas d'un poste bureautique.

:::note
Ces quatre causes ont un point commun : elles concernent l'état global de la machine. Aucune ne se règle durablement en réinstallant une application, parce que la réinstallation ne restaure que l'application.
:::

## Traiter l'urgence : le triage avant virtualisation

La virtualisation est la cible, pas la réponse à un ticket ouvert un mardi matin. Quand un outil est bloqué, l'ordre qui marche :

1. **Vérifier l'adressage avant tout le reste.** Le poste est-il dans le même plan que le contrôleur, avec le bon masque, sur la bonne carte ?

   ```powershell title="Vérifier la carte face au contrôleur"
   Get-NetIPAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, IPAddress, PrefixLength
   Test-NetConnection -ComputerName 192.0.2.30 -InformationLevel Detailed
   ```

2. **Chercher le refus d'accès fichier.** Localisez le dossier de travail de l'outil et sortez-le de tout espace synchronisé vers le cloud. Un projet d'automatisme n'a rien à faire dans un dossier qui se synchronise en arrière-plan.
3. **Réinstaller, si les deux premiers points sont propres.** Ça débloque souvent, et c'est un aveu : ça débloque parce qu'on remet à plat un état qu'on ne maîtrise pas.
4. **Noter l'incident.** Trois réinstallations sur le même poste en six mois, c'est le dossier qui justifie la VM auprès de la direction. Sans cet historique, votre demande passe pour du confort.

## Monter une VM par constructeur

La règle est simple : **un constructeur, une VM**. Pas une VM « automatisme » où l'on remettrait tout le monde ensemble, ce qui reproduirait le problème dans un nouveau contenant.

### Dimensionner et créer

```powershell title="Création d'une VM d'atelier constructeur sous Hyper-V"
New-VM -Name "ATELIER-YASKAWA" -Generation 2 `
  -MemoryStartupBytes 8GB -NewVHDPath "D:\VM\atelier-yaskawa.vhdx" -NewVHDSizeBytes 120GB

Set-VM -Name "ATELIER-YASKAWA" -StaticMemory -ProcessorCount 4 `
  -AutomaticCheckpointsEnabled $false
```

Désactivez les points de contrôle automatiques : sur une VM qui porte une licence liée au matériel virtuel, un instantané pris et fusionné sans qu'on le sache est une source d'ennuis.

### Raccorder au réseau machine, et à rien d'autre

C'est le point d'architecture qui justifie à lui seul l'opération. La VM est reliée en **pont** à la carte physique connectée au réseau machine, et l'hôte garde sa carte bureautique pour lui. L'atelier logiciel se retrouve donc *dans* le plan d'adressage du contrôleur, sans que le poste bureautique y soit.

```powershell title="Commutateur virtuel dédié, sur la carte face aux machines"
New-VMSwitch -Name "SW-MACHINES" -NetAdapterName "Ethernet 2" -AllowManagementOS $false
Connect-VMNetworkAdapter -VMName "ATELIER-YASKAWA" -SwitchName "SW-MACHINES"
```

`-AllowManagementOS $false` est volontaire : l'hôte ne prend pas d'adresse sur le réseau machine. Seule la VM y est présente.

:::caution
Une VM sur le réseau machine reste une machine Windows exposée à un réseau industriel peu protégé. Elle doit être à jour, sans partage ouvert, et surtout **sans route vers le LAN bureautique**. Une VM d'atelier n'est pas une passerelle entre deux mondes ; si elle le devient, vous avez annulé votre segmentation.
:::

### Installer l'outil et sa licence, version par version

Demandez au constructeur les fichiers de licence en précisant **la version exacte** de l'outil. Leçon apprise en deux temps, à quelques mois d'intervalle : la licence obtenue pour MPE720 v7.A3 ne couvre pas v7.A5. Une révision mineure suffit à changer la donne. Deux versions du même outil, c'est deux demandes de licence — et parfois deux VM, si les deux doivent coexister pour maintenir un parc de machines livrées à des époques différentes.

Notez dans votre inventaire, pour chaque VM : constructeur, nom de l'outil, version exacte, date de la demande de licence, interlocuteur (le service, pas la personne). Cet inventaire vous servira à chaque renouvellement.

## Sauvegarder l'image, parce que la licence est dedans

C'est la conséquence la plus importante du modèle, et celle qu'on découvre trop tard.

Quand l'activation d'un outil est liée à l'empreinte de la machine, elle devient liée à la **VM**. Bonne nouvelle : la VM ne change pas de matériel toute seule, donc l'activation est plus stable que sur un poste physique dont on met à jour les pilotes. Mauvaise nouvelle : si vous perdez la VM, vous perdez l'activation, et vous repartez pour un cycle de demande auprès du constructeur — avec un automaticien à l'arrêt pendant ce temps.

Donc : **sauvegardez le fichier de disque virtuel**, VM éteinte, dès que l'installation et l'activation sont terminées et validées.

```powershell title="Export d'une VM validée vers l'espace de sauvegarde"
Stop-VM -Name "ATELIER-YASKAWA" -Save
Export-VM -Name "ATELIER-YASKAWA" -Path "\\srv-fichiers.example.com\images-vm"
Start-VM -Name "ATELIER-YASKAWA"
```

Refaites cet export après chaque changement significatif : nouvelle version de l'outil, nouvelle licence, ajout d'un projet de référence. Et vérifiez une fois, une seule mais vraiment, que l'export se réimporte et que l'outil démarre encore avec sa licence. Une sauvegarde jamais restaurée est une hypothèse.

:::tip
Rangez ces images à côté de votre inventaire de licences, pas dans un coin du poste de l'automaticien. Le jour où son portable tombe en panne, vous voulez pouvoir remonter son environnement sur une machine de prêt en une heure, pas en trois semaines de courriers avec trois constructeurs.
:::

## Pour aller plus loin

- [Réseaux machines industrielles : ne jamais mélanger réseau machine, télémaintenance et LAN bureautique](/docs/architecture/segmenter-les-reseaux-machines-industrielles/), pour l'architecture réseau dans laquelle ces VM viennent se brancher.
- [Réactiver VBScript sur Windows 11 25H2 pour un installateur industriel](/docs/microsoft/reactiver-vbscript-windows-11-25h2/), l'autre raison de garder un environnement figé pour l'automatisme.
- [Le coffre à programmes de commande numérique](/docs/architecture/coffre-a-programmes-cn-source-unique-en-lecture-seule/), pour la donnée que ces outils produisent.

<!-- source : tickets « Blocage atelier automate » 2026-02 → 2026-07-02, demandes de licences constructeur 2026-02-06 et 2026-06-30 -->

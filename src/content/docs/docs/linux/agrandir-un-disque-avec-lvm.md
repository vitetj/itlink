---
title: "Agrandir un disque sous Linux avec LVM, sans redémarrer"
description: "Une VM dont le /var sature : étendre le disque côté hyperviseur, faire voir le nouvel espace au noyau, repousser la partition, puis pvresize, lvextend et resize2fs ou xfs_growfs. Avec les pièges."
published: 2026-08-18
category: linux
tags: [lvm, disque, partition, virtualisation, xfs, ext4]
level: intermédiaire
status: à jour
featured: true
tested_on: [CentOS 7, Hyper-V, VMware vSphere]
sidebar:
  label: "Agrandir un disque avec LVM"
---

La supervision remonte un `/var` à 94 %. La machine est une VM, son disque est un fichier posé sur une baie, et
il reste des téraoctets de libre sur le datastore. Sur le papier, c'est cinq minutes de travail. Dans les faits,
c'est l'opération qui fait transpirer, parce qu'elle touche à la table de partitions d'un serveur en production.

Bonne nouvelle : LVM a été inventé exactement pour ça. Mauvaise nouvelle : LVM ne s'occupe que de l'étage du
milieu. Au-dessus et en dessous, il faut mettre les mains.

## L'empilement, étage par étage

Un volume logique, c'est un jeu de poupées russes. Chaque étage ignore ce qui se passe sous lui tant qu'on ne le
lui a pas dit explicitement, et c'est pour cette raison que la manipulation compte six commandes au lieu d'une.

| Étage | Ce que c'est | Ce qui l'agrandit |
| --- | --- | --- |
| Disque virtuel | Le VHDX ou le VMDK, vu par le système comme `/dev/sda` | L'hyperviseur |
| Partition | `/dev/sda5`, de type `8e` (Linux LVM) | `growpart`, `fdisk`, `parted` |
| Volume physique (PV) | La carte que LVM pose sur la partition | `pvresize` |
| Groupe de volumes (VG) | La réserve d'espace commune | `pvresize` ou `vgextend` |
| Volume logique (LV) | `/dev/vg-sys/var`, la « partition » vue par l'admin | `lvextend` |
| Système de fichiers | ext4 ou XFS, posé dans le LV | `resize2fs`, `xfs_growfs` |

Autrement dit : on remonte les étages un par un, du plus bas au plus haut, et on vérifie à chaque palier.

## Prérequis

- Un accès root sur la machine.
- Une sauvegarde récente et **restaurable**. Pas un snapshot : une vraie sauvegarde, sur un autre support.
- L'inventaire avant travaux, conservé ailleurs que sur la machine :

```bash
lsblk
df -hT
pvs ; vgs ; lvs
fdisk -l /dev/sda
```

Ce dernier affichage est le plus important : notez les **secteurs de début** de chaque partition. Si la suite
tourne mal, c'est la seule information qui permet de reconstruire la table à l'identique.

:::caution
Côté hyperviseur, supprimez d'abord tous les snapshots de la VM. Un disque porteur de snapshot ne s'étend pas,
et forcer la chose sur une chaîne de fichiers de delta est le meilleur moyen de perdre la machine entière.
:::

## 1. Étendre le disque côté hyperviseur

L'opération est la même partout : on ouvre les paramètres de la VM, on va sur le disque dur, on saisit la
nouvelle taille. Sur un contrôleur SCSI virtuel, la VM peut rester allumée. Sur un vieux disque raccroché à un
contrôleur IDE, l'hyperviseur exigera un arrêt.

Un disque virtuel ne se réduit pas. Et la valeur saisie est la taille totale visée, pas l'espace ajouté :
confusion classique, suivie d'un refus de l'hyperviseur.

## 2. Faire voir le nouvel espace au noyau

Le disque fait désormais 500 Go côté hyperviseur, et le système en voit toujours 300. Rien d'anormal : le noyau
ne relit pas la géométrie d'un disque tout seul. On le lui demande :

```bash title="Rescan du bus SCSI virtuel"
lsblk /dev/sda

# cible connue (contrôleur:canal:cible:LUN)
echo 1 > /sys/class/scsi_device/0:0:0:0/device/rescan

# variante large quand on ne sait pas lequel
for h in /sys/class/scsi_host/host*/scan ; do echo "- - -" > "$h" ; done

lsblk /dev/sda
```

Sur un contrôleur paravirtualisé (virtio), la nouvelle taille est en général prise en compte sans rien faire :
vérifiez simplement avec `lsblk`. Et si, après le rescan, le disque affiche toujours son ancienne taille, ne
cherchez pas une demi-heure : redémarrez, c'est plus rapide.

## 3. Repousser la partition

### La voie courte : growpart

Tant que la partition LVM est la dernière du disque, `growpart` fait tout le travail : il recalcule le secteur
de fin, réécrit l'entrée et demande au noyau de la relire, sans démonter quoi que ce soit.

```bash
# Debian / Ubuntu
apt install cloud-guest-utils
# RHEL / Rocky / Oracle Linux / CentOS
dnf install cloud-utils-growpart

growpart /dev/sda 5
lsblk /dev/sda
```

Notez l'espace entre le disque et le numéro de partition : `growpart /dev/sda 5`, et non `/dev/sda5`.

### La voie longue : fdisk sur un vieux MBR

Le cas pénible, c'est la table MBR héritée : une partition étendue n°2 qui contient une partition logique n°5
de type LVM. `growpart` ne sait pas repousser un conteneur étendu. Il faut supprimer les deux entrées et les
recréer **exactement au même point de départ**, avec une fin plus lointaine.

L'enchaînement dans `fdisk /dev/sda` :

1. `p` : afficher la table et recopier les secteurs de début quelque part.
2. `d`, puis `2` : supprimer la partition étendue.
3. `n`, `e`, numéro `2`, **le même premier secteur qu'avant**, dernier secteur laissé par défaut.
4. `d`, puis `5` : supprimer la logique que `fdisk` a recréée au passage et qui ne correspond plus à rien.
5. `n`, `l` : recréer une partition logique, dernier secteur par défaut.
6. `x` puis `b` : mode expert, replacer le début des données de la n°5 sur son secteur d'origine, puis `r` pour
   revenir en mode normal.
7. `t`, `5`, `8e` : redonner le type Linux LVM, que `fdisk` a remis à `83` en recréant la partition.
8. `p` : comparer ligne à ligne avec ce que vous avez noté à l'étape 1.
9. `w` : écrire.

:::danger
Tant que vous n'avez pas tapé `w`, tout reste en mémoire et `q` annule tout. Après `w`, il n'y a pas de retour
arrière. Un secteur de début décalé d'une seule unité et LVM ne retrouve plus sa signature : le serveur ne
redémarre pas, et vous passez la nuit sur une image de secours. Vérifiez deux fois plutôt qu'une.
:::

`fdisk` se termine presque toujours par un « échec de relecture de la table de partitions : périphérique ou
ressource occupé ». C'est attendu : les partitions sont en cours d'utilisation. Essayez `partprobe /dev/sda` ou
`partx -u /dev/sda` ; si le noyau refuse encore, seul un redémarrage prendra la nouvelle table. C'est la seule
étape de toute la procédure qui coûte une coupure.

:::tip
La vraie façon d'éviter cette chirurgie : ne pas toucher à la table du tout. Ajoutez un **second disque
virtuel** à la VM et donnez-le à LVM.

```bash
pvcreate /dev/sdb
vgextend vg-sys /dev/sdb
```

Le groupe de volumes grossit, aucune partition n'est modifiée, aucun redémarrage n'est nécessaire. C'est moins
élégant sur le papier — deux disques au lieu d'un — mais c'est l'option que je choisis sur une machine de
production en pleine journée.
:::

## 4. Étendre le volume physique, puis le volume logique

LVM, lui, n'est au courant de rien. On le prévient :

```bash
pvresize /dev/sda5
pvs
vgs
```

La colonne `VFree` du `vgs` doit afficher l'espace gagné. S'il reste à zéro, la partition n'a pas réellement
grandi aux yeux du noyau : retour à l'étape 3.

Ensuite, on donne cet espace au volume logique qui sature :

```bash
lvextend -l +100%FREE /dev/vg-sys/var
# ou une quantité précise
lvextend -L +150G /dev/vg-sys/var
```

:::caution
Le `+` n'est pas décoratif. `-l 100%FREE` demande une taille **égale** à l'espace libre, `-l +100%FREE`
**ajoute** l'espace libre à la taille actuelle. Même logique pour `-L 150G` (taille finale) et `-L +150G`
(ajout). Sur un volume déjà gros, l'oubli du `+` produit soit une erreur, soit une réduction — et une
réduction à chaud, c'est une perte de données.
:::

## 5. Étendre le système de fichiers

Dernier étage, et celui qu'on oublie : le volume logique est plus grand, mais le système de fichiers posé
dedans occupe toujours son ancienne surface. `df -h` ne bougera pas tant que vous n'aurez pas fait ceci :

```bash
# ext2 / ext3 / ext4, à chaud, volume monté
resize2fs /dev/vg-sys/var

# XFS, à chaud, en passant le point de montage
xfs_growfs /var
```

Plus simple encore, quand `fsadm` est présent : `lvextend -r` enchaîne les deux opérations.

```bash
lvextend -r -l +100%FREE /dev/vg-sys/var
```

:::note
XFS ne sait pas rétrécir, pas du tout, et ext4 ne le fait que démonté. En clair, l'extension est un aller
simple. Donnez ce qu'il faut plus une marge raisonnable, pas trois fois plus au prétexte que « c'est gratuit » :
l'espace donné à un LV est de l'espace que vous ne rendrez plus au reste du groupe.
:::

## Vérifier, puis redémarrer quand ça vous arrange

```bash
df -hT /var
lsblk
vgs ; lvs
```

Et surtout, planifiez un redémarrage dans la foulée, à une heure que vous choisissez. Une table de partitions
approximative ne se manifeste qu'au démarrage suivant : autant que ce démarrage ait lieu un mardi à 18 h, avec
vous devant l'écran et la sauvegarde sous la main, plutôt qu'un dimanche soir après une coupure électrique.

## Pour aller plus loin

- Quand la VM ne redémarre plus après une intervention :
  [Restaurer une VM cassée par une mise à jour non supportée](/docs/virtualisation/restaurer-une-vm-cassee-par-une-mise-a-jour-non-supportee/).
- Le premier consommateur de disque sur un serveur Linux moderne, et comment le tenir :
  [Démarrer avec Docker sur un serveur](/docs/conteneurs/demarrer-avec-docker-sur-un-serveur/).
- Le deuxième, souvent : [MySQL, les tâches d'administration qui reviennent tout le temps](/docs/linux/mysql-taches-dadministration-courantes/).
- Les pages `man lvextend`, `man pvresize` et `man growpart` détaillent toutes les options citées ici.

<!-- source : procédures internes « Augmenter la taille d'un disque dur sous Linux avec LVM » et « Changement de taille de disque dur sous CentOS 7 », 2026-08-18 -->

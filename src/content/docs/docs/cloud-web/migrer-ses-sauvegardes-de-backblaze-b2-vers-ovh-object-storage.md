---
title: "Migrer ses sauvegardes de Backblaze B2 vers OVH Object Storage, avec archivage froid"
description: "Changer de cible de sauvegarde hors site sans perdre l'historique : stockage S3 chaud pour les sauvegardes actives, Cold Archive pour les archives longue durée, reconfiguration de Cloudron et test de restauration."
published: 2025-08-05
category: cloud-web
tags: [sauvegarde, s3, ovhcloud, rclone, cloudron, backblaze]
level: intermédiaire
status: à jour
featured: true
tested_on: [Cloudron, rclone, OVH Object Storage, OVH Cold Archive]
---

En mai 2025, j'écris une note de cadrage sur l'externalisation des sauvegardes : règle 3-2-1, Veeam pour
les machines virtuelles, bandes LTO7 avec une cartouche WORM mensuelle sortie du site, trente jours de
rétention sur disque, et une copie cloud immuable chez Backblaze B2. Sur le papier, c'est propre.

En juillet 2025, le serveur de sauvegarde sur bandes a brûlé. Pas une métaphore : un incendie, du
matériel détruit, et une partie de la stratégie qui part avec. Ce qui a tenu, c'est exactement ce que la
règle 3-2-1 promet : les copies restées ailleurs. Ce qui a changé ensuite, c'est la cible hors site.
Nous sommes passés de Backblaze B2 à OVH Object Storage, avec du S3 « chaud » pour les sauvegardes
actives et du Cold Archive pour les archives longue durée.

Cette fiche décrit la migration telle qu'elle s'est faite : le raisonnement, la création des buckets, la
reconfiguration côté Cloudron, la recopie de l'historique avec `rclone`, et surtout la vérification de
restauration avant de couper l'ancien fournisseur.

## Ce que la règle 3-2-1 veut vraiment dire

Trois copies des données, sur deux supports différents, dont une hors site. C'est une phrase qu'on
récite en réunion, et dont on ne mesure la valeur que le jour où un local part en fumée.

Le point important n'est pas le chiffre trois, c'est le mot « hors site ». Une copie sur un NAS posé à
côté du serveur, c'est une deuxième copie, pas une copie hors site. Un incendie, un dégât des eaux, un
vol ou un rançongiciel qui chiffre tout ce qui est monté prennent les deux d'un coup.

Deux propriétés valent donc plus que le nombre de copies :

- **La distance.** La copie doit être dans un autre bâtiment, idéalement une autre ville.
- **L'immuabilité.** Une copie qu'un compte compromis peut supprimer n'est pas une sauvegarde, c'est un
  fichier. Verrouillage d'objet côté cloud, cartouche WORM côté bande : même idée, deux technologies.

:::caution
L'immuabilité ne s'implémente pas de la même façon chez tous les fournisseurs de stockage objet. Le
verrouillage d'objet (*object lock*) existe presque partout, mais les modes disponibles, la granularité
et la façon dont l'outil de sauvegarde s'en sert changent d'une plateforme à l'autre. Vérifiez la
compatibilité **avant** de migrer, pas après.
:::

## Choisir entre stockage chaud et archivage froid

La bascule a été l'occasion de séparer deux besoins qu'on mélange souvent.

| Besoin | Classe de stockage | Pourquoi |
|---|---|---|
| Sauvegardes quotidiennes, restaurations fréquentes, rétention de quelques semaines | Object Storage S3 standard | Lecture immédiate, compatible avec les outils qui écrivent en S3 |
| Archives longue durée, obligations de conservation, données qu'on espère ne jamais relire | Cold Archive | Coût de stockage bien plus bas, mais relecture différée |

Le piège du froid, c'est le délai. Sur une classe d'archivage, l'écriture ressemble à du S3 classique,
mais la relecture demande une commande de restauration et se compte **en heures**. C'est parfait pour
une GED qu'on archive, c'est catastrophique pour la sauvegarde du soir qu'il faut restaurer à 9 h.

La répartition retenue : un bucket par usage, en S3 standard, pour les sauvegardes applicatives, les
données du service de transfert de fichiers et la GED active ; un bucket Cold Archive pour l'historique
longue durée. Les ordres de grandeur, à titre d'exemple, allaient de quelques centaines de gigaoctets
pour les sauvegardes applicatives à plusieurs téraoctets pour la GED, et un volume d'archives d'un
ordre supérieur.

## Prérequis

- Un compte chez le nouveau fournisseur avec un utilisateur Object Storage dédié et ses clés S3
  (`access key` / `secret key`).
- `rclone` installé sur une machine qui a de la bande passante et le droit de sortir en HTTPS. Une VM
  Linux fait très bien l'affaire.
- Les clés de l'ancien fournisseur, encore valides.
- **La phrase de passe de chiffrement de vos sauvegardes.** Si votre outil chiffre côté client, cette
  phrase est la seule chose qui rende les archives lisibles. Elle n'est pas dans le cloud, elle est dans
  votre coffre de mots de passe. Vérifiez-le maintenant.

## Créer les buckets et les identifiants S3

Côté OVH, on crée un utilisateur Object Storage, on lui génère des credentials S3, puis on crée les
conteneurs. Un bucket par usage, pas un fourre-tout : les rétentions, les droits et les classes de
stockage se pilotent au niveau du bucket.

```text title="Découpage retenu"
sauvegardes-plateforme   S3 standard   rétention courte, écriture par l'outil de sauvegarde
transfert-fichiers       S3 standard   région proche du site
ged                      S3 standard   volumétrie principale
archives-longue-duree    Cold Archive  écriture ponctuelle, relecture exceptionnelle
```

La région se choisit en fonction de deux critères : la latence (prenez la plus proche du site pour les
usages interactifs, comme le stockage d'un service de transfert de fichiers) et la localisation légale
des données. Pour nous, une région française était un argument de conformité autant que de performance.

L'endpoint S3 suit la forme `https://s3.<region>.io.cloud.ovh.net`. Notez-le : c'est lui qu'attendent
tous les clients « S3 compatible ».

## Reconfigurer les sauvegardes Cloudron

Cloudron sauvegarde ses applications vers un stockage externe, et sait parler à n'importe quel service
S3 compatible. Dans **Backups → Configure**, on choisit le fournisseur « S3 compatible », puis :

- **Endpoint** : `https://s3.<region>.io.cloud.ovh.net`
- **Region** : la région du bucket
- **Bucket** : `sauvegardes-plateforme`
- **Access key / Secret key** : les credentials de l'utilisateur Object Storage
- **Chiffrement** : activé, avec une phrase de passe stockée dans le coffre
- **Planification et rétention** : sauvegarde quotidienne, rétention alignée sur celle du disque

:::tip
Lancez une sauvegarde manuelle juste après avoir enregistré la configuration, sans attendre la
planification. Une erreur de clé, d'endpoint ou de droits se voit en deux minutes ; sinon, vous la
découvrez le lendemain matin, ou pire, le jour de la restauration.
:::

## Recopier l'historique avec rclone

Changer de destination ne déplace pas ce qui est déjà chez l'ancien fournisseur. Pour ne pas perdre
l'historique, on recopie de bucket à bucket avec `rclone`, qui parle B2 et S3 nativement.

```bash title="Configurer les deux remotes"
rclone config
# remote « b2 »  : type b2, account id + application key
# remote « ovh » : type s3, provider Other, access key, secret key,
#                  endpoint s3.<region>.io.cloud.ovh.net, acl private
```

Avant de lancer quoi que ce soit, on regarde ce qu'on va déplacer :

```bash
rclone size b2:sauvegardes-plateforme
rclone sync b2:sauvegardes-plateforme ovh:sauvegardes-plateforme --dry-run -v
```

Puis la copie réelle :

```bash title="Copie de l'historique"
rclone sync b2:sauvegardes-plateforme ovh:sauvegardes-plateforme -P --transfers 8 --checkers 16 --log-file /var/log/rclone-migration.log
```

Quelques points appris en route :

- `sync` aligne la destination sur la source, **y compris en supprimant**. Tant que vous n'êtes pas
  certain du sens de la commande, utilisez `copy`, qui n'efface rien.
- `--transfers` monte le débit jusqu'à ce que la ligne sature. Huit transferts parallèles est un bon
  point de départ ; au-delà, surveillez l'impact sur le reste du trafic et lancez la copie la nuit.
- Plusieurs téraoctets ne se transfèrent pas pendant une pause déjeuner. Lancez la commande dans un
  `screen` ou un `tmux`, ou en service systemd, et prévoyez plusieurs jours pour la GED.
- Vérifiez les conditions de sortie de votre fournisseur actuel avant de tirer plusieurs téraoctets :
  les règles de facturation du trafic sortant ne sont pas les mêmes partout.

Pour l'archivage longue durée, même outil, destination différente : le bucket Cold Archive. Là encore,
on écrit une fois, et on n'espère pas relire souvent.

## Vérifier une restauration avant de couper l'ancien fournisseur

C'est l'étape que tout le monde saute, et la seule qui prouve quelque chose. Une sauvegarde qui n'a
jamais été restaurée est une hypothèse.

Le test s'est fait sur l'instance de développement, isolée de la production :

1. Restaurer une application complète depuis le nouveau bucket, pas seulement lister les fichiers.
2. Ouvrir l'application restaurée, se connecter, vérifier que les données sont là et à la bonne date.
3. Restaurer un objet depuis le bucket Cold Archive, chronomètre en main, pour mesurer le délai réel de
   mise à disposition. C'est ce délai qu'il faudra annoncer à la direction le jour où on en aura besoin.
4. Seulement ensuite, arrêter les sauvegardes vers l'ancien fournisseur, garder son contenu quelques
   semaines en filet, puis fermer le compte.

:::danger
Ne supprimez rien chez l'ancien fournisseur tant qu'une restauration complète n'a pas réussi depuis le
nouveau. Le coût de quelques semaines de double stockage est dérisoire comparé à celui d'une migration
qu'on découvre incomplète le jour d'un sinistre.
:::

## Pour aller plus loin

- Le rappel qui vaut pour toute cette histoire : [RAID 5 n'est pas une sauvegarde](/blog/raid5-nest-pas-une-sauvegarde/).
- L'autre gros consommateur du même stockage objet :
  [Remplacer WeTransfer par un service de transfert de fichiers auto-hébergé](/docs/self-hosting/remplacer-wetransfer-par-un-service-de-transfert-auto-heberge/).
- Quand la plateforme sauvegardée fait la tête :
  [Lire les logs « box » de Cloudron](/docs/self-hosting/lire-les-logs-box-de-cloudron/).
- La documentation `rclone` des backends [B2](https://rclone.org/b2/) et [S3](https://rclone.org/s3/).

<!-- source : mail « Externalisation des sauvegardes », 2025-05-19 ; mail « Sauvegarde cloud / cold archive », 2025-07-26 -->

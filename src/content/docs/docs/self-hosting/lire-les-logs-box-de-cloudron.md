---
title: "Lire les logs « box » de Cloudron : les messages inquiétants qui ne le sont pas"
description: "Décoder le journal de la plateforme Cloudron : à quoi sert FileSystemUsageTask, pourquoi un du.sh se termine « errored with code 143 », et comment distinguer un message bénin d'une vraie panne."
published: 2026-09-05
category: self-hosting
tags: [cloudron, self-hosting, logs, diagnostic, linux]
level: débutant
status: à jour
featured: false
tested_on: [Cloudron, Ubuntu Server LTS]
sidebar:
  label: "Lire les logs « box » de Cloudron"
---

Un samedi matin, mon tableau de bord Cloudron met dix secondes à s'afficher et me sort une erreur d'API, puis
se remet à fonctionner comme si de rien n'était. Quatorze applications tournent là-dessus : le dépôt Git, le
coffre de mots de passe, le helpdesk, l'ERP, deux portails maison. Le réflexe, c'est d'ouvrir le journal de la
plateforme. Et le journal m'accueille avec une belle ligne rouge : un script `du.sh` qui se termine
« errored with code 143 … Terminated ».

Un script tué, un code d'erreur, sur la machine qui héberge tout : de quoi passer un mauvais week-end. Sauf
que ce message ne signale aucune panne. Il signale que Cloudron a renoncé à mesurer la taille d'un dossier.
Cette fiche explique comment lire ce journal, comment reconnaître les messages qui font peur pour rien, et
surtout comment ne pas rater les rares qui comptent vraiment.

## Prérequis

- Un accès administrateur au tableau de bord Cloudron, ou un accès SSH au serveur qui l'héberge.
- Savoir lire une sortie de `df` et de `journalctl`. Rien de plus.

## Deux journaux qui n'ont rien à voir

La première erreur de débutant, c'est de chercher le bon message au mauvais endroit. Cloudron tient deux
familles de journaux, et elles ne racontent pas la même histoire.

| Journal | Contenu | Où le lire |
| --- | --- | --- |
| Le journal de la plateforme, dit « box » | tout ce que fait Cloudron lui-même : sauvegardes, certificats, mises à jour, tâches périodiques, API du tableau de bord | interface **System → Logs**, ou `/home/yellowtent/platformdata/logs/box.log` |
| Le journal d'une application | ce que crache le conteneur de l'app : votre GitLab, votre Nextcloud | onglet **Logs** de l'application, ou `cloudron-support` / `docker logs` sur l'hôte |

Une application qui plante se diagnostique dans son propre journal. Un tableau de bord qui rame, une
sauvegarde qui échoue, un certificat qui ne se renouvelle pas : c'est le journal de la plateforme.

```bash title="Suivre le journal de la plateforme en direct"
sudo tail -f /home/yellowtent/platformdata/logs/box.log
# ou, pour ne garder que ce qui ressemble à une erreur
sudo grep -iE "error|failed|terminated" /home/yellowtent/platformdata/logs/box.log | tail -50
```

Le même journal est consultable via l'API de la plateforme, ce qui est pratique quand on n'a pas de SSH sous
la main :

```bash title="Lire le journal via l'API (jeton d'administration requis)"
curl -s -H "Authorization: Bearer $CLOUDRON_TOKEN" \
  https://my.example.com/api/v1/system/logs/box
```

:::danger
Quand vous ouvrez les journaux depuis le navigateur, le jeton d'administration se retrouve dans l'URL de la
requête. Ne collez jamais cette URL dans un ticket, un chat d'équipe ou une capture d'écran : vous donneriez
les clés de toute la plateforme. Copiez le texte du message d'erreur, pas la barre d'adresse.
:::

## Décoder le fameux « code 143 »

La ligne qui m'a fait peur ressemble à ça :

```text title="Extrait du journal de la plateforme"
FileSystemUsageTask: du.sh /home/yellowtent/appsdata/<id-de-l-app>/data errored with code 143 ... Terminated
```

Trois informations à en tirer.

**`FileSystemUsageTask`**, d'abord : c'est la tâche périodique qui calcule la place occupée par chaque
application, pour afficher les jolies barres du tableau de bord et pour vérifier les quotas. Elle lance un
`du` sur le dossier de données de chaque app, l'une après l'autre.

**`du.sh`** ensuite : c'est ce script de mesure, rien d'autre. Il ne modifie rien, il ne sauvegarde rien, il
compte.

**`code 143`** enfin. Sous Linux, un processus tué par un signal renvoie 128 + le numéro du signal. Le signal
15, c'est SIGTERM, la demande polie d'arrêt. 128 + 15 = 143. Autrement dit : personne n'a planté, c'est
Cloudron lui-même qui a coupé son propre script au bout de son délai d'attente, parce que la mesure prenait
trop de temps.

Compter les fichiers d'un GitLab ou d'un Nextcloud bien remplis, c'est comme demander à quelqu'un d'inventorier
une bibliothèque municipale en quatre-vingt-dix secondes chrono. Au bout du temps imparti, on lui dit de
s'arrêter, et il s'arrête. Ça ne veut pas dire que la bibliothèque a brûlé.

:::note
Conséquence pratique : la seule chose que vous perdez, c'est un chiffre d'occupation disque à jour pour
l'application concernée. Les données, elles, ne sont pas touchées. Ce message n'est pas un disque plein, ce
n'est pas une corruption, et ce n'est pas une raison d'ouvrir un ticket au support.
:::

## Vérifier quand même que le disque va bien

« Ce n'est pas grave » se démontre en trois commandes. Faites-les avant de refermer le journal.

```bash title="L'état réel du stockage"
df -h /home/yellowtent
sudo vgs && sudo lvs          # volume LVM de la VM
swapon --show && free -h      # le swap et la mémoire disponible
```

Si `df` annonce 60 % d'occupation, le message était bien cosmétique. S'il annonce 95 %, le `du.sh` n'est pas
votre problème : occupez-vous du disque.

Ensuite, faites vous-même la mesure que Cloudron n'a pas eu le temps de terminer, mais sans délai d'attente et
sans étrangler la machine :

```bash title="Qui occupe la place, en heures creuses"
sudo nice -n 19 ionice -c3 du -sh /home/yellowtent/appsdata/*/data | sort -h | tail -10
```

Le résultat est presque toujours le même : une ou deux applications pèsent autant que toutes les autres
réunies. Un dépôt Git dans lequel on a poussé des binaires, un espace de fichiers partagés, un outil de
transfert. Ce sont elles qui font expirer la mesure.

## Faire taire le message pour de bon

Trois options, de la plus simple à la plus propre.

1. **Ne rien faire.** C'est une option valable si le disque a de la marge. Le tableau de bord affichera un
   chiffre d'occupation périmé pour une application, et c'est tout.
2. **Déplacer les données volumineuses sur un volume dédié.** Cloudron sait monter un volume supplémentaire
   (menu **Volumes**) et y rattacher le stockage d'une application. La mesure porte alors sur un arbre de
   fichiers plus petit, et vous gagnez au passage la possibilité d'agrandir ce volume sans toucher au
   système.
3. **Externaliser les fichiers vers un stockage objet.** Les applications qui le permettent (partage de
   fichiers, transfert, sauvegardes) peuvent écrire dans un bucket S3 plutôt que sur le disque local. Le
   dossier local redevient petit, la mesure repasse sous le délai, et votre volume de sauvegarde arrête de
   grossir tout seul.

:::caution
Un `du` sur plusieurs centaines de gigaoctets, c'est des dizaines de milliers d'appels système sur le disque.
Lancé aux heures de bureau sur une VM partagée avec le reste de la production, il se voit. D'où le
`nice`/`ionice` de la commande ci-dessus, et l'habitude de faire ça le soir.
:::

## L'inverse : le message anodin qui cachait un vrai blocage

Pour ne pas tomber dans l'excès de confiance, l'anecdote symétrique. En mars 2025, je restaure mon coffre de
mots de passe Vaultwarden d'une instance vers une autre. L'application reste bloquée, puis part en timeout.
Rien d'explicite dans le journal, juste une opération qui n'aboutit pas. J'ouvre un ticket au support de
l'éditeur, persuadé d'avoir trouvé un bug.

Le diagnostic est tombé en une réponse : le pare-feu bloquait le port 22 entre les deux hôtes, et la copie
des données ne pouvait tout simplement pas se faire. Une migration entre instances passe par SSH. Ma réponse
au support tient en une phrase que je me répète depuis : « oups, la prochaine fois j'autoriserai le port 22 ».

La leçon n'est pas « lisez mieux les journaux ». Elle est plus bête que ça : **avant de soupçonner le logiciel,
vérifiez ce que vous avez changé sur le réseau**. Un timeout, c'est presque toujours un paquet qui n'arrive
pas quelque part.

## Le tri, en quatre questions

Devant n'importe quelle ligne rouge du journal de la plateforme, je me pose toujours les mêmes questions,
dans cet ordre :

1. **Un utilisateur est-il impacté ?** Si tout le monde travaille, vous avez le temps de réfléchir.
2. **Le message décrit-il une mesure, ou une opération ?** Une mesure ratée (occupation disque, statistique,
   graphique) est cosmétique. Une opération ratée (sauvegarde, certificat, mise à jour) ne l'est jamais.
3. **Se répète-t-il à intervalle régulier ?** Une tâche périodique qui échoue toujours au même moment est un
   symptôme structurel : quelque chose a grossi.
4. **Qu'est-ce que j'ai changé dans les dernières quarante-huit heures ?** Une règle de pare-feu, une
   migration, une mise à jour. C'est là que se cache la vraie cause dans neuf cas sur dix.

Les messages à traiter en priorité, dans ce journal, sont ceux qui parlent de sauvegarde, de renouvellement
de certificat et de mise à jour d'application. Le reste, la plupart du temps, c'est la plateforme qui vous
raconte sa vie.

## Pour aller plus loin

- Un vrai incident sur la même plateforme, celui-là, avec un conteneur tué par le noyau :
  [GitLab en conteneur : mémoire et OOM](/docs/conteneurs/gitlab-en-conteneur-memoire-et-oom/).
- Le coffre de mots de passe dont il est question plus haut, et son second facteur :
  [MFA obligatoire avec TOTP dans Vaultwarden](/docs/cybersecurite/mfa-obligatoire-avec-totp-dans-vaultwarden/).
- Comment j'empaquette mes propres applications pour cette plateforme :
  [GLPI 11 packagé pour Cloudron](/lab/glpi-sur-cloudron/).

<!-- source : mail « bug api ? », 2026-09-05 ; thread support « Vaultwarden timeout », 2025-03-17 -->

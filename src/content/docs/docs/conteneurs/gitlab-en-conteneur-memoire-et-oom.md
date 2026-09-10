---
title: "GitLab auto-hébergé en conteneur : diagnostiquer et corriger un manque de mémoire (OOM)"
description: "Un GitLab interne sous Docker qui tombe en « out of memory » : reconnaître l'OOM kill, redémarrer proprement, passer la limite de 4 à 8 Go sur Cloudron, et dégraisser Puma et Sidekiq quand la RAM manque."
published: 2025-02-25
category: conteneurs
tags: [gitlab, docker, cloudron, memoire, oom, self-hosting]
level: intermédiaire
status: à jour
featured: false
tested_on: [GitLab, Docker, Cloudron]
sidebar:
  label: "GitLab auto-hébergé en conteneur"
---

Mon GitLab interne ne fait pas de bruit. Il héberge les scripts qui font tourner la boutique : la
synchronisation par `robocopy` d'un outil métier, les paquets WAPT, les petits scripts PowerShell que je ne veux
plus perdre sur un bureau. Il tourne dans un conteneur Docker, géré par ma plateforme Cloudron, à côté du coffre
de mots de passe et de quelques autres services. Un matin de février, plus rien : le dépôt ne répond pas, et le
tableau de bord de la plateforme annonce que l'application est tombée « out of memory ».

La correction a pris cinq minutes : redémarrer l'application, puis relever sa limite mémoire de 4 à 8 Go. Ce
qui mérite une fiche, ce n'est pas la manipulation, c'est de comprendre pourquoi ça arrive, comment le
reconnaître à coup sûr, et quoi faire quand on n'a pas 8 Go à donner.

## Pourquoi GitLab manque d'air dans un conteneur

L'image GitLab n'est pas « une application » : c'est une petite infrastructure empaquetée. Dans le même
conteneur cohabitent le serveur web Rails (Puma), les tâches de fond (Sidekiq), le service Git (Gitaly), une
base PostgreSQL, un Redis, un Nginx et des exporteurs de supervision. Chacun réserve sa mémoire au démarrage,
avant même que quelqu'un ait poussé un commit. La documentation officielle annonce 4 Go de RAM comme minimum
requis. Une limite de 4 Go, c'est donc le plancher : au premier pic (un pipeline CI, une sauvegarde, une
réindexation), quelqu'un déborde.

Et dans un conteneur, déborder ne pardonne pas. La limite mémoire est un cgroup ; quand la somme des processus
la dépasse, le noyau Linux choisit une victime et la tue. C'est l'*OOM killer*. Imaginez une cuisine de
restaurant avec un seul plan de travail : à l'heure du coup de feu, ce n'est pas la cuisine qui s'agrandit,
c'est une assiette qui tombe.

## Reconnaître un OOM et pas autre chose

Un GitLab qui ne répond plus peut aussi être un disque plein, un PostgreSQL qui n'a pas redémarré ou un
certificat expiré sur le reverse proxy. Avant de toucher à la mémoire, vérifiez que c'est bien elle.

Sur Cloudron, l'application passe en erreur dans le tableau de bord et les graphiques de l'application
montrent une courbe de mémoire collée au plafond juste avant la chute. Sur un hôte Docker classique, les
mêmes réponses se trouvent en ligne de commande :

```bash title="Le conteneur a-t-il été tué par manque de mémoire ?"
docker ps -a --filter "name=gitlab"
docker inspect --format '{{.Name}} OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}' gitlab
docker stats --no-stream gitlab
journalctl -k --since "2 hours ago" | grep -i -E "out of memory|oom-kill|killed process"
```

Deux cas de figure, qui ne se lisent pas au même endroit :

| Ce que vous voyez | Ce qui s'est passé | Où ça se lit |
| --- | --- | --- |
| `OOMKilled=true`, conteneur arrêté | le processus principal du conteneur a été tué | `docker inspect` |
| conteneur toujours « up » mais GitLab renvoie une erreur 502 | un processus interne (souvent un *worker* Puma) a été tué, les autres continuent | `journalctl -k` : ligne `Memory cgroup out of memory: Killed process … (puma)` |

Le second cas est le plus trompeur : tout a l'air de tourner, mais l'application est cassée à l'intérieur.
`docker stats` vous montre alors une consommation qui frôle la limite en permanence, c'est le signe que le
conteneur ne respire pas.

:::note
Cloudron regroupe ces informations dans la page de l'application (journal, graphiques, événements) et vous
notifie l'événement de manque de mémoire. Si vous exploitez GitLab sur un Docker nu, c'est à vous de mettre
cette alerte en place ; la prochaine fois, vous ne voulez pas l'apprendre par un développeur.
:::

## Corriger à chaud : redémarrer, puis relever la limite

Dans l'urgence, le redémarrage rend le service. Sur Cloudron, bouton **Restart** de l'application. Puis, dans
l'onglet **Resources** de la même application, relevez la **limite mémoire** : je suis passé de 4 à 8 Go. La
plateforme redémarre le conteneur avec la nouvelle limite, et c'est fini.

En Docker natif, la même opération se fait sans recréer le conteneur :

```bash title="Relever la limite d'un conteneur existant"
docker update --memory 8g --memory-swap 8g gitlab
docker restart gitlab
```

Ou, pour que ce soit durable, dans le fichier Compose. GitLab recommande au passage un segment de mémoire
partagée plus grand que celui de Docker par défaut, pour PostgreSQL :

```yaml title="docker-compose.yml (extrait)"
services:
  gitlab:
    image: "gitlab/gitlab-ce:<version épinglée>"   # jamais latest
    mem_limit: 8g
    memswap_limit: 8g
    shm_size: "256m"
```

:::caution
Relever une limite ne crée pas de mémoire. Vérifiez avec `free -h` que l'hôte a réellement ces 8 Go à donner,
en comptant les limites de toutes les autres applications qui tournent dessus. Sinon, vous déplacez le problème
d'un conteneur vers l'hôte tout entier, et c'est le noyau qui choisira la victime parmi tous vos services.
:::

## Si la RAM ne suit pas : dégraisser GitLab

Quand l'hôte est juste, GitLab documente une configuration pour environnements à mémoire contrainte. Les
leviers, dans `gitlab.rb`, puis un `gitlab-ctl reconfigure` :

```ruby title="/etc/gitlab/gitlab.rb (extrait)"
# Puma en mode « single » : un seul processus au lieu de plusieurs workers
puma['worker_processes'] = 0
# Moins de tâches de fond en parallèle
sidekiq['concurrency'] = 10
# Pas de supervision Prometheus embarquée si vous supervisez déjà de l'extérieur
prometheus_monitoring['enable'] = false
# Agent Kubernetes inutile pour un usage interne
gitlab_kas['enable'] = false
# Allocateur mémoire plus agressif pour rendre la RAM libérée
gitlab_rails['env'] = { 'MALLOC_CONF' => 'dirty_decay_ms:1000,muzzy_decay_ms:1000' }
```

Le mode *single* de Puma se paie en capacité : une requête à la fois, ce qui suffit largement pour un dépôt
interne avec une poignée de développeurs et des pipelines occasionnels, mais pas pour une équipe de vingt.
Sur une plateforme comme Cloudron, l'emplacement exact de `gitlab.rb` dépend du paquet : vérifiez ce qu'il
expose dans son dossier de données avant de modifier un fichier qui sera écrasé à la prochaine mise à jour.

## Empêcher que ça revienne

- **Une marge, pas un plancher.** Réglez la limite au-dessus de la consommation observée au pire moment (une
  sauvegarde pendant un pipeline), pas à la valeur minimale de la documentation.
- **Une alerte.** Le tableau de bord de la plateforme ou un `docker stats` dans un script de supervision : ce
  qu'il faut, c'est apprendre que le conteneur frôle sa limite **avant** qu'il tombe.
- **Des mises à jour.** Chaque version de GitLab modifie sa consommation ; un paquet à jour évite d'accumuler des
  fuites corrigées depuis longtemps.
- **Un regard sur ce que vous y mettez.** Un dépôt qui reçoit des binaires ou des exports volumineux fait
  grossir Gitaly et les sauvegardes. Le GitLab d'une PME n'a pas besoin d'héberger des ISO.

:::tip
En relisant la page de configuration de l'application ce jour-là, j'ai découvert que la plateforme permet
désormais d'attacher un périphérique physique à une application, une clé de licence USB par exemple. Ça ne
règle pas un OOM, mais pour un serveur de licences d'un logiciel métier qui exige sa clé, c'est une porte qui
s'ouvre.
:::

## Pour aller plus loin

- Ce que ce GitLab héberge, et pourquoi ça vaut le coup de l'avoir en interne :
  [GitLab CI : synchroniser un partage SMB vers un dépôt Git](/docs/automatisation/gitlab-ci-synchroniser-un-partage-smb-vers-un-depot-git/).
- La même plateforme Cloudron vue sous l'angle du packaging :
  [GLPI 11 packagé pour Cloudron](/lab/glpi-sur-cloudron/).
- La référence officielle des réglages pour environnements contraints :
  [Running GitLab in a memory-constrained environment](https://docs.gitlab.com/omnibus/settings/memory_constrained_envs/).

<!-- source : mail « Augmentation capacité docker », 2025-02-25 -->

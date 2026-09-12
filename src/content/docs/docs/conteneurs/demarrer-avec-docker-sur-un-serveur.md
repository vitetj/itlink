---
title: "Démarrer avec Docker sur un serveur : installation, Compose et bonnes habitudes"
description: "Installer Docker proprement sur un serveur Linux, comprendre images, conteneurs et volumes, passer des longues lignes docker run à un fichier Compose, et prendre les habitudes qui évitent les ennuis."
published: 2026-08-28
category: conteneurs
tags: [docker, compose, linux, auto-hebergement, exploitation]
level: débutant
status: à jour
tested_on: [Ubuntu Server, Docker CE]
sidebar:
  label: "Démarrer avec Docker sur un serveur"
---

Un serveur Docker s'installe en dix minutes. C'est ensuite que tout se joue. Le mien a commencé avec un
conteneur, puis deux, puis une quinzaine d'applications internes, et pendant longtemps la documentation de
l'ensemble tenait dans un wiki : une quinzaine de lignes `docker run` de quatre cents caractères chacune,
recopiées à la main quand il fallait redémarrer quelque chose. Ça marchait. Ça ne se transmettait pas, et ça ne
se relisait pas.

Cette fiche est ce que j'aurais aimé lire avant de commencer : le strict nécessaire pour poser Docker sur un
serveur, et surtout les quelques habitudes qui font la différence entre une plateforme qu'on exploite et un
tas de conteneurs qu'on n'ose plus toucher.

## Trois notions, pas une de plus

- Une **image** est un modèle figé, identifié par un nom et une étiquette : `postgres:16`, `nginx:1.27`. On la
  télécharge, on ne la modifie pas.
- Un **conteneur** est une instance en cours d'exécution de cette image. Il est jetable : c'est même tout
  l'intérêt.
- Un **volume**, ou un dossier du serveur monté dans le conteneur, contient ce qui doit survivre. Tout ce qui
  est écrit ailleurs disparaît avec le conteneur.

Retenez la conséquence, parce que tout en découle : **ce qui n'est pas dans un volume n'existe pas**. Un
conteneur supprimé, une image mise à jour, et les données écrites « dans le conteneur » sont perdues sans
message d'erreur.

Ce que Docker ne change pas, en revanche : il ne sauvegarde rien à votre place, ne met rien à jour tout seul et
n'améliore pas la sécurité d'une application qui ne l'était pas.

## Installer Docker

Le paquet fourni par la distribution est souvent ancien. Passez par le dépôt de l'éditeur.

```bash title="Debian / Ubuntu"
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker info
```

:::note
Les procédures d'il y a quelques années passaient par `apt-key add` et `add-apt-repository`. `apt-key` est
déprécié : les clés vivent maintenant dans `/etc/apt/keyrings` et sont référencées par `signed-by=`. Si vous
recopiez un tutoriel qui utilise encore l'ancienne syntaxe, méfiance sur le reste de son contenu aussi.
:::

Deux réglages dès l'installation, dans un fichier que peu de gens créent et que tout le monde regrette de ne
pas avoir créé :

```json title="/etc/docker/daemon.json"
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

Sans limite sur les journaux, un conteneur bavard remplit `/var/lib/docker` jusqu'à saturer le disque. C'est la
panne Docker la plus banale, et elle survient toujours un vendredi. Après modification :
`systemctl restart docker`.

## Les commandes du quotidien

| Commande | Ce qu'elle fait |
| --- | --- |
| `docker info` | État du démon, pilote de stockage, espace utilisé |
| `docker pull debian` | Télécharger une image depuis le registre |
| `docker image ls --all` | Lister les images présentes |
| `docker ps` / `docker ps -a` | Conteneurs en marche / tous, y compris arrêtés |
| `docker logs -f <nom>` | Suivre la sortie d'un conteneur |
| `docker exec --user root -it <nom> /bin/bash` | Ouvrir un shell root dans un conteneur |
| `docker stop` / `start` / `rm <nom>` | Arrêter, démarrer, supprimer un conteneur |
| `docker system df` | Ce que Docker occupe sur le disque |

Le `docker exec --user root` mérite un mot : beaucoup d'images tournent sous un utilisateur non privilégié, et
l'option est indispensable pour installer un paquet ou un module manquant à l'intérieur.

:::caution
Tout ce que vous installez à la main dans un conteneur disparaît à la première mise à jour de l'image. J'ai
appris ça en ajoutant des modules PHP dans un conteneur de GED, puis en refaisant la même manipulation à chaque
montée de version, sans jamais l'avoir écrite nulle part. Si une image a besoin d'un ajout permanent, il faut
un `Dockerfile` de trois lignes qui part de l'image officielle — pas un shell et de la mémoire.
:::

## Passer de docker run à Compose

Un conteneur lancé à la main, c'est une configuration qui n'existe que dans l'historique du shell. Compose la
met dans un fichier qu'on relit, qu'on commente et qu'on versionne.

```yaml title="/srv/docker/uptime-kuma/compose.yaml"
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
```

```bash
cd /srv/docker/uptime-kuma
docker compose up -d
docker compose ps
docker compose logs -f
docker compose pull && docker compose up -d   # mise à jour
docker compose down                           # arrêt et suppression des conteneurs
```

La traduction est mécanique : `-d` devient implicite, `--name` devient `container_name`, `--restart` devient
`restart`, chaque `-v` une entrée de `volumes`, chaque `-p` une entrée de `ports`, chaque `-e` une ligne du
fichier d'environnement.

## Les six habitudes qui changent tout

**Un dossier par service.** `/srv/docker/<service>/` contient le `compose.yaml`, le `.env` et les données. Une
sauvegarde de ce dossier, c'est le service entier.

**Jamais de secret sur la ligne de commande.** Un mot de passe passé en `-e` reste visible dans l'historique du
shell, dans `docker inspect` et dans la liste des processus. Mettez-le dans un `.env` en `chmod 600`, exclu du
dépôt Git.

**Épinglez les versions.** `:latest` signifie « une version différente au prochain `pull`, choisie par
quelqu'un d'autre, sans prévenir ». Préférez `:16` ou `:1.27`, et décidez vous-même du moment de la montée.

**Ne publiez pas les ports sur toutes les interfaces.** `-p 3001:3001` écoute sur l'extérieur ;
`-p 127.0.0.1:3001:3001` n'écoute que localement et laisse le reverse proxy faire son travail. Docker écrit ses
propres règles dans le pare-feu, et un port publié l'est réellement, même si `ufw` affirme le contraire.

**Sauvegardez les volumes, pas les conteneurs.** Un conteneur se recrée en une commande. Les données, non.

**Surveillez le disque.** `docker system df` puis, quand il faut faire de la place :

```bash
docker image prune -a     # images qu'aucun conteneur n'utilise
docker system df
```

:::danger
`docker system prune -a --volumes` supprime aussi les volumes inutilisés. « Inutilisé » veut dire « qu'aucun
conteneur en cours d'exécution ne référence » : un service arrêté pour maintenance rentre dans cette
définition. Lisez la liste que la commande affiche avant de confirmer.
:::

## Publier les services derrière un reverse proxy

Faire écouter chaque conteneur sur un port différent fonctionne, mais personne ne retient
`https://serveur:3001`. Un reverse proxy en frontal résout l'adressage et les certificats d'un coup : les
conteneurs n'écoutent qu'en local, et le proxy route selon le nom demandé.

La solution la plus répandue est un conteneur proxy qui lit lui-même les métadonnées Docker : on déclare une
variable d'environnement dans chaque service (`VIRTUAL_HOST=appli.example.com` par exemple), et le proxy génère
la configuration correspondante. Traefik et Caddy font la même chose avec des étiquettes.

:::caution
Ces proxys ont besoin d'accéder à la socket Docker, généralement montée en lecture seule. Gardez en tête que
l'accès à cette socket équivaut à un accès root sur l'hôte : ne le donnez qu'à des images que vous avez
choisies, et à personne d'autre.
:::

## Pour aller plus loin

- Un premier service utile à conteneuriser :
  [Surveiller ses services avec Uptime Kuma](/docs/self-hosting/surveiller-ses-services-avec-uptime-kuma/).
- Ce qui arrive quand un conteneur demande plus de mémoire que la machine n'en a :
  [GitLab en conteneur, mémoire et OOM](/docs/conteneurs/gitlab-en-conteneur-memoire-et-oom/).
- Un cas concret de bout en bout :
  [pgAdmin en conteneur devant une base PostgreSQL](/docs/conteneurs/pgadmin-en-conteneur-devant-postgresql/).

<!-- source : procédure interne « Commandes utiles Docker » et relevé des conteneurs de la plateforme d'auto-hébergement, 2026-08-28 -->

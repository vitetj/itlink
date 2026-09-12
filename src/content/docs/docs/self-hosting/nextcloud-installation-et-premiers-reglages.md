---
title: "Nextcloud auto-hébergé : installation et réglages qui évitent les ennuis"
description: "Installer Nextcloud en conteneur sans se piéger : vraie base de données dès le départ, image personnalisée pour les extensions PHP, réglages de proxy, et une montée de version qui ne corrompt rien."
published: 2024-09-17
updated: 2026-02-24
category: self-hosting
tags: [nextcloud, docker, ged, postgresql, reverse-proxy, self-hosting]
level: intermédiaire
status: à jour
featured: false
tested_on: [Nextcloud, Docker, Collabora Online, PostgreSQL]
sidebar:
  label: "Nextcloud : installation et réglages"
---

Nextcloud arrive dans une PME par la petite porte. On cherche d'abord à remplacer une clé USB, puis à partager
un dossier avec un client, et six mois plus tard la moitié des documents de l'entreprise sont dessus. C'est une
bonne nouvelle pour la souveraineté des données, et une mauvaise pour vous si l'installation a été faite à la
va-vite : une base de données de démonstration, des extensions posées à la main dans un conteneur, et une
montée de version qui se passe mal un jeudi matin.

Cette fiche décrit une installation propre en conteneurs, puis les réglages que je regrette de ne pas avoir
faits dès le premier jour. La plupart des ennuis que j'ai eus venaient de raccourcis pris à l'installation, pas
du produit.

## Prérequis

- Un serveur Linux avec Docker et le plugin Compose. Voir
  [démarrer avec Docker sur un serveur](/docs/conteneurs/demarrer-avec-docker-sur-un-serveur/) si besoin.
- Du disque, et la possibilité d'en rajouter : la consommation ne fait que monter.
  [Agrandir un disque avec LVM](/docs/linux/agrandir-un-disque-avec-lvm/) sera votre ami.
- Un nom DNS et un reverse proxy qui termine le TLS.

## Décider deux choses avant de lancer la moindre commande

**La base de données.** Sans configuration explicite, Nextcloud s'installe sur SQLite. Ça démarre plus vite, et
ça vous coûtera cher : au-delà de quelques utilisateurs et de quelques dizaines de milliers de fichiers, les
verrous en écriture transforment la moindre synchronisation en attente. Choisissez PostgreSQL ou MariaDB dès la
première minute. Une conversion existe (`occ db:convert-type`), mais c'est une opération à froid, sur un service
arrêté, qu'on préfère éviter en production.

**L'emplacement des données.** Le dossier `data` doit être sur un volume que vous savez sauvegarder et agrandir.
Il contient les fichiers des utilisateurs ; tout le reste est reconstructible, lui non.

## Écrire la composition

```yaml title="/srv/nextcloud/docker-compose.yml"
services:
  db:
    image: postgres:16
    restart: always
    volumes:
      - ./db:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: nextcloud
      POSTGRES_USER: nextcloud
      POSTGRES_PASSWORD: un-mot-de-passe-long-et-aleatoire

  redis:
    image: redis:alpine
    restart: always

  app:
    image: nextcloud:stable
    restart: always
    depends_on: [db, redis]
    ports:
      - 127.0.0.1:8080:80
    volumes:
      - ./html:/var/www/html
      - ./apps:/var/www/html/custom_apps
      - ./config:/var/www/html/config
      - ./data:/var/www/html/data
    environment:
      POSTGRES_HOST: db
      POSTGRES_DB: nextcloud
      POSTGRES_USER: nextcloud
      POSTGRES_PASSWORD: un-mot-de-passe-long-et-aleatoire
      REDIS_HOST: redis
      NEXTCLOUD_TRUSTED_DOMAINS: cloud.example.com
      OVERWRITEPROTOCOL: https
```

Les quatre volumes ne sont pas décoratifs. `html` contient le cœur de l'application, `custom_apps` les
applications ajoutées, `config` la configuration, `data` les fichiers. Si l'un d'eux manque, sa disparition ne
se verra qu'au moment où vous recréerez le conteneur — c'est-à-dire à la première mise à jour.

Redis n'est pas obligatoire, mais il prend en charge le verrouillage transactionnel des fichiers. Sans lui,
deux clients qui synchronisent le même dossier finissent par se marcher dessus et l'interface affiche des
fichiers « verrouillés » qu'il faut débloquer à la main.

## Le piège des extensions PHP

Nextcloud vérifie son environnement au démarrage et affiche une liste de recommandations dans l'administration :
un module manquant pour l'aperçu des images, un autre pour lire un partage SMB, un autre pour la vérification de
l'intégrité. La tentation est forte d'entrer dans le conteneur et d'installer ce qui manque.

```bash title="Ce qu'il ne faut PAS faire durablement"
docker compose exec app bash
apt install libsmbclient-dev && pecl install smbclient && docker-php-ext-enable smbclient
```

Ça marche. Jusqu'à la prochaine mise à jour, où l'on supprime le conteneur pour le recréer depuis une image
neuve, et où tout est à refaire. Ma procédure interne comportait d'ailleurs, en toutes lettres, la consigne
« réinstaller les dépendances dans le conteneur » après chaque montée de version. C'est le signe que la méthode
est mauvaise.

La bonne réponse tient en un fichier : construisez votre propre image à partir de l'officielle.

```docker title="/srv/nextcloud/Dockerfile"
FROM nextcloud:stable

RUN apt-get update && apt-get install -y --no-install-recommends \
        libc-client-dev libkrb5-dev libgmp3-dev smbclient libsmbclient-dev \
        ffmpeg libmagickcore-6.q16-3-extra \
    && docker-php-ext-configure imap --with-kerberos --with-imap-ssl \
    && docker-php-ext-install imap gmp bz2 \
    && pecl install smbclient && docker-php-ext-enable smbclient \
    && rm -rf /var/lib/apt/lists/*
```

Remplacez alors `image: nextcloud:stable` par `build: .` dans la composition. Vos extensions font partie de
l'image, elles survivent aux recréations, et la procédure de mise à jour redevient une procédure et non un
rituel.

## Publier le service et brancher l'édition en ligne

Nextcloud écoute en HTTP sur la boucle locale ; le reverse proxy s'occupe du reste. Deux réglages sont
indispensables derrière un proxy : la liste des domaines de confiance (`trusted_domains`), sans laquelle
l'application refuse la connexion, et `overwriteprotocol` à `https`, sans lequel elle génère des liens en HTTP
et les clients bureau tournent en boucle de redirection.

Pour l'édition collaborative de documents, un second conteneur héberge la suite bureautique en ligne. Il faut
lui déclarer le domaine de l'instance Nextcloud autorisée à s'y connecter, le publier sur son propre nom DNS
avec son propre certificat, et le déclarer dans l'application côté Nextcloud. Comptez de la mémoire : chaque
document ouvert est un processus.

:::caution
Les identifiants d'administration de la suite bureautique se passent par variables d'environnement. Ne laissez
pas `admin`/`admin` comme dans tous les exemples d'Internet — y compris, à ma grande honte, dans une de mes
vieilles procédures internes. Cette interface donne accès aux journaux et à la configuration du service.
:::

## Les commandes du quotidien

Tout l'outillage passe par `occ`, exécuté en tant qu'utilisateur du serveur web :

```bash title="occ dans un conteneur"
docker compose exec --user www-data app php occ status
docker compose exec --user www-data app php occ files:scan --all
docker compose exec --user www-data app php occ db:add-missing-indices
docker compose exec --user www-data app php occ maintenance:mode --on
```

`files:scan` est celle qui sauve le plus souvent la mise : elle réconcilie la base avec ce qui existe réellement
sur le disque, après une copie faite en dehors de Nextcloud.

Pensez aussi aux tâches de fond. Par défaut, elles se déclenchent quand un utilisateur ouvre une page, ce qui
revient à dire qu'elles ne se déclenchent pas la nuit, quand justement il faudrait purger et indexer. Basculez
le mode d'exécution sur `cron` et planifiez l'appel toutes les cinq minutes depuis l'hôte.

## Mettre à jour sans rien casser

L'ordre compte, et il n'est pas intuitif :

1. Sauvegarder la base **et** le dossier `config`. C'est la seule étape non négociable.
2. Mettre à jour les applications tierces **avant** le cœur, depuis l'interface d'administration.
3. Récupérer la nouvelle image, recréer le conteneur, puis lancer la mise à niveau.

```bash title="Montée de version"
docker compose pull app
docker compose up -d app
docker compose exec --user www-data app php occ upgrade
docker compose exec --user www-data app php occ maintenance:mode --off
```

:::danger
On ne saute jamais une version majeure. Le passage se fait de proche en proche, version après version, parce que
chaque montée exécute ses propres migrations de schéma. Sauter un cran, c'est prendre le risque d'une base dans
un état que le code ne sait plus lire — autrement dit, des données corrompues.
:::

## Deux symptômes vécus, et leur cause

**La base de données refuse de démarrer après une manipulation de certificats.** Sur une installation où
PostgreSQL sert le TLS, le service ne démarre plus si la clé privée n'est pas lisible par son compte système.
La correction consiste à rendre la clé lisible par le groupe qui la porte, et à ajouter le compte de la base à
ce groupe :

```bash title="Droits sur la clé privée du serveur de base de données"
sudo gpasswd -a postgres ssl-cert
sudo chown root:ssl-cert /etc/ssl/private/ma-cle.key
sudo chmod 740 /etc/ssl/private/ma-cle.key
sudo systemctl restart postgresql
```

Le réflexe du `chmod 777` réglerait aussi le symptôme. Il exposerait la clé privée à tous les comptes de la
machine, ce qui n'est pas un compromis acceptable.

**Les clients bureau se reconnectent en boucle.** Neuf fois sur dix, c'est le protocole de réécriture des URL
mal réglé derrière le proxy, ou un domaine absent de `trusted_domains`. Regardez les journaux de l'application
avant d'accuser le poste de l'utilisateur.

## Pour aller plus loin

- Le socle de l'installation : [démarrer avec Docker sur un serveur](/docs/conteneurs/demarrer-avec-docker-sur-un-serveur/).
- Pour les envois ponctuels vers l'extérieur, un outil dédié vaut mieux qu'un partage Nextcloud public :
  [remplacer WeTransfer par un service de transfert auto-hébergé](/docs/self-hosting/remplacer-wetransfer-par-un-service-de-transfert-auto-heberge/).
- Brancher les comptes sur l'annuaire plutôt que de les saisir deux fois :
  [SSO pour une appli maison : LDAP, OIDC ou SAML](/docs/self-hosting/sso-pour-une-appli-maison-ldap-oidc-ou-saml/).

<!-- source : procédures internes « Nextcloud Installation » et « Nextcloud Drafts », export du centre de documentation -->

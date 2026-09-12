---
title: "pgAdmin en conteneur devant une base PostgreSQL"
description: "Publier la console pgAdmin sous forme de conteneur pour administrer une base PostgreSQL : le lancement, le volume qu'il ne faut pas oublier, les droits du dossier, la connexion à la base et les précautions d'exposition."
published: 2026-09-03
category: conteneurs
tags: [pgadmin, postgresql, docker, compose, administration]
level: intermédiaire
status: à jour
tested_on: [Docker CE, pgAdmin 4]
sidebar:
  label: "pgAdmin en conteneur"
---

Une application interne arrive avec une base PostgreSQL. Au bout de deux semaines, il faut regarder une table,
relancer une requête, comprendre pourquoi un champ est vide — et personne n'a envie d'installer un client lourd
sur chaque poste, ni de donner un accès SSH au serveur de base pour trois `SELECT`.

pgAdmin en conteneur règle ça en cinq minutes. Il y a trois choses à ne pas rater, et elles ne sont pas dans la
commande de démarrage.

## Ce qu'on monte, exactement

pgAdmin en conteneur tourne en **mode serveur** : c'est une application web multi-utilisateurs, avec ses
propres comptes, sa liste de serveurs enregistrés et ses préférences. Tout cela vit dans une petite base de
configuration interne, à l'intérieur du conteneur.

C'est la source du malentendu le plus courant : ce n'est pas votre base PostgreSQL. C'est une console qui s'y
connecte. Le conteneur ne contient aucune de vos données métier — mais il contient la liste de vos serveurs, et
éventuellement les mots de passe que vos utilisateurs auront demandé d'enregistrer.

## Prérequis

- Un hôte Docker opérationnel.
- L'adresse, le port et un compte de connexion de l'instance PostgreSQL à administrer.
- Un nom DNS et un reverse proxy si la console doit être atteinte depuis un navigateur autrement que par
  l'adresse de l'hôte.

## Le lancement minimal

```bash
docker run --name pgadmin -d \
  -p 127.0.0.1:5050:80 \
  -e "PGADMIN_DEFAULT_EMAIL=admin@example.com" \
  -e "PGADMIN_DEFAULT_PASSWORD=change-moi" \
  -v /srv/docker/pgadmin/data:/var/lib/pgadmin \
  dpage/pgadmin4
```

Le couple `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` crée le **premier compte administrateur de
pgAdmin**, celui qui ouvre l'interface. Il n'a rien à voir avec un compte PostgreSQL.

:::caution
Un mot de passe passé en `-e` sur la ligne de commande reste lisible dans l'historique du shell, dans la sortie
de `docker inspect` et dans la liste des processus. C'est acceptable trente secondes sur un poste de test, pas
sur un serveur partagé. La version Compose ci-dessous le sort de la commande.
:::

## La version que je garde : Compose

```yaml title="/srv/docker/pgadmin/compose.yaml"
services:
  pgadmin:
    image: dpage/pgadmin4:8
    container_name: pgadmin
    restart: unless-stopped
    ports:
      - "127.0.0.1:5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    volumes:
      - ./data:/var/lib/pgadmin
```

Le fichier `.env` posé à côté, en `chmod 600`, contient les deux valeurs. Il n'est pas versionné.

```bash
cd /srv/docker/pgadmin
docker compose up -d
docker compose logs -f
```

Notez l'étiquette d'image fixée à une version majeure plutôt qu'à `latest` : une console d'administration de
base de données n'est pas ce qu'on souhaite voir changer de version toute seule un lundi matin.

## Le volume et les droits, la partie qu'on rate

`/var/lib/pgadmin` est l'endroit où pgAdmin range sa base de configuration. Sans volume, le premier
redémarrage du conteneur efface les comptes, la liste des serveurs enregistrés et les requêtes sauvegardées.
Tout est à refaire, et cette fois devant les utilisateurs.

Deuxième détail, qui produit une erreur de permissions au démarrage : le processus tourne à l'intérieur du
conteneur sous un compte non privilégié, d'identifiant `5050`. Si vous montez un dossier de l'hôte, il doit lui
appartenir.

```bash
mkdir -p /srv/docker/pgadmin/data
chown -R 5050:5050 /srv/docker/pgadmin/data
```

Si le conteneur redémarre en boucle, c'est presque toujours ça. `docker compose logs` le dit, à condition de
lire les premières lignes et pas les dernières.

## Joindre la base PostgreSQL

Dans l'interface, on enregistre un serveur avec son hôte, son port, sa base et un compte. L'hôte à saisir
dépend de l'endroit où vit PostgreSQL, et c'est là que tout le monde se trompe une fois :

| PostgreSQL tourne… | Hôte à saisir dans pgAdmin |
| --- | --- |
| Dans un autre conteneur du même réseau Compose | Le nom du service, port `5432` |
| Sur l'hôte Docker lui-même | L'adresse de l'hôte sur le réseau, jamais `localhost` |
| Sur un autre serveur | Son adresse ou son nom DNS |

`localhost`, saisi dans pgAdmin, désigne l'intérieur du conteneur pgAdmin. Il n'y a pas de base dedans.

Côté serveur PostgreSQL, deux réglages conditionnent la connexion : `listen_addresses` dans
`postgresql.conf`, qui doit accepter autre chose que la boucle locale, et surtout `pg_hba.conf`, qui décide qui
a le droit de se connecter et depuis où.

```text title="Extrait de pg_hba.conf"
# TYPE  BASE        UTILISATEUR   ADRESSE          MÉTHODE
hostssl toutes      appli_admin   192.0.2.30/32    scram-sha-256
```

L'adresse à autoriser est celle de **l'hôte Docker**, pas celle du poste de l'utilisateur : c'est le conteneur
qui ouvre la connexion, depuis le serveur. Autoriser une plage entière « pour que ça marche » est le raccourci
qui transforme une console pratique en porte ouverte.

## Exposer la console, avec mesure

Le conteneur n'écoute que sur la boucle locale de l'hôte (`127.0.0.1:5050`). C'est volontaire : le reverse
proxy se charge du nom, du certificat et de l'accès.

Donnez-lui son propre nom d'hôte — `pgadmin.example.com` — plutôt que de le publier sous un sous-chemin d'un
site existant : pgAdmin réécrit ses URL et la configuration en sous-chemin demande des en-têtes
supplémentaires pour rien.

:::danger
pgAdmin est une console d'administration complète sur vos bases : requêtes libres, modification de schéma,
suppression de tables. Elle n'a rien à faire exposée sur Internet, même derrière un mot de passe. Réservez
l'accès au réseau interne ou au VPN, créez des comptes nominatifs à l'intérieur de pgAdmin plutôt que de
partager le compte initial, et gardez en tête que les mots de passe « enregistrés » par les utilisateurs vivent
dans le dossier `/var/lib/pgadmin` que vous venez de créer.
:::

## Exploiter au quotidien

```bash
docker compose ps
docker compose logs -f pgadmin
docker compose pull && docker compose up -d   # montée de version
tar czf /srv/backup/pgadmin-$(date +%F).tgz -C /srv/docker/pgadmin data
```

La sauvegarde du dossier `data` suffit à retrouver la console à l'identique : comptes, serveurs enregistrés et
préférences. Elle contient des secrets, donc elle se protège comme telle. Et elle ne remplace évidemment pas la
sauvegarde des bases PostgreSQL elles-mêmes, qui se fait ailleurs et par d'autres moyens.

## Pour aller plus loin

- Les bases de l'hôte qui porte ce conteneur :
  [Démarrer avec Docker sur un serveur](/docs/conteneurs/demarrer-avec-docker-sur-un-serveur/).
- Publier proprement une interface qui ne gère pas le HTTPS elle-même :
  [Mettre un boîtier sans HTTPS derrière un reverse proxy](/docs/self-hosting/mettre-un-boitier-sans-https-derriere-un-reverse-proxy/).
- La page « Container Deployment » de la documentation pgAdmin liste toutes les variables d'environnement
  acceptées par l'image.

<!-- source : procédure interne « pgAdmin en conteneur Docker », 2026-09-03 -->

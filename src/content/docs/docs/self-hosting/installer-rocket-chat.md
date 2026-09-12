---
title: "Installer Rocket.Chat en auto-hébergé : base de données, reverse proxy et mobile"
description: "Monter une messagerie d'équipe Rocket.Chat chez soi : MongoDB en replica set, reverse proxy qui laisse passer les WebSockets, et le certificat sans lequel les téléphones refusent de se connecter."
published: 2025-11-18
category: self-hosting
tags: [rocket-chat, docker, mongodb, nginx, reverse-proxy, self-hosting]
level: avancé
status: à jour
featured: true
tested_on: [Rocket.Chat, MongoDB, Docker, nginx]
sidebar:
  label: "Installer Rocket.Chat en auto-hébergé"
---

Une messagerie d'équipe, dans une PME, n'arrive jamais par un projet. Elle arrive parce que l'atelier s'est mis à
échanger des photos de pièces sur un groupe WhatsApp privé, et que personne à la direction n'a envie de savoir où
ces photos atterrissent. Restent deux options : payer un siège par personne, ou héberger l'outil. Rocket.Chat
relève de la seconde : un serveur Node.js, un MongoDB, et le tout tient sur une petite machine.

L'installation se fait en une soirée. Elle se casse sur trois détails, toujours les mêmes : la base de données
mal configurée, le reverse proxy qui coupe les WebSockets, et le certificat qui fait fuir les téléphones. Voici
une installation complète en conteneurs, avec les pièges dans l'ordre où ils se présentent.

## Prérequis

- Une machine Linux dédiée, 2 vCPU et 2 Go de RAM au minimum. Rocket.Chat *démarre* avec 512 Mo, il ne *tient*
  pas avec 512 Mo : le premier envoi de fichier fait tomber le conteneur.
- Un enregistrement DNS public qui pointe vers la machine, par exemple `chat.example.com`.
- Docker et le plugin Compose installés. Si vous partez de zéro sur ce point, commencez par
  [démarrer avec Docker sur un serveur](/docs/conteneurs/demarrer-avec-docker-sur-un-serveur/).
- Un certificat TLS reconnu publiquement. Ce n'est pas une option, j'y reviens.

## Ce que vous installez réellement

Vous croyez installer une application. Vous en installez trois, et chacune a ses exigences.

| Brique | Rôle | Ce qui la fait tomber |
| --- | --- | --- |
| Rocket.Chat | serveur applicatif Node.js, en HTTP sur le port 3000 | mémoire insuffisante, `ROOT_URL` faux |
| MongoDB | toutes les données : messages, fichiers, comptes, configuration | base hors replica set, version non supportée |
| Reverse proxy | termine le TLS, publie le service sur 443 | en-têtes WebSocket absents |

Retenez cette séparation : devant une panne, la première question est « laquelle des trois ? ».

## Sécuriser la machine avant d'y poser quoi que ce soit

Sur un serveur exposé, on ferme, puis on ouvre ce qui sert.

```bash title="Pare-feu minimal"
sudo apt-get install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # adaptez si votre SSH écoute ailleurs
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

:::danger
Si votre SSH écoute ailleurs que sur 22 et que vous recopiez la règle sans réfléchir, `ufw enable` vous met
dehors de votre propre serveur. Vérifiez la ligne SSH **avant** d'activer le pare-feu, et gardez une seconde
session ouverte le temps du test.
:::

Un `sudo apt-get install fail2ban` par-dessus coûte une commande et arrête la moitié du bruit des robots.

## Préparer MongoDB comme Rocket.Chat l'attend

C'est l'étape que tout le monde bâcle, et c'est celle qui coûte un week-end. Les versions actuelles de
Rocket.Chat ne se contentent pas d'un MongoDB isolé : elles lisent le journal de réplication (`oplog`) pour
propager les messages en temps réel. Il faut donc un **replica set**, même à un seul nœud. Sans `--replSet`, le
serveur démarre, mais les messages n'arrivent qu'après un rafraîchissement de la page. Symptôme déroutant, cause
bête.

Vérifiez au passage la matrice de compatibilité : une base trop récente bloque autant qu'une base trop ancienne.

## Écrire le fichier de composition

Créez des volumes qui survivront aux conteneurs : ce qui n'est pas dans un volume est perdu à la première
recréation.

```bash title="Arborescence"
sudo mkdir -p /srv/rocketchat/data/db
sudo mkdir -p /srv/rocketchat/data/dump
cd /srv/rocketchat
```

```yaml title="/srv/rocketchat/docker-compose.yml"
services:
  mongo:
    image: mongo:7.0
    restart: always
    command: mongod --replSet rs0 --oplogSize 128
    volumes:
      - ./data/db:/data/db
      - ./data/dump:/dump

  rocketchat:
    image: registry.rocket.chat/rocketchat/rocket.chat:latest
    restart: always
    depends_on:
      - mongo
    environment:
      ROOT_URL: https://chat.example.com
      PORT: 3000
      MONGO_URL: mongodb://mongo:27017/rocketchat?replicaSet=rs0
      MONGO_OPLOG_URL: mongodb://mongo:27017/local?replicaSet=rs0
    ports:
      - 127.0.0.1:3000:3000
```

Trois valeurs méritent qu'on s'y arrête.

**`ROOT_URL`** doit être l'URL publique complète, en HTTPS, celle que taperont les utilisateurs : ni adresse IP,
ni `localhost`. C'est elle que le serveur place dans les liens qu'il génère et dans la configuration qu'il
envoie aux clients.

**Le port publié** est volontairement limité à `127.0.0.1`. Sans ce préfixe, Docker ouvre le port 3000 sur toutes
les interfaces et perce votre pare-feu par le bas : ses règles s'insèrent avant celles d'UFW.

**`restart: always`** remplace tout ce que les vieux guides racontent sur les scripts de démarrage maison. La
procédure dont je suis parti créait deux jobs Upstart pour relancer la base puis l'application ; la politique de
redémarrage du conteneur fait ce travail, et le chaînage des dépendances se déclare dans le fichier de composition.

Démarrez, puis initialisez le replica set une seule fois :

```bash title="Premier démarrage"
docker compose up -d
docker compose exec mongo mongosh --eval 'rs.initiate()'
docker compose ps
docker compose logs -f rocketchat
```

:::note
Si votre instance est derrière un proxy et que la création du premier compte refuse l'adresse de courriel,
le paramètre `Accounts_UseDNSDomainCheck` réglé à `false` débloque la situation. Il n'a d'effet que sur un
déploiement neuf.
:::

## Le reverse proxy : WebSocket ou rien

Rocket.Chat est une application temps réel. Sans relais des en-têtes de mise à niveau de connexion, l'interface
s'affiche, les canaux se chargent, et aucun message n'arrive. Les gens vous diront « ça marche, mais il faut
recharger la page ». Voilà la cause.

```nginx title="/etc/nginx/sites-available/chat.conf"
server {
    listen 443 ssl;
    http2 on;
    server_name chat.example.com;

    ssl_certificate     /etc/nginx/ssl/chat.crt;
    ssl_certificate_key /etc/nginx/ssl/chat.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:20m;

    client_max_body_size 100m;
    error_log /var/log/nginx/rocketchat_error.log;

    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_redirect off;
    }
}
```

```bash title="Valider puis appliquer"
sudo chmod 400 /etc/nginx/ssl/chat.key
sudo nginx -t && sudo systemctl reload nginx
```

Deux remarques nées d'erreurs vues sur le terrain.

La procédure d'origine faisait pointer `proxy_pass` vers le nom de domaine public, puis ajoutait une ligne dans
`/etc/hosts` pour que ce nom résolve en `127.0.0.1`. Ça marche, mais le jour où quelqu'un nettoie `/etc/hosts`,
le proxy part chercher son propre service sur Internet. Écrivez `127.0.0.1:3000` et n'y pensez plus.

`client_max_body_size` est l'autre oubli classique : par défaut, nginx refuse les corps de requête au-delà d'un
mégaoctet, alors que vos utilisateurs enverront des plans. Réglez la valeur ici **et** dans les paramètres de
l'application, sinon vous récoltez une erreur 413 incompréhensible côté client.

## Le certificat, et pourquoi le mobile est intransigeant

Un certificat autosigné permet d'ouvrir l'interface web en cliquant sur « je comprends les risques ». Les
applications mobiles officielles, elles, ne proposent pas ce bouton : elles refusent une chaîne qu'elles ne
valident pas, et affichent un message d'erreur générique qui ne dit pas pourquoi. Vous passerez la soirée à
chercher un problème de réseau alors que c'est le certificat.

:::caution
Pour un serveur destiné à être utilisé depuis des téléphones, prenez un certificat reconnu publiquement, gratuit
ou non, et vérifiez que la **chaîne intermédiaire** est bien servie. Un navigateur de bureau complète parfois
une chaîne incomplète tout seul ; un téléphone, non. La méthode de renouvellement et les contrôles associés sont
détaillés dans [renouveler un certificat SSL sur ses services](/docs/cybersecurite/renouveler-un-certificat-ssl-sur-ses-services/).
:::

Deux autres points comptent sur mobile. L'URL saisie dans l'application doit être exactement celle de `ROOT_URL` :
un `www` en trop et l'authentification tourne en rond. Et les notifications push des applications officielles
transitent par la passerelle de l'éditeur, ce qui suppose d'enregistrer votre instance auprès de son service en
ligne. Sans cet enregistrement, tout fonctionne sauf la vibration dans la poche, c'est-à-dire la seule chose qui
fait qu'une messagerie est lue.

## Premier démarrage : le compte administrateur

Le premier compte créé sur une instance neuve devient administrateur. Sur un serveur joignable depuis Internet,
créez-le dans la minute qui suit le premier accès réussi, avant d'aller chercher un café. Ensuite, désactivez
l'inscription libre ou restreignez-la à votre domaine de messagerie, et configurez le SMTP sortant : sans lui,
aucune invitation ni réinitialisation de mot de passe ne partira.

## Quand ça ne marche pas

| Symptôme | Où regarder |
| --- | --- |
| Le site répond en HTTP mais pas en HTTPS | `sudo nginx -t`, puis `/var/log/nginx/error.log` ; vérifiez que 443 est bien ouvert avec `sudo ufw status` |
| Rien ne démarre après un redémarrage | `docker compose ps` puis `docker compose logs` ; une erreur d'indentation dans le YAML suffit à tout bloquer |
| L'interface s'affiche, les messages n'arrivent pas | en-têtes WebSocket absents du proxy, ou replica set MongoDB non initialisé |
| Le serveur tombe lors d'un envoi de fichier | mémoire. Lancez `top` pendant le test et donnez-lui plus de RAM |
| Les téléphones ne se connectent pas | chaîne de certificat incomplète ou `ROOT_URL` qui ne correspond pas |

Le premier démarrage télécharge plusieurs centaines de mégaoctets d'images : si vous ne voyez qu'un conteneur sur
trois, patientez avant de conclure à une panne.

## Pour aller plus loin

- Le socle sous cette installation : [démarrer avec Docker sur un serveur](/docs/conteneurs/demarrer-avec-docker-sur-un-serveur/).
- Le même principe de publication appliqué à un équipement qui gère mal le TLS :
  [mettre un boîtier sans HTTPS derrière un reverse proxy](/docs/self-hosting/mettre-un-boitier-sans-https-derriere-un-reverse-proxy/).
- Une fois le service en production, surveillez-le :
  [surveiller ses services avec Uptime Kuma](/docs/self-hosting/surveiller-ses-services-avec-uptime-kuma/).

<!-- source : procédure interne « Installation Rocket.Chat », export du centre de documentation -->

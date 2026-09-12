---
title: "Installer un serveur web sur Linux : Apache ou Nginx, PHP et un certificat"
description: "Monter proprement un serveur web pour une application interne : choisir entre Apache et Nginx, installer PHP-FPM, écrire un hôte virtuel, poser un certificat, et pourquoi je me méfie des scripts tout-en-un."
published: 2026-08-21
category: linux
tags: [nginx, apache, php, certificat, tls, serveur-web]
level: débutant
status: à jour
tested_on: [Oracle Linux, CentOS 7, Debian, Ubuntu Server]
sidebar:
  label: "Installer un serveur web sur Linux"
---

Dans une PME, le besoin arrive toujours par la bande : quelqu'un veut publier un annuaire interne, un petit
portail vidéo, ou faire tourner une application PHP livrée par un prestataire sous la forme d'un dossier à
déposer « sur un serveur web ». Personne ne demande un serveur web. On demande une adresse qui s'ouvre dans un
navigateur.

Derrière cette adresse, il y a quatre briques : un serveur HTTP, un interpréteur PHP, souvent une base de
données, et un certificat. Voici comment je les pose, et surtout dans quel ordre décider.

## Apache ou Nginx : trancher en deux minutes

C'est le débat qui fait perdre le plus de temps pour le gain le plus faible sur une machine qui servira trente
personnes. Les deux fonctionnent. La vraie question est : que réclame l'application que vous devez héberger ?

| | Apache | Nginx |
| --- | --- | --- |
| Configuration | Un fichier par site, plus les `.htaccess` par dossier | Un fichier par site, pas de `.htaccess` |
| PHP | Module intégré ou PHP-FPM | PHP-FPM obligatoire |
| Réécritures d'URL | Fournies par l'éditeur dans un `.htaccess` | À retranscrire à la main |
| Points forts | Compatibilité, documentation, souplesse par dossier | Fichiers statiques, reverse proxy, faible empreinte |

La règle que j'applique : si l'application livrée contient un `.htaccess`, je prends Apache et je ne discute
pas. Si je monte un reverse proxy devant d'autres services, ou si je sers surtout du statique, je prends
Nginx. Le reste est affaire de goût.

## Prérequis

- Une machine Linux à jour, 2 vCPU et 2 à 4 Go de RAM pour une application interne modeste.
- Un enregistrement DNS qui pointe vers elle. Dans les exemples : `example.com`.
- Les ports 80 et 443 ouverts depuis les postes concernés, et depuis Internet seulement si le service doit
  vraiment y être exposé.
- Un accès root ou `sudo`.

## Installer les paquets de la distribution

C'est la voie par défaut, celle que je recommande pour tout ce qui a vocation à durer.

```bash title="Debian / Ubuntu"
apt update
apt install nginx php-fpm php-mysql
# variante Apache
apt install apache2 libapache2-mod-php php-mysql
systemctl enable --now nginx
systemctl list-units 'php*fpm*'
```

```bash title="Oracle Linux / Rocky / CentOS / RHEL"
dnf install nginx php php-fpm php-mysqlnd
systemctl enable --now nginx php-fpm
```

Le nom de l'unité PHP-FPM change avec la version du paquet (`php8.2-fpm`, `php-fpm`…) : listez-la plutôt que
de la deviner. Ensuite, le pare-feu :

```bash
# familles RHEL
firewall-cmd --permanent --add-service=http --add-service=https
firewall-cmd --reload

# Debian / Ubuntu
ufw allow 'Nginx Full'
```

:::caution
Sur les distributions de la famille RHEL, SELinux est actif par défaut et c'est lui qui bloquera votre premier
essai, avec une page blanche et un « Permission denied » incompréhensible dans les journaux. Deux réflexes :
`setsebool -P httpd_can_network_connect on` si l'application ouvre des connexions sortantes (base distante,
API, SMTP), et `semanage fcontext` si vous placez les fichiers ailleurs que dans le dossier attendu. Désactiver
SELinux « en attendant » est une dette qu'on ne rembourse jamais.
:::

## Écrire un hôte virtuel

Un hôte virtuel, c'est la fiche d'identité d'un site : quel nom, quel dossier, quoi faire des fichiers PHP.

```nginx title="/etc/nginx/conf.d/example.com.conf"
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    access_log /var/log/nginx/example.com.access.log;
    error_log  /var/log/nginx/example.com.error.log;
}
```

Le chemin de la socket PHP-FPM est le piège numéro un : il diffère selon la distribution. Relevez-le dans
`/etc/php-fpm.d/www.conf` ou `/etc/php/*/fpm/pool.d/www.conf` plutôt que de recopier celui d'un tutoriel.

Puis, systématiquement, on teste avant de recharger :

```bash
nginx -t && systemctl reload nginx
# côté Apache
apachectl configtest && systemctl reload apache2
```

Prendre l'habitude du test de configuration évite le grand classique : un point-virgule oublié, un `reload` qui
échoue, et un service web arrêté au lieu d'être rechargé.

## Poser un certificat

Aucun navigateur récent ne laisse passer du HTTP en clair sans le signaler à l'utilisateur, et vous ne voulez
pas apprendre à trente personnes à cliquer sur « continuer malgré le risque ».

Pour un service joignable depuis Internet, Let's Encrypt règle la question, renouvellement compris :

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d example.com
systemctl list-timers | grep certbot
```

Pour un service purement interne, Let's Encrypt ne peut pas valider le domaine : il faut un certificat émis par
votre autorité interne, et surtout que cette autorité soit connue des postes. Les certificats auto-signés que
génèrent les installeurs automatiques conviennent à une maquette, pas à des utilisateurs.

## L'autre voie : le script tout-en-un

Il existe des scripts qui installent d'un coup Nginx ou Apache, PHP, MySQL ou MariaDB, Redis, un serveur FTP et
la sauvegarde qui va avec, en compilant le tout depuis les sources — OneinStack, dans mon cas. J'en ai utilisé
un pour monter rapidement un serveur interne, et l'expérience mérite d'être racontée dans les deux sens.

```bash title="Déroulé typique"
yum -y install wget screen      # ou : apt-get -y install wget screen
wget http://mirrors.example.com/oneinstack-full.tar.gz
tar xzf oneinstack-full.tar.gz
cd oneinstack
screen -S oneinstack
./install.sh
```

Le `screen` n'est pas décoratif : la compilation dure longtemps, et une coupure SSH tuerait l'installation en
cours. Si la session tombe, `screen -r oneinstack` vous ramène devant l'écran d'installation. Les chemins
d'installation, de stockage des données et des journaux se règlent dans `options.conf`, **avant** de lancer le
script — après, c'est trop tard.

Une fois installé, tout se pilote avec des scripts d'accompagnement :

| Commande | Rôle |
| --- | --- |
| `./vhost.sh` | Ajouter un hôte virtuel, avec son dossier et un certificat auto-signé |
| `./vhost.sh --del` | Supprimer un hôte virtuel |
| `./addons.sh` | Ajouter des extensions PHP, Redis, Memcached |
| `./install.sh --mphp_ver 74` | Installer une seconde version de PHP en parallèle |
| `./pureftpd_vhost.sh` | Créer un compte FTP virtuel |
| `./backup_setup.sh` puis `./backup.sh` | Paramétrer puis lancer une sauvegarde |
| `./upgrade.sh` | Mettre à jour les composants installés |
| `./uninstall.sh` | Tout retirer |

C'est redoutablement efficace : une heure de compilation et la pile complète tourne, avec les hôtes virtuels
créés en une question-réponse.

:::danger
Ce que ce genre de script ne dit pas assez fort : il installe **hors** du gestionnaire de paquets. Votre
`apt upgrade` ou `dnf update` ne corrigera jamais ce Nginx ni ce PHP. Les correctifs de sécurité ne viendront
que de `upgrade.sh`, donc de votre vigilance, pendant toute la durée de vie du serveur. Ajoutez à cela un
téléchargement en HTTP simple exécuté en root, et vous avez deux bonnes raisons de réserver cette voie aux
maquettes et aux serveurs strictement internes. Tout ce qui est exposé passe par les paquets de la
distribution.
:::

## Exploiter au quotidien

```bash
systemctl status nginx php-fpm
systemctl reload nginx          # recharge la configuration sans couper les connexions
journalctl -u nginx -n 50
tail -f /var/log/nginx/example.com.error.log
ss -lntp | grep -E ':(80|443)'
```

Et la vérification finale, depuis un autre poste :

```bash
curl -I https://example.com
```

Si vous avez déposé un `phpinfo()` pour tester l'interpréteur, supprimez-le. Cette page décrit publiquement
votre version de PHP, vos modules et vos chemins : c'est un plan de la maison affiché sur la porte d'entrée.

## Pour aller plus loin

- Le cycle de vie des certificats, une fois le serveur en place :
  [Renouveler un certificat SSL sur ses services](/docs/cybersecurite/renouveler-un-certificat-ssl-sur-ses-services/).
- Publier un service qui ne sait pas faire de HTTPS lui-même :
  [Mettre un boîtier sans HTTPS derrière un reverse proxy](/docs/self-hosting/mettre-un-boitier-sans-https-derriere-un-reverse-proxy/).
- La base de données qui va avec :
  [MySQL, les tâches d'administration qui reviennent tout le temps](/docs/linux/mysql-taches-dadministration-courantes/).

<!-- source : procédures internes « Installation d'un serveur web sur Linux » et « Installation serveur web Oracle Linux », 2026-08-21 -->

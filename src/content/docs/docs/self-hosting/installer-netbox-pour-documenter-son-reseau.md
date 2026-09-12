---
title: "NetBox : documenter son réseau et son parc comme une source de vérité"
description: "Installer NetBox sur une distribution de la famille Red Hat : PostgreSQL, Redis, environnement Python, services systemd, publication derrière Apache. Et surtout, ce qu'il faut mettre dedans pour que la base reste vraie."
published: 2025-02-10
category: self-hosting
tags: [netbox, ipam, dcim, postgresql, python, documentation]
level: avancé
status: à jour
featured: false
tested_on: [NetBox, PostgreSQL 12, Python 3.9, Apache httpd]
sidebar:
  label: "NetBox : documenter son réseau"
---

Le plan d'adressage d'une PME vit d'abord dans un tableur. Une colonne pour l'adresse, une pour le nom de la
machine, une pour « qui s'en sert », et une quatrième, plus grande que les autres, remplie de « à vérifier ».
Ce fichier est faux le lendemain du jour où on l'a écrit. Pas par négligence : parce que personne ne pense à
ouvrir un tableur en rebranchant un automate un vendredi soir.

NetBox répond à ce problème d'une manière inhabituelle. Ce n'est pas un scanner : il ne découvre pas votre réseau
tout seul. Il enregistre ce qui **devrait** exister — sites, baies, équipements, interfaces, câbles, VLAN,
préfixes IP — et vous comparez ensuite cette base au réel. La nuance a l'air théorique ; elle change tout à
l'usage, et j'y reviens à la fin.

## Prérequis

- Une machine Linux dédiée, 2 vCPU et 4 Go de RAM, sur une distribution de la famille Red Hat ou sur Debian et
  dérivées. Les commandes ci-dessous utilisent `yum`/`dnf` ; les équivalents `apt` sont directs.
- PostgreSQL, Redis et un Python suffisamment récent pour la version de NetBox visée.
- Un nom DNS interne et un certificat pour la publication finale.

## Installer la base de données

NetBox stocke tout dans PostgreSQL. Rien d'exotique, à un détail près : l'authentification par défaut sur
certaines distributions refuse les connexions par mot de passe en local, et vous obtenez un message d'erreur
d'authentification qui ne dit pas grand-chose.

```bash title="PostgreSQL"
sudo yum install -y postgresql-server libpq-devel
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Dans `/var/lib/pgsql/data/pg_hba.conf`, passez les deux lignes de la boucle locale en `md5` (ou `scram-sha-256`
sur une version récente), puis rechargez le service :

```text title="/var/lib/pgsql/data/pg_hba.conf"
host    all    all    127.0.0.1/32    md5
host    all    all    ::1/128         md5
```

```bash title="Créer la base et son utilisateur"
sudo -u postgres psql
CREATE DATABASE netbox;
CREATE USER netbox WITH PASSWORD 'un-mot-de-passe-long-et-aleatoire';
GRANT ALL PRIVILEGES ON DATABASE netbox TO netbox;
\q
```

Vérifiez tout de suite que la connexion fonctionne avec ce compte, avant d'aller plus loin. `\conninfo` confirme
l'hôte, le port et le chiffrement de la session :

```bash title="Contrôle de la connexion applicative"
psql --username netbox --password --host localhost netbox
netbox=> \conninfo
netbox=> \q
```

:::caution
Ce mot de passe se retrouvera en clair dans le fichier de configuration de NetBox : c'est normal, l'application
doit pouvoir se connecter seule. Ce qui ne l'est pas, c'est de le recopier dans une procédure partagée. La
procédure interne dont je suis parti se promenait avec un mot de passe de production dedans depuis des années.
:::

Redis sert de file d'attente pour les tâches de fond et de cache. La configuration livrée convient telle quelle.

```bash title="Redis"
sudo yum install -y redis
sudo systemctl enable --now redis
redis-cli ping     # doit répondre PONG
```

## Préparer Python

NetBox est une application Django, avec une version minimale de Python à respecter. Si votre distribution ne la
fournit pas, installez cette version **à côté** du Python système, jamais à la place : les outils
d'administration de la distribution en dépendent. Selon les cas, cela passe par un module, un paquet dédié ou
une compilation depuis les sources.

```bash title="Dépendances de compilation des modules Python"
sudo yum -y groupinstall "Development Tools"
sudo yum -y install gcc openssl-devel bzip2-devel libffi-devel libxml2-devel libxslt-devel redhat-rpm-config
```

## Déployer NetBox

```bash title="Récupérer le code et créer le compte de service"
sudo mkdir -p /opt/netbox && cd /opt/netbox
sudo yum install -y git
sudo git clone -b master https://github.com/netbox-community/netbox.git .
sudo groupadd --system netbox
sudo adduser --system -g netbox netbox
sudo chown --recursive netbox /opt/netbox/netbox/media/
```

La configuration se fait dans un seul fichier, copié depuis l'exemple fourni :

```bash title="Fichier de configuration et clé secrète"
cd /opt/netbox/netbox/netbox/
sudo cp configuration.example.py configuration.py
python3 ../generate_secret_key.py
```

Reportez la clé générée dans `SECRET_KEY`, renseignez le bloc `DATABASE` avec les identifiants créés plus haut,
et renseignez `ALLOWED_HOSTS`.

:::danger
`ALLOWED_HOSTS = ['*']` se trouve dans tous les tutoriels, y compris celui que j'avais rédigé en interne. C'est
une valeur de test. En production, mettez le nom DNS réel du service, et lui seul : cette liste est la protection
de Django contre les requêtes envoyées avec un faux en-tête `Host`.
:::

Le script `upgrade.sh` fourni par le projet crée l'environnement virtuel, installe les dépendances, applique les
migrations et collecte les fichiers statiques. Si vous utilisez un Python installé à côté du Python système,
c'est dans ce script que le chemin de l'interpréteur doit être ajusté — et il faudra y repenser à chaque montée
de version. Les paquets Python optionnels se déclarent dans `local_requirements.txt` ; c'est là que se mettent
les extensions, par exemple celle qui interroge les équipements réseau pour récupérer leur configuration
courante.

```bash title="Construction de l'environnement et compte administrateur"
sudo /opt/netbox/upgrade.sh
source /opt/netbox/venv/bin/activate
cd /opt/netbox/netbox
python manage.py createsuperuser
```

Un test rapide en mode développement permet de valider que l'application démarre avant de s'occuper des
services :

```bash title="Test temporaire"
python manage.py runserver 0.0.0.0:8000 --insecure
```

:::note
`runserver` est le serveur de développement de Django. Il n'est ni performant ni sûr, et n'a aucune raison de
rester en place. Si vous ouvrez le port 8000 dans le pare-feu pour ce test, refermez-le ensuite.
:::

## Passer en service permanent

En production, NetBox tourne derrière Gunicorn, avec deux unités systemd : l'application web et le
gestionnaire de tâches de fond. Oublier la seconde donne une interface parfaitement fonctionnelle dans laquelle
rien de ce qui est asynchrone n'aboutit — rapports, synchronisations, journaux de modifications différés.

```bash title="Unités systemd fournies par le projet"
sudo cp /opt/netbox/contrib/gunicorn.py /opt/netbox/gunicorn.py
sudo cp -v /opt/netbox/contrib/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now netbox netbox-rq
systemctl status netbox.service
```

Si vous avez recréé l'environnement virtuel avec un autre interpréteur, vérifiez que les `ExecStart` des deux
unités pointent bien vers les binaires de ce `venv`. C'est le message d'avertissement que `upgrade.sh` affiche
en fin de course, et que tout le monde fait défiler sans le lire.

## Publier derrière un reverse proxy

Gunicorn n'a pas vocation à être exposé. Un serveur web devant lui termine le TLS et sert les fichiers
statiques. Le projet fournit des exemples de configuration prêts à adapter dans `contrib/`.

```bash title="Apache avec mod_ssl"
sudo dnf install -y httpd mod_ssl
sudo mkdir -p /etc/httpd/sites-available /etc/httpd/sites-enabled
echo "IncludeOptional sites-enabled/*.conf" | sudo tee -a /etc/httpd/conf/httpd.conf
sudo cp /opt/netbox/contrib/apache.conf /etc/httpd/sites-available/netbox.example.com.conf
sudo ln -s /etc/httpd/sites-available/netbox.example.com.conf /etc/httpd/sites-enabled/
sudo systemctl enable --now httpd
```

Dans le fichier de site, remplacez `ServerName` par votre nom DNS et pointez les directives de certificat vers
vos fichiers. Ouvrez ensuite le service HTTPS dans le pare-feu :

```bash title="Pare-feu"
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

:::caution
Sur une distribution avec SELinux en mode strict, Apache n'a pas le droit d'ouvrir une connexion réseau vers
Gunicorn. Le symptôme est une erreur 503 alors que le service NetBox tourne parfaitement. Le booléen
`httpd_can_network_connect` règle le cas ; vérifiez aussi le contexte des fichiers de certificat plutôt que de
désactiver SELinux, ce qui est la solution la plus rapide et la plus mauvaise.
:::

## Mettre à jour

Sauvegardez la base **avant**, toujours. Ensuite, la mise à jour est un `git pull` suivi du même script que
lors de l'installation :

```bash title="Montée de version"
cd /opt/netbox
sudo git checkout master && sudo git pull origin master
sudo ./upgrade.sh
sudo systemctl restart netbox netbox-rq
```

Lisez les notes de version avant de lancer la commande : NetBox change son modèle de données assez souvent, et
une migration qui échoue à mi-parcours sur une base non sauvegardée est une très mauvaise soirée.

## Ce qui fait qu'une base reste vraie

L'installation, c'est une demi-journée. La partie difficile commence après, et elle n'est pas technique.

Commencez petit, par ce qui fait mal : sites, baies, équipements réseau, VLAN et préfixes IP. Le parc
utilisateur peut attendre, d'autant qu'il vit souvent mieux dans un outil de gestion de parc relié au helpdesk.

Ensuite, une règle unique, et non négociable : **on met à jour la base au moment du changement, pas après**. Une
source de vérité qu'on synchronise « quand on aura le temps » devient un tableur avec une jolie interface. Dans
la pratique, cela veut dire que la déclaration dans NetBox fait partie de l'intervention, au même titre que le
câble qu'on vient de brancher.

Enfin, servez-vous-en pour autre chose que de la lecture. NetBox expose une API, et cette API est la vraie
raison de l'installer : générer les fichiers de configuration des équipements, alimenter la supervision à partir
des équipements déclarés, comparer ce que dit la base à ce que disent réellement les switchs. Le jour où votre
documentation produit quelque chose, plus personne n'oublie de la tenir à jour.

## Pour aller plus loin

- Retrouver ce qui est réellement branché avant de le déclarer :
  [découvrir la topologie d'un réseau de switchs](/docs/reseau/decouvrir-la-topologie-dun-reseau-de-switchs/).
- Le découpage à modéliser en premier dans un contexte industriel :
  [segmenter les réseaux des machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/).
- Les plages à utiliser dans vos préfixes :
  [les trois plages IP privées de la RFC 1918](/docs/reseau/les-trois-plages-ip-privees-rfc-1918/).

<!-- source : procédure interne « Installation de NetBox », export du centre de documentation -->

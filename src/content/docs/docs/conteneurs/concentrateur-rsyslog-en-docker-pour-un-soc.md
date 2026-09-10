---
title: "Déployer un concentrateur rsyslog en Docker pour un SOC managé"
description: "Monter le relais syslog qu'un prestataire de Micro-SOC exige sur site : dimensionnement, installation de Docker sur Ubuntu 24.04, flux à ouvrir, redirection des sources et écriture des parsers maison."
published: 2025-10-21
category: conteneurs
tags: [rsyslog, docker, soc, sekoia, ubuntu]
level: avancé
status: à jour
featured: false
tested_on: [Ubuntu Server 24.04 LTS, Docker CE]
sidebar:
  label: "Déployer un concentrateur rsyslog en Docker…"
---

Quand une PME souscrit à un Micro-SOC, le contrat commence rarement par de la détection. Il commence par une
liste de prérequis, et au milieu de cette liste il y a une machine à monter : le concentrateur. C'est un relais
syslog installé chez vous, qui collecte les journaux de tout ce qui sait en produire — pare-feu, contrôleurs de
domaine, serveurs Linux, plateforme d'auto-hébergement — et les pousse chiffrés vers la plateforme XDR du
prestataire — SEKOIA dans mon cas, opérée par un Micro-SOC.

Ce n'est pas la partie glorieuse du projet, mais c'est celle qui décide de sa qualité. Un concentrateur mal
dimensionné perd des événements en silence ; une source mal redirigée n'apparaît jamais dans les alertes, et
personne ne s'en aperçoit avant l'incident. Voici comment je l'ai monté, avec les deux ou trois choses que la
documentation du prestataire ne dit pas.

## Prérequis et dimensionnement

Le prestataire raisonne en **EPS**, événements par seconde. L'ordre de grandeur qu'on m'a donné : un serveur
concentrateur pour environ 8 500 EPS. Une PME industrielle avec quelques serveurs, deux contrôleurs de
domaine, un pare-feu bavard et une centaine de postes reste très en dessous ; une seule machine suffit.

| Ressource | Valeur retenue |
| --- | --- |
| Système | Ubuntu Server 24.04 LTS |
| CPU | 4 vCPU |
| Mémoire | 8 Go |
| Disque système | environ 20 Go |
| Rôle | uniquement le concentrateur, rien d'autre |

Ce dernier point n'est pas négociable. Une machine qui relaie des journaux de sécurité est une machine de
confiance : elle voit passer les traces de tout le parc. On ne l'utilise pas pour héberger « aussi » un petit
service en plus.

:::tip
Activez Ubuntu Pro sur cette machine. Livepatch applique les correctifs de noyau sans redémarrage, et un
concentrateur qui redémarre est un concentrateur qui ne collecte pas pendant ce temps-là. Les événements
perdus pendant un reboot ne se rattrapent pas.
:::

## Installer Docker sur Ubuntu 24.04

Le concentrateur est livré sous forme d'images de conteneurs. On installe donc le moteur Docker officiel — pas
le paquet `docker.io` de la distribution, qui est souvent en retard sur le plugin Compose.

```bash title="Dépôt officiel Docker et moteur"
sudo apt update
sudo apt install -y ca-certificates curl gnupg python3-pip

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo docker run --rm hello-world
```

Certains outils d'installation du prestataire sont écrits en Python et réclament quelques dépendances :

```bash title="Dépendances des scripts fournis"
sudo pip3 install PyYAML Unidecode requests --break-system-packages
```

:::caution
Sur Ubuntu 24.04, `pip3 install` en dehors d'un environnement virtuel refuse de s'exécuter (PEP 668). Le
`--break-system-packages` ci-dessus est la version rapide ; la version propre est un `python3 -m venv`. Si les
scripts du prestataire tournent en tâche planifiée, prenez le temps de faire le venv, vous vous épargnerez une
surprise à la prochaine montée de version.
:::

## Ouvrir les bons flux, et seulement ceux-là

Le concentrateur a besoin de trois choses en sortie. Rien en entrée depuis Internet.

| Destination | Port | Usage |
| --- | --- | --- |
| Registre de conteneurs (`ghcr.io`) | 443/TCP | téléchargement et mise à jour des images |
| Point d'entrée de la plateforme XDR (`intake.sekoia.io`) | 10514/TCP | envoi des journaux en syslog TLS |
| Point d'entrée de la plateforme XDR (`intake.sekoia.io`) | 443/TCP | supervision et configuration |

En entrée, uniquement depuis vos propres réseaux : 514/UDP ou 514/TCP pour les sources classiques, et le port
TLS si vos sources savent chiffrer. Une règle par plage source, jamais un `any`.

## Déployer le concentrateur

Le prestataire fournit un fichier `docker-compose.yml` et des clés d'*intake* : une clé par source, ce qui
permet à la plateforme de savoir quel type de journal elle reçoit et quel analyseur appliquer.

```bash title="Déploiement"
sudo mkdir -p /opt/concentrateur && cd /opt/concentrateur
# récupérer le docker-compose.yml et le fichier de configuration fournis
sudo docker compose config          # valide la syntaxe avant de lancer quoi que ce soit
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs -f --tail=100
```

:::danger
Les clés d'intake sont des secrets : elles autorisent l'écriture dans votre espace XDR. Elles ne partent ni
dans un dépôt Git, ni par messagerie. Sur le serveur, le fichier qui les contient doit appartenir à root et
n'être lisible que par lui.
:::

## Rediriger les sources

Une fois le concentrateur en écoute, il faut lui parler. Chaque famille de sources a sa méthode : interface
graphique pour le pare-feu et l'antispam, agent pour Windows, `rsyslog` pour les serveurs Linux.

```text title="/etc/rsyslog.d/90-concentrateur.conf — sur chaque serveur Linux"
# Envoi en TCP (@@) vers le concentrateur, avec file d'attente disque en cas de coupure
*.* action(type="omfwd"
           target="10.10.0.20" port="514" protocol="tcp"
           queue.type="LinkedList"
           queue.filename="q_concentrateur"
           queue.maxdiskspace="1g"
           queue.saveonshutdown="on"
           action.resumeRetryCount="-1")
```

La file d'attente disque est ce qui distingue une redirection sérieuse d'une redirection décorative : si le
concentrateur redémarre, les événements attendent sur la source au lieu de disparaître.

```bash title="Vérifier de bout en bout"
sudo systemctl restart rsyslog
logger -p local0.notice "test concentrateur $(hostname) $(date +%s)"
# puis, sur le concentrateur :
sudo docker compose logs --tail=50 | grep test
```

Prenez l'habitude de faire ce test **pour chaque source ajoutée**, et de noter la date du dernier événement
reçu par source. Une source silencieuse depuis trois semaines, ça ne déclenche aucune alerte — c'est
précisément le problème.

## Écrire un parser quand le format ne rentre pas dans les cases

C'est là que le projet devient artisanal. Les sources standard sont reconnues automatiquement, mais dès qu'un
équipement produit un format maison, il faut décrire ce format avec des motifs Grok ou des expressions
régulières pour que la plateforme sache où sont l'horodatage, la source, l'utilisateur et l'action.

L'interface graphique du prestataire propose un convertisseur qui transforme un exemple de ligne en parser.
Chez moi, il n'a jamais abouti : la fenêtre se ferme sans produire de résultat. J'ai arrêté de me battre avec
et j'ai écrit les expressions régulières directement dans la configuration de rsyslog sur le concentrateur,
avec un modèle de sortie normalisé. C'est plus verbeux, mais c'est versionnable, testable hors ligne, et ça ne
dépend pas d'un formulaire web.

La méthode qui marche :

1. Récupérez une dizaine de lignes réelles de la source, dont au moins deux cas anormaux (erreur, échec
   d'authentification).
2. Écrivez le motif sur une seule de ces lignes, en commençant par les champs faciles (date, hôte).
3. Testez le motif hors production, avec un utilitaire Grok ou un simple script, avant de toucher au
   concentrateur.
4. Rechargez rsyslog et vérifiez que les champs remontent bien découpés côté plateforme, pas juste le message
   brut dans un champ fourre-tout.

## Le cas des applications en conteneur

Piège classique quand on héberge ses applications en conteneurs : les journaux intéressants sont **dans** les
conteneurs, et le concentrateur ne les voit pas. Ne montez pas un agent dans chaque conteneur. Configurez le
pilote de journalisation de Docker pour qu'il écrive dans le journal de l'hôte, et redirigez le journal de
l'hôte, une fois pour toutes.

```json title="/etc/docker/daemon.json"
{
  "log-driver": "journald",
  "log-opts": { "tag": "{{.Name}}" }
}
```

Un redémarrage du démon Docker plus tard, tout ce que produisent les conteneurs passe par `journald`, donc par
`rsyslog`, donc par le concentrateur. Sur une plateforme d'auto-hébergement clé en main, vérifiez d'abord ce
que l'éditeur prévoit : certaines gèrent déjà l'export syslog, et écraser leur configuration Docker n'est
jamais une bonne idée.

Dernier point du chantier : l'agent EDR sur les serveurs Linux eux-mêmes, y compris celui qui héberge vos
applications. Le concentrateur collecte ce que les machines veulent bien dire ; l'agent, lui, voit ce qui se
passe sur la machine. Les deux sont complémentaires, et le prestataire attendra les deux.

## Pour aller plus loin

- Éviter les redémarrages sur une machine qui doit collecter en continu :
  [Activer Ubuntu Pro : Livepatch et ESM](/docs/linux/activer-ubuntu-pro-livepatch-et-esm/).
- L'autre moitié du dispositif, côté poste et serveur :
  [SentinelOne : piloter la mise à jour des agents](/docs/cybersecurite/sentinelone-piloter-la-mise-a-jour-des-agents/).
- Savoir lire les journaux d'une plateforme d'auto-hébergement avant de décider lesquels valent la peine
  d'être expédiés : [Lire les logs « box » de Cloudron](/docs/self-hosting/lire-les-logs-box-de-cloudron/).

<!-- source : mail « Prérequis concentrateur », 2025-09-30 ; « Intakes Grok / Regex », 2025-10-21 -->

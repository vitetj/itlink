---
title: "Un testeur de lame à ultrasons piloté par un Raspberry Pi 5 et une IHM web"
description: "Un banc d'atelier pour tester des lames de découpe à ultrasons, une IHM maison servie par un Raspberry Pi 5, et un raccourci dans l'intranet pour que l'opérateur n'ait plus à toucher à l'automate."
published: 2024-09-26
category: hardware
status: en production
stack: [Raspberry Pi 5 (8 Go), Linux, IHM web maison, générateur à ultrasons Branson, intranet Cloudron]
tags: [raspberry-pi, ihm, atelier, ultrasons, web, industrie]
featured: false
---

Dans ma boîte, certaines machines découpent par ultrasons : une lame vibre à une fréquence inaudible, entraînée par un générateur, et tranche proprement ce qu'une lame classique écraserait. Une lame, ça s'use, ça se contrôle, et il faut pouvoir la faire vibrer sur un banc avant de la monter. Ce banc existait dans l'atelier : un générateur à ultrasons Branson, une partie commande dans une armoire, et un opérateur qui devait aller jusqu'à l'automate pour lancer un test.

Le 25 septembre 2024, le testeur de lame est passé « opérationnel » avec une IHM web maison servie par un Raspberry Pi 5, accessible depuis n'importe quel PC de l'atelier à une adresse du domaine interne, disons `lame.example.com`, et un raccourci dans l'intranet visible uniquement du groupe concerné. D'après la documentation des automaticiens, plus besoin d'accéder physiquement à l'automate. C'est l'objectif, et c'est tout l'objectif.

Je ne décris pas ici ce que le banc mesure ni comment l'IHM parle à la partie commande : c'est le cœur du produit, et ça reste dans l'atelier. Ce qui suit, c'est la partie « informatique » du projet, celle qui se réutilise pour n'importe quel équipement d'atelier qu'on veut piloter depuis un navigateur.

## Pourquoi un Raspberry Pi, et pourquoi une IHM web

Un PC industriel pour afficher trois boutons et une courbe, c'est cher, encombrant, et il finit par tourner avec un Windows qu'il faut maintenir. Un pupitre tactile propriétaire, c'est un écosystème fermé et une licence par écran. Un Raspberry Pi 5 avec 8 Go de mémoire coûte une fraction d'un PC industriel, tient dans la main, et fait tourner un serveur web sans forcer.

Le choix du web est le vrai choix. Une IHM web, c'est zéro logiciel à installer sur les postes : le navigateur suffit, depuis le PC d'atelier, depuis un portable, ou depuis le PC de rebond quand un automaticien intervient à distance. Une mise à jour se fait à un seul endroit, sur le Pi. Et le jour où l'écran change, l'IHM ne change pas.

## Matériel / stack

- Raspberry Pi 5, 8 Go, avec son alimentation officielle. Prévoyez un refroidissement actif : un Pi 5 qui chauffe dans une armoire ralentit.
- Carte microSD pour le système. On en reparle dans les limites.
- Liaison Ethernet sur le réseau de l'atelier, adresse fixe.
- Le générateur à ultrasons Branson et la partie commande existante du banc, inchangés.
- Une petite application web maison, lancée comme un service système.
- Un nom DNS sur le domaine interne et un raccourci dans le portail intranet, sous Cloudron, restreint au groupe atelier.

## Mise en place

### Préparer le Pi

Rien d'exotique : Raspberry Pi Imager, l'image Raspberry Pi OS Lite en 64 bits, SSH activé et un utilisateur créé dès l'image. Pas d'environnement graphique : le Pi sert une page, il ne l'affiche pas.

```bash title="Premier démarrage"
sudo apt update && sudo apt full-upgrade -y
sudo hostnamectl set-hostname testeur-lame
sudo reboot
```

Un équipement d'atelier doit avoir une adresse qui ne bouge pas, sinon le raccourci de l'intranet meurt au premier renouvellement de bail. Réservation DHCP côté serveur, ou adresse statique sur le Pi. L'exemple utilise une plage fictive, remplacez par la vôtre :

```bash title="Adresse statique avec NetworkManager"
sudo nmcli con mod "Wired connection 1" ipv4.method manual \
  ipv4.addresses 10.20.30.40/24 ipv4.gateway 10.20.30.1 ipv4.dns 10.20.30.10
sudo nmcli con up "Wired connection 1"
```

### Lancer l'IHM comme un service

Chez moi, l'application vit dans un dossier dédié et tourne sous un utilisateur sans droits particuliers. Elle démarre avec le Pi et redémarre seule si elle plante, parce qu'un Pi d'atelier se fait débrancher, et que personne ne veut appeler l'informatique pour relancer un service. L'unit ci-dessous est la trame ; adaptez le chemin et la commande de démarrage.

```ini title="/etc/systemd/system/ihm-lame.service"
[Unit]
Description=IHM testeur de lame
Wants=network-online.target
After=network-online.target

[Service]
User=ihm
Group=ihm
WorkingDirectory=/opt/ihm-lame
ExecStart=/opt/ihm-lame/start.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash title="Activer et surveiller"
sudo systemctl daemon-reload
sudo systemctl enable --now ihm-lame
journalctl -u ihm-lame -f
```

:::tip
`Restart=on-failure` et `RestartSec=5` valent plus que n'importe quelle procédure de redémarrage imprimée à côté du banc. L'opérateur ne lit pas la procédure ; il rafraîchit la page.
:::

### Publier sur l'intranet

Le Pi ne s'expose pas. Il reçoit un nom sur le domaine interne, et le portail intranet, sous Cloudron, affiche un raccourci vers ce nom, uniquement pour le groupe qui utilise le banc. Les autres ne voient même pas qu'il existe. Depuis l'extérieur du site, le seul chemin passe par le PC de rebond, jamais par une ouverture directe.

:::caution
Un Pi qui pilote un équipement reste dans le réseau de l'atelier, avec les machines, pas dans le réseau bureautique et encore moins sur Internet. Si vos réseaux ne sont pas encore séparés, [c'est le moment](/docs/architecture/segmenter-les-reseaux-machines-industrielles/).
:::

## Ce que ça donne

Depuis fin septembre 2024, l'opérateur ouvre le raccourci, lance son test et lit le résultat, sans toucher à l'automate. Les automaticiens gardent la main sur la partie commande et sur leur documentation ; je garde la main sur le Pi, le service et la publication. Chacun sa boîte, et l'IHM au milieu.

Le banc est en production dans l'atelier. Ce n'est pas une démonstration : c'est un outil, et le fait qu'un Raspberry Pi tienne ce rôle en dit plus long sur les pupitres propriétaires que sur le Pi.

Le bénéfice caché, c'est la maintenance. Un pupitre tactile qui tombe en panne, c'est une référence à recommander et un délai. Un Pi, c'est une carte à recopier et une autre carte dans le tiroir.

## Limites et suite

- **Un Pi grand public dans un atelier.** Poussière, température, alimentation en 5 V par USB-C, pas de fixation sur rail DIN. Ça tient, mais ce n'est pas fait pour. Le lendemain de la mise en service, j'ai comparé les déclinaisons industrielles du Raspberry (rail DIN, alimentation 24 V, boîtier métallique) et les cartes Banana Pi. Pas de décision à ce stade : le Pi 5 tourne, et on remplacera quand il aura montré une faiblesse, ou quand le banc sera dupliqué.
- **La carte microSD.** C'est le point faible connu de tout Pi qui écrit des journaux en continu. La suite raisonnable : une image de la carte conservée à côté, et une procédure de réinstallation écrite, comme pour n'importe quel serveur. Le Pi 5 sait aussi démarrer sur un SSD NVMe via son connecteur PCIe ; c'est la piste si la carte fatigue.
- **Un écran tactile au pied du banc.** Aujourd'hui l'opérateur passe par un PC. Un mini-PC tactile, ou un écran raccordé au Pi en mode kiosque, est envisagé pour que le banc soit autonome. L'IHM étant web, rien ne change côté application.
- **La sauvegarde de l'application elle-même.** À traiter comme le reste : dépôt Git pour le code, configuration dans le dossier du service, image de la carte. C'est la prochaine étape, pas un acquis.

Ce Pi fait partie de la même famille que [le reste de mon homelab](/lab/homelab-vue-densemble/) : des outils simples, sous mon contrôle, qui font une chose et la font depuis un navigateur.

<!-- source : mails « Test lame opérationnel », 2024-09-25 et « rasp indus », 2024-09-26 -->

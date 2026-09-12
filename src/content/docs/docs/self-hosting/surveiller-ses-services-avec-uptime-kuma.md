---
title: "Surveiller ses services avec Uptime Kuma, et prévenir les bonnes personnes"
description: "Déployer une supervision légère en un conteneur, choisir des sondes qui détectent les vraies pannes, et régler les notifications pour qu'elles réveillent celui qui peut agir plutôt que tout le monde."
published: 2025-06-24
category: self-hosting
tags: [uptime-kuma, supervision, docker, alerting, self-hosting]
level: débutant
status: à jour
featured: false
tested_on: [Uptime Kuma, Docker]
sidebar:
  label: "Surveiller ses services avec Uptime Kuma"
---

Il y a deux façons d'apprendre qu'un service est tombé. La première, c'est un message de la comptabilité à
9 h 12 disant que « le serveur ne marche pas ». La seconde, c'est une notification reçue à 6 h 40, pendant que
personne ne travaillait encore. La différence entre les deux ne tient pas à la qualité de votre infrastructure,
mais au fait d'avoir passé une heure à installer une supervision.

Uptime Kuma fait exactement ça, et rien d'autre. Il interroge vos services à intervalle régulier, il garde
l'historique, et il prévient quand la réponse change. Un conteneur, un volume, c'est tout.

## Installer

```bash title="Un conteneur, un volume"
docker run -d --restart=always \
  -p 127.0.0.1:3001:3001 \
  -v /srv/uptime-kuma:/app/data \
  --name uptime-kuma louislam/uptime-kuma:1
```

Le dossier monté sur `/app/data` contient la base et toute la configuration. C'est le seul élément à
sauvegarder, et le seul à conserver lors d'une montée de version : on supprime le conteneur, on récupère la
nouvelle image, on relance la même commande.

L'interface se publie ensuite derrière votre reverse proxy habituel. Attention à un point : Uptime Kuma
communique avec le navigateur par WebSocket. Si votre configuration de proxy ne relaie pas les en-têtes de mise
à niveau de connexion, la page se charge et reste désespérément vide.

:::caution
N'hébergez pas la supervision sur la machine qu'elle surveille, ni sur le même hyperviseur si vous pouvez
l'éviter. Une sonde qui tombe en même temps que ce qu'elle observe ne prévient personne. Une petite machine
séparée, ou mieux, hébergée ailleurs que dans vos murs, fait très bien l'affaire.
:::

Au premier accès, vous créez le compte administrateur. Activez immédiatement la double authentification
proposée dans le profil : cette interface liste vos URL internes, vos ports et vos noms d'hôtes.

## Choisir des sondes qui détectent les vraies pannes

Le réflexe du débutant est de sonder l'adresse IP en `ping`. C'est la sonde la moins utile qui soit : une
machine peut répondre parfaitement au ping avec son service applicatif à l'arrêt depuis trois heures.

| Type de sonde | Ce qu'elle prouve | Quand l'utiliser |
| --- | --- | --- |
| HTTP(s) | le service web répond avec un code attendu | pour toute application web, c'est le choix par défaut |
| HTTP(s) avec mot-clé | la page contient bien un texte précis | quand l'application affiche une page d'erreur avec un code 200 |
| TCP Port | le port écoute | bases de données, SMTP, services sans interface web |
| Ping | la machine est joignable | équipements réseau, imprimantes, automates |
| DNS | le serveur résout un nom donné | résolveurs internes |

Le cas du mot-clé mérite qu'on s'y arrête. Beaucoup d'applications répondent « tout va bien » au niveau HTTP
tout en affichant un message d'erreur applicatif à l'écran : base inaccessible, licence expirée, session
invalide. Une sonde qui cherche un texte présent uniquement sur la page de connexion réelle voit ce que le code
de retour ne dit pas.

Pensez enfin à la surveillance des certificats. Uptime Kuma prévient avant l'expiration d'un certificat TLS sur
les sondes HTTPS, et c'est probablement la fonction qui vous évitera le plus d'appels un dimanche soir.

## Régler l'intervalle et le seuil de patience

Deux réglages par sonde, souvent laissés par défaut.

L'**intervalle** détermine le délai maximal entre la panne et l'alerte. Soixante secondes conviennent pour un
service critique ; cinq minutes suffisent largement pour une imprimante.

Le nombre de **tentatives avant alerte** est l'antidote au bruit. Une sonde qui alerte au premier échec vous
enverra un message à chaque micro-coupure réseau, et vous apprendrez en trois semaines à ignorer vos propres
alertes. Deux ou trois tentatives consécutives avant de déclencher, c'est le bon compromis.

## Prévenir les bonnes personnes

C'est ici que la plupart des installations ratent leur cible. Une supervision qui envoie tout à tout le monde
est équivalente à une supervision éteinte, en plus agaçante.

Uptime Kuma gère plusieurs canaux de notification — courriel SMTP, messagerie d'équipe, passerelle mobile,
webhook vers un outil maison — et, surtout, il permet d'affecter des canaux différents à des sondes différentes.
Servez-vous-en :

- **Ce qui arrête l'entreprise** (ERP, annuaire, accès Internet, serveur de fichiers) part sur un canal qui
  réveille, et uniquement sur celui-là.
- **Ce qui peut attendre le lendemain matin** (un service interne secondaire, un tableau de bord) part dans un
  canal de discussion que l'on consulte en arrivant.
- **Ce qui concerne un métier précis** peut être routé vers son responsable, à condition qu'il ait quelque chose
  à en faire. Sinon, c'est du bruit déguisé en transparence.

Configurez le canal courriel avec un compte de service dédié, pas une boîte personnelle, et vérifiez qu'il ne
dépend pas d'un service que vous surveillez. Une alerte « la messagerie est tombée » envoyée par la messagerie
n'a jamais aidé personne.

Déclarez enfin les fenêtres de maintenance avant vos interventions planifiées. C'est une fonction native, elle
suspend les sondes concernées, et elle évite d'entraîner tout le monde à ignorer les notifications du samedi
matin.

## La page d'état, l'autre bénéfice

Uptime Kuma sait publier une page d'état regroupant les sondes de votre choix, avec leur historique. Ouverte aux
utilisateurs internes, elle absorbe une partie des appels : quand le service est réellement en panne, les gens
le voient avant de décrocher leur téléphone.

Une seule précaution : n'y publiez que des libellés métier. « ERP » et « Messagerie », pas les noms d'hôtes ni
les URL internes. Une page d'état est une cartographie de votre système d'information, et elle est en général
plus accessible que vos serveurs.

## Pour aller plus loin

- Écrire des messages que les gens lisent vraiment quand le service est coupé :
  [écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/).
- Publier l'interface proprement :
  [mettre un boîtier sans HTTPS derrière un reverse proxy](/docs/self-hosting/mettre-un-boitier-sans-https-derriere-un-reverse-proxy/).
- L'autre moitié du travail, la lecture des journaux :
  [lire les logs « box » de Cloudron](/docs/self-hosting/lire-les-logs-box-de-cloudron/).

<!-- source : procédure interne « Installation Uptime Kuma », export du centre de documentation -->

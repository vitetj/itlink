---
title: "Découvrir la topologie d'un réseau de commutateurs qu'on n'a pas câblé"
description: "Reprendre un réseau dont personne n'a le schéma : LLDP, CDP, tables d'adresses MAC et état des ports. La méthode en ligne de commande pour reconstituer les liens, et en tirer un plan qui tient."
published: 2026-05-19
category: reseau
tags: [switch, lldp, cdp, topologie, documentation, vlan]
level: intermédiaire
status: à jour
featured: false
sidebar:
  label: "Découvrir la topologie d'un réseau…"
---

Un jour ou l'autre, on hérite d'un réseau qu'on n'a pas construit. Le schéma existe peut-être, quelque part,
dans une version qui date d'avant les deux derniers déménagements d'atelier. Les étiquettes de brassage disent
« bureau 4 » alors que le bureau 4 est devenu un local de stockage. Et la seule personne qui savait est partie.

La bonne nouvelle, c'est que le réseau se documente lui-même. Les commutateurs savent qui est branché sur
quel port, quels voisins ils voient et sur quelles liaisons. Il suffit de leur poser les questions dans le bon
ordre, en lecture seule, sans rien débrancher.

Cette fiche décrit la méthode que j'applique quand j'arrive sur une infrastructure inconnue : partir du cœur,
descendre par les voisins, et finir par les tables d'adresses MAC pour tout ce qui ne sait pas se présenter.

## Prérequis

- Un accès en console ou en SSH aux commutateurs, avec le **mode privilégié** (`enable`). Tout ce qui suit est
  en lecture, à une exception près que je signale.
- Un carnet, un tableur ou un fichier texte ouvert à côté. Vous allez produire de l'information : si vous ne
  la notez pas au fil de l'eau, vous recommencerez.
- Un peu de temps devant vous. Une découverte se fait en heures creuses, jamais entre deux tickets.

:::caution
Les commandes de découverte ne changent rien, mais les erreurs de frappe, si. Sur un équipement inconnu,
travaillez d'abord en lecture pure. Et avant toute modification, même temporaire, sauvegardez la configuration
courante — sur les plateformes qui le proposent, un `show running-config` copié dans un fichier suffit.
:::

## Commencer par le cœur, pas par la prise murale

Le réflexe naturel est de partir de l'endroit où on a un problème. C'est une erreur : on remonte de proche en
proche et on se perd. Partez des commutateurs de cœur, ceux qui portent le routage inter-VLAN et vers lesquels
tout le reste converge. Il y en a rarement plus de deux, souvent en paire.

Une fois connecté et en mode privilégié, la première photo à prendre est celle des VLAN et des liaisons
montantes :

```text title="Premier état des lieux"
show version
show vlan brief
show interfaces status
show interfaces trunk
```

`show vlan brief` vous donne la liste des VLAN et les ports qui leur appartiennent. `show interfaces trunk`
vous donne les liaisons qui transportent plusieurs VLAN : ce sont vos arêtes principales, celles qui relient
le cœur aux commutateurs de distribution. Notez-les tout de suite.

## Interroger les voisins : LLDP et CDP

C'est la commande qui fait gagner les trois quarts du travail. Les commutateurs annoncent périodiquement leur
identité à leurs voisins directs. Deux protocoles font ça : **LLDP**, standard et compris par à peu près tout
le monde, et **CDP**, propriétaire Cisco mais souvent actif sur du matériel ancien.

```text title="Lister les voisins directs"
show lldp neighbors
show lldp neighbors detail
show cdp neighbors detail
```

La version `detail` est celle qui vous intéresse : elle donne le nom du voisin, son modèle, sa version de
logiciel, son adresse de gestion, **son port à lui** et **votre port à vous**. Avec ça, une arête du schéma
est entièrement décrite en une ligne.

Deux pièges classiques.

- **Le protocole peut être désactivé.** `show lldp` sans résultat ne veut pas dire « pas de voisin », ça peut
  vouloir dire « LLDP éteint ». Vérifiez l'état global avant de conclure.
- **Tout le monde ne parle pas.** Les téléphones IP, les points d'accès et les imprimantes modernes font du
  LLDP. Les automates, les convertisseurs série-Ethernet et les petits commutateurs non administrables, non.
  Pour eux, il faut passer à la méthode suivante.

:::tip
Sur une machine Linux branchée sur le réseau, `lldpcli show neighbors detail` (paquet `lldpd`) vous dit
immédiatement sur quel commutateur et sur quel port elle est câblée. C'est la façon la plus rapide de
retrouver la prise d'un serveur dont personne ne connaît le brassage.
:::

## Suivre les adresses MAC pour tout le reste

Quand un équipement ne se présente pas, il reste sa trace dans la table d'adresses MAC du commutateur : une
correspondance entre une adresse matérielle, un VLAN et un port.

```text title="Trouver ce qui est branché sur un port, et l'inverse"
show mac address-table
show mac address-table interface GigabitEthernet1/0/12
show mac address-table address 0011.2233.4455
```

Un port qui remonte **une seule** adresse MAC porte un équipement terminal. Un port qui en remonte vingt porte
un autre commutateur, ou un petit boîtier non administrable planqué sous un bureau — dans ce cas, l'arête
existe dans le réseau mais pas dans votre inventaire, et c'est exactement ce que vous cherchez à découvrir.

Les trois premiers octets d'une adresse MAC identifient le constructeur. Une base OUI publique vous dira en
quelques secondes si vous avez affaire à un automate, à une caméra ou à une imprimante, ce qui évite beaucoup
d'allers-retours dans les couloirs.

### Quand la table est vide : réveiller le VLAN

La table d'adresses MAC ne contient que ce qui a parlé récemment. Sur un VLAN peu actif, elle peut être
quasiment vide, et le commutateur vous répond qu'il ne connaît personne.

La solution est de générer du trafic depuis le commutateur lui-même. Encore faut-il qu'il ait une adresse dans
le VLAN concerné. S'il n'en a pas, il n'y a pas d'autre choix que de lui en donner une, temporairement — c'est
la seule modification de cette fiche, et elle mérite une précaution :

```text title="Se donner un pied dans le VLAN, le temps de la découverte"
configure terminal
interface vlan 101
 ip address 192.0.2.199 255.255.255.0
 no shutdown
exit
exit
ping 192.0.2.214
show ip arp vlan 101
show mac address-table vlan 101
```

Après le `ping`, les tables ARP et MAC se peuplent et la découverte redevient possible.

:::danger
L'adresse choisie doit être **libre et hors de toute plage DHCP**. Un doublon sur un VLAN de production, c'est
une coupure. Et surtout : retirez cette interface quand vous avez fini. Une interface VLAN oubliée sur un
commutateur de cœur crée un chemin de routage que personne n'a décidé, et se révèle des mois plus tard, au
plus mauvais moment.
:::

## Lire l'état des ports pour trancher

À ce stade vous avez les liens. Reste à qualifier les extrémités, et `show interfaces status` en dit beaucoup
en une page :

| Ce que vous voyez | Ce que ça signifie en général |
| --- | --- |
| `connected`, 1000 full | Un équipement actif, correctement négocié |
| `connected`, 10 half | Une négociation ratée ou un câble fatigué — à noter, c'est un futur ticket |
| `notconnect` avec une description | Une prise documentée mais inoccupée : la description est une source d'information |
| `notconnect` sans description | Une prise morte, ou un poste éteint. Repassez à un autre moment |
| `err-disabled` | Un port coupé par une protection. À comprendre avant de le relever |

Ajoutez `show power inline` si vous avez du PoE : un port qui alimente 6 W porte probablement un téléphone,
un port à 15 W un point d'accès ou une caméra. C'est un indice de nature d'équipement gratuit.

## En tirer un schéma qui survivra à votre découverte

Toutes ces données ne valent que si elles sortent du terminal. Ma méthode tient en trois étapes.

**Un tableau des liens d'abord.** Une ligne par arête, cinq colonnes : équipement A, port A, équipement B,
port B, VLAN transportés. Les sorties de `show lldp neighbors detail` remplissent quatre colonnes sur cinq
automatiquement. Ce tableau est la source de vérité ; le dessin n'en est qu'une vue.

**Le dessin ensuite, et seulement les liens d'infrastructure.** Un schéma de topologie lisible montre les
commutateurs et les liaisons entre eux. Il ne montre pas les quatre-vingts postes de travail : ceux-là vivent
dans le tableau. Un schéma qu'on n'ose plus mettre à jour parce qu'il est trop chargé est un schéma mort.

**L'inventaire enfin.** Une fois le tableau stabilisé, versez-le dans un outil qui le tiendra à jour avec les
ports, les VLAN et les câbles. C'est le moment où la découverte cesse d'être un travail jetable pour devenir
de la documentation.

Une dernière chose : notez aussi ce que vous n'avez **pas** compris. Le port qui remonte huit adresses MAC sans
voisin LLDP, le VLAN déclaré partout mais sans aucun trafic, le commutateur qui apparaît chez les voisins mais
sur lequel personne n'a le mot de passe. Ces trous-là sont la partie utile de l'inventaire — ce sont eux qui
vous diront où sont les surprises le jour d'une panne.

## Pour aller plus loin

- [Reprendre la main sur un virtual chassis Alcatel OmniSwitch](/docs/reseau/reprendre-la-main-sur-un-virtual-chassis-alcatel-omniswitch/)
- [Installer NetBox pour documenter son réseau](/docs/self-hosting/installer-netbox-pour-documenter-son-reseau/)
- [Segmenter les réseaux des machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/)

<!-- source : procédure interne « Découverte réseau commutateurs », centre de documentation -->

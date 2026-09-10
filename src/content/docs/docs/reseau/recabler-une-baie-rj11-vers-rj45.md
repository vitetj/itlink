---
title: "Recâbler une baie de brassage héritée : du RJ11 téléphonique au RJ45"
description: "48 liens qui arrivent en RJ11 dans la baie et un plateau à réimplanter : le déroulé réel d'un recâblage, les deux calculs qu'on oublie toujours et le piège du câble téléphonique repris tel quel."
published: 2025-10-31
category: reseau
tags: [cablage, rj45, baie-de-brassage, brassage, chantier]
level: intermédiaire
status: à jour
featured: false
sidebar:
  label: "Recâbler une baie de brassage héritée"
---

La réimplantation d'un bureau d'études commence rarement par le réseau. On parle mobilier, îlots de six bureaux
autour d'un poteau technique, éclairage. Et puis quelqu'un ouvre la baie, et découvre que les 48 liens qui
desservent le plateau arrivent tous sur des noyaux **RJ11** — l'héritage d'une époque où ces prises portaient
des téléphones analogiques, pas des postes de travail.

Bonne nouvelle : côté plateau, le câblage est déjà en place et ne bouge pas. Le chantier est **côté baie**.
Mauvaise nouvelle : ce genre de reprise se plante toujours au même endroit, et ce n'est jamais sur la partie
réseau.

## Comprendre ce dont on hérite

RJ11 et RJ45 ne diffèrent pas seulement par la taille. Le premier est un connecteur 6 positions dont 2 à 4
contacts seulement sont câblés ; le second est un 8 positions / 8 contacts, celui qu'on appelle formellement
8P8C. Un connecteur RJ11 rentre physiquement dans une prise RJ45 — l'inverse n'est pas vrai — et c'est
exactement pour ça que ces installations mixtes survivent des années sans que personne ne s'en émeuve.

Le connecteur n'est pourtant pas la vraie question. **Ce qui compte, c'est le câble derrière le noyau.**

- Si c'est un câble à **4 paires torsadées** de catégorie 5e, 6 ou 6A, tout va bien : les paires sont là, elles
  n'ont simplement jamais été raccordées. Changer le noyau suffit.
- Si c'est un câble **téléphonique** (2 ou 3 paires, pas de torsadage régulier, écrantage absent), aucun noyau
  RJ45 ne le rendra apte à porter de l'Ethernet. Il faut retirer du câble, et le chantier change de budget et
  de calendrier.

:::caution
L'étape zéro, avant tout devis et toute commande, c'est d'ouvrir **un** noyau et de regarder ce qu'il y a
dedans. Comptez les paires, lisez le marquage sur la gaine (catégorie, AWG, année). Cinq minutes qui décident
si le chantier dure une journée ou trois semaines.
:::

## Prérequis

- Des **noyaux RJ45** (keystones) de la catégorie du câble existant, en nombre suffisant, plus une marge.
- Un **bandeau de brassage 19" 1U, 24 ports, métal, à équiper**, avec clips de maintien à l'arrière — la
  référence utilisée ici est un `GGMPANVC6A24BK`. Le modèle « à équiper » est celui qu'on veut : on y clipse
  les noyaux de son choix, on ne subit pas un pré-câblage.
- Une **pince à impacter** (type 110), une pince coupante, du velcro, une étiqueteuse.
- Un **testeur de câble** au minimum ; un certificateur si vous devez rendre un procès-verbal de recette.
- Des cordons de brassage à la bonne longueur, et pas 30 cordons de 3 m.
- Un **créneau d'arrêt** annoncé : pendant l'opération, le plateau n'a plus de réseau filaire.
- Un accord écrit avec l'intervenant sur le périmètre exact. Ici, le repassage des 48 noyaux a été confié au
  service électricité interne ; le brassage et la recette sont restés côté informatique.

## Compter avant de commander

48 liens, ce sont deux bandeaux de 24 ports. Vérifiez d'abord l'existant : dans notre cas, un bandeau RJ45
24 ports était déjà en baie et les noyaux étaient en stock, il ne manquait qu'un bandeau.

Commandez-en **un de plus que nécessaire**. Un bandeau à équiper coûte peu, ne se périme pas, et le jour où il
faut reprendre un autre local en urgence, il est déjà là. La règle vaut aussi pour les noyaux : prévoyez 10 %
de casse et de reprise, parce qu'un noyau mal impacté se remplace, il ne se répare pas.

Vérifiez enfin la place en hauteur : chaque bandeau occupe 1U, et il faut lui associer un passe-câbles 1U si
vous voulez que la baie reste présentable dans six mois. Deux bandeaux, c'est donc 4U réellement consommés.

## Repérer et étiqueter avant de démonter

C'est la partie ingrate, et c'est le vrai livrable du chantier. Un lien non identifié en baie est un lien qui
sera retiré à la main dans deux ans par quelqu'un qui n'était pas là.

1. **Photographiez** la baie avant toute intervention, face avant et face arrière.
2. Choisissez une **convention de nommage** simple, lisible sans documentation : local, poteau, numéro de prise.
   Par exemple `BE-P3-02`. Elle doit être identique sur la prise murale, sur le bandeau et dans votre tableau.
3. Étiquetez **les deux extrémités** avant de toucher au premier noyau. Un repérage fait après coup se fait à
   deux personnes avec un bipeur, et ça prend une demi-journée.
4. Tenez un **tableau de correspondance**. Ce fichier vaut plus cher que le matériel : c'est lui qu'on rouvrira
   dans trois ans.

```text title="Tableau de correspondance — une ligne par lien"
Prise murale | Bandeau/Port | VLAN prévu | Switch/Port | Testé le | Résultat
BE-P3-01     | B1 / 01      | 20         | SW1 / 01    | 30/10    | OK
BE-P3-02     | B1 / 02      | 20         | SW1 / 02    | 30/10    | OK
BE-P3-03     | B1 / 03      | 30         | SW1 / 03    | 30/10    | à reprendre (paire divisée)
```

## Reprendre les noyaux

L'opération elle-même est mécanique, mais trois détails font la différence entre un lien qui passe la recette
et un lien qui « marche à peu près ».

- **Une seule norme, partout.** T568A ou T568B, peu importe laquelle, mais la même sur toute l'installation.
  Mélanger les deux aux deux extrémités d'un lien produit un croisement que les cartes réseau modernes
  compensent silencieusement — jusqu'au jour où un équipement plus ancien ne compense plus.
- **Détorsader le moins possible.** L'usage veut qu'on reste sous 13 mm de paire détorsadée à l'arrivée dans le
  noyau. C'est ce torsadage qui tient la diaphonie, et c'est lui qu'on sacrifie quand on veut aller vite.
- **Respecter la longueur du lien.** 90 m de câble fixe entre les deux prises, 10 m de cordons au total. Un
  chantier de reprise est le bon moment pour vérifier que personne n'a rallongé un lien avec un coupleur.

Une fois les noyaux clipsés dans le bandeau, brassez : cordons rangés dans les passe-câbles, longueur adaptée
port par port, étiquette lisible sans démonter. Une baie propre n'est pas une coquetterie, c'est du temps de
diagnostic économisé.

## Tester avant de rendre le plateau

Testez **tous** les liens, pas un échantillon. Le testeur doit vous donner au minimum la cartographie des
paires (wiremap) et la continuité.

Le défaut à traquer sur une reprise de câblage téléphonique porte un nom : la **paire divisée** (split pair).
Les huit conducteurs sont bien présents et dans le bon ordre, la continuité est parfaite, le testeur d'entrée
de gamme dit « OK »… mais deux conducteurs proviennent de paires torsadées différentes. Résultat : ça
fonctionne en 100 Mbit/s, ça se dégrade en gigabit, et ça produit des « lenteurs réseau » que personne ne sait
expliquer. Seul un testeur qui mesure la diaphonie le voit.

## L'électricité, l'autre moitié du chantier

C'est là que la plupart des réimplantations dérapent, et c'est un calcul de trois lignes.

Le plateau passe de **4 à 6 bureaux par poteau technique**, mais chaque poteau n'a toujours que **4 prises de
courant**. Les bureaux font 180 cm : le poste le plus éloigné du poteau se retrouve à **540 cm**.

| Ce qu'on croit commander | Ce dont on a besoin | Pourquoi |
| --- | --- | --- |
| Une multiprise | Une rallonge dimensionnée | Une multiprise multiplie les prises, elle ne franchit pas 5 m |
| Des cordons standard | Des longueurs mesurées poste par poste | Un cordon trop court se rallonge par un adaptateur, et c'est reparti |

Une multiprise résout un problème de **nombre** ; ici, le problème est un problème de **distance**. Mesurez
depuis le poteau jusqu'au poste le plus éloigné, ajoutez la remontée dans le bureau, et commandez sur cette
base.

:::tip
Séquencez : **le réseau d'abord, l'électricité et les accessoires ensuite**. Les noyaux et le brassage
conditionnent la recette ; les rallonges et les goulottes peuvent arriver après sans bloquer la mise en
service. L'inverse fait attendre tout le monde.
:::

## Pour aller plus loin

- [Segmenter les réseaux machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/),
  parce qu'un plateau recâblé est le bon moment pour poser proprement les VLAN.
- [Dimensionner les onduleurs d'une petite salle serveur](/docs/architecture/dimensionner-les-onduleurs-dune-petite-salle-serveur/),
  l'autre chantier de baie où le calcul de départ décide de tout.
- [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/),
  pour faire valider le budget avant d'ouvrir la baie.

<!-- source : mails « Recâbler une baie RJ11 → RJ45 », chantier de réimplantation du bureau d'études, 2025-10-22 → 2025-10-31 -->

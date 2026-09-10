---
title: "Revenir à un pilote graphique antérieur et documenter un défaut de série"
description: "Des stations de travail neuves qui se figent après une mise à jour de pilote GPU. Comment constituer le dossier avant de toucher au pilote, revenir à une version connue bonne, et tenir face au support."
published: 2026-08-07
category: microsoft
tags: [nvidia, pilotes, poste-de-travail, support, windows-11]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 11]
sidebar:
  label: "Revenir à un pilote graphique…"
---

En août 2026, un lot de stations de travail mobiles neuves, équipées de GPU professionnels de dernière
génération, s'est mis à planter. Pas sous une charge extrême : dans des applications banales. Un poste isolé,
c'est un incident. Plusieurs postes du même modèle, c'est un défaut de série — encore faut-il pouvoir le
démontrer, parce que tant que ce n'est pas démontré, le constructeur traitera chaque cas comme un problème
d'environnement.

Cette page décrit les deux moitiés du travail : revenir proprement à un pilote qui fonctionne, et constituer en
parallèle le dossier qui empêchera le support de refermer le ticket.

## Prérequis

- Un compte administrateur local sur les postes concernés.
- Un partage réseau accessible aux utilisateurs, pour y déposer la version de pilote « connue bonne ».
- L'outil officiel de collecte de logs du constructeur.
- L'accord des utilisateurs pour un redémarrage : le retour arrière n'est pas transparent.

## Étape 1 — Constituer le dossier avant de toucher au pilote

C'est contre-intuitif quand on est sous pression, mais l'ordre compte. Une fois le pilote remplacé, vous ne
pouvez plus prouver grand-chose sur la version fautive.

Demandez à plusieurs utilisateurs touchés de générer les logs constructeur avec l'outil officiel. La procédure
tient en quatre lignes dans un mail, et elle doit être écrite pour quelqu'un qui n'est pas informaticien :

1. Télécharger l'outil de collecte à l'adresse indiquée.
2. Le décompresser sur le Bureau.
3. Clic droit sur l'exécutable, **Exécuter en tant qu'administrateur**.
4. Attendre quelques minutes, puis renvoyer le fichier ZIP généré dans le dossier.

En parallèle, tenez un tableau. C'est lui, plus que les logs, qui fait basculer un dossier support.

| À relever | Pourquoi |
| --- | --- |
| Modèle exact et référence du poste | Prouver que le périmètre est un modèle, pas une machine |
| Version du pilote installée au moment du plantage | Corréler avec la date de déploiement |
| Date et heure de chaque plantage | Établir une fréquence, pas une anecdote |
| Application utilisée au moment du gel | Écarter l'hypothèse « charge applicative » |
| Postes du même modèle **non** touchés | Le point le plus discuté par les supports |
| Postes d'un modèle antérieur, même image logicielle | Argument décisif : même environnement, pas de plantage |

Cette dernière ligne est celle qui a compté chez moi. Des postes de génération précédente, avec exactement le
même socle logiciel, ne présentaient aucun symptôme. Le seul facteur qui variait était le matériel et son pilote.

## Étape 2 — Identifier la version fautive et la version connue bonne

Relevez la version installée sur chaque poste. Deux commandes suffisent, l'une côté constructeur, l'autre côté
Windows :

```powershell title="Version du pilote et modèle du GPU"
nvidia-smi

Get-CimInstance Win32_VideoController |
  Select-Object Name, DriverVersion, DriverDate |
  Format-Table -AutoSize
```

Attention à la double numérotation : le constructeur du GPU communique une version de branche, Windows affiche
une version de pilote. Dans mon cas, la version fautive était la `32.0.15.9579` (branche `596.53`), et la
version connue bonne la `32.0.15.9164` (branche `591.64`). Notez les deux formes dans votre dossier support,
sans quoi vous et votre interlocuteur ne parlerez pas de la même chose.

:::tip
Dès qu'une version de pilote GPU vous a donné satisfaction pendant quelques semaines, déposez son paquet
d'installation sur un partage réseau accessible aux utilisateurs. Le jour où il faut revenir en arrière, vous
donnez un chemin exact dans le mail au lieu d'envoyer trente personnes chercher sur un site de téléchargement.
:::

## Étape 3 — Revenir en arrière proprement

Deux méthodes, et elles ne se valent pas.

### La méthode Windows, quand la version précédente est encore présente

Si le pilote a été remplacé récemment sur le poste, Windows conserve le précédent :

```text title="Gestionnaire de périphériques"
Gestionnaire de périphériques → Cartes graphiques → clic droit sur le GPU
→ Propriétés → onglet Pilote → « Revenir à la version précédente »
```

C'est rapide, mais le bouton est souvent grisé — après un nettoyage de disque, une mise à niveau de Windows ou
une installation initiale par le constructeur.

### La méthode qui fonctionne dans tous les cas : réinstallation propre

Récupérez sur le partage réseau la version connue bonne, puis, dans l'assistant d'installation du pilote :

1. Choisir **« Étapes personnalisées »** plutôt que l'installation express.
2. Cocher **« Effectuer une nouvelle installation »**.
3. Laisser l'installation aller au bout, puis **redémarrer**.

Le second point est le seul qui compte vraiment. Une installation par-dessus conserve des composants de la
version fautive, et c'est précisément ce qu'on cherche à éliminer. Une nouvelle installation efface les
réglages du pilote et repart d'un état propre.

:::caution
Prévenez les utilisateurs que les réglages personnalisés du panneau de contrôle graphique seront perdus, et que
l'écran va s'éteindre plusieurs secondes pendant l'installation. Ce n'est pas grave, mais un écran noir non
annoncé sur une station de travail neuve génère un appel paniqué à coup sûr.
:::

## Étape 4 — Vérifier et geler

Après redémarrage, contrôlez que c'est bien la version voulue qui tourne :

```powershell title="Contrôle après redémarrage"
nvidia-smi
```

Puis empêchez le pilote de se remettre à jour tout seul : désactivez la mise à jour automatique dans l'outil du
constructeur, et excluez les pilotes graphiques de vos anneaux de mise à jour tant que le dossier support est
ouvert. Un retour arrière annulé par une mise à jour nocturne est une journée perdue et un dossier support
brouillé.

## Étape 5 — Ce qu'on répond quand le support propose la réinstallation d'usine

Elle arrive toujours, elle est polie, et elle veut dire « remettez la machine dans l'état où nous l'avons
vendue ». Ce test ne prouve rien : une machine réinstallée à l'image d'usine ne porte plus l'environnement dans
lequel le défaut se produit. Si elle ne plante pas, on n'aura rien appris ; si elle plante, on aura perdu une
station pendant deux jours.

La formulation que j'utilise, et qui n'a jamais braqué personne :

> Ce test ne permettra pas de reproduire les conditions réelles d'utilisation, les dysfonctionnements
> apparaissant dans notre environnement de production.

Elle fonctionne parce qu'elle ne refuse pas de coopérer : elle refuse **ce** test-là, et elle est accompagnée
des logs, du tableau des occurrences et de la comparaison avec la génération précédente.

:::danger
Le retour arrière n'est pas toujours la fin de l'histoire. Chez moi, un poste a de nouveau planté **avec le
pilote connu bon**. C'est une information, pas un échec : elle disqualifie l'hypothèse « uniquement logicielle »
et pousse le dossier vers le matériel. Continuez à collecter les logs et ne laissez pas le ticket se refermer
parce que le symptôme s'est espacé.
:::

## Pour aller plus loin

- [DISM : sauvegarder et réinjecter les pilotes Windows](/docs/automatisation/dism-sauvegarder-et-reinjecter-les-pilotes-windows/)
- [Revenir en arrière sur un déploiement applicatif](/docs/automatisation/revenir-en-arriere-sur-un-deploiement-applicatif/)
- [Le constructeur propose de réinstaller Windows : pourquoi j'ai dit non](/blog/dell-propose-de-reinstaller-windows-pourquoi-jai-dit-non/)

<!-- source : mails de collecte de logs et fil support constructeur, 2026-08-05 → 2026-08-06 -->

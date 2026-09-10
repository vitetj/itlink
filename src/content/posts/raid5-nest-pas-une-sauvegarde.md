---
title: "Le RAID 5 n'est pas une sauvegarde (et l'onduleur n'est pas une option)"
description: "Un serveur vidéo en RAID 5 présenté comme la réponse à la perte d'images, puis deux coupures de courant en une semaine. Ce que j'ai répondu à l'intégrateur, et ce que mes sauvegardes m'ont rappelé."
published: 2024-12-13
category: humeur
tags: [raid, sauvegarde, onduleur, videosurveillance, haute-disponibilite, it-solo]
featured: false
---

Fin octobre 2024, je suis en plein projet de vidéosurveillance pour ma boîte. L'intégrateur est sérieux, le dossier est propre, et dans la discussion sur l'architecture arrive la question qui compte : que se passe-t-il si on perd des images ? La réponse tenait en deux mots : RAID 5. Le serveur d'enregistrement aurait ses disques en RAID 5, donc les données seraient protégées.

J'ai relu le mail, j'ai respiré, et j'ai écrit une réponse plus longue que prévu. La voici, à peu près, avec ce qui s'est passé ensuite.

## Ce que le RAID 5 protège, et tout ce qu'il ignore

Le RAID 5, c'est la roue de secours. Un disque meurt, la voiture continue de rouler, on remplace le disque au prochain arrêt. C'est utile, c'est même indispensable sur un serveur qui enregistre 24 heures sur 24. Mais personne n'a jamais appelé une roue de secours une assurance. Elle ne protège ni de l'accident, ni du vol, ni de l'inondation.

Pour un système de vidéosurveillance, l'accident, ce n'est pas le disque. C'est tout ce qui coupe la liaison entre la caméra et le serveur : un déni de service sur le réseau, un empoisonnement ARP, une mise à jour de firmware qui tourne mal sur une caméra ou sur un switch. Pendant ce temps, le RAID 5 est en parfaite santé et il enregistre consciencieusement... rien. C'est aussi l'orage qui grille plusieurs disques d'un coup, et là le RAID 5 ne survit pas non plus, parce qu'il est conçu pour une panne à la fois.

Donc j'ai demandé trois choses. Des sauvegardes externalisées des enregistrements, parce qu'un serveur qui brûle emporte son RAID avec lui. Un onduleur, on y revient. Et une réponse à la coupure caméra-serveur, avec deux façons d'y répondre : soit des cartes SD dans les caméras, qui enregistrent en local quand le serveur disparaît, soit un enregistrement simultané sur deux serveurs. La seconde option, c'est de la haute disponibilité au sens propre : on double les éléments critiques, serveurs, disques, RAID, licences. Ça coûte le double de ce qu'on double, et je ne décide pas avec l'argent des autres. J'ai donc demandé la haute disponibilité en option, à côté du devis de base, pour que la direction arbitre avec des chiffres et pas avec mon anxiété.

## Puis le courant a coupé. Deux fois.

Trois semaines plus tard, mi-novembre, micro-coupure électrique. Les serveurs de la salle informatique passent en protection automatique derrière leurs onduleurs, je préviens tout le monde, ça repart. Quelques jours plus tard, rebelote. Mon mail à tous commençait par « ENCORE une coupure », en majuscules, ce qui pour moi tient lieu de cri.

Pendant ce temps, l'installation vidéo existante, celle qu'on cherche justement à remplacer, c'est huit switchs en série, un câblage désorganisé, un serveur limité à trente-deux caméras, et pas un seul onduleur. Le courant coupe, les switchs tombent, et avec eux tout ce qui y est raccordé. Le système de surveillance est donc aveugle exactement au moment où il se passe quelque chose, puisqu'une coupure de courant est rarement un moment calme. Le RAID 5 du serveur, lui, n'a rien vu venir. Il n'avait rien à voir.

Dans la synthèse que j'ai envoyée à la direction le 11 décembre, l'onduleur n'était plus une ligne en bas du devis. Il était dans l'architecture : un réseau en étoile sur fibre au lieu des switchs en chaîne, la fibre protégée, un onduleur de 1,5 kW dans chaque coffret et chaque local, un serveur moderne, des caméras modernes, et l'option de doubler le serveur. Deux options chiffrées, et un post-scriptum : une partie du coût se réduit si on tire le câblage nous-mêmes. Je sais que la direction n'aime pas la longueur de mes rapports, donc il y avait un résumé en tête. Mais l'onduleur y était dans les deux options.

## Et mes propres sauvegardes ?

C'est facile de faire la leçon à un intégrateur. En décembre, la question est arrivée : jusqu'à quand peut-on restaurer un fichier ? Réponse honnête : septembre 2021, pas avant. Ce n'est pas moi qui faisais les sauvegardes avant cette date, et ce qui n'a pas été fait ne se rattrape pas. La rétention journalière, elle, est de trente jours. C'est écrit, c'est connu, et ça reste une limite qu'il faut savoir dire à voix haute plutôt que de la découvrir le jour où quelqu'un cherche un fichier de 2019.

En octobre, deux bandes LTO ont rendu l'âme sur le job hebdomadaire. Sans le rapport d'erreur, elles auraient continué à tourner dans la librairie comme si de rien n'était. Une bande morte qui ne se signale pas, c'est un morceau de plastique qui rassure. J'ai recommandé des bandes, et fixé la règle : quatre bandes par mois, plus quatre de rechange.

Ce qui me rassure vraiment, ce n'est pas le RAID, ni la bande, ni le voyant vert. C'est la restauration de septembre : une passerelle téléphonique cassée par une mise à jour, [remise en service depuis la sauvegarde du jour](/docs/virtualisation/restaurer-une-vm-cassee-par-une-mise-a-jour-non-supportee/) en un quart d'heure. Une sauvegarde qu'on a restaurée une fois vaut plus que dix RAID.

## Ce que je retiens

- Le RAID, c'est de la disponibilité. La sauvegarde, c'est de la survie. Les deux mots ne sont pas synonymes, même dans un devis.
- La bonne question à poser à un intégrateur vidéo n'est pas « combien de disques ? » mais « que se passe-t-il quand le serveur ne voit plus les caméras ? ».
- L'onduleur est le premier composant de la chaîne, pas la dernière ligne du devis. [Dimensionnez-le](/docs/architecture/dimensionner-les-onduleurs-dune-petite-salle-serveur/) avant de choisir le serveur.
- Demandez la haute disponibilité en option. La direction arbitre mieux avec deux colonnes qu'avec un discours.
- Testez une restauration. Puis une deuxième. Et sachez dire jusqu'où vous pouvez remonter, avant qu'on vous le demande.

Le RAID 5, c'est la roue de secours. Tout le monde le sait. Sauf, apparemment, sur les devis.

<!-- source : fil « zone de protection » avec l'intégrateur vidéosurveillance, 2024-10-25 ; mails à tous sur les coupures électriques, 2024-11-19 → 2024-11-22 ; synthèse vidéoprotection à la direction, 2024-12-11 ; échange sur la rétention des sauvegardes, décembre 2024 -->

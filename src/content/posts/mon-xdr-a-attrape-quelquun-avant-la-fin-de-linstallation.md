---
title: "Mon XDR a attrapé quelqu'un avant même la fin de l'installation"
description: "Le chantier n'était pas terminé, tous les flux n'étaient pas branchés, et la console a signalé une tentative de connexion avec des identifiants par défaut. Ce que ça m'a appris sur la vraie mesure de sécurité."
published: 2025-10-24
category: retex
tags: [xdr, soc, detection, mots-de-passe, docker, pme]
featured: true
---

Il y a des projets qu'on défend difficilement devant une direction, parce que leur réussite ne se voit pas. Un XDR
adossé à un SOC managé, c'est exactement ça : on paie tous les mois pour que quelqu'un regarde des journaux
d'événements, et le meilleur résultat possible est qu'il ne se passe rien. J'avais préparé mes arguments, mes
analogies et ma diapositive sur le coût d'une rançon.

Je n'ai pas eu besoin de m'en servir. La première détection est arrivée pendant l'installation.

## Ce qu'on achète vraiment quand on achète un XDR

Le principe est simple à raconter : une machine chez nous collecte les journaux de l'infrastructure, les met en
forme, et les envoie à une console où des analystes regardent, 24 heures sur 24, ce qui ressemble à une anomalie.
Chez nous, ce collecteur est une VM Ubuntu 24.04 LTS avec Docker, montée pour l'occasion.

Ce qu'on n'achète pas, c'est la partie magique. J'ai passé l'essentiel du chantier à faire une chose peu
glorieuse : rendre les journaux compréhensibles. Chaque équipement parle son propre patois, et personne ne
normalise rien. Il faut donc écrire ce que la console appelle des *intakes*, c'est-à-dire des analyseurs qui
découpent une ligne de texte en champs exploitables. J'ai livré chaque fichier en deux versions, une en Grok et une
en expressions régulières, parce qu'on ne savait pas encore laquelle passerait.

Bien m'en a pris : la conversion depuis le format XML vers l'interface graphique se supprimait toute seule côté
console. Un bug, découvert en route, que personne n'avait annoncé. On a contourné en intégrant directement les
expressions régulières côté collecteur. Ajoutez le classique du genre — le prestataire attendait une VM avec un
disque système séparé du disque de données, j'avais provisionné un disque unique — et vous avez le portrait fidèle
d'un déploiement de sécurité en PME : 80 % de plomberie, 20 % de sécurité.

C'est important de le dire, parce que les plaquettes commerciales décrivent l'inverse.

## L'alerte est arrivée avant la fin du chantier

Le collecteur tournait, une partie des flux seulement était branchée, et la mise en production officielle était
prévue pour les jours suivants. C'est à ce moment-là que la console a levé une alerte.

Quelqu'un tentait de se connecter en ligne de commande au pare-feu avec les **identifiants par défaut
d'installation**. Ceux du manuel. Ceux que tout le monde connaît, parce qu'ils sont dans une documentation publique
et dans une dizaine de dépôts sur Internet.

La tentative a échoué. Elle a échoué pour une raison, et une seule : ces identifiants avaient été changés à
l'installation de l'équipement.

Je veux insister sur ce point, parce que c'est là que la plupart des retours d'expérience mentent par omission.
**Mon XDR n'a rien bloqué ce jour-là.** Il n'a pas sauvé l'entreprise, il n'a pas coupé une session, il n'a pas
joué les héros. Il m'a montré quelque chose que je ne voyais pas : que la porte était testée. La mesure de sécurité
qui a réellement fonctionné coûtait zéro euro et avait été prise des mois plus tôt, en dix minutes, par quelqu'un
qui a pris la peine de changer un mot de passe par défaut avant de brancher un câble.

Le XDR, lui, a fait exactement son travail : transformer un non-événement invisible en information.

## Ce que ça change dans une PME

Avant, ma posture de sécurité tenait dans une phrase que je n'aimais pas prononcer : « à ma connaissance, il ne
s'est rien passé ». À ma connaissance. C'est-à-dire : quand j'ai regardé, et j'ai regardé quand j'avais le temps,
c'est-à-dire rarement, parce que je suis aussi celui qui rebranche les câbles HDMI de la salle de réunion.

Un SOC managé ne me rend pas plus compétent. Il me rend présent la nuit, le dimanche, et pendant les réunions. Dans
un service informatique d'une personne, ce n'est pas un luxe, c'est la seule façon d'avoir une détection qui ne
dépende pas de ma disponibilité. Et le jour où je pars en congé, elle continue de tourner sans moi — ce qui, quand
on est seul, est un argument au moins aussi fort que la technique.

Ça ne dispense de rien. Un XDR posé sur une infrastructure aux identifiants par défaut ne bloquerait pas
l'intrusion : il la documenterait très bien, avec des graphiques. Ce n'est pas la même prestation.

## Ce que je referais dans le même ordre

- **Changer les identifiants par défaut le jour de l'installation**, avant la mise en service, y compris sur les
  équipements « qui ne sont pas exposés ». C'est la seule mesure de cette histoire qui a arrêté quelque chose.
- **Une personne, un compte**, y compris sur les équipements réseau et les appliances. Un compte partagé qu'on ne
  peut pas révoquer, c'est une identité que personne n'assume.
- **Écrire la liste des flux réellement branchés** au collecteur, et la tenir à jour. Croire qu'on est couvert
  parce qu'un projet est « en production » est le plus court chemin vers une fausse tranquillité.
- **Prévoir le temps de parsing dans le planning.** Pas le temps d'installation : le temps de parsing. Ce n'est pas
  la même unité de mesure.

Le XDR est passé en production quelques jours plus tard, avec la protection mobile et le filtrage du courrier qui
ont suivi. Personne ne m'a demandé de justifier la ligne budgétaire. La console l'avait fait à ma place, avant même
que je finisse de la brancher.

Je n'ai toujours pas montré ma diapositive.

<!-- source : fil « le XDR porte déjà ses fruits » et mise en production du concentrateur de logs, octobre 2025 -->

---
title: "Le constructeur propose de réinstaller Windows : pourquoi j'ai dit non"
description: "Des stations neuves qui se figent, même dans le Bloc-notes. Le support propose une réinstallation propre. J'ai refusé, et j'ai envoyé des logs et des horodatages à la place. Récit d'une escalade tenue par écrit."
published: 2026-08-06
category: humeur
tags: [dell, support, nvidia, escalade, poste-de-travail]
featured: false
---

Il y a un moment, dans toute escalade avec un support constructeur, où la proposition arrive. Elle est toujours formulée poliment, elle est toujours raisonnable sur le papier, et elle veut toujours dire la même chose : « et si vous remettiez la machine dans l'état où nous l'avons vendue ? »

Cette fois, c'était en août. Des stations Dell de dernière génération, achetées pour les automaticiens, qui se figent. Pas sous une charge délirante, pas pendant un calcul : dans le Bloc-notes. Le curseur s'arrête, la machine ne répond plus, on redémarre. Les modèles précédents, avec exactement le même environnement logiciel, ne bronchent pas.

Et donc, à l'étape trois du dossier : « pourriez-vous réinstaller l'image Windows d'origine pour vérifier si le problème persiste ? »

J'ai dit non. Voilà pourquoi, et voilà ce que j'ai proposé à la place — parce que refuser sans rien apporter, ce n'est pas de la rigueur, c'est de l'obstruction.

## Pourquoi ce test ne prouve rien

Réinstaller une image nue, c'est retirer précisément ce qui distingue une machine de production d'une machine de vitrine. Sur ces postes, il y a un environnement d'automatisme complet : ateliers logiciels constructeur, pilotes de communication, agent de sécurité, agent réseau, suite bureautique, périphériques industriels. Ce n'est pas de l'encombrement, c'est le métier de la machine.

Un poste réinstallé qui ne plante pas pendant quarante-huit heures ne dit rien de rassurant. Il dit que le problème ne se manifeste pas dans un environnement où l'utilisateur ne peut pas travailler. On appelle ça un test non représentatif, et un support le sait très bien : c'est un moyen honnête de faire avancer un dossier quand on soupçonne une couche logicielle tierce.

Sauf que dans ce cas précis, l'hypothèse ne tenait pas. Le même environnement, déployé de la même façon, tourne sans incident sur la génération de matériel précédente. La variable qui change n'est pas le logiciel : c'est la machine. Le test proposé écartait la seule variable pertinente.

Et il y a le coût. Une réinstallation, ce n'est pas une case à cocher : c'est une journée de remise en état par poste, sur des machines dont les utilisateurs sont déjà en train de perdre du temps. Multiplié par le nombre de postes concernés, on parle de plusieurs jours d'un service informatique qui, chez moi, tient en une personne. Je ne dépense pas cette monnaie-là pour produire un résultat qui n'apprendra rien.

## Ce que j'ai envoyé à la place

Refuser un test, c'est acceptable à une condition : rendre le dossier plus facile à traiter qu'il ne l'était avant votre refus. J'ai donc répondu avec trois choses.

**Les logs officiels du constructeur.** Dell fournit un collecteur, l'ATS Log Collector : on le télécharge, on le décompresse sur le Bureau, on l'exécute en tant qu'administrateur, on attend, et il produit une archive qu'on dépose sur le portail. C'est un peu lent et ça donne exactement ce que le niveau 3 veut voir. Utilisez leurs outils : un support qui reçoit ses propres formats avance plus vite qu'un support à qui vous envoyez votre analyse.

**Des horodatages.** Chaque figeage noté à la minute près, avec les applications ouvertes à ce moment-là. « Crash à 9 h 52, trois fenêtres de l'atelier logiciel et un navigateur ouverts. » Ce n'est pas glorieux, c'est du relevé de terrain, et c'est ce qui transforme « ça plante souvent » en série exploitable. Un support ne peut rien faire d'un ressenti ; il peut corréler des heures avec des événements système.

**Un point de départ non négociable, dit dès le premier message.** Ces postes tournent sur l'image d'usine du constructeur. Pas de remasterisation, pas d'image maison, pas de bricolage de pilotes. Je le précise systématiquement à l'ouverture d'un dossier, parce que ça retire d'emblée la moitié des hypothèses côté support et parce que ça donne du poids au reste : quand je dis que je n'ai pas touché aux pilotes graphiques, c'est vérifiable.

J'ai aussi proposé ce que je pouvais offrir sans casser la production : les rapports de plantage, un accès distant sur une machine qui reproduit le symptôme, et un poste dédié aux tests si le niveau 3 voulait faire des essais destructifs. Pas la flotte entière — un poste.

## La réponse, et ce qu'elle a coûté

Le niveau 3 est revenu avec une préconisation précise : redescendre le pilote graphique NVIDIA d'une version, de la 32.0.15.9579 à la 32.0.15.9164, en passant par le catalogue du constructeur. Puis surveiller quarante-huit à soixante-douze heures.

C'est exactement le genre de réponse qu'on n'obtient pas en réinstallant Windows. On l'obtient parce que quelqu'un, en face, a pu croiser des journaux avec des horodatages et remonter jusqu'à un composant. Le fait que la génération précédente ne soit pas affectée cadre parfaitement avec une régression de pilote sur une puce plus récente.

Je ne vais pas faire de fin héroïque : à l'heure où j'écris, la surveillance est en cours et je ne sais pas encore si c'est réglé. Il faudra peut-être un autre aller-retour. Mais le dossier a une piste technique, un historique par machine, et des mesures. Il n'a pas six postes réinstallés et un « on ne comprend toujours pas ».

## Ce que je retiens

**Un refus ne se négocie qu'avec des données.** « Non » tout court, c'est un client difficile. « Non, parce que le test écarte la seule variable qui change, et voici les logs, les horodatages et un accès distant », c'est un interlocuteur technique. La différence tient dans le paragraphe qui suit le refus.

**Dites d'où vous partez, dès le premier message.** Image d'usine, aucune modification de pilote, environnement identique à celui qui fonctionne sur l'ancienne génération. Trois lignes qui économisent trois échanges.

**Tenez un historique par machine, pas par dossier.** Les dossiers de support se ferment, se rouvrent, changent de niveau. La machine, elle, reste. Un fichier par poste avec les dates, les symptômes et les actions, c'est ce qui vous permet de dire « troisième occurrence sur cette référence » avec autorité — et, le jour venu, d'argumenter un remplacement.

**Le temps du service informatique est un coût réel.** Quand on est seul, chaque test inutile se paie sur autre chose : une sauvegarde qu'on ne vérifie pas, une mise à jour qu'on repousse. Refuser un test non représentatif, ce n'est pas de l'ego, c'est de l'arbitrage.

Un support constructeur n'est pas un adversaire. C'est un partenaire à qui on donne, ou pas, les moyens de faire son travail. Le jour où il vous propose la solution facile, la bonne réponse n'est pas de céder ni de s'énerver : c'est de rendre la solution difficile plus attractive que la facile.

<!-- source : mails « Stations qui se figent – escalade support » 2026-08-05 → 2026-08-06 -->

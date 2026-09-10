---
title: "J'ai interdit WeTransfer, et voici ce qui s'est passé"
description: "En juillet 2025, j'ai banni WeTransfer de ma boîte à cause d'une clause sur l'entraînement d'IA. Un an après, il a fallu le rappeler. Retour sur une interdiction, ses alternatives et ce qu'elle a vraiment changé."
published: 2026-07-25
category: dsi
tags: [wetransfer, rgpd, transfert-de-fichiers, gouvernance, communication, ia]
featured: false
---

Le 15 juillet 2025, j'ai envoyé un mail à toute la boîte, en français et en anglais, avec un titre qui ne laissait pas de place au doute : fin de l'utilisation de WeTransfer. Un an plus tard, en juillet 2026, j'ai renvoyé un rappel. Entre les deux, j'ai appris des choses sur les habitudes, sur les outils, et sur ce que vaut une règle quand on n'est pas là pour la répéter.

## Pourquoi interdire un outil que tout le monde adore

WeTransfer est génial. C'est précisément le problème. Un lien, un glisser-déposer, pas de compte à créer, et ça marche chez le client comme chez le fournisseur. Dans une PME industrielle, ce qui transite par là, ce sont des plans de machines, des devis, des fichiers de production, parfois un carnet d'adresses. Ce n'est pas anodin.

Ce qui a déclenché la décision, c'est une mise à jour des conditions d'utilisation autorisant l'éditeur à exploiter les fichiers transférés pour entraîner des modèles d'intelligence artificielle. Que la clause ait ensuite été reformulée ou non, peu importe : le jour où je l'ai lue, j'ai compris que je ne savais pas ce qu'il advenait de nos fichiers une fois déposés, et que personne dans la boîte ne le savait non plus.

Côté RGPD, un fichier qui contient des données personnelles ne peut pas partir vers un service dont on ne maîtrise ni l'usage ni la localisation. Côté propriété industrielle, c'est encore plus simple : un plan de machine n'a rien à faire dans le corpus d'entraînement de qui que ce soit. L'image que j'utilise depuis pour l'expliquer : vous ne laisseriez pas les plans de la prochaine machine sur une table de café en partant, même si le café est très bien tenu.

## Ce que j'ai mis à la place

Interdire sans alternative, c'est garantir le contournement. Le mail proposait trois options, par ordre de préférence :

1. Notre propre instance de transfert de fichiers, auto-hébergée : chiffrement de bout en bout, suppression automatique au bout de 14 jours, hébergement en France. Même usage que WeTransfer, un lien et un glisser-déposer. La différence, c'est que le serveur est à nous et que le fichier disparaît tout seul.
2. SwissTransfer, pour les cas où l'outil interne ne convient pas.
3. SharePoint et OneDrive, avec un partage à durée limitée, pour tout ce qui est interne ou destiné à des partenaires réguliers.

Et puis le domaine WeTransfer a été bloqué. Sans ça, le mail aurait été un vœu pieux, et j'en ai écrit assez pour le savoir.

## La structure du mail, parce que c'est ce qui a marché

J'ai réutilisé exactement la même trame un an plus tard pour la charte d'utilisation des outils d'IA et pour un rappel sur les adresses IP privées, à destination de tous les sites, en trois langues. Elle tient en cinq points :

- Le constat, en une phrase : le risque concret, pas le paragraphe juridique.
- La règle, en gras. Ce qui est interdit, ce qui est autorisé.
- Les alternatives, avec les liens internes, prêtes à l'emploi le jour même.
- Le processus de demande : les besoins particuliers remontent par le chef de service, pas en direct, sinon je reçois trente mails identiques.
- La version anglaise en dessous, la date d'application, un contact.

Le point qui change tout, c'est le deuxième. Une règle qu'il faut chercher dans le texte n'est pas une règle. Une règle en gras, encadrée par un constat et une alternative, se lit en dix secondes, et dix secondes, c'est à peu près le temps qu'un mail de l'informatique obtient de ses lecteurs.

## Ce qui s'est passé vraiment

Ce que je peux dire honnêtement tient en une ligne : un an plus tard, il a fallu renvoyer un rappel. Je n'ai pas de statistiques, mais je devine les mécanismes, parce que ce sont toujours les mêmes : le réflexe qui revient quand un client envoie lui-même un lien WeTransfer et qu'on lui répond avec le même outil ; le nouveau collègue à qui personne n'a transmis la consigne ; l'ordinateur personnel sur lequel le domaine n'est pas bloqué. Aucun de ces cas n'est une rébellion. Ce sont des habitudes, et une habitude ne se supprime pas par mail, elle se remplace.

Au passage, la question « où vont nos fichiers » ne se pose pas qu'avec WeTransfer. Depuis, quand je mets un collègue du site américain en copie d'un mail qui contient des données, j'ajoute un petit disclaimer RGPD ironique, façon « Cloud Act compliant ». Ça fait sourire, et c'est le but : une règle dont on se souvient parce qu'elle a fait rire vaut mieux qu'une règle oubliée parce qu'elle était sérieuse.

## Ce que j'en retiens

- Une règle sans blocage technique est une suggestion.
- Une règle sans alternative est un contournement en préparation.
- Une règle sans rappel annuel est un souvenir.
- Une alternative doit être aussi simple que l'outil interdit, sinon c'est l'alternative qui sera contournée, pas l'interdiction.

Et si vous vous demandez ce qui m'a coûté le plus cher dans cette histoire, ce n'est pas l'instance auto-hébergée. C'est d'expliquer à des gens raisonnables pourquoi un outil qui marche parfaitement est précisément celui qu'il faut abandonner. WeTransfer n'a jamais été le problème. Le problème, c'est qu'il était trop bien pour qu'on se pose la question.

<!-- source : mail « Fin de l'utilisation de WeTransfer », 2025-07-15 ; rappels et communications de gouvernance (charte IA, adresses IP), 2026-07-21 → 2026-07-22 -->

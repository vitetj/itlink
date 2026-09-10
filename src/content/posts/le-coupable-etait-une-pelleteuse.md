---
title: "Le coupable était une pelleteuse"
description: "Un matin de janvier, plus d'Internet, plus de messagerie, plus rien. J'ai d'abord soupçonné mon propre réseau. La cause était dehors, sous une pelle mécanique. Anatomie d'une coupure fibre et de ce qu'elle a changé."
published: 2026-01-22
category: retex
tags: [fibre, reseau, incident, continuite-activite, operateur, communication]
featured: false
---

Il y a deux façons de commencer une journée quand on est le service informatique à soi tout seul. La bonne commence par un café. La mauvaise commence par trois personnes debout devant la porte du bureau, qui n'ont pas eu besoin de se concerter pour arriver en même temps. Ce matin-là, c'était la mauvaise. Plus d'Internet, plus de messagerie, plus d'accès aux applications hébergées à l'extérieur. Dans une PME industrielle, un lien vers le monde qui tombe, ce n'est pas une gêne : c'est un arrêt.

## Le premier suspect, c'est toujours moi

Quand tout tombe en même temps, le premier réflexe honnête n'est pas de chercher un coupable dehors. C'est de se demander ce qu'on a touché la veille. Une règle de pare-feu modifiée en fin de journée, une mise à jour appliquée le soir, un certificat qui expire à minuit pile parce que les certificats ont le sens du spectacle. Je liste ce que j'ai changé dans les vingt-quatre dernières heures.

Ce n'est pas de la culpabilité, c'est de la statistique. La majorité des pannes ont pour origine un changement récent, et dans une DSI d'une personne, le changement récent, c'est moi. Autant commencer par la piste la plus probable, surtout que c'est la seule sur laquelle j'ai un pouvoir immédiat.

Deuxième suspect classique : un service extérieur en panne. Un hébergeur, une plateforme, un fournisseur. Sauf que là, tout tombait : les applications externes, la navigation, la résolution de noms, et jusqu'au simple ping vers une adresse publique. Quand plus rien ne sort, y compris ce qui n'a aucune raison de dépendre du même prestataire, ce n'est plus un service en panne. C'est le tuyau.

Le test qui tranche en trente secondes, et que je recommande à tout le monde : sortir du réseau. On prend un smartphone en 4G, hors Wi-Fi, et on ouvre la même application. Si elle répond, le problème est chez nous, entre le poste et la sortie. Si elle répond partout sauf depuis les postes, on vient de diviser le champ d'enquête par dix.

## Ce que disent les indicateurs, et ce qu'ils ne disent pas

Côté réseau interne, tout était normal. Les commutateurs, l'infrastructure virtualisée, les serveurs de fichiers, l'annuaire : rien à signaler. La panne s'arrêtait proprement à la frontière.

Côté sortie, en revanche, le lien n'était pas dégradé, il était mort. Pas de latence, pas de perte de paquets, pas de lenteur : rien du tout. C'est une distinction que je trouve utile à expliquer aux collègues, parce qu'elle change tout. Un lien lent, on le diagnostique, on cherche une saturation, un flux qui déborde. Un lien absent, il n'y a rien à diagnostiquer. Une fibre qui ne reçoit plus de lumière ne se répare pas avec une ligne de configuration.

À ce stade, l'enquête bute sur une limite qu'aucun outil ne franchit : mes indicateurs s'arrêtent au boîtier de terminaison optique. Au-delà, je n'ai plus de capteur. Mon seul instrument de mesure, c'est un interlocuteur au téléphone chez l'opérateur. C'est la vraie leçon de ce genre d'incident : le point où votre supervision s'arrête est un point d'architecture, pas un détail technique. Vous savez tout de ce que vous possédez et rien de ce dont vous dépendez.

Un mot sur le secours. Nous avions un accès de secours en 4G, et il faut être clair sur ce que ça vaut. Un secours mobile, ce n'est pas une seconde ligne, c'est un canot de sauvetage. On maintient la messagerie, on prévient les clients, on reste joignable. On ne fait pas tourner une entreprise avec. Le confondre avec de la haute disponibilité, c'est se raconter une histoire.

## Remonter à la cause réelle

L'appel à l'opérateur, c'est une compétence en soi. Ce qui accélère les choses, dans l'ordre : la référence exacte du lien, l'heure précise de la perte de signal, et la liste de ce qui a déjà été vérifié de mon côté. « Ça ne marche pas » vous met dans une file d'attente. « Perte de porteuse sur ce lien à telle heure, LAN sain, aucun changement de configuration » vous met en face de quelqu'un qui va regarder.

Le premier retour a été celui qu'on redoute : rien à signaler sur les équipements. Puis, plus tard dans la journée, la vraie réponse est arrivée. Une fibre sectionnée sur le domaine public, à quelques centaines de mètres, sur un chantier de voirie. Une pelle mécanique, un godet, un fourreau que personne n'avait vu venir.

Il n'y avait aucune commande à taper. Aucun journal à lire. La cause était dans un trou, et le correctif dans une nacelle. Le rétablissement s'est fait par reroutage de la connexion sur une autre fibre : pas une réparation, un contournement. Le brin coupé serait ressoudé plus tard, mais le trafic est reparti par un autre chemin, ce qui est exactement ce qu'on demande à un opérateur un jour comme celui-là.

## Le mail de clôture, et ce que j'ai mis en place après

J'ai clos l'incident par un mail à toute l'entreprise, en français et en anglais, avec les deux sites. J'y ai écrit qu'après une enquête approfondie digne d'une série policière, le coupable avait été identifié : une pelleteuse un peu trop curieuse. Et que celle-ci était désormais tenue à bonne distance des câbles.

Ce n'est pas de la légèreté déplacée. Les gens venaient de perdre une bonne partie de leur journée. Un mail qui leur parle de reroutage sur un lien de collecte alternatif ne les console pas et ne leur apprend rien. Ils ont besoin de trois informations : c'est terminé, ce n'est pas votre ordinateur, et voilà pourquoi. L'humour sert à faire passer la troisième. C'est le même principe que celui que j'applique à toutes mes [communications informatiques](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/) : un constat court, une explication imagée, une conclusion nette.

Ensuite, trois chantiers, dans cet ordre.

Le secours, d'abord. Deux questions seulement : est-ce qu'il bascule tout seul, et quand l'a-t-on testé pour la dernière fois ? Un lien de secours jamais éprouvé n'est pas un lien de secours, c'est une hypothèse posée sur une facture. Le test se fait hors production, en coupant volontairement le lien principal, et ce qui compte n'est pas ce qui repart : c'est ce qui ne repart pas. La téléphonie, les tunnels dont l'adresse publique change, les services qui filtrent sur une adresse source. J'ai détaillé cette bascule dans une [fiche dédiée](/docs/reseau/unifi-udm-wan-de-secours-et-bascule-4g-vers-fibre/).

La procédure, ensuite. Qui appeler, dans quel ordre, avec quelles informations, et un modèle de mail bilingue prêt à envoyer. Le jour de l'incident, j'ai improvisé une communication correcte parce que j'étais là. La question qui compte est celle du jour où je n'y suis pas, et elle a sa propre [procédure](/docs/dsi/procedure-de-remplacement-it-pendant-une-absence/).

L'architecture, enfin. Cet incident a nourri le dossier réseau de l'année. Une entreprise internationale dont toute la connectivité repose sur un seul brin de verre enterré sous une route n'a pas un problème d'opérateur : elle a un problème de conception. C'est l'un des arguments qui a fini par convaincre la direction de financer la [refonte du réseau](/blog/du-mpls-au-sase-ce-que-personne-ne-vous-dit/).

La pelleteuse, elle, n'a rien appris. C'est le seul acteur de cette histoire qui recommencera exactement à l'identique, ailleurs, chez quelqu'un d'autre. C'est bien pour ça qu'on écrit des procédures : elles ne s'adressent pas au hasard, elles s'adressent à nous, la prochaine fois qu'il passe.

<!-- source : rapport « Éléments envoyés 2026-01-01 → 2026-04-01 », coupure fibre et communication de clôture bilingue, 2026-01-16 -->

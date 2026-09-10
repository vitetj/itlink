---
title: "J'avais prévenu en 2024 : vivre avec une dette technique qu'on ne vous laisse pas rembourser"
description: "Une alerte écrite en juin 2024, deux pannes en juillet et août 2026, et la même conclusion : le problème n'est pas technique, il est en ressources. Ce que j'ai appris à faire d'une alerte qui n'a pas été suivie."
published: 2026-08-07
category: humeur
tags: [dette-technique, vba, vbscript, dsi, ressources, alerte]
featured: false
---

En juin 2024, j'ai écrit à ma direction que la fin annoncée de VBA et le durcissement des macros allaient nous
tomber dessus, et j'ai donné un horizon. Le mail était court, argumenté, sans dramatisation. Il n'a produit
aucune réaction, et je veux être clair sur un point dès le premier paragraphe : c'était la réaction normale.

Rien n'était cassé. Une alerte sans panne, c'est une opinion. Elle arrive au milieu de quarante autres sujets,
tous portés par quelqu'un qui a lui aussi de bonnes raisons, et elle n'a pas de date. Je n'ai pas été ignoré,
j'ai été correctement priorisé — c'est-à-dire pas.

## Deux ans plus tard, la facture arrive un vendredi matin

Le 10 juillet 2026, une feuille de calcul du bureau d'études a cessé de fonctionner au moment où les gens
arrivaient. Le durcissement d'ActiveX était passé par là. J'ai trouvé un contournement en deux heures
d'investigation, et j'ai renvoyé l'alerte, cette fois avec une panne en pièce jointe.

Le 4 août, deuxième épisode : l'installateur d'un logiciel d'automatisme refusait de s'installer sur un poste
en Windows 11 25H2. Cause identique dans son principe, brique différente : VBScript n'est plus livré avec cette
version de Windows. Testé sur plusieurs postes, même résultat. Les options réelles tenaient en deux lignes :
attendre un correctif de l'éditeur, ou rester temporairement sur une version antérieure de Windows. Aucun
contournement propre.

Ce que j'ai écrit ce jour-là est la seule phrase de tout ce dossier que je referais mot pour mot : ce qui s'est
produit est probablement le début d'une série d'incidents similaires, nous avons eu la chance de pouvoir
contourner cette fois, et il ne faut pas compter sur cette possibilité à chaque évolution de l'éditeur.

Un contournement n'est pas une solution. C'est un délai qu'on s'accorde, et il faut dire à voix haute qu'on
vient d'en consommer un.

## Le vrai sujet n'était pas technique

Voici où j'ai changé d'approche, et c'est tout l'objet de ce billet.

Pendant deux ans, j'ai présenté ce dossier comme un problème technique : des technologies en fin de vie, des
outils métier à réécrire, un inventaire à faire. Formulé ainsi, il atterrit sur le bureau de celui qui l'a
soulevé. C'est-à-dire moi, entre deux tickets.

En juillet 2026, je l'ai reformulé autrement, et je l'ai écrit noir sur blanc : le sujet est surtout
organisationnel. Il ne s'agit pas d'un problème technique ponctuel, mais d'un besoin de ressources. Je n'ai pas
le temps de mener ce chantier en parallèle du support quotidien.

La différence entre les deux formulations n'est pas rhétorique. Un problème technique se délègue implicitement à
l'informatique et disparaît de l'ordre du jour. Un besoin de ressources est un arbitrage, et un arbitrage
appartient à la direction. Ce n'est pas une façon de renvoyer la balle : c'est simplement mettre la décision là
où elle peut être prise. Personne d'autre que moi ne pouvait faire le diagnostic ; personne d'autre que la
direction ne pouvait décider d'y affecter du temps.

Tant que je disais « il faudrait migrer », je décrivais une tâche. Le jour où j'ai dit « ce chantier existe, il
n'est affecté à personne, et je ne peux pas l'absorber », j'ai décrit un choix.

## Ce que ça change de garder ses mails

Ressortir un mail de 2024 est un geste délicat. Mal fait, c'est un « je vous l'avais bien dit » qui ferme la
conversation et transforme un dossier technique en règlement de comptes. Personne ne finance un projet porté par
quelqu'un qui vient de faire la démonstration qu'il avait raison contre tout le monde.

Ma règle est donc simple : l'ancien mail sert à établir une chronologie, pas à désigner un coupable. Il vient
en pièce jointe, sans commentaire, avec une seule fonction — montrer que le sujet a une histoire, qu'il n'est
pas né de la panne du matin, et que la prochaine échéance est déjà connue.

Et je documente désormais mes alertes pour qu'elles survivent à leur propre indifférence :

**Une alerte sans date d'impact n'est pas une alerte.** « À terme » ne déclenche rien. « Cette version de Windows
ne contient plus la brique, et notre parc y passe l'an prochain » déclenche quelque chose.

**Un inventaire vaut mieux qu'un avertissement.** La liste des outils métier qui dépendent de VBA, d'ActiveX ou
de VBScript est un document court, factuel, difficile à ranger dans un tiroir. Une inquiétude, non.

**Chaque contournement est consigné.** Deux heures ici, une demi-journée là. Mises bout à bout, ces heures sont
exactement le budget qu'on ne veut pas dépenser en une fois pour régler le fond.

**On propose une cible, pas un cri.** Chez nous, la direction à prendre est claire : sortir la logique des
fichiers bureautiques vers des applications web indépendantes du poste, et remplacer les scripts VBA par du
PowerShell là où c'est de l'automatisation pure. Une migration a déjà été faite ainsi sur un outil documentaire,
et elle sert de référence : ce n'est plus une théorie, c'est un précédent maison.

## Là où j'en suis

Le dossier a fini par obtenir quelque chose : un engagement à écrire un cahier des charges. Ce n'est pas une
équipe, ce n'est pas un budget, et ça n'a pas rendu mes vendredis plus calmes. Mais un cahier des charges, c'est
un document qui existe, avec un auteur et une date, et qui rend le sujet beaucoup plus difficile à oublier que
mon mail de juin 2024.

Je n'ai aucune amertume à raconter cette histoire, et ce n'est pas une critique de qui que ce soit. Le mécanisme
est le même partout : ce qui n'est pas cassé ne passe pas devant ce qui est cassé, et un service informatique de
petite taille passe ses journées dans ce qui est cassé. La seule chose qu'on maîtrise vraiment, c'est la forme
de l'alerte — datée, chiffrée, inventoriée, et formulée comme un arbitrage plutôt que comme une tâche.

Le reste, on l'archive. Et on le ressort deux ans plus tard, sans triomphalisme, parce qu'entre-temps il est
devenu vrai.

<!-- source : fil « Alerte – Les feuilles de calcul VBA arrivent en fin de vie », 2026-07-10 → 2026-08-04, et rappel de l'alerte de 2024 -->

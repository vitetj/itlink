---
title: "Shadow IT : dire non sans se faire détester"
description: "Un outil non validé installé pour un usage personnel, une messagerie grand public devenue canal métier. Refuser ne suffit pas : ce qui compte, c'est la demande qui se cache derrière l'outil."
published: 2026-06-08
category: dsi
tags: [shadow-it, gouvernance, charte, sensibilisation, communication]
featured: false
---

Le 1er juin, on me demande l'autorisation d'installer un petit outil sur un poste de travail. Rien de sulfureux : il servait à suivre une compétition sportive qui commençait dans quelques semaines. Un exécutable, gratuit, trouvé en ligne, qui affiche des résultats dans un coin de l'écran.

J'ai dit non. Et j'ai passé plus de temps à écrire le refus qu'il n'en aurait fallu pour installer le truc.

C'est en écrivant ce mail que j'ai compris que je faisais ce même exercice tous les mois, avec des enjeux très variables, et que j'avais fini par en avoir une méthode. La voici, avec ses ratés.

## Le vrai risque n'est pas celui qu'on croit

Quand on refuse un outil, la tentation est de brandir le risque maximal : « et si c'était un logiciel malveillant ? ». C'est souvent vrai, c'est toujours mal reçu, parce que la personne en face sait très bien qu'elle n'a pas téléchargé un virus exprès, et qu'on vient implicitement de la traiter d'imprudente.

Le risque réel est plus prosaïque, et il est bien plus facile à expliquer.

Un binaire installé hors du circuit, c'est un logiciel que personne ne mettra à jour. Il vivra deux ans sur ce poste, avec ses failles de l'année dernière, et il ne figurera dans aucun inventaire le jour où l'éditeur annoncera une vulnérabilité. C'est aussi un logiciel dont personne n'a lu les conditions d'utilisation : sur les petits utilitaires gratuits, le modèle économique est rarement la générosité. Et c'est un logiciel que la protection du poste va peut-être bloquer un matin, sans prévenir, en plein milieu d'autre chose.

Je résume désormais tout ça en une phrase, et c'est celle que je mets dans mes refus : **ce n'est pas ce que fait le logiciel qui me pose problème, c'est que personne ne saura qu'il est là dans deux ans.**

## La méthode en quatre temps

Elle tient sur un demi-écran, et elle m'a évité beaucoup d'inimitiés.

**1. Écouter la demande, pas l'outil.** Quelqu'un qui demande un utilitaire ne demande jamais un utilitaire. Il demande un résultat. Suivre des scores, transférer un fichier de deux gigaoctets, prendre la main sur le poste d'un collègue, filtrer des appels indésirables. Si vous refusez l'outil sans jamais nommer le besoin, vous avez répondu à côté, et la personne le sent immédiatement.

**2. Expliquer le risque en une phrase concrète.** Une phrase, pas un paragraphe, et surtout pas un article de règlement. Les gens raisonnables acceptent très bien une contrainte qu'ils comprennent ; ce qu'ils refusent, c'est un « non » sans motif, ou un motif juridique qu'ils ne peuvent pas vérifier.

**3. Proposer l'alternative le jour même.** C'est le point non négociable. Un refus sans alternative n'est pas une décision, c'est un contournement en préparation — [j'ai raconté ailleurs ce que ça donne sur un service de transfert de fichiers](/blog/wetransfer-interdit-et-alors/) : la personne trouvera un autre moyen, sur son téléphone personnel, hors de votre vue. Et si l'alternative est plus pénible que l'outil interdit, c'est l'alternative qui sera contournée.

**4. Écrire la règle une bonne fois.** Si la question revient trois fois, ce n'est plus une question, c'est un manque de règle. La réponse doit finir dans [la charte informatique](/docs/dsi/mettre-a-jour-sa-charte-informatique-pour-nis2/), pas dans ma boîte d'envoi.

Dans le cas du 1er juin, ça a donné : besoin reconnu (suivre la compétition, ce qui est parfaitement humain), risque expliqué en une ligne, alternative proposée (le navigateur, qui affiche exactement la même chose sans rien installer), et rappel de la règle générale sur les installations. Refus accepté sans discussion. Le dossier a duré dix minutes.

## Le cas difficile : quand l'outil non validé est déjà le canal de l'entreprise

Le petit utilitaire, c'est le mode facile. Le mode difficile, c'est quand l'outil interdit est déjà utilisé quotidiennement pour travailler, par des gens de bonne foi, parce qu'il marche.

Chez nous, c'était la messagerie grand public sur les téléphones : des équipes terrain qui échangent photos d'intervention, coordonnées de clients et documents dans des groupes créés à la volée. C'est pratique. C'est même redoutablement pratique, et c'est bien pour ça que c'est devenu la norme sans que personne ne décide quoi que ce soit.

Là, le refus frontal est perdu d'avance : on ne supprime pas une habitude collective par mail. J'ai donc changé d'angle, et j'ai mis en avant l'argument qui parle vraiment aux utilisateurs : au-delà des données de l'entreprise, l'objectif est aussi de ne pas envoyer tout notre carnet d'adresses à un service tiers. « Nos données » est une abstraction. « Vos contacts, et ceux de vos clients » ne l'est pas.

Et il a fallu démolir une légende urbaine tenace au passage : non, un client n'a pas besoin d'un compte ni de l'application de notre outil de visioconférence pour rejoindre une réunion. Un seul côté suffit, le lien s'ouvre dans un navigateur. Cette croyance-là justifiait à elle seule la moitié des usages parallèles. Une phrase l'a fait tomber, et j'aurais dû l'écrire deux ans plus tôt.

## Ce que j'ai raté

Deux choses, pour être honnête.

La première, c'est que j'ai longtemps répondu trop vite. Un « non » envoyé dans les cinq minutes, même argumenté, se lit comme un réflexe administratif. Le même refus, envoyé dans l'heure, avec une phrase montrant qu'on a regardé l'outil en question, se lit comme une décision. C'est exactement le même contenu, et ce n'est pas reçu de la même façon.

La seconde, c'est une formule que j'aime beaucoup et que je ne mets jamais dans mes réponses. Quand un utilisateur refuse l'outil officiel, je pense très fort que le problème n'est pas l'outil, mais plutôt entre l'écran et le smartphone. C'est drôle en interne, entre nous. Écrit à la personne concernée, ça détruit en une ligne tout le crédit accumulé par cinquante refus bien expliqués. L'humour, oui, mais jamais dirigé vers celui qui lit.

## Ce que j'en retiens

Dire non ne pose aucun problème. Ce qui pose problème, c'est de dire non **à la place** de répondre.

Le shadow IT n'est pas une désobéissance, c'est un symptôme : quelqu'un avait un besoin, et l'informatique n'y répondait pas assez vite ou pas assez bien. Chaque outil non validé qui apparaît dans le parc est une remontée de besoin gratuite, et plutôt bien documentée. On peut la traiter comme une infraction. On peut aussi la traiter comme une demande, et se demander pourquoi elle n'est pas passée par nous.

Je n'ai jamais réussi à faire aimer un refus. J'ai réussi, en revanche, à ce qu'on continue de me poser la question avant d'installer — et c'est très exactement l'objectif. Le jour où plus personne ne demande, ce n'est pas que le shadow IT a disparu. C'est qu'il est devenu invisible.

<!-- source : mail de refus d'un outil non validé, 2026-06-01 ; mail « échange entre nous » sur les outils de communication, 2026-05-07 -->

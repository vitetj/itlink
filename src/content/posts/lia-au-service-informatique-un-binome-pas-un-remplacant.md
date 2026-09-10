---
title: "L'IA au service informatique : un binôme de debug, pas un remplaçant"
description: "Deux ans d'assistants IA dans un service informatique de deux personnes : un bug de voix sur IP résolu à deux, un rapport qui me prenait pour une équipe, une refonte avortée et une charte pour encadrer tout ça."
published: 2026-08-28
category: humeur
tags: [ia, chatgpt, claude, copilot, debug, it-solo, charte-ia]
featured: false
---

Fin 2024, j'ai testé un de ces outils qui fabriquent une application à partir d'une phrase. Très vite, j'avais un prototype qui tournait. Je l'ai fait suivre au bureau d'à côté avec un commentaire du genre « je t'ai remplacé, rentre chez toi ». Deux ans plus tard, le bureau d'à côté est toujours occupé, moi aussi, et l'IA aussi. Ce qui a changé, c'est l'idée que je me fais de sa place. Elle n'est pas dans mon fauteuil. Elle est sur le siège d'à côté, avec la carte.

## Le soir où l'IA a débloqué la voix sur IP

Juin 2026, on bascule la passerelle par défaut du site vers notre SASE. Tout passe, sauf la téléphonie : les appels s'établissent, mais la voix ne revient pas. Du RTP dans un seul sens. Rollback, compte-rendu d'échec formalisé, puis un mois d'hypothèses entre plusieurs équipes de prestataires.

Le 17 juillet, j'ai trouvé. La publication des ports RTP dans la redirection de ports du SASE était incomplète : deux plages manquaient vers la passerelle de téléphonie. Ajoutées, l'audio est revenu dans les deux sens. Mon mail d'annonce commençait par « Pfiou… merci Claude ! », et celui à l'opérateur par « j'ai enfin gagné la bataille ».

Je veux être précis sur ce que l'IA a fait, parce que tout le débat est là. Elle n'a pas fait les captures réseau et ne connaissait ni nos plages de ports ni notre passerelle. Pendant un mois, elle a écouté mes symptômes, proposé les hypothèses dans un ordre raisonnable, rappelé celles déjà écartées et construit des listes de vérification quand j'étais trop fatigué pour les écrire. Un binôme de debug qui ne se lasse pas, sans ego, et qui ne dit jamais « ça marche chez moi ». Le port manquant, c'est moi qui l'ai vu. Mais j'y suis arrivé parce que je n'ai pas tourné en rond.

La fiche technique est [ici](/docs/reseau/micollab-sip-rtp-derriere-un-sase-cato/), pour ceux qui n'ont pas un mois devant eux.

## Le rapport qui me prenait pour une équipe

Mars 2026. Notre helpdesk affiche six cents tickets, et je voulais savoir ce qu'ils racontaient, pour moi et pour la RH. J'exporte tout par l'API en Python, je confie les données à un assistant, je demande une analyse. Le rapport revient propre, structuré, avec des recommandations à faire pâlir un cabinet de conseil. Il est écrit pour une équipe. Je l'ai envoyé à la RH avec cette précision : l'IA ne comprend pas que je suis seul, ce n'est pas possible pour elle.

Il y avait pire que le ton. Le temps moyen de résolution sortait à cent vingt-neuf heures, effrayant jusqu'à ce qu'on regarde la médiane : moins de sept heures. La moyenne était gonflée par les tickets clôturés en retard, pas par des utilisateurs abandonnés. Les « réouvertures » comptaient les gens qui répondent « merci » après la clôture. Recalculé sur les vraies dates de fermeture, il restait une poignée de vrais problèmes.

La version corrigée est partie le lendemain. L'IA avait produit en quelques minutes un brouillon que je n'aurais pas eu le temps d'écrire, et, avec la même assurance, des conclusions fausses sur des chiffres justes. Le brouillon valait le temps gagné ; les conclusions valaient ce qu'on en vérifie.

## La refonte qui n'a pas eu lieu

Septembre 2025, je tente plus ambitieux : migrer une application interne, un client lourd Java avec sa base, vers une version web. Méthode propre sur le papier : cahier des charges, document de conception, tests décrits avant le code, liste de tâches comme fil conducteur, le tout confié à un agent de génération de code avec le code existant et un export de la base.

Résultat, un an plus tard : ce que j'ai déployé sur les postes, c'est une version 2 du client lourd, packagée avec mon outil de déploiement. La refonte web, elle, n'est jamais arrivée sur les postes.

Ce n'est pas l'agent qui a échoué ; le développement piloté par les spécifications reste une excellente discipline. Ce qui a manqué, c'est un humain pour tenir les trois rôles que l'agent ne tient pas : décider ce que l'application doit faire, vérifier qu'elle le fait, et dire non. Seul, avec le support en plus, ces trois rôles passent après le ticket de l'imprimante. Je l'ai résumé à propos de [la fin de VBA](/blog/vbscript-vba-activex-la-triple-fin-de-vie/) : avec l'IA, on a parfois l'impression de se transformer en magicien, mais ça reste de la magie d'assistance. La remise au propre, oui. La refonte complète, non.

## Les comptes rendus, les routines et la charte

Le quotidien est moins spectaculaire et plus utile. Je demande la transcription des réunions Teams, « en tant qu'informaticien fainéant », et j'en tire le compte rendu. Une routine hebdomadaire résume ma boîte mail. Une procédure DNS a été rédigée avec ChatGPT, puis relue ligne à ligne avant diffusion.

Côté outils, j'ai fait le yo-yo : ChatGPT, puis Copilot au printemps 2025, puis retour à ChatGPT en septembre parce qu'il était nettement plus pertinent, avec un connecteur vers notre tenant et l'authentification unique. Claude pour le debug. Le jour où mon propre filtrage DNS a bloqué ChatGPT, le message disait « on a perdu notre cerveau ». C'était une blague. Pas complètement.

Et puis il a fallu encadrer. En juillet 2026, des documents internes partaient vers des assistants publics. La charte tient en une page : usage réservé aux licences validées, hébergement en France ou infrastructure contrôlée, demandes consolidées par les responsables de service ; la trame est [dans cette fiche](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/). La direction, elle, veut de l'IA au bureau d'études pour la conception 3D. Très bien. Avec une licence, et sans les plans dans un chat public.

## Ce que j'en retiens

- L'IA est un excellent binôme de debug parce qu'elle structure la recherche et ne se fatigue pas. Le port manquant, il faut encore quelqu'un pour le voir.
- Elle ne sait pas que vous êtes seul, ni rien de votre contexte tant que vous ne l'écrivez pas ; et même après, elle l'oublie.
- Elle ne remplace pas la personne qui porte la spécification, vérifie le résultat et dit non.
- Encadrez avant que vos fichiers partent, pas après.

En janvier 2026, j'ai demandé un abonnement développeur à mon employeur avec cet argument : c'est toujours moins cher qu'un apprenti. C'est vrai. Mais un apprenti, au bout de six mois, a compris que je suis seul.

<!-- source : mails « Compte-rendu d'échec de déploiement – Bascule de la passerelle par défaut », 2026-06-16 → 2026-07-17 ; « Rapport d'analyse des tickets IT », 2026-03-24/25 ; « migration d'une application interne (test) », 2025-09-19 ; « Encadrement de l'utilisation des outils d'IA », 2026-07-22 ; « Achat de Copilot Pro+ », 2026-01-21 -->

---
title: "Les adresses IP publiques que vous annoncez à vos clients ne sont pas les bonnes"
description: "J'ai envoyé nos nouvelles adresses publiques à nos partenaires. Quatre jours plus tard, un correctif : ce n'étaient pas celles utilisées en production. Récit, et la méthode pour ne plus recommencer."
published: 2026-07-25
category: retex
tags: [ip-publique, nat, sase, communication, migration]
featured: false
---

Le 20 juillet 2026, j'ai envoyé un mail propre, structuré, en français et en anglais, à tous les automaticiens et
à tous les partenaires qui ont un filtrage par adresse IP côté chez eux. Objet : nos nouvelles adresses IP
publiques après la migration de notre accès Internet. Un tableau, une date de bascule, un contact.

Le 24 juillet, j'ai envoyé le même mail avec « UPDATE » dans l'objet, en importance haute, pour dire que les
adresses communiquées quatre jours plus tôt n'étaient pas celles réellement utilisées en production. Je cite ma
propre phrase, points de suspension compris, parce qu'ils disent tout de mon état d'esprit ce jour-là : « les
adresses qui nous avaient été transmises n'étaient finalement pas celles utilisées en production…… »

## Comment on se retrouve à annoncer les mauvaises adresses

Ce n'est pas une histoire de négligence, et c'est bien ça qui la rend intéressante.

Dans une migration vers une plateforme SASE, l'adresse publique avec laquelle votre trafic sort d'Internet n'est
plus l'adresse de votre pare-feu. Elle appartient au fournisseur, elle dépend du point de présence, elle dépend
du service — sortie générique mutualisée, sortie dédiée, publication entrante — et elle peut changer entre la
phase de commande et la mise en production. J'avais reçu une liste d'adresses par écrit, de la part de gens dont
c'est le métier, à un moment où l'architecture n'était pas encore figée. J'ai fait confiance à un document au
lieu de faire confiance à une mesure.

Entre le 20 et le 24 juillet, deux choses ont bougé : la mise en place d'une adresse de sortie dédiée pour la
passerelle de téléphonie, et la finalisation du routage entre l'opérateur et le fournisseur. Résultat, une
partie des flux ne sortait plus par les adresses annoncées quatre jours plus tôt.

## Ce que coûte une re-communication

Sur le papier, pas grand-chose : un deuxième mail. En vrai, quatre coûts bien réels.

Le premier est mécanique. Chaque partenaire qui avait déjà modifié sa liste blanche doit la remodifier, et
chacun le fait à son rythme. Tant que le dernier n'a pas répondu, personne ne sait quelle version est en place
chez qui.

Le deuxième est la charge de support. Un mail de correction en importance haute génère des réponses, des
questions, des « et pour notre VPN, ça change aussi ? ». Il faut y répondre une par une.

Le troisième est le plus cher et il ne se mesure pas : le crédit. Quand vous écrivez à tous les partenaires
techniques d'un site, vous n'êtes pas seulement un correspondant, vous êtes la source d'autorité. Une source d'autorité
qui se corrige quatre jours plus tard est écoutée plus prudemment la fois suivante.

Le quatrième, c'est le temps que je n'ai pas passé sur le reste. Ce trimestre-là, j'étais seul sur le sujet.

## Ce que j'aurais dû faire, et que je fais maintenant

La leçon tient en une phrase : **ne jamais diffuser une adresse IP publique avant de l'avoir constatée en
production, depuis le chemin réel**. Pas depuis la documentation du fournisseur, pas depuis un mail d'un
ingénieur, pas depuis la console d'administration. Depuis un poste du site concerné, une fois la bascule faite.

Concrètement, la vérification prend deux minutes. Depuis un poste sur le réseau visé, on interroge un service
qui renvoie l'adresse vue de l'extérieur, et on recommence depuis chaque contexte qui pourrait sortir
différemment : un poste du LAN, un poste avec l'agent SASE en mode connecté, un serveur en DMZ, la passerelle de
téléphonie. Dans une architecture SASE, ces quatre-là peuvent parfaitement sortir avec quatre adresses
différentes, et c'est même souvent souhaitable.

Ensuite, j'ai changé le format de la communication elle-même. Trois règles, apprises à mes dépens :

**Une page, pas un mail.** Les adresses vivent désormais sur une page interne datée, et le mail pointe vers
elle. Quand une adresse change, la page change ; il n'y a jamais deux versions en circulation dans des boîtes
mail.

**Une date de validité explicite.** « Adresses constatées en production le 24 juillet 2026 » vaut mieux que
« nos nouvelles adresses ». Cela dit au lecteur ce qu'il tient entre les mains.

**Un gel avant l'annonce.** Aucune communication externe tant qu'une brique du projet est encore susceptible de
bouger. J'ai annoncé trop tôt parce que je voulais laisser du temps aux partenaires. L'intention était bonne, la
séquence était fausse : mieux vaut prévenir tard que corriger.

## Ce que j'ai bien fait, quand même

Je n'aurais pas écrit ce billet si l'histoire s'arrêtait à l'erreur. Ce qui a sauvé le dossier, c'est la
correction elle-même.

Elle est partie quatre jours après, pas trois semaines. Elle avait « UPDATE » dans l'objet et l'importance haute,
pour qu'elle ne soit pas lue comme un doublon. Elle disait explicitement ce qui avait changé et pourquoi, sans
chercher un responsable. Elle était bilingue, comme la première. Et elle listait précisément quelles adresses
remplacer par lesquelles, pour que le destinataire n'ait pas à comparer deux mails.

Une erreur assumée vite, avec les éléments pour la corriger, coûte infiniment moins qu'une erreur découverte par
le partenaire plus tard, quand son filtrage bloque un flux au pire moment. Les gens en face font le même métier ;
c'est à eux qu'on doit la version exacte, pas la version rassurante.

## La règle que j'ai retenue

Une adresse IP publique n'est pas une donnée administrative, c'est un état de fait mesurable. On ne la recopie
pas depuis un document : on la constate, depuis le bon endroit, après la bascule, et on l'écrit quelque part où
elle pourra être corrigée sans envoyer un deuxième mail à tout le monde.

Et si vous vous demandez si j'ai vérifié mes adresses en production avant d'écrire ce billet : oui. Deux fois.

<!-- source : mails « Nouvelles adresses IP publiques » 2026-07-20 et « UPDATE – Nouvelles adresses IP publiques » 2026-07-24 -->

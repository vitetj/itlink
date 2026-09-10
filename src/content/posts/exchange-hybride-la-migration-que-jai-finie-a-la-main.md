---
title: "Exchange hybride : la migration « clé en main » que j'ai finie à la main"
description: "Un prestataire, un attribut Entra Connect, un tenant devenu irréversible et un week-end à monter Exchange 2013 vers 2019 en solo. Ce que cette migration ratée m'a appris sur les experts, et sur moi."
published: 2026-06-14
category: retex
tags: [exchange, exchange-online, migration, entra-connect, prestataires, retex]
featured: false
---

Le dernier serveur Exchange de l'entreprise est éteint depuis la coupure générale de ce printemps. Quatorze mois après
la fin de la migration, je peux enfin raconter cette histoire sans avoir envie de redémarrer un service transport. Je
vais la raconter dans l'ordre, y compris les passages où je n'ai pas été brillant, parce que la version « migration
réussie vers Microsoft 365 » que l'on met dans un rapport annuel ne sert à personne.

## Janvier : le bâton de pèlerin

Ça commence par Office qui se désactive tout seul, tous les deux jours, sur tous les postes. Quatre ans que je
quémandais des licences à la direction avec mon bâton de pèlerin ; il aura fallu que la bidouille d'activation rende
l'âme pour que le sujet devienne « critique ». Entre-temps, tout le monde est passé sur LibreOffice. Une PME
industrielle sur LibreOffice avec des fichiers Excel bourrés de macros métier, ça tient une semaine. Pas deux.

Les licences arrivent par notre CSP, un grand opérateur, avec une prestation de migration vers Exchange Online. Le CSP
ne vend plus que du « full cloud ». Moi, je voulais de l'hybride : j'ai des outils métier bien ancrés en local, des
copieurs et des automates qui relaient du SMTP, et j'aime bien que la messagerie interne survive à une coupure
Internet. Petit à petit, en enlevant mes casseroles, je serais full cloud plus tard. On part donc sur une migration
« clé en main » pilotée par le prestataire.

La réunion de lancement donne le ton : notre interlocuteur nous prévient dix minutes avant, et découvre que j'ai déjà
fait la synchronisation Active Directory, le déploiement d'Office par WAPT et l'attribution des licences. Il n'a pas
non plus de méthode pour importer les archives PST dans l'archive en ligne. Je note « mitigée » dans mon compte rendu.
J'aurais dû noter autre chose.

## Février : l'attribut qui rend un tenant irréversible

Pour créer les boîtes directement dans le cloud, le prestataire fait passer `msExchMailboxGUID` à NULL dans les règles
de synchronisation Entra Connect. C'est un truc connu pour les migrations « full cloud » avec un outil tiers : sans cet
attribut, Exchange Online considère que l'utilisateur n'a pas de boîte ailleurs et lui en crée une. Puis, quelques
jours plus tard, la règle d'origine est réactivée. Le tenant se retrouve en mode hybride, avec des boîtes créées à la
main d'un côté et des boîtes locales de l'autre. Et là, on ne peut plus revenir en arrière.

Pendant ce temps, le distributeur supprime nos licences par erreur (un jour entier de mails de résolution à tous), un
compte cloud homonyme d'un compte AD bloque la synchronisation, et c'est moi qui trouve et corrige, le soir. Je
migre un premier utilisateur avec les outils Microsoft, seul, la nuit. Je découvre que dire « il faut faire ceci » n'est
pas un conseil ; expliquer comment le faire, c'en est un.

Le 21 février, j'écris à la direction pour arrêter les frais. J'y dis que notre « expert » est un exécutant sans
compétence technique et sans pédagogie. J'y écris aussi ma part : j'aurais dû m'assurer de la compétence de la personne
en charge et mieux superviser les opérations. Et une phrase que je ne renie pas : je suis compétent en on-premise, mais
la nébuleuse Azure reste pour moi un grand mystère. Je demande un vrai expert certifié Microsoft, et je propose de
revenir à l'idée initiale, l'hybride, puisque de toute façon le tenant l'est devenu.

## Un week-end pour passer de 2013 à 2019

L'hybride moderne ne se fait pas depuis Exchange 2013. Il me faut un 2019, donc une licence en volume, donc une saga :
un contrat visible sans le produit, un ticket chez Microsoft, et ce mail à mon revendeur : « un jour j'y arriverai, à
avoir des licences sans ouvrir un ticket ». Puis « victoire, je vois enfin mon serveur Exchange ».

Le vendredi soir, j'envoie l'annonce de maintenance en français et en anglais, avec le fuseau horaire de la filiale
américaine, signée « Lord Commander of IT » parce qu'il faut bien que quelqu'un s'amuse. Fermer Outlook avant 18 h,
ne rien ouvrir avant lundi 6 h. Le samedi, Exchange 2019 s'installe sur un Windows Server 2025 tout neuf. Les boîtes
se déplacent. Certaines sont corrompues et me coûtent quelques cheveux, mais j'avais prévu de la marge. Le dimanche,
je teste les flux dans tous les sens, avec et sans règle de pare-feu, et j'envoie à la direction le mail « si vous
recevez ceci, la migration est terminée ». Le lundi, le serveur est fonctionnel à 98 % : le webmail est publié en direct
en attendant de refaire le proxy, et je vérifie les logiciels métier et les copieurs. Puis un rapport de trente pages,
avec le décompte des heures, parce qu'un week-end de travail se justifie par écrit.

Je n'ai rien cassé. J'en ai bavé. Les deux sont vrais.

## Mars : le vrai expert et la nuit STARTTLS

Le CSP m'envoie cette fois un ingénieur messagerie. Ce n'est vraiment pas la même mayonnaise : on cherche et on résout
les problèmes de façon cohérente. Je lui envoie un mail de contexte avec l'architecture complète, l'historique des
erreurs, un compte VPN dédié. En trois sessions, Entra Connect est remis d'aplomb, l'assistant hybride passe, une boîte
de test est migrée.

Et puis trois flux sur quatre fonctionnent. Le quatrième, du serveur local vers le cloud, reste en file avec un
`451 5.7.3 STARTTLS is required to send mail`. Une nuit de débogage à deux : domaines en relais interne, antispam en
relais entrant, certificats, connecteurs. On ne sait jamais si ça vient du connecteur, du pare-feu ou de l'antispam.
Ce qui a fini par tout débloquer, quelques jours plus tard : des connecteurs recréés de zéro, le certificat wildcard
partout, et le MX Exchange Online ajouté en deuxième position dans le connecteur d'envoi Internet. Pas élégant. Efficace.
J'ai détaillé tout ça dans une fiche à part, avec ce que j'en pense.

Les boîtes migrent la semaine suivante. Mail « IT god » à la filiale américaine, mail sobre aux Français. Une boîte de
51 Go refuse de passer sous le quota de 50 : archive en ligne, seconde tentative, ça passe. Puis un grand groupe client
ne reçoit plus rien de nous : `554 5.4.14 Hop count exceeded`. Les deux organisations sont sur Exchange Online derrière
le même antispam, et le connecteur entrant « par défaut » que l'intégration antispam impose renvoie le mail vers le
filtre en boucle. Bug connu, connecteur désactivé, tout fonctionne. Morale : ne jamais faire confiance à une
configuration par défaut obligatoire. Réunion de clôture le 26 mars.

## Ce que j'en retiens

**« Expert » est un intitulé de poste, pas une compétence.** Avant de laisser quelqu'un lancer un outil de migration sur
votre tenant, exigez la vérification des prérequis (ADFS, Entra Connect), gardez les journaux, et faites-vous expliquer
chaque manipulation. Si l'explication n'arrive pas, la compétence non plus.

**Ma part de responsabilité est réelle.** Je l'ai écrite à la direction et je l'écrirais encore. Quand on est seul, on
a tendance à faire confiance parce qu'on n'a pas le temps de vérifier. C'est précisément quand il faut vérifier.

**Une règle de synchronisation peut coûter une architecture.** `msExchMailboxGUID`, c'est un attribut parmi des
centaines. Comprenez ce qu'il fait avant de le toucher, et surtout avant de le remettre.

**Savoir ce qu'on ne sait pas.** J'ai fait la montée de version Exchange seul parce que c'est mon métier. J'ai payé
l'hybridation à quelqu'un parce que ce n'était pas le mien. Les deux décisions étaient bonnes ; la seule mauvaise a été
de payer la première personne pour la seconde tâche.

**Écrire.** Le rapport de trente pages a servi de dossier d'entrée au second expert. Les annonces bilingues ont évité
la moitié des tickets. Le mail du 21 février a évité de continuer trois semaines de plus.

Ce printemps, pour éteindre le dernier serveur hybride, j'ai demandé un devis au CSP, par prudence : je n'avais pas
envie de jouer aux apprentis sorciers sur un système qui porte les comptes de tout le monde. Puis la coupure générale de
maintenance est arrivée, et je me suis dit : autant essayer et revenir en arrière le cas échéant. Personne ne m'avait
promis que ce serait clé en main. C'est peut-être pour ça que ça l'a été.

<!-- source : mails « Point migration – étapes suivantes », 2025-02-21 ; « Rapport de migration et justification des heures », 2025-03-02 ; « Assistance pour la migration Exchange et la configuration hybride », 2025-03-06 ; « Avancée hybridation », 2025-03-19 ; « Voilà le rapport des maintenances à effectuer », 2026-05-29 -->

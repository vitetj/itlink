---
title: "Une DSI d'une personne, quinze applications auto-hébergées"
description: "Deux ans à faire tourner le dépôt Git, le coffre de mots de passe, le helpdesk, l'ERP et une dizaine d'autres services sur ma propre plateforme. Ce que ça demande vraiment, ce qui a cassé, et où j'ai dit non."
published: 2026-09-08
category: retex
tags: [self-hosting, cloudron, dsi, retex, sauvegarde, sso]
featured: false
---

Le service informatique de ma boîte, c'est moi. Une PME industrielle, des machines qui partent dans le monde
entier, quelques centaines de personnes, et une seule personne pour tenir le réseau, les serveurs, les postes,
la sécurité et les projets. Sur le papier, l'auto-hébergement est la dernière chose qu'on devrait me conseiller.
Chaque service en plus, c'est une mise à jour en plus, une sauvegarde en plus, une chose en plus à réparer un
dimanche soir.

J'en héberge quinze. Le dépôt Git et son intégration continue, le coffre de mots de passe, le stockage de
fichiers, le helpdesk, l'ERP, un service de transfert maison qui a
[remplacé WeTransfer](/blog/wetransfer-interdit-et-alors/), un collecteur d'erreurs, un fournisseur de codes à usage unique, deux portails web, et quelques outils maison dont personne
d'autre que nous n'a l'usage. Voici comment ça tient, et à quel prix.

## Ça n'a pas commencé par une décision

Personne ne se réveille un matin en décidant d'héberger quinze applications. Chez moi, ça a commencé en
septembre 2024 par une phrase dans une annonce interne : la nouvelle version de l'intranet aurait une connexion
unifiée, adossée à un annuaire.

Cet annuaire, c'est devenu la clé de voûte. À partir du moment où il existait, chaque nouveau besoin trouvait
sa réponse au même endroit. Un coffre de mots de passe ? Il se branche sur l'annuaire. Un helpdesk ? Pareil.
Le collecteur d'erreurs de notre vieille application Java ? Pareil. Le coût marginal d'une application de plus
n'était plus « monter un serveur, gérer des comptes, obtenir un certificat, écrire une procédure de
sauvegarde ». C'était : cliquer sur installer, choisir un nom, cocher la case annuaire.

C'est tout le principe d'une plateforme d'auto-hébergement : elle ne vous vend pas des applications, elle vous
vend la partie ennuyeuse. Les certificats se renouvellent seuls, les sauvegardes partent chaque nuit vers un
stockage objet, les mises à jour arrivent avec un journal. Ce que j'ai acheté, ce n'est pas GitLab ou
Nextcloud, c'est le fait de ne pas avoir à réfléchir à quinze `certbot`.

L'autre effet, moins prévu, c'est l'ergonomie. Quand tout le monde a un seul mot de passe pour huit outils, on
peut enfin exiger qu'il soit long et accompagné d'un second facteur. Une règle stricte sur un seul compte est
mieux respectée que huit règles molles.

## Trois instances, deux proxys, et un MFA gratuit

L'architecture tient en trois machines. Une instance en zone démilitarisée, qui porte ce qui doit être joignable
depuis l'extérieur. Une instance sur le réseau interne, pour ce qui n'a rien à faire sur Internet. Une instance
de développement, où je casse des choses avant de les proposer aux autres.

Le schéma qui a le plus servi, c'est le double proxy : le proxy externe reçoit la requête, la passe au proxy
interne, qui parle à l'équipement ou à l'application. Ça paraît redondant. Ça ne l'est pas. Ça m'a permis de
publier proprement l'interface d'un enregistreur vidéo qui refusait obstinément d'accepter un certificat, en
lui laissant faire du HTTP sur son VLAN pendant que le proxy s'occupait du chiffrement.

Le bonus, c'est l'authentification. Ces boîtiers — enregistreurs, imprimantes, automates — n'ont pas de second
facteur et n'en auront jamais. En les plaçant derrière un proxy qui exige une connexion à l'annuaire, ils en
héritent sans le savoir. C'est le MFA gratuit des équipements bas de gamme, et honnêtement, c'est la chose dont
je suis le plus satisfait dans toute cette histoire.

## Ce qui a cassé

Parce que ça casse, et raconter le contraire n'aiderait personne.

**GitLab est tombé en manque de mémoire** un matin de février. Diagnostic en dix minutes, correction en deux
clics : la limite mémoire de l'application est passée de 4 à 8 Go. Ce jour-là j'ai écrit « vive Docker ! » dans
un mail interne, et je le pense toujours. La même panne sur un serveur installé à la main, c'était une soirée.

**Une restauration de coffre de mots de passe est partie en timeout.** J'ai ouvert un ticket au support,
persuadé d'avoir trouvé un bug. Le port 22 était bloqué par le pare-feu entre les deux hôtes, et la copie ne
pouvait pas se faire. Ma réponse au support tient en une phrase que je n'ai pas fini de me répéter : la
prochaine fois, j'autoriserai le port 22.

**Le serveur de sauvegarde sur bandes a brûlé**, en juillet 2025. Littéralement. La
[règle des trois copies](/blog/raid5-nest-pas-une-sauvegarde/) sur deux supports dont une hors site n'est pas
un exercice de certification : ce jour-là, la copie hors site était la seule qui restait. Nous n'avons rien
perdu, et j'ai migré dans la foulée vers un stockage objet européen avec une couche d'archivage froid.

**Et puis il y a les fausses pannes.** Un samedi de septembre, mon tableau de bord traîne et le journal de la
plateforme affiche un script tué en cours d'exécution. Deux heures pour comprendre que
[ce n'était rien](/docs/self-hosting/lire-les-logs-box-de-cloudron/) : la mesure d'espace disque n'avait pas eu
le temps de finir sur un gros volume. J'ai appris à distinguer une mesure ratée d'une opération ratée.

## Où j'ai dit non, et ce que ça vaut

L'auto-hébergement devient dangereux le jour où il devient une idéologie. Trois refus, donc.

**La messagerie.** J'ai passé des années sur un Exchange sur site, puis en hybride, et je l'ai décommissionné
sans regret. Une messagerie d'entreprise, ça se restaure sous contrainte de temps, ça se défend contre le
phishing en permanence, et sa réputation d'expéditeur se joue chez les autres. Ce n'est pas un combat pour une
personne seule.

**Un hyperviseur qui demande trop d'attention.** Quand la
[question de l'après-VMware](/blog/broadcom-vmware-facture-pme/) s'est posée, j'ai écarté une alternative libre
pour une raison qui n'a rien de technique : trop d'administration pour un service informatique d'une personne.
Ce n'est pas un jugement sur le produit, c'est un jugement sur mon temps disponible.

**Tout ce que je ne saurais pas restaurer seul.** C'est devenu mon critère unique. Avant d'installer quoi que
ce soit, la question n'est pas « est-ce que ça marche ? » mais « suis-je capable de le remonter à partir des
sauvegardes, un mardi de novembre, avec quelqu'un qui attend derrière moi ? ». Si la réponse est non, ça ne
rentre pas.

Le calcul économique existe, mais ce n'est pas lui qui décide. Nos plans de machines, nos mots de passe et nos
tickets restent sur des serveurs dont je connais l'adresse : le jour où un éditeur change ses conditions
d'utilisation pour se servir de nos fichiers, ça ne me concerne pas. En échange, j'accepte que le dimanche
soir, ce soit moi. Pas d'astreinte, pas de numéro à appeler. Cet arbitrage-là, chacun doit le faire pour sa
propre structure.

Quinze applications, c'est beaucoup. La vérité, c'est que ce n'est pas leur nombre qui compte, c'est le fait
qu'elles partagent toutes le même annuaire, le même mécanisme de sauvegarde et le même endroit où lire les
journaux. Quinze applications dans quinze technologies différentes, ce serait ingérable. Quinze applications qui
se ressemblent, ça se tient dans une tête. Y compris une seule.

<!-- source : synthèse de mails internes sur la plateforme d'auto-hébergement, septembre 2024 → septembre 2026 -->

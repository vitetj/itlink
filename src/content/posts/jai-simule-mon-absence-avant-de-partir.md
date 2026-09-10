---
title: "J'ai simulé mon absence avant de partir"
description: "Avant un congé long, j'ai passé une journée entière au bureau sans répondre à personne. Pas un plan de continuité de quarante pages : un test grandeur nature. Ce que ça a révélé, et ce que ça n'a pas révélé."
published: 2025-11-28
category: retex
tags: [continuite-de-service, ticketing, documentation, it-solo, organisation]
featured: false
---

Un congé long se préparait. Pas trois jours posés entre deux ponts : plusieurs semaines d'affilée, annoncées
longtemps à l'avance. Dans un service informatique d'une seule personne, ça pose une question que personne n'aime
formuler à voix haute : qu'est-ce qui se passe, concrètement, quand je ne suis pas là ?

La réponse attendue, c'est un plan de continuité. J'en ai lu, j'en ai écrit. Le problème d'un plan de continuité,
c'est qu'il est rédigé par la personne qui va manquer. Il décrit ce qu'elle sait, dans l'ordre où elle le sait,
avec les mots qu'elle utilise. Autant dire qu'il teste ma mémoire, pas leurs réflexes.

Alors j'ai fait autre chose. J'ai prévenu, puis j'ai passé une journée entière au bureau à ne répondre à rien.

> Comme convenu, je fais acte de présence aujourd'hui. Je ne répondrai à aucune demande et vous agirez comme si je
> n'étais vraiment pas là.

## Un plan qu'on n'a jamais exécuté, c'est une sauvegarde qu'on n'a jamais restaurée

L'analogie n'est pas gratuite : c'est exactement le même mécanisme mental. On se rassure avec l'existence du
document. On coche la case. Et le jour où il faut s'en servir, on découvre que le chemin d'accès a changé, que la
personne citée est partie, ou que l'étape 3 suppose des droits que personne n'a.

Un exercice d'évacuation incendie ne sert pas à vérifier que les plans sont affichés au mur. Il sert à voir qui
reste assis à son bureau en se disant que ça doit être un test. C'est le même principe, appliqué au service
informatique : je ne voulais pas savoir si mes collègues savaient *faire*, je voulais savoir s'ils savaient **où
chercher et à qui demander**.

Une journée suffit pour ça. Et il faut être physiquement présent, sinon ce n'est pas un exercice, c'est un jour de
congé.

## Ce qu'il a fallu poser avant

Une simulation sans préparation ne mesure rien : elle prouve juste que l'entreprise s'arrête. Le dispositif a été
monté sur les semaines précédentes, dans cet ordre.

**Le ticketing d'abord.** Tant que les demandes arrivent dans ma boîte mail personnelle, elles disparaissent avec
moi. Une demande adressée à une personne meurt avec son absence ; une demande adressée à un service survit. Le
helpdesk par e-mail a été monté, testé à coups de tickets absurdes, puis annoncé en français et en anglais. J'ai
aussi pris l'habitude d'ouvrir moi-même un ticket pour tout ce que je fais, y compris l'achat d'un câble, pour que
la charge réelle du service soit visible par quelqu'un d'autre que moi. Le sujet mérite sa propre fiche :
[choisir un outil de ticketing pour une petite DSI](/docs/dsi/choisir-un-outil-de-ticketing-pour-une-petite-dsi/).

**Une documentation lisible par un autre que son auteur.** Des comptes en lecture ont été ouverts sur le wiki
interne pour les collègues qui assurent le relais. Je ne me fais pas d'illusion sur ce point : ouvrir un compte ne
transmet rien. Il faut dire ce qu'on y trouve, et pour quel genre de panne. C'est la partie que j'ai le moins bien
faite.

**Les accès d'administration, transmis proprement.** Hyperviseur, portail d'identité : par liens sécurisés à usage
unique, jamais dans le corps d'un mail. Un mot de passe écrit dans un mail reste lisible pendant des années, y
compris par des gens qui n'étaient pas destinataires.

**Un périmètre écrit avec le support de l'opérateur.** Mise en relation formelle des relais avec le support, avec
une phrase claire : uniquement en cas d'incident majeur. Sans périmètre écrit, il n'y a que deux issues, et les
deux sont mauvaises — soit personne n'ose appeler, soit on ouvre un dossier pour une imprimante.

**L'intendance.** Quatre postes remis en conformité pour être utilisés pendant l'absence, le stock rangé,
l'inventaire des consommables transféré au service achats. Ça ne figure dans aucun plan de continuité, et c'est
pourtant ce qui bloque en pratique. Et un message d'absence en français et en anglais, avec le canal de support à
utiliser, parce que la moitié des interlocuteurs ne lit pas le français.

## Ce que la journée a réellement montré

Je vais être honnête : la journée n'a pas produit le grand effondrement que j'attendais un peu. Personne n'a fait
tomber un serveur. Ce que j'ai vu, ce sont des hésitations — le moment où quelqu'un s'approche de mon bureau, se
souvient de la règle, et repart chercher ailleurs. C'est exactement ce qu'on veut observer, et c'est invisible dans
un document.

Le plus dur, ça a été moi. Rester assis et ne pas répondre à une question dont on a la réponse en trois secondes,
c'est étonnamment désagréable. C'est aussi l'aveu que le vrai point de fragilité d'un service informatique d'une
personne, ce n'est pas la documentation manquante : c'est le réflexe de tout absorber, entretenu avec application
pendant des années par celui qui s'en plaint ensuite.

Deux ratés concrets, pour équilibrer. Le message de pré-accueil téléphonique que j'avais enregistré pour rediriger
les appels vers le ticketing ne s'appliquait pas aux appels internes — c'est-à-dire précisément à ceux qui
m'appellent. Corrigé après coup, en rallongeant la durée pour qu'il passe. Et je ne suis pas parti avec une pile
vide : un chantier de relais applicatif est resté en suspens, coincé entre l'authentification moderne et
l'authentification multifacteur, avec un plan B que je n'avais pas eu le temps de monter. On ne part jamais au bon
moment. Ça ne s'organise pas, ça s'accepte.

## Le seul indicateur qui compte

Pendant l'absence réelle, j'ai été sollicité une fois. Une panne présentée comme un problème de téléphonie, qui
était en réalité un serveur de prise en main à distance bloqué par le pare-feu. Diagnostic à distance, quelques
minutes, et retour au silence.

Une fois, en plusieurs semaines. C'est ça, le résultat du POC — pas le compte rendu de la journée de simulation,
mais ce chiffre-là. Et il ne doit rien à un document : il doit tout au fait que les gens avaient déjà répété, une
fois, sans moi.

Le meilleur indicateur d'un service informatique, ce n'est pas le nombre de tickets fermés. C'est le nombre de
choses qui continuent quand il n'est pas là. Je recommencerai, et sans attendre le prochain congé : ce jour-là,
j'ai appris plus sur mon propre service qu'en trois ans de documentation.

<!-- source : fil « POC du service informatique » et préparation de la continuité avant une absence longue, novembre 2025 -->

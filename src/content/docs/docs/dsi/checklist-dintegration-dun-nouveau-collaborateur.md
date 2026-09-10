---
title: "La check-list IT d'arrivée d'un nouveau collaborateur"
description: "Le mail des RH arrive trois jours avant l'arrivée et ne dit ni le poste, ni les logiciels, ni si la personne aura un téléphone. Voici le formulaire qui remplace ce mail, et les cinq pièges qui coûtent une matinée."
published: 2026-09-08
category: dsi
tags: [onboarding, gouvernance, ticketing, mfa, poste-de-travail, it-solo]
level: débutant
status: à jour
featured: false
sidebar:
  label: "La check-list IT d'arrivée d'un nouveau…"
---

Un nouveau commercial arrive lundi. L'information me parvient le jeudi, dans un mail qui dit à peu près : « Bonjour,
peux-tu prévoir le matériel ? ». Suivent trois allers-retours pour savoir s'il aura un téléphone professionnel, s'il
doit accéder au réseau interne, s'il utilise le CRM, et s'il a besoin d'une visionneuse CAO. Chaque question posée en
retard, c'est une commande qui part en retard.

Une intégration IT n'est pas compliquée : c'est une liste. Le problème n'est jamais technique, il est d'information.
Cette fiche donne la liste, la façon de la faire remplir par quelqu'un d'autre que vous, et les erreurs de sécurité
qu'on commet quand on va vite — dont une que j'ai commise moi-même.

## Poser la règle : un ticket, pas un mail

La demande d'arrivée doit être un **ticket créé par les ressources humaines**, avec un délai minimum. Pas un mail, pas
un message dans un couloir, pas une information transmise par la personne qui recrute.

Trois raisons, et aucune n'est bureaucratique. Un ticket porte une date, donc un délai opposable. Un ticket a un
formulaire, donc les questions sont posées une fois pour toutes au bon moment. Un ticket laisse une trace pour la
sortie, six mois ou dix ans plus tard, quand il faudra savoir ce qui avait été attribué. Un mail, lui, se perd entre
deux fils sur autre chose.

Fixez le délai en fonction de vos propres délais de livraison, pas de votre bonne volonté. Un PC en stock se prépare
en une demi-journée ; un PC à commander, non.

## Les questions à poser une seule fois

Voici le contenu du formulaire. Chaque ligne appelle une réponse binaire ou un choix, jamais une rédaction libre.

| Rubrique | Question | Pourquoi elle est posée |
|---|---|---|
| Identité | Nom d'usage, service, fonction, responsable, date d'arrivée | Compte, annuaire, groupes, droits |
| Statut | Salarié, intérimaire, apprenti, stagiaire, prestataire | Détermine la durée de vie du compte et son type |
| Poste de travail | Fixe, portable, configuration particulière (CAO, calcul) | Une station CAO ne se commande pas comme un portable |
| Téléphone | Professionnel oui/non, mobile ou poste fixe | Conditionne la méthode d'authentification forte |
| Messagerie | Compte de messagerie, appartenance aux listes de diffusion | Base de tout le reste |
| Applications | CRM, ERP ou GPAO, outils métier, visionneuses de plans | Licences à vérifier avant, pas le jour J |
| Réseau interne | Accès aux partages de fichiers oui/non | Un itinérant n'en a souvent aucun besoin |
| Accès distant | VPN ou agent SASE nécessaire | Profil et licence à provisionner |
| Impression | Imprimantes et copieurs à raccorder | Deux minutes le jeudi, un ticket le lundi |
| Sortie | Date de fin prévue si connue | Un contrat court se planifie dès l'entrée |

Deux lignes méritent qu'on s'y arrête.

**Les visionneuses.** Dans une PME industrielle, un commercial ouvre des plans sans les modifier. Il ne lui faut ni un
poste de conception ni un jeton de licence flottante : une visionneuse gratuite suffit, pour les modèles 3D comme pour
les plans 2D. La différence entre les deux réponses se compte en milliers d'euros de licences et en une semaine de
délai. Posez la question, ne devinez pas.

**L'accès au réseau interne.** La réponse par défaut pour un itinérant est **non**. Non par principe de moindre
privilège, et non parce que le besoin réel est presque toujours la messagerie, la visioconférence et une application
métier en ligne. Un poste qui ne monte aucun partage est un poste qu'on peut gérer entièrement depuis le cloud, sans
VPN à déboguer un vendredi soir depuis un parking d'hôtel.

## Le cas du collaborateur sans téléphone professionnel

C'est la question qui bloque le plus souvent, et elle est piégeuse : pas de téléphone professionnel ne veut pas dire
pas d'authentification forte. Le MFA reste obligatoire, la seule chose à décider est le **support** du second facteur.

- **Application d'authentification sur le téléphone personnel** : la solution la plus simple, mais elle ne s'impose
  pas. Elle se propose, elle s'accepte, et le refus doit avoir une alternative.
- **Clé de sécurité matérielle** : la bonne réponse pour un poste sensible ou pour quelqu'un qui refuse d'installer
  quoi que ce soit sur son téléphone. Elle se commande, donc elle se demande tôt.
- **Jeton matériel affichant un code temporaire** : l'alternative sans smartphone et sans port USB libre.
- **SMS et appel vocal** : à éviter, et de toute façon en voie d'extinction chez Microsoft. Ne construisez pas une
  arrivée dessus.

Tranchez à l'arrivée, pas au premier voyage. Un commercial bloqué à l'étranger avec un MFA mal configuré, c'est un
appel un dimanche, et vous n'aurez aucun moyen de vérifier son identité.

## Le code PIN ne se dérive jamais d'une date de naissance

J'ai demandé une fois la date de naissance d'un arrivant pour lui fabriquer un code PIN initial. C'était pratique :
l'information était dans le dossier RH, elle était facile à communiquer à l'intéressé, et il s'en souviendrait. C'est
aussi une mauvaise pratique, et je l'écris ici précisément parce que je l'ai faite.

Une date de naissance n'est pas un secret. Elle est sur les réseaux sociaux, dans les gâteaux d'anniversaire du
service, dans les documents administratifs qui circulent, et elle est devinable en une poignée d'essais quand on
connaît la personne. Un code PIN Windows Hello donne accès à la session, aux applications connectées et aux
certificats du poste : c'est un secret d'authentification, au même titre qu'un mot de passe.

La règle, simple à tenir :

- code PIN **aléatoire** à la création, jamais dérivé d'une donnée personnelle (naissance, téléphone, immatriculation,
  matricule) ;
- **transmis sur un canal différent** de celui de l'identifiant, et jamais dans le même mail que le nom du compte ;
- **changé à la première connexion**, avec vérification que le changement a bien eu lieu ;
- **jamais réutilisé** d'un collaborateur à l'autre — le PIN « de la maison » finit toujours par circuler à l'atelier.

:::caution
La même règle vaut pour le mot de passe initial et pour les codes de déverrouillage des téléphones professionnels.
Le jour où quelqu'un vous demande de « remettre le code habituel », vous avez la réponse : il n'y en a pas.
:::

## Ce qui se passe le jour J

Prévoyez un créneau de quinze minutes avec la personne, le matin de son arrivée, avant qu'elle disparaisse en
formation. Au programme : remise du matériel avec le formulaire de prise en charge signé, première connexion et
inscription du second facteur devant vous, rappel de la charte informatique, et une seule consigne à retenir — où et
comment ouvrir un ticket.

C'est le meilleur investissement de la semaine. Quinze minutes le premier jour évitent trois mois de questions posées
dans les couloirs, et fixent d'entrée le canal de la demande.

## Préparer la sortie dès l'entrée

La même fiche sert dans l'autre sens, et c'est pour cela qu'elle mérite d'être conservée. À la sortie : matériel
restitué et inventorié, compte **désactivé plutôt que supprimé** (la suppression emporte des choses que vous
récupérerez mal), méthodes MFA retirées, appareils mobiles déprovisionnés, boîte de messagerie conservée le temps
défini avec les RH puis transformée ou archivée, et transfert de propriété des fichiers avant tout le reste.

Une arrivée mal préparée coûte une matinée. Une sortie mal préparée coûte un compte actif oublié, et c'est la
première chose qu'un audit vous montrera.

## Pour aller plus loin

- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/),
  pour annoncer le passage au formulaire sans se faire ignorer.
- [Choisir un outil de ticketing pour une petite DSI](/docs/dsi/choisir-un-outil-de-ticketing-pour-une-petite-dsi/),
  si le ticket d'entrée n'a pas encore d'endroit où vivre.
- [Diagnostiquer l'état de jonction Entra d'un poste Windows](/docs/microsoft-365/diagnostiquer-jonction-entra-dsregcmd/),
  pour vérifier qu'un poste neuf est bien dans l'état de gestion attendu.

<!-- source : mail « Intégration nouveau collaborateur », 2026-08-31 → 2026-09-07 -->

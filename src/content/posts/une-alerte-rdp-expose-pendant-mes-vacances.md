---
title: "Une alerte « RDP exposé sur Internet » pendant mes vacances"
description: "Un vendredi de décembre, l'assureur cyber signale un port RDP ouvert sur la téléphonie. Je suis absent. Mes collègues gèrent, l'opérateur ferme le port, la téléphonie tombe. Ce que j'en ai retenu."
published: 2026-08-05
category: humeur
tags: [rdp, assurance-cyber, telephonie, firewalld, it-solo, contrat]
featured: false
---

Le 5 décembre 2025 était un vendredi. Je le sais parce que j'étais en congé, et que rien ne rend une date plus mémorable qu'un mail d'alerte reçu le jour où on a décidé de ne pas lire ses mails.

L'expéditeur : l'assureur cyber. Depuis avril, la police d'assurance de ma boîte inclut un service de scans externes hebdomadaires. Le principe est simple et un peu vexant : quelqu'un d'autre regarde votre façade depuis la rue et vous dit ce qui dépasse. Ce vendredi-là, ce qui dépassait, c'était un port RDP ouvert sur Internet, sur l'hôte de la téléphonie.

## Le mail que personne ne veut recevoir en décembre

Je vais être honnête : je ne l'ai pas vu tout de suite. Mes collègues, si. La RH et le responsable automatisme ont lu l'alerte, compris qu'il fallait faire quelque chose, et fait ce qu'il fallait : contacter l'opérateur qui maintient le pare-feu et demander la fermeture du port. C'est exactement ce que j'aurais demandé. Sans procédure écrite, sans moi, avec une alerte rédigée pour un informaticien, ils ont pris la bonne décision. Je le souligne parce que la suite est moins glorieuse et que ce n'est pas de leur faute.

## Ce que la correction a cassé

Quelques jours plus tard, la passerelle de téléphonie, une VM Linux qui fait le lien entre les téléphones et le monde extérieur, était « cassée ». Plus d'appels, plus d'accès SSH. Avec le spécialiste téléphonie de l'opérateur, on a fini par comprendre : pour répondre à l'alerte, l'intervention avait consisté à activer firewalld directement sur la VM. Sans règles. Un pare-feu sans règles, c'est une porte murée : plus rien ne rentre, plus rien ne sort, y compris ce qui devait passer.

La réparation a tenu en trois commandes, tapées depuis la console web de la VM dans vSphere, parce que c'est le seul chemin qui ne dépend pas du réseau :

```bash
sudo systemctl stop firewalld
sudo systemctl disable firewalld
sudo systemctl status firewalld
```

Au passage, mon serveur de prise en main à distance s'était retrouvé bloqué lui aussi. Rien de grave, mais une belle illustration : quand on filtre sur l'appliance plutôt qu'au périmètre, on ne coupe jamais seulement ce qu'on visait.

La leçon technique, je la formule comme ça : une exposition se corrige sur le pare-feu de périmètre, pas sur la machine exposée. Et on garde toujours un accès console hors bande, parce que le jour où le réseau ment, c'est la seule voix qui dit encore la vérité.

## La facture, ou l'équation impossible

Le port a été fermé. La téléphonie est revenue. Puis la facture est arrivée : le contrat de maintenance du pare-feu était « à l'acte ». Chaque demande, chaque intervention, une ligne. Sur le papier, c'est logique, on paie ce qu'on consomme. Dans la vraie vie d'un informaticien seul, c'est une incitation à ne pas demander. Et ne pas demander, en sécurité, ça porte un nom : laisser le port ouvert.

En avril, j'ai écrit à l'opérateur pour dire les choses simplement : à l'acte, quand on est seul, on nous assassine. J'ai demandé un forfait. Pas pour économiser, pour pouvoir décrocher le téléphone sans calculer. Un contrat forfaitaire est une mesure de sécurité, au même titre qu'un EDR : il supprime l'hésitation. Je n'avais jamais présenté un contrat de maintenance comme ça à une direction. Je le ferai désormais.

## Ce que j'ai changé depuis

Trois choses, dans l'ordre où elles sont arrivées.

D'abord la question de fond : pourquoi un port RDP était-il exposé sur un hôte de téléphonie ? Parce qu'un jour, quelqu'un en a eu besoin, et que personne n'est repassé derrière. Le vrai correctif n'a pas été de fermer le port, mais de rendre la question sans objet. Le projet réseau lancé début 2026 repose sur un principe simple : plus rien d'exposé. Les accès distants passent par un accès ZTNA, les prestataires par un bastion. On ne sécurise pas un port ouvert, on le supprime. En mai, le rapport de posture de l'assureur donnait la surface externe à 100 sur 100. Ce chiffre ne dit pas grand-chose en soi, mais il dit que le scan qui m'avait gâché un vendredi ne trouve plus rien à signaler.

Ensuite le contrat, demandé au forfait, avec l'argument ci-dessus.

Enfin la procédure. Fin juillet, avant mes congés d'été, j'ai écrit quelques pages pour le responsable automatisme et la RH : les portails, qui appeler, comment redémarrer une VM, dans quel ordre relancer les serveurs après une coupure. Avec une règle en gras : dans le doute, ne pas insister, appeler. Le vendredi de décembre m'avait appris que mes collègues prendraient la bonne décision. Il restait à leur donner de quoi la prendre sans casser la téléphonie.

Cette année, je pars avec une procédure, un lien de mots de passe à durée limitée, et un scan externe qui ne trouve rien. Je lirai quand même mes mails le vendredi. On ne se refait pas.

<!-- source : alerte de l'assureur cyber « RDP exposé publiquement », 2025-12-05 ; fil « passerelle téléphonie cassée », 2025-12-09 → 2025-12-11 ; échange contrat de maintenance à l'acte, 2026-04-13 -->

---
title: "Construire le dossier de décision d'un projet réseau et sécurité pour la direction"
description: "La structure qui a fait passer un projet SASE en PME : situation actuelle, coûts par poste, contexte géopolitique, solution, OPEX/CAPEX, projection 3 ans, lecture simplifiée, puis synthèse des économies."
published: 2026-04-02
updated: 2026-04-29
category: dsi
tags: [dsi, budget, gouvernance, sase]
level: intermédiaire
status: à jour
featured: false
sidebar:
  label: "Construire le dossier de décision d'un projet…"
---

Un projet réseau et sécurité ne se vend pas à une direction de PME avec un schéma d'architecture. Il se vend avec un dossier qui répond, dans l'ordre, aux questions qu'elle se pose vraiment : où en est-on, combien ça coûte aujourd'hui, qu'est-ce qui nous menace, qu'est-ce que vous proposez, combien ça coûte demain, et qu'est-ce que je dois décider. Entre fin février et début avril 2026, j'ai porté un dossier de ce type pour faire passer une refonte complète de l'accès Internet, de la sécurité périmétrique et des accès distants vers un SASE opéré. La réflexion durait depuis 2022. Le dossier, lui, a tenu en quelques pages, et c'est cette structure que je vous propose.

## Prérequis

- L'inventaire de vos contrats en cours : liens, pare-feux, licences, forfaits, hébergements, avec les dates d'échéance et les préavis.
- Un schéma de l'architecture actuelle, lisible par quelqu'un qui n'est pas du métier.
- Le coût mensuel ou annuel de chaque poste, extrait des factures et non des devis d'origine.
- Une proposition chiffrée du partenaire, avec les options séparées.

## Décrire la situation actuelle sans la juger

La première page est un état des lieux. Le schéma de l'architecture existante, et dessus, quatre croix rouges : les points faibles que le projet corrige. Pas dix, quatre. Chez nous, elles tournaient autour d'un accès Internet direct exposé, de VPN classiques inutilisables dans certains pays, d'accès prestataires qui reposaient sur des comptes VPN, et d'un hébergement intermédiaire avec ses propres pare-feux à maintenir.

En dessous, un tableau de coûts par poste. C'est le tableau que la direction lira le plus longtemps, parce qu'il traduit la technique en lignes de facture qu'elle reconnaît.

| Poste | Fournisseur | Coût actuel (indice) | Échéance |
| --- | --- | --- | --- |
| Accès Internet direct | Opérateur | 100 | Engagement en cours |
| Liaisons site distant | Opérateur | 40 | Sans engagement |
| Hébergement intermédiaire et pare-feux distants | Hébergeur | 35 | Annuel |
| Forfaits mobiles | Opérateur | 60 | Mensuel |
| Licences sécurité (filtrage mail, EDR) | Éditeurs | 50 | Annuel |

:::note
Les valeurs de ce tableau et des suivants sont des indices fictifs (100 = le poste le plus cher aujourd'hui), uniquement pour montrer la forme. Dans votre dossier, mettez les vrais montants, HT ou TTC selon ce que votre direction lit d'habitude, et dites lequel.
:::

## Poser le contexte que la direction ne connaît pas

La direction sait qu'il y a des cyberattaques. Elle ne sait pas nécessairement qu'un VPN classique ne passe plus dans certains pays où vos commerciaux ou vos techniciens se déplacent, ni que le régulateur russe des télécoms bloque des protocoles entiers. Ce paragraphe ne doit pas faire peur, il doit rendre concret : « aujourd'hui, un technicien en déplacement dans tel pays ne peut pas ouvrir nos fichiers ». Une phrase comme celle-là vaut plus qu'un rapport de menace.

C'est aussi là qu'on explique, en une ligne, ce qu'est un accès « non exposé par conception » : aujourd'hui, notre pare-feu écoute sur Internet et attend d'être attaqué ; demain, plus rien n'écoute, ce sont nos postes qui vont chercher le service. Comme une banque qui fermerait son guichet sur rue et ne recevrait plus que sur rendez-vous.

## Décrire la solution en une phrase, puis en détail

Une phrase d'abord : « un accès Internet et des accès distants opérés par un prestataire de sécurité, avec un agent sur chaque poste, un bastion pour les prestataires, et plus aucun service exposé sur notre adresse publique ». Ensuite seulement le détail : SASE et ZTNA, agent Always-On, bastion pour les intervenants externes, supervision par un SOC, et ce que ça change pour l'utilisateur (rien, ou presque : un client VPN en moins).

Résistez à l'envie de mettre le schéma cible en premier. Il vient après la phrase, comme illustration, pas comme argument.

## Chiffrer en OPEX et en CAPEX, puis projeter sur trois ans

C'est le cœur du dossier, et c'est ce qui prend le plus de temps à construire proprement.

1. **Séparer les options.** Le partenaire propose souvent un abonnement (OPEX) et un achat de matériel amorti (CAPEX). Présentez les deux, avec ce que chacun implique en trésorerie et en engagement.
2. **Projeter sur trois ans**, parce que c'est la durée d'engagement typique et parce qu'un projet réseau coûte plus cher la première année : mise en service, cohabitation, doublon de liens pendant la bascule.
3. **Mettre côte à côte** la situation actuelle prolongée trois ans et la situation cible sur trois ans. La colonne « différence » est la seule que la direction lira.

| Année | Situation actuelle prolongée (indice) | Solution cible (indice) | Différence |
| --- | --- | --- | --- |
| 1 | 100 | 115 | +15 (mise en service, cohabitation) |
| 2 | 100 | 75 | -25 |
| 3 | 100 | 70 | -30 |
| Total | 300 | 260 | -40 |

Ce tableau a une vertu : il montre honnêtement que la première année coûte plus cher. Une direction qui découvre le surcoût de l'année 1 après la signature ne vous fera plus confiance pour le projet suivant.

:::tip
Datez les optimisations que vous choisissez de ne pas faire tout de suite. Dans mon dossier, plusieurs suppressions (forfaits du bureau à l'étranger, hébergement intermédiaire, ancien serveur de messagerie) étaient volontairement reportées après la mise en production de la première brique. La formule que j'ai utilisée : je préfère attendre que la première partie soit totalement en place pour éviter de payer un service inutilisé. Une direction comprend très bien qu'on ne commande pas la deuxième étape avant d'avoir livré la première.
:::

## Écrire la lecture simplifiée

Le dossier se termine par une page intitulée « lecture simplifiée pour la direction ». Cinq lignes : ce qu'on a, ce qui ne va pas, ce qu'on propose, ce que ça coûte, ce que je vous demande. Si votre dirigeant ne lit que cette page, il doit pouvoir décider. Si un membre du comité veut vérifier un chiffre, les pages précédentes sont là.

Cette logique « version courte, version longue » est devenue ma règle pour tout ce qui remonte à la direction. Elle est détaillée dans [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/).

## Rendre compte après la commande

Un mois après la validation, j'ai envoyé une « synthèse des économies réalisées et perspectives d'optimisation » au dirigeant, direction adjointe en copie. Même principe : une version courte en tête de mail, une version longue en dessous.

- **Ce qui est déjà acquis** : les postes dont le coût a effectivement baissé, avec la date d'effet.
- **Ce qui vient** : les suppressions planifiées, chacune avec sa condition de déclenchement (« après la mise en production de X »).
- **Ce qui a été volontairement différé**, et pourquoi.
- **Ce qui reste à surveiller** : les préavis, les pénalités de résiliation anticipée, les échéances de renouvellement.

Un détail qui n'en est pas un : demandez à votre fournisseur des intitulés de facture précis. Une ligne « cyberdéfense » ne permet pas de suivre quoi que ce soit dans le temps. Une ligne par service, avec le même libellé que dans votre tableau, rend la synthèse suivante triviale à produire.

:::caution
Ne promettez jamais une économie sur un poste dont vous ne maîtrisez pas la date de résiliation. Un engagement de 36 mois découvert après coup transforme une économie annoncée en surcoût, et c'est vous qui l'aurez annoncée.
:::

## Pour aller plus loin

- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/), pour la version courte.
- [Copieur : location ou achat, le calcul du TCO](/docs/dsi/copieur-location-ou-achat-calcul-tco/), le même raisonnement OPEX/CAPEX sur un sujet plus petit.
- [Du MPLS au SASE : ce que personne ne vous dit avant la bascule](/blog/du-mpls-au-sase-ce-que-personne-ne-vous-dit/), pour ce qui s'est passé une fois le dossier validé.

<!-- source : mails « Projet stratégique – Sécurisation internationale & optimisation financière via Micro-SOC Shield » 2026-02-27 → 2026-03-10, « Synthèse des économies réalisées et perspectives d'optimisation » 2026-04-01, demande d'intitulés de facture 2026-04-28 -->

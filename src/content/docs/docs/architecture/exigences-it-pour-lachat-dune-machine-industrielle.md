---
title: "Les exigences informatiques à imposer avant d'acheter une machine industrielle"
description: "OS avec une fin de support qui couvre la vie de la machine, base de données non bridée, interface OPC UA, identités dans l'annuaire, VLAN dédié : la grille d'exigences à écrire avant le bon de commande."
published: 2026-05-06
category: architecture
tags: [ot, industrie, ltsc, opc-ua, achats, cahier-des-charges]
level: avancé
status: à jour
featured: false
sidebar:
  label: "Les exigences informatiques à imposer avant…"
---

Printemps 2026, une offre arrive sur mon bureau : un système de stockage et de manutention automatisé, un investissement lourd, prévu pour durer bien plus longtemps qu'un poste de travail. Le bureau d'études me demande un avis sur « la partie informatique ». Je lis les vingt pages, et je retrouve les cinq mêmes problèmes que sur toutes les offres de machines depuis dix ans.

Ce n'est pas de la mauvaise foi de la part du fournisseur. C'est une question de métier : **il vend une machine, pas un système d'information**. L'informatique embarquée a été figée le jour où la machine a été conçue, elle est traitée comme un accessoire, et personne chez lui n'a pour mission de savoir combien de temps un système d'exploitation reste corrigé.

Le problème, c'est que la machine, elle, va vivre des années dans votre atelier, branchée sur votre réseau. Si la DSI n'écrit pas ses exigences **avant** la commande, elle les paiera après — en migration non prévue, en poste isolé qu'on ne peut plus mettre à jour, ou en incident de sécurité.

Voici la grille que j'utilise, point par point, avec la formulation à mettre dans le cahier des charges.

## Prérequis : ce qu'il faut obtenir du fournisseur avant de répondre

- La **version exacte** du système d'exploitation embarqué, édition comprise (le mot « Windows 10 » ne suffit pas).
- Le **moteur de base de données** et son édition, avec les limites de cette édition.
- Le **protocole d'échange** avec vos applications, et sa documentation.
- Le **schéma réseau** du fournisseur : ce qu'il branche, où, et ce qu'il veut joindre depuis l'extérieur.
- Le **mode d'authentification des opérateurs**.
- La **durée de vie et l'amortissement** prévus pour la machine, en années.

Ce dernier point est celui qui arbitre tous les autres.

## Exiger un OS dont la fin de support couvre la vie de la machine

L'offre que j'ai lue livrait Windows 10 LTSB 2016 — fin de support **13 octobre 2026**, c'est-à-dire avant la fin de la première année d'exploitation. La machine serait entrée en production avec un système déjà mort.

Le piège tient dans deux noms presque identiques. Une édition « Entreprise LTSC » et une édition « **IoT** Entreprise LTSC » se ressemblent, coûtent à peu près la même chose pour un fournisseur, et n'ont pas du tout le même horizon de support.

| Édition | Fin de support |
| --- | --- |
| Windows 10 Entreprise LTSC 2021 | 12/01/2027 |
| Windows 10 IoT Entreprise LTSC 2021 | 13/01/2032 |
| Windows 11 Entreprise LTSC 2024 | 09/10/2029 |
| Windows 11 IoT Entreprise LTSC 2024 | 10/10/2034 |

Cinq ans d'écart entre deux lignes du même tableau. Sur un équipement de production, c'est la déclinaison **IoT Entreprise LTSC** qu'il faut demander : c'est la seule dont l'horizon est compatible avec un amortissement industriel.

:::caution
Ne vous contentez pas d'une promesse de « mise à jour possible ». Demandez qui la fait, qui la paie, qui revalide la machine après, et sous quel délai. Une mise à jour d'OS sur une machine industrielle, c'est une intervention du constructeur, pas un `Windows Update`.
:::

## Vérifier ce que la base de données « gratuite » sait faire

La même offre embarquait un moteur propriétaire en édition gratuite. Ces éditions sont bridées, et les limites sont publiques. À titre indicatif, pour la génération concernée : deux threads de processeur, deux gigaoctets de mémoire, douze gigaoctets de données utilisateur, une seule base, ni cluster ni réplication. La génération précédente était limitée à un processeur, un gigaoctet de mémoire et onze gigaoctets de données.

Trois questions à poser, dans cet ordre :

1. **Quel volume de données la machine produit-elle par an ?** Multipliez par la durée de vie. Si vous dépassez la limite en année sept, vous avez un problème en année sept.
2. **Que se passe-t-il quand la limite est atteinte ?** Refus d'écriture, purge automatique, arrêt de la machine ? Faites écrire la réponse.
3. **Qui paie la licence le jour où il faut passer en édition payante ?** Si ce n'est pas écrit, ce sera vous.

## Exiger une interface normalisée plutôt qu'un protocole maison

L'échange avec la supervision se faisait par « télégrammes » propriétaires. Ça fonctionne, jusqu'au jour où vous voulez brancher un autre outil : chaque connexion devient un développement spécifique, facturé, et dépendant d'un seul fournisseur.

Demandez **OPC UA**, qui est la norme du domaine. À défaut, exigez au minimum la documentation complète et versionnée du format d'échange, livrée avec la machine et non « sur demande ». Une spécification qu'on ne peut pas lire n'existe pas.

## Rattacher les identités à l'annuaire

Sur l'offre analysée, les opérateurs s'authentifiaient par badge RFID, avec une base de badges interne à la machine — hors annuaire. Conséquences immédiates : aucune traçabilité nominative fiable, aucune révocation centralisée, et un départ de salarié qui laisse un badge actif dans un coin de l'atelier.

Exigez un raccordement à l'annuaire d'entreprise (LDAP ou équivalent). Si le fournisseur ne sait pas faire, exigez alors une **procédure de révocation écrite**, un export des badges actifs, et le nom du responsable de cette liste chez vous. Ce n'est pas une exigence de confort : c'est ce qui vous permettra de répondre à un audit.

## Imposer le réseau : VLAN dédié, DMZ industrielle, pare-feu

Le réflexe du fournisseur est de brancher sa machine « à plat » sur le réseau d'entreprise, parce que c'est ce qui marche partout. C'est aussi ce qui met un système d'exploitation non corrigé au contact direct de la bureautique.

Ce qu'il faut écrire au contrat : un **VLAN dédié** à l'îlot machine, une **DMZ industrielle** pour les échanges avec le système d'information, un **pare-feu** entre les deux avec des flux nommés, et une télémaintenance qui passe par un accès maîtrisé de votre côté — pas par un modem posé dans l'armoire.

## La grille à coller dans le cahier des charges

| Domaine | Exigence à écrire | Preuve à demander |
| --- | --- | --- |
| Système d'exploitation | Édition dont la fin de support couvre la durée d'amortissement (IoT Entreprise LTSC) | Nom exact de l'édition et date de fin de support |
| Mises à jour | Qui applique, qui revalide, sous quel délai, à quel prix | Procédure écrite et engagement de délai |
| Base de données | Édition non bridée, ou limites compatibles avec le volume sur toute la vie | Limites de l'édition livrée et volumétrie annuelle estimée |
| Débordement de licence | Prise en charge du passage en édition payante | Clause de prise en charge nommée |
| Interface applicative | OPC UA, ou format documenté et versionné | Spécification livrée avec la machine |
| Identités | Authentification adossée à l'annuaire | Description du mécanisme, ou procédure de révocation |
| Réseau | VLAN dédié, DMZ industrielle, pare-feu, flux nommés | Schéma réseau du fournisseur et liste des flux |
| Télémaintenance | Accès sortant maîtrisé, tracé, coupable à volonté | Description technique de l'accès distant |
| Antivirus / EDR | Compatibilité déclarée, ou justification écrite du refus | Position écrite du fournisseur |
| Sauvegarde | Ce qui est sauvegardé, par qui, et comment on restaure | Procédure de restauration testée à la réception |

:::tip
Envoyez cette grille au bureau d'études, pas au fournisseur, et faites-la intégrer à la consultation. Une exigence formulée après la signature s'appelle une demande d'évolution, et elle a un prix.
:::

## Une dernière chose

Ces questions ne sont pas des questions d'informaticien tatillon. Ce sont les mêmes que celles qu'on pose pour un bâtiment : quelle durée de vie, quelle maintenance, quel accès, qui répare. Personne ne trouverait normal d'acheter un bâtiment sans savoir combien de temps la toiture est garantie. Sur une machine industrielle, la question de la toiture, c'est la date de fin de support du système d'exploitation.

## Pour aller plus loin

- [Réseaux machines industrielles : ne jamais mélanger réseau machine, télémaintenance et LAN bureautique](/docs/architecture/segmenter-les-reseaux-machines-industrielles/) : la mise en œuvre concrète de la ligne « réseau » de la grille.
- [Un PC de cellule qui démarre en boucle : récupérer les données, puis décider](/docs/microsoft/pc-industriel-en-boucle-de-demarrage-recuperer-les-donnees/) : ce qui arrive dix ans plus tard quand la grille n'a pas été écrite.
- [Le fournisseur vend une machine, pas un système d'information](/blog/le-fournisseur-vend-une-machine-pas-un-systeme-dinformation/) : le retour d'expérience derrière cette fiche.

<!-- source : synthèse technique « analyse de l'offre machine industrielle », 2026-04-29 → 2026-05-06 -->

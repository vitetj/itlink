---
title: "Le fournisseur vend une machine, pas un système d'information"
description: "Une offre de machine industrielle arrive avec son informatique embarquée : OS en fin de support avant la première année, base bridée, protocole maison, badges hors annuaire. Ce qu'il faut exiger avant de commander."
published: 2026-05-12
category: humeur
tags: [it-ot, industrie, ltsc, achats, cybersecurite, fournisseurs]
featured: true
---

Fin avril, le bureau d'études me transmet une offre pour un système de stockage et de manutention automatisé. Belle machine, gros investissement, planning d'installation déjà esquissé. On me demande un avis « rapide sur la partie informatique », ce qui, traduit, signifie : dis-nous que c'est bon.

J'ai mis une semaine. Pas parce que le dossier était mauvais — techniquement, la machine est excellente. Parce que la partie informatique du dossier tenait en une page et demie, et que cette page et demie engageait mon réseau, mon annuaire, ma sauvegarde et ma responsabilité pour les quinze prochaines années.

## Ce qu'il y avait vraiment dans l'offre

Quatre lignes, quatre problèmes, aucun signalé comme tel.

Le poste de pilotage était livré avec un système d'exploitation en édition à support étendu, millésime 2016. Fin de support : octobre 2026. La machine devait être mise en service courant 2026. Autrement dit, le système fourni tombait hors support **avant la fin de la première année d'exploitation**, sur un équipement amorti sur dix ou quinze ans.

La base de données était livrée en édition gratuite d'un moteur propriétaire. Ces éditions sont bridées, et c'est parfaitement légitime : à titre indicatif, on parle de deux fils d'exécution processeur, deux gigaoctets de mémoire, une douzaine de gigaoctets de données et une seule base, sans réplication ni cluster. Rien de honteux, c'est écrit dans la documentation de l'éditeur. Simplement, personne n'avait vérifié si le volume de données produit par la machine tenait dans ces limites sur toute sa durée de vie, ni prévu qui paierait la licence le jour où ça déborderait.

Les échanges avec le reste du monde se faisaient par « télégrammes » propriétaires. Un format maison, documenté nulle part dans l'offre, qui devient l'unique porte d'entrée pour toute intégration future avec la gestion de production.

Enfin, les opérateurs s'authentifiaient par badge sans contact, avec une base de badges interne à la machine, sans aucun lien avec l'annuaire d'entreprise. Traduction opérationnelle : aucune traçabilité nominative fiable, et aucune révocation centralisée le jour où quelqu'un quitte l'entreprise.

## Le tableau que le fournisseur ne montre pas

Le point du système d'exploitation mérite un arrêt, parce que c'est le plus facile à corriger et le plus coûteux à laisser passer. Deux éditions au nom presque identique n'ont pas du tout le même horizon.

| Édition | Fin de support |
| --- | --- |
| Windows 10 Entreprise LTSC 2021 | 12/01/2027 |
| Windows 10 IoT Entreprise LTSC 2021 | 13/01/2032 |
| Windows 11 Entreprise LTSC 2024 | 09/10/2029 |
| Windows 11 IoT Entreprise LTSC 2024 | 10/10/2034 |

Cinq ans d'écart entre deux lignes qui ne diffèrent que par trois lettres. Sur une machine de production, c'est la déclinaison IoT qu'il faut demander, et c'est probablement la clause la plus rentable de tout le contrat : elle ne coûte rien à écrire avant la commande, et elle vaut une migration entière si on l'oublie.

Je précise, parce que c'est la première objection : le fournisseur n'est pas malhonnête. Il livre le système sur lequel son logiciel est qualifié, celui qu'il a validé en interne, et il le fera très bien. Il n'a simplement aucune raison de se demander ce qui se passera chez moi en 2031. Ce n'est pas son métier. Il vend une machine.

## La règle que j'en tire

Un fournisseur de machine industrielle vend une machine. L'informatique embarquée est pour lui un accessoire, au même titre que le carter ou la peinture : quelque chose qui doit fonctionner à la réception, pas quelque chose qui vit.

Nous, en face, on n'achète pas une machine. On achète un nouvel équipement dans notre système d'information, avec un système d'exploitation à maintenir, une base à sauvegarder, un flux réseau à filtrer et des identités à gérer. Personne dans la chaîne d'achat ne fait spontanément cette traduction, et surtout pas au moment de la négociation commerciale, où le sujet informatique passe pour un détail qui va faire perdre trois semaines.

D'où la synthèse que j'ai envoyée au bureau d'études, en cinq exigences à faire entrer dans le cahier des charges avant la commande :

- **Système d'exploitation** dont la fin de support couvre la durée de vie prévue de la machine, avec la référence exacte de l'édition écrite dans l'offre, pas « la dernière version ».
- **Base de données** dimensionnée sur le volume à dix ans, et clause écrite précisant qui prend en charge la licence si les limites de l'édition fournie sont dépassées.
- **Interface normalisée** pour les échanges, OPC UA de préférence, ou à défaut la documentation complète et publique du format propriétaire.
- **Identités raccordées à l'annuaire**, ou, si c'est techniquement impossible, une procédure de révocation écrite et testée à la réception.
- **Réseau** : VLAN dédié, zone démilitarisée industrielle, pare-feu entre l'îlot machine et la bureautique. Le fournisseur ne pose pas sa machine à plat sur le réseau d'entreprise, et son accès de télémaintenance non plus.

## Ce que ça coûte de ne pas l'écrire

Rien, sur le moment. C'est bien le problème.

Ces cinq lignes, écrites avant la commande, sont des points de négociation ordinaires. Le fournisseur les intègre, chiffre éventuellement un supplément, et tout le monde signe en connaissance de cause. Écrites après la commande, ce sont des demandes d'évolution, facturées comme telles, quand elles sont encore possibles. Écrites après la mise en service, ce ne sont plus des exigences : ce sont des regrets, et ils se paient en projets de migration sur un équipement qui tourne en trois-huit et qu'on n'a le droit d'arrêter qu'en août.

J'ai déjà vu à quoi ressemble l'étape suivante : un poste sous un système hors support depuis des années, isolé du réseau à coups de règles de pare-feu, qu'on n'ose plus toucher parce que le fournisseur a disparu et que la ligne, elle, tourne encore. Ça marche. Jusqu'au jour où ça ne marche plus, et là il n'y a plus personne à appeler.

Alors oui, poser ces questions rallonge la consultation. Oui, ça agace le commercial, et parfois le bureau d'études. Mais c'est la seule fenêtre où mon avis a un poids : entre la réception de l'offre et la signature. Après, je ne suis plus un interlocuteur. Je suis juste celui qui devra faire tenir tout ça, avec les moyens du bord, pendant quinze ans.

La phrase que je garde pour résumer tout le dossier tient en une ligne, et je la ressors à chaque consultation : le fournisseur vend une machine, pas un système d'information. Si la DSI n'écrit pas ses exigences avant la commande, elle les paiera après.

<!-- source : analyse d'une offre de machine industrielle, 2026-04-29 ; synthèse technique envoyée au bureau d'études, 2026-05-06 -->

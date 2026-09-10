---
title: "Dimensionner les onduleurs d'une petite salle serveur : autonomie, ATS, PDU et contrat de maintenance"
description: "Relever la consommation réelle, choisir entre 9PX et 93PX, doubler les onduleurs par baie, protéger les équipements mono-alimentés avec un ATS et négocier le contrat : la méthode suivie pour trois baies."
published: 2026-04-28
category: architecture
tags: [onduleur, eaton, salle-serveur, ats, pdu, vxrail]
level: intermédiaire
status: à jour
featured: false
tested_on: [Eaton 9PX 6000i RT3U, Eaton 93PX 15 kW RT9U, Dell VxRail E560F, iDRAC 9]
---

Le 3 septembre 2025, le courant est tombé quatre fois dans la journée. La première coupure, l'onduleur l'a
encaissée. La deuxième aussi, mais il n'avait pas eu le temps de recharger. À la troisième, le cluster VxRail
a envoyé un dial-home à Dell tout seul, vSAN a signalé un disque au-delà de 80 % et ma soirée y est passée.
En juin 2026, une série de micro-coupures a remis ça : trois serveurs à relancer à la main, deux VM qui
refusent de redémarrer seules, la GPAO à rallumer.

Une salle serveur ne vaut que ce que vaut son alimentation. On investit dans un cluster redondant sur deux
salles, avec un witness et des disques en miroir, et tout ça tient sur des batteries achetées il y a dix ans
et jamais testées. Une voiture de course avec des pneus de tondeuse.

Voici la méthode suivie entre février et avril 2026 pour ré-équiper trois baies : consommation, topologie,
distribution, partie électrique, devis, puis passage devant la direction et le CSE. Sans les montants, qui
dépendent trop de votre négociation.

## Prérequis

- Un accès aux iDRAC (ou équivalent) des serveurs, et aux PDU si elles sont administrables.
- Les fiches techniques de tout ce qui est dans les baies, du serveur au boîtier SASE.
- Un électricien disponible pour une visite de la salle.
- Du temps : deux mois entre le premier devis et la commande.

## Relever la consommation réelle

Ne partez pas de la puissance nominale des alimentations. Un serveur équipé de deux blocs de 750 W ne
consomme pas 1 500 W ; il consomme ce que ses composants tirent, plus une pointe au démarrage. C'est cette
pointe qui compte : au retour du courant, tout redémarre en même temps et l'onduleur est au maximum.

Sur un PowerEdge, l'iDRAC affiche la consommation instantanée, moyenne et crête dans la section Power. En
ligne de commande, pour l'extraire sur tous les nœuds d'un coup :

```bash title="Relever la consommation d'un nœud avec racadm"
racadm -r 192.0.2.21 -u root -p '<mot de passe iDRAC>' getsensorinfo
```

Pour le reste (switch, NAS, librairie de bandes, firewall), prenez la valeur mesurée par la PDU, sinon la
fiche constructeur. Sur un switch PoE, comptez le budget PoE réellement consommé, pas le maximum.

Additionnez baie par baie, puis ajoutez 30 % de marge. Exemple réel, sur une baie vidéosurveillance en
2024 : un NAS autour de 236 W et un switch PoE autour de 532 W avec ses caméras ; le total avec marge
tombait autour du kilowatt, et j'ai retenu un onduleur de 2 kVA en ligne pour garder de l'autonomie et de
la place. Le passage des watts aux VA se fait avec le facteur de puissance indiqué sur la fiche de
l'onduleur ; les modèles récents sont proches de 1.

## Choisir la topologie

Pour des serveurs, la seule topologie qui vaut est l'**online double conversion** : la charge est alimentée
en permanence par l'onduleur, qui reconstruit une sinusoïde propre. Les modèles « line-interactive » ne
basculent qu'en cas de coupure, et ces quelques millisecondes font tousser une alimentation de serveur.

Chez Eaton, deux gammes couvrent une petite salle :

| Gamme | Puissance | Format | Pour quoi |
| --- | --- | --- | --- |
| 9PX 6000i RT3U | ~6 kVA | Rack 3U, convertible tour | Baie réseau et sauvegarde, baie peu chargée |
| 93PX 15 kW RT9U | 15 kW | Rack 9U | Baie de nœuds hyperconvergés |

L'autonomie se règle avec des modules de batteries externes (EBM). Ne visez pas des heures : le temps de
laisser passer une micro-coupure, puis d'arrêter proprement les hôtes. Sur un cluster vSAN, un arrêt propre
vaut mieux qu'une extinction brutale.

La configuration retenue chez moi, sur trois baies :

| Baie | Onduleurs | Batteries externes |
| --- | --- | --- |
| Serveurs, salle 1 | 2 × 93PX 15 kW | non |
| Serveurs, salle 2 | 2 × 93PX 15 kW | 1 EBM |
| Sauvegarde et réseau | 2 × 9PX 6000i | 1 EBM |

:::note
Ne comptez pas trouver de l'Eaton chez Dell, qui ne revend que du Schneider : si votre parc est déjà
Eaton, direction un distributeur.
:::

## Prévoir la redondance et la distribution

Deux onduleurs par baie, un par chemin d'alimentation. Chaque serveur a deux blocs : le bloc A sur
l'onduleur A, le bloc B sur l'onduleur B. Si un onduleur tombe ou part en maintenance, la baie continue sur
l'autre.

Le problème, ce sont les équipements à une seule alimentation : switch d'accès, NAS, boîtier SASE. Pour
ceux-là, on intercale un **ATS** (Automatic Transfer Switch), ici un EATS16 en 16 A : deux entrées, une
sortie, bascule de A vers B en quelques millisecondes. Une multiprise avec un cerveau.

Côté distribution, deux types de PDU :

- des **FlexPDU** (EFLX8F), la barrette simple, pour prolonger les sorties d'un onduleur ;
- des **PDU G4** (EVMAF132A), administrables, pour mesurer la consommation par baie et couper une prise à
  distance.

Ajoutez les kits de rails (9RK) au devis : un onduleur de 9U sans rails est un onduleur posé par terre.

## Vérifier l'électrique avec l'électricien

Un 93PX 15 kW ne se branche pas sur une prise murale. Avant de commander, faites passer l'électricien avec
la liste des équipements et vérifiez :

- les prises industrielles **IEC 60309** nécessaires en entrée, leur calibre et leur position ;
- un **disjoncteur dédié** par onduleur au tableau, pour qu'un défaut sur une baie ne coupe pas les autres ;
- les longueurs de câbles entre tableau, onduleurs et baies ;
- la ventilation : les batteries n'aiment pas la chaleur, et les onduleurs en ajoutent.

## Superviser et arrêter proprement

Un onduleur sans carte réseau est un onduleur muet. Les cartes Netpack G2 apportent la supervision SNMP,
les alertes mail et l'intégration avec vCenter via le logiciel Eaton (IPM) pour arrêter proprement VM puis
hôtes quand la batterie passe sous un seuil.

Deux réglages :

- une **alerte sur le niveau de charge**. Le 3 septembre 2025, la deuxième coupure a trouvé un onduleur à
  moitié rechargé. Un onduleur qui n'a pas rechargé est un onduleur absent ;
- un **test de batterie planifié**, mensuel, avec le résultat envoyé par mail.

:::caution
L'arrêt automatique se teste, un samedi, avec le runbook de redémarrage sous la main. Un script qui coupe
les contrôleurs de domaine avant l'ERP vous fera perdre plus de temps qu'une coupure franche.
:::

## Comparer les devis et négocier le contrat

J'ai fait chiffrer la même configuration par l'intégrateur historique et par un distributeur de matériel
électrique de la région. L'écart était important, à références identiques : le distributeur vend de l'Eaton
toute la journée, l'intégrateur le revend. Deux devis, comparaison ligne à ligne, négociation avec le mieux
placé.

Le contrat de maintenance mérite autant d'attention que le matériel. Chez Eaton, l'offre « Multichoix »
existe en trois niveaux (Standard, Advanced, Premium) ; les différences portent sur le délai d'intervention
et sur l'inclusion des batteries de remplacement. Posez la question telle quelle : « si une batterie lâche
dans trois ans, qui paie ? ».

## Convaincre la direction et le CSE

Le projet est passé devant le CSE en mars 2026, avec deux questions légitimes : pourquoi les serveurs et
pas les postes ? pourquoi maintenant ? Ce qui a fonctionné :

- **Les onduleurs sont réservés aux serveurs.** Un poste qui s'éteint redémarre ; un serveur qui s'éteint
  brutalement peut perdre des données, et sur vSAN la resynchronisation qui suit fait mal.
- **La garantie constructeur en dépend.** Dell conditionne la prise en charge de certaines pannes à une
  alimentation protégée.
- **L'assureur cyber regarde aussi la disponibilité.** La continuité fait partie de son questionnaire.
- **Pas d'onduleur général d'atelier**, sauf pour les machines d'usinage sensibles aux coupures : le reste
  de l'usine redémarre sans conséquence.

## Les pièges rencontrés

- **L'onduleur qui n'a pas rechargé.** Surveillez la charge, pas seulement la présence secteur.
- **Les équipements hors onduleur.** Faites l'inventaire physique des prises, baie par baie, avant de
  dimensionner ; on en découvre toujours après coup.
- **Les VM qui ne redémarrent pas seules.** Une licence anti-copie, un logiciel comptable : notez-les dans
  le runbook.
- **Les rails, l'ATS, la prise IEC 60309 oubliés** : une semaine de retard chacun.

## Pour aller plus loin

- [Runbook : redémarrer une infrastructure virtualisée après coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/) :
  ce qui se passe quand l'onduleur n'a pas suffi.
- [Quand l'informaticien est absent : la procédure de remplacement](/docs/dsi/procedure-de-remplacement-it-pendant-une-absence/) :
  la version pour vos collègues.
- [Mesurer la consommation électrique avec Home Assistant et Matter](/lab/home-assistant-mesurer-la-consommation-electrique-avec-matter/) :
  la même démarche de mesure, à la maison.

<!-- source : mails « Onduleurs salle serveur — devis », 2026-02-27 → 2026-04-23 ; « Explications onduleurs CSE », 2026-03-10 ; « Onduleur vidéosurveillance 2 kVA », 2024-06 ; « Coupures électriques / dial-home », 2025-09-03 ; « Retour micro-coupures », 2026-06-24 -->

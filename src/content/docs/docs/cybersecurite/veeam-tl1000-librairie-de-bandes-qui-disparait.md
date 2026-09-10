---
title: "Veeam et Dell PowerVault TL1000 : diagnostiquer une librairie de bandes qui disparaît"
description: "Lecteur LTO8 en erreur après vingt minutes d'inactivité, librairie Offline dans Veeam puis absente de Windows : la checklist croisée Veeam/Dell, du driver Medium Changer à l'échange matériel."
published: 2025-09-01
updated: 2026-01-20
category: cybersecurite
tags: [veeam, sauvegarde, lto, dell, tape, windows-server]
level: avancé
status: à jour
featured: true
tested_on: [Veeam Backup & Replication 12 Essentials Enterprise, Veeam Backup & Replication 13, Windows Server, Dell PowerEdge R740XD, Dell PowerVault TL1000 LTO8 SAS]
sidebar:
  label: "Veeam et Dell PowerVault TL1000"
---

En août 2025, Veeam m'a remonté un « Critical tape drive alert ». Rien de dramatique sur le papier : un lecteur qui râle. Sauf que le lecteur LTO8 SAS de ma librairie Dell PowerVault TL1000 passait en erreur après une vingtaine de minutes d'inactivité, que la librairie basculait alors en Offline dans Veeam, puis disparaissait purement et simplement de Windows. Plus de robot, plus de lecteur, plus de sauvegarde sur bande.

Deux dossiers de support en parallèle, chez Veeam et chez Dell, plusieurs semaines d'allers-retours, une librairie de remplacement reçue... et la panne toujours là. Voici la checklist que j'aurais aimé avoir dès le premier jour, parce que chaque support vous fera refaire les étapes de l'autre.

Pourquoi s'acharner sur une bande en 2025 ? Parce que la bande est la copie hors ligne. Le disque de sauvegarde est dans la maison ; la bande, c'est le coffre à la banque. Un ransomware qui chiffre le serveur de sauvegarde ne chiffre pas une cartouche rangée dans une armoire.

## Prérequis

- Un accès administrateur au serveur de bandes (chez moi, un PowerEdge R740XD sous Windows Server, avec Veeam Backup & Replication 12).
- La console Veeam et, idéalement, l'accès iDRAC du serveur pour les diagnostics matériels.
- Une cartouche de nettoyage et une cartouche vierge de rechange.
- Des contrats de support à jour des deux côtés : Veeam pour le logiciel, Dell ProSupport pour la TL1000. Vous aurez besoin des deux, et ils vont se renvoyer la balle.

## Comprendre la chaîne avant de toucher à quoi que ce soit

Veeam ne parle pas directement à la TL1000. Trois couches s'empilent, et c'est la première chose que j'ai dû réexpliquer aux deux supports :

| Couche | Ce qu'elle expose | Où regarder |
| --- | --- | --- |
| Matériel | Le robot (bras et magasins), le lecteur LTO8, le câble SAS, la carte HBA | Panneau avant, interface web de la TL1000, diagnostics Dell |
| Windows | Un périphérique « Medium Changer » (le robot) et un ou plusieurs « Tape Drive » (les lecteurs) | Gestionnaire de périphériques, journal Système |
| Veeam | Le Veeam Tape Access Service pilote les périphériques exposés par Windows | Console Veeam, vue Tape Infrastructure |

Si Windows perd la communication avec le changeur ou le lecteur, Veeam constate l'absence et passe la librairie en Offline. Autrement dit : une alerte Veeam est souvent un problème Windows, et un problème Windows est souvent un problème matériel. On remonte la chaîne de bas en haut.

Pour voir ce que Windows voit réellement :

```powershell title="Périphériques de bande vus par Windows"
Get-PnpDevice -PresentOnly |
  Where-Object { $_.Class -in 'TapeDrive', 'MediumChanger' } |
  Select-Object Class, FriendlyName, Status
```

Si le Medium Changer n'apparaît plus alors que la librairie est allumée, inutile de relancer un job Veeam : il n'a rien à piloter.

## Vérifier les drivers, le Medium Changer d'abord

C'est la première anomalie que j'ai trouvée chez moi : le changeur utilisait un driver IBM. La recommandation, confirmée par le support, est d'utiliser le driver Microsoft générique « Unknown Medium Changer » pour le robot, et de réserver les drivers Dell/IBM aux lecteurs.

1. Ouvrez `devmgmt.msc` et dépliez « Changeurs de médias ».
2. Clic droit sur le périphérique, « Mettre à jour le pilote », « Rechercher des pilotes sur mon ordinateur », « Choisir parmi une liste de pilotes disponibles ».
3. Sélectionnez « Unknown Medium Changer » (éditeur Microsoft).
4. Redémarrez le service de bandes Veeam, puis relancez un rescan de la librairie depuis la console.

```powershell title="Redémarrer le service de bandes Veeam"
Get-Service -DisplayName 'Veeam*Tape*' | Restart-Service
Get-Service -DisplayName 'Veeam*Tape*'
```

:::note
Pourquoi un driver générique pour le robot ? Parce qu'il ne fait que déplacer des cartouches : les commandes sont standardisées et Microsoft les gère très bien. Le lecteur, lui, embarque des fonctions propres au constructeur (compression, chiffrement, statistiques) qui justifient son driver dédié.
:::

## Mettre à jour les firmwares de la librairie et du lecteur

Depuis l'interface web de la TL1000, mettez à jour le firmware de la librairie, puis celui du lecteur. Notez précisément ce qui se passe. Un lecteur qui refuse une mise à jour de firmware n'est pas un caprice logiciel, c'est un indice matériel à consigner tel quel dans le ticket Dell.

## Windows Update, redémarrage, et test sans antivirus ni pare-feu

Le support Veeam vous le demandera de toute façon, autant l'avoir fait avant d'ouvrir le dossier : Windows Update complet, redémarrage du serveur de bandes, puis un test avec l'antivirus et le pare-feu désactivés le temps d'un job. Si le symptôme survit, vous venez d'éliminer les réponses génériques de premier niveau.

:::caution
Désactiver l'EDR sur un serveur de sauvegarde, même dix minutes, se fait en le signalant à votre SOC et en le réactivant immédiatement après. Un serveur de sauvegarde est une cible prioritaire pour un attaquant.
:::

## Passer au consommable et au physique

Dans l'ordre :

1. Passez la cartouche de nettoyage.
2. Testez avec une autre cartouche, pour écarter un média défectueux.
3. Relancez un rescan de la librairie dans Veeam (Tape Infrastructure, clic droit sur la librairie, Rescan).
4. Lancez les diagnostics Dell de la librairie et tentez un export des logs du lecteur depuis l'interface web.
5. Vérifiez la carte HBA SAS et les câbles : reconnectez-les, changez de port si vous en avez un de libre.

Si l'export des logs du lecteur échoue, notez-le : c'est l'un des deux critères qui ont fini par déclencher l'échange matériel.

## Nettoyer côté Veeam : media set, serveur de bandes, job

Trois manipulations demandées par le support Veeam, à faire dans cet ordre :

1. Dans le media pool concerné, activez « Create new media set for every backup session ». Cela évite qu'un job reprenne sur un media set laissé dans un état bancal par un lecteur en erreur.
2. Retirez le serveur de bandes de l'infrastructure Veeam, puis rajoutez-le. C'est brutal, mais cela force la redécouverte complète des périphériques.
3. Relancez un job de test court.

```powershell title="État des composants bande côté Veeam"
Get-VBRTapeServer
Get-VBRTapeLibrary | Select-Object Name, State, Enabled
Get-VBRTapeDrive | Select-Object Name, State, Enabled
```

## Savoir quand demander l'échange matériel

Deux signaux m'ont servi d'argument auprès de Dell : l'export des logs du lecteur qui échoue, et une panne qui survit à un « power drain » complet (librairie éteinte, câbles débranchés, bouton d'alimentation maintenu, puis remise sous tension). À ce stade, il n'y a plus de couche logicielle à incriminer.

Quelques pièges vécus :

- Dell est strict sur l'état du colis retourné. Gardez l'emballage d'origine.
- Une librairie de remplacement peut hériter exactement du même symptôme si le défaut est côté lecteur ou côté HBA. C'est ce qui m'est arrivé : nouvelle librairie, même panne. Faites-vous préciser ce qui est échangé.
- La priorité P1 est vite rétrogradée par l'éditeur dès que le dossier traîne. Relancez, en rappelant que la sauvegarde hors ligne est à l'arrêt.

:::danger
Tant que la librairie est en panne, votre règle 3-2-1 est cassée. Ne laissez pas le dossier de support dicter votre calendrier : mettez un plan B en place dès la première semaine.
:::

## Activer un plan B : ne pas rester sans copie hors site

Faute de serveur de bandes opérationnel, j'ai poussé la sauvegarde mensuelle vers un stockage objet chez OVHcloud, en acceptant le surcoût et en l'expliquant à la direction en une page : ce qui ne marche plus, ce que ça couvre, jusqu'à quand. Une copie cloud n'a pas les propriétés d'une bande dans une armoire, mais elle en a une que n'a pas une librairie en panne : elle existe.

## Épilogue : correctif zero-day et alarmes Veeam ONE

Mi-janvier 2026, une faille Veeam m'a été signalée via le helpdesk interne. La séquence à dérouler à chaque correctif de sécurité de votre logiciel de sauvegarde :

1. Sauvegarde de la configuration Veeam avant toute chose.
2. Mise à niveau vers Veeam Backup & Replication 13.
3. Vérification des jobs, en particulier le job Tape hebdomadaire de production.
4. Contrôle des alarmes Veeam ONE : hôtes VxRail, VM Exchange, connectivité des hôtes.
5. Clôture du ticket helpdesk en indiquant la version installée, pour la traçabilité.

:::tip
Veeam ONE remonte aussi des alarmes « host connectivity » sur le serveur de sauvegarde lui-même ; chez moi, elles concernaient ses cartes réseau. Ce sont souvent les premiers symptômes d'un matériel qui fatigue.
:::

## Pour aller plus loin

- [Collecter un TSR et ouvrir un ticket Dell ProSupport](/docs/virtualisation/collecter-un-tsr-vxrail-et-ouvrir-un-ticket-dell-prosupport/) : la même logique s'applique à une librairie de bandes.
- [RAID 5 n'est pas une sauvegarde](/blog/raid5-nest-pas-une-sauvegarde/) : pourquoi la copie hors ligne compte.
- [Runbook : redémarrer une infrastructure virtualisée après coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/).
- Documentation officielle : [Veeam Help Center](https://helpcenter.veeam.com/) et [support Dell](https://www.dell.com/support/).

<!-- source : threads support Veeam « Critical tape drive alert » et Dell TL1000, 08/2025 ; mail « De nouveau sauvegarde cloud / TL1000 », 2025-08-21 ; ticket helpdesk « MAJ veeam faille », 2026-01-16 -->

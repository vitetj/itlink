---
title: "Reprendre la main sur un châssis virtuel Alcatel OmniSwitch"
description: "Deux OmniSwitch empilés en virtual chassis, une restauration d'urgence qui recopie la configuration du membre 1 sur le membre 2, et un switch qui ne rejoint plus la pile. Le diagnostic, et ce qu'il faut vérifier avant."
published: 2026-02-27
category: reseau
tags: [alcatel-lucent, omniswitch, virtual-chassis, commutation, sauvegarde]
level: avancé
status: à jour
featured: false
tested_on: [Alcatel-Lucent OmniSwitch 6560]
---

Fin février 2026, deux OmniSwitch 6560 empilés en châssis virtuel se sont retrouvés avec la même configuration.
Pas « une configuration proche » : la même, celle du membre 1, restaurée telle quelle sur le membre 2 après une
intervention d'urgence. Résultat, le second switch ne rejoignait plus le châssis virtuel, et il a fallu plusieurs
jours pour rétablir un fonctionnement acceptable — sans jamais reformer la pile complète.

Cette fiche raconte le diagnostic et les points de contrôle. Elle ne prétend pas être une procédure clés en main :
les extraits de configuration dont je dispose sont partiels, et je préfère vous dire où regarder plutôt que vous
donner des commandes que je n'ai pas vérifiées.

:::caution
Cette fiche est en confiance moyenne. Les seules commandes que je cite sont celles que j'ai réellement passées.
Tout ce qui concerne l'écriture de la configuration de châssis, la recréation du lien VFL et le redémarrage ordonné
des membres doit être repris dans le guide AOS de **votre version exacte** avant application. Une pile mal
manipulée ne redémarre pas à moitié : elle redémarre entièrement.
:::

## Comprendre ce qu'un châssis virtuel n'est pas

Un châssis virtuel (*virtual chassis*), c'est plusieurs switches physiques qui se présentent au reste du réseau
comme un seul équipement : une adresse de management, une configuration, un plan de commutation. C'est très
pratique au quotidien et c'est exactement là que le piège se referme quand on parle sauvegarde.

Chaque membre garde en réalité **deux** fichiers de configuration distincts :

| Fichier | Rôle | Identique entre membres ? |
| --- | --- | --- |
| `vcsetup.cfg` | L'identité du membre dans la pile : `chassis-id`, groupe, mode du lien VFL | Non, jamais |
| `vcboot.cfg` | La configuration de commutation vue depuis le master (VLAN, ports, routage) | Oui, propagée par le master |

Un membre qui reçoit le `vcsetup.cfg` d'un autre membre récupère son `chassis-id`. Deux membres avec le même
identifiant ne forment pas une pile : ils s'excluent mutuellement.

## Prérequis

- Un accès console série sur chaque switch. Pas SSH, pas le contrôleur de management : une console. Quand la pile
  est cassée, l'adresse de management peut suivre le master, ou ne suivre personne.
- L'image de rescue correspondant **exactement au modèle**. Une image 6360 ne relève pas un 6560, et l'utilitaire
  ne vous préviendra pas gentiment.
- Une copie de `vcsetup.cfg` et `vcboot.cfg` de chaque membre, prise **avant** l'intervention.
- Une fenêtre de production. Sur une pile qui porte les VLAN de l'atelier, « je regarde vite fait » n'existe pas.

## Sauvegarder avant de lancer le rescue, pas après

L'USB Rescue Utility relève un switch qui ne démarre plus. Le message qu'il affiche mérite d'être lu jusqu'au
bout, parce qu'il annonce exactement ce qu'il va faire :

```text
The Rescue Utility reformats the switch's nonvolatile storage. All files will be lost and
replaced with the contents of /usb/<modele>/* from the USB storage device.
This may take up to 10 minutes.
```

« All files will be lost » inclut `vcsetup.cfg`. Si le switch répond encore un peu, récupérez ses fichiers de
configuration avant. S'il ne répond plus du tout, vous partirez de la sauvegarde — et c'est là qu'on découvre
souvent qu'elle n'existe pas au bon niveau de granularité.

La clé USB doit respecter l'arborescence attendue par le modèle : `/usb/6560/*` pour un 6560, `/usb/6360/*` pour
un 6360. Le switch démarre dessus, se reformate, et repart avec une configuration usine.

## Vérifier la topologie une fois le switch relancé

Première commande après le redémarrage, depuis la console du master :

```text
show virtual-chassis topology
```

Les colonnes à lire, dans cet ordre :

- **`Chas`** : le numéro du châssis tel que vu par la pile ;
- **`Role`** : `Master`, `Slave` ou `Inconsistent` ;
- **`Status`** : l'état d'appartenance. Un suffixe `+` signale une unité présente mais **ajoutée après la dernière
  topologie sauvegardée** — autrement dit, la pile la voit sans l'avoir intégrée à son plan ;
- **`Config Chas ID`** et **`Oper Chas ID`** : l'identifiant configuré et l'identifiant réellement en service. Un
  écart entre les deux est le symptôme central de ce genre d'incident ;
- **`Priority`** et **`Group`** : la priorité d'élection du master, et le groupe de la pile.

Si `show virtual-chassis topology` ne liste qu'un seul membre alors que les deux sont allumés et câblés, le
problème est soit dans le lien VFL, soit dans l'identité — pas dans les VLAN.

## Lire la configuration de châssis de chaque membre

Sur chaque switch, la configuration de pile vit dans son propre fichier :

```text
! File: /flash/working/vcsetup.cfg
virtual-chassis chassis-id 1 configured-chassis-id 1
virtual-chassis vf-link-mode ...
```

Deux règles simples : les membres doivent avoir des `chassis-id` **différents**, et le **même** groupe. Dans mon
cas, le membre 2 affichait `configured-chassis-id 1`, hérité de la restauration. Le reste du diagnostic découlait
de là : deux switches convaincus d'être le châssis 1, aucun des deux ne cédant.

:::note
Le `vf-link-mode` (mode du lien entre membres) et le numéro de groupe font partie des paramètres que je vous invite
à relever sur le membre sain avant de toucher au membre restauré. Ce sont eux qu'il faudra reproduire, et ils
varient selon la version d'AOS et le modèle.
:::

## Corriger l'identité, puis rebâtir le lien

La suite logique est de remettre le membre 2 sur son propre `configured-chassis-id`, de recréer le lien VFL entre
les deux switches, puis de redémarrer le membre corrigé pour qu'il se présente à la pile avec sa nouvelle identité.

C'est ici que je m'arrête sur les commandes. La séquence exacte — comment écrire la configuration de châssis, dans
quel répertoire (`working` ou `certified`), avec quel type de rechargement, et dans quel ordre redémarrer les
membres — dépend de la version d'AOS et doit être prise dans la documentation constructeur, pas dans un article de
blog. **Ce qu'il faut vérifier avant d'agir** :

1. la commande de configuration du `configured-chassis-id` pour votre version d'AOS, et le fichier qu'elle écrit ;
2. la procédure de création du lien VFL (ports éligibles, agrégation, mode statique ou dynamique) ;
3. le mécanisme `working` / `certified` / `synchro` de votre version : une configuration correcte mais non
   certifiée ne survit pas toujours au redémarrage suivant ;
4. l'ordre de redémarrage recommandé quand les deux membres portent de la production.

Dans mon incident, le membre est bien repassé en châssis 2, mais **il n'a jamais rejoint le châssis virtuel**. Il a
fini la semaine en standalone.

## Assumer le standalone plutôt que d'insister

Un membre en standalone commute. Il ne partage pas le plan de la pile, il n'apporte pas de redondance, il demande
une configuration séparée — mais l'atelier retrouve son réseau. C'est une position de repli parfaitement
défendable : on rétablit le service, on note la dette, et on planifie une reprise à froid avec le support
constructeur, machine par machine, hors production.

Insister le soir même sur une pile qui refuse de se reformer, c'est risquer de perdre aussi le membre qui
fonctionne. La bonne question n'est pas « comment je répare ce soir » mais « qu'est-ce qui tourne encore si je me
trompe dans les dix prochaines minutes ».

## Corriger la vraie cause : la sauvegarde

L'incident n'est pas venu du rescue, il est venu de la sauvegarde. La sauvegarde du contrôleur de management
cloud n'est **pas** une sauvegarde par équipement : dans un châssis virtuel, elle capture la configuration du
châssis telle que la voit le master. Restaurer « le switch 2 » depuis cette sauvegarde revient donc, mécaniquement,
à lui coller la configuration du switch 1.

La parade tient en une ligne : récupérez `vcsetup.cfg` et `vcboot.cfg` **de chaque membre, séparément, hors du
contrôleur**, par exemple via un transfert programmé vers un partage sauvegardé. Et vérifiez une fois par an que
ces fichiers sont différents d'un membre à l'autre. S'ils sont identiques, votre sauvegarde ne sauvegarde qu'un
seul switch.

:::tip
Testez aussi la clé USB de rescue **avant** d'en avoir besoin : vérifiez que l'arborescence correspond au modèle du
parc, et notez le modèle exact sur la clé. Recevoir une image 6360 pour un parc en 6560 le jour de la panne fait
perdre une demi-journée, et personne ne pense à vérifier ce détail sous pression.
:::

## Pour aller plus loin

- [Stormshield : monter un cluster HA pour remplacer un WatchGuard](/docs/reseau/stormshield-cluster-ha-pour-remplacer-un-watchguard/) : le même sujet de fond, deux équipements qui doivent se croire un seul.
- [Runbook : redémarrer une infrastructure virtualisée après coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/) : l'ordre de reprise quand le réseau revient avant le reste.
- [Modèle de rapport d'audit d'infrastructure pour une PME](/docs/dsi/modele-de-rapport-daudit-infrastructure-pme/) : où consigner ce genre de dette technique pour qu'elle soit financée.
- Le guide AOS de votre version chez le constructeur, chapitre *Virtual Chassis* : la référence pour tout ce que cette fiche laisse volontairement ouvert.

<!-- source : fil « Lien transfert de fichier » sur le sinistre châssis virtuel, 18-23/02/2026 -->

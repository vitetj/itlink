---
title: "Reset « flea power » d’un nœud VxRail / PowerEdge sur erreurs iDRAC PWR2402, SWC5008, CTL137"
description: "« Unable to communicate with storage controller 1 and front LED panel » dans le Lifecycle Log ? Avant de remplacer quoi que ce soit, Dell demande un drain complet des condensateurs. La procédure pas à pas, côté vSAN compris."
published: 2025-08-21
category: virtualisation
tags: [vxrail, dell, idrac, poweredge, vsan, lifecycle-controller]
level: avancé
status: à jour
featured: false
tested_on: [VxRail E560F, PowerEdge R640, iDRAC 9]
sidebar:
  label: "Reset « flea power » d’un nœud VxRail /…"
---

Août 2025, un mardi ordinaire. L'iDRAC d'un des six nœuds de mon cluster VxRail se met à remonter une
salve d'événements dans le Lifecycle Log : PWR2402, SWC5008, CTL137, avec un message qui ne rassure
personne : « Unable to communicate with storage controller 1 and front LED panel », accompagné d'erreurs
de scrutation sur le bus I2C. Le contrôleur de stockage en question, c'est le HBA330 qui porte les disques
vSAN du nœud. Quand l'iDRAC n'arrive plus à lui parler, on pense tout de suite carte mère, backplane,
remplacement lourd, technicien sur site.

Le support Dell, lui, a commencé par une question plus modeste : avez-vous fait un reset « flea power » ?

Le « flea power », c'est l'alimentation de veille. Même quand un serveur est « éteint », une partie de sa
carte mère reste sous tension pour faire vivre l'iDRAC, le contrôleur de gestion et quelques circuits
annexes. Un composant qui déraille sur ce bus de gestion peut rester dans un état incohérent
indéfiniment, parce qu'il n'est jamais vraiment redémarré. Le reset consiste à couper tout apport de
courant et à vider les condensateurs pour que l'ensemble reparte d'un état électrique propre. C'est la
version sérieuse du « débranchez votre box trente secondes » : la même idée, mais avec un cluster vSAN
qu'il faut préparer avant de tirer sur les câbles.

Dell demande cette manipulation avant d'engager tout remplacement de pièce. Chez moi, elle a suffi : le
lendemain, plus aucune erreur, et pas de carte mère à changer.

## Prérequis

- Un dossier ouvert chez Dell ProSupport, avec le premier TSR déjà transmis.
- Un cluster vSAN sain, aucun autre hôte en maintenance, le witness joignable si votre cluster est étendu.
- Un accès physique au nœud, avec la possibilité de débrancher tous ses câbles.
- Une fenêtre de vingt à trente minutes pendant laquelle le nœud sera hors cluster.
- Idéalement, des câbles étiquetés. Sinon, prenez une photo de l'arrière du serveur avant de débrancher.

## Lire les erreurs dans le Lifecycle Log

Avant de manipuler quoi que ce soit, confirmez ce que l'iDRAC voit. Dans l'interface web : Maintenance,
puis Lifecycle Log. En ligne de commande, `racadm` donne le même résultat plus vite.

```bash title="Consulter le Lifecycle Log et le SEL d'un nœud"
racadm -r 192.0.2.21 -u root -p '<mot de passe iDRAC>' lclog view
racadm -r 192.0.2.21 -u root -p '<mot de passe iDRAC>' getsel
```

Les trois codes qui m'occupaient se lisent ainsi :

| Code | Ce que l'iDRAC essaie de dire |
| --- | --- |
| PWR2402 | Anomalie sur la chaîne d'alimentation ou de gestion d'énergie |
| SWC5008 | Erreur de scrutation I2C : un périphérique du bus de gestion ne répond plus |
| CTL137 | Perte de communication avec le contrôleur de stockage |

Ce qui compte, c'est le triplet. Un CTL137 seul peut être un vrai défaut de contrôleur. Un CTL137 qui
arrive en même temps qu'une perte du panneau LED avant et des erreurs I2C désigne plutôt le bus de gestion
lui-même. C'est ce faisceau d'indices qui justifie le reset avant le remplacement.

## Sortir le nœud du cluster proprement

Sur un cluster vSAN, un nœud éteint sans préparation, c'est de la donnée dégradée et une reconstruction
dès que le délai de tolérance expire. Passez donc d'abord l'hôte en mode maintenance depuis vCenter.

vSAN vous demandera quoi faire des données du nœud. Pour une opération de moins d'une heure, « Ensure
accessibility » suffit : les objets restent accessibles via leurs répliques et rien n'est déplacé. Si vous
prévoyez de garder le nœud éteint longtemps, ou si vous n'êtes pas sûr que le reset suffise, choisissez
« Full data migration » et acceptez le temps d'évacuation qui va avec.

:::caution
Sur un cluster étendu, chaque salle porte une copie des données. Ne mettez jamais deux nœuds en maintenance
en même temps pour ce genre d'opération, et vérifiez que le witness répond avant de commencer. Un nœud hors
ligne, c'est prévu ; deux, c'est un pari.
:::

Une fois l'hôte en maintenance, éteignez-le proprement : « Power off » depuis vCenter, ou « Graceful
Shutdown » depuis l'iDRAC. Attendez que l'iDRAC indique que le système est hors tension.

## Faire le reset flea power

C'est la partie physique, et elle ne se négocie pas à moitié.

1. Débranchez **tous** les câbles d'alimentation du nœud. Les deux, sur un serveur à alimentations
   redondantes. Un seul cordon laissé branché et l'iDRAC reste alimenté : le reset ne sert à rien.
2. Débranchez aussi les câbles réseau, y compris celui de l'iDRAC. Dell le demande pour éviter qu'un port
   réseau maintienne une alimentation résiduelle (certaines cartes savent alimenter en veille).
3. Maintenez le bouton d'alimentation enfoncé pendant au moins une minute. C'est ce geste qui vide les
   condensateurs. Trente secondes ne suffisent pas ; une minute complète, montre en main.
4. Rebranchez les câbles réseau, puis les cordons d'alimentation.
5. Attendez environ deux minutes. L'iDRAC redémarre dès que le courant revient, avant même que vous
   n'allumiez le serveur. Ouvrez sa page web : quand elle répond, il est prêt.
6. Allumez le serveur, depuis le bouton ou depuis l'iDRAC.

:::tip
Profitez de ces deux minutes pour vérifier que l'iDRAC, à son retour, ne rejoue pas immédiatement les
mêmes erreurs. Si PWR2402 et SWC5008 réapparaissent avant même le POST, le reset n'a rien réglé et vous
tenez un argument solide pour le remplacement.
:::

## Remettre en production et repartir d'un journal propre

Une fois l'ESXi démarré et reconnecté à vCenter, sortez l'hôte du mode maintenance et contrôlez la santé
vSAN. Attendez que l'ensemble des objets soit de nouveau conforme avant de considérer l'opération terminée.

Dell recommande ensuite d'effacer le journal d'événements système de l'iDRAC (le SEL), procédure décrite
dans sa base de connaissances sous la référence 000226396. L'idée est simple : repartir d'un journal vide
pour que toute nouvelle occurrence soit datée sans ambiguïté après le reset.

```bash title="Effacer le SEL de l'iDRAC"
racadm -r 192.0.2.21 -u root -p '<mot de passe iDRAC>' clrsel
```

Collectez enfin un nouveau TSR (SupportAssist Collection depuis l'iDRAC) et déposez-le sur le dossier. Le
support compare l'avant et l'après, et c'est ce qui lui permet de clore, ou au contraire d'expédier une
pièce.

## Les pièges rencontrés

- **Le TSR de 0 octet.** Mon premier envoi était un fichier vide. Le support ne peut rien en faire et vous
  perdez une journée d'aller-retour. Regardez la taille du zip avant de cliquer sur « envoyer » ; un TSR
  digne de ce nom pèse plusieurs dizaines de mégaoctets, jamais zéro.
- **Un seul cordon débranché.** Le reset flea power est binaire : tout ou rien. Vérifiez les deux
  alimentations et le port iDRAC.
- **Deux nœuds à la fois.** Même si les deux remontent la même erreur, on traite l'un après l'autre.
- **Le mode maintenance oublié.** Éteindre un nœud vSAN sans le passer en maintenance, c'est s'offrir
  une reconstruction complète pour rien.
- **Conclure trop vite.** Attendez au moins vingt-quatre heures de Lifecycle Log propre avant de fermer le
  dossier. Chez moi, c'est le lendemain que j'ai pu écrire au support que le problème semblait résolu.

## Pour aller plus loin

- [Collecter un TSR VxRail et ouvrir un ticket Dell ProSupport qui avance vite](/docs/virtualisation/collecter-un-tsr-vxrail-et-ouvrir-un-ticket-dell-prosupport/) :
  le TSR avant et après est ce qui fait avancer le dossier.
- [VxRail : diagnostiquer un port réseau qui « flappe » et remplacer soi-même une NDC ou une alimentation](/docs/virtualisation/vxrail-port-reseau-qui-flappe-remplacer-la-ndc-et-une-alimentation/) :
  quand le reset ne suffit pas et qu'une pièce doit partir.
- Base de connaissances Dell : [KB 000226396](https://www.dell.com/support/kbdoc/000226396), effacement
  du SEL sur iDRAC.

<!-- source : mail « Unable to communicate with storage controller 1 and front LED panel », 2025-08-19 / 2025-08-20 -->

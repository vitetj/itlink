---
title: "Collecter un TSR VxRail et ouvrir un ticket Dell ProSupport qui avance vite"
description: "Chaque ticket Dell commence par « send us a TSR ». Où le générer (iDRAC ou VxRail Manager), quoi cocher, comment vérifier le fichier avant l'envoi, et quoi écrire dans le ticket pour éviter trois allers-retours."
published: 2025-08-22
updated: 2026-02-13
category: virtualisation
tags: [vxrail, dell, idrac, supportassist, support, tsr]
level: intermédiaire
status: à jour
featured: false
tested_on: [VxRail E560F, iDRAC 9, VxRail Manager 8.0.x]
---

En deux ans d'exploitation d'un cluster VxRail, j'ai ouvert des dossiers Dell pour à peu près tout ce qu'un
serveur sait casser : une carte réseau qui flappe, un contrôleur de stockage injoignable, une alimentation
muette, deux hôtes qui ne se parlent plus, une mise à niveau qui tourne en rond. Ces dossiers ont un point
commun : la première réponse du support, quelle que soit l'heure, est « please send us a TSR ».

Le TSR, Technical Support Report, c'est le carnet de santé d'un nœud. L'ingénieur Dell ne voit pas votre
serveur. Il ne connaît ni vos versions de firmware, ni votre inventaire matériel, ni ce que l'iDRAC a noté
dans son Lifecycle Log à 3 h 12 la nuit dernière. Le TSR lui apporte tout cela en un seul fichier.
Arriver au support sans TSR, c'est arriver chez le médecin sans les analyses : la consultation commence par
une ordonnance pour aller les faire, et vous revenez la semaine suivante.

L'objectif de cette fiche est simple : que votre premier message contienne déjà tout ce que le support va
demander, pour que le deuxième message soit un diagnostic et pas une question.

## Prérequis

- Un contrat ProSupport actif et le Service Tag du nœud concerné (étiquette à l'avant du serveur, ou page
  d'accueil de l'iDRAC).
- Un accès administrateur à l'iDRAC de chaque nœud et au plugin VxRail dans vCenter.
- Un compte sur le portail support Dell, rattaché aux Service Tags de votre parc.
- Vingt minutes : la collecte elle-même prend du temps, surtout avec les journaux de débogage.

## Choisir la bonne collecte : TSR par nœud ou bundle cluster

Deux collectes existent et le support ne demande pas la même selon le problème. Le TSR est produit par
l'iDRAC d'un nœud : matériel, firmware, Lifecycle Log, état des disques et du contrôleur. Le bundle de
logs VxRail est produit par le VxRail Manager pour tout le cluster : VxRail Manager lui-même, vCenter, les
ESXi, vSAN.

| Symptôme | Collecte à fournir |
| --- | --- |
| Erreur matérielle sur un nœud (PSU, NDC, contrôleur, PWR/SWC/CTL) | TSR du nœud depuis l'iDRAC |
| Port réseau qui flappe (NIC100/NIC101) | TSR du nœud, plus les journaux du switch si vous les avez |
| Mise à niveau LCM bloquée, plugin en erreur | Bundle de logs VxRail Manager |
| Perte de communication entre deux hôtes | Bundle VxRail, éventuellement TSR des deux nœuds |
| Alerte vSAN (capacité, objets non conformes) | Bundle VxRail |

Dans le doute, envoyez les deux. Un fichier de trop n'a jamais ralenti un dossier ; un fichier manquant,
si.

:::note
Le VxRail Manager sait aussi ouvrir des dossiers tout seul. Via la passerelle Secure Connect, il envoie
un « dial-home » à Dell sur certains événements : VXR508NIC100 pour un lien réseau perdu, MYSTIC014095
pour un disque vSAN au-delà de 80 %, MYSTIC01001F pour un nœud qui perd sa connectivité, VXR0100A0 lors
d'une coupure. Vous recevez alors un mail de Dell avant même d'avoir regardé vCenter. Le dossier existe
déjà : ajoutez-y votre TSR et votre analyse plutôt que d'en ouvrir un second. Et si vous avez déjà réglé le
problème, dites-le : j'ai annulé plus d'une intervention planifiée d'un simple mail.
:::

## Générer un TSR depuis l'iDRAC

Dans l'interface web de l'iDRAC 9 : Maintenance, puis SupportAssist, puis « Start a Collection ». Cochez
au minimum les informations système et les journaux de stockage ; ajoutez les journaux de débogage dès que
le problème touche le contrôleur, les disques ou le réseau. Choisissez « Save locally » pour récupérer
le zip sur votre poste. La collecte tourne quelques minutes ; l'iDRAC affiche la progression dans sa
file de tâches.

La même chose en ligne de commande, pratique quand l'interface web est lente ou que vous devez collecter
plusieurs nœuds d'affilée :

```bash title="Collecter et exporter un TSR avec racadm"
racadm -r 192.0.2.21 -u root -p '<mot de passe iDRAC>' techsupreport collect -t SysInfo,TTYLog,Debug
racadm -r 192.0.2.21 -u root -p '<mot de passe iDRAC>' jobqueue view
racadm -r 192.0.2.21 -u root -p '<mot de passe iDRAC>' techsupreport export -f TSR_<ServiceTag>_2025-08-19.zip
```

Attendez que la tâche de collecte apparaisse « Completed » dans la file avant d'exporter, sinon vous
obtenez un fichier incomplet.

## Générer un bundle de logs depuis le VxRail Manager

Dans vCenter, ouvrez le plugin VxRail, la section Support, puis « Log bundle ». Sélectionnez les
composants (VxRail Manager, vCenter, ESXi, vSAN) et les nœuds concernés, lancez la génération, puis
téléchargez l'archive une fois prête. Sur six nœuds, comptez un moment.

Quand le plugin lui-même ne répond plus, ce qui est précisément le cas lors d'une mise à niveau bloquée,
l'interface ne vous aidera pas. La VxRail ToolBox fournie par le support propose alors une option « Manual
collect log if UI unavailable », à lancer en SSH sur le VxRail Manager. Le support vous la transmettra avec
la procédure ; elle n'est pas publique.

## Vérifier le fichier avant de l'envoyer

C'est l'étape que tout le monde saute, et c'est celle qui m'a coûté une journée en août 2025. Mon premier
TSR est parti sur le dossier, le support l'a ouvert, et il faisait zéro octet. Fichier corrompu au
téléchargement, aucune erreur affichée, personne ne l'a vu avant l'ingénieur. Retour à la case collecte.

Avant d'envoyer quoi que ce soit :

- Regardez la taille. Un TSR ou un bundle VxRail pèse au minimum plusieurs dizaines de mégaoctets. Zéro,
  ce n'est pas un TSR, c'est un nom de fichier.
- Ouvrez le zip. S'il s'ouvre et contient des fichiers, il est bon.
- Nommez-le avec le Service Tag et la date. Le support jongle avec des dizaines de dossiers ; un
  `TSR.zip` de plus ne l'aide pas.

Déposez ensuite le fichier via le lien sécurisé fourni dans le dossier (upload direct sur le portail ou
lien de dépôt envoyé par l'ingénieur). Dans l'autre sens, quand Dell doit vous transmettre un outil ou un
bundle, il passe par son FTP sécurisé, DEFT, avec un lien à durée limitée.

## Écrire un ticket qui avance

Le TSR dit ce que voit la machine. Le ticket doit dire ce que vous voyez, vous. Voici la structure que
j'utilise, en anglais si l'ingénieur qui prend le dossier n'est pas francophone, ce qui arrive souvent sur
VxRail.

```text title="Trame d'ouverture de dossier"
Service Tag : <ServiceTag>
Cluster : VxRail E560F, 6 nœuds, configuration étendue (3 + 3 + witness)
Versions : VxRail Manager 8.0.x, vCenter 8.0.3
Événement : NIC100 / NIC101 sur NIC 1 Port 4, depuis le <date> à <heure>
Extrait du Lifecycle Log : (3 à 5 lignes, horodatées)
Déjà fait : câble inversé avec le port 3, défaut resté sur le port 4 ; TSR joint (xx Mo)
Impact : aucun arrêt, alertes vSAN répétées, dial-home reçu
Demande : validation du diagnostic, envoi de la pièce en Customer Self Replace si confirmé
Disponibilités : <créneaux>, visio possible
```

Quelques règles qui font gagner des jours :

- **Un seul problème par dossier.** Un flapping réseau et une alimentation muette, ce sont deux dossiers,
  même sur le même nœud.
- **Dites ce que vous avez déjà testé.** Sinon, on vous demandera de le refaire.
- **Précisez la fenêtre de maintenance et vos disponibilités.** Quand deux hôtes ont cessé de se parler
  fin 2025, une session de visio avec l'ingénieur a réglé en une heure ce que dix mails n'auraient pas
  fait.
- **Demandez le Customer Self Replace** si vous êtes à l'aise avec le matériel. Vous choisissez votre
  créneau au lieu d'attendre un technicien.
- **Répondez au questionnaire de fin de dossier.** Un ingénieur qui vous a sauvé une nuit de mise à
  niveau mérite qu'on le dise à son responsable. Je l'ai fait avec des références cinématographiques
  discutables, mais je l'ai fait.

## Les pièges rencontrés

- **Le fichier de zéro octet.** Vérifiez la taille avant l'upload, toujours.
- **Le dossier en doublon.** Le dial-home a déjà ouvert le dossier ; cherchez-le dans le portail avant
  d'en créer un.
- **Le Service Tag dans le corps du mail public.** Il identifie votre machine et son contrat ; il va dans
  le dossier, pas dans un forum ni sur un site comme celui-ci.
- **Le TSR unique pour un problème de cluster.** Pour du LCM ou du vSAN, c'est le bundle VxRail qu'il
  faut.
- **L'étiquette de retour.** Une fois la pièce reçue, le retour de l'ancienne est un dossier en soi.

## Pour aller plus loin

- [Débloquer une mise à niveau VxRail LCM qui tourne en boucle](/docs/virtualisation/vxrail-mise-a-niveau-lcm-en-boucle-postgresql-et-toolbox/) :
  le cas où le bundle se collecte sans interface.
- [Reset « flea power » d'un nœud VxRail / PowerEdge sur erreurs iDRAC](/docs/virtualisation/vxrail-reset-flea-power-sur-erreurs-idrac/) :
  la première demande du support quand le bus de gestion déraille.
- [VxRail : diagnostiquer un port réseau qui « flappe » et remplacer soi-même une NDC ou une alimentation](/docs/virtualisation/vxrail-port-reseau-qui-flappe-remplacer-la-ndc-et-une-alimentation/) :
  ce qui se passe après le TSR, quand une pièce doit partir.

<!-- source : mails « TSR », 2024-09-30 ; « Unable to communicate with storage controller 1 and front LED panel », 2025-08-19 ; « Coupures électriques / dial-home », 2025-09-03 ; « vSphere communication failed between 2 hosts », 2025-12-23 → 2026-01-05 ; « Review of case », 2026-02-12 -->

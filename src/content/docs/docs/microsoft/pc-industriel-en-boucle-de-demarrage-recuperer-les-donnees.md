---
title: "Un PC de cellule qui démarre en boucle : récupérer les données, puis décider"
description: "Réparation du démarrage, mode sans échec, puis extraction du disque en boîtier USB : la marche à suivre quand le PC qui pilote une cellule de production ne redémarre plus, et ce qu'il faut décider ensuite."
published: 2025-03-06
updated: 2025-09-08
category: microsoft
tags: [windows, redemarrage, recuperation-de-donnees, disque, industrie, obsolescence]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows embarqué, Fastems MMS5]
sidebar:
  label: "Un PC de cellule qui démarre en boucle"
---

Un PC de cellule n'est pas un poste de bureau. Il ressemble à un poste de bureau, il exécute un Windows qui ressemble à un Windows, mais il a été installé une fois, en 2016, par le constructeur de la machine, avec une pile logicielle que personne chez vous ne sait réinstaller. Il tourne en continu, subit les arrêts d'urgence de l'atelier, et son disque encaisse des écritures permanentes. Il n'est ni dans votre inventaire de sauvegarde, ni dans votre cycle de renouvellement, parce qu'il est arrivé avec la machine — c'est-à-dire, dans l'esprit de tout le monde, avec la production.

Un matin de mars 2025, celui d'une cellule d'usinage s'est mis à redémarrer en boucle après un arrêt sale. Le support du constructeur a proposé la séquence classique. Elle n'a pas fonctionné, et c'est justement le cas intéressant : cette fiche décrit ce qu'on fait quand la réparation échoue, dans quel ordre, et pourquoi la question de fond n'est pas technique.

## Prérequis

- Un accès physique à la machine, tournevis compris, et l'accord du responsable de production : vous allez immobiliser une cellule.
- Un second PC avec un port USB libre et un **boîtier ou adaptateur USB** compatible avec le format du disque (SATA 2,5 pouces, M.2, mSATA — vérifiez avant de démonter).
- Un disque externe ou un partage réseau pour recevoir les données extraites.
- Le contact du support constructeur, ouvert avant d'agir, pas après.

:::caution
Avant tout : **ne réinstallez rien, ne formatez rien, ne lancez aucune réparation qui écrit sur le disque** tant que vous n'avez pas récupéré les données. Sur un disque fatigué, chaque tentative de réparation est une écriture supplémentaire, et donc une chance de moins.
:::

## Tenter les réparations natives, dans l'ordre

Ces trois étapes coûtent une demi-heure. Elles fonctionnent souvent sur un problème purement logiciel — un arrêt brutal pendant une mise à jour, par exemple. Elles ne fonctionnent presque jamais sur un disque physiquement usé, ce qui est un renseignement en soi.

### La réparation du démarrage

Au démarrage, entrez dans l'environnement de récupération. Selon l'âge de la machine et le micrologiciel, la touche est `F1`, `F8` ou `F11` — les PC industriels de cette génération ne sont pas homogènes. Puis : **Dépannage → Options avancées → Réparation du démarrage**.

L'outil reconstruit les données d'amorçage et corrige les incohérences simples. Laissez-le aller au bout, même s'il est long.

### Le mode sans échec

Si la réparation échoue, `F8` au démarrage puis **Mode sans échec**. L'objectif n'est pas de « faire marcher la machine » : c'est de gagner une fenêtre pendant laquelle vous pouvez **copier les données** avant que le disque ne se dégrade davantage. Si le mode sans échec démarre, ne perdez pas de temps à diagnostiquer : copiez d'abord.

### La ligne de commande de récupération

Toujours depuis l'environnement de récupération, **Options avancées → Invite de commandes** :

```cmd title="Contrôles depuis l'environnement de récupération"
diskpart
  list disk
  list volume
  exit

chkdsk C: /f
bootrec /scanos
```

:::danger
`chkdsk /f` écrit sur le disque et peut, sur un support en fin de vie, achever ce qui restait lisible. Ne le lancez que si vous acceptez de perdre ce qui n'est pas encore copié — ou, mieux, après avoir fait l'image décrite plus bas. Sur ce PC de cellule, la réponse à la séquence complète a tenu en trois mots : « non, ça ne marche pas ».
:::

## Récupérer les données en sortant le disque

C'est l'étape qui compte vraiment, et c'est celle qu'on repousse parce qu'elle demande de démonter quelque chose.

Machine consignée, PC hors tension, sortez le disque et branchez-le sur un autre poste via un boîtier USB. En lecture, hors de son système d'exploitation, un disque abîmé est souvent encore largement exploitable : le système ne s'y exécute pas, il se contente d'être lu.

### Faire une image avant de fouiller

Si le disque montre des signes de faiblesse — lenteurs, erreurs d'entrée-sortie, cliquetis — copiez-le en entier avant de chercher des fichiers. Vous travaillerez ensuite sur la copie, sans solliciter l'original.

```powershell title="Image secteur à secteur du disque source (adaptez le numéro de disque)"
Get-Disk | Format-Table Number, FriendlyName, HealthStatus, OperationalStatus, Size
# Vérifiez trois fois le numéro du disque source avant de lancer une image.
```

Sous Windows, un outil d'imagerie disque fait l'affaire ; sous Linux, `ddrescue` est la référence pour un support qui rend des erreurs de lecture, parce qu'il reprend là où il s'arrête au lieu d'abandonner.

### Savoir ce qu'on cherche

Sur un PC de cellule, trois familles de données ont de la valeur, et elles ne sont pas au même endroit :

| Quoi | Pourquoi c'est critique | Où regarder |
| --- | --- | --- |
| Programmes de commande numérique | Souvent la seule copie existante | Dossiers de travail de l'application de pilotage |
| Configuration de la cellule | Paramètres palettes, outils, correspondances : des semaines de réglage | Répertoire d'installation de l'application constructeur |
| Journaux et historiques de production | Traçabilité, et parfois obligation client | Sous-dossiers de journalisation |

Copiez large. Un dossier inutile coûte quelques gigaoctets ; un dossier oublié coûte une remise en service.

```powershell title="Copie avec reprise et journal, depuis le disque monté en USB"
robocopy "E:\Chemin\Application" "D:\Recuperation\cellule\Application" /E /R:1 /W:1 /XJ /NP /LOG+:D:\Recuperation\cellule.log
```

`/R:1 /W:1` est volontaire : sur un disque défaillant, les tentatives longues sur un fichier illisible bloquent la copie pendant des heures. Mieux vaut passer, terminer, et revenir sur la liste des échecs à la fin.

## Remplacer le disque, pas le PC — pour l'instant

Une fois les données en lieu sûr, la suite est étonnamment banale : relevez la **référence exacte** du disque, achetez un modèle compatible, remontez. L'échange lui-même prend quelques minutes ; c'est tout le reste qui a pris la journée.

Deux points de vigilance :

- **Restaurez avec le constructeur, pas contre lui.** La pile logicielle d'une cellule n'est pas une application qu'on réinstalle par-dessus un Windows neuf. Ouvrez le dossier support avant de remonter, avec vos données récupérées à disposition.
- **Mettez une alerte d'espace disque dans la foulée.** Sur ce type de PC, le disque plein est le mode de panne le plus fréquent, et le plus prévisible. Une alerte à 85 % vous évite de refaire tout ce qui précède.

## Décider ce qu'on fait de cette machine

C'est la partie que je ne veux pas escamoter, parce que le disque n'était que le symptôme.

Ce PC portait un système installé en 2016 et une version d'application constructeur dont l'interface d'administration s'appuyait sur **Internet Explorer** — un navigateur retiré du support depuis. Autrement dit : un poste dont on ne peut ni changer le navigateur, ni durcir sérieusement l'OS, ni garantir qu'il redémarrera après le prochain arrêt sale. On peut remplacer le disque, on ne peut pas remplacer ça.

Six mois plus tard, j'ai porté le sujet en réunion sous une forme qui parle à une direction, en trois lignes :

1. **Ce que ça coûte de ne rien faire** : chaque arrêt sale est une journée d'immobilisation potentielle, avec une dépendance totale au délai du support constructeur.
2. **Ce que la mise à niveau apporte** : une version applicative qui abandonne le navigateur mort, un matériel sous garantie, et surtout la possibilité d'une sauvegarde standard.
3. **Ce qu'il faut exiger dans l'offre** : un système d'exploitation encore supporté à la livraison. J'ai refusé sur une autre cellule un OS déjà en fin de vie sur du matériel neuf — un équipement industriel vit quinze ans, il ne peut pas naître obsolète.

:::tip
Le meilleur moment pour obtenir un budget de modernisation, c'est la semaine où l'incident est frais. Pas six mois après, quand tout le monde a oublié. Écrivez la note pendant que la cellule est encore à l'arrêt.
:::

## Pour aller plus loin

- [Le coffre à programmes de commande numérique](/docs/architecture/coffre-a-programmes-cn-source-unique-en-lecture-seule/), pour que la seule copie des programmes ne soit plus sur le disque qui vient de tomber.
- [Outils constructeur d'automates : pourquoi les isoler dans une VM dédiée](/docs/virtualisation/isoler-les-outils-constructeur-dans-une-vm-dediee/), la même logique appliquée aux postes d'atelier.
- [Réactiver VBScript sur Windows 11 25H2 pour un installateur industriel](/docs/microsoft/reactiver-vbscript-windows-11-25h2/), autre face de l'obsolescence subie côté production.

<!-- source : mails « PC de cellule – disque corrompu » 2025-03-05, « Mise à niveau cellule » 2025-09-08, « Offre MMS5 vers MMS8 » 2025-10-23 -->

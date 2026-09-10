---
title: "Modèle de rapport d'audit d'infrastructure pour une PME hybride (VMware + Stormshield)"
description: "Trame réutilisable pour auditer une PME avec cluster VMware et pare-feu Stormshield : ordre de collecte (Nmap, RVTools, règles, logs), matrice de flux, plan du rapport, indicateurs et plan d'action à trois horizons."
published: 2026-02-27
category: dsi
tags: [audit, rapport, vmware, stormshield, nmap, rvtools]
level: intermédiaire
status: à jour
featured: false
---

Fin février 2026, j'ai rédigé une trame de rapport d'audit d'infrastructure. Pas pour ma boîte : pour
l'activité de conseil que je mène à côté, auprès de PME qui ressemblent à la mienne. Un cluster VMware qui
tourne depuis des années, un pare-feu Stormshield configuré par un prestataire qui passe deux fois par an,
un Veeam dont personne n'a testé une restauration depuis longtemps, et un dirigeant qui voudrait savoir
« si c'est solide ».

Le premier jet du squelette a été produit avec un assistant IA, en
[binôme](/blog/lia-au-service-informatique-un-binome-pas-un-remplacant/), puis réécrit section par section
avec ce que quinze ans d'exploitation m'ont appris : ce qu'on trouve, ce qu'on oublie, et surtout ce qu'un
rapport doit contenir pour être lu jusqu'au bout par quelqu'un qui n'est pas informaticien.

Cette fiche donne la trame telle que je l'utilise : l'ordre de collecte, la matrice de flux, le plan du
rapport, les questions à poser et les indicateurs à faire figurer dans la synthèse. Aucune donnée réelle ;
les adresses sont des exemples.

## Prérequis

- Une autorisation écrite du dirigeant pour scanner le réseau et exporter les configurations.
- Des comptes en lecture seule : vCenter, Stormshield (profil de lecture), console Veeam, un compte de
  domaine standard.
- Une machine de collecte sur le LAN (portable ou VM), avec Nmap et RVTools.
- Deux à trois jours de collecte, autant d'analyse, une demi-journée de restitution.

## Collecter dans l'ordre : Nmap, RVTools, règles, logs

L'ordre a un sens. Nmap dit ce qui existe vraiment sur le réseau ; RVTools dit ce que l'hyperviseur croit
héberger ; l'export des règles dit ce que le pare-feu autorise ; les logs disent ce qui circule réellement.
Les écarts entre ces quatre vues, c'est le rapport.

### Nmap : ce qui existe

```bash title="Découverte des hôtes puis inventaire des services"
nmap -sn 10.10.0.0/16 -oA decouverte
nmap -sV -O --top-ports 1000 10.10.10.0/24 -oA services-serveurs
```

Questions à se poser : quelles machines répondent sans figurer dans l'inventaire ? quels OS sont hors
support d'après les bannières ? quels services n'ont rien à faire là (SMBv1, Telnet, interface
d'administration en HTTP, RDP sur un poste) ?

### RVTools : ce que vCenter pense

```cmd title="Export complet de l'inventaire vSphere"
RVTools.exe -u audit@vsphere.local -p <mot de passe> -s vcenter.example.com -c ExportAll2xlsx -d C:\Audit -f rvtools.xlsx
```

Questions : versions d'ESXi et de vCenter, et leur date de fin de support ; état des licences ; snapshots
de plus de sept jours ; VM éteintes depuis des mois ; ratio provisionné/utilisé sur les datastores ; RAM
libre si un hôte tombe ; VM sans VMware Tools ; hôtes qui ne sont pas tous au même build.

### Stormshield : ce que le pare-feu autorise

Depuis l'interface d'administration, exportez la politique de filtrage au format CSV et faites une
sauvegarde complète de la configuration. Questions : y a-t-il des règles « any vers any » actives ? des
règles désactivées conservées depuis des années ? des règles sans commentaire ni auteur ? des translations
entrantes qui exposent RDP, SMB ou une interface web ? qui a des accès VPN, avec quelle authentification ?
l'IPS est-il actif sur les flux internes ? le firmware est-il à jour ? l'administration est-elle possible
depuis Internet ?

### Logs : ce qui circule

Trente jours de logs Stormshield (alarmes, connexions, blocages), les événements vCenter, l'historique des
travaux Veeam, les derniers logons dans Active Directory. Questions : quelle alarme se déclenche tous les
jours sans que personne ne la regarde ? quel travail de sauvegarde échoue « depuis toujours » ? quels
comptes n'ont pas ouvert de session depuis six mois ?

## Construire la matrice de flux

La matrice de flux est la pièce centrale de l'audit : elle confronte les règles du pare-feu aux usages
réels et à ce qu'on voudrait. Une ligne par flux significatif, pas par règle.

| Source | Destination | Port / proto | Usage | Règle | Verdict |
| --- | --- | --- | --- | --- | --- |
| VLAN postes 10.10.20.0/24 | Serveurs 10.10.10.0/24 | 445/tcp | Partages de fichiers | 12 | Légitime |
| VLAN atelier 10.10.30.0/24 | ERP 10.10.10.15 | 8080/tcp | GPAO | 18 | Légitime |
| Internet | 203.0.113.10 | 3389/tcp | « Accès prestataire » | 3 | À supprimer : passer par VPN ou bastion |
| VLAN caméras 10.10.40.0/24 | Internet | any | Non documenté | 25 | À restreindre : NTP et mises à jour seulement |
| VLAN postes | Interfaces iDRAC 10.10.5.0/24 | 443/tcp | Administration | 7 | À restreindre au poste d'administration |

Trois verdicts suffisent : légitime, à restreindre, à supprimer. Le reste est du commentaire.

:::tip
Faites valider les usages avec le responsable production avant de conclure. Un flux « non documenté » vers
une machine d'usinage est souvent la télémaintenance du constructeur, et le supprimer un vendredi soir
sans prévenir vaut une visite en salle de réunion le lundi.
:::

## Le plan du rapport

1. **Résumé exécutif** (une page). Trois points forts, trois risques majeurs, trois actions prioritaires.
   Pas de jargon, pas de tableau.
2. **Périmètre et méthode.** Ce qui a été vu, ce qui ne l'a pas été, les dates, les outils, les comptes
   utilisés.
3. **Infrastructure physique.** Salle, onduleurs et leur autonomie réelle, climatisation, âge des machines,
   garanties et contrats de support, accès physique.
4. **Réseau et VLAN.** Schéma niveaux 1 à 3, segmentation entre bureautique, serveurs, atelier, caméras,
   Wi-Fi invité ; réseau d'administration séparé ou non.
5. **Virtualisation VMware.** Versions et fin de support, licences, stockage (vSAN ou baie), marge RAM en
   mode dégradé, snapshots, sauvegarde de vCenter lui-même.
6. **Pare-feu Stormshield.** Règles, exposition Internet, VPN, IPS, mises à jour, comptes d'administration
   et journalisation.
7. **Matrice de flux.**
8. **Sécurité.** Comptes administrateurs du domaine, MFA, politique de mots de passe, EDR, gestion des
   correctifs, coffre de secrets, postes obsolètes de l'atelier.
9. **Sauvegarde et PRA.** Règle 3-2-1, RPO et RTO réels par application, dernier test de restauration,
   copie hors site ou sur bande, immuabilité, procédure de redémarrage après coupure.
10. **Plan d'action** à trois horizons : 0-3 mois, 3-12 mois, 12-36 mois.
11. **Annexes.** Exports RVTools, résultats Nmap, règles, extraits de logs.

## Les indicateurs de la synthèse

Un dirigeant retient des chiffres, pas des paragraphes. Ceux-ci tiennent dans un tableau d'une demi-page.

| Indicateur | Où le mesurer | Seuil d'alerte |
| --- | --- | --- |
| Serveurs sous OS hors support | Nmap, onglet vInfo | 1 seul exposé au réseau |
| Snapshots de plus de 7 jours | Onglet vSnapshot | 1 |
| RAM libre si un hôte tombe | Onglet vHost | moins de 20 % |
| Règles any/any actives | Export Stormshield | 1 |
| Services accessibles depuis Internet | Translations + scan externe | RDP ou SMB = critique |
| Dernier test de restauration | Veeam + entretien | plus de 6 mois |
| Rétention de la copie hors site | Veeam | moins de 30 jours |
| Comptes administrateurs du domaine | Active Directory | comptes partagés ou non nominatifs |
| Autonomie onduleur | Fiche + test | inconnue |

## Restituer : la synthèse d'abord, la matrice en annexe

La matrice de flux est le travail le plus long de l'audit, donc celui qu'on a envie de montrer en premier.
C'est une erreur : la direction décroche à la troisième ligne. Présentez les recommandations, puis
renvoyez à la matrice pour ceux qui veulent la preuve.

Distinguez ensuite deux familles d'actions, parce qu'elles ne se décident pas au même endroit :

| Horizon | Type | Exemples | Qui décide |
| --- | --- | --- | --- |
| 0-3 mois | Quick wins, sans budget | Supprimer une règle, activer la MFA, tester une restauration, purger les snapshots | Le responsable IT |
| 3-12 mois | Projets à chiffrer | Segmenter l'atelier, remplacer un serveur hors support, passer les accès prestataires par un bastion | La direction |
| 12-36 mois | Structurants | Renouvellement du cluster, refonte réseau, PRA sur second site | La direction, avec budget |

Deux documents, pas un : une synthèse de trois ou quatre pages pour la direction, et l'annexe technique
complète pour le responsable IT ou le prestataire qui fera le travail. Le même rapport pour les deux
publics ne sera lu par aucun.

:::note
Datez tout, y compris les exports. Un audit est une photographie ; six mois plus tard, la seule question
qui compte est « qu'est-ce qui a changé depuis ? », et elle ne se répond qu'avec la date de la photo.
:::

## Pour aller plus loin

- [Lire un rapport Live Optics et un export RVTools](/docs/architecture/lire-un-rapport-live-optics-et-un-export-rvtools/) :
  la partie dimensionnement, en détail.
- [Segmenter les réseaux des machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/) :
  le projet qui sort presque toujours de la matrice de flux.
- [Stormshield : un cluster HA pour remplacer un WatchGuard](/docs/reseau/stormshield-cluster-ha-pour-remplacer-un-watchguard/) :
  quand le pare-feu lui-même est à renouveler.

<!-- source : mail « Modèle rapport audit VMware + Stormshield », 2026-02-25 (adresse personnelle) -->

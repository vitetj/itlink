---
title: "Lire un rapport Live Optics et un export RVTools pour préparer un renouvellement d'infrastructure"
description: "Une semaine de collecte Live Optics, un export RVTools et quatre chiffres à lire avant d'écouter un commercial : cœurs, RAM, capacité provisionnée contre utilisée, IOPS. Pour préparer un renouvellement de cluster."
published: 2026-07-10
category: architecture
tags: [live-optics, rvtools, vmware, dimensionnement, renouvellement, vxrail]
level: avancé
status: à jour
featured: false
tested_on: [VMware vCenter 8.0.3, Dell VxRail E560F, vSAN 8]
sidebar:
  label: "Lire un rapport Live Optics et un…"
---

Quand un constructeur vous propose de renouveler votre infrastructure, la discussion commence toujours par
une slide avec trois colonnes et des ordres de grandeur. La seule façon de ne pas subir cette slide, c'est
d'arriver avec vos propres chiffres. Pas une estimation : une mesure.

C'est ce que j'ai fait au printemps 2026 pour préparer le renouvellement d'un cluster VxRail de six nœuds
dont le contrat arrive à échéance début 2027, dans un contexte Broadcom que vous connaissez. En mars, un
export RVTools envoyé à l'intégrateur ; en juin, une collecte Live Optics lancée par Dell ; en juillet, un
débriefing où, pour une fois, on a parlé de ce que le cluster fait vraiment plutôt que de ce qu'on pourrait
lui vendre.

Les deux outils sont gratuits, ne s'installent pas sur les hôtes et se lisent en une heure quand on sait
quoi regarder. Cette fiche explique où cliquer, puis surtout quoi lire et comment en tirer un cahier des
charges.

## Prérequis

- Un compte vCenter en lecture seule, dédié aux outils de collecte.
- Une VM Windows quelconque pour héberger le collecteur Live Optics et RVTools.
- Un compte sur le portail Live Optics (le constructeur ou l'intégrateur crée en général le projet et vous
  envoie le lien).
- Une semaine représentative : incluez une clôture mensuelle si votre ERP en fait une.

## Créer un compte vCenter en lecture seule

Ni RVTools ni Live Optics n'ont besoin d'écrire quoi que ce soit. Créez un utilisateur dans le domaine SSO
de vCenter, puis attribuez-lui le rôle « Lecture seule » à la racine de l'inventaire, avec propagation aux
objets enfants. Vous pourrez le désactiver une fois les collectes terminées.

:::tip
Ne réutilisez pas votre compte administrateur. Un export RVTools lancé avec un compte nominatif, c'est un
mot de passe d'admin qui traîne dans un fichier de configuration sur une VM que vous oublierez.
:::

## Lancer une collecte Live Optics

Live Optics est le service de Dell pour mesurer une charge de travail avant un projet. Le constructeur crée
le projet et vous envoie un lien ; vous téléchargez le collecteur, l'exécutez sur la VM Windows, choisissez
une collecte vCenter (pas d'agent sur les hôtes) et renseignez le compte en lecture seule. La collecte tourne
jusqu'à sept jours, remonte au portail, et le rapport est partagé avec le constructeur.

Deux points d'attention :

- **la période**. Une semaine creuse en août donnera un cluster qui dort. Prenez une semaine normale, avec
  une clôture ou un traitement lourd dedans ;
- **la visibilité**. Le rapport part chez le constructeur. Il contient les noms de vos VM et de vos hôtes.
  Ce n'est pas un problème avec un fournisseur sous NDA, mais sachez-le.

## Exporter avec RVTools

RVTools se connecte à vCenter et exporte tout l'inventaire dans un classeur Excel, un onglet par type
d'objet. En ligne de commande, pour l'automatiser :

```cmd title="Export complet RVTools vers un classeur xlsx"
"C:\Program Files (x86)\Dell\RVTools\RVTools.exe" -u collecte@vsphere.local -p <mot de passe> -s vcenter.example.com -c ExportAll2xlsx -d C:\Exports -f rvtools-2026-03.xlsx
```

Les onglets qui comptent pour un dimensionnement :

| Onglet | Ce qu'on y lit |
| --- | --- |
| vInfo | Liste des VM, état, OS, vCPU, RAM, espace provisionné et utilisé |
| vCPU | Nombre de vCPU par VM, réservations, ratio vCPU/cœur |
| vMemory | RAM allouée, consommée, ballooning, swap |
| vDisk | Disques virtuels, thin ou thick, taille |
| vHost | Hôtes : modèle, sockets, cœurs, RAM physique, version ESXi |
| vDatastore | Capacité, provisionné, libre par datastore |
| vHealth | Snapshots oubliés, VM orphelines, disques zombies |

:::caution
Un export RVTools est une carte de votre système d'information : noms de VM, adresses IP, versions d'OS,
snapshots. Avant de l'envoyer à un intégrateur, passez les colonnes de noms au filtre, ou au minimum
sachez ce que vous donnez. Et ne le posez jamais sur un partage public.
:::

## Lire les quatre chiffres qui comptent

Le débriefing Live Optics de juillet 2026 a duré une heure. Tout tenait dans quatre indicateurs, que vous
trouverez aussi bien dans le rapport Live Optics que dans l'export RVTools.

| Indicateur | Où le lire | Ce que ça dit | Chez moi |
| --- | --- | --- | --- |
| Cœurs utilisés vs disponibles | Live Optics CPU ; vHost + vCPU | Le CPU est rarement le goulot en PME | 102 cœurs, largement suffisants |
| RAM utilisée vs libre | Live Optics Memory ; vMemory + vHost | Le vrai goulot d'un cluster ERP + VDI | ~1,2 To utilisés, ~350 Go libres |
| Capacité provisionnée vs utilisée | vDatastore + vDisk ; Live Optics Storage | Le thin provisioning masque l'écart | ~170 To provisionnés, ~94 Tio utilisés en miroir |
| IOPS et latence | Live Optics Performance | Pic et 95e percentile, pas la moyenne | à lire sur la semaine entière |

Trois remarques de lecture.

**Le CPU rassure toujours.** Un cluster de PME tourne rarement au-dessus de 30 % de CPU en moyenne. Ce
n'est pas une raison pour prendre moins de cœurs : les licences, elles, se comptent par cœur, et c'est là
que le chiffre devient intéressant pour le budget.

**La RAM est le vrai sujet.** Avec 350 Go libres sur un cluster étendu, la perte d'une salle entière fait
tomber la marge à zéro. Le dimensionnement de la RAM doit tenir compte du mode dégradé : combien de RAM
reste-t-il si trois nœuds sur six disparaissent ? C'est ce chiffre-là, pas le total, qui dicte la taille
des nœuds suivants.

**Provisionné n'est pas utilisé, et To n'est pas Tio.** 170 To provisionnés en thin, 94 Tio réellement
écrits en miroir vSAN (donc environ la moitié de données utiles), le tout mélangé entre unités décimales et
binaires : c'est le terrain préféré des devis mal comparés. Ramenez tout en Tio utiles avant de lire une
proposition.

## Transformer les chiffres en scénarios

Le rapport ne décide rien, mais il cadre. Voici ce qui est ressorti du débriefing, en ordre d'importance.

1. **Le prix des SSD NVMe a monté**, ce qui rend l'hyperconvergence moins attractive qu'il y a cinq ans :
   chaque nœud embarque son stockage, et l'ajout de capacité passe par l'ajout de nœuds, donc de licences.
2. **Une baie SAN avec déduplication et compression** change l'équation. Le constructeur avance un ratio de
   réduction élevé sur ses modèles QLC ; exigez-le mesuré sur vos données, pas sur une brochure.
3. **HCI et trois-tiers doivent être chiffrés tous les deux**, plus un renouvellement à l'identique, pour
   avoir un point de comparaison honnête.
4. **La marge à cinq ans** se calcule sur la RAM en mode dégradé et sur le stockage utile, avec le rythme de
   croissance observé entre deux exports RVTools (celui de mars et celui de juin, dans mon cas).
5. **L'hyperviseur reste ouvert** : Hyper-V ré-étudié, Azure Local sérieux à cause de la Software Assurance
   déjà payée, compatibilité Vates à vérifier. Le matériel doit pouvoir porter plusieurs candidats.
6. **La sauvegarde attend** : Veeam sera renouvelé après, une fois l'architecture cible connue.

Avant tout devis, j'ai demandé un document d'architecture détaillé et des schémas réseau niveaux 1 à 3.
Un intégrateur qui ne peut pas dessiner ce qu'il vend ne le comprend pas mieux que vous.

:::note
Demandez le compte rendu de réunion au vendeur, pas l'inverse. Je l'ai formulé en une phrase : « en tant
qu'informaticien fainéant, je vous laisse la transcription ». Ça marche, et ça vous laisse relire ce qu'il
a compris de votre besoin.
:::

## Les pièges rencontrés

- **Les licences perdues ne se voient pas dans RVTools.** L'onglet vLicense affiche ce que vCenter croit
  avoir. Les licences perpétuelles jamais rattachées au portail Broadcom après la migration sont considérées
  comme perdues : vérifiez le portail, pas l'export.
- **Une semaine de collecte qui ne ressemble à rien.** Choisissez-la.
- **Le rapport lu par le vendeur uniquement.** Demandez le PDF Live Optics complet et lisez-le avant la
  réunion.
- **La décision sous pression.** L'échéance est connue, les chiffres aussi ; le reste peut attendre le
  budget de fin d'année.

## Pour aller plus loin

- [Broadcom, VMware et la facture qui a doublé](/blog/broadcom-vmware-facture-pme/) : le contexte de ce
  renouvellement.
- [VxRail 9, abonnement VCF obligatoire et Azure Local : ce que Dell m'a répondu](/blog/vxrail-9-vcf-obligatoire-et-azure-local-ce-que-dell-ma-repondu/) :
  la suite, et les portes fermées.
- [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/) :
  la même méthode appliquée au réseau.

<!-- source : mails « Export RVTools », 2026-03-17 ; « Licences vCenter perdues », 2026-03-19 ; « Renew Infrastructure — compte rendu », 2026-06-15 ; « Debrief Live Optics », 2026-07-08 ; « Schémas réseau + HCI DATD v1.0 », 2026-08-04 -->

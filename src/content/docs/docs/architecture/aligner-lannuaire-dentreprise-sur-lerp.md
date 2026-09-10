---
title: "Aligner l'annuaire d'entreprise sur l'ERP : référentiel maître, normalisation et groupes par statut"
description: "Comptes fantômes, matricules divergents, groupes de sécurité obsolètes : la méthode pour faire de l'ERP le référentiel maître des identités, mesurer les écarts et refondre les groupes par statut réel."
published: 2026-03-20
updated: 2026-04-17
category: architecture
tags: [active-directory, entra-id, identite, gouvernance, erp, groupes]
level: avancé
status: à jour
featured: false
tested_on: [Active Directory, Microsoft Entra ID]
sidebar:
  label: "Aligner l'annuaire d'entreprise sur l'ERP"
---

Un jour, on compare la liste des salariés sortie de l'ERP avec la liste des comptes de l'annuaire, et on découvre
que ce ne sont pas les mêmes personnes. Des comptes actifs pour des gens partis depuis des mois. Des salariés
présents depuis trois semaines qui n'ont toujours pas de compte, ou qui en ont deux. Des matricules écrits d'un
côté avec des zéros devant, de l'autre sans. Rien de tout cela n'est spectaculaire, et c'est bien le problème :
personne n'appelle le support pour signaler qu'un compte n'aurait pas dû exister.

J'ai lancé ce chantier au printemps 2026 dans ma boîte, une PME industrielle. Il a commencé comme un exercice de
rapprochement de fichiers et il s'est terminé en refonte de la gouvernance des identités. Cette fiche décrit la
méthode, dans l'ordre où je l'ai appliquée.

## Désigner un référentiel maître, sinon vous arbitrerez à chaque conflit

C'est la première décision, et elle est politique avant d'être technique. Tant que deux systèmes prétendent tous
les deux dire la vérité sur les salariés, chaque écart devient une négociation : qui a raison, l'annuaire ou
l'ERP ? Multipliez par deux cents comptes et vous avez un chantier sans fin.

J'ai désigné **l'ERP comme référentiel maître pour l'identité et le matricule**. C'est lui qui porte le contrat de
travail, l'entrée, la sortie, le service d'affectation ; c'est le seul système qu'un service RH met réellement à
jour parce que la paie en dépend. L'annuaire, lui, devient un **consommateur** : il s'aligne, il ne décide pas.

:::note
Le référentiel maître n'est pas forcément l'ERP. Ce peut être un SIRH, une base RH, n'importe quel système où
l'entrée et la sortie d'un salarié sont saisies parce qu'elles ont une conséquence financière. Le critère n'est
pas la richesse fonctionnelle, c'est **la fiabilité de mise à jour**. Choisissez le système que quelqu'un est
obligé de tenir à jour.
:::

## Prérequis

- Un export des salariés depuis le référentiel maître, avec le **matricule**, le nom, le prénom, le service et le
  statut d'activité.
- Un accès en lecture à l'annuaire, et de quoi produire un export équivalent.
- Un interlocuteur RH identifié, disponible pour arbitrer. Sans lui, ce chantier n'aboutit pas : vous savez qu'un
  compte n'a pas de correspondance, vous ne savez pas pourquoi.
- Aucune modification en masse tant que les trois points ci-dessus ne sont pas réunis.

## Choisir le pivot : le matricule, jamais le patronyme

Le rapprochement se fait sur un identifiant unique et stable. Le matricule est le seul candidat sérieux.

Le nom ne l'est pas : homonymes, changements de nom, orthographes divergentes (accents, particules, noms
composés). Un rapprochement par patronyme produit des faux positifs — deux personnes fusionnées — et des faux
négatifs — une même personne comptée deux fois. Les deux mènent à des décisions fausses sur des comptes réels.

Côté annuaire, le matricule se stocke dans un attribut prévu pour ça : `employeeNumber` ou `employeeID` dans
Active Directory, `employeeId` côté Entra ID. S'il est vide sur une partie du parc, c'est le premier lot de
travail : le remplir, à la main s'il le faut, avant toute comparaison.

## Produire le classeur à trois feuilles

L'outil de pilotage tient dans un classeur de trois feuilles. Il est volontairement simple : il doit être lisible
par les RH, pas seulement par l'informatique.

| Feuille | Contenu | Décision attendue |
| --- | --- | --- |
| **Export du référentiel** | La liste des salariés telle que sortie de l'ERP | Aucune : c'est la référence |
| **Pas dans l'annuaire** | Salariés présents dans l'ERP sans compte correspondant | Créer le compte |
| **Dans mon annuaire** | Comptes présents dans l'annuaire sans salarié correspondant | Désactiver le compte, ou compléter l'ERP |

L'export de l'annuaire et la comparaison tiennent en quelques lignes :

```powershell title="Exporter les comptes de l'annuaire avec leur matricule"
Get-ADUser -Filter * -Properties employeeNumber, department, title, enabled, whenCreated |
  Select-Object SamAccountName, GivenName, Surname, employeeNumber, department, title, Enabled |
  Export-Csv -Path C:\temp\annuaire.csv -NoTypeInformation -Encoding UTF8 -Delimiter ";"
```

```powershell title="Comparer sur le matricule, dans les deux sens"
$erp      = Import-Csv C:\temp\erp.csv      -Delimiter ";"
$annuaire = Import-Csv C:\temp\annuaire.csv -Delimiter ";"

# Normaliser le pivot des deux côtés avant de comparer (zéros non significatifs, espaces)
$erp      | ForEach-Object { $_.matricule       = $_.matricule.Trim().TrimStart("0") }
$annuaire | ForEach-Object { $_.employeeNumber  = $_.employeeNumber.Trim().TrimStart("0") }

Compare-Object -ReferenceObject $erp -DifferenceObject $annuaire `
  -Property matricule -PassThru |
  Export-Csv C:\temp\ecarts.csv -NoTypeInformation -Encoding UTF8 -Delimiter ";"
```

Dans le résultat, l'indicateur de côté fait tout le travail : les lignes venant du référentiel sont des comptes à
créer, celles venant de l'annuaire sont des comptes à examiner.

:::caution
Un compte sans salarié correspondant n'est pas automatiquement un compte à supprimer. Ce peut être un compte de
service, une boîte partagée, un intérimaire absent de l'ERP, un stagiaire, un prestataire. Chaque catégorie mérite
une convention explicite — un préfixe, une unité d'organisation dédiée — pour sortir du périmètre de comparaison
au lieu de repolluer le rapport tous les mois.
:::

## Faire valider par les RH avant de toucher à un seul compte

C'est la règle qui ne souffre aucune exception : **on ne désactive rien en masse sans validation RH**. Le classeur
part aux RH, feuille par feuille, avec une colonne « décision » à remplir. On applique ce qui revient signé.

Cette étape a un second effet, plus intéressant que le nettoyage lui-même : elle rend visible aux RH la réalité de
leur propre saisie. Un salarié parti dont l'annuaire a encore le compte actif, c'est presque toujours une sortie
non enregistrée côté ERP. Le rapport ne mesure pas seulement la qualité de l'annuaire, il mesure la qualité du
processus RH.

## Normaliser avant d'automatiser

Une fois les écarts traités, il reste à empêcher qu'ils reviennent. Deux normalisations, dans cet ordre.

**Les matricules.** Même format des deux côtés : longueur, zéros non significatifs, préfixe éventuel. Sans cela,
aucune jointure ne tient dans la durée, et vous referez le rapprochement à la main à chaque campagne.

**Les logins.** Une règle unique, écrite, qui traite explicitement les cas qui font mal :

- la forme de base (`prenom.nom` chez moi) ;
- les accents et les cédilles : translittérés, systématiquement ;
- les particules et les noms composés : conservés ou contractés, mais toujours de la même façon ;
- les homonymes : la règle de départage décidée à l'avance (initiale du second prénom, suffixe numérique) et pas
  improvisée le jour où le cas se présente ;
- la longueur maximale et ce qu'on tronque en priorité.

Écrivez cette règle dans un document d'une page. C'est elle qui rendra la création de compte automatisable plus
tard, et elle seule.

## Refondre les groupes de sécurité sur les statuts réels

Le rapprochement met en lumière un second désordre : des groupes hérités qui ne correspondent plus à
l'organisation. Chez moi, un groupe « automatisme » mélangeait deux ateliers distincts, un autre réunissait la
comptabilité et les RH. Des groupes comme ça donnent des droits par accident.

La cible que j'ai retenue tient en trois familles :

1. **Groupes par poste** : ce que fait la personne, donc ce à quoi elle accède. Un groupe par fonction réelle, pas
   par service historique.
2. **Groupes par statut** : intérim, stage, période d'essai, recrutement en cours — et pas seulement « CDI ». Ce
   sont ces statuts qui portent les restrictions les plus utiles : durée de vie du compte, accès distant, droits
   sur les données sensibles.
3. **Chaîne hiérarchique** : référent → manager → responsable → direction, modélisée dans l'annuaire, pour que les
   circuits de validation et les listes de diffusion dynamiques s'appuient dessus au lieu d'être maintenus à la
   main.

:::tip
Les groupes par statut sont ceux qui rapportent le plus vite. Un intérimaire dont le compte hérite d'une date
d'expiration parce qu'il est dans le bon groupe, c'est un compte fantôme de moins l'année prochaine — sans qu'on
ait à y penser.
:::

## Supprimer la création de compte « au fil de l'eau »

Dernier point, le plus structurant : **le compte naît du flux RH, pas d'un mail au service informatique**. Tant
qu'un compte se crée sur demande orale ou par message, l'annuaire diverge à nouveau dès la semaine suivante, et le
travail précédent est perdu.

Concrètement, l'entrée d'un salarié dans le référentiel maître déclenche la demande de création, avec son
matricule, son poste et son statut. Le départ déclenche la désactivation. L'informatique exécute et vérifie, elle
n'arbitre plus.

## Le vendre comme un projet de sécurité, pas de propreté

Ce chantier est systématiquement perçu comme administratif, quelque chose qu'on fera « quand on aura le temps ».
Présenté ainsi, il n'est jamais financé.

Il faut le présenter pour ce qu'il est. Un compte actif après un départ, c'est un accès qui reste ouvert. Un groupe
trop large, c'est un droit accordé par erreur. Un annuaire qui diverge du réel, ce sont des listes de diffusion
incomplètes, des droits mal attribués, une gestion de flotte mobile approximative et un SSO qui propage tout cela
à chaque application. Le référentiel d'identité conditionne tout le reste : tant qu'il est faux, chaque projet qui
s'appuie dessus hérite du désordre.

C'est l'argument qui fait passer le sujet en comité, et c'est le seul qui soit exact.

## Pour aller plus loin

- [Checklist d'intégration d'un nouveau collaborateur](/docs/dsi/checklist-dintegration-dun-nouveau-collaborateur/) : le processus d'entrée, une fois le flux RH en place.
- [Listes de diffusion dynamiques : la panne silencieuse](/docs/microsoft-365/listes-de-diffusion-dynamiques-la-panne-silencieuse/) : ce qui casse quand un attribut d'annuaire est vide.
- [Remettre les contrôleurs de domaine en Tier 0](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/) : l'autre moitié de la gouvernance des identités, côté infrastructure.

<!-- source : mail « Alignement des données salariés entre l'ERP et l'annuaire », 18/03/2026 ; fil de suivi du 15/04/2026 -->

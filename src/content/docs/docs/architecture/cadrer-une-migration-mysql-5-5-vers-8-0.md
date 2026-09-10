---
title: "Cadrer une migration MySQL 5.5 sur Windows Server 2008 vers MySQL 8.0 sur Windows Server 2025"
description: "Migrer l'entrepôt de données d'une GPAO alimenté par un ETL en fichiers plats : objectifs à fixer, dump et rechargement, dates zéro et collations mélangées, contrôle table par table et retour arrière."
published: 2025-01-30
category: architecture
tags: [mysql, migration, gpao, etl, windows-server, bi]
level: avancé
status: à jour
featured: false
tested_on: [MySQL 5.5, MySQL 8.0, Windows Server 2008, Windows Server 2025]
sidebar:
  label: "Cadrer une migration MySQL 5.5 sur Windows…"
---

L'entrepôt de données de la GPAO, celui que la BI interroge pour ses tableaux de bord, vivait sur le dernier
serveur Windows Server 2008 de la boîte, avec un MySQL 5.5 dessus. Deux produits hors support depuis des années,
sur une machine que la montée de niveau fonctionnel de l'Active Directory allait de toute façon condamner. Le
mécanisme d'alimentation est rustique et robuste : toutes les heures, l'ETL de la GPAO exporte ses tables en
fichiers texte et les charge dans MySQL en appelant `mysql.exe` en ligne de commande.

J'écris « cadrer » et pas « migrer » parce que le SQL n'est pas la partie difficile. La difficulté, c'est que
trois acteurs se partagent la chaîne : le prestataire de la GPAO, le prestataire de la BI et moi, responsable
informatique seul. Ce qui a fait la différence, c'est ce qui était écrit avant le premier devis. Déménager une
bibliothèque, ce n'est pas porter les cartons qui est dur ; c'est savoir dans quel ordre les livres seront
rangés de l'autre côté.

## Fixer les objectifs par écrit, avant tout devis

Les objectifs ont été posés aux prestataires en décembre, un mois avant le lancement. Quatre lignes, et c'est
leur brièveté qui a évité les discussions :

| Objectif | Pourquoi | Qui |
| --- | --- | --- |
| MySQL 8.0 | version supportée, sécurité, compatibilité des outils BI récents | prestataire GPAO |
| Windows Server 2025 | serveur neuf, plus de 2008 dans le domaine | moi |
| Ajouter les données manquantes | des tables métier n'étaient jamais exportées | prestataire GPAO + BI |
| Passer en incrémental | arrêter de recharger toute la base chaque heure | prestataire GPAO |

Deux points de cadrage non techniques, appris à mes dépens :

- **Ce que couvre la maintenance annuelle.** Le changement de serveur a donné lieu à une facture surprise du
  prestataire. Demandez par écrit, avant, si l'intervention est comprise dans le contrat.
- **L'accès des prestataires.** Un compte VPN nominatif par intervenant, jamais de compte partagé, mot de passe
  transmis par un lien Vaultwarden Send à usage unique, compte désactivé à la fin de la prestation. Ça se
  décide au cadrage, pas la veille de l'intervention.

## Comprendre ce qui change entre 5.5 et 8.0

Pas de mise à niveau sur place depuis 5.5 : MySQL ne supporte la montée directe vers 8.0 que depuis 5.7. La
méthode est donc un export logique complet rechargé sur le nouveau serveur, ce qui tombe bien puisqu'on change
aussi de machine. Mais 8.0 n'est pas seulement plus récent, il est moins tolérant.
Tout ce que 5.5 laissait passer en silence devient une erreur.

| Ce qui change | Conséquence sur un entrepôt alimenté par fichiers plats |
| --- | --- |
| `sql_mode` strict par défaut (`STRICT_TRANS_TABLES`, `NO_ZERO_DATE`, `NO_ZERO_IN_DATE`) | les dates `0000-00-00 00:00:00` sont refusées : `ERROR 1292 (22007): Incorrect datetime value` |
| plus de troncature silencieuse | une valeur trop longue pour sa colonne fait échouer la ligne au lieu d'être coupée |
| `local_infile` désactivé côté serveur | `LOAD DATA LOCAL INFILE` échoue tant que le serveur ne l'autorise pas |
| jeu de caractères par défaut `utf8mb4` (au lieu de `latin1`) | les tables recréées sans préciser leur charset changent de collation |
| authentification `caching_sha2_password` par défaut | un vieux pilote ODBC côté BI peut refuser de se connecter |

La question à trancher au cadrage : corriger les données, ou relâcher le serveur ? Un `sql_mode` allégé
dans `my.ini` fait passer les dates zéro, mais vous emportez l'incohérence avec vous. Nettoyer coûte plus cher
au début et rapporte à chaque rapport BI ensuite. Sur les collations, en revanche, j'ai assumé le pragmatisme :
tout mettre en `latin1_danish_ci` (la collation par défaut de l'ETL) si ça nous évitait de nous arracher les
cheveux table par table.

## Préparer le nouveau serveur

Côté moi : un Windows Server 2025 propre, MySQL 8.0 installé, et le **client** MySQL 8 dans un dossier dédié,
par exemple `D:\PRG\MYSQL8`, parce que c'est ce chemin que l'ETL va appeler. Deux lignes dans la configuration
du serveur :

```ini title="my.ini (extrait)"
[mysqld]
local_infile=1
# À n'utiliser que si vous assumez de garder les données historiques non conformes :
# sql_mode="NO_ENGINE_SUBSTITUTION"
```

Côté prestataire : création de la base `dw`, d'un utilisateur dédié à l'ETL, puis restauration d'un export
complet de l'ancienne base. Si un outil de la chaîne BI n'accepte pas la nouvelle méthode d'authentification, le
compte se crée avec l'ancienne, explicitement :

```sql title="Base, compte ETL et compte BI"
CREATE DATABASE dw;
CREATE USER 'etl_dw'@'%' IDENTIFIED BY '***';
GRANT ALL PRIVILEGES ON dw.* TO 'etl_dw'@'%';
CREATE USER 'bi_lecture'@'%' IDENTIFIED WITH mysql_native_password BY '***';
GRANT SELECT ON dw.* TO 'bi_lecture'@'%';
```

```cmd title="Export sur l'ancien serveur, import sur le nouveau"
mysqldump -u root -p --databases dw --routines --triggers > dw.sql
mysql -u root -p < dw.sql
```

## Basculer l'ETL de la GPAO

Une seule manipulation dans l'outil métier, et elle tient dans un champ. Connecté à la GPAO avec le compte
technique de l'ETL (`/LOGTO ETL`), menu **ETL → configuration**, champ **« database interface »** :

```text title="Champ « database interface » de l'ETL"
D:\PRG\MYSQL8\mysql.exe --host=db-dw.example.com --user=etl_dw --password=*** --local-infile=1 < #PHRASE#
```

Valider (F2). Le job reste planifié toutes les heures par un `.bat` qui journalise dans un fichier ; ce journal
devient votre premier outil de diagnostic. Gardez l'ancienne ligne dans un fichier texte : c'est votre retour
arrière, à la seconde près.

:::tip
Le client MySQL sait lire un profil
chiffré créé par `mysql_config_editor set --login-path=dw --host=… --user=… --password`, que l'on appelle
ensuite avec `mysql.exe --login-path=dw`. À prévoir dans la version suivante de l'ETL, pas au milieu de la
migration.
:::

Ensuite, basculez la BI vers le nouveau serveur et laissez l'ancien intact et éteint pendant plusieurs
jours : un serveur 2008 arrêté ne coûte rien, un serveur 2008 effacé trop tôt coûte une semaine.

## Traiter les tables en erreur

Le premier import complet est passé ; les suivants ont fait apparaître les tables qui ne rentraient plus. Le
schéma de correction est toujours le même : vider, aligner la collation, recharger.

```sql title="Vider, convertir, recharger"
TRUNCATE TABLE fgp_ofl;
ALTER TABLE dw.fgp_ofl_arc CONVERT TO CHARACTER SET latin1 COLLATE latin1_danish_ci;
LOAD DATA LOCAL INFILE 'C:\\export\\fgp_ofl.txt'
  INTO TABLE fgp_ofl
  FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';
```

:::caution
`ALTER TABLE … COLLATE` seul ne change que la collation par défaut des futures colonnes ; pour convertir les
données existantes, c'est `CONVERT TO CHARACTER SET … COLLATE …`. Et surtout, ne convertissez jamais une
table pendant que l'ETL la charge : c'est ce qui provoquait des déconnexions en pleine importation. Arrêtez le
job, videz, convertissez, relancez l'export.
:::

Les symptômes rencontrés et ce qu'ils voulaient dire :

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| `ERROR 1292 (22007): Incorrect datetime value` | date `0000-00-00` dans le fichier | corriger à la source, ou `NULL` par défaut sur la colonne |
| colonne vide en base alors que le fichier contient la donnée | délimiteur ou collation qui ne correspondent pas | vérifier `FIELDS TERMINATED BY` et le charset du fichier |
| caractères spéciaux (`°`) transformés | charset du fichier différent de celui de la table | ajouter `CHARACTER SET latin1` à la clause `LOAD DATA` |
| concaténations bizarres dans une colonne | une table qui en cache plusieurs | documenter avant de migrer (voir ci-dessous) |
| déconnexion pendant l'import | conversion de collation lancée en parallèle | séquencer : arrêt du job, conversion, reprise |

## Contrôler table par table, puis documenter

La validation ne se délègue pas. Pour chaque table, comparez l'ancien et le nouveau serveur, et lisez un
échantillon avec les yeux d'un utilisateur de la BI :

```sql title="Comparaison rapide ancien / nouveau"
SELECT COUNT(*) FROM fgp_ofl;
CHECKSUM TABLE fgp_ofl;
SELECT * FROM fgp_ofl ORDER BY RAND() LIMIT 20;
```

C'est en lisant ces échantillons que l'on découvre qu'une table est en réalité « trois tables en une », avec un
numéro d'ordre de fabrication, un type et la première lettre de l'article combinés dans une même colonne. Ce
n'est pas un bug de migration, c'est une convention métier que personne n'avait écrite.
Documentez-la avant de migrer, sinon la BI produira des chiffres justes sur des données mal découpées.

Le livrable final n'est pas la base, c'est une note d'une page : ce qui a été migré, la ligne de configuration
de l'ETL, la procédure de retour arrière, les tables corrigées et pourquoi, et qui appeler chez chaque
prestataire. La prochaine personne qui touchera cette chaîne, ce sera peut-être vous dans trois ans, sans aucun
souvenir.

## Pour aller plus loin

- Pourquoi le serveur 2008 ne pouvait de toute façon pas rester :
  [Mettre à niveau des contrôleurs de domaine 2012 vers 2022 en une soirée](/docs/windows-server/monter-des-controleurs-de-domaine-2012-vers-2022-en-une-soiree/).
- La même logique de cadrage appliquée à un projet réseau :
  [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/).
- La liste officielle des changements à vérifier avant de migrer :
  [MySQL 8.0 : Upgrade Prerequisites](https://dev.mysql.com/doc/refman/8.0/en/upgrade-prerequisites.html).

<!-- source : fil « Migration MySQL GPAO / interco », 2025-01-22 → 2025-01-30 -->

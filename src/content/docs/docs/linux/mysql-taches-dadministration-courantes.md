---
title: "MySQL : les tâches d'administration qui reviennent tout le temps"
description: "Sauvegarder et restaurer une base, recharger des tables depuis un export texte, créer des comptes avec les bons droits, réparer une table cassée et savoir ce qui remplit le disque. Le mémo d'un admin qui n'est pas DBA."
published: 2026-08-25
category: linux
tags: [mysql, mariadb, sauvegarde, droits, base-de-donnees]
level: intermédiaire
status: à jour
tested_on: [MySQL 8.4]
sidebar:
  label: "MySQL : tâches d'administration"
---

Dans une PME, personne n'a le titre de DBA. Il y a un serveur MySQL sous une application métier, un autre sous
un entrepôt de données qui alimente les tableaux de bord, et la même personne qui gère les deux entre deux
tickets. Ce qui compte, ce n'est pas de connaître MySQL en profondeur : c'est d'exécuter sans hésiter les cinq
ou six gestes qui reviennent chaque mois, et de ne pas improviser le jour où une table refuse de s'ouvrir.

Voici mon mémo. Il vaut pour MySQL comme pour MariaDB, à quelques différences de syntaxe près que je signale au
passage.

## Se connecter au serveur

```bash
mysql -u root -p
mysql -u appli -p -h 192.0.2.20 nom_de_la_base
```

Le `-p` sans valeur accolée demande le mot de passe de façon interactive : c'est la bonne habitude, parce qu'un
mot de passe écrit sur la ligne de commande finit dans l'historique du shell et dans la liste des processus.
Sous Windows, le client se trouve dans le dossier `bin` de l'installation MySQL, et il faut souvent s'y rendre
à la main avant de taper la commande.

:::tip
Pour les scripts et les tâches planifiées, ne mettez jamais le mot de passe dans la commande. Créez un fichier
`~/.my.cnf` en `chmod 600` :

```ini title="~/.my.cnf"
[client]
user = sauvegarde
password = votre-mot-de-passe
```

Les commandes `mysql` et `mysqldump` le lisent toutes seules. Le mot de passe n'apparaît plus nulle part
ailleurs que dans ce fichier, protégé par les droits du système.
:::

## Sauvegarder

Une sauvegarde de VM ne suffit pas pour une base : elle capture des fichiers en cours d'écriture. Il faut un
export logique, et `mysqldump` reste l'outil de base.

```bash title="Sauvegarde d'une base"
mysqldump --single-transaction --routines --triggers --events \
  -u sauvegarde -p nom_de_la_base | gzip > /srv/backup/base-$(date +%F).sql.gz
```

```bash title="Toutes les bases, une par fichier"
for db in $(mysql -N -e "SHOW DATABASES" | grep -Ev '^(information_schema|performance_schema|sys)$') ; do
  mysqldump --single-transaction --routines --triggers --events "$db" \
    | gzip > "/srv/backup/${db}-$(date +%F).sql.gz"
done
```

Trois options méritent qu'on s'y arrête :

- `--single-transaction` prend un instantané cohérent **sans bloquer les écritures**, mais uniquement pour les
  tables InnoDB. Si des tables MyISAM traînent dans la base, elles ne sont pas couvertes par cet instantané, et
  il faut leur préférer `--lock-tables` — donc une interruption courte.
- `--routines` et `--triggers` : sans elles, procédures stockées et déclencheurs disparaissent silencieusement
  de votre sauvegarde. On s'en aperçoit à la restauration, au pire moment.
- `--events` : même chose pour les tâches planifiées internes au serveur.

:::caution
Une sauvegarde qui n'a jamais été restaurée n'est pas une sauvegarde. Prenez une heure, une fois par trimestre,
pour recharger le dernier export dans une base jetable et lancer deux ou trois requêtes dessus. C'est le seul
test qui compte.
:::

## Restaurer, en entier ou par morceaux

La restauration complète est l'opération la plus simple de toute la fiche :

```bash
mysql -u root -p -e "CREATE DATABASE restauration CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
gunzip < /srv/backup/base-2026-08-24.sql.gz | mysql -u root -p restauration
```

Beaucoup plus fréquent, en pratique : recharger quelques tables depuis des fichiers texte produits par une
application métier. C'est le quotidien d'un entrepôt de données alimenté par des exports d'ERP.

```sql title="Rechargement d'une table depuis un export texte"
USE entrepot;

TRUNCATE TABLE of_ligne;

LOAD DATA LOCAL INFILE '/srv/import/of_ligne.txt'
  INTO TABLE of_ligne
  FIELDS TERMINATED BY ','
  LINES TERMINATED BY '\n';
```

Deux pièges, tous les deux garantis à la première tentative :

- **`LOCAL INFILE` est désactivé par défaut**, des deux côtés. Lancez le client avec `mysql --local-infile` et
  autorisez-le sur le serveur avec `SET GLOBAL local_infile = 1`. Remettez-le à zéro ensuite : c'est une
  fonction qui permet de lire des fichiers du poste client, elle n'a rien à faire ouverte en permanence.
- **Les collations doivent concorder.** Une table héritée en `utf8mb3_general_ci` et une autre en `utf8mb4`
  produisent un « Illegal mix of collations » dès la première jointure. On aligne la table avec
  `ALTER TABLE entrepot.of_ligne COLLATE utf8mb3_general_ci;` — ou, mieux, on migre tout vers `utf8mb4` une
  bonne fois, en dehors des heures de production.

## Créer des comptes et donner les bons droits

```sql
CREATE USER 'appli'@'192.0.2.20' IDENTIFIED BY 'un-mot-de-passe-long';
GRANT SELECT, INSERT, UPDATE, DELETE ON entrepot.* TO 'appli'@'192.0.2.20';
FLUSH PRIVILEGES;
```

La partie après l'arobase est l'hôte depuis lequel le compte a le droit de se connecter. `'appli'@'%'`
l'autorise depuis n'importe où, ce qui est pratique dix minutes et dangereux ensuite. Prenez l'adresse du
serveur applicatif, ou `localhost` si l'application tourne sur la même machine.

| Privilège | Ce qu'il permet |
| --- | --- |
| `SELECT` | Lire les données |
| `INSERT`, `UPDATE`, `DELETE` | Écrire, modifier, supprimer des lignes |
| `CREATE`, `DROP` | Créer et supprimer des bases et des tables |
| `ALL PRIVILEGES` | Tout, y compris ce que vous n'aviez pas prévu |

Pour retirer des droits ou supprimer un compte :

```sql
SHOW GRANTS FOR 'appli'@'192.0.2.20';
REVOKE ALL PRIVILEGES ON entrepot.* FROM 'appli'@'192.0.2.20';
DROP USER 'appli'@'192.0.2.20';
```

:::caution
Le réflexe `GRANT ALL PRIVILEGES ON *.* TO 'appli'@'%'` règle effectivement le ticket du jour. Il donne aussi à
l'application le droit de supprimer toutes les bases du serveur, y compris celles qui n'ont rien à voir avec
elle, et c'est ce compte que réutilisera le prochain prestataire parce qu'il est « celui qui marche ». Un
compte, une base, les verbes strictement nécessaires.
:::

`FLUSH PRIVILEGES` n'est en réalité indispensable qu'après une modification directe des tables du schéma
`mysql`. Après un `GRANT` ou un `REVOKE`, MySQL recharge tout seul.

## Réparer une table

Le symptôme habituel : une table d'un entrepôt de données qui renvoie une erreur à chaque requête, souvent
après un arrêt brutal du serveur ou un disque plein.

```sql
CHECK TABLE entrepot.of_ligne;
```

La suite dépend du moteur de stockage, et c'est la distinction essentielle :

```sql
-- MyISAM, ARCHIVE et assimilés
REPAIR TABLE entrepot.of_ligne;
```

```bash
# en masse, depuis le shell
mysqlcheck --auto-repair --check --all-databases -u root -p
```

Pour **InnoDB**, `REPAIR TABLE` n'existe pas. La reconstruction se fait en réécrivant la table, ce qui purge au
passage la fragmentation :

```sql
ALTER TABLE entrepot.of_ligne ENGINE=InnoDB;
```

Si le serveur ne démarre plus du tout, le paramètre `innodb_force_recovery` permet de le relancer en lecture
seule pour exporter les données avec `mysqldump`, puis de repartir d'une base neuve. C'est une roue de secours,
pas un mode de fonctionnement : on l'utilise pour sortir les données, pas pour continuer à travailler.

:::danger
Avant toute réparation : arrêtez les écritures et copiez les fichiers de la base. Une réparation qui se passe
mal sur une table déjà abîmée transforme un incident en perte de données. Le `mysqldump` d'hier soir est votre
seul vrai filet.
:::

## Savoir ce qui remplit le disque

La question arrive toujours par la supervision, quand le volume de données passe les 90 %.

```sql title="Taille de chaque base, en Mo"
SELECT table_schema AS base,
       ROUND(SUM(data_length + index_length) / 1024 / 1024) AS taille_mo
FROM information_schema.tables
GROUP BY table_schema
ORDER BY taille_mo DESC;
```

Remplacez `table_schema` par `table_name` et ajoutez un `WHERE table_schema = 'entrepot'` pour descendre au
niveau des tables : dans 90 % des cas, une seule table d'historique explique tout.

Côté système, `du -sh /var/lib/mysql/*` donne la vue réelle sur le disque. Attention à l'écart entre les deux :
supprimer des lignes ne rend pas l'espace au système de fichiers. Il faut reconstruire la table
(`ALTER TABLE … ENGINE=InnoDB` ou `OPTIMIZE TABLE`) pour que le fichier rétrécisse — et prévoir, le temps de
l'opération, de la place pour deux copies de la table.

## Pour aller plus loin

- Le cadrage d'une montée de version, quand le mémo ne suffit plus :
  [Cadrer une migration MySQL 5.5 vers 8.0](/docs/architecture/cadrer-une-migration-mysql-5-5-vers-8-0/).
- Quand la réponse à « le disque est plein » est « agrandir le disque » :
  [Agrandir un disque sous Linux avec LVM](/docs/linux/agrandir-un-disque-avec-lvm/).
- Ce qu'on fait de ces données une fois qu'elles sont propres :
  [Exposer une GPAO legacy avec une API et Metabase](/docs/architecture/exposer-une-gpao-legacy-avec-une-api-et-metabase/).

<!-- source : procédures internes « MySQL : comptes et privilèges » et « Import de tables depuis un export texte », 2026-08-25 -->

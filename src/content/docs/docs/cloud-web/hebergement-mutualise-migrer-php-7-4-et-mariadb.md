---
title: "Hébergement mutualisé : passer un vieux site de PHP 7.4 à PHP 8 et migrer MariaDB sans tout casser"
description: "Un site vitrine encore en PHP 7.4 et MariaDB 10.6 chez un hébergeur mutualisé : préparer la bascule en préprod, corriger les dépréciations de PHP 8, vérifier les extensions et migrer la base sans coupure visible."
published: 2026-08-03
category: cloud-web
tags: [php, mariadb, hebergement-mutualise, apache, migration, infomaniak]
level: débutant
status: à jour
featured: false
tested_on: [Apache 2.4, PHP 7.4, PHP 8, MariaDB 10.6, MariaDB 10.11]
sidebar:
  label: "Hébergement mutualisé"
---

Fin juillet 2026, l'hébergeur mutualisé qui héberge nos sites vitrines envoie une de ces notifications
qu'on lit en diagonale : les versions PHP 7.4 et MariaDB 10.6 arrivent en fin de support, il faut passer
en PHP 8.x et MariaDB 10.11. Traduction : à une date donnée, votre site tournera sur une pile plus
récente, que vous ayez travaillé le sujet ou non.

Il faut le dire clairement : PHP 7.4 n'a plus de correctifs de sécurité depuis longtemps. Rester dessus
n'est pas une position tenable, surtout pour un site public exposé en permanence. La vraie question
n'est donc pas « faut-il migrer », mais « comment migrer sans découvrir un lundi matin que le formulaire
de contact renvoie une page blanche ».

Cette fiche décrit la démarche pour un petit site, sur un hébergement mutualisé où vous n'avez ni root,
ni SSH illimité, ni droit à l'erreur en production.

## Prérequis

- L'accès au panneau d'administration de l'hébergeur, avec le droit de changer la version PHP et de
  créer un sous-domaine.
- Un accès FTP/SFTP et un accès à la base (phpMyAdmin ou équivalent).
- Le code source du site, idéalement dans un dépôt Git. Sinon, une copie complète des fichiers avant de
  commencer.
- Le nom de la personne ou du prestataire qui pourra corriger le code, si ce n'est pas vous. Sur un CMS,
  cela veut dire vérifier que les thèmes et extensions ont une version compatible PHP 8.

## Sauvegarder avant de toucher à quoi que ce soit

Un hébergement mutualisé propose en général ses propres sauvegardes. Elles sont utiles, mais elles ne
vous appartiennent pas et leur restauration passe par le support. Prenez votre propre copie, chez vous :

```bash title="Copie locale des fichiers et de la base"
# Fichiers (adaptez l'hôte et le chemin)
rsync -avz --delete monsite@ftp.example.com:~/sites/example.com/ ./sauvegarde-site/

# Base de données, en UTF-8 et avec la structure complète
mysqldump --single-transaction --default-character-set=utf8mb4 \
  -h mysql.example.com -u utilisateur -p base_du_site > sauvegarde-base.sql
```

Vérifiez que le fichier `.sql` n'est pas vide et qu'il se termine bien par la ligne de fin de dump. Un
dump interrompu par un timeout, ça existe, et ça ne se voit qu'au moment de le réimporter.

## Faire l'inventaire avant de migrer

Avant de changer une version, sachez ce qui tourne. Un fichier temporaire dans un répertoire non public
suffit :

```php title="info.php — à supprimer immédiatement après lecture"
<?php phpinfo();
```

Ce qui vous intéresse : la version exacte de PHP, la liste des extensions chargées (`mysqli`, `pdo_mysql`,
`intl`, `gd`, `mbstring`, `curl`, `zip`), les valeurs de `memory_limit`, `upload_max_filesize` et
`max_execution_time`.

:::danger
Supprimez ce fichier dès la lecture faite. Une page `phpinfo()` accessible publiquement révèle chemins
absolus, extensions, versions et configuration : c'est une carte du serveur offerte à qui la demande.
:::

Côté base, notez la version exacte, le jeu de caractères et l'interclassement des tables :

```sql
SELECT VERSION();
SELECT table_name, table_collation FROM information_schema.tables WHERE table_schema = 'base_du_site';
```

## Monter une préprod, ne jamais tester en direct

C'est le cœur de la méthode et la seule chose qui vous évite une panne visible : on ne bascule pas la
production pour « voir si ça passe ». On crée un sous-domaine de préprod, par exemple
`preprod.example.com`, avec :

- une copie des fichiers du site ;
- une copie de la base, sous un autre nom ;
- **la nouvelle version de PHP** affectée à ce sous-domaine uniquement.

Sur un hébergement mutualisé, la version PHP se choisit par site ou par répertoire dans le panneau
d'administration. C'est justement ce qui rend la préprod facile : deux versions de PHP cohabitent sur le
même compte.

Pensez à bloquer l'indexation de la préprod, sinon vous récolterez du contenu dupliqué dans les moteurs
de recherche :

```text title="robots.txt de la préprod"
User-agent: *
Disallow: /
```

Et activez l'affichage des erreurs sur la préprod seulement, pour voir ce que PHP 8 vous reproche :

```ini title=".user.ini ou php.ini de la préprod"
display_errors = On
error_reporting = E_ALL
```

## Corriger les dépréciations de PHP 8

Passer de 7.4 à 8.x, ce n'est pas juste un numéro qui change : plusieurs comportements tolérés
disparaissent. Les cas que l'on rencontre le plus souvent sur du code ancien :

| Ce qui change | Symptôme | Correction |
|---|---|---|
| `each()` et `create_function()` supprimés | `Call to undefined function` | Remplacer par `foreach` et une fonction anonyme |
| Accès aux caractères d'une chaîne avec `{}` (`$s{0}`) | erreur de syntaxe | Utiliser les crochets `$s[0]` |
| Comparaisons entre nombre et chaîne plus strictes | conditions qui basculent | Comparer avec `===` ou convertir explicitement |
| Clé de tableau ou propriété absente | `Warning: Undefined array key`, `Attempt to read property on null` | Tester avec `isset()` ou `??` |
| Arguments passés dans le mauvais ordre ou en trop | `ArgumentCountError`, `TypeError` | Corriger l'appel, les erreurs ne sont plus silencieuses |
| Propriétés dynamiques (à partir de PHP 8.2) | `Deprecated: Creation of dynamic property` | Déclarer la propriété dans la classe |

La règle générale de PHP 8 : ce qui était un avertissement devient souvent une erreur, et ce qui était
silencieux devient un avertissement. Un code qui « marchait » en 7.4 pouvait en réalité produire des
dizaines de notices que personne ne regardait.

:::tip
Parcourez toutes les pages du site en préprod, y compris celles que personne ne visite : formulaire de
contact, page de recherche, panier, back-office, envoi de mail. Les erreurs PHP 8 ne se déclenchent que
sur le code réellement exécuté ; une page jamais ouverte est une page jamais testée.
:::

## Vérifier les extensions

Une extension présente en 7.4 n'est pas automatiquement activée dans la nouvelle version : chez
l'hébergeur, chaque version PHP a sa propre liste. Les oubliés classiques sont `intl` (formatage des
dates et des nombres, exigé par plusieurs frameworks) et `mysqli` quand le site utilise encore l'API
procédurale.

```php title="Contrôle rapide en préprod"
<?php
foreach (['mysqli', 'pdo_mysql', 'intl', 'mbstring', 'gd', 'curl', 'zip'] as $ext) {
    printf("%-10s : %s\n", $ext, extension_loaded($ext) ? 'ok' : 'MANQUANTE');
}
```

Si une extension manque, activez-la dans le panneau pour la version cible avant d'aller plus loin.

## Migrer la base de données

La montée de version de MariaDB est en général plus calme que celle de PHP : le SQL courant d'un site
vitrine passe sans modification. Deux points méritent tout de même un regard.

D'abord l'interclassement. Si vos tables sont encore en `utf8` (c'est-à-dire `utf8mb3`, sur trois
octets), c'est le bon moment pour passer en `utf8mb4`, qui gère l'intégralité de l'Unicode, émojis
compris. Testez d'abord en préprod, table par table :

```sql
ALTER TABLE ma_table CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Ensuite le mode SQL. Les versions récentes sont plus strictes sur les valeurs par défaut, les dates
invalides du type `0000-00-00` et les groupements incomplets. Si une requête d'insertion échoue après
migration, regardez `sql_mode` avant d'accuser le code.

La bascule elle-même consiste à réimporter le dump dans la nouvelle base, puis à changer les paramètres
de connexion du site :

```bash
mysql -h mysql.example.com -u utilisateur -p nouvelle_base < sauvegarde-base.sql
```

Le fichier de configuration à modifier dépend du site : `wp-config.php`, `configuration.php`, un
`.env`, ou un simple `config.inc.php` pour du code maison. Cherchez la chaîne de connexion, pas le nom
du fichier.

## Basculer la production

Quand la préprod fonctionne de bout en bout, la bascule tient en quelques minutes :

1. Prévenir, même pour un site vitrine. Un mail de trois lignes annonçant une intervention et une
   éventuelle indisponibilité de quelques minutes évite trois appels.
2. Reprendre une sauvegarde fraîche des fichiers et de la base.
3. Reporter en production les corrections de code validées en préprod.
4. Changer la version PHP du site dans le panneau d'administration.
5. Pointer la configuration vers la base migrée.
6. Recharger le site, vider le cache du CMS et celui du navigateur, retester les pages sensibles.

Gardez l'ancienne base et l'ancienne copie des fichiers au moins quelques semaines. Le retour arrière
consiste alors à remettre la version PHP précédente et l'ancienne configuration : c'est l'affaire de
deux minutes, à condition d'avoir gardé les deux.

:::note
Profitez de l'opération pour faire l'inventaire de vos domaines et de leurs registrars. Entre l'hébergeur
historique, celui repris d'un ancien prestataire et celui qui sert de DNS, on découvre souvent des
domaines dont personne ne surveille l'échéance. Un domaine expiré coûte plus cher qu'une migration PHP.
:::

## Pour aller plus loin

- La même logique appliquée à une base d'entreprise :
  [Cadrer une migration MySQL 5.5 vers 8.0](/docs/architecture/cadrer-une-migration-mysql-5-5-vers-8-0/).
- Pour absorber les changements d'URL sans réimprimer quoi que ce soit :
  [Mettre un alias DNS (CNAME) devant un SaaS](/docs/cloud-web/alias-dns-cname-devant-un-saas/).
- Les autres fiches [Cloud et web](/docs/cloud-web/).
- La documentation officielle de migration [UPGRADING de PHP 8](https://www.php.net/manual/fr/migration80.php).

<!-- source : mail « Mise à jour PHP et MariaDB sur l'hébergement mutualisé », 2026-07-28 -->

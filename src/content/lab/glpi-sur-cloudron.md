---
title: GLPI 11 packagé pour Cloudron, avec LDAP branché au premier démarrage
description: Pourquoi j'ai écrit mon propre package Cloudron pour GLPI, comment il s'initialise tout seul et ce que ça change pour la gestion de parc.
published: 2026-01-23
category: self-hosting
status: en production
stack: [Cloudron, GLPI 11, PHP 8.3, Apache, MariaDB, LDAP]
repo: https://github.com/vitetj/Cloudron-GLPI
tags: [cloudron, glpi, self-hosting, docker, ldap]
featured: true
---

Cloudron est ma plateforme d'auto-hébergement depuis un moment : sauvegardes, certificats, annuaire LDAP et mises à
jour sont gérés une fois pour toutes. Le catalogue est riche, mais GLPI n'y était pas dans une version récente. J'ai
donc écrit le package.

## Ce que fait le package

- Initialise le schéma GLPI en arrière-plan au premier démarrage : l'application est « healthy » immédiatement,
  la base est prête trente à soixante secondes plus tard.
- Configure et synchronise automatiquement l'annuaire LDAP de Cloudron : champs `username`, `mail`, `givenName`,
  `sn`, DN et bind, et LDAP devient la méthode d'authentification par défaut.
- Range toutes les données mutables dans `/app/data` (config, fichiers, plugins, marketplace), le reste de
  l'application restant en lecture seule, comme l'exigent Cloudron et GLPI 11.

## Réparer sans réinstaller

Si la base est corrompue, on supprime la configuration et on laisse le script recommencer :

```bash
cloudron exec rm -f /app/data/config/config_db.php
cloudron restart
```

:::note
Les identifiants par défaut `glpi` / `glpi` doivent être changés dès la première connexion. Le script ne le fait pas
à votre place, volontairement.
:::

## Pourquoi ça vaut le coup

Un GLPI qui se réinstalle en une commande, avec les utilisateurs déjà présents, change la façon dont on aborde la
gestion de parc : on peut le casser, le tester avec des plugins, et le remettre d'aplomb sans y passer une soirée.
La version 11 apporte en plus un vrai durcissement (dossiers séparés, permissions strictes) que le package respecte.

Le code est sur [GitHub](https://github.com/vitetj/Cloudron-GLPI), licence MIT.

---
title: "Mettre en place GLPI : de l'installation au premier ticket qui sert à quelque chose"
description: "Installer GLPI sur une pile LAMP, le brancher sur l'annuaire, régler entités, profils et catégories, écrire ce qu'est un bon ticket, et tenir la mise à jour sans casser les plugins."
published: 2026-02-10
category: dsi
tags: [glpi, helpdesk, ticketing, itsm, ldap, mise-a-jour]
level: intermédiaire
status: à jour
featured: true
tested_on: [GLPI 9.4, MariaDB, Apache]
sidebar:
  label: "Mettre en place GLPI : de…"
---

Installer GLPI prend une heure. Obtenir des tickets exploitables prend bien plus longtemps, et c'est là que
se joue la valeur de l'outil : un helpdesk mal réglé produit des lignes « ça ne marche pas », classées dans
une catégorie inventée le jour de l'installation, que personne ne relira.

Cette fiche suit le chemin complet : installation, raccordement à l'annuaire, entités et profils,
catégories, définition de ce qu'est un bon ticket, puis entretien de la mise à jour. Elle ne compare pas
GLPI aux autres outils : c'est le sujet de la fiche sur
[le choix d'un outil de ticketing](/docs/dsi/choisir-un-outil-de-ticketing-pour-une-petite-dsi/), à lire
avant d'installer quoi que ce soit.

:::note
Les procédures d'origine tournaient sur une 9.x. Les libellés de menus cités existent toujours, mais leur
emplacement bouge d'une version majeure à l'autre : vérifiez la documentation de la vôtre.
:::

## Prérequis

- Une machine Linux dédiée à l'application, avec Apache ou nginx, PHP et ses extensions usuelles
  (`mysqlnd`, `gd`, `intl`, `curl`, `zip`, `mbstring`, `ldap`, `xml`), et MariaDB ou MySQL.
- Un nom DNS interne et un certificat : GLPI transporte des identifiants d'annuaire, il n'a rien à faire
  en HTTP.
- Un compte de service en lecture sur l'annuaire Active Directory ou LDAP.
- Une boîte aux lettres générique déjà connue des utilisateurs, si vous voulez collecter les demandes par
  mail.

## Installer la base et l'application

Commencez par la base de données, avec un compte dédié à l'application et rien d'autre.

```bash title="Base de données"
sudo dnf -y install mariadb-server
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

```sql title="Base et compte applicatif"
CREATE DATABASE glpi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'glpi'@'localhost' IDENTIFIED BY '<mot de passe généré, rangé dans le coffre>';
GRANT ALL PRIVILEGES ON glpi.* TO 'glpi'@'localhost';
FLUSH PRIVILEGES;
```

:::caution
On trouve partout des procédures qui créent le compte en `'glpi'@'%'`, joignable depuis n'importe quelle
machine. Restreignez à `localhost` si la base est sur le serveur applicatif, sinon nommez explicitement
l'hôte.
:::

Déployez ensuite l'application depuis l'archive publiée par le projet plutôt que depuis le paquet de votre
distribution : ces paquets sont souvent figés sur une version ancienne, et vous n'attendrez pas votre
distribution pour appliquer un correctif de sécurité.

```bash title="Déploiement de l'application"
cd /var/www/html
sudo tar xzf /tmp/glpi-<version>.tgz
sudo chown -R www-data:www-data glpi     # « apache » sur les distributions RHEL
```

Terminez par l'assistant web, qui crée le schéma et le premier compte d'administration. Trois choses
juste après, avant d'ouvrir l'accès aux utilisateurs :

1. Changer les mots de passe des comptes par défaut créés par l'installateur, ou les désactiver.
2. Supprimer le fichier d'installation : sinon il reste accessible à qui trouve l'URL.
3. Planifier la tâche de fond : sans elle, ni notification, ni collecte de mails, ni purge.

```text title="Tâche planifiée (crontab système)"
* * * * * www-data /usr/bin/php /var/www/html/glpi/front/cron.php
```

:::danger
Les anciennes procédures — dont les miennes — recommandent de passer les dossiers `files` et `config` en
777 pour débloquer l'installation. Ne le faites pas : le bon réglage est le bon propriétaire (l'utilisateur
du serveur web) et des droits restreints. Le 777 rend un dossier inscriptible par n'importe quel processus
de la machine.
:::

## Brancher l'annuaire et découper les entités

Deux populations vont cohabiter : les comptes issus de l'annuaire, et quelques comptes locaux pour ce qui
n'y figure pas — un prestataire, un intervenant externe.

Configurez la liaison LDAP **avant** de créer le moindre utilisateur à la main : un compte créé
manuellement puis rattaché après coup laisse des doublons dont vous ne saurez plus lequel porte les
tickets. L'import se fait depuis l'administration des utilisateurs, en choisissant l'entité de destination
puis les comptes, et se rejoue périodiquement pour suivre les arrivées et les départs.

Sur les entités, la règle est la sobriété. Une entité cloisonne la visibilité : un site qui ne doit pas voir
les tickets d'un autre, une filiale avec son propre support. Un seul service informatique et un seul
périmètre ? Restez sur l'entité racine : un découpage trop fin se paie en tickets invisibles pour celui qui
devrait les traiter.

Les droits, eux, se donnent par profil, et jamais utilisateur par utilisateur :

| Objet | À quoi ça sert | Piège courant |
|---|---|---|
| Entité | Cloisonner la visibilité | En créer douze « au cas où » |
| Profil | Définir ce qu'un rôle peut faire | Donner le profil administrateur pour dépanner |
| Habilitation | Associer un profil à une entité pour un utilisateur | Oublier l'option récursive sur un profil d'administration |
| Groupe | Affecter les tickets à une équipe | Affecter uniquement à des personnes, qui prennent des congés |

Affecter les tickets à un groupe plutôt qu'à un individu change tout le jour où la personne est en congés :
le ticket reste visible par ceux qui peuvent le traiter, au lieu de dormir dans une file personnelle.

## Régler ce que les utilisateurs vont réellement toucher

Trois réglages font la différence entre un outil adopté et un outil contourné.

**Les catégories.** Démarrez avec cinq ou six, dans le vocabulaire des utilisateurs — imprimante,
messagerie, accès et mots de passe, application de gestion, poste de travail, réseau — et non dans celui de
votre architecture. Vous affinerez dans six mois avec les données réelles, qui ne ressembleront pas à ce
que vous imaginiez.

**Les extensions de pièces jointes autorisées.** La liste des types de documents acceptés est limitative.
Si un utilisateur joint une capture dans un format absent de la liste, le dépôt échoue sans explication
compréhensible et il conclut que « le site ne marche pas ». Revoyez la liste le premier jour : captures
d'écran, PDF, messages exportés, journaux en texte brut.

**Le canal d'entrée.** Si les demandes arrivaient par mail avant GLPI, elles continueront. Branchez le
collecteur sur la boîte générique existante, et vérifiez que les notifications partent : un ticket qui
n'accuse jamais réception pousse l'utilisateur à relancer par téléphone.

Pour les plugins, soyez avare : chacun ajoute une fonction agréable et une contrainte durable, puisqu'il
devra exister en version compatible le jour de la prochaine montée de version. N'installez que ceux dont
vous sauriez expliquer l'usage à voix haute.

## Définir ce qu'est un bon ticket

C'est le vrai livrable du projet, et il ne s'obtient pas en configurant l'outil.

Quatre champs suffisent : le **type** (incident quand quelque chose fonctionnait et ne fonctionne plus,
demande quand on réclame un ajout), la **catégorie**, un **titre** lisible dans une liste, et une
**description** qui permet de commencer le travail sans rappeler la personne.

| Ce qui arrive souvent | Ce qui aurait suffi |
|---|---|
| « L'imprimante ne marche pas » | « L'imprimante du bureau d'études n'imprime plus depuis ce matin, message "hors ligne" sur mon poste ; ma collègue imprime normalement. » |
| « Problème Excel » | « Excel met deux minutes à ouvrir les fichiers du partage projets depuis lundi ; en local, c'est immédiat. » |

Publiez donc, en cinq lignes, ce que vous attendez dans une description : ce que vous faisiez, ce que vous
attendiez, ce qui s'est passé, le message exact, depuis quand, et qui d'autre est touché. Cette
demi-page rapporte plus que n'importe quel plugin.

Deux règles côté service informatique, à tenir sans exception :

- **Une demande reçue par téléphone ou dans le couloir donne lieu à un ticket**, ouvert par vous. Sinon
  l'outil ne contiendra que les demandes tièdes, et vos statistiques décriront un service qui n'existe pas.
- **On clôture avec une solution écrite en français**, pas avec « résolu ». C'est ce texte qui servira la
  prochaine fois que le même incident revient, et c'est ce qui rend la recherche utile.

## Tenir la mise à jour

Une instance de ticketing contient des informations sur l'organisation, ses incidents et parfois ses
failles. Elle se met à jour comme un service exposé, pas comme un outil dont on s'occupera plus tard.

Avant toute chose, le filet :

```bash title="Sauvegarde avant mise à jour"
sudo mysqldump --single-transaction glpi > /var/backups/glpi-$(date +%F).sql
sudo cp -a /var/www/html/glpi /var/www/html/glpi.old
```

Prévoyez la volumétrie — la copie double l'occupation disque — ou prenez un instantané de la VM. Déployez la
nouvelle archive à la place de l'ancienne, rétablissez le propriétaire, puis lancez la mise à jour depuis
l'interface web : l'application détecte le décalage de schéma et propose de migrer la base. Reconnectez-vous
et parcourez les écrans principaux avant d'annoncer que c'est fini.

:::caution
Une page des plugins en erreur 500 juste après la migration, c'est presque toujours un plugin resté en
version précédente. Notez la liste et les versions **avant** de démarrer, supprimez les dossiers des
anciens, réinstallez les versions compatibles. C'est la raison numéro un des mises à jour qui s'éternisent.
:::

Dernier point, l'inventaire : si vous déployez un agent sur les postes, il pointe vers une URL de serveur
inscrite dans le paquet de déploiement. Après une montée de version majeure, vérifiez que cette URL est
toujours valide et que la version de l'agent est supportée — les anciennes installations reposent souvent
sur FusionInventory, remplacé depuis par l'agent natif du projet.

## Pour aller plus loin

- La comparaison qui précède cette fiche :
  [Choisir un outil de ticketing pour une petite DSI](/docs/dsi/choisir-un-outil-de-ticketing-pour-une-petite-dsi/).
- Ce que vous ferez des tickets une fois qu'ils seront propres :
  [Fiabiliser les indicateurs d'un helpdesk](/docs/dsi/fiabiliser-les-indicateurs-dun-helpdesk/).
- Une installation packagée et branchée sur l'annuaire sans y passer la soirée :
  [GLPI sur Cloudron](/lab/glpi-sur-cloudron/).
- La documentation d'installation officielle : [glpi-install.readthedocs.io](https://glpi-install.readthedocs.io/).

<!-- source : procédures internes « Installation GLPI », « Configuration et utilisation », « Création d'un ticket standard » et « Mise à jour », export du centre de documentation -->

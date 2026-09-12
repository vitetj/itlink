---
title: "Monter un centre de documentation interne que les collègues utilisent vraiment"
description: "Installer Documize sur un serveur Linux : base de données avec recherche plein texte, binaire, certificat, service systemd. Puis la partie difficile : les règles qui font qu'une base de procédures reste vivante."
published: 2024-12-03
updated: 2026-01-15
category: self-hosting
tags: [documize, documentation, procedures, mariadb, self-hosting, dsi]
level: intermédiaire
status: à jour
featured: false
tested_on: [Documize Community 3.3.2, MariaDB 10.4, Ubuntu Server]
sidebar:
  label: "Un centre de documentation interne"
---

Dans la plupart des PME, les procédures existent. Elles sont dans un dossier du serveur de fichiers, sous des
noms comme `procedure_sauvegarde_v3_final_OK_relu.docx`, écrites par quelqu'un qui est parti depuis, et mises à
jour la dernière fois trois versions de l'ERP en arrière. Techniquement, la documentation est là. Dans les
faits, personne ne la lit, parce que personne ne la trouve et que personne ne lui fait confiance.

Un centre de documentation ne résout que la moitié du problème, mais c'est une moitié qui compte : la recherche,
les droits par service, l'historique, et une édition assez simple pour que les gens s'y mettent. J'ai déployé
Documize pour ça. La suite décrit l'installation, puis les règles d'usage qui, elles, font la différence entre
une base vivante et un cimetière.

## Prérequis

- Un serveur Linux, 2 vCPU et 4 Go de RAM suffisent largement.
- Un serveur de base de données **avec la recherche plein texte activée**. Documize accepte PostgreSQL 9.6 ou
  supérieur, Microsoft SQL Server 2016 ou supérieur, MySQL à partir des versions 5.7.10 et 8.0.12, Percona et
  MariaDB 10.3 ou supérieur.
- Un nom DNS et un certificat TLS.

La base doit s'appeler `documize`, et son jeu de caractères compte : pour la famille MySQL, `utf8mb4` avec la
collation `utf8mb4_bin` ; pour PostgreSQL, `UTF8`. Ce n'est pas un détail cosmétique : une collation non
sensible à la casse casse la recherche, et il est plus pénible de corriger après coup qu'au moment de la
création.

## Installer la base de données

Sur une machine neuve, commencez par retirer une éventuelle installation partielle du serveur de base de
données, puis installez la version choisie et lancez le script de durcissement fourni :

```bash title="Serveur de base de données"
sudo apt update && sudo apt -y install mariadb-server mariadb-client
sudo mysql_secure_installation
```

Ce script vous demande de définir le mot de passe du compte d'administration, de supprimer les comptes anonymes,
d'interdire la connexion distante de ce compte et de supprimer la base de test. Répondez oui à tout : ces
quatre questions sont l'essentiel de la sécurisation d'un serveur de base de données exposé sur un réseau
interne.

```sql title="Création de la base"
CREATE DATABASE documize CHARACTER SET = 'utf8mb4' COLLATE = 'utf8mb4_bin';
CREATE USER 'documize'@'localhost' IDENTIFIED BY 'un-mot-de-passe-long-et-aleatoire';
GRANT ALL PRIVILEGES ON documize.* TO 'documize'@'localhost';
FLUSH PRIVILEGES;
```

Créez un compte dédié à l'application. Faire tourner un service applicatif avec le compte d'administration de
la base, c'est le raccourci que l'on prend à l'installation et que l'on paie à la première compromission.

## Installer l'application

Documize se distribue sous forme d'un binaire unique, ce qui est reposant : pas d'environnement d'exécution à
maintenir, pas de dépendances.

```bash title="Récupération du binaire"
sudo mkdir -p /opt/documize/ssl
cd /opt/documize
sudo wget https://github.com/documize/community/releases/download/v3.3.2/documize-community-linux-amd64
sudo chmod +x documize-community-linux-amd64
```

Déposez le certificat et sa clé dans le dossier prévu, ou — de préférence — placez un reverse proxy devant et
laissez-le gérer le TLS. Vous n'aurez ainsi qu'un seul endroit où renouveler les certificats de tous vos
services.

Le lancement se fait avec la chaîne de connexion, le type de base, un sel cryptographique et, le cas échéant,
les fichiers de certificat :

```bash title="Premier lancement"
sudo ./documize-community-linux-amd64 \
  -db='documize:MOT_DE_PASSE@tcp(localhost:3306)/documize' \
  -dbtype=mysql \
  -salt='UNE_VALEUR_ALEATOIRE_GENEREE_LOCALEMENT' \
  -cert /opt/documize/ssl/cert.pem \
  -key /opt/documize/ssl/key.pem \
  -forcesslport=443
```

:::danger
Deux pièges dans cette seule commande. D'abord, le sel : il sert à signer les jetons de session. Générez-le
aléatoirement, gardez-le au coffre, et ne recopiez jamais celui d'un tutoriel — c'est ce que faisait ma
procédure interne, avec une suite de caractères aussi rassurante que `1234567890`. Ensuite, tout ce qui passe
en argument de ligne de commande est lisible par n'importe quel compte local via `ps`, mot de passe de base de
données compris. Rangez ces valeurs dans un fichier d'environnement en `chmod 600` lu par votre unité systemd,
ou utilisez les variables d'environnement documentées par le projet.
:::

Une fois le test concluant, transformez ce lancement en service systemd, avec un compte système dédié et un
redémarrage automatique. Un outil de documentation qui ne redémarre pas après une coupure de courant est un
outil de documentation qu'on cesse d'ouvrir.

## Structurer avant d'ouvrir les portes

Au premier démarrage, l'assistant crée l'espace d'administration et le premier compte. Prenez ensuite une heure
pour poser la structure, parce que personne ne réorganisera à votre place ensuite :

- **Un espace par service**, pas un espace par personne. La production, la qualité, le bureau d'études,
  l'informatique. Chacun est propriétaire du sien et y écrit ce qu'il veut.
- **Des droits explicites** : qui lit, qui écrit, qui publie. Un espace informatique en lecture pour tout le
  monde et en écriture pour vous seul, c'est très bien.
- **Une authentification sur l'annuaire**. C'est le point qui décide de l'adoption : si les collègues se
  connectent avec leur identifiant de session habituel, ils entrent. S'il faut retenir un mot de passe de plus,
  ils n'entrent pas. Voir
  [SSO pour une appli maison : LDAP, OIDC ou SAML](/docs/self-hosting/sso-pour-une-appli-maison-ldap-oidc-ou-saml/).

Côté rédaction, l'outil fonctionne par sections empilées : on ajoute une section, on lui donne un titre, on
choisit son type — texte enrichi, tableau, code, ou visionneuse pour afficher un PDF joint — et le sommaire se
construit tout seul. Les sections se réordonnent et se transforment en sous-sections d'un clic. C'est exactement
le niveau de complexité qu'un non-informaticien accepte.

## Ce qui fait qu'une base de procédures vit ou meurt

L'installation prend une demi-journée. L'adoption prend un an, et elle ne dépend d'aucun réglage technique.
Voici ce que j'ai observé, y compris en me trompant.

**Acceptez les formats médiocres.** Un PDF scanné importé vaut infiniment mieux qu'une procédure parfaite jamais
écrite. La visionneuse PDF intégrée existe pour ça. On améliore ensuite, si le document sert.

**Écrivez pour celui qui ne sait pas.** La bonne unité n'est pas « ce que je sais faire », c'est « ce qu'un
collègue doit pouvoir refaire sans moi ». Le test est imparable : faites exécuter la procédure par quelqu'un
d'autre, sans intervenir, et notez chaque fois qu'il hésite. Ce sont ces hésitations, la vraie documentation.
C'est aussi ce qui rend possible
[une procédure de remplacement IT pendant une absence](/docs/dsi/procedure-de-remplacement-it-pendant-une-absence/).

**Mettez à jour au moment de l'intervention.** Une procédure corrigée « quand j'aurai le temps » ne sera jamais
corrigée. Cinq minutes à la fin du dépannage, pendant que c'est frais, valent une journée de rattrapage six mois
plus tard.

**Datez et attribuez.** Une fiche sans date ni auteur ne mérite pas la confiance qu'on lui accorde. Une revue
annuelle, même expédiée, suffit à trier ce qui est encore vrai.

**Mettez la documentation là où le travail se fait.** Un lien depuis le ticket du helpdesk vers la procédure
correspondante fait plus pour l'usage que dix rappels en réunion. Le helpdesk et la base de procédures se
tiennent par la main : [mettre en place un helpdesk GLPI](/docs/dsi/mettre-en-place-un-helpdesk-glpi/).

**N'y mettez jamais de secrets.** C'est l'erreur que j'ai commise pendant des années. En relisant mes propres
procédures internes pour écrire ces fiches, j'y ai retrouvé des mots de passe de bases de production, une clé
privée de certificat en entier, et des identifiants de comptes de service. Tout ça dans un outil lisible par
plusieurs services, exportable, et sauvegardé en clair dans trois jeux de sauvegarde. Les secrets vont dans un
coffre ; la procédure dit « le mot de passe est dans le coffre, entrée *serveur de documentation* », et c'est
tout.

:::caution
Pensez à sauvegarder la base de données, pas seulement le serveur. Tout le contenu y est ; le binaire, lui, se
retélécharge en trente secondes. Et testez la restauration une fois par an, sinon vous n'avez pas de
sauvegarde, vous avez une intention.
:::

## Pour aller plus loin

- Relier la documentation aux demandes réelles :
  [mettre en place un helpdesk GLPI](/docs/dsi/mettre-en-place-un-helpdesk-glpi/).
- Le pendant humain de cette fiche :
  [écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/).
- Les tâches d'administration courantes du serveur de base de données qui porte tout ça :
  [MySQL : tâches d'administration courantes](/docs/linux/mysql-taches-dadministration-courantes/).

<!-- source : procédures internes « Documize - Installation » et « Guide d'utilisation du centre de documentation des procédures », export du centre de documentation -->

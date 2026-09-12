---
title: "Wekan : un tableau kanban auto-hébergé pour une petite équipe"
description: "Installer Wekan par paquet snap, le publier en HTTPS, le brancher sur l'annuaire et le serveur de messagerie, puis sauvegarder sa base. Avec les réglages à ne pas recopier tels quels des tutoriels."
published: 2025-04-08
category: self-hosting
tags: [wekan, kanban, snap, ldap, self-hosting, sauvegarde]
level: intermédiaire
status: à jour
featured: false
tested_on: [Wekan, Ubuntu Server, Caddy]
sidebar:
  label: "Wekan : un kanban auto-hébergé"
---

Un tableau kanban, c'est trois colonnes et des étiquettes qu'on déplace. Rien qui justifie un projet, une
licence par utilisateur et un transfert de données chez un éditeur. Sauf que le jour où le bureau d'études
commence à suivre ses affaires en cours sur un tableau public créé avec une adresse personnelle, la question
n'est plus « est-ce que c'est utile » mais « où sont ces données ».

Wekan répond à ce besoin précis : un tableau partagé, des cartes, des échéances, des commentaires, hébergé chez
vous. Il s'installe par paquet snap en deux commandes, ce qui est à la fois sa grande qualité et l'origine de la
moitié des surprises. Voici l'installation, et surtout les réglages que je ne recopierais pas tels quels d'un
tutoriel.

## Ce que Wekan fait bien, et ce qu'il ne fait pas

Wekan est un tableau, pas un outil de gestion de projet. Pas de diagramme de Gantt sérieux, pas de plan de
charge, pas de gestion de portefeuille. Si vous cherchez à suivre des demandes utilisateurs avec des délais
contractuels, c'est un helpdesk qu'il vous faut, pas un kanban : voir
[mettre en place un helpdesk GLPI](/docs/dsi/mettre-en-place-un-helpdesk-glpi/).

En revanche, pour une équipe de cinq à quinze personnes qui veut voir d'un coup d'œil qui fait quoi cette
semaine, c'est exactement le bon outil, et son principal mérite est de ne pas décourager les gens au premier
écran.

## Prérequis

- Une machine Linux avec le gestionnaire de paquets `snap` disponible, 2 Go de RAM.
- Un nom DNS public ou interne, selon l'exposition voulue.
- Un certificat TLS, ou un reverse proxy déjà en place devant vos services.

## Installer

```bash title="Installation du paquet"
sudo apt install snapd
sudo snap install wekan
```

L'installation embarque tout, y compris la base MongoDB. C'est pratique, et c'est aussi pour cela qu'on oublie
qu'il y a une base à sauvegarder : elle n'apparaît nulle part dans vos inventaires.

## Déclarer l'URL publique, puis seulement après le reste

`root-url` est le réglage le plus important du produit. C'est lui que Wekan met dans les liens des courriels de
notification et dans les redirections d'authentification. S'il est faux, l'application s'affiche parfaitement et
tout ce qui sort d'elle pointe au mauvais endroit.

```bash title="Premier démarrage, en clair, pour valider que ça tourne"
sudo snap set wekan root-url='http://kanban.example.com'
sudo snap set wekan port='80'
sudo systemctl restart snap.wekan.wekan
```

Testez l'accès, créez un compte, déplacez une carte. Ensuite seulement, passez au chiffrement — et n'oubliez pas
de remettre `root-url` en `https://` à ce moment-là. Une URL restée en `http://` derrière un service publié en
HTTPS donne des liens cassés dans les notifications, et personne ne fait le rapprochement.

## Publier en HTTPS

Deux chemins possibles.

**Si vous avez déjà un reverse proxy** devant vos services, gardez-le. Laissez Wekan écouter en local sur un
port haut et publiez-le comme le reste de vos applications ; c'est un service web comme un autre, à ceci près
qu'il utilise des WebSockets et que votre configuration de proxy doit relayer les en-têtes de mise à niveau de
connexion.

**Sinon**, le snap embarque un serveur Caddy qui peut terminer le TLS. Il attend un fichier PEM contenant la
clé privée suivie du certificat et de sa chaîne, déposé dans un dossier dédié :

```text title="Structure du fichier PEM attendu"
-----BEGIN PRIVATE KEY-----
…
-----END PRIVATE KEY-----
-----BEGIN CERTIFICATE-----
…
-----END CERTIFICATE-----
```

```bash title="Activation du TLS intégré"
sudo mkdir -p /var/snap/wekan/common/certs
sudo chmod 600 /var/snap/wekan/common/certs/kanban.example.com.pem
sudo snap set wekan caddy-enabled='true'
sudo snap set wekan port='3001'
sudo snap set wekan root-url='https://kanban.example.com'
sudo systemctl restart snap.wekan.wekan
```

:::danger
La procédure interne dont je pars mettait ce fichier en `chmod 644`. Un fichier lisible par tout le monde qui
contient une clé privée de serveur, c'est une clé compromise : n'importe quel compte local peut la copier et se
faire passer pour votre service. `600`, et propriétaire `root`. C'est le genre de ligne qu'on recopie sans y
penser pendant des années.
:::

## Envoyer les notifications

Sans serveur de messagerie déclaré, aucune invitation ni notification ne part, et les utilisateurs concluent que
l'outil ne marche pas.

```bash title="Relais de messagerie"
sudo snap set wekan mail-url='smtp://compte-service:mot-de-passe@smtp.example.com:587'
sudo snap set wekan mail-from='Tableaux <kanban@example.com>'
```

:::caution
Deux erreurs classiques dans cette seule ligne. La première : utiliser une boîte personnelle ou un compte de
messagerie grand public comme expéditeur d'un service d'entreprise. Le jour où la personne part, ou où le
fournisseur durcit ses règles d'authentification, tout s'arrête. Créez un compte de service dédié. La seconde :
oublier que ce mot de passe est ensuite lisible par quiconque peut exécuter `snap get wekan` sur la machine.
Donnez à ce compte le droit d'envoyer, et rien d'autre.
:::

## Brancher l'annuaire

Faire créer des comptes locaux dans chaque application est le meilleur moyen de laisser traîner les accès des
partants. Wekan sait interroger un annuaire LDAP.

```bash title="Paramètres essentiels"
sudo snap set wekan ldap-enable='true'
sudo snap set wekan default-authentication-method='ldap'
sudo snap set wekan ldap-host='ldap.example.com'
sudo snap set wekan ldap-port='636'
sudo snap set wekan ldap-encryption='ssl'
sudo snap set wekan ldap-basedn='dc=example,dc=com'
sudo snap set wekan ldap-authentication='true'
sudo snap set wekan ldap-authentication-userdn='cn=svc-lecture-ldap,ou=services,dc=example,dc=com'
sudo snap set wekan ldap-authentication-password='<mot de passe du compte de service>'
sudo snap set wekan ldap-username-field='sAMAccountName'
sudo snap set wekan ldap-email-field='mail'
sudo snap set wekan ldap-fullname-field='cn'
sudo snap set wekan ldap-merge-existing-users='true'
```

Trois remarques valent tous les tutoriels.

Le compte de service utilisé pour interroger l'annuaire doit être **en lecture seule** et dédié à cet usage.
Surtout pas un compte d'administration du domaine, comme on en voit dans beaucoup d'exemples recopiés.

`ldap-encryption` et `ldap-reject-unauthorized` vont ensemble. En clair sur le port 389, avec la vérification du
certificat désactivée, vous faites transiter les mots de passe de vos utilisateurs sur le réseau sans
protection. Utilisez LDAPS sur 636 avec un certificat que la machine sait valider. Si votre autorité est
interne, faites-la reconnaître par le système :
[faire confiance à une CA interne et valider LDAPS](/docs/linux/rocky-linux-faire-confiance-a-une-ca-interne-et-valider-ldaps/).

Enfin, gardez une porte de secours. Basculer `ldap-login-fallback` à `false` interdit toute connexion locale :
le jour où l'annuaire est injoignable, personne n'entre, pas même vous. Conservez au moins un compte
d'administration local, avec un mot de passe long rangé dans le coffre.

## Sauvegarder, restaurer, et survivre aux mises à jour

Le snap fournit ses propres commandes de sauvegarde et de restauration de la base. Elles doivent tourner dans
une tâche planifiée, et le résultat doit partir ailleurs que sur la machine elle-même.

```bash title="Sauvegarde et restauration"
sudo mkdir -p /var/snap/wekan/common/db-backups
sudo wekan.database-backup
sudo snap stop wekan.wekan
sudo wekan.database-restore /var/snap/wekan/common/db-backups/<fichier>.backup
sudo snap start wekan.wekan
```

:::caution
Les paquets snap se mettent à jour tout seuls. Sur un service utilisé en journée, c'est une coupure surprise et,
si la montée de version touche le schéma de la base, une coupure sans retour arrière possible. Cadrez la fenêtre
de rafraîchissement sur une plage nocturne et faites une sauvegarde juste avant.
:::

```bash title="Fenêtre de mise à jour et diagnostic"
sudo snap set core refresh.schedule=02:00-04:00
sudo snap refresh wekan          # mise à jour manuelle
sudo snap logs wekan             # derniers journaux
sudo snap get wekan              # tous les paramètres définis
```

`snap get wekan` est la commande à dégainer devant un comportement bizarre : elle affiche l'intégralité des
réglages en vigueur, et met généralement le doigt sur le `root-url` resté en `http://` ou le paramètre LDAP
saisi avec une faute de frappe.

## Pour aller plus loin

- Le tableau ne remplace pas le suivi des demandes :
  [mettre en place un helpdesk GLPI](/docs/dsi/mettre-en-place-un-helpdesk-glpi/).
- Pour choisir la bonne méthode d'authentification selon l'application :
  [SSO pour une appli maison : LDAP, OIDC ou SAML](/docs/self-hosting/sso-pour-une-appli-maison-ldap-oidc-ou-saml/).
- Savoir avant les utilisateurs que le service est tombé :
  [surveiller ses services avec Uptime Kuma](/docs/self-hosting/surveiller-ses-services-avec-uptime-kuma/).

<!-- source : procédure interne « Installation de Wekan », export du centre de documentation -->

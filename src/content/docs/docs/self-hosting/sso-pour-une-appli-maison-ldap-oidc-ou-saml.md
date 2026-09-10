---
title: "Brancher une application maison sur le SSO : LDAP, OpenID Connect ou SAML, lequel choisir"
description: "Trois façons de faire entrer une application développée en interne dans l'annuaire de l'entreprise : le bind LDAP(S), OpenID Connect avec découverte, SAML. Critères de choix, paramètres réels et pièges."
published: 2025-01-08
updated: 2026-03-03
category: self-hosting
tags: [sso, ldap, openid-connect, saml, cloudron, apache]
level: avancé
status: à jour
featured: true
tested_on: [Cloudron, Apache 2.4, Ubuntu Server]
sidebar:
  label: "Brancher une application maison sur le SSO"
---

Dans une PME, les applications maison arrivent toujours par le même chemin : quelqu'un a besoin d'un écran que
l'ERP ne fait pas, un développeur interne le code, et six mois plus tard l'outil est indispensable. Il a sa
propre table `utilisateurs`, ses propres mots de passe, sa propre page de connexion. Multipliez par cinq
applications et vous avez cinq annuaires à maintenir, cinq endroits où oublier de désactiver le compte d'un
partant, et des utilisateurs qui écrivent leurs mots de passe sur un post-it parce que personne ne peut en
retenir cinq.

La sortie, c'est de faire pointer toutes ces applications vers le même annuaire. Chez moi, cet annuaire est
porté par ma plateforme d'auto-hébergement Cloudron, qui expose au choix un serveur LDAP, un fournisseur
OpenID Connect et un fournisseur SAML. Trois portes vers la même pièce. La question que m'a posée mon
développeur interne — et qui a donné cette fiche — c'est : laquelle on prend ?

## Prérequis

- Un annuaire d'entreprise qui expose au moins LDAP(S) ou OpenID Connect. Ici Cloudron, mais le raisonnement
  vaut pour un Active Directory, un Keycloak ou un Authentik.
- Une instance de développement séparée de la production. On ne teste pas un mécanisme d'authentification
  sur l'annuaire qui fait tourner la boîte.
- Un certificat valide sur l'annuaire si vous utilisez LDAPS ou OIDC : sans ça, rien ne se connectera.

## Choisir en trois lignes

Le tableau ci-dessous résume ce que je réponds à chaque fois. Il n'y a pas de « meilleur » protocole, il y a
un protocole adapté à ce que votre application sait faire.

| Votre application… | Protocole | Pourquoi |
| --- | --- | --- |
| a déjà un formulaire login/mot de passe et vous voulez juste vérifier les identifiants ailleurs | **LDAP(S)** | quelques lignes de configuration, aucun changement d'ergonomie, fonctionne pour les scripts et les API |
| est web, moderne, et vous voulez une vraie page de connexion unique (une seule saisie pour tous les outils) | **OpenID Connect** | standard, bibliothèques mûres partout, pas de mot de passe qui transite par votre code |
| est un logiciel du commerce qui n'accepte que ça | **SAML** | parce que vous n'avez pas le choix |

Autrement dit : LDAP quand vous voulez déléguer la **vérification**, OIDC quand vous voulez déléguer la
**connexion**. La différence est fondamentale : avec LDAP, votre application voit passer le mot de passe de
l'utilisateur ; avec OIDC, jamais. C'est un argument de sécurité, et c'est aussi un argument de tranquillité :
ce que votre code ne connaît pas, votre code ne peut pas le faire fuiter.

## Voie 1 : le bind LDAP(S)

C'est la plus rapide à mettre en œuvre et celle qui marche avec le plus de choses, y compris de vieux langages
et des applications qui n'ont pas de navigateur.

Côté annuaire, activez le serveur d'annuaire (dans Cloudron : **Settings → Directory Server**), puis notez les
quatre paramètres dont votre développeur aura besoin :

```text title="Paramètres de connexion à l'annuaire"
URL          : ldaps://annuaire.example.com:636    (LDAP simple sur 389 en interne uniquement)
Bind DN      : cn=admin,ou=system,dc=cloudron
Base users   : ou=users,dc=cloudron
Filtre       : (|(mail=%s)(username=%s))
```

Le filtre mérite un commentaire. Le `|` est un « ou » : il autorise la connexion avec l'adresse e-mail **ou**
avec le nom d'utilisateur. C'est ce qui permet de basculer progressivement tout le monde vers l'e-mail comme
identifiant sans casser les habitudes de ceux qui tapent encore leur login court.

Avant d'écrire la moindre ligne de code, vérifiez que l'annuaire répond, avec l'outil en ligne de commande :

```bash title="Tester le bind et la recherche"
ldapsearch -H ldaps://annuaire.example.com:636 \
  -D "cn=admin,ou=system,dc=cloudron" -W \
  -b "ou=users,dc=cloudron" "(mail=prenom.nom@example.com)"
```

Si cette commande sort une fiche utilisateur, le problème suivant sera dans votre code, pas dans l'annuaire.
Si elle échoue, inutile d'aller plus loin : c'est presque toujours le certificat ou le pare-feu.

:::caution[Le compte de bind est un secret d’infrastructure]
Le mot de passe du compte de bind est un secret de niveau infrastructure : il permet de lire tout l'annuaire.
Il ne va ni dans le dépôt Git, ni dans un fichier de configuration versionné. Variable d'environnement, ou
fichier inclus hors du dépôt, avec des permissions restreintes.
:::

## Voie 2 : OpenID Connect

C'est la voie que je recommande pour toute nouvelle application web. L'utilisateur clique sur « Se connecter »,
atterrit sur la page de l'annuaire, s'authentifie là-bas (avec son second facteur s'il en a un), et revient
dans l'application avec un jeton. Votre code ne manipule que le jeton.

Trois étapes :

1. **Déclarer le client** dans l'annuaire (dans Cloudron : **Settings → OpenID**), avec un identifiant, un
   secret et l'URL de retour de votre application.
2. **Pointer l'application vers l'URL de découverte**, qui décrit automatiquement tous les points d'entrée :

   ```text
   https://my.example.com/.well-known/openid-configuration
   ```

3. **Utiliser une bibliothèque standard**, jamais une implémentation maison : `openid-client` côté Node.js,
   Spring Security côté Java, `mod_auth_openidc` si l'application est derrière Apache. OAuth 2 et OIDC sont
   des protocoles simples à mal implémenter.

:::danger
L'URL de retour (*callback*) doit correspondre **exactement**, au caractère près, à celle déclarée dans
l'annuaire : même schéma, même domaine, même chemin, même barre oblique finale. C'est la cause numéro un des
« ça marche en développement mais pas en production », parce que l'URL de l'instance de développement n'est
pas la même que celle de la production, et qu'on oublie d'en déclarer deux.
:::

## Voie 3 : SAML, quand on n'a pas le choix

SAML est plus ancien, plus verbeux (du XML signé échangé via le navigateur) et plus pénible à déboguer. Je ne
le mets en place que lorsque le logiciel l'impose — typiquement un produit du commerce déployé derrière un IIS
avec un module de routage. Côté Java, `java-saml` fait le travail. Pour une application que vous écrivez
vous-même, il n'y a aucune raison de choisir SAML plutôt qu'OIDC en 2026.

Dernière remarque, souvent posée : les mots de passe de l'annuaire sont hachés en Argon2. On peut donc, en
théorie, répliquer l'annuaire et vérifier soi-même un mot de passe avec une bibliothèque comme Password4j.
C'est une mauvaise idée. Vous dupliqueriez le secret et vous perdriez le bénéfice de la centralisation.
Laissez l'annuaire faire son métier : il répond « oui » ou « non », c'est tout ce dont vous avez besoin.

## Cas pratique : protéger une API derrière Apache avec mod_authnz_ldap

Le cas le plus fréquent n'est même pas une application complète, c'est un petit outil interne qui expose une
API sans aucune authentification. Chez moi, c'était un dépôt d'images ISO avec une route `/api/isos` ouverte à
qui savait l'adresse. Pas besoin de toucher au code : Apache sait interroger l'annuaire à sa place.

```bash title="Activer les modules"
sudo a2enmod ldap authnz_ldap
sudo systemctl restart apache2
```

```apache title="/etc/apache2/sites-available/exemple.conf (extrait)"
<Location /api/isos>
    AuthType Basic
    AuthName "Authentification annuaire"
    AuthBasicProvider ldap
    AuthLDAPURL "ldaps://annuaire.example.com:636/ou=users,dc=cloudron?mail?sub?(objectClass=*)"
    AuthLDAPBindDN "cn=admin,ou=system,dc=cloudron"
    AuthLDAPBindPassword "${LDAP_BIND_PW}"
    Require valid-user
</Location>
```

L'`AuthLDAPURL` se lit de gauche à droite : le serveur, la base de recherche, l'attribut qui sert
d'identifiant (`mail`), la profondeur de recherche (`sub`), le filtre. Changez `mail` en `username` si vos
utilisateurs se connectent avec leur login court.

Le test se fait en une commande :

```bash title="Vérifier que la route est bien protégée"
curl -i https://iso.example.com/api/isos                     # doit répondre 401
curl -u prenom.nom@example.com https://iso.example.com/api/isos   # doit répondre 200
```

:::caution[Basic sans HTTPS, jamais]
`AuthType Basic` envoie le mot de passe en clair dans l'en-tête HTTP. C'est acceptable **uniquement** derrière
HTTPS. Et si votre annuaire présente un certificat signé par une autorité interne, Apache ne le validera pas
tant que vous ne lui aurez pas indiqué cette autorité avec `LDAPTrustedGlobalCert`.
:::

## Deux décisions d'ergonomie qui comptent plus que le protocole

**L'identifiant, c'est l'adresse e-mail.** Elle est unique, personne ne l'oublie, elle est déjà l'identifiant
de la messagerie et du poste de travail. Les logins courts façon `pnom` sont un héritage des systèmes qui ne
supportaient pas les chaînes longues ; il n'y a plus de raison de les imposer aux utilisateurs.

**Gardez un compte local de secours** sur l'application la plus critique de votre intranet. Le jour où
l'annuaire tombe, où le certificat LDAPS expire un dimanche, où une mise à jour change un paramètre, vous
serez content d'avoir une porte de service. Ce compte doit être nominatif, avec un mot de passe long stocké
dans le coffre, et vous devez l'essayer une fois par an pour vérifier qu'il fonctionne encore.

## Pour aller plus loin

- Faire accepter une autorité de certification interne à un client LDAPS, le préalable technique à tout ce
  qui précède :
  [Rocky Linux : faire confiance à une CA interne et valider LDAPS](/docs/linux/rocky-linux-faire-confiance-a-une-ca-interne-et-valider-ldaps/).
- Le même annuaire branché automatiquement au premier démarrage d'une application packagée :
  [GLPI 11 packagé pour Cloudron](/lab/glpi-sur-cloudron/).
- Quand l'application n'a aucune authentification et qu'on ne peut pas la modifier, on met un proxy devant :
  [Mettre un boîtier sans HTTPS derrière un reverse proxy](/docs/self-hosting/mettre-un-boitier-sans-https-derriere-un-reverse-proxy/).

<!-- source : mail « SSO Cloudron : LDAP / OpenID / SAML », 2025-01-06 ; « identifiant = e-mail », 2025-02-04 ; « authentification LDAP de l'API ISO », 2026-03-03 -->

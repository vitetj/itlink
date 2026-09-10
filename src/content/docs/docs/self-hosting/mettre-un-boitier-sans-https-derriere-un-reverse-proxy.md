---
title: "Mettre un boîtier sans HTTPS (NVR, imprimante, automate) derrière un reverse proxy avec certificat"
description: "Arrêter de se battre avec le certificat d'un équipement qui gère mal le TLS : le laisser en HTTP sur son VLAN, et publier son interface via un reverse proxy nginx qui apporte le certificat et l'authentification."
published: 2025-07-15
updated: 2026-03-20
category: self-hosting
tags: [reverse-proxy, nginx, lets-encrypt, nvr, self-hosting, industrie]
level: intermédiaire
status: à jour
featured: false
tested_on: [Cloudron, nginx, Let's Encrypt]
---

L'enregistreur de vidéosurveillance qu'on m'a livré sait faire du HTTPS. En théorie. En pratique, il attend un
fichier PEM dans lequel la clé privée et le certificat sont concaténés dans un ordre précis, son interface
d'import ne dit rien quand elle échoue, et à chaque mise à jour du firmware l'ancien certificat autosigné du
constructeur « revient ». J'ai passé deux semaines là-dessus, en juin 2025, entre deux allers-retours avec
l'intégrateur.

La solution qui a marché, c'est celle qu'on aurait dû adopter le premier jour : **arrêter de demander à ce
boîtier de faire du TLS**. Il fait du HTTP, correctement, sur son propre réseau. Le chiffrement, le
certificat, le renouvellement et même l'authentification, c'est le reverse proxy qui s'en charge. Le principe
vaut pour un enregistreur vidéo, mais aussi pour une imprimante multifonction, une supervision d'automate, une
carte d'administration ou n'importe quel équipement dont l'interface web a été écrite avant que HTTPS ne
devienne obligatoire.

## Prérequis

- Un VLAN dédié à ces équipements, sans route directe vers Internet ni vers la bureautique.
- Un serveur qui fait tourner nginx, ou une plateforme qui l'expose pour vous. J'utilise l'application
  « Nginx reverse proxy » de ma plateforme Cloudron, qui gère le certificat Let's Encrypt toute seule ;
  un nginx installé à la main fait exactement la même chose avec `certbot`.
- Un enregistrement DNS public pour le nom que vous allez publier, si l'accès doit se faire depuis
  l'extérieur.

## Étape 1 : désactiver le TLS du boîtier

C'est contre-intuitif, alors autant le justifier. Un équipement embarqué gère mal les certificats pour trois
raisons : sa pile TLS est ancienne, son horloge dérive, et son firmware réécrit sa configuration à chaque mise
à jour. Vous pouvez gagner la bataille du jour, vous perdrez celle du prochain firmware.

Dans l'interface de l'équipement, désactivez donc le « reverse SSL », le HTTPS ou l'option qui en tient lieu,
et laissez-le écouter en HTTP sur son port habituel. Ce n'est acceptable qu'à une condition : **ce port ne doit
être joignable que depuis le proxy**. Concrètement, une règle de pare-feu qui n'autorise que l'adresse du
proxy vers l'adresse du boîtier, sur ce port, et rien d'autre.

```text title="Le seul flux autorisé vers l'équipement"
source 10.20.0.10 (reverse proxy LAN)  →  destination 10.30.0.50 (boîtier) : TCP 8080
tout le reste vers 10.30.0.0/24 : refusé
```

:::caution
Sans cette règle, vous n'avez pas déplacé le problème : vous avez publié une interface d'administration en
clair sur votre réseau. Le VLAN dédié n'est pas une option décorative, c'est ce qui rend la manœuvre
défendable.
:::

## Étape 2 : le proxy interne, sur le LAN

Le premier proxy vit sur le réseau interne. Il présente un nom du type `camera.interne.example.com`, avec un
certificat valide, et il relaie vers le boîtier en HTTP.

```nginx title="Bloc de proxy (extrait)"
location / {
    proxy_pass         http://10.30.0.50:8080;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto https;

    # Flux vidéo « live » : la page utilise un websocket
    proxy_http_version 1.1;
    proxy_set_header   Upgrade    $http_upgrade;
    proxy_set_header   Connection "upgrade";

    proxy_read_timeout 3600s;
    proxy_buffering    off;
}
```

Les trois dernières lignes sont celles qu'on oublie, et le symptôme est toujours le même : l'interface
s'affiche parfaitement, les menus fonctionnent, mais l'image en direct reste noire. C'est que le flux passe par
un websocket, et qu'un proxy en HTTP/1.0 sans en-tête `Upgrade` le coupe. `proxy_buffering off` évite en prime
que nginx accumule le flux en mémoire avant de le rendre.

### L'authentification en cadeau

C'est le bénéfice inattendu de la manœuvre. Ces équipements ont des comptes locaux, pas de second facteur, et
souvent une gestion des mots de passe des années 2000. En plaçant un proxy devant, vous pouvez exiger une
authentification **avant** que la requête n'atteigne le boîtier.

Sur ma plateforme, l'option s'appelle « Login with Cloudron » : le proxy demande une connexion à l'annuaire de
l'entreprise, avec le second facteur de l'utilisateur, et ne laisse passer que les comptes autorisés. Sur un
nginx nu, l'équivalent se construit avec `auth_request` et un service d'authentification, ou à défaut avec
`mod_authnz_ldap` côté Apache.

Résultat : plus de compte supplémentaire à créer pour chaque personne qui doit consulter les caméras, et le
départ d'un salarié lui retire l'accès en même temps que le reste. C'est un second facteur gratuit greffé sur
un équipement qui n'en aura jamais.

## Étape 3 : le proxy externe, en DMZ

Si l'accès doit être possible depuis l'extérieur, ne publiez pas le proxy interne. Montez-en un second en DMZ,
qui relaie vers le premier. Deux proxys, donc : un externe qui porte le nom public
`camera.example.com` et son certificat Let's Encrypt, un interne qui parle au boîtier.

```text title="Le chemin complet d'une requête"
Navigateur (Internet)
   → proxy DMZ        : https://camera.example.com        (certificat public, authentification)
   → proxy LAN        : https://camera.interne.example.com
   → boîtier          : http://10.30.0.50:8080            (VLAN équipements, jamais routé)
```

L'intérêt de ce doublon n'est pas cosmétique. Il permet de couper l'accès externe en une manipulation sans
toucher au fonctionnement interne, de journaliser séparément ce qui vient d'Internet, et de garder le boîtier
à trois sauts de tout ce qui est public. Depuis la DMZ, personne n'atteint le VLAN équipements : on n'atteint
que le proxy interne, sur un seul port.

:::note
Vérifiez que la vérification du certificat du proxy interne est bien activée sur le proxy externe. Un
`proxy_pass https://…` qui ignore les erreurs de certificat, c'est un chiffrement décoratif.
:::

## Ce que le reverse proxy ne réglera pas

Autant être clair sur les limites, parce que c'est ce que j'ai fini par écrire noir sur blanc au fournisseur
dans mon compte rendu.

- **Les flux non HTTP.** Le protocole RTSP des caméras ne passe pas par un proxy web et, sur beaucoup
  d'équipements, il n'existe pas en version chiffrée. Un flux RTSP ne sort donc pas de son VLAN, point. Si un
  prestataire vous demande un accès distant au flux brut, c'est un VPN, pas une redirection de port.
- **La faiblesse interne du produit.** Le proxy ne corrige ni l'absence de véritable authentification
  multifacteur, ni l'agrégation de liens réseau manquante, ni l'absence d'accès en ligne de commande pour
  l'exploitation. Il les rend seulement moins dangereuses.
- **Le firmware.** Après chaque mise à jour, vérifiez que le boîtier n'a pas réactivé son HTTPS autosigné ni
  changé de port. C'est une ligne de plus dans la procédure de mise à jour, et elle a sa raison d'être.

Un dernier conseil, qui n'est pas technique : documentez ces limites dans un compte rendu daté et envoyez-le
au fournisseur. Non pas pour polémiquer, mais parce que le jour où l'équipement sera remplacé, cette liste
deviendra le cahier des charges du suivant. « Doit accepter un certificat au format standard et le conserver
après mise à jour » est une exigence qu'on ne pense à écrire qu'après l'avoir vécue.

## Pour aller plus loin

- Le réseau qui rend tout ça tenable, et pourquoi ces équipements n'ont rien à faire sur le LAN bureautique :
  [Segmenter les réseaux machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/).
- L'annuaire qui sert d'authentification au proxy, et les trois façons de s'y brancher :
  [Brancher une application maison sur le SSO](/docs/self-hosting/sso-pour-une-appli-maison-ldap-oidc-ou-saml/).
- La documentation nginx sur le proxy de websockets détaille les en-têtes `Upgrade` et `Connection` évoqués
  plus haut.

<!-- source : mails « Réception caméras », 2025-06-30 et 2025-07-15 ; « Résumé caméras », 2026-03-20 -->

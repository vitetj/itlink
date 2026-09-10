---
title: "Mettre un alias DNS interne (CNAME) devant un SaaS pour absorber les changements d'URL"
description: "Un SaaS d'atelier change d'URL et des dizaines de QR codes imprimés pointent dessus. Avec un alias DNS interne créé dès le déploiement, la correction tient en une ligne. Le principe, les commandes, et le piège du certificat HTTPS."
published: 2026-05-30
category: cloud-web
tags: [dns, cname, saas, windows-server, qr-code, powershell]
level: débutant
status: à jour
featured: false
tested_on: [DNS Windows Server]
---

Fin mai 2026, l'éditeur d'un SaaS utilisé dans l'atelier annonce un changement d'URL. Ce SaaS est
consulté depuis des QR codes imprimés et collés sur les postes de travail : les opérateurs scannent, la
page s'ouvre. Un changement d'URL, dans ce contexte, ça veut normalement dire réimprimer tous les QR
codes, refaire les raccourcis, repasser sur chaque machine. Une journée perdue, minimum.

Sauf que lors du déploiement initial, j'avais mis un alias DNS interne entre les deux : les QR codes ne
pointent pas vers l'URL de l'éditeur, mais vers un nom qui m'appartient et que je fais pointer où je veux.
Le jour du changement, j'ai modifié un enregistrement CNAME, et c'était réglé. Le mail au responsable
production tenait en trois lignes, dont une pour prévenir que la propagation pouvait prendre entre une
heure et vingt-quatre heures.

Cette fiche explique le principe, comment le mettre en place sur un DNS Windows Server, et le piège qui
vous attend si le SaaS est en HTTPS (c'est-à-dire toujours).

## Pourquoi un alias plutôt que l'URL de l'éditeur

Pensez à votre répertoire téléphonique. Vous n'apprenez pas le numéro de votre garagiste par cœur : vous
enregistrez un contact « Garage ». Le jour où il change de numéro, vous modifiez le contact, pas les
quarante endroits où vous auriez pu écrire le numéro à la main.

Un alias DNS, c'est exactement ça. Vous créez un nom dans votre zone interne, par exemple
`qr.ad.example.com`, et vous le faites pointer vers le nom réel du SaaS, par exemple
`atelier.example.net`. Tout ce qui est imprimé, configuré ou mémorisé utilise `qr.ad.example.com`.
L'URL de l'éditeur n'apparaît qu'à un seul endroit : dans l'enregistrement DNS.

Le jour où l'éditeur migre, vous changez la cible de l'alias. Personne ne touche aux QR codes, aux
favoris ni aux machines.

:::note
Ce mécanisme est valable pour tout ce dont vous ne maîtrisez pas le nom : un SaaS, un portail
fournisseur, un outil hébergé chez un prestataire. Pour vos propres serveurs, c'est encore plus vrai :
un alias `intranet` ou `gpao` survit à trois changements de serveur.
:::

## Prérequis

- Un serveur DNS Windows Server (celui de votre Active Directory fait très bien l'affaire) et les droits
  pour y créer des enregistrements.
- Le module PowerShell `DnsServer` (installé avec les outils d'administration du rôle DNS).
- Le nom d'hôte réel du SaaS. Un CNAME pointe vers un nom, jamais vers une URL complète : le chemin
  (`/scan/poste-12`) reste dans le QR code, seul le nom d'hôte est remplacé par l'alias.

## Créer l'alias dès le déploiement

C'est le point qui change tout : l'alias se crée *avant* d'imprimer quoi que ce soit. Après, c'est trop
tard, vous êtes dans le cas de figure « une journée de réimpression ».

```powershell title="Créer le CNAME dans la zone interne"
Add-DnsServerResourceRecordCName -ZoneName "ad.example.com" -Name "qr" -HostNameAlias "atelier.example.net" -TimeToLive 00:15:00
```

Deux choix à faire à ce moment-là :

- **La zone.** Le plus simple est de mettre l'alias dans votre zone AD existante. Si vous voulez
  distinguer proprement vos services des machines, une zone dédiée du type `apps.example.com` est plus
  lisible, mais ce n'est pas indispensable.
- **Le TTL.** C'est la durée pendant laquelle un client a le droit de garder la réponse en cache. Un TTL
  court (quinze minutes) rend les changements plus rapides à se propager. Le TTL par défaut d'une zone
  Windows est d'une heure : c'est lui qui explique le « entre une heure et vingt-quatre heures » annoncé
  aux utilisateurs, une fois ajoutés les caches des navigateurs et des postes.

Vérifiez ensuite depuis un poste client :

```powershell
Resolve-DnsName qr.ad.example.com
```

Vous devez voir l'enregistrement CNAME, puis l'adresse du SaaS derrière.

## N'utiliser que l'alias, partout

L'alias ne sert à rien s'il n'est utilisé qu'à moitié. Faites-en la seule adresse connue :

- dans les QR codes et tout support imprimé ;
- dans les raccourcis déployés par GPO ou par votre outil de déploiement ;
- dans les favoris, la documentation interne, les procédures ;
- dans les intégrations (un ERP qui appelle le SaaS, un script).

Si une seule machine garde l'URL de l'éditeur en dur, c'est celle-là qui tombera en panne le jour du
changement, et c'est celle-là qu'on viendra vous montrer.

## Le jour où l'URL change

L'éditeur annonce la nouvelle adresse. Sur le serveur DNS, on modifie la cible du CNAME. Avec
PowerShell, la méthode documentée consiste à cloner l'enregistrement, modifier la copie, puis
remplacer l'ancien par le nouveau :

```powershell title="Modifier la cible du CNAME"
$ancien = Get-DnsServerResourceRecord -ZoneName "ad.example.com" -Name "qr" -RRType CName
$nouveau = $ancien.Clone()
$nouveau.RecordData.HostNameAlias = "atelier-v2.example.net."
Set-DnsServerResourceRecord -ZoneName "ad.example.com" -OldInputObject $ancien -NewInputObject $nouveau
```

La console DNS fait la même chose en deux clics si vous préférez la souris. Ensuite, pour accélérer la
prise en compte :

```powershell title="Vider les caches"
# Sur le serveur DNS
Clear-DnsServerCache -Force
# Sur un poste client qui a encore l'ancienne réponse
ipconfig /flushdns
```

Prévenez tout de même les utilisateurs que la bascule n'est pas instantanée partout : un poste qui a
résolu l'ancien nom juste avant le changement le garde jusqu'à expiration du TTL, et certains navigateurs
ajoutent leur propre cache. Annoncer « entre une heure et vingt-quatre heures » couvre tous les cas et
évite les tickets de la première demi-heure.

:::tip
Si vous connaissez la date du changement à l'avance, abaissez le TTL à cinq minutes quelques jours
avant. Le jour J, tout le monde verra la nouvelle cible presque immédiatement. Vous remonterez le TTL
ensuite.
:::

## Le piège : le certificat HTTPS

Voici la partie honnête. Un CNAME redirige la résolution du nom, pas la conversation HTTPS. Quand le
navigateur ouvre `https://qr.ad.example.com/`, il se connecte bien au serveur du SaaS, mais il attend un
certificat valable pour `qr.ad.example.com`. Le SaaS, lui, présente un certificat pour
`atelier.example.net`. Résultat : une erreur de certificat, ou, sur un serveur mutualisé, une page
d'erreur parce que l'hébergeur ne reconnaît pas le nom demandé.

Il y a deux façons de s'en sortir :

| Approche | Comment ça marche | Quand la choisir |
|---|---|---|
| CNAME brut | Le nom interne pointe directement vers le SaaS | Le SaaS propose une fonction « domaine personnalisé » et accepte votre alias avec son propre certificat, ou l'accès se fait en HTTP interne |
| Redirection HTTP | L'alias pointe vers un petit serveur web interne (reverse proxy) qui renvoie un `301`/`302` vers l'URL réelle | Dans tous les autres cas, et dès que l'éditeur peut aussi changer le chemin de l'URL, pas seulement le nom d'hôte |

La redirection a un avantage supplémentaire : elle absorbe aussi un changement de chemin, ce qu'un CNAME
ne sait pas faire. Le QR code pointe vers `http://qr.ad.example.com/poste-12`, le reverse proxy renvoie
vers l'URL réelle, et le jour du changement vous modifiez une règle de réécriture au lieu d'un
enregistrement DNS. Même principe, un cran plus souple.

:::caution
Testez l'alias depuis un vrai poste, avec un vrai navigateur, avant d'imprimer. Une erreur de
certificat se voit en dix secondes sur un écran et en une semaine sur cinquante QR codes.
:::

## Pour aller plus loin

- [Diagnostiquer une résolution DNS interne cassée par un client VPN ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/) : quand l'alias ne se résout plus, ce n'est pas forcément la faute du DNS.
- [Lab : DNS sécurisé avec AdGuard Home et Cloudflare Gateway](/lab/dns-securise-adguard-home-et-cloudflare-gateway/) : la même logique d'alias, côté maison.
- Documentation Microsoft : `Add-DnsServerResourceRecordCName` et `Set-DnsServerResourceRecord` sur [learn.microsoft.com](https://learn.microsoft.com/powershell/module/dnsserver/).

<!-- source : mail « QR code », 2026-05-28 -->

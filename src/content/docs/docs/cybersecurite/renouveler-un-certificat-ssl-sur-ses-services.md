---
title: "Renouveler un certificat TLS et le déployer sur tous les services qui en dépendent"
description: "Un certificat qui expire, ce n'est jamais un seul service. Inventaire des points de dépôt, chaîne complète, format attendu par chaque produit et vérification après bascule : la méthode pour ne rien oublier."
published: 2026-03-05
category: cybersecurite
tags: [tls, certificat, pki, exchange, adfs, nginx]
level: intermédiaire
status: à jour
featured: true
tested_on: [Exchange Server, AD FS, Web Application Proxy, IIS, nginx]
sidebar:
  label: "Renouveler un certificat TLS"
---

Un certificat public, ça expire. On le sait, on note la date, et en général ça se passe bien. Ce qui se passe
mal, c'est la suite : le certificat n'est pas déployé sur un service, il est déployé sur **une douzaine**, et
personne n'a la liste complète. Messagerie, portail de fédération, applications métier publiées, reverse proxy
en conteneur, passerelle téléphonique, résolveur DNS filtrant — chacun avec son format, sa console et son
redémarrage de service.

Le renouvellement lui-même prend dix minutes. C'est l'inventaire et la vérification qui prennent la journée,
et c'est là qu'il faut mettre le travail.

## Prérequis

- Le nouveau certificat, sa clé privée et **la chaîne intermédiaire complète** fournis par l'autorité.
- Un accès administrateur à chacun des services identifiés, et une fenêtre d'intervention annoncée. Certaines
  bascules coupent l'authentification de tout le monde pendant une minute.
- L'ancien certificat toujours en place. On ne supprime rien avant d'avoir vérifié.

## Faire l'inventaire avant de toucher quoi que ce soit

La liste des noms portés par le certificat est votre point de départ : un `*.example.com` sur un certificat
générique, les SAN sur un multi-domaines. Pour chaque nom, trois questions : **qui répond, sur quels ports, et
où le fichier est-il stocké ?** Le résultat tient dans un tableau que vous garderez d'une année sur l'autre.

| Service | Où vit le certificat | Format | Action après dépôt |
| --- | --- | --- | --- |
| Serveur de messagerie | Magasin machine Windows | PFX | Réactiver les services SMTP et IIS |
| Service de fédération | Magasin machine Windows | PFX | Redémarrer le service, revalider les liaisons |
| Proxy applicatif inverse | Magasin machine Windows | PFX | Réappliquer sur chaque publication |
| Serveurs web internes | Magasin machine, liaison IIS | PFX | Modifier le binding HTTPS |
| Reverse proxy Linux | `/etc/ssl/` ou volume du conteneur | PEM | Recharger le service |
| Application Java métier | Chemin déclaré dans son fichier de configuration | PFX ou keystore | Redémarrer le service, vérifier les droits |
| Passerelle téléphonique | Interface d'administration du boîtier | PEM ou PFX sans mot de passe | Redistribuer aux équipements pilotés |
| Applications fédérées SAML | Métadonnées de la fédération | — | Renvoyer les métadonnées au partenaire |

Ce tableau est le livrable le plus utile de toute l'opération. L'année suivante, vous ne cherchez plus.

:::tip
Si vous n'avez pas cette liste, reconstituez-la par l'extérieur : pour chaque nom DNS du certificat, ouvrez une
connexion TLS et regardez qui répond. Une supervision qui teste l'expiration de chaque nom, port par port,
transforme ensuite cet inventaire en alerte automatique trente jours avant l'échéance.
:::

## Récupérer et vérifier la chaîne complète

L'erreur la plus fréquente du renouvellement n'est pas l'oubli d'un service : c'est le dépôt d'un certificat
sans ses intermédiaires. Le navigateur de votre poste ne dira rien, parce qu'il a l'intermédiaire en cache.
Un client mobile, un automate ou une passerelle SMTP, si.

```bash title="Contrôler le matériel reçu avant de le déployer"
# La clé correspond-elle bien au certificat ?
openssl x509 -noout -modulus -in certificat.crt | openssl md5
openssl rsa  -noout -modulus -in certificat.key | openssl md5

# La chaîne est-elle complète et dans le bon ordre ?
openssl verify -untrusted chaine.pem certificat.crt

# Que contient réellement le PFX livré ?
openssl pkcs12 -info -in certificat.pfx -nokeys
```

Les deux empreintes doivent être identiques : sinon vous avez mélangé deux commandes, et aucun service ne
démarrera. Constituez ensuite un fichier `fullchain` — certificat serveur en premier, intermédiaires ensuite,
racine jamais — pour tous les services au format PEM.

## Connaître le format attendu par chaque produit

C'est ce qui fait perdre le plus de temps, parce que chaque éditeur a son habitude.

- **Monde Windows** : un fichier PFX (PKCS#12) contenant certificat, clé et chaîne, importé dans le magasin
  machine. Tout s'enchaîne ensuite par l'empreinte du certificat.
- **Monde Linux / nginx / Apache** : deux fichiers PEM, le `fullchain` et la clé privée, référencés par chemin
  dans la configuration du service.
- **Applications Java** : un keystore, souvent un PFX, dont le chemin et le mot de passe sont déclarés dans un
  fichier de configuration.
- **Boîtiers et appliances web** : import par l'interface d'administration. Beaucoup **refusent une clé privée
  protégée par mot de passe** : il faut la déchiffrer avant l'envoi.
- **Anciens systèmes Windows** : certains services n'acceptent que l'ancien fournisseur cryptographique (CSP)
  et pas les clés CNG. L'import se fait alors en forçant le fournisseur.

```cmd title="Forcer le fournisseur cryptographique à l'import (systèmes anciens)"
certutil -csp "Microsoft Enhanced RSA and AES Cryptographic Provider" -importpfx "C:\certs\certificat.pfx"
```

## Déployer service par service

### Le magasin Windows et les liaisons IIS

Tout commence par l'import, et par la récupération de l'empreinte : c'est elle qui servira partout ensuite.

```powershell title="Importer le certificat et relever son empreinte"
$cred = Get-Credential -UserName 'pfx' -Message 'Mot de passe du fichier PFX'
$new  = Import-PfxCertificate -FilePath 'C:\certs\certificat.pfx' `
        -CertStoreLocation Cert:\LocalMachine\My -Password $cred.Password
$new.Thumbprint
```

Pour IIS, la liaison HTTPS de chaque site se met à jour depuis la console, ou en ligne de commande. Vérifiez
ensuite les réservations HTTP du système, qui ne suivent pas automatiquement :

```cmd title="Reprendre les réservations HTTP par nom d'hôte"
netsh http show sslcert
netsh http delete sslcert hostnameport=portail.example.com:443
netsh http add sslcert hostnameport=portail.example.com:443 certhash=<empreinte> appid={<AppId relevé ci-dessus>} certstorename=My
```

L'`appid` n'est pas à inventer : reprenez celui que `netsh http show sslcert` affiche pour l'entrée existante.

### La messagerie

Le certificat s'importe, puis s'active explicitement sur les services concernés. Tant qu'il n'est pas activé,
il est présent et inutilisé.

```powershell title="Activer le certificat sur les services de messagerie"
Import-ExchangeCertificate -FileName 'C:\certs\certificat.pfx' -PrivateKeyExportable $true `
  -Password (Get-Credential -UserName 'pfx' -Message 'Mot de passe').Password
Get-ExchangeCertificate -Thumbprint <empreinte> | Enable-ExchangeCertificate -Services SMTP,IIS
```

:::caution
L'activation sur le service SMTP demande une confirmation et remplace le certificat du connecteur. Faites-la
en connaissance de cause : c'est le moment où les flux entrants d'un filtrage externe peuvent tomber si le nom
présenté change.
:::

### Le service de fédération et le proxy applicatif

Ces deux-là vont ensemble, et ils se déploient dans cet ordre : d'abord la fédération, ensuite le proxy, qui
refuse de fonctionner si la fédération présente encore l'ancien certificat.

```powershell title="Fédération puis proxy applicatif inverse"
Set-AdfsSslCertificate -Thumbprint <empreinte>
Restart-Service adfssrv

Import-Module WebApplicationProxy
Get-WebApplicationProxyApplication | Set-WebApplicationProxyApplication -ExternalCertificateThumbprint <empreinte>
Set-WebApplicationProxySslCertificate -Thumbprint <empreinte>
Restart-Service appproxysvc -Force
```

Attention au point le plus discret : chaque **publication** du proxy porte sa propre référence au certificat.
Changer le certificat du proxy ne change pas celui des publications. D'où le `Get-… | Set-…` qui parcourt tout.

### Les reverse proxies et les conteneurs

Deux lignes à modifier, un rechargement, et c'est fini — à condition que le chemin pointe bien vers le
`fullchain` et non vers le seul certificat serveur.

```nginx title="Bloc TLS d'un reverse proxy"
ssl_certificate     /etc/ssl/certs/service.fullchain.pem;
ssl_certificate_key /etc/ssl/private/service.key;
```

Pour un service en conteneur, les fichiers vivent dans un volume monté depuis l'hôte. Remplacez-les sur
l'hôte, puis rechargez le conteneur : il ne relit pas ses certificats tout seul.

### Les applications métier avec un keystore

Certaines applications déclarent le certificat dans leur propre fichier de configuration :

```json title="Extrait de configuration d'une application Java"
{
  "port": 8080,
  "ssl": {
    "keyStoreLocation": "/srv/application/certs/certificat.pfx",
    "keyStorePassword": ""
  }
}
```

Puis un redémarrage du service. Et **n'oubliez pas les droits sur le fichier** : un keystore lisible par tout
le monde est un incident de sécurité, un keystore illisible par le service est une panne — qui ne se voit
qu'au prochain redémarrage.

### Les appliances, la téléphonie et les fédérations SAML

Ces cas demandent de lire la documentation du produit. Trois règles : importez d'abord sur l'élément central
puis redistribuez vers les équipements pilotés ; retirez le mot de passe de la clé si le boîtier le refuse ;
et pour toute application fédérée en SAML, **renvoyez les métadonnées à jour au partenaire**, sinon la
signature sera rejetée le jour où l'ancien certificat disparaît.

## Vérifier après la bascule

Ne vous fiez pas au navigateur de votre poste : il ment par gentillesse. Interrogez chaque service sur son
port réel.

```bash title="Contrôler ce qui est réellement présenté"
openssl s_client -connect portail.example.com:443 -servername portail.example.com </dev/null \
  | openssl x509 -noout -subject -issuer -dates

openssl s_client -connect mail.example.com:25 -starttls smtp </dev/null \
  | openssl x509 -noout -subject -dates
```

Trois contrôles par nom : bonne date d'expiration, bon émetteur, chaîne complète. Ajoutez un test depuis un
poste hors du domaine et depuis un mobile en 4G : c'est ce qui attrape les intermédiaires manquants.

:::danger
Ne supprimez l'ancien certificat qu'après plusieurs jours de fonctionnement, et manuellement, service par
service. Une suppression groupée du magasin retire aussi le certificat encore référencé par un service que
vous aviez oublié — et vous découvrez son existence par la panne.
:::

## Pour aller plus loin

- [LDAPS : réparer un certificat CAPI vers CNG SHA256](/docs/windows-server/ldaps-reparer-un-certificat-capi-vers-cng-sha256/)
- [Mettre un boîtier sans HTTPS derrière un reverse proxy](/docs/self-hosting/mettre-un-boitier-sans-https-derriere-un-reverse-proxy/)
- [Surveiller ses services avec Uptime Kuma](/docs/self-hosting/surveiller-ses-services-avec-uptime-kuma/)

<!-- source : procédure interne « Changement de certificat SSL », centre de documentation -->

---
title: "Hornetsecurity et Microsoft 365 : stopper les libérations automatiques de quarantaine provoquées par Safe Links"
description: "Vos utilisateurs « libèrent » vingt spams par seconde ? Ce n'est pas eux, c'est Safe Links qui clique les liens des rapports de quarantaine. La règle de flux Exchange qui règle le problème, et le nettoyage qui suit."
published: 2026-03-20
category: cybersecurite
tags: [hornetsecurity, microsoft-365, exchange-online, defender, safe-links, antispam]
level: intermédiaire
status: à jour
featured: true
tested_on: [Microsoft 365, Defender for Office 365 Plan 1, Hornetsecurity Email Protection]
---

Début mars 2026, quelques mois après la migration de l'antispam vers Hornetsecurity, plusieurs utilisateurs
me signalent une avalanche de publicités dans leur boîte. Pas de phishing, pas de malware : du spam commercial
ordinaire, celui que le filtre est justement censé arrêter. Premier réflexe, ouvrir un ticket chez l'éditeur
avec un titre volontairement vague : « infomail et/ou spam mal filtré ». Deuxième réflexe, celui qui a tout
changé : aller lire le journal d'audit du Control Panel avant d'accuser qui que ce soit.

Le journal montre des utilisateurs qui « libèrent » vingt mails de quarantaine en moins d'une seconde et qui,
dans le même mouvement, ajoutent chaque expéditeur à leur liste blanche. Vingt actions à la même seconde.
Humainement impossible. Personne ne clique aussi vite, et sûrement pas sur des publicités.

## Pourquoi votre tenant clique à votre place

Un rapport de quarantaine Hornetsecurity est un mail HTML avec des boutons : « Preview », « Deliver »,
« Add sender to allow list ». Chaque bouton est un lien. Une visite sur ce lien vaut un clic, sans autre
confirmation. C'est pratique pour l'utilisateur, et c'est exactement ce qu'un robot ne doit jamais faire.

Or Microsoft Defender for Office 365 Plan 1, inclus dans ma licence Microsoft 365, embarque Safe Links. Pour
vérifier qu'un lien n'est pas piégé, Safe Links le visite. Tous les liens du mail. Y compris « Deliver » et
« Add sender to allow list ». Imaginez un vigile qui, pour s'assurer qu'aucune porte n'est piégée, les ouvre
toutes une par une : la vérification est faite, mais vos spams sont entrés et leurs expéditeurs ont désormais
un badge permanent.

Dans mon cas, les adresses IP sources relevées dans le journal d'audit racontaient l'histoire en deux temps :
d'abord des plages Microsoft (Safe Links), puis des plages d'un hébergeur cloud public, autrement dit un second
scanner de liens que je n'avais pas identifié tout de suite.

| Ce que vous voyez | Ce que ça veut dire |
| --- | --- |
| Des dizaines de « release » à la même seconde pour un même utilisateur | Un robot suit les liens du rapport, pas l'utilisateur |
| IP source dans des plages Microsoft | Safe Links (Defender for Office 365) |
| IP source chez un hébergeur cloud | Un scanner tiers (passerelle, sandbox, extension) |
| Liste blanche qui grossit toute seule | Le bouton « Add sender to allow list » est cliqué par le robot |
| Les spams arrivent par paquets, 30 minutes après le rapport | Délai entre le rapport, le clic automatique et la livraison |

## Prérequis

- Un compte administrateur Exchange Online (rôle « Gestion de l'organisation » ou équivalent).
- Un accès administrateur au Control Panel Hornetsecurity, avec le journal d'audit.
- La base de connaissances Hornetsecurity « Workaround for automatic releases of quarantined emails », qui
  liste les plages IP des serveurs de rapports de quarantaine par région.

## Confirmer le diagnostic dans le journal d'audit

Avant de toucher au moindre paramètre, prouvez le phénomène. Dans le Control Panel Hornetsecurity, ouvrez le
journal d'audit et filtrez sur les actions de libération (release) et d'ajout à la liste blanche. Cherchez
trois choses :

1. Des rafales d'actions horodatées à la même seconde.
2. Des utilisateurs qui affirment n'avoir rien fait (et qui disent vrai).
3. Les adresses IP sources de ces actions, à comparer aux plages Microsoft et à celles d'un éventuel second
   scanner.

Gardez une capture ou un export : le support de l'éditeur vous la demandera, et elle vous servira à vérifier,
après correction, que le comportement a bien disparu.

## Créer la règle de flux Exchange qui désactive Safe Links pour les rapports

La solution n'est pas de désactiver Safe Links pour tout le monde. C'est de dire à Exchange Online : « pour
les mails qui viennent des serveurs de rapports Hornetsecurity, ne réécris pas et ne visite pas les liens ».
Cela passe par un en-tête interne documenté par Microsoft : `X-MS-Exchange-Organization-SkipSafeLinksProcessing`.

### Depuis le centre d'administration Exchange

1. Centre d'administration Exchange, **Flux de messagerie > Règles**, puis **Ajouter une règle > Créer une
   règle**.
2. Condition : **L'adresse IP de l'expéditeur figure dans l'une de ces plages**. Renseignez les plages des
   serveurs de rapports de quarantaine Hornetsecurity de votre région (EU dans mon cas), telles que listées
   dans la base de connaissances.
3. Action : **Modifier les propriétés du message > Définir un en-tête de message**. Nom :
   `X-MS-Exchange-Organization-SkipSafeLinksProcessing`, valeur : `1`.
4. Enregistrez, puis activez la règle.

### En PowerShell

La même règle en une commande, plus facile à relire six mois plus tard :

```powershell title="Règle de flux : ignorer Safe Links pour les rapports de quarantaine"
Connect-ExchangeOnline

New-TransportRule -Name "Hornetsecurity - rapports de quarantaine sans Safe Links" `
  -SenderIpRanges "198.51.100.0/24", "203.0.113.0/24" `
  -SetHeaderName "X-MS-Exchange-Organization-SkipSafeLinksProcessing" `
  -SetHeaderValue "1" `
  -Comments "Empêche Safe Links de suivre les boutons Deliver / Allow des rapports de quarantaine"
```

Remplacez les plages d'exemple par celles de la base de connaissances Hornetsecurity.

:::caution
Hornetsecurity publie plusieurs listes d'adresses IP : celles des serveurs de rapports de quarantaine, et
celles du Security Awareness Service (les simulations de phishing). Ma première règle utilisait les plages du
SAS. Elle était propre, activée, et parfaitement inutile : les libérations automatiques ont continué comme si
de rien n'était. Vérifiez que vous copiez la bonne liste.
:::

### Attendre, puis vérifier

Une règle de flux met plusieurs dizaines de minutes à se propager. Ne concluez rien avant. Attendez le
prochain rapport de quarantaine, puis retournez dans le journal d'audit : les rafales de « release » à la
même seconde doivent avoir disparu.

Contrôlez aussi l'en-tête sur un rapport reçu après activation : ouvrez le message dans Outlook, affichez les
en-têtes Internet (ou collez-les dans l'analyseur d'en-têtes de Microsoft) et cherchez
`X-MS-Exchange-Organization-SkipSafeLinksProcessing: 1`.

:::note
Un résiduel de clics peut persister quelques jours si un second scanner, hors Microsoft, suit encore les
liens. Dans mon cas, les libérations venant des plages de l'hébergeur cloud ont mis un peu de temps à
s'éteindre. Si elles ne s'éteignent pas, identifiez ce scanner (passerelle tierce, extension de navigateur,
sandbox) et traitez-le à part.
:::

## Changer le modèle de rapport de quarantaine

Deuxième ligne de défense, indépendante de la première : rendre les rapports moins dangereux quand quelqu'un
ou quelque chose les clique quand même.

Dans le Control Panel, ouvrez **Quarantine report layouts** et choisissez un modèle sans bouton « Preview »
ni « Add sender to allow list ». Un simple « Deliver » livre le mail en question, ce qui est déjà agaçant,
mais ne pollue pas la liste blanche. C'est l'ajout automatique d'expéditeurs qui transforme un incident d'un
jour en problème permanent : une fois l'expéditeur autorisé, ses envois suivants ne passent même plus par la
quarantaine.

## Nettoyer les listes blanches

Pendant les semaines où le robot a cliqué, il a rempli les listes blanches des utilisateurs avec des dizaines
d'expéditeurs de spam. La règle de flux arrête l'hémorragie, elle ne soigne pas la plaie.

Deux options :

- Demander au support de l'éditeur un retrait en masse des entrées ajoutées sur la période concernée. C'est ce
  que j'ai fait, avec les dates du journal d'audit comme périmètre.
- Purger manuellement, utilisateur par utilisateur, depuis le Control Panel. Faisable pour dix personnes, pas
  pour deux cents.

Prévenez aussi les utilisateurs : les spams « libérés » avant la correction arrivent d'un seul coup une
trentaine de minutes après le rapport. Le jour où j'ai reçu la salve dans ma propre boîte, mon message au
support tenait en une ligne de consonnes. Ce n'est pas une rechute, c'est la queue de la file.

## Pour aller plus loin

- [Migrer un antispam Vade vers Hornetsecurity sans perdre les utilisateurs en route](/docs/cybersecurite/migrer-un-antispam-vade-vers-hornetsecurity/),
  la migration qui précède cet incident de quelques mois.
- [SPF, DKIM et DMARC derrière une passerelle de filtrage](/docs/cybersecurite/spf-dkim-dmarc-derriere-une-passerelle-de-filtrage/),
  pour comprendre ce qui se passe quand un tiers se retrouve entre vos utilisateurs et Exchange Online.
- Documentation Microsoft : [Safe Links dans Microsoft Defender for Office 365](https://learn.microsoft.com/defender-office-365/safe-links-about).

<!-- source : thread support Hornetsecurity « infomail et/ou spam mal filtré », 2026-03-04 -> 2026-03-20 -->

---
title: "Exchange hybride : flux on-premise vers Exchange Online refusé « 451 5.7.3 STARTTLS is required »"
description: "L'assistant hybride a terminé sans erreur, mais les mails du serveur local vers Exchange Online restent en file d'attente. Connecteurs, certificat, antispam en relais : le diagnostic et ce qui a vraiment débloqué le flux."
published: 2025-03-20
category: microsoft-365
tags: [exchange, exchange-online, hybride, smtp, tls, antispam]
level: expert
status: à jour
featured: true
tested_on: ["Exchange Server 2019 CU15 (15.2.1748.10)", "Windows Server 2025", "Exchange Online"]
---

Le décor : une PME industrielle, deux serveurs Exchange (l'ancien 2013 en fin de vie et un 2019 tout neuf sur
Windows Server 2025 qui porte l'hybridation), ADFS derrière un Web Application Proxy, Entra Connect, et un antispam
cloud (Vade, devenu Hornetsecurity) qui reçoit le MX et livre au serveur local. L'assistant de configuration
hybride (HCW) vient de se terminer sans une seule erreur. Une boîte de test est migrée. Et là, trois flux sur quatre
fonctionnent : l'extérieur vers le cloud, le cloud vers le serveur local, l'extérieur vers le serveur local. Le
quatrième, du serveur local vers Exchange Online, s'entasse dans la file d'attente avec ce message :

```text
451 4.4.395 Target host responded with error. -> 451 5.7.3 STARTTLS is required to send mail
```

Pourquoi c'est grave : pendant une coexistence, chaque boîte migrée devient injoignable pour les collègues encore
sur le serveur local. Deux personnes du même bureau qui ne reçoivent plus leurs mails, ça remonte à la direction avant
le café.

## Comprendre l'erreur

Le `451 4.4.395` est l'emballage : Exchange vous dit que l'hôte de destination a répondu par une erreur. La vraie
information, c'est le `451 5.7.3 STARTTLS is required to send mail`. Exchange Online refuse d'accepter le message
parce que la session SMTP n'a pas été chiffrée en TLS.

C'est le principe même de l'hybride. Le connecteur entrant que l'assistant a créé côté Exchange
Online (type *OnPremises*) reconnaît votre serveur par le sujet de son certificat. Sans TLS, pas de certificat ; sans
certificat, pas d'identification ; et Exchange Online ne discute même pas du contenu. C'est le coursier qui se présente
sans badge à l'accueil : on ne regarde pas le colis, on ne le laisse pas entrer.

Le point vicieux : le code commence par 4, donc l'erreur est temporaire. Exchange réessaie sagement, la file grossit
en silence, et aucun NDR n'arrive chez l'utilisateur. Trois familles de causes, dans l'ordre où je les ai rencontrées :

| Cause | Symptôme associé | Où regarder |
|---|---|---|
| Le certificat n'est pas présenté sur le connecteur d'envoi | STARTTLS négocié mais rejeté | `TlsCertificateName` du connecteur, service SMTP du certificat |
| Un équipement casse le STARTTLS entre les deux | `250-STARTTLS` absent de la réponse EHLO | Pare-feu avec inspection SMTP, antispam en relais |
| Le routage ne passe pas par le bon connecteur | Le message part vers l'antispam au lieu du cloud | Types de domaines, smart hosts, connecteur désactivé |

## Prérequis

- L'Exchange Management Shell sur le serveur hybride, avec un compte Organization Management.
- Un compte administrateur général du tenant et le module Exchange Online PowerShell.
- L'accès au panneau d'administration de l'antispam, si vous en avez un devant votre MX.
- Une boîte de test déjà migrée dans Exchange Online.

## Localiser les messages bloqués

```powershell title="Sur le serveur Exchange local"
Get-Queue | Where-Object Status -ne 'Ready' |
  Format-List Identity, Status, DeliveryType, NextHopDomain, MessageCount, LastError
```

`NextHopDomain` vous dit par quel chemin le message essaie de partir : `example.mail.onmicrosoft.com`, c'est le
connecteur de l'assistant ; le nom de votre antispam, c'est un problème de routage, pas de TLS.

## Vérifier le connecteur d'envoi créé par l'assistant

```powershell
Get-SendConnector | Format-List Name, Enabled, AddressSpaces, SmartHosts, DNSRoutingEnabled,
  TlsDomain, TlsAuthLevel, RequireTLS, TlsCertificateName, CloudServicesMailEnabled
```

Pour le connecteur `Outbound to Office 365 - <guid>`, vous devez retrouver : l'espace d'adressage
`example.mail.onmicrosoft.com`, le smart host `example-com.mail.protection.outlook.com`, `RequireTLS` à `True`,
`TlsAuthLevel` à `DomainValidation`, `TlsDomain` à `mail.protection.outlook.com`, `CloudServicesMailEnabled` à
`True`, et surtout un `TlsCertificateName` qui pointe vers le certificat tiers choisi dans l'assistant. Vide, c'est
Exchange qui choisit le certificat tout seul, et il ne choisit pas toujours le bon.

## Vérifier le certificat et son affectation

```powershell
Get-ExchangeCertificate | Format-List Subject, CertificateDomains, Services, Thumbprint, NotAfter
```

Le certificat public (chez nous un wildcard) doit avoir `SMTP` dans `Services`, être valide et avoir une chaîne de
confiance complète sur le serveur. Si SMTP manque :

```powershell
Enable-ExchangeCertificate -Thumbprint <empreinte> -Services SMTP
```

Puis affectez-le explicitement au connecteur d'envoi et au connecteur de réception frontal, avec la syntaxe
`<I>Émetteur<S>Sujet` attendue par Exchange :

```powershell title="Lier le certificat aux connecteurs"
$cert = Get-ExchangeCertificate -Thumbprint <empreinte>
$tlsName = "<I>$($cert.Issuer)<S>$($cert.Subject)"
Set-SendConnector -Identity "Outbound to Office 365 - <guid>" -TlsCertificateName $tlsName
Set-ReceiveConnector -Identity "SRV-EXCH01\Default Frontend SRV-EXCH01" -TlsCertificateName $tlsName
Restart-Service MSExchangeTransport
```

## Vérifier que STARTTLS arrive vraiment jusqu'au cloud

Depuis le serveur Exchange lui-même, en session manuelle :

```cmd
telnet example-com.mail.protection.outlook.com 25
EHLO srv-exch01.example.com
```

Vous devez voir `250-STARTTLS` dans la réponse. Si la ligne manque ou est remplacée par des caractères illisibles,
un équipement entre les deux fait de l'inspection SMTP et retire la commande : désactivez l'inspection ESMTP du
pare-feu pour le flux sortant du serveur de messagerie.

:::caution
Ne confondez pas l'adresse publique NAT de votre pare-feu et l'adresse de sortie réelle de votre serveur. Si une
partie du trafic sort par un autre chemin (un SASE, un second lien), Exchange Online voit une IP que vous n'avez pas
déclarée.
:::

## Régler l'antispam et les types de domaines pour la coexistence

Notre MX pointe sur l'antispam, pas sur Exchange Online. Deux réglages ont été nécessaires pendant le débogage :

1. Côté antispam, l'option « Office 365 » proposée par défaut envoie tout le flux entrant vers Exchange Online. Tant que
   des boîtes restent sur le serveur local, il faut la désactiver et configurer le relais entrant vers le serveur local.
   La protection entrante spécifique Outlook ne se réactive qu'une fois le routage validé.
2. Côté Exchange local, les domaines acceptés passent en relais interne, pour que le serveur accepte un message destiné
   à une boîte qu'il n'héberge plus et le transmette au cloud au lieu de renvoyer un « destinataire inconnu » :

```powershell
Get-AcceptedDomain | Format-Table DomainName, DomainType
Set-AcceptedDomain -Identity "example.com" -DomainType InternalRelay
```

## Ce qui a finalement débloqué le flux

Je vous dois la vérité : après une nuit à vérifier les points ci-dessus, le connecteur de l'assistant refusait toujours
de passer. Ce qui a rétabli les deux sens, quelques jours plus tard :

1. Recréer de zéro les connecteurs par défaut du serveur local, plutôt que de corriger ceux hérités de l'ancien serveur.
2. Affecter le certificat wildcard à tous les connecteurs, sans exception.
3. Désactiver le connecteur `Outbound to Office 365` créé par l'assistant, puisque notre routage sortant passe par
   l'antispam.
4. Ajouter le MX Exchange Online du tenant en deuxième position dans les smart hosts du connecteur d'envoi Internet.

```powershell title="Configuration retenue"
Set-SendConnector -Identity "Outbound to Office 365 - <guid>" -Enabled $false
Set-SendConnector -Identity "Internet" -SmartHosts @{Add="example-com.mail.protection.outlook.com"}
Get-Queue | Format-Table Identity, Status, MessageCount
```

:::caution[Configuration de coexistence, pas configuration cible]
Exchange répartit les envois entre les smart hosts d'un connecteur, il ne les utilise pas en secours l'un de l'autre.
Cela a fonctionné chez nous parce que le connecteur entrant créé par l'assistant côté Exchange Online reconnaît le
serveur local par son certificat et accepte de relayer. Testez avant de généraliser, et considérez ce montage comme
temporaire : il a vécu le temps de migrer les boîtes.
:::

Dernier piège de la même semaine : des boîtes créées directement dans le cloud lors d'une première tentative de
migration étaient vues comme déjà provisionnées. Il a fallu effacer cette information avant une synchronisation
initiale :

```powershell title="Exchange Online PowerShell"
Connect-ExchangeOnline
$exclus = @("compte-natif@example.com", "compte-test@example.com", "admin@example.com")
Get-User -ResultSize Unlimited | Where-Object { $exclus -notcontains $_.UserPrincipalName } | ForEach-Object {
  Set-User -Identity $_.UserPrincipalName -PermanentlyClearPreviousMailboxInfo -Confirm:$false
}
```

```powershell title="Sur le serveur Entra Connect"
Start-ADSyncSyncCycle -PolicyType Initial
```

## Tester méthodiquement, avec et sans chaque règle

Le problème d'un flux hybride derrière un antispam, c'est qu'on ne sait jamais si ça vient du connecteur, du pare-feu
ou de l'antispam. La seule parade est de tester chaque combinaison, dans l'ordre, et de noter le résultat :

| Flux | Attendu | Trace à consulter |
|---|---|---|
| Local vers local | Immédiat | `Get-MessageTrackingLog` sur le serveur |
| Local vers cloud | Via le connecteur d'envoi | `Get-Queue` puis `Get-MessageTrace` |
| Cloud vers local | Via le connecteur sortant du tenant | `Get-MessageTrace` puis journaux du serveur |
| Extérieur vers cloud | Via l'antispam | Panneau antispam puis `Get-MessageTrace` |
| Extérieur vers local | Via l'antispam | Panneau antispam puis `Get-MessageTrackingLog` |

Chaque test est refait avec et sans la règle de pare-feu concernée, puis avec et sans l'option antispam en cours de
réglage. C'est long, et c'est la seule méthode qui a isolé le coupable.

:::tip
N'ouvrez un ticket chez l'éditeur de l'antispam ou chez Microsoft qu'avec le NDR complet, l'heure exacte et le
résultat de ce tableau. « Les mails ne partent pas » vous coûte deux jours d'allers-retours.
:::

## Pour aller plus loin

- Le récit complet, échecs compris :
  [Exchange hybride : la migration « clé en main » que j'ai finie à la main](/blog/exchange-hybride-la-migration-que-jai-finie-a-la-main/).
- L'étape suivante : [Migrer une boîte aux lettres de plus de 50 Go vers Exchange Online](/docs/microsoft-365/migrer-une-boite-de-plus-de-50-go-vers-exchange-online/).
- Une fois le MX chez un tiers : [SPF, DKIM et DMARC derrière une passerelle de filtrage](/docs/cybersecurite/spf-dkim-dmarc-derriere-une-passerelle-de-filtrage/).
- Documentation Microsoft : [Transport routing in Exchange hybrid deployments](https://learn.microsoft.com/exchange/transport-routing).

<!-- source : mails « Assistance pour la migration Exchange et la configuration hybride », 2025-03-13 et « Avancée hybridation », 2025-03-19 -->

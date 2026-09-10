---
title: "Mettre à niveau des contrôleurs de domaine Windows Server 2012 vers 2022 en une soirée"
description: "Dix ans de retard en trois heures : contrôles en journée, promotion des DC 2022 le soir, transfert des rôles FSMO, rétrogradation des 2012, montée du niveau fonctionnel. Dix minutes de coupure et un café."
published: 2025-01-14
category: windows-server
tags: [active-directory, windows-server-2022, migration, fsmo, entra-connect, dfsr]
level: avancé
status: à jour
featured: true
tested_on: [Windows Server 2012, Windows Server 2022, Exchange 2013]
---

Les licences Microsoft 365 venaient d'arriver et la prochaine étape s'appelait Entra Connect. Or Entra Connect,
comme Office et comme à peu près tout ce qui allait suivre, s'appuie sur un Active Directory en bonne santé. Le
mien tournait encore sur des contrôleurs de domaine Windows Server 2012, sortis du support depuis octobre 2023.
Dix ans de retard, pour être honnête. J'ai fait la mise à niveau vers 2022 en une soirée : préparation en
journée, trois heures d'opération le soir, dix minutes de coupure visible. Un collègue a râlé, un bon café a
réglé la situation.

Cette fiche décrit ce que j'ai contrôlé avant, ce que j'ai fait pendant, et ce que j'ai vérifié après. Elle ne
prétend pas remplacer la documentation Microsoft ; elle donne l'ordre des opérations et les endroits où ça
coince.

Une mise à niveau sur place de 2012 vers 2022 n'existe pas : Windows ne saute pas plus de deux versions, et
vous ne voulez de toute façon pas conserver dix ans de sédiments sur un DC. La bonne méthode est celle du
déménagement : on construit les nouveaux serveurs à côté, on transfère les rôles, puis on démolit les anciens.
On ne rénove pas une maison en continuant d'y habiter.

## Prérequis

- Deux VM Windows Server 2022 fraîches, jointes au domaine comme simples membres, adresse IP fixe, mises à jour
  installées. Deux, pas une : un domaine avec un seul DC est un domaine avec une seule panne possible.
- Un compte membre des groupes **Admins du domaine**, **Admins du schéma** et **Administrateurs de
  l'entreprise** : la promotion du premier DC 2022 exécute automatiquement `adprep`, qui étend le schéma.
- Une sauvegarde de l'état système d'un DC 2012 et une sauvegarde des VM, faites le jour même.
- L'inventaire de ce qui pointe vers les DC **par adresse IP** : options DHCP, redirecteurs DNS, clients LDAP et
  LDAPS (pare-feu, Wi-Fi, applications), sources NTP, relais SMTP. C'est cette liste qui décide de la durée de
  la coupure.
- Une vérification de compatibilité des applications qui parlent à l'annuaire. Dans mon cas, deux points
  chauds : un Exchange 2013 sur un Windows Server 2012 R2 qui ne pouvait pas être mis à niveau, et un serveur BI
  encore sous 2008.

:::caution
Exchange 2013 a continué de fonctionner avec des DC 2022 chez moi, le temps de préparer sa propre migration
vers 2019, mais la matrice de support d'Exchange ne garantit pas cette combinaison. Considérez-la comme un état
transitoire à durée limitée, pas comme une cible. Et prévenez les utilisateurs, même pour dix minutes.
:::

## En journée : contrôler la santé de l'annuaire

Rien ne se migre proprement depuis un annuaire malade. Passez ces commandes sur un DC 2012 et lisez vraiment
la sortie ; une erreur de réplication ignorée le matin devient une soirée blanche.

```powershell title="Bilan de santé avant de toucher à quoi que ce soit"
dcdiag /c /v /f:C:\Temp\dcdiag-avant.txt
repadmin /replsummary
repadmin /showrepl * /csv > C:\Temp\replication-avant.csv
Get-ADDomainController -Filter * | Select-Object Name, IPv4Address, OperatingSystem, IsGlobalCatalog
Get-ADForest | Select-Object ForestMode, SchemaMaster, DomainNamingMaster
Get-ADDomain | Select-Object DomainMode, PDCEmulator, RIDMaster, InfrastructureMaster
dfsrmig /getglobalstate
```

La dernière ligne est celle que l'on oublie. Un domaine créé il y a longtemps peut encore répliquer SYSVOL avec
FRS, et **un serveur 2019 ou 2022 refuse d'être promu tant que SYSVOL n'est pas passé sur DFSR**. Si
`dfsrmig` ne répond pas « Eliminated », faites la migration FRS vers DFSR en journée, en passant par les états
Prepared, Redirected puis Eliminated, avec `dfsrmig /setglobalstate 1`, `2` puis `3`, et en attendant que
`dfsrmig /getmigrationstate` confirme chaque étape avant la suivante. C'est sans coupure, mais ça se fait avant
la soirée, pas pendant.

Profitez de la journée pour envoyer le mail d'annonce : plage horaire, durée annoncée, ce que les gens verront
(rien, sauf peut-être une déconnexion du partage réseau). Dix minutes de coupure prévenues passent ; dix minutes
non prévenues finissent en plainte.

## Le soir, étape 1 : promouvoir les nouveaux DC 2022

Sur chaque nouveau serveur, installez le rôle et promouvez-le. Le premier prendra plus de temps : c'est lui qui
étend le schéma.

```powershell title="Sur chaque nouveau serveur 2022"
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
Install-ADDSDomainController -DomainName "example.local" `
  -InstallDns:$true `
  -SiteName "Default-First-Site-Name" `
  -Credential (Get-Credential "EXAMPLE\admin-domaine")
```

Après le redémarrage, attendez que la réplication soit complète avant de toucher au second, puis avant de passer
à l'étape suivante :

```powershell title="Forcer et vérifier la réplication"
repadmin /syncall /AdeP
repadmin /replsummary
dcdiag /test:advertising /test:dns
```

Un DC qui apparaît dans `Get-ADDomainController` mais échoue le test `advertising` n'est pas prêt à servir des
ouvertures de session : patientez plutôt que d'enchaîner.

## Étape 2 : transférer les rôles FSMO et les services annexes

Les cinq rôles de maître d'opérations passent sur le premier DC 2022 en une commande. `netdom` confirme.

```powershell title="Transférer les cinq rôles FSMO"
Move-ADDirectoryServerOperationMasterRole -Identity "dc2022-01" `
  -OperationMasterRole SchemaMaster, DomainNamingMaster, PDCEmulator, RIDMaster, InfrastructureMaster
netdom query fsmo
```

Le rôle PDC emulator emporte avec lui la responsabilité de l'heure du domaine. Déclarez le nouveau porteur comme
source fiable, sinon vos postes resteront calés sur un serveur qui va disparaître :

```powershell title="Source de temps sur le nouveau PDC"
w32tm /config /manualpeerlist:"fr.pool.ntp.org" /syncfromflags:manual /reliable:yes /update
w32tm /resync
```

Ensuite, tout ce qui figure sur votre inventaire de la journée : redirecteurs DNS sur les nouveaux DC
(`Add-DnsServerForwarder`), option 006 des étendues DHCP, adresses LDAP des équipements. Si DHCP tournait sur
les DC 2012, exportez-le (`Export-DhcpServer`) et réimportez-le sur un 2022 (`Import-DhcpServer`) avant de
rétrograder.

## Étape 3 : rétrograder les DC 2012

C'est ici que se situe la coupure. Tant que des clients ont encore un DC 2012 en DNS primaire ou des tickets
Kerberos émis par lui, ils mettront quelques minutes à se retourner vers les nouveaux. Sur chaque ancien DC :

```powershell title="Rétrograder un DC 2012"
Uninstall-ADDSDomainController -LocalAdministratorPassword (Read-Host -AsSecureString "Mot de passe admin local") -Force
```

Une rétrogradation propre nettoie les métadonnées toute seule. Vérifiez tout de même que les enregistrements
DNS de l'ancien serveur ont disparu, y compris les enregistrements de service sous `_msdcs` :

```powershell title="Traquer les restes en DNS"
Get-DnsServerResourceRecord -ZoneName "example.local" |
  Where-Object { $_.RecordData.IPv4Address -eq "192.0.2.10" }
```

:::tip
Une fois l'ancien DC sorti du domaine et éteint, rien n'interdit de donner son adresse IP au nouveau. Tous les
équipements qui pointaient en dur vers cette adresse retrouvent leur annuaire sans que vous ayez à les
reconfigurer. Après un changement d'adresse sur un DC : `ipconfig /registerdns` puis redémarrage du service
`Netlogon`, pour que les enregistrements SRV se recréent avec la bonne adresse.
:::

## Étape 4 : monter le niveau fonctionnel

Avec des DC 2022, le niveau fonctionnel le plus élevé disponible est **Windows Server 2016** : les versions 2019
et 2022 n'en ont pas introduit de nouveau. Une fois tous les DC 2012 disparus :

```powershell title="Niveau fonctionnel du domaine puis de la forêt"
Set-ADDomainMode -Identity "example.local" -DomainMode Windows2016Domain
Set-ADForestMode -Identity "example.local" -ForestMode Windows2016Forest
Get-ADDomain | Select-Object DomainMode
Get-ADForest | Select-Object ForestMode
```

:::danger
Cette étape ne se défait pas. C'est elle qui a emporté mon serveur BI sous Windows Server 2008 : plus compatible
après la montée de niveau, il a été remplacé par un nouveau serveur, ce qui était de toute façon prévu. Si vous
gardez de vieux systèmes membres du domaine, testez-les sur un domaine de maquette ou planifiez leur
remplacement avant, pas après.
:::

## Le lendemain : vérifier avant de crier victoire

| Contrôle | Commande ou action | Résultat attendu |
| --- | --- | --- |
| Réplication | `repadmin /replsummary` | zéro échec sur toutes les lignes |
| Santé globale | `dcdiag /c` | aucun test en échec |
| Localisation d'un DC | `nltest /dsgetdc:example.local` | un DC 2022, sans erreur |
| Ouverture de session | un poste utilisateur, un compte normal | session ouverte, partages accessibles |
| Stratégies de groupe | `gpupdate /force` puis `gpresult /r` | stratégies appliquées depuis un DC 2022 |
| Messagerie | envoi et réception d'un mail interne et externe | Exchange voit toujours l'annuaire |
| Journal | observateur d'événements, journal *Directory Service* et *DNS Server* | pas d'erreur récurrente |

Chez moi, le bilan de la soirée tient en trois chiffres : trois heures, dix minutes de coupure, un serveur de
plus à remplacer. Tous les serveurs étaient en 2022 le lendemain, à l'exception d'Exchange et de la BI, qui
avaient chacun leur propre chantier. Entra Connect a pu s'installer la semaine suivante sur un annuaire
enfin à jour.

## Pour aller plus loin

- Ce qu'un DC doit porter, et surtout ce qu'il ne doit pas porter :
  [Tier 0 : contrôleurs de domaine et VM IAM](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/).
- Le certificat LDAPS des nouveaux DC, souvent à refaire après une migration :
  [LDAPS : réparer un certificat CAPI vers CNG SHA-256](/docs/windows-server/ldaps-reparer-un-certificat-capi-vers-cng-sha256/).
- Le rôle central des DC au redémarrage de l'infrastructure :
  [Runbook : redémarrer une infrastructure virtualisée après une coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/).

<!-- source : mail « heures de travail hier », 2025-01-14 -->

---
title: "Remettre les contrôleurs de domaine en Tier 0 et isoler les rôles annexes dans une VM « IAM »"
description: "Un DC ne fait que AD DS et DNS. Inventorier ce qui s'est accumulé sur vos DC, le déplacer dans une VM dédiée sous gMSA, les reconstruire en UEFI, et lire un scan de posture à 0/100 comme une feuille de route."
published: 2026-05-30
updated: 2026-06-02
category: architecture
tags: [tier-0, active-directory, gmsa, windows-server-2025, durcissement, posture]
level: expert
status: à jour
featured: true
tested_on: [Windows Server 2022, Windows Server 2025, VMware VxRail 8.0.380]
---

Un contrôleur de domaine, c'est comme le tiroir fourre-tout de la cuisine. Au départ il ne contient que les
couverts ; dix ans plus tard on y trouve les piles, le scotch et la notice du four. Sur mes deux DC, le tiroir
contenait le Directory Connector de Bitwarden, le connecteur Intune, un SSO, WSUS, le serveur d'impression, des
partages de fichiers, le DHCP et Entra Connect. Chacun installé un jour où le DC était « le serveur qui est
toujours allumé ». Le problème, c'est la surface : chaque service, chaque compte technique,
chaque port en écoute est une porte de plus vers l'objet qui détient toutes les identités de l'entreprise. Qui
administre le serveur d'impression administre l'annuaire.

Le rapport de maintenance serveurs que j'ai remis à la direction en mai 2026 fixe une règle empruntée au modèle
d'administration par niveaux de Microsoft : **un DC n'exécute que AD DS et DNS**. Tout le reste part dans une VM
dédiée, baptisée IAM, elle-même traitée comme du Tier 0 parce qu'elle héberge les connecteurs qui lisent et
écrivent l'annuaire. Trois jours plus tard, l'assureur cyber m'envoyait son rapport de posture : surface externe
100/100, Active Directory 0/100 sur 43 contrôles. Ce n'est pas une honte, c'est une feuille de route.

## Prérequis

- Windows Server 2025 disponible (licences et média) et un hyperviseur qui sait créer des VM en EFI avec vTPM ;
  ici VMware VxRail 8.0.380, dont la mise à niveau LCM était le lot zéro avant toute montée d'OS invité.
- Des sauvegardes testées : état système des DC, GPO, zones DNS, étendues DHCP.
- Un bastion, ou au minimum un poste d'administration dédié, seul autorisé en RDP et WinRM vers le Tier 0.
- L'inventaire de vos serveurs applicatifs anciens (chez moi, GPAO et GED sur Windows Server 2008 / 2008 R2) :
  ils bloqueront certains durcissements globaux.
- Du temps. Comptez en semaines, un rôle par fenêtre de maintenance.

## Inventorier ce qui tourne réellement sur chaque DC

On ne déplace pas ce qu'on ne voit pas. Sur chaque contrôleur, listez les services qui tournent sous un compte
nommé, les tâches planifiées hors Microsoft, et surtout les ports en écoute avec le processus propriétaire.

```powershell title="Inventaire sur chaque contrôleur de domaine"
Get-CimInstance Win32_Service |
  Where-Object { $_.StartName -notmatch 'LocalSystem|LocalService|NetworkService' } |
  Select-Object Name, StartName, State
Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\Microsoft\*' -and $_.State -ne 'Disabled' } |
  Select-Object TaskName, TaskPath, @{ n = 'RunAs'; e = { $_.Principal.UserId } }
Get-NetTCPConnection -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess | Sort-Object LocalPort
netstat -abno
```

Un DC légitime écoute sur 53, 88, 135, 389, 445, 464, 636, 3268, 3269, la plage RPC dynamique, et 123 sur
l'émulateur PDC. Tout port en dehors de cette liste appartient à un rôle qui n'a rien à faire là. Photographiez ensuite
l'état de l'annuaire, pour comparer à la fin.

```powershell title="Preuves avant travaux"
dcdiag /v /c /e > C:\Temp\dcdiag-avant.txt
repadmin /replsummary
repadmin /showrepl
```

## Sauvegarder avant de déplacer quoi que ce soit

```powershell title="Filet de sécurité"
wbadmin start systemstatebackup -backupTarget:E:
Backup-GPO -All -Path "E:\Backup\GPO"
Export-DnsServerZone -Name "ad.example.com" -FileName "ad.example.com.bak"
Export-DhcpServer -File "E:\Backup\dhcp.xml" -Leases
```

La cible de `wbadmin` doit être un volume distinct du disque système. Dix minutes, à ne jamais sauter.

## Créer la VM IAM

Une VM Windows Server 2025, firmware EFI, Secure Boot, vTPM, avec VBS et Credential Guard activés. Serveur
membre, jamais promu DC. Vérifiez avant d'y installer quoi que ce soit :

```powershell title="Contrôles sur la VM IAM"
Confirm-SecureBootUEFI
Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard |
  Select-Object SecurityServicesRunning, VirtualizationBasedSecurityStatus
```

:::caution
Une VM créée en BIOS ne passe pas en EFI en cochant une case. `Confirm-SecureBootUEFI` renvoie une erreur, VBS
refuse de démarrer, et la seule issue est de recréer la VM en EFI avec des VMware Tools à jour. C'est pour cela que
mon DC1 sera reconstruit, pas mis à niveau.
:::

## Migrer les rôles un par un, sous gMSA

Commencez par ce qui touche le moins à l'identité (impression, WSUS), puis DHCP et fichiers, et gardez les
connecteurs pour la fin : Directory Connector Bitwarden, connecteur Intune, SSO, Entra Connect. Chaque service
qui le supporte tourne sous un compte de service géré de groupe (gMSA) : un mot de passe de 240 octets, généré
et renouvelé par l'AD, jamais connu d'un humain.

```powershell title="Créer et installer un gMSA"
Add-KdsRootKey -EffectiveImmediately   # une fois par forêt ; effet réel après réplication
New-ADServiceAccount -Name gmsa-wsus -DNSHostName gmsa-wsus.ad.example.com `
  -PrincipalsAllowedToRetrieveManagedPassword "IAM01$"
Install-ADServiceAccount gmsa-wsus      # sur la VM IAM
Test-ADServiceAccount gmsa-wsus
```

Le service est ensuite configuré pour s'exécuter sous `AD\gmsa-wsus$` avec un mot de passe vide. Pour le DHCP,
`Import-DhcpServer` recharge l'export fait plus haut sur la VM IAM ; il reste à autoriser le nouveau serveur
dans l'AD, à modifier le relais DHCP sur le cœur de réseau, puis à retirer l'ancien.

En parallèle, videz Domain Admins de tout ce qui n'est pas un humain : aucun compte technique n'y a de place
permanente. Un compte de service qui « a besoin » d'être Domain Admin a besoin d'une délégation précise, pas d'un
badge d'accès à tout.

## Verrouiller la VM IAM et les DC

Tout trafic entrant est bloqué par défaut ; seuls les ports du rôle sont ouverts. RDP et WinRM ne sont acceptés
que depuis le bastion. Faites-le par GPO, une par rôle, en mode audit d'abord : la fiche dédiée en fin d'article
détaille la méthode et la liste des ports, plage RPC dynamique comprise. L'oublier casse la réplication.

## Reconstruire les DC en UEFI et éteindre les anciens

DC1 tournait en Windows Server 2022 sur une VM en BIOS : Secure Boot impossible, donc pas de mise à niveau sur
place. On promeut un nouveau DC Windows Server 2025 en EFI, on lui transfère les rôles FSMO, on rétrograde
l'ancien, on le supprime. DC2, déjà en UEFI et Secure Boot, peut être mis à niveau. L'ancien DC Windows Server
2012, lui, est éteint définitivement, après avoir vérifié qu'il n'apparaît plus dans `repadmin /showrepl` ni
dans Sites et services.

:::danger
Si un serveur Exchange hybride vit encore dans le domaine, ne supprimez jamais ses objets à la main dans l'AD
pendant ces travaux, même s'ils semblent orphelins. Le décommissionnement d'Exchange suit sa propre procédure ;
un objet effacé dans ADSI Edit se paie en incohérences côté tenant.
:::

Rejouez `dcdiag /v /c /e` et `repadmin /replsummary` en fin de chantier et comparez avec la photo du début.

## Lire le scan de posture comme une feuille de route

Le script d'audit de l'assureur passe 43 contrôles, dans l'esprit de PingCastle. Résultat chez moi : 12
findings élevés, 5 moyens, 17 règles mal configurées, 0/100. Regroupés par chantier, ça tient dans un tableau.

| Contrôles remontés | Chantier |
| --- | --- |
| A-AuditDC, A-NoServicePolicy | Audit avancé sur les DC, journalisation PowerShell (Script Block, Module), collecte SIEM |
| P-ServiceDomainAdmin, P-AdminLogin, P-AdminPwdTooOld, A-MinPwdLen | LAPS pour les admins locaux, gMSA, comptes admin dédiés, politique de mots de passe |
| P-ProtectedUsers, A-Krbtgt, P-Delegated, P-SchemaAdmin, P-RODCDeniedGroup | Protected Users pour les admins, rotation krbtgt (deux fois, espacées), revue des groupes à privilèges |
| P-Kerberoasting, P-UnconstrainedDelegation | SPN retirés des comptes à privilèges, délégation contrainte basée sur les ressources |
| S-OldNtlm, S-DesEnabled, A-DC-Coerce, A-NoNetSessionHardening | NTLMv1 et DES désactivés, Kerberos Armoring (FAST), durcissement des sessions réseau |
| S-ADRegistration | `ms-DS-MachineAccountQuota` à 0 |
| A-CertTempAgent | AD CS : modèles, LDAPS, SHA-256 |
| S-OS-2008, S-OS-XP, S-PwdLastSet-45, P-LogonDenied, S-DC-SubnetMissing | Nettoyage des objets obsolètes, sous-réseaux déclarés dans Sites et services |
| S-WSUS-HTTP | WSUS en HTTPS, ou remplacement par Azure Update Manager / Windows Update for Business |

Pour commencer :

```powershell title="Premiers correctifs et premières listes"
Set-ADDomain -Identity ad.example.com -Replace @{ "ms-DS-MachineAccountQuota" = "0" }
Get-ADUser -Filter { ServicePrincipalName -like "*" } -Properties ServicePrincipalName, MemberOf
Get-ADComputer -Filter { TrustedForDelegation -eq $true }
Get-ADUser -Filter * -Properties PasswordLastSet, LastLogonDate |
  Where-Object { $_.LastLogonDate -lt (Get-Date).AddDays(-90) }
```

Deux pièges. Le scan AD est un script que l'on lance à la main ; le mien n'avait pas été rejoué depuis avril
2025 alors que la surface externe est scannée en continu. Rejouez-le après chaque chantier. Et les serveurs applicatifs en 2008 empêchent de désactiver NTLM d'un coup pour tout le
domaine : passez par le mode audit de la stratégie « Restreindre NTLM », serveur par serveur, avant de bloquer.

## Pour aller plus loin

- La méthode audit puis application pour le pare-feu de chaque rôle :
  [Pare-feu Windows par rôle via GPO](/docs/windows-server/pare-feu-windows-par-role-via-gpo-audit-puis-application/).
- Ce qui arrive quand un DC auto-enrôle ses certificats sans surveillance :
  [Réparer l'authentification LDAPS d'un contrôleur de domaine](/docs/windows-server/ldaps-reparer-un-certificat-capi-vers-cng-sha256/).
- Le modèle d'accès d'entreprise de Microsoft, dont le Tier 0 est l'héritier :
  [Enterprise access model](https://learn.microsoft.com/fr-fr/security/privileged-access-workstations/privileged-access-access-model) (Microsoft Learn).

<!-- source : rapport « maintenance et mise à niveau serveurs 2025 v2 », 2026-05-29 ; mail « Rapport de posture mai 2026 », 2026-06-01 -->

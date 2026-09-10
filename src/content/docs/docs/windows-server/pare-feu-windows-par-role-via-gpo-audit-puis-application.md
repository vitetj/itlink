---
title: "Pare-feu Windows par rôle via GPO : inventaire PowerShell, mode audit, puis application"
description: "Remettre le pare-feu Windows sur des serveurs où il était désactivé ou hétérogène, sans couper l'AD : inventaire, sauvegarde, une GPO par rôle, journalisation en mode audit, puis blocage par défaut."
published: 2026-06-02
category: windows-server
tags: [pare-feu, gpo, active-directory, durcissement, powershell, tier-0]
level: avancé
status: à jour
featured: false
tested_on: [Windows Server 2022, Windows Server 2025]
---

Sur un parc de serveurs qui a grandi pendant quinze ans, le pare-feu Windows finit dans un état hétérogène :
désactivé sur les uns « parce que ça bloquait un truc en 2014 », en règles par défaut sur les autres, avec
quelques exceptions ajoutées à la main que personne ne sait plus justifier. Un audit de posture AD le relève
sans pitié. Et il a raison : un pare-feu coupé sur un contrôleur de domaine, c'est un déplacement latéral gratuit
pour quiconque a mis un pied sur le réseau.

Le piège est symétrique. Activer le pare-feu en mode bloquant d'un coup sur un DC, c'est couper la réplication,
la gestion à distance et, dans le meilleur des cas, l'ouverture de session des clients le lendemain matin. La
méthode décrite ici, issue du rapport de maintenance serveurs de ma boîte, procède comme un serrurier sensé :
d'abord on note qui passe par quelle porte pendant une semaine, ensuite on taille les clés. Une GPO par rôle
(DC/DNS, VM IAM, fichiers, applicatifs), un mode audit qui journalise sans bloquer, puis le passage en blocage
par défaut.

## Prérequis

- Les droits de création et de liaison de GPO sur les OU des serveurs.
- Un accès WinRM ou une session locale sur chaque serveur pour l'inventaire.
- Une OU par rôle, ou au moins des groupes de sécurité pour filtrer les GPO.
- Un bastion (ou un poste d'administration identifié) depuis lequel RDP et WinRM resteront autorisés.

## Inventorier l'état actuel de chaque serveur

Avant de décider quoi que ce soit, il faut savoir d'où l'on part : quels profils sont actifs, quelle est l'action
par défaut, quelles règles existent, et surtout quels ports sont réellement en écoute.

```powershell title="État des profils et des règles"
Get-NetFirewallProfile |
  Format-Table Name, Enabled, DefaultInboundAction, DefaultOutboundAction, LogAllowed, LogBlocked
Get-NetFirewallRule -Enabled True | Get-NetFirewallPortFilter | Format-Table -AutoSize
Get-NetFirewallRule -Enabled True | Get-NetFirewallApplicationFilter | Format-Table -AutoSize
Get-NetFirewallRule | Export-Csv -Path "C:\Temp\fw-rules-$env:COMPUTERNAME.csv" -NoTypeInformation
```

```powershell title="Ports en écoute et processus propriétaires"
Get-NetTCPConnection -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess,
    @{ n = 'Process'; e = { (Get-Process -Id $_.OwningProcess).ProcessName } } |
  Sort-Object LocalPort
netstat -abno
```

Sur une dizaine de serveurs, enveloppez le tout dans `Invoke-Command -ComputerName (Get-Content servers.txt)` et
centralisez les CSV. Cet inventaire est la matière première des règles : chaque port en écoute doit se retrouver
soit dans une règle de la GPO, soit dans la liste de ce que vous décidez de fermer, en connaissance de cause.

## Sauvegarder la configuration locale

Une GPO écrase la configuration locale. Avant de lier quoi que ce soit, exportez l'état du pare-feu de chaque
serveur ; c'est votre bouton « retour arrière » :

```powershell
netsh advfirewall export "C:\Temp\fw-$env:COMPUTERNAME.wfw"
```

Le fichier `.wfw` se réimporte avec `netsh advfirewall import`. Rangez-le hors du serveur.

## Concevoir une GPO par rôle

Une GPO par rôle plutôt qu'une GPO globale, parce qu'un serveur de fichiers et un contrôleur de domaine n'ont
pas la même surface, et parce qu'une règle « pour faire simple » ouverte partout finit toujours par servir à
quelqu'un d'autre. Les règles vivent dans *Configuration ordinateur → Stratégies → Paramètres Windows → Paramètres
de sécurité → Pare-feu Windows Defender avec fonctions avancées de sécurité*.

Pour un contrôleur de domaine qui porte aussi le DNS, les règles entrantes minimales :

| Service | Port(s) | Remarque |
| --- | --- | --- |
| DNS | 53 TCP et UDP | |
| Kerberos | 88 TCP et UDP | |
| Changement de mot de passe Kerberos | 464 TCP et UDP | |
| LDAP | 389 TCP et UDP | l'UDP sert au *CLDAP ping* de localisation des DC |
| LDAPS | 636 TCP | |
| Catalogue global | 3268 et 3269 TCP | |
| SMB (SYSVOL, NETLOGON) | 445 TCP | |
| RPC Endpoint Mapper | 135 TCP | |
| RPC dynamique | 49152-65535 TCP | réplication AD, gestion à distance |
| NTP | 123 UDP | si le DC est émulateur PDC |
| RDP / WinRM | 3389, 5985-5986 TCP | **uniquement** depuis le bastion, avec l'adresse source restreinte |

:::danger
La plage RPC dynamique est celle que tout le monde oublie. Sans elle, la réplication AD, les consoles
d'administration distantes et une partie de la gestion des GPO tombent en panne, avec des symptômes qui n'ont
l'air d'avoir aucun rapport avec le pare-feu. Elle va de pair avec le 135 : l'Endpoint Mapper indique au client
sur quel port dynamique se connecter.
:::

Déclinez ensuite le principe pour les autres rôles : la VM IAM (WSUS, impression, DHCP, connecteurs) n'a pas
besoin du 88 ni du 389 en entrée ; un serveur de fichiers a besoin du 445 et de peu d'autre chose ; un serveur
applicatif ouvre le port de son application et c'est tout. Nommez les GPO de façon explicite (`FW-Role-DC`,
`FW-Role-IAM`, `FW-Role-Fichiers`) et liez chacune à l'OU correspondante.

## Phase 1 : le mode audit

C'est l'étape qui vous évite de couper le domaine. Dans chaque GPO, pour les trois profils :

- profil **activé** ;
- connexions entrantes par défaut : **Autoriser** ;
- journalisation des connexions **bloquées et autorisées** activée, avec un fichier de journal agrandi.

L'équivalent local, pratique pour valider sur un serveur de test avant la GPO :

```powershell title="Réglage équivalent en local"
Set-NetFirewallProfile -All -Enabled True -DefaultInboundAction Allow `
  -LogBlocked True -LogAllowed True -LogMaxSizeKilobytes 32767 `
  -LogFileName "%systemroot%\system32\LogFiles\Firewall\pfirewall.log"
```

Puis liez la GPO et laissez tourner plusieurs jours, en couvrant au moins une nuit de sauvegardes et un lundi
matin. Comme l'action par défaut est « Autoriser », le journal contient surtout des lignes `ALLOW` : c'est
voulu. Ce qui vous intéresse, c'est la liste réelle des ports qui reçoivent du trafic, et depuis quelles adresses.

```powershell title="Dépouiller pfirewall.log"
$header = 'date','time','action','protocol','src-ip','dst-ip','src-port','dst-port','size',
          'tcpflags','tcpsyn','tcpack','tcpwin','icmptype','icmpcode','info','path'
Get-Content "$env:SystemRoot\System32\LogFiles\Firewall\pfirewall.log" |
  Where-Object { $_ -notmatch '^#' } |
  ConvertFrom-Csv -Delimiter ' ' -Header $header |
  Where-Object { $_.path -eq 'RECEIVE' } |
  Group-Object protocol, 'dst-port' |
  Sort-Object Count -Descending |
  Select-Object Count, Name -First 30
```

Comparez le résultat avec votre tableau de règles. Tout port présent dans le journal et absent des règles est
soit une règle manquante, soit un flux à supprimer. Décidez pour chacun, par écrit. Sur un DC, on découvre
typiquement une supervision qui interroge WMI, un outil de sauvegarde, ou une vieille application qui parle
encore au DC en LDAP simple sur le 389.

:::tip
Filtrez sur `src-ip` pour retrouver *qui* utilise un port surprenant. Neuf fois sur dix, c'est un serveur qu'on
avait oublié, et la règle qu'il faut ajouter est une règle à adresse source restreinte, pas une ouverture à tout
le réseau.
:::

## Phase 2 : l'application

Quand plusieurs jours de journal n'ont rien révélé de nouveau, passez la GPO en mode bloquant : connexions
entrantes par défaut sur **Bloquer**, journalisation conservée. Faites-le rôle par rôle, en commençant par le
moins critique, et sur un seul DC avant le second. Puis, sur chaque serveur concerné :

```powershell title="Contrôle après application"
gpupdate /force
gpresult /h C:\Temp\gpresult.html
Get-NetFirewallProfile | Format-Table Name, Enabled, DefaultInboundAction
```

Et depuis un client et depuis l'autre DC, testez les flux qui comptent :

```powershell
Test-NetConnection -ComputerName srv-dc01 -Port 636
Test-NetConnection -ComputerName srv-dc01 -Port 88
repadmin /replsummary
dcdiag /test:replications
```

Si un flux manque, le journal le dit tout de suite : les lignes `DROP` apparaissent avec le port et l'adresse
source. Ajoutez la règle dans la GPO, pas en local, sinon elle disparaîtra à la prochaine actualisation. Et si
tout part en vrille, le retour arrière tient en deux gestes : retirer le lien de la GPO, puis `gpupdate /force`
(ou `netsh advfirewall import` du fichier `.wfw` sauvegardé).

:::caution
Deux erreurs coûtent cher. Appliquer directement le mode bloquant sur un contrôleur de domaine sans phase
d'audit : les clients ne s'authentifient plus et vous découvrez la plage RPC à chaud. Oublier l'exception
bastion pour RDP et WinRM : le serveur est protégé, y compris contre vous, et il faut passer par la console de
l'hyperviseur pour corriger.
:::

## Garder le résultat propre

Une fois le mode bloquant en place, la configuration locale ne doit plus servir. Dans chaque GPO, l'option
« Appliquer les règles de pare-feu locales » peut être passée à *Non* pour que seules les règles de la stratégie
comptent : plus d'exception ajoutée à la main un soir de panne et oubliée. Gardez l'inventaire initial et le
dépouillement du journal avec la GPO : au prochain audit, vous pourrez justifier chaque port ouvert, ce qui est
exactement ce que l'auditeur demande.

## Pour aller plus loin

- Sortir des DC tout ce qui n'est pas AD DS et DNS, ce qui réduit d'autant la liste des ports à ouvrir :
  [Tier 0 : contrôleurs de domaine et VM IAM](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/).
- Le port 636 ouvert ne sert à rien si le certificat présenté est mauvais :
  [Réparer l'authentification LDAPS d'un contrôleur de domaine](/docs/windows-server/ldaps-reparer-un-certificat-capi-vers-cng-sha256/).
- La liste complète des ports AD, y compris les approbations et les cas particuliers :
  [How to configure a firewall for Active Directory domains and trusts](https://learn.microsoft.com/fr-fr/troubleshoot/windows-server/active-directory/config-firewall-for-ad-domains-and-trusts)
  (Microsoft Learn).

<!-- source : rapport « maintenance et mise à niveau serveurs 2025 v2 », 2026-05-29 -->

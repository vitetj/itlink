---
title: Auditer et verrouiller les imprimantes partagées avec PowerShell
description: Lister les files d'impression d'un serveur Windows, repérer celles qui sont en erreur et restreindre qui peut administrer une imprimante, sans ouvrir une seule console graphique.
published: 2024-09-09
updated: 2025-03-12
category: windows-server
tags: [powershell, impression, windows-server, sddl]
level: intermédiaire
status: à jour
featured: true
tested_on: [Windows Server 2019, Windows Server 2022, PowerShell 5.1]
---

Un serveur d'impression, c'est le service que tout le monde oublie jusqu'au lundi matin où « rien ne sort ».
Deux commandes suffisent pour savoir où on en est et pour éviter qu'un utilisateur trop curieux ne modifie le port
d'une imprimante de production.

## Lister les imprimantes et leur état

Le module `PrintManagement` est présent par défaut sur Windows Server. Depuis une session PowerShell élevée sur le
serveur d'impression :

```powershell title="Inventaire rapide"
Get-Printer | Format-Table Name, ShareName, PrinterStatus, DriverName -AutoSize
```

`PrinterStatus` vaut `Normal` quand tout va bien. Les valeurs à surveiller sont `Error`, `Offline`, `PaperOut` et
`TonerLow`. Pour ne garder que les files en souffrance :

```powershell
Get-Printer | Where-Object PrinterStatus -ne 'Normal' |
  Select-Object Name, PrinterStatus, PortName
```

:::tip
Ajoutez `-ComputerName SRV-PRINT01` pour interroger un serveur distant sans ouvrir de session dessus. Le
port WinRM (5985) doit être ouvert entre les deux machines.
:::

## Voir les travaux bloqués

Une imprimante `Normal` avec vingt travaux en attente est en réalité en panne. On regarde la file :

```powershell
Get-PrintJob -PrinterName 'ATELIER-ETIQUETTES' |
  Select-Object Id, UserName, JobStatus, SubmittedTime
```

Pour purger un travail qui bloque tout le monde :

```powershell
Remove-PrintJob -PrinterName 'ATELIER-ETIQUETTES' -ID 42
```

## Restreindre qui peut administrer une imprimante

Par défaut, le groupe `Tout le monde` peut imprimer et, sur certaines installations héritées, gérer les documents.
Les permissions d'une imprimante s'expriment en SDDL (Security Descriptor Definition Language), le même langage que
pour les services Windows. Ce descripteur ne laisse imprimer et administrer que `SYSTEM` et `Administrateurs` :

```powershell title="Verrouiller une imprimante"
Set-Printer -Name 'ATELIER-ETIQUETTES' `
  -PermissionSDDL 'O:BAG:SYD:(A;;LCSWGRPWPDTLOCRSDRC;;;SY)(A;;LCSWGRPWPDTLOCRSDRC;;;BA)'
```

Lecture rapide du descripteur :

| Segment | Signification |
| --- | --- |
| `O:BA` | propriétaire : Administrateurs intégrés |
| `G:SY` | groupe principal : SYSTEM |
| `(A;;…;;;SY)` | ACE d'autorisation pour SYSTEM |
| `(A;;…;;;BA)` | ACE d'autorisation pour Administrateurs |
| `LCSWGRPWPDTLOCRSDRC` | droits combinés : imprimer, gérer l'imprimante, gérer les documents |

:::caution
Après ce verrouillage, **personne d'autre ne peut imprimer**. Ajoutez une ACE pour le groupe qui doit utiliser
l'imprimante, par exemple `(A;;SWRC;;;S-1-5-21-…-1234)` avec le SID du groupe AD « Atelier ». `SW` correspond au
droit d'imprimer, `RC` à la lecture des permissions.
:::

Pour récupérer le SDDL actuel avant de le modifier, et le garder dans un coin :

```powershell
(Get-Printer -Name 'ATELIER-ETIQUETTES' -Full).PermissionSDDL | Set-Content .\atelier-etiquettes.sddl
```

## Aller plus loin

- Faire tourner l'inventaire chaque matin dans une tâche planifiée et envoyer le résultat par mail : voir
  [Automatisation / scripting](/docs/automatisation/).
- Sur les sites distants, une imprimante d'étiquettes qui « perd son ruban » est souvent un problème de pilote plutôt
  que de réseau ; le journal `Microsoft-Windows-PrintService/Operational` le dit avant l'opérateur.

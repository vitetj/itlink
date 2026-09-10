---
title: "Identifier le processus derrière une connexion sortante suspecte"
description: "Le SOC signale un flux sortant vers une adresse inconnue depuis un poste ou un PC industriel. Comment relier cette connexion à un processus précis avec netstat, PowerShell et le Moniteur de ressources, avant d'agir."
published: 2026-02-26
category: cybersecurite
tags: [windows, netstat, soc, incident, powershell, ot]
level: débutant
status: à jour
featured: false
tested_on: [Windows, PC industriel (IPC)]
sidebar:
  label: "Identifier le processus derrière une…"
---

Fin février 2026, le SOC m'a remonté une suspicion de compromission sur un PC industriel : un flux sortant
régulier vers une adresse publique que personne ne connaissait. L'alerte donne l'adresse distante et l'heure. Elle
ne donne pas le coupable. Entre « ce poste parle à une adresse inconnue » et « ce poste est compromis », il y a
une étape que beaucoup sautent : relier la connexion à un **processus**.

Cette étape prend deux minutes, elle se fait avec des outils déjà présents sur toutes les machines Windows, et
elle change complètement la suite. Neuf fois sur dix, on découvre un agent de télémétrie, un logiciel constructeur
bavard ou une mise à jour automatique. La dixième fois, on est content d'avoir regardé.

## Comprendre ce qu'on cherche

Une connexion réseau, c'est quatre informations : une adresse locale, un port local, une adresse distante, un port
distant. Windows y ajoute une cinquième, la seule qui nous intéresse ici : le **PID**, l'identifiant du processus
qui a ouvert la connexion. C'est le numéro de dossier du programme dans le système. Une fois qu'on l'a, on remonte
au nom du programme, puis à son chemin sur le disque, puis à sa ligne de commande.

Le raisonnement est toujours le même : adresse distante suspecte → PID → nom du processus → chemin du binaire →
verdict.

## Prérequis

- Une session sur le poste concerné, ou un accès distant qui ne coupe pas si vous isolez la machine.
- **Une invite de commandes ou un PowerShell lancé en administrateur.** Sans élévation, certains processus système
  n'apparaissent pas et vous conclurez à tort qu'il n'y a rien.
- L'adresse distante fournie par l'alerte.
- Sur une machine de production : l'accord du responsable de la ligne avant tout arrêt de processus. On regarde
  d'abord, on décide ensuite, et pas tout seul.

## Trouver le PID avec netstat

La commande historique reste la plus rapide, y compris sur les vieilles machines d'atelier où PowerShell est
absent ou bridé :

```bat title="Invite de commandes, en administrateur"
netstat -ano | find "203.0.113"
```

- `-a` affiche toutes les connexions et les ports en écoute ;
- `-n` garde les adresses et les ports en numérique, sans résolution DNS — plus rapide, et ça évite de lancer des
  requêtes DNS vers l'infrastructure de l'attaquant ;
- `-o` ajoute la colonne PID. C'est celle qui nous intéresse.

:::tip
Filtrez sur un **préfixe** d'adresse (les deux ou trois premiers octets), pas sur l'adresse complète et surtout pas
sur un couple adresse:port. Le port source change à chaque connexion, et l'adresse distante appartient souvent à
une plage entière. `find "203.0.113"` attrape toute la plage ; `find "203.0.113.45:443"` n'attrape presque rien.
:::

La dernière colonne du résultat est le PID. Notez-le.

Variante utile quand vous voulez le nom du programme directement :

```bat
netstat -anob | more
```

`-b` affiche l'exécutable associé à chaque connexion. C'est pratique, mais nettement plus lent et cela **exige**
l'élévation. Sur un poste chargé, préférez `-ano` puis une résolution ciblée du PID.

## Remonter au programme

Une fois le PID en main :

```bat
tasklist /FI "PID eq 4812"
```

Vous obtenez le nom de l'image et la mémoire consommée. Le Gestionnaire des tâches donne la même chose : onglet
**Détails**, colonne **PID** (si elle n'est pas affichée, clic droit sur l'en-tête, *Sélectionner des colonnes*).

Un nom de processus ne suffit pas à conclure. `svchost.exe`, `rundll32.exe` ou un nom qui ressemble à un composant
Windows sont exactement ce qu'un logiciel malveillant essaie d'emprunter. Ce qui tranche, c'est le **chemin** et la
**ligne de commande**.

## Faire la même chose en PowerShell, en plus lisible

Sur un poste récent, PowerShell donne le même résultat avec le chemin et la ligne de commande, en une passe :

```powershell title="PowerShell, en administrateur"
# 1. Les connexions vers la plage signalée par le SOC
Get-NetTCPConnection |
  Where-Object { $_.RemoteAddress -like "203.0.113.*" } |
  Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess

# 2. Le processus derrière le PID retourné
Get-Process -Id 4812 | Select-Object Id, ProcessName, Path, Company, Description

# 3. La ligne de commande complète, souvent la plus parlante
Get-CimInstance Win32_Process -Filter "ProcessId = 4812" |
  Select-Object ProcessId, Name, ExecutablePath, CommandLine
```

Une version qui fait tout d'un coup, à garder sous le coude :

```powershell
Get-NetTCPConnection -State Established |
  Where-Object { $_.RemoteAddress -like "203.0.113.*" } |
  ForEach-Object {
    $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      Distant = "$($_.RemoteAddress):$($_.RemotePort)"
      PID     = $_.OwningProcess
      Process = $p.ProcessName
      Chemin  = $p.Path
    }
  } | Format-Table -AutoSize
```

:::note
`Get-NetTCPConnection` ne montre que le TCP. Pour un flux UDP, utilisez `Get-NetUDPEndpoint` (qui expose aussi
`OwningProcess`) ou revenez à `netstat -ano`, qui liste les deux protocoles.
:::

## Voir le trafic en direct avec le Moniteur de ressources

Quand la connexion est intermittente, une capture ponctuelle passe à côté. Le Moniteur de ressources, livré avec
Windows, affiche le trafic en continu :

```bat
resmon
```

Onglet **Réseau**, puis les sections **Processus avec activité réseau** (le débit par processus, en temps réel) et
**Connexions TCP** (adresse distante, port, PID, pertes). On peut cocher un processus pour ne suivre que lui. Pour
un utilisateur non technique à qui vous demandez de regarder pendant que vous êtes au téléphone, c'est l'outil le
plus simple à décrire.

## Décider, sans casser la production

Vous avez maintenant un nom, un chemin et une ligne de commande. Le tri est presque toujours le même :

| Ce que vous voyez | Interprétation la plus fréquente | Réflexe |
| --- | --- | --- |
| Un binaire dans `Program Files`, éditeur connu, signé | Agent de télémétrie, mise à jour, licence flottante | Documenter le flux, l'autoriser explicitement s'il est légitime |
| Un binaire dans un profil utilisateur, `AppData` ou `Temp` | Anormal sur un poste industriel | Isoler, prélever, escalader au SOC |
| Un nom système avec un chemin inhabituel | Usurpation probable | Isoler, ne rien supprimer, escalader |
| Aucun processus (connexion en `TIME_WAIT`) | Connexion déjà fermée | Recommencer la capture plus tard, ou passer par le pare-feu |

:::caution
Sur un PC industriel qui pilote une ligne, **ne tuez rien sans validation du responsable de production**. Un
`taskkill` sur le mauvais PID arrête une machine, parfois au milieu d'un cycle. L'isolation réseau — par l'EDR ou
en débranchant le câble — arrête l'hémorragie sans arrêter la ligne, et vous laisse le temps de décider
proprement.
:::

Et si le poste est isolé par l'EDR avant même votre diagnostic, la marche à suivre est un peu différente : voir la
fiche dédiée plus bas.

## Conserver la trace

Trois lignes suffisent, mais elles doivent exister : l'horodatage, la sortie brute de `netstat -ano` ou de la
requête PowerShell, et le chemin du binaire incriminé. Redirigez la sortie dans un fichier plutôt que de faire une
capture d'écran :

```bat
netstat -ano > %USERPROFILE%\Desktop\netstat-poste.txt
```

C'est ce fichier que le SOC vous demandera, et c'est lui qui fera la différence entre « on pense que » et « on a
vu ». Un mail de synthèse au SOC et au responsable de la ligne clôt l'épisode : ce que vous avez trouvé, ce que
vous avez fait, ce qui reste ouvert.

## Pour aller plus loin

- [Un poste isolé par l'EDR : que faire, dans quel ordre](/docs/cybersecurite/poste-isole-par-l-edr-que-faire/) : la suite logique quand l'isolation arrive avant le diagnostic.
- [Segmenter les réseaux des machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/) : la vraie parade, pour qu'un IPC n'ait tout simplement pas de route vers Internet.
- [Windows XP sur une ligne de production](/blog/windows-xp-sur-une-ligne-de-production/) : pourquoi ces alertes tombent presque toujours sur les mêmes machines.

<!-- source : fil « Cyber SOC - Suspicion de compromission IPC », 24/02/2026 -->

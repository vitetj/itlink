---
title: "Versionner des programmes machine : synchroniser un partage SMB vers un dépôt Git avec un pipeline GitLab CI"
description: "Un runner, un script PowerShell et un pipeline planifié qui commite chaque nuit le contenu d'un partage SMB dans un dépôt Git. Un historique gratuit des programmes machine, sans changer les habitudes de l'atelier."
published: 2025-09-25
updated: 2026-09-09
category: automatisation
tags: [gitlab-ci, powershell, git, smb, cnc, industrie]
level: avancé
status: à jour
featured: false
tested_on: [GitLab CE auto-hébergé en Docker, PowerShell]
sidebar:
  label: "Versionner des programmes machine"
---

Dans un atelier d'usinage, les programmes des machines à commande numérique vivent sur un partage réseau. Les régleurs les modifient depuis les PC d'atelier, l'outil qui gère les dossiers de programmes ne gère ni les droits ni l'historique, et le jour où une pièce sort fausse, personne ne sait qui a modifié le fichier, quand, ni à quoi ressemblait la version d'avant. Le partage n'a qu'une mémoire : la version actuelle.

Git répond à cette question gratuitement, à condition de ne rien demander à l'atelier : personne ne va apprendre `git commit` entre deux séries. D'où l'idée d'un robot qui, chaque nuit, copie le partage dans un dépôt Git et enregistre ce qui a changé. Le partage reste la référence ; le dépôt est une photocopie datée, rangée dans une armoire ignifugée. En place depuis septembre 2025 avec un pipeline GitLab et un script PowerShell, le compteur de pipelines a dépassé 2 800 un an plus tard. Il n'a pas été vert tous les soirs, et c'est aussi ce que cette fiche raconte.

## Prérequis

- Un GitLab auto-hébergé (chez moi en Docker) avec un projet dédié, disons `atelier/programmes-machines`.
- Une machine Windows membre du domaine pour héberger le runner, avec l'exécuteur `shell` en PowerShell (un runner Linux avec un montage CIFS fonctionne aussi).
- Un compte de service Active Directory avec un droit de **lecture seule** sur le partage. Le robot ne doit jamais pouvoir écrire dans l'atelier.
- Un jeton d'accès au projet (Project Access Token) avec le rôle Developer et la portée `write_repository`. C'est lui qui pousse les commits.
- Git installé sur le runner et présent dans le `PATH`.

Dans toute la fiche, le partage est `\\srv-fichiers.example.com\programmes` et le GitLab est `gitlab.example.com`.

## Créer le dépôt et l'identité du robot

Créez le projet vide, puis le jeton : **Settings > Access tokens**, rôle Developer, portée `write_repository`, et une date d'expiration que vous notez dans votre agenda. Un jeton qui expire sans prévenir, c'est un pipeline rouge un lundi matin et une heure à comprendre pourquoi ; je l'ai vécu.

Rangez ensuite le jeton dans une variable CI/CD du projet (**Settings > CI/CD > Variables**) nommée `SYNC_PUSH_TOKEN`, cochée **Masked** et **Protected**, pour qu'il n'apparaisse ni dans le script, ni dans le dépôt, ni dans les journaux.

:::danger
Ne mettez jamais le jeton dans le script ni dans le dépôt. Le jour où quelqu'un le clone « pour voir », il ne doit pas repartir avec une clé qui écrit dans votre GitLab.
:::

## Installer et enregistrer le runner

Sur la machine Windows, enregistrez `gitlab-runner.exe` avec le jeton de runner du projet (**Settings > CI/CD > Runners**) :

```powershell title="Enregistrer le runner (PowerShell administrateur)"
.\gitlab-runner.exe register `
  --non-interactive `
  --url "https://gitlab.example.com" `
  --token "glrt-xxxxxxxxxxxxxxxxxxxx" `
  --executor "shell" `
  --shell "powershell" `
  --description "runner-sync-smb" `
  --tag-list "smb-sync"
```

Installez-le ensuite comme service Windows **sous le compte de service** qui a le droit de lecture sur le partage, pas sous `SYSTEM` :

```powershell title="Installer le service sous le compte de service"
.\gitlab-runner.exe install --user "EXAMPLE\svc-gitlab-sync" --password "<mot de passe du compte>"
.\gitlab-runner.exe start
```

:::caution
C'est le piège numéro un, celui de mes premiers pipelines rouges. Un service sous `SYSTEM` s'authentifie sur le partage avec le compte ordinateur, qui n'a aucun droit dessus : le script voit un dossier vide ou une erreur d'accès, et Git commite… rien. Ouvrez une session avec le compte de service et listez le partage à la main avant d'aller plus loin.
:::

## Écrire le script de synchronisation

Le script fait quatre choses : se placer sur la bonne branche, miroiter le partage dans un sous-dossier du dépôt, commiter si quelque chose a changé, pousser avec le jeton. L'identité du commit est celle du robot, pas la vôtre : dans l'historique, on doit voir d'un coup d'œil ce qui vient de la synchronisation.

```powershell title="Sync-SMB-To-Repo.ps1"
param(
    [string]$Source  = '\\srv-fichiers.example.com\programmes',
    [string]$Branch  = 'main',
    [string]$BotName = 'CNC Bot',
    [string]$BotMail = 'cnc-bot@example.com'
)

$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$dest = Join-Path $repo 'programmes'

if (-not (Test-Path $Source)) {
    throw "Partage inaccessible : $Source"
}

<# Le runner laisse le dépôt en HEAD détaché : on revient sur la branche. #>
git checkout -B $Branch "origin/$Branch" | Out-Null

<# Miroir du partage vers le sous-dossier, fichiers temporaires exclus. #>
robocopy $Source $dest /MIR /XF '~$*' '*.tmp' '*.bak' /R:2 /W:5 /NP /NFL /NDL
if ($LASTEXITCODE -ge 8) {
    throw "robocopy a échoué (code $LASTEXITCODE)"
}

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:sszzz'
Set-Content -Path (Join-Path $repo 'SYNC-PROOF.txt') -Value "Derniere synchronisation : $stamp"

if (-not (git status --porcelain)) {
    Write-Host "Aucun changement, rien à commiter."
    exit 0
}

git add -A
git -c user.name="$BotName" -c user.email="$BotMail" commit -m "CNC Sync + proof $stamp" | Out-Null

$remote = "https://oauth2:$($env:SYNC_PUSH_TOKEN)@gitlab.example.com/atelier/programmes-machines.git"
git push $remote "HEAD:$Branch" -o ci.skip
```

Quelques choix à expliquer :

- Le partage est copié dans `programmes/`, pas à la racine. Avec `/MIR`, robocopy rend la destination identique à la source, suppressions comprises : à la racine, il effacerait le `.gitlab-ci.yml` et le script lui-même. Un programme effacé dans l'atelier apparaît comme une suppression dans Git, et reste récupérable. C'est tout l'intérêt.
- Le code de retour de robocopy n'est pas binaire : de 0 à 7, tout va bien ; à partir de 8, il y a eu des échecs. D'où le test `-ge 8`.
- `/R:2 /W:5` limite les tentatives sur un fichier verrouillé par une machine en cours d'usinage ; par défaut, robocopy réessaie un million de fois à trente secondes d'intervalle.
- `SYNC-PROOF.txt` garantit qu'un passage du robot laisse une trace même sans changement. Retirez-le si vous voulez un historique limité aux vrais changements.
- `-o ci.skip` empêche le push du robot de déclencher lui-même un nouveau pipeline. Sans ça, vous fabriquez une boucle.

Commitez ce script à la racine du projet.

## Définir le pipeline

```yaml title=".gitlab-ci.yml"
stages:
  - sync

variables:
  GIT_STRATEGY: fetch
  GIT_DEPTH: 0

sync_cnc:
  stage: sync
  tags:
    - smb-sync
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - powershell -NoProfile -ExecutionPolicy Bypass -File .\Sync-SMB-To-Repo.ps1
```

Deux réglages importants :

- `GIT_DEPTH: 0` désactive le clone superficiel, sans quoi le push échoue avec `shallow update not allowed`, un message qui n'aide pas à comprendre d'où ça vient.
- `rules` limite le job aux exécutions planifiées. Un push manuel du script ne lance donc rien ; pour tester, lancez le planning à la main depuis l'interface.

## Planifier l'exécution nocturne

**Build > Pipeline schedules > New schedule**, expression cron `0 21 * * *`, fuseau `Europe/Paris`, branche `main`. Choisissez une heure après la fin de la dernière équipe, pour ne pas commiter un fichier en cours d'édition. Lancez une première exécution avec **Run pipeline schedule** et lisez le journal du job jusqu'au bout.

:::tip
Ajoutez le responsable de l'atelier aux notifications d'échec du projet. Le jour où le partage est indisponible parce qu'un serveur a redémarré, c'est lui qui saura pourquoi, pas vous.
:::

## Comprendre les pipelines rouges

Sur un an, le journal du projet alterne franchement entre échecs et corrections. Aucun n'était mystérieux une fois la cause trouvée ; tous ont coûté du temps.

| Symptôme dans le journal | Cause probable | Correction |
| --- | --- | --- |
| `Partage inaccessible` ou dossier vide | Runner sous `SYSTEM`, ou compte de service sans droit | Réinstaller le service sous le compte de service, tester le partage à la main |
| `remote: HTTP Basic: Access denied` | Jeton expiré, ou variable protégée sur une branche qui ne l'est pas | Régénérer le jeton, mettre à jour la variable, vérifier les cases Masked/Protected |
| `shallow update not allowed` | Clone superficiel | `GIT_DEPTH: 0` |
| Pipeline qui dure des heures | Fichier verrouillé par une machine, robocopy qui réessaie | `/R:2 /W:5` |
| Un pipeline en déclenche un autre | Push du robot sans `ci.skip` | `-o ci.skip` |

Mes premiers commits s'appellent « debug push PAT env » et « fix credentials ». Ils sont restés dans l'historique : le dépôt raconte aussi comment il a été construit.

## Ce que l'atelier y gagne

Rien ne change pour les régleurs : même partage, mêmes chemins, mêmes habitudes. Côté méthodes, un `git log -- programmes/tour-3/piece-4521.nc` répond à « qui, quand, quoi », et un `git show` montre la ligne modifiée. Un programme effacé par erreur se récupère depuis n'importe quel commit, et le dépôt fait une copie de plus des programmes, hors du serveur de fichiers.

Ce n'est pas de la gestion de configuration industrielle, et le robot ne remplace pas un vrai contrôle des accès sur le partage. C'est une boîte noire gratuite qui enregistre tout ce qui arrive aux programmes. La prochaine fois qu'une pièce sort fausse, vous aurez au moins la version d'avant.

## Pour aller plus loin

- [GitLab en conteneur : mémoire et OOM](/docs/conteneurs/gitlab-en-conteneur-memoire-et-oom/) : le GitLab qui héberge ce dépôt a manqué de mémoire avant d'être stable.
- [Segmenter les réseaux des machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/) : le partage de programmes est souvent le seul pont vers le réseau machines.
- Documentation GitLab : [Scheduled pipelines](https://docs.gitlab.com/ci/pipelines/schedules/) et [Project access tokens](https://docs.gitlab.com/user/project/settings/project_access_tokens/).

<!-- source : pipelines GitLab « CNC Sync + proof » du projet de synchronisation des programmes CNC, 2025-09-09 → 2026-09-08 -->

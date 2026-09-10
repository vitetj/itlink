---
title: "Boucle de redémarrage causée par un agent de télémétrie constructeur"
description: "Des postes qui redémarrent en boucle après une mise à jour : identifier le processus qui déclenche le redémarrage dans le journal système, puis désactiver le service de remédiation du constructeur avec sc.exe."
published: 2026-05-18
category: microsoft
tags: [windows, redemarrage, diagnostic, services, dell, supportassist]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 10, Windows 11]
sidebar:
  label: "Boucle de redémarrage causée par un…"
---

Mai 2026. Plusieurs postes du parc se mettent à redémarrer en boucle. Pas un plantage, pas un écran bleu : un redémarrage propre, annoncé, répété toutes les quelques minutes. L'utilisateur a le temps d'ouvrir sa session, parfois de lancer une application, et la machine repart.

Mon premier réflexe a été le bon réflexe de tout le monde, et il était faux : accuser la mise à jour cumulative de Windows. J'ai perdu une heure à désinstaller un correctif qui n'y était pour rien. Le coupable était l'agent d'assistance du constructeur du PC — plus précisément son composant de **remédiation**, celui qui a le droit d'appliquer des corrections tout seul et de redémarrer la machine pour les terminer.

C'est logique quand on y pense : un composant conçu pour « réparer et redémarrer » qui n'arrive pas à finir sa réparation redémarre à l'infini. Il fait exactement son travail, en boucle.

Cette fiche décrit la démarche de diagnostic — celle qui permet de désigner un coupable avant de désactiver quoi que ce soit — puis le contournement.

## Prérequis

- Un accès administrateur local sur le poste.
- Le journal des événements accessible : soit en session, soit à distance, soit depuis l'environnement de récupération.
- Un inventaire du parc, même sommaire : modèle, date de déploiement, agents installés.

## Diagnostiquer avant de désactiver

Désactiver un service au hasard fait parfois cesser le symptôme. Ça ne fait jamais un diagnostic, et ça se retourne contre vous à la première question de la direction.

### Chercher le point commun

Trois questions, dans l'ordre, avant de toucher à un poste :

- **Quels postes** sont touchés ? Même modèle, même série, même agent constructeur ?
- **Depuis quand** exactement ? Comparez la date de première boucle avec les dates d'installation de mises à jour, de pilotes et d'agents.
- **Qu'est-ce qui est commun aux postes touchés et absent des autres ?** C'est cette question qui a désigné l'agent constructeur chez moi : les postes épargnés étaient ceux où il n'avait jamais été déployé.

### Lire qui a demandé le redémarrage

Windows note toujours qui l'a fait redémarrer. C'est l'événement **1074** du journal système : il contient le nom du processus à l'origine de l'arrêt et le motif déclaré. Les événements 6008 (arrêt inattendu) et 41 (Kernel-Power) complètent le tableau quand le redémarrage n'a pas été demandé proprement.

```powershell title="Qui a redémarré ce poste, et quand"
Get-WinEvent -FilterHashtable @{LogName='System'; Id=1074,6006,6008,41} -MaxEvents 30 |
    Select-Object TimeCreated, Id, ProviderName, Message |
    Format-List
```

Si les événements 1074 se succèdent toutes les quelques minutes en nommant le même exécutable, votre enquête est terminée. Notez ce nom : c'est lui qu'il faut relier à un service.

```powershell title="Voir aussi ce que le poste a installé juste avant"
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WindowsUpdateClient'} -MaxEvents 20 |
    Select-Object TimeCreated, Message | Format-List
```

### Tenir la session assez longtemps pour travailler

Si le poste ne reste pas allumé assez longtemps pour lancer ces commandes, gagnez du temps par un démarrage en mode sans échec ou un démarrage en mode diagnostic (`msconfig`, onglet Général, « Démarrage sélectif »). Les services tiers ne s'y lancent pas : si la boucle cesse en mode sans échec, elle vient d'un service tiers, ce qui restreint déjà considérablement la liste des suspects.

## Identifier le service et le désactiver

Retrouvez le service correspondant à l'exécutable repéré. Le nom court du service et son nom d'affichage sont souvent différents, et `sc.exe` accepte les deux — à condition de mettre les guillemets quand il y a des espaces.

```bat title="Retrouver le service"
sc.exe query type= service state= all | findstr /i "SupportAssist"
sc.exe qc "Dell SupportAssist Remediation"
```

Puis la désactivation, qui est le contournement appliqué chez moi. Invite de commandes **en administrateur** :

```bat title="Désactiver le service de remédiation"
sc.exe config "Dell SupportAssist Remediation" start= disabled
sc.exe stop "Dell SupportAssist Remediation"
shutdown /r /t 0
```

Le poste repart normalement.

:::caution
L'espace après `start=` est **obligatoire** dans la syntaxe de `sc.exe`. Sans lui, la commande échoue sans rien faire d'utile, et vous conclurez que la piste était mauvaise. C'est la faute de frappe la plus coûteuse de cet article.
:::

## Le faire quand la session ne tient pas assez longtemps

Sur les postes où la boucle est trop rapide, passez par l'environnement de récupération (démarrage avancé, puis invite de commandes) et modifiez la ruche `SYSTEM` hors ligne. La valeur `Start` d'un service vaut `4` pour « désactivé ».

```bat title="Désactiver un service depuis l'environnement de récupération"
reg load HKLM\OFFLINE C:\Windows\System32\config\SYSTEM
reg query HKLM\OFFLINE\ControlSet001\Services\<NomCourtDuService>
reg add HKLM\OFFLINE\ControlSet001\Services\<NomCourtDuService> /v Start /t REG_DWORD /d 4 /f
reg unload HKLM\OFFLINE
```

Vérifiez la lettre de lecteur : dans l'environnement de récupération, le volume Windows n'est pas toujours `C:`. Un `dir D:\Windows` avant de commencer évite de modifier la mauvaise ruche.

## Traiter le parc sans passer sur chaque poste

Une fois le diagnostic posé et validé sur deux ou trois machines, la même opération se pousse à distance sur les postes joignables :

```powershell title="Désactiver le service à distance"
$postes = Get-Content .\postes-concernes.txt
Invoke-Command -ComputerName $postes -ScriptBlock {
    Set-Service -Name '<NomCourtDuService>' -StartupType Disabled
    Stop-Service -Name '<NomCourtDuService>' -Force -ErrorAction SilentlyContinue
}
```

Sur les postes nomades, le même contenu passe très bien dans un paquet du gestionnaire de déploiement ou dans un script de session : c'est plus lent, mais ça n'oublie personne.

## Ne pas oublier de réactiver

Désactiver ce service supprime aussi les remédiations légitimes : mises à jour de firmware, correctifs de pilotes, diagnostics matériels remontés au support. Ce n'est pas une correction, c'est un contournement, et un contournement sans date de fin devient une dette.

- **Documentez-le** : quels postes, quel service, quelle date, quel motif.
- **Ouvrez un dossier chez le constructeur** avec les extraits d'événements 1074. C'est ce qui fait sortir un correctif ; sans remontée, l'éditeur ne sait pas que sa boucle existe.
- **Fixez une date de revue.** À la publication d'une nouvelle version de l'agent, réactivez sur un poste témoin avant de réactiver partout.

```bat title="Réactiver après correctif"
sc.exe config "Dell SupportAssist Remediation" start= auto
sc.exe start "Dell SupportAssist Remediation"
```

| Symptôme | Piste à vérifier |
| --- | --- |
| Redémarrages réguliers et « propres » | Événement 1074 : un processus les demande |
| Redémarrages brutaux, sans message | Événements 41 et 6008 : matériel, alimentation ou pilote |
| Boucle qui cesse en mode sans échec | Service ou agent tiers |
| Boucle sur un seul modèle de poste | Agent constructeur, firmware ou pilote de série |
| Boucle après une mise à jour | Corréler `Get-HotFix` et la première occurrence, sans conclure trop vite |

La morale de l'affaire tient en une ligne : le journal système sait toujours qui a appuyé sur le bouton. Encore faut-il le lui demander avant de désinstaller trois correctifs pour rien.

## Pour aller plus loin

- [Un PC de cellule qui démarre en boucle : récupérer les données, puis décider](/docs/microsoft/pc-industriel-en-boucle-de-demarrage-recuperer-les-donnees/) : quand la boucle n'est pas logicielle et que les données passent avant.
- [Rollback d'un pilote graphique et preuve d'un défaut de série](/docs/microsoft/rollback-dun-pilote-graphique-et-preuve-de-defaut-de-serie/) : comment constituer le dossier qui fait bouger un constructeur.
- [Isoler les outils constructeur dans une VM dédiée](/docs/virtualisation/isoler-les-outils-constructeur-dans-une-vm-dediee/) : le principe général, appliqué aux agents qui s'octroient trop de droits.

<!-- source : mail « postes qui redémarrent en boucle », 2026-05-18 -->

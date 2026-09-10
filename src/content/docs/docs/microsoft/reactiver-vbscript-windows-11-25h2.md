---
title: "Réactiver VBScript sur Windows 11 25H2 pour un installateur industriel"
description: "Un installateur legacy (Studio 5000) échoue sur Windows 11 25H2 parce que VBScript n'est plus là. Le remettre en une commande, vérifier, déployer via Intune, et savoir quand ça ne suffit plus."
published: 2026-08-05
category: microsoft
tags: [windows-11, vbscript, dism, intune, legacy, automatisme]
level: débutant
status: à jour
featured: false
tested_on: [Windows 11 25H2]
sidebar:
  label: "Réactiver VBScript sur Windows 11 25H2 pour un…"
---

Août 2026, un ticket au support interne : l'installateur de Studio 5000, l'environnement de programmation
des automates Rockwell, plante sur un poste fraîchement passé en Windows 11 25H2. Pas de message clair,
juste un assistant d'installation qui s'arrête. Sur un poste en 24H2, le même installateur passe sans
broncher. La différence tient en un mot : VBScript. Microsoft l'a retiré par défaut de Windows, et une bonne
partie des installateurs industriels écrits il y a dix ou quinze ans en dépendent encore, souvent sans le
dire.

Ce qui suit remet VBScript en place en cinq minutes. C'est une rustine, et je le dis dès maintenant : la
vraie réponse est un plan de migration, pas une commande.

## Pourquoi VBScript a disparu

VBScript est un langage de script de 1996. Il a servi à écrire des scripts d'ouverture de session, des
installateurs, des macros de connexion, et il a surtout servi aux auteurs de logiciels malveillants pendant
vingt ans. Microsoft a annoncé sa fin de vie et l'a sortie du socle de Windows par étapes : d'abord
transformé en **fonctionnalité à la demande** (*Feature on Demand*) toujours installée, puis fonctionnalité à
la demande **non installée par défaut**, avant sa suppression complète. Windows 11 25H2 est dans la phase où le
composant existe encore dans le catalogue, mais n'est plus présent sur une installation neuve.

Pour un installateur, l'effet est brutal : le moteur `vbscript.dll` n'est plus là, les scripts d'installation
qui l'appellent échouent, et l'assistant ne sait pas toujours l'expliquer. C'est comme un meuble en kit dont
la notice suppose que vous avez une clé Allen : si elle n'est plus dans la boîte, vous restez planté à
l'étape 3 sans savoir pourquoi.

## Prérequis

- Un compte administrateur local sur le poste.
- Un accès à Windows Update, ou à une source de fonctionnalités à la demande : le composant est téléchargé
  depuis les serveurs Microsoft, pas depuis l'ISO d'installation.
- Le droit, dans votre politique de sécurité, de réactiver un composant en fin de vie. Dans une PME
  industrielle, la réponse est en général « oui, sur les postes d'automatisme, et nulle part ailleurs ».

## Réactiver VBScript

### Avec PowerShell

Ouvrez PowerShell **en tant qu'administrateur** et installez la capacité :

```powershell title="Installer la fonctionnalité à la demande VBScript"
Add-WindowsCapability -Online -Name "VBScript~~~~0.0.1.0"
```

La commande contacte Windows Update, télécharge le composant et l'installe. Selon le poste, un redémarrage
peut être demandé, et l'installateur qui suit peut en exiger un autre.

### Vérifier l'installation

```powershell title="Contrôler l'état du composant"
Get-WindowsCapability -Online -Name "VBScript*"
```

La propriété `State` doit valoir `Installed`. Si elle affiche `NotPresent`, l'installation n'a pas abouti :
regardez la section sur les échecs de téléchargement plus bas.

### Variante avec DISM

Même opération depuis une invite de commandes administrateur, utile si vous avez déjà des scripts DISM :

```cmd title="Équivalent DISM"
DISM /Online /Add-Capability /CapabilityName:VBScript~~~~0.0.1.0
DISM /Online /Get-CapabilityInfo /CapabilityName:VBScript~~~~0.0.1.0
```

## Relancer l'installateur, puis décider

Une fois `State : Installed`, relancez l'installateur. Pour la plupart des scripts et des vieux installateurs
qui appellent simplement `vbscript.dll`, l'histoire s'arrête là.

Pour Studio 5000 sur 25H2, elle ne s'est pas arrêtée là. Composant installé, poste redémarré, et l'assistant
refusait toujours de s'installer, sur plusieurs postes testés. La version de l'installateur vérifie plus que la
présence du moteur, et Rockwell n'avait pas encore publié de version compatible. Deux issues honnêtes à ce
stade, et aucune n'est une commande : attendre le correctif de l'éditeur, ou garder ce poste sur une version
antérieure de Windows (24H2, où le même installateur passe) le temps qu'il arrive. C'est ce que j'ai répondu au
ticket, et c'est frustrant, mais un contournement bricolé sur un poste qui programme des automates n'est pas
une bonne idée.

:::note
Testez toujours la réactivation avant de la déployer : elle règle le cas général, pas tous les cas. Si votre
installateur refuse encore, cherchez d'abord une version récente chez l'éditeur avant de creuser plus loin.
:::

Quand la réactivation suffit, reste la question que la politique de sécurité impose : laisse-t-on VBScript
sur le poste ? Deux écoles.

- **Le retirer après l'installation**, si le logiciel n'en a besoin qu'au moment de s'installer. Testez le
  logiciel après retrait ; certains outils industriels l'appellent aussi à l'exécution.
- **Le laisser**, en assumant ce poste comme un poste d'automatisme à part, sur un réseau segmenté, avec un
  inventaire à jour de ce qui y est réactivé.

Pour retirer le composant :

```powershell title="Retirer VBScript une fois l'installation terminée"
Remove-WindowsCapability -Online -Name "VBScript~~~~0.0.1.0"
```

:::caution
Retirer VBScript ne casse pas seulement les vieux installateurs. Vérifiez qu'aucun script d'ouverture de
session `.vbs`, aucune tâche planifiée héritée et aucune macro de connexion ne tourne encore sur ce poste.
Sur un parc qui a quinze ans d'histoire, il y en a presque toujours un quelque part.
:::

## Si le téléchargement échoue

`Add-WindowsCapability` va chercher le composant sur Windows Update. Sur un poste qui ne voit que WSUS, ou
derrière un filtrage sortant strict, la commande peut échouer avec le code `0x800f0954`. Deux pistes,
documentées par Microsoft :

- Activer la stratégie « Spécifier les paramètres pour l'installation de composants facultatifs et la
  réparation de composants » (dans *Configuration ordinateur > Modèles d'administration > Système*) avec
  l'option « Télécharger le contenu de réparation et les fonctionnalités facultatives directement à partir
  de Windows Update au lieu de WSUS ».
- Fournir une source locale : l'ISO « Features on Demand » de la version de Windows concernée, montée, puis
  `Add-WindowsCapability -Online -Name "VBScript~~~~0.0.1.0" -Source D:\ -LimitAccess`.

## Déployer sur plusieurs postes avec Intune

Un poste d'automatisme, ça se corrige à la main. Plusieurs PC de techniciens qui reçoivent 25H2 par
Windows Autopatch, non. Deux façons de faire avec Intune.

La première : un **script PowerShell** de plateforme (**Appareils > Scripts et remédiations > Scripts de
plateforme**) affecté au groupe des postes d'automatisme, qui contient simplement la commande
`Add-WindowsCapability` ci-dessus. Il s'exécute une fois par poste.

La seconde, plus robuste parce qu'elle se répète : une **remédiation** avec détection et correction. Elle
remettra le composant si une mise à jour de fonctionnalité future le retire à nouveau.

```powershell title="Détection : VBScript est-il installé ?"
$cap = Get-WindowsCapability -Online -Name "VBScript~~~~0.0.1.0"
if ($cap.State -eq 'Installed') {
    Write-Output "VBScript présent"
    exit 0
}
Write-Output "VBScript absent"
exit 1
```

```powershell title="Remédiation : l'installer"
Add-WindowsCapability -Online -Name "VBScript~~~~0.0.1.0" | Out-Null
exit 0
```

Exécution en contexte système, PowerShell 64 bits, affectation limitée à un groupe précis. Ne l'affectez pas
à « Tous les appareils » : vous réactiveriez sur tout le parc un composant que Microsoft retire pour de bonnes
raisons.

## Ce que cette commande ne règle pas

Même quand la réactivation fonctionne, le sursis est court : VBScript n'est que le premier des trois à
partir. **ActiveX** et **VBA** suivent le même chemin, et chez moi, ils
portent bien plus que des installateurs : des feuilles Excel métier truffées de macros, et un outil de
documentation technique qui repose sur VBA. J'avais alerté la direction sur la fin de vie de VBA et ActiveX
dès juin 2024 ; le cas Studio 5000 en août 2026 a servi de piqûre de rappel concrète.

Le plan à cadrer, et c'est un vrai projet, pas un ticket :

1. **Inventorier** ce qui dépend de VBScript, ActiveX et VBA : installateurs, feuilles Excel, macros, scripts
   d'ouverture de session, connecteurs métier.
2. **Classer** par criticité : ce qui bloque la production le lundi matin d'abord.
3. **Migrer** : PowerShell pour les scripts d'administration, applications web internes ou Power Platform
   pour les feuilles Excel « qui font tourner le service », nouvelles versions des logiciels éditeur quand
   elles existent.
4. **Isoler** ce qui ne peut pas être migré, sur des postes dédiés et segmentés, avec le composant réactivé
   en connaissance de cause.

La commande de cet article vous achète du temps. Utilisez-le pour le point 1.

## Pour aller plus loin

- [VBScript, VBA, ActiveX : la triple fin de vie](/blog/vbscript-vba-activex-la-triple-fin-de-vie/), pourquoi
  ce sujet mérite un projet et pas une rustine.
- [DISM : sauvegarder et réinjecter les pilotes Windows](/docs/automatisation/dism-sauvegarder-et-reinjecter-les-pilotes-windows/),
  pour ceux qui préfèrent DISM à PowerShell sur les postes d'atelier.
- [Segmenter les réseaux des machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/),
  si vous décidez de garder VBScript sur des postes d'automatisme.
- Documentation Microsoft : [VBScript deprecation](https://learn.microsoft.com/windows/whats-new/deprecated-features-resources#vbscript).

<!-- source : ticket helpdesk Studio 5000, 2026-08-03 et mail « RE: Alerte – Les feuilles de calcul VBA arrivent en fin de vie », 2026-08-04 -->

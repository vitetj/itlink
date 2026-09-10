---
title: "Déployer Microsoft 365 Apps sur un parc avec WAPT (Office Deployment Tool et script)"
description: "Remplacer en masse un Office non conforme par Microsoft 365 Apps for Business : un paquet WAPT qui embarque l'Office Deployment Tool, désinstalle l'ancien Office, et la case à ne pas cocher à la première activation."
published: 2025-01-31
category: automatisation
tags: [wapt, microsoft-365, office, odt, deploiement, entra-id]
level: intermédiaire
status: à jour
featured: false
tested_on: [WAPT, Windows 10, Windows 11, Microsoft 365 Business]
---

Janvier 2025. La « bidouille » qui maintenait Office en vie sur le parc s'est arrêtée de fonctionner : les
applications se désactivent au bout de deux jours, et tout le monde s'est retrouvé sur LibreOffice en attendant.
Quatre ans que je demandais un budget licences à la direction avec mon bâton de pèlerin ; il aura fallu un mail
« Situation critique » pour que les licences Microsoft 365 arrivent. Restait à installer un Office légal sur
environ deux cents postes, sans passer sur chacun, et sans laisser traîner l'ancienne installation.

WAPT était déjà mon outil de gestion de parc. L'Office Deployment Tool (ODT) est la méthode officielle de
Microsoft pour installer les applications Microsoft 365 sans clic. Il suffisait de mettre l'un dans l'autre :
un paquet WAPT qui embarque l'ODT, les sources d'installation et un script qui nettoie avant de poser.
Cette fiche décrit ce paquet, la façon de le déployer, et surtout le piège qui m'a coûté une semaine de
débogage ensuite : une case cochée par défaut à la première activation.

## Prérequis

- Des licences Microsoft 365 Apps for Business (incluses dans Business Standard et Business Premium),
  attribuées aux utilisateurs dans le centre d'administration.
- Un serveur WAPT opérationnel, sa console, et l'agent déployé sur les postes.
- L'Office Deployment Tool (`setup.exe`) téléchargé depuis le site de Microsoft.
- Des comptes synchronisés vers Entra ID avec un UPN routable, égal à l'adresse e-mail : c'est le login
  qu'Office va demander à la première ouverture, et c'est ce que vous allez devoir expliquer aux utilisateurs.
- Un poste pilote, qui n'est pas le vôtre, pour valider le paquet avant de l'envoyer à tout le monde.

## Écrire le fichier configuration.xml

Tout ce que fait l'ODT est piloté par un fichier XML. Le mien tient en quelques lignes : édition Business en
64 bits, canal de mise à jour courant, langue française, suppression des anciennes versions installées par MSI,
installation silencieuse et fermeture forcée des applications ouvertes.

```xml title="configuration.xml"
<Configuration>
  <Add OfficeClientEdition="64" Channel="Current">
    <Product ID="O365BusinessRetail">
      <Language ID="fr-fr" />
    </Product>
  </Add>
  <RemoveMSI />
  <Updates Enabled="TRUE" />
  <Display Level="None" AcceptEULA="TRUE" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
</Configuration>
```

`O365BusinessRetail` est l'identifiant des applications Microsoft 365 pour les entreprises (l'édition
« Business »). `RemoveMSI` fait le ménage des Office installés par l'ancien installeur MSI. `FORCEAPPSHUTDOWN`
évite qu'un Outlook resté ouvert bloque l'installation sur un poste où l'utilisateur est parti déjeuner.

:::note
Teams ne fait plus partie du paquet Office dans cette configuration, et OneDrive est livré avec Windows mais
pas toujours à jour. Je les ai déployés dans la foulée avec deux paquets WAPT séparés, plutôt que de tout mélanger
dans un seul paquet impossible à mettre à jour indépendamment.
:::

## Télécharger les sources une seule fois

Sans cette étape, chaque poste irait chercher plusieurs gigaoctets sur Internet au moment de l'installation.
Sur votre poste d'administration, dans le dossier du futur paquet :

```cmd title="Télécharger les sources d'installation"
setup.exe /download configuration.xml
```

L'ODT crée un dossier `Office` contenant les données du canal et de la langue demandés. C'est ce dossier, avec
`setup.exe` et le XML, qui part dans le paquet WAPT. Le paquet est lourd, mais il transite une seule fois vers
le dépôt WAPT et les postes le récupèrent en local.

## Écrire le paquet WAPT

Un paquet WAPT, c'est un dossier avec un fichier `control` (nom, version, description) et un `setup.py` qui
décrit l'installation. Le mien fait trois choses : repérer un Office existant, le désinstaller, puis lancer
l'ODT en mode configuration.

```python title="setup.py"
# -*- coding: utf-8 -*-
from setuphelpers import *

uninstallkey = []

def install():
    # 1. Un ancien Office Click-to-Run se retire proprement par l'ODT lui-même
    if installed_softwares('Microsoft Office'):
        print('Ancien Office détecté, suppression via l\'ODT')
        run(r'"%s" /configure "%s"' % (makepath(basedir, 'setup.exe'),
                                        makepath(basedir, 'remove.xml')))

    # 2. Installation de Microsoft 365 Apps depuis les sources embarquées
    run(r'"%s" /configure "%s"' % (makepath(basedir, 'setup.exe'),
                                    makepath(basedir, 'configuration.xml')))

    # 3. Contrôle : la clé de désinstallation doit exister
    if not installed_softwares('Microsoft 365'):
        error('Microsoft 365 Apps ne semble pas installé')
```

Le fichier `remove.xml` est un second XML de l'ODT, réduit à sa plus simple expression :

```xml title="remove.xml"
<Configuration>
  <Remove All="TRUE" />
  <Display Level="None" AcceptEULA="TRUE" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
</Configuration>
```

Passer par l'ODT pour désinstaller est plus fiable que de rejouer la commande de désinstallation trouvée dans le
registre : celle-ci est souvent interactive et laisse des restes. `installed_softwares` cherche le nom dans les
clés de désinstallation de Windows ; adaptez le motif au libellé exact de ce qui traîne sur votre parc.

Construisez et envoyez le paquet depuis la console WAPT ou en ligne de commande, puis affectez-le au poste
pilote.

```cmd title="Construire et publier le paquet"
wapt-get build-upload C:\waptdev\microsoft-365-apps
```

## Déployer sur le parc et communiquer

Une fois le pilote validé (ouvrez Word, Excel et Outlook, pas seulement l'écran d'accueil), affectez le paquet
aux groupes de postes par lots. WAPT exécute l'installation en tâche de fond ; l'utilisateur voit ses
applications changer d'icône et c'est à peu près tout. Le mail d'accompagnement tient en trois phrases : Office
va se réinstaller, vous devrez vous connecter avec votre **adresse e-mail** et votre **mot de passe Windows**,
et vous utilisez Outlook classique. Le « nouvel Outlook » ne servait à rien dans notre contexte et j'ai préféré
ne pas avoir deux clients de messagerie à supporter.

Pour OneDrive, une astuce qui a évité des appels : sur les dossiers d'archives, clic droit puis « Toujours
conserver sur cet appareil ». Les gens qui travaillent sur de gros fichiers ne comprennent pas les icônes de
nuage ; un fichier présent sur le disque, si.

## La case à ne pas cocher

C'est le point qui justifie cette fiche. À la première activation d'Office, Windows affiche une fenêtre
« Rester connecté à toutes vos applications » avec une case cochée par défaut : **« Autoriser mon organisation à
gérer mon appareil »**. Sur un poste joint au domaine, laisser cette case cochée inscrit l'appareil dans Entra ID
en tant qu'« Entra Registered », alors que le résultat attendu est un « Hybrid Join » piloté par Entra Connect.
Le poste se retrouve avec deux identités, et la tentative d'enrôlement Intune qui suit se termine sur l'erreur
`80192EE7`.

:::caution
Décochez cette case, ou mieux, préparez le Hybrid Join dans Entra Connect **avant** de déployer Office. Sur les
postes déjà touchés, contrôlez l'état avec `dsregcmd /status` : un poste hybride affiche `AzureAdJoined : YES` et
`DomainJoined : YES` ; un `WorkplaceJoined : YES` seul est l'inscription à retirer.
:::

Pour empêcher les utilisateurs de recréer le problème, Microsoft documente une clé de stratégie qui bloque
l'inscription « workplace » sur les postes joints au domaine. Déployée par GPO ou par un petit paquet WAPT :

```powershell title="Bloquer l'inscription Entra Registered sur un poste hybride"
$key = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WorkplaceJoin'
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name 'BlockAADWorkplaceJoin' -Type DWord -Value 1
```

Deux autres constats de cette semaine-là, à connaître avant de déployer :

| Symptôme | Cause | Ce qu'il faut faire |
| --- | --- | --- |
| Le SSO fonctionne dans le navigateur mais pas à la première activation d'Office | l'utilisateur n'a pas encore enregistré sa méthode MFA | faire enregistrer le MFA **avant** le déploiement d'Office |
| Intune refuse l'enrôlement de certains postes | Intune n'est inclus que dans Business Premium, pas dans Business Standard | réserver l'enrôlement aux nomades, via un groupe dédié |
| Poste en « Entra Registered » et erreur `80192EE7` | case « Autoriser mon organisation… » laissée cochée | retirer l'inscription, bloquer par stratégie, préparer le Hybrid Join |

Le déploiement en lui-même s'est fait en quelques jours. Le nettoyage des postes doublement inscrits a pris plus
de temps que l'installation. Si vous ne devez retenir qu'une chose : préparez l'identité des appareils avant de
distribuer les applications, pas après.

## Pour aller plus loin

- Le détail de l'erreur et du nettoyage côté Intune :
  [Intune : erreur 80192EE7 et Microsoft Store bloqué](/docs/microsoft-365/intune-erreur-80192ee7-et-microsoft-store-bloque/).
- Lire l'état d'un poste avant de toucher à quoi que ce soit :
  [Diagnostiquer la jonction Entra avec dsregcmd](/docs/microsoft-365/diagnostiquer-jonction-entra-dsregcmd/).
- Le MFA à enregistrer avant la première activation :
  [Rendre la double authentification obligatoire avec les codes TOTP dans Vaultwarden](/docs/cybersecurite/mfa-obligatoire-avec-totp-dans-vaultwarden/).
- La référence des options du XML :
  [Office Deployment Tool, documentation Microsoft](https://learn.microsoft.com/fr-fr/microsoft-365-apps/deploy/office-deployment-tool-configuration-options).

<!-- source : mail « SSO Office », 2025-01-29 -->

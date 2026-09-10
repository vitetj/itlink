---
title: "Activer Ubuntu Pro sur ses serveurs : Livepatch, ESM et ce que ça change vraiment"
description: "Attacher un serveur Ubuntu à un abonnement Pro, activer Livepatch et ESM, vérifier que c'est réellement actif, et comprendre ce que le correctif noyau à chaud dispense de faire — et ce qu'il ne dispense pas de faire."
published: 2025-11-21
category: linux
tags: [ubuntu, ubuntu-pro, livepatch, esm, correctifs, securite]
level: débutant
status: à jour
featured: false
tested_on: [Ubuntu Server 22.04 LTS, Ubuntu Server 24.04 LTS]
---

Nos serveurs Linux tournent sur Ubuntu Server LTS : la plateforme d'auto-hébergement qui porte une
quinzaine d'applications, et le concentrateur de logs qui alimente le SOC. Ce sont des machines qu'on ne
redémarre pas d'un claquement de doigts : derrière, il y a des utilisateurs connectés, des flux de logs
qui ne doivent pas s'interrompre, et une DSI d'une personne qui préfère planifier ses coupures.

C'est exactement le problème que résout Ubuntu Pro. L'abonnement, renouvelé chaque automne, apporte deux
choses concrètes : **Livepatch**, qui applique les correctifs de sécurité du noyau sans redémarrer, et
**ESM**, qui prolonge la maintenance de sécurité bien au-delà des cinq ans standard d'une LTS.

Cette fiche montre comment l'activer, comment vérifier que c'est réellement actif — parce que « je l'ai
activé » et « c'est actif » sont deux affirmations différentes — et surtout ce que ça ne dispense pas de
faire.

## Ce que contient Ubuntu Pro

Un abonnement Pro n'est pas un service unique, c'est un ensemble de services qu'on active à la carte.
Les trois qui comptent pour un parc de serveurs :

| Service | Ce qu'il fait | À quoi ça sert concrètement |
|---|---|---|
| `esm-infra` | Prolonge les correctifs de sécurité des paquets du dépôt *main* | Une LTS reste couverte au-delà de sa fin de support standard, jusqu'à dix ans |
| `esm-apps` | Étend cette couverture aux paquets du dépôt *universe* | Des milliers de paquets communautaires cessent d'être des angles morts |
| `livepatch` | Applique à chaud les correctifs de sécurité du noyau | Plus besoin de redémarrer dans l'heure pour une faille noyau critique |

S'y ajoutent, selon les besoins, un outil de durcissement conforme aux référentiels CIS et DISA-STIG, un
noyau et des modules cryptographiques certifiés FIPS, et l'accès à Landscape pour piloter une flotte.

:::note
Pour un homelab ou un poste personnel, Canonical propose un abonnement Pro gratuit couvrant un petit
nombre de machines. C'est le même mécanisme, le même jeton, les mêmes commandes que ci-dessous : le bon
moyen de s'entraîner avant de le faire sur un serveur de production.
:::

## Prérequis

- Une Ubuntu LTS (ici 22.04 et 24.04 Server) avec un accès `sudo`.
- Le jeton (*token*) de votre abonnement, récupérable dans le portail Ubuntu Pro.
- Un accès sortant en HTTPS vers les serveurs de contenu Canonical, directement ou via un proxy.
- L'outil `pro` (paquet `ubuntu-advantage-tools`, présent par défaut sur les LTS récentes).

:::danger
Le jeton est un secret. Il donne accès à votre abonnement : il n'a rien à faire dans un dépôt Git, dans
un ticket, dans un script de déploiement en clair ni dans un copier-coller envoyé au support. Traitez-le
comme un mot de passe et rangez-le dans votre coffre.
:::

## Attacher la machine à l'abonnement

L'attachement est l'opération qui associe le serveur au contrat. Elle se fait une fois par machine.

```bash
sudo pro attach <TOKEN>
```

Le jeton apparaît alors dans l'historique du shell, ce qui n'est pas idéal. Pour un déploiement propre
ou automatisé, `pro` accepte un fichier de configuration, que vous supprimez ensuite :

```bash title="Attachement sans jeton dans l'historique"
sudo install -m 600 /dev/null /root/attach.yaml
sudo tee /root/attach.yaml >/dev/null <<'YAML'
token: VOTRE_JETON
enable_services:
  - esm-infra
  - esm-apps
  - livepatch
YAML
sudo pro attach --attach-config /root/attach.yaml
sudo shred -u /root/attach.yaml
```

Si le serveur sort par un proxy, indiquez-le à `pro` avant d'attacher, sinon la commande partira en
timeout sans expliquer pourquoi :

```bash
sudo pro config set http_proxy=http://proxy.example.com:3128
sudo pro config set https_proxy=http://proxy.example.com:3128
```

## Activer les services

Si vous n'avez pas utilisé de fichier de configuration, activez les services à la main :

```bash
sudo pro enable esm-infra
sudo pro enable esm-apps
sudo pro enable livepatch
```

L'activation d'ESM ajoute des dépôts APT dédiés. Il faut donc rafraîchir et appliquer ce qui vient
d'apparaître — c'est souvent à ce moment qu'on découvre que la machine avait des correctifs en attente
depuis des mois :

```bash
sudo apt update
sudo apt upgrade
```

## Vérifier que c'est réellement actif

C'est la partie que je considère comme obligatoire. Trois commandes, trois niveaux de preuve.

```bash title="État global de l'abonnement"
pro status
```

Vous devez lire `yes` dans la colonne « ENTITLED » **et** `enabled` dans la colonne « STATUS » pour
`esm-infra`, `esm-apps` et `livepatch`. Un service `entitled: yes / status: disabled` signifie que vous
avez payé pour un service que vous n'avez pas activé : cas fréquent, et parfaitement silencieux.

```bash title="État du correctif noyau à chaud"
canonical-livepatch status --verbose
```

L'état attendu est `checkState: checked` et `patchState: nothing-to-apply` ou `applied`. Deux états
doivent vous alerter :

- `kernel-upgrade-required` : le noyau en cours d'exécution n'est plus patchable à chaud, il faut
  redémarrer sur le noyau récent installé par APT ;
- `unsupported` ou `kernel not supported` : vous n'utilisez pas un noyau couvert par Livepatch. Un noyau
  compilé maison, un noyau fourni par un hyperviseur ou un noyau très ancien sortent du périmètre.

```bash title="Vue par paquet"
pro security-status
```

Cette commande dit combien de paquets viennent de `main`, d'`universe`, combien sont couverts par ESM et
combien ne le sont pas du tout. C'est la sortie que je garde pour les revues de sécurité : elle est
lisible par quelqu'un qui n'administre pas la machine.

## Ce que ça change au quotidien

Trois effets visibles, une fois les services actifs.

**Les correctifs noyau ne dictent plus le calendrier.** Une faille noyau critique publiée un vendredi
soir n'impose plus une fenêtre de redémarrage en urgence : Livepatch applique le correctif sur le noyau
en fonctionnement, et le redémarrage se fait à la prochaine fenêtre planifiée.

**Les vieilles machines redeviennent défendables.** Un serveur applicatif qu'on ne peut pas réinstaller
tout de suite parce que l'application ne suit pas continue de recevoir des correctifs. Ce n'est pas une
raison pour ne jamais migrer, c'est un moyen de choisir la date au lieu de la subir.

**Les scans de vulnérabilités s'apaisent.** Les outils d'analyse et les questionnaires d'assurance cyber
signalent les paquets sans correctifs disponibles. Avec ESM, une partie de ces alertes disparaît parce
que le correctif existe enfin.

## Les limites, dites honnêtement

Livepatch ne couvre **que** les vulnérabilités du noyau, et parmi elles, celles jugées de sévérité haute
ou critique. Tout ce qui tourne au-dessus — la base de données, le serveur web, les bibliothèques
système, vos conteneurs — se met à jour normalement, avec APT et, le cas échéant, un redémarrage de
service.

Et surtout : **Livepatch ne supprime pas le besoin de redémarrer.** Il le décale. Les correctifs à chaud
s'empilent sur un noyau qui, lui, ne change pas ; au bout d'un moment, l'état passe à
`kernel-upgrade-required` et plus rien ne s'applique. La règle que je m'impose est simple : une fenêtre
de redémarrage mensuelle, planifiée, annoncée, même quand tout va bien. Livepatch sert à ne pas
redémarrer en catastrophe, pas à ne jamais redémarrer.

:::tip
Un `uptime` de plusieurs centaines de jours n'est pas un trophée, c'est un symptôme. Il signifie que
personne n'a validé depuis longtemps que la machine sait redémarrer proprement : services qui ne se
relancent pas, montage manquant dans `/etc/fstab`, dépendance oubliée. Mieux vaut le découvrir un mardi
à 20 h qu'après une coupure de courant.
:::

## Gérer plusieurs machines

Sur un petit parc, répéter `pro attach` sur chaque serveur suffit. Au-delà, deux options :

- intégrer l'attachement à votre outil de déploiement, en lisant le jeton depuis un coffre ;
- inscrire les machines à **Landscape**, inclus dans l'abonnement, qui donne une vue de flotte et permet
  de déclencher les mises à jour depuis une console.

Pour retirer une machine du contrat — décommissionnement, changement d'usage — pensez à la détacher,
sinon elle continue de consommer une place :

```bash
sudo pro detach
```

## Pour aller plus loin

- Le serveur Ubuntu qui profite le plus de Livepatch chez nous :
  [Concentrateur rsyslog en Docker pour un SOC](/docs/conteneurs/concentrateur-rsyslog-en-docker-pour-un-soc/).
- Le pendant côté organisation, quand il faut prouver que les correctifs sont appliqués :
  [Mettre à jour sa charte informatique pour NIS2](/docs/dsi/mettre-a-jour-sa-charte-informatique-pour-nis2/).
- Les autres fiches [Linux](/docs/linux/).
- La documentation officielle [Ubuntu Pro](https://documentation.ubuntu.com/pro/).

<!-- source : notifications de renouvellement Ubuntu Pro, 2025-09-30 ; mail « Livepatch actif sur les serveurs », 2025-11-19 -->

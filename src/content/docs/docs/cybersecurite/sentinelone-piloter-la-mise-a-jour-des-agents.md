---
title: "SentinelOne : installer, mettre à jour et surveiller les agents Windows et Linux"
description: "Calendrier imposé par le SOC, pilote sur un groupe taggé, installation silencieuse avec token, poste hors ligne et branche 24.3 pour les vieux OS : mettre à jour un agent EDR sans casser le parc."
published: 2026-08-04
category: cybersecurite
tags: [sentinelone, edr, soc, windows, linux, deploiement]
level: intermédiaire
status: à jour
featured: false
tested_on: [SentinelOne agent Windows 25.2 SP2, SentinelOne agent Windows 24.3.6 SP3, SentinelOne agent Linux 25.4 GA]
---

Un agent EDR n'est pas un logiciel comme les autres. Il tourne au plus près du noyau, il voit tout, il peut
isoler une machine du réseau, et s'il se met à mal fonctionner, c'est l'ensemble du parc qui devient soit
aveugle, soit injoignable. On ne le met donc pas à jour comme un lecteur PDF, en poussant la dernière version
un vendredi soir.

Chez moi, l'EDR SentinelOne est supervisé par un Micro-SOC externe, ce qui ajoute une contrainte de
calendrier : c'est le SOC qui annonce la fin de support des anciens agents et qui fixe les échéances. Au
printemps 2026, la consigne était claire : agents Linux à passer en 25.4 GA avant début mai, agents Windows à
passer en 25.2 SP2 via un pilote de deux semaines fin juin, puis généralisation. Voici comment j'ai organisé
ça, et les quelques détails d'installation qui font gagner une journée.

## Prérequis

- Un accès à la console de gestion SentinelOne (ou à celle du SOC qui la porte), avec le droit de créer des
  groupes et des politiques.
- Le token d'installation du site ou du groupe cible, récupéré dans la console. Il lie l'agent à la bonne
  politique dès la première connexion.
- Les paquets d'installation des versions cibles, téléchargés depuis la console : exécutable ou MSI pour
  Windows, paquet rpm ou deb pour Linux.
- Un inventaire à jour des systèmes d'exploitation du parc, y compris ce qui traîne au pied des machines dans
  l'atelier.

## Choisir la bonne branche d'agent selon l'OS

La première erreur à éviter est d'imaginer qu'une seule version couvre tout le parc. Les agents récents
abandonnent les systèmes anciens, et une PME industrielle en a toujours quelques-uns.

| Système | Branche d'agent | Remarque |
| --- | --- | --- |
| Windows et Windows Server actuels, 64 bits | 25.2 SP2 (build 25.2.6.442) | Branche courante, déployée via pilote |
| Windows 7 / 8, Server 2008 R2 / 2012, systèmes 32 bits | 24.3.6 SP3 | Dernière branche compatible : à garder, pas à migrer |
| Linux (serveurs, appliances) | 25.4 GA | Échéance imposée par le SOC début mai 2026 |

:::caution
Depuis les agents 25.x, le service `SentinelStaticEngine` est fusionné dans `SentinelAgent`. Si vos scripts de
supervision ou vos rapports d'inventaire vérifient la présence de ce service, ils vont signaler une anomalie
sur tous les postes migrés. Mettez-les à jour avant le pilote, pas après le premier ticket.
:::

## Monter un groupe pilote qui ressemble au parc

Le SOC demandait un pilote de deux semaines. Un pilote qui ne contient que les postes du service informatique
ne prouve rien : ces machines sont propres, à jour, et personne n'y lance un logiciel d'automatisme. Il faut
des postes représentatifs de ce que les gens font vraiment : bureautique, nomades, techniciens avec leurs
outils métier, au moins un serveur.

1. Dans la console, créez un tag ou un groupe dédié. J'ai utilisé le tag « Pilote Endpoint / Windows »,
   lisible par le SOC comme par moi.
2. Affectez-lui une politique qui reprend la politique de production, avec la version d'agent cible.
3. Déployez la mise à jour sur ce groupe seulement, et prévenez les utilisateurs concernés qu'ils sont
   cobayes.
4. Observez pendant la fenêtre convenue : chez moi, du 25 juin au 8 juillet 2026. Ce que vous cherchez, ce
   n'est pas une alerte de sécurité, c'est un logiciel métier qui ne démarre plus ou un poste qui rame.
5. Si rien ne remonte, basculez la politique de production sur la nouvelle version et laissez la mise à jour
   se propager par vagues.

:::tip
Un pilote n'est utile que si quelqu'un regarde. Bloquez-vous dix minutes par jour pour ouvrir la console,
filtrer sur le tag et lire les événements. Sinon, la fenêtre de deux semaines se termine sans autre résultat
que « personne ne s'est plaint », ce qui n'est pas un résultat.
:::

## Installer un agent Windows en silence

Le SOC fournit un exécutable. Point important qui fait perdre du temps la première fois : cet exécutable n'a
pas d'interface graphique. Double-cliquer dessus ne montre rien, et un technicien conclut qu'il ne s'est rien
passé. Si vous voulez une installation avec fenêtre, prenez le paquet MSI. Pour un déploiement scripté,
l'exécutable et son token suffisent :

```powershell title="Installation silencieuse avec le token du site ou du groupe"
.\SentinelOneInstaller_windows_64bit_v25_2_6_442.exe -t "<token du site ou du groupe>"
```

Le token détermine dans quel site et quel groupe l'agent apparaîtra, donc quelle politique il appliquera.
Prenez celui du groupe pilote pendant le pilote, celui de la production ensuite.

### Poste sans accès à la console au moment de l'installation

Par défaut, l'installateur vérifie qu'il joint la console avant de s'installer. Sur un poste préparé hors
ligne, ou derrière un réseau qui n'a pas encore l'ouverture nécessaire, l'installation échoue pour cette seule
raison. Le SOC m'a transmis la syntaxe suivante pour ce cas :

```powershell title="Installation sans vérification de connexion à la console"
.\SentinelOneInstaller_windows_64bit_v25_2_6_442.exe -t "<token>" -a "NO_CONNECTION_FROM_INSTALLER_TO_MGMT=false"
```

L'agent s'enregistrera à sa première connexion réseau utile.

:::note
Les paramètres passés via `-a` évoluent d'une branche d'agent à l'autre. Avant de les intégrer à un script de
déploiement, vérifiez leur libellé et leur valeur dans la documentation de la version exacte que vous
installez.
:::

### Vérifier après installation

```powershell title="Contrôle rapide sur un poste"
Get-Service SentinelAgent | Select-Object Name, Status, StartType

$ctl = Get-ChildItem "$env:ProgramFiles\SentinelOne\Sentinel Agent *\SentinelCtl.exe" | Select-Object -First 1
& $ctl.FullName version
& $ctl.FullName status
```

Le poste doit aussi apparaître dans la console, dans le bon groupe, avec la bonne version, dans les minutes
qui suivent. S'il apparaît dans le mauvais groupe, c'est le token qui était mauvais, pas l'agent.

## Mettre à jour les agents Linux

Sur Linux, l'agent se gère avec `sentinelctl`. Le passage en 25.4 GA se fait en installant le nouveau paquet
par-dessus l'ancien, puis en vérifiant que l'agent est bien reconnecté à la console.

```bash title="Mise à jour d'un agent Linux (distribution rpm)"
sudo rpm -Uvh SentinelAgent_linux_x86_64_v25_4_*.rpm
sudo /opt/sentinelone/bin/sentinelctl version
sudo /opt/sentinelone/bin/sentinelctl control status
```

Sur une distribution deb, remplacez `rpm -Uvh` par `dpkg -i`. Pour une première installation, il faut en plus
fournir le token puis démarrer l'agent :

```bash title="Première installation d'un agent Linux"
sudo /opt/sentinelone/bin/sentinelctl management token set "<token du site ou du groupe>"
sudo /opt/sentinelone/bin/sentinelctl control start
```

Si votre SOC préfère piloter les mises à jour Linux depuis la console (action de mise à niveau sur le
groupe), c'est encore plus simple, mais vérifiez ensuite la version sur chaque machine plutôt que de faire
confiance au tableau de bord.

## Surveiller ce qui a été déployé

Une fois la généralisation lancée, trois contrôles suffisent :

- **La répartition des versions** dans la console, filtrée par groupe : tout ce qui reste sur une ancienne
  branche doit avoir une raison (OS ancien) ou un ticket.
- **Le rapport CVE** que la console peut générer : je le sors régulièrement depuis mars 2026, il montre les
  vulnérabilités connues sur le parc et sert de base au rapport mensuel du SOC, qui couvre l'EDR, l'accès
  Internet et la protection mobile.
- **Les notifications** : SentinelOne propose en bêta une nouvelle plateforme de notifications, que je
  teste pour recevoir les changements d'état d'agents sans ouvrir la console.

## Retrouver l'accès à la console quand le second facteur est perdu

Si vous perdez votre second facteur sur la console (nouveau téléphone, application réinitialisée), vous ne
pouvez pas le remettre à zéro vous-même : la demande passe par le portail client du Micro-SOC, sous forme de
ticket, et quelqu'un de l'autre côté vérifie qui vous êtes avant de réinitialiser le 2FA. C'est lent par
conception, et c'est très bien ainsi.

Ce qui l'est moins, c'est de découvrir ce chemin le jour où on en a besoin. Notez-le dans votre procédure de
remplacement, avec l'adresse du portail et le type de ticket à ouvrir : la personne qui vous remplace pendant
vos vacances n'aura ni votre téléphone, ni le temps de chercher.

## Pour aller plus loin

- [Un poste isolé par l'EDR : que faire, dans quel ordre, et comment documenter l'incident](/docs/cybersecurite/poste-isole-par-l-edr-que-faire/),
  la face opérationnelle du même agent.
- [Joindre une machine Linux au domaine avec authselect et winbind](/docs/linux/joindre-une-machine-linux-au-domaine-avec-authselect-et-winbind/),
  pour les serveurs Linux qui reçoivent aussi l'agent.
- [Procédure de remplacement IT pendant une absence](/docs/dsi/procedure-de-remplacement-it-pendant-une-absence/),
  où le chemin de réinitialisation du 2FA doit figurer.

<!-- source : notices Micro-SOC agents Linux 25.4 (04/2026) et pilote Windows 25.2 SP2 (2026-06-25 -> 2026-07-08), rapport CVE 2026-03-26, ticket reset 2FA 2026-08-03 -->

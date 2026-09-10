---
title: "Un poste isolé par l’EDR : que faire, dans quel ordre, et comment documenter l’incident"
description: "L'EDR vient de couper un poste du réseau. Vrai malware, application non autorisée ou installateur d'automatisme trop bavard : la marche à suivre avec un SOC externe, de la console au mail « qui sert juste de trace »."
published: 2026-09-04
category: cybersecurite
tags: [sentinelone, edr, soc, incident, automatisme, omron]
level: intermédiaire
status: à jour
featured: false
tested_on: [SentinelOne, Omron Sysmac Studio, Omron CX-One]
---

Le scénario commence toujours pareil : un utilisateur appelle parce que « plus rien ne marche ». Pas de
réseau, pas d'Internet, pas de partages, mais le PC est allumé et la session ouverte. Pendant ce temps, une
notification du SOC est arrivée : l'EDR a détecté quelque chose et a isolé le poste.

En un an, j'ai eu ce cas plusieurs fois, pour des raisons très différentes : une application non autorisée
(OneBrowser) détectée sur un poste du site américain en janvier, un poste d'utilisateur distant avec un vrai
soupçon de virus en mars, puis, à deux reprises entre août et septembre, des techniciens automatisme dont
l'installation de Sysmac Studio ou de CX-One (les outils de programmation Omron) a déclenché l'EDR. Trois
familles de cas, une seule procédure.

## Comprendre ce que l'isolation fait vraiment

L'isolation réseau par un EDR, ce n'est pas le switch qui coupe le port. C'est l'agent, sur le poste, qui
bloque tout trafic entrant et sortant sauf sa propre communication avec la console. Le poste reste donc
pilotable à distance par l'EDR, et l'analyste du SOC peut continuer à collecter ce qu'il lui faut.

Deux conséquences pratiques :

- Brancher le poste sur un autre réseau, en Wi-Fi ou en partage de connexion, ne change rien. L'isolation
  suit le poste, pas le câble. Dites-le à l'utilisateur avant qu'il n'essaie.
- Redémarrer ne lève pas l'isolation non plus. Seule une action dans la console, par vous ou par le SOC,
  reconnecte le poste.

C'est une chambre d'isolement à l'hôpital : le patient n'est pas abandonné, il est séparé des autres le temps
de savoir ce qu'il a.

## Prérequis

- Un accès à la console EDR avec le droit de lire les menaces et de reconnecter un poste.
- Le canal du SOC (portail de tickets) pour lire leur verdict et demander une exclusion.
- Un moyen de joindre l'utilisateur autrement que par le réseau du poste : téléphone, mobile, collègue voisin.

## Identifier la menace et lire le verdict du SOC

Dans la console, ouvrez la menace associée au poste. Vous cherchez quatre informations :

1. **Le processus ou le fichier** en cause, avec son chemin complet. Un installateur dans le dossier
   Téléchargements et un binaire dans un dossier système ne racontent pas la même histoire.
2. **Le hash** du fichier, pour le comparer à ce que vous connaissez : un installateur officiel téléchargé sur
   le site de l'éditeur a un hash reproductible.
3. **Le comportement détecté** : exécution, persistance, activité réseau. C'est ce qui a fait basculer la
   détection en isolation.
4. **Le verdict du SOC** dans leur ticket : confirmé, faux positif probable, ou en attente d'information de
   votre part.

| Cas vécu | Déclencheur | Verdict | Action |
| --- | --- | --- | --- |
| Poste du site américain | Application OneBrowser détectée | Accès non autorisé | Désinstallation, vérification, réautorisation |
| Poste d'un utilisateur distant | Comportement suspect à l'exécution | Soupçon de virus | Nettoyage, vérification, reconnexion, mail à l'utilisateur |
| Postes de techniciens automatisme | Installateurs Sysmac Studio, puis CX-One | Faux positif métier récurrent | Reconnexion, puis exclusion ciblée demandée au SOC |

## Nettoyer, vérifier, reconnecter

L'ordre compte. On nettoie d'abord, on reconnecte ensuite. Jamais l'inverse, même pour faire plaisir à un
utilisateur pressé.

1. **Supprimer la cause** : désinstaller l'application, supprimer le fichier, ou laisser l'EDR appliquer sa
   remédiation si le SOC la recommande.
2. **Vérifier l'absence de persistance** : tâches planifiées, clés d'exécution automatique, services créés
   récemment, extensions de navigateur. Un logiciel indésirable qui revient au redémarrage n'a pas été
   nettoyé, il a été déplacé.
3. **Relire les événements** de la menace dans la console pour vous assurer qu'aucun autre processus n'est
   impliqué.
4. **Reconnecter** le poste depuis la console (action de reconnexion sur l'endpoint), ou demander au SOC de
   le faire selon votre répartition des rôles.
5. **Prévenir l'utilisateur** que le poste est de nouveau sur le réseau, et ce qu'il ne doit pas refaire.

```powershell title="Vérifications rapides de persistance sur le poste"
Get-ScheduledTask |
  Where-Object { $_.Date -and [datetime]$_.Date -gt (Get-Date).AddDays(-7) } |
  Select-Object TaskName, TaskPath, Date

Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run',
                 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'

Get-CimInstance Win32_Service |
  Where-Object StartMode -eq 'Auto' |
  Select-Object Name, PathName |
  Sort-Object Name
```

:::caution
Ne désactivez jamais l'agent EDR pour « débloquer » un poste, même temporairement, même pour un technicien
qui a une machine à livrer. Un poste sans agent est invisible pour le SOC, et vous venez de créer exactement
l'angle mort qu'un attaquant cherche. Si l'agent gêne, c'est la politique qu'il faut ajuster, pas l'agent
qu'il faut éteindre.
:::

## Écrire le mail « qui sert juste de trace »

Chaque isolation se termine chez moi par un mail court à l'utilisateur et à son responsable. Je l'annonce
comme tel : il sert juste de trace. Personne n'est puni, personne n'a à se justifier, mais dans six mois,
quand quelqu'un demandera pourquoi ce poste a été coupé du réseau tel jour, la réponse existera.

Le mail tient en trois paragraphes :

```text title="Squelette du mail de trace"
Objet : Isolation temporaire du poste <nom du poste> – <date>

Ce qui s'est passé : l'EDR a détecté <application / fichier> sur le poste
et l'a isolé du réseau à <heure>.

Pourquoi : <application non autorisée / comportement suspect / installateur
détecté comme malveillant>.

Ce qui a été fait : <désinstallation / nettoyage>, vérification de l'absence
de persistance, poste reconnecté à <heure>.
Rappel : <ce qu'il ne faut pas refaire, ou « aucune action de votre part »>.
```

Pour le cas OneBrowser en janvier, ce mail disait en substance : application détectée, accès non autorisé,
désinstallée, poste vérifié et réautorisé. Cinq lignes. Pour le poste distant de mars, il commençait par
« vous avez sans doute reçu un virus », parce que c'est ce que l'utilisateur avait besoin de comprendre avant
le reste.

## Traiter les faux positifs métier par exclusion, pas par désactivation

Les logiciels d'automatisme industrielle ont tout pour déplaire à un EDR : installateurs volumineux, pilotes
de communication, scripts lancés à l'installation, exécutables peu répandus. Vus par un moteur comportemental,
Sysmac Studio ou CX-One en train de s'installer ressemblent à un malware qui prend ses aises. Dès qu'un même
logiciel isole un deuxième poste, ce n'est plus un incident, c'est un faux positif récurrent, et il se traite
en amont.

1. Ouvrez un ticket au SOC avec le nom du logiciel, l'éditeur, la version, le chemin d'installation, le hash
   de l'installateur et le lien de téléchargement officiel.
2. Demandez une **exclusion ciblée** : sur le chemin, le hash ou le certificat de signature de l'éditeur,
   limitée au groupe des postes concernés (les techniciens automatisme), pas à tout le parc.
3. Faites valider par le SOC, puis testez l'installation sur un poste du groupe avant de prévenir les
   techniciens.
4. Notez l'exclusion dans votre documentation, avec sa justification : une exclusion sans justification est
   une porte ouverte que personne ne saura refermer.

C'est ce qui a été fait en août 2026 pour Sysmac Studio. Le mois suivant, un nouveau poste a été isolé lors
d'une installation de CX-One, un autre outil du même éditeur. Leçon : quand vous demandez une exclusion pour
un logiciel d'automatisme, listez dès le départ toute la gamme d'outils que vos techniciens utilisent, pas
seulement celui qui a déclenché la première alerte.

:::note
Les alertes qui viennent du renseignement sur les menaces (un indicateur de compromission issu de la CTI du
XDR) ou d'une détection générique comme « Linux Bash Reverse Shell » ne se traitent pas par exclusion. Elles
demandent une vérification manuelle : qui a lancé quoi, depuis où, et si c'est un script d'administration
légitime, il faut le documenter, pas le blanchir.
:::

## Alimenter les rapports

Chaque isolation nourrit deux documents : le rapport mensuel du SOC (EDR, accès Internet, protection mobile),
qui liste les incidents et leur traitement, et le rapport de sécurité que je transmets à la RH. Ce n'est pas
de la paperasse : c'est ce qui rend visible un travail qui, sinon, n'existe pour personne, et ce qui justifie
une exclusion, un rappel de charte ou une formation le jour où la question se pose.

Un poste isolé, c'est une demi-heure de travail quand tout est en place, et une demi-journée quand rien ne
l'est. La différence tient dans quatre choses : savoir lire la console, connaître le canal du SOC, avoir un
squelette de mail prêt, et avoir décidé à l'avance que l'agent ne se désactive jamais.

## Pour aller plus loin

- [SentinelOne : installer, mettre à jour et surveiller les agents Windows et Linux](/docs/cybersecurite/sentinelone-piloter-la-mise-a-jour-des-agents/),
  pour la partie déploiement du même agent.
- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/),
  parce que le mail de trace est aussi un mail que l'utilisateur doit comprendre.
- [Procédure de remplacement IT pendant une absence](/docs/dsi/procedure-de-remplacement-it-pendant-une-absence/),
  pour que quelqu'un sache quoi faire quand le poste isolé tombe pendant vos congés.

<!-- source : mails « Isolation temporaire du poste – application OneBrowser » 2026-01-20, isolation poste distant 2026-03-31, tickets helpdesk Sysmac Studio 2026-08-03 et CX-One 2026-09-03, tickets Micro-SOC exclusion Omron 2026-08-10 et « Linux Bash Reverse Shell » 2026-09-02 -->

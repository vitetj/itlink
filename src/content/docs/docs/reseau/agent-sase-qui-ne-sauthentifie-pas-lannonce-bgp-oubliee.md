---
title: "L'agent SASE ne s'authentifie pas depuis le LAN : l'annonce BGP oubliée"
description: "Un agent SASE qui refuse de s'authentifier sur le réseau interne ressemble à un problème d'agent ou de licence. C'est un problème de routage. La méthode pour le prouver en quatre étapes."
published: 2026-07-23
category: reseau
tags: [sase, bgp, routage, cato, diagnostic, ztna]
level: expert
status: à jour
featured: false
tested_on: [Cato Client Windows, Orange BVPN]
sidebar:
  label: "L'agent SASE ne s'authentifie pas depuis le LAN"
---

Le symptôme est déroutant parce qu'il est à l'envers de ce qu'on attend. Sur le réseau interne de l'entreprise,
là où tout est censé être le plus simple, l'agent SASE n'arrive pas à s'authentifier. Il ne détecte pas qu'il est
sur un réseau de confiance, ne bascule ni en Identity Agent ni en mode bureau, et reste dans un état instable.
Depuis l'extérieur, tout fonctionne. Et quand un poste revient de l'extérieur vers le LAN, il faut deux à trois
minutes avant que la bascule se fasse.

Le premier réflexe est de suspecter l'agent : version, licence, profil, antivirus, anti-tamper. J'ai perdu du
temps là-dessus. La cause était une route manquante — pas une route vers un de mes réseaux, mais vers le réseau
de services internes de l'éditeur du SASE. Voici la méthode de diagnostic, dans l'ordre où elle m'aurait fait
gagner une semaine.

## Prérequis

- Un accès administrateur sur un poste du LAN concerné.
- La documentation de l'éditeur sur les plages et les points d'API que son agent doit joindre.
- Un interlocuteur capable de vous répondre sur ce qui est annoncé en BGP entre votre cœur de réseau et le
  fournisseur SASE. Chez moi, le routeur du VPN opérateur est infogéré : je ne vois pas la table, je dois la
  demander.

## Poser le problème avant de le chercher

Un agent SASE en mode bureau ne se contente pas de « voir » le réseau local. Il doit joindre un point d'API de
l'éditeur pour s'authentifier, se caractériser et décider s'il ouvre son propre tunnel ou s'il laisse le trafic
emprunter celui du site.

Le point important, et celui qui n'est jamais dans le guide d'installation : **ce point d'API ne vit pas
forcément sur Internet**. Chez plusieurs éditeurs, il est publié à l'intérieur d'un réseau de services internes,
en adressage privé. C'est une classe de panne à connaître, parce qu'elle transforme un problème d'authentification
en problème de routage : le poste connaît un nom, obtient une adresse privée, et n'a aucun chemin vers elle.

Formulez donc l'hypothèse avant de chercher : *l'agent n'échoue pas à s'authentifier, il échoue à joindre ce
avec quoi il doit s'authentifier.* Tout le reste de la démarche consiste à valider ou à réfuter cette phrase.

## Étape 1 — Établir ce que l'agent essaie de joindre

Résolvez le point d'API de l'éditeur depuis un poste du LAN, pas depuis un poste distant.

```cmd title="Résoudre le point d'API du fournisseur SASE"
nslookup tunnel-api.catonetworks.com
```

Si la réponse est une adresse privée — dans mon cas une adresse de la plage `10.254.254.0/24`, que l'éditeur
documente publiquement comme son réseau de services internes — l'hypothèse tient déjà debout. Vous cherchez
désormais une route, pas un bug d'agent.

Complétez avec l'état des connexions du processus de l'agent, pour vérifier qu'il tente bien d'atteindre cette
adresse et qu'il reste en `SYN_SENT` :

```powershell title="Voir ce que tente l'agent"
Get-NetTCPConnection -State SynSent |
  Select-Object LocalAddress, RemoteAddress, RemotePort, OwningProcess |
  Format-Table -AutoSize
```

Une connexion bloquée en `SYN_SENT` vers une adresse privée hors de votre plan d'adressage est une preuve, pas
un indice.

## Étape 2 — Vérifier ce que le poste sait faire de cette adresse

```cmd title="Interroger la table de routage du poste"
route print 10.254.254.0
tracert -d <adresse retournée par le nslookup>
```

Puis regardez comment sort le trafic Internet ordinaire, en forçant une destination publique connue :

```cmd title="Observer le chemin de sortie réel"
tracert -d 1.1.1.1
tracert -d 8.8.8.8
```

Dans une architecture où l'Internet du site passe par un lien privé puis par le PoP du fournisseur, il est
normal que ces traces restent en adressage privé sur les premiers sauts. Ce qui n'est pas normal, c'est
qu'aucun saut public n'apparaisse **avant** la sortie Internet, ou que la trace vers l'adresse du point d'API
meure au premier routeur. Vous savez alors que le poste envoie bien le paquet, et que c'est le cœur de réseau
qui n'en veut pas.

## Étape 3 — Comprendre pourquoi la route par défaut ne suffit pas

C'est ici que l'affaire devient intéressante, et c'est le point que je n'avais pas anticipé.

Ma session BGP entre le routeur du VPN opérateur et le fournisseur SASE transportait deux choses : mes réseaux
internes, et une route par défaut. J'en avais conclu que tout ce qui n'était pas à moi partirait par la route
par défaut, y compris le point d'API de l'éditeur.

Faux, à cause du **longest prefix match**. Une destination n'emprunte jamais la route par défaut si un préfixe
plus spécifique la couvre. Dans un cœur de réseau d'entreprise, les plages privées sont presque toujours
couvertes par un agrégat — un `10.0.0.0/8` ou un ensemble de préfixes internes portés dans le VRF. L'adresse du
point d'API tombe dans cet agrégat, elle est routée vers l'intérieur, et elle meurt là où personne ne la connaît.
La route par défaut n'est jamais consultée.

:::caution
C'est le piège de fond : une plage privée appartenant à un tiers ne se comporte pas comme de l'Internet. Elle est
capturée par votre routage interne avant d'avoir une chance de sortir. Une route par défaut, même correcte, ne
la couvre pas.
:::

La question à poser à qui exploite le routeur est donc précise, et une seule formulation donne une réponse
exploitable :

```text title="La demande à formuler, pas la question à poser"
Merci de me confirmer les préfixes réellement annoncés et reçus sur la session BGP
entre le routeur du site et le PoP du fournisseur, dans les deux sens.
Objectif : le préfixe 10.254.254.0/24 (réseau de services internes de l'éditeur)
doit être appris par le site.
```

Demander « est-ce que le BGP est bon ? » vous vaudra un « oui ». Demander la liste des préfixes annoncés et
reçus vous donne la panne.

## Étape 4 — Faire ajouter l'annonce et valider

Le correctif tient en une ligne de configuration chez l'opérateur : annoncer le préfixe des services internes de
l'éditeur vers le site, à travers la session BGP existante. Selon la façon dont votre partenaire exploite le
routeur, ce sera une annonce BGP ou une route statique redistribuée — le résultat compte, pas la méthode.

Chez moi, l'effet a été immédiat et sans redémarrage : détection correcte du réseau interne, authentification
instantanée, mode bureau opérationnel. La validation se fait dans l'ordre inverse du diagnostic :

1. `route print 10.254.254.0` sur un poste du LAN retourne désormais un chemin.
2. `Test-NetConnection` sur le port du point d'API répond.
3. L'agent affiche l'état « bureau » sans intervention.
4. Un poste qui revient de l'extérieur bascule en quelques secondes, plus en deux ou trois minutes.

```powershell title="Contrôle final depuis un poste du LAN"
Test-NetConnection -ComputerName tunnel-api.catonetworks.com -Port 443
```

## Ce que j'ajoute désormais à toute checklist avant bascule

Cette panne n'aurait pas existé si j'avais posé une question au bon moment. Elle est maintenant dans mon
document de préparation, et je la pose à tout fournisseur qui livre un agent :

- Quelles sont **toutes** les destinations que votre agent doit joindre, avec les plages exactes et les ports ?
- Lesquelles sont publiques, lesquelles sont dans un réseau de services qui vous appartient ?
- Ces plages doivent-elles être jointes depuis Internet, depuis le tunnel du site, ou depuis les deux ?
- Qui, dans la chaîne opérateur — fournisseur — infogérant, est responsable de les router ?

Les quatre réponses tiennent en un paragraphe. Leur absence coûte une semaine.

## Pour aller plus loin

- [Agent Cato : Office Mode qui ne s'active pas, Always-On et bypass temporaire contrôlé pour les techniciens](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/)
- [Basculer la passerelle par défaut vers MPLS et SASE](/docs/reseau/basculer-la-passerelle-par-defaut-vers-mpls-et-sase/)
- [Diagnostiquer une résolution DNS interne cassée par un client VPN tiers ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/)

<!-- source : mail « Point global sur le déploiement Cato » et sa suite, 2026-07-21 -->

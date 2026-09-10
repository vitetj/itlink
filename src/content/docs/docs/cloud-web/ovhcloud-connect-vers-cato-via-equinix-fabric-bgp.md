---
title: "Interconnecter OVHcloud Connect et Cato Networks via Equinix Fabric en BGP"
description: "Déploiement manuel côté Cato, Service Token Equinix, VLAN OVHcloud contre VLAN Equinix, peering /30 et la règle que personne n'écrit : OVHcloud prend toujours la première IP. Deux semaines de « No route to host »."
published: 2026-07-27
category: cloud-web
tags: [ovhcloud, cato, equinix, bgp, vrack, interconnexion]
level: expert
status: à jour
featured: false
tested_on: ["Cato Cloud Interconnect (PoP Paris)", "Equinix Fabric Paris", "OVHcloud Connect avec vRack", "Stormshield EVA"]
---

Ma boîte héberge une partie de ses machines virtuelles chez OVHcloud, dans un vRack. Jusqu'ici, on y accédait par un
VPN classique. Avec le passage à un SASE Cato Networks, la logique change : le réseau d'entreprise, c'est le PoP
Cato, et tout ce qui doit être joignable en privé doit y être raccordé directement. Pour OVHcloud, le chemin propre
est une interconnexion physique : Cato Cloud Interconnect au PoP de Paris, une connexion Equinix Fabric, et un
OVHcloud Connect qui débouche dans le vRack. Aucune adresse publique, aucun tunnel à maintenir, un port de
50 Mbit/s. L'alternative Azure a été regardée et laissée de côté : « le moindre clic est payant ».

Sur le papier, trois acteurs et deux sessions BGP. Dans la vraie vie, quinze jours de session bloquée en
`Connect (No route to host)`, jusqu'à ce qu'un ingénieur trouve la convention que personne n'avait écrite. Cette fiche
la documente, avec le reste.

## Comprendre la chaîne

| Segment | Qui provisionne | Ce qui prouve que ça marche |
|---|---|---|
| PoP Cato ↔ port Equinix Fabric | Cato, manuellement | Site Cloud Interconnect visible dans la console Cato |
| Connexion Equinix Fabric | Equinix, sur Service Token | Connexion « Provisioned » |
| Equinix ↔ OVHcloud Connect | OVHcloud et Equinix | OCC « Available », VLAN Equinix mappé |
| OVHcloud Connect (L3) ↔ Cato | Vous, via l'API OVHcloud et la console Cato | Session BGP « Established » des deux côtés |
| OVHcloud Connect ↔ vRack | Vous : zone de disponibilité et routeur BGP | Session BGP entre OVHcloud et votre routeur |

Retenez la troisième ligne : « Provisioned » chez Equinix et « Available » chez OVHcloud veulent dire que le tuyau de
niveau 2 existe. Rien de plus. Le BGP, c'est votre problème.

## Prérequis

- Un compte Cato avec l'option Cloud Interconnect, et le partenaire (ici un MSSP) prêt à porter la demande.
- Un OVHcloud Connect commandé sur Equinix Paris, un vRack, et une machine dans ce vRack capable de parler BGP : chez
  nous une appliance virtuelle Stormshield EVA, dont le routage dynamique repose sur Bird.
- Un ASN privé de chaque côté et un /30 pour le peering, pris dans `169.254.0.0/16`.
- Un contact technique direct chez Cato ou Equinix. Le support standard, quand on passe par un MSSP, est un
  « passe-plat » : chaque question fait l'aller-retour. Demandez une visio avec un ingénieur ; un petit Teams ira plus
  vite que des mails interminables.

## Ouvrir la demande de déploiement manuel chez Cato

OVHcloud ne figure pas dans la liste des fournisseurs cloud pris en charge automatiquement par Cloud Interconnect. Le
ticket s'intitule « Manual Cloud Interconnect deployment required » : Cato confirme que le PoP de Paris est
compatible, mais le provisioning est fait à la main par Cato et le partenaire. Comptez quelques jours, et posez dès ce
ticket les questions de peering (ASN, /30, préfixes annoncés) pour éviter un second tour.

## Générer le Service Token Equinix et surveiller sa date

Le Service Token Equinix autorise la création de la connexion Fabric vers le port de l'autre partie. Il a une date
d'expiration. Le nôtre a expiré en plein débogage, entre deux tentatives ; il a fallu en régénérer un et refaire la
demande. Notez la date dans le ticket, et si le diagnostic s'éternise, régénérez avant qu'il ne tombe.

## Commander l'OVHcloud Connect et lire les bons états

Une fois l'OCC livré, l'espace client OVHcloud affiche deux VLAN, et c'est là que j'ai perdu du temps. Le VLAN
Equinix (un identifiant élevé, `3601` dans notre exemple) est celui du mapping côté Fabric. Le VLAN interne
OVHcloud (un petit numéro) est un transport interne qui n'a rien à voir avec ce mapping ; le support OVHcloud l'a
confirmé. Ne cherchez pas à les faire correspondre.

## Configurer le peering BGP entre OVHcloud et Cato

Voici la partie qui vaut la fiche. Le peering se fait sur un /30 en adressage link-local, avec un ASN privé de chaque
côté. Et il existe une règle qui n'est écrite ni dans le flux de configuration d'OVHcloud, ni dans celui de Cato :
**OVHcloud prend toujours la première adresse utilisable du /30, et cela ne se change pas.** Cato doit donc prendre la
seconde.

| Paramètre | Côté OVHcloud | Côté Cato |
|---|---|---|
| Sous-réseau de peering | `169.254.10.0/30` | `169.254.10.0/30` |
| Adresse locale | `169.254.10.1` (première utilisable, imposée) | `169.254.10.2` |
| ASN local | `AS64497` (privé) | `AS64496` (privé) |
| Voisin | `169.254.10.2`, `AS64496` | `169.254.10.1`, `AS64497` |

Nous avions fait l'inverse. L'ingénieur Cato/Equinix aussi, de son propre aveu : « I had it the other way round ».
Le symptôme, dans l'état de la session côté Cato :

```text
Last sent socket-error: Connect (No route to host)
```

Un `No route to host` sur une session BGP qui n'a jamais monté, alors que le niveau 2 est « Provisioned » partout,
c'est le signe que les deux extrémités ne se parlent pas sur les adresses qu'elles croient. Avant d'ouvrir un ticket,
échangez les deux adresses.

## Déclarer la zone et le routeur BGP dans le vRack

Un OCC de niveau 3 ne sait pas, seul, où livrer les paquets dans votre vRack. Il faut lui déclarer une zone de
disponibilité (Availability Zone) et un voisin BGP : le champ `bgpNeighborIp` de la configuration doit désigner un
routeur réellement présent dans le vRack. Chez nous, l'adresse vRack de l'EVA (`10.20.0.254` dans l'exemple), avec
son ASN privé (`AS64498`). Sur l'EVA, dans `Configuration > Réseau > Routage dynamique`, la session se déclare en
quelques lignes de configuration Bird, à adapter à la version embarquée :

```text title="Squelette Bird sur l'EVA"
protocol bgp occ {
    local as 64498;
    neighbor 10.20.0.1 as 64497;
    import all;
    export where net ~ [ 10.20.0.0/16+ ];
}
```

N'oubliez pas les règles de filtrage de l'EVA : BGP en TCP 179 depuis le voisin OVHcloud, et les flux applicatifs
depuis les préfixes reçus.

## Annoncer les préfixes et valider

Chaque côté annonce ce qu'il possède : les préfixes du vRack depuis OVHcloud, les réseaux du siège depuis Cato. Dans
la console Cato, la session doit passer en « Established » et le nombre de préfixes reçus doit correspondre. Depuis
un poste du siège, un `tracert -d` vers une VM du vRack ne doit montrer aucun saut public : MPLS, PoP, Equinix,
OVHcloud. Terminez par un procès-verbal de réception signé avec le partenaire, tests et heures à l'appui. Le mail de
clôture, chez nous, tenait en une ligne : problème résolu, nous sommes enfin connectés en direct chez OVHcloud.

:::tip
Enregistrez votre session de diagnostic. J'ai publié la nôtre en vidéo : rien ne vaut un `No route to host` vu en
direct pour convaincre un support qu'il ne s'agit pas d'une erreur de saisie.
:::

## Les pièges, dans l'ordre où ils tombent

1. Croire que « Available » signifie « routé ».
2. Chercher une cohérence entre le VLAN interne OVHcloud et le VLAN Equinix.
3. Mettre Cato sur la première adresse du /30.
4. Laisser expirer le Service Token pendant le débogage.
5. Attendre du support standard une réponse technique quand un MSSP est au milieu.

## Pour aller plus loin

- Le chantier dont cette interconnexion est la dernière pièce : [Basculer la passerelle par défaut d'un Stormshield vers un lien MPLS + SASE](/docs/reseau/basculer-la-passerelle-par-defaut-vers-mpls-et-sase/).
- Le récit complet de la refonte : [Du MPLS au SASE, ce que personne ne vous dit](/blog/du-mpls-au-sase-ce-que-personne-ne-vous-dit/).
- Pour présenter ce type de projet à une direction : [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/).
- Documentation : [OVHcloud Connect](https://www.ovhcloud.com/fr/network/ovhcloud-connect/) et [Equinix Fabric](https://docs.equinix.com/).

<!-- source : mails « Cato Cloud Interconnect », 2026-07-10 → 2026-07-24 ; « ovh », 2026-06-11 ; tickets support Cato « Manual Cloud Interconnect deployment required », 2026-06 -->

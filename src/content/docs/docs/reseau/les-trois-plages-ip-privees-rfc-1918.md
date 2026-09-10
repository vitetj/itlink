---
title: "Les trois seules plages d'adresses IP privées, et pourquoi votre machine ne doit pas être en 195.x"
description: "Il n'existe que trois plages d'adresses IPv4 privées. Tout le reste appartient à quelqu'un, quelque part. Ce que ça change quand on adresse une machine industrielle livrée chez un client."
published: 2026-07-21
category: reseau
tags: [adressage-ip, rfc-1918, automates, reseau-local, bonnes-pratiques]
level: débutant
status: à jour
featured: true
---

En juillet 2026, j'ai découvert que des machines parties en clientèle étaient configurées avec des adresses
en `195.x.x.x`, utilisées comme s'il s'agissait d'un plan d'adressage interne. Personne n'avait fait exprès.
Quelqu'un avait eu besoin d'un réseau pour parler à un automate, avait choisi des chiffres qui « faisaient
adresse IP », et ça marchait — sur l'établi. Le jour où le client monte un VPN vers ce site, ça ne marche plus,
et personne ne comprend pourquoi.

Ce rappel est le plus élémentaire qui soit, et c'est précisément pour ça qu'il mérite une page. Un fondamental
qu'on n'a jamais formellement appris est un fondamental qu'on applique au hasard.

## Publique ou privée : la différence en une phrase

Une adresse IP publique est unique dans le monde entier. Elle est attribuée à une organisation par un registre
régional, et elle est routable sur Internet : si vous l'utilisez, vous prétendez être ce quelqu'un.

Une adresse IP privée n'existe que chez vous. Elle n'est routée nulle part sur Internet, et des millions de
réseaux utilisent les mêmes en même temps sans se gêner.

L'analogie que j'emploie devant un automaticien : l'adresse publique, c'est votre numéro de téléphone
professionnel, celui qui figure sur les cartes de visite et qui n'appartient qu'à vous. L'adresse privée, c'est
votre numéro de poste interne. Le poste 42 existe dans toutes les entreprises de France, et ça ne pose aucun
problème tant que personne n'essaie de le composer depuis l'extérieur.

## Les trois seules plages privées

Elles sont définies par la RFC 1918, et il n'y en a pas d'autres. Ni quatre, ni « celle qu'on utilisait avant ».

```text title="Les trois plages IPv4 privées (RFC 1918)"
10.0.0.0/8        10.0.0.0    →  10.255.255.255      16 777 216 adresses
172.16.0.0/12     172.16.0.0  →  172.31.255.255       1 048 576 adresses
192.168.0.0/16    192.168.0.0 →  192.168.255.255         65 536 adresses
```

Deux pièges dans ce tableau, et je les vois régulièrement :

- La plage `172.16.0.0/12` s'arrête à `172.31.255.255`. `172.32.x.x` est **publique**. Le `/12` n'est pas
  intuitif, et c'est le seul des trois qui ne s'aligne pas sur un octet entier.
- `192.168.x.x` est privée en entier, mais `192.169.x.x` ne l'est pas. Une faute de frappe d'un chiffre vous
  fait sortir de la zone.

:::note
Ces plages ne sont pas « réservées aux petits réseaux ». Le `10.0.0.0/8` est là pour les grandes infrastructures,
et c'est celui que vous devriez utiliser dès que vous avez plus d'une poignée de sous-réseaux à découper.
:::

## Tout le reste appartient à quelqu'un

C'est la phrase à retenir : **toute adresse IPv4 qui n'est pas dans ces trois plages est publique par défaut**,
et elle est probablement attribuée à une organisation quelque part dans le monde.

Le bloc `195.0.0.0/8` fait partie de ceux que l'IANA a délégués au RIPE NCC, le registre régional européen. Ces
adresses sont ensuite distribuées à des opérateurs, des hébergeurs et des points d'échange, essentiellement en
Europe. En mettant `195.x.x.x` sur un automate, vous ne créez pas un réseau privé : vous vous appropriez
l'adresse de quelqu'un d'autre, en général celle d'un fournisseur d'accès.

Quelques autres plages ont un statut particulier, utile à connaître pour ne pas les confondre avec du privé :

| Plage | Statut | À quoi elle sert |
| --- | --- | --- |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | Privée (RFC 1918) | Vos réseaux locaux |
| `127.0.0.0/8` | Loopback | La machine elle-même |
| `169.254.0.0/16` | Link-local (RFC 3927) | Auto-attribution quand le DHCP ne répond pas |
| `100.64.0.0/10` | Partagée (RFC 6598) | NAT d'opérateur, pas pour votre LAN |
| `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` | Documentation (RFC 5737) | Les exemples, comme dans cet article |
| Tout le reste | Publique | Attribuée à une organisation |

### Vérifier à qui appartient une adresse en trente secondes

Plutôt que de me croire sur parole, vérifiez. Depuis n'importe quel poste Linux, ou depuis le site web du RIPE
si vous n'avez pas l'outil sous la main :

```bash title="Comparer une adresse privée et une adresse allouée"
whois 192.168.1.1     # entrée « special purpose » de l'IANA : plage privée
whois 203.0.113.10    # entrée de documentation (RFC 5737)
```

Refaites ensuite l'essai avec l'adresse réellement configurée sur votre machine. Si la réponse contient un
`netname`, une organisation titulaire, un pays et un contact abuse, vous avez votre réponse : cette adresse
appartient à quelqu'un, et ce quelqu'un n'est pas vous.

## Ce qui casse concrètement

Tant que la machine est seule sur son îlot, une adresse publique détournée ne provoque rien de visible. Les
ennuis arrivent au moment de l'interconnexion, c'est-à-dire toujours plus tard, toujours chez le client, et
toujours un jour où vous n'êtes pas sur place :

- **Conflits de routage.** Le poste qui doit parler à la machine a aussi besoin d'Internet. S'il apprend une
  route vers `195.x.x.x` pour joindre l'automate, il perd l'accès aux vrais services hébergés dans ce bloc.
- **Interconnexion impossible.** Dès qu'un VPN, un MPLS ou un SASE est monté vers le site, les plages annoncées
  doivent être cohérentes. Une plage publique usurpée est refusée, ou pire, acceptée et responsable d'une panne
  ailleurs.
- **Diagnostic pollué.** Un `tracert` qui part vers une adresse publique inattendue fait perdre des heures à
  celui qui dépanne, parce qu'il cherche une sortie Internet là où il n'y a qu'un automate.
- **Sécurité.** Une règle de pare-feu écrite pour « le réseau de la machine » ouvre en réalité un morceau
  d'Internet.

## Choisir un plan d'adressage propre pour une machine livrée

La règle tient en quatre points.

1. **Prenez un sous-réseau privé dédié à la machine**, distinct du réseau bureautique du client. Un `/24` dans
   `192.168.x.0` ou dans `172.16.x.0` suffit largement pour un automate, une IHM et quelques variateurs.
2. **Documentez-le sur le dossier de la machine**, au même titre que le schéma électrique. Le plan d'adressage
   d'une machine fait partie de sa documentation, pas de la mémoire de celui qui l'a câblée.
3. **Demandez au client quelles plages il utilise déjà** avant de figer la vôtre. C'est une question à poser au
   moment de la commande, pas à la mise en service.
4. **Ne mettez pas de passerelle par défaut** sur la carte réseau reliée à la machine si le poste en a déjà une
   ailleurs. Deux passerelles par défaut, c'est la panne qui n'arrive qu'une fois sur deux.

:::caution
Si vous découvrez une installation déjà livrée avec un plan d'adressage public, ne la modifiez pas à distance un
vendredi après-midi. Changer l'adressage d'une machine en production coupe la télémaintenance et parfois la
production elle-même. Cela se planifie avec le client, avec une fenêtre et un retour arrière écrit.
:::

## Pour aller plus loin

- [Réseaux machines industrielles : ne jamais mélanger réseau machine, télémaintenance et LAN bureautique](/docs/architecture/segmenter-les-reseaux-machines-industrielles/)
- [Deux adresses IP sur une même carte réseau : comprendre l'APIPA 169.254.x.x](/docs/reseau/deux-adresses-ip-sur-une-carte-apipa-169-254/)
- [Exigences IT pour l'achat d'une machine industrielle](/docs/architecture/exigences-it-pour-lachat-dune-machine-industrielle/)
- La RFC 1918 tient en quelques pages et se lit en dix minutes. C'est le meilleur rapport temps investi sur temps gagné de tout le réseau.

<!-- source : mail « Rappel concernant l'utilisation des adresses IP publiques », 2026-07-21 -->

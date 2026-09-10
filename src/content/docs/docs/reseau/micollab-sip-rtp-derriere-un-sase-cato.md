---
title: "Faire fonctionner Mitel MiCollab / MBG (SIP et RTP) derrière un SASE Cato Networks"
description: "Appels qui aboutissent mais audio dans un seul sens : IP publique dédiée, bypass TLS, publication complète des plages RTP en Remote Port Forwarding, capture sur le MBG. Trois semaines de debug en une checklist."
published: 2026-07-18
category: reseau
tags: [mitel, micollab, sip, rtp, cato, nat]
level: expert
status: à jour
featured: false
tested_on: ["Mitel MiVoice 5000", "MiCollab 9.8.1", "MiVoice Border Gateway 11.6.0", "Cato Networks", "Stormshield SN720", "iOS 18 et Android (MiCollab Mobile)"]
sidebar:
  label: "Faire fonctionner Mitel MiCollab / MBG (SIP et…"
---

Le 16 juin, nous avons basculé la sortie Internet de ma boîte d'un accès direct vers un lien MPLS raccordé à un SASE
Cato Networks. Les appels passaient toujours. Ils sonnaient, on décrochait, et puis rien : la voix ne revenait pas.
Trois semaines, des dizaines de captures, l'IPS désactivé des deux côtés, une règle Any/Any/Any posée par dépit, un
compte-rendu d'échec formel, et au bout du compte deux lignes de publication de ports qui manquaient. Cette fiche
est la checklist que j'aurais aimé avoir le premier jour.

Pourquoi c'est plus dur derrière un SASE que derrière un pare-feu classique ? Parce qu'avant, la passerelle
téléphonique était nattée par un boîtier stateful que je contrôlais : un flux sortait, l'état existait, le retour
rentrait. Derrière un SASE, le « côté public » de votre passerelle est un PoP dans un datacenter, partagé avec des
centaines d'autres clients, et rien de ce qui doit entrer n'est implicite. Tout se déclare.

Le décor : un PBX Mitel MiVoice 5000 et un serveur MiCollab en LAN, une passerelle MiVoice Border Gateway (MBG) en
DMZ qui fait proxy SIP et RTP pour les clients externes et pour le trunk SIP de l'opérateur, un cluster Stormshield
entre les deux, et la sortie Internet par Cato.

## Comprendre le trajet d'un appel

Un appel, ce sont deux conversations. La signalisation SIP établit l'appel : ports fixes, facile à publier. Le média
RTP transporte la voix : UDP, un couple de ports négocié à chaque appel dans une plage large, dans les deux sens.
« Ça sonne mais on n'entend rien », c'est presque toujours la signalisation qui passe et le RTP qui n'a pas de chemin
retour. Ce n'est pas un problème de codec, ni de licence, ni de version.

| Flux | Sens | Ce qui doit exister |
|---|---|---|
| SIP vers le trunk et les clients externes | Sortant | Règle de sortie, IP de sortie stable |
| SIP depuis le trunk et les clients | Entrant | Publication du port SIP vers le MBG |
| RTP émis par le MBG | Sortant | Règle de sortie, pas d'inspection qui le retarde |
| RTP reçu par le MBG | Entrant | **Publication de toute la plage RTP** vers le MBG |

## Prérequis

- Les consoles d'administration du MBG et de MiCollab, et un accès shell au MBG pour capturer.
- L'accès à la console Cato, ou un MSSP réactif ; idéalement un contact technique direct.
- Les plages RTP réellement configurées sur votre MBG. Chez nous : `20000-31000` et `32000-33500` en UDP.
- Un téléphone externe (mobile en 4G avec MiCollab Mobile) pour tester dans les deux sens.
- Le spécialiste Mitel de votre intégrateur en copie : c'est lui qui relit vos captures.

## Attribuer une IP publique dédiée au MBG

Par défaut, votre trafic sort du PoP Cato avec une adresse générique partagée. Pour la téléphonie, c'est
inacceptable : l'opérateur du trunk attend une adresse fixe, et une publication de ports entrante a besoin d'une
adresse à elle. Dans Cato, allouez une IP publique dédiée (« IP Allocation ») et affectez-la à la sortie du MBG.
Communiquez-la à l'opérateur du trunk. C'est l'équivalent de l'adresse fixe de votre ancien routeur, sauf qu'elle vit
à Paris.

## Créer les règles Cato et le bypass d'inspection TLS

1. Dans l'Internet Firewall de Cato, créez les règles vers et depuis le MBG, limitées à ses ports.
2. Ajoutez un bypass d'inspection TLS pour le MBG : une passerelle de téléphonie n'a rien à faire dans un
   déchiffrement à la volée.
3. Le temps du diagnostic, désactivez l'IPS sur ce flux. Nous l'avons fait côté Stormshield, puis côté Cato, et la
   voix ne revenait toujours pas : la preuve que l'IPS n'était pas le coupable. Réactivez ensuite un seul des deux,
   jamais les deux sur le même flux.

## Publier la signalisation et toutes les plages RTP

C'est ici que trois semaines se sont perdues. Le Remote Port Forwarding de Cato publiait le SIP et une partie du RTP.
Une partie. Les appels dont les ports négociés tombaient hors de la plage publiée restaient muets. La configuration
correcte publie, vers l'adresse DMZ du MBG, la signalisation et l'intégralité des plages RTP du MBG :

```text title="Remote Port Forwarding vers le MBG (exemple)"
203.0.113.10  UDP/TCP 5060      -> 10.0.50.10   (SIP ; 5061 si vous utilisez SIP TLS)
203.0.113.10  UDP 20000-31000   -> 10.0.50.10   (RTP, plage 1)
203.0.113.10  UDP 32000-33500   -> 10.0.50.10   (RTP, plage 2)
```

Relisez les plages dans la configuration du MBG avant de les saisir : si vous en oubliez une, vous aurez des appels
qui marchent et d'autres non, ce qui est la pire situation à diagnostiquer.

:::danger[Le message qui a clos l'incident]
« La cause était une publication incomplète des ports RTP dans le Remote Port Forwarding Cato. Après l'ajout des
plages 20000-31000 et 32000-33500 vers le MBG, les appels et l'audio bidirectionnel fonctionnent correctement. »
:::

## Vérifier la cohérence côté MBG et MiCollab

Sur le MBG, le champ « Internet visible IP » doit afficher l'IP dédiée Cato. Chez nous, il affichait encore
l'ancienne adresse alors qu'une VM Windows d'un autre VLAN voyait bien l'IP Cato : le SNAT et le routage par
politique n'étaient pas appliqués de la même manière à la DMZ et au LAN sur le cluster. Corrigez le pare-feu avant
de chercher plus loin. Côté MiCollab, vérifiez que les FQDN déclarés (serveur, MBG) résolvent vers les bonnes
adresses depuis l'intérieur et depuis l'extérieur.

## Diagnostiquer par capture sur le MBG

La capture sur le MBG est la seule source de vérité : elle montre ce qui arrive vraiment sur la passerelle.

```bash title="Sur le MBG, pendant un appel de test"
tcpdump -i eth0 -n udp portrange 20000-33500 -w /tmp/rtp-test.pcap
```

Ouvrez le fichier dans Wireshark, menu `Téléphonie > RTP > Flux RTP`. Ce que nous avons vu : de l'audio G.722 qui
arrive depuis le proxy du trunk, et aucun flux dans l'autre sens. Un codec qui arrive, c'est un codec qui marche ; un
sens qui manque, c'est du NAT ou du forwarding incomplet. Notez l'heure exacte de chaque appel de test : votre
opérateur capture de son côté et doit pouvoir corréler.

## Les fausses pistes, pour ne pas les refaire

- La règle Any/Any/Any sur le pare-feu local a réglé les symptômes de l'IPS, pas la voix.
- Deux IPS empilés (Stormshield et Cato) cassent bien le RTP, mais les désactiver n'a pas suffi : le problème était
  en dessous.
- L'IP publique générique du PoP : sans allocation dédiée, aucune publication ne peut être fiable.
- Le jeton de service (Service Token) du site avait expiré entre deux tentatives ; il a fallu en générer un
  nouveau. Vérifiez sa date avant chaque fenêtre.

## Cas particulier : MiCollab Mobile muet en 4G

Près de deux ans plus tôt, sans SASE, un autre silence : MiCollab Mobile fonctionnait en Wi-Fi, mais en 4G seule il n'y
avait pas d'audio, ou l'enregistrement échouait, en particulier au passage Wi-Fi vers 4G. Réinstaller l'application
iOS aidait « brièvement ». La piste retenue après enquête : le réseau mobile fournit une IPv6, et le même téléphone
en 4G derrière un VPN grand public qui lui donne une IPv4 fonctionnait parfaitement.

La méthode qui a permis de remonter le cas à la R&D de l'éditeur :

1. Noter l'heure exacte de chaque test, avec et sans VPN.
2. Envoyer les diagnostics depuis l'application (« Envoyer les diagnostics »).
3. Faire relever les traces IP sur le MBG et sur MiCollab par l'intégrateur.
4. Tester l'astuce du split-DNS (le FQDN du MBG résolu en IP publique depuis l'intérieur) avec prudence : chez nous
   elle a cassé l'enregistrement interne, retour arrière immédiat.

:::caution[Snapshot avant toute mise à jour du MBG]
Dans la même période, une mise à jour du MBG vers une version non supportée par notre MiCollab l'a rendu
inutilisable. Restauré depuis un snapshot VMware du jour même en quinze minutes. Lisez les notes de version, prenez
le snapshot, puis seulement cliquez.
:::

Dernier détail qui revient souvent : des ports RTP « fermés au bout d'un certain temps côté pare-feu ». Pensez aux
délais d'expiration UDP de vos équipements avant d'accuser le PBX.

## Pour aller plus loin

- La bascule complète et le compte-rendu d'échec : [Basculer la passerelle par défaut d'un Stormshield vers un lien MPLS + SASE](/docs/reseau/basculer-la-passerelle-par-defaut-vers-mpls-et-sase/).
- L'agent sur les postes, une fois la voix réglée : [Agent Cato : Office Mode, Always-On et bypass contrôlé](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/).
- Quand une mise à jour casse une VM : [Restaurer une VM cassée par une mise à jour non supportée](/docs/virtualisation/restaurer-une-vm-cassee-par-une-mise-a-jour-non-supportee/).

<!-- source : mails « Micollab debug avancement », 2026-07-16 ; « RE: trace 3 », 2026-07-16 ; « VICTOIRE », 2026-07-17 ; « MBG HS », 2024-09-12 → 2024-10-16 -->

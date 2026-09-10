---
title: "Basculer la passerelle par défaut d'un Stormshield vers un lien MPLS + SASE (et savoir revenir en arrière)"
description: "Inverser les passerelles, revoir NAT et filtrage, éviter la double inspection, tester la voix : une bascule d'Internet direct vers MPLS + Cato, ratée deux fois avant de réussir, et le retour arrière."
published: 2026-07-20
category: reseau
tags: [stormshield, cato, sase, mpls, routage, rollback]
level: avancé
status: à jour
featured: false
tested_on: ["Stormshield SN720 en haute disponibilité", "Orange Business VPN CORPORATE 200M avec secours 4G", "Cato Networks (PoP Paris)"]
---

Pendant un an, ma boîte a eu deux portes vers le monde. L'historique : un accès Business Internet direct, avec le
cluster Stormshield en frontal, ses règles de NAT, son VPN SSL et son IPS. La nouvelle : un lien MPLS livré en juin,
raccordé à un SASE Cato Networks opéré par un MSSP, qui fait sortir tout le trafic par un PoP à Paris et l'inspecte au
passage. L'objectif : tout faire passer par le MPLS, ne plus exposer aucune adresse publique à nous, puis résilier
l'accès direct. « Non exposée par conception », comme on l'écrit dans les dossiers pour la direction.

Sur le papier, la bascule tient en une modification : inverser deux champs dans un objet routeur. Dans la vraie vie,
tout ce qui dépendait de l'ancien chemin se réveille en même temps : le NAT, les règles, l'IPS, le NTP, les DNS
publics, et surtout la téléphonie. Nous avons échoué le 16 juin, encore le 2 juillet, et réussi le 17. Voici la
procédure telle que je la referais, avec le retour arrière écrit avant de commencer.

## Prérequis

- Un cluster Stormshield avec un objet routeur `GW-DEFAULT` qui référence deux passerelles, `GW-MPLS` et `GW-BIE`.
- Le lien MPLS livré, validé et mesuré : ping des serveurs depuis la console Cato, débit conforme à la commande.
- Un compte Cato activé, avec assez de licences pour de vrais utilisateurs. Cinq licences d'évaluation ne suffisent
  pas ; nous avons vérifié.
- L'agent Cato pré-installé sur les postes, non activé.
- La liste de tout ce qui connaît votre IP publique actuelle : enregistrements DNS, partenaires avec liste blanche,
  opérateur du trunk SIP.

## Choisir la fenêtre et prévenir

Nous avons pris un créneau de midi, 12h30-13h30, avec l'heure locale précisée pour le bureau à l'étranger. Le mail
aux utilisateurs listait les services indisponibles (VPN, MiCollab, téléphonie, télémaintenance, portail interne), ce
qui avait été pré-installé « et qu'il ne faut pas toucher », ce qui allait changer (désinstallation du client VPN,
agent transparent, une seule authentification au premier démarrage), et un plan de retour arrière explicite. Les
excuses anticipées ne coûtent rien et évitent la moitié des appels.

## Inverser les passerelles dans l'objet routeur

Dans `Configuration > Objets > Objets réseau`, ouvrez le routeur `GW-DEFAULT`. Il porte deux listes : les passerelles
utilisées et les passerelles de secours. La bascule consiste à les échanger.

| Champ | Avant | Après |
|---|---|---|
| Passerelles utilisées | `GW-BIE` | `GW-MPLS` |
| Passerelles de secours | `GW-MPLS` | `GW-BIE` |

Conservez la route BGP existante vers le MPLS : c'est elle qui apprend les préfixes de l'autre côté, elle n'a pas à
bouger. Le retour arrière, c'est la même manipulation dans l'autre sens. Une minute. Ce qui prend du temps, c'est de
décider qu'il faut la faire.

:::tip
Notez l'état « avant » de l'objet routeur, des règles NAT et des règles de filtrage dans le compte-rendu avant de
toucher quoi que ce soit. À 13h20, avec le standard qui sonne, la mémoire n'est pas fiable.
:::

## Adapter le NAT et les règles de filtrage

Avec Cato, le NAT de sortie est fait par le PoP. Le cluster redevient un routeur qui filtre, plus un boîtier qui
traduit.

1. Désactivez les règles de NAT sortant dans `Politique de sécurité > Filtrage et NAT`. Désactivez, ne supprimez
   pas : le retour arrière en dépend.
2. Dans les règles de filtrage, remplacez l'interface `Out` par l'interface MPLS partout où elle apparaît.
3. Supprimez les règles Internet devenues des doublons de règles déjà portées par Cato.
4. Désactivez le VPN SSL Stormshield : l'agent le remplace, et un VPN SSL qui n'écoute plus, c'est autant de
   tentatives de force brute en moins dans les alertes du SOC.

## Mettre à jour ce qui connaît votre ancienne IP

Votre adresse de sortie change. Mettez à jour les DNS publics qui pointaient vers l'ancien accès, et prévenez ceux
qui filtrent par IP. Question à poser au MSSP avant la fenêtre : quelle IP déclarer ? Cato en propose plusieurs
sortes (adresse du lien, sortie dédiée, allocation d'IP publique), et la réponse n'est pas la même pour un SaaS et
pour un trunk SIP.

:::caution
Le 16 juin, l'IP publique vue par Cato n'était pas celle attendue. Un mois plus tard, on découvrait que la
passerelle téléphonique en DMZ sortait encore avec l'ancienne adresse alors qu'une VM Windows d'un autre VLAN voyait
bien l'IP Cato : le SNAT et le routage par politique n'étaient pas appliqués de la même façon à tous les
sous-réseaux. Testez l'IP de sortie **depuis chaque VLAN**, pas seulement depuis votre poste.
:::

## Ne pas empiler deux inspections

Le cluster Stormshield a un IPS. Cato aussi. Sur un même flux, les deux ensemble cassent le trafic, et la voix en
premier. Sur les règles dont le trafic traverse Cato, abaissez le niveau d'inspection Stormshield (colonne
« Inspection » de la règle, de IPS à Firewall) et laissez le PoP faire son travail. Vérifiez aussi le NTP dans
`Configuration > Système > Configuration > Date et heure` : nous avons vu des erreurs de synchronisation juste après
la bascule, les serveurs de temps n'étant plus joignables par le nouveau chemin.

## Tester avant de déclarer victoire

| Test | Méthode | Attendu |
|---|---|---|
| Serveurs joignables depuis Cato | ping depuis la console Cato ou un agent | Réponse |
| Chemin de sortie | `tracert -d example.com` depuis un poste | Aucun saut public avant le PoP |
| IP de sortie, par VLAN | `curl -s https://ifconfig.me` | L'IP Cato attendue |
| Téléphonie | Appel MiCollab entrant puis sortant | Audio dans les deux sens |
| Heure | `w32tm /query /status` sur un contrôleur de domaine | Décalage nul |
| Agent | Authentification et Office Mode sur le LAN | Immédiats |

Un seul échec dans ce tableau et vous n'avez pas basculé, vous avez cassé. Le retour arrière n'est pas un aveu, c'est
la procédure.

## Revenir en arrière et formaliser l'échec

Le retour arrière : échanger à nouveau les passerelles, réactiver les règles de NAT et le VPN SSL, remettre les DNS.
Puis, le jour même, écrire le compte-rendu d'échec et l'envoyer à tous les intervenants. Le nôtre a aligné quatre
équipes qui ne se parlaient pas : le LAN, la téléphonie, le trunk SIP et le SASE.

```text title="Trame du compte-rendu d'échec de déploiement"
1. Contexte et fenêtre
2. Tests réalisés (heure, résultat)
3. Symptômes observés
4. Causes probables
5. Actions décidées, par rôle : LAN/pare-feu, MiCollab, trunk SIP, Cato, MPLS
6. Prochaine fenêtre et critères de succès
```

## Ce qui a réellement bloqué chez nous

- **16 juin.** Appels MiCollab sans voix retour, IP publique inattendue, double IPS, erreurs NTP, cinq licences
  d'évaluation. Retour arrière.
- **23 juin.** Une règle Any/Any/Any sur le cluster règle les symptômes de l'IPS, pas la voix. Les licences
  arrivent.
- **2 et 7 juillet.** Nouvel échec, IPS désactivé côté Cato aussi. Ce n'était donc pas l'IPS.
- **16 juillet.** La passerelle téléphonique doit avoir une IP publique dédiée dans Cato, pas l'IP générique du PoP.
  Le jeton de service (Service Token) utilisé pour la configuration du site avait expiré entre deux tentatives.
- **17 juillet.** Cause racine : les plages de ports RTP n'étaient publiées qu'en partie dans le Remote Port
  Forwarding de Cato. Ajout des plages manquantes, audio bidirectionnel, fin de l'histoire.
- **21 juillet, bonus.** L'agent ne s'authentifiait pas depuis le LAN : il manquait une route BGP vers la plage
  interne des services Cato entre le MPLS et le PoP.

La leçon : l'inversion des passerelles n'a jamais été le problème. Tout ce que l'ancien chemin faisait sans qu'on y
pense, il a fallu le refaire explicitement.

## Pour aller plus loin

- [Faire fonctionner MiCollab / MBG derrière un SASE Cato](/docs/reseau/micollab-sip-rtp-derriere-un-sase-cato/), la partie qui a coûté trois semaines.
- [Agent Cato : Office Mode, Always-On et bypass contrôlé](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/), pour la suite sur les postes.
- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/), pour le mail de la veille.

<!-- source : mails « Changement réglage parefeu co principal MPLS », 2026-06-11 ; « Migration réseau prévue le 16/06/2026 », 2026-06-15 ; « Compte-rendu d'échec de déploiement – Bascule de la passerelle par défaut vers Cato », 2026-06-16 et réponses des 2026-06-23, 2026-07-02, 2026-07-07 -->

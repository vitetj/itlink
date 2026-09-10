---
title: "UniFi Dream Machine : WAN de secours 4G et bascule vers la fibre pilotée à distance"
description: "Démarrer un site distant sur une box 4G, puis basculer sur la fibre depuis la France sans coupure grâce au second WAN de l'UDM. Plus le piège du WAN « non sûr » qui bloque la VoIP, et comment mesurer une latence."
published: 2024-12-12
category: reseau
tags: [unifi, udm, wan, failover, 4g, fibre]
level: intermédiaire
status: à jour
featured: false
tested_on: [UniFi Dream Machine]
---

Fin 2024, ma boîte ouvre une filiale aux États-Unis. Le bâtiment est prêt, le rack est câblé, l'équipe est sur
place. La fibre, elle, arrive quand elle arrive : commandée via Orange Business, elle passe par une chaîne
d'opérateurs (Orange, AT&T, GTT, Spectrum) où chacun attend le précédent. Pour ne pas laisser le site sans Internet,
il démarre sur une box 4G AT&T. Et comme il y a un océan et sept heures de décalage entre le site et moi, tout ce
qui suit s'est fait à distance.

Dès la cotation, j'avais posé le principe par écrit à la direction : la notion de secours se fera au niveau du
pare-feu, une sorte de SD-WAN avec surveillance de lien. L'UniFi Dream Machine fait ça nativement : deux WAN, un
principal et un de secours, bascule automatique quand le principal tombe. L'astuce consiste à s'en servir dans
l'autre sens. Le WAN de secours devient la porte par laquelle le nouveau lien entre, sans toucher à celui qui
fonctionne.

## Prérequis

- Une UDM adoptée et pilotable à distance depuis le Site Manager UniFi. C'est ce qui rend toute la suite possible
  depuis un autre continent.
- Une box 4G en mode **IP passthrough**. La box AT&T ne sait pas faire de bridge, seulement du passthrough : elle
  garde son adresse mais transmet l'IP publique à l'équipement branché derrière. Pour l'UDM, c'est suffisant : elle
  reçoit l'IP publique sur son WAN et on évite le double NAT.
- Un port libre sur l'UDM pour devenir le second WAN. Ici, le port 8.
- Quelqu'un sur place qui sait brancher un câble et rejoindre une visio. Rien de plus.

J'ai répété la configuration sur mon homelab, monté avec le même matériel Ubiquiti que celui commandé pour le site,
en le disant clairement à la direction. Tester chez soi ce qu'on va déployer à distance, c'est ce qui évite de
découvrir un menu inconnu pendant que dix personnes attendent.

## Déclarer la box 4G en WAN principal

Dans **Paramètres, Internet**, le WAN principal est en DHCP : la box en passthrough lui remet l'adresse publique.
Vérifiez que l'IP affichée sur le WAN de l'UDM est bien l'IP publique de la box et pas une adresse privée en
`192.168.x.x`. Si c'est une adresse privée, le passthrough n'est pas actif et vous avez un double NAT devant vous.

:::caution
Une fois le site sur la box 4G, les appels VoIP ne passaient plus. Explication : l'UDM classait le réseau de la box
4G comme **non sûr** et bloquait silencieusement le trafic. Pas de panne visible, juste des appels qui ne
s'établissent pas. Une correction des règles de pare-feu appliquées à ce WAN a suffi et les appels sont redevenus
cristallins. Si un service tombe après un changement de WAN, regardez le pare-feu de l'UDM avant de regarder le
service.
:::

## Configurer le port 8 en WAN de secours

Sur l'UDM, un port RJ45 peut être promu en WAN. Dans **Paramètres, Ports** (ou depuis la vue de l'appareil), passez
le port 8 en rôle **WAN**, puis dans **Paramètres, Internet**, il apparaît comme second WAN. Choisissez le mode
**Failover only** : le second lien ne sert que si le premier tombe. Pas d'équilibrage de charge, qui ferait sortir
la VoIP tantôt par une adresse, tantôt par l'autre.

| Port UDM | Rôle | Lien | Mode |
| --- | --- | --- | --- |
| WAN | WAN principal | Box 4G en passthrough | Actif |
| 8 | WAN secondaire | Fibre (à venir) | Failover only |

À ce stade, le port 8 est configuré mais rien n'est branché dessus. L'UDM le signale comme WAN2 déconnecté, et ce
n'est pas une erreur : c'est une porte prête, qui attend.

## Faire brancher la fibre sur place

Le mail à l'équipe locale s'intitulait « Internet is Coming », référence assumée. Le contenu tenait en trois lignes :
Spectrum pose le modem et la fibre le 3, GTT active le service le 10, et quand c'est fait, vous branchez le câble de
la nouvelle box **sur le port 8** de l'UDM. Rien d'autre.

C'est là que le WAN de secours prend tout son sens. Brancher la fibre sur le port 8 ne présente aucun risque : tant
que la 4G fonctionne, le failover ne s'active pas, le site ne voit rien. On installe la nouvelle porte à côté de
l'ancienne avant de décider de l'ouvrir.

## Vérifier, puis inverser les rôles depuis la France

Une fois le câble branché, le Site Manager montre WAN2 connecté avec une adresse publique fournie par le nouvel
opérateur. Ça se vérifie sans déranger personne :

- l'état du WAN2 et son IP publique dans la vue Internet ;
- un test de débit lancé depuis l'UDM sur ce WAN ;
- la latence vers une cible connue.

Ensuite, une **visio de confirmation** avec l'équipe sur place. Pas pour la technique, pour le moment : personne en
plein appel client, personne en train d'envoyer un gros fichier. Puis, dans **Paramètres, Internet**, on inverse :
la fibre devient WAN principal, la 4G passe en secours. La bascule est décidée à distance, sans coupure perceptible
pour l'équipe.

:::tip
Gardez la box 4G en failover quelques semaines. Elle sert de filet pendant que le nouvel opérateur stabilise sa
ligne, et elle vous donne un point de comparaison si la fibre se comporte bizarrement. C'est exactement ce qui a
servi ensuite.
:::

## Quand la fibre est là mais que ça rame : mesurer avant d'accuser

Quelques jours après la bascule, deux symptômes : l'upload plafonne à 30-40 Mbps, bien en dessous de ce qu'on attend
d'une fibre, et la latence depuis le LAN tourne autour de 60 ms là où on attend beaucoup moins. Première réaction de
tout le monde : « c'est l'UDM ». Peut-être. Avant de le dire, on mesure.

La méthode consiste à ne changer qu'une variable à la fois :

1. **Un PC directement sur le modem fibre**, sans l'UDM : c'est la mesure de référence de la ligne.
2. **Le même PC sur le LAN**, à travers l'UDM et la fibre.
3. **Le même PC sur le LAN, à travers l'UDM et la box 4G** : on change le WAN, pas le pare-feu.
4. Un réglage à la fois côté UDM, par exemple le **clonage d'adresse MAC** sur le WAN, que certains opérateurs
   exigent.

```cmd title="Mesures depuis un poste Windows, à répéter à chaque étape (remplacez la cible par un hôte stable)"
ping -n 20 203.0.113.1
tracert -d 203.0.113.1
```

| Point de mesure | Latence | Observation |
| --- | --- | --- |
| PC direct sur le modem fibre | 13 à 15 ms | La ligne est bonne en direct |
| LAN via UDM, WAN fibre | ~60 ms | Upload plafonné à 30-40 Mbps |
| LAN via UDM, WAN box 4G | Normale | L'UDM seule n'est pas en cause |
| Clonage MAC sur le WAN fibre | ~60 ms | Sans effet |

Les mesures se contredisent en apparence : la ligne est bonne en direct, mauvaise à travers l'UDM, mais l'UDM se
comporte bien avec l'autre WAN. C'est précisément ce tableau qu'il faut envoyer à l'opérateur, plutôt qu'un
« ça rame ». Avec ces éléments, le dossier est remonté à l'opérateur, avec deux pistes de son côté : un plafond
d'upload et une interférence sur la ligne. Sans le tableau, la réponse aurait été « redémarrez votre routeur ».

:::note
Le WAN de secours a ici une deuxième utilité que je n'avais pas anticipée : un lien de comparaison. Pouvoir dire
« le même pare-feu, les mêmes règles, un autre lien, aucun problème » vaut tous les arguments dans une discussion
avec un opérateur.
:::

## Pour aller plus loin

- Le raisonnement lien principal / lien de secours, à l'échelle d'un réseau multi-sites :
  [Du MPLS au SASE, ce que personne ne vous dit](/blog/du-mpls-au-sase-ce-que-personne-ne-vous-dit/).
- Comment présenter ce genre de choix à une direction, options et recommandation comprises :
  [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/).
- Le homelab qui a servi de répétition : [Homelab, vue d'ensemble](/lab/homelab-vue-densemble/).
- La documentation UniFi sur le multi-WAN décrit les modes failover et load balancing et l'affectation des ports.

<!-- source : mails « call ia fix ok » (2024-11-22), « RE: Internet is Coming ! » (2024-12-02) et fil de diagnostic latence du site distant (2024-12-09) -->

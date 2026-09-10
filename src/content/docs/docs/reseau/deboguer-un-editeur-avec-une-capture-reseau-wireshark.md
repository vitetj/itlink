---
title: "Prouver à un éditeur que le problème vient de chez lui : la capture réseau comme argument"
description: "Un support qui ne bouge pas ne cède pas à l'insistance, il cède à la preuve. Où capturer, quels filtres Wireshark utiliser, quoi montrer, et comment présenter deux captures qui isolent une régression."
published: 2025-11-12
category: reseau
tags: [wireshark, capture-reseau, diagnostic, support-editeur, regression]
level: avancé
status: à jour
featured: true
tested_on: [Wireshark, Android 14, iOS 26.0.1]
---

Un matin d'octobre, tout un plateau de bureaux est resté allumé. Pas une panne électrique : une mise à jour.
L'application mobile qui pilote l'éclairage DALI du bâtiment était passée d'une version 2.3 à une version 3.0
la veille au soir, et depuis, elle ne détectait plus aucun contrôleur. Sans ordre, les luminaires restent
allumés en permanence. La version précédente, elle, fonctionnait parfaitement.

Le support de l'éditeur a répondu ce que répondent tous les supports : réinstallez, redémarrez, vérifiez votre
réseau, mettez à jour le firmware. Six semaines plus tard, le dossier a enfin bougé. Pas parce que j'ai insisté,
mais parce que je leur ai envoyé deux fichiers de capture réseau : un pris avec la version qui marche, un avec
la version qui ne marche pas. Détail savoureux : la première réaction du support a été de me demander pourquoi
je lui envoyais des photos. Il a fallu préciser qu'on ouvre ça avec Wireshark.

Cette fiche décrit la méthode, pas l'outil. Wireshark s'apprend en une soirée ; construire un dossier qu'un
éditeur ne peut pas renvoyer, c'est autre chose.

## Ce qu'une capture prouve, et ce qu'elle ne prouve pas

Une capture réseau prouve **ce qui est parti et ce qui est revenu**. C'est tout, et c'est déjà énorme dans une
discussion avec un éditeur, parce que ça déplace le débat du terrain de l'opinion (« ça doit être votre réseau »)
vers celui du fait vérifiable (« votre application n'a émis aucune requête de découverte, la voici absente de la
trame »).

Elle ne prouve pas ce qui se passe **dans** l'application : un plantage interne, une exception avalée, une
option de configuration mal lue ne laissent aucune trace réseau. Si votre capture est vide côté client, ce
n'est pas un échec de la méthode, c'est déjà un résultat : le logiciel n'a même pas essayé.

La force du dossier ne vient donc jamais d'une capture seule. Elle vient de **deux captures comparables** : même
poste, même réseau, même manipulation, seule la version du logiciel change. C'est cette paire qui transforme une
plainte en régression documentée.

## Prérequis

- Wireshark installé sur un poste d'administration, avec les droits de capture.
- Un moyen de placer ce poste sur le même segment que le client et l'équipement (port miroir sur le switch,
  hub, ou partage de connexion — voir plus bas).
- Les deux versions du logiciel disponibles : celle qui marche et celle qui ne marche pas. Sans la version
  qui marche, vous n'avez pas de témoin.
- Un scénario de test court, écrit, reproductible : « ouvrir l'application, aller dans tel écran, lancer la
  recherche d'équipements, attendre 30 secondes ». Toujours le même, pour les deux versions.

## Éliminer tout le reste avant de sortir Wireshark

Une capture envoyée trop tôt se fait renvoyer. Avant de capturer, fermez les portes une par une :

1. **Isoler la régression.** L'ancienne version fonctionne, la nouvelle non, sur le même terminal et le même
   réseau. Conclusion : le problème n'est ni l'installation, ni l'environnement.
2. **Éliminer le matériel.** Refaites le test sur plusieurs terminaux, de générations et de systèmes
   différents. Dans le cas de l'éclairage, la manipulation a été rejouée sur une tablette Android 14 et sur un
   téléphone sous iOS 26 : même comportement, donc le terminal est hors de cause.
3. **Éliminer le réseau.** Vérifiez que le client et les équipements sont bien sur le même sous-réseau, sans
   routeur ni pare-feu entre les deux. Beaucoup de protocoles de découverte reposent sur du broadcast ou du
   multicast, qui ne franchissent pas un routeur. Si vous voulez couper court, refaites le test sur une
   connexion totalement indépendante de votre infrastructure : un partage de connexion 4G rend le diagnostic
   agnostique à votre réseau, et l'argument est imparable.
4. **Documenter le matériel testé, précisément.** Modèle exact, version d'OS, version de noyau. Un support qui
   reçoit « Samsung Galaxy Tab A9 (SM-X110), Android 14, noyau `5.10.205-android12-9-28698995` » comprend
   immédiatement qu'il n'a pas affaire à un utilisateur qui a « un problème avec l'appli ».

## Choisir le point de capture

Le point de capture décide de ce que vous verrez. C'est la décision la plus importante de la procédure.

| Où capturer | Ce qu'on voit | Quand l'utiliser |
| --- | --- | --- |
| Sur le poste client (Windows, Linux, macOS) | Tout ce que le logiciel émet et reçoit | Cas le plus simple, client sur PC |
| Sur un port miroir du switch | Le trafic réel entre client et équipement, sans influer sur le client | Client mobile, ou doute sur une couche intermédiaire |
| Sur un poste servant de point d'accès Wi-Fi | Tout le trafic du mobile, sans rien installer dessus | Client mobile, pas d'accès au switch |
| Sur l'équipement lui-même | Ce qui lui arrive vraiment | Rare : équipements industriels rarement ouverts |

Quand le client est un smartphone ou une tablette, la capture directe sur le terminal demande en général un
accès privilégié que vous n'avez pas et que vous ne voulez pas donner. Les deux options réalistes sont donc le
**port miroir** (SPAN) sur le switch qui porte le point d'accès, ou un **poste intermédiaire partageant sa
connexion** : le mobile s'y associe, et vous capturez sur l'interface de partage. Dans les deux cas, capturez
au plus près du client, pas au plus près de l'équipement : vous voulez savoir si la requête est partie, pas
seulement si elle est arrivée.

:::caution
Une capture contient tout : en-têtes d'authentification, cookies, requêtes en clair, noms de machines, plan
d'adressage. Avant d'envoyer un fichier à un tiers, ouvrez-le et regardez ce qu'il y a dedans. Réduisez le
périmètre, coupez la durée, et si nécessaire refaites la capture sur un réseau de test dédié plutôt que
d'anonymiser après coup.
:::

## Filtre de capture, filtre d'affichage : ne pas confondre

Ce sont deux mécanismes différents, et confondre les deux est l'erreur classique.

Le **filtre de capture** (syntaxe BPF) décide de ce qui est écrit sur le disque. Il est irréversible : ce qui
n'est pas capturé est perdu. On l'utilise pour tenir la taille du fichier, jamais pour cibler finement.

```text title="Filtres de capture (BPF) — à poser avant de lancer"
host 192.0.2.50
host 192.0.2.50 or host 192.0.2.51
not port 22
```

Le **filtre d'affichage** décide de ce que vous voyez, sans rien perdre. C'est là qu'on travaille. On capture
large, on filtre après.

```text title="Filtres d'affichage Wireshark"
ip.addr == 192.0.2.50
udp.port == 1900 || udp.port == 5353          # découverte SSDP / mDNS
eth.dst == ff:ff:ff:ff:ff:ff                  # broadcast pur
!(arp || mdns || ssdp || icmpv6)              # nettoyer le bruit d'un LAN
tcp.flags.reset == 1                          # connexions refusées
tcp.analysis.retransmission                   # pertes, équipement injoignable
frame contains "identifiant-de-votre-appareil"
```

Pour un cas « l'application ne détecte plus les équipements », l'enchaînement est presque toujours le même :
regarder d'abord le broadcast et le multicast, puis les réponses, puis l'établissement de session. Les trois
questions dans l'ordre : **la découverte part-elle ? l'équipement répond-il ? le client exploite-t-il la
réponse ?** Chacune a une réponse binaire dans la capture, et chacune désigne un coupable différent.

## Ce qu'il faut montrer, concrètement

L'éditeur ne lira pas votre capture ligne à ligne, du moins pas au premier niveau de support. Il faut donc que
la démonstration tienne dans le message, et que la capture serve de pièce justificative.

Réduisez votre propos à trois éléments :

1. **Le témoin.** « En version 2.3, le client émet N requêtes de découverte en 10 secondes et reçoit N réponses.
   Trames 12 à 48 du fichier `ok-2.3.pcapng`. »
2. **Le défaut.** « En version 3.0, dans le même scénario, le client n'émet aucune requête de découverte, ou en
   émet et ignore les réponses. Fichier `ko-3.0.pcapng`, aucun paquet ne correspond au filtre. »
3. **Le delta.** Une phrase qui nomme la différence, sans l'expliquer à leur place. Vous n'êtes pas leur
   développeur : vous documentez, ils diagnostiquent.

Nommez les fichiers pour qu'ils parlent tout seuls : `ok-2.3.pcapng` et `ko-3.0.pcapng`. Un support qui reçoit
`capture1.pcapng` et `capture2.pcapng` ouvrira le mauvais.

Deux outils livrés avec Wireshark rendent le colis présentable :

```bash title="Réduire et résumer une capture avant envoi"
# Ne garder que les 60 premières secondes utiles
editcap -A "2025-11-06 09:12:00" -B "2025-11-06 09:13:00" brut.pcapng ok-2.3.pcapng

# Produire un résumé lisible à coller dans le mail
tshark -r ko-3.0.pcapng -q -z io,phs
tshark -r ko-3.0.pcapng -Y "udp.port == 5353" -T fields -e frame.number -e ip.src -e ip.dst
```

## Présenter le dossier au support

Le fond compte, la forme fait la différence. Quelques règles qui ont fonctionné :

- **Dire ce que c'est.** « Ci-joint deux captures réseau, à ouvrir avec Wireshark (gratuit, wireshark.org). »
  Ça paraît condescendant ; ça ne l'est pas. Un technicien de premier niveau n'a pas forcément croisé le format.
- **Passer à l'anglais** dès que l'échange remonte au niveau éditeur ou développeur. Une traduction approximative
  transforme un rapport de bug en malentendu. Annoncez-le simplement : « Let's switch to English to avoid wrong
  translation. »
- **Dater vos relances.** « Je n'ai pas eu de retour à mon message du 14/10. Sans les traces de mon réseau, le
  développement ne pourra pas reproduire le problème. » Une date dans une relance vaut trois points
  d'exclamation.
- **Rester factuel même quand le ton durcit.** On a le droit d'écrire qu'on se demande si la mise à jour a été
  testée avant publication. On n'a rien à gagner à viser une personne : c'est le processus de l'éditeur qui est
  en cause, jamais l'interlocuteur au bout du fil.
- **Ne jamais lâcher le témoin.** Gardez une machine avec l'ancienne version installée jusqu'à la résolution.
  Le jour où l'éditeur demande « pouvez-vous reproduire ? », vous pouvez.

## Quand la preuve ne suffit pas

Il faut accepter que la preuve technique soit une monnaie d'échange, pas une garantie. Un éditeur peut très
bien reconnaître le bug et ne rien livrer avant six mois. À partir de là, le travail change de nature : il ne
s'agit plus de convaincre, mais de chiffrer un contournement.

Dans le cas de l'éclairage, la question posée au métier a fini par tenir en une phrase : un interrupteur de
contournement câblé sur le circuit, ce ne serait pas plus simple ? Un plan B matériel coûte souvent moins cher
qu'un mois d'attente, et il a un mérite énorme : il rend l'entreprise indépendante de la roadmap d'un
fournisseur. Instruisez les deux pistes en parallèle dès que le dossier dépasse deux semaines.

## Pour aller plus loin

- [Diagnostiquer une résolution DNS interne cassée par un client VPN ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/),
  un autre cas où la capture tranche entre « le réseau » et « le logiciel ».
- [Segmenter les réseaux machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/),
  parce qu'un protocole de découverte qui ne traverse pas un routeur est la première hypothèse à éliminer.
- [Auditer un fournisseur SaaS et exiger un plan de remédiation](/docs/dsi/auditer-un-fournisseur-saas-et-exiger-un-plan-de-remediation/),
  pour la suite de l'histoire quand l'éditeur ne bouge toujours pas.
- La documentation officielle de Wireshark détaille la syntaxe complète des filtres d'affichage et des filtres
  de capture.

<!-- source : mails « Débogage éditeur par capture réseau (Wireshark) », dossier application de pilotage d'éclairage, 2025-10-01 → 2025-11-12 -->
